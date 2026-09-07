(function () {
    'use strict';

    var focusQueued = false;

    function basePath() {
        return String(window.__SIPANDU_BASE_PATH__ || '').replace(/\/+$/, '');
    }

    function apiUrl(path) {
        var clean = '/' + String(path || '').replace(/^\/+/, '');
        var base = basePath();
        return base && clean.indexOf(base + '/') !== 0 ? base + clean : clean;
    }

    function normalize(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function transformParticipantInput() {
        Array.from(document.querySelectorAll('section')).forEach(function (section) {
            var text = normalize(section.textContent).toLowerCase();
            if (text.indexOf('peserta aktif') < 0) return;
            var form = section.querySelector('form');
            var input = section.querySelector('input[placeholder*="NIM"], input[type="email"], input[placeholder*="email"]');
            if (!form || !input) return;
            input.setAttribute('type', 'text');
            input.setAttribute('placeholder', 'NIM mahasiswa');
            input.setAttribute('aria-label', 'NIM mahasiswa');
            input.setAttribute('autocomplete', 'off');
            if (form.querySelectorAll('input').length > 1 || form.getAttribute('data-sipandu-manual-roster-form') === 'true') return;

            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'Nama lengkap mahasiswa';
            nameInput.setAttribute('aria-label', 'Nama lengkap mahasiswa');
            nameInput.autocomplete = 'name';
            nameInput.required = true;
            nameInput.className = input.className;
            form.insertBefore(nameInput, input);
            form.setAttribute('data-sipandu-manual-roster-form', 'true');
            form.style.display = 'grid';
            form.style.gridTemplateColumns = 'minmax(0,1fr) minmax(9rem,.75fr) auto';
            form.style.gap = '8px';
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                event.stopImmediatePropagation();
                var name = nameInput.value.trim();
                var nim = input.value.trim();
                if (!name || !nim) {
                    nameInput.focus();
                    return;
                }
                var button = form.querySelector('button');
                if (button) button.disabled = true;
                fetch(apiUrl('/sipandu-api/classes/' + classId + '/participants'), {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                    },
                    body: JSON.stringify({ name: name, nim: nim })
                }).then(function (response) {
                    return response.json().then(function (payload) {
                        if (!response.ok) throw new Error(String(Object.values(payload.errors || {}).flat()[0] || payload.message || 'Pendaftaran mahasiswa belum berhasil.'));
                        return payload;
                    });
                }).then(function (payload) {
                    var message = document.createElement('div');
                    message.textContent = payload.message || 'Mahasiswa berhasil didaftarkan ke kelas.';
                    message.style.cssText = 'position:fixed;z-index:100001;left:50%;bottom:24px;transform:translateX(-50%);padding:12px 16px;border-radius:14px;background:#08205d;color:#fff;font:700 13px/1.4 system-ui,sans-serif;box-shadow:0 16px 40px rgba(3,18,54,.25)';
                    document.body.appendChild(message);
                    window.setTimeout(function () { window.location.reload(); }, 500);
                }).catch(function (reason) {
                    if (button) button.disabled = false;
                    window.alert(reason instanceof Error ? reason.message : 'Pendaftaran mahasiswa belum berhasil.');
                });
            }, true);
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
