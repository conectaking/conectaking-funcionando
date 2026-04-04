/**
 * Devocionais 365 — mesma API OpenAI que o King Brief: OPENAI_API_KEY (ou BIBLE_OPENAI_API_KEY).
 */

const fetch = require('node-fetch');
const logger = require('../../utils/logger');

function getOpenAiKey() {
    return String(process.env.OPENAI_API_KEY || process.env.BIBLE_OPENAI_API_KEY || '').trim();
}

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.BIBLE_DEV365_AI_MODEL || 'gpt-4o-mini';

const cache = new Map();
const TTL_MS = 1000 * 60 * 60 * 6;

function fnv1aShort(s) {
    const str = String(s || '');
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
}

function cacheGet(key) {
    const row = cache.get(key);
    if (!row) return null;
    if (Date.now() > row.exp) {
        cache.delete(key);
        return null;
    }
    return row.data;
}

function cacheSet(key, data) {
    cache.set(key, { data, exp: Date.now() + TTL_MS });
}

/**
 * @param {object} devotional — titulo, versiculo_ref, reflexao, tema_mes, tema_ano, tema_ia_instrucao
 * @param {{ dayOfYear: number, year: number, estilo?: string }} ctx
 */
async function enrichDevotional365(devotional, ctx) {
    const { dayOfYear, year } = ctx;
    const estilo = (ctx.estilo || 'padrao').toLowerCase() === 'cunha' ? 'cunha' : 'padrao';

    if (!getOpenAiKey()) {
        return { error: 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).' };
    }

    const instr = String(devotional.tema_ia_instrucao || '').slice(0, 1200);
    /* dayOfYear no hash do texto-base: mesmo catálogo em vários dias não deve colidir em cache */
    const cacheKey = `dev365-ai:${year}:${dayOfYear}:${MODEL}:${estilo}:${fnv1aShort(instr)}:${fnv1aShort(String(dayOfYear) + '|' + (devotional.reflexao || '')).slice(0, 240)}`;
    const hit = cacheGet(cacheKey);
    if (hit) return hit;

    const titulo = (devotional.titulo || '').slice(0, 200);
    const ref = (devotional.versiculo_ref || '').slice(0, 120);
    const baseReflexao = String(devotional.reflexao || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
    const temaMes = (devotional.tema_mes || '').slice(0, 220);
    const temaAno = (devotional.tema_ano || '').slice(0, 220);

    const estiloCunha =
        estilo === 'cunha'
            ? `
ESTILO DE ENTREGA (obrigatório): Devocional no estilo de mensagem de rádio cristã brasileira — linguagem calorosa, simples, direta, como se falasse ao ouvinte; parágrafos curtos; "você" ou "nós"; tom de fé e esperança. Não cite nomes de pastores nem reproduza frases literais de terceiros; inspire-se apenas no tipo de mensagem (devocional em áudio).
`
            : '';

    const temaMesCal = (devotional.tema_mes_calendario || '').slice(0, 220);

    const userPrompt = `Dia do ano: ${dayOfYear} de 365 · Ano civil: ${year}.
IMPORTANTE: Este é o dia ${dayOfYear} — a reflexão deve ser claramente DISTINTA da de outros dias (outro ângulo, outros exemplos, outra abertura). Não reproduza o texto-base como cópia; reescreva por completo.
ID único do pedido: ${year}-DOY-${dayOfYear} (garanta que o JSON deste pedido não seja igual ao de outro dia).

PASSAGEM / referência principal: ${ref}
Título de apoio (pode inspirar o tom): ${titulo}

TEMA DO MÊS (contexto na UI): ${temaMes}
${temaMesCal ? `TEMA DO MÊS CALENDÁRIO (integrar na reflexão): ${temaMesCal}\n` : ''}TEMA DO ANO (contexto): ${temaAno}

INSTRUÇÃO DE TEMA (obedeça à letra na estrutura da reflexão):
${instr || 'Ligue a reflexão à passagem e aos temas acima.'}

Texto-base do catálogo (use só como ideia geral; NÃO copie frases literais — parafraseie e personalize para o dia ${dayOfYear}):
${baseReflexao || '(sem texto-base)'}

${estiloCunha}

Responda APENAS com um JSON válido neste formato exato (sem markdown):
{"reflexao":"6 a 9 parágrafos em português do Brasil, texto profundo: explique o sentido da passagem no contexto bíblico, por que importa hoje, dilemas humanos que ela toca, e uma linha de aplicação ao longo do texto (não só no fim)","aplicacao":"2 parágrafos com aplicação prática e concreta","oracao":"1 oração (pode ser um pouco mais longa que uma frase única)"}

Regras: a reflexão DEVE demonstrar que o tema instruído foi seguido (não genérico); o primeiro parágrafo deve amarrar tema + passagem; tom pastoral evangélico; não invente referências bíblicas além da dada; não contradiga a Escritura; desenvolva ideias com clareza (não repita a mesma ideia em parágrafos diferentes).`;

    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getOpenAiKey()}`
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: estilo === 'cunha' ? 0.78 : 0.72,
                max_tokens: 4200,
                messages: [
                    {
                        role: 'system',
                        content:
                            estilo === 'cunha'
                                ? 'Você escreve devocionais cristãos em português do Brasil, em tom acolhedor e claro, como mensagem de rádio. Responde somente JSON válido, sem blocos de código.'
                                : 'Você escreve devocionais cristãos em português do Brasil. Responde somente JSON válido, sem blocos de código.'
                    },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        const raw = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = raw.error && raw.error.message ? raw.error.message : res.statusText;
            logger.error('bibleDevotionalAi enrichDevotional365 HTTP:', msg);
            return { error: msg || 'Erro ao chamar a IA.' };
        }

        const text = (raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content) || '';
        let parsed;
        try {
            const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            logger.error('bibleDevotionalAi JSON parse:', parseErr, text.slice(0, 200));
            return { error: 'Resposta da IA em formato inválido. Tente novamente.' };
        }

        const out = {
            reflexao: String(parsed.reflexao || '').trim(),
            aplicacao: String(parsed.aplicacao || '').trim(),
            oracao: String(parsed.oracao || '').trim()
        };
        if (!out.reflexao) {
            return { error: 'A IA não devolveu reflexão.' };
        }
        cacheSet(cacheKey, out);
        return out;
    } catch (e) {
        logger.error('bibleDevotionalAi enrichDevotional365:', e);
        return { error: e.message || 'Falha de rede ao gerar devocional com IA.' };
    }
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Gera uma frase-tema para o mês (devocional 365 / painel admin).
 */
async function generateMonthThemeLine(year, month, extraHint) {
    const key = getOpenAiKey();
    if (!key) {
        return { error: 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).' };
    }
    const m = Math.max(1, Math.min(12, parseInt(month, 10) || 1));
    const y = parseInt(year, 10) || new Date().getFullYear();
    const nome = MONTH_NAMES[m - 1] || String(m);
    const hint = String(extraHint || '').slice(0, 400);
    const userPrompt =
        `Ano ${y}, mês: ${nome}.\n` +
        (hint ? `Contexto ou tema anterior: ${hint}\n` : '') +
        'Responda com UMA frase curta em português do Brasil (máx. 120 caracteres), tema cristão devocional para este mês, sem citar marca nem pastor. Só a frase, sem aspas.';

    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0.75,
                max_tokens: 200,
                messages: [
                    {
                        role: 'system',
                        content: 'Escreve apenas uma linha de tema devocional em português do Brasil.'
                    },
                    { role: 'user', content: userPrompt }
                ]
            })
        });
        const raw = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = raw.error && raw.error.message ? raw.error.message : res.statusText;
            return { error: msg || 'Erro OpenAI.' };
        }
        const text = (raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content) || '';
        const line = String(text).replace(/\s+/g, ' ').trim().slice(0, 200);
        if (!line) return { error: 'Resposta vazia.' };
        return { text: line };
    } catch (e) {
        logger.error('bibleDevotionalAi generateMonthThemeLine:', e);
        return { error: e.message || 'Falha de rede.' };
    }
}

async function generateAllMonthThemesForYear(year, delayMs) {
    const delay = Math.max(0, parseInt(delayMs, 10) || 350);
    const themes = {};
    const errors = [];
    for (let m = 1; m <= 12; m++) {
        /* eslint-disable no-await-in-loop */
        const prev = m > 1 ? themes[m - 1] : '';
        const r = await generateMonthThemeLine(year, m, prev);
        if (r.error) {
            errors.push({ month: m, error: r.error });
            themes[m] = '';
        } else {
            themes[m] = r.text;
        }
        if (delay && m < 12) {
            await new Promise(function (resolve) {
                setTimeout(resolve, delay);
            });
        }
    }
    return { themes, errors };
}

function normalizeDev365Ref(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Gera devocional completo (título, passagem nova, reflexão longa) alinhado ao tema — uso admin.
 * @param {{ dayOfYear: number, year: number, estilo?: string, theme: object, avoidSnapshots?: Array<{titulo?:string,versiculo_ref?:string}>, retryExtra?: string }} ctx — theme = saída de resolveThemeForDev365
 */
async function generateFullDevotional365Day(ctx) {
    const dayOfYear = ctx.dayOfYear;
    const year = ctx.year;
    const estilo = (ctx.estilo || 'padrao').toLowerCase() === 'cunha' ? 'cunha' : 'padrao';
    const theme = ctx.theme || {};
    const avoidSnapshots = Array.isArray(ctx.avoidSnapshots) ? ctx.avoidSnapshots : [];
    const retryExtra = String(ctx.retryExtra || '').slice(0, 800);

    if (!getOpenAiKey()) {
        return { error: 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).' };
    }

    const instr = String(theme.tema_ia_instrucao || '').slice(0, 2000);
    const temaMes = (theme.tema_mes || '').slice(0, 300);
    const temaAno = (theme.tema_ano || '').slice(0, 300);
    const temaMesCal = (theme.tema_mes_calendario || '').slice(0, 300);

    const avoidLines = avoidSnapshots
        .filter((r) => r && (r.versiculo_ref || r.titulo))
        .slice(0, 45)
        .map((r) => {
            const ref = (r.versiculo_ref || '').trim();
            const tit = (r.titulo || '').trim();
            if (ref && tit) return `- ${ref} (título já usado: «${tit.slice(0, 80)}»)`;
            if (ref) return `- ${ref}`;
            return `- (título) «${tit.slice(0, 80)}»`;
        })
        .join('\n');

    const cacheKey = `dev365-full:${year}:${dayOfYear}:${MODEL}:${estilo}:${fnv1aShort(instr).slice(0, 24)}:${fnv1aShort(avoidLines).slice(0, 16)}:${fnv1aShort(retryExtra).slice(0, 8)}`;
    const hit = cacheGet(cacheKey);
    if (hit) return hit;

    const estiloCunha =
        estilo === 'cunha'
            ? `
ESTILO (obrigatório): Tom de mensagem de rádio cristã brasileira — linguagem calorosa e clara; parágrafos com bom ritmo; "você" ou "nós"; fé e esperança.
`
            : '';

    const userPrompt = `Dia do ano: ${dayOfYear} de 365 · Ano civil: ${year}.
MODO: GERAÇÃO COMPLETA — você escolhe UM título NOVO, UMA passagem bíblica principal DIFERENTE das listadas abaixo e escreve tudo original (não copie devocionais de outros dias).

TEMA DO MÊS (painel): ${temaMes}
${temaMesCal ? `TEMA DO MÊS CALENDÁRIO: ${temaMesCal}\n` : ''}TEMA DO ANO: ${temaAno}

INSTRUÇÃO DE TEMA (obedeça; estruture título + reflexão + aplicação em função disto):
${instr || 'Ligue o devocional ao tema do mês e ao contexto do dia.'}

${avoidLines ? `PASSAGENS E TÍTULOS JÁ USADOS (NÃO REPITA — escolha OUTRO livro da Bíblia ou OUTRO capítulo/versículo; há 66 livros, explore variedade):\n${avoidLines}\n` : ''}
${retryExtra ? `CORREÇÃO OBRIGATÓRIA: ${retryExtra}\n` : ''}

${estiloCunha}

REGRAS CRÍTICAS:
- Este é o dia ${dayOfYear} — título e "versiculo_ref" devem ser OBRIGATORIAMENTE distintos de qualquer linha da lista acima (nem a mesma passagem com redação diferente).
- Varie os livros ao longo do calendário: não fique preso a um único livro ou história em dias consecutivos.
- Escolha uma passagem que dialogue com o tema. "versiculo_ref" deve ser UMA referência válida em português, nome do livro como na Bíblia NVI no Brasil (ex.: João, Salmos, Romanos, 1 Coríntios, 2 Reis), formato "Livro capítulo:versículo" ou "Livro capítulo:versículo-versículo" se for trecho curto.
- A reflexão deve ser LONGA e PROFUNDA: 6 a 10 parágrafos em português do Brasil, explicando o texto, o contexto espiritual, implicações para a vida, sem superficialidade.
- Não cite nomes de pastores; não copie texto de terceiros.

Responda APENAS com JSON válido (sem markdown), formato exato:
{"titulo":"string até 120 caracteres","versiculo_ref":"ex.: João 14:6","versiculo_texto":"","reflexao":"texto longo","aplicacao":"dois parágrafos","oracao":"oração"}

Use versiculo_texto vazio (o servidor preenche com a NVI quando possível).`;

    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getOpenAiKey()}`
            },
                body: JSON.stringify({
                model: MODEL,
                temperature: Math.min(
                    0.92,
                    (estilo === 'cunha' ? 0.82 : 0.78) + ((dayOfYear % 11) * 0.008)
                ),
                max_tokens: 5200,
                messages: [
                    {
                        role: 'system',
                        content:
                            'Você é teólogo e escritor de devocionais evangélicos em português do Brasil. Conhece a Bíblia; não contradiz a Escritura. Responde somente JSON válido, sem blocos de código.'
                    },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        const raw = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = raw.error && raw.error.message ? raw.error.message : res.statusText;
            logger.error('bibleDevotionalAi generateFullDevotional365Day HTTP:', msg);
            return { error: msg || 'Erro ao chamar a IA.' };
        }

        const text = (raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content) || '';
        let parsed;
        try {
            const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            logger.error('bibleDevotionalAi generateFullDevotional365Day JSON parse:', parseErr, text.slice(0, 240));
            return { error: 'Resposta da IA em formato inválido. Tente novamente.' };
        }

        const out = {
            titulo: String(parsed.titulo || '').trim(),
            versiculo_ref: String(parsed.versiculo_ref || '').trim(),
            versiculo_texto: String(parsed.versiculo_texto || '').trim(),
            reflexao: String(parsed.reflexao || '').trim(),
            aplicacao: String(parsed.aplicacao || '').trim(),
            oracao: String(parsed.oracao || '').trim()
        };
        if (!out.reflexao || !out.versiculo_ref) {
            return { error: 'A IA deve devolver reflexão e versiculo_ref.' };
        }
        if (!out.titulo) {
            out.titulo = 'Devocional — dia ' + dayOfYear;
        }
        cacheSet(cacheKey, out);
        return out;
    } catch (e) {
        logger.error('bibleDevotionalAi generateFullDevotional365Day:', e);
        return { error: e.message || 'Falha de rede ao gerar devocional completo.' };
    }
}

/**
 * Estudos por livro — ordem de preferência do modelo:
 * 1) BIBLE_BOOK_STUDY_AI_MODEL (recomendado: gpt-4o para textos longos e coerentes)
 * 2) BIBLE_DEV365_AI_MODEL (se já definido para os 365)
 * 3) gpt-4o — fallback "melhor qualidade" para estudos (custo maior que mini)
 *
 * Tokens: BIBLE_BOOK_STUDY_MAX_TOKENS (máx. 16384). Recomendado 15000–16000 para não cortar Êxodo/Levítico densos.
 */
const MODEL_BOOK_STUDY = process.env.BIBLE_BOOK_STUDY_AI_MODEL || process.env.BIBLE_DEV365_AI_MODEL || 'gpt-4o';
const BOOK_STUDY_MAX_TOKENS = Math.min(16384, Math.max(4000, parseInt(process.env.BIBLE_BOOK_STUDY_MAX_TOKENS, 10) || 16000));

/**
 * Êxodo: lista nominal das pragas + âncoras (NVI/Almeida — pequenas variações de versículo são aceitáveis).
 * O modelo deve REPRODUZIR os nomes e desenvolver cada uma; não basta dizer "houve pragas".
 */
const EXODUS_STUDY_DIRECTIVE = `

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
`;

/**
 * Directivas extra por livro: obriga desenvolvimento de tópicos de alto impacto (ex.: dez pragas em Êxodo).
 * @param {string} bookId
 * @param {string} bookName
 * @returns {string}
 */
function getBookStudyExtraDirectives(bookId, bookName) {
    const id = String(bookId || '')
        .trim()
        .toLowerCase();
    const n = String(bookName || '')
        .trim()
        .toLowerCase();

    if (id === 'ex' || n.includes('êxodo')) {
        return EXODUS_STUDY_DIRECTIVE;
    }

    if (id === 'lv' || n.includes('levítico')) {
        return `

=== OBRIGATÓRIO PARA LEVÍTICO ===
Desenvolva com profundidade (não listas frias): santidade de Deus; significado teológico dos sacrifícios e do Dia da Expiação; pureza/impureza; grandes festas; blocos morais (ex.: Levítico 18–20); "ama o teu próximo como a ti mesmo" no contexto do livro; ligação com Cristo como cumprimento (em termos teológicos, sem slogans).
`;
    }

    if (id === 'nm' || n.includes('números')) {
        return `

=== OBRIGATÓRIO PARA NÚMEROS ===
Percorra com secções próprias: preparação para Canaã; murmurações e julgamentos; Balaão e Balaque (significado narrativo e teológico); a nova geração; incidentes-chave (ex.: madeira de bronze) com explicação, não só menção.
`;
    }

    if (id === 'dt' || n.includes('deuteron')) {
        return `

=== OBRIGATÓRIO PARA DEUTERONÔMIO ===
Desenvolva: estrutura como renovação da aliança; Shema e centralidade do amor a Deus; repetição e actualização da lei; bênçãos e maldições; morte de Moisés e transição — cada bloco com substância, não resumo de uma linha por capítulo.
`;
    }

    if (id === 'gn' || n.includes('gênesis')) {
        return `

=== REFORÇO PARA GÉNESIS ===
Garanta grandes blocos para: criação e queda; primeiros capítulos até Abraão; patriarcas; José e o propósito de Deus nas vicissitudes — cada arco com múltiplos parágrafos e tensão teológica clara.
`;
    }

    if (
        [
            'js',
            'jud',
            'rt',
            '1sm',
            '2sm',
            '1kgs',
            '2kgs',
            '1ch',
            '2ch',
            'ezr',
            'ne',
            'et'
        ].indexOf(id) >= 0
    ) {
        return `

=== LIVRO HISTÓRICO / NARRATIVO ===
Identifique os principais arcos narrativos e personagens; para CADA arco de grande impacto, escreva subsecção própria: o que acontece, tensão espiritual, o que revela sobre Deus e o povo, e aplicação. Não se limite a uma cronologia superficial.
`;
    }

    if (['job', 'ps', 'prv', 'ec', 'so'].indexOf(id) >= 0) {
        return `

=== LIVRO POÉTICO / SAPIENCIAL ===
Explique género literário; temas centrais; estrutura quando visível; secções dedicadas aos discursos ou ciclos mais marcantes (ex.: amigos de Jó, Salmos de lamentação ou de confiança, provérbios por temas). Evite generalidades vazias.
`;
    }

    if (
        ['is', 'jr', 'lm', 'ez', 'dn', 'ho', 'jl', 'am', 'ob', 'jn', 'mi', 'na', 'hk', 'zp', 'hg', 'zc', 'ml'].indexOf(id) >= 0
    ) {
        return `

=== LIVRO PROFÉTICO ===
Desenvolva: contexto histórico em linhas gerais; mensagem principal; julgamento e esperança; textos messiânicos ou de consolação quando presentes; relação com a aliança. Secções por grandes blocos literários, não um parágrafo por capítulo.
`;
    }

    if (
        [
            'mt',
            'mk',
            'lk',
            'jo',
            'act',
            'rm',
            '1co',
            '2co',
            'gl',
            'eph',
            'ph',
            'cl',
            '1ts',
            '2ts',
            '1tm',
            '2tm',
            'tt',
            'phm',
            'hb',
            'jm',
            '1pe',
            '2pe',
            '1jo',
            '2jo',
            '3jo',
            'jd',
            're'
        ].indexOf(id) >= 0
    ) {
        return `

=== NOVO TESTAMENTO ===
Desenvolva teologia central do livro; narrativa (se aplicável); argumentos principais (cartas); parábolas ou discursos-chave (evangelhos); conexão com o Antigo Testamento e com Cristo. Epístolas: trace o fio condutor do argumento, não só tópicos soltos. Em Hebreus, desenvolva o argumento do sacerdócio de Cristo e as figuras do AT citadas, com profundidade.
`;
    }

    return '';
}

const BOOK_STUDY_PROFUNDIDADE_GLOBAL = `
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
`;

/**
 * Gera texto longo de estudo introdutório do livro (bible_book_studies), no tom de estudo completo tipo Gênesis no site.
 * @param {{ bookId: string, bookName: string, referenceSample?: string, baseadoEmGenesis?: boolean, profundidadeEstiloGenesis?: boolean }} opts — referenceSample = trecho do estudo de Gênesis para espelhar profundidade (opcional)
 */
async function generateBookStudyFullText(opts) {
    const bookId = String(opts.bookId || '').trim();
    const bookName = String(opts.bookName || bookId).trim();
    const referenceSample = String(opts.referenceSample || '').trim();
    const baseadoEmGenesis = !!(opts && opts.baseadoEmGenesis);
    const profundidadeEstiloGenesis = !!(opts && opts.profundidadeEstiloGenesis);

    if (!getOpenAiKey()) {
        return { error: 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).' };
    }
    if (!bookId || !bookName) {
        return { error: 'Livro inválido.' };
    }

    const refBlock =
        referenceSample && bookId.toLowerCase() !== 'gn'
            ? `
EXEMPLO NO SITE (estudo de Gênesis — use APENAS como referência de profundidade, extensão e estilo de secções; NÃO copie frases; o texto final deve ser 100% sobre ${bookName}):

---
${referenceSample.slice(0, 11000)}
---
`
            : '';

    const modoGenesisExtra =
        baseadoEmGenesis || profundidadeEstiloGenesis
            ? `

MODO PROFUNDIDADE EXTRA (painel: estilo Gênesis):
- Trate este livro com o mesmo nível de riqueza que um estudo "tipo Gênesis" no site: muitas subsecções, muitas histórias ou arcos narrativos desenvolvidos (não uma frase por capítulo).
- Inclua secções claras com títulos em linha própria:
  ► O QUE ESTE LIVRO REPRESENTA no conjunto da Escritura e na história da redenção.
  ► O QUE APRENDEMOS COM ${bookName} (síntese espiritual e prática).
  ► NARRATIVAS E HISTÓRIAS PRINCIPAIS: para CADA grande história ou bloco, desenvolvimento substancial: actores, tensão espiritual, o que revela sobre Deus e o ser humano; ligue arcos quando fizer sentido.
- Vá além do óbvio: explicações memoráveis e fundamentadas no texto; linguagem acessível mas não superficial.
`
            : '';

    const bookDirectives = getBookStudyExtraDirectives(bookId, bookName);

    const userPrompt = `Livro bíblico: ${bookName} (id técnico: ${bookId}).

Escreva um ÚNICO estudo completo do livro em português do Brasil, para leitor cristão evangélico.

${BOOK_STUDY_PROFUNDIDADE_GLOBAL}

REQUISITOS DE ESTRUTURA (obrigatórios):
- NÃO seja um resumo rápido. O texto deve ser MUITO LONGO quando o conteúdo do livro o exigir: vários mil palavras, muitos parágrafos; priorize completar os tópicos abaixo em vez de poupar tokens.
- O leitor deve poder compreender narrativa, doutrinas e contexto com profundidade (como se tivesse lido o livro com um professor ao lado).
- Organize com títulos em linha própria (MAIÚSCULAS curtas ou "► Secção").
- Inclua no mínimo estas áreas (adaptando ao género do livro): VISÃO GERAL; CONTEXTO; ESTRUTURA E CONTEÚDO (grandes blocos com aprofundamento real); PERSONAGENS OU TEMAS CENTRAIS; MENSAGEM TEOLÓGICA E LUGAR NA HISTÓRIA DA REDENÇÃO; APLICAÇÃO PARA HOJE.
- Ao citar passagens, use o nome do livro como na Bíblia em português (ex.: ${bookName} 3; Salmos 23; João 3) para o site poder criar links. Insira referências ao longo de CADA secção importante, não só no início.
- Não invente versículos longos entre aspas; pode parafrasear com precisão, mas o conteúdo deve corresponder ao texto sagrado.
- PRIORIDADE MÁXIMA: especificidade (nomes, eventos, referências). Se faltar espaço, corte adjetivos vazios, não corte listas de factos bíblicos exigidas pelas directivas do livro.
${bookDirectives}
${modoGenesisExtra}
${refBlock}

Responda SOMENTE com o texto do estudo, sem comentários introdutórios nem markdown de código.`;

    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getOpenAiKey()}`
            },
            body: JSON.stringify({
                model: MODEL_BOOK_STUDY,
                temperature: 0.4,
                max_tokens: BOOK_STUDY_MAX_TOKENS,
                presence_penalty: 0.12,
                frequency_penalty: 0.08,
                messages: [
                    {
                        role: 'system',
                        content:
                            'Você é teólogo evangélico, exegeta e professor de Bíblia em português do Brasil, com nível de estudos avançados (teologia bíblica, exegese histórico-gramatical, história da redenção). Domina os 66 livros; não contradiz a Escritura. Produz estudos extensos e rigorosos: priorize FACTOS DO TEXTO — nomes próprios, sequências de eventos, referências capítulo/versículo — e recusa resumos vagos. Quando o utilizador pedir desenvolvimento de séries (ex.: dez pragas), nomeie e explique cada elemento. Nunca invente citações textuais de obras extra-bíblicas nem páginas; alusões a tradição ou historiografia só em termos gerais.'
                    },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        const raw = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = raw.error && raw.error.message ? raw.error.message : res.statusText;
            logger.error('bibleDevotionalAi generateBookStudyFullText HTTP:', msg);
            return { error: msg || 'Erro ao chamar a IA.' };
        }

        const text = (raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content) || '';
        const trimmed = String(text).trim();
        if (trimmed.length < 2200) {
            return {
                error:
                    'A resposta da IA ficou curta demais para o nível de profundidade pedido. Defina BIBLE_BOOK_STUDY_MAX_TOKENS=16000 (ou o máximo permitido), use BIBLE_BOOK_STUDY_AI_MODEL=gpt-4o e regenere; textos como Êxodo exigem saída longa.'
            };
        }
        return { text: trimmed };
    } catch (e) {
        logger.error('bibleDevotionalAi generateBookStudyFullText:', e);
        return { error: e.message || 'Falha de rede.' };
    }
}

function clearDev365Cache() {
    cache.clear();
}

module.exports = {
    enrichDevotional365,
    generateFullDevotional365Day,
    generateMonthThemeLine,
    generateAllMonthThemesForYear,
    generateBookStudyFullText,
    clearDev365Cache,
    normalizeDev365Ref
};
