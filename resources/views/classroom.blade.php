<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Ruang Kelas — SiPANDU</title>
    @include('partials.pwa-head')
    @include('partials.api-prefix-bridge')
    @vite(['resources/css/app.css', 'resources/js/classroom-v2.tsx', 'resources/js/classroom-discussion.tsx', 'resources/js/student-progress.tsx', 'resources/js/student-material-checklist.tsx', 'resources/js/pwa-controls.tsx'])
</head>
<body data-sipandu-layout="classroom">
    <div id="classroom-app"></div>
    <div id="student-material-checklist-root"></div>
    <div id="student-progress-root"></div>
</body>
</html>
