<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_class_quizzes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->string('sub_cpmk_code', 80)->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->unsignedSmallInteger('max_attempts')->default(1);
            $table->boolean('shuffle_questions')->default(false);
            $table->boolean('shuffle_options')->default(false);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->string('status', 20)->default('draft');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->index(['course_class_id', 'status', 'due_at']);
        });

        Schema::create('quiz_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_quiz_id')->constrained('course_class_quizzes')->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(1);
            $table->string('type', 32);
            $table->text('prompt');
            $table->decimal('points', 8, 2)->default(1);
            $table->json('answer_key')->nullable();
            $table->text('explanation')->nullable();
            $table->timestamps();
            $table->index(['course_class_quiz_id', 'position']);
        });

        Schema::create('quiz_question_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('quiz_question_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(1);
            $table->string('option_key', 20);
            $table->text('label');
            $table->boolean('is_correct')->default(false);
            $table->timestamps();
            $table->unique(['quiz_question_id', 'option_key']);
        });

        Schema::create('quiz_attempts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_quiz_id')->constrained('course_class_quizzes')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('attempt_number')->default(1);
            $table->string('status', 20)->default('in_progress');
            $table->timestamp('started_at');
            $table->timestamp('submitted_at')->nullable();
            $table->decimal('auto_score', 10, 2)->default(0);
            $table->decimal('manual_score', 10, 2)->default(0);
            $table->decimal('score', 10, 2)->nullable();
            $table->decimal('max_score', 10, 2)->default(0);
            $table->timestamps();
            $table->unique(['course_class_quiz_id', 'user_id', 'attempt_number'], 'quiz_attempt_unique');
            $table->index(['user_id', 'status']);
        });

        Schema::create('quiz_answers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('quiz_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('quiz_question_id')->constrained()->cascadeOnDelete();
            $table->json('answer')->nullable();
            $table->decimal('score', 10, 2)->nullable();
            $table->boolean('is_correct')->nullable();
            $table->text('feedback')->nullable();
            $table->foreignId('graded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('graded_at')->nullable();
            $table->timestamps();
            $table->unique(['quiz_attempt_id', 'quiz_question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_answers');
        Schema::dropIfExists('quiz_attempts');
        Schema::dropIfExists('quiz_question_options');
        Schema::dropIfExists('quiz_questions');
        Schema::dropIfExists('course_class_quizzes');
    }
};
