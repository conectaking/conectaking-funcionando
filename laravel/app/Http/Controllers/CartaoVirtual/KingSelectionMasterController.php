<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\JwtService;
use App\Services\CartaoVirtual\KingSelectionQuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class KingSelectionMasterController extends Controller
{
    public function __construct(
        private readonly KingSelectionQuotaService $quota,
        private readonly JwtService $jwt,
    ) {
    }

    /**
     * Estatísticas de armazenamento do próprio fotógrafo logado (Widget Meus Projetos).
     */
    public function myStorage(Request $request): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        if ($userId === '') {
            return response()->json(['success' => false, 'message' => 'Não autenticado'], 401);
        }

        $stats = $this->quota->getUserStorageStats($userId);
        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Login exclusivo para fotógrafos do King Selection.
     */
    public function login(Request $request): JsonResponse
    {
        $email = trim(strtolower((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');

        if ($email === '' || $password === '') {
            return response()->json([
                'success' => false,
                'message' => 'Informe seu e-mail e senha para acessar.',
            ], 422);
        }

        $user = DB::selectOne(
            'SELECT id, name, email, password_hash, is_admin, account_type, king_selection_enabled, king_selection_plan 
             FROM users WHERE LOWER(email) = ? LIMIT 1',
            [$email]
        );

        if (!$user || !password_verify($password, (string) ($user->password_hash ?? ''))) {
            return response()->json([
                'success' => false,
                'message' => 'E-mail ou senha incorretos.',
            ], 401);
        }

        $isAdmin = (bool) ($user->is_admin ?? false) || in_array($user->account_type ?? '', ['admin', 'adm_principal'], true);
        $isEnabled = $isAdmin || (bool) ($user->king_selection_enabled ?? false);

        if (!$isEnabled) {
            return response()->json([
                'success' => false,
                'code' => 'MODULE_NOT_ENABLED',
                'message' => 'Sua conta ainda não possui o módulo King Selection habilitado. Entre em contato com o suporte para contratar ou ativar o seu plano de fotógrafo!',
            ], 403);
        }

        // Emite token JWT de 30 dias para comodidade do fotógrafo
        $token = $this->jwt->encode([
            'userId' => (string) $user->id,
            'email' => (string) $user->email,
            'isAdmin' => $isAdmin,
            'accountType' => $user->account_type ?? 'pro',
            'app' => 'kingSelection',
        ], '30d');

        $cookie = cookie('token', $token, 43200, '/', null, true, false, false, 'Lax');

        return response()->json([
            'success' => true,
            'message' => 'Login realizado com sucesso! Redirecionando para seus projetos...',
            'token' => $token,
            'redirect' => '/kingSelection',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'plan' => $user->king_selection_plan ?: 'plan_20gb',
            ],
        ])->withCookie($cookie);
    }

    /**
     * [ADMIN MASTER] Visão geral do King Selection (Consumo R2, Fatura, Fotógrafos).
     */
    public function masterOverview(Request $request): JsonResponse
    {
        $usdRate = (float) ($request->query('usd_rate') ?: KingSelectionQuotaService::DEFAULT_USD_RATE);
        $overview = $this->quota->getMasterOverview($usdRate);

        return response()->json([
            'success' => true,
            'data' => $overview,
        ]);
    }

    /**
     * [ADMIN MASTER] Atualiza plano e cota de um fotógrafo.
     */
    public function updatePlan(Request $request, string $userId): JsonResponse
    {
        $plan = (string) $request->input('plan', 'plan_20gb');
        $customGb = (float) $request->input('custom_gb', 0);
        $price = (float) $request->input('price', 0);

        $limitBytes = KingSelectionQuotaService::PLAN_LIMITS[$plan] ?? KingSelectionQuotaService::PLAN_LIMITS['plan_20gb'];
        if ($plan === 'custom' && $customGb > 0) {
            $limitBytes = (int) round($customGb * 1024 * 1024 * 1024);
        }

        if ($price <= 0) {
            $price = KingSelectionQuotaService::PLAN_PRICES[$plan] ?? 39.90;
        }

        DB::update(
            'UPDATE users SET king_selection_plan = ?, king_selection_storage_limit_bytes = ?, king_selection_plan_price = ? WHERE id = ?',
            [$plan, $limitBytes, $price, $userId]
        );

        return response()->json([
            'success' => true,
            'message' => 'Plano do fotógrafo atualizado com sucesso!',
            'data' => $this->quota->getUserStorageStats($userId),
        ]);
    }

    /**
     * [ADMIN MASTER] Ativa ou desativa o acesso ao King Selection para um usuário.
     */
    public function toggleAccess(Request $request, string $userId): JsonResponse
    {
        $enabled = (bool) $request->input('enabled', false);

        DB::update(
            'UPDATE users SET king_selection_enabled = ? WHERE id = ?',
            [$enabled, $userId]
        );

        return response()->json([
            'success' => true,
            'message' => $enabled ? 'Acesso ao King Selection liberado!' : 'Acesso ao King Selection desativado.',
            'enabled' => $enabled,
        ]);
    }
}

