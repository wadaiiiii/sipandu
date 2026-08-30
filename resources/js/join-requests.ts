export {};

type BootstrapPayload = {
    user: { id: number; role: string } | null;
};

type JoinMember = {
    id: number;
    membership_role: string;
    status: string;
    requested_at?: string | null;
    user: {
        id: number;
        name: string;
        email: string;
        identity_number: string | null;
    };
};

type ClassItem = {
    id: number;
    members: JoinMember[];
};

type ClassListPayload = {
    classes?: ClassItem[];
};

type PeopleMode = 'active' | 'requests';

const match = window.location.pathname.match(/\/kelas\/(\d+)(?:\/|$)/);
const classId = match ? Number(match[1]) : null;
let viewerRole = '';
let pendingRequests: JoinMember[] = [];
let activeStudents = 0;
let peopleMode: PeopleMode = 'active';
let scheduled = false;
let loading = false;

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    headers.set('Accept', 'application/json');
    if (init.method && init.method !== 'GET') {
        headers.set('X-CSRF-TOKEN', csrf());
    }
    return fetch(path, { credentials: 'include', ...init, headers });
}

function formatDate(value?: string | null): string {
    if (!value) return 'Baru saja';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Baru saja';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M';
}

function textButton(label: string, active: boolean): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = active
        ? 'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm'
        : 'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-blue-700';
    button.textContent = label;
    return button;
}

function badge(count: number): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white';
    span.textContent = String(count);
    return span;
}

function findPeopleTab(): HTMLButtonElement | null {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('#classroom-app button'))
        .find((button) => button.textContent?.trim().startsWith('Peserta')) ?? null;
}

function findStudentSection(): HTMLElement | null {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('#classroom-app section'));
    return sections.find((section) => {
        const heading = section.querySelector('h3');
        return /peserta aktif/i.test(heading?.textContent ?? '');
    }) ?? null;
}

function directActiveList(section: HTMLElement): HTMLElement | null {
    return Array.from(section.children)
        .find((child) => child instanceof HTMLElement && child.classList.contains('mt-5') && child.classList.contains('space-y-3')) as HTMLElement | null;
}

function decorateTopTab(): void {
    const button = findPeopleTab();
    if (!button) return;

    const existing = button.querySelector<HTMLElement>('[data-sipandu-join-badge]');
    if (pendingRequests.length === 0) {
        existing?.remove();
        return;
    }

    if (existing) {
        const next = String(pendingRequests.length);
        if (existing.textContent !== next) existing.textContent = next;
        return;
    }

    const count = badge(pendingRequests.length);
    count.dataset.sipanduJoinBadge = 'true';
    button.appendChild(count);
}

function buildRequestCard(member: JoinMember): HTMLElement {
    const card = document.createElement('article');
    card.className = 'rounded-2xl border border-amber-100 bg-amber-50/50 p-4';

    const row = document.createElement('div');
    row.className = 'flex flex-col gap-3 sm:flex-row sm:items-center';

    const avatar = document.createElement('div');
    avatar.className = 'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white';
    avatar.textContent = initials(member.user.name);

    const info = document.createElement('div');
    info.className = 'min-w-0 flex-1';
    const name = document.createElement('p');
    name.className = 'truncate text-sm font-bold text-slate-900';
    name.textContent = member.user.name;
    const identity = document.createElement('p');
    identity.className = 'mt-0.5 truncate text-xs font-semibold text-slate-500';
    identity.textContent = member.user.identity_number || member.user.email;
    const email = document.createElement('p');
    email.className = 'mt-0.5 truncate text-xs text-slate-400';
    email.textContent = member.user.email;
    const time = document.createElement('p');
    time.className = 'mt-1 text-[11px] text-amber-700';
    time.textContent = `Meminta bergabung · ${formatDate(member.requested_at)}`;
    info.append(name, identity, email, time);

    const actions = document.createElement('div');
    actions.className = 'flex shrink-0 gap-2';

    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'min-h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50';
    reject.textContent = 'Tolak';

    const approve = document.createElement('button');
    approve.type = 'button';
    approve.className = 'min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50';
    approve.textContent = 'Terima';

    const process = async (decision: 'approve' | 'reject') => {
        if (!classId) return;
        approve.disabled = true;
        reject.disabled = true;
        approve.textContent = decision === 'approve' ? 'Menerima…' : 'Terima';
        reject.textContent = decision === 'reject' ? 'Menolak…' : 'Tolak';

        const response = await api(`/sipandu-api/classes/${classId}/join-requests/${member.id}/${decision}`, { method: 'PATCH' });
        if (!response.ok) {
            let message = 'Permintaan belum dapat diproses.';
            try {
                const payload = await response.json();
                message = String(Object.values(payload.errors ?? {}).flat()[0] ?? payload.message ?? message);
            } catch {
                // Keep fallback message.
            }
            window.alert(message);
            approve.disabled = false;
            reject.disabled = false;
            approve.textContent = 'Terima';
            reject.textContent = 'Tolak';
            return;
        }

        sessionStorage.setItem(`sipandu:open-people:${classId}`, '1');
        window.location.reload();
    };

    reject.addEventListener('click', () => void process('reject'));
    approve.addEventListener('click', () => void process('approve'));
    actions.append(reject, approve);
    row.append(avatar, info, actions);
    card.appendChild(row);
    return card;
}

function renderPeoplePanel(): void {
    if (!['lecturer', 'admin_prodi'].includes(viewerRole)) return;
    const section = findStudentSection();
    if (!section) return;

    let panel = section.querySelector<HTMLElement>('[data-sipandu-join-requests-panel]');
    if (!panel) {
        panel = document.createElement('div');
        panel.dataset.sipanduJoinRequestsPanel = 'true';
        panel.className = 'mt-4';
        const headingBlock = section.firstElementChild;
        if (headingBlock) headingBlock.insertAdjacentElement('afterend', panel);
        else section.prepend(panel);
    }

    const form = Array.from(section.children).find((child) => child.tagName === 'FORM') as HTMLElement | undefined;
    const activeList = directActiveList(section);
    const desiredDisplay = peopleMode === 'requests' ? 'none' : '';
    if (form && form.style.display !== desiredDisplay) form.style.display = desiredDisplay;
    if (activeList && activeList.style.display !== desiredDisplay) activeList.style.display = desiredDisplay;

    const signature = `${peopleMode}|${activeStudents}|${pendingRequests.map((member) => member.id).join(',')}`;
    if (panel.dataset.renderSignature === signature) return;
    panel.dataset.renderSignature = signature;
    panel.replaceChildren();

    const switcher = document.createElement('div');
    switcher.className = 'grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1';
    const activeButton = textButton(`Peserta Aktif (${activeStudents})`, peopleMode === 'active');
    const requestButton = textButton('Permintaan Bergabung', peopleMode === 'requests');
    if (pendingRequests.length > 0) requestButton.appendChild(badge(pendingRequests.length));

    activeButton.addEventListener('click', () => {
        peopleMode = 'active';
        renderPeoplePanel();
    });
    requestButton.addEventListener('click', () => {
        peopleMode = 'requests';
        renderPeoplePanel();
    });
    switcher.append(activeButton, requestButton);
    panel.appendChild(switcher);

    if (peopleMode === 'active') return;

    const content = document.createElement('div');
    content.className = 'mt-4 space-y-3';
    if (pendingRequests.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center';
        const title = document.createElement('p');
        title.className = 'text-sm font-bold text-slate-700';
        title.textContent = 'Tidak ada permintaan bergabung';
        const description = document.createElement('p');
        description.className = 'mt-1 text-xs leading-5 text-slate-400';
        description.textContent = 'Mahasiswa yang menggunakan kode kelas dan belum ada di daftar peserta akan muncul di sini.';
        empty.append(title, description);
        content.appendChild(empty);
    } else {
        pendingRequests.forEach((member) => content.appendChild(buildRequestCard(member)));
    }
    panel.appendChild(content);
}

function scheduleRender(): void {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
        scheduled = false;
        decorateTopTab();
        renderPeoplePanel();

        if (classId && sessionStorage.getItem(`sipandu:open-people:${classId}`) === '1') {
            const tab = findPeopleTab();
            if (tab) {
                sessionStorage.removeItem(`sipandu:open-people:${classId}`);
                peopleMode = 'requests';
                tab.click();
            }
        }
    });
}

async function load(): Promise<void> {
    if (!classId || loading) return;
    loading = true;
    try {
        const bootstrapResponse = await api('/sipandu-api/bootstrap');
        if (!bootstrapResponse.ok) return;
        const bootstrap = (await bootstrapResponse.json()) as BootstrapPayload;
        viewerRole = bootstrap.user?.role ?? '';
        if (!['lecturer', 'admin_prodi'].includes(viewerRole)) return;

        const classesResponse = await api('/sipandu-api/classes');
        if (!classesResponse.ok) return;
        const classes = (await classesResponse.json()) as ClassListPayload;
        const courseClass = classes.classes?.find((item) => item.id === classId);
        const members = courseClass?.members ?? [];
        pendingRequests = members.filter((member) => member.membership_role === 'student' && member.status === 'pending');
        activeStudents = members.filter((member) => member.membership_role === 'student' && member.status === 'active').length;
        scheduleRender();
    } finally {
        loading = false;
    }
}

if (classId) {
    void load();
    const root = document.getElementById('classroom-app');
    const observer = new MutationObserver(scheduleRender);
    if (root) observer.observe(root, { childList: true, subtree: true });
}
