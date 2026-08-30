export {};

const exactUiCopy = new Map<string, string>([
    ['Pembelajaran yang otomatis terdokumentasi', 'E-Learning Resmi Prodi Matematika'],
    ['Belajar sederhana. Rekam jejak kelas terbentuk otomatis.', 'Kuliah Terstruktur. Rekam Jejak Terukur.'],
    ['Kelas, materi, tugas, Learning Timeline, dan jurnal kelas dalam satu ruang kerja yang ringan.', 'Akses materi, kuis, dan timeline kuliah di Program Studi Matematika Unsulbar kapan saja dengan mudah.'],
    ['Kelas, materi, tugas, Learning Timeline, dan rekap pembelajaran dalam satu ruang kerja yang ringan.', 'Akses materi, kuis, dan timeline kuliah di Program Studi Matematika Unsulbar kapan saja dengan mudah.'],
    ['Jurnal kelas otomatis', 'Rekap pembelajaran otomatis'],
    ['Learning Timeline, materi, tugas, peserta, dan jurnal kelas dalam satu tempat.', 'Learning Timeline, materi, tugas, peserta, dan rekap pembelajaran dalam satu tempat.'],
    ['Jurnal pelaksanaan pertemuan', 'Rekap Pembelajaran per Pertemuan'],
]);

function replaceTextNode(node: Text): void {
    const value = node.nodeValue ?? '';
    const trimmed = value.trim();
    const exact = exactUiCopy.get(trimmed);
    if (exact) {
        node.nodeValue = value.replace(trimmed, exact);
        return;
    }

    const anchor = node.parentElement?.closest<HTMLAnchorElement>('a[href*="/jurnal"]');
    if (!anchor) return;

    const next = value
        .replace(/Jurnal Kelas/gi, 'Rekap Pembelajaran')
        .replace(/\bJurnal\b/gi, 'Rekap Pembelajaran');
    if (next !== value) node.nodeValue = next;
}

function processTerminology(root: ParentNode): void {
    if (root instanceof HTMLElement && root.matches('a[href*="/jurnal"]')) {
        Array.from(root.childNodes).forEach((node) => {
            if (node instanceof Text) replaceTextNode(node);
        });
        root.title = root.title
            .replace(/Jurnal Kelas/gi, 'Rekap Pembelajaran')
            .replace(/\bJurnal\b/gi, 'Rekap Pembelajaran');
        const aria = root.getAttribute('aria-label');
        if (aria) root.setAttribute('aria-label', aria.replace(/Jurnal Kelas/gi, 'Rekap Pembelajaran').replace(/\bJurnal\b/gi, 'Rekap Pembelajaran'));
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
        if (current instanceof Text) replaceTextNode(current);
        current = walker.nextNode();
    }
}

function ensurePreviewStyles(): void {
    if (document.getElementById('sipandu-preview-state-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-preview-state-style';
    style.textContent = `
        .sipandu-latex-tools button[data-latex="preview"]{
            border-color:#c7d2fe!important;background:#eef2ff!important;color:#4338ca!important;
            box-shadow:0 1px 2px rgba(67,56,202,.08)!important
        }
        .sipandu-latex-tools button[data-latex="preview"]:hover{
            border-color:#a5b4fc!important;background:#e0e7ff!important;color:#3730a3!important
        }
        .sipandu-latex-tools button[data-latex="preview"][data-preview-state="open"]{
            border-color:#fecdd3!important;background:#fff1f2!important;color:#be123c!important;
            box-shadow:0 0 0 3px rgba(244,63,94,.08)!important
        }
        .sipandu-latex-tools button[data-latex="preview"][data-preview-state="open"]:hover{
            border-color:#fda4af!important;background:#ffe4e6!important;color:#9f1239!important
        }
        button[data-sipandu-material-delete-compact="true"]{
            gap:.35rem!important;border-radius:.75rem!important;padding:.45rem .65rem!important;
            font-size:11px!important;font-weight:700!important;line-height:1!important
        }
        button[data-sipandu-material-delete-compact="true"] svg{width:13px!important;height:13px!important}
    `;
    document.head.appendChild(style);
}

function syncPreviewButtons(root: ParentNode): void {
    const buttons: HTMLButtonElement[] = [];
    if (root instanceof HTMLButtonElement && root.matches('[data-latex="preview"]')) buttons.push(root);
    root.querySelectorAll?.<HTMLButtonElement>('.sipandu-latex-tools button[data-latex="preview"]').forEach((button) => buttons.push(button));

    buttons.forEach((button) => {
        const open = /^Tutup preview$/i.test(button.textContent?.trim() ?? '');
        button.dataset.previewState = open ? 'open' : 'closed';
        button.setAttribute('aria-pressed', open ? 'true' : 'false');
        button.title = open ? 'Tutup pratinjau rumus' : 'Buka pratinjau rumus';
    });
}

function compactMaterialDeleteButtons(root: ParentNode): void {
    const articles = new Set<HTMLElement>();
    if (root instanceof HTMLElement) {
        const ownArticle = root.matches('article') ? root : root.closest<HTMLElement>('article');
        if (ownArticle) articles.add(ownArticle);
    }
    root.querySelectorAll?.<HTMLElement>('#classroom-app article').forEach((article) => articles.add(article));

    articles.forEach((article) => {
        if (!article.querySelector('[data-sipandu-editor^="material-"]')) return;
        article.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
            if ((button.textContent?.replace(/\s+/g, ' ').trim() ?? '') !== 'Hapus') return;
            button.dataset.sipanduMaterialDeleteCompact = 'true';
        });
    });
}

function process(root: ParentNode): void {
    processTerminology(root);
    syncPreviewButtons(root);
    compactMaterialDeleteButtons(root);
}

ensurePreviewStyles();
process(document.body);
document.title = document.title
    .replace(/Jurnal Kelas/gi, 'Rekap Pembelajaran')
    .replace(/\bJurnal\b/gi, 'Rekap Pembelajaran');

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
            const parent = mutation.target.parentElement;
            if (parent) process(parent);
            return;
        }
        mutation.addedNodes.forEach((node) => {
            if (node instanceof Text) replaceTextNode(node);
            else if (node instanceof HTMLElement) process(node);
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
