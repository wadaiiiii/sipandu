<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('course_class_materials')) {
            return;
        }

        if (! Schema::hasColumn('course_class_materials', 'attachment_url')) {
            Schema::table('course_class_materials', function (Blueprint $table): void {
                $table->text('attachment_url')->nullable();
            });
        }

        if (! Schema::hasColumn('course_class_materials', 'attachment_name')) {
            Schema::table('course_class_materials', function (Blueprint $table): void {
                $table->string('attachment_name')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('course_class_materials')) {
            return;
        }

        if (Schema::hasColumn('course_class_materials', 'attachment_name')) {
            Schema::table('course_class_materials', function (Blueprint $table): void {
                $table->dropColumn('attachment_name');
            });
        }

        if (Schema::hasColumn('course_class_materials', 'attachment_url')) {
            Schema::table('course_class_materials', function (Blueprint $table): void {
                $table->dropColumn('attachment_url');
            });
        }
    }
};