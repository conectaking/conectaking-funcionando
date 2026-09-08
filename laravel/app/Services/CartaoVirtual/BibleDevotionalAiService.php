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

    /**
     * Geração completa (admin) — título + passagem + textos.
     *
     * @param  array{dayOfYear:int,year:int,estilo?:string,theme?:array<string,mixed>,avoidSnapshots?:list<array<string,mixed>>,retryExtra?:string}  $ctx
     * @return array{error?:string,titulo?:string,versiculo_ref?:string,versiculo_texto?:string,reflexao?:string,aplicacao?:string,oracao?:string}
     */
    public function generateFullDevotional365Day(array $ctx): array
    {
        $dayOfYear = (int) ($ctx['dayOfYear'] ?? 0);
        $year = (int) ($ctx['year'] ?? (int) now('America/Sao_Paulo')->year);
        $estilo = strtolower((string) ($ctx['estilo'] ?? 'padrao')) === 'cunha' ? 'cunha' : 'padrao';
        $theme = is_array($ctx['theme'] ?? null) ? $ctx['theme'] : [];
        $avoidSnapshots = is_array($ctx['avoidSnapshots'] ?? null) ? $ctx['avoidSnapshots'] : [];
        $retryExtra = mb_substr((string) ($ctx['retryExtra'] ?? ''), 0, 800);
        $key = $this->apiKey();
        if ($key === '') {
            return ['error' => 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).'];
        }

        $instr = mb_substr((string) ($theme['tema_ia_instrucao'] ?? ''), 0, 2000);
        $temaMes = mb_substr((string) ($theme['tema_mes'] ?? ''), 0, 300);
        $temaAno = mb_substr((string) ($theme['tema_ano'] ?? ''), 0, 300);
        $temaMesCal = mb_substr((string) ($theme['tema_mes_calendario'] ?? ''), 0, 300);

        $avoidLines = [];
        foreach (array_slice($avoidSnapshots, 0, 45) as $r) {
            if (!is_array($r)) {
                continue;
            }
            $ref = trim((string) ($r['versiculo_ref'] ?? ''));
            $tit = trim((string) ($r['titulo'] ?? ''));
            if ($ref === '' && $tit === '') {
                continue;
            }
            if ($ref !== '' && $tit !== '') {
                $avoidLines[] = '- '.$ref.' (título já usado: «'.mb_substr($tit, 0, 80).'»)';
            } elseif ($ref !== '') {
                $avoidLines[] = '- '.$ref;
            } else {
                $avoidLines[] = '- (título) «'.mb_substr($tit, 0, 80).'»';
            }
        }
        $avoidBlock = implode("\n", $avoidLines);
        $model = $this->model();
        $cacheKey = 'dev365-full:'.$year.':'.$dayOfYear.':'.$model.':'.$estilo.':'
            .$this->fnv1aShort($instr).':'.$this->fnv1aShort($avoidBlock).':'.$this->fnv1aShort($retryExtra);
        $hit = Cache::get($cacheKey);
        if (is_array($hit) && !empty($hit['reflexao']) && !empty($hit['versiculo_ref'])) {
            return $hit;
        }

        $estiloCunha = $estilo === 'cunha'
            ? "\nESTILO (obrigatório): Tom de mensagem de rádio cristã brasileira — linguagem calorosa e clara; parágrafos com bom ritmo; \"você\" ou \"nós\"; fé e esperança.\n"
            : '';

        $userPrompt = "Dia do ano: {$dayOfYear} de 365 · Ano civil: {$year}.
MODO: GERAÇÃO COMPLETA — você escolhe UM título NOVO, UMA passagem bíblica principal DIFERENTE das listadas abaixo e escreve tudo original (não copie devocionais de outros dias).

TEMA DO MÊS (painel): {$temaMes}
".($temaMesCal !== '' ? "TEMA DO MÊS CALENDÁRIO: {$temaMesCal}\n" : '')."TEMA DO ANO: {$temaAno}

INSTRUÇÃO DE TEMA (obedeça; estruture título + reflexão + aplicação em função disto):
".($instr !== '' ? $instr : 'Ligue o devocional ao tema do mês e ao contexto do dia.')."

".($avoidBlock !== '' ? "PASSAGENS E TÍTULOS JÁ USADOS (NÃO REPITA — escolha OUTRO livro da Bíblia ou OUTRO capítulo/versículo; há 66 livros, explore variedade):\n{$avoidBlock}\n" : '')."
".($retryExtra !== '' ? "CORREÇÃO OBRIGATÓRIA: {$retryExtra}\n" : '')."
{$estiloCunha}

REGRAS CRÍTICAS:
- Este é o dia {$dayOfYear} — título e \"versiculo_ref\" devem ser OBRIGATORIAMENTE distintos de qualquer linha da lista acima.
- Varie os livros ao longo do calendário.
- \"versiculo_ref\" deve ser UMA referência válida em português NVI (ex.: João 14:6).
- A reflexão deve ser LONGA: 6 a 10 parágrafos em português do Brasil.

Responda APENAS com JSON válido (sem markdown):
{\"titulo\":\"string até 120 caracteres\",\"versiculo_ref\":\"ex.: João 14:6\",\"versiculo_texto\":\"\",\"reflexao\":\"texto longo\",\"aplicacao\":\"dois parágrafos\",\"oracao\":\"oração\"}

Use versiculo_texto vazio.";

        try {
            $temp = min(0.92, ($estilo === 'cunha' ? 0.82 : 0.78) + (($dayOfYear % 11) * 0.008));
            $res = Http::timeout(120)
                ->withToken($key)
                ->post(self::CHAT_URL, [
                    'model' => $model,
                    'temperature' => $temp,
                    'max_tokens' => 5200,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'Você é teólogo e escritor de devocionais evangélicos em português do Brasil. Conhece a Bíblia; não contradiz a Escritura. Responde somente JSON válido, sem blocos de código.',
                        ],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);
            if (!$res->successful()) {
                $msg = (string) data_get($res->json(), 'error.message', $res->reason());

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
                'titulo' => trim((string) ($parsed['titulo'] ?? '')),
                'versiculo_ref' => trim((string) ($parsed['versiculo_ref'] ?? '')),
                'versiculo_texto' => trim((string) ($parsed['versiculo_texto'] ?? '')),
                'reflexao' => trim((string) ($parsed['reflexao'] ?? '')),
                'aplicacao' => trim((string) ($parsed['aplicacao'] ?? '')),
                'oracao' => trim((string) ($parsed['oracao'] ?? '')),
            ];
            if ($out['reflexao'] === '' || $out['versiculo_ref'] === '') {
                return ['error' => 'A IA deve devolver reflexão e versiculo_ref.'];
            }
            if ($out['titulo'] === '') {
                $out['titulo'] = 'Devocional — dia '.$dayOfYear;
            }
            Cache::put($cacheKey, $out, now()->addHours(6));

            return $out;
        } catch (\Throwable $e) {
            Log::error('bible.dev365.full', ['error' => $e->getMessage()]);

            return ['error' => $e->getMessage() ?: 'Falha ao gerar devocional completo.'];
        }
    }

    /**
     * @return array{error?:string,text?:string}
     */
    public function generateMonthThemeLine(int $year, int $month, string $extraHint = ''): array
    {
        $key = $this->apiKey();
        if ($key === '') {
            return ['error' => 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).'];
        }
        $m = max(1, min(12, $month));
        $y = $year >= 2000 && $year <= 2100 ? $year : (int) now('America/Sao_Paulo')->year;
        $names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        $nome = $names[$m - 1] ?? (string) $m;
        $hint = mb_substr($extraHint, 0, 400);
        $userPrompt = "Ano {$y}, mês: {$nome}.\n"
            .($hint !== '' ? "Contexto ou tema anterior: {$hint}\n" : '')
            .'Responda com UMA frase curta em português do Brasil (máx. 120 caracteres), tema cristão devocional para este mês, sem citar marca nem pastor. Só a frase, sem aspas.';

        try {
            $res = Http::timeout(60)->withToken($key)->post(self::CHAT_URL, [
                'model' => $this->model(),
                'temperature' => 0.7,
                'max_tokens' => 120,
                'messages' => [
                    ['role' => 'system', 'content' => 'Responda só com uma frase curta em português, sem aspas.'],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
            ]);
            if (!$res->successful()) {
                $msg = (string) data_get($res->json(), 'error.message', $res->reason());

                return ['error' => $msg !== '' ? $msg : 'Erro OpenAI.'];
            }
            $text = trim((string) data_get($res->json(), 'choices.0.message.content', ''));
            $text = trim($text, " \t\n\r\0\x0B\"'");
            if ($text === '') {
                return ['error' => 'Tema vazio.'];
            }

            return ['text' => mb_substr($text, 0, 500)];
        } catch (\Throwable $e) {
            return ['error' => $e->getMessage() ?: 'Falha ao gerar tema.'];
        }
    }

    /**
     * @return array{themes:array<string,string>,errors:list<array{month:int,error:string}>}
     */
    public function generateAllMonthThemesForYear(int $year, int $delayMs = 400): array
    {
        $themes = [];
        $errors = [];
        $prev = '';
        for ($m = 1; $m <= 12; $m++) {
            $r = $this->generateMonthThemeLine($year, $m, $prev);
            if (!empty($r['error'])) {
                $errors[] = ['month' => $m, 'error' => (string) $r['error']];
            } else {
                $themes[(string) $m] = (string) ($r['text'] ?? '');
                $prev = (string) ($r['text'] ?? '');
            }
            if ($delayMs > 0 && $m < 12) {
                usleep($delayMs * 1000);
            }
        }

        return ['themes' => $themes, 'errors' => $errors];
    }

    public function normalizeDev365Ref(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = preg_replace('/\s+/', ' ', $s) ?? $s;

        return $s;
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
