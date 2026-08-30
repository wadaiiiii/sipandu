<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuizAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_quiz_id', 'user_id', 'attempt_number', 'status', 'started_at', 'submitted_at',
        'auto_score', 'manual_score', 'score', 'max_score',
    ];

    protected function casts(): array
    {
        return [
            'attempt_number' => 'integer',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
            'auto_score' => 'decimal:2',
            'manual_score' => 'decimal:2',
            'score' => 'decimal:2',
            'max_score' => 'decimal:2',
        ];
    }

    public function quiz(): BelongsTo { return $this->belongsTo(CourseClassQuiz::class, 'course_class_quiz_id'); }
    public function student(): BelongsTo { return $this->belongsTo(User::class, 'user_id'); }
    public function answers(): HasMany { return $this->hasMany(QuizAnswer::class); }
}
