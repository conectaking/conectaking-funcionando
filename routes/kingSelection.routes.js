const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');
const fetch = require('node-fetch');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const router = express.Router();

// Cache simples para introspecção de schema (evita queries repetidas)
const _schemaCache = {
  columns: new Map()
};

async function hasColumn(pgClient, tableName, columnName) {
  const key = `${tableName}.${columnName}`;
  if (_schemaCache.columns.has(key)) return _schemaCache.columns.get(key);
  const res = await pgClient.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  const ok = res.rows.length > 0;
  _schemaCache.columns.set(key, ok);
  return ok;
}

function getPwCryptoKey() {
  // Chave para criptografar a senha do cliente (para o fotógrafo conseguir reenviar via WhatsApp)
  // Preferir variável específica; fallback para o jwt.secret.
  const raw = (process.env.KINGSELECTION_PW_KEY || config.jwt.secret || '').toString();
  // Derivar 32 bytes estáveis
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptPassword(plain) {
  const iv = crypto.randomBytes(12);
  const key = getPwCryptoKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // formato: base64(iv).base64(tag).base64(ciphertext)
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

function decryptPassword(payload) {
  try {
    const [ivB64, tagB64, dataB64] = String(payload || '').split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const key = getPwCryptoKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]);
    return out.toString('utf8');
  } catch (e) {
    return null;
  }
}

function getAccountHash() {
  // ATENÇÃO:
  // Para URL de entrega (imagedelivery.net) é necessário o "account hash" do Cloudflare Images,
  // NÃO o Account ID. Sem isso, o preview quebra (thumbnail não carrega).
  return (
    (config.cloudflare && config.cloudflare.accountHash) ||
    process.env.CLOUDFLARE_ACCOUNT_HASH ||
    process.env.CF_IMAGES_ACCOUNT_HASH ||
    null
  );
}

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
    (config.cloudflare && config.cloudflare.apiToken) ||
    process.env.CF_IMAGES_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    null
  );
}

function buildCfUrl(imageId) {
  const hash = getAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${imageId}/public`;
}

async function fetchCloudflareImageBuffer(imageId) {
  // Preferir delivery (rápido) quando houver account hash
  const deliveryUrl = buildCfUrl(imageId);
  if (deliveryUrl) {
    const imgRes = await fetch(deliveryUrl);
    if (imgRes.ok) return imgRes.buffer();
  }

  // Fallback: API blob (não depende de account hash)
  const accountId = getCfAccountId();
  const apiToken = getCfApiToken();
  if (!accountId || !apiToken) return null;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}/blob`;
  const imgRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'image/*'
    }
  });
  if (!imgRes.ok) return null;
  return imgRes.buffer();
}

async function loadWatermarkForGallery(pgClient, galleryId) {
  const hasMode = await hasColumn(pgClient, 'king_galleries', 'watermark_mode');
  const hasPath = await hasColumn(pgClient, 'king_galleries', 'watermark_path');
  if (!hasMode && !hasPath) return { mode: 'x', path: null };
  const cols = [
    hasMode ? 'watermark_mode' : `'x'::text AS watermark_mode`,
    hasPath ? 'watermark_path' : 'NULL::text AS watermark_path'
  ].join(', ');
  const res = await pgClient.query(`SELECT ${cols} FROM king_galleries WHERE id=$1`, [galleryId]);
  if (!res.rows.length) return { mode: 'x', path: null };
  return { mode: res.rows[0].watermark_mode || 'x', path: res.rows[0].watermark_path || null };
}

async function buildWatermarkedJpeg({ imgBuffer, outW, outH, watermark }) {
  const img = sharp(imgBuffer).rotate();
  // base: sempre resize inside
  let pipeline = img.resize(outW, outH, { fit: 'inside' });

  // 1) X (default)
  if (!watermark || watermark.mode === 'x' || !watermark.path) {
    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="0.30" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="0.30" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );
    pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
    return pipeline.jpeg({ quality: 82 }).toBuffer();
  }

  // 2) Logo (watermark_path = cfimage:<id>)
  const fp = String(watermark.path || '');
  if (!fp.startsWith('cfimage:')) {
    // fallback seguro
    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="0.30" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="0.30" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );
    pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
    return pipeline.jpeg({ quality: 82 }).toBuffer();
  }

  const imageId = fp.replace('cfimage:', '');
  const wmBufRaw = await fetchCloudflareImageBuffer(imageId);
  if (!wmBufRaw) {
    // fallback X
    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="0.30" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="0.30" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );
    pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
    return pipeline.jpeg({ quality: 82 }).toBuffer();
  }
  const wmBuf = wmBufRaw;
  const wmTargetW = Math.max(120, Math.round(outW * 0.28));
  const wmPng = await sharp(wmBuf)
    .rotate()
    .resize({ width: wmTargetW, withoutEnlargement: true })
    .png()
    .toBuffer();

  // aplica no centro com opacidade usando SVG mask simples
  const svg = Buffer.from(
    `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="transparent"/>
    </svg>`
  );
  pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);

  // Para opacidade: converte logo em PNG e aplica com blend "over" + opacity via composite (sharp suporta 'opacity' a partir de v0.33+)
  pipeline = pipeline.composite([{
    input: wmPng,
    gravity: 'center',
    blend: 'over',
    opacity: 0.28
  }]);
  return pipeline.jpeg({ quality: 82 }).toBuffer();
}

// ===== Admin =====
router.get('/galleries', protectUser, asyncHandler(async (req, res) => {
  const profileItemId = parseInt(req.query.profileItemId, 10);
  if (!profileItemId) return res.status(400).json({ message: 'profileItemId é obrigatório' });

  const client = await db.pool.connect();
  try {
    // Garantir que o item pertence ao usuário
    const userId = req.user.userId;
    const own = await client.query('SELECT id FROM profile_items WHERE id=$1 AND user_id=$2', [profileItemId, userId]);
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão para este módulo.' });

    const gRes = await client.query(
      `SELECT * FROM king_galleries WHERE profile_item_id=$1 ORDER BY id DESC`,
      [profileItemId]
    );

    // incluir fotos (simples)
    const galleries = gRes.rows;
    const ids = galleries.map(g => g.id);
    let photosByGallery = {};
    if (ids.length) {
      const pRes = await client.query(
        `SELECT id, gallery_id, original_name, "order" FROM king_photos WHERE gallery_id = ANY($1::int[]) ORDER BY gallery_id, "order" ASC, id ASC`,
        [ids]
      );
      pRes.rows.forEach(p => {
        photosByGallery[p.gallery_id] = photosByGallery[p.gallery_id] || [];
        photosByGallery[p.gallery_id].push(p);
      });
    }
    // incluir contagem de selecionadas e feedback (quando houver)
    let selectionStats = {};
    if (ids.length) {
      const sRes = await client.query(
        `SELECT gallery_id, COUNT(*)::int AS selected_count, MAX(feedback_cliente) AS feedback_cliente
         FROM king_selections
         WHERE gallery_id = ANY($1::int[])
         GROUP BY gallery_id`,
        [ids]
      );
      sRes.rows.forEach(r => {
        selectionStats[r.gallery_id] = {
          selected_count: r.selected_count || 0,
          feedback_cliente: r.feedback_cliente || null
        };
      });
    }
    const payload = galleries.map(g => ({ ...g, photos: photosByGallery[g.id] || [] }));
    const payloadWithStats = payload.map(g => ({
      ...g,
      selected_count: selectionStats[g.id]?.selected_count || 0,
      feedback_cliente: selectionStats[g.id]?.feedback_cliente || null,
      photos_count: (g.photos || []).length
    }));
    res.json({ success: true, galleries: payloadWithStats });
  } finally {
    client.release();
  }
}));

router.post('/galleries', protectUser, asyncHandler(async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const { profileItemId, nome_projeto, cliente_email, senha, total_fotos_contratadas, min_selections } = req.body || {};
    const pid = parseInt(profileItemId, 10);
    if (!pid || !nome_projeto || !cliente_email || !senha) {
      return res.status(400).json({ message: 'Campos obrigatórios: profileItemId, nome_projeto, cliente_email, senha' });
    }
    const own = await client.query('SELECT id FROM profile_items WHERE id=$1 AND user_id=$2', [pid, userId]);
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão para este módulo.' });

    // slug simples
    const baseSlug = String(nome_projeto).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || `galeria-${Date.now()}`;

    let slug = baseSlug;
    let i = 2;
    // garantir unicidade
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await client.query('SELECT 1 FROM king_galleries WHERE slug=$1', [slug]);
      if (exists.rows.length === 0) break;
      slug = `${baseSlug}-${i++}`;
    }

    // hash bcrypt via pgcrypt? Para manter simples, guardar hash bcrypt gerado no Node (bcryptjs já existe)
    const bcrypt = require('bcryptjs');
    const senha_hash = await bcrypt.hash(String(senha), 10);

    const hasMin = await hasColumn(client, 'king_galleries', 'min_selections');
    const hasEnc = await hasColumn(client, 'king_galleries', 'senha_enc');
    const minSel = parseInt(min_selections || 0, 10) || 0;
    const total = parseInt(total_fotos_contratadas || 0, 10) || 0;

    let ins;
    if (hasMin && hasEnc) {
      const senha_enc = encryptPassword(String(senha));
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, senha_enc, status, total_fotos_contratadas, min_selections)
         VALUES ($1,$2,$3,$4,$5,$6,'preparacao',$7,$8)
         RETURNING *`,
        [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, senha_enc, total, minSel]
      );
    } else if (hasEnc) {
      const senha_enc = encryptPassword(String(senha));
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, senha_enc, status, total_fotos_contratadas)
         VALUES ($1,$2,$3,$4,$5,$6,'preparacao',$7)
         RETURNING *`,
        [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, senha_enc, total]
      );
    } else if (hasMin) {
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, status, total_fotos_contratadas, min_selections)
         VALUES ($1,$2,$3,$4,$5,'preparacao',$6,$7)
         RETURNING *`,
        [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, total, minSel]
      );
    } else {
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, status, total_fotos_contratadas)
         VALUES ($1,$2,$3,$4,$5,'preparacao',$6)
         RETURNING *`,
        [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, total]
      );
    }

    // Retorna a senha em plaintext apenas na criação (para o fotógrafo copiar/enviar)
    res.status(201).json({ success: true, gallery: ins.rows[0], client_password: String(senha) });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/status', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { status } = req.body || {};
  if (!galleryId || !status) return res.status(400).json({ message: 'Parâmetros inválidos' });
  if (!['preparacao', 'andamento', 'revisao', 'finalizado'].includes(status)) return res.status(400).json({ message: 'Status inválido' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const g = await client.query(
      `SELECT g.* FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (g.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    await client.query('UPDATE king_galleries SET status=$1, updated_at=NOW() WHERE id=$2', [status, galleryId]);
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/photos', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { imageId, original_name, order } = req.body || {};
  if (!galleryId || !imageId) return res.status(400).json({ message: 'galleryId e imageId são obrigatórios' });

  const file_path = `cfimage:${imageId}`;

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const g = await client.query(
      `SELECT g.* FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (g.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    const ins = await client.query(
      `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
       VALUES ($1,$2,$3,$4)
       RETURNING id, gallery_id, original_name, "order"`,
      [galleryId, file_path, original_name || 'foto', parseInt(order || 0, 10) || 0]
    );
    res.status(201).json({ success: true, photo: ins.rows[0] });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/reset-password', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { senha } = req.body || {};
  if (!galleryId || !senha) return res.status(400).json({ message: 'galleryId e senha são obrigatórios' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const g = await client.query(
      `SELECT g.*
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (g.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    const senha_hash = await bcrypt.hash(String(senha), 10);
    const hasEnc = await hasColumn(client, 'king_galleries', 'senha_enc');
    if (hasEnc) {
      const senha_enc = encryptPassword(String(senha));
      await client.query('UPDATE king_galleries SET senha_hash=$1, senha_enc=$2, updated_at=NOW() WHERE id=$3', [senha_hash, senha_enc, galleryId]);
    } else {
      await client.query('UPDATE king_galleries SET senha_hash=$1, updated_at=NOW() WHERE id=$2', [senha_hash, galleryId]);
    }
    res.json({ success: true, client_password: String(senha) });
  } finally {
    client.release();
  }
}));

router.get('/galleries/:id', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const gRes = await client.query(
      `SELECT g.*
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    const pRes = await client.query(
      `SELECT id, gallery_id, original_name, "order", created_at
       FROM king_photos
       WHERE gallery_id=$1
       ORDER BY "order" ASC, id ASC`,
      [galleryId]
    );
    const sRes = await client.query(
      `SELECT photo_id, feedback_cliente, created_at
       FROM king_selections
       WHERE gallery_id=$1
       ORDER BY created_at ASC`,
      [galleryId]
    );
    const selectedPhotoIds = sRes.rows.map(r => r.photo_id);
    const feedback = sRes.rows.find(r => r.feedback_cliente)?.feedback_cliente || null;
    res.json({
      success: true,
      gallery: { ...g, photos: pRes.rows, selectedPhotoIds, feedback_cliente: feedback }
    });
  } finally {
    client.release();
  }
}));

router.put('/galleries/:id', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });

  const allowed = [
    'nome_projeto',
    'status',
    'total_fotos_contratadas',
    'min_selections',
    'access_mode',
    'is_published',
    'cliente_nome',
    'cliente_email',
    'cliente_telefone',
    'categoria',
    'data_trabalho',
    'idioma',
    'mensagem_acesso',
    'allow_download',
    'allow_comments',
    'allow_social_sharing',
    'watermark_mode',
    'watermark_path'
  ];

  const body = req.body || {};
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    // montar update apenas com colunas existentes
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (!(key in body)) continue;
      const exists = await hasColumn(client, 'king_galleries', key);
      if (!exists) continue;

      let val = body[key];
      if (key === 'total_fotos_contratadas' || key === 'min_selections') val = parseInt(val || 0, 10) || 0;
      if (key === 'is_published' || key === 'allow_download' || key === 'allow_comments' || key === 'allow_social_sharing') val = !!val;
      if (key === 'cliente_email') val = String(val || '').toLowerCase().trim();
      if (key === 'data_trabalho' && val) val = String(val).slice(0, 10);
      sets.push(`${key}=$${idx++}`);
      values.push(val);
    }

    if (!sets.length) return res.json({ success: true });
    values.push(galleryId);
    await client.query(`UPDATE king_galleries SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${idx}`, values);
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

// ===== Admin export (Lightroom / Windows / Finder) =====
router.get('/galleries/:id/export', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const gRes = await client.query(
      `SELECT g.*
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (gRes.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });
    const g = gRes.rows[0];

    const sRes = await client.query(
      `SELECT p.original_name, s.feedback_cliente
       FROM king_selections s
       JOIN king_photos p ON p.id = s.photo_id
       WHERE s.gallery_id=$1
       ORDER BY p."order" ASC, p.id ASC`,
      [galleryId]
    );
    const names = sRes.rows.map(r => r.original_name).filter(Boolean);
    const feedback = (sRes.rows.find(r => r.feedback_cliente)?.feedback_cliente) || null;

    const lightroom = names.join(', ');
    const windows = names.map(n => `"${String(n).replace(/\"/g, '')}"`).join(' OR ');
    const finder = names.join(' OR ');

    const hasEnc = await hasColumn(client, 'king_galleries', 'senha_enc');
    const senha_plain = hasEnc ? decryptPassword(g.senha_enc) : null;

    res.json({
      success: true,
      gallery: {
        id: g.id,
        nome_projeto: g.nome_projeto,
        slug: g.slug,
        cliente_email: g.cliente_email,
        status: g.status,
        total_fotos_contratadas: g.total_fotos_contratadas,
        min_selections: g.min_selections ?? 0,
        senha: senha_plain
      },
      feedback,
      lightroom,
      windows,
      finder,
      count: names.length
    });
  } finally {
    client.release();
  }
}));

// ===== Preview watermarked (ADMIN) =====
router.get('/photos/:photoId/preview', protectUser, asyncHandler(async (req, res) => {
  // IMPORTANTE: aqui é ADMIN, então além de validar token,
  // precisamos garantir que a foto pertence ao usuário logado.

  const photoId = parseInt(req.params.photoId, 10);
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const pRes = await client.query(
      `SELECT p.*, g.id AS gallery_id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (pRes.rows.length === 0) return res.status(404).send('Não encontrado');
    const photo = pRes.rows[0];
    const fp = String(photo.file_path || '');
    if (!fp.startsWith('cfimage:')) return res.status(500).send('Formato de arquivo inválido');
    const imageId = fp.replace('cfimage:', '');
    const buf = await fetchCloudflareImageBuffer(imageId);
    if (!buf) return res.status(500).send('Cloudflare não configurado (hash ou API token)');

    // Watermark X (30%) e resize 1200
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const width = meta.width || 1200;
    const height = meta.height || 1200;
    const max = 1200;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const wm = await loadWatermarkForGallery(client, photo.gallery_id);
    const out = await buildWatermarkedJpeg({
      imgBuffer: buf,
      outW,
      outH,
      watermark: wm
    });

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(out);
  } finally {
    client.release();
  }
}));

// ============================================================
// ===== Público (antes do login): capa + informações ==========
// ============================================================
router.get('/public/gallery', asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString().trim();
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });

  const client = await db.pool.connect();
  try {
    const hasMin = await hasColumn(client, 'king_galleries', 'min_selections');
    const gRes = await client.query(
      `SELECT id, nome_projeto, slug, status, total_fotos_contratadas${hasMin ? ', min_selections' : ''}
       FROM king_galleries
       WHERE slug=$1`,
      [slug]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    const pRes = await client.query('SELECT id FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC LIMIT 1', [g.id]);
    const coverPhotoId = pRes.rows.length ? pRes.rows[0].id : null;

    const totalPhotosRes = await client.query('SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id=$1', [g.id]);
    const totalPhotos = totalPhotosRes.rows[0]?.c || 0;

    res.json({
      success: true,
      gallery: {
        id: g.id,
        nome_projeto: g.nome_projeto,
        slug: g.slug,
        status: g.status,
        total_fotos_contratadas: g.total_fotos_contratadas || 0,
        min_selections: hasMin ? (g.min_selections || 0) : 0,
        total_photos: totalPhotos,
        cover_photo_id: coverPhotoId
      }
    });
  } finally {
    client.release();
  }
}));

router.get('/public/cover', asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString().trim();
  if (!slug) return res.status(400).send('slug é obrigatório');

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT id FROM king_galleries WHERE slug=$1', [slug]);
    if (gRes.rows.length === 0) return res.status(404).send('Galeria não encontrada');
    const galleryId = gRes.rows[0].id;

    const hasCover = await hasColumn(client, 'king_photos', 'is_cover');
    const pRes = hasCover
      ? await client.query('SELECT * FROM king_photos WHERE gallery_id=$1 ORDER BY is_cover DESC, "order" ASC, id ASC LIMIT 1', [galleryId])
      : await client.query('SELECT * FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC LIMIT 1', [galleryId]);
    if (pRes.rows.length === 0) return res.status(404).send('Sem fotos');
    const photo = pRes.rows[0];
    const fp = String(photo.file_path || '');
    if (!fp.startsWith('cfimage:')) return res.status(500).send('Formato de arquivo inválido');
    const imageId = fp.replace('cfimage:', '');
    const buf = await fetchCloudflareImageBuffer(imageId);
    if (!buf) return res.status(500).send('Cloudflare não configurado (hash ou API token)');

    // Capa: preview watermarked + blur leve, 1400px
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const width = meta.width || 1400;
    const height = meta.height || 900;
    const max = 1400;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="0.22" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="0.22" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );

    const out = await img
      .resize(outW, outH, { fit: 'inside' })
      .composite([{ input: svg, top: 0, left: 0 }])
      .blur(2.2)
      .jpeg({ quality: 78 })
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=900'); // 15min
    res.send(out);
  } finally {
    client.release();
  }
}));

// ===== Admin: ações de fotos (favorito/capa/substituir/excluir/download) =====
router.patch('/photos/:photoId', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  if (!photoId) return res.status(400).json({ message: 'photoId inválido' });

  const { is_favorite, is_cover, original_name, order } = req.body || {};

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT p.id, p.gallery_id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const galleryId = own.rows[0].gallery_id;

    const sets = [];
    const values = [];
    let i = 1;

    if (typeof is_favorite !== 'undefined' && await hasColumn(client, 'king_photos', 'is_favorite')) {
      sets.push(`is_favorite=$${i++}`);
      values.push(!!is_favorite);
    }
    if (typeof original_name !== 'undefined') {
      sets.push(`original_name=$${i++}`);
      values.push(String(original_name || '').slice(0, 500));
    }
    if (typeof order !== 'undefined') {
      sets.push(`"order"=$${i++}`);
      values.push(parseInt(order || 0, 10) || 0);
    }

    // capa: limpar outras e setar esta
    if (typeof is_cover !== 'undefined' && await hasColumn(client, 'king_photos', 'is_cover')) {
      if (is_cover) {
        await client.query('UPDATE king_photos SET is_cover=FALSE WHERE gallery_id=$1', [galleryId]);
        sets.push(`is_cover=$${i++}`);
        values.push(true);
      } else {
        sets.push(`is_cover=$${i++}`);
        values.push(false);
      }
    }

    if (!sets.length) return res.json({ success: true });
    values.push(photoId);
    await client.query(`UPDATE king_photos SET ${sets.join(', ')} WHERE id=$${i}`, values);
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.delete('/photos/:photoId', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  if (!photoId) return res.status(400).json({ message: 'photoId inválido' });
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT p.id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    await client.query('DELETE FROM king_photos WHERE id=$1', [photoId]);
    await client.query('DELETE FROM king_selections WHERE photo_id=$1', [photoId]);
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.post('/photos/:photoId/replace', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  const { imageId, original_name } = req.body || {};
  if (!photoId || !imageId) return res.status(400).json({ message: 'photoId e imageId são obrigatórios' });
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT p.id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const file_path = `cfimage:${imageId}`;
    await client.query(
      'UPDATE king_photos SET file_path=$1, original_name=$2 WHERE id=$3',
      [file_path, String(original_name || 'foto').slice(0, 500), photoId]
    );
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.get('/photos/:photoId/download', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  if (!photoId) return res.status(400).send('photoId inválido');

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const pRes = await client.query(
      `SELECT p.*, g.id AS gallery_id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!pRes.rows.length) return res.status(404).send('Não encontrado');
    const photo = pRes.rows[0];

    const fp = String(photo.file_path || '');
    if (!fp.startsWith('cfimage:')) return res.status(500).send('Formato de arquivo inválido');
    const imageId = fp.replace('cfimage:', '');
    const buf = await fetchCloudflareImageBuffer(imageId);
    if (!buf) return res.status(500).send('Cloudflare não configurado (hash ou API token)');

    // download como preview com marca (mais seguro). Se quiser original no futuro, adiciona mode=original.
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const width = meta.width || 2400;
    const height = meta.height || 2400;
    const max = 2400;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    const wm = await loadWatermarkForGallery(client, photo.gallery_id);
    const out = await buildWatermarkedJpeg({ imgBuffer: buf, outW, outH, watermark: wm });

    const filename = (photo.original_name || `foto-${photoId}.jpg`).toString().replace(/[\/\\:*?"<>|]+/g, '-');
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `attachment; filename="${filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : filename + '.jpg'}"`);
    res.send(out);
  } finally {
    client.release();
  }
}));

// ============================================================
// ===== Cliente (login por galeria, estilo Alboom) ============
// ============================================================

function verifyClientToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (!payload || payload.type !== 'kingselection_client') return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function requireClient(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1] : null;
  const payload = verifyClientToken(token);
  if (!payload) return res.status(401).json({ message: 'Não autorizado.' });
  req.ksClient = payload;
  next();
}

router.post('/client/login', asyncHandler(async (req, res) => {
  const { slug, email, senha } = req.body || {};
  if (!slug || !email || !senha) return res.status(400).json({ message: 'Informe slug, email e senha.' });

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT * FROM king_galleries WHERE slug=$1', [String(slug)]);
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    if (String(email).toLowerCase().trim() !== String(g.cliente_email).toLowerCase().trim()) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }
    const ok = await bcrypt.compare(String(senha), String(g.senha_hash));
    if (!ok) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });

    const token = jwt.sign(
      { type: 'kingselection_client', galleryId: g.id, slug: g.slug },
      config.jwt.secret,
      { expiresIn: '14d' }
    );
    res.json({ success: true, token });
  } finally {
    client.release();
  }
}));

router.get('/client/gallery', requireClient, asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString();
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });
  if (slug !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT id, nome_projeto, slug, status, total_fotos_contratadas FROM king_galleries WHERE id=$1', [req.ksClient.galleryId]);
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const gallery = gRes.rows[0];

    const pRes = await client.query(
      'SELECT id, original_name, "order" FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC',
      [gallery.id]
    );
    const sRes = await client.query(
      'SELECT photo_id, feedback_cliente FROM king_selections WHERE gallery_id=$1',
      [gallery.id]
    );
    const selectedPhotoIds = sRes.rows.map(r => r.photo_id);

    res.json({
      success: true,
      gallery: { ...gallery, photos: pRes.rows },
      selectedPhotoIds
    });
  } finally {
    client.release();
  }
}));

router.post('/client/select', requireClient, asyncHandler(async (req, res) => {
  const { slug, photo_id } = req.body || {};
  if (!slug || !photo_id) return res.status(400).json({ message: 'slug e photo_id são obrigatórios.' });
  if (String(slug) !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });

  const photoId = parseInt(photo_id, 10);
  if (!photoId) return res.status(400).json({ message: 'photo_id inválido.' });

  const client = await db.pool.connect();
  try {
    // validar que a foto pertence à galeria
    const p = await client.query('SELECT id FROM king_photos WHERE id=$1 AND gallery_id=$2', [photoId, req.ksClient.galleryId]);
    if (p.rows.length === 0) return res.status(404).json({ message: 'Foto não encontrada.' });

    const exists = await client.query('SELECT id FROM king_selections WHERE gallery_id=$1 AND photo_id=$2', [req.ksClient.galleryId, photoId]);
    if (exists.rows.length) {
      await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id=$2', [req.ksClient.galleryId, photoId]);
      return res.json({ success: true, selected: false });
    }
    await client.query(
      'INSERT INTO king_selections (gallery_id, photo_id, feedback_cliente) VALUES ($1,$2,NULL) ON CONFLICT (gallery_id, photo_id) DO NOTHING',
      [req.ksClient.galleryId, photoId]
    );
    res.json({ success: true, selected: true });
  } finally {
    client.release();
  }
}));

// Seleção em massa (para "Selecionar todas" / "Limpar seleção")
router.post('/client/select-bulk', requireClient, asyncHandler(async (req, res) => {
  const { slug, mode, photo_ids } = req.body || {};
  if (!slug || !mode) return res.status(400).json({ message: 'slug e mode são obrigatórios.' });
  if (String(slug) !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });
  if (!['select', 'unselect'].includes(String(mode))) return res.status(400).json({ message: 'mode inválido.' });

  const ids = Array.isArray(photo_ids) ? photo_ids.map(x => parseInt(x, 10)).filter(Boolean) : [];
  const client = await db.pool.connect();
  try {
    if (String(mode) === 'unselect') {
      if (ids.length) {
        await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id = ANY($2::int[])', [req.ksClient.galleryId, ids]);
      } else {
        await client.query('DELETE FROM king_selections WHERE gallery_id=$1', [req.ksClient.galleryId]);
      }
      return res.json({ success: true });
    }

    // select
    if (!ids.length) return res.json({ success: true });
    // garante que ids pertencem à galeria
    const validRes = await client.query('SELECT id FROM king_photos WHERE gallery_id=$1 AND id = ANY($2::int[])', [req.ksClient.galleryId, ids]);
    const validIds = validRes.rows.map(r => r.id);
    if (!validIds.length) return res.json({ success: true });

    const values = validIds.map((pid, idx) => `($1,$${idx + 2},NULL)`).join(',');
    await client.query(
      `INSERT INTO king_selections (gallery_id, photo_id, feedback_cliente)
       VALUES ${values}
       ON CONFLICT (gallery_id, photo_id) DO NOTHING`,
      [req.ksClient.galleryId, ...validIds]
    );
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.get('/client/export', requireClient, asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString();
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });
  if (slug !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT id, nome_projeto, slug FROM king_galleries WHERE id=$1', [req.ksClient.galleryId]);
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const gallery = gRes.rows[0];

    const sRes = await client.query(
      `SELECT p.original_name
       FROM king_selections s
       JOIN king_photos p ON p.id = s.photo_id
       WHERE s.gallery_id=$1
       ORDER BY p."order" ASC, p.id ASC`,
      [gallery.id]
    );
    const names = sRes.rows.map(r => r.original_name).filter(Boolean);

    const lightroom = names.join(', ');
    const windows = names.map(n => `"${String(n).replace(/\"/g, '')}"`).join(' OR ');

    res.json({ success: true, gallery, lightroom, windows });
  } finally {
    client.release();
  }
}));

router.post('/client/finalize', requireClient, asyncHandler(async (req, res) => {
  const { slug, feedback } = req.body || {};
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });
  if (String(slug) !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });

  const client = await db.pool.connect();
  try {
    if (feedback && String(feedback).trim()) {
      await client.query(
        'UPDATE king_selections SET feedback_cliente=$1 WHERE gallery_id=$2',
        [String(feedback).trim().slice(0, 2000), req.ksClient.galleryId]
      );
    }

    // Ao finalizar, mover status para "revisao" (aguardando fotógrafo)
    await client.query('UPDATE king_galleries SET status=$1, updated_at=NOW() WHERE id=$2', ['revisao', req.ksClient.galleryId]);

    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.get('/client/photos/:photoId/preview', asyncHandler(async (req, res) => {
  // Token via query string (necessário para <img>)
  const token = (req.query.token || '').toString();
  const payload = verifyClientToken(token);
  if (!payload) return res.status(401).send('Não autorizado');

  const slug = (req.query.slug || '').toString();
  if (slug && slug !== payload.slug) return res.status(403).send('Sem permissão');

  const photoId = parseInt(req.params.photoId, 10);
  const client = await db.pool.connect();
  try {
    const pRes = await client.query('SELECT * FROM king_photos WHERE id=$1 AND gallery_id=$2', [photoId, payload.galleryId]);
    if (pRes.rows.length === 0) return res.status(404).send('Não encontrado');
    const photo = pRes.rows[0];
    const fp = String(photo.file_path || '');
    if (!fp.startsWith('cfimage:')) return res.status(500).send('Formato de arquivo inválido');
    const imageId = fp.replace('cfimage:', '');
    const buf = await fetchCloudflareImageBuffer(imageId);
    if (!buf) return res.status(500).send('Cloudflare não configurado (hash ou API token)');

    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const width = meta.width || 1200;
    const height = meta.height || 1200;
    const max = 1200;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const wm = await loadWatermarkForGallery(client, payload.galleryId);
    const out = await buildWatermarkedJpeg({
      imgBuffer: buf,
      outW,
      outH,
      watermark: wm
    });

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(out);
  } finally {
    client.release();
  }
}));

module.exports = router;

