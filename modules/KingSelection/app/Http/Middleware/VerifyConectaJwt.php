<?php

namespace KingSelection\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyConectaJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        // Preferência: Authorization: Bearer <token>
        $auth = $request->header('Authorization') ?? '';
        $token = null;
        if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
            $token = $m[1];
        }

        // Fallback: permitir token via querystring (para abrir via dashboard)
        if (!$token) {
            $token = $request->query('token');
        }

        if (!$token || !is_string($token)) {
            return response('Não autenticado.', 401);
        }

        $secret = env('JWT_SECRET');
        if (!$secret) {
            return response('JWT_SECRET não configurado.', 500);
        }

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            // Disponibilizar payload para controllers
            $request->attributes->set('conectaJwt', $decoded);
        } catch (\Throwable $e) {
            return response('Token inválido.', 401);
        }

        return $next($request);
    }
}

