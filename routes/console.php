<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('sipandu:about', function (): void {
    $this->info('SiPANDU — LMS Berbasis OBE');
});
