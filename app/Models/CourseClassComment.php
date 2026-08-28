<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseClassComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_id',
        'course_class_meeting_id',
        'course_class_material_id',
        'course_class_assignment_id',
        'parent_id',
        'body',
        'created_by',
    ];

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class);
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(CourseClassMeeting::class, 'course_class_meeting_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(CourseClassMaterial::class, 'course_class_material_id');
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(CourseClassAssignment::class, 'course_class_assignment_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
