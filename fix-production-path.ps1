Write-Host "====================================="
Write-Host " SIPANDU PRODUCTION PATH FIX "
Write-Host "====================================="


Write-Host ""
Write-Host "1. Backup current files"

Copy-Item `
resources/views/partials/api-prefix-bridge.blade.php `
resources/views/partials/api-prefix-bridge.blade.php.before-production-fix `
-Force


Write-Host ""
Write-Host "2. Fix duplicate path variable"

$file="resources/views/partials/api-prefix-bridge.blade.php"

$content=Get-Content $file -Raw

$content=$content -replace `
"const path = value;", `
"const currentPath = value;"

$content=$content -replace `
"\bpath\b", `
"currentPath"


Set-Content `
$file `
$content `
-Encoding UTF8



Write-Host ""
Write-Host "3. Add SIPANDU BASE PATH env"

if(-not (Select-String ".env" -Pattern "SIPANDU_BASE_PATH")){

Add-Content .env ""

Add-Content .env `
"SIPANDU_BASE_PATH=/akademik/sipandu"

}



Write-Host ""
Write-Host "4. Clear Laravel cache"

php artisan optimize:clear



Write-Host ""
Write-Host "5. Build frontend"

npm run build



Write-Host ""
Write-Host "6. Test"

php artisan test



Write-Host ""
Write-Host "====================================="
Write-Host " FIX COMPLETE "
Write-Host "====================================="