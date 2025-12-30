const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Rate limiting para IA
const iaLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 20, // 20 requisições por minuto
    message: 'Muitas requisições. Aguarde um momento antes de tentar novamente.'
});

// Configuração de upload para documentos
const upload = multer({
    dest: 'uploads/ia-documents/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Função auxiliar: Extrair palavras-chave de um texto
function extractKeywords(text) {
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por', 'que', 'é', 'são', 'foi', 'ser', 'estar', 'ter', 'tem', 'como', 'quando', 'onde', 'qual', 'quais'];
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word));
    return [...new Set(words)].slice(0, 20); // Máximo 20 palavras-chave únicas
}

// Função auxiliar: Calcular similaridade simples entre textos
function calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
}

// Função principal: Buscar melhor resposta
async function findBestAnswer(userMessage, userId) {
    const client = await db.pool.connect();
    try {
        const messageLower = userMessage.toLowerCase();
        const messageKeywords = extractKeywords(userMessage);
        
        // 1. Buscar em Q&A (perguntas e respostas)
        const qaQuery = `
            SELECT 
                id, question, answer, question_variations, keywords, usage_count, success_rate, priority
            FROM ia_qa
            WHERE is_active = true
            ORDER BY priority DESC, usage_count DESC, success_rate DESC
        `;
        const qaResult = await client.query(qaQuery);
        
        let bestMatch = null;
        let bestScore = 0;
        
        // Verificar similaridade com perguntas
        for (const qa of qaResult.rows) {
            let score = calculateSimilarity(messageLower, qa.question);
            
            // Verificar variações
            if (qa.question_variations && qa.question_variations.length > 0) {
                for (const variation of qa.question_variations) {
                    const varScore = calculateSimilarity(messageLower, variation.toLowerCase());
                    if (varScore > score) score = varScore;
                }
            }
            
            // Bônus por palavras-chave
            if (qa.keywords && qa.keywords.length > 0) {
                const keywordMatches = qa.keywords.filter(kw => 
                    messageKeywords.some(mk => mk.includes(kw) || kw.includes(mk))
                ).length;
                score += (keywordMatches / qa.keywords.length) * 20;
            }
            
            // Bônus por uso e sucesso
            score += (qa.usage_count * 0.1) + (qa.success_rate * 0.1);
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                    type: 'qa',
                    id: qa.id,
                    answer: qa.answer,
                    confidence: Math.min(score, 100)
                };
            }
        }
        
        // 2. Buscar na base de conhecimento
        const knowledgeQuery = `
            SELECT 
                id, title, content, keywords, priority, usage_count
            FROM ia_knowledge_base
            WHERE is_active = true
            ORDER BY priority DESC, usage_count DESC
        `;
        const knowledgeResult = await client.query(knowledgeQuery);
        
        for (const kb of knowledgeResult.rows) {
            let score = calculateSimilarity(messageLower, kb.title + ' ' + kb.content);
            
            // Bônus por palavras-chave
            if (kb.keywords && kb.keywords.length > 0) {
                const keywordMatches = kb.keywords.filter(kw => 
                    messageKeywords.some(mk => mk.includes(kw) || kw.includes(mk))
                ).length;
                score += (keywordMatches / kb.keywords.length) * 30;
            }
            
            score += (kb.usage_count * 0.1);
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                    type: 'knowledge',
                    id: kb.id,
                    answer: kb.content,
                    confidence: Math.min(score, 100)
                };
            }
        }
        
        // 3. Buscar em documentos processados (texto completo)
        const documentsQuery = `
            SELECT 
                id, title, extracted_text
            FROM ia_documents
            WHERE processed = true AND extracted_text IS NOT NULL
        `;
        const documentsResult = await client.query(documentsQuery);
        
        for (const doc of documentsResult.rows) {
            const score = calculateSimilarity(messageLower, doc.extracted_text.substring(0, 1000));
            
            if (score > bestScore && score > 30) {
                bestScore = score;
                // Extrair trecho relevante
                const textLower = doc.extracted_text.toLowerCase();
                const messageWords = messageLower.split(/\W+/).filter(w => w.length > 2);
                const firstMatch = messageWords.find(w => textLower.includes(w));
                
                let excerpt = doc.extracted_text.substring(0, 300);
                if (firstMatch) {
                    const index = textLower.indexOf(firstMatch);
                    if (index > 0) {
                        const start = Math.max(0, index - 150);
                        excerpt = doc.extracted_text.substring(start, start + 300);
                    }
                }
                
                bestMatch = {
                    type: 'document',
                    id: doc.id,
                    answer: `Com base no documento "${doc.title}":\n\n${excerpt}...`,
                    confidence: Math.min(score, 100)
                };
            }
        }
        
        // Se encontrou uma resposta boa (score > 40), retornar
        if (bestMatch && bestScore > 40) {
            // Atualizar contador de uso
            if (bestMatch.type === 'qa') {
                await client.query(
                    'UPDATE ia_qa SET usage_count = usage_count + 1 WHERE id = $1',
                    [bestMatch.id]
                );
            } else if (bestMatch.type === 'knowledge') {
                await client.query(
                    'UPDATE ia_knowledge_base SET usage_count = usage_count + 1 WHERE id = $1',
                    [bestMatch.id]
                );
            }
            
            return bestMatch;
        }
        
        // Se não encontrou, retornar resposta padrão
        return {
            type: 'default',
            answer: 'Desculpe, ainda não tenho uma resposta específica para isso. Mas estou aprendendo! Você pode reformular sua pergunta ou entrar em contato com o suporte.',
            confidence: 0
        };
        
    } finally {
        client.release();
    }
}

// POST /api/ia-king/chat - Enviar mensagem para a IA
router.post('/chat', protectUser, iaLimiter, asyncHandler(async (req, res) => {
    const { message } = req.body;
    const userId = req.user.userId;
    
    if (!message || !message.trim()) {
        return res.status(400).json({ 
            message: 'Mensagem é obrigatória.' 
        });
    }
    
    const client = await db.pool.connect();
    try {
        // Buscar melhor resposta
        const bestAnswer = await findBestAnswer(message, userId);
        
        // Salvar conversa no histórico
        await client.query(
            `INSERT INTO ia_conversations (user_id, message, response, confidence_score, knowledge_used)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                userId,
                message,
                bestAnswer.answer,
                bestAnswer.confidence,
                bestAnswer.id ? [bestAnswer.id] : []
            ]
        );
        
        // Se confiança baixa, criar sugestão de aprendizado
        if (bestAnswer.confidence < 50 && bestAnswer.type === 'default') {
            const lastConversation = await client.query(
                'SELECT id FROM ia_conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            
            if (lastConversation.rows.length > 0) {
                await client.query(
                    `INSERT INTO ia_learning (question, suggested_answer, source_conversation_id, status)
                     VALUES ($1, $2, $3, 'pending')`,
                    [
                        message,
                        'Resposta sugerida pelo sistema - aguardando aprovação do administrador',
                        lastConversation.rows[0].id
                    ]
                );
            }
        }
        
        res.json({
            response: bestAnswer.answer,
            confidence: bestAnswer.confidence,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao processar mensagem da IA:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/knowledge - Listar base de conhecimento (ADM)
router.get('/knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                kb.id,
                kb.title,
                kb.content,
                kb.keywords,
                kb.priority,
                kb.usage_count,
                kb.is_active,
                kb.source_type,
                c.name as category_name,
                kb.created_at,
                kb.updated_at
            FROM ia_knowledge_base kb
            LEFT JOIN ia_categories c ON kb.category_id = c.id
            ORDER BY kb.priority DESC, kb.usage_count DESC, kb.created_at DESC
        `);
        
        res.json({ knowledge: result.rows });
    } catch (error) {
        console.error('❌ Erro ao buscar conhecimento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/knowledge - Criar conhecimento (ADM)
router.post('/knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const { title, content, category_id, keywords, priority } = req.body;
    const adminId = req.user.userId;
    
    if (!title || !content) {
        return res.status(400).json({ message: 'Título e conteúdo são obrigatórios.' });
    }
    
    const client = await db.pool.connect();
    try {
        const extractedKeywords = keywords || extractKeywords(title + ' ' + content);
        
        const result = await client.query(
            `INSERT INTO ia_knowledge_base (title, content, category_id, keywords, priority, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                title,
                content,
                category_id || null,
                extractedKeywords,
                priority || 0,
                adminId
            ]
        );
        
        res.json({ knowledge: result.rows[0] });
    } catch (error) {
        console.error('❌ Erro ao criar conhecimento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/knowledge/:id - Atualizar conhecimento (ADM)
router.put('/knowledge/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, category_id, keywords, priority, is_active } = req.body;
    
    const client = await db.pool.connect();
    try {
        const extractedKeywords = keywords || (title && content ? extractKeywords(title + ' ' + content) : null);
        
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(title);
        }
        if (content !== undefined) {
            updates.push(`content = $${paramIndex++}`);
            values.push(content);
        }
        if (category_id !== undefined) {
            updates.push(`category_id = $${paramIndex++}`);
            values.push(category_id);
        }
        if (extractedKeywords !== null) {
            updates.push(`keywords = $${paramIndex++}`);
            values.push(extractedKeywords);
        }
        if (priority !== undefined) {
            updates.push(`priority = $${paramIndex++}`);
            values.push(priority);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        
        const result = await client.query(
            `UPDATE ia_knowledge_base 
             SET ${updates.join(', ')}
             WHERE id = $${paramIndex}
             RETURNING *`,
            values
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Conhecimento não encontrado.' });
        }
        
        res.json({ knowledge: result.rows[0] });
    } catch (error) {
        console.error('❌ Erro ao atualizar conhecimento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// DELETE /api/ia-king/knowledge/:id - Deletar conhecimento (ADM)
router.delete('/knowledge/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await db.pool.connect();
    try {
        await client.query('DELETE FROM ia_knowledge_base WHERE id = $1', [id]);
        res.json({ message: 'Conhecimento deletado com sucesso.' });
    } catch (error) {
        console.error('❌ Erro ao deletar conhecimento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/qa - Listar perguntas e respostas (ADM)
router.get('/qa', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                qa.id,
                qa.question,
                qa.answer,
                qa.question_variations,
                qa.keywords,
                qa.usage_count,
                qa.success_rate,
                qa.is_active,
                c.name as category_name,
                qa.created_at,
                qa.updated_at
            FROM ia_qa qa
            LEFT JOIN ia_categories c ON qa.category_id = c.id
            ORDER BY qa.usage_count DESC, qa.success_rate DESC, qa.created_at DESC
        `);
        
        res.json({ qa: result.rows });
    } catch (error) {
        console.error('❌ Erro ao buscar Q&A:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/qa - Criar Q&A (ADM)
router.post('/qa', protectAdmin, asyncHandler(async (req, res) => {
    const { question, answer, question_variations, category_id, keywords, priority } = req.body;
    const adminId = req.user.userId;
    
    if (!question || !answer) {
        return res.status(400).json({ message: 'Pergunta e resposta são obrigatórias.' });
    }
    
    const client = await db.pool.connect();
    try {
        const extractedKeywords = keywords || extractKeywords(question + ' ' + answer);
        
        const result = await client.query(
            `INSERT INTO ia_qa (question, answer, question_variations, category_id, keywords, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                question,
                answer,
                question_variations || [],
                category_id || null,
                extractedKeywords,
                adminId
            ]
        );
        
        res.json({ qa: result.rows[0] });
    } catch (error) {
        console.error('❌ Erro ao criar Q&A:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/qa/:id - Atualizar Q&A (ADM)
router.put('/qa/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { question, answer, question_variations, category_id, keywords, is_active } = req.body;
    
    const client = await db.pool.connect();
    try {
        const extractedKeywords = keywords || (question && answer ? extractKeywords(question + ' ' + answer) : null);
        
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (question !== undefined) {
            updates.push(`question = $${paramIndex++}`);
            values.push(question);
        }
        if (answer !== undefined) {
            updates.push(`answer = $${paramIndex++}`);
            values.push(answer);
        }
        if (question_variations !== undefined) {
            updates.push(`question_variations = $${paramIndex++}`);
            values.push(question_variations);
        }
        if (category_id !== undefined) {
            updates.push(`category_id = $${paramIndex++}`);
            values.push(category_id);
        }
        if (extractedKeywords !== null) {
            updates.push(`keywords = $${paramIndex++}`);
            values.push(extractedKeywords);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        
        const result = await client.query(
            `UPDATE ia_qa 
             SET ${updates.join(', ')}
             WHERE id = $${paramIndex}
             RETURNING *`,
            values
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Q&A não encontrado.' });
        }
        
        res.json({ qa: result.rows[0] });
    } catch (error) {
        console.error('❌ Erro ao atualizar Q&A:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/learning - Listar aprendizado pendente (ADM)
router.get('/learning', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                l.id,
                l.question,
                l.suggested_answer,
                l.context,
                l.status,
                l.created_at,
                c.message as original_message,
                c.response as original_response
            FROM ia_learning l
            LEFT JOIN ia_conversations c ON l.source_conversation_id = c.id
            ORDER BY l.created_at DESC
        `);
        
        res.json({ learning: result.rows });
    } catch (error) {
        console.error('❌ Erro ao buscar aprendizado:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/learning/:id/approve - Aprovar aprendizado (ADM)
router.put('/learning/:id/approve', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { question, answer, question_variations, category_id } = req.body;
    const adminId = req.user.userId;
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // Atualizar status do aprendizado
        await client.query(
            `UPDATE ia_learning 
             SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [adminId, id]
        );
        
        // Criar Q&A aprovado
        const learning = await client.query('SELECT * FROM ia_learning WHERE id = $1', [id]);
        if (learning.rows.length > 0) {
            const extractedKeywords = extractKeywords((question || learning.rows[0].question) + ' ' + (answer || learning.rows[0].suggested_answer));
            
            await client.query(
                `INSERT INTO ia_qa (question, answer, question_variations, category_id, keywords, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    question || learning.rows[0].question,
                    answer || learning.rows[0].suggested_answer,
                    question_variations || [],
                    category_id || null,
                    extractedKeywords,
                    adminId
                ]
            );
        }
        
        await client.query('COMMIT');
        
        res.json({ message: 'Aprendizado aprovado e adicionado à base de conhecimento.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao aprovar aprendizado:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/learning/:id/reject - Rejeitar aprendizado (ADM)
router.put('/learning/:id/reject', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.userId;
    
    const client = await db.pool.connect();
    try {
        await client.query(
            `UPDATE ia_learning 
             SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [adminId, id]
        );
        
        res.json({ message: 'Aprendizado rejeitado.' });
    } catch (error) {
        console.error('❌ Erro ao rejeitar aprendizado:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/categories - Listar categorias
router.get('/categories', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM ia_categories
            ORDER BY priority DESC, name ASC
        `);
        
        res.json({ categories: result.rows });
    } catch (error) {
        console.error('❌ Erro ao buscar categorias:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/stats - Estatísticas (ADM)
router.get('/stats', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM ia_knowledge_base WHERE is_active = true) as total_knowledge,
                (SELECT COUNT(*) FROM ia_qa WHERE is_active = true) as total_qa,
                (SELECT COUNT(*) FROM ia_documents WHERE processed = true) as total_documents,
                (SELECT COUNT(*) FROM ia_conversations) as total_conversations,
                (SELECT COUNT(*) FROM ia_learning WHERE status = 'pending') as pending_learning,
                (SELECT COUNT(*) FROM ia_conversations WHERE created_at >= CURRENT_DATE) as conversations_today
        `);
        
        res.json({ stats: stats.rows[0] });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
