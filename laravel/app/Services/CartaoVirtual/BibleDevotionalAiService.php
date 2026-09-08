<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Enriquecimento OpenAI do Devocional 365 (paridade com bibleDevotionalAi.service.js).
 */
class BibleDevotionalAiService
{
    private const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

    private function apiKey(): string
    {
        return trim((string) (env('OPENAI_API_KEY') ?: env('BIBLE_OPENAI_API_KEY') ?: ''));
    }

    private function model(): string
    {
        return trim((string) (env('BIBLE_DEV365_AI_MODEL') ?: 'gpt-4o-mini')) ?: 'gpt-4o-mini';
    }

    /**
     * @param  array<string,mixed>  $devotional
     * @param  array{dayOfYear:int,year:int,estilo?:string}  $ctx
     * @return array{reflexao?:string,aplicacao?:string,oracao?:string,error?:string}
     */
    public function enrichDevotional365(array $devotional, array $ctx): array
    {
        $dayOfYear = (int) ($ctx['dayOfYear'] ?? 0);
        $year = (int) ($ctx['year'] ?? (int) now('America/Sao_Paulo')->year);
        $estilo = strtolower((string) ($ctx['estilo'] ?? 'padrao')) === 'cunha' ? 'cunha' : 'padrao';
        $key = $this->apiKey();
        if ($key === '') {
            return ['error' => 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).'];
        }

        $instr = mb_substr((string) ($devotional['tema_ia_instrucao'] ?? ''), 0, 1200);
        $model = $this->model();
        $cacheKey = 'dev365-ai:'.$year.':'.$dayOfYear.':'.$model.':'.$estilo.':'
            .$this->fnv1aShort($instr).':'
            .$this->fnv1aShort($dayOfYear.'|'.mb_substr((string) ($devotional['reflexao'] ?? ''), 0, 240));

        $hit = Cache::get($cacheKey);
        if (is_array($hit) && !empty($hit['reflexao'])) {
            return $hit;
        }

        $titulo = mb_substr((string) ($devotional['titulo'] ?? ''), 0, 200);
        $ref = mb_substr((string) ($devotional['versiculo_ref'] ?? ''), 0, 120);
        $baseReflexao = mb_substr(trim(preg_replace('/\s+/', ' ', (string) ($devotional['reflexao'] ?? '')) ?: ''), 0, 2000);
        $temaMes = mb_substr((string) ($devotional['tema_mes'] ?? ''), 0, 220);
        $temaAno = mb_substr((string) ($devotional['tema_ano'] ?? ''), 0, 220);
        $temaMesCal = mb_substr((string) ($devotional['tema_mes_calendario'] ?? ''), 0, 220);

        $estiloCunha = $estilo === 'cunha'
            ? "\nESTILO DE ENTREGA (obrigatório): Devocional no estilo de mensagem de rádio cristã brasileira — linguagem calorosa, simples, direta, como se falasse ao ouvinte; parágrafos curtos; \"você\" ou \"nós\"; tom de fé e esperança. Não cite nomes de pastores nem reproduza frases literais de terceiros; inspire-se apenas no tipo de mensagem (devocional em áudio).\n"
            : '';

        $userPrompt = "Dia do ano: {$dayOfYear} de 365 · Ano civil: {$year}.
IMPORTANTE: Este é o dia {$dayOfYear} — a reflexão deve ser claramente DISTINTA da de outros dias (outro ângulo, outros exemplos, outra abertura). Não reproduza o texto-base como cópia; reescreva por completo.
ID único do pedido: {$year}-DOY-{$dayOfYear} (garanta que o JSON deste pedido não seja igual ao de outro dia).

PASSAGEM / referência principal: {$ref}
Título de apoio (pode inspirar o tom): {$titulo}

TEMA DO MÊS (contexto na UI): {$temaMes}
".($temaMesCal !== '' ? "TEMA DO MÊS CALENDÁRIO (integrar na reflexão): {$temaMesCal}\n" : '')."TEMA DO ANO (contexto): {$temaAno}

INSTRUÇÃO DE TEMA (obedeça à letra na estrutura da reflexão):
".($instr !== '' ? $instr : 'Ligue a reflexão à passagem e aos temas acima.')."

Texto-base do catálogo (use só como ideia geral; NÃO copie frases literais — parafraseie e personalize para o dia {$dayOfYear}):
".($baseReflexao !== '' ? $baseReflexao : '(sem texto-base)')."

{$estiloCunha}

Responda APENAS com um JSON válido neste formato exato (sem markdown):
{\"reflexao\":\"6 a 9 parágrafos em português do Brasil, texto profundo: explique o sentido da passagem no contexto bíblico, por que importa hoje, dilemas humanos que ela toca, e uma linha de aplicação ao longo do texto (não só no fim)\",\"aplicacao\":\"2 parágrafos com aplicação prática e concreta\",\"oracao\":\"1 oração (pode ser um pouco mais longa que uma frase única)\"}

Regras: a reflexão DEVE demonstrar que o tema instruído foi seguido (não genérico); o primeiro parágrafo deve amarrar tema + passagem; tom pastoral evangélico; não invente referências bíblicas além da dada; não contradiga a Escritura; desenvolva ideias com clareza (não repita a mesma ideia em parágrafos diferentes).";

        $system = $estilo === 'cunha'
            ? 'Você escreve devocionais cristãos em português do Brasil, em tom acolhedor e claro, como mensagem de rádio. Responde somente JSON válido, sem blocos de código.'
            : 'Você escreve devocionais cristãos em português do Brasil. Responde somente JSON válido, sem blocos de código.';

        try {
            $res = Http::timeout(90)
                ->withToken($key)
                ->post(self::CHAT_URL, [
                    'model' => $model,
                    'temperature' => $estilo === 'cunha' ? 0.78 : 0.72,
                    'max_tokens' => 4200,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);

            if (!$res->successful()) {
                $msg = (string) data_get($res->json(), 'error.message', $res->reason());
                Log::error('bible.dev365.ai.http', ['msg' => $msg]);

                return ['error' => $msg !== '' ? $msg : 'Erro ao chamar a IA.'];
            }

            $text = (string) data_get($res->json(), 'choices.0.message.content', '');
            $cleaned = trim(preg_replace('/^\s*```(?:json)?\s*/i', '', $text) ?? $text);
            $cleaned = trim(preg_replace('/\s*```\s*$/', '', $cleaned) ?? $cleaned);
            $parsed = json_decode($cleaned, true);
            if (!is_array($parsed)) {
                return ['error' => 'Resposta da IA em formato inválido. Tente novamente.'];
            }

            $out = [
                'reflexao' => trim((string) ($parsed['reflexao'] ?? '')),
                'aplicacao' => trim((string) ($parsed['aplicacao'] ?? '')),
                'oracao' => trim((string) ($parsed['oracao'] ?? '')),
            ];
            if ($out['reflexao'] === '') {
                return ['error' => 'A IA não devolveu reflexão.'];
            }

            Cache::put($cacheKey, $out, now()->addHours(6));

            return $out;
        } catch (\Throwable $e) {
            Log::error('bible.dev365.ai', ['error' => $e->getMessage()]);

            return ['error' => $e->getMessage() ?: 'Falha de rede ao gerar devocional com IA.'];
        }
    }

    private function fnv1aShort(string $s): string
    {
        $h = 2166136261;
        $len = strlen($s);
        for ($i = 0; $i < $len; $i++) {
            $h ^= ord($s[$i]);
            $h = ($h * 16777619) & 0xFFFFFFFF;
        }

        return base_convert((string) $h, 10, 36);
    }
}
