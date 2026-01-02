/**
 * MÓDULO DE MARKETING
 * 
 * Responsável por:
 * - Gerar estratégias de marketing digital
 * - Sugerir formas de divulgação
 * - Criar planos de marketing
 * - ATIVADO APENAS quando o usuário solicitar explicitamente
 */

const db = require('../../db');
const { getSystemPrompt } = require('../../systemPrompt');

/**
 * Processa uma solicitação de marketing
 * 
 * @param {string} message - Mensagem do usuário
 * @param {object} context - Contexto (userId, histórico, etc)
 * @returns {Promise<object>} - { response: string, strategy: object, confidence: number }
 */
async function processMarketing(message, context = {}) {
    const { userId, userProfile } = context;
    
    // Verificar se realmente é uma solicitação de marketing
    if (!isMarketingRequest(message)) {
        return {
            response: 'Para ajudá-lo com marketing, preciso que você me diga especificamente o que precisa. Por exemplo: "Quero uma estratégia de marketing para divulgar meu cartão" ou "Como posso usar o Instagram para promover meu ConectaKing?"',
            confidence: 0.5,
            module: 'marketing'
        };
    }
    
    // Consultar estratégias validadas na memória
    const strategies = await consultarEstrategiasMarketing(message);
    
    // Buscar conhecimento sobre marketing
    const knowledge = await consultarConhecimentoMarketing(message);
    
    // Gerar estratégia personalizada
    const strategy = await gerarEstrategiaMarketing(message, context, strategies, knowledge);
    
    // Construir resposta
    const response = construirRespostaMarketing(strategy, message, context);
    
    return {
        response,
        strategy,
        confidence: 0.85,
        module: 'marketing'
    };
}

/**
 * Verifica se é uma solicitação de marketing
 */
function isMarketingRequest(message) {
    const lowerMessage = message.toLowerCase();
    const marketingKeywords = [
        'marketing', 'divulgar', 'divulgação', 'promover', 'promoção',
        'anúncio', 'publicidade', 'alcançar', 'seguidores', 'rede social',
        'instagram', 'facebook', 'tiktok', 'youtube', 'estratégia de marketing'
    ];
    
    return marketingKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Consulta estratégias de marketing validadas
 */
async function consultarEstrategiasMarketing(message) {
    try {
        const query = `
            SELECT id, title, content, keywords, usage_count, priority
            FROM ia_knowledge_base
            WHERE is_active = true
            AND (
                source_type = 'strategy'
                OR keywords && ARRAY['marketing', 'divulgação', 'promoção', 'estratégia']
            )
            ORDER BY priority DESC, usage_count DESC
            LIMIT 5
        `;
        
        const result = await db.query(query);
        return result.rows;
    } catch (error) {
        console.error('Erro ao consultar estratégias:', error);
        return [];
    }
}

/**
 * Consulta conhecimento sobre marketing
 */
async function consultarConhecimentoMarketing(message) {
    try {
        const lowerMessage = message.toLowerCase();
        const keywords = extrairKeywordsMarketing(lowerMessage);
        
        const query = `
            SELECT id, title, content, keywords
            FROM ia_knowledge_base
            WHERE is_active = true
            AND (
                keywords && $1::text[]
                OR content ILIKE '%marketing%'
                OR content ILIKE '%divulgação%'
            )
            ORDER BY priority DESC
            LIMIT 3
        `;
        
        const result = await db.query(query, [keywords]);
        return result.rows;
    } catch (error) {
        console.error('Erro ao consultar conhecimento:', error);
        return [];
    }
}

/**
 * Gera estratégia de marketing personalizada
 */
async function gerarEstrategiaMarketing(message, context, strategies, knowledge) {
    const lowerMessage = message.toLowerCase();
    
    // Identificar tipo de marketing solicitado
    let marketingType = 'geral';
    if (lowerMessage.includes('instagram')) marketingType = 'instagram';
    else if (lowerMessage.includes('facebook')) marketingType = 'facebook';
    else if (lowerMessage.includes('tiktok')) marketingType = 'tiktok';
    else if (lowerMessage.includes('youtube')) marketingType = 'youtube';
    else if (lowerMessage.includes('whatsapp')) marketingType = 'whatsapp';
    
    // Construir estratégia baseada no tipo
    const strategy = {
        type: marketingType,
        steps: [],
        tips: [],
        platforms: [],
        timeline: 'curto prazo' // ou 'médio prazo', 'longo prazo'
    };
    
    // Adicionar passos baseados em conhecimento
    if (knowledge && knowledge.length > 0) {
        strategy.steps = extrairPassosEstrategia(knowledge[0].content);
    } else {
        strategy.steps = gerarPassosPadrao(marketingType);
    }
    
    // Adicionar dicas
    strategy.tips = gerarDicasMarketing(marketingType);
    
    // Adicionar plataformas recomendadas
    strategy.platforms = definirPlataformas(marketingType);
    
    return strategy;
}

/**
 * Constrói resposta de marketing
 */
function construirRespostaMarketing(strategy, message, context) {
    let response = `## Estratégia de Marketing para ConectaKing\n\n`;
    
    response += `Baseado na sua solicitação, aqui está uma estratégia personalizada:\n\n`;
    
    // Passos
    if (strategy.steps && strategy.steps.length > 0) {
        response += `### Passos para Implementar:\n\n`;
        strategy.steps.forEach((step, index) => {
            response += `${index + 1}. ${step}\n`;
        });
        response += `\n`;
    }
    
    // Dicas
    if (strategy.tips && strategy.tips.length > 0) {
        response += `### Dicas Importantes:\n\n`;
        strategy.tips.forEach(tip => {
            response += `• ${tip}\n`;
        });
        response += `\n`;
    }
    
    // Plataformas
    if (strategy.platforms && strategy.platforms.length > 0) {
        response += `### Plataformas Recomendadas:\n\n`;
        response += `${strategy.platforms.join(', ')}\n\n`;
    }
    
    response += `\nQuer que eu detalhe algum passo específico ou criar uma copy para alguma dessas plataformas?`;
    
    return response;
}

/**
 * Extrai passos de uma estratégia do conhecimento
 */
function extrairPassosEstrategia(content) {
    // Tentar extrair passos numerados ou com marcadores
    const steps = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^\d+[\.\)]/) || trimmed.startsWith('-') || trimmed.startsWith('•')) {
            steps.push(trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, ''));
        }
    }
    
    return steps.length > 0 ? steps : ['Implementar estratégia baseada no conhecimento disponível'];
}

/**
 * Gera passos padrão para cada tipo de marketing
 */
function gerarPassosPadrao(type) {
    const defaultSteps = {
        instagram: [
            'Criar conteúdo visual atrativo do seu cartão ConectaKing',
            'Usar hashtags relevantes (#cartãovirtual #networking)',
            'Postar stories mostrando o cartão em ação',
            'Interagir com seguidores e responder comentários',
            'Colaborar com outros profissionais'
        ],
        facebook: [
            'Criar post destacando os benefícios do ConectaKing',
            'Compartilhar em grupos de networking',
            'Usar anúncios direcionados (se tiver orçamento)',
            'Criar evento ou página do seu negócio',
            'Engajar com comentários e mensagens'
        ],
        tiktok: [
            'Criar vídeos curtos mostrando o cartão',
            'Usar tendências e desafios do momento',
            'Mostrar casos de uso práticos',
            'Interagir com outros criadores',
            'Manter consistência nos posts'
        ],
        youtube: [
            'Criar vídeo tutorial sobre o ConectaKing',
            'Mostrar casos de sucesso',
            'Fazer lives respondendo dúvidas',
            'Colaborar com outros youtubers',
            'Otimizar títulos e descrições com SEO'
        ],
        whatsapp: [
            'Adicionar link do cartão na assinatura',
            'Compartilhar em grupos relevantes',
            'Enviar para contatos pessoais',
            'Criar grupo de networking',
            'Usar status para divulgar'
        ],
        geral: [
            'Definir público-alvo',
            'Escolher plataformas principais',
            'Criar conteúdo consistente',
            'Engajar com audiência',
            'Medir resultados e ajustar'
        ]
    };
    
    return defaultSteps[type] || defaultSteps.geral;
}

/**
 * Gera dicas de marketing
 */
function gerarDicasMarketing(type) {
    return [
        'Seja consistente nas postagens',
        'Interaja genuinamente com sua audiência',
        'Use o cartão ConectaKing como ferramenta principal',
        'Meça resultados e ajuste estratégia',
        'Mantenha foco no valor que você oferece'
    ];
}

/**
 * Define plataformas recomendadas
 */
function definirPlataformas(type) {
    const platforms = {
        instagram: ['Instagram', 'Stories', 'Reels', 'IGTV'],
        facebook: ['Facebook', 'Grupos', 'Páginas', 'Anúncios'],
        tiktok: ['TikTok', 'Vídeos Curtos', 'Tendências'],
        youtube: ['YouTube', 'Shorts', 'Lives'],
        whatsapp: ['WhatsApp', 'Status', 'Grupos'],
        geral: ['Instagram', 'Facebook', 'LinkedIn', 'WhatsApp']
    };
    
    return platforms[type] || platforms.geral;
}

/**
 * Extrai keywords relacionadas a marketing
 */
function extrairKeywordsMarketing(message) {
    const marketingKeywords = [
        'marketing', 'divulgação', 'promoção', 'anúncio', 'publicidade',
        'instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp',
        'seguidores', 'audiência', 'alcance', 'engajamento'
    ];
    
    const words = message.split(/\s+/);
    return words.filter(word => 
        marketingKeywords.some(keyword => word.toLowerCase().includes(keyword))
    );
}

module.exports = {
    processMarketing
};

