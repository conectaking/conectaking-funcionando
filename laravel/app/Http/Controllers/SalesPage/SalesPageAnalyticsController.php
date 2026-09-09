<?php

namespace App\Http\Controllers\SalesPage;

use App\Http\Controllers\Controller;
use App\Services\SalesPage\SalesPageAnalyticsService;
use App\Services\SalesPage\SalesPageException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SalesPageAnalyticsController extends Controller
{
    public function __construct(private readonly SalesPageAnalyticsService $analytics)
    {
    }

    /** Público (sem JWT). */
    public function track(Request $request)
    {
        try {
            $event = $this->analytics->trackEvent(is_array($request->all()) ? $request->all() : []);

            return $this->success($event, null, 201);
        } catch (\Throwable $e) {
            Log::error('Erro ao registrar evento: '.$e->getMessage());

            return $this->error($e->getMessage(), 400);
        }
    }

    public function index(Request $request, string $salesPageId)
    {
        try {
            $this->analytics->assertOwnership((int) $salesPageId, $this->userId($request));

            $limit = $request->query('limit');

            return $this->success($this->analytics->getAnalytics((int) $salesPageId, [
                'start_date' => $request->query('start_date'),
                'end_date' => $request->query('end_date'),
                'event_type' => $request->query('event_type'),
                'limit' => is_numeric($limit) ? (int) $limit : null,
            ]));
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('Erro ao buscar analytics: '.$e->getMessage());

            return $this->error($e->getMessage(), 500);
        }
    }

    public function product(string $productId)
    {
        try {
            return $this->success($this->analytics->getProductAnalytics((int) $productId));
        } catch (\Throwable $e) {
            Log::error('Erro ao buscar analytics do produto: '.$e->getMessage());

            return $this->error($e->getMessage(), 500);
        }
    }

    public function funnel(Request $request, string $salesPageId)
    {
        try {
            $this->analytics->assertOwnership((int) $salesPageId, $this->userId($request));

            return $this->success($this->analytics->getSalesFunnel(
                (int) $salesPageId,
                $request->query('start_date'),
                $request->query('end_date')
            ));
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('Erro ao buscar funil de vendas: '.$e->getMessage());

            return $this->error($e->getMessage(), 500);
        }
    }

    public function ranking(Request $request, string $salesPageId)
    {
        try {
            $this->analytics->assertOwnership((int) $salesPageId, $this->userId($request));

            $limit = $request->query('limit');

            return $this->success(['ranking' => $this->analytics->getProductRanking(
                (int) $salesPageId,
                (string) ($request->query('event_type') ?: 'product_click'),
                is_numeric($limit) ? (int) $limit : 10
            )]);
        } catch (SalesPageException $e) {
            return $this->error($e->getMessage(), $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('Erro ao buscar ranking de produtos: '.$e->getMessage());

            return $this->error($e->getMessage(), 500);
        }
    }

    private function userId(Request $request): string
    {
        return (string) $request->attributes->get('auth_user_id');
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
