/**
 * Parser "Dividir seções" — cola Ativação inteira → campos estruturados.
 * Suporta template oficial e variações Gemini (FASE 01, 1. O FUNDAMENTO SAGRADO:, emojis).
 */

function normalizeHeader(line) {
    return String(line || '')
        .trim()
        .replace(/^#+\s*/, '')
        .replace(/^\*+\s*/, '')
        .replace(/\*+$/, '')
        .replace(/^\d+[\.\)\-–—]\s*/, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, '')
        .replace(/[^\w\s():/\-–—]/gu, ' ')
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
}

/** Remove artigo inicial para casar "O FUNDAMENTO SAGRADO" → FUNDAMENTO SAGRADO */
function normForMatch(norm) {
    return String(norm || '')
        .replace(/^(?:O|A|OS|AS)\s+/, '')
        .trim();
}

function accentInsensitivePattern(headerText) {
    return String(headerText || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => {
            const base = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return base.split('').map((ch) => {
                const lower = ch.toLowerCase();
                const upper = ch.toUpperCase();
                if (lower === 'a') return '[aáàãâAÁÀÃÂ]';
                if (lower === 'e') return '[eéèêEÉÈÊ]';
                if (lower === 'i') return '[iíìîIÍÌÎ]';
                if (lower === 'o') return '[oóòõôOÓÒÕÔ]';
                if (lower === 'u') return '[uúùûUÚÙÛ]';
                if (lower === 'c') return '[cçCÇ]';
                if (lower === upper) return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return '[' + lower + upper + ']';
            }).join('');
        })
        .join('\\s+');
}

const SECTION_RULES = [
    {
        key: 'titulo',
        match: (n, norm) => /^FASE\s*\d+/.test(n) || /^FASE\s*\d+/.test(norm)
            || /^ATIVACAO\s+\d+/.test(n)
            || n === 'TITULO DA ATIVACAO' || n === 'TITULO'
    },
    {
        key: 'decreto_entrada',
        match: (n) => n.includes('DECRETO DE ENTRADA') || n.includes('DECRETO DE ENTRADA KING')
            || (n.includes('DECRETO') && n.includes('ENTRADA'))
            || n.includes('PORTAO DE ENTRADA') || n.includes('PORTA DE ENTRADA')
    },
    {
        key: 'fundamento_sagrado',
        match: (n) => n.includes('FUNDAMENTO SAGRADO') || /^FUNDAMENTO\s/.test(n)
    },
    {
        key: 'diagnostico_escassez',
        match: (n) => n.includes('DIAGNOSTICO DA ESCASSEZ') || n.includes('DIAGNOSTICO DE ESCASSEZ')
            || n.includes('DIAGNOSTICO ESCASSEZ') || (n.includes('DIAGNOSTICO') && n.includes('ESCASSEZ'))
    },
    {
        key: 'estrada_com_king',
        match: (n) => n.includes('NA ESTRADA COM O KING') || n.includes('ESTRADA COM O KING')
            || n.includes('ESTRADA COM KING') || (n.includes('ESTRADA') && n.includes('KING'))
    },
    {
        key: 'diretriz_ilustracao',
        match: (n) => n.includes('DIRETRIZ DE ILUSTRACAO') || n.includes('DIRETRIZ ILUSTRACAO')
    },
    {
        key: 'mentalidade_travada',
        match: (n) => n.includes('MENTALIDADE TRAVADA')
    },
    {
        key: 'nova_mentalidade',
        match: (n) => n.includes('NOVA MENTALIDADE') || n.includes('GOVERNO DA MENTALIDADE')
    },
    {
        key: 'exercicio_fixacao',
        match: (n) => n.includes('EXERCICIO DE FIXACAO') || n.includes('EXERCICIO FIXACAO')
    },
    {
        key: 'ie_chave',
        match: (n) => n === 'IE CHAVE' || n.includes('IMAGEM E EMOCAO CHAVE') || n.includes('IMAGEM E EMOCAO')
            || (n.includes('IE') && n.includes('CHAVE'))
    },
    {
        key: 'treino_negocios',
        match: (n) => n.includes('TAREFA DE NEGOCIOS') || n.includes('TREINO DE NEGOCIOS')
            || (n.includes('NEGOCIO') && (n.includes('TAREFA') || n.includes('TREINO')))
    },
    {
        key: 'treino_altar',
        match: (n) => n.includes('TAREFA DE ALTAR') || n.includes('TREINO DE ALTAR')
            || (n.includes('ALTAR') && (n.includes('TAREFA') || n.includes('TREINO')))
    },
    {
        key: 'sentenca_ativacao',
        match: (n) => n.includes('SENTENCA DE ATIVACAO') || n.includes('SENTENCA DE ATIVACAO KING')
            || (n.includes('SENTENCA') && n.includes('ATIVACAO'))
    },
    {
        key: 'proximo_episodio',
        match: (n) => n.includes('PROXIMO EPISODIO') || n.includes('PROXIMO EPISODIO')
    }
];

const REPROGRAM_PARENT = ['REPROGRAMACAO MENTAL', 'REPROGRAMACAO MENTAL E IE'];
const TREINO_PARENT = ['TREINO DO REI'];

function extractActivationTitle(line) {
    const raw = String(line || '')
        .trim()
        .replace(/^#+\s*/, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, '')
        .replace(/\uFE0F/g, '')
        .replace(/^[^A-Za-zÁÀÃÂÉÈÊÍÌÎÓÒÕÔÚÙÛÇáàãâéèêíìîóòõôúùûç]+/, '');
    const m = raw.match(/^ATIVA[ÇC][AÃ]O\s+\d+\s*[:\-–—]\s*(.+)$/i);
    return m ? m[1].replace(/\*+/g, '').trim() : '';
}

function extractFaseTitle(line, norm) {
    const raw = String(line || '').trim();
    const m = raw.match(/FASE\s*\d+\s*[:\-–—]\s*(.+)$/i);
    if (m) return m[1].replace(/\*+/g, '').trim();
    const n = normForMatch(norm || normalizeHeader(line));
    const m2 = n.match(/^FASE\s*\d+\s+(.+)$/i);
    return m2 ? m2[1].trim() : '';
}

function findSection(norm, rawLine) {
    const actTitle = extractActivationTitle(rawLine || norm);
    if (actTitle) return { key: 'titulo', inline: actTitle };

    const faseTitle = extractFaseTitle(rawLine, norm);
    if (faseTitle) return { key: 'titulo', inline: faseTitle };

    const n = normForMatch(norm);
    for (const rule of SECTION_RULES) {
        if (rule.match(n, norm)) return { key: rule.key };
    }
    if (REPROGRAM_PARENT.some((h) => n === h || n.startsWith(h))) return { key: '__reprogram_parent__' };
    if (TREINO_PARENT.some((h) => n === h || n.startsWith(h))) return { key: '__treino_parent__' };
    return null;
}

function isLikelyHeaderLine(line, norm, hit) {
    if (!hit) return false;
    if (hit.inline) return true;
    if (norm.length >= 140) return false;
    if (/^\s*\d+[\.\)\-–—]\s*\S/.test(line)) return true;
    if (/^\s*#+\s/.test(line)) return true;
    if (/FASE\s*\d+/i.test(line)) return true;
    if (norm.length < 90 && !/[.!?]\s+[a-záéíóúãõ]/i.test(line.slice(0, 75))) return true;
    return norm.length < 70;
}

/** Linha "1. O FUNDAMENTO SAGRADO: Provérbios 1" — se após : é só referência curta, corpo vem nas linhas seguintes */
function tryInlineSection(line, norm) {
    if (!line || !line.includes(':')) return null;
    const afterColon = line.split(':').slice(1).join(':').trim();
    if (!afterColon) return null;
    const hit = findSection(norm, line);
    if (!hit || hit.key.startsWith('__')) return null;
    if (afterColon.length < 55) {
        return { key: hit.key, headerOnly: true };
    }
    return { key: hit.key, inline: afterColon };
}

function parseBySectionRegex(raw) {
    const sections = {};
    const hits = [];

    const faseRe = /(?:^|[\n\r])\s*(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]\s*)*(?:\*{0,2})?FASE\s*\d+\s*[:\-–—]\s*(.+?)(?:\*{0,2})?\s*(?:\n|$)/giu;
    let fm;
    while ((fm = faseRe.exec(raw)) !== null) {
        const t = String(fm[1] || '').replace(/\*+/g, '').trim();
        if (t) hits.push({ key: 'titulo', index: fm.index, end: fm.index + fm[0].length, inline: t });
    }

    const titleRe = /(?:^|[\n\r])\s*(?:#+\s*)?(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]\s*)*(?:\*{0,2})?ATIVA(?:Ç|C)(?:Ã|A)O\s+\d+\s*[:\-–—]\s*(.+?)(?:\*{0,2})?\s*(?:\n|$)/giu;
    let tm;
    while ((tm = titleRe.exec(raw)) !== null) {
        const t = String(tm[1] || '').replace(/\*+/g, '').trim();
        if (t) hits.push({ key: 'titulo', index: tm.index, end: tm.index + tm[0].length, inline: t });
    }

    const regexHeaders = [
        { key: 'decreto_entrada', pattern: 'DECRETO DE ENTRADA' },
        { key: 'fundamento_sagrado', pattern: 'FUNDAMENTO SAGRADO' },
        { key: 'diagnostico_escassez', pattern: 'DIAGNOSTICO DA ESCASSEZ' },
        { key: 'diagnostico_escassez', pattern: 'DIAGNOSTICO DE ESCASSEZ' },
        { key: 'estrada_com_king', pattern: 'NA ESTRADA COM O KING' },
        { key: 'estrada_com_king', pattern: 'ESTRADA COM O KING' },
        { key: 'diretriz_ilustracao', pattern: 'DIRETRIZ DE ILUSTRACAO' },
        { key: 'mentalidade_travada', pattern: 'MENTALIDADE TRAVADA' },
        { key: 'nova_mentalidade', pattern: 'NOVA MENTALIDADE' },
        { key: 'exercicio_fixacao', pattern: 'EXERCICIO DE FIXACAO' },
        { key: 'ie_chave', pattern: 'IE CHAVE' },
        { key: 'treino_negocios', pattern: 'TAREFA DE NEGOCIOS' },
        { key: 'treino_negocios', pattern: 'TREINO DE NEGOCIOS' },
        { key: 'treino_altar', pattern: 'TAREFA DE ALTAR' },
        { key: 'treino_altar', pattern: 'TREINO DE ALTAR' },
        { key: 'sentenca_ativacao', pattern: 'SENTENCA DE ATIVACAO' },
        { key: 'proximo_episodio', pattern: 'PROXIMO EPISODIO' }
    ];

    for (const { key, pattern } of regexHeaders) {
        const re = new RegExp(
            '(?:^|[\\n\\r])\\s*(?:\\d+[\\.\\)\\-–—]\\s*)?(?:#+\\s*)?(?:[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]\\s*)*(?:\\*{0,2})?(?:O|A|AS|OS)?\\s*'
            + accentInsensitivePattern(pattern)
            + '(?:\\*{0,2})?\\s*:?',
            'giu'
        );
        let m;
        while ((m = re.exec(raw)) !== null) {
            hits.push({ key, index: m.index, end: m.index + m[0].length });
        }
    }

    hits.sort((a, b) => a.index - b.index || b.end - a.end);
    const seenAt = new Set();
    const deduped = [];
    for (const hit of hits) {
        const k = hit.index + ':' + hit.key;
        if (seenAt.has(k)) continue;
        seenAt.add(k);
        deduped.push(hit);
    }

    for (let i = 0; i < deduped.length; i++) {
        const hit = deduped[i];
        if (hit.inline) {
            sections.titulo = hit.inline;
            continue;
        }
        const start = hit.end;
        const end = i + 1 < deduped.length ? deduped[i + 1].index : raw.length;
        let val = raw.slice(start, end).trim();
        if (val.includes(':') && val.split('\n')[0].length < 80) {
            const firstNl = val.indexOf('\n');
            if (firstNl > 0) val = val.slice(firstNl + 1).trim();
        }
        if (val) sections[hit.key] = val;
    }

    return sections;
}

function hasMinimumSections(sections) {
    const req = ['decreto_entrada', 'fundamento_sagrado', 'sentenca_ativacao'];
    const found = req.filter((k) => String(sections[k] || '').trim()).length;
    return found >= 2 || Object.keys(sections).filter((k) => String(sections[k] || '').trim()).length >= 5;
}

function parsePastedActivation(text) {
    const raw = String(text || '').trim();
    if (!raw) return { error: 'Texto vazio.' };

    const lines = raw.split(/\r?\n/);
    const sections = {};
    let currentKey = null;
    let buffer = [];

    function flush() {
        if (!currentKey || currentKey.startsWith('__')) return;
        const val = buffer.join('\n').trim();
        if (val) sections[currentKey] = val;
        buffer = [];
    }

    for (const line of lines) {
        const norm = normalizeHeader(line);
        const inlineSec = tryInlineSection(line, norm);
        if (inlineSec) {
            flush();
            if (inlineSec.headerOnly) {
                currentKey = inlineSec.key;
            } else {
                sections[inlineSec.key] = inlineSec.inline;
                currentKey = null;
            }
            continue;
        }
        const hit = findSection(norm, line);
        if (hit && isLikelyHeaderLine(line, norm, hit)) {
            flush();
            if (hit.inline) {
                sections.titulo = hit.inline;
                currentKey = null;
            } else {
                currentKey = hit.key;
            }
            continue;
        }
        if (currentKey) buffer.push(line);
    }
    flush();

    const regexSections = parseBySectionRegex(raw);
    for (const [k, v] of Object.entries(regexSections)) {
        if (v) sections[k] = v;
    }

    if (sections.titulo) {
        const t = extractActivationTitle(sections.titulo) || extractFaseTitle(sections.titulo, normalizeHeader(sections.titulo));
        if (t) sections.titulo = t;
    }

    if (!sections.titulo && lines[0]) {
        const n0 = normalizeHeader(lines[0]);
        if (/^FASE\s*\d+/.test(n0)) {
            sections.titulo = extractFaseTitle(lines[0], n0) || lines[0].trim();
        } else if (!findSection(n0, lines[0])) {
            const first = lines[0].trim();
            if (!/^ATIVA(?:Ç|C)(?:Ã|A)O\s+COMPLETA/i.test(first)) {
                sections.titulo = first;
            }
        }
    }

    if (!hasMinimumSections(sections)) {
        const found = Object.keys(sections).filter((k) => sections[k]).join(', ') || 'nenhuma';
        return {
            error: 'Não foi possível dividir todas as seções obrigatórias. Encontrado: ' + found
                + '. Use títulos como DECRETO DE ENTRADA, FUNDAMENTO SAGRADO (ou 1. O FUNDAMENTO SAGRADO:) e SENTENÇA DE ATIVAÇÃO.'
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
