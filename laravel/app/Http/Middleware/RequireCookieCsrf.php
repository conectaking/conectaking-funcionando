<?php

namespace App\Http\Middleware;

use App\Support\AuthCookieDomain;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;

/**
 * CSRF double-submit para sessões cookie-first (token / ks_client_token).
 * Clientes com Authorization Bearer real ficam isentos.
 */
class RequireCookieCsrf
{
    public const COOKIE = 'ck_csrf';

    public const HEADER = 'X-CK-CSRF';

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array(strtoupper($request->method()), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        // Cookie de sessão presente → exigir CSRF (mesmo com Bearer no LS — evita bypass com JWT stale).
        if (! $this->hasAuthCookie($request)) {
            return $next($request);
        }

        // Endpoints públicos de auth (ainda sem cookie válido de CSRF no login)
        $path = ltrim($request->path(), '/');
        if ($this->isAuthBootstrapPath($path)) {
            return $next($request);
        }

        $cookie = (string) $request->cookie(self::COOKIE, '');
        $header = (string) ($request->header(self::HEADER) ?: $request->header('X-Xsrf-Token') ?: '');
        if ($cookie === '') {
            return response()->json([
                'success' => false,
                'message' => 'CSRF ausente. Recarregue a página e tente novamente.',
            ], 419)
                ->header('X-Conecta-Engine', 'laravel')
                ->withCookie(self::makeCookie($request));
        }
        if ($header === '' || ! hash_equals($cookie, $header)) {
            return response()->json([
                'success' => false,
                'message' => 'CSRF inválido. Recarregue a página e tente novamente.',
            ], 419)->header('X-Conecta-Engine', 'laravel');
        }

        return $next($request);
    }

    public static function makeCookie(Request $request, ?string $value = null, int $minutes = 60 * 24): Cookie
    {
        $token = $value !== null && $value !== '' ? $value : Str::random(40);

        return Cookie::create(
            self::COOKIE,
            $token,
            time() + ($minutes * 60),
            '/',
            AuthCookieDomain::forRequest($request),
            $request->isSecure(),
            false, // legível pelo JS (double-submit)
            false,
            Cookie::SAMESITE_LAX
        );
    }

    public static function forgetCookie(Request $request): Cookie
    {
        return Cookie::create(
            self::COOKIE,
            '',
            1,
            '/',
            AuthCookieDomain::forRequest($request),
            $request->isSecure(),
            false,
            false,
            Cookie::SAMESITE_LAX
        );
    }

    private function hasAuthCookie(Request $request): bool
    {
        $token = $request->cookie('token');
        $ks = $request->cookie('ks_client_token');

        return (is_string($token) && $token !== '') || (is_string($ks) && $ks !== '');
    }

    private function isAuthBootstrapPath(string $path): bool
    {
        return in_array($path, [
            'api/auth/login',
            'api/auth/refresh',
            'api/auth/logout',
            'api/auth/register',
            'api/password/forgot',
            'api/password/reset',
            'api/king-selection/client/login',
            'api/king-selection/client/login-by-details',
            'api/king-selection/client/register',
            'api/king-selection/client/public-enter',
            'api/king-selection/client/signup-enter',
        ], true);
    }
}
