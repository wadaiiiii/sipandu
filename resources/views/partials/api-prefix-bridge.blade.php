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
