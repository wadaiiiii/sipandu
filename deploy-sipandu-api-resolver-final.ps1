Write-Host ""
Write-Host "======================================"
Write-Host " SIPANDU FINAL FRONTEND RELEASE CHECK"
Write-Host "======================================"

$ErrorActionPreference="Stop"


Write-Host ""
Write-Host "[1] BUILD FRONTEND"
Write-Host "--------------------------------------"

npm run build


if($LASTEXITCODE -ne 0){
    Write-Host "BUILD FAILED" -ForegroundColor Red
    exit 1
}


Write-Host ""
Write-Host "[2] CHECK ABSOLUTE DOMAIN"
Write-Host "--------------------------------------"


$bad = Select-String `
    -Path public/build/assets/*.js `
    -Pattern "matematika.unsulbar.ac.id|localhost:8000|127.0.0.1:8000"


if($bad){

    Write-Host "ERROR: ditemukan absolute URL" -ForegroundColor Red
    $bad | Select-Object -First 10
    exit 1

}
else{

    Write-Host "OK - tidak ada absolute URL" -ForegroundColor Green

}


Write-Host ""
Write-Host "[3] CHECK API MODULE"
Write-Host "--------------------------------------"


Get-ChildItem public/build/assets/sipandu-api-*.js |
Select-Object Name,Length,LastWriteTime


Write-Host ""
Write-Host "[4] CHECK CLASSROOM BUILD"
Write-Host "--------------------------------------"


Get-ChildItem public/build/assets/classroom-v2-*.js |
Select-Object Name,Length,LastWriteTime



Write-Host ""
Write-Host "[5] CREATE ZIP"
Write-Host "--------------------------------------"


if(Test-Path sipandu-build-final.zip){
    Remove-Item sipandu-build-final.zip -Force
}


Compress-Archive `
    -Path public/build `
    -DestinationPath sipandu-build-final.zip



Write-Host ""
Write-Host "======================================"
Write-Host " SELESAI"
Write-Host "======================================"

Write-Host ""
Write-Host "UPLOAD FILE:"
Write-Host "sipandu-build-final.zip"