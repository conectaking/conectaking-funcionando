<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Services\Account\AccountService;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function __construct(private readonly AccountService $account)
    {
    }

    public function details(Request $request)
    {
        $r = $this->account->details((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateDetails(Request $request)
    {
        $r = $this->account->updateDetails((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function changePassword(Request $request)
    {
        $r = $this->account->changePassword((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function upgrade(Request $request)
    {
        $r = $this->account->upgrade((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function debugPlan(Request $request, string $email)
    {
        $r = $this->account->debugPlan((string) $request->attributes->get('auth_user_id'), $email);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
