/**
 * Gera o SQL de seed para os estudos profundos de cada livro da Bíblia.
 * Lê data/bible/book_studies_deep.js e gera migrations/185_bible_book_studies_full_seed.sql
 * Uso: node scripts/seed-bible-book-studies.js
 */
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'bible', 'book_studies_deep.js');
const outPath = path.join(__dirname, '..', 'migrations', '185_bible_book_studies_full_seed.sql');

let studies;
try {
  studies = require(dataPath);
} catch (e) {
  console.error('Erro ao carregar book_studies_deep.js:', e.message);
  process.exit(1);
}

if (!Array.isArray(studies) || studies.length === 0) {
  console.error('Nenhum estudo encontrado em book_studies_deep.js');
  process.exit(1);
}

function escapeSql(str) {
  if (str == null) return '';
  return String(str).replace(/'/g, "''");
}

const lines = [
  '-- Seed: Estudos profundos de cada livro da Bíblia (66 livros)',
  '-- Gerado por scripts/seed-bible-book-studies.js',
  '-- Execute após a migration 185.',
  ''
];

for (const s of studies) {
  const bookId = s.bookId || s.book_id;
  const title = s.title || ('Estudo de ' + bookId);
  const content = s.content || '';
  if (!bookId) continue;
  lines.push(
    `INSERT INTO bible_book_studies (book_id, title, content) VALUES (` +
    `'${escapeSql(bookId)}', ` +
    `'${escapeSql(title)}', ` +
    `'${escapeSql(content)}'` +
    `) ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();`
  );
}

lines.push('');
lines.push(`SELECT 'Seed: ${studies.length} estudos de livros inseridos/atualizados.' AS status;`);

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Arquivo gerado:', outPath);
console.log('Total de estudos:', studies.length);
