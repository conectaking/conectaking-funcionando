/**
 * KingBrief – Serviço principal
 * Orquestra: upload R2 → transcrição → resumo/mapa mental → gravar em kingbrief_meetings.
 * Em falha da OpenAI não grava meeting (controller devolve 503).
 */

const crypto = require('crypto');
const config = require('../../config');
const logger = require('../../utils/logger');
const { r2PutObjectBuffer } = require('../../utils/r2');
const transcriptionService = require('../../services/transcriptionService');
const summaryMindmapService = require('../../services/summaryMindmapService');
const repository = require('./kingbrief.repository');

const AUDIO_PREFIX = 'kingbrief-audio';

/**
 * Obtém extensão e contentType a partir do mimetype ou nome do ficheiro
 */
function getExtensionAndType(mimetype, originalName) {
    const name = (originalName || '').toLowerCase();
    const mime = (mimetype || '').toLowerCase();
    if (mime.includes('mpeg') || mime.includes('mp3') || name.endsWith('.mp3')) return { ext: 'mp3', contentType: 'audio/mpeg' };
    if (mime.includes('wav') || name.endsWith('.wav')) return { ext: 'wav', contentType: 'audio/wav' };
    if (mime.includes('m4a') || mime.includes('mp4') || name.endsWith('.m4a')) return { ext: 'm4a', contentType: 'audio/mp4' };
    if (mime.includes('webm') || name.endsWith('.webm')) return { ext: 'webm', contentType: 'audio/webm' };
    return { ext: 'mp3', contentType: mimetype || 'audio/mpeg' };
}

/**
 * Processa áudio: upload R2, transcreve, gera resumo/mapa mental, grava meeting
 * @param {string} userId
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 * @param {string} originalName
 * @param {string} [title]
 * @returns {Promise<Object>} meeting criado (campos para resposta API)
 */
async function processAudio(userId, audioBuffer, mimeType, originalName, title = null) {
    const { ext, contentType } = getExtensionAndType(mimeType, originalName);
    const key = `${AUDIO_PREFIX}/${userId}/${crypto.randomUUID()}.${ext}`;

    let audioUrl = null;
    try {
        const r2Result = await r2PutObjectBuffer({
            key,
            body: audioBuffer,
            contentType
        });
        audioUrl = r2Result.publicUrl || null;
    } catch (err) {
        logger.error('KingBrief R2 upload failed', { userId, error: err.message });
        throw new Error('Falha ao guardar o áudio. Tente novamente.');
    }

    let transcript = '';
    try {
        transcript = await transcriptionService.transcribe(audioBuffer, contentType, originalName || `audio.${ext}`);
    } catch (err) {
        logger.error('KingBrief transcription failed', { userId, error: err.message });
        throw err; // Controller não grava meeting, devolve 503
    }

    let summaryData;
    try {
        summaryData = await summaryMindmapService.generateSummaryAndMindmap(transcript);
    } catch (err) {
        logger.error('KingBrief summary/mindmap failed', { userId, error: err.message });
        throw err; // Controller não grava meeting, devolve 503
    }

    const meeting = await repository.create({
        user_id: userId,
        title: title || `Reunião ${new Date().toLocaleDateString('pt-BR')}`,
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
    getExtensionAndType
};
