(function () {
    'use strict';

    if (window.__SIPANDU_MOBILE_UI__) return;
    window.__SIPANDU_MOBILE_UI__ = true;

    var style = document.createElement('style');
    style.id = 'sipandu-mobile-ui-styles';
    style.textContent = `
html, body { max-width: 100%; overflow-x: clip; }
img, svg, video, canvas { max-width: 100%; }
input, select, textarea, button { max-width: 100%; }
[data-sipandu-mobile-scroll] { scrollbar-width: thin; scrollbar-color: #bfdbfe transparent; }

@media (max-width: 767px) {
    :root { --sipandu-mobile-gutter: 1rem; }
    body { min-width: 0 !important; -webkit-text-size-adjust: 100%; }
    main { min-width: 0; }
    main > section, main > div { min-width: 0; }
    button, a, input, select, textarea { -webkit-tap-highlight-color: transparent; }
    button, a[role="button"] { touch-action: manipulation; }
    input, select, textarea { font-size: 16px !important; }

    /* Dashboard shell and drawer */
    body[data-sipandu-layout="dashboard"] main > header,
    body[data-sipandu-layout="dashboard"] main > section,
    body[data-sipandu-layout="dashboard"] main > div {
        min-width: 0;
    }
    body[data-sipandu-layout="dashboard"] aside.fixed {
        width: min(86vw, 20rem) !important;
        max-width: 20rem !important;
    }
    body[data-sipandu-layout="dashboard"] header.sticky > div,
    body[data-sipandu-layout="dashboard"] header > div {
        padding-left: var(--sipandu-mobile-gutter) !important;
        padding-right: var(--sipandu-mobile-gutter) !important;
    }
    body[data-sipandu-layout="dashboard"] main > section {
        padding-left: var(--sipandu-mobile-gutter) !important;
        padding-right: var(--sipandu-mobile-gutter) !important;
    }
    body[data-sipandu-layout="dashboard"] h1 { font-size: clamp(1.45rem, 7vw, 2rem) !important; line-height: 1.16 !important; }
    body[data-sipandu-layout="dashboard"] h2 { overflow-wrap: anywhere; }
    body[data-sipandu-layout="dashboard"] [class*="rounded-[30px]"],
    body[data-sipandu-layout="dashboard"] [class*="rounded-[28px]"] { border-radius: 1.35rem !important; }

    /* Lecturer dashboard compatibility cards */
    .sld-shell { padding-left: 0 !important; padding-right: 0 !important; }
    .sld-hero { padding: 1.25rem !important; border-radius: 1.5rem !important; }
    .sld-hero h1 { font-size: 1.75rem !important; }
    .sld-hero-inner, .sld-section-head { align-items: flex-start !important; }
    .sld-section-head { gap: .75rem !important; }
    .sld-section-head > a, .sld-section-head > button { align-self: stretch; text-align: center; }
    .sld-grid { grid-template-columns: minmax(0, 1fr) !important; }
    .sld-card { min-width: 0 !important; padding: 1rem !important; border-radius: 1.25rem !important; }
    .sld-card-actions { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; gap: .55rem !important; }
    .sld-card-actions a, .sld-card-actions button { min-height: 46px !important; padding-inline: .65rem !important; }
    .sld-roster { max-height: 15rem !important; overflow-y: auto !important; overscroll-behavior: contain; padding-right: .2rem; }
    .sld-code-actions { display: grid !important; grid-template-columns: minmax(0, 1fr) 46px 46px !important; gap: .5rem !important; align-items: stretch !important; }
    .sld-code-actions > * { min-width: 0 !important; }
    .sld-code-actions button { width: 46px !important; height: 46px !important; }

    /* Classroom header and horizontal tab bar */
    body[data-sipandu-layout="classroom"] { overflow-x: clip !important; }
    body[data-sipandu-layout="classroom"] main > header,
    body[data-sipandu-layout="classroom"] main > section,
    body[data-sipandu-layout="classroom"] main > div { min-width: 0 !important; }
    body[data-sipandu-layout="classroom"] main > header > div,
    body[data-sipandu-layout="classroom"] main > section,
    body[data-sipandu-layout="classroom"] main > div {
        padding-left: var(--sipandu-mobile-gutter) !important;
        padding-right: var(--sipandu-mobile-gutter) !important;
    }
    body[data-sipandu-layout="classroom"] nav {
        max-width: 100vw;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        flex-wrap: nowrap !important;
        scrollbar-width: none;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
    }
    body[data-sipandu-layout="classroom"] nav::-webkit-scrollbar { display: none; }
    body[data-sipandu-layout="classroom"] nav button,
    body[data-sipandu-layout="classroom"] nav a { flex: 0 0 auto !important; min-height: 44px; white-space: nowrap; }
    body[data-sipandu-layout="classroom"] h1 { font-size: clamp(1.35rem, 7vw, 1.9rem) !important; line-height: 1.2 !important; overflow-wrap: anywhere; }
    body[data-sipandu-layout="classroom"] [class*="grid-cols-2"],
    body[data-sipandu-layout="classroom"] [class*="grid-cols-3"],
    body[data-sipandu-layout="classroom"] [class*="grid-cols-4"] { min-width: 0; }
    body[data-sipandu-layout="classroom"] [role="dialog"] {
        width: calc(100vw - 1.25rem) !important;
        max-width: calc(100vw - 1.25rem) !important;
        max-height: calc(100dvh - 1.25rem) !important;
        overflow-y: auto !important;
        border-radius: 1.25rem !important;
    }
    body[data-sipandu-layout="classroom"] table { min-width: 680px; }
    body[data-sipandu-layout="classroom"] .overflow-x-auto {
        max-width: calc(100vw - 2rem);
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
    }

    /* Quiz / assessment pages */
    #class-quiz-app main, #class-quiz-app section { min-width: 0; }
    #class-quiz-app header > div, #class-quiz-app main > section {
        padding-left: var(--sipandu-mobile-gutter) !important;
        padding-right: var(--sipandu-mobile-gutter) !important;
    }
    #class-quiz-app h1 { font-size: 1.5rem !important; line-height: 1.2 !important; overflow-wrap: anywhere; }
    #class-quiz-app [class*="grid-cols-3"],
    #class-quiz-app [class*="grid-cols-2"] { min-width: 0; }
    #class-quiz-app table { min-width: 680px; }
    #class-quiz-app [role="dialog"] {
        width: calc(100vw - 1.25rem) !important;
        max-width: calc(100vw - 1.25rem) !important;
        max-height: calc(100dvh - 1.25rem) !important;
        overflow-y: auto !important;
    }

    /* User management */
    #users-app section.mx-auto { padding-left: var(--sipandu-mobile-gutter) !important; padding-right: var(--sipandu-mobile-gutter) !important; }
    #users-app form { padding: 1rem !important; border-radius: 1.35rem !important; }
    #users-app form [class*="grid"] { grid-template-columns: minmax(0, 1fr) !important; }
    #users-app form label { min-height: 0 !important; }
    #users-app form button[type="submit"] { width: 100%; min-height: 46px; }
    #users-app table { min-width: 760px; }
    #users-app .overflow-x-auto {
        max-width: calc(100vw - 2rem);
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
    }

    /* Shared cards, action rows and floating controls */
    [data-sipandu-layout] .fixed.bottom-5,
    [data-sipandu-layout] .fixed.bottom-6 { bottom: max(1rem, env(safe-area-inset-bottom)) !important; }
    [data-sipandu-layout] .fixed.right-5,
    [data-sipandu-layout] .fixed.right-6 { right: 1rem !important; }
    [data-sipandu-layout] pre, [data-sipandu-layout] code { max-width: 100%; overflow-x: auto; }
}

@media (max-width: 479px) {
    :root { --sipandu-mobile-gutter: .75rem; }
    .sld-card-actions { grid-template-columns: minmax(0, 1fr) !important; }
    .sld-code-actions { grid-template-columns: minmax(0, 1fr) 44px 44px !important; }
    body[data-sipandu-layout="classroom"] main > header > div { gap: .5rem !important; }
    body[data-sipandu-layout="classroom"] nav button { padding-left: .75rem !important; padding-right: .75rem !important; }
    #class-quiz-app header button span:not(.sr-only) { max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

@media (orientation: landscape) and (max-height: 520px) {
    [role="dialog"] { max-height: calc(100dvh - .75rem) !important; }
}
`;
    document.head.appendChild(style);

    function markScrollableAreas(root) {
        (root || document).querySelectorAll('.overflow-x-auto, .sld-roster, nav').forEach(function (node) {
            node.setAttribute('data-sipandu-mobile-scroll', 'true');
        });
    }

    function apply() {
        document.documentElement.classList.add('sipandu-mobile-ready');
        markScrollableAreas(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
        apply();
    }

    var observer = new MutationObserver(function (records) {
        records.forEach(function (record) {
            record.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) markScrollableAreas(node);
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();