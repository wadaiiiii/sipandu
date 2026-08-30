<?php

namespace Tests\Feature;

use Tests\TestCase;

class SubdirectoryUiParityTest extends TestCase
{
    public function test_mysql_connection_remains_available_for_campus_hosting(): void
    {
        $this->assertSame('mysql', config('database.connections.mysql.driver'));
        $this->assertSame('utf8mb4', config('database.connections.mysql.charset'));
    }

    public function test_managed_class_actions_are_base_path_aware_and_refresh_new_classes(): void
    {
        $source = (string) file_get_contents(resource_path('js/subdirectory-class-code-compat.ts'));

        $this->assertStringContainsString('function appRelativePath', $source);
        $this->assertStringContainsString('data-sipandu-delete-class', $source);
        $this->assertStringContainsString('refreshClasses', $source);
        $this->assertStringContainsString("['admin_prodi', 'lecturer']", $source);
    }

    public function test_class_card_guard_accepts_prefixed_paths_and_buka_label(): void
    {
        $source = (string) file_get_contents(resource_path('js/class-card-loading-guard.ts'));

        $this->assertStringContainsString('function appRelativePath', $source);
        $this->assertStringContainsString("['Lanjutkan', 'Buka']", $source);
        $this->assertStringContainsString('appRelativePath(continueLink.href)', $source);
        $this->assertStringContainsString('appRelativePath(recapLink.href)', $source);
    }

    public function test_navigation_feedback_uses_application_relative_path(): void
    {
        $source = (string) file_get_contents(resource_path('js/ux-performance.ts'));

        $this->assertStringContainsString('function appRelativePath', $source);
        $this->assertStringContainsString('appRelativePath(url.href)', $source);
    }

    public function test_unified_server_hotfix_replaces_older_ui_hotfix_includes(): void
    {
        $script = (string) file_get_contents(base_path('scripts/hotfix-ui-render-parity.sh'));

        $this->assertStringContainsString('partials.ui-render-parity-hotfix', $script);
        $this->assertStringContainsString('partials\\.subdir-class-code-hotfix', $script);
        $this->assertStringContainsString('partials\\.class-delete-hotfix', $script);
        $this->assertStringContainsString('HOTFIX UI PARITY SELESAI', $script);
    }

    public function test_classroom_has_server_side_quiz_entry_fallback(): void
    {
        $view = (string) file_get_contents(resource_path('views/classroom.blade.php'));
        $fallback = (string) file_get_contents(resource_path('views/partials/quiz-entry-fallback.blade.php'));

        $this->assertStringContainsString("@include('partials.quiz-entry-fallback')", $view);
        $this->assertStringContainsString('data-sipandu-quiz-entry', $fallback);
        $this->assertStringContainsString('/kelas/${classId()}/kuis', $fallback);
        $this->assertStringContainsString('app-base-path', $fallback);
    }

    public function test_campus_production_schema_guard_is_not_vercel_only(): void
    {
        $middleware = (string) file_get_contents(app_path('Http/Middleware/EnsureProductionSchema.php'));
        $config = (string) file_get_contents(config_path('sipandu.php'));

        $this->assertStringNotContainsString("getenv('VERCEL')", $middleware);
        $this->assertStringContainsString("config('sipandu.auto_schema_sync'", $middleware);
        $this->assertStringContainsString("'auto_schema_sync'", $config);
        $this->assertStringContainsString("\$request->is('sipandu-api/*') || \$request->is('kelas/*')", $middleware);
    }

    public function test_campus_repair_script_audits_join_quiz_routes_and_build(): void
    {
        $script = (string) file_get_contents(base_path('scripts/repair-audit-campus-production.sh'));

        $this->assertStringContainsString('2026_08_31_000000_repair_campus_lms_schema.php', $script);
        $this->assertStringContainsString('automatic join-code resolver', $script);
        $this->assertStringContainsString('quiz database query', $script);
        $this->assertStringContainsString('resources/js/class-quiz.tsx', $script);
        $this->assertStringContainsString('STATUS: PASS — CORE SiPANDU SIAP', $script);
    }
}
