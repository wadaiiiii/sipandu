<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassQuiz;
use App\Models\QuizAnswer;
use App\Models\QuizAttempt;
use App\Models\QuizQuestion;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CourseClassQuizController extends Controller
{
    private const TYPES = ['multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'essay'];

    public function index(Request $request, CourseClass $courseClass): JsonResponse
    {
        $user = $request->user();
        $this->ensureAccess($user, $courseClass);

        $query = CourseClassQuiz::query()
            ->where('course_class_id', $courseClass->id)
            ->withCount('questions')
            ->orderByRaw("CASE status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END")
            ->orderBy('due_at');

        if ($user->role === UserRole::Student) {
            $query->whereIn('status', ['published', 'closed'])
                ->with(['attempts' => fn ($q) => $q->where('user_id', $user->id)->orderByDesc('attempt_number')]);
        } else {
            abort_unless($this->canEdit($user, $courseClass), 403);
            $query->withCount([
                'attempts as attempt_count' => fn ($q) => $q->whereNotNull('submitted_at'),
                'attempts as need_review_count' => fn ($q) => $q->where('status', 'submitted'),
                'attempts as graded_count' => fn ($q) => $q->where('status', 'graded'),
            ]);
        }

        $items = $query->get()->map(function (CourseClassQuiz $quiz) use ($user): array {
            $base = $this->quizSummary($quiz);
            if ($user->role === UserRole::Student) {
                $attempt = $quiz->attempts->first();
                $attemptsUsed = $quiz->attempts->count();
                return [
                    ...$base,
                    'attempts_used' => $attemptsUsed,
                    'can_start' => $this->quizOpen($quiz) && $attemptsUsed < $quiz->max_attempts && ! ($attempt && $attempt->status === 'in_progress'),
                    'latest_attempt' => $attempt ? $this->attemptSummary($attempt) : null,
                ];
            }

            return [
                ...$base,
                'attempt_count' => (int) ($quiz->attempt_count ?? 0),
                'need_review_count' => (int) ($quiz->need_review_count ?? 0),
                'graded_count' => (int) ($quiz->graded_count ?? 0),
            ];
        })->values();

        return response()->json([
            'viewer_role' => $user->role->value,
            'can_edit' => $this->canEdit($user, $courseClass),
            'quizzes' => $items,
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }

    public function show(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz): JsonResponse
    {
        $this->ensureQuiz($courseClass, $quiz);
        $user = $request->user();
        $this->ensureAccess($user, $courseClass);

        if ($user->role === UserRole::Student) {
            abort_unless(in_array($quiz->status, ['published', 'closed'], true), 404);
            $attempt = $quiz->attempts()->where('user_id', $user->id)->latest('attempt_number')->first();
            return response()->json([
                'quiz' => $this->studentQuizPayload($quiz, $attempt),
                'attempt' => $attempt ? $this->studentAttemptPayload($attempt) : null,
            ])->header('Cache-Control', 'private, no-store, max-age=0');
        }

        abort_unless($this->canEdit($user, $courseClass), 403);
        $quiz->load(['questions.options', 'attempts.student', 'attempts.answers.question']);

        return response()->json([
            'quiz' => [
                ...$this->quizSummary($quiz),
                'description' => $quiz->description,
                'questions' => $quiz->questions->map(fn (QuizQuestion $question) => $this->authorQuestion($question))->values(),
                'attempts' => $quiz->attempts->sortByDesc('submitted_at')->map(fn (QuizAttempt $attempt) => [
                    ...$this->attemptSummary($attempt),
                    'student' => $attempt->student ? [
                        'id' => $attempt->student->id,
                        'name' => $attempt->student->name,
                        'identity_number' => $attempt->student->identity_number,
                        'email' => $attempt->student->email,
                    ] : null,
                    'answers' => $attempt->answers->map(fn (QuizAnswer $answer) => [
                        'id' => $answer->id,
                        'question_id' => $answer->quiz_question_id,
                        'question_type' => $answer->question?->type,
                        'prompt' => $answer->question?->prompt,
                        'points' => $answer->question ? (float) $answer->question->points : 0,
                        'answer' => $answer->answer,
                        'score' => $answer->score !== null ? (float) $answer->score : null,
                        'feedback' => $answer->feedback,
                    ])->values(),
                ])->values(),
            ],
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }

    public function store(Request $request, CourseClass $courseClass): JsonResponse
    {
        abort_unless($this->canEdit($request->user(), $courseClass), 403);
        $validated = $this->validateQuiz($request);
        $quiz = CourseClassQuiz::query()->create([
            ...$validated,
            'course_class_id' => $courseClass->id,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['quiz' => $this->quizSummary($quiz)], 201);
    }

    public function update(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz): JsonResponse
    {
        $this->ensureQuiz($courseClass, $quiz);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);
        $quiz->update($this->validateQuiz($request));

        return response()->json(['quiz' => $this->quizSummary($quiz->fresh())]);
    }

    public function storeQuestion(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz): JsonResponse
    {
        $this->ensureQuiz($courseClass, $quiz);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);
        abort_if($quiz->attempts()->exists(), 422, 'Soal tidak dapat ditambah setelah kuis mulai dikerjakan.');

        $payload = $this->validateQuestion($request);
        $question = DB::transaction(function () use ($quiz, $payload): QuizQuestion {
            $options = $payload['options'] ?? [];
            unset($payload['options']);
            $question = $quiz->questions()->create($payload);
            $this->syncOptions($question, $options);
            return $question;
        });

        return response()->json(['question' => $this->authorQuestion($question->load('options'))], 201);
    }

    public function updateQuestion(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz, QuizQuestion $question): JsonResponse
    {
        $this->ensureQuiz($courseClass, $quiz);
        $this->ensureQuestion($quiz, $question);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);
        abort_if($quiz->attempts()->exists(), 422, 'Soal tidak dapat diubah setelah kuis mulai dikerjakan.');

        $payload = $this->validateQuestion($request);
        DB::transaction(function () use ($question, $payload): void {
            $options = $payload['options'] ?? [];
            unset($payload['options']);
            $question->update($payload);
            $this->syncOptions($question, $options);
        });

        return response()->json(['question' => $this->authorQuestion($question->fresh()->load('options'))]);
    }

    public function destroyQuestion(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz, QuizQuestion $question): JsonResponse
    {
        $this->ensureQuiz($courseClass, $quiz);
        $this->ensureQuestion($quiz, $question);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);
        abort_if($quiz->attempts()->exists(), 422, 'Soal tidak dapat dihapus setelah kuis mulai dikerjakan.');
        $question->delete();

        return response()->json(['ok' => true]);
    }

    public function start(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz): JsonResponse
    {
        $this->ensureQuiz($courseClass, $quiz);
        $user = $request->user();
        abort_unless($user->role === UserRole::Student && $this->isMember($user, $courseClass, 'student'), 403);
        abort_unless($this->quizOpen($quiz), 422, 'Kuis belum tersedia atau batas waktunya telah berakhir.');
        abort_if($quiz->questions()->count() === 0, 422, 'Kuis belum memiliki soal.');

        $existing = $quiz->attempts()->where('user_id', $user->id)->where('status', 'in_progress')->latest('attempt_number')->first();
        if ($existing) {
            return response()->json(['attempt' => $this->studentAttemptPayload($existing)]);
        }

        $used = $quiz->attempts()->where('user_id', $user->id)->count();
        abort_if($used >= $quiz->max_attempts, 422, 'Batas percobaan kuis telah tercapai.');

        $attempt = $quiz->attempts()->create([
            'user_id' => $user->id,
            'attempt_number' => $used + 1,
            'status' => 'in_progress',
            'started_at' => now(),
            'max_score' => (float) $quiz->questions()->sum('points'),
        ]);

        return response()->json([
            'quiz' => $this->studentQuizPayload($quiz, $attempt),
            'attempt' => $this->studentAttemptPayload($attempt),
        ], 201);
    }

    public function saveAnswer(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz, QuizAttempt $attempt, QuizQuestion $question): JsonResponse
    {
        $this->ensureAttempt($request, $courseClass, $quiz, $attempt);
        $this->ensureQuestion($quiz, $question);
        $this->ensureAttemptOpen($quiz, $attempt);

        $validated = $request->validate(['answer' => ['nullable', 'array']]);
        $answer = $attempt->answers()->updateOrCreate(
            ['quiz_question_id' => $question->id],
            ['answer' => $validated['answer'] ?? null, 'score' => null, 'is_correct' => null, 'feedback' => null, 'graded_by' => null, 'graded_at' => null],
        );

        return response()->json(['ok' => true, 'answer_id' => $answer->id]);
    }

    public function submit(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz, QuizAttempt $attempt): JsonResponse
    {
        $this->ensureAttempt($request, $courseClass, $quiz, $attempt);
        $this->ensureAttemptOpen($quiz, $attempt, true);
        $quiz->load('questions.options');
        $attempt->load('answers');

        $answersByQuestion = $attempt->answers->keyBy('quiz_question_id');
        $autoScore = 0.0;
        $hasEssayToReview = false;

        DB::transaction(function () use ($quiz, $attempt, $answersByQuestion, &$autoScore, &$hasEssayToReview): void {
            foreach ($quiz->questions as $question) {
                $answer = $answersByQuestion->get($question->id) ?? $attempt->answers()->create([
                    'quiz_question_id' => $question->id,
                    'answer' => null,
                ]);

                if ($question->type === 'essay') {
                    $value = trim((string) Arr::get($answer->answer ?? [], 'value', ''));
                    if ($value === '') {
                        $answer->update(['score' => 0, 'is_correct' => false, 'graded_at' => now()]);
                    } else {
                        $answer->update(['score' => null, 'is_correct' => null]);
                        $hasEssayToReview = true;
                    }
                    continue;
                }

                [$correct, $score] = $this->autoGrade($question, $answer->answer);
                $answer->update(['is_correct' => $correct, 'score' => $score, 'graded_at' => now()]);
                $autoScore += $score;
            }

            $attempt->update([
                'submitted_at' => now(),
                'auto_score' => $autoScore,
                'manual_score' => 0,
                'score' => $hasEssayToReview ? null : $autoScore,
                'status' => $hasEssayToReview ? 'submitted' : 'graded',
            ]);
        });

        return response()->json(['attempt' => $this->attemptSummary($attempt->fresh())]);
    }

    public function gradeEssay(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz, QuizAttempt $attempt, QuizAnswer $answer): JsonResponse
    {
        $this->ensureQuiz($courseClass, $quiz);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);
        abort_unless($attempt->course_class_quiz_id === $quiz->id && $answer->quiz_attempt_id === $attempt->id, 404);
        $answer->loadMissing('question');
        abort_unless($answer->question?->type === 'essay', 422);

        $validated = $request->validate([
            'score' => ['required', 'numeric', 'min:0'],
            'feedback' => ['nullable', 'string', 'max:10000'],
        ]);
        abort_if((float) $validated['score'] > (float) $answer->question->points, 422, 'Nilai melebihi bobot soal.');

        $answer->update([
            'score' => $validated['score'],
            'feedback' => $validated['feedback'] ?? null,
            'graded_by' => $request->user()->id,
            'graded_at' => now(),
        ]);

        $pendingEssay = $attempt->answers()
            ->whereHas('question', fn ($q) => $q->where('type', 'essay'))
            ->whereNull('score')
            ->exists();
        $manual = (float) $attempt->answers()->whereHas('question', fn ($q) => $q->where('type', 'essay'))->sum('score');
        $attempt->update([
            'manual_score' => $manual,
            'score' => $pendingEssay ? null : (float) $attempt->auto_score + $manual,
            'status' => $pendingEssay ? 'submitted' : 'graded',
        ]);

        return response()->json(['attempt' => $this->attemptSummary($attempt->fresh())]);
    }

    private function validateQuiz(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:15000'],
            'sub_cpmk_code' => ['nullable', 'string', 'max:80'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'max_attempts' => ['required', 'integer', 'min:1', 'max:10'],
            'shuffle_questions' => ['required', 'boolean'],
            'shuffle_options' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['draft', 'published', 'closed'])],
        ]);
    }

    private function validateQuestion(Request $request): array
    {
        $validated = $request->validate([
            'position' => ['required', 'integer', 'min:1', 'max:1000'],
            'type' => ['required', Rule::in(self::TYPES)],
            'prompt' => ['required', 'string', 'max:20000'],
            'points' => ['required', 'numeric', 'gt:0', 'max:1000'],
            'answer_key' => ['nullable', 'array'],
            'explanation' => ['nullable', 'string', 'max:10000'],
            'options' => ['nullable', 'array', 'max:20'],
            'options.*.key' => ['required_with:options', 'string', 'max:20'],
            'options.*.label' => ['required_with:options', 'string', 'max:5000'],
            'options.*.correct' => ['required_with:options', 'boolean'],
        ]);

        $type = $validated['type'];
        $options = $validated['options'] ?? [];
        if (in_array($type, ['multiple_choice', 'multiple_select'], true)) {
            if (count($options) < 2) throw ValidationException::withMessages(['options' => 'Pilihan ganda membutuhkan minimal dua opsi.']);
            $correctCount = collect($options)->where('correct', true)->count();
            if ($type === 'multiple_choice' && $correctCount !== 1) throw ValidationException::withMessages(['options' => 'Pilihan ganda harus memiliki tepat satu jawaban benar.']);
            if ($type === 'multiple_select' && $correctCount < 1) throw ValidationException::withMessages(['options' => 'Pilihan ganda kompleks membutuhkan minimal satu jawaban benar.']);
        }
        if ($type === 'true_false' && ! array_key_exists('value', $validated['answer_key'] ?? [])) {
            throw ValidationException::withMessages(['answer_key' => 'Pilih jawaban benar atau salah.']);
        }
        if ($type === 'short_answer' && count($validated['answer_key']['accepted'] ?? []) < 1) {
            throw ValidationException::withMessages(['answer_key' => 'Isi minimal satu jawaban yang diterima.']);
        }
        if ($type === 'essay') $validated['answer_key'] = null;

        return $validated;
    }

    private function syncOptions(QuizQuestion $question, array $options): void
    {
        $question->options()->delete();
        if (! in_array($question->type, ['multiple_choice', 'multiple_select'], true)) return;
        foreach (array_values($options) as $index => $option) {
            $question->options()->create([
                'position' => $index + 1,
                'option_key' => strtoupper(trim($option['key'])),
                'label' => $option['label'],
                'is_correct' => (bool) $option['correct'],
            ]);
        }
    }

    private function autoGrade(QuizQuestion $question, ?array $answer): array
    {
        $points = (float) $question->points;
        $correct = false;
        if ($question->type === 'multiple_choice') {
            $expected = $question->options->firstWhere('is_correct', true)?->option_key;
            $correct = $expected !== null && strtoupper((string) Arr::get($answer ?? [], 'value', '')) === strtoupper($expected);
        } elseif ($question->type === 'multiple_select') {
            $expected = $question->options->where('is_correct', true)->pluck('option_key')->map(fn ($v) => strtoupper($v))->sort()->values()->all();
            $actual = collect(Arr::get($answer ?? [], 'values', []))->map(fn ($v) => strtoupper((string) $v))->unique()->sort()->values()->all();
            $correct = $expected === $actual;
        } elseif ($question->type === 'true_false') {
            $correct = Arr::get($answer ?? [], 'value') === Arr::get($question->answer_key ?? [], 'value');
        } elseif ($question->type === 'short_answer') {
            $caseSensitive = (bool) Arr::get($question->answer_key ?? [], 'case_sensitive', false);
            $actual = trim((string) Arr::get($answer ?? [], 'value', ''));
            $accepted = collect(Arr::get($question->answer_key ?? [], 'accepted', []))->map(fn ($v) => trim((string) $v));
            $correct = $caseSensitive
                ? $accepted->contains(fn ($v) => $v === $actual)
                : $accepted->contains(fn ($v) => mb_strtolower($v) === mb_strtolower($actual));
        }

        return [$correct, $correct ? $points : 0.0];
    }

    private function studentQuizPayload(CourseClassQuiz $quiz, ?QuizAttempt $attempt): array
    {
        $quiz->loadMissing('questions.options');
        $questions = $quiz->questions;
        if ($quiz->shuffle_questions) $questions = $questions->shuffle();

        return [
            ...$this->quizSummary($quiz),
            'description' => $quiz->description,
            'questions' => $questions->map(function (QuizQuestion $question) use ($quiz): array {
                $options = $question->options;
                if ($quiz->shuffle_options) $options = $options->shuffle();
                return [
                    'id' => $question->id,
                    'position' => $question->position,
                    'type' => $question->type,
                    'prompt' => $question->prompt,
                    'points' => (float) $question->points,
                    'options' => $options->map(fn ($option) => [
                        'key' => $option->option_key,
                        'label' => $option->label,
                    ])->values(),
                ];
            })->values(),
            'attempts_used' => $quiz->attempts()->where('user_id', request()->user()->id)->count(),
            'can_start' => $this->quizOpen($quiz),
            'current_attempt_id' => $attempt?->id,
        ];
    }

    private function studentAttemptPayload(QuizAttempt $attempt): array
    {
        $attempt->loadMissing('answers');
        return [
            ...$this->attemptSummary($attempt),
            'answers' => $attempt->answers->mapWithKeys(fn (QuizAnswer $answer) => [
                (string) $answer->quiz_question_id => $answer->answer,
            ]),
        ];
    }

    private function authorQuestion(QuizQuestion $question): array
    {
        $question->loadMissing('options');
        return [
            'id' => $question->id,
            'position' => $question->position,
            'type' => $question->type,
            'prompt' => $question->prompt,
            'points' => (float) $question->points,
            'answer_key' => $question->answer_key,
            'explanation' => $question->explanation,
            'options' => $question->options->map(fn ($option) => [
                'id' => $option->id,
                'key' => $option->option_key,
                'label' => $option->label,
                'correct' => $option->is_correct,
            ])->values(),
        ];
    }

    private function quizSummary(CourseClassQuiz $quiz): array
    {
        return [
            'id' => $quiz->id,
            'title' => $quiz->title,
            'sub_cpmk_code' => $quiz->sub_cpmk_code,
            'duration_minutes' => $quiz->duration_minutes,
            'max_attempts' => $quiz->max_attempts,
            'shuffle_questions' => $quiz->shuffle_questions,
            'shuffle_options' => $quiz->shuffle_options,
            'starts_at' => $quiz->starts_at?->toIso8601String(),
            'due_at' => $quiz->due_at?->toIso8601String(),
            'status' => $quiz->status,
            'questions_count' => (int) ($quiz->questions_count ?? $quiz->questions()->count()),
        ];
    }

    private function attemptSummary(QuizAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'attempt_number' => $attempt->attempt_number,
            'status' => $attempt->status,
            'started_at' => $attempt->started_at?->toIso8601String(),
            'submitted_at' => $attempt->submitted_at?->toIso8601String(),
            'score' => $attempt->score !== null ? (float) $attempt->score : null,
            'max_score' => (float) $attempt->max_score,
        ];
    }

    private function quizOpen(CourseClassQuiz $quiz): bool
    {
        if ($quiz->status !== 'published') return false;
        if ($quiz->starts_at && $quiz->starts_at->isFuture()) return false;
        if ($quiz->due_at && $quiz->due_at->isPast()) return false;
        return true;
    }

    private function ensureAttemptOpen(CourseClassQuiz $quiz, QuizAttempt $attempt, bool $allowExpiredSubmit = false): void
    {
        abort_unless($attempt->status === 'in_progress', 422, 'Percobaan ini sudah selesai.');
        if ($quiz->duration_minutes) {
            $expires = $attempt->started_at->copy()->addMinutes($quiz->duration_minutes);
            if ($expires->isPast() && ! $allowExpiredSubmit) abort(422, 'Waktu pengerjaan kuis telah habis.');
        }
        if ($quiz->due_at && $quiz->due_at->isPast() && ! $allowExpiredSubmit) abort(422, 'Batas waktu kuis telah berakhir.');
    }

    private function ensureAttempt(Request $request, CourseClass $courseClass, CourseClassQuiz $quiz, QuizAttempt $attempt): void
    {
        $this->ensureQuiz($courseClass, $quiz);
        abort_unless($request->user()->role === UserRole::Student, 403);
        abort_unless($this->isMember($request->user(), $courseClass, 'student'), 403);
        abort_unless($attempt->course_class_quiz_id === $quiz->id && $attempt->user_id === $request->user()->id, 404);
    }

    private function ensureQuiz(CourseClass $courseClass, CourseClassQuiz $quiz): void
    {
        abort_unless($quiz->course_class_id === $courseClass->id, 404);
    }

    private function ensureQuestion(CourseClassQuiz $quiz, QuizQuestion $question): void
    {
        abort_unless($question->course_class_quiz_id === $quiz->id, 404);
    }

    private function ensureAccess(User $user, CourseClass $courseClass): void
    {
        if ($user->role === UserRole::AdminProdi) return;
        abort_unless($this->isMember($user, $courseClass), 403);
    }

    private function canEdit(User $user, CourseClass $courseClass): bool
    {
        return $user->role === UserRole::AdminProdi
            || ($user->role === UserRole::Lecturer && $this->isMember($user, $courseClass, 'lecturer'));
    }

    private function isMember(User $user, CourseClass $courseClass, ?string $role = null): bool
    {
        $query = $courseClass->memberships()->where('user_id', $user->id)->where('status', 'active');
        if ($role) $query->where('membership_role', $role);
        return $query->exists();
    }
}
