<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassMembership;
use App\Models\CourseClassQuiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssessmentCenterWithQuizController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $baseResponse = (new AssessmentCenterController)($request);
        $payload = $baseResponse->getData(true);
        $user = $request->user();

        if (! in_array($user->role, [UserRole::Student, UserRole::Lecturer, UserRole::AdminProdi], true)) {
            return $baseResponse;
        }

        $quizItems = $user->role === UserRole::Student
            ? $this->studentQuizzes($user->id)
            : $this->lecturerQuizzes($user->id, $user->role === UserRole::AdminProdi);

        $payload['items'] = collect($payload['items'] ?? [])
            ->concat($quizItems)
            ->sortBy(fn (array $item) => $item['due_at'] ?? '9999-12-31T23:59:59+00:00')
            ->values()
            ->all();

        if ($user->role === UserRole::Student) {
            $all = collect($payload['items']);
            $payload['summary'] = [
                'total' => $all->count(),
                'pending' => $all->where('student_status', 'pending')->count(),
                'submitted' => $all->where('student_status', 'submitted')->count(),
                'graded' => $all->where('student_status', 'graded')->count(),
                'late' => $all->whereIn('student_status', ['late', 'closed'])->count(),
                'quizzes' => $all->where('source_type', 'quiz')->count(),
            ];
        } else {
            $all = collect($payload['items']);
            $payload['summary'] = [
                'assignments' => $all->count(),
                'submissions' => $all->sum('submission_count'),
                'need_review' => $all->where('needs_review', true)->count(),
                'ungraded' => $all->sum('ungraded_count'),
                'graded' => $all->sum('graded_count'),
                'quizzes' => $all->where('source_type', 'quiz')->count(),
            ];
        }

        return response()->json($payload)->header('Cache-Control', 'private, no-store, max-age=0');
    }

    private function studentQuizzes(int $userId): array
    {
        $classIds = CourseClassMembership::query()
            ->where('user_id', $userId)
            ->where('membership_role', 'student')
            ->where('status', 'active')
            ->pluck('course_class_id');

        return CourseClassQuiz::query()
            ->with(['courseClass.course', 'attempts' => fn ($q) => $q->where('user_id', $userId)->orderByDesc('attempt_number')])
            ->withSum('questions as points_total', 'points')
            ->whereIn('course_class_id', $classIds)
            ->whereIn('status', ['published', 'closed'])
            ->limit(300)
            ->get()
            ->map(function (CourseClassQuiz $quiz): array {
                $attempt = $quiz->attempts->first();
                $graded = $attempt?->status === 'graded';
                $submitted = $attempt?->status === 'submitted';
                $overdue = (bool) ($quiz->due_at && $quiz->due_at->isPast());
                $status = match (true) {
                    $graded => 'graded',
                    $submitted => 'submitted',
                    $attempt?->status === 'in_progress' => 'pending',
                    $overdue => 'late',
                    $quiz->status === 'closed' => 'closed',
                    default => 'pending',
                };
                $class = $quiz->courseClass;
                $course = $class?->course;

                return [
                    'id' => $quiz->id,
                    'source_type' => 'quiz',
                    'title' => $quiz->title,
                    'sub_cpmk_code' => $quiz->sub_cpmk_code,
                    'class_id' => $class?->id,
                    'class_name' => $class ? trim(($course?->name ?? 'Kelas').' — Kelas '.$class->name) : 'Kelas',
                    'course_code' => $course?->code,
                    'meeting_number' => null,
                    'due_at' => $quiz->due_at?->toIso8601String(),
                    'assignment_status' => $quiz->status,
                    'student_status' => $status,
                    'submitted_at' => $attempt?->submitted_at?->toIso8601String(),
                    'graded_at' => $attempt?->status === 'graded' ? $attempt->updated_at?->toIso8601String() : null,
                    'score' => $attempt?->score !== null ? (float) $attempt->score : null,
                    'max_score' => $attempt ? (float) $attempt->max_score : (float) ($quiz->points_total ?? 0),
                    'feedback' => null,
                    'submission_count' => $attempt?->submitted_at ? 1 : 0,
                    'ungraded_count' => $submitted ? 1 : 0,
                    'graded_count' => $graded ? 1 : 0,
                    'needs_review' => false,
                    'class_url' => $class ? "/kelas/{$class->id}/kuis?quiz={$quiz->id}" : null,
                ];
            })->values()->all();
    }

    private function lecturerQuizzes(int $userId, bool $isAdmin): array
    {
        $classIds = $isAdmin
            ? CourseClass::query()->pluck('id')
            : CourseClassMembership::query()
                ->where('user_id', $userId)
                ->where('membership_role', 'lecturer')
                ->where('status', 'active')
                ->pluck('course_class_id');

        return CourseClassQuiz::query()
            ->with('courseClass.course')
            ->withCount([
                'attempts as submission_count' => fn ($q) => $q->whereNotNull('submitted_at'),
                'attempts as ungraded_count' => fn ($q) => $q->where('status', 'submitted'),
                'attempts as graded_count' => fn ($q) => $q->where('status', 'graded'),
            ])
            ->whereIn('course_class_id', $classIds)
            ->limit(300)
            ->get()
            ->map(function (CourseClassQuiz $quiz): array {
                $class = $quiz->courseClass;
                $course = $class?->course;
                $ungraded = (int) ($quiz->ungraded_count ?? 0);
                return [
                    'id' => $quiz->id,
                    'source_type' => 'quiz',
                    'title' => $quiz->title,
                    'sub_cpmk_code' => $quiz->sub_cpmk_code,
                    'class_id' => $class?->id,
                    'class_name' => $class ? trim(($course?->name ?? 'Kelas').' — Kelas '.$class->name) : 'Kelas',
                    'course_code' => $course?->code,
                    'meeting_number' => null,
                    'due_at' => $quiz->due_at?->toIso8601String(),
                    'assignment_status' => $quiz->status,
                    'student_status' => null,
                    'submitted_at' => null,
                    'graded_at' => null,
                    'score' => null,
                    'max_score' => null,
                    'feedback' => null,
                    'submission_count' => (int) ($quiz->submission_count ?? 0),
                    'ungraded_count' => $ungraded,
                    'graded_count' => (int) ($quiz->graded_count ?? 0),
                    'needs_review' => $ungraded > 0,
                    'class_url' => $class ? "/kelas/{$class->id}/kuis?quiz={$quiz->id}" : null,
                ];
            })->values()->all();
    }
}
