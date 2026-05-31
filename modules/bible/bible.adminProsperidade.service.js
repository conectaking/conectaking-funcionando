/**
 * Admin Prosperidade — jobs em lote (padrão Dev365).
 */

const { randomUUID } = require('crypto');
const prosperidadeService = require('./bible.prosperidade.service');
const repo = require('./bible.prosperidade.repository');
const logger = require('../../utils/logger');

const genJobs = new Map();
const MAX_JOBS = 32;

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function generateRangeAndSave(start, end, options) {
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    if (s < 1 || e > 31 || s > e) throw new Error('Intervalo inválido (1–31).');
    const delayMs = Math.max(0, parseInt(options.delayMs, 10) || 800);
    const results = [];
    let tokensTotal = 0;

    for (let n = s; n <= e; n++) {
        const gen = await prosperidadeService.adminGenerateAi(n);
        if (gen.error) {
            results.push({ activation_number: n, ok: false, error: gen.error });
            continue;
        }
        const data = { ...gen.data, content_source: 'ai' };
        await repo.updateActivation(n, data);
        tokensTotal += (gen.tokens && gen.tokens.total) || 0;
        results.push({ activation_number: n, ok: true, tokens: gen.tokens });
        if (n < e && delayMs > 0) await sleep(delayMs);
    }

    return { results, tokensTotal };
}

function startRangeBackgroundJob(start, end, options) {
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    if (s < 1 || e > 31 || s > e) throw new Error('Intervalo inválido (1–31).');
    if (e - s + 1 > 15) throw new Error('Máximo 15 Ativações por lote. Divida em intervalos menores.');

    if (genJobs.size >= MAX_JOBS) {
        const oldest = genJobs.keys().next().value;
        if (oldest) genJobs.delete(oldest);
    }

    const jobId = randomUUID();
    const total = e - s + 1;
    const job = {
        id: jobId,
        status: 'running',
        start: s,
        end: e,
        current: s,
        done: 0,
        total,
        errors: [],
        tokensTotal: 0,
        cancelRequested: false,
        startedAt: Date.now()
    };
    genJobs.set(jobId, job);

    setImmediate(() => executeRangeJob(jobId, options || {}));
    return { ok: true, jobId, total };
}

async function executeRangeJob(jobId, options) {
    const job = genJobs.get(jobId);
    if (!job) return;
    const delayMs = Math.max(0, parseInt(options.delayMs, 10) || 800);

    for (let n = job.start; n <= job.end; n++) {
        if (job.cancelRequested) {
            job.status = 'cancelled';
            job.finishedAt = Date.now();
            return;
        }
        job.current = n;
        try {
            const gen = await prosperidadeService.adminGenerateAi(n);
            if (gen.error) {
                job.errors.push({ activation_number: n, error: gen.error });
            } else {
                await repo.updateActivation(n, { ...gen.data, content_source: 'ai' });
                job.tokensTotal += (gen.tokens && gen.tokens.total) || 0;
            }
        } catch (e) {
            logger.error('prosperidade range job:', e);
            job.errors.push({ activation_number: n, error: e.message });
        }
        job.done++;
        if (n < job.end && delayMs > 0) await sleep(delayMs);
    }

    job.status = job.errors.length === job.total ? 'failed' : (job.errors.length ? 'partial' : 'done');
    job.finishedAt = Date.now();
}

function getGenerationJob(jobId) {
    const job = genJobs.get(jobId);
    if (!job) return null;
    const elapsed = Date.now() - job.startedAt;
    const etaMs = job.done > 0 ? Math.round((elapsed / job.done) * (job.total - job.done)) : null;
    return {
        id: job.id,
        status: job.status,
        start: job.start,
        end: job.end,
        current: job.current,
        done: job.done,
        total: job.total,
        errors: job.errors,
        tokensTotal: job.tokensTotal,
        etaMs,
        cancelRequested: job.cancelRequested
    };
}

function cancelGenerationJob(jobId) {
    const job = genJobs.get(jobId);
    if (!job) return { ok: false, message: 'Job não encontrado.' };
    job.cancelRequested = true;
    return { ok: true, message: 'Cancelamento solicitado.' };
}

module.exports = {
    generateRangeAndSave,
    startRangeBackgroundJob,
    getGenerationJob,
    cancelGenerationJob
};
