Write-Host "======================================"
Write-Host " SIPANDU SAFE API PREFIX FIX"
Write-Host "======================================"


$targets = @(
"resources/js/app.tsx",
"resources/js/student-progress.tsx",
"resources/js/student-material-checklist.tsx"
)


foreach ($file in $targets){

    Write-Host "PROCESS:" $file

    $content = Get-Content $file -Raw


    if ($content -notmatch "sipandu-api')") {

        $content = $content.Replace(
"fetch('/sipandu-api/",
"fetch(sipanduUrl('/sipandu-api/"
)

        $content = $content.Replace(
"loadJson<BootstrapPayload>('/sipandu-api/",
"loadJson<BootstrapPayload>(sipanduUrl('/sipandu-api/"
)

        # tutup wrapper fetch khusus
        $content = $content.Replace(
"credentials:'include' });",
"credentials:'include' });"
)

    }


    Set-Content `
    -Path $file `
    -Value $content `
    -Encoding UTF8

}


Write-Host ""
Write-Host "CHECK IMPORT"

foreach($file in $targets){

$content = Get-Content $file -Raw

if(
$content -match "sipanduUrl" -and
$content -notmatch "import \{ sipanduUrl")
{
$content =
"import { sipanduUrl } from './utils/sipandu-api';`r`n" +
$content

Set-Content $file $content -Encoding UTF8
}

}


Write-Host ""
Write-Host "BUILD"

npm run build


Write-Host ""
Write-Host "FINISH"