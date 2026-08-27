<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_class_meetings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('meeting_number');
            $table->string('title')->nullable();
            $table->text('topic')->nullable();
            $table->string('sub_cpmk_code')->nullable()->index();
            $table->string('learning_method')->nullable();
            $table->text('learning_activity')->nullable();
            $table->text('material_summary')->nullable();
            $table->string('status')->default('planned')->index();
            $table->dateTime('starts_at')->nullable();
            $table->timestamps();

            $table->unique(['course_class_id', 'meeting_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_class_meetings');
    }
};
