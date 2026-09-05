Write-Host "============================================"
Write-Host " SIPANDU FRONTEND BUILD DEPLOY PREPARER"
Write-Host "============================================"

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "[1] CHECK PROJECT"
Write-Host "--------------------------------------------"

if (!(Test-Path "package.json")) {
    Write-Host "ERROR: bukan folder project SiPANDU"
    exit
}

Write-Host "Project OK"


Write-Host ""
Write-Host "[2] CHECK API RESOLVER"
Write-Host "--------------------------------------------"

Get-Content resources/js/utils/sipandu-api.ts


Write-Host ""
Write-Host "[3] BUILD FRONTEND"
Write-Host "--------------------------------------------"

npm run build


Write-Host ""
Write-Host "[4] CHECK HARDCODE API"
Write-Host "--------------------------------------------"

$bad = Select-String `
    -Path public/build/assets/*.js `
    -Pattern "/sipandu-api/"


if ($bad) {

    Write-Host ""
    Write-Host "ERROR: masih ada hardcode /sipandu-api" -ForegroundColor Red
    $bad | Select-Object -First 5
    exit

}
else {

    Write-Host "OK - tidak ada hardcode /sipandu-api" -ForegroundColor Green

}


Write-Host ""
Write-Host "[5] CREATE BUILD PACKAGE"
Write-Host "--------------------------------------------"

if(Test-Path "sipandu-build.zip"){
    Remove-Item sipandu-build.zip -Force
}

Compress-Archive `
    -Path public/build `
    -DestinationPath sipandu-build.zip


Write-Host ""
Write-Host "[6] BUILD INFO"
Write-Host "--------------------------------------------"

Get-ChildItem public/build/assets/classroom-v2-*.js |
Select-Object Name,Length,LastWriteTime


Write-Host ""
Write-Host "============================================"
Write-Host " SELESAI"
Write-Host "============================================"

Write-Host ""
Write-Host "FILE SIAP UPLOAD:"
Write-Host "sipandu-build.zip"