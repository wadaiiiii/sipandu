import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, ChevronDown, ChevronUp, ClipboardCheck, GraduationCap } from 'lucide-react';

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
    const [progress, setProgress] = useState<DashboardPayload['progress']>(null);

    useEffect(() => {
        let active = true;

        const run = async () => {
            const bootstrap = await loadJson<BootstrapPayload>('/sipandu-api/bootstrap');
            if (!active || bootstrap?.user?.role !== 'student') return;

            const dashboard = await loadJson<DashboardPayload>('/sipandu-api/dashboard');
            if (!active || !dashboard?.progress) return;

            setProgress(dashboard.progress);
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

    if (!visible || !progress) return null;

    const headline = currentClass?.overall_percent ?? progress.overall_percent;
    const title = currentClass ? 'Progress kelas' : 'Progress belajar';

    return (
        <aside className="fixed bottom-4 right-4 z-[70] w-[min(360px,calc(100vw-2rem))] font-sans sm:bottom-6 sm:right-6">
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
                    <div className="max-h-[55vh] overflow-y-auto p-4">
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
                    </div>
                )}
            </div>
        </aside>
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

function MiniStat({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-[#f6f8fc] p-3 text-center">
            <Icon size={16} className="mx-auto text-blue-600" />
            <strong className="mt-2 block text-lg text-[#08205d]">{value}</strong>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        </div>
    );
}

const root = document.getElementById('student-progress-root');
if (root) createRoot(root).render(<StudentProgress />);
