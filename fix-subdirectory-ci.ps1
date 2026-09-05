Write-Host "====================================="
Write-Host " SiPANDU CI SUBDIRECTORY FIX"
Write-Host "====================================="

$root = Get-Location

# ==============================
# BACKUP
# ==============================

Write-Host ""
Write-Host "[1] Backup file..."

Copy-Item `
resources/views/partials/api-prefix-bridge.blade.php `
resources/views/partials/api-prefix-bridge.blade.php.before-ci-fix `
-Force

Copy-Item `
config/sipandu.php `
config/sipandu.php.before-ci-fix `
-Force


# ==============================
# FIX API PREFIX BRIDGE
# ==============================

Write-Host ""
Write-Host "[2] Fix api-prefix-bridge..."

$file = "resources/views/partials/api-prefix-bridge.blade.php"

$content = Get-Content $file -Raw

if ($content -notmatch "sipandu-api") {

    $content = $content -replace `
    "window.__SIPANDU_BASE_PATH__ = @json\(\$sipanduBasePath\);",
    "window.__SIPANDU_API_PREFIX__ = '/sipandu-api/';`r`n`r`nwindow.__SIPANDU_BASE_PATH__ = @json(`$sipanduBasePath);"

    Set-Content `
    $file `
    $content `
    -Encoding UTF8

    Write-Host "API prefix added"

}
else {

    Write-Host "API prefix already exists"

}


# ==============================
# FIX CONFIG
# ==============================

Write-Host ""
Write-Host "[3] Fix config/sipandu.php..."

$config = "config/sipandu.php"

$content = Get-Content $config -Raw


if ($content -notmatch "auto_schema_sync") {

$content = $content -replace `
"'base_path' => env\('SIPANDU_BASE_PATH', ''\),",
"'base_path' => env('SIPANDU_BASE_PATH', ''),`r`n`r`n    'auto_schema_sync' => env('SIPANDU_AUTO_SCHEMA_SYNC', false),"

Set-Content `
$config `
$content `
-Encoding UTF8


Write-Host "auto_schema_sync added"

}
else {

Write-Host "auto_schema_sync already exists"

}


# ==============================
# SHOW TEST CASE
# ==============================

Write-Host ""
Write-Host "[4] Checking tests/TestCase.php"

if(Test-Path tests/TestCase.php){

Get-Content tests/TestCase.php

}
else {

Write-Host "tests/TestCase.php not found"

}


# ==============================
# CACHE CLEAR
# ==============================

Write-Host ""
Write-Host "[5] Clear Laravel cache"

php artisan optimize:clear


# ==============================
# TEST
# ==============================

Write-Host ""
Write-Host "====================================="
Write-Host " TEST SUBDIRECTORY HOSTING"
Write-Host "====================================="

php artisan test --filter=SubdirectoryHostingTest


Write-Host ""
Write-Host "====================================="
Write-Host " TEST SUBDIRECTORY UI"
Write-Host "====================================="

php artisan test --filter=SubdirectoryUiParityTest


Write-Host ""
Write-Host "====================================="
Write-Host " COMPLETE"
Write-Host "====================================="