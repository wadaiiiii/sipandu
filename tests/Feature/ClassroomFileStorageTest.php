<?php

namespace Tests\Feature;

use App\Services\Storage\ClassroomFileStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClassroomFileStorageTest extends TestCase
{
    public function test_local_private_driver_stores_and_reads_classroom_file(): void
    {
        config()->set('sipandu.file_storage', 'local_private');
        Storage::fake('local');

        $file = UploadedFile::fake()->createWithContent('Modul Kalkulus.pdf', 'isi-modul');
        $storage = app(ClassroomFileStorage::class);

        $stored = $storage->put($file, 17, 'material');

        $this->assertTrue($storage->configured());
        $this->assertStringStartsWith('local://sipandu/classes/17/material/', $stored['url']);
        $this->assertStringStartsWith('sipandu/classes/17/material/', $stored['pathname']);
        Storage::disk('local')->assertExists($stored['pathname']);

        $loaded = $storage->get($stored['url']);

        $this->assertSame('isi-modul', $loaded['body']);
        $this->assertNotSame('', $loaded['content_type']);
    }
}
