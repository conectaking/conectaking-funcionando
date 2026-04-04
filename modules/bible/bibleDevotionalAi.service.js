/**
 * Enriquecimento opcional dos devocionais 365 com reflexão gerada por IA (OpenAI).
 * Requer OPENAI_API_KEY no ambiente do servidor.
 */

const fetch = require('node-fetch');
const logger = require('../../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
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

    if (!OPENAI_API_KEY || !String(OPENAI_API_KEY).trim()) {
        return { error: 'OPENAI_API_KEY não configurada no servidor (Render).' };
    }

    const instr = String(devotional.tema_ia_instrucao || '').slice(0, 1200);
    const cacheKey = `dev365-ai:${year}:${dayOfYear}:${MODEL}:${estilo}:${fnv1aShort(instr)}:${fnv1aShort(devotional.reflexao || '').slice(0, 200)}`;
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
                Authorization: `Bearer ${OPENAI_API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: estilo === 'cunha' ? 0.72 : 0.65,
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

module.exports = {
    enrichDevotional365
};
