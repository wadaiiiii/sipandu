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
    <script>
    (() => {
        const base = String(window.__SIPANDU_BASE_PATH__ || '').replace(/\/+$/, '');
        const script = document.createElement('script');
        script.src = (base ? base : '') + '/sipandu-quiz-reliability.js';
        script.defer = true;
        document.head.appendChild(script);
    })();
    </script>
</head>
<body class="bg-[#f5f7fb]">
    <div id="class-quiz-app"></div>
</body>
</html>
