<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\PersonalizarLinkService;

class OgImageController extends Controller
{
    public function __construct(private readonly PersonalizarLinkService $service)
    {
    }

    public function show()
    {
        try {
            $jpeg = $this->service->generateOgJpeg();

            return response($jpeg, 200, [
                'Content-Type' => 'image/jpeg',
                'Cache-Control' => 'public, max-age=3600',
                'Content-Length' => (string) strlen($jpeg),
                'X-Conecta-Engine' => 'laravel',
            ]);
        } catch (\Throwable $e) {
            return response('Erro ao gerar imagem.', 500)
                ->header('Content-Type', 'text/plain')
                ->header('X-Conecta-Engine', 'laravel');
        }
    }
}
