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
