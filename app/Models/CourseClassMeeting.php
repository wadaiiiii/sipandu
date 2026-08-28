<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseClassMeeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_id',
        'meeting_number',
        'title',
        'topic',
        'sub_cpmk_code',
        'learning_method',
        'learning_activity',
        'material_summary',
        'status',
        'starts_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
        ];
    }

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(CourseClassMaterial::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(CourseClassAssignment::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(CourseClassAttendance::class);
    }
}