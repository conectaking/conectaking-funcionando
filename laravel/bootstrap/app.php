<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Atrás do Caddy; TRUSTED_PROXIES=CSV opcional (default *).
        $trusted = trim((string) (env('TRUSTED_PROXIES') ?: '*'));
        $middleware->trustProxies(at: $trusted === '' ? '*' : $trusted);
        $middleware->prepend(\App\Http\Middleware\RedirectApexToWww::class);
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        $middleware->append(\App\Http\Middleware\RequireCookieCsrf::class);
        $middleware->append(\App\Http\Middleware\EnsureCsrfCookie::class);

        // Bridge ck_csrf ↔ Laravel CSRF (ValidateCsrfToken no Laravel 11+)
        $middleware->web(replace: [
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class => \App\Http\Middleware\VerifyCsrfToken::class,
        ]);

        // Except mínimo: públicos / bootstrap auth / beacons / stubs 410.
        // Mutações KS autenticadas exigem CSRF (ck_csrf via @legacy/js/ck-csrf.js).
        $middleware->validateCsrfTokens(except: [
            'log/*',
            '*/form/*/submit',
            'api/bible/prosperidade/mark-read',
            'api/bible/devotional/mark-read',
            'api/bible/mark-read',
            'api/bible/reset-progress',
            'api/guest-lists/public/register/*',
            'api/guest-lists/public/confirm/*',
            'portaria/*/checkin/*',
            'guest-list/view-full/*/checkin/*',
            'guest-list/confirm/qr/*',
            'guest-list/confirm/cpf',
            'api/king-selection/client/login',
            'api/king-selection/client/login-by-details',
            'api/king-selection/client/register',
            'api/king-selection/client/public-enter',
            'api/king-selection/client/signup-enter',
            'api/king-selection/client/clear-session-cookie',
            'api/king-selection/client/redeem-access',
            'api/king-selection/public/enroll-face-anonymous',
            'api/auth/login',
            'api/auth/refresh',
            'api/auth/logout',
            'api/auth/register',
            'api/auth/sync-session-cookie',
            'api/password/forgot',
            'api/password/reset',
            'api/inquiry/submit',
            // Stubs 410
            'api/payment/create-preference',
            'api/payment/webhook-notification',
            'api/checkout',
            'api/checkout/*',
        ]);
        $middleware->encryptCookies(except: [
            'ks_client_token',
            'token',
            'refresh_token',
            'ck_csrf',
        ]);
        $middleware->alias([
            'jwt' => \App\Http\Middleware\AuthenticateJwt::class,
            'admin' => \App\Http\Middleware\AuthenticateAdmin::class,
            'admin.ip' => \App\Http\Middleware\AdminIpAllowlist::class,
            'audit' => \App\Http\Middleware\AuditMutations::class,
            'ks.client' => \App\Http\Middleware\AuthenticateKsClient::class,
            'module' => \App\Http\Middleware\RequireModule::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        if (class_exists(\Sentry\Laravel\Integration::class)) {
            \Sentry\Laravel\Integration::handles($exceptions);
        }

        // ─── Interceptador de erros de páginas → Telegram do King ────────────
        $exceptions->report(function (\Throwable $e) {
            // Ignorar erros HTTP esperados (404, 401, 403, 422) — só 500+ ou inesperados
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                if ($e->getStatusCode() < 500) {
                    return false;
                }
            }

            try {
                $request = request();
                $errorData = [
                    'timestamp'   => now()->toIso8601String(),
                    'url'         => $request ? $request->fullUrl() : 'N/A',
                    'path'        => $request ? $request->path() : 'N/A',
                    'method'      => $request ? $request->method() : 'N/A',
                    'exception'   => $e::class,
                    'message'     => mb_substr($e->getMessage(), 0, 400),
                    'file'        => mb_substr($e->getFile(), -80),
                    'line'        => $e->getLine(),
                    'user_agent'  => $request ? mb_substr((string) $request->userAgent(), 0, 120) : '',
                    'ip'          => $request ? $request->ip() : '',
                ];

                // Grava no cache de diagnóstico
                \App\Http\Controllers\Admin\SystemDiagnosticsController::recordError($errorData);

                // Envia alerta via OpsAlertService (→ Sentry + webhook Telegram admin)
                app(\App\Services\OpsAlertService::class)->error('page.error_500', [
                    'url'       => $errorData['url'],
                    'exception' => $errorData['exception'],
                    'message'   => $errorData['message'],
                    'file'      => $errorData['file'] . ':' . $errorData['line'],
                ]);
            } catch (\Throwable $inner) {
                // Nunca deixar o reporter quebrar a aplicação
            }

            return false; // Deixa o handler padrão continuar (Sentry, logs, etc.)
        });
        // ─────────────────────────────────────────────────────────────────────

        $exceptions->shouldRenderJsonWhen(fn ($request, \Throwable $e) =>
            $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (\Throwable $e, $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }
            $status = 500;
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                $status = $e->getStatusCode();
            }
            $message = $status >= 500
                ? 'Erro interno do servidor.'
                : ($e->getMessage() !== '' ? $e->getMessage() : 'Requisição inválida.');
            $body = ['success' => false, 'message' => $message];
            if (config('app.debug')) {
                $body['debug'] = ['exception' => $e::class, 'message' => $e->getMessage()];
            }

            return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
        });
    })->create();
