<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Keep integrations optional. Adapters are resolved only when requested.
    }

    public function boot(): void
    {
        //
    }
}
