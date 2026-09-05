Write-Host "============================================"
Write-Host " SIPANDU DATABASE LOCK & SAFETY CHECK"
Write-Host "============================================"

$APP="C:\Users\LENOVO\siakred-matematika\sipandu\sipandu"

Set-Location $APP


Write-Host ""
Write-Host "[1] BACKUP ENV"

if (Test-Path ".env") {

    Copy-Item ".env" ".env.backup-db-lock" -Force

    Write-Host "ENV backup created"

}
else {

    Write-Host "ERROR: .env tidak ditemukan"
    pause
    exit

}


Write-Host ""
Write-Host "[2] CHECK DATABASE"

$db = php artisan tinker --execute="
echo DB::connection()->getDatabaseName();
"

Write-Host "Database:"
Write-Host $db



Write-Host ""
Write-Host "[3] CHECK USERS"

$userCount = php artisan tinker --execute="
echo DB::table('users')->count();
"


Write-Host "Jumlah users:"
Write-Host $userCount



if ($userCount -eq "0") {

    Write-Host ""
    Write-Host "============================================"
    Write-Host " WARNING !!!"
    Write-Host " DATABASE USER KOSONG"
    Write-Host " DEPLOY DIBATALKAN"
    Write-Host "============================================"

    "DATABASE EMPTY - BLOCK DEPLOY" | Out-File DB_LOCK_STATUS.txt

    pause
    exit

}



Write-Host ""
Write-Host "[4] CREATE DATABASE SNAPSHOT"

$time = Get-Date -Format "yyyyMMdd-HHmmss"

$snapshot="sipandu-db-safe-$time.txt"

@"
SIPANDU DATABASE SNAPSHOT

Tanggal:
$(Get-Date)

Database:
$db

Jumlah User:
$userCount


STATUS:
SAFE

"@ | Out-File $snapshot



Write-Host ""
Write-Host "[5] UPDATE LOCAL SAFETY FLAG"

@"
SIPANDU DATABASE LOCK ACTIVE

Database:
$db

Users:
$userCount

Status:
SAFE

Do not run:
- migrate:fresh
- db:wipe
- migrate:refresh

"@ | Out-File SIPANDU_DB_LOCK.txt



Write-Host ""
Write-Host "============================================"
Write-Host " DATABASE LOCK BERHASIL"
Write-Host "============================================"

Write-Host ""
Write-Host "Database:"
Write-Host $db

Write-Host ""
Write-Host "Users:"
Write-Host $userCount

Write-Host ""
Write-Host "File dibuat:"
Write-Host "SIPANDU_DB_LOCK.txt"

pause