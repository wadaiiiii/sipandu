$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host " SIPANDU SOURCE ↔ BUILD ↔ DEPLOY AUDIT"
Write-Host "=============================================="

$root = Get-Location

Write-Host ""
Write-Host "[1] PROJECT"
Write-Host "----------------------------------------------"
Write-Host $root

Write-Host ""
Write-Host "[2] GIT HEAD"
Write-Host "----------------------------------------------"
git rev-parse HEAD
git log -1 --oneline

Write-Host ""
Write-Host "[3] SOURCE FILES"
Write-Host "----------------------------------------------"

$files = @(
    "resources/js/app.tsx",
    "resources/js/classroom-v2.tsx",
    "resources/js/utils/sipandu-api.ts",
    "resources/views/app.blade.php",
    "resources/views/partials/api-prefix-bridge.blade.php",
    "routes/web.php"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $item = Get-Item $file
        Write-Host ("OK  {0} | {1} bytes | {2}" -f $file,$item.Length,$item.LastWriteTime)
    } else {
        Write-Host ("MISS {0}" -f $file)
    }
}

Write-Host ""
Write-Host "[4] NAVIGASI KEMBALI KUIS"
Write-Host "----------------------------------------------"

Get-ChildItem resources/js -Recurse -File |
    Select-String -Pattern "/kelas/|window.location|location.href|history.back|detail_url|backUrl|returnUrl" |
    Select-Object Path,LineNumber,Line |
    Format-Table -AutoSize

Write-Host ""
Write-Host "[5] API DASHBOARD / CLASS"
Write-Host "----------------------------------------------"

Get-ChildItem resources/js -Recurse -File |
    Select-String -Pattern "sipandu-api|loadDashboard|loadClasses|/dashboard|/classes" |
    Select-Object Path,LineNumber,Line |
    Format-Table -AutoSize

Write-Host ""
Write-Host "[6] BASE PATH"
Write-Host "----------------------------------------------"

Get-ChildItem resources -Recurse -File |
    Select-String -Pattern "SIPANDU_BASE_PATH|sipanduUrl|akademik/sipandu" |
    Select-Object Path,LineNumber,Line |
    Format-Table -AutoSize

Write-Host ""
Write-Host "[7] VITE MANIFEST"
Write-Host "----------------------------------------------"

if (Test-Path "public/build/manifest.json") {
    $manifest = Get-Content "public/build/manifest.json" -Raw
    Write-Host "manifest.json OK"

    $manifest |
        Select-String -Pattern "app.tsx|classroom-v2.tsx|app-[^`""]+\.js|classroom-v2-[^`""]+\.js"
} else {
    Write-Host "MANIFEST TIDAK ADA"
}

Write-Host ""
Write-Host "[8] BUILD ASSETS"
Write-Host "----------------------------------------------"

if (Test-Path "public/build/assets") {
    Get-ChildItem public/build/assets -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 30 Name,Length,LastWriteTime |
        Format-Table -AutoSize
} else {
    Write-Host "BUILD ASSETS TIDAK ADA"
}

Write-Host ""
Write-Host "[9] STRING SALAH NAVIGASI DI BUILD"
Write-Host "----------------------------------------------"

if (Test-Path "public/build/assets") {
    Get-ChildItem public/build/assets -File |
        Select-String -Pattern "/kelas/|matematika.unsulbar.ac.id/kelas|location.href" |
        Select-Object Path,LineNumber,Line |
        Format-Table -AutoSize
}

Write-Host ""
Write-Host "[10] STRING ENCODING RUSAK DI SOURCE"
Write-Host "----------------------------------------------"

Get-ChildItem resources -Recurse -File |
    Select-String -Pattern "â€”|â€“|â€¦|â†’|Ã¢|Â·" |
    Select-Object Path,LineNumber,Line |
    Format-Table -AutoSize

Write-Host ""
Write-Host "[11] SOURCE vs BUILD TIMESTAMP"
Write-Host "----------------------------------------------"

foreach ($file in @(
    "resources/js/app.tsx",
    "resources/js/classroom-v2.tsx",
    "public/build/manifest.json"
)) {
    if (Test-Path $file) {
        $i = Get-Item $file
        Write-Host ("{0} -> {1}" -f $file,$i.LastWriteTime)
    }
}

Write-Host ""
Write-Host "=============================================="
Write-Host " AUDIT SELESAI - READ ONLY"
Write-Host " TIDAK ADA FILE YANG DIUBAH"
Write-Host " TIDAK ADA DATABASE YANG DISENTUH"
Write-Host "=============================================="
