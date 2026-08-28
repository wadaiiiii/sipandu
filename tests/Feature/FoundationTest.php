<?php

namespace Tests\Feature;

use App\Enums\RpsSourceType;
use App\Enums\UserRole;
use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\CourseClass;
use App\Models\User;
use App\Services\Rps\RpsSnapshotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_foundation_exposes_independent_rps_sources(): void
    {
        $response = $this->getJson('/sipandu-api/bootstrap');

        $response->assertOk()
            ->assertJsonPath('product.name', 'SiPANDU')
            ->assertJsonPath('product.operationally_independent', true)
            ->assertJsonFragment(['value' => 'manual', 'label' => 'Input Manual'])
            ->assertJsonFragment(['value' => 'file', 'label' => 'Import File'])
            ->assertJsonFragment(['value' => 'simatrps', 'label' => 'SiMatRPS'])
            ->assertJsonFragment(['value' => 'external', 'label' => 'Sistem Eksternal']);
    }

    public function test_active_user_can_login_and_inactive_user_cannot(): void
    {
        $active = User::factory()->create(['role' => UserRole::Lecturer, 'password' => 'secret-pass']);

        $this->postJson('/login', ['email' => $active->email, 'password' => 'secret-pass'])
            ->assertOk();

        $this->postJson('/logout')->assertOk();

        $inactive = User::factory()->create(['is_active' => false, 'password' => 'secret-pass']);

        $this->postJson('/login', ['email' => $inactive->email, 'password' => 'secret-pass'])
            ->assertUnprocessable();
    }

    public function test_class_keeps_local_rps_snapshot_when_source_changes(): void
    {
        $actor = User::factory()->create(['role' => UserRole::Lecturer]);
        $course = Course::query()->create(['code' => 'MAT001', 'name' => 'Contoh Mata Kuliah', 'credits' => 3]);
        $term = AcademicTerm::query()->create(['academic_year' => '2026/2027', 'semester' => 'Ganjil', 'is_active' => true]);
        $class = CourseClass::query()->create(['course_id' => $course->id, 'academic_term_id' => $term->id, 'name' => 'A', 'created_by' => $actor->id]);
        $service = app(RpsSnapshotService::class);

        $first = $service->capture($class, RpsSourceType::Simatrps, ['sub_cpmk' => [['code' => 'S1']]], 'rps-123', 'v1', $actor);
        $second = $service->capture($class, RpsSourceType::Manual, ['sub_cpmk' => [['code' => 'S1'], ['code' => 'S2']]], null, 'local-2', $actor);

        $this->assertDatabaseHas('rps_snapshots', ['id' => $first->id, 'source_type' => 'simatrps', 'is_current' => false]);
        $this->assertDatabaseHas('rps_snapshots', ['id' => $second->id, 'source_type' => 'manual', 'is_current' => true]);
        $this->assertSame('S1', $first->fresh()->payload['sub_cpmk'][0]['code']);
    }
}
