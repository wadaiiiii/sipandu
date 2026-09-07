(function () {
    'use strict';

    var focusQueued = false;

    function normalize(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function transformParticipantInput() {
        Array.from(document.querySelectorAll('section')).forEach(function (section) {
            var text = normalize(section.textContent).toLowerCase();
            if (text.indexOf('peserta aktif') < 0) return;
            var input = section.querySelector('input[type="email"], input[placeholder*="email"]');
            if (!input) return;
            input.setAttribute('type', 'text');
            input.setAttribute('placeholder', 'NIM mahasiswa terdaftar');
            input.setAttribute('aria-label', 'NIM mahasiswa terdaftar');
            input.setAttribute('autocomplete', 'off');
        });
    }

    function replaceLabels() {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
            var value = String(node.nodeValue || '');
            if (value.indexOf('Lihat peserta ?') >= 0) node.nodeValue = value.replace(/Lihat peserta \?/g, 'Lihat peserta');
            if (value.indexOf('Buka pertemuan ?') >= 0) node.nodeValue = value.replace(/Buka pertemuan \?/g, 'Buka pertemuan');
        }
    }

    function makeSummaryAttractive() {
        var label = Array.from(document.querySelectorAll('p')).find(function (node) {
            return normalize(node.textContent) === 'Peserta aktif';
        });
        if (!label) return;
        var section = label.closest('section');
        if (!section || section.getAttribute('data-sipandu-participant-summary')) return;
        section.setAttribute('data-sipandu-participant-summary', 'true');
        section.style.background = 'linear-gradient(135deg,#071b56 0%,#123c9b 100%)';
        section.style.boxShadow = '0 18px 42px rgba(8,45,120,.22)';
        section.style.border = '1px solid rgba(147,197,253,.18)';
        var button = Array.from(section.querySelectorAll('button')).find(function (node) {
            return normalize(node.textContent).indexOf('Lihat peserta') === 0;
        });
        if (button) {
            button.textContent = 'Lihat peserta';
            button.style.display = 'inline-flex';
            button.style.alignItems = 'center';
            button.style.gap = '7px';
            button.style.marginTop = '15px';
            button.style.borderRadius = '999px';
            button.style.background = 'rgba(255,255,255,.12)';
            button.style.padding = '9px 13px';
            button.style.color = '#dbeafe';
        }
    }

    function focusPeople() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('tab') !== 'people' && window.location.hash !== '#people') return;
        if (focusQueued) return;
        focusQueued = true;
        window.requestAnimationFrame(function () {
            focusQueued = false;
            var button = Array.from(document.querySelectorAll('button')).find(function (node) {
                return normalize(node.textContent) === 'Peserta';
            });
            if (button && !button.getAttribute('data-sipandu-people-focused')) {
                button.setAttribute('data-sipandu-people-focused', 'true');
                button.click();
            }
        });
    }

    function boot() {
        replaceLabels();
        transformParticipantInput();
        makeSummaryAttractive();
        focusPeople();
        var observer = new MutationObserver(function () {
            replaceLabels();
            transformParticipantInput();
            makeSummaryAttractive();
            focusPeople();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
