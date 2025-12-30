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

// Função para detectar se a pergunta é sobre o sistema Conecta King
function isAboutSystem(message) {
    const systemKeywords = [
        'conecta king', 'conectaking', 'cartão virtual', 'cartão', 'cartao',
        'assinatura', 'plano', 'pacote', 'módulo', 'modulo', 'dashboard',
        'perfil', 'sistema', 'funcionalidade', 'como usar', 'como funciona',
        'valores', 'preços', 'preco', 'quanto custa', 'custa', 'logomarca',
        'logo', 'personalização', 'personalizacao', 'compartilhar', 'compartilhamento'
    ];
    
    const lowerMessage = message.toLowerCase();
    return systemKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Função para calcular similaridade entre textos (melhorada e mais inteligente)
function calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    try {
        const lower1 = text1.toLowerCase().trim();
        const lower2 = text2.toLowerCase().trim();
        
        // Verificação exata (maior peso)
        if (lower1 === lower2) return 100;
        
        // Verificação de substring (alto peso)
        if (lower1.includes(lower2) || lower2.includes(lower1)) return 80;
        
        // Processar palavras (remover palavras muito comuns)
        const commonWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por', 'que', 'é', 'são', 'está', 'estão', 'ser', 'ter', 'fazer', 'pode', 'sua', 'seu', 'suas', 'seus', 'me', 'te', 'nos', 'você', 'vocês', 'qual', 'quais', 'como', 'quando', 'onde'];
        const words1 = lower1.split(/\s+/).filter(w => w.length > 2 && !commonWords.includes(w));
        const words2 = lower2.split(/\s+/).filter(w => w.length > 2 && !commonWords.includes(w));
        
        if (words1.length === 0 || words2.length === 0) return 0;
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        // Intersecção de palavras
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        if (union.size === 0) return 0;
        
        // Calcular similaridade básica
        const basicSimilarity = (intersection.size / union.size) * 100;
        
        // Bonus por palavras importantes em comum (apenas palavras do sistema)
        const systemImportantWords = ['valores', 'planos', 'preços', 'módulos', 'cartão', 'sistema', 'funcionalidades', 'assinatura', 'pacote'];
        const systemMatches = words1.filter(w => systemImportantWords.includes(w) && set2.has(w)).length;
        const systemBonus = systemMatches * 10;
        
        // Penalidade se pergunta não é sobre sistema mas resposta é
        let penalty = 0;
        if (!isAboutSystem(lower1) && isAboutSystem(lower2)) {
            penalty = -50; // Grande penalidade se pergunta não é sobre sistema mas resposta é
        }
        
        return Math.max(0, Math.min(100, basicSimilarity + systemBonus + penalty));
    } catch (error) {
        console.error('Erro ao calcular similaridade:', error);
        return 0;
    }
}

// Função para encontrar palavras-chave na mensagem
function extractKeywords(message) {
    const lowerMessage = message.toLowerCase();
    const commonWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por', 'que', 'é', 'são', 'está', 'estão'];
    const words = lowerMessage.split(/\s+/).filter(w => w.length > 2 && !commonWords.includes(w));
    return words;
}

// Função para buscar usando Tavily API
async function searchWithTavily(query, apiKey) {
    try {
        if (!apiKey) {
            throw new Error('API Key do Tavily não configurada');
        }
        
        console.log('🌐 [Tavily] Fazendo requisição para Tavily API...');
        const tavilyUrl = 'https://api.tavily.com/search';
        
        // Criar promise com timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na requisição Tavily')), 10000)
        );
        
        const fetchPromise = fetch(tavilyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                query: query,
                search_depth: 'basic',
                max_results: 5,
                include_answer: true,
                include_raw_content: false
            })
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📥 [Tavily] Resposta recebida:', {
            hasAnswer: !!data.answer,
            resultsCount: data.results?.length || 0
        });
        
        const results = [];
        
        // Processar resultados
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach((result, index) => {
                results.push({
                    title: result.title || `Resultado ${index + 1}`,
                    snippet: result.content || result.snippet || '',
                    url: result.url || '',
                    provider: 'tavily',
                    score: result.score || 0
                });
            });
        }
        
        // Se houver resposta direta do Tavily, adicionar como primeiro resultado
        if (data.answer) {
            results.unshift({
                title: 'Resposta Direta',
                snippet: data.answer,
                url: '',
                provider: 'tavily',
                score: 100
            });
        }
        
        return {
            results,
            provider: 'tavily',
            answer: data.answer || null
        };
    } catch (error) {
        console.error('Erro ao buscar com Tavily:', error);
        return { results: [], provider: 'tavily', error: error.message };
    }
}

// Função para buscar na web (com suporte a Tavily)
async function searchWeb(query, config = null) {
    try {
        const results = [];
        
        // Se Tavily estiver configurado e habilitado, usar primeiro
        if (config && config.is_enabled && config.api_provider === 'tavily' && config.api_key) {
            console.log('🔍 [Tavily] Buscando na web usando Tavily API:', query.substring(0, 50));
            const tavilyResult = await searchWithTavily(query, config.api_key);
            if (tavilyResult.results && tavilyResult.results.length > 0) {
                console.log('✅ [Tavily] Resultados encontrados:', tavilyResult.results.length, 'resultados');
                return tavilyResult;
            } else {
                console.log('⚠️ [Tavily] Nenhum resultado encontrado, usando fallback');
            }
        } else {
            console.log('ℹ️ [Tavily] Não configurado ou desabilitado. Config:', {
                is_enabled: config?.is_enabled,
                api_provider: config?.api_provider,
                has_api_key: !!config?.api_key
            });
        }
        
        // Fallback para buscas gratuitas
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

// Função para aprender com Tavily e adicionar à base de conhecimento
async function learnFromTavily(question, answer, client) {
    try {
        // Verificar se já existe resposta similar (buscar por título similar)
        const existing = await client.query(`
            SELECT id, title FROM ia_knowledge_base 
            WHERE LOWER(title) = LOWER($1)
            LIMIT 1
        `, [question]);
        
        if (existing.rows.length === 0) {
            // Adicionar à base de conhecimento
            const keywords = extractKeywords(question);
            await client.query(`
                INSERT INTO ia_knowledge_base (title, content, keywords, source_type, is_active)
                VALUES ($1, $2, $3, 'tavily_learned', true)
            `, [
                question,
                answer.substring(0, 5000), // Limitar tamanho
                keywords
            ]);
            console.log('📚 [IA] Aprendido e adicionado à base de conhecimento:', question.substring(0, 50));
        } else {
            console.log('ℹ️ [IA] Já existe conhecimento similar, não adicionando duplicado');
        }
    } catch (error) {
        console.error('Erro ao aprender com Tavily:', error);
        // Não bloquear se der erro ao aprender
    }
}

// Função para encontrar melhor resposta
async function findBestAnswer(userMessage, userId) {
    const client = await db.pool.connect();
    let knowledgeResult = null;
    
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
        try {
            const qaResult = await client.query(`
                SELECT id, question, answer, keywords, usage_count
                FROM ia_qa
                WHERE is_active = true
            `);
            
            for (const qa of qaResult.rows) {
                if (!qa.question || !qa.answer) continue;
                
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
        } catch (error) {
            console.error('Erro ao buscar Q&A:', error);
        }
        
        // 2. Buscar na base de conhecimento
        try {
            knowledgeResult = await client.query(`
                SELECT id, title, content, keywords, usage_count
                FROM ia_knowledge_base
                WHERE is_active = true
            `);
            
            // Extrair palavras-chave da mensagem do usuário
            const userKeywords = extractKeywords(userMessage);
            
            for (const kb of knowledgeResult.rows) {
                if (!kb.title || !kb.content) continue;
                
                // Calcular scores múltiplos
                const titleScore = calculateSimilarity(userMessage, kb.title) * 2.0; // Título tem peso maior
                const contentScore = calculateSimilarity(userMessage, kb.content) * 0.8;
                
                // Score por palavras-chave cadastradas
                let keywordScore = 0;
                if (kb.keywords && Array.isArray(kb.keywords)) {
                    const matchingKeywords = kb.keywords.filter(k => {
                        const lowerK = k.toLowerCase();
                        return userMessage.toLowerCase().includes(lowerK) || 
                               userKeywords.some(uk => lowerK.includes(uk) || uk.includes(lowerK));
                    });
                    keywordScore = matchingKeywords.length * 20; // Aumentado peso das palavras-chave
                }
                
                // Score por palavras-chave extraídas da mensagem
                let extractedKeywordScore = 0;
                if (kb.content) {
                    const contentLower = kb.content.toLowerCase();
                    const matchingExtracted = userKeywords.filter(uk => contentLower.includes(uk));
                    extractedKeywordScore = matchingExtracted.length * 10;
                }
                
                // Score por similaridade de título (mais importante)
                const titleKeywordMatch = userKeywords.some(uk => kb.title.toLowerCase().includes(uk));
                const titleBonus = titleKeywordMatch ? 30 : 0;
                
                const totalScore = titleScore + contentScore + keywordScore + extractedKeywordScore + titleBonus;
                
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestAnswer = kb.content;
                    bestSource = 'knowledge';
                }
            }
        } catch (error) {
            console.error('Erro ao buscar base de conhecimento:', error);
        }
        
        // 3. Buscar em documentos processados
        try {
            const docsResult = await client.query(`
                SELECT id, title, extracted_text
                FROM ia_documents
                WHERE processed = true AND extracted_text IS NOT NULL AND LENGTH(extracted_text) > 0
            `);
            
            for (const doc of docsResult.rows) {
                if (!doc.title || !doc.extracted_text) continue;
                
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
        } catch (error) {
            console.error('Erro ao buscar documentos:', error);
        }
        
        // 4. Buscar na web se necessário e configurado
        // Verificar se busca na web está habilitada
        let webSearchConfig = null;
        try {
            const configResult = await client.query(`
                SELECT * FROM ia_web_search_config
                ORDER BY id DESC
                LIMIT 1
            `);
            if (configResult.rows.length > 0 && configResult.rows[0].is_enabled) {
                webSearchConfig = configResult.rows[0];
            }
        } catch (error) {
            console.error('Erro ao buscar configuração de busca na web:', error);
        }
        
        // Verificar se a pergunta é sobre o sistema ou sobre outras coisas
        const questionIsAboutSystem = isAboutSystem(userMessage);
        
        // Buscar na web se:
        // 1. Não encontrou resposta OU score baixo (< 40 para perguntas sobre sistema, < 50 para outras)
        // 2. OU se a pergunta NÃO é sobre o sistema (sempre buscar na web para perguntas externas)
        const shouldSearchWeb = webSearchConfig && webSearchConfig.is_enabled && (
            !bestAnswer || 
            bestScore < (questionIsAboutSystem ? 40 : 50) ||
            !questionIsAboutSystem // Sempre buscar se não é sobre o sistema
        );
        
        if (shouldSearchWeb) {
            console.log('🔍 [IA] Buscando na web porque:', {
                hasAnswer: !!bestAnswer,
                score: bestScore,
                isAboutSystem: questionIsAboutSystem,
                webSearchEnabled: webSearchConfig.is_enabled,
                provider: webSearchConfig.api_provider,
                reason: !questionIsAboutSystem ? 'Pergunta não é sobre o sistema' : (!bestAnswer ? 'Sem resposta' : 'Score baixo')
            });
            try {
                const webResults = await searchWeb(userMessage, webSearchConfig);
                
                if (webResults.results && webResults.results.length > 0) {
                    // Se Tavily retornou resposta direta, usar ela
                    if (webResults.answer) {
                        bestAnswer = webResults.answer;
                        bestScore = 60; // Score bom para respostas da web
                        bestSource = 'web_tavily';
                        console.log('✅ [IA] Usando resposta direta do Tavily');
                        
                        // APRENDER: Adicionar à base de conhecimento automaticamente
                        await learnFromTavily(userMessage, webResults.answer, client);
                    } else if (webResults.results.length > 0) {
                        // Combinar os melhores resultados da web
                        const topResults = webResults.results.slice(0, 3);
                        const webAnswer = topResults.map((r, idx) => 
                            `${idx + 1}. ${r.title}\n${r.snippet.substring(0, 200)}${r.snippet.length > 200 ? '...' : ''}`
                        ).join('\n\n');
                        
                        bestAnswer = webAnswer;
                        bestScore = 50;
                        bestSource = `web_${webResults.provider}`;
                        console.log('✅ [IA] Usando resultados da web:', webResults.provider);
                        
                        // APRENDER: Adicionar à base de conhecimento
                        await learnFromTavily(userMessage, webAnswer, client);
                    }
                } else {
                    console.log('⚠️ [IA] Nenhum resultado encontrado na web');
                }
            } catch (error) {
                console.error('❌ [IA] Erro ao buscar na web:', error.message);
                // Continuar sem buscar na web se der erro
            }
        } else if (webSearchConfig && webSearchConfig.is_enabled && questionIsAboutSystem) {
            console.log('ℹ️ [IA] Não buscando na web porque:', {
                hasAnswer: !!bestAnswer,
                score: bestScore,
                isAboutSystem: questionIsAboutSystem,
                reason: 'Resposta encontrada na base sobre o sistema'
            });
        } else {
            console.log('ℹ️ [IA] Busca na web não está habilitada');
        }
        
        // Salvar conversa
        try {
            if (userId) {
                await client.query(`
                    INSERT INTO ia_conversations (user_id, user_message, ai_response, confidence_score, source_type)
                    VALUES ($1, $2, $3, $4, $5)
                `, [userId, userMessage, bestAnswer || 'Não encontrei uma resposta específica.', bestScore, bestSource || 'none']);
            }
        } catch (error) {
            console.error('Erro ao salvar conversa:', error);
            // Não bloquear a resposta por erro ao salvar
        }
        
        // Resposta padrão mais educada e útil - SEM buscar na internet (se busca na web não estiver habilitada)
        if (!bestAnswer || bestScore < 30) {
            // Tentar encontrar resposta parcial mesmo com baixa confiança
            const partialMatches = [];
            
            // Buscar palavras-chave na base de conhecimento já carregada
            const words = extractKeywords(userMessage);
            
            // Usar knowledgeResult que já foi carregado acima
            if (knowledgeResult && knowledgeResult.rows && knowledgeResult.rows.length > 0) {
                for (const kb of knowledgeResult.rows) {
                    if (!kb.content || !kb.title) continue;
                    
                    const contentLower = kb.content.toLowerCase();
                    const titleLower = kb.title.toLowerCase();
                    
                    // Verificar se alguma palavra-chave aparece no conteúdo ou título
                    const matchingWords = words.filter(w => 
                        contentLower.includes(w) || titleLower.includes(w)
                    );
                    
                    if (matchingWords.length > 0) {
                        // Calcular score baseado em quantas palavras correspondem
                        let score = matchingWords.length;
                        
                        // Bonus se palavras importantes correspondem
                        const importantWords = ['problema', 'erro', 'não', 'consigo', 'como', 'quando', 'onde', 'valores', 'planos', 'preços'];
                        const importantMatches = words.filter(w => 
                            importantWords.includes(w) && (contentLower.includes(w) || titleLower.includes(w))
                        );
                        score += importantMatches.length * 2;
                        
                        partialMatches.push({
                            content: kb.content,
                            title: kb.title,
                            score: score
                        });
                    }
                }
            }
            
            if (partialMatches.length > 0) {
                // Ordenar por score e pegar a melhor
                partialMatches.sort((a, b) => b.score - a.score);
                const bestPartial = partialMatches[0];
                
                return {
                    answer: `Com base na sua pergunta sobre "${bestPartial.title}", aqui está uma informação que pode ajudar:\n\n${bestPartial.content}\n\nSe isso não respondeu completamente sua dúvida, pode reformular a pergunta ou me perguntar sobre:\n\n• Planos e valores\n• Como usar módulos\n• Editar e personalizar cartão\n• Compartilhar cartão\n• Resolver problemas técnicos\n\nEstou aqui para ajudar! 😊`,
                    confidence: 25,
                    source: 'partial_match'
                };
            }
            
            // Se não é sobre o sistema e busca na web está desabilitada, ser mais direto
            const questionIsAboutSystem = isAboutSystem(userMessage);
            
            if (!questionIsAboutSystem) {
                return {
                    answer: `Desculpe, não tenho informações sobre isso na minha base de conhecimento.\n\nPosso te ajudar com dúvidas sobre o Conecta King:\n• Planos e valores\n• Como usar os módulos\n• Personalização do cartão\n• Compartilhar cartão\n• Problemas técnicos\n\nSe você habilitar a busca na web nas configurações, posso buscar informações atualizadas na internet para você! 😊`,
                    confidence: 0,
                    source: 'default'
                };
            }
            
            return {
                answer: `Olá! 😊 Não encontrei uma resposta específica para sua pergunta sobre o Conecta King.\n\nPosso te ajudar com:\n• Informações sobre planos e valores\n• Como usar os módulos do sistema\n• Como editar e personalizar seu cartão\n• Como compartilhar seu cartão\n• Resolver problemas técnicos\n• Dúvidas sobre funcionalidades\n\nPode reformular sua pergunta de outra forma ou me perguntar sobre algum desses tópicos? Estou aqui para ajudar! 😊`,
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
        console.log('📥 Mensagem recebida na IA KING:', message.substring(0, 100));
        const result = await findBestAnswer(message.trim(), userId || req.user.userId);
        
        console.log('✅ Resposta encontrada:', {
            confidence: result.confidence,
            source: result.source,
            answerLength: result.answer?.length || 0
        });
        
        res.json({
            response: result.answer,
            confidence: result.confidence,
            source: result.source,
            webResults: result.webResults || null
        });
    } catch (error) {
        console.error('❌ Erro no chat da IA KING:', error);
        console.error('Stack trace:', error.stack);
        
        // Retornar resposta padrão em caso de erro
        res.status(500).json({ 
            error: 'Erro ao processar mensagem',
            response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou reformule sua pergunta.',
            confidence: 0,
            source: 'error'
        });
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
            
            // Entrada específica sobre valores - MÚLTIPLAS VARIAÇÕES
            plansResult.rows.forEach(p => {
                const price = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
                const priceStr = price.toFixed(2);
                
                // Variação 1: Pergunta direta sobre valores
                knowledgeEntries.push({
                    title: 'Quais são os valores dos planos?',
                    content: `Os valores dos planos do Conecta King são:\n\n${plansResult.rows.map(pl => {
                        const plPrice = typeof pl.price === 'number' ? pl.price : parseFloat(pl.price) || 0;
                        return `• **${pl.plan_name}**: R$ ${plPrice.toFixed(2)} por mês`;
                    }).join('\n')}\n\nCada plano oferece funcionalidades específicas. O Pacote 1 (R$ 480) inclui todas as funcionalidades mas não permite alterar a logomarca. O Pacote 2 (R$ 700) permite alterar a logomarca. O Pacote 3 (R$ 1.500) é empresarial e inclui 3 cartões com logomarcas personalizáveis.`,
                    keywords: ['valores', 'preços', 'quanto custa', 'mensalidade', '480', '700', '1500', 'R$', 'reais', 'planos', 'pacotes'],
                    category: 'Assinatura'
                });
                
                // Variação 2: Pergunta sobre valores e planos
                knowledgeEntries.push({
                    title: 'Valores e planos do Conecta King',
                    content: `Aqui estão os valores dos planos do Conecta King:\n\n${plansResult.rows.map(pl => {
                        const plPrice = typeof pl.price === 'number' ? pl.price : parseFloat(pl.price) || 0;
                        return `**${pl.plan_name}**: R$ ${plPrice.toFixed(2)}/mês`;
                    }).join('\n')}\n\nPara mais detalhes sobre cada plano, acesse a seção "Assinatura" no dashboard.`,
                    keywords: ['valores', 'planos', 'preços', 'quanto', 'custa', 'mensal', '480', '700', '1500'],
                    category: 'Assinatura'
                });
                
                // Variação 3: Pergunta específica sobre preços
                knowledgeEntries.push({
                    title: 'Preços dos planos',
                    content: `Os preços dos planos do Conecta King são:\n\n${plansResult.rows.map(pl => {
                        const plPrice = typeof pl.price === 'number' ? pl.price : parseFloat(pl.price) || 0;
                        return `• ${pl.plan_name}: R$ ${plPrice.toFixed(2)} por mês`;
                    }).join('\n')}\n\nTodos os planos incluem acesso completo a todas as funcionalidades do sistema.`,
                    keywords: ['preços', 'preço', 'valor', 'valores', 'quanto', 'custa', 'mensalidade'],
                    category: 'Assinatura'
                });
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

// POST /api/ia-king/train-advanced - Treinamento avançado completo (ADM)
router.post('/train-advanced', protectAdmin, asyncHandler(async (req, res) => {
    console.log('📥 Requisição recebida: POST /api/ia-king/train-advanced');
    const client = await db.pool.connect();
    try {
        console.log('🧠 Iniciando treinamento AVANÇADO completo da IA KING...');
        
        await client.query('BEGIN');
        
        // Buscar categorias
        const categoriesResult = await client.query('SELECT id, name FROM ia_categories');
        const categoryMap = {};
        categoriesResult.rows.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });
        
        // Conhecimento avançado sobre problemas e soluções
        const advancedKnowledge = [
            // PROBLEMAS COMUNS E SOLUÇÕES
            {
                title: 'Não consigo fazer login',
                content: `Se você está tendo problemas para fazer login:

**Soluções:**
1. Verifique se está usando o email correto
2. Confirme que a senha está correta (verifique maiúsculas/minúsculas)
3. Tente usar "Esqueci minha senha" para redefinir
4. Limpe o cache do navegador
5. Tente em outro navegador ou modo anônimo
6. Verifique sua conexão com a internet

**Se ainda não funcionar:**
• Entre em contato com o suporte via WhatsApp
• Nossa equipe pode ajudar a recuperar seu acesso rapidamente`,
                keywords: ['login', 'entrar', 'acessar', 'senha', 'email', 'problema login', 'não consigo entrar', 'esqueci senha'],
                category: 'Suporte'
            },
            {
                title: 'Meu cartão não está aparecendo',
                content: `Se seu cartão não está aparecendo corretamente:

**Verificações:**
1. Certifique-se de que publicou as alterações (botão "Publicar alterações")
2. Verifique se você está usando o link correto
3. Limpe o cache do navegador
4. Tente em modo anônimo/privado
5. Verifique se seu plano está ativo

**Soluções:**
• Publique novamente as alterações
• Compartilhe o link novamente
• Verifique se não há bloqueadores de conteúdo ativos
• Entre em contato se o problema persistir`,
                keywords: ['cartão não aparece', 'não aparece', 'não carrega', 'erro visualização', 'problema visualizar'],
                category: 'Suporte'
            },
            {
                title: 'Não consigo adicionar módulos',
                content: `Se você não consegue adicionar módulos:

**Possíveis causas:**
1. Seu plano pode ter limite de módulos
2. Você pode ter atingido o limite máximo
3. Pode haver um problema temporário

**Soluções:**
1. Verifique qual plano você tem ativo
2. Veja quantos módulos você já adicionou
3. Tente remover um módulo antigo antes de adicionar novo
4. Recarregue a página (F5)
5. Limpe o cache do navegador

**Planos e limites:**
• Pacote 1: Todos os módulos disponíveis
• Pacote 2: Todos os módulos disponíveis
• Pacote 3: Todos os módulos disponíveis

Se o problema persistir, entre em contato com o suporte.`,
                keywords: ['adicionar módulo', 'não consigo adicionar', 'erro adicionar', 'limite módulos', 'módulo não adiciona'],
                category: 'Suporte'
            },
            {
                title: 'Minha foto não está carregando',
                content: `Se sua foto de perfil não está carregando:

**Soluções:**
1. Verifique o formato da imagem (aceita JPG, PNG)
2. Confirme que o tamanho não excede 5MB
3. Tente fazer upload novamente
4. Use uma imagem com boa qualidade
5. Aguarde alguns segundos após o upload

**Dicas:**
• Use imagens quadradas para melhor resultado
• Formatos recomendados: JPG ou PNG
• Tamanho ideal: entre 500x500 e 2000x2000 pixels
• Evite imagens muito pesadas

**Se ainda não funcionar:**
• Tente outra imagem
• Redimensione a imagem antes de fazer upload
• Entre em contato com o suporte`,
                keywords: ['foto não carrega', 'imagem não aparece', 'upload foto', 'erro foto', 'foto não funciona'],
                category: 'Suporte'
            },
            {
                title: 'Não consigo editar meu cartão',
                content: `Se você não consegue editar seu cartão:

**Verificações:**
1. Certifique-se de estar logado
2. Verifique se está na página correta (dashboard)
3. Confirme que seu plano está ativo
4. Verifique sua conexão com a internet

**Soluções:**
1. Recarregue a página (F5)
2. Limpe o cache do navegador
3. Tente em outro navegador
4. Faça logout e login novamente
5. Verifique se não há bloqueadores de JavaScript

**Se o problema persistir:**
• Entre em contato com o suporte
• Nossa equipe pode verificar sua conta
• Podemos ajudar a resolver rapidamente`,
                keywords: ['não consigo editar', 'erro editar', 'edição não funciona', 'não salva', 'erro salvar'],
                category: 'Suporte'
            },
            {
                title: 'Meu link não está funcionando',
                content: `Se seu link do cartão não está funcionando:

**Verificações:**
1. Confirme que você copiou o link completo
2. Verifique se não há espaços extras no link
3. Teste o link em outro navegador
4. Verifique se seu plano está ativo

**Soluções:**
1. Acesse seu dashboard
2. Vá em "Compartilhar" ou "Ver Cartão"
3. Copie o link novamente
4. Teste em modo anônimo/privado
5. Compartilhe o link novamente

**Formato correto do link:**
• tag.conectaking.com.br/seu-usuario
• Ou o slug personalizado que você configurou

Se o problema persistir, entre em contato com o suporte.`,
                keywords: ['link não funciona', 'link quebrado', 'erro link', 'link inválido', 'não abre link'],
                category: 'Suporte'
            },
            
            // PERGUNTAS FREQUENTES AVANÇADAS
            {
                title: 'Como cancelar minha assinatura?',
                content: `Para cancelar sua assinatura:

**Processo:**
1. Entre em contato com o suporte via WhatsApp
2. Informe que deseja cancelar
3. Nossa equipe processará o cancelamento
4. Você continuará tendo acesso até o fim do período pago

**Importante:**
• O cancelamento não é imediato
• Você mantém acesso até o fim do período contratado
• Após o cancelamento, seu cartão ficará inativo
• Você pode reativar a qualquer momento

**Dúvidas?**
Entre em contato com nosso suporte para mais informações.`,
                keywords: ['cancelar', 'cancelamento', 'desistir', 'sair', 'cancelar plano', 'cancelar assinatura'],
                category: 'Assinatura'
            },
            {
                title: 'Como alterar meu plano?',
                content: `Para alterar seu plano:

**Processo:**
1. Acesse a seção "Assinatura" no dashboard
2. Escolha o novo plano desejado
3. Entre em contato via WhatsApp para fazer a alteração
4. Nossa equipe processará a mudança

**Informações importantes:**
• Você pode fazer upgrade a qualquer momento
• O downgrade pode ter restrições
• A diferença de valor será ajustada proporcionalmente
• Suas configurações são mantidas

**Entre em contato:**
Use o WhatsApp informado na seção de assinatura para fazer a alteração.`,
                keywords: ['alterar plano', 'mudar plano', 'trocar plano', 'upgrade', 'downgrade', 'mudança plano'],
                category: 'Assinatura'
            },
            {
                title: 'Como recuperar minha senha?',
                content: `Para recuperar sua senha:

**Passo a passo:**
1. Na tela de login, clique em "Esqueci minha senha"
2. Digite o email cadastrado
3. Verifique sua caixa de entrada
4. Clique no link recebido por email
5. Defina uma nova senha

**Se não recebeu o email:**
• Verifique a pasta de spam/lixo eletrônico
• Aguarde alguns minutos
• Tente novamente
• Entre em contato com o suporte se necessário

**Dicas de segurança:**
• Use uma senha forte (mínimo 8 caracteres)
• Combine letras, números e símbolos
• Não compartilhe sua senha
• Altere periodicamente`,
                keywords: ['recuperar senha', 'esqueci senha', 'redefinir senha', 'reset senha', 'senha esquecida'],
                category: 'Suporte'
            },
            
            // INFORMAÇÕES TÉCNICAS AVANÇADAS
            {
                title: 'Quais navegadores são compatíveis?',
                content: `O Conecta King funciona melhor nos seguintes navegadores:

**Navegadores recomendados:**
• Google Chrome (versão mais recente)
• Mozilla Firefox (versão mais recente)
• Microsoft Edge (versão mais recente)
• Safari (versão mais recente)

**Dispositivos:**
• Computadores (Windows, Mac, Linux)
• Tablets (iPad, Android)
• Smartphones (iOS, Android)

**Requisitos:**
• JavaScript habilitado
• Cookies habilitados
• Conexão com internet estável

**Se tiver problemas:**
• Atualize seu navegador
• Limpe cache e cookies
• Desative extensões que possam interferir`,
                keywords: ['navegador', 'browser', 'compatível', 'chrome', 'firefox', 'safari', 'edge', 'suporte navegador'],
                category: 'Suporte'
            },
            {
                title: 'Como funciona o sistema de pagamento?',
                content: `O sistema de pagamento do Conecta King:

**Formas de pagamento:**
• PIX (recomendado - mais rápido)
• Transferência bancária
• Via WhatsApp (para negociação)

**Processo:**
1. Escolha seu plano
2. Entre em contato via WhatsApp ou use PIX
3. Envie o comprovante de pagamento
4. Nossa equipe ativa seu plano
5. Você recebe confirmação por email

**Prazos:**
• PIX: Ativação em até 24 horas
• Transferência: Ativação em até 48 horas
• WhatsApp: Negociação direta

**Dúvidas sobre pagamento?**
Entre em contato com nosso suporte via WhatsApp.`,
                keywords: ['pagamento', 'pix', 'transferência', 'como pagar', 'forma pagamento', 'comprovante'],
                category: 'Assinatura'
            },
            {
                title: 'Meu cartão está lento ou travando',
                content: `Se seu cartão está lento ou travando:

**Possíveis causas:**
1. Muitas imagens pesadas
2. Conexão com internet lenta
3. Navegador desatualizado
4. Cache do navegador cheio

**Soluções:**
1. Otimize suas imagens antes de fazer upload
2. Reduza o tamanho das imagens
3. Limpe o cache do navegador
4. Atualize seu navegador
5. Verifique sua conexão com internet
6. Tente em outro navegador

**Dicas de otimização:**
• Use imagens JPG para fotos (menor tamanho)
• Use PNG apenas quando precisar de transparência
• Redimensione imagens antes de fazer upload
• Evite imagens muito grandes (acima de 2MB)

Se o problema persistir, entre em contato com o suporte.`,
                keywords: ['lento', 'travando', 'lentidão', 'demora', 'carregamento lento', 'performance'],
                category: 'Suporte'
            },
            
            // INFORMAÇÕES SOBRE FUNCIONALIDADES AVANÇADAS
            {
                title: 'Como usar o QR Code?',
                content: `O QR Code do Conecta King:

**O que é:**
Um código que pode ser escaneado por qualquer celular para acessar seu cartão diretamente.

**Como gerar:**
1. Acesse seu dashboard
2. Vá em "Compartilhar"
3. Você verá o QR Code do seu cartão
4. Baixe a imagem do QR Code

**Como usar:**
• Imprima em cartões de visita físicos
• Adicione em assinaturas de email
• Compartilhe em redes sociais
• Use em materiais impressos

**Vantagens:**
• Acesso rápido e direto
• Não precisa digitar o link
• Profissional e moderno
• Funciona em qualquer celular

Qualquer pessoa pode escanear e acessar seu cartão instantaneamente!`,
                keywords: ['QR code', 'qrcode', 'código QR', 'escaneamento', 'código de barras'],
                category: 'Sistema'
            },
            {
                title: 'Como organizar os módulos na ordem que eu quero?',
                content: `Para organizar os módulos na ordem desejada:

**Método 1 - Arrastar e Soltar:**
1. Acesse a aba "Módulos" no dashboard
2. Clique e segure um módulo
3. Arraste para a posição desejada
4. Solte para reposicionar

**Método 2 - Botões de Mover:**
1. Clique no módulo que deseja mover
2. Use os botões "Mover para cima" ou "Mover para baixo"
3. Reposicione até ficar na ordem desejada
4. Publique as alterações

**Dicas:**
• Coloque os módulos mais importantes primeiro
• WhatsApp e contatos geralmente ficam no topo
• Redes sociais podem ficar em seguida
• Links e páginas de vendas podem ficar depois

A ordem que você definir será a ordem que aparece no seu cartão!`,
                keywords: ['organizar', 'ordem', 'reorganizar', 'mover', 'arrastar', 'posição módulos'],
                category: 'Sistema'
            },
            {
                title: 'Posso ter mais de um cartão?',
                content: `Sobre múltiplos cartões:

**Pacote 1 e 2:**
• 1 cartão/perfil por assinatura
• Você pode criar apenas um cartão
• Para ter mais cartões, precisa de múltiplas assinaturas

**Pacote 3 (Empresarial):**
• 3 cartões/perfis em uma única assinatura
• Ideal para empresas
• Cada cartão pode ter configurações diferentes
• Todos os cartões compartilham o mesmo plano

**Como criar múltiplos cartões (Pacote 3):**
1. Acesse seu dashboard
2. Use a aba "Empresa" ou "Perfis"
3. Crie novos perfis/cartões
4. Configure cada um individualmente

**Dúvidas?**
Entre em contato para saber mais sobre o plano empresarial.`,
                keywords: ['múltiplos cartões', 'vários cartões', 'mais de um', 'múltiplos perfis', 'vários perfis'],
                category: 'Assinatura'
            }
        ];
        
        let insertedCount = 0;
        
        // Inserir conhecimento avançado
        for (const entry of advancedKnowledge) {
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
                            'advanced_training',
                            150 // Prioridade ainda maior que o treinamento inicial
                        ]
                    );
                    insertedCount++;
                } else {
                    // Atualizar se já existe
                    await client.query(
                        `UPDATE ia_knowledge_base 
                         SET content = $1, keywords = $2, priority = $3, updated_at = CURRENT_TIMESTAMP
                         WHERE LOWER(title) = LOWER($4)`,
                        [
                            entry.content,
                            Array.isArray(entry.keywords) ? entry.keywords : [],
                            150,
                            entry.title
                        ]
                    );
                }
            } catch (error) {
                console.error(`Erro ao inserir conhecimento avançado: ${entry.title}`, error);
            }
        }
        
        await client.query('COMMIT');
        
        console.log(`✅ Treinamento avançado concluído! ${insertedCount} entradas adicionadas/atualizadas.`);
        
        res.json({
            message: `Treinamento avançado concluído com sucesso! ${insertedCount} entradas de conhecimento avançado adicionadas/atualizadas.`,
            inserted: insertedCount,
            total: advancedKnowledge.length
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro no treinamento avançado:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE CONFIGURAÇÃO DE BUSCA NA WEB
// ============================================

// GET /api/ia-king/web-search/config
router.get('/web-search/config', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Verificar se a tabela existe, se não, criar
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS ia_web_search_config (
                    id SERIAL PRIMARY KEY,
                    is_enabled BOOLEAN DEFAULT false,
                    api_provider VARCHAR(50) DEFAULT 'scraping',
                    api_key TEXT,
                    max_results INTEGER DEFAULT 5,
                    search_domains TEXT[],
                    blocked_domains TEXT[],
                    use_cache BOOLEAN DEFAULT true,
                    cache_duration_hours INTEGER DEFAULT 24,
                    updated_by VARCHAR(255),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } catch (tableError) {
            console.log('Tabela já existe ou erro ao criar:', tableError.message);
        }
        
        const result = await client.query(`
            SELECT * FROM ia_web_search_config
            ORDER BY id DESC
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            // Criar configuração padrão se não existir
            const insertResult = await client.query(`
                INSERT INTO ia_web_search_config (is_enabled, api_provider, max_results, use_cache)
                VALUES (false, 'scraping', 5, true)
                RETURNING *
            `);
            return res.json({ config: insertResult.rows[0] });
        }
        
        res.json({ config: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar configuração de busca na web:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar configuração',
            message: error.message 
        });
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/web-search/config
router.put('/web-search/config', protectAdmin, asyncHandler(async (req, res) => {
    const { is_enabled, api_provider, api_key, max_results, use_cache } = req.body;
    const adminId = req.user.userId;
    
    const client = await db.pool.connect();
    try {
        // Verificar se a tabela existe, se não, criar
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS ia_web_search_config (
                    id SERIAL PRIMARY KEY,
                    is_enabled BOOLEAN DEFAULT false,
                    api_provider VARCHAR(50) DEFAULT 'scraping',
                    api_key TEXT,
                    max_results INTEGER DEFAULT 5,
                    search_domains TEXT[],
                    blocked_domains TEXT[],
                    use_cache BOOLEAN DEFAULT true,
                    cache_duration_hours INTEGER DEFAULT 24,
                    updated_by VARCHAR(255),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } catch (tableError) {
            console.log('Tabela já existe ou erro ao criar:', tableError.message);
        }
        
        // Verificar se já existe configuração
        const existing = await client.query(`
            SELECT id FROM ia_web_search_config ORDER BY id DESC LIMIT 1
        `);
        
        if (existing.rows.length === 0) {
            // Criar nova configuração
            const result = await client.query(`
                INSERT INTO ia_web_search_config (is_enabled, api_provider, api_key, max_results, use_cache, updated_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                is_enabled !== undefined ? is_enabled : false,
                api_provider || 'scraping',
                api_key || null,
                max_results || 5,
                use_cache !== undefined ? use_cache : true,
                adminId
            ]);
            
            res.json({ config: result.rows[0], message: 'Configuração criada com sucesso' });
        } else {
            // Atualizar configuração existente
            const result = await client.query(`
                UPDATE ia_web_search_config
                SET is_enabled = COALESCE($1, is_enabled),
                    api_provider = COALESCE($2, api_provider),
                    api_key = COALESCE($3, api_key),
                    max_results = COALESCE($4, max_results),
                    use_cache = COALESCE($5, use_cache),
                    updated_by = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *
            `, [
                is_enabled,
                api_provider,
                api_key,
                max_results,
                use_cache,
                adminId,
                existing.rows[0].id
            ]);
            
            res.json({ config: result.rows[0], message: 'Configuração atualizada com sucesso' });
        }
    } catch (error) {
        console.error('Erro ao salvar configuração de busca na web:', error);
        res.status(500).json({ 
            error: 'Erro ao salvar configuração',
            message: error.message 
        });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE APRENDIZADO PENDENTE (ADMIN)
// ============================================

// GET /api/ia-king/learning
router.get('/learning', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { status = 'pending' } = req.query;
        
        const result = await client.query(`
            SELECT l.*, c.id as conversation_id, c.user_id
            FROM ia_learning l
            LEFT JOIN ia_conversations c ON l.source_conversation_id = c.id
            WHERE l.status = $1
            ORDER BY l.created_at DESC
        `, [status]);
        
        res.json({ learning: result.rows });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/learning/:id/approve
router.post('/learning/:id/approve', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.userId;
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Buscar aprendizado pendente
        const learning = await client.query(`
            SELECT * FROM ia_learning WHERE id = $1 AND status = 'pending'
        `, [id]);
        
        if (learning.rows.length === 0) {
            return res.status(404).json({ error: 'Aprendizado não encontrado ou já processado' });
        }
        
        const item = learning.rows[0];
        
        // Adicionar à base de conhecimento
        await client.query(`
            INSERT INTO ia_knowledge_base (title, content, keywords, source_type, is_active, created_by)
            VALUES ($1, $2, $3, 'learning_approved', true, $4)
        `, [
            item.question,
            item.suggested_answer,
            extractKeywords(item.question),
            adminId
        ]);
        
        // Marcar como aprovado
        await client.query(`
            UPDATE ia_learning
            SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [adminId, id]);
        
        await client.query('COMMIT');
        
        res.json({ message: 'Aprendizado aprovado e adicionado à base de conhecimento' });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/learning/:id/reject
router.post('/learning/:id/reject', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.userId;
    const client = await db.pool.connect();
    
    try {
        await client.query(`
            UPDATE ia_learning
            SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [adminId, id]);
        
        res.json({ message: 'Aprendizado rejeitado' });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE MENTORIAS (ADMIN)
// ============================================

// GET /api/ia-king/mentorias
router.get('/mentorias', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT m.*, c.name as category_name
            FROM ia_mentorias m
            LEFT JOIN ia_categories c ON m.category_id = c.id
            ORDER BY m.created_at DESC
        `);
        res.json({ mentorias: result.rows });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/mentorias
router.post('/mentorias', protectAdmin, asyncHandler(async (req, res) => {
    const { title, description, content, category_id, keywords, video_url, audio_url, document_url, duration_minutes, difficulty_level } = req.body;
    const adminId = req.user.userId;
    
    if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            INSERT INTO ia_mentorias (title, description, content, category_id, keywords, video_url, audio_url, document_url, duration_minutes, difficulty_level, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            title,
            description || null,
            content,
            category_id || null,
            Array.isArray(keywords) ? keywords : [],
            video_url || null,
            audio_url || null,
            document_url || null,
            duration_minutes || null,
            difficulty_level || 'beginner',
            adminId
        ]);
        
        res.json({ mentoria: result.rows[0] });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE TREINAMENTO COM TAVILY
// ============================================

// POST /api/ia-king/train-with-tavily
router.post('/train-with-tavily', protectAdmin, asyncHandler(async (req, res) => {
    const { query, max_results = 5, category_id } = req.body;
    const adminId = req.user.userId;
    
    if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query é obrigatória' });
    }
    
    const client = await db.pool.connect();
    try {
        // Buscar configuração do Tavily
        const configResult = await client.query(`
            SELECT * FROM ia_web_search_config
            WHERE is_enabled = true AND api_provider = 'tavily' AND api_key IS NOT NULL
            ORDER BY id DESC LIMIT 1
        `);
        
        if (configResult.rows.length === 0) {
            return res.status(400).json({ error: 'Tavily não está configurado ou habilitado' });
        }
        
        const config = configResult.rows[0];
        
        // Buscar com Tavily
        console.log('🔍 [Treinamento Tavily] Buscando:', query);
        const tavilyResult = await searchWithTavily(query, config.api_key);
        
        if (!tavilyResult.results || tavilyResult.results.length === 0) {
            return res.status(404).json({ error: 'Nenhum resultado encontrado no Tavily' });
        }
        
        await client.query('BEGIN');
        
        let insertedCount = 0;
        
        // Adicionar cada resultado à base de conhecimento
        for (const result of tavilyResult.results.slice(0, max_results)) {
            try {
                // Verificar se já existe
                const existing = await client.query(`
                    SELECT id FROM ia_knowledge_base 
                    WHERE LOWER(title) = LOWER($1)
                    LIMIT 1
                `, [result.title]);
                
                if (existing.rows.length === 0) {
                    await client.query(`
                        INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, is_active, created_by)
                        VALUES ($1, $2, $3, $4, 'tavily_training', true, $5)
                    `, [
                        result.title,
                        result.snippet || result.content || '',
                        extractKeywords(result.title + ' ' + (result.snippet || '')),
                        category_id || null,
                        adminId
                    ]);
                    insertedCount++;
                }
            } catch (error) {
                console.error('Erro ao inserir conhecimento do Tavily:', error);
            }
        }
        
        // Se houver resposta direta do Tavily, adicionar também
        if (tavilyResult.answer) {
            try {
                const existing = await client.query(`
                    SELECT id FROM ia_knowledge_base 
                    WHERE LOWER(title) = LOWER($1)
                    LIMIT 1
                `, [query]);
                
                if (existing.rows.length === 0) {
                    await client.query(`
                        INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, is_active, created_by)
                        VALUES ($1, $2, $3, $4, 'tavily_training', true, $5)
                    `, [
                        query,
                        tavilyResult.answer,
                        extractKeywords(query),
                        category_id || null,
                        adminId
                    ]);
                    insertedCount++;
                }
            } catch (error) {
                console.error('Erro ao inserir resposta direta do Tavily:', error);
            }
        }
        
        await client.query('COMMIT');
        
        res.json({
            message: `Treinamento com Tavily concluído! ${insertedCount} itens adicionados à base de conhecimento.`,
            inserted: insertedCount,
            total_results: tavilyResult.results.length,
            has_answer: !!tavilyResult.answer
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro no treinamento com Tavily:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/search-books-tavily
router.post('/search-books-tavily', protectAdmin, asyncHandler(async (req, res) => {
    const { query, max_results = 10 } = req.body;
    
    if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query é obrigatória' });
    }
    
    const client = await db.pool.connect();
    try {
        // Buscar configuração do Tavily
        const configResult = await client.query(`
            SELECT * FROM ia_web_search_config
            WHERE is_enabled = true AND api_provider = 'tavily' AND api_key IS NOT NULL
            ORDER BY id DESC LIMIT 1
        `);
        
        if (configResult.rows.length === 0) {
            return res.status(400).json({ error: 'Tavily não está configurado ou habilitado' });
        }
        
        const config = configResult.rows[0];
        
        // Buscar livros com Tavily (adicionar "livro" ou "book" à query)
        const bookQuery = `${query} livro book`;
        console.log('📚 [Busca Livros Tavily] Buscando:', bookQuery);
        
        const tavilyResult = await searchWithTavily(bookQuery, config.api_key);
        
        if (!tavilyResult.results || tavilyResult.results.length === 0) {
            return res.json({ books: [], message: 'Nenhum livro encontrado' });
        }
        
        // Filtrar e formatar resultados de livros
        const books = tavilyResult.results
            .filter(r => {
                const titleLower = (r.title || '').toLowerCase();
                const contentLower = (r.snippet || '').toLowerCase();
                return titleLower.includes('livro') || 
                       titleLower.includes('book') ||
                       contentLower.includes('livro') ||
                       contentLower.includes('book') ||
                       contentLower.includes('autor') ||
                       contentLower.includes('author');
            })
            .slice(0, max_results)
            .map(r => ({
                title: r.title,
                description: r.snippet || r.content || '',
                url: r.url,
                source: 'tavily'
            }));
        
        res.json({
            books: books,
            total: books.length,
            query: bookQuery
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/import-book-tavily
router.post('/import-book-tavily', protectAdmin, asyncHandler(async (req, res) => {
    const { title, description, category_id } = req.body;
    const adminId = req.user.userId;
    
    if (!title || !description) {
        return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
    }
    
    const client = await db.pool.connect();
    try {
        // Verificar se já existe
        const existing = await client.query(`
            SELECT id FROM ia_knowledge_base 
            WHERE LOWER(title) = LOWER($1)
            LIMIT 1
        `, [title]);
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Este livro já está na base de conhecimento' });
        }
        
        // Adicionar à base de conhecimento
        const result = await client.query(`
            INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, is_active, created_by)
            VALUES ($1, $2, $3, $4, 'tavily_book', true, $5)
            RETURNING *
        `, [
            title,
            description,
            extractKeywords(title + ' ' + description),
            category_id || null,
            adminId
        ]);
        
        res.json({
            message: 'Livro importado com sucesso!',
            knowledge: result.rows[0]
        });
    } finally {
        client.release();
    }
}));

module.exports = router;
