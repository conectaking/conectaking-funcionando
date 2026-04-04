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
    const baseReflexao = String(devotional.reflexao || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
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
{"reflexao":"3 a 5 parágrafos em português do Brasil","aplicacao":"1 parágrafo com aplicação prática","oracao":"1 oração curta"}

Regras: a reflexão DEVE demonstrar que o tema instruído foi seguido (não genérico); o primeiro parágrafo deve amarrar tema + passagem; tom pastoral evangélico; não invente referências bíblicas além da dada; não contradiga a Escritura.`;

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
                max_tokens: 1600,
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

function clearDev365Cache() {
    cache.clear();
}

module.exports = {
    enrichDevotional365,
    generateMonthThemeLine,
    generateAllMonthThemesForYear,
    clearDev365Cache
};
