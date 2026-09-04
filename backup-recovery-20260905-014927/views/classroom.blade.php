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
        @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/student-classroom-ux.ts', 'resources/js/student-classroom-fastpath.ts', 'resources/js/classroom-loading.ts', 'resources/js/student-classroom.tsx', 'resources/js/assignment-deeplink.ts', 'resources/js/quiz-entry.ts', 'resources/js/classroom-discussion.tsx', 'resources/js/academic-latex.ts', 'resources/js/material-resources.ts', 'resources/js/pwa-controls.tsx', 'resources/js/ui-polish.ts', 'resources/js/ui-language.ts'])
        <style>
            #student-classroom-loading{position:fixed;inset:0;z-index:20;display:grid;place-items:center;background:#f6f8fd;padding:20px;opacity:1;transition:opacity .18s ease}
            #student-classroom-loading[data-hidden="true"]{opacity:0;pointer-events:none}
            .student-loading-card{display:flex;align-items:center;gap:13px;width:min(92vw,390px);border:1px solid #dbeafe;border-radius:20px;background:#fff;padding:16px 18px;box-shadow:0 18px 42px rgba(15,42,94,.1)}
            .student-loading-ring{width:25px;height:25px;flex:0 0 auto;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:999px;animation:student-loading-spin .75s linear infinite}
            .student-loading-title{font-size:14px;font-weight:800;color:#0f172a}.student-loading-detail{margin-top:3px;font-size:12px;line-height:1.45;color:#64748b}@keyframes student-loading-spin{to{transform:rotate(360deg)}}
        </style>
    @else
        @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/classroom-loading.ts', 'resources/js/classroom-v2.tsx', 'resources/js/assignment-deeplink.ts', 'resources/js/quiz-entry.ts', 'resources/js/classroom-discussion.tsx', 'resources/js/academic-latex.ts', 'resources/js/material-resources.ts', 'resources/js/classroom-editor.ts', 'resources/js/student-progress.tsx', 'resources/js/student-material-checklist.tsx', 'resources/js/join-requests.ts', 'resources/js/pwa-controls.tsx', 'resources/js/ui-polish.ts', 'resources/js/ui-language.ts'])
        <style>
            #lecturer-classroom-loading{position:fixed;inset:0;z-index:40;display:grid;place-items:center;background:#f6f8fd;padding:20px;opacity:1;transition:opacity .16s ease}
            #lecturer-classroom-loading[data-hidden="true"]{opacity:0;pointer-events:none}
            .lecturer-loading-card{display:flex;align-items:center;gap:12px;width:min(92vw,360px);border:1px solid #dbeafe;border-radius:18px;background:#fff;padding:14px 16px;box-shadow:0 16px 38px rgba(15,42,94,.1)}
            .lecturer-loading-ring{width:23px;height:23px;flex:0 0 auto;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:999px;animation:lecturer-loading-spin .72s linear infinite}
            .lecturer-loading-title{font-size:13px;font-weight:800;color:#0f172a}.lecturer-loading-detail{margin-top:2px;font-size:11px;line-height:1.4;color:#64748b}@keyframes lecturer-loading-spin{to{transform:rotate(360deg)}}
        </style>
    @endif
</head>
<body data-sipandu-layout="classroom">
    @if($isStudent)
        <div id="student-classroom-loading" role="status" aria-live="polite">
            <section class="student-loading-card">
                <span class="student-loading-ring" aria-hidden="true"></span>
                <div>
                    <div class="student-loading-title">Data kelas sedang diproses…</div>
                    <div class="student-loading-detail">Mohon tunggu sebentar.</div>
                </div>
            </section>
        </div>
        <div id="student-classroom-app"></div>
    @else
        <div id="lecturer-classroom-loading" role="status" aria-live="polite">
            <section class="lecturer-loading-card">
                <span class="lecturer-loading-ring" aria-hidden="true"></span>
                <div>
                    <div class="lecturer-loading-title">Data kelas sedang diproses…</div>
                    <div class="lecturer-loading-detail">Mohon tunggu sebentar.</div>
                </div>
            </section>
        </div>
        <div id="classroom-app"></div>
        <div id="student-material-checklist-root"></div>
        <div id="student-progress-root"></div>
    @endif
    @include('partials.quiz-entry-fallback')
</body>
</html>
