<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AdminJsonResponse;
use App\Http\Controllers\Controller;
use App\Services\Admin\AdminOverviewService;
use App\Services\Admin\DefaultBrandingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Painel admin: logomarca padrão, estatísticas, planos e listagens (routes/admin.js).
 */
class AdminOverviewController extends Controller
{
    use AdminJsonResponse;

    public function __construct(
        private readonly AdminOverviewService $overview,
        private readonly DefaultBrandingService $branding,
    ) {
    }

    public function getDefaultBranding()
    {
        return $this->run(
            fn () => $this->branding->get(),
            'Erro ao buscar logomarca padrão.'
        );
    }

    public function putDefaultBranding(Request $request)
    {
        try {
            $message = $this->branding->update(is_array($request->all()) ? $request->all() : []);

            return $this->success(null, $message);
        } catch (\Throwable $e) {
            Log::error('Erro PUT /api/admin/default-branding: '.$e->getMessage());

            return $this->error('Erro ao salvar logomarca padrão.', 500);
        }
    }

    public function stats()
    {
        return $this->run(
            fn () => $this->overview->stats(),
            'Erro no servidor ao buscar estatísticas.'
        );
    }

    public function plans()
    {
        return $this->run(
            fn () => $this->overview->plans(),
            'Erro ao listar planos.'
        );
    }

    public function updatePlan(Request $request, string $id)
    {
        if (! is_numeric($id)) {
            return $this->error('ID do plano inválido.', 400);
        }

        $body = is_array($request->all()) ? $request->all() : [];
        if (! array_key_exists('kingbrief_minutes_per_month', $body)) {
            return $this->error('Envie kingbrief_minutes_per_month (número ou null para ilimitado).', 400);
        }

        $raw = $body['kingbrief_minutes_per_month'];
        $minutes = ($raw === null || $raw === '') ? null : max(0, (int) $raw);

        try {
            $updated = $this->overview->updatePlanKingBrief((int) $id, $minutes);
            if ($updated === null) {
                return $this->error('Plano não encontrado.', 404);
            }

            return $this->success($updated, 'Plano atualizado.');
        } catch (\Throwable $e) {
            Log::error('Erro PATCH /api/admin/plans/{id}: '.$e->getMessage());

            return $this->error('Erro ao atualizar plano.', 500);
        }
    }

    public function users(Request $request)
    {
        $limit = is_numeric($request->query('limit')) ? (int) $request->query('limit') : 100;
        $offset = is_numeric($request->query('offset')) ? (int) $request->query('offset') : 0;

        return $this->run(
            fn () => $this->overview->users($limit, $offset),
            'Erro ao buscar usuários.'
        );
    }

    public function codes(Request $request)
    {
        $filter = $request->query('filter');
        $limit = is_numeric($request->query('limit')) ? (int) $request->query('limit') : 100;
        $offset = is_numeric($request->query('offset')) ? (int) $request->query('offset') : 0;

        return $this->run(
            fn () => $this->overview->codes(is_string($filter) ? $filter : null, $limit, $offset),
            'Erro ao buscar códigos.'
        );
    }

    public function advancedStats()
    {
        return $this->run(
            fn () => $this->overview->advancedStats(),
            'Erro no servidor ao buscar estatísticas avançadas.'
        );
    }

    public function analyticsUsers(Request $request)
    {
        $limit = is_numeric($request->query('limit')) ? (int) $request->query('limit') : 100;
        $offset = is_numeric($request->query('offset')) ? (int) $request->query('offset') : 0;

        return $this->run(
            fn () => $this->overview->analyticsUsers($limit, $offset),
            'Erro ao buscar analytics de usuários.'
        );
    }

    public function analyticsUserDetails(Request $request, string $userId)
    {
        $raw = $request->query('period', '30');
        $period = is_numeric($raw) ? (int) $raw : 0;
        if ($period < 1 || $period > 365) {
            return $this->error('Período inválido. Deve ser entre 1 e 365 dias.', 400);
        }

        return $this->run(
            fn () => $this->overview->analyticsUserDetails($userId, $period),
            'Erro ao buscar detalhes de analytics.'
        );
    }
}
