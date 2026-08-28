<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseClassAttendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_meeting_id',
        'user_id',
        'status',
        'note',
        'recorded_by',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(CourseClassMeeting::class, 'course_class_meeting_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
