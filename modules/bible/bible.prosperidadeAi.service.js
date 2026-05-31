/**
 * Prosperidade — geração IA (Do Fracasso ao Legado, 8 engrenagens).
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const logger = require('../../utils/logger');

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.BIBLE_PROSPERIDADE_AI_MODEL || process.env.BIBLE_DEV365_AI_MODEL || 'gpt-4o-mini';

function getOpenAiKey() {
    return String(process.env.OPENAI_API_KEY || process.env.BIBLE_OPENAI_API_KEY || '').trim();
}

function loadStorytellingMap() {
    try {
        const p = path.join(__dirname, '../../data/bible/prosperidade_storytelling_map.json');
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        logger.warn('prosperidadeAi: mapa storytelling não carregado', e.message);
        return { phases: [] };
    }
}

function getPhaseInfo(n) {
    const map = loadStorytellingMap();
    const phase = (map.phases || []).find((p) => p.fase === n);
    return phase || { fase: n, titulo: 'Fase ' + n, resumo: '' };
}

async function generateActivation(n) {
    if (!getOpenAiKey()) {
        return { error: 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).' };
    }
    const num = parseInt(n, 10);
    if (num < 1 || num > 31) return { error: 'Ativação deve ser entre 1 e 31.' };

    const phase = getPhaseInfo(num);
    const userPrompt = `Livro: "Do Fracasso ao Legado" — Ativação ${num} de 31 (Provérbios ${num}).

Mapa storytelling Fase ${num}:
Título: ${phase.titulo}
Resumo: ${phase.resumo}

Gere a Ativação completa com as 8 ENGENHAGENS abaixo. Tom: premium, pastoral, storytelling com personagem "King", português do Brasil.

Responda APENAS JSON válido (sem markdown) neste formato:
{
  "titulo": "título da ativação",
  "decreto_entrada": "frase decreto KING de abertura",
  "fundamento_sagrado": "texto corrido inspirado em Provérbios ${num} estilo NTLH, SEM numeração de versículos, 2-4 parágrafos",
  "diagnostico_escassez": "diagnóstico da escassez mental/financeira",
  "estrada_com_king": "storytelling Na Estrada com o KING — fase ${num}",
  "diretriz_ilustracao": "descrição visual para ilustração",
  "mentalidade_travada": "crença limitante",
  "nova_mentalidade": "governo da nova mentalidade",
  "exercicio_fixacao": "exercício prático de fixação",
  "ie_chave": "imagem e emoção chave (IE)",
  "treino_negocios": "tarefa prática de negócios",
  "treino_altar": "tarefa prática de altar/oração",
  "sentenca_ativacao": "decreto final poderoso para antes de dormir",
  "proximo_episodio": "gancho estilo Netflix para Ativação ${num < 31 ? num + 1 : 1}"
}

Regras: não invente versículos numerados; fundamento corrido; sentença de ativação memorável; próximo episódio cria curiosidade.`;

    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + getOpenAiKey()
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0.75,
                max_tokens: 4500,
                messages: [
                    {
                        role: 'system',
                        content: 'Você escreve conteúdo cristão de prosperidade e legado em português do Brasil. Responde somente JSON válido.'
                    },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        const raw = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = raw.error && raw.error.message ? raw.error.message : res.statusText;
            return { error: msg || 'Erro ao chamar a IA.' };
        }

        const text = (raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content) || '';
        let parsed;
        try {
            const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            logger.error('prosperidadeAi JSON parse:', parseErr, text.slice(0, 200));
            return { error: 'Resposta da IA em formato inválido.' };
        }

        const usage = raw.usage || {};
        return {
            ok: true,
            data: {
                titulo: String(parsed.titulo || '').trim(),
                decreto_entrada: String(parsed.decreto_entrada || '').trim(),
                fundamento_sagrado: String(parsed.fundamento_sagrado || '').trim(),
                diagnostico_escassez: String(parsed.diagnostico_escassez || '').trim(),
                estrada_com_king: String(parsed.estrada_com_king || '').trim(),
                diretriz_ilustracao: String(parsed.diretriz_ilustracao || '').trim(),
                mentalidade_travada: String(parsed.mentalidade_travada || '').trim(),
                nova_mentalidade: String(parsed.nova_mentalidade || '').trim(),
                exercicio_fixacao: String(parsed.exercicio_fixacao || '').trim(),
                ie_chave: String(parsed.ie_chave || '').trim(),
                treino_negocios: String(parsed.treino_negocios || '').trim(),
                treino_altar: String(parsed.treino_altar || '').trim(),
                sentenca_ativacao: String(parsed.sentenca_ativacao || '').trim(),
                proximo_episodio: String(parsed.proximo_episodio || '').trim(),
                proverbs_ref: 'Provérbios ' + num,
                storytelling_fase: num,
                content_source: 'ai'
            },
            tokens: {
                prompt: usage.prompt_tokens || 0,
                completion: usage.completion_tokens || 0,
                total: usage.total_tokens || 0
            }
        };
    } catch (e) {
        logger.error('prosperidadeAi generateActivation:', e);
        return { error: e.message || 'Erro na geração.' };
    }
}

module.exports = {
    loadStorytellingMap,
    getPhaseInfo,
    generateActivation
};
