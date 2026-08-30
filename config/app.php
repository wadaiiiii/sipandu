<?php

return [
    'name' => env('APP_NAME') ?: 'SiPANDU',
    'env' => env('APP_ENV') ?: 'production',
    'debug' => filter_var(env('APP_DEBUG', false), FILTER_VALIDATE_BOOL),
    'url' => env('APP_URL') ?: 'http://localhost',
    'asset_url' => env('ASSET_URL'),
    'timezone' => env('APP_TIMEZONE') ?: 'Asia/Makassar',
    'locale' => env('APP_LOCALE') ?: 'id',
    'fallback_locale' => env('APP_FALLBACK_LOCALE') ?: 'en',
    'faker_locale' => env('APP_FAKER_LOCALE') ?: 'id_ID',
    'cipher' => 'AES-256-CBC',
    'key' => env('APP_KEY'),
    'previous_keys' => array_filter(explode(',', (string) env('APP_PREVIOUS_KEYS', ''))),
    'maintenance' => ['driver' => env('APP_MAINTENANCE_DRIVER') ?: 'file'],
];
