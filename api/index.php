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
    foreach ([
        'SESSION_DRIVER' => 'cookie',
        'LOG_CHANNEL' => 'stderr',
        'QUEUE_CONNECTION' => 'sync',
    ] as $key => $value) {
        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }

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
        'session_driver' => getenv('SESSION_DRIVER') ?: null,
        'setup_enabled' => $setupEnabled,
        'setup_token_configured' => (bool) (getenv('SIPANDU_SETUP_TOKEN') ?: ''),
        'admin_email_configured' => (bool) (getenv('SIPANDU_ADMIN_EMAIL') ?: ''),
        'admin_password_configured' => (bool) (getenv('SIPANDU_ADMIN_PASSWORD') ?: ''),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($appKey === '') {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SiPANDU belum siap</title><body style="font-family:system-ui;background:#f5f7fb;color:#0f172a;margin:0"><main style="max-width:720px;margin:12vh auto;padding:28px"><div style="background:white;border:1px solid #dbeafe;border-radius:24px;padding:28px;box-shadow:0 18px 50px rgba(15,23,42,.08)"><strong style="color:#2563eb">SiPANDU Runtime Check</strong><h1 style="margin:10px 0 8px">Environment production belum lengkap</h1><p style="line-height:1.7;color:#475569">APP_KEY tidak terbaca oleh fungsi PHP Vercel. Tambahkan kembali APP_KEY pada Environment Variables untuk Production lalu Redeploy.</p><p style="font-size:13px;color:#64748b">Kode: SIPANDU-APP-KEY-MISSING · Diagnostik aman: /healthz</p></div></main></body></html>';
    exit;
}

if ($path === '/bootz') {
    header('Content-Type: application/json; charset=utf-8');

    $diagnostic = [
        'status' => 'running',
        'autoload' => false,
        'app_created' => false,
        'kernel_bootstrapped' => false,
        'view_rendered' => false,
        'root_status' => null,
        'exception_class' => null,
        'exception_message' => null,
    ];

    try {
        require $root.'/vendor/autoload.php';
        $diagnostic['autoload'] = true;

        $app = require $root.'/bootstrap/app.php';
        $diagnostic['app_created'] = true;

        $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
        $kernel->bootstrap();
        $diagnostic['kernel_bootstrapped'] = true;

        $html = $app->make('view')->make('app')->render();
        $diagnostic['view_rendered'] = $html !== '';

        $response = $kernel->handle(Request::create('/', 'GET'));
        $diagnostic['root_status'] = $response->getStatusCode();
        $diagnostic['status'] = 'ok';
    } catch (Throwable $exception) {
        $message = $exception->getMessage();
        $message = preg_replace('#(?:postgres(?:ql)?|mysql|redis)://[^\s]+#i', '[redacted-url]', $message) ?: 'diagnostic error';
        $message = preg_replace('/(password|token|secret)=([^\s&]+)/i', '$1=[redacted]', $message) ?: 'diagnostic error';

        $diagnostic['status'] = 'error';
        $diagnostic['exception_class'] = $exception::class;
        $diagnostic['exception_message'] = mb_substr($message, 0, 500);
    }

    echo json_encode($diagnostic, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    require $root.'/vendor/autoload.php';
    $app = require_once $root.'/bootstrap/app.php';
    $app->handleRequest(Request::capture());
} catch (Throwable $exception) {
    error_log(sprintf(
        '[sipandu-bootstrap] %s: %s in %s:%d',
        $exception::class,
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine(),
    ));

    throw $exception;
}
