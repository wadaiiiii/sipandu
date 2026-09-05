# =====================================================
# SIPANDU FINAL ONE CLICK DEPLOY
# LOCAL WINDOWS -> SSH PRODUCTION
# =====================================================

$ErrorActionPreference="Stop"

$SERVER="matematikaunsulb@unsulbar.ac.id"
$REMOTE="/home/matematikaunsulb/apps/sipandu"

$ZIP="sipandu-build-final.zip"
$REMOTE_SCRIPT="deploy-remote.sh"


Write-Host ""
Write-Host "======================================"
Write-Host " SIPANDU ONE CLICK DEPLOY"
Write-Host "======================================"


# ==============================
# BUILD
# ==============================

Write-Host ""
Write-Host "[1] BUILD FRONTEND"
Write-Host "--------------------------------------"

npm run build

if($LASTEXITCODE -ne 0){
    throw "BUILD FAILED"
}



# ==============================
# ZIP
# ==============================

Write-Host ""
Write-Host "[2] CREATE ZIP"
Write-Host "--------------------------------------"


if(Test-Path $ZIP){
    Remove-Item $ZIP -Force
}


Compress-Archive `
    -Path public/build `
    -DestinationPath $ZIP



# ==============================
# UPLOAD ZIP
# ==============================

Write-Host ""
Write-Host "[3] UPLOAD BUILD"
Write-Host "--------------------------------------"


scp $ZIP "$SERVER`:$REMOTE/"


if($LASTEXITCODE -ne 0){
    throw "UPLOAD ZIP FAILED"
}



# ==============================
# CREATE REMOTE SCRIPT
# ==============================


Write-Host ""
Write-Host "[4] CREATE REMOTE DEPLOY SCRIPT"
Write-Host "--------------------------------------"


$remoteScript=@'
#!/bin/bash

cd /home/matematikaunsulb/apps/sipandu

echo "BACKUP BUILD"

cd current

STAMP=$(date +%Y%m%d%H%M)

if [ -d public/build ]; then
    mv public/build public/build-backup-$STAMP
fi


echo "EXTRACT BUILD"

unzip -o ../sipandu-build-final.zip -d public/


echo "CLEAR CACHE"

php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache


echo "CHECK BUILD"

ls -lt public/build/assets/classroom-v2-*.js | head


echo "DEPLOY FINISH"

'@


# tulis LF tanpa BOM
$bytes = [System.Text.Encoding]::UTF8.GetBytes(
    $remoteScript.Replace("`r`n","`n")
)

[System.IO.File]::WriteAllBytes(
    $REMOTE_SCRIPT,
    $bytes
)



# ==============================
# UPLOAD SCRIPT
# ==============================


scp $REMOTE_SCRIPT "$SERVER`:/tmp/$REMOTE_SCRIPT"


if($LASTEXITCODE -ne 0){
    throw "UPLOAD SCRIPT FAILED"
}



# ==============================
# EXECUTE REMOTE
# ==============================


Write-Host ""
Write-Host "[5] EXECUTE REMOTE DEPLOY"
Write-Host "--------------------------------------"


ssh $SERVER "
chmod +x /tmp/$REMOTE_SCRIPT &&
bash /tmp/$REMOTE_SCRIPT
"



Write-Host ""
Write-Host "======================================"
Write-Host " SIPANDU DEPLOY SELESAI"
Write-Host "======================================"