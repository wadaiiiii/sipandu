import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Check, Clock3, LoaderCircle, UserCheck, UserX, Users, X } from 'lucide-react';

type Member = {
    id: number;
    membership_role: 'lecturer' | 'student';
    status: string;
    requested_at?: string | null;
    user: {
        id: number;
        name: string;
        email: string;
        identity_number: string | null;
    };
};

type ClassListItem = {
    id: number;
    members: Member[];
};

type ClassroomPayload = {
    can_edit: boolean;
    viewer_role: 'admin_prodi' | 'lecturer' | 'student' | 'upm';
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

function formatRequestedAt(value?: string | null): string {
    if (!value) return 'Baru saja';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Baru saja';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function JoinApprovalPanel() {
    const classId = Number(window.location.pathname.match(/^\/kelas\/(\d+)/)?.[1] ?? 0);
    const [allowed, setAllowed] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const pending = useMemo(
        () => members.filter((member) => member.membership_role === 'student' && member.status === 'pending'),
        [members],
    );

    const load = async () => {
        if (!classId) return;
        setLoading(true);
        setError('');
        try {
            const [roomResponse, classesResponse] = await Promise.all([
                fetch(`/sipandu-api/classes/${classId}/meetings`, { credentials: 'include', headers: { Accept: 'application/json' } }),
                fetch('/sipandu-api/classes', { credentials: 'include', headers: { Accept: 'application/json' } }),
            ]);

            if (!roomResponse.ok || !classesResponse.ok) {
                setAllowed(false);
                return;
            }

            const room = (await roomResponse.json()) as ClassroomPayload;
            setAllowed(room.can_edit && ['admin_prodi', 'lecturer'].includes(room.viewer_role));

            const payload = (await classesResponse.json()) as { classes?: ClassListItem[] };
            const current = payload.classes?.find((item) => item.id === classId);
            setMembers(current?.members ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, [classId]);

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && busyId === null) setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, busyId]);

    const decide = async (member: Member, action: 'approve' | 'reject') => {
        setBusyId(member.id);
        setError('');
        const response = await fetch(`/sipandu-api/classes/${classId}/join-requests/${member.id}/${action}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
        });

        if (!response.ok) {
            setError(await responseError(response));
            setBusyId(null);
            return;
        }

        await load();
        setBusyId(null);
        window.dispatchEvent(new Event('sipandu:join-requests-changed'));
        if (action === 'approve') {
            window.setTimeout(() => window.location.reload(), 450);
        }
    };

    if (!allowed) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-5 right-5 z-[75] inline-flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-left shadow-2xl shadow-blue-950/15 transition hover:-translate-y-0.5 hover:border-blue-200 sm:bottom-6 sm:right-6"
                aria-label={`Permintaan bergabung: ${pending.length}`}
            >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white"><Users size={18} /></span>
                <span className="hidden sm:block"><span className="block text-[10px] font-bold uppercase tracking-[.14em] text-blue-600">Peserta</span><span className="block text-sm font-bold text-slate-900">Permintaan bergabung</span></span>
                <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-extrabold ${pending.length ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{loading ? '…' : pending.length}</span>
            </button>

            {open && createPortal(
                <div className="fixed inset-0 z-[260] grid min-h-[100dvh] place-items-center overflow-y-auto p-3 sm:p-6">
                    <button type="button" aria-label="Tutup" onClick={() => busyId === null && setOpen(false)} className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" />
                    <section role="dialog" aria-modal="true" aria-labelledby="join-approval-title" className="relative z-[270] m-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
                        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UserCheck size={19} /></span>
                                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Peserta Kelas</p><h2 id="join-approval-title" className="truncate text-lg font-bold text-slate-950">Permintaan Bergabung</h2></div>
                            </div>
                            <button type="button" disabled={busyId !== null} onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={18} /></button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-6 text-slate-600">Mahasiswa yang bergabung melalui kode kelas perlu persetujuan dosen. Mahasiswa yang sudah tercatat pada roster resmi dapat diterima otomatis oleh sistem.</div>
                            {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                            {loading ? (
                                <div className="grid min-h-40 place-items-center text-sm font-semibold text-slate-500"><LoaderCircle size={20} className="animate-spin" /></div>
                            ) : pending.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Check size={20} /></span><p className="mt-3 font-bold text-slate-900">Tidak ada permintaan baru</p><p className="mt-1 text-sm text-slate-500">Semua permintaan bergabung sudah diproses.</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {pending.map((member) => (
                                        <article key={member.id} className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials(member.user.name) || 'M'}</span>
                                                <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{member.user.name}</p><p className="truncate text-xs font-semibold text-blue-700">{member.user.identity_number || 'NIM belum tersedia'}</p><p className="truncate text-xs text-slate-400">{member.user.email}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 size={11} /> {formatRequestedAt(member.requested_at)}</p></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                                                <button disabled={busyId !== null} onClick={() => void decide(member, 'reject')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"><UserX size={14} /> Tolak</button>
                                                <button disabled={busyId !== null} onClick={() => void decide(member, 'approve')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">{busyId === member.id ? <LoaderCircle size={14} className="animate-spin" /> : <UserCheck size={14} />} Terima</button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>,
                document.body,
            )}
        </>
    );
}

const root = document.getElementById('join-approval-root');
if (root) createRoot(root).render(<JoinApprovalPanel />);
