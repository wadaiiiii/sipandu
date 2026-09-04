$ErrorActionPreference="Stop"

Write-Host "=== SIPANDU CLASS UI PATCH ==="

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-toolbar-ui"

if(!(Test-Path $backup)){
    Copy-Item $file $backup
    Write-Host "Backup created"
}

$content = Get-Content $file -Raw -Encoding UTF8


# Toolbar spacing
$content = $content -replace `
'flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5', `
'flex flex-wrap items-center justify-start gap-2 border-t border-slate-100 pt-5'


# Rename button label
$content = $content.Replace(
'Edit nama kelas',
'Edit'
)


# Remove truncate title
$content = $content.Replace(
'truncate',
''
)


Set-Content `
$file `
$content `
-Encoding UTF8


Write-Host "Source updated"
Write-Host "Running build..."


npm run build


if($LASTEXITCODE -ne 0){

    Write-Host "BUILD FAILED - RESTORE BACKUP"

    Copy-Item `
    $backup `
    $file `
    -Force

    exit 1
}


Write-Host ""
Write-Host "================================"
Write-Host "CLASS UI PATCH SUCCESS"
Write-Host "================================"