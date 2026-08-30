<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class SsoController extends Controller
{
    public function start(Request $request): RedirectResponse
    {
        if ($request->user()) {
            return redirect('/');
        }

        $state = Str::random(48);
        $verifier = $this->base64Url(random_bytes(48));
        $challenge = $this->base64Url(hash('sha256', $verifier, true));

        $request->session()->put([
            'sso.state' => $state,
            'sso.verifier' => $verifier,
        ]);

        $issuer = rtrim((string) config('services.simatrps.base_url', 'https://simatrps.vercel.app'), '/');
        $redirectUri = (string) config('services.simatrps.sso_redirect_uri', 'https://sipandumath.vercel.app/sso/callback');

        $query = http_build_query([
            'client_id' => 'sipandu',
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
            'state' => $state,
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away($issuer.'/sso/authorize?'.$query);
    }

    public function callback(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:64'],
            'state' => ['required', 'string', 'max:180'],
        ]);

        $expectedState = (string) $request->session()->pull('sso.state', '');
        $verifier = (string) $request->session()->pull('sso.verifier', '');

        if ($expectedState === '' || $verifier === '' || ! hash_equals($expectedState, $validated['state'])) {
            return redirect('/?sso_error=state');
        }

        $issuer = rtrim((string) config('services.simatrps.base_url', 'https://simatrps.vercel.app'), '/');
        $redirectUri = (string) config('services.simatrps.sso_redirect_uri', 'https://sipandumath.vercel.app/sso/callback');

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->timeout(12)
                ->post($issuer.'/sso/token', [
                    'grant_type' => 'authorization_code',
                    'client_id' => 'sipandu',
                    'redirect_uri' => $redirectUri,
                    'code' => $validated['code'],
                    'code_verifier' => $verifier,
                ]);
        } catch (Throwable) {
            return redirect('/?sso_error=unavailable');
        }

        if (! $response->successful()) {
            return redirect('/?sso_error=exchange');
        }

        $claims = $response->json('user');

        if (! is_array($claims) || empty($claims['email']) || empty($claims['name']) || empty($claims['sub'])) {
            return redirect('/?sso_error=identity');
        }

        if (! (bool) ($claims['is_active'] ?? false)) {
            return redirect('/?sso_error=inactive');
        }

        $email = strtolower(trim((string) $claims['email']));
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $user = User::query()->create([
                'name' => trim((string) $claims['name']),
                'email' => $email,
                'password' => Str::random(64),
                'role' => $this->mapRole((string) ($claims['role'] ?? 'dosen')),
                'identity_number' => $claims['identity_number'] ?: null,
                'is_active' => true,
            ]);

            $user->forceFill(['email_verified_at' => now()])->save();
        } else {
            if (! (bool) $user->is_active) {
                return redirect('/?sso_error=inactive');
            }

            $updates = [
                'name' => trim((string) $claims['name']),
            ];

            if (! $user->identity_number && ! empty($claims['identity_number'])) {
                $updates['identity_number'] = (string) $claims['identity_number'];
            }

            $user->fill($updates);

            if (! $user->email_verified_at) {
                $user->email_verified_at = now();
            }

            $user->save();
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect('/?sso=1');
    }

    private function mapRole(string $sourceRole): UserRole
    {
        return match (strtolower(trim($sourceRole))) {
            'admin', 'admin_prodi' => UserRole::AdminProdi,
            'upm', 'gpm', 'validator', 'reviewer', 'gpm_reviewer' => UserRole::Upm,
            default => UserRole::Lecturer,
        };
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
