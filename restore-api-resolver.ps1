Get-ChildItem resources/js -Recurse -Include *.before-api-resolver |
ForEach-Object {

    $original = $_.FullName -replace "\.before-api-resolver$",""

    Copy-Item $_.FullName $original -Force

    Write-Host "Restored:"
    Write-Host $original
}

Write-Host ""
Write-Host "RESTORE COMPLETE"