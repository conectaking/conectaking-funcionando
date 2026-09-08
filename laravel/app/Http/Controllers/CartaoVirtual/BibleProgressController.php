<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleProgressService;
use Illuminate\Http\Request;

class BibleProgressController extends Controller
{
    public function __construct(private readonly BibleProgressService $progress)
    {
    }

    public function myProgress(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id');
        $data = $this->progress->getProgress($userId);

        return response()->json([
            'success' => true,
            'data' => $data,
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function markRead(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id');
        try {
            $data = $this->progress->markRead($userId, $request->all());
        } catch (\InvalidArgumentException $e) {
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
            'message' => 'Marcado como lido.',
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function reset(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id');
        $data = $this->progress->reset($userId);

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Progresso zerado. Você pode começar de novo.',
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }
}
