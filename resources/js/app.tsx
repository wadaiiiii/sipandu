import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpenCheck, DatabaseZap, GraduationCap, Layers3, LogOut, ShieldCheck } from 'lucide-react';

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
    role_label: string;
};

type Bootstrap = {
    product: { name: string; tagline: string; operationally_independent: boolean };
    user: User | null;
    rps_sources: Source[];
};

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function App() {
    const [data, setData] = useState<Bootstrap | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        const response = await fetch('/api/bootstrap', { credentials: 'include' });
        setData(await response.json());
    };

    useEffect(() => {
        void load();
    }, []);

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
            const payload = await response.json();
            const message = Object.values(payload.errors ?? {}).flat()[0];
            setError(String(message ?? 'Login belum berhasil.'));
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
        await load();
    };

    if (!data) {
        return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Memuat SiPANDU…</div>;
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><GraduationCap size={22} /></div>
                        <div><div className="font-semibold">SiPANDU</div><div className="text-xs text-slate-500">LMS Berbasis OBE</div></div>
                    </div>
                    {data.user && (
                        <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"><LogOut size={16} /> Keluar</button>
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
            ) : (
                <section className="mx-auto max-w-7xl px-6 py-10">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div><p className="text-sm text-slate-500">{data.user.role_label}</p><h1 className="mt-1 text-3xl font-bold">Selamat datang, {data.user.name}</h1></div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">Foundation aktif</span>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <article className="rounded-2xl border border-slate-200 bg-white p-5"><BookOpenCheck className="text-slate-700" /><h2 className="mt-4 font-semibold">Kelas Semester</h2><p className="mt-1 text-sm text-slate-500">Mata kuliah → kelas → pertemuan → aktivitas pembelajaran.</p></article>
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
            )}
        </main>
    );
}

createRoot(document.getElementById('app')!).render(<App />);
