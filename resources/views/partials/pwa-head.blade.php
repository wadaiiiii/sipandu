<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icons/sipandu-icon.svg" type="image/svg+xml">
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
