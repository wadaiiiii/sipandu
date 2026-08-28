<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_class_material_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_material_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->dateTime('learned_at')->nullable()->index();
            $table->timestamps();

            $table->unique(['course_class_material_id', 'user_id'], 'material_student_progress_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_class_material_progress');
    }
};
