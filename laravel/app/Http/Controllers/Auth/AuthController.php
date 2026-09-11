<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use App\Support\AuthCookieDomain;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

class AuthController extends Controller
{
    public const REFRESH_COOKIE = 'refresh_token';

    public function __construct(private readonly AuthService $auth)
    {
    }

    public function login(Request $request)
    {
        $r = $this->auth->login(
            (string) ($request->input('email') ?: ''),
            (string) ($request->input('password') ?: '')
        );

        return $this->jsonWithAuthCookies($request, $r);
    }

    public function refresh(Request $request)
    {
        $fromBody = trim((string) ($request->input('refreshToken') ?: ''));
        $fromCookie = trim((string) ($request->cookie(self::REFRESH_COOKIE) ?: ''));
        $r = $this->auth->refresh($fromBody !== '' ? $fromBody : $fromCookie);

        return $this->jsonWithAuthCookies($request, $r);
    }

    public function logout(Request $request)
    {
        $fromBody = $request->input('refreshToken') !== null ? (string) $request->input('refreshToken') : null;
        $fromCookie = trim((string) ($request->cookie(self::REFRESH_COOKIE) ?: ''));
        $r = $this->auth->logout($fromBody !== null && $fromBody !== '' ? $fromBody : ($fromCookie !== '' ? $fromCookie : null));

        $response = response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');

        return $this->forgetAuthCookies($response, $request);
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

    /** Espelha Bearer (LS) → cookie HttpOnly para iframes / window.open. */
    public function syncSessionCookie(Request $request): JsonResponse
    {
        $token = '';
        $auth = $request->header('Authorization', '');
        if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            $token = trim(substr($auth, 7));
        }
        if ($token === '' || in_array(strtolower($token), ['null', 'undefined'], true)) {
            return response()->json(['success' => false, 'message' => 'Token ausente.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        try {
            app(\App\Services\Auth\JwtService::class)->decode($token);
        } catch (\Throwable) {
            return response()->json(['success' => false, 'message' => 'Token inválido.'], 401)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $response = response()->json(['success' => true])->header('X-Conecta-Engine', 'laravel');
        $response->headers->setCookie($this->makeTokenCookie($request, $token, $this->tokenCookieMinutes()));
        $response->headers->setCookie(\App\Http\Middleware\RequireCookieCsrf::makeCookie($request));

        return $response;
    }

    /**
     * @param  array{status:int, body:array<string,mixed>}  $r
     */
    private function jsonWithAuthCookies(Request $request, array $r): JsonResponse
    {
        $body = is_array($r['body'] ?? null) ? $r['body'] : [];
        $token = (string) ($body['token'] ?? '');
        $refresh = (string) ($body['refreshToken'] ?? '');
        // Não devolver JWT no JSON (fica só no cookie HttpOnly).
        if (array_key_exists('refreshToken', $body)) {
            unset($body['refreshToken']);
        }
        if (array_key_exists('token', $body)) {
            unset($body['token']);
        }
        $response = response()->json($body, $r['status'])->header('X-Conecta-Engine', 'laravel');
        if ($r['status'] >= 200 && $r['status'] < 300 && $token !== '') {
            $response->headers->setCookie($this->makeTokenCookie($request, $token, $this->tokenCookieMinutes()));
            $response->headers->setCookie($this->makeRefreshCookie($request, $refresh, $this->refreshCookieMinutes()));
            $response->headers->setCookie(\App\Http\Middleware\RequireCookieCsrf::makeCookie($request));
        }

        return $response;
    }

    private function forgetAuthCookies(JsonResponse $response, Request $request): JsonResponse
    {
        $response->headers->setCookie($this->makeTokenCookie($request, '', -2628000));
        $response->headers->setCookie($this->makeRefreshCookie($request, '', -2628000));
        $response->headers->setCookie(\App\Http\Middleware\RequireCookieCsrf::forgetCookie($request));

        return $response;
    }

    private function makeTokenCookie(Request $request, string $value, int $minutes): Cookie
    {
        return Cookie::create(
            'token',
            $value,
            $minutes > 0 ? time() + ($minutes * 60) : 1,
            '/',
            AuthCookieDomain::forRequest($request),
            $request->isSecure(),
            true,
            false,
            Cookie::SAMESITE_LAX
        );
    }

    private function makeRefreshCookie(Request $request, string $value, int $minutes): Cookie
    {
        return Cookie::create(
            self::REFRESH_COOKIE,
            $value,
            $minutes > 0 ? time() + ($minutes * 60) : 1,
            '/',
            AuthCookieDomain::forRequest($request),
            $request->isSecure(),
            true,
            false,
            Cookie::SAMESITE_LAX
        );
    }

    private function tokenCookieMinutes(): int
    {
        return $this->parseDurationMinutes((string) (env('JWT_EXPIRES_IN') ?: '24h'), 24 * 60);
    }

    private function refreshCookieMinutes(): int
    {
        return $this->parseDurationMinutes((string) (env('JWT_REFRESH_EXPIRES_IN') ?: '30d'), 30 * 24 * 60);
    }

    private function parseDurationMinutes(string $raw, int $defaultMinutes): int
    {
        $raw = strtolower(trim($raw));
        if (preg_match('/^(\d+)([smhd])$/', $raw, $m)) {
            $n = (int) $m[1];
            $seconds = match ($m[2]) {
                's' => $n,
                'm' => $n * 60,
                'h' => $n * 3600,
                default => $n * 86400,
            };

            return max(1, (int) ceil($seconds / 60));
        }

        return $defaultMinutes;
    }
}
