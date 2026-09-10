<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;
use Illuminate\Http\Request;

/**
 * Aceita o double-submit ck_csrf / X-CK-CSRF além do XSRF Laravel nativo.
 * Clientes só com Authorization Bearer (sem cookie de sessão) ficam isentos —
 * mesma regra prática do RequireCookieCsrf.
 */
class VerifyCsrfToken extends Middleware
{
    protected function tokensMatch($request): bool
    {
        if (parent::tokensMatch($request)) {
            return true;
        }

        if (! $request instanceof Request) {
            return false;
        }

        $tokenCookie = $request->cookie('token');
        $ksCookie = $request->cookie('ks_client_token');
        $hasAuthCookie = (is_string($tokenCookie) && $tokenCookie !== '')
            || (is_string($ksCookie) && $ksCookie !== '');

        if (! $hasAuthCookie) {
            $auth = (string) $request->header('Authorization', '');
            if (preg_match('/^Bearer\s+\S+/i', $auth) === 1) {
                return true;
            }
        }

        $cookie = (string) $request->cookie(RequireCookieCsrf::COOKIE, '');
        $header = (string) ($request->header(RequireCookieCsrf::HEADER) ?: $request->header('X-Xsrf-Token') ?: '');

        return $cookie !== '' && $header !== '' && hash_equals($cookie, $header);
    }
}
