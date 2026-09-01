<?php

return [
    'simatrps' => [
        // Treat an explicitly empty Vercel env value the same as a missing one.
        // This keeps the SSO entrypoint on the SiMatRPS origin in production.
        'base_url' => env('SIMATRPS_BASE_URL') ?: 'https://matematika.unsulbar.ac.id/akademik/simatrps',
        'token' => env('SIMATRPS_TOKEN'),
        'sso_redirect_uri' => env('SIMATRPS_SSO_REDIRECT_URI') ?: 'https://sipandumath.vercel.app/sso/callback',
    ],
    'external_rps' => [
        'base_url' => env('EXTERNAL_RPS_BASE_URL'),
        'token' => env('EXTERNAL_RPS_TOKEN'),
    ],
];
