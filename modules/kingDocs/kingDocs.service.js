/**
 * King Docs — serviço (lógica de cofre, partilhas, snapshot, R2)
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const repo = require('./kingDocs.repository');
const { r2PutObjectBuffer, r2GetObjectBuffer, getR2Client, getR2Config } = require('../../utils/r2');
const informacoesRepo = require('../editarCartao/informacoes/informacoes.repository');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const path = require('path');

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

async function deleteR2Key(storageKey) {
  const cfg = getR2Config();
  const client = getR2Client();
  if (!cfg.enabled || !client || !storageKey) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: storageKey }));
  } catch (_) {
    /* ignore */
  }
}

function getFieldValue(fieldData, group, key) {
  if (!fieldData || typeof fieldData !== 'object') return '';
  const g = fieldData[group];
  if (!g || typeof g !== 'object') return '';
  const v = g[key];
  return v != null ? String(v) : '';
}

/**
 * Monta snapshot congelado para o link (textos + metadados de ficheiros).
 * selection: { displayName, profileImageUrl, sections: [{ title, rows: [{ group, key, label?, showText, showFile, fileId }] }], extraDocs: [{ fileId, label }] }
 */
async function buildSnapshot(userId, fieldData, selection) {
  const displayName = selection.displayName != null ? String(selection.displayName).trim() : '';
  const profileImageUrl = selection.profileImageUrl != null ? String(selection.profileImageUrl).trim() : '';
  const sectionsOut = [];
  const fileIdsUsed = new Set();

  for (const sec of selection.sections || []) {
    const title = sec.title != null ? String(sec.title).trim() : 'Secção';
    const rowsOut = [];
    for (const row of sec.rows || []) {
      const group = String(row.group || '').trim();
      const key = String(row.key || '').trim();
      const label = row.label != null ? String(row.label).trim() : key;
      const showText = !!row.showText;
      const showFile = !!row.showFile;
      const fileId = row.fileId != null ? parseInt(row.fileId, 10) : null;
      if (!showText && !showFile) continue;

      const entry = { label, showText, showFile };

      if (showText && group && key) {
        entry.text = getFieldValue(fieldData, group, key);
      } else if (showText) {
        entry.text = '';
      }

      if (showFile && fileId) {
        const f = await repo.getFileByIdForUser(fileId, userId);
        if (f) {
          fileIdsUsed.add(f.id);
          entry.file = {
            id: f.id,
            name: f.original_name || f.doc_type,
            mime: f.mime || 'application/octet-stream',
            docType: f.doc_type
          };
        }
      }

      if (showText && !showFile) {
        rowsOut.push(entry);
        continue;
      }
      if (!showText && showFile) {
        if (entry.file) rowsOut.push(entry);
        continue;
      }
      if (showText && showFile) {
        if (entry.file) rowsOut.push(entry);
        else rowsOut.push({ label, showText: true, showFile: false, text: entry.text });
      }
    }
    if (rowsOut.length) sectionsOut.push({ title, rows: rowsOut });
  }

  const extraDocs = [];
  for (const ed of selection.extraDocs || []) {
    const fileId = ed.fileId != null ? parseInt(ed.fileId, 10) : null;
    if (!fileId) continue;
    const f = await repo.getFileByIdForUser(fileId, userId);
    if (!f) continue;
    fileIdsUsed.add(f.id);
    extraDocs.push({
      id: f.id,
      label: ed.label != null ? String(ed.label).trim() : f.doc_type,
      mime: f.mime || 'application/octet-stream'
    });
  }

  return {
    displayName,
    profileImageUrl,
    sections: sectionsOut,
    extraDocs,
    fileIds: Array.from(fileIdsUsed)
  };
}

function assertShareUsable(share) {
  if (share.revoked_at) {
    const err = new Error('Este link foi revogado.');
    err.statusCode = 410;
    throw err;
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    const err = new Error('Este link expirou.');
    err.statusCode = 410;
    throw err;
  }
  if (share.max_views != null && share.view_count >= share.max_views) {
    const err = new Error('Este link atingiu o número máximo de visualizações.');
    err.statusCode = 410;
    throw err;
  }
}

function assertViewer(share, viewerHeader) {
  if (share.password_hash) {
    const v = viewerHeader && String(viewerHeader).trim();
    if (!v || v !== share.viewer_token) {
      const err = new Error('Senha necessária ou sessão inválida.');
      err.statusCode = 401;
      err.code = 'NEEDS_PASSWORD';
      throw err;
    }
  }
}

async function createShare(userId, body) {
  const vault = await repo.getVault(userId);
  const fieldData = (vault && vault.field_data) || {};
  const expiresInHours = body.expiresInHours != null ? Number(body.expiresInHours) : 24;
  const hours = Number.isFinite(expiresInHours) ? Math.min(Math.max(expiresInHours, 1), 720) : 24;
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

  const password = body.password != null ? String(body.password).trim() : '';
  const passwordHash = password.length > 0 ? bcrypt.hashSync(password, 10) : null;

  let maxViews = null;
  if (body.maxViews != null && body.maxViews !== '') {
    const n = parseInt(body.maxViews, 10);
    if (Number.isFinite(n)) maxViews = Math.min(10000, Math.max(1, n));
  }

  const snapshot = await buildSnapshot(userId, fieldData, body.selection || {});

  const token = randomToken(18);

  const row = await repo.insertShare({
    token,
    userId,
    snapshot,
    passwordHash,
    viewerToken: null,
    expiresAt,
    maxViews
  });

  const publicPath = `/kingDocsShare.html?t=${encodeURIComponent(token)}`;
  return {
    id: row.id,
    token: row.token,
    expiresAt: row.expires_at,
    maxViews: row.max_views,
    hasPassword: !!passwordHash,
    shareUrl: publicPath
  };
}

async function getVault(userId) {
  const v = await repo.getVault(userId);
  return {
    fieldData: (v && v.field_data) || {},
    updatedAt: v ? v.updated_at : null
  };
}

async function saveVault(userId, fieldData) {
  await repo.upsertVault(userId, fieldData);
  return getVault(userId);
}

async function saveUploadedFile(userId, buffer, originalname, mimetype, docType) {
  const ext = path.extname(originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
  const safeExt = ext.length > 8 ? '.bin' : ext;
  const key = `king-docs/${userId}/${randomToken(8)}${safeExt}`;
  const ct = mimetype || 'application/octet-stream';
  await r2PutObjectBuffer({ key, body: buffer, contentType: ct, cacheControl: 'private, max-age=0' });
  const row = await repo.insertFile({
    userId,
    docType: String(docType || 'documento').slice(0, 80),
    storageKey: key,
    mime: ct,
    originalName: (originalname || 'ficheiro').slice(0, 500)
  });
  return {
    id: row.id,
    docType: row.doc_type,
    mime: row.mime,
    originalName: row.original_name,
    createdAt: row.created_at
  };
}

async function removeFile(userId, fileId) {
  const del = await repo.deleteFile(fileId, userId);
  if (del && del.storage_key) await deleteR2Key(del.storage_key);
  return { ok: true };
}

async function publicMeta(token) {
  const share = await repo.findShareByToken(token);
  if (!share) {
    const err = new Error('Link não encontrado.');
    err.statusCode = 404;
    throw err;
  }
  try {
    assertShareUsable(share);
  } catch (e) {
    return {
      ok: false,
      revoked: !!share.revoked_at,
      expired: share.expires_at && new Date(share.expires_at) < new Date(),
      maxViewsReached: share.max_views != null && share.view_count >= share.max_views,
      message: e.message
    };
  }
  const snap = share.snapshot || {};
  return {
    ok: true,
    needsPassword: !!share.password_hash,
    expiresAt: share.expires_at,
    displayName: snap.displayName || '',
    profileImageUrl: snap.profileImageUrl || ''
  };
}

async function publicUnlock(token, password) {
  const share = await repo.findShareByToken(token);
  if (!share || !share.password_hash) {
    const err = new Error('Link inválido.');
    err.statusCode = 404;
    throw err;
  }
  assertShareUsable(share);
  const ok = bcrypt.compareSync(String(password || ''), share.password_hash);
  if (!ok) {
    const err = new Error('Senha incorreta.');
    err.statusCode = 401;
    throw err;
  }
  const viewerToken = randomToken(16);
  await repo.setViewerToken(share.id, viewerToken);
  return { viewerToken };
}

async function publicData(token, viewerHeader) {
  const share = await repo.findShareByToken(token);
  if (!share) {
    const err = new Error('Link não encontrado.');
    err.statusCode = 404;
    throw err;
  }
  assertShareUsable(share);
  assertViewer(share, viewerHeader);
  await repo.incrementViewCount(share.id);
  return { snapshot: share.snapshot || {} };
}

async function publicDownloadFile(token, fileId, viewerHeader) {
  const share = await repo.findShareByToken(token);
  if (!share) {
    const err = new Error('Link não encontrado.');
    err.statusCode = 404;
    throw err;
  }
  assertShareUsable(share);
  assertViewer(share, viewerHeader);

  const fid = parseInt(fileId, 10);
  const snap = share.snapshot || {};
  const allowed = new Set((snap.fileIds || []).map(Number));
  if (!allowed.has(fid)) {
    const err = new Error('Ficheiro não incluído nesta partilha.');
    err.statusCode = 403;
    throw err;
  }

  const file = await repo.getFileByIdForUser(fid, share.user_id);
  if (!file) {
    const err = new Error('Ficheiro não encontrado.');
    err.statusCode = 404;
    throw err;
  }

  const buf = await r2GetObjectBuffer(file.storage_key);
  if (!buf) {
    const err = new Error('Não foi possível obter o ficheiro.');
    err.statusCode = 503;
    throw err;
  }
  return {
    buffer: buf,
    mime: file.mime || 'application/octet-stream',
    filename: file.original_name || `documento-${fid}`
  };
}

async function importFromProfile(userId) {
  const details = await informacoesRepo.getDetails(userId);
  if (!details) {
    const err = new Error('Perfil não encontrado.');
    err.statusCode = 404;
    throw err;
  }
  const vault = await repo.getVault(userId);
  const fd = vault && vault.field_data ? JSON.parse(JSON.stringify(vault.field_data)) : {};
  if (!fd.pessoal) fd.pessoal = {};
  if (!fd.contato) fd.contato = {};
  if (details.display_name) fd.pessoal['Nome Completo'] = String(details.display_name);
  const wa = details.whatsapp || details.whatsapp_number;
  if (wa) fd.contato['WhatsApp'] = String(wa);
  if (details.email) fd.contato['E-mail'] = String(details.email);
  await repo.upsertVault(userId, fd);
  return getVault(userId);
}

async function exportVaultPdf(userId) {
  const v = await getVault(userId);
  const fieldData = v.fieldData || {};
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([595, 842]);
  let pageHeight = page.getSize().height;
  let y = pageHeight - 48;

  const groupLabels = {
    pessoal: 'Dados pessoais',
    contato: 'Contato',
    endereco: 'Endereço',
    financeiro: 'Financeiro (PF)',
    empresa: 'Empresa',
    financeiropj: 'Financeiro (PJ)'
  };

  function newPageIfNeeded(minY) {
    if (y < minY) {
      page = pdfDoc.addPage([595, 842]);
      pageHeight = page.getSize().height;
      y = pageHeight - 48;
    }
  }

  page.drawText('King Docs — cofre (confidencial)', { x: 48, y, size: 14, font: fontBold, color: rgb(0.12, 0.32, 0.18) });
  y -= 22;
  page.drawText('Exportado em ' + new Date().toLocaleString('pt-BR'), { x: 48, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 22;

  for (const [gkey, obj] of Object.entries(fieldData)) {
    if (!obj || typeof obj !== 'object') continue;
    newPageIfNeeded(48);
    page.drawText(String(groupLabels[gkey] || gkey), { x: 48, y, size: 11, font: fontBold });
    y -= 16;
    for (const [k, val] of Object.entries(obj)) {
      const rawLine = String(k) + ': ' + String(val != null ? val : '');
      const parts = rawLine.match(/.{1,85}/g) || [rawLine];
      for (const part of parts) {
        newPageIfNeeded(24);
        page.drawText(part, { x: 52, y, size: 10, font });
        y -= 12;
      }
      y -= 4;
    }
    y -= 10;
  }

  return Buffer.from(await pdfDoc.save());
}

/** Download do dono (autenticado) — pré-visualização no painel Documentos */
async function downloadFileForOwner(userId, fileId) {
  const fid = parseInt(fileId, 10);
  if (!Number.isFinite(fid) || fid < 1) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }
  const file = await repo.getFileByIdForUser(fid, userId);
  if (!file) {
    const err = new Error('Ficheiro não encontrado.');
    err.statusCode = 404;
    throw err;
  }
  const buf = await r2GetObjectBuffer(file.storage_key);
  if (!buf) {
    const err = new Error('Não foi possível obter o ficheiro.');
    err.statusCode = 503;
    throw err;
  }
  return {
    buffer: buf,
    mime: file.mime || 'application/octet-stream',
    filename: file.original_name || `documento-${fid}`
  };
}

module.exports = {
  buildSnapshot,
  createShare,
  getVault,
  saveVault,
  saveUploadedFile,
  removeFile,
  downloadFileForOwner,
  publicMeta,
  publicUnlock,
  publicData,
  publicDownloadFile,
  importFromProfile,
  exportVaultPdf,
  listFiles: (uid) => repo.listFiles(uid),
  listShares: (uid) => repo.listShares(uid),
  revokeShare: (uid, id) => repo.revokeShare(id, uid)
};
