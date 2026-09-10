<?php

namespace App\Http\Middleware;

use App\Services\Auth\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class AuthenticateKsClient
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);
        if (!$token) {
            return response()->json(['message' => 'Não autorizado.'], 401)
                ->header('X-Conecta-Engine', 'laravel');
        }
        try {
            $payload = $this->jwt->decode($token);
        } catch (UnexpectedValueException) {
            return response()->json(['message' => 'Não autorizado.'], 401)
                ->header('X-Conecta-Engine', 'laravel');
        }
        if (($payload['type'] ?? '') !== 'kingselection_client') {
            return response()->json(['message' => 'Não autorizado.'], 401)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $request->attributes->set('ks_client', $payload);
        $request->attributes->set('ks_client_token', $token);

        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        $auth = $request->header('Authorization', '');
        if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            $t = trim(substr($auth, 7));
            if ($t !== '') {
                return $t;
            }
        }
        // Cookie SameSite (para <img src> de preview) — sem token em query/logs/Referer.
        $cookie = $request->cookie('ks_client_token');
        if (is_string($cookie) && $cookie !== '') {
            return $cookie;
        }

        return null;
    }
}
