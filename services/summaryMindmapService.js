/**
 * KingBrief – Serviço de resumo e mapa mental (OpenAI GPT)
 * Envia transcrição e devolve JSON: summary, topics, actions, mindmap.
 * Regras: máx. 6 ramos principais, máx. 4 níveis, palavras-chave curtas (2–6 palavras), collapsed true por defeito nos ramos.
 */

const fetch = require('node-fetch');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `Tu és um assistente que analisa transcrições de reuniões e devolves APENAS um objeto JSON válido, sem texto antes ou depois, com a seguinte estrutura exata:

{
  "summary": "Resumo executivo curto e estratégico (2-4 frases)",
  "topics": ["Tópico 1", "Tópico 2", "..."],
  "actions": [
    {"task": "Descrição da tarefa", "owner": null, "due": null}
  ],
  "mindmap": {
    "id": "root",
    "title": "Tema Central",
    "collapsed": false,
    "children": [
      {
        "id": "node1",
        "title": "Ramo principal (2-6 palavras)",
        "collapsed": true,
        "children": []
      }
    ]
  }
}

Regras do mapa mental:
- Máximo 6 ramos principais (filhos diretos de root).
- Máximo 4 níveis de profundidade (root -> child -> ...).
- Cada "title" deve ser curto: 2 a 6 palavras.
- "collapsed": true em todos os nós exceto root (root tem "collapsed": false).
- Retorna SOMENTE o JSON, sem markdown e sem explicações.`;

/**
 * Gera resumo, tópicos, ações e mapa mental a partir da transcrição
 * @param {string} transcript - Texto transcrito da reunião
 * @returns {Promise<{ summary: string, topics: string[], actions: Array, mindmap: Object }>}
 */
async function generateSummaryAndMindmap(transcript) {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
        logger.error('KingBrief summary: OPENAI_API_KEY não configurada');
        throw new Error('Serviço de resumo não configurado (OPENAI_API_KEY).');
    }

    const userContent = `Analisa a seguinte transcrição de reunião e devolve o JSON com summary, topics, actions e mindmap conforme as regras.\n\nTranscrição:\n${(transcript || '').slice(0, 12000)}`;

    const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY.trim()}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userContent }
            ],
            temperature: 0.3,
            max_tokens: 2000
        })
    });

    const text = await response.text();
    if (!response.ok) {
        logger.error('KingBrief GPT API error', { status: response.status, body: text?.slice(0, 300) });
        if (response.status === 429) throw new Error('Limite de uso da API atingido. Tente novamente mais tarde.');
        if (response.status >= 500) throw new Error('Serviço de resumo temporariamente indisponível.');
        throw new Error(text || 'Falha ao gerar resumo e mapa mental.');
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        throw new Error('Resposta inválida do serviço de resumo.');
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
        throw new Error('Resposta vazia do serviço de resumo.');
    }

    const parsed = extractAndParseJson(content);
    if (!parsed) {
        throw new Error('Não foi possível extrair JSON válido da resposta.');
    }

    return {
        summary: sanitizeString(parsed.summary),
        topics: Array.isArray(parsed.topics) ? parsed.topics.map(sanitizeString) : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions.map(sanitizeAction) : [],
        mindmap: sanitizeMindmap(parsed.mindmap) || { id: 'root', title: 'Tema Central', collapsed: false, children: [] }
    };
}

function sanitizeString(v) {
    if (v == null) return '';
    return String(v).trim().slice(0, 2000);
}

function sanitizeAction(a) {
    if (!a || typeof a !== 'object') return { task: '', owner: null, due: null };
    return {
        task: sanitizeString(a.task),
        owner: a.owner != null ? sanitizeString(a.owner) : null,
        due: a.due != null ? sanitizeString(a.due) : null
    };
}

function sanitizeMindmap(node) {
    if (!node || typeof node !== 'object') return null;
    const n = {
        id: sanitizeString(node.id) || 'node',
        title: sanitizeString(node.title) || 'Ramo',
        collapsed: node.collapsed === true,
        children: Array.isArray(node.children) ? node.children.map(sanitizeMindmap).filter(Boolean) : []
    };
    return n;
}

/**
 * Extrai JSON de uma string (pode vir com markdown ou texto em volta)
 */
function extractAndParseJson(content) {
    const trimmed = (content || '').trim();
    // Tentar extrair bloco ```json ... ```
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const toParse = codeBlock ? codeBlock[1].trim() : trimmed;
    // Remover possível prefixo/sufixo não-JSON
    const start = toParse.indexOf('{');
    const end = toParse.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
        return JSON.parse(toParse.slice(start, end + 1));
    } catch (_) {
        return null;
    }
}

module.exports = {
    generateSummaryAndMindmap
};
