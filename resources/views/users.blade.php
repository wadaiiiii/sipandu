<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Kelola Pengguna — SiPANDU</title>
    @include('partials.pwa-head')
    @include('partials.api-prefix-bridge')
    @vite(['resources/css/app.css', 'resources/js/users.tsx', 'resources/js/pwa-controls.tsx'])
</head>
<body data-sipandu-layout="dashboard">
    <div id="users-app"></div>
</body>
</html>
