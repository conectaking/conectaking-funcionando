/**
 * Baixa Bíblias em português do repositório MaatheusGois/bible
 * Traduções: NVI, ARC, ACF, KJA
 * Execute: node scripts/download-bible-translations.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const PT_BR = 'https://raw.githubusercontent.com/MaatheusGois/bible/main/versions/pt-br';
const EN_BASE = 'https://raw.githubusercontent.com/MaatheusGois/bible/main/versions/en';
const TRANSLATIONS = [
  { code: 'nvi', base: PT_BR },
  { code: 'arc', base: PT_BR },
  { code: 'acf', base: PT_BR },
  { code: 'kja', base: PT_BR },
  { code: 'kjv', base: EN_BASE }
];
const DATA_DIR = path.join(__dirname, '..', 'data', 'bible');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function downloadTranslation(item) {
    const code = typeof item === 'string' ? item : item.code;
    const base = typeof item === 'string' ? PT_BR : item.base;
    const booksDir = path.join(DATA_DIR, 'books', code);
    ensureDir(booksDir);
    const url = `${base}/${code}.json`;
    console.log(`\nBaixando ${code.toUpperCase()}...`);
    let jsonStr = await fetchUrl(url);
    jsonStr = jsonStr.replace(/^\uFEFF/, '');
    const books = JSON.parse(jsonStr);
    let total = 0;
    for (const book of books) {
        const fp = path.join(booksDir, book.id + '.json');
        fs.writeFileSync(fp, JSON.stringify(book, null, 0), 'utf8');
        const verses = (book.chapters || []).reduce((s, ch) => s + (ch ? ch.length : 0), 0);
        total += verses;
        console.log(`  ${book.name}: ${verses} versículos`);
    }
    console.log(`  Total: ${total} versículos`);
    return total;
}

async function main() {
    console.log('Baixando Bíblias (NVI, ARC, ACF, KJA, KJV)...');
    for (const item of TRANSLATIONS) {
        const code = typeof item === 'string' ? item : item.code;
        try {
            await downloadTranslation(item);
        } catch (e) {
            console.error(`Erro em ${code}:`, e.message);
        }
    }
    console.log('\nConcluído!');
}

main().catch(err => { console.error(err); process.exit(1); });
