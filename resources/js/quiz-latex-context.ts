export {};

function markQuizLatexFields(): void {
    const root = document.getElementById('class-quiz-app');
    if (!root) return;

    root.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((textarea) => {
        const placeholder = textarea.placeholder.toLowerCase();
        if (placeholder.includes('latex') && !textarea.getAttribute('aria-label')) {
            textarea.setAttribute('aria-label', 'Instruksi soal kuis dengan LaTeX');
        }
    });
}

markQuizLatexFields();
const root = document.getElementById('class-quiz-app');
if (root) {
    new MutationObserver(() => requestAnimationFrame(markQuizLatexFields))
        .observe(root, { childList: true, subtree: true });
}
