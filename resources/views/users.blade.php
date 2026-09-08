<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Kelola Pengguna — SiPANDU</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @include('partials.pwa-head')
    @include('partials.api-prefix-bridge')
    @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/users.tsx', 'resources/js/pwa-controls.tsx', 'resources/js/ui-polish.ts'])
    <script>
        (() => {
            const base = String(window.__SIPANDU_BASE_PATH__ || '').replace(/\/+$/, '');
            ['sipandu-user-management.js', 'sipandu-mobile-ui.js'].forEach((name) => {
                const script = document.createElement('script');
                script.src = (base ? base : '') + '/' + name + '?v=20260908.3';
                script.defer = true;
                document.head.appendChild(script);
            });
        })();
    </script>
    <style>
        html, body, body * {
            font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
    </style>
</head>
<body data-sipandu-layout="dashboard">
    <div id="users-app"></div>
</body>
</html>
