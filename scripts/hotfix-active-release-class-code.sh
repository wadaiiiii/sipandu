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
PARTIAL="$PARTIAL_DIR/subdir-class-code-hotfix.blade.php"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/$STAMP"

if [ ! -f "$CURRENT/artisan" ] || [ ! -f "$BLADE" ]; then
  echo "ERROR: release aktif tidak valid: $CURRENT" >&2
  exit 1
fi

mkdir -p "$BACKUP" "$PARTIAL_DIR"
cp -a "$BLADE" "$BACKUP/app.blade.php"
[ -f "$PARTIAL" ] && cp -a "$PARTIAL" "$BACKUP/subdir-class-code-hotfix.blade.php" || true

echo "Release aktif : $CURRENT"
echo "Backup        : $BACKUP"

cat > "$PARTIAL" <<'BLADE'
<style id="sipandu-subdir-code-hotfix-style">
.sipandu-hotfix-code-chip{display:inline-flex;height:2.5rem;flex-shrink:0;align-items:center;justify-content:center;gap:.5rem;border:1px solid #dbeafe;border-radius:.75rem;background:#eff6ff;padding:0 .875rem;color:#1d4ed8;font:700 12px/1 system-ui,sans-serif;cursor:pointer;transition:.15s}.sipandu-hotfix-code-chip:hover{background:#dbeafe;border-color:#bfdbfe}.sipandu-hotfix-code-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#3b82f6}.sipandu-hotfix-code-value{font:800 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em;color:#08205d}
</style>
<script id="sipandu-subdir-code-hotfix-script">
(() => {
    const basePath = (() => {
        const value = document.querySelector('meta[name="app-base-path"]')?.getAttribute('content')?.trim() || '';
        if (!value || value === '/') return '';
        return `/${value.replace(/^\/+|\/+$/g, '')}`;
    })();

    const appRelativePath = (href) => {
        const url = new URL(href, window.location.origin);
        if (basePath && (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))) {
            return url.pathname.slice(basePath.length) || '/';
        }
        return url.pathname;
    };

    const copyIcon = () => '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    const checkIcon = () => '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>';

    const makeChip = (courseClass) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.sipanduJoinInline = String(courseClass.id);
        button.className = 'sipandu-hotfix-code-chip';
        button.title = 'Klik untuk menyalin kode join';
        button.setAttribute('aria-label', `Salin kode join ${courseClass.course?.name || 'kelas'}`);
        button.innerHTML = `<span class="sipandu-hotfix-code-label">Kode</span><code class="sipandu-hotfix-code-value">${courseClass.join_code}</code><span data-copy-icon>${copyIcon()}</span>`;
        button.addEventListener('click', async () => {
            const icon = button.querySelector('[data-copy-icon]');
            try {
                await navigator.clipboard.writeText(courseClass.join_code);
                if (icon) icon.innerHTML = checkIcon();
                button.title = 'Kode tersalin';
                window.setTimeout(() => {
                    if (icon) icon.innerHTML = copyIcon();
                    button.title = 'Klik untuk menyalin kode join';
                }, 1200);
            } catch {
                window.prompt('Salin kode join kelas:', courseClass.join_code);
            }
        });
        return button;
    };

    async function loadClasses() {
        const bootstrapResponse = await fetch('/sipandu-api/bootstrap', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!bootstrapResponse.ok) return [];
        const bootstrap = await bootstrapResponse.json();
        const role = bootstrap?.user?.role;
        if (!['admin_prodi', 'lecturer'].includes(role)) return [];

        const classesResponse = await fetch('/sipandu-api/classes', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!classesResponse.ok) return [];
        const payload = await classesResponse.json();
        return payload.classes || [];
    }

    function install(classes) {
        if (!Array.isArray(classes) || classes.length === 0) return;
        let frame = 0;

        const sync = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                document.querySelectorAll('a[href]').forEach((link) => {
                    const match = appRelativePath(link.href).match(/^\/kelas\/(\d+)\/?$/);
                    if (!match) return;
                    const classId = Number(match[1]);
                    const courseClass = classes.find((item) => Number(item.id) === classId);
                    if (!courseClass?.join_code) return;

                    const actions = link.parentElement;
                    if (!actions) return;
                    const journalExists = Array.from(actions.querySelectorAll('a[href]')).some((candidate) =>
                        appRelativePath(candidate.href).replace(/\/$/, '') === `/kelas/${classId}/jurnal`
                    );
                    if (!journalExists) return;

                    if ((link.textContent || '').trim() === 'Lanjutkan') link.textContent = 'Buka';
                    actions.style.alignItems = 'center';
                    actions.style.flexWrap = 'wrap';

                    if (!actions.querySelector(`[data-sipandu-join-inline="${classId}"]`)) {
                        actions.appendChild(makeChip(courseClass));
                    }
                });
            });
        };

        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    }

    loadClasses().then(install).catch(() => undefined);
})();
</script>
BLADE

if ! grep -q "partials.subdir-class-code-hotfix" "$BLADE"; then
  sed -i "/<\/body>/i\\    @include('partials.subdir-class-code-hotfix')" "$BLADE"
fi

(
  cd "$CURRENT"
  php artisan optimize:clear
)

echo
echo "Verifikasi:"
grep -n "partials.subdir-class-code-hotfix" "$BLADE" || true
[ -f "$PARTIAL" ] && echo "OK partial: $PARTIAL"
echo "HOTFIX SELESAI"
echo "Refresh dashboard dengan Ctrl+Shift+R."
