/**
 * CLASSIFICADOR DE INTENÇÃO
 * 
 * Analisa a mensagem do usuário e classifica a intenção em categorias específicas.
 * Este é o primeiro passo antes de qualquer resposta da IA.
 */

/**
 * Tipos de intenção possíveis
 */
const INTENT_TYPES = {
    ATENDIMENTO: 'atendimento',
    DUVIDA_PRODUTO: 'dúvida_produto',
    DUVIDA_PAINEL: 'dúvida_painel',
    MARKETING: 'marketing',
    VENDAS: 'vendas',
    COPY: 'copy',
    ESTRATEGIA: 'estratégia',
    DIAGNOSTICO_SISTEMA: 'diagnóstico_sistema',
    TREINAMENTO_ADMIN: 'treinamento_admin',
    MODO_CEO: 'modo_ceo',
    FORA_DO_FOCO: 'fora_do_foco'
};

/**
 * Palavras-chave para cada tipo de intenção
 */
const INTENT_KEYWORDS = {
    [INTENT_TYPES.ATENDIMENTO]: [
        'ajuda', 'suporte', 'atendimento', 'problema', 'erro', 'não funciona',
        'como fazer', 'preciso de ajuda', 'socorro', 'dúvida'
    ],
    [INTENT_TYPES.DUVIDA_PRODUTO]: [
        'conecta king', 'conectaking', 'cartão virtual', 'cartão de visita',
        'o que é', 'como funciona', 'funcionalidades', 'recursos', 'módulos',
        'planos', 'assinatura', 'pacote'
    ],
    [INTENT_TYPES.DUVIDA_PAINEL]: [
        'painel', 'dashboard', 'configuração', 'configurar', 'editar',
        'personalizar', 'módulo', 'adicionar', 'remover', 'ativar',
        'desativar', 'menu', 'aba'
    ],
    [INTENT_TYPES.MARKETING]: [
        'marketing', 'divulgar', 'divulgação', 'promover', 'promoção',
        'anúncio', 'publicidade', 'alcançar', 'audiência', 'seguidores',
        'rede social', 'instagram', 'facebook', 'tiktok', 'youtube',
        'estratégia de marketing', 'marketing digital'
    ],
    [INTENT_TYPES.VENDAS]: [
        'vender', 'vendas', 'vendedor', 'fechar venda', 'conversão',
        'cliente', 'prospecção', 'negociação', 'objeção', 'pitch',
        'apresentação', 'proposta', 'fechamento', 'como vender',
        'técnica de venda', 'estratégia de venda'
    ],
    [INTENT_TYPES.COPY]: [
        'copy', 'copywriting', 'texto de venda', 'texto persuasivo',
        'copy de conversão', 'escrever texto', 'criar copy',
        'texto para vender', 'copy de alta conversão', 'copy persuasivo'
    ],
    [INTENT_TYPES.ESTRATEGIA]: [
        'estratégia', 'estratégias', 'planejamento', 'planejar',
        'crescimento', 'crescer', 'otimizar', 'otimização',
        'melhorar', 'melhoria', 'desenvolver', 'desenvolvimento',
        'expansão', 'expandir'
    ],
    [INTENT_TYPES.DIAGNOSTICO_SISTEMA]: [
        'diagnóstico', 'diagnosticar', 'analisar sistema', 'verificar',
        'problema no sistema', 'erro no sistema', 'bug', 'falha',
        'sistema lento', 'performance', 'otimizar sistema'
    ],
    [INTENT_TYPES.TREINAMENTO_ADMIN]: [
        'treinar', 'treinamento', 'ensinar', 'aprender', 'corrigir',
        'ajustar', 'configurar ia', 'treinar ia', 'modo admin',
        'modo treinamento'
    ],
    [INTENT_TYPES.MODO_CEO]: [
        'modo ceo', 'modo cérebro', 'análise da ia', 'nível da ia',
        'pontos fortes', 'pontos fracos', 'evolução', 'maturação',
        'status da ia', 'capacidades da ia'
    ]
};

/**
 * Palavras-chave que indicam que está FORA DO FOCO
 */
const OUT_OF_FOCUS_KEYWORDS = [
    // Assuntos gerais não relacionados
    'receita', 'culinária', 'cozinhar', 'comida', 'restaurante',
    'filme', 'cinema', 'série', 'netflix', 'entretenimento',
    'esporte', 'futebol', 'jogos', 'vídeo game', 'game',
    'política', 'eleição', 'governo', 'presidente',
    'religião', 'deus', 'jesus', 'bíblia', 'igreja',
    'ciência', 'física', 'química', 'matemática', 'história',
    'filosofia', 'arte', 'música', 'literatura',
    // Assuntos pessoais não relacionados
    'meu cachorro', 'minha família', 'meu relacionamento',
    'minha vida pessoal', 'meus problemas pessoais'
];

/**
 * Classifica a intenção de uma mensagem
 * 
 * @param {string} message - Mensagem do usuário
 * @param {object} context - Contexto adicional (histórico, perfil do usuário, etc)
 * @returns {object} - { intent: string, confidence: number, reasoning: string }
 */
function classifyIntent(message, context = {}) {
    if (!message || typeof message !== 'string') {
        return {
            intent: INTENT_TYPES.FORA_DO_FOCO,
            confidence: 1.0,
            reasoning: 'Mensagem inválida ou vazia'
        };
    }

    const lowerMessage = message.toLowerCase().trim();
    
    // Verificar se está fora do foco primeiro
    const isOutOfFocus = OUT_OF_FOCUS_KEYWORDS.some(keyword => 
        lowerMessage.includes(keyword)
    );
    
    if (isOutOfFocus && !lowerMessage.includes('conecta') && !lowerMessage.includes('king')) {
        return {
            intent: INTENT_TYPES.FORA_DO_FOCO,
            confidence: 0.9,
            reasoning: 'Mensagem sobre assunto não relacionado ao ConectaKing'
        };
    }

    // Contar matches para cada intenção
    const intentScores = {};
    
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
        let score = 0;
        const matchedKeywords = [];
        
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                score += 1;
                matchedKeywords.push(keyword);
            }
        }
        
        if (score > 0) {
            intentScores[intent] = {
                score,
                matchedKeywords
            };
        }
    }

    // Se não encontrou nenhuma intenção, verificar contexto
    if (Object.keys(intentScores).length === 0) {
        // Verificar se menciona ConectaKing ou cartão
        if (lowerMessage.includes('conecta') || lowerMessage.includes('king') || 
            lowerMessage.includes('cartão') || lowerMessage.includes('cartao')) {
            return {
                intent: INTENT_TYPES.DUVIDA_PRODUTO,
                confidence: 0.7,
                reasoning: 'Menciona ConectaKing mas intenção não clara'
            };
        }
        
        // Verificar se é uma pergunta genérica de ajuda
        if (lowerMessage.includes('?') || 
            lowerMessage.startsWith('como') || 
            lowerMessage.startsWith('o que') ||
            lowerMessage.startsWith('qual')) {
            return {
                intent: INTENT_TYPES.ATENDIMENTO,
                confidence: 0.6,
                reasoning: 'Pergunta genérica de ajuda'
            };
        }
    }

    // Encontrar a intenção com maior score
    let bestIntent = INTENT_TYPES.ATENDIMENTO; // Default
    let bestScore = 0;
    let bestMatchedKeywords = [];

    for (const [intent, data] of Object.entries(intentScores)) {
        if (data.score > bestScore) {
            bestScore = data.score;
            bestIntent = intent;
            bestMatchedKeywords = data.matchedKeywords;
        }
    }

    // Calcular confiança (normalizada entre 0 e 1)
    const confidence = Math.min(1.0, bestScore / 5); // Máximo de 5 keywords = 1.0
    
    // Se a confiança for muito baixa, considerar como atendimento genérico
    if (confidence < 0.3 && bestIntent !== INTENT_TYPES.FORA_DO_FOCO) {
        return {
            intent: INTENT_TYPES.ATENDIMENTO,
            confidence: 0.5,
            reasoning: 'Intenção não clara, tratando como atendimento genérico'
        };
    }

    return {
        intent: bestIntent,
        confidence: Math.max(0.5, confidence), // Mínimo de 0.5 de confiança
        reasoning: `Detectado através das palavras-chave: ${bestMatchedKeywords.join(', ')}`,
        matchedKeywords: bestMatchedKeywords
    };
}

/**
 * Verifica se o usuário é admin (para intenções especiais)
 */
function isAdminIntent(intent, userRole) {
    if (intent === INTENT_TYPES.TREINAMENTO_ADMIN || 
        intent === INTENT_TYPES.MODO_CEO) {
        return userRole === 'admin' || userRole === 'super_admin';
    }
    return true; // Outras intenções não requerem admin
}

module.exports = {
    classifyIntent,
    isAdminIntent,
    INTENT_TYPES
};

