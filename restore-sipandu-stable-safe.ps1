Write-Host "=============================================="
Write-Host " SIPANDU SAFE DATABASE RESTORE"
Write-Host "=============================================="

$APP="C:\Users\LENOVO\siakred-matematika\sipandu\sipandu"

$sql="C:\Users\LENOVO\Downloads\sipandu-local-stable-20260904.sql"

Set-Location $APP


if (!(Test-Path $sql)) {
    Write-Host "Backup tidak ditemukan"
    pause
    exit
}


Write-Host ""
Write-Host "BACKUP:"
Write-Host $sql


$confirm = Read-Host "Ketik YES untuk lanjut"

if ($confirm -ne "YES") {
    Write-Host "Dibatalkan"
    pause
    exit
}


Write-Host ""
Write-Host "[1] Backup database sekarang"

$time = Get-Date -Format "yyyyMMdd-HHmmss"

cmd /c "mysqldump -u root sipandu > sipandu-current-$time.sql"


Write-Host ""
Write-Host "[2] Hapus database lama"

mysql -u root -e "DROP DATABASE IF EXISTS sipandu_restore_old;"

mysql -u root -e "CREATE DATABASE sipandu_restore_old;"


Write-Host ""
Write-Host "[3] Salin database lama"

cmd /c "mysqldump -u root sipandu | mysql -u root sipandu_restore_old"



Write-Host ""
Write-Host "[4] Reset database sipandu"

mysql -u root -e "DROP DATABASE IF EXISTS sipandu; CREATE DATABASE sipandu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"


Write-Host ""
Write-Host "[5] Import stable backup"

cmd /c "mysql -u root sipandu < `"$sql`""


Write-Host ""
Write-Host "[6] Clear Laravel"

php artisan optimize:clear


Write-Host ""
Write-Host "[7] Cek USER"

php artisan tinker --execute="echo DB::table('users')->count();"


Write-Host ""
Write-Host "=============================================="
Write-Host " RESTORE SELESAI"
Write-Host "=============================================="

pause