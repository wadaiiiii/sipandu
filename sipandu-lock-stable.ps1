Write-Host "=============================================="
Write-Host " SIPANDU STABLE LOCK"
Write-Host " LOGIN + DATABASE BASELINE"
Write-Host "=============================================="

$APP="C:\Users\LENOVO\siakred-matematika\sipandu\sipandu"

$MYSQL="C:\xampp\mysql\bin"

Set-Location $APP


Write-Host ""
Write-Host "[1] CHECK DATABASE"


$count = php artisan tinker --execute="
echo DB::table('users')->count();
"


Write-Host "TOTAL USER:"
Write-Host $count


if ($count -eq 0)
{

Write-Host ""
Write-Host "=============================================="
Write-Host " DATABASE KOSONG"
Write-Host " PROSES DIHENTIKAN"
Write-Host "=============================================="

exit

}



Write-Host ""
Write-Host "[2] BACKUP DATABASE"


$date=Get-Date -Format "yyyyMMdd-HHmmss"

$dbBackup="sipandu-stable-db-$date.sql"


& "$MYSQL\mysqldump.exe" `
-u root `
sipandu `
> $dbBackup


Write-Host "Backup:"
Write-Host $dbBackup



Write-Host ""
Write-Host "[3] BUAT FILE LOCK"


@"
SIPANDU DATABASE LOCK

Tanggal:
$(Get-Date)

Database:
sipandu

Total User:
$count

STATUS:
STABLE

DILARANG:
- migrate:fresh
- db:wipe
- migrate:refresh

Gunakan:
php artisan migrate

"@ | Out-File SIPANDU_STABLE_LOCK.txt



Write-Host ""
Write-Host "[4] GIT CHECK"


git status



Write-Host ""
Write-Host "[5] COMMIT CHECKPOINT"


git add .

git commit -m "checkpoint: sipandu stable login database baseline"



Write-Host ""
Write-Host "[6] BUAT TAG STABIL"


git tag stable-login-db-20260905



Write-Host ""
Write-Host "[7] SIMPAN BASELINE"


@"
SIPANDU STABLE BASELINE

Tanggal:
$(Get-Date)

Commit:
stable-login-db-20260905

Database:
$count users

Status:
LOGIN NORMAL

"@ | Out-File SIPANDU_BASELINE.txt



Write-Host ""
Write-Host "=============================================="
Write-Host " SIPANDU TERKUNCI"
Write-Host "=============================================="

Write-Host ""
Write-Host "File dibuat:"
Write-Host "- $dbBackup"
Write-Host "- SIPANDU_STABLE_LOCK.txt"
Write-Host "- SIPANDU_BASELINE.txt"

pause