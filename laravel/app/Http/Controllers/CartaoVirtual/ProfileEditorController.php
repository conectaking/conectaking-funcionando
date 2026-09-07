<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\ProfileEditorService;
use Illuminate\Http\Request;

class ProfileEditorController extends Controller
{
    public function __construct(private readonly ProfileEditorService $service)
    {
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
}
