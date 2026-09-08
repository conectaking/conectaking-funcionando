<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\PasswordService;
use Illuminate\Http\Request;

class PasswordController extends Controller
{
    public function __construct(private readonly PasswordService $passwords)
    {
    }

    public function forgot(Request $request)
    {
        $r = $this->passwords->forgot((string) ($request->input('email') ?: ''));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function reset(Request $request)
    {
        $r = $this->passwords->reset(
            (string) ($request->input('token') ?: ''),
            (string) ($request->input('password') ?: '')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
