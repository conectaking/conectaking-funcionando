/**
 * Parser "Dividir seções" — cola Ativação inteira → campos estruturados.
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

function headerRegexPart(headerText) {
    return String(headerText || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+');
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

function isLikelyHeaderLine(line, norm, hit) {
    if (!hit) return false;
    if (hit.inline) return true;
    if (norm.length >= 120) return false;
    if (/^\s*\d+[\.\)\-–—]\s*\S/.test(line)) return true;
    if (/^\s*#+\s/.test(line)) return true;
    if (norm.length < 80 && !/[.!?]\s+[a-záéíóúãõ]/i.test(line.slice(0, 70))) return true;
    return norm.length < 55;
}

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

const SECTION_MAP = [
    { key: 'titulo', headers: ['TITULO DA ATIVACAO', 'TITULO'] },
    { key: 'decreto_entrada', headers: ['DECRETO DE ENTRADA'] },
    { key: 'fundamento_sagrado', headers: ['FUNDAMENTO SAGRADO'] },
    { key: 'diagnostico_escassez', headers: ['DIAGNOSTICO DA ESCASSEZ'] },
    { key: 'estrada_com_king', headers: ['NA ESTRADA COM O KING', 'ESTRADA COM O KING'] },
    { key: 'diretriz_ilustracao', headers: ['DIRETRIZ DE ILUSTRACAO'] },
    { key: 'mentalidade_travada', headers: ['MENTALIDADE TRAVADA'] },
    { key: 'nova_mentalidade', headers: ['NOVA MENTALIDADE (GOVERNO)', 'NOVA MENTALIDADE', 'GOVERNO DA MENTALIDADE'] },
    { key: 'exercicio_fixacao', headers: ['EXERCICIO DE FIXACAO', 'EXERCICIO DE FIXACAO MENTAL'] },
    { key: 'ie_chave', headers: ['IE CHAVE', 'IMAGEM E EMOÇÃO CHAVE', 'IMAGEM E EMOCAO CHAVE'] },
    { key: 'treino_negocios', headers: ['TAREFA DE NEGOCIOS', 'TREINO DE NEGOCIOS'] },
    { key: 'treino_altar', headers: ['TAREFA DE ALTAR', 'TREINO DE ALTAR'] },
    { key: 'sentenca_ativacao', headers: ['SENTENCA DE ATIVACAO'] },
    { key: 'proximo_episodio', headers: ['PROXIMO EPISODIO'] }
];

const REPROGRAM_PARENT = ['REPROGRAMACAO MENTAL', 'REPROGRAMACAO MENTAL E IE'];
const TREINO_PARENT = ['TREINO DO REI'];

function headerToKey(norm, rawLine) {
    const actTitle = extractActivationTitle(rawLine || norm);
    if (actTitle) return { key: 'titulo', inline: actTitle };

    for (const sec of SECTION_MAP) {
        if (sec.headers.some((h) => norm === h || norm.startsWith(h + ' ') || norm.endsWith(' ' + h))) return { key: sec.key };
        for (const h of sec.headers) {
            if (norm.includes(h) && norm.length < h.length + 40) return { key: sec.key };
        }
    }
    if (REPROGRAM_PARENT.some((h) => norm === h || norm.startsWith(h))) return { key: '__reprogram_parent__' };
    if (TREINO_PARENT.some((h) => norm === h || norm.startsWith(h))) return { key: '__treino_parent__' };
    return null;
}

function parseBySectionRegex(raw) {
    const sections = {};
    const hits = [];

    const titleRe = /(?:^|[\n\r])\s*(?:#+\s*)?(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]\s*)*(?:\*{0,2})?ATIVA(?:Ç|C)(?:Ã|A)O\s+\d+\s*[:\-–—]\s*(.+?)(?:\*{0,2})?\s*(?:\n|$)/giu;
    let tm;
    while ((tm = titleRe.exec(raw)) !== null) {
        const t = String(tm[1] || '').replace(/\*+/g, '').trim();
        if (t) hits.push({ key: 'titulo', index: tm.index, end: tm.index + tm[0].length, inline: t });
    }

    for (const sec of SECTION_MAP) {
        if (sec.key === 'titulo') continue;
        for (const h of sec.headers) {
            const re = new RegExp(
                '(?:^|[\\n\\r])\\s*(?:\\d+[\\.\\)\\-–—]\\s*)?(?:#+\\s*)?(?:[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]\\s*)*(?:\\*{0,2})?'
                + accentInsensitivePattern(h)
                + '(?:\\*{0,2})?\\s*:?',
                'giu'
            );
            let m;
            while ((m = re.exec(raw)) !== null) {
                hits.push({ key: sec.key, index: m.index, end: m.index + m[0].length });
            }
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
        const val = raw.slice(start, end).trim();
        if (val) sections[hit.key] = val;
    }

    return sections;
}

function hasMinimumSections(sections) {
    const req = ['decreto_entrada', 'fundamento_sagrado', 'sentenca_ativacao'];
    const found = req.filter((k) => String(sections[k] || '').trim()).length;
    return found >= 2 || Object.keys(sections).length >= 4;
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
        const hit = headerToKey(norm, line);
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
        const t = extractActivationTitle(sections.titulo);
        if (t) sections.titulo = t;
    }

    if (!sections.titulo && lines[0] && !headerToKey(normalizeHeader(lines[0]), lines[0])) {
        const first = lines[0].trim();
        if (!/^ATIVA(?:Ç|C)(?:Ã|A)O\s+COMPLETA/i.test(first)) {
            sections.titulo = first;
        }
    }

    if (!hasMinimumSections(sections)) {
        return { error: 'Não foi possível dividir. Inclua títulos como DECRETO DE ENTRADA, FUNDAMENTO SAGRADO e SENTENÇA DE ATIVAÇÃO (com ou sem número/emojis).' };
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
