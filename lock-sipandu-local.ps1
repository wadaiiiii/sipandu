Write-Host "=============================================="
Write-Host " SIPANDU LOCAL ENVIRONMENT LOCK"
Write-Host "=============================================="


# ==========================================
# 1. .ENV LOCAL
# ==========================================

Write-Host "[1] Fix .env local"


$envFile=".env"


if(Test-Path $envFile){

$content=Get-Content $envFile -Raw


$content=$content -replace "APP_URL=.*","APP_URL=http://127.0.0.1:8000"

$content=$content -replace "APP_ENV=.*","APP_ENV=local"

$content=$content -replace "APP_DEBUG=.*","APP_DEBUG=true"


Set-Content $envFile $content -Encoding UTF8

}


# ==========================================
# 2. CONFIG SIPANDU BASE PATH
# ==========================================


Write-Host "[2] Lock base path"


$config="config/sipandu.php"


if(Test-Path $config){

$content=Get-Content $config -Raw


$content=$content -replace `
"'base_path'\s*=>\s*'.*?'", 
"'base_path' => ''"


Set-Content $config $content -Encoding UTF8

}



# ==========================================
# 3. CLEAR CACHE
# ==========================================


Write-Host "[3] Clear Laravel cache"


php artisan optimize:clear



# ==========================================
# 4. BUILD FRONTEND
# ==========================================


Write-Host "[4] Build Vite"

npm run build



# ==========================================
# 5. TEST ROUTE
# ==========================================


Write-Host ""
Write-Host "=============================================="
Write-Host " TEST ROUTE"
Write-Host "=============================================="


Write-Host ""
Write-Host "Start server:"
Write-Host ""
Write-Host "php artisan serve"
Write-Host ""


Write-Host "Then test:"
Write-Host ""
Write-Host "curl.exe -I http://127.0.0.1:8000/sipandu-api/bootstrap"


Write-Host ""
Write-Host "=============================================="
Write-Host " SIPANDU LOCAL LOCK COMPLETE"
Write-Host "=============================================="