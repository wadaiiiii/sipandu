(function () {
    'use strict';

    var managedRoles = ['admin_prodi', 'lecturer'];
    var classMap = new Map();
    var manager = false;
    var syncQueued = false;
    var toastTimer = 0;

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

    function normalized(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function jsonRequest(path, options) {
        var requestOptions = Object.assign({
            credentials: 'include',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        }, options || {});
        requestOptions.headers = Object.assign({
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrf()
        }, requestOptions.headers || {});
        return fetch(apiUrl(path), requestOptions).then(function (response) {
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
        });
    }

    function addStyle() {
        if (document.getElementById('sipandu-dashboard-reliability-style')) return;
        var style = document.createElement('style');
        style.id = 'sipandu-dashboard-reliability-style';
        style.textContent =
            '[data-sipandu-reliability-card]>div:nth-child(2)>div:first-child{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:18px!important}' +
            '[data-sipandu-reliability-card]>div:nth-child(2)>div:first-child h2{max-width:none!important;white-space:normal!important;line-height:1.25!important}' +
            '[data-sipandu-reliability-card]>div:nth-child(2)>div:first-child>div:last-child{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%!important;gap:10px!important}' +
            '[data-sipandu-reliability-card]>div:nth-child(2)>div:first-child>div:last-child a{min-height:48px!important;border-radius:15px!important}' +
            '[data-sipandu-stable-class-actions]{display:grid!important;grid-template-columns:minmax(0,1fr) 46px 46px!important;grid-auto-flow:column!important;align-items:center!important;gap:10px!important;width:100%!important;margin-top:16px;padding-top:16px;border-top:1px solid #e5edfb}' +
            '[data-sipandu-stable-class-actions] .sipandu-code-box{display:flex;align-items:center;gap:8px;min-width:0;min-height:46px;border:1px solid #cfe0ff;border-radius:16px;background:#eff6ff;padding:8px 12px;color:#08205d}' +
            '[data-sipandu-stable-class-actions] .sipandu-code-label{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#2563eb}' +
            '[data-sipandu-stable-class-actions] code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:900;letter-spacing:.06em}' +
            '[data-sipandu-stable-class-actions] button,[data-sipandu-stable-class-actions] a{min-width:46px;min-height:46px;border-radius:13px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;transition:.16s;border:1px solid transparent;text-decoration:none}' +
            '[data-sipandu-stable-class-actions] .sipandu-copy{border:0;background:transparent;color:#2563eb;padding:7px}' +
            '[data-sipandu-stable-class-actions] .sipandu-edit{background:#fff;border-color:#bfdbfe;color:#1d4ed8}' +
            '[data-sipandu-stable-class-actions] .sipandu-delete{background:#fff;border-color:#fecdd3;color:#be123c}' +
            '[data-sipandu-stable-class-actions] .sipandu-edit:hover{background:#eff6ff}' +
            '[data-sipandu-stable-class-actions] .sipandu-delete:hover{background:#fff1f2}' +
            '[data-sipandu-roster-shortcut]{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' +
            '[data-sipandu-roster-shortcut] button,[data-sipandu-roster-shortcut] a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border-radius:12px;border:1px solid #cfe0ff;background:#eff6ff;color:#1d4ed8;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;text-decoration:none}' +
            '[data-sipandu-roster-tools]{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding:12px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff}' +
            '[data-sipandu-roster-tools] input{min-width:170px;flex:1;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:9px 11px;font-size:13px;outline:none}' +
            '[data-sipandu-roster-tools] input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}' +
            '[data-sipandu-roster-tools] button,[data-sipandu-roster-tools] a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border-radius:12px;border:1px solid #bfdbfe;background:#fff;color:#1d4ed8;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;text-decoration:none}' +
            '[data-sipandu-roster-tools] button[data-primary]{background:#08205d;border-color:#08205d;color:#fff}' +
            '[data-sipandu-action-legacy-hidden]{display:none!important}' +
            '[data-sipandu-dashboard-modal]{position:fixed;z-index:100000;inset:0;display:grid;place-items:center;padding:20px;background:rgba(3,18,54,.58);backdrop-filter:blur(8px)}' +
            '[data-sipandu-dashboard-modal] .sipandu-dialog{width:min(100%,440px);border-radius:26px;background:#fff;padding:24px;box-shadow:0 30px 90px rgba(3,18,54,.32)}' +
            '[data-sipandu-dashboard-modal] h2{margin:0;color:#0f172a;font-size:21px;font-weight:850}' +
            '[data-sipandu-dashboard-modal] p{margin:7px 0 0;color:#64748b;font-size:13px;line-height:1.55}' +
            '[data-sipandu-dashboard-modal] label{display:block;margin-top:18px;color:#334155;font-size:12px;font-weight:800}' +
            '[data-sipandu-dashboard-modal] input{box-sizing:border-box;width:100%;margin-top:7px;border:1px solid #cbd5e1;border-radius:14px;padding:12px 13px;font-size:15px;outline:none}' +
            '[data-sipandu-dashboard-modal] input:focus{border-color:#2563eb;box-shadow:0 0 0 4px #dbeafe}' +
            '[data-sipandu-dashboard-modal] .sipandu-dialog-error{min-height:20px;margin-top:10px;color:#be123c;font-size:12px;font-weight:700}' +
            '[data-sipandu-dashboard-modal] .sipandu-dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}' +
            '[data-sipandu-dashboard-modal] .sipandu-dialog-actions button{border:0;border-radius:13px;padding:10px 15px;font-size:13px;font-weight:800;cursor:pointer}' +
            '[data-sipandu-dashboard-modal] .sipandu-cancel{background:#f1f5f9;color:#475569}' +
            '[data-sipandu-dashboard-modal] .sipandu-save{background:#1764ff;color:#fff}' +
            '[data-sipandu-roster-tools]{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;padding:12px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff}' +
            '[data-sipandu-roster-tools] button{min-height:42px;border-radius:12px;border:1px solid #bfdbfe;background:#fff;color:#1d4ed8;padding:9px 12px;font-size:12px;font-weight:800;cursor:pointer}' +
            '[data-sipandu-roster-tools] button[data-primary]{background:#08205d;border-color:#08205d;color:#fff}' +
            '[data-sipandu-roster-import-list]{max-height:210px;overflow:auto;margin-top:12px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:8px}' +
            '[data-sipandu-roster-import-list] div{display:flex;justify-content:space-between;gap:10px;padding:8px 9px;border-radius:10px;background:#fff;font-size:12px}' +
            '[data-sipandu-roster-import-list] div+div{margin-top:6px}' +
            '@media(max-width:560px){[data-sipandu-roster-tools]{grid-template-columns:1fr}}';
        document.head.appendChild(style);
    }

    function showToast(message, isError) {
        var old = document.getElementById('sipandu-dashboard-toast');
        if (old) old.remove();
        var toast = document.createElement('div');
        toast.id = 'sipandu-dashboard-toast';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;z-index:100001;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(92vw,520px);padding:12px 16px;border-radius:14px;background:' + (isError ? '#9f1239' : '#08205d') + ';color:#fff;font:700 13px/1.45 system-ui,sans-serif;box-shadow:0 18px 45px rgba(3,18,54,.26)';
        document.body.appendChild(toast);
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { toast.remove(); }, 3600);
    }

    function classIdFromHref(href) {
        try {
            var path = new URL(href, window.location.origin).pathname;
            var base = basePath();
            if (base && (path === base || path.indexOf(base + '/') === 0)) path = path.slice(base.length) || '/';
            var match = path.match(/^\/kelas\/(\d+)\/?$/);
            return match ? Number(match[1]) : null;
        } catch (error) {
            return null;
        }
    }

    function cardFor(link) {
        var article = link.closest('article');
        if (article) return article;
        var node = link.parentElement;
        for (var depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
            var text = normalized(node.textContent);
            if (node.querySelectorAll('a[href]').length >= 2 && text.indexOf('SKS') >= 0 && text.indexOf('Kelas') >= 0) return node;
        }
        return link.parentElement;
    }

    function hideLegacyControls(card) {
        card.querySelectorAll('[data-sipandu-join-inline],[data-sipandu-code-edit],[data-sipandu-delete-class]').forEach(function (node) {
            if (!node.closest('[data-sipandu-stable-class-actions]')) {
                node.setAttribute('data-sipandu-action-legacy-hidden', 'true');
            }
        });
    }

    function copyText(value) {
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value);
        var helper = document.createElement('textarea');
        helper.value = value;
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
        return Promise.resolve();
    }

    function removeModal() {
        var modal = document.querySelector('[data-sipandu-dashboard-modal]');
        if (modal) modal.remove();
    }

    function openDialog(title, description, initialValue, onSubmit) {
        removeModal();
        var modal = document.createElement('div');
        modal.setAttribute('data-sipandu-dashboard-modal', 'true');
        var dialog = document.createElement('div');
        dialog.className = 'sipandu-dialog';
        var heading = document.createElement('h2');
        heading.textContent = title;
        var copy = document.createElement('p');
        copy.textContent = description;
        var form = document.createElement('form');
        var label = document.createElement('label');
        label.textContent = 'Kode bergabung';
        var input = document.createElement('input');
        input.value = initialValue || '';
        input.autocomplete = 'off';
        input.required = true;
        input.maxLength = 40;
        label.appendChild(input);
        var error = document.createElement('div');
        error.className = 'sipandu-dialog-error';
        var actions = document.createElement('div');
        actions.className = 'sipandu-dialog-actions';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'sipandu-cancel';
        cancel.textContent = 'Batal';
        var save = document.createElement('button');
        save.type = 'submit';
        save.className = 'sipandu-save';
        save.textContent = 'Simpan';
        actions.append(cancel, save);
        form.append(label, error, actions);
        dialog.append(heading, copy, form);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        cancel.addEventListener('click', removeModal);
        modal.addEventListener('click', function (event) { if (event.target === modal) removeModal(); });
        input.focus();
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            save.disabled = true;
            error.textContent = '';
            Promise.resolve(onSubmit(input.value.trim())).then(function () {
                removeModal();
            }).catch(function (reason) {
                save.disabled = false;
                error.textContent = reason instanceof Error ? reason.message : 'Permintaan belum berhasil.';
            });
        });
    }

    function editCode(courseClass) {
        openDialog(
            'Edit kode bergabung',
            'Kode ini dipakai mahasiswa untuk menemukan dan masuk ke kelas.',
            courseClass.join_code,
            function (code) {
                return jsonRequest('/sipandu-api/classes/' + courseClass.id + '/join-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: code })
                }).then(function () {
                    showToast('Kode kelas berhasil diperbarui.');
                    window.setTimeout(function () { window.location.reload(); }, 350);
                });
            }
        );
    }

    function deleteClass(courseClass) {
        if (!window.confirm('Hapus ' + (courseClass.course && courseClass.course.name || 'kelas') + ' — Kelas ' + courseClass.name + '? Semua data pembelajaran kelas akan ikut terhapus.')) return;
        jsonRequest('/sipandu-api/classes/' + courseClass.id, { method: 'DELETE' })
            .then(function () {
                showToast('Kelas berhasil dihapus.');
                window.setTimeout(function () { window.location.reload(); }, 350);
            })
            .catch(function (reason) { showToast(reason instanceof Error ? reason.message : 'Kelas belum berhasil dihapus.', true); });
    }

    function openManualDialog(courseClass) {
        removeModal();
        var modal = document.createElement('div');
        modal.setAttribute('data-sipandu-dashboard-modal', 'true');
        var dialog = document.createElement('div');
        dialog.className = 'sipandu-dialog';
        var heading = document.createElement('h2');
        heading.textContent = 'Daftarkan mahasiswa';
        var copy = document.createElement('p');
        copy.textContent = 'Isi nama lengkap dan NIM. Jika NIM belum ada di sistem, akun dibuat dengan password awal sesuai NIM.';
        var form = document.createElement('form');
        var nameLabel = document.createElement('label');
        nameLabel.textContent = 'Nama lengkap mahasiswa';
        var nameInput = document.createElement('input');
        nameInput.placeholder = 'Contoh: Elza Natasya';
        nameInput.autocomplete = 'name';
        nameInput.required = true;
        nameLabel.appendChild(nameInput);
        var nimLabel = document.createElement('label');
        nimLabel.textContent = 'NIM mahasiswa';
        var nimInput = document.createElement('input');
        nimInput.placeholder = 'Masukkan NIM mahasiswa';
        nimInput.autocomplete = 'off';
        nimInput.required = true;
        nimInput.maxLength = 40;
        nimLabel.appendChild(nimInput);
        var error = document.createElement('div');
        error.className = 'sipandu-dialog-error';
        var actions = document.createElement('div');
        actions.className = 'sipandu-dialog-actions';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'sipandu-cancel';
        cancel.textContent = 'Batal';
        var save = document.createElement('button');
        save.type = 'submit';
        save.className = 'sipandu-save';
        save.textContent = 'Daftarkan mahasiswa';
        actions.append(cancel, save);
        form.append(nameLabel, nimLabel, error, actions);
        dialog.append(heading, copy, form);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        cancel.addEventListener('click', removeModal);
        modal.addEventListener('click', function (event) { if (event.target === modal) removeModal(); });
        nameInput.focus();
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            save.disabled = true;
            error.textContent = '';
            jsonRequest('/sipandu-api/classes/' + courseClass.id + '/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.value.trim(), nim: nimInput.value.trim() })
            }).then(function (payload) {
                showToast(payload.message || 'Mahasiswa berhasil didaftarkan ke kelas.');
                removeModal();
                window.setTimeout(function () { window.location.reload(); }, 350);
            }).catch(function (reason) {
                save.disabled = false;
                error.textContent = reason instanceof Error ? reason.message : 'Pendaftaran mahasiswa belum berhasil.';
            });
        });
    }

    function rosterParser() {
        var direct = window.__sipanduParseSiakadRoster;
        if (typeof direct === 'function') return Promise.resolve(direct);
        return fetch(apiUrl('/build/manifest.json'), { credentials: 'same-origin', cache: 'no-store' })
            .then(function (response) {
                if (!response.ok) throw new Error('Manifest aplikasi tidak dapat dimuat.');
                return response.json();
            })
            .then(function (manifest) {
                var entry = manifest['resources/js/classroom-v2.tsx'];
                if (!entry || !entry.file) throw new Error('Modul pembaca PDF belum tersedia.');
                return import(apiUrl('/' + entry.file));
            })
            .then(function () {
                if (typeof window.__sipanduParseSiakadRoster === 'function') return window.__sipanduParseSiakadRoster;
                throw new Error('Pembaca PDF belum siap.');
            })
            .catch(function (reason) {
                if (typeof window.__sipanduParseSiakadRoster === 'function') return window.__sipanduParseSiakadRoster;
                throw reason;
            });
    }

    function openRosterImportDialog(courseClass) {
        removeModal();
        var modal = document.createElement('div');
        modal.setAttribute('data-sipandu-dashboard-modal', 'true');
        var dialog = document.createElement('div');
        dialog.className = 'sipandu-dialog';
        var heading = document.createElement('h2');
        heading.textContent = 'Impor PDF SIAKAD';
        var copy = document.createElement('p');
        copy.textContent = 'Pilih PDF daftar hadir SIAKAD. Data dibaca di halaman ini dan tidak membuka ruang kelas.';
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.style.marginTop = '18px';
        var status = document.createElement('div');
        status.className = 'sipandu-dialog-error';
        status.style.color = '#475569';
        var list = document.createElement('div');
        list.setAttribute('data-sipandu-roster-import-list', 'true');
        list.hidden = true;
        var actions = document.createElement('div');
        actions.className = 'sipandu-dialog-actions';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'sipandu-cancel';
        cancel.textContent = 'Tutup';
        var save = document.createElement('button');
        save.type = 'button';
        save.className = 'sipandu-save';
        save.textContent = 'Impor mahasiswa';
        save.disabled = true;
        actions.append(cancel, save);
        dialog.append(heading, copy, input, status, list, actions);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        cancel.addEventListener('click', removeModal);
        modal.addEventListener('click', function (event) { if (event.target === modal) removeModal(); });
        var rows = [];
        function renderRows() {
            list.innerHTML = '';
            if (!rows.length) {
                list.hidden = true;
                save.disabled = true;
                return;
            }
            list.hidden = false;
            rows.slice(0, 30).forEach(function (row) {
                var item = document.createElement('div');
                var name = document.createElement('strong');
                name.textContent = row.name;
                var nim = document.createElement('span');
                nim.textContent = row.nim;
                nim.style.fontFamily = 'ui-monospace,SFMono-Regular,Menlo,monospace';
                nim.style.color = '#64748b';
                item.append(name, nim);
                list.appendChild(item);
            });
            if (rows.length > 30) {
                var more = document.createElement('p');
                more.textContent = 'dan ' + (rows.length - 30) + ' mahasiswa lainnya.';
                more.style.cssText = 'margin:8px 2px 0;color:#64748b;font-size:11px';
                list.appendChild(more);
            }
            save.disabled = false;
        }
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) return;
            rows = [];
            renderRows();
            status.style.color = '#475569';
            status.textContent = 'Membaca PDF…';
            save.disabled = true;
            rosterParser().then(function (parser) { return parser(file); }).then(function (parsed) {
                rows = parsed || [];
                if (!rows.length) throw new Error('Nama dan NIM tidak ditemukan pada PDF.');
                status.style.color = '#047857';
                status.textContent = rows.length + ' mahasiswa terbaca. Periksa data sebelum impor.';
                renderRows();
            }).catch(function (reason) {
                rows = [];
                renderRows();
                status.style.color = '#be123c';
                status.textContent = reason instanceof Error ? reason.message : 'PDF tidak dapat dibaca.';
            });
        });
        save.addEventListener('click', function () {
            if (!rows.length) return;
            save.disabled = true;
            status.style.color = '#475569';
            status.textContent = 'Mengimpor mahasiswa…';
            jsonRequest('/sipandu-api/classes/' + courseClass.id + '/student-roster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students: rows })
            }).then(function (payload) {
                showToast(payload.message || 'Daftar mahasiswa berhasil diimpor.');
                removeModal();
                window.setTimeout(function () { window.location.reload(); }, 350);
            }).catch(function (reason) {
                save.disabled = false;
                status.style.color = '#be123c';
                status.textContent = reason instanceof Error ? reason.message : 'Impor PDF belum berhasil.';
            });
        });
        input.focus();
    }

    function addStableActions(courseClass, card) {
        var row = card.querySelector('[data-sipandu-stable-class-actions]');
        if (!row) {
            row = document.createElement('div');
            row.setAttribute('data-sipandu-stable-class-actions', String(courseClass.id));
            var codeBox = document.createElement('div');
            codeBox.className = 'sipandu-code-box';
            var label = document.createElement('span');
            label.className = 'sipandu-code-label';
            label.textContent = 'Kode';
            var code = document.createElement('code');
            var copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'sipandu-copy';
            copy.setAttribute('aria-label', 'Salin kode bergabung');
            copy.textContent = '⧉';
            codeBox.append(label, code, copy);
            var edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'sipandu-edit';
            edit.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
            edit.title = 'Edit kode kelas';
            edit.setAttribute('aria-label', 'Edit kode kelas');
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'sipandu-delete';
            remove.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';
            remove.title = 'Hapus kelas';
            remove.setAttribute('aria-label', 'Hapus kelas');
            row.append(codeBox, edit, remove);
            copy.addEventListener('click', function () {
                copyText(courseClass.join_code).then(function () {
                    copy.textContent = '✓';
                    showToast('Kode bergabung tersalin.');
                    window.setTimeout(function () { copy.textContent = '⧉'; }, 1200);
                });
            });
            edit.addEventListener('click', function () { editCode(courseClass); });
            remove.addEventListener('click', function () { deleteClass(courseClass); });
            var content = card.lastElementChild instanceof HTMLElement ? card.lastElementChild : card;
            content.appendChild(row);
        } else {
            var preferred = card.lastElementChild instanceof HTMLElement ? card.lastElementChild : card;
            if (row.parentElement !== preferred) preferred.appendChild(row);
        }
        var codeNode = row.querySelector('code');
        if (codeNode) codeNode.textContent = courseClass.join_code || '—';
        hideLegacyControls(card);
        return row;
    }

    function addShortRosterActions(courseClass, card) {
        if (card.querySelector('[data-sipandu-roster-native]')) {
            card.querySelectorAll('[data-sipandu-roster-shortcut]').forEach(function (node) { node.remove(); });
            return;
        }
        var hasRosterPanel = Array.from(card.querySelectorAll('h3')).some(function (node) {
            return normalized(node.textContent).toLowerCase() === 'peserta mahasiswa';
        }) || !!card.querySelector('input[placeholder*="NIM"], input[type="email"], [data-sipandu-roster-tools]');
        if (hasRosterPanel) {
            card.querySelectorAll('[data-sipandu-roster-shortcut]').forEach(function (node) { node.remove(); });
            return;
        }
        if (card.querySelector('[data-sipandu-roster-shortcut]')) return;
        var wrap = document.createElement('div');
        wrap.setAttribute('data-sipandu-roster-shortcut', String(courseClass.id));
        var manual = document.createElement('button');
        manual.type = 'button';
        manual.textContent = '＋ Daftarkan manual';
        manual.addEventListener('click', function () { openManualDialog(courseClass); });
        var importButton = document.createElement('button');
        importButton.type = 'button';
        importButton.textContent = '⇧ Impor PDF SIAKAD';
        importButton.addEventListener('click', function () { openRosterImportDialog(courseClass); });
        wrap.append(manual, importButton);
        card.appendChild(wrap);
    }

    function rosterPanelFor(heading) {
        var node = heading.parentElement;
        for (var depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
            if (node.querySelector('input[type="email"],input[placeholder*="email"],input[placeholder*="NIM"]')) return node;
        }
        return heading.parentElement && heading.parentElement.parentElement;
    }

    function addRosterTools(courseClass, card, heading) {
        var panel = rosterPanelFor(heading);
        if (!panel || panel.querySelector('[data-sipandu-roster-native]')) {
            card.querySelectorAll('[data-sipandu-roster-shortcut]').forEach(function (node) { node.remove(); });
            return;
        }
        card.querySelectorAll('[data-sipandu-roster-shortcut]').forEach(function (node) { node.remove(); });
        if (panel.querySelector('[data-sipandu-roster-tools]')) return;
        var oldInput = panel.querySelector('input[type="email"],input[placeholder*="email"],input[placeholder*="NIM"]');
        if (oldInput) {
            var oldRow = oldInput.closest('div');
            if (oldRow) oldRow.setAttribute('data-sipandu-action-legacy-hidden', 'true');
        }
        var tools = document.createElement('div');
        tools.setAttribute('data-sipandu-roster-tools', String(courseClass.id));
        var manual = document.createElement('button');
        manual.type = 'button';
        manual.setAttribute('data-primary', 'true');
        manual.textContent = '＋ Daftarkan manual';
        manual.addEventListener('click', function () { openManualDialog(courseClass); });
        var importButton = document.createElement('button');
        importButton.type = 'button';
        importButton.textContent = '⇧ Impor PDF SIAKAD';
        importButton.addEventListener('click', function () { openRosterImportDialog(courseClass); });
        tools.append(manual, importButton);
        panel.appendChild(tools);
    }

    function minimalizeNativeRosterActions() {
        document.querySelectorAll('[data-sipandu-roster-native] button').forEach(function (button) {
            var label = normalized(button.textContent);
            if (/Daftarkan manual/i.test(label)) {
                button.title = 'Daftarkan mahasiswa manual';
                button.setAttribute('aria-label', button.title);
                button.innerHTML = '<span aria-hidden="true" style="font-size:18px;line-height:1">＋</span>';
            } else if (/Impor PDF SIAKAD/i.test(label)) {
                button.title = 'Impor mahasiswa dari PDF SIAKAD';
                button.setAttribute('aria-label', button.title);
                button.innerHTML = '<span aria-hidden="true" style="font-size:17px;line-height:1">⇧</span>';
            }
        });
    }

    function sync() {
        if (syncQueued) return;
        syncQueued = true;
        window.requestAnimationFrame(function () {
            syncQueued = false;

            var classesHeading = Array.from(document.querySelectorAll('h1')).find(function (node) {
                return normalized(node.textContent).toLowerCase() === 'kelas saya';
            });
            var classesPage = classesHeading && classesHeading.parentElement && classesHeading.parentElement.parentElement;

            document.querySelectorAll('[data-sipandu-stable-class-actions]').forEach(function (row) {
                var article = row.closest('article');
                if (!manager || !classesPage || !article || !classesPage.contains(article) || !article.querySelector('h2')) {
                    row.remove();
                }
            });

            if (!manager || !classMap.size || !classesPage) return;
            minimalizeNativeRosterActions();

            classesPage.querySelectorAll('article').forEach(function (card) {
                if (!card.querySelector('h2')) return;
                var classLink = Array.from(card.querySelectorAll('a[href]')).find(function (link) {
                    var id = classIdFromHref(link.href);
                    return id && classMap.has(id);
                });
                if (!classLink) return;

                var id = classIdFromHref(classLink.href);
                var courseClass = classMap.get(id);
                card.setAttribute('data-sipandu-reliability-card', String(id));

                var rows = Array.from(card.querySelectorAll('[data-sipandu-stable-class-actions]'));
                rows.slice(1).forEach(function (row) { row.remove(); });
                addStableActions(courseClass, card);

                if (card.querySelector('[data-sipandu-roster-native]')) {
                    card.querySelectorAll('[data-sipandu-roster-shortcut]').forEach(function (node) { node.remove(); });
                    return;
                }
                var headings = Array.from(card.querySelectorAll('h3'));
                var rosterHeading = headings.find(function (node) {
                    return normalized(node.textContent).toLowerCase() === 'peserta mahasiswa';
                });
                if (rosterHeading) addRosterTools(courseClass, card, rosterHeading);
            });
        });
    }

    function load() {
        return jsonRequest('/sipandu-api/bootstrap').then(function (payload) {
            var user = payload.user;
            manager = !!(user && managedRoles.indexOf(user.role) >= 0);
            if (!manager) return [];
            return jsonRequest('/sipandu-api/classes').then(function (classes) { return classes.classes || []; });
        }).then(function (classes) {
            classMap = new Map((classes || []).map(function (item) { return [Number(item.id), item]; }));
            sync();
        }).catch(function () { manager = false; });
    }

    function boot() {
        addStyle();
        var root = document.getElementById('app') || document.body;
        var observer = new MutationObserver(sync);
        observer.observe(root, { childList: true, subtree: true });
        load();
        window.addEventListener('focus', load);
        window.addEventListener('sipandu:classes-changed', load);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
