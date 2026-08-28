<?php

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class ClassroomFileStorage
{
    private const API_URL = 'https://vercel.com/api/blob/';

    private const API_VERSION = '12';

    public function configured(): bool
    {
        return $this->credentials() !== null;
    }

    public function put(UploadedFile $file, int $courseClassId, string $purpose): array
    {
        $credentials = $this->credentials();
        if ($credentials === null) {
            throw new RuntimeException('Penyimpanan file belum diaktifkan. Hubungkan Vercel Blob ke project SiPANDU.');
        }

        [$token, $storeId] = $credentials;

        $extension = strtolower($file->getClientOriginalExtension());
        $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeName = Str::slug(Str::limit($baseName, 80, '')) ?: 'file';
        $suffix = Str::lower(Str::random(10));
        $pathname = sprintf(
            'sipandu/classes/%d/%s/%s-%s%s',
            $courseClassId,
            $purpose,
            $safeName,
            $suffix,
            $extension !== '' ? ".{$extension}" : '',
        );

        $mimeType = $file->getMimeType() ?: 'application/octet-stream';
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

    public function get(string $blobUrl): array
    {
        $credentials = $this->credentials();
        if ($credentials === null) {
            throw new RuntimeException('Penyimpanan file belum diaktifkan.');
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
