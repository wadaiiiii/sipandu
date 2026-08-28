<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\CourseClassMaterial;
use App\Models\CourseClassMaterialProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class CourseClassMaterialProgressController extends Controller
{
    public function update(
        Request $request,
        CourseClass $courseClass,
        CourseClassMaterial $material,
    ): JsonResponse {
        $user = $request->user();

        abort_unless($user?->role === UserRole::Student, 403);
        abort_unless(Schema::hasTable('course_class_material_progress'), 503, 'Progress materi belum siap. Silakan minta Admin Prodi membuka kelas sekali setelah pembaruan sistem.');

        $material->loadMissing('meeting');
        abort_unless($material->meeting?->course_class_id === $courseClass->id, 404);
        abort_unless($material->is_published, 404);

        $isMember = $courseClass->memberships()
            ->where('user_id', $user->id)
            ->where('membership_role', 'student')
            ->where('status', 'active')
            ->exists();

        abort_unless($isMember, 403);

        $validated = $request->validate([
            'learned' => ['required', 'boolean'],
        ]);

        if ($validated['learned']) {
            $progress = CourseClassMaterialProgress::query()->updateOrCreate(
                [
                    'course_class_material_id' => $material->id,
                    'user_id' => $user->id,
                ],
                ['learned_at' => now()],
            );

            return response()->json([
                'learned' => true,
                'learned_at' => $progress->learned_at?->toIso8601String(),
            ]);
        }

        CourseClassMaterialProgress::query()
            ->where('course_class_material_id', $material->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'learned' => false,
            'learned_at' => null,
        ]);
    }
}
