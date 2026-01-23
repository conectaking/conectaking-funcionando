/**
 * MÓDULO DE COPYWRITING
 * 
 * Responsável por:
 * - Gerar textos de conversão (copy)
 * - Criar copies personalizadas e contextuais
 * - Focar em alta conversão
 * - ATIVADO APENAS quando o usuário solicitar explicitamente
 */

const db = require('../../db');
const { getSystemPrompt } = require('../systemPrompt');

/**
 * Processa uma solicitação de copywriting
 * 
 * @param {string} message - Mensagem do usuário
 * @param {object} context - Contexto (userId, histórico, etc)
 * @returns {Promise<object>} - { response: string, copy: string, confidence: number }
 */
async function processCopywriting(message, context = {}) {
    const { userId, userProfile } = context;
    
    // Verificar se realmente é uma solicitação de copy
    if (!isCopyRequest(message)) {
        return {
            response: 'Para criar uma copy de alta conversão, preciso que você me diga especificamente o que precisa. Por exemplo: "Crie uma copy para vender meu cartão ConectaKing" ou "Preciso de um texto persuasivo para Instagram".',
            confidence: 0.5,
            module: 'copywriting'
        };
    }
    
    // Consultar copies de alta conversão na memória
    const highConvertingCopies = await consultarCopiesAltaConversao(message);
    
    // Extrair informações do contexto
    const copyContext = extrairContextoCopy(message, context);
    
    // Gerar copy personalizada
    const copy = await gerarCopy(message, copyContext, highConvertingCopies);
    
    // Construir resposta
    const response = construirRespostaCopy(copy, message, context);
    
    return {
        response,
        copy,
        confidence: 0.9,
        module: 'copywriting',
        canSaveAsHighConverting: true // Pode ser salva como alta conversão se funcionar
    };
}

/**
 * Verifica se é uma solicitação de copy
 */
function isCopyRequest(message) {
    const lowerMessage = message.toLowerCase();
    const copyKeywords = [
        'copy', 'copywriting', 'texto de venda', 'texto persuasivo',
        'copy de conversão', 'escrever texto', 'criar copy',
        'texto para vender', 'copy de alta conversão', 'texto de marketing'
    ];
    
    return copyKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Consulta copies de alta conversão na memória
 */
async function consultarCopiesAltaConversao(message) {
    try {
        const query = `
            SELECT id, title, content, keywords, usage_count, priority
            FROM ia_knowledge_base
            WHERE is_active = true
            AND (
                source_type = 'high_converting_copy'
                OR keywords && ARRAY['copy', 'conversão', 'venda', 'persuasivo']
            )
            ORDER BY priority DESC, usage_count DESC
            LIMIT 5
        `;
        
        const result = await db.query(query);
        return result.rows;
    } catch (error) {
        console.error('Erro ao consultar copies:', error);
        return [];
    }
}

/**
 * Extrai contexto para criar a copy
 */
function extrairContextoCopy(message, context) {
    const lowerMessage = message.toLowerCase();
    
    const copyContext = {
        platform: null,
        product: 'ConectaKing',
        target: 'clientes potenciais',
        tone: 'profissional',
        length: 'média',
        goal: 'conversão'
    };
    
    // Identificar plataforma
    if (lowerMessage.includes('instagram')) copyContext.platform = 'instagram';
    else if (lowerMessage.includes('facebook')) copyContext.platform = 'facebook';
    else if (lowerMessage.includes('whatsapp')) copyContext.platform = 'whatsapp';
    else if (lowerMessage.includes('email')) copyContext.platform = 'email';
    else if (lowerMessage.includes('linkedin')) copyContext.platform = 'linkedin';
    
    // Identificar tom
    if (lowerMessage.includes('casual') || lowerMessage.includes('descontraído')) {
        copyContext.tone = 'casual';
    } else if (lowerMessage.includes('formal') || lowerMessage.includes('corporativo')) {
        copyContext.tone = 'formal';
    } else if (lowerMessage.includes('urgente') || lowerMessage.includes('limitado')) {
        copyContext.tone = 'urgente';
    }
    
    // Identificar comprimento
    if (lowerMessage.includes('curto') || lowerMessage.includes('breve')) {
        copyContext.length = 'curta';
    } else if (lowerMessage.includes('longo') || lowerMessage.includes('completo')) {
        copyContext.length = 'longa';
    }
    
    // Identificar objetivo
    if (lowerMessage.includes('vender') || lowerMessage.includes('conversão')) {
        copyContext.goal = 'conversão';
    } else if (lowerMessage.includes('educar') || lowerMessage.includes('informar')) {
        copyContext.goal = 'educação';
    } else if (lowerMessage.includes('engajar') || lowerMessage.includes('interação')) {
        copyContext.goal = 'engajamento';
    }
    
    return copyContext;
}

/**
 * Gera copy personalizada
 */
async function gerarCopy(message, context, highConvertingCopies) {
    // Usar copies de alta conversão como base se disponíveis
    let copyTemplate = null;
    if (highConvertingCopies && highConvertingCopies.length > 0) {
        copyTemplate = highConvertingCopies[0].content;
    }
    
    // Gerar copy baseada no contexto
    const copy = construirCopy(context, copyTemplate);
    
    return copy;
}

/**
 * Constrói a copy baseada no contexto
 */
function construirCopy(context, template = null) {
    let copy = '';
    
    // Se temos template, adaptar
    if (template) {
        copy = adaptarTemplate(template, context);
    } else {
        // Gerar do zero
        copy = gerarCopyDoZero(context);
    }
    
    return copy;
}

/**
 * Adapta template de copy existente
 */
function adaptarTemplate(template, context) {
    let adapted = template;
    
    // Substituir placeholders
    adapted = adapted.replace(/\{produto\}/g, context.product);
    adapted = adapted.replace(/\{plataforma\}/g, context.platform || 'redes sociais');
    
    // Ajustar tom
    if (context.tone === 'casual') {
        adapted = tornarMaisCasual(adapted);
    } else if (context.tone === 'formal') {
        adapted = tornarMaisFormal(adapted);
    } else if (context.tone === 'urgente') {
        adapted = adicionarUrgencia(adapted);
    }
    
    // Ajustar comprimento
    if (context.length === 'curta') {
        adapted = encurtarCopy(adapted);
    } else if (context.length === 'longa') {
        adapted = expandirCopy(adapted);
    }
    
    return adapted;
}

/**
 * Gera copy do zero
 */
function gerarCopyDoZero(context) {
    const hooks = [
        'Descubra como transformar seu networking em resultados reais',
        'O cartão de visita que seus clientes nunca vão esquecer',
        'Profissionalize sua presença digital em minutos',
        'Compartilhe todas as suas informações com um único link'
    ];
    
    const benefits = [
        'Cartão virtual profissional e personalizado',
        'Fácil de compartilhar via WhatsApp, Instagram e outras redes',
        'Múltiplos módulos para destacar seus produtos e serviços',
        'Painel intuitivo para gerenciar tudo em um só lugar'
    ];
    
    const cta = [
        'Comece agora e transforme seu networking',
        'Crie seu cartão grátis hoje',
        'Experimente sem compromisso',
        'Veja como é fácil começar'
    ];
    
    // Selecionar elementos baseados no contexto
    const hook = hooks[Math.floor(Math.random() * hooks.length)];
    const benefit = benefits[Math.floor(Math.random() * benefits.length)];
    const callToAction = cta[Math.floor(Math.random() * cta.length)];
    
    let copy = `${hook}\n\n`;
    copy += `${benefit}\n\n`;
    
    if (context.length === 'longa') {
        copy += `Com o ConectaKing, você pode:\n`;
        copy += `• Criar um cartão virtual profissional em minutos\n`;
        copy += `• Adicionar links para todas as suas redes sociais\n`;
        copy += `• Personalizar completamente o design\n`;
        copy += `• Compartilhar facilmente com clientes e parceiros\n\n`;
    }
    
    copy += `${callToAction}!`;
    
    return copy;
}

/**
 * Torna copy mais casual
 */
function tornarMaisCasual(copy) {
    return copy
        .replace(/você pode/g, 'você consegue')
        .replace(/é possível/g, 'dá pra')
        .replace(/recomendamos/g, 'a gente recomenda');
}

/**
 * Torna copy mais formal
 */
function tornarMaisFormal(copy) {
    return copy
        .replace(/você consegue/g, 'é possível')
        .replace(/dá pra/g, 'é possível')
        .replace(/a gente/g, 'nós');
}

/**
 * Adiciona urgência à copy
 */
function adicionarUrgencia(copy) {
    const urgencyPhrases = [
        'Por tempo limitado',
        'Não perca esta oportunidade',
        'Apenas hoje',
        'Oferta especial'
    ];
    
    const phrase = urgencyPhrases[Math.floor(Math.random() * urgencyPhrases.length)];
    return `${phrase}!\n\n${copy}`;
}

/**
 * Encurta copy
 */
function encurtarCopy(copy) {
    const sentences = copy.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 2).join('. ') + '.';
}

/**
 * Expande copy
 */
function expandirCopy(copy) {
    const expansions = [
        'Descubra como isso pode transformar seu negócio.',
        'Milhares de profissionais já estão usando.',
        'Resultados comprovados e garantidos.'
    ];
    
    return copy + '\n\n' + expansions.join(' ');
}

/**
 * Constrói resposta com a copy
 */
function construirRespostaCopy(copy, message, context) {
    let response = `## Copy de Alta Conversão\n\n`;
    response += `Aqui está sua copy personalizada:\n\n`;
    response += `---\n\n`;
    response += `${copy}\n\n`;
    response += `---\n\n`;
    response += `\n**Dicas para usar esta copy:**\n`;
    response += `• Use em ${context.platform || 'suas redes sociais'}\n`;
    response += `• Adapte conforme sua audiência\n`;
    response += `• Teste diferentes variações\n`;
    response += `• Meça os resultados\n\n`;
    response += `Quer que eu crie outra versão ou ajuste algo específico?`;
    
    return response;
}

module.exports = {
    processCopywriting
};

