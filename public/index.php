<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$appPath = '/home/matematikaunsulb/apps/sipandu/current';

if (file_exists($maintenance = $appPath.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

/*
 |--------------------------------------------------------------------------
 | cPanel Subdirectory Fix
 |--------------------------------------------------------------------------
 |
 | SiPANDU is served from /akademik/sipandu while Laravel lives in
 | /home/matematikaunsulb/apps/sipandu/current.
 | Normalize the request URI before Laravel handles the request.
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
