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
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()', false);
        if (! $response->headers->has('X-XSS-Protection')) {
            $response->headers->set('X-XSS-Protection', '0');
        }

        if (! $response->headers->has('Content-Security-Policy')) {
            $csp = implode('; ', [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "frame-ancestors 'self'",
                "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://tag.conectaking.com.br blob:",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com",
                "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
                "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
                "img-src 'self' data: blob: https:",
                "media-src 'self' blob: https:",
                "connect-src 'self' https: wss:",
                "worker-src 'self' blob:",
            ]);
            $response->headers->set('Content-Security-Policy', $csp, false);
        }

        return $response;
    }
}
