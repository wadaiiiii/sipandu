<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class UserManagementController extends Controller
{
    public function page(Request $request): View|RedirectResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== UserRole::AdminProdi) {
            return redirect('/');
        }

        return view('users');
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request->user());

        $users = User::query()
            ->orderByRaw("case role when 'admin_prodi' then 1 when 'lecturer' then 2 when 'upm' then 3 else 4 end")
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'identity_number', 'role', 'is_active', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'identity_number' => $user->identity_number,
                'role' => $user->role->value,
                'role_label' => $user->role->label(),
                'is_active' => $user->is_active,
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return response()->json(['users' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin($request->user());

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'email' => ['required', 'email', 'max:180', 'unique:users,email'],
            'identity_number' => ['nullable', 'string', 'max:80', 'unique:users,identity_number'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'password' => ['required', 'string', 'min:8', 'max:120'],
        ]);

        $user = User::query()->create([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'identity_number' => filled($validated['identity_number'] ?? null) ? trim($validated['identity_number']) : null,
            'role' => UserRole::from($validated['role']),
            'password' => $validated['password'],
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        return response()->json(['ok' => true, 'user_id' => $user->id], 201);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        $this->ensureAdmin($actor);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        abort_if($user->id === $actor->id && ! $validated['is_active'], 422, 'Admin tidak dapat menonaktifkan akunnya sendiri.');

        $user->update(['is_active' => $validated['is_active']]);

        return response()->json(['ok' => true]);
    }

    private function ensureAdmin(User $user): void
    {
        abort_unless($user->role === UserRole::AdminProdi, 403);
    }
}
