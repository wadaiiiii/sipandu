<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaterialResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_material_can_keep_external_link_and_file_attachment_together(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();
        $meeting = $class->meetings()->firstOrFail();

        $response = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/materials", [
                'title' => 'Turunan dan aplikasi',
                'resource_type' => 'reading',
                'description' => 'Gunakan \\(f(x)=2x\\) dan baca lampiran.',
                'resource_url' => 'https://example.com/referensi-turunan',
                'attachment_url' => 'https://example.com/files/modul-turunan.pdf',
                'attachment_name' => 'Modul Turunan.pdf',
                'is_published' => true,
            ])
            ->assertCreated();

        $materialId = $response->json('material.id');

        $this->assertDatabaseHas('course_class_materials', [
            'id' => $materialId,
            'resource_url' => 'https://example.com/referensi-turunan',
            'attachment_url' => 'https://example.com/files/modul-turunan.pdf',
            'attachment_name' => 'Modul Turunan.pdf',
        ]);

        $this->actingAs($lecturer)
            ->getJson("/sipandu-api/classes/{$class->id}/material-resources")
            ->assertOk()
            ->assertJsonPath('resources.0.id', $materialId)
            ->assertJsonPath('resources.0.resource_url', 'https://example.com/referensi-turunan')
            ->assertJsonPath('resources.0.attachment_url', 'https://example.com/files/modul-turunan.pdf')
            ->assertJsonPath('resources.0.attachment_name', 'Modul Turunan.pdf');

        $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$class->id}/material-resources")
            ->assertOk()
            ->assertJsonPath('resources.0.attachment_name', 'Modul Turunan.pdf');
    }

    public function test_student_cannot_create_material_resource(): void
    {
        [$class, , $student] = $this->makeClassWithStudent();
        $meeting = $class->meetings()->firstOrFail();

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/meetings/{$meeting->id}/materials", [
                'title' => 'Tidak boleh',
                'resource_type' => 'link',
                'resource_url' => 'https://example.com',
                'is_published' => true,
            ])
            ->assertForbidden();
    }

    /**
     * @return array{0: CourseClass, 1: User, 2: User}
     */
    private function makeClassWithStudent(): array
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT301',
            'course_name' => 'Kalkulus Lanjut',
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
