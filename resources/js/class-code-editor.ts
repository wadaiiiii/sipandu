import { sipanduUrl } from './utils/sipandu-api';

export {};

let installed = false;

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function responseError(response: Response): Promise<string> {
    try {
        const payload = await response.json() as { message?: string; errors?: Record<string, string[]> };
        return Object.values(payload.errors ?? {}).flat()[0] ?? payload.message ?? 'Kode kelas belum berhasil diperbarui.';
    } catch {
        return 'Kode kelas belum berhasil diperbarui.';
    }
}

function ensureStyles(): void {
    if (document.getElementById('sipandu-code-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-code-editor-style';
    style.textContent = `
      .sipandu-code-edit{display:grid;height:2.5rem;width:2.5rem;place-items:center;border:1px solid #dbeafe;border-radius:.75rem;background:white;color:#2563eb;font:800 15px/1 system-ui,sans-serif;transition:.15s}.sipandu-code-edit:hover{background:#eff6ff}
      .sipandu-code-overlay{position:fixed;inset:0;z-index:520;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.5);backdrop-filter:blur(3px)}
      .sipandu-code-card{width:min(94vw,480px);border:1px solid #e2e8f0;border-radius:1.5rem;background:#fff;padding:1.25rem;box-shadow:0 28px 70px rgba(15,23,42,.22)}
      .sipandu-code-input{margin-top:.8rem;width:100%;border:1px solid #dbe3f1;border-radius:1rem;padding:.8rem .9rem;font:800 15px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.04em;outline:none}.sipandu-code-input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}
      .sipandu-code-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.55rem;margin-top:1rem}.sipandu-code-btn{border-radius:.8rem;padding:.7rem .9rem;font:800 12px/1 system-ui,sans-serif}.sipandu-code-primary{border:0;background:#1764ff;color:white}.sipandu-code-secondary{border:1px solid #e2e8f0;background:white;color:#475569}.sipandu-code-reset{margin-right:auto;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412}.sipandu-code-error{margin-top:.7rem;border:1px solid #fecaca;border-radius:.8rem;background:#fef2f2;padding:.65rem .75rem;color:#b91c1c;font:600 12px/1.45 system-ui,sans-serif}
    `;
    document.head.appendChild(style);
}

function openEditor(classId: number, currentCode: string): void {
    document.querySelector('[data-sipandu-code-overlay]')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'sipandu-code-overlay';
    overlay.dataset.sipanduCodeOverlay = 'true';
    overlay.innerHTML = `<section class="sipandu-code-card" role="dialog" aria-modal="true"><p style="margin:0;font:800 11px/1 system-ui;color:#2563eb;text-transform:uppercase;letter-spacing:.12em">Kode kelas</p><h2 style="margin:.45rem 0 0;font:800 20px/1.2 system-ui;color:#0f172a">Atur kode bergabung</h2><p style="margin:.55rem 0 0;font:400 13px/1.6 system-ui;color:#64748b">Gunakan kode yang mudah dibagikan ke mahasiswa, misalnya <strong>MAT101-A</strong> atau <strong>KALKULUS2026</strong>.</p><input class="sipandu-code-input" maxlength="30" value="${currentCode}" aria-label="Kode kelas kustom"><div data-error></div><div class="sipandu-code-actions"><button type="button" class="sipandu-code-btn sipandu-code-reset" data-reset>Kode otomatis</button><button type="button" class="sipandu-code-btn sipandu-code-secondary" data-close>Batal</button><button type="button" class="sipandu-code-btn sipandu-code-primary" data-save>Simpan</button></div></section>`;
    const input = overlay.querySelector<HTMLInputElement>('input')!;
    const close = () => overlay.remove();
    overlay.querySelector('[data-close]')?.addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });

    const submit = async (code: string | null) => {
        const save = overlay.querySelector<HTMLButtonElement>('[data-save]')!;
        const reset = overlay.querySelector<HTMLButtonElement>('[data-reset]')!;
        const error = overlay.querySelector<HTMLElement>('[data-error]')!;
        save.disabled = true;
        reset.disabled = true;
        save.textContent = 'Menyimpan…';
        error.innerHTML = '';
        const response = await fetch(sipanduUrl(`/sipandu-api/classes/${classId}/join-code`), {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!response.ok) {
            error.className = 'sipandu-code-error';
            error.textContent = await responseError(response);
            save.disabled = false;
            reset.disabled = false;
            save.textContent = 'Simpan';
            return;
        }
        save.textContent = 'Tersimpan ✓';
        window.setTimeout(() => window.location.reload(), 450);
    };

    overlay.querySelector('[data-save]')?.addEventListener('click', () => void submit(input.value.trim()));
    overlay.querySelector('[data-reset]')?.addEventListener('click', () => void submit(null));
    document.body.appendChild(overlay);
    window.setTimeout(() => { input.focus(); input.select(); }, 50);
}

function decorate(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-sipandu-join-inline]').forEach((chip) => {
        const classId = Number(chip.dataset.sipanduJoinInline);
        if (!classId || chip.parentElement?.querySelector(`[data-sipandu-code-edit="${classId}"]`)) return;
        const code = chip.querySelector('code')?.textContent?.trim() ?? '';
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.sipanduCodeEdit = String(classId);
        button.className = 'sipandu-code-edit';
        button.title = 'Ubah kode kelas';
        button.setAttribute('aria-label', 'Ubah kode kelas');
        button.textContent = '✎';
        button.addEventListener('click', () => openEditor(classId, code));
        chip.insertAdjacentElement('afterend', button);
    });
}

ensureStyles();
decorate();
if (!installed) {
    installed = true;
    const root = document.getElementById('app');
    if (root) {
        const observer = new MutationObserver(() => window.requestAnimationFrame(decorate));
        observer.observe(root, { childList: true, subtree: true });
    }
}



