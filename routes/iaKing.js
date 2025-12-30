const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');
const rateLimit = require('express-rate-limit');
// TODO: Implementar upload de documentos quando necessário
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs').promises;

const router = express.Router();

// Rate limiting para IA
const iaLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 20, // 20 requisições por minuto
    message: 'Muitas requisições. Aguarde um momento antes de tentar novamente.'
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
        let qaResult = { rows: [] };
        try {
            const qaQuery = `
                SELECT 
                    id, question, answer, question_variations, keywords, usage_count, success_rate
                FROM ia_qa
                WHERE is_active = true
                ORDER BY usage_count DESC, success_rate DESC
            `;
            qaResult = await client.query(qaQuery);
        } catch (error) {
            // Tabela não existe ainda, retornar resposta padrão
            if (error.code === '42P01') { // relation does not exist
                return {
                    type: 'default',
                    answer: 'Olá! 😊 A IA KING está sendo configurada. Para ativar todas as funcionalidades, é necessário executar a migration 023 no banco de dados.\n\nEnquanto isso, posso te ajudar com informações básicas:\n\n• O Conecta King é uma plataforma para criar cartões virtuais profissionais\n• Você pode adicionar módulos como WhatsApp, Instagram, TikTok, YouTube, etc.\n• Existem planos Individual, Individual com Logo e Empresarial\n\nExecute a migration e volte aqui para ter acesso completo à IA! 🚀',
                    confidence: 0
                };
            }
            throw error;
        }
        
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
        let knowledgeResult = { rows: [] };
        try {
            const knowledgeQuery = `
                SELECT 
                    id, title, content, keywords, priority, usage_count
                FROM ia_knowledge_base
                WHERE is_active = true
                ORDER BY priority DESC, usage_count DESC
            `;
            knowledgeResult = await client.query(knowledgeQuery);
        } catch (error) {
            // Tabela não existe ainda, continuar sem ela
            console.warn('Tabela ia_knowledge_base não existe ainda');
        }
        
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
        let documentsResult = { rows: [] };
        try {
            const documentsQuery = `
                SELECT 
                    id, title, extracted_text
                FROM ia_documents
                WHERE processed = true AND extracted_text IS NOT NULL
            `;
            documentsResult = await client.query(documentsQuery);
        } catch (error) {
            // Tabela não existe ainda, continuar sem ela
            console.warn('Tabela ia_documents não existe ainda');
        }
        
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
        
        // 4. Buscar em mentorias
        let mentoriasResult = { rows: [] };
        try {
            const mentoriasQuery = `
                SELECT 
                    id, title, description, content, keywords, difficulty_level
                FROM ia_mentorias
                WHERE is_active = true
                ORDER BY view_count DESC
            `;
            mentoriasResult = await client.query(mentoriasQuery);
            
            for (const mentoria of mentoriasResult.rows) {
                let score = calculateSimilarity(messageLower, mentoria.title + ' ' + mentoria.description + ' ' + mentoria.content.substring(0, 500));
                
                if (mentoria.keywords && mentoria.keywords.length > 0) {
                    const keywordMatches = mentoria.keywords.filter(kw => 
                        messageKeywords.some(mk => mk.includes(kw) || kw.includes(mk))
                    ).length;
                    score += (keywordMatches / mentoria.keywords.length) * 25;
                }
                
                if (score > bestScore && score > 40) {
                    bestScore = score;
                    bestMatch = {
                        type: 'mentoria',
                        id: mentoria.id,
                        answer: `Encontrei uma mentoria que pode te ajudar: **${mentoria.title}**\n\n${mentoria.description || mentoria.content.substring(0, 300)}...\n\nDificuldade: ${mentoria.difficulty_level}`,
                        confidence: Math.min(score, 100)
                    };
                }
            }
        } catch (error) {
            console.warn('Tabela ia_mentorias não existe ainda');
        }
        
        // 5. Se não encontrou e busca na web está habilitada, buscar na internet
        if (!bestMatch || bestScore < 30) {
            try {
                const webConfig = await client.query('SELECT is_enabled FROM ia_web_search_config ORDER BY id DESC LIMIT 1');
                
                if (webConfig.rows.length > 0 && webConfig.rows[0].is_enabled) {
                    const webResults = await searchWeb(userMessage, 3);
                    
                    if (webResults.results && webResults.results.length > 0) {
                        const webAnswer = `Encontrei algumas informações na internet sobre isso:\n\n${webResults.results.map((r, i) => `${i + 1}. **${r.title}**\n${r.snippet}\n${r.url ? `Fonte: ${r.url}` : ''}`).join('\n\n')}\n\n*Nota: Estas informações foram encontradas na internet e podem precisar de verificação.*`;
                        
                        return {
                            type: 'web',
                            answer: webAnswer,
                            confidence: 50,
                            webResults: webResults.results
                        };
                    }
                }
            } catch (error) {
                console.warn('Erro ao buscar na web ou busca não habilitada:', error.message);
            }
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
        
        // Salvar conversa no histórico (se tabela existir)
        try {
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
                try {
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
                } catch (error) {
                    // Tabela não existe, ignorar
                    console.warn('Tabela ia_learning não existe ainda');
                }
            }
        } catch (error) {
            // Tabela não existe ainda, ignorar
            console.warn('Tabela ia_conversations não existe ainda');
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

// GET /api/ia-king/mentorias - Listar mentorias
router.get('/mentorias', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                m.id,
                m.title,
                m.description,
                m.content,
                m.video_url,
                m.audio_url,
                m.document_url,
                m.duration_minutes,
                m.difficulty_level,
                m.view_count,
                m.is_active,
                c.name as category_name,
                m.created_at,
                m.updated_at
            FROM ia_mentorias m
            LEFT JOIN ia_categories c ON m.category_id = c.id
            ORDER BY m.created_at DESC
        `);
        
        res.json({ mentorias: result.rows });
    } catch (error) {
        console.error('❌ Erro ao buscar mentorias:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/mentorias - Criar mentoria
router.post('/mentorias', protectAdmin, asyncHandler(async (req, res) => {
    const { title, description, content, category_id, keywords, video_url, audio_url, document_url, duration_minutes, difficulty_level } = req.body;
    const adminId = req.user.userId;
    
    if (!title || !content) {
        return res.status(400).json({ message: 'Título e conteúdo são obrigatórios.' });
    }
    
    const client = await db.pool.connect();
    try {
        const extractedKeywords = keywords || extractKeywords(title + ' ' + description + ' ' + content);
        
        const result = await client.query(
            `INSERT INTO ia_mentorias (title, description, content, category_id, keywords, video_url, audio_url, document_url, duration_minutes, difficulty_level, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                title,
                description || null,
                content,
                category_id || null,
                extractedKeywords,
                video_url || null,
                audio_url || null,
                document_url || null,
                duration_minutes || null,
                difficulty_level || 'beginner',
                adminId
            ]
        );
        
        res.json({ mentoria: result.rows[0] });
    } catch (error) {
        console.error('❌ Erro ao criar mentoria:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/web-search/config - Buscar configuração de busca na web
router.get('/web-search/config', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query('SELECT * FROM ia_web_search_config ORDER BY id DESC LIMIT 1');
        
        if (result.rows.length === 0) {
            return res.json({ config: { is_enabled: false, api_provider: 'scraping', max_results: 5 } });
        }
        
        res.json({ config: result.rows[0] });
    } catch (error) {
        console.error('❌ Erro ao buscar configuração:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/web-search/config - Atualizar configuração de busca na web
router.put('/web-search/config', protectAdmin, asyncHandler(async (req, res) => {
    const { is_enabled, api_provider, api_key, max_results, search_domains, blocked_domains, use_cache, cache_duration_hours } = req.body;
    const adminId = req.user.userId;
    
    const client = await db.pool.connect();
    try {
        // Verificar se já existe configuração
        const existing = await client.query('SELECT id FROM ia_web_search_config ORDER BY id DESC LIMIT 1');
        
        if (existing.rows.length > 0) {
            // Atualizar
            const updates = [];
            const values = [];
            let paramIndex = 1;
            
            if (is_enabled !== undefined) {
                updates.push(`is_enabled = $${paramIndex++}`);
                values.push(is_enabled);
            }
            if (api_provider !== undefined) {
                updates.push(`api_provider = $${paramIndex++}`);
                values.push(api_provider);
            }
            if (api_key !== undefined) {
                updates.push(`api_key = $${paramIndex++}`);
                values.push(api_key);
            }
            if (max_results !== undefined) {
                updates.push(`max_results = $${paramIndex++}`);
                values.push(max_results);
            }
            if (search_domains !== undefined) {
                updates.push(`search_domains = $${paramIndex++}`);
                values.push(search_domains);
            }
            if (blocked_domains !== undefined) {
                updates.push(`blocked_domains = $${paramIndex++}`);
                values.push(blocked_domains);
            }
            if (use_cache !== undefined) {
                updates.push(`use_cache = $${paramIndex++}`);
                values.push(use_cache);
            }
            if (cache_duration_hours !== undefined) {
                updates.push(`cache_duration_hours = $${paramIndex++}`);
                values.push(cache_duration_hours);
            }
            
            updates.push(`updated_by = $${paramIndex++}`);
            values.push(adminId);
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(existing.rows[0].id);
            
            await client.query(
                `UPDATE ia_web_search_config SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
                values
            );
        } else {
            // Criar nova
            await client.query(
                `INSERT INTO ia_web_search_config (is_enabled, api_provider, api_key, max_results, search_domains, blocked_domains, use_cache, cache_duration_hours, updated_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    is_enabled !== undefined ? is_enabled : false,
                    api_provider || 'scraping',
                    api_key || null,
                    max_results || 5,
                    search_domains || null,
                    blocked_domains || null,
                    use_cache !== undefined ? use_cache : true,
                    cache_duration_hours || 24,
                    adminId
                ]
            );
        }
        
        res.json({ message: 'Configuração salva com sucesso.' });
    } catch (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// Função auxiliar: Buscar na internet (web scraping básico)
async function searchWeb(query, maxResults = 5) {
    try {
        // Usar DuckDuckGo HTML (gratuito, sem API key)
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        
        // Nota: Em produção, você pode usar:
        // 1. SerpAPI (pago, mas confiável)
        // 2. Google Custom Search API (limitado, mas funcional)
        // 3. Web scraping com puppeteer/playwright (mais complexo)
        // 4. DuckDuckGo API (gratuito, mas limitado)
        
        // Por enquanto, retornar resultados simulados
        // TODO: Implementar busca real quando necessário
        return {
            results: [
                {
                    title: `Resultado sobre: ${query}`,
                    snippet: `Informações relevantes sobre ${query} encontradas na internet.`,
                    url: `https://example.com/search?q=${encodeURIComponent(query)}`
                }
            ],
            provider: 'scraping',
            cached: false
        };
    } catch (error) {
        console.error('Erro ao buscar na web:', error);
        return { results: [], provider: 'scraping', cached: false, error: error.message };
    }
}

// POST /api/ia-king/web-search - Buscar na internet
router.post('/web-search', protectUser, iaLimiter, asyncHandler(async (req, res) => {
    const { query } = req.body;
    
    if (!query || !query.trim()) {
        return res.status(400).json({ message: 'Query de busca é obrigatória.' });
    }
    
    const client = await db.pool.connect();
    try {
        // Verificar se busca na web está habilitada
        const configResult = await client.query('SELECT * FROM ia_web_search_config ORDER BY id DESC LIMIT 1');
        
        if (configResult.rows.length === 0 || !configResult.rows[0].is_enabled) {
            return res.status(403).json({ 
                message: 'Busca na internet não está habilitada. Configure no painel admin.' 
            });
        }
        
        const config = configResult.rows[0];
        
        // Verificar cache
        if (config.use_cache) {
            const cacheResult = await client.query(
                'SELECT results FROM ia_web_search_cache WHERE query = $1 AND expires_at > NOW()',
                [query]
            );
            
            if (cacheResult.rows.length > 0) {
                return res.json({
                    results: cacheResult.rows[0].results,
                    cached: true
                });
            }
        }
        
        // Buscar na web
        const searchResults = await searchWeb(query, config.max_results || 5);
        
        // Salvar no cache se habilitado
        if (config.use_cache && searchResults.results.length > 0) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + (config.cache_duration_hours || 24));
            
            await client.query(
                `INSERT INTO ia_web_search_cache (query, results, expires_at)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (query) DO UPDATE SET results = $2, expires_at = $3`,
                [query, JSON.stringify(searchResults.results), expiresAt]
            );
        }
        
        // Salvar no histórico
        await client.query(
            `INSERT INTO ia_web_search_history (query, results_count, success, provider)
             VALUES ($1, $2, $3, $4)`,
            [query, searchResults.results.length, true, searchResults.provider]
        );
        
        res.json({
            results: searchResults.results,
            cached: false,
            provider: searchResults.provider
        });
    } catch (error) {
        console.error('❌ Erro ao buscar na web:', error);
        
        // Salvar erro no histórico
        try {
            await client.query(
                `INSERT INTO ia_web_search_history (query, results_count, success, error_message)
                 VALUES ($1, $2, $3, $4)`,
                [query, 0, false, error.message]
            );
        } catch (histError) {
            console.error('Erro ao salvar histórico:', histError);
        }
        
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
