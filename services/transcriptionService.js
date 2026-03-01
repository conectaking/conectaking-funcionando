/**
 * KingBrief – Serviço de transcrição (OpenAI Whisper)
 * Envia áudio para Speech-to-Text e devolve texto em PT-BR.
 * OPENAI_API_KEY deve estar definida no ambiente (apenas backend).
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

/** Limite da API Whisper (OpenAI): 25 MB por ficheiro. Áudio de ~1 hora em MP3 costuma ultrapassar. */
const WHISPER_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Transcreve um buffer de áudio usando OpenAI Whisper
 * @param {Buffer} audioBuffer - Conteúdo do ficheiro de áudio
 * @param {string} [mimeType] - Ex.: audio/mpeg, audio/wav
 * @param {string} [filename] - Ex.: audio.mp3 (extensão usada pelo Whisper)
 * @returns {Promise<string>} Texto transcrito em português
 */
async function transcribe(audioBuffer, mimeType = 'audio/mpeg', filename = 'audio.mp3') {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
        logger.error('KingBrief transcription: OPENAI_API_KEY não configurada');
        throw new Error('Serviço de transcrição não configurado (OPENAI_API_KEY).');
    }

    const size = (audioBuffer && audioBuffer.length) || 0;
    if (size > WHISPER_MAX_FILE_SIZE_BYTES) {
        const sizeMB = (size / (1024 * 1024)).toFixed(1);
        logger.error('KingBrief transcription: áudio demasiado grande', { sizeBytes: size, sizeMB });
        const e = new Error(
            'O áudio é demasiado grande para transcrição (' + sizeMB + ' MB). ' +
            'A API Whisper aceita no máximo 25 MB por ficheiro (cerca de 25 minutos em MP3). ' +
            'Grave ou envie áudios mais curtos (até ~25 min) ou divida a gravação em partes.'
        );
        e.statusCode = 400;
        throw e;
    }

    const form = new FormData();
    form.append('file', audioBuffer, {
        filename: filename || 'audio.mp3',
        contentType: mimeType
    });
    form.append('model', 'whisper-1');
    form.append('language', 'pt');

    const response = await fetch(WHISPER_URL, {
        method: 'POST',
        headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${OPENAI_API_KEY.trim()}`
        },
        body: form
    });

    const text = await response.text();
    if (!response.ok) {
        logger.error('KingBrief Whisper API error', { status: response.status, body: text?.slice(0, 300) });
        if (response.status === 429) throw new Error('Limite de uso da API de transcrição atingido. Tente novamente mais tarde.');
        if (response.status >= 500) throw new Error('Serviço de transcrição temporariamente indisponível.');
        if (response.status === 400 && (text || '').toLowerCase().includes('file') && ((text || '').toLowerCase().includes('large') || (text || '').toLowerCase().includes('25'))) {
            const e = new Error(
                'O áudio é demasiado grande para transcrição. A API Whisper aceita no máximo 25 MB por ficheiro (cerca de 25 minutos em MP3). ' +
                'Grave ou envie áudios mais curtos ou divida a gravação em partes.'
            );
            e.statusCode = 400;
            throw e;
        }
        throw new Error(text || 'Falha na transcrição do áudio.');
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        throw new Error('Resposta inválida do serviço de transcrição.');
    }

    const transcript = (data && data.text) ? String(data.text).trim() : '';
    return transcript;
}

module.exports = {
    transcribe
};
