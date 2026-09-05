$files = @(
"resources/js/assessment-center.tsx",
"resources/js/class-access-panel.tsx",
"resources/js/lecturer-join-dashboard.ts",
"resources/js/subdirectory-class-code-compat.ts",
"resources/js/users.tsx"
)

foreach ($file in $files) {

    if (Test-Path $file) {

        Copy-Item $file "$file.before-phase22" -Force

        $content = Get-Content $file -Raw


        if ($content -notmatch "sipandu-api") {
            continue
        }


        if ($content -notmatch "sipanduUrl") {

            $content =
            "import { sipanduUrl } from './utils/sipandu-api';`n" +
            $content

        }


        $content =
        $content -replace `
        "fetch\('/sipandu-api/([^']+)'\s*,", `
        "fetch(sipanduUrl('/sipandu-api/`$1'),"


        Set-Content $file $content -Encoding UTF8

        Write-Host "Fixed $file"
    }
}