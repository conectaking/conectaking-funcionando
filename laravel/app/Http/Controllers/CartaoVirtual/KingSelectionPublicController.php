<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\KingSelectionMediaService;
use App\Services\CartaoVirtual\KingSelectionPublicService;
use Illuminate\Http\Request;

class KingSelectionPublicController extends Controller
{
    public function __construct(
        private readonly KingSelectionPublicService $ks,
        private readonly KingSelectionMediaService $media,
    ) {
    }

    public function gallery(Request $request)
    {
        $slug = trim((string) $request->query('slug', ''));
        $result = $this->ks->publicGallery($slug);

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function shareMeta(Request $request, string $slug)
    {
        $host = (string) ($request->query('siteHost') ?: $request->header('x-forwarded-host') ?: $request->getHost());
        $result = $this->ks->shareMeta($slug, $host);

        return response()->json($result['body'], $result['status'])
            ->header('Cache-Control', 'public, max-age=300')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function show(Request $request, string $slug)
    {
        $result = $this->ks->landing($slug);
        if ($result['status'] !== 200) {
            return response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>King Selection</title></head>'
                .'<body style="font-family:system-ui;background:#0D0D0F;color:#ECECEC;text-align:center;padding:3rem">'
                .'<h1>'.e($result['message'] ?? 'Galeria não encontrada').'</h1></body></html>',
                $result['status']
            )->header('X-Conecta-Engine', 'laravel');
        }

        // Cliente KS canónico: Blade pages/kingSelectionCliente (sem SPA HTML legada).
        // ?landing=1 mantém a landing read-only (cartao.ks-public).
        if ((string) $request->query('landing', '') === '1') {
            return response()
                ->view('cartao.ks-public', $result['data'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        $boot = '<script>window.__KS_LARAVEL_ENGINE=true;window.__KS_BOOT_SLUG='
            .json_encode($slug, JSON_UNESCAPED_UNICODE)
            .';</script>';

        return response()
            ->view('pages.kingSelectionCliente', [
                'ksBootScript' => $boot,
                'ksSlug' => $slug,
                'gallery' => $result['data']['gallery'] ?? null,
            ])
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function cover(Request $request)
    {
        $slug = trim((string) $request->query('slug', ''));
        if ($slug === '') {
            return response('slug é obrigatório', 400)->header('X-Conecta-Engine', 'laravel');
        }
        $result = $this->media->coverJpeg($slug);
        if (($result['status'] ?? 500) !== 200) {
            return response($result['message'] ?? 'erro', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response($result['binary'], 200)
            ->header('Content-Type', $result['contentType'] ?? 'image/jpeg')
            ->header('Cache-Control', 'public, max-age=900')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function ogImage(Request $request)
    {
        $slug = trim((string) $request->query('slug', ''));
        if ($slug === '') {
            return response('slug é obrigatório', 400)->header('X-Conecta-Engine', 'laravel');
        }
        $result = $this->media->ogImageJpeg($slug);
        if (($result['status'] ?? 500) !== 200) {
            return response($result['message'] ?? 'erro', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response($result['binary'], 200)
            ->header('Content-Type', $result['contentType'] ?? 'image/jpeg')
            ->header('Cache-Control', 'public, max-age=900')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function galleryContent(Request $request)
    {
        $slug = trim((string) $request->query('slug', ''));
        $limitRaw = $request->query('limit');
        $limit = ($limitRaw !== null && $limitRaw !== '') ? (int) $limitRaw : null;
        $offset = max(0, (int) $request->query('offset', 0));
        $result = $this->ks->galleryContent($slug, $limit, $offset);

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function entrySplash(Request $request)
    {
        $slug = trim((string) $request->query('slug', ''));
        if ($slug === '') {
            return response('slug é obrigatório', 400)
                ->header('Content-Type', 'text/plain; charset=UTF-8')
                ->header('X-Conecta-Engine', 'laravel');
        }
        $result = $this->media->coverJpeg($slug, 1600);
        if (($result['status'] ?? 500) !== 200) {
            return response($result['message'] ?? 'erro', $result['status'])
                ->header('Content-Type', 'text/plain; charset=UTF-8')
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response($result['binary'], 200)
            ->header('Content-Type', $result['contentType'] ?? 'image/jpeg')
            ->header('Cache-Control', 'public, max-age=600')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function publicPreview(Request $request, string $photoId)
    {
        $slug = trim((string) $request->query('slug', ''));
        if ($slug === '') {
            return response('slug é obrigatório', 400)->header('X-Conecta-Engine', 'laravel');
        }
        if ((string) $request->query('download', '') === '1') {
            return response('Cadastre-se na galeria para baixar fotos. Use o link com login do cliente.', 403)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $thumb = in_array(strtolower((string) ($request->query('thumb') ?: $request->query('size') ?: '')), ['1', 'true', 'thumb', 's'], true);
        $result = $this->media->publicPreviewJpeg($slug, (int) $photoId, $thumb);
        if (($result['status'] ?? 500) !== 200) {
            return response($result['message'] ?? 'erro', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response($result['binary'], 200)
            ->header('Content-Type', $result['contentType'] ?? 'image/jpeg')
            ->header('Cross-Origin-Resource-Policy', 'cross-origin')
            ->header('Cache-Control', 'public, max-age=300')
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function myPhotos(Request $request, string $slug)
    {
        $token = trim((string) ($request->query('clientToken') ?: $request->header('X-Client-Token') ?: ''));
        $face = app(\App\Services\CartaoVirtual\KingSelectionFaceService::class);
        $r = $face->publicMyPhotos($slug, $token, $request->query());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function enrollFaceAnonymous(Request $request)
    {
        $slug = trim((string) ($request->query('slug') ?: $request->input('slug') ?: ''));
        $visitorId = $request->query('visitorId') ?: $request->input('visitorId');
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
        $r = $face->enrollFaceAnonymous(
            $slug,
            $check['binary'],
            $visitorId !== null ? (string) $visitorId : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
