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

        // SPA completa (JS continua no Node / mesmo host); ?landing=1 mantém a landing read-only.
        if ((string) $request->query('landing', '') === '1') {
            return response()
                ->view('cartao.ks-public', $result['data'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        $spaPath = public_path('ks-spa/kingSelectionCliente.html');
        if (! is_file($spaPath)) {
            return response()
                ->view('cartao.ks-public', $result['data'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        $html = (string) file_get_contents($spaPath);
        // Garante slug na URL da SPA (script lê location / query).
        $boot = '<script>window.__KS_LARAVEL_ENGINE=true;window.__KS_BOOT_SLUG='
            .json_encode($slug, JSON_UNESCAPED_UNICODE)
            .';</script>';
        if (str_contains($html, '</head>')) {
            $html = str_replace('</head>', $boot."\n</head>", $html);
        } else {
            $html = $boot.$html;
        }

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
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
        $result = $this->ks->galleryContent($slug);

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
        $face = app(\App\Services\CartaoVirtual\KingSelectionFaceService::class);
        $r = $face->enrollFaceAnonymous(
            $slug,
            (string) file_get_contents($file->getRealPath()),
            $visitorId !== null ? (string) $visitorId : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
