<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\KingSelectionAdminService;
use App\Services\CartaoVirtual\KingSelectionAiService;
use App\Services\CartaoVirtual\KingSelectionFaceService;
use App\Services\CartaoVirtual\KingSelectionMediaService;
use App\Services\CartaoVirtual\KingSelectionSalesService;
use App\Services\CartaoVirtual\R2StorageService;
use App\Support\UploadedFileValidator;
use Illuminate\Http\Request;

class KingSelectionAdminController extends Controller
{
    public function __construct(
        private readonly KingSelectionAdminService $admin,
        private readonly R2StorageService $r2,
        private readonly KingSelectionMediaService $media,
        private readonly KingSelectionSalesService $sales,
        private readonly KingSelectionFaceService $face,
        private readonly KingSelectionAiService $ai,
    ) {
    }

    public function index(Request $request)
    {
        $trashed = filter_var($request->query('trashed', false), FILTER_VALIDATE_BOOLEAN);
        $r = $this->admin->listGalleries(
            (string) $request->attributes->get('auth_user_id'),
            $request->query('profileItemId') ?? $request->query('itemId') ?? $request->query('itemid'),
            $trashed
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function store(Request $request)
    {
        $r = $this->admin->createGallery(
            (string) $request->attributes->get('auth_user_id'),
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function show(Request $request, string $id)
    {
        $limitRaw = $request->query('photos_limit', $request->query('limit'));
        $photosLimit = $limitRaw === null || $limitRaw === '' ? null : (int) $limitRaw;
        $photosOffset = max(0, (int) ($request->query('photos_offset', $request->query('offset', 0))));
        $r = $this->admin->getGallery(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->query('focusClientId') ?? $request->query('clientId'),
            $photosLimit,
            $photosOffset
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function status(Request $request, string $id)
    {
        $r = $this->admin->updateStatus(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function destroy(Request $request, string $id)
    {
        $force = filter_var($request->query('force', $request->input('force', false)), FILTER_VALIDATE_BOOLEAN);
        $r = $this->admin->deleteGallery(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $force
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function restore(Request $request, string $id)
    {
        $r = $this->admin->restoreGallery(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function addPhoto(Request $request, string $id)
    {
        $r = $this->admin->addPhoto(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function photosBatch(Request $request, string $id)
    {
        $r = $this->admin->photosBatch(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function workerCommit(Request $request, string $id)
    {
        $r = $this->admin->workerCommit(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function uploadProxy(Request $request, string $id)
    {
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['message' => 'Arquivo é obrigatório'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            $status = str_contains((string) ($check['message'] ?? ''), 'grande') ? 413 : 400;
            $body = $status === 413
                ? ['success' => false, 'message' => $check['message']]
                : ['message' => $check['message'] ?? 'Arquivo inválido.'];

            return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
        }

        $r = $this->admin->uploadProxy(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $check['binary'],
            $check['mime'],
            (string) ($request->input('original_name') ?: $request->input('originalName') ?: $file->getClientOriginalName() ?: 'foto'),
            (int) ($request->input('order') ?: 0),
            $request->input('folder_id') ?? $request->input('folderId'),
            $this->r2
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function presignBatch(Request $request, string $id)
    {
        $r = $this->admin->presignBatch(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all(),
            $this->r2
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function watermarkFile(Request $request, string $id)
    {
        $r = $this->media->watermarkFileForGallery(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (string) $request->query('which', '')
        );
        if (($r['status'] ?? 500) !== 200 || empty($r['binary'])) {
            $msg = (string) ($r['message'] ?? 'Erro');
            $status = (int) ($r['status'] ?? 500);

            return response($msg, $status)->header('X-Conecta-Engine', 'laravel');
        }

        return response($r['binary'], 200)
            ->header('Content-Type', $r['contentType'] ?? 'image/png')
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function update(Request $request, string $id)
    {
        $r = $this->admin->updateGallery(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function listFolders(Request $request, string $id)
    {
        $r = $this->admin->listFolders((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createFolder(Request $request, string $id)
    {
        $r = $this->admin->createFolder(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteFolder(Request $request, string $id, string $folderId)
    {
        $r = $this->admin->deleteFolder(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $folderId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function generateFolders(Request $request, string $id)
    {
        $r = $this->admin->generateFolders(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function reorderFolders(Request $request, string $id)
    {
        $r = $this->admin->reorderFolders(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function assignPhotosFolder(Request $request, string $id)
    {
        $r = $this->admin->assignPhotosFolder(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function uploadWatermark(Request $request, string $id)
    {
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['message' => 'Arquivo é obrigatório'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            $status = str_contains((string) ($check['message'] ?? ''), 'grande') ? 413 : 400;
            $body = $status === 413
                ? ['success' => false, 'message' => $check['message']]
                : ['message' => $check['message'] ?? 'Arquivo inválido.'];

            return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
        }

        $r = $this->admin->uploadWatermark(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $check['binary'],
            $check['mime'],
            (string) ($file->getClientOriginalName() ?: 'watermark.png'),
            (string) ($request->query('which') ?: $request->input('which') ?: ''),
            $this->r2
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function uploadThankYouImage(Request $request, string $id)
    {
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['message' => 'Arquivo é obrigatório'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            $status = str_contains((string) ($check['message'] ?? ''), 'grande') ? 413 : 400;
            $body = $status === 413
                ? ['success' => false, 'message' => $check['message']]
                : ['message' => $check['message'] ?? 'Arquivo inválido.'];

            return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
        }

        $r = $this->admin->uploadThankYouImage(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $check['binary'],
            $check['mime'],
            (string) ($file->getClientOriginalName() ?: 'thank-you.png'),
            $this->r2
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function openSelectionRound(Request $request, string $id)
    {
        $r = $this->admin->openSelectionRound(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deletePhotosBatch(Request $request, string $id)
    {
        $r = $this->admin->deletePhotosBatch(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function listClients(Request $request, string $id)
    {
        $r = $this->admin->listClients((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createClient(Request $request, string $id)
    {
        $r = $this->admin->createClient(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateClient(Request $request, string $id, string $clientId)
    {
        $r = $this->admin->updateClient(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteClient(Request $request, string $id, string $clientId)
    {
        $r = $this->admin->deleteClient(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function resetClientPassword(Request $request, string $id, string $clientId)
    {
        $r = $this->admin->resetClientPassword(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function clientAccessLink(Request $request, string $id, string $clientId)
    {
        $r = $this->admin->createClientAccessLink(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function salesConfig(Request $request, string $id)
    {
        $r = $this->sales->getSalesConfig((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function saveSalesConfig(Request $request, string $id)
    {
        $r = $this->sales->saveSalesConfig(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function salesClients(Request $request, string $id)
    {
        $r = $this->sales->listSalesClients((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function salesRound(Request $request, string $id, string $clientId, string $selectionBatch)
    {
        $r = $this->sales->getSalesRound(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            (int) $selectionBatch
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function paymentTerms(Request $request, string $id, string $clientId, string $selectionBatch)
    {
        $r = $this->sales->savePaymentTerms(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            (int) $selectionBatch,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function paymentReview(Request $request, string $id, string $clientId, string $selectionBatch)
    {
        $r = $this->sales->paymentReview(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            (int) $selectionBatch,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function approvePhoto(Request $request, string $id, string $clientId, string $selectionBatch)
    {
        $r = $this->sales->approvePhoto(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            (int) $selectionBatch,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function approveAll(Request $request, string $id, string $clientId, string $selectionBatch)
    {
        $r = $this->sales->approveAll(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            (int) $selectionBatch,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function paymentProof(Request $request, string $id, string $paymentId)
    {
        $r = $this->sales->paymentProofBinary(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $paymentId
        );
        if (($r['status'] ?? 500) !== 200 || empty($r['binary'])) {
            return response()->json(['message' => $r['message'] ?? 'Comprovante não encontrado.'], (int) ($r['status'] ?? 404))
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response($r['binary'], 200)
            ->header('Content-Type', $r['contentType'] ?? 'image/jpeg')
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function workerToken(Request $request, string $id)
    {
        $r = $this->admin->workerToken(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function resetGalleryPassword(Request $request, string $id)
    {
        $r = $this->admin->resetGalleryPassword(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function enrolledFaces(Request $request, string $id)
    {
        $r = $this->face->enrolledFaces(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function enrollFace(Request $request, string $id, string $clientId)
    {
        $r = $this->face->enrollFace(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function faceProcessStatus(Request $request, string $galleryId)
    {
        $r = $this->face->faceProcessStatus(
            (string) $request->attributes->get('auth_user_id'),
            (int) $galleryId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function faceResultsAdmin(Request $request, string $galleryId)
    {
        $r = $this->face->faceResultsAdmin(
            (string) $request->attributes->get('auth_user_id'),
            (int) $galleryId,
            $request->query()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function faceDetail(Request $request, string $galleryId, string $photoId)
    {
        $r = $this->face->faceDetail(
            (string) $request->attributes->get('auth_user_id'),
            (int) $galleryId,
            (int) $photoId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function autoSeparateJobLatest(Request $request, string $id)
    {
        $r = $this->face->autoSeparateJobLatest(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function autoSeparateJobsList(Request $request, string $id)
    {
        $r = $this->face->autoSeparateJobsList(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->query()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function autoSeparateByFace(Request $request, string $id)
    {
        $r = $this->face->autoSeparateByFace(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function cancelAutoSeparateJob(Request $request, string $id, string $jobId)
    {
        $r = $this->face->cancelAutoSeparateJob(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $jobId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function startAutoSeparateJob(Request $request, string $id)
    {
        $r = $this->face->startAutoSeparateJob(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function processPhotoFaces(Request $request, string $galleryId, string $photoId)
    {
        $r = $this->face->processPhotoFaces(
            (string) $request->attributes->get('auth_user_id'),
            (int) $galleryId,
            (int) $photoId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function processAllFaces(Request $request, string $galleryId)
    {
        $r = $this->face->processAllFaces(
            (string) $request->attributes->get('auth_user_id'),
            (int) $galleryId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function configFinalizacao(Request $request, string $galleryId)
    {
        $gid = (int) $galleryId;
        if ($gid < 1) {
            return response('galleryId inválido', 400)->header('X-Conecta-Engine', 'laravel');
        }
        $userId = (string) $request->attributes->get('auth_user_id');
        $g = \Illuminate\Support\Facades\DB::selectOne(
            'SELECT g.id, g.nome_projeto
             FROM king_galleries g
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE g.id = ? AND pi.user_id = ? LIMIT 1',
            [$gid, $userId]
        );
        if (! $g) {
            return response('Galeria não encontrada.', 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view('cartao.ks-config-finalizacao', [
                'galleryId' => $gid,
                'nomeProjeto' => (string) ($g->nome_projeto ?? ''),
                'apiBase' => '/api/king-selection',
            ])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function aiShareText(Request $request, string $id)
    {
        $r = $this->ai->shareText(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function aiSalesWhatsappTemplate(Request $request, string $id)
    {
        $r = $this->ai->salesWhatsappTemplate(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function aiSupportDefaultMessage(Request $request, string $id)
    {
        $r = $this->ai->supportDefaultMessage(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function listEditRequestsAdmin(Request $request, string $id)
    {
        $r = $this->admin->listEditRequestsAdmin(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateEditRequest(Request $request, string $id, string $requestId)
    {
        $r = $this->admin->updateEditRequest(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $requestId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteEditRequest(Request $request, string $id, string $requestId)
    {
        $r = $this->admin->deleteEditRequest(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $requestId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteSelectionBatch(Request $request, string $id, string $clientId)
    {
        $r = $this->admin->deleteSelectionBatch(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function reactivateSelectionBatch(Request $request, string $id, string $clientId)
    {
        $r = $this->admin->reactivateSelectionBatch(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function clearReview(Request $request, string $id, string $clientId)
    {
        $r = $this->admin->clearReview(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function exportGallery(Request $request, string $id)
    {
        $r = $this->admin->exportGallery(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->query('batch'),
            $request->query('clientId')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function getClientPassword(Request $request, string $id, string $clientId)
    {
        $r = $this->admin->getClientPassword(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $clientId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }


    public function uploadLinkCover(Request $request, string $id)
    {
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['message' => 'Arquivo de capa é obrigatório.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            $status = str_contains((string) ($check['message'] ?? ''), 'grande') ? 413 : 400;
            $body = $status === 413
                ? ['success' => false, 'message' => $check['message']]
                : ['message' => $check['message'] ?? 'Arquivo inválido.'];

            return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
        }
        $r = $this->admin->uploadLinkCover(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $check['binary'],
            $check['mime'],
            (string) ($file->getClientOriginalName() ?: 'link-cover.jpg'),
            $this->r2
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function linkCoverPreview(Request $request, string $id)
    {
        $r = $this->admin->linkCoverPreview(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $this->media
        );
        if (($r['status'] ?? 500) !== 200 || empty($r['binary'])) {
            return response((string) ($r['message'] ?? 'Erro'), (int) ($r['status'] ?? 500))
                ->header('Content-Type', 'text/plain')
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response($r['binary'], 200)
            ->header('Content-Type', $r['contentType'] ?? 'image/jpeg')
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function editedUpload(Request $request, string $id, string $photoId)
    {
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['message' => 'Arquivo editado é obrigatório.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            $status = str_contains((string) ($check['message'] ?? ''), 'grande') ? 413 : 400;
            $body = $status === 413
                ? ['success' => false, 'message' => $check['message']]
                : ['message' => $check['message'] ?? 'Arquivo inválido.'];

            return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
        }
        $r = $this->admin->editedUpload(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $photoId,
            $check['binary'],
            $check['mime'],
            (string) ($file->getClientOriginalName() ?: 'edited.jpg'),
            $this->r2
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function patchPhoto(Request $request, string $photoId)
    {
        $r = $this->admin->patchPhoto(
            (string) $request->attributes->get('auth_user_id'),
            (int) $photoId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deletePhoto(Request $request, string $photoId)
    {
        $r = $this->admin->deletePhoto(
            (string) $request->attributes->get('auth_user_id'),
            (int) $photoId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function replacePhotoR2(Request $request, string $photoId)
    {
        $r = $this->admin->replacePhotoR2(
            (string) $request->attributes->get('auth_user_id'),
            (int) $photoId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function replacePhotoCf(Request $request, string $photoId)
    {
        $r = $this->admin->replacePhotoCf(
            (string) $request->attributes->get('auth_user_id'),
            (int) $photoId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function replacePhotoProxy(Request $request, string $photoId)
    {
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['message' => 'Arquivo é obrigatório'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            $status = str_contains((string) ($check['message'] ?? ''), 'grande') ? 413 : 400;
            $body = $status === 413
                ? ['success' => false, 'message' => $check['message']]
                : ['message' => $check['message'] ?? 'Arquivo inválido.'];

            return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
        }
        $r = $this->admin->replacePhotoProxy(
            (string) $request->attributes->get('auth_user_id'),
            (int) $photoId,
            $check['binary'],
            $check['mime'],
            (string) ($request->input('original_name') ?: $file->getClientOriginalName() ?: 'foto.jpg'),
            $this->r2
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function adminPhotoPreview(Request $request, string $photoId)
    {
        $r = $this->admin->adminPhotoPreview(
            (string) $request->attributes->get('auth_user_id'),
            (int) $photoId,
            $request->query(),
            $this->media
        );
        if (($r['status'] ?? 500) !== 200 || empty($r['binary'])) {
            $status = (int) ($r['status'] ?? 500);
            $msg = (string) ($r['message'] ?? 'Erro');
            if ($status >= 400 && $status < 500) {
                return response($msg, $status)
                    ->header('Content-Type', 'text/plain')
                    ->header('X-Conecta-Engine', 'laravel');
            }

            return response()->json(['message' => $msg], $status)->header('X-Conecta-Engine', 'laravel');
        }

        return response($r['binary'], 200)
            ->header('Content-Type', $r['contentType'] ?? 'image/jpeg')
            ->header('Cache-Control', 'private, max-age=86400')
            ->header('Cross-Origin-Resource-Policy', 'cross-origin')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function adminPhotoDownload(Request $request, string $photoId)
    {
        $r = $this->admin->adminPhotoDownload(
            (string) $request->attributes->get('auth_user_id'),
            (int) $photoId,
            $this->media
        );
        if (($r['status'] ?? 500) !== 200 || empty($r['binary'])) {
            return response((string) ($r['message'] ?? 'Erro'), (int) ($r['status'] ?? 500))
                ->header('Content-Type', 'text/plain')
                ->header('X-Conecta-Engine', 'laravel');
        }
        $filename = (string) ($r['filename'] ?? ('foto-'.$photoId.'.jpg'));

        return response($r['binary'], 200)
            ->header('Content-Type', 'image/jpeg')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function watermarkSuggestScales(Request $request, string $id)
    {
        $r = $this->admin->watermarkSuggestScales(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->query()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateFolder(Request $request, string $id, string $folderId)
    {
        $r = $this->admin->updateFolder(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            (int) $folderId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    // -------------------------------------------------------------------------
    // R2 Inventory & Cleanup
    // -------------------------------------------------------------------------

    public function r2Inventory(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id');
        if (! $userId) {
            return response()->json(['message' => 'Não autenticado.'], 401);
        }

        if (! $this->r2->isEnabled()) {
            return response()->json(['message' => 'R2 não está configurado neste servidor.'], 503);
        }

        // 1. Listar todos os objetos em galleries/ no R2 (paginado)
        $allObjects = [];
        $token = null;
        $maxRounds = 30; // máx ~30.000 objetos por chamada
        do {
            $page = $this->r2->listObjects('galleries/', 1000, $token);
            if ($page === null) {
                return response()->json(['message' => 'Erro ao listar objetos no R2.'], 502);
            }
            $allObjects = array_merge($allObjects, $page['objects']);
            $token = $page['nextToken'];
            $maxRounds--;
        } while ($page['truncated'] && $token && $maxRounds > 0);

        // 2. Buscar galerias do usuário no banco (via profile_items)
        $galleries = \Illuminate\Support\Facades\DB::table('king_galleries as g')
            ->join('profile_items as pi', 'pi.id', '=', 'g.profile_item_id')
            ->where('pi.user_id', $userId)
            ->whereNull('g.deleted_at')
            ->select(['g.id', 'g.nome_projeto as nome', 'g.slug', 'g.created_at'])
            ->orderBy('g.id', 'desc')
            ->get()
            ->keyBy('id');

        $userGalleryIds = $galleries->keys()->map(fn ($k) => (int) $k)->toArray();
        $userGallerySet = array_flip($userGalleryIds);

        // Todas as galerias existentes (ativas) no banco
        $allExistingGalleryIds = \Illuminate\Support\Facades\DB::table('king_galleries')
            ->whereNull('deleted_at')
            ->pluck('id')
            ->map(fn ($k) => (int) $k)
            ->toArray();
        $allExistingGallerySet = array_flip($allExistingGalleryIds);

        // 3. Buscar todas as chaves de fotos no banco
        // file_path é salvo como 'r2:galleries/ID/uuid.ext' — remover o prefixo 'r2:' ao indexar
        $dbKeys = [];
        if (\App\Support\SchemaMeta::hasColumn('king_photos', 'file_path')) {
            $paths = \Illuminate\Support\Facades\DB::table('king_photos')
                ->where('file_path', 'like', 'r2:galleries/%')
                ->pluck('file_path')
                ->toArray();
            foreach ($paths as $p) {
                $key = preg_replace('/^r2:/', '', $p);
                $dbKeys[$key] = true;
                $thumb = preg_replace('/(\.[^.]+)$/', '_t360$1', $key);
                if ($thumb !== $key) {
                    $dbKeys[$thumb] = true;
                }
            }
        }

        // Contagem de fotos no BD para as galerias do usuário
        $dbPhotoCounts = [];
        if ($userGalleryIds !== []) {
            $dbPhotoCounts = \Illuminate\Support\Facades\DB::table('king_photos')
                ->whereIn('gallery_id', $userGalleryIds)
                ->selectRaw('gallery_id, count(*) as cnt')
                ->groupBy('gallery_id')
                ->pluck('cnt', 'gallery_id')
                ->mapWithKeys(fn ($cnt, $gid) => [(int) $gid => (int) $cnt])
                ->toArray();
        }

        // 4. Agrupar objetos R2
        $r2ByGallery = [];
        $orphanFoldersMap = [];
        $allUserOrphans = [];

        foreach ($allObjects as $obj) {
            $key = $obj['key'];
            if (! preg_match('#^galleries/(\d+)/#', $key, $m)) {
                continue;
            }
            $gid = (int) $m[1];
            $rel = substr($key, strlen("galleries/{$gid}/"));
            $subfolder = dirname($rel);
            if ($subfolder === '.' || $subfolder === '/') {
                $subfolder = '';
            }

            $isOrphan = ! isset($dbKeys[$key]);

            // Se pertencer às galerias do usuário
            if (isset($userGallerySet[$gid])) {
                if (! isset($r2ByGallery[$gid])) {
                    $r2ByGallery[$gid] = [
                        'files'        => 0,
                        'bytes'        => 0,
                        'orphanFiles'  => 0,
                        'lastModified' => '',
                        'subfolders'   => [],
                    ];
                }
                $r2ByGallery[$gid]['files']++;
                $r2ByGallery[$gid]['bytes'] += $obj['size'];
                if ($obj['lastModified'] > $r2ByGallery[$gid]['lastModified']) {
                    $r2ByGallery[$gid]['lastModified'] = $obj['lastModified'];
                }

                if ($subfolder !== '') {
                    if (! isset($r2ByGallery[$gid]['subfolders'][$subfolder])) {
                        $r2ByGallery[$gid]['subfolders'][$subfolder] = [
                            'name'        => $subfolder,
                            'files'       => 0,
                            'bytes'       => 0,
                            'orphanFiles' => 0,
                        ];
                    }
                    $r2ByGallery[$gid]['subfolders'][$subfolder]['files']++;
                    $r2ByGallery[$gid]['subfolders'][$subfolder]['bytes'] += $obj['size'];
                    if ($isOrphan) {
                        $r2ByGallery[$gid]['subfolders'][$subfolder]['orphanFiles']++;
                    }
                }

                if ($isOrphan) {
                    $r2ByGallery[$gid]['orphanFiles']++;
                    $allUserOrphans[] = [
                        'fileName'  => basename($key),
                        'key'       => $key,
                        'galleryId' => $gid,
                        'subfolder' => $subfolder,
                        'size'      => $obj['size'],
                        'uploaded'  => $obj['lastModified'],
                    ];
                }
            } elseif (! isset($allExistingGallerySet[$gid])) {
                // Pasta de projeto que já foi excluído do sistema
                if (! isset($orphanFoldersMap[$gid])) {
                    $orphanFoldersMap[$gid] = [
                        'galleryId'    => $gid,
                        'r2Files'      => 0,
                        'r2Bytes'      => 0,
                        'lastUploaded' => '',
                        'subfolders'   => [],
                    ];
                }
                $orphanFoldersMap[$gid]['r2Files']++;
                $orphanFoldersMap[$gid]['r2Bytes'] += $obj['size'];
                if ($obj['lastModified'] > $orphanFoldersMap[$gid]['lastUploaded']) {
                    $orphanFoldersMap[$gid]['lastUploaded'] = $obj['lastModified'];
                }

                if ($subfolder !== '') {
                    if (! isset($orphanFoldersMap[$gid]['subfolders'][$subfolder])) {
                        $orphanFoldersMap[$gid]['subfolders'][$subfolder] = [
                            'name'        => $subfolder,
                            'files'       => 0,
                            'bytes'       => 0,
                            'orphanFiles' => 0,
                        ];
                    }
                    $orphanFoldersMap[$gid]['subfolders'][$subfolder]['files']++;
                    $orphanFoldersMap[$gid]['subfolders'][$subfolder]['bytes'] += $obj['size'];
                    if ($isOrphan) {
                        $orphanFoldersMap[$gid]['subfolders'][$subfolder]['orphanFiles']++;
                    }
                }

                if ($isOrphan) {
                    $allUserOrphans[] = [
                        'fileName'  => basename($key),
                        'key'       => $key,
                        'galleryId' => $gid,
                        'subfolder' => $subfolder,
                        'size'      => $obj['size'],
                        'uploaded'  => $obj['lastModified'],
                    ];
                }
            }
        }

        // 5. Montar lista de projetos (frontend expects 'projects')
        $projectsList = [];
        $userProjectsWithR2 = 0;
        foreach ($galleries as $gid => $g) {
            $r2 = $r2ByGallery[$gid] ?? null;
            $r2Files = $r2['files'] ?? 0;
            $r2Bytes = $r2['bytes'] ?? 0;
            $orphanCount = $r2['orphanFiles'] ?? 0;
            if ($r2Files > 0) {
                $userProjectsWithR2++;
            }
            $status = ($r2Files === 0) ? 'sem_arquivos_r2' : (($orphanCount > 0) ? 'com_orfaos' : 'ok');
            $subfoldersList = array_values($r2['subfolders'] ?? []);

            $projectsList[] = [
                'galleryId'    => (int) $gid,
                'nome'         => $g->nome ?? "Galeria {$gid}",
                'slug'         => $g->slug ?? '',
                'dbPhotos'     => $dbPhotoCounts[$gid] ?? 0,
                'r2Files'      => $r2Files,
                'orphanFiles'  => $orphanCount,
                'r2Bytes'      => $r2Bytes,
                'lastUploaded' => $r2['lastModified'] ?? null,
                'subfolders'   => $subfoldersList,
                'status'       => $status,
            ];
        }

        // 6. Resumo geral (frontend expects data.summary)
        $orphanBytesTotal = array_sum(array_column($allUserOrphans, 'size'));
        $summary = [
            'r2TotalFiles'         => count($allObjects),
            'r2TotalBytes'         => array_sum(array_column($allObjects, 'size')),
            'referencedInDb'       => count($dbKeys),
            'orphanFiles'          => count($allUserOrphans),
            'orphanBytes'          => $orphanBytesTotal,
            'userProjects'         => count($galleries),
            'userProjectsWithR2'   => $userProjectsWithR2,
            'orphanProjectFolders' => count($orphanFoldersMap),
        ];

        // Formatar subfolders em orphanFolders para lista indexada
        $orphanFoldersList = [];
        foreach ($orphanFoldersMap as $f) {
            $f['subfolders'] = array_values($f['subfolders'] ?? []);
            $orphanFoldersList[] = $f;
        }

        return response()->json([
            'generatedAt'            => now()->toIso8601String(),
            'summary'                => $summary,
            'projects'               => $projectsList,
            'orphanFolders'          => $orphanFoldersList,
            'orphanSamples'          => array_slice($allUserOrphans, 0, 100),
            'orphanSamplesTruncated' => count($allUserOrphans) > 100,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function cleanupR2(Request $request)
    {
        $userId = (string) $request->attributes->get('auth_user_id');
        if (! $userId) {
            return response()->json(['message' => 'Não autenticado.'], 401);
        }
        if (! $this->r2->isEnabled()) {
            return response()->json(['message' => 'R2 não está configurado.'], 503);
        }

        $body = $request->json()->all();
        $dryRun = (bool) ($body['dryRun'] ?? true);
        $confirm = (string) ($body['confirm'] ?? '');

        if (! $dryRun && $confirm !== 'SIM') {
            return response()->json(['message' => 'Confirmação inválida. Envie confirm: "SIM".'], 422);
        }

        // Galerias do usuário
        $allGalleryIds = \Illuminate\Support\Facades\DB::table('king_galleries as g')
            ->join('profile_items as pi', 'pi.id', '=', 'g.profile_item_id')
            ->where('pi.user_id', $userId)
            ->pluck('g.id')
            ->map(fn ($k) => (int) $k)
            ->toArray();

        $userGallerySet = array_flip($allGalleryIds);

        $dbKeys = [];
        if (\App\Support\SchemaMeta::hasColumn('king_photos', 'file_path')) {
            $paths = \Illuminate\Support\Facades\DB::table('king_photos')
                ->whereIn('gallery_id', $allGalleryIds)
                ->where('file_path', 'like', 'r2:galleries/%')
                ->pluck('file_path')
                ->toArray();
            foreach ($paths as $p) {
                $key = preg_replace('/^r2:/', '', $p);
                $dbKeys[$key] = true;
                $thumb = preg_replace('/(\.[^.]+)$/', '_t360$1', $key);
                if ($thumb !== $key) {
                    $dbKeys[$thumb] = true;
                }
            }
        }

        // Listar R2
        $allObjects = [];
        $token = null;
        $maxRounds = 30;
        do {
            $page = $this->r2->listObjects('galleries/', 1000, $token);
            if ($page === null) {
                return response()->json(['message' => 'Erro ao listar R2.'], 502);
            }
            $allObjects = array_merge($allObjects, $page['objects']);
            $token = $page['nextToken'];
            $maxRounds--;
        } while ($page['truncated'] && $token && $maxRounds > 0);

        $orphanKeys = [];
        foreach ($allObjects as $obj) {
            $key = $obj['key'];
            if (! preg_match('#^galleries/(\d+)/#', $key, $m)) {
                continue;
            }
            $gid = (int) $m[1];
            // Só limpar órfãos de galerias DO usuário
            if (! isset($userGallerySet[$gid])) {
                continue;
            }
            if (! isset($dbKeys[$key])) {
                $orphanKeys[] = $key;
            }
        }

        if ($dryRun) {
            return response()->json([
                'dryRun'     => true,
                'total'      => count($allObjects),
                'orphans'    => count($orphanKeys),
                'referenced' => count($dbKeys),
            ]);
        }

        // Apagar órfãos
        $deleted = 0;
        $errors = 0;
        foreach ($orphanKeys as $key) {
            if ($this->r2->deleteObject($key)) {
                $deleted++;
            } else {
                $errors++;
            }
        }

        return response()->json([
            'deleted' => $deleted,
            'errors'  => $errors,
            'total'   => count($allObjects),
            'orphans' => count($orphanKeys),
        ])->header('X-Conecta-Engine', 'laravel');
    }
}

