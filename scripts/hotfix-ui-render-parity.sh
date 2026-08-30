#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${SIPANDU_APP_ROOT:-/home/matematikaunsulb/apps/sipandu}"
CURRENT_LINK="$APP_ROOT/current"
BACKUP_ROOT="$APP_ROOT/shared/hotfix-backups"

if [ ! -L "$CURRENT_LINK" ]; then
  echo "ERROR: current symlink tidak ditemukan: $CURRENT_LINK" >&2
  exit 1
fi

CURRENT="$(readlink -f "$CURRENT_LINK")"
BLADE="$CURRENT/resources/views/app.blade.php"
PARTIAL_DIR="$CURRENT/resources/views/partials"
PARTIAL="$PARTIAL_DIR/ui-render-parity-hotfix.blade.php"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/$STAMP-ui-parity"

if [ ! -f "$CURRENT/artisan" ] || [ ! -f "$BLADE" ]; then
  echo "ERROR: release aktif tidak valid: $CURRENT" >&2
  exit 1
fi

mkdir -p "$BACKUP" "$PARTIAL_DIR"
cp -a "$BLADE" "$BACKUP/app.blade.php"
for old in subdir-class-code-hotfix.blade.php class-delete-hotfix.blade.php ui-render-parity-hotfix.blade.php; do
  [ -f "$PARTIAL_DIR/$old" ] && cp -a "$PARTIAL_DIR/$old" "$BACKUP/$old" || true
done

echo "Release aktif : $CURRENT"
echo "Backup        : $BACKUP"

cat > "$PARTIAL" <<'BLADE'
<style id="sipandu-ui-render-parity-style">
[data-sipandu-ui-parity-ready="true"]{opacity:1!important}
[data-sipandu-ui-parity-ready="true"] a[href]{pointer-events:auto!important;cursor:pointer!important;filter:none!important}
.sipandu-ui-code{display:inline-flex;height:2.5rem;flex-shrink:0;align-items:center;justify-content:center;gap:.5rem;border:1px solid #dbeafe;border-radius:.75rem;background:#eff6ff;padding:0 .875rem;color:#1d4ed8;font:700 12px/1 system-ui,sans-serif;cursor:pointer;transition:.15s}.sipandu-ui-code:hover{background:#dbeafe;border-color:#bfdbfe}.sipandu-ui-code-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#3b82f6}.sipandu-ui-code-value{font:800 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em;color:#08205d}
.sipandu-ui-delete{display:grid;height:2.5rem;width:2.5rem;flex:0 0 auto;place-items:center;border:1px solid #fecdd3;border-radius:.75rem;background:#fff;color:#be123c;cursor:pointer;transition:.15s}.sipandu-ui-delete:hover{background:#fff1f2;border-color:#fda4af}.sipandu-ui-delete:disabled{opacity:.55;cursor:wait}
</style>
<script id="sipandu-ui-render-parity-script">
(() => {
    if (window.__sipanduUiRenderParityInstalled) return;
    window.__sipanduUiRenderParityInstalled = true;

    const basePath = (() => {
        const raw = document.querySelector('meta[name="app-base-path"]')?.getAttribute('content')?.trim() || '';
        if (!raw || raw === '/') return '';
        return `/${raw.replace(/^\/+|\/+$/g, '')}`;
    })();
    const appRelativePath = (href) => {
        const url = new URL(href, window.location.origin);
        if (basePath && (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))) return url.pathname.slice(basePath.length) || '/';
        return url.pathname;
    };
    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const copyIcon = () => '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    const checkIcon = () => '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>';
    const trashIcon = () => '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';
    const classLabel = (name) => /^kelas\s+/i.test((name || '').trim()) ? name.trim() : `Kelas ${(name || '').trim() || ''}`.trim();

    let role = '';
    let classes = [];
    let loading = false;
    let refreshTimer = 0;
    let syncTimer = 0;

    const load = async () => {
        if (loading) return;
        loading = true;
        try {
            const bootstrapResponse = await fetch('/sipandu-api/bootstrap', { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
            if (!bootstrapResponse.ok) return;
            const bootstrap = await bootstrapResponse.json();
            role = bootstrap?.user?.role || '';
            if (!['lecturer', 'admin_prodi'].includes(role)) {
                classes = [];
                return;
            }
            const response = await fetch('/sipandu-api/classes', { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
            if (!response.ok) return;
            const payload = await response.json();
            classes = payload.classes || [];
        } finally {
            loading = false;
            scheduleSync();
        }
    };

    const scheduleRefresh = () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => void load(), 160);
    };

    const makeCode = (courseClass) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.sipanduJoinInline = String(courseClass.id);
        button.className = 'sipandu-ui-code';
        button.title = 'Klik untuk menyalin kode join';
        button.setAttribute('aria-label', `Salin kode join ${courseClass.course?.name || 'kelas'}`);
        button.innerHTML = `<span class="sipandu-ui-code-label">Kode</span><code class="sipandu-ui-code-value">${courseClass.join_code}</code><span data-copy-icon>${copyIcon()}</span>`;
        button.addEventListener('click', async () => {
            const icon = button.querySelector('[data-copy-icon]');
            try {
                await navigator.clipboard.writeText(courseClass.join_code);
                if (icon) icon.innerHTML = checkIcon();
                window.setTimeout(() => { if (icon) icon.innerHTML = copyIcon(); }, 1200);
            } catch { window.prompt('Salin kode join kelas:', courseClass.join_code); }
        });
        return button;
    };

    const makeDelete = (courseClass) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.sipanduDeleteClass = String(courseClass.id);
        button.className = 'sipandu-ui-delete';
        button.title = 'Hapus kelas';
        button.setAttribute('aria-label', 'Hapus kelas');
        button.innerHTML = trashIcon();
        button.addEventListener('click', async () => {
            const title = `${courseClass.course?.name || 'Kelas'} — ${classLabel(courseClass.name)}`;
            if (!window.confirm(`Hapus ${title}?\n\nSeluruh data pembelajaran kelas akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.`)) return;
            button.disabled = true;
            try {
                const response = await fetch(`/sipandu-api/classes/${courseClass.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' } });
                if (!response.ok) {
                    let message = 'Kelas belum berhasil dihapus.';
                    try { const payload = await response.json(); message = Object.values(payload.errors || {}).flat()[0] || payload.message || message; } catch {}
                    throw new Error(message);
                }
                window.location.reload();
            } catch (error) {
                window.alert(error instanceof Error ? error.message : 'Kelas belum berhasil dihapus.');
                button.disabled = false;
            }
        });
        return button;
    };

    const releaseLatestCards = () => {
        const heading = Array.from(document.querySelectorAll('h2')).find((item) => item.textContent?.trim() === 'Kelas terbaru');
        const section = heading?.closest('section');
        if (!section) return;
        section.dataset.loading = 'false';
        section.querySelector('[data-sipandu-class-loading-placeholder="true"]')?.setAttribute('style', 'display:none!important');
        section.querySelectorAll('article').forEach((card) => {
            card.dataset.sipanduUiParityReady = 'true';
            card.dataset.sipanduCardReady = 'true';
            card.setAttribute('aria-busy', 'false');
            card.querySelector('.sipandu-card-waiting-chip')?.remove();
            card.querySelectorAll('a[href]').forEach((link) => {
                link.removeAttribute('aria-disabled');
                if (link.dataset.sipanduClassGuarded === 'true') {
                    const previous = link.dataset.sipanduOriginalTabindex || '';
                    if (previous) link.setAttribute('tabindex', previous); else link.removeAttribute('tabindex');
                    delete link.dataset.sipanduClassGuarded;
                    delete link.dataset.sipanduOriginalTabindex;
                }
            });
        });
    };

    const sync = () => {
        releaseLatestCards();
        if (!['lecturer', 'admin_prodi'].includes(role)) return;
        let unknown = false;
        document.querySelectorAll('a[href]').forEach((link) => {
            const match = appRelativePath(link.href).match(/^\/kelas\/(\d+)\/?$/);
            if (!match) return;
            const classId = Number(match[1]);
            const courseClass = classes.find((item) => Number(item.id) === classId);
            if (!courseClass) { unknown = true; return; }
            const actions = link.parentElement;
            if (!actions) return;
            const hasJournal = Array.from(actions.querySelectorAll('a[href]')).some((candidate) => appRelativePath(candidate.href).replace(/\/$/, '') === `/kelas/${classId}/jurnal`);
            if (!hasJournal) return;
            if ((link.textContent || '').trim() === 'Lanjutkan') link.textContent = 'Buka';
            actions.style.alignItems = 'center';
            actions.style.flexWrap = 'wrap';
            if (courseClass.join_code && !actions.querySelector(`[data-sipandu-join-inline="${classId}"]`)) actions.appendChild(makeCode(courseClass));
            if (!actions.querySelector(`[data-sipandu-delete-class="${classId}"]`)) actions.appendChild(makeDelete(courseClass));
        });
        if (unknown) scheduleRefresh();
    };

    const scheduleSync = () => {
        window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(sync, 0);
    };

    document.addEventListener('click', (event) => {
        const link = event.target instanceof Element ? event.target.closest('a[data-sipandu-class-guarded="true"]') : null;
        if (!link) return;
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
        delete link.dataset.sipanduClassGuarded;
        delete link.dataset.sipanduOriginalTabindex;
    }, true);

    const observer = new MutationObserver(() => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(scheduleSync));
    });
    observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    window.addEventListener('focus', () => void load());
    void load();
})();
</script>
BLADE

# Singkirkan include hotfix lama dari Blade aktif agar tidak menumpuk observer/UI.
sed -i "/partials\.subdir-class-code-hotfix/d; /partials\.class-delete-hotfix/d; /partials\.ui-render-parity-hotfix/d" "$BLADE"
sed -i "/<\/body>/i\\    @include('partials.ui-render-parity-hotfix')" "$BLADE"

(
  cd "$CURRENT"
  php artisan optimize:clear
)

echo
echo "Verifikasi:"
grep -n "partials.ui-render-parity-hotfix" "$BLADE" || true
[ -f "$PARTIAL" ] && echo "OK partial: $PARTIAL"
echo "HOTFIX UI PARITY SELESAI"
echo "Kode/Edit/Hapus dan kartu Kelas terbaru sekarang kompatibel dengan /akademik/sipandu."
