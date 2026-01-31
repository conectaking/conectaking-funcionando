const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');
const fetch = require('node-fetch');
const sharp = require('sharp');

const router = express.Router();

function getAccountHash() {
  return config.cloudflare?.accountHash || process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_IMAGES_ACCOUNT_ID || null;
}

function buildCfUrl(imageId) {
  const hash = getAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${imageId}/public`;
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
    const payload = galleries.map(g => ({ ...g, photos: photosByGallery[g.id] || [] }));
    res.json({ success: true, galleries: payload });
  } finally {
    client.release();
  }
}));

router.post('/galleries', protectUser, asyncHandler(async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const { profileItemId, nome_projeto, cliente_email, senha, total_fotos_contratadas } = req.body || {};
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

    const ins = await client.query(
      `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, status, total_fotos_contratadas)
       VALUES ($1,$2,$3,$4,$5,'preparacao',$6)
       RETURNING *`,
      [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, parseInt(total_fotos_contratadas || 0, 10) || 0]
    );
    res.status(201).json({ success: true, gallery: ins.rows[0] });
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

// ===== Preview watermarked (admin usa token query; cliente usará ct depois) =====
router.get('/photos/:photoId/preview', asyncHandler(async (req, res) => {
  // permitir admin via token query/header (reutiliza protectUser manualmente)
  // Para MVP: se vier token válido, ok. (cliente será implementado na próxima página)
  // Se não tiver token, negar.
  const token = (req.query.token || '').toString();
  if (!token) return res.status(401).send('Não autorizado');

  // validar token com o mesmo secret do sistema
  const jwt = require('jsonwebtoken');
  try {
    jwt.verify(token, config.jwt.secret);
  } catch (e) {
    return res.status(401).send('Token inválido');
  }

  const photoId = parseInt(req.params.photoId, 10);
  const client = await db.pool.connect();
  try {
    const pRes = await client.query('SELECT * FROM king_photos WHERE id=$1', [photoId]);
    if (pRes.rows.length === 0) return res.status(404).send('Não encontrado');
    const photo = pRes.rows[0];
    const fp = String(photo.file_path || '');
    if (!fp.startsWith('cfimage:')) return res.status(500).send('Formato de arquivo inválido');
    const imageId = fp.replace('cfimage:', '');
    const url = buildCfUrl(imageId);
    if (!url) return res.status(500).send('Cloudflare não configurado');

    const imgRes = await fetch(url);
    if (!imgRes.ok) return res.status(502).send('Falha ao buscar imagem');
    const buf = await imgRes.buffer();

    // Watermark X (30%) e resize 1200
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const width = meta.width || 1200;
    const height = meta.height || 1200;
    const max = 1200;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    // SVG overlay X com opacidade 0.3
    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="0.30" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="0.30" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );

    const out = await img
      .resize(outW, outH, { fit: 'inside' })
      .composite([{ input: svg, top: 0, left: 0 }])
      .jpeg({ quality: 82 })
      .toBuffer();

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

