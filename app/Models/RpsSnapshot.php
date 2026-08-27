<?php

namespace App\Models;

use App\Enums\RpsSourceType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RpsSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_id',
        'source_type',
        'source_identifier',
        'source_version',
        'payload',
        'is_current',
        'imported_by',
        'imported_at',
    ];

    protected function casts(): array
    {
        return [
            'source_type' => RpsSourceType::class,
            'payload' => 'array',
            'is_current' => 'boolean',
            'imported_at' => 'datetime',
        ];
    }

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class);
    }
}
