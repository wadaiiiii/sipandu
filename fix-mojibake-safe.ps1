$file="resources/js/app.tsx"

Write-Host "Backup..."

Copy-Item $file "$file.before-mojibake-fix" -Force


$content = Get-Content $file -Raw -Encoding UTF8


# replace ellipsis rusak
$content = $content -replace "Memuat SiPANDUâ€¦","Memuat SiPANDU..."
$content = $content -replace "Memprosesâ€¦","Memproses..."
$content = $content -replace "'â€¦'","'...'"


# hapus karakter icon rusak saja
$content = $content -replace "âœŽ","Edit"
$content = $content -replace "ðŸ—‘","Hapus"


Set-Content $file $content -Encoding UTF8


Write-Host "SELESAI"

npm run build