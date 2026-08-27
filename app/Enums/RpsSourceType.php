<?php

namespace App\Enums;

enum RpsSourceType: string
{
    case Manual = 'manual';
    case File = 'file';
    case Simatrps = 'simatrps';
    case External = 'external';

    public function label(): string
    {
        return match ($this) {
            self::Manual => 'Input Manual',
            self::File => 'Import File',
            self::Simatrps => 'SiMatRPS',
            self::External => 'Sistem Eksternal',
        };
    }
}
