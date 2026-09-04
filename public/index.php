<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
 |--------------------------------------------------------------------------
 | Resolve Laravel application path
 |--------------------------------------------------------------------------
 |
 | Local development uses the repository root (one level above /public).
 | cPanel may serve this public/index.php from /public_html while the
 | Laravel application lives under /home/.../apps/sipandu/current.
 | Resolve the local path first and fall back to the cPanel path only when
 | the local vendor directory does not exist.
 |
 */
$localAppPath = dirname(__DIR__);
$cpanelAppPath = '/home/matematikaunsulb/apps/sipandu/current';

$appPath = file_exists($localAppPath.'/vendor/autoload.php')
    ? $localAppPath
    : $cpanelAppPath;

if (file_exists($maintenance = $appPath.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

/*
 |--------------------------------------------------------------------------
 | cPanel Subdirectory Fix
 |--------------------------------------------------------------------------
 |
 | SiPANDU is served from /akademik/sipandu on cPanel. Laravel itself lives
 | outside the public directory, so strip the public subdirectory prefix
 | before Laravel handles the request. On local development the prefix is
 | absent and this block leaves the URI unchanged.
 |
 */
if (isset($_SERVER['REQUEST_URI'])) {
    $_SERVER['REQUEST_URI'] = preg_replace(
        '#^/akademik/sipandu#',
        '',
        $_SERVER['REQUEST_URI']
    );

    if ($_SERVER['REQUEST_URI'] === '') {
        $_SERVER['REQUEST_URI'] = '/';
    }
}

require $appPath.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $appPath.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
