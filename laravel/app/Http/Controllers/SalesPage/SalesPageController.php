<?php

namespace App\Http\Controllers\SalesPage;

use App\Http\Controllers\Controller;
use App\Services\SalesPage\SalesPageException;
use App\Services\SalesPage\SalesPageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SalesPageController extends Controller
{
    public function __construct(private readonly SalesPageService $salesPages)
    {
    }

    public function store(Request $request)
    {
        try {
            $page = $this->salesPages->create(is_array($request->all()) ? $request->all() : []);

            return $this->success($page, 'Página de vendas criada com sucesso', 201);
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Log::error('Erro ao criar página de vendas: '.$e->getMessage());

            return $this->error($e->getMessage(), 400);
        }
    }

    public function show(string $id)
    {
        try {
            return $this->success($this->salesPages->findById((int) $id));
        } catch (\Throwable $e) {
            Log::error('Erro ao buscar página de vendas: '.$e->getMessage());

            return $this->error($e->getMessage(), 404);
        }
    }

    public function showByProfileItem(Request $request, string $itemId)
    {
        try {
            $page = $this->salesPages->findByProfileItemId(
                (int) $itemId,
                (string) $request->attributes->get('auth_user_id')
            );
            if ($page === null) {
                return $this->error('Página de vendas não encontrada', 404);
            }

            return $this->success($page);
        } catch (\Throwable $e) {
            Log::error('Erro ao buscar página de vendas: '.$e->getMessage());

            return $this->error($e->getMessage(), 500);
        }
    }

    public function update(Request $request, string $id)
    {
        return $this->mutate(
            fn (): array => $this->salesPages->update(
                (int) $id,
                (string) $request->attributes->get('auth_user_id'),
                is_array($request->all()) ? $request->all() : []
            ),
            'Página de vendas atualizada com sucesso',
            'Erro ao atualizar página de vendas'
        );
    }

    public function publish(Request $request, string $id)
    {
        return $this->mutate(
            fn (): array => $this->salesPages->publish((int) $id, (string) $request->attributes->get('auth_user_id')),
            'Página publicada com sucesso',
            'Erro ao publicar página'
        );
    }

    public function pause(Request $request, string $id)
    {
        return $this->mutate(
            fn (): array => $this->salesPages->pause((int) $id, (string) $request->attributes->get('auth_user_id')),
            'Página pausada com sucesso',
            'Erro ao pausar página'
        );
    }

    public function archive(Request $request, string $id)
    {
        return $this->mutate(
            fn (): array => $this->salesPages->archive((int) $id, (string) $request->attributes->get('auth_user_id')),
            'Página arquivada com sucesso',
            'Erro ao arquivar página'
        );
    }

    public function destroy(Request $request, string $id)
    {
        try {
            $this->salesPages->delete((int) $id, (string) $request->attributes->get('auth_user_id'));

            return $this->success(null, 'Página deletada com sucesso');
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('Erro ao deletar página de vendas: '.$e->getMessage());

            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * @param  callable():array<string,mixed>  $handler
     */
    private function mutate(callable $handler, string $successMessage, string $logPrefix)
    {
        try {
            return $this->success($handler(), $successMessage);
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), $e->statusCode());
        } catch (\Throwable $e) {
            Log::error($logPrefix.': '.$e->getMessage());

            return $this->error($e->getMessage(), 400);
        }
    }

    private function success(mixed $data, ?string $message = null, int $status = 200)
    {
        $body = [
            'success' => true,
            'data' => $data,
            'error' => null,
        ];
        if ($message !== null) {
            $body['message'] = $message;
        }

        return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
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
