Write-Host "======================================"
Write-Host " SIPANDU API PREFIX FINAL MIGRATION"
Write-Host "======================================"

$files = Get-ChildItem resources/js -Recurse -Include *.ts,*.tsx


foreach($file in $files){

    if($file.Name -like "*.before-*") {continue}
    if($file.Name -like "*.backup*") {continue}
    if($file.Name -like "*.safe-*") {continue}


    $path = $file.FullName
    $content = Get-Content $path -Raw


    if($content -match "/sipandu-api"){

        Write-Host "CHECK $($file.Name)"

        # hanya file yang belum menggunakan wrapper
        if($content -notmatch "import\s+\{\s*sipanduUrl\s*\}"){

            Write-Host " ADD IMPORT $($file.Name)"

            if($file.Extension -eq ".tsx" -or $file.Extension -eq ".ts"){

                $content = "import { sipanduUrl } from './utils/sipandu-api';`n" + $content

            }
        }


        # fetch langsung
        $content = $content -replace `
        "fetch\('/sipandu-api", `
        "fetch(sipanduUrl('/sipandu-api"


        $content = $content -replace `
        'fetch\(`/sipandu-api', `
        'fetch(sipanduUrl(`/sipandu-api'


        # api wrapper
        $content = $content -replace `
        "api\('/sipandu-api", `
        "api(sipanduUrl('/sipandu-api"


        $content = $content -replace `
        'api\(`/sipandu-api', `
        'api(sipanduUrl(`/sipandu-api'


        Set-Content $path $content -Encoding UTF8
    }
}


Write-Host ""
Write-Host "BUILD FRONTEND"
npm run build


Write-Host ""
Write-Host "DONE"