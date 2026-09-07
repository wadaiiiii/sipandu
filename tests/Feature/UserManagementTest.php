<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_user_management_page_and_create_student(): void
    {
        $this->withoutVite();

        $admin = User::factory()->create(['role' => UserRole::AdminProdi]);

        $this->actingAs($admin)->get('/pengguna')->assertOk();

        $response = $this->actingAs($admin)->postJson('/sipandu-api/users', [
            'name' => 'Mahasiswa Contoh',
            'email' => 'mahasiswa@example.test',
            'identity_number' => 'D0226001',
            'role' => 'student',
        ]);

        $response->assertCreated()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('initial_password', 'D0226001');
        $this->assertDatabaseHas('users', [
            'email' => 'mahasiswa@example.test',
            'identity_number' => 'D0226001',
            'role' => 'student',
            'is_active' => true,
            'must_change_password' => true,
        ]);
    }

    public function test_non_admin_cannot_manage_users(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);

        $this->actingAs($lecturer)->get('/pengguna')->assertRedirect('/');
        $this->actingAs($lecturer)->getJson('/sipandu-api/users')->assertForbidden();
        $this->actingAs($lecturer)->postJson('/sipandu-api/users', [
            'name' => 'Mahasiswa Contoh',
            'email' => 'blocked@example.test',
            'role' => 'student',
            'password' => 'password-awal',
        ])->assertForbidden();
    }

    public function test_admin_can_deactivate_user_but_not_self(): void
    {
        $admin = User::factory()->create(['role' => UserRole::AdminProdi]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $this->actingAs($admin)
            ->patchJson("/sipandu-api/users/{$student->id}/status", ['is_active' => false])
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $student->id, 'is_active' => false]);

        $this->actingAs($admin)
            ->patchJson("/sipandu-api/users/{$admin->id}/status", ['is_active' => false])
            ->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $admin->id, 'is_active' => true]);
    }

    public function test_admin_reset_uses_student_nim_and_forces_next_login_update(): void
    {
        $admin = User::factory()->create(['role' => UserRole::AdminProdi]);
        $student = User::factory()->create([
            'role' => UserRole::Student,
            'identity_number' => 'D0226002',
            'password' => 'password-lama',
            'must_change_password' => false,
        ]);

        $this->actingAs($admin)
            ->postJson("/sipandu-api/users/{$student->id}/reset-password")
            ->assertOk()
            ->assertJsonPath('temporary_password', 'D0226002');

        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'must_change_password' => true,
        ]);
    }

}
