export {};

function appBasePath(): string {
    const value = document.querySelector<HTMLMetaElement>('meta[name="app-base-path"]')?.content?.trim() ?? '';
    if (!value || value === '/') return '';
    return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

function appUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${appBasePath()}${normalized}`;
}

function classId(): string {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const classSegment = segments.lastIndexOf('kelas');
    return classSegment >= 0 ? (segments[classSegment + 1] ?? '') : '';
}

function quizIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"/><path d="M12 18h.01"/></svg>';
}

function install(): void {
    const existing = document.querySelector<HTMLElement>('[data-sipandu-quiz-entry="true"]');
    if (existing?.isConnected) return;

    const taskTab = Array.from(document.querySelectorAll<HTMLButtonElement>('#classroom-app button, #student-classroom-app button')).find((button) => {
        const text = button.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        return text === 'Tugas' || text === 'Tugas Saya';
    });
    if (!taskTab?.parentElement) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sipanduQuizEntry = 'true';
    button.className = 'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700';
    button.innerHTML = `${quizIcon()}<span>Kuis/Ujian</span>`;
    button.title = 'Buka Kuis dan Ujian kelas';
    button.setAttribute('aria-label', 'Buka Kuis dan Ujian kelas');
    button.addEventListener('click', () => {
        const id = classId();
        if (id) window.location.href = appUrl(`/kelas/${id}/kuis`);
    });

    taskTab.insertAdjacentElement('afterend', button);
}

install();
const observer = new MutationObserver(() => requestAnimationFrame(install));
observer.observe(document.body, { childList: true, subtree: true });
