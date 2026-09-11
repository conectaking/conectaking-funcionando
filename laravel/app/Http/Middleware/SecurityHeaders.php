<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Headers de segurança + CSP com nonce (scripts e styles).
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();
        view()->share('cspNonce', $nonce);

        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff', false);
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN', false);
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin', false);
        if ($request->isSecure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains',
                false
            );
        }

        $path = trim($request->path(), '/');
        $cameraOk = $this->allowsCamera($path);
        $pp = $cameraOk
            ? 'camera=(self), microphone=(), geolocation=()'
            : 'camera=(), microphone=(), geolocation=()';
        $response->headers->set('Permissions-Policy', $pp, false);

        if (! $response->headers->has('X-XSS-Protection')) {
            $response->headers->set('X-XSS-Protection', '0');
        }

        $this->injectScriptNonces($response, $nonce);
        $this->injectStyleNonces($response, $nonce);

        if (! $response->headers->has('Content-Security-Policy')) {
            $csp = implode('; ', [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "frame-ancestors 'self'",
                "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://tag.conectaking.com.br blob:",
                "script-src 'self' 'nonce-{$nonce}'",
                "style-src 'self' 'nonce-{$nonce}'",
                "font-src 'self' data:",
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

    private function injectScriptNonces(Response $response, string $nonce): void
    {
        $this->injectTagNonces($response, $nonce, 'script');
    }

    private function injectStyleNonces(Response $response, string $nonce): void
    {
        $this->injectTagNonces($response, $nonce, 'style');
    }

    private function injectTagNonces(Response $response, string $nonce, string $tag): void
    {
        $contentType = (string) $response->headers->get('Content-Type', '');
        if ($contentType !== '' && ! str_contains($contentType, 'text/html')) {
            return;
        }

        $content = $response->getContent();
        if (! is_string($content) || $content === '' || ! str_contains($content, '<'.$tag)) {
            return;
        }

        $updated = preg_replace_callback(
            '/<'.$tag.'(\s[^>]*)?>/i',
            static function (array $m) use ($nonce, $tag): string {
                $attrs = $m[1] ?? '';
                if ($attrs !== '' && preg_match('/\bnonce\s*=/', $attrs)) {
                    return $m[0];
                }

                return '<'.$tag.' nonce="'.htmlspecialchars($nonce, ENT_QUOTES, 'UTF-8').'"'.($attrs === '' ? '' : $attrs).'>';
            },
            $content
        );

        if (is_string($updated) && $updated !== $content) {
            $response->setContent($updated);
            if ($response->headers->has('Content-Length')) {
                $response->headers->set('Content-Length', (string) strlen($updated));
            }
        }
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
