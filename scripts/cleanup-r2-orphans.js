/**
 * Limpeza de objetos órfãos no R2 (KingSelection).
 *
 * O que faz:
 * - Lista todos os objetos no R2 sob prefixo "galleries/"
 * - Busca no Postgres todas as referências (king_photos.file_path, king_galleries.watermark_path)
 * - Deleta do R2 os objetos cuja key NÃO aparece no banco
 *
 * Usa o Worker em r2.conectaking.com.br para listar e deletar (evita SSL do Render).
 *
 * Como usar:
 *   DRY_RUN=1 node scripts/cleanup-r2-orphans.js
 *   DRY_RUN=0 CONFIRM_DELETE=SIM node scripts/cleanup-r2-orphans.js
 *
 * Requisitos (env):
 * - KINGSELECTION_WORKER_SECRET (mesmo do Worker)
 * - R2_PUBLIC_BASE_URL ou KINGSELECTION_WORKER_URL = https://r2.conectaking.com.br
 * - DB_* (variáveis do backend para Postgres)
 */

require('dotenv').config();

const fetch = require('node-fetch');
const crypto = require('crypto');
const path = require('path');
const db = require('../db');

const KS_WORKER_SECRET = (process.env.KINGSELECTION_WORKER_SECRET || '').toString().trim();
const WORKER_URL = (process.env.KINGSELECTION_WORKER_URL || process.env.R2_PUBLIC_BASE_URL || 'https://r2.conectaking.com.br').toString().trim().replace(/\/$/, '');

function ksB64UrlJson(obj) {
  return Buffer.from(JSON.stringify(obj || {}), 'utf8').toString('base64url');
}

function ksSignToken(payload) {
  if (!KS_WORKER_SECRET) throw new Error('KINGSELECTION_WORKER_SECRET não configurado');
  const header = { alg: 'HS256', typ: 'KS' };
  const h = ksB64UrlJson(header);
  const p = ksB64UrlJson(payload);
  const sig = crypto.createHmac('sha256', KS_WORKER_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

async function getKsCleanupToken() {
  return ksSignToken({
    typ: 'ks_cleanup',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300
  });
}

async function listAllR2Keys(prefix = 'galleries/') {
  const token = await getKsCleanupToken();
  const keys = [];
  let cursor = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = new URL(`${WORKER_URL}/ks/list`);
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Worker ${res.status}`);
    if (Array.isArray(data.keys)) keys.push(...data.keys);
    if (!data.truncated || !data.cursor) break;
    cursor = data.cursor;
  }
  return keys;
}

async function deleteR2Batch(keys) {
  if (!keys.length) return { deleted: 0 };
  const token = await getKsCleanupToken();
  const res = await fetch(`${WORKER_URL}/ks/delete-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ keys })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Worker ${res.status}`);
  return { deleted: data.deleted || keys.length };
}

function normalizeR2Key(key) {
  if (!key || typeof key !== 'string') return null;
  const k = key.trim().replace(/^\/+/, '').replace(/\/+/g, '/');
  return k && k.startsWith('galleries/') ? k : null;
}

function extractR2Key(filePath) {
  const fp = String(filePath || '').trim();
  if (!fp) return null;
  const low = fp.toLowerCase();
  if (low.startsWith('r2:')) {
    const key = fp.slice(3).trim().replace(/^\/+/, '');
    return normalizeR2Key(key) || null;
  }
  if (fp.startsWith('galleries/')) return normalizeR2Key(fp);
  const m = fp.match(/galleries\/[^\s"']+/i);
  if (m) return normalizeR2Key(m[0]);
  return null;
}

async function hasColumn(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2 LIMIT 1`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function collectReferencedR2Keys(client) {
  const keys = new Set();
  const tables = [
    { table: 'king_photos', col: 'file_path' },
    { table: 'king_galleries', col: 'watermark_path' }
  ];
  for (const t of tables) {
    const ok = await hasColumn(client, t.table, t.col);
    if (!ok) continue;
    const r = await client.query(`SELECT ${t.col} AS v FROM ${t.table} WHERE ${t.col} IS NOT NULL AND ${t.col} != ''`);
    for (const row of r.rows) {
      const k = extractR2Key(row.v);
      if (k) keys.add(k);
    }
  }
  return keys;
}

async function main() {
  if (!KS_WORKER_SECRET) {
    throw new Error('KINGSELECTION_WORKER_SECRET não configurado.');
  }

  const dryRun = String(process.env.DRY_RUN || '1') !== '0';
  const confirm = (process.env.CONFIRM_DELETE || '').toString().trim().toUpperCase();
  const maxDelete = parseInt(process.env.MAX_DELETE || '0', 10) || 0;
  const sleepMs = parseInt(process.env.SLEEP_MS || '0', 10) || 0;
  const lockKey = parseInt(process.env.R2_ORPHAN_CLEANUP_LOCK_KEY || '20260202', 10) || 20260202;

  if (!dryRun && confirm !== 'SIM') {
    throw new Error('Para deletar de verdade, use CONFIRM_DELETE=SIM junto com DRY_RUN=0.');
  }

  const client = await db.pool.connect();
  try {
    try {
      const lr = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [lockKey]);
      const locked = !!(lr && lr.rows && lr.rows[0] && lr.rows[0].locked);
      if (!locked) {
        console.log(`[SKIP] cleanup-r2-orphans já está rodando (lock=${lockKey}).`);
        return;
      }
    } catch (e) {
      throw new Error(`Falha ao adquirir lock (lock=${lockKey}): ${e.message}`);
    }

    const referenced = await collectReferencedR2Keys(client);
    const allKeys = await listAllR2Keys('galleries/');
    const orphans = allKeys.filter(k => {
      const n = normalizeR2Key(k);
      return n && !referenced.has(n) && !referenced.has(k);
    });

    console.log(`R2 objetos (galleries/): ${allKeys.length}`);
    console.log(`Referenciados no banco: ${referenced.size}`);
    console.log(`Órfãos: ${orphans.length}`);
    console.log(`Modo: ${dryRun ? 'DRY_RUN (não deleta)' : 'DELETE'}`);

    if (orphans.length === 0) {
      console.log('Nada a deletar.');
      return;
    }

    let ok = 0;
    let fail = 0;
    let processed = 0;
    const batchSize = 1000;

    for (let i = 0; i < orphans.length; i += batchSize) {
      const batch = orphans.slice(i, i + batchSize);
      if (dryRun) {
        batch.forEach(k => console.log(`[DRY] deletaria ${k}`));
        processed += batch.length;
        continue;
      }
      if (maxDelete > 0 && processed >= maxDelete) {
        console.log(`Parando por MAX_DELETE=${maxDelete}`);
        break;
      }
      try {
        const { deleted } = await deleteR2Batch(batch);
        ok += deleted;
        processed += batch.length;
        console.log(`[OK] deletados ${deleted} (batch ${Math.floor(i / batchSize) + 1})`);
      } catch (e) {
        fail += batch.length;
        console.error(`[FAIL] batch: ${e.message}`);
      }
      if (sleepMs > 0) await new Promise(r => setTimeout(r, sleepMs));
    }

    if (!dryRun) {
      console.log(`Final: processados=${processed} deletados=${ok} falhas=${fail}`);
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [lockKey]); } catch (_) {}
    client.release();
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
