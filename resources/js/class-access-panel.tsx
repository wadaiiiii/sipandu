import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, KeyRound, LoaderCircle, LogIn, Sparkles, Trash2, X } from 'lucide-react';

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

function ClassSkeletons() {
    return (
        <div className="space-y-3" aria-label="Memuat kelas">
            {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="h-3 w-20 rounded-full bg-slate-200" />
                    <div className="mt-3 h-5 w-2/3 rounded-full bg-slate-200" />
                    <div className="mt-4 h-16 rounded-2xl bg-white" />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="h-11 rounded-2xl bg-slate-200" />
                        <div className="h-11 rounded-2xl bg-slate-200" />
                    </div>
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
    const [busyClassId, setBusyClassId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
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

    useEffect(() => {
        if (!open || !user || !['admin_prodi', 'lecturer'].includes(user.role)) return;
        void loadClasses();
    }, [open, user?.role]);

    const canManage = !!user && ['admin_prodi', 'lecturer'].includes(user.role);
    const isStudent = user?.role === 'student';

    useEffect(() => {
        if (!canManage) return;

        let disposed = false;
        const timers = new Set<number>();

        const syncInlineDeleteButtons = () => {
            if (disposed) return;

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
                button.className = 'inline-flex w-fit items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60';
                button.innerHTML = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg><span>Hapus Kelas</span>';

                let armed = false;
                const label = button.querySelector('span');
                const reset = () => {
                    armed = false;
                    if (label) label.textContent = 'Hapus Kelas';
                    button.classList.remove('bg-rose-600', 'text-white', 'border-rose-600');
                    button.classList.add('bg-white', 'text-rose-600', 'border-rose-200');
                };

                button.addEventListener('click', async () => {
                    if (!armed) {
                        armed = true;
                        if (label) label.textContent = 'Klik lagi untuk hapus';
                        button.classList.remove('bg-white', 'text-rose-600', 'border-rose-200');
                        button.classList.add('bg-rose-600', 'text-white', 'border-rose-600');
                        const timer = window.setTimeout(reset, 4500);
                        timers.add(timer);
                        return;
                    }

                    button.disabled = true;
                    if (label) label.textContent = 'Menghapus…';
                    const response = await fetch(`/sipandu-api/classes/${classId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
                    });

                    if (!response.ok) {
                        window.alert(await responseError(response));
                        button.disabled = false;
                        reset();
                        return;
                    }

                    window.location.reload();
                });

                actions.appendChild(button);
            });
        };

        syncInlineDeleteButtons();
        const observer = new MutationObserver(syncInlineDeleteButtons);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            disposed = true;
            observer.disconnect();
            timers.forEach((timer) => window.clearTimeout(timer));
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
        setTimeout(() => window.location.reload(), 700);
    };

    const seedDemoData = async (courseClass: CourseClass) => {
        setBusyClassId(courseClass.id);
        setError('');
        setMessage('');

        const response = await fetch(`/sipandu-api/classes/${courseClass.id}/demo-data`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRF-TOKEN': csrf(),
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            setError(await responseError(response));
            setBusyClassId(null);
            return;
        }

        const payload = await response.json();
        setMessage(payload.message ?? 'Data contoh berhasil disiapkan.');
        setBusyClassId(null);
    };

    const deleteClass = async (courseClass: CourseClass) => {
        if (confirmDeleteId !== courseClass.id) {
            setConfirmDeleteId(courseClass.id);
            setMessage('');
            setError('');
            return;
        }

        setBusyClassId(courseClass.id);
        setError('');
        setMessage('');

        const response = await fetch(`/sipandu-api/classes/${courseClass.id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'X-CSRF-TOKEN': csrf(),
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            setError(await responseError(response));
            setBusyClassId(null);
            return;
        }

        setClasses((current) => current.filter((item) => item.id !== courseClass.id));
        setConfirmDeleteId(null);
        setBusyClassId(null);
        setMessage('Kelas berhasil dihapus beserta data pembelajarannya.');
    };

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setMessage(`Kode ${code} sudah disalin.`);
            setError('');
        } catch {
            setError('Kode belum dapat disalin otomatis. Silakan pilih dan salin kode secara manual.');
        }
    };

    const openPanel = () => {
        setOpen(true);
        setMessage('');
        setError('');
        if (!user && !userLoading) void loadUser();
    };

    return (
        <>
            <button
                type="button"
                aria-label={isStudent ? 'Gabung kelas' : 'Akses kelas'}
                title={isStudent ? 'Gabung kelas' : 'Akses kelas'}
                onClick={openPanel}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
                {userLoading && !user
                    ? <LoaderCircle size={17} className="animate-spin" />
                    : isStudent
                        ? <LogIn size={17} strokeWidth={1.9} />
                        : <KeyRound size={17} strokeWidth={1.9} />}
            </button>

            {open && (
                <div className="fixed inset-0 z-[130] sm:grid sm:place-items-center sm:p-5">
                    <button
                        type="button"
                        aria-label="Tutup panel akses kelas"
                        onClick={() => { setOpen(false); setConfirmDeleteId(null); }}
                        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                    />

                    <section className="absolute inset-x-2 bottom-2 top-2 z-[140] flex min-h-0 flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl sm:relative sm:inset-auto sm:max-h-[86vh] sm:w-full sm:max-w-2xl sm:rounded-[28px]">
                        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 sm:h-11 sm:w-11">
                                    {isStudent ? <LogIn size={19} /> : <KeyRound size={19} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600 sm:text-xs">Akses Kelas</p>
                                    <h2 className="mt-0.5 truncate text-base font-bold text-slate-950 sm:text-lg">
                                        {isStudent ? 'Gabung kelas dengan kode' : 'Kode kelas, data contoh & pengelolaan'}
                                    </h2>
                                </div>
                            </div>
                            <button type="button" onClick={() => { setOpen(false); setConfirmDeleteId(null); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
                                <X size={18} />
                            </button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-6 sm:p-6">
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
                                    <p className="text-sm leading-6 text-slate-500">Masukkan kode dari dosen. Setelah berhasil, kelas langsung muncul pada Kelas Saya.</p>
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
                                    <p className="text-sm leading-6 text-slate-500">Bagikan kode kepada mahasiswa. Data contoh dapat diisi sekali klik. Penghapusan kelas membutuhkan dua kali konfirmasi.</p>

                                    <div className="mt-5">
                                        {classesLoading ? (
                                            <ClassSkeletons />
                                        ) : classes.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Belum ada kelas yang dapat dikelola.</div>
                                        ) : (
                                            <div className="space-y-3">
                                                {classes.map((courseClass) => (
                                                    <article key={courseClass.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{courseClass.course.code}</p>
                                                                <h3 className="mt-1 text-sm font-bold leading-5 text-slate-950 sm:text-base">{courseClass.course.name} — Kelas {courseClass.name}</h3>
                                                            </div>
                                                            <a href={courseClass.detail_url} className="shrink-0 rounded-xl px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-800">Buka</a>
                                                        </div>

                                                        <div className="mt-4 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Kode kelas</p>
                                                                <code className="mt-1 block truncate font-mono text-sm font-extrabold tracking-[.08em] text-[#08205d] sm:text-base">{courseClass.join_code}</code>
                                                            </div>
                                                            <button type="button" onClick={() => void copyCode(courseClass.join_code)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100" title="Salin kode"><Copy size={16} /></button>
                                                        </div>

                                                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => void seedDemoData(courseClass)}
                                                                disabled={busyClassId === courseClass.id}
                                                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
                                                            >
                                                                {busyClassId === courseClass.id ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                                Isi 4 Materi + 3 Tugas
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void deleteClass(courseClass)}
                                                                disabled={busyClassId === courseClass.id}
                                                                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition disabled:opacity-60 ${confirmDeleteId === courseClass.id ? 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700' : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'}`}
                                                            >
                                                                {busyClassId === courseClass.id ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                                {confirmDeleteId === courseClass.id ? 'Ya, Hapus Kelas' : 'Hapus Kelas'}
                                                            </button>
                                                        </div>

                                                        {confirmDeleteId === courseClass.id && (
                                                            <div className="mt-2 rounded-2xl bg-rose-50 px-3 py-3 text-xs leading-5 text-rose-700">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <span>Materi, tugas, nilai, diskusi, peserta, dan seluruh data kelas ini akan ikut terhapus.</span>
                                                                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="shrink-0 font-bold underline">Batal</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
rootElement.className = 'flex shrink-0 items-center';

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
