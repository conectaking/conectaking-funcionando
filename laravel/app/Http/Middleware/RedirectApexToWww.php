<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Canonicaliza apex → www (308 preserva método/corpo).
 * tag.* não é afetado.
 */
class RedirectApexToWww
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = strtolower($request->getHost());
        if ($host !== 'conectaking.com.br') {
            return $next($request);
        }

        $target = 'https://www.conectaking.com.br'.$request->getRequestUri();

        return redirect()->to($target, 308)
            ->header('X-Conecta-Engine', 'laravel');
    }
}
