<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentSubmissionPolicyController extends Controller
{
    public function __invoke(Request $request, CourseClass $courseClass): JsonResponse
    {
        $user = $request->user();
        abort_unless($user?->role === UserRole::Student, 403);

        $isActiveStudent = $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('membership_role', 'student')
            ->where('status', 'active')
            ->exists();

        abort_unless($isActiveStudent, 403);

        $courseClass->load([
            'meetings:id,course_class_id,meeting_number',
            'meetings.assignments' => fn ($query) => $query
                ->select([
                    'id', 'course_class_meeting_id', 'title', 'due_at', 'status',
                ])
                ->with(['submissions' => fn ($submissionQuery) => $submissionQuery
                    ->where('user_id', $user->id)
                    ->select([
                        'id', 'course_class_assignment_id', 'user_id', 'submitted_at', 'graded_at', 'score',
                    ])]),
        ]);

        $items = $courseClass->meetings
            ->flatMap(function ($meeting) {
                return $meeting->assignments->map(function ($assignment) use ($meeting) {
                    $submission = $assignment->submissions->first();
                    $pastDue = $assignment->due_at && now()->greaterThan($assignment->due_at);
                    $isOpen = $assignment->status === 'published' && ! $pastDue;
                    $isGraded = (bool) $submission?->graded_at;
                    $canSubmit = $isOpen && ! $submission;
                    $canUpdate = $isOpen && (bool) $submission && ! $isGraded;

                    $reason = null;
                    if ($isGraded) {
                        $reason = 'Tugas sudah dinilai dosen. Jawaban dikunci.';
                    } elseif ($assignment->status !== 'published') {
                        $reason = 'Tugas sudah ditutup oleh dosen.';
                    } elseif ($pastDue) {
                        $reason = 'Batas waktu tugas telah lewat.';
                    } elseif ($submission) {
                        $reason = $assignment->due_at
                            ? 'Jawaban masih dapat diperbarui sampai batas waktu.'
                            : 'Jawaban masih dapat diperbarui selama tugas tetap dibuka.';
                    }

                    return [
                        'assignment_id' => $assignment->id,
                        'meeting_number' => $meeting->meeting_number,
                        'title' => $assignment->title,
                        'status' => $assignment->status,
                        'due_at' => $assignment->due_at?->toIso8601String(),
                        'submitted_at' => $submission?->submitted_at?->toIso8601String(),
                        'graded_at' => $submission?->graded_at?->toIso8601String(),
                        'score' => $submission?->score,
                        'can_submit' => $canSubmit,
                        'can_update' => $canUpdate,
                        'reason' => $reason,
                    ];
                });
            })
            ->values();

        return response()->json(['assignments' => $items]);
    }
}
