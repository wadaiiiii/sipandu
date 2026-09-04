Write-Host "=== SIPANDU API RUNTIME FIX ==="


# backup
Copy-Item `
resources/js/app.tsx `
resources/js/app.tsx.before-api-runtime-fix `
-Force


$app="resources/js/app.tsx"


$content = Get-Content $app -Raw


# normalisasi endpoint

$content = $content -replace `
"/api/bootstrap", `
"/sipandu-api/bootstrap"


$content = $content -replace `
"'/api/", `
"'/sipandu-api/"


$content = $content -replace `
'"/api/', `
'"/sipandu-api/'


# cegah double prefix

$content = $content -replace `
"/sipandu-sipandu-api/", `
"/sipandu-api/"


Set-Content `
$app `
$content `
-Encoding UTF8



Write-Host "Clear Laravel"

php artisan optimize:clear


Write-Host "Remove old build"

if(Test-Path public/build){
    Remove-Item public/build -Recurse -Force
}


Write-Host "Build"

npm run build


Write-Host ""
Write-Host "DONE"