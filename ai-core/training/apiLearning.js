/**
 * APRENDIZADO VIA API
 * 
 * Consome APIs externas de IA APENAS para aprendizado.
 * Converte respostas em padrões internos e salva localmente.
 * NUNCA depende da API para responder ao usuário.
 */

const db = require('../../db');
const memoryStore = require('../memory/memoryStore');
const fetch = require('node-fetch');

/**
 * Aprende de uma API externa
 * 
 * @param {object} learningData - Dados para aprendizado
 * @returns {Promise<object>}
 */
async function aprenderDeAPI(learningData) {
    const {
        query,
        apiType = 'openai', // 'openai', 'anthropic', 'google', etc
        context = {},
        convertToPattern = true
    } = learningData;
    
    try {
        // Chamar API externa (apenas para aprendizado)
        const apiResponse = await chamarAPIExterna(query, apiType, context);
        
        // Converter resposta em padrão interno
        if (convertToPattern) {
            const pattern = await converterParaPadraoInterno(apiResponse, query, context);
            
            // Salvar padrão na memória local
            await salvarPadraoAprendido(pattern, apiType);
            
            return {
                success: true,
                patternId: pattern.id,
                message: 'Padrão aprendido e salvo localmente'
            };
        }
        
        return {
            success: true,
            response: apiResponse,
            message: 'Resposta obtida da API (não salva)'
        };
    } catch (error) {
        console.error('Erro ao aprender de API:', error);
        throw error;
    }
}

/**
 * Chama API externa
 */
async function chamarAPIExterna(query, apiType, context) {
    // Esta função deve ser configurada com as credenciais da API
    // Por segurança, não incluímos as chaves aqui
    
    const apiConfig = {
        openai: {
            endpoint: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-3.5-turbo'
        },
        anthropic: {
            endpoint: process.env.ANTHROPIC_API_ENDPOINT || 'https://api.anthropic.com/v1/messages',
            model: 'claude-3-sonnet-20240229'
        }
    };
    
    const config = apiConfig[apiType];
    if (!config) {
        throw new Error(`Tipo de API não suportado: ${apiType}`);
    }
    
    // Verificar se há chave de API configurada
    const apiKey = process.env[`${apiType.toUpperCase()}_API_KEY`];
    if (!apiKey) {
        throw new Error(`Chave de API não configurada para ${apiType}`);
    }
    
    // Preparar prompt para aprendizado
    const systemPrompt = `Você é um assistente especializado em ConectaKing, vendas, marketing e copywriting. Responda de forma profissional e focada.`;
    
    const userPrompt = `Aprenda com esta pergunta e crie um padrão de resposta: ${query}`;
    
    try {
        if (apiType === 'openai') {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });
            
            const data = await response.json();
            return data.choices[0].message.content;
        }
        
        // Adicionar outros tipos de API conforme necessário
        
    } catch (error) {
        console.error(`Erro ao chamar API ${apiType}:`, error);
        throw error;
    }
}

/**
 * Converte resposta da API em padrão interno
 */
async function converterParaPadraoInterno(apiResponse, originalQuery, context) {
    // Extrair informações úteis da resposta
    const keywords = extrairKeywords(apiResponse);
    const category = identificarCategoria(originalQuery);
    
    // Criar padrão estruturado
    const pattern = {
        title: `Padrão aprendido: ${originalQuery.substring(0, 50)}`,
        content: apiResponse,
        keywords,
        category,
        source: 'api_learning',
        metadata: {
            originalQuery,
            context,
            learnedAt: new Date().toISOString()
        }
    };
    
    return pattern;
}

/**
 * Salva padrão aprendido na memória
 */
async function salvarPadraoAprendido(pattern, apiType) {
    try {
        // Determinar tipo de memória baseado na categoria
        let memoryType = 'validated_strategies';
        
        if (pattern.category === 'copy') {
            memoryType = 'high_converting_copies';
        } else if (pattern.category === 'sales') {
            memoryType = 'sales_patterns';
        } else if (pattern.category === 'product') {
            memoryType = 'knowledge_product';
        }
        
        // Salvar na memória
        const memoryId = await memoryStore.atualizarMemoria({
            memoryType,
            title: pattern.title,
            content: pattern.content,
            keywords: pattern.keywords,
            metadata: {
                ...pattern.metadata,
                apiSource: apiType
            },
            priority: 70, // Prioridade média para aprendizado via API
            source: `api_learning_${apiType}`
        });
        
        // Registrar no histórico de aprendizado
        await registrarAprendizado({
            patternId: memoryId,
            apiType,
            query: pattern.metadata.originalQuery
        });
        
        return memoryId;
    } catch (error) {
        console.error('Erro ao salvar padrão aprendido:', error);
        throw error;
    }
}

/**
 * Registra aprendizado no histórico
 */
async function registrarAprendizado(data) {
    try {
        const query = `
            INSERT INTO ai_core_api_learning_history (
                pattern_id,
                api_type,
                query,
                learned_at
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING id
        `;
        
        const result = await db.query(query, [
            data.patternId,
            data.apiType,
            data.query
        ]);
        
        return result.rows[0].id;
    } catch (error) {
        console.error('Erro ao registrar aprendizado:', error);
        // Não falhar se a tabela não existir
    }
}

/**
 * Extrai keywords de um texto
 */
function extrairKeywords(text) {
    if (!text || typeof text !== 'string') return [];
    
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
                       'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem',
                       'que', 'qual', 'quais', 'como', 'quando', 'onde', 'porque'];
    
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word));
    
    return [...new Set(words)];
}

/**
 * Identifica categoria da query
 */
function identificarCategoria(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('copy') || lowerQuery.includes('texto')) {
        return 'copy';
    } else if (lowerQuery.includes('venda') || lowerQuery.includes('vender')) {
        return 'sales';
    } else if (lowerQuery.includes('marketing') || lowerQuery.includes('divulgação')) {
        return 'marketing';
    } else if (lowerQuery.includes('conecta') || lowerQuery.includes('king') || lowerQuery.includes('produto')) {
        return 'product';
    } else if (lowerQuery.includes('estratégia') || lowerQuery.includes('estratégia')) {
        return 'strategy';
    }
    
    return 'general';
}

/**
 * Obtém histórico de aprendizado via API
 */
async function obterHistoricoAprendizado(filters = {}) {
    try {
        let query = `
            SELECT 
                al.id,
                al.pattern_id,
                al.api_type,
                al.query,
                al.learned_at,
                m.title,
                m.content
            FROM ai_core_api_learning_history al
            LEFT JOIN ai_core_memory m ON al.pattern_id = m.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        if (filters.apiType) {
            query += ` AND al.api_type = $${paramIndex}`;
            params.push(filters.apiType);
            paramIndex++;
        }
        
        if (filters.dateFrom) {
            query += ` AND al.learned_at >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }
        
        query += ` ORDER BY al.learned_at DESC LIMIT $${paramIndex}`;
        params.push(filters.limit || 50);
        
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        return [];
    }
}

module.exports = {
    aprenderDeAPI,
    obterHistoricoAprendizado
};

