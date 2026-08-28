<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassMaterial;
use App\Models\CourseClassMeeting;
use App\Models\CourseClassSubmission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CourseClassLearningController extends Controller
{
    public function storeMaterial(Request $request, CourseClass $courseClass, CourseClassMeeting $meeting): JsonResponse
    {
        $this->ensureMeeting($courseClass, $meeting);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'resource_type' => ['required', Rule::in(['link', 'document', 'video', 'reading', 'other'])],
            'description' => ['nullable', 'string', 'max:5000'],
            'resource_url' => ['nullable', 'url', 'max:2000'],
            'is_published' => ['required', 'boolean'],
        ]);

        $material = $meeting->materials()->create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['material' => $material], 201);
    }

    public function destroyMaterial(
        Request $request,
        CourseClass $courseClass,
        CourseClassMeeting $meeting,
        CourseClassMaterial $material,
    ): JsonResponse {
        $this->ensureMeeting($courseClass, $meeting);
        abort_unless($material->course_class_meeting_id === $meeting->id, 404);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $material->delete();

        return response()->json(['ok' => true]);
    }

    public function storeAssignment(Request $request, CourseClass $courseClass, CourseClassMeeting $meeting): JsonResponse
    {
        $this->ensureMeeting($courseClass, $meeting);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'instructions' => ['nullable', 'string', 'max:15000'],
            'sub_cpmk_code' => ['nullable', 'string', 'max:80'],
            'weight_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'max_score' => ['required', 'numeric', 'gt:0', 'max:10000'],
            'due_at' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['draft', 'published', 'closed'])],
        ]);

        $assignment = $meeting->assignments()->create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['assignment' => $assignment], 201);
    }

    public function updateAssignment(
        Request $request,
        CourseClass $courseClass,
        CourseClassAssignment $assignment,
    ): JsonResponse {
        $this->ensureAssignment($courseClass, $assignment);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'instructions' => ['nullable', 'string', 'max:15000'],
            'sub_cpmk_code' => ['nullable', 'string', 'max:80'],
            'weight_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'max_score' => ['required', 'numeric', 'gt:0', 'max:10000'],
            'due_at' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['draft', 'published', 'closed'])],
        ]);

        $assignment->update($validated);

        return response()->json(['ok' => true]);
    }

    public function submitAssignment(
        Request $request,
        CourseClass $courseClass,
        CourseClassAssignment $assignment,
    ): JsonResponse {
        $user = $request->user();
        $this->ensureAssignment($courseClass, $assignment);
        abort_unless($user->role === UserRole::Student, 403);
        abort_unless($this->isActiveMember($user, $courseClass, 'student'), 403);
        abort_unless($assignment->status === 'published', 422, 'Tugas belum dibuka untuk pengumpulan.');

        $validated = $request->validate([
            'answer_text' => ['nullable', 'string', 'max:30000'],
            'attachment_url' => ['nullable', 'url', 'max:2000'],
        ]);

        if (blank($validated['answer_text'] ?? null) && blank($validated['attachment_url'] ?? null)) {
            throw ValidationException::withMessages([
                'answer_text' => 'Isi jawaban atau tautan lampiran terlebih dahulu.',
            ]);
        }

        $submission = CourseClassSubmission::query()->updateOrCreate(
            [
                'course_class_assignment_id' => $assignment->id,
                'user_id' => $user->id,
            ],
            [
                'answer_text' => $validated['answer_text'] ?? null,
                'attachment_url' => $validated['attachment_url'] ?? null,
                'submitted_at' => now(),
                'score' => null,
                'feedback' => null,
                'graded_by' => null,
                'graded_at' => null,
            ],
        );

        return response()->json(['submission' => $submission]);
    }

    public function gradeSubmission(
        Request $request,
        CourseClass $courseClass,
        CourseClassAssignment $assignment,
        CourseClassSubmission $submission,
    ): JsonResponse {
        $this->ensureAssignment($courseClass, $assignment);
        abort_unless($submission->course_class_assignment_id === $assignment->id, 404);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $validated = $request->validate([
            'score' => ['required', 'numeric', 'min:0'],
            'feedback' => ['nullable', 'string', 'max:10000'],
        ]);

        if ((float) $validated['score'] > (float) $assignment->max_score) {
            throw ValidationException::withMessages([
                'score' => "Nilai maksimal tugas adalah {$assignment->max_score}.",
            ]);
        }

        $submission->update([
            'score' => $validated['score'],
            'feedback' => $validated['feedback'] ?? null,
            'graded_by' => $request->user()->id,
            'graded_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function recordAttendance(
        Request $request,
        CourseClass $courseClass,
        CourseClassMeeting $meeting,
    ): JsonResponse {
        $this->ensureMeeting($courseClass, $meeting);
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $validated = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.user_id' => ['required', 'integer', 'exists:users,id'],
            'records.*.status' => ['required', Rule::in(['present', 'sick', 'excused', 'absent'])],
            'records.*.note' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($validated, $courseClass, $meeting, $request): void {
            foreach ($validated['records'] as $record) {
                $isStudent = $courseClass->memberships()
                    ->where('user_id', $record['user_id'])
                    ->where('membership_role', 'student')
                    ->where('status', 'active')
                    ->exists();

                if (!$isStudent) {
                    throw ValidationException::withMessages([
                        'records' => "Pengguna {$record['user_id']} bukan mahasiswa aktif di kelas ini.",
                    ]);
                }

                $meeting->attendances()->updateOrCreate(
                    ['user_id' => $record['user_id']],
                    [
                        'status' => $record['status'],
                        'note' => $record['note'] ?? null,
                        'recorded_by' => $request->user()->id,
                    ],
                );
            }
        });

        return response()->json(['ok' => true]);
    }

    private function ensureMeeting(CourseClass $courseClass, CourseClassMeeting $meeting): void
    {
        abort_unless($meeting->course_class_id === $courseClass->id, 404);
    }

    private function ensureAssignment(CourseClass $courseClass, CourseClassAssignment $assignment): void
    {
        $assignment->loadMissing('meeting:id,course_class_id');
        abort_unless($assignment->meeting?->course_class_id === $courseClass->id, 404);
    }

    private function canEdit(User $user, CourseClass $courseClass): bool
    {
        if ($user->role === UserRole::AdminProdi) {
            return true;
        }

        return $user->role === UserRole::Lecturer
            && $this->isActiveMember($user, $courseClass, 'lecturer');
    }

    private function isActiveMember(User $user, CourseClass $courseClass, ?string $membershipRole = null): bool
    {
        $query = $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('status', 'active');

        if ($membershipRole) {
            $query->where('membership_role', $membershipRole);
        }

        return $query->exists();
    }
}
