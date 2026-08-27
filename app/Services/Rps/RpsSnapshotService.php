<?php

namespace App\Services\Rps;

use App\Enums\RpsSourceType;
use App\Models\CourseClass;
use App\Models\RpsSnapshot;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RpsSnapshotService
{
    /**
     * Store a local immutable copy of RPS data for one class.
     * The class never depends on foreign keys from the source system.
     *
     * @param array<string, mixed> $payload
     */
    public function capture(
        CourseClass $courseClass,
        RpsSourceType $source,
        array $payload,
        ?string $sourceIdentifier = null,
        ?string $sourceVersion = null,
        ?User $actor = null,
    ): RpsSnapshot {
        return DB::transaction(function () use ($courseClass, $source, $payload, $sourceIdentifier, $sourceVersion, $actor): RpsSnapshot {
            $courseClass->snapshots()->where('is_current', true)->update(['is_current' => false]);

            return $courseClass->snapshots()->create([
                'source_type' => $source,
                'source_identifier' => $sourceIdentifier,
                'source_version' => $sourceVersion,
                'payload' => $payload,
                'is_current' => true,
                'imported_by' => $actor?->id,
                'imported_at' => now(),
            ]);
        });
    }
}
