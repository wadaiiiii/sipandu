(function () {
    'use strict';

    var managedUsers = [];
    var syncQueued = false;

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

    function responsePayload(response) {
        return response.text().then(function (text) {
            var payload = {};
            try { payload = text ? JSON.parse(text) : {}; } catch (error) {}
            if (!response.ok) {
                var errors = payload.errors || {};
                var first = Object.keys(errors).map(function (key) { return errors[key]; }).flat()[0];
                throw new Error(String(first || payload.message || 'Permintaan belum berhasil.'));
            }
            return payload;
        });
    }

    function addStyle() {
        if (document.getElementById('sipandu-user-management-style')) return;
        var style = document.createElement('style');
        style.id = 'sipandu-user-management-style';
        style.textContent = '[data-sipandu-reset-password]{border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;color:#1d4ed8;padding:7px 10px;font:800 11px/1.1 system-ui,sans-serif;cursor:pointer;transition:.16s}[data-sipandu-reset-password]:hover{background:#dbeafe}[data-sipandu-reset-password]:disabled{opacity:.55;cursor:wait}';
        document.head.appendChild(style);
    }

    function resetPassword(user, button) {
        if (!window.confirm('Reset password untuk ' + user.name + '? Pengguna akan diminta membuat password baru saat login berikutnya.')) return;
        button.disabled = true;
        fetch(apiUrl('/sipandu-api/users/' + user.id + '/reset-password'), {
            method: 'POST',
            credentials: 'include',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() }
        }).then(responsePayload).then(function (payload) {
            window.alert('Password sementara untuk ' + user.name + ': ' + payload.temporary_password + '\\n\\nSampaikan password ini kepada pengguna. Password wajib diganti saat login berikutnya.');
        }).catch(function (reason) {
            window.alert(reason instanceof Error ? reason.message : 'Reset password belum berhasil.');
        }).then(function () {
            button.disabled = false;
        });
    }

    function sync() {
        if (syncQueued) return;
        syncQueued = true;
        window.requestAnimationFrame(function () {
            syncQueued = false;
            var rows = document.querySelectorAll('#users-app tbody tr');
            rows.forEach(function (row, index) {
                var user = managedUsers[index];
                if (!user) return;
                var cell = row.lastElementChild;
                if (!cell || cell.querySelector('[data-sipandu-reset-password]') || Array.from(cell.querySelectorAll('button')).some(function (node) {
                    return /reset password/i.test(node.textContent || '');
                })) return;
                var button = document.createElement('button');
                button.type = 'button';
                button.setAttribute('data-sipandu-reset-password', String(user.id));
                button.textContent = 'Reset password';
                button.addEventListener('click', function () { resetPassword(user, button); });
                cell.insertBefore(button, cell.firstChild);
                if (cell.firstChild !== button) {
                    var spacer = document.createTextNode(' ');
                    cell.insertBefore(spacer, button.nextSibling);
                }
            });
        });
    }

    function loadUsers() {
        fetch(apiUrl('/sipandu-api/users'), {
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json' }
        }).then(function (response) {
            if (!response.ok) return null;
            return response.json();
        }).then(function (payload) {
            managedUsers = payload && Array.isArray(payload.users) ? payload.users : [];
            sync();
        }).catch(function () { return null; });
    }

    function boot() {
        addStyle();
        var root = document.getElementById('users-app') || document.body;
        var observer = new MutationObserver(sync);
        observer.observe(root, { childList: true, subtree: true });
        loadUsers();
        window.setInterval(loadUsers, 5000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
