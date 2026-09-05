import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ArrowLeft, Check, CheckCircle2, ChevronRight, Clock3, FileQuestion, GraduationCap,
    LoaderCircle, Plus, RefreshCw, Save, Send, Sparkles, Trash2,
} from 'lucide-react';

type User = { id: number; name: string; role: string; role_label?: string };
type QuizSummary = {
    id: number; title: string; sub_cpmk_code: string | null; duration_minutes: number | null; max_attempts: number;
    shuffle_questions: boolean; shuffle_options: boolean; starts_at: string | null; due_at: string | null;
    status: 'draft' | 'published' | 'closed'; questions_count: number; attempts_used?: number; can_start?: boolean;
    latest_attempt?: Attempt | null; attempt_count?: number; need_review_count?: number; graded_count?: number;
};
type Option = { id?: number; key: string; label: string; correct?: boolean };
type Question = {
    id: number; position: number; type: QuestionType; prompt: string; points: number; answer_key?: Record<string, unknown> | null;
    explanation?: string | null; options: Option[];
};
type Answer = { id?: number; question_id?: number; question_type?: QuestionType; prompt?: string; points?: number; answer?: Record<string, unknown> | null; score?: number | null; feedback?: string | null };
type Attempt = {
    id: number; attempt_number: number; status: 'in_progress' | 'submitted' | 'graded'; started_at: string | null; submitted_at: string | null;
    score: number | null; max_score: number; answers?: Record<string, Record<string, unknown> | null> | Answer[];
    student?: { id: number; name: string; identity_number?: string | null; email: string } | null;
};
type QuizDetail = QuizSummary & { description?: string | null; questions?: Question[]; attempts?: Attempt[]; current_attempt_id?: number | null };
type QuestionType = 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer' | 'essay';

type QuizForm = {
    title: string; description: string; sub_cpmk_code: string; duration_minutes: string; max_attempts: number;
    starts_at: string; due_at: string; status: 'draft' | 'published' | 'closed'; shuffle_questions: boolean; shuffle_options: boolean;
};
type QuestionForm = {
    type: QuestionType; prompt: string; points: number; explanation: string; options: Option[]; trueFalse: boolean;
    accepted: string; caseSensitive: boolean;
};

const typeLabels: Record<QuestionType, string> = {
    multiple_choice: 'Pilihan Ganda', multiple_select: 'Pilihan Ganda Kompleks', true_false: 'Benar / Salah',
    short_answer: 'Isian Singkat', essay: 'Essay',
};

function csrf(): string { return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''; }
async function api(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    headers.set('Accept', 'application/json');
    if (init.method && init.method !== 'GET') {
        headers.set('X-CSRF-TOKEN', csrf());
        if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }
    return fetch(sipanduUrl(path), { credentials: 'include', cache: 'no-store', ...init, headers });
}
async function err(response: Response): Promise<string> {
    try {
        const body = await response.json();
        return String(Object.values(body.errors ?? {}).flat()[0] ?? body.message ?? 'Permintaan belum berhasil.');
    } catch { return 'Permintaan belum berhasil.'; }
}
function fmt(value: string | null): string {
    if (!value) return 'Tidak dibatasi';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function localInput(value: string | null): string {
    if (!value) return '';
    const d = new Date(value); if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function emptyQuiz(): QuizForm {
    return { title: '', description: '', sub_cpmk_code: '', duration_minutes: '30', max_attempts: 1, starts_at: '', due_at: '', status: 'draft', shuffle_questions: false, shuffle_options: false };
}
function emptyQuestion(position = 1): QuestionForm {
    return {
        type: 'multiple_choice', prompt: '', points: 1, explanation: '', trueFalse: true, accepted: '', caseSensitive: false,
        options: [
            { key: 'A', label: '', correct: true }, { key: 'B', label: '', correct: false },
            { key: 'C', label: '', correct: false }, { key: 'D', label: '', correct: false },
        ],
    };
}

function App() {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const classSegment = pathSegments.lastIndexOf('kelas');
    const classId = classSegment >= 0 ? (pathSegments[classSegment + 1] ?? '') : '';
    const [user, setUser] = useState<User | null>(null);
    const [viewerRole, setViewerRole] = useState('');
    const [canEdit, setCanEdit] = useState(false);
    const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(() => Number(new URLSearchParams(location.search).get('quiz')) || null);
    const [detail, setDetail] = useState<QuizDetail | null>(null);
    const [attempt, setAttempt] = useState<Attempt | null>(null);
    const [answers, setAnswers] = useState<Record<number, Record<string, unknown>>>({});
    const [quizForm, setQuizForm] = useState<QuizForm>(emptyQuiz());
    const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestion());
    const [showCreate, setShowCreate] = useState(false);
    const [busy, setBusy] = useState(false);
    const [savingQuestion, setSavingQuestion] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    const isStudent = viewerRole === 'student';

    const loadList = async () => {
        setBusy(true); setError('');
        const [bootstrap, list] = await Promise.all([api('/sipandu-api/bootstrap'), api(`/sipandu-api/classes/${classId}/quizzes`)]);
        if (!bootstrap.ok || !list.ok) {
            setError(!list.ok ? await err(list) : 'Sesi tidak dapat dimuat.'); setBusy(false); return;
        }
        const b = await bootstrap.json() as { user: User | null };
        const l = await list.json() as { viewer_role: string; can_edit: boolean; quizzes: QuizSummary[] };
        setUser(b.user); setViewerRole(l.viewer_role); setCanEdit(l.can_edit); setQuizzes(l.quizzes);
        if (!selectedId && l.quizzes.length === 1) setSelectedId(l.quizzes[0].id);
        setBusy(false);
    };

    const loadDetail = async (id: number) => {
        setBusy(true); setError('');
        const response = await api(`/sipandu-api/classes/${classId}/quizzes/${id}`);
        if (!response.ok) { setError(await err(response)); setBusy(false); return; }
        const data = await response.json() as { quiz: QuizDetail; attempt?: Attempt | null };
        setDetail(data.quiz); setAttempt(data.attempt ?? null);
        if (data.attempt?.answers && !Array.isArray(data.attempt.answers)) {
            const next: Record<number, Record<string, unknown>> = {};
            Object.entries(data.attempt.answers).forEach(([key, value]) => { if (value) next[Number(key)] = value; });
            setAnswers(next);
        } else setAnswers({});
        if (canEdit || viewerRole === 'lecturer' || viewerRole === 'admin_prodi') {
            setQuizForm({
                title: data.quiz.title, description: data.quiz.description ?? '', sub_cpmk_code: data.quiz.sub_cpmk_code ?? '',
                duration_minutes: data.quiz.duration_minutes ? String(data.quiz.duration_minutes) : '', max_attempts: data.quiz.max_attempts,
                starts_at: localInput(data.quiz.starts_at), due_at: localInput(data.quiz.due_at), status: data.quiz.status,
                shuffle_questions: data.quiz.shuffle_questions, shuffle_options: data.quiz.shuffle_options,
            });
            setQuestionForm(emptyQuestion((data.quiz.questions?.length ?? 0) + 1));
        }
        setBusy(false);
    };

    useEffect(() => { void loadList(); }, [classId]);
    useEffect(() => { if (selectedId) void loadDetail(selectedId); }, [selectedId, viewerRole]);

    useEffect(() => {
        if (!attempt || attempt.status !== 'in_progress' || !detail?.duration_minutes || !attempt.started_at) { setSecondsLeft(null); return; }
        const expires = new Date(attempt.started_at).getTime() + detail.duration_minutes * 60000;
        const tick = () => setSecondsLeft(Math.max(0, Math.floor((expires - Date.now()) / 1000)));
        tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer);
    }, [attempt?.id, attempt?.status, detail?.duration_minutes]);

    const createQuiz = async (event: FormEvent) => {
        event.preventDefault(); setBusy(true); setError(''); setNotice('');
        const response = await api(`/sipandu-api/classes/${classId}/quizzes`, { method: 'POST', body: JSON.stringify(quizPayload(quizForm)) });
        if (!response.ok) { setError(await err(response)); setBusy(false); return; }
        const data = await response.json() as { quiz: QuizSummary };
        setNotice('Kuis berhasil dibuat. Tambahkan soal sebelum dipublikasikan.'); setShowCreate(false); setSelectedId(data.quiz.id);
        await loadList(); setBusy(false);
    };

    const saveQuiz = async () => {
        if (!detail) return; setBusy(true); setError('');
        const response = await api(`/sipandu-api/classes/${classId}/quizzes/${detail.id}`, { method: 'PATCH', body: JSON.stringify(quizPayload(quizForm)) });
        if (!response.ok) setError(await err(response));
        else { setNotice('Pengaturan kuis disimpan.'); await Promise.all([loadList(), loadDetail(detail.id)]); }
        setBusy(false);
    };

    const addQuestion = async (event: FormEvent) => {
        event.preventDefault(); if (!detail) return; setSavingQuestion(true); setError('');
        const payload = questionPayload(questionForm, (detail.questions?.length ?? 0) + 1);
        const response = await api(`/sipandu-api/classes/${classId}/quizzes/${detail.id}/questions`, { method: 'POST', body: JSON.stringify(payload) });
        if (!response.ok) setError(await err(response));
        else { setNotice('Soal ditambahkan.'); setQuestionForm(emptyQuestion((detail.questions?.length ?? 0) + 2)); await Promise.all([loadList(), loadDetail(detail.id)]); }
        setSavingQuestion(false);
    };

    const deleteQuestion = async (questionId: number) => {
        if (!detail || !confirm('Hapus soal ini?')) return;
        const response = await api(`/sipandu-api/classes/${classId}/quizzes/${detail.id}/questions/${questionId}`, { method: 'DELETE' });
        if (!response.ok) setError(await err(response)); else { setNotice('Soal dihapus.'); await loadDetail(detail.id); }
    };

    const startQuiz = async () => {
        if (!detail) return; setBusy(true); setError('');
        const response = await api(`/sipandu-api/classes/${classId}/quizzes/${detail.id}/start`, { method: 'POST' });
        if (!response.ok) setError(await err(response));
        else {
            const data = await response.json() as { quiz?: QuizDetail; attempt: Attempt };
            if (data.quiz) setDetail(data.quiz); setAttempt(data.attempt); setAnswers({}); setNotice('Percobaan dimulai. Jawaban tersimpan selama Anda mengerjakan.');
        }
        setBusy(false);
    };

    const saveAnswer = async (question: Question, value: Record<string, unknown>) => {
        if (!detail || !attempt || attempt.status !== 'in_progress') return;
        setAnswers((current) => ({ ...current, [question.id]: value }));
        const response = await api(`/sipandu-api/classes/${classId}/quizzes/${detail.id}/attempts/${attempt.id}/questions/${question.id}`, { method: 'PUT', body: JSON.stringify({ answer: value }) });
        if (!response.ok) setError(await err(response));
    };

    const submitQuiz = async () => {
        if (!detail || !attempt || !confirm('Kumpulkan kuis sekarang? Setelah dikumpulkan jawaban tidak dapat diubah.')) return;
        setBusy(true); setError('');
        const response = await api(`/sipandu-api/classes/${classId}/quizzes/${detail.id}/attempts/${attempt.id}/submit`, { method: 'POST' });
        if (!response.ok) setError(await err(response));
        else { const data = await response.json() as { attempt: Attempt }; setAttempt(data.attempt); setNotice(data.attempt.status === 'graded' ? 'Kuis selesai dan sudah dinilai otomatis.' : 'Kuis dikumpulkan. Jawaban essay menunggu penilaian dosen.'); await loadList(); }
        setBusy(false);
    };

    const gradeEssay = async (attemptId: number, answer: Answer, score: number, feedback: string) => {
        if (!detail || !answer.id) return;
        setBusy(true); setError('');
        const response = await api(`/sipandu-api/classes/${classId}/quizzes/${detail.id}/attempts/${attemptId}/answers/${answer.id}/grade`, { method: 'PATCH', body: JSON.stringify({ score, feedback: feedback || null }) });
        if (!response.ok) setError(await err(response)); else { setNotice('Nilai essay disimpan.'); await Promise.all([loadList(), loadDetail(detail.id)]); }
        setBusy(false);
    };

    const headerTitle = isStudent ? 'Kuis & Ujian Saya' : 'Kuis & Ujian Kelas';

    return <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3"><a href={`/kelas/${classId}`} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-blue-50"><ArrowLeft size={17}/></a><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">SiPANDU Assessment</p><h1 className="text-lg font-extrabold">{headerTitle}</h1></div></div>
                <div className="flex items-center gap-2"><button onClick={() => void loadList()} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-blue-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/></button><div className="hidden text-right sm:block"><p className="text-sm font-bold">{user?.name ?? 'Pengguna'}</p><p className="text-xs text-slate-500">{isStudent ? 'Mahasiswa' : 'Dosen'}</p></div></div>
            </div>
        </header>

        <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[340px_1fr] lg:px-8">
            <aside className="space-y-4">
                <section className="rounded-[26px] border border-blue-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">Daftar</p><h2 className="mt-1 font-extrabold">Kuis & Ujian</h2></div>{canEdit && <button onClick={() => setShowCreate((v) => !v)} className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Plus size={17}/></button>}</div>
                    {showCreate && <form onSubmit={createQuiz} className="mt-4 space-y-3 border-t border-slate-100 pt-4"><Input label="Judul"><input required value={quizForm.title} onChange={(e) => setQuizForm({...quizForm,title:e.target.value})} className="q-input"/></Input><button disabled={busy} className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white">{busy ? 'Menyimpan…' : 'Buat kuis'}</button></form>}
                    <div className="mt-4 space-y-2">
                        {quizzes.length === 0 && !busy && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada kuis.</p>}
                        {quizzes.map((quiz) => <button key={quiz.id} onClick={() => setSelectedId(quiz.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === quiz.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}><div className="flex items-start justify-between gap-2"><p className="font-bold leading-5">{quiz.title}</p><Status value={quiz.status}/></div><p className="mt-2 text-xs text-slate-500">{quiz.questions_count} soal · {quiz.duration_minutes ? `${quiz.duration_minutes} menit` : 'tanpa durasi'}</p>{isStudent && quiz.latest_attempt && <p className="mt-1 text-xs font-semibold text-blue-700">{quiz.latest_attempt.status === 'graded' ? `Nilai ${quiz.latest_attempt.score}/${quiz.latest_attempt.max_score}` : quiz.latest_attempt.status === 'submitted' ? 'Menunggu penilaian essay' : 'Sedang dikerjakan'}</p>}{!isStudent && <p className="mt-1 text-xs text-slate-500">{quiz.attempt_count ?? 0} submission · {quiz.need_review_count ?? 0} perlu diperiksa</p>}</button>)}
                    </div>
                </section>
            </aside>

            <section className="min-w-0">
                {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
                {notice && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
                {!detail ? <Empty busy={busy}/> : isStudent ? <StudentQuiz quiz={detail} attempt={attempt} answers={answers} secondsLeft={secondsLeft} busy={busy} onStart={startQuiz} onSave={saveAnswer} onSubmit={submitQuiz}/> : <LecturerQuiz quiz={detail} form={quizForm} setForm={setQuizForm} questionForm={questionForm} setQuestionForm={setQuestionForm} busy={busy} savingQuestion={savingQuestion} onSaveQuiz={saveQuiz} onAddQuestion={addQuestion} onDeleteQuestion={deleteQuestion} onGradeEssay={gradeEssay}/>} 
            </section>
        </div>
        <style>{`.q-input{margin-top:.35rem;width:100%;border-radius:.85rem;border:1px solid #dbe3f0;background:#fff;padding:.65rem .75rem;font-size:.875rem;outline:none}.q-input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.q-textarea{min-height:110px;resize:vertical}`}</style>
    </main>;
}

function LecturerQuiz({ quiz, form, setForm, questionForm, setQuestionForm, busy, savingQuestion, onSaveQuiz, onAddQuestion, onDeleteQuestion, onGradeEssay }: {
    quiz: QuizDetail; form: QuizForm; setForm: (value: QuizForm) => void; questionForm: QuestionForm; setQuestionForm: (value: QuestionForm) => void; busy: boolean; savingQuestion: boolean;
    onSaveQuiz: () => void; onAddQuestion: (event: FormEvent) => void; onDeleteQuestion: (id: number) => void; onGradeEssay: (attemptId: number, answer: Answer, score: number, feedback: string) => void;
}) {
    return <div className="space-y-5">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">Pengaturan kuis</p><h2 className="mt-1 text-2xl font-extrabold">{quiz.title}</h2><p className="mt-2 text-sm text-slate-500">Kunci jawaban hanya disimpan di server dan tidak dikirim ke akun mahasiswa.</p></div><button onClick={onSaveQuiz} disabled={busy} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Save size={16}/>{busy ? 'Menyimpan…' : 'Simpan pengaturan'}</button></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Input label="Judul"><input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="q-input"/></Input>
                <Input label="Sub-CPMK"><input value={form.sub_cpmk_code} onChange={(e)=>setForm({...form,sub_cpmk_code:e.target.value})} className="q-input" placeholder="Opsional"/></Input>
                <Input label="Durasi (menit)"><input type="number" min={1} value={form.duration_minutes} onChange={(e)=>setForm({...form,duration_minutes:e.target.value})} className="q-input"/></Input>
                <Input label="Maks. percobaan"><input type="number" min={1} max={10} value={form.max_attempts} onChange={(e)=>setForm({...form,max_attempts:Number(e.target.value)})} className="q-input"/></Input>
                <Input label="Mulai"><input type="datetime-local" value={form.starts_at} onChange={(e)=>setForm({...form,starts_at:e.target.value})} className="q-input"/></Input>
                <Input label="Deadline"><input type="datetime-local" value={form.due_at} onChange={(e)=>setForm({...form,due_at:e.target.value})} className="q-input"/></Input>
                <Input label="Status"><select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value as QuizForm['status']})} className="q-input"><option value="draft">Draft</option><option value="published">Dibuka</option><option value="closed">Ditutup</option></select></Input>
                <label className="flex items-center gap-2 pt-6 text-sm font-semibold"><input type="checkbox" checked={form.shuffle_questions} onChange={(e)=>setForm({...form,shuffle_questions:e.target.checked})}/> Acak urutan soal</label>
                <label className="flex items-center gap-2 pt-6 text-sm font-semibold"><input type="checkbox" checked={form.shuffle_options} onChange={(e)=>setForm({...form,shuffle_options:e.target.checked})}/> Acak pilihan</label>
            </div>
            <Input label="Deskripsi / petunjuk"><textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="q-input q-textarea" placeholder="Petunjuk kuis, boleh memakai LaTeX…"/></Input>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700"><FileQuestion size={20}/></div><div><p className="text-xs font-bold uppercase tracking-[.15em] text-violet-600">Bank soal kuis ini</p><h3 className="font-extrabold">{quiz.questions?.length ?? 0} soal</h3></div></div>
            <div className="mt-5 space-y-3">{quiz.questions?.map((q) => <article key={q.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Soal {q.position}</span><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">{typeLabels[q.type]}</span><span className="text-xs font-semibold text-slate-400">{q.points} poin</span></div><p data-sipandu-latex-render className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">{q.prompt}</p>{q.options.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{q.options.map(o=><div key={o.key} className={`rounded-xl px-3 py-2 text-sm ${o.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'}`}><b>{o.key}.</b> <span data-sipandu-latex-render>{o.label}</span>{o.correct && <span className="ml-2 text-xs font-bold">✓ benar</span>}</div>)}</div>}</div><button onClick={()=>onDeleteQuestion(q.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button></div></article>)}</div>

            <form onSubmit={onAddQuestion} className="mt-6 rounded-[24px] bg-[#f7f9fd] p-4 sm:p-5">
                <h4 className="font-extrabold">Tambah soal</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-3"><Input label="Jenis soal"><select value={questionForm.type} onChange={(e)=>setQuestionForm({...questionForm,type:e.target.value as QuestionType})} className="q-input">{Object.entries(typeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Input><Input label="Poin"><input type="number" min="0.1" step="0.1" value={questionForm.points} onChange={(e)=>setQuestionForm({...questionForm,points:Number(e.target.value)})} className="q-input"/></Input></div>
                <Input label="Soal"><textarea required value={questionForm.prompt} onChange={(e)=>setQuestionForm({...questionForm,prompt:e.target.value})} className="q-input q-textarea" placeholder="Tulis soal. LaTeX didukung…"/></Input>
                {(questionForm.type === 'multiple_choice' || questionForm.type === 'multiple_select') && <div className="mt-4 grid gap-2">{questionForm.options.map((option,index)=><div key={option.key} className="grid grid-cols-[42px_1fr_90px] items-center gap-2"><b className="text-center text-sm">{option.key}</b><input required value={option.label} onChange={(e)=>{const next=[...questionForm.options];next[index]={...option,label:e.target.value};setQuestionForm({...questionForm,options:next});}} className="q-input !mt-0" placeholder={`Opsi ${option.key}`}/><label className="flex items-center gap-1.5 text-xs font-semibold"><input type={questionForm.type==='multiple_choice'?'radio':'checkbox'} name="correct-option" checked={Boolean(option.correct)} onChange={(e)=>{const next=questionForm.options.map((o,i)=>({...o,correct:questionForm.type==='multiple_choice'?i===index:(i===index?e.target.checked:o.correct)}));setQuestionForm({...questionForm,options:next});}}/> Benar</label></div>)}</div>}
                {questionForm.type === 'true_false' && <Input label="Jawaban benar"><select value={questionForm.trueFalse ? 'true':'false'} onChange={(e)=>setQuestionForm({...questionForm,trueFalse:e.target.value==='true'})} className="q-input"><option value="true">Benar</option><option value="false">Salah</option></select></Input>}
                {questionForm.type === 'short_answer' && <div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input label="Jawaban diterima (pisahkan dengan |)"><input value={questionForm.accepted} onChange={(e)=>setQuestionForm({...questionForm,accepted:e.target.value})} className="q-input" placeholder="mis. 5 | lima"/></Input><label className="flex items-end gap-2 pb-3 text-sm font-semibold"><input type="checkbox" checked={questionForm.caseSensitive} onChange={(e)=>setQuestionForm({...questionForm,caseSensitive:e.target.checked})}/> Case-sensitive</label></div>}
                <Input label="Pembahasan (opsional)"><textarea value={questionForm.explanation} onChange={(e)=>setQuestionForm({...questionForm,explanation:e.target.value})} className="q-input q-textarea" placeholder="Pembahasan / feedback setelah penilaian…"/></Input>
                <button disabled={savingQuestion} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Plus size={16}/>{savingQuestion ? 'Menambahkan…':'Tambah soal'}</button>
            </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-amber-600">Penilaian</p><h3 className="mt-1 text-xl font-extrabold">Submission mahasiswa</h3><div className="mt-4 space-y-3">{!quiz.attempts?.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada submission.</p> : quiz.attempts.map(a=><AttemptReview key={a.id} attempt={a} onGrade={onGradeEssay}/>)}</div></section>
    </div>;
}

function AttemptReview({ attempt, onGrade }: { attempt: Attempt; onGrade: (attemptId:number,answer:Answer,score:number,feedback:string)=>void }) {
    return <article className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold">{attempt.student?.name ?? 'Mahasiswa'} <span className="text-xs font-medium text-slate-400">{attempt.student?.identity_number ?? attempt.student?.email}</span></p><p className="mt-1 text-xs text-slate-500">Percobaan {attempt.attempt_number} · {attempt.status === 'graded' ? `Nilai ${attempt.score}/${attempt.max_score}` : 'Perlu pemeriksaan essay'}</p></div><Status value={attempt.status}/></div><div className="mt-3 space-y-3">{Array.isArray(attempt.answers) && attempt.answers.filter(a=>a.question_type==='essay').map(a=><EssayGrade key={a.id} attemptId={attempt.id} answer={a} onGrade={onGrade}/>)}</div></article>;
}
function EssayGrade({attemptId,answer,onGrade}:{attemptId:number;answer:Answer;onGrade:(attemptId:number,answer:Answer,score:number,feedback:string)=>void}) {
    const [score,setScore]=useState(answer.score ?? 0); const [feedback,setFeedback]=useState(answer.feedback ?? '');
    return <div className="rounded-2xl bg-amber-50/60 p-3"><p className="text-xs font-bold text-amber-800">Essay · maks. {answer.points} poin</p><p data-sipandu-latex-render className="mt-2 whitespace-pre-wrap text-sm font-semibold">{answer.prompt}</p><div className="mt-2 rounded-xl bg-white p-3 text-sm whitespace-pre-wrap">{String((answer.answer as {value?:unknown} | null)?.value ?? '(tidak dijawab)')}</div><div className="mt-3 grid gap-2 sm:grid-cols-[110px_1fr_auto]"><input type="number" min={0} max={answer.points} step="0.1" value={score} onChange={e=>setScore(Number(e.target.value))} className="q-input !mt-0"/><input value={feedback} onChange={e=>setFeedback(e.target.value)} className="q-input !mt-0" placeholder="Feedback dosen"/><button onClick={()=>onGrade(attemptId,answer,score,feedback)} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white">Simpan nilai</button></div></div>;
}

function StudentQuiz({ quiz, attempt, answers, secondsLeft, busy, onStart, onSave, onSubmit }: { quiz: QuizDetail; attempt: Attempt | null; answers: Record<number,Record<string,unknown>>; secondsLeft:number|null; busy:boolean; onStart:()=>void; onSave:(q:Question,v:Record<string,unknown>)=>void; onSubmit:()=>void }) {
    const inProgress = attempt?.status === 'in_progress';
    return <div className="space-y-5"><section className="rounded-[30px] border border-blue-100 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"><GraduationCap size={14}/> Kuis / Ujian</span><h2 className="mt-3 text-3xl font-extrabold">{quiz.title}</h2><p data-sipandu-latex-render className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-600">{quiz.description || 'Baca setiap soal dengan teliti sebelum mengumpulkan.'}</p></div><div className="rounded-2xl bg-slate-50 p-4 text-sm"><p><b>{quiz.questions_count}</b> soal</p><p className="mt-1"><b>{quiz.duration_minutes ?? '—'}</b> {quiz.duration_minutes ? 'menit':'tanpa durasi'}</p><p className="mt-1">Deadline <b>{fmt(quiz.due_at)}</b></p></div></div>{!attempt && <button onClick={onStart} disabled={!quiz.can_start || busy} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"><Sparkles size={17}/>{busy?'Menyiapkan…':'Mulai kuis'}</button>}{attempt && attempt.status !== 'in_progress' && <div className={`mt-5 rounded-2xl p-4 ${attempt.status==='graded'?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}><p className="font-bold">{attempt.status==='graded'?`Nilai ${attempt.score}/${attempt.max_score}`:'Kuis sudah dikumpulkan'}</p><p className="mt-1 text-sm">{attempt.status==='submitted'?'Jawaban essay sedang menunggu penilaian dosen.':'Penilaian otomatis selesai.'}</p></div>}</section>
        {inProgress && <><div className="sticky top-[68px] z-20 flex items-center justify-between rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur"><div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Clock3 size={16} className="text-blue-600"/>{secondsLeft !== null ? `Sisa waktu ${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,'0')}` : 'Jawaban tersimpan selama pengerjaan'}</div><span className="text-xs text-slate-400">Percobaan {attempt.attempt_number}/{quiz.max_attempts}</span></div><section className="space-y-4">{quiz.questions?.map((q,index)=><StudentQuestion key={q.id} q={q} index={index} value={answers[q.id] ?? {}} onSave={onSave}/>)}</section><div className="flex justify-end"><button onClick={onSubmit} disabled={busy} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-60"><Send size={17}/>{busy?'Mengumpulkan…':'Kumpulkan kuis'}</button></div></>}
    </div>;
}
function StudentQuestion({q,index,value,onSave}:{q:Question;index:number;value:Record<string,unknown>;onSave:(q:Question,v:Record<string,unknown>)=>void}) {
    const selected = String(value.value ?? ''); const values = Array.isArray(value.values) ? value.values.map(String) : [];
    return <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Soal {index+1}</span><span className="text-xs font-semibold text-slate-400">{q.points} poin · {typeLabels[q.type]}</span></div><p data-sipandu-latex-render className="mt-4 whitespace-pre-wrap text-base font-semibold leading-8">{q.prompt}</p>
        {(q.type==='multiple_choice'||q.type==='multiple_select') && <div className="mt-4 grid gap-2">{q.options.map(o=>{const checked=q.type==='multiple_choice'?selected===o.key:values.includes(o.key);return <label key={o.key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${checked?'border-blue-300 bg-blue-50':'border-slate-200 hover:border-blue-200'}`}><input className="mt-1" type={q.type==='multiple_choice'?'radio':'checkbox'} name={`q-${q.id}`} checked={checked} onChange={(e)=>{if(q.type==='multiple_choice') void onSave(q,{value:o.key}); else {const next=e.target.checked?[...values,o.key]:values.filter(v=>v!==o.key); void onSave(q,{values:next});}}}/><div><b>{o.key}.</b> <span data-sipandu-latex-render>{o.label}</span></div></label>})}</div>}
        {q.type==='true_false' && <div className="mt-4 flex gap-2">{[['true','Benar'],['false','Salah']].map(([v,l])=><button key={v} type="button" onClick={()=>void onSave(q,{value:v==='true'})} className={`rounded-2xl border px-5 py-3 text-sm font-bold ${String(value.value)===String(v==='true')?'border-blue-300 bg-blue-50 text-blue-700':'border-slate-200'}`}>{l}</button>)}</div>}
        {q.type==='short_answer' && <input defaultValue={String(value.value ?? '')} onBlur={e=>void onSave(q,{value:e.target.value})} className="q-input mt-4" placeholder="Jawaban singkat…"/>}
        {q.type==='essay' && <textarea defaultValue={String(value.value ?? '')} onBlur={e=>void onSave(q,{value:e.target.value})} className="q-input q-textarea mt-4 min-h-[180px]" placeholder="Tulis jawaban essay…"/>}
    </article>;
}

function quizPayload(form: QuizForm) { return { title:form.title,description:form.description||null,sub_cpmk_code:form.sub_cpmk_code||null,duration_minutes:form.duration_minutes?Number(form.duration_minutes):null,max_attempts:form.max_attempts,shuffle_questions:form.shuffle_questions,shuffle_options:form.shuffle_options,starts_at:form.starts_at||null,due_at:form.due_at||null,status:form.status }; }
function questionPayload(form:QuestionForm,position:number) { const base={position,type:form.type,prompt:form.prompt,points:form.points,explanation:form.explanation||null,options:undefined as Option[]|undefined,answer_key:undefined as Record<string,unknown>|undefined}; if(form.type==='multiple_choice'||form.type==='multiple_select') base.options=form.options; if(form.type==='true_false') base.answer_key={value:form.trueFalse}; if(form.type==='short_answer') base.answer_key={accepted:form.accepted.split('|').map(v=>v.trim()).filter(Boolean),case_sensitive:form.caseSensitive}; return base; }
function Input({label,children}:{label:string;children:React.ReactNode}) { return <label className="mt-3 block text-sm font-semibold text-slate-700">{label}{children}</label>; }
function Status({value}:{value:string}) { const cls=value==='published'||value==='in_progress'?'bg-blue-50 text-blue-700':value==='graded'?'bg-emerald-50 text-emerald-700':value==='submitted'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'; const label=value==='published'?'Dibuka':value==='draft'?'Draft':value==='closed'?'Ditutup':value==='graded'?'Dinilai':value==='submitted'?'Perlu dinilai':'Dikerjakan'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{label}</span>; }
function Empty({busy}:{busy:boolean}) { return <div className="grid min-h-[420px] place-items-center rounded-[30px] border border-dashed border-blue-200 bg-white p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">{busy?<LoaderCircle className="animate-spin"/>:<FileQuestion/>}</div><p className="mt-4 font-extrabold">{busy?'Data kuis sedang diproses…':'Pilih kuis dari daftar'}</p><p className="mt-1 text-sm text-slate-500">Detail kuis akan tampil di area ini.</p></div></div>; }

createRoot(document.getElementById('class-quiz-app')!).render(<App/>);



