<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Kuis & Ujian — SiPANDU</title>
    @include('partials.pwa-head')
    @include('partials.api-prefix-bridge')
    @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/class-quiz.tsx', 'resources/js/quiz-latex-context.ts', 'resources/js/academic-latex.ts', 'resources/js/ui-polish.ts', 'resources/js/ui-language.ts'])
</head>
<body class="bg-[#f5f7fb]">
    <div id="class-quiz-app"></div>
</body>
</html>
