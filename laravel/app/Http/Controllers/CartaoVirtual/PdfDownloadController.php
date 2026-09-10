<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PdfDownloadController extends Controller
{
    public function show(string $itemId)
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return response('Arquivo não encontrado.', 404)->header('X-Conecta-Engine', 'laravel');
        }

        $row = DB::selectOne(
            'SELECT pdf_url, title FROM profile_items WHERE id = ? LIMIT 1',
            [(int) $itemId]
        );

        if (!$row || empty($row->pdf_url)) {
            return response('Arquivo não encontrado.', 404)->header('X-Conecta-Engine', 'laravel');
        }

        $pdfUrl = (string) $row->pdf_url;
        if (! \App\Support\SafeRemoteUrl::isAllowed($pdfUrl)) {
            return response('URL do PDF não permitida.', 400)->header('X-Conecta-Engine', 'laravel');
        }

        try {
            $remote = Http::timeout(20)
                ->withOptions(['allow_redirects' => ['max' => 2]])
                ->withHeaders(['User-Agent' => 'ConectaKing-PDF/1.0'])
                ->get($pdfUrl);
            if (!$remote->successful()) {
                return response('Não foi possível baixar o arquivo.', 500)->header('X-Conecta-Engine', 'laravel');
            }

            $body = $remote->body();
            if (strlen($body) > 25 * 1024 * 1024) {
                return response('Arquivo demasiado grande.', 413)->header('X-Conecta-Engine', 'laravel');
            }

            $title = trim((string) ($row->title ?? ''));
            $safe = $title !== ''
                ? strtolower(preg_replace('/[^a-z0-9]+/i', '_', $title) ?? 'documento')
                : 'documento';
            $filename = rtrim($safe, '_').'.pdf';

            return response($body, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename='.$filename,
                'X-Conecta-Engine' => 'laravel',
            ]);
        } catch (\Throwable $e) {
            Log::warning('pdf.download', ['error' => $e->getMessage(), 'itemId' => $itemId]);

            return response('Não foi possível baixar o arquivo.', 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
