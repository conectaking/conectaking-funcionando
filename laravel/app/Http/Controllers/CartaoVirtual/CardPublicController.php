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
        $qs = $request->getQueryString();
        $queryString = $qs ? '?'.$qs : '';

        $result = $this->service->getPageData($slug, $origin, $queryString);

        return match ($result['type']) {
            'notFound' => response($result['message'] ?? 'Not found', 404),
            'redirect' => redirect($result['url'], $result['statusCode'] ?? 301),
            'inactive' => response()->view('cartao.inactive', [], 200),
            'render' => response()
                ->view('cartao.public', $result['data'])
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0')
                ->header('Pragma', 'no-cache')
                ->header('X-Conecta-Engine', 'laravel'),
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
