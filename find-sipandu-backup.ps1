Write-Host "=============================================="
Write-Host " SEARCH SIPANDU DATABASE BACKUP"
Write-Host "=============================================="

$drives = Get-PSDrive -PSProvider FileSystem


foreach ($drive in $drives) {

    Write-Host ""
    Write-Host "Searching drive:" $drive.Root

    Get-ChildItem `
    -Path $drive.Root `
    -Include "*sipandu*.sql","*.sql" `
    -File `
    -Recurse `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -match "sipandu|backup|live"
    } |
    Select-Object FullName, Length, LastWriteTime

}


Write-Host ""
Write-Host "=============================================="
Write-Host " SEARCH SELESAI"
Write-Host "=============================================="

pause