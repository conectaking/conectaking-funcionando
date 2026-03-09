<?php

use Illuminate\Support\Facades\Route;
use KingSelection\Http\Controllers\Admin\AdminHomeController;
use KingSelection\Http\Controllers\Admin\GalleryAdminController;
use KingSelection\Http\Controllers\Client\ClientAuthController;
use KingSelection\Http\Controllers\Client\ClientGalleryController;
use KingSelection\Http\Controllers\Media\MediaController;
use KingSelection\Http\Middleware\VerifyConectaJwt;
use KingSelection\Http\Middleware\EnsureClientGallerySession;

Route::get('/', function () {
    return redirect('/admin');
});

// ===== Admin (protegido pelo JWT do Conecta King) =====
Route::middleware([VerifyConectaJwt::class])->group(function () {
    Route::get('/admin', [AdminHomeController::class, 'index']);

    Route::get('/admin/galleries', [GalleryAdminController::class, 'index']);
    Route::get('/admin/galleries/create', [GalleryAdminController::class, 'create']);
    Route::post('/admin/galleries', [GalleryAdminController::class, 'store']);
    Route::get('/admin/galleries/{gallery}', [GalleryAdminController::class, 'show']);
    Route::post('/admin/galleries/{gallery}/status', [GalleryAdminController::class, 'updateStatus']);
});

// ===== Cliente (login por galeria) =====
Route::get('/g/{slug}', [ClientAuthController::class, 'landing']);
Route::post('/g/{slug}/login', [ClientAuthController::class, 'login']);
Route::post('/g/{slug}/logout', [ClientAuthController::class, 'logout']);

Route::middleware([EnsureClientGallerySession::class])->group(function () {
    Route::get('/g/{slug}/gallery', [ClientGalleryController::class, 'gallery']);
    Route::post('/g/{slug}/select', [ClientGalleryController::class, 'toggleSelection']);
    Route::post('/g/{slug}/finalize', [ClientGalleryController::class, 'finalize']);
    Route::get('/g/{slug}/export', [ClientGalleryController::class, 'export']);

    // Preview com watermark (somente após login)
    Route::get('/media/photo/{photo}/preview', [MediaController::class, 'preview']);
});

