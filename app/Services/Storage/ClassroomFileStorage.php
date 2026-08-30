<?php

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class ClassroomFileStorage
{
    private const API_URL = 'https://vercel.com/api/blob/';

    private const API_VERSION = '12';

    public function configured(): bool
    {
        return $this->driver() === 'local_private' || $this->credentials() !== null;
    }

    public function put(UploadedFile $file, int $courseClassId, string $purpose): array
    {
        $pathname = $this->pathname($file, $courseClassId, $purpose);
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';

        if ($this->driver() === 'local_private') {
            return $this->putLocal($file, $pathname, $mimeType);
        }

        return $this->putVercelBlob($file, $pathname, $mimeType);
    }

    public function get(string $storedUrl): array
    {
        if (str_starts_with($storedUrl, 'local://')) {
            return $this->getLocal($storedUrl);
        }

        return $this->getVercelBlob($storedUrl);
    }

    private function putLocal(UploadedFile $file, string $pathname, string $mimeType): array
    {
        $stream = fopen($file->getRealPath(), 'rb');
        if ($stream === false) {
            throw new RuntimeException('File tidak dapat dibaca sebelum disimpan.');
        }

        try {
            $stored = Storage::disk('local')->put($pathname, $stream);
        } finally {
            fclose($stream);
        }

        if (! $stored) {
            throw new RuntimeException('File belum dapat disimpan pada storage server.');
        }

        return [
            'url' => 'local://'.$pathname,
            'pathname' => $pathname,
            'content_type' => $mimeType,
        ];
    }

    private function getLocal(string $storedUrl): array
    {
        $pathname = ltrim(substr($storedUrl, strlen('local://')), '/');

        if ($pathname === '' || str_contains($pathname, '..') || ! str_starts_with($pathname, 'sipandu/classes/')) {
            throw new RuntimeException('Lokasi file pada storage server tidak valid.');
        }

        $disk = Storage::disk('local');
        if (! $disk->exists($pathname)) {
            throw new RuntimeException('File tidak ditemukan pada storage server.');
        }

        $body = $disk->get($pathname);
        $mimeType = $disk->mimeType($pathname) ?: 'application/octet-stream';

        return [
            'body' => $body,
            'content_type' => $mimeType,
        ];
    }

    private function putVercelBlob(UploadedFile $file, string $pathname, string $mimeType): array
    {
        $credentials = $this->credentials();
        if ($credentials === null) {
            throw new RuntimeException('Penyimpanan file belum diaktifkan. Konfigurasikan Vercel Blob atau gunakan SIPANDU_FILE_STORAGE=local_private pada server yang persisten.');
        }

        [$token, $storeId] = $credentials;
        $body = file_get_contents($file->getRealPath());
        if ($body === false) {
            throw new RuntimeException('File tidak dapat dibaca sebelum diunggah.');
        }

        $access = in_array(env('SIPANDU_BLOB_ACCESS', 'private'), ['private', 'public'], true)
            ? env('SIPANDU_BLOB_ACCESS', 'private')
            : 'private';

        $response = Http::timeout(40)
            ->retry(2, 250)
            ->withHeaders([
                'Authorization' => "Bearer {$token}",
                'x-api-version' => self::API_VERSION,
                'x-vercel-blob-store-id' => $storeId,
                'x-vercel-blob-access' => $access,
                'x-add-random-suffix' => '0',
                'x-content-type' => $mimeType,
            ])
            ->withBody($body, 'application/octet-stream')
            ->put(self::API_URL.'?pathname='.rawurlencode($pathname));

        if (! $response->successful()) {
            $message = data_get($response->json(), 'error.message') ?: $response->body();
            throw new RuntimeException('Upload ke Vercel Blob gagal: '.Str::limit((string) $message, 300));
        }

        $payload = $response->json();
        if (! is_array($payload) || blank($payload['url'] ?? null)) {
            throw new RuntimeException('Vercel Blob tidak mengembalikan URL file.');
        }

        return [
            'url' => $payload['url'],
            'pathname' => $payload['pathname'] ?? $pathname,
            'content_type' => $payload['contentType'] ?? $mimeType,
        ];
    }

    private function getVercelBlob(string $blobUrl): array
    {
        $credentials = $this->credentials();
        if ($credentials === null) {
            throw new RuntimeException('Kredensial Vercel Blob belum tersedia untuk membaca file lama.');
        }

        [$token] = $credentials;

        $response = Http::timeout(40)
            ->retry(2, 250)
            ->withToken($token)
            ->get($blobUrl);

        if (! $response->successful()) {
            throw new RuntimeException('File belum dapat diambil dari penyimpanan.');
        }

        return [
            'body' => $response->body(),
            'content_type' => $response->header('Content-Type') ?: 'application/octet-stream',
        ];
    }

    private function pathname(UploadedFile $file, int $courseClassId, string $purpose): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeName = Str::slug(Str::limit($baseName, 80, '')) ?: 'file';
        $suffix = Str::lower(Str::random(10));

        return sprintf(
            'sipandu/classes/%d/%s/%s-%s%s',
            $courseClassId,
            $purpose,
            $safeName,
            $suffix,
            $extension !== '' ? ".{$extension}" : '',
        );
    }

    private function driver(): string
    {
        $driver = trim((string) config('sipandu.file_storage', 'vercel_blob'));

        return in_array($driver, ['vercel_blob', 'local_private'], true) ? $driver : 'vercel_blob';
    }

    /**
     * Vercel Functions exposes the current OIDC token in the incoming
     * x-vercel-oidc-token request header. Builds/local development can expose
     * VERCEL_OIDC_TOKEN instead. A static BLOB_READ_WRITE_TOKEN remains a
     * supported fallback.
     *
     * @return array{0: string, 1: string}|null
     */
    private function credentials(): ?array
    {
        $storeId = $this->normalizeStoreId($this->runtimeValue('BLOB_STORE_ID'));
        $oidcToken = trim((string) request()->header('x-vercel-oidc-token'));

        if ($oidcToken === '') {
            $oidcToken = trim($this->runtimeValue('VERCEL_OIDC_TOKEN'));
        }

        if ($oidcToken !== '' && $storeId !== '') {
            return [$oidcToken, $storeId];
        }

        $readWriteToken = trim($this->runtimeValue('BLOB_READ_WRITE_TOKEN'));
        if ($readWriteToken === '') {
            return null;
        }

        if ($storeId === '') {
            $parts = explode('_', $readWriteToken);
            $storeId = $this->normalizeStoreId($parts[3] ?? '');
        }

        if ($storeId === '') {
            return null;
        }

        return [$readWriteToken, $storeId];
    }

    private function runtimeValue(string $key): string
    {
        $value = env($key);
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }

        $value = getenv($key);
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }

        $value = $_SERVER[$key] ?? $_ENV[$key] ?? '';

        return is_string($value) ? trim($value) : '';
    }

    private function normalizeStoreId(string $storeId): string
    {
        $storeId = trim($storeId);

        return str_starts_with($storeId, 'store_') ? substr($storeId, 6) : $storeId;
    }
}
