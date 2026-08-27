import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, RefreshCw, UserPlus, Users } from 'lucide-react';

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
        const response = await fetch('/api/users', { credentials: 'include', headers: { Accept: 'application/json' } });
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

        const response = await fetch('/api/users', {
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
        <main className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Administrasi SiPANDU</p><h1 className="text-xl font-semibold">Kelola Pengguna</h1></div>
                    <a href="/" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"><ArrowLeft size={16} /> Kembali ke SiPANDU</a>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-8">
                {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                <form onSubmit={createUser} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2"><UserPlus size={18} /><h2 className="font-semibold">Tambah Pengguna</h2></div>
                    <p className="mt-1 text-sm text-slate-500">Buat akun dosen, mahasiswa, UPM, atau Admin Prodi. Nomor identitas dapat berupa NIM/NIDN/NIP/NUPTK.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <label className="text-sm font-medium">Nama<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                        <label className="text-sm font-medium">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                        <label className="text-sm font-medium">NIM/NIDN/NIP/NUPTK<input value={form.identity_number} onChange={(e) => setForm({ ...form, identity_number: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                        <label className="text-sm font-medium">Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="student">Mahasiswa</option><option value="lecturer">Dosen</option><option value="upm">Unit Penjaminan Mutu</option><option value="admin_prodi">Admin Prodi</option></select></label>
                        <label className="text-sm font-medium">Password awal<input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                    </div>
                    <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Memproses…' : 'Tambah Pengguna'}</button></div>
                </form>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-2"><Users size={18} /><h2 className="font-semibold">Daftar Pengguna</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{users.length}</span></div><button onClick={() => void loadUsers()} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Muat ulang</button></div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">Identitas</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}><td className="px-5 py-3"><p className="font-medium text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-5 py-3 text-slate-600">{user.identity_number ?? '—'}</td><td className="px-5 py-3"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{user.role_label}</span></td><td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td className="px-5 py-3 text-right"><button onClick={() => void updateStatus(user)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${user.is_active ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{user.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></td></tr>)}</tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
    );
}

createRoot(document.getElementById('users-app')!).render(<UserManagement />);
