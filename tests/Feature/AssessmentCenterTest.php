<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AssessmentCenterTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_student_sees_cross_class_assignment_statuses(): void
    {
        Carbon::setTestNow('2026-08-30 10:00:00');
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $meeting = $class->meetings()->firstOrFail();

        $pending = $this->makeAssignment($lecturer, $class, $meeting->id, 'Tugas Hari Ini', '2026-08-30 20:00:00');
        $this->makeAssignment($lecturer, $class, $meeting->id, 'Tugas Terlambat', '2026-08-29 20:00:00');
        $submitted = $this->makeAssignment($lecturer, $class, $meeting->id, 'Tugas Sudah Dikumpulkan', '2026-09-02 20:00:00');
        $graded = $this->makeAssignment($lecturer, $class, $meeting->id, 'Tugas Dinilai', '2026-09-03 20:00:00');

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$submitted->id}/submission", ['answer_text' => 'Jawaban submit'])
            ->assertOk();

        $gradeSubmission = $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$graded->id}/submission", ['answer_text' => 'Jawaban dinilai'])
            ->assertOk();

        $submission = CourseClassSubmission::query()->findOrFail($gradeSubmission->json('submission.id'));
        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$class->id}/assignments/{$graded->id}/submissions/{$submission->id}/grade", [
                'score' => 88,
                'feedback' => 'Baik.',
            ])
            ->assertOk();

        $response = $this->actingAs($student)
            ->getJson('/sipandu-api/assessment-center')
            ->assertOk()
            ->assertJsonPath('mode', 'student')
            ->assertJsonPath('summary.pending', 1)
            ->assertJsonPath('summary.submitted', 1)
            ->assertJsonPath('summary.graded', 1)
            ->assertJsonPath('summary.late', 1);

        $items = collect($response->json('items'));
        $this->assertSame('pending', $items->firstWhere('id', $pending->id)['student_status']);
        $this->assertSame('submitted', $items->firstWhere('id', $submitted->id)['student_status']);
        $this->assertSame('graded', $items->firstWhere('id', $graded->id)['student_status']);
        $this->assertStringContainsString("/kelas/{$class->id}?tab=assignments&assignment={$pending->id}", $items->firstWhere('id', $pending->id)['class_url']);
    }

    public function test_lecturer_sees_submission_and_grading_workload(): void
    {
        Carbon::setTestNow('2026-08-30 10:00:00');
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $meeting = $class->meetings()->firstOrFail();

        $ungraded = $this->makeAssignment($lecturer, $class, $meeting->id, 'Perlu Diperiksa', '2026-09-02 20:00:00');
        $graded = $this->makeAssignment($lecturer, $class, $meeting->id, 'Sudah Dinilai', '2026-09-03 20:00:00');

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$ungraded->id}/submission", ['answer_text' => 'Belum dinilai'])
            ->assertOk();

        $gradedResponse = $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$graded->id}/submission", ['answer_text' => 'Sudah dinilai'])
            ->assertOk();

        $gradedSubmission = CourseClassSubmission::query()->findOrFail($gradedResponse->json('submission.id'));
        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$class->id}/assignments/{$graded->id}/submissions/{$gradedSubmission->id}/grade", [
                'score' => 90,
            ])
            ->assertOk();

        $response = $this->actingAs($lecturer)
            ->getJson('/sipandu-api/assessment-center')
            ->assertOk()
            ->assertJsonPath('mode', 'lecturer')
            ->assertJsonPath('summary.assignments', 2)
            ->assertJsonPath('summary.submissions', 2)
            ->assertJsonPath('summary.need_review', 1)
            ->assertJsonPath('summary.ungraded', 1)
            ->assertJsonPath('summary.graded', 1);

        $items = collect($response->json('items'));
        $this->assertTrue((bool) $items->firstWhere('id', $ungraded->id)['needs_review']);
        $this->assertSame(1, $items->firstWhere('id', $ungraded->id)['ungraded_count']);
        $this->assertSame(1, $items->firstWhere('id', $graded->id)['graded_count']);
    }

    /** @return array{0: CourseClass, 1: User, 2: User} */
    private function makeClassWithStudent(): array
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT301',
            'course_name' => 'Analisis Real',
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

    private function makeAssignment(User $lecturer, CourseClass $class, int $meetingId, string $title, string $dueAt): CourseClassAssignment
    {
        $response = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meetingId}/assignments", [
                'title' => $title,
                'instructions' => 'Kerjakan sesuai instruksi.',
                'sub_cpmk_code' => 'SUB-CPMK-01',
                'weight_percent' => 10,
                'max_score' => 100,
                'due_at' => $dueAt,
                'status' => 'published',
            ])
            ->assertCreated();

        return CourseClassAssignment::query()->findOrFail($response->json('assignment.id'));
    }
}
