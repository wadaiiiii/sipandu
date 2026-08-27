<?php

namespace App\Enums;

enum UserRole: string
{
    case AdminProdi = 'admin_prodi';
    case Lecturer = 'lecturer';
    case Student = 'student';
    case Upm = 'upm';

    public function label(): string
    {
        return match ($this) {
            self::AdminProdi => 'Admin Prodi',
            self::Lecturer => 'Dosen',
            self::Student => 'Mahasiswa',
            self::Upm => 'Unit Penjaminan Mutu',
        };
    }
}
