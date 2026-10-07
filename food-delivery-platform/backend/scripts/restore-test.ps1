param(
  [string]$BackupPath = ".\backups\food_delivery_db.sql",
  [string]$TestDatabase = "food_delivery_restore_test",
  [switch]$KeepDatabase
)

$envFile = Join-Path (Get-Location) ".env"
if (Test-Path $envFile) {
  Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $key, $value = $line.Split("=", 2)
    $key = $key.Trim()
    $value = $value.Trim().Trim('"').Trim("'")
    if ($key -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

if (-not (Test-Path $BackupPath)) {
  throw "Backup file was not found at $BackupPath"
}

$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysql)) {
  throw "mysql.exe was not found at $mysql"
}

$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { "root" }
$dbPassword = $env:DB_PASSWORD

if ($TestDatabase -notmatch '^[A-Za-z0-9_]+$' -or -not $TestDatabase.StartsWith("food_delivery_restore_test")) {
  throw "TestDatabase must start with food_delivery_restore_test and contain only letters, numbers or underscore"
}

$env:MYSQL_PWD = $dbPassword
& $mysql --host=$dbHost --port=$dbPort --user=$dbUser --execute="DROP DATABASE IF EXISTS ``$TestDatabase``; CREATE DATABASE ``$TestDatabase`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { throw "Could not create restore-test database" }

Get-Content -LiteralPath $BackupPath -Raw | & $mysql --host=$dbHost --port=$dbPort --user=$dbUser $TestDatabase
if ($LASTEXITCODE -ne 0) { throw "Restore import failed" }

$checkSql = @"
SELECT CONCAT('active_users=', COUNT(*)) FROM users WHERE deleted_at IS NULL AND status = 'ACTIVE'
UNION ALL SELECT CONCAT('active_restaurants=', COUNT(*)) FROM restaurants WHERE deleted_at IS NULL AND status = 'ACTIVE'
UNION ALL SELECT CONCAT('active_menu_items=', COUNT(*)) FROM menu_items WHERE deleted_at IS NULL
UNION ALL SELECT CONCAT('raw_users=', COUNT(*)) FROM users
UNION ALL SELECT CONCAT('raw_restaurants=', COUNT(*)) FROM restaurants
UNION ALL SELECT CONCAT('raw_menu_items=', COUNT(*)) FROM menu_items;
"@
& $mysql --host=$dbHost --port=$dbPort --user=$dbUser --batch --skip-column-names --database=$TestDatabase --execute=$checkSql
if ($LASTEXITCODE -ne 0) { throw "Restore verification query failed" }

if (-not $KeepDatabase) {
  & $mysql --host=$dbHost --port=$dbPort --user=$dbUser --execute="DROP DATABASE IF EXISTS ``$TestDatabase``;"
  if ($LASTEXITCODE -ne 0) { throw "Could not drop restore-test database" }
}

Write-Output "Restore test passed for $BackupPath using database $TestDatabase"
