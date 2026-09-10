<?php

namespace App\Services\Documentos;

use Illuminate\Support\Facades\Log;

/**
 * OCR de comprovantes/extratos — OpenAI Vision apenas (tesseract removido da imagem prod).
 */
class ReciboOcrService
{
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

    /** Aquece / confirma disponibilidade da Vision. */
    public function warmUp(): bool
    {
        return $this->openAiAvailable();
    }

    /**
     * Pipeline: só OpenAI Vision (modo auto/always ou force).
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
                $openAiError = 'A IA não identificou itens neste comprovante.';
            } catch (\Throwable $e) {
                $openAiError = $e->getMessage() ?: 'Erro na IA OpenAI';
                Log::warning('recibo-ocr openai: '.$openAiError);
            }
        } elseif (! $disponivel) {
            $openAiError = $forceOpenAi || $mode === 'always'
                ? 'OPENAI_API_KEY não configurada no servidor.'
                : null;
        } elseif ($mode === 'never') {
            $openAiError = 'OCR por IA está desligado (RECIBO_OCR_AI=never).';
        }

        $parseResult = [
            'ocrEngine' => 'none',
            'openAiItens' => 0,
            'itensAposSanitizar' => 0,
        ];
        if ($openAiError !== null) {
            $parseResult['openAiError'] = $openAiError;
        } elseif (! $disponivel) {
            $parseResult['openAiSkipped'] = 'OPENAI_API_KEY não configurada no servidor';
        }

        return $this->resultado(
            [],
            $parseResult,
            'none',
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
