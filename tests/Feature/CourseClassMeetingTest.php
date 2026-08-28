<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseClassMeetingTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_class_gets_sixteen_meeting_slots(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);

        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT101',
            'course_name' => 'Algoritma',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $classId = $response->json('class_id');

        $this->assertDatabaseCount('course_class_meetings', 16);
        $this->assertDatabaseHas('course_class_meetings', [
            'course_class_id' => $classId,
            'meeting_number' => 1,
            'title' => 'Pertemuan 1',
            'status' => 'planned',
        ]);
        $this->assertDatabaseHas('course_class_meetings', [
            'course_class_id' => $classId,
            'meeting_number' => 16,
        ]);
    }

    public function test_lecturer_can_update_meeting_and_student_is_read_only(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $meeting = $class->meetings()->where('meeting_number', 3)->firstOrFail();

        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}", [
                'title' => 'Implementasi BFS dan DFS',
                'topic' => 'Analisis kompleksitas algoritma pencarian.',
                'sub_cpmk_code' => 'Sub-CPMK-2',
                'learning_method' => 'Praktikum berbasis kasus',
                'learning_activity' => 'Mahasiswa mengimplementasikan BFS dan DFS pada aplikasi komputasi sederhana.',
                'material_summary' => 'Traversal graf, kompleksitas waktu dan ruang, serta perbandingan BFS dan DFS.',
                'status' => 'published',
                'starts_at' => '2026-09-10 08:00:00',
            ])
            ->assertOk();

        $this->assertDatabaseHas('course_class_meetings', [
            'id' => $meeting->id,
            'title' => 'Implementasi BFS dan DFS',
            'sub_cpmk_code' => 'Sub-CPMK-2',
            'status' => 'published',
        ]);

        $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$class->id}/meetings")
            ->assertOk()
            ->assertJsonPath('can_edit', false)
            ->assertJsonCount(16, 'meetings');

        $this->actingAs($student)
            ->patchJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}", [
                'title' => 'Tidak boleh diubah mahasiswa',
                'status' => 'completed',
            ])
            ->assertForbidden();
    }

    public function test_unrelated_student_cannot_open_class_workspace(): void
    {
        [$class] = $this->makeClassWithStudent();
        $otherStudent = User::factory()->create(['role' => UserRole::Student]);

        $this->actingAs($otherStudent)
            ->getJson("/sipandu-api/classes/{$class->id}/meetings")
            ->assertForbidden();
    }

    public function test_enrolled_student_can_open_class_page(): void
    {
        $this->withoutVite();
        [$class, , $student] = $this->makeClassWithStudent();

        $this->actingAs($student)
            ->get("/kelas/{$class->id}")
            ->assertOk();
    }

    /**
     * @return array{0: CourseClass, 1: User, 2: User}
     */
    private function makeClassWithStudent(): array
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT102',
            'course_name' => 'Struktur Data dan Algoritma',
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
