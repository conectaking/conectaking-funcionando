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

        // Bridge ck_csrf ↔ Laravel CSRF (VerifyCsrfToken custom)
        $middleware->web(replace: [
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class => \App\Http\Middleware\VerifyCsrfToken::class,
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
            'ck_csrf',
        ]);
        $middleware->alias([
            'jwt' => \App\Http\Middleware\AuthenticateJwt::class,
            'admin' => \App\Http\Middleware\AuthenticateAdmin::class,
            'ks.client' => \App\Http\Middleware\AuthenticateKsClient::class,
            'module' => \App\Http\Middleware\RequireModule::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
