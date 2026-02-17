const path = require('path');
const fs = require('fs');
const repository = require('./bible.repository');
const logger = require('../../utils/logger');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'bible');

function getVerseOfDayIndex(dateStr) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 86400000;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear;
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
    const list = loadDevocionais();
    if (!list.length) return null;
    const dayOfYear = getVerseOfDayIndex(dateStr);
    const index = dayOfYear % list.length;
    return { ...list[index], date: dateStr || new Date().toISOString().slice(0, 10) };
}

async function getVerseOfDay(dateStr, translation) {
    const list = loadVerseOfDayList();
    if (!list.length) return null;
    const dayOfYear = getVerseOfDayIndex(dateStr);
    const index = dayOfYear % list.length;
    const item = list[index];
    return {
        ...item,
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
    getDevocionalDoDia
};
