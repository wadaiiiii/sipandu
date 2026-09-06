<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'max:180'],
            'password' => ['required', 'string'],
        ]);

        $identifier = trim($validated['email']);
        $credentialField = str_contains($identifier, '@') ? 'email' : 'identity_number';
        $credentialValue = $credentialField === 'email' ? strtolower($identifier) : $identifier;

        if (! Auth::attempt([
            $credentialField => $credentialValue,
            'password' => $validated['password'],
        ], true)) {
            throw ValidationException::withMessages([
                'email' => 'NIM/email atau kata sandi tidak sesuai.',
            ]);
        }

        if (! (bool) $request->user()?->is_active) {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => 'Akun tidak aktif. Hubungi Admin Prodi.',
            ]);
        }

        $request->session()->regenerate();

        return response()->json([
            'ok' => true,
            'must_change_password' => (bool) $request->user()?->must_change_password,
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $validated = $request->validate([
            'current_password' => ['nullable', 'string'],
            'password' => ['required', 'string', 'min:8', 'max:120', 'confirmed'],
        ]);

        if (! $user->must_change_password) {
            if (! isset($validated['current_password']) || ! $user->getAuthPassword() || ! password_verify($validated['current_password'], $user->getAuthPassword())) {
                throw ValidationException::withMessages([
                    'current_password' => 'Kata sandi saat ini tidak sesuai.',
                ]);
            }
        }

        $user->forceFill([
            'password' => $validated['password'],
            'must_change_password' => false,
        ])->save();

        return response()->json([
            'ok' => true,
            'message' => 'Kata sandi berhasil diperbarui.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }
}
