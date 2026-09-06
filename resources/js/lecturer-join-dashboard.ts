import { sipanduUrl } from './utils/sipandu-api';
export {};

type BootstrapPayload = {
    user: { id: number; role: string } | null;
};

type JoinMember = {
    id: number;
    membership_role: string;
    status: string;
    user: {
        id: number;
        name: string;
        email: string;
        identity_number: string | null;
    };
};

type CourseClass = {
    id: number;
    name: string;
    course: {
        code: string;
        name: string;
    };
    members: JoinMember[];
};

type PendingRequest = {
    membership: JoinMember;
    courseClass: CourseClass;
};

let requests: PendingRequest[] = [];
let lastSignature = '';
let refreshInFlight = false;
let scheduled = false;

function appUrl(path: string): string {
    const basePath = document.querySelector<HTMLMetaElement>('meta[name="app-base-path"]')?.content?.replace(/\/+$/, '') ?? '';
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${basePath}${normalized}` || '/';
}

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'M';
}

function classLabel(courseClass: CourseClass): string {
    return `${courseClass.course.name} — Kelas ${courseClass.name}`;
}

function reviewRequest(courseClassId: number): void {
    sessionStorage.setItem(`sipandu:open-people:${courseClassId}`, '1');
    window.location.href = appUrl(`/kelas/${courseClassId}`);
}

function removeInjected(): void {
    document.querySelector('[data-sipandu-join-dashboard]')?.remove();
    document.querySelector('[data-sipandu-join-sidebar-badge]')?.remove();
    document.querySelector('[data-sipandu-join-bell-badge]')?.remove();
}

function makeBadge(count: number, location: 'sidebar' | 'bell'): HTMLSpanElement {
    const badge = document.createElement('span');
    badge.textContent = count > 9 ? '9+' : String(count);

    if (location === 'sidebar') {
        badge.dataset.sipanduJoinSidebarBadge = 'true';
        badge.className = 'ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-[#08205d] shadow-sm';
    } else {
        badge.dataset.sipanduJoinBellBadge = 'true';
        badge.className = 'absolute -bottom-1.5 -left-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-extrabold text-[#08205d] ring-2 ring-white';
    }

    return badge;
}

function decorateNavigation(): void {
    document.querySelector('[data-sipandu-join-sidebar-badge]')?.remove();
    document.querySelector('[data-sipandu-join-bell-badge]')?.remove();

    if (requests.length === 0) return;

    const classMenu = Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('Kelas Saya'));
    if (classMenu) classMenu.appendChild(makeBadge(requests.length, 'sidebar'));

    const bellButton = document.querySelector<HTMLButtonElement>('button[aria-label="Notifikasi"]');
    if (bellButton) {
        bellButton.appendChild(makeBadge(requests.length, 'bell'));
        bellButton.setAttribute('aria-label', `Notifikasi · ${requests.length} permintaan bergabung menunggu`);
        bellButton.title = `${requests.length} permintaan bergabung menunggu persetujuan`;
    }
}

function requestRow(request: PendingRequest): HTMLElement {
    const row = document.createElement('article');
    row.className = 'flex flex-col gap-3 rounded-2xl border border-amber-100 bg-white/90 p-3.5 shadow-sm sm:flex-row sm:items-center';

    const avatar = document.createElement('div');
    avatar.className = 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-[11px] font-extrabold text-white';
    avatar.textContent = initials(request.membership.user.name);

    const info = document.createElement('div');
    info.className = 'min-w-0 flex-1';

    const name = document.createElement('p');
    name.className = 'truncate text-sm font-bold text-slate-900';
    name.textContent = request.membership.user.name;

    const identity = document.createElement('p');
    identity.className = 'mt-0.5 truncate text-xs font-semibold text-slate-500';
    identity.textContent = request.membership.user.identity_number || request.membership.user.email;

    const target = document.createElement('p');
    target.className = 'mt-1 truncate text-[11px] text-slate-400';
    target.textContent = `${request.courseClass.course.code} · ${classLabel(request.courseClass)}`;

    info.append(name, identity, target);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#08205d] px-4 text-xs font-bold text-white transition hover:bg-blue-700';
    button.textContent = 'Tinjau';
    button.addEventListener('click', () => reviewRequest(request.courseClass.id));

    row.append(avatar, info, button);
    return row;
}

function buildDashboardCard(): HTMLElement {
    const classesWaiting = new Set(requests.map((request) => request.courseClass.id)).size;
    const card = document.createElement('section');
    card.dataset.sipanduJoinDashboard = 'true';
    card.className = 'overflow-hidden rounded-[28px] border border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#fff_54%,#eff6ff_100%)] shadow-sm shadow-amber-100/60';

    const header = document.createElement('div');
    header.className = 'flex flex-col gap-4 border-b border-amber-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'flex items-start gap-3';

    const icon = document.createElement('div');
    icon.className = 'grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-[10px] font-black tracking-wide text-[#08205d] shadow-sm';
    icon.textContent = 'JOIN';

    const text = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'text-xs font-bold uppercase tracking-[.16em] text-amber-700';
    eyebrow.textContent = 'Perlu Persetujuan';
    const title = document.createElement('h2');
    title.className = 'mt-0.5 text-xl font-bold text-slate-950';
    title.textContent = `${requests.length} mahasiswa menunggu persetujuan`;
    const description = document.createElement('p');
    description.className = 'mt-1 text-sm leading-6 text-slate-500';
    description.textContent = `Permintaan berasal dari ${classesWaiting} kelas. Tinjau sebelum mahasiswa memperoleh akses kelas.`;
    text.append(eyebrow, title, description);
    titleWrap.append(icon, text);

    const count = document.createElement('div');
    count.className = 'inline-flex w-fit items-center gap-2 rounded-2xl border border-amber-200 bg-white px-3.5 py-2 text-xs font-bold text-amber-800 shadow-sm';
    count.innerHTML = `<span class="grid h-6 min-w-6 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-black text-[#08205d]">${requests.length}</span><span>Menunggu</span>`;

    header.append(titleWrap, count);

    const list = document.createElement('div');
    list.className = 'grid gap-3 p-4 sm:p-5 lg:grid-cols-2';
    requests.slice(0, 4).forEach((request) => list.appendChild(requestRow(request)));

    if (requests.length > 4) {
        const more = document.createElement('p');
        more.className = 'px-5 pb-5 text-xs font-semibold text-amber-800';
        more.textContent = `+${requests.length - 4} permintaan lainnya. Buka kelas terkait untuk meninjau seluruh permintaan.`;
        card.append(header, list, more);
    } else {
        card.append(header, list);
    }

    return card;
}

function render(): void {
    decorateNavigation();

    const existing = document.querySelector<HTMLElement>('[data-sipandu-join-dashboard]');
    if (requests.length === 0) {
        existing?.remove();
        return;
    }

    const todayHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2'))
        .find((heading) => heading.textContent?.trim() === 'Apa yang perlu diperhatikan?');
    const todaySection = todayHeading?.closest('section');
    if (!todaySection?.parentElement) return;

    const card = buildDashboardCard();
    if (existing) existing.replaceWith(card);
    else todaySection.insertAdjacentElement('beforebegin', card);
}

function scheduleRender(): void {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
        scheduled = false;
        render();
    });
}

async function refresh(): Promise<void> {
    if (refreshInFlight || document.visibilityState === 'hidden') return;
    refreshInFlight = true;

    try {
        const bootstrapResponse = await fetch(sipanduUrl('/sipandu-api/bootstrap'), {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!bootstrapResponse.ok) return;

        const bootstrap = (await bootstrapResponse.json()) as BootstrapPayload;
        if (!bootstrap.user || !['lecturer', 'admin_prodi'].includes(bootstrap.user.role)) {
            requests = [];
            lastSignature = '';
            removeInjected();
            return;
        }

        const classesResponse = await fetch(sipanduUrl('/sipandu-api/classes'), {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!classesResponse.ok) return;

        const payload = (await classesResponse.json()) as { classes?: CourseClass[] };
        const nextRequests = (payload.classes ?? []).flatMap((courseClass) =>
            courseClass.members
                .filter((member) => member.membership_role === 'student' && member.status === 'pending')
                .map((membership) => ({ membership, courseClass })),
        );

        const signature = nextRequests
            .map((request) => `${request.courseClass.id}:${request.membership.id}`)
            .sort()
            .join('|');

        requests = nextRequests;
        if (signature !== lastSignature) {
            lastSignature = signature;
            scheduleRender();
        } else {
            scheduleRender();
        }
    } finally {
        refreshInFlight = false;
    }
}

const root = document.getElementById('app');
if (root) {
    const observer = new MutationObserver(scheduleRender);
    observer.observe(root, { childList: true, subtree: true });
}

window.addEventListener('focus', () => void refresh());
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh();
});

void refresh();
window.setInterval(() => void refresh(), 60_000);



