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
 * @param {object} devotional — titulo, versiculo_ref, reflexao, tema_mes, tema_ano, day_of_year
 * @param {{ dayOfYear: number, year: number }} ctx
 * @returns {Promise<{ reflexao?: string, aplicacao?: string, oracao?: string, error?: string }>}
 */
async function enrichDevotional365(devotional, ctx) {
    const { dayOfYear, year } = ctx;
    if (!OPENAI_API_KEY || !String(OPENAI_API_KEY).trim()) {
        return { error: 'OPENAI_API_KEY não configurada no servidor (Render).' };
    }

    const key = `dev365-ai:${year}:${dayOfYear}:${MODEL}`;
    const hit = cacheGet(key);
    if (hit) return hit;

    const titulo = (devotional.titulo || '').slice(0, 200);
    const ref = (devotional.versiculo_ref || '').slice(0, 120);
    const baseReflexao = String(devotional.reflexao || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
    const temaMes = (devotional.tema_mes || '').slice(0, 200);
    const temaAno = (devotional.tema_ano || '').slice(0, 200);

    const userPrompt = `Dia bíblico do ano: ${dayOfYear} (calendário civil de referência: ${year}).
Título do devocional: ${titulo}
Referência bíblica principal: ${ref}
Tema espiritual do MÊS (alinhe a introdução e o tom): ${temaMes}
Tema espiritual do ANO (alinhe uma frase de abertura ou fechamento): ${temaAno}
Texto-base / reflexão de catálogo (inspire-se na mensagem; não copie literalmente longos trechos): ${baseReflexao || '(sem texto-base)'}

Responda APENAS com um JSON válido neste formato exato (sem markdown):
{"reflexao":"3 a 5 parágrafos curtos em português do Brasil","aplicacao":"1 parágrafo com aplicação prática","oracao":"1 oração curta em primeira pessoa plural ou singular"}

Regras: tom pastoral evangélico; não invente números de capítulos que não sejam a referência dita; não contradiga a Bíblia.`;

    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0.65,
                max_tokens: 1400,
                messages: [
                    {
                        role: 'system',
                        content:
                            'Você é um assistente cristão que escreve devocionais em português do Brasil. Responde somente JSON válido, sem blocos de código.'
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
        cacheSet(key, out);
        return out;
    } catch (e) {
        logger.error('bibleDevotionalAi enrichDevotional365:', e);
        return { error: e.message || 'Falha de rede ao gerar devocional com IA.' };
    }
}

module.exports = {
    enrichDevotional365
};
