<?php

namespace App\Http\Controllers\SalesPage;

use App\Http\Controllers\Controller;
use App\Services\SalesPage\SalesPageException;
use App\Services\SalesPage\SalesPageProductService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SalesPageProductController extends Controller
{
    public function __construct(private readonly SalesPageProductService $products)
    {
    }

    public function index(Request $request, string $salesPageId)
    {
        try {
            $products = $this->products->listBySalesPage(
                (int) $salesPageId,
                $request->query('includeArchived') === 'true'
            );

            return $this->success(['products' => $products]);
        } catch (\Throwable $e) {
            Log::error('Erro ao listar produtos: '.$e->getMessage());

            return $this->error($e->getMessage(), 500);
        }
    }

    public function store(Request $request, string $salesPageId)
    {
        try {
            $product = $this->products->create(
                (int) $salesPageId,
                $this->userId($request),
                is_array($request->all()) ? $request->all() : []
            );

            return $this->success($product, 'Produto criado com sucesso', 201);
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('Erro ao criar produto: '.$e->getMessage());

            return $this->error($e->getMessage(), 400);
        }
    }

    public function show(string $productId)
    {
        try {
            return $this->success($this->products->findById((int) $productId));
        } catch (\Throwable $e) {
            Log::error('Erro ao buscar produto: '.$e->getMessage());

            return $this->error($e->getMessage(), 404);
        }
    }

    public function update(Request $request, string $productId)
    {
        return $this->mutate(
            fn (): array => $this->products->update(
                (int) $productId,
                $this->userId($request),
                is_array($request->all()) ? $request->all() : []
            ),
            'Produto atualizado com sucesso',
            'Erro ao atualizar produto'
        );
    }

    public function updateStatus(Request $request, string $productId)
    {
        return $this->mutate(
            fn (): array => $this->products->updateStatus(
                (int) $productId,
                $this->userId($request),
                $request->input('status')
            ),
            'Status do produto atualizado com sucesso',
            'Erro ao atualizar status do produto'
        );
    }

    public function destroy(Request $request, string $productId)
    {
        try {
            $this->products->delete((int) $productId, $this->userId($request));

            return $this->success(null, 'Produto deletado com sucesso');
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('Erro ao deletar produto: '.$e->getMessage());

            return $this->error($e->getMessage(), 500);
        }
    }

    public function reorder(Request $request, string $salesPageId)
    {
        try {
            $this->products->reorder(
                (int) $salesPageId,
                $this->userId($request),
                $request->input('productOrders')
            );

            return $this->success(null, 'Produtos reordenados com sucesso');
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('Erro ao reordenar produtos: '.$e->getMessage());

            return $this->error($e->getMessage(), 400);
        }
    }

    private function userId(Request $request): string
    {
        return (string) $request->attributes->get('auth_user_id');
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
