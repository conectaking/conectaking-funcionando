/**
 * Geração de estudos por livro via IA em segundo plano (vários livros, barra de progresso).
 */
const { randomUUID } = require('crypto');
const bibleService = require('./bible.service');
const bibleRepository = require('./bible.repository');
const bibleDevotionalAi = require('./bibleDevotionalAi.service');
const logger = require('../../utils/logger');

const bookStudyAiJobs = new Map();
const MAX_BOOK_STUDY_JOBS = 32;

function getAllBooksFlat() {
    const m = bibleService.loadBooksManifest();
    return [].concat(m.at || [], m.nt || []);
}

function resolveBookMeta(bookId) {
    const id = String(bookId || '').trim();
    if (!id) return null;
    return getAllBooksFlat().find(function (b) {
        return b && String(b.id).toLowerCase() === id.toLowerCase();
    });
}

async function executeBookStudyAiJob(jobId, bookIds, options) {
    const job = bookStudyAiJobs.get(jobId);
    if (!job) return;
    job.status = 'running';
    job.updatedAt = Date.now();

    const total = bookIds.length;
    const baseadoEmGenesis = !!(options && options.baseadoEmGenesis);

    let gnSample = '';
    if (baseadoEmGenesis) {
        try {
            const gnRow = await bibleRepository.getBookStudy('gn');
            if (gnRow && gnRow.content) gnSample = String(gnRow.content).trim();
        } catch (e) {
            logger.warn('bookStudyAiJob: sem Gênesis na base para amostra');
        }
    }

    try {
        for (let i = 0; i < bookIds.length; i++) {
            const jCheck = bookStudyAiJobs.get(jobId);
            if (jCheck && jCheck.cancelRequested) {
                jCheck.status = 'cancelled';
                jCheck.currentBookId = null;
                jCheck.currentBookName = null;
                jCheck.updatedAt = Date.now();
                return;
            }

            const bid = bookIds[i];
            const meta = resolveBookMeta(bid);
            job.currentBookId = bid;
            job.currentBookName = meta ? meta.name || bid : bid;
            job.progress = total > 0 ? Math.min(99, Math.floor((100 * i) / total)) : 0;
            job.updatedAt = Date.now();

            if (!meta) {
                job.errors += 1;
                job.processed = i + 1;
                if (job.failedSamples.length < 40) {
                    job.failedSamples.push({ bookId: bid, error: 'Livro não encontrado no manifesto.' });
                }
                continue;
            }

            let referenceSample = '';
            if (String(bid).toLowerCase() !== 'gn') {
                if (baseadoEmGenesis && gnSample) {
                    referenceSample = gnSample;
                } else {
                    try {
                        const gnRow = await bibleRepository.getBookStudy('gn');
                        if (gnRow && gnRow.content) referenceSample = String(gnRow.content).trim();
                    } catch (e) {}
                }
            }

            const r = await bibleDevotionalAi.generateBookStudyFullText({
                bookId: bid,
                bookName: meta.name || bid,
                referenceSample,
                baseadoEmGenesis: baseadoEmGenesis || undefined,
                profundidadeEstiloGenesis: !!baseadoEmGenesis
            });

            if (r.error) {
                job.errors += 1;
                if (job.failedSamples.length < 40) {
                    job.failedSamples.push({ bookId: bid, error: r.error });
                }
            } else {
                const title = `Estudo: ${meta.name || bid}`;
                await bibleRepository.upsertBookStudy(bid, title, r.text);
            }

            job.processed = i + 1;
            job.progress = total > 0 ? Math.min(100, Math.floor((100 * job.processed) / total)) : 100;
            job.updatedAt = Date.now();
        }

        job.status = 'done';
        job.currentBookId = null;
        job.currentBookName = null;
        job.progress = 100;
    } catch (e) {
        logger.error('bible.adminBookStudyAiJobs execute:', e);
        job.status = 'error';
        job.errorMessage = e.message || String(e);
    }
    job.updatedAt = Date.now();
}

function pruneJobsIfNeeded() {
    while (bookStudyAiJobs.size >= MAX_BOOK_STUDY_JOBS) {
        const first = bookStudyAiJobs.keys().next().value;
        bookStudyAiJobs.delete(first);
    }
}

/**
 * @param {string[]} bookIdsInput
 * @param {{ baseadoEmGenesis?: boolean }} options
 */
function startBookStudyAiBackgroundJob(bookIdsInput, options) {
    const opts = options || {};
    const raw = Array.isArray(bookIdsInput) ? bookIdsInput : [];
    const bookIds = [];
    const seen = new Set();
    raw.forEach(function (b) {
        const s = String(b || '').trim();
        if (s && !seen.has(s.toLowerCase())) {
            seen.add(s.toLowerCase());
            bookIds.push(s);
        }
    });
    if (!bookIds.length) {
        return { ok: false, error: 'Indique pelo menos um livro.' };
    }
    if (bookIds.length > 45) {
        return { ok: false, error: 'Máximo 45 livros por trabalho.' };
    }

    pruneJobsIfNeeded();
    const jobId = randomUUID();
    const job = {
        id: jobId,
        status: 'queued',
        bookIds: bookIds.slice(),
        total: bookIds.length,
        processed: 0,
        progress: 0,
        errors: 0,
        currentBookId: null,
        currentBookName: null,
        baseadoEmGenesis: !!opts.baseadoEmGenesis,
        failedSamples: [],
        cancelRequested: false,
        errorMessage: null,
        startedAt: Date.now(),
        updatedAt: Date.now()
    };
    bookStudyAiJobs.set(jobId, job);

    setImmediate(function () {
        executeBookStudyAiJob(jobId, bookIds, opts).catch(function (e) {
            logger.error('bookStudyAiJob outer:', e);
            const j = bookStudyAiJobs.get(jobId);
            if (j) {
                j.status = 'error';
                j.errorMessage = e.message || String(e);
                j.updatedAt = Date.now();
            }
        });
    });

    return { ok: true, jobId, total: bookIds.length };
}

function getBookStudyAiJob(jobId) {
    const j = bookStudyAiJobs.get(jobId);
    if (!j) return null;
    const total = j.total || 0;
    const processed = j.processed || 0;
    let progress = total > 0 ? Math.min(100, Math.floor((100 * processed) / total)) : 0;
    if (j.status === 'running' && j.currentBookId && total > 0) {
        progress = Math.min(99, Math.floor((100 * processed) / total));
    }
    if (j.status === 'done') progress = 100;
    return {
        id: j.id,
        status: j.status,
        total,
        processed,
        progress,
        errors: j.errors || 0,
        currentBookId: j.currentBookId,
        currentBookName: j.currentBookName,
        baseadoEmGenesis: j.baseadoEmGenesis,
        failedSamples: (j.failedSamples || []).slice(0, 25),
        errorMessage: j.errorMessage || null,
        updatedAt: j.updatedAt,
        startedAt: j.startedAt
    };
}

function cancelBookStudyAiJob(jobId) {
    const j = bookStudyAiJobs.get(jobId);
    if (!j) {
        return { ok: false, error: 'Trabalho não encontrado ou expirado.' };
    }
    if (j.status === 'done' || j.status === 'error' || j.status === 'cancelled') {
        return { ok: false, error: 'Este trabalho já terminou.' };
    }
    j.cancelRequested = true;
    return { ok: true };
}

module.exports = {
    startBookStudyAiBackgroundJob,
    getBookStudyAiJob,
    cancelBookStudyAiJob
};
