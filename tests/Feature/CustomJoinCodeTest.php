<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomJoinCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_lecturer_can_set_custom_join_code_and_student_can_use_it(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $classResponse = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT401',
            'course_name' => 'Analisis Real',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $class = CourseClass::query()->findOrFail($classResponse->json('class_id'));

        $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/join-code", ['code' => 'analisis-real-a'])
            ->assertOk()
            ->assertJsonPath('join_code', 'ANALISIS-REAL-A')
            ->assertJsonPath('custom', true);

        $this->actingAs($student)
            ->postJson('/sipandu-api/classes/join', ['code' => 'ANALISIS-REAL-A'])
            ->assertStatus(202)
            ->assertJsonPath('status', 'pending');
    }

    public function test_lecturer_can_edit_existing_material(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);

        $classResponse = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT402',
            'course_name' => 'Aljabar Linear',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'B',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $class = CourseClass::query()->findOrFail($classResponse->json('class_id'));
        $meeting = $class->meetings()->firstOrFail();

        $created = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/materials", [
                'title' => 'Matriks awal',
                'resource_type' => 'reading',
                'description' => 'Versi awal',
                'resource_url' => 'https://example.com/awal',
                'attachment_url' => null,
                'attachment_name' => null,
                'is_published' => true,
            ])->assertCreated();

        $materialId = $created->json('material.id');

        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/materials/{$materialId}", [
                'title' => 'Matriks dan determinan',
                'resource_type' => 'reading',
                'description' => 'Versi diperbarui',
                'resource_url' => 'https://example.com/baru',
                'attachment_url' => null,
                'attachment_name' => null,
                'is_published' => true,
            ])->assertOk()
            ->assertJsonPath('material.title', 'Matriks dan determinan');

        $this->assertDatabaseHas('course_class_materials', [
            'id' => $materialId,
            'title' => 'Matriks dan determinan',
            'resource_url' => 'https://example.com/baru',
        ]);
    }
}
