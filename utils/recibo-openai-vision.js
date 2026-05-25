/**
 * Extrato/comprovante via OpenAI Vision (gpt-4o-mini).
 * Usa OPENAI_API_KEY — mesma chave do KingBrief e demais módulos.
 */

const fetch = require('node-fetch');
const logger = require('./logger');

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = (process.env.RECIBO_OCR_AI_MODEL || 'gpt-4o-mini').trim();

const PEDAGIO_HINTS = ['P1', 'P3', 'P4', 'P11', 'ENTREVIAS', 'EIXOSP', 'VIAPAULISTA', 'VIA COLINAS', 'PEDÁGIO', 'PEDAGIO', 'CONCESSIONARIA', 'ROTA SO', 'TOLL'];

const SYSTEM_PROMPT = `Extraia cada transação APROVADA de prints de extrato de cartão (fundo escuro, texto claro, pt-BR).
Responda SOMENTE JSON válido:
{"items":[{"nome":"estabelecimento","data":"DD/MM","valor":13.2,"recusada":false}]}

Regras obrigatórias:
- Para CADA linha de cobrança APROVADA: nome, data DD/MM, valor (ex. 13,20 R$).
- PROIBIDO incluir transação recusada: se aparecer "Recusada"/"Recusado" ou valor em vermelho/rosa, NÃO coloque no JSON (recusada:true também não deve ir na lista).
- Se o mesmo estabelecimento e valor aparecer duas vezes e uma estiver recusada, inclua SOMENTE a aprovada (uma entrada).
- Nome em duas linhas (ex. CONCESSIONARIA + ROTA SO): junte em um nome só.
- Duas cobranças iguais e ambas APROVADAS (ex. dois pedágios Entrevias): inclua as duas.
- valor: número decimal (13.2 = R$ 13,20). data: DD/MM quando existir.
- Leia TODAS as linhas visíveis; não pare no meio da lista.
- Cupom único (não lista): 1 item. Nada legível: {"items":[]}`;

function isAvailable() {
    return !!OPENAI_API_KEY;
}

function parseJsonFromContent(content) {
    if (!content || typeof content !== 'string') return null;
    const trimmed = content.trim();
    try {
        return JSON.parse(trimmed);
    } catch (_) {}
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
        return JSON.parse(m[0]);
    } catch (_) {
        return null;
    }
}

function categoriaItem(nome) {
    const upper = (nome || '').toUpperCase();
    for (const p of PEDAGIO_HINTS) {
        if (upper.includes(p)) return 'Pedágio';
    }
    return 'Comércio / Outros';
}

function normalizarValor(v) {
    if (typeof v === 'number' && !isNaN(v) && v >= 0) return Math.round(v * 100) / 100;
    if (typeof v === 'string') {
        const n = parseFloat(v.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
        if (!isNaN(n) && n >= 0) return Math.round(n * 100) / 100;
    }
    return null;
}

function itensFromOpenAiPayload(payload) {
    const raw = payload && (payload.items || payload.itens || payload.transactions);
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const recusada = !!(row.recusada || row.recusado || row.declined)
            || (row.status && String(row.status).toUpperCase() === 'DECLINED');
        if (recusada) continue;
        const nomeRaw = (row.nome || row.name || row.estabelecimento || row.descricao || '').toString().trim();
        const obs = (row.observacao || row.notes || row.status_text || '').toString();
        if (/recusad|negad|cancelad|estornad/i.test(nomeRaw + ' ' + obs)) continue;
        const valor = normalizarValor(row.valor != null ? row.valor : row.amount);
        if (valor == null || valor <= 0) continue;
        const nome = nomeRaw.slice(0, 120) || 'Transação';
        const item = {
            valor,
            categoria: categoriaItem(nome),
            textoTrecho: nome.slice(0, 120),
            nome_estabelecimento: nome.slice(0, 80)
        };
        const data = (row.data || row.date || '').toString().trim();
        if (data && /\d{1,2}\/\d{1,2}/.test(data)) item.data = data.slice(0, 20);
        out.push(item);
    }
    return out;
}

async function bufferToDataUrl(imageBuffer) {
    try {
        const sharp = require('sharp');
        const buf = await sharp(imageBuffer)
            .rotate()
            .resize(1600, null, { withoutEnlargement: true, fit: 'inside' })
            .jpeg({ quality: 88, mozjpeg: true })
            .toBuffer();
        return 'data:image/jpeg;base64,' + buf.toString('base64');
    } catch (e) {
        logger.warn('recibo-openai-vision resize:', e.message);
        return 'data:image/jpeg;base64,' + imageBuffer.toString('base64');
    }
}

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise<{ itensSugeridos: Array, parseResult: Object }>}
 */
async function extrairComOpenAi(imageBuffer) {
    if (!isAvailable()) {
        return { itensSugeridos: [], parseResult: { source: 'openai', error: 'OPENAI_API_KEY não configurada' } };
    }
    const dataUrl = await bufferToDataUrl(imageBuffer);
    const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + OPENAI_API_KEY
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Extraia todas as transações aprovadas visíveis nesta imagem. JSON apenas.'
                        },
                        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 4096,
            response_format: { type: 'json_object' }
        })
    });

    const text = await response.text();
    if (!response.ok) {
        logger.warn('recibo-openai-vision API:', response.status, text.slice(0, 300));
        const err = new Error(response.status === 429 ? 'Limite OpenAI atingido.' : 'Falha na leitura com IA.');
        err.status = response.status;
        throw err;
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        throw new Error('Resposta inválida da OpenAI.');
    }

    const content = data?.choices?.[0]?.message?.content;
    const parsed = parseJsonFromContent(content);
    const itensSugeridos = itensFromOpenAiPayload(parsed || {});

    return {
        itensSugeridos,
        parseResult: {
            source: 'openai',
            model: MODEL,
            confidence: itensSugeridos.length > 0 ? 0.92 : 0.2,
            warnings: itensSugeridos.length ? [] : ['IA não identificou transações na imagem'],
            transactions: itensSugeridos.map((it) => ({
                name: it.nome_estabelecimento,
                date: it.data,
                amount: it.valor,
                status: 'PAID'
            }))
        }
    };
}

module.exports = {
    isAvailable,
    extrairComOpenAi,
    itensFromOpenAiPayload
};
