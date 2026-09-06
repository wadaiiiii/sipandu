$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host " SIPANDU SOURCE AUDIT - READ ONLY"
Write-Host "=============================================="

$files = @(
    "resources/js/app.tsx",
    "resources/js/classroom-v2.tsx",
    "resources/js/class-quiz.tsx",
    "resources/js/student-classroom.tsx",
    "resources/js/quiz-entry.tsx"
)

foreach ($file in $files) {

    Write-Host ""
    Write-Host "=============================================="
    Write-Host "FILE: $file"
    Write-Host "=============================================="

    if (!(Test-Path $file)) {
        Write-Host "SKIP - file tidak ditemukan"
        continue
    }

    Write-Host ""
    Write-Host "[1] HARDCODED ROUTES"

    Select-String -Path $file `
        -Pattern '"/kelas/|''/kelas/|/sipandu-api/|window.location|location.href|href=' |
        Select-Object LineNumber, Line |
        Select-Object -First 100

    Write-Host ""
    Write-Host "[2] API / DASHBOARD / CLASS"

    Select-String -Path $file `
        -Pattern 'dashboard|classes|courseClass|courseClasses|classrooms|fetch|axios|sipanduUrl|sipandu-api' |
        Select-Object LineNumber, Line |
        Select-Object -First 120

    Write-Host ""
    Write-Host "[3] POSSIBLE ENCODING PROBLEM"

    $raw = Get-Content $file -Raw -Encoding UTF8

    $foundEncodingIssue = $false

    $patterns = @(
        [string][char]0x00C2,
        [string][char]0x00C3,
        [string][char]0x00E2,
        [string][char]0xFFFD
    )

    foreach ($pattern in $patterns) {

        if ($raw.Contains($pattern)) {

            $foundEncodingIssue = $true

            Write-Host "FOUND encoding marker in $file"

            $raw.Split([Environment]::NewLine) |
                Where-Object { $_.Contains($pattern) } |
                Select-Object -First 20
        }
    }

    if (!$foundEncodingIssue) {
        Write-Host "OK - tidak ditemukan marker encoding umum"
    }
}

Write-Host ""
Write-Host "=============================================="
Write-Host " BACKEND ROUTE AUDIT"
Write-Host "=============================================="

if (Test-Path "routes") {

    Get-ChildItem routes -Recurse -File |
        Select-String `
        -Pattern 'dashboard|classes|course-classes|classrooms|kelas|student' |
        Select-Object Path, LineNumber, Line |
        Select-Object -First 200
}

Write-Host ""
Write-Host "=============================================="
Write-Host " CONTROLLER / API AUDIT"
Write-Host "=============================================="

if (Test-Path "app") {

    Get-ChildItem app -Recurse -File |
        Select-String `
        -Pattern 'CourseClass|courseClasses|classes|Classroom|dashboard|kelas' |
        Select-Object Path, LineNumber, Line |
        Select-Object -First 250
}

Write-Host ""
Write-Host "=============================================="
Write-Host " CURRENT GIT DIFF"
Write-Host "=============================================="

git diff -- resources/js/app.tsx resources/js/classroom-v2.tsx

Write-Host ""
Write-Host "=============================================="
Write-Host " GIT STATUS"
Write-Host "=============================================="

git status --short

Write-Host ""
Write-Host "=============================================="
Write-Host " READ ONLY"
Write-Host " DATABASE TIDAK DISENTUH"
Write-Host " TIDAK ADA PATCH"
Write-Host " TIDAK ADA COMMIT"
Write-Host " TIDAK ADA PUSH"
Write-Host "=============================================="
