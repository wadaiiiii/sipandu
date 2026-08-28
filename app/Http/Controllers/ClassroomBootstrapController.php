<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Services\Classroom\CourseClassMeetingService;
use App\Services\Storage\ClassroomFileStorage;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class ClassroomBootstrapController extends Controller
{
    private const LEARNING_MIGRATION = '2026_08_28_030000_create_classroom_learning_cycle_tables';

    private const ANNOUNCEMENT_MIGRATION = '2026_08_28_040000_create_course_class_announcements_table';

    private const FILE_MIGRATION = '2026_08_28_050000_create_course_class_uploaded_files_table';

    private const MATERIAL_PROGRESS_MIGRATION = '2026_08_28_060000_create_course_class_material_progress_table';

    public function __invoke(
        Request $request,
        CourseClass $courseClass,
        CourseClassMeetingService $meetings,
    ): JsonResponse {
        if (! $this->schemaReady()) {
            $user = $request->user();

            if (! $user || $user->role !== UserRole::AdminProdi) {
                return response()->json([
                    'message' => 'Ruang kelas belum siap. Silakan minta Admin Prodi membuka kelas terlebih dahulu untuk menyelesaikan pembaruan sistem.',
                ], 503);
            }

            try {
                $this->ensureClassroomTables();
            } catch (Throwable $exception) {
                report($exception);

                return response()->json([
                    'message' => 'Database ruang kelas belum dapat disiapkan. Coba muat ulang halaman. Jika masih gagal, periksa koneksi database production.',
                ], 500);
            }
        }

        if (! $this->schemaReady()) {
            return response()->json([
                'message' => 'Tabel LMS belum tersedia setelah proses pembaruan database.',
            ], 500);
        }

        return app(CourseClassMeetingController::class)->index(
            $request,
            $courseClass,
            $meetings,
            app(ClassroomFileStorage::class),
        );
    }

    private function ensureClassroomTables(): void
    {
        if (! Schema::hasTable('course_class_materials')) {
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
        }

        if (Schema::hasTable('course_class_assignments') && ! Schema::hasColumn('course_class_assignments', 'attachment_url')) {
            Schema::table('course_class_assignments', function (Blueprint $table): void {
                $table->text('attachment_url')->nullable();
            });
        }

        if (Schema::hasTable('course_class_assignments') && ! Schema::hasColumn('course_class_assignments', 'attachment_name')) {
            Schema::table('course_class_assignments', function (Blueprint $table): void {
                $table->string('attachment_name')->nullable();
            });
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

        if ($this->schemaReady() && Schema::hasTable('migrations')) {
            $this->recordMigration(self::LEARNING_MIGRATION);
            $this->recordMigration(self::ANNOUNCEMENT_MIGRATION);
            $this->recordMigration(self::FILE_MIGRATION);
            $this->recordMigration(self::MATERIAL_PROGRESS_MIGRATION);
        }
    }

    private function recordMigration(string $migration): void
    {
        if (DB::table('migrations')->where('migration', $migration)->exists()) {
            return;
        }

        $batch = ((int) DB::table('migrations')->max('batch')) + 1;

        DB::table('migrations')->insert([
            'migration' => $migration,
            'batch' => $batch,
        ]);
    }

    private function schemaReady(): bool
    {
        return Schema::hasTable('course_class_materials')
            && Schema::hasTable('course_class_assignments')
            && Schema::hasColumn('course_class_assignments', 'attachment_url')
            && Schema::hasColumn('course_class_assignments', 'attachment_name')
            && Schema::hasTable('course_class_submissions')
            && Schema::hasTable('course_class_attendances')
            && Schema::hasTable('course_class_announcements')
            && Schema::hasTable('course_class_uploaded_files')
            && Schema::hasTable('course_class_material_progress');
    }
}
