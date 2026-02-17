const bibleService = require('./bible.service');
const ttsService = require('./tts/tts.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getVerseOfDay(req, res) {
    try {
        const date = req.query.date || null;
        const translation = req.query.translation || 'nvi';
        const verse = await bibleService.getVerseOfDay(date, translation);
        if (!verse) return responseFormatter.error(res, 'Versículo não encontrado', 404);
        return responseFormatter.success(res, verse);
    } catch (e) {
        logger.error('bible getVerseOfDay:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar versículo', 500);
    }
}

async function getNumbers(req, res) {
    try {
        const numbers = bibleService.getNumbers();
        return responseFormatter.success(res, { numbers });
    } catch (e) {
        logger.error('bible getNumbers:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar significados', 500);
    }
}

async function getNameMeaning(req, res) {
    try {
        const name = req.query.name || req.query.nome || '';
        const result = bibleService.getNameMeaning(name);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getNameMeaning:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar nome', 500);
    }
}

async function getPalavraDoDia(req, res) {
    try {
        const date = req.query.date || null;
        const result = await bibleService.getPalavraDoDia(date);
        if (!result) return responseFormatter.error(res, 'Palavra não encontrada', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getPalavraDoDia:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar palavra', 500);
    }
}

async function getSalmoDoDia(req, res) {
    try {
        const date = req.query.date || null;
        const result = await bibleService.getSalmoDoDia(date);
        if (!result) return responseFormatter.error(res, 'Salmo não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getSalmoDoDia:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar salmo', 500);
    }
}

async function getDevocionalDoDia(req, res) {
    try {
        const date = req.query.date || null;
        const result = await bibleService.getDevocionalDoDia(date);
        if (!result) return responseFormatter.error(res, 'Devocional não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getDevocionalDoDia:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar devocional', 500);
    }
}

async function getConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await bibleService.getConfig(itemId, req.user.userId);
        return responseFormatter.success(res, config);
    } catch (e) {
        logger.error('bible getConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao carregar configuração', 403);
    }
}

async function saveConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await bibleService.saveConfig(itemId, req.user.userId, req.body || {});
        return responseFormatter.success(res, config, 'Configuração salva.');
    } catch (e) {
        logger.error('bible saveConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao salvar', 400);
    }
}

async function getMyProgress(req, res) {
    try {
        const userId = req.user.userId;
        const progress = await bibleService.getMyProgress(userId);
        return responseFormatter.success(res, progress);
    } catch (e) {
        logger.error('bible getMyProgress:', e);
        return responseFormatter.error(res, e.message || 'Erro ao carregar progresso', 500);
    }
}

async function getBookChapter(req, res) {
    try {
        const bookId = req.params.bookId || '';
        const chapter = req.params.chapter || '1';
        const translation = req.query.translation || 'nvi';
        const result = bibleService.getBookChapter(bookId, chapter, translation);
        if (!result) return responseFormatter.error(res, 'Capítulo não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getBookChapter:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar capítulo', 500);
    }
}

async function getBooksManifest(req, res) {
    try {
        const manifest = bibleService.loadBooksManifest();
        return responseFormatter.success(res, manifest);
    } catch (e) {
        logger.error('bible getBooksManifest:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar livros', 500);
    }
}

async function markRead(req, res) {
    try {
        const userId = req.user.userId;
        const progress = await bibleService.markRead(userId, req.body || {});
        return responseFormatter.success(res, progress, 'Marcado como lido.');
    } catch (e) {
        logger.error('bible markRead:', e);
        return responseFormatter.error(res, e.message || 'Erro ao marcar', 400);
    }
}

// --- Ecossistema Bíblico (devocionais 365, estudos, esboços, busca) ---

async function getDevocional365(req, res) {
    try {
        const day = req.params.day; // 1-365 ou date YYYY-MM-DD
        const result = await bibleService.getDevocional365(day);
        if (!result) return responseFormatter.error(res, 'Devocional não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getDevocional365:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar devocional', 500);
    }
}

async function getStudyThemes(req, res) {
    try {
        const themes = await bibleService.getStudyThemes();
        return responseFormatter.success(res, { themes });
    } catch (e) {
        logger.error('bible getStudyThemes:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar temas', 500);
    }
}

async function getStudies(req, res) {
    try {
        const themeSlug = req.query.theme || null;
        const studies = await bibleService.getStudies(themeSlug);
        return responseFormatter.success(res, { studies });
    } catch (e) {
        logger.error('bible getStudies:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar estudos', 500);
    }
}

async function getStudyBySlug(req, res) {
    try {
        const { themeSlug, studySlug } = req.params;
        const study = await bibleService.getStudyBySlug(themeSlug, studySlug);
        if (!study) return responseFormatter.error(res, 'Estudo não encontrado', 404);
        return responseFormatter.success(res, study);
    } catch (e) {
        logger.error('bible getStudyBySlug:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar estudo', 500);
    }
}

async function getOutlineCategories(req, res) {
    try {
        const categories = await bibleService.getOutlineCategories();
        return responseFormatter.success(res, { categories });
    } catch (e) {
        logger.error('bible getOutlineCategories:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar categorias', 500);
    }
}

async function getOutlines(req, res) {
    try {
        const categorySlug = req.query.category || null;
        const outlines = await bibleService.getOutlines(categorySlug);
        return responseFormatter.success(res, { outlines });
    } catch (e) {
        logger.error('bible getOutlines:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar esboços', 500);
    }
}

async function getOutlineBySlug(req, res) {
    try {
        const { categorySlug, outlineSlug } = req.params;
        const outline = await bibleService.getOutlineBySlug(categorySlug, outlineSlug);
        if (!outline) return responseFormatter.error(res, 'Esboço não encontrado', 404);
        return responseFormatter.success(res, outline);
    } catch (e) {
        logger.error('bible getOutlineBySlug:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar esboço', 500);
    }
}

async function searchBible(req, res) {
    try {
        const q = (req.query.q || req.query.query || '').trim();
        const limit = parseInt(req.query.limit, 10) || 30;
        const result = await bibleService.searchBibleEcosystem(q, limit);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible searchBible:', e);
        return responseFormatter.error(res, e.message || 'Erro na busca', 500);
    }
}

/**
 * TTS: retorna URL do áudio (em cache no R2) ou gera com Google TTS e cacheia.
 * Query: ref (ex: "jo 3:16"), version (nvi), voice (opcional), text (opcional; se omitido, busca pelo ref).
 */
async function getTtsAudio(req, res) {
    try {
        let ref = (req.query.ref || req.body?.ref || '').trim();
        let version = (req.query.version || req.body?.version || 'nvi').toLowerCase();
        const voiceName = (req.query.voice || req.body?.voice || 'pt-BR-Standard-A').trim();
        const voiceType = (req.query.voiceType || req.body?.voiceType || 'Standard').trim();
        const locale = (req.query.locale || req.body?.locale || 'pt-BR').trim();
        let text = (req.query.text || req.body?.text || '').trim();
        let scope = (req.query.scope || req.body?.scope || 'verse').toLowerCase();

        // Se a URL veio com query string duplamente codificada (ex: ?ref%3Djo%203%3A16%26version%3Dnvi), tentar extrair ref e version
        if (!ref && !text && req.url && req.url.includes('?')) {
            const q = req.url.split('?')[1] || '';
            const decoded = decodeURIComponent(q.replace(/\+/g, ' '));
            const params = new URLSearchParams(decoded);
            ref = (params.get('ref') || '').trim();
            if (params.get('version')) version = params.get('version').toLowerCase();
        }

        if (!ref && !text) {
            return responseFormatter.error(res, 'Informe ref (ex: jo 3:16) ou text', 400);
        }

        let effectiveRef = ref;
        if (!text && ref) {
            const refData = bibleService.getTextForRef(ref, version);
            if (!refData) {
                return responseFormatter.error(res, 'Trecho não encontrado: ' + ref, 404);
            }
            text = refData.text;
            scope = refData.scope;
            effectiveRef = refData.ref;
        }

        const result = await ttsService.getOrCreateAudio({
            ref: effectiveRef || 'custom',
            text,
            bibleVersion: version,
            scope,
            voiceName,
            voiceType,
            locale
        });

        if (result.url) {
            return responseFormatter.success(res, { url: result.url, fromCache: !!result.fromCache });
        }
        if (result.status === 'error') {
            return responseFormatter.error(res, result.message || 'Falha ao gerar áudio', 500);
        }
        return responseFormatter.success(res, {
            status: 'missing',
            cacheKey: result.cacheKey,
            r2Path: result.r2Path,
            message: 'Áudio não está em cache e o TTS (GCP) não está configurado ou falhou.'
        }, null, 202);
    } catch (e) {
        logger.error('bible getTtsAudio:', e);
        return responseFormatter.error(res, e.message || 'Erro ao obter áudio TTS', 500);
    }
}

module.exports = {
    getVerseOfDay,
    getNumbers,
    getNameMeaning,
    getPalavraDoDia,
    getSalmoDoDia,
    getDevocionalDoDia,
    getDevocional365,
    getStudyThemes,
    getStudies,
    getStudyBySlug,
    getOutlineCategories,
    getOutlines,
    getOutlineBySlug,
    searchBible,
    getBookChapter,
    getBooksManifest,
    getMyProgress,
    markRead,
    getConfig,
    saveConfig,
    getTtsAudio
};
