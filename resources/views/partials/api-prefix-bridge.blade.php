@php
    /*
     * SiPANDU:
     *
     * LOCAL
     * /
     *
     * PRODUCTION
     * /akademik/sipandu
     *
     * LiteSpeed dapat melakukan rewrite sehingga
     * request()->getBaseUrl() tidak selalu berisi
     * subdirectory aplikasi.
     */

    $requestUri = (string) request()->getRequestUri();
    $requestPath = (string) parse_url($requestUri, PHP_URL_PATH);

    $configuredBasePath = trim(
        (string) config('sipandu.base_path', '')
    );

    $requestBasePath = trim(
        (string) request()->getBaseUrl()
    );

    if (
        str_starts_with(
            trim($requestPath, '/'),
            'akademik/sipandu'
        )
    ) {
        $sipanduBasePath = '/akademik/sipandu';
    } elseif ($requestBasePath !== '') {
        $sipanduBasePath = '/'.trim($requestBasePath, '/');
    } elseif ($configuredBasePath !== '') {
        $sipanduBasePath = '/'.trim($configuredBasePath, '/');
    } else {
        $sipanduBasePath = '';
    }

    if ($sipanduBasePath === '/') {
        $sipanduBasePath = '';
    }
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
