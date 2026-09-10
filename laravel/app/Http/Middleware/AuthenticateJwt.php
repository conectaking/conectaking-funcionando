<?php

namespace App\Http\Middleware;

use App\Services\Auth\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class AuthenticateJwt
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);
        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Não autorizado, nenhum token encontrado.',
            ], 401)->header('X-Conecta-Engine', 'laravel');
        }

        try {
            $payload = $this->jwt->decode($token);
            $userId = $payload['userId'] ?? $payload['id'] ?? null;
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'ID do usuário não encontrado.',
                ], 400)->header('X-Conecta-Engine', 'laravel');
            }
            $request->attributes->set('auth_user_id', (string) $userId);
            $request->attributes->set('auth_payload', $payload);
        } catch (UnexpectedValueException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Não autorizado, token inválido ou expirado.',
            ], 401)->header('X-Conecta-Engine', 'laravel');
        }

        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        $auth = $request->header('Authorization', '');
        if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            $t = trim(substr($auth, 7));
            // Bearer vazio (comum em front cookie-only) não deve bloquear o cookie HttpOnly.
            if ($t !== '') {
                return $t;
            }
        }
        // Query ?token= deixou de ser aceite (vaza em logs/Referer). Cookie HttpOnly ainda ok.
        $cookie = $request->cookie('token');
        if (is_string($cookie) && $cookie !== '') {
            return $cookie;
        }

        return null;
    }
}
