/**
 * MÓDULO DE REDIRECIONAMENTO
 * 
 * Responsável por:
 * - Redirecionar educadamente quando o usuário sai do foco
 * - Manter o foco em ConectaKing, vendas, marketing e sistema
 * - Oferecer ajuda relevante ao invés de ignorar
 */

const { getSystemPrompt } = require('../../systemPrompt');

/**
 * Processa uma mensagem fora do foco
 * 
 * @param {string} message - Mensagem do usuário
 * @param {object} context - Contexto (userId, histórico, etc)
 * @returns {object} - { response: string, suggestedTopics: array }
 */
function processRedirecionamento(message, context = {}) {
    // Identificar o assunto fora do foco
    const outOfFocusTopic = identificarAssunto(message);
    
    // Gerar resposta educada de redirecionamento
    const response = gerarRespostaRedirecionamento(outOfFocusTopic, context);
    
    // Sugerir tópicos relevantes
    const suggestedTopics = sugerirTopicosRelevantes(outOfFocusTopic);
    
    return {
        response,
        suggestedTopics,
        module: 'redirecionamento',
        wasRedirected: true
    };
}

/**
 * Identifica o assunto fora do foco
 */
function identificarAssunto(message) {
    const lowerMessage = message.toLowerCase();
    
    // Categorias de assuntos fora do foco
    const topics = {
        'culinária': ['receita', 'comida', 'cozinhar', 'restaurante', 'culinária'],
        'entretenimento': ['filme', 'cinema', 'série', 'netflix', 'entretenimento'],
        'esportes': ['esporte', 'futebol', 'jogos', 'vídeo game', 'game'],
        'política': ['política', 'eleição', 'governo', 'presidente'],
        'religião': ['religião', 'deus', 'jesus', 'bíblia', 'igreja'],
        'ciência': ['ciência', 'física', 'química', 'matemática'],
        'história': ['história', 'passado', 'época', 'guerra'],
        'filosofia': ['filosofia', 'ética', 'moral', 'existência'],
        'pessoal': ['meu cachorro', 'minha família', 'meu relacionamento', 'minha vida pessoal']
    };
    
    for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(keyword => lowerMessage.includes(keyword))) {
            return topic;
        }
    }
    
    return 'geral';
}

/**
 * Gera resposta educada de redirecionamento
 */
function gerarRespostaRedirecionamento(topic, context) {
    const responses = {
        'culinária': `Entendo que você está perguntando sobre culinária. Meu foco é ajudá-lo a vender mais e usar melhor o ConectaKing. Posso ajudá-lo com estratégias de vendas, criação de copy de alta conversão, ou resolver alguma dúvida sobre o painel do ConectaKing.`,
        
        'entretenimento': `Vejo que você está interessado em entretenimento. Meu objetivo é transformar você em alguém que vende mais através do ConectaKing. Posso ajudá-lo com estratégias de marketing para divulgar seu cartão virtual ou criar conteúdo que converta.`,
        
        'esportes': `Entendo sua pergunta sobre esportes. Meu foco é ajudá-lo a crescer seu negócio com o ConectaKing. Posso ajudá-lo com estratégias de vendas, criação de copy persuasiva, ou otimizar seu cartão virtual para converter mais.`,
        
        'política': `Respeito sua pergunta sobre política, mas meu foco é exclusivamente no ConectaKing e em ajudá-lo a vender mais. Posso ajudá-lo com estratégias de marketing, criação de textos de conversão, ou resolver dúvidas sobre o painel.`,
        
        'religião': `Entendo sua questão sobre religião. Meu propósito é ajudá-lo a usar o ConectaKing para vender mais e crescer seu negócio. Posso ajudá-lo com estratégias de vendas, copywriting, ou otimizar seu cartão virtual.`,
        
        'ciência': `Vejo que você está perguntando sobre ciência. Meu foco é ajudá-lo a transformar seu networking em vendas através do ConectaKing. Posso ajudá-lo com estratégias de marketing, criação de copy, ou resolver dúvidas sobre o sistema.`,
        
        'história': `Entendo sua pergunta sobre história. Meu objetivo é ajudá-lo a vender mais usando o ConectaKing. Posso ajudá-lo com estratégias de vendas, criação de textos persuasivos, ou otimizar seu cartão virtual.`,
        
        'filosofia': `Respeito sua questão filosófica, mas meu foco é exclusivamente no ConectaKing e em ajudá-lo a vender mais. Posso ajudá-lo com estratégias de marketing, copywriting, ou resolver dúvidas sobre o painel.`,
        
        'pessoal': `Entendo que você está compartilhando algo pessoal. Meu foco é ajudá-lo a crescer seu negócio com o ConectaKing. Posso ajudá-lo com estratégias de vendas, criação de copy, ou otimizar seu cartão virtual para converter mais clientes.`,
        
        'geral': `Entendo sua pergunta, mas meu foco é ajudá-lo a vender mais e usar melhor o ConectaKing. Posso ajudá-lo com:
• Estratégias de vendas e marketing
• Criação de copy de alta conversão
• Resolução de dúvidas sobre o painel
• Otimização do seu cartão virtual
• Diagnóstico do sistema

Como posso ajudá-lo especificamente?`
    };
    
    return responses[topic] || responses['geral'];
}

/**
 * Sugere tópicos relevantes baseados no assunto fora do foco
 */
function sugerirTopicosRelevantes(topic) {
    const suggestions = {
        'culinária': [
            'Como usar o ConectaKing para restaurantes',
            'Estratégias de marketing para negócios de comida',
            'Copy para divulgar seu restaurante'
        ],
        'entretenimento': [
            'Marketing para criadores de conteúdo',
            'Como usar o ConectaKing para artistas',
            'Estratégias de divulgação'
        ],
        'esportes': [
            'Marketing esportivo com ConectaKing',
            'Como vender mais no setor esportivo',
            'Copy para atletas e treinadores'
        ],
        'política': [
            'Marketing profissional',
            'Como criar networking eficaz',
            'Estratégias de vendas'
        ],
        'religião': [
            'Marketing para organizações',
            'Como divulgar seu trabalho',
            'Estratégias de networking'
        ],
        'ciência': [
            'Marketing para profissionais técnicos',
            'Como vender serviços especializados',
            'Copy para nichos específicos'
        ],
        'história': [
            'Marketing educacional',
            'Como divulgar conhecimento',
            'Estratégias de vendas'
        ],
        'filosofia': [
            'Marketing para consultores',
            'Como vender serviços intelectuais',
            'Copy para profissionais liberais'
        ],
        'pessoal': [
            'Como usar o ConectaKing para networking pessoal',
            'Estratégias de vendas pessoais',
            'Marketing pessoal'
        ],
        'geral': [
            'Estratégias de vendas',
            'Marketing digital',
            'Copywriting',
            'Otimização do cartão virtual',
            'Uso do painel'
        ]
    };
    
    return suggestions[topic] || suggestions['geral'];
}

module.exports = {
    processRedirecionamento
};

