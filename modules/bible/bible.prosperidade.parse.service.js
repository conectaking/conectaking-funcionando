/**
 * Parser "Dividir seções" — formato oficial + Gemini (FASE 01, emojis, numeração 1–6).
 */

function cleanLine(line) {
    return String(line || '')
        .replace(/^[\s\u{1F300}-\u{1FAFF}\u2600-\u27BF}\uFE0F\u200D]+/gu, '')
        .trim();
}

function normalizeHeader(line) {
    return cleanLine(line)
        .replace(/^#+\s*/, '')
        .replace(/^\*+\s*/, '')
        .replace(/\*+$/, '')
        .replace(/^\d+[\.\)\-–—]\s*/, '')
        .replace(/[^\w\s():/\-–—]/gu, ' ')
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
}

function normForMatch(norm) {
    return String(norm || '').replace(/^(?:O|A|OS|AS)\s+/, '').trim();
}

function isIntroLine(line) {
    const c = cleanLine(line);
    return /(?:FASE|ATIVA[CÇ][AÃ]O)\s*\d+/i.test(c);
}

function extractIntroTitle(line) {
    const raw = cleanLine(line);
    const m = raw.match(/(?:FASE|ATIVA[CÇ][AÃ]O)\s*\d+\s*[:\-–—]\s*(.+)$/i);
    return m ? m[1].replace(/\*+/g, '').trim() : '';
}

function extractDecretoQuote(lines) {
    for (let i = 0; i < lines.length; i++) {
        if (!isIntroLine(lines[i])) continue;
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const l = lines[j].trim();
            if (!l) continue;
            if (/^["'“"«]/.test(l) || /KING\s*$/i.test(l)) {
                return l
                    .replace(/^["""«']+/, '')
                    .replace(/["""»']+\s*$/, '')
                    .replace(/\s*[—\-–]\s*KING\s*$/i, '')
                    .trim() || l;
            }
            if (/FUNDAMENTO\s+SAGRADO/i.test(cleanLine(l))) break;
        }
        break;
    }
    return '';
}

/** Marcadores de início de seção (texto já limpo de emoji no início da linha) */
const MARKER_DEFS = [
    { key: 'fundamento_sagrado', re: /(?:^|\n)\s*\d+\.\s*(?:O\s+)?FUNDAMENTO\s+SAGRADO\s*:[^\n]*/gi },
    { key: 'diagnostico_escassez', re: /(?:^|\n)\s*\d+\.\s*(?:O\s+)?DIAGN[OÓ]STICO\s+DA\s+ESCASSEZ\s*:[^\n]*/gi },
    { key: 'estrada_com_king', re: /(?:^|\n)\s*\d+\.\s*NA\s+ESTRADA\s+COM\s+(?:O\s+)?KING\s*:[^\n]*/gi },
    { key: 'diretriz_ilustracao', re: /(?:^|\n)\s*DIRETRIZ\s+DE\s+ILUSTRA[ÇC][ÃA]O[^:\n]*:\s*/gi },
    { key: '__reprogram__', re: /(?:^|\n)\s*\d+\.\s*REPROGRAMA[ÇC][ÃA]O\s+MENTAL\s*:[^\n]*/gi },
    { key: '__treino__', re: /(?:^|\n)\s*\d+\.\s*(?:O\s+)?TREINO\s+DO\s+REI[^:\n]*\n/gi },
    { key: 'sentenca_ativacao', re: /(?:^|\n)\s*\d+\.\s*SENTEN[ÇC]A\s+DE\s+ATIVA[ÇC][ÃA]O\s*(?:\n|$)/gi },
    { key: 'proximo_episodio', re: /(?:^|\n)\s*PR[OÓ]XIMO\s+EPIS[OÓ]DIO\s*:[^\n]*/gi }
];

function findMarkers(cleanText) {
    const hits = [];
    for (const def of MARKER_DEFS) {
        const re = new RegExp(def.re.source, def.re.flags);
        let m;
        while ((m = re.exec(cleanText)) !== null) {
            hits.push({
                key: def.key,
                index: m.index,
                end: m.index + m[0].length
            });
        }
    }
    hits.sort((a, b) => a.index - b.index);
    const seen = new Set();
    return hits.filter((h) => {
        const k = h.index + ':' + h.key;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

function sliceBetween(cleanText, start, end) {
    return cleanText.slice(start, end).trim();
}

function parseReprogramacaoBlock(text) {
    const out = {};
    if (!text) return out;
    const travada = text.match(/A\s+Mentalidade\s+Travada\s*:\s*([\s\S]*?)(?=\n\s*A\s+Nova\s+Mentalidade|$)/i);
    if (travada) out.mentalidade_travada = travada[1].trim();
    const nova = text.match(/A\s+Nova\s+Mentalidade[^:]*:\s*([\s\S]*?)(?=\n\s*Exerc[ií]cio\s+de\s+Fixa[çc][ãa]o|$)/i);
    if (nova) out.nova_mentalidade = nova[1].trim();
    const exerc = text.match(/Exerc[ií]cio\s+de\s+Fixa[çc][ãa]o\s+Mental\s*:\s*([\s\S]*?)$/i);
    if (exerc) out.exercicio_fixacao = exerc[1].trim();
    return out;
}

function parseTreinoBlock(text) {
    const out = {};
    if (!text) return out;
    const neg = text.match(/O\s+Filtro\s+de\s+Alian[çc]as\s*:\s*([\s\S]*?)(?=\n\s*O\s+Primeiro\s+Comando|$)/i);
    if (neg) out.treino_negocios = neg[1].trim();
    const altar = text.match(/O\s+Primeiro\s+Comando\s+do\s+Dia\s*:\s*([\s\S]*?)$/i);
    if (altar) out.treino_altar = altar[1].trim();
    return out;
}

function parseSentencaBlock(text) {
    if (!text) return '';
    const quoted = text.match(/^[""]([^""]+)[""]/);
    if (quoted) return quoted[1].trim();
    return text.replace(/^["'“"]+|["'“"]+$/g, '').trim();
}

function parseProximoBlock(text) {
    if (!text) return '';
    const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return text.trim();
    const titleLine = lines[0].replace(/^PR[OÓ]XIMO\s+EPIS[OÓ]DIO\s*:\s*/i, '').trim();
    if (lines.length === 1) return titleLine;
    return titleLine + '\n\n' + lines.slice(1).join('\n\n');
}

function parseByMarkers(raw) {
    const lines = raw.split(/\r?\n/);
    const cleanText = lines.map(cleanLine).join('\n');
    const sections = {};

    const introLine = lines.find((l) => isIntroLine(l));
    if (introLine) {
        sections.titulo = extractIntroTitle(introLine);
    }

    const decreto = extractDecretoQuote(lines);
    if (decreto) sections.decreto_entrada = decreto;

    const markers = findMarkers(cleanText);
    for (let i = 0; i < markers.length; i++) {
        const hit = markers[i];
        const start = hit.end;
        const end = i + 1 < markers.length ? markers[i + 1].index : cleanText.length;
        let body = sliceBetween(cleanText, start, end);

        if (hit.key === '__reprogram__') {
            Object.assign(sections, parseReprogramacaoBlock(body));
            continue;
        }
        if (hit.key === '__treino__') {
            Object.assign(sections, parseTreinoBlock(body));
            continue;
        }
        if (hit.key === 'sentenca_ativacao') {
            sections.sentenca_ativacao = parseSentencaBlock(body);
            continue;
        }
        if (hit.key === 'proximo_episodio') {
            sections.proximo_episodio = parseProximoBlock(body);
            continue;
        }
        if (hit.key === 'fundamento_sagrado') {
            body = body.replace(/^PROV[EÉ]RBIOS\s+\d+[^.\n]*\n?/i, '').trim();
        }
        if (body) sections[hit.key] = body;
    }

    return sections;
}

function hasMinimumSections(sections) {
    const hasDecreto = String(sections.decreto_entrada || '').trim();
    const hasFund = String(sections.fundamento_sagrado || '').trim();
    const hasSent = String(sections.sentenca_ativacao || '').trim();
    return !!(hasFund && hasSent && (hasDecreto || hasFund));
}

function parsePastedActivation(text) {
    const raw = String(text || '').trim();
    if (!raw) return { error: 'Texto vazio.' };

    const sections = parseByMarkers(raw);

    const rawLines = raw.split(/\r?\n/);
    if (!sections.titulo) {
        const intro = rawLines.find((l) => isIntroLine(l));
        if (intro) sections.titulo = extractIntroTitle(intro);
    }

    if (!sections.decreto_entrada) {
        sections.decreto_entrada = extractDecretoQuote(rawLines);
    }

    if (!sections.decreto_entrada && sections.sentenca_ativacao) {
        sections.decreto_entrada = String(sections.sentenca_ativacao).split('\n')[0].trim();
    }

    if (!hasMinimumSections(sections)) {
        const found = Object.keys(sections).filter((k) => String(sections[k] || '').trim());
        return {
            error: 'Não foi possível dividir todas as seções. Encontrado: ' + (found.join(', ') || 'nada')
                + '. Confirme FUNDAMENTO SAGRADO, citação KING após FASE e SENTENÇA DE ATIVAÇÃO.'
        };
    }

    return { ok: true, sections };
}

function bodyToDto(data) {
    return {
        titulo: data.titulo,
        decreto_entrada: data.decreto_entrada,
        fundamento_sagrado: data.fundamento_sagrado,
        diagnostico_escassez: data.diagnostico_escassez,
        estrada_com_king: data.estrada_com_king,
        diretriz_ilustracao: data.diretriz_ilustracao,
        mentalidade_travada: data.mentalidade_travada,
        nova_mentalidade: data.nova_mentalidade,
        exercicio_fixacao: data.exercicio_fixacao,
        ie_chave: data.ie_chave,
        treino_negocios: data.treino_negocios,
        treino_altar: data.treino_altar,
        sentenca_ativacao: data.sentenca_ativacao,
        proximo_episodio: data.proximo_episodio,
        proverbs_ref: data.proverbs_ref,
        storytelling_fase: data.storytelling_fase,
        content_source: data.content_source
    };
}

module.exports = {
    parsePastedActivation,
    bodyToDto
};
