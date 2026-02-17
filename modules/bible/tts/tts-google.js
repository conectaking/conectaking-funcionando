/**
 * Geração de áudio com Google Cloud Text-to-Speech.
 * Usa GCP_SERVICE_ACCOUNT_JSON_BASE64 para autenticar (nunca expor no front).
 */

const logger = require('../../../utils/logger');

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

/**
 * Gera áudio MP3 para o texto usando Google Cloud TTS.
 * @param {object} opts - ref, text, bibleVersion, scope, voiceName, voiceType, locale, speakingRate, pitch
 * @returns {Promise<Buffer|null>} Buffer do MP3 ou null em caso de erro
 */
async function generateTts(opts) {
  const credentials = getCredentials();
  if (!credentials) {
    logger.warn('tts-google: GCP não configurado (GCP_SERVICE_ACCOUNT_JSON_BASE64)');
    return null;
  }

  let TextToSpeechClient;
  try {
    const tts = require('@google-cloud/text-to-speech');
    TextToSpeechClient = tts.v1?.TextToSpeechClient || tts.TextToSpeechClient;
  } catch (e) {
    logger.warn('tts-google: @google-cloud/text-to-speech não instalado. Rode: npm install @google-cloud/text-to-speech', e?.message);
    return null;
  }

  const client = new TextToSpeechClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: (credentials.private_key || '').replace(/\\n/g, '\n')
    }
  });

  const text = String(opts.text || '').trim();
  if (!text) return null;

  const locale = String(opts.locale || 'pt-BR');
  const voiceName = String(opts.voiceName || 'pt-BR-Standard-A');
  const speakingRate = Number(opts.speakingRate) || 1.0;
  const pitch = Number(opts.pitch) || 0.0;

  const request = {
    input: { text },
    voice: {
      languageCode: locale,
      name: voiceName
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: Math.max(0.25, Math.min(4.0, speakingRate)),
      pitch: Math.max(-20.0, Math.min(20.0, pitch))
    }
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    if (response?.audioContent) {
      return Buffer.from(response.audioContent, 'base64');
    }
    return null;
  } catch (err) {
    logger.error('tts-google synthesizeSpeech:', err?.message || err);
    throw err;
  }
}

module.exports = {
  getCredentials,
  generateTts
};
