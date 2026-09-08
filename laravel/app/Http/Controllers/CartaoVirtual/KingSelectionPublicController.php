<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\KingSelectionPublicService;
use Illuminate\Http\Request;

class KingSelectionPublicController extends Controller
{
    public function __construct(private readonly KingSelectionPublicService $ks)
    {
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

    public function show(string $slug)
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

        return response()
            ->view('cartao.ks-public', $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }
}
