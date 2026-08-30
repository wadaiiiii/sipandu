<?php

return [
    'simatrps' => [
        'base_url' => env('SIMATRPS_BASE_URL', 'https://simatrps.vercel.app'),
        'token' => env('SIMATRPS_TOKEN'),
        'sso_redirect_uri' => env('SIMATRPS_SSO_REDIRECT_URI', 'https://sipandumath.vercel.app/sso/callback'),
    ],
    'external_rps' => [
        'base_url' => env('EXTERNAL_RPS_BASE_URL'),
        'token' => env('EXTERNAL_RPS_TOKEN'),
    ],
];
