const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');
const fetch = require('node-fetch');

const router = express.Router();

console.log('✅ Rotas IA KING carregadas');

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Função para calcular similaridade entre textos
function calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return (intersection.size / union.size) * 100;
}

// Função para buscar na web
async function searchWeb(query) {
    try {
        const results = [];
        
        // Tentar DuckDuckGo Instant Answer API
        try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const ddgResponse = await fetch(ddgUrl, { timeout: 5000 });
            const ddgData = await ddgResponse.json();
            
            if (ddgData.AbstractText) {
                results.push({
                    title: ddgData.Heading || query,
                    snippet: ddgData.AbstractText,
                    url: ddgData.AbstractURL || '',
                    provider: 'duckduckgo'
                });
            }
        } catch (e) {
            console.log('DuckDuckGo não disponível:', e.message);
        }
        
        // Tentar Wikipedia
        try {
            const wikiUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const wikiResponse = await fetch(wikiUrl, { timeout: 5000 });
            const wikiData = await wikiResponse.json();
            
            if (wikiData.extract) {
                results.push({
                    title: wikiData.title || query,
                    snippet: wikiData.extract.substring(0, 500),
                    url: wikiData.content_urls?.desktop?.page || '',
                    provider: 'wikipedia'
                });
            }
        } catch (e) {
            console.log('Wikipedia não disponível:', e.message);
        }
        
        return {
            results,
            provider: results.length > 0 ? results[0].provider : 'none'
        };
    } catch (error) {
        console.error('Erro na busca web:', error);
        return { results: [], provider: 'error' };
    }
}

// Função para detectar saudações
function detectGreeting(message) {
    const greetings = [
        'oi', 'olá', 'ola', 'hey', 'eae', 'e aí', 'eai', 'opa', 'fala', 'fala aí',
        'bom dia', 'boa tarde', 'boa noite', 'bom dia', 'good morning', 'hello',
        'hi', 'tudo bem', 'td bem', 'como vai', 'como está', 'como esta',
        'tudo bom', 'td bom', 'beleza', 'salve', 'e aí', 'eai'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    
    // Verificar se é uma saudação simples
    for (const greeting of greetings) {
        if (lowerMessage === greeting || lowerMessage.startsWith(greeting + ' ') || lowerMessage.endsWith(' ' + greeting)) {
            return true;
        }
    }
    
    // Verificar padrões de saudação
    const greetingPatterns = [
        /^(oi|olá|ola|hey|eae|opa|fala|salve)[\s!.,]*$/i,
        /^(bom\s+dia|boa\s+tarde|boa\s+noite)[\s!.,]*$/i,
        /^(tudo\s+bem|td\s+bem|tudo\s+bom|td\s+bom)[\s!?.,]*$/i,
        /^(como\s+(vai|está|esta|vcs|vocês))[\s!?.,]*$/i
    ];
    
    for (const pattern of greetingPatterns) {
        if (pattern.test(lowerMessage)) {
            return true;
        }
    }
    
    return false;
}

// Função para gerar resposta de saudação educada
function generateGreetingResponse() {
    const greetings = [
        "Olá! 😊 Tudo bem? Como posso te ajudar hoje?",
        "Oi! Tudo bem? Estou aqui para tirar todas as suas dúvidas sobre o Conecta King! 😊",
        "Olá! Como vai? Fico feliz em ajudar você com qualquer dúvida sobre o sistema! 😊",
        "Oi! Tudo bem? Estou pronta para responder suas perguntas sobre o Conecta King! 😊",
        "Olá! Como posso te ajudar hoje? Tenho todas as informações sobre o Conecta King! 😊"
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
}

// Função para encontrar melhor resposta
async function findBestAnswer(userMessage, userId) {
    const client = await db.pool.connect();
    try {
        // Verificar se é uma saudação primeiro
        if (detectGreeting(userMessage)) {
            return {
                answer: generateGreetingResponse(),
                confidence: 100,
                source: 'greeting'
            };
        }
        
        let bestAnswer = null;
        let bestScore = 0;
        let bestSource = null;
        
        // 1. Buscar em Q&A
        const qaResult = await client.query(`
            SELECT id, question, answer, keywords, usage_count
            FROM ia_qa
            WHERE is_active = true
        `);
        
        for (const qa of qaResult.rows) {
            const questionScore = calculateSimilarity(userMessage, qa.question);
            const keywordScore = qa.keywords && Array.isArray(qa.keywords) 
                ? qa.keywords.filter(k => userMessage.toLowerCase().includes(k.toLowerCase())).length * 10
                : 0;
            const totalScore = questionScore + keywordScore;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestAnswer = qa.answer;
                bestSource = 'qa';
            }
        }
        
        // 2. Buscar na base de conhecimento
        const knowledgeResult = await client.query(`
            SELECT id, title, content, keywords, usage_count
            FROM ia_knowledge_base
            WHERE is_active = true
        `);
        
        for (const kb of knowledgeResult.rows) {
            const titleScore = calculateSimilarity(userMessage, kb.title) * 1.5;
            const contentScore = calculateSimilarity(userMessage, kb.content);
            const keywordScore = kb.keywords && Array.isArray(kb.keywords)
                ? kb.keywords.filter(k => userMessage.toLowerCase().includes(k.toLowerCase())).length * 15
                : 0;
            const totalScore = titleScore + contentScore + keywordScore;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestAnswer = kb.content;
                bestSource = 'knowledge';
            }
        }
        
        // 3. Buscar em documentos processados
        const docsResult = await client.query(`
            SELECT id, title, extracted_text
            FROM ia_documents
            WHERE processed = true AND extracted_text IS NOT NULL AND LENGTH(extracted_text) > 0
        `);
        
        for (const doc of docsResult.rows) {
            const text = doc.extracted_text.substring(0, 5000); // Limitar busca
            const titleScore = calculateSimilarity(userMessage, doc.title) * 2;
            const contentScore = calculateSimilarity(userMessage, text);
            const totalScore = titleScore + contentScore;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                // Extrair trecho relevante
                const words = userMessage.toLowerCase().split(/\s+/);
                const relevantPart = text.split('\n').find(para => 
                    words.some(w => para.toLowerCase().includes(w))
                ) || text.substring(0, 500);
                
                bestAnswer = `Com base no documento "${doc.title}":\n\n${relevantPart}`;
                bestSource = 'document';
            }
        }
        
        // 4. Se confiança baixa, buscar na web
        if (bestScore < 50) {
            const webResults = await searchWeb(userMessage);
            if (webResults.results.length > 0) {
                const bestWeb = webResults.results[0];
                return {
                    answer: bestWeb.snippet + (bestWeb.url ? `\n\n📚 Fonte: ${bestWeb.url}` : ''),
                    confidence: 40,
                    source: 'web',
                    webResults: webResults.results
                };
            }
        }
        
        // Salvar conversa
        if (userId) {
            await client.query(`
                INSERT INTO ia_conversations (user_id, user_message, ai_response, confidence_score, source_type)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, userMessage, bestAnswer || 'Não encontrei uma resposta específica.', bestScore, bestSource || 'none']);
        }
        
        // Resposta padrão mais educada e útil
        if (!bestAnswer || bestScore < 30) {
            return {
                answer: `Olá! 😊 Não encontrei uma resposta específica para sua pergunta, mas posso te ajudar com:\n\n• Informações sobre planos e valores\n• Como usar os módulos do sistema\n• Como editar e personalizar seu cartão\n• Como compartilhar seu cartão\n• Dúvidas sobre funcionalidades\n\nPode reformular sua pergunta de outra forma ou me perguntar sobre algum desses tópicos? Estou aqui para ajudar! 😊`,
                confidence: 0,
                source: 'default'
            };
        }
        
        return {
            answer: bestAnswer,
            confidence: bestScore,
            source: bestSource || 'none'
        };
    } finally {
        client.release();
    }
}

// ============================================
// ROTAS DE CHAT
// ============================================

// POST /api/ia-king/chat
router.post('/chat', protectUser, asyncHandler(async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    try {
        const result = await findBestAnswer(message.trim(), userId || req.user.userId);
        res.json({
            response: result.answer,
            confidence: result.confidence,
            source: result.source,
            webResults: result.webResults || null
        });
    } catch (error) {
        console.error('Erro no chat:', error);
        res.status(500).json({ error: 'Erro ao processar mensagem' });
    }
}));

// ============================================
// ROTAS DE CONHECIMENTO (ADMIN)
// ============================================

// GET /api/ia-king/knowledge
router.get('/knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT kb.*, c.name as category_name
            FROM ia_knowledge_base kb
            LEFT JOIN ia_categories c ON kb.category_id = c.id
            ORDER BY kb.created_at DESC
        `);
        res.json({ knowledge: result.rows });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/knowledge
router.post('/knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const { title, content, category_id, keywords } = req.body;
    const adminId = req.user.userId;
    
    if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }
    
    const client = await db.pool.connect();
    try {
        let createdByValue = null;
        if (adminId) {
            const adminIdNum = parseInt(adminId);
            createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
        }
        
        const result = await client.query(`
            INSERT INTO ia_knowledge_base (title, content, category_id, keywords, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [title, content, category_id || null, Array.isArray(keywords) ? keywords : [], createdByValue]);
        
        res.json({ knowledge: result.rows[0] });
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/knowledge/:id
router.put('/knowledge/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, category_id, keywords, is_active } = req.body;
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            UPDATE ia_knowledge_base
            SET title = COALESCE($1, title),
                content = COALESCE($2, content),
                category_id = COALESCE($3, category_id),
                keywords = COALESCE($4, keywords),
                is_active = COALESCE($5, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [title, content, category_id, keywords ? (Array.isArray(keywords) ? keywords : []) : null, is_active, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conhecimento não encontrado' });
        }
        
        res.json({ knowledge: result.rows[0] });
    } finally {
        client.release();
    }
}));

// DELETE /api/ia-king/knowledge/:id
router.delete('/knowledge/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await db.pool.connect();
    try {
        await client.query('DELETE FROM ia_knowledge_base WHERE id = $1', [id]);
        res.json({ message: 'Conhecimento deletado com sucesso' });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE Q&A (ADMIN)
// ============================================

// GET /api/ia-king/qa
router.get('/qa', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT qa.*, c.name as category_name
            FROM ia_qa qa
            LEFT JOIN ia_categories c ON qa.category_id = c.id
            ORDER BY qa.created_at DESC
        `);
        res.json({ qa: result.rows });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/qa
router.post('/qa', protectAdmin, asyncHandler(async (req, res) => {
    const { question, answer, category_id, keywords, question_variations } = req.body;
    const adminId = req.user.userId;
    
    if (!question || !answer) {
        return res.status(400).json({ error: 'Pergunta e resposta são obrigatórias' });
    }
    
    const client = await db.pool.connect();
    try {
        let createdByValue = null;
        if (adminId) {
            const adminIdNum = parseInt(adminId);
            createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
        }
        
        const result = await client.query(`
            INSERT INTO ia_qa (question, answer, category_id, keywords, question_variations, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            question,
            answer,
            category_id || null,
            Array.isArray(keywords) ? keywords : [],
            Array.isArray(question_variations) ? question_variations : [],
            createdByValue
        ]);
        
        res.json({ qa: result.rows[0] });
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/qa/:id
router.put('/qa/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { question, answer, category_id, keywords, question_variations, is_active } = req.body;
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            UPDATE ia_qa
            SET question = COALESCE($1, question),
                answer = COALESCE($2, answer),
                category_id = COALESCE($3, category_id),
                keywords = COALESCE($4, keywords),
                question_variations = COALESCE($5, question_variations),
                is_active = COALESCE($6, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [
            question,
            answer,
            category_id,
            keywords ? (Array.isArray(keywords) ? keywords : []) : null,
            question_variations ? (Array.isArray(question_variations) ? question_variations : []) : null,
            is_active,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Q&A não encontrado' });
        }
        
        res.json({ qa: result.rows[0] });
    } finally {
        client.release();
    }
}));

// DELETE /api/ia-king/qa/:id
router.delete('/qa/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await db.pool.connect();
    try {
        await client.query('DELETE FROM ia_qa WHERE id = $1', [id]);
        res.json({ message: 'Q&A deletado com sucesso' });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE CATEGORIAS
// ============================================

// GET /api/ia-king/categories
router.get('/categories', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM ia_categories
            WHERE is_active = true
            ORDER BY priority DESC, name ASC
        `);
        res.json({ categories: result.rows });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE ESTATÍSTICAS
// ============================================

// GET /api/ia-king/stats
router.get('/stats', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const [knowledgeCount, qaCount, docCount, convCount, learningCount] = await Promise.all([
            client.query('SELECT COUNT(*) as count FROM ia_knowledge_base'),
            client.query('SELECT COUNT(*) as count FROM ia_qa'),
            client.query('SELECT COUNT(*) as count FROM ia_documents'),
            client.query('SELECT COUNT(*) as count FROM ia_conversations WHERE DATE(created_at) = CURRENT_DATE'),
            client.query("SELECT COUNT(*) as count FROM ia_learning WHERE status = 'pending'")
        ]);
        
        res.json({
            total_knowledge: parseInt(knowledgeCount.rows[0].count),
            total_qa: parseInt(qaCount.rows[0].count),
            total_documents: parseInt(docCount.rows[0].count),
            conversations_today: parseInt(convCount.rows[0].count),
            pending_learning: parseInt(learningCount.rows[0].count)
        });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE DOCUMENTOS (ADMIN)
// ============================================

// GET /api/ia-king/documents
router.get('/documents', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT d.*, c.name as category_name
            FROM ia_documents d
            LEFT JOIN ia_categories c ON d.category_id = c.id
            ORDER BY d.created_at DESC
        `);
        res.json({ documents: result.rows });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/documents/upload
router.post('/documents/upload', protectAdmin, asyncHandler(async (req, res) => {
    // Esta rota precisa de multer - será implementada separadamente se necessário
    res.status(501).json({ error: 'Upload de documentos será implementado em breve' });
}));

// POST /api/ia-king/documents/:id/process
router.post('/documents/:id/process', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await db.pool.connect();
    try {
        // Marcar documento como processado (processamento real será feito em background)
        await client.query(`
            UPDATE ia_documents
            SET processed = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);
        
        res.json({ message: 'Documento marcado para processamento' });
    } finally {
        client.release();
    }
}));

// DELETE /api/ia-king/documents/:id
router.delete('/documents/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await db.pool.connect();
    try {
        await client.query('DELETE FROM ia_documents WHERE id = $1', [id]);
        res.json({ message: 'Documento deletado com sucesso' });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTA DE TREINAMENTO INICIAL
// ============================================

// POST /api/ia-king/train-initial - Treinamento inicial completo do sistema (ADM)
router.post('/train-initial', protectAdmin, asyncHandler(async (req, res) => {
    console.log('📥 Requisição recebida: POST /api/ia-king/train-initial');
    const client = await db.pool.connect();
    try {
        console.log('🧠 Iniciando treinamento inicial completo da IA KING...');
        
        // Buscar informações do sistema
        const plansResult = await client.query('SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC');
        const modulesResult = await client.query(`
            SELECT DISTINCT module_type 
            FROM module_plan_availability 
            WHERE is_available = true 
            ORDER BY module_type
        `);
        
        const knowledgeEntries = [];
        
        // 1. Informações gerais do sistema
        knowledgeEntries.push({
            title: 'O que é o Conecta King?',
            content: `O Conecta King é uma plataforma completa e profissional para criação de cartões virtuais digitais. Com ele, você pode criar um cartão de visita virtual moderno e interativo que funciona como um hub central para todas as suas informações profissionais e de contato.

Funcionalidades principais:
• Criação de cartão virtual personalizado
• Múltiplos módulos integrados (redes sociais, contatos, links, etc.)
• Sistema de assinatura com diferentes planos
• Página de vendas integrada
• Compartilhamento fácil via link único
• Design responsivo e profissional
• Analytics e relatórios de visualizações

O Conecta King é ideal para profissionais, empresas e empreendedores que querem ter uma presença digital profissional e moderna.`,
            keywords: ['conecta king', 'plataforma', 'cartão virtual', 'o que é', 'funcionalidades', 'recursos'],
            category: 'Sistema'
        });
        
        // 2. Planos e valores detalhados
        if (plansResult.rows.length > 0) {
            let plansContent = 'O Conecta King oferece os seguintes planos de assinatura:\n\n';
            
            plansResult.rows.forEach((plan, index) => {
                // Verificar se features já é um objeto ou precisa ser parseado
                let features = {};
                if (plan.features) {
                    if (typeof plan.features === 'string') {
                        try {
                            features = JSON.parse(plan.features);
                        } catch (e) {
                            features = {};
                        }
                    } else if (typeof plan.features === 'object') {
                        features = plan.features;
                    }
                }
                // Converter price para número
                const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price) || 0;
                plansContent += `**${plan.plan_name}** - R$ ${price.toFixed(2)}/mês\n`;
                plansContent += `Código: ${plan.plan_code}\n`;
                if (plan.description) {
                    plansContent += `${plan.description}\n`;
                }
                
                if (plan.plan_code === 'basic') {
                    plansContent += `\nRecursos incluídos:\n`;
                    plansContent += `• Todas as funcionalidades do cartão\n`;
                    plansContent += `• Todos os módulos disponíveis\n`;
                    plansContent += `• 1 perfil/cartão\n`;
                    plansContent += `• NÃO pode alterar a logomarca do Conecta King no rodapé\n`;
                } else if (plan.plan_code === 'premium') {
                    plansContent += `\nRecursos incluídos:\n`;
                    plansContent += `• Todas as funcionalidades do cartão\n`;
                    plansContent += `• Todos os módulos disponíveis\n`;
                    plansContent += `• 1 perfil/cartão\n`;
                    plansContent += `• PODE alterar a logomarca do Conecta King no rodapé\n`;
                } else if (plan.plan_code === 'enterprise') {
                    plansContent += `\nRecursos incluídos:\n`;
                    plansContent += `• Todas as funcionalidades do cartão\n`;
                    plansContent += `• Todos os módulos disponíveis\n`;
                    plansContent += `• 3 perfis/cartões em uma única assinatura\n`;
                    plansContent += `• PODE alterar a logomarca do Conecta King no rodapé para cada cartão\n`;
                    plansContent += `• Ideal para empresas que precisam de múltiplos cartões\n`;
                }
                
                if (plan.whatsapp_number) {
                    plansContent += `\nPara assinar: Entre em contato via WhatsApp ${plan.whatsapp_number}\n`;
                }
                if (plan.pix_key) {
                    plansContent += `Pagamento via PIX: ${plan.pix_key}\n`;
                }
                plansContent += '\n';
            });
            
            knowledgeEntries.push({
                title: 'Planos e Valores do Conecta King',
                content: plansContent,
                keywords: ['planos', 'valores', 'preços', 'assinatura', 'pacotes', 'basic', 'premium', 'enterprise', 'individual', 'empresarial'],
                category: 'Assinatura'
            });
            
            // Entrada específica sobre valores
            knowledgeEntries.push({
                title: 'Quais são os valores dos planos?',
                content: `Os valores dos planos do Conecta King são:\n\n${plansResult.rows.map(p => {
                    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
                    return `• **${p.plan_name}**: R$ ${price.toFixed(2)} por mês`;
                }).join('\n')}\n\nCada plano oferece funcionalidades específicas. O Pacote 1 (R$ 480) inclui todas as funcionalidades mas não permite alterar a logomarca. O Pacote 2 (R$ 700) permite alterar a logomarca. O Pacote 3 (R$ 1.500) é empresarial e inclui 3 cartões com logomarcas personalizáveis.`,
                keywords: ['valores', 'preços', 'quanto custa', 'mensalidade', '480', '700', '1500', 'R$', 'reais'],
                category: 'Assinatura'
            });
            
            // Entrada sobre como assinar
            knowledgeEntries.push({
                title: 'Como assinar um plano?',
                content: `Para assinar um plano do Conecta King:\n\n1. Acesse a seção "Assinatura" no seu dashboard\n2. Escolha o plano que deseja (Pacote 1, 2 ou 3)\n3. Clique em "Assinar agora"\n4. Entre em contato via WhatsApp ou faça o pagamento via PIX\n5. Após a confirmação do pagamento, seu plano será ativado\n\nOs valores são:\n${plansResult.rows.map(p => {
                    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
                    return `• ${p.plan_name}: R$ ${price.toFixed(2)}/mês`;
                }).join('\n')}`,
                keywords: ['como assinar', 'assinar', 'contratar', 'adquirir plano', 'pagamento'],
                category: 'Assinatura'
            });
        }
        
        // 3. Módulos disponíveis
        if (modulesResult.rows.length > 0) {
            const moduleNames = {
                'whatsapp': 'WhatsApp',
                'telegram': 'Telegram',
                'email': 'E-mail',
                'pix': 'PIX',
                'pix_qrcode': 'PIX QR Code',
                'facebook': 'Facebook',
                'instagram': 'Instagram',
                'tiktok': 'TikTok',
                'twitter': 'Twitter',
                'youtube': 'YouTube',
                'spotify': 'Spotify',
                'linkedin': 'LinkedIn',
                'pinterest': 'Pinterest',
                'link': 'Link Personalizado',
                'portfolio': 'Portfólio',
                'banner': 'Banner',
                'carousel': 'Carrossel',
                'youtube_embed': 'YouTube Incorporado',
                'sales_page': 'Página de Vendas'
            };
            
            const modulesList = modulesResult.rows.map(r => {
                const name = moduleNames[r.module_type] || r.module_type;
                return `• ${name}`;
            }).join('\n');
            
            knowledgeEntries.push({
                title: 'Módulos Disponíveis no Conecta King',
                content: `O Conecta King oferece os seguintes módulos que podem ser adicionados ao seu cartão virtual:\n\n${modulesList}\n\nVocê pode adicionar quantos módulos quiser (de acordo com seu plano) e organizá-los na ordem que preferir. Cada módulo permite adicionar suas informações específicas, como links de redes sociais, números de WhatsApp, e-mails, e muito mais.`,
                keywords: ['módulos', 'disponíveis', 'adicionar', 'tipos', 'redes sociais', 'contato'],
                category: 'Módulos'
            });
        }
        
        // 4. Como funciona o sistema
        knowledgeEntries.push({
            title: 'Como funciona o Conecta King?',
            content: `O Conecta King funciona de forma simples e intuitiva:

1. **Criação do Cartão**: Você cria seu cartão virtual personalizado com suas informações
2. **Adição de Módulos**: Adicione os módulos que deseja (WhatsApp, Instagram, links, etc.)
3. **Personalização**: Organize os módulos na ordem que preferir, adicione fotos, banners
4. **Compartilhamento**: Compartilhe seu link único do cartão com quem quiser
5. **Acompanhamento**: Veja quantas pessoas visualizaram seu cartão através dos relatórios

O cartão funciona como um site pessoal, mas muito mais simples e focado em conectar você com seus contatos e clientes.`,
            keywords: ['como funciona', 'funcionamento', 'usar', 'tutorial', 'passo a passo'],
            category: 'Sistema'
        });
        
        // 5. Diferenças entre planos
        knowledgeEntries.push({
            title: 'Qual a diferença entre os planos?',
            content: `As principais diferenças entre os planos são:

**Pacote 1 (R$ 480/mês)**:
• Todas as funcionalidades do cartão
• Todos os módulos disponíveis
• 1 cartão/perfil
• NÃO pode alterar a logomarca do Conecta King no rodapé

**Pacote 2 (R$ 700/mês)**:
• Todas as funcionalidades do cartão
• Todos os módulos disponíveis
• 1 cartão/perfil
• PODE alterar a logomarca do Conecta King no rodapé

**Pacote 3 (R$ 1.500/mês)**:
• Todas as funcionalidades do cartão
• Todos os módulos disponíveis
• 3 cartões/perfis em uma única assinatura
• PODE alterar a logomarca do Conecta King no rodapé para cada cartão
• Ideal para empresas`,
            keywords: ['diferença', 'comparação', 'qual escolher', 'qual plano', 'individual', 'empresarial'],
            category: 'Assinatura'
        });
        
        // 6. Informações sobre módulos específicos
        knowledgeEntries.push({
            title: 'Como adicionar módulos ao cartão?',
            content: `Para adicionar módulos ao seu cartão virtual:

1. Acesse seu dashboard
2. Clique em "Adicionar Módulo" ou no botão "+"
3. Escolha o tipo de módulo que deseja adicionar
4. Preencha as informações solicitadas (links, números, textos, etc.)
5. Adicione uma imagem se necessário
6. Salve e publique as alterações

Você pode adicionar múltiplos módulos e organizá-los na ordem que preferir usando os botões de mover ou arrastando e soltando.

Os módulos disponíveis dependem do seu plano de assinatura.`,
            keywords: ['adicionar módulo', 'como adicionar', 'módulos', 'adicionar', 'criar módulo'],
            category: 'Módulos'
        });
        
        // 7. Informações sobre página de vendas
        knowledgeEntries.push({
            title: 'Página de Vendas - Conecta King',
            content: `A Página de Vendas é um módulo especial do Conecta King que permite criar uma página completa de vendas personalizada.

Funcionalidades:
• Design personalizado com cores e estilos
• Banner principal com imagem
• Logo personalizada (com sistema de corte)
• Descrição completa do produto/serviço
• Catálogo de produtos integrado
• Botões de ação (WhatsApp, compra, etc.)
• Analytics de visualizações e cliques

Como usar:
1. Adicione o módulo "Página de Vendas"
2. Configure o banner, logo e descrição
3. Adicione produtos ao catálogo se desejar
4. Personalize cores e estilos
5. Publique e compartilhe o link

A página de vendas é ideal para profissionais que querem vender produtos ou serviços diretamente pelo cartão virtual.`,
            keywords: ['página de vendas', 'sales page', 'vendas', 'produtos', 'catálogo'],
            category: 'Módulos'
        });
        
        // 8. Informações sobre compartilhamento
        knowledgeEntries.push({
            title: 'Como compartilhar meu cartão?',
            content: `Compartilhar seu cartão virtual é muito simples:

1. Acesse seu dashboard
2. Clique em "Ver Cartão" ou "Compartilhar"
3. Copie o link único do seu cartão
4. Compartilhe onde quiser: WhatsApp, Instagram, email, etc.

O link é único e permanente. Todas as pessoas que acessarem verão seu cartão atualizado com todas as informações e módulos que você configurou.

Você também pode usar o QR Code para compartilhamento físico (impressão em cartões de visita, por exemplo).

Todas as visualizações são registradas e você pode acompanhar nos relatórios.`,
            keywords: ['compartilhar', 'link', 'QR code', 'como compartilhar', 'link único'],
            category: 'Sistema'
        });
        
        // 9. Informações sobre relatórios e analytics
        knowledgeEntries.push({
            title: 'Relatórios e Analytics do Conecta King',
            content: `O Conecta King oferece relatórios completos para você acompanhar o desempenho do seu cartão virtual:

**Métricas Disponíveis:**
• Total de visualizações do cartão
• Total de cliques nos links
• Taxa de conversão (CTR)
• Visualizações por período (7, 30, 90 dias)
• Cliques por módulo/item
• Top itens mais clicados

**Como Acessar:**
1. Acesse seu dashboard
2. Clique na aba "Relatórios"
3. Escolha o período que deseja visualizar
4. Veja todas as métricas e gráficos

Os relatórios ajudam você a entender como as pessoas estão interagindo com seu cartão e quais módulos são mais populares.`,
            keywords: ['relatórios', 'analytics', 'estatísticas', 'métricas', 'visualizações', 'cliques', 'desempenho'],
            category: 'Sistema'
        });
        
        // 10. Informações sobre personalização
        knowledgeEntries.push({
            title: 'Personalização do Cartão Virtual',
            content: `O Conecta King oferece várias opções de personalização:

**Cores e Estilo:**
• Escolha cores personalizadas para o cartão
• Personalize o fundo (cor sólida ou imagem)
• Ajuste o estilo dos botões e links

**Avatar/Foto de Perfil:**
• Faça upload da sua foto de perfil
• Escolha o formato: circular, quadrado grande ou quadrado pequeno
• A foto aparece no topo do seu cartão

**Organização:**
• Organize os módulos na ordem que preferir
• Arraste e solte para reorganizar
• Adicione ou remova módulos quando quiser

**Banners e Carrosséis:**
• Adicione banners de imagem
• Crie carrosséis com múltiplas imagens
• Personalize cada elemento visual

Todas as alterações podem ser feitas a qualquer momento e são aplicadas imediatamente ao seu cartão.`,
            keywords: ['personalizar', 'personalização', 'cores', 'estilo', 'avatar', 'foto', 'design', 'customizar'],
            category: 'Sistema'
        });
        
        // 11. Informações sobre módulos específicos - WhatsApp
        knowledgeEntries.push({
            title: 'Módulo WhatsApp',
            content: `O módulo WhatsApp permite adicionar um botão direto para conversa no WhatsApp.

**Como usar:**
1. Adicione o módulo WhatsApp ao seu cartão
2. Insira seu número de WhatsApp (com código do país, ex: 5511999999999)
3. Adicione uma mensagem pré-definida (opcional)
4. Escolha uma imagem/ícone para o botão
5. Salve e publique

Quando alguém clicar no botão, será direcionado para uma conversa no WhatsApp com você, já com a mensagem pré-definida (se você configurou).

É uma forma muito eficiente de receber contatos e leads!`,
            keywords: ['whatsapp', 'contato', 'conversa', 'chat', 'zap', 'wpp'],
            category: 'Módulos'
        });
        
        // 12. Informações sobre módulos específicos - Instagram
        knowledgeEntries.push({
            title: 'Módulo Instagram',
            content: `O módulo Instagram permite adicionar um link direto para seu perfil no Instagram.

**Como usar:**
1. Adicione o módulo Instagram ao seu cartão
2. Insira seu @ do Instagram (ex: @seuperfil)
3. Adicione uma imagem personalizada (opcional)
4. Salve e publique

Quando alguém clicar, será direcionado para seu perfil no Instagram. É uma forma fácil de aumentar seus seguidores e engajamento!`,
            keywords: ['instagram', 'insta', '@', 'perfil', 'seguidores'],
            category: 'Módulos'
        });
        
        // 13. Informações sobre PIX
        knowledgeEntries.push({
            title: 'Módulos PIX e PIX QR Code',
            content: `O Conecta King oferece dois módulos relacionados ao PIX:

**Módulo PIX:**
• Exibe suas informações de PIX (chave, nome, etc.)
• Permite que clientes copiem facilmente
• Ideal para receber pagamentos

**Módulo PIX QR Code:**
• Gera um QR Code do seu PIX automaticamente
• Cliente escaneia e paga direto
• Mais rápido e prático

**Como usar:**
1. Adicione o módulo PIX ou PIX QR Code
2. Configure suas informações de pagamento
3. O QR Code é gerado automaticamente
4. Clientes podem pagar escaneando o código

Ambos os módulos facilitam muito o recebimento de pagamentos pelos seus produtos ou serviços!`,
            keywords: ['pix', 'pagamento', 'QR code', 'qrcode', 'receber', 'dinheiro', 'transferência'],
            category: 'Módulos'
        });
        
        // 14. Informações sobre suporte
        knowledgeEntries.push({
            title: 'Suporte e Ajuda',
            content: `O Conecta King oferece várias formas de suporte:

**IA King (Assistente Virtual):**
• Estou aqui para responder suas dúvidas!
• Pergunte sobre funcionalidades, planos, módulos, etc.
• Estou disponível 24/7

**Seção de Ajuda:**
• Acesse "Ajuda e Configurações" no dashboard
• Encontre respostas para dúvidas comuns
• Tutoriais e guias passo a passo

**Suporte Técnico:**
• Entre em contato via WhatsApp (verifique nas informações do seu plano)
• Nossa equipe está pronta para ajudar
• Resposta rápida e eficiente

**Documentação:**
• Base de conhecimento completa
• Perguntas frequentes (FAQ)
• Exemplos e casos de uso

Não hesite em perguntar! Estou aqui para ajudar você a aproveitar ao máximo o Conecta King! 😊`,
            keywords: ['suporte', 'ajuda', 'dúvida', 'problema', 'erro', 'como fazer', 'tutorial'],
            category: 'Suporte'
        });
        
        // 15. Informações sobre criação de conta
        knowledgeEntries.push({
            title: 'Como criar uma conta no Conecta King?',
            content: `Criar uma conta no Conecta King é muito simples:

**Passo a Passo:**
1. Acesse o site do Conecta King
2. Clique em "Criar Conta" ou "Registrar"
3. Preencha seus dados (nome, email, senha)
4. Confirme seu email (se solicitado)
5. Faça login e comece a usar!

**Período de Teste:**
• Todos os novos usuários têm um período de teste gratuito
• Explore todas as funcionalidades
• Crie seu primeiro cartão virtual
• Veja como funciona antes de assinar um plano

**Após o Teste:**
• Escolha um plano que se adapte às suas necessidades
• Continue usando todas as funcionalidades
• Seu cartão permanece ativo

É rápido, fácil e você pode começar a usar imediatamente!`,
            keywords: ['criar conta', 'registrar', 'cadastro', 'cadastrar', 'nova conta', 'começar'],
            category: 'Sistema'
        });
        
        // 16. Informações sobre edição do cartão
        knowledgeEntries.push({
            title: 'Como editar meu cartão virtual?',
            content: `Editar seu cartão virtual é muito fácil:

**Informações Básicas:**
1. Acesse seu dashboard
2. Vá para a aba "Informações"
3. Edite nome, bio, foto de perfil
4. Configure seu @ do Instagram
5. Escolha o formato do avatar

**Adicionar/Editar Módulos:**
1. Vá para a aba "Módulos"
2. Clique em "Adicionar Módulo" ou no botão "+"
3. Escolha o tipo de módulo
4. Preencha as informações
5. Organize na ordem desejada

**Personalizar Visual:**
1. Vá para a aba "Personalizar"
2. Escolha cores e estilos
3. Configure fundo e banners
4. Ajuste conforme sua preferência

**Salvar Alterações:**
• Sempre clique em "Publicar alterações" após fazer mudanças
• As alterações são aplicadas imediatamente
• Você pode editar quantas vezes quiser

Todas as edições são em tempo real e você vê o preview ao lado!`,
            keywords: ['editar', 'edição', 'modificar', 'alterar', 'mudar', 'atualizar', 'configurar'],
            category: 'Sistema'
        });
        
        // 17. Informações sobre link personalizado
        knowledgeEntries.push({
            title: 'Link Personalizado do Cartão',
            content: `Cada cartão virtual tem um link único e personalizado:

**Formato do Link:**
• tag.conectaking.com.br/seu-usuario
• Ou um slug personalizado que você escolher

**Como Personalizar:**
1. Acesse "Informações" no dashboard
2. Edite o campo "@ do Instagram" ou "Slug"
3. Escolha um nome único e fácil de lembrar
4. Salve as alterações

**Características:**
• Link permanente e único
• Fácil de compartilhar
• Funciona em qualquer dispositivo
• Sempre atualizado com suas informações

**Compartilhamento:**
• Copie o link e compartilhe onde quiser
• Use em assinaturas de email
• Adicione em redes sociais
• Imprima em cartões de visita físicos

Seu link é sua identidade digital!`,
            keywords: ['link', 'URL', 'endereço', 'slug', 'personalizado', 'compartilhar link'],
            category: 'Sistema'
        });
        
        // Inserir todas as entradas na base de conhecimento
        let insertedCount = 0;
        const categoryMap = {};
        
        // Buscar categorias
        const categoriesResult = await client.query('SELECT id, name FROM ia_categories');
        categoriesResult.rows.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });
        
        for (const entry of knowledgeEntries) {
            try {
                // Verificar se já existe
                const existing = await client.query(
                    'SELECT id FROM ia_knowledge_base WHERE LOWER(title) = LOWER($1)',
                    [entry.title]
                );
                
                if (existing.rows.length === 0) {
                    await client.query(
                        `INSERT INTO ia_knowledge_base (title, content, category_id, keywords, source_type, priority)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            entry.title,
                            entry.content,
                            categoryMap[entry.category] || null,
                            Array.isArray(entry.keywords) ? entry.keywords : [],
                            'system_training',
                            100 // Alta prioridade
                        ]
                    );
                    insertedCount++;
                }
            } catch (error) {
                console.error(`Erro ao inserir conhecimento: ${entry.title}`, error);
            }
        }
        
        console.log(`✅ Treinamento inicial concluído! ${insertedCount} entradas adicionadas.`);
        
        res.json({
            message: `Treinamento inicial concluído com sucesso! ${insertedCount} entradas de conhecimento adicionadas à base.`,
            inserted: insertedCount,
            total: knowledgeEntries.length
        });
        
    } catch (error) {
        console.error('❌ Erro no treinamento inicial:', error);
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
