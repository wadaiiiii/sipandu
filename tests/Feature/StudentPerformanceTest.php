<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_view_personal_performance_summary(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $classResponse = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT301',
            'course_name' => 'Pemrograman Numerik',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $courseClass = CourseClass::query()->findOrFail($classResponse->json('class_id'));

        $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$courseClass->id}/participants", ['email' => $student->email])
            ->assertOk();

        $meeting = $courseClass->meetings()->firstOrFail();

        $assignmentResponse = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$courseClass->id}/meetings/{$meeting->id}/assignments", [
                'title' => 'Tugas Metode Newton',
                'instructions' => 'Selesaikan satu contoh numerik.',
                'sub_cpmk_code' => null,
                'weight_percent' => 0,
                'max_score' => 100,
                'due_at' => now()->addDay()->toDateTimeString(),
                'status' => 'published',
            ])
            ->assertCreated();

        $assignment = CourseClassAssignment::query()->findOrFail($assignmentResponse->json('assignment.id'));

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$courseClass->id}/assignments/{$assignment->id}/submission", [
                'answer_text' => 'Jawaban mahasiswa.',
            ])
            ->assertOk();

        $submission = CourseClassSubmission::query()
            ->where('course_class_assignment_id', $assignment->id)
            ->where('user_id', $student->id)
            ->firstOrFail();

        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$courseClass->id}/assignments/{$assignment->id}/submissions/{$submission->id}/grade", [
                'score' => 84,
                'feedback' => 'Langkah iterasi sudah benar.',
            ])
            ->assertOk();

        $this->actingAs($student)
            ->getJson('/sipandu-api/student/performance')
            ->assertOk()
            ->assertJsonPath('summary.average_score_percent', 84)
            ->assertJsonPath('summary.submitted_assignments', 1)
            ->assertJsonPath('summary.total_assignments', 1)
            ->assertJsonPath('summary.pending_assignments', 0)
            ->assertJsonPath('summary.graded_assignments', 1)
            ->assertJsonPath('summary.completion_rate_percent', 100)
            ->assertJsonPath('summary.on_time_submissions', 1)
            ->assertJsonPath('recent_grades.0.title', 'Tugas Metode Newton')
            ->assertJsonPath('recent_grades.0.percent', 84)
            ->assertJsonPath('classes.0.average_score_percent', 84);
    }

    public function test_non_student_cannot_open_personal_performance_endpoint(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);

        $this->actingAs($lecturer)
            ->getJson('/sipandu-api/student/performance')
            ->assertForbidden();
    }
}
