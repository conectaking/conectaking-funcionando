<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\PersonalizarLinkService;
use Illuminate\Http\Request;

class PersonalizarLinkController extends Controller
{
    public function __construct(private readonly PersonalizarLinkService $service)
    {
    }

    public function getConfig()
    {
        try {
            $result = $this->service->getConfig();

            return response()->json($result)->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Erro ao buscar configuração.',
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }

    public function saveConfig(Request $request)
    {
        try {
            $result = $this->service->saveConfig($request->all());

            return response()->json($result)->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Erro ao salvar configuração.',
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
