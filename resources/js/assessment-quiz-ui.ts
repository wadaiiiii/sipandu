export {};

let scheduled = false;

function enhance(): void {
    const quizLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/kuis?quiz="]'));
    if (quizLinks.length === 0) return;

    quizLinks.forEach((link) => {
        const article = link.closest<HTMLElement>('article');
        if (!article) return;
        article.dataset.sipanduAssessmentQuiz = 'true';

        const badgeRow = Array.from(article.querySelectorAll<HTMLElement>('div')).find((node) => {
            const text = node.textContent ?? '';
            return /Pertemuan|Sub-CPMK|KELAS/i.test(text) && node.querySelector('span');
        });
        if (badgeRow && !badgeRow.querySelector('[data-sipandu-quiz-badge]')) {
            const badge = document.createElement('span');
            badge.dataset.sipanduQuizBadge = 'true';
            badge.className = 'rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-700';
            badge.textContent = 'Kuis/Ujian';
            badgeRow.appendChild(badge);
        }

        const text = link.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        if (/Periksa sekarang/i.test(text)) {
            link.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes('Periksa sekarang')) node.textContent = node.textContent.replace('Periksa sekarang', 'Periksa kuis');
            });
        } else if (/Buka tugas/i.test(text)) {
            link.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes('Buka tugas')) node.textContent = node.textContent.replace('Buka tugas', 'Buka kuis');
            });
        }
    });

    const section = quizLinks[0]?.closest('section[aria-label="Tugas dan Penilaian"]');
    if (section) {
        Array.from(section.querySelectorAll<HTMLElement>('span')).forEach((span) => {
            if (span.textContent?.trim() === 'Tugas') span.textContent = 'Tugas & Kuis';
        });
    }
}

function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
        scheduled = false;
        enhance();
    });
}

schedule();
const root = document.getElementById('assessment-center-root') ?? document.body;
new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
