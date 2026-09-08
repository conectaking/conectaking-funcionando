<?php

namespace App\Http\Middleware;

use App\Services\Account\ModulesService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireModule
{
    public function __construct(private readonly ModulesService $modules)
    {
    }

    public function handle(Request $request, Closure $next, string $module): Response
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        if ($userId === '') {
            return response()->json(['success' => false, 'message' => 'Não autorizado.'], 401)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $payload = (array) $request->attributes->get('auth_payload', []);
        if (! empty($payload['isAdmin'])) {
            return $next($request);
        }

        $avail = $this->modules->available($userId, null);
        $list = $avail['body']['available_modules'] ?? [];
        if (! in_array($module, $list, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Seu plano não inclui este módulo.',
            ], 403)->header('X-Conecta-Engine', 'laravel');
        }

        return $next($request);
    }
}
