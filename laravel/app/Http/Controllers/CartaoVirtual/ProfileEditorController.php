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

    public function avatarFormat(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $avatarFormat = $request->input('avatar_format');
        if (!$avatarFormat) {
            return response()->json(['message' => 'Formato de avatar não fornecido.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        if (!in_array($avatarFormat, ['circular', 'square-full', 'square-small'], true)) {
            return response()->json([
                'message' => "Formato de avatar inválido: {$avatarFormat}. Valores permitidos: circular, square-full, square-small",
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $hasCol = \Illuminate\Support\Facades\DB::selectOne(
            "SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='user_profiles' AND column_name='avatar_format'
             ) AS ok"
        );
        if (!($hasCol->ok ?? false)) {
            return response()->json([
                'message' => 'Formato de avatar registrado localmente. Execute a migration 015 para salvar no banco.',
                'avatar_format' => $avatarFormat,
                'warning' => 'Coluna avatar_format ainda não existe no banco de dados.',
            ])->header('X-Conecta-Engine', 'laravel');
        }

        $exists = \Illuminate\Support\Facades\DB::selectOne(
            'SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1',
            [$userId]
        );
        if (!$exists) {
            \Illuminate\Support\Facades\DB::insert(
                'INSERT INTO user_profiles (user_id, avatar_format) VALUES (?, ?)',
                [$userId, $avatarFormat]
            );
        } else {
            \Illuminate\Support\Facades\DB::update(
                'UPDATE user_profiles SET avatar_format = ? WHERE user_id = ?',
                [$avatarFormat, $userId]
            );
        }

        return response()->json([
            'message' => 'Formato de avatar atualizado com sucesso.',
            'avatar_format' => $avatarFormat,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function shareImage(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $shareImageUrl = $request->input('share_image_url');

        $hasCol = \Illuminate\Support\Facades\DB::selectOne(
            "SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='user_profiles' AND column_name='share_image_url'
             ) AS ok"
        );
        if (!($hasCol->ok ?? false)) {
            return response()->json([
                'message' => 'Coluna share_image_url não existe. Execute a migration 019 primeiro.',
                'error' => 'MIGRATION_REQUIRED',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $exists = \Illuminate\Support\Facades\DB::selectOne(
            'SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1',
            [$userId]
        );
        if (!$exists) {
            \Illuminate\Support\Facades\DB::insert(
                'INSERT INTO user_profiles (user_id, share_image_url) VALUES (?, ?)',
                [$userId, $shareImageUrl ?: null]
            );
        } else {
            \Illuminate\Support\Facades\DB::update(
                'UPDATE user_profiles SET share_image_url = ? WHERE user_id = ?',
                [$shareImageUrl ?: null, $userId]
            );
        }

        return response()->json([
            'message' => 'Imagem de compartilhamento atualizada com sucesso.',
            'share_image_url' => $shareImageUrl ?: null,
        ])->header('X-Conecta-Engine', 'laravel');
    }
}
