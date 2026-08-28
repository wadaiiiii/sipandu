import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, KeyRound, LoaderCircle, LogIn, X } from 'lucide-react';

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

function ClassSkeletons() {
    return (
        <div className="space-y-3" aria-label="Memuat kode kelas">
            {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <div className="h-3 w-20 rounded-full bg-slate-200" />
                    <div className="mt-2 h-5 w-2/3 rounded-full bg-slate-200" />
                    <div className="mt-4 h-16 rounded-2xl bg-white" />
                </div>
            ))}
        </div>
    );
}

function ClassAccessPanel() {
    const [user, setUser] = useState<User | null>(null);
    const [userLoading, setUserLoading] = useState(false);
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [classesLoading, setClassesLoading] = useState(false);
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
        setClassesLoading(true);
        setError('');
        try {
            const response = await fetch('/sipandu-api/classes', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                setError(await responseError(response));
                return;
            }
            setClasses((await response.json()).classes ?? []);
        } finally {
            setClassesLoading(false);
        }
    };

    useEffect(() => {
        const refreshUser = () => void loadUser();
        window.addEventListener('sipandu:dashboard-ready', refreshUser);
        window.addEventListener('focus', refreshUser);
        void loadUser();

        return () => {
            window.removeEventListener('sipandu:dashboard-ready', refreshUser);
            window.removeEventListener('focus', refreshUser);
        };
    }, []);

    const canManage = !!user && ['admin_prodi', 'lecturer'].includes(user.role);
    const isStudent = user?.role === 'student';

    useEffect(() => {
        if (!open || !canManage) return;
        void loadClasses();
    }, [open, canManage]);

    useEffect(() => {
        if (!canManage) return;

        let disposed = false;

        const normalizeDashboardTitles = () => {
            document.querySelectorAll<HTMLElement>('h2, h3').forEach((element) => {
                const current = element.textContent ?? '';
                if (!current.includes('— Kelas Kelas ')) return;
                element.textContent = current.replace(/—\s*Kelas\s+Kelas\s+/i, '— Kelas ');
            });
        };

        const syncInlineDeleteButtons = () => {
            if (disposed) return;
            normalizeDashboardTitles();

            document.querySelectorAll<HTMLAnchorElement>('a[href^="/kelas/"]').forEach((link) => {
                const url = new URL(link.href, window.location.origin);
                const match = url.pathname.match(/^\/kelas\/(\d+)$/);
                if (!match) return;

                const classId = Number(match[1]);
                const actions = link.parentElement;
                if (!actions) return;

                const journalLink = actions.querySelector<HTMLAnchorElement>(`a[href="/kelas/${classId}/jurnal"]`);
                if (!journalLink || actions.querySelector(`[data-sipandu-delete-class="${classId}"]`)) return;

                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.sipanduDeleteClass = String(classId);
                button.setAttribute('aria-label', 'Hapus kelas');
                button.title = 'Hapus kelas';
                button.className = 'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 sm:h-10 sm:w-10 sm:rounded-2xl';
                button.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';

                button.addEventListener('click', async () => {
                    const confirmed = window.confirm('Hapus kelas ini? Semua materi, tugas, nilai, diskusi, peserta, dan data kelas akan ikut terhapus.');
                    if (!confirmed) return;

                    button.disabled = true;
                    button.classList.add('animate-pulse');

                    const response = await fetch(`/sipandu-api/classes/${classId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
                    });

                    if (!response.ok) {
                        window.alert(await responseError(response));
                        button.disabled = false;
                        button.classList.remove('animate-pulse');
                        return;
                    }

                    window.location.reload();
                });

                actions.appendChild(button);
            });
        };

        syncInlineDeleteButtons();
        const observer = new MutationObserver(syncInlineDeleteButtons);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });

        return () => {
            disposed = true;
            observer.disconnect();
            document.querySelectorAll('[data-sipandu-delete-class]').forEach((element) => element.remove());
        };
    }, [canManage]);

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
        window.setTimeout(() => window.location.reload(), 700);
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

    const openPanel = () => {
        setOpen(true);
        setMessage('');
        setError('');
        if (canManage) setClassesLoading(true);
        if (!user && !userLoading) void loadUser();
    };

    return (
        <>
            <button
                type="button"
                aria-label={isStudent ? 'Gabung kelas' : 'Kode kelas'}
                title={isStudent ? 'Gabung kelas' : 'Kode kelas'}
                onClick={openPanel}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:h-10 sm:w-10 sm:rounded-2xl"
            >
                {userLoading && !user
                    ? <LoaderCircle size={17} className="animate-spin" />
                    : isStudent
                        ? <LogIn size={17} strokeWidth={1.9} />
                        : <KeyRound size={17} strokeWidth={1.9} />}
            </button>

            {open && (
                <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-5">
                    <button
                        type="button"
                        aria-label="Tutup panel kode kelas"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                    />

                    <section className="relative z-[140] flex max-h-[92dvh] w-full min-h-0 flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl sm:max-h-[86dvh] sm:max-w-xl sm:rounded-[28px]">
                        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-5 sm:py-5">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                                    {isStudent ? <LogIn size={18} /> : <KeyRound size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600 sm:text-xs">{isStudent ? 'Gabung Kelas' : 'Kode Kelas'}</p>
                                    <h2 className="mt-0.5 truncate text-base font-bold text-slate-950 sm:text-lg">
                                        {isStudent ? 'Masukkan kode dari dosen' : 'Kode join mahasiswa'}
                                    </h2>
                                </div>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
                                <X size={18} />
                            </button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
                            {message && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
                            {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                            {userLoading && !user ? (
                                <div className="grid min-h-[220px] place-items-center text-center">
                                    <div>
                                        <LoaderCircle size={28} className="mx-auto animate-spin text-blue-600" />
                                        <p className="mt-3 text-sm font-semibold text-slate-600">Menyiapkan akses kelas…</p>
                                    </div>
                                </div>
                            ) : !user ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">Sesi pengguna belum siap. Tutup panel lalu coba lagi.</div>
                            ) : isStudent ? (
                                <form onSubmit={joinClass}>
                                    <p className="text-sm leading-6 text-slate-500">Masukkan kode kelas yang dibagikan dosen. Setelah berhasil, kelas langsung muncul di Kelas Saya.</p>
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
                            ) : (
                                <div>
                                    <p className="mb-4 text-sm leading-6 text-slate-500">Salin kode kelas berikut dan bagikan kepada mahasiswa. Mahasiswa cukup memasukkan kode melalui ikon kunci pada akun mereka.</p>
                                    {classesLoading ? (
                                        <ClassSkeletons />
                                    ) : classes.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Belum ada kelas yang dapat dikelola.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {classes.map((courseClass) => (
                                                <article key={courseClass.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-600">{courseClass.course.code}</p>
                                                    <h3 className="mt-1 text-sm font-bold leading-5 text-slate-950 sm:text-base">{courseClass.course.name} — {classLabel(courseClass.name)}</h3>
                                                    <div className="mt-3 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">Kode join</p>
                                                            <code className="mt-1 block truncate font-mono text-base font-extrabold tracking-[.08em] text-[#08205d]">{courseClass.join_code}</code>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => void copyCode(courseClass.join_code)}
                                                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                                                            title="Salin kode kelas"
                                                            aria-label={`Salin kode ${courseClass.course.name}`}
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
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
rootElement.className = 'flex h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10';

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

let mobileToolbarStyle = document.getElementById('sipandu-mobile-toolbar-style') as HTMLStyleElement | null;
if (!mobileToolbarStyle) {
    mobileToolbarStyle = document.createElement('style');
    mobileToolbarStyle.id = 'sipandu-mobile-toolbar-style';
    mobileToolbarStyle.textContent = `
        @media (max-width: 639px) {
            #pwa-controls-root,
            #calendar-panel-root,
            #sipandu-class-access-root {
                width: 2.25rem !important;
                height: 2.25rem !important;
                flex: 0 0 2.25rem !important;
            }
            #pwa-controls-root > button,
            #calendar-panel-root > button,
            #sipandu-class-access-root > button,
            body[data-sipandu-layout="dashboard"] button[aria-label="Notifikasi"] {
                width: 2.25rem !important;
                height: 2.25rem !important;
                border-radius: .75rem !important;
            }
        }
    `;
    document.head.appendChild(mobileToolbarStyle);
}

createRoot(rootElement).render(<ClassAccessPanel />);
