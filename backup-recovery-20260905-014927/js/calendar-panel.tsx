import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    ExternalLink,
    X,
} from 'lucide-react';

type CalendarEvent = {
    id: number;
    title: string;
    class_id: number;
    class_name: string;
    course_code: string | null;
    meeting_number: number | null;
    class_url: string;
    due_at: string;
    status: 'published' | 'closed';
    submitted: boolean;
    submitted_at: string | null;
    score: number | null;
    max_score: number;
    is_overdue: boolean;
    is_soon: boolean;
    submission_count: number | null;
    graded_count: number | null;
};

type CalendarPayload = {
    events: CalendarEvent[];
    summary: {
        total: number;
        overdue: number;
        due_soon: number;
        submitted: number | null;
    };
};

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function eventDateKey(value: string): string {
    return dateKey(new Date(value));
}

function monthLabel(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
}

function longDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function shortDateTime(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function calendarRange(month: Date): { start: Date; end: Date; days: Date[] } {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);

    const days = Array.from({ length: 42 }, (_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
    });

    return { start: days[0], end: days[41], days };
}

function CalendarPanel() {
    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
    const [payload, setPayload] = useState<CalendarPayload | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const range = useMemo(() => calendarRange(viewMonth), [viewMonth]);

    const loadCalendar = useCallback(async () => {
        setBusy(true);
        setError('');
        const params = new URLSearchParams({
            start: dateKey(range.start),
            end: dateKey(range.end),
        });

        try {
            const response = await fetch(`/api/calendar?${params.toString()}`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setPayload(null);
                    return;
                }
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message ?? 'Kalender belum dapat dimuat.');
            }

            setPayload(await response.json());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Kalender belum dapat dimuat.');
        } finally {
            setBusy(false);
        }
    }, [range.end, range.start]);

    useEffect(() => {
        if (open) void loadCalendar();
    }, [loadCalendar, open]);

    useEffect(() => {
        if (!open) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [open]);

    const grouped = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        for (const event of payload?.events ?? []) {
            const key = eventDateKey(event.due_at);
            const list = map.get(key) ?? [];
            list.push(event);
            map.set(key, list);
        }
        return map;
    }, [payload?.events]);

    const selectedDate = useMemo(() => {
        const [year, month, day] = selectedDay.split('-').map(Number);
        return new Date(year, month - 1, day);
    }, [selectedDay]);

    const selectedEvents = grouped.get(selectedDay) ?? [];

    const changeMonth = (delta: number) => {
        const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
        setViewMonth(next);
        setSelectedDay(dateKey(next));
    };

    const goToday = () => {
        const today = new Date();
        setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDay(dateKey(today));
    };

    return (
        <>
            <button
                type="button"
                aria-label="Kalender dan deadline"
                title="Kalender dan deadline"
                onClick={() => setOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
                <CalendarDays size={18} />
            </button>

            {open && (
                <div className="fixed inset-0 z-[100] bg-slate-950/25 backdrop-blur-[1px]" onMouseDown={() => setOpen(false)}>
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label="Kalender dan deadline"
                        onMouseDown={(event) => event.stopPropagation()}
                        className="fixed inset-x-3 bottom-3 top-[5.75rem] z-[110] flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:bottom-auto sm:left-auto sm:right-6 sm:top-24 sm:max-h-[calc(100vh-7rem)] sm:w-[min(780px,calc(100vw-3rem))]"
                    >
                        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-600">Kalender SiPANDU</p>
                                <h2 className="truncate text-lg font-bold text-slate-950">Deadline seluruh kelas</h2>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Tutup kalender"><X size={18} /></button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
                                <div className="p-4 sm:p-5">
                                    <div className="grid grid-cols-3 gap-2">
                                        <SummaryCard label="Deadline" value={payload?.summary.total ?? 0} icon={CalendarDays} />
                                        <SummaryCard label="Segera" value={payload?.summary.due_soon ?? 0} icon={Clock3} tone="amber" />
                                        <SummaryCard label="Terlambat" value={payload?.summary.overdue ?? 0} icon={AlertTriangle} tone="rose" />
                                    </div>

                                    <div className="mt-5 flex items-center justify-between gap-2">
                                        <button type="button" onClick={() => changeMonth(-1)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700" aria-label="Bulan sebelumnya"><ChevronLeft size={17} /></button>
                                        <button type="button" onClick={goToday} className="min-w-0 rounded-xl px-3 py-2 text-sm font-bold capitalize text-slate-900 hover:bg-blue-50">{monthLabel(viewMonth)}</button>
                                        <button type="button" onClick={() => changeMonth(1)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700" aria-label="Bulan berikutnya"><ChevronRight size={17} /></button>
                                    </div>

                                    <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        {weekdays.map((day) => <div key={day} className="py-1.5">{day}</div>)}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1">
                                        {range.days.map((day) => {
                                            const key = dateKey(day);
                                            const events = grouped.get(key) ?? [];
                                            const outside = day.getMonth() !== viewMonth.getMonth();
                                            const selected = key === selectedDay;
                                            const today = key === dateKey(new Date());
                                            const hasOverdue = events.some((event) => event.is_overdue);
                                            const hasSoon = events.some((event) => event.is_soon);
                                            const hasSubmitted = events.some((event) => event.submitted);

                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setSelectedDay(key)}
                                                    className={`min-h-[58px] rounded-xl border p-1.5 text-left transition sm:min-h-[72px] sm:p-2 ${selected ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-transparent hover:border-blue-100 hover:bg-slate-50'} ${outside ? 'opacity-35' : ''}`}
                                                >
                                                    <span className={`grid h-6 w-6 place-items-center rounded-lg text-xs font-bold ${today ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>{day.getDate()}</span>
                                                    {events.length > 0 && (
                                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                                            {hasOverdue && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                                                            {hasSoon && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                                                            {!hasOverdue && !hasSoon && hasSubmitted && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                                                            {!hasOverdue && !hasSoon && !hasSubmitted && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                                                            {events.length > 1 && <span className="text-[8px] font-bold leading-none text-slate-400">+{events.length - 1}</span>}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {busy && <p className="mt-4 text-center text-xs font-semibold text-slate-400">Memuat deadline…</p>}
                                    {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                                </div>

                                <aside className="border-t border-slate-100 bg-slate-50 p-4 lg:border-l lg:border-t-0 sm:p-5">
                                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Agenda terpilih</p>
                                    <h3 className="mt-1 text-sm font-bold capitalize text-slate-950">{longDate(selectedDate)}</h3>
                                    <div className="mt-4 space-y-3">
                                        {selectedEvents.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
                                                <CalendarDays size={20} className="mx-auto text-slate-300" />
                                                <p className="mt-2 text-xs leading-5 text-slate-500">Tidak ada deadline pada tanggal ini.</p>
                                            </div>
                                        ) : selectedEvents.map((event) => <EventCard key={event.id} event={event} />)}
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
    tone = 'blue',
}: {
    label: string;
    value: number;
    icon: typeof CalendarDays;
    tone?: 'blue' | 'amber' | 'rose';
}) {
    const style = tone === 'rose'
        ? 'bg-rose-50 text-rose-700'
        : tone === 'amber'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-blue-50 text-blue-700';

    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-3">
            <div className={`grid h-8 w-8 place-items-center rounded-xl ${style}`}><Icon size={14} /></div>
            <p className="mt-2 text-xl font-extrabold text-slate-950">{value}</p>
            <p className="text-[10px] font-semibold text-slate-400">{label}</p>
        </div>
    );
}

function EventCard({ event }: { event: CalendarEvent }) {
    const state = event.is_overdue
        ? { label: 'Terlambat', style: 'bg-rose-50 text-rose-700', icon: AlertTriangle }
        : event.submitted
            ? { label: 'Dikumpulkan', style: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 }
            : event.is_soon
                ? { label: 'Segera', style: 'bg-amber-50 text-amber-700', icon: Clock3 }
                : { label: 'Terjadwal', style: 'bg-blue-50 text-blue-700', icon: CalendarDays };
    const Icon = state.icon;

    return (
        <a href={event.class_url} className="block rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-blue-200 hover:shadow-sm">
            <div className="flex items-start gap-3">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${state.style}`}><Icon size={15} /></div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 text-sm font-bold leading-5 text-slate-900">{event.title}</p>
                        <ExternalLink size={13} className="mt-1 shrink-0 text-slate-300" />
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-blue-600">{event.course_code ?? event.class_name}</p>
                    <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{event.class_name}{event.meeting_number ? ` · Pertemuan ${event.meeting_number}` : ''}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${state.style}`}>{state.label}</span>
                        <span className="text-[10px] text-slate-400">{shortDateTime(event.due_at)}</span>
                    </div>
                    {event.submission_count !== null && (
                        <p className="mt-2 text-[10px] text-slate-400">{event.submission_count} pengumpulan · {event.graded_count ?? 0} dinilai</p>
                    )}
                    {event.score !== null && (
                        <p className="mt-2 text-[10px] font-semibold text-emerald-700">Nilai {event.score}/{event.max_score}</p>
                    )}
                </div>
            </div>
        </a>
    );
}

let root = document.getElementById('calendar-panel-root');
if (!root) {
    root = document.createElement('div');
    root.id = 'calendar-panel-root';
}

const placeCalendarRoot = () => {
    const bell = document.querySelector<HTMLButtonElement>('button[aria-label="Notifikasi"]');
    const bellWrapper = bell?.parentElement;
    const toolbar = bellWrapper?.parentElement;

    if (!bellWrapper || !toolbar) {
        if (root?.isConnected) root.remove();
        return;
    }

    if (root?.parentElement !== toolbar || root.previousElementSibling !== bellWrapper) {
        bellWrapper.insertAdjacentElement('afterend', root);
    }
};

placeCalendarRoot();
const placementObserver = new MutationObserver(placeCalendarRoot);
placementObserver.observe(document.body, { childList: true, subtree: true });

createRoot(root).render(<CalendarPanel />);

