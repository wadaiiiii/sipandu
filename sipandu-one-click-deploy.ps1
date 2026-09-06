$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "=============================================="
Write-Host " SIPANDU ONE CLICK - UI DEPLOY"
Write-Host "=============================================="
Write-Host ""
Write-Host "SOP:"
Write-Host "CODE     : Local -> GitHub -> cPanel"
Write-Host "DATABASE : Live -> Backup/Clone -> Local"
Write-Host "DATABASE LIVE TIDAK DISENTUH"
Write-Host ""

# ==========================================================
# 1. CEK GIT
# ==========================================================

Write-Host "[1] CHECK GIT"
git status --short

# ==========================================================
# 2. TYPE CHECK
# ==========================================================

Write-Host ""
Write-Host "[2] TYPESCRIPT CHECK"
npm run types:check

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: TypeScript check gagal."
    pause
    exit 1
}

# ==========================================================
# 3. BUILD
# ==========================================================

Write-Host ""
Write-Host "[3] VITE PRODUCTION BUILD"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Vite build gagal."
    pause
    exit 1
}

# ==========================================================
# 4. STATUS SETELAH BUILD
# ==========================================================

Write-Host ""
Write-Host "[4] PERUBAHAN TERDETEKSI"
git status --short

# ==========================================================
# 5. STAGE HANYA SOURCE + BUILD
# ==========================================================

Write-Host ""
Write-Host "[5] STAGING"

git add resources/js/app.tsx
git add resources/js/classroom-v2.tsx
git add public/build/manifest.json
git add -f public/build

# ==========================================================
# 6. TAMPILKAN STAGED DIFF
# ==========================================================

Write-Host ""
Write-Host "[6] FILE YANG AKAN DI-COMMIT"
git diff --cached --name-status

Write-Host ""
Write-Host "[7] DIFF STAT"
git diff --cached --stat

# ==========================================================
# 7. PASTIKAN SQL TIDAK TERSTAGE
# ==========================================================

Write-Host ""
Write-Host "[8] SECURITY CHECK"

$sqlStaged = git diff --cached --name-only |
    Where-Object { $_ -match '\.sql$' }

if ($sqlStaged) {
    Write-Host ""
    Write-Host "ERROR: FILE SQL TERDETEKSI DALAM STAGING."
    Write-Host "DEPLOY DIBATALKAN."
    git reset
    pause
    exit 1
}

Write-Host "OK - Tidak ada SQL production yang akan di-commit."

# ==========================================================
# 8. CEK FILE SENSITIF
# ==========================================================

$forbidden = @(
    ".env",
    "sipandu-before-restore-20260905-224550.sql",
    "sipandu-before-restore-20260905-224728.sql",
    "sipandu-before-restore-20260905-224751.sql",
    "sipandu-before-restore-20260905-224824.sql",
    "sipandu-current-20260905-224350.sql",
    "sipandu-stable-db-20260905-225438.sql"
)

foreach ($item in $forbidden) {

    $found = git diff --cached --name-only |
        Where-Object { $_ -eq $item }

    if ($found) {
        Write-Host ""
        Write-Host "ERROR: FILE TERLARANG TERSTAGE: $item"
        git reset
        pause
        exit 1
    }
}

Write-Host "OK - File production/database aman."

# ==========================================================
# 9. CEK APAKAH ADA PERUBAHAN UNTUK COMMIT
# ==========================================================

$staged = git diff --cached --name-only

if (!$staged) {

    Write-Host ""
    Write-Host "TIDAK ADA PERUBAHAN SOURCE/BUILD UNTUK DI-COMMIT."
    Write-Host "Tidak ada commit baru."

    Write-Host ""
    Write-Host "CEK REMOTE:"
    git status -sb

    Write-Host ""
    Write-Host "Jika GitHub sudah terbaru, tidak perlu push ulang."

    pause
    exit 0
}

# ==========================================================
# 10. COMMIT
# ==========================================================

Write-Host ""
Write-Host "[9] COMMIT"

git commit -m "fix: finalize Sipandu UI and live navigation"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Commit gagal."
    pause
    exit 1
}

# ==========================================================
# 11. PUSH PRODUCTION -> MAIN
# ==========================================================

Write-Host ""
Write-Host "[10] PUSH production -> main"

git push origin production:main

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "=============================================="
    Write-Host " PUSH GAGAL"
    Write-Host "=============================================="
    Write-Host ""
    Write-Host "Commit lokal TETAP AMAN."
    Write-Host "Tidak ada database yang disentuh."
    pause
    exit 1
}

# ==========================================================
# 12. FINAL STATUS
# ==========================================================

Write-Host ""
Write-Host "=============================================="
Write-Host " DEPLOY REQUEST BERHASIL"
Write-Host "=============================================="

Write-Host ""
Write-Host "Git:"
git status -sb

Write-Host ""
Write-Host "Commit terakhir:"
git log -1 --oneline

Write-Host ""
Write-Host "=============================================="
Write-Host " GitHub Actions sekarang melakukan deployment"
Write-Host " ke cPanel LIVE."
Write-Host "=============================================="

Write-Host ""
Write-Host "DATABASE LIVE: TIDAK DISENTUH"
Write-Host ""

pause
