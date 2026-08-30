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

function ensureStyles(): void {
    if (document.getElementById('sipandu-student-classroom-ux-style')) return;

    const style = document.createElement('style');
    style.id = 'sipandu-student-classroom-ux-style';
    style.textContent = `
        .sipandu-student-answer{min-height:220px!important;max-height:70vh!important;resize:vertical!important;overflow:auto!important;line-height:1.7!important}
        [data-sipandu-learned-card="true"]>div>button:first-child{border:2px solid #10b981!important;background:#10b981!important;color:#fff!important;box-shadow:0 0 0 5px rgba(16,185,129,.12)!important}
        [data-sipandu-learned-card="true"]>div>button:first-child svg{stroke-width:3!important}
        [data-sipandu-learned-label="true"]{display:inline-flex!important;align-items:center!important;gap:.5rem!important;border:1px solid #a7f3d0!important;background:#ecfdf5!important;color:#047857!important;font-weight:800!important}
        [data-sipandu-learned-label="true"]::before{content:'✓';display:grid;place-items:center;width:1.4rem;height:1.4rem;border-radius:999px;background:#10b981;color:#fff;font-size:.72rem;font-weight:900;box-shadow:0 2px 6px rgba(5,150,105,.2)}
        .sipandu-submission-policy{margin-top:.85rem;display:flex;align-items:flex-start;gap:.65rem;border:1px solid;padding:.7rem .8rem;border-radius:.85rem;font:600 12px/1.55 system-ui,sans-serif}
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
    if (!value) return 'selama tugas tetap dibuka oleh dosen';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function updateLoader(): void {
    const root = document.getElementById('student-classroom-app');
    const loader = document.getElementById('student-classroom-loading');
    if (!root || !loader) return;

    if (root.childElementCount > 0) {
        loader.setAttribute('data-hidden', 'true');
        window.setTimeout(() => loader.remove(), 220);
    }
}

function scheduleLoaderMessages(): void {
    const messages: Array<[number, string, string]> = [
        [900, 'Mengambil data kelas', 'Menyiapkan pertemuan, materi, dan tugas Anda…'],
        [2600, 'Menyelaraskan aktivitas belajar', 'Memeriksa progres, nilai, dan pengumuman terbaru…'],
        [5200, 'Server sedang menyiapkan kelas', 'Cold start dapat membuat pemuatan pertama sedikit lebih lama. Mohon tunggu…'],
    ];

    messages.forEach(([delay, title, detail]) => {
        window.setTimeout(() => {
            const loader = document.getElementById('student-classroom-loading');
            if (!loader || loader.getAttribute('data-hidden') === 'true') return;
            const titleNode = loader.querySelector<HTMLElement>('[data-loading-title]');
            const detailNode = loader.querySelector<HTMLElement>('[data-loading-detail]');
            if (titleNode) titleNode.textContent = title;
            if (detailNode) detailNode.textContent = detail;
        }, delay);
    });
}

function replaceJournalLabel(): void {
    document.querySelectorAll<HTMLAnchorElement>('#student-classroom-app a[href*="/jurnal"]').forEach((anchor) => {
        if (anchor.textContent?.trim() === 'Jurnal') {
            anchor.textContent = 'Rekap Pembelajaran';
            anchor.title = 'Lihat rekap aktivitas pembelajaran kelas';
        }
    });
}

function enhanceLearnedState(): void {
    document.querySelectorAll<HTMLButtonElement>('#student-classroom-app button').forEach((button) => {
        const text = button.textContent?.trim() ?? '';
        if (!text.startsWith('Sudah dipelajari')) return;

        button.dataset.sipanduLearnedLabel = 'true';
        if (button.textContent?.includes('✓')) {
            button.textContent = 'Sudah dipelajari';
        }

        const article = button.closest('article');
        if (article) article.setAttribute('data-sipandu-learned-card', 'true');
    });
}

function findAssignmentCard(policy: SubmissionPolicy): HTMLElement | null {
    return Array.from(document.querySelectorAll<HTMLElement>('#student-classroom-app article')).find((article) => {
        const heading = article.querySelector('h3')?.textContent?.trim();
        if (heading !== policy.title) return false;
        return (article.textContent ?? '').includes(`Pertemuan ${policy.meeting_number}`);
    }) ?? null;
}

function setFormLocked(form: HTMLFormElement, locked: boolean): void {
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea,input[type="file"],input[type="text"],input:not([type])').forEach((field) => {
        field.disabled = locked;
    });

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
        return {
            state: 'open',
            text: `Jawaban sudah dikumpulkan dan masih dapat diperbarui ${until}, selama belum dinilai dosen.`,
        };
    }

    if (submitted && !policy.can_update) {
        return {
            state: 'locked',
            text: policy.reason ?? 'Jawaban sudah dikunci dan tidak dapat diperbarui.',
        };
    }

    if (!submitted && !policy.can_submit) {
        return {
            state: 'closed',
            text: policy.reason ?? 'Pengumpulan tugas sudah ditutup.',
        };
    }

    const until = policy.due_at ? `Batas pengumpulan ${formatDue(policy.due_at)}.` : 'Tugas dapat dikumpulkan selama masih dibuka dosen.';
    return { state: 'open', text: until };
}

function decorateAssignments(): void {
    policies.forEach((policy) => {
        const card = findAssignmentCard(policy);
        if (!card) return;

        const textarea = card.querySelector<HTMLTextAreaElement>('textarea');
        if (textarea) {
            textarea.classList.add('sipandu-student-answer');
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
            const firstField = form.querySelector('textarea');
            firstField?.insertAdjacentElement('beforebegin', box);
        }

        const message = policyMessage(policy);
        box.dataset.state = message.state;
        box.textContent = message.text;

        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"],button:not([type])');
        if (submit && !editable) {
            submit.title = message.text;
            submit.setAttribute('aria-label', message.text);
            submit.textContent = submitted ? 'Perubahan dikunci' : 'Pengumpulan ditutup';
        }
    });
}

async function loadPolicies(): Promise<void> {
    if (!classId || policyBusy) return;
    policyBusy = true;
    try {
        const response = await fetch(`/sipandu-api/classes/${classId}/submission-policy`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const payload = await response.json() as { assignments?: SubmissionPolicy[] };
        policies = payload.assignments ?? [];
        decorateAssignments();
    } finally {
        policyBusy = false;
    }
}

function enhance(): void {
    updateLoader();
    replaceJournalLabel();
    enhanceLearnedState();
    decorateAssignments();
}

ensureStyles();
scheduleLoaderMessages();
enhance();
void loadPolicies();

const observer = new MutationObserver(() => enhance());
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('focus', () => void loadPolicies());
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void loadPolicies();
});
window.setInterval(() => void loadPolicies(), 60000);
