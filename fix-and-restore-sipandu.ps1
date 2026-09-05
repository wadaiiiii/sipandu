Write-Host "=============================================="
Write-Host " SIPANDU SQL ENCODING FIX + RESTORE"
Write-Host "=============================================="


$mysql="C:\xampp\mysql\bin\mysql.exe"

$source="C:\Users\LENOVO\Downloads\sipandu-local-stable-20260904.sql"

$fixed="C:\Users\LENOVO\Downloads\sipandu-stable-fixed.sql"


if (!(Test-Path $source)) {

    Write-Host "SQL SOURCE TIDAK ADA"
    pause
    exit
}


Write-Host ""
Write-Host "[1] KONVERSI SQL KE UTF-8"


Get-Content $source -Encoding Unicode |
Set-Content $fixed -Encoding UTF8


Write-Host "File baru:"
Write-Host $fixed



Write-Host ""
Write-Host "[2] RESET DATABASE"


& $mysql -u root -e "
DROP DATABASE IF EXISTS sipandu;
CREATE DATABASE sipandu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"



Write-Host ""
Write-Host "[3] IMPORT SQL FIXED"


cmd /c "`"$mysql`" --binary-mode=1 -u root sipandu < `"$fixed`""


if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "IMPORT GAGAL"

    pause
    exit
}



Write-Host ""
Write-Host "[4] CLEAR CACHE"


php artisan optimize:clear



Write-Host ""
Write-Host "[5] CEK USER"


php artisan tinker --execute="echo 'TOTAL USER = '.DB::table('users')->count();"


Write-Host ""
Write-Host "=============================================="
Write-Host " SELESAI"
Write-Host "=============================================="

pause