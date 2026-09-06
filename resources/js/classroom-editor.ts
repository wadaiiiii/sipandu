export {};

type Material = {
    id: number;
    meeting_id: number;
    meeting_number: number;
    title: string;
    resource_type: 'link' | 'document' | 'video' | 'reading' | 'other';
    description: string | null;
    resource_url: string | null;
    attachment_url: string | null;
    attachment_name: string | null;
    is_published: boolean;
};

type Assignment = {
    id: number;
    title: string;
    instructions: string | null;
    attachment_url: string | null;
    attachment_name: string | null;
    sub_cpmk_code: string | null;
    weight_percent: number | string;
    max_score: number | string;
    due_at: string | null;
    status: 'draft' | 'published' | 'closed';
};

type Room = {
    can_edit: boolean;
    meetings: Array<{ id: number; meeting_number: number; assignments: Assignment[] }>;
};

const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
let room: Room | null = null;
let materials: Material[] = [];
let observer: MutationObserver | null = null;
let renderTimer: number | null = null;

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function errorMessage(response: Response): Promise<string> {
    try {
        const payload = await response.json() as { message?: string; errors?: Record<string, string[]> };
        return Object.values(payload.errors ?? {}).flat()[0] ?? payload.message ?? 'Perubahan belum berhasil disimpan.';
    } catch {
        return 'Perubahan belum berhasil disimpan.';
    }
}

function ensureStyles(): void {
    if (document.getElementById('sipandu-classroom-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-classroom-editor-style';
    style.textContent = `
      .sipandu-edit-btn{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:.75rem;padding:.45rem .65rem;font:700 11px/1 system-ui,sans-serif;transition:.15s}.sipandu-edit-btn:hover{background:#dbeafe}
      .sipandu-editor-overlay{position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.5);backdrop-filter:blur(3px);overflow:auto}
      .sipandu-editor-card{width:min(94vw,680px);max-height:calc(100dvh - 2rem);overflow:auto;border-radius:1.5rem;background:white;border:1px solid #e2e8f0;box-shadow:0 28px 80px rgba(15,23,42,.22)}
      .sipandu-editor-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.1rem 1.25rem;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.96);backdrop-filter:blur(8px)}
      .sipandu-editor-body{padding:1.25rem}.sipandu-editor-grid{display:grid;gap:.9rem}.sipandu-editor-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
      .sipandu-editor-label{display:grid;gap:.35rem;font:700 12px/1.3 system-ui,sans-serif;color:#334155}.sipandu-editor-input{width:100%;border:1px solid #dbe3f1;border-radius:.9rem;padding:.7rem .8rem;font:400 14px/1.5 system-ui,sans-serif;color:#0f172a;background:#fff;outline:none}.sipandu-editor-input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}.sipandu-editor-textarea{min-height:150px;resize:vertical}
      .sipandu-editor-actions{display:flex;justify-content:flex-end;gap:.65rem;margin-top:1rem;padding-top:1rem;border-top:1px solid #eef2f7}.sipandu-editor-save{border:0;border-radius:.85rem;background:#1764ff;color:white;padding:.7rem 1rem;font:800 13px/1 system-ui,sans-serif}.sipandu-editor-save:disabled{opacity:.55}.sipandu-editor-cancel{border:1px solid #e2e8f0;border-radius:.85rem;background:white;color:#475569;padding:.7rem 1rem;font:700 13px/1 system-ui,sans-serif}.sipandu-editor-error{margin-top:.75rem;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:.8rem;padding:.7rem .8rem;font:600 12px/1.45 system-ui,sans-serif}
      @media(max-width:640px){.sipandu-editor-grid.two{grid-template-columns:1fr}.sipandu-editor-card{max-height:calc(100dvh - 1rem)}}
    `;
    document.head.appendChild(style);
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character] ?? character);
}

function toLocalInput(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function findCard(title: string, meetingNumber: number): HTMLElement | null {
    return Array.from(document.querySelectorAll<HTMLElement>('#classroom-app article')).find((article) => {
        const heading = article.querySelector('h3')?.textContent?.trim();
        return heading === title && (article.textContent ?? '').includes(`Pertemuan ${meetingNumber}`);
    }) ?? null;
}

function attachButton(card: HTMLElement, key: string, label: string, onClick: () => void): void {
    if (card.querySelector(`[data-sipandu-editor="${key}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sipanduEditor = key;
    button.className = 'sipandu-edit-btn';
    button.innerHTML = `<span aria-hidden="true">✎</span><span>${label}</span>`;
    button.addEventListener('click', onClick);
    const heading = card.querySelector('h3');
    const target = heading?.parentElement ?? card;
    target.appendChild(button);
}

function renderButtons(): void {
    if (!room?.can_edit) return;

    materials.forEach((material) => {
        const card = findCard(material.title, material.meeting_number);
        if (card) attachButton(card, `material-${material.id}`, 'Edit materi', () => openMaterialEditor(material));
    });

    room.meetings.forEach((meeting) => {
        meeting.assignments.forEach((assignment) => {
            const card = findCard(assignment.title, meeting.meeting_number);
            if (card) attachButton(card, `assignment-${assignment.id}`, 'Edit tugas', () => openAssignmentEditor(assignment));
        });
    });
}

function createOverlay(title: string): { overlay: HTMLElement; body: HTMLElement; close: () => void } {
    document.querySelector('[data-sipandu-editor-overlay]')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'sipandu-editor-overlay';
    overlay.dataset.sipanduEditorOverlay = 'true';
    overlay.innerHTML = `<section class="sipandu-editor-card" role="dialog" aria-modal="true"><header class="sipandu-editor-head"><div><div style="font:800 11px/1 system-ui;color:#2563eb;text-transform:uppercase;letter-spacing:.12em">Ruang Kelas</div><h2 style="margin:.35rem 0 0;font:800 20px/1.2 system-ui;color:#0f172a">${escapeHtml(title)}</h2></div><button type="button" data-close aria-label="Tutup" class="sipandu-editor-cancel">Tutup</button></header><div class="sipandu-editor-body"></div></section>`;
    const body = overlay.querySelector<HTMLElement>('.sipandu-editor-body')!;
    const close = () => overlay.remove();
    overlay.querySelector('[data-close]')?.addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    document.body.appendChild(overlay);
    return { overlay, body, close };
}

function showError(form: HTMLFormElement, message: string): void {
    let box = form.querySelector<HTMLElement>('.sipandu-editor-error');
    if (!box) {
        box = document.createElement('div');
        box.className = 'sipandu-editor-error';
        form.appendChild(box);
    }
    box.textContent = message;
}

function openMaterialEditor(material: Material): void {
    const { body, close } = createOverlay('Edit materi');
    body.innerHTML = `<form class="sipandu-editor-grid" data-edit-material>
      <label class="sipandu-editor-label">Judul<input class="sipandu-editor-input" name="title" required value="${escapeHtml(material.title)}"></label>
      <div class="sipandu-editor-grid two"><label class="sipandu-editor-label">Jenis<select class="sipandu-editor-input" name="resource_type"><option value="link">Link</option><option value="document">Dokumen</option><option value="video">Video</option><option value="reading">Bacaan</option><option value="other">Lainnya</option></select></label><label class="sipandu-editor-label">Status<select class="sipandu-editor-input" name="is_published"><option value="1">Dipublikasikan</option><option value="0">Draft</option></select></label></div>
      <label class="sipandu-editor-label">Deskripsi<textarea aria-label="Deskripsi materi dan rumus LaTeX" class="sipandu-editor-input sipandu-editor-textarea" name="description">${escapeHtml(material.description ?? '')}</textarea></label>
      <label class="sipandu-editor-label">Link materi<input class="sipandu-editor-input" name="resource_url" value="${escapeHtml(material.resource_url ?? '')}" placeholder="https://..."></label>
      ${material.attachment_name ? `<div style="font:600 12px/1.5 system-ui;color:#64748b">Lampiran saat ini: <strong>${escapeHtml(material.attachment_name)}</strong>. Lampiran tetap dipertahankan saat materi diedit.</div>` : ''}
      <div class="sipandu-editor-actions"><button type="button" class="sipandu-editor-cancel" data-cancel>Batal</button><button class="sipandu-editor-save" type="submit">Simpan perubahan</button></div>
    </form>`;
    const form = body.querySelector<HTMLFormElement>('form')!;
    (form.elements.namedItem('resource_type') as HTMLSelectElement).value = material.resource_type;
    (form.elements.namedItem('is_published') as HTMLSelectElement).value = material.is_published ? '1' : '0';
    form.querySelector('[data-cancel]')?.addEventListener('click', close);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const save = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        save.disabled = true;
        save.textContent = 'Menyimpan…';
        const data = new FormData(form);
        const response = await fetch(`/sipandu-api/classes/${classId}/meetings/${material.meeting_id}/materials/${material.id}`, {
            method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
            body: JSON.stringify({
                title: String(data.get('title') ?? '').trim(), resource_type: data.get('resource_type'), description: String(data.get('description') ?? '').trim() || null,
                resource_url: String(data.get('resource_url') ?? '').trim() || null, attachment_url: material.attachment_url, attachment_name: material.attachment_name,
                is_published: data.get('is_published') === '1',
            }),
        });
        if (!response.ok) { showError(form, await errorMessage(response)); save.disabled = false; save.textContent = 'Simpan perubahan'; return; }
        save.textContent = 'Tersimpan ✓';
        window.setTimeout(() => window.location.reload(), 450);
    });
}

function openAssignmentEditor(assignment: Assignment): void {
    const { body, close } = createOverlay('Edit tugas');
    body.innerHTML = `<form class="sipandu-editor-grid" data-edit-assignment>
      <label class="sipandu-editor-label">Judul<input class="sipandu-editor-input" name="title" required value="${escapeHtml(assignment.title)}"></label>
      <label class="sipandu-editor-label">Instruksi tugas<textarea aria-label="Instruksi tugas dan rumus LaTeX" class="sipandu-editor-input sipandu-editor-textarea" name="instructions">${escapeHtml(assignment.instructions ?? '')}</textarea></label>
      <div class="sipandu-editor-grid two"><label class="sipandu-editor-label">Sub-CPMK<input class="sipandu-editor-input" name="sub_cpmk_code" value="${escapeHtml(assignment.sub_cpmk_code ?? '')}"></label><label class="sipandu-editor-label">Status<select class="sipandu-editor-input" name="status"><option value="draft">Draft</option><option value="published">Dibuka</option><option value="closed">Ditutup</option></select></label></div>
      <div class="sipandu-editor-grid two"><label class="sipandu-editor-label">Bobot (%)<input class="sipandu-editor-input" type="number" min="0" max="100" step="0.01" name="weight_percent" value="${assignment.weight_percent}"></label><label class="sipandu-editor-label">Nilai maksimum<input class="sipandu-editor-input" type="number" min="0.01" step="0.01" name="max_score" value="${assignment.max_score}"></label></div>
      <label class="sipandu-editor-label">Batas pengumpulan<input class="sipandu-editor-input" type="datetime-local" name="due_at" value="${toLocalInput(assignment.due_at)}"></label>
      ${assignment.attachment_name ? `<div style="font:600 12px/1.5 system-ui;color:#64748b">Lampiran saat ini: <strong>${escapeHtml(assignment.attachment_name)}</strong>. Lampiran tetap dipertahankan saat tugas diedit.</div>` : ''}
      <div class="sipandu-editor-actions"><button type="button" class="sipandu-editor-cancel" data-cancel>Batal</button><button class="sipandu-editor-save" type="submit">Simpan perubahan</button></div>
    </form>`;
    const form = body.querySelector<HTMLFormElement>('form')!;
    (form.elements.namedItem('status') as HTMLSelectElement).value = assignment.status;
    form.querySelector('[data-cancel]')?.addEventListener('click', close);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const save = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        save.disabled = true;
        save.textContent = 'Menyimpan…';
        const data = new FormData(form);
        const due = String(data.get('due_at') ?? '').trim();
        const response = await fetch(`/sipandu-api/classes/${classId}/assignments/${assignment.id}`, {
            method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
            body: JSON.stringify({
                title: String(data.get('title') ?? '').trim(), instructions: String(data.get('instructions') ?? '').trim() || null,
                attachment_url: assignment.attachment_url, attachment_name: assignment.attachment_name, sub_cpmk_code: String(data.get('sub_cpmk_code') ?? '').trim() || null,
                weight_percent: Number(data.get('weight_percent')), max_score: Number(data.get('max_score')), due_at: due || null, status: data.get('status'),
            }),
        });
        if (!response.ok) { showError(form, await errorMessage(response)); save.disabled = false; save.textContent = 'Simpan perubahan'; return; }
        save.textContent = 'Tersimpan ✓';
        window.setTimeout(() => window.location.reload(), 450);
    });
}

async function load(): Promise<void> {
    if (!classId) return;
    const [roomResponse, materialResponse] = await Promise.all([
        fetch(`/sipandu-api/classes/${classId}/meetings`, { credentials: 'include', headers: { Accept: 'application/json' } }),
        fetch(`/sipandu-api/classes/${classId}/material-resources`, { credentials: 'include', headers: { Accept: 'application/json' } }),
    ]);
    if (!roomResponse.ok) return;
    room = await roomResponse.json() as Room;
    if (!room.can_edit) return;
    if (materialResponse.ok) {
        const payload = await materialResponse.json() as { resources?: Material[] };
        materials = payload.resources ?? [];
    }
    renderButtons();
    observer = new MutationObserver(() => {
        if (renderTimer !== null) window.clearTimeout(renderTimer);
        renderTimer = window.setTimeout(renderButtons, 120);
    });
    const root = document.getElementById('classroom-app');
    if (root) observer.observe(root, { childList: true, subtree: true });
}

ensureStyles();
void load();



