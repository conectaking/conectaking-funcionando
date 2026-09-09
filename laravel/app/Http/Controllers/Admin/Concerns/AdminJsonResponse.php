<?php

namespace App\Http\Controllers\Admin\Concerns;

use Illuminate\Support\Facades\Log;

/**
 * Mesmo envelope do `utils/responseFormatter.js` do Node, para o front admin não notar a troca.
 */
trait AdminJsonResponse
{
    /**
     * @param  callable():mixed  $handler
     */
    protected function run(callable $handler, string $fallbackMessage)
    {
        try {
            return $this->success($handler());
        } catch (\Throwable $e) {
            Log::error($fallbackMessage.' '.$e->getMessage());

            return $this->error($fallbackMessage, 500);
        }
    }

    protected function success(mixed $data, ?string $message = null, int $status = 200)
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

    protected function error(string $message, int $status)
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => ['code' => 'ERROR', 'message' => $message],
        ], $status)->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * Serviços devolvem `['error' => ..., 'status' => ...]` como no Node; converte para HTTP.
     *
     * @param  array<string,mixed>  $result
     */
    protected function fromServiceResult(array $result, ?string $dataKey = null)
    {
        if (isset($result['error'])) {
            return $this->error((string) $result['error'], (int) ($result['status'] ?? 400));
        }
        $data = $dataKey !== null ? [$dataKey => $result[$dataKey] ?? null] : ($result['data'] ?? null);

        return $this->success($data, $result['message'] ?? null);
    }
}
