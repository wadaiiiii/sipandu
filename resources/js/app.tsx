import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    BookOpen,
    ChevronRight,
    GraduationCap,
    Home,
    LogOut,
    Menu,
    Plus,
    RefreshCw,
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
            <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
                <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200">
                        <GraduationCap size={28} />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-600">{error || 'Memuat SiPANDU…'}</p>
                </div>
            </div>
        );
    }

    if (!data.user) {
        return (
            <main className="min-h-screen bg-slate-950 text-white">
                <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
                    <section className="flex flex-col justify-between px-7 py-10 sm:px-12 lg:px-14 lg:py-14">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-950">
                                    <GraduationCap size={24} />
                                </div>
                                <div>
                                    <p className="text-lg font-bold">SiPANDU</p>
                                    <p className="text-xs text-slate-400">Learning Management System</p>
                                </div>
                            </div>
                            <div className="mt-20 max-w-xl">
                                <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                                    Ruang belajar sederhana untuk dosen dan mahasiswa.
                                </h1>
                                <p className="mt-5 text-base leading-7 text-slate-300">
                                    Kelola kelas, materi, tugas, pengumpulan, dan nilai dalam satu tempat.
                                </p>
                            </div>
                        </div>
                        <p className="mt-12 text-xs text-slate-500">Program Studi Matematika · Universitas Sulawesi Barat</p>
                    </section>
                    <section className="flex items-center bg-white px-7 py-10 text-slate-950 sm:px-12 lg:px-14">
                        <form onSubmit={login} className="mx-auto w-full max-w-md">
                            <p className="text-sm font-semibold text-indigo-700">SiPANDU LMS</p>
                            <h2 className="mt-2 text-3xl font-bold tracking-tight">Masuk</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan akun yang telah didaftarkan.</p>
                            <label className="mt-8 block text-sm font-semibold">
                                Email
                                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
                            </label>
                            <label className="mt-5 block text-sm font-semibold">
                                Kata sandi
                                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
                            </label>
                            {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                            <button disabled={busy} className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                                {busy ? 'Memproses…' : 'Masuk'}
                            </button>
                        </form>
                    </section>
                </div>
            </main>
        );
    }

    const currentUser = data.user;

    const sidebar = (
        <div className="flex h-full flex-col bg-slate-950 text-slate-300">
            <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-950"><GraduationCap size={22} /></div>
                <div className="min-w-0">
                    <p className="truncate font-bold text-white">SiPANDU</p>
                    <p className="truncate text-xs text-slate-400">Learning Management System</p>
                </div>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-5">
                <button onClick={() => { setSection('home'); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${section === 'home' ? 'bg-white text-slate-950' : 'hover:bg-white/10 hover:text-white'}`}>
                    <Home size={18} /> Beranda
                </button>
                <button onClick={() => { setSection('classes'); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${section === 'classes' ? 'bg-white text-slate-950' : 'hover:bg-white/10 hover:text-white'}`}>
                    <BookOpen size={18} /> Kelas Saya
                </button>
                {currentUser.role === 'admin_prodi' && (
                    <a href="/pengguna" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white/10 hover:text-white">
                        <Users size={18} /> Pengguna
                    </a>
                )}
            </nav>
            <div className="border-t border-white/10 p-3">
                <button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white/10 hover:text-white">
                    <LogOut size={18} /> Keluar
                </button>
            </div>
        </div>
    );

    const home = (
        <div className="space-y-6">
            <section className="rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8">
                <p className="text-sm text-slate-300">{currentUser.role_label}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">Selamat datang, {currentUser.name}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Buka kelas untuk melihat materi, tugas, dan aktivitas pembelajaran.</p>
                <button onClick={() => setSection('classes')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950">
                    Buka Kelas Saya <ChevronRight size={16} />
                </button>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">Kelas</p>
                    <p className="mt-2 text-3xl font-bold">{classesBusy ? '…' : classes.length}</p>
                    <p className="mt-2 text-xs text-slate-400">Kelas yang dapat Anda akses</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">Mahasiswa</p>
                    <p className="mt-2 text-3xl font-bold">{classesBusy ? '…' : totalStudents}</p>
                    <p className="mt-2 text-xs text-slate-400">Total peserta pada kelas yang tampil</p>
                </article>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold">Kelas terbaru</h2>
                        <p className="mt-1 text-sm text-slate-500">Masuk langsung ke ruang kelas.</p>
                    </div>
                    <button onClick={() => void loadClasses()} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" title="Muat ulang"><RefreshCw size={16} /></button>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {classes.length === 0 ? (
                        <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                            <BookOpen className="mx-auto text-slate-400" />
                            <p className="mt-3 font-semibold">Belum ada kelas</p>
                        </div>
                    ) : classes.slice(0, 4).map((courseClass) => (
                        <a key={courseClass.id} href={courseClass.detail_url} className="rounded-2xl border border-slate-200 p-4 hover:shadow-md">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{courseClass.course.code} · {courseClass.course.credits} SKS</p>
                            <h3 className="mt-2 font-bold">{courseClass.course.name} — Kelas {courseClass.name}</h3>
                            <p className="mt-3 text-sm text-slate-500">{courseClass.students_count} mahasiswa</p>
                        </a>
                    ))}
                </div>
            </section>
        </div>
    );

    const classesView = (
        <div className="space-y-6">
            <section className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Kelas Saya</h1>
                    <p className="mt-1 text-sm text-slate-500">Kelola kelas, peserta, dan masuk ke ruang pembelajaran.</p>
                </div>
                <button onClick={() => void loadClasses()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                    <RefreshCw size={15} className={classesBusy ? 'animate-spin' : ''} /> Muat ulang
                </button>
            </section>

            {classError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{classError}</div>}

            {canManageClasses && (
                <form onSubmit={createClass} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-2"><Plus size={18} /><h2 className="font-bold">Buat kelas</h2></div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="text-sm font-medium">Kode mata kuliah<input required value={classForm.course_code} onChange={(event) => setClassForm({ ...classForm, course_code: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                        <label className="text-sm font-medium">Nama mata kuliah<input required value={classForm.course_name} onChange={(event) => setClassForm({ ...classForm, course_name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                        <label className="text-sm font-medium">SKS<input required type="number" min={1} max={12} value={classForm.credits} onChange={(event) => setClassForm({ ...classForm, credits: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                        <label className="text-sm font-medium">Tahun akademik<input required value={classForm.academic_year} onChange={(event) => setClassForm({ ...classForm, academic_year: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                        <label className="text-sm font-medium">Semester<select value={classForm.semester} onChange={(event) => setClassForm({ ...classForm, semester: event.target.value as 'ganjil' | 'genap' })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="ganjil">Ganjil</option><option value="genap">Genap</option></select></label>
                        <label className="text-sm font-medium">Nama kelas<input required value={classForm.class_name} onChange={(event) => setClassForm({ ...classForm, class_name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                    </div>
                    <button disabled={busy} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Menyimpan…' : 'Buat Kelas'}</button>
                </form>
            )}

            <section className="space-y-4">
                {classes.map((courseClass) => {
                    const students = courseClass.members.filter((member) => member.membership_role === 'student');
                    return (
                        <article key={courseClass.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{courseClass.course.code} · {courseClass.course.credits} SKS</p>
                                    <h2 className="mt-2 text-lg font-bold">{courseClass.course.name} — Kelas {courseClass.name}</h2>
                                    <p className="mt-1 text-sm text-slate-500">{semesterLabel(courseClass.academic_term.semester)} {courseClass.academic_term.academic_year}</p>
                                </div>
                                <a href={courseClass.detail_url} className="w-fit rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Buka Kelas</a>
                            </div>

                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-bold">Peserta</h3>
                                    <span className="text-xs text-slate-500">{students.length} mahasiswa</span>
                                </div>
                                {canManageClasses && (
                                    <div className="mt-3 flex gap-2">
                                        <input type="email" value={participantEmails[courseClass.id] ?? ''} onChange={(event) => setParticipantEmails((current) => ({ ...current, [courseClass.id]: event.target.value }))} placeholder="email mahasiswa" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                                        <button type="button" onClick={() => void addParticipant(courseClass)} className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white"><UserPlus size={15} /> Tambah</button>
                                    </div>
                                )}
                                <div className="mt-3 max-h-48 space-y-2 overflow-auto">
                                    {students.length === 0 ? <p className="text-sm text-slate-500">Belum ada mahasiswa.</p> : students.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold">{member.user.name}</p>
                                                <p className="truncate text-xs text-slate-500">{member.user.email}</p>
                                            </div>
                                            {canManageClasses && <button type="button" onClick={() => void removeParticipant(courseClass, member.user)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={15} /></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </article>
                    );
                })}
            </section>
        </div>
    );

    return (
        <main className="min-h-screen bg-slate-100 text-slate-950">
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 xl:block">{sidebar}</aside>
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 xl:hidden">
                    <button aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-slate-950/50" />
                    <aside className="relative h-full w-72 shadow-2xl">{sidebar}</aside>
                </div>
            )}
            <div className="xl:pl-64">
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                    <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <div className="flex min-w-0 items-center gap-3">
                            <button onClick={() => setSidebarOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 xl:hidden"><Menu size={19} /></button>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold">{section === 'home' ? 'Beranda' : 'Kelas Saya'}</p>
                                <p className="truncate text-xs text-slate-500">{activeTerm ? `${semesterLabel(activeTerm.semester)} ${activeTerm.academic_year}` : 'SiPANDU LMS'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white">{initials(currentUser.name) || 'SP'}</div>
                            <div className="hidden sm:block">
                                <p className="max-w-40 truncate text-sm font-bold">{currentUser.name}</p>
                                <p className="max-w-40 truncate text-xs text-slate-500">{currentUser.role_label}</p>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{section === 'home' ? home : classesView}</div>
            </div>
        </main>
    );
}

createRoot(document.getElementById('app')!).render(<App />);
