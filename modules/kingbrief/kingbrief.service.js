/**
 * KingBrief – Serviço principal
 * Orquestra: upload R2 → transcrição → resumo/mapa mental → gravar reunião.
 * Não grava meeting em falha da OpenAI (devolve erro 503).
 */

const { nanoid } = require('nanoid');
const repository = require('./kingbrief.repository');
const transcriptionService = require('../../services/transcriptionService');
const summaryMindmapService = require('../../services/summaryMindmapService');
const { r2PutObjectBuffer } = require('../../utils/r2');
const logger = require('../../utils/logger');
const config = require('../../config');

/**
 * Gera extensão a partir do mimetype ou nome do ficheiro
 */
function getExtension(mimeType, filename) {
    if (filename) {
        const m = filename.match(/\.([a-z0-9]+)$/i);
        if (m) return m[1].toLowerCase();
    }
    const map = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/mp4': 'm4a',
        'audio/x-m4a': 'm4a',
        'audio/webm': 'webm'
    };
    return map[mimeType] || 'mp3';
}

/**
 * Processa áudio: upload R2, transcrição, resumo/mapa mental, grava reunião.
 * Em falha da OpenAI não grava; lança erro para o controller devolver 503.
 * @param {Object} params - { userId, buffer, mimeType, originalname, title }
 * @returns {Promise<Object>} meeting criado
 */
async function processAudio(params) {
    const { userId, buffer, mimeType, originalname, title } = params;
    const ext = getExtension(mimeType, originalname);
    const key = `kingbrief-audio/${userId}/${nanoid(12)}.${ext}`;

    let audioUrl = null;
    try {
        const r2Result = await r2PutObjectBuffer({
            key,
            body: buffer,
            contentType: mimeType || 'audio/mpeg',
            cacheControl: 'public, max-age=31536000'
        });
        audioUrl = r2Result.publicUrl;
    } catch (err) {
        logger.error('KingBrief R2 upload error', { userId, error: err.message });
        throw new Error('Falha ao guardar o áudio. Tente novamente.');
    }

    let transcript = '';
    try {
        transcript = await transcriptionService.transcribe(buffer, mimeType, originalname || `audio.${ext}`);
    } catch (err) {
        logger.error('KingBrief transcription error', { userId, error: err.message });
        throw Object.assign(err, { statusCode: err.statusCode || 503 });
    }

    let summaryData;
    try {
        summaryData = await summaryMindmapService.generateSummaryAndMindmap(transcript);
    } catch (err) {
        logger.error('KingBrief summary error', { userId, error: err.message });
        throw Object.assign(err, { statusCode: err.statusCode || 503 });
    }

    const meeting = await repository.create({
        user_id: userId,
        title: title || null,
        audio_url: audioUrl,
        transcript,
        summary: summaryData.summary,
        topics_json: summaryData.topics,
        actions_json: summaryData.actions,
        mindmap_json: summaryData.mindmap,
        duration_sec: null
    });

    return meeting;
}

module.exports = {
    processAudio,
    findByUserId: repository.findByUserId,
    findById: repository.findById,
    update: repository.update,
    remove: repository.remove,
    countByUser: repository.countByUser
};
