const db = require('../../../db');
const logger = require('../../../utils/logger');

/**
 * Busca registro no cache por cache_key.
 * @param {string} cacheKey
 * @returns {Promise<{ r2_key: string, ... } | null>}
 */
async function findByCacheKey(cacheKey) {
  const client = await db.pool.connect();
  try {
    const r = await client.query(
      'SELECT id, cache_key, r2_key, bible_version, ref, scope, voice_name, voice_type, locale, content_length, created_at FROM bible_tts_cache WHERE cache_key = $1',
      [cacheKey]
    );
    return r.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Fallback: busca qualquer áudio em cache para o mesmo ref + versão + voz.
 * Usado quando o cache_key mudou (ex.: texto do versículo atualizado) mas já existe MP3 no R2 com outro hash.
 * @param {string} ref - ex: "jo 3:16"
 * @param {string} bibleVersion - ex: "NVI"
 * @param {string} voiceName - ex: "pt-BR-Standard-A"
 * @param {string} [voiceType] - ex: "Standard"
 * @returns {Promise<{ r2_key: string, ... } | null>}
 */
async function findByRefAndVoice(ref, bibleVersion, voiceName, voiceType = 'Standard') {
  const client = await db.pool.connect();
  try {
    const r = await client.query(
      `SELECT id, cache_key, r2_key, bible_version, ref, scope, voice_name, voice_type, locale, content_length, created_at
       FROM bible_tts_cache
       WHERE ref = $1 AND bible_version = $2 AND voice_name = $3 AND voice_type = $4
       ORDER BY created_at DESC LIMIT 1`,
      [ref, (bibleVersion || 'NVI').toUpperCase(), voiceName || 'pt-BR-Standard-A', voiceType || 'Standard']
    );
    return r.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Insere registro no cache (após gerar áudio e subir no R2).
 * @param {object} data
 * @param {string} data.cache_key
 * @param {string} data.r2_key
 * @param {string} data.bible_version
 * @param {string} data.ref
 * @param {string} data.scope
 * @param {string} data.voice_name
 * @param {string} data.voice_type
 * @param {string} data.locale
 * @param {number} [data.content_length]
 */
async function insert(data) {
  const client = await db.pool.connect();
  try {
    await client.query(
      `INSERT INTO bible_tts_cache (cache_key, r2_key, bible_version, ref, scope, voice_name, voice_type, locale, content_length)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (cache_key) DO NOTHING`,
      [
        data.cache_key,
        data.r2_key,
        data.bible_version,
        data.ref,
        data.scope || 'verse',
        data.voice_name,
        data.voice_type || 'Standard',
        data.locale || 'pt-BR',
        data.content_length != null ? data.content_length : null
      ]
    );
  } catch (err) {
    logger.error('bible tts.repository insert:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findByCacheKey,
  findByRefAndVoice,
  insert
};
