@php
    $requestBasePath = trim((string) request()->getBaseUrl());
    $configuredBasePath = trim((string) config('sipandu.base_path', ''));
    $sipanduBasePath = $requestBasePath !== '' ? $requestBasePath : $configuredBasePath;
    $sipanduBasePath = $sipanduBasePath === '/' ? '' : '/'.trim($sipanduBasePath, '/');
@endphp
<link rel="manifest" href="{{ $sipanduBasePath }}/manifest.webmanifest">
<link rel="icon" href="{{ $sipanduBasePath }}/icons/sipandu-icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{{ $sipanduBasePath }}/icons/sipandu-192.png">
<meta name="theme-color" content="#071b56">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="application-name" content="SiPANDU">
<script>
    (() => {
        try {
            const saved = localStorage.getItem('sipandu.theme');
            const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
            const theme = saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light');
            document.documentElement.dataset.theme = theme;
            document.documentElement.style.colorScheme = theme;
        } catch {
            document.documentElement.dataset.theme = 'light';
        }
    })();
</script>
