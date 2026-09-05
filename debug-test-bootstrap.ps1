Write-Host "====================================="
Write-Host " DEBUG LARAVEL TEST BOOTSTRAP PATH "
Write-Host "====================================="

$testCase = "tests/TestCase.php"
$backup = "tests/TestCase.php.before-debug-basepath"

if (!(Test-Path $backup)) {
    Copy-Item $testCase $backup -Force
    Write-Host "Backup dibuat:"
    Write-Host $backup
}

@'
<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Application;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        file_put_contents(
            __DIR__.'/test-basepath.log',
            date('Y-m-d H:i:s').' | '.Application::inferBasePath().PHP_EOL,
            FILE_APPEND
        );

        return parent::createApplication();
    }
}
'@ | Set-Content $testCase -Encoding UTF8

Write-Host ""
Write-Host "TestCase debug aktif"
Write-Host ""

if (Test-Path "tests/test-basepath.log") {
    Remove-Item "tests/test-basepath.log" -Force
}

Write-Host "Menjalankan test..."
php artisan test --filter=SubdirectoryHostingTest

Write-Host ""
Write-Host "====================================="
Write-Host " HASIL BASEPATH "
Write-Host "====================================="

if (Test-Path "tests/test-basepath.log") {
    Get-Content tests/test-basepath.log
}
else {
    Write-Host "Log tidak terbentuk"
}

Write-Host ""
Write-Host "Selesai."