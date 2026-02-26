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
