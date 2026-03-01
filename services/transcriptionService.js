/**
 * KingBrief – Serviço de transcrição (OpenAI Whisper)
 * Envia áudio para Speech-to-Text e devolve texto em PT-BR.
 * Áudios > 25 MB são divididos automaticamente com ffmpeg e transcritos em partes.
 * OPENAI_API_KEY deve estar definida no ambiente (apenas backend).
 * Para áudios longos (ex.: 1 hora), ffmpeg deve estar instalado no servidor.
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

/** Limite da API Whisper (OpenAI): 25 MB por ficheiro. */
const WHISPER_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Duração de cada segmento (segundos). 12 min + MP3 -q:a 3 ≈ 14 MB, sempre < 25 MB do Whisper. */
const SEGMENT_DURATION_SEC = 12 * 60;

/** Máximo de palavras no prompt de contexto para o próximo segmento (Whisper aceita ~224). */
const PROMPT_MAX_WORDS = 200;

/**
 * Envia um único buffer para o Whisper (tamanho deve ser <= 25 MB).
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 * @param {string} filename
 * @param {string} [prompt] - Contexto do segmento anterior para continuidade
 * @param {boolean} [withSegments] - Se true, pede verbose_json e devolve { text, segments }
 * @returns {Promise<string|{ text: string, segments: Array<{ start_sec: number, end_sec: number, text: string }>}>}
 */
async function transcribeOneChunk(audioBuffer, mimeType, filename, prompt, withSegments) {
    const form = new FormData();
    form.append('file', audioBuffer, {
        filename: filename || 'audio.mp3',
        contentType: mimeType
    });
    form.append('model', 'whisper-1');
    form.append('language', 'pt');
    if (withSegments) {
        form.append('response_format', 'verbose_json');
        form.append('timestamp_granularities[]', 'segment');
    }
    if (prompt && prompt.trim()) {
        const truncated = prompt.trim().split(/\s+/).slice(-PROMPT_MAX_WORDS).join(' ');
        if (truncated) form.append('prompt', truncated);
    }

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
        if (response.status === 413 || ((text || '').includes('26214400') || (text || '').includes('Maximum content size'))) {
            const e = new Error('Segmento de áudio ainda demasiado grande para a API. O servidor vai usar segmentos mais curtos na próxima versão.');
            e.statusCode = 503;
            throw e;
        }
        if (response.status >= 500) throw new Error('Serviço de transcrição temporariamente indisponível.');
        if (response.status === 400 && (text || '').toLowerCase().includes('file') && ((text || '').toLowerCase().includes('large') || (text || '').toLowerCase().includes('25'))) {
            const e = new Error('Segmento ainda demasiado grande. O servidor deve usar ffmpeg para dividir o áudio em partes menores.');
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
    const fullText = (data && data.text) ? String(data.text).trim() : '';
    if (withSegments && data && Array.isArray(data.segments)) {
        const segments = data.segments
            .filter(s => s && (s.text || '').trim())
            .map(s => ({
                start_sec: Number(s.start),
                end_sec: Number(s.end),
                text: String(s.text || '').trim()
            }));
        return { text: fullText, segments };
    }
    return fullText;
}

/**
 * Divide um ficheiro de áudio em segmentos com ffmpeg (por tempo) e transcreve cada um.
 * Requer ffmpeg instalado no sistema (ex.: apt-get install ffmpeg, ou no Render com buildpack).
 */
async function transcribeLongAudio(audioBuffer, mimeType, filename) {
    const ext = (filename && path.extname(filename)) || (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3' ? '.mp3' : mimeType === 'audio/wav' ? '.wav' : '.m4a');
    const tmpDir = path.join(os.tmpdir(), 'kingbrief-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
    const inputPath = path.join(tmpDir, 'input' + ext);
    const segmentPattern = path.join(tmpDir, 'seg_%03d.mp3');

    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(inputPath, audioBuffer);

    try {
        await new Promise((resolve, reject) => {
            const args = [
                '-i', inputPath,
                '-f', 'segment',
                '-segment_time', String(SEGMENT_DURATION_SEC),
                '-acodec', 'libmp3lame',
                '-q:a', '3',
                '-reset_timestamps', '1',
                '-y',
                segmentPattern
            ];
            const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
            let stderr = '';
            proc.stderr.on('data', (c) => { stderr += c.toString(); });
            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('ffmpeg falhou (instale ffmpeg no servidor para áudios longos): ' + stderr.slice(-500)));
            });
            proc.on('error', (err) => {
                if (err.code === 'ENOENT') {
                    reject(new Error('ffmpeg não encontrado. Para áudios com mais de 25 MB (ex.: 1 hora), instale ffmpeg no servidor. Ex.: apt-get install ffmpeg ou use uma imagem Docker com ffmpeg.'));
                } else reject(err);
            });
        });
    } finally {
        try { await fs.unlink(inputPath); } catch (_) {}
    }

    const entries = await fs.readdir(tmpDir);
    const segmentFiles = entries.filter(f => /^seg_\d+\.mp3$/.test(path.basename(f))).sort();
    if (segmentFiles.length === 0) {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        throw new Error('ffmpeg não gerou segmentos. Verifique o formato do áudio.');
    }

    const parts = [];
    const segments = [];
    let previousPrompt = '';

    for (let i = 0; i < segmentFiles.length; i++) {
        const segPath = path.join(tmpDir, segmentFiles[i]);
        const buf = await fs.readFile(segPath);
        await fs.unlink(segPath).catch(() => {});
        logger.info('KingBrief transcription: segmento ' + (i + 1) + '/' + segmentFiles.length);
        const result = await transcribeOneChunk(buf, 'audio/mpeg', segmentFiles[i], previousPrompt, false);
        const text = typeof result === 'string' ? result : (result && result.text) || '';
        if (text) {
            parts.push(text);
            previousPrompt = text;
            const startSec = i * SEGMENT_DURATION_SEC;
            const endSec = (i + 1) * SEGMENT_DURATION_SEC;
            segments.push({ start_sec: startSec, end_sec: endSec, text });
        }
    }

    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    const fullText = parts.join('\n\n').trim();
    return { text: fullText, segments };
}

/**
 * Transcreve um buffer de áudio. Se for > 25 MB, divide com ffmpeg e transcreve em partes.
 * @param {Buffer} audioBuffer - Conteúdo do ficheiro de áudio
 * @param {string} [mimeType] - Ex.: audio/mpeg, audio/wav
 * @param {string} [filename] - Ex.: audio.mp3
 * @returns {Promise<{ text: string, segments: Array<{ start_sec: number, end_sec: number, text: string }>}>}
 */
async function transcribe(audioBuffer, mimeType = 'audio/mpeg', filename = 'audio.mp3') {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
        logger.error('KingBrief transcription: OPENAI_API_KEY não configurada');
        throw new Error('Serviço de transcrição não configurado (OPENAI_API_KEY).');
    }

    const size = (audioBuffer && audioBuffer.length) || 0;

    if (size <= WHISPER_MAX_FILE_SIZE_BYTES) {
        const result = await transcribeOneChunk(audioBuffer, mimeType, filename, undefined, true);
        if (typeof result === 'string') return { text: result, segments: [] };
        return { text: result.text || '', segments: result.segments || [] };
    }

    const sizeMB = (size / (1024 * 1024)).toFixed(1);
    logger.info('KingBrief transcription: áudio longo (' + sizeMB + ' MB), a dividir com ffmpeg');

    try {
        return await transcribeLongAudio(audioBuffer, mimeType, filename);
    } catch (err) {
        if (err.message && (err.message.includes('ffmpeg não encontrado') || err.message.includes('ffmpeg não'))) {
            const e = new Error(
                'Áudio demasiado grande (' + sizeMB + ' MB). Para transcrever áudios longos (ex.: 1 hora), o servidor precisa ter o ffmpeg instalado. ' +
                'Contacte o administrador para instalar ffmpeg (ex.: apt-get install ffmpeg). Enquanto isso, envie áudios até ~25 min.'
            );
            e.statusCode = 503;
            throw e;
        }
        throw err;
    }
}

module.exports = {
    transcribe,
    WHISPER_MAX_FILE_SIZE_BYTES
};
