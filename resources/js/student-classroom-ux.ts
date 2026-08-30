export {};

type SubmissionPolicy = {
    assignment_id: number;
    meeting_number: number;
    title: string;
    status: string;
    due_at: string | null;
    submitted_at: string | null;
    graded_at: string | null;
    score: string | number | null;
    can_submit: boolean;
    can_update: boolean;
    reason: string | null;
};

const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
let policies: SubmissionPolicy[] = [];
let policyBusy = false;
let scheduled = false;

function ensureStyles(): void {
    if (document.getElementById('sipandu-student-classroom-ux-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-student-classroom-ux-style';
    style.textContent = `
      .sipandu-student-answer{min-height:220px!important;max-height:70vh!important;resize:vertical!important;overflow:auto!important;line-height:1.7!important}
      [data-sipandu-material-state="todo"]{border:1px solid #bfdbfe!important;background:#eff6ff!important;color:#1d4ed8!important;font-weight:800!important}
      [data-sipandu-material-state="todo"]::before{content:'○';display:grid;place-items:center;width:1.35rem;height:1.35rem;border:2px solid #60a5fa;border-radius:999px;background:#fff;color:#2563eb;font-size:.7rem}
      [data-sipandu-material-state="learned"]{border:1px solid #a7f3d0!important;background:#ecfdf5!important;color:#047857!important;font-weight:800!important}
      [data-sipandu-material-state="learned"]::before{content:'✓';display:grid;place-items:center;width:1.4rem;height:1.4rem;border-radius:999px;background:#10b981;color:#fff;font-size:.72rem;font-weight:900;box-shadow:0 2px 6px rgba(5,150,105,.2)}
      [data-sipandu-learned-card="true"]{border-color:#86efac!important;background:linear-gradient(180deg,#fff 0%,#f0fdf4 100%)!important}
      .sipandu-submission-policy{margin:0 0 .8rem;display:flex;align-items:flex-start;gap:.65rem;border:1px solid;padding:.7rem .8rem;border-radius:.85rem;font:600 12px/1.55 system-ui,sans-serif}
      .sipandu-submission-policy::before{display:grid;place-items:center;flex:0 0 auto;width:1.45rem;height:1.45rem;border-radius:999px;font-size:.72rem;font-weight:900}
      .sipandu-submission-policy[data-state="open"]{border-color:#bfdbfe;background:#eff6ff;color:#1e40af}.sipandu-submission-policy[data-state="open"]::before{content:'↻';background:#2563eb;color:#fff}
      .sipandu-submission-policy[data-state="locked"]{border-color:#fed7aa;background:#fff7ed;color:#9a3412}.sipandu-submission-policy[data-state="locked"]::before{content:'🔒';background:#ffedd5;color:#9a3412}
      .sipandu-submission-policy[data-state="closed"]{border-color:#e2e8f0;background:#f8fafc;color:#475569}.sipandu-submission-policy[data-state="closed"]::before{content:'!';background:#e2e8f0;color:#475569}
      button[data-sipandu-submission-locked="true"]{cursor:not-allowed!important;background:#94a3b8!important;color:#fff!important;box-shadow:none!important}
      @media(max-width:640px){.sipandu-student-answer{min-height:180px!important;max-height:62vh!important}}
    `;
    document.head.appendChild(style);
}

function formatDue(value: string | null): string {
    if (!value) return 'selama tugas tetap dibuka dosen';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function updateLoader(): void {
    const root = document.getElementById('student-classroom-app');
    const loader = document.getElementById('student-classroom-loading');
    if (!root || !loader || root.childElementCount === 0) return;
    loader.setAttribute('data-hidden', 'true');
    window.setTimeout(() => loader.remove(), 180);
}

function replaceJournalLabel(): void {
    document.querySelectorAll<HTMLAnchorElement>('#student-classroom-app a[href*="/jurnal"]').forEach((anchor) => {
        if (/jurnal/i.test(anchor.textContent ?? '')) {
            anchor.textContent = 'Rekap Pembelajaran';
            anchor.title = 'Lihat rekap aktivitas pembelajaran kelas';
        }
    });
}

function enhanceMaterialState(): void {
    document.querySelectorAll<HTMLButtonElement>('#student-classroom-app button').forEach((button) => {
        const text = button.textContent?.trim() ?? '';
        const article = button.closest('article');

        if (text.startsWith('Sudah dipelajari')) {
            button.dataset.sipanduMaterialState = 'learned';
            button.textContent = 'Sudah dipelajari · klik untuk ubah';
            button.title = 'Klik untuk mengubah status menjadi belum selesai';
            if (article) article.setAttribute('data-sipandu-learned-card', 'true');
            return;
        }

        if (text === 'Tandai selesai' || text.startsWith('Tandai sudah dipelajari')) {
            button.dataset.sipanduMaterialState = 'todo';
            button.textContent = 'Tandai sudah dipelajari';
            button.title = 'Klik setelah materi selesai Anda pelajari';
            article?.removeAttribute('data-sipandu-learned-card');
        }
    });
}

function findAssignmentCard(policy: SubmissionPolicy): HTMLElement | null {
    return Array.from(document.querySelectorAll<HTMLElement>('#student-classroom-app article')).find((article) => {
        const heading = article.querySelector('h3')?.textContent?.trim();
        return heading === policy.title && (article.textContent ?? '').includes(`Pertemuan ${policy.meeting_number}`);
    }) ?? null;
}

function setFormLocked(form: HTMLFormElement, locked: boolean): void {
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea,input[type="file"],input[type="text"],input:not([type])').forEach((field) => { field.disabled = locked; });
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"],button:not([type])');
    if (!submit) return;
    if (locked) {
        submit.disabled = true;
        submit.dataset.sipanduSubmissionLocked = 'true';
    } else if (submit.dataset.sipanduSubmissionLocked === 'true') {
        submit.disabled = false;
        delete submit.dataset.sipanduSubmissionLocked;
    }
}

function policyMessage(policy: SubmissionPolicy): { state: 'open' | 'locked' | 'closed'; text: string } {
    const submitted = Boolean(policy.submitted_at);
    if (submitted && policy.can_update) {
        const until = policy.due_at ? `hingga ${formatDue(policy.due_at)}` : formatDue(null);
        return { state: 'open', text: `Sudah dikumpulkan. Masih dapat diperbarui ${until}, selama belum dinilai dosen.` };
    }
    if (submitted && !policy.can_update) return { state: 'locked', text: policy.reason ?? 'Jawaban sudah dikunci dan tidak dapat diperbarui.' };
    if (!submitted && !policy.can_submit) return { state: 'closed', text: policy.reason ?? 'Pengumpulan tugas sudah ditutup.' };
    return { state: 'open', text: policy.due_at ? `Batas pengumpulan ${formatDue(policy.due_at)}.` : 'Tugas dapat dikumpulkan selama masih dibuka dosen.' };
}

function decorateAssignments(): void {
    policies.forEach((policy) => {
        const card = findAssignmentCard(policy);
        if (!card) return;
        const textarea = card.querySelector<HTMLTextAreaElement>('textarea');
        if (textarea) {
            textarea.classList.add('sipandu-student-answer');
            textarea.setAttribute('aria-label', 'Jawaban tugas dan rumus LaTeX');
            textarea.title = 'Area jawaban dapat diperbesar ke bawah dengan menarik sudut kanan bawah.';
        }
        const form = textarea?.closest<HTMLFormElement>('form') ?? card.querySelector<HTMLFormElement>('form');
        if (!form) return;

        const submitted = Boolean(policy.submitted_at);
        const editable = submitted ? policy.can_update : policy.can_submit;
        setFormLocked(form, !editable);

        let box = form.querySelector<HTMLElement>('[data-sipandu-submission-policy]');
        if (!box) {
            box = document.createElement('div');
            box.dataset.sipanduSubmissionPolicy = 'true';
            box.className = 'sipandu-submission-policy';
            textarea?.insertAdjacentElement('beforebegin', box);
        }
        if (!box) return;
        const message = policyMessage(policy);
        box.dataset.state = message.state;
        box.textContent = message.text;

        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"],button:not([type])');
        if (submit && !editable) {
            submit.title = message.text;
            submit.textContent = submitted ? 'Perubahan dikunci' : 'Pengumpulan ditutup';
        }
    });
}

async function loadPolicies(): Promise<void> {
    if (!classId || policyBusy) return;
    policyBusy = true;
    try {
        const response = await fetch(`/sipandu-api/classes/${classId}/submission-policy`, { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!response.ok) return;
        const payload = await response.json() as { assignments?: SubmissionPolicy[] };
        policies = payload.assignments ?? [];
        scheduleEnhance();
    } finally {
        policyBusy = false;
    }
}

function enhance(): void {
    updateLoader();
    replaceJournalLabel();
    enhanceMaterialState();
    decorateAssignments();
}

function scheduleEnhance(): void {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => { scheduled = false; enhance(); });
}

ensureStyles();
scheduleEnhance();
void loadPolicies();

const root = document.getElementById('student-classroom-app');
if (root) {
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(root, { childList: true, subtree: true });
}

window.addEventListener('focus', () => void loadPolicies());
document.addEventListener('visibilitychange', () => { if (!document.hidden) void loadPolicies(); });
window.addEventListener('sipandu:progress-changed', () => { scheduleEnhance(); void loadPolicies(); });
window.addEventListener('sipandu:submission-changed', () => void loadPolicies());
