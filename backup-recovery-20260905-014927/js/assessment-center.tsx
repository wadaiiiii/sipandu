import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ArrowUpRight, BookOpenCheck, CalendarClock, CheckCircle2, ClipboardCheck,
    Clock3, FileCheck2, RefreshCw, Sparkles,
} from 'lucide-react';

type Bootstrap = { user: { role: string } | null };
type Period = 'today' | '7d' | 'all';
type StudentStatus = 'all' | 'pending' | 'submitted' | 'graded' | 'late';
type LecturerStatus = 'all' | 'review' | 'ungraded' | 'graded';

type AssessmentItem = {
    id: number;
    source_type: 'assignment';
    title: string;
    sub_cpmk_code: string | null;
    class_id: number | null;
    class_name: string;
    course_code: string | null;
    meeting_number: number | null;
    due_at: string | null;
    assignment_status: 'draft' | 'published' | 'closed';
    class_url: string | null;
    student_status?: 'pending' | 'submitted' | 'graded' | 'late' | 'closed';
    submitted_at?: string | null;
    graded_at?: string | null;
    score?: number | null;
    max_score?: number;
    feedback?: string | null;
    submission_count?: number;
    ungraded_count?: number;
    graded_count?: number;
    needs_review?: boolean;
};

type Payload = {
    mode: 'student' | 'lecturer';
    items: AssessmentItem[];
    summary: Record<string, number>;
};

const OPEN_EVENT = 'sipandu:assessment-center-open';
const CLOSE_EVENT = 'sipandu:assessment-center-close';
let userRole = '';

function formatDate(value: string | null): string {
    if (!value) return 'Tanpa deadline';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function periodMatch(item: AssessmentItem, period: Period): boolean {
    if (period === 'all') return true;
    if (!item.due_at) return false;
    const due = new Date(item.due_at);
    if (Number.isNaN(due.getTime())) return false;
    const now = new Date();
    if (period === 'today') {
        return due.getFullYear() === now.getFullYear()
            && due.getMonth() === now.getMonth()
            && due.getDate() === now.getDate();
    }
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= end;
}

function studentStatusMeta(status: AssessmentItem['student_status']) {
    if (status === 'graded') return { label: 'Dinilai', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    if (status === 'submitted') return { label: 'Sudah dikumpulkan', className: 'bg-blue-50 text-blue-700 border-blue-100' };
    if (status === 'late' || status === 'closed') return { label: 'Terlambat', className: 'bg-rose-50 text-rose-700 border-rose-100' };
    return { label: 'Belum dikerjakan', className: 'bg-amber-50 text-amber-700 border-amber-100' };
}

function assignmentStatusLabel(status: AssessmentItem['assignment_status']): string {
    if (status === 'published') return 'Dibuka';
    if (status === 'closed') return 'Ditutup';
    return 'Draft';
}

function AssessmentCenter() {
    const [open, setOpen] = useState(false);
    const [payload, setPayload] = useState<Payload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState<Period>('all');
    const [studentStatus, setStudentStatus] = useState<StudentStatus>('all');
    const [lecturerStatus, setLecturerStatus] = useState<LecturerStatus>('all');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/sipandu-api/assessment-center', {
                credentials: 'include',
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Tugas dan penilaian belum dapat dimuat.');
            setPayload(await response.json() as Payload);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Tugas dan penilaian belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const show = () => {
            setOpen(true);
            void load();
        };
        const hide = () => setOpen(false);
        window.addEventListener(OPEN_EVENT, show);
        window.addEventListener(CLOSE_EVENT, hide);
        return () => {
            window.removeEventListener(OPEN_EVENT, show);
            window.removeEventListener(CLOSE_EVENT, hide);
        };
    }, []);

    const items = useMemo(() => {
        const base = (payload?.items ?? []).filter((item) => periodMatch(item, period));
        if (payload?.mode === 'student') {
            if (studentStatus === 'all') return base;
            if (studentStatus === 'late') return base.filter((item) => item.student_status === 'late' || item.student_status === 'closed');
            return base.filter((item) => item.student_status === studentStatus);
        }
        if (lecturerStatus === 'review') return base.filter((item) => item.needs_review);
        if (lecturerStatus === 'ungraded') return base.filter((item) => (item.ungraded_count ?? 0) > 0);
        if (lecturerStatus === 'graded') return base.filter((item) => (item.graded_count ?? 0) > 0);
        return base;
    }, [payload, period, studentStatus, lecturerStatus]);

    if (!open) return null;

    const student = payload?.mode === 'student';
    const summary = payload?.summary ?? {};

    return (
        <section className="fixed inset-x-0 bottom-0 top-20 z-[25] overflow-y-auto bg-[#f5f7fb] xl:left-72" aria-label="Tugas dan Penilaian">
            <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-600">Pusat Aktivitas Akademik</p>
                        <h1 className="mt-1 text-3xl font-extrabold tracking-[-.03em] text-slate-950">{student ? 'Tugas Saya' : 'Tugas & Penilaian'}</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            {student ? 'Pantau tugas dari seluruh kelas tanpa membuka kelas satu per satu.' : 'Pantau submission dan tugas yang perlu diperiksa dari seluruh kelas.'}
                        </p>
                    </div>
                    <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-11 items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {loading ? 'Memuat…' : 'Muat ulang'}
                    </button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {student ? <>
                        <SummaryCard icon={Clock3} label="Belum dikerjakan" value={summary.pending ?? 0} tone="amber" />
                        <SummaryCard icon={FileCheck2} label="Sudah dikumpulkan" value={summary.submitted ?? 0} tone="blue" />
                        <SummaryCard icon={CheckCircle2} label="Dinilai" value={summary.graded ?? 0} tone="emerald" />
                        <SummaryCard icon={CalendarClock} label="Terlambat" value={summary.late ?? 0} tone="rose" />
                    </> : <>
                        <SummaryCard icon={ClipboardCheck} label="Tugas" value={summary.assignments ?? 0} tone="blue" />
                        <SummaryCard icon={BookOpenCheck} label="Perlu diperiksa" value={summary.need_review ?? 0} tone="amber" />
                        <SummaryCard icon={Clock3} label="Belum dinilai" value={summary.ungraded ?? 0} tone="rose" />
                        <SummaryCard icon={CheckCircle2} label="Sudah dinilai" value={summary.graded ?? 0} tone="emerald" />
                    </>}
                </div>

                <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2" aria-label="Filter waktu">
                            {([['today', 'Hari ini'], ['7d', '7 hari'], ['all', 'Semua kelas']] as [Period, string][]).map(([value, label]) => (
                                <FilterButton key={value} active={period === value} onClick={() => setPeriod(value)}>{label}</FilterButton>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2" aria-label="Filter status">
                            {student ? <>
                                <FilterButton active={studentStatus === 'all'} onClick={() => setStudentStatus('all')}>Semua status</FilterButton>
                                <FilterButton active={studentStatus === 'pending'} onClick={() => setStudentStatus('pending')}>Belum dikerjakan</FilterButton>
                                <FilterButton active={studentStatus === 'submitted'} onClick={() => setStudentStatus('submitted')}>Dikumpulkan</FilterButton>
                                <FilterButton active={studentStatus === 'graded'} onClick={() => setStudentStatus('graded')}>Dinilai</FilterButton>
                                <FilterButton active={studentStatus === 'late'} onClick={() => setStudentStatus('late')}>Terlambat</FilterButton>
                            </> : <>
                                <FilterButton active={lecturerStatus === 'all'} onClick={() => setLecturerStatus('all')}>Semua status</FilterButton>
                                <FilterButton active={lecturerStatus === 'review'} onClick={() => setLecturerStatus('review')}>Perlu diperiksa</FilterButton>
                                <FilterButton active={lecturerStatus === 'ungraded'} onClick={() => setLecturerStatus('ungraded')}>Belum dinilai</FilterButton>
                                <FilterButton active={lecturerStatus === 'graded'} onClick={() => setLecturerStatus('graded')}>Sudah dinilai</FilterButton>
                            </>}
                        </div>
                    </div>
                </div>

                <div className="mt-5">
                    {loading && !payload ? <LoadingList /> : error ? (
                        <div className="rounded-[26px] border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">{error}</div>
                    ) : items.length === 0 ? (
                        <div className="rounded-[28px] border border-dashed border-blue-200 bg-white p-10 text-center">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Sparkles size={20} /></div>
                            <p className="mt-3 font-extrabold text-slate-900">Tidak ada tugas pada filter ini</p>
                            <p className="mt-1 text-sm text-slate-500">Pilih rentang waktu atau status lain untuk melihat tugas yang tersedia.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => <AssignmentRow key={item.id} item={item} student={student} />)}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function AssignmentRow({ item, student }: { item: AssessmentItem; student: boolean }) {
    const status = studentStatusMeta(item.student_status);
    return (
        <article className="group rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 uppercase tracking-wide text-blue-700">{item.course_code ?? 'KELAS'}</span>
                        {item.meeting_number && <span className="text-slate-400">Pertemuan {item.meeting_number}</span>}
                        {item.sub_cpmk_code && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">{item.sub_cpmk_code}</span>}
                    </div>
                    <h2 className="mt-2 truncate text-base font-extrabold text-slate-950 sm:text-lg">{item.title}</h2>
                    <p className="mt-1 truncate text-sm text-slate-500">{item.class_name}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} /> {formatDate(item.due_at)}</span>
                        {student ? (
                            <span className={`rounded-full border px-2.5 py-1 font-bold ${status.className}`}>{status.label}</span>
                        ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-600">{assignmentStatusLabel(item.assignment_status)}</span>
                        )}
                    </div>
                </div>

                {student ? (
                    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                        {item.student_status === 'graded' && <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-center"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Nilai</p><p className="text-lg font-extrabold text-emerald-800">{item.score ?? 0}<span className="text-xs font-semibold">/{item.max_score ?? 100}</span></p></div>}
                        {item.class_url && <a href={item.class_url} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700">Buka tugas <ArrowUpRight size={15} /></a>}
                    </div>
                ) : (
                    <div className="grid shrink-0 grid-cols-3 gap-2 sm:min-w-[320px]">
                        <MiniStat label="Submission" value={item.submission_count ?? 0} />
                        <MiniStat label="Belum dinilai" value={item.ungraded_count ?? 0} emphasis={(item.ungraded_count ?? 0) > 0} />
                        <MiniStat label="Dinilai" value={item.graded_count ?? 0} />
                        {item.class_url && <a href={item.class_url} className="col-span-3 mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-bold text-white transition hover:bg-blue-700">{item.needs_review ? 'Periksa sekarang' : 'Buka tugas'} <ArrowUpRight size={14} /></a>}
                    </div>
                )}
            </div>
        </article>
    );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Clock3; label: string; value: number; tone: 'blue' | 'amber' | 'emerald' | 'rose' }) {
    const tones = {
        blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700',
        emerald: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700',
    };
    return <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p></div><div className={`grid h-10 w-10 place-items-center rounded-2xl ${tones[tone]}`}><Icon size={18} /></div></div></article>;
}

function MiniStat({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
    return <div className={`rounded-xl px-2 py-2 text-center ${emphasis ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-700'}`}><p className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</p><p className="mt-0.5 text-lg font-extrabold">{value}</p></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return <button type="button" onClick={onClick} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>{children}</button>;
}

function LoadingList() {
    return <div className="space-y-3" role="status" aria-label="Memuat tugas dan penilaian">{[0, 1, 2].map((item) => <div key={item} className="animate-pulse rounded-[24px] border border-slate-200 bg-white p-5"><div className="h-3 w-28 rounded bg-slate-100"/><div className="mt-3 h-5 w-2/5 rounded bg-slate-100"/><div className="mt-3 h-3 w-3/5 rounded bg-slate-100"/></div>)}</div>;
}

function navLabel(role: string): string {
    return role === 'student' ? 'Tugas Saya' : 'Tugas & Penilaian';
}

function navIcon(): string {
    return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
}

function installNavButtons(): void {
    if (!userRole || !['student', 'lecturer', 'admin_prodi'].includes(userRole)) return;
    document.querySelectorAll<HTMLElement>('nav').forEach((nav) => {
        const classesButton = Array.from(nav.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim().includes('Kelas Saya'));
        if (!classesButton) return;
        const group = classesButton.parentElement;
        if (!group || group.querySelector('[data-sipandu-assessment-nav="true"]')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.sipanduAssessmentNav = 'true';
        button.className = 'group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold text-blue-50/75 transition hover:bg-white/10 hover:text-white';
        button.innerHTML = `<span class="grid h-8 w-8 place-items-center rounded-xl bg-white/5 group-hover:bg-white/10">${navIcon()}</span><span>${navLabel(userRole)}</span>`;
        button.addEventListener('click', () => {
            window.dispatchEvent(new Event(OPEN_EVENT));
            document.querySelectorAll<HTMLElement>('[data-sipandu-assessment-nav="true"]').forEach((item) => {
                item.classList.add('bg-[#1764ff]', 'text-white', 'shadow-lg', 'shadow-blue-950/25');
                item.classList.remove('text-blue-50/75');
            });
            const closeMobile = document.querySelector<HTMLButtonElement>('button[aria-label="Tutup menu"]');
            closeMobile?.click();
        });
        classesButton.insertAdjacentElement('afterend', button);
    });
}

function installCloseBridge(): void {
    document.addEventListener('click', (event) => {
        const element = event.target instanceof Element ? event.target.closest<HTMLElement>('button,a') : null;
        if (!element || element.dataset.sipanduAssessmentNav === 'true') return;
        const text = element.textContent?.trim() ?? '';
        if (!['Beranda', 'Kelas Saya', 'Pengguna'].some((label) => text === label || text.includes(label))) return;
        window.dispatchEvent(new Event(CLOSE_EVENT));
        document.querySelectorAll<HTMLElement>('[data-sipandu-assessment-nav="true"]').forEach((item) => {
            item.classList.remove('bg-[#1764ff]', 'text-white', 'shadow-lg', 'shadow-blue-950/25');
            item.classList.add('text-blue-50/75');
        });
    }, true);
}

async function bootstrap(): Promise<void> {
    try {
        const response = await fetch('/sipandu-api/bootstrap', { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!response.ok) return;
        const data = await response.json() as Bootstrap;
        userRole = data.user?.role ?? '';
        installNavButtons();
    } catch {
        // Dashboard utama tetap berjalan bila modul agregasi gagal dimuat.
    }
}

const mount = document.createElement('div');
mount.id = 'sipandu-assessment-center-root';
document.body.appendChild(mount);
createRoot(mount).render(<AssessmentCenter />);
installCloseBridge();
void bootstrap();

let navScheduled = false;
const observer = new MutationObserver(() => {
    if (navScheduled) return;
    navScheduled = true;
    window.requestAnimationFrame(() => {
        navScheduled = false;
        installNavButtons();
    });
});
observer.observe(document.body, { childList: true, subtree: true });


