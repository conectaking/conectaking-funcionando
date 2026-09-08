<?php

namespace App\Http\Middleware;

use App\Services\Auth\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class AuthenticateAdmin
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
            if (empty($payload['isAdmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado. Permissões insuficientes.',
                ], 403)->header('X-Conecta-Engine', 'laravel');
            }
            $userId = $payload['userId'] ?? $payload['id'] ?? null;
            $request->attributes->set('auth_user_id', (string) ($userId ?? ''));
            $request->attributes->set('auth_payload', $payload);
            $request->attributes->set('auth_is_admin', true);
        } catch (UnexpectedValueException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Não autorizado, token inválido.',
            ], 401)->header('X-Conecta-Engine', 'laravel');
        }

        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        $auth = $request->header('Authorization', '');
        if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            $t = trim(substr($auth, 7));

            return $t !== '' ? $t : null;
        }
        $q = $request->query('token');
        if (is_string($q) && $q !== '') {
            return $q;
        }

        return null;
    }
}
