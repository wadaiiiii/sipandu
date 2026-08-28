<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_class_materials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_meeting_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('resource_type')->default('link');
            $table->text('description')->nullable();
            $table->text('resource_url')->nullable();
            $table->boolean('is_published')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('course_class_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_meeting_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('instructions')->nullable();
            $table->string('sub_cpmk_code')->nullable()->index();
            $table->decimal('weight_percent', 5, 2)->default(0);
            $table->decimal('max_score', 8, 2)->default(100);
            $table->dateTime('due_at')->nullable()->index();
            $table->string('status')->default('draft')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('course_class_submissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('answer_text')->nullable();
            $table->text('attachment_url')->nullable();
            $table->dateTime('submitted_at')->nullable()->index();
            $table->decimal('score', 8, 2)->nullable();
            $table->text('feedback')->nullable();
            $table->foreignId('graded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('graded_at')->nullable();
            $table->timestamps();

            $table->unique(['course_class_assignment_id', 'user_id'], 'assignment_student_unique');
        });

        Schema::create('course_class_attendances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('present')->index();
            $table->string('note', 500)->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['course_class_meeting_id', 'user_id'], 'meeting_student_attendance_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_class_attendances');
        Schema::dropIfExists('course_class_submissions');
        Schema::dropIfExists('course_class_assignments');
        Schema::dropIfExists('course_class_materials');
    }
};