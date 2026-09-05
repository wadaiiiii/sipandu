Write-Host "=============================================="
Write-Host " SIPANDU AUTO DATABASE RESTORE"
Write-Host "=============================================="

$APP="C:\Users\LENOVO\siakred-matematika\sipandu\sipandu"

Set-Location $APP


Write-Host ""
Write-Host "[1] MENCARI BACKUP DATABASE"


$sqlFile = Get-ChildItem `
-Path C:\Users\LENOVO `
-Recurse `
-Filter "sipandu-local-before-live.sql" `
-ErrorAction SilentlyContinue |
Select-Object -First 1


if ($null -eq $sqlFile) {

    Write-Host ""
    Write-Host "BACKUP SQL TIDAK DITEMUKAN"
    Write-Host "Cari manual file:"
    Write-Host "sipandu-local-before-live.sql"

    pause
    exit
}


$sql=$sqlFile.FullName


Write-Host ""
Write-Host "Backup ditemukan:"
Write-Host $sql



Write-Host ""
Write-Host "[2] KONFIRMASI RESTORE"

Write-Host ""
Write-Host "PERINGATAN:"
Write-Host "Database sipandu lokal akan diganti."
Write-Host ""

$confirm = Read-Host "Ketik YES untuk lanjut"


if ($confirm -ne "YES") {

    Write-Host "Dibatalkan."

    pause
    exit
}



Write-Host ""
Write-Host "[3] BACKUP DATABASE SAAT INI"


$time = Get-Date -Format "yyyyMMdd-HHmmss"

$currentBackup="sipandu-before-restore-$time.sql"


cmd /c "mysqldump -u root sipandu > $currentBackup"


Write-Host "Backup lama:"
Write-Host $currentBackup



Write-Host ""
Write-Host "[4] RESET DATABASE"

mysql -u root -e "DROP DATABASE IF EXISTS sipandu; CREATE DATABASE sipandu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"


Write-Host "Database dibuat ulang"



Write-Host ""
Write-Host "[5] RESTORE BACKUP"


cmd /c "mysql -u root sipandu < `"$sql`""


if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "RESTORE GAGAL"

    pause
    exit
}


Write-Host "Restore berhasil"



Write-Host ""
Write-Host "[6] CLEAR CACHE LARAVEL"


php artisan optimize:clear



Write-Host ""
Write-Host "[7] CEK DATA USER"


php artisan tinker --execute="echo 'TOTAL USER : '.DB::table('users')->count();"


Write-Host ""

Write-Host "=============================================="
Write-Host " RESTORE DATABASE SELESAI"
Write-Host "=============================================="

Write-Host ""
Write-Host "Silakan test:"
Write-Host "php artisan serve"

pause