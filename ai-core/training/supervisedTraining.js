/**
 * TREINAMENTO SUPERVISIONADO
 * 
 * Permite que administradores:
 * - Corrijam respostas da IA
 * - Inseram novas regras
 * - Salvem padrões melhores
 * - Substituam comportamentos antigos
 * 
 * Este treino tem PRIORIDADE MÁXIMA sobre qualquer outro aprendizado.
 */

const db = require('../../db');
const memoryStore = require('../memory/memoryStore');

/**
 * Processa correção de resposta pelo admin
 * 
 * @param {object} correctionData - Dados da correção
 * @returns {Promise<object>} - Resultado do treinamento
 */
async function processarCorrecao(correctionData) {
    const {
        conversationId,
        originalResponse,
        correctedResponse,
        adminId,
        reason,
        priority = 'high'
    } = correctionData;
    
    try {
        // Salvar correção no banco
        const correctionId = await salvarCorrecao({
            conversationId,
            originalResponse,
            correctedResponse,
            adminId,
            reason,
            priority
        });
        
    // Aplicar correção imediatamente na memória
    await aplicarCorrecaoMemoria({
        originalResponse,
        correctedResponse,
        reason,
        priority,
        adminId
    });
        
        // Se a correção é de alta prioridade, substituir conhecimento antigo
        if (priority === 'critical' || priority === 'high') {
            await substituirConhecimentoAntigo({
                originalResponse,
                correctedResponse,
                reason
            });
        }
        
        return {
            success: true,
            correctionId,
            message: 'Correção aplicada com sucesso. A IA aprenderá com esta correção imediatamente.'
        };
    } catch (error) {
        console.error('Erro ao processar correção:', error);
        throw error;
    }
}

/**
 * Salva correção no banco de dados
 */
async function salvarCorrecao(data) {
    const query = `
        INSERT INTO ai_core_supervised_training (
            conversation_id,
            original_response,
            corrected_response,
            admin_id,
            reason,
            priority,
            status,
            applied_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'applied', CURRENT_TIMESTAMP)
        RETURNING id
    `;
    
    const result = await db.query(query, [
        data.conversationId,
        data.originalResponse,
        data.correctedResponse,
        data.adminId,
        data.reason,
        data.priority
    ]);
    
    return result.rows[0].id;
}

/**
 * Aplica correção na memória
 */
async function aplicarCorrecaoMemoria(data) {
    // Extrair keywords da resposta corrigida
    const keywords = memoryStore.extrairKeywords ? 
        memoryStore.extrairKeywords(data.correctedResponse) :
        data.correctedResponse.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    // Salvar como aprendizado administrativo (prioridade máxima)
    await memoryStore.salvarAprendizadoAdmin({
        title: `Correção: ${data.reason || 'Resposta corrigida'}`,
        content: data.correctedResponse,
        keywords,
        adminId: data.adminId,
        trainingType: 'correction',
        metadata: {
            originalResponse: data.originalResponse,
            reason: data.reason,
            priority: data.priority
        }
    });
}

/**
 * Substitui conhecimento antigo
 */
async function substituirConhecimentoAntigo(data) {
    try {
        // Buscar conhecimento similar à resposta original
        const query = `
            SELECT id, content, keywords
            FROM ai_core_memory
            WHERE is_active = true
            AND (
                content ILIKE $1
                OR keywords && $2::text[]
            )
            AND memory_type != 'admin_learnings'
        `;
        
        const keywords = data.originalResponse.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const result = await db.query(query, [
            `%${data.originalResponse.substring(0, 100)}%`,
            keywords
        ]);
        
        // Desativar conhecimento antigo
        if (result.rows.length > 0) {
            const updateQuery = `
                UPDATE ai_core_memory
                SET 
                    is_active = false,
                    replaced_by = (SELECT id FROM ai_core_memory WHERE memory_type = 'admin_learnings' ORDER BY id DESC LIMIT 1),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ANY($1::int[])
            `;
            
            const ids = result.rows.map(r => r.id);
            await db.query(updateQuery, [ids]);
        }
    } catch (error) {
        console.error('Erro ao substituir conhecimento antigo:', error);
    }
}

/**
 * Insere nova regra pelo admin
 * 
 * @param {object} ruleData - Dados da regra
 * @returns {Promise<object>}
 */
async function inserirNovaRegra(ruleData) {
    const {
        title,
        content,
        keywords = [],
        category,
        adminId,
        priority = 100
    } = ruleData;
    
    try {
        // Salvar como aprendizado administrativo
        const memoryId = await memoryStore.salvarAprendizadoAdmin({
            title,
            content,
            keywords,
            adminId,
            trainingType: 'new_rule',
            metadata: {
                category,
                priority
            }
        });
        
        // Salvar regra no banco
        const query = `
            INSERT INTO ai_core_training_rules (
                title,
                content,
                keywords,
                category,
                admin_id,
                priority,
                is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING id
        `;
        
        const result = await db.query(query, [
            title,
            content,
            keywords,
            category,
            adminId,
            priority
        ]);
        
        return {
            success: true,
            ruleId: result.rows[0].id,
            memoryId,
            message: 'Nova regra inserida com sucesso. A IA usará esta regra imediatamente.'
        };
    } catch (error) {
        console.error('Erro ao inserir nova regra:', error);
        throw error;
    }
}

/**
 * Salva padrão melhor pelo admin
 * 
 * @param {object} patternData - Dados do padrão
 * @returns {Promise<object>}
 */
async function salvarPadraoMelhor(patternData) {
    const {
        type, // 'strategy', 'copy', 'response', etc
        title,
        content,
        keywords = [],
        adminId,
        metadata = {}
    } = patternData;
    
    try {
        // Determinar tipo de memória baseado no tipo de padrão
        let memoryType = 'validated_strategies';
        if (type === 'copy') memoryType = 'high_converting_copies';
        else if (type === 'sales') memoryType = 'sales_patterns';
        
        // Salvar na memória com alta prioridade
        const memoryId = await memoryStore.atualizarMemoria({
            memoryType,
            title,
            content,
            keywords,
            metadata: {
                ...metadata,
            },
            priority: 95,
            source: 'admin_pattern'
        });
        
        return {
            success: true,
            memoryId,
            message: 'Padrão salvo com sucesso. A IA usará este padrão como referência.'
        };
    } catch (error) {
        console.error('Erro ao salvar padrão:', error);
        throw error;
    }
}

/**
 * Obtém histórico de treinamentos
 * 
 * @param {object} filters - Filtros (adminId, date, etc)
 * @returns {Promise<array>}
 */
async function obterHistoricoTreinamento(filters = {}) {
    try {
        let query = `
            SELECT 
                id,
                conversation_id,
                original_response,
                corrected_response,
                admin_id,
                reason,
                priority,
                status,
                applied_at,
                created_at
            FROM ai_core_supervised_training
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        if (filters.adminId) {
            query += ` AND admin_id = $${paramIndex}`;
            params.push(filters.adminId);
            paramIndex++;
        }
        
        if (filters.dateFrom) {
            query += ` AND created_at >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }
        
        if (filters.dateTo) {
            query += ` AND created_at <= $${paramIndex}`;
            params.push(filters.dateTo);
            paramIndex++;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
        params.push(filters.limit || 50);
        
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        return [];
    }
}

/**
 * Obtém regras ativas
 */
async function obterRegrasAtivas() {
    try {
        const query = `
            SELECT 
                id,
                title,
                content,
                keywords,
                category,
                priority,
                created_at
            FROM ai_core_training_rules
            WHERE is_active = true
            ORDER BY priority DESC, created_at DESC
        `;
        
        const result = await db.query(query);
        return result.rows;
    } catch (error) {
        console.error('Erro ao obter regras:', error);
        return [];
    }
}

module.exports = {
    processarCorrecao,
    inserirNovaRegra,
    salvarPadraoMelhor,
    obterHistoricoTreinamento,
    obterRegrasAtivas
};

