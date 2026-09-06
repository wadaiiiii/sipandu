@'
$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host " SIPANDU UI FINAL FIX"
Write-Host "=============================================="

$files = @(
    "resources/js/app.tsx",
    "resources/js/classroom-v2.tsx"
)

foreach ($file in $files) {

    if (!(Test-Path $file)) {
        Write-Host "SKIP - File tidak ditemukan: $file"
        continue
    }

    $backup = "$file.before-ui-final"

    if (!(Test-Path $backup)) {
        Copy-Item $file $backup -Force
        Write-Host "BACKUP: $backup"
    }

    $c = Get-Content $file -Raw -Encoding UTF8

    Write-Host ""
    Write-Host "PATCH: $file"

    # ==========================================================
    # 1. NORMALISASI ENCODING
    # ==========================================================

    $c = $c.Replace([string][char]0xFFFD, "")

    $c = $c.Replace([string][char]0x2014, "-")
    $c = $c.Replace([string][char]0x2013, "-")
    $c = $c.Replace([string][char]0x2018, "'")
    $c = $c.Replace([string][char]0x2019, "'")
    $c = $c.Replace([string][char]0x201C, '"')
    $c = $c.Replace([string][char]0x201D, '"')
    $c = $c.Replace([string][char]0x2026, "...")

    # ==========================================================
    # 2. NAVIGASI KUIS
    # ==========================================================

    if ($file -eq "resources/js/classroom-v2.tsx") {

        $c = $c.Replace(
            'window.location.href = "/kelas/"',
            'window.location.href = "/akademik/sipandu/kelas/"'
        )

        $c = $c.Replace(
            "window.location.href='/kelas/'",
            "window.location.href='/akademik/sipandu/kelas/'"
        )

        $c = $c.Replace(
            'href="/kelas/"',
            'href="/akademik/sipandu/kelas/"'
        )

        $c = $c.Replace(
            "href='/kelas/'",
            "href='/akademik/sipandu/kelas/'"
        )

        Write-Host "  OK - Navigasi kelas diperiksa"
    }

    # ==========================================================
    # 3. API PARTICIPANTS
    # ==========================================================

    if ($file -eq "resources/js/classroom-v2.tsx") {

        $c = $c.Replace(
            'fetch(`/sipandu-api/',
            'fetch(sipanduUrl(`/sipandu-api/'
        )

        Write-Host "  OK - API base path diperiksa"
    }

    # ==========================================================
    # 4. SIMPAN SOURCE
    # ==========================================================

    Set-Content -Path $file -Value $c -Encoding UTF8

    Write-Host "  OK - Updated: $file"
}

Write-Host ""
Write-Host "=============================================="
Write-Host " TYPESCRIPT CHECK"
Write-Host "=============================================="

npm run types:check

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "TYPESCRIPT ERROR"
    Write-Host "ROLLBACK"

    foreach ($file in $files) {

        $backup = "$file.before-ui-final"

        if (Test-Path $backup) {
            Copy-Item $backup $file -Force
            Write-Host "Rollback: $file"
        }
    }

    exit 1
}

Write-Host ""
Write-Host "=============================================="
Write-Host " VITE BUILD"
Write-Host "=============================================="

npm run build

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "BUILD ERROR"
    Write-Host "ROLLBACK"

    foreach ($file in $files) {

        $backup = "$file.before-ui-final"

        if (Test-Path $backup) {
            Copy-Item $backup $file -Force
            Write-Host "Rollback: $file"
        }
    }

    exit 1
}

Write-Host ""
Write-Host "=============================================="
Write-Host " SIPANDU UI FINAL FIX BERHASIL"
Write-Host "=============================================="

Write-Host ""
Write-Host "GIT STATUS"
git status --short

Write-Host ""
Write-Host "DIFF STAT"
git diff --stat
'@ | Set-Content -Path .\fix-sipandu-ui-final.ps1 -Encoding UTF8