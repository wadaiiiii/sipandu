import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MessageCircle, Reply, Send, Trash2, X } from 'lucide-react';

type Material = { id: number; title: string };
type Assignment = { id: number; title: string };
type Meeting = {
    id: number;
    meeting_number: number;
    title: string | null;
    materials: Material[];
    assignments: Assignment[];
};

type ClassroomPayload = {
    viewer_role: 'admin_prodi' | 'lecturer' | 'student' | 'upm';
    meetings: Meeting[];
};

type CommentItem = {
    id: number;
    body: string;
    target_type: 'class' | 'meeting' | 'material' | 'assignment';
    target_id: number | null;
    target_label: string;
    parent_id: number | null;
    created_at: string | null;
    can_delete: boolean;
    author: { id: number; name: string; email: string; role: string } | null;
};

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    headers.set('Accept', 'application/json');
    if (init.method && init.method !== 'GET') {
        headers.set('X-CSRF-TOKEN', csrf());
        if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }
    return fetch(path, {
        credentials: 'include',
        cache: init.method && init.method !== 'GET' ? undefined : 'no-store',
        ...init,
        headers,
    });
}

function formatDate(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function roleLabel(role: string): string {
    if (role === 'lecturer') return 'Dosen';
    if (role === 'student') return 'Mahasiswa';
    if (role === 'admin_prodi') return 'Admin Prodi';
    return 'Pengguna';
}

function insertLatex(textarea: HTMLTextAreaElement | null, value: string, setValue: (value: string) => void, mode: 'inline' | 'display'): void {
    if (!textarea) return;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const selected = value.slice(start, end) || (mode === 'inline' ? 'x^2 + y^2' : '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
    const replacement = mode === 'inline' ? `\\(${selected}\\)` : `\\[\n${selected}\n\\]`;
    const next = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    setValue(next);
    window.requestAnimationFrame(() => {
        const cursor = start + replacement.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
    });
}

function DiscussionControl({ host }: { host: HTMLElement }) {
    const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const [open, setOpen] = useState(false);
    const [payload, setPayload] = useState<ClassroomPayload | null>(null);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [target, setTarget] = useState('class');
    const [body, setBody] = useState('');
    const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const canComment = payload?.viewer_role !== 'upm';

    const loadRoom = async () => {
        const roomResponse = await api(`/api/classes/${classId}/meetings`);
        if (roomResponse.ok) setPayload(await roomResponse.json() as ClassroomPayload);
    };

    const refreshComments = async () => {
        const response = await api(`/api/classes/${classId}/comments`);
        if (!response.ok) return;
        const result = await response.json() as { comments?: CommentItem[] };
        setComments(result.comments ?? []);
    };

    const load = async () => {
        await Promise.all([loadRoom(), refreshComments()]);
    };

    useEffect(() => { void load(); }, [classId]);
    useEffect(() => {
        if (!open) return;
        void refreshComments();
    }, [open]);
    useEffect(() => {
        if (!open || !listRef.current) return;
        window.requestAnimationFrame(() => {
            const panel = listRef.current;
            if (panel) panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' });
        });
    }, [comments.length, open]);

    const targetOptions = useMemo(() => {
        const items: { value: string; label: string }[] = [{ value: 'class', label: 'Diskusi umum kelas' }];
        for (const meeting of payload?.meetings ?? []) {
            items.push({
                value: `meeting:${meeting.id}`,
                label: `Pertemuan ${meeting.meeting_number}${meeting.title ? ` · ${meeting.title}` : ''}`,
            });
            for (const material of meeting.materials) {
                items.push({ value: `material:${material.id}`, label: `Materi · ${material.title}` });
            }
            for (const assignment of meeting.assignments) {
                items.push({ value: `assignment:${assignment.id}`, label: `Tugas · ${assignment.title}` });
            }
        }
        return items;
    }, [payload]);

    const commentMap = useMemo(() => new Map(comments.map((comment) => [comment.id, comment])), [comments]);
    const rootIdFor = (comment: CommentItem): number => {
        let current = comment;
        const visited = new Set<number>();
        while (current.parent_id && !visited.has(current.id)) {
            visited.add(current.id);
            const parent = commentMap.get(current.parent_id);
            if (!parent) break;
            current = parent;
        }
        return current.id;
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const text = body.trim();
        if (!text || !canComment) return;

        const [targetType, rawId] = target.split(':');
        setBusy(true);
        setError('');
        const response = await api(`/api/classes/${classId}/comments`, {
            method: 'POST',
            body: JSON.stringify({
                body: text,
                target_type: targetType,
                target_id: rawId ? Number(rawId) : null,
                parent_id: replyTo?.id ?? null,
            }),
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({})) as { message?: string };
            setError(result.message ?? 'Komentar belum dapat dikirim.');
            setBusy(false);
            return;
        }

        const result = await response.json() as { comment?: CommentItem };
        if (result.comment) {
            setComments((current) => current.some((item) => item.id === result.comment?.id)
                ? current
                : [...current, result.comment as CommentItem]);
        }
        setBody('');
        setReplyTo(null);
        setPreviewOpen(false);
        setBusy(false);

        // Sinkronisasi ringan di belakang untuk menangkap komentar pengguna lain.
        window.setTimeout(() => void refreshComments(), 180);
    };

    const beginReply = (comment: CommentItem) => {
        setReplyTo(comment);
        setTarget(comment.target_id ? `${comment.target_type}:${comment.target_id}` : 'class');
        window.requestAnimationFrame(() => textareaRef.current?.focus());
    };

    const remove = async (comment: CommentItem) => {
        if (!comment.can_delete) return;
        setBusy(true);
        const response = await api(`/api/classes/${classId}/comments/${comment.id}`, { method: 'DELETE' });
        if (response.ok) {
            setComments((current) => current.filter((item) => item.id !== comment.id && item.parent_id !== comment.id));
            await refreshComments();
        }
        setBusy(false);
    };

    const rootComments = comments.filter((comment) => !comment.parent_id);
    const repliesFor = (id: number) => comments.filter((comment) => Boolean(comment.parent_id) && rootIdFor(comment) === id);

    return (
        <>
            {createPortal(
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    title="Diskusi kelas"
                    aria-label="Diskusi kelas"
                    className="relative grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-600 transition hover:bg-blue-50"
                >
                    <MessageCircle size={17} />
                    {comments.length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-4 text-white">{comments.length > 99 ? '99+' : comments.length}</span>}
                </button>,
                host,
            )}

            {open && createPortal(
                <div className="fixed inset-0 z-[110]">
                    <button type="button" aria-label="Tutup diskusi" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" />
                    <aside className="absolute inset-y-0 right-0 flex w-[min(520px,100vw)] flex-col border-l border-blue-100 bg-[#f7f9ff] shadow-2xl">
                        <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-white px-5 py-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Diskusi Kelas</p>
                                <h2 className="mt-0.5 text-lg font-bold text-slate-950">Tanya, jawab, dan berdiskusi</h2>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={17} /></button>
                        </div>

                        <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-5">
                            {comments.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-8 text-center">
                                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><MessageCircle size={20} /></div>
                                    <p className="mt-3 font-bold text-slate-900">Belum ada diskusi</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">Mulai pertanyaan umum atau arahkan komentar ke pertemuan, materi, maupun tugas.</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {rootComments.map((comment) => (
                                    <div key={comment.id} className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
                                        <CommentCard comment={comment} onReply={beginReply} onDelete={remove} />
                                        {repliesFor(comment.id).length > 0 && (
                                            <div className="mt-3 space-y-2 border-l-2 border-blue-100 pl-3">
                                                {repliesFor(comment.id).map((reply) => (
                                                    <div key={reply.id} className="rounded-2xl bg-slate-50 p-3">
                                                        <CommentCard comment={reply} onReply={beginReply} onDelete={remove} compact />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {canComment && (
                            <form onSubmit={submit} className="border-t border-blue-100 bg-white p-4 sm:p-5">
                                {replyTo && (
                                    <div className="mb-3 flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2 text-xs text-blue-800">
                                        <span>Membalas <strong>{replyTo.author?.name ?? 'pengguna'}</strong></span>
                                        <button type="button" onClick={() => setReplyTo(null)} className="font-bold">Batal</button>
                                    </div>
                                )}
                                <select value={target} onChange={(event) => { setTarget(event.target.value); setReplyTo(null); }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                                    {targetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                                <textarea
                                    ref={textareaRef}
                                    data-sipandu-latex-native="true"
                                    value={body}
                                    onChange={(event) => setBody(event.target.value)}
                                    rows={3}
                                    maxLength={5000}
                                    placeholder="Tulis pertanyaan, tanggapan, atau jawaban…"
                                    className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                />
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => insertLatex(textareaRef.current, body, setBody, 'inline')} className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100">∑ Rumus inline</button>
                                    <button type="button" onClick={() => insertLatex(textareaRef.current, body, setBody, 'display')} className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100">ƒ Persamaan blok</button>
                                    <button
                                        type="button"
                                        aria-pressed={previewOpen}
                                        onClick={() => setPreviewOpen((current) => !current)}
                                        className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition ${previewOpen ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'}`}
                                    >
                                        {previewOpen ? 'Tutup preview' : 'Preview'}
                                    </button>
                                </div>
                                {previewOpen && (
                                    <div key={body} data-sipandu-latex-render="true" className="mt-2 min-h-12 overflow-x-auto whitespace-pre-wrap rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-3 py-2.5 text-sm leading-6 text-slate-700">
                                        {body || 'Belum ada isi untuk dipratinjau.'}
                                    </div>
                                )}
                                {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="text-[11px] text-slate-400">Diskusi menjadi bagian rekam jejak kelas.</span>
                                    <button disabled={busy || !body.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Send size={14} /> {busy ? 'Mengirim…' : 'Kirim'}</button>
                                </div>
                            </form>
                        )}
                    </aside>
                </div>,
                document.body,
            )}
        </>
    );
}

function CommentCard({ comment, onReply, onDelete, compact = false }: {
    comment: CommentItem;
    onReply: (comment: CommentItem) => void;
    onDelete: (comment: CommentItem) => void;
    compact?: boolean;
}) {
    return (
        <div>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-slate-900`}>{comment.author?.name ?? 'Pengguna'}</p>
                        {comment.author && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">{roleLabel(comment.author.role)}</span>}
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(comment.created_at)}</p>
                </div>
                {comment.can_delete && <button type="button" onClick={() => onDelete(comment)} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>}
            </div>
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{comment.target_label}</span>
            <p data-sipandu-latex-render="true" className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.body}</p>
            <button type="button" onClick={() => onReply(comment)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"><Reply size={12} /> Balas</button>
        </div>
    );
}

function findHost(): Promise<HTMLElement> {
    return new Promise((resolve) => {
        const locate = () => {
            const rekapLink = document.querySelector<HTMLAnchorElement>('a[href*="/jurnal"]');
            const host = rekapLink?.parentElement;
            if (host) {
                const mount = document.createElement('span');
                mount.className = 'contents';
                host.insertBefore(mount, host.lastElementChild);
                resolve(mount);
                return true;
            }
            return false;
        };

        if (locate()) return;
        const observer = new MutationObserver(() => {
            if (locate()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

void findHost().then((host) => {
    const root = document.createElement('div');
    root.id = 'classroom-discussion-root';
    document.body.appendChild(root);
    createRoot(root).render(<DiscussionControl host={host} />);
});

