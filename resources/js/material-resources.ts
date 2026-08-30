export {};

type MaterialResource = {
    id: number;
    meeting_id: number;
    meeting_number: number;
    title: string;
    resource_url: string | null;
    attachment_url: string | null;
    attachment_name: string | null;
};

type UploadResult = { file: { id: number; name: string; mime_type: string | null; size_bytes: number; url: string } };

const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
let resources: MaterialResource[] = [];
let resourceFetchBusy = false;
let scheduled = false;

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function errorMessage(response: Response): Promise<string> {
    try {
        const payload = await response.json() as { message?: string; errors?: Record<string, string[]> };
        return Object.values(payload.errors ?? {}).flat()[0] ?? payload.message ?? 'Permintaan belum berhasil.';
    } catch {
        return 'Permintaan belum berhasil.';
    }
}

function controlByLabel<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(form: HTMLFormElement, labelText: string): T | null {
    const label = Array.from(form.querySelectorAll('label')).find((item) => (item.childNodes[0]?.textContent ?? item.textContent ?? '').trim().toLowerCase().startsWith(labelText.toLowerCase()));
    return label?.querySelector<T>('input,textarea,select') ?? null;
}

function inlineMessage(form: HTMLFormElement, message: string, isError = false): void {
    let box = form.querySelector<HTMLElement>('[data-material-resource-message]');
    if (!box) {
        box = document.createElement('div');
        box.dataset.materialResourceMessage = 'true';
        const submit = form.querySelector('button[type="submit"],button:not([type])');
        submit?.insertAdjacentElement('beforebegin', box);
    }
    box.className = `mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${isError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`;
    box.textContent = message;
}

async function uploadMaterialFile(file: File): Promise<UploadResult['file']> {
    if (file.size > 4 * 1024 * 1024) throw new Error('Ukuran file maksimal 4 MB.');
    const data = new FormData();
    data.append('purpose', 'material');
    data.append('file', file);
    const response = await fetch(`/sipandu-api/classes/${classId}/files`, {
        method: 'POST', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' }, body: data,
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    return ((await response.json()) as UploadResult).file;
}

async function storeMaterialWithAttachment(form: HTMLFormElement, file: File): Promise<void> {
    const meeting = controlByLabel<HTMLSelectElement>(form, 'Pertemuan');
    const title = controlByLabel<HTMLInputElement>(form, 'Judul');
    const resourceType = controlByLabel<HTMLSelectElement>(form, 'Jenis');
    const description = controlByLabel<HTMLTextAreaElement>(form, 'Deskripsi');
    const resourceUrl = controlByLabel<HTMLInputElement>(form, 'Link materi');
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"],button:not([type])');
    if (!meeting?.value || !title?.value.trim()) { inlineMessage(form, 'Pertemuan dan judul materi wajib diisi.', true); return; }

    if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); }
    inlineMessage(form, 'Mengunggah lampiran dan menyimpan materi…');
    try {
        const uploaded = await uploadMaterialFile(file);
        const response = await fetch(`/sipandu-api/classes/${classId}/meetings/${meeting.value}/materials`, {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
            body: JSON.stringify({
                title: title.value.trim(), resource_type: resourceType?.value || 'document', description: description?.value.trim() || null,
                resource_url: resourceUrl?.value.trim() || null, attachment_url: uploaded.url, attachment_name: uploaded.name, is_published: true,
            }),
        });
        if (!response.ok) throw new Error(await errorMessage(response));
        inlineMessage(form, 'Materi berhasil disimpan. Link dan lampiran tersedia bersamaan.');
        window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
        inlineMessage(form, error instanceof Error ? error.message : 'Materi belum berhasil disimpan.', true);
        if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); }
    }
}

function enhanceMaterialForm(): void {
    const heading = Array.from(document.querySelectorAll('h3')).find((item) => item.textContent?.trim() === 'Tambah materi');
    const form = heading?.closest('form');
    if (!(form instanceof HTMLFormElement) || form.dataset.materialResourceEnhanced === 'true') return;
    form.dataset.materialResourceEnhanced = 'true';

    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    const linkInput = controlByLabel<HTMLInputElement>(form, 'Link materi');
    const fileLabel = fileInput?.closest('label');
    if (fileLabel) {
        const firstText = fileLabel.childNodes[0];
        if (firstText?.textContent?.includes('Atau upload')) firstText.textContent = 'Lampiran file (opsional, maks. 4 MB)';
    }
    if (linkInput) linkInput.placeholder = 'https://… (boleh bersama lampiran file)';

    form.addEventListener('submit', (event) => {
        const file = fileInput?.files?.[0];
        if (!file) return;
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        void storeMaterialWithAttachment(form, file);
    }, true);
}

async function fetchResources(): Promise<void> {
    if (!classId || resourceFetchBusy) return;
    resourceFetchBusy = true;
    try {
        const response = await fetch(`/sipandu-api/classes/${classId}/material-resources`, { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!response.ok) return;
        const payload = await response.json() as { resources?: MaterialResource[] };
        resources = payload.resources ?? [];
        scheduleDecorate();
    } finally {
        resourceFetchBusy = false;
    }
}

function findMaterialCard(resource: MaterialResource): HTMLElement | null {
    return Array.from(document.querySelectorAll<HTMLElement>('article')).find((article) => article.querySelector('h3')?.textContent?.trim() === resource.title && (article.textContent ?? '').includes(`Pertemuan ${resource.meeting_number}`)) ?? null;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character] ?? character);
}

function decorateMaterialCards(): void {
    resources.forEach((resource) => {
        if (!resource.attachment_url) return;
        const card = findMaterialCard(resource);
        if (!card || card.querySelector(`[data-material-attachment-id="${resource.id}"]`)) return;
        const anchor = document.createElement('a');
        anchor.href = resource.attachment_url;
        anchor.target = '_blank'; anchor.rel = 'noreferrer'; anchor.dataset.materialAttachmentId = String(resource.id);
        anchor.className = 'mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100';
        anchor.innerHTML = `<span aria-hidden="true">📎</span><span class="truncate">Lampiran: ${escapeHtml(resource.attachment_name || 'File materi')}</span>`;
        card.querySelector('h3')?.parentElement?.appendChild(anchor);
    });
}

function enhance(): void {
    enhanceMaterialForm();
    decorateMaterialCards();
}

function scheduleDecorate(): void {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => { scheduled = false; enhance(); });
}

enhance();
void fetchResources();

const root = document.querySelector('#classroom-app,#student-classroom-app');
if (root) {
    const observer = new MutationObserver(scheduleDecorate);
    observer.observe(root, { childList: true, subtree: true });
}
window.addEventListener('focus', () => void fetchResources());
window.addEventListener('sipandu:materials-changed', () => void fetchResources());
