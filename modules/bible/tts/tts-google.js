/**
 * Geração de áudio com Google Cloud Text-to-Speech.
 * Credenciais via GCP_SERVICE_ACCOUNT_JSON_BASE64 (nunca no front).
 */

const logger = require('../../../utils/logger');

let _client = null;

function getTtsClient() {
  if (_client) return _client;
  const base64 = (process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64 || '').trim();
  if (!base64) {
    throw new Error('GCP_SERVICE_ACCOUNT_JSON_BASE64 não configurado');
  }
  let credentials;
  try {
    const json = Buffer.from(base64, 'base64').toString('utf8');
    credentials = JSON.parse(json);
  } catch (e) {
    logger.error('tts-google: falha ao decodificar/parsear GCP_SERVICE_ACCOUNT_JSON_BASE64', e);
    throw new Error('Credenciais GCP inválidas (base64/JSON)');
  }
  const { TextToSpeechClient } = require('@google-cloud/text-to-speech').v1;
  _client = new TextToSpeechClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: (credentials.private_key || '').replace(/\\n/g, '\n')
    }
  });
  return _client;
}

/**
 * Gera MP3 para um texto usando Google Cloud TTS.
 * @param {object} opts - voiceName, voiceType, locale, text, speakingRate, pitch
 * @returns {Promise<Buffer>} - conteúdo do MP3
 */
async function generateTts(opts) {
  const text = (opts.text || '').trim();
  if (!text) throw new Error('Texto vazio para TTS');

  const client = getTtsClient();
  const voiceName = String(opts.voiceName || 'pt-BR-Standard-A');
  const locale = String(opts.locale || 'pt-BR');
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
      speakingRate,
      pitch
    }
  };

  const [response] = await client.synthesizeSpeech(request);
  if (!response.audioContent || !(response.audioContent instanceof Uint8Array)) {
    throw new Error('Resposta do TTS sem áudio');
  }
  return Buffer.from(response.audioContent);
}

module.exports = {
  getTtsClient,
  generateTts
};
