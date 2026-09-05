Write-Host "====================================="
Write-Host " FIX TESTCASE BOOTSTRAP "
Write-Host "====================================="

$file="tests/TestCase.php"

if(Test-Path $file){
    Copy-Item $file "$file.before-final-bootstrap-fix" -Force
}

$content=@'
<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = require dirname(__DIR__).'/bootstrap/app.php';

        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        return $app;
    }
}
'@

$utf8 = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    $file,
    $content,
    $utf8
)

if(Test-Path "tests/test-basepath.log"){
    Remove-Item "tests/test-basepath.log" -Force
}

Write-Host ""
Write-Host "TestCase fixed"
Write-Host ""

php artisan test --filter=SubdirectoryHostingTest