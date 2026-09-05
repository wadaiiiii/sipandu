Write-Host "=============================================="
Write-Host " SIPANDU RESTORE STABLE - XAMPP MODE"
Write-Host "=============================================="

$mysql="C:\xampp\mysql\bin\mysql.exe"
$dump="C:\xampp\mysql\bin\mysqldump.exe"

$sql="C:\Users\LENOVO\Downloads\sipandu-local-stable-20260904.sql"


if (!(Test-Path $mysql)) {
    Write-Host "mysql.exe tidak ditemukan"
    pause
    exit
}

if (!(Test-Path $dump)) {
    Write-Host "mysqldump.exe tidak ditemukan"
    pause
    exit
}

if (!(Test-Path $sql)) {
    Write-Host "Backup SQL tidak ditemukan"
    pause
    exit
}


Write-Host ""
Write-Host "MYSQL:"
Write-Host $mysql

Write-Host ""
Write-Host "BACKUP:"
Write-Host $sql


$confirm = Read-Host "Ketik YES untuk restore"

if ($confirm -ne "YES") {
    Write-Host "Dibatalkan"
    pause
    exit
}


Write-Host ""
Write-Host "[1] Backup database kosong sekarang"

$time=Get-Date -Format "yyyyMMdd-HHmmss"

cmd /c "`"$dump`" -u root sipandu > sipandu-before-restore-$time.sql"


Write-Host ""
Write-Host "[2] Reset database sipandu"


& $mysql -u root -e "DROP DATABASE IF EXISTS sipandu; CREATE DATABASE sipandu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"


Write-Host ""
Write-Host "[3] Import stable backup"


cmd /c "`"$mysql`" --binary-mode=1 -u root sipandu < `"$sql`""


if ($LASTEXITCODE -ne 0) {

    Write-Host "IMPORT GAGAL"
    pause
    exit
}


Write-Host ""
Write-Host "[4] Clear Laravel"


php artisan optimize:clear


Write-Host ""
Write-Host "[5] Cek user"


php artisan tinker --execute="echo 'TOTAL USER = '.DB::table('users')->count();"


Write-Host ""
Write-Host "=============================================="
Write-Host " RESTORE SELESAI"
Write-Host "=============================================="

pause