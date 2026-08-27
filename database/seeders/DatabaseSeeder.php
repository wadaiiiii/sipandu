<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('SIPANDU_ADMIN_EMAIL');
        $password = env('SIPANDU_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            return;
        }

        User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => env('SIPANDU_ADMIN_NAME', 'Admin Prodi'),
                'password' => $password,
                'role' => UserRole::AdminProdi,
                'is_active' => true,
            ],
        );
    }
}
