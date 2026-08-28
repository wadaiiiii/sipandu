<?php

namespace App\Http\Controllers;

use App\Enums\RpsSourceType;
use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassMeeting;
use App\Models\CourseClassSubmission;
use App\Models\User;
use App\Services\Classroom\CourseClassMeetingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class CourseClassMeetingController extends Controller
{
    public function page(Request $request, CourseClass $courseClass): View
    {
        $this->ensureCanView($request->user(), $courseClass);

        return view('classroom');
    }

    public function index(
        Request $request,
        CourseClass $courseClass,
        CourseClassMeetingService $meetings,
    ): JsonResponse {
        $user = $request->user();
        $this->ensureCanView($user, $courseClass);
        $meetings->ensureDefaultSlots($courseClass);

        $courseClass->load([
            'course:id,code,name,credits',
            'academicTerm:id,academic_year,semester',
            'memberships.user:id,name,email,identity_number,role',
            'meetings.materials',
            'meetings.assignments.submissions.student:id,name,email,identity_number',
            'meetings.attendances',
        ]);

        $canEdit = $this->canEdit($user, $courseClass);
        $isStudent = $user->role === UserRole::Student;
        $students = $courseClass->memberships
            ->where('membership_role', 'student')
            ->where('status', 'active')
            ->map(fn ($membership): array => [
                'id' => $membership->user->id,
                'name' => $membership->user->name,
                'email' => $membership->user->email,
                'identity_number' => $membership->user->identity_number,
            ])
            ->values();

        return response()->json([
            'class' => [
                'id' => $courseClass->id,
                'name' => $courseClass->name,
                'status' => $courseClass->status,
                'course' => $courseClass->course,
                'academic_term' => $courseClass->academicTerm,
                'rps_source_type' => $courseClass->rps_source_type,
                'rps_source_label' => RpsSourceType::tryFrom($courseClass->rps_source_type)?->label() ?? $courseClass->rps_source_type,
            ],
            'viewer_role' => $user->role->value,
            'can_edit' => $canEdit,
            'students' => $isStudent ? [] : $students,
            'obe_summary' => $this->obeSummary($courseClass->meetings, $isStudent ? $user->id : null),
            'meetings' => $courseClass->meetings->map(function (CourseClassMeeting $meeting) use ($isStudent, $user): array {
                $materials = $meeting->materials
                    ->filter(fn ($material): bool => !$isStudent || $material->is_published)
                    ->map(fn ($material): array => [
                        'id' => $material->id,
                        'title' => $material->title,
                        'resource_type' => $material->resource_type,
                        'description' => $material->description,
                        'resource_url' => $material->resource_url,
                        'is_published' => $material->is_published,
                    ])
                    ->values();

                $assignments = $meeting->assignments
                    ->filter(fn (CourseClassAssignment $assignment): bool => !$isStudent || $assignment->status !== 'draft')
                    ->map(function (CourseClassAssignment $assignment) use ($isStudent, $user): array {
                        $submissions = $assignment->submissions
                            ->filter(fn (CourseClassSubmission $submission): bool => !$isStudent || $submission->user_id === $user->id)
                            ->map(fn (CourseClassSubmission $submission): array => [
                                'id' => $submission->id,
                                'user_id' => $submission->user_id,
                                'student_name' => $submission->student?->name,
                                'student_identity_number' => $submission->student?->identity_number,
                                'answer_text' => $submission->answer_text,
                                'attachment_url' => $submission->attachment_url,
                                'submitted_at' => $submission->submitted_at?->toIso8601String(),
                                'score' => $submission->score !== null ? (float) $submission->score : null,
                                'feedback' => $submission->feedback,
                                'graded_at' => $submission->graded_at?->toIso8601String(),
                            ])
                            ->values();

                        $graded = $assignment->submissions->whereNotNull('score');
                        $average = $graded->isEmpty()
                            ? null
                            : round($graded->avg(fn (CourseClassSubmission $submission): float => ((float) $submission->score / max((float) $assignment->max_score, 1)) * 100), 2);

                        return [
                            'id' => $assignment->id,
                            'title' => $assignment->title,
                            'instructions' => $assignment->instructions,
                            'sub_cpmk_code' => $assignment->sub_cpmk_code,
                            'weight_percent' => (float) $assignment->weight_percent,
                            'max_score' => (float) $assignment->max_score,
                            'due_at' => $assignment->due_at?->format('Y-m-d\TH:i'),
                            'status' => $assignment->status,
                            'submission_count' => $assignment->submissions->whereNotNull('submitted_at')->count(),
                            'graded_count' => $graded->count(),
                            'average_achievement_percent' => $average,
                            'submissions' => $submissions,
                        ];
                    })
                    ->values();

                $attendanceRows = $meeting->attendances
                    ->filter(fn ($attendance): bool => !$isStudent || $attendance->user_id === $user->id)
                    ->map(fn ($attendance): array => [
                        'user_id' => $attendance->user_id,
                        'status' => $attendance->status,
                        'note' => $attendance->note,
                    ])
                    ->values();

                $attendanceSummary = collect(['present', 'sick', 'excused', 'absent'])
                    ->mapWithKeys(fn (string $status): array => [$status => $meeting->attendances->where('status', $status)->count()]);

                return [
                    'id' => $meeting->id,
                    'meeting_number' => $meeting->meeting_number,
                    'title' => $meeting->title,
                    'topic' => $meeting->topic,
                    'sub_cpmk_code' => $meeting->sub_cpmk_code,
                    'learning_method' => $meeting->learning_method,
                    'learning_activity' => $meeting->learning_activity,
                    'material_summary' => $meeting->material_summary,
                    'status' => $meeting->status,
                    'starts_at' => $meeting->starts_at?->format('Y-m-d\TH:i'),
                    'materials' => $materials,
                    'assignments' => $assignments,
                    'attendance' => $attendanceRows,
                    'attendance_summary' => $attendanceSummary,
                ];
            })->values(),
        ]);
    }

    public function update(
        Request $request,
        CourseClass $courseClass,
        CourseClassMeeting $meeting,
    ): JsonResponse {
        abort_unless($meeting->course_class_id === $courseClass->id, 404);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'topic' => ['nullable', 'string', 'max:5000'],
            'sub_cpmk_code' => ['nullable', 'string', 'max:80'],
            'learning_method' => ['nullable', 'string', 'max:255'],
            'learning_activity' => ['nullable', 'string', 'max:10000'],
            'material_summary' => ['nullable', 'string', 'max:10000'],
            'status' => ['required', Rule::in(['planned', 'published', 'completed'])],
            'starts_at' => ['nullable', 'date'],
        ]);

        $meeting->update($validated);

        return response()->json(['ok' => true]);
    }

    private function obeSummary(Collection $meetings, ?int $studentId = null): array
    {
        $assignments = $meetings
            ->flatMap(fn (CourseClassMeeting $meeting) => $meeting->assignments)
            ->filter(fn (CourseClassAssignment $assignment): bool => filled($assignment->sub_cpmk_code));

        return $assignments
            ->groupBy('sub_cpmk_code')
            ->map(function (Collection $group) use ($studentId): array {
                $weightedSum = 0.0;
                $weightTotal = 0.0;
                $gradedCount = 0;

                foreach ($group as $assignment) {
                    $submissions = $assignment->submissions->whereNotNull('score');
                    if ($studentId !== null) {
                        $submissions = $submissions->where('user_id', $studentId);
                    }

                    if ($submissions->isEmpty()) {
                        continue;
                    }

                    $achievement = $submissions->avg(
                        fn (CourseClassSubmission $submission): float => ((float) $submission->score / max((float) $assignment->max_score, 1)) * 100,
                    );
                    $weight = (float) $assignment->weight_percent;
                    if ($weight <= 0) {
                        $weight = 1;
                    }

                    $weightedSum += $achievement * $weight;
                    $weightTotal += $weight;
                    $gradedCount += $submissions->count();
                }

                return [
                    'sub_cpmk_code' => $group->first()->sub_cpmk_code,
                    'achievement_percent' => $weightTotal > 0 ? round($weightedSum / $weightTotal, 2) : null,
                    'graded_evidence_count' => $gradedCount,
                    'assessment_count' => $group->count(),
                ];
            })
            ->values()
            ->all();
    }

    private function ensureCanView(User $user, CourseClass $courseClass): void
    {
        abort_unless($this->canView($user, $courseClass), 403);
    }

    private function canView(User $user, CourseClass $courseClass): bool
    {
        if (in_array($user->role, [UserRole::AdminProdi, UserRole::Upm], true)) {
            return true;
        }

        return $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
    }

    private function canEdit(User $user, CourseClass $courseClass): bool
    {
        if ($user->role === UserRole::AdminProdi) {
            return true;
        }

        if ($user->role !== UserRole::Lecturer) {
            return false;
        }

        return $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('membership_role', 'lecturer')
            ->where('status', 'active')
            ->exists();
    }
}
