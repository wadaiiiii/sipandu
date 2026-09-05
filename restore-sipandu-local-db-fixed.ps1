Write-Host "=============================================="
Write-Host " SIPANDU LOCAL DATABASE RESTORE FIXED"
Write-Host "=============================================="

$APP="C:\Users\LENOVO\siakred-matematika\sipandu\sipandu"

Set-Location $APP


$sql="sipandu-local-before-live.sql"


Write-Host ""
Write-Host "[1] CEK FILE BACKUP SQL"

if (!(Test-Path $sql)) {

    Write-Host "ERROR: File $sql tidak ditemukan"
    pause
    exit
}

Write-Host "OK - Backup ditemukan"


Write-Host ""
Write-Host "[2] CEK DATA USER DALAM BACKUP"

$check = Select-String `
-Path $sql `
-Pattern "andi.seppewali@unsulbar.ac.id"


if ($null -eq $check) {

    Write-Host "ERROR: Backup tidak memiliki akun admin"
    pause
    exit
}

Write-Host "OK - Data user ditemukan"


Write-Host ""
Write-Host "[3] BACKUP DATABASE SAAT INI"


$time = Get-Date -Format "yyyyMMdd-HHmmss"

$currentBackup="sipandu-before-restore-$time.sql"


cmd /c "mysqldump -u root sipandu > $currentBackup"


Write-Host "Backup dibuat:"
Write-Host $currentBackup



Write-Host ""
Write-Host "[4] RESET DATABASE LOCAL"

mysql -u root -e "DROP DATABASE IF EXISTS sipandu; CREATE DATABASE sipandu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"


if ($LASTEXITCODE -ne 0) {

    Write-Host "Gagal membuat database"
    pause
    exit
}


Write-Host "Database baru dibuat"



Write-Host ""
Write-Host "[5] RESTORE SQL BACKUP"

cmd /c "mysql -u root sipandu < $sql"


if ($LASTEXITCODE -ne 0) {

    Write-Host "RESTORE GAGAL"
    pause
    exit
}


Write-Host "Restore selesai"



Write-Host ""
Write-Host "[6] CLEAR CACHE LARAVEL"

php artisan optimize:clear



Write-Host ""
Write-Host "[7] CEK JUMLAH USER"

php artisan tinker --execute="echo 'TOTAL USER: '.DB::table('users')->count();"


Write-Host ""

Write-Host "=============================================="
Write-Host " RESTORE SELESAI"
Write-Host " TEST LOGIN LOCAL SEKARANG"
Write-Host "=============================================="

pause