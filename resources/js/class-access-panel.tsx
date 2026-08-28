import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, KeyRound, LogIn, Sparkles, Trash2, X } from 'lucide-react';

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

function ClassAccessPanel() {
    const [user, setUser] = useState<User | null>(null);
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [open, setOpen] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [busyClassId, setBusyClassId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const loadClasses = async () => {
        const classesResponse = await fetch('/sipandu-api/classes', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (classesResponse.ok) {
            setClasses((await classesResponse.json()).classes ?? []);
        }
    };

    useEffect(() => {
        let stopped = false;
        let timer: number | undefined;

        const detectSession = async () => {
            let nextDelay = 1200;

            try {
                const bootstrap = await fetch('/sipandu-api/bootstrap', {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                });
                if (!bootstrap.ok || stopped) return;

                const bootstrapPayload = await bootstrap.json();
                const currentUser = bootstrapPayload.user as User | null;
                setUser(currentUser);
                nextDelay = currentUser ? 60000 : 1200;

                if (currentUser && ['admin_prodi', 'lecturer'].includes(currentUser.role)) {
                    await loadClasses();
                }
            } finally {
                if (!stopped) timer = window.setTimeout(detectSession, nextDelay);
            }
        };

        void detectSession();

        const onFocus = () => void detectSession();
        window.addEventListener('focus', onFocus);

        return () => {
            stopped = true;
            if (timer) window.clearTimeout(timer);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    if (!user || !['student', 'admin_prodi', 'lecturer'].includes(user.role)) return null;

    const isStudent = user.role === 'student';

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
        await navigator.clipboard.writeText(code);
        setMessage(`Kode ${code} sudah disalin.`);
        setError('');
    };

    return (
        <>
            <button
                type="button"
                aria-label={isStudent ? 'Gabung kelas' : 'Akses kelas'}
                title={isStudent ? 'Gabung kelas' : 'Akses kelas'}
                onClick={() => setOpen(true)}
                className="fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2 rounded-2xl bg-[#08205d] px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-blue-950/25 transition hover:-translate-y-0.5 hover:bg-[#0b2d7a] sm:bottom-6 sm:right-6"
            >
                {isStudent ? <LogIn size={18} /> : <KeyRound size={18} />}
                <span>{isStudent ? 'Gabung Kelas' : 'Akses Kelas'}</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-5">
                    <button
                        type="button"
                        aria-label="Tutup panel akses kelas"
                        onClick={() => { setOpen(false); setConfirmDeleteId(null); }}
                        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                    />
                    <section className="relative max-h-[88vh] w-full overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                                    {isStudent ? <LogIn size={20} /> : <KeyRound size={20} />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Akses Kelas</p>
                                    <h2 className="mt-0.5 text-lg font-bold text-slate-950">
                                        {isStudent ? 'Gabung kelas dengan kode' : 'Kode kelas, data contoh & pengelolaan'}
                                    </h2>
                                </div>
                            </div>
                            <button type="button" onClick={() => { setOpen(false); setConfirmDeleteId(null); }} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="max-h-[calc(88vh-92px)] overflow-y-auto p-5 sm:p-6">
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
                                        <LogIn size={17} /> {busy ? 'Menggabungkan…' : 'Gabung Kelas'}
                                    </button>
                                </form>
                            ) : (
                                <div>
                                    <p className="text-sm leading-6 text-slate-500">Bagikan kode kelas kepada mahasiswa. Data contoh dapat diisi sekali klik. Tombol hapus membutuhkan dua kali konfirmasi agar kelas tidak terhapus tanpa sengaja.</p>
                                    <div className="mt-5 space-y-3">
                                        {classes.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Belum ada kelas yang dapat dikelola.</div>
                                        ) : classes.map((courseClass) => (
                                            <article key={courseClass.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{courseClass.course.code}</p>
                                                        <h3 className="mt-1 font-bold text-slate-950">{courseClass.course.name} — Kelas {courseClass.name}</h3>
                                                    </div>
                                                    <a href={courseClass.detail_url} className="text-xs font-bold text-blue-600 hover:text-blue-800">Buka kelas</a>
                                                </div>
                                                <div className="mt-4 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                                                    <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Kode kelas</p><code className="mt-1 block font-mono text-base font-extrabold tracking-[.08em] text-[#08205d]">{courseClass.join_code}</code></div>
                                                    <button type="button" onClick={() => void copyCode(courseClass.join_code)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100" title="Salin kode"><Copy size={16} /></button>
                                                </div>
                                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => void seedDemoData(courseClass)}
                                                        disabled={busyClassId === courseClass.id}
                                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
                                                    >
                                                        <Sparkles size={16} /> {busyClassId === courseClass.id ? 'Memproses…' : 'Isi 4 Materi + 3 Tugas'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void deleteClass(courseClass)}
                                                        disabled={busyClassId === courseClass.id}
                                                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition disabled:opacity-60 ${confirmDeleteId === courseClass.id ? 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700' : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'}`}
                                                    >
                                                        <Trash2 size={16} /> {confirmDeleteId === courseClass.id ? 'Ya, Hapus Kelas' : 'Hapus Kelas'}
                                                    </button>
                                                </div>
                                                {confirmDeleteId === courseClass.id && (
                                                    <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                                        <span>Semua pertemuan, materi, tugas, nilai, diskusi, dan peserta kelas ini akan ikut terhapus.</span>
                                                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="shrink-0 font-bold underline">Batal</button>
                                                    </div>
                                                )}
                                            </article>
                                        ))}
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

const rootElement = document.createElement('div');
rootElement.id = 'sipandu-class-access-root';
document.body.appendChild(rootElement);
createRoot(rootElement).render(<ClassAccessPanel />);
