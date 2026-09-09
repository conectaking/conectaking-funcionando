<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleConfigService;
use Illuminate\Http\Request;

class BibleConfigController extends Controller
{
    public function __construct(private readonly BibleConfigService $config)
    {
    }

    public function show(Request $request, int $itemId)
    {
        $userId = (string) $request->attributes->get('auth_user_id');
        try {
            $data = $this->config->getConfig($itemId, $userId);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $e->getMessage(),
                'error' => ['code' => 'FORBIDDEN', 'message' => $e->getMessage()],
            ], 403)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $data,
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function update(Request $request, int $itemId)
    {
        $userId = (string) $request->attributes->get('auth_user_id');
        try {
            $data = $this->config->saveConfig($itemId, $userId, $request->all());
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $e->getMessage(),
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Configuração salva.',
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }
}
