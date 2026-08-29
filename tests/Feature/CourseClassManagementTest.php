<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClassMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseClassManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_lecturer_can_create_manual_class_with_local_snapshot(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);

        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
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
        $response->assertJsonPath('detail_url', "/kelas/{$classId}");
        $this->assertNotEmpty($response->json('join_code'));

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

        $this->actingAs($student)->postJson('/sipandu-api/classes', [
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

        $class = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
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
            ->postJson("/sipandu-api/classes/{$classId}/participants", ['email' => $student->email])
            ->assertOk();

        $this->actingAs($student)
            ->getJson('/sipandu-api/classes')
            ->assertOk()
            ->assertJsonCount(1, 'classes')
            ->assertJsonPath('classes.0.id', $classId)
            ->assertJsonPath('classes.0.detail_url', "/kelas/{$classId}");

        $this->actingAs($otherStudent)
            ->getJson('/sipandu-api/classes')
            ->assertOk()
            ->assertJsonCount(0, 'classes');
    }

    public function test_student_join_code_request_requires_lecturer_approval(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $class = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT003',
            'course_name' => 'Algoritma & Dasar Pemrograman',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $classId = $class->json('class_id');
        $joinCode = $class->json('join_code');

        $this->actingAs($student)
            ->postJson('/sipandu-api/classes/join', ['code' => strtolower($joinCode)])
            ->assertStatus(202)
            ->assertJsonPath('class_id', $classId)
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('auto_approved', false);

        $this->assertDatabaseHas('course_class_memberships', [
            'course_class_id' => $classId,
            'user_id' => $student->id,
            'membership_role' => 'student',
            'status' => 'pending',
        ]);

        $this->actingAs($student)
            ->getJson('/sipandu-api/classes')
            ->assertOk()
            ->assertJsonCount(0, 'classes');

        $membership = CourseClassMembership::query()
            ->where('course_class_id', $classId)
            ->where('user_id', $student->id)
            ->firstOrFail();

        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$classId}/join-requests/{$membership->id}/approve")
            ->assertOk()
            ->assertJsonPath('status', 'active');

        $this->assertDatabaseHas('course_class_memberships', [
            'id' => $membership->id,
            'status' => 'active',
        ]);

        $this->actingAs($student)
            ->getJson('/sipandu-api/classes')
            ->assertOk()
            ->assertJsonCount(1, 'classes')
            ->assertJsonPath('classes.0.id', $classId);

        $this->actingAs($student)
            ->get("/kelas/{$classId}")
            ->assertOk();
    }

    public function test_invalid_join_code_is_rejected(): void
    {
        $student = User::factory()->create(['role' => UserRole::Student]);

        $this->actingAs($student)
            ->postJson('/sipandu-api/classes/join', ['code' => 'K1-INVALID'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_lecturer_can_seed_demo_learning_data_without_duplicates(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);

        $class = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT004',
            'course_name' => 'Algoritma & Dasar Pemrograman',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $classId = $class->json('class_id');

        $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$classId}/demo-data")
            ->assertOk()
            ->assertJsonPath('created.materials', 4)
            ->assertJsonPath('created.assignments', 3);

        $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$classId}/demo-data")
            ->assertOk()
            ->assertJsonPath('created.materials', 0)
            ->assertJsonPath('created.assignments', 0);

        $this->assertDatabaseCount('course_class_materials', 4);
        $this->assertDatabaseCount('course_class_assignments', 3);
    }

    public function test_lecturer_can_delete_own_class_and_cascaded_learning_data(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);

        $class = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT005',
            'course_name' => 'Algoritma & Dasar Pemrograman',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'C',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $classId = $class->json('class_id');

        $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$classId}/demo-data")
            ->assertOk();

        $this->actingAs($lecturer)
            ->deleteJson("/sipandu-api/classes/{$classId}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('course_classes', ['id' => $classId]);
        $this->assertDatabaseMissing('course_class_memberships', ['course_class_id' => $classId]);
        $this->assertDatabaseMissing('course_class_meetings', ['course_class_id' => $classId]);
        $this->assertDatabaseCount('course_class_materials', 0);
        $this->assertDatabaseCount('course_class_assignments', 0);
    }

    public function test_student_cannot_delete_class(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $class = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT006',
            'course_name' => 'Analisis Data',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'D',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $classId = $class->json('class_id');

        $this->actingAs($student)
            ->deleteJson("/sipandu-api/classes/{$classId}")
            ->assertForbidden();

        $this->assertDatabaseHas('course_classes', ['id' => $classId]);
    }
}
