(function () {
    'use strict';

    function overlays() {
        return Array.from(document.querySelectorAll('#lecturer-classroom-loading, #student-classroom-loading'));
    }

    function hideNow() {
        overlays().forEach(function (overlay) {
            overlay.setAttribute('data-hidden', 'true');
            window.setTimeout(function () {
                if (overlay.parentNode) overlay.remove();
            }, 220);
        });
    }

    function hideWhenReady() {
        var lecturerRoot = document.getElementById('classroom-app');
        var studentRoot = document.getElementById('student-classroom-app');
        var root = lecturerRoot || studentRoot;
        if (!root || !root.children.length) return;
        var hasMain = !!root.querySelector('main');
        var text = String(root.textContent || '').replace(/\s+/g, ' ').trim();
        var terminal = text && !/^Memuat ruang kelas/.test(text) && text.indexOf('Data kelas sedang diproses') < 0;
        if (hasMain || terminal) hideNow();
    }

    function hideOnReturn(event) {
        var navigation = window.performance && performance.getEntriesByType
            ? performance.getEntriesByType('navigation')[0]
            : null;
        if (event && event.persisted || navigation && navigation.type === 'back_forward') {
            window.setTimeout(hideNow, 40);
            return;
        }
        window.setTimeout(hideWhenReady, 80);
    }

    function boot() {
        window.addEventListener('pageshow', hideOnReturn);
        window.addEventListener('popstate', function () { window.setTimeout(hideWhenReady, 80); });
        window.addEventListener('hashchange', function () { window.setTimeout(hideWhenReady, 80); });
        hideWhenReady();
        var observer = new MutationObserver(hideWhenReady);
        observer.observe(document.body, { childList: true, subtree: true });
        window.setTimeout(hideWhenReady, 12000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
