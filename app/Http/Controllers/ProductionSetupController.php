<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\View\View;
use Throwable;

class ProductionSetupController extends Controller
{
    public function page(): View
    {
        $this->ensureEnabled();

        return view('setup', ['completed' => false]);
    }

    public function run(Request $request): View|RedirectResponse
    {
        $this->ensureEnabled();

        $validated = $request->validate([
            'setup_token' => ['required', 'string'],
        ]);

        $configuredToken = (string) env('SIPANDU_SETUP_TOKEN', '');

        if ($configuredToken === '' || ! hash_equals($configuredToken, $validated['setup_token'])) {
            return back()->withErrors(['setup_token' => 'Token setup tidak valid.']);
        }

        try {
            Artisan::call('migrate', ['--force' => true]);
            Artisan::call('db:seed', ['--force' => true]);
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors([
                'setup' => 'Setup belum berhasil. Periksa koneksi database dan environment variables di Vercel.',
            ]);
        }

        return view('setup', ['completed' => true]);
    }

    private function ensureEnabled(): void
    {
        $enabled = filter_var(env('SIPANDU_SETUP_ENABLED', false), FILTER_VALIDATE_BOOL);

        abort_unless($enabled, 404);
    }
}
