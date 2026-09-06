Write-Host "=============================================="
Write-Host " SIPANDU FINAL RECOVERY SCRIPT"
Write-Host " Login + API + Storage + Build"
Write-Host "=============================================="

$ErrorActionPreference="Stop"


# ==============================
# CHECK PROJECT
# ==============================

if(!(Test-Path "artisan")){
    Write-Host "ERROR: bukan folder Laravel"
    exit 1
}


Write-Host ""
Write-Host "[1] Backup"


$backup="backup-recovery-$(Get-Date -Format yyyyMMdd-HHmmss)"


mkdir $backup | Out-Null


Copy-Item `
resources/views `
$backup/views `
-Recurse `
-Force


Copy-Item `
resources/js `
$backup/js `
-Recurse `
-Force



# ==============================
# STORAGE
# ==============================

Write-Host ""
Write-Host "[2] Laravel Storage"


php artisan storage:link



# ==============================
# CREATE FOLDER
# ==============================

Write-Host ""
Write-Host "[3] Create upload folders"


$folders=@(
"storage/app/public",
"storage/app/public/uploads",
"storage/app/public/materials",
"storage/app/public/files",
"storage/app/public/documents"
)


foreach($f in $folders){

    if(!(Test-Path $f)){
        mkdir $f | Out-Null
        Write-Host "CREATE $f"
    }

}



# ==============================
# ENV CHECK
# ==============================

Write-Host ""
Write-Host "[4] Check filesystem"


if(Test-Path ".env"){

    $env=Get-Content ".env" -Raw


    if($env -notmatch "FILESYSTEM_DISK=public"){

        Add-Content ".env" "`nFILESYSTEM_DISK=public"

        Write-Host "Added FILESYSTEM_DISK=public"

    }

}



# ==============================
# CLEAR CACHE
# ==============================

Write-Host ""
Write-Host "[5] Clear Laravel Cache"


php artisan optimize:clear



# ==============================
# ROUTE CHECK
# ==============================

Write-Host ""
Write-Host "[6] API Route Check"


php artisan route:list | findstr sipandu-api



# ==============================
# BUILD FRONTEND
# ==============================

Write-Host ""
Write-Host "[7] Build Frontend"


npm run build


if($LASTEXITCODE -ne 0){

    Write-Host ""
    Write-Host "BUILD FAILED"
    exit 1

}



# ==============================
# DONE
# ==============================


Write-Host ""
Write-Host "=============================================="
Write-Host " SIPANDU RECOVERY COMPLETE"
Write-Host "=============================================="

Write-Host ""

Write-Host "NEXT:"
Write-Host "php artisan serve"

Write-Host ""

Write-Host "TEST:"
Write-Host "http://127.0.0.1:8000"
