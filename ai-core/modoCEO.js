/**
 * MODO CEO / CÉREBRO
 * 
 * Analisa o próprio nível de maturidade da IA:
 * - Pontos fortes
 * - Pontos fracos
 * - Sugestões de próximos treinamentos
 * - Evolução do conhecimento
 */

const db = require('../db');
const memoryStore = require('./memory/memoryStore');

/**
 * Analisa a maturidade da IA
 * 
 * @param {object} context - Contexto (adminId, etc)
 * @returns {Promise<object>}
 */
async function analisarMaturidade(context = {}) {
    try {
        // Coletar dados
        const memoryStats = await memoryStore.obterEstatisticasMemoria();
        const conversationStats = await obterEstatisticasConversas();
        const trainingStats = await obterEstatisticasTreinamento();
        const knowledgeStats = await obterEstatisticasConhecimento();
        
        // Calcular maturidade
        const maturity = calcularMaturidade({
            memory: memoryStats,
            conversations: conversationStats,
            training: trainingStats,
            knowledge: knowledgeStats
        });
        
        // Identificar pontos fortes
        const strengths = identificarPontosFortes({
            memory: memoryStats,
            conversations: conversationStats,
            training: trainingStats
        });
        
        // Identificar pontos fracos
        const weaknesses = identificarPontosFracos({
            memory: memoryStats,
            conversations: conversationStats,
            training: trainingStats
        });
        
        // Gerar recomendações
        const recommendations = gerarRecomendacoes({
            maturity,
            strengths,
            weaknesses,
            stats: {
                memory: memoryStats,
                conversations: conversationStats,
                training: trainingStats
            }
        });
        
        // Salvar análise
        const analysisId = await salvarAnalise({
            analysisType: 'full',
            maturity,
            strengths,
            weaknesses,
            recommendations,
            stats: {
                memory: memoryStats,
                conversations: conversationStats,
                training: trainingStats,
                knowledge: knowledgeStats
            },
            adminId: context.adminId
        });
        
        return {
            maturity,
            strengths,
            weaknesses,
            recommendations,
            stats: {
                memory: memoryStats,
                conversations: conversationStats,
                training: trainingStats,
                knowledge: knowledgeStats
            },
            analysisId
        };
    } catch (error) {
        console.error('Erro ao analisar maturidade:', error);
        throw error;
    }
}

/**
 * Calcula nível de maturidade
 */
function calcularMaturidade(data) {
    let score = 0;
    let factors = [];
    
    // Fator 1: Tamanho da memória (0-25 pontos)
    const memorySize = data.memory.reduce((sum, m) => sum + parseInt(m.total || 0), 0);
    const memoryScore = Math.min(25, (memorySize / 100) * 25);
    score += memoryScore;
    factors.push({ name: 'Memória', score: memoryScore, max: 25 });
    
    // Fator 2: Taxa de sucesso nas conversas (0-25 pontos)
    const avgSuccess = parseFloat(data.conversations.avg_success_rate || 0);
    const successScore = (avgSuccess / 100) * 25;
    score += successScore;
    factors.push({ name: 'Taxa de Sucesso', score: successScore, max: 25 });
    
    // Fator 3: Treinamento supervisionado (0-25 pontos)
    const trainingCount = parseInt(data.training.total || 0);
    const trainingScore = Math.min(25, (trainingCount / 50) * 25);
    score += trainingScore;
    factors.push({ name: 'Treinamento', score: trainingScore, max: 25 });
    
    // Fator 4: Diversidade de conhecimento (0-25 pontos)
    const knowledgeDiversity = data.knowledge.categories || 0;
    const diversityScore = Math.min(25, (knowledgeDiversity / 10) * 25);
    score += diversityScore;
    factors.push({ name: 'Diversidade', score: diversityScore, max: 25 });
    
    // Determinar nível
    let level = 'beginner';
    if (score >= 75) level = 'expert';
    else if (score >= 50) level = 'advanced';
    else if (score >= 25) level = 'intermediate';
    
    return {
        level,
        score: Math.round(score),
        maxScore: 100,
        factors
    };
}

/**
 * Identifica pontos fortes
 */
function identificarPontosFortes(data) {
    const strengths = [];
    
    // Memória grande
    const totalMemory = data.memory.reduce((sum, m) => sum + parseInt(m.total || 0), 0);
    if (totalMemory > 100) {
        strengths.push({
            area: 'Memória',
            description: `Possui ${totalMemory} itens na memória, demonstrando conhecimento extenso`,
            impact: 'high'
        });
    }
    
    // Alta taxa de sucesso
    const avgSuccess = parseFloat(data.conversations.avg_success_rate || 0);
    if (avgSuccess > 80) {
        strengths.push({
            area: 'Precisão',
            description: `Taxa de sucesso de ${avgSuccess.toFixed(1)}%, indicando respostas precisas`,
            impact: 'high'
        });
    }
    
    // Muito treinamento
    const trainingCount = parseInt(data.training.total || 0);
    if (trainingCount > 20) {
        strengths.push({
            area: 'Treinamento',
            description: `${trainingCount} treinamentos supervisionados realizados, garantindo qualidade`,
            impact: 'medium'
        });
    }
    
    // Feedback positivo
    const positiveFeedback = parseInt(data.conversations.positive_feedback || 0);
    if (positiveFeedback > 50) {
        strengths.push({
            area: 'Satisfação',
            description: `${positiveFeedback} feedbacks positivos, indicando satisfação dos usuários`,
            impact: 'high'
        });
    }
    
    return strengths.length > 0 ? strengths : [{
        area: 'Desenvolvimento',
        description: 'A IA está em fase inicial de desenvolvimento',
        impact: 'low'
    }];
}

/**
 * Identifica pontos fracos
 */
function identificarPontosFracos(data) {
    const weaknesses = [];
    
    // Memória pequena
    const totalMemory = data.memory.reduce((sum, m) => sum + parseInt(m.total || 0), 0);
    if (totalMemory < 50) {
        weaknesses.push({
            area: 'Memória',
            description: `Apenas ${totalMemory} itens na memória. Precisa de mais conhecimento`,
            impact: 'high',
            priority: 'high'
        });
    }
    
    // Baixa taxa de sucesso
    const avgSuccess = parseFloat(data.conversations.avg_success_rate || 0);
    if (avgSuccess < 60) {
        weaknesses.push({
            area: 'Precisão',
            description: `Taxa de sucesso de ${avgSuccess.toFixed(1)}% está abaixo do ideal`,
            impact: 'high',
            priority: 'high'
        });
    }
    
    // Pouco treinamento
    const trainingCount = parseInt(data.training.total || 0);
    if (trainingCount < 10) {
        weaknesses.push({
            area: 'Treinamento',
            description: `Apenas ${trainingCount} treinamentos. Precisa de mais supervisão`,
            impact: 'medium',
            priority: 'medium'
        });
    }
    
    // Feedback negativo
    const negativeFeedback = parseInt(data.conversations.negative_feedback || 0);
    if (negativeFeedback > 10) {
        weaknesses.push({
            area: 'Satisfação',
            description: `${negativeFeedback} feedbacks negativos. Precisa melhorar respostas`,
            impact: 'high',
            priority: 'high'
        });
    }
    
    return weaknesses;
}

/**
 * Gera recomendações
 */
function gerarRecomendacoes(data) {
    const recommendations = [];
    
    // Recomendações baseadas em maturidade
    if (data.maturity.level === 'beginner') {
        recommendations.push({
            type: 'training',
            title: 'Treinamento Inicial Intensivo',
            description: 'Realize treinamentos supervisionados para estabelecer base sólida',
            priority: 'high',
            estimatedImpact: 'high'
        });
        
        recommendations.push({
            type: 'knowledge',
            title: 'Expandir Base de Conhecimento',
            description: 'Adicione mais conhecimento sobre o produto e casos de uso',
            priority: 'high',
            estimatedImpact: 'high'
        });
    } else if (data.maturity.level === 'intermediate') {
        recommendations.push({
            type: 'optimization',
            title: 'Otimizar Respostas Existentes',
            description: 'Melhore respostas com base em feedback dos usuários',
            priority: 'medium',
            estimatedImpact: 'medium'
        });
    } else if (data.maturity.level === 'advanced') {
        recommendations.push({
            type: 'refinement',
            title: 'Refinar Detalhes',
            description: 'Foque em melhorias incrementais e especialização',
            priority: 'low',
            estimatedImpact: 'low'
        });
    }
    
    // Recomendações baseadas em pontos fracos
    for (const weakness of data.weaknesses) {
        if (weakness.priority === 'high') {
            recommendations.push({
                type: 'fix',
                title: `Corrigir: ${weakness.area}`,
                description: weakness.description,
                priority: 'high',
                estimatedImpact: 'high'
            });
        }
    }
    
    return recommendations;
}

/**
 * Obtém estatísticas de conversas
 */
async function obterEstatisticasConversas() {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                AVG(confidence_score) as avg_success_rate,
                COUNT(CASE WHEN user_feedback = 1 THEN 1 END) as positive_feedback,
                COUNT(CASE WHEN user_feedback = -1 THEN 1 END) as negative_feedback
            FROM ia_conversations
            WHERE created_at > NOW() - INTERVAL '30 days'
        `;
        
        const result = await db.query(query);
        return result.rows[0] || {};
    } catch (error) {
        console.error('Erro ao obter estatísticas de conversas:', error);
        return {};
    }
}

/**
 * Obtém estatísticas de treinamento
 */
async function obterEstatisticasTreinamento() {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied,
                COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority
            FROM ai_core_supervised_training
        `;
        
        const result = await db.query(query);
        return result.rows[0] || {};
    } catch (error) {
        console.error('Erro ao obter estatísticas de treinamento:', error);
        return {};
    }
}

/**
 * Obtém estatísticas de conhecimento
 */
async function obterEstatisticasConhecimento() {
    try {
        const query = `
            SELECT 
                COUNT(DISTINCT memory_type) as categories,
                COUNT(*) as total_items,
                AVG(success_rate) as avg_success_rate
            FROM ai_core_memory
            WHERE is_active = true
        `;
        
        const result = await db.query(query);
        return result.rows[0] || {};
    } catch (error) {
        console.error('Erro ao obter estatísticas de conhecimento:', error);
        return {};
    }
}

/**
 * Salva análise no banco
 */
async function salvarAnalise(data) {
    try {
        const query = `
            INSERT INTO ai_core_analysis (
                analysis_type,
                analysis_result,
                strengths,
                weaknesses,
                recommendations,
                maturity_level,
                overall_score,
                analyzed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        
        const result = await db.query(query, [
            data.analysisType,
            JSON.stringify(data.stats),
            data.strengths.map(s => s.description),
            data.weaknesses.map(w => w.description),
            data.recommendations.map(r => r.description),
            data.maturity.level,
            data.maturity.score,
            data.adminId
        ]);
        
        return result.rows[0].id;
    } catch (error) {
        console.error('Erro ao salvar análise:', error);
        throw error;
    }
}

module.exports = {
    analisarMaturidade
};

