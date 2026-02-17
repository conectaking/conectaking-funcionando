/**
 * Serviço TTS da Bíblia: cache em R2 + (futuro) Google Cloud TTS.
 * - Primeiro consulta bible_tts_cache e R2; se existir, devolve URL.
 * - Se não existir, quando GCP estiver configurado, gera com Google TTS, sobe no R2 e grava no cache.
 */

const { getTtsCacheKey, getR2Path, normalizeText } = require('./tts-cache-key');
const ttsRepo = require('./tts.repository');
const r2 = require('../../../utils/r2');
const logger = require('../../../utils/logger');

/**
 * Opções para buscar ou gerar áudio.
 * @param {string} ref - Ex: "Jo 3:16" ou "Jo 3"
 * @param {string} text - Texto do trecho (normalizado internamente)
 * @param {string} bibleVersion - NVI, ARA, ARC...
 * @param {string} scope - verse | chapter
 * @param {string} voiceName - pt-BR-Standard-A
 * @param {string} voiceType - Standard | WaveNet | Neural2
 * @param {string} locale - pt-BR
 */
/**
 * Verifica se o áudio já existe no cache (DB + R2). Se existir, retorna a URL pública.
 * @param {object} opts - ref, text, bibleVersion, scope, voiceName, voiceType, locale
 * @returns {Promise<{ url: string } | { status: 'missing', cacheKey: string, r2Path: string }>}
 */
async function getCachedAudioUrl(opts) {
  const text = normalizeText(opts.text || '');
  const { cacheKey } = getTtsCacheKey({ ...opts, text });
  const r2Path = getR2Path({ ...opts, text });

  // Preferir busca por ref+voz: devolve qualquer áudio em cache para o trecho (evita 401 quando o cache_key mudou mas o MP3 no R2 é outro hash)
  let row = opts.ref
    ? await ttsRepo.findByRefAndVoice(
        opts.ref,
        opts.bibleVersion || 'NVI',
        opts.voiceName || 'pt-BR-Standard-A',
        opts.voiceType || 'Standard'
      )
    : null;
  if (!row) row = await ttsRepo.findByCacheKey(cacheKey);
  if (row && row.r2_key) {
    const url = r2.r2PublicUrl(row.r2_key);
    if (url) return { url };
    logger.warn('bible tts: cache hit mas R2_PUBLIC_BASE_URL não configurado');
  }

  return { status: 'missing', cacheKey, r2Path };
}

/**
 * Salva no cache (chamar após gerar o MP3 e fazer upload no R2).
 * @param {object} opts - mesmas opções de getCachedAudioUrl
 * @param {Buffer} mp3Buffer - conteúdo do MP3
 * @returns {Promise<{ url: string }>}
 */
async function saveToCacheAndR2(opts, mp3Buffer) {
  const text = normalizeText(opts.text || '');
  const { cacheKey } = getTtsCacheKey({ ...opts, text });
  const r2Path = getR2Path({ ...opts, text });

  await r2.r2PutObjectBufferTts({
    key: r2Path,
    body: mp3Buffer,
    contentType: 'audio/mpeg',
    cacheControl: 'public, max-age=31536000, immutable'
  });

  await ttsRepo.insert({
    cache_key: cacheKey,
    r2_key: r2Path,
    bible_version: opts.bibleVersion || 'NVI',
    ref: opts.ref || '',
    scope: opts.scope || 'verse',
    voice_name: opts.voiceName || 'pt-BR-Standard-A',
    voice_type: opts.voiceType || 'Standard',
    locale: opts.locale || 'pt-BR',
    content_length: mp3Buffer ? mp3Buffer.length : null
  });

  const url = r2.r2PublicUrl(r2Path);
  return { url: url || '' };
}

/**
 * Retorna URL do áudio se estiver em cache; senão retorna status 'missing' (e no futuro pode enfileirar geração).
 */
async function getOrCreateAudio(opts) {
  const cached = await getCachedAudioUrl(opts);
  if (cached.url) return { url: cached.url, fromCache: true };

  const gcpConfigured =
    process.env.GCP_PROJECT_ID &&
    process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64;

  if (gcpConfigured && opts.text) {
    try {
      const generate = require('./tts-google'); // será criado no próximo passo
      const mp3Buffer = await generate.generateTts(opts);
      if (mp3Buffer && mp3Buffer.length) {
        const { url } = await saveToCacheAndR2(opts, mp3Buffer);
        return { url, fromCache: false };
      }
    } catch (err) {
      logger.error('bible tts generate:', err);
      return { status: 'error', message: err.message || 'Falha ao gerar áudio' };
    }
  }

  return { status: 'missing', cacheKey: cached.cacheKey, r2Path: cached.r2Path };
}

module.exports = {
  getCachedAudioUrl,
  saveToCacheAndR2,
  getOrCreateAudio,
  getTtsCacheKey,
  getR2Path,
  normalizeText
};
