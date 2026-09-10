<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

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

        return $this->jsonWithTokenCookie($request, $r);
    }

    public function refresh(Request $request)
    {
        $r = $this->auth->refresh((string) ($request->input('refreshToken') ?: ''));

        return $this->jsonWithTokenCookie($request, $r);
    }

    public function logout(Request $request)
    {
        $r = $this->auth->logout($request->input('refreshToken') !== null ? (string) $request->input('refreshToken') : null);

        $response = response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');

        return $this->forgetTokenCookie($response, $request);
    }

    public function register(Request $request)
    {
        $r = $this->auth->register(
            (string) ($request->input('email') ?: ''),
            (string) ($request->input('password') ?: ''),
            (string) ($request->input('registrationCode') ?: '')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * @param  array{status:int, body:array<string,mixed>}  $r
     */
    private function jsonWithTokenCookie(Request $request, array $r): JsonResponse
    {
        $response = response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
        $token = is_array($r['body'] ?? null) ? (string) ($r['body']['token'] ?? '') : '';
        if ($r['status'] >= 200 && $r['status'] < 300 && $token !== '') {
            $response->headers->setCookie($this->makeTokenCookie($request, $token, $this->tokenCookieMinutes()));
        }

        return $response;
    }

    private function forgetTokenCookie(JsonResponse $response, Request $request): JsonResponse
    {
        $response->headers->setCookie($this->makeTokenCookie($request, '', -2628000));

        return $response;
    }

    private function makeTokenCookie(Request $request, string $value, int $minutes): Cookie
    {
        return Cookie::create(
            'token',
            $value,
            $minutes > 0 ? time() + ($minutes * 60) : 1,
            '/',
            null,
            $request->isSecure(),
            true, // HttpOnly — AuthenticateJwt já lê cookie `token`
            false,
            Cookie::SAMESITE_LAX
        );
    }

    private function tokenCookieMinutes(): int
    {
        $raw = strtolower(trim((string) (env('JWT_EXPIRES_IN') ?: '7d')));
        if (preg_match('/^(\d+)([smhd])$/', $raw, $m)) {
            $n = (int) $m[1];
            $unit = $m[2];
            $seconds = match ($unit) {
                's' => $n,
                'm' => $n * 60,
                'h' => $n * 3600,
                default => $n * 86400,
            };

            return max(1, (int) ceil($seconds / 60));
        }

        return 7 * 24 * 60;
    }
}
