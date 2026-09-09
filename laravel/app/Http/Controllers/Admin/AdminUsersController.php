<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AdminJsonResponse;
use App\Http\Controllers\Controller;
use App\Services\Admin\AdminUsersService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Mutações de usuários no painel admin (`modules/admin/users`).
 */
class AdminUsersController extends Controller
{
    use AdminJsonResponse;

    public function __construct(private readonly AdminUsersService $users)
    {
    }

    public function dashboard(Request $request, string $id)
    {
        try {
            $data = $this->users->dashboard($id);
            if ($data === null) {
                return $this->error('Usuário não encontrado.', 404);
            }

            return $this->success($data);
        } catch (\Throwable $e) {
            Log::error('Erro GET /api/admin/users/{id}/dashboard: '.$e->getMessage());

            return $this->error('Erro ao carregar dashboard do usuário.', 500);
        }
    }

    public function manage(Request $request, string $id)
    {
        $body = is_array($request->all()) ? $request->all() : [];
        if ($this->isSelfDemotion($request, $id, $body)) {
            return $this->error('Você não pode remover seu próprio status de administrador.', 403);
        }
        try {
            return $this->fromServiceResult($this->users->updateManage($id, $body), 'user');
        } catch (\RuntimeException $e) {
            $status = (int) $e->getCode();
            if ($status < 400 || $status > 599) {
                $status = 400;
            }

            return $this->error($e->getMessage(), $status);
        } catch (\Throwable $e) {
            Log::error('Erro PUT /api/admin/users/{id}/manage: '.$e->getMessage());

            return $this->error('Erro ao atualizar dados do usuário.', 500);
        }
    }

    public function updateActivationCode(Request $request, string $id)
    {
        $code = (string) ($request->input('activationCode')
            ?? $request->input('activation_code')
            ?? $request->input('code')
            ?? '');
        try {
            $result = $this->users->updateActivationCode($id, $code);
            if (isset($result['error'])) {
                return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
            }

            return $this->success([
                'activation_code' => $result['activation_code'] ?? $code,
                'profile_slug' => $result['profile_slug'] ?? $code,
            ], $result['message'] ?? null);
        } catch (\Throwable $e) {
            Log::error('Erro PUT /api/admin/users/{id}/activation-code: '.$e->getMessage());

            return $this->error('Erro ao atualizar código de ativação.', 500);
        }
    }

    public function updateRole(Request $request, string $id)
    {
        $body = is_array($request->all()) ? $request->all() : [];
        if ($this->isSelfDemotion($request, $id, $body)) {
            return $this->error('Você não pode remover seu próprio status de administrador.', 403);
        }
        try {
            return $this->fromServiceResult($this->users->updateRole($id, $body), 'user');
        } catch (\Throwable $e) {
            Log::error('Erro PUT /api/admin/users/{id}/update-role: '.$e->getMessage());

            return $this->error('Erro ao atualizar usuário.', 500);
        }
    }

    public function updateAccountType(Request $request, string $id)
    {
        try {
            $body = is_array($request->all()) ? $request->all() : [];

            return $this->fromServiceResult($this->users->updateAccountType($id, $body), 'user');
        } catch (\Throwable $e) {
            Log::error('Erro PUT /api/admin/users/{id}: '.$e->getMessage());

            return $this->error('Erro ao atualizar tipo de conta.', 500);
        }
    }

    public function destroy(Request $request, string $id)
    {
        if ($this->authUserId($request) === $id) {
            return $this->error('Você não pode deletar sua própria conta de administrador.', 403);
        }
        try {
            $result = $this->users->delete($id);
            if (isset($result['error'])) {
                return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
            }

            return $this->success(null, $result['message'] ?? null);
        } catch (\Throwable $e) {
            Log::error('Erro DELETE /api/admin/users/{id}: '.$e->getMessage());

            return $this->error('Erro no servidor ao tentar deletar o usuário.', 500);
        }
    }

    public function autoDeleteConfig()
    {
        return $this->run(
            fn () => $this->users->autoDeleteConfig(),
            'Erro ao buscar configuração.'
        );
    }

    public function saveAutoDeleteConfig(Request $request)
    {
        try {
            $body = is_array($request->all()) ? $request->all() : [];
            $result = $this->users->saveAutoDeleteConfig($body);

            return $this->success(['config' => $result['config']], $result['message'] ?? null);
        } catch (\Throwable $e) {
            Log::error('Erro POST /api/admin/users/auto-delete-config: '.$e->getMessage());

            return $this->error('Erro ao salvar configuração.', 500);
        }
    }

    public function executeAutoDelete(Request $request)
    {
        try {
            $body = is_array($request->all()) ? $request->all() : [];
            $result = $this->users->executeAutoDelete($body);
            if (isset($result['error'])) {
                return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
            }

            return $this->success(
                ['deleted' => $result['deleted'], 'count' => $result['count']],
                $result['message'] ?? null
            );
        } catch (\Throwable $e) {
            Log::error('Erro POST /api/admin/users/execute-auto-delete: '.$e->getMessage());

            return $this->error('Erro ao executar exclusão automática.', 500);
        }
    }

    private function authUserId(Request $request): string
    {
        return (string) $request->attributes->get('auth_user_id', '');
    }

    /**
     * @param  array<string,mixed>  $body
     */
    private function isSelfDemotion(Request $request, string $id, array $body): bool
    {
        return $this->authUserId($request) === $id && ($body['isAdmin'] ?? null) === false;
    }
}
