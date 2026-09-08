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
        // Atrás do Caddy/Node (proxy /l)
        $middleware->trustProxies(at: '*');
        // sendBeacon do cartão público (sem CSRF token)
        $middleware->validateCsrfTokens(except: [
            'log/*',
            'l/log/*',
            'api/profile',
            'api/profile/*',
            'l/api/profile',
            'l/api/profile/*',
            'api/upload',
            'api/upload/*',
            'l/api/upload',
            'l/api/upload/*',
            '*/form/*/submit',
            'l/*/form/*/submit',
            'api/bible/prosperidade/mark-read',
            'l/api/bible/prosperidade/mark-read',
            'api/bible/devotional/mark-read',
            'l/api/bible/devotional/mark-read',
            'api/bible/mark-read',
            'l/api/bible/mark-read',
            'api/bible/reset-progress',
            'l/api/bible/reset-progress',
            'api/guest-lists/public/register/*',
            'l/api/guest-lists/public/register/*',
            'api/guest-lists/public/confirm/*',
            'l/api/guest-lists/public/confirm/*',
        ]);
        $middleware->alias([
            'jwt' => \App\Http\Middleware\AuthenticateJwt::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
