/**
 * KingBrief – Contrato de saída único (resumo, tópicos, transcrição, mapaMental)
 * Prompt mestre: IA devolve 1 JSON com as 4 abas, sources por minuto, qualidade e prova de leitura.
 */

const fetch = require('node-fetch');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const KINGBRIEF_MASTER_PROMPT = `VOCÊ É A IA DO KINGBRIEF (transcrição, validação e mapa mental).
Seu objetivo é provar que você leu TODO o conteúdo, usando timestamps e cobertura por minutos.

ENTRADA (você receberá um destes formatos):
A) TRANSCRIÇÃO COM SEGMENTOS E TEMPO:
- segments: [{start: segundos, end: segundos, text: "..."}]
B) TRANSCRIÇÃO SEM TEMPO (menos ideal):
- text: "..." e duration_seconds: N

TAREFAS OBRIGATÓRIAS (ordem fixa):
1) NORMALIZAR TEMPOS
- Trabalhe sempre com HH:MM:SS.
- Se vier em segundos, converta.
- Se NÃO vier com tempo, você deve criar uma marcação aproximada por parágrafos e deixar quality.flags += ["NO_NATIVE_TIMESTAMPS"].

2) TRANSCRIÇÃO COMPLETA (ABA: transcricao)
- Entregue a transcrição completa em blocos com timestamp.
- Formato em segments: {"from":"HH:MM:SS","to":"HH:MM:SS","text":"..."}
- Nunca resuma a transcrição nessa aba.

3) LINHA DO TEMPO POR MINUTO (PROVA DE LEITURA)
- Gere um "timeline_minuto_a_minuto" cobrindo 00:00 até o final.
- Agrupe em janelas de 1 minuto (ex.: 00:00–01:00, 01:00–02:00).
- Em cada minuto, liste: bullets (2 a 6), keywords (até 8), actions, decisions se existirem.
- Se houver silêncio/ruído, escreva "(silêncio/ruído predominante)" e siga.
- REGRA: Se um minuto tiver fala, ele precisa ter pelo menos 2 bullets.

4) CHECAGEM DE QUALIDADE (anti "transcrição curta")
- Calcule: duration_minutes, word_count, words_per_minute = word_count / duration_minutes
- Se duration_minutes >= 20 e words_per_minute < 60, marque quality.alert = "POSSIVEL_TRANSCRICAO_INCOMPLETA"
- Se duration_minutes >= 40 e word_count < 3000, marque o mesmo alerta.
- Se houver alerta, inclua quality.recommendations com ações práticas.
- Mesmo com alerta, gere todas as abas com o que houver.

5) ABA: resumo
- resumo_executivo (1 parágrafo), highlights (5–12 bullets com sources), decisoes, pendencias, proximos_passos. Tudo com sources quando possível.

6) ABA: topicos (hierárquico, até 3 níveis)
- Cada tópico: title, bullets, sources: [{from:"HH:MM:SS",to:"HH:MM:SS"}], children
- A soma da cobertura de sources deve cobrir pelo menos 90% dos minutos com fala.

7) ABA: mapaMental
- root central; 6 a 10 ramos principais (level 1); cada um com 2 a 6 subramos (level 2); cada subramo com 2 a 8 folhas (level 3).
- style: layout "radial", rootPosition "center", level1NodeShape "pill", branchColors array.
- Cada nó: id, label, emoji, color, collapsed, sources: [{from,to}], children.
- REGRA: Cada nó deve ter sources. Se sobrar conteúdo, crie ramo "Outros".

FORMATO DE SAÍDA (obrigatório): Retorne APENAS um JSON válido com esta estrutura (sem texto antes ou depois):

{
  "version": "kingbrief.v1",
  "language": "pt-BR",
  "duration_seconds": 0,
  "quality": {
    "word_count": 0,
    "duration_minutes": 0,
    "words_per_minute": 0,
    "alert": null,
    "flags": [],
    "recommendations": []
  },
  "resumo": {
    "resumo_executivo": "",
    "highlights": [{"text":"","sources":[{"from":"HH:MM:SS","to":"HH:MM:SS"}]}],
    "decisoes": [],
    "pendencias": [],
    "proximos_passos": []
  },
  "topicos": [
    {
      "title": "",
      "bullets": [""],
      "sources": [{"from":"HH:MM:SS","to":"HH:MM:SS"}],
      "children": []
    }
  ],
  "transcricao": {
    "segments": [{"from":"HH:MM:SS","to":"HH:MM:SS","text":""}],
    "timeline_minuto_a_minuto": [
      {
        "from": "HH:MM:SS",
        "to": "HH:MM:SS",
        "bullets": [],
        "keywords": [],
        "actions": [],
        "decisions": []
      }
    ]
  },
  "mapaMental": {
    "style": {
      "layout": "radial",
      "rootPosition": "center",
      "level1NodeShape": "pill",
      "level1TextColor": "#FFFFFF",
      "edgeThickness": {"rootToL1": 6, "other": 3},
      "branchColors": ["#F28C28","#2F80ED","#9B51E0","#2DCEE0","#EB5757","#D4A017","#27AE60","#BB6BD9"]
    },
    "nodes": [
      {
        "id": "root",
        "label": "TEMA PRINCIPAL",
        "emoji": "🧠",
        "color": "#111111",
        "collapsed": false,
        "sources": [{"from":"00:00:00","to":"00:00:10"}],
        "children": []
      }
    ]
  }
}

REGRAS FINAIS: Nada de texto fora do JSON. Não invente fatos. Sempre use sources. Se faltar tempo nativo, sinalize em quality.flags.`;

function secToHhMmSs(sec) {
    const s = Math.round(Number(sec)) || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const s2 = s % 60;
    const pad = (n) => (n < 10 ? '0' : '') + n;
    return pad(h) + ':' + pad(m) + ':' + pad(s2);
}

/**
 * Gera o contrato KingBrief (1 JSON com resumo, topicos, transcricao, mapaMental e quality).
 * @param {string} transcript - Texto completo da transcrição
 * @param {Array<{start_sec: number, end_sec: number, text: string}>} segments - Segmentos com tempo (opcional)
 * @param {number} [durationSeconds] - Duração em segundos (quando não há segmentos)
 * @returns {Promise<Object>} Contrato com version, quality, resumo, topicos, transcricao, mapaMental
 */
async function generateKingBriefContract(transcript, segments, durationSeconds) {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
        logger.error('KingBrief contract: OPENAI_API_KEY não configurada');
        throw new Error('Serviço não configurado (OPENAI_API_KEY).');
    }

    let userInput;
    if (Array.isArray(segments) && segments.length > 0) {
        userInput = JSON.stringify({
            format: 'A',
            segments: segments.map((s) => ({
                start: s.start_sec,
                end: s.end_sec,
                text: (s.text || '').trim()
            })).filter((s) => s.text)
        }, null, 2);
    } else {
        const text = (transcript || '').trim().slice(0, 120000);
        const dur = durationSeconds != null ? Math.round(Number(durationSeconds)) : (text ? Math.max(60, Math.ceil((text.split(/\s+/).length || 0) / 2.5)) : 60);
        userInput = JSON.stringify({
            format: 'B',
            text,
            duration_seconds: dur
        }, null, 2);
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
                { role: 'system', content: KINGBRIEF_MASTER_PROMPT },
                { role: 'user', content: 'ENTRADA (use exatamente este formato para processar):\n\n' + userInput }
            ],
            temperature: 0.2,
            max_tokens: 16000
        })
    });

    const text = await response.text();
    if (!response.ok) {
        logger.error('KingBrief contract GPT error', { status: response.status, body: text?.slice(0, 400) });
        if (response.status === 429) throw new Error('Limite de uso da API atingido. Tente novamente mais tarde.');
        if (response.status >= 500) throw new Error('Serviço temporariamente indisponível.');
        throw new Error(text || 'Falha ao gerar contrato KingBrief.');
    }

    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') throw new Error('Resposta vazia do serviço.');

    const trimmed = content.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('Resposta do KingBrief não contém JSON válido.');
    let contract;
    try {
        contract = JSON.parse(trimmed.slice(start, end + 1));
    } catch (e) {
        throw new Error('JSON do contrato KingBrief inválido.');
    }

    if (!contract.version || !contract.resumo || !contract.topicos || !contract.transcricao || !contract.mapaMental) {
        throw new Error('Contrato KingBrief incompleto (faltam resumo, topicos, transcricao ou mapaMental).');
    }

    return contract;
}

/**
 * A partir do contrato, devolve os campos legados para compatibilidade (summary, topics_json, mindmap antigo).
 */
function contractToLegacy(contract) {
    if (!contract || typeof contract !== 'object') return null;
    const resumo = contract.resumo || {};
    const topicos = contract.topicos || [];
    const mapa = contract.mapaMental || {};
    const nodes = Array.isArray(mapa.nodes) ? mapa.nodes : [];

    function mapNodeToLegacy(n) {
        if (!n || typeof n !== 'object') return null;
        return {
            id: n.id || 'node',
            title: n.label || n.title || 'Ramo',
            collapsed: n.collapsed === true,
            sources: n.sources,
            emoji: n.emoji,
            color: n.color,
            children: Array.isArray(n.children) ? n.children.map(mapNodeToLegacy).filter(Boolean) : []
        };
    }

    const legacyMindmap = nodes.length
        ? { id: 'root', title: 'Tema Central', collapsed: false, children: nodes.map(mapNodeToLegacy).filter(Boolean) }
        : { id: 'root', title: 'Tema Central', collapsed: false, children: [] };

    function flattenTopics(arr, out) {
        if (!Array.isArray(arr)) return;
        arr.forEach((t) => {
            if (t && t.title) out.push(t.title);
            flattenTopics(t.children, out);
        });
    }
    const topicsFlat = [];
    flattenTopics(topicos, topicsFlat);

    const highlights = Array.isArray(resumo.highlights)
        ? resumo.highlights.map((h) => (typeof h === 'string' ? h : h.text)).filter(Boolean)
        : [];

    return {
        summary: resumo.resumo_executivo || '',
        summary_strategic: [resumo.decisoes, resumo.pendencias, resumo.proximos_passos]
            .filter(Boolean)
            .map((arr) => (Array.isArray(arr) ? arr.map((x) => (typeof x === 'string' ? x : x.text)).join('\n') : ''))
            .join('\n\n') || '',
        highlights,
        topics: topicsFlat,
        mindmap: legacyMindmap
    };
}

module.exports = {
    generateKingBriefContract,
    contractToLegacy,
    secToHhMmSs
};
