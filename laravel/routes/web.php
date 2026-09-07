<?php

use App\Http\Controllers\CartaoVirtual\AnalyticsLogController;
use App\Http\Controllers\CartaoVirtual\BiblePublicController;
use App\Http\Controllers\CartaoVirtual\CardPublicController;
use App\Http\Controllers\CartaoVirtual\PdfDownloadController;
use App\Http\Controllers\CartaoVirtual\PixQrCodeController;
use App\Http\Controllers\CartaoVirtual\ProfileEditorController;
use App\Http\Controllers\CartaoVirtual\VcardController;
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

$cardSlug = '[A-Za-z0-9._-]+';
$userId = '[A-Za-z0-9_-]+';

// Prefixo /l (proxy Node)
Route::get('/l/card/{slug}', [CardPublicController::class, 'show'])->where('slug', $cardSlug);
Route::get('/l/api/card/{slug}', [CardPublicController::class, 'api'])->where('slug', $cardSlug);
Route::get('/l/api/pix/qrcode/{itemId}', [PixQrCodeController::class, 'show'])->where('itemId', '[0-9]+');
Route::get('/l/api/bible/verse-of-day', [BiblePublicController::class, 'verseOfDay']);
Route::post('/l/log/view/{userId}', [AnalyticsLogController::class, 'view'])->where('userId', $userId);
Route::post('/l/log/click/item/{itemId}', [AnalyticsLogController::class, 'clickItem'])->where('itemId', '[0-9]+');
Route::post('/l/log/vcard/{userId}', [AnalyticsLogController::class, 'vcard'])->where('userId', $userId);
Route::get('/l/vcard/{identifier}', [VcardController::class, 'show'])->where('identifier', $cardSlug);
Route::get('/l/download/pdf/{itemId}', [PdfDownloadController::class, 'show'])->where('itemId', '[0-9]+');
Route::get('/l/api/profile', [ProfileEditorController::class, 'show'])->middleware('jwt');

// Paths públicos / editor (proxy Node encaminha o path original)
Route::get('/card/{slug}', [CardPublicController::class, 'show'])->where('slug', $cardSlug);
Route::get('/api/card/{slug}', [CardPublicController::class, 'api'])->where('slug', $cardSlug);
Route::get('/api/pix/qrcode/{itemId}', [PixQrCodeController::class, 'show'])->where('itemId', '[0-9]+');
Route::get('/api/bible/verse-of-day', [BiblePublicController::class, 'verseOfDay']);
Route::post('/log/view/{userId}', [AnalyticsLogController::class, 'view'])->where('userId', $userId);
Route::post('/log/click/item/{itemId}', [AnalyticsLogController::class, 'clickItem'])->where('itemId', '[0-9]+');
Route::post('/log/vcard/{userId}', [AnalyticsLogController::class, 'vcard'])->where('userId', $userId);
Route::get('/vcard/{identifier}', [VcardController::class, 'show'])->where('identifier', $cardSlug);
Route::get('/download/pdf/{itemId}', [PdfDownloadController::class, 'show'])->where('itemId', '[0-9]+');
Route::get('/api/profile', [ProfileEditorController::class, 'show'])->middleware('jwt');
