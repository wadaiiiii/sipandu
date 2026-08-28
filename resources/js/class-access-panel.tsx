import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { LoaderCircle, LogIn, X } from 'lucide-react';

type User = {
    id: number;
    name: string;
    role: string;
};

type CourseClass = {
    id: number;
    name: string;
    join_code: string;
    detail_url: string;
    course: { code: string; name: string };
};

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function responseError(response: Response): Promise<string> {
    try {
        const payload = await response.json();
        const message = Object.values(payload.errors ?? {}).flat()[0];
        return String(message ?? payload.message ?? 'Permintaan belum berhasil.');
    } catch {
        return 'Permintaan belum berhasil.';
    }
}

function classLabel(name: string): string {
    const value = name.trim();
    if (!value) return 'Kelas';
    return /^kelas\s+/i.test(value) ? value : `Kelas ${value}`;
}

function copyIcon(): string {
    return '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
}

function checkIcon(): string {
    return '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>';
}

function trashIcon(): string {
    return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';
}

function makeJoinCodeChip(courseClass: CourseClass): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sipanduJoinInline = String(courseClass.id);
    button.className = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 text-xs font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 sm:rounded-2xl';
    button.setAttribute('aria-label', `Salin kode join ${courseClass.course.name}`);
    button.title = 'Klik untuk menyalin kode join';
    button.innerHTML = `<span class="text-[10px] font-bold uppercase tracking-[.08em] text-blue-500">Kode</span><code class="font-mono text-xs font-extrabold tracking-[.05em] text-[#08205d] sm:text-sm">${courseClass.join_code}</code><span data-copy-icon>${copyIcon()}</span>`;

    button.addEventListener('click', async () => {
        const icon = button.querySelector<HTMLElement>('[data-copy-icon]');
        try {
            await navigator.clipboard.writeText(courseClass.join_code);
            if (icon) icon.innerHTML = checkIcon();
            button.title = 'Kode tersalin';
            window.setTimeout(() => {
                if (icon) icon.innerHTML = copyIcon();
                button.title = 'Klik untuk menyalin kode join';
            }, 1200);
        } catch {
            window.prompt('Salin kode join kelas:', courseClass.join_code);
        }
    });

    return button;
}

function ClassAccessPanel() {
    const [user, setUser] = useState<User | null>(null);
    const [userLoading, setUserLoading] = useState(false);
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [open, setOpen] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const loadUser = async () => {
        setUserLoading(true);
        try {
            const response = await fetch('/sipandu-api/bootstrap', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                setUser(null);
                return;
            }
            const payload = await response.json();
            setUser((payload.user as User | null) ?? null);
        } finally {
            setUserLoading(false);
        }
    };

    const loadClasses = async () => {
        const response = await fetch('/sipandu-api/classes', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        setClasses((await response.json()).classes ?? []);
    };

    useEffect(() => {
        const refresh = () => void loadUser();
        window.addEventListener('sipandu:dashboard-ready', refresh);
        window.addEventListener('focus', refresh);
        void loadUser();

        return () => {
            window.removeEventListener('sipandu:dashboard-ready', refresh);
            window.removeEventListener('focus', refresh);
        };
    }, []);

    const canManage = !!user && ['admin_prodi', 'lecturer'].includes(user.role);
    const isStudent = user?.role === 'student';

    useEffect(() => {
        const root = document.getElementById('sipandu-class-access-root');
        if (root) root.style.display = isStudent ? 'flex' : 'none';
        if (canManage) void loadClasses();
    }, [canManage, isStudent, user?.id]);

    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !busy) setOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, busy]);

    useEffect(() => {
        if (!canManage || classes.length === 0) return;

        let disposed = false;

        const syncClassCards = () => {
            if (disposed) return;

            document.querySelectorAll('[data-sipandu-class-code]').forEach((element) => element.remove());

            document.querySelectorAll<HTMLElement>('h2, h3').forEach((element) => {
                const current = element.textContent ?? '';
                if (current.includes('— Kelas Kelas ')) {
                    element.textContent = current.replace(/—\s*Kelas\s+Kelas\s+/i, '— Kelas ');
                }
            });

            document.querySelectorAll<HTMLAnchorElement>('a[href^="/kelas/"]').forEach((link) => {
                const url = new URL(link.href, window.location.origin);
                const match = url.pathname.match(/^\/kelas\/(\d+)$/);
                if (!match) return;

                const classId = Number(match[1]);
                const courseClass = classes.find((item) => item.id === classId);
                if (!courseClass) return;

                const actions = link.parentElement;
                if (!actions) return;

                const journalLink = actions.querySelector<HTMLAnchorElement>(`a[href="/kelas/${classId}/jurnal"]`);
                if (!journalLink) return;

                const label = (link.textContent ?? '').trim();
                if (label === 'Lanjutkan') link.textContent = 'Buka';

                const compactActionRow = ['Lanjutkan', 'Buka'].includes(label) || (link.textContent ?? '').trim() === 'Buka';
                if (compactActionRow) {
                    link.className = 'inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 sm:rounded-2xl sm:text-sm';
                    journalLink.className = 'inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 px-4 text-xs font-bold text-blue-700 transition hover:bg-blue-100 sm:rounded-2xl sm:text-sm';
                    actions.classList.add('items-center', 'flex-wrap');
                }

                if (!actions.querySelector(`[data-sipandu-join-inline="${classId}"]`)) {
                    actions.appendChild(makeJoinCodeChip(courseClass));
                }

                const oldDelete = actions.querySelector<HTMLElement>(`[data-sipandu-delete-class="${classId}"]`);
                if (oldDelete) {
                    oldDelete.className = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 sm:rounded-2xl';
                    return;
                }

                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.dataset.sipanduDeleteClass = String(classId);
                deleteButton.setAttribute('aria-label', 'Hapus kelas');
                deleteButton.title = 'Hapus kelas';
                deleteButton.className = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 sm:rounded-2xl';
                deleteButton.innerHTML = trashIcon();
                deleteButton.addEventListener('click', async () => {
                    const confirmed = window.confirm(`Hapus ${courseClass.course.name} — ${classLabel(courseClass.name)}? Semua data pembelajaran kelas akan ikut terhapus.`);
                    if (!confirmed) return;

                    deleteButton.disabled = true;
                    const response = await fetch(`/sipandu-api/classes/${classId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
                    });

                    if (!response.ok) {
                        window.alert(await responseError(response));
                        deleteButton.disabled = false;
                        return;
                    }

                    window.location.reload();
                });
                actions.appendChild(deleteButton);
            });
        };

        syncClassCards();
        const observer = new MutationObserver(syncClassCards);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });

        return () => {
            disposed = true;
            observer.disconnect();
            document.querySelectorAll('[data-sipandu-join-inline], [data-sipandu-class-code], [data-sipandu-delete-class]').forEach((element) => element.remove());
        };
    }, [canManage, classes]);

    const joinClass = async (event: FormEvent) => {
        event.preventDefault();
        if (!joinCode.trim()) return;

        setBusy(true);
        setError('');
        setMessage('');

        const response = await fetch('/sipandu-api/classes/join', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf(),
                Accept: 'application/json',
            },
            body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
        });

        if (!response.ok) {
            setError(await responseError(response));
            setBusy(false);
            return;
        }

        setMessage('Berhasil bergabung ke kelas. Kelas Saya sedang diperbarui…');
        setBusy(false);
        window.setTimeout(() => window.location.reload(), 650);
    };

    const openStudentJoin = () => {
        setJoinCode('');
        setMessage('');
        setError('');
        setOpen(true);
    };

    const joinDialog = open && isStudent
        ? createPortal(
            <div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
                <button
                    type="button"
                    aria-label="Tutup dialog gabung kelas"
                    onClick={() => !busy && setOpen(false)}
                    className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
                />

                <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="join-class-title"
                    className="relative z-[230] flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[520px] min-h-0 flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[30px]"
                >
                    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                <LogIn size={19} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600 sm:text-xs">Gabung Kelas</p>
                                <h2 id="join-class-title" className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-950">Masukkan kode kelas</h2>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setOpen(false)}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
                            aria-label="Tutup"
                        >
                            <X size={19} />
                        </button>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
                        {message && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">{message}</div>}
                        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{error}</div>}

                        <form onSubmit={joinClass} className="space-y-5">
                            <p className="text-sm leading-6 text-slate-500">Masukkan kode yang dibagikan dosen. Setelah berhasil, kelas akan langsung muncul di <strong className="font-semibold text-slate-700">Kelas Saya</strong>.</p>
                            <label className="block text-sm font-bold text-slate-800">
                                Kode kelas
                                <input
                                    autoFocus
                                    value={joinCode}
                                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                                    placeholder="Contoh: K1-AB12CD34"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-mono text-base font-bold uppercase tracking-[.06em] text-slate-900 outline-none transition placeholder:font-sans placeholder:text-sm placeholder:font-semibold placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </label>
                            <button disabled={busy || !joinCode.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                                {busy ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />}
                                {busy ? 'Menggabungkan…' : 'Gabung Kelas'}
                            </button>
                        </form>
                    </div>
                </section>
            </div>,
            document.body,
        )
        : null;

    return (
        <>
            {isStudent && (
                <button
                    type="button"
                    aria-label="Gabung kelas"
                    title="Gabung kelas"
                    onClick={openStudentJoin}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:h-10 sm:w-10 sm:rounded-2xl"
                >
                    {userLoading ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} strokeWidth={1.9} />}
                </button>
            )}
            {joinDialog}
        </>
    );
}

let rootElement = document.getElementById('sipandu-class-access-root');
if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'sipandu-class-access-root';
}
rootElement.className = 'flex h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10';
rootElement.style.display = 'none';

let wasConnected = false;
const placeAccessRoot = () => {
    const bell = document.querySelector<HTMLButtonElement>('button[aria-label="Notifikasi"]');
    const bellWrapper = bell?.parentElement;
    const toolbar = bellWrapper?.parentElement;

    if (!bellWrapper || !toolbar) {
        if (rootElement?.isConnected) rootElement.remove();
        wasConnected = false;
        return;
    }

    const calendarRoot = document.getElementById('calendar-panel-root');
    const anchor = calendarRoot?.parentElement === toolbar ? calendarRoot : bellWrapper;

    if (rootElement?.parentElement !== toolbar || rootElement.previousElementSibling !== anchor) {
        anchor.insertAdjacentElement('afterend', rootElement);
    }

    if (!wasConnected && rootElement?.isConnected) {
        wasConnected = true;
        window.dispatchEvent(new Event('sipandu:dashboard-ready'));
    }
};

placeAccessRoot();
const placementObserver = new MutationObserver(placeAccessRoot);
placementObserver.observe(document.body, { childList: true, subtree: true });

createRoot(rootElement).render(<ClassAccessPanel />);
