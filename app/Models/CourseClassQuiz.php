<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseClassQuiz extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_id', 'title', 'description', 'sub_cpmk_code', 'duration_minutes', 'max_attempts',
        'shuffle_questions', 'shuffle_options', 'starts_at', 'due_at', 'status', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'duration_minutes' => 'integer',
            'max_attempts' => 'integer',
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
            'starts_at' => 'datetime',
            'due_at' => 'datetime',
        ];
    }

    public function courseClass(): BelongsTo { return $this->belongsTo(CourseClass::class); }
    public function questions(): HasMany { return $this->hasMany(QuizQuestion::class)->orderBy('position'); }
    public function attempts(): HasMany { return $this->hasMany(QuizAttempt::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
