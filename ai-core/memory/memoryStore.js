/**
 * MEMORY STORE
 * 
 * Sistema de memória persistente para a ConectaKing AI Core.
 * Armazena e recupera conhecimento de forma estruturada.
 */

const db = require('../../db');

/**
 * Estrutura da memória
 */
const MEMORY_STRUCTURE = {
    conhecimento_produto: 'knowledge_product',
    duvidas_frequentes: 'faq',
    estrategias_validadas: 'validated_strategies',
    copies_alta_conversao: 'high_converting_copies',
    padroes_venda: 'sales_patterns',
    erros_sistema: 'system_errors',
    solucoes_confirmadas: 'confirmed_solutions',
    aprendizados_admin: 'admin_learnings'
};

/**
 * Consulta a memória antes de responder
 * 
 * @param {string} query - Consulta/palavras-chave
 * @param {string} category - Categoria da memória (opcional)
 * @returns {Promise<array>} - Array de itens de memória relevantes
 */
async function consultarMemoria(query, category = null) {
    try {
        const keywords = extrairKeywords(query);
        
        let querySQL = `
            SELECT 
                id,
                memory_type,
                title,
                content,
                keywords,
                metadata,
                usage_count,
                success_rate,
                priority,
                created_at,
                updated_at
            FROM ai_core_memory
            WHERE is_active = true
            AND (
                keywords && $1::text[]
                OR content ILIKE ANY($2::text[])
                OR title ILIKE ANY($2::text[])
            )
        `;
        
        const params = [keywords];
        const likePatterns = keywords.map(k => `%${k}%`);
        params.push(likePatterns);
        
        if (category && MEMORY_STRUCTURE[category]) {
            querySQL += ` AND memory_type = $3`;
            params.push(MEMORY_STRUCTURE[category]);
        }
        
        querySQL += `
            ORDER BY 
                CASE WHEN keywords && $1::text[] THEN 1 ELSE 2 END,
                priority DESC,
                success_rate DESC,
                usage_count DESC
            LIMIT 10
        `;
        
        const result = await db.query(querySQL, params);
        return result.rows;
    } catch (error) {
        console.error('Erro ao consultar memória:', error);
        return [];
    }
}

/**
 * Atualiza a memória após uma resposta bem-sucedida
 * 
 * @param {object} memoryData - Dados para salvar na memória
 * @returns {Promise<number>} - ID do item salvo
 */
async function atualizarMemoria(memoryData) {
    try {
        const {
            memoryType,
            title,
            content,
            keywords = [],
            metadata = {},
            priority = 50,
            source = 'user_interaction'
        } = memoryData;
        
        // Verificar se já existe memória similar
        const existing = await buscarMemoriaSimilar(content, memoryType);
        
        if (existing && existing.length > 0) {
            // Atualizar memória existente
            const existingItem = existing[0];
            
            const updateQuery = `
                UPDATE ai_core_memory
                SET 
                    usage_count = usage_count + 1,
                    success_rate = CASE 
                        WHEN success_rate = 0 THEN 80
                        ELSE (success_rate + 80) / 2
                    END,
                    updated_at = CURRENT_TIMESTAMP,
                    metadata = $1::jsonb
                WHERE id = $2
                RETURNING id
            `;
            
            const result = await db.query(updateQuery, [
                JSON.stringify({ ...existingItem.metadata, ...metadata }),
                existingItem.id
            ]);
            
            return result.rows[0].id;
        } else {
            // Criar nova entrada na memória
            const insertQuery = `
                INSERT INTO ai_core_memory (
                    memory_type,
                    title,
                    content,
                    keywords,
                    metadata,
                    priority,
                    source,
                    usage_count,
                    success_rate,
                    is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 80, true)
                RETURNING id
            `;
            
            const result = await db.query(insertQuery, [
                memoryType,
                title,
                content,
                keywords,
                JSON.stringify(metadata),
                priority,
                source,
            ]);
            
            return result.rows[0].id;
        }
    } catch (error) {
        console.error('Erro ao atualizar memória:', error);
        throw error;
    }
}

/**
 * Busca memória similar
 */
async function buscarMemoriaSimilar(content, memoryType) {
    try {
        const keywords = extrairKeywords(content);
        
        const query = `
            SELECT id, content, metadata
            FROM ai_core_memory
            WHERE memory_type = $1
            AND is_active = true
            AND (
                keywords && $2::text[]
                OR content ILIKE ANY($3::text[])
            )
            LIMIT 1
        `;
        
        const likePatterns = keywords.map(k => `%${k}%`);
        const result = await db.query(query, [memoryType, keywords, likePatterns]);
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao buscar memória similar:', error);
        return [];
    }
}

/**
 * Salva conhecimento do produto
 */
async function salvarConhecimentoProduto(data) {
    return await atualizarMemoria({
        memoryType: MEMORY_STRUCTURE.conhecimento_produto,
        title: data.title,
        content: data.content,
        keywords: data.keywords || [],
        metadata: data.metadata || {},
        priority: 90,
        source: data.source || 'manual'
    });
}

/**
 * Salva dúvida frequente
 */
async function salvarDuvidaFrequente(data) {
    return await atualizarMemoria({
        memoryType: MEMORY_STRUCTURE.duvidas_frequentes,
        title: data.question,
        content: data.answer,
        keywords: data.keywords || [],
        metadata: {
            question: data.question,
            variations: data.variations || []
        },
        priority: 85,
        source: data.source || 'user_interaction'
    });
}

/**
 * Salva estratégia validada
 */
async function salvarEstrategiaValidada(data) {
    return await atualizarMemoria({
        memoryType: MEMORY_STRUCTURE.estrategias_validadas,
        title: data.title,
        content: data.content,
        keywords: data.keywords || [],
        metadata: {
            results: data.results || {},
            validation_date: new Date().toISOString()
        },
        priority: 80,
        source: data.source || 'validation'
    });
}

/**
 * Salva copy de alta conversão
 */
async function salvarCopyAltaConversao(data) {
    return await atualizarMemoria({
        memoryType: MEMORY_STRUCTURE.copies_alta_conversao,
        title: data.title || 'Copy de Alta Conversão',
        content: data.copy,
        keywords: data.keywords || [],
        metadata: {
            conversion_rate: data.conversionRate || 0,
            platform: data.platform || 'geral',
            context: data.context || {}
        },
        priority: 90,
        source: data.source || 'user_validation'
    });
}

/**
 * Salva padrão de venda
 */
async function salvarPadraoVenda(data) {
    return await atualizarMemoria({
        memoryType: MEMORY_STRUCTURE.padroes_venda,
        title: data.title,
        content: data.content,
        keywords: data.keywords || [],
        metadata: {
            success_rate: data.successRate || 0,
            context: data.context || {}
        },
        priority: 85,
        source: data.source || 'sales_analysis'
    });
}

/**
 * Salva erro do sistema
 */
async function salvarErroSistema(data) {
    return await atualizarMemoria({
        memoryType: MEMORY_STRUCTURE.erros_sistema,
        title: data.title || 'Erro do Sistema',
        content: data.description,
        keywords: data.keywords || [],
        metadata: {
            error_type: data.errorType,
            solution: data.solution || '',
            frequency: data.frequency || 1
        },
        priority: 70,
        source: 'system_diagnosis'
    });
}

/**
 * Salva solução confirmada
 */
async function salvarSolucaoConfirmada(data) {
    return await atualizarMemoria({
        memoryType: MEMORY_STRUCTURE.solucoes_confirmadas,
        title: data.title,
        content: data.solution,
        keywords: data.keywords || [],
        metadata: {
            problem: data.problem,
            confirmation_count: data.confirmationCount || 1
        },
        priority: 80,
        source: data.source || 'user_confirmation'
    });
}

/**
 * Salva aprendizado administrativo
 */
async function salvarAprendizadoAdmin(data) {
    return await atualizarMemoria({
        memoryType: MEMORY_STRUCTURE.aprendizados_admin,
        title: data.title,
        content: data.content,
        keywords: data.keywords || [],
        metadata: {
            admin_id: data.adminId,
            training_type: data.trainingType || 'supervised',
            priority_override: true
        },
        priority: 100, // Máxima prioridade para aprendizado admin
        source: 'admin_training'
    });
}

/**
 * Extrai keywords de um texto
 * Exportada para uso em outros módulos
 */
function extrairKeywords(text) {
    if (!text || typeof text !== 'string') return [];
    
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
                       'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem',
                       'que', 'qual', 'quais', 'como', 'quando', 'onde', 'porque',
                       'é', 'são', 'foi', 'ser', 'estar', 'ter', 'haver',
                       'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes'];
    
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return [...new Set(words)]; // Remove duplicatas
}

/**
 * Obtém estatísticas da memória
 */
async function obterEstatisticasMemoria() {
    try {
        const query = `
            SELECT 
                memory_type,
                COUNT(*) as total,
                AVG(success_rate) as avg_success_rate,
                SUM(usage_count) as total_usage
            FROM ai_core_memory
            WHERE is_active = true
            GROUP BY memory_type
            ORDER BY total DESC
        `;
        
        const result = await db.query(query);
        return result.rows;
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        return [];
    }
}

module.exports = {
    consultarMemoria,
    atualizarMemoria,
    salvarConhecimentoProduto,
    salvarDuvidaFrequente,
    salvarEstrategiaValidada,
    salvarCopyAltaConversao,
    salvarPadraoVenda,
    salvarErroSistema,
    salvarSolucaoConfirmada,
    salvarAprendizadoAdmin,
    obterEstatisticasMemoria,
    extrairKeywords,
    MEMORY_STRUCTURE
};

