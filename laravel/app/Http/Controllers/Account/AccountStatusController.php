<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Services\Account\AccountStatusService;
use Illuminate\Http\Request;

class AccountStatusController extends Controller
{
    public function __construct(private readonly AccountStatusService $account)
    {
    }

    public function status(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        if ($userId === '') {
            return response()->json(['message' => 'Não autorizado.'], 401)
                ->header('X-Conecta-Engine', 'laravel');
        }
        try {
            $data = $this->account->statusForUser($userId);

            return response()->json($data)->header('X-Conecta-Engine', 'laravel');
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 404)
                ->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erro ao buscar dados da conta.'], 500)
                ->header('X-Conecta-Engine', 'laravel');
        }
    }
}
