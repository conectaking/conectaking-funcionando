<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Domínio de cookie partilhado entre apex e www (não inclui tag.*).
 */
final class AuthCookieDomain
{
    public static function forRequest(Request $request): ?string
    {
        $host = strtolower($request->getHost());
        if ($host === 'conectaking.com.br' || $host === 'www.conectaking.com.br') {
            return '.conectaking.com.br';
        }

        return null;
    }
}
