/**
 * Geração de áudio com Google Cloud Text-to-Speech.
 * Usa GCP_SERVICE_ACCOUNT_JSON_BASE64 para autenticar (nunca expor no front).
 * Se GCP_TTS_USE_REST=1, usa a API REST em vez de gRPC (evita erro de SSL handshake em alguns hosts, ex.: Render).
 */

const crypto = require('crypto');
const https = require('https');
const logger = require('../../../utils/logger');
const axios = require('axios');

/** Agente HTTPS que força TLS 1.2+ (evita handshake failure com Google em alguns hosts, ex.: Render). */
const httpsAgent = new https.Agent({ minVersion: 'TLSv1.2' });
const axiosConfig = { httpsAgent, timeout: 30000 };

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
  try {
    const res = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }).toString(),
      {
        ...axiosConfig,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    if (!res.data || !res.data.access_token) throw new Error('OAuth2 token failed: no access_token');
    return res.data.access_token;
  } catch (err) {
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

/** Sintetiza áudio via API REST do Google TTS (evita gRPC/SSL em ambientes problemáticos). */
async function synthesizeViaRest(credentials, request) {
  const token = await getAccessToken(credentials);
  try {
    const res = await axios.post(
      'https://texttospeech.googleapis.com/v1/text:synthesize',
      request,
      {
        ...axiosConfig,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      }
    );
    if (res.data && res.data.audioContent) return Buffer.from(res.data.audioContent, 'base64');
    return null;
  } catch (err) {
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
