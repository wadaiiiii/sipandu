Write-Host "====================================="
Write-Host " FIX TESTCASE DEBUG UTF8 WITHOUT BOM "
Write-Host "====================================="

$file = "tests/TestCase.php"

$content = @'
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
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    $file,
    $content,
    $utf8NoBom
)

if(Test-Path "tests/test-basepath.log"){
    Remove-Item "tests/test-basepath.log" -Force
}

Write-Host ""
Write-Host "TestCase diperbaiki"
Write-Host ""

php artisan test --filter=SubdirectoryHostingTest

Write-Host ""
Write-Host "====================================="
Write-Host " HASIL BASEPATH "
Write-Host "====================================="

if(Test-Path "tests/test-basepath.log"){
    Get-Content tests/test-basepath.log
}else{
    Write-Host "Log belum terbentuk"
}