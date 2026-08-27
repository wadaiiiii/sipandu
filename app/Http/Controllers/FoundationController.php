<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Services\Rps\RpsSourceRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoundationController extends Controller
{
    public function __invoke(Request $request, RpsSourceRegistry $sources): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'product' => [
                'name' => 'SiPANDU',
                'tagline' => 'LMS Berbasis OBE',
                'operationally_independent' => true,
            ],
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role?->value,
                'role_label' => $user->role?->label(),
            ] : null,
            'roles' => array_map(
                fn (UserRole $role): array => ['value' => $role->value, 'label' => $role->label()],
                UserRole::cases(),
            ),
            'rps_sources' => $sources->options(),
        ]);
    }
}
