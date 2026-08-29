<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassJoinApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_lecturer_can_reject_pending_join_request(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);
        [$classId, $joinCode] = $this->createClass($lecturer, 'MAT-JOIN-01');

        $this->actingAs($student)
            ->postJson('/sipandu-api/classes/join', ['code' => $joinCode])
            ->assertStatus(202)
            ->assertJsonPath('status', 'pending');

        $membership = CourseClassMembership::query()
            ->where('course_class_id', $classId)
            ->where('user_id', $student->id)
            ->firstOrFail();

        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$classId}/join-requests/{$membership->id}/reject")
            ->assertOk()
            ->assertJsonPath('status', 'rejected');

        $this->assertDatabaseHas('course_class_memberships', [
            'id' => $membership->id,
            'status' => 'rejected',
        ]);

        $this->actingAs($student)
            ->getJson('/sipandu-api/classes')
            ->assertOk()
            ->assertJsonCount(0, 'classes');
    }

    public function test_rostered_student_is_auto_approved_when_using_join_code(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);
        [$classId, $joinCode] = $this->createClass($lecturer, 'MAT-JOIN-02');

        $courseClass = CourseClass::query()->findOrFail($classId);
        $courseClass->memberships()->create([
            'user_id' => $student->id,
            'membership_role' => 'student',
            'status' => 'roster',
        ]);

        $this->actingAs($student)
            ->postJson('/sipandu-api/classes/join', ['code' => $joinCode])
            ->assertOk()
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('auto_approved', true);

        $this->assertDatabaseHas('course_class_memberships', [
            'course_class_id' => $classId,
            'user_id' => $student->id,
            'status' => 'active',
        ]);
    }

    public function test_other_lecturer_cannot_process_join_request(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $otherLecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);
        [$classId, $joinCode] = $this->createClass($lecturer, 'MAT-JOIN-03');

        $this->actingAs($student)
            ->postJson('/sipandu-api/classes/join', ['code' => $joinCode])
            ->assertStatus(202);

        $membership = CourseClassMembership::query()
            ->where('course_class_id', $classId)
            ->where('user_id', $student->id)
            ->firstOrFail();

        $this->actingAs($otherLecturer)
            ->patchJson("/sipandu-api/classes/{$classId}/join-requests/{$membership->id}/approve")
            ->assertForbidden();

        $this->assertDatabaseHas('course_class_memberships', [
            'id' => $membership->id,
            'status' => 'pending',
        ]);
    }

    private function createClass(User $lecturer, string $courseCode): array
    {
        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => $courseCode,
            'course_name' => 'Kelas Uji Approval',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        return [(int) $response->json('class_id'), (string) $response->json('join_code')];
    }
}
