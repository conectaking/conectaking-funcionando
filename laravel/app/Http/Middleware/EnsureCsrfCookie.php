<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garante cookie ck_csrf em respostas autenticadas por cookie (sessões antigas / login).
 */
class EnsureCsrfCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $hasAuthCookie = (is_string($request->cookie('token')) && $request->cookie('token') !== '')
            || (is_string($request->cookie('ks_client_token')) && $request->cookie('ks_client_token') !== '');
        $hasCsrf = is_string($request->cookie(RequireCookieCsrf::COOKIE))
            && $request->cookie(RequireCookieCsrf::COOKIE) !== '';

        if ($hasAuthCookie && ! $hasCsrf && method_exists($response, 'headers')) {
            $response->headers->setCookie(RequireCookieCsrf::makeCookie($request));
        }

        return $response;
    }
}
