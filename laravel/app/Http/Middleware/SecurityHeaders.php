<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Headers de segurança + CSP em enforce (CDN/inline atuais ainda permitidos).
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff', false);
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN', false);
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin', false);

        $path = trim($request->path(), '/');
        $cameraOk = $this->allowsCamera($path);
        $pp = $cameraOk
            ? 'camera=(self), microphone=(), geolocation=()'
            : 'camera=(), microphone=(), geolocation=()';
        $response->headers->set('Permissions-Policy', $pp, false);

        if (! $response->headers->has('X-XSS-Protection')) {
            $response->headers->set('X-XSS-Protection', '0');
        }

        if (! $response->headers->has('Content-Security-Policy')) {
            // Libs principais em /vendor (self). Inline legado ainda exige unsafe-inline.
            // Fontes Google + embeds YouTube/Instagram/tag mantidos.
            $csp = implode('; ', [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "frame-ancestors 'self'",
                "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://tag.conectaking.com.br blob:",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' data: https://fonts.gstatic.com",
                "img-src 'self' data: blob: https:",
                "media-src 'self' blob: https:",
                "connect-src 'self' https: wss:",
                "worker-src 'self' blob:",
                'upgrade-insecure-requests',
            ]);
            $response->headers->set('Content-Security-Policy', $csp, false);
        }

        return $response;
    }

    private function allowsCamera(string $path): bool
    {
        if ($path === '' || str_starts_with($path, 'portaria')) {
            return true;
        }
        if (str_starts_with($path, 'kingSelection') || str_starts_with($path, 'king-selection')) {
            return true;
        }
        if (str_contains($path, 'kingSelectionCliente') || str_contains($path, 'guest-list') || str_contains($path, 'guestList')) {
            return true;
        }

        return false;
    }
}
