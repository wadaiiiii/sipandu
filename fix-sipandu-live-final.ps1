$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host " SIPANDU FINAL LIVE API FIX"
Write-Host "=============================================="

$bridge = "resources\views\partials\api-prefix-bridge.blade.php"

if (!(Test-Path ".\artisan")) {
    throw "ERROR: Jalankan dari ROOT repository SiPANDU."
}

if (!(Test-Path $bridge)) {
    throw "ERROR: api-prefix-bridge.blade.php tidak ditemukan."
}

Write-Host ""
Write-Host "[1] BACKUP BRIDGE"
Copy-Item $bridge "$bridge.before-final-live-fix" -Force

Write-Host ""
Write-Host "[2] PATCH BASE PATH"

$content = Get-Content $bridge -Raw

$old = @"
    $requestBasePath = trim((string) request()->getBaseUrl());
    $configuredBasePath = trim((string) config('sipandu.base_path', ''));
    $sipanduBasePath = $requestBasePath !== '' ? $requestBasePath : $configuredBasePath;
    $sipanduBasePath = $sipanduBasePath === '/' ? '' : '/'.trim($sipanduBasePath, '/');
"@

$new = @"
    /*
     * SiPANDU production berada di /akademik/sipandu.
     * LiteSpeed dapat membuat getBaseUrl() kosong setelah rewrite.
     */
    $requestUriPath = trim(
        (string) parse_url(request()->getRequestUri(), PHP_URL_PATH),
        '/'
    );

    $requestBasePath = trim((string) request()->getBaseUrl());
    $configuredBasePath = trim((string) config('sipandu.base_path', ''));

    if (str_starts_with($requestUriPath, 'akademik/sipandu')) {
        $sipanduBasePath = '/akademik/sipandu';
    } else {
        $sipanduBasePath = $requestBasePath !== ''
            ? $requestBasePath
            : $configuredBasePath;
    }

    $sipanduBasePath = $sipanduBasePath === '/'
        ? ''
        : '/'.trim($sipanduBasePath, '/');
"@

if (!$content.Contains($old)) {
    throw "ERROR: Pola source lama tidak ditemukan. PATCH DIBATALKAN."
}

$content = $content.Replace($old, $new)

[System.IO.File]::WriteAllText(
    (Resolve-Path $bridge),
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "PATCH BERHASIL"

Write-Host ""
Write-Host "[3] VERIFY SOURCE"

Get-Content $bridge |
    Select-String -Pattern "requestUriPath|akademik/sipandu|sipanduBasePath"

Write-Host ""
Write-Host "[4] TYPE CHECK"

npm run types:check

if ($LASTEXITCODE -ne 0) {
    throw "TYPE CHECK GAGAL."
}

Write-Host ""
Write-Host "[5] BUILD"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "BUILD GAGAL."
}

Write-Host ""
Write-Host "[6] GIT STATUS"

git status --short

Write-Host ""
Write-Host "[7] STAGE"

git add resources\views\partials\api-prefix-bridge.blade.php
git add public\build

Write-Host ""
Write-Host "[8] COMMIT"

if (!(git diff --cached --quiet)) {

    git commit -m "fix: resolve Sipandu production API base path"

    if ($LASTEXITCODE -ne 0) {
        throw "COMMIT GAGAL."
    }

} else {

    Write-Host "Tidak ada perubahan baru."

}

Write-Host ""
Write-Host "[9] FETCH MAIN"

git fetch origin

Write-Host ""
Write-Host "[10] MERGE MAIN -> PRODUCTION"

git checkout production

git merge origin/main --no-edit

if ($LASTEXITCODE -ne 0) {
    throw "MERGE GAGAL. PUSH DIBATALKAN."
}

Write-Host ""
Write-Host "[11] PUSH PRODUCTION -> MAIN"

git push origin production:main

if ($LASTEXITCODE -ne 0) {
    throw "PUSH GAGAL."
}

Write-Host ""
Write-Host "=============================================="
Write-Host " DEPLOYMENT TRIGGERED"
Write-Host "=============================================="

Write-Host ""
Write-Host "TARGET API:"
Write-Host "/akademik/sipandu/sipandu-api/bootstrap"

Write-Host ""
Write-Host "DATABASE LIVE TIDAK DISENTUH."

Write-Host ""
Write-Host "Setelah GitHub Actions HIJAU:"
Write-Host "Ctrl + Shift + R"
Write-Host "Login kembali."
Write-Host "Cek Kelas Saya."

Read-Host "Tekan ENTER untuk selesai"