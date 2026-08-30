<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Ruang Kelas — SiPANDU</title>
    @include('partials.pwa-head')
    @include('partials.api-prefix-bridge')
    @php($isStudent = auth()->user()?->role?->value === 'student')
    @if($isStudent)
        @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/student-classroom.tsx', 'resources/js/classroom-discussion.tsx', 'resources/js/academic-latex.ts', 'resources/js/material-resources.ts', 'resources/js/pwa-controls.tsx', 'resources/js/ui-polish.ts'])
    @else
        @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/classroom-v2.tsx', 'resources/js/classroom-discussion.tsx', 'resources/js/academic-latex.ts', 'resources/js/material-resources.ts', 'resources/js/student-progress.tsx', 'resources/js/student-material-checklist.tsx', 'resources/js/join-requests.ts', 'resources/js/pwa-controls.tsx', 'resources/js/ui-polish.ts'])
    @endif
</head>
<body data-sipandu-layout="classroom">
    @if($isStudent)
        <div id="student-classroom-app"></div>
    @else
        <div id="classroom-app"></div>
        <div id="student-material-checklist-root"></div>
        <div id="student-progress-root"></div>
    @endif
</body>
</html>
