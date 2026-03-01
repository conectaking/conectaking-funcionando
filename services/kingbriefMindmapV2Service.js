/**
 * KingBrief – Mapa mental v2 (kingbrief.mindmap.v2)
 * Gera mapa mental RADIAL, denso, 100% extraído da transcrição, com sources por minuto.
 * Entrada: meeting_title, duration_seconds, transcript_segments (from/to/text).
 */

const fetch = require('node-fetch');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const MINDMAP_V2_PROMPT = `Você é a IA do KingBrief. Você recebe uma TRANSCRIÇÃO COMPLETA com timestamps.

OBJETIVO:
Gerar um mapa mental RADIAL, denso e útil, extraído 100% do texto, com PROVA por minutos (sources).

ENTRADA:
- meeting_title (string)
- duration_seconds (int)
- transcript_segments: [{from:"HH:MM:SS", to:"HH:MM:SS", text:"..."}]

REGRAS DE QUALIDADE (anti "mapa vazio"):
1) Ramos principais (nível 1): mínimo 6, máximo 10.
2) Cada ramo principal deve ter 2 a 6 subramos (nível 2).
3) Cada subramo deve ter 2 a 8 folhas (nível 3).
4) Cobertura: pelo menos 90% do tempo com fala deve aparecer em sources de algum nó.
5) Cada nó precisa ter sources (from/to). Proibido nó sem sources.
6) Nada inventado: só pode sair do que está no texto.
7) Se a reunião tiver assuntos "soltos", criar ramo "Outros" e capturar.

ESTILO:
- Root central com label curto e forte (até 6 palavras).
- Ramos principais em linguagem simples (ex.: "Contexto", "Problema", "Solução", "Plano", "Decisões", "Pendências", "Próximos Passos", "Riscos", "Dúvidas").
- Usar emojis discretos por ramo.
- Folhas devem ser ações/decisões/frases curtas.

SAÍDA:
Retorne APENAS um JSON válido no formato kingbrief.mindmap.v2:

{
  "version": "kingbrief.mindmap.v2",
  "root": {
    "id": "root",
    "label": "Tema (até 6 palavras)",
    "emoji": "🧠",
    "sources": [{"from":"HH:MM:SS","to":"HH:MM:SS"}],
    "children": [
      {
        "id": "r1",
        "label": "Ramo principal",
        "emoji": "📌",
        "sources": [{"from":"HH:MM:SS","to":"HH:MM:SS"}],
        "children": [
          {
            "id": "r1a",
            "label": "Subramo",
            "sources": [{"from":"HH:MM:SS","to":"HH:MM:SS"}],
            "children": [
              { "id": "r1a1", "label": "Folha", "sources": [{"from":"HH:MM:SS","to":"HH:MM:SS"}], "children": [] }
            ]
          }
        ]
      }
    ]
  },
  "style": {
    "layout": "radial",
    "branchColors": ["#2F80ED","#EB5757","#27AE60","#BB6BD9","#F2994A","#9B51E0","#2DCEE0","#D4A017"],
    "level1NodeShape": "pill",
    "collapsible": true
  },
  "quality": {
    "duration_seconds": 0,
    "word_count": 0,
    "nodes_total": 0,
    "min_coverage_percent": 0,
    "alert": null
  }
}

VALIDAÇÕES (preencha quality corretamente):
- Se nodes_total < 80 e duração > 20min => quality.alert = "MAPA_RALO"
- Se min_coverage_percent < 85 => quality.alert = "COBERTURA_BAIXA"
- Caso contrário => quality.alert = null

Nada de texto antes ou depois do JSON.`;

/**
 * Gera mapa mental v2 a partir da transcrição com segmentos.
 * @param {string} meetingTitle - Título da reunião
 * @param {number} durationSeconds - Duração em segundos
 * @param {Array<{from:string, to:string, text:string}>} transcriptSegments - Segmentos com from/to HH:MM:SS
 * @returns {Promise<{version:string, root:Object, style:Object, quality:Object}>}
 */
async function generateMindmapV2(meetingTitle, durationSeconds, transcriptSegments) {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
        logger.error('KingBrief mindmap v2: OPENAI_API_KEY não configurada');
        throw new Error('Serviço não configurado (OPENAI_API_KEY).');
    }
    if (!Array.isArray(transcriptSegments) || transcriptSegments.length === 0) {
        throw new Error('Mindmap v2 requer transcript_segments com from/to/text.');
    }

    const payload = {
        meeting_title: meetingTitle || 'Reunião',
        duration_seconds: durationSeconds || 0,
        transcript_segments: transcriptSegments
    };
    const userContent = 'ENTRADA:\n\n' + JSON.stringify(payload, null, 2);

    const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY.trim()}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: MINDMAP_V2_PROMPT },
                { role: 'user', content: userContent }
            ],
            temperature: 0.2,
            max_tokens: 12000
        })
    });

    const text = await response.text();
    if (!response.ok) {
        logger.error('KingBrief mindmap v2 API error', { status: response.status, body: text?.slice(0, 400) });
        if (response.status === 429) throw new Error('Limite de uso da API atingido.');
        throw new Error(text || 'Falha ao gerar mapa mental v2.');
    }

    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') throw new Error('Resposta vazia do serviço.');

    const trimmed = content.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('Resposta não contém JSON válido.');
    let out;
    try {
        out = JSON.parse(trimmed.slice(start, end + 1));
    } catch (e) {
        throw new Error('JSON do mapa mental v2 inválido.');
    }

    if (!out.version || !out.root || !out.style || !out.quality) {
        throw new Error('Mapa mental v2 incompleto (faltam root, style ou quality).');
    }

    return out;
}

module.exports = {
    generateMindmapV2
};
