Write-Host "======================================"
Write-Host " SIPANDU LOGIN RECOVERY"
Write-Host "======================================"

$ErrorActionPreference="Stop"


# ===============================
# BACKUP
# ===============================

Write-Host ""
Write-Host "[1] Backup ENV"

Copy-Item .env .env.before-login-fix -Force



# ===============================
# ENV CHECK
# ===============================

Write-Host ""
Write-Host "[2] Check ENV"


$envFile = Get-Content .env -Raw


if($envFile -notmatch "APP_URL="){

    Add-Content .env "`nAPP_URL=http://127.0.0.1:8000"

}
else{

    $envFile = $envFile -replace `
    "APP_URL=.*", `
    "APP_URL=http://127.0.0.1:8000"


    Set-Content .env $envFile -Encoding UTF8

}



# ===============================
# CACHE
# ===============================

Write-Host ""
Write-Host "[3] Clear Laravel Cache"


php artisan optimize:clear



# ===============================
# STORAGE
# ===============================

Write-Host ""
Write-Host "[4] Storage Link"


php artisan storage:link



# ===============================
# ROUTE CHECK
# ===============================

Write-Host ""
Write-Host "[5] Route Check"


php artisan route:list | findstr login



# ===============================
# BUILD
# ===============================

Write-Host ""
Write-Host "[6] Build Frontend"


npm run build


if($LASTEXITCODE -ne 0){

    Write-Host ""
    Write-Host "BUILD FAILED"

    exit 1
}



# ===============================
# API TEST
# ===============================

Write-Host ""
Write-Host "[7] Test Bootstrap"


try {

$response = Invoke-WebRequest `
"http://127.0.0.1:8000/sipandu-api/bootstrap" `
-UseBasicParsing `
-TimeoutSec 5


Write-Host "Bootstrap OK:"
Write-Host $response.StatusCode

}

catch {

Write-Host ""
Write-Host "Bootstrap belum merespon"
Write-Host $_

}



Write-Host ""
Write-Host "======================================"
Write-Host " LOGIN RECOVERY SELESAI"
Write-Host "======================================"

Write-Host ""
Write-Host "Jalankan:"
Write-Host "php artisan serve"