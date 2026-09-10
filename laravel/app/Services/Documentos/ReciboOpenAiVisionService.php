<?php

namespace App\Services\Documentos;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Extrato/comprovante via OpenAI Vision (gpt-4o-mini).
 * Porta de utils/recibo-openai-vision.js — usa OPENAI_API_KEY do ambiente.
 */
class ReciboOpenAiVisionService
{
    private const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

    private const PEDAGIO_HINTS = [
        'P1', 'P3', 'P4', 'P11', 'ENTREVIAS', 'EIXOSP', 'VIAPAULISTA', 'VIA COLINAS',
        'PEDÁGIO', 'PEDAGIO', 'CONCESSIONARIA', 'ROTA SO', 'TOLL',
    ];

    private const SYSTEM_PROMPT = <<<'PROMPT'
Extraia cada transação APROVADA de prints de extrato de cartão (fundo escuro, texto claro, pt-BR).
Responda SOMENTE JSON válido:
{"items":[{"nome":"estabelecimento","data":"DD/MM","valor":13.2,"recusada":false}]}

Regras obrigatórias:
- Para CADA linha de cobrança APROVADA: nome, data DD/MM, valor (ex. 13,20 R$).
- PROIBIDO incluir transação recusada: se aparecer "Recusada"/"Recusado" ou valor em vermelho/rosa, NÃO coloque no JSON (recusada:true também não deve ir na lista).
- Se o mesmo estabelecimento e valor aparecer duas vezes e uma estiver recusada, inclua SOMENTE a aprovada (uma entrada).
- Nome em duas linhas (ex. CONCESSIONARIA + ROTA SO): junte em um nome só.
- Duas cobranças iguais e ambas APROVADAS (ex. dois pedágios Entrevias 9,10 ou dois P3 18,30): inclua TODAS as passagens, não resuma.
- Lista longa de pedágios (VIA COLINAS, EixoSp, P11, P3, Entrevias…): uma entrada por linha com valor R$, mesmo nome repetido.
- valor: número decimal (13.2 = R$ 13,20). data: DD/MM quando existir.
- Leia TODAS as linhas visíveis; não pare no meio da lista.
- Cupom único (não lista): 1 item. Nada legível: {"items":[]}
PROMPT;

    public function apiKey(): string
    {
        return trim((string) (env('OPENAI_API_KEY') ?: ''));
    }

    public function isAvailable(): bool
    {
        return $this->apiKey() !== '';
    }

    public function model(): string
    {
        $m = trim((string) (env('RECIBO_OCR_AI_MODEL') ?: ''));

        return $m !== '' ? $m : 'gpt-4o-mini';
    }

    /**
     * @return array{itensSugeridos:array<int,array<string,mixed>>, parseResult:array<string,mixed>}
     */
    public function extrair(string $imageBinary): array
    {
        if (! $this->isAvailable()) {
            return [
                'itensSugeridos' => [],
                'parseResult' => ['source' => 'openai', 'error' => 'OPENAI_API_KEY não configurada'],
            ];
        }

        $dataUrl = $this->toDataUrl($imageBinary);
        $res = Http::timeout(120)
            ->withToken($this->apiKey())
            ->post(self::CHAT_URL, [
                'model' => $this->model(),
                'messages' => [
                    ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => 'Extraia todas as transações aprovadas visíveis nesta imagem. JSON apenas.',
                            ],
                            [
                                'type' => 'image_url',
                                'image_url' => ['url' => $dataUrl, 'detail' => 'high'],
                            ],
                        ],
                    ],
                ],
                'temperature' => 0.1,
                'max_tokens' => 4096,
                'response_format' => ['type' => 'json_object'],
            ]);

        if (! $res->successful()) {
            Log::warning('recibo-openai-vision API', [
                'status' => $res->status(),
                'body' => mb_substr((string) $res->body(), 0, 300),
            ]);
            throw new \RuntimeException(
                $res->status() === 429 ? 'Limite OpenAI atingido.' : 'Falha na leitura com IA.',
                $res->status()
            );
        }

        $content = data_get($res->json(), 'choices.0.message.content');
        $parsed = $this->parseJsonFromContent(is_string($content) ? $content : null);
        $itens = $this->itensFromPayload(is_array($parsed) ? $parsed : []);

        $transactions = [];
        foreach ($itens as $it) {
            $transactions[] = [
                'name' => $it['nome_estabelecimento'] ?? null,
                'date' => $it['data'] ?? null,
                'amount' => $it['valor'] ?? null,
                'status' => 'PAID',
            ];
        }

        return [
            'itensSugeridos' => $itens,
            'parseResult' => [
                'source' => 'openai',
                'model' => $this->model(),
                'confidence' => count($itens) > 0 ? 0.92 : 0.2,
                'warnings' => count($itens) > 0 ? [] : ['IA não identificou transações na imagem'],
                'transactions' => $transactions,
            ],
        ];
    }

    /**
     * Redimensiona com GD quando disponível (paridade com sharp no Node); senão base64 cru.
     */
    private function toDataUrl(string $binary): string
    {
        if (! function_exists('imagecreatefromstring')) {
            return 'data:image/jpeg;base64,'.base64_encode($binary);
        }
        try {
            $src = @imagecreatefromstring($binary);
            if ($src === false) {
                return 'data:image/jpeg;base64,'.base64_encode($binary);
            }
            $w = imagesx($src);
            $h = imagesy($src);
            $maxW = 1600;
            if ($w > $maxW && $w > 0) {
                $newW = $maxW;
                $newH = (int) max(1, round($h * ($maxW / $w)));
                $dst = imagecreatetruecolor($newW, $newH);
                imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);
                imagedestroy($src);
                $src = $dst;
            }
            ob_start();
            imagejpeg($src, null, 88);
            $out = (string) ob_get_clean();
            imagedestroy($src);
            if ($out !== '') {
                return 'data:image/jpeg;base64,'.base64_encode($out);
            }
        } catch (\Throwable $e) {
            Log::warning('recibo-openai-vision resize: '.$e->getMessage());
        }

        return 'data:image/jpeg;base64,'.base64_encode($binary);
    }

    /**
     * @return array<string,mixed>|null
     */
    private function parseJsonFromContent(?string $content): ?array
    {
        if ($content === null || trim($content) === '') {
            return null;
        }
        $trimmed = trim($content);
        $d = json_decode($trimmed, true);
        if (is_array($d)) {
            return $d;
        }
        if (preg_match('/\{[\s\S]*\}/', $trimmed, $m)) {
            $d = json_decode($m[0], true);
            if (is_array($d)) {
                return $d;
            }
        }

        return null;
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array<int,array<string,mixed>>
     */
    public function itensFromPayload(array $payload): array
    {
        $raw = $payload['items'] ?? $payload['itens'] ?? $payload['transactions'] ?? null;
        if (! is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $recusada = ! empty($row['recusada']) || ! empty($row['recusado']) || ! empty($row['declined'])
                || (isset($row['status']) && strtoupper((string) $row['status']) === 'DECLINED');
            if ($recusada) {
                continue;
            }
            $nomeRaw = trim((string) ($row['nome'] ?? $row['name'] ?? $row['estabelecimento'] ?? $row['descricao'] ?? ''));
            $obs = (string) ($row['observacao'] ?? $row['notes'] ?? $row['status_text'] ?? '');
            if (preg_match('/recusad|negad|cancelad|estornad/i', $nomeRaw.' '.$obs)) {
                continue;
            }
            $valor = $this->normalizarValor($row['valor'] ?? $row['amount'] ?? null);
            if ($valor === null || $valor <= 0) {
                continue;
            }
            $nome = mb_substr($nomeRaw, 0, 120);
            if ($nome === '') {
                $nome = 'Transação';
            }
            $item = [
                'valor' => $valor,
                'categoria' => $this->categoriaItem($nome),
                'textoTrecho' => mb_substr($nome, 0, 120),
                'nome_estabelecimento' => mb_substr($nome, 0, 80),
            ];
            $data = trim((string) ($row['data'] ?? $row['date'] ?? ''));
            if ($data !== '' && preg_match('/\d{1,2}\/\d{1,2}/', $data)) {
                $item['data'] = mb_substr($data, 0, 20);
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

    private function normalizarValor(mixed $v): ?float
    {
        if (is_int($v) || is_float($v)) {
            $n = (float) $v;

            return $n >= 0 ? round($n, 2) : null;
        }
        if (is_string($v)) {
            $clean = str_replace(',', '.', str_replace('.', '', $v));
            $clean = preg_replace('/[^\d.]/', '', $clean) ?? '';
            if ($clean === '' || ! is_numeric($clean)) {
                return null;
            }
            $n = (float) $clean;

            return $n >= 0 ? round($n, 2) : null;
        }

        return null;
    }
}
