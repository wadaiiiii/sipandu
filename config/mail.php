<?php

return [
    'default' => env('MAIL_MAILER', 'log'),
    'mailers' => ['log' => ['transport' => 'log', 'channel' => env('MAIL_LOG_CHANNEL')], 'array' => ['transport' => 'array']],
    'from' => ['address' => env('MAIL_FROM_ADDRESS', 'noreply@matematika.unsulbar.ac.id'), 'name' => env('MAIL_FROM_NAME', 'SiPANDU')],
];
