<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Headers de segurança + CSP com nonce (scripts).
 * Injeta nonce em todo <script> HTML sem nonce, p/ Vite + /config.js + /vendor + inline residual.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();

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

        $this->injectScriptNonces($response, $nonce);

        if (! $response->headers->has('Content-Security-Policy')) {
            // script: self + nonce (sem unsafe-inline).
            // style: unsafe-inline mantido p/ :root dinâmico do cartão + poucos style="" (Blade/JS toggles).
            $csp = implode('; ', [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "frame-ancestors 'self'",
                "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://tag.conectaking.com.br blob:",
                "script-src 'self' 'nonce-{$nonce}'",
                "style-src 'self' 'unsafe-inline'",
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
        $contentType = (string) $response->headers->get('Content-Type', '');
        if ($contentType !== '' && ! str_contains($contentType, 'text/html')) {
            return;
        }

        $content = $response->getContent();
        if (! is_string($content) || $content === '' || ! str_contains($content, '<script')) {
            return;
        }

        $updated = preg_replace_callback(
            '/<script(\s[^>]*)?>/i',
            static function (array $m) use ($nonce): string {
                $attrs = $m[1] ?? '';
                if ($attrs !== '' && preg_match('/\bnonce\s*=/', $attrs)) {
                    return $m[0];
                }

                return '<script nonce="'.htmlspecialchars($nonce, ENT_QUOTES, 'UTF-8').'"'.($attrs === '' ? '' : $attrs).'>';
            },
            $content
        );

        if (is_string($updated) && $updated !== $content) {
            $response->setContent($updated);
            // Conteúdo mudou: evita Content-Length stale
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
