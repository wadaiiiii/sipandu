<?php

namespace Tests\Unit;

use App\Enums\RpsSourceType;
use PHPUnit\Framework\TestCase;

class RpsSourceTypeTest extends TestCase
{
    public function test_supported_sources_are_stable(): void
    {
        $this->assertSame(
            ['manual', 'file', 'simatrps', 'external'],
            array_map(fn (RpsSourceType $source): string => $source->value, RpsSourceType::cases()),
        );
    }
}
