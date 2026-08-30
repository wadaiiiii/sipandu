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
}
