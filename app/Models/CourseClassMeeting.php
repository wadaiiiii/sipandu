<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
}
