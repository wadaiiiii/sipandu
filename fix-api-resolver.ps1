# =====================================================
# SiPANDU API Resolver Migration
# Safe automatic patch
# =====================================================

Write-Host ""
Write-Host "==============================================="
Write-Host " SiPANDU API RESOLVER FIX"
Write-Host "==============================================="
Write-Host ""

$root = Get-Location
$jsPath = Join-Path $root "resources\js"

if (!(Test-Path $jsPath)) {
    Write-Host "ERROR: resources/js tidak ditemukan"
    exit
}

# -----------------------------------------------------
# Create utility
# -----------------------------------------------------

$utilPath = Join-Path $jsPath "utils"

if (!(Test-Path $utilPath)) {
    New-Item -ItemType Directory -Path $utilPath | Out-Null
}

$apiFile = Join-Path $utilPath "sipandu-api.ts"

if (!(Test-Path $apiFile)) {

@"
export function sipanduUrl(path: string): string {
    const base =
        document
            .querySelector<HTMLMetaElement>('meta[name="app-base-path"]')
            ?.content || '';

    if (!path.startsWith('/')) {
        return path;
    }

    return `${base}${path}`;
}
"@ | Set-Content $apiFile -Encoding UTF8

    Write-Host "Created:"
    Write-Host $apiFile
}


# -----------------------------------------------------
# Target files
# -----------------------------------------------------

$files = Get-ChildItem $jsPath -Recurse `
-Include *.tsx,*.ts `
-File


foreach ($file in $files) {

    $content = Get-Content $file.FullName -Raw

    if ($content -match "/sipandu-api/") {

        $backup = $file.FullName + ".before-api-resolver"

        if (!(Test-Path $backup)) {
            Copy-Item $file.FullName $backup
        }


        # tambah import jika belum ada
        if ($content -notmatch "sipanduUrl") {

            $relative =
                "./utils/sipandu-api"

            $content =
            "import { sipanduUrl } from '$relative';`n" + $content
        }


        # replace fetch langsung
        $content =
        $content.Replace(
            "fetch('/sipandu-api/",
            "fetch(sipanduUrl('/sipandu-api/"
        )


        # replace template literal fetch
        $content =
        $content.Replace(
            "fetch(`/sipandu-api/",
            "fetch(sipanduUrl(`/sipandu-api/"
        )


        Set-Content `
            $file.FullName `
            $content `
            -Encoding UTF8


        Write-Host "Fixed:"
        Write-Host $file.FullName
    }
}


Write-Host ""
Write-Host "==============================================="
Write-Host " API RESOLVER PATCH COMPLETE"
Write-Host "==============================================="
Write-Host ""

Write-Host "Backup dibuat:"
Write-Host "*.before-api-resolver"

Write-Host ""
Write-Host "Next:"
Write-Host "npm run build"