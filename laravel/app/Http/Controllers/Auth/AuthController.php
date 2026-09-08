<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    public function login(Request $request)
    {
        $r = $this->auth->login(
            (string) ($request->input('email') ?: ''),
            (string) ($request->input('password') ?: '')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function refresh(Request $request)
    {
        $r = $this->auth->refresh((string) ($request->input('refreshToken') ?: ''));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function logout(Request $request)
    {
        $r = $this->auth->logout($request->input('refreshToken') !== null ? (string) $request->input('refreshToken') : null);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
