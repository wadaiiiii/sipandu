Write-Host "====================================="
Write-Host " FIX API BRIDGE FINAL "
Write-Host "====================================="


$file="resources/views/partials/api-prefix-bridge.blade.php"


Write-Host "Backup..."

Copy-Item `
$file `
"$file.before-final-bridge-fix" `
-Force



Write-Host "Replace bridge dengan versi bersih..."


@'
@php
    $requestBasePath = trim((string) request()->getBaseUrl());
    $configuredBasePath = trim((string) config('sipandu.base_path', ''));
    $sipanduBasePath = $requestBasePath !== '' ? $requestBasePath : $configuredBasePath;
    $sipanduBasePath = $sipanduBasePath === '/' ? '' : '/'.trim($sipanduBasePath, '/');
@endphp

<meta name="app-base-path" content="{{ $sipanduBasePath }}">

<script>

window.__SIPANDU_API_PREFIX__ = '/sipandu-api/';
window.__SIPANDU_BASE_PATH__ = @json($sipanduBasePath);


window.sipanduUrl = function(value){

    if(typeof value !== 'string'){
        return value;
    }


    if(value.startsWith('/akademik/')){
        return value;
    }


    const path = value;


    if(!path.startsWith('/')){
        return value;
    }


    const base = window.__SIPANDU_BASE_PATH__ || '';


    if(!base){
        return value;
    }


    if(path === base || path.startsWith(base+'/')){
        return value;
    }


    return base + path;

};

</script>
'@ | Set-Content `
$file `
-Encoding UTF8



Write-Host ""
Write-Host "Clear cache..."

php artisan optimize:clear


Write-Host ""
Write-Host "Run test..."

php artisan test --filter=SubdirectoryHostingTest


Write-Host ""
Write-Host "DONE"