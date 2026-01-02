/**
 * ROTAS DA CONECTAKING AI CORE
 * 
 * Rotas principais para a nova arquitetura da IA
 */

const express = require('express');
const router = express.Router();
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');

// Importar módulos da AI Core
const aiRouter = require('../ai-core/aiRouter');
const supervisedTraining = require('../ai-core/training/supervisedTraining');
const apiLearning = require('../ai-core/training/apiLearning');
const modoCEO = require('../ai-core/modoCEO');
const memoryStore = require('../ai-core/memory/memoryStore');

// ============================================
// ROTAS PÚBLICAS (requerem autenticação de usuário)
// ============================================

/**
 * POST /api/ai-core/chat
 * Chat principal da IA
 */
router.post('/chat', protectUser, asyncHandler(async (req, res) => {
    const { message, conversationHistory } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!message || typeof message !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Mensagem é obrigatória'
        });
    }
    
    const context = {
        userId,
        userRole,
        conversationHistory: conversationHistory || [],
        userName: req.user.name,
        userProfile: req.user
    };
    
    const result = await aiRouter.processMessage(message, context);
    
    res.json({
        success: true,
        ...result
    });
}));

/**
 * GET /api/ai-core/stats
 * Estatísticas da IA (usuário)
 */
router.get('/stats', protectUser, asyncHandler(async (req, res) => {
    const stats = await aiRouter.getAIStats();
    
    res.json({
        success: true,
        stats
    });
}));

// ============================================
// ROTAS ADMINISTRATIVAS
// ============================================

/**
 * POST /api/ai-core/training/correct
 * Corrigir resposta da IA (admin)
 */
router.post('/training/correct', protectAdmin, asyncHandler(async (req, res) => {
    const { conversationId, originalResponse, correctedResponse, reason, priority } = req.body;
    const adminId = req.user.id;
    
    if (!originalResponse || !correctedResponse) {
        return res.status(400).json({
            success: false,
            error: 'Resposta original e corrigida são obrigatórias'
        });
    }
    
    const result = await supervisedTraining.processarCorrecao({
        conversationId,
        originalResponse,
        correctedResponse,
        adminId,
        reason,
        priority: priority || 'high'
    });
    
    res.json({
        success: true,
        ...result
    });
}));

/**
 * POST /api/ai-core/training/rule
 * Inserir nova regra (admin)
 */
router.post('/training/rule', protectAdmin, asyncHandler(async (req, res) => {
    const { title, content, keywords, category, priority } = req.body;
    const adminId = req.user.id;
    
    if (!title || !content) {
        return res.status(400).json({
            success: false,
            error: 'Título e conteúdo são obrigatórios'
        });
    }
    
    const result = await supervisedTraining.inserirNovaRegra({
        title,
        content,
        keywords: keywords || [],
        category,
        adminId,
        priority: priority || 100
    });
    
    res.json({
        success: true,
        ...result
    });
}));

/**
 * POST /api/ai-core/training/pattern
 * Salvar padrão melhor (admin)
 */
router.post('/training/pattern', protectAdmin, asyncHandler(async (req, res) => {
    const { type, title, content, keywords, metadata } = req.body;
    const adminId = req.user.id;
    
    if (!type || !content) {
        return res.status(400).json({
            success: false,
            error: 'Tipo e conteúdo são obrigatórios'
        });
    }
    
    const result = await supervisedTraining.salvarPadraoMelhor({
        type,
        title,
        content,
        keywords: keywords || [],
        adminId,
        metadata: metadata || {}
    });
    
    res.json({
        success: true,
        ...result
    });
}));

/**
 * GET /api/ai-core/training/history
 * Histórico de treinamentos (admin)
 */
router.get('/training/history', protectAdmin, asyncHandler(async (req, res) => {
    const { adminId, dateFrom, dateTo, limit } = req.query;
    
    const history = await supervisedTraining.obterHistoricoTreinamento({
        adminId: adminId ? parseInt(adminId) : undefined,
        dateFrom,
        dateTo,
        limit: limit ? parseInt(limit) : 50
    });
    
    res.json({
        success: true,
        history
    });
}));

/**
 * GET /api/ai-core/training/rules
 * Obter regras ativas (admin)
 */
router.get('/training/rules', protectAdmin, asyncHandler(async (req, res) => {
    const rules = await supervisedTraining.obterRegrasAtivas();
    
    res.json({
        success: true,
        rules
    });
}));

/**
 * POST /api/ai-core/learning/api
 * Aprender de API externa (admin, apenas treino)
 */
router.post('/learning/api', protectAdmin, asyncHandler(async (req, res) => {
    const { query, apiType, context, convertToPattern } = req.body;
    
    if (!query) {
        return res.status(400).json({
            success: false,
            error: 'Query é obrigatória'
        });
    }
    
    const result = await apiLearning.aprenderDeAPI({
        query,
        apiType: apiType || 'openai',
        context: context || {},
        convertToPattern: convertToPattern !== false
    });
    
    res.json({
        success: true,
        ...result
    });
}));

/**
 * GET /api/ai-core/learning/history
 * Histórico de aprendizado via API (admin)
 */
router.get('/learning/history', protectAdmin, asyncHandler(async (req, res) => {
    const { apiType, dateFrom, limit } = req.query;
    
    const history = await apiLearning.obterHistoricoAprendizado({
        apiType,
        dateFrom,
        limit: limit ? parseInt(limit) : 50
    });
    
    res.json({
        success: true,
        history
    });
}));

/**
 * GET /api/ai-core/ceo/analyze
 * Modo CEO - Analisar maturidade da IA (admin)
 */
router.get('/ceo/analyze', protectAdmin, asyncHandler(async (req, res) => {
    const analysis = await modoCEO.analisarMaturidade({
        adminId: req.user.id
    });
    
    res.json({
        success: true,
        ...analysis
    });
}));

/**
 * GET /api/ai-core/memory/stats
 * Estatísticas da memória (admin)
 */
router.get('/memory/stats', protectAdmin, asyncHandler(async (req, res) => {
    const stats = await memoryStore.obterEstatisticasMemoria();
    
    res.json({
        success: true,
        stats
    });
}));

/**
 * POST /api/ai-core/memory/knowledge
 * Salvar conhecimento do produto (admin)
 */
router.post('/memory/knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const { title, content, keywords, metadata } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({
            success: false,
            error: 'Título e conteúdo são obrigatórios'
        });
    }
    
    const id = await memoryStore.salvarConhecimentoProduto({
        title,
        content,
        keywords: keywords || [],
        metadata: metadata || {},
        source: 'admin'
    });
    
    res.json({
        success: true,
        id,
        message: 'Conhecimento salvo com sucesso'
    });
}));

/**
 * POST /api/ai-core/memory/faq
 * Salvar dúvida frequente (admin)
 */
router.post('/memory/faq', protectAdmin, asyncHandler(async (req, res) => {
    const { question, answer, keywords, variations } = req.body;
    
    if (!question || !answer) {
        return res.status(400).json({
            success: false,
            error: 'Pergunta e resposta são obrigatórias'
        });
    }
    
    const id = await memoryStore.salvarDuvidaFrequente({
        question,
        answer,
        keywords: keywords || [],
        variations: variations || [],
        source: 'admin'
    });
    
    res.json({
        success: true,
        id,
        message: 'FAQ salva com sucesso'
    });
}));

/**
 * POST /api/ai-core/memory/copy
 * Salvar copy de alta conversão (admin)
 */
router.post('/memory/copy', protectAdmin, asyncHandler(async (req, res) => {
    const { title, copy, keywords, conversionRate, platform, context } = req.body;
    
    if (!copy) {
        return res.status(400).json({
            success: false,
            error: 'Copy é obrigatória'
        });
    }
    
    const id = await memoryStore.salvarCopyAltaConversao({
        title,
        copy,
        keywords: keywords || [],
        conversionRate: conversionRate || 0,
        platform: platform || 'geral',
        context: context || {},
        source: 'admin'
    });
    
    res.json({
        success: true,
        id,
        message: 'Copy salva com sucesso'
    });
}));

module.exports = router;

