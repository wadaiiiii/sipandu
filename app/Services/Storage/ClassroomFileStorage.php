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
        return filled(env('BLOB_READ_WRITE_TOKEN'));
    }

    public function put(UploadedFile $file, int $courseClassId, string $purpose): array
    {
        $token = trim((string) env('BLOB_READ_WRITE_TOKEN'));
        if ($token === '') {
            throw new RuntimeException('Penyimpanan file belum diaktifkan. Hubungkan Vercel Blob dan pastikan BLOB_READ_WRITE_TOKEN tersedia.');
        }

        $storeId = $this->storeId($token);
        if ($storeId === '') {
            throw new RuntimeException('BLOB_READ_WRITE_TOKEN tidak memiliki Store ID yang valid.');
        }

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
        $token = trim((string) env('BLOB_READ_WRITE_TOKEN'));
        if ($token === '') {
            throw new RuntimeException('Penyimpanan file belum diaktifkan.');
        }

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

    private function storeId(string $token): string
    {
        $parts = explode('_', $token);
        $fromToken = $parts[3] ?? '';
        if ($fromToken !== '') {
            return str_starts_with($fromToken, 'store_') ? substr($fromToken, 6) : $fromToken;
        }

        $fromEnv = trim((string) env('BLOB_STORE_ID'));

        return str_starts_with($fromEnv, 'store_') ? substr($fromEnv, 6) : $fromEnv;
    }
}
