/**
 * MÓDULO DE ATENDIMENTO
 * 
 * Responsável por:
 * - Explicar o produto ConectaKing
 * - Responder dúvidas sobre uso do cartão
 * - Explicar funcionalidades do painel
 * - Suporte técnico básico
 */

const db = require('../../db');
const { getSystemPrompt } = require('../systemPrompt');

/**
 * Processa uma solicitação de atendimento
 * 
 * @param {string} message - Mensagem do usuário
 * @param {object} context - Contexto (userId, histórico, etc)
 * @returns {Promise<object>} - { response: string, knowledgeUsed: array, confidence: number }
 */
async function processAtendimento(message, context = {}) {
    const { userId, conversationHistory = [] } = context;
    
    // Consultar memória para conhecimento relevante
    const knowledge = await consultarMemoria(message, 'atendimento');
    
    // Buscar em dúvidas frequentes
    const faq = await buscarFAQ(message);
    
    // Buscar em conversas anteriores similares
    const similarConversations = await buscarConversasSimilares(message, userId);
    
    // Construir resposta baseada no conhecimento encontrado
    let response = '';
    const knowledgeUsed = [];
    
    if (faq && faq.length > 0) {
        // Usar resposta de FAQ se encontrada
        const bestFAQ = faq[0];
        response = bestFAQ.answer;
        knowledgeUsed.push({ type: 'faq', id: bestFAQ.id });
    } else if (knowledge && knowledge.length > 0) {
        // Usar conhecimento da base
        const bestKnowledge = knowledge[0];
        response = construirRespostaConhecimento(bestKnowledge, message);
        knowledgeUsed.push({ type: 'knowledge', id: bestKnowledge.id });
    } else if (similarConversations && similarConversations.length > 0) {
        // Usar resposta de conversa similar
        const bestConversation = similarConversations[0];
        response = adaptarRespostaConversa(bestConversation, message);
        knowledgeUsed.push({ type: 'conversation', id: bestConversation.id });
    } else {
        // Resposta padrão quando não encontra conhecimento específico
        response = gerarRespostaPadrao(message);
    }
    
    // Aplicar prompt mestre e personalização
    response = aplicarPromptMestre(response, message, context);
    
    // Calcular confiança
    const confidence = calcularConfianca(knowledge, faq, similarConversations);
    
    return {
        response,
        knowledgeUsed,
        confidence,
        module: 'atendimento'
    };
}

/**
 * Consulta a memória para conhecimento relevante
 */
async function consultarMemoria(message, category) {
    try {
        const lowerMessage = message.toLowerCase();
        const keywords = extrairKeywords(lowerMessage);
        
        const query = `
            SELECT id, title, content, keywords, usage_count, priority
            FROM ia_knowledge_base
            WHERE is_active = true
            AND (
                keywords && $1::text[]
                OR content ILIKE ANY($2::text[])
                OR title ILIKE ANY($2::text[])
            )
            ORDER BY 
                CASE WHEN keywords && $1::text[] THEN 1 ELSE 2 END,
                priority DESC,
                usage_count DESC
            LIMIT 5
        `;
        
        const likePatterns = keywords.map(k => `%${k}%`);
        const result = await db.query(query, [keywords, likePatterns]);
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao consultar memória:', error);
        return [];
    }
}

/**
 * Busca em dúvidas frequentes (FAQ)
 */
async function buscarFAQ(message) {
    try {
        const lowerMessage = message.toLowerCase();
        const keywords = extrairKeywords(lowerMessage);
        
        const query = `
            SELECT id, question, answer, keywords, usage_count, success_rate
            FROM ia_qa
            WHERE is_active = true
            AND (
                keywords && $1::text[]
                OR question ILIKE ANY($2::text[])
            )
            ORDER BY 
                CASE WHEN keywords && $1::text[] THEN 1 ELSE 2 END,
                success_rate DESC,
                usage_count DESC
            LIMIT 3
        `;
        
        const likePatterns = keywords.map(k => `%${k}%`);
        const result = await db.query(query, [keywords, likePatterns]);
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao buscar FAQ:', error);
        return [];
    }
}

/**
 * Busca conversas anteriores similares
 */
async function buscarConversasSimilares(message, userId) {
    try {
        if (!userId) return [];
        
        const lowerMessage = message.toLowerCase();
        const keywords = extrairKeywords(lowerMessage);
        
        const query = `
            SELECT id, message, response, confidence_score, user_feedback
            FROM ia_conversations
            WHERE user_id = $1
            AND (
                message ILIKE ANY($2::text[])
                OR response ILIKE ANY($2::text[])
            )
            AND user_feedback >= 0
            ORDER BY 
                user_feedback DESC,
                confidence_score DESC,
                created_at DESC
            LIMIT 3
        `;
        
        const likePatterns = keywords.map(k => `%${k}%`);
        const result = await db.query(query, [userId, likePatterns]);
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao buscar conversas similares:', error);
        return [];
    }
}

/**
 * Constrói resposta baseada em conhecimento
 */
function construirRespostaConhecimento(knowledge, message) {
    let response = knowledge.content;
    
    // Personalizar resposta se necessário
    if (message.toLowerCase().includes('como')) {
        response = `Para fazer isso, ${response.toLowerCase()}`;
    }
    
    return response;
}

/**
 * Adapta resposta de conversa anterior
 */
function adaptarRespostaConversa(conversation, message) {
    return conversation.response;
}

/**
 * Gera resposta padrão quando não encontra conhecimento específico
 */
function gerarRespostaPadrao(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('conecta') || lowerMessage.includes('king')) {
        return `O ConectaKing é uma plataforma completa para criação de cartões virtuais profissionais. Você pode adicionar links, redes sociais, módulos personalizados e muito mais! Como posso ajudá-lo especificamente?`;
    }
    
    if (lowerMessage.includes('cartão') || lowerMessage.includes('cartao')) {
        return `O cartão virtual do ConectaKing permite que você compartilhe todas as suas informações de contato de forma profissional. Você pode personalizar completamente o design e adicionar diversos módulos. O que você gostaria de saber?`;
    }
    
    if (lowerMessage.includes('painel') || lowerMessage.includes('dashboard')) {
        return `No painel do ConectaKing você pode gerenciar seu cartão virtual, adicionar módulos, personalizar o design e muito mais. Qual funcionalidade específica você quer conhecer?`;
    }
    
    return `Entendo sua dúvida. Posso ajudá-lo com informações sobre o ConectaKing, como usar o cartão virtual, funcionalidades do painel, estratégias de vendas e muito mais. O que você gostaria de saber?`;
}

/**
 * Aplica o prompt mestre à resposta
 */
function aplicarPromptMestre(response, message, context) {
    // Adicionar tom profissional e focado
    const systemPrompt = getSystemPrompt();
    
    // A resposta já deve estar alinhada com o prompt mestre
    // Aqui podemos fazer ajustes finais de tom e estilo
    
    return response;
}

/**
 * Calcula a confiança da resposta
 */
function calcularConfianca(knowledge, faq, similarConversations) {
    if (faq && faq.length > 0) {
        return Math.min(0.95, 0.7 + (faq[0].success_rate || 0) / 100);
    }
    
    if (knowledge && knowledge.length > 0) {
        return 0.75;
    }
    
    if (similarConversations && similarConversations.length > 0) {
        return 0.7;
    }
    
    return 0.6; // Confiança baixa para resposta padrão
}

/**
 * Extrai keywords de uma mensagem
 */
function extrairKeywords(message) {
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
                       'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem',
                       'que', 'qual', 'quais', 'como', 'quando', 'onde', 'porque',
                       'é', 'são', 'foi', 'ser', 'estar', 'ter', 'haver',
                       'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes'];
    
    const words = message.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return [...new Set(words)]; // Remove duplicatas
}

module.exports = {
    processAtendimento
};

