<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassMaterialProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class StudentPerformanceController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->role === UserRole::Student, 403);

        $classIds = CourseClass::query()
            ->whereHas('memberships', fn ($query) => $query
                ->where('user_id', $user->id)
                ->where('membership_role', 'student')
                ->where('status', 'active'))
            ->pluck('id');

        if ($classIds->isEmpty() || ! Schema::hasTable('course_class_assignments')) {
            return response()->json($this->emptyPayload());
        }

        $assignments = CourseClassAssignment::query()
            ->with([
                'meeting.courseClass.course:id,code,name',
                'submissions' => fn ($query) => $query->where('user_id', $user->id),
            ])
            ->whereHas('meeting', fn ($query) => $query->whereIn('course_class_id', $classIds))
            ->whereIn('status', ['published', 'closed'])
            ->orderByDesc('created_at')
            ->get();

        $submitted = $assignments->filter(fn ($assignment): bool => $assignment->submissions
            ->whereNotNull('submitted_at')
            ->isNotEmpty());

        $graded = $assignments->filter(fn ($assignment): bool => $assignment->submissions
            ->whereNotNull('score')
            ->isNotEmpty());

        $averageScore = $graded->isEmpty()
            ? null
            : round($graded->avg(function ($assignment): float {
                $submission = $assignment->submissions->whereNotNull('score')->first();

                return ((float) $submission->score / max((float) $assignment->max_score, 1)) * 100;
            }), 1);

        $withDeadline = $submitted->filter(fn ($assignment): bool => $assignment->due_at !== null);
        $onTime = $withDeadline->filter(function ($assignment): bool {
            $submission = $assignment->submissions->whereNotNull('submitted_at')->first();

            return $submission && $submission->submitted_at->lte($assignment->due_at);
        })->count();
        $late = max(0, $withDeadline->count() - $onTime);

        $activeDays = $this->activeDays($assignments, $user->id, $classIds);
        $recentGrades = $this->recentGrades($graded);
        $perClass = $this->perClass($assignments, $classIds);

        $totalAssignments = $assignments->count();
        $submittedCount = $submitted->count();

        return response()->json([
            'summary' => [
                'average_score_percent' => $averageScore,
                'submitted_assignments' => $submittedCount,
                'total_assignments' => $totalAssignments,
                'pending_assignments' => max(0, $totalAssignments - $submittedCount),
                'graded_assignments' => $graded->count(),
                'completion_rate_percent' => $totalAssignments > 0
                    ? (int) round(($submittedCount / $totalAssignments) * 100)
                    : 0,
                'on_time_submissions' => $onTime,
                'late_submissions' => $late,
                'active_days_30' => $activeDays,
            ],
            'recent_grades' => $recentGrades,
            'classes' => $perClass,
            'note' => 'Performa dihitung dari aktivitas LMS yang sudah tercatat. Tidak ada prediksi AI pada tahap ini.',
        ]);
    }

    private function activeDays(Collection $assignments, int $studentId, Collection $classIds): int
    {
        $dates = collect();

        foreach ($assignments as $assignment) {
            $submission = $assignment->submissions->whereNotNull('submitted_at')->first();
            if ($submission?->submitted_at && $submission->submitted_at->gte(now()->subDays(30))) {
                $dates->push($submission->submitted_at->toDateString());
            }
        }

        if (Schema::hasTable('course_class_material_progress')) {
            CourseClassMaterialProgress::query()
                ->with('material.meeting:id,course_class_id')
                ->where('user_id', $studentId)
                ->whereNotNull('learned_at')
                ->where('learned_at', '>=', now()->subDays(30))
                ->whereHas('material.meeting', fn ($query) => $query->whereIn('course_class_id', $classIds))
                ->get()
                ->each(function (CourseClassMaterialProgress $progress) use ($dates): void {
                    if ($progress->learned_at) {
                        $dates->push($progress->learned_at->toDateString());
                    }
                });
        }

        return $dates->unique()->count();
    }

    private function recentGrades(Collection $graded): array
    {
        return $graded
            ->map(function ($assignment): array {
                $submission = $assignment->submissions->whereNotNull('score')->first();
                $courseClass = $assignment->meeting?->courseClass;
                $percent = $submission
                    ? round(((float) $submission->score / max((float) $assignment->max_score, 1)) * 100, 1)
                    : null;

                return [
                    'assignment_id' => $assignment->id,
                    'title' => $assignment->title,
                    'class_name' => $this->className($courseClass),
                    'class_url' => $courseClass ? "/kelas/{$courseClass->id}" : null,
                    'score' => $submission ? (float) $submission->score : null,
                    'max_score' => (float) $assignment->max_score,
                    'percent' => $percent,
                    'feedback' => $submission?->feedback,
                    'graded_at' => $submission?->graded_at?->toIso8601String(),
                ];
            })
            ->filter(fn (array $item): bool => filled($item['graded_at']))
            ->sortByDesc('graded_at')
            ->take(5)
            ->values()
            ->all();
    }

    private function perClass(Collection $assignments, Collection $classIds): array
    {
        $classes = CourseClass::query()
            ->with('course:id,code,name')
            ->whereIn('id', $classIds)
            ->get()
            ->keyBy('id');

        return $assignments
            ->groupBy(fn ($assignment) => $assignment->meeting?->course_class_id)
            ->map(function (Collection $group, $classId) use ($classes): array {
                $courseClass = $classes->get((int) $classId);
                $submitted = $group->filter(fn ($assignment): bool => $assignment->submissions
                    ->whereNotNull('submitted_at')
                    ->isNotEmpty());
                $graded = $group->filter(fn ($assignment): bool => $assignment->submissions
                    ->whereNotNull('score')
                    ->isNotEmpty());

                $average = $graded->isEmpty()
                    ? null
                    : round($graded->avg(function ($assignment): float {
                        $submission = $assignment->submissions->whereNotNull('score')->first();

                        return ((float) $submission->score / max((float) $assignment->max_score, 1)) * 100;
                    }), 1);

                return [
                    'class_id' => (int) $classId,
                    'class_name' => $this->className($courseClass),
                    'class_url' => $courseClass ? "/kelas/{$courseClass->id}" : null,
                    'average_score_percent' => $average,
                    'submitted_assignments' => $submitted->count(),
                    'total_assignments' => $group->count(),
                    'graded_assignments' => $graded->count(),
                ];
            })
            ->values()
            ->all();
    }

    private function className(?CourseClass $courseClass): string
    {
        if (! $courseClass) {
            return 'Kelas';
        }

        return ($courseClass->course?->name ?? 'Kelas').' — Kelas '.$courseClass->name;
    }

    private function emptyPayload(): array
    {
        return [
            'summary' => [
                'average_score_percent' => null,
                'submitted_assignments' => 0,
                'total_assignments' => 0,
                'pending_assignments' => 0,
                'graded_assignments' => 0,
                'completion_rate_percent' => 0,
                'on_time_submissions' => 0,
                'late_submissions' => 0,
                'active_days_30' => 0,
            ],
            'recent_grades' => [],
            'classes' => [],
            'note' => 'Belum ada data aktivitas yang cukup untuk diringkas.',
        ];
    }
}
