<?php

namespace App\Services\Documentos;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * OCR de comprovantes/extratos — porta de utils/recibo-ocr.js.
 *
 * Vision (OpenAI) é o caminho principal; o binário tesseract serve de fallback local
 * com extração por regex simples (valores R$ e datas DD/MM), sem os parsers pesados do Node.
 */
class ReciboOcrService
{
    private const PEDAGIO_HINTS = [
        'P1', 'P3', 'P4', 'P11', 'ENTREVIAS', 'EIXOSP', 'VIAPAULISTA', 'VIA COLINAS',
        'PEDÁGIO', 'PEDAGIO', 'CONCESSIONARIA', 'ROTA SO', 'TOLL',
    ];

    private ?bool $tesseractOk = null;

    public function __construct(private readonly ReciboOpenAiVisionService $vision)
    {
    }

    /** auto | always | never */
    public function mode(): string
    {
        $m = strtolower(trim((string) (env('RECIBO_OCR_AI') ?: '')));

        return $m !== '' ? $m : 'auto';
    }

    public function openAiAvailable(): bool
    {
        return $this->vision->isAvailable();
    }

    public function model(): string
    {
        return $this->vision->model();
    }

    /**
     * Aquece o OCR local — `tesseract --version` responde rápido quando o binário existe.
     */
    public function warmUp(): bool
    {
        return $this->tesseractDisponivel();
    }

    /**
     * Pipeline: OpenAI Vision quando forçado ou em modo auto/always; tesseract como fallback.
     *
     * @return array{
     *     itensSugeridos:array<int,array<string,mixed>>,
     *     parseResult:array<string,mixed>,
     *     ocrEngine:string,
     *     openAiTentou:bool,
     *     openAiError:?string,
     *     openAiAvailable:bool
     * }
     */
    public function processarImagem(string $imageBinary, bool $forceOpenAi = false): array
    {
        $disponivel = $this->openAiAvailable();
        $mode = $this->mode();

        if ($imageBinary === '') {
            return $this->resultado([], ['ocrEngine' => 'none'], 'none', false, null, $disponivel);
        }

        $tentarOpenAi = $disponivel && ($forceOpenAi || $mode === 'always' || $mode === 'auto');
        $openAiError = null;
        $openAiTentou = false;

        if ($tentarOpenAi) {
            $openAiTentou = true;
            try {
                $ai = $this->vision->extrair($imageBinary);
                $itens = $this->sanitizarItensExtrato($ai['itensSugeridos'] ?? []);
                if ($itens !== []) {
                    $parse = $ai['parseResult'] ?? [];
                    $parse['ocrEngine'] = 'openai';
                    $parse['openAiItens'] = count($ai['itensSugeridos'] ?? []);
                    $parse['itensAposSanitizar'] = count($itens);

                    return $this->resultado($itens, $parse, 'openai', true, null, true);
                }
            } catch (\Throwable $e) {
                $openAiError = $e->getMessage() ?: 'Erro na IA OpenAI';
                Log::warning('recibo-ocr openai: '.$openAiError);
            }
        }

        $tess = $this->processarComTesseract($imageBinary);
        $itensTess = $this->sanitizarItensExtrato($tess['itensSugeridos']);
        $parseResult = $tess['parseResult'];
        $parseResult['ocrEngine'] = $itensTess !== [] ? 'tesseract' : 'none';
        $parseResult['tesseractItens'] = count($tess['itensSugeridos']);
        $parseResult['itensAposSanitizar'] = count($itensTess);
        if ($openAiError !== null) {
            $parseResult['openAiError'] = $openAiError;
        } elseif (! $disponivel) {
            // Sem chave: só é erro quando a IA foi pedida; senão é apenas leitura local
            if ($forceOpenAi) {
                $parseResult['openAiError'] = 'OPENAI_API_KEY não configurada no servidor. Use a mesma chave do KingBrief.';
            } else {
                $parseResult['openAiSkipped'] = 'OPENAI_API_KEY não configurada no servidor';
            }
        }

        return $this->resultado(
            $itensTess,
            $parseResult,
            $itensTess !== [] ? 'tesseract' : 'none',
            $openAiTentou,
            $parseResult['openAiError'] ?? null,
            $disponivel
        );
    }

    /**
     * Lista final para o merge: sem recusados, nome limpo e valor > 0.
     *
     * @param  array<int,mixed>  $itens
     * @return array<int,array<string,mixed>>
     */
    public function sanitizarItensExtrato(array $itens): array
    {
        $out = [];
        foreach ($itens as $s) {
            if (! is_array($s)) {
                continue;
            }
            if ((($s['status'] ?? '') === 'DECLINED') || ! empty($s['recusada']) || ! empty($s['recusado'])) {
                continue;
            }
            $nome = trim((string) ($s['nome_estabelecimento'] ?? ''));
            $desc = $nome !== '' ? $nome : (string) ($s['textoTrecho'] ?? $s['categoria'] ?? '');
            if (preg_match('/recusad|negad|cancelad|estornad/i', $desc)) {
                continue;
            }
            $valor = round((float) ($s['valor'] ?? 0), 2);
            if ($valor <= 0) {
                continue;
            }
            $s['valor'] = $valor;
            if ($nome !== '') {
                $s['nome_estabelecimento'] = mb_substr($nome, 0, 80);
            }
            if (isset($s['textoTrecho'])) {
                $s['textoTrecho'] = mb_substr(trim((string) $s['textoTrecho']), 0, 120);
            }
            $out[] = $s;
        }

        return $out;
    }

    /**
     * @return array{itensSugeridos:array<int,array<string,mixed>>, parseResult:array<string,mixed>, ocrText:string}
     */
    private function processarComTesseract(string $imageBinary): array
    {
        $vazio = ['itensSugeridos' => [], 'parseResult' => ['source' => 'tesseract'], 'ocrText' => ''];
        if (! $this->tesseractDisponivel()) {
            return $vazio;
        }
        $texto = $this->runTesseract($imageBinary);
        if (trim($texto) === '') {
            return ['itensSugeridos' => [], 'parseResult' => ['source' => 'tesseract', 'confidence' => 0], 'ocrText' => ''];
        }

        $itens = $this->itensDoTextoOcr($texto);

        return [
            'itensSugeridos' => $itens,
            'parseResult' => [
                'source' => 'tesseract',
                'confidence' => $itens !== [] ? 0.55 : 0.1,
                'warnings' => $itens !== [] ? [] : ['OCR local não identificou valores'],
                'raw_ocr_text' => mb_substr($texto, 0, 8000),
            ],
            'ocrText' => $texto,
        ];
    }

    private function tesseractDisponivel(): bool
    {
        if ($this->tesseractOk !== null) {
            return $this->tesseractOk;
        }
        try {
            $p = new Process(['tesseract', '--version']);
            $p->setTimeout(10);
            $p->run();
            $this->tesseractOk = $p->isSuccessful();
        } catch (\Throwable $e) {
            Log::warning('recibo-ocr warmUp: '.$e->getMessage());
            $this->tesseractOk = false;
        }

        return $this->tesseractOk;
    }

    /**
     * `tesseract stdin stdout -l por`; se falhar (build sem suporte a stdin), usa ficheiro temporário.
     */
    private function runTesseract(string $imageBinary): string
    {
        try {
            $p = new Process(['tesseract', 'stdin', 'stdout', '-l', 'por', '--psm', '4']);
            $p->setTimeout(90);
            $p->setInput($imageBinary);
            $p->run();
            if ($p->isSuccessful()) {
                $out = $p->getOutput();
                if (trim($out) !== '') {
                    return $out;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('recibo-ocr tesseract stdin: '.$e->getMessage());
        }

        $tmp = tempnam(sys_get_temp_dir(), 'recibo-ocr-');
        if ($tmp === false) {
            return '';
        }
        $img = $tmp.'.jpg';
        try {
            file_put_contents($img, $imageBinary);
            $p = new Process(['tesseract', $img, 'stdout', '-l', 'por', '--psm', '4']);
            $p->setTimeout(90);
            $p->mustRun();

            return $p->getOutput();
        } catch (\Throwable $e) {
            Log::warning('recibo-ocr tesseract file: '.$e->getMessage());

            return '';
        } finally {
            @unlink($img);
            @unlink($tmp);
        }
    }

    /**
     * Extração simples: uma linha com valor R$ vira um item; a data DD/MM mais próxima é anexada.
     *
     * @return array<int,array<string,mixed>>
     */
    private function itensDoTextoOcr(string $texto): array
    {
        $linhas = preg_split('/\r?\n/', $texto) ?: [];
        $out = [];
        $dataAtual = '';
        foreach ($linhas as $linha) {
            $t = trim((string) $linha);
            if ($t === '') {
                continue;
            }
            if (preg_match('/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/', $t, $md)) {
                $dataAtual = mb_substr($md[1], 0, 20);
            }
            if (preg_match('/recusad|negad|cancelad|estornad/i', $t)) {
                continue;
            }
            if (! preg_match('/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s*(?:R\$)?/u', $t, $mv)) {
                continue;
            }
            $valor = (float) (str_replace('.', '', $mv[1]).'.'.$mv[2]);
            if ($valor <= 0) {
                continue;
            }
            $nome = trim((string) preg_replace(
                ['/(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}\s*(?:R\$)?/u', '/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/', '/\s{2,}/'],
                ' ',
                $t
            ));
            $nome = (string) preg_replace('/^[\s\-–—:|.]+|[\s\-–—:|.]+$/u', '', $nome);
            if ($nome === '' || mb_strlen($nome) < 3) {
                $nome = 'Transação';
            }
            $nome = mb_substr($nome, 0, 120);
            $item = [
                'valor' => round($valor, 2),
                'categoria' => $this->categoriaItem($nome),
                'textoTrecho' => $nome,
                'nome_estabelecimento' => mb_substr($nome, 0, 80),
            ];
            if ($dataAtual !== '') {
                $item['data'] = $dataAtual;
            }
            $out[] = $item;
        }

        return $out;
    }

    private function categoriaItem(string $nome): string
    {
        $upper = mb_strtoupper($nome);
        foreach (self::PEDAGIO_HINTS as $p) {
            if (str_contains($upper, $p)) {
                return 'Pedágio';
            }
        }

        return 'Comércio / Outros';
    }

    /**
     * @param  array<int,array<string,mixed>>  $itens
     * @param  array<string,mixed>  $parseResult
     * @return array{
     *     itensSugeridos:array<int,array<string,mixed>>,
     *     parseResult:array<string,mixed>,
     *     ocrEngine:string,
     *     openAiTentou:bool,
     *     openAiError:?string,
     *     openAiAvailable:bool
     * }
     */
    private function resultado(
        array $itens,
        array $parseResult,
        string $engine,
        bool $openAiTentou,
        ?string $openAiError,
        bool $openAiAvailable
    ): array {
        $parseResult['ocrEngine'] = $parseResult['ocrEngine'] ?? $engine;
        $parseResult['openAiAvailable'] = $openAiAvailable;
        $parseResult['openAiTentou'] = $openAiTentou;
        if ($openAiError !== null) {
            $parseResult['openAiError'] = $openAiError;
        }

        return [
            'itensSugeridos' => $itens,
            'parseResult' => $parseResult,
            'ocrEngine' => $engine,
            'openAiTentou' => $openAiTentou,
            'openAiError' => $openAiError,
            'openAiAvailable' => $openAiAvailable,
        ];
    }
}
