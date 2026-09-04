Write-Host "FIX APP.TSX HEADER"

$file="resources/js/app.tsx"

if(!(Test-Path $file)){
    Write-Host "File tidak ditemukan"
    exit
}

$content = Get-Content $file -Raw -Encoding UTF8


# hapus BOM
$content = $content.TrimStart([char]0xFEFF)


# perbaiki import pertama
$content = $content -replace "^mport","import"


Set-Content `
    -Path $file `
    -Value $content `
    -Encoding UTF8


Write-Host "HEADER FIXED"

npm run build