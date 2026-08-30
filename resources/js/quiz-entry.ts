export {};

function classId(): string {
    return window.location.pathname.split('/').filter(Boolean)[1] ?? '';
}

function install(): void {
    if (document.querySelector('[data-sipandu-quiz-entry="true"]')) return;
    const taskTab = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => {
        const text = button.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        return text === 'Tugas' || text === 'Tugas Saya';
    });
    if (!taskTab?.parentElement) return;

    const link = document.createElement('a');
    link.href = `/kelas/${classId()}/kuis`;
    link.dataset.sipanduQuizEntry = 'true';
    link.textContent = 'Kuis / Ujian';
    link.className = 'inline-flex items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-extrabold text-violet-700 transition hover:bg-violet-100';
    link.title = 'Buka Kuis dan Ujian kelas';
    taskTab.insertAdjacentElement('afterend', link);
}

install();
const root = document.body;
const observer = new MutationObserver(() => requestAnimationFrame(install));
observer.observe(root, { childList: true, subtree: true });
