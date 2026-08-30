<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('course_classes') || Schema::hasColumn('course_classes', 'join_code')) {
            return;
        }

        Schema::table('course_classes', function (Blueprint $table): void {
            $table->string('join_code', 30)->nullable()->unique()->after('name');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('course_classes') || ! Schema::hasColumn('course_classes', 'join_code')) {
            return;
        }

        Schema::table('course_classes', function (Blueprint $table): void {
            $table->dropUnique(['join_code']);
            $table->dropColumn('join_code');
        });
    }
};
