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
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        'log/*',
        '*/form/*/submit',
        'api/bible/prosperidade/mark-read',
        'api/bible/devotional/mark-read',
        'api/bible/mark-read',
        'api/bible/reset-progress',
        'api/guest-lists/public/register/*',
        'api/guest-lists/public/confirm/*',
        'portaria/*/checkin/*',
        'guest-list/view-full/*/checkin/*',
        'guest-list/confirm/qr/*',
        'guest-list/confirm/cpf',
        'api/king-selection/client/login',
        'api/king-selection/client/login-by-details',
        'api/king-selection/client/register',
        'api/king-selection/client/public-enter',
        'api/king-selection/client/signup-enter',
        'api/king-selection/client/clear-session-cookie',
        'api/king-selection/client/redeem-access',
        'api/king-selection/public/enroll-face-anonymous',
        'api/auth/login',
        'api/auth/refresh',
        'api/auth/logout',
        'api/auth/register',
        'api/auth/sync-session-cookie',
        'api/password/forgot',
        'api/password/reset',
        'api/inquiry/submit',
        'api/admin/*',
        'api/finance/*',
        'api/subscription/*',
    ];

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
