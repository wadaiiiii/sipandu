<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassAssignment;
use App\Models\CourseClassSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassroomLearningCycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_lecturer_can_build_learning_evidence_and_student_can_submit(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $meeting = $class->meetings()->where('meeting_number', 2)->firstOrFail();

        $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/materials", [
                'title' => 'Video pengantar algoritma',
                'resource_type' => 'video',
                'description' => 'Materi sebelum praktikum.',
                'resource_url' => 'https://example.com/video-algoritma',
                'is_published' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('material.title', 'Video pengantar algoritma');

        $assignmentResponse = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/assignments", [
                'title' => 'Tugas Flowchart',
                'instructions' => 'Susun flowchart penyelesaian masalah.',
                'sub_cpmk_code' => 'SUB-CPMK-02',
                'weight_percent' => 20,
                'max_score' => 100,
                'due_at' => '2026-09-20 23:59:00',
                'status' => 'published',
            ])
            ->assertCreated();

        $assignmentId = $assignmentResponse->json('assignment.id');
        $assignment = CourseClassAssignment::query()->findOrFail($assignmentId);

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submission", [
                'answer_text' => 'Flowchart telah dibuat dan diuji.',
                'attachment_url' => 'https://example.com/tugas-mahasiswa',
            ])
            ->assertOk();

        $submission = CourseClassSubmission::query()
            ->where('course_class_assignment_id', $assignment->id)
            ->where('user_id', $student->id)
            ->firstOrFail();

        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submissions/{$submission->id}/grade", [
                'score' => 90,
                'feedback' => 'Struktur logika baik.',
            ])
            ->assertOk();

        $this->actingAs($lecturer)
            ->putJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/attendance", [
                'records' => [[
                    'user_id' => $student->id,
                    'status' => 'present',
                    'note' => 'Hadir tepat waktu.',
                ]],
            ])
            ->assertOk();

        $this->assertDatabaseHas('course_class_materials', [
            'course_class_meeting_id' => $meeting->id,
            'title' => 'Video pengantar algoritma',
        ]);
        $this->assertDatabaseHas('course_class_submissions', [
            'id' => $submission->id,
            'score' => 90,
            'feedback' => 'Struktur logika baik.',
        ]);
        $this->assertDatabaseHas('course_class_attendances', [
            'course_class_meeting_id' => $meeting->id,
            'user_id' => $student->id,
            'status' => 'present',
        ]);

        $this->actingAs($lecturer)
            ->getJson("/sipandu-api/classes/{$class->id}/meetings")
            ->assertOk()
            ->assertJsonPath('obe_summary.0.sub_cpmk_code', 'SUB-CPMK-02')
            ->assertJsonPath('obe_summary.0.achievement_percent', 90)
            ->assertJsonPath('meetings.1.materials.0.title', 'Video pengantar algoritma')
            ->assertJsonPath('meetings.1.assignments.0.submission_count', 1)
            ->assertJsonPath('meetings.1.attendance_summary.present', 1);

        $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$class->id}/meetings")
            ->assertOk()
            ->assertJsonPath('viewer_role', 'student')
            ->assertJsonPath('can_edit', false)
            ->assertJsonCount(0, 'students')
            ->assertJsonPath('obe_summary.0.achievement_percent', 90)
            ->assertJsonCount(1, 'meetings.1.assignments.0.submissions');
    }

    public function test_student_can_mark_published_material_as_learned(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $meeting = $class->meetings()->firstOrFail();

        $materialResponse = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/materials", [
                'title' => 'Materi pengantar',
                'resource_type' => 'document',
                'resource_url' => 'https://example.com/materi.pdf',
                'is_published' => true,
            ])
            ->assertCreated();

        $materialId = $materialResponse->json('material.id');

        $this->actingAs($student)
            ->putJson("/sipandu-api/classes/{$class->id}/materials/{$materialId}/learned", [
                'learned' => true,
            ])
            ->assertOk()
            ->assertJsonPath('learned', true);

        $this->assertDatabaseHas('course_class_material_progress', [
            'course_class_material_id' => $materialId,
            'user_id' => $student->id,
        ]);

        $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$class->id}/meetings")
            ->assertOk()
            ->assertJsonPath('meetings.0.materials.0.is_learned', true);

        $this->actingAs($student)
            ->getJson('/sipandu-api/dashboard')
            ->assertOk()
            ->assertJsonPath('progress.classes.0.learned_materials', 1)
            ->assertJsonPath('progress.classes.0.materials_available', 1);

        $this->actingAs($student)
            ->putJson("/sipandu-api/classes/{$class->id}/materials/{$materialId}/learned", [
                'learned' => false,
            ])
            ->assertOk()
            ->assertJsonPath('learned', false);

        $this->assertDatabaseMissing('course_class_material_progress', [
            'course_class_material_id' => $materialId,
            'user_id' => $student->id,
        ]);
    }

    public function test_student_cannot_manage_learning_evidence_or_grade_submissions(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $meeting = $class->meetings()->firstOrFail();

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/materials", [
                'title' => 'Tidak boleh',
                'resource_type' => 'link',
                'resource_url' => 'https://example.com',
                'is_published' => true,
            ])
            ->assertForbidden();

        $assignmentResponse = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/assignments", [
                'title' => 'Kuis',
                'instructions' => null,
                'sub_cpmk_code' => 'SUB-CPMK-01',
                'weight_percent' => 10,
                'max_score' => 100,
                'due_at' => null,
                'status' => 'published',
            ])
            ->assertCreated();

        $assignment = CourseClassAssignment::query()->findOrFail($assignmentResponse->json('assignment.id'));

        $submissionResponse = $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submission", [
                'answer_text' => 'Jawaban mahasiswa',
            ])
            ->assertOk();

        $submissionId = $submissionResponse->json('submission.id');

        $this->actingAs($student)
            ->patchJson("/sipandu-api/classes/{$class->id}/assignments/{$assignment->id}/submissions/{$submissionId}/grade", [
                'score' => 100,
            ])
            ->assertForbidden();
    }

    /**
     * @return array{0: CourseClass, 1: User, 2: User}
     */
    private function makeClassWithStudent(): array
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT201',
            'course_name' => 'Algoritma dan Dasar Pemrograman',
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
