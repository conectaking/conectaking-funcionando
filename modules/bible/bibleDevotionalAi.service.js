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

const MODEL_BOOK_STUDY = process.env.BIBLE_BOOK_STUDY_AI_MODEL || process.env.BIBLE_DEV365_AI_MODEL || 'gpt-4o-mini';
const BOOK_STUDY_MAX_TOKENS = Math.min(16384, Math.max(2000, parseInt(process.env.BIBLE_BOOK_STUDY_MAX_TOKENS, 10) || 9000));

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

MODO PROFUNDIDADE (OBRIGATÓRIO — pedido explícito pelo painel):
- Trate este livro com o mesmo nível de riqueza que um estudo "tipo Gênesis" no site: muitas subsecções, muitas histórias ou arcos narrativos desenvolvidos (não uma frase por capítulo).
- Inclua secções claras com títulos em linha própria:
  ► O QUE ESTE LIVRO REPRESENTA no conjunto da Escritura e na história da redenção.
  ► O QUE APRENDEMOS COM ${bookName} (síntese espiritual e prática).
  ► NARRATIVAS E HISTÓRIAS PRINCIPAIS: para CADA grande história ou bloco (conforme o livro), escreva um desenvolvimento substancial: o que acontece, quem são os actores, tensão espiritual, e o que isso revela sobre Deus e sobre o ser humano. Onde fizer sentido, ligue histórias entre si.
- Vá além do óbvio: explicações memoráveis e bem fundamentadas no texto, sem clichês vazios; linguagem acessível mas não superficial.
- Não invente factos históricos fora da Bíblia; pode contextualizar de forma geral (época, género literário) quando útil.
`
            : '';

    const userPrompt = `Livro bíblico: ${bookName} (id técnico: ${bookId}).

Escreva um ÚNICO estudo completo do livro em português do Brasil, para leitor cristão evangélico.

REQUISITOS (obrigatórios):
- NÃO seja um resumo de um minuto. O texto deve ser LONGO e denso: vários mil palavras de conteúdo útil, muitos parágrafos.
- O leitor deve conseguir compreender a narrativa, os ensinamentos e o contexto SEM precisar ler o livro inteiro, mas sem superficialidade: explique acontecimentos, personagens, conflitos e mensagem teológica com profundidade.
- Organize com títulos em linha própria (use linhas curtas em MAIÚSCULAS ou o padrão "► Secção" antes de cada bloco).
- Inclua secções como: VISÃO GERAL; CONTEXTO; ESTRUTURA E CONTEÚDO (percorra os grandes blocos do livro com desenvolvimento — não se limite a uma frase por capítulo: agrupe e aprofunde); PERSONAGENS OU TEMAS CENTRAIS; MENSAGEM TEOLÓGICA; APLICAÇÃO PARA HOJE.
- Ao citar passagens, use o formato com nome do livro como na Bíblia em português (ex.: ${bookName} 3, ou Salmos 23, João 3) para o site poder criar links.
- Não invente citações literais longas da Bíblia; pode parafrasear. Não cite nomes de pastores ou obras comerciais.
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
                temperature: 0.55,
                max_tokens: BOOK_STUDY_MAX_TOKENS,
                messages: [
                    {
                        role: 'system',
                        content:
                            'Você é teólogo evangélico e professor de Bíblia em português do Brasil. Conhece bem a estrutura e o conteúdo dos 66 livros; não contradiz a Escritura. Produz estudos longos, claros e pastorais, com rigor e acessibilidade.'
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
        if (trimmed.length < 800) {
            return { error: 'A resposta da IA ficou curta demais; tente novamente.' };
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
