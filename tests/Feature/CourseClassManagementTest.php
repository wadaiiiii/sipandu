<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseClassManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_lecturer_can_create_manual_class_with_local_snapshot(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);

        $response = $this->actingAs($lecturer)->postJson('/api/classes', [
            'course_code' => 'MAT041325',
            'course_name' => 'Algoritma & Dasar Pemrograman',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ]);

        $response->assertCreated()->assertJsonPath('ok', true);
        $classId = $response->json('class_id');

        $this->assertDatabaseHas('course_classes', [
            'id' => $classId,
            'rps_source_type' => 'manual',
            'created_by' => $lecturer->id,
        ]);
        $this->assertDatabaseHas('course_class_memberships', [
            'course_class_id' => $classId,
            'user_id' => $lecturer->id,
            'membership_role' => 'lecturer',
        ]);
        $this->assertDatabaseHas('rps_snapshots', [
            'course_class_id' => $classId,
            'source_type' => 'manual',
            'is_current' => true,
        ]);
    }

    public function test_student_cannot_create_class(): void
    {
        $student = User::factory()->create(['role' => UserRole::Student]);

        $this->actingAs($student)->postJson('/api/classes', [
            'course_code' => 'MAT001',
            'course_name' => 'Mata Kuliah',
            'credits' => 2,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertForbidden();
    }

    public function test_lecturer_can_enrol_existing_student_and_student_sees_only_their_class(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);
        $otherStudent = User::factory()->create(['role' => UserRole::Student]);

        $class = $this->actingAs($lecturer)->postJson('/api/classes', [
            'course_code' => 'MAT002',
            'course_name' => 'Analisis Data',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'B',
            'rps_source_type' => 'simatrps',
        ])->assertCreated();

        $classId = $class->json('class_id');

        $this->actingAs($lecturer)
            ->postJson("/api/classes/{$classId}/participants", ['email' => $student->email])
            ->assertOk();

        $this->actingAs($student)
            ->getJson('/api/classes')
            ->assertOk()
            ->assertJsonCount(1, 'classes')
            ->assertJsonPath('classes.0.id', $classId);

        $this->actingAs($otherStudent)
            ->getJson('/api/classes')
            ->assertOk()
            ->assertJsonCount(0, 'classes');
    }
}
