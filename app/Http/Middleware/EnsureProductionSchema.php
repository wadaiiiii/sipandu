<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class EnsureProductionSchema
{
    private const POSTGRES_LOCK_ID = 2026082901;

    private static ?bool $schemaReady = null;

    /**
     * Pastikan schema LMS production lengkap sebelum endpoint utama dipakai.
     * Berlaku untuk Vercel maupun hosting kampus (MySQL/PostgreSQL).
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->shouldCheck($request) || $this->schemaReady()) {
            return $next($request);
        }

        try {
            $this->synchronise();
        } catch (Throwable $exception) {
            report($exception);

            if ($request->expectsJson() || $request->is('sipandu-api/*')) {
                return new JsonResponse([
                    'message' => 'Database LMS sedang disinkronkan. Silakan coba kembali beberapa saat lagi.',
                    'code' => 'SIPANDU_SCHEMA_NOT_READY',
                ], 503);
            }

            abort(503, 'Database LMS sedang disinkronkan. Silakan muat ulang halaman.');
        }

        if (! $this->schemaReady(force: true)) {
            if ($request->expectsJson() || $request->is('sipandu-api/*')) {
                return new JsonResponse([
                    'message' => 'Database LMS belum lengkap. Administrator perlu menjalankan sinkronisasi schema.',
                    'code' => 'SIPANDU_SCHEMA_NOT_READY',
                ], 503);
            }

            abort(503, 'Database LMS belum lengkap. Silakan hubungi administrator.');
        }

        return $next($request);
    }

    private function shouldCheck(Request $request): bool
    {
        if (! (bool) config('sipandu.auto_schema_sync', false)) {
            return false;
        }

        return $request->is('sipandu-api/*') || $request->is('kelas/*');
    }

    private function schemaReady(bool $force = false): bool
    {
        if (! $force && self::$schemaReady !== null) {
            return self::$schemaReady;
        }

        self::$schemaReady = Schema::hasTable('users')
            && Schema::hasTable('courses')
            && Schema::hasTable('academic_terms')
            && Schema::hasTable('course_classes')
            && Schema::hasColumn('course_classes', 'rps_source_type')
            && Schema::hasColumn('course_classes', 'join_code')
            && Schema::hasTable('rps_snapshots')
            && Schema::hasTable('course_class_memberships')
            && Schema::hasTable('course_class_meetings')
            && Schema::hasTable('course_class_materials')
            && Schema::hasColumn('course_class_materials', 'attachment_url')
            && Schema::hasColumn('course_class_materials', 'attachment_name')
            && Schema::hasTable('course_class_assignments')
            && Schema::hasColumn('course_class_assignments', 'attachment_url')
            && Schema::hasColumn('course_class_assignments', 'attachment_name')
            && Schema::hasTable('course_class_submissions')
            && Schema::hasTable('course_class_attendances')
            && Schema::hasTable('course_class_announcements')
            && Schema::hasTable('course_class_uploaded_files')
            && Schema::hasTable('course_class_material_progress')
            && Schema::hasTable('course_class_comments')
            && Schema::hasTable('course_class_quizzes')
            && Schema::hasTable('quiz_questions')
            && Schema::hasTable('quiz_question_options')
            && Schema::hasTable('quiz_attempts')
            && Schema::hasTable('quiz_answers');

        return self::$schemaReady;
    }

    private function synchronise(): void
    {
        if (! Schema::hasTable('migrations')) {
            throw new \RuntimeException('Migration repository is not available. Run the protected production setup first.');
        }

        $driver = DB::connection()->getDriverName();
        $isPostgres = $driver === 'pgsql';

        if ($isPostgres) {
            DB::select('select pg_advisory_lock(?)', [self::POSTGRES_LOCK_ID]);
        }

        try {
            self::$schemaReady = null;
            if ($this->schemaReady(force: true)) {
                return;
            }

            Artisan::call('migrate', [
                '--force' => true,
            ]);

            self::$schemaReady = null;
        } finally {
            if ($isPostgres) {
                DB::select('select pg_advisory_unlock(?)', [self::POSTGRES_LOCK_ID]);
            }
        }
    }
}
