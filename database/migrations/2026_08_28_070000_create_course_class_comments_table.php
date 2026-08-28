<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_class_comments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_class_meeting_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('course_class_material_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('course_class_assignment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('course_class_comments')->cascadeOnDelete();
            $table->text('body');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['course_class_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_class_comments');
    }
};
