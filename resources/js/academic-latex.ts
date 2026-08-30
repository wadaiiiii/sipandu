export {};

type MathJaxApi = {
    typesetPromise?: (elements?: Element[]) => Promise<void>;
    typesetClear?: (elements?: Element[]) => void;
};

declare global {
    interface Window {
        MathJax?: MathJaxApi & Record<string, unknown>;
        __sipanduMathJaxPromise?: Promise<MathJaxApi | null>;
    }
}

const LATEX_CONTEXT = /(deskripsi|ringkasan|topik|aktivitas|instruksi|jawaban|feedback|pengumuman|diskusi|bahan kajian|materi|catatan pembelajaran|tugas|respons|komentar)/i;
const RENDERABLE_SELECTOR = 'p,li,td,th,blockquote,h1,h2,h3,h4,[data-sipandu-latex-render]';

function ensureStyles(): void {
    if (document.getElementById('sipandu-latex-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-latex-style';
    style.textContent = `
        .sipandu-latex-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin-top:.45rem}
        .sipandu-latex-tools button{border:1px solid #dbeafe;border-radius:.65rem;background:#eff6ff;padding:.35rem .58rem;font:700 11px/1.1 system-ui,sans-serif;color:#1d4ed8;transition:.15s}
        .sipandu-latex-tools button:hover{background:#dbeafe}
        .sipandu-latex-preview{margin-top:.55rem;display:none;min-height:2.75rem;border:1px dashed #bfdbfe;border-radius:.8rem;background:#f8fbff;padding:.8rem .9rem;color:#1e293b;font:400 13px/1.7 system-ui,sans-serif;overflow-x:auto;white-space:pre-wrap}
        .sipandu-latex-preview[data-open="true"]{display:block}
        .sipandu-latex-preview mjx-container{max-width:100%;overflow-x:auto;overflow-y:hidden}
    `;
    document.head.appendChild(style);
}

function ensureMathJax(): Promise<MathJaxApi | null> {
    if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax);
    if (window.__sipanduMathJaxPromise) return window.__sipanduMathJaxPromise;

    window.MathJax = {
        tex: {
            inlineMath: [['\\(', '\\)'], ['$', '$']],
            displayMath: [['\\[', '\\]'], ['$$', '$$']],
            processEscapes: true,
        },
        options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        },
        startup: { typeset: false },
    } as MathJaxApi & Record<string, unknown>;

    window.__sipanduMathJaxPromise = new Promise((resolve) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-sipandu-mathjax]');
        if (existing) {
            if (window.MathJax?.typesetPromise) {
                resolve(window.MathJax);
                return;
            }
            existing.addEventListener('load', () => resolve(window.MathJax ?? null), { once: true });
            existing.addEventListener('error', () => resolve(null), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        script.async = true;
        script.dataset.sipanduMathjax = 'true';
        script.onload = () => resolve(window.MathJax ?? null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });

    return window.__sipanduMathJaxPromise;
}

async function typeset(element: Element): Promise<void> {
    const mathJax = await ensureMathJax();
    if (!mathJax?.typesetPromise) return;
    try {
        mathJax.typesetClear?.([element]);
        await mathJax.typesetPromise([element]);
    } catch {
        // Input LaTeX yang belum lengkap tetap ditampilkan sebagai teks.
    }
}

function contextText(textarea: HTMLTextAreaElement): string {
    const label = textarea.closest('label');
    const field = textarea.parentElement;
    const nearby = textarea.closest('form,article,section')?.textContent?.slice(0, 500) ?? '';
    return [
        label?.textContent,
        field?.previousElementSibling?.textContent,
        textarea.placeholder,
        textarea.getAttribute('aria-label'),
        textarea.name,
        nearby,
    ].filter(Boolean).join(' ');
}

function setReactTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(textarea, value);
    else textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

function insertLatex(textarea: HTMLTextAreaElement, mode: 'inline' | 'display'): void {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const selected = textarea.value.slice(start, end) || (mode === 'inline' ? 'x^2 + y^2' : '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
    const replacement = mode === 'inline' ? `\\(${selected}\\)` : `\\[\n${selected}\n\\]`;
    const next = `${textarea.value.slice(0, start)}${replacement}${textarea.value.slice(end)}`;
    setReactTextareaValue(textarea, next);
    requestAnimationFrame(() => {
        const cursor = start + replacement.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
    });
}

function decodeSpacingEntities(value: string): string {
    return value.replace(/&#x20;|&#32;|&nbsp;/gi, ' ').replace(/\r\n?/g, '\n');
}

function containsMathDelimiter(value: string): boolean {
    return /\\\(|\\\[|\$\$|\$[^$\n]+\$|\\begin\s*\{/i.test(value);
}

function looksLikeStandaloneFormula(value: string): boolean {
    const text = value.trim();
    if (!text || containsMathDelimiter(text)) return false;
    if (/^\\(?:frac|sqrt|sum|prod|int|lim|left|vec|mathbf|mathrm|mathbb|sin|cos|tan|log|ln)\b/.test(text)) return true;
    return /^[A-Za-z]\s*=/.test(text) && /[\^_+\-*/=]/.test(text) && !/[.!?]\s+[A-Za-z]/.test(text);
}

function normalizeLatexSource(value: string, autoWrapStandalone = true): string {
    let text = decodeSpacingEntities(value).trim();
    if (!text) return text;

    text = text.replace(/\\\\([\[\]\(\)])/g, '\\$1');

    const documentBody = text.match(/\\begin\s*\{\s*document\s*\}([\s\S]*?)\\end\s*\{\s*document\s*\}/i);
    if (documentBody?.[1] !== undefined) {
        text = documentBody[1].trim();
    } else {
        text = text
            .replace(/\\documentclass(?:\s*\[[^\]]*\])?\s*\{[^}]*\}\s*/gi, '')
            .replace(/\\usepackage(?:\s*\[[^\]]*\])?\s*\{[^}]*\}\s*/gi, '')
            .replace(/\\begin\s*\{\s*document\s*\}/gi, '')
            .replace(/\\end\s*\{\s*document\s*\}/gi, '')
            .trim();
    }

    text = text
        .replace(/\\begin\s*\{\s*(?:equation\*?|displaymath)\s*\}/gi, '\\[')
        .replace(/\\end\s*\{\s*(?:equation\*?|displaymath)\s*\}/gi, '\\]')
        .replace(/\\begin\s*\{\s*align\*?\s*\}/gi, '\\[\\begin{aligned}')
        .replace(/\\end\s*\{\s*align\*?\s*\}/gi, '\\end{aligned}\\]')
        .trim();

    return autoWrapStandalone && looksLikeStandaloneFormula(text) ? `\\[\n${text}\n\\]` : text;
}

function hasLatexSyntax(value: string): boolean {
    return /\\(?:documentclass|begin\s*\{|\(|\[|frac\b|sqrt\b|sum\b|prod\b|int\b|pm\b|alpha\b|beta\b|gamma\b)|\$\$|\$[^$\n]+\$/i.test(value)
        || looksLikeStandaloneFormula(value);
}

function normalizeMathTextNodes(element: HTMLElement): boolean {
    if (element.querySelector('mjx-container')) return false;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
        if (current instanceof Text) nodes.push(current);
        current = walker.nextNode();
    }

    let containsMath = false;
    nodes.forEach((node) => {
        const parent = node.parentElement;
        if (!parent || parent.closest('textarea,script,style,pre,code,.sipandu-latex-tools')) return;
        const raw = node.nodeValue ?? '';
        if (!hasLatexSyntax(raw)) return;
        const normalized = normalizeLatexSource(raw, true);
        if (normalized !== raw) node.nodeValue = normalized;
        containsMath = true;
    });

    return containsMath;
}

async function renderMathInDocument(): Promise<void> {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(RENDERABLE_SELECTOR));
    for (const element of elements) {
        if (element.classList.contains('sipandu-latex-preview')) continue;
        if (!normalizeMathTextNodes(element)) continue;
        await typeset(element);
    }
}

function enhanceTextarea(textarea: HTMLTextAreaElement): void {
    if (textarea.dataset.sipanduLatexEnhanced === 'true') return;
    if (!LATEX_CONTEXT.test(contextText(textarea))) return;

    textarea.dataset.sipanduLatexEnhanced = 'true';
    const tools = document.createElement('div');
    tools.className = 'sipandu-latex-tools';
    tools.innerHTML = `
        <button type="button" data-latex="inline" title="Sisipkan persamaan inline">∑ Rumus inline</button>
        <button type="button" data-latex="display" title="Sisipkan persamaan blok">ƒ Persamaan blok</button>
        <button type="button" data-latex="preview" title="Lihat pratinjau rumus">Preview</button>
    `;

    const preview = document.createElement('div');
    preview.className = 'sipandu-latex-preview';
    preview.dataset.sipanduLatexRender = 'true';
    preview.setAttribute('aria-live', 'polite');

    tools.addEventListener('click', (event) => {
        const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-latex]') : null;
        if (!button) return;
        const action = button.dataset.latex;
        if (action === 'inline' || action === 'display') {
            insertLatex(textarea, action);
            return;
        }
        if (action === 'preview') {
            const open = preview.dataset.open !== 'true';
            preview.dataset.open = open ? 'true' : 'false';
            button.textContent = open ? 'Tutup preview' : 'Preview';
            if (open) {
                preview.textContent = normalizeLatexSource(textarea.value, true) || 'Belum ada isi untuk dipratinjau.';
                void typeset(preview);
            }
        }
    });

    textarea.insertAdjacentElement('afterend', tools);
    tools.insertAdjacentElement('afterend', preview);
}

function enhanceTextareas(root: ParentNode = document): void {
    root.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(enhanceTextarea);
}

let renderQueued = false;
function queueDocumentRender(): void {
    if (renderQueued) return;
    renderQueued = true;
    window.setTimeout(() => {
        renderQueued = false;
        void renderMathInDocument();
    }, 180);
}

ensureStyles();
enhanceTextareas();
queueDocumentRender();

const observer = new MutationObserver((records) => {
    let shouldRender = false;
    records.forEach((record) => {
        record.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.matches('textarea')) enhanceTextarea(node as HTMLTextAreaElement);
            enhanceTextareas(node);
            if (node.matches(RENDERABLE_SELECTOR) || node.querySelector(RENDERABLE_SELECTOR)) shouldRender = true;
        });
    });
    if (shouldRender) queueDocumentRender();
});
observer.observe(document.body, { childList: true, subtree: true });
