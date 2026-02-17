/**
 * Geração de áudio com Google Cloud Text-to-Speech.
 * Usa GCP_SERVICE_ACCOUNT_JSON_BASE64 para autenticar (nunca expor no front).
 * Se GCP_TTS_USE_REST=1, usa a API REST em vez de gRPC (evita erro de SSL handshake em alguns hosts, ex.: Render).
 */

const crypto = require('crypto');
const https = require('https');
const logger = require('../../../utils/logger');
const axios = require('axios');

/** Timeout para chamadas ao Google. Sem agente customizado por padrão; em EPROTO usamos agent com keepAlive:false. */
const axiosConfig = { timeout: 30000 };

/** No Render, axios e às vezes https.request falham com EPROTO; tentar fetch (Node 18+) primeiro. */
const USE_NATIVE_HTTPS_ON_RENDER = process.env.RENDER === 'true';
const HAS_FETCH = typeof globalThis.fetch === 'function';

/** POST com fetch nativo (Node 18+). Pode negociar TLS diferente e evitar EPROTO no Render. */
async function fetchPost(url, body, headers, isJson = true) {
  const opts = {
    method: 'POST',
    headers: { ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  };
  if (isJson) opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
  const res = await globalThis.fetch(url, opts);
  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${raw}`);
  return isJson ? JSON.parse(raw) : raw;
}

/** Obtém token com fetch nativo (Node 18+). */
async function getAccessTokenFetch(credentials) {
  const jwt = createSignedJwt(credentials);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  }).toString();
  const raw = await fetchPost('https://oauth2.googleapis.com/token', body, {
    'Content-Type': 'application/x-www-form-urlencoded'
  }, false);
  const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch (e) { return null; } })() : raw;
  if (!parsed || !parsed.access_token) throw new Error('OAuth2 token failed: no access_token');
  return parsed.access_token;
}

/** Sintetiza com fetch nativo (Node 18+). */
async function synthesizeViaRestFetch(credentials, request) {
  const token = await getAccessTokenFetch(credentials);
  const data = await fetchPost(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    request,
    { 'Authorization': 'Bearer ' + token },
    true
  );
  if (data && data.audioContent) return Buffer.from(data.audioContent, 'base64');
  return null;
}

/** POST JSON ou form com https nativo (sem axios). Útil quando o handshake TLS falha com axios. */
function httpsPost(hostname, path, body, headers, isJson = true) {
  const bodyBuf = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8');
  const h = {
    'Content-Length': bodyBuf.length,
    ...headers
  };
  if (isJson) h['Content-Type'] = 'application/json';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      port: 443,
      path,
      method: 'POST',
      headers: h,
      timeout: 30000
      // sem agent: usa padrão do Node (pode negociar TLS diferente do axios)
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} ${raw}`));
          return;
        }
        try {
          resolve(isJson ? JSON.parse(raw) : raw);
        } catch (e) {
          reject(new Error('Invalid JSON: ' + raw.substring(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(bodyBuf);
    req.end();
  });
}

function isSslHandshakeError(err) {
  return err && (err.code === 'EPROTO' || /handshake|ssl3_read_bytes|SSL alert/i.test(String(err.message || '')));
}

/**
 * Obtém credenciais a partir do JSON em base64 (variável de ambiente).
 * @returns {object | null} Objeto de credenciais ou null se não configurado
 */
function getCredentials() {
  const base64 = (process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64 || '').trim();
  if (!base64) return null;
  try {
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    logger.warn('tts-google: GCP_SERVICE_ACCOUNT_JSON_BASE64 inválido', e?.message);
    return null;
  }
}

// No Render (e em outros hosts com TLS restrito), gRPC falha com EPROTO/handshake; usar sempre REST.
const rawRest = String(process.env.GCP_TTS_USE_REST || '').trim();
const explicitOff = /^0|false|no$/i.test(rawRest);
const USE_REST = /^1|true|yes$/i.test(rawRest)
  || (process.env.RENDER === 'true' && !explicitOff)
  || (process.env.NODE_ENV === 'production' && !explicitOff);
if (process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' || rawRest !== '') {
  logger.info('tts-google: GCP_TTS_USE_REST=%s RENDER=%s NODE_ENV=%s → %s', rawRest || '(empty)', process.env.RENDER || '', process.env.NODE_ENV || '', USE_REST ? 'REST' : 'gRPC');
}

/** Gera JWT assinado para troca por access token (Google OAuth2). */
function createSignedJwt(credentials) {
  const key = (credentials.private_key || '').replace(/\\n/g, '\n');
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signatureInput = b64(header) + '.' + b64(payload);
  const sign = crypto.createSign('RSA-SHA256').update(signatureInput).end();
  const signature = sign.sign(key, 'base64url');
  return signatureInput + '.' + signature;
}

/** Obtém token usando apenas https nativo (sem axios). Para contornar EPROTO no Render. */
async function getAccessTokenNative(credentials) {
  const jwt = createSignedJwt(credentials);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  }).toString();
  const raw = await httpsPost('oauth2.googleapis.com', '/token', body, {
    'Content-Type': 'application/x-www-form-urlencoded'
  }, false);
  const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch (e) { return null; } })() : raw;
  if (!parsed || !parsed.access_token) throw new Error('OAuth2 token failed: no access_token');
  return parsed.access_token;
}

/** Obtém access token (JWT bearer). Em EPROTO, tenta de novo com conexão nova (keepAlive:false). */
async function getAccessToken(credentials) {
  const jwt = createSignedJwt(credentials);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  }).toString();
  const tryOnce = (config) => axios.post('https://oauth2.googleapis.com/token', body, {
    ...axiosConfig,
    ...config,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  try {
    let res = await tryOnce({});
    if (!res.data || !res.data.access_token) throw new Error('OAuth2 token failed: no access_token');
    return res.data.access_token;
  } catch (err) {
    if (isSslHandshakeError(err)) {
      logger.warn('tts-google: EPROTO no token, retry com conexão nova (keepAlive:false)');
      try {
        const retryRes = await tryOnce({ httpsAgent: new https.Agent({ keepAlive: false }) });
        if (retryRes && retryRes.data && retryRes.data.access_token) return retryRes.data.access_token;
      } catch (retryErr) {
        logger.error('tts-google: retry token falhou:', retryErr?.message || retryErr);
        throw retryErr;
      }
    }
    const status = err.response?.status;
    const isSsl = err.code === 'EPROTO' || /handshake|SSL|ECONNREFUSED|ETIMEDOUT/i.test(String(err.message || ''));
    const text = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : err.message;
    if (isSsl) {
      logger.warn('tts-google: falha de conexão TLS/rede com o Google (não é credencial). Erro:', err.message || text);
      throw new Error('Conexão com o Google falhou (TLS/rede). Não é problema de credencial. Tente rodar o servidor localmente para testar.');
    }
    if (status === 401 || status === 403 || /invalid_grant|invalid_credentials|unauthorized/i.test(String(text))) {
      logger.warn('tts-google: credenciais GCP rejeitadas:', text);
      throw new Error('Credenciais GCP inválidas ou expiradas. Verifique GCP_SERVICE_ACCOUNT_JSON_BASE64 e a API Text-to-Speech ativada.');
    }
    throw new Error('OAuth2 token failed: ' + (status || '') + ' ' + text);
  }
}

/** Indica se o erro da API Google é por voz indisponível (ex.: Wavenet não habilitada no projeto). */
function isVoiceUnavailableError(err) {
  const status = err.response?.status;
  const body = err.response?.data;
  const msg = typeof body === 'string' ? body : (body && JSON.stringify(body)) || err.message || '';
  const s = String(msg).toLowerCase();
  return (status === 400 || status === 404 || status === 403) && /voice|invalid|not found|not available|unsupported|not enabled/i.test(s)
    || /INVALID_ARGUMENT|voice.*invalid|invalid.*voice/i.test(s);
}

/** Sintetiza via REST usando apenas https nativo (sem axios). Para contornar EPROTO no Render. */
async function synthesizeViaRestNative(credentials, request) {
  const token = await getAccessTokenNative(credentials);
  const data = await httpsPost(
    'texttospeech.googleapis.com',
    '/v1/text:synthesize',
    request,
    { 'Authorization': 'Bearer ' + token },
    true
  );
  if (data && data.audioContent) return Buffer.from(data.audioContent, 'base64');
  return null;
}

/** Sintetiza áudio via API REST. Em EPROTO, retry com conexão nova (keepAlive:false). */
async function synthesizeViaRest(credentials, request) {
  const token = await getAccessToken(credentials);
  const doPost = (extraConfig) => axios.post(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    request,
    {
      ...axiosConfig,
      ...extraConfig,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    }
  );
  try {
    const res = await doPost({});
    if (res.data && res.data.audioContent) return Buffer.from(res.data.audioContent, 'base64');
    return null;
  } catch (err) {
    if (isSslHandshakeError(err)) {
      logger.warn('tts-google: EPROTO no synthesize, retry com conexão nova (keepAlive:false)');
      try {
        const retryRes = await doPost({ httpsAgent: new https.Agent({ keepAlive: false }) });
        if (retryRes && retryRes.data && retryRes.data.audioContent) return Buffer.from(retryRes.data.audioContent, 'base64');
      } catch (retryErr) {
        const t = retryErr.response?.data ? (typeof retryErr.response.data === 'string' ? retryErr.response.data : JSON.stringify(retryErr.response.data)) : retryErr.message;
        throw new Error('TTS REST failed (retry): ' + (retryErr.response?.status || '') + ' ' + t);
      }
    }
    const status = err.response?.status;
    const text = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : err.message;
    throw new Error('TTS REST failed: ' + (status || '') + ' ' + text);
  }
}

/**
 * Gera áudio MP3 para o texto usando Google Cloud TTS (gRPC ou REST).
 * @param {object} opts - ref, text, bibleVersion, scope, voiceName, voiceType, locale, speakingRate, pitch
 * @returns {Promise<Buffer|null>} Buffer do MP3 ou null em caso de erro
 */
async function generateTts(opts) {
  const credentials = getCredentials();
  if (!credentials) {
    logger.warn('tts-google: GCP não configurado (GCP_SERVICE_ACCOUNT_JSON_BASE64)');
    return null;
  }

  const text = String(opts.text || '').trim();
  if (!text) return null;

  const locale = String(opts.locale || 'pt-BR');
  const voiceName = String(opts.voiceName || 'pt-BR-Wavenet-A');
  const speakingRate = Number(opts.speakingRate) || 1.0;
  const pitch = Number(opts.pitch) || 0.0;

  const request = {
    input: { text },
    voice: { languageCode: locale, name: voiceName },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: Math.max(0.25, Math.min(4.0, speakingRate)),
      pitch: Math.max(-20.0, Math.min(20.0, pitch))
    }
  };

  if (USE_REST) {
    if (USE_NATIVE_HTTPS_ON_RENDER) {
      const tryOrder = HAS_FETCH ? ['fetch', 'https', 'axios'] : ['https', 'axios'];
      logger.info('tts-google: Render → tentando ordem: %s', tryOrder.join(', '));
      for (const client of tryOrder) {
        try {
          let buf = null;
          if (client === 'fetch') buf = await synthesizeViaRestFetch(credentials, request);
          else if (client === 'https') buf = await synthesizeViaRestNative(credentials, request);
          else buf = await synthesizeViaRest(credentials, request);
          if (buf && buf.length) {
            logger.info('tts-google: sucesso com cliente %s', client);
            return buf;
          }
        } catch (err) {
          logger.warn('tts-google: cliente %s falhou (%s), próximo: %s', client, err?.message || err?.code || err, err?.code === 'EPROTO' ? 'tentando próximo' : '');
          if (client === tryOrder[tryOrder.length - 1]) {
            if (isVoiceUnavailableError(err) && voiceName !== 'pt-BR-Standard-A') {
              logger.warn('tts-google: voz %s indisponível, tentando pt-BR-Standard-A', voiceName);
              return await generateTts({ ...opts, voiceName: 'pt-BR-Standard-A' });
            }
            throw err;
          }
        }
      }
    }
    try {
      return await synthesizeViaRest(credentials, request);
    } catch (err) {
      if (isVoiceUnavailableError(err) && voiceName !== 'pt-BR-Standard-A') {
        logger.warn('tts-google: voz %s indisponível no projeto GCP, tentando pt-BR-Standard-A', voiceName);
        return await generateTts({ ...opts, voiceName: 'pt-BR-Standard-A' });
      }
      logger.error('tts-google synthesizeSpeech (REST):', err?.message || err);
      throw err;
    }
  }

  let TextToSpeechClient;
  try {
    const tts = require('@google-cloud/text-to-speech');
    TextToSpeechClient = tts.v1?.TextToSpeechClient || tts.TextToSpeechClient;
  } catch (e) {
    logger.warn('tts-google: @google-cloud/text-to-speech não instalado.', e?.message);
    return null;
  }

  const client = new TextToSpeechClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: (credentials.private_key || '').replace(/\\n/g, '\n')
    }
  });

  try {
    const [response] = await client.synthesizeSpeech(request);
    if (response?.audioContent) return Buffer.from(response.audioContent, 'base64');
    return null;
  } catch (err) {
    const isSsl = (err?.code === 'EPROTO' || /handshake|SSL|TLS/i.test(String(err?.message || '')));
    if (isSsl) {
      logger.warn('tts-google: falha SSL com gRPC, tentando via REST...');
      try {
        return await synthesizeViaRest(credentials, request);
      } catch (restErr) {
        if (isVoiceUnavailableError(restErr) && voiceName !== 'pt-BR-Standard-A') {
          logger.warn('tts-google: voz %s indisponível no projeto GCP, tentando pt-BR-Standard-A', voiceName);
          return await generateTts({ ...opts, voiceName: 'pt-BR-Standard-A' });
        }
        logger.error('tts-google synthesizeSpeech (REST fallback):', restErr?.message || restErr);
        throw restErr;
      }
    }
    if (isVoiceUnavailableError(err) && voiceName !== 'pt-BR-Standard-A') {
      logger.warn('tts-google: voz %s indisponível no projeto GCP, tentando pt-BR-Standard-A', voiceName);
      return await generateTts({ ...opts, voiceName: 'pt-BR-Standard-A' });
    }
    logger.error('tts-google synthesizeSpeech:', err?.message || err);
    throw err;
  }
}

module.exports = {
  getCredentials,
  generateTts
};
