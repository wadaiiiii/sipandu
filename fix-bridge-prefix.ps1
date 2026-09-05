$file="resources/views/partials/api-prefix-bridge.blade.php"

Copy-Item $file "$file.before-prefix2" -Force

$content = Get-Content $file -Raw

$content = $content -replace `
"window.sipanduUrl = function\(path\)\{", `
"window.sipanduUrl = function(value){"

$content = $content -replace `
"if\(typeof path !== 'string'\)\{", `
"if(typeof value !== 'string'){"

$content = $content -replace `
"return path;", `
"return value;"

$content = $content -replace `
"\n\s*const base = window.__SIPANDU_BASE_PATH__ \|\| '';", `
"`n    if(value.startsWith('/akademik/')){`n        return value;`n    }`n`n    const path = value;`n`n    const base = window.__SIPANDU_BASE_PATH__ || '';"

Set-Content $file $content -Encoding UTF8

Write-Host "Bridge prefix fixed"