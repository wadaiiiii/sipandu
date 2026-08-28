import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ClipboardCheck,
    Clock3,
    GraduationCap,
    Sparkles,
    TrendingUp,
} from 'lucide-react';

type BootstrapPayload = {
    user: { id: number; role: string } | null;
};

type ProgressClass = {
    class_id: number;
    class_name: string;
    class_url: string;
    overall_percent: number;
    completed_meetings: number;
    total_meetings: number;
    submitted_assignments: number;
    total_assignments: number;
    learned_materials: number;
    materials_available: number;
};

type DashboardPayload = {
    progress: {
        overall_percent: number;
        classes: ProgressClass[];
    } | null;
};

type PerformanceClass = {
    class_id: number;
    class_name: string;
    class_url: string | null;
    average_score_percent: number | null;
    submitted_assignments: number;
    total_assignments: number;
    graded_assignments: number;
};

type RecentGrade = {
    assignment_id: number;
    title: string;
    class_name: string;
    class_url: string | null;
    score: number | null;
    max_score: number;
    percent: number | null;
    feedback: string | null;
    graded_at: string | null;
};

type PerformancePayload = {
    summary: {
        average_score_percent: number | null;
        submitted_assignments: number;
        total_assignments: number;
        pending_assignments: number;
        graded_assignments: number;
        completion_rate_percent: number;
        on_time_submissions: number;
        late_submissions: number;
        active_days_30: number;
    };
    recent_grades: RecentGrade[];
    classes: PerformanceClass[];
    note: string;
};

type InsightTab = 'progress' | 'performance';

async function loadJson<T>(url: string): Promise<T | null> {
    try {
        const response = await fetch(url, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return null;
        return await response.json() as T;
    } catch {
        return null;
    }
}

function StudentProgress() {
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [tab, setTab] = useState<InsightTab>('progress');
    const [progress, setProgress] = useState<DashboardPayload['progress']>(null);
    const [performance, setPerformance] = useState<PerformancePayload | null>(null);

    useEffect(() => {
        let active = true;

        const run = async () => {
            const bootstrap = await loadJson<BootstrapPayload>('/sipandu-api/bootstrap');
            if (!active || bootstrap?.user?.role !== 'student') return;

            const [dashboard, performancePayload] = await Promise.all([
                loadJson<DashboardPayload>('/sipandu-api/dashboard'),
                loadJson<PerformancePayload>('/sipandu-api/student/performance'),
            ]);

            if (!active || !dashboard?.progress) return;

            setProgress(dashboard.progress);
            setPerformance(performancePayload);
            setVisible(true);
        };

        const refresh = () => { void run(); };
        window.addEventListener('sipandu:progress-changed', refresh);
        void run();

        return () => {
            active = false;
            window.removeEventListener('sipandu:progress-changed', refresh);
        };
    }, []);

    const classId = useMemo(() => {
        const match = window.location.pathname.match(/^\/kelas\/(\d+)/);
        return match ? Number(match[1]) : null;
    }, []);

    const currentClass = useMemo(
        () => classId ? progress?.classes.find((item) => item.class_id === classId) ?? null : null,
        [classId, progress],
    );

    const currentPerformance = useMemo(
        () => classId ? performance?.classes.find((item) => item.class_id === classId) ?? null : null,
        [classId, performance],
    );

    if (!visible || !progress) return null;

    const headline = currentClass?.overall_percent ?? progress.overall_percent;
    const title = currentClass ? 'Insight kelas' : 'Insight belajar';

    return (
        <aside className="fixed bottom-4 right-4 z-[70] w-[min(390px,calc(100vw-2rem))] font-sans sm:bottom-6 sm:right-6">
            <div className="overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-2xl shadow-blue-950/15">
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="flex w-full items-center gap-3 bg-[linear-gradient(135deg,#03122f_0%,#0b2d7a_58%,#1764ff_100%)] px-4 py-3.5 text-left text-white"
                >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15">
                        <GraduationCap size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-100/70">{title}</p>
                        <div className="mt-0.5 flex items-baseline gap-2">
                            <strong className="text-2xl font-extrabold">{headline}%</strong>
                            <span className="truncate text-xs text-blue-100/75">{currentClass?.class_name ?? 'Semua kelas aktif'}</span>
                        </div>
                    </div>
                    {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>

                <div className="h-1.5 bg-blue-50">
                    <div className="h-full rounded-r-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, headline))}%` }} />
                </div>

                {expanded && (
                    <div className="max-h-[68vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-1 border-b border-slate-100 bg-slate-50 p-1.5">
                            <TabButton active={tab === 'progress'} onClick={() => setTab('progress')} icon={GraduationCap}>Progress</TabButton>
                            <TabButton active={tab === 'performance'} onClick={() => setTab('performance')} icon={TrendingUp}>Performa</TabButton>
                        </div>

                        <div className="p-4">
                            {tab === 'progress' ? (
                                <ProgressView progress={progress} currentClass={currentClass} />
                            ) : (
                                <PerformanceView performance={performance} currentClass={currentPerformance} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

function ProgressView({ progress, currentClass }: { progress: NonNullable<DashboardPayload['progress']>; currentClass: ProgressClass | null }) {
    return (
        <>
            {currentClass ? (
                <ProgressDetail item={currentClass} />
            ) : (
                <div className="space-y-3">
                    {progress.classes.length === 0 ? (
                        <p className="text-sm text-slate-500">Belum ada kelas aktif untuk dihitung.</p>
                    ) : progress.classes.map((item) => (
                        <a key={item.class_id} href={item.class_url} className="block rounded-2xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40">
                            <div className="flex items-center justify-between gap-3">
                                <p className="min-w-0 truncate text-sm font-bold text-slate-900">{item.class_name}</p>
                                <span className="text-sm font-extrabold text-blue-700">{item.overall_percent}%</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.overall_percent}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{item.completed_meetings}/{item.total_meetings} pertemuan · {item.learned_materials}/{item.materials_available} materi · {item.submitted_assignments}/{item.total_assignments} tugas</p>
                        </a>
                    ))}
                </div>
            )}

            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-400">
                Persentase dihitung dari pertemuan yang telah selesai, materi yang Anda tandai sudah dipelajari, dan tugas yang sudah dikumpulkan.
            </p>
        </>
    );
}

function PerformanceView({ performance, currentClass }: { performance: PerformancePayload | null; currentClass: PerformanceClass | null }) {
    if (!performance) {
        return <p className="text-sm text-slate-500">Data performa belum dapat dimuat.</p>;
    }

    const summary = performance.summary;

    return (
        <div>
            {currentClass && (
                <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-600">Kelas saat ini</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900">{currentClass.class_name}</p>
                    <p className="mt-1 text-xs text-slate-500">Rata-rata nilai: <strong className="text-blue-700">{currentClass.average_score_percent === null ? 'Belum ada' : `${currentClass.average_score_percent}%`}</strong> · {currentClass.submitted_assignments}/{currentClass.total_assignments} tugas dikumpulkan</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2">
                <InsightStat icon={Sparkles} label="Rata-rata nilai" value={summary.average_score_percent === null ? '—' : `${summary.average_score_percent}%`} />
                <InsightStat icon={CheckCircle2} label="Tugas selesai" value={`${summary.submitted_assignments}/${summary.total_assignments}`} />
                <InsightStat icon={Clock3} label="Tepat waktu" value={String(summary.on_time_submissions)} />
                <InsightStat icon={TrendingUp} label="Hari aktif / 30" value={String(summary.active_days_30)} />
            </div>

            <div className="mt-4 rounded-2xl bg-[#f6f8fc] p-3">
                <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-500">Penyelesaian tugas</span><strong className="text-blue-700">{summary.completion_rate_percent}%</strong></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-blue-600" style={{ width: `${summary.completion_rate_percent}%` }} /></div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400"><span>{summary.pending_assignments} belum selesai</span><span>{summary.graded_assignments} sudah dinilai</span>{summary.late_submissions > 0 && <span>{summary.late_submissions} terlambat</span>}</div>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Nilai terbaru</p><span className="text-[10px] text-slate-400">Maks. 5</span></div>
                <div className="mt-2 space-y-2">
                    {performance.recent_grades.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">Belum ada tugas yang dinilai.</p>
                    ) : performance.recent_grades.map((grade) => (
                        <a key={grade.assignment_id} href={grade.class_url ?? '#'} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-xs font-extrabold text-emerald-700">{grade.percent === null ? '—' : Math.round(grade.percent)}</div>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{grade.title}</p><p className="mt-0.5 truncate text-xs text-slate-400">{grade.class_name}</p>{grade.feedback && <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">Feedback: {grade.feedback}</p>}</div>
                        </a>
                    ))}
                </div>
            </div>

            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-400">{performance.note}</p>
        </div>
    );
}

function ProgressDetail({ item }: { item: ProgressClass }) {
    return (
        <div>
            <div className="grid grid-cols-3 gap-2">
                <MiniStat icon={GraduationCap} label="Pertemuan" value={`${item.completed_meetings}/${item.total_meetings}`} />
                <MiniStat icon={BookOpen} label="Materi" value={`${item.learned_materials}/${item.materials_available}`} />
                <MiniStat icon={ClipboardCheck} label="Tugas" value={`${item.submitted_assignments}/${item.total_assignments}`} />
            </div>
            <a href={item.class_url} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
                Lanjutkan kelas
            </a>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof GraduationCap; children: React.ReactNode }) {
    return <button type="button" onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-blue-700'}`}><Icon size={14} />{children}</button>;
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-[#f6f8fc] p-3 text-center">
            <Icon size={16} className="mx-auto text-blue-600" />
            <strong className="mt-2 block text-lg text-[#08205d]">{value}</strong>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        </div>
    );
}

function InsightStat({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-100 p-3">
            <Icon size={15} className="text-blue-600" />
            <strong className="mt-2 block text-xl text-[#08205d]">{value}</strong>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        </div>
    );
}

const root = document.getElementById('student-progress-root');
if (root) createRoot(root).render(<StudentProgress />);
