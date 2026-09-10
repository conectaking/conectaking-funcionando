<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * Cookie HttpOnly do JWT King Selection (preview &lt;img&gt; + SameSite).
 */
final class KsClientAuthCookie
{
    public const NAME = 'ks_client_token';

    public static function make(Request $request, string $token, int $minutes = 14 * 24 * 60): Cookie
    {
        return Cookie::create(
            self::NAME,
            $token,
            $minutes > 0 ? time() + ($minutes * 60) : 1,
            '/',
            AuthCookieDomain::forRequest($request),
            $request->isSecure(),
            true,
            false,
            Cookie::SAMESITE_LAX
        );
    }

    public static function forget(Request $request): Cookie
    {
        return Cookie::create(
            self::NAME,
            '',
            1,
            '/',
            AuthCookieDomain::forRequest($request),
            $request->isSecure(),
            true,
            false,
            Cookie::SAMESITE_LAX
        );
    }
}
