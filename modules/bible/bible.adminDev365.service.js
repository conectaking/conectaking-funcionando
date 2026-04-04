/**
 * Admin: gerar devocionais 365 com IA, temas mensais, detetar duplicados.
 * Chave OpenAI: mesma do King Brief (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).
 */

const fs = require('fs');
const path = require('path');
const bibleService = require('./bible.service');
const bibleRepository = require('./bible.repository');
const devotionalAi = require('./bibleDevotionalAi.service');
const logger = require('../../utils/logger');

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

/** Devolve grupos de dias com mesmo hash de reflexão (possível duplicado). */
async function findDuplicateDevotionalGroups() {
    const rows = await bibleRepository.getAllDevotionals365ForAdmin();
    const byHash = {};
    for (let i = 0; i < rows.length; i++) {
        const h = rows[i].reflexao_hash || 'empty';
        if (!byHash[h]) byHash[h] = [];
        byHash[h].push(rows[i].day_of_year);
    }
    const duplicates = [];
    Object.keys(byHash).forEach(function (h) {
        if (h === 'empty') return;
        if (byHash[h].length > 1) {
            duplicates.push({ reflexao_hash: h, days: byHash[h].sort(function (a, b) { return a - b; }) });
        }
    });
    return { rows, duplicates };
}

/**
 * Gera com IA e grava na BD (mesma lógica do painel público, mas persiste).
 */
async function generateDayAndSave(day, year, options = {}) {
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
        const r = await generateDayAndSave(d, year, options);
        results.push({ day: d, ok: r.ok, error: r.error || null });
        if (delayMs && d < to) {
            await new Promise(function (resolve) {
                setTimeout(resolve, delayMs);
            });
        }
    }
    return { ok: true, results, total: results.length, errors: results.filter(function (x) { return !x.ok; }).length };
}

module.exports = {
    getMonthThemesForYear,
    setMonthTheme,
    setAllMonthThemesForYear,
    findDuplicateDevotionalGroups,
    generateDayAndSave,
    generateRangeAndSave,
    MONTH_THEMES_FILE
};
