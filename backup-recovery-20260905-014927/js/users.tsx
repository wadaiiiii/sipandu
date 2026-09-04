import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    identity_number: string | null;
    role: string;
    role_label: string;
    is_active: boolean;
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

function initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function UserManagement() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        email: '',
        identity_number: '',
        role: 'student',
        password: '',
    });

    const loadUsers = async () => {
        setBusy(true);
        setError('');
        const response = await fetch('/sipandu-api/users', { credentials: 'include', headers: { Accept: 'application/json' } });
        if (response.ok) {
            const payload = await response.json();
            setUsers(payload.users ?? []);
        } else {
            setError(await responseError(response));
        }
        setBusy(false);
    };

    useEffect(() => {
        void loadUsers();
    }, []);

    const createUser = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError('');

        const response = await fetch('/sipandu-api/users', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
            body: JSON.stringify(form),
        });

        if (!response.ok) {
            setError(await responseError(response));
            setBusy(false);
            return;
        }

        setForm({ name: '', email: '', identity_number: '', role: 'student', password: '' });
        await loadUsers();
    };

    const updateStatus = async (user: ManagedUser) => {
        setError('');
        const response = await fetch(`/api/users/${user.id}/status`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
            body: JSON.stringify({ is_active: !user.is_active }),
        });

        if (!response.ok) {
            setError(await responseError(response));
            return;
        }

        await loadUsers();
    };

    return (
        <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
            <style>{`.user-input{margin-top:.375rem;width:100%;border-radius:1rem;border:1px solid #e2e8f0;background:#f8fafc;padding:.7rem .85rem;outline:none;transition:.18s}.user-input:focus{border-color:#60a5fa;background:#fff;box-shadow:0 0 0 4px #dbeafe}`}</style>

            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <a href="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><ArrowLeft size={16} /></a>
                        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Administrasi</p><h1 className="text-xl font-bold tracking-tight">Kelola Pengguna</h1></div>
                    </div>
                    <button onClick={() => void loadUsers()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Muat ulang</span></button>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:py-8">
                <section className="relative isolate overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_20%_35%,rgba(59,130,246,.8),transparent_28%),radial-gradient(circle_at_78%_70%,rgba(147,197,253,.35),transparent_28%),linear-gradient(135deg,#03122f_0%,#071a4b_50%,#0f3ea8_100%)] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50 backdrop-blur"><ShieldCheck size={14} /> Admin Prodi</span>
                            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em]">Pengguna SiPANDU</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/75">Kelola akun dosen dan mahasiswa yang akan menggunakan LMS.</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-100/60">Total pengguna</p><p className="mt-1 text-2xl font-extrabold">{users.length}</p></div>
                    </div>
                </section>

                {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                <form onSubmit={createUser} className="mt-5 rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40 sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UserPlus size={18} /></div>
                        <div><h2 className="font-bold">Tambah pengguna</h2><p className="mt-0.5 text-xs text-slate-500">Buat akun baru untuk dosen, mahasiswa, UPM, atau Admin Prodi.</p></div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <Field label="Nama"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="user-input" /></Field>
                        <Field label="Email"><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="user-input" /></Field>
                        <Field label="NIM/NIDN/NIP"><input value={form.identity_number} onChange={(event) => setForm({ ...form, identity_number: event.target.value })} className="user-input" /></Field>
                        <Field label="Role"><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="user-input"><option value="student">Mahasiswa</option><option value="lecturer">Dosen</option><option value="upm">Unit Penjaminan Mutu</option><option value="admin_prodi">Admin Prodi</option></select></Field>
                        <Field label="Password awal"><input required minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="user-input" /></Field>
                    </div>
                    <div className="mt-5 flex justify-end"><button disabled={busy} className="rounded-2xl bg-[#1764ff] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-[#0d56e8] disabled:opacity-50">{busy ? 'Memproses…' : 'Tambah Pengguna'}</button></div>
                </form>

                <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Users size={17} /></div><div><h2 className="font-bold">Daftar pengguna</h2><p className="text-xs text-slate-500">Akun yang terdaftar di SiPANDU</p></div></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-[#f8fafc] text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-5 py-3.5 sm:px-6">Nama</th><th className="px-5 py-3.5">Identitas</th><th className="px-5 py-3.5">Role</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right sm:px-6">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{users.map((user) => (
                                <tr key={user.id} className="transition hover:bg-blue-50/35">
                                    <td className="px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[11px] font-bold text-blue-700">{initials(user.name)}</div><div><p className="font-bold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div></div></td>
                                    <td className="px-5 py-4 text-slate-600">{user.identity_number ?? '—'}</td>
                                    <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{user.role_label}</span></td>
                                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                                    <td className="px-5 py-4 text-right sm:px-6"><button onClick={() => void updateStatus(user)} className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${user.is_active ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{user.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>;
}

createRoot(document.getElementById('users-app')!).render(<UserManagement />);


