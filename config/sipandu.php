<?php

$appUrl = (string) env('APP_URL', '');
$derivedPath = (string) (parse_url($appUrl, PHP_URL_PATH) ?: '');
$configuredPath = trim((string) env('APP_BASE_PATH', $derivedPath));

if ($configuredPath === '' || $configuredPath === '/') {
    $basePath = '';
} else {
    $basePath = '/'.trim($configuredPath, '/');
}

return [
    'base_path' => $basePath,
    'file_storage' => env('SIPANDU_FILE_STORAGE', 'vercel_blob'),
    // Production campus dan Vercel sama-sama boleh melakukan self-heal schema.
    // Bisa dimatikan eksplisit dengan SIPANDU_AUTO_SCHEMA_SYNC=false.
    'auto_schema_sync' => filter_var(
        env('SIPANDU_AUTO_SCHEMA_SYNC', env('APP_ENV', 'production') === 'production'),
        FILTER_VALIDATE_BOOL,
    ),
];
