import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ArrowLeft,
    BarChart3,
    Bell,
    BookOpen,
    CalendarCheck,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Clock3,
    Download,
    FileText,
    GraduationCap,
    Home,
    LoaderCircle,
    Paperclip,
    RefreshCw,
    Send,
    Sparkles,
    Target,
} from 'lucide-react';

type Tab = 'home' | 'meetings' | 'materials' | 'assignments' | 'attendance' | 'grades' | 'obe';
type AttendanceStatus = 'present' | 'sick' | 'excused' | 'absent';

type Bootstrap = {
    user: { id: number; name: string; email: string; role: string; identity_number?: string | null } | null;
};

type Material = {
    id: number;
    title: string;
    resource_type: string;
    description: string | null;
    resource_url: string | null;
    is_published: boolean;
    is_learned: boolean;
    learned_at: string | null;
};

type Submission = {
    id: number;
    user_id: number;
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
    attachment_url: string | null;
    attachment_name: string | null;
    sub_cpmk_code: string | null;
    weight_percent: number;
    max_score: number;
    due_at: string | null;
    status: 'draft' | 'published' | 'closed';
    submissions: Submission[];
};

type Attendance = {
    user_id: number;
    status: AttendanceStatus;
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
        course: { id: number; code: string; name: string; credits: number };
        academic_term: { id: number; academic_year: string; semester: string };
    };
    viewer_role: string;
    file_upload_available: boolean;
    obe_summary: ObeSummary[];
    meetings: Meeting[];
};

type Announcement = {
    id: number;
    body: string;
    created_at: string | null;
    author: { name: string } | null;
};

type ProgressClass = {
    class_id: number;
    overall_percent: number;
    completed_meetings: number;
    total_meetings: number;
    submitted_assignments: number;
    total_assignments: number;
    learned_materials: number;
    materials_available: number;
};

type Dashboard = {
    progress: { classes: ProgressClass[] } | null;
};

type UploadResult = { file: { url: string; name: string; size_bytes: number } };

type SubmissionDraft = { answer_text: string; attachment_url: string };

type IconType = typeof Home;

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    headers.set('Accept', 'application/json');
    if (init.method && init.method !== 'GET') {
        headers.set('X-CSRF-TOKEN', csrf());
        if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }
    return fetch(path, { credentials: 'include', ...init, headers });
}

async function errorMessage(response: Response): Promise<string> {
    try {
        const data = await response.json();
        return String(Object.values(data.errors ?? {}).flat()[0] ?? data.message ?? 'Permintaan belum berhasil.');
    } catch {
        return 'Permintaan belum berhasil.';
    }
}

function formatDate(value: string | null): string {
    if (!value) return 'Belum dijadwalkan';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function timeUntil(value: string | null): string {
    if (!value) return 'Tanpa batas waktu';
    const diff = new Date(value).getTime() - Date.now();
    if (diff < 0) return 'Batas waktu lewat';
    const hours = Math.ceil(diff / 3600000);
    if (hours < 24) return `${hours} jam lagi`;
    const days = Math.ceil(hours / 24);
    return `${days} hari lagi`;
}

function statusLabel(status: AttendanceStatus): string {
    return ({ present: 'Hadir', sick: 'Sakit', excused: 'Izin', absent: 'Alpa' })[status];
}

function initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function StudentClassroom() {
    const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const [viewer, setViewer] = useState<Bootstrap['user']>(null);
    const [payload, setPayload] = useState<ClassroomPayload | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [progress, setProgress] = useState<ProgressClass | null>(null);
    const [tab, setTab] = useState<Tab>('home');
    const [busy, setBusy] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [drafts, setDrafts] = useState<Record<number, SubmissionDraft>>({});
    const [files, setFiles] = useState<Record<number, File | null>>({});

    const load = async () => {
        setBusy(true);
        setError('');
        const [bootstrapResponse, roomResponse, announcementsResponse, dashboardResponse] = await Promise.all([
            api('/sipandu-api/bootstrap'),
            api(`/sipandu-api/classes/${classId}/meetings`),
            api(`/sipandu-api/classes/${classId}/announcements`),
            api('/sipandu-api/dashboard'),
        ]);

        if (!bootstrapResponse.ok || !roomResponse.ok) {
            setError(!roomResponse.ok ? await errorMessage(roomResponse) : 'Sesi mahasiswa belum dapat dimuat.');
            setBusy(false);
            return;
        }

        const bootstrap = await bootstrapResponse.json() as Bootstrap;
        const room = await roomResponse.json() as ClassroomPayload;
        if (bootstrap.user?.role !== 'student' || room.viewer_role !== 'student') {
            setBusy(false);
            return;
        }

        setViewer(bootstrap.user);
        setPayload(room);

        if (announcementsResponse.ok) {
            const data = await announcementsResponse.json() as { announcements?: Announcement[] };
            setAnnouncements(data.announcements ?? []);
        }

        if (dashboardResponse.ok) {
            const data = await dashboardResponse.json() as Dashboard;
            setProgress(data.progress?.classes.find((item) => item.class_id === Number(classId)) ?? null);
        }

        setBusy(false);
    };

    useEffect(() => { void load(); }, [classId]);

    useEffect(() => {
        if (!viewer || viewer.role !== 'student') return;
        const original = document.getElementById('classroom-app');
        const checklist = document.getElementById('student-material-checklist-root');
        const insight = document.getElementById('student-progress-root');
        if (original) original.style.display = 'none';
        if (checklist) checklist.style.display = 'none';
        if (insight) insight.style.display = 'none';
        document.body.dataset.sipanduStudentClassroom = 'true';
        return () => {
            if (original) original.style.display = '';
            if (checklist) checklist.style.display = '';
            if (insight) insight.style.display = '';
            delete document.body.dataset.sipanduStudentClassroom;
        };
    }, [viewer?.id]);

    const allMaterials = useMemo(
        () => payload?.meetings.flatMap((meeting) => meeting.materials.map((material) => ({ meeting, material }))) ?? [],
        [payload],
    );

    const allAssignments = useMemo(
        () => payload?.meetings.flatMap((meeting) => meeting.assignments.map((assignment) => ({ meeting, assignment }))) ?? [],
        [payload],
    );

    const submittedAssignments = useMemo(
        () => allAssignments.filter(({ assignment }) => Boolean(assignment.submissions[0]?.submitted_at)),
        [allAssignments],
    );

    const pendingAssignments = useMemo(
        () => allAssignments
            .filter(({ assignment }) => assignment.status === 'published' && !assignment.submissions[0]?.submitted_at)
            .sort((a, b) => {
                if (!a.assignment.due_at) return 1;
                if (!b.assignment.due_at) return -1;
                return new Date(a.assignment.due_at).getTime() - new Date(b.assignment.due_at).getTime();
            }),
        [allAssignments],
    );

    const nextMeeting = useMemo(() => {
        if (!payload) return null;
        const scheduled = payload.meetings
            .filter((meeting) => meeting.status !== 'completed' && meeting.starts_at && new Date(meeting.starts_at).getTime() >= Date.now())
            .sort((a, b) => new Date(a.starts_at ?? '').getTime() - new Date(b.starts_at ?? '').getTime())[0];
        return scheduled ?? payload.meetings.find((meeting) => meeting.status === 'published' && meeting.status !== 'completed') ?? null;
    }, [payload]);

    const latestGrades = useMemo(
        () => allAssignments
            .map(({ meeting, assignment }) => ({ meeting, assignment, submission: assignment.submissions[0] }))
            .filter((item) => item.submission?.score !== null && item.submission?.score !== undefined)
            .sort((a, b) => new Date(b.submission?.graded_at ?? 0).getTime() - new Date(a.submission?.graded_at ?? 0).getTime()),
        [allAssignments],
    );

    const learnedCount = allMaterials.filter(({ material }) => material.is_learned).length;
    const attendanceRows = payload?.meetings.filter((meeting) => meeting.attendance.length > 0) ?? [];
    const presentCount = attendanceRows.filter((meeting) => meeting.attendance[0]?.status === 'present').length;
    const averageScore = latestGrades.length
        ? Math.round(latestGrades.reduce((sum, item) => sum + ((item.submission?.score ?? 0) / Math.max(item.assignment.max_score, 1)) * 100, 0) / latestGrades.length)
        : null;

    const toggleLearned = async (material: Material) => {
        if (!payload) return;
        setBusyId(material.id);
        setError('');
        const response = await api(`/sipandu-api/classes/${payload.class.id}/materials/${material.id}/learned`, {
            method: 'PUT',
            body: JSON.stringify({ learned: !material.is_learned }),
        });
        if (!response.ok) {
            setError(await errorMessage(response));
            setBusyId(null);
            return;
        }
        setNotice(material.is_learned ? 'Materi ditandai belum selesai.' : 'Materi ditandai sudah dipelajari.');
        await load();
        window.dispatchEvent(new Event('sipandu:progress-changed'));
        setBusyId(null);
    };

    const upload = async (file: File): Promise<string | null> => {
        if (!payload) return null;
        if (file.size > 4 * 1024 * 1024) {
            setError('Ukuran file maksimal 4 MB.');
            return null;
        }
        const form = new FormData();
        form.append('purpose', 'submission');
        form.append('file', file);
        const response = await api(`/sipandu-api/classes/${payload.class.id}/files`, { method: 'POST', body: form });
        if (!response.ok) {
            setError(await errorMessage(response));
            return null;
        }
        const data = await response.json() as UploadResult;
        return data.file.url;
    };

    const submitAssignment = async (event: FormEvent, assignment: Assignment) => {
        event.preventDefault();
        if (!payload) return;
        setBusyId(assignment.id);
        setError('');
        setNotice('');
        const current = assignment.submissions[0];
        const draft = drafts[assignment.id] ?? { answer_text: current?.answer_text ?? '', attachment_url: current?.attachment_url ?? '' };
        let attachmentUrl = draft.attachment_url;
        const file = files[assignment.id];
        if (file) {
            const uploaded = await upload(file);
            if (!uploaded) {
                setBusyId(null);
                return;
            }
            attachmentUrl = uploaded;
        }
        const response = await api(`/sipandu-api/classes/${payload.class.id}/assignments/${assignment.id}/submission`, {
            method: 'POST',
            body: JSON.stringify({ answer_text: draft.answer_text || null, attachment_url: attachmentUrl || null }),
        });
        if (!response.ok) {
            setError(await errorMessage(response));
            setBusyId(null);
            return;
        }
        setFiles((currentFiles) => ({ ...currentFiles, [assignment.id]: null }));
        setNotice('Tugas berhasil dikumpulkan.');
        await load();
        window.dispatchEvent(new Event('sipandu:progress-changed'));
        setBusyId(null);
    };

    if (!viewer || !payload) {
        return busy || !error ? null : <div className="fixed inset-x-4 bottom-4 z-[90] rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xl">{error}</div>;
    }

    const semester = payload.class.academic_term.semester === 'ganjil' ? 'Ganjil' : 'Genap';
    const overall = progress?.overall_percent ?? Math.round(((payload.meetings.filter((m) => m.status === 'completed').length / Math.max(payload.meetings.length, 1)) + (learnedCount / Math.max(allMaterials.length, 1)) + (submittedAssignments.length / Math.max(allAssignments.length, 1))) / 3 * 100);

    return (
        <main className="min-h-screen bg-[#f5f7fb] pb-24 text-slate-950">
            <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/92 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1460px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <a href="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700"><ArrowLeft size={17} /></a>
                        <div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">{payload.class.course.code} · Kelas {payload.class.name}</p><h1 className="truncate text-base font-bold sm:text-lg">{payload.class.course.name}</h1></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={`/kelas/${classId}/jurnal`} className="hidden rounded-2xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 sm:inline-flex">Jurnal</a>
                        <button onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-600"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} /></button>
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0b2d7a] text-xs font-bold text-white" title={viewer.name}>{initials(viewer.name) || 'M'}</div>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-[1460px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
                <section className="relative isolate overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,.9),transparent_28%),radial-gradient(circle_at_85%_70%,rgba(125,211,252,.32),transparent_30%),linear-gradient(135deg,#020d2f_0%,#071b56_52%,#0d48cf_100%)] px-6 py-7 text-white shadow-xl shadow-blue-950/10 sm:px-8 sm:py-8">
                    <div className="absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full border border-white/10 bg-white/5" />
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50"><GraduationCap size={14} /> Ruang Belajar Mahasiswa</span>
                            <p className="mt-4 text-sm text-blue-100">Selamat belajar, {viewer.name.split(' ')[0]}.</p>
                            <h2 className="mt-1 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{payload.class.course.name}</h2>
                            <p className="mt-2 text-sm text-blue-100">Semester {semester} {payload.class.academic_term.academic_year} · {payload.class.course.credits} SKS</p>
                        </div>
                        <div className="min-w-[240px] rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                            <div className="flex items-end justify-between"><div><p className="text-xs font-semibold text-blue-100">Progress kelas</p><p className="mt-1 text-3xl font-extrabold">{overall}%</p></div><Sparkles size={24} className="text-blue-200" /></div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white" style={{ width: `${Math.max(0, Math.min(100, overall))}%` }} /></div>
                        </div>
                    </div>
                </section>

                <div className="mt-5 overflow-x-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-sm">
                    <div className="flex min-w-max gap-1">
                        <Nav active={tab === 'home'} icon={Home} onClick={() => setTab('home')}>Beranda Kelas</Nav>
                        <Nav active={tab === 'meetings'} icon={CalendarDays} onClick={() => setTab('meetings')}>Pertemuan</Nav>
                        <Nav active={tab === 'materials'} icon={BookOpen} onClick={() => setTab('materials')}>Materi</Nav>
                        <Nav active={tab === 'assignments'} icon={ClipboardCheck} onClick={() => setTab('assignments')}>Tugas Saya</Nav>
                        <Nav active={tab === 'attendance'} icon={CalendarCheck} onClick={() => setTab('attendance')}>Presensi Saya</Nav>
                        <Nav active={tab === 'grades'} icon={BarChart3} onClick={() => setTab('grades')}>Nilai Saya</Nav>
                        <Nav active={tab === 'obe'} icon={Target} onClick={() => setTab('obe')}>Capaian OBE</Nav>
                    </div>
                </div>

                {error && <Alert kind="error">{error}</Alert>}
                {notice && <Alert kind="success">{notice}</Alert>}

                {tab === 'home' && (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
                        <section className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <Stat icon={CalendarCheck} label="Pertemuan selesai" value={`${progress?.completed_meetings ?? payload.meetings.filter((m) => m.status === 'completed').length}/${progress?.total_meetings ?? payload.meetings.length}`} />
                                <Stat icon={BookOpen} label="Materi dipelajari" value={`${learnedCount}/${allMaterials.length}`} />
                                <Stat icon={ClipboardCheck} label="Tugas dikumpulkan" value={`${submittedAssignments.length}/${allAssignments.length}`} />
                                <Stat icon={BarChart3} label="Rata-rata nilai" value={averageScore === null ? '—' : `${averageScore}%`} />
                            </div>

                            <section className="grid gap-4 lg:grid-cols-2">
                                <article className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><CalendarDays size={18} /></div><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Berikutnya</p><h3 className="font-bold">Pertemuan selanjutnya</h3></div></div>
                                    {nextMeeting ? <div className="mt-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-xs font-bold text-white">{nextMeeting.meeting_number}</span>{nextMeeting.sub_cpmk_code && <Badge>{nextMeeting.sub_cpmk_code}</Badge>}</div><h4 className="mt-3 text-lg font-bold">{nextMeeting.title || `Pertemuan ${nextMeeting.meeting_number}`}</h4><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{nextMeeting.topic || nextMeeting.material_summary || 'Materi pertemuan akan ditampilkan oleh dosen.'}</p><p className="mt-3 text-xs font-semibold text-blue-700">{formatDate(nextMeeting.starts_at)}</p><button onClick={() => setTab('meetings')} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">Lihat pertemuan <ChevronRight size={15} /></button></div> : <p className="mt-4 text-sm text-slate-500">Belum ada pertemuan berikutnya yang dijadwalkan.</p>}
                                </article>

                                <article className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Clock3 size={18} /></div><div><p className="text-xs font-bold uppercase tracking-[.13em] text-amber-600">Prioritas</p><h3 className="font-bold">Tugas terdekat</h3></div></div>
                                    {pendingAssignments[0] ? <div className="mt-5"><p className="text-xs font-semibold text-blue-600">Pertemuan {pendingAssignments[0].meeting.meeting_number}</p><h4 className="mt-1 text-lg font-bold">{pendingAssignments[0].assignment.title}</h4><p className="mt-2 text-sm text-slate-500">Batas: {formatDate(pendingAssignments[0].assignment.due_at)}</p><span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{timeUntil(pendingAssignments[0].assignment.due_at)}</span><button onClick={() => setTab('assignments')} className="mt-4 flex items-center gap-1 text-sm font-bold text-blue-700">Kerjakan sekarang <ChevronRight size={15} /></button></div> : <div className="mt-5 rounded-2xl bg-emerald-50 p-4"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={18} /><strong className="text-sm">Tidak ada tugas tertunda</strong></div><p className="mt-1 text-xs leading-5 text-emerald-700/80">Semua tugas yang tersedia sudah Anda kumpulkan.</p></div>}
                                </article>
                            </section>

                            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                                <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Pengumuman</p><h3 className="mt-1 font-bold">Informasi terbaru dari kelas</h3></div><Bell size={19} className="text-blue-600" /></div>
                                <div className="mt-4 space-y-3">{announcements.length === 0 ? <p className="text-sm text-slate-500">Belum ada pengumuman.</p> : announcements.slice(0, 4).map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-blue-600">{item.author?.name || 'Dosen'}</p><span className="text-[11px] text-slate-400">{formatDate(item.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.body}</p></div>)}</div>
                            </section>
                        </section>

                        <aside className="space-y-4">
                            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Yang perlu diselesaikan</p><h3 className="mt-1 font-bold">Checklist belajar</h3><div className="mt-4 space-y-3"><ChecklistRow done={learnedCount === allMaterials.length && allMaterials.length > 0} label="Materi" detail={`${learnedCount}/${allMaterials.length} dipelajari`} onClick={() => setTab('materials')} /><ChecklistRow done={submittedAssignments.length === allAssignments.length && allAssignments.length > 0} label="Tugas" detail={`${submittedAssignments.length}/${allAssignments.length} dikumpulkan`} onClick={() => setTab('assignments')} /><ChecklistRow done={attendanceRows.length >= payload.meetings.filter((m) => m.status === 'completed').length && attendanceRows.length > 0} label="Presensi" detail={`${presentCount}/${attendanceRows.length} hadir`} onClick={() => setTab('attendance')} /></div></section>
                            {latestGrades[0] && <section className="rounded-3xl bg-[#071b56] p-5 text-white shadow-sm"><p className="text-xs font-semibold text-blue-200">Nilai terbaru</p><h3 className="mt-2 line-clamp-2 font-bold">{latestGrades[0].assignment.title}</h3><div className="mt-4 flex items-end justify-between"><div><p className="text-3xl font-extrabold">{latestGrades[0].submission?.score}</p><p className="text-xs text-blue-200">dari {latestGrades[0].assignment.max_score}</p></div><button onClick={() => setTab('grades')} className="text-sm font-semibold text-blue-100">Lihat nilai →</button></div></section>}
                        </aside>
                    </div>
                )}

                {tab === 'meetings' && (
                    <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {payload.meetings.map((meeting) => <article key={meeting.id} className={`rounded-3xl border bg-white p-5 shadow-sm ${meeting.status === 'completed' ? 'border-emerald-100' : 'border-blue-100'}`}><div className="flex items-start justify-between gap-3"><div className={`grid h-10 w-10 place-items-center rounded-2xl text-sm font-bold ${meeting.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{meeting.meeting_number}</div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${meeting.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : meeting.status === 'published' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{meeting.status === 'completed' ? 'Selesai' : meeting.status === 'published' ? 'Aktif' : 'Rencana'}</span></div><div className="mt-4 flex flex-wrap items-center gap-2">{meeting.sub_cpmk_code && <Badge>{meeting.sub_cpmk_code}</Badge>}</div><h3 className="mt-2 text-lg font-bold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{meeting.topic || meeting.material_summary || 'Belum ada ringkasan pertemuan.'}</p><div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span>{meeting.materials.length} materi</span><span>{meeting.assignments.length} tugas</span></div>{meeting.starts_at && <p className="mt-3 text-xs font-semibold text-blue-700">{formatDate(meeting.starts_at)}</p>}{meeting.learning_method && <div className="mt-4 rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Metode</p><p className="mt-1 text-sm font-semibold text-slate-700">{meeting.learning_method}</p></div>}</article>)}
                    </section>
                )}

                {tab === 'materials' && (
                    <section className="mt-5 space-y-4">
                        <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Materi Saya</p><h3 className="mt-1 text-xl font-bold">{learnedCount}/{allMaterials.length} materi dipelajari</h3></div><div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:w-64"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${allMaterials.length ? learnedCount / allMaterials.length * 100 : 0}%` }} /></div></div></div>
                        {allMaterials.length === 0 ? <Empty icon={BookOpen}>Belum ada materi yang dipublikasikan.</Empty> : allMaterials.map(({ meeting, material }) => <article key={material.id} className={`rounded-3xl border bg-white p-5 shadow-sm ${material.is_learned ? 'border-emerald-200' : 'border-blue-100'}`}><div className="flex gap-4"><button onClick={() => void toggleLearned(material)} disabled={busyId === material.id} className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${material.is_learned ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-300 hover:border-blue-400 hover:text-blue-600'}`}>{busyId === material.id ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={18} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p>{meeting.sub_cpmk_code && <Badge>{meeting.sub_cpmk_code}</Badge>}</div><h3 className="mt-1 text-lg font-bold">{material.title}</h3>{material.description && <p className="mt-2 text-sm leading-6 text-slate-500">{material.description}</p>}<div className="mt-4 flex flex-wrap items-center gap-2">{material.resource_url && <a href={material.resource_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"><Download size={14} /> Buka materi</a>}<button onClick={() => void toggleLearned(material)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${material.is_learned ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{material.is_learned ? 'Sudah dipelajari ✓' : 'Tandai selesai'}</button></div></div></div></article>)}
                    </section>
                )}

                {tab === 'assignments' && (
                    <section className="mt-5 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3"><Stat icon={Clock3} label="Belum dikumpulkan" value={String(pendingAssignments.length)} /><Stat icon={CheckCircle2} label="Sudah dikumpulkan" value={String(submittedAssignments.length)} /><Stat icon={BarChart3} label="Sudah dinilai" value={String(latestGrades.length)} /></div>
                        {allAssignments.length === 0 ? <Empty icon={ClipboardCheck}>Belum ada tugas yang dipublikasikan.</Empty> : allAssignments.map(({ meeting, assignment }) => {
                            const submission = assignment.submissions[0];
                            const draft = drafts[assignment.id] ?? { answer_text: submission?.answer_text ?? '', attachment_url: submission?.attachment_url ?? '' };
                            const submitted = Boolean(submission?.submitted_at);
                            const isClosed = assignment.status === 'closed';
                            return <article key={assignment.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p>{assignment.sub_cpmk_code && <Badge>{assignment.sub_cpmk_code}</Badge>}</div><h3 className="mt-1 text-xl font-bold">{assignment.title}</h3><p className="mt-1 text-xs text-slate-400">Batas: {formatDate(assignment.due_at)} · {timeUntil(assignment.due_at)}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${submitted ? 'bg-emerald-50 text-emerald-700' : isClosed ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{submitted ? 'Sudah dikumpulkan' : isClosed ? 'Ditutup' : 'Belum dikumpulkan'}</span></div>{assignment.instructions && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{assignment.instructions}</p>}{assignment.attachment_url && <a href={assignment.attachment_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"><Paperclip size={14} /> {assignment.attachment_name || 'Lampiran tugas'}</a>}
                                <form onSubmit={(event) => void submitAssignment(event, assignment)} className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold">Jawaban / pengumpulan Anda</p><textarea rows={4} disabled={isClosed} value={draft.answer_text} onChange={(e) => setDrafts({ ...drafts, [assignment.id]: { ...draft, answer_text: e.target.value } })} className="field" placeholder="Tulis jawaban, penjelasan, atau catatan pengumpulan…" /><label className="mt-3 block text-sm font-semibold text-slate-600">Upload file (maks. 4 MB)<input disabled={isClosed || !payload.file_upload_available} type="file" onChange={(e) => setFiles({ ...files, [assignment.id]: e.target.files?.[0] ?? null })} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700" /></label><div className="my-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau link<span className="h-px flex-1 bg-slate-200" /></div><input disabled={isClosed} value={draft.attachment_url} onChange={(e) => setDrafts({ ...drafts, [assignment.id]: { ...draft, attachment_url: e.target.value } })} className="field mt-0" placeholder="Link Drive/GitHub/file lain (opsional)" />{files[assignment.id] && <p className="mt-2 text-xs font-semibold text-blue-700">File dipilih: {files[assignment.id]?.name}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-slate-500">{submitted ? `Dikumpulkan ${formatDate(submission?.submitted_at ?? null)}` : 'Belum ada pengumpulan'}{submission?.score !== null && submission?.score !== undefined ? ` · Nilai ${submission.score}/${assignment.max_score}` : ''}</div><button disabled={isClosed || busyId === assignment.id} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === assignment.id ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}{submitted ? 'Perbarui pengumpulan' : 'Kumpulkan tugas'}</button></div>{submission?.feedback && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><strong>Feedback dosen:</strong> {submission.feedback}</div>}</form>
                            </article>;
                        })}
                    </section>
                )}

                {tab === 'attendance' && (
                    <section className="mt-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Presensi Saya</p><h3 className="mt-1 text-xl font-bold">Riwayat kehadiran</h3></div><div className="grid grid-cols-2 gap-2"><Mini value={String(presentCount)} label="Hadir" /><Mini value={String(attendanceRows.length)} label="Tercatat" /></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Pertemuan</th><th className="px-3 py-3">Topik</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Catatan</th></tr></thead><tbody>{payload.meetings.map((meeting) => { const row = meeting.attendance[0]; return <tr key={meeting.id} className="border-b border-slate-50"><td className="px-3 py-4 font-semibold">{meeting.meeting_number}</td><td className="px-3 py-4 text-slate-600">{meeting.title || meeting.topic || '—'}</td><td className="px-3 py-4">{row ? <AttendanceBadge status={row.status} /> : <span className="text-slate-400">Belum dicatat</span>}</td><td className="px-3 py-4 text-slate-500">{row?.note || '—'}</td></tr>; })}</tbody></table></div></section>
                )}

                {tab === 'grades' && (
                    <section className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Stat icon={BarChart3} label="Rata-rata nilai" value={averageScore === null ? '—' : `${averageScore}%`} /><Stat icon={CheckCircle2} label="Tugas dinilai" value={`${latestGrades.length}/${allAssignments.length}`} /><Stat icon={Target} label="Sub-CPMK tercapai" value={String(payload.obe_summary.filter((item) => item.achievement_percent !== null).length)} /></div>{latestGrades.length === 0 ? <Empty icon={BarChart3}>Belum ada tugas yang dinilai.</Empty> : latestGrades.map(({ meeting, assignment, submission }) => { const percent = Math.round(((submission?.score ?? 0) / Math.max(assignment.max_score, 1)) * 100); return <article key={assignment.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p>{assignment.sub_cpmk_code && <Badge>{assignment.sub_cpmk_code}</Badge>}</div><h3 className="mt-1 text-lg font-bold">{assignment.title}</h3>{submission?.graded_at && <p className="mt-1 text-xs text-slate-400">Dinilai {formatDate(submission.graded_at)}</p>}</div><div className="text-right"><p className="text-3xl font-extrabold text-blue-700">{submission?.score}</p><p className="text-xs text-slate-400">dari {assignment.max_score} · {percent}%</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>{submission?.feedback && <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900"><strong>Feedback dosen:</strong> {submission.feedback}</div>}</article>; })}</section>
                )}

                {tab === 'obe' && (
                    <section className="mt-5 space-y-5"><div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Target size={20} /></div><div><p className="text-xs font-bold uppercase tracking-[.13em] text-violet-600">Capaian OBE Saya</p><h3 className="mt-1 text-xl font-bold">Ketercapaian Sub-CPMK</h3></div></div><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">Capaian dihitung dari nilai tugas atau asesmen yang telah dipetakan dosen ke Sub-CPMK. Nilai ini membantu Anda melihat kompetensi mana yang sudah kuat dan mana yang masih perlu ditingkatkan.</p></div>{payload.obe_summary.length === 0 ? <Empty icon={Target}>Belum ada evidence OBE yang dapat dihitung.</Empty> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{payload.obe_summary.map((item) => <article key={item.sub_cpmk_code} className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><Badge>{item.sub_cpmk_code}</Badge><p className="text-3xl font-extrabold text-violet-700">{item.achievement_percent === null ? '—' : `${Math.round(item.achievement_percent)}%`}</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-50"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(0, Math.min(100, item.achievement_percent ?? 0))}%` }} /></div><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{item.assessment_count} asesmen</span><span>{item.graded_evidence_count} evidence dinilai</span></div></article>)}</div>}</section>
                )}
            </section>
        </main>
    );
}

function Nav({ active, icon: Icon, onClick, children }: { active: boolean; icon: IconType; onClick: () => void; children: ReactNode }) {
    return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}><Icon size={16} />{children}</button>;
}

function Stat({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
    return <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={18} /></div><strong className="text-2xl text-[#08205d]">{value}</strong></div><p className="mt-3 text-sm font-bold">{label}</p></div>;
}

function Mini({ value, label }: { value: string; label: string }) {
    return <div className="min-w-[80px] rounded-2xl bg-slate-50 px-3 py-3 text-center"><p className="text-xl font-bold text-[#08205d]">{value}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>;
}

function ChecklistRow({ done, label, detail, onClick }: { done: boolean; label: string; detail: string; onClick: () => void }) {
    return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left hover:bg-blue-50"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 ring-1 ring-slate-200'}`}><Check size={16} /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{label}</p><p className="text-xs text-slate-400">{detail}</p></div><ChevronRight size={15} className="text-slate-300" /></button>;
}

function Badge({ children }: { children: ReactNode }) {
    return <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">{children}</span>;
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
    const style = status === 'present' ? 'bg-emerald-50 text-emerald-700' : status === 'sick' ? 'bg-amber-50 text-amber-700' : status === 'excused' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700';
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{statusLabel(status)}</span>;
}

function Alert({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
    const style = kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
    return <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${style}`}>{children}</div>;
}

function Empty({ icon: Icon, children }: { icon: IconType; children: ReactNode }) {
    return <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={20} /></div><p className="mt-3 text-sm text-slate-500">{children}</p></div>;
}

const root = document.getElementById('student-classroom-app');
if (root) createRoot(root).render(<StudentClassroom />);
