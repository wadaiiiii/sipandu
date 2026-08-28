<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\User;
use App\Services\Classroom\CourseClassDemoSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseClassDemoDataController extends Controller
{
    public function __invoke(
        Request $request,
        CourseClass $courseClass,
        CourseClassDemoSeeder $demoSeeder,
    ): JsonResponse {
        abort_unless($this->canEdit($request->user(), $courseClass), 403);

        $created = $demoSeeder->seed($courseClass, $request->user());

        return response()->json([
            'ok' => true,
            'created' => $created,
            'message' => array_sum($created) > 0
                ? "Data contoh ditambahkan: {$created['materials']} materi dan {$created['assignments']} tugas."
                : 'Data contoh sudah tersedia. Tidak ada duplikasi yang dibuat.',
        ]);
    }

    private function canEdit(User $user, CourseClass $courseClass): bool
    {
        if ($user->role === UserRole::AdminProdi) {
            return true;
        }

        return $user->role === UserRole::Lecturer
            && $courseClass->memberships()
                ->where('user_id', $user->id)
                ->where('membership_role', 'lecturer')
                ->where('status', 'active')
                ->exists();
    }
}
