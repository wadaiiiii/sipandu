Write-Host "================================"
Write-Host " REPAIR UTF-8 ENCODING"
Write-Host "================================"

$files = @(
    "resources/js/app.tsx",
    "resources/js/class-code-editor.ts",
    "resources/js/classroom-editor.ts",
    "resources/js/student-progress.tsx"
)

$utf8 = New-Object System.Text.UTF8Encoding($false)

foreach ($file in $files) {

    Write-Host "Fixing $file"

    $content = Get-Content $file -Raw

    [System.IO.File]::WriteAllText(
        $file,
        $content,
        $utf8
    )
}

Write-Host "================================"
Write-Host " DONE"
Write-Host "================================"