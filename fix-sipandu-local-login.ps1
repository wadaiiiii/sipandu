Write-Host "========================================="
Write-Host " SIPANDU LOCAL LOGIN SESSION FIX"
Write-Host "========================================="

$APP = "C:\Users\LENOVO\siakred-matematika\sipandu\sipandu"

Set-Location $APP

Write-Host ""
Write-Host "[1] Backup .env"
Copy-Item .env .env.backup-login-fix -Force


Write-Host ""
Write-Host "[2] Fix SESSION configuration"

$content = Get-Content .env -Raw


# SESSION SECURE
$content = $content -replace "SESSION_SECURE_COOKIE=.*", "SESSION_SECURE_COOKIE=false"


# SESSION DOMAIN
if ($content -match "SESSION_DOMAIN=") {
    $content = $content -replace "SESSION_DOMAIN=.*", "SESSION_DOMAIN=null"
}
else {
    $content += "`nSESSION_DOMAIN=null"
}


# SESSION PATH
if ($content -match "SESSION_PATH=") {
    $content = $content -replace "SESSION_PATH=.*", "SESSION_PATH=/"
}
else {
    $content += "`nSESSION_PATH=/"
}


# Fix SIMATRPS typo
$content = $content -replace `
"SIMATRPS_BASE_URL=SIMATRPS_BASE_URL=", `
"SIMATRPS_BASE_URL="


Set-Content .env $content -Encoding UTF8


Write-Host ""
Write-Host "[3] Clear Laravel cache"

php artisan optimize:clear


Write-Host ""
Write-Host "========================================="
Write-Host " SELESAI"
Write-Host " Silakan jalankan:"
Write-Host ""
Write-Host " php artisan serve"
Write-Host ""
Write-Host " lalu test login"
Write-Host "========================================="

pause