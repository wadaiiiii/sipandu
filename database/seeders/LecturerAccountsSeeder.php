<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class LecturerAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Darma', 'email' => 'darmath@unsulbar.ac.id'],
            ['name' => 'dosen', 'email' => 'dosenmath@unsulbar.ac.id'],
            ['name' => 'Fardinah', 'email' => 'fardinah@unsulbar.ac.id'],
            ['name' => 'Meryta', 'email' => 'merytaff@unsulbar.ac.id'],
            ['name' => 'Muh Rifandi', 'email' => 'muhrifandi@unsulbar.ac.id'],
            ['name' => 'Rahmawati', 'email' => 'rahmawati@unsulbar.ac.id'],
            ['name' => 'Wahyudin Nur', 'email' => 'wahyudin.nur@unsulbar.ac.id'],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => Hash::make('123'),
                ]
            );
        }
    }
}
