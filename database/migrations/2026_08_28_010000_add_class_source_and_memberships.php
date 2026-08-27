<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_classes', function (Blueprint $table): void {
            $table->string('rps_source_type')->default('manual')->after('status')->index();
        });

        Schema::create('course_class_memberships', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('membership_role')->default('student')->index();
            $table->string('status')->default('active')->index();
            $table->timestamps();

            $table->unique(['course_class_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_class_memberships');

        Schema::table('course_classes', function (Blueprint $table): void {
            $table->dropColumn('rps_source_type');
        });
    }
};
