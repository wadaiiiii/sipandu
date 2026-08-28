<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$root = dirname(__DIR__);
$tmpStorage = '/tmp/sipandu-storage';
$tmpBootstrapCache = '/tmp/sipandu-bootstrap-cache';

foreach ([
    $tmpStorage,
    $tmpStorage.'/framework',
    $tmpStorage.'/framework/cache',
    $tmpStorage.'/framework/cache/data',
    $tmpStorage.'/framework/sessions',
    $tmpStorage.'/framework/views',
    $tmpStorage.'/logs',
    $tmpBootstrapCache,
] as $directory) {
    if (! is_dir($directory)) {
        @mkdir($directory, 0777, true);
    }
}

$runtimeEnvironment = [
    'LARAVEL_STORAGE_PATH' => $tmpStorage,
    'VIEW_COMPILED_PATH' => $tmpStorage.'/framework/views',
    'APP_CONFIG_CACHE' => $tmpBootstrapCache.'/config.php',
    'APP_EVENTS_CACHE' => $tmpBootstrapCache.'/events.php',
    'APP_PACKAGES_CACHE' => $tmpBootstrapCache.'/packages.php',
    'APP_ROUTES_CACHE' => $tmpBootstrapCache.'/routes.php',
    'APP_SERVICES_CACHE' => $tmpBootstrapCache.'/services.php',
];

foreach ($runtimeEnvironment as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
}

$defaults = [
    'APP_ENV' => 'production',
    'APP_DEBUG' => 'false',
    'LOG_CHANNEL' => 'stderr',
    'SESSION_DRIVER' => 'cookie',
    'QUEUE_CONNECTION' => 'sync',
];

foreach ($defaults as $key => $value) {
    if (getenv($key) === false || getenv($key) === '') {
        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

if (getenv('VERCEL')) {
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$databaseUrlConfigured = (bool) (getenv('DB_URL') ?: getenv('DATABASE_URL') ?: getenv('POSTGRES_URL'));
$appKey = (string) (getenv('APP_KEY') ?: '');
$setupEnabled = filter_var(getenv('SIPANDU_SETUP_ENABLED') ?: false, FILTER_VALIDATE_BOOL);

if ($path === '/healthz') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'ok',
        'vercel' => (bool) getenv('VERCEL'),
        'app_key_configured' => $appKey !== '',
        'app_key_looks_valid' => str_starts_with($appKey, 'base64:') && strlen($appKey) >= 50,
        'database_url_configured' => $databaseUrlConfigured,
        'db_connection' => getenv('DB_CONNECTION') ?: null,
        'pdo_pgsql_loaded' => extension_loaded('pdo_pgsql'),
        'setup_enabled' => $setupEnabled,
        'setup_token_configured' => (bool) (getenv('SIPANDU_SETUP_TOKEN') ?: ''),
        'admin_email_configured' => (bool) (getenv('SIPANDU_ADMIN_EMAIL') ?: ''),
        'admin_password_configured' => (bool) (getenv('SIPANDU_ADMIN_PASSWORD') ?: ''),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($path === '/setup' && $setupEnabled && $appKey === '') {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="id"><meta charset="utf-8"><title>SiPANDU Setup</title><body style="font-family:system-ui;max-width:760px;margin:80px auto;padding:24px"><h1>Setup belum siap</h1><p><strong>APP_KEY belum terbaca pada environment Production Vercel.</strong></p><p>Tambahkan APP_KEY di Settings → Environment Variables, terapkan ke Production, lalu Redeploy.</p><p>Diagnostik aman tersedia di <a href="/healthz">/healthz</a>.</p></body></html>';
    exit;
}

require $root.'/vendor/autoload.php';
$app = require_once $root.'/bootstrap/app.php';
$app->handleRequest(Request::capture());
