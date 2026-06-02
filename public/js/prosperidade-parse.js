/**
 * Parser Prosperidade — compartilhado Node + browser (formato Gemini v2/v3)
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ProsperidadeParse = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

function cleanLine(line) {
    return String(line || '')
        .replace(/^[\s\u{1F300}-\u{1FAFF}\u2600-\u27BF}\uFE0F\u200D]+/gu, '')
        .trim();
}

function isIntroLine(line) {
    return /(?:FASE|ATIVA[CÇ][AÃ]O)\s*\d+/i.test(cleanLine(line));
}

function extractIntroTitle(line) {
    const raw = cleanLine(line);
    const m = raw.match(/(?:FASE|ATIVA[CÇ][AÃ]O)\s*\d+\s*[:\-–—]\s*(.+)$/i);
    if (!m) return '';
    let title = m[1].replace(/\*+/g, '').trim();
    const quoteIdx = title.search(/["""«']/);
    if (quoteIdx >= 0) title = title.slice(0, quoteIdx).trim();
    title = title.replace(/\s*[📜🔍💎🦅⚡👁🧠✍🗣📚🎬].*$/, '').trim();
    title = title.replace(/\s+\d+\.\s*.*$/, '').trim();
    if (title.length > 200) title = title.slice(0, 200).trim();
    return title;
}

function sanitizeTitulo(v) {
    let t = String(v || '').trim();
    if (!t) return '';
    const quoteIdx = t.search(/["""«']/);
    if (quoteIdx > 0) t = t.slice(0, quoteIdx).trim();
    t = t.replace(/\s*[📜🔍💎🦅⚡👁🧠✍🗣📚🎬].*$/, '').trim();
    t = t.replace(/\s+\d+\.\s*.*$/, '').trim();
    if (t.length > 200) t = t.slice(0, 200).trim();
    return t;
}

function normalizePaste(raw) {
    let t = String(raw || '').replace(/\r\n/g, '\n').trim();
    if (!t) return t;
    t = t.replace(
        /((?:ATIVA[CÇ][AÃ]O|FASE)\s+\d+\s*:[^\n"""«']{2,120})(["""«'])/gi,
        '$1\n\n$2'
    );
    const markerRes = [
        /(\S)\s*(?=(?:📜\s*)?\d+\.\s*(?:O\s+)?FUNDAMENTO\s+SAGRADO\s*:)/gi,
        /(\S)\s*(?=(?:🔍\s*)?\d+\.\s*(?:EXTRA[ÇC][AÃ]O\s+DE\s+PROSPERIDADE|DIAGN[OÓ]STICO))/gi,
        /(\S)\s*(?=💎\s*FRASES\s+DE\s+IMPACTO)/gi,
        /(\S)\s*(?=(?:🦅\s*)?\d+\.\s*NA\s+ESTRADA\s+COM)/gi,
        /(\S)\s*(?=⚡\s*C[OÓ]DIGO\s+DA\s+VIRADA)/gi,
        /(\S)\s*(?=👁[^\n]*DIRETRIZ\s+DE\s+ILUSTRA)/gi,
        /(\S)\s*(?=(?:🧠\s*)?\d+\.\s*REPROGRAMA[ÇC][ÃA]O\s+MENTAL)/gi,
        /(\S)\s*(?=(?:✍\s*)?\d+\.\s*(?:O\s+)?TREINO\s+DO\s+REI)/gi,
        /(\S)\s*(?=(?:🗣\s*)?\d+\.\s*SENTEN[ÇC]A\s+DE\s+ATIVA)/gi,
        /(\S)\s*(?=(?:📚\s*)?\d+\.\s*ATIVA[ÇC][AÃ]O\s+COMPLEMENTAR)/gi,
        /(\S)\s*(?=🎬\s*PR[OÓ]XIMO\s+EPIS)/gi
    ];
    for (const re of markerRes) t = t.replace(re, '$1\n\n');
    t = t.replace(/(["""»'"]\s*[—\-–]\s*KING)\s*(?=\S)/gi, '$1\n\n');
    return t.trim();
}

function extractDecretoQuote(lines) {
    for (let i = 0; i < lines.length; i++) {
        if (!isIntroLine(lines[i])) continue;
        const sameLine = lines[i].match(/["""«']([^""»'"]{10,})["""»'"]\s*[—\-–]?\s*KING/i);
        if (sameLine) return sameLine[1].trim();
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
            const l = lines[j].trim();
            if (!l) continue;
            if (/^["'“"«]/.test(l) || /KING\s*$/i.test(l)) {
                return l
                    .replace(/^["""«']+/, '')
                    .replace(/["""»']+\s*$/, '')
                    .replace(/\s*[—\-–]\s*KING\s*$/i, '')
                    .trim() || l;
            }
            const c = cleanLine(l);
            if (/FUNDAMENTO\s+SAGRADO|EXTRA[ÇC][AÃ]O\s+DE\s+PROSPERIDADE/i.test(c)) break;
        }
        break;
    }
    return '';
}

const MARKER_DEFS = [
    { key: 'fundamento_sagrado', re: /(?:^|\n)\s*\d+\.\s*(?:O\s+)?FUNDAMENTO\s+SAGRADO\s*:[^\n]*/gi },
    {
        key: 'diagnostico_escassez',
        re: /(?:^|\n)\s*\d+\.\s*(?:O\s+)?(?:DIAGN[OÓ]STICO\s+DA\s+ESCASSEZ|EXTRA[ÇC][AÃ]O\s+DE\s+PROSPERIDADE)\s*:[^\n]*/gi
    },
    { key: 'ie_chave', re: /(?:^|\n)\s*FRASES\s+DE\s+IMPACTO\s+DO\s+KING\s*:?\s*/gi },
    { key: 'estrada_com_king', re: /(?:^|\n)\s*\d+\.\s*NA\s+ESTRADA\s+COM\s+(?:O\s+)?KING\s*:[^\n]*/gi },
    { key: '__codigo_virada__', re: /(?:^|\n)\s*C[OÓ]DIGO\s+DA\s+VIRADA\s*:?\s*/gi },
    { key: 'diretriz_ilustracao', re: /(?:^|\n)\s*DIRETRIZ\s+DE\s+ILUSTRA[ÇC][ÃA]O[^:\n]*:\s*/gi },
    {
        key: '__reprogram__',
        re: /(?:^|\n)\s*\d+\.\s*REPROGRAMA[ÇC][ÃA]O\s+MENTAL(?:\s+DE\s+IMPACTO)?\s*:[^\n]*/gi
    },
    { key: '__treino__', re: /(?:^|\n)\s*\d+\.\s*(?:O\s+)?TREINO\s+DO\s+REI[^\n]*/gi },
    {
        key: 'sentenca_ativacao',
        re: /(?:^|\n)\s*\d+\.\s*SENTEN[ÇC]A\s+DE\s+ATIVA[ÇC][ÃA]O(?:\s+DI[AÁ]RIA)?\s*/gi
    },
    {
        key: '__complementar__',
        re: /(?:^|\n)\s*\d+\.\s*ATIVA[ÇC][AÃ]O\s+COMPLEMENTAR\s*:[^\n]*/gi
    },
    { key: 'proximo_episodio', re: /(?:^|\n)\s*PR[OÓ]XIMO\s+EPIS[OÓ]DIO\s*:[^\n]*/gi }
];

function findMarkers(cleanText) {
    const hits = [];
    for (const def of MARKER_DEFS) {
        const re = new RegExp(def.re.source, def.re.flags);
        let m;
        while ((m = re.exec(cleanText)) !== null) {
            hits.push({ key: def.key, index: m.index, end: m.index + m[0].length });
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

function parseFrasesImpacto(text) {
    if (!text) return '';
    const phrases = [];
    const seen = new Set();
    const lines = text.split(/\r?\n/);
    for (const raw of lines) {
        const l = raw.trim();
        if (!l || /^FRASES\s+DE\s+IMPACTO/i.test(l)) continue;
        if (/^\d+\.\s*NA\s+ESTRADA/i.test(cleanLine(l))) break;
        if (/^C[OÓ]DIGO\s+DA\s+VIRADA/i.test(cleanLine(l))) break;
        const bullet = l.replace(/^\*\s*/, '').trim();
        const q = bullet.match(/^["""«']([^""»'"]+)["""»'"]/);
        if (q) {
            const phrase = q[1].trim();
            if (phrase.length > 8 && !seen.has(phrase)) {
                seen.add(phrase);
                phrases.push('"' + phrase + '"');
            }
        }
    }
    if (!phrases.length) {
        const reQuote = /["""«']([^""»'"]{12,})["""»'"]/g;
        let m;
        while ((m = reQuote.exec(text)) !== null) {
            const phrase = m[1].trim();
            if (!seen.has(phrase) && !/KING\s*$/i.test(phrase)) {
                seen.add(phrase);
                phrases.push('"' + phrase + '"');
            }
        }
    }
    return phrases.join('\n\n');
}

function parseReprogramacaoBlock(text) {
    const out = {};
    if (!text) return out;
    const tabRow = text.match(
        /DRIVE\s+DE\s+ESCASSEZ[\s\S]*?["'""]([^""]+)["'""][\s\t]+["'""]([^""]+)["'""]/i
    );
    if (tabRow) {
        out.mentalidade_travada = '"' + tabRow[1].trim() + '"';
        out.nova_mentalidade = '"' + tabRow[2].trim() + '"';
    } else {
        const afterEscassez = text.split(/DRIVE\s+DE\s+ESCASSEZ/i)[1];
        const afterGoverno = text.split(/DRIVE\s+DE\s+GOVERNO/i)[1];
        if (afterEscassez) {
            const m = afterEscassez.match(/["'""]([^""]+)["'""]/);
            if (m) out.mentalidade_travada = '"' + m[1].trim() + '"';
        }
        if (afterGoverno) {
            const m = afterGoverno.match(/["'""]([^""]+)["'""]/);
            if (m) out.nova_mentalidade = '"' + m[1].trim() + '"';
        }
    }
    const travada = text.match(
        /A\s+Mentalidade\s+Travada\s*(?:\([^)]*\))?\s*:\s*([\s\S]*?)(?=\n\s*A\s+Nova\s+Mentalidade|$)/i
    );
    if (travada && !out.mentalidade_travada) out.mentalidade_travada = travada[1].trim();
    const nova = text.match(
        /A\s+Nova\s+Mentalidade[^:]*(?:\([^)]*\))?\s*:\s*([\s\S]*?)(?=\n\s*(?:Exerc[ií]cio|Ativa[çc][ãa]o\s+Pr[aá]tica|Protocolo)|$)/i
    );
    if (nova && !out.nova_mentalidade) out.nova_mentalidade = nova[1].trim();
    const protocolo = text.match(
        /Protocolo\s+Neuro-Celular[^:]*:\s*([\s\S]*?)(?=\n\s*\d+\.\s*(?:O\s+)?TREINO|$)/i
    );
    const exerc = text.match(
        /(?:Exerc[ií]cio\s+de\s+Fixa[çc][ãa]o\s+Mental|Ativa[çc][ãa]o\s+Pr[aá]tica\s+das\s+Conex[oõ]es\s+de\s+Governo)\s*[^:]*:\s*([\s\S]*?)(?=\n\s*\d+\.\s*(?:O\s+)?TREINO|$)/i
    );
    if (protocolo) out.exercicio_fixacao = protocolo[1].trim();
    else if (exerc) out.exercicio_fixacao = exerc[1].trim();
    return out;
}

function parseTreinoBlock(text) {
    const out = {};
    if (!text) return out;
    const intro = text.match(/^[\s\S]*?(?=Tarefa\s+0?1|BLOCO\s+DE\s+CAMPO|A[çc][ãa]o\s+de\s+Campo)/i);
    const introText = intro ? intro[0].trim() : '';
    const campo = text.match(
        /(?:BLOCO\s+DE\s+CAMPO|A[çc][ãa]o\s+de\s+Campo)[^:]*:\s*([\s\S]*?)(?=\n\s*(?:BLOCO\s+DE\s+ALTAR|A[çc][ãa]o\s+de\s+Altar)|$)/i
    );
    if (campo) out.treino_negocios = (introText ? introText + '\n\n' : '') + campo[1].trim();
    const altar = text.match(
        /(?:BLOCO\s+DE\s+ALTAR|A[çc][ãa]o\s+de\s+Altar)[^:]*:\s*([\s\S]*?)(?=\n\s*\d+\.\s*SENTEN|$)/i
    )
        || text.match(/(?:BLOCO\s+DE\s+ALTAR|A[çc][ãa]o\s+de\s+Altar)[^:]*:\s*([\s\S]*?)$/i);
    if (altar) out.treino_altar = altar[1].trim();
    return out;
}

function parseSentencaBlock(text) {
    if (!text) return '';
    let t = text.trim().replace(/^\([^)]*declare[^)]*\)\s*/i, '').trim();
    const quotes = [...t.matchAll(/["""«']([^""»'"]{30,})["""»'"]/g)];
    if (quotes.length) return quotes[quotes.length - 1][1].trim();
    const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const speech = lines.find((l) => /^["'“"]/.test(l) || l.length > 40);
    return speech ? speech.replace(/^["'“"]+|["'“"]+$/g, '').trim() : t;
}

function parseProximoBlock(text) {
    if (!text) return '';
    const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return text.trim();
    const titleLine = lines[0].replace(/^PR[OÓ]XIMO\s+EPIS[OÓ]DIO\s*:\s*/i, '').trim();
    return lines.length === 1 ? titleLine : titleLine + '\n\n' + lines.slice(1).join('\n\n');
}

function parseCodigoVirada(text) {
    if (!text) return '';
    const quote = text.match(/["""«']([^""»'"]+)["""»'"]/);
    const quoteLine = quote ? '"' + quote[1].trim() + '" — KING' : '';
    const rest = text.replace(/^["""«'][^""]+["""»'"]\s*[—\-–]?\s*KING\s*/i, '').trim();
    return quoteLine ? quoteLine + '\n\n' + rest : text.trim();
}

function parseByMarkers(raw) {
    const lines = raw.split(/\r?\n/);
    const cleanText = lines.map(cleanLine).join('\n');
    const sections = {};
    const introLine = lines.find((l) => isIntroLine(l));
    if (introLine) sections.titulo = extractIntroTitle(introLine);
    const decreto = extractDecretoQuote(lines);
    if (decreto) sections.decreto_entrada = decreto;
    const markers = findMarkers(cleanText);
    let codigoBody = '';
    for (let i = 0; i < markers.length; i++) {
        const hit = markers[i];
        const start = hit.end;
        const end = i + 1 < markers.length ? markers[i + 1].index : cleanText.length;
        let body = cleanText.slice(start, end).trim();
        if (hit.key === '__codigo_virada__') { codigoBody = parseCodigoVirada(body); continue; }
        if (hit.key === '__reprogram__') { Object.assign(sections, parseReprogramacaoBlock(body)); continue; }
        if (hit.key === '__treino__') { Object.assign(sections, parseTreinoBlock(body)); continue; }
        if (hit.key === '__complementar__') { sections.__complementar_body__ = body; continue; }
        if (hit.key === 'sentenca_ativacao') { sections.sentenca_ativacao = parseSentencaBlock(body); continue; }
        if (hit.key === 'proximo_episodio') { sections.proximo_episodio = parseProximoBlock(body); continue; }
        if (hit.key === 'ie_chave') { sections.ie_chave = parseFrasesImpacto(body); continue; }
        if (hit.key === 'fundamento_sagrado') body = body.replace(/^PROV[EÉ]RBIOS\s+\d+[^\n]*\n?/i, '').trim();
        if (body) sections[hit.key] = body;
    }
    if (codigoBody) {
        sections.estrada_com_king = sections.estrada_com_king
            ? sections.estrada_com_king + '\n\n⚡ CÓDIGO DA VIRADA:\n' + codigoBody
            : codigoBody;
    }
    if (sections.__complementar_body__) {
        const comp = sections.__complementar_body__.trim();
        sections.treino_altar = sections.treino_altar
            ? sections.treino_altar + '\n\n---\n\n📚 ATIVAÇÃO COMPLEMENTAR\n\n' + comp
            : '📚 ATIVAÇÃO COMPLEMENTAR\n\n' + comp;
        delete sections.__complementar_body__;
    }
    return sections;
}

function countSections(sections) {
    return Object.keys(sections || {}).filter((k) => String(sections[k] || '').trim()).length;
}

function hasMinimumSections(sections) {
    const hasFund = String(sections.fundamento_sagrado || '').trim();
    const hasSent = String(sections.sentenca_ativacao || '').trim();
    const hasDecreto = String(sections.decreto_entrada || '').trim();
    return !!(hasFund && hasSent && (hasDecreto || hasFund));
}

function parsePastedActivation(text) {
    const raw = normalizePaste(String(text || '').trim());
    if (!raw) return { error: 'Texto vazio.' };
    const sections = parseByMarkers(raw);
    const rawLines = raw.split(/\r?\n/);
    if (!sections.titulo) {
        const intro = rawLines.find((l) => isIntroLine(l));
        if (intro) sections.titulo = extractIntroTitle(intro);
    }
    sections.titulo = sanitizeTitulo(sections.titulo);
    if (!sections.decreto_entrada) sections.decreto_entrada = extractDecretoQuote(rawLines);
    if (!sections.decreto_entrada && sections.sentenca_ativacao) {
        sections.decreto_entrada = String(sections.sentenca_ativacao).split('\n')[0].trim();
    }
    if (hasMinimumSections(sections)) return { ok: true, sections };
    const n = countSections(sections);
    if (n >= 2) {
        return {
            ok: true,
            partial: true,
            sections,
            warning: 'Divisão parcial (' + n + ' blocos). Revise sentença e decreto se faltarem.'
        };
    }
    const found = Object.keys(sections).filter((k) => String(sections[k] || '').trim());
    return {
        error: 'Não foi possível dividir. Encontrado: ' + (found.join(', ') || 'nada')
            + '. Use os marcadores: FUNDAMENTO SAGRADO, FRASES DE IMPACTO, SENTENÇA DE ATIVAÇÃO.'
    };
}

return {
    parsePastedActivation,
    parseFrasesImpacto,
    sanitizeTitulo,
    normalizePaste
};

}));
