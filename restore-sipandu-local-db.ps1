Write-Host "=============================================="
Write-Host " SIPANDU LOCAL DATABASE RESTORE"
Write-Host " SAFE MODE"
Write-Host "=============================================="

$APP="C:\Users\LENOVO\siakred-matematika\sipandu\sipandu"

Set-Location $APP


Write-Host ""
Write-Host "[1] CHECK BACKUP SQL"

$sql="sipandu-local-before-live.sql"

if (!(Test-Path $sql)) {

    Write-Host "ERROR:"
    Write-Host "$sql tidak ditemukan"

    pause
    exit
}


Write-Host "Backup ditemukan:"
Write-Host $sql



Write-Host ""
Write-Host "[2] CHECK USER DATA DI BACKUP"

$result = Select-String `
-Path $sql `
-Pattern "andi.seppewali@unsulbar.ac.id"


if ($null -eq $result) {

    Write-Host ""
    Write-Host "WARNING:"
    Write-Host "Backup tidak memiliki akun Admin"

    pause
    exit

}


Write-Host "Data user ditemukan"



Write-Host ""
Write-Host "[3] BACKUP DATABASE SAAT INI"


$time = Get-Date -Format "yyyyMMdd-HHmmss"

$currentBackup="sipandu-before-restore-$time.sql"


mysqldump -u root sipandu > $currentBackup


Write-Host "Backup lama dibuat:"
Write-Host $currentBackup



Write-Host ""
Write-Host "[4] RESET DATABASE LOCAL"

mysql -u root -e "DROP DATABASE IF EXISTS sipandu; CREATE DATABASE sipandu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"


Write-Host ""
Write-Host "[5] RESTORE DATABASE"

mysql -u root sipandu < $sql


if ($LASTEXITCODE -ne 0) {

    Write-Host "RESTORE GAGAL"

    pause
    exit

}


Write-Host ""
Write-Host "[6] CLEAR LARAVEL CACHE"

php artisan optimize:clear



Write-Host ""
Write-Host "[7] CHECK USER AFTER RESTORE"

$count = php artisan tinker --execute="echo DB::table('users')->count();"


Write-Host ""
Write-Host "Jumlah user:"
Write-Host $count



if ($count -eq "0") {

    Write-Host ""
    Write-Host "ERROR:"
    Write-Host "Database masih kosong"

}
else {

    Write-Host ""
    Write-Host "=============================================="
    Write-Host " RESTORE BERHASIL"
    Write-Host " DATABASE SIAP TEST LOGIN"
    Write-Host "=============================================="

}


pause