<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\AdminTotpService;
use App\Services\Auth\AuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminTotpController extends Controller
{
    public function __construct(
        private readonly AdminTotpService $totp,
        private readonly AuthService $auth,
        private readonly AuthController $authHttp,
    ) {
    }

    public function verify(Request $request)
    {
        $r = $this->totp->verifyLoginChallenge(
            (string) $request->input('totpToken', ''),
            (string) $request->input('code', '')
        );
        if ($r['status'] !== 200) {
            return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
        }
        $login = $this->auth->finalizeLoginForUser($r['body']['user']);

        return $this->authHttp->loginResponseWithCookies($request, $login);
    }

    public function setup(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id');
        $email = (string) ($request->attributes->get('auth_payload')['email'] ?? '');
        if ($email === '') {
            $row = DB::selectOne('SELECT email FROM users WHERE id = ?', [$userId]);
            $email = (string) ($row->email ?? 'admin');
        }
        $r = $this->totp->beginSetup($userId, $email);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function confirm(Request $request)
    {
        $r = $this->totp->confirmSetup(
            (string) $request->attributes->get('auth_user_id'),
            (string) $request->input('code', '')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
