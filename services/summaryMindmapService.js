/**
 * KingBrief – Serviço de resumo e mapa mental (OpenAI GPT)
 * Envia transcrição e devolve JSON: summary, topics, actions, mindmap.
 * Regras: máx. 6 ramos principais, máx. 4 níveis, palavras-chave curtas (2–6 palavras), collapsed true por defeito nos ramos.
 */

const fetch = require('node-fetch');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `Tu és um assistente que analisa transcrições de reuniões (podem ser longas, 1h ou mais) e devolves APENAS um objeto JSON válido, sem texto antes ou depois, com a seguinte estrutura exata:

{
  "summary": "Resumo RÁPIDO em 2-3 frases (visão geral em poucas linhas)",
  "summary_strategic": "Resumo ESTRATÉGICO: use bullet points com decisões tomadas, próximos passos e conclusões principais. Pode ter múltiplos parágrafos.",
  "highlights": ["Frase ou trecho importante 1 citado na reunião", "Frase importante 2", "..."],
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
        "children": [
          {
            "id": "node1a",
            "title": "Subtópico ou continuação (2-6 palavras)",
            "collapsed": true,
            "children": []
          }
        ]
      }
    ]
  }
}

Regras do mapa mental (OBRIGATÓRIO cumprir para transcrições longas):
- Usa TODO o conteúdo da transcrição para extrair os temas: principais tópicos, subtópicos e desdobramentos.
- Máximo 6 ramos principais (filhos diretos de root). Cada ramo deve ser um tema real discutido na reunião.
- Até 4 níveis de profundidade: root -> ramo principal -> subtópico -> sub-subtópico. Preenche os níveis com continuação do tema (significado, detalhes, conclusões).
- Cada "title": 2 a 6 palavras, claras e descritivas (não genéricas). Subtópicos devem continuar/desdobrar o ramo pai.
- "collapsed": true em todos os nós exceto root (root "collapsed": false).
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

    // Transcrições longas (ex.: 1h): usar até 60k caracteres para o mapa mental refletir todo o conteúdo
    const transcriptSlice = (transcript || '').slice(0, 60000);
    const userContent = `Analisa a seguinte transcrição de reunião (pode ser longa) e devolve o JSON com summary, topics, actions e mindmap conforme as regras. Extrai tópicos e mapa mental de TODO o texto.\n\nTranscrição:\n${transcriptSlice}`;

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
            max_tokens: 4000
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

    const highlights = Array.isArray(parsed.highlights) ? parsed.highlights.map(sanitizeString).filter(Boolean).slice(0, 15) : [];
    return {
        summary: sanitizeString(parsed.summary),
        summary_strategic: sanitizeString(parsed.summary_strategic),
        highlights,
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

const BUSINESS_PROMPT = `Analisa a transcrição de reunião e devolve APENAS um objeto JSON válido, sem texto antes ou depois:
{
  "problem": "Problema central discutido",
  "targetAudience": "Público-alvo mencionado (ou null)",
  "opportunities": ["Oportunidade 1", "..."],
  "bottlenecks": ["Gargalo 1", "..."],
  "risks": ["Risco 1", "..."],
  "potential": "Avaliação do potencial estratégico em 1-2 frases"
}
Retorna SOMENTE o JSON.`;

const LESSON_PROMPT = `Transforma o conteúdo da reunião num formato didático. Devolve APENAS um objeto JSON válido:
{
  "summary": "Resumo didático em 3-5 frases",
  "concepts": ["Conceito principal 1", "..."],
  "reviewQuestions": ["Pergunta de revisão 1", "..."],
  "keywords": ["palavra1", "..."],
  "flashcards": [{"front": "Pergunta ou termo", "back": "Resposta ou definição"}]
}
Máximo 5 conceitos, 5 perguntas, 10 palavras-chave, 8 flashcards. Retorna SOMENTE o JSON.`;

async function callGpt(systemPrompt, userContent, maxTokens = 1200) {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
        throw new Error('Serviço não configurado (OPENAI_API_KEY).');
    }
    const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY.trim()}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            temperature: 0.3,
            max_tokens: maxTokens
        })
    });
    const text = await response.text();
    if (!response.ok) {
        if (response.status === 429) throw new Error('Limite de uso da API atingido.');
        throw new Error(text || 'Falha na análise.');
    }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia.');
    const parsed = extractAndParseJson(content);
    if (!parsed) throw new Error('Resposta inválida.');
    return parsed;
}

async function generateBusinessReport(transcript) {
    const text = typeof transcript === 'string' ? transcript : (Array.isArray(transcript) ? transcript.map(function (t) { return (t.speaker ? t.speaker + ': ' : '') + (t.text || ''); }).join('\n') : '');
    return callGpt(BUSINESS_PROMPT, 'Transcrição:\n' + (text || '').slice(0, 12000));
}

async function generateLessonReport(transcript) {
    const text = typeof transcript === 'string' ? transcript : (Array.isArray(transcript) ? transcript.map(function (t) { return (t.speaker ? t.speaker + ': ' : '') + (t.text || ''); }).join('\n') : '');
    return callGpt(LESSON_PROMPT, 'Conteúdo da reunião:\n' + (text || '').slice(0, 12000));
}

const COMMUNICATION_PROMPT = `Analisa a transcrição e devolve APENAS um objeto JSON válido, sem texto antes ou depois:
{
  "segments": [
    { "speaker": "Speaker 1", "text": "trecho falado", "wordCount": 12 }
  ],
  "topWords": [["palavra", 5], ["outra", 3]],
  "tone": "positivo|neutro|tenso",
  "clarity": "alta|média|baixa"
}
Regras: segmenta por falante (Speaker 1, Speaker 2, ...); topWords são as 10 palavras mais repetidas (excluindo stop words) com contagem; tone e clarity em minúsculas. Retorna SOMENTE o JSON.`;

function computeCommunicationStats(parsed) {
    const segments = Array.isArray(parsed.segments) ? parsed.segments : [];
    const bySpeaker = {};
    segments.forEach(function (seg) {
        const name = seg.speaker || 'Desconhecido';
        if (!bySpeaker[name]) bySpeaker[name] = { wordCount: 0, segments: 0 };
        bySpeaker[name].wordCount += seg.wordCount || (typeof seg.text === 'string' ? seg.text.split(/\s+/).length : 0);
        bySpeaker[name].segments += 1;
    });
    Object.keys(bySpeaker).forEach(function (name) {
        bySpeaker[name].estimatedSeconds = Math.round(bySpeaker[name].wordCount / 2.5);
    });
    return {
        bySpeaker,
        topWords: Array.isArray(parsed.topWords) ? parsed.topWords.slice(0, 15) : [],
        tone: parsed.tone || 'neutro',
        clarity: parsed.clarity || 'média'
    };
}

async function generateCommunicationAnalysis(transcript) {
    const text = typeof transcript === 'string' ? transcript : (Array.isArray(transcript) ? transcript.map(function (t) { return (t.speaker ? t.speaker + ': ' : '') + (t.text || ''); }).join('\n') : '');
    const parsed = await callGpt(COMMUNICATION_PROMPT, 'Transcrição:\n' + (text || '').slice(0, 12000), 2000);
    return computeCommunicationStats(parsed);
}

const IMPROVE_TEXT_PROMPT = `Corrige e melhora o seguinte texto transcrito de áudio (reunião ou fala):
- Corrige erros de ortografia e gramática.
- Ajusta palavras que foram mal transcritas (ex.: "tá" → "está", gírias conforme contexto).
- Mantém o sentido e o tom original; não inventes conteúdo.
- Preserva parágrafos e quebras de linha quando fizer sentido.
Devolve APENAS o texto melhorado, sem explicações nem cabeçalhos.`;

/**
 * Melhora o texto da transcrição: correção ortográfica e de fala, sem alterar o conteúdo.
 * @param {string} transcript - Texto transcrito (pode ser longo)
 * @returns {Promise<{ improved_text: string }>}
 */
async function improveTranscript(transcript) {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
        logger.error('KingBrief improveTranscript: OPENAI_API_KEY não configurada');
        throw new Error('Serviço não configurado (OPENAI_API_KEY).');
    }
    const text = typeof transcript === 'string' ? transcript : (Array.isArray(transcript) ? transcript.map(function (t) { return (t.speaker ? t.speaker + ': ' : '') + (t.text || ''); }).join('\n') : '');
    if (!text || !text.trim()) throw new Error('Nenhum texto para melhorar.');
    const slice = (text || '').slice(0, 50000);
    const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY.trim()}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: IMPROVE_TEXT_PROMPT },
                { role: 'user', content: 'Texto a melhorar:\n\n' + slice }
            ],
            temperature: 0.2,
            max_tokens: 8000
        })
    });
    const data = await response.json().catch(() => ({}));
    const content = data?.choices?.[0]?.message?.content;
    if (!response.ok) {
        if (response.status === 429) throw new Error('Limite de uso da API atingido. Tente mais tarde.');
        throw new Error(content || 'Falha ao melhorar o texto.');
    }
    const improved = (content || '').trim() || text;
    return { improved_text: improved };
}

module.exports = {
    generateSummaryAndMindmap,
    generateBusinessReport,
    generateLessonReport,
    generateCommunicationAnalysis,
    improveTranscript
};
