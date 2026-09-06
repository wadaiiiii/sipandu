$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host " SIPANDU LIVE DEPLOY"
Write-Host " CODE ONLY - DATABASE SAFE"
Write-Host "=============================================="
Write-Host ""

$repo = Get-Location

Write-Host "[1] CHECK REPOSITORY"
Write-Host "----------------------------------------------"

$branch = (git branch --show-current).Trim()

if ($branch -ne "production") {
    throw "Branch aktif bukan production. Branch saat ini: $branch"
}

Write-Host "Branch : $branch"

Write-Host ""
Write-Host "[2] CHECK LATEST COMMIT"
Write-Host "----------------------------------------------"

$commit = (git rev-parse HEAD).Trim()
$subject = (git log -1 --pretty=%s).Trim()

Write-Host "Commit : $commit"
Write-Host "Message: $subject"

Write-Host ""
Write-Host "[3] CHECK TYPESCRIPT"
Write-Host "----------------------------------------------"

npm run types:check

if ($LASTEXITCODE -ne 0) {
    throw "TypeScript check gagal. DEPLOY DIBATALKAN."
}

Write-Host ""
Write-Host "[4] BUILD PRODUCTION"
Write-Host "----------------------------------------------"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Vite build gagal. DEPLOY DIBATALKAN."
}

Write-Host ""
Write-Host "[5] STAGE SOURCE + BUILD ASSETS"
Write-Host "----------------------------------------------"

git add resources/js/app.tsx
git add resources/js/classroom-v2.tsx
git add public/build/manifest.json
git add -f public/build/assets

Write-Host ""
Write-Host "[6] CHECK STAGED CHANGES"
Write-Host "----------------------------------------------"

git status --short

Write-Host ""
Write-Host "[7] COMMIT IF NEEDED"
Write-Host "----------------------------------------------"

$staged = git diff --cached --name-only

if ($staged) {

    git commit -m "deploy: Sipandu production update"

    if ($LASTEXITCODE -ne 0) {
        throw "Git commit gagal."
    }

} else {

    Write-Host "Tidak ada perubahan staged."

}

Write-Host ""
Write-Host "[8] PUSH PRODUCTION -> MAIN"
Write-Host "----------------------------------------------"

git push origin production:main

if ($LASTEXITCODE -ne 0) {
    throw "Git push gagal."
}

Write-Host ""
Write-Host "[9] FINAL COMMIT"
Write-Host "----------------------------------------------"

$finalCommit = (git rev-parse HEAD).Trim()

Write-Host "Commit lokal : $finalCommit"

Write-Host ""
Write-Host "=============================================="
Write-Host " CODE DEPLOY SOURCE SELESAI"
Write-Host "=============================================="
Write-Host ""
Write-Host "DATABASE PRODUCTION TIDAK DISENTUH."
Write-Host ""
Write-Host "LIVE STRUCTURE:"
Write-Host "  Source  : /home/matematikaunsulb/apps/sipandu/current"
Write-Host "  Display : /home/matematikaunsulb/public_html/akademik/sipandu"
Write-Host ""
Write-Host "Jika cPanel menggunakan auto-deploy dari GitHub,"
Write-Host "tunggu proses deployment kemudian refresh SiPANDU."
Write-Host ""
Write-Host "Jika cPanel TIDAK auto-deploy, jangan melakukan"
Write-Host "perubahan database. Kita lanjutkan deployment"
Write-Host "release source secara terkontrol."
Write-Host ""
Write-Host "=============================================="
Write-Host " SELESAI"
Write-Host "=============================================="