<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuizQuestion extends Model
{
    use HasFactory;

    protected $fillable = ['course_class_quiz_id', 'position', 'type', 'prompt', 'points', 'answer_key', 'explanation'];

    protected function casts(): array
    {
        return ['position' => 'integer', 'points' => 'decimal:2', 'answer_key' => 'array'];
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(CourseClassQuiz::class, 'course_class_quiz_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(QuizQuestionOption::class)->orderBy('position');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(QuizAnswer::class);
    }
}
