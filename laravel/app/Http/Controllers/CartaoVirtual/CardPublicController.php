<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\CartaoPublicService;
use Illuminate\Http\Request;

class CardPublicController extends Controller
{
    public function __construct(private readonly CartaoPublicService $service)
    {
    }

    public function show(Request $request, string $slug)
    {
        $origin = $request->getSchemeAndHttpHost();
        $publicMode = $request->headers->get('X-Conecta-Card-Public') === '1'
            || $request->boolean('public');

        // Em modo público, redirects usam /:slug (não /l/card/:slug)
        $qs = $request->getQueryString();
        $queryString = $qs ? '?'.$qs : '';

        $result = $this->service->getPageData($slug, $origin, $queryString, $publicMode);

        return match ($result['type']) {
            'notFound' => response($result['message'] ?? 'Not found', 404),
            'redirect' => redirect($result['url'], $result['statusCode'] ?? 301),
            'inactive' => response()->view('cartao.inactive', [], 200),
            'render' => response()
                ->view('cartao.public', array_merge($result['data'], [
                    'laravel_preview' => ! $publicMode,
                ]))
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0')
                ->header('Pragma', 'no-cache')
                ->header('X-Conecta-Engine', 'laravel')
                ->header('X-Conecta-Card-Public', $publicMode ? '1' : '0'),
            default => response('Not found', 404),
        };
    }

    public function api(Request $request, string $slug)
    {
        $origin = $request->getSchemeAndHttpHost();
        $result = $this->service->getApiData($slug, $origin);

        if ($result['type'] === 'notFound') {
            return response()->json(['error' => $result['message'] ?? 'Perfil não encontrado'], 404);
        }

        return response()
            ->json($result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }
}
