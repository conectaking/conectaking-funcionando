<?php

namespace App\Http\Middleware;

use App\Services\AuditLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Regista mutações admin/account em audit_logs.
 */
class AuditMutations
{
    public function __construct(private readonly AuditLogService $audit)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $method = strtoupper($request->method());
        if (! in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $response;
        }

        $path = '/'.ltrim($request->path(), '/');
        $isAdmin = str_starts_with($path, '/api/admin');
        $isAccount = str_starts_with($path, '/api/account');
        if (! $isAdmin && ! $isAccount) {
            return $response;
        }

        $this->audit->log(
            $request->attributes->get('auth_user_id') ? (string) $request->attributes->get('auth_user_id') : null,
            strtolower($method),
            $isAdmin ? 'admin' : 'account',
            null,
            ['path' => $path],
            $request->ip(),
            $request->userAgent(),
            $method,
            $path,
            $response->getStatusCode(),
        );

        return $response;
    }
}
