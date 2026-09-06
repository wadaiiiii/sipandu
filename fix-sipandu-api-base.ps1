Write-Host "================================"
Write-Host " FIX SIPANDU API BASE URL"
Write-Host "================================"


$files = Get-ChildItem resources/js -Recurse -Include *.ts,*.tsx,*.js


foreach($file in $files){

    Write-Host "Checking:" $file.FullName


    $content = Get-Content $file.FullName -Raw -Encoding UTF8


    # hostname lama
    $content = $content -replace "https?://sipandu-api","/api"

    # relative lama
    $content = $content -replace "sipandu-api/","/api/"

    # hapus double slash
    $content = $content -replace "//api/","/api/"


    Set-Content `
    -Path $file.FullName `
    -Value $content `
    -Encoding UTF8

}


Write-Host ""
Write-Host "CLEAR CACHE"

php artisan optimize:clear


Write-Host ""
Write-Host "BUILD"

npm run build


if($LASTEXITCODE -ne 0){

    Write-Host "BUILD FAILED"
    exit 1

}


Write-Host ""
Write-Host "================================"
Write-Host " SIPANDU API FIX COMPLETE"
Write-Host "================================"