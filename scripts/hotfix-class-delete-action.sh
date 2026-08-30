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
PARTIAL="$PARTIAL_DIR/class-delete-hotfix.blade.php"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/$STAMP"

if [ ! -f "$CURRENT/artisan" ] || [ ! -f "$BLADE" ]; then
  echo "ERROR: release aktif tidak valid: $CURRENT" >&2
  exit 1
fi

mkdir -p "$BACKUP" "$PARTIAL_DIR"
cp -a "$BLADE" "$BACKUP/app.blade.php"
[ -f "$PARTIAL" ] && cp -a "$PARTIAL" "$BACKUP/class-delete-hotfix.blade.php" || true

echo "Release aktif : $CURRENT"
echo "Backup        : $BACKUP"

cat > "$PARTIAL" <<'BLADE'
<style id="sipandu-class-delete-hotfix-style">
.sipandu-hotfix-delete-class{display:inline-flex;height:2.5rem;align-items:center;justify-content:center;gap:.45rem;border:1px solid #fecdd3;border-radius:.75rem;background:#fff1f2;padding:0 .85rem;color:#be123c;font:700 12px/1 system-ui,sans-serif;cursor:pointer;transition:.15s}.sipandu-hotfix-delete-class:hover{background:#ffe4e6;border-color:#fda4af}.sipandu-hotfix-delete-class:disabled{opacity:.55;cursor:wait}
</style>
<script id="sipandu-class-delete-hotfix-script">
(() => {
    const basePath = (() => {
        const value = document.querySelector('meta[name="app-base-path"]')?.getAttribute('content')?.trim() || '';
        if (!value || value === '/') return '';
        return `/${value.replace(/^\/+|\/+$/g, '')}`;
    })();
    const appRelativePath = (href) => {
        const url = new URL(href, window.location.origin);
        if (basePath && (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))) return url.pathname.slice(basePath.length) || '/';
        return url.pathname;
    };
    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const trash = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';

    const install = () => {
        document.querySelectorAll('a[href]').forEach((link) => {
            const match = appRelativePath(link.href).match(/^\/kelas\/(\d+)\/?$/);
            if (!match) return;
            const classId = Number(match[1]);
            const actions = link.parentElement;
            const card = link.closest('article');
            if (!actions || !card || !card.textContent?.includes('Peserta mahasiswa')) return;
            const hasJournal = Array.from(actions.querySelectorAll('a[href]')).some((candidate) => appRelativePath(candidate.href).replace(/\/$/, '') === `/kelas/${classId}/jurnal`);
            if (!hasJournal || actions.querySelector(`[data-sipandu-delete-class="${classId}"]`)) return;

            const title = card.querySelector('h2')?.textContent?.trim() || `kelas #${classId}`;
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.sipanduDeleteClass = String(classId);
            button.className = 'sipandu-hotfix-delete-class';
            button.title = 'Hapus kelas';
            button.innerHTML = `${trash}<span>Hapus</span>`;
            button.addEventListener('click', async () => {
                if (!window.confirm(`Hapus ${title}?\n\nSeluruh data pembelajaran pada kelas ini akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.`)) return;
                button.disabled = true;
                button.innerHTML = '<span>Menghapus…</span>';
                try {
                    const response = await fetch(`${basePath}/sipandu-api/classes/${classId}`, {
                        method: 'DELETE', credentials: 'include',
                        headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
                    });
                    if (!response.ok) {
                        let message = 'Kelas belum berhasil dihapus.';
                        try { const payload = await response.json(); message = payload.message || message; } catch {}
                        throw new Error(message);
                    }
                    window.location.reload();
                } catch (error) {
                    window.alert(error instanceof Error ? error.message : 'Kelas belum berhasil dihapus.');
                    button.disabled = false;
                    button.innerHTML = `${trash}<span>Hapus</span>`;
                }
            });
            actions.appendChild(button);
        });
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.getElementById('app') || document.body, {childList:true, subtree:true});
})();
</script>
BLADE

if ! grep -q "partials.class-delete-hotfix" "$BLADE"; then
  sed -i "/<\/body>/i\\    @include('partials.class-delete-hotfix')" "$BLADE"
fi

(cd "$CURRENT" && php artisan optimize:clear)

echo
echo "HOTFIX HAPUS KELAS SELESAI"
echo "Tombol Hapus sekarang tersedia pada kartu Kelas Saya."
