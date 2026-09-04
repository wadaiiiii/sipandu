$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-force-left"

if(!(Test-Path $backup)){
    Copy-Item $file $backup
}


$c=Get-Content $file -Raw -Encoding UTF8


# paksa artikel full width
$c=$c.Replace(
'rounded-3xl border border-slate-200 bg-white shadow-sm',
'rounded-3xl border border-slate-200 bg-white shadow-sm w-full'
)


# hapus kemungkinan flex kanan-kiri
$c=$c.Replace(
'flex items-start justify-between',
'block'
)

$c=$c.Replace(
'flex items-center justify-between',
'flex items-center'
)


# judul rata kiri
$c=$c.Replace(
'text-center',
'text-left'
)


# hilangkan margin kiri otomatis
$c=$c.Replace(
'ml-auto',
''
)


# paksa toolbar kiri
$c=$c.Replace(
'justify-end',
'justify-start'
)


Set-Content $file $c -Encoding UTF8


npm run build


if($LASTEXITCODE -ne 0){
    Copy-Item $backup $file -Force
    exit 1
}


Write-Host "FORCE LEFT DONE"