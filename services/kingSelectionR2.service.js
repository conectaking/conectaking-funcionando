/**
 * Inventário e limpeza de órfãos no Cloudflare R2 (King Selection).
 */
const crypto = require('crypto');
const fetch = require('node-fetch');
const db = require('../db');

const KS_WORKER_SECRET = (process.env.KINGSELECTION_WORKER_SECRET || '').toString().trim();
const WORKER_URL = (process.env.KINGSELECTION_WORKER_URL || process.env.R2_PUBLIC_BASE_URL || 'https://r2.conectaking.com.br')
  .toString()
  .trim()
  .replace(/\/$/, '');

function ksB64UrlJson(obj) {
  return Buffer.from(JSON.stringify(obj || {}), 'utf8').toString('base64url');
}

function getKsCleanupToken() {
  return ksSignToken({
    typ: 'ks_cleanup',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300
  });
}

function ksSignToken(payload) {
  if (!KS_WORKER_SECRET) throw new Error('KINGSELECTION_WORKER_SECRET não configurado');
  const header = { alg: 'HS256', typ: 'KS' };
  const h = ksB64UrlJson(header);
  const p = ksB64UrlJson(payload);
  const sig = crypto.createHmac('sha256', KS_WORKER_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
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

function parseGalleryIdFromR2Key(key) {
  const m = String(key || '').match(/^galleries\/(\d+)(?:\/|$)/);
  return m ? parseInt(m[1], 10) : null;
}

function parseR2Subfolder(key, galleryId) {
  const prefix = `galleries/${galleryId}/`;
  const k = String(key || '');
  if (!k.startsWith(prefix)) return '(raiz)';
  const rest = k.slice(prefix.length);
  const parts = rest.split('/').filter(Boolean);
  if (parts.length <= 1) return '(raiz)';
  return parts.slice(0, -1).join('/');
}

async function hasColumn(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2 LIMIT 1`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function listR2ObjectsViaWorker(prefix = 'galleries/') {
  if (!KS_WORKER_SECRET) throw new Error('Worker não configurado');
  const objects = [];
  let cursor = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = new URL(`${WORKER_URL}/ks/list`);
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);
    const token = getKsCleanupToken();
    const res = await fetch(url.toString(), { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Worker ${res.status}`);
    if (Array.isArray(data.objects) && data.objects.length) {
      for (const o of data.objects) {
        const key = String(o?.key || '').trim();
        if (!key) continue;
        objects.push({
          key,
          size: Number(o.size) || 0,
          uploaded: o.uploaded || null
        });
      }
    } else if (Array.isArray(data.keys)) {
      for (const key of data.keys) {
        objects.push({ key: String(key), size: 0, uploaded: null });
      }
    }
    if (!data.truncated || !data.cursor) break;
    cursor = data.cursor;
  }
  return objects;
}

async function collectReferencedR2KeysGlobal(client) {
  const refSet = new Set();
  const tables = [
    { table: 'king_photos', col: 'file_path' },
    { table: 'king_galleries', col: 'watermark_path' }
  ];
  for (const t of tables) {
    if (!(await hasColumn(client, t.table, t.col))) continue;
    const r = await client.query(`SELECT ${t.col} AS v FROM ${t.table} WHERE ${t.col} IS NOT NULL AND ${t.col} != ''`);
    for (const row of r.rows) {
      const k = extractR2Key(row.v);
      if (k) refSet.add(k);
    }
  }
  return refSet;
}

async function deleteR2BatchViaWorker(keys) {
  if (!keys || keys.length === 0) return { deleted: 0 };
  if (!KS_WORKER_SECRET) throw new Error('Worker não configurado');
  const validKeys = keys
    .map((k) => String(k || '').trim().replace(/^\/+/, ''))
    .filter((k) => k && k.startsWith('galleries/'));
  if (validKeys.length === 0) return { deleted: 0 };
  const token = getKsCleanupToken();
  const res = await fetch(`${WORKER_URL}/ks/delete-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ keys: validKeys })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Worker ${res.status}`);
  return { deleted: data.deleted ?? validKeys.length };
}

async function buildR2InventoryForUser(userId) {
  if (!KS_WORKER_SECRET) {
    const err = new Error('Worker não configurado (KINGSELECTION_WORKER_SECRET)');
    err.status = 501;
    throw err;
  }
  const client = await db.pool.connect();
  try {
    const gRes = await client.query(
      `SELECT g.id, g.nome_projeto, g.slug, g.created_at, g.updated_at
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE pi.user_id = $1
       ORDER BY COALESCE(g.nome_projeto, '') ASC, g.id DESC`,
      [userId]
    );
    const userProjects = gRes.rows;
    const userGalleryIds = new Set(userProjects.map((g) => g.id));
    const allGRes = await client.query('SELECT id FROM king_galleries');
    const allDbGalleryIds = new Set(allGRes.rows.map((r) => r.id));

    const photoCounts = {};
    if (userGalleryIds.size) {
      const pRes = await client.query(
        'SELECT gallery_id, COUNT(*)::int AS c FROM king_photos WHERE gallery_id = ANY($1::int[]) GROUP BY gallery_id',
        [Array.from(userGalleryIds)]
      );
      pRes.rows.forEach((r) => { photoCounts[r.gallery_id] = r.c; });
    }

    const refSet = await collectReferencedR2KeysGlobal(client);
    const objects = await listR2ObjectsViaWorker('galleries/');

    const folderMap = new Map();
    const ensureFolder = (gid) => {
      if (!folderMap.has(gid)) {
        folderMap.set(gid, {
          galleryId: gid,
          r2Files: 0,
          r2Bytes: 0,
          orphanFiles: 0,
          orphanBytes: 0,
          lastUploaded: null,
          subfolders: new Map()
        });
      }
      return folderMap.get(gid);
    };

    let totalBytes = 0;
    let orphanObjects = 0;
    let orphanBytes = 0;
    const orphanSamples = [];

    for (const obj of objects) {
      const norm = normalizeR2Key(obj.key);
      if (!norm) continue;
      totalBytes += obj.size || 0;
      const gid = parseGalleryIdFromR2Key(norm);
      if (!gid) continue;
      const isOrphan = !refSet.has(norm);
      if (isOrphan) {
        orphanObjects += 1;
        orphanBytes += obj.size || 0;
        if (orphanSamples.length < 250) {
          orphanSamples.push({
            key: norm,
            size: obj.size || 0,
            uploaded: obj.uploaded,
            galleryId: gid,
            subfolder: parseR2Subfolder(norm, gid),
            fileName: norm.split('/').pop() || norm
          });
        }
      }
      const inUserScope = userGalleryIds.has(gid) || !allDbGalleryIds.has(gid);
      if (!inUserScope) continue;
      const folder = ensureFolder(gid);
      folder.r2Files += 1;
      folder.r2Bytes += obj.size || 0;
      if (isOrphan) {
        folder.orphanFiles += 1;
        folder.orphanBytes += obj.size || 0;
      }
      if (obj.uploaded) {
        const t = new Date(obj.uploaded).getTime();
        if (!folder.lastUploaded || t > new Date(folder.lastUploaded).getTime()) {
          folder.lastUploaded = obj.uploaded;
        }
      }
      const subName = parseR2Subfolder(norm, gid);
      if (!folder.subfolders.has(subName)) {
        folder.subfolders.set(subName, { name: subName, files: 0, bytes: 0, orphanFiles: 0, lastUploaded: null });
      }
      const sub = folder.subfolders.get(subName);
      sub.files += 1;
      sub.bytes += obj.size || 0;
      if (isOrphan) sub.orphanFiles += 1;
      if (obj.uploaded) {
        const st = new Date(obj.uploaded).getTime();
        if (!sub.lastUploaded || st > new Date(sub.lastUploaded).getTime()) sub.lastUploaded = obj.uploaded;
      }
    }

    const projects = userProjects.map((g) => {
      const folder = folderMap.get(g.id);
      const subfolders = folder
        ? Array.from(folder.subfolders.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        : [];
      return {
        galleryId: g.id,
        nome: g.nome_projeto || `Projeto #${g.id}`,
        slug: g.slug || '',
        inDatabase: true,
        inR2: !!(folder && folder.r2Files > 0),
        dbPhotos: photoCounts[g.id] || 0,
        r2Files: folder?.r2Files || 0,
        r2Bytes: folder?.r2Bytes || 0,
        orphanFiles: folder?.orphanFiles || 0,
        lastUploaded: folder?.lastUploaded || null,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        subfolders,
        status: !folder || folder.r2Files === 0
          ? 'sem_arquivos_r2'
          : (folder.orphanFiles > 0 ? 'com_orfaos' : 'ok')
      };
    });

    const orphanFolders = [];
    for (const [gid, folder] of folderMap.entries()) {
      if (userGalleryIds.has(gid)) continue;
      if (allDbGalleryIds.has(gid)) continue;
      orphanFolders.push({
        galleryId: gid,
        inDatabase: false,
        r2Files: folder.r2Files,
        r2Bytes: folder.r2Bytes,
        orphanFiles: folder.orphanFiles,
        lastUploaded: folder.lastUploaded,
        subfolders: Array.from(folder.subfolders.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        status: 'projeto_excluido'
      });
    }
    orphanFolders.sort((a, b) => (b.r2Bytes || 0) - (a.r2Bytes || 0));

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      summary: {
        r2TotalFiles: objects.length,
        r2TotalBytes: totalBytes,
        referencedInDb: refSet.size,
        orphanFiles: orphanObjects,
        orphanBytes,
        userProjects: projects.length,
        userProjectsWithR2: projects.filter((p) => p.inR2).length,
        orphanProjectFolders: orphanFolders.length
      },
      projects,
      orphanFolders,
      orphanSamples,
      orphanSamplesTruncated: orphanObjects > orphanSamples.length
    };
  } finally {
    client.release();
  }
}

async function runCleanupR2({ dryRun, confirm }) {
  if (!KS_WORKER_SECRET) {
    const err = new Error('Worker não configurado (KINGSELECTION_WORKER_SECRET)');
    err.status = 501;
    throw err;
  }
  if (!dryRun && confirm !== 'SIM') {
    const err = new Error('Para deletar de verdade, envie dryRun=false e confirm="SIM"');
    err.status = 400;
    throw err;
  }

  const client = await db.pool.connect();
  const lockKey = 20260202;
  try {
    const lr = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [lockKey]);
    if (!(lr?.rows?.[0]?.locked)) {
      const err = new Error('Limpeza R2 já está em execução.');
      err.status = 409;
      throw err;
    }
    const refSet = await collectReferencedR2KeysGlobal(client);
    const objects = await listR2ObjectsViaWorker('galleries/');
    const orphans = objects
      .map((o) => normalizeR2Key(o.key))
      .filter((n) => n && !refSet.has(n));
    let deleted = 0;
    if (!dryRun && orphans.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < orphans.length; i += batchSize) {
        const batch = orphans.slice(i, i + batchSize);
        const out = await deleteR2BatchViaWorker(batch);
        deleted += out.deleted || 0;
      }
    }
    try { await client.query('SELECT pg_advisory_unlock($1)', [lockKey]); } catch (_) { /* ignore */ }
    return {
      success: true,
      total: objects.length,
      referenced: refSet.size,
      orphans: orphans.length,
      deleted: dryRun ? 0 : deleted,
      dryRun,
      message: dryRun
        ? `${orphans.length} arquivo(s) órfão(s) no R2 (não referenciados em galerias ativas).`
        : `${deleted} arquivo(s) órfão(s) removido(s) do R2.`
    };
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [lockKey]); } catch (_) { /* ignore */ }
    client.release();
  }
}

module.exports = {
  buildR2InventoryForUser,
  runCleanupR2,
  isWorkerConfigured: () => !!KS_WORKER_SECRET
};
