<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SystemDiagnosticsController extends Controller
{
    private const CACHE_KEY = 'recent_system_page_errors';
    private const MAX_ERRORS = 50;

    /**
     * Retorna a lista de erros recentes registrados nas páginas e rotas do sistema.
     */
    public function recentErrors(Request $request): JsonResponse
    {
        $limit = min(50, max(1, (int) $request->query('limit', 15)));
        $errors = Cache::get(self::CACHE_KEY, []);

        if (! is_array($errors)) {
            $errors = [];
        }

        // Ordena do mais recente para o mais antigo
        usort($errors, fn ($a, $b) => strcmp($b['timestamp'] ?? '', $a['timestamp'] ?? ''));

        $total = count($errors);
        $sliced = array_slice($errors, 0, $limit);

        // Agrupamento por página / URL para facilitar análise
        $byPage = [];
        foreach ($errors as $item) {
            $page = $item['url'] ?? $item['path'] ?? 'desconhecido';
            $byPage[$page] = ($byPage[$page] ?? 0) + 1;
        }

        return response()->json([
            'success' => true,
            'summary' => [
                'total_errors_24h' => $total,
                'affected_pages_count' => count($byPage),
                'pages_breakdown' => $byPage,
                'status' => $total === 0 ? 'healthy' : 'attention_required',
            ],
            'errors' => $sliced,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * Limpa o histórico de erros recentes do sistema.
     */
    public function clearErrors(Request $request): JsonResponse
    {
        Cache::forget(self::CACHE_KEY);

        return response()->json([
            'success' => true,
            'message' => 'Histórico de erros de páginas limpo com sucesso.',
        ])->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * Registra estaticamente um erro capturado globalmente.
     */
    public static function recordError(array $errorData): void
    {
        try {
            $errors = Cache::get(self::CACHE_KEY, []);
            if (! is_array($errors)) {
                $errors = [];
            }

            // Adiciona no início da lista
            array_unshift($errors, $errorData);

            // Mantém apenas os últimos MAX_ERRORS
            if (count($errors) > self::MAX_ERRORS) {
                $errors = array_slice($errors, 0, self::MAX_ERRORS);
            }

            // Guarda em cache por 48 horas (172800 segundos)
            Cache::put(self::CACHE_KEY, $errors, 172800);
        } catch (\Throwable $e) {
            // Não deve quebrar a execução se o cache falhar
        }
    }
}
