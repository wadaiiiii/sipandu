$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-kelas-final"

Write-Host "=== FINAL CLASS CARD UI ==="

if(!(Test-Path $backup)){
    Copy-Item $file $backup
}


$c=Get-Content $file -Raw -Encoding UTF8


# card header spacing
$c=$c.Replace(
'data-sipandu-class-head="true" className="block w-full"',
'data-sipandu-class-head="true" className="block w-full"
'
)


# toolbar lebih rapi
$c=$c.Replace(
'mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4',
'mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5'
)


# ubah jurnal menjadi rekap
$c=$c.Replace(
'Jurnal Kelas',
'Rekap Pembelajaran'
)


# kecilkan edit
$c=$c.Replace(
'>Edit</button>',
'>Edit</button>'
)


# bersihkan simbol umum
$c=$c.Replace(
[char]0x00E2 + [char]0x20AC + [char]0x201D,
'-'
)


Set-Content $file $c -Encoding UTF8


Write-Host "Build..."

npm run build


if($LASTEXITCODE -ne 0){

    Write-Host "BUILD ERROR - ROLLBACK"

    Copy-Item $backup $file -Force

    exit 1
}


Write-Host ""
Write-Host "SUCCESS"