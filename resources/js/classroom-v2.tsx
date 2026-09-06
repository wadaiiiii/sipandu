import { sipanduUrl } from './utils/sipandu-api';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ArrowLeft,
    BarChart3,
    BookOpen,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Download,
    FileText,
    GraduationCap,
    Megaphone,
    Paperclip,
    Plus,
    RefreshCw,
    Save,
    Send,
    Target,
    Trash2,
    UserPlus,
    Users,
    Upload,
} from 'lucide-react';
import { parseSiakadRoster, type SiakadRosterRow } from './lib/siakad-roster';

type AttendanceStatus = 'present' | 'sick' | 'excused' | 'absent';
type MainTab = 'home' | 'meetings' | 'materials' | 'assignments' | 'attendance' | 'grades' | 'people' | 'obe';

type StudentRef = {
    id: number;
    name: string;
    email: string;
    identity_number: string | null;
};

type Material = {
    id: number;
    title: string;
    resource_type: 'link' | 'document' | 'video' | 'reading' | 'other';
    description: string | null;
    resource_url: string | null;
    is_published: boolean;
    is_learned?: boolean;
    learned_at?: string | null;
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
    attachment_url: string | null;
    attachment_name: string | null;
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

type AttendanceRow = {
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
    attendance: AttendanceRow[];
    attendance_summary: Record<AttendanceStatus, number>;
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
        rps_source_type?: string;
        rps_source_label?: string;
    };
    viewer_role: 'admin_prodi' | 'lecturer' | 'student' | 'upm';
    can_edit: boolean;
    file_upload_available: boolean;
    students: StudentRef[];
    obe_summary: ObeSummary[];
    meetings: Meeting[];
};

type Member = {
    id: number;
    membership_role: 'lecturer' | 'student';
    status: string;
    user: StudentRef;
};

type Announcement = {
    id: number;
    body: string;
    is_pinned: boolean;
    created_at: string | null;
    author: { id: number; name: string; email: string } | null;
};

type UploadedFileResult = {
    id: number;
    name: string;
    mime_type: string | null;
    size_bytes: number;
    url: string;
};

type ClassListItem = { id: number; members: Member[] };
type GeneratedCredential = SiakadRosterRow & { password: string };

type MaterialForm = {
    title: string;
    resource_type: Material['resource_type'];
    description: string;
    resource_url: string;
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

type AttendanceDraft = Record<number, { status: AttendanceStatus; note: string }>;

type IconType = typeof FileText;

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
        if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
    }

    return fetch(sipanduUrl(path), { credentials: 'include', ...init, headers });
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

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attendanceLabel(status: AttendanceStatus): string {
    return ({ present: 'Hadir', sick: 'Sakit', excused: 'Izin', absent: 'Alpa' })[status];
}

function Classroom() {
    const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const [payload, setPayload] = useState<ClassroomPayload | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [tab, setTab] = useState<MainTab>('home');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [targetMeetingId, setTargetMeetingId] = useState<number | null>(null);
    const [attendanceMeetingId, setAttendanceMeetingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Meeting | null>(null);
    const [attendanceDraft, setAttendanceDraft] = useState<AttendanceDraft>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [announcementBody, setAnnouncementBody] = useState('');
    const [participantEmail, setParticipantEmail] = useState('');
    const [lecturerEmail, setLecturerEmail] = useState('');
    const [rosterRows, setRosterRows] = useState<SiakadRosterRow[]>([]);
    const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredential[]>([]);
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
    const [submissionFiles, setSubmissionFiles] = useState<Record<number, File | null>>({});
    const [materialForm, setMaterialForm] = useState<MaterialForm>({ title: '', resource_type: 'link', description: '', resource_url: '' });
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({ title: '', instructions: '', sub_cpmk_code: '', weight_percent: '0', max_score: '100', due_at: '', status: 'published' });
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

    const attendanceMeeting = useMemo(
        () => payload?.meetings.find((meeting) => meeting.id === attendanceMeetingId) ?? payload?.meetings[0] ?? null,
        [payload, attendanceMeetingId],
    );

    const allMaterials = useMemo(
        () => payload?.meetings.flatMap((meeting) => meeting.materials.map((material) => ({ meeting, material }))) ?? [],
        [payload],
    );

    const allAssignments = useMemo(
        () => payload?.meetings.flatMap((meeting) => meeting.assignments.map((assignment) => ({ meeting, assignment }))) ?? [],
        [payload],
    );

    const lecturers = useMemo(() => members.filter((member) => member.status === 'active' && member.membership_role === 'lecturer'), [members]);
    const students = useMemo(() => members.filter((member) => member.status === 'active' && member.membership_role === 'student'), [members]);

    const upcoming = useMemo(
        () => allAssignments
            .filter(({ assignment }) => assignment.status === 'published' && assignment.due_at)
            .sort((a, b) => new Date(a.assignment.due_at ?? '').getTime() - new Date(b.assignment.due_at ?? '').getTime())
            .slice(0, 4),
        [allAssignments],
    );

    const load = async () => {
        setBusy(true);
        setError('');

        const roomResponse = await api(`/sipandu-api/classes/${classId}/meetings`);
        if (!roomResponse.ok) {
            setError(await responseError(roomResponse));
            setBusy(false);
            return;
        }

        const nextPayload = (await roomResponse.json()) as ClassroomPayload;
        setPayload(nextPayload);
        setSelectedId((current) => current ?? nextPayload.meetings[0]?.id ?? null);
        setTargetMeetingId((current) => current ?? nextPayload.meetings[0]?.id ?? null);
        setAttendanceMeetingId((current) => current ?? nextPayload.meetings[0]?.id ?? null);

        const [classesResponse, announcementsResponse] = await Promise.all([
            api('/sipandu-api/classes'),
            api(`/sipandu-api/classes/${classId}/announcements`),
        ]);

        if (classesResponse.ok) {
            const classList = (await classesResponse.json()) as { classes?: ClassListItem[] };
            const currentClass = classList.classes?.find((item) => item.id === Number(classId));
            setMembers(currentClass?.members ?? []);
        }

        if (announcementsResponse.ok) {
            const announcementPayload = (await announcementsResponse.json()) as { announcements?: Announcement[] };
            setAnnouncements(announcementPayload.announcements ?? []);
        }

        setBusy(false);
    };

    useEffect(() => { void load(); }, [classId]);
    useEffect(() => { setDraft(selected ? { ...selected } : null); }, [selected]);

    useEffect(() => {
        if (!attendanceMeeting || !payload) return;
        const next: AttendanceDraft = {};
        payload.students.forEach((student) => {
            const current = attendanceMeeting.attendance.find((row) => row.user_id === student.id);
            next[student.id] = { status: current?.status ?? 'present', note: current?.note ?? '' };
        });
        setAttendanceDraft(next);
    }, [attendanceMeeting?.id, payload?.students.length]);

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
        return true;
    };

    const uploadFile = async (file: File, purpose: 'material' | 'assignment' | 'submission'): Promise<UploadedFileResult | null> => {
        if (file.size > 4 * 1024 * 1024) {
            setError('Ukuran file maksimal 4 MB untuk versi SiPANDU saat ini.');
            return null;
        }
        setBusy(true);
        setError('');
        const form = new FormData();
        form.append('purpose', purpose);
        form.append('file', file);
        const response = await api(`/sipandu-api/classes/${classId}/files`, { method: 'POST', body: form });
        if (!response.ok) {
            setError(await responseError(response));
            setBusy(false);
            return null;
        }
        const result = (await response.json()) as { file: UploadedFileResult };
        setBusy(false);
        return result.file;
    };

    const postAnnouncement = async (event: FormEvent) => {
        event.preventDefault();
        const body = announcementBody.trim();
        if (!body || !payload?.can_edit) return;
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/announcements`, { method: 'POST', body: JSON.stringify({ body }) }),
            'Pengumuman dipublikasikan.',
        );
        if (ok) setAnnouncementBody('');
    };

    const deleteAnnouncement = async (announcement: Announcement) => {
        if (!payload?.can_edit) return;
        await mutate(
            () => api(`/sipandu-api/classes/${classId}/announcements/${announcement.id}`, { method: 'DELETE' }),
            'Pengumuman dihapus.',
        );
    };

    const saveMeeting = async () => {
        if (!draft || !payload?.can_edit) return;
        await mutate(
            () => api(`/sipandu-api/classes/${classId}/meetings/${draft.id}`, {
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
            `Pertemuan ${draft.meeting_number} disimpan.`,
        );
    };

    const addMaterial = async (event: FormEvent) => {
        event.preventDefault();
        if (!targetMeeting || !payload?.can_edit) return;
        let resourceUrl = materialForm.resource_url || null;
        let resourceType = materialForm.resource_type;
        if (materialFile) {
            const uploaded = await uploadFile(materialFile, 'material');
            if (!uploaded) return;
            resourceUrl = uploaded.url;
            resourceType = 'document';
        }
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/meetings/${targetMeeting.id}/materials`, {
                method: 'POST',
                body: JSON.stringify({ title: materialForm.title, resource_type: resourceType, description: materialForm.description || null, resource_url: resourceUrl, is_published: true }),
            }),
            materialFile ? 'File materi berhasil diunggah dan dipublikasikan.' : 'Materi ditambahkan.',
        );
        if (ok) {
            setMaterialForm({ title: '', resource_type: 'link', description: '', resource_url: '' });
            setMaterialFile(null);
        }
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
        let attachmentUrl: string | null = null;
        let attachmentName: string | null = null;
        if (assignmentFile) {
            const uploaded = await uploadFile(assignmentFile, 'assignment');
            if (!uploaded) return;
            attachmentUrl = uploaded.url;
            attachmentName = uploaded.name;
        }
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/meetings/${targetMeeting.id}/assignments`, {
                method: 'POST',
                body: JSON.stringify({
                    title: assignmentForm.title,
                    instructions: assignmentForm.instructions || null,
                    attachment_url: attachmentUrl,
                    attachment_name: attachmentName,
                    sub_cpmk_code: assignmentForm.sub_cpmk_code || null,
                    weight_percent: Number(assignmentForm.weight_percent || 0),
                    max_score: Number(assignmentForm.max_score || 100),
                    due_at: assignmentForm.due_at || null,
                    status: assignmentForm.status,
                }),
            }),
            'Tugas ditambahkan.',
        );
        if (ok) {
            setAssignmentForm({ title: '', instructions: '', sub_cpmk_code: '', weight_percent: '0', max_score: '100', due_at: '', status: 'published' });
            setAssignmentFile(null);
        }
    };

    const submitAssignment = async (assignment: Assignment) => {
        const currentSubmission = assignment.submissions[0];
        const form = submissionDrafts[assignment.id] ?? { answer_text: currentSubmission?.answer_text ?? '', attachment_url: currentSubmission?.attachment_url ?? '' };
        let attachmentUrl = form.attachment_url;
        const selectedFile = submissionFiles[assignment.id];
        if (selectedFile) {
            const uploaded = await uploadFile(selectedFile, 'submission');
            if (!uploaded) return;
            attachmentUrl = uploaded.url;
        }
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/assignments/${assignment.id}/submission`, {
                method: 'POST', body: JSON.stringify({ answer_text: form.answer_text, attachment_url: attachmentUrl || null }),
            }),
            'Tugas berhasil dikumpulkan.',
        );
        if (ok) setSubmissionFiles((current) => ({ ...current, [assignment.id]: null }));
    };

    const gradeSubmission = async (assignment: Assignment, submission: Submission) => {
        const form = gradeDrafts[submission.id] ?? { score: submission.score?.toString() ?? '', feedback: submission.feedback ?? '' };
        await mutate(
            () => api(`/sipandu-api/classes/${classId}/assignments/${assignment.id}/submissions/${submission.id}/grade`, {
                method: 'PATCH', body: JSON.stringify({ score: Number(form.score), feedback: form.feedback || null }),
            }),
            'Nilai disimpan.',
        );
    };

    const saveAttendance = async () => {
        if (!attendanceMeeting || !payload?.can_edit) return;
        const records = payload.students.map((student) => ({ user_id: student.id, status: attendanceDraft[student.id]?.status ?? 'present', note: attendanceDraft[student.id]?.note || null }));
        if (!records.length) {
            setError('Belum ada mahasiswa aktif pada kelas ini.');
            return;
        }
        await mutate(
            () => api(`/sipandu-api/classes/${classId}/meetings/${attendanceMeeting.id}/attendance`, { method: 'PUT', body: JSON.stringify({ records }) }),
            `Presensi pertemuan ${attendanceMeeting.meeting_number} disimpan.`,
        );
    };

    const addParticipant = async (event: FormEvent) => {
        event.preventDefault();
        const email = participantEmail.trim();
        if (!email || !payload?.can_edit) return;
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/participants`, { method: 'POST', body: JSON.stringify({ email }) }),
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

    const addLecturer = async (event: FormEvent) => {
        event.preventDefault();
        const email = lecturerEmail.trim();
        if (!email || !payload?.can_edit) return;
        const ok = await mutate(
            () => api(`/sipandu-api/classes/${classId}/lecturers`, { method: 'POST', body: JSON.stringify({ email }) }),
            'Dosen partner ditambahkan ke kelas.',
        );
        if (ok) setLecturerEmail('');
    };

    const removeLecturer = async (member: Member) => {
        if (!payload?.can_edit || member.membership_role !== 'lecturer') return;
        await mutate(
            () => api(`/sipandu-api/classes/${classId}/lecturers/${member.user.id}`, { method: 'DELETE' }),
            'Dosen partner dikeluarkan dari kelas.',
        );
    };

    const readRosterPdf = async (file: File | null) => {
        if (!file) return;
        setBusy(true);
        setError('');
        setGeneratedCredentials([]);
        try {
            const rows = await parseSiakadRoster(file);
            if (!rows.length) throw new Error('Nama dan NIM tidak ditemukan. Gunakan PDF Daftar Hadir Kuliah dari SIAKAD UNSULBAR.');
            setRosterRows(rows);
            setNotice(`${rows.length} mahasiswa terbaca dari PDF. Periksa lalu klik Impor mahasiswa.`);
        } catch (reason) {
            setRosterRows([]);
            setError(reason instanceof Error ? reason.message : 'PDF tidak dapat dibaca.');
        } finally {
            setBusy(false);
        }
    };

    const importRoster = async () => {
        if (!rosterRows.length || !payload?.can_edit) return;
        setBusy(true);
        setError('');
        const response = await api(`/sipandu-api/classes/${classId}/student-roster`, {
            method: 'POST', body: JSON.stringify({ students: rosterRows }),
        });
        if (!response.ok) {
            setError(await responseError(response));
            setBusy(false);
            return;
        }
        const result = await response.json() as { message: string; credentials: GeneratedCredential[] };
        setGeneratedCredentials(result.credentials ?? []);
        setRosterRows([]);
        setNotice(result.message);
        await load();
    };

    const downloadCredentials = () => {
        if (!generatedCredentials.length) return;
        const csv = ['NIM,Nama,Password', ...generatedCredentials.map((row) =>
            [row.nim, row.name, row.password].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','),
        )].join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        link.download = `akun-mahasiswa-kelas-${classId}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    if (!payload && busy) return <div className="grid min-h-screen place-items-center bg-[#f4f7ff] text-sm font-semibold text-slate-500">Memuat ruang kelas·</div>;
    if (!payload) return <div className="grid min-h-screen place-items-center bg-[#f4f7ff] px-6 text-center text-sm text-rose-600">{error || 'Kelas tidak dapat dimuat.'}</div>;

    const isStudent = payload.viewer_role === 'student';
    const semesterLabel = payload.class.academic_term.semester === 'ganjil' ? 'Ganjil' : 'Genap';
    const completedMeetings = payload.meetings.filter((meeting) => meeting.status === 'completed').length;
    const activityMeetings = payload.meetings.filter((meeting) => meeting.status !== 'planned' || meeting.materials.length || meeting.assignments.length).slice().reverse().slice(0, 8);
    const gradedAssignments = allAssignments.filter(({ assignment }) => assignment.graded_count > 0).length;
    const mappedObeAssignments = allAssignments.filter(({ assignment }) => Boolean(assignment.sub_cpmk_code)).length;

    return (
        <main className="min-h-screen bg-[#f4f7ff] text-slate-950">
            <style>{`.field{margin-top:.375rem;width:100%;border-radius:1rem;border:1px solid #dbe3f1;background:#fff;padding:.72rem .85rem;outline:none;transition:.18s}.field:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}.field:disabled{background:#f8fafc;color:#64748b}`}</style>

            <header className="sticky top-0 z-30 border-b border-blue-100/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <a href={sipanduUrl("/")} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><ArrowLeft size={17} /></a>
                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold uppercase tracking-[.16em] text-blue-600">{payload.class.course.code} · {payload.class.course.credits} SKS</p>
                            <h1 className="truncate text-lg font-bold">{payload.class.course.name} · Kelas {payload.class.name}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={sipanduUrl(`/kelas/${classId}/jurnal`)} className="hidden rounded-2xl border border-blue-100 bg-white px-3.5 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50 sm:inline-flex">Jurnal Kelas</a>
                        <button onClick={() => void load()} disabled={busy} className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-600 transition hover:bg-blue-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} /></button>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <section className="relative isolate overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,.9),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(147,197,253,.35),transparent_28%),linear-gradient(135deg,#020d2f_0%,#071b56_52%,#0d48cf_100%)] px-6 py-7 text-white shadow-2xl shadow-blue-950/10 sm:px-8 sm:py-9">
                    <div className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
                    <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">SiPANDU · Ruang Kelas</span>
                            <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{payload.class.course.name}</h2>
                            <p className="mt-2 text-sm text-blue-100">Kelas {payload.class.name} · {semesterLabel} {payload.class.academic_term.academic_year}</p>
                            {payload.class.rps_source_label && <p className="mt-2 text-xs text-blue-200">Sumber RPS: {payload.class.rps_source_label}</p>}
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            <HeroStat label="Pertemuan" value={`${completedMeetings}/16`} />
                            <HeroStat label="Materi" value={String(allMaterials.length)} />
                            <HeroStat label="Tugas" value={String(allAssignments.length)} />
                            <HeroStat label="OBE" value={String(payload.obe_summary.length)} />
                        </div>
                    </div>
                </section>

                

                <div className="mt-5 overflow-x-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-sm">
                    <div className="flex min-w-max gap-1">
                        <TopTab active={tab === 'home'} onClick={() => setTab('home')} icon={GraduationCap}>Beranda Kelas</TopTab>
                        <TopTab active={tab === 'meetings'} onClick={() => setTab('meetings')} icon={CalendarDays}>Pertemuan</TopTab>
                        <TopTab active={tab === 'materials'} onClick={() => setTab('materials')} icon={BookOpen}>Materi</TopTab>
                        <TopTab active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={ClipboardList}>Tugas</TopTab>
                        <TopTab active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={CalendarCheck}>Presensi</TopTab>
                        <TopTab active={tab === 'grades'} onClick={() => setTab('grades')} icon={BarChart3}>Nilai</TopTab>
                        <TopTab active={tab === 'people'} onClick={() => setTab('people')} icon={Users}>Peserta</TopTab>
                        <TopTab active={tab === 'obe'} onClick={() => setTab('obe')} icon={Target}>OBE</TopTab>
                    </div>
                </div>

                {error && <Alert kind="error">{error}</Alert>}
                {notice && <Alert kind="success">{notice}</Alert>}

                {tab === 'home' && (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <section className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <SummaryCard icon={CalendarCheck} label="Pertemuan selesai" value={`${completedMeetings}/16`} hint="rekam pembelajaran" />
                                <SummaryCard icon={BookOpen} label="Materi tersedia" value={String(allMaterials.length)} hint="sumber belajar" />
                                <SummaryCard icon={BarChart3} label="Asesmen dinilai" value={`${gradedAssignments}/${allAssignments.length}`} hint="tugas dengan nilai" />
                                <SummaryCard icon={Target} label="Evidence OBE" value={`${mappedObeAssignments}/${allAssignments.length}`} hint="tugas terpetakan" />
                            </div>

                            {payload.can_edit && (
                                <form onSubmit={postAnnouncement} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                                    <div className="flex gap-4">
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white"><Megaphone size={19} /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold">Bagikan pengumuman ke kelas</p>
                                            <textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} rows={3} className="field resize-none" placeholder="Tulis pengumuman atau informasi kuliah·" />
                                            <div className="mt-3 flex justify-end"><button disabled={busy || !announcementBody.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={15} /> Publikasikan</button></div>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {announcements.map((announcement) => (
                                <article key={announcement.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                                    <div className="flex gap-4">
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white">{initials(announcement.author?.name || 'SiPANDU') || 'SP'}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div><p className="font-bold">{announcement.author?.name || 'Pengajar'}</p><p className="mt-0.5 text-xs text-slate-400">{formatDate(announcement.created_at)}</p></div>
                                                {payload.can_edit && <button onClick={() => void deleteAnnouncement(announcement)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>}
                                            </div>
                                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{announcement.body}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}

                            {activityMeetings.map((meeting) => (
                                <article key={meeting.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                    <div className="flex gap-4">
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">{meeting.meeting_number}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</h3>{meeting.sub_cpmk_code && <ObeBadge>{meeting.sub_cpmk_code}</ObeBadge>}</div>
                                            {meeting.topic && <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{meeting.topic}</p>}
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span>{meeting.materials.length} materi</span><span>·</span><span>{meeting.assignments.length} tugas</span>{meeting.starts_at && <><span>·</span><span>{formatDate(meeting.starts_at)}</span></>}</div>
                                            <button onClick={() => { setSelectedId(meeting.id); setTab('meetings'); }} className="mt-3 text-sm font-semibold text-blue-700">Buka pertemuan ?</button>
                                        </div>
                                    </div>
                                </article>
                            ))}

                            {!announcements.length && !activityMeetings.length && <EmptyState icon={Megaphone} text="Belum ada pengumuman atau aktivitas kelas." />}
                        </section>

                        <aside className="space-y-4">
                            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Yang akan datang</p>
                                <h3 className="mt-1 font-bold">Batas waktu tugas</h3>
                                <div className="mt-4 space-y-3">
                                    {upcoming.length === 0 ? <p className="text-sm text-slate-500">Belum ada tugas dengan batas waktu.</p> : upcoming.map(({ meeting, assignment }) => (
                                        <button key={assignment.id} onClick={() => setTab('assignments')} className="block w-full rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-blue-50"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p><p className="mt-1 text-sm font-bold">{assignment.title}</p><p className="mt-1 text-xs text-slate-500">{formatDate(assignment.due_at)}</p></button>
                                    ))}
                                </div>
                            </section>
                            <section className="rounded-3xl bg-[#071b56] p-5 text-white shadow-sm"><p className="text-xs font-semibold text-blue-200">Peserta aktif</p><p className="mt-2 text-3xl font-bold">{students.length}</p><button onClick={() => setTab('people')} className="mt-3 text-sm font-semibold text-blue-100">Lihat peserta ?</button></section>
                        </aside>
                    </div>
                )}

                {tab === 'meetings' && (
                    <div className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                        <aside className="self-start rounded-3xl border border-blue-100 bg-white p-3 shadow-sm lg:sticky lg:top-24">
                            <p className="px-3 py-2 text-xs font-bold uppercase tracking-[.14em] text-blue-600">Pertemuan 1·16</p>
                            <div className="max-h-[70vh] space-y-1 overflow-y-auto">
                                {payload.meetings.map((meeting) => (
                                    <button key={meeting.id} onClick={() => setSelectedId(meeting.id)} className={`w-full rounded-2xl px-3 py-3 text-left transition ${selected?.id === meeting.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-blue-50'}`}>
                                        <div className="flex items-center gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${selected?.id === meeting.id ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-700'}`}>{meeting.meeting_number}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{meeting.title || `Pertemuan ${meeting.meeting_number}`}</p><p className={`mt-0.5 text-[11px] ${selected?.id === meeting.id ? 'text-blue-100' : 'text-slate-400'}`}>{meeting.status === 'completed' ? 'Selesai' : meeting.status === 'published' ? 'Terbit' : 'Rencana'}</p></div></div>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {draft && (
                            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                                <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Pertemuan {draft.meeting_number}</p><h3 className="mt-1 text-xl font-bold">Detail pertemuan</h3></div>{payload.can_edit && <button onClick={() => void saveMeeting()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Save size={15} /> Simpan</button>}</div>
                                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                    <Field label="Judul"><input disabled={!payload.can_edit} value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="field" /></Field>
                                    <Field label="Jadwal"><input disabled={!payload.can_edit} type="datetime-local" value={draft.starts_at ?? ''} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} className="field" /></Field>
                                    <Field label="Sub-CPMK"><input disabled={!payload.can_edit} value={draft.sub_cpmk_code ?? ''} onChange={(e) => setDraft({ ...draft, sub_cpmk_code: e.target.value })} className="field" placeholder="Contoh: Sub-CPMK 1.1" /></Field>
                                    <Field label="Status"><select disabled={!payload.can_edit} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Meeting['status'] })} className="field"><option value="planned">Rencana</option><option value="published">Terbit</option><option value="completed">Selesai</option></select></Field>
                                    <Field label="Metode pembelajaran"><input disabled={!payload.can_edit} value={draft.learning_method ?? ''} onChange={(e) => setDraft({ ...draft, learning_method: e.target.value })} className="field" /></Field>
                                    <Field label="Topik"><textarea disabled={!payload.can_edit} rows={3} value={draft.topic ?? ''} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} className="field" /></Field>
                                </div>
                                <Field label="Aktivitas pembelajaran"><textarea disabled={!payload.can_edit} rows={4} value={draft.learning_activity ?? ''} onChange={(e) => setDraft({ ...draft, learning_activity: e.target.value })} className="field" /></Field>
                                <Field label="Ringkasan materi"><textarea disabled={!payload.can_edit} rows={4} value={draft.material_summary ?? ''} onChange={(e) => setDraft({ ...draft, material_summary: e.target.value })} className="field" /></Field>
                                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                                    <MiniInfo label="Materi" value={String(draft.materials.length)} />
                                    <MiniInfo label="Tugas" value={String(draft.assignments.length)} />
                                    <MiniInfo label="Hadir" value={String(draft.attendance_summary?.present ?? 0)} />
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {tab === 'materials' && (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[370px_minmax(0,1fr)]">
                        {payload.can_edit && (
                            <form onSubmit={addMaterial} className="self-start rounded-3xl border border-blue-100 bg-white p-5 shadow-sm xl:sticky xl:top-24">
                                <h3 className="font-bold">Tambah materi</h3>
                                <p className="mt-1 text-sm text-slate-500">Materi otomatis terhubung dengan pertemuan yang dipilih.</p>
                                <Field label="Pertemuan"><select value={targetMeetingId ?? ''} onChange={(e) => setTargetMeetingId(Number(e.target.value))} className="field">{payload.meetings.map((meeting) => <option key={meeting.id} value={meeting.id}>Pertemuan {meeting.meeting_number}</option>)}</select></Field>
                                <Field label="Judul"><input required value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} className="field" /></Field>
                                <Field label="Jenis"><select value={materialForm.resource_type} onChange={(e) => setMaterialForm({ ...materialForm, resource_type: e.target.value as Material['resource_type'] })} className="field"><option value="link">Link</option><option value="document">Dokumen</option><option value="video">Video</option><option value="reading">Bacaan</option><option value="other">Lainnya</option></select></Field>
                                <Field label="Deskripsi"><textarea rows={3} value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} className="field" /></Field>
                                <Field label="Link materi"><input value={materialForm.resource_url} onChange={(e) => setMaterialForm({ ...materialForm, resource_url: e.target.value })} className="field" placeholder="https://·" /></Field>
                                <Field label="Atau upload file (maks. 4 MB)"><input disabled={!payload.file_upload_available} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.webp" onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700" /></Field>
                                {materialFile && <FileChip file={materialFile} />}
                                <button disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15} /> Tambah materi</button>
                            </form>
                        )}
                        <section className="space-y-4">
                            {allMaterials.length === 0 && <EmptyState icon={BookOpen} text="Belum ada materi kelas." />}
                            {allMaterials.map(({ meeting, material }) => (
                                <article key={material.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><BookOpen size={19} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p>{meeting.sub_cpmk_code && <ObeBadge>{meeting.sub_cpmk_code}</ObeBadge>}</div><h3 className="mt-1 text-lg font-bold">{material.title}</h3>{material.description && <p className="mt-2 text-sm leading-6 text-slate-600">{material.description}</p>}<div className="mt-4 flex flex-wrap gap-2">{material.resource_url && <a href={material.resource_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"><Download size={14} /> Buka materi</a>}{isStudent && material.is_learned && <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} /> Sudah dipelajari</span>}{payload.can_edit && <button onClick={() => void removeMaterial(meeting.id, material)} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600"><Trash2 size={14} /> Hapus</button>}</div></div></div>
                                </article>
                            ))}
                        </section>
                    </div>
                )}

                {tab === 'assignments' && (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
                        {payload.can_edit && (
                            <form onSubmit={addAssignment} className="self-start rounded-3xl border border-blue-100 bg-white p-5 shadow-sm xl:sticky xl:top-24">
                                <h3 className="font-bold">Buat tugas / asesmen</h3>
                                <p className="mt-1 text-sm text-slate-500">Sub-CPMK dan bobot akan menjadi evidence OBE.</p>
                                <Field label="Pertemuan"><select value={targetMeetingId ?? ''} onChange={(e) => setTargetMeetingId(Number(e.target.value))} className="field">{payload.meetings.map((meeting) => <option key={meeting.id} value={meeting.id}>Pertemuan {meeting.meeting_number}</option>)}</select></Field>
                                <Field label="Judul"><input required value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} className="field" /></Field>
                                <Field label="Petunjuk"><textarea rows={3} value={assignmentForm.instructions} onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })} className="field" /></Field>
                                <div className="grid grid-cols-2 gap-3"><Field label="Sub-CPMK"><input value={assignmentForm.sub_cpmk_code} onChange={(e) => setAssignmentForm({ ...assignmentForm, sub_cpmk_code: e.target.value })} className="field" placeholder="Sub-CPMK 1.1" /></Field><Field label="Bobot (%)"><input type="number" min="0" max="100" step="0.01" value={assignmentForm.weight_percent} onChange={(e) => setAssignmentForm({ ...assignmentForm, weight_percent: e.target.value })} className="field" /></Field></div>
                                <Field label="Lampiran dosen (maks. 4 MB)"><input disabled={!payload.file_upload_available} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.webp" onChange={(e) => setAssignmentFile(e.target.files?.[0] ?? null)} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700" /></Field>
                                {assignmentFile && <FileChip file={assignmentFile} />}
                                <div className="grid grid-cols-2 gap-3"><Field label="Nilai maksimal"><input type="number" min="1" value={assignmentForm.max_score} onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: e.target.value })} className="field" /></Field><Field label="Status"><select value={assignmentForm.status} onChange={(e) => setAssignmentForm({ ...assignmentForm, status: e.target.value as Assignment['status'] })} className="field"><option value="published">Dibuka</option><option value="draft">Draft</option><option value="closed">Ditutup</option></select></Field></div>
                                <Field label="Batas waktu"><input type="datetime-local" value={assignmentForm.due_at} onChange={(e) => setAssignmentForm({ ...assignmentForm, due_at: e.target.value })} className="field" /></Field>
                                <button disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15} /> {busy ? 'Memproses·' : 'Buat tugas'}</button>
                            </form>
                        )}
                        <section className="space-y-4">
                            {allAssignments.length === 0 && <EmptyState icon={ClipboardList} text="Belum ada tugas kelas." />}
                            {allAssignments.map(({ meeting, assignment }) => {
                                const ownSubmission = isStudent ? assignment.submissions[0] : null;
                                const submissionDraft = submissionDrafts[assignment.id] ?? { answer_text: ownSubmission?.answer_text ?? '', attachment_url: ownSubmission?.attachment_url ?? '' };
                                const selectedSubmissionFile = submissionFiles[assignment.id];
                                return (
                                    <article key={assignment.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                                        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p>{assignment.sub_cpmk_code && <ObeBadge>{assignment.sub_cpmk_code}</ObeBadge>}</div><h3 className="mt-1 text-lg font-bold">{assignment.title}</h3><p className="mt-1 text-xs text-slate-400">Batas waktu: {formatDate(assignment.due_at)}</p></div><div className="text-right"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Maks. {assignment.max_score}</span>{assignment.weight_percent > 0 && <p className="mt-2 text-xs font-semibold text-violet-600">Bobot OBE {assignment.weight_percent}%</p>}</div></div>
                                        {assignment.instructions && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{assignment.instructions}</p>}
                                        {assignment.attachment_url && <a href={assignment.attachment_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"><Paperclip size={14} /> {assignment.attachment_name || 'Lampiran tugas'}</a>}

                                        {isStudent && assignment.status !== 'draft' && (
                                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                                <p className="text-sm font-bold">Pengumpulan Anda</p>
                                                <textarea rows={4} className="field" value={submissionDraft.answer_text} onChange={(e) => setSubmissionDrafts({ ...submissionDrafts, [assignment.id]: { ...submissionDraft, answer_text: e.target.value } })} placeholder="Tulis jawaban atau catatan·" />
                                                <Field label="Upload file (maks. 4 MB)"><input disabled={!payload.file_upload_available} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.webp" onChange={(e) => setSubmissionFiles({ ...submissionFiles, [assignment.id]: e.target.files?.[0] ?? null })} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700" /></Field>
                                                {selectedSubmissionFile && <FileChip file={selectedSubmissionFile} />}
                                                <div className="my-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau link<span className="h-px flex-1 bg-slate-200" /></div>
                                                <input className="field mt-0" value={submissionDraft.attachment_url} onChange={(e) => setSubmissionDrafts({ ...submissionDrafts, [assignment.id]: { ...submissionDraft, attachment_url: e.target.value } })} placeholder="Link file/tugas (opsional)" />
                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-slate-500">{ownSubmission?.submitted_at ? `Dikumpulkan ${formatDate(ownSubmission.submitted_at)}` : 'Belum dikumpulkan'}{ownSubmission?.score !== null && ownSubmission?.score !== undefined ? ` · Nilai ${ownSubmission.score}/${assignment.max_score}` : ''}</div><button onClick={() => void submitAssignment(assignment)} disabled={busy || assignment.status === 'closed'} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={14} /> Kumpulkan</button></div>
                                                {ownSubmission?.feedback && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><strong>Feedback:</strong> {ownSubmission.feedback}</div>}
                                            </div>
                                        )}

                                        {!isStudent && (
                                            <div className="mt-5 border-t border-slate-100 pt-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">Pengumpulan mahasiswa <span className="text-slate-400">({assignment.submission_count})</span></p>{assignment.average_achievement_percent !== null && <span className="text-xs font-semibold text-emerald-700">Rerata capaian {assignment.average_achievement_percent}%</span>}</div>
                                                <div className="mt-3 space-y-3">
                                                    {assignment.submissions.length === 0 && <p className="text-sm text-slate-500">Belum ada pengumpulan.</p>}
                                                    {assignment.submissions.map((submission) => {
                                                        const grade = gradeDrafts[submission.id] ?? { score: submission.score?.toString() ?? '', feedback: submission.feedback ?? '' };
                                                        return <div key={submission.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold">{submission.student_name || 'Mahasiswa'}</p><p className="text-xs text-slate-400">{submission.student_identity_number || ''} · {formatDate(submission.submitted_at)}</p></div>{submission.attachment_url && <a href={submission.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-700"><Download size={13} /> Buka file</a>}</div>{submission.answer_text && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{submission.answer_text}</p>}{payload.can_edit && <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr_auto]"><input type="number" min="0" max={assignment.max_score} value={grade.score} onChange={(e) => setGradeDrafts({ ...gradeDrafts, [submission.id]: { ...grade, score: e.target.value } })} className="field mt-0" placeholder="Nilai" /><input value={grade.feedback} onChange={(e) => setGradeDrafts({ ...gradeDrafts, [submission.id]: { ...grade, feedback: e.target.value } })} className="field mt-0" placeholder="Feedback" /><button onClick={() => void gradeSubmission(assignment, submission)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Simpan</button></div>}</div>;
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </section>
                    </div>
                )}

                {tab === 'attendance' && (
                    <section className="mt-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Presensi</p><h3 className="mt-1 text-xl font-bold">Kehadiran per pertemuan</h3><p className="mt-1 text-sm text-slate-500">Hadir, sakit, izin, dan alpa tercatat sebagai bukti pelaksanaan pembelajaran.</p></div>
                            {!isStudent && <div className="w-full sm:w-64"><label className="text-xs font-semibold text-slate-500">Pilih pertemuan</label><select value={attendanceMeetingId ?? ''} onChange={(e) => setAttendanceMeetingId(Number(e.target.value))} className="field"><option value="">Pilih</option>{payload.meetings.map((meeting) => <option key={meeting.id} value={meeting.id}>Pertemuan {meeting.meeting_number}</option>)}</select></div>}
                        </div>

                        {isStudent ? (
                            <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Pertemuan</th><th className="px-3 py-3">Topik</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Catatan</th></tr></thead><tbody>{payload.meetings.map((meeting) => { const row = meeting.attendance[0]; return <tr key={meeting.id} className="border-b border-slate-50"><td className="px-3 py-3 font-semibold">{meeting.meeting_number}</td><td className="px-3 py-3 text-slate-600">{meeting.title || meeting.topic || '·'}</td><td className="px-3 py-3">{row ? <AttendanceBadge status={row.status} /> : <span className="text-slate-400">Belum dicatat</span>}</td><td className="px-3 py-3 text-slate-500">{row?.note || '·'}</td></tr>; })}</tbody></table></div>
                        ) : attendanceMeeting ? (
                            <>
                                <div className="mt-5 grid grid-cols-4 gap-2 sm:max-w-xl"><MiniInfo label="Hadir" value={String(attendanceMeeting.attendance_summary?.present ?? 0)} /><MiniInfo label="Sakit" value={String(attendanceMeeting.attendance_summary?.sick ?? 0)} /><MiniInfo label="Izin" value={String(attendanceMeeting.attendance_summary?.excused ?? 0)} /><MiniInfo label="Alpa" value={String(attendanceMeeting.attendance_summary?.absent ?? 0)} /></div>
                                <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Mahasiswa</th><th className="px-3 py-3">NIM</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Catatan</th></tr></thead><tbody>{payload.students.map((student) => { const row = attendanceDraft[student.id] ?? { status: 'present' as AttendanceStatus, note: '' }; return <tr key={student.id} className="border-b border-slate-50"><td className="px-3 py-3 font-semibold">{student.name}</td><td className="px-3 py-3 text-slate-500">{student.identity_number || '·'}</td><td className="px-3 py-3"><select disabled={!payload.can_edit} value={row.status} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, [student.id]: { ...row, status: e.target.value as AttendanceStatus } })} className="field mt-0 min-w-32"><option value="present">Hadir</option><option value="sick">Sakit</option><option value="excused">Izin</option><option value="absent">Alpa</option></select></td><td className="px-3 py-3"><input disabled={!payload.can_edit} value={row.note} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, [student.id]: { ...row, note: e.target.value } })} className="field mt-0" placeholder="Opsional" /></td></tr>; })}</tbody></table></div>
                                {payload.can_edit && <div className="mt-5 flex justify-end"><button onClick={() => void saveAttendance()} disabled={busy || !payload.students.length} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} /> Simpan presensi</button></div>}
                            </>
                        ) : <EmptyState icon={CalendarCheck} text="Pilih pertemuan untuk melihat presensi." />}
                    </section>
                )}

                {tab === 'grades' && (
                    <section className="mt-5 space-y-5">
                        <div className="grid gap-3 sm:grid-cols-3"><SummaryCard icon={ClipboardList} label="Total asesmen" value={String(allAssignments.length)} hint="tugas/asesmen kelas" /><SummaryCard icon={CheckCircle2} label="Sudah dinilai" value={String(gradedAssignments)} hint="memiliki nilai" /><SummaryCard icon={Target} label="Terpetakan OBE" value={String(mappedObeAssignments)} hint="memiliki Sub-CPMK" /></div>
                        {allAssignments.length === 0 ? <EmptyState icon={BarChart3} text="Belum ada asesmen untuk dinilai." /> : allAssignments.map(({ meeting, assignment }) => {
                            const ownSubmission = isStudent ? assignment.submissions[0] : null;
                            return <article key={assignment.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-blue-600">Pertemuan {meeting.meeting_number}</p>{assignment.sub_cpmk_code && <ObeBadge>{assignment.sub_cpmk_code}</ObeBadge>}</div><h3 className="mt-1 font-bold">{assignment.title}</h3></div>{isStudent ? <div className="text-right"><p className="text-2xl font-bold text-blue-700">{ownSubmission?.score ?? '·'}</p><p className="text-xs text-slate-400">dari {assignment.max_score}</p></div> : <div className="text-right"><p className="text-2xl font-bold text-blue-700">{assignment.average_achievement_percent ?? '·'}{assignment.average_achievement_percent !== null ? '%' : ''}</p><p className="text-xs text-slate-400">rerata capaian · {assignment.graded_count}/{assignment.submission_count} dinilai</p></div>}</div>{isStudent && ownSubmission?.feedback && <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm text-blue-800"><strong>Feedback:</strong> {ownSubmission.feedback}</div>}</article>;
                        })}
                    </section>
                )}

                {tab === 'people' && (
                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white"><Users size={18} /></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Team teaching</p><h3 className="font-bold">Dosen kelas</h3></div></div>{payload.can_edit && <form onSubmit={addLecturer} className="mt-4 flex gap-2"><input type="email" required value={lecturerEmail} onChange={(e) => setLecturerEmail(e.target.value)} className="field mt-0" placeholder="email dosen partner" /><button disabled={busy} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"><UserPlus size={15} /> Tambah</button></form>}<div className="mt-5 space-y-3">{lecturers.length === 0 && <p className="text-sm text-slate-500">Belum ada dosen pada kelas.</p>}{lecturers.map((member) => <PersonRow key={member.id} member={member} action={payload.can_edit && lecturers.length > 1 ? <button onClick={() => void removeLecturer(member)} className="rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Keluarkan</button> : undefined} />)}</div></section>
                        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Mahasiswa</p><h3 className="font-bold">{students.length} peserta aktif</h3></div>{payload.can_edit && <><form onSubmit={addParticipant} className="mt-4 flex gap-2"><input type="email" required value={participantEmail} onChange={(e) => setParticipantEmail(e.target.value)} className="field mt-0" placeholder="email mahasiswa" /><button disabled={busy} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"><UserPlus size={15} /> Tambah</button></form><div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4"><p className="text-sm font-bold text-slate-800">Impor PDF SIAKAD</p><p className="mt-1 text-xs leading-5 text-slate-500">Hanya Nama dan NIM yang dibaca di browser. PDF tidak diunggah ke server.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm"><Upload size={15} /> Pilih PDF<input type="file" accept="application/pdf" className="hidden" onChange={(event) => void readRosterPdf(event.target.files?.[0] ?? null)} /></label>{rosterRows.length > 0 && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"><span><strong>{rosterRows.length}</strong> mahasiswa siap diimpor</span><button type="button" disabled={busy} onClick={() => void importRoster()} className="rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white">Impor mahasiswa</button></div>}{generatedCredentials.length > 0 && <button type="button" onClick={downloadCredentials} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900"><Download size={15} /> Unduh {generatedCredentials.length} akun baru</button>}</div></>}<div className="mt-5 space-y-3">{students.length === 0 && <p className="text-sm text-slate-500">Belum ada mahasiswa di kelas.</p>}{students.map((member) => <PersonRow key={member.id} member={member} action={payload.can_edit ? <button onClick={() => void removeParticipant(member)} className="rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Keluarkan</button> : undefined} />)}</div></section>
                    </div>
                )}

                {tab === 'obe' && (
                    <section className="mt-5 space-y-5">
                        <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-violet-600">Outcome-Based Education</p><h3 className="mt-1 text-xl font-bold">Evidence ketercapaian Sub-CPMK</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Nilai dihitung dari asesmen yang memiliki kode Sub-CPMK. Bobot tugas digunakan bila diisi; jika nol, sistem tetap menghitung evidence dengan bobot setara.</p></div><div className="grid grid-cols-2 gap-2"><MiniInfo label="Sub-CPMK" value={String(payload.obe_summary.length)} /><MiniInfo label="Evidence" value={String(payload.obe_summary.reduce((sum, item) => sum + item.graded_evidence_count, 0))} /></div></div></div>

                        {payload.obe_summary.length === 0 ? <EmptyState icon={Target} text="Belum ada evidence OBE. Isi Sub-CPMK pada tugas/asesmen lalu berikan nilai." /> : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{payload.obe_summary.map((item) => <article key={item.sub_cpmk_code} className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><ObeBadge>{item.sub_cpmk_code}</ObeBadge><p className="mt-3 text-sm text-slate-500">{item.assessment_count} asesmen · {item.graded_evidence_count} evidence dinilai</p></div><div className="text-right"><p className="text-3xl font-bold text-violet-700">{item.achievement_percent === null ? '·' : `${item.achievement_percent}%`}</p><p className="text-xs text-slate-400">ketercapaian</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-50"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(0, Math.min(100, item.achievement_percent ?? 0))}%` }} /></div></article>)}</div>
                        )}

                        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-bold">Pemetaan pertemuan dan asesmen</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Pertemuan</th><th className="px-3 py-3">Sub-CPMK</th><th className="px-3 py-3">Asesmen</th><th className="px-3 py-3">Bobot</th><th className="px-3 py-3">Capaian</th></tr></thead><tbody>{payload.meetings.flatMap((meeting) => meeting.assignments.length ? meeting.assignments.map((assignment) => <tr key={`${meeting.id}-${assignment.id}`} className="border-b border-slate-50"><td className="px-3 py-3 font-semibold">{meeting.meeting_number}</td><td className="px-3 py-3">{assignment.sub_cpmk_code ? <ObeBadge>{assignment.sub_cpmk_code}</ObeBadge> : <span className="text-amber-600">Belum dipetakan</span>}</td><td className="px-3 py-3 text-slate-700">{assignment.title}</td><td className="px-3 py-3 text-slate-500">{assignment.weight_percent > 0 ? `${assignment.weight_percent}%` : 'Setara'}</td><td className="px-3 py-3 font-semibold text-slate-700">{assignment.average_achievement_percent === null ? '·' : `${assignment.average_achievement_percent}%`}</td></tr>) : [<tr key={`empty-${meeting.id}`} className="border-b border-slate-50"><td className="px-3 py-3 font-semibold">{meeting.meeting_number}</td><td className="px-3 py-3">{meeting.sub_cpmk_code ? <ObeBadge>{meeting.sub_cpmk_code}</ObeBadge> : <span className="text-slate-400">·</span>}</td><td className="px-3 py-3 text-slate-400">Belum ada asesmen</td><td className="px-3 py-3">·</td><td className="px-3 py-3">·</td></tr>])}</tbody></table></div></section>
                    </section>
                )}
            </section>
        </main>
    );
}

function TopTab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: IconType; children: string }) {
    return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}><Icon size={16} />{children}</button>;
}

function HeroStat({ label, value }: { label: string; value: string }) {
    return <div className="min-w-[76px] rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur"><p className="text-xl font-bold">{value}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-100">{label}</p></div>;
}

function SummaryCard({ icon: Icon, label, value, hint }: { icon: IconType; label: string; value: string; hint: string }) {
    return <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={18} /></div><strong className="text-2xl text-[#08205d]">{value}</strong></div><p className="mt-3 text-sm font-bold">{label}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>;
}

function MiniInfo({ label, value }: { label: string; value: string }) {
    return <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center"><p className="text-lg font-bold text-[#08205d]">{value}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="mt-4 block text-sm font-semibold text-slate-700">{label}{children}</label>;
}

function FileChip({ file }: { file: File }) {
    return <div className="mt-2 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800"><Paperclip size={13} /><span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span><span className="shrink-0 text-blue-500">{formatBytes(file.size)}</span></div>;
}

function EmptyState({ icon: Icon, text }: { icon: IconType; text: string }) {
    return <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={20} /></div><p className="mt-3 text-sm text-slate-500">{text}</p></div>;
}

function Alert({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
    const style = kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
    return <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${style}`}>{children}</div>;
}

function PersonRow({ member, action }: { member: Member; action?: React.ReactNode }) {
    return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials(member.user.name) || 'U'}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{member.user.name}</p><p className="truncate text-xs text-slate-400">{member.user.identity_number || member.user.email}</p></div>{action}</div>;
}

function ObeBadge({ children }: { children: React.ReactNode }) {
    return <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">{children}</span>;
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
    const style = status === 'present' ? 'bg-emerald-50 text-emerald-700' : status === 'sick' ? 'bg-amber-50 text-amber-700' : status === 'excused' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700';
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{attendanceLabel(status)}</span>;
}

createRoot(document.getElementById('classroom-app')!).render(<Classroom />);

















