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
    Sparkles,
    Trash2,
    UserPlus,
    Users,
    X,
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

type Member = {
    id: number;
    membership_role: 'lecturer' | 'student';
    status: string;
    user: {
        id: number;
        name: string;
        email: string;
        identity_number: string | null;
    };
};

type ClassListItem = { id: number; members: Member[] };
type MainTab = 'stream' | 'meetings' | 'materials' | 'assignments' | 'people';

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

function initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function assignmentStatus(status: Assignment['status']) {
    return {
        draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
        published: { label: 'Dibuka', className: 'bg-blue-50 text-blue-700' },
        closed: { label: 'Ditutup', className: 'bg-amber-50 text-amber-700' },
    }[status];
}

function Classroom() {
    const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const [payload, setPayload] = useState<ClassroomPayload | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [tab, setTab] = useState<MainTab>('stream');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [targetMeetingId, setTargetMeetingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Meeting | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [participantEmail, setParticipantEmail] = useState('');
    const [materialForm, setMaterialForm] = useState<MaterialForm>({ title: '', resource_type: 'link', description: '', resource_url: '' });
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({ title: '', instructions: '', max_score: '100', due_at: '', status: 'published' });
    const [submissionDrafts, setSubmissionDrafts] = useState<Record<number, { answer_text: string; attachment_url: string }>>({});
    const [gradeDrafts, setGradeDrafts] = useState<Record<number, { score: string; feedback: string }>>({});

    const selected = useMemo(
        () => payload?.meetings.find((meeting) => meeting.id === selectedId) ?? payload?.meetings[0] ?? null,
        [payload, selectedId],
    );

    const targetMeeting = useMemo(
        () => payload?.meetings.find((meeting) => meeting.id === targetMeetingId) ?? payload?.meetings[0] ?? null,
        [payload, targetMeetingId],
    );

    const allMaterials = useMemo(
        () => payload?.meetings.flatMap((meeting) => meeting.materials.map((material) => ({ meeting, material }))) ?? [],
        [payload],
    );

    const allAssignments = useMemo(
        () => payload?.meetings.flatMap((meeting) => meeting.assignments.map((assignment) => ({ meeting, assignment }))) ?? [],
        [payload],
    );

    const upcoming = useMemo(
        () => allAssignments
            .filter(({ assignment }) => assignment.status === 'published' && assignment.due_at)
            .sort((a, b) => new Date(a.assignment.due_at ?? '').getTime() - new Date(b.assignment.due_at ?? '').getTime())
            .slice(0, 4),
        [allAssignments],
    );

    const lecturers = useMemo(() => members.filter((member) => member.status === 'active' && member.membership_role === 'lecturer'), [members]);
    const students = useMemo(() => members.filter((member) => member.status === 'active' && member.membership_role === 'student'), [members]);

    const load = async () => {
        setBusy(true);
        setError('');
        const [roomResponse, classesResponse] = await Promise.all([
            api(`/sipandu-api/classes/${classId}/meetings`),
            api('/sipandu-api/classes'),
        ]);

        if (!roomResponse.ok) {
            setError(await responseError(roomResponse));
            setBusy(false);
            return;
        }

        const nextPayload = (await roomResponse.json()) as ClassroomPayload;
        setPayload(nextPayload);
        setSelectedId((current) => current ?? nextPayload.meetings[0]?.id ?? null);
        setTargetMeetingId((current) => current ?? nextPayload.meetings[0]?.id ?? null);

        if (classesResponse.ok) {
            const classList = (await classesResponse.json()) as { classes?: ClassListItem[] };
            const currentClass = classList.classes?.find((item) => item.id === Number(classId));
            setMembers(currentClass?.members ?? []);
        }

        setBusy(false);
    };

    useEffect(() => { void load(); }, [classId]);
    useEffect(() => { setDraft(selected ? { ...selected } : null); }, [selected]);

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
            () => api(`/sipandu-api/classes/${classId}/meetings/${draft.id}`, {
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
        if (!targetMeeting || !payload?.can_edit) return;
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/meetings/${targetMeeting.id}/materials`, {
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

    const removeMaterial = async (meetingId: number, material: Material) => {
        if (!payload?.can_edit) return;
        await mutate(
            () => api(`/sipandu-api/classes/${classId}/meetings/${meetingId}/materials/${material.id}`, { method: 'DELETE' }),
            'Materi dihapus.',
        );
    };

    const addAssignment = async (event: FormEvent) => {
        event.preventDefault();
        if (!targetMeeting || !payload?.can_edit) return;
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/meetings/${targetMeeting.id}/assignments`, {
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
            () => api(`/sipandu-api/classes/${classId}/assignments/${assignment.id}/submission`, {
                method: 'POST', body: JSON.stringify(form),
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
            () => api(`/sipandu-api/classes/${classId}/assignments/${assignment.id}/submissions/${submission.id}/grade`, {
                method: 'PATCH', body: JSON.stringify({ score: Number(form.score), feedback: form.feedback || null }),
            }),
            'Nilai disimpan.',
        );
    };

    const addParticipant = async (event: FormEvent) => {
        event.preventDefault();
        const email = participantEmail.trim();
        if (!email || !payload?.can_edit) return;
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/participants`, {
                method: 'POST', body: JSON.stringify({ email }),
            }),
            'Mahasiswa ditambahkan ke kelas.',
        );
        if (ok) setParticipantEmail('');
    };

    const removeParticipant = async (member: Member) => {
        if (!payload?.can_edit || member.membership_role !== 'student') return;
        await mutate(
            () => api(`/sipandu-api/classes/${classId}/participants/${member.user.id}`, { method: 'DELETE' }),
            'Mahasiswa dikeluarkan dari kelas.',
        );
    };

    if (!payload && busy) {
        return <div className="grid min-h-screen place-items-center bg-[#f4f7ff] text-sm font-semibold text-slate-500">Memuat ruang kelas…</div>;
    }

    if (!payload) {
        return <div className="grid min-h-screen place-items-center bg-[#f4f7ff] px-6 text-center text-sm text-rose-600">{error || 'Kelas tidak dapat dimuat.'}</div>;
    }

    const isStudent = payload.viewer_role === 'student';
    const semesterLabel = payload.class.academic_term.semester === 'ganjil' ? 'Ganjil' : 'Genap';
    const completedMeetings = payload.meetings.filter((meeting) => meeting.status === 'completed').length;

    return (
        <main className="min-h-screen bg-[#f4f7ff] text-slate-950">
            <style>{`.field{margin-top:.375rem;width:100%;border-radius:1rem;border:1px solid #dbe3f1;background:#fff;padding:.72rem .85rem;outline:none;transition:.18s}.field:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}.field:disabled{background:#f8fafc;color:#64748b}`}</style>

            <header className="sticky top-0 z-30 border-b border-blue-100/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <a href="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><ArrowLeft size={17} /></a>
                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold uppercase tracking-[.16em] text-blue-600">{payload.class.course.code} · {payload.class.course.credits} SKS</p>
                            <h1 className="truncate text-lg font-bold">{payload.class.course.name} — Kelas {payload.class.name}</h1>
                        </div>
                    </div>
                    <button onClick={() => void load()} disabled={busy} className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-600 transition hover:bg-blue-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} /></button>
                </div>
            </header>

            <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <section className="relative isolate overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,.9),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(147,197,253,.35),transparent_28%),linear-gradient(135deg,#020d2f_0%,#071b56_52%,#0d48cf_100%)] px-6 py-7 text-white shadow-2xl shadow-blue-950/10 sm:px-8 sm:py-9">
                    <div className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
                    <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50"><Sparkles size={14} /> SiPANDU Classroom</span>
                            <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{payload.class.course.name}</h2>
                            <p className="mt-2 text-sm text-blue-100">Kelas {payload.class.name} · {semesterLabel} {payload.class.academic_term.academic_year}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <HeroStat label="Pertemuan" value={`${completedMeetings}/16`} />
                            <HeroStat label="Materi" value={String(allMaterials.length)} />
                            <HeroStat label="Tugas" value={String(allAssignments.length)} />
                        </div>
                    </div>
                </section>

                <div className="mt-5 overflow-x-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-sm">
                    <div className="flex min-w-max gap-1">
                        <TopTab active={tab === 'stream'} onClick={() => setTab('stream')} icon={FileText}>Stream</TopTab>
                        <TopTab active={tab === 'meetings'} onClick={() => setTab('meetings')} icon={CalendarDays}>Pertemuan</TopTab>
                        <TopTab active={tab === 'materials'} onClick={() => setTab('materials')} icon={BookOpen}>Materi</TopTab>
                        <TopTab active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={ClipboardList}>Tugas</TopTab>
                        <TopTab active={tab === 'people'} onClick={() => setTab('people')} icon={Users}>Peserta</TopTab>
                    </div>
                </div>

                {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                {notice && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

                {tab === 'stream' && (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <section className="space-y-4">
                            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Aktivitas Kelas</p><h3 className="mt-1 text-xl font-bold">Yang terbaru</h3></div>
                                    {payload.can_edit && <div className="flex gap-2"><button onClick={() => setTab('materials')} className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">+ Materi</button><button onClick={() => setTab('assignments')} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">+ Tugas</button></div>}
                                </div>
                            </div>

                            {payload.meetings.filter((meeting) => meeting.status !== 'planned' || meeting.materials.length || meeting.assignments.length).slice().reverse().slice(0, 8).map((meeting) => (
                                <article key={meeting.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                    <div className="flex gap-4">
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-sm font-bold text-white">{meeting.meeting_number}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</h3>{meeting.status === 'completed' && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Selesai</span>}</div>
                                            {meeting.topic && <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{meeting.topic}</p>}
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span>{meeting.materials.length} materi</span><span>·</span><span>{meeting.assignments.length} tugas</span>{meeting.starts_at && <><span>·</span><span>{formatDate(meeting.starts_at)}</span></>}</div>
                                            <button onClick={() => { setSelectedId(meeting.id); setTab('meetings'); }} className="mt-3 text-sm font-semibold text-blue-700">Buka pertemuan →</button>
                                        </div>
                                    </div>
                                </article>
                            ))}

                            {payload.meetings.every((meeting) => meeting.status === 'planned' && !meeting.materials.length && !meeting.assignments.length) && <EmptyState icon={FileText} text="Belum ada aktivitas kelas. Mulai dari pertemuan, materi, atau tugas." />}
                        </section>

                        <aside className="space-y-4">
                            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Yang akan datang</p>
                                <h3 className="mt-1 font-bold">Batas waktu tugas</h3>
                                <div className="mt-4 space-y-3">
                                    {upcoming.length === 0 ? <p className="text-sm text-slate-500">Belum ada tugas dengan batas waktu.</p> : upcoming.map(({ meeting, assignment }) => <button key={assignment.id} onClick={() => setTab('assignments')} className="block w-full rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-blue-50"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p><p className="mt-1 text-sm font-bold">{assignment.title}</p><p className="mt-1 text-xs text-slate-500">{formatDate(assignment.due_at)}</p></button>)}
                                </div>
                            </section>
                            <section className="rounded-3xl bg-[#071b56] p-5 text-white shadow-sm"><p className="text-xs font-semibold text-blue-200">Peserta aktif</p><p className="mt-2 text-3xl font-bold">{students.length}</p><button onClick={() => setTab('people')} className="mt-3 text-sm font-semibold text-blue-100">Lihat peserta →</button></section>
                        </aside>
                    </div>
                )}

                {tab === 'meetings' && (
                    <div className="mt-5 grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
                        <aside className="self-start rounded-3xl border border-blue-100 bg-white p-3 shadow-sm lg:sticky lg:top-24">
                            <p className="px-3 py-2 text-xs font-bold uppercase tracking-[.14em] text-blue-600">Pertemuan 1–16</p>
                            <div className="max-h-[70vh] space-y-1 overflow-y-auto">
                                {payload.meetings.map((meeting) => <button key={meeting.id} onClick={() => setSelectedId(meeting.id)} className={`w-full rounded-2xl px-3 py-3 text-left transition ${selected?.id === meeting.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-blue-50'}`}><div className="flex items-center gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${selected?.id === meeting.id ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-700'}`}>{meeting.meeting_number}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</p><p className={`mt-0.5 text-[11px] ${selected?.id === meeting.id ? 'text-blue-100' : 'text-slate-400'}`}>{meeting.status === 'completed' ? 'Selesai' : meeting.status === 'published' ? 'Terbit' : 'Rencana'}</p></div></div></button>)}
                            </div>
                        </aside>

                        {draft && <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Pertemuan {draft.meeting_number}</p><h3 className="mt-1 text-xl font-bold">{draft.title || `Pertemuan ${draft.meeting_number}`}</h3></div>{draft.status === 'completed' && <CheckCircle2 className="text-emerald-600" />}</div>
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-semibold md:col-span-2">Judul<input disabled={!payload.can_edit} value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="field" /></label>
                                <label className="text-sm font-semibold md:col-span-2">Topik<textarea disabled={!payload.can_edit} rows={3} value={draft.topic ?? ''} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} className="field" /></label>
                                <label className="text-sm font-semibold">Jadwal<input disabled={!payload.can_edit} type="datetime-local" value={draft.starts_at ?? ''} onChange={(event) => setDraft({ ...draft, starts_at: event.target.value || null })} className="field" /></label>
                                <label className="text-sm font-semibold">Status<select disabled={!payload.can_edit} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Meeting['status'] })} className="field"><option value="planned">Rencana</option><option value="published">Terbit</option><option value="completed">Selesai</option></select></label>
                                <label className="text-sm font-semibold md:col-span-2">Metode pembelajaran<input disabled={!payload.can_edit} value={draft.learning_method ?? ''} onChange={(event) => setDraft({ ...draft, learning_method: event.target.value })} className="field" placeholder="Diskusi, praktikum, ceramah, project…" /></label>
                                <label className="text-sm font-semibold md:col-span-2">Ringkasan materi<textarea disabled={!payload.can_edit} rows={5} value={draft.material_summary ?? ''} onChange={(event) => setDraft({ ...draft, material_summary: event.target.value })} className="field" /></label>
                            </div>
                            {payload.can_edit && <button onClick={() => void saveMeeting()} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"><Save size={15} /> Simpan Pertemuan</button>}
                        </section>}
                    </div>
                )}

                {tab === 'materials' && (
                    <div className="mt-5 space-y-5">
                        {payload.can_edit && <form onSubmit={addMaterial} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Plus size={18} className="text-blue-600" /><h3 className="font-bold">Tambah Materi</h3></div><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">Pertemuan<select value={targetMeetingId ?? ''} onChange={(event) => setTargetMeetingId(Number(event.target.value))} className="field">{payload.meetings.map((meeting) => <option key={meeting.id} value={meeting.id}>Pertemuan {meeting.meeting_number} — {meeting.title || 'Tanpa judul'}</option>)}</select></label><label className="text-sm font-semibold">Jenis<select value={materialForm.resource_type} onChange={(event) => setMaterialForm({ ...materialForm, resource_type: event.target.value as Material['resource_type'] })} className="field"><option value="link">Tautan</option><option value="document">Dokumen</option><option value="video">Video</option><option value="reading">Bacaan</option><option value="other">Lainnya</option></select></label><label className="text-sm font-semibold md:col-span-2">Judul<input required value={materialForm.title} onChange={(event) => setMaterialForm({ ...materialForm, title: event.target.value })} className="field" /></label><label className="text-sm font-semibold md:col-span-2">Tautan<input type="url" value={materialForm.resource_url} onChange={(event) => setMaterialForm({ ...materialForm, resource_url: event.target.value })} className="field" placeholder="https://..." /></label><label className="text-sm font-semibold md:col-span-2">Keterangan<textarea rows={3} value={materialForm.description} onChange={(event) => setMaterialForm({ ...materialForm, description: event.target.value })} className="field" /></label></div><button disabled={busy} className="mt-4 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Tambah Materi</button></form>}
                        <section className="grid gap-4 lg:grid-cols-2">{allMaterials.length === 0 ? <div className="lg:col-span-2"><EmptyState icon={BookOpen} text="Belum ada materi kelas." /></div> : allMaterials.map(({ meeting, material }) => <article key={`${meeting.id}-${material.id}`} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-blue-600">Pertemuan {meeting.meeting_number}</p><div className="mt-2 flex items-center gap-2"><Link2 size={15} className="text-slate-400" /><h3 className="font-bold">{material.title}</h3></div>{material.description && <p className="mt-2 text-sm leading-6 text-slate-600">{material.description}</p>}{material.resource_url && <a href={material.resource_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Buka materi <ExternalLink size={14} /></a>}</div>{payload.can_edit && <button onClick={() => void removeMaterial(meeting.id, material)} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>}</div></article>)}</section>
                    </div>
                )}

                {tab === 'assignments' && (
                    <div className="mt-5 space-y-5">
                        {payload.can_edit && <form onSubmit={addAssignment} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Plus size={18} className="text-blue-600" /><h3 className="font-bold">Buat Tugas</h3></div><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">Pertemuan<select value={targetMeetingId ?? ''} onChange={(event) => setTargetMeetingId(Number(event.target.value))} className="field">{payload.meetings.map((meeting) => <option key={meeting.id} value={meeting.id}>Pertemuan {meeting.meeting_number} — {meeting.title || 'Tanpa judul'}</option>)}</select></label><label className="text-sm font-semibold">Status<select value={assignmentForm.status} onChange={(event) => setAssignmentForm({ ...assignmentForm, status: event.target.value as Assignment['status'] })} className="field"><option value="draft">Draft</option><option value="published">Dibuka</option><option value="closed">Ditutup</option></select></label><label className="text-sm font-semibold md:col-span-2">Judul tugas<input required value={assignmentForm.title} onChange={(event) => setAssignmentForm({ ...assignmentForm, title: event.target.value })} className="field" /></label><label className="text-sm font-semibold md:col-span-2">Instruksi<textarea rows={4} value={assignmentForm.instructions} onChange={(event) => setAssignmentForm({ ...assignmentForm, instructions: event.target.value })} className="field" /></label><label className="text-sm font-semibold">Nilai maksimum<input type="number" min={1} value={assignmentForm.max_score} onChange={(event) => setAssignmentForm({ ...assignmentForm, max_score: event.target.value })} className="field" /></label><label className="text-sm font-semibold">Batas waktu<input type="datetime-local" value={assignmentForm.due_at} onChange={(event) => setAssignmentForm({ ...assignmentForm, due_at: event.target.value })} className="field" /></label></div><button disabled={busy} className="mt-4 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Buat Tugas</button></form>}

                        {allAssignments.length === 0 ? <EmptyState icon={ClipboardList} text="Belum ada tugas kelas." /> : allAssignments.map(({ meeting, assignment }) => {
                            const status = assignmentStatus(assignment.status);
                            const ownSubmission = isStudent ? assignment.submissions[0] : null;
                            const studentDraft = submissionDrafts[assignment.id] ?? { answer_text: ownSubmission?.answer_text ?? '', attachment_url: ownSubmission?.attachment_url ?? '' };
                            return <article key={`${meeting.id}-${assignment.id}`} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-blue-600">Pertemuan {meeting.meeting_number}</p><div className="mt-2 flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{assignment.title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span></div>{assignment.instructions && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{assignment.instructions}</p>}<p className="mt-2 text-xs text-slate-400">Batas waktu: {formatDate(assignment.due_at)} · Nilai maks. {assignment.max_score}</p></div>{!isStudent && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{assignment.submission_count} dikumpulkan · {assignment.graded_count} dinilai</p>}</div>

                            {isStudent && assignment.status === 'published' && <div className="mt-4 rounded-2xl bg-blue-50/60 p-4"><label className="text-sm font-semibold">Jawaban<textarea rows={4} value={studentDraft.answer_text} onChange={(event) => setSubmissionDrafts((current) => ({ ...current, [assignment.id]: { ...studentDraft, answer_text: event.target.value } }))} className="field" /></label><label className="mt-3 block text-sm font-semibold">Tautan lampiran<input type="url" value={studentDraft.attachment_url} onChange={(event) => setSubmissionDrafts((current) => ({ ...current, [assignment.id]: { ...studentDraft, attachment_url: event.target.value } }))} className="field" placeholder="https://..." /></label><button onClick={() => void submitAssignment(assignment)} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={15} /> {ownSubmission ? 'Perbarui Pengumpulan' : 'Kumpulkan Tugas'}</button>{ownSubmission?.score !== null && ownSubmission?.score !== undefined && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm"><p className="font-bold text-emerald-800">Nilai: {ownSubmission.score}/{assignment.max_score}</p>{ownSubmission.feedback && <p className="mt-1 text-emerald-700">{ownSubmission.feedback}</p>}</div>}</div>}

                            {!isStudent && assignment.submissions.length > 0 && <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">{assignment.submissions.map((submission) => { const grade = gradeDrafts[submission.id] ?? { score: submission.score?.toString() ?? '', feedback: submission.feedback ?? '' }; return <div key={submission.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{submission.student_name || 'Mahasiswa'}</p><p className="text-xs text-slate-400">{submission.student_identity_number || 'Tanpa NIM'} · {formatDate(submission.submitted_at)}</p></div>{submission.attachment_url && <a href={submission.attachment_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-700">Lampiran</a>}</div>{submission.answer_text && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{submission.answer_text}</p>}{payload.can_edit && <div className="mt-3 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-end"><label className="text-sm font-semibold">Nilai<input type="number" min={0} max={assignment.max_score} value={grade.score} onChange={(event) => setGradeDrafts((current) => ({ ...current, [submission.id]: { ...grade, score: event.target.value } }))} className="field" /></label><label className="text-sm font-semibold">Feedback<input value={grade.feedback} onChange={(event) => setGradeDrafts((current) => ({ ...current, [submission.id]: { ...grade, feedback: event.target.value } }))} className="field" /></label><button onClick={() => void gradeSubmission(assignment, submission)} disabled={busy || grade.score === ''} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Simpan Nilai</button></div>}</div>; })}</div>}
                            </article>;
                        })}
                    </div>
                )}

                {tab === 'people' && (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
                        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Pengajar</p><h3 className="mt-1 text-xl font-bold">Dosen Kelas</h3></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{lecturers.length}</span></div><div className="mt-4 space-y-3">{lecturers.length === 0 ? <p className="text-sm text-slate-500">Belum ada dosen kelas.</p> : lecturers.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#071b56] text-xs font-bold text-white">{initials(member.user.name)}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{member.user.name}</p><p className="truncate text-xs text-slate-500">{member.user.email}</p></div></div>)}</div></section>

                        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Peserta</p><h3 className="mt-1 text-xl font-bold">Mahasiswa</h3></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{students.length} aktif</span></div>{payload.can_edit && <form onSubmit={addParticipant} className="mt-4 flex gap-2"><input type="email" required value={participantEmail} onChange={(event) => setParticipantEmail(event.target.value)} placeholder="email mahasiswa" className="field !mt-0 min-w-0 flex-1" /><button disabled={busy} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><UserPlus size={15} /> Tambah</button></form>}<div className="mt-4 grid gap-3 sm:grid-cols-2">{students.length === 0 ? <p className="text-sm text-slate-500">Belum ada mahasiswa di kelas ini.</p> : students.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-100 text-xs font-bold text-blue-700">{initials(member.user.name)}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{member.user.name}</p><p className="truncate text-xs text-slate-500">{member.user.identity_number ? `${member.user.identity_number} · ` : ''}{member.user.email}</p></div></div>{payload.can_edit && <button onClick={() => void removeParticipant(member)} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={15} /></button>}</div>)}</div></section>
                    </div>
                )}
            </section>
        </main>
    );
}

function HeroStat({ label, value }: { label: string; value: string }) {
    return <div className="min-w-20 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur"><p className="text-lg font-bold">{value}</p><p className="mt-0.5 text-[10px] font-medium text-blue-100">{label}</p></div>;
}

function TopTab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof FileText; children: string }) {
    return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}><Icon size={16} />{children}</button>;
}

function EmptyState({ icon: Icon, text }: { icon: typeof BookOpen; text: string }) {
    return <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center text-sm text-slate-500"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={22} /></div><p className="mt-3">{text}</p></div>;
}

createRoot(document.getElementById('classroom-app')!).render(<Classroom />);
