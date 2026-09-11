<?php

namespace App\Http\Middleware;

use App\Services\Auth\JwtService;
use App\Support\ClientIp;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class AuthenticateAdmin
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $allow = trim((string) env('ADMIN_IP_ALLOWLIST', ''));
        if ($allow !== '') {
            $client = ClientIp::from($request);
            $ok = false;
            foreach (array_filter(array_map('trim', explode(',', $allow))) as $entry) {
                if ($entry === $client || (str_contains($entry, '/') && $this->cidrMatch($client, $entry))) {
                    $ok = true;
                    break;
                }
            }
            if (! $ok) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso admin bloqueado para este IP.',
                    'client_ip' => $client,
                ], 403)->header('X-Conecta-Engine', 'laravel');
            }
        }

        $token = $this->extractToken($request);
        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Não autorizado, nenhum token encontrado.',
            ], 401)->header('X-Conecta-Engine', 'laravel');
        }

        try {
            $payload = $this->jwt->decode($token);
        } catch (UnexpectedValueException $e) {
            $cookie = $request->cookie('token');
            if (is_string($cookie) && $cookie !== '' && $cookie !== $token) {
                try {
                    $payload = $this->jwt->decode($cookie);
                    $token = $cookie;
                } catch (UnexpectedValueException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Não autorizado, token inválido.',
                    ], 401)->header('X-Conecta-Engine', 'laravel');
                }
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Não autorizado, token inválido.',
                ], 401)->header('X-Conecta-Engine', 'laravel');
            }
        }

        $userId = (string) ($payload['userId'] ?? $payload['id'] ?? '');
        if ($userId === '') {
            return response()->json([
                'success' => false,
                'message' => 'ID do usuário não encontrado.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        // Revalidar na DB — claim JWT isAdmin sozinho não basta (admin revogado)
        $row = DB::selectOne('SELECT is_admin FROM users WHERE id = ? LIMIT 1', [$userId]);
        $isAdmin = $row && filter_var($row->is_admin ?? false, FILTER_VALIDATE_BOOLEAN);
        if (!$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Acesso negado. Permissões insuficientes.',
            ], 403)->header('X-Conecta-Engine', 'laravel');
        }

        $request->attributes->set('auth_user_id', $userId);
        $request->attributes->set('auth_payload', $payload);
        $request->attributes->set('auth_is_admin', true);

        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        $auth = $request->header('Authorization', '');
        if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            $t = trim(substr($auth, 7));
            if ($t !== '' && ! in_array(strtolower($t), ['null', 'undefined'], true)) {
                return $t;
            }
        }
        $cookie = $request->cookie('token');
        if (is_string($cookie) && $cookie !== '') {
            return $cookie;
        }

        return null;
    }

    private function cidrMatch(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = array_pad(explode('/', $cidr, 2), 2, '32');
        $bits = (int) $bits;
        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) || ! filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return false;
        }
        $ipLong = ip2long($ip);
        $subLong = ip2long($subnet);
        $mask = -1 << (32 - max(0, min(32, $bits)));

        return ($ipLong & $mask) === ($subLong & $mask);
    }
}
