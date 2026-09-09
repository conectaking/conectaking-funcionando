<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AdminJsonResponse;
use App\Http\Controllers\Controller;
use App\Services\Admin\AdminCodesService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Mutações de códigos de registro no painel admin (`modules/admin/codes`).
 */
class AdminCodesController extends Controller
{
    use AdminJsonResponse;

    public function __construct(private readonly AdminCodesService $codes)
    {
    }

    public function generateManual(Request $request)
    {
        $body = is_array($request->all()) ? $request->all() : [];
        try {
            $result = $this->codes->generateManual($body['customCode'] ?? null, $body['expiresAt'] ?? null);
            if (isset($result['error'])) {
                return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
            }

            return $this->success(['codes' => $result['codes']], $result['message'] ?? null, 201);
        } catch (UniqueConstraintViolationException) {
            return $this->error('Este código personalizado já existe. Tente outro.', 409);
        } catch (\Throwable $e) {
            if ($this->isUniqueViolation($e)) {
                return $this->error('Este código personalizado já existe. Tente outro.', 409);
            }
            Log::error('Erro POST /api/admin/codes/generate-manual: '.$e->getMessage());

            return $this->error('Erro ao criar código personalizado.', 500);
        }
    }

    public function generateCode(Request $request)
    {
        $body = is_array($request->all()) ? $request->all() : [];
        try {
            $result = $this->codes->generateCode($body['expiresAt'] ?? null);
            if (isset($result['error'])) {
                return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
            }

            // O front legado lê `code` na raiz, não só em `data`.
            return response()->json([
                'success' => true,
                'data' => ['code' => $result['code']],
                'error' => null,
                'message' => $result['message'],
                'code' => $result['code'],
            ], 201)->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('Erro POST /api/admin/generate-code: '.$e->getMessage());

            return $this->error('Erro ao gerar código.', 500);
        }
    }

    public function generateBatch(Request $request)
    {
        $body = is_array($request->all()) ? $request->all() : [];
        try {
            $result = $this->codes->generateBatch(
                $body['prefix'] ?? null,
                $body['count'] ?? null,
                $body['expiresAt'] ?? null
            );
            if (isset($result['error'])) {
                return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
            }

            return $this->success(['codes' => $result['codes']], $result['message'] ?? null, 201);
        } catch (\Throwable $e) {
            Log::error('Erro POST /api/admin/codes/generate-batch: '.$e->getMessage());

            return $this->error('Erro ao gerar códigos em lote.', 500);
        }
    }

    public function update(Request $request, string $code)
    {
        $body = is_array($request->all()) ? $request->all() : [];
        try {
            return $this->fromServiceResult($this->codes->updateCode($code, $body['expiresAt'] ?? null), 'code');
        } catch (\Throwable $e) {
            Log::error('Erro PUT /api/admin/codes/{code}: '.$e->getMessage());

            return $this->error('Erro ao atualizar código.', 500);
        }
    }

    public function destroy(string $code)
    {
        try {
            $result = $this->codes->deleteCode($code);
            if (isset($result['error'])) {
                return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
            }

            return $this->success(null, $result['message'] ?? null);
        } catch (\Throwable $e) {
            Log::error('Erro DELETE /api/admin/codes/{code}: '.$e->getMessage());

            return $this->error('Erro ao deletar código.', 500);
        }
    }

    public function autoDeleteConfig()
    {
        return $this->run(
            fn () => $this->codes->autoDeleteConfig(),
            'Erro ao buscar configuração.'
        );
    }

    public function saveAutoDeleteConfig(Request $request)
    {
        $body = is_array($request->all()) ? $request->all() : [];
        try {
            $result = $this->codes->saveAutoDeleteConfig(
                $body['days_after_expiration'] ?? null,
                array_key_exists('is_active', $body) ? $body['is_active'] : null
            );
            if (isset($result['error'])) {
                return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
            }

            return $this->success(['config' => $result['config']], $result['message'] ?? null);
        } catch (\Throwable $e) {
            Log::error('Erro POST /api/admin/codes/auto-delete-config: '.$e->getMessage());

            return $this->error('Erro ao salvar configuração.', 500);
        }
    }

    public function executeAutoDelete()
    {
        try {
            $result = $this->codes->executeAutoDelete();

            return $this->success(['deleted' => $result['deleted']], $result['message'] ?? null);
        } catch (\Throwable $e) {
            Log::error('Erro POST /api/admin/codes/execute-auto-delete: '.$e->getMessage());

            return $this->error('Erro ao executar exclusão automática.', 500);
        }
    }

    private function isUniqueViolation(\Throwable $e): bool
    {
        $msg = $e->getMessage();

        return str_contains($msg, '23505') || str_contains($msg, 'duplicate key value');
    }
}
