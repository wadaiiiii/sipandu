<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'quiz_attempt_id', 'quiz_question_id', 'answer', 'score', 'is_correct', 'feedback', 'graded_by', 'graded_at',
    ];

    protected function casts(): array
    {
        return [
            'answer' => 'array',
            'score' => 'decimal:2',
            'is_correct' => 'boolean',
            'graded_at' => 'datetime',
        ];
    }

    public function attempt(): BelongsTo { return $this->belongsTo(QuizAttempt::class); }
    public function question(): BelongsTo { return $this->belongsTo(QuizQuestion::class); }
    public function grader(): BelongsTo { return $this->belongsTo(User::class, 'graded_by'); }
}
