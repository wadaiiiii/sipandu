import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    BookOpenCheck,
    DatabaseZap,
    GraduationCap,
    Layers3,
    LogOut,
    Plus,
    RefreshCw,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users,
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

function App() {
    const [data, setData] = useState<Bootstrap | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [section, setSection] = useState<'home' | 'classes'>('home');
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [classesBusy, setClassesBusy] = useState(false);
    const [classError, setClassError] = useState('');
    const [participantEmails, setParticipantEmails] = useState<Record<number, string>>({});
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

    const load = async () => {
        const response = await fetch('/api/bootstrap', { credentials: 'include' });
        setData(await response.json());
    };

    const loadClasses = async () => {
        if (!data?.user) return;
        setClassesBusy(true);
        setClassError('');
        const response = await fetch('/api/classes', { credentials: 'include', headers: { Accept: 'application/json' } });
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

        const response = await fetch('/api/classes', {
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
        const response = await fetch(`/api/classes/${courseClass.id}/participants`, {
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
        const response = await fetch(`/api/classes/${courseClass.id}/participants/${participant.id}`, {
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
        return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Memuat SiPANDU…</div>;
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><GraduationCap size={22} /></div>
                        <div><div className="font-semibold">SiPANDU</div><div className="text-xs text-slate-500">LMS Berbasis OBE</div></div>
                    </div>
                    {data.user && (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <button onClick={() => setSection('home')} className={`rounded-lg px-3 py-2 text-sm ${section === 'home' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}>Beranda</button>
                            <button onClick={() => setSection('classes')} className={`rounded-lg px-3 py-2 text-sm ${section === 'classes' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}>Kelas Semester</button>
                            {data.user.role === 'admin_prodi' && <a href="/pengguna" className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Kelola Pengguna</a>}
                            <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"><LogOut size={16} /> Keluar</button>
                        </div>
                    )}
                </div>
            </header>

            {!data.user ? (
                <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"><ShieldCheck size={16} /> Mandiri dari satu sumber RPS</span>
                        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Pelaksanaan pembelajaran OBE yang tetap berjalan ketika sistem RPS berubah.</h1>
                        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">SiPANDU menyimpan snapshot RPS di kelas semester. SiMatRPS dapat terhubung, tetapi bukan dependency wajib LMS.</p>
                    </div>
                    <form onSubmit={login} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">Masuk ke SiPANDU</h2>
                        <p className="mt-1 text-sm text-slate-500">Gunakan akun akademik yang terdaftar.</p>
                        <label className="mt-5 block text-sm font-medium">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500" /></label>
                        <label className="mt-4 block text-sm font-medium">Kata sandi<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500" /></label>
                        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
                        <button disabled={busy} className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white disabled:opacity-60">{busy ? 'Memproses…' : 'Masuk'}</button>
                    </form>
                </section>
            ) : section === 'home' ? (
                <section className="mx-auto max-w-7xl px-6 py-10">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div><p className="text-sm text-slate-500">{data.user.role_label}</p><h1 className="mt-1 text-3xl font-bold">Selamat datang, {data.user.name}</h1></div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">Foundation aktif</span>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <button onClick={() => setSection('classes')} className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-slate-400 hover:shadow-sm"><BookOpenCheck className="text-slate-700" /><h2 className="mt-4 font-semibold">Kelas Semester</h2><p className="mt-1 text-sm text-slate-500">Kelola mata kuliah, kelas, semester, peserta, dan sumber RPS.</p></button>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5"><Layers3 className="text-slate-700" /><h2 className="mt-4 font-semibold">Asesmen OBE</h2><p className="mt-1 text-sm text-slate-500">Nilai akan ditautkan ke Sub-CPMK dan CPMK.</p></article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5"><DatabaseZap className="text-slate-700" /><h2 className="mt-4 font-semibold">Snapshot RPS</h2><p className="mt-1 text-sm text-slate-500">Riwayat kelas tidak rusak ketika sumber RPS berubah.</p></article>
                    </div>

                    <h2 className="mt-10 text-xl font-semibold">Sumber RPS</h2>
                    <p className="mt-1 text-sm text-slate-500">Tidak ada satu sumber yang menjadi dependency wajib.</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {data.rps_sources.map((source) => (
                            <article key={source.value} className="rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{source.label}</h3><span className={`rounded-full px-2 py-1 text-xs font-medium ${source.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{source.enabled ? 'Siap' : 'Belum dikonfigurasi'}</span></div>
                                <p className="mt-3 text-sm leading-6 text-slate-500">{source.description}</p>
                            </article>
                        ))}
                    </div>
                </section>
            ) : (
                <section className="mx-auto max-w-7xl px-6 py-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div><p className="text-sm font-medium text-slate-500">Pelaksanaan Pembelajaran</p><h1 className="mt-1 text-3xl font-bold">Kelas Semester</h1><p className="mt-2 text-sm text-slate-500">Setiap kelas menyimpan sumber RPS dan peserta secara lokal di SiPANDU.</p></div>
                        <button onClick={() => void loadClasses()} disabled={classesBusy} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={classesBusy ? 'animate-spin' : ''} /> Muat ulang</button>
                    </div>

                    {classError && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{classError}</div>}

                    {canManageClasses && (
                        <form onSubmit={createClass} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2"><Plus size={18} /><h2 className="font-semibold">Buat Kelas Baru</h2></div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <label className="text-sm font-medium">Kode MK<input required value={classForm.course_code} onChange={(e) => setClassForm({ ...classForm, course_code: e.target.value })} placeholder="MAT041325" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="text-sm font-medium lg:col-span-2">Nama Mata Kuliah<input required value={classForm.course_name} onChange={(e) => setClassForm({ ...classForm, course_name: e.target.value })} placeholder="Algoritma & Dasar Pemrograman" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="text-sm font-medium">SKS<input required min={1} max={12} type="number" value={classForm.credits} onChange={(e) => setClassForm({ ...classForm, credits: Number(e.target.value) })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="text-sm font-medium">Tahun Akademik<input required value={classForm.academic_year} onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="text-sm font-medium">Semester<select value={classForm.semester} onChange={(e) => setClassForm({ ...classForm, semester: e.target.value as 'ganjil' | 'genap' })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="ganjil">Ganjil</option><option value="genap">Genap</option></select></label>
                                <label className="text-sm font-medium">Nama/Rombel Kelas<input required value={classForm.class_name} onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })} placeholder="A" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="text-sm font-medium">Sumber RPS<select value={classForm.rps_source_type} onChange={(e) => setClassForm({ ...classForm, rps_source_type: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2">{data.rps_sources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label>
                            </div>
                            <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Menyimpan…' : 'Buat Kelas'}</button></div>
                        </form>
                    )}

                    <div className="mt-6 grid gap-5">
                        {classesBusy && classes.length === 0 ? <p className="text-sm text-slate-500">Memuat kelas…</p> : classes.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpenCheck className="mx-auto text-slate-400" /><p className="mt-3 font-medium">Belum ada kelas semester</p><p className="mt-1 text-sm text-slate-500">Buat kelas pertama untuk memulai pelaksanaan pembelajaran.</p></div>
                        ) : classes.map((courseClass) => {
                            const students = courseClass.members.filter((member) => member.membership_role === 'student');
                            const lecturers = courseClass.members.filter((member) => member.membership_role === 'lecturer');
                            return (
                                <article key={courseClass.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex flex-wrap justify-between gap-4">
                                        <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{courseClass.course.code}</span><span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{courseClass.rps_source_label}</span><span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium capitalize text-amber-700">{courseClass.status}</span></div><h2 className="mt-3 text-lg font-semibold">{courseClass.course.name} — Kelas {courseClass.name}</h2><p className="mt-1 text-sm text-slate-500">{courseClass.course.credits} SKS · {courseClass.academic_term.semester === 'ganjil' ? 'Ganjil' : 'Genap'} {courseClass.academic_term.academic_year}</p></div>
                                        <div className="flex flex-wrap items-center justify-end gap-3"><div className="flex items-center gap-2 text-sm text-slate-500"><Users size={17} /> {courseClass.students_count} mahasiswa</div><a href={courseClass.detail_url} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">Buka Ruang Kelas</a></div>
                                    </div>

                                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold">Dosen Kelas</h3><div className="mt-2 space-y-2">{lecturers.map((member) => <div key={member.id} className="text-sm"><span className="font-medium">{member.user.name}</span><span className="ml-2 text-slate-500">{member.user.email}</span></div>)}</div></div>
                                        <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Peserta Mahasiswa</h3><span className="text-xs text-slate-500">{students.length} aktif</span></div>
                                            {canManageClasses && (
                                                <div className="mt-3 flex gap-2"><input type="email" value={participantEmails[courseClass.id] ?? ''} onChange={(e) => setParticipantEmails((current) => ({ ...current, [courseClass.id]: e.target.value }))} placeholder="email mahasiswa" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => void addParticipant(courseClass)} className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"><UserPlus size={15} /> Tambah</button></div>
                                            )}
                                            <div className="mt-3 max-h-52 space-y-2 overflow-auto">{students.length === 0 ? <p className="text-sm text-slate-500">Belum ada mahasiswa.</p> : students.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"><div className="min-w-0"><p className="truncate font-medium">{member.user.name}</p><p className="truncate text-xs text-slate-500">{member.user.identity_number ? `${member.user.identity_number} · ` : ''}{member.user.email}</p></div>{canManageClasses && <button type="button" title="Keluarkan mahasiswa" onClick={() => void removeParticipant(courseClass, member.user)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>}</div>)}</div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}
        </main>
    );
}

createRoot(document.getElementById('app')!).render(<App />);
