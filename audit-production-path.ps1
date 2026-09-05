Write-Host "====================================="
Write-Host " SiPANDU PRODUCTION PATH AUDIT "
Write-Host "====================================="

Write-Host ""
Write-Host "1. CHECK PWA HEAD"
Write-Host "-------------------------------------"

if(Test-Path "resources/views/partials/pwa-head.blade.php"){
    Get-Content "resources/views/partials/pwa-head.blade.php"
}
else{
    Write-Host "pwa-head tidak ditemukan"
}


Write-Host ""
Write-Host "2. CHECK BASE PATH DECLARATION"
Write-Host "-------------------------------------"

Get-ChildItem resources/views -Recurse -File |
Select-String "__SIPANDU_BASE_PATH__"


Write-Host ""
Write-Host "3. CHECK DUPLICATE PATH VARIABLE"
Write-Host "-------------------------------------"

Get-ChildItem resources/views,resources/js -Recurse -File |
Select-String "const path|let path|var path"


Write-Host ""
Write-Host "4. CHECK HARDCODED ROOT ASSET"
Write-Host "-------------------------------------"

Get-ChildItem resources/views,resources/js -Recurse -File |
Select-String 'href="/|src="/'


Write-Host ""
Write-Host "5. CHECK ENV BASE PATH"
Write-Host "-------------------------------------"

if(Test-Path ".env"){
    Select-String ".env" -Pattern "APP_URL|SIPANDU_BASE_PATH"
}
else{
    Write-Host ".env tidak ditemukan"
}


Write-Host ""
Write-Host "6. CHECK BUILD MANIFEST"
Write-Host "-------------------------------------"

if(Test-Path "public/build/manifest.json"){
    Get-Content public/build/manifest.json | Select-Object -First 20
}
else{
    Write-Host "manifest.json belum ada"
}


Write-Host ""
Write-Host "7. GIT STATUS"
Write-Host "-------------------------------------"

git status --short


Write-Host ""
Write-Host "====================================="
Write-Host " AUDIT SELESAI "
Write-Host "====================================="