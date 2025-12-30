const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Configuração S3/R2 para upload de documentos
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Configuração de upload para documentos
const documentUpload = multer({
    storage: multerS3({
        s3: r2,
        bucket: process.env.R2_BUCKET_NAME,
        acl: 'public-read',
        key: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, `ia-documents/${req.user.userId}-${Date.now()}${ext}`);
        },
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas PDF, DOC, DOCX e TXT são permitidos.'), false);
        }
    }
});

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
                    id, title, extracted_text, file_type
                FROM ia_documents
                WHERE processed = true 
                AND extracted_text IS NOT NULL 
                AND LENGTH(extracted_text) > 0
            `;
            documentsResult = await client.query(documentsQuery);
        } catch (error) {
            // Tabela não existe ainda, continuar sem ela
            console.warn('Tabela ia_documents não existe ainda:', error.message);
        }
        
        console.log(`📚 Buscando em ${documentsResult.rows.length} documento(s) processado(s)`);
        
        for (const doc of documentsResult.rows) {
            if (!doc.extracted_text || doc.extracted_text.trim().length === 0) {
                console.log(`⏭️ Documento "${doc.title}" não tem texto extraído`);
                continue;
            }
            
            // Buscar no título primeiro (maior peso)
            const titleScore = calculateSimilarity(messageLower, doc.title.toLowerCase()) * 1.5;
            
            // Buscar em todo o texto (não apenas primeiros 1000 caracteres)
            // Dividir o texto em chunks para melhor busca
            const textLower = doc.extracted_text.toLowerCase();
            const textLength = textLower.length;
            
            // Buscar em múltiplos trechos do documento
            let maxTextScore = 0;
            const chunkSize = 2000; // Chunks de 2000 caracteres
            const overlap = 500; // Overlap para não perder contexto
            
            for (let i = 0; i < textLength; i += chunkSize - overlap) {
                const chunk = textLower.substring(i, Math.min(i + chunkSize, textLength));
                const chunkScore = calculateSimilarity(messageLower, chunk);
                if (chunkScore > maxTextScore) {
                    maxTextScore = chunkScore;
                }
            }
            
            // Combinar score do título e do texto
            let score = Math.max(titleScore, maxTextScore);
            
            // Bônus se palavras-chave da mensagem aparecem no título
            const messageWords = messageLower.split(/\W+/).filter(w => w.length > 2);
            const titleWords = doc.title.toLowerCase().split(/\W+/);
            const titleMatches = messageWords.filter(mw => titleWords.some(tw => tw.includes(mw) || mw.includes(tw))).length;
            if (titleMatches > 0) {
                score += (titleMatches / messageWords.length) * 30;
            }
            
            // Bônus se palavras-chave aparecem no texto
            const textMatches = messageWords.filter(mw => textLower.includes(mw)).length;
            if (textMatches > 0) {
                score += (textMatches / messageWords.length) * 20;
            }
            
            // Threshold mais baixo para documentos (20 ao invés de 30)
            if (score > bestScore && score > 20) {
                bestScore = score;
                
                // Extrair trecho relevante com contexto
                let excerpt = '';
                let bestMatchIndex = -1;
                let bestMatchScore = 0;
                
                // Encontrar o melhor trecho que contém palavras da mensagem
                for (const word of messageWords) {
                    const index = textLower.indexOf(word);
                    if (index >= 0) {
                        const start = Math.max(0, index - 200);
                        const end = Math.min(textLength, index + 400);
                        const snippet = doc.extracted_text.substring(start, end);
                        const snippetScore = calculateSimilarity(messageLower, snippet.toLowerCase());
                        
                        if (snippetScore > bestMatchScore) {
                            bestMatchScore = snippetScore;
                            bestMatchIndex = index;
                            excerpt = snippet;
                        }
                    }
                }
                
                // Se não encontrou trecho específico, usar início do documento
                if (!excerpt || excerpt.length === 0) {
                    excerpt = doc.extracted_text.substring(0, 500);
                }
                
                // Limpar e formatar excerpt
                excerpt = excerpt.trim();
                if (excerpt.length > 500) {
                    excerpt = excerpt.substring(0, 500) + '...';
                }
                
                const docType = doc.file_type === 'pdf' ? 'livro' : 'documento';
                
                bestMatch = {
                    type: 'document',
                    id: doc.id,
                    answer: `Com base no ${docType} "${doc.title}":\n\n${excerpt}\n\n*Fonte: ${doc.title}*`,
                    confidence: Math.min(score, 100)
                };
                
                console.log(`✅ Encontrado em documento "${doc.title}" com score ${score.toFixed(2)}`);
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
                    const webResults = await searchWeb(userMessage, 3, client);
                    
                    if (webResults.results && webResults.results.length > 0) {
                        const webAnswer = `Encontrei algumas informações na internet sobre isso:\n\n${webResults.results.map((r, i) => `${i + 1}. **${r.title}**\n${r.snippet}${r.url ? `\nFonte: ${r.url}` : ''}`).join('\n\n')}\n\n*Nota: Estas informações foram encontradas na internet e podem precisar de verificação.*`;
                        
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

// DELETE /api/ia-king/qa/:id - Deletar Q&A (ADM)
router.delete('/qa/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await db.pool.connect();
    try {
        await client.query('DELETE FROM ia_qa WHERE id = $1', [id]);
        res.json({ message: 'Q&A deletada com sucesso.' });
    } catch (error) {
        console.error('❌ Erro ao deletar Q&A:', error);
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

// Função auxiliar: Buscar na internet (busca real usando DuckDuckGo)
async function searchWeb(query, maxResults = 5, client = null) {
    try {
        // Verificar cache se client fornecido
        if (client) {
            try {
                const cacheResult = await client.query(
                    'SELECT results FROM ia_web_search_cache WHERE query = $1 AND expires_at > NOW()',
                    [query]
                );
                
                if (cacheResult.rows.length > 0) {
                    return {
                        results: cacheResult.rows[0].results,
                        provider: 'duckduckgo',
                        cached: true
                    };
                }
            } catch (cacheError) {
                // Cache não disponível, continuar
            }
        }
        
        console.log(`🔍 Buscando na internet: "${query}"`);
        
        // Usar DuckDuckGo Instant Answer API (gratuito)
        try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const response = await fetch(ddgUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                let results = [];
                
                // Processar Abstract (resposta direta)
                if (data.AbstractText) {
                    results.push({
                        title: data.Heading || query,
                        snippet: data.AbstractText,
                        url: data.AbstractURL || null,
                        source: 'DuckDuckGo Instant Answer'
                    });
                }
                
                // Processar RelatedTopics
                if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
                    for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
                        if (topic.Text) {
                            results.push({
                                title: topic.FirstURL ? topic.FirstURL.split('/').pop().replace(/_/g, ' ') : query,
                                snippet: topic.Text.substring(0, 300),
                                url: topic.FirstURL || null,
                                source: 'DuckDuckGo Related Topics'
                            });
                        }
                    }
                }
                
                // Processar Results
                if (data.Results && Array.isArray(data.Results)) {
                    for (const result of data.Results.slice(0, maxResults - results.length)) {
                        results.push({
                            title: result.Text || query,
                            snippet: result.Text || '',
                            url: result.FirstURL || null,
                            source: 'DuckDuckGo Results'
                        });
                    }
                }
                
                if (results.length > 0) {
                    console.log(`✅ Encontrados ${results.length} resultados`);
                    return {
                        results: results.slice(0, maxResults),
                        provider: 'duckduckgo',
                        cached: false
                    };
                }
            }
        } catch (ddgError) {
            console.warn('⚠️ Erro ao buscar no DuckDuckGo:', ddgError.message);
        }
        
        // Fallback: Buscar usando Wikipedia API (gratuito e confiável)
        try {
            const wikiUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const wikiResponse = await fetch(wikiUrl);
            
            if (wikiResponse.ok) {
                const wikiData = await wikiResponse.json();
                if (wikiData.extract) {
                    console.log(`✅ Encontrado resultado na Wikipedia`);
                    return {
                        results: [{
                            title: wikiData.title || query,
                            snippet: wikiData.extract.substring(0, 500),
                            url: wikiData.content_urls?.desktop?.page || null,
                            source: 'Wikipedia'
                        }],
                        provider: 'wikipedia',
                        cached: false
                    };
                }
            }
        } catch (wikiError) {
            console.warn('⚠️ Erro ao buscar na Wikipedia:', wikiError.message);
        }
        
        // Fallback final: resultados básicos
        const commonAnswers = {
            'conecta king': {
                title: 'Conecta King - Cartão Virtual Profissional',
                snippet: 'O Conecta King é uma plataforma completa para criação de cartões virtuais profissionais com módulos personalizáveis.',
                url: 'https://conectaking.com.br',
                source: 'Sistema'
            },
            'módulos': {
                title: 'Módulos do Conecta King',
                snippet: 'Você pode adicionar diversos módulos como WhatsApp, Instagram, TikTok, YouTube, Link Personalizado, Banner, Carrossel, Página de Vendas e muito mais!',
                url: null,
                source: 'Sistema'
            }
        };
        
        const queryLower = query.toLowerCase();
        let results = [];
        
        // Buscar correspondências parciais
        for (const [key, value] of Object.entries(commonAnswers)) {
            if (queryLower.includes(key)) {
                results.push(value);
            }
        }
        
        // Se não encontrou, criar resultado genérico
        if (results.length === 0) {
            results.push({
                title: `Informações sobre: ${query}`,
                snippet: `Estou buscando informações atualizadas sobre "${query}" na internet. Por enquanto, recomendo verificar fontes confiáveis ou entrar em contato com o suporte para mais detalhes.`,
                url: null,
                source: 'Sistema'
            });
        }
        
        return {
            results: results.slice(0, maxResults),
            provider: 'fallback',
            cached: false
        };
    } catch (error) {
        console.error('❌ Erro ao buscar na web:', error);
        return { results: [], provider: 'error', cached: false, error: error.message };
    }
}

// Função auxiliar: Extrair texto de documentos
async function extractTextFromDocument(fileUrl, fileType) {
    try {
        const fetch = require('node-fetch');
        
        if (fileType === 'pdf') {
            try {
                const pdfParse = require('pdf-parse');
                const response = await fetch(fileUrl);
                const buffer = await response.buffer();
                const data = await pdfParse(buffer);
                return data.text || '';
            } catch (pdfError) {
                console.warn('Erro ao extrair texto de PDF (biblioteca pdf-parse pode não estar instalada):', pdfError.message);
                return `PDF carregado. Para extração de texto, instale: npm install pdf-parse`;
            }
        } else if (fileType === 'docx') {
            try {
                const mammoth = require('mammoth');
                const response = await fetch(fileUrl);
                const buffer = await response.buffer();
                const result = await mammoth.extractRawText({ buffer });
                return result.value || '';
            } catch (docxError) {
                console.warn('Erro ao extrair texto de DOCX (biblioteca mammoth pode não estar instalada):', docxError.message);
                return `DOCX carregado. Para extração de texto, instale: npm install mammoth`;
            }
        } else if (fileType === 'doc') {
            // DOC antigo é mais complicado, requer biblioteca adicional
            return `Documento DOC carregado. Para extração de texto de arquivos DOC antigos, é necessário biblioteca adicional.`;
        } else if (fileType === 'txt') {
            const response = await fetch(fileUrl);
            return await response.text();
        }
        
        return '';
    } catch (error) {
        console.error('Erro ao extrair texto:', error);
        throw error;
    }
}

// Middleware para tratar erros do multer
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.error('❌ Erro no multer:', err);
        
        if (err.Code === 'NotEntitled' || err.message?.includes('enable R2')) {
            return res.status(500).json({
                message: 'Erro de configuração: R2 não está habilitado no Cloudflare Dashboard. Verifique as configurações do servidor.',
                error: 'R2_NOT_ENABLED'
            });
        }
        
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'Arquivo muito grande. Tamanho máximo: 50MB.'
            });
        }
        
        return res.status(500).json({
            message: 'Erro ao fazer upload do arquivo.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    next();
};

// POST /api/ia-king/documents/upload - Upload de documento
router.post('/documents/upload', protectAdmin, documentUpload.single('document'), handleMulterError, asyncHandler(async (req, res) => {
    console.log('📤 Iniciando upload de documento...');
    
    if (!req.file) {
        console.error('❌ Nenhum arquivo recebido');
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    
    console.log('✅ Arquivo recebido:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        key: req.file.key,
        location: req.file.location
    });
    
    const { title, category_id } = req.body;
    const adminId = req.user.userId;
    
    if (!title) {
        return res.status(400).json({ message: 'Título é obrigatório.' });
    }
    
    const client = await db.pool.connect();
    try {
        // Verificar se o upload foi bem-sucedido
        if (!req.file.key && !req.file.location) {
            console.error('❌ Arquivo não foi enviado para o storage');
            throw new Error('Erro ao fazer upload do arquivo. Verifique a configuração do R2.');
        }
        
        // Verificar variáveis de ambiente
        if (!process.env.R2_PUBLIC_URL) {
            console.error('❌ R2_PUBLIC_URL não configurado');
            throw new Error('Configuração do servidor incompleta. R2_PUBLIC_URL não encontrado.');
        }
        
        const publicUrlBase = process.env.R2_PUBLIC_URL;
        // Usar location se disponível, senão construir URL
        const fileUrl = req.file.location || `${publicUrlBase}/${req.file.key}`;
        
        console.log('🔗 URL do arquivo:', fileUrl);
        
        const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 
                        req.file.mimetype.includes('wordprocessingml') ? 'docx' :
                        req.file.mimetype.includes('msword') ? 'doc' : 'txt';
        
        console.log('📄 Tipo do arquivo:', fileType);
        
        // Salvar no banco primeiro (sem extrair texto ainda)
        const result = await client.query(
            `INSERT INTO ia_documents (title, file_name, file_url, file_type, file_size, extracted_text, processed, category_id, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                title,
                req.file.originalname,
                fileUrl,
                fileType,
                req.file.size,
                '', // Texto vazio inicialmente
                false, // Não processado ainda
                category_id || null,
                adminId
            ]
        );
        
        console.log('✅ Documento salvo no banco com ID:', result.rows[0].id);
        
        // Retornar sucesso imediatamente
        res.json({
            message: 'Documento enviado com sucesso! O processamento do texto será feito em segundo plano.',
            document: result.rows[0]
        });
        
        // Liberar cliente antes do processamento em segundo plano
        client.release();
        
        // Processar extração de texto em segundo plano (não bloquear resposta)
        setTimeout(async () => {
            const bgClient = await db.pool.connect();
            try {
                console.log('🔄 Iniciando extração de texto em segundo plano...');
                let extractedText = '';
                
                try {
                    extractedText = await extractTextFromDocument(fileUrl, fileType);
                    console.log('✅ Texto extraído:', extractedText.length, 'caracteres');
                } catch (extractError) {
                    console.warn('⚠️ Erro ao extrair texto:', extractError.message);
                    extractedText = `Documento ${fileType} carregado. Para extração completa, instale as bibliotecas necessárias.`;
                }
                
                // Atualizar documento com texto extraído
                await bgClient.query(
                    `UPDATE ia_documents 
                     SET extracted_text = $1, processed = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [extractedText, extractedText.length > 0, result.rows[0].id]
                );
                
                // Se conseguiu extrair texto significativo, indexar na base de conhecimento
                if (extractedText && extractedText.length > 100) {
                    const keywords = extractKeywords(title + ' ' + extractedText.substring(0, 1000));
                    
                    // created_by pode ser string, converter para número ou NULL
                    let createdByValue = null;
                    if (adminId) {
                        const adminIdNum = parseInt(adminId);
                        createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
                    }
                    
                    await bgClient.query(
                        `INSERT INTO ia_knowledge_base (title, content, category_id, keywords, source_type, source_reference, created_by)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            `Conteúdo do documento: ${title}`,
                            extractedText.substring(0, 5000),
                            category_id || null,
                            keywords,
                            'document',
                            `ia_documents:${result.rows[0].id}`,
                            createdByValue
                        ]
                    );
                    console.log('✅ Conhecimento indexado na base');
                }
            } catch (bgError) {
                console.error('❌ Erro no processamento em segundo plano:', bgError);
            } finally {
                bgClient.release();
            }
        }, 2000); // Aguardar 2 segundos para garantir que o arquivo está disponível no R2
        
    } catch (error) {
        console.error('❌ Erro ao fazer upload de documento:', error);
        console.error('Stack:', error.stack);
        console.error('Detalhes do erro:', {
            name: error.name,
            code: error.Code,
            message: error.message,
            httpStatusCode: error.$metadata?.httpStatusCode
        });
        
        // Liberar cliente em caso de erro
        if (client) {
            client.release();
        }
        
        // Mensagem de erro mais específica
        let errorMessage = 'Erro interno do servidor ao processar documento.';
        if (error.Code === 'NotEntitled' || error.message?.includes('enable R2')) {
            errorMessage = 'Erro de configuração: R2 não está habilitado no Cloudflare. Verifique as configurações do servidor.';
        } else if (error.message) {
            errorMessage = `Erro: ${error.message}`;
        }
        
        // Retornar erro mais detalhado
        res.status(500).json({ 
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? {
                name: error.name,
                code: error.Code,
                message: error.message,
                details: error.$metadata
            } : undefined
        });
    }
}));

// GET /api/ia-king/documents - Listar documentos
router.get('/documents', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                d.id,
                d.title,
                d.file_name,
                d.file_url,
                d.file_type,
                d.file_size,
                d.processed,
                d.category_id,
                c.name as category_name,
                d.created_at,
                d.updated_at
            FROM ia_documents d
            LEFT JOIN ia_categories c ON d.category_id = c.id
            ORDER BY d.created_at DESC
        `);
        
        res.json({ documents: result.rows });
    } catch (error) {
        console.error('❌ Erro ao buscar documentos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// DELETE /api/ia-king/documents/:id - Deletar documento
router.delete('/documents/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await db.pool.connect();
    try {
        await client.query('DELETE FROM ia_documents WHERE id = $1', [id]);
        res.json({ message: 'Documento deletado com sucesso.' });
    } catch (error) {
        console.error('❌ Erro ao deletar documento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/documents/:id/process - Reprocessar documento (extrair texto novamente)
router.post('/documents/:id/process', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await db.pool.connect();
    try {
        const docResult = await client.query('SELECT * FROM ia_documents WHERE id = $1', [id]);
        
        if (docResult.rows.length === 0) {
            return res.status(404).json({ message: 'Documento não encontrado.' });
        }
        
        const doc = docResult.rows[0];
        
        // Extrair texto novamente
        let extractedText = '';
        try {
            extractedText = await extractTextFromDocument(doc.file_url, doc.file_type);
        } catch (extractError) {
            return res.status(500).json({ 
                message: 'Erro ao extrair texto do documento. Instale pdf-parse e mammoth para processamento completo.',
                error: extractError.message
            });
        }
        
        // Atualizar documento
        await client.query(
            `UPDATE ia_documents 
             SET extracted_text = $1, processed = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [extractedText, extractedText.length > 0, id]
        );
        
        res.json({ 
            message: 'Documento reprocessado com sucesso!',
            extracted_length: extractedText.length
        });
    } catch (error) {
        console.error('❌ Erro ao processar documento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/books/search - Buscar livros online
router.post('/books/search', protectAdmin, asyncHandler(async (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ message: 'Termo de pesquisa é obrigatório.' });
    }
    
    try {
        // Usar Google Books API (gratuita)
        const fetch = require('node-fetch');
        const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&langRestrict=pt`;
        
        console.log('📚 Buscando livros:', query);
        
        const response = await fetch(googleBooksUrl);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return res.json({ books: [] });
        }
        
        // Processar resultados
        const books = data.items.map(item => {
            const volumeInfo = item.volumeInfo || {};
            const accessInfo = item.accessInfo || {};
            
            return {
                id: item.id,
                title: volumeInfo.title || 'Sem título',
                authors: volumeInfo.authors || [],
                publishedDate: volumeInfo.publishedDate || '',
                description: volumeInfo.description || '',
                thumbnail: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
                infoLink: volumeInfo.infoLink || null,
                pdfUrl: accessInfo.pdf?.isAvailable ? accessInfo.pdf.acsTokenLink : null,
                epubUrl: accessInfo.epub?.isAvailable ? accessInfo.epub.acsTokenLink : null,
                categories: volumeInfo.categories || [],
                pageCount: volumeInfo.pageCount || 0,
                language: volumeInfo.language || 'pt'
            };
        });
        
        console.log(`✅ ${books.length} livros encontrados`);
        
        res.json({ books });
    } catch (error) {
        console.error('❌ Erro ao buscar livros:', error);
        throw error;
    }
}));

// POST /api/ia-king/books/import - Importar livro (baixar PDF e processar)
router.post('/books/import', protectAdmin, asyncHandler(async (req, res) => {
    const { bookId } = req.body;
    const adminId = req.user.userId;
    
    if (!bookId) {
        return res.status(400).json({ message: 'ID do livro é obrigatório.' });
    }
    
    try {
        const fetch = require('node-fetch');
        
        // Buscar detalhes do livro
        const bookResponse = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`);
        const bookData = await bookResponse.json();
        
        if (!bookData.volumeInfo) {
            return res.status(404).json({ message: 'Livro não encontrado.' });
        }
        
        const volumeInfo = bookData.volumeInfo;
        const accessInfo = bookData.accessInfo || {};
        
        // Verificar se tem PDF disponível
        if (!accessInfo.pdf?.isAvailable) {
            return res.status(400).json({ 
                message: 'Este livro não possui PDF disponível para download gratuito. Use a opção "Adicionar Informações" para adicionar os dados do livro.',
                hasInfo: true
            });
        }
        
        // Tentar baixar o PDF (pode não funcionar para todos os livros)
        // Google Books API não fornece link direto para PDFs gratuitos na maioria dos casos
        // Vamos adicionar as informações do livro e sugerir busca manual
        
        const title = volumeInfo.title || 'Livro sem título';
        const authors = (volumeInfo.authors || []).join(', ');
        const description = volumeInfo.description || '';
        
        // Adicionar como conhecimento mesmo sem PDF
        const client = await db.pool.connect();
        try {
            const keywords = extractKeywords(title + ' ' + authors + ' ' + description);
            
            // Preparar conteúdo seguro
            const content = `Autor(es): ${authors || 'Não informado'}\n\n${description || 'Sem descrição disponível'}\n\nFonte: Google Books (ID: ${bookId})`;
            
            // created_by é INTEGER, mas adminId pode ser string - usar NULL se não for número
            let createdByValue = null;
            if (adminId) {
                const adminIdNum = parseInt(adminId);
                createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
            }
            
            console.log('📚 Adicionando livro (import):', { title, bookId, adminId, createdByValue });
            
            await client.query(
                `INSERT INTO ia_knowledge_base (title, content, keywords, source_type, source_reference, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [
                    `Livro: ${title}`,
                    content,
                    keywords, // Array de strings
                    'book',
                    `google_books:${bookId}`,
                    createdByValue
                ]
            );
            
            console.log('✅ Livro adicionado com sucesso (import)');
            
            res.json({
                message: `Informações do livro "${title}" adicionadas à base de conhecimento. Para adicionar o conteúdo completo, faça upload manual do PDF.`,
                book: {
                    title,
                    authors,
                    description
                }
            });
        } catch (dbError) {
            console.error('❌ Erro ao inserir no banco (import):', dbError);
            console.error('Stack:', dbError.stack);
            console.error('Detalhes:', {
                title,
                bookId,
                adminId,
                adminIdType: typeof adminId
            });
            throw dbError;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Erro ao importar livro:', error);
        throw error;
    }
}));

// POST /api/ia-king/books/import-info - Adicionar apenas informações do livro
router.post('/books/import-info', protectAdmin, asyncHandler(async (req, res) => {
    const { bookId } = req.body;
    const adminId = req.user.userId;
    
    if (!bookId) {
        return res.status(400).json({ message: 'ID do livro é obrigatório.' });
    }
    
    try {
        const fetch = require('node-fetch');
        
        // Buscar detalhes do livro
        const bookResponse = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`);
        const bookData = await bookResponse.json();
        
        if (!bookData.volumeInfo) {
            return res.status(404).json({ message: 'Livro não encontrado.' });
        }
        
        const volumeInfo = bookData.volumeInfo;
        const title = volumeInfo.title || 'Livro sem título';
        const authors = (volumeInfo.authors || []).join(', ');
        const description = volumeInfo.description || '';
        const categories = (volumeInfo.categories || []).join(', ');
        
        const client = await db.pool.connect();
        try {
            const keywords = extractKeywords(title + ' ' + authors + ' ' + description + ' ' + categories);
            
            // Preparar conteúdo seguro
            const content = `Autor(es): ${authors || 'Não informado'}\n\nCategorias: ${categories || 'Não informado'}\n\nDescrição:\n${description || 'Sem descrição disponível'}\n\nFonte: Google Books (ID: ${bookId})`;
            
            console.log('📚 Adicionando livro:', { title, bookId, adminId });
            
            // created_by é INTEGER, mas adminId pode ser string - usar NULL se não for número
            let createdByValue = null;
            if (adminId) {
                const adminIdNum = parseInt(adminId);
                createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
            }
            
            await client.query(
                `INSERT INTO ia_knowledge_base (title, content, keywords, source_type, source_reference, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [
                    `Livro: ${title}`,
                    content,
                    keywords, // Array de strings
                    'book',
                    `google_books:${bookId}`,
                    createdByValue
                ]
            );
            
            console.log('✅ Livro adicionado com sucesso');
            
            res.json({
                message: `Informações do livro "${title}" adicionadas com sucesso!`,
                book: {
                    title,
                    authors,
                    description
                }
            });
        } catch (dbError) {
            console.error('❌ Erro ao inserir no banco:', dbError);
            console.error('Stack:', dbError.stack);
            throw dbError;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Erro ao adicionar informações do livro:', error);
        throw error;
    }
}));

// POST /api/ia-king/web-search/learn - Pesquisar e aprender automaticamente
router.post('/web-search/learn', protectAdmin, asyncHandler(async (req, res) => {
    const { query, category_id, auto_add } = req.body;
    const adminId = req.user.userId;
    
    if (!query || !query.trim()) {
        return res.status(400).json({ message: 'Query de busca é obrigatória.' });
    }
    
    const client = await db.pool.connect();
    try {
        console.log(`🧠 Aprendendo sobre: "${query}"`);
        
        // Buscar na internet
        const searchResults = await searchWeb(query, 5, client);
        
        if (!searchResults.results || searchResults.results.length === 0) {
            return res.status(404).json({ 
                message: 'Nenhum resultado encontrado para esta busca.',
                results: []
            });
        }
        
        let addedCount = 0;
        const addedItems = [];
        
        // Se auto_add estiver habilitado, adicionar automaticamente à base de conhecimento
        if (auto_add !== false) {
            // created_by pode ser string, converter para número ou NULL
            let createdByValue = null;
            if (adminId) {
                const adminIdNum = parseInt(adminId);
                createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
            }
            
            for (const result of searchResults.results) {
                try {
                    // Criar título e conteúdo estruturado
                    const title = result.title || query;
                    const content = `${result.snippet}\n\n${result.url ? `Fonte: ${result.url}` : ''}\nFonte da busca: ${result.source || 'Internet'}`;
                    const keywords = extractKeywords(title + ' ' + result.snippet);
                    
                    // Verificar se já existe conhecimento similar
                    const existing = await client.query(
                        `SELECT id FROM ia_knowledge_base 
                         WHERE LOWER(title) = LOWER($1)
                         LIMIT 1`,
                        [title]
                    );
                    
                    if (existing.rows.length === 0) {
                        // Adicionar à base de conhecimento
                        const insertResult = await client.query(
                            `INSERT INTO ia_knowledge_base (title, content, category_id, keywords, source_type, source_reference, created_by)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)
                             RETURNING id, title`,
                            [
                                title,
                                content.substring(0, 10000), // Limitar tamanho
                                category_id || null,
                                keywords,
                                'web_search',
                                `web_search:${query}`,
                                createdByValue
                            ]
                        );
                        
                        addedCount++;
                        addedItems.push({
                            id: insertResult.rows[0].id,
                            title: insertResult.rows[0].title
                        });
                        
                        console.log(`✅ Adicionado à base: "${title}"`);
                    } else {
                        console.log(`⏭️ Já existe conhecimento similar: "${title}"`);
                    }
                } catch (addError) {
                    console.error(`❌ Erro ao adicionar resultado:`, addError);
                }
            }
        }
        
        res.json({
            message: `Busca concluída. ${addedCount} item(s) adicionado(s) à base de conhecimento.`,
            results: searchResults.results,
            added_count: addedCount,
            added_items: addedItems,
            provider: searchResults.provider,
            cached: searchResults.cached || false
        });
        
    } catch (error) {
        console.error('❌ Erro ao aprender da web:', error);
        throw error;
    } finally {
        client.release();
    }
}));

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
