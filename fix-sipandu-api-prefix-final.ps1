Write-Host "FIX SIPANDU API PREFIX"

$app="resources/js/app.tsx"

Copy-Item $app "$app.before-api-prefix-fix" -Force


$content = Get-Content $app -Raw


# ganti endpoint salah
$content = $content.Replace(
"/api/bootstrap",
"/sipandu-api/bootstrap"
)


$content = $content.Replace(
"api/bootstrap",
"sipandu-api/bootstrap"
)


Set-Content `
$app `
$content `
-Encoding UTF8


Write-Host ""
Write-Host "CLEAR CACHE"

php artisan optimize:clear


Write-Host ""
Write-Host "BUILD"

npm run build


Write-Host ""
Write-Host "DONE"