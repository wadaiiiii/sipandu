import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, KeyRound, LoaderCircle, LogIn, Trash2, X } from 'lucide-react';

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

function keyIcon(): string {
    return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7"/></svg>';
}

function trashIcon(): string {
    return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';
}

function ClassAccessPanel() {
    const [user, setUser] = useState<User | null>(null);
    const [userLoading, setUserLoading] = useState(false);
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [selectedClass, setSelectedClass] = useState<CourseClass | null>(null);
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
        if (!canManage || classes.length === 0) return;

        let disposed = false;

        const syncClassActions = () => {
            if (disposed) return;

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

                if (!actions.querySelector(`[data-sipandu-class-code="${classId}"]`)) {
                    const codeButton = document.createElement('button');
                    codeButton.type = 'button';
                    codeButton.dataset.sipanduClassCode = String(classId);
                    codeButton.setAttribute('aria-label', `Kode join ${courseClass.course.name}`);
                    codeButton.title = `Kode join: ${courseClass.join_code}`;
                    codeButton.className = 'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 sm:h-10 sm:w-10 sm:rounded-2xl';
                    codeButton.innerHTML = keyIcon();
                    codeButton.addEventListener('click', () => {
                        setSelectedClass(courseClass);
                        setMessage('');
                        setError('');
                        setOpen(true);
                    });
                    actions.appendChild(codeButton);
                }

                if (!actions.querySelector(`[data-sipandu-delete-class="${classId}"]`)) {
                    const deleteButton = document.createElement('button');
                    deleteButton.type = 'button';
                    deleteButton.dataset.sipanduDeleteClass = String(classId);
                    deleteButton.setAttribute('aria-label', 'Hapus kelas');
                    deleteButton.title = 'Hapus kelas';
                    deleteButton.className = 'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 sm:h-10 sm:w-10 sm:rounded-2xl';
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
                }
            });
        };

        syncClassActions();
        const observer = new MutationObserver(syncClassActions);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });

        return () => {
            disposed = true;
            observer.disconnect();
            document.querySelectorAll('[data-sipandu-class-code], [data-sipandu-delete-class]').forEach((element) => element.remove());
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

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setMessage(`Kode ${code} sudah disalin.`);
            setError('');
        } catch {
            setError('Kode belum dapat disalin otomatis. Silakan salin kode secara manual.');
        }
    };

    const openStudentJoin = () => {
        setSelectedClass(null);
        setMessage('');
        setError('');
        setOpen(true);
    };

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

            {open && (
                <div className="fixed inset-0 z-[130] flex items-end justify-center p-0 sm:items-center sm:p-5">
                    <button
                        type="button"
                        aria-label="Tutup"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                    />

                    <section className="relative z-[140] flex max-h-[calc(100dvh-1rem)] w-full min-h-0 flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl sm:max-h-[80dvh] sm:max-w-md sm:rounded-[28px]">
                        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                                    {isStudent ? <LogIn size={18} /> : <KeyRound size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600 sm:text-xs">{isStudent ? 'Gabung Kelas' : 'Kode Join'}</p>
                                    <h2 className="mt-0.5 truncate text-base font-bold text-slate-950">{isStudent ? 'Masukkan kode kelas' : selectedClass?.course.name}</h2>
                                </div>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Tutup">
                                <X size={18} />
                            </button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
                            {message && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
                            {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                            {isStudent ? (
                                <form onSubmit={joinClass}>
                                    <p className="text-sm leading-6 text-slate-500">Masukkan kode yang dibagikan dosen. Setelah berhasil, kelas langsung muncul di Kelas Saya.</p>
                                    <label className="mt-5 block text-sm font-bold text-slate-800">
                                        Kode kelas
                                        <input
                                            value={joinCode}
                                            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                                            placeholder="Contoh: K1-AB12CD34"
                                            autoComplete="off"
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-base font-bold uppercase tracking-[.08em] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                    </label>
                                    <button disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
                                        {busy ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />}
                                        {busy ? 'Menggabungkan…' : 'Gabung Kelas'}
                                    </button>
                                </form>
                            ) : selectedClass ? (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">{selectedClass.course.code}</p>
                                    <h3 className="mt-1 text-lg font-bold text-slate-950">{selectedClass.course.name} — {classLabel(selectedClass.name)}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">Bagikan kode ini kepada mahasiswa. Kode hanya digunakan untuk bergabung ke kelas ini.</p>
                                    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-4">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Kode join</p>
                                            <code className="mt-1 block font-mono text-lg font-extrabold tracking-[.08em] text-[#08205d]">{selectedClass.join_code}</code>
                                        </div>
                                        <button type="button" onClick={() => void copyCode(selectedClass.join_code)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm transition hover:bg-blue-100" title="Salin kode" aria-label="Salin kode">
                                            <Copy size={17} />
                                        </button>
                                    </div>
                                    <a href={selectedClass.detail_url} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50">Buka kelas</a>
                                </div>
                            ) : null}
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

let rootElement = document.getElementById('sipandu-class-access-root');
if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'sipandu-class-access-root';
}
rootElement.className = 'flex shrink-0 items-center';

const placeAccessRoot = () => {
    const bell = document.querySelector<HTMLButtonElement>('button[aria-label="Notifikasi"]');
    const bellWrapper = bell?.parentElement;
    const toolbar = bellWrapper?.parentElement;

    if (!bellWrapper || !toolbar) {
        if (rootElement?.isConnected) rootElement.remove();
        return;
    }

    const calendarRoot = document.getElementById('calendar-panel-root');
    const anchor = calendarRoot?.parentElement === toolbar ? calendarRoot : bellWrapper;
    if (rootElement?.parentElement !== toolbar || rootElement.previousElementSibling !== anchor) {
        anchor.insertAdjacentElement('afterend', rootElement);
    }
};

placeAccessRoot();
const placementObserver = new MutationObserver(placeAccessRoot);
placementObserver.observe(document.body, { childList: true, subtree: true });

createRoot(rootElement).render(<ClassAccessPanel />);
