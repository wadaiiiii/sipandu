<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->unsignedTinyInteger('credits')->default(2);
            $table->timestamps();
        });

        Schema::create('academic_terms', function (Blueprint $table): void {
            $table->id();
            $table->string('academic_year');
            $table->string('semester');
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->boolean('is_active')->default(false)->index();
            $table->timestamps();
            $table->unique(['academic_year', 'semester']);
        });

        Schema::create('course_classes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_term_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('status')->default('draft')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_classes');
        Schema::dropIfExists('academic_terms');
        Schema::dropIfExists('courses');
    }
};
