Write-Host "===================================="
Write-Host " SIPANDU FINAL RECOVERY"
Write-Host "===================================="


$ErrorActionPreference="Stop"


# ==========================
# 1. BACKUP ENV
# ==========================

Write-Host ""
Write-Host "[1] Backup ENV"

Copy-Item .env ".env.backup-recovery" -Force


# ==========================
# 2. CHECK GIT
# ==========================

Write-Host ""
Write-Host "[2] Sync Git"

git fetch origin


# simpan branch sekarang
$branch = git branch --show-current


Write-Host "Current branch:"
Write-Host $branch


# checkout main
git checkout main


# ambil versi github terakhir
git reset --hard origin/main



# ==========================
# 3. CLEAR CACHE
# ==========================

Write-Host ""
Write-Host "[3] Laravel Clear Cache"


php artisan optimize:clear


# ==========================
# 4. DATABASE CHECK
# ==========================

Write-Host ""
Write-Host "[4] Database Check"


php artisan migrate:status



# ==========================
# 5. NODE
# ==========================

Write-Host ""
Write-Host "[5] Install Node"


npm install



# ==========================
# 6. BUILD
# ==========================

Write-Host ""
Write-Host "[6] Build Vite"


npm run build



if($LASTEXITCODE -ne 0){

Write-Host ""
Write-Host "BUILD GAGAL"

exit 1

}



# ==========================
# 7. FINAL
# ==========================


Write-Host ""
Write-Host "===================================="
Write-Host " SIPANDU RECOVERY SELESAI"
Write-Host "===================================="

Write-Host ""

php artisan route:list | findstr api


Write-Host ""
Write-Host "Jalankan:"
Write-Host "php artisan serve"