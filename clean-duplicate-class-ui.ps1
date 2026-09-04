$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-clean-duplicate"

Write-Host "=== CLEAN DUPLICATE CLASS UI ==="

if(!(Test-Path $backup)){
    Copy-Item $file $backup
}


$content = Get-Content $file -Raw -Encoding UTF8


# hapus fungsi CompactClassCard lama yang tersisa sebelum fungsi terakhir
$matches = [regex]::Matches(
    $content,
    "function CompactClassCard"
)


if($matches.Count -gt 1){

    Write-Host "Ditemukan CompactClassCard:"
    Write-Host $matches.Count

    $first = $matches[0].Index
    $second = $matches[1].Index


    $before = $content.Substring(0,$first)

    $after = $content.Substring($second)

    $content = $before + $after

}


# bersihkan simbol encoding umum
$content=$content.Replace("â€”","-")
$content=$content.Replace("â€“","-")
$content=$content.Replace("Â·","·")
$content=$content.Replace("â†’","→")
$content=$content.Replace("â€¦","...")


Set-Content $file $content -Encoding UTF8


Write-Host "Clean selesai"

npm run build


if($LASTEXITCODE -ne 0){

    Write-Host "BUILD ERROR - ROLLBACK"

    Copy-Item $backup $file -Force

    exit 1
}


Write-Host "SUCCESS"