<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseClassAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_meeting_id',
        'title',
        'instructions',
        'sub_cpmk_code',
        'weight_percent',
        'max_score',
        'due_at',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'weight_percent' => 'decimal:2',
            'max_score' => 'decimal:2',
            'due_at' => 'datetime',
        ];
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(CourseClassMeeting::class, 'course_class_meeting_id');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(CourseClassSubmission::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
