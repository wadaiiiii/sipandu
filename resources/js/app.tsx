import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ArrowUpRight,
    BookOpen,
    ChevronRight,
    GraduationCap,
    Home,
    LogOut,
    Menu,
    Plus,
    RefreshCw,
    Sparkles,
    UserPlus,
    Users,
    X,
} from 'lucide-react';

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label?: string;
    identity_number?: string | null;
};

type Bootstrap = {
    product: { name: string; tagline: string; operationally_independent: boolean };
    user: User | null;
};

type ClassMember = {
    id: number;
    membership_role: 'lecturer' | 'student';
    status: string;
    user: User;
};

type CourseClass = {
    id: number;
    name: string;
    status: string;
    detail_url: string;
    course: { id: number; code: string; name: string; credits: number };
    academic_term: { id: number; academic_year: string; semester: string; is_active: boolean };
    students_count: number;
    members: ClassMember[];
};

type ClassForm = {
    course_code: string;
    course_name: string;
    credits: number;
    academic_year: string;
    semester: 'ganjil' | 'genap';
    class_name: string;
};

type Section = 'home' | 'classes';

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

function semesterLabel(semester: string): string {
    return semester.toLowerCase() === 'ganjil' ? 'Ganjil' : 'Genap';
}

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function App() {
    const [data, setData] = useState<Bootstrap | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [section, setSection] = useState<Section>('home');
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [classesBusy, setClassesBusy] = useState(false);
    const [classError, setClassError] = useState('');
    const [participantEmails, setParticipantEmails] = useState<Record<number, string>>({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [classForm, setClassForm] = useState<ClassForm>({
        course_code: '',
        course_name: '',
        credits: 3,
        academic_year: '2026/2027',
        semester: 'ganjil',
        class_name: 'A',
    });

    const canManageClasses = useMemo(
        () => ['admin_prodi', 'lecturer'].includes(data?.user?.role ?? ''),
        [data?.user?.role],
    );

    const activeTerm = useMemo(
        () => classes.find((item) => item.academic_term.is_active)?.academic_term ?? classes[0]?.academic_term ?? null,
        [classes],
    );

    const totalStudents = useMemo(
        () => classes.reduce((sum, item) => sum + item.students_count, 0),
        [classes],
    );

    const load = async () => {
        try {
            const response = await fetch('/sipandu-api/bootstrap', { credentials: 'include' });
            if (!response.ok) throw new Error(await responseError(response));
            setData(await response.json());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'SiPANDU belum dapat dimuat.');
        }
    };

    const loadClasses = async () => {
        if (!data?.user) return;
        setClassesBusy(true);
        setClassError('');
        const response = await fetch('/sipandu-api/classes', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (response.ok) setClasses((await response.json()).classes ?? []);
        else setClassError(await responseError(response));
        setClassesBusy(false);
    };

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        if (data?.user) void loadClasses();
    }, [data?.user?.id]);

    const login = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        const response = await fetch('/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf(),
                Accept: 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            setError(await responseError(response));
            setBusy(false);
            return;
        }
        await load();
        setBusy(false);
    };

    const logout = async () => {
        await fetch('/logout', {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
        });
        setClasses([]);
        setSection('home');
        await load();
    };

    const createClass = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setClassError('');
        const response = await fetch('/sipandu-api/classes', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf(),
                Accept: 'application/json',
            },
            body: JSON.stringify({ ...classForm, rps_source_type: 'manual' }),
        });
        if (!response.ok) {
            setClassError(await responseError(response));
            setBusy(false);
            return;
        }
        setClassForm((current) => ({ ...current, course_code: '', course_name: '', class_name: 'A' }));
        await loadClasses();
        setBusy(false);
    };

    const addParticipant = async (courseClass: CourseClass) => {
        const participantEmail = participantEmails[courseClass.id]?.trim();
        if (!participantEmail) return;
        setClassError('');
        const response = await fetch(`/sipandu-api/classes/${courseClass.id}/participants`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf(),
                Accept: 'application/json',
            },
            body: JSON.stringify({ email: participantEmail }),
        });
        if (!response.ok) {
            setClassError(await responseError(response));
            return;
        }
        setParticipantEmails((current) => ({ ...current, [courseClass.id]: '' }));
        await loadClasses();
    };

    const removeParticipant = async (courseClass: CourseClass, participant: User) => {
        const response = await fetch(`/sipandu-api/classes/${courseClass.id}/participants/${participant.id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
        });
        if (!response.ok) {
            setClassError(await responseError(response));
            return;
        }
        await loadClasses();
    };

    if (!data) {
        return (
            <div className="grid min-h-screen place-items-center bg-[#f5f7fb] px-6 text-center">
                <div>
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#0b2d7a] text-white shadow-xl shadow-blue-200/60">
                        <GraduationCap size={30} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-600">{error || 'Memuat SiPANDU…'}</p>
                </div>
            </div>
        );
    }

    if (!data.user) {
        return (
            <main className="min-h-screen bg-[#04153a] text-white">
                <div className="grid min-h-screen lg:grid-cols-[1.15fr_.85fr]">
                    <section className="relative isolate overflow-hidden px-7 py-9 sm:px-12 lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-12">
                        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_28%_42%,rgba(59,130,246,.85),transparent_34%),radial-gradient(circle_at_62%_76%,rgba(147,197,253,.45),transparent_32%),linear-gradient(145deg,#03122f_0%,#071a4b_48%,#0f3ea8_100%)]" />
                        <div className="absolute -left-20 bottom-[-120px] -z-10 h-[430px] w-[430px] rounded-full bg-white/20 blur-3xl" />
                        <div className="absolute right-[-180px] top-20 -z-10 h-[440px] w-[440px] rounded-full bg-blue-400/20 blur-3xl" />

                        <div className="relative">
                            <div className="flex items-center gap-3">
                                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#08205d] shadow-xl shadow-blue-950/20">
                                    <GraduationCap size={25} />
                                </div>
                                <div>
                                    <p className="text-xl font-extrabold tracking-tight">SiPANDU</p>
                                    <p className="text-xs font-medium text-blue-100/70">Learning Management System</p>
                                </div>
                            </div>

                            <div className="mt-20 max-w-3xl lg:mt-28">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50 backdrop-blur">
                                    <Sparkles size={14} /> Ruang belajar yang lebih sederhana
                                </span>
                                <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                                    Kelas, materi, tugas, dan nilai dalam satu tempat.
                                </h1>
                                <p className="mt-6 max-w-xl text-base leading-7 text-blue-50/80 sm:text-lg">
                                    SiPANDU membantu dosen dan mahasiswa menjalankan pembelajaran semester dengan alur yang ringkas dan mudah digunakan.
                                </p>
                            </div>
                        </div>

                        <div className="relative mt-14 grid gap-3 sm:grid-cols-3">
                            {[
                                ['Kelas', 'Kelola pembelajaran semester'],
                                ['Materi', 'Bagikan sumber belajar'],
                                ['Tugas', 'Kumpulkan dan beri nilai'],
                            ].map(([title, subtitle]) => (
                                <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                                    <p className="text-sm font-bold">{title}</p>
                                    <p className="mt-1 text-xs leading-5 text-blue-100/70">{subtitle}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="flex items-center bg-white px-7 py-10 text-slate-950 sm:px-12 lg:px-16">
                        <form onSubmit={login} className="mx-auto w-full max-w-md">
                            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                                Portal Matematika UNSULBAR
                            </div>
                            <h2 className="mt-5 text-3xl font-bold tracking-[-0.025em]">Masuk ke SiPANDU</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan akun yang telah didaftarkan oleh pengelola.</p>

                            <label className="mt-8 block text-sm font-semibold text-slate-800">
                                Email
                                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                            </label>
                            <label className="mt-5 block text-sm font-semibold text-slate-800">
                                Kata sandi
                                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                            </label>

                            {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                            <button disabled={busy} className="mt-6 w-full rounded-2xl bg-[#1764ff] px-4 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0d56e8] disabled:opacity-60">
                                {busy ? 'Memproses…' : 'Masuk'}
                            </button>
                            <p className="mt-6 text-center text-xs text-slate-400">Program Studi Matematika · Universitas Sulawesi Barat</p>
                        </form>
                    </section>
                </div>
            </main>
        );
    }

    const currentUser = data.user;

    const sidebar = (
        <div className="flex h-full flex-col bg-[linear-gradient(180deg,#03122f_0%,#071a4b_52%,#0b2d7a_100%)] text-blue-50">
            <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#0b2d7a] shadow-lg shadow-blue-950/20">
                    <GraduationCap size={23} />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold tracking-tight text-white">SiPANDU</p>
                    <p className="truncate text-[11px] font-medium text-blue-100/60">Learning Management System</p>
                </div>
            </div>

            <div className="border-b border-white/10 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/50">Masuk sebagai</p>
                <div className="mt-3 flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-bold text-white ring-1 ring-white/10">
                        {initials(currentUser.name) || 'SP'}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{currentUser.name}</p>
                        <p className="truncate text-xs text-blue-100/60">{currentUser.role_label}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-5">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/45">Menu utama</p>
                <div className="space-y-1.5">
                    <button onClick={() => { setSection('home'); setSidebarOpen(false); }} className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition ${section === 'home' ? 'bg-[#1764ff] text-white shadow-lg shadow-blue-950/25' : 'text-blue-50/75 hover:bg-white/10 hover:text-white'}`}>
                        <span className={`grid h-8 w-8 place-items-center rounded-xl ${section === 'home' ? 'bg-white/15' : 'bg-white/5 group-hover:bg-white/10'}`}><Home size={17} /></span>
                        Beranda
                    </button>
                    <button onClick={() => { setSection('classes'); setSidebarOpen(false); }} className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition ${section === 'classes' ? 'bg-[#1764ff] text-white shadow-lg shadow-blue-950/25' : 'text-blue-50/75 hover:bg-white/10 hover:text-white'}`}>
                        <span className={`grid h-8 w-8 place-items-center rounded-xl ${section === 'classes' ? 'bg-white/15' : 'bg-white/5 group-hover:bg-white/10'}`}><BookOpen size={17} /></span>
                        Kelas Saya
                    </button>
                    {currentUser.role === 'admin_prodi' && (
                        <a href="/pengguna" className="group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-blue-50/75 transition hover:bg-white/10 hover:text-white">
                            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 group-hover:bg-white/10"><Users size={17} /></span>
                            Pengguna
                        </a>
                    )}
                </div>
            </nav>

            <div className="border-t border-white/10 p-3">
                <button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-blue-50/70 transition hover:bg-white/10 hover:text-white">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/5"><LogOut size={17} /></span>
                    Keluar
                </button>
            </div>
        </div>
    );

    const classCards = classes.slice(0, 4);

    const home = (
        <div className="space-y-7">
            <section className="relative isolate overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_18%_30%,rgba(59,130,246,.78),transparent_29%),radial-gradient(circle_at_72%_72%,rgba(147,197,253,.35),transparent_30%),linear-gradient(135deg,#03122f_0%,#071a4b_48%,#0f3ea8_100%)] px-6 py-7 text-white shadow-xl shadow-blue-950/10 sm:px-8 sm:py-9">
                <div className="absolute right-[-80px] top-[-120px] -z-10 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
                <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50 backdrop-blur">
                            <Sparkles size={14} /> {currentUser.role_label}
                        </span>
                        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Selamat datang, {currentUser.name}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/75 sm:text-base">
                            Kelola kelas, bagikan materi, berikan tugas, dan pantau aktivitas pembelajaran dari satu ruang kerja yang sederhana.
                        </p>
                    </div>
                    <button onClick={() => setSection('classes')} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#08205d] shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50">
                        Buka Kelas Saya <ChevronRight size={16} />
                    </button>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
                <article className="group rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/70">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-500">Kelas Saya</p>
                            <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#08205d]">{classesBusy ? '…' : classes.length}</p>
                            <p className="mt-2 text-xs text-slate-400">Kelas yang dapat Anda akses</p>
                        </div>
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><BookOpen size={20} /></div>
                    </div>
                </article>
                <article className="group rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/70">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-500">Peserta</p>
                            <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#08205d]">{classesBusy ? '…' : totalStudents}</p>
                            <p className="mt-2 text-xs text-slate-400">Total mahasiswa pada kelas yang tampil</p>
                        </div>
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Users size={20} /></div>
                    </div>
                </article>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Pembelajaran</p>
                        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Kelas terbaru</h2>
                        <p className="mt-1 text-sm text-slate-500">Masuk langsung ke ruang kelas yang sedang Anda gunakan.</p>
                    </div>
                    <button onClick={() => void loadClasses()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" title="Muat ulang">
                        <RefreshCw size={16} className={classesBusy ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {classes.length === 0 ? (
                        <div className="lg:col-span-2 rounded-[22px] border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><BookOpen size={21} /></div>
                            <p className="mt-3 font-bold text-slate-900">Belum ada kelas</p>
                            <p className="mt-1 text-sm text-slate-500">Kelas yang Anda ikuti atau kelola akan tampil di sini.</p>
                        </div>
                    ) : classCards.map((courseClass, index) => (
                        <a key={courseClass.id} href={courseClass.detail_url} className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60">
                            <div className={`h-2 ${index % 2 === 0 ? 'bg-gradient-to-r from-[#1764ff] to-[#60a5fa]' : 'bg-gradient-to-r from-[#08205d] to-[#2563eb]'}`} />
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-sm font-extrabold text-blue-700">{courseClass.course.code.slice(0, 2).toUpperCase()}</div>
                                    <ArrowUpRight size={18} className="text-slate-300 transition group-hover:text-blue-600" />
                                </div>
                                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">{courseClass.course.code} · {courseClass.course.credits} SKS</p>
                                <h3 className="mt-1 line-clamp-2 font-bold text-slate-900 transition group-hover:text-blue-700">{courseClass.course.name} — Kelas {courseClass.name}</h3>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                    <span>{courseClass.students_count} mahasiswa</span>
                                    <span>{semesterLabel(courseClass.academic_term.semester)} {courseClass.academic_term.academic_year}</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </section>
        </div>
    );

    const classesView = (
        <div className="space-y-7">
            <section className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Workspace</p>
                    <h1 className="mt-1 text-3xl font-bold tracking-[-0.025em] text-slate-950">Kelas Saya</h1>
                    <p className="mt-2 text-sm text-slate-500">Kelola kelas, peserta, materi, dan tugas dari satu tempat.</p>
                </div>
                <button onClick={() => void loadClasses()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                    <RefreshCw size={15} className={classesBusy ? 'animate-spin' : ''} /> Muat ulang
                </button>
            </section>

            {classError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{classError}</div>}

            {canManageClasses && (
                <form onSubmit={createClass} className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Plus size={18} /></div>
                            <div><h2 className="font-bold text-slate-950">Buat kelas baru</h2><p className="mt-0.5 text-xs text-slate-500">Isi informasi dasar kelas semester.</p></div>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Kode mata kuliah"><input required value={classForm.course_code} onChange={(event) => setClassForm({ ...classForm, course_code: event.target.value })} className="lms-input" /></Field>
                        <Field label="Nama mata kuliah"><input required value={classForm.course_name} onChange={(event) => setClassForm({ ...classForm, course_name: event.target.value })} className="lms-input" /></Field>
                        <Field label="SKS"><input required type="number" min={1} max={12} value={classForm.credits} onChange={(event) => setClassForm({ ...classForm, credits: Number(event.target.value) })} className="lms-input" /></Field>
                        <Field label="Tahun akademik"><input required value={classForm.academic_year} onChange={(event) => setClassForm({ ...classForm, academic_year: event.target.value })} className="lms-input" /></Field>
                        <Field label="Semester"><select value={classForm.semester} onChange={(event) => setClassForm({ ...classForm, semester: event.target.value as 'ganjil' | 'genap' })} className="lms-input"><option value="ganjil">Ganjil</option><option value="genap">Genap</option></select></Field>
                        <Field label="Nama kelas"><input required value={classForm.class_name} onChange={(event) => setClassForm({ ...classForm, class_name: event.target.value })} className="lms-input" /></Field>
                    </div>
                    <button disabled={busy} className="mt-5 rounded-2xl bg-[#1764ff] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-[#0d56e8] disabled:opacity-50">{busy ? 'Menyimpan…' : 'Buat Kelas'}</button>
                </form>
            )}

            <section className="grid gap-5 xl:grid-cols-2">
                {classes.length === 0 && !classesBusy && (
                    <div className="xl:col-span-2 rounded-[28px] border border-dashed border-blue-200 bg-white p-10 text-center">
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><BookOpen size={21} /></div>
                        <p className="mt-3 font-bold">Belum ada kelas</p>
                    </div>
                )}
                {classes.map((courseClass, index) => {
                    const students = courseClass.members.filter((member) => member.membership_role === 'student');
                    return (
                        <article key={courseClass.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:shadow-xl hover:shadow-blue-100/50">
                            <div className={`h-2 ${index % 2 === 0 ? 'bg-gradient-to-r from-[#1764ff] via-[#3b82f6] to-[#93c5fd]' : 'bg-gradient-to-r from-[#08205d] via-[#1d4ed8] to-[#60a5fa]'}`} />
                            <div className="p-5 sm:p-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">{courseClass.course.code}</span>
                                            <span className="text-xs font-semibold text-slate-400">{courseClass.course.credits} SKS</span>
                                        </div>
                                        <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-950">{courseClass.course.name} — Kelas {courseClass.name}</h2>
                                        <p className="mt-1 text-sm text-slate-500">{semesterLabel(courseClass.academic_term.semester)} {courseClass.academic_term.academic_year}</p>
                                    </div>
                                    <a href={courseClass.detail_url} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[#1764ff] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-[#0d56e8]">Buka Kelas <ArrowUpRight size={15} /></a>
                                </div>

                                <div className="mt-5 rounded-[22px] bg-[#f6f8fc] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-bold text-slate-900">Peserta mahasiswa</h3>
                                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">{students.length} aktif</span>
                                    </div>
                                    {canManageClasses && (
                                        <div className="mt-3 flex gap-2">
                                            <input type="email" value={participantEmails[courseClass.id] ?? ''} onChange={(event) => setParticipantEmails((current) => ({ ...current, [courseClass.id]: event.target.value }))} placeholder="email mahasiswa" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                                            <button type="button" onClick={() => void addParticipant(courseClass)} className="inline-flex items-center gap-1.5 rounded-2xl bg-[#08205d] px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b2d7a]"><UserPlus size={15} /> Tambah</button>
                                        </div>
                                    )}
                                    <div className="mt-3 max-h-48 space-y-2 overflow-auto">
                                        {students.length === 0 ? <p className="text-sm text-slate-500">Belum ada mahasiswa.</p> : students.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2.5 text-sm shadow-sm">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-[10px] font-bold text-blue-700">{initials(member.user.name)}</div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-slate-900">{member.user.name}</p>
                                                        <p className="truncate text-xs text-slate-500">{member.user.email}</p>
                                                    </div>
                                                </div>
                                                {canManageClasses && <button type="button" onClick={() => void removeParticipant(courseClass, member.user)} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><X size={15} /></button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </section>
        </div>
    );

    return (
        <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
            <style>{`.lms-input{margin-top:.375rem;width:100%;border-radius:1rem;border:1px solid #e2e8f0;background:#f8fafc;padding:.7rem .85rem;outline:none;transition:.18s}.lms-input:focus{border-color:#60a5fa;background:#fff;box-shadow:0 0 0 4px #dbeafe}`}</style>
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 xl:block">{sidebar}</aside>
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 xl:hidden">
                    <button aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
                    <aside className="relative h-full w-72 shadow-2xl">{sidebar}</aside>
                </div>
            )}

            <div className="xl:pl-72">
                <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                    <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <div className="flex min-w-0 items-center gap-3">
                            <button onClick={() => setSidebarOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 xl:hidden"><Menu size={19} /></button>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-950">{section === 'home' ? 'Beranda' : 'Kelas Saya'}</p>
                                <p className="truncate text-xs text-slate-500">{activeTerm ? `${semesterLabel(activeTerm.semester)} ${activeTerm.academic_year}` : 'SiPANDU Learning Management System'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden text-right sm:block">
                                <p className="max-w-44 truncate text-sm font-bold text-slate-900">{currentUser.name}</p>
                                <p className="max-w-44 truncate text-xs text-slate-500">{currentUser.role_label}</p>
                            </div>
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#1764ff] to-[#0b2d7a] text-xs font-bold text-white shadow-md shadow-blue-100">{initials(currentUser.name) || 'SP'}</div>
                        </div>
                    </div>
                </header>

                <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {section === 'home' ? home : classesView}
                </div>
            </div>
        </main>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>;
}

createRoot(document.getElementById('app')!).render(<App />);
