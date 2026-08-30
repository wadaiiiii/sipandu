<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassroomDiscussionTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_comment_is_returned_immediately_and_nested_reply_stays_in_root_thread(): void
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $classResponse = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT301',
            'course_name' => 'Diskusi Matematika',
            'credits' => 3,
            'academic_year' => '2026/2027',
            'semester' => 'ganjil',
            'class_name' => 'A',
            'rps_source_type' => 'manual',
        ])->assertCreated();

        $courseClass = CourseClass::query()->findOrFail($classResponse->json('class_id'));

        $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$courseClass->id}/participants", ['email' => $student->email])
            ->assertOk();

        $rootResponse = $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$courseClass->id}/comments", [
                'body' => 'Halo semua',
                'target_type' => 'class',
                'target_id' => null,
                'parent_id' => null,
            ])
            ->assertCreated()
            ->assertJsonPath('comment.body', 'Halo semua')
            ->assertJsonPath('comment.author.id', $student->id)
            ->assertJsonPath('comment.parent_id', null)
            ->assertJsonPath('comment.target_label', 'Diskusi kelas');

        $rootId = $rootResponse->json('comment.id');

        $replyResponse = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$courseClass->id}/comments", [
                'body' => 'Balasan dosen',
                'target_type' => 'class',
                'target_id' => null,
                'parent_id' => $rootId,
            ])
            ->assertCreated()
            ->assertJsonPath('comment.parent_id', $rootId);

        $replyId = $replyResponse->json('comment.id');

        $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$courseClass->id}/comments", [
                'body' => 'Balasan ke balasan',
                'target_type' => 'class',
                'target_id' => null,
                'parent_id' => $replyId,
            ])
            ->assertCreated()
            ->assertJsonPath('comment.parent_id', $rootId);

        $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$courseClass->id}/comments")
            ->assertOk()
            ->assertJsonCount(3, 'comments')
            ->assertJsonPath('comments.2.parent_id', $rootId);
    }
}
