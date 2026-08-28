<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class CalendarController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'start' => ['nullable', 'date_format:Y-m-d'],
            'end' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $start = isset($validated['start'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $validated['start'])->startOfDay()
            : CarbonImmutable::now()->startOfMonth()->subDays(7);
        $end = isset($validated['end'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $validated['end'])->endOfDay()
            : CarbonImmutable::now()->endOfMonth()->addDays(7);

        if ($end->lt($start) || $start->diffInDays($end) > 120) {
            throw ValidationException::withMessages([
                'end' => 'Rentang kalender maksimal 120 hari dan tanggal akhir harus setelah tanggal awal.',
            ]);
        }

        if (! Schema::hasTable('course_class_assignments')) {
            return response()->json([
                'events' => [],
                'summary' => $this->emptySummary(),
            ]);
        }

        $classQuery = CourseClass::query();
        if (! in_array($user->role, [UserRole::AdminProdi, UserRole::Upm], true)) {
            $classQuery->whereHas('memberships', fn ($membership) => $membership
                ->where('user_id', $user->id)
                ->where('status', 'active'));
        }

        $classIds = $classQuery->pluck('id');
        if ($classIds->isEmpty()) {
            return response()->json([
                'events' => [],
                'summary' => $this->emptySummary(),
            ]);
        }

        $query = CourseClassAssignment::query()
            ->with('meeting.courseClass.course:id,code,name')
            ->whereHas('meeting', fn ($meeting) => $meeting->whereIn('course_class_id', $classIds))
            ->whereIn('status', ['published', 'closed'])
            ->whereNotNull('due_at')
            ->whereBetween('due_at', [$start, $end])
            ->orderBy('due_at');

        if ($user->role === UserRole::Student) {
            $query->with([
                'submissions' => fn ($submission) => $submission
                    ->where('user_id', $user->id)
                    ->select([
                        'id',
                        'course_class_assignment_id',
                        'user_id',
                        'submitted_at',
                        'score',
                        'graded_at',
                    ]),
            ]);
        } else {
            $query->withCount([
                'submissions as submission_count' => fn ($submission) => $submission->whereNotNull('submitted_at'),
                'submissions as graded_count' => fn ($submission) => $submission->whereNotNull('score'),
            ]);
        }

        $events = $query->get()
            ->map(function (CourseClassAssignment $assignment) use ($user): ?array {
                $courseClass = $assignment->meeting?->courseClass;
                if (! $courseClass) {
                    return null;
                }

                $submission = $user->role === UserRole::Student
                    ? $assignment->submissions->first()
                    : null;
                $submitted = (bool) $submission?->submitted_at;
                $isOverdue = ! $submitted && ($assignment->due_at?->isPast() ?? false);
                $isSoon = ! $submitted
                    && ! $isOverdue
                    && ($assignment->due_at?->lte(now()->addDays(3)) ?? false);

                return [
                    'id' => $assignment->id,
                    'title' => $assignment->title,
                    'class_id' => $courseClass->id,
                    'class_name' => ($courseClass->course?->name ?? 'Kelas').' — Kelas '.$courseClass->name,
                    'course_code' => $courseClass->course?->code,
                    'meeting_number' => $assignment->meeting?->meeting_number,
                    'class_url' => "/kelas/{$courseClass->id}",
                    'due_at' => $assignment->due_at?->toIso8601String(),
                    'status' => $assignment->status,
                    'submitted' => $submitted,
                    'submitted_at' => $submission?->submitted_at?->toIso8601String(),
                    'score' => $submission?->score !== null ? (float) $submission->score : null,
                    'max_score' => (float) $assignment->max_score,
                    'is_overdue' => $isOverdue,
                    'is_soon' => $isSoon,
                    'submission_count' => $user->role === UserRole::Student
                        ? null
                        : (int) ($assignment->submission_count ?? 0),
                    'graded_count' => $user->role === UserRole::Student
                        ? null
                        : (int) ($assignment->graded_count ?? 0),
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'events' => $events,
            'summary' => [
                'total' => $events->count(),
                'overdue' => $events->where('is_overdue', true)->count(),
                'due_soon' => $events->where('is_soon', true)->count(),
                'submitted' => $user->role === UserRole::Student
                    ? $events->where('submitted', true)->count()
                    : null,
            ],
        ]);
    }

    private function emptySummary(): array
    {
        return [
            'total' => 0,
            'overdue' => 0,
            'due_soon' => 0,
            'submitted' => 0,
        ];
    }
}
