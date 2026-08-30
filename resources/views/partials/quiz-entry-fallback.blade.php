<script id="sipandu-quiz-entry-fallback">
(() => {
    if (window.__sipanduQuizEntryFallback) return;
    window.__sipanduQuizEntryFallback = true;

    const basePath = (() => {
        const value = document.querySelector('meta[name="app-base-path"]')?.getAttribute('content')?.trim() || '';
        if (!value || value === '/') return '';
        return `/${value.replace(/^\/+|\/+$/g, '')}`;
    })();

    const classId = () => {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const index = parts.lastIndexOf('kelas');
        return index >= 0 ? (parts[index + 1] || '') : '';
    };

    const targetUrl = () => `${basePath}/kelas/${classId()}/kuis`;

    const icon = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"/><path d="M12 18h.01"/></svg>';

    const install = () => {
        if (!classId()) return;
        if (document.querySelector('[data-sipandu-quiz-entry="true"]')) return;

        const scope = document.querySelector('#classroom-app') || document.querySelector('#student-classroom-app');
        if (!scope) return;

        const buttons = Array.from(scope.querySelectorAll('button'));
        const taskButton = buttons.find((button) => {
            const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            return text === 'tugas' || text === 'tugas saya' || text.includes('tugas');
        });

        const tabRow = taskButton?.parentElement || buttons.find((button) => {
            const text = (button.textContent || '').trim().toLowerCase();
            return text === 'materi' || text === 'presensi';
        })?.parentElement;
        if (!tabRow) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.sipanduQuizEntry = 'true';
        button.className = 'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700';
        button.innerHTML = `${icon}<span>Kuis/Ujian</span>`;
        button.title = 'Buka Kuis dan Ujian kelas';
        button.setAttribute('aria-label', 'Buka Kuis dan Ujian kelas');
        button.addEventListener('click', () => {
            window.location.href = targetUrl();
        });

        if (taskButton) taskButton.insertAdjacentElement('afterend', button);
        else tabRow.appendChild(button);
    };

    install();
    const observer = new MutationObserver(() => requestAnimationFrame(install));
    observer.observe(document.body, { childList: true, subtree: true });
})();
</script>
