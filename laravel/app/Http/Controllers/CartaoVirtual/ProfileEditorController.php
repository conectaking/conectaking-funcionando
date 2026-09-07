<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\ProfileEditorService;
use App\Services\CartaoVirtual\ProfileSaveService;
use Illuminate\Http\Request;

class ProfileEditorController extends Controller
{
    public function __construct(
        private readonly ProfileEditorService $service,
        private readonly ProfileSaveService $saveService,
    ) {
    }

    public function show(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        if ($userId === '') {
            return response()->json(['message' => 'ID do usuário não encontrado.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }

        $profile = $this->service->getFullProfile($userId);
        if (!$profile) {
            return response()->json(['message' => 'Usuário não encontrado.'], 404)
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json($profile)
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function saveAll(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        if ($userId === '') {
            return response()->json(['message' => 'ID do usuário não encontrado.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }

        try {
            $result = $this->saveService->saveAll($userId, $request->all());
            $ts = $result['timestamp'] ?? (int) round(microtime(true) * 1000);

            return response()
                ->json($result)
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0')
                ->header('X-Profile-Updated-At', (string) $ts)
                ->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('profile.saveAll', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao salvar alterações.',
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
