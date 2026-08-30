<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CourseClass;
use App\Models\User;
use App\Services\Classroom\ClassJoinCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CourseClassJoinCodeController extends Controller
{
    public function update(Request $request, CourseClass $courseClass, ClassJoinCodeService $codes): JsonResponse
    {
        $this->ensureCanManage($request->user(), $courseClass);

        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:30'],
        ]);

        $raw = trim((string) ($validated['code'] ?? ''));
        if ($raw === '') {
            $courseClass->forceFill(['join_code' => null])->save();

            return response()->json([
                'ok' => true,
                'join_code' => $codes->for($courseClass->fresh()),
                'custom' => false,
                'message' => 'Kode kelas dikembalikan ke kode otomatis.',
            ]);
        }

        $normalized = $codes->normalize($raw);
        if (! preg_match('/^[A-Z0-9][A-Z0-9_-]{3,29}$/', $normalized)) {
            throw ValidationException::withMessages([
                'code' => 'Kode kelas harus 4–30 karakter dan hanya boleh berisi huruf, angka, tanda hubung, atau garis bawah.',
            ]);
        }

        if (preg_match('/^K[A-Z0-9]+-[A-F0-9]{8}$/', $normalized)) {
            throw ValidationException::withMessages([
                'code' => 'Pola tersebut digunakan untuk kode otomatis. Gunakan kode kustom lain, misalnya KALKULUS-A atau MAT101A.',
            ]);
        }

        $exists = CourseClass::query()
            ->whereKeyNot($courseClass->id)
            ->whereRaw('UPPER(join_code) = ?', [$normalized])
            ->exists();
        if ($exists) {
            throw ValidationException::withMessages([
                'code' => 'Kode tersebut sudah digunakan kelas lain.',
            ]);
        }

        $courseClass->forceFill(['join_code' => $normalized])->save();

        return response()->json([
            'ok' => true,
            'join_code' => $normalized,
            'custom' => true,
            'message' => 'Kode kelas berhasil diperbarui.',
        ]);
    }

    private function ensureCanManage(User $user, CourseClass $courseClass): void
    {
        if ($user->role === UserRole::AdminProdi) {
            return;
        }

        abort_unless(
            $user->role === UserRole::Lecturer
            && $courseClass->memberships()
                ->where('user_id', $user->id)
                ->where('membership_role', 'lecturer')
                ->where('status', 'active')
                ->exists(),
            403,
        );
    }
}
