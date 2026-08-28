<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Ruang Kelas — SiPANDU</title>
    @include('partials.api-prefix-bridge')
    @vite(['resources/css/app.css', 'resources/js/classroom.tsx', 'resources/js/student-progress.tsx'])
</head>
<body>
    <div id="classroom-app"></div>
    <div id="student-progress-root"></div>
</body>
</html>
