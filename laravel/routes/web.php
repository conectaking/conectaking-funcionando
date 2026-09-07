<?php

use App\Http\Controllers\CartaoVirtual\AnalyticsLogController;
use App\Http\Controllers\CartaoVirtual\BiblePublicController;
use App\Http\Controllers\CartaoVirtual\CardPublicController;
use App\Http\Controllers\CartaoVirtual\PdfDownloadController;
use App\Http\Controllers\CartaoVirtual\PixQrCodeController;
use App\Http\Controllers\CartaoVirtual\ProfileEditorController;
use App\Http\Controllers\CartaoVirtual\ProfileFormExtrasController;
use App\Http\Controllers\CartaoVirtual\ProfileItemsController;
use App\Http\Controllers\CartaoVirtual\ProfileTypedItemsController;
use App\Http\Controllers\CartaoVirtual\SatellitePublicController;
use App\Http\Controllers\CartaoVirtual\UploadController;
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
Route::get('/l/api/bible/books', [BiblePublicController::class, 'books']);
Route::get('/l/api/bible/book/{bookId}/{chapter}', [BiblePublicController::class, 'bookChapter'])
    ->where(['bookId' => '[A-Za-z0-9_-]+', 'chapter' => '[0-9]+']);
Route::get('/l/api/bible/study/books', [BiblePublicController::class, 'studyBooks']);
Route::get('/l/api/bible/study/book/{bookId}', [BiblePublicController::class, 'studyBook'])
    ->where('bookId', '[A-Za-z0-9_-]+');
Route::get('/l/api/bible/devocional-do-dia', [BiblePublicController::class, 'devocionalDoDia']);
Route::get('/l/api/bible/devotionals-365/{day}', [BiblePublicController::class, 'devotionals365'])
    ->where('day', '[0-9]+');
Route::get('/l/api/bible/reading-plan/day/{day}', [BiblePublicController::class, 'readingPlanDay'])
    ->where('day', '[0-9]+');
Route::post('/l/log/view/{userId}', [AnalyticsLogController::class, 'view'])->where('userId', $userId);
Route::post('/l/log/click/item/{itemId}', [AnalyticsLogController::class, 'clickItem'])->where('itemId', '[0-9]+');
Route::post('/l/log/vcard/{userId}', [AnalyticsLogController::class, 'vcard'])->where('userId', $userId);
Route::get('/l/vcard/{identifier}', [VcardController::class, 'show'])->where('identifier', $cardSlug);
Route::get('/l/download/pdf/{itemId}', [PdfDownloadController::class, 'show'])->where('itemId', '[0-9]+');
Route::get('/l/api/profile', [ProfileEditorController::class, 'show'])->middleware('jwt');
Route::put('/l/api/profile/save-all', [ProfileEditorController::class, 'saveAll'])->middleware('jwt');
Route::get('/l/api/profile/import-form-info', [ProfileFormExtrasController::class, 'importFormInfo']);
Route::get('/api/profile/import-form-info', [ProfileFormExtrasController::class, 'importFormInfo']);

Route::middleware('jwt')->group(function () {
    Route::put('/l/api/profile/avatar-format', [ProfileEditorController::class, 'avatarFormat']);
    Route::put('/l/api/profile/share-image', [ProfileEditorController::class, 'shareImage']);
    Route::post('/l/api/profile/import-form', [ProfileFormExtrasController::class, 'importForm']);
    Route::get('/l/api/profile/items', [ProfileItemsController::class, 'index']);
    Route::post('/l/api/profile/items', [ProfileItemsController::class, 'store']);
    Route::post('/l/api/profile/items/repair-sales-pages', [ProfileFormExtrasController::class, 'repairSalesPages']);
    Route::put('/l/api/profile/items/banner/{id}', [ProfileTypedItemsController::class, 'updateBanner'])->where('id', '[0-9]+');
    Route::put('/l/api/profile/items/link/{id}', [ProfileTypedItemsController::class, 'updateLink'])->where('id', '[0-9]+');
    Route::put('/l/api/profile/items/carousel/{id}', [ProfileTypedItemsController::class, 'updateCarousel'])->where('id', '[0-9]+');
    Route::put('/l/api/profile/items/pix/{id}', [ProfileTypedItemsController::class, 'updatePix'])->where('id', '[0-9]+');
    Route::put('/l/api/profile/items/pdf/{id}', [ProfileTypedItemsController::class, 'updatePdf'])->where('id', '[0-9]+');
    Route::put('/l/api/profile/items/digital_form/{id}', [ProfileTypedItemsController::class, 'updateDigitalForm'])->where('id', '[0-9]+');
    Route::get('/l/api/profile/items/digital_form/{id}/responses', [ProfileFormExtrasController::class, 'listResponses'])->where('id', '[0-9]+');
    Route::post('/l/api/profile/items/digital_form/{id}/responses/delete-bulk', [ProfileFormExtrasController::class, 'deleteResponsesBulk'])->where('id', '[0-9]+');
    Route::delete('/l/api/profile/items/digital_form/{id}/responses/{responseId}', [ProfileFormExtrasController::class, 'deleteResponse'])->where(['id' => '[0-9]+', 'responseId' => '[0-9]+']);
    Route::get('/l/api/profile/items/digital_form/{id}/dashboard', [ProfileFormExtrasController::class, 'dashboard'])->where('id', '[0-9]+');
    Route::post('/l/api/profile/items/digital_form/{id}/create-import-link', [ProfileFormExtrasController::class, 'createImportLink'])->where('id', '[0-9]+');
    Route::post('/l/api/profile/items/{id}/duplicate', [ProfileTypedItemsController::class, 'duplicate'])->where('id', '[0-9]+');
    Route::get('/l/api/profile/items/{id}', [ProfileItemsController::class, 'show'])->where('id', '[0-9]+');
    Route::put('/l/api/profile/items/{id}', [ProfileItemsController::class, 'update'])->where('id', '[0-9]+');
    Route::patch('/l/api/profile/items/{id}', [ProfileItemsController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/l/api/profile/items/{id}', [ProfileItemsController::class, 'destroy'])->where('id', '[0-9]+');
});

// Paths públicos / editor (proxy Node encaminha o path original)
Route::get('/card/{slug}', [CardPublicController::class, 'show'])->where('slug', $cardSlug);
Route::get('/api/card/{slug}', [CardPublicController::class, 'api'])->where('slug', $cardSlug);
Route::get('/api/pix/qrcode/{itemId}', [PixQrCodeController::class, 'show'])->where('itemId', '[0-9]+');
Route::get('/api/bible/verse-of-day', [BiblePublicController::class, 'verseOfDay']);
Route::get('/api/bible/books', [BiblePublicController::class, 'books']);
Route::get('/api/bible/book/{bookId}/{chapter}', [BiblePublicController::class, 'bookChapter'])
    ->where(['bookId' => '[A-Za-z0-9_-]+', 'chapter' => '[0-9]+']);
Route::get('/api/bible/study/books', [BiblePublicController::class, 'studyBooks']);
Route::get('/api/bible/study/book/{bookId}', [BiblePublicController::class, 'studyBook'])
    ->where('bookId', '[A-Za-z0-9_-]+');
Route::get('/api/bible/devocional-do-dia', [BiblePublicController::class, 'devocionalDoDia']);
Route::get('/api/bible/devotionals-365/{day}', [BiblePublicController::class, 'devotionals365'])
    ->where('day', '[0-9]+');
Route::get('/api/bible/reading-plan/day/{day}', [BiblePublicController::class, 'readingPlanDay'])
    ->where('day', '[0-9]+');
Route::post('/log/view/{userId}', [AnalyticsLogController::class, 'view'])->where('userId', $userId);
Route::post('/log/click/item/{itemId}', [AnalyticsLogController::class, 'clickItem'])->where('itemId', '[0-9]+');
Route::post('/log/vcard/{userId}', [AnalyticsLogController::class, 'vcard'])->where('userId', $userId);
Route::get('/vcard/{identifier}', [VcardController::class, 'show'])->where('identifier', $cardSlug);
Route::get('/download/pdf/{itemId}', [PdfDownloadController::class, 'show'])->where('itemId', '[0-9]+');
Route::get('/api/profile', [ProfileEditorController::class, 'show'])->middleware('jwt');
Route::put('/api/profile/save-all', [ProfileEditorController::class, 'saveAll'])->middleware('jwt');
Route::middleware('jwt')->group(function () {
    Route::put('/api/profile/avatar-format', [ProfileEditorController::class, 'avatarFormat']);
    Route::put('/api/profile/share-image', [ProfileEditorController::class, 'shareImage']);
    Route::post('/api/profile/import-form', [ProfileFormExtrasController::class, 'importForm']);
    Route::get('/api/profile/items', [ProfileItemsController::class, 'index']);
    Route::post('/api/profile/items', [ProfileItemsController::class, 'store']);
    Route::post('/api/profile/items/repair-sales-pages', [ProfileFormExtrasController::class, 'repairSalesPages']);
    Route::put('/api/profile/items/banner/{id}', [ProfileTypedItemsController::class, 'updateBanner'])->where('id', '[0-9]+');
    Route::put('/api/profile/items/link/{id}', [ProfileTypedItemsController::class, 'updateLink'])->where('id', '[0-9]+');
    Route::put('/api/profile/items/carousel/{id}', [ProfileTypedItemsController::class, 'updateCarousel'])->where('id', '[0-9]+');
    Route::put('/api/profile/items/pix/{id}', [ProfileTypedItemsController::class, 'updatePix'])->where('id', '[0-9]+');
    Route::put('/api/profile/items/pdf/{id}', [ProfileTypedItemsController::class, 'updatePdf'])->where('id', '[0-9]+');
    Route::put('/api/profile/items/digital_form/{id}', [ProfileTypedItemsController::class, 'updateDigitalForm'])->where('id', '[0-9]+');
    Route::get('/api/profile/items/digital_form/{id}/responses', [ProfileFormExtrasController::class, 'listResponses'])->where('id', '[0-9]+');
    Route::post('/api/profile/items/digital_form/{id}/responses/delete-bulk', [ProfileFormExtrasController::class, 'deleteResponsesBulk'])->where('id', '[0-9]+');
    Route::delete('/api/profile/items/digital_form/{id}/responses/{responseId}', [ProfileFormExtrasController::class, 'deleteResponse'])->where(['id' => '[0-9]+', 'responseId' => '[0-9]+']);
    Route::get('/api/profile/items/digital_form/{id}/dashboard', [ProfileFormExtrasController::class, 'dashboard'])->where('id', '[0-9]+');
    Route::post('/api/profile/items/digital_form/{id}/create-import-link', [ProfileFormExtrasController::class, 'createImportLink'])->where('id', '[0-9]+');
    Route::post('/api/profile/items/{id}/duplicate', [ProfileTypedItemsController::class, 'duplicate'])->where('id', '[0-9]+');
    Route::get('/api/profile/items/{id}', [ProfileItemsController::class, 'show'])->where('id', '[0-9]+');
    Route::put('/api/profile/items/{id}', [ProfileItemsController::class, 'update'])->where('id', '[0-9]+');
    Route::patch('/api/profile/items/{id}', [ProfileItemsController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/api/profile/items/{id}', [ProfileItemsController::class, 'destroy'])->where('id', '[0-9]+');
});

// Uploads (JWT)
Route::middleware('jwt')->group(function () {
    Route::post('/api/upload/auth', [UploadController::class, 'auth']);
    Route::post('/api/upload/receive-one', [UploadController::class, 'receiveOne']);
    Route::post('/api/upload/image', [UploadController::class, 'image']);
    Route::post('/api/upload/images', [UploadController::class, 'images']);
    Route::post('/api/upload/crop', [UploadController::class, 'crop']);
    Route::get('/api/upload/get-url/{imageId}', [UploadController::class, 'getUrl']);
    Route::post('/api/upload/pdf', [UploadController::class, 'pdf']);
    Route::post('/l/api/upload/auth', [UploadController::class, 'auth']);
    Route::post('/l/api/upload/receive-one', [UploadController::class, 'receiveOne']);
    Route::post('/l/api/upload/image', [UploadController::class, 'image']);
    Route::post('/l/api/upload/images', [UploadController::class, 'images']);
    Route::post('/l/api/upload/crop', [UploadController::class, 'crop']);
    Route::get('/l/api/upload/get-url/{imageId}', [UploadController::class, 'getUrl']);
    Route::post('/l/api/upload/pdf', [UploadController::class, 'pdf']);
});

// Satélites públicos (form / bíblia / loja)
Route::get('/form/{slug}', [SatellitePublicController::class, 'formByToken'])->where('slug', $cardSlug);
Route::get('/l/form/{slug}', [SatellitePublicController::class, 'formByToken'])->where('slug', $cardSlug);
Route::get('/{slug}/form/{itemId}', [SatellitePublicController::class, 'formByItem'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
Route::post('/{slug}/form/{itemId}/submit', [SatellitePublicController::class, 'formSubmit'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
Route::get('/l/{slug}/form/{itemId}', [SatellitePublicController::class, 'formByItem'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
Route::post('/l/{slug}/form/{itemId}/submit', [SatellitePublicController::class, 'formSubmit'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
Route::get('/{slug}/biblia', [SatellitePublicController::class, 'bibleHub'])->where('slug', $cardSlug);
Route::get('/l/{slug}/biblia', [SatellitePublicController::class, 'bibleHub'])->where('slug', $cardSlug);
Route::get('/{slug}/biblia/estudos-livro', [SatellitePublicController::class, 'bibleStudyRedirect'])->where('slug', $cardSlug);
Route::get('/l/{slug}/biblia/estudos-livro', [SatellitePublicController::class, 'bibleStudyRedirect'])->where('slug', $cardSlug);
Route::get('/{slug}/biblia/estudos-livro/{bookId}', [SatellitePublicController::class, 'bibleStudy'])
    ->where(['slug' => $cardSlug, 'bookId' => '[A-Za-z0-9_-]+']);
Route::get('/l/{slug}/biblia/estudos-livro/{bookId}', [SatellitePublicController::class, 'bibleStudy'])
    ->where(['slug' => $cardSlug, 'bookId' => '[A-Za-z0-9_-]+']);
Route::get('/{slug}/biblia/devocional/{day?}', [SatellitePublicController::class, 'bibleDevotional'])
    ->where(['slug' => $cardSlug, 'day' => '[0-9]+']);
Route::get('/l/{slug}/biblia/devocional/{day?}', [SatellitePublicController::class, 'bibleDevotional'])
    ->where(['slug' => $cardSlug, 'day' => '[0-9]+']);
Route::get('/{slug}/bible', [SatellitePublicController::class, 'bibleRedirect'])->where('slug', $cardSlug);
Route::get('/l/{slug}/bible', [SatellitePublicController::class, 'bibleRedirect'])->where('slug', $cardSlug);
Route::get('/{slug}/bible/estudo-livro/{bookId}', [SatellitePublicController::class, 'bibleStudyLegacyRedirect'])
    ->where(['slug' => $cardSlug, 'bookId' => '[A-Za-z0-9_-]+']);
Route::get('/{slug}/bible/{bookId}/{chapter}', [SatellitePublicController::class, 'bibleReader'])
    ->where(['slug' => $cardSlug, 'bookId' => '[A-Za-z0-9_-]+', 'chapter' => '[0-9]+']);
Route::get('/l/{slug}/bible/{bookId}/{chapter}', [SatellitePublicController::class, 'bibleReader'])
    ->where(['slug' => $cardSlug, 'bookId' => '[A-Za-z0-9_-]+', 'chapter' => '[0-9]+']);
Route::get('/l/loja/{slug}/{storeSlug}', [SatellitePublicController::class, 'salesStore'])->where(['slug' => $cardSlug, 'storeSlug' => $cardSlug]);
Route::get('/{slug}/{storeSlug}', [SatellitePublicController::class, 'salesStore'])->where(['slug' => $cardSlug, 'storeSlug' => $cardSlug]);