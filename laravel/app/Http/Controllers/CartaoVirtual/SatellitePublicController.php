<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleSatelliteService;
use App\Services\CartaoVirtual\FormPublicService;
use App\Services\CartaoVirtual\SalesPublicService;
use Illuminate\Http\Request;

class SatellitePublicController extends Controller
{
    public function __construct(
        private readonly FormPublicService $forms,
        private readonly BibleSatelliteService $bible,
        private readonly SalesPublicService $sales,
    ) {
    }

    public function formByToken(string $slug)
    {
        $result = $this->forms->loadByShareToken($slug);

        return $this->renderForm($result);
    }

    public function formByItem(string $slug, string $itemId)
    {
        $result = $this->forms->loadBySlugAndItem($slug, $itemId);

        return $this->renderForm($result);
    }

    public function formSubmit(Request $request, string $slug, string $itemId)
    {
        $result = $this->forms->submit($slug, $itemId, $request->all());
        $wantsHtml = str_contains(strtolower((string) $request->header('Accept', '')), 'text/html')
            && !str_contains(strtolower((string) $request->header('Accept', '')), 'application/json');

        if ($wantsHtml && ($result['status'] === 201 || ($result['body']['success'] ?? false))) {
            return response()
                ->view('cartao.form-success', [
                    'title' => 'Enviado!',
                    'message' => $result['body']['message'] ?? 'Resposta enviada com sucesso!',
                    'backUrl' => "/{$slug}/form/{$itemId}",
                ], 201)
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json($result['body'], $result['status'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function bibleHub(string $slug)
    {
        $result = $this->bible->hub($slug);
        if ($result['status'] !== 200) {
            return response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bíblia</title></head><body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;"><h1>'.e($result['message'] ?? 'Não encontrado').'</h1></body></html>',
                $result['status']
            )->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view('cartao.bible-hub', $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function bibleReader(Request $request, string $slug, string $bookId, string $chapter)
    {
        $result = $this->bible->reader($slug, $bookId, $chapter, $request->query('translation'));
        if ($result['status'] !== 200) {
            return response('<h1>'.e($result['message'] ?? 'Não encontrado').'</h1>', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view('cartao.bible-reader', $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function bibleRedirect(string $slug)
    {
        return redirect('/'.$slug.'/biblia', 302)->header('X-Conecta-Engine', 'laravel');
    }

    public function bibleStudy(string $slug, string $bookId)
    {
        $result = $this->bible->bookStudy($slug, $bookId);
        if ($result['status'] !== 200) {
            return response('<h1>'.e($result['message'] ?? 'Não encontrado').'</h1>', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view('cartao.bible-study', $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function bibleStudyRedirect(string $slug)
    {
        return redirect('/'.$slug.'/biblia', 302)->header('X-Conecta-Engine', 'laravel');
    }

    public function bibleStudyLegacyRedirect(string $slug, string $bookId)
    {
        return redirect('/'.$slug.'/biblia/estudos-livro/'.$bookId, 302)
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function bibleDevotional(string $slug, ?string $day = null)
    {
        $result = $this->bible->devotional($slug, $day);
        if ($result['status'] !== 200) {
            return response('<h1>'.e($result['message'] ?? 'Não encontrado').'</h1>', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view('cartao.bible-devotional', $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function salesStore(Request $request, string $slug, string $storeSlug)
    {
        $result = $this->sales->show($slug, $storeSlug, $request->query('token'));
        if ($result['status'] !== 200) {
            return response('<h1>'.e($result['message'] ?? 'Não encontrado').'</h1>', $result['status'])
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view('cartao.sales-public', $result['data'])
            ->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * @param  array{status:int, view?:string, data?:array<string,mixed>, message?:string}  $result
     */
    private function renderForm(array $result)
    {
        if (($result['view'] ?? '') === 'cartao.inactive') {
            return response()->view('cartao.inactive', [])->header('X-Conecta-Engine', 'laravel');
        }
        if (($result['status'] ?? 500) !== 200) {
            return response(
                '<h1>'.e($result['message'] ?? 'Erro').'</h1>',
                $result['status'] ?? 500
            )->header('X-Conecta-Engine', 'laravel');
        }

        return response()
            ->view($result['view'], $result['data'] ?? [])
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('X-Conecta-Engine', 'laravel');
    }
}
