export {};

type User = {
    id: number;
    role: string;
};

type CourseClass = {
    id: number;
    join_code: string;
    course: { name: string };
};

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

function copyIcon(): string {
    return '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
}

function checkIcon(): string {
    return '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>';
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

async function loadManagedClasses(): Promise<CourseClass[]> {
    const bootstrapResponse = await fetch('/sipandu-api/bootstrap', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });
    if (!bootstrapResponse.ok) return [];

    const bootstrap = await bootstrapResponse.json() as { user?: User | null };
    if (!bootstrap.user || !['admin_prodi', 'lecturer'].includes(bootstrap.user.role)) return [];

    const classesResponse = await fetch('/sipandu-api/classes', {
        credentials: 'include',
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
        }, 180);
    };

    const sync = () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
            let missingClass = false;

            document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
                const classId = classIdFromLink(link);
                if (!classId) return;

                const courseClass = classes.find((item) => item.id === classId);
                if (!courseClass?.join_code) {
                    missingClass = true;
                    return;
                }

                const actions = link.parentElement;
                if (!actions) return;

                const hasJournal = Array.from(actions.querySelectorAll<HTMLAnchorElement>('a[href]')).some(
                    (candidate) => appRelativePath(candidate.href).replace(/\/$/, '') === `/kelas/${classId}/jurnal`,
                );
                if (!hasJournal) return;

                if (!actions.querySelector(`[data-sipandu-join-inline="${classId}"]`)) {
                    actions.appendChild(makeJoinCodeChip(courseClass));
                }
            });

            if (missingClass) refreshClasses();
        });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.getElementById('app') ?? document.body, { childList: true, subtree: true });
}

void loadManagedClasses().then(install).catch(() => undefined);
