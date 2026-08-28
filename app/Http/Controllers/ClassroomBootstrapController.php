<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Services\Classroom\CourseClassMeetingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Throwable;

class ClassroomBootstrapController extends Controller
{
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
                Artisan::call('migrate', ['--force' => true]);
            } catch (Throwable $exception) {
                report($exception);

                return response()->json([
                    'message' => 'Pembaruan database LMS belum berhasil. Silakan coba buka kelas kembali setelah beberapa saat.',
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
        );
    }

    private function schemaReady(): bool
    {
        return Schema::hasTable('course_class_materials')
            && Schema::hasTable('course_class_assignments')
            && Schema::hasTable('course_class_submissions')
            && Schema::hasTable('course_class_attendances');
    }
}
