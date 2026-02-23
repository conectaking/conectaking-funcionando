/**
 * Gera o plano de leitura da Bíblia (365 dias).
 * Agrupa capítulos para ~85-100 versículos/dia, 2-3 capítulos quando possível.
 * Saída: migrations/184_bible_reading_plan_seed.sql (INSERTs)
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'data', 'bible', 'books_manifest.json');
const booksDir = path.join(__dirname, '..', 'data', 'bible', 'books', 'nvi');
const outPath = path.join(__dirname, '..', 'migrations', '184_bible_reading_plan_seed.sql');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const allBooks = (manifest.at || []).concat(manifest.nt || []);

const chapters = [];
for (const book of allBooks) {
  const p = path.join(booksDir, book.id + '.json');
  if (!fs.existsSync(p)) continue;
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const chs = data.chapters || [];
  for (let i = 0; i < chs.length; i++) {
    const vc = Array.isArray(chs[i]) ? chs[i].length : 0;
    chapters.push({ bookId: book.id, bookName: book.name, chapterNum: i + 1, verseCount: vc });
  }
}

const totalVerses = chapters.reduce((s, c) => s + c.verseCount, 0);
const targetPerDay = Math.round(totalVerses / 365);
const minPerDay = Math.floor(targetPerDay * 0.7);
const maxPerDay = Math.ceil(targetPerDay * 1.4);

const days = [];
let dayNum = 1;
let idx = 0;
while (idx < chapters.length && dayNum <= 365) {
  const bookId = chapters[idx].bookId;
  const startChapter = chapters[idx].chapterNum;
  let verseCount = 0;
  let endChapter = startChapter;
  while (idx < chapters.length && chapters[idx].bookId === bookId) {
    const v = chapters[idx].verseCount;
    if (verseCount + v > maxPerDay && verseCount >= minPerDay) break;
    verseCount += v;
    endChapter = chapters[idx].chapterNum;
    idx++;
  }
  if (verseCount === 0 && idx < chapters.length) {
    verseCount = chapters[idx].verseCount;
    endChapter = chapters[idx].chapterNum;
    idx++;
  }
  days.push({
    day_number: dayNum,
    book_id: bookId,
    chapter_from: startChapter,
    chapter_to: endChapter,
    verse_count: verseCount
  });
  dayNum++;
}

const lines = [
  '-- Seed: plano de leitura 365 dias (gerado por scripts/build-bible-reading-plan.js)',
  '-- Execute após a migration 184.',
  ''
];
for (const d of days) {
  const summary = null;
  lines.push(
    `INSERT INTO bible_reading_plan_days (day_number, book_id, chapter_from, chapter_to, verse_count, summary) VALUES (${d.day_number}, '${d.book_id.replace(/'/g, "''")}', ${d.chapter_from}, ${d.chapter_to}, ${d.verse_count}, NULL) ON CONFLICT (day_number) DO UPDATE SET book_id = EXCLUDED.book_id, chapter_from = EXCLUDED.chapter_from, chapter_to = EXCLUDED.chapter_to, verse_count = EXCLUDED.verse_count;`
  );
}
lines.push('');
lines.push(`SELECT 'Seed 184: ${days.length} dias do plano de leitura inseridos.' AS status;`);

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Plano gerado:', days.length, 'dias. Total versículos cobertos:', days.reduce((s, d) => s + d.verse_count, 0));
console.log('Arquivo:', outPath);
