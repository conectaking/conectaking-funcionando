/**
 * Parser "Dividir seções" — cola Ativação inteira → campos estruturados.
 */

function normalizeHeader(line) {
    return String(line || '')
        .trim()
        .replace(/^#+\s*/, '')
        .replace(/^\*+\s*/, '')
        .replace(/\*+$/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
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

function headerToKey(norm) {
    for (const sec of SECTION_MAP) {
        if (sec.headers.some((h) => norm === h || norm.startsWith(h))) return sec.key;
    }
    if (REPROGRAM_PARENT.some((h) => norm === h || norm.startsWith(h))) return '__reprogram_parent__';
    if (TREINO_PARENT.some((h) => norm === h || norm.startsWith(h))) return '__treino_parent__';
    return null;
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
        const key = headerToKey(norm);
        if (key && (norm.length < 80 || !line.includes('.'))) {
            flush();
            currentKey = key;
            continue;
        }
        if (currentKey) buffer.push(line);
    }
    flush();

    if (!sections.titulo && lines[0] && !headerToKey(normalizeHeader(lines[0]))) {
        sections.titulo = lines[0].trim();
    }

    if (!sections.decreto_entrada && !sections.fundamento_sagrado && Object.keys(sections).length < 2) {
        return { error: 'Não foi possível dividir. Use os títulos do template (DECRETO DE ENTRADA, FUNDAMENTO SAGRADO, etc.).' };
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
