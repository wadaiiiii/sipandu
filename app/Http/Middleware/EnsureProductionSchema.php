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

    /**
     * Ensure Vercel production has the classroom migrations that the current
     * application code expects. This is intentionally scoped to LMS routes and
     * only runs migrations when the schema is actually behind.
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

        if (! $this->schemaReady()) {
            if ($request->expectsJson() || $request->is('sipandu-api/*')) {
                return new JsonResponse([
                    'message' => 'Database LMS belum siap. Silakan coba kembali beberapa saat lagi.',
                    'code' => 'SIPANDU_SCHEMA_NOT_READY',
                ], 503);
            }

            abort(503, 'Database LMS belum siap. Silakan muat ulang halaman.');
        }

        return $next($request);
    }

    private function shouldCheck(Request $request): bool
    {
        if (! getenv('VERCEL')) {
            return false;
        }

        return $request->is('sipandu-api/classes*')
            || $request->is('sipandu-api/dashboard')
            || $request->is('sipandu-api/assessment-center')
            || $request->is('sipandu-api/student/*')
            || $request->is('kelas/*');
    }

    private function schemaReady(): bool
    {
        return Schema::hasTable('course_classes')
            && Schema::hasColumn('course_classes', 'join_code')
            && Schema::hasTable('course_class_memberships')
            && Schema::hasTable('course_class_meetings')
            && Schema::hasTable('course_class_materials')
            && Schema::hasColumn('course_class_materials', 'attachment_url')
            && Schema::hasColumn('course_class_materials', 'attachment_name')
            && Schema::hasTable('course_class_quizzes')
            && Schema::hasTable('quiz_questions')
            && Schema::hasTable('quiz_question_options')
            && Schema::hasTable('quiz_attempts')
            && Schema::hasTable('quiz_answers');
    }

    private function synchronise(): void
    {
        if (! Schema::hasTable('migrations')) {
            throw new \RuntimeException('Migration repository is not available. Run the protected production setup first.');
        }

        $isPostgres = DB::connection()->getDriverName() === 'pgsql';

        if ($isPostgres) {
            DB::select('select pg_advisory_lock(?)', [self::POSTGRES_LOCK_ID]);
        }

        try {
            if ($this->schemaReady()) {
                return;
            }

            Artisan::call('migrate', [
                '--force' => true,
            ]);
        } finally {
            if ($isPostgres) {
                DB::select('select pg_advisory_unlock(?)', [self::POSTGRES_LOCK_ID]);
            }
        }
    }
}
