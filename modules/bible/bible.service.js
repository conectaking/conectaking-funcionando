const path = require('path');
const fs = require('fs');
const repository = require('./bible.repository');
const logger = require('../../utils/logger');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'bible');

function getVerseOfDayIndex(dateStr) {
    let y, m, d;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        [y, m, d] = dateStr.split('-').map(Number);
    } else {
        const tz = process.env.TZ || 'America/Sao_Paulo';
        const now = new Date();
        const brStr = now.toLocaleString('en-CA', { timeZone: tz }).slice(0, 10);
        [y, m, d] = brStr.split('-').map(Number);
    }
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) daysInMonth[1] = 29;
    let day = 0;
    for (let i = 0; i < m - 1; i++) day += daysInMonth[i];
    return day + d;
}

function loadVerseOfDayList() {
    try {
        const filePath = path.join(DATA_DIR, 'verse_of_day.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        logger.error('bible.service loadVerseOfDayList:', e);
        return [];
    }
}

function loadNumbersList() {
    try {
        const filePath = path.join(DATA_DIR, 'numbers.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        logger.error('bible.service loadNumbersList:', e);
        return [];
    }
}

function loadNamesList() {
    try {
        const filePath = path.join(DATA_DIR, 'names.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        logger.error('bible.service loadNamesList:', e);
        return [];
    }
}

function loadPalavrasDoDia() {
    try {
        const filePath = path.join(DATA_DIR, 'palavras_do_dia.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        logger.error('bible.service loadPalavrasDoDia:', e);
        return [];
    }
}

function loadSalmosDoDia() {
    try {
        const filePath = path.join(DATA_DIR, 'salmos_do_dia.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        logger.error('bible.service loadSalmosDoDia:', e);
        return [];
    }
}

function loadDevocionais() {
    try {
        const filePath = path.join(DATA_DIR, 'devocionais.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        logger.error('bible.service loadDevocionais:', e);
        return [];
    }
}

async function getPalavraDoDia(dateStr) {
    const list = loadPalavrasDoDia();
    if (!list.length) return null;
    const dayOfYear = getVerseOfDayIndex(dateStr);
    const index = dayOfYear % list.length;
    return { ...list[index], date: dateStr || new Date().toISOString().slice(0, 10) };
}

async function getSalmoDoDia(dateStr) {
    const list = loadSalmosDoDia();
    if (!list.length) return null;
    const dayOfYear = getVerseOfDayIndex(dateStr);
    const index = dayOfYear % list.length;
    return { ...list[index], date: dateStr || new Date().toISOString().slice(0, 10) };
}

async function getDevocionalDoDia(dateStr) {
    const dayOfYear = getVerseOfDayIndex(dateStr);
    const fromDb = await repository.getDevocional365(dayOfYear);
    if (fromDb) {
        return {
            titulo: fromDb.titulo,
            versiculo: fromDb.versiculo_ref,
            versiculo_texto: fromDb.versiculo_texto,
            texto: fromDb.reflexao,
            reflexao: fromDb.reflexao,
            aplicacao: fromDb.aplicacao,
            oracao: fromDb.oracao,
            day_of_year: fromDb.day_of_year,
            date: dateStr || new Date().toISOString().slice(0, 10)
        };
    }
    const list = loadDevocionais();
    if (!list.length) return null;
    const index = dayOfYear % list.length;
    return { ...list[index], date: dateStr || new Date().toISOString().slice(0, 10) };
}

const LIVRO_TO_BOOK_ID = {
    'João': 'jo', 'Salmos': 'ps', 'Provérbios': 'prv', 'Filipenses': 'ph', 'Isaías': 'is',
    'Romanos': 'rm', 'Mateus': 'mt', 'Jeremias': 'jr', 'Josué': 'js', '2 Coríntios': '2co',
    '1 Coríntios': '1co', 'Efésios': 'eph', '1 Pedro': '1pe'
};

async function getVerseOfDay(dateStr, translation) {
    const list = loadVerseOfDayList();
    if (!list.length) return null;
    const dayOfYear = getVerseOfDayIndex(dateStr);
    const index = dayOfYear % list.length;
    const item = list[index];
    const trans = (translation || 'nvi').toLowerCase();
    let texto = item.texto;
    const bookId = LIVRO_TO_BOOK_ID[item.livro];
    if (bookId && (trans === 'arc' || trans === 'acf' || trans === 'kja' || trans === 'nvi' || trans === 'kjv')) {
        const ch = getBookChapter(bookId, String(item.capitulo), trans);
        if (ch && ch.verses && ch.verses[item.versiculo - 1]) {
            texto = ch.verses[item.versiculo - 1].text;
        }
    }
    return {
        ...item,
        texto,
        date: dateStr || new Date().toISOString().slice(0, 10)
    };
}

function getNumbers() {
    return loadNumbersList();
}

async function getConfig(profileItemId, userId) {
    const owned = await repository.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Sem permissão para este item.');
    let item = await repository.findByProfileItemId(profileItemId);
    if (!item) item = await repository.create(profileItemId);
    return item;
}

async function saveConfig(profileItemId, userId, data) {
    const owned = await repository.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Sem permissão para este item.');
    let item = await repository.findByProfileItemId(profileItemId);
    if (!item) item = await repository.create(profileItemId);
    return await repository.update(profileItemId, data);
}

function getNameMeaning(name) {
    const list = loadNamesList();
    const q = (name || '').trim().toLowerCase();
    if (!q) return null;
    const found = list.find(n => n.nome.toLowerCase() === q);
    return found || null;
}

async function getMyProgress(userId) {
    const repo = require('./bible.repository');
    return await repo.getProgress(userId);
}

async function markRead(userId, data) {
    const repo = require('./bible.repository');
    return await repo.markRead(userId, data);
}

function loadBooksManifest() {
    try {
        const filePath = path.join(DATA_DIR, 'books_manifest.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        logger.error('bible.service loadBooksManifest:', e);
        return { at: [], nt: [] };
    }
}

/**
 * Retorna o texto de um trecho para TTS.
 * ref: "jo 3:16" (versículo) ou "jo 3" (capítulo inteiro).
 * @returns {{ text: string, scope: 'verse'|'chapter', ref: string } | null}
 */
function getTextForRef(ref, translation) {
    const r = (ref || '').trim();
    if (!r) return null;
    const parts = r.split(/\s+/);
    const bookId = (parts[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const chVerse = (parts[1] || '1').split(':');
    const chapterNum = chVerse[0] || '1';
    const verseNum = chVerse.length > 1 ? parseInt(chVerse[1], 10) : null;
    const ch = getBookChapter(bookId, chapterNum, translation);
    if (!ch || !ch.verses || !ch.verses.length) return null;
    const normalizedRef = `${bookId} ${chapterNum}${verseNum ? ':' + verseNum : ''}`;
    if (verseNum != null && verseNum >= 1 && verseNum <= ch.verses.length) {
        const verse = ch.verses[verseNum - 1];
        return { text: verse.text || '', scope: 'verse', ref: normalizedRef };
    }
    const text = ch.verses.map((v, i) => `${i + 1} ${v.text || ''}`).join(' ');
    return { text, scope: 'chapter', ref: normalizedRef };
}

function getBookChapter(bookId, chapterNum, translation) {
    const trans = (translation || 'nvi').toLowerCase();
    let bookPath = path.join(DATA_DIR, 'books', trans, bookId + '.json');
    if (!fs.existsSync(bookPath) && trans !== 'nvi') {
        bookPath = path.join(DATA_DIR, 'books', 'nvi', bookId + '.json');
    }
    if (!fs.existsSync(bookPath)) {
        logger.warn('bible.service getBookChapter: arquivo não encontrado', {
            bookPath,
            bookId,
            chapter: chapterNum,
            translation: trans,
            dataDirExists: fs.existsSync(DATA_DIR),
            booksDirExists: fs.existsSync(path.join(DATA_DIR, 'books'))
        });
        return null;
    }
    try {
        const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
        const chapters = book.chapters || [];
        const chIndex = parseInt(chapterNum, 10) - 1;
        if (chIndex < 0 || chIndex >= chapters.length) return null;
        const verses = chapters[chIndex] || [];
        return {
            bookId: book.id,
            bookName: book.name,
            chapter: chIndex + 1,
            totalChapters: chapters.length,
            verses: verses.map((text, i) => ({ verse: i + 1, text }))
        };
    } catch (e) {
        logger.error('bible.service getBookChapter:', e);
        return null;
    }
}

async function getDevocional365(dayOrDate) {
    let dayOfYear;
    if (typeof dayOrDate === 'number' || (typeof dayOrDate === 'string' && /^\d+$/.test(dayOrDate))) {
        dayOfYear = parseInt(dayOrDate, 10);
    } else {
        dayOfYear = getVerseOfDayIndex(dayOrDate);
    }
    if (dayOfYear < 1 || dayOfYear > 365) return null;
    const fromDb = await repository.getDevocional365(dayOfYear);
    if (fromDb) return fromDb;
    const list = loadDevocionais();
    if (!list.length) return null;
    const index = (dayOfYear - 1) % list.length;
    const item = list[index];
    return {
        day_of_year: dayOfYear,
        titulo: item.titulo,
        versiculo_ref: item.versiculo,
        versiculo_texto: null,
        reflexao: item.texto,
        aplicacao: null,
        oracao: item.oracao
    };
}

async function getStudyThemes() {
    return repository.getStudyThemes();
}

async function getStudies(themeSlug) {
    return repository.getStudies(themeSlug);
}

async function getStudyBySlug(themeSlug, studySlug) {
    return repository.getStudyBySlug(themeSlug, studySlug);
}

async function getOutlineCategories() {
    return repository.getOutlineCategories();
}

async function getOutlines(categorySlug) {
    return repository.getOutlines(categorySlug);
}

async function getOutlineBySlug(categorySlug, outlineSlug) {
    return repository.getOutlineBySlug(categorySlug, outlineSlug);
}

async function searchBibleEcosystem(query, limit) {
    return repository.searchBibleEcosystem(query, limit);
}

module.exports = {
    getVerseOfDay,
    getNumbers,
    getNameMeaning,
    getMyProgress,
    markRead,
    getConfig,
    saveConfig,
    getPalavraDoDia,
    getSalmoDoDia,
    getDevocionalDoDia,
    getDevocional365,
    getStudyThemes,
    getStudies,
    getStudyBySlug,
    getOutlineCategories,
    getOutlines,
    getOutlineBySlug,
    searchBibleEcosystem,
    loadBooksManifest,
    getBookChapter,
    getTextForRef
};
