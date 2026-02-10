/**
 * Executa a migration 151 - Expandir watermark_scale para 10% a 500%
 * Necessário para que o banco aceite tamanho da marca d'água até 500%.
 * Uso: node scripts/run-migration-151.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function runMigration() {
  const client = await db.pool.connect();
  try {
    console.log('Executando migration 151 (watermark_scale 10%–500%)...');
    const migrationPath = path.join(__dirname, '..', 'migrations', '151_expand_kingselection_watermark_scale_to_5.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration 151 executada com sucesso. Tamanho da marca d\'água aceito até 500%.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao executar migration 151:', error.message);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration().catch(() => process.exit(1));
