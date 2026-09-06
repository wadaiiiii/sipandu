import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpenCheck, Check, ChevronDown, ChevronUp, ExternalLink, LoaderCircle } from 'lucide-react';

type BootstrapPayload = {
    user: { id: number; role: string } | null;
};

type Material = {
    id: number;
    title: string;
    resource_url: string | null;
    is_learned: boolean;
    learned_at: string | null;
};

type Meeting = {
    id: number;
    meeting_number: number;
    materials: Material[];
};

type ClassroomPayload = {
    viewer_role: string;
    class: {
        id: number;
        course: { name: string };
    };
    meetings: Meeting[];
};

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

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

function StudentMaterialChecklist() {
    const classId = useMemo(() => {
        const match = window.location.pathname.match(/\/kelas\/(\d+)(?:\/|$)/);
        return match ? Number(match[1]) : null;
    }, []);
    const [payload, setPayload] = useState<ClassroomPayload | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!classId) return;
        let active = true;

        const run = async () => {
            const bootstrap = await loadJson<BootstrapPayload>('/api/bootstrap');
            if (!active || bootstrap?.user?.role !== 'student') return;

            const room = await loadJson<ClassroomPayload>(`/api/classes/${classId}/meetings`);
            if (!active || room?.viewer_role !== 'student') return;
            setPayload(room);
        };

        void run();
        return () => { active = false; };
    }, [classId]);

    const rows = useMemo(
        () => payload?.meetings.flatMap((meeting) => meeting.materials.map((material) => ({ meeting, material }))) ?? [],
        [payload],
    );
    const learnedCount = rows.filter(({ material }) => material.is_learned).length;

    if (!payload || rows.length === 0) return null;

    const toggle = async (material: Material) => {
        setBusyId(material.id);
        setError('');

        try {
            const response = await fetch(`/api/classes/${payload.class.id}/materials/${material.id}/learned`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                },
                body: JSON.stringify({ learned: !material.is_learned }),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                setError(result.message ?? 'Status materi belum dapat disimpan.');
                return;
            }

            const result = await response.json() as { learned: boolean; learned_at: string | null };
            setPayload((current) => current ? {
                ...current,
                meetings: current.meetings.map((meeting) => ({
                    ...meeting,
                    materials: meeting.materials.map((item) => item.id === material.id
                        ? { ...item, is_learned: result.learned, learned_at: result.learned_at }
                        : item),
                })),
            } : current);
            window.dispatchEvent(new Event('sipandu:progress-changed'));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <aside className="fixed right-4 top-24 z-[65] w-[min(340px,calc(100vw-2rem))] font-sans sm:right-6">
            <div className="overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-xl shadow-blue-950/10">
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-blue-50/50"
                >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <BookOpenCheck size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-blue-600">Checklist Materi</p>
                        <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{learnedCount}/{rows.length} sudah dipelajari</p>
                    </div>
                    {expanded ? <ChevronUp size={17} className="text-slate-400" /> : <ChevronDown size={17} className="text-slate-400" />}
                </button>

                <div className="h-1.5 bg-slate-100">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${rows.length ? Math.round((learnedCount / rows.length) * 100) : 0}%` }} />
                </div>

                {expanded && (
                    <div className="max-h-[58vh] overflow-y-auto border-t border-slate-100 p-3">
                        <p className="px-1 pb-3 text-xs leading-5 text-slate-500">Tandai materi setelah Anda benar-benar selesai membaca, menonton, atau mempelajarinya.</p>
                        {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
                        <div className="space-y-2">
                            {rows.map(({ meeting, material }) => (
                                <div key={material.id} className={`rounded-2xl border p-3 transition ${material.is_learned ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex items-start gap-3">
                                        <button
                                            type="button"
                                            disabled={busyId === material.id}
                                            onClick={() => void toggle(material)}
                                            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition ${material.is_learned ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-transparent hover:border-blue-400'} disabled:opacity-60`}
                                            aria-label={material.is_learned ? 'Tandai belum dipelajari' : 'Tandai sudah dipelajari'}
                                        >
                                            {busyId === material.id ? <LoaderCircle size={14} className="animate-spin text-blue-600" /> : <Check size={15} />}
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Pertemuan {meeting.meeting_number}</p>
                                            <p className={`mt-1 text-sm font-semibold ${material.is_learned ? 'text-emerald-900' : 'text-slate-900'}`}>{material.title}</p>
                                            <div className="mt-2 flex items-center gap-3">
                                                <button type="button" onClick={() => void toggle(material)} className={`text-xs font-semibold ${material.is_learned ? 'text-emerald-700' : 'text-blue-700'}`}>
                                                    {material.is_learned ? 'Sudah dipelajari ✓' : 'Tandai sudah dipelajari'}
                                                </button>
                                                {material.resource_url && <a href={material.resource_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-700"><ExternalLink size={12} /> Buka</a>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

const root = document.getElementById('student-material-checklist-root');
if (root) createRoot(root).render(<StudentMaterialChecklist />);

