<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Http\Requests\KingSelection\LoginByDetailsRequest;
use App\Http\Requests\KingSelection\RegisterClientRequest;
use App\Services\CartaoVirtual\KingSelectionClientExtrasService;
use App\Services\CartaoVirtual\KingSelectionClientService;
use App\Services\CartaoVirtual\KingSelectionSelectionService;
use App\Services\CartaoVirtual\KingSelectionZipService;
use Illuminate\Http\Request;

class KingSelectionClientController extends Controller
{
    public function __construct(
        private readonly KingSelectionClientService $ks,
        private readonly KingSelectionSelectionService $selection,
        private readonly KingSelectionClientExtrasService $extras,
        private readonly KingSelectionZipService $zip,
    ) {
    }

    public function login(Request $request)
    {
        $r = $this->ks->login(
            (string) ($request->input('slug') ?: ''),
            (string) ($request->input('email') ?: ''),
            (string) ($request->input('senha') ?: '')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function loginByDetails(LoginByDetailsRequest $request)
    {
        $r = $this->ks->loginByDetails(
            (string) $request->input('slug'),
            (string) $request->input('nome'),
            (string) $request->input('email'),
            $request->input('telefone') !== null ? (string) $request->input('telefone') : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function register(RegisterClientRequest $request)
    {
        $r = $this->ks->register(
            (string) $request->input('slug'),
            (string) $request->input('nome'),
            (string) $request->input('email'),
            $request->input('telefone') !== null ? (string) $request->input('telefone') : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function publicEnter(Request $request)
    {
        $r = $this->ks->publicEnter((string) ($request->input('slug') ?: ''));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function signupEnter(Request $request)
    {
        $r = $this->ks->signupEnter((string) ($request->input('slug') ?: ''));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function select(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $r = $this->selection->select(
            $payload,
            (string) ($request->input('slug') ?: ''),
            $request->input('photo_id')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function selectBulk(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $ids = $request->input('photo_ids');
        $r = $this->selection->selectBulk(
            $payload,
            (string) ($request->input('slug') ?: ''),
            (string) ($request->input('mode') ?: ''),
            is_array($ids) ? $ids : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function finalize(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $r = $this->selection->finalize(
            $payload,
            (string) ($request->input('slug') ?: ''),
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function export(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $r = $this->extras->export($payload, (string) $request->query('slug', ''));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createEditRequest(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $ids = $request->input('photo_ids');
        $r = $this->extras->createEditRequest(
            $payload,
            (string) ($request->input('slug') ?: ''),
            is_array($ids) ? $ids : [],
            $request->input('note') !== null ? (string) $request->input('note') : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function listEditRequests(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $r = $this->extras->listEditRequests($payload, (string) $request->query('slug', ''));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function cancelEditRequest(Request $request, string $requestId)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $slug = (string) ($request->input('slug') ?: $request->query('slug', ''));
        $r = $this->extras->cancelEditRequest($payload, $slug, (int) $requestId);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function gallery(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $slug = (string) $request->query('slug', '');
        $limitRaw = $request->query('limit');
        $limit = ($limitRaw !== null && $limitRaw !== '') ? (int) $limitRaw : null;
        $offset = max(0, (int) $request->query('offset', 0));
        $r = $this->ks->clientGallery($payload, $slug, $limit, $offset);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function preview(Request $request, string $photoId)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $slugQ = trim((string) $request->query('slug', ''));
        if ($slugQ !== '' && $slugQ !== (string) ($payload['slug'] ?? '')) {
            return response('Sem permissão', 403)->header('X-Conecta-Engine', 'laravel');
        }
        if ((string) $request->query('download', '') === '1') {
            $payload = (array) $request->attributes->get('ks_client', []);
            $thumb = false;
            $r = $this->ks->clientPreview($payload, (int) $photoId, $thumb);
            if (($r['status'] ?? 500) !== 200) {
                return response($r['message'] ?? 'erro', $r['status'])->header('X-Conecta-Engine', 'laravel');
            }

            return response($r['binary'], 200)
                ->header('Content-Type', $r['contentType'] ?? 'image/jpeg')
                ->header('Content-Disposition', 'attachment; filename="foto-'.$photoId.'.jpg"')
                ->header('Cross-Origin-Resource-Policy', 'cross-origin')
                ->header('X-Conecta-Engine', 'laravel');
        }
        $thumb = in_array(strtolower((string) ($request->query('thumb') ?: $request->query('size') ?: '')), ['1', 'true', 'thumb', 's'], true);
        $r = $this->ks->clientPreview($payload, (int) $photoId, $thumb);
        if (($r['status'] ?? 500) !== 200) {
            return response($r['message'] ?? 'erro', $r['status'])->header('X-Conecta-Engine', 'laravel');
        }

        return response($r['binary'], 200)
            ->header('Content-Type', $r['contentType'] ?? 'image/jpeg')
            ->header('Cross-Origin-Resource-Policy', 'cross-origin')
            ->header('Cache-Control', 'private, max-age=300')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function paymentProof(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $file = $request->file('proof');
        if (! $file) {
            return response()->json(['message' => 'Envie o comprovante.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        if ($file->getSize() > 30 * 1024 * 1024) {
            return response()->json(['message' => 'Arquivo muito grande (limite 30MB).'], 413)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = \App\Support\UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            return response()->json(['message' => $check['message'] ?? 'Apenas imagens são permitidas'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $sales = app(\App\Services\CartaoVirtual\KingSelectionSalesService::class);
        $r = $sales->submitClientPaymentProof(
            $payload,
            (string) ($request->input('slug') ?: $request->query('slug') ?: ''),
            $check['binary'],
            $check['mime'],
            $request->input('note') !== null ? (string) $request->input('note') : null,
            $request->input('amount_cents')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function promoVerify(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $r = $this->extras->promoVerify(
            $payload,
            (string) ($request->input('slug') ?: ''),
            (bool) $request->boolean('social_confirmed'),
            (string) ($request->input('coupon_code') ?: '')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function downloadZipPlan(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $r = $this->zip->downloadZipPlan($payload, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function downloadZip(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $r = $this->zip->downloadZip(
            $payload,
            $request->all(),
            $request->ip(),
            (string) $request->userAgent()
        );
        if (($r['status'] ?? 500) !== 200) {
            return response()->json($r['body'] ?? ['message' => 'Erro'], (int) ($r['status'] ?? 500))
                ->header('X-Conecta-Engine', 'laravel');
        }

        $zipPath = (string) ($r['zip_path'] ?? '');
        $filename = (string) ($r['filename'] ?? 'fotos.zip');
        if ($zipPath !== '' && is_file($zipPath)) {
            return response()->download($zipPath, $filename, [
                'Content-Type' => 'application/zip',
                'Cache-Control' => 'private, no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
                'X-KS-Zip-Entries' => (string) ($r['entries'] ?? 0),
                'X-Conecta-Engine' => 'laravel',
            ])->deleteFileAfterSend(true);
        }

        if (! empty($r['binary'])) {
            return response($r['binary'], 200)
                ->header('Content-Type', 'application/zip')
                ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
                ->header('Pragma', 'no-cache')
                ->header('Content-Disposition', 'attachment; filename="'.$filename.'"')
                ->header('X-KS-Zip-Entries', (string) ($r['entries'] ?? 0))
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json(['message' => 'ZIP vazio'], 500)
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function enrollFaceImage(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $file = $request->file('image');
        if (! $file) {
            return response()->json(['message' => 'Nenhuma imagem enviada.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = \App\Support\UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            $status = str_contains((string) ($check['message'] ?? ''), 'grande') ? 413 : 400;

            return response()->json(['message' => $check['message'] ?? 'Imagem inválida.'], $status)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $face = app(\App\Services\CartaoVirtual\KingSelectionFaceService::class);
        $r = $face->enrollClientFaceImage(
            $payload,
            $check['binary']
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function faceResults(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $face = app(\App\Services\CartaoVirtual\KingSelectionFaceService::class);
        $r = $face->clientFaceResults($payload, $request->query());

        return response()->json($r['body'], $r['status'])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function faceEnrollCache(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $face = app(\App\Services\CartaoVirtual\KingSelectionFaceService::class);
        $r = $face->clientFaceEnrollCache($payload, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function resetFaceSession(Request $request)
    {
        $payload = (array) $request->attributes->get('ks_client', []);
        $face = app(\App\Services\CartaoVirtual\KingSelectionFaceService::class);
        $r = $face->clientResetFaceSession($payload);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function searchFaceByPhoto(Request $request)
    {
        $file = $request->file('image');
        if (! $file) {
            return response()->json(['message' => 'Envie uma foto.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $check = \App\Support\UploadedFileValidator::assertImage($file, 30 * 1024 * 1024);
        if (! ($check['ok'] ?? false)) {
            $status = str_contains((string) ($check['message'] ?? ''), 'grande') ? 413 : 400;

            return response()->json(['message' => $check['message'] ?? 'Imagem inválida.'], $status)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $payload = (array) $request->attributes->get('ks_client', []);
        $face = app(\App\Services\CartaoVirtual\KingSelectionFaceService::class);
        $r = $face->searchFaceByPhoto(
            $payload,
            $check['binary']
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
