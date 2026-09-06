$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host " SIPANDU NAVIGATION + UI FINAL PATCH"
Write-Host "=============================================="

$file = "resources/js/app.tsx"

if (!(Test-Path $file)) {
    throw "File tidak ditemukan: $file"
}

$backup = "$file.before-navigation-final"

if (!(Test-Path $backup)) {
    Copy-Item $file $backup
    Write-Host "Backup dibuat: $backup"
}

$c = Get-Content $file -Raw -Encoding UTF8

Write-Host ""
Write-Host "[1] PATCH URL /kelas/"

$old1 = 'href={`/kelas/${courseClass.id}/jurnal`}'
$new1 = 'href={sipanduUrl(`/kelas/${courseClass.id}/jurnal`)}'

if ($c.Contains($old1)) {
    $c = $c.Replace($old1, $new1)
    Write-Host "  OK - Rekap Pembelajaran menggunakan sipanduUrl()"
}
else {
    Write-Host "  INFO - URL jurnal sudah dipatch atau tidak ditemukan"
}

Write-Host ""
Write-Host "[2] CHECK HARDCODED /kelas/"

$matches = [regex]::Matches($c, '/kelas/')

if ($matches.Count -gt 0) {
    Write-Host "  Ditemukan $($matches.Count) referensi /kelas/"
}
else {
    Write-Host "  OK - Tidak ada referensi /kelas/"
}

Write-Host ""
Write-Host "[3] CHECK sipanduUrl()"

if ($c.Contains("sipanduUrl(")) {
    Write-Host "  OK - sipanduUrl() tersedia"
}
else {
    throw "sipanduUrl() tidak ditemukan di app.tsx"
}

Write-Host ""
Write-Host "[4] SAVE"

Set-Content -Path $file -Value $c -Encoding UTF8

Write-Host "  OK - $file diperbarui"

Write-Host ""
Write-Host "[5] VERIFY"

Get-Content $file |
    Select-String -Pattern 'href=\{sipanduUrl|/kelas/|detail_url' |
    Select-Object -First 30

Write-Host ""
Write-Host "[6] TYPESCRIPT"

npm run types:check

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "TYPE CHECK GAGAL - ROLLBACK"

    if (Test-Path $backup) {
        Copy-Item $backup $file -Force
    }

    exit 1
}

Write-Host ""
Write-Host "[7] BUILD"

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD GAGAL - ROLLBACK"

    if (Test-Path $backup) {
        Copy-Item $backup $file -Force
    }

    exit 1
}

Write-Host ""
Write-Host "=============================================="
Write-Host " NAVIGATION PATCH BERHASIL"
Write-Host "=============================================="

Write-Host ""
Write-Host "Git status:"
git status --short

Write-Host ""
Write-Host "CATATAN:"
Write-Host "Database production tidak disentuh."
Write-Host "Belum melakukan commit/push."
