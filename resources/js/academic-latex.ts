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

const LATEX_CONTEXT = /(deskripsi|ringkasan|topik|aktivitas|instruksi|jawaban|feedback|pengumuman|diskusi|bahan kajian|materi|catatan pembelajaran)/i;

function ensureStyles(): void {
    if (document.getElementById('sipandu-latex-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-latex-style';
    style.textContent = `
        .sipandu-latex-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin-top:.45rem}.sipandu-latex-tools button{border:1px solid #dbeafe;border-radius:.65rem;background:#eff6ff;padding:.35rem .55rem;font:700 11px/1.1 system-ui,sans-serif;color:#1d4ed8;transition:.15s}.sipandu-latex-tools button:hover{background:#dbeafe}.sipandu-latex-hint{font:600 10px/1.3 system-ui,sans-serif;color:#64748b}.sipandu-latex-preview{margin-top:.55rem;display:none;min-height:2.75rem;border:1px dashed #bfdbfe;border-radius:.8rem;background:#f8fbff;padding:.7rem .8rem;color:#1e293b;font:400 13px/1.65 system-ui,sans-serif;overflow-x:auto}.sipandu-latex-preview[data-open="true"]{display:block}.sipandu-latex-preview mjx-container{max-width:100%;overflow-x:auto;overflow-y:hidden}
    `;
    document.head.appendChild(style);
}

function ensureMathJax(): Promise<MathJaxApi | null> {
    if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax);
    if (window.__sipanduMathJaxPromise) return window.__sipanduMathJaxPromise;

    window.MathJax = {
        tex: {
            inlineMath: [['\\(', '\\)']],
            displayMath: [['\\[', '\\]']],
            processEscapes: true,
        },
        options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        },
        startup: { typeset: true },
    } as MathJaxApi & Record<string, unknown>;

    window.__sipanduMathJaxPromise = new Promise((resolve) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-sipandu-mathjax]');
        if (existing) {
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
        // LaTeX yang belum lengkap tetap ditampilkan sebagai teks; jangan blokir input pengguna.
    }
}

function contextText(textarea: HTMLTextAreaElement): string {
    const label = textarea.closest('label');
    const field = textarea.parentElement;
    return [label?.textContent, field?.previousElementSibling?.textContent, textarea.placeholder]
        .filter(Boolean)
        .join(' ');
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
    const selected = textarea.value.slice(start, end) || (mode === 'inline' ? 'x^2 + y^2' : '\\frac{a}{b} = c');
    const replacement = mode === 'inline'
        ? `\\(${selected}\\)`
        : `\\[\n${selected}\n\\]`;
    const next = `${textarea.value.slice(0, start)}${replacement}${textarea.value.slice(end)}`;
    setReactTextareaValue(textarea, next);
    requestAnimationFrame(() => {
        const cursor = start + replacement.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
    });
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
        <span class="sipandu-latex-hint">LaTeX aktif · gunakan \\( ... \\) atau \\[ ... \\]</span>
    `;

    const preview = document.createElement('div');
    preview.className = 'sipandu-latex-preview';
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
                preview.textContent = textarea.value.trim() || 'Belum ada isi untuk dipratinjau.';
                void typeset(preview);
            }
        }
    });

    textarea.insertAdjacentElement('afterend', tools);
    tools.insertAdjacentElement('afterend', preview);
}

function enhanceTextareas(): void {
    document.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(enhanceTextarea);
}

function bodyHasRawLatex(): boolean {
    const text = document.body.textContent ?? '';
    return text.includes('\\(') || text.includes('\\[');
}

ensureStyles();
enhanceTextareas();
void ensureMathJax().then(() => {
    if (bodyHasRawLatex()) void typeset(document.body);
});

const observer = new MutationObserver(() => {
    enhanceTextareas();
});
observer.observe(document.body, { childList: true, subtree: true });

window.setInterval(() => {
    enhanceTextareas();
    if (bodyHasRawLatex()) void typeset(document.body);
}, 2200);
