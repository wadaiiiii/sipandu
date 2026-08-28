import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ArrowLeft,
    BarChart3,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    ExternalLink,
    FileText,
    GraduationCap,
    Link2,
    LoaderCircle,
    Plus,
    RefreshCw,
    Save,
    Send,
    Trash2,
    Users,
} from 'lucide-react';

type Material = {
    id: number;
    title: string;
    resource_type: 'link' | 'document' | 'video' | 'reading' | 'other';
    description: string | null;
    resource_url: string | null;
    is_published: boolean;
};

type Submission = {
    id: number;
    user_id: number;
    student_name: string | null;
    student_identity_number: string | null;
    answer_text: string | null;
    attachment_url: string | null;
    submitted_at: string | null;
    score: number | null;
    feedback: string | null;
    graded_at: string | null;
};

type Assignment = {
    id: number;
    title: string;
    instructions: string | null;
    sub_cpmk_code: string | null;
    weight_percent: number;
    max_score: number;
    due_at: string | null;
    status: 'draft' | 'published' | 'closed';
    submission_count: number;
    graded_count: number;
    average_achievement_percent: number | null;
    submissions: Submission[];
};

type Attendance = {
    user_id: number;
    status: 'present' | 'sick' | 'excused' | 'absent';
    note: string | null;
};

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
    materials: Material[];
    assignments: Assignment[];
    attendance: Attendance[];
    attendance_summary: Record<'present' | 'sick' | 'excused' | 'absent', number>;
};

type Student = {
    id: number;
    name: string;
    email: string;
    identity_number: string | null;
};

type ObeSummary = {
    sub_cpmk_code: string;
    achievement_percent: number | null;
    graded_evidence_count: number;
    assessment_count: number;
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
    viewer_role: 'admin_prodi' | 'lecturer' | 'student' | 'upm';
    can_edit: boolean;
    students: Student[];
    obe_summary: ObeSummary[];
    meetings: Meeting[];
};

type Tab = 'overview' | 'materials' | 'assignments' | 'attendance';

type MaterialForm = {
    title: string;
    resource_type: Material['resource_type'];
    description: string;
    resource_url: string;
    is_published: boolean;
};

type AssignmentForm = {
    title: string;
    instructions: string;
    sub_cpmk_code: string;
    weight_percent: string;
    max_score: string;
    due_at: string;
    status: Assignment['status'];
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

async function api(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    headers.set('Accept', 'application/json');

    if (init.method && init.method !== 'GET') {
        headers.set('X-CSRF-TOKEN', csrf());
        if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }

    return fetch(path, { credentials: 'include', ...init, headers });
}

function meetingStatus(status: Meeting['status']) {
    return {
        planned: { label: 'Direncanakan', className: 'bg-slate-100 text-slate-600' },
        published: { label: 'Dipublikasikan', className: 'bg-indigo-50 text-indigo-700' },
        completed: { label: 'Selesai', className: 'bg-emerald-50 text-emerald-700' },
    }[status];
}

function assignmentStatus(status: Assignment['status']) {
    return {
        draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
        published: { label: 'Terbit', className: 'bg-indigo-50 text-indigo-700' },
        closed: { label: 'Ditutup', className: 'bg-amber-50 text-amber-700' },
    }[status];
}

function formatDate(value: string | null): string {
    if (!value) return 'Belum dijadwalkan';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function roleLabel(role: ClassroomPayload['viewer_role']): string {
    return {
        admin_prodi: 'Admin Prodi',
        lecturer: 'Dosen',
        student: 'Mahasiswa',
        upm: 'UPM',
    }[role];
}

function Classroom() {
    const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const [payload, setPayload] = useState<ClassroomPayload | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Meeting | null>(null);
    const [tab, setTab] = useState<Tab>('overview');
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
        const response = await api(`/api/classes/${classId}/meetings`);

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
    }, [selected]);

    const runMutation = async (request: () => Promise<Response>, success: string) => {
        setBusy(true);
        setError('');
        setNotice('');
        const response = await request();
        if (!response.ok) {
            setError(await responseError(response));
            setBusy(false);
            return false;
        }
        setNotice(success);
        await load();
        setBusy(false);
        return true;
    };

    const saveMeeting = async () => {
        if (!draft || !payload?.can_edit) return;
        await runMutation(
            () =>
                api(`/api/classes/${classId}/meetings/${draft.id}`, {
                    method: 'PATCH',
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
                }),
            `Pertemuan ${draft.meeting_number} berhasil disimpan.`,
        );
    };

    if (!payload && busy) {
        return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Memuat ruang kelas…</div>;
    }

    if (!payload) {
        return <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-rose-600">{error || 'Ruang kelas tidak dapat dimuat.'}</div>;
    }

    const semesterLabel = payload.class.academic_term.semester === 'ganjil' ? 'Ganjil' : 'Genap';
    const materialCount = payload.meetings.reduce((sum, meeting) => sum + meeting.materials.length, 0);
    const assignmentCount = payload.meetings.reduce((sum, meeting) => sum + meeting.assignments.length, 0);
    const completedMeetings = payload.meetings.filter((meeting) => meeting.status === 'completed').length;

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <a href="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50" title="Kembali">
                            <ArrowLeft size={17} />
                        </a>
                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Ruang Kelas OBE · {payload.class.course.code}</p>
                            <h1 className="truncate text-lg font-semibold">{payload.class.course.name} — Kelas {payload.class.name}</h1>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">{payload.class.rps_source_label}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{semesterLabel} {payload.class.academic_term.academic_year}</span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">{roleLabel(payload.viewer_role)}</span>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-7">
                <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-5">
                        <div>
                            <p className="text-sm font-semibold text-rose-100">Siklus Pembelajaran → Evidence → OBE</p>
                            <h2 className="mt-2 text-2xl font-semibold">Kelas sebagai sumber bukti capaian belajar</h2>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-rose-100/80">Materi, tugas, pengumpulan, presensi, dan nilai ditautkan ke pertemuan serta Sub-CPMK agar capaian OBE dapat ditelusuri.</p>
                        </div>
                        <button onClick={() => void load()} disabled={busy} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50">
                            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Muat ulang
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard icon={CalendarDays} label="Pertemuan selesai" value={`${completedMeetings}/16`} />
                    <StatCard icon={BookOpen} label="Materi terhubung" value={String(materialCount)} />
                    <StatCard icon={ClipboardCheck} label="Asesmen/Tugas" value={String(assignmentCount)} />
                    <StatCard icon={BarChart3} label="Sub-CPMK terukur" value={String(payload.obe_summary.filter((row) => row.achievement_percent !== null).length)} />
                </div>

                {payload.obe_summary.length > 0 && (
                    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2"><BarChart3 size={18} className="text-indigo-700" /><h3 className="font-semibold">Capaian OBE sementara</h3></div>
                        <p className="mt-1 text-sm text-slate-500">Dihitung dari evidence penilaian yang sudah diberi nilai. Ini adalah agregasi Sub-CPMK, belum agregasi final CPMK/CPL.</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {payload.obe_summary.map((row) => (
                                <div key={row.sub_cpmk_code} className="rounded-xl bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{row.sub_cpmk_code}</span><span className="text-lg font-bold text-indigo-700">{row.achievement_percent === null ? '—' : `${row.achievement_percent}%`}</span></div>
                                    <p className="mt-2 text-xs text-slate-500">{row.graded_evidence_count} evidence dinilai · {row.assessment_count} asesmen</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                {notice && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

                <div className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5">
                        <div className="flex items-center gap-2 px-2 py-2"><CalendarDays size={17} /><h2 className="font-semibold">Pertemuan 1–16</h2></div>
                        <div className="mt-1 grid max-h-[72vh] gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-1">
                            {payload.meetings.map((meeting) => {
                                const meta = meetingStatus(meeting.status);
                                const active = meeting.id === selected?.id;
                                return (
                                    <button key={meeting.id} onClick={() => { setSelectedId(meeting.id); setTab('overview'); }} className={`rounded-xl border px-3 py-3 text-left transition ${active ? 'border-slate-900 bg-slate-950 text-white' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div><p className={`text-xs font-medium ${active ? 'text-rose-100' : 'text-slate-500'}`}>Pertemuan {meeting.meeting_number}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</p></div>
                                            {meeting.status === 'completed' && <CheckCircle2 size={15} className={active ? 'text-emerald-300' : 'text-emerald-600'} />}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {!active && <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>{meta.label}</span>}
                                            {meeting.assignments.length > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/10 text-white' : 'bg-rose-50 text-rose-700'}`}>{meeting.assignments.length} asesmen</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {draft && selected && (
                        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Pertemuan {draft.meeting_number}</p><h2 className="mt-1 text-xl font-semibold">{draft.title || `Pertemuan ${draft.meeting_number}`}</h2><p className="mt-1 text-sm text-slate-500">{draft.sub_cpmk_code || 'Sub-CPMK belum ditautkan'} · {formatDate(draft.starts_at)}</p></div>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${meetingStatus(draft.status).className}`}>{meetingStatus(draft.status).label}</span>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={FileText}>Rencana</TabButton>
                                    <TabButton active={tab === 'materials'} onClick={() => setTab('materials')} icon={BookOpen}>Materi <Count value={selected.materials.length} /></TabButton>
                                    <TabButton active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={ClipboardCheck}>Tugas & OBE <Count value={selected.assignments.length} /></TabButton>
                                    <TabButton active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={Users}>Presensi</TabButton>
                                </div>
                            </div>

                            <div className="p-5">
                                {tab === 'overview' && <OverviewTab draft={draft} setDraft={setDraft} canEdit={payload.can_edit} busy={busy} save={() => void saveMeeting()} />}
                                {tab === 'materials' && <MaterialsTab classId={classId} meeting={selected} canEdit={payload.can_edit} busy={busy} mutate={runMutation} />}
                                {tab === 'assignments' && <AssignmentsTab classId={classId} meeting={selected} payload={payload} busy={busy} mutate={runMutation} />}
                                {tab === 'attendance' && <AttendanceTab classId={classId} meeting={selected} payload={payload} busy={busy} mutate={runMutation} />}
                            </div>
                        </article>
                    )}
                </div>
            </section>
        </main>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={19} /></div></div></div>;
}

function Count({ value }: { value: number }) {
    return <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px]">{value}</span>;
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof FileText; children: React.ReactNode }) {
    return <button onClick={onClick} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${active ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}><Icon size={15} />{children}</button>;
}

function OverviewTab({ draft, setDraft, canEdit, busy, save }: { draft: Meeting; setDraft: (meeting: Meeting) => void; canEdit: boolean; busy: boolean; save: () => void }) {
    return <>
        <div className="grid gap-4 md:grid-cols-2">
            <Field label="Judul pertemuan" className="md:col-span-2"><input disabled={!canEdit} value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="input" /></Field>
            <Field label="Topik / bahan kajian" className="md:col-span-2"><textarea disabled={!canEdit} rows={3} value={draft.topic ?? ''} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} className="input" /></Field>
            <Field label="Sub-CPMK"><input disabled={!canEdit} value={draft.sub_cpmk_code ?? ''} onChange={(e) => setDraft({ ...draft, sub_cpmk_code: e.target.value })} placeholder="Sub-CPMK-1" className="input" /></Field>
            <Field label="Metode pembelajaran"><input disabled={!canEdit} value={draft.learning_method ?? ''} onChange={(e) => setDraft({ ...draft, learning_method: e.target.value })} placeholder="Case Method, PjBL, diskusi…" className="input" /></Field>
            <Field label="Jadwal"><input disabled={!canEdit} type="datetime-local" value={draft.starts_at ?? ''} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value || null })} className="input" /></Field>
            <Field label="Status"><select disabled={!canEdit} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Meeting['status'] })} className="input"><option value="planned">Direncanakan</option><option value="published">Dipublikasikan</option><option value="completed">Selesai</option></select></Field>
            <Field label="Ringkasan materi" className="md:col-span-2"><textarea disabled={!canEdit} rows={5} value={draft.material_summary ?? ''} onChange={(e) => setDraft({ ...draft, material_summary: e.target.value })} placeholder="Ringkasan materi yang dapat dibaca mahasiswa…" className="input" /></Field>
            <Field label="Aktivitas pembelajaran" className="md:col-span-2"><textarea disabled={!canEdit} rows={4} value={draft.learning_activity ?? ''} onChange={(e) => setDraft({ ...draft, learning_activity: e.target.value })} placeholder="Aktivitas dosen dan mahasiswa…" className="input" /></Field>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">{canEdit ? 'Rencana pertemuan dapat disesuaikan dari snapshot RPS.' : 'Mode baca.'}</p>{canEdit && <button onClick={save} disabled={busy} className="primary-button"><Save size={15} /> {busy ? 'Menyimpan…' : 'Simpan Pertemuan'}</button>}</div>
    </>;
}

function MaterialsTab({ classId, meeting, canEdit, busy, mutate }: { classId: string; meeting: Meeting; canEdit: boolean; busy: boolean; mutate: (request: () => Promise<Response>, success: string) => Promise<boolean> }) {
    const [form, setForm] = useState<MaterialForm>({ title: '', resource_type: 'link', description: '', resource_url: '', is_published: true });

    const add = async () => {
        if (!form.title.trim()) return;
        const ok = await mutate(() => api(`/api/classes/${classId}/meetings/${meeting.id}/materials`, { method: 'POST', body: JSON.stringify({ ...form, resource_url: form.resource_url || null, description: form.description || null }) }), 'Materi berhasil ditambahkan.');
        if (ok) setForm({ title: '', resource_type: 'link', description: '', resource_url: '', is_published: true });
    };

    return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div><SectionTitle icon={BookOpen} title="Materi pembelajaran" subtitle="Sumber belajar yang terkait langsung dengan pertemuan ini." />
            <div className="mt-4 space-y-3">{meeting.materials.length === 0 && <Empty text="Belum ada materi terhubung." />}{meeting.materials.map((material) => <div key={material.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-indigo-700">{material.resource_type}</span>{!material.is_published && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">Draft</span>}</div><h4 className="mt-2 font-semibold">{material.title}</h4>{material.description && <p className="mt-1 text-sm leading-6 text-slate-600">{material.description}</p>}</div><div className="flex gap-2">{material.resource_url && <a href={material.resource_url} target="_blank" rel="noreferrer" className="secondary-button"><ExternalLink size={14} /> Buka</a>}{canEdit && <button onClick={() => void mutate(() => api(`/api/classes/${classId}/meetings/${meeting.id}/materials/${material.id}`, { method: 'DELETE' }), 'Materi dihapus.')} className="icon-danger" title="Hapus"><Trash2 size={15} /></button>}</div></div></div>)}</div>
        </div>
        {canEdit && <div className="rounded-2xl bg-slate-50 p-4"><h4 className="font-semibold">Tambah materi</h4><div className="mt-3 space-y-3"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul materi" className="input" /><select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value as Material['resource_type'] })} className="input"><option value="link">Tautan</option><option value="document">Dokumen</option><option value="video">Video</option><option value="reading">Bacaan</option><option value="other">Lainnya</option></select><input value={form.resource_url} onChange={(e) => setForm({ ...form, resource_url: e.target.value })} placeholder="https://..." className="input" /><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Keterangan singkat" className="input" /><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Langsung tampil ke mahasiswa</label><button onClick={() => void add()} disabled={busy} className="primary-button w-full justify-center"><Plus size={15} /> Tambah Materi</button></div></div>}
    </div>;
}

function AssignmentsTab({ classId, meeting, payload, busy, mutate }: { classId: string; meeting: Meeting; payload: ClassroomPayload; busy: boolean; mutate: (request: () => Promise<Response>, success: string) => Promise<boolean> }) {
    const [form, setForm] = useState<AssignmentForm>({ title: '', instructions: '', sub_cpmk_code: meeting.sub_cpmk_code ?? '', weight_percent: '0', max_score: '100', due_at: '', status: 'draft' });
    const isStudent = payload.viewer_role === 'student';

    const add = async () => {
        const ok = await mutate(() => api(`/api/classes/${classId}/meetings/${meeting.id}/assignments`, { method: 'POST', body: JSON.stringify({ ...form, weight_percent: Number(form.weight_percent || 0), max_score: Number(form.max_score || 100), due_at: form.due_at || null, instructions: form.instructions || null, sub_cpmk_code: form.sub_cpmk_code || null }) }), 'Tugas/asesmen berhasil ditambahkan.');
        if (ok) setForm({ title: '', instructions: '', sub_cpmk_code: meeting.sub_cpmk_code ?? '', weight_percent: '0', max_score: '100', due_at: '', status: 'draft' });
    };

    return <div className="space-y-5">
        <SectionTitle icon={ClipboardCheck} title="Tugas & evidence OBE" subtitle="Setiap asesmen dapat ditautkan ke Sub-CPMK sehingga nilai menjadi evidence ketercapaian." />
        {payload.can_edit && <div className="rounded-2xl bg-slate-50 p-4"><div className="grid gap-3 md:grid-cols-2"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul tugas/asesmen" className="input md:col-span-2" /><textarea rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Instruksi" className="input md:col-span-2" /><input value={form.sub_cpmk_code} onChange={(e) => setForm({ ...form, sub_cpmk_code: e.target.value })} placeholder="Sub-CPMK-1" className="input" /><input type="number" min="0" max="100" value={form.weight_percent} onChange={(e) => setForm({ ...form, weight_percent: e.target.value })} placeholder="Bobot %" className="input" /><input type="number" min="1" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} placeholder="Nilai maksimal" className="input" /><input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} className="input" /><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Assignment['status'] })} className="input"><option value="draft">Draft</option><option value="published">Terbitkan</option></select><button onClick={() => void add()} disabled={busy || !form.title.trim()} className="primary-button justify-center"><Plus size={15} /> Tambah Asesmen</button></div></div>}
        <div className="space-y-4">{meeting.assignments.length === 0 && <Empty text="Belum ada tugas/asesmen pada pertemuan ini." />}{meeting.assignments.map((assignment) => <AssignmentCard key={assignment.id} classId={classId} assignment={assignment} payload={payload} busy={busy} mutate={mutate} isStudent={isStudent} />)}</div>
    </div>;
}

function AssignmentCard({ classId, assignment, payload, busy, mutate, isStudent }: { classId: string; assignment: Assignment; payload: ClassroomPayload; busy: boolean; mutate: (request: () => Promise<Response>, success: string) => Promise<boolean>; isStudent: boolean }) {
    const [answer, setAnswer] = useState(assignment.submissions[0]?.answer_text ?? '');
    const [attachment, setAttachment] = useState(assignment.submissions[0]?.attachment_url ?? '');
    const meta = assignmentStatus(assignment.status);

    const changeStatus = async (status: Assignment['status']) => {
        await mutate(() => api(`/api/classes/${classId}/assignments/${assignment.id}`, { method: 'PATCH', body: JSON.stringify({ title: assignment.title, instructions: assignment.instructions, sub_cpmk_code: assignment.sub_cpmk_code, weight_percent: assignment.weight_percent, max_score: assignment.max_score, due_at: assignment.due_at, status }) }), `Status ${assignment.title} diperbarui.`);
    };

    const submit = async () => {
        await mutate(() => api(`/api/classes/${classId}/assignments/${assignment.id}/submission`, { method: 'POST', body: JSON.stringify({ answer_text: answer || null, attachment_url: attachment || null }) }), 'Jawaban berhasil dikirim.');
    };

    return <section className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>{meta.label}</span>{assignment.sub_cpmk_code && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{assignment.sub_cpmk_code}</span>}</div><h4 className="mt-2 text-lg font-semibold">{assignment.title}</h4>{assignment.instructions && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{assignment.instructions}</p>}</div><div className="text-right text-xs text-slate-500"><p>Bobot <strong className="text-slate-800">{assignment.weight_percent}%</strong></p><p className="mt-1">Maks. {assignment.max_score}</p><p className="mt-1">{formatDate(assignment.due_at)}</p></div></div>
        {!isStudent && <div className="mt-4 grid gap-3 sm:grid-cols-3"><MiniStat label="Dikumpulkan" value={String(assignment.submission_count)} /><MiniStat label="Sudah dinilai" value={String(assignment.graded_count)} /><MiniStat label="Rata-rata capaian" value={assignment.average_achievement_percent === null ? '—' : `${assignment.average_achievement_percent}%`} /></div>}
        {payload.can_edit && <div className="mt-4 flex flex-wrap gap-2">{assignment.status === 'draft' && <button onClick={() => void changeStatus('published')} className="secondary-button"><Send size={14} /> Publikasikan</button>}{assignment.status === 'published' && <button onClick={() => void changeStatus('closed')} className="secondary-button">Tutup Pengumpulan</button>}{assignment.status === 'closed' && <button onClick={() => void changeStatus('published')} className="secondary-button">Buka Kembali</button>}</div>}
        {isStudent && assignment.status === 'published' && <div className="mt-5 rounded-xl bg-slate-50 p-4"><h5 className="text-sm font-semibold">Pengumpulan saya</h5><textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Tulis jawaban/catatan pengumpulan…" className="input mt-3" /><input value={attachment} onChange={(e) => setAttachment(e.target.value)} placeholder="Tautan Drive/GitHub/lampiran daring (opsional)" className="input mt-3" /><button onClick={() => void submit()} disabled={busy} className="primary-button mt-3"><Send size={15} /> Kirim / Perbarui</button>{assignment.submissions[0] && <SubmissionResult submission={assignment.submissions[0]} maxScore={assignment.max_score} />}</div>}
        {isStudent && assignment.status === 'closed' && assignment.submissions[0] && <SubmissionResult submission={assignment.submissions[0]} maxScore={assignment.max_score} />}
        {payload.can_edit && assignment.submissions.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4"><h5 className="text-sm font-semibold">Pengumpulan mahasiswa</h5><div className="mt-3 space-y-3">{assignment.submissions.map((submission) => <GradingRow key={submission.id} classId={classId} assignment={assignment} submission={submission} busy={busy} mutate={mutate} />)}</div></div>}
    </section>;
}

function SubmissionResult({ submission, maxScore }: { submission: Submission; maxScore: number }) {
    return <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="text-slate-500">Terkirim {submission.submitted_at ? formatDate(submission.submitted_at) : '—'}</span><strong>{submission.score === null ? 'Belum dinilai' : `${submission.score}/${maxScore}`}</strong></div>{submission.feedback && <p className="mt-2 text-slate-600">Feedback: {submission.feedback}</p>}</div>;
}

function GradingRow({ classId, assignment, submission, busy, mutate }: { classId: string; assignment: Assignment; submission: Submission; busy: boolean; mutate: (request: () => Promise<Response>, success: string) => Promise<boolean> }) {
    const [score, setScore] = useState(submission.score === null ? '' : String(submission.score));
    const [feedback, setFeedback] = useState(submission.feedback ?? '');
    const grade = async () => mutate(() => api(`/api/classes/${classId}/assignments/${assignment.id}/submissions/${submission.id}/grade`, { method: 'PATCH', body: JSON.stringify({ score: Number(score), feedback: feedback || null }) }), `Nilai ${submission.student_name || 'mahasiswa'} disimpan.`);
    return <div className="rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{submission.student_name || `Mahasiswa #${submission.user_id}`}</p><p className="mt-0.5 text-xs text-slate-500">{submission.student_identity_number || 'NIM belum tersedia'} · {submission.submitted_at ? formatDate(submission.submitted_at) : 'Belum terkirim'}</p>{submission.answer_text && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{submission.answer_text}</p>}{submission.attachment_url && <a href={submission.attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-700"><Link2 size={13} /> Lampiran</a>}</div><div className="flex w-full gap-2 sm:w-auto"><input type="number" min="0" max={assignment.max_score} value={score} onChange={(e) => setScore(e.target.value)} placeholder="Nilai" className="input w-24" /><input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback" className="input min-w-48 flex-1" /><button onClick={() => void grade()} disabled={busy || score === ''} className="primary-button"><Save size={14} /></button></div></div></div>;
}

function AttendanceTab({ classId, meeting, payload, busy, mutate }: { classId: string; meeting: Meeting; payload: ClassroomPayload; busy: boolean; mutate: (request: () => Promise<Response>, success: string) => Promise<boolean> }) {
    const existing = useMemo(() => new Map(meeting.attendance.map((row) => [row.user_id, row])), [meeting.attendance]);
    const [records, setRecords] = useState<Record<number, { status: Attendance['status']; note: string }>>(() => Object.fromEntries(payload.students.map((student) => [student.id, { status: existing.get(student.id)?.status ?? 'present', note: existing.get(student.id)?.note ?? '' }])));

    useEffect(() => {
        setRecords(Object.fromEntries(payload.students.map((student) => [student.id, { status: existing.get(student.id)?.status ?? 'present', note: existing.get(student.id)?.note ?? '' }])));
    }, [meeting.id, payload.students.length]);

    if (payload.viewer_role === 'student') {
        const own = meeting.attendance[0];
        return <div><SectionTitle icon={Users} title="Presensi" subtitle="Status kehadiran pada pertemuan ini." /><div className="mt-4 rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Status saya</p><p className="mt-2 text-lg font-semibold">{own ? attendanceLabel(own.status) : 'Belum dicatat'}</p>{own?.note && <p className="mt-2 text-sm text-slate-600">{own.note}</p>}</div></div>;
    }

    const save = async () => {
        await mutate(() => api(`/api/classes/${classId}/meetings/${meeting.id}/attendance`, { method: 'PUT', body: JSON.stringify({ records: payload.students.map((student) => ({ user_id: student.id, status: records[student.id]?.status ?? 'present', note: records[student.id]?.note || null })) }) }), 'Presensi berhasil disimpan.');
    };

    return <div><SectionTitle icon={Users} title="Presensi mahasiswa" subtitle="Presensi menjadi bukti pelaksanaan pembelajaran, terpisah dari nilai OBE." /><div className="mt-4 grid gap-3 sm:grid-cols-4"><MiniStat label="Hadir" value={String(meeting.attendance_summary.present)} /><MiniStat label="Sakit" value={String(meeting.attendance_summary.sick)} /><MiniStat label="Izin" value={String(meeting.attendance_summary.excused)} /><MiniStat label="Alpa" value={String(meeting.attendance_summary.absent)} /></div>{payload.students.length === 0 ? <Empty text="Belum ada mahasiswa aktif di kelas." /> : <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Mahasiswa</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Catatan</th></tr></thead><tbody className="divide-y divide-slate-100">{payload.students.map((student) => <tr key={student.id}><td className="px-4 py-3"><p className="font-medium">{student.name}</p><p className="text-xs text-slate-500">{student.identity_number || student.email}</p></td><td className="px-4 py-3"><select disabled={!payload.can_edit} value={records[student.id]?.status ?? 'present'} onChange={(e) => setRecords({ ...records, [student.id]: { ...(records[student.id] ?? { note: '' }), status: e.target.value as Attendance['status'] } })} className="input min-w-32"><option value="present">Hadir</option><option value="sick">Sakit</option><option value="excused">Izin</option><option value="absent">Alpa</option></select></td><td className="px-4 py-3"><input disabled={!payload.can_edit} value={records[student.id]?.note ?? ''} onChange={(e) => setRecords({ ...records, [student.id]: { ...(records[student.id] ?? { status: 'present' }), note: e.target.value } })} placeholder="Opsional" className="input min-w-48" /></td></tr>)}</tbody></table></div>}{payload.can_edit && payload.students.length > 0 && <button onClick={() => void save()} disabled={busy} className="primary-button mt-4"><Save size={15} /> Simpan Presensi</button>}</div>;
}

function attendanceLabel(status: Attendance['status']) {
    return { present: 'Hadir', sick: 'Sakit', excused: 'Izin', absent: 'Alpa' }[status];
}

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
    return <label className={`text-sm font-medium ${className}`}><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof BookOpen; title: string; subtitle: string }) {
    return <div><div className="flex items-center gap-2"><Icon size={18} className="text-indigo-700" /><h3 className="font-semibold">{title}</h3></div><p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
    return <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{text}</div>;
}

createRoot(document.getElementById('classroom-app')!).render(<Classroom />);