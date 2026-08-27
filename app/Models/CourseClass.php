<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseClass extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'academic_term_id',
        'name',
        'status',
        'rps_source_type',
        'created_by',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(RpsSnapshot::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(CourseClassMembership::class);
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(CourseClassMeeting::class)->orderBy('meeting_number');
    }
}
