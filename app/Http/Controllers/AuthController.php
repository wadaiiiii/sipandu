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

        return response()->json(['ok' => true]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }
}
