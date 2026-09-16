<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\CartaoPublicService;
use Illuminate\Http\Request;

/**
 * Gera o manifest.json dinâmico para PWA do Cartão Virtual.
 * Cada usuário tem seu próprio manifest com nome, ícone e cor de tema.
 */
class CardPwaController extends Controller
{
    public function __construct(private readonly CartaoPublicService $service)
    {
    }

    /**
     * GET /{slug}/manifest.json
     * Retorna um Web App Manifest personalizado para instalação do cartão como PWA.
     */
    public function manifest(Request $request, string $slug): \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
    {
        $origin = $request->getSchemeAndHttpHost();
        $result = $this->service->getApiData($slug, $origin);

        if ($result['type'] === 'notFound') {
            return response()->json(['error' => 'not found'], 404);
        }

        $data    = $result['data'] ?? [];
        $details = $data['profile'] ?? $data['details'] ?? [];

        $name      = trim((string) ($details['display_name'] ?? $details['name'] ?? '')) ?: 'Meu Cartão';
        $shortName = mb_substr($name, 0, 12);
        $iconUrl   = trim((string) ($details['profile_image_url'] ?? '')) ?: 'https://i.ibb.co/60sW9k75/logo.png';
        $bgColor   = trim((string) ($details['background_color'] ?? '#0D0D0F'));
        $themeColor = trim((string) ($details['button_color'] ?? '#7C3AED'));
        $startUrl  = rtrim($origin, '/') . '/' . $slug . '?utm_source=pwa&utm_medium=homescreen';

        $manifest = [
            'name'             => $name,
            'short_name'       => $shortName,
            'description'      => trim((string) ($details['bio'] ?? '')) ?: 'Cartão de visita digital Conecta King',
            'start_url'        => $startUrl,
            'display'          => 'standalone',
            'orientation'      => 'portrait-primary',
            'background_color' => $bgColor,
            'theme_color'      => $themeColor,
            'lang'             => 'pt-BR',
            'icons'            => [
                [
                    'src'     => $iconUrl,
                    'sizes'   => '192x192',
                    'type'    => 'image/png',
                    'purpose' => 'any maskable',
                ],
                [
                    'src'     => $iconUrl,
                    'sizes'   => '512x512',
                    'type'    => 'image/png',
                    'purpose' => 'any maskable',
                ],
            ],
            'categories'       => ['business', 'productivity'],
            'prefer_related_applications' => false,
        ];

        return response(json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), 200, [
            'Content-Type'  => 'application/manifest+json; charset=utf-8',
            'Cache-Control' => 'public, max-age=3600',
            'X-Conecta-Engine' => 'laravel',
        ]);
    }
}
