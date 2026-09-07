<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>SiPANDU — Learning Management System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @include('partials.pwa-head')
    @include('partials.api-prefix-bridge')
    @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/app.tsx', 'resources/js/ux-performance.ts', 'resources/js/class-card-loading-guard.ts', 'resources/js/assessment-center.tsx', 'resources/js/assessment-quiz-ui.ts', 'resources/js/student-progress.tsx', 'resources/js/pwa-controls.tsx', 'resources/js/calendar-panel.tsx', 'resources/js/class-access-panel.tsx', 'resources/js/subdirectory-class-code-compat.ts', 'resources/js/class-code-editor.ts', 'resources/js/lecturer-join-dashboard.ts', 'resources/js/header-utilities.ts', 'resources/js/ui-polish.ts', 'resources/js/ui-language.ts'])
    <script>
        (() => {
            const base = String(window.__SIPANDU_BASE_PATH__ || '').replace(/\/+$/, '');
            ["sipandu-account-security.js","sipandu-dashboard-reliability.js","sipandu-onboarding.js","sipandu-lecturer-dashboard.js","sipandu-shell-reliability.js"].forEach((name) => {
                const script = document.createElement('script');
                script.src = (base ? base : '') + '/' + name + '?v=20260907.3';
                script.defer = true;
                document.head.appendChild(script);
            });
        })();
    </script>
    <style>
        html,
        body,
        body * {
            font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        html:has(body[data-sipandu-assessment-open="true"]),
        body[data-sipandu-assessment-open="true"] {
            overflow: hidden !important;
            overscroll-behavior: none !important;
        }
        body[data-sipandu-assessment-open="true"] #sipandu-assessment-center-root > section {
            position: fixed !important;
            inset: 0 !important;
            z-index: 90 !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
            background: #f5f7fb !important;
        }
        body[data-sipandu-assessment-open="true"] nav button:not([data-sipandu-assessment-nav="true"]) {
            background-color: transparent !important;
            color: rgba(219, 234, 254, .75) !important;
            box-shadow: none !important;
        }
        body[data-sipandu-assessment-open="true"] nav [data-sipandu-assessment-nav="true"] {
            background: #1764ff !important;
            color: #fff !important;
            box-shadow: 0 10px 24px rgba(3, 18, 54, .25) !important;
        }
        body[data-sipandu-assessment-open="true"] nav [data-sipandu-assessment-nav="true"] > span:first-child {
            background: rgba(255, 255, 255, .14) !important;
        }
        @media (min-width: 1280px) {
            body[data-sipandu-assessment-open="true"] #sipandu-assessment-center-root > section { left: 18rem !important; }
        }
        body[data-sipandu-layout="dashboard"] > div[role="presentation"] {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100dvh !important;
            min-height: 100dvh !important;
            display: grid !important;
            place-items: center !important;
            padding: clamp(.75rem, 2.5vw, 1.5rem) !important;
            overflow-y: auto !important;
            overscroll-behavior: contain;
        }
        body[data-sipandu-layout="dashboard"] > div[role="presentation"] > section[role="dialog"][aria-labelledby="join-class-title"] {
            position: relative !important;
            inset: auto !important;
            margin: auto !important;
            width: min(100%, 32.5rem) !important;
            max-height: calc(100dvh - 2rem) !important;
            transform: none !important;
        }
        @media (max-width: 639px) {
            body[data-sipandu-layout="dashboard"] > div[role="presentation"] { padding: .75rem !important; }
            body[data-sipandu-layout="dashboard"] > div[role="presentation"] > section[role="dialog"][aria-labelledby="join-class-title"] { max-height: calc(100dvh - 1.5rem) !important; border-radius: 1.5rem !important; }
        }
    </style>
</head>
<body data-sipandu-layout="dashboard">
    <div id="app"></div>
    <div id="student-progress-root"></div>
    @include('partials.class-management-ui-v2')
    @include('partials.authenticated-theme-default')
</body>
</html>
