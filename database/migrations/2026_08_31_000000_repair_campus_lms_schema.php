<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->repairAcademicCore();
        $this->repairClassExtensions();
        $this->repairLearningCycle();
        $this->repairCommunicationAndFiles();
        $this->repairQuizCore();
    }

    /**
     * Migration ini sengaja tidak melakukan rollback destruktif.
     * Fungsinya adalah memulihkan object schema yang hilang pada production kampus.
     */
    public function down(): void
    {
        // no-op
    }

    private function repairAcademicCore(): void
    {
        if (! Schema::hasTable('courses')) {
            Schema::create('courses', function (Blueprint $table): void {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->unsignedTinyInteger('credits')->default(2);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('academic_terms')) {
            Schema::create('academic_terms', function (Blueprint $table): void {
                $table->id();
                $table->string('academic_year');
                $table->string('semester');
                $table->date('starts_at')->nullable();
                $table->date('ends_at')->nullable();
                $table->boolean('is_active')->default(false)->index();
                $table->timestamps();
                $table->unique(['academic_year', 'semester']);
            });
        }

        if (! Schema::hasTable('course_classes')) {
            Schema::create('course_classes', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_id')->constrained()->cascadeOnDelete();
                $table->foreignId('academic_term_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('status')->default('draft')->index();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('rps_snapshots')) {
            Schema::create('rps_snapshots', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
                $table->string('source_type')->index();
                $table->string('source_identifier')->nullable()->index();
                $table->string('source_version')->nullable();
                $table->json('payload');
                $table->boolean('is_current')->default(true)->index();
                $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('imported_at')->nullable();
                $table->timestamps();
            });
        }
    }

    private function repairClassExtensions(): void
    {
        if (! Schema::hasColumn('course_classes', 'rps_source_type')) {
            Schema::table('course_classes', function (Blueprint $table): void {
                $table->string('rps_source_type')->default('manual')->index();
            });
        }

        if (! Schema::hasColumn('course_classes', 'join_code')) {
            Schema::table('course_classes', function (Blueprint $table): void {
                $table->string('join_code', 30)->nullable()->unique();
            });
        }

        if (! Schema::hasTable('course_class_memberships')) {
            Schema::create('course_class_memberships', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('membership_role')->default('student')->index();
                $table->string('status')->default('active')->index();
                $table->timestamps();
                $table->unique(['course_class_id', 'user_id']);
            });
        }

        if (! Schema::hasTable('course_class_meetings')) {
            Schema::create('course_class_meetings', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
                $table->unsignedTinyInteger('meeting_number');
                $table->string('title')->nullable();
                $table->text('topic')->nullable();
                $table->string('sub_cpmk_code')->nullable()->index();
                $table->string('learning_method')->nullable();
                $table->text('learning_activity')->nullable();
                $table->text('material_summary')->nullable();
                $table->string('status')->default('planned')->index();
                $table->dateTime('starts_at')->nullable();
                $table->timestamps();
                $table->unique(['course_class_id', 'meeting_number']);
            });
        }
    }

    private function repairLearningCycle(): void
    {
        if (! Schema::hasTable('course_class_materials')) {
            Schema::create('course_class_materials', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_meeting_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->string('resource_type')->default('link');
                $table->text('description')->nullable();
                $table->text('resource_url')->nullable();
                $table->text('attachment_url')->nullable();
                $table->string('attachment_name')->nullable();
                $table->boolean('is_published')->default(true)->index();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        } else {
            if (! Schema::hasColumn('course_class_materials', 'attachment_url')) {
                Schema::table('course_class_materials', function (Blueprint $table): void {
                    $table->text('attachment_url')->nullable();
                });
            }
            if (! Schema::hasColumn('course_class_materials', 'attachment_name')) {
                Schema::table('course_class_materials', function (Blueprint $table): void {
                    $table->string('attachment_name')->nullable();
                });
            }
        }

        if (! Schema::hasTable('course_class_assignments')) {
            Schema::create('course_class_assignments', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_meeting_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->text('instructions')->nullable();
                $table->text('attachment_url')->nullable();
                $table->string('attachment_name')->nullable();
                $table->string('sub_cpmk_code')->nullable()->index();
                $table->decimal('weight_percent', 5, 2)->default(0);
                $table->decimal('max_score', 8, 2)->default(100);
                $table->dateTime('due_at')->nullable()->index();
                $table->string('status')->default('draft')->index();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        } else {
            if (! Schema::hasColumn('course_class_assignments', 'attachment_url')) {
                Schema::table('course_class_assignments', function (Blueprint $table): void {
                    $table->text('attachment_url')->nullable();
                });
            }
            if (! Schema::hasColumn('course_class_assignments', 'attachment_name')) {
                Schema::table('course_class_assignments', function (Blueprint $table): void {
                    $table->string('attachment_name')->nullable();
                });
            }
        }

        if (! Schema::hasTable('course_class_submissions')) {
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
        }

        if (! Schema::hasTable('course_class_attendances')) {
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
    }

    private function repairCommunicationAndFiles(): void
    {
        if (! Schema::hasTable('course_class_announcements')) {
            Schema::create('course_class_announcements', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
                $table->text('body');
                $table->boolean('is_pinned')->default(false)->index();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['course_class_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('course_class_uploaded_files')) {
            Schema::create('course_class_uploaded_files', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('purpose', 40)->index();
                $table->string('original_name');
                $table->string('mime_type', 160)->nullable();
                $table->unsignedBigInteger('size_bytes')->default(0);
                $table->text('blob_url');
                $table->string('blob_pathname', 950);
                $table->timestamps();
                $table->index(['course_class_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('course_class_material_progress')) {
            Schema::create('course_class_material_progress', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_material_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->dateTime('learned_at')->nullable()->index();
                $table->timestamps();
                $table->unique(['course_class_material_id', 'user_id'], 'material_student_progress_unique');
            });
        }

        if (! Schema::hasTable('course_class_comments')) {
            Schema::create('course_class_comments', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
                $table->foreignId('course_class_meeting_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('course_class_material_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('course_class_assignment_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('parent_id')->nullable()->constrained('course_class_comments')->cascadeOnDelete();
                $table->text('body');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['course_class_id', 'created_at']);
            });
        }
    }

    private function repairQuizCore(): void
    {
        if (! Schema::hasTable('course_class_quizzes')) {
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
        }

        if (! Schema::hasTable('quiz_questions')) {
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
        }

        if (! Schema::hasTable('quiz_question_options')) {
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
        }

        if (! Schema::hasTable('quiz_attempts')) {
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
        }

        if (! Schema::hasTable('quiz_answers')) {
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
    }
};
