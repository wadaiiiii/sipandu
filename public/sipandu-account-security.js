(function () {
    'use strict';

    var modalOpen = false;
    var pollTimer = 0;

    function basePath() {
        return String(window.__SIPANDU_BASE_PATH__ || '').replace(/\/+$/, '');
    }

    function apiUrl(path) {
        var clean = '/' + String(path || '').replace(/^\/+/, '');
        var base = basePath();
        if (!base) return clean;
        if (clean === base || clean.indexOf(base + '/') === 0) return clean;
        return base + clean;
    }

    function csrf() {
        var node = document.querySelector('meta[name="csrf-token"]');
        return node ? node.getAttribute('content') || '' : '';
    }

    function transformLoginForm() {
        document.querySelectorAll('input[type="email"], input[autocomplete="username"]').forEach(function (input) {
            input.setAttribute('type', 'text');
            input.setAttribute('autocomplete', 'username');
            input.setAttribute('placeholder', 'Masukkan email atau NIM');
        });
        document.querySelectorAll('label').forEach(function (label) {
            var text = String(label.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.indexOf('Email') !== 0 || text.indexOf('Email atau NIM') === 0) return;
            for (var i = 0; i < label.childNodes.length; i += 1) {
                var node = label.childNodes[i];
                if (node.nodeType === Node.TEXT_NODE && String(node.nodeValue || '').trim()) {
                    node.nodeValue = 'Email atau NIM';
                    break;
                }
            }
        });
    }

    function removeGuard() {
        var existing = document.querySelector('[data-sipandu-password-guard]');
        if (existing) existing.remove();
        document.body.style.overflow = '';
        modalOpen = false;
    }

    function openGuard(user) {
        if (modalOpen || document.querySelector('[data-sipandu-password-guard]')) return;
        modalOpen = true;
        var style = document.getElementById('sipandu-account-security-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'sipandu-account-security-style';
            style.textContent =
                '[data-sipandu-password-guard]{position:fixed;z-index:100002;inset:0;display:grid;place-items:center;padding:18px;background:rgba(3,18,54,.72);backdrop-filter:blur(10px)}' +
                '[data-sipandu-password-guard] .sipandu-password-card{width:min(100%,470px);border-radius:28px;background:#fff;padding:28px;box-shadow:0 34px 100px rgba(3,18,54,.35)}' +
                '[data-sipandu-password-guard] .sipandu-password-badge{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:7px 11px;font:800 11px/1 system-ui,sans-serif}' +
                '[data-sipandu-password-guard] h2{margin:18px 0 0;color:#08205d;font:850 26px/1.15 system-ui,sans-serif;letter-spacing:-.03em}' +
                '[data-sipandu-password-guard] p{margin:9px 0 0;color:#64748b;font:500 13px/1.6 system-ui,sans-serif}' +
                '[data-sipandu-password-guard] label{display:block;margin-top:18px;color:#334155;font:800 12px/1.2 system-ui,sans-serif}' +
                '[data-sipandu-password-guard] input{box-sizing:border-box;width:100%;margin-top:8px;border:1px solid #cbd5e1;border-radius:14px;padding:12px 13px;color:#0f172a;font:500 15px/1.2 system-ui,sans-serif;outline:none}' +
                '[data-sipandu-password-guard] input:focus{border-color:#2563eb;box-shadow:0 0 0 4px #dbeafe}' +
                '[data-sipandu-password-guard] .sipandu-password-error{min-height:22px;margin-top:10px;color:#be123c;font:700 12px/1.5 system-ui,sans-serif}' +
                '[data-sipandu-password-guard] button{width:100%;margin-top:7px;border:0;border-radius:14px;background:#1764ff;color:#fff;padding:13px 16px;font:850 14px/1 system-ui,sans-serif;cursor:pointer}' +
                '[data-sipandu-password-guard] button:disabled{opacity:.55;cursor:wait}';
            document.head.appendChild(style);
        }

        var overlay = document.createElement('div');
        overlay.setAttribute('data-sipandu-password-guard', 'true');
        var card = document.createElement('section');
        card.className = 'sipandu-password-card';
        var badge = document.createElement('span');
        badge.className = 'sipandu-password-badge';
        badge.textContent = '🔐 Keamanan akun';
        var heading = document.createElement('h2');
        heading.textContent = 'Perbarui password login';
        var copy = document.createElement('p');
        copy.textContent = 'Halo ' + String(user.name || '') + '. Password awal atau password reset hanya berlaku sekali. Buat password pribadi sebelum melanjutkan.';
        var form = document.createElement('form');
        var newLabel = document.createElement('label');
        newLabel.textContent = 'Password baru (minimal 8 karakter)';
        var newInput = document.createElement('input');
        newInput.type = 'password';
        newInput.required = true;
        newInput.minLength = 8;
        newInput.autocomplete = 'new-password';
        newLabel.appendChild(newInput);
        var confirmLabel = document.createElement('label');
        confirmLabel.textContent = 'Ulangi password baru';
        var confirmInput = document.createElement('input');
        confirmInput.type = 'password';
        confirmInput.required = true;
        confirmInput.minLength = 8;
        confirmInput.autocomplete = 'new-password';
        confirmLabel.appendChild(confirmInput);
        var error = document.createElement('div');
        error.className = 'sipandu-password-error';
        var submit = document.createElement('button');
        submit.type = 'submit';
        submit.textContent = 'Simpan password dan lanjutkan';
        form.append(newLabel, confirmLabel, error, submit);
        card.append(badge, heading, copy, form);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        newInput.focus();

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            error.textContent = '';
            if (newInput.value.length < 8) {
                error.textContent = 'Password baru minimal 8 karakter.';
                newInput.focus();
                return;
            }
            if (newInput.value !== confirmInput.value) {
                error.textContent = 'Konfirmasi password belum sama.';
                confirmInput.focus();
                return;
            }
            submit.disabled = true;
            fetch(apiUrl('/sipandu-api/password/update'), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf()
                },
                body: JSON.stringify({
                    password: newInput.value,
                    password_confirmation: confirmInput.value
                })
            }).then(function (response) {
                return response.text().then(function (text) {
                    var payload = {};
                    try { payload = text ? JSON.parse(text) : {}; } catch (parseError) {}
                    if (!response.ok) {
                        var errors = payload.errors || {};
                        var first = Object.keys(errors).map(function (key) { return errors[key]; }).flat()[0];
                        throw new Error(String(first || payload.message || 'Password belum berhasil diperbarui.'));
                    }
                    return payload;
                });
            }).then(function () {
                removeGuard();
                window.location.reload();
            }).catch(function (reason) {
                submit.disabled = false;
                error.textContent = reason instanceof Error ? reason.message : 'Password belum berhasil diperbarui.';
            });
        });
    }

    function checkAccount() {
        transformLoginForm();
        fetch(apiUrl('/sipandu-api/bootstrap'), {
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json' }
        }).then(function (response) {
            if (!response.ok) return null;
            return response.json();
        }).then(function (payload) {
            var user = payload && payload.user;
            if (user && user.must_change_password) openGuard(user);
        }).catch(function () { return null; });
    }

    function boot() {
        transformLoginForm();
        checkAccount();
        var observer = new MutationObserver(transformLoginForm);
        observer.observe(document.body, { childList: true, subtree: true });
        pollTimer = window.setInterval(checkAccount, 2500);
        window.addEventListener('beforeunload', function () { window.clearInterval(pollTimer); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
