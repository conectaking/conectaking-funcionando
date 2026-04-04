/**
 * Admin: gerar devocionais 365 com IA (geração completa) e temas mensais.
 * Chave OpenAI: mesma do King Brief (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).
 */

const fs = require('fs');
const path = require('path');
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

/**
 * Gera com IA e grava na BD: título, passagem NVI quando possível, reflexão longa — alinhado ao tema.
 */
async function generateDayFullAiAndSave(day, year, options = {}) {
    devotionalAi.clearDev365Cache();
    const theme = bibleService.resolveThemeForDev365(day, year, {
        temaModo: options.temaModo || 'mes_auto',
        temaPersonalizado: options.temaPersonalizado || ''
    });
    const full = await devotionalAi.generateFullDevotional365Day({
        dayOfYear: day,
        year,
        estilo: options.estilo === 'cunha' ? 'cunha' : 'padrao',
        theme
    });
    if (full.error) {
        return { ok: false, error: full.error };
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
 * Gera com IA e grava na BD (enriquece reflexão sobre catálogo) ou modo completo (fullTheme).
 */
async function generateDayAndSave(day, year, options = {}) {
    if (options.fullTheme) {
        return generateDayFullAiAndSave(day, year, options);
    }
    const result = await bibleService.getDevocional365(day, {
        useAi: true,
        aiExplicitOff: false,
        year,
        temaModo: options.temaModo || 'mes_auto',
        temaPersonalizado: options.temaPersonalizado || '',
        estilo: options.estilo === 'cunha' ? 'cunha' : 'padrao'
    });
    if (!result.ai_gerado) {
        return { ok: false, error: result.ai_aviso || 'Não foi possível gerar (verifique a chave OpenAI no servidor).' };
    }
    await bibleRepository.upsertDevocional365(day, {
        titulo: result.titulo || '',
        versiculo_ref: result.versiculo_ref || '',
        versiculo_texto: result.versiculo_texto || '',
        reflexao: result.reflexao || '',
        aplicacao: result.aplicacao || '',
        oracao: result.oracao || ''
    });
    return { ok: true, data: { day_of_year: day, titulo: result.titulo, versiculo_ref: result.versiculo_ref } };
}

/** Gera vários dias em sequência (evite intervalos enormes num único request: use lotes). */
async function generateRangeAndSave(startDay, endDay, year, options = {}) {
    const delayMs = Math.max(0, parseInt(options.delayMs, 10) || 400);
    const results = [];
    const a = Math.max(1, Math.min(365, parseInt(startDay, 10) || 1));
    const b = Math.max(1, Math.min(365, parseInt(endDay, 10) || 365));
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    for (let d = from; d <= to; d++) {
        /* eslint-disable no-await-in-loop */
        const r = await generateDayAndSave(d, year, {
            temaModo: options.temaModo,
            temaPersonalizado: options.temaPersonalizado,
            estilo: options.estilo
        });
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
    for (let i = 0; i < days.length; i++) {
        const d = days[i];
        /* eslint-disable no-await-in-loop */
        const r = await generateDayAndSave(d, y, {
            temaModo,
            temaPersonalizado: options.temaPersonalizado || '',
            estilo: options.estilo === 'cunha' ? 'cunha' : 'padrao'
        });
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

module.exports = {
    getMonthThemesForYear,
    setMonthTheme,
    setAllMonthThemesForYear,
    getAdminDev365List,
    generateDayAndSave,
    generateRangeAndSave,
    generateMonthAndSave,
    getDayOfYearListForCalendarMonth,
    MONTH_THEMES_FILE
};
