# =========================================================
# SiPANDU Dynamic API Resolver Fix
# Safe wrapper migration
# =========================================================

Write-Host ""
Write-Host "==============================================="
Write-Host " SiPANDU API WRAPPER RESOLVER FIX"
Write-Host "==============================================="
Write-Host ""

$root = Get-Location
$js = Join-Path $root "resources\js"


if (!(Test-Path $js)) {
    Write-Host "ERROR: resources/js tidak ditemukan"
    exit
}


# =========================================================
# 1. Create resolver
# =========================================================

$utils = Join-Path $js "utils"

if (!(Test-Path $utils)) {
    New-Item -ItemType Directory $utils | Out-Null
}


$resolver = Join-Path $utils "sipandu-api.ts"


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
"@ | Set-Content $resolver -Encoding UTF8


Write-Host "Created resolver:"
Write-Host $resolver


# =========================================================
# 2. Target wrapper files
# =========================================================


$targets = @(
"class-quiz.tsx",
"classroom-discussion.tsx",
"classroom-v2.tsx",
"classroom.tsx",
"join-requests.ts",
"student-classroom.tsx"
)



foreach ($name in $targets) {


    $file = Join-Path $js $name


    if (!(Test-Path $file)) {
        Write-Host "SKIP:"
        Write-Host $file
        continue
    }


    $backup = "$file.before-api-wrapper-fix"


    if (!(Test-Path $backup)) {
        Copy-Item $file $backup
    }


    $content = Get-Content $file -Raw


    # tambah import jika belum ada

    if ($content -notmatch "sipandu-api") {

        $content =
        "import { sipanduUrl } from './utils/sipandu-api';`n" +
        $content

    }


    # hanya ubah wrapper
    $content =
    $content.Replace(
        "return fetch(path, {",
        "return fetch(sipanduUrl(path), {"
    )


    Set-Content `
        $file `
        $content `
        -Encoding UTF8


    Write-Host "Fixed:"
    Write-Host $name

}



# =========================================================
# 3. Check result
# =========================================================


Write-Host ""
Write-Host "Checking wrapper..."

Get-ChildItem $js -Recurse `
-Include *.tsx,*.ts |
Select-String "return fetch\(path" 



# =========================================================
# 4. Build
# =========================================================


Write-Host ""
Write-Host "Running npm build..."

npm run build


Write-Host ""
Write-Host "==============================================="
Write-Host " COMPLETE"
Write-Host "==============================================="

Write-Host ""
Write-Host "Backup:"
Write-Host "*.before-api-wrapper-fix"

Write-Host ""
Write-Host "Next:"
Write-Host "git status"