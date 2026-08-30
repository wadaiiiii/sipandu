<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentSubmissionPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_update_submission_before_due_date_while_ungraded(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $assignment = $this->makeAssignment($class, $lecturer, now()->addDay()->toDateTimeString());

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submission", [
                'answer_text' => 'Jawaban pertama',
            ])
            ->assertOk();

        $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$class->id}/submission-policy")
            ->assertOk()
            ->assertJsonPath('assignments.0.can_update', true)
            ->assertJsonPath('assignments.0.can_submit', false);

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submission", [
                'answer_text' => 'Jawaban diperbarui',
            ])
            ->assertOk();

        $this->assertDatabaseHas('course_class_submissions', [
            'course_class_assignment_id' => $assignment->id,
            'user_id' => $student->id,
            'answer_text' => 'Jawaban diperbarui',
        ]);
    }

    public function test_student_cannot_submit_or_update_after_due_date(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $assignment = $this->makeAssignment($class, $lecturer, now()->subMinute()->toDateTimeString());

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submission", [
                'answer_text' => 'Terlambat',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.assignment.0', 'Batas waktu tugas telah lewat. Jawaban tidak dapat dikumpulkan atau diperbarui.');

        $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$class->id}/submission-policy")
            ->assertOk()
            ->assertJsonPath('assignments.0.can_submit', false)
            ->assertJsonPath('assignments.0.can_update', false);
    }

    public function test_graded_submission_is_locked_even_before_due_date(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $assignment = $this->makeAssignment($class, $lecturer, now()->addDay()->toDateTimeString());

        $submissionResponse = $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submission", [
                'answer_text' => 'Jawaban awal',
            ])
            ->assertOk();

        $submission = CourseClassSubmission::query()->findOrFail($submissionResponse->json('submission.id'));

        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submissions/{$submission->id}/grade", [
                'score' => 80,
                'feedback' => 'Sudah dinilai.',
            ])
            ->assertOk();

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submission", [
                'answer_text' => 'Mencoba mengubah setelah dinilai',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.assignment.0', 'Tugas sudah dinilai dosen sehingga jawaban tidak dapat diperbarui.');

        $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$class->id}/submission-policy")
            ->assertOk()
            ->assertJsonPath('assignments.0.can_update', false)
            ->assertJsonPath('assignments.0.reason', 'Tugas sudah dinilai dosen. Jawaban dikunci.');
    }

    private function makeAssignment(CourseClass $class, User $lecturer, string $dueAt): CourseClassAssignment
    {
        $meeting = $class->meetings()->firstOrFail();

        $response = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/assignments", [
                'title' => 'Latihan Mahasiswa',
                'instructions' => 'Kerjakan sesuai petunjuk.',
                'sub_cpmk_code' => 'SUB-CPMK-01',
                'weight_percent' => 10,
                'max_score' => 100,
                'due_at' => $dueAt,
                'status' => 'published',
            ])
            ->assertCreated();

        return CourseClassAssignment::query()->findOrFail($response->json('assignment.id'));
    }

    /** @return array{0: CourseClass, 1: User, 2: User} */
    private function makeClassWithStudent(): array
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT401',
            'course_name' => 'Analisis Matematika',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $class = CourseClass::query()->findOrFail($response->json('class_id'));

        $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/participants", ['email' => $student->email])
            ->assertOk();

        return [$class, $lecturer, $student];
    }
}
