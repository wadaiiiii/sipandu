<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassMembership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssessmentCenterController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless(in_array($user->role, [UserRole::Student, UserRole::Lecturer, UserRole::AdminProdi], true), 403);

        return $user->role === UserRole::Student
            ? $this->studentPayload($user->id)
            : $this->lecturerPayload($user->id, $user->role === UserRole::AdminProdi);
    }

    private function studentPayload(int $userId): JsonResponse
    {
        $classIds = CourseClassMembership::query()
            ->where('user_id', $userId)
            ->where('membership_role', 'student')
            ->where('status', 'active')
            ->pluck('course_class_id');

        $assignments = CourseClassAssignment::query()
            ->select([
                'id', 'course_class_meeting_id', 'title', 'sub_cpmk_code', 'max_score',
                'due_at', 'status', 'created_at',
            ])
            ->with([
                'meeting:id,course_class_id,meeting_number,title',
                'meeting.courseClass:id,course_id,name,status',
                'meeting.courseClass.course:id,code,name',
                'submissions' => fn ($query) => $query
                    ->select([
                        'id', 'course_class_assignment_id', 'user_id', 'submitted_at', 'score',
                        'feedback', 'graded_at',
                    ])
                    ->where('user_id', $userId),
            ])
            ->whereHas('meeting', fn ($query) => $query->whereIn('course_class_id', $classIds))
            ->whereIn('status', ['published', 'closed'])
            ->orderByRaw('CASE WHEN due_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('due_at')
            ->limit(500)
            ->get();

        $items = $assignments->map(function (CourseClassAssignment $assignment): array {
            $submission = $assignment->submissions->first();
            $dueAt = $assignment->due_at;
            $submitted = (bool) $submission?->submitted_at;
            $graded = (bool) ($submission?->graded_at || $submission?->score !== null);
            $overdue = (bool) ($dueAt && $dueAt->isPast());

            $studentStatus = match (true) {
                $graded => 'graded',
                $submitted => 'submitted',
                $overdue => 'late',
                $assignment->status === 'closed' => 'closed',
                default => 'pending',
            };

            $courseClass = $assignment->meeting?->courseClass;
            $course = $courseClass?->course;

            return [
                'id' => $assignment->id,
                'source_type' => 'assignment',
                'title' => $assignment->title,
                'sub_cpmk_code' => $assignment->sub_cpmk_code,
                'class_id' => $courseClass?->id,
                'class_name' => $courseClass ? trim(($course?->name ?? 'Kelas').' — Kelas '.$courseClass->name) : 'Kelas',
                'course_code' => $course?->code,
                'meeting_number' => $assignment->meeting?->meeting_number,
                'due_at' => $dueAt?->toIso8601String(),
                'assignment_status' => $assignment->status,
                'student_status' => $studentStatus,
                'submitted_at' => $submission?->submitted_at?->toIso8601String(),
                'graded_at' => $submission?->graded_at?->toIso8601String(),
                'score' => $submission?->score !== null ? (float) $submission->score : null,
                'max_score' => (float) $assignment->max_score,
                'feedback' => $submission?->feedback,
                'class_url' => $courseClass ? "/kelas/{$courseClass->id}?tab=assignments&assignment={$assignment->id}" : null,
            ];
        })->values();

        return response()->json([
            'mode' => 'student',
            'items' => $items,
            'summary' => [
                'total' => $items->count(),
                'pending' => $items->where('student_status', 'pending')->count(),
                'submitted' => $items->where('student_status', 'submitted')->count(),
                'graded' => $items->where('student_status', 'graded')->count(),
                'late' => $items->whereIn('student_status', ['late', 'closed'])->count(),
            ],
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }

    private function lecturerPayload(int $userId, bool $isAdmin): JsonResponse
    {
        $classIds = $isAdmin
            ? CourseClass::query()->pluck('id')
            : CourseClassMembership::query()
                ->where('user_id', $userId)
                ->where('membership_role', 'lecturer')
                ->where('status', 'active')
                ->pluck('course_class_id');

        $assignments = CourseClassAssignment::query()
            ->select([
                'id', 'course_class_meeting_id', 'title', 'sub_cpmk_code', 'max_score',
                'due_at', 'status', 'created_at',
            ])
            ->with([
                'meeting:id,course_class_id,meeting_number,title',
                'meeting.courseClass:id,course_id,name,status',
                'meeting.courseClass.course:id,code,name',
            ])
            ->withCount([
                'submissions as submission_count',
                'submissions as ungraded_count' => fn ($query) => $query
                    ->whereNotNull('submitted_at')
                    ->whereNull('graded_at'),
                'submissions as graded_count' => fn ($query) => $query
                    ->whereNotNull('graded_at'),
            ])
            ->whereHas('meeting', fn ($query) => $query->whereIn('course_class_id', $classIds))
            ->orderByRaw('CASE WHEN due_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('due_at')
            ->limit(500)
            ->get();

        $items = $assignments->map(function (CourseClassAssignment $assignment): array {
            $courseClass = $assignment->meeting?->courseClass;
            $course = $courseClass?->course;
            $ungraded = (int) $assignment->ungraded_count;

            return [
                'id' => $assignment->id,
                'source_type' => 'assignment',
                'title' => $assignment->title,
                'sub_cpmk_code' => $assignment->sub_cpmk_code,
                'class_id' => $courseClass?->id,
                'class_name' => $courseClass ? trim(($course?->name ?? 'Kelas').' — Kelas '.$courseClass->name) : 'Kelas',
                'course_code' => $course?->code,
                'meeting_number' => $assignment->meeting?->meeting_number,
                'due_at' => $assignment->due_at?->toIso8601String(),
                'assignment_status' => $assignment->status,
                'submission_count' => (int) $assignment->submission_count,
                'ungraded_count' => $ungraded,
                'graded_count' => (int) $assignment->graded_count,
                'needs_review' => $ungraded > 0,
                'class_url' => $courseClass ? "/kelas/{$courseClass->id}?tab=assignments&assignment={$assignment->id}" : null,
            ];
        })->values();

        return response()->json([
            'mode' => 'lecturer',
            'items' => $items,
            'summary' => [
                'assignments' => $items->count(),
                'submissions' => $items->sum('submission_count'),
                'need_review' => $items->where('needs_review', true)->count(),
                'ungraded' => $items->sum('ungraded_count'),
                'graded' => $items->sum('graded_count'),
            ],
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }
}
