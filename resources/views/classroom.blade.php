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
        @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/student-classroom-ux.ts', 'resources/js/classroom-loading.ts', 'resources/js/student-classroom.tsx', 'resources/js/classroom-discussion.tsx', 'resources/js/academic-latex.ts', 'resources/js/material-resources.ts', 'resources/js/pwa-controls.tsx', 'resources/js/ui-polish.ts'])
        <style>
            #student-classroom-loading{position:fixed;inset:0;z-index:20;display:grid;place-items:center;background:linear-gradient(145deg,#f8fbff 0%,#f2f6fc 52%,#edf4ff 100%);padding:24px;opacity:1;transition:opacity .2s ease}
            #student-classroom-loading[data-hidden="true"]{opacity:0;pointer-events:none}
            .student-loading-card{width:min(92vw,520px);border:1px solid #dbeafe;border-radius:30px;background:rgba(255,255,255,.94);padding:28px;box-shadow:0 24px 60px rgba(15,42,94,.12)}
            .student-loading-head{display:flex;align-items:center;gap:15px}.student-loading-icon{position:relative;display:grid;height:54px;width:54px;flex:0 0 auto;place-items:center;border-radius:18px;background:#0b2d7a;color:#fff}.student-loading-ring{position:absolute;inset:-5px;border:2px solid #bfdbfe;border-top-color:#2563eb;border-radius:999px;animation:student-loading-spin .9s linear infinite}.student-loading-title{font-size:16px;font-weight:800;color:#0f172a}.student-loading-detail{margin-top:4px;font-size:12px;line-height:1.55;color:#64748b}.student-loading-progress{margin-top:22px;height:6px;overflow:hidden;border-radius:999px;background:#eaf1fb}.student-loading-progress:after{content:'';display:block;height:100%;width:38%;border-radius:999px;background:linear-gradient(90deg,#2563eb,#60a5fa,#2563eb);animation:student-loading-slide 1.2s ease-in-out infinite}.student-loading-lines{margin-top:20px;display:grid;gap:10px}.student-loading-line{height:11px;border-radius:999px;background:linear-gradient(90deg,#eef2f7 25%,#dfe9f6 45%,#eef2f7 65%);background-size:220% 100%;animation:student-loading-shimmer 1.35s linear infinite}.student-loading-line:nth-child(2){width:76%}.student-loading-line:nth-child(3){width:52%}@keyframes student-loading-spin{to{transform:rotate(360deg)}}@keyframes student-loading-slide{0%{transform:translateX(-110%)}100%{transform:translateX(290%)}}@keyframes student-loading-shimmer{0%{background-position:100% 0}100%{background-position:-120% 0}}
        </style>
    @else
        @vite(['resources/css/app.css', 'resources/js/action-feedback.ts', 'resources/js/classroom-loading.ts', 'resources/js/classroom-v2.tsx', 'resources/js/classroom-discussion.tsx', 'resources/js/academic-latex.ts', 'resources/js/material-resources.ts', 'resources/js/student-progress.tsx', 'resources/js/student-material-checklist.tsx', 'resources/js/join-requests.ts', 'resources/js/pwa-controls.tsx', 'resources/js/ui-polish.ts'])
    @endif
</head>
<body data-sipandu-layout="classroom">
    @if($isStudent)
        <div id="student-classroom-loading" role="status" aria-live="polite">
            <section class="student-loading-card">
                <div class="student-loading-head">
                    <div class="student-loading-icon" aria-hidden="true">
                        <span class="student-loading-ring"></span>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 19.5 4-2 4 2 4-2 4 2V5.5l-4-2-4 2-4-2-4 2z"/><path d="M8 3.5v14M12 5.5v14M16 3.5v14"/></svg>
                    </div>
                    <div>
                        <div class="student-loading-title" data-loading-title>Menyiapkan ruang belajar</div>
                        <div class="student-loading-detail" data-loading-detail>Menghubungkan akun mahasiswa dengan data kelas…</div>
                    </div>
                </div>
                <div class="student-loading-progress"></div>
                <div class="student-loading-lines" aria-hidden="true"><div class="student-loading-line"></div><div class="student-loading-line"></div><div class="student-loading-line"></div></div>
            </section>
        </div>
        <div id="student-classroom-app"></div>
    @else
        <div id="classroom-app"></div>
        <div id="student-material-checklist-root"></div>
        <div id="student-progress-root"></div>
    @endif
</body>
</html>
