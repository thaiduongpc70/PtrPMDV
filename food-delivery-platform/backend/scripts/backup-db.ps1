param(
  [string]$OutputPath = ".\backups\food_delivery_db.sql"
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

$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { "root" }
$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "food_delivery_db" }

$parent = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $parent | Out-Null
$mysqlDump = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
if (-not (Test-Path $mysqlDump)) {
  throw "mysqldump.exe was not found at $mysqlDump"
}
$env:MYSQL_PWD = $env:DB_PASSWORD
& $mysqlDump --host=$dbHost --port=$dbPort --user=$dbUser --single-transaction --routines --triggers $dbName | Set-Content -Encoding utf8 $OutputPath
if ($LASTEXITCODE -ne 0) {
  throw "mysqldump failed with exit code $LASTEXITCODE"
}
Write-Output "Database backup written to $OutputPath"
