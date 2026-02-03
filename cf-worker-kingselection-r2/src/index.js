/**
 * Worker R2 - Leitura pública + Upload (KingSelection)
 * 
 * LEITURA: https://r2.conectaking.com.br/<objectKey>
 *   Ex: https://r2.conectaking.com.br/galleries/ADR7542.jpg
 * 
 * UPLOAD: POST /ks/upload (com token Bearer)
 */

function parseAllowedOrigins(env) {
  const raw = (env.ALLOWED_ORIGINS || '').toString();
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function corsHeadersFor(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = parseAllowedOrigins(env);
  const ok = allowed.includes(origin);
  const h = new Headers();
  if (ok) h.set('Access-Control-Allow-Origin', origin);
  h.set('Vary', 'Origin');
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  h.set('Access-Control-Max-Age', '3600');
  return h;
}

function b64UrlFromBytes(bytes) {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return b64;
}

function bytesFromB64Url(str) {
  const s = (str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256Base64Url(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64UrlFromBytes(new Uint8Array(sig));
}

async function verifyKsToken(token, secret) {
  const t = (token || '').toString().trim();
  const parts = t.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = await hmacSha256Base64Url(secret, `${h}.${p}`);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bytesFromB64Url(p)));
    const now = Math.floor(Date.now() / 1000);
    if (payload && payload.exp && now >= payload.exp) return null;
    return payload || null;
  } catch (_) {
    return null;
  }
}

async function signReceipt({ secret, galleryId, key }) {
  const header = { alg: 'HS256', typ: 'KS' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { typ: 'ks_receipt', galleryId, key, iat: now, exp: now + 15 * 60 };
  const h = b64UrlFromBytes(new TextEncoder().encode(JSON.stringify(header)));
  const p = b64UrlFromBytes(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSha256Base64Url(secret, `${h}.${p}`);
  return `${h}.${p}.${sig}`;
}

function extFromFilenameOrType(name, type) {
  const n = (name || '').toString().trim();
  const m = n.match(/\.([a-zA-Z0-9]{1,8})$/);
  if (m) return m[1].toLowerCase();
  const mt = (type || '').toString().toLowerCase();
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  return 'jpg';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeadersFor(request, env);
    const bucket = env.R2_BUCKET || env.KS_BUCKET;

    if (request.method === 'OPTIONS') {
      return new Response('', { status: 204, headers: cors });
    }

    // ========== LEITURA PÚBLICA (raiz) ==========
    // GET /galleries/ADR7542.jpg → objectKey = galleries/ADR7542.jpg
    if (request.method === 'GET' && !url.pathname.startsWith('/ks/')) {
      const objectKey = url.pathname.replace(/^\/+/, '');
      if (!objectKey) {
        return new Response('Arquivo não informado', { status: 400, headers: cors });
      }
      if (!bucket) {
        return new Response('Bucket não configurado', { status: 500, headers: cors });
      }
      try {
        const object = await bucket.get(objectKey);
        if (!object) {
          return new Response('Arquivo não encontrado', { status: 404, headers: cors });
        }
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        // Incluir CORS para imagens carregadas cross-origin (admin, cliente)
        cors.forEach((v, k) => headers.set(k, v));
        return new Response(object.body, { headers });
      } catch (e) {
        const msg = (e && e.message) ? String(e.message).slice(0, 200) : 'Falha ao ler do R2';
        return new Response(JSON.stringify({ success: false, message: msg }), { status: 502, headers: cors });
      }
    }

    // ========== UPLOAD (autenticado) ==========
    if (url.pathname === '/ks/upload' && request.method === 'POST') {
      const secret = (env.KS_WORKER_SECRET || '').toString().trim();
      if (!secret) return new Response(JSON.stringify({ success: false, message: 'Worker não configurado (KS_WORKER_SECRET).' }), { status: 501, headers: cors });

      const auth = request.headers.get('Authorization') || '';
      const m = auth.match(/^Bearer\s+(.+)$/i);
      const token = m ? m[1].trim() : '';
      const payload = await verifyKsToken(token, secret);
      if (!payload || payload.typ !== 'ks_upload') {
        return new Response(JSON.stringify({ success: false, message: 'Não autorizado (token inválido).' }), { status: 401, headers: cors });
      }

      const galleryId = parseInt(payload.galleryId || 0, 10);
      if (!galleryId) return new Response(JSON.stringify({ success: false, message: 'Token inválido (galleryId).' }), { status: 400, headers: cors });

      let form;
      try {
        form = await request.formData();
      } catch (_) {
        return new Response(JSON.stringify({ success: false, message: 'FormData inválido.' }), { status: 400, headers: cors });
      }
      const file = form.get('file');
      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ success: false, message: 'Arquivo é obrigatório (field: file).' }), { status: 400, headers: cors });
      }

      const ext = extFromFilenameOrType(file.name, file.type);
      const objectKey = `galleries/${galleryId}/${crypto.randomUUID()}.${ext}`;

      if (!bucket) return new Response(JSON.stringify({ success: false, message: 'Bucket R2 não configurado.' }), { status: 500, headers: cors });

      try {
        await bucket.put(objectKey, file.stream(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
          customMetadata: { originalName: file.name || 'foto' }
        });
      } catch (e) {
        const msg = (e && e.message) ? String(e.message).slice(0, 250) : 'Falha ao gravar no R2';
        return new Response(JSON.stringify({ success: false, message: `Falha ao gravar no R2: ${msg}` }), { status: 502, headers: cors });
      }

      const receipt = await signReceipt({ secret, galleryId, key: objectKey });
      return new Response(JSON.stringify({ success: true, key: objectKey, receipt }), { status: 200, headers: cors });
    }

    return new Response('Not found', { status: 404, headers: cors });
  }
};
