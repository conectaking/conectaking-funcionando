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

async function markDevotionalRead(data) {
    const repo = require('./bible.repository');
    return await repo.markDevotionalRead(data);
}

async function getDevotionalReadStatus(userId, visitorId, days) {
    const repo = require('./bible.repository');
    return await repo.getDevotionalReadStatus(userId, visitorId, days);
}

async function getReadingPlanDay(dayNumber) {
    const repo = require('./bible.repository');
    const dayRow = await repo.getReadingPlanDay(dayNumber);
    if (!dayRow) return null;
    const devocional = await repo.getDevocional365(dayNumber);
    return { ...dayRow, devocional: devocional || null };
}

async function getReadingPlanList() {
    const repo = require('./bible.repository');
    return await repo.getReadingPlanList();
}

async function getStudyBooks() {
    const repo = require('./bible.repository');
    const manifest = loadBooksManifest();
    const allBooks = (manifest.at || []).concat(manifest.nt || []);
    const bookIdsWithStudy = new Set(await repo.getBookIdsWithFullStudy());
    return allBooks
        .filter(b => b && b.id)
        .map(b => ({
            book_id: b.id,
            book_name: b.name || b.id,
            has_study: bookIdsWithStudy.has(b.id)
        }));
}

async function getBookStudy(bookId) {
    const repo = require('./bible.repository');
    const bookStudy = await repo.getBookStudy(bookId);
    if (!bookStudy) return null;
    const chapters = await repo.getChapterStudiesByBook(bookId);
    return { ...bookStudy, chapters };
}

async function getChapterStudy(bookId, chapterNumber) {
    const repo = require('./bible.repository');
    return await repo.getChapterStudy(bookId, chapterNumber);
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

let _jesusVerses = null;
function loadJesusVerses() {
    if (_jesusVerses !== null) return _jesusVerses;
    try {
        const filePath = path.join(DATA_DIR, 'jesus_verses.json');
        const data = fs.readFileSync(filePath, 'utf8');
        _jesusVerses = JSON.parse(data);
        return _jesusVerses;
    } catch (e) {
        _jesusVerses = {};
        return _jesusVerses;
    }
}

/** Retorna array de números de versículos em que Jesus fala no capítulo (para destaque no NT). */
function getJesusVerseNumbersForChapter(bookId, chapterNum) {
    const book = (bookId || '').toLowerCase();
    const data = loadJesusVerses();
    const chapters = data[book];
    if (!chapters || typeof chapters !== 'object') return [];
    const list = chapters[String(chapterNum)];
    return Array.isArray(list) ? list : [];
}

let _bookNameToId = null;
function getBookIdFromName(bookName) {
    if (!_bookNameToId) {
        const manifest = loadBooksManifest();
        _bookNameToId = {};
        (manifest.at || []).concat(manifest.nt || []).forEach(function (b) {
            if (b.name && b.id) _bookNameToId[b.name] = b.id;
        });
    }
    return _bookNameToId[bookName] || null;
}

/**
 * Retorna o texto de um trecho para TTS.
 * ref: "João 3:16", "Josué 1:9", "1 Samuel 2:3" ou "jo 3:16" (abrev).
 * @returns {{ text: string, scope: 'verse'|'chapter', ref: string } | null}
 */
function getTextForRef(ref, translation) {
    const r = (ref || '').trim();
    if (!r) return null;
    const parts = r.split(/\s+/);
    let bookName;
    let chVerseStr;
    if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
        bookName = parts[0] + ' ' + parts[1];
        chVerseStr = parts[2] || '1';
    } else {
        bookName = parts[0] || '';
        chVerseStr = parts[1] || '1';
    }
    const bookId = getBookIdFromName(bookName) || (bookName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const chVerse = chVerseStr.split(':');
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

const TOTAL_CHAPTERS_BIBLE = 1189;

/** Número de capítulos por livro, na ordem do books_manifest (at + nt). Evita 66 leituras de arquivo que travavam o servidor. */
const CHAPTER_COUNTS_66 = [50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22];

let _bibleChapterSequence = null;
/** Lista ordenada de { bookId, bookName, chapter } para cada um dos 1189 capítulos da Bíblia. Sem I/O pesado. */
function getBibleChapterSequence() {
    if (_bibleChapterSequence && _bibleChapterSequence.length > 0) return _bibleChapterSequence;
    const manifest = loadBooksManifest();
    const allBooks = (manifest.at || []).concat(manifest.nt || []);
    const list = [];
    for (let i = 0; i < allBooks.length; i++) {
        const book = allBooks[i];
        if (!book || !book.id) continue;
        const totalCh = (CHAPTER_COUNTS_66[i] != null && CHAPTER_COUNTS_66[i] >= 1) ? CHAPTER_COUNTS_66[i] : 1;
        for (let c = 1; c <= totalCh; c++) {
            list.push({ bookId: book.id, bookName: book.name, chapter: c });
        }
    }
    _bibleChapterSequence = list;
    return list;
}

function getDevocionalContentForChapter(bookId, bookName, chapter) {
    const key = bookId + '-' + chapter;
    try {
        const filePath = path.join(DATA_DIR, 'devocional_biblia_inteira.json');
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return data[key] || data[bookId + '_' + chapter] || null;
        }
    } catch (e) {
        logger.warn('bible.service getDevocionalContentForChapter:', e.message);
    }
    return null;
}

/** Devocional por dia da sequência (1 a 1189). Inclui 1–2 versículos do capítulo, resumo e mensagem. */
function getDevocionalBibliaInteiraByDay(dayNumber) {
    const seq = getBibleChapterSequence();
    if (!seq.length) return null;
    let day = parseInt(dayNumber, 10);
    if (isNaN(day) || day < 1) day = 1;
    const index = (day - 1) % seq.length;
    const entry = seq[index];
    if (!entry) return null;
    const chapterData = getBookChapter(entry.bookId, String(entry.chapter), 'nvi');
    const verses = chapterData && chapterData.verses ? chapterData.verses : [];
    const verse1 = verses[0];
    const verse2 = verses[1];
    const verseRef = verses.length >= 2
        ? (entry.bookName || entry.bookId) + ' ' + entry.chapter + ':' + (verse1 ? verse1.verse : 1) + '-' + (verse2 ? verse2.verse : 1)
        : (entry.bookName || entry.bookId) + ' ' + entry.chapter + (verse1 ? ':' + verse1.verse : '');
    const verseText = verse1 && verse2
        ? (verse1.text || '') + ' ' + (verse2.text || '')
        : (verse1 && verse1.text) || '';
    const content = getDevocionalContentForChapter(entry.bookId, entry.bookName, entry.chapter);
    const ref = (entry.bookName || entry.bookId) + ' ' + entry.chapter;
    const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const resumoPadrao = 'Este capítulo faz parte da jornada da Bíblia inteira em devocionais diários. Um ou dois versículos destacados trazem a essência do trecho. Hoje (' + hoje + ') deixe que esta Palavra ilumine o seu dia.';
    const reflexaoPadrao = (content && content.reflexao) || 'Leia o capítulo completo na Bíblia. Reflita sobre o que o Senhor está falando ao seu coração hoje. Este devocional percorre toda a Escritura: quando terminar, recomeça — para toda a vida.';
    return {
        mode: 'sequence',
        dayNumber: day,
        totalDays: seq.length,
        bookId: entry.bookId,
        bookName: entry.bookName,
        chapter: entry.chapter,
        totalChapters: chapterData ? chapterData.totalChapters : 1,
        ref,
        verse_ref: verseRef,
        verse_text: verseText,
        titulo: (content && content.titulo) ? content.titulo : ref + ' — Devocional',
        resumo_capitulo: (content && content.resumo_capitulo) ? content.resumo_capitulo : resumoPadrao,
        reflexao: reflexaoPadrao,
        aplicacao: (content && content.aplicacao) || 'Aplique em sua vida o que o Espírito Santo destacar na leitura.',
        oracao: (content && content.oracao) || 'Senhor, abre meus olhos para ver as maravilhas da Tua Palavra. Amém.'
    };
}

/** Devocional da Bíblia inteira: modo calendário (mês 1-12, dia 1-31) ou modo sequência (day 1-1189). */
function getDevocionalBibliaInteira(mode, monthOrDay, dayOptional) {
    const dayNum = parseInt(monthOrDay, 10);
    if (mode === 'sequence' && !isNaN(dayNum) && dayNum >= 1) {
        return getDevocionalBibliaInteiraByDay(dayNum);
    }
    const m = Math.max(1, Math.min(12, parseInt(monthOrDay, 10) || 1));
    const d = Math.max(1, Math.min(31, parseInt(dayOptional, 10) || 1));
    const manifest = loadBooksManifest();
    const allBooks = (manifest.at || []).concat(manifest.nt || []);
    const bookIndex = (m - 1) % allBooks.length;
    const book = allBooks[bookIndex];
    if (!book || !book.id) return null;
    const chapterData = getBookChapter(book.id, '1', 'nvi');
    const totalChapters = chapterData ? chapterData.totalChapters : 1;
    const chapter = Math.min(d, totalChapters);
    const content = getDevocionalContentForChapter(book.id, book.name, chapter);
    const ref = (book.name || book.id) + ' ' + chapter;
    const placeholderReflexao = 'Leia o capítulo ' + chapter + ' de ' + (book.name || book.id) + ' na Bíblia. Reflita sobre o que o Senhor está falando ao seu coração hoje.';
    return {
        mode: 'calendar',
        month: m,
        day: d,
        bookId: book.id,
        bookName: book.name,
        chapter,
        totalChapters,
        ref,
        verse_ref: ref + ':1',
        verse_text: null,
        titulo: content && content.titulo ? content.titulo : ref + ' — Devocional',
        resumo_capitulo: null,
        reflexao: content && content.reflexao ? content.reflexao : placeholderReflexao,
        aplicacao: content && content.aplicacao ? content.aplicacao : 'Aplique em sua vida o que o Espírito Santo destacar na leitura.',
        oracao: content && content.oracao ? content.oracao : 'Senhor, abre meus olhos para ver as maravilhas da Tua Palavra. Amém.'
    };
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
    getDevocionalBibliaInteira,
    getDevocional365,
    getStudyThemes,
    getStudies,
    getStudyBySlug,
    getOutlineCategories,
    getOutlines,
    getOutlineBySlug,
    searchBibleEcosystem,
    loadBooksManifest,
    getJesusVerseNumbersForChapter,
    getBookChapter,
    getTextForRef,
    markDevotionalRead,
    getDevotionalReadStatus,
    getReadingPlanDay,
    getReadingPlanList,
    getStudyBooks,
    getBookStudy,
    getChapterStudy
};
