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
            'password' => 'password-awal',
        ]);

        $response->assertCreated()->assertJsonPath('ok', true);
        $this->assertDatabaseHas('users', [
            'email' => 'mahasiswa@example.test',
            'identity_number' => 'D0226001',
            'role' => 'student',
            'is_active' => true,
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
}
