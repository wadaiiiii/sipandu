import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, Clock3, RefreshCw, Save } from 'lucide-react';

type Meeting = {
    id: number;
    meeting_number: number;
    title: string | null;
    topic: string | null;
    sub_cpmk_code: string | null;
    learning_method: string | null;
    learning_activity: string | null;
    material_summary: string | null;
    status: 'planned' | 'published' | 'completed';
    starts_at: string | null;
};

type ClassroomPayload = {
    class: {
        id: number;
        name: string;
        status: string;
        rps_source_type: string;
        rps_source_label: string;
        course: { id: number; code: string; name: string; credits: number };
        academic_term: { id: number; academic_year: string; semester: string };
    };
    can_edit: boolean;
    meetings: Meeting[];
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

function meetingStatus(status: Meeting['status']) {
    return {
        planned: { label: 'Direncanakan', className: 'bg-slate-100 text-slate-600' },
        published: { label: 'Dipublikasikan', className: 'bg-indigo-50 text-indigo-700' },
        completed: { label: 'Selesai', className: 'bg-emerald-50 text-emerald-700' },
    }[status];
}

function Classroom() {
    const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const [payload, setPayload] = useState<ClassroomPayload | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Meeting | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const selected = useMemo(
        () => payload?.meetings.find((meeting) => meeting.id === selectedId) ?? payload?.meetings[0] ?? null,
        [payload, selectedId],
    );

    const load = async () => {
        setBusy(true);
        setError('');
        const response = await fetch(`/api/classes/${classId}/meetings`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            setError(await responseError(response));
            setBusy(false);
            return;
        }

        const nextPayload = (await response.json()) as ClassroomPayload;
        setPayload(nextPayload);
        setSelectedId((current) => current ?? nextPayload.meetings[0]?.id ?? null);
        setBusy(false);
    };

    useEffect(() => {
        void load();
    }, [classId]);

    useEffect(() => {
        setDraft(selected ? { ...selected } : null);
    }, [selected?.id, selected?.title, selected?.topic, selected?.sub_cpmk_code, selected?.learning_method, selected?.learning_activity, selected?.material_summary, selected?.status, selected?.starts_at]);

    const save = async () => {
        if (!draft || !payload?.can_edit) return;
        setBusy(true);
        setError('');
        setNotice('');

        const response = await fetch(`/api/classes/${classId}/meetings/${draft.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf(),
                Accept: 'application/json',
            },
            body: JSON.stringify({
                title: draft.title || null,
                topic: draft.topic || null,
                sub_cpmk_code: draft.sub_cpmk_code || null,
                learning_method: draft.learning_method || null,
                learning_activity: draft.learning_activity || null,
                material_summary: draft.material_summary || null,
                status: draft.status,
                starts_at: draft.starts_at || null,
            }),
        });

        if (!response.ok) {
            setError(await responseError(response));
            setBusy(false);
            return;
        }

        setNotice(`Pertemuan ${draft.meeting_number} berhasil disimpan.`);
        await load();
        setBusy(false);
    };

    if (!payload && busy) {
        return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Memuat ruang kelas…</div>;
    }

    if (!payload) {
        return <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-rose-600">{error || 'Ruang kelas tidak dapat dimuat.'}</div>;
    }

    const semesterLabel = payload.class.academic_term.semester === 'ganjil' ? 'Ganjil' : 'Genap';

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <a href="/" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50" title="Kembali"><ArrowLeft size={17} /></a>
                        <div className="min-w-0"><p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{payload.class.course.code} · {payload.class.course.credits} SKS</p><h1 className="truncate text-lg font-semibold">{payload.class.course.name} — Kelas {payload.class.name}</h1></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">{payload.class.rps_source_label}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{semesterLabel} {payload.class.academic_term.academic_year}</span></div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Ruang Pembelajaran</p><p className="mt-1 text-sm text-slate-500">16 pertemuan menjadi kerangka kelas. Isian dapat bersumber dari snapshot RPS atau disunting secara lokal.</p></div><button onClick={() => void load()} disabled={busy} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Muat ulang</button></div>

                {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

                <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 px-2 py-2"><CalendarDays size={17} /><h2 className="font-semibold">Pertemuan 1–16</h2></div>
                        <div className="mt-1 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">{payload.meetings.map((meeting) => {
                            const meta = meetingStatus(meeting.status);
                            const active = meeting.id === selected?.id;
                            return <button key={meeting.id} onClick={() => setSelectedId(meeting.id)} className={`rounded-xl border px-3 py-3 text-left transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-2"><div><p className={`text-xs font-medium ${active ? 'text-slate-300' : 'text-slate-500'}`}>Pertemuan {meeting.meeting_number}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</p></div>{meeting.status === 'completed' && <CheckCircle2 size={15} className={active ? 'text-emerald-300' : 'text-emerald-600'} />}</div>{!active && <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>{meta.label}</span>}</button>;
                        })}</div>
                    </aside>

                    {draft && (
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pertemuan {draft.meeting_number}</p><h2 className="mt-1 text-xl font-semibold">{draft.title || `Pertemuan ${draft.meeting_number}`}</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${meetingStatus(draft.status).className}`}>{meetingStatus(draft.status).label}</span></div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-medium md:col-span-2">Judul pertemuan<input disabled={!payload.can_edit} value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50 disabled:text-slate-600" /></label>
                                <label className="text-sm font-medium md:col-span-2">Topik / bahan kajian<textarea disabled={!payload.can_edit} rows={3} value={draft.topic ?? ''} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                <label className="text-sm font-medium">Sub-CPMK<input disabled={!payload.can_edit} value={draft.sub_cpmk_code ?? ''} onChange={(e) => setDraft({ ...draft, sub_cpmk_code: e.target.value })} placeholder="Sub-CPMK-1" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                <label className="text-sm font-medium">Metode pembelajaran<input disabled={!payload.can_edit} value={draft.learning_method ?? ''} onChange={(e) => setDraft({ ...draft, learning_method: e.target.value })} placeholder="Case Method, PjBL, diskusi…" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                <label className="text-sm font-medium"><span className="flex items-center gap-1.5"><Clock3 size={14} /> Jadwal</span><input disabled={!payload.can_edit} type="datetime-local" value={draft.starts_at ?? ''} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value || null })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                <label className="text-sm font-medium">Status<select disabled={!payload.can_edit} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Meeting['status'] })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50"><option value="planned">Direncanakan</option><option value="published">Dipublikasikan</option><option value="completed">Selesai</option></select></label>
                                <label className="text-sm font-medium md:col-span-2"><span className="flex items-center gap-1.5"><BookOpen size={14} /> Ringkasan materi</span><textarea disabled={!payload.can_edit} rows={5} value={draft.material_summary ?? ''} onChange={(e) => setDraft({ ...draft, material_summary: e.target.value })} placeholder="Ringkasan materi yang dapat dibaca mahasiswa…" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                <label className="text-sm font-medium md:col-span-2">Aktivitas pembelajaran<textarea disabled={!payload.can_edit} rows={4} value={draft.learning_activity ?? ''} onChange={(e) => setDraft({ ...draft, learning_activity: e.target.value })} placeholder="Aktivitas dosen dan mahasiswa pada pertemuan ini…" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">{payload.can_edit ? 'Perubahan disimpan lokal pada kelas semester ini.' : 'Mode baca. Pengelolaan dilakukan oleh dosen/Admin Prodi.'}</p>{payload.can_edit && <button onClick={() => void save()} disabled={busy} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><Save size={15} /> {busy ? 'Menyimpan…' : 'Simpan Pertemuan'}</button>}</div>
                        </article>
                    )}
                </div>
            </section>
        </main>
    );
}

createRoot(document.getElementById('classroom-app')!).render(<Classroom />);
