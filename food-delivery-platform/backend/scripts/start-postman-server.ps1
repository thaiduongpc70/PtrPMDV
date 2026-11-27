# Bat may chu dung rieng cho Postman: cong 3002, DB ban sao food_delivery_test (khong dung DB that).
# Chay: powershell -ExecutionPolicy Bypass -File .\scripts\start-postman-server.ps1   (tu thu muc backend)
Set-Location (Join-Path $PSScriptRoot '..')
$env:DB_NAME = 'food_delivery_test'
$env:PORT = '3002'
$env:AUTH_EXPOSE_TOKENS = 'true'
$env:RATE_LIMIT_MAX = '10000'
$env:RATE_LIMIT_ADMIN_MAX = '100000'
$env:CORS_ORIGINS = 'http://localhost:3002'
node src/server.js
