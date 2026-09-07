<?php

use App\Http\Controllers\CartaoVirtual\CardPublicController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'conectaking-laravel',
        'module' => 'cartao-virtual',
        'status' => 'ok',
    ]);
});

Route::get('/up', function () {
    return response('ok', 200)->header('Content-Type', 'text/plain');
});

// Prefixo /l é aplicado pelo proxy Node; aqui as rotas são absolutas no container.
Route::get('/l/card/{slug}', [CardPublicController::class, 'show'])
    ->where('slug', '[A-Za-z0-9._-]+');

Route::get('/l/api/card/{slug}', [CardPublicController::class, 'api'])
    ->where('slug', '[A-Za-z0-9._-]+');

// Também aceitar sem /l quando acessado direto no container (health/tests)
Route::get('/card/{slug}', [CardPublicController::class, 'show'])
    ->where('slug', '[A-Za-z0-9._-]+');

Route::get('/api/card/{slug}', [CardPublicController::class, 'api'])
    ->where('slug', '[A-Za-z0-9._-]+');
