/**
 * Admin: gerar devocionais 365 com IA (geração completa) e temas mensais.
 * Chave OpenAI: mesma do King Brief (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const bibleService = require('./bible.service');
const bibleRepository = require('./bible.repository');
const devotionalAi = require('./bibleDevotionalAi.service');
const logger = require('../../utils/logger');

function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Mesma lógica que bible.service (dia 1–365 → mês/dia civil). */
function dayOfYearToMonthDay(doy, year) {
    const leap = isLeapYear(year);
    const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let d = doy;
    for (let m = 0; m < 12; m++) {
        if (d <= dim[m]) return { month: m + 1, day: d };
        d -= dim[m];
    }
    return { month: 12, day: dim[11] };
}

/** Lista de dias do ano (1–365) que caem num mês civil (1–12) num dado ano. */
function getDayOfYearListForCalendarMonth(year, month) {
    const m = Math.max(1, Math.min(12, parseInt(month, 10) || 1));
    const y = parseInt(year, 10) || new Date().getFullYear();
    const out = [];
    for (let doy = 1; doy <= 365; doy++) {
        const md = dayOfYearToMonthDay(doy, y);
        if (md.month === m) out.push(doy);
    }
    return out;
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'bible');
const MONTH_THEMES_FILE = path.join(DATA_DIR, 'dev365_month_themes.json');

function loadMonthThemesFile() {
    try {
        if (!fs.existsSync(MONTH_THEMES_FILE)) return {};
        return JSON.parse(fs.readFileSync(MONTH_THEMES_FILE, 'utf8'));
    } catch (e) {
        logger.error('bible.adminDev365 loadMonthThemesFile:', e);
        return {};
    }
}

function saveMonthThemesFile(all) {
    fs.writeFileSync(MONTH_THEMES_FILE, JSON.stringify(all, null, 2), 'utf8');
}

function getMonthThemesForYear(year) {
    const y = String(year);
    const all = loadMonthThemesFile();
    return all[y] || {};
}

function setMonthTheme(year, month, text) {
    const y = String(year);
    const m = String(Math.max(1, Math.min(12, parseInt(month, 10) || 1)));
    const all = loadMonthThemesFile();
    if (!all[y]) all[y] = {};
    all[y][m] = String(text || '').trim().slice(0, 500);
    saveMonthThemesFile(all);
    return all[y];
}

function setAllMonthThemesForYear(year, monthsObj) {
    const y = String(year);
    const all = loadMonthThemesFile();
    const out = {};
    for (let m = 1; m <= 12; m++) {
        const key = String(m);
        const raw = monthsObj && (monthsObj[key] !== undefined && monthsObj[key] !== null
            ? monthsObj[key]
            : monthsObj[m]);
        if (raw !== undefined && raw !== null && String(raw).trim()) {
            out[key] = String(raw).trim().slice(0, 500);
        }
    }
    all[y] = out;
    saveMonthThemesFile(all);
    return all[y];
}

/** Lista todos os registos para o painel admin (tabela + filtros). */
async function getAdminDev365List() {
    const rows = await bibleRepository.getAllDevotionals365ForAdmin();
    return { rows };
}

function collisionDev365WithAvoid(out, rows, norm) {
    const nr = norm(out.versiculo_ref || '');
    const nt = norm((out.titulo || '').trim());
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rr = norm(row.versiculo_ref || '');
        if (nr.length > 6 && rr.length > 6 && nr === rr) return 'versiculo_ref';
        const rt = norm((row.titulo || '').trim());
        if (nt.length > 10 && rt.length > 10 && nt === rt) return 'titulo';
    }
    return null;
}

/**
 * Gera com IA e grava na BD: título, passagem NVI quando possível, reflexão longa — alinhado ao tema.
 * Usa lista de passagens/títulos já usados no mesmo mês civil (+ lote em memória) para não repetir.
 */
async function generateDayFullAiAndSave(day, year, options = {}) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const md = dayOfYearToMonthDay(day, y);
    const monthDays = getDayOfYearListForCalendarMonth(y, md.month);
    const otherDays = monthDays.filter(function (d) {
        return d !== day;
    });
    let avoidRows = await bibleRepository.getDev365SnapshotForDays(otherDays);
    const sess = Array.isArray(options.sessionAvoid) ? options.sessionAvoid.slice(-42) : [];
    if (sess.length) {
        avoidRows = avoidRows.concat(sess);
    }

    const theme = bibleService.resolveThemeForDev365(day, y, {
        temaModo: options.temaModo || 'mes_auto',
        temaPersonalizado: options.temaPersonalizado || ''
    });
    const estilo = options.estilo === 'cunha' ? 'cunha' : 'padrao';
    const norm = devotionalAi.normalizeDev365Ref;

    let retryExtra = '';
    let full = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        devotionalAi.clearDev365Cache();
        full = await devotionalAi.generateFullDevotional365Day({
            dayOfYear: day,
            year: y,
            estilo,
            theme,
            avoidSnapshots: avoidRows,
            retryExtra
        });
        if (full.error) {
            return { ok: false, error: full.error };
        }
        const col = collisionDev365WithAvoid(full, avoidRows, norm);
        if (!col) break;
        retryExtra = `Colisão (${col}): não repita essa passagem nem esse título; escolha outro livro ou capítulo da Bíblia, mantendo o tema.`;
    }

    let versiculo_texto = full.versiculo_texto || '';
    if (!versiculo_texto && full.versiculo_ref) {
        const t = bibleService.getTextForRef(full.versiculo_ref.trim(), 'nvi');
        if (t && t.text) versiculo_texto = t.text.trim();
    }
    await bibleRepository.upsertDevocional365(day, {
        titulo: full.titulo || '',
        versiculo_ref: full.versiculo_ref || '',
        versiculo_texto: versiculo_texto || '',
        reflexao: full.reflexao || '',
        aplicacao: full.aplicacao || '',
        oracao: full.oracao || ''
    });
    return { ok: true, data: { day_of_year: day, titulo: full.titulo, versiculo_ref: full.versiculo_ref } };
}

/**
 * Gera sempre conteúdo completo novo (título + passagem + textos). O modo antigo só enriquecia a reflexão
 * e mantinha a mesma referência — causava dias repetidos; foi removido.
 */
async function generateDayAndSave(day, year, options = {}) {
    return generateDayFullAiAndSave(day, year, options);
}

/** Gera vários dias em sequência (evite intervalos enormes num único request: use lotes). */
async function generateRangeAndSave(startDay, endDay, year, options = {}) {
    const delayMs = Math.max(0, parseInt(options.delayMs, 10) || 400);
    const results = [];
    const a = Math.max(1, Math.min(365, parseInt(startDay, 10) || 1));
    const b = Math.max(1, Math.min(365, parseInt(endDay, 10) || 365));
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    const sessionAvoid = [];
    for (let d = from; d <= to; d++) {
        /* eslint-disable no-await-in-loop */
        const r = await generateDayFullAiAndSave(d, year, {
            temaModo: options.temaModo,
            temaPersonalizado: options.temaPersonalizado,
            estilo: options.estilo,
            sessionAvoid: sessionAvoid.slice()
        });
        if (r.ok && r.data) {
            sessionAvoid.push({
                day_of_year: d,
                titulo: r.data.titulo,
                versiculo_ref: r.data.versiculo_ref
            });
        }
        results.push({ day: d, ok: r.ok, error: r.error || null });
        if (delayMs && d < to) {
            await new Promise(function (resolve) {
                setTimeout(resolve, delayMs);
            });
        }
    }
    return { ok: true, results, total: results.length, errors: results.filter(function (x) { return !x.ok; }).length };
}

/**
 * Gera todos os dias do ano que pertencem ao mês civil (ex.: apenas janeiro = ~31 dias).
 * Usa tema do mês (inclui overrides em dev365_month_themes.json) com temaModo mes_auto por defeito.
 */
async function generateMonthAndSave(year, month, options = {}) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const days = getDayOfYearListForCalendarMonth(y, month);
    if (!days.length) {
        return { ok: false, error: 'Mês inválido.', results: [], total: 0, errors: 0 };
    }
    devotionalAi.clearDev365Cache();
    const delayMs = Math.max(0, parseInt(options.delayMs, 10) || 400);
    const temaModo = options.temaModo || 'mes_auto';
    const results = [];
    const sessionAvoid = [];
    for (let i = 0; i < days.length; i++) {
        const d = days[i];
        /* eslint-disable no-await-in-loop */
        const r = await generateDayFullAiAndSave(d, y, {
            temaModo,
            temaPersonalizado: options.temaPersonalizado || '',
            estilo: options.estilo === 'cunha' ? 'cunha' : 'padrao',
            sessionAvoid: sessionAvoid.slice()
        });
        if (r.ok && r.data) {
            sessionAvoid.push({
                day_of_year: d,
                titulo: r.data.titulo,
                versiculo_ref: r.data.versiculo_ref
            });
        }
        results.push({ day: d, ok: r.ok, error: r.error || null });
        if (delayMs && i < days.length - 1) {
            await new Promise(function (resolve) {
                setTimeout(resolve, delayMs);
            });
        }
    }
    return {
        ok: true,
        year: y,
        month: parseInt(month, 10),
        daysInBatch: days,
        results,
        total: results.length,
        errors: results.filter(function (x) { return !x.ok; }).length
    };
}

/** União ordenada dos dias do ano (1–365) que caem nos meses civis indicados. */
function collectDaysForCalendarMonths(year, monthsArr) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const set = new Set();
    monthsArr.forEach(function (m) {
        getDayOfYearListForCalendarMonth(y, m).forEach(function (d) {
            set.add(d);
        });
    });
    return Array.from(set).sort(function (a, b) {
        return a - b;
    });
}

function normalizeMonthsInput(raw) {
    if (raw === 'all' || raw === true) {
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    if (!Array.isArray(raw)) return [];
    const set = new Set();
    raw.forEach(function (x) {
        const m = parseInt(x, 10);
        if (!Number.isNaN(m) && m >= 1 && m <= 12) set.add(m);
    });
    return Array.from(set).sort(function (a, b) {
        return a - b;
    });
}

const dev365GenJobs = new Map();
const MAX_DEV365_JOBS = 64;

function pruneDev365JobsIfNeeded() {
    while (dev365GenJobs.size >= MAX_DEV365_JOBS) {
        const first = dev365GenJobs.keys().next().value;
        dev365GenJobs.delete(first);
    }
}

async function executeCalendarMonthsJob(jobId, days, year, options) {
    const job = dev365GenJobs.get(jobId);
    if (!job) return;
    job.status = 'running';
    job.updatedAt = Date.now();
    const delayMs = Math.max(0, parseInt(options.delayMs, 10) || 400);
    const temaModo = options.temaModo || 'mes_auto';
    const estilo = options.estilo === 'cunha' ? 'cunha' : 'padrao';
    const total = days.length;
    devotionalAi.clearDev365Cache();
    const sessionAvoid = [];
    try {
        for (let i = 0; i < days.length; i++) {
            const d = days[i];
            job.currentDay = d;
            job.updatedAt = Date.now();
            const r = await generateDayFullAiAndSave(d, year, {
                temaModo,
                temaPersonalizado: options.temaPersonalizado || '',
                estilo,
                sessionAvoid: sessionAvoid.slice()
            });
            if (r.ok && r.data) {
                sessionAvoid.push({
                    day_of_year: d,
                    titulo: r.data.titulo,
                    versiculo_ref: r.data.versiculo_ref
                });
            }
            job.processed = i + 1;
            if (!r.ok) {
                job.errors += 1;
                if (job.failedSamples.length < 50) {
                    job.failedSamples.push({ day: d, error: r.error || '?' });
                }
            }
            const elapsed = Date.now() - job.startedAt;
            const avgPerItem = elapsed / job.processed;
            job.etaSeconds = Math.max(0, Math.round(((total - job.processed) * avgPerItem) / 1000));
            job.updatedAt = Date.now();
            if (delayMs && i < days.length - 1) {
                await new Promise(function (resolve) {
                    setTimeout(resolve, delayMs);
                });
            }
        }
        job.status = 'done';
        job.currentDay = null;
        job.etaSeconds = 0;
        job.processed = total;
    } catch (e) {
        logger.error('bible.adminDev365 executeCalendarMonthsJob:', e);
        job.status = 'error';
        job.errorMessage = e.message || String(e);
    }
    job.updatedAt = Date.now();
}

/**
 * Inicia geração por meses civis em segundo plano (não bloqueia o HTTP).
 * O estado fica em memória no processo Node (reinício do servidor cancela o trabalho).
 */
function startCalendarMonthsBackgroundJob(year, monthsInput, options) {
    const y = parseInt(year, 10);
    if (Number.isNaN(y) || y < 2000 || y > 2100) {
        return { ok: false, error: 'Ano inválido (2000–2100).' };
    }
    const months = normalizeMonthsInput(monthsInput);
    if (!months.length) {
        return { ok: false, error: 'Selecione pelo menos um mês ou envie months: "all".' };
    }
    const days = collectDaysForCalendarMonths(y, months);
    if (!days.length) {
        return { ok: false, error: 'Nenhum dia a gerar.' };
    }
    pruneDev365JobsIfNeeded();
    const jobId = randomUUID();
    const job = {
        id: jobId,
        status: 'queued',
        year: y,
        months,
        total: days.length,
        processed: 0,
        errors: 0,
        etaSeconds: null,
        currentDay: null,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        errorMessage: null,
        failedSamples: [],
        cancelRequested: false
    };
    dev365GenJobs.set(jobId, job);
    setImmediate(function () {
        executeCalendarMonthsJob(jobId, days, y, options || {}).catch(function (e) {
            logger.error('bible.adminDev365 executeCalendarMonthsJob outer:', e);
            const j = dev365GenJobs.get(jobId);
            if (j) {
                j.status = 'error';
                j.errorMessage = e.message || String(e);
                j.updatedAt = Date.now();
            }
        });
    });
    return { ok: true, jobId, total: days.length };
}

function cancelDev365GenerationJob(jobId) {
    const j = dev365GenJobs.get(jobId);
    if (!j) {
        return { ok: false, error: 'Trabalho não encontrado ou já expirou.' };
    }
    if (j.status === 'done' || j.status === 'error' || j.status === 'cancelled') {
        return { ok: false, error: 'Este trabalho já terminou.' };
    }
    j.cancelRequested = true;
    return { ok: true };
}

function getDev365GenerationJob(jobId) {
    const j = dev365GenJobs.get(jobId);
    if (!j) return null;
    const total = j.total || 0;
    const processed = j.processed || 0;
    let progress = total > 0 ? Math.min(100, Math.floor((100 * processed) / total)) : 0;
    if (j.status === 'done') progress = 100;
    let etaMinutes = null;
    if (j.etaSeconds != null && j.status === 'running') {
        etaMinutes = Math.round((j.etaSeconds / 60) * 10) / 10;
    }
    return {
        id: j.id,
        status: j.status,
        year: j.year,
        months: j.months,
        total,
        processed,
        progress,
        errors: j.errors || 0,
        etaSeconds: j.etaSeconds,
        etaMinutes,
        currentDay: j.currentDay,
        errorMessage: j.errorMessage || null,
        failedSamples: (j.failedSamples || []).slice(0, 20),
        updatedAt: j.updatedAt || null,
        startedAt: j.startedAt || null
    };
}

module.exports = {
    getMonthThemesForYear,
    setMonthTheme,
    setAllMonthThemesForYear,
    getAdminDev365List,
    generateDayAndSave,
    generateRangeAndSave,
    generateMonthAndSave,
    getDayOfYearListForCalendarMonth,
    startCalendarMonthsBackgroundJob,
    cancelDev365GenerationJob,
    getDev365GenerationJob,
    MONTH_THEMES_FILE
};
