import { sipanduUrl } from './utils/sipandu-api';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ArrowLeft, BarChart3, Bell, BookOpen, CalendarCheck, CalendarDays, Check, CheckCircle2,
    ChevronRight, ClipboardCheck, Clock3, Download, GraduationCap, Home, LoaderCircle,
    Paperclip, RefreshCw, Send, Sparkles, Target,
} from 'lucide-react';

type Tab = 'home' | 'meetings' | 'materials' | 'assignments' | 'attendance' | 'grades' | 'obe';
type AttendanceStatus = 'present' | 'sick' | 'excused' | 'absent';
type IconType = typeof Home;

type User = { id: number; name: string; email: string; role: string; identity_number?: string | null };
type Material = { id: number; title: string; description: string | null; resource_url: string | null; is_learned: boolean; learned_at: string | null };
type Submission = { id: number; answer_text: string | null; attachment_url: string | null; submitted_at: string | null; score: number | null; feedback: string | null; graded_at: string | null };
type Assignment = { id: number; title: string; instructions: string | null; attachment_url: string | null; attachment_name: string | null; sub_cpmk_code: string | null; max_score: number; due_at: string | null; status: 'draft' | 'published' | 'closed'; submissions: Submission[] };
type Attendance = { user_id: number; status: AttendanceStatus; note: string | null };
type Meeting = {
    id: number; meeting_number: number; title: string | null; topic: string | null; sub_cpmk_code: string | null;
    learning_method: string | null; material_summary: string | null; status: 'planned' | 'published' | 'completed';
    starts_at: string | null; materials: Material[]; assignments: Assignment[]; attendance: Attendance[];
};
type Obe = { sub_cpmk_code: string; achievement_percent: number | null; graded_evidence_count: number; assessment_count: number };
type Classroom = {
    class: { id: number; name: string; course: { code: string; name: string; credits: number }; academic_term: { academic_year: string; semester: string } };
    viewer_role: string; file_upload_available: boolean; obe_summary: Obe[]; meetings: Meeting[];
};
type Announcement = { id: number; body: string; created_at: string | null; author: { name: string } | null };
type ProgressClass = { class_id: number; overall_percent: number; completed_meetings: number; total_meetings: number; submitted_assignments: number; total_assignments: number; learned_materials: number; materials_available: number };
type Draft = { answer_text: string; attachment_url: string };

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
    return fetch(sipanduUrl(path), { credentials: 'include', ...init, headers });
}

async function responseError(response: Response): Promise<string> {
    try {
        const data = await response.json();
        return String(Object.values(data.errors ?? {}).flat()[0] ?? data.message ?? 'Permintaan belum berhasil.');
    } catch {
        return 'Permintaan belum berhasil.';
    }
}

function fmt(value: string | null): string {
    if (!value) return 'Belum dijadwalkan';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function dueText(value: string | null): string {
    if (!value) return 'Tanpa batas waktu';
    const hours = Math.ceil((new Date(value).getTime() - Date.now()) / 3600000);
    if (hours < 0) return 'Batas waktu lewat';
    if (hours < 24) return `${hours} jam lagi`;
    return `${Math.ceil(hours / 24)} hari lagi`;
}

function initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function StudentClassroom() {
    const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const [user, setUser] = useState<User | null>(null);
    const [room, setRoom] = useState<Classroom | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [progress, setProgress] = useState<ProgressClass | null>(null);
    const [tab, setTab] = useState<Tab>('home');
    const [busy, setBusy] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [drafts, setDrafts] = useState<Record<number, Draft>>({});
    const [files, setFiles] = useState<Record<number, File | null>>({});

    const load = async () => {
        setBusy(true);
        setError('');
        const [bootstrapRes, roomRes, announcementRes, dashboardRes] = await Promise.all([
            api('/sipandu-api/bootstrap'), api(`/sipandu-api/classes/${classId}/meetings`),
            api(`/sipandu-api/classes/${classId}/announcements`), api('/sipandu-api/dashboard'),
        ]);
        if (!bootstrapRes.ok || !roomRes.ok) {
            setError(!roomRes.ok ? await responseError(roomRes) : 'Sesi mahasiswa tidak dapat dimuat.');
            setBusy(false);
            return;
        }
        const bootstrap = await bootstrapRes.json() as { user: User | null };
        const nextRoom = await roomRes.json() as Classroom;
        if (bootstrap.user?.role !== 'student' || nextRoom.viewer_role !== 'student') {
            setBusy(false);
            return;
        }
        setUser(bootstrap.user);
        setRoom(nextRoom);
        if (announcementRes.ok) {
            const data = await announcementRes.json() as { announcements?: Announcement[] };
            setAnnouncements(data.announcements ?? []);
        }
        if (dashboardRes.ok) {
            const data = await dashboardRes.json() as { progress: { classes: ProgressClass[] } | null };
            setProgress(data.progress?.classes.find((item) => item.class_id === Number(classId)) ?? null);
        }
        setBusy(false);
    };

    useEffect(() => { void load(); }, [classId]);

    const materials = useMemo(() => room?.meetings.flatMap((meeting) => meeting.materials.map((material) => ({ meeting, material }))) ?? [], [room]);
    const assignments = useMemo(() => room?.meetings.flatMap((meeting) => meeting.assignments.map((assignment) => ({ meeting, assignment }))) ?? [], [room]);
    const submitted = useMemo(() => assignments.filter(({ assignment }) => Boolean(assignment.submissions[0]?.submitted_at)), [assignments]);
    const pending = useMemo(() => assignments.filter(({ assignment }) => assignment.status === 'published' && !assignment.submissions[0]?.submitted_at).sort((a, b) => {
        if (!a.assignment.due_at) return 1;
        if (!b.assignment.due_at) return -1;
        return new Date(a.assignment.due_at).getTime() - new Date(b.assignment.due_at).getTime();
    }), [assignments]);
    const grades = useMemo(() => assignments.map(({ meeting, assignment }) => ({ meeting, assignment, submission: assignment.submissions[0] })).filter(({ submission }) => submission?.score !== null && submission?.score !== undefined).sort((a, b) => new Date(b.submission?.graded_at ?? 0).getTime() - new Date(a.submission?.graded_at ?? 0).getTime()), [assignments]);
    const nextMeeting = useMemo(() => {
        if (!room) return null;
        const scheduled = room.meetings.filter((meeting) => meeting.status !== 'completed' && meeting.starts_at && new Date(meeting.starts_at).getTime() >= Date.now()).sort((a, b) => new Date(a.starts_at ?? '').getTime() - new Date(b.starts_at ?? '').getTime());
        return scheduled[0] ?? room.meetings.find((meeting) => meeting.status === 'published') ?? null;
    }, [room]);

    const learned = materials.filter(({ material }) => material.is_learned).length;
    const attendanceMeetings = room?.meetings.filter((meeting) => meeting.attendance.length > 0) ?? [];
    const present = attendanceMeetings.filter((meeting) => meeting.attendance[0]?.status === 'present').length;
    const average = grades.length ? Math.round(grades.reduce((sum, item) => sum + ((item.submission?.score ?? 0) / Math.max(item.assignment.max_score, 1)) * 100, 0) / grades.length) : null;

    const toggleMaterial = async (material: Material) => {
        if (!room) return;
        setBusyId(material.id);
        const response = await api(`/sipandu-api/classes/${room.class.id}/materials/${material.id}/learned`, { method: 'PUT', body: JSON.stringify({ learned: !material.is_learned }) });
        if (!response.ok) setError(await responseError(response));
        else {
            setNotice(material.is_learned ? 'Materi ditandai belum selesai.' : 'Materi selesai dipelajari.');
            await load();
            window.dispatchEvent(new Event('sipandu:progress-changed'));
        }
        setBusyId(null);
    };

    const upload = async (file: File): Promise<string | null> => {
        if (!room) return null;
        if (file.size > 4 * 1024 * 1024) {
            setError('Ukuran file maksimal 4 MB.');
            return null;
        }
        const form = new FormData();
        form.append('purpose', 'submission');
        form.append('file', file);
        const response = await api(`/sipandu-api/classes/${room.class.id}/files`, { method: 'POST', body: form });
        if (!response.ok) {
            setError(await responseError(response));
            return null;
        }
        return ((await response.json()) as { file: { url: string } }).file.url;
    };

    const submit = async (event: FormEvent, assignment: Assignment) => {
        event.preventDefault();
        if (!room) return;
        setBusyId(assignment.id);
        setError('');
        setNotice('');
        const old = assignment.submissions[0];
        const draft = drafts[assignment.id] ?? { answer_text: old?.answer_text ?? '', attachment_url: old?.attachment_url ?? '' };
        let attachmentUrl = draft.attachment_url;
        const file = files[assignment.id];
        if (file) {
            const uploaded = await upload(file);
            if (!uploaded) { setBusyId(null); return; }
            attachmentUrl = uploaded;
        }
        const response = await api(`/sipandu-api/classes/${room.class.id}/assignments/${assignment.id}/submission`, { method: 'POST', body: JSON.stringify({ answer_text: draft.answer_text || null, attachment_url: attachmentUrl || null }) });
        if (!response.ok) setError(await responseError(response));
        else {
            setNotice('Tugas berhasil dikumpulkan.');
            setFiles((current) => ({ ...current, [assignment.id]: null }));
            await load();
            window.dispatchEvent(new Event('sipandu:progress-changed'));
        }
        setBusyId(null);
    };

    if (!user || !room) return error ? <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null;

    const semester = room.class.academic_term.semester === 'ganjil' ? 'Ganjil' : 'Genap';
    const completed = room.meetings.filter((meeting) => meeting.status === 'completed').length;
    const overall = progress?.overall_percent ?? Math.round(((completed / Math.max(room.meetings.length, 1)) + (learned / Math.max(materials.length, 1)) + (submitted.length / Math.max(assignments.length, 1))) / 3 * 100);

    return <main className="min-h-screen bg-[#f5f7fb] pb-24 text-slate-950">
        <style>{`.student-field{margin-top:.375rem;width:100%;border-radius:1rem;border:1px solid #dbe3f1;background:#fff;padding:.72rem .85rem;outline:none}.student-field:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}.student-field:disabled{background:#f8fafc;color:#64748b}`}</style>
        <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1460px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3"><a href="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50"><ArrowLeft size={17} /></a><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">{room.class.course.code} - Kelas {room.class.name}</p><h1 className="truncate text-base font-bold sm:text-lg">{room.class.course.name}</h1></div></div>
                <div className="flex items-center gap-2"><a href={`/kelas/${classId}/jurnal`} className="hidden rounded-2xl border border-blue-100 px-3 py-2 text-xs font-bold text-blue-700 sm:inline-flex">Jurnal</a><button onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 text-blue-600"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} /></button><div className="grid h-10 w-10 place-items-center rounded-full bg-[#0b2d7a] text-xs font-bold text-white">{initials(user.name) || 'M'}</div></div>
            </div>
        </header>

        <section className="mx-auto max-w-[1460px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <section className="relative isolate overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,.9),transparent_28%),radial-gradient(circle_at_85%_70%,rgba(125,211,252,.32),transparent_30%),linear-gradient(135deg,#020d2f_0%,#071b56_52%,#0d48cf_100%)] px-6 py-7 text-white shadow-xl sm:px-8 sm:py-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold"><GraduationCap size={14} /> Ruang Belajar Mahasiswa</span><p className="mt-4 text-sm text-blue-100">Selamat belajar, {user.name.split(' ')[0]}.</p><h2 className="mt-1 text-3xl font-bold sm:text-4xl">{room.class.course.name}</h2><p className="mt-2 text-sm text-blue-100">Semester {semester} {room.class.academic_term.academic_year} - {room.class.course.credits} SKS</p></div><div className="min-w-[240px] rounded-3xl border border-white/15 bg-white/10 p-4"><div className="flex items-end justify-between"><div><p className="text-xs text-blue-100">Progress kelas</p><p className="mt-1 text-3xl font-extrabold">{overall}%</p></div><Sparkles size={24} /></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white" style={{ width: `${Math.max(0, Math.min(100, overall))}%` }} /></div></div></div>
            </section>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-sm"><div className="flex min-w-max gap-1"><Nav active={tab === 'home'} icon={Home} onClick={() => setTab('home')}>Beranda Kelas</Nav><Nav active={tab === 'meetings'} icon={CalendarDays} onClick={() => setTab('meetings')}>Pertemuan</Nav><Nav active={tab === 'materials'} icon={BookOpen} onClick={() => setTab('materials')}>Materi</Nav><Nav active={tab === 'assignments'} icon={ClipboardCheck} onClick={() => setTab('assignments')}>Tugas Saya</Nav><Nav active={tab === 'attendance'} icon={CalendarCheck} onClick={() => setTab('attendance')}>Presensi Saya</Nav><Nav active={tab === 'grades'} icon={BarChart3} onClick={() => setTab('grades')}>Nilai Saya</Nav><Nav active={tab === 'obe'} icon={Target} onClick={() => setTab('obe')}>Capaian OBE</Nav></div></div>
            {error && <Alert error>{error}</Alert>}{notice && <Alert>{notice}</Alert>}

            {tab === 'home' && <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]"><section className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={CalendarCheck} label="Pertemuan selesai" value={`${completed}/${room.meetings.length}`} /><Stat icon={BookOpen} label="Materi dipelajari" value={`${learned}/${materials.length}`} /><Stat icon={ClipboardCheck} label="Tugas dikumpulkan" value={`${submitted.length}/${assignments.length}`} /><Stat icon={BarChart3} label="Rata-rata nilai" value={average === null ? '-' : `${average}%`} /></div><div className="grid gap-4 lg:grid-cols-2"><HomeCard icon={CalendarDays} eyebrow="Berikutnya" title="Pertemuan selanjutnya">{nextMeeting ? <><div className="mt-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-xs font-bold text-white">{nextMeeting.meeting_number}</span>{nextMeeting.sub_cpmk_code && <Badge>{nextMeeting.sub_cpmk_code}</Badge>}</div><h4 className="mt-3 text-lg font-bold">{nextMeeting.title || `Pertemuan ${nextMeeting.meeting_number}`}</h4><p className="mt-1 text-sm leading-6 text-slate-500">{nextMeeting.topic || nextMeeting.material_summary || 'Detail pembelajaran akan ditampilkan dosen.'}</p><p className="mt-3 text-xs font-semibold text-blue-700">{fmt(nextMeeting.starts_at)}</p><button onClick={() => setTab('meetings')} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">Lihat pertemuan <ChevronRight size={15} /></button></> : <p className="mt-4 text-sm text-slate-500">Belum ada pertemuan berikutnya.</p>}</HomeCard><HomeCard icon={Clock3} eyebrow="Prioritas" title="Tugas terdekat">{pending[0] ? <><p className="mt-4 text-xs font-semibold text-blue-600">Pertemuan {pending[0].meeting.meeting_number}</p><h4 className="mt-1 text-lg font-bold">{pending[0].assignment.title}</h4><p className="mt-2 text-sm text-slate-500">{fmt(pending[0].assignment.due_at)}</p><span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{dueText(pending[0].assignment.due_at)}</span><button onClick={() => setTab('assignments')} className="mt-4 flex items-center gap-1 text-sm font-bold text-blue-700">Kerjakan sekarang <ChevronRight size={15} /></button></> : <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">Semua tugas tersedia sudah dikumpulkan.</div>}</HomeCard></div><section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Pengumuman</p><h3 className="mt-1 font-bold">Informasi terbaru</h3></div><Bell size={18} className="text-blue-600" /></div><div className="mt-4 space-y-3">{announcements.length ? announcements.slice(0, 4).map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-3 text-xs"><strong className="text-blue-600">{item.author?.name || 'Dosen'}</strong><span className="text-slate-400">{fmt(item.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.body}</p></div>) : <p className="text-sm text-slate-500">Belum ada pengumuman.</p>}</div></section></section><aside className="space-y-4"><section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Checklist belajar</p><div className="mt-4 space-y-3"><Checklist label="Materi" detail={`${learned}/${materials.length} dipelajari`} done={materials.length > 0 && learned === materials.length} onClick={() => setTab('materials')} /><Checklist label="Tugas" detail={`${submitted.length}/${assignments.length} dikumpulkan`} done={assignments.length > 0 && submitted.length === assignments.length} onClick={() => setTab('assignments')} /><Checklist label="Presensi" detail={`${present}/${attendanceMeetings.length} hadir`} done={attendanceMeetings.length > 0 && present === attendanceMeetings.length} onClick={() => setTab('attendance')} /></div></section>{grades[0] && <section className="rounded-3xl bg-[#071b56] p-5 text-white"><p className="text-xs text-blue-200">Nilai terbaru</p><h3 className="mt-2 font-bold">{grades[0].assignment.title}</h3><p className="mt-4 text-3xl font-extrabold">{grades[0].submission?.score}<span className="text-sm font-medium text-blue-200">/{grades[0].assignment.max_score}</span></p><button onClick={() => setTab('grades')} className="mt-3 text-sm font-semibold text-blue-100">Lihat nilai</button></section>}</aside></div>}

            {tab === 'meetings' && <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{room.meetings.map((meeting) => <article key={meeting.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">{meeting.meeting_number}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${meeting.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : meeting.status === 'published' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{meeting.status === 'completed' ? 'Selesai' : meeting.status === 'published' ? 'Aktif' : 'Rencana'}</span></div>{meeting.sub_cpmk_code && <div className="mt-3"><Badge>{meeting.sub_cpmk_code}</Badge></div>}<h3 className="mt-3 text-lg font-bold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{meeting.topic || meeting.material_summary || 'Belum ada ringkasan.'}</p><div className="mt-4 flex gap-3 text-xs text-slate-500"><span>{meeting.materials.length} materi</span><span>{meeting.assignments.length} tugas</span></div>{meeting.starts_at && <p className="mt-3 text-xs font-semibold text-blue-700">{fmt(meeting.starts_at)}</p>}{meeting.learning_method && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Metode: <strong>{meeting.learning_method}</strong></p>}</article>)}</section>}

            {tab === 'materials' && <section className="mt-5 space-y-4"><section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Materi Saya</p><h3 className="mt-1 text-xl font-bold">{learned}/{materials.length} selesai</h3></div><div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${materials.length ? learned / materials.length * 100 : 0}%` }} /></div></div></section>{materials.length ? materials.map(({ meeting, material }) => <article key={material.id} className={`rounded-3xl border bg-white p-5 shadow-sm ${material.is_learned ? 'border-emerald-200' : 'border-blue-100'}`}><div className="flex gap-4"><button onClick={() => void toggleMaterial(material)} disabled={busyId === material.id} className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${material.is_learned ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-300'}`}>{busyId === material.id ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={18} />}</button><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p><h3 className="mt-1 text-lg font-bold">{material.title}</h3>{material.description && <p className="mt-2 text-sm leading-6 text-slate-500">{material.description}</p>}<div className="mt-4 flex flex-wrap gap-2">{material.resource_url && <a href={material.resource_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"><Download size={14} /> Buka materi</a>}<button onClick={() => void toggleMaterial(material)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${material.is_learned ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{material.is_learned ? 'Sudah dipelajari ?' : 'Tandai selesai'}</button></div></div></div></article>) : <Empty>Belum ada materi yang dipublikasikan.</Empty>}</section>}

            {tab === 'assignments' && <section className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Stat icon={Clock3} label="Belum dikumpulkan" value={String(pending.length)} /><Stat icon={CheckCircle2} label="Sudah dikumpulkan" value={String(submitted.length)} /><Stat icon={BarChart3} label="Sudah dinilai" value={String(grades.length)} /></div>{assignments.length ? assignments.map(({ meeting, assignment }) => { const old = assignment.submissions[0]; const draft = drafts[assignment.id] ?? { answer_text: old?.answer_text ?? '', attachment_url: old?.attachment_url ?? '' }; const isSubmitted = Boolean(old?.submitted_at); const closed = assignment.status === 'closed'; return <article key={assignment.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><div className="flex items-center gap-2"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p>{assignment.sub_cpmk_code && <Badge>{assignment.sub_cpmk_code}</Badge>}</div><h3 className="mt-1 text-xl font-bold">{assignment.title}</h3><p className="mt-1 text-xs text-slate-400">{fmt(assignment.due_at)} - {dueText(assignment.due_at)}</p></div><span className={`h-fit rounded-full px-3 py-1.5 text-xs font-bold ${isSubmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{isSubmitted ? 'Sudah dikumpulkan' : closed ? 'Ditutup' : 'Belum dikumpulkan'}</span></div>{assignment.instructions && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{assignment.instructions}</p>}{assignment.attachment_url && <a href={assignment.attachment_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"><Paperclip size={14} /> {assignment.attachment_name || 'Lampiran tugas'}</a>}<form onSubmit={(event) => void submit(event, assignment)} className="mt-5 rounded-2xl bg-slate-50 p-4"><textarea disabled={closed} rows={4} value={draft.answer_text} onChange={(e) => setDrafts({ ...drafts, [assignment.id]: { ...draft, answer_text: e.target.value } })} className="student-field" placeholder="Tulis jawaban atau catatan pengumpulan..." /><label className="mt-3 block text-sm font-semibold text-slate-600">Upload file (maks. 4 MB)<input disabled={closed || !room.file_upload_available} type="file" onChange={(e) => setFiles({ ...files, [assignment.id]: e.target.files?.[0] ?? null })} className="student-field" /></label><input disabled={closed} value={draft.attachment_url} onChange={(e) => setDrafts({ ...drafts, [assignment.id]: { ...draft, attachment_url: e.target.value } })} className="student-field" placeholder="Atau tempel link tugas" />{files[assignment.id] && <p className="mt-2 text-xs font-semibold text-blue-700">{files[assignment.id]?.name}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{isSubmitted ? `Dikumpulkan ${fmt(old?.submitted_at ?? null)}` : 'Belum dikumpulkan'}{old?.score !== null && old?.score !== undefined ? `  -  Nilai ${old.score}/${assignment.max_score}` : ''}</p><button disabled={closed || busyId === assignment.id} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === assignment.id ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}{isSubmitted ? 'Perbarui' : 'Kumpulkan'}</button></div>{old?.feedback && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><strong>Feedback dosen:</strong> {old.feedback}</p>}</form></article>; }) : <Empty>Belum ada tugas.</Empty>}</section>}

            {tab === 'attendance' && <section className="mt-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">Presensi Saya</p><h3 className="mt-1 text-xl font-bold">Riwayat kehadiran</h3></div><Mini value={`${present}/${attendanceMeetings.length}`} label="Hadir" /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-3">Pertemuan</th><th className="p-3">Topik</th><th className="p-3">Status</th><th className="p-3">Catatan</th></tr></thead><tbody>{room.meetings.map((meeting) => { const row = meeting.attendance[0]; return <tr key={meeting.id} className="border-b border-slate-50"><td className="p-3 font-semibold">{meeting.meeting_number}</td><td className="p-3 text-slate-600">{meeting.title || meeting.topic || '-'}</td><td className="p-3">{row ? <AttendanceBadge status={row.status} /> : <span className="text-slate-400">Belum dicatat</span>}</td><td className="p-3 text-slate-500">{row?.note || '-'}</td></tr>; })}</tbody></table></div></section>}

            {tab === 'grades' && <section className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Stat icon={BarChart3} label="Rata-rata nilai" value={average === null ? '-' : `${average}%`} /><Stat icon={CheckCircle2} label="Tugas dinilai" value={`${grades.length}/${assignments.length}`} /><Stat icon={Target} label="Sub-CPMK dinilai" value={String(room.obe_summary.filter((item) => item.achievement_percent !== null).length)} /></div>{grades.length ? grades.map(({ meeting, assignment, submission }) => { const pct = Math.round(((submission?.score ?? 0) / Math.max(assignment.max_score, 1)) * 100); return <article key={assignment.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex justify-between gap-4"><div><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p><h3 className="mt-1 text-lg font-bold">{assignment.title}</h3>{assignment.sub_cpmk_code && <div className="mt-2"><Badge>{assignment.sub_cpmk_code}</Badge></div>}</div><div className="text-right"><p className="text-3xl font-extrabold text-blue-700">{submission?.score}</p><p className="text-xs text-slate-400">/{assignment.max_score} - {pct}%</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>{submission?.feedback && <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900"><strong>Feedback:</strong> {submission.feedback}</p>}</article>; }) : <Empty>Belum ada tugas yang dinilai.</Empty>}</section>}

            {tab === 'obe' && <section className="mt-5 space-y-5"><section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Target size={20} /></div><div><p className="text-xs font-bold uppercase tracking-[.13em] text-violet-600">Capaian OBE Saya</p><h3 className="mt-1 text-xl font-bold">Ketercapaian Sub-CPMK</h3></div></div><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">Capaian dihitung dari asesmen yang telah dipetakan dosen ke Sub-CPMK dan sudah diberi nilai.</p></section>{room.obe_summary.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{room.obe_summary.map((item) => <article key={item.sub_cpmk_code} className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><Badge>{item.sub_cpmk_code}</Badge><p className="text-3xl font-extrabold text-violet-700">{item.achievement_percent === null ? '-' : `${Math.round(item.achievement_percent)}%`}</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-50"><div className="h-full bg-violet-600" style={{ width: `${Math.max(0, Math.min(100, item.achievement_percent ?? 0))}%` }} /></div><p className="mt-4 text-xs text-slate-500">{item.assessment_count} asesmen - {item.graded_evidence_count} evidence dinilai</p></article>)}</div> : <Empty>Belum ada evidence OBE yang dapat dihitung.</Empty>}</section>}
        </section>
    </main>;
}

function Nav({ active, icon: Icon, onClick, children }: { active: boolean; icon: IconType; onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}><Icon size={16} />{children}</button>; }
function Stat({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) { return <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={18} /></div><strong className="text-2xl text-[#08205d]">{value}</strong></div><p className="mt-3 text-sm font-bold">{label}</p></div>; }
function Mini({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center"><p className="text-xl font-bold text-[#08205d]">{value}</p><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p></div>; }
function HomeCard({ icon: Icon, eyebrow, title, children }: { icon: IconType; eyebrow: string; title: string; children: ReactNode }) { return <article className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={18} /></div><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-600">{eyebrow}</p><h3 className="font-bold">{title}</h3></div></div>{children}</article>; }
function Checklist({ label, detail, done, onClick }: { label: string; detail: string; done: boolean; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left"><div className={`grid h-9 w-9 place-items-center rounded-xl ${done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 ring-1 ring-slate-200'}`}><Check size={16} /></div><div className="flex-1"><p className="text-sm font-bold">{label}</p><p className="text-xs text-slate-400">{detail}</p></div><ChevronRight size={15} className="text-slate-300" /></button>; }
function Badge({ children }: { children: ReactNode }) { return <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">{children}</span>; }
function AttendanceBadge({ status }: { status: AttendanceStatus }) { const labels: Record<AttendanceStatus, string> = { present: 'Hadir', sick: 'Sakit', excused: 'Izin', absent: 'Alpa' }; const style = status === 'present' ? 'bg-emerald-50 text-emerald-700' : status === 'sick' ? 'bg-amber-50 text-amber-700' : status === 'excused' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{labels[status]}</span>; }
function Alert({ error = false, children }: { error?: boolean; children: ReactNode }) { return <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{children}</div>; }
function Empty({ children }: { children: ReactNode }) { return <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center"><BookOpen size={20} className="mx-auto text-blue-600" /><p className="mt-3 text-sm text-slate-500">{children}</p></div>; }

const root = document.getElementById('student-classroom-app');
if (root) createRoot(root).render(<StudentClassroom />);






