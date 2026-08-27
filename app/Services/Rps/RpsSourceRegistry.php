<?php

namespace App\Services\Rps;

use App\Enums\RpsSourceType;

class RpsSourceRegistry
{
    /** @return array<int, array{value:string,label:string,enabled:bool,description:string}> */
    public function options(): array
    {
        return array_map(
            fn (RpsSourceType $source): array => [
                'value' => $source->value,
                'label' => $source->label(),
                'enabled' => $this->enabled($source),
                'description' => $this->description($source),
            ],
            RpsSourceType::cases(),
        );
    }

    public function enabled(RpsSourceType $source): bool
    {
        return match ($source) {
            RpsSourceType::Manual,
            RpsSourceType::File => true,
            RpsSourceType::Simatrps => filled(config('services.simatrps.base_url')),
            RpsSourceType::External => true,
        };
    }

    private function description(RpsSourceType $source): string
    {
        return match ($source) {
            RpsSourceType::Manual => 'Isi struktur pembelajaran langsung di SiPANDU.',
            RpsSourceType::File => 'Impor snapshot RPS dari berkas yang didukung.',
            RpsSourceType::Simatrps => 'Tarik snapshot RPS final dari SiMatRPS bila integrasi aktif.',
            RpsSourceType::External => 'Gunakan adapter untuk sistem RPS fakultas atau sistem lain.',
        };
    }
}
