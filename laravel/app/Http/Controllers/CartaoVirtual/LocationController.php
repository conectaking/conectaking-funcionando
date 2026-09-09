<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\LocationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LocationController extends Controller
{
    public function __construct(private readonly LocationService $location)
    {
    }

    public function show(Request $request, string $itemId)
    {
        $id = (int) $itemId;
        if ($id <= 0) {
            return $this->error('itemId inválido', 400);
        }

        return $this->run(
            fn (): array => $this->location->getConfig($id, (string) $request->attributes->get('auth_user_id')),
            'Erro ao buscar localização'
        );
    }

    public function update(Request $request, string $itemId)
    {
        $id = (int) $itemId;
        if ($id <= 0) {
            return $this->error('itemId inválido', 400);
        }

        return $this->run(fn (): array => $this->location->saveConfig(
            $id,
            (string) $request->attributes->get('auth_user_id'),
            is_array($request->all()) ? $request->all() : []
        ), 'Erro ao salvar localização');
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
            Log::error('location: '.$e->getMessage());

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
