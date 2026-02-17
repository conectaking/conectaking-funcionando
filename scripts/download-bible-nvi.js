/**
 * Script para baixar a Bíblia NVI completa do repositório MaatheusGois/bible
 * Execute: node scripts/download-bible-nvi.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data', 'bible');
const BOOKS_DIR = path.join(DATA_DIR, 'books', 'nvi');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
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

async function main() {
    console.log('Baixando Bíblia NVI...');
    ensureDir(BOOKS_DIR);
    
    const url = 'https://raw.githubusercontent.com/MaatheusGois/bible/main/versions/pt-br/nvi.json';
    let jsonStr = await fetchUrl(url);
    jsonStr = jsonStr.replace(/^\uFEFF/, ''); // Remove BOM
    const books = JSON.parse(jsonStr);
    
    let totalVerses = 0;
    for (const book of books) {
        const filePath = path.join(BOOKS_DIR, book.id + '.json');
        fs.writeFileSync(filePath, JSON.stringify(book, null, 0), 'utf8');
        const verses = (book.chapters || []).reduce((s, ch) => s + (ch ? ch.length : 0), 0);
        totalVerses += verses;
        console.log(`  ${book.name} (${book.id}): ${verses} versículos`);
    }
    
    console.log(`\nConcluído! ${books.length} livros, ${totalVerses} versículos.`);
}

main().catch(err => {
    console.error('Erro:', err.message);
    process.exit(1);
});
