const repo = require('./bible.prosperidade.repository');
const parseSvc = require('./bible.prosperidade.parse.service');
const aiSvc = require('./bible.prosperidadeAi.service');

function clampActivation(n) {
    const x = parseInt(n, 10);
    if (Number.isNaN(x) || x < 1 || x > 31) return null;
    return x;
}

/** Dia do mês 1–31 → Ativação N. Fevereiro: dia 28 = Ativação 28. */
function activationForCalendarDay(dayOfMonth) {
    const d = parseInt(dayOfMonth, 10);
    if (Number.isNaN(d) || d < 1) return 1;
    return Math.min(31, d);
}

function activationForToday(date) {
    const dt = date instanceof Date ? date : new Date();
    return activationForCalendarDay(dt.getDate());
}

function validateForPublish(row) {
    const missing = [];
    if (!String(row.titulo || '').trim()) missing.push('titulo');
    if (!String(row.decreto_entrada || '').trim()) missing.push('decreto_entrada');
    if (!String(row.fundamento_sagrado || '').trim()) missing.push('fundamento_sagrado');
    if (!String(row.sentenca_ativacao || '').trim()) missing.push('sentenca_ativacao');
    return missing;
}

async function getAtivacaoPublic(n) {
    const num = clampActivation(n);
    if (!num) return { error: 'Ativação deve ser entre 1 e 31.', code: 400 };
    const dto = await repo.getPublishedByNumber(num);
    if (dto) return { ok: true, data: dto };
    const nearest = await repo.getNearestPublished(num, 'prev') || await repo.getNearestPublished(num, 'next');
    return {
        ok: false,
        notPublished: true,
        activation_number: num,
        message: 'Esta Ativação ainda não foi publicada.',
        nearest_published: nearest
    };
}

async function getHoje(queryDay) {
    let n;
    if (queryDay != null && queryDay !== '') {
        n = clampActivation(queryDay);
    } else {
        n = activationForToday();
    }
    if (!n) return { error: 'Dia inválido.', code: 400 };
    const result = await getAtivacaoPublic(n);
    return { ...result, calendar_day: n, activation_number: n };
}

async function getList() {
    return repo.listPublishedSummary();
}

async function getNearestPublished(n) {
    const num = clampActivation(n);
    if (!num) return null;
    return (await repo.getNearestPublished(num, 'prev')) || (await repo.getNearestPublished(num, 'next'));
}

async function markRead(data) {
    return repo.markRead(data);
}

async function getReadStatus(userId, visitorId, days) {
    return repo.getReadStatus(userId, visitorId, days);
}

// --- Admin ---

async function adminList() {
    return repo.listAll();
}

async function adminGet(n) {
    const num = clampActivation(n);
    if (!num) throw new Error('Ativação deve ser entre 1 e 31.');
    const row = await repo.getByNumber(num);
    if (!row) throw new Error('Ativação não encontrada.');
    const dto = repo.rowToDto(row);
    dto.status = repo.computeStatus(row);
    dto.storytelling = aiSvc.getPhaseInfo(num);
    return dto;
}

async function adminSave(n, body, options) {
    const num = clampActivation(n);
    if (!num) throw new Error('Ativação deve ser entre 1 e 31.');
    const payload = parseSvc.bodyToDto(body || {});
    if (options && options.mergeSource) {
        const existing = await repo.getByNumber(num);
        const prev = existing && existing.content_source;
        if (prev === 'ai' && options.mergeSource === 'manual') payload.content_source = 'mixed';
        else if (!payload.content_source) payload.content_source = options.mergeSource || 'manual';
    }
    if (!payload.proverbs_ref) payload.proverbs_ref = 'Provérbios ' + num;
    if (!payload.storytelling_fase) payload.storytelling_fase = num;
    const row = await repo.updateActivation(num, payload);
    const dto = repo.rowToDto(row);
    dto.status = repo.computeStatus(row);
    return dto;
}

async function adminPublish(n, published) {
    const num = clampActivation(n);
    if (!num) throw new Error('Ativação deve ser entre 1 e 31.');
    if (published) {
        const row = await repo.getByNumber(num);
        const missing = validateForPublish(row || {});
        if (missing.length) {
            throw new Error('Campos obrigatórios faltando: ' + missing.join(', '));
        }
    }
    const row = await repo.setPublished(num, published);
    const dto = repo.rowToDto(row);
    dto.status = repo.computeStatus(row);
    return dto;
}

async function adminParsePaste(n, text) {
    const parsed = parseSvc.parsePastedActivation(text);
    if (parsed.error) return parsed;
    const num = clampActivation(n);
    if (!num) return { error: 'Ativação inválida.' };
    return {
        ok: true,
        sections: parsed.sections,
        activation_number: num
    };
}

async function adminGenerateAi(n) {
    const num = clampActivation(n);
    if (!num) return { error: 'Ativação inválida.' };
    return aiSvc.generateActivation(num);
}

async function adminExport() {
    return repo.exportAll();
}

async function adminImport(items) {
    return repo.importAll(items);
}

module.exports = {
    activationForCalendarDay,
    activationForToday,
    getAtivacaoPublic,
    getHoje,
    getList,
    getNearestPublished,
    markRead,
    getReadStatus,
    adminList,
    adminGet,
    adminSave,
    adminPublish,
    adminParsePaste,
    adminGenerateAi,
    adminExport,
    adminImport,
    validateForPublish
};
