<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Kelola Pengguna — SiPANDU</title>
    @include('partials.pwa-head')
    @include('partials.api-prefix-bridge')
    @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/users.tsx', 'resources/js/pwa-controls.tsx', 'resources/js/ui-polish.ts'])
    <script>
        (() => {
            const base = String(window.__SIPANDU_BASE_PATH__ || '').replace(/\/+$/, '');
            ['sipandu-user-management.js'].forEach((name) => {
                const script = document.createElement('script');
                script.src = (base ? base : '') + '/' + name;
                script.defer = true;
                document.head.appendChild(script);
            });
        })();
    </script>
</head>
<body data-sipandu-layout="dashboard">
    <div id="users-app"></div>
</body>
</html>
