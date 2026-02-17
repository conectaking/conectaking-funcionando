/**
 * Gera chave de cache única para TTS da Bíblia.
 * Texto normalizado + JSON canônico → sha256.
 * Assim nunca pagamos TTS duas vezes pelo mesmo trecho.
 */

const crypto = require('crypto');

/**
 * Normaliza texto para o cache (trim, espaços, quebras, unicode NFKC).
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  if (text == null || typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\r\n|\r|\n/g, '\n')
    .normalize('NFKC');
}

/**
 * Monta o objeto de entrada do cache em ordem fixa de chaves (canônico).
 * @param {object} opts
 * @param {string} opts.voiceName - nome da voz (ex: pt-BR-Standard-A)
 * @param {string} opts.voiceType - Standard | WaveNet | Neural2
 * @param {string} opts.locale - pt-BR
 * @param {string} opts.audioEncoding - MP3
 * @param {number} opts.speakingRate - 1.0
 * @param {number} opts.pitch - 0.0
 * @param {string} opts.bibleVersion - NVI, ARA, ARC...
 * @param {string} opts.scope - chapter | verse
 * @param {string} opts.ref - Jo 3 ou Jo 3:16
 * @param {string} opts.text - texto normalizado
 */
function buildCacheInput(opts) {
  const text = normalizeText(opts.text || '');
  return {
    app: 'conectaking-tts-v1',
    provider: 'google',
    voice_name: String(opts.voiceName || 'pt-BR-Wavenet-A'),
    voice_type: String(opts.voiceType || 'WaveNet'),
    locale: String(opts.locale || 'pt-BR'),
    audio_encoding: String(opts.audioEncoding || 'MP3'),
    speaking_rate: Number(opts.speakingRate) || 1.0,
    pitch: Number(opts.pitch) || 0.0,
    bible_version: String(opts.bibleVersion || 'NVI').toUpperCase(),
    scope: String(opts.scope || 'verse').toLowerCase(),
    ref: String(opts.ref || '').trim(),
    text
  };
}

/**
 * JSON canônico: chaves em ordem alfabética para sempre o mesmo hash.
 * @param {object} obj
 * @returns {string}
 */
function canonicalJson(obj) {
  const keys = Object.keys(obj).sort();
  const out = {};
  keys.forEach(k => { out[k] = obj[k]; });
  return JSON.stringify(out);
}

/**
 * Gera a chave de cache (sha256 em hex).
 * @param {object} opts - mesmo formato de buildCacheInput
 * @returns {{ cacheKey: string, cacheInput: object }}
 */
function getTtsCacheKey(opts) {
  const cacheInput = buildCacheInput(opts);
  const json = canonicalJson(cacheInput);
  const cacheKey = crypto.createHash('sha256').update(json, 'utf8').digest('hex');
  return { cacheKey, cacheInput };
}

/**
 * Monta o caminho no R2 (determinístico).
 * bible-tts/{bible_version}/{locale}/google/{voice_name}/{voice_type}/{scope}/{book}/{chapter}/{cache_key}.mp3
 * Para "Jo 3:16" → book=jo, chapter=3; para "Jo 3" (capítulo) → book=jo, chapter=3.
 */
function getR2Path(opts) {
  const { cacheKey } = getTtsCacheKey(opts);
  const version = String(opts.bibleVersion || 'NVI').toUpperCase();
  const locale = String(opts.locale || 'pt-BR');
  const voiceName = String(opts.voiceName || 'pt-BR-Wavenet-A').replace(/[^a-zA-Z0-9_-]/g, '_');
  const voiceType = String(opts.voiceType || 'WaveNet');
  const scope = String(opts.scope || 'verse');
  const ref = String(opts.ref || '').trim();
  const parts = ref.split(/\s+/);
  const book = (parts[0] || 'gn').toLowerCase().replace(/[^a-z0-9]/g, '');
  const chVerse = (parts[1] || '1').split(':');
  const chapter = chVerse[0] || '1';
  return `bible-tts/${version}/${locale}/google/${voiceName}/${voiceType}/${scope}/${book}/${chapter}/${cacheKey}.mp3`;
}

module.exports = {
  normalizeText,
  buildCacheInput,
  canonicalJson,
  getTtsCacheKey,
  getR2Path
};
