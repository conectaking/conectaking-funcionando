<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\CheckinAggregateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CheckinController extends Controller
{
    public function __construct(private readonly CheckinAggregateService $checkin)
    {
    }

    public function show(Request $request, string $itemId)
    {
        $id = (int) $itemId;
        if ($id <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'ID do item inválido',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        try {
            $r = $this->checkin->aggregate($id, (string) $request->attributes->get('auth_user_id'));

            return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('[CHECKIN] Erro ao carregar dados agregados: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dados',
                'error' => $e->getMessage(),
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
