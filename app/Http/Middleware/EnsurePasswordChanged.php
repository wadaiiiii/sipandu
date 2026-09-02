<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowedRoutes = ['bootstrap', 'password.initial', 'logout', 'sso.start', 'sso.callback'];

        $isPasswordScreen = $request->path() === '/';

        if ($request->user()?->must_change_password && ! $isPasswordScreen && ! in_array($request->route()?->getName(), $allowedRoutes, true)) {
            if (! $request->expectsJson() && ! $request->is('sipandu-api/*')) {
                return redirect(url('/'));
            }

            return new JsonResponse([
                'message' => 'Anda wajib mengganti kata sandi awal sebelum menggunakan SiPANDU.',
                'code' => 'password_change_required',
            ], 428);
        }

        return $next($request);
    }
}
