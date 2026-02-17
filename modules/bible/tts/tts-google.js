/**
 * Geração de áudio com Google Cloud Text-to-Speech.
 * Usa GCP_SERVICE_ACCOUNT_JSON_BASE64 para autenticar (nunca expor no front).
 * Se GCP_TTS_USE_REST=1, usa a API REST em vez de gRPC (evita erro de SSL handshake em alguns hosts, ex.: Render).
 */

const crypto = require('crypto');
const https = require('https');
const logger = require('../../../utils/logger');
const fetch = require('node-fetch');

/** Agente HTTPS que força TLS 1.2+ (evita handshake failure com Google em alguns hosts, ex.: Render). */
const httpsAgent = new https.Agent({ minVersion: 'TLSv1.2' });

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

const USE_REST = /^1|true|yes$/i.test(String(process.env.GCP_TTS_USE_REST || '').trim());
if (process.env.GCP_TTS_USE_REST !== undefined) {
  logger.info('tts-google: GCP_TTS_USE_REST=%s → using %s', String(process.env.GCP_TTS_USE_REST).trim() || '(empty)', USE_REST ? 'REST' : 'gRPC');
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

/** Obtém access token usando credenciais de service account (JWT bearer grant). */
async function getAccessToken(credentials) {
  const jwt = createSignedJwt(credentials);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    agent: httpsAgent,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString()
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('OAuth2 token failed: ' + res.status + ' ' + text);
  }
  const data = await res.json();
  return data.access_token;
}

/** Sintetiza áudio via API REST do Google TTS (evita gRPC/SSL em ambientes problemáticos). */
async function synthesizeViaRest(credentials, request) {
  const token = await getAccessToken(credentials);
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    agent: httpsAgent,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('TTS REST failed: ' + res.status + ' ' + text);
  }
  const data = await res.json();
  if (data.audioContent) return Buffer.from(data.audioContent, 'base64');
  return null;
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
  const voiceName = String(opts.voiceName || 'pt-BR-Standard-A');
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
    try {
      return await synthesizeViaRest(credentials, request);
    } catch (err) {
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
        logger.error('tts-google synthesizeSpeech (REST fallback):', restErr?.message || restErr);
        throw restErr;
      }
    }
    logger.error('tts-google synthesizeSpeech:', err?.message || err);
    throw err;
  }
}

module.exports = {
  getCredentials,
  generateTts
};
