<?php

namespace App\Http\Controllers\Media;

use App\Http\Controllers\Controller;
use App\Services\Media\ImageProxyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ImageProxyController extends Controller
{
    public function __construct(private readonly ImageProxyService $images)
    {
    }

    public function profileImage(Request $request)
    {
        $imageUrl = trim((string) $request->query('url', ''));
        if ($imageUrl === '') {
            $imageUrl = ImageProxyService::FALLBACK_URL;
        }
        if (! preg_match('#^https?://#i', $imageUrl)) {
            return response()->json(['error' => 'URL da imagem inválida'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }

        try {
            try {
                $jpeg = $this->images->buildOgJpegFromUrl($imageUrl);
            } catch (\Throwable $inner) {
                Log::warning('OG profile-image: falha na URL, usando fallback', [
                    'message' => $inner->getMessage(),
                    'imageUrl' => substr($imageUrl, 0, 120),
                ]);
                $jpeg = $this->images->buildOgJpegFromUrl(ImageProxyService::FALLBACK_URL);
            }

            return response($jpeg, 200, [
                'Content-Type' => 'image/jpeg',
                'Cache-Control' => 'public, max-age=86400, stale-while-revalidate=604800',
                'Content-Length' => (string) strlen($jpeg),
                'Cross-Origin-Resource-Policy' => 'cross-origin',
                'X-Conecta-Engine' => 'laravel',
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao processar imagem OG: '.$e->getMessage());

            return response()->json(['error' => 'Erro ao processar imagem'], 500)
                ->header('X-Conecta-Engine', 'laravel');
        }
    }
}
