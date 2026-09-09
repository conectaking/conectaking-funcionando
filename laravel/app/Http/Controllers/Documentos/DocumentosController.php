<?php

namespace App\Http\Controllers\Documentos;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\R2StorageService;
use App\Services\Documentos\DocumentosService;
use App\Services\Documentos\ReciboOcrService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DocumentosController extends Controller
{
    public function __construct(
        private readonly DocumentosService $documentos,
        private readonly R2StorageService $r2,
        private readonly ReciboOcrService $ocr,
    ) {
    }

    public function list(Request $request)
    {
        $tipo = $request->query('tipo');
        $r = $this->documentos->list(
            (string) $request->attributes->get('auth_user_id'),
            $tipo !== null && $tipo !== '' ? (string) $tipo : null
        );

        return $this->json($r);
    }

    public function create(Request $request)
    {
        $r = $this->documentos->create(
            (string) $request->attributes->get('auth_user_id'),
            $request->all()
        );

        return $this->json($r);
    }

    public function getOne(Request $request, string $id)
    {
        $r = $this->documentos->getOne(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return $this->json($r);
    }

    public function update(Request $request, string $id)
    {
        $r = $this->documentos->update(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $request->all()
        );

        return $this->json($r);
    }

    public function remove(Request $request, string $id)
    {
        $r = $this->documentos->remove(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return $this->json($r);
    }

    public function duplicate(Request $request, string $id)
    {
        $r = $this->documentos->duplicate(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return $this->json($r);
    }

    public function getByToken(Request $request, string $token)
    {
        return $this->json($this->documentos->getByToken($token));
    }

    public function updateByToken(Request $request, string $token)
    {
        return $this->json($this->documentos->updateByToken($token, $request->all()));
    }

    public function getSettings(Request $request)
    {
        return $this->json($this->documentos->getSettings(
            (string) $request->attributes->get('auth_user_id')
        ));
    }

    public function putSettings(Request $request)
    {
        return $this->json($this->documentos->putSettings(
            (string) $request->attributes->get('auth_user_id'),
            $request->all()
        ));
    }

    public function uploadLogo(Request $request)
    {
        $file = $request->file('image');
        if (! $file) {
            return $this->json([
                'status' => 400,
                'body' => [
                    'success' => false,
                    'data' => null,
                    'message' => 'Nenhuma imagem enviada. Envie um ficheiro (ex.: logo.png).',
                    'error' => ['code' => 'ERROR', 'message' => 'Nenhuma imagem enviada. Envie um ficheiro (ex.: logo.png).'],
                ],
            ]);
        }
        $r = $this->documentos->uploadLogo(
            (string) file_get_contents($file->getRealPath()),
            (string) ($file->getMimeType() ?: 'image/png'),
            (string) ($file->getClientOriginalName() ?: 'logo.png')
        );

        return $this->json($r);
    }

    public function uploadAnexo(Request $request, string $id)
    {
        $file = $request->file('image');
        if (! $file) {
            return $this->json([
                'status' => 400,
                'body' => [
                    'success' => false,
                    'data' => null,
                    'message' => 'Nenhuma imagem enviada.',
                    'error' => ['code' => 'ERROR', 'message' => 'Nenhuma imagem enviada.'],
                ],
            ]);
        }
        $url = $this->r2->uploadImage(
            (string) file_get_contents($file->getRealPath()),
            (string) ($file->getMimeType() ?: 'image/jpeg'),
            (string) ($file->getClientOriginalName() ?: 'comprovante.jpg')
        );
        if (! $url) {
            return $this->json([
                'status' => 503,
                'body' => [
                    'success' => false,
                    'data' => null,
                    'message' => 'Erro ao enviar anexo',
                    'error' => ['code' => 'ERROR', 'message' => 'Erro ao enviar anexo'],
                ],
            ]);
        }
        $valor = $request->input('valor');
        $r = $this->documentos->addAnexo(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            [
                'url' => $url,
                'tipo_categoria' => (string) ($request->input('tipo_categoria') ?: 'Outros'),
                'valor' => $valor !== null && $valor !== '' ? (float) $valor : null,
                'descricao' => $request->input('descricao'),
            ]
        );

        return $this->json($r);
    }

    public function uploadNotaFiscalItem(Request $request, string $id)
    {
        $file = $request->file('image');
        if (! $file) {
            return $this->json([
                'status' => 400,
                'body' => [
                    'success' => false,
                    'data' => null,
                    'message' => 'Envie a foto da nota fiscal.',
                    'error' => ['code' => 'ERROR', 'message' => 'Envie a foto da nota fiscal.'],
                ],
            ]);
        }
        $itemUid = trim((string) $request->input('item_uid', ''));
        if ($itemUid === '') {
            return $this->json([
                'status' => 400,
                'body' => [
                    'success' => false,
                    'data' => null,
                    'message' => 'item_uid é obrigatório.',
                    'error' => ['code' => 'ERROR', 'message' => 'item_uid é obrigatório.'],
                ],
            ]);
        }
        $url = $this->r2->uploadImage(
            (string) file_get_contents($file->getRealPath()),
            (string) ($file->getMimeType() ?: 'image/jpeg'),
            (string) ($file->getClientOriginalName() ?: 'nota-fiscal.jpg')
        );
        if (! $url) {
            return $this->json([
                'status' => 503,
                'body' => [
                    'success' => false,
                    'data' => null,
                    'message' => 'Erro ao enviar nota fiscal',
                    'error' => ['code' => 'ERROR', 'message' => 'Erro ao enviar nota fiscal'],
                ],
            ]);
        }
        $titulo = $request->input('titulo');
        $r = $this->documentos->setItemNotaFiscal(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $itemUid,
            [
                'url' => $url,
                'titulo' => $titulo !== null ? mb_substr(trim((string) $titulo), 0, 120) : null,
            ]
        );

        return $this->json($r);
    }

    public function removeNotaFiscalItem(Request $request, string $id)
    {
        $itemUid = trim((string) $request->input('item_uid', ''));
        $r = $this->documentos->removeItemNotaFiscal(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $itemUid
        );

        return $this->json($r);
    }

    public function getPdf(Request $request, string $id)
    {
        $r = $this->documentos->getPdf(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return $this->pdfOrJson($r);
    }

    public function getPdfByToken(Request $request, string $token)
    {
        return $this->pdfOrJson($this->documentos->getPdfByToken($token));
    }

    public function ocrInfo()
    {
        return $this->json($this->documentos->ocrInfo());
    }

    public function warmOcr()
    {
        return $this->json($this->documentos->warmOcr());
    }

    public function processarComprovante(Request $request, string $id)
    {
        $docId = (int) $id;
        if ($docId < 1) {
            return $this->error('ID inválido', 400);
        }
        $file = $request->file('image');
        if (! $file) {
            return $this->error('Envie uma imagem do comprovante.', 400);
        }
        $binary = (string) file_get_contents($file->getRealPath());

        // 1) OCR primeiro: extrai valores mesmo que o resto do fluxo falhe depois
        $forceOpenAi = $this->truthy($request->input('usar_ia'));
        $itensSugeridos = [];
        $parseResult = null;
        $ocrEngine = 'tesseract';
        $openAiTentou = $forceOpenAi;
        $openAiError = null;
        $openAiAvailable = null;

        try {
            $ocrResult = $this->ocr->processarImagem($binary, $forceOpenAi);
            $itensSugeridos = $ocrResult['itensSugeridos'];
            $parseResult = $ocrResult['parseResult'];
            $ocrEngine = $ocrResult['ocrEngine'];
            $openAiTentou = $ocrResult['openAiTentou'] || $forceOpenAi;
            $openAiError = $ocrResult['openAiError'];
            $openAiAvailable = $ocrResult['openAiAvailable'];
        } catch (\Throwable $e) {
            Log::error('documentos processarComprovante OCR: '.$e->getMessage());
            if ($forceOpenAi) {
                $openAiError = $e->getMessage();
                $openAiTentou = true;
                $parseResult = ['openAiError' => $e->getMessage(), 'openAiTentou' => true];
            }
        }

        $etiquetaItens = mb_substr(trim((string) $request->input('etiqueta_itens', '')), 0, 120);
        $itensSugeridos = $this->ocr->sanitizarItensExtrato($itensSugeridos);
        if ($etiquetaItens !== '' && $itensSugeridos !== []) {
            $itensSugeridos = array_map(
                fn (array $s) => $s + ['etiqueta_ocr' => $etiquetaItens],
                $itensSugeridos
            );
        }

        // Extrato/OCR não guarda a imagem no R2 — responde mais rápido no mobile
        $url = null;

        $substituir = $this->truthy($request->input('substituir'));
        $acumularRaw = $request->input('acumular');
        $acumular = ! $substituir && ($acumularRaw === null || $this->truthy($acumularRaw));

        $result = $this->documentos->processarComprovante(
            (string) $request->attributes->get('auth_user_id'),
            $docId,
            $itensSugeridos,
            $acumular,
            $substituir,
            $url
        );
        if (! $result) {
            return $this->error('Documento não encontrado', 404);
        }

        $doc = $result['doc'];
        $stats = $result['stats'];

        $lidosNaImagem = 0;
        foreach ($itensSugeridos as $s) {
            if ((($s['status'] ?? '') === 'DECLINED') || ! empty($s['recusada']) || ! empty($s['recusado'])) {
                continue;
            }
            $nome = trim((string) ($s['nome_estabelecimento'] ?? ''));
            $desc = $nome !== '' ? $nome : (string) ($s['textoTrecho'] ?? $s['categoria'] ?? '');
            if (! preg_match('/recusad|negad|cancelad/i', $desc)) {
                $lidosNaImagem++;
            }
        }
        $stats['lidosOcr'] = max($stats['lidosOcr'] ?? 0, $lidosNaImagem);
        $stats['ocrEngine'] = $ocrEngine;
        $stats['openAiTentou'] = $openAiTentou;
        $stats['openAiError'] = $openAiError;
        if ($openAiAvailable !== null) {
            $stats['openAiAvailable'] = $openAiAvailable;
        }

        $n = (int) $stats['lidosOcr'];
        $ins = (int) ($stats['inseridos'] ?? $n);
        if ($forceOpenAi && $n === 0 && ! $stats['openAiError'] && ($stats['openAiAvailable'] ?? null) !== true) {
            $stats['openAiAvailable'] = false;
            $stats['openAiError'] = 'IA não retornou itens. Confirme OPENAI_API_KEY no servidor e redeploy da API.';
        }

        $totalNaTabela = count(is_array($doc['itens_json'] ?? null) ? $doc['itens_json'] : []);
        $msg = $this->mensagemComprovante($n, $ins, $totalNaTabela, $stats, $url !== null);

        $responseData = [
            'url' => $url,
            'documento' => $doc,
            'itensAdicionados' => $itensSugeridos,
            'stats' => $stats,
        ];
        if ($parseResult) {
            $responseData['parse_result'] = $parseResult;
        }

        return response()->json([
            'success' => true,
            'data' => $responseData,
            'error' => null,
            'message' => $msg,
        ], 201)->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * @param  array<string,mixed>  $stats
     */
    private function mensagemComprovante(int $n, int $ins, int $totalNaTabela, array $stats, bool $temUrl): string
    {
        if ($n === 0) {
            if (! empty($stats['openAiError'])) {
                return 'Não foi possível ler a imagem (IA: '.$stats['openAiError'].'). Tente outra foto ou preencha manualmente.';
            }
            if (($stats['openAiAvailable'] ?? null) === false) {
                return 'Não identificou valores. Configure OPENAI_API_KEY no servidor para leitura com IA, ou preencha manualmente.';
            }

            return $temUrl
                ? 'Imagem anexada. Preencha descrição e valor se o OCR não identificou.'
                : 'Imagem recebida mas o OCR não identificou valores. Marque "Usar IA OpenAI" e tente de novo.';
        }
        if ($ins === 0 && (int) ($stats['ignoradosDuplicata'] ?? 0) > 0) {
            return "{$n} item(ns) lidos na imagem, mas nenhum novo (já estavam na tabela). Total: {$totalNaTabela}.";
        }
        if ($ins < $n) {
            $dif = $n - $ins;

            return "{$n} item(ns) lidos na imagem, {$ins} adicionados ({$dif} já existiam). Total na tabela: {$totalNaTabela}.";
        }
        if ($n === 1) {
            if ($totalNaTabela > 1) {
                return "1 item lido da imagem. Total na tabela: {$totalNaTabela}.";
            }

            return $temUrl ? 'Comprovante processado: 1 item adicionado.' : '1 item extraído da imagem.';
        }

        return $totalNaTabela > $ins
            ? "{$n} itens lidos na imagem, {$ins} adicionados. Total na tabela: {$totalNaTabela}."
            : "{$n} itens extraídos da imagem.";
    }

    private function truthy(mixed $v): bool
    {
        if (is_bool($v)) {
            return $v;
        }

        return in_array(strtolower(trim((string) $v)), ['1', 'true', 'on', 'yes'], true);
    }

    private function error(string $message, int $status)
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => ['code' => 'ERROR', 'message' => $message],
        ], $status)->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * @param  array{status:int, body?:mixed, pdf?:string, filename?:string}  $r
     */
    private function json(array $r)
    {
        return response()->json($r['body'] ?? $r, $r['status'] ?? 200)
            ->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * @param  array{status:int, body?:mixed, pdf?:string, filename?:string}  $r
     */
    private function pdfOrJson(array $r)
    {
        if (isset($r['pdf'])) {
            return response($r['pdf'], $r['status'] ?? 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.($r['filename'] ?? 'documento.pdf').'"',
                'X-Conecta-Engine' => 'laravel',
            ]);
        }

        return $this->json($r);
    }
}
