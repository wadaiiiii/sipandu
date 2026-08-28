import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Bell,
    BookOpenCheck,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    DatabaseZap,
    GraduationCap,
    Home,
    Layers3,
    LogOut,
    Menu,
    Plus,
    RefreshCw,
    Settings,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    UserPlus,
    Users,
    X,
} from 'lucide-react';

type Source = {
    value: string;
    label: string;
    enabled: boolean;
    description: string;
};

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
    rps_sources: Source[];
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
    rps_source_type: string;
    rps_source_label: string;
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
    rps_source_type: string;
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
        rps_source_type: 'manual',
    });

    const canManageClasses = useMemo(
        () => ['admin_prodi', 'lecturer'].includes(data?.user?.role ?? ''),
        [data?.user?.role],
    );

    const activeTerm = useMemo(() => {
        const active = classes.find((courseClass) => courseClass.academic_term.is_active)?.academic_term;
        return active ?? classes[0]?.academic_term ?? null;
    }, [classes]);

    const dashboardStats = useMemo(() => {
        const enrolments = classes.reduce((sum, courseClass) => sum + courseClass.students_count, 0);
        const credits = classes.reduce((sum, courseClass) => sum + Number(courseClass.course.credits || 0), 0);
        const drafts = classes.filter((courseClass) => courseClass.status === 'draft').length;
        return { enrolments, credits, drafts };
    }, [classes]);

    const sourceSummary = useMemo(
        () => data?.rps_sources.filter((source) => source.enabled).length ?? 0,
        [data?.rps_sources],
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
        if (response.ok) {
            const payload = await response.json();
            setClasses(payload.classes ?? []);
        } else {
            setClassError(await responseError(response));
        }
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
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
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
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
            body: JSON.stringify(classForm),
        });

        if (!response.ok) {
            setClassError(await responseError(response));
            setBusy(false);
            return;
        }

        setClassForm((current) => ({ ...current, class_name: 'A' }));
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
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
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
                    {error && <button onClick={() => void load()} className="mt-3 text-sm font-semibold text-indigo-700">Coba lagi</button>}
                </div>
            </div>
        );
    }

    if (!data.user) {
        return (
            <main className="min-h-screen bg-slate-950 text-white">
                <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.15fr_.85fr]">
                    <section className="relative overflow-hidden px-6 py-10 sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-14">
                        <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
                        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-950"><GraduationCap size={24} /></div>
                                <div><p className="text-lg font-bold tracking-tight">SiPANDU</p><p className="text-xs text-slate-400">LMS Berbasis OBE</p></div>
                            </div>
                            <div className="mt-20 max-w-2xl lg:mt-0 lg:self-center">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300"><Sparkles size={14} /> Pembelajaran OBE yang terhubung</span>
                                <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Satu ruang kerja untuk kelas, asesmen, dan capaian pembelajaran.</h1>
                                <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Kelola pelaksanaan perkuliahan semester, peserta, RPS, dan bukti capaian OBE secara terstruktur.</p>
                            </div>
                        </div>
                        <div className="relative z-10 mt-14 grid gap-3 sm:grid-cols-3">
                            {[['Kelas Semester', 'Terkelola dalam satu LMS'], ['Snapshot RPS', 'Riwayat tetap konsisten'], ['OBE', 'Siap menuju attainment']].map(([title, subtitle]) => (
                                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p></div>
                            ))}
                        </div>
                    </section>
                    <section className="flex items-center bg-white px-6 py-10 text-slate-950 sm:px-10 lg:px-14">
                        <form onSubmit={login} className="mx-auto w-full max-w-md">
                            <p className="text-sm font-semibold text-indigo-700">Portal Akademik Matematika</p>
                            <h2 className="mt-2 text-3xl font-bold tracking-tight">Masuk ke SiPANDU</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan akun akademik yang telah didaftarkan oleh Admin Prodi.</p>
                            <label className="mt-8 block text-sm font-semibold">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
                            <label className="mt-5 block text-sm font-semibold">Kata sandi<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
                            {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                            <button disabled={busy} className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{busy ? 'Memproses…' : 'Masuk ke SiPANDU'}</button>
                            <p className="mt-6 text-center text-xs text-slate-400">SiPANDU · Platform Pelaksanaan Pembelajaran Berbasis OBE</p>
                        </form>
                    </section>
                </div>
            </main>
        );
    }

    const navItems = [
        { label: 'Beranda', icon: Home, section: 'home' as Section },
        { label: 'Kelas Saya', icon: BookOpenCheck, section: 'classes' as Section },
        { label: 'Kalender', icon: CalendarDays, disabled: true },
        { label: 'Asesmen OBE', icon: ClipboardCheck, disabled: true },
        { label: 'Nilai & OBE', icon: TrendingUp, disabled: true },
    ];

    const sidebar = (
        <div className="flex h-full flex-col bg-slate-950 text-slate-300">
            <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-950"><GraduationCap size={22} /></div>
                <div className="min-w-0"><p className="truncate font-bold text-white">SiPANDU</p><p className="truncate text-xs text-slate-400">LMS Berbasis OBE</p></div>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-5">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = 'section' in item && section === item.section;
                    if (item.disabled) {
                        return <div key={item.label} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600"><Icon size={18} /><span>{item.label}</span><span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">Segera</span></div>;
                    }
                    return <button key={item.label} onClick={() => { setSection(item.section); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon size={18} /><span>{item.label}</span></button>;
                })}

                <div className="my-5 border-t border-white/10" />
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Administrasi</p>
                {data.user.role === 'admin_prodi' && <a href="/pengguna" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"><Users size={18} /> Kelola Pengguna</a>}
                <div className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600"><ShieldCheck size={18} /> Monitoring UPM<span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">Segera</span></div>
                <div className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600"><Settings size={18} /> Pengaturan<span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">Segera</span></div>
            </nav>
            <div className="border-t border-white/10 p-3">
                <button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"><LogOut size={18} /> Keluar</button>
            </div>
        </div>
    );

    const renderHome = () => (
        <div className="space-y-7">
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8">
                <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300"><span>{data.user.role_label}</span><span className="h-1 w-1 rounded-full bg-slate-600" /><span>{activeTerm ? `${semesterLabel(activeTerm.semester)} ${activeTerm.academic_year}` : 'Semester belum ditetapkan'}</span></div>
                        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Selamat datang, {data.user.name}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Pantau kelas semester, peserta, dan kesiapan pelaksanaan pembelajaran dari satu dashboard.</p>
                    </div>
                    <button onClick={() => setSection('classes')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">Buka Kelas Semester <ChevronRight size={16} /></button>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Kelas Semester', value: classesBusy ? '…' : String(classes.length), note: 'Kelas terdaftar', icon: BookOpenCheck },
                    { label: 'Peserta Kelas', value: classesBusy ? '…' : String(dashboardStats.enrolments), note: 'Total enrolment aktif', icon: Users },
                    { label: 'Total SKS', value: classesBusy ? '…' : String(dashboardStats.credits), note: 'Beban kelas terdata', icon: Layers3 },
                    { label: 'Kelas Draft', value: classesBusy ? '…' : String(dashboardStats.drafts), note: 'Perlu disiapkan', icon: ClipboardCheck },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">{stat.label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{stat.value}</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon size={19} /></div></div><p className="mt-3 text-xs text-slate-400">{stat.note}</p></article>;
                })}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Pembelajaran</p><h2 className="mt-1 text-xl font-bold text-slate-950">Kelas Semester</h2><p className="mt-1 text-sm text-slate-500">Kelas terbaru yang dapat langsung dikelola.</p></div><button onClick={() => setSection('classes')} className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">Lihat semua</button></div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        {classesBusy && classes.length === 0 ? (
                            <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Memuat kelas semester…</div>
                        ) : classes.length === 0 ? (
                            <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center"><BookOpenCheck className="mx-auto text-slate-400" /><p className="mt-3 font-semibold text-slate-800">Belum ada kelas semester</p><p className="mt-1 text-sm text-slate-500">Buat kelas pertama untuk memulai pelaksanaan pembelajaran.</p>{canManageClasses && <button onClick={() => setSection('classes')} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Buat Kelas</button>}</div>
                        ) : classes.slice(0, 4).map((courseClass) => (
                            <a key={courseClass.id} href={courseClass.detail_url} className="group rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                                <div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 font-bold text-indigo-700">{courseClass.course.code.slice(0, 2).toUpperCase()}</div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${courseClass.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{courseClass.status === 'draft' ? 'Draft' : courseClass.status}</span></div>
                                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{courseClass.course.code} · {courseClass.course.credits} SKS</p>
                                <h3 className="mt-1 line-clamp-2 font-bold text-slate-900 group-hover:text-indigo-700">{courseClass.course.name} — Kelas {courseClass.name}</h3>
                                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{courseClass.students_count} mahasiswa</span><span className="font-medium text-slate-700">{courseClass.rps_source_label}</span></div>
                            </a>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Status Sistem</p><h2 className="mt-1 text-lg font-bold">Kesiapan SiPANDU</h2></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={18} /></span></div>
                        <div className="mt-5 space-y-3">
                            {[['Foundation', 'Aktif'], ['Database Produksi', 'Terhubung'], ['Sumber RPS Siap', `${sourceSummary}/${data.rps_sources.length}`]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3.5 py-3"><span className="text-sm text-slate-600">{label}</span><span className="text-sm font-semibold text-slate-900">{value}</span></div>)}
                        </div>
                    </article>

                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><DatabaseZap size={18} /></div><div><p className="text-sm font-bold text-slate-900">Integrasi RPS</p><p className="text-xs text-slate-500">Sumber dapat berubah tanpa merusak kelas.</p></div></div>
                        <div className="mt-4 flex flex-wrap gap-2">{data.rps_sources.map((source) => <span key={source.value} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${source.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{source.label}</span>)}</div>
                    </article>
                </div>
            </section>
        </div>
    );

    const renderClasses = () => (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Pelaksanaan Pembelajaran</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Kelas Semester</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Kelola mata kuliah, rombel, sumber RPS, dosen, dan peserta mahasiswa pada semester berjalan.</p></div>
                <button onClick={() => void loadClasses()} disabled={classesBusy} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={classesBusy ? 'animate-spin' : ''} /> Muat ulang</button>
            </section>

            {classError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{classError}</div>}

            {canManageClasses && (
                <form onSubmit={createClass} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white"><Plus size={18} /></div><div><h2 className="font-bold text-slate-950">Buat Kelas Baru</h2><p className="text-sm text-slate-500">Kelas baru otomatis memiliki 16 slot pertemuan.</p></div></div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label className="text-sm font-semibold text-slate-700">Kode MK<input required value={classForm.course_code} onChange={(e) => setClassForm({ ...classForm, course_code: e.target.value })} placeholder="MAT041325" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
                        <label className="text-sm font-semibold text-slate-700 xl:col-span-2">Nama Mata Kuliah<input required value={classForm.course_name} onChange={(e) => setClassForm({ ...classForm, course_name: e.target.value })} placeholder="Algoritma & Dasar Pemrograman" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
                        <label className="text-sm font-semibold text-slate-700">SKS<input required min={1} max={12} type="number" value={classForm.credits} onChange={(e) => setClassForm({ ...classForm, credits: Number(e.target.value) })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
                        <label className="text-sm font-semibold text-slate-700">Tahun Akademik<input required value={classForm.academic_year} onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
                        <label className="text-sm font-semibold text-slate-700">Semester<select value={classForm.semester} onChange={(e) => setClassForm({ ...classForm, semester: e.target.value as 'ganjil' | 'genap' })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"><option value="ganjil">Ganjil</option><option value="genap">Genap</option></select></label>
                        <label className="text-sm font-semibold text-slate-700">Nama/Rombel Kelas<input required value={classForm.class_name} onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })} placeholder="A" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
                        <label className="text-sm font-semibold text-slate-700">Sumber RPS<select value={classForm.rps_source_type} onChange={(e) => setClassForm({ ...classForm, rps_source_type: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">{data.rps_sources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label>
                    </div>
                    <div className="mt-5 flex justify-end"><button disabled={busy} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">{busy ? 'Menyimpan…' : 'Buat Kelas'}</button></div>
                </form>
            )}

            <section className="grid gap-5">
                {classesBusy && classes.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Memuat kelas…</div> : classes.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpenCheck className="mx-auto text-slate-400" /><p className="mt-3 font-bold text-slate-800">Belum ada kelas semester</p><p className="mt-1 text-sm text-slate-500">Buat kelas pertama untuk memulai pelaksanaan pembelajaran.</p></div>
                ) : classes.map((courseClass) => {
                    const students = courseClass.members.filter((member) => member.membership_role === 'student');
                    const lecturers = courseClass.members.filter((member) => member.membership_role === 'lecturer');
                    return (
                        <article key={courseClass.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex min-w-0 gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 font-bold text-indigo-700">{courseClass.course.code.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-400">{courseClass.course.code}</span><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{courseClass.rps_source_label}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-amber-700">{courseClass.status}</span></div><h2 className="mt-2 text-lg font-bold text-slate-950">{courseClass.course.name} — Kelas {courseClass.name}</h2><p className="mt-1 text-sm text-slate-500">{courseClass.course.credits} SKS · {semesterLabel(courseClass.academic_term.semester)} {courseClass.academic_term.academic_year}</p></div></div>
                                <div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"><Users size={16} /> {courseClass.students_count} mahasiswa</span><a href={courseClass.detail_url} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Buka Ruang Kelas</a></div>
                            </div>

                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4"><h3 className="text-sm font-bold text-slate-800">Dosen Kelas</h3><div className="mt-3 space-y-2">{lecturers.length === 0 ? <p className="text-sm text-slate-500">Belum ada dosen.</p> : lecturers.map((member) => <div key={member.id} className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm">{initials(member.user.name)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{member.user.name}</p><p className="truncate text-xs text-slate-500">{member.user.email}</p></div></div>)}</div></div>
                                <div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">Peserta Mahasiswa</h3><span className="text-xs font-medium text-slate-500">{students.length} aktif</span></div>
                                    {canManageClasses && <div className="mt-3 flex gap-2"><input type="email" value={participantEmails[courseClass.id] ?? ''} onChange={(e) => setParticipantEmails((current) => ({ ...current, [courseClass.id]: e.target.value }))} placeholder="email mahasiswa" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" /><button type="button" onClick={() => void addParticipant(courseClass)} className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white"><UserPlus size={15} /> Tambah</button></div>}
                                    <div className="mt-3 max-h-48 space-y-2 overflow-auto">{students.length === 0 ? <p className="text-sm text-slate-500">Belum ada mahasiswa.</p> : students.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-slate-800">{member.user.name}</p><p className="truncate text-xs text-slate-500">{member.user.identity_number ? `${member.user.identity_number} · ` : ''}{member.user.email}</p></div>{canManageClasses && <button type="button" title="Keluarkan mahasiswa" onClick={() => void removeParticipant(courseClass, member.user)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={15} /></button>}</div>)}</div>
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
            {sidebarOpen && <div className="fixed inset-0 z-50 xl:hidden"><button aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" /><aside className="relative h-full w-72 shadow-2xl">{sidebar}</aside></div>}

            <div className="xl:pl-64">
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                    <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <div className="flex min-w-0 items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 xl:hidden"><Menu size={19} /></button><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{section === 'home' ? 'Beranda' : 'Kelas Semester'}</p><p className="truncate text-xs text-slate-500">{activeTerm ? `${semesterLabel(activeTerm.semester)} ${activeTerm.academic_year}` : 'SiPANDU · LMS Berbasis OBE'}</p></div></div>
                        <div className="flex items-center gap-2 sm:gap-3"><button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><Bell size={18} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" /></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white">{initials(data.user.name) || 'AP'}</div><div className="hidden min-w-0 sm:block"><p className="max-w-40 truncate text-sm font-bold text-slate-900">{data.user.name}</p><p className="max-w-40 truncate text-xs text-slate-500">{data.user.role_label}</p></div></div></div>
                    </div>
                </header>

                <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{section === 'home' ? renderHome() : renderClasses()}</div>
            </div>
        </main>
    );
}

createRoot(document.getElementById('app')!).render(<App />);
