require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
  user: process.env.DB_USER, host: process.env.DB_HOST,
  database: process.env.DB_DATABASE, password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const r = await p.query(`
    SELECT id, nome_projeto, slug, face_recognition_enabled
    FROM king_galleries ORDER BY id DESC LIMIT 10
  `);
  console.log('Galerias:');
  r.rows.forEach(g => console.log(`  ID ${g.id} | slug="${g.slug}" | nome="${g.nome_projeto}" | face_recognition_enabled=${g.face_recognition_enabled}`));

  // Ativar para a galeria UNIPISO 2026 (slug ou id)
  console.log('\nAtivando face_recognition_enabled=TRUE para todas as galerias com "unipiso" no slug...');
  const upd = await p.query(`
    UPDATE king_galleries SET face_recognition_enabled = TRUE
    WHERE LOWER(slug) LIKE '%unipiso%' OR LOWER(nome_projeto) LIKE '%unipiso%'
    RETURNING id, nome_projeto, slug, face_recognition_enabled
  `);
  console.log('Atualizadas:', upd.rows);
}

main().then(() => p.end()).catch(e => { console.error('ERRO:', e.message); p.end(); });
