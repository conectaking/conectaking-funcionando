<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garante que o cookie ck_csrf esteja presente em todas as respostas.
 * O RequireCookieCsrf só exige a validação quando há cookie de auth,
 * mas emitir o cookie para todos garante que o JS sempre tenha o token
 * disponível (inclui visitantes anônimos em formulários públicos).
 */
class EnsureCsrfCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $hasCsrf = is_string($request->cookie(RequireCookieCsrf::COOKIE))
            && $request->cookie(RequireCookieCsrf::COOKIE) !== '';

        if (! $hasCsrf && method_exists($response, 'headers')) {
            $response->headers->setCookie(RequireCookieCsrf::makeCookie($request));
        }

        return $response;
    }
}

