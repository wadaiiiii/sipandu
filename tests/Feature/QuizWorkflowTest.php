<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\QuizAnswer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_quiz_auto_grading_essay_review_and_answer_key_privacy(): void
    {
        [$class, $lecturer, $student] = $this->makeClassWithStudent();

        $quizResponse = $this->actingAs($lecturer)->postJson("/sipandu-api/classes/{$class->id}/quizzes", [
            'title' => 'Kuis Dasar Aljabar',
            'description' => 'Jawab soal berikut. Gunakan \\(x^2\\) bila diperlukan.',
            'sub_cpmk_code' => 'SUB-CPMK-01',
            'duration_minutes' => 30,
            'max_attempts' => 1,
            'shuffle_questions' => false,
            'shuffle_options' => false,
            'starts_at' => null,
            'due_at' => null,
            'status' => 'published',
        ])->assertCreated();
        $quizId = (int) $quizResponse->json('quiz.id');

        $mc = $this->createQuestion($lecturer, $class, $quizId, [
            'position' => 1,
            'type' => 'multiple_choice',
            'prompt' => 'Nilai 2 + 3 adalah ...',
            'points' => 2,
            'answer_key' => null,
            'explanation' => '2 + 3 = 5.',
            'options' => [
                ['key' => 'A', 'label' => '4', 'correct' => false],
                ['key' => 'B', 'label' => '5', 'correct' => true],
                ['key' => 'C', 'label' => '6', 'correct' => false],
            ],
        ]);
        $tf = $this->createQuestion($lecturer, $class, $quizId, [
            'position' => 2,
            'type' => 'true_false',
            'prompt' => '\\(1 + 1 = 2\\)',
            'points' => 1,
            'answer_key' => ['value' => true],
            'explanation' => null,
            'options' => null,
        ]);
        $short = $this->createQuestion($lecturer, $class, $quizId, [
            'position' => 3,
            'type' => 'short_answer',
            'prompt' => 'Tuliskan hasil dari 10 / 2.',
            'points' => 1,
            'answer_key' => ['accepted' => ['5', 'lima'], 'case_sensitive' => false],
            'explanation' => null,
            'options' => null,
        ]);
        $essay = $this->createQuestion($lecturer, $class, $quizId, [
            'position' => 4,
            'type' => 'essay',
            'prompt' => 'Jelaskan mengapa \\(E=mc^2\\) penting.',
            'points' => 3,
            'answer_key' => null,
            'explanation' => null,
            'options' => null,
        ]);

        $studentView = $this->actingAs($student)
            ->getJson("/sipandu-api/classes/{$class->id}/quizzes/{$quizId}")
            ->assertOk();

        $this->assertArrayNotHasKey('answer_key', $studentView->json('quiz.questions.0'));
        $this->assertArrayNotHasKey('correct', $studentView->json('quiz.questions.0.options.0'));

        $start = $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/quizzes/{$quizId}/start")
            ->assertCreated();
        $attemptId = (int) $start->json('attempt.id');

        $this->saveAnswer($student, $class, $quizId, $attemptId, $mc, ['value' => 'B']);
        $this->saveAnswer($student, $class, $quizId, $attemptId, $tf, ['value' => true]);
        $this->saveAnswer($student, $class, $quizId, $attemptId, $short, ['value' => 'LIMA']);
        $this->saveAnswer($student, $class, $quizId, $attemptId, $essay, ['value' => 'Persamaan ini menghubungkan massa dengan energi.']);

        $submit = $this->actingAs($student)
            ->postJson("/sipandu-api/classes/{$class->id}/quizzes/{$quizId}/attempts/{$attemptId}/submit")
            ->assertOk()
            ->assertJsonPath('attempt.status', 'submitted')
            ->assertJsonPath('attempt.score', null)
            ->assertJsonPath('attempt.max_score', 7);

        $this->actingAs($lecturer)
            ->getJson('/sipandu-api/assessment-center')
            ->assertOk()
            ->assertJsonPath('summary.need_review', 1);

        $lecturerView = $this->actingAs($lecturer)
            ->getJson("/sipandu-api/classes/{$class->id}/quizzes/{$quizId}")
            ->assertOk();
        $essayAnswer = collect($lecturerView->json('quiz.attempts.0.answers'))->firstWhere('question_type', 'essay');
        $this->assertNotNull($essayAnswer);

        $this->actingAs($lecturer)
            ->patchJson("/sipandu-api/classes/{$class->id}/quizzes/{$quizId}/attempts/{$attemptId}/answers/{$essayAnswer['id']}/grade", [
                'score' => 2,
                'feedback' => 'Penjelasan sudah tepat, dapat diperdalam.',
            ])
            ->assertOk()
            ->assertJsonPath('attempt.status', 'graded')
            ->assertJsonPath('attempt.score', 6);

        $center = $this->actingAs($student)
            ->getJson('/sipandu-api/assessment-center')
            ->assertOk();
        $quizItem = collect($center->json('items'))->firstWhere('source_type', 'quiz');
        $this->assertNotNull($quizItem);
        $this->assertSame('graded', $quizItem['student_status']);
        $this->assertSame(6, (int) $quizItem['score']);
        $this->assertStringContainsString("/kelas/{$class->id}/kuis?quiz={$quizId}", $quizItem['class_url']);
    }

    /** @return array{0: CourseClass, 1: User, 2: User} */
    private function makeClassWithStudent(): array
    {
        $lecturer = User::factory()->create(['role' => UserRole::Lecturer]);
        $student = User::factory()->create(['role' => UserRole::Student]);

        $response = $this->actingAs($lecturer)->postJson('/sipandu-api/classes', [
            'course_code' => 'MAT401',
            'course_name' => 'Aljabar Linear',
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

    private function createQuestion(User $lecturer, CourseClass $class, int $quizId, array $payload): int
    {
        $response = $this->actingAs($lecturer)
            ->postJson("/sipandu-api/classes/{$class->id}/quizzes/{$quizId}/questions", $payload)
            ->assertCreated();

        return (int) $response->json('question.id');
    }

    private function saveAnswer(User $student, CourseClass $class, int $quizId, int $attemptId, int $questionId, array $answer): void
    {
        $this->actingAs($student)
            ->putJson("/sipandu-api/classes/{$class->id}/quizzes/{$quizId}/attempts/{$attemptId}/questions/{$questionId}", ['answer' => $answer])
            ->assertOk();
    }
}
