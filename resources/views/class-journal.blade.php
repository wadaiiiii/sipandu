<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Rekap Pembelajaran — SiPANDU</title>
    @vite(['resources/css/app.css'])
    <style>
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            .print-card { box-shadow: none !important; break-inside: avoid; }
        }
    </style>
</head>
<body class="bg-[#f4f7ff] text-slate-950">
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div class="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
            <a href="/kelas/{{ $courseClass->id }}" class="rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm">← Kembali ke kelas</a>
            <button onclick="window.print()" class="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-100">Cetak / Simpan PDF</button>
        </div>

        <section class="print-card overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#03122f_0%,#071b56_55%,#1764ff_100%)] p-7 text-white shadow-2xl shadow-blue-950/10 sm:p-9">
            <p class="text-xs font-bold uppercase tracking-[.18em] text-blue-200">SiPANDU Class Portfolio</p>
            <h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{{ $courseClass->course->name }}</h1>
            <p class="mt-2 text-blue-100">{{ $courseClass->course->code }} · {{ $courseClass->course->credits }} SKS · Kelas {{ $courseClass->name }}</p>
            <p class="mt-1 text-sm text-blue-200">{{ ucfirst($courseClass->academicTerm->semester) }} {{ $courseClass->academicTerm->academic_year }}</p>

            <div class="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <div class="rounded-2xl border border-white/15 bg-white/10 p-3"><p class="text-2xl font-bold">{{ $summary['completed_meetings'] }}/16</p><p class="mt-1 text-xs text-blue-100">Pertemuan selesai</p></div>
                <div class="rounded-2xl border border-white/15 bg-white/10 p-3"><p class="text-2xl font-bold">{{ $summary['materials'] }}</p><p class="mt-1 text-xs text-blue-100">Materi</p></div>
                <div class="rounded-2xl border border-white/15 bg-white/10 p-3"><p class="text-2xl font-bold">{{ $summary['assignments'] }}</p><p class="mt-1 text-xs text-blue-100">Tugas</p></div>
                <div class="rounded-2xl border border-white/15 bg-white/10 p-3"><p class="text-2xl font-bold">{{ $summary['submissions'] }}</p><p class="mt-1 text-xs text-blue-100">Pengumpulan</p></div>
                <div class="rounded-2xl border border-white/15 bg-white/10 p-3"><p class="text-2xl font-bold">{{ $summary['graded'] }}</p><p class="mt-1 text-xs text-blue-100">Dinilai</p></div>
                <div class="rounded-2xl border border-white/15 bg-white/10 p-3"><p class="text-2xl font-bold">{{ $summary['comments'] }}</p><p class="mt-1 text-xs text-blue-100">Diskusi</p></div>
                <div class="rounded-2xl border border-white/15 bg-white/10 p-3"><p class="text-2xl font-bold">{{ $students->count() }}</p><p class="mt-1 text-xs text-blue-100">Mahasiswa</p></div>
            </div>
        </section>

        <section class="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
            <div class="space-y-4">
                <div class="print-card rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                    <p class="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Learning Timeline</p>
                    <h2 class="mt-1 text-xl font-bold">Rekap Pembelajaran per Pertemuan</h2>
                    <p class="mt-1 text-sm text-slate-500">Disusun otomatis dari aktivitas kelas di SiPANDU.</p>
                </div>

                @foreach ($courseClass->meetings as $meeting)
                    @php
                        $submissionCount = $meeting->assignments->sum(fn ($assignment) => $assignment->submissions->whereNotNull('submitted_at')->count());
                        $gradedCount = $meeting->assignments->sum(fn ($assignment) => $assignment->submissions->whereNotNull('score')->count());
                        $materialIds = $meeting->materials->pluck('id');
                        $assignmentIds = $meeting->assignments->pluck('id');
                        $discussionCount = $comments->filter(function ($comment) use ($meeting, $materialIds, $assignmentIds) {
                            return $comment->course_class_meeting_id === $meeting->id
                                || ($comment->course_class_material_id && $materialIds->contains($comment->course_class_material_id))
                                || ($comment->course_class_assignment_id && $assignmentIds->contains($comment->course_class_assignment_id));
                        })->count();
                    @endphp
                    <article class="print-card rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                        <div class="flex gap-4">
                            <div class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl {{ $meeting->status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700' }} text-sm font-bold">{{ $meeting->meeting_number }}</div>
                            <div class="min-w-0 flex-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <h3 class="font-bold">{{ $meeting->title ?: 'Pertemuan '.$meeting->meeting_number }}</h3>
                                    <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{{ $meeting->status === 'completed' ? 'Selesai' : ($meeting->status === 'published' ? 'Terbit' : 'Rencana') }}</span>
                                </div>
                                <p class="mt-1 text-xs text-slate-400">{{ $meeting->starts_at ? $meeting->starts_at->format('d M Y H:i') : 'Belum dijadwalkan' }}</p>
                                @if ($meeting->topic)
                                    <p class="mt-3 text-sm leading-6 text-slate-700"><strong>Topik:</strong> {{ $meeting->topic }}</p>
                                @endif
                                @if ($meeting->learning_activity)
                                    <p class="mt-2 text-sm leading-6 text-slate-600"><strong>Aktivitas:</strong> {{ $meeting->learning_activity }}</p>
                                @endif
                                <div class="mt-4 flex flex-wrap gap-2 text-xs">
                                    <span class="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{{ $meeting->materials->count() }} materi</span>
                                    <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">{{ $meeting->assignments->count() }} tugas</span>
                                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{{ $submissionCount }} pengumpulan</span>
                                    <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{{ $gradedCount }} dinilai</span>
                                    @if ($discussionCount > 0)
                                        <span class="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">{{ $discussionCount }} diskusi</span>
                                    @endif
                                </div>
                            </div>
                        </div>
                    </article>
                @endforeach
            </div>

            <aside class="space-y-4">
                <section class="print-card rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
                    <p class="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Pengajar</p>
                    <div class="mt-4 space-y-3">
                        @forelse ($lecturers as $membership)
                            <div class="rounded-2xl bg-slate-50 p-3">
                                <p class="text-sm font-bold">{{ $membership->user->name }}</p>
                                <p class="mt-1 text-xs text-slate-500">{{ $membership->user->identity_number ?: $membership->user->email }}</p>
                            </div>
                        @empty
                            <p class="text-sm text-slate-500">Belum ada dosen.</p>
                        @endforelse
                    </div>
                </section>

                <section class="print-card rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
                    <p class="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Pengumuman</p>
                    <p class="mt-2 text-3xl font-bold text-[#08205d]">{{ $summary['announcements'] }}</p>
                    <div class="mt-4 space-y-3">
                        @foreach ($announcements->take(5) as $announcement)
                            <div class="rounded-2xl bg-blue-50 p-3">
                                <p class="text-xs font-semibold text-blue-700">{{ $announcement->author?->name ?: 'Pengajar' }}</p>
                                <p class="mt-1 text-sm leading-5 text-slate-700">{{ \Illuminate\Support\Str::limit($announcement->body, 110) }}</p>
                            </div>
                        @endforeach
                    </div>
                </section>

                <section class="print-card rounded-[28px] border border-violet-100 bg-white p-5 shadow-sm">
                    <div class="flex items-end justify-between gap-3">
                        <div><p class="text-xs font-bold uppercase tracking-[.14em] text-violet-600">Diskusi kelas</p><p class="mt-2 text-3xl font-bold text-[#08205d]">{{ $summary['comments'] }}</p></div>
                        <span class="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">Terdokumentasi</span>
                    </div>
                    <div class="mt-4 space-y-3">
                        @forelse ($comments->take(5) as $comment)
                            <div class="rounded-2xl bg-violet-50/70 p-3">
                                <p class="text-xs font-semibold text-violet-700">{{ $comment->author?->name ?: 'Pengguna' }}</p>
                                <p class="mt-1 text-sm leading-5 text-slate-700">{{ \Illuminate\Support\Str::limit($comment->body, 110) }}</p>
                            </div>
                        @empty
                            <p class="text-sm text-slate-500">Belum ada diskusi kelas.</p>
                        @endforelse
                    </div>
                </section>

                <section class="print-card rounded-[28px] bg-[#071b56] p-5 text-white shadow-sm">
                    <p class="text-xs font-semibold text-blue-200">Dibentuk otomatis</p>
                    <h3 class="mt-2 text-lg font-bold">Tanpa isi ulang laporan kelas</h3>
                    <p class="mt-2 text-sm leading-6 text-blue-100">Setiap materi, tugas, pengumpulan, nilai, diskusi, dan aktivitas pertemuan membentuk rekam jejak kelas secara otomatis.</p>
                </section>
            </aside>
        </section>
    </main>
</body>
</html>
