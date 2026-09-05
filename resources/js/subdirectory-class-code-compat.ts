import { sipanduUrl } from './utils/sipandu-api';
export {};

type User = {
    id: number;
    role: string;
};

type CourseClass = {
    id: number;
    name: string;
    join_code: string;
    course: { name: string };
};

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function appBasePath(): string {
    const value = document.querySelector<HTMLMetaElement>('meta[name="app-base-path"]')?.content?.trim() ?? '';
    if (!value || value === '/') return '';
    return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

function appRelativePath(href: string): string {
    const url = new URL(href, window.location.origin);
    const basePath = appBasePath();
    if (basePath && (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))) {
        return url.pathname.slice(basePath.length) || '/';
    }
    return url.pathname;
}

function classIdFromLink(link: HTMLAnchorElement): number | null {
    const match = appRelativePath(link.href).match(/^\/kelas\/(\d+)\/?$/);
    return match ? Number(match[1]) : null;
}

function classLabel(name: string): string {
    const value = name.trim();
    if (!value) return 'Kelas';
    return /^kelas\s+/i.test(value) ? value : `Kelas ${value}`;
}

function copyIcon(): string {
    return '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
}

function checkIcon(): string {
    return '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>';
}

function trashIcon(): string {
    return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';
}

function makeJoinCodeChip(courseClass: CourseClass): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sipanduJoinInline = String(courseClass.id);
    button.className = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 text-xs font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 sm:rounded-2xl';
    button.setAttribute('aria-label', `Salin kode join ${courseClass.course.name}`);
    button.title = 'Klik untuk menyalin kode join';
    button.innerHTML = `<span class="text-[10px] font-bold uppercase tracking-[.08em] text-blue-500">Kode</span><code class="font-mono text-xs font-extrabold tracking-[.05em] text-[#08205d] sm:text-sm">${courseClass.join_code}</code><span data-copy-icon>${copyIcon()}</span>`;

    button.addEventListener('click', async () => {
        const icon = button.querySelector<HTMLElement>('[data-copy-icon]');
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
}

function makeDeleteButton(courseClass: CourseClass): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sipanduDeleteClass = String(courseClass.id);
    button.className = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 sm:rounded-2xl';
    button.setAttribute('aria-label', `Hapus ${courseClass.course.name} — ${classLabel(courseClass.name)}`);
    button.title = 'Hapus kelas';
    button.innerHTML = trashIcon();

    button.addEventListener('click', async () => {
        const confirmed = window.confirm(`Hapus ${courseClass.course.name} — ${classLabel(courseClass.name)}? Semua data pembelajaran kelas akan ikut terhapus.`);
        if (!confirmed) return;

        button.disabled = true;
        const response = await fetch(`/sipandu-api/classes/${courseClass.id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
        });

        if (!response.ok) {
            let message = 'Kelas belum berhasil dihapus.';
            try {
                const payload = await response.json() as { message?: string; errors?: Record<string, string[]> };
                message = Object.values(payload.errors ?? {}).flat()[0] ?? payload.message ?? message;
            } catch {
                // Pertahankan pesan fallback.
            }
            window.alert(message);
            button.disabled = false;
            return;
        }

        window.location.reload();
    });

    return button;
}

async function loadManagedClasses(): Promise<CourseClass[]> {
    const bootstrapResponse = await fetch(sipanduUrl('/sipandu-api/bootstrap'), {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });
    if (!bootstrapResponse.ok) return [];

    const bootstrap = await bootstrapResponse.json() as { user?: User | null };
    if (!bootstrap.user || !['admin_prodi', 'lecturer'].includes(bootstrap.user.role)) return [];

    const classesResponse = await fetch(sipanduUrl('/sipandu-api/classes'), {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });
    if (!classesResponse.ok) return [];

    const payload = await classesResponse.json() as { classes?: CourseClass[] };
    return payload.classes ?? [];
}

function install(initialClasses: CourseClass[]): void {
    let classes = initialClasses;
    let frame = 0;
    let refreshTimer = 0;
    let loading = false;

    const refreshClasses = () => {
        if (loading) return;
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(async () => {
            loading = true;
            try {
                classes = await loadManagedClasses();
            } finally {
                loading = false;
                sync();
            }
        }, 160);
    };

    const sync = () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
            let missingClass = false;

            document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
                const classId = classIdFromLink(link);
                if (!classId) return;

                const courseClass = classes.find((item) => item.id === classId);
                if (!courseClass) {
                    missingClass = true;
                    return;
                }

                const actions = link.parentElement;
                if (!actions) return;

                const hasJournal = Array.from(actions.querySelectorAll<HTMLAnchorElement>('a[href]')).some(
                    (candidate) => appRelativePath(candidate.href).replace(/\/$/, '') === `/kelas/${classId}/jurnal`,
                );
                if (!hasJournal) return;

                const label = (link.textContent ?? '').replace(/\s+/g, ' ').trim();
                if (label === 'Lanjutkan') link.textContent = 'Buka';
                actions.classList.add('items-center', 'flex-wrap');

                if (courseClass.join_code && !actions.querySelector(`[data-sipandu-join-inline="${classId}"]`)) {
                    actions.appendChild(makeJoinCodeChip(courseClass));
                }

                if (!actions.querySelector(`[data-sipandu-delete-class="${classId}"]`)) {
                    actions.appendChild(makeDeleteButton(courseClass));
                }
            });

            if (missingClass) refreshClasses();
        });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.getElementById('app') ?? document.body, { childList: true, subtree: true });

    window.addEventListener('focus', refreshClasses);
    window.addEventListener('sipandu:classes-changed', refreshClasses);
}

void loadManagedClasses().then(install).catch(() => undefined);



