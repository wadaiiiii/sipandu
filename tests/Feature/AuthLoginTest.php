<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_login_with_nim(): void
    {
        $student = User::factory()->create([
            'email' => 'mahasiswa@unsulbar.ac.id',
            'identity_number' => 'D0223123',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/login', [
            'email' => 'D0223123',
            'password' => 'password123',
        ]);

        $response->assertOk()->assertJson(['ok' => true]);
        $this->assertAuthenticatedAs($student);
    }

    public function test_user_can_still_login_with_email(): void
    {
        $user = User::factory()->create([
            'email' => 'dosen@unsulbar.ac.id',
            'identity_number' => '19880101',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/login', [
            'email' => 'DOSEN@UNSULBAR.AC.ID',
            'password' => 'password123',
        ]);

        $response->assertOk()->assertJson(['ok' => true]);
        $this->assertAuthenticatedAs($user);
    }

    public function test_invalid_identifier_returns_clear_message(): void
    {
        $response = $this->postJson('/login', [
            'email' => 'D0000000',
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath('errors.email.0', 'NIM/email atau kata sandi tidak sesuai.');
    }

    public function test_first_login_requires_password_update_and_can_finish_without_old_password(): void
    {
        $student = User::factory()->create([
            'identity_number' => 'D0223999',
            'password' => 'D0223999',
            'must_change_password' => true,
        ]);

        $this->postJson('/login', [
            'email' => 'D0223999',
            'password' => 'D0223999',
        ])->assertOk()
            ->assertJsonPath('must_change_password', true);

        $this->postJson('/sipandu-api/password/update', [
            'password' => 'password-baru',
            'password_confirmation' => 'password-baru',
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'must_change_password' => false,
        ]);
    }

    public function test_normal_password_update_requires_current_password(): void
    {
        $user = User::factory()->create([
            'password' => 'password-lama',
            'must_change_password' => false,
        ]);

        $this->actingAs($user)
            ->postJson('/sipandu-api/password/update', [
                'password' => 'password-baru',
                'password_confirmation' => 'password-baru',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->actingAs($user)
            ->postJson('/sipandu-api/password/update', [
                'current_password' => 'password-lama',
                'password' => 'password-baru',
                'password_confirmation' => 'password-baru',
            ])
            ->assertOk();
    }

}
