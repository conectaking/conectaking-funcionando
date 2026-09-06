/**
 * Script para executar migrations SQL
 * Uso: node scripts/run-migrations.js
 *
 * Preferência: DATABASE_URL (igual a db.js). Fallback: config.db (DB_*).
 */

const path = require('path');
const { loadDotenv } = require('../utils/loadDotenv');
loadDotenv(path.join(__dirname, '..'));
const { Pool } = require('pg');
const fs = require('fs');
const config = require('../config');

const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
const isLocalUrl = databaseUrl && /localhost|127\.0\.0\.1/.test(databaseUrl);
const useSslFromUrl = (process.env.DATABASE_SSL === 'false' || process.env.DATABASE_SSL === '0')
  ? false
  : !isLocalUrl;

let poolConfig;
if (databaseUrl) {
  poolConfig = {
    connectionString: databaseUrl,
    ssl: useSslFromUrl ? { rejectUnauthorized: false } : false
  };
  console.log(`🔌 Conectando via DATABASE_URL (SSL: ${useSslFromUrl ? 'sim' : 'não'})`);
} else {
  const isLocalhost = config.db.host === 'localhost' ||
    config.db.host === '127.0.0.1' ||
    config.db.host?.includes('localhost') ||
    config.db.host === '::1' ||
    !config.db.host;
  const isCloudDatabase = config.db.host?.includes('render.com') ||
    config.db.host?.includes('amazonaws.com') ||
    config.db.host?.includes('azure.com') ||
    config.db.host?.includes('googleapis.com') ||
    process.env.DB_REQUIRE_SSL === 'true';
  const useSSL = isCloudDatabase || (process.env.DB_USE_SSL === 'true' && !isLocalhost);
  poolConfig = {
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: parseInt(config.db.port, 10),
    ssl: useSSL ? (config.db.ssl || { rejectUnauthorized: false }) : false
  };
  console.log(`🔌 Conectando ao banco: ${config.db.host}:${config.db.port}`);
  console.log(`   SSL: ${useSSL ? 'HABILITADO' : 'DESABILITADO'}`);
}

const pool = new Pool(poolConfig);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`📦 Encontradas ${files.length} migrations para executar...\n`);
  console.log('⚠️  Este runner NÃO grava schema_migrations. Prefira: npm run migrate-auto\n');

  const client = await pool.connect();

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`🔄 Executando: ${file}...`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ ${file} OK\n`);
        successCount++;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        const code = error.code || '';
        const msg = error.message || String(error);
        if (code === '42P07' || code === '42710' || code === '42P16' || code === '42704' || code === '23505') {
          console.log(`⏭️  ${file} já aplicada (${code})\n`);
          skippedCount++;
        } else {
          console.error(`❌ ${file}: ${msg}\n`);
          errorCount++;
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\n📊 Resumo: ${successCount} ok, ${skippedCount} skip, ${errorCount} erros`);
  if (errorCount > 0) process.exit(1);
}

runMigrations().catch((err) => {
  console.error('Falha fatal:', err);
  process.exit(1);
});
