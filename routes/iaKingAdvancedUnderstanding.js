// ============================================
// SISTEMA AVANÇADO DE ENTENDIMENTO DE PALAVRAS
// Similar ao ChatGPT - Entendimento Profundo e Busca Inteligente
// ============================================

const db = require('../db');
const { generateEmbedding, searchByVectorSimilarity } = require('./embeddings');

// ============================================
// 1. TOKENIZAÇÃO E NORMALIZAÇÃO AVANÇADA
// ============================================

/**
 * Tokenização avançada similar ao ChatGPT
 * Divide texto em tokens inteligentes, não apenas palavras
 */
function advancedTokenization(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Normalizar texto
    const normalized = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .trim();
    
    // Padrões de tokenização
    const tokens = [];
    
    // 1. Palavras completas
    const words = normalized.match(/\b\w+\b/g) || [];
    tokens.push(...words);
    
    // 2. Frases (bigramas e trigramas)
    for (let i = 0; i < words.length - 1; i++) {
        tokens.push(`${words[i]} ${words[i + 1]}`);
    }
    for (let i = 0; i < words.length - 2; i++) {
        tokens.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
    
    // 3. Entidades nomeadas (palavras com maiúscula)
    const entities = text.match(/\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+\b/g) || [];
    tokens.push(...entities.map(e => e.toLowerCase()));
    
    // 4. Números e datas
    const numbers = text.match(/\d+/g) || [];
    tokens.push(...numbers);
    
    // 5. URLs e emails
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    const emails = text.match(/[^\s]+@[^\s]+/g) || [];
    tokens.push(...urls, ...emails);
    
    return [...new Set(tokens)]; // Remover duplicatas
}

/**
 * Normalização avançada de texto
 * Remove variações e padroniza
 */
function advancedNormalization(text) {
    if (!text) return '';
    
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s]/g, ' ') // Remove pontuação
        .replace(/\s+/g, ' ') // Normaliza espaços
        .trim();
}

// ============================================
// 2. ENTENDIMENTO SEMÂNTICO PROFUNDO
// ============================================

/**
 * Extrair significado semântico profundo
 * Similar ao ChatGPT - entende intenção, contexto, entidades
 */
function extractDeepSemanticMeaning(text, context = {}) {
    const normalized = advancedNormalization(text);
    const tokens = advancedTokenization(text);
    
    // Análise semântica
    const semantic = {
        // Intenção principal
        intent: detectIntent(normalized),
        
        // Entidades extraídas
        entities: extractEntities(text),
        
        // Conceitos principais
        concepts: extractConcepts(normalized, tokens),
        
        // Relacionamentos
        relationships: extractRelationships(normalized),
        
        // Sentimento e tom
        sentiment: analyzeSentiment(normalized),
        
        // Complexidade
        complexity: calculateComplexity(normalized, tokens),
        
        // Contexto temporal
        temporal: extractTemporalContext(normalized),
        
        // Perguntas implícitas
        implicitQuestions: detectImplicitQuestions(normalized),
        
        // Ações sugeridas
        suggestedActions: detectSuggestedActions(normalized, context)
    };
    
    return semantic;
}

/**
 * Detectar intenção da mensagem
 */
function detectIntent(text) {
    const intents = {
        question: /^(qual|quem|onde|quando|como|por que|porque|oque|o que|que|qual é|quem é)/i,
        command: /^(faça|fazer|execute|crie|criar|adicione|adicionar|remova|remover|delete|deletar|atualize|atualizar)/i,
        information: /^(explique|explicar|me diga|diga|fale|falar|conte|contar|mostre|mostrar)/i,
        comparison: /^(compare|comparar|diferença|diferenca|qual melhor|qual pior)/i,
        strategy: /^(estratégia|estrategia|como vender|como fazer|técnica|tecnica|dica|dicas)/i,
        help: /^(ajuda|help|socorro|não sei|nao sei|não entendo|nao entendo)/i,
        greeting: /^(oi|olá|ola|hello|bom dia|boa tarde|boa noite|tchau|até logo)/i,
        compliment: /^(obrigado|obrigada|valeu|parabéns|parabens|muito bom|excelente)/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
        if (pattern.test(text)) {
            return intent;
        }
    }
    
    return 'general';
}

/**
 * Extrair entidades nomeadas
 */
function extractEntities(text) {
    const entities = [];
    
    // Nomes próprios (maiúsculas)
    const properNouns = text.match(/\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+\b/g) || [];
    entities.push(...properNouns.map(e => e.toLowerCase()));
    
    // Padrões específicos
    const patterns = [
        { name: 'email', regex: /[^\s]+@[^\s]+/g },
        { name: 'url', regex: /https?:\/\/[^\s]+/g },
        { name: 'phone', regex: /[\d\s\-\(\)]{10,}/g },
        { name: 'date', regex: /\d{1,2}\/\d{1,2}\/\d{2,4}/g },
        { name: 'money', regex: /R\$\s*[\d,\.]+/g }
    ];
    
    for (const pattern of patterns) {
        const matches = text.match(pattern.regex) || [];
        entities.push(...matches);
    }
    
    return [...new Set(entities)];
}

/**
 * Extrair conceitos principais
 */
function extractConcepts(text, tokens) {
    // Palavras-chave importantes (não stopwords)
    const stopwords = new Set([
        'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
        'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'sob',
        'que', 'qual', 'quais', 'quem', 'onde', 'quando', 'como', 'porque',
        'é', 'são', 'foi', 'ser', 'estar', 'ter', 'haver', 'fazer', 'dizer',
        'você', 'voce', 'eu', 'ele', 'ela', 'nós', 'nos', 'eles', 'elas',
        'me', 'te', 'se', 'lhe', 'nos', 'vos', 'lhes', 'mim', 'ti', 'si'
    ]);
    
    const concepts = tokens
        .filter(token => {
            const word = token.split(' ')[0];
            return word.length > 3 && !stopwords.has(word);
        })
        .slice(0, 10); // Top 10 conceitos
    
    return concepts;
}

/**
 * Extrair relacionamentos entre conceitos
 */
function extractRelationships(text) {
    const relationships = [];
    
    // Padrões de relacionamento
    const patterns = [
        { type: 'is_a', regex: /(\w+)\s+(?:é|e|foi|era)\s+(\w+)/gi },
        { type: 'has', regex: /(\w+)\s+(?:tem|tem|possui|possui)\s+(\w+)/gi },
        { type: 'does', regex: /(\w+)\s+(?:faz|realiza|executa)\s+(\w+)/gi },
        { type: 'related_to', regex: /(\w+)\s+(?:relacionado|ligado|conectado)\s+(?:a|com|ao)\s+(\w+)/gi }
    ];
    
    for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern.regex)];
        for (const match of matches) {
            if (match[1] && match[2]) {
                relationships.push({
                    type: pattern.type,
                    from: match[1].toLowerCase(),
                    to: match[2].toLowerCase()
                });
            }
        }
    }
    
    return relationships;
}

/**
 * Analisar sentimento
 */
function analyzeSentiment(text) {
    const positive = ['bom', 'bom', 'ótimo', 'otimo', 'excelente', 'perfeito', 'maravilhoso', 'incrível', 'incrivel', 'fantástico', 'fantastico'];
    const negative = ['ruim', 'péssimo', 'pessimo', 'terrível', 'terrivel', 'horrível', 'horrivel', 'problema', 'erro', 'falha'];
    
    const words = text.split(/\s+/);
    let score = 0;
    
    for (const word of words) {
        if (positive.includes(word)) score += 1;
        if (negative.includes(word)) score -= 1;
    }
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
}

/**
 * Calcular complexidade
 */
function calculateComplexity(text, tokens) {
    let complexity = 0;
    
    // Fatores de complexidade
    complexity += tokens.length * 0.1; // Mais tokens = mais complexo
    complexity += (text.match(/\?/g) || []).length * 5; // Perguntas
    complexity += (text.match(/\!/g) || []).length * 2; // Exclamações
    complexity += (text.match(/\d+/g) || []).length * 1; // Números
    
    // Palavras técnicas
    const technicalWords = ['algoritmo', 'sistema', 'tecnologia', 'implementação', 'implementacao', 'arquitetura', 'framework'];
    for (const word of technicalWords) {
        if (text.includes(word)) complexity += 10;
    }
    
    if (complexity < 10) return 'simple';
    if (complexity < 30) return 'medium';
    return 'complex';
}

/**
 * Extrair contexto temporal
 */
function extractTemporalContext(text) {
    const temporal = {
        past: /(?:foi|era|estava|estive|fiz|fez|aconteceu|ocorreu)/i.test(text),
        present: /(?:é|está|estou|faz|fazendo|acontecendo|ocorrendo)/i.test(text),
        future: /(?:será|sera|estará|estara|fará|fara|vai|vou|acontecerá|acontecera|ocorrerá|ocorrera)/i.test(text)
    };
    
    return temporal;
}

/**
 * Detectar perguntas implícitas
 */
function detectImplicitQuestions(text) {
    const implicit = [];
    
    // Padrões de perguntas implícitas
    if (/não\s+(?:sei|entendo|compreendo)/i.test(text)) {
        implicit.push('O usuário precisa de explicação');
    }
    if (/como\s+(?:fazer|fazer|realizar|executar)/i.test(text)) {
        implicit.push('O usuário quer instruções passo a passo');
    }
    if (/qual\s+(?:melhor|pior|recomenda)/i.test(text)) {
        implicit.push('O usuário quer recomendação');
    }
    
    return implicit;
}

/**
 * Detectar ações sugeridas
 */
function detectSuggestedActions(text, context) {
    const actions = [];
    
    // Ações baseadas em palavras-chave
    if (/criar|criar|adicionar|adicionar/i.test(text)) {
        actions.push('create');
    }
    if (/editar|editar|modificar|modificar|alterar|alterar/i.test(text)) {
        actions.push('edit');
    }
    if (/deletar|deletar|remover|remover|excluir|excluir/i.test(text)) {
        actions.push('delete');
    }
    if (/ver|visualizar|mostrar|mostrar|exibir|exibir/i.test(text)) {
        actions.push('view');
    }
    
    return actions;
}

// ============================================
// 3. BUSCA INTELIGENTE (Similar ao ChatGPT)
// ============================================

/**
 * Busca inteligente multi-camada
 * Similar ao ChatGPT - busca em múltiplas camadas
 */
async function intelligentSearch(query, userId, context = {}) {
    const client = await db.pool.connect();
    try {
        const semantic = extractDeepSemanticMeaning(query, context);
        const results = {
            exact: [],
            semantic: [],
            related: [],
            contextual: []
        };
        
        // 1. Busca exata (palavras-chave)
        results.exact = await exactSearch(query, client);
        
        // 2. Busca semântica (embeddings)
        try {
            results.semantic = await searchByVectorSimilarity(query, 10, client);
        } catch (error) {
            console.warn('Busca semântica não disponível:', error.message);
        }
        
        // 3. Busca por relacionamentos
        results.related = await relatedSearch(semantic.entities, semantic.concepts, client);
        
        // 4. Busca contextual (baseada em contexto do usuário)
        if (userId) {
            results.contextual = await contextualSearch(query, userId, client);
        }
        
        // Combinar e rankear resultados
        const combined = combineAndRankResults(results, semantic);
        
        return {
            results: combined,
            semantic: semantic,
            confidence: calculateSearchConfidence(combined, semantic)
        };
    } finally {
        client.release();
    }
}

/**
 * Busca exata por palavras-chave
 */
async function exactSearch(query, client) {
    const tokens = advancedTokenization(query);
    const searchTerms = tokens.slice(0, 5).map(t => `%${t}%`);
    
    if (searchTerms.length === 0) return [];
    
    const result = await client.query(`
        SELECT * FROM ia_knowledge_base
        WHERE is_active = true
        AND (
            ${searchTerms.map((_, i) => `LOWER(title) LIKE $${i + 1} OR LOWER(content) LIKE $${i + 1}`).join(' OR ')}
        )
        ORDER BY 
            CASE 
                WHEN LOWER(title) LIKE ANY(${searchTerms.map((_, i) => `$${i + 1}`).join(', ')}) THEN 1
                ELSE 2
            END,
            usage_count DESC
        LIMIT 20
    `, searchTerms);
    
    return result.rows;
}

/**
 * Busca por relacionamentos
 */
async function relatedSearch(entities, concepts, client) {
    if (entities.length === 0 && concepts.length === 0) return [];
    
    const searchTerms = [...entities, ...concepts].slice(0, 5).map(t => `%${t}%`);
    
    const result = await client.query(`
        SELECT * FROM ia_knowledge_base
        WHERE is_active = true
        AND (
            ${searchTerms.map((_, i) => `LOWER(content) LIKE $${i + 1}`).join(' OR ')}
        )
        ORDER BY usage_count DESC
        LIMIT 10
    `, searchTerms);
    
    return result.rows;
}

/**
 * Busca contextual (baseada em histórico do usuário)
 */
async function contextualSearch(query, userId, client) {
    // Buscar conversas anteriores similares
    const result = await client.query(`
        SELECT DISTINCT kb.*
        FROM ia_conversations conv
        JOIN ia_knowledge_base kb ON kb.id = ANY(conv.knowledge_used_ids)
        WHERE conv.user_id = $1
        AND LOWER(conv.message) LIKE $2
        AND conv.confidence_score > 60
        ORDER BY conv.created_at DESC
        LIMIT 5
    `, [userId, `%${query.toLowerCase()}%`]);
    
    return result.rows;
}

/**
 * Combinar e rankear resultados
 */
function combineAndRankResults(results, semantic) {
    const combined = [];
    const seen = new Set();
    
    // Priorizar resultados exatos
    for (const item of results.exact) {
        if (!seen.has(item.id)) {
            combined.push({ ...item, score: 100, source: 'exact' });
            seen.add(item.id);
        }
    }
    
    // Adicionar resultados semânticos
    for (const item of results.semantic) {
        if (!seen.has(item.id)) {
            combined.push({ ...item, score: 80, source: 'semantic' });
            seen.add(item.id);
        }
    }
    
    // Adicionar resultados relacionados
    for (const item of results.related) {
        if (!seen.has(item.id)) {
            combined.push({ ...item, score: 60, source: 'related' });
            seen.add(item.id);
        }
    }
    
    // Adicionar resultados contextuais
    for (const item of results.contextual) {
        if (!seen.has(item.id)) {
            combined.push({ ...item, score: 70, source: 'contextual' });
            seen.add(item.id);
        }
    }
    
    // Ordenar por score
    combined.sort((a, b) => b.score - a.score);
    
    return combined.slice(0, 20); // Top 20
}

/**
 * Calcular confiança da busca
 */
function calculateSearchConfidence(results, semantic) {
    if (results.length === 0) return 0;
    
    let confidence = 0;
    
    // Mais resultados = mais confiança
    confidence += Math.min(results.length * 5, 30);
    
    // Resultados exatos aumentam confiança
    const exactCount = results.filter(r => r.source === 'exact').length;
    confidence += exactCount * 10;
    
    // Entidades detectadas aumentam confiança
    confidence += semantic.entities.length * 5;
    
    // Conceitos detectados aumentam confiança
    confidence += semantic.concepts.length * 3;
    
    return Math.min(confidence, 100);
}

// ============================================
// 4. ENTENDIMENTO DO CARTÃO VIRTUAL
// ============================================

/**
 * Conhecimento completo sobre recursos do cartão virtual
 */
const VIRTUAL_CARD_KNOWLEDGE = {
    modules: [
        { name: 'whatsapp', description: 'Link direto para conversa no WhatsApp', icon: 'fab fa-whatsapp' },
        { name: 'telegram', description: 'Link para canal ou chat no Telegram', icon: 'fab fa-telegram' },
        { name: 'email', description: 'Link para envio de email', icon: 'fas fa-envelope' },
        { name: 'pix', description: 'Informações de pagamento PIX', icon: 'fas fa-qrcode' },
        { name: 'pix_qr', description: 'QR Code para pagamento PIX', icon: 'fas fa-qrcode' },
        { name: 'facebook', description: 'Link para perfil no Facebook', icon: 'fab fa-facebook' },
        { name: 'instagram', description: 'Link para perfil no Instagram', icon: 'fab fa-instagram' },
        { name: 'tiktok', description: 'Link para perfil no TikTok', icon: 'fab fa-tiktok' },
        { name: 'twitter', description: 'Link para perfil no Twitter/X', icon: 'fab fa-twitter' },
        { name: 'youtube', description: 'Link para canal ou vídeo no YouTube', icon: 'fab fa-youtube' },
        { name: 'spotify', description: 'Link para perfil no Spotify', icon: 'fab fa-spotify' },
        { name: 'linkedin', description: 'Link para perfil no LinkedIn', icon: 'fab fa-linkedin' },
        { name: 'pinterest', description: 'Link para perfil no Pinterest', icon: 'fab fa-pinterest' },
        { name: 'custom_link', description: 'Link personalizado com imagem', icon: 'fas fa-link' },
        { name: 'portfolio', description: 'Galeria de trabalhos', icon: 'fas fa-images' },
        { name: 'banner', description: 'Banner de imagem', icon: 'fas fa-image' },
        { name: 'carousel', description: 'Carrossel de imagens', icon: 'fas fa-images' },
        { name: 'youtube_embed', description: 'Vídeo incorporado do YouTube', icon: 'fab fa-youtube' },
        { name: 'sales_page', description: 'Página completa de vendas personalizada', icon: 'fas fa-store' }
    ],
    features: [
        'Personalização de cores',
        'Personalização de fontes',
        'Personalização de layout',
        'Link único para compartilhamento',
        'QR Code para compartilhamento',
        'Analytics e relatórios',
        'Múltiplos módulos',
        'Página de vendas personalizada',
        'Banner e carrossel',
        'Integração com redes sociais'
    ],
    plans: [
        { name: 'Free', price: 'R$ 0,00', duration: '30 dias', features: ['Período de teste'] },
        { name: 'Individual', price: 'R$ 480,00', duration: 'mês', features: ['Todas funcionalidades', 'Sem alteração de logo'] },
        { name: 'Individual com Logo', price: 'R$ 700,00', duration: 'mês', features: ['Todas funcionalidades', 'Com alteração de logo'] },
        { name: 'Empresarial', price: 'R$ 1.500,00', duration: 'mês', features: ['3 cartões', 'Logo personalizável'] }
    ]
};

/**
 * Analisar cartão virtual do usuário e sugerir melhorias
 */
async function analyzeVirtualCard(userId, client) {
    try {
        // Buscar dados do perfil (cartão virtual)
        const profileResult = await client.query(`
            SELECT 
                p.*,
                COUNT(DISTINCT pi.id) as module_count,
                COUNT(DISTINCT sp.id) as sales_page_count
            FROM user_profiles p
            LEFT JOIN profile_items pi ON pi.user_id = p.user_id
            LEFT JOIN sales_pages sp ON sp.profile_item_id = pi.id
            WHERE p.user_id = $1
            GROUP BY p.id
            LIMIT 1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return {
                hasCard: false,
                suggestions: [
                    {
                        priority: 'high',
                        category: 'setup',
                        title: 'Crie seu primeiro cartão virtual',
                        description: 'Configure seu perfil e comece a usar o Conecta King',
                        action: 'create_profile'
                    },
                    {
                        priority: 'high',
                        category: 'profile',
                        title: 'Adicione uma foto de perfil',
                        description: 'Cartões com foto têm 3x mais engajamento',
                        action: 'add_profile_photo'
                    },
                    {
                        priority: 'high',
                        category: 'content',
                        title: 'Preencha suas informações básicas',
                        description: 'Nome, profissão e descrição são essenciais',
                        action: 'fill_basic_info'
                    }
                ]
            };
        }
        
        const profile = profileResult.rows[0];
        
        // Buscar módulos (profile_items)
        const modulesResult = await client.query(`
            SELECT item_type as module_type, COUNT(*) as count
            FROM profile_items
            WHERE user_id = $1
            GROUP BY item_type
        `, [userId]);
        
        const modules = modulesResult.rows;
        
        // Análise e sugestões
        const analysis = {
            hasCard: true,
            card: {
                name: profile.name,
                profession: profile.profession,
                hasPhoto: !!profile.profile_photo,
                hasDescription: !!profile.description && profile.description.length > 50,
                moduleCount: parseInt(profile.module_count) || 0,
                salesPageCount: parseInt(profile.sales_page_count) || 0
            },
            modules: modules.map(m => ({
                type: m.module_type,
                count: parseInt(m.count)
            })),
            suggestions: generateCardSuggestions(profile, modules),
            strategies: generateCardStrategies(profile, modules)
        };
        
        return analysis;
    } catch (error) {
        console.error('Erro ao analisar cartão virtual:', error);
        return {
            hasCard: false,
            error: error.message
        };
    }
}

/**
 * Gerar sugestões de melhoria para o cartão
 */
function generateCardSuggestions(card, modules) {
    const suggestions = [];
    
    // Sugestões básicas
    if (!card.hasPhoto) {
        suggestions.push({
            priority: 'high',
            category: 'profile',
            title: 'Adicione uma foto de perfil',
            description: 'Cartões com foto de perfil têm 3x mais engajamento',
            action: 'add_profile_photo'
        });
    }
    
    if (!card.hasDescription || card.description.length < 100) {
        suggestions.push({
            priority: 'high',
            category: 'content',
            title: 'Melhore sua descrição',
            description: 'Uma descrição completa ajuda visitantes a entenderem seu negócio',
            action: 'improve_description'
        });
    }
    
    if (card.moduleCount < 5) {
        suggestions.push({
            priority: 'medium',
            category: 'modules',
            title: 'Adicione mais módulos',
            description: 'Cartões com mais módulos geram mais interação',
            action: 'add_more_modules'
        });
    }
    
    // Sugestões de módulos específicos
    const moduleTypes = modules.map(m => m.type);
    if (!moduleTypes.includes('whatsapp')) {
        suggestions.push({
            priority: 'high',
            category: 'modules',
            title: 'Adicione WhatsApp',
            description: 'WhatsApp é o canal mais usado para contato',
            action: 'add_whatsapp'
        });
    }
    
    if (!moduleTypes.includes('sales_page')) {
        suggestions.push({
            priority: 'medium',
            category: 'modules',
            title: 'Crie uma página de vendas',
            description: 'Páginas de vendas aumentam conversão em até 40%',
            action: 'create_sales_page'
        });
    }
    
    return suggestions;
}

/**
 * Gerar estratégias para melhorar o cartão
 */
function generateCardStrategies(profile, modules) {
    const strategies = [];
    const moduleCount = parseInt(profile.module_count) || 0;
    
    // Estratégia 1: Otimização de conversão
    strategies.push({
        name: 'Otimização de Conversão',
        description: 'Estratégias para aumentar conversão do cartão',
        steps: [
            'Adicione call-to-action claros',
            'Use cores que transmitam confiança',
            'Organize módulos por prioridade',
            'Adicione depoimentos ou social proof'
        ],
        expectedImpact: 'Aumento de 25-40% na conversão'
    });
    
    // Estratégia 2: Engajamento
    strategies.push({
        name: 'Aumentar Engajamento',
        description: 'Estratégias para aumentar interação com o cartão',
        steps: [
            'Adicione conteúdo visual (banner, carrossel)',
            'Inclua links para todas redes sociais',
            'Crie conteúdo exclusivo (vídeos, portfólio)',
            'Use QR Code para compartilhamento offline'
        ],
        expectedImpact: 'Aumento de 30-50% no engajamento'
    });
    
    // Estratégia 3: Profissionalismo
    strategies.push({
        name: 'Aumentar Profissionalismo',
        description: 'Estratégias para tornar o cartão mais profissional',
        steps: [
            'Use foto profissional de alta qualidade',
            'Escreva descrição clara e objetiva',
            'Organize módulos de forma lógica',
            'Use cores consistentes com sua marca'
        ],
        expectedImpact: 'Aumento de 20-35% na percepção de profissionalismo'
    });
    
    return strategies;
}

module.exports = {
    advancedTokenization,
    advancedNormalization,
    extractDeepSemanticMeaning,
    intelligentSearch,
    analyzeVirtualCard,
    VIRTUAL_CARD_KNOWLEDGE
};

