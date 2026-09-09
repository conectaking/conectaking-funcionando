<?php

namespace App\Http\Controllers\Orcamentos;

use App\Http\Controllers\Controller;
use App\Services\Orcamentos\OrcamentosService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OrcamentosController extends Controller
{
    public function __construct(private readonly OrcamentosService $orcamentos)
    {
    }

    public function index(Request $request)
    {
        return $this->run(fn (): array => $this->orcamentos->list(
            $this->userId($request),
            $this->nullableString($request->query('ticket')),
            $this->nullableString($request->query('status'))
        ), 'Erro ao listar orçamentos');
    }

    public function show(Request $request, string $id)
    {
        $numericId = (int) $id;
        if ($numericId <= 0) {
            return $this->error('ID inválido', 400);
        }

        return $this->run(fn (): array => $this->orcamentos->getOne($numericId, $this->userId($request)), 'Erro');
    }

    public function updateStatus(Request $request, string $id)
    {
        $numericId = (int) $id;
        if ($numericId <= 0) {
            return $this->error('ID inválido', 400);
        }
        $status = $request->input('status');
        if (! is_string($status) || $status === '') {
            return $this->error('status é obrigatório', 400);
        }

        return $this->run(
            fn (): array => $this->orcamentos->updateStatus($numericId, $this->userId($request), $status),
            'Erro'
        );
    }

    public function destroy(Request $request, string $id)
    {
        $numericId = (int) $id;
        if ($numericId <= 0) {
            return $this->error('ID inválido', 400);
        }

        return $this->run(fn (): array => $this->orcamentos->remove($numericId, $this->userId($request)), 'Erro');
    }

    private function userId(Request $request): string
    {
        return (string) $request->attributes->get('auth_user_id');
    }

    private function nullableString(mixed $v): ?string
    {
        return is_string($v) && $v !== '' ? $v : null;
    }

    /**
     * @param  callable():array{status:int, body:array<string,mixed>}  $handler
     */
    private function run(callable $handler, string $fallbackMessage)
    {
        try {
            $r = $handler();

            return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('orcamentos: '.$e->getMessage());

            return $this->error($fallbackMessage, 500);
        }
    }

    private function error(string $message, int $status)
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => ['code' => 'ERROR', 'message' => $message],
        ], $status)->header('X-Conecta-Engine', 'laravel');
    }
}
