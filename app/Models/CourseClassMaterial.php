<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseClassMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_meeting_id',
        'title',
        'resource_type',
        'description',
        'resource_url',
        'is_published',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(CourseClassMeeting::class, 'course_class_meeting_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}