<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseClassUploadedFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_id',
        'uploaded_by',
        'purpose',
        'original_name',
        'mime_type',
        'size_bytes',
        'blob_url',
        'blob_pathname',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
