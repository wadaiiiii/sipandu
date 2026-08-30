<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PrefixSubdirectoryHtmlUrls
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $basePath = trim((string) config('sipandu.base_path', ''));

        if ($basePath === '' || ! method_exists($response, 'getContent') || ! method_exists($response, 'setContent')) {
            return $response;
        }

        $contentType = strtolower((string) $response->headers->get('Content-Type', ''));
        if (! str_contains($contentType, 'text/html')) {
            return $response;
        }

        $content = $response->getContent();
        if (! is_string($content) || $content === '') {
            return $response;
        }

        $basePath = '/'.trim($basePath, '/');
        $pattern = '~\b(href|src|action)=(["\'])(/(?!/)[^"\']*)\2~i';

        $rewritten = preg_replace_callback($pattern, function (array $matches) use ($basePath): string {
            $path = $matches[3];

            if ($path === $basePath || str_starts_with($path, $basePath.'/')) {
                return $matches[0];
            }

            // Portal akademik lain berada sejajar dengan SiPANDU pada domain yang sama.
            // Jangan ubah /akademik/simatrps, /akademik/simetri, dan sibling lainnya.
            if (str_starts_with($path, '/akademik/')) {
                return $matches[0];
            }

            return $matches[1].'='.$matches[2].$basePath.$path.$matches[2];
        }, $content);

        if (is_string($rewritten)) {
            $response->setContent($rewritten);
        }

        return $response;
    }
}
