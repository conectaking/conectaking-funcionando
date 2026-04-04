const bibleService = require('./bible.service');
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

async function resetProgress(req, res) {
    try {
        const userId = req.user.userId;
        const progress = await bibleService.resetProgress(userId);
        return responseFormatter.success(res, progress, 'Progresso zerado. Você pode começar de novo.');
    } catch (e) {
        logger.error('bible resetProgress:', e);
        return responseFormatter.error(res, e.message || 'Erro ao zerar progresso', 400);
    }
}

// --- Ecossistema Bíblico (devocionais 365, estudos, esboços, busca) ---

async function getDevocionalBibliaInteira(req, res) {
    try {
        const mode = req.query.mode || 'calendar';
        const month = req.query.month;
        const day = req.query.day;
        let result;
        if (mode === 'sequence' && day != null && day !== '') {
            const dayNum = parseInt(day, 10);
            if (dayNum >= 1 && dayNum <= 1189) {
                result = bibleService.getDevocionalBibliaInteira('sequence', dayNum, null);
            }
        }
        if (!result) {
            const m = month != null && month !== '' ? month : new Date().getMonth() + 1;
            const d = day != null && day !== '' ? day : new Date().getDate();
            result = bibleService.getDevocionalBibliaInteira('calendar', m, d);
        }
        if (!result) return responseFormatter.error(res, 'Devocional não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getDevocionalBibliaInteira:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar devocional', 500);
    }
}

/** Query ?ai= — só desliga reflexão enriquecida com 0/false/off/no; omissão ou outros valores = ligado. */
function isDev365AiExplicitOff(raw) {
    if (raw === undefined || raw === null) return false;
    const v = Array.isArray(raw) ? raw[raw.length - 1] : raw;
    const t = String(v).trim().toLowerCase();
    return t === '0' || t === 'false' || t === 'off' || t === 'no';
}

async function getDevocional365(req, res) {
    try {
        const plain = req.query.plain;
        if (plain === '1' || plain === 'true' || plain === 'db') {
            const dayNum = parseInt(req.params.day, 10);
            if (Number.isNaN(dayNum) || dayNum < 1 || dayNum > 365) {
                return responseFormatter.error(res, 'Dia deve ser entre 1 e 365', 400);
            }
            const row = await bibleService.getDevocional365PlainFromDb(dayNum);
            const hasText = row && [row.titulo, row.versiculo_ref, row.versiculo_texto, row.reflexao, row.aplicacao, row.oracao]
                .some((x) => x && String(x).trim());
            if (!hasText) {
                return responseFormatter.error(res, 'Sem devocional na base para este dia.', 404);
            }
            return responseFormatter.success(res, row);
        }
        const day = req.params.day; // 1-365 ou date YYYY-MM-DD
        const aiExplicitOff = isDev365AiExplicitOff(req.query.ai);
        const useAi = !aiExplicitOff;
        let year = parseInt(req.query.year, 10);
        if (Number.isNaN(year) || year < 2000 || year > 2100) {
            year = undefined;
        }
        const temaModo = (req.query.tema_modo || req.query.temaModo || 'mes_auto').toString();
        const temaPersonalizado = (req.query.tema || req.query.tema_personalizado || '').toString();
        const estilo = (req.query.estilo || 'padrao').toString().toLowerCase() === 'cunha' ? 'cunha' : 'padrao';
        const result = await bibleService.getDevocional365(day, {
            useAi,
            aiExplicitOff,
            year,
            temaModo,
            temaPersonalizado,
            estilo
        });
        if (!result) return responseFormatter.error(res, 'Devocional não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getDevocional365:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar devocional', 500);
    }
}

async function markDevotionalRead(req, res) {
    try {
        const userId = req.user ? req.user.userId : null;
        const body = req.body || {};
        const visitorId = body.visitor_id || body.visitorId || req.query.visitor_id;
        const dayOfYear = body.day_of_year || body.dayOfYear || req.query.day_of_year;
        const userNote = body.user_note || body.userNote;
        const slug = body.slug || req.query.slug;
        if (!dayOfYear) return responseFormatter.error(res, 'day_of_year é obrigatório', 400);
        if (!userId && !visitorId) return responseFormatter.error(res, 'Faça login ou informe visitor_id (ex: localStorage)', 400);
        const result = await bibleService.markDevotionalRead({
            userId,
            visitorId: visitorId || null,
            dayOfYear,
            userNote,
            slug
        });
        return responseFormatter.success(res, result, 'Devocional marcado como lido.');
    } catch (e) {
        logger.error('bible markDevotionalRead:', e);
        return responseFormatter.error(res, e.message || 'Erro ao marcar devocional', 400);
    }
}

async function getDevotionalReadStatus(req, res) {
    try {
        const userId = req.user ? req.user.userId : null;
        const visitorId = req.query.visitor_id || req.body?.visitor_id || req.body?.visitorId;
        const days = req.query.days || req.query.day_of_year;
        if (!userId && !visitorId) {
            return responseFormatter.success(res, { read: [] });
        }
        const read = await bibleService.getDevotionalReadStatus(userId, visitorId || null, days);
        return responseFormatter.success(res, { read });
    } catch (e) {
        logger.error('bible getDevotionalReadStatus:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar status', 500);
    }
}

async function getReadingPlan(req, res) {
    try {
        const list = await bibleService.getReadingPlanList();
        return responseFormatter.success(res, { days: list });
    } catch (e) {
        logger.error('bible getReadingPlan:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar plano', 500);
    }
}

async function getReadingPlanDay(req, res) {
    try {
        const day = parseInt(req.params.day, 10);
        if (day < 1 || day > 365) return responseFormatter.error(res, 'Dia deve ser entre 1 e 365', 400);
        const result = await bibleService.getReadingPlanDay(day);
        if (!result) return responseFormatter.error(res, 'Dia do plano não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getReadingPlanDay:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar dia', 500);
    }
}

async function getStudyBooks(req, res) {
    try {
        const books = await bibleService.getStudyBooks();
        return responseFormatter.success(res, { books });
    } catch (e) {
        logger.error('bible getStudyBooks:', e);
        return responseFormatter.error(res, e.message || 'Erro ao listar livros com estudo', 500);
    }
}

async function getBookStudy(req, res) {
    try {
        const bookId = (req.params.bookId || '').trim().toLowerCase();
        if (!bookId) return responseFormatter.error(res, 'bookId obrigatório', 400);
        const study = await bibleService.getBookStudy(bookId);
        if (!study) return responseFormatter.error(res, 'Estudo do livro não encontrado', 404);
        return responseFormatter.success(res, study);
    } catch (e) {
        logger.error('bible getBookStudy:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar estudo', 500);
    }
}

async function getChapterStudy(req, res) {
    try {
        const bookId = (req.params.bookId || '').trim().toLowerCase();
        const chapterNum = parseInt(req.params.chapter, 10);
        if (!bookId) return responseFormatter.error(res, 'bookId obrigatório', 400);
        if (chapterNum < 1) return responseFormatter.error(res, 'Capítulo inválido', 400);
        const study = await bibleService.getChapterStudy(bookId, chapterNum);
        if (!study) return responseFormatter.error(res, 'Estudo do capítulo não encontrado', 404);
        return responseFormatter.success(res, study);
    } catch (e) {
        logger.error('bible getChapterStudy:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar estudo', 500);
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

module.exports = {
    getVerseOfDay,
    getNumbers,
    getNameMeaning,
    getPalavraDoDia,
    getSalmoDoDia,
    getDevocionalDoDia,
    getDevocionalBibliaInteira,
    getDevocional365,
    markDevotionalRead,
    getDevotionalReadStatus,
    getReadingPlan,
    getReadingPlanDay,
    getStudyBooks,
    getBookStudy,
    getChapterStudy,
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
    resetProgress,
    getConfig,
    saveConfig
};
