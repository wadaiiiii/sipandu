Write-Host "================================="
Write-Host " SIPANDU CLASS API PREFIX FIX"
Write-Host "================================="


$app="resources/js"


Write-Host ""
Write-Host "[1] Backup JS"

Copy-Item `
$app `
"resources/js.backup-api-class-fix" `
-Recurse `
-Force



Write-Host ""
Write-Host "[2] Replace API prefix"


Get-ChildItem `
resources/js `
-Recurse `
-Include *.ts,*.tsx,*.js `
| ForEach-Object {


    $file=$_.FullName

    $content=Get-Content $file -Raw


    $old=$content


    $content=$content.Replace(
    "/api/classes/",
    "/sipandu-api/classes/"
    )


    $content=$content.Replace(
    "'/api/",
    "'/sipandu-api/"
    )


    $content=$content.Replace(
    '"/api/',
    '"/sipandu-api/'
    )


    if($content -ne $old){

        Set-Content `
        $file `
        $content `
        -Encoding UTF8

        Write-Host "UPDATED:" $file
    }

}



Write-Host ""
Write-Host "[3] Clear Laravel"

php artisan optimize:clear



Write-Host ""
Write-Host "[4] Build"

npm run build


Write-Host ""
Write-Host "================================="
Write-Host " FINISHED"
Write-Host "================================="