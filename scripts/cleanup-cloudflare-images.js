/**
 * Limpeza de imagens órfãs no Cloudflare Images.
 *
 * O que faz:
 * - Lista TODAS as imagens do Cloudflare Images
 * - Busca no Postgres todas as URLs que referenciam "imagedelivery.net/.../<imageId>/..."
 * - Deleta do Cloudflare as imagens cujo ID NÃO aparece no banco
 *
 * Segurança:
 * - Por padrão roda em DRY RUN (não deleta nada)
 * - Você pode exigir idade mínima (MIN_AGE_DAYS) para evitar deletar uploads recentes ainda não salvos
 *
 * Como usar:
 *   DRY_RUN=1 node scripts/cleanup-cloudflare-images.js
 *   DRY_RUN=0 MIN_AGE_DAYS=3 node scripts/cleanup-cloudflare-images.js
 *
 * Requisitos (env):
 * - CF_IMAGES_ACCOUNT_ID (ou CLOUDFLARE_ACCOUNT_ID)
 * - CF_IMAGES_API_TOKEN (ou CLOUDFLARE_API_TOKEN)
 * - DB_* (as mesmas variáveis do backend para conectar no Postgres)
 */

require('dotenv').config();

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');

function getCfAccountId() {
  return (
    process.env.CF_IMAGES_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID ||
    null
  );
}

function getCfApiToken() {
  return (
    process.env.CF_IMAGES_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    (config.cloudflare && config.cloudflare.apiToken) ||
    null
  );
}

function extractCloudflareImageIdFromUrl(url) {
  const u = String(url || '').trim();
  const m = u.match(/^https?:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\/[^/?#]+/i);
  return m ? m[1] : null;
}

async function hasColumn(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2
     LIMIT 1`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function collectReferencedImageIds(client) {
  // Lista de tabelas/colunas onde guardamos URLs do Cloudflare Images
  const candidates = [
    { table: 'profile_items', col: 'image_url' },
    { table: 'profile_items', col: 'destination_url' }, // carrossel (JSON/text)

    { table: 'user_profiles', col: 'profile_image_url' },
    { table: 'user_profiles', col: 'background_image_url' },
    { table: 'user_profiles', col: 'share_image_url' },

    { table: 'guest_list_items', col: 'header_image_url' },
    { table: 'guest_list_items', col: 'background_image_url' },

    { table: 'digital_form_items', col: 'banner_image_url' },
    { table: 'digital_form_items', col: 'header_image_url' },
    { table: 'digital_form_items', col: 'background_image_url' },
    { table: 'digital_form_items', col: 'form_logo_url' },
    { table: 'digital_form_items', col: 'button_logo_url' },

    { table: 'sales_pages', col: 'button_logo_url' },
    { table: 'sales_pages', col: 'background_image_url' },
    { table: 'sales_pages', col: 'meta_image_url' },

    { table: 'sales_page_products', col: 'image_url' },

    { table: 'contract_items', col: 'stamp_image_url' }
  ];

  const ids = new Set();
  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await hasColumn(client, c.table, c.col);
    if (!ok) continue;

    // Busca só strings que parecem Cloudflare Images
    // eslint-disable-next-line no-await-in-loop
    const r = await client.query(
      `SELECT ${c.col} AS v
       FROM ${c.table}
       WHERE ${c.col} ILIKE '%imagedelivery.net/%'
       LIMIT 50000`
    );

    for (const row of r.rows) {
      const v = row.v;
      if (!v) continue;
      const s = String(v);
      // Pode conter múltiplas URLs (ex: JSON do carrossel); extrai todas as ocorrências
      const matches = s.matchAll(/https?:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\/[^"\s)]+/gi);
      for (const m of matches) {
        if (m && m[1]) ids.add(m[1]);
      }
      // fallback simples
      const one = extractCloudflareImageIdFromUrl(s);
      if (one) ids.add(one);
    }
  }
  return ids;
}

function collectReferencedImageIdsFromFiles({ rootDir }) {
  // Varre arquivos do "site" (public_html, views, public, etc.) para achar URLs imagedelivery.net
  // e evitar deletar imagens ainda referenciadas em HTML/JS/CSS/EJS.
  const ids = new Set();
  const allowExt = new Set(['.html', '.js', '.css', '.ejs', '.md', '.json', '.txt']);
  const skipDirs = new Set([
    '.git',
    'node_modules',
    '.cursor',
    'terminals',
    'dist',
    'build'
  ]);

  const toScan = [
    path.join(rootDir, 'public_html'),
    path.join(rootDir, 'views'),
    path.join(rootDir, 'public')
  ];

  function addFromString(s) {
    if (!s) return;
    const matches = String(s).matchAll(/https?:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\/[^"\s)]+/gi);
    for (const m of matches) {
      if (m && m[1]) ids.add(m[1]);
    }
  }

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (skipDirs.has(ent.name)) continue;
        walk(full);
        continue;
      }
      const ext = path.extname(ent.name).toLowerCase();
      if (!allowExt.has(ext)) continue;
      // Evitar ler arquivos enormes
      try {
        const st = fs.statSync(full);
        if (st.size > 5 * 1024 * 1024) continue; // 5MB
      } catch (_) {}
      try {
        const content = fs.readFileSync(full, 'utf8');
        addFromString(content);
      } catch (_) {
        // ignora arquivos binários ou com encoding diferente
      }
    }
  }

  for (const d of toScan) walk(d);
  return ids;
}

async function listCloudflareImages({ accountId, apiToken }) {
  // API v4 images/v1 lista paginada
  const perPage = 100;
  let page = 1;
  const out = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1?page=${page}&per_page=${perPage}`;
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json'
      }
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`Falha ao listar imagens (status ${resp.status}): ${t}`);
    }
    // eslint-disable-next-line no-await-in-loop
    const data = await resp.json();
    const list = data && data.result && data.result.images ? data.result.images : [];
    out.push(...list);
    if (list.length < perPage) break;
    page += 1;
  }
  return out;
}

async function deleteCloudflareImage({ accountId, apiToken, imageId }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json'
    }
  });
  if (resp.status === 404) return true;
  return resp.ok;
}

function daysBetween(a, b) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

async function main() {
  const accountId = getCfAccountId();
  const apiToken = getCfApiToken();
  if (!accountId || !apiToken) {
    throw new Error('Faltam envs: CF_IMAGES_ACCOUNT_ID e/ou CF_IMAGES_API_TOKEN (ou CLOUDFLARE_*).');
  }

  const dryRun = String(process.env.DRY_RUN || '1') !== '0';
  const minAgeDays = parseFloat(process.env.MIN_AGE_DAYS || '0') || 0;
  const repoRoot = path.resolve(__dirname, '..');

  const client = await db.pool.connect();
  try {
    const referencedDb = await collectReferencedImageIds(client);
    const referencedFiles = collectReferencedImageIdsFromFiles({ rootDir: repoRoot });
    const referenced = new Set([...referencedDb, ...referencedFiles]);
    const all = await listCloudflareImages({ accountId, apiToken });

    const now = new Date();
    const candidates = all.filter(img => {
      const id = img.id;
      if (!id) return false;
      if (referenced.has(id)) return false;
      if (minAgeDays > 0 && img.uploaded) {
        const up = new Date(img.uploaded);
        if (!Number.isNaN(up.getTime()) && daysBetween(now, up) < minAgeDays) return false;
      }
      return true;
    });

    console.log(`Cloudflare imagens: ${all.length}`);
    console.log(`Referenciadas no banco: ${referencedDb.size}`);
    console.log(`Referenciadas em arquivos (site): ${referencedFiles.size}`);
    console.log(`Referenciadas total (banco + site): ${referenced.size}`);
    console.log(`Órfãs candidatas (minAgeDays=${minAgeDays}): ${candidates.length}`);
    console.log(`Modo: ${dryRun ? 'DRY_RUN (não deleta)' : 'DELETE (vai deletar)'}`);

    let ok = 0;
    let fail = 0;

    for (const img of candidates) {
      const id = img.id;
      if (dryRun) {
        console.log(`[DRY] deletaria ${id} (${img.filename || 'sem-nome'})`);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const deleted = await deleteCloudflareImage({ accountId, apiToken, imageId: id });
      if (deleted) {
        ok += 1;
        console.log(`[OK] deletado ${id}`);
      } else {
        fail += 1;
        console.log(`[FAIL] não deletou ${id}`);
      }
    }

    if (!dryRun) {
      console.log(`Final: deletadas=${ok} falhas=${fail}`);
    }
  } finally {
    client.release();
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

