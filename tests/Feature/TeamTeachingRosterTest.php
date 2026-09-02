<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamTeachingRosterTest extends TestCase
{
    use RefreshDatabase;

    public function test_class_lecturer_can_add_partner_and_partner_can_manage_same_class_only(): void
    {
        [$class, $owner] = $this->makeClass('MAT501');
        [$otherClass] = $this->makeClass('MAT502');
        $partner = User::factory()->create(['role' => UserRole::Lecturer]);

        $this->actingAs($owner)
            ->postJson("/sipandu-api/classes/{$class->id}/lecturers", ['email' => $partner->email])
            ->assertOk();

        $this->actingAs($partner)
            ->postJson("/sipandu-api/classes/{$class->id}/student-roster", [
                'students' => [['nim' => 'E0426001', 'name' => 'Elza Natasya']],
            ])
            ->assertOk();

        $this->actingAs($partner)
            ->postJson("/sipandu-api/classes/{$otherClass->id}/student-roster", [
                'students' => [['nim' => 'E0426002', 'name' => 'Atika Cahyani']],
            ])
            ->assertForbidden();
    }

    public function test_roster_creates_personal_student_accounts_and_does_not_reset_existing_passwords(): void
    {
        [$class, $owner] = $this->makeClass('MAT503');
        $existing = User::factory()->create([
            'role' => UserRole::Student,
            'identity_number' => 'E0426002',
            'password' => 'kept-secret',
        ]);
        $originalPassword = $existing->password;

        $response = $this->actingAs($owner)
            ->postJson("/sipandu-api/classes/{$class->id}/student-roster", [
                'students' => [
                    ['nim' => 'E0426001', 'name' => 'Elza Natasya'],
                    ['nim' => 'E0426002', 'name' => 'Atika Cahyani'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('created_accounts', 1)
            ->assertJsonPath('enrolled_students', 2)
            ->assertJsonCount(1, 'credentials');

        $this->assertSame($originalPassword, $existing->fresh()->password);
        $this->assertDatabaseHas('course_class_memberships', [
            'course_class_id' => $class->id,
            'user_id' => $existing->id,
            'membership_role' => 'student',
            'status' => 'active',
        ]);

        $newStudent = User::query()->where('identity_number', 'E0426001')->firstOrFail();
        $this->actingAs($newStudent)
            ->getJson("/sipandu-api/classes/{$class->id}/meetings")
            ->assertOk()
            ->assertJsonPath('viewer_role', 'student')
            ->assertJsonCount(0, 'students');

        $generatedPassword = $response->json('credentials.0.password');
        $this->assertIsString($generatedPassword);
        $this->assertNotSame('', $generatedPassword);
    }

    private function makeClass(string $code): array
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => $code,
            'course_name' => 'Kelas Pengujian',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        return [CourseClass::query()->findOrFail($response->json('class_id')), $lecturer];
    }
}
