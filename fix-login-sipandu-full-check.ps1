Write-Host "=========================================="
Write-Host " SIPANDU LOGIN FULL CHECK"
Write-Host "=========================================="

Set-Location $PSScriptRoot


Write-Host ""
Write-Host "[1] CLEAR CACHE"
php artisan optimize:clear


Write-Host ""
Write-Host "[2] SESSION DRIVER"

php -r "require 'vendor/autoload.php'; echo 'check via laravel';"


Write-Host ""
Write-Host "[3] CHECK USER"

php artisan tinker --no-interaction


Write-Host ""
Write-Host "=========================================="
Write-Host "SELESAI"
pause