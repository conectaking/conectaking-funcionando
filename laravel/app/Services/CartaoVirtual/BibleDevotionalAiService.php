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

    /**
     * Estudo completo por livro (paridade com generateBookStudyFullText do Node).
     *
     * @param  array{bookId:string,bookName:string,referenceSample?:string,baseadoEmGenesis?:bool|null,profundidadeEstiloGenesis?:bool}  $opts
     * @return array{text?:string,error?:string}
     */
    public function generateBookStudyFullText(array $opts): array
    {
        $bookId = trim((string) ($opts['bookId'] ?? ''));
        $bookName = trim((string) ($opts['bookName'] ?? $bookId));
        $referenceSample = trim((string) ($opts['referenceSample'] ?? ''));
        $baseadoEmGenesis = !empty($opts['baseadoEmGenesis']);
        $profundidadeEstiloGenesis = !empty($opts['profundidadeEstiloGenesis']);
        $key = $this->apiKey();
        if ($key === '') {
            return ['error' => 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).'];
        }
        if ($bookId === '' || $bookName === '') {
            return ['error' => 'Livro inválido.'];
        }

        $refBlock = '';
        if ($referenceSample !== '' && strcasecmp($bookId, 'gn') !== 0) {
            $sample = mb_substr($referenceSample, 0, 11000);
            $refBlock = "\nEXEMPLO NO SITE (estudo de Gênesis — use APENAS como referência de profundidade, extensão e estilo de secções; NÃO copie frases; o texto final deve ser 100% sobre {$bookName}):\n\n---\n{$sample}\n---\n";
        }

        $modoGenesisExtra = '';
        if ($baseadoEmGenesis || $profundidadeEstiloGenesis) {
            $modoGenesisExtra = "\n\nMODO PROFUNDIDADE EXTRA (painel: estilo Gênesis):\n"
                ."- Trate este livro com o mesmo nível de riqueza que um estudo \"tipo Gênesis\" no site: muitas subsecções, muitas histórias ou arcos narrativos desenvolvidos (não uma frase por capítulo).\n"
                ."- Inclua secções claras com títulos em linha própria:\n"
                ."  ► O QUE ESTE LIVRO REPRESENTA no conjunto da Escritura e na história da redenção.\n"
                ."  ► O QUE APRENDEMOS COM {$bookName} (síntese espiritual e prática).\n"
                ."  ► NARRATIVAS E HISTÓRIAS PRINCIPAIS: para CADA grande história ou bloco, desenvolvimento substancial: actores, tensão espiritual, o que revela sobre Deus e o ser humano; ligue arcos quando fizer sentido.\n"
                ."- Vá além do óbvio: explicações memoráveis e fundamentadas no texto; linguagem acessível mas não superficial.\n";
        }

        $bookDirectives = $this->getBookStudyExtraDirectives($bookId, $bookName);
        $profundidade = $this->bookStudyProfundidadeGlobal();

        $userPrompt = "Livro bíblico: {$bookName} (id técnico: {$bookId}).

Escreva um ÚNICO estudo completo do livro em português do Brasil, para leitor cristão evangélico.

{$profundidade}

REQUISITOS DE ESTRUTURA (obrigatórios):
- NÃO seja um resumo rápido. O texto deve ser MUITO LONGO quando o conteúdo do livro o exigir: vários mil palavras, muitos parágrafos; priorize completar os tópicos abaixo em vez de poupar tokens.
- O leitor deve poder compreender narrativa, doutrinas e contexto com profundidade (como se tivesse lido o livro com um professor ao lado).
- Organize com títulos em linha própria (MAIÚSCULAS curtas ou \"► Secção\").
- Inclua no mínimo estas áreas (adaptando ao género do livro): VISÃO GERAL; CONTEXTO; ESTRUTURA E CONTEÚDO (grandes blocos com aprofundamento real); PERSONAGENS OU TEMAS CENTRAIS; MENSAGEM TEOLÓGICA E LUGAR NA HISTÓRIA DA REDENÇÃO; APLICAÇÃO PARA HOJE.
- Ao citar passagens, use o nome do livro como na Bíblia em português (ex.: {$bookName} 3; Salmos 23; João 3) para o site poder criar links. Insira referências ao longo de CADA secção importante, não só no início.
- Não invente versículos longos entre aspas; pode parafrasear com precisão, mas o conteúdo deve corresponder ao texto sagrado.
- PRIORIDADE MÁXIMA: especificidade (nomes, eventos, referências). Se faltar espaço, corte adjetivos vazios, não corte listas de factos bíblicos exigidas pelas directivas do livro.
{$bookDirectives}
{$modoGenesisExtra}
{$refBlock}

Responda SOMENTE com o texto do estudo, sem comentários introdutórios nem markdown de código.";

        $system = 'Você é teólogo evangélico, exegeta e professor de Bíblia em português do Brasil, com nível de estudos avançados (teologia bíblica, exegese histórico-gramatical, história da redenção). Domina os 66 livros; não contradiz a Escritura. Produz estudos extensos e rigorosos: priorize FACTOS DO TEXTO — nomes próprios, sequências de eventos, referências capítulo/versículo — e recusa resumos vagos. Quando o utilizador pedir desenvolvimento de séries (ex.: dez pragas), nomeie e explique cada elemento. Nunca invente citações textuais de obras extra-bíblicas nem páginas; alusões a tradição ou historiografia só em termos gerais.';

        try {
            $res = Http::timeout(300)
                ->withToken($key)
                ->post(self::CHAT_URL, [
                    'model' => $this->bookStudyModel(),
                    'temperature' => 0.4,
                    'max_tokens' => $this->bookStudyMaxTokens(),
                    'presence_penalty' => 0.12,
                    'frequency_penalty' => 0.08,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);
            if (!$res->successful()) {
                $msg = (string) data_get($res->json(), 'error.message', $res->reason());
                Log::error('bibleDevotionalAi generateBookStudyFullText HTTP: '.$msg);

                return ['error' => $msg !== '' ? $msg : 'Erro ao chamar a IA.'];
            }
            $trimmed = trim((string) data_get($res->json(), 'choices.0.message.content', ''));
            if (mb_strlen($trimmed) < 2200) {
                return [
                    'error' => 'A resposta da IA ficou curta demais para o nível de profundidade pedido. Defina BIBLE_BOOK_STUDY_MAX_TOKENS=16000 (ou o máximo permitido), use BIBLE_BOOK_STUDY_AI_MODEL=gpt-4o e regenere; textos como Êxodo exigem saída longa.',
                ];
            }

            return ['text' => $trimmed];
        } catch (\Throwable $e) {
            Log::error('bibleDevotionalAi generateBookStudyFullText: '.$e->getMessage());

            return ['error' => $e->getMessage() ?: 'Falha de rede.'];
        }
    }

    private function bookStudyModel(): string
    {
        $m = trim((string) (env('BIBLE_BOOK_STUDY_AI_MODEL') ?: env('BIBLE_DEV365_AI_MODEL') ?: 'gpt-4o'));

        return $m !== '' ? $m : 'gpt-4o';
    }

    private function bookStudyMaxTokens(): int
    {
        $n = (int) (env('BIBLE_BOOK_STUDY_MAX_TOKENS') ?: 16000);

        return min(16384, max(4000, $n));
    }

    private function bookStudyProfundidadeGlobal(): string
    {
        return <<<'TXT'
PROFUNDIDADE OBRIGATÓRIA (QUALQUER LIVRO):
- O leitor pode dedicar UMA HORA OU MAIS a este texto: priorize explicação real em vez de brevidade artificial. Prefira muitos parágrafos bem desenvolvidos a listas telegráficas.
- Identifique os "pontos de máximo impacto" do livro (acontecimentos, leis, discursos, imagens proféticas, doutrinas centrais) e desenvolva CADA UM com subsecção própria: contexto → o que o texto diz → significado teológico → implicações para a vida cristã hoje.
- Não se limite a "uma frase por capítulo". Agrupe capítulos quando fizer sentido, mas aprofunde os blocos que mais moldam a mensagem do livro.

CONCRETUDE, NOMES E REFERÊNCIAS (CRÍTICO — EXTRAIA O MÁXIMO DO CONHECIMENTO BÍBLICO, SEM SER VAGO):
- PROIBIDO substituir factos nomeados no texto por frases genéricas ("houve milagres", "Deus castigou", "aconteceram coisas terríveis"). Se o texto lista pragas, juízes, milagres, leis ou parábolas, NOMEIE-OS ou enumere-os como o próprio relato faz.
- OBRIGATÓRIO: ao desenvolver cada grande tema, inclua referências bíblicas no formato "NomeDoLivro capítulo:versículo" ou intervalos (ex.: Êxodo 9:13–35). O objectivo é o leitor poder abrir a Bíblia na passagem certa.
- Cada tópico central deve ter NO MÍNIMO dois parágrafos de explicação do texto ANTES da aplicação contemporânea.
- Quando o livro apresentar uma série de eventos (pragas, vitórias, discursos, salmos encadeados), é INACEITÁVEL condensar toda a série num único parágrafo: desenvolva cada elemento importante ou agrupe com critério explicativo, nunca com omissão dos nomes.

Síntese teológica: integre perspectiva histórico-gramatical e teologia bíblica (história da redenção). Pode aludir, em termos GERAIS, a paralelos históricos ou debates académicos quando útil.
- FONTES EXTRA-BÍBLICAS: NÃO invente citações entre aspas, páginas ou edições. NÃO atribua frases específicas a autores antigos sem base; quando mencionar historiografia ou tradição, faça-o de modo geral. A Escritura permanece a autoridade.
- Não cite nomes de pastores ou obras comerciais recentes; pode referir categorias teológicas sem inventar títulos.
TXT;
    }

    private function getBookStudyExtraDirectives(string $bookId, string $bookName): string
    {
        $id = strtolower(trim($bookId));
        $n = mb_strtolower(trim($bookName));

        if ($id === 'ex' || str_contains($n, 'êxodo') || str_contains($n, 'exodo')) {
            return $this->exodusStudyDirective();
        }
        if ($id === 'lv' || str_contains($n, 'levítico') || str_contains($n, 'levitico')) {
            return "\n\n=== OBRIGATÓRIO PARA LEVÍTICO ===\nDesenvolva com profundidade (não listas frias): santidade de Deus; significado teológico dos sacrifícios e do Dia da Expiação; pureza/impureza; grandes festas; blocos morais (ex.: Levítico 18–20); \"ama o teu próximo como a ti mesmo\" no contexto do livro; ligação com Cristo como cumprimento (em termos teológicos, sem slogans).\n";
        }
        if ($id === 'nm' || str_contains($n, 'números') || str_contains($n, 'numeros')) {
            return "\n\n=== OBRIGATÓRIO PARA NÚMEROS ===\nPercorra com secções próprias: preparação para Canaã; murmurações e julgamentos; Balaão e Balaque (significado narrativo e teológico); a nova geração; incidentes-chave (ex.: madeira de bronze) com explicação, não só menção.\n";
        }
        if ($id === 'dt' || str_contains($n, 'deuteron')) {
            return "\n\n=== OBRIGATÓRIO PARA DEUTERONÔMIO ===\nDesenvolva: estrutura como renovação da aliança; Shema e centralidade do amor a Deus; repetição e actualização da lei; bênçãos e maldições; morte de Moisés e transição — cada bloco com substância, não resumo de uma linha por capítulo.\n";
        }
        if ($id === 'gn' || str_contains($n, 'gênesis') || str_contains($n, 'genesis')) {
            return "\n\n=== REFORÇO PARA GÉNESIS ===\nGaranta grandes blocos para: criação e queda; primeiros capítulos até Abraão; patriarcas; José e o propósito de Deus nas vicissitudes — cada arco com múltiplos parágrafos e tensão teológica clara.\n";
        }
        if (in_array($id, ['js', 'jud', 'rt', '1sm', '2sm', '1kgs', '2kgs', '1ch', '2ch', 'ezr', 'ne', 'et'], true)) {
            return "\n\n=== LIVRO HISTÓRICO / NARRATIVO ===\nIdentifique os principais arcos narrativos e personagens; para CADA arco de grande impacto, escreva subsecção própria: o que acontece, tensão espiritual, o que revela sobre Deus e o povo, e aplicação. Não se limite a uma cronologia superficial.\n";
        }
        if (in_array($id, ['job', 'ps', 'prv', 'ec', 'so'], true)) {
            return "\n\n=== LIVRO POÉTICO / SAPIENCIAL ===\nExplique género literário; temas centrais; estrutura quando visível; secções dedicadas aos discursos ou ciclos mais marcantes (ex.: amigos de Jó, Salmos de lamentação ou de confiança, provérbios por temas). Evite generalidades vazias.\n";
        }
        if (in_array($id, ['is', 'jr', 'lm', 'ez', 'dn', 'ho', 'jl', 'am', 'ob', 'jn', 'mi', 'na', 'hk', 'zp', 'hg', 'zc', 'ml'], true)) {
            return "\n\n=== LIVRO PROFÉTICO ===\nDesenvolva: contexto histórico em linhas gerais; mensagem principal; julgamento e esperança; textos messiânicos ou de consolação quando presentes; relação com a aliança. Secções por grandes blocos literários, não um parágrafo por capítulo.\n";
        }
        if (in_array($id, [
            'mt', 'mk', 'lk', 'jo', 'act', 'rm', '1co', '2co', 'gl', 'eph', 'ph', 'cl',
            '1ts', '2ts', '1tm', '2tm', 'tt', 'phm', 'hb', 'jm', '1pe', '2pe', '1jo', '2jo', '3jo', 'jd', 're',
        ], true)) {
            return "\n\n=== NOVO TESTAMENTO ===\nDesenvolva teologia central do livro; narrativa (se aplicável); argumentos principais (cartas); parábolas ou discursos-chave (evangelhos); conexão com o Antigo Testamento e com Cristo. Epístolas: trace o fio condutor do argumento, não só tópicos soltos. Em Hebreus, desenvolva o argumento do sacerdócio de Cristo e as figuras do AT citadas, com profundidade.\n";
        }

        return '';
    }

    private function exodusStudyDirective(): string
    {
        return <<<'TXT'

=== ÊXODO — CONCRETUDE OBRIGATÓRIA (RESPOSTA INACEITÁVEL SE FOR GENÉRICA) ===

REGRAS GERAIS DESTE LIVRO:
- Cite referências bíblicas ao longo do texto no formato: Êxodo capítulo:versículo ou intervalo (ex.: Êxodo 7:14–25). O leitor precisa poder localizar cada afirmação.
- Nomeie personagens e lugares: Moisés, Arão, Miriã, Faraó, Midiane, Sinai, etc., sempre que o texto o fizer — não use só "o líder" ou "o faraó" sem contexto quando o relato é específico.
- PROIBIDO escrever uma única secção genérica intitulada "As dez pragas" com dois parágrafos. É OBRIGATÓRIO uma subsecção dedicada para CADA praga, com TÍTULO que contenha o NOME da praga.

AS DEZ PRAGAS — LISTA NOMINAL (ordem clássica do texto; desenvolva CADA UMA em profundidade, mínimo ~200–400 palavras POR PRAGA, vários parágrafos):

► 1ª PRAGA — Águas do Nilo (e canais) transformadas em sangue (Êxodo 7:14–25).
► 2ª PRAGA — Rãs cobrindo a terra e invadindo casas (Êxodo 7:25–8:15).
► 3ª PRAGA — Piolhos (ou enxames / "mosquitos" conforme tradução) — e o fracasso dos magos de Faraó (Êxodo 8:16–28).
► 4ª PRAGA — Enxames de moscas ou moscas venenosas (Êxodo 8:29–32).
► 5ª PRAGA — Morte do gado e dos rebanhos no Egito (Êxodo 9:1–7).
► 6ª PRAGA — Úlceras ou feridas inflamadas em humanos e animais (Êxodo 9:8–12).
► 7ª PRAGA — Granizo severo, raios e fogo na terra (Êxodo 9:13–35).
► 8ª PRAGA — Gafanhotos devorando o que restou (Êxodo 10:1–20).
► 9ª PRAGA — Trevas espessas e palpáveis sobre o Egito (Êxodo 10:21–29).
► 10ª PRAGA — Morte dos primogênitos; instituição da Páscoa e libertação (Êxodo 11–12) — desenvolva teologia da Páscoa e ligação com o cordeiro.

EM CADA UMA DAS 10 SUBSECÇÕES ACIMA, INCLUA OBRIGATORIAMENTE:
(1) O que o narrador descreve (factos do texto); (2) o endurecimento de Faraó e o papel da soberania divina; (3) significado teológico (juízo, misericórdia, revelação do nome do Senhor); (4) uma aplicação para hoje (ídolatria, dureza de coração, opressão, confiança) — sem alegoria forçada em cada pormenor.

OUTROS BLOCOS OBRIGATÓRIOS (cada um com secção própria, referências e profundidade, não um parágrafo):
- Narrativa de Moisés: nascimento, salvação do Nilo, matar o egípcio, fuga a Midiã, Zípora (Êxodo 2; 4).
- Sarça ardente, vocação, objecções de Moisés, sinais da vara (Êxodo 3–4).
- Confronto com os magos; progressão das pragas como liturgia de juízo (Êxodo 7–12).
- Cantico do Mar, êxodo e caminho no deserto (Êxodo 14–18).
- Sinai: aliança, Decálogo, quebra (bezerro de ouro), intercessão (Êxodo 19–34).
- Tabernáculo e presença de Deus no meio do povo (Êxodo 35–40).
TXT;
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
