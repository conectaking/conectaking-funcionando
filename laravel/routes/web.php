<?php

use App\Http\Controllers\CartaoVirtual\AnalyticsLogController;
use App\Http\Controllers\CartaoVirtual\BibleAdminBookStudyController;
use App\Http\Controllers\CartaoVirtual\BibleAdminDev365Controller;
use App\Http\Controllers\CartaoVirtual\BibleProsperidadeAdminController;
use App\Http\Controllers\CartaoVirtual\BibleProgressController;
use App\Http\Controllers\CartaoVirtual\BiblePublicController;
use App\Http\Controllers\CartaoVirtual\CardPublicController;
use App\Http\Controllers\CartaoVirtual\GuestListCustomizeController;
use App\Http\Controllers\CartaoVirtual\GuestListAdminController;
use App\Http\Controllers\CartaoVirtual\GuestListPublicController;
use App\Http\Controllers\CartaoVirtual\PdfDownloadController;
use App\Http\Controllers\CartaoVirtual\PixQrCodeController;
use App\Http\Controllers\CartaoVirtual\ProfileEditorController;
use App\Http\Controllers\CartaoVirtual\ProfileFormExtrasController;
use App\Http\Controllers\CartaoVirtual\ProfileItemsController;
use App\Http\Controllers\CartaoVirtual\ProfileTypedItemsController;
use App\Http\Controllers\CartaoVirtual\KingSelectionPublicController;
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

Route::get('/health', [\App\Http\Controllers\FrontLegacyController::class, 'health']);
Route::get('/api/public-api-url', [\App\Http\Controllers\FrontLegacyController::class, 'publicApiUrl']);
Route::get('/l/api/public-api-url', [\App\Http\Controllers\FrontLegacyController::class, 'publicApiUrl']);
Route::get('/api-config.js', [\App\Http\Controllers\FrontLegacyController::class, 'apiConfigJs']);
Route::get('/l/api-config.js', [\App\Http\Controllers\FrontLegacyController::class, 'apiConfigJs']);
Route::get('/api/health', [\App\Http\Controllers\FrontLegacyController::class, 'health']);

Route::post('/api/password/forgot', [\App\Http\Controllers\Auth\PasswordController::class, 'forgot'])
    ->middleware('throttle:10,1');
Route::post('/l/api/password/forgot', [\App\Http\Controllers\Auth\PasswordController::class, 'forgot'])
    ->middleware('throttle:10,1');
Route::post('/api/password/reset', [\App\Http\Controllers\Auth\PasswordController::class, 'reset'])
    ->middleware('throttle:10,1');
Route::post('/l/api/password/reset', [\App\Http\Controllers\Auth\PasswordController::class, 'reset'])
    ->middleware('throttle:10,1');

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
Route::get('/l/api/bible/salmo-do-dia', [BiblePublicController::class, 'salmoDoDia']);
Route::get('/l/api/bible/devocional-biblia-inteira', [BiblePublicController::class, 'devocionalBibliaInteira']);
Route::get('/l/api/bible/devotionals-365/{day}', [BiblePublicController::class, 'devotionals365'])
    ->where('day', '[0-9]+');
Route::get('/l/api/bible/reading-plan/day/{day}', [BiblePublicController::class, 'readingPlanDay'])
    ->where('day', '[0-9]+');
Route::get('/l/api/bible/prosperidade/ativacao/{n}', [BiblePublicController::class, 'prosperidadeAtivacao'])
    ->where('n', '[0-9]+');
Route::get('/l/api/bible/prosperidade/hoje', [BiblePublicController::class, 'prosperidadeHoje']);
Route::get('/l/api/bible/prosperidade/list', [BiblePublicController::class, 'prosperidadeList']);
Route::get('/l/api/bible/prosperidade/nearest-published/{n}', [BiblePublicController::class, 'prosperidadeNearest'])
    ->where('n', '[0-9]+');
Route::post('/l/api/bible/prosperidade/mark-read', [BiblePublicController::class, 'prosperidadeMarkRead']);
Route::get('/l/api/bible/prosperidade/read-status', [BiblePublicController::class, 'prosperidadeReadStatus']);
Route::post('/l/api/bible/devotional/mark-read', [BiblePublicController::class, 'devotionalMarkRead']);
Route::get('/l/api/bible/devotional/read-status', [BiblePublicController::class, 'devotionalReadStatus']);
Route::get('/l/api/bible/my-progress', [BibleProgressController::class, 'myProgress'])->middleware('jwt');
Route::post('/l/api/bible/mark-read', [BibleProgressController::class, 'markRead'])->middleware('jwt');
Route::post('/l/api/bible/reset-progress', [BibleProgressController::class, 'reset'])->middleware('jwt');
Route::get('/l/guest-list/register/{token}', [GuestListPublicController::class, 'registerPage'])->where('token', $cardSlug);
Route::post('/l/api/guest-lists/public/register/{token}', [GuestListPublicController::class, 'registerSubmit'])->where('token', $cardSlug);
Route::get('/l/guest-list/confirm/{identifier}', [GuestListPublicController::class, 'confirmPage'])->where('identifier', $cardSlug);
Route::post('/l/api/guest-lists/public/confirm/{token}', [GuestListPublicController::class, 'confirmSubmit'])->where('token', $cardSlug);
Route::get('/l/portaria/{token}', [GuestListPublicController::class, 'portariaPage'])->where('token', $cardSlug);
Route::post('/l/portaria/{token}/checkin/{guestId}', [GuestListPublicController::class, 'portariaCheckin'])
    ->where(['token' => $cardSlug, 'guestId' => '[0-9]+']);
Route::get('/l/guest-list/view-full/{token}', function (string $token) {
    return redirect('/portaria/'.$token, 301)->header('X-Conecta-Engine', 'laravel');
})->where('token', $cardSlug);
Route::get('/l/guest-list/verify/qr/{qrToken}', [GuestListPublicController::class, 'verifyQr'])->where('qrToken', $cardSlug);
Route::post('/l/guest-list/confirm/qr/{qrToken}', [GuestListPublicController::class, 'confirmQr'])->where('qrToken', $cardSlug);
Route::post('/l/guest-list/confirm/cpf', [GuestListPublicController::class, 'confirmBySearch']);
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
Route::get('/api/bible/salmo-do-dia', [BiblePublicController::class, 'salmoDoDia']);
Route::get('/api/bible/devocional-biblia-inteira', [BiblePublicController::class, 'devocionalBibliaInteira']);
Route::get('/api/bible/devotionals-365/{day}', [BiblePublicController::class, 'devotionals365'])
    ->where('day', '[0-9]+');
Route::get('/api/bible/reading-plan/day/{day}', [BiblePublicController::class, 'readingPlanDay'])
    ->where('day', '[0-9]+');
Route::get('/api/bible/prosperidade/ativacao/{n}', [BiblePublicController::class, 'prosperidadeAtivacao'])
    ->where('n', '[0-9]+');
Route::get('/api/bible/prosperidade/hoje', [BiblePublicController::class, 'prosperidadeHoje']);
Route::get('/api/bible/prosperidade/list', [BiblePublicController::class, 'prosperidadeList']);
Route::get('/api/bible/prosperidade/nearest-published/{n}', [BiblePublicController::class, 'prosperidadeNearest'])
    ->where('n', '[0-9]+');
Route::post('/api/bible/prosperidade/mark-read', [BiblePublicController::class, 'prosperidadeMarkRead']);
Route::get('/api/bible/prosperidade/read-status', [BiblePublicController::class, 'prosperidadeReadStatus']);
Route::post('/api/bible/devotional/mark-read', [BiblePublicController::class, 'devotionalMarkRead']);
Route::get('/api/bible/devotional/read-status', [BiblePublicController::class, 'devotionalReadStatus']);
Route::get('/api/bible/my-progress', [BibleProgressController::class, 'myProgress'])->middleware('jwt');
Route::post('/api/bible/mark-read', [BibleProgressController::class, 'markRead'])->middleware('jwt');
Route::post('/api/bible/reset-progress', [BibleProgressController::class, 'reset'])->middleware('jwt');
Route::get('/guest-list/register/{token}', [GuestListPublicController::class, 'registerPage'])->where('token', $cardSlug);
Route::post('/api/guest-lists/public/register/{token}', [GuestListPublicController::class, 'registerSubmit'])->where('token', $cardSlug);
Route::get('/guest-list/confirm/{identifier}', [GuestListPublicController::class, 'confirmPage'])->where('identifier', $cardSlug);
Route::post('/api/guest-lists/public/confirm/{token}', [GuestListPublicController::class, 'confirmSubmit'])->where('token', $cardSlug);
Route::get('/portaria/{token}', [GuestListPublicController::class, 'portariaPage'])->where('token', $cardSlug);
Route::post('/portaria/{token}/checkin/{guestId}', [GuestListPublicController::class, 'portariaCheckin'])
    ->where(['token' => $cardSlug, 'guestId' => '[0-9]+']);
Route::get('/guest-list/view-full/{token}', function (string $token) {
    return redirect('/portaria/'.$token, 301)->header('X-Conecta-Engine', 'laravel');
})->where('token', $cardSlug);
Route::post('/guest-list/view-full/{token}/checkin/{guestId}', [GuestListPublicController::class, 'portariaCheckin'])
    ->where(['token' => $cardSlug, 'guestId' => '[0-9]+']);
Route::get('/guest-list/verify/qr/{qrToken}', [GuestListPublicController::class, 'verifyQr'])->where('qrToken', $cardSlug);
Route::post('/guest-list/confirm/qr/{qrToken}', [GuestListPublicController::class, 'confirmQr'])->where('qrToken', $cardSlug);
Route::post('/guest-list/confirm/cpf', [GuestListPublicController::class, 'confirmBySearch']);
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

Route::middleware('admin')->group(function () {
    Route::get('/api/admin/bible/prosperidade', [BibleProsperidadeAdminController::class, 'index']);
    Route::get('/api/admin/bible/prosperidade/export', [BibleProsperidadeAdminController::class, 'export']);
    Route::post('/api/admin/bible/prosperidade/import', [BibleProsperidadeAdminController::class, 'import']);
    Route::get('/api/admin/bible/prosperidade/storytelling-map', [BibleProsperidadeAdminController::class, 'storytellingMap']);
    Route::post('/api/admin/bible/prosperidade/generate-range-ai', [BibleProsperidadeAdminController::class, 'generateRange']);
    Route::get('/api/admin/bible/prosperidade/generation-job/{jobId}', [BibleProsperidadeAdminController::class, 'generationJob']);
    Route::post('/api/admin/bible/prosperidade/generation-job/{jobId}/cancel', [BibleProsperidadeAdminController::class, 'cancelGenerationJob']);
    Route::get('/api/admin/bible/prosperidade/{n}', [BibleProsperidadeAdminController::class, 'show'])->where('n', '[0-9]+');
    Route::put('/api/admin/bible/prosperidade/{n}', [BibleProsperidadeAdminController::class, 'save'])->where('n', '[0-9]+');
    Route::post('/api/admin/bible/prosperidade/{n}/save-activation', [BibleProsperidadeAdminController::class, 'save'])->where('n', '[0-9]+');
    Route::patch('/api/admin/bible/prosperidade/{n}/publish', [BibleProsperidadeAdminController::class, 'publish'])->where('n', '[0-9]+');
    Route::post('/api/admin/bible/prosperidade/{n}/generate-ai', [BibleProsperidadeAdminController::class, 'generateAi'])->where('n', '[0-9]+');
    Route::post('/api/admin/bible/prosperidade/{n}/parse-paste', [BibleProsperidadeAdminController::class, 'parsePaste'])->where('n', '[0-9]+');

    Route::get('/api/admin/bible/devotionals-365/days', [BibleAdminDev365Controller::class, 'days']);
    Route::get('/api/admin/bible/devotionals-365/admin-full', [BibleAdminDev365Controller::class, 'adminFull']);
    Route::get('/api/admin/bible/devotionals-365/day/{day}', [BibleAdminDev365Controller::class, 'showDay'])->where('day', '[0-9]+');
    Route::post('/api/admin/bible/devotionals-365/day/{day}/generate-ai', [BibleAdminDev365Controller::class, 'generateDay'])->where('day', '[0-9]+');
    Route::post('/api/admin/bible/devotionals-365/generate-range-ai', [BibleAdminDev365Controller::class, 'generateRange']);
    Route::post('/api/admin/bible/devotionals-365/generate-month-ai/{year}/{month}', [BibleAdminDev365Controller::class, 'generateMonth'])->where(['year' => '[0-9]+', 'month' => '[0-9]+']);
    Route::post('/api/admin/bible/devotionals-365/generate-calendar-months-async', [BibleAdminDev365Controller::class, 'generateCalendarMonthsAsync']);
    Route::get('/api/admin/bible/devotionals-365/generation-job/{jobId}', [BibleAdminDev365Controller::class, 'generationJob']);
    Route::post('/api/admin/bible/devotionals-365/generation-job/{jobId}/cancel', [BibleAdminDev365Controller::class, 'cancelGenerationJob']);
    Route::get('/api/admin/bible/devotionals-365/month-themes/{year}', [BibleAdminDev365Controller::class, 'monthThemes'])->where('year', '[0-9]+');
    Route::put('/api/admin/bible/devotionals-365/month-themes/{year}', [BibleAdminDev365Controller::class, 'saveMonthThemes'])->where('year', '[0-9]+');
    Route::post('/api/admin/bible/devotionals-365/month-themes/{year}/generate/{month}', [BibleAdminDev365Controller::class, 'generateMonthTheme'])->where(['year' => '[0-9]+', 'month' => '[0-9]+']);
    Route::post('/api/admin/bible/devotionals-365/month-themes/{year}/generate-all', [BibleAdminDev365Controller::class, 'generateAllMonthThemes'])->where('year', '[0-9]+');
    Route::put('/api/admin/bible/devotionals-365/{day}', [BibleAdminDev365Controller::class, 'upsert'])->where('day', '[0-9]+');
    Route::delete('/api/admin/bible/devotionals-365/{day}', [BibleAdminDev365Controller::class, 'destroy'])->where('day', '[0-9]+');

    Route::get('/api/admin/bible/study/books', [BibleAdminBookStudyController::class, 'books']);
    Route::delete('/api/admin/bible/study/book/{bookId}', [BibleAdminBookStudyController::class, 'destroy'])->where('bookId', '[A-Za-z0-9_-]+');
    Route::post('/api/admin/bible/study/book/{bookId}/upload', [BibleAdminBookStudyController::class, 'upload'])->where('bookId', '[A-Za-z0-9_-]+');
    Route::post('/api/admin/bible/study/book/{bookId}/generate-ai', [BibleAdminBookStudyController::class, 'generateAi'])->where('bookId', '[A-Za-z0-9_-]+');
    Route::post('/api/admin/bible/study/generate-ai-async', [BibleAdminBookStudyController::class, 'generateAiAsync']);
    Route::get('/api/admin/bible/study/generation-job/{jobId}', [BibleAdminBookStudyController::class, 'generationJob']);
    Route::post('/api/admin/bible/study/generation-job/{jobId}/cancel', [BibleAdminBookStudyController::class, 'cancelGenerationJob']);

    Route::get('/l/api/admin/bible/prosperidade', [BibleProsperidadeAdminController::class, 'index']);
    Route::get('/l/api/admin/bible/prosperidade/export', [BibleProsperidadeAdminController::class, 'export']);
    Route::post('/l/api/admin/bible/prosperidade/import', [BibleProsperidadeAdminController::class, 'import']);
    Route::get('/l/api/admin/bible/prosperidade/storytelling-map', [BibleProsperidadeAdminController::class, 'storytellingMap']);
    Route::post('/l/api/admin/bible/prosperidade/generate-range-ai', [BibleProsperidadeAdminController::class, 'generateRange']);
    Route::get('/l/api/admin/bible/prosperidade/generation-job/{jobId}', [BibleProsperidadeAdminController::class, 'generationJob']);
    Route::post('/l/api/admin/bible/prosperidade/generation-job/{jobId}/cancel', [BibleProsperidadeAdminController::class, 'cancelGenerationJob']);
    Route::get('/l/api/admin/bible/prosperidade/{n}', [BibleProsperidadeAdminController::class, 'show'])->where('n', '[0-9]+');
    Route::put('/l/api/admin/bible/prosperidade/{n}', [BibleProsperidadeAdminController::class, 'save'])->where('n', '[0-9]+');
    Route::post('/l/api/admin/bible/prosperidade/{n}/save-activation', [BibleProsperidadeAdminController::class, 'save'])->where('n', '[0-9]+');
    Route::patch('/l/api/admin/bible/prosperidade/{n}/publish', [BibleProsperidadeAdminController::class, 'publish'])->where('n', '[0-9]+');
    Route::post('/l/api/admin/bible/prosperidade/{n}/generate-ai', [BibleProsperidadeAdminController::class, 'generateAi'])->where('n', '[0-9]+');
    Route::post('/l/api/admin/bible/prosperidade/{n}/parse-paste', [BibleProsperidadeAdminController::class, 'parsePaste'])->where('n', '[0-9]+');

    Route::get('/l/api/admin/bible/devotionals-365/days', [BibleAdminDev365Controller::class, 'days']);
    Route::get('/l/api/admin/bible/devotionals-365/admin-full', [BibleAdminDev365Controller::class, 'adminFull']);
    Route::get('/l/api/admin/bible/devotionals-365/day/{day}', [BibleAdminDev365Controller::class, 'showDay'])->where('day', '[0-9]+');
    Route::post('/l/api/admin/bible/devotionals-365/day/{day}/generate-ai', [BibleAdminDev365Controller::class, 'generateDay'])->where('day', '[0-9]+');
    Route::post('/l/api/admin/bible/devotionals-365/generate-range-ai', [BibleAdminDev365Controller::class, 'generateRange']);
    Route::post('/l/api/admin/bible/devotionals-365/generate-month-ai/{year}/{month}', [BibleAdminDev365Controller::class, 'generateMonth'])->where(['year' => '[0-9]+', 'month' => '[0-9]+']);
    Route::post('/l/api/admin/bible/devotionals-365/generate-calendar-months-async', [BibleAdminDev365Controller::class, 'generateCalendarMonthsAsync']);
    Route::get('/l/api/admin/bible/devotionals-365/generation-job/{jobId}', [BibleAdminDev365Controller::class, 'generationJob']);
    Route::post('/l/api/admin/bible/devotionals-365/generation-job/{jobId}/cancel', [BibleAdminDev365Controller::class, 'cancelGenerationJob']);
    Route::get('/l/api/admin/bible/devotionals-365/month-themes/{year}', [BibleAdminDev365Controller::class, 'monthThemes'])->where('year', '[0-9]+');
    Route::put('/l/api/admin/bible/devotionals-365/month-themes/{year}', [BibleAdminDev365Controller::class, 'saveMonthThemes'])->where('year', '[0-9]+');
    Route::post('/l/api/admin/bible/devotionals-365/month-themes/{year}/generate/{month}', [BibleAdminDev365Controller::class, 'generateMonthTheme'])->where(['year' => '[0-9]+', 'month' => '[0-9]+']);
    Route::post('/l/api/admin/bible/devotionals-365/month-themes/{year}/generate-all', [BibleAdminDev365Controller::class, 'generateAllMonthThemes'])->where('year', '[0-9]+');
    Route::put('/l/api/admin/bible/devotionals-365/{day}', [BibleAdminDev365Controller::class, 'upsert'])->where('day', '[0-9]+');
    Route::delete('/l/api/admin/bible/devotionals-365/{day}', [BibleAdminDev365Controller::class, 'destroy'])->where('day', '[0-9]+');

    Route::get('/l/api/admin/bible/study/books', [BibleAdminBookStudyController::class, 'books']);
    Route::delete('/l/api/admin/bible/study/book/{bookId}', [BibleAdminBookStudyController::class, 'destroy'])->where('bookId', '[A-Za-z0-9_-]+');
    Route::post('/l/api/admin/bible/study/book/{bookId}/upload', [BibleAdminBookStudyController::class, 'upload'])->where('bookId', '[A-Za-z0-9_-]+');
    Route::post('/l/api/admin/bible/study/book/{bookId}/generate-ai', [BibleAdminBookStudyController::class, 'generateAi'])->where('bookId', '[A-Za-z0-9_-]+');
    Route::post('/l/api/admin/bible/study/generate-ai-async', [BibleAdminBookStudyController::class, 'generateAiAsync']);
    Route::get('/l/api/admin/bible/study/generation-job/{jobId}', [BibleAdminBookStudyController::class, 'generationJob']);
    Route::post('/l/api/admin/bible/study/generation-job/{jobId}/cancel', [BibleAdminBookStudyController::class, 'cancelGenerationJob']);
});

Route::middleware('jwt')->group(function () {
    Route::get('/api/guest-lists', [GuestListAdminController::class, 'index']);
    Route::get('/l/api/guest-lists', [GuestListAdminController::class, 'index']);
    Route::post('/api/guest-lists', [GuestListAdminController::class, 'store']);
    Route::post('/l/api/guest-lists', [GuestListAdminController::class, 'store']);

    Route::get('/api/guest-lists/{id}/guests', [GuestListAdminController::class, 'guests'])->where('id', '[0-9]+');
    Route::get('/l/api/guest-lists/{id}/guests', [GuestListAdminController::class, 'guests'])->where('id', '[0-9]+');
    Route::post('/api/guest-lists/{id}/guests', [GuestListAdminController::class, 'storeGuest'])->where('id', '[0-9]+');
    Route::post('/l/api/guest-lists/{id}/guests', [GuestListAdminController::class, 'storeGuest'])->where('id', '[0-9]+');
    Route::delete('/api/guest-lists/{id}/guests', [GuestListAdminController::class, 'destroyAllGuests'])->where('id', '[0-9]+');
    Route::delete('/l/api/guest-lists/{id}/guests', [GuestListAdminController::class, 'destroyAllGuests'])->where('id', '[0-9]+');
    Route::put('/api/guest-lists/{id}/guests/{guestId}', [GuestListAdminController::class, 'updateGuest'])->where(['id' => '[0-9]+', 'guestId' => '[0-9]+']);
    Route::put('/l/api/guest-lists/{id}/guests/{guestId}', [GuestListAdminController::class, 'updateGuest'])->where(['id' => '[0-9]+', 'guestId' => '[0-9]+']);
    Route::delete('/api/guest-lists/{id}/guests/{guestId}', [GuestListAdminController::class, 'destroyGuest'])->where(['id' => '[0-9]+', 'guestId' => '[0-9]+']);
    Route::delete('/l/api/guest-lists/{id}/guests/{guestId}', [GuestListAdminController::class, 'destroyGuest'])->where(['id' => '[0-9]+', 'guestId' => '[0-9]+']);
    Route::post('/api/guest-lists/{id}/guests/{guestId}/generate-qr', [GuestListAdminController::class, 'generateQr'])->where(['id' => '[0-9]+', 'guestId' => '[0-9]+']);
    Route::post('/l/api/guest-lists/{id}/guests/{guestId}/generate-qr', [GuestListAdminController::class, 'generateQr'])->where(['id' => '[0-9]+', 'guestId' => '[0-9]+']);

    Route::get('/api/guest-lists/{id}/stats', [GuestListAdminController::class, 'stats'])->where('id', '[0-9]+');
    Route::get('/l/api/guest-lists/{id}/stats', [GuestListAdminController::class, 'stats'])->where('id', '[0-9]+');
    Route::get('/api/guest-lists/{id}/export/pdf', [GuestListAdminController::class, 'exportPdf'])->where('id', '[0-9]+');
    Route::get('/l/api/guest-lists/{id}/export/pdf', [GuestListAdminController::class, 'exportPdf'])->where('id', '[0-9]+');
    Route::post('/api/guest-lists/{id}/generate-all-qr-codes', [GuestListAdminController::class, 'generateAllQr'])->where('id', '[0-9]+');
    Route::post('/l/api/guest-lists/{id}/generate-all-qr-codes', [GuestListAdminController::class, 'generateAllQr'])->where('id', '[0-9]+');
    Route::put('/api/guest-lists/{id}/reset-tokens', [GuestListAdminController::class, 'resetTokens'])->where('id', '[0-9]+');
    Route::put('/l/api/guest-lists/{id}/reset-tokens', [GuestListAdminController::class, 'resetTokens'])->where('id', '[0-9]+');

    Route::get('/api/guest-lists/{id}', [GuestListAdminController::class, 'show'])->where('id', '[0-9]+');
    Route::get('/l/api/guest-lists/{id}', [GuestListAdminController::class, 'show'])->where('id', '[0-9]+');
    Route::put('/api/guest-lists/{id}', [GuestListAdminController::class, 'update'])->where('id', '[0-9]+');
    Route::put('/l/api/guest-lists/{id}', [GuestListAdminController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/api/guest-lists/{id}', [GuestListAdminController::class, 'destroy'])->where('id', '[0-9]+');
    Route::delete('/l/api/guest-lists/{id}', [GuestListAdminController::class, 'destroy'])->where('id', '[0-9]+');

    Route::get('/api/guest-lists/{id}/customize-portaria', [GuestListCustomizeController::class, 'showPortaria'])->where('id', '[0-9]+');
    Route::put('/api/guest-lists/{id}/customize-portaria', [GuestListCustomizeController::class, 'savePortaria'])->where('id', '[0-9]+');
    Route::get('/api/guest-lists/{id}/customize-confirmacao', [GuestListCustomizeController::class, 'showConfirmacao'])->where('id', '[0-9]+');
    Route::put('/api/guest-lists/{id}/customize-confirmacao', [GuestListCustomizeController::class, 'saveConfirmacao'])->where('id', '[0-9]+');
    Route::get('/api/guest-lists/{id}/customize-inscricao', [GuestListCustomizeController::class, 'showInscricao'])->where('id', '[0-9]+');
    Route::put('/api/guest-lists/{id}/customize-inscricao', [GuestListCustomizeController::class, 'saveInscricao'])->where('id', '[0-9]+');
    Route::get('/l/api/guest-lists/{id}/customize-portaria', [GuestListCustomizeController::class, 'showPortaria'])->where('id', '[0-9]+');
    Route::put('/l/api/guest-lists/{id}/customize-portaria', [GuestListCustomizeController::class, 'savePortaria'])->where('id', '[0-9]+');
    Route::get('/l/api/guest-lists/{id}/customize-confirmacao', [GuestListCustomizeController::class, 'showConfirmacao'])->where('id', '[0-9]+');
    Route::put('/l/api/guest-lists/{id}/customize-confirmacao', [GuestListCustomizeController::class, 'saveConfirmacao'])->where('id', '[0-9]+');
    Route::get('/l/api/guest-lists/{id}/customize-inscricao', [GuestListCustomizeController::class, 'showInscricao'])->where('id', '[0-9]+');
    Route::put('/l/api/guest-lists/{id}/customize-inscricao', [GuestListCustomizeController::class, 'saveInscricao'])->where('id', '[0-9]+');
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
Route::get('/{slug}/form/{itemId}/success', [SatellitePublicController::class, 'formSuccess'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
Route::get('/l/{slug}/form/{itemId}', [SatellitePublicController::class, 'formByItem'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
Route::post('/l/{slug}/form/{itemId}/submit', [SatellitePublicController::class, 'formSubmit'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
Route::get('/l/{slug}/form/{itemId}/success', [SatellitePublicController::class, 'formSuccess'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
// Página de pagamento do KingForms (antes o res.render('checkout') do Express).
Route::get('/{slug}/form/{itemId}/checkout', [\App\Http\Controllers\Checkout\CheckoutController::class, 'pageHtml'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
Route::get('/l/{slug}/form/{itemId}/checkout', [\App\Http\Controllers\Checkout\CheckoutController::class, 'pageHtml'])->where(['slug' => $cardSlug, 'itemId' => '[0-9]+']);
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
Route::get('/{slug}/biblia/salmo', [SatellitePublicController::class, 'bibleSalmo'])->where('slug', $cardSlug);
Route::get('/l/{slug}/biblia/salmo', [SatellitePublicController::class, 'bibleSalmo'])->where('slug', $cardSlug);
Route::get('/{slug}/biblia/plano/{day?}', [SatellitePublicController::class, 'biblePlan'])
    ->where(['slug' => $cardSlug, 'day' => '[0-9]+']);
Route::get('/l/{slug}/biblia/plano/{day?}', [SatellitePublicController::class, 'biblePlan'])
    ->where(['slug' => $cardSlug, 'day' => '[0-9]+']);
Route::get('/{slug}/biblia/biblia-inteira/{day?}', [SatellitePublicController::class, 'bibleWhole'])
    ->where(['slug' => $cardSlug, 'day' => '[0-9]+']);
Route::get('/l/{slug}/biblia/biblia-inteira/{day?}', [SatellitePublicController::class, 'bibleWhole'])
    ->where(['slug' => $cardSlug, 'day' => '[0-9]+']);
Route::get('/{slug}/biblia/prosperidade/{n?}', [SatellitePublicController::class, 'bibleProsperidade'])
    ->where(['slug' => $cardSlug, 'n' => '[0-9]+']);
Route::get('/l/{slug}/biblia/prosperidade/{n?}', [SatellitePublicController::class, 'bibleProsperidade'])
    ->where(['slug' => $cardSlug, 'n' => '[0-9]+']);
Route::get('/{slug}/bible', [SatellitePublicController::class, 'bibleRedirect'])->where('slug', $cardSlug);
Route::get('/l/{slug}/bible', [SatellitePublicController::class, 'bibleRedirect'])->where('slug', $cardSlug);
Route::get('/{slug}/bible/estudo-livro/{bookId}', [SatellitePublicController::class, 'bibleStudyLegacyRedirect'])
    ->where(['slug' => $cardSlug, 'bookId' => '[A-Za-z0-9_-]+']);
Route::get('/{slug}/bible/{bookId}/{chapter}', [SatellitePublicController::class, 'bibleReader'])
    ->where(['slug' => $cardSlug, 'bookId' => '[A-Za-z0-9_-]+', 'chapter' => '[0-9]+']);
Route::get('/l/{slug}/bible/{bookId}/{chapter}', [SatellitePublicController::class, 'bibleReader'])
    ->where(['slug' => $cardSlug, 'bookId' => '[A-Za-z0-9_-]+', 'chapter' => '[0-9]+']);

// King Selection (read-only público)
Route::get('/kingSelection/{slug}', [KingSelectionPublicController::class, 'show'])->where('slug', $cardSlug);
Route::get('/l/kingSelection/{slug}', [KingSelectionPublicController::class, 'show'])->where('slug', $cardSlug);
Route::get('/api/king-selection/public/gallery', [KingSelectionPublicController::class, 'gallery']);
Route::get('/l/api/king-selection/public/gallery', [KingSelectionPublicController::class, 'gallery']);
Route::get('/api/king-selection/public/gallery-content', [KingSelectionPublicController::class, 'galleryContent']);
Route::get('/l/api/king-selection/public/gallery-content', [KingSelectionPublicController::class, 'galleryContent']);
Route::get('/api/king-selection/public/gallery-share-meta/{slug}', [KingSelectionPublicController::class, 'shareMeta'])
    ->where('slug', $cardSlug);
Route::get('/l/api/king-selection/public/gallery-share-meta/{slug}', [KingSelectionPublicController::class, 'shareMeta'])
    ->where('slug', $cardSlug);
Route::get('/api/king-selection/public/cover', [KingSelectionPublicController::class, 'cover']);
Route::get('/l/api/king-selection/public/cover', [KingSelectionPublicController::class, 'cover']);
Route::get('/api/king-selection/public/entry-splash', [KingSelectionPublicController::class, 'entrySplash']);
Route::get('/l/api/king-selection/public/entry-splash', [KingSelectionPublicController::class, 'entrySplash']);
Route::get('/api/king-selection/public/og-image', [KingSelectionPublicController::class, 'ogImage']);
Route::get('/l/api/king-selection/public/og-image', [KingSelectionPublicController::class, 'ogImage']);
Route::get('/api/king-selection/public/photos/{photoId}/preview', [KingSelectionPublicController::class, 'publicPreview'])
    ->where('photoId', '[0-9]+');
Route::get('/l/api/king-selection/public/photos/{photoId}/preview', [KingSelectionPublicController::class, 'publicPreview'])
    ->where('photoId', '[0-9]+');
Route::get('/api/king-selection/public/galleries/{slug}/my-photos', [KingSelectionPublicController::class, 'myPhotos'])
    ->where('slug', $cardSlug);
Route::get('/l/api/king-selection/public/galleries/{slug}/my-photos', [KingSelectionPublicController::class, 'myPhotos'])
    ->where('slug', $cardSlug);
Route::post('/api/king-selection/public/enroll-face-anonymous', [KingSelectionPublicController::class, 'enrollFaceAnonymous'])
    ->middleware('throttle:20,1');
Route::post('/l/api/king-selection/public/enroll-face-anonymous', [KingSelectionPublicController::class, 'enrollFaceAnonymous'])
    ->middleware('throttle:20,1');
Route::get('/api/king-selection/public/aws-ping', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'awsPing']);
Route::get('/l/api/king-selection/public/aws-ping', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'awsPing']);

Route::post('/api/king-selection/client/login', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'login']);
Route::post('/l/api/king-selection/client/login', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'login']);
Route::post('/api/king-selection/client/login-by-details', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'loginByDetails'])
    ->middleware('throttle:30,1');
Route::post('/l/api/king-selection/client/login-by-details', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'loginByDetails'])
    ->middleware('throttle:30,1');
Route::post('/api/king-selection/client/register', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'register'])
    ->middleware('throttle:20,1');
Route::post('/l/api/king-selection/client/register', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'register'])
    ->middleware('throttle:20,1');
Route::post('/api/king-selection/client/public-enter', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'publicEnter'])
    ->middleware('throttle:30,1');
Route::post('/l/api/king-selection/client/public-enter', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'publicEnter'])
    ->middleware('throttle:30,1');
Route::post('/api/king-selection/client/signup-enter', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'signupEnter'])
    ->middleware('throttle:30,1');
Route::post('/l/api/king-selection/client/signup-enter', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'signupEnter'])
    ->middleware('throttle:30,1');
Route::middleware('ks.client')->group(function () {
    Route::get('/api/king-selection/client/gallery', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'gallery']);
    Route::get('/l/api/king-selection/client/gallery', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'gallery']);
    Route::post('/api/king-selection/client/select', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'select'])
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/client/select', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'select'])
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/client/select-bulk', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'selectBulk'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/client/select-bulk', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'selectBulk'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/client/finalize', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'finalize'])
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/client/finalize', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'finalize'])
        ->middleware('throttle:20,1');
    Route::get('/api/king-selection/client/export', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'export']);
    Route::get('/l/api/king-selection/client/export', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'export']);
    Route::post('/api/king-selection/client/edit-request', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'createEditRequest'])
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/client/edit-request', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'createEditRequest'])
        ->middleware('throttle:20,1');
    Route::get('/api/king-selection/client/edit-requests', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'listEditRequests']);
    Route::get('/l/api/king-selection/client/edit-requests', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'listEditRequests']);
    Route::post('/api/king-selection/client/edit-request/{requestId}/cancel', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'cancelEditRequest'])
        ->where('requestId', '[0-9]+')
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/client/edit-request/{requestId}/cancel', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'cancelEditRequest'])
        ->where('requestId', '[0-9]+')
        ->middleware('throttle:20,1');
    Route::get('/api/king-selection/client/photos/{photoId}/preview', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'preview'])
        ->where('photoId', '[0-9]+');
    Route::get('/l/api/king-selection/client/photos/{photoId}/preview', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'preview'])
        ->where('photoId', '[0-9]+');
    Route::post('/api/king-selection/client/payment-proof', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'paymentProof'])
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/client/payment-proof', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'paymentProof'])
        ->middleware('throttle:20,1');
    Route::post('/api/king-selection/client/promo-verify', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'promoVerify'])
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/client/promo-verify', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'promoVerify'])
        ->middleware('throttle:20,1');
    Route::post('/api/king-selection/client/enroll-face-image', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'enrollFaceImage'])
        ->middleware('throttle:10,1');
    Route::post('/l/api/king-selection/client/enroll-face-image', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'enrollFaceImage'])
        ->middleware('throttle:10,1');
    Route::get('/api/king-selection/client/face-results', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'faceResults']);
    Route::get('/l/api/king-selection/client/face-results', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'faceResults']);
    Route::post('/api/king-selection/client/face-enroll-cache', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'faceEnrollCache'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/client/face-enroll-cache', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'faceEnrollCache'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/client/reset-face-session', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'resetFaceSession'])
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/client/reset-face-session', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'resetFaceSession'])
        ->middleware('throttle:20,1');
    Route::post('/api/king-selection/client/search-face-by-photo', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'searchFaceByPhoto'])
        ->middleware('throttle:10,1');
    Route::post('/l/api/king-selection/client/search-face-by-photo', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'searchFaceByPhoto'])
        ->middleware('throttle:10,1');
    Route::post('/api/king-selection/client/download-zip-plan', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'downloadZipPlan'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/client/download-zip-plan', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'downloadZipPlan'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/client/download-zip', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'downloadZip'])
        ->middleware('throttle:10,1');
    Route::post('/l/api/king-selection/client/download-zip', [\App\Http\Controllers\CartaoVirtual\KingSelectionClientController::class, 'downloadZip'])
        ->middleware('throttle:10,1');
});

Route::middleware('jwt')->group(function () {
    Route::get('/api/account/status', [\App\Http\Controllers\Account\AccountStatusController::class, 'status']);
    Route::get('/l/api/account/status', [\App\Http\Controllers\Account\AccountStatusController::class, 'status']);
    Route::get('/api/account/details', [\App\Http\Controllers\Account\AccountController::class, 'details']);
    Route::get('/l/api/account/details', [\App\Http\Controllers\Account\AccountController::class, 'details']);
    Route::put('/api/account/details', [\App\Http\Controllers\Account\AccountController::class, 'updateDetails']);
    Route::put('/l/api/account/details', [\App\Http\Controllers\Account\AccountController::class, 'updateDetails']);
    Route::put('/api/account/password', [\App\Http\Controllers\Account\AccountController::class, 'changePassword']);
    Route::put('/l/api/account/password', [\App\Http\Controllers\Account\AccountController::class, 'changePassword']);
    Route::post('/api/account/upgrade', [\App\Http\Controllers\Account\AccountController::class, 'upgrade']);
    Route::post('/l/api/account/upgrade', [\App\Http\Controllers\Account\AccountController::class, 'upgrade']);
    Route::get('/api/account/debug-plan/{email}', [\App\Http\Controllers\Account\AccountController::class, 'debugPlan'])
        ->where('email', '[^/]+');
    Route::get('/l/api/account/debug-plan/{email}', [\App\Http\Controllers\Account\AccountController::class, 'debugPlan'])
        ->where('email', '[^/]+');

    Route::get('/api/subscription/info', [\App\Http\Controllers\Account\SubscriptionController::class, 'info']);
    Route::get('/l/api/subscription/info', [\App\Http\Controllers\Account\SubscriptionController::class, 'info']);
    Route::get('/api/subscription/plans', [\App\Http\Controllers\Account\SubscriptionController::class, 'plans']);
    Route::get('/l/api/subscription/plans', [\App\Http\Controllers\Account\SubscriptionController::class, 'plans']);
    Route::put('/api/subscription/plans/{id}', [\App\Http\Controllers\Account\SubscriptionController::class, 'updatePlan'])
        ->where('id', '[0-9]+');
    Route::put('/l/api/subscription/plans/{id}', [\App\Http\Controllers\Account\SubscriptionController::class, 'updatePlan'])
        ->where('id', '[0-9]+');

    Route::get('/api/link-limits/user', [\App\Http\Controllers\Account\LinkLimitsController::class, 'user']);
    Route::get('/l/api/link-limits/user', [\App\Http\Controllers\Account\LinkLimitsController::class, 'user']);
    Route::get('/api/link-limits/check/{moduleType}', [\App\Http\Controllers\Account\LinkLimitsController::class, 'check'])
        ->where('moduleType', '[A-Za-z0-9_]+');
    Route::get('/l/api/link-limits/check/{moduleType}', [\App\Http\Controllers\Account\LinkLimitsController::class, 'check'])
        ->where('moduleType', '[A-Za-z0-9_]+');
    Route::get('/api/link-limits', [\App\Http\Controllers\Account\LinkLimitsController::class, 'index']);
    Route::get('/l/api/link-limits', [\App\Http\Controllers\Account\LinkLimitsController::class, 'index']);
    Route::put('/api/link-limits', [\App\Http\Controllers\Account\LinkLimitsController::class, 'upsert']);
    Route::put('/l/api/link-limits', [\App\Http\Controllers\Account\LinkLimitsController::class, 'upsert']);
    Route::post('/api/link-limits/bulk-update', [\App\Http\Controllers\Account\LinkLimitsController::class, 'bulkUpdate']);
    Route::post('/l/api/link-limits/bulk-update', [\App\Http\Controllers\Account\LinkLimitsController::class, 'bulkUpdate']);
    Route::post('/api/link-limits/reset-plan', [\App\Http\Controllers\Account\LinkLimitsController::class, 'resetPlan']);
    Route::post('/l/api/link-limits/reset-plan', [\App\Http\Controllers\Account\LinkLimitsController::class, 'resetPlan']);
    Route::post('/api/link-limits/copy-plan', [\App\Http\Controllers\Account\LinkLimitsController::class, 'copyPlan']);
    Route::post('/l/api/link-limits/copy-plan', [\App\Http\Controllers\Account\LinkLimitsController::class, 'copyPlan']);
    Route::get('/api/link-limits/stats', [\App\Http\Controllers\Account\LinkLimitsController::class, 'stats']);
    Route::get('/l/api/link-limits/stats', [\App\Http\Controllers\Account\LinkLimitsController::class, 'stats']);

    Route::get('/api/modules/available', [\App\Http\Controllers\Account\ModulesController::class, 'available']);
    Route::get('/l/api/modules/available', [\App\Http\Controllers\Account\ModulesController::class, 'available']);
    Route::get('/api/analytics/kpis', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'kpis']);
    Route::get('/l/api/analytics/kpis', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'kpis']);
    Route::get('/api/analytics/performance', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'performance']);
    Route::get('/l/api/analytics/performance', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'performance']);
    Route::get('/api/analytics/top-items', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'topItems']);
    Route::get('/l/api/analytics/top-items', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'topItems']);
    Route::get('/api/analytics/details', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'details']);
    Route::get('/l/api/analytics/details', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'details']);
    Route::put('/api/business/branding', [\App\Http\Controllers\Business\BrandingController::class, 'update']);
    Route::put('/l/api/business/branding', [\App\Http\Controllers\Business\BrandingController::class, 'update']);
    Route::get('/api/business/team', [\App\Http\Controllers\Business\TeamController::class, 'index']);
    Route::get('/l/api/business/team', [\App\Http\Controllers\Business\TeamController::class, 'index']);

    // Fatia 4b — KS painel fotógrafo (boot: list/create/get/status)
    Route::get('/api/king-selection/galleries', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'index']);
    Route::get('/l/api/king-selection/galleries', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'index']);
    Route::post('/api/king-selection/galleries', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'store'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'store'])
        ->middleware('throttle:30,1');
    Route::get('/api/king-selection/galleries/{id}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'show'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'show'])
        ->where('id', '[0-9]+');
    Route::post('/api/king-selection/galleries/{id}/status', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'status'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/status', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'status'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::delete('/api/king-selection/galleries/{id}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'destroy'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::delete('/l/api/king-selection/galleries/{id}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'destroy'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/photos', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'addPhoto'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:120,1');
    Route::post('/l/api/king-selection/galleries/{id}/photos', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'addPhoto'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:120,1');
    Route::post('/api/king-selection/galleries/{id}/photos/batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'photosBatch'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/photos/batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'photosBatch'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/photos/worker-commit', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'workerCommit'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/photos/worker-commit', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'workerCommit'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/uploads/proxy', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'uploadProxy'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/uploads/proxy', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'uploadProxy'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/uploads/presign-batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'presignBatch'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/uploads/presign-batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'presignBatch'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::get('/api/king-selection/galleries/{id}/watermark-file', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'watermarkFile'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/watermark-file', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'watermarkFile'])
        ->where('id', '[0-9]+');
    Route::put('/api/king-selection/galleries/{id}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'update'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::put('/l/api/king-selection/galleries/{id}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'update'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::get('/api/king-selection/galleries/{id}/folders', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'listFolders'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/folders', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'listFolders'])
        ->where('id', '[0-9]+');
    Route::post('/api/king-selection/galleries/{id}/folders', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'createFolder'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/folders', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'createFolder'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::delete('/api/king-selection/galleries/{id}/folders/{folderId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deleteFolder'])
        ->where(['id' => '[0-9]+', 'folderId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::delete('/l/api/king-selection/galleries/{id}/folders/{folderId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deleteFolder'])
        ->where(['id' => '[0-9]+', 'folderId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/folders/generate', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'generateFolders'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/folders/generate', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'generateFolders'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/folders/reorder', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'reorderFolders'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/folders/reorder', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'reorderFolders'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/photos/assign-folder', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'assignPhotosFolder'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/photos/assign-folder', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'assignPhotosFolder'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/watermark', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'uploadWatermark'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/watermark', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'uploadWatermark'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/thank-you-image', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'uploadThankYouImage'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/thank-you-image', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'uploadThankYouImage'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/open-selection-round', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'openSelectionRound'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/open-selection-round', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'openSelectionRound'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/ai/share-text', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'aiShareText'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/galleries/{id}/ai/share-text', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'aiShareText'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:20,1');
    Route::post('/api/king-selection/galleries/{id}/ai/sales-whatsapp-template', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'aiSalesWhatsappTemplate'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/galleries/{id}/ai/sales-whatsapp-template', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'aiSalesWhatsappTemplate'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:20,1');
    Route::post('/api/king-selection/galleries/{id}/ai/support-default-message', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'aiSupportDefaultMessage'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/galleries/{id}/ai/support-default-message', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'aiSupportDefaultMessage'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:20,1');
    Route::get('/api/king-selection/galleries/{id}/edit-requests', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'listEditRequestsAdmin'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/edit-requests', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'listEditRequestsAdmin'])
        ->where('id', '[0-9]+');
    Route::patch('/api/king-selection/galleries/{id}/edit-requests/{requestId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'updateEditRequest'])
        ->where(['id' => '[0-9]+', 'requestId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::patch('/l/api/king-selection/galleries/{id}/edit-requests/{requestId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'updateEditRequest'])
        ->where(['id' => '[0-9]+', 'requestId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::delete('/api/king-selection/galleries/{id}/edit-requests/{requestId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deleteEditRequest'])
        ->where(['id' => '[0-9]+', 'requestId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::delete('/l/api/king-selection/galleries/{id}/edit-requests/{requestId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deleteEditRequest'])
        ->where(['id' => '[0-9]+', 'requestId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/clients/{clientId}/delete-selection-batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deleteSelectionBatch'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/clients/{clientId}/delete-selection-batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deleteSelectionBatch'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/clients/{clientId}/reactivate-selection-batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'reactivateSelectionBatch'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/clients/{clientId}/reactivate-selection-batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'reactivateSelectionBatch'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/clients/{clientId}/clear-review', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'clearReview'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/clients/{clientId}/clear-review', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'clearReview'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/photos/delete-batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deletePhotosBatch'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/photos/delete-batch', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deletePhotosBatch'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::get('/api/king-selection/galleries/{id}/clients', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'listClients'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/clients', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'listClients'])
        ->where('id', '[0-9]+');
    Route::post('/api/king-selection/galleries/{id}/clients', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'createClient'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/clients', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'createClient'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::put('/api/king-selection/galleries/{id}/clients/{clientId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'updateClient'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::put('/l/api/king-selection/galleries/{id}/clients/{clientId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'updateClient'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::delete('/api/king-selection/galleries/{id}/clients/{clientId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deleteClient'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::delete('/l/api/king-selection/galleries/{id}/clients/{clientId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deleteClient'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/clients/{clientId}/reset-password', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'resetClientPassword'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/clients/{clientId}/reset-password', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'resetClientPassword'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/clients/{clientId}/access-link', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'clientAccessLink'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/clients/{clientId}/access-link', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'clientAccessLink'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::get('/api/king-selection/galleries/{id}/sales-config', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'salesConfig'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/sales-config', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'salesConfig'])
        ->where('id', '[0-9]+');
    Route::put('/api/king-selection/galleries/{id}/sales-config', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'saveSalesConfig'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::put('/l/api/king-selection/galleries/{id}/sales-config', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'saveSalesConfig'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::get('/api/king-selection/galleries/{id}/sales/clients', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'salesClients'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/sales/clients', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'salesClients'])
        ->where('id', '[0-9]+');
    Route::get('/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'salesRound'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+']);
    Route::get('/l/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'salesRound'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+']);
    Route::post('/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}/payment-terms', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'paymentTerms'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}/payment-terms', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'paymentTerms'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}/payment-review', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'paymentReview'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}/payment-review', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'paymentReview'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}/approve-photo', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'approvePhoto'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+'])
        ->middleware('throttle:120,1');
    Route::post('/l/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}/approve-photo', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'approvePhoto'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+'])
        ->middleware('throttle:120,1');
    Route::post('/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}/approve-all', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'approveAll'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/sales/clients/{clientId}/round/{selectionBatch}/approve-all', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'approveAll'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+', 'selectionBatch' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::get('/api/king-selection/galleries/{id}/sales/payment-proof/{paymentId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'paymentProof'])
        ->where(['id' => '[0-9]+', 'paymentId' => '[0-9]+']);
    Route::get('/l/api/king-selection/galleries/{id}/sales/payment-proof/{paymentId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'paymentProof'])
        ->where(['id' => '[0-9]+', 'paymentId' => '[0-9]+']);
    Route::post('/api/king-selection/galleries/{id}/uploads/worker-token', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'workerToken'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/galleries/{id}/uploads/worker-token', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'workerToken'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/galleries/{id}/reset-password', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'resetGalleryPassword'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/reset-password', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'resetGalleryPassword'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::get('/api/king-selection/galleries/{id}/enrolled-faces', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'enrolledFaces'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/enrolled-faces', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'enrolledFaces'])
        ->where('id', '[0-9]+');
    Route::post('/api/king-selection/galleries/{id}/clients/{clientId}/enroll-face', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'enrollFace'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:20,1');
    Route::post('/l/api/king-selection/galleries/{id}/clients/{clientId}/enroll-face', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'enrollFace'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+'])
        ->middleware('throttle:20,1');
    Route::get('/api/king-selection/galleries/{id}/clients/{clientId}/password', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'getClientPassword'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+']);
    Route::get('/l/api/king-selection/galleries/{id}/clients/{clientId}/password', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'getClientPassword'])
        ->where(['id' => '[0-9]+', 'clientId' => '[0-9]+']);
    Route::get('/api/king-selection/galleries/{id}/export', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'exportGallery'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/export', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'exportGallery'])
        ->where('id', '[0-9]+');
    Route::post('/api/king-selection/galleries/{id}/link-cover-upload', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'uploadLinkCover'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/link-cover-upload', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'uploadLinkCover'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::get('/api/king-selection/galleries/{id}/link-cover-preview', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'linkCoverPreview'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/link-cover-preview', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'linkCoverPreview'])
        ->where('id', '[0-9]+');
    Route::post('/api/king-selection/galleries/{id}/photos/{photoId}/edited-upload', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'editedUpload'])
        ->where(['id' => '[0-9]+', 'photoId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/photos/{photoId}/edited-upload', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'editedUpload'])
        ->where(['id' => '[0-9]+', 'photoId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::get('/api/king-selection/galleries/{galleryId}/face-process-status', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'faceProcessStatus'])
        ->where('galleryId', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{galleryId}/face-process-status', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'faceProcessStatus'])
        ->where('galleryId', '[0-9]+');
    Route::get('/api/king-selection/galleries/{galleryId}/face-results', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'faceResultsAdmin'])
        ->where('galleryId', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{galleryId}/face-results', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'faceResultsAdmin'])
        ->where('galleryId', '[0-9]+');
    Route::get('/api/king-selection/galleries/{galleryId}/photos/{photoId}/face-detail', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'faceDetail'])
        ->where(['galleryId' => '[0-9]+', 'photoId' => '[0-9]+']);
    Route::get('/l/api/king-selection/galleries/{galleryId}/photos/{photoId}/face-detail', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'faceDetail'])
        ->where(['galleryId' => '[0-9]+', 'photoId' => '[0-9]+']);
    Route::get('/api/king-selection/galleries/{id}/folders/auto-separate-job', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'autoSeparateJobLatest'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/folders/auto-separate-job', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'autoSeparateJobLatest'])
        ->where('id', '[0-9]+');
    Route::get('/api/king-selection/galleries/{id}/folders/auto-separate-jobs', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'autoSeparateJobsList'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/folders/auto-separate-jobs', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'autoSeparateJobsList'])
        ->where('id', '[0-9]+');
    Route::post('/api/king-selection/galleries/{id}/folders/auto-separate-by-face', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'autoSeparateByFace'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:10,1');
    Route::post('/l/api/king-selection/galleries/{id}/folders/auto-separate-by-face', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'autoSeparateByFace'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:10,1');
    Route::post('/api/king-selection/galleries/{id}/folders/auto-separate-job/{jobId}/cancel', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'cancelAutoSeparateJob'])
        ->where(['id' => '[0-9]+', 'jobId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{id}/folders/auto-separate-job/{jobId}/cancel', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'cancelAutoSeparateJob'])
        ->where(['id' => '[0-9]+', 'jobId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{id}/folders/auto-separate-job/start', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'startAutoSeparateJob'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:5,1');
    Route::post('/l/api/king-selection/galleries/{id}/folders/auto-separate-job/start', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'startAutoSeparateJob'])
        ->where('id', '[0-9]+')
        ->middleware('throttle:5,1');
    Route::post('/api/king-selection/galleries/{galleryId}/photos/{photoId}/process-faces', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'processPhotoFaces'])
        ->where(['galleryId' => '[0-9]+', 'photoId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/galleries/{galleryId}/photos/{photoId}/process-faces', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'processPhotoFaces'])
        ->where(['galleryId' => '[0-9]+', 'photoId' => '[0-9]+'])
        ->middleware('throttle:30,1');
    Route::post('/api/king-selection/galleries/{galleryId}/process-all-faces', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'processAllFaces'])
        ->where('galleryId', '[0-9]+')
        ->middleware('throttle:5,1');
    Route::post('/l/api/king-selection/galleries/{galleryId}/process-all-faces', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'processAllFaces'])
        ->where('galleryId', '[0-9]+')
        ->middleware('throttle:5,1');

    // Painel facial + diag AWS
    Route::get('/api/king-selection/facial/status', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'status']);
    Route::get('/l/api/king-selection/facial/status', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'status']);
    Route::get('/api/king-selection/facial/clients', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'clients']);
    Route::get('/l/api/king-selection/facial/clients', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'clients']);
    Route::get('/api/king-selection/facial/jobs', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'jobs']);
    Route::get('/l/api/king-selection/facial/jobs', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'jobs']);
    Route::get('/api/king-selection/facial/matches', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'matches']);
    Route::get('/l/api/king-selection/facial/matches', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'matches']);
    Route::post('/api/king-selection/facial/process', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'process'])
        ->middleware('throttle:5,1');
    Route::post('/l/api/king-selection/facial/process', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'process'])
        ->middleware('throttle:5,1');
    Route::get('/api/king-selection/facial/progress', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'progress']);
    Route::get('/l/api/king-selection/facial/progress', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'progress']);
    Route::delete('/api/king-selection/facial/clients/{clientId}/faces', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'deleteClientFaces'])
        ->where('clientId', '[0-9]+');
    Route::delete('/l/api/king-selection/facial/clients/{clientId}/faces', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'deleteClientFaces'])
        ->where('clientId', '[0-9]+');
    Route::get('/api/king-selection/facial/diagnose', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'diagnose']);
    Route::get('/l/api/king-selection/facial/diagnose', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'diagnose']);
    Route::get('/api/king-selection/aws-check', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'awsCheck']);
    Route::get('/l/api/king-selection/aws-check', [\App\Http\Controllers\CartaoVirtual\KingSelectionFacialController::class, 'awsCheck']);

    Route::get('/api/king-selection/config-finalizacao/{galleryId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'configFinalizacao'])
        ->where('galleryId', '[0-9]+');
    Route::get('/l/api/king-selection/config-finalizacao/{galleryId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'configFinalizacao'])
        ->where('galleryId', '[0-9]+');
    Route::patch('/api/king-selection/photos/{photoId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'patchPhoto'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:120,1');
    Route::patch('/l/api/king-selection/photos/{photoId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'patchPhoto'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:120,1');
    Route::delete('/api/king-selection/photos/{photoId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deletePhoto'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::delete('/l/api/king-selection/photos/{photoId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'deletePhoto'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/photos/{photoId}/replace-r2', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'replacePhotoR2'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/photos/{photoId}/replace-r2', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'replacePhotoR2'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/photos/{photoId}/replace', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'replacePhotoCf'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/l/api/king-selection/photos/{photoId}/replace', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'replacePhotoCf'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:60,1');
    Route::post('/api/king-selection/photos/{photoId}/replace-proxy', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'replacePhotoProxy'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::post('/l/api/king-selection/photos/{photoId}/replace-proxy', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'replacePhotoProxy'])
        ->where('photoId', '[0-9]+')
        ->middleware('throttle:30,1');
    Route::get('/api/king-selection/photos/{photoId}/preview', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'adminPhotoPreview'])
        ->where('photoId', '[0-9]+');
    Route::get('/l/api/king-selection/photos/{photoId}/preview', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'adminPhotoPreview'])
        ->where('photoId', '[0-9]+');
    Route::get('/api/king-selection/photos/{photoId}/download', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'adminPhotoDownload'])
        ->where('photoId', '[0-9]+');
    Route::get('/l/api/king-selection/photos/{photoId}/download', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'adminPhotoDownload'])
        ->where('photoId', '[0-9]+');
    Route::get('/api/king-selection/galleries/{id}/watermark-suggest-scales', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'watermarkSuggestScales'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/king-selection/galleries/{id}/watermark-suggest-scales', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'watermarkSuggestScales'])
        ->where('id', '[0-9]+');
    Route::patch('/api/king-selection/galleries/{id}/folders/{folderId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'updateFolder'])
        ->where(['id' => '[0-9]+', 'folderId' => '[0-9]+'])
        ->middleware('throttle:60,1');
    Route::patch('/l/api/king-selection/galleries/{id}/folders/{folderId}', [\App\Http\Controllers\CartaoVirtual\KingSelectionAdminController::class, 'updateFolder'])
        ->where(['id' => '[0-9]+', 'folderId' => '[0-9]+'])
        ->middleware('throttle:60,1');
});

Route::middleware(['jwt', 'module:finance'])->group(function () {
    Route::get('/api/finance/profiles', [\App\Http\Controllers\Finance\FinanceController::class, 'profiles']);
    Route::get('/l/api/finance/profiles', [\App\Http\Controllers\Finance\FinanceController::class, 'profiles']);
    Route::get('/api/finance/profiles/primary', [\App\Http\Controllers\Finance\FinanceController::class, 'primaryProfile']);
    Route::get('/l/api/finance/profiles/primary', [\App\Http\Controllers\Finance\FinanceController::class, 'primaryProfile']);
    Route::get('/api/finance/profiles/limit', [\App\Http\Controllers\Finance\FinanceController::class, 'profilesLimit']);
    Route::get('/l/api/finance/profiles/limit', [\App\Http\Controllers\Finance\FinanceController::class, 'profilesLimit']);
    Route::post('/api/finance/profiles', [\App\Http\Controllers\Finance\FinanceController::class, 'createProfile'])
        ->middleware('throttle:30,1');
    Route::post('/l/api/finance/profiles', [\App\Http\Controllers\Finance\FinanceController::class, 'createProfile'])
        ->middleware('throttle:30,1');
    Route::put('/api/finance/profiles/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'updateProfile'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::put('/l/api/finance/profiles/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'updateProfile'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::delete('/api/finance/profiles/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'deleteProfile'])
        ->where('id', '[0-9]+')->middleware('throttle:30,1');
    Route::delete('/l/api/finance/profiles/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'deleteProfile'])
        ->where('id', '[0-9]+')->middleware('throttle:30,1');
    Route::get('/api/finance/dashboard', [\App\Http\Controllers\Finance\FinanceController::class, 'dashboard']);
    Route::get('/l/api/finance/dashboard', [\App\Http\Controllers\Finance\FinanceController::class, 'dashboard']);
    Route::get('/api/finance/income-breakdown', [\App\Http\Controllers\Finance\FinanceController::class, 'incomeBreakdown']);
    Route::get('/l/api/finance/income-breakdown', [\App\Http\Controllers\Finance\FinanceController::class, 'incomeBreakdown']);
    Route::get('/api/finance/cards', [\App\Http\Controllers\Finance\FinanceController::class, 'cards']);
    Route::get('/l/api/finance/cards', [\App\Http\Controllers\Finance\FinanceController::class, 'cards']);
    Route::post('/api/finance/cards', [\App\Http\Controllers\Finance\FinanceController::class, 'createCard'])
        ->middleware('throttle:60,1');
    Route::post('/l/api/finance/cards', [\App\Http\Controllers\Finance\FinanceController::class, 'createCard'])
        ->middleware('throttle:60,1');
    Route::patch('/api/finance/cards/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'updateCard'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::patch('/l/api/finance/cards/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'updateCard'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::delete('/api/finance/cards/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'deleteCard'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::delete('/l/api/finance/cards/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'deleteCard'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::get('/api/finance/transactions', [\App\Http\Controllers\Finance\FinanceController::class, 'transactions']);
    Route::get('/l/api/finance/transactions', [\App\Http\Controllers\Finance\FinanceController::class, 'transactions']);
    Route::get('/api/finance/transactions/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'transactionById'])
        ->where('id', '[0-9]+');
    Route::get('/l/api/finance/transactions/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'transactionById'])
        ->where('id', '[0-9]+');
    Route::post('/api/finance/transactions', [\App\Http\Controllers\Finance\FinanceController::class, 'createTransaction'])
        ->middleware('throttle:120,1');
    Route::post('/l/api/finance/transactions', [\App\Http\Controllers\Finance\FinanceController::class, 'createTransaction'])
        ->middleware('throttle:120,1');
    Route::put('/api/finance/transactions/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'updateTransaction'])
        ->where('id', '[0-9]+')->middleware('throttle:120,1');
    Route::put('/l/api/finance/transactions/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'updateTransaction'])
        ->where('id', '[0-9]+')->middleware('throttle:120,1');
    Route::delete('/api/finance/transactions/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'deleteTransaction'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::delete('/l/api/finance/transactions/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'deleteTransaction'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::get('/api/finance/categories', [\App\Http\Controllers\Finance\FinanceController::class, 'categories']);
    Route::get('/l/api/finance/categories', [\App\Http\Controllers\Finance\FinanceController::class, 'categories']);
    Route::post('/api/finance/categories', [\App\Http\Controllers\Finance\FinanceController::class, 'createCategory'])
        ->middleware('throttle:60,1');
    Route::post('/l/api/finance/categories', [\App\Http\Controllers\Finance\FinanceController::class, 'createCategory'])
        ->middleware('throttle:60,1');
    Route::get('/api/finance/accounts', [\App\Http\Controllers\Finance\FinanceController::class, 'accounts']);
    Route::get('/l/api/finance/accounts', [\App\Http\Controllers\Finance\FinanceController::class, 'accounts']);
    Route::post('/api/finance/accounts', [\App\Http\Controllers\Finance\FinanceController::class, 'createAccount'])
        ->middleware('throttle:60,1');
    Route::post('/l/api/finance/accounts', [\App\Http\Controllers\Finance\FinanceController::class, 'createAccount'])
        ->middleware('throttle:60,1');
    Route::get('/api/finance/goals', [\App\Http\Controllers\Finance\FinanceController::class, 'goals']);
    Route::get('/l/api/finance/goals', [\App\Http\Controllers\Finance\FinanceController::class, 'goals']);
    Route::post('/api/finance/goals', [\App\Http\Controllers\Finance\FinanceController::class, 'createGoal'])
        ->middleware('throttle:60,1');
    Route::post('/l/api/finance/goals', [\App\Http\Controllers\Finance\FinanceController::class, 'createGoal'])
        ->middleware('throttle:60,1');
    Route::delete('/api/finance/goals/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'deleteGoal'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::delete('/l/api/finance/goals/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'deleteGoal'])
        ->where('id', '[0-9]+')->middleware('throttle:60,1');
    Route::get('/api/finance/king-data', [\App\Http\Controllers\Finance\FinanceController::class, 'kingData']);
    Route::get('/l/api/finance/king-data', [\App\Http\Controllers\Finance\FinanceController::class, 'kingData']);
    Route::put('/api/finance/king-data', [\App\Http\Controllers\Finance\FinanceController::class, 'saveKingData']);
    Route::put('/l/api/finance/king-data', [\App\Http\Controllers\Finance\FinanceController::class, 'saveKingData']);

    Route::get('/api/finance/upgrade-plans', [\App\Http\Controllers\Finance\FinanceController::class, 'upgradePlans']);
    Route::get('/l/api/finance/upgrade-plans', [\App\Http\Controllers\Finance\FinanceController::class, 'upgradePlans']);
    Route::get('/api/finance/whatsapp-config', [\App\Http\Controllers\Finance\FinanceController::class, 'whatsappConfig']);
    Route::get('/l/api/finance/whatsapp-config', [\App\Http\Controllers\Finance\FinanceController::class, 'whatsappConfig']);
    Route::put('/api/finance/whatsapp-config', [\App\Http\Controllers\Finance\FinanceController::class, 'updateWhatsappConfig']);
    Route::put('/l/api/finance/whatsapp-config', [\App\Http\Controllers\Finance\FinanceController::class, 'updateWhatsappConfig']);
    Route::get('/api/finance/zerar-senha-status', [\App\Http\Controllers\Finance\FinanceController::class, 'zerarSenhaStatus']);
    Route::get('/l/api/finance/zerar-senha-status', [\App\Http\Controllers\Finance\FinanceController::class, 'zerarSenhaStatus']);
    Route::post('/api/finance/zerar-senha/verify', [\App\Http\Controllers\Finance\FinanceController::class, 'zerarSenhaVerify']);
    Route::post('/l/api/finance/zerar-senha/verify', [\App\Http\Controllers\Finance\FinanceController::class, 'zerarSenhaVerify']);
    Route::put('/api/finance/zerar-senha', [\App\Http\Controllers\Finance\FinanceController::class, 'putZerarSenha']);
    Route::put('/l/api/finance/zerar-senha', [\App\Http\Controllers\Finance\FinanceController::class, 'putZerarSenha']);
    Route::post('/api/finance/zerar-mes', [\App\Http\Controllers\Finance\FinanceController::class, 'zerarMes']);
    Route::post('/l/api/finance/zerar-mes', [\App\Http\Controllers\Finance\FinanceController::class, 'zerarMes']);
    Route::get('/api/finance/admin/clientes-senhas', [\App\Http\Controllers\Finance\FinanceController::class, 'adminClientesSenhas']);
    Route::get('/l/api/finance/admin/clientes-senhas', [\App\Http\Controllers\Finance\FinanceController::class, 'adminClientesSenhas']);

    Route::get('/api/finance/profiles/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'profileById'])->whereNumber('id');
    Route::get('/l/api/finance/profiles/{id}', [\App\Http\Controllers\Finance\FinanceController::class, 'profileById'])->whereNumber('id');

    Route::get('/api/finance/budgets', [\App\Http\Controllers\Finance\FinanceController::class, 'budgets']);
    Route::get('/l/api/finance/budgets', [\App\Http\Controllers\Finance\FinanceController::class, 'budgets']);
    Route::post('/api/finance/budgets', [\App\Http\Controllers\Finance\FinanceController::class, 'createBudget']);
    Route::post('/l/api/finance/budgets', [\App\Http\Controllers\Finance\FinanceController::class, 'createBudget']);

    Route::get('/api/finance/reports/summary', [\App\Http\Controllers\Finance\FinanceController::class, 'reportSummary']);
    Route::get('/l/api/finance/reports/summary', [\App\Http\Controllers\Finance\FinanceController::class, 'reportSummary']);
    Route::get('/api/finance/reports/categories', [\App\Http\Controllers\Finance\FinanceController::class, 'reportCategories']);
    Route::get('/l/api/finance/reports/categories', [\App\Http\Controllers\Finance\FinanceController::class, 'reportCategories']);

    Route::post('/api/finance/transfer', [\App\Http\Controllers\Finance\FinanceController::class, 'transfer']);
    Route::post('/l/api/finance/transfer', [\App\Http\Controllers\Finance\FinanceController::class, 'transfer']);
    Route::post('/api/finance/upload', [\App\Http\Controllers\Finance\FinanceController::class, 'uploadAttachment']);
    Route::post('/l/api/finance/upload', [\App\Http\Controllers\Finance\FinanceController::class, 'uploadAttachment']);

    Route::post('/api/finance/serasa/import-preview', [\App\Http\Controllers\Finance\FinanceController::class, 'serasaImportPreview']);
    Route::post('/l/api/finance/serasa/import-preview', [\App\Http\Controllers\Finance\FinanceController::class, 'serasaImportPreview']);
    Route::post('/api/finance/serasa/import-image-preview', [\App\Http\Controllers\Finance\FinanceController::class, 'serasaImportImagePreview']);
    Route::post('/l/api/finance/serasa/import-image-preview', [\App\Http\Controllers\Finance\FinanceController::class, 'serasaImportImagePreview']);
});

// ---------- Documentos (recibos/orçamentos) ----------
$doc = \App\Http\Controllers\Documentos\DocumentosController::class;
Route::get('/api/documentos/ver/{token}/pdf', [$doc, 'getPdfByToken']);
Route::get('/l/api/documentos/ver/{token}/pdf', [$doc, 'getPdfByToken']);
Route::get('/api/documentos/ver/{token}', [$doc, 'getByToken']);
Route::get('/l/api/documentos/ver/{token}', [$doc, 'getByToken']);
Route::put('/api/documentos/ver/{token}', [$doc, 'updateByToken']);
Route::put('/l/api/documentos/ver/{token}', [$doc, 'updateByToken']);
Route::get('/api/documentos/ocr-info', [$doc, 'ocrInfo']);
Route::get('/l/api/documentos/ocr-info', [$doc, 'ocrInfo']);
Route::get('/api/documentos/warm-ocr', [$doc, 'warmOcr']);
Route::get('/l/api/documentos/warm-ocr', [$doc, 'warmOcr']);

Route::middleware('jwt')->group(function () use ($doc) {
    Route::get('/api/documentos/settings', [$doc, 'getSettings']);
    Route::get('/l/api/documentos/settings', [$doc, 'getSettings']);
    Route::put('/api/documentos/settings', [$doc, 'putSettings']);
    Route::put('/l/api/documentos/settings', [$doc, 'putSettings']);
    Route::post('/api/documentos/upload-logo', [$doc, 'uploadLogo']);
    Route::post('/l/api/documentos/upload-logo', [$doc, 'uploadLogo']);
    Route::post('/api/documentos', [$doc, 'create']);
    Route::post('/l/api/documentos', [$doc, 'create']);
    Route::get('/api/documentos', [$doc, 'list']);
    Route::get('/l/api/documentos', [$doc, 'list']);
    Route::post('/api/documentos/{id}/duplicate', [$doc, 'duplicate'])->whereNumber('id');
    Route::post('/l/api/documentos/{id}/duplicate', [$doc, 'duplicate'])->whereNumber('id');
    Route::get('/api/documentos/{id}/pdf', [$doc, 'getPdf'])->whereNumber('id');
    Route::get('/l/api/documentos/{id}/pdf', [$doc, 'getPdf'])->whereNumber('id');
    Route::get('/api/documentos/{id}', [$doc, 'getOne'])->whereNumber('id');
    Route::get('/l/api/documentos/{id}', [$doc, 'getOne'])->whereNumber('id');
    Route::put('/api/documentos/{id}', [$doc, 'update'])->whereNumber('id');
    Route::put('/l/api/documentos/{id}', [$doc, 'update'])->whereNumber('id');
    Route::delete('/api/documentos/{id}', [$doc, 'remove'])->whereNumber('id');
    Route::delete('/l/api/documentos/{id}', [$doc, 'remove'])->whereNumber('id');
    Route::post('/api/documentos/{id}/anexos', [$doc, 'uploadAnexo'])->whereNumber('id');
    Route::post('/l/api/documentos/{id}/anexos', [$doc, 'uploadAnexo'])->whereNumber('id');
    Route::post('/api/documentos/{id}/nota-fiscal', [$doc, 'uploadNotaFiscalItem'])->whereNumber('id');
    Route::post('/l/api/documentos/{id}/nota-fiscal', [$doc, 'uploadNotaFiscalItem'])->whereNumber('id');
    Route::delete('/api/documentos/{id}/nota-fiscal', [$doc, 'removeNotaFiscalItem'])->whereNumber('id');
    Route::delete('/l/api/documentos/{id}/nota-fiscal', [$doc, 'removeNotaFiscalItem'])->whereNumber('id');
    Route::post('/api/documentos/{id}/processar-comprovante', [$doc, 'processarComprovante'])->whereNumber('id');
    Route::post('/l/api/documentos/{id}/processar-comprovante', [$doc, 'processarComprovante'])->whereNumber('id');
});

// ---------- King Docs ----------
$kd = \App\Http\Controllers\KingDocs\KingDocsController::class;
Route::get('/api/king-docs/public/{token}/meta', [$kd, 'publicMeta']);
Route::get('/l/api/king-docs/public/{token}/meta', [$kd, 'publicMeta']);
Route::post('/api/king-docs/public/{token}/unlock', [$kd, 'publicUnlock'])->middleware('throttle:20,1');
Route::post('/l/api/king-docs/public/{token}/unlock', [$kd, 'publicUnlock'])->middleware('throttle:20,1');
Route::get('/api/king-docs/public/{token}/data', [$kd, 'publicData']);
Route::get('/l/api/king-docs/public/{token}/data', [$kd, 'publicData']);
Route::get('/api/king-docs/public/{token}/file/{fileId}', [$kd, 'publicDownloadFile'])->whereNumber('fileId');
Route::get('/l/api/king-docs/public/{token}/file/{fileId}', [$kd, 'publicDownloadFile'])->whereNumber('fileId');

Route::middleware(['jwt', 'module:king_docs'])->group(function () use ($kd) {
    Route::get('/api/king-docs/vault', [$kd, 'getVault']);
    Route::get('/l/api/king-docs/vault', [$kd, 'getVault']);
    Route::put('/api/king-docs/vault', [$kd, 'putVault']);
    Route::put('/l/api/king-docs/vault', [$kd, 'putVault']);
    Route::post('/api/king-docs/vault/import-profile', [$kd, 'importProfile']);
    Route::post('/l/api/king-docs/vault/import-profile', [$kd, 'importProfile']);
    Route::get('/api/king-docs/vault/export-pdf', [$kd, 'exportPdf']);
    Route::get('/l/api/king-docs/vault/export-pdf', [$kd, 'exportPdf']);
    Route::get('/api/king-docs/files/{id}/download', [$kd, 'downloadFile'])->whereNumber('id');
    Route::get('/l/api/king-docs/files/{id}/download', [$kd, 'downloadFile'])->whereNumber('id');
    Route::get('/api/king-docs/files', [$kd, 'listFiles']);
    Route::get('/l/api/king-docs/files', [$kd, 'listFiles']);
    Route::post('/api/king-docs/files', [$kd, 'uploadFile']);
    Route::post('/l/api/king-docs/files', [$kd, 'uploadFile']);
    Route::delete('/api/king-docs/files/{id}', [$kd, 'deleteFile'])->whereNumber('id');
    Route::delete('/l/api/king-docs/files/{id}', [$kd, 'deleteFile'])->whereNumber('id');
    Route::post('/api/king-docs/shares', [$kd, 'createShare']);
    Route::post('/l/api/king-docs/shares', [$kd, 'createShare']);
    Route::get('/api/king-docs/shares', [$kd, 'listShares']);
    Route::get('/l/api/king-docs/shares', [$kd, 'listShares']);
    Route::delete('/api/king-docs/shares/{id}/permanent', [$kd, 'deleteSharePermanent'])->whereNumber('id');
    Route::delete('/l/api/king-docs/shares/{id}/permanent', [$kd, 'deleteSharePermanent'])->whereNumber('id');
    Route::delete('/api/king-docs/shares/{id}', [$kd, 'revokeShare'])->whereNumber('id');
    Route::delete('/l/api/king-docs/shares/{id}', [$kd, 'revokeShare'])->whereNumber('id');
});

Route::middleware('admin')->group(function () {
    Route::get('/api/modules/plan-availability', [\App\Http\Controllers\Account\ModulesController::class, 'planAvailability']);
    Route::get('/l/api/modules/plan-availability', [\App\Http\Controllers\Account\ModulesController::class, 'planAvailability']);

    $linkPreview = \App\Http\Controllers\Admin\PersonalizarLinkController::class;
    Route::get('/api/admin/link-preview-config', [$linkPreview, 'getConfig']);
    Route::get('/l/api/admin/link-preview-config', [$linkPreview, 'getConfig']);
    Route::post('/api/admin/link-preview-config', [$linkPreview, 'saveConfig']);
    Route::post('/l/api/admin/link-preview-config', [$linkPreview, 'saveConfig']);

    // Painel admin completo (routes/admin.js: overview + users + codes).
    $adminOverview = \App\Http\Controllers\Admin\AdminOverviewController::class;
    $adminUsers = \App\Http\Controllers\Admin\AdminUsersController::class;
    $adminCodes = \App\Http\Controllers\Admin\AdminCodesController::class;
    foreach (['', '/l'] as $p) {
        Route::get($p.'/api/admin/default-branding', [$adminOverview, 'getDefaultBranding']);
        Route::put($p.'/api/admin/default-branding', [$adminOverview, 'putDefaultBranding']);
        Route::get($p.'/api/admin/stats', [$adminOverview, 'stats']);
        Route::get($p.'/api/admin/advanced-stats', [$adminOverview, 'advancedStats']);
        Route::get($p.'/api/admin/analytics/users', [$adminOverview, 'analyticsUsers']);
        Route::get($p.'/api/admin/analytics/user/{userId}/details', [$adminOverview, 'analyticsUserDetails']);
        Route::get($p.'/api/admin/plans', [$adminOverview, 'plans']);
        Route::patch($p.'/api/admin/plans/{id}', [$adminOverview, 'updatePlan'])->whereNumber('id');

        // Users: rotas fixas antes de /users/{id} para não serem capturadas pelo curinga.
        Route::get($p.'/api/admin/users', [$adminOverview, 'users']);
        Route::get($p.'/api/admin/users/auto-delete-config', [$adminUsers, 'autoDeleteConfig']);
        Route::post($p.'/api/admin/users/auto-delete-config', [$adminUsers, 'saveAutoDeleteConfig']);
        Route::post($p.'/api/admin/users/execute-auto-delete', [$adminUsers, 'executeAutoDelete']);
        Route::get($p.'/api/admin/users/{id}/dashboard', [$adminUsers, 'dashboard']);
        Route::put($p.'/api/admin/users/{id}/manage', [$adminUsers, 'manage']);
        Route::put($p.'/api/admin/users/{id}/update-role', [$adminUsers, 'updateRole']);
        Route::put($p.'/api/admin/users/{id}', [$adminUsers, 'updateAccountType']);
        Route::delete($p.'/api/admin/users/{id}', [$adminUsers, 'destroy']);

        Route::get($p.'/api/admin/codes', [$adminOverview, 'codes']);
        Route::get($p.'/api/admin/codes/auto-delete-config', [$adminCodes, 'autoDeleteConfig']);
        Route::post($p.'/api/admin/codes/auto-delete-config', [$adminCodes, 'saveAutoDeleteConfig']);
        Route::post($p.'/api/admin/codes/execute-auto-delete', [$adminCodes, 'executeAutoDelete']);
        Route::post($p.'/api/admin/codes/generate-manual', [$adminCodes, 'generateManual']);
        Route::post($p.'/api/admin/codes/generate-batch', [$adminCodes, 'generateBatch']);
        Route::put($p.'/api/admin/codes/{code}', [$adminCodes, 'update']);
        Route::delete($p.'/api/admin/codes/{code}', [$adminCodes, 'destroy']);
        // Rota legada sem prefixo /codes.
        Route::post($p.'/api/admin/generate-code', [$adminCodes, 'generateCode']);
    }
});

// ---------- APIs residuais do Node (fatias B7 / B9–B15) ----------

// Proxy de imagem OG (público)
$imageProxy = \App\Http\Controllers\Media\ImageProxyController::class;
Route::get('/api/image/profile-image', [$imageProxy, 'profileImage']);
Route::get('/l/api/image/profile-image', [$imageProxy, 'profileImage']);

// Lead empresarial + chave curta de cadastro (públicos, como no Node)
$inquiry = \App\Http\Controllers\Leads\InquiryController::class;
Route::post('/api/inquiry/submit', [$inquiry, 'submit'])->middleware('throttle:20,1');
Route::post('/l/api/inquiry/submit', [$inquiry, 'submit'])->middleware('throttle:20,1');

$generator = \App\Http\Controllers\Admin\GeneratorController::class;
Route::post('/api/generator/new-key', [$generator, 'newKey'])->middleware('throttle:20,1');
Route::post('/l/api/generator/new-key', [$generator, 'newKey'])->middleware('throttle:20,1');

// Push: chave VAPID é pública; webhook do Mercado Pago também
$push = \App\Http\Controllers\Push\PushController::class;
Route::get('/api/push/vapid-public-key', [$push, 'vapidPublicKey']);
Route::get('/l/api/push/vapid-public-key', [$push, 'vapidPublicKey']);

$payment = \App\Http\Controllers\Payment\PaymentController::class;
Route::post('/api/payment/webhook-notification', [$payment, 'webhook']);
Route::post('/l/api/payment/webhook-notification', [$payment, 'webhook']);

Route::middleware('jwt')->group(function () use ($push, $payment) {
    $location = \App\Http\Controllers\CartaoVirtual\LocationController::class;
    Route::get('/api/location/config/{itemId}', [$location, 'show'])->whereNumber('itemId');
    Route::get('/l/api/location/config/{itemId}', [$location, 'show'])->whereNumber('itemId');
    Route::put('/api/location/config/{itemId}', [$location, 'update'])->whereNumber('itemId');
    Route::put('/l/api/location/config/{itemId}', [$location, 'update'])->whereNumber('itemId');

    $suggestions = \App\Http\Controllers\Suggestions\SuggestionsController::class;
    Route::post('/api/suggestions/generate', [$suggestions, 'generate']);
    Route::post('/l/api/suggestions/generate', [$suggestions, 'generate']);

    $checkin = \App\Http\Controllers\CartaoVirtual\CheckinController::class;
    Route::get('/api/checkin/{itemId}', [$checkin, 'show'])->whereNumber('itemId');
    Route::get('/l/api/checkin/{itemId}', [$checkin, 'show'])->whereNumber('itemId');

    Route::post('/api/push/subscribe', [$push, 'subscribe']);
    Route::post('/l/api/push/subscribe', [$push, 'subscribe']);

    Route::post('/api/payment/create-preference', [$payment, 'createPreference']);
    Route::post('/l/api/payment/create-preference', [$payment, 'createPreference']);

    $orcamentos = \App\Http\Controllers\Orcamentos\OrcamentosController::class;
    Route::get('/api/orcamentos', [$orcamentos, 'index']);
    Route::get('/l/api/orcamentos', [$orcamentos, 'index']);
    Route::get('/api/orcamentos/{id}', [$orcamentos, 'show'])->whereNumber('id');
    Route::get('/l/api/orcamentos/{id}', [$orcamentos, 'show'])->whereNumber('id');
    Route::patch('/api/orcamentos/{id}/status', [$orcamentos, 'updateStatus'])->whereNumber('id');
    Route::patch('/l/api/orcamentos/{id}/status', [$orcamentos, 'updateStatus'])->whereNumber('id');
    Route::delete('/api/orcamentos/{id}', [$orcamentos, 'destroy'])->whereNumber('id');
    Route::delete('/l/api/orcamentos/{id}', [$orcamentos, 'destroy'])->whereNumber('id');

    $businessCodes = \App\Http\Controllers\Business\InviteCodesController::class;
    Route::get('/api/business/codes', [$businessCodes, 'index']);
    Route::get('/l/api/business/codes', [$businessCodes, 'index']);
    Route::post('/api/business/generate-code', [$businessCodes, 'generate']);
    Route::post('/l/api/business/generate-code', [$businessCodes, 'generate']);
    Route::post('/api/business/codes/generate-manual', [$businessCodes, 'generateManual']);
    Route::post('/l/api/business/codes/generate-manual', [$businessCodes, 'generateManual']);

    // Sales pages: CRUD da página, produtos e analytics. Os {id} continuam numéricos
    // para não capturarem os prefixos literais /products e /analytics.
    $salesPage = \App\Http\Controllers\SalesPage\SalesPageController::class;
    Route::post('/api/v1/sales-pages', [$salesPage, 'store']);
    Route::post('/l/api/v1/sales-pages', [$salesPage, 'store']);
    Route::get('/api/v1/sales-pages/item/{itemId}', [$salesPage, 'showByProfileItem'])->whereNumber('itemId');
    Route::get('/l/api/v1/sales-pages/item/{itemId}', [$salesPage, 'showByProfileItem'])->whereNumber('itemId');
    Route::get('/api/v1/sales-pages/{id}', [$salesPage, 'show'])->whereNumber('id');
    Route::get('/l/api/v1/sales-pages/{id}', [$salesPage, 'show'])->whereNumber('id');
    Route::put('/api/v1/sales-pages/{id}', [$salesPage, 'update'])->whereNumber('id');
    Route::put('/l/api/v1/sales-pages/{id}', [$salesPage, 'update'])->whereNumber('id');
    Route::patch('/api/v1/sales-pages/{id}/publish', [$salesPage, 'publish'])->whereNumber('id');
    Route::patch('/l/api/v1/sales-pages/{id}/publish', [$salesPage, 'publish'])->whereNumber('id');
    Route::patch('/api/v1/sales-pages/{id}/pause', [$salesPage, 'pause'])->whereNumber('id');
    Route::patch('/l/api/v1/sales-pages/{id}/pause', [$salesPage, 'pause'])->whereNumber('id');
    Route::patch('/api/v1/sales-pages/{id}/archive', [$salesPage, 'archive'])->whereNumber('id');
    Route::patch('/l/api/v1/sales-pages/{id}/archive', [$salesPage, 'archive'])->whereNumber('id');
    Route::delete('/api/v1/sales-pages/{id}', [$salesPage, 'destroy'])->whereNumber('id');
    Route::delete('/l/api/v1/sales-pages/{id}', [$salesPage, 'destroy'])->whereNumber('id');

    $salesPageProduct = \App\Http\Controllers\SalesPage\SalesPageProductController::class;
    foreach (['', '/l'] as $p) {
        Route::get($p.'/api/v1/sales-pages/products/{productId}', [$salesPageProduct, 'show'])->whereNumber('productId');
        Route::put($p.'/api/v1/sales-pages/products/{productId}', [$salesPageProduct, 'update'])->whereNumber('productId');
        Route::patch($p.'/api/v1/sales-pages/products/{productId}/status', [$salesPageProduct, 'updateStatus'])->whereNumber('productId');
        Route::delete($p.'/api/v1/sales-pages/products/{productId}', [$salesPageProduct, 'destroy'])->whereNumber('productId');
        Route::get($p.'/api/v1/sales-pages/{salesPageId}/products', [$salesPageProduct, 'index'])->whereNumber('salesPageId');
        Route::post($p.'/api/v1/sales-pages/{salesPageId}/products', [$salesPageProduct, 'store'])->whereNumber('salesPageId');
        Route::post($p.'/api/v1/sales-pages/{salesPageId}/products/reorder', [$salesPageProduct, 'reorder'])->whereNumber('salesPageId');
    }

    $salesPageAnalytics = \App\Http\Controllers\SalesPage\SalesPageAnalyticsController::class;
    foreach (['', '/l'] as $p) {
        Route::get($p.'/api/v1/sales-pages/analytics/products/{productId}', [$salesPageAnalytics, 'product'])->whereNumber('productId');
        Route::get($p.'/api/v1/sales-pages/analytics/{salesPageId}', [$salesPageAnalytics, 'index'])->whereNumber('salesPageId');
        Route::get($p.'/api/v1/sales-pages/analytics/{salesPageId}/funnel', [$salesPageAnalytics, 'funnel'])->whereNumber('salesPageId');
        Route::get($p.'/api/v1/sales-pages/analytics/{salesPageId}/ranking', [$salesPageAnalytics, 'ranking'])->whereNumber('salesPageId');
    }
});

// Tracking da loja: público, chamado pelo JS da página pública (sem JWT).
$salesPageTrack = \App\Http\Controllers\SalesPage\SalesPageAnalyticsController::class;
Route::post('/api/v1/sales-pages/track', [$salesPageTrack, 'track']);
Route::post('/l/api/v1/sales-pages/track', [$salesPageTrack, 'track']);

// ---------- Checkout KingForms / PagBank (B20) ----------
$checkout = \App\Http\Controllers\Checkout\CheckoutController::class;

// A página de checkout e o webhook do PagBank são públicos.
Route::get('/api/checkout/page', [$checkout, 'page']);
Route::get('/l/api/checkout/page', [$checkout, 'page']);
Route::post('/api/checkout/create', [$checkout, 'create'])->middleware('throttle:30,1');
Route::post('/l/api/checkout/create', [$checkout, 'create'])->middleware('throttle:30,1');
Route::post('/api/webhooks/pagbank', [$checkout, 'webhook']);
Route::post('/l/api/webhooks/pagbank', [$checkout, 'webhook']);

Route::middleware('jwt')->group(function () use ($checkout) {
    Route::get('/api/checkout/preview-link', [$checkout, 'previewLink']);
    Route::get('/l/api/checkout/preview-link', [$checkout, 'previewLink']);
    Route::get('/api/checkout/config/{itemId}', [$checkout, 'getConfig'])->whereNumber('itemId');
    Route::get('/l/api/checkout/config/{itemId}', [$checkout, 'getConfig'])->whereNumber('itemId');
    Route::put('/api/checkout/config/{itemId}', [$checkout, 'saveConfig'])->whereNumber('itemId');
    Route::put('/l/api/checkout/config/{itemId}', [$checkout, 'saveConfig'])->whereNumber('itemId');
    Route::post('/api/checkout/test-connection', [$checkout, 'testConnection']);
    Route::post('/l/api/checkout/test-connection', [$checkout, 'testConnection']);
});

Route::get('/og-image.jpg', [\App\Http\Controllers\Admin\OgImageController::class, 'show']);
Route::get('/l/og-image.jpg', [\App\Http\Controllers\Admin\OgImageController::class, 'show']);

Route::post('/api/auth/login', [\App\Http\Controllers\Auth\AuthController::class, 'login'])->middleware('throttle:20,1');
Route::post('/l/api/auth/login', [\App\Http\Controllers\Auth\AuthController::class, 'login'])->middleware('throttle:20,1');
Route::post('/api/auth/register', [\App\Http\Controllers\Auth\AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/l/api/auth/register', [\App\Http\Controllers\Auth\AuthController::class, 'register'])->middleware('throttle:10,1');
Route::get('/api/subscription/plans-public', [\App\Http\Controllers\Account\SubscriptionController::class, 'plansPublic']);
Route::get('/l/api/subscription/plans-public', [\App\Http\Controllers\Account\SubscriptionController::class, 'plansPublic']);
Route::post('/api/auth/refresh', [\App\Http\Controllers\Auth\AuthController::class, 'refresh'])->middleware('throttle:30,1');
Route::post('/l/api/auth/refresh', [\App\Http\Controllers\Auth\AuthController::class, 'refresh'])->middleware('throttle:30,1');
Route::post('/api/auth/logout', [\App\Http\Controllers\Auth\AuthController::class, 'logout'])->middleware('throttle:30,1');
Route::post('/l/api/auth/logout', [\App\Http\Controllers\Auth\AuthController::class, 'logout'])->middleware('throttle:30,1');

Route::get('/login', [\App\Http\Controllers\DashboardShellController::class, 'login']);
Route::get('/login.html', [\App\Http\Controllers\DashboardShellController::class, 'login']);
Route::get('/l/login', [\App\Http\Controllers\DashboardShellController::class, 'login']);
Route::get('/l/login.html', [\App\Http\Controllers\DashboardShellController::class, 'login']);
Route::get('/dashboard', [\App\Http\Controllers\DashboardShellController::class, 'dashboard']);
Route::get('/dashboard.html', [\App\Http\Controllers\DashboardShellController::class, 'dashboard']);
Route::get('/l/dashboard', [\App\Http\Controllers\DashboardShellController::class, 'dashboard']);
Route::get('/l/dashboard.html', [\App\Http\Controllers\DashboardShellController::class, 'dashboard']);


// Front legado (HTML/JS) — até Blade full; necessário para desligar Node
$legacyPages = [
    'kingSelection', 'kingSelectionEdit', 'kingSelectionProject', 'kingSelectionCliente',
    'kingSelectionGallery', 'kingSelectionReview', 'kingSelectionSuccess',
    'registro', 'recuperar-senha', 'resetar-senha', 'conta', 'index',
    'formPageEdit', 'salesPageEdit', 'guestListEdit', 'guestListEditManage',
    'kingDocs', 'kingDocsShare', 'kingForms', 'bible', 'bibliaking',
    'documentos-preview', 'documentos-ver', 'orcamentos', 'recibos-orcamentos',
    'checkoutConfig', 'termos', 'privacidade', 'admin-planos',
    'admin-devocionais-365', 'admin-prosperidade-31', 'responsesList', 'conviteEdit',
    'zerar-mes', 'arquetipo-resultados',
];
foreach ($legacyPages as $pageName) {
    Route::get('/'.$pageName, function () use ($pageName) {
        return app(\App\Http\Controllers\FrontLegacyController::class)->page(request(), $pageName);
    });
    Route::get('/'.$pageName.'.html', function () use ($pageName) {
        return app(\App\Http\Controllers\FrontLegacyController::class)->page(request(), $pageName.'.html');
    });
}
Route::get('/config.js', function () {
    return app(\App\Http\Controllers\FrontLegacyController::class)->page(request(), 'config.js');
});
Route::get('/{asset}', [\App\Http\Controllers\FrontLegacyController::class, 'page'])
    ->where('asset', '.*\\.(js|css|map|png|jpg|jpeg|webp|svg|woff2?|ttf|ico|json)$');
Route::get('/l/loja/{slug}/{storeSlug}', [SatellitePublicController::class, 'salesStore'])->where(['slug' => $cardSlug, 'storeSlug' => $cardSlug]);
Route::get('/{slug}/{storeSlug}', [SatellitePublicController::class, 'salesStore'])->where(['slug' => $cardSlug, 'storeSlug' => $cardSlug]);