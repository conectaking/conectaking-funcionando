/**
 * ROTEADOR PRINCIPAL DA IA
 * 
 * Orquestra todo o fluxo da ConectaKing AI Core:
 * 1. Carrega prompt mestre
 * 2. Classifica intenção
 * 3. Roteia para módulo correto
 * 4. Consulta memória
 * 5. Gera resposta
 * 6. Atualiza memória
 */

const { getSystemPrompt, getSystemPromptWithContext } = require('./systemPrompt');
const { classifyIntent, INTENT_TYPES, isAdminIntent } = require('./intentClassifier');
const memoryStore = require('./memory/memoryStore');

// Importar módulos
const atendimentoModule = require('./modules/atendimento');
const marketingModule = require('./modules/marketing');
const copywritingModule = require('./modules/copywriting');
const diagnosticoModule = require('./modules/diagnostico');
const redirecionamentoModule = require('./modules/redirecionamento');

/**
 * Processa uma mensagem do usuário e retorna resposta da IA
 * 
 * @param {string} message - Mensagem do usuário
 * @param {object} context - Contexto (userId, userRole, conversationHistory, etc)
 * @returns {Promise<object>} - { response: string, intent: string, confidence: number, metadata: object }
 */
async function processMessage(message, context = {}) {
    try {
        // 1. Carregar prompt mestre
        const systemPrompt = getSystemPromptWithContext(context);
        
        // 2. Classificar intenção
        const intentResult = classifyIntent(message, context);
        const { intent, confidence: intentConfidence, reasoning } = intentResult;
        
        // 3. Verificar se é admin para intenções especiais
        if (!isAdminIntent(intent, context.userRole)) {
            return {
                response: 'Esta funcionalidade está disponível apenas para administradores.',
                intent: 'forbidden',
                confidence: 1.0,
                metadata: { reason: 'admin_required' }
            };
        }
        
        // 4. Consultar memória antes de processar
        const memoryResults = await memoryStore.consultarMemoria(message);
        
        // 5. Rotear para módulo correto
        let moduleResult;
        
        switch (intent) {
            case INTENT_TYPES.ATENDIMENTO:
            case INTENT_TYPES.DUVIDA_PRODUTO:
            case INTENT_TYPES.DUVIDA_PAINEL:
                moduleResult = await atendimentoModule.processAtendimento(message, {
                    ...context,
                    memoryResults
                });
                break;
                
            case INTENT_TYPES.MARKETING:
                moduleResult = await marketingModule.processMarketing(message, {
                    ...context,
                    memoryResults
                });
                break;
                
            case INTENT_TYPES.COPY:
                moduleResult = await copywritingModule.processCopywriting(message, {
                    ...context,
                    memoryResults
                });
                break;
                
            case INTENT_TYPES.DIAGNOSTICO_SISTEMA:
                moduleResult = await diagnosticoModule.processDiagnostico(message, {
                    ...context,
                    memoryResults
                });
                break;
                
            case INTENT_TYPES.VENDAS:
            case INTENT_TYPES.ESTRATEGIA:
                // Vendas e estratégia podem usar módulo de marketing ou atendimento
                if (message.toLowerCase().includes('estratégia') || message.toLowerCase().includes('marketing')) {
                    moduleResult = await marketingModule.processMarketing(message, {
                        ...context,
                        memoryResults
                    });
                } else {
                    moduleResult = await atendimentoModule.processAtendimento(message, {
                        ...context,
                        memoryResults
                    });
                }
                break;
                
            case INTENT_TYPES.TREINAMENTO_ADMIN:
                // Treinamento será tratado em rotas separadas
                moduleResult = {
                    response: 'Modo de treinamento administrativo. Use as rotas específicas de treinamento.',
                    module: 'training',
                    confidence: 1.0
                };
                break;
                
            case INTENT_TYPES.MODO_CEO:
                // Modo CEO será tratado em rotas separadas
                moduleResult = {
                    response: 'Modo CEO/Cérebro. Use a rota específica para análise da IA.',
                    module: 'ceo',
                    confidence: 1.0
                };
                break;
                
            case INTENT_TYPES.FORA_DO_FOCO:
            default:
                moduleResult = redirecionamentoModule.processRedirecionamento(message, {
                    ...context,
                    memoryResults
                });
                break;
        }
        
        // 6. Aplicar prompt mestre à resposta final
        let finalResponse = moduleResult.response || moduleResult;
        
        // 7. Calcular confiança final
        const finalConfidence = Math.min(
            (intentConfidence + (moduleResult.confidence || 0.7)) / 2,
            0.95
        );
        
        // 8. Preparar metadata
        const metadata = {
            intent,
            intentReasoning: reasoning,
            module: moduleResult.module || 'unknown',
            knowledgeUsed: moduleResult.knowledgeUsed || [],
            memoryResultsCount: memoryResults.length,
            wasRedirected: moduleResult.wasRedirected || false
        };
        
        // 9. Salvar conversa no histórico (se configurado)
        if (context.userId && !context.skipHistory) {
            await salvarConversa({
                userId: context.userId,
                message,
                response: finalResponse,
                intent,
                confidence: finalConfidence,
                knowledgeUsed: metadata.knowledgeUsed
            });
        }
        
        return {
            response: finalResponse,
            intent,
            confidence: finalConfidence,
            metadata
        };
        
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        
        return {
            response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou entre em contato com o suporte.',
            intent: 'error',
            confidence: 0.0,
            metadata: {
                error: error.message
            }
        };
    }
}

/**
 * Salva conversa no histórico
 */
async function salvarConversa(data) {
    try {
        const db = require('../db');
        
        const query = `
            INSERT INTO ia_conversations (
                user_id,
                message,
                response,
                knowledge_used,
                confidence_score,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING id
        `;
        
        const result = await db.query(query, [
            data.userId,
            data.message,
            data.response,
            data.knowledgeUsed,
            data.confidence
        ]);
        
        return result.rows[0].id;
    } catch (error) {
        console.error('Erro ao salvar conversa:', error);
        // Não falhar se houver erro ao salvar histórico
    }
}

/**
 * Processa múltiplas mensagens (conversa)
 */
async function processConversation(messages, context = {}) {
    const results = [];
    
    for (const message of messages) {
        const result = await processMessage(message, {
            ...context,
            conversationHistory: results.map(r => ({
                role: 'user',
                content: r.message
            })).concat(results.map(r => ({
                role: 'assistant',
                content: r.response
            })))
        });
        
        results.push({
            message,
            ...result
        });
    }
    
    return results;
}

/**
 * Obtém estatísticas da IA
 */
async function getAIStats() {
    try {
        const memoryStats = await memoryStore.obterEstatisticasMemoria();
        
        // Obter estatísticas de conversas
        const db = require('../db');
        const conversationStats = await db.query(`
            SELECT 
                COUNT(*) as total_conversations,
                AVG(confidence_score) as avg_confidence,
                COUNT(CASE WHEN user_feedback = 1 THEN 1 END) as positive_feedback,
                COUNT(CASE WHEN user_feedback = -1 THEN 1 END) as negative_feedback
            FROM ia_conversations
            WHERE created_at > NOW() - INTERVAL '30 days'
        `);
        
        return {
            memory: memoryStats,
            conversations: conversationStats.rows[0] || {},
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        return {
            memory: [],
            conversations: {},
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    processMessage,
    processConversation,
    getAIStats
};

