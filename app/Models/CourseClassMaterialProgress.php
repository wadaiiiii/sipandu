<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseClassMaterialProgress extends Model
{
    use HasFactory;

    protected $table = 'course_class_material_progress';

    protected $fillable = [
        'course_class_material_id',
        'user_id',
        'learned_at',
    ];

    protected function casts(): array
    {
        return [
            'learned_at' => 'datetime',
        ];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(CourseClassMaterial::class, 'course_class_material_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
