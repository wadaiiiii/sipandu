$ErrorActionPreference = "Stop"

Write-Host "=== SiPANDU FINAL CLASS UI PATCH ===" -ForegroundColor Cyan

$app = "resources/js/app.tsx"
$backup = "resources/js/app.tsx.before-final-class-ui"

if (!(Test-Path $app)) {
    Write-Host "File app.tsx tidak ditemukan" -ForegroundColor Red
    exit
}

# backup
if (!(Test-Path $backup)) {
    Copy-Item $app $backup
    Write-Host "Backup dibuat:"
    Write-Host $backup
}

$content = Get-Content $app -Raw -Encoding UTF8


# ==============================
# 1. Layout kelas menjadi 1 kolom
# ==============================

$content = $content.Replace(
'grid gap-4 lg:grid-cols-2',
'grid gap-4'
)


# ==============================
# 2. Header kelas full width
# ==============================

$content = $content.Replace(
'<div className="min-w-0">',
'<div className="w-full">'
)


# ==============================
# 3. Judul kelas tidak terpotong
# ==============================

$content = $content.Replace(
'data-sipandu-class-title="true" className="mt-2 text-xl font-bold tracking-tight text-slate-950"',
'className="mt-2 w-full text-xl font-bold tracking-tight text-slate-950 whitespace-normal"'
)


# ==============================
# 4. Menu aksi di bawah judul
# ==============================

$content = $content.Replace(
'data-sipandu-class-actions="true" className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3"',
'className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"'
)


# ==============================
# 5. Tombol lebih kecil
# ==============================

$content = $content.Replace(
'px-4 py-2.5 text-sm',
'px-3 py-2 text-xs'
)


# ==============================
# 6. Bersihkan mojibake
# ==============================

$content = $content.Replace("â€”","-")
$content = $content.Replace("â€“","-")
$content = $content.Replace("Â·","·")
$content = $content.Replace("â†’","→")
$content = $content.Replace("â€¦","...")


# simpan
Set-Content $app $content -Encoding UTF8


Write-Host ""
Write-Host "Patch JSX selesai" -ForegroundColor Green


# build
Write-Host ""
Write-Host "Menjalankan npm build..." -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "BUILD GAGAL - rollback" -ForegroundColor Red

    Copy-Item $backup $app -Force

    Write-Host "File dikembalikan:"
    Write-Host $backup

    exit 1
}


Write-Host ""
Write-Host "================================="
Write-Host "PATCH BERHASIL"
Write-Host "================================="