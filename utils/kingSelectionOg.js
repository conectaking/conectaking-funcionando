const config = require('../config');
const { r2PublicUrl } = require('./r2');

function getCfAccountHashForOg() {
  const h =
    (config.cloudflare && String(config.cloudflare.accountHash || '').trim()) ||
    String(process.env.CF_IMAGES_ACCOUNT_HASH || '').trim() ||
    String(process.env.CLOUDFLARE_ACCOUNT_HASH || '').trim();
  return h || null;
}

function kingPhotoFilePathToPublicUrl(filePath) {
  const fp = String(filePath || '').trim();
  if (!fp) return null;
  const low = fp.toLowerCase();
  if (low.startsWith('cfimage:')) {
    const id = fp.slice('cfimage:'.length).trim();
    const hash = getCfAccountHashForOg();
    if (!id || !hash) return null;
    return `https://imagedelivery.net/${hash}/${id}/public`;
  }
  if (low.startsWith('r2:')) {
    const key = fp.slice(3).trim().replace(/^\/+/, '');
    return r2PublicUrl(key);
  }
  if (low.startsWith('http://') || low.startsWith('https://')) return fp;
  const galleriesPath = fp.replace(/^\/+/, '');
  if (galleriesPath.startsWith('galleries/')) return r2PublicUrl(galleriesPath);
  const m = fp.match(/galleries\/[^\s"']+/i);
  if (m) return r2PublicUrl(m[0]);
  return null;
}

function ensureHttpsUrl(u) {
  if (!u) return u;
  return String(u).replace(/^http:\/\//i, 'https://');
}

function pickPhotoStoragePathForOg(photoRow) {
  if (!photoRow) return null;
  const edited = String(photoRow.edited_file_path || '').trim();
  const raw = String(photoRow.file_path || '').trim();
  if (edited) return edited;
  return raw || null;
}

/**
 * Dados para Open Graph (capa da galeria, título).
 * Alinhado com a ordem em `ksFetchGalleryLinkCoverBuffer` (kingSelection.routes): capa externa, foto
 * escolhida, versão editada da foto, depois is_cover / primeira foto.
 * @param {import('pg').Pool} pool
 * @param {string} slug
 */
async function fetchKingSelectionOgData(pool, slug) {
  if (!pool) return null;
  const client = await pool.connect();
  try {
    let gRes = null;
    try {
      gRes = await client.query(
        `SELECT id, nome_projeto, slug, gallery_link_cover_file_path, gallery_link_cover_photo_id
         FROM king_galleries WHERE lower(trim(slug)) = lower(trim($1)) LIMIT 1`,
        [String(slug).trim()]
      );
    } catch (e) {
      if (e.code !== '42703') throw e;
      gRes = await client.query(
        'SELECT id, nome_projeto, slug FROM king_galleries WHERE lower(trim(slug)) = lower(trim($1)) LIMIT 1',
        [String(slug).trim()]
      );
    }
    if (!gRes.rows.length) return null;
    const g = gRes.rows[0];

    let accessMode = 'private';
    let allowSelfSignup = false;
    try {
      const amRes = await client.query(
        `SELECT access_mode, COALESCE(allow_self_signup, false) AS allow_self_signup FROM king_galleries WHERE id = $1 LIMIT 1`,
        [g.id]
      );
      const row = amRes.rows[0];
      if (row) {
        accessMode = String(row.access_mode || 'private').toLowerCase().trim();
        allowSelfSignup = !!row.allow_self_signup;
      }
    } catch (e) {
      if (e.code !== '42703') throw e;
      try {
        const amRes = await client.query(
          `SELECT access_mode FROM king_galleries WHERE id = $1 LIMIT 1`,
          [g.id]
        );
        if (amRes.rows[0]) {
          accessMode = String(amRes.rows[0].access_mode || 'private').toLowerCase().trim();
        }
      } catch (e2) {
        if (e2.code !== '42703') throw e2;
      }
    }

    let storagePath = null;
    let versionId = null;

    const customLink = String(g.gallery_link_cover_file_path || '').trim();
    if (customLink) {
      storagePath = customLink;
    } else {
      const coverPid = parseInt(g.gallery_link_cover_photo_id, 10) || 0;
      if (coverPid > 0) {
        let pById = null;
        try {
          pById = await client.query(
            `SELECT id, file_path, edited_file_path FROM king_photos WHERE gallery_id=$1 AND id=$2 LIMIT 1`,
            [g.id, coverPid]
          );
        } catch (e) {
          if (e.code !== '42703') throw e;
          pById = await client.query(
            `SELECT id, file_path FROM king_photos WHERE gallery_id=$1 AND id=$2 LIMIT 1`,
            [g.id, coverPid]
          );
        }
        const row = pById.rows?.[0];
        storagePath = pickPhotoStoragePathForOg(row);
        if (row && row.id) versionId = row.id;
      }
    }

    if (!storagePath) {
      let pRow = null;
      const qCover = `
        SELECT id, file_path, edited_file_path FROM king_photos
        WHERE gallery_id = $1
          AND (
            (file_path IS NOT NULL AND trim(file_path) <> '')
            OR (edited_file_path IS NOT NULL AND trim(edited_file_path) <> '')
          )
        ORDER BY is_cover DESC NULLS LAST, "order" ASC, id ASC
        LIMIT 1`;
      try {
        const pRes = await client.query(qCover, [g.id]);
        pRow = pRes.rows[0] || null;
      } catch (e) {
        if (e.code !== '42703') throw e;
        const pRes = await client.query(
          `SELECT id, file_path FROM king_photos
           WHERE gallery_id = $1 AND file_path IS NOT NULL AND trim(file_path) <> ''
           ORDER BY "order" ASC, id ASC
           LIMIT 1`,
          [g.id]
        );
        pRow = pRes.rows[0] || null;
      }
      storagePath = pickPhotoStoragePathForOg(pRow) || (pRow ? String(pRow.file_path || '').trim() : null);
      if (pRow && pRow.id) versionId = pRow.id;
    }

    let imageUrl = storagePath ? kingPhotoFilePathToPublicUrl(storagePath) : null;
    if (imageUrl && versionId) {
      const sep = imageUrl.includes('?') ? '&' : '?';
      imageUrl = `${imageUrl}${sep}v=${encodeURIComponent(String(versionId))}`;
    }
    imageUrl = ensureHttpsUrl(imageUrl);
    return {
      title: String(g.nome_projeto || g.slug || 'Galeria').trim() || 'Galeria',
      slug: g.slug,
      imageUrl,
      access_mode: accessMode,
      allow_self_signup: allowSelfSignup
    };
  } finally {
    client.release();
  }
}

/**
 * Texto OG/twitter alinhado ao modo de acesso (evita «nome, e-mail e WhatsApp» em galerias privadas).
 * @param {string} title
 * @param {string} [accessMode]
 * @param {boolean} [allowSelfSignup]
 */
function buildKingSelectionOgDescription(title, accessMode, allowSelfSignup) {
  const t = String(title || 'Galeria').trim() || 'Galeria';
  const m = String(accessMode || 'private').toLowerCase().trim();
  if (m === 'paid_event_photos') {
    return `Galeria ${t}. Aceda pelo link com o mesmo nome, e-mail e WhatsApp do cadastro e baixe as suas fotos.`;
  }
  if (m === 'public') {
    return `Galeria ${t}. Aceda pelo link partilhado pelo fotógrafo para ver e selecionar as suas fotografias.`;
  }
  if (m === 'password' || m === 'signup') {
    return allowSelfSignup
      ? `Galeria ${t}. Crie o seu acesso com e-mail e senha para ver e selecionar as suas fotografias.`
      : `Galeria ${t}. Aceda com e-mail e senha para ver e selecionar as suas fotografias.`;
  }
  return `Galeria ${t}. Aceda com o e-mail e senha fornecidos pelo fotógrafo para ver e selecionar as suas fotografias.`;
}

function defaultOgImageUrl() {
  return ensureHttpsUrl(process.env.FAVICON_URL || 'https://i.ibb.co/60sW9k75/logo.png');
}

/**
 * Imagem OG servida pela própria API (JPEG 1200×630, capa do projeto).
 * WhatsApp/Facebook conseguem ir buscar ao Render mesmo quando R2/imagedelivery falham no crawler.
 */
function ogImageUrlForGallerySlug(slug) {
  const s = String(slug || '').trim();
  if (!s) return null;
  const base = String(process.env.API_URL || config.urls?.api || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}/api/king-selection/public/og-image?slug=${encodeURIComponent(s)}`;
}

function normalizeShareHost(h) {
  if (!h) return '';
  const s = String(h).trim().replace(/^https?:\/\//i, '');
  return s.split('/')[0].split(':')[0] || '';
}

/** Não apontar og:image para king-selection-og-image.php no host da API (não existe PHP no Render). */
function shouldUseOgImageProxy(hostnameForCanonical) {
  const h = normalizeShareHost(hostnameForCanonical);
  if (!h) return false;
  const apiRaw = String(process.env.API_URL || config.urls?.api || '').trim();
  const apiHost = normalizeShareHost(apiRaw.replace(/\/$/, ''));
  if (apiHost && h.toLowerCase() === apiHost.toLowerCase()) return false;
  return true;
}

/**
 * Imagem OG no mesmo host da página (ex.: Hostinger). O WhatsApp/Facebook costumam
 * não exibir prévia quando og:image fica só no domínio da API (Render).
 */
function ogImageProxyUrlForHost(host, slug) {
  const h = normalizeShareHost(host);
  const s = String(slug || '').trim();
  if (!h || !s) return null;
  // kingSelectionGallery.php lê `ks_slug` (igual ao rewrite Apache); `slug` sozinho devolve 400 e o ZAP fica sem capa.
  return `https://${h}/kingSelectionGallery.php?ks_og=1&ks_slug=${encodeURIComponent(s)}`;
}

function buildShareMetaPayload(ogRow, hostnameForCanonical, slugRequested) {
  const defaultImg = defaultOgImageUrl();
  const host = normalizeShareHost(hostnameForCanonical);
  const slugForPath = (ogRow && ogRow.slug) || String(slugRequested || '').trim() || '';
  const path = slugForPath ? `/kingSelection/${encodeURIComponent(slugForPath)}` : '/kingSelection';
  const canonical = host ? `https://${host}${path}` : '';
  if (!ogRow) {
    return {
      success: true,
      ogTitle: 'King Selection — Galeria',
      ogDescription: 'Aceda à sua galeria King Selection e selecione as suas fotografias.',
      ogImage: defaultImg,
      slug: slugForPath || null,
      canonicalUrl: canonical
    };
  }
  const ogFromApi = ogImageUrlForGallerySlug(ogRow.slug);
  const sameHostOg = shouldUseOgImageProxy(host) ? ogImageProxyUrlForHost(host, ogRow.slug) : null;
  return {
    success: true,
    ogTitle: `${ogRow.title} — King Selection`,
    ogDescription: buildKingSelectionOgDescription(
      ogRow.title,
      ogRow.access_mode,
      ogRow.allow_self_signup
    ),
    ogImage: sameHostOg || ogFromApi || ensureHttpsUrl(ogRow.imageUrl) || defaultImg,
    slug: ogRow.slug,
    canonicalUrl: canonical
  };
}

module.exports = {
  fetchKingSelectionOgData,
  kingPhotoFilePathToPublicUrl,
  ensureHttpsUrl,
  defaultOgImageUrl,
  ogImageUrlForGallerySlug,
  ogImageProxyUrlForHost,
  buildShareMetaPayload,
  buildKingSelectionOgDescription
};
