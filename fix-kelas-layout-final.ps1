$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-layout-final"

Write-Host "=== SIPANDU FINAL CLASS LAYOUT ==="


if(!(Test-Path $backup)){
    Copy-Item $file $backup
    Write-Host "Backup dibuat"
}


$c = Get-Content $file -Raw -Encoding UTF8


# ===============================
# 1. PAKSA GRID KELAS SATU KOLOM
# ===============================

$c = $c.Replace(
'grid gap-5 xl:grid-cols-2',
'grid gap-5 grid-cols-1'
)


$c = $c.Replace(
'grid gap-5 xl:grid-cols-2 lg:grid-cols-2',
'grid gap-5 grid-cols-1'
)


# ===============================
# 2. HAPUS SPLIT HORIZONTAL LAMA
# ===============================

$c = $c.Replace(
'flex items-start justify-between gap-3',
'block'
)


$c = $c.Replace(
'flex justify-between gap-4',
'block'
)


# ===============================
# 3. RATAKAN CARD
# ===============================

$c = $c.Replace(
'items-center justify-center',
'items-start justify-start'
)


# ===============================
# 4. HILANGKAN BATAS LEBAR TENGAH
# ===============================

$c = $c.Replace(
'max-w-xl',
'w-full'
)


$c = $c.Replace(
'max-w-2xl',
'w-full'
)


# ===============================
# 5. BERSIHKAN SIMBOL RUSAK
# ===============================

$c = $c.Replace("â€”","-")
$c = $c.Replace("â€“","-")
$c = $c.Replace("Â·","·")
$c = $c.Replace("â†’","->")
$c = $c.Replace("â€¦","...")


Set-Content $file $c -Encoding UTF8


Write-Host "Source diperbaiki"
Write-Host "Build Vite..."


npm run build


if($LASTEXITCODE -ne 0){

    Write-Host "BUILD ERROR - ROLLBACK"

    Copy-Item $backup $file -Force

    exit 1
}


Write-Host ""
Write-Host "================================"
Write-Host "KELAS SAYA FINAL UI SELESAI"
Write-Host "================================"