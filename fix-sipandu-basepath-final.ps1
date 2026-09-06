Write-Host "=============================================="
Write-Host " SIPANDU BASE PATH FINAL RECOVERY"
Write-Host " Local + cPanel Compatible"
Write-Host "=============================================="

$ErrorActionPreference="Stop"


# ======================================
# BACKUP
# ======================================

Write-Host ""
Write-Host "[1] Backup"

$backup="backup-basepath-final"

if(!(Test-Path $backup)){
    mkdir $backup | Out-Null
}


if(Test-Path "resources/views/partials/api-prefix-bridge.blade.php"){
    Copy-Item `
    "resources/views/partials/api-prefix-bridge.blade.php" `
    "$backup/api-prefix-bridge.blade.php" `
    -Force
}


# ======================================
# CONFIG SIPANDU
# ======================================

Write-Host ""
Write-Host "[2] Create config/sipandu.php"


$configPath="config/sipandu.php"


$config=@'
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Dynamic Base Path SiPANDU
    |--------------------------------------------------------------------------
    */

    'base_path' => env('SIPANDU_BASE_PATH', ''),

];
'@


Set-Content `
$configPath `
$config `
-Encoding UTF8



# ======================================
# BLADE RESOLVER
# ======================================

Write-Host ""
Write-Host "[3] Update API Prefix Bridge"


$bladePath="resources/views/partials/api-prefix-bridge.blade.php"


$blade=@'
@php
    $requestBasePath = trim((string) request()->getBaseUrl(), '/');
    $configuredBasePath = trim((string) config('sipandu.base_path', ''), '/');

    $sipanduBasePath = $requestBasePath !== ''
        ? $requestBasePath
        : $configuredBasePath;

    $sipanduBasePath = $sipanduBasePath !== ''
        ? '/'.$sipanduBasePath
        : '';
@endphp


<meta name="app-base-path" content="{{ $sipanduBasePath }}">


<script>

window.__SIPANDU_BASE_PATH__ = @json($sipanduBasePath);


window.sipanduUrl = function(path){

    if(typeof path !== 'string'){
        return path;
    }


    if(!path.startsWith('/')){
        return path;
    }


    const base = window.__SIPANDU_BASE_PATH__ || '';


    if(!base){
        return path;
    }


    if(path === base || path.startsWith(base+'/')){
        return path;
    }


    return base + path;

};

</script>
'@


Set-Content `
$bladePath `
$blade `
-Encoding UTF8



# ======================================
# CLEAR CACHE
# ======================================

Write-Host ""
Write-Host "[4] Laravel Clear"

php artisan optimize:clear



# ======================================
# BUILD
# ======================================

Write-Host ""
Write-Host "[5] Build Frontend"

npm run build


if($LASTEXITCODE -ne 0){

    Write-Host ""
    Write-Host "BUILD FAILED"
    exit 1

}



# ======================================
# STATUS
# ======================================

Write-Host ""
Write-Host "=============================================="
Write-Host " SIPANDU BASE PATH FIX COMPLETE"
Write-Host "=============================================="

Write-Host ""

Write-Host "LOCAL:"
Write-Host "APP_URL=http://127.0.0.1:8000"
Write-Host "SIPANDU_BASE_PATH="

Write-Host ""

Write-Host "CPANEL:"
Write-Host "SIPANDU_BASE_PATH=/akademik/sipandu"

Write-Host ""

Write-Host "Next:"
Write-Host "git add ."
Write-Host "git commit -m `"Fix dynamic base path resolver`""
Write-Host "git push origin main"