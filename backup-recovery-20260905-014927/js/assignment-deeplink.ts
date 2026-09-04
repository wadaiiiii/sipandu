export {};

const params = new URLSearchParams(window.location.search);
const assignmentId = Number(params.get('assignment') ?? 0);
const requestedTab = params.get('tab');
const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';

if (requestedTab === 'assignments' && assignmentId > 0 && /^\d+$/.test(classId)) {
    void focusAssignment();
}

async function focusAssignment(): Promise<void> {
    let title = '';
    let meetingNumber: number | null = null;

    try {
        const response = await fetch(`/sipandu-api/classes/${classId}/meetings`, {
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
        });
        if (response.ok) {
            const payload = await response.json() as {
                meetings?: Array<{ meeting_number: number; assignments?: Array<{ id: number; title: string }> }>;
            };
            for (const meeting of payload.meetings ?? []) {
                const assignment = meeting.assignments?.find((item) => item.id === assignmentId);
                if (!assignment) continue;
                title = assignment.title;
                meetingNumber = meeting.meeting_number;
                break;
            }
        }
    } catch {
        // Deep link tetap mencoba membuka tab tugas walau metadata belum tersedia.
    }

    const start = Date.now();
    const openTab = window.setInterval(() => {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
        const tabButton = buttons.find((button) => {
            const text = button.textContent?.replace(/\s+/g, ' ').trim() ?? '';
            return text === 'Tugas' || text === 'Tugas Saya';
        });
        if (!tabButton) {
            if (Date.now() - start > 8000) window.clearInterval(openTab);
            return;
        }

        tabButton.click();
        window.clearInterval(openTab);
        window.setTimeout(() => locateCard(title, meetingNumber), 180);
    }, 120);
}

function locateCard(title: string, meetingNumber: number | null): void {
    const started = Date.now();
    const timer = window.setInterval(() => {
        const headings = Array.from(document.querySelectorAll<HTMLElement>('h2,h3,h4'));
        const heading = headings.find((item) => {
            const text = item.textContent?.replace(/\s+/g, ' ').trim() ?? '';
            return title ? text === title : false;
        });

        const card = heading?.closest<HTMLElement>('article') ?? heading?.closest<HTMLElement>('section,div');
        const meetingMatches = !meetingNumber || !card || (card.textContent ?? '').includes(`Pertemuan ${meetingNumber}`);
        if (card && meetingMatches) {
            window.clearInterval(timer);
            card.dataset.sipanduAssignmentFocus = 'true';
            card.style.scrollMarginTop = '7rem';
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            window.setTimeout(() => delete card.dataset.sipanduAssignmentFocus, 3500);
            ensureStyle();
            return;
        }

        if (Date.now() - started > 7000) window.clearInterval(timer);
    }, 140);
}

function ensureStyle(): void {
    if (document.getElementById('sipandu-assignment-deeplink-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-assignment-deeplink-style';
    style.textContent = `
        [data-sipandu-assignment-focus="true"]{outline:3px solid #93c5fd!important;outline-offset:3px!important;box-shadow:0 0 0 7px rgba(219,234,254,.75),0 20px 45px rgba(37,99,235,.12)!important;transition:.25s!important}
    `;
    document.head.appendChild(style);
}


