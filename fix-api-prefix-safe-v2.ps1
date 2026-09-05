Write-Host "======================================"
Write-Host " SIPANDU API PREFIX SAFE MIGRATION V2"
Write-Host "======================================"


$files = @(
"resources/js/app.tsx",
"resources/js/classroom-v2.tsx",
"resources/js/classroom.tsx",
"resources/js/student-material-checklist.tsx",
"resources/js/student-progress.tsx",
"resources/js/join-requests.ts",
"resources/js/class-code-editor.ts",
"resources/js/classroom-editor.ts",
"resources/js/material-resources.ts",
"resources/js/assignment-deeplink.ts",
"resources/js/student-classroom-fastpath.ts",
"resources/js/student-classroom-ux.ts"
)


foreach($file in $files){

if(Test-Path $file){

Write-Host "PROCESS $file"

$content = Get-Content $file -Raw


# fetch string biasa
$content = $content.Replace(
"fetch('/sipandu-api",
"fetch(sipanduUrl('/sipandu-api"
)


# tutup hanya pattern sederhana
$content = $content -replace `
"fetch\(sipanduUrl\('(/sipandu-api[^']*)',", `
"fetch(sipanduUrl('$1'),"


# template literal
$content = $content.Replace(
"fetch(`/sipandu-api",
"fetch(sipanduUrl(`/sipandu-api"
)


$content = $content -replace `
"fetch\(sipanduUrl\(`(/sipandu-api[^`]*)`,", `
"fetch(sipanduUrl(`$1`),"


# api wrapper
$content = $content.Replace(
"api('/sipandu-api",
"api(sipanduUrl('/sipandu-api"
)

$content = $content -replace `
"api\(sipanduUrl\('(/sipandu-api[^']*)',", `
"api(sipanduUrl('$1'),"


$content = $content.Replace(
"api(`/sipandu-api",
"api(sipanduUrl(`/sipandu-api"
)


$content = $content -replace `
"api\(sipanduUrl\(`(/sipandu-api[^`]*)`,", `
"api(sipanduUrl(`$1`),"


Set-Content $file $content -Encoding UTF8

}

}


Write-Host ""
Write-Host "CHECK BUILD"

npm run build


Write-Host ""
Write-Host "FINISH"