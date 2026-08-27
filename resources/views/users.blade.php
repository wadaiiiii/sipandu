<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Kelola Pengguna — SiPANDU</title>
    @vite(['resources/css/app.css', 'resources/js/users.tsx'])
</head>
<body>
    <div id="users-app"></div>
</body>
</html>
