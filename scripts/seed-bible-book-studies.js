/**
 * Gera o SQL de seed dos estudos profundos de cada livro da Bíblia (66 livros, Gênesis a Apocalipse).
 * Lê data/bible/book_studies_deep.json e gera migrations/186_bible_book_studies_deep_seed.sql
 *
 * Uso: node scripts/seed-bible-book-studies.js
 *
 * Para que todos os 66 estudos apareçam no painel e na página pública:
 * 1. Execute a migration 185 (cria as tabelas bible_book_studies e bible_chapter_studies).
 * 2. Execute a migration 186 (ou o SQL gerado por este script) no mesmo banco usado pela API.
 * No Render/Produção: rode as migrations no banco da API para que "Estudo por livro" mostre os 66 com conteúdo.
 */
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'bible', 'book_studies_deep.json');
const outPath = path.join(__dirname, '..', 'migrations', '186_bible_book_studies_deep_seed.sql');

function escapeSql(str) {
  if (str == null) return '';
  return String(str).replace(/'/g, "''");
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const lines = [
  '-- Seed 186: Estudos profundos de cada livro da Bíblia (66 livros)',
  '-- Gerado por scripts/seed-bible-book-studies.js',
  '-- Execute após a migration 185.',
  ''
];

for (const row of data) {
  const bookId = escapeSql(row.bookId || row.book_id);
  const title = escapeSql(row.title);
  const content = escapeSql(row.content);
  if (!bookId) continue;
  lines.push(
    `INSERT INTO bible_book_studies (book_id, title, content) VALUES (` +
    `'${bookId}', '${title}', '${content}'` +
    `) ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();`
  );
}

lines.push('');
lines.push(`SELECT 'Seed 186: ${data.length} estudos de livros inseridos/atualizados.' AS status;`);

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Gerado:', outPath, '|', data.length, 'livros');
