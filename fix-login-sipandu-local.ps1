Write-Host "====================================="
Write-Host " FIX LOGIN SIPANDU LOCAL ONE CLICK"
Write-Host "====================================="

# Pastikan berada di root project
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT


Write-Host ""
Write-Host "[1] CLEAR LARAVEL CACHE"
Write-Host "-------------------------------------"

php artisan optimize:clear


Write-Host ""
Write-Host "[2] RESET PASSWORD USER"
Write-Host "-------------------------------------"

php artisan tinker --execute="
use Illuminate\Support\Facades\Hash;
DB::table('users')
->where('email','rahmawati@unsulbar.ac.id')
->update([
    'password'=>Hash::make('123'),
    'is_active'=>1
]);
"


Write-Host ""
Write-Host "[3] CLEAR SESSION"
Write-Host "-------------------------------------"

if (Test-Path "storage/framework/sessions") {
    Remove-Item storage/framework/sessions/* -Force -ErrorAction SilentlyContinue
}


Write-Host ""
Write-Host "[4] REBUILD CACHE"
Write-Host "-------------------------------------"

php artisan config:cache
php artisan route:cache
php artisan view:cache


Write-Host ""
Write-Host "====================================="
Write-Host " SIPANDU LOCAL FIX SELESAI"
Write-Host "====================================="
Write-Host ""
Write-Host "LOGIN:"
Write-Host "Email    : rahmawati@unsulbar.ac.id"
Write-Host "Password : 123"
Write-Host ""
pause