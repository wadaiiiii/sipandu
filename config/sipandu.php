<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Dynamic Base Path SiPANDU
    |--------------------------------------------------------------------------
    */

    'base_path' => env('SIPANDU_BASE_PATH', ''),

    /*
    |--------------------------------------------------------------------------
    | Classroom file storage
    |--------------------------------------------------------------------------
    |
    | "auto" uses Vercel Blob when credentials exist and falls back to the
    | private local disk, so upload menus remain usable on regular servers.
    |
    */

    'file_storage' => env('SIPANDU_FILE_STORAGE', 'auto'),

    'auto_schema_sync' => env('SIPANDU_AUTO_SCHEMA_SYNC', false),

];
