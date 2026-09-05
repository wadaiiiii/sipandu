# =====================================================
# SIPANDU ONE CLICK DEPLOY FINAL
# =====================================================

$ErrorActionPreference="Stop"

$SERVER="matematikaunsulb@unsulbar.ac.id"
$REMOTE="/home/matematikaunsulb/apps/sipandu"

$ZIP="sipandu-build-final.zip"


Write-Host ""
Write-Host "======================================"
Write-Host " SIPANDU ONE CLICK DEPLOY FINAL"
Write-Host "======================================"



# ==========================
# BUILD
# ==========================

Write-Host ""
Write-Host "[1] BUILD FRONTEND"
Write-Host "--------------------------------------"

npm run build

if($LASTEXITCODE -ne 0){
    throw "BUILD FAILED"
}



# ==========================
# ZIP
# ==========================

Write-Host ""
Write-Host "[2] CREATE ZIP"
Write-Host "--------------------------------------"

if(Test-Path $ZIP){
    Remove-Item $ZIP -Force
}


Compress-Archive `
    -Path public/build `
    -DestinationPath $ZIP



# ==========================
# UPLOAD
# ==========================

Write-Host ""
Write-Host "[3] UPLOAD BUILD"
Write-Host "--------------------------------------"

scp $ZIP "$SERVER`:$REMOTE/"


if($LASTEXITCODE -ne 0){
    throw "UPLOAD FAILED"
}



# ==========================
# REMOTE DEPLOY SINGLE LINE
# ==========================

Write-Host ""
Write-Host "[4] REMOTE DEPLOY"
Write-Host "--------------------------------------"


$STAMP = Get-Date -Format "yyyyMMddHHmm"


$CMD = "cd /home/matematikaunsulb/apps/sipandu/current && if [ -d public/build ]; then mv public/build public/build-backup-$STAMP; fi && unzip -o /home/matematikaunsulb/apps/sipandu/sipandu-build-final.zip -d public/ && php artisan optimize:clear && php artisan config:cache && php artisan route:cache && php artisan view:cache && ls -lt public/build/assets/classroom-v2-*.js | head"

ssh $SERVER $CMD



Write-Host ""
Write-Host "======================================"
Write-Host " SIPANDU DEPLOY SELESAI"
Write-Host "======================================"