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

        Schema::table('course_class_materials', function (Blueprint $table): void {
            if (! Schema::hasColumn('course_class_materials', 'attachment_url')) {
                $table->text('attachment_url')->nullable()->after('resource_url');
            }

            if (! Schema::hasColumn('course_class_materials', 'attachment_name')) {
                $table->string('attachment_name')->nullable()->after('attachment_url');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('course_class_materials')) {
            return;
        }

        $columns = [];
        if (Schema::hasColumn('course_class_materials', 'attachment_url')) {
            $columns[] = 'attachment_url';
        }
        if (Schema::hasColumn('course_class_materials', 'attachment_name')) {
            $columns[] = 'attachment_name';
        }

        if ($columns !== []) {
            Schema::table('course_class_materials', function (Blueprint $table) use ($columns): void {
                $table->dropColumn($columns);
            });
        }
    }
};
