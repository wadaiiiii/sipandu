<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Ruang Kelas — SiPANDU</title>
    @vite(['resources/css/app.css', 'resources/js/classroom.tsx'])
</head>
<body>
    <div id="classroom-app"></div>
</body>
</html>
