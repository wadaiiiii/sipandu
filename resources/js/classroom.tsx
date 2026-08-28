import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ArrowLeft,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    ExternalLink,
    FileText,
    Link2,
    Plus,
    RefreshCw,
    Save,
    Send,
    Trash2,
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
    max_score: number;
    due_at: string | null;
    status: 'draft' | 'published' | 'closed';
    submission_count: number;
    graded_count: number;
    submissions: Submission[];
};

type Meeting = {
    id: number;
    meeting_number: number;
    title: string | null;
    topic: string | null;
    learning_method: string | null;
    learning_activity: string | null;
    material_summary: string | null;
    status: 'planned' | 'published' | 'completed';
    starts_at: string | null;
    materials: Material[];
    assignments: Assignment[];
};

type ClassroomPayload = {
    class: {
        id: number;
        name: string;
        status: string;
        course: { id: number; code: string; name: string; credits: number };
        academic_term: { id: number; academic_year: string; semester: string };
    };
    viewer_role: 'admin_prodi' | 'lecturer' | 'student' | 'upm';
    can_edit: boolean;
    meetings: Meeting[];
};

type Tab = 'overview' | 'materials' | 'assignments';

type MaterialForm = {
    title: string;
    resource_type: Material['resource_type'];
    description: string;
    resource_url: string;
};

type AssignmentForm = {
    title: string;
    instructions: string;
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

function formatDate(value: string | null): string {
    if (!value) return 'Belum dijadwalkan';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function meetingStatus(status: Meeting['status']) {
    return {
        planned: { label: 'Rencana', className: 'bg-slate-100 text-slate-600' },
        published: { label: 'Terbit', className: 'bg-indigo-50 text-indigo-700' },
        completed: { label: 'Selesai', className: 'bg-emerald-50 text-emerald-700' },
    }[status];
}

function assignmentStatus(status: Assignment['status']) {
    return {
        draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
        published: { label: 'Dibuka', className: 'bg-indigo-50 text-indigo-700' },
        closed: { label: 'Ditutup', className: 'bg-amber-50 text-amber-700' },
    }[status];
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
    const [materialForm, setMaterialForm] = useState<MaterialForm>({ title: '', resource_type: 'link', description: '', resource_url: '' });
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({ title: '', instructions: '', max_score: '100', due_at: '', status: 'published' });
    const [submissionDrafts, setSubmissionDrafts] = useState<Record<number, { answer_text: string; attachment_url: string }>>({});
    const [gradeDrafts, setGradeDrafts] = useState<Record<number, { score: string; feedback: string }>>({});

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
        setMaterialForm({ title: '', resource_type: 'link', description: '', resource_url: '' });
        setAssignmentForm({ title: '', instructions: '', max_score: '100', due_at: '', status: 'published' });
    }, [selected?.id]);

    const mutate = async (request: () => Promise<Response>, success: string) => {
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
        await mutate(
            () => api(`/api/classes/${classId}/meetings/${draft.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    title: draft.title || null,
                    topic: draft.topic || null,
                    sub_cpmk_code: null,
                    learning_method: draft.learning_method || null,
                    learning_activity: draft.learning_activity || null,
                    material_summary: draft.material_summary || null,
                    status: draft.status,
                    starts_at: draft.starts_at || null,
                }),
            }),
            `Pertemuan ${draft.meeting_number} disimpan.`,
        );
    };

    const addMaterial = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected || !payload?.can_edit) return;
        const ok = await mutate(
            () => api(`/api/classes/${classId}/meetings/${selected.id}/materials`, {
                method: 'POST',
                body: JSON.stringify({
                    ...materialForm,
                    description: materialForm.description || null,
                    resource_url: materialForm.resource_url || null,
                    is_published: true,
                }),
            }),
            'Materi ditambahkan.',
        );
        if (ok) setMaterialForm({ title: '', resource_type: 'link', description: '', resource_url: '' });
    };

    const removeMaterial = async (material: Material) => {
        if (!selected || !payload?.can_edit) return;
        await mutate(
            () => api(`/api/classes/${classId}/meetings/${selected.id}/materials/${material.id}`, { method: 'DELETE' }),
            'Materi dihapus.',
        );
    };

    const addAssignment = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected || !payload?.can_edit) return;
        const ok = await mutate(
            () => api(`/api/classes/${classId}/meetings/${selected.id}/assignments`, {
                method: 'POST',
                body: JSON.stringify({
                    title: assignmentForm.title,
                    instructions: assignmentForm.instructions || null,
                    sub_cpmk_code: null,
                    weight_percent: 0,
                    max_score: Number(assignmentForm.max_score || 100),
                    due_at: assignmentForm.due_at || null,
                    status: assignmentForm.status,
                }),
            }),
            'Tugas ditambahkan.',
        );
        if (ok) setAssignmentForm({ title: '', instructions: '', max_score: '100', due_at: '', status: 'published' });
    };

    const submitAssignment = async (assignment: Assignment) => {
        const currentSubmission = assignment.submissions[0];
        const form = submissionDrafts[assignment.id] ?? {
            answer_text: currentSubmission?.answer_text ?? '',
            attachment_url: currentSubmission?.attachment_url ?? '',
        };
        await mutate(
            () => api(`/api/classes/${classId}/assignments/${assignment.id}/submission`, {
                method: 'POST',
                body: JSON.stringify(form),
            }),
            'Tugas berhasil dikumpulkan.',
        );
    };

    const gradeSubmission = async (assignment: Assignment, submission: Submission) => {
        const form = gradeDrafts[submission.id] ?? {
            score: submission.score?.toString() ?? '',
            feedback: submission.feedback ?? '',
        };
        await mutate(
            () => api(`/api/classes/${classId}/assignments/${assignment.id}/submissions/${submission.id}/grade`, {
                method: 'PATCH',
                body: JSON.stringify({ score: Number(form.score), feedback: form.feedback || null }),
            }),
            'Nilai disimpan.',
        );
    };

    if (!payload && busy) {
        return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Memuat kelas…</div>;
    }

    if (!payload) {
        return <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-rose-600">{error || 'Kelas tidak dapat dimuat.'}</div>;
    }

    const semesterLabel = payload.class.academic_term.semester === 'ganjil' ? 'Ganjil' : 'Genap';
    const isStudent = payload.viewer_role === 'student';

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <a href="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50" title="Kembali"><ArrowLeft size={17} /></a>
                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">{payload.class.course.code} · {payload.class.course.credits} SKS</p>
                            <h1 className="truncate text-lg font-bold">{payload.class.course.name} — Kelas {payload.class.name}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{semesterLabel} {payload.class.academic_term.academic_year}</span>
                        <button onClick={() => void load()} disabled={busy} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /></button>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
                {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

                <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5">
                        <div className="flex items-center gap-2 px-2 py-2"><CalendarDays size={17} /><h2 className="font-bold">Pertemuan</h2></div>
                        <div className="mt-1 grid max-h-[75vh] gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-1">
                            {payload.meetings.map((meeting) => {
                                const active = selected?.id === meeting.id;
                                const meta = meetingStatus(meeting.status);
                                return (
                                    <button key={meeting.id} onClick={() => { setSelectedId(meeting.id); setTab('overview'); }} className={`rounded-xl px-3 py-3 text-left ${active ? 'bg-slate-950 text-white' : 'hover:bg-slate-50'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className={`text-xs ${active ? 'text-slate-300' : 'text-slate-400'}`}>Pertemuan {meeting.meeting_number}</p>
                                                <p className="mt-1 line-clamp-2 text-sm font-semibold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</p>
                                            </div>
                                            {meeting.status === 'completed' && <CheckCircle2 size={15} className={active ? 'text-emerald-300' : 'text-emerald-600'} />}
                                        </div>
                                        {!active && <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>{meta.label}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {draft && selected && (
                        <div className="min-w-0">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pertemuan {selected.meeting_number}</p>
                                        <h2 className="mt-1 text-xl font-bold">{selected.title || `Pertemuan ${selected.meeting_number}`}</h2>
                                        <p className="mt-1 text-sm text-slate-500">{formatDate(selected.starts_at)}</p>
                                    </div>
                                    <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
                                        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={FileText}>Ringkasan</TabButton>
                                        <TabButton active={tab === 'materials'} onClick={() => setTab('materials')} icon={BookOpen}>Materi</TabButton>
                                        <TabButton active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={ClipboardList}>Tugas</TabButton>
                                    </div>
                                </div>
                            </div>

                            {tab === 'overview' && (
                                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="text-sm font-medium md:col-span-2">Judul pertemuan<input disabled={!payload.can_edit} value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                        <label className="text-sm font-medium md:col-span-2">Topik<textarea disabled={!payload.can_edit} rows={3} value={draft.topic ?? ''} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                        <label className="text-sm font-medium">Jadwal<input disabled={!payload.can_edit} type="datetime-local" value={draft.starts_at ?? ''} onChange={(event) => setDraft({ ...draft, starts_at: event.target.value || null })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                        <label className="text-sm font-medium">Status<select disabled={!payload.can_edit} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Meeting['status'] })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-50"><option value="planned">Rencana</option><option value="published">Terbit</option><option value="completed">Selesai</option></select></label>
                                        <label className="text-sm font-medium md:col-span-2">Metode pembelajaran<input disabled={!payload.can_edit} value={draft.learning_method ?? ''} onChange={(event) => setDraft({ ...draft, learning_method: event.target.value })} placeholder="Diskusi, praktikum, ceramah, project…" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                        <label className="text-sm font-medium md:col-span-2">Ringkasan materi<textarea disabled={!payload.can_edit} rows={5} value={draft.material_summary ?? ''} onChange={(event) => setDraft({ ...draft, material_summary: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" /></label>
                                    </div>
                                    {payload.can_edit && <button onClick={() => void saveMeeting()} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} /> Simpan</button>}
                                </section>
                            )}

                            {tab === 'materials' && (
                                <section className="mt-4 space-y-4">
                                    {payload.can_edit && (
                                        <form onSubmit={addMaterial} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                            <div className="flex items-center gap-2"><Plus size={17} /><h3 className="font-bold">Tambah materi</h3></div>
                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                <label className="text-sm font-medium">Judul<input required value={materialForm.title} onChange={(event) => setMaterialForm({ ...materialForm, title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                                                <label className="text-sm font-medium">Jenis<select value={materialForm.resource_type} onChange={(event) => setMaterialForm({ ...materialForm, resource_type: event.target.value as Material['resource_type'] })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="link">Tautan</option><option value="document">Dokumen</option><option value="video">Video</option><option value="reading">Bacaan</option><option value="other">Lainnya</option></select></label>
                                                <label className="text-sm font-medium md:col-span-2">Tautan<input type="url" value={materialForm.resource_url} onChange={(event) => setMaterialForm({ ...materialForm, resource_url: event.target.value })} placeholder="https://..." className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                                                <label className="text-sm font-medium md:col-span-2">Keterangan<textarea rows={3} value={materialForm.description} onChange={(event) => setMaterialForm({ ...materialForm, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                                            </div>
                                            <button disabled={busy} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Tambah Materi</button>
                                        </form>
                                    )}

                                    <div className="grid gap-3">
                                        {selected.materials.length === 0 ? <EmptyState icon={BookOpen} text="Belum ada materi pada pertemuan ini." /> : selected.materials.map((material) => (
                                            <article key={material.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2"><Link2 size={15} className="text-slate-400" /><h3 className="font-bold">{material.title}</h3></div>
                                                        {material.description && <p className="mt-2 text-sm leading-6 text-slate-600">{material.description}</p>}
                                                        {material.resource_url && <a href={material.resource_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700">Buka materi <ExternalLink size={14} /></a>}
                                                    </div>
                                                    {payload.can_edit && <button onClick={() => void removeMaterial(material)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {tab === 'assignments' && (
                                <section className="mt-4 space-y-4">
                                    {payload.can_edit && (
                                        <form onSubmit={addAssignment} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                            <div className="flex items-center gap-2"><Plus size={17} /><h3 className="font-bold">Tambah tugas</h3></div>
                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                <label className="text-sm font-medium md:col-span-2">Judul tugas<input required value={assignmentForm.title} onChange={(event) => setAssignmentForm({ ...assignmentForm, title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                                                <label className="text-sm font-medium md:col-span-2">Instruksi<textarea rows={4} value={assignmentForm.instructions} onChange={(event) => setAssignmentForm({ ...assignmentForm, instructions: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                                                <label className="text-sm font-medium">Nilai maksimum<input type="number" min={1} value={assignmentForm.max_score} onChange={(event) => setAssignmentForm({ ...assignmentForm, max_score: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                                                <label className="text-sm font-medium">Batas waktu<input type="datetime-local" value={assignmentForm.due_at} onChange={(event) => setAssignmentForm({ ...assignmentForm, due_at: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                                                <label className="text-sm font-medium">Status<select value={assignmentForm.status} onChange={(event) => setAssignmentForm({ ...assignmentForm, status: event.target.value as Assignment['status'] })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="draft">Draft</option><option value="published">Dibuka</option><option value="closed">Ditutup</option></select></label>
                                            </div>
                                            <button disabled={busy} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Tambah Tugas</button>
                                        </form>
                                    )}

                                    {selected.assignments.length === 0 ? <EmptyState icon={ClipboardList} text="Belum ada tugas pada pertemuan ini." /> : selected.assignments.map((assignment) => {
                                        const status = assignmentStatus(assignment.status);
                                        const ownSubmission = isStudent ? assignment.submissions[0] : null;
                                        const studentDraft = submissionDrafts[assignment.id] ?? { answer_text: ownSubmission?.answer_text ?? '', attachment_url: ownSubmission?.attachment_url ?? '' };
                                        return (
                                            <article key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2"><h3 className="font-bold">{assignment.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span></div>
                                                        {assignment.instructions && <p className="mt-2 text-sm leading-6 text-slate-600">{assignment.instructions}</p>}
                                                        <p className="mt-2 text-xs text-slate-400">Batas waktu: {formatDate(assignment.due_at)} · Nilai maks. {assignment.max_score}</p>
                                                    </div>
                                                    {!isStudent && <p className="text-xs text-slate-500">{assignment.submission_count} dikumpulkan · {assignment.graded_count} dinilai</p>}
                                                </div>

                                                {isStudent && assignment.status === 'published' && (
                                                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                                        <label className="text-sm font-medium">Jawaban<textarea rows={4} value={studentDraft.answer_text} onChange={(event) => setSubmissionDrafts((current) => ({ ...current, [assignment.id]: { ...studentDraft, answer_text: event.target.value } }))} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                                                        <label className="mt-3 block text-sm font-medium">Tautan lampiran<input type="url" value={studentDraft.attachment_url} onChange={(event) => setSubmissionDrafts((current) => ({ ...current, [assignment.id]: { ...studentDraft, attachment_url: event.target.value } }))} placeholder="https://..." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                                                        <button onClick={() => void submitAssignment(assignment)} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={15} /> {ownSubmission ? 'Perbarui Pengumpulan' : 'Kumpulkan Tugas'}</button>
                                                        {ownSubmission?.score !== null && ownSubmission?.score !== undefined && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm"><p className="font-bold text-emerald-800">Nilai: {ownSubmission.score}/{assignment.max_score}</p>{ownSubmission.feedback && <p className="mt-1 text-emerald-700">{ownSubmission.feedback}</p>}</div>}
                                                    </div>
                                                )}

                                                {!isStudent && assignment.submissions.length > 0 && (
                                                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                                                        {assignment.submissions.map((submission) => {
                                                            const grade = gradeDrafts[submission.id] ?? { score: submission.score?.toString() ?? '', feedback: submission.feedback ?? '' };
                                                            return (
                                                                <div key={submission.id} className="rounded-xl bg-slate-50 p-4">
                                                                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{submission.student_name || 'Mahasiswa'}</p><p className="text-xs text-slate-400">{submission.student_identity_number || 'Tanpa NIM'} · {formatDate(submission.submitted_at)}</p></div>{submission.attachment_url && <a href={submission.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">Lampiran <ExternalLink size={13} /></a>}</div>
                                                                    {submission.answer_text && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{submission.answer_text}</p>}
                                                                    {payload.can_edit && (
                                                                        <div className="mt-3 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-end">
                                                                            <label className="text-sm font-medium">Nilai<input type="number" min={0} max={assignment.max_score} value={grade.score} onChange={(event) => setGradeDrafts((current) => ({ ...current, [submission.id]: { ...grade, score: event.target.value } }))} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                                                                            <label className="text-sm font-medium">Feedback<input value={grade.feedback} onChange={(event) => setGradeDrafts((current) => ({ ...current, [submission.id]: { ...grade, feedback: event.target.value } }))} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                                                                            <button onClick={() => void gradeSubmission(assignment, submission)} disabled={busy || grade.score === ''} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Simpan Nilai</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof FileText; children: string }) {
    return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Icon size={15} />{children}</button>;
}

function EmptyState({ icon: Icon, text }: { icon: typeof BookOpen; text: string }) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"><Icon className="mx-auto mb-3 text-slate-400" />{text}</div>;
}

createRoot(document.getElementById('classroom-app')!).render(<Classroom />);
