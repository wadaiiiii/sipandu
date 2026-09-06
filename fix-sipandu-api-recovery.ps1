Write-Host "======================================"
Write-Host " SIPANDU API RECOVERY"
Write-Host "======================================"

$ErrorActionPreference="Stop"


$backup="backup-api-recovery"

if(!(Test-Path $backup)){
    New-Item $backup -ItemType Directory | Out-Null
}


Write-Host ""
Write-Host "[1] BACKUP JS"

Copy-Item resources/js $backup -Recurse -Force



Write-Host ""
Write-Host "[2] SEARCH OLD API"


$files = Get-ChildItem resources/js -Recurse -File `
-Include *.ts,*.tsx,*.js


foreach($f in $files){

    $c = Get-Content $f.FullName -Raw

    if($c -match "sipandu-api"){

        Write-Host "FOUND:"
        Write-Host $f.FullName


        $c = $c.Replace(
        "sipandu-api",
        "api"
        )


        Set-Content `
        $f.FullName `
        $c `
        -Encoding UTF8
    }
}



Write-Host ""
Write-Host "[3] CHECK ENV"


if(Test-Path ".env"){

    $envContent = Get-Content .env -Raw

    if($envContent -match "sipandu-api"){

        $envContent=$envContent.Replace(
        "sipandu-api",
        "127.0.0.1:8000"
        )

        Set-Content .env $envContent -Encoding UTF8
    }
}



Write-Host ""
Write-Host "[4] CLEAR CACHE"


php artisan optimize:clear



Write-Host ""
Write-Host "[5] BUILD"


npm run build



if($LASTEXITCODE -ne 0){

    Write-Host ""
    Write-Host "BUILD FAILED"

    exit 1
}


Write-Host ""
Write-Host "======================================"
Write-Host " API RECOVERY COMPLETE"
Write-Host "======================================"
