// ============================================
// SISTEMA DE EMBEDDINGS VETORIAIS (RAG)
// ============================================
// Implementa geração e busca por embeddings vetoriais
// Similar ao ChatGPT - busca semântica

const crypto = require('crypto');
const db = require('../db');

// ============================================
// FUNÇÕES DE EMBEDDING
// ============================================

/**
 * Gerar hash do texto para cache
 */
function generateTextHash(text) {
    return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

/**
 * Gerar embedding usando API gratuita (ou local)
 * Por enquanto, usa uma abordagem simples baseada em TF-IDF
 * Futuramente pode ser integrado com OpenAI, Cohere, ou modelo local
 */
async function generateEmbedding(text, model = 'simple') {
    try {
        // Verificar cache primeiro
        const textHash = generateTextHash(text);
        const cached = await getCachedEmbedding(textHash);
        if (cached) {
            return cached;
        }
        
        // Por enquanto, usar embedding simples baseado em palavras-chave
        // TODO: Integrar com API de embeddings (OpenAI, Cohere, ou modelo local)
        const embedding = generateSimpleEmbedding(text);
        
        // Salvar no cache
        await cacheEmbedding(textHash, text, embedding, model);
        
        return embedding;
    } catch (error) {
        console.error('Erro ao gerar embedding:', error);
        // Retornar embedding vazio em caso de erro
        return new Array(1536).fill(0);
    }
}

/**
 * Gerar embedding simples (temporário até integrar API real)
 * Baseado em frequência de palavras e características do texto
 */
function generateSimpleEmbedding(text) {
    // Normalizar texto
    const normalized = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const words = normalized.split(' ');
    const wordFreq = {};
    
    // Calcular frequência de palavras
    words.forEach(word => {
        if (word.length > 2) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });
    
    // Criar vetor de 1536 dimensões (padrão OpenAI)
    const embedding = new Array(1536).fill(0);
    
    // Preencher com características do texto
    let index = 0;
    const features = [
        text.length,
        words.length,
        Object.keys(wordFreq).length,
        ...Object.values(wordFreq).slice(0, 100),
        ...words.slice(0, 200).map(w => w.charCodeAt(0) % 1000),
        ...Array(1536 - 303).fill(0)
    ];
    
    features.forEach((val, i) => {
        if (i < 1536) {
            embedding[i] = val / 1000; // Normalizar
        }
    });
    
    return embedding;
}

/**
 * Buscar embedding no cache
 */
async function getCachedEmbedding(textHash) {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT embedding, text_content
            FROM ia_embedding_cache
            WHERE text_hash = $1
        `, [textHash]);
        
        if (result.rows.length > 0) {
            // Atualizar last_used_at
            await client.query(`
                UPDATE ia_embedding_cache
                SET last_used_at = CURRENT_TIMESTAMP
                WHERE text_hash = $1
            `, [textHash]);
            
            return result.rows[0].embedding;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao buscar cache de embedding:', error);
        return null;
    } finally {
        client.release();
    }
}

/**
 * Salvar embedding no cache
 */
async function cacheEmbedding(textHash, text, embedding, model = 'simple') {
    const client = await db.pool.connect();
    try {
        // Limitar tamanho do texto para cache (primeiros 1000 caracteres)
        const textToCache = text.substring(0, 1000);
        
        await client.query(`
            INSERT INTO ia_embedding_cache (text_hash, text_content, embedding, model_name)
            VALUES ($1, $2, $3::vector, $4)
            ON CONFLICT (text_hash) DO UPDATE SET
                last_used_at = CURRENT_TIMESTAMP
        `, [textHash, textToCache, JSON.stringify(embedding), model]);
    } catch (error) {
        console.error('Erro ao salvar cache de embedding:', error);
        // Não falhar se cache não funcionar
    } finally {
        client.release();
    }
}

/**
 * Buscar conhecimento por similaridade vetorial (RAG)
 */
async function searchByVectorSimilarity(question, limit = 5, client) {
    try {
        // Gerar embedding da pergunta
        const questionEmbedding = await generateEmbedding(question);
        
        // Buscar conhecimentos com embeddings similares
        const result = await client.query(`
            SELECT 
                kb.*,
                1 - (kb.embedding <=> $1::vector) as similarity
            FROM ia_knowledge_base kb
            WHERE kb.is_active = true
            AND kb.embedding IS NOT NULL
            ORDER BY kb.embedding <=> $1::vector
            LIMIT $2
        `, [JSON.stringify(questionEmbedding), limit]);
        
        // Filtrar por similaridade mínima (0.7 = 70%)
        const filtered = result.rows.filter(r => r.similarity >= 0.7);
        
        return filtered;
    } catch (error) {
        console.error('Erro ao buscar por similaridade vetorial:', error);
        // Se der erro (ex: extensão pgvector não instalada), retornar vazio
        return [];
    }
}

/**
 * Gerar e salvar embedding para um conhecimento
 */
async function generateAndSaveEmbedding(knowledgeId, text, client) {
    try {
        const embedding = await generateEmbedding(text);
        
        await client.query(`
            UPDATE ia_knowledge_base
            SET embedding = $1::vector
            WHERE id = $2
        `, [JSON.stringify(embedding), knowledgeId]);
        
        return embedding;
    } catch (error) {
        console.error(`Erro ao salvar embedding para conhecimento ${knowledgeId}:`, error);
        return null;
    }
}

/**
 * Gerar embeddings para todo conhecimento sem embedding
 */
async function generateEmbeddingsForAllKnowledge(client) {
    try {
        // Buscar conhecimentos sem embedding
        const result = await client.query(`
            SELECT id, title, content
            FROM ia_knowledge_base
            WHERE is_active = true
            AND (embedding IS NULL OR embedding = '[]'::vector)
            AND content IS NOT NULL
            AND content != ''
            LIMIT 100
        `);
        
        console.log(`📊 [EMBEDDINGS] Gerando embeddings para ${result.rows.length} conhecimentos...`);
        
        let generated = 0;
        for (const kb of result.rows) {
            const text = `${kb.title || ''} ${kb.content || ''}`.trim();
            if (text.length > 10) {
                await generateAndSaveEmbedding(kb.id, text, client);
                generated++;
                
                if (generated % 10 === 0) {
                    console.log(`📊 [EMBEDDINGS] ${generated}/${result.rows.length} embeddings gerados...`);
                }
            }
        }
        
        console.log(`✅ [EMBEDDINGS] ${generated} embeddings gerados com sucesso!`);
        return generated;
    } catch (error) {
        console.error('Erro ao gerar embeddings em lote:', error);
        return 0;
    }
}

module.exports = {
    generateEmbedding,
    generateAndSaveEmbedding,
    searchByVectorSimilarity,
    generateEmbeddingsForAllKnowledge,
    generateTextHash
};

