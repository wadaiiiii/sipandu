$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host " SIPANDU LIVE API FIX V2"
Write-Host " ROBUST PRODUCTION SUBDIRECTORY FIX"
Write-Host "=============================================="

$bridge = "resources\views\partials\api-prefix-bridge.blade.php"

if (!(Test-Path ".\artisan")) {
    throw "Jalankan dari ROOT project SiPANDU."
}

if (!(Test-Path $bridge)) {
    throw "File bridge tidak ditemukan."
}

Write-Host ""
Write-Host "[1] BACKUP"

$backup = "$bridge.before-live-api-v2"
Copy-Item $bridge $backup -Force

Write-Host "Backup:"
Write-Host $backup

Write-Host ""
Write-Host "[2] READ BRIDGE"

$content = Get-Content $bridge -Raw

if (!$content.Contains("@php")) {
    throw "Blok PHP bridge tidak ditemukan."
}

if (!$content.Contains("@endphp")) {
    throw "Penutup @endphp tidak ditemukan."
}

Write-Host "Bridge terbaca."

Write-Host ""
Write-Host "[3] REBUILD BASE PATH BLOCK"

$newPhpBlock = @'
@php
    /*
     * SiPANDU:
     *
     * LOCAL
     * /
     *
     * PRODUCTION
     * /akademik/sipandu
     *
     * LiteSpeed dapat melakukan rewrite sehingga
     * request()->getBaseUrl() tidak selalu berisi
     * subdirectory aplikasi.
     */

    $requestUri = (string) request()->getRequestUri();
    $requestPath = (string) parse_url($requestUri, PHP_URL_PATH);

    $configuredBasePath = trim(
        (string) config('sipandu.base_path', '')
    );

    $requestBasePath = trim(
        (string) request()->getBaseUrl()
    );

    if (
        str_starts_with(
            trim($requestPath, '/'),
            'akademik/sipandu'
        )
    ) {
        $sipanduBasePath = '/akademik/sipandu';
    } elseif ($requestBasePath !== '') {
        $sipanduBasePath = '/'.trim($requestBasePath, '/');
    } elseif ($configuredBasePath !== '') {
        $sipanduBasePath = '/'.trim($configuredBasePath, '/');
    } else {
        $sipanduBasePath = '';
    }

    if ($sipanduBasePath === '/') {
        $sipanduBasePath = '';
    }
@endphp
'@

$start = $content.IndexOf("@php")
$endMarker = "@endphp"
$end = $content.IndexOf($endMarker, $start)

if ($start -lt 0 -or $end -lt 0) {
    throw "Struktur @php/@endphp tidak valid."
}

$end = $end + $endMarker.Length

$content = $content.Substring(0, $start) +
           $newPhpBlock +
           $content.Substring($end)

[System.IO.File]::WriteAllText(
    (Resolve-Path $bridge),
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "Base path block berhasil diperbarui."

Write-Host ""
Write-Host "[4] VERIFY"

Get-Content $bridge |
    Select-String -Pattern `
    "requestUri|requestPath|akademik/sipandu|sipanduBasePath"

Write-Host ""
Write-Host "[5] TYPE CHECK"

npm run types:check

if ($LASTEXITCODE -ne 0) {
    throw "TYPE CHECK GAGAL."
}

Write-Host ""
Write-Host "[6] BUILD"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "BUILD GAGAL."
}

Write-Host ""
Write-Host "[7] GIT STATUS"

git status --short

Write-Host ""
Write-Host "[8] STAGE"

git add resources\views\partials\api-prefix-bridge.blade.php
git add public\build

Write-Host ""
Write-Host "[9] COMMIT"

if (!(git diff --cached --quiet)) {

    git commit -m "fix: resolve Sipandu live subdirectory API routing"

    if ($LASTEXITCODE -ne 0) {
        throw "COMMIT GAGAL."
    }

} else {

    Write-Host "Tidak ada perubahan untuk commit."

}

Write-Host ""
Write-Host "[10] FETCH"

git fetch origin

if ($LASTEXITCODE -ne 0) {
    throw "FETCH GAGAL."
}

Write-Host ""
Write-Host "[11] MERGE MAIN"

git checkout production

git merge origin/main --no-edit

if ($LASTEXITCODE -ne 0) {
    throw "MERGE CONFLICT. PUSH DIBATALKAN."
}

Write-Host ""
Write-Host "[12] PUSH"

git push origin production:main

if ($LASTEXITCODE -ne 0) {
    throw "PUSH GAGAL."
}

Write-Host ""
Write-Host "=============================================="
Write-Host " SELESAI"
Write-Host "=============================================="

Write-Host ""
Write-Host "Production API:"
Write-Host "https://matematika.unsulbar.ac.id/akademik/sipandu/sipandu-api/bootstrap"

Write-Host ""
Write-Host "Database LIVE tidak disentuh."

Write-Host ""
Write-Host "Setelah GitHub Actions selesai:"
Write-Host "1. Ctrl + Shift + R"
Write-Host "2. Login"
Write-Host "3. Buka Dashboard"
Write-Host "4. Cek Kelas"

Read-Host "Tekan ENTER"