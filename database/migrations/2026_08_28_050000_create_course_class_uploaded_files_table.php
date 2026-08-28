<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_class_uploaded_files', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('purpose', 40)->index();
            $table->string('original_name');
            $table->string('mime_type', 160)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->text('blob_url');
            $table->string('blob_pathname', 950);
            $table->timestamps();

            $table->index(['course_class_id', 'created_at']);
        });

        Schema::table('course_class_assignments', function (Blueprint $table): void {
            $table->text('attachment_url')->nullable()->after('instructions');
            $table->string('attachment_name')->nullable()->after('attachment_url');
        });
    }

    public function down(): void
    {
        Schema::table('course_class_assignments', function (Blueprint $table): void {
            $table->dropColumn(['attachment_url', 'attachment_name']);
        });

        Schema::dropIfExists('course_class_uploaded_files');
    }
};
