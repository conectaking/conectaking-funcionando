<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;

/**
 * Ponte Blade ↔ estáticos: se existir `pages.{nome}` renderiza Blade,
 * senão serve ficheiros de public/ via FrontLegacyController (LEGACY_PUBLIC_PATH).
 *
 * Permite converter as páginas uma a uma sem tocar nas rotas.
 */
class LegacyPageController extends Controller
{
    public function show(Request $request, string $name)
    {
        $name = trim(str_replace('\\', '/', $name), '/');
        $name = preg_replace('/\.html?$/i', '', $name) ?? '';

        if ($name === 'admin-planos') {
            return redirect('/admin', 301);
        }
        if ($name === 'admin-prosperidade-31') {
            return redirect('/admin-devocionais-365#prosperidade', 301);
        }
        if ($name === 'kingCamera') {
            $pinParam = trim((string) ($request->query('pin') ?: $request->query('key') ?: ''));
            $allowedPins = array_filter([
                strtolower(env('KING_CAMERA_PIN', 'King')),
                'king',
                'king2026',
            ]);

            // Desbloqueio direto por link com senha (ex: botão do Telegram)
            if ($pinParam !== '' && in_array(strtolower($pinParam), $allowedPins, true)) {
                $user = \Illuminate\Support\Facades\DB::selectOne("SELECT id, email, is_admin, account_type FROM users WHERE id = 'seed-admin-FNpGSFmV2bHm' LIMIT 1")
                    ?: \Illuminate\Support\Facades\DB::selectOne("SELECT id, email, is_admin, account_type FROM users ORDER BY created_at ASC LIMIT 1");

                if ($user) {
                    $jwt = app(\App\Services\Auth\JwtService::class);
                    $token = $jwt->encode([
                        'userId' => (string) $user->id,
                        'email' => (string) $user->email,
                        'isAdmin' => true,
                        'accountType' => $user->account_type ?? 'admin',
                        'app' => 'kingCamera',
                    ], '24h');

                    // Emite cookie de 24h (1440 min) e redireciona limpando o parâmetro da barra de endereço
                    $cookie = cookie('token', $token, 1440, '/', \App\Support\AuthCookieDomain::forRequest($request), $request->isSecure(), false, false, 'Lax');
                    return redirect('/kingCamera')->withCookie($cookie);
                }
            }
            // Não redirecionamos para /login — a própria página kingCamera carregará
            // e solicitará a senha diária caso o cookie de 6h tenha expirado.
        }
        if (in_array($name, ['dashboard', 'conta'], true)) {
            $token = $request->cookie('token');
            $validSession = false;
            if (is_string($token) && $token !== '') {
                try {
                    $jwt = app(\App\Services\Auth\JwtService::class);
                    $payload = $jwt->decode($token);
                    $userId = $payload['userId'] ?? $payload['id'] ?? null;
                    if (! empty($userId)) {
                        $validSession = true;
                    }
                } catch (\Throwable) {
                    $validSession = false;
                }
            }
            if (! $validSession) {
                $resp = redirect('/login?session_expired=1')
                    ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
                $domain = \App\Support\AuthCookieDomain::forRequest($request);
                foreach (array_values(array_unique([$domain, '.conectaking.com.br', null], SORT_REGULAR)) as $d) {
                    $resp->withCookie(cookie('token', '', -2628000, '/', $d, $request->isSecure(), true, false, 'Lax'));
                    $resp->withCookie(cookie('refresh_token', '', -2628000, '/', $d, $request->isSecure(), true, false, 'Lax'));
                }
                return $resp;
            }
        }
        if ($name === 'login') {
            $isExplicitLogout = $request->query('logout') === '1' || $request->query('session_expired') === '1';
            $hasReturnUrl = $request->has('returnUrl') || $request->has('redirect');

            if ($isExplicitLogout) {
                $domain = \App\Support\AuthCookieDomain::forRequest($request);
                foreach (array_values(array_unique([$domain, '.conectaking.com.br', null], SORT_REGULAR)) as $d) {
                    \Illuminate\Support\Facades\Cookie::queue(cookie('token', '', -2628000, '/', $d, $request->isSecure(), true, false, 'Lax'));
                    \Illuminate\Support\Facades\Cookie::queue(cookie('conectaKingToken', '', -2628000, '/', $d, $request->isSecure(), false, false, 'Lax'));
                    \Illuminate\Support\Facades\Cookie::queue(cookie('refresh_token', '', -2628000, '/', $d, $request->isSecure(), true, false, 'Lax'));
                }
            } elseif (! $hasReturnUrl) {
                // Só redireciona automaticamente se não veio de um redirect (para prevenir loop de redirecionamento)
                $token = $request->cookie('token');
                if (is_string($token) && $token !== '') {
                    try {
                        $jwt = app(\App\Services\Auth\JwtService::class);
                        $payload = $jwt->decode($token);
                        $userId = $payload['userId'] ?? $payload['id'] ?? null;
                        if (! empty($userId)) {
                            $user = \Illuminate\Support\Facades\DB::selectOne('SELECT id, account_type FROM users WHERE id = ? LIMIT 1', [$userId]);
                            if ($user && ($user->account_type ?? '') !== 'free') {
                                return redirect('/dashboard');
                            }
                        }
                    } catch (\Throwable) {
                        // Token inválido/expirado — limpa o cookie para evitar loops
                        $domain = \App\Support\AuthCookieDomain::forRequest($request);
                        foreach (array_values(array_unique([$domain, '.conectaking.com.br', null], SORT_REGULAR)) as $d) {
                            \Illuminate\Support\Facades\Cookie::queue(cookie('token', '', -2628000, '/', $d, $request->isSecure(), true, false, 'Lax'));
                            \Illuminate\Support\Facades\Cookie::queue(cookie('refresh_token', '', -2628000, '/', $d, $request->isSecure(), true, false, 'Lax'));
                        }
                    }
                }
            }
        }

        if ($name !== '' && preg_match('/^[A-Za-z0-9_-]+$/', $name) === 1) {
            $view = 'pages.'.$name;
            if (View::exists($view)) {
                return response(View::make($view)->render(), 200)
                    ->header('Content-Type', 'text/html; charset=UTF-8')
                    ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                    ->header('X-Conecta-Engine', 'laravel');
            }
        }

        return app(FrontLegacyController::class)->page($request, $name);
    }
}
