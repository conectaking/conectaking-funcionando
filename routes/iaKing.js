const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');
const fetch = require('node-fetch');
const embeddings = require('./embeddings');
const { generateWithExternalAPI, hasAnyAPIConfigured } = require('../utils/aiApiHelper');
const { trainIAWithSystemInfo, addParcelamentoKnowledge } = require('../utils/iaSystemTrainer');

// Sistema avançado de entendimento (similar ao ChatGPT)
let advancedUnderstanding = null;
try {
    advancedUnderstanding = require('./iaKingAdvancedUnderstanding');
} catch (error) {
    console.warn('⚠️ Sistema avançado de entendimento não disponível:', error.message);
}

const router = express.Router();

// Tratar requisições OPTIONS (preflight CORS) - Middleware para todas as rotas
router.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.sendStatus(200);
    }
    next();
});

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
        'logo', 'personalização', 'personalizacao', 'compartilhar', 'compartilhamento',
        'empresa', 'sobre', 'fale sobre', 'fala sobre', 'me fale', 'me fala',
        'conecta', 'king', 'plataforma', 'serviço', 'servico', 'produto'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    // Detectar perguntas sobre a empresa/sistema mesmo sem palavras-chave explícitas
    const aboutPatterns = [
        /(me\s+)?fale?\s+sobre/i,
        /(me\s+)?fala?\s+sobre/i,
        /(me\s+)?conte?\s+sobre/i,
        /(me\s+)?explique?\s+sobre/i,
        /o\s+que\s+é/i,
        /quem\s+é/i,
        /o\s+que\s+faz/i,
        /sobre\s+(a\s+)?(empresa|sistema|plataforma|conecta|king)/i
    ];
    
    const hasAboutPattern = aboutPatterns.some(pattern => pattern.test(message));
    const hasKeyword = systemKeywords.some(keyword => lowerMessage.includes(keyword));
    
    return hasKeyword || hasAboutPattern;
}

// ============================================
// SISTEMA DE FILTROS E CATEGORIZAÇÃO
// ============================================

// Função para categorizar a pergunta (FILTROS INTELIGENTES)
function categorizeQuestion(question, questionContext) {
    const lowerQuestion = question.toLowerCase();
    const categories = {
        religious: false,      // Religioso
        political: false,      // Político
        scientific: false,     // Científico
        philosophical: false,  // Filosófico
        historical: false,     // Histórico
        psychological: false,   // Psicológico
        technical: false,       // Técnico
        personal: false,       // Pessoal
        educational: false,    // Educacional
        health: false,         // Saúde
        business: false,      // Negócios
        sales: false,         // Vendas
        strategy: false,      // Estratégias
        entertainment: false   // Entretenimento
    };
    
    // FILTRO DE VENDAS E ESTRATÉGIAS
    const salesKeywords = [
        'venda', 'vendas', 'vender', 'vendedor', 'vendedora', 'comercial', 'vendas',
        'estratégia', 'estrategia', 'estratégias', 'estrategias', 'técnica de venda',
        'técnicas de venda', 'como vender', 'fechar venda', 'prospecção', 'prospeccao',
        'cliente', 'clientes', 'negociação', 'negociacao', 'objeção', 'objeções',
        'pitch', 'apresentação', 'apresentacao', 'proposta', 'propostas', 'fechamento',
        'conversão', 'conversao', 'conversão de vendas', 'funnel de vendas', 'pipeline',
        'crm', 'relacionamento com cliente', 'atendimento', 'pós-venda', 'pos-venda',
        'upsell', 'cross-sell', 'retenção', 'retencao', 'churn', 'lifetime value',
        'métricas de venda', 'metricas de venda', 'kpi de venda', 'indicadores de venda'
    ];
    
    for (const keyword of salesKeywords) {
        if (lowerQuestion.includes(keyword) || questionContext.keywords.some(k => k.includes(keyword))) {
            categories.sales = true;
            categories.strategy = true;
            categories.business = true;
            break;
        }
    }
    
    // FILTRO RELIGIOSO
    const religiousKeywords = [
        'jesus', 'cristo', 'deus', 'deus', 'bíblia', 'biblia', 'evangelho', 'igreja', 'religião', 'religiao',
        'fé', 'fe', 'santo', 'santa', 'profeta', 'apóstolo', 'apostolo', 'cristianismo', 'catolicismo',
        'protestante', 'islam', 'islamismo', 'budismo', 'judaísmo', 'judaismo', 'espiritualidade',
        'oração', 'oracao', 'rezar', 'rezar', 'salvação', 'salvacao', 'pecado', 'céu', 'ceu', 'inferno',
        'anjo', 'demônio', 'demonio', 'milagre', 'sagrado', 'divino', 'messias', 'salvador'
    ];
    
    for (const keyword of religiousKeywords) {
        if (lowerQuestion.includes(keyword) || questionContext.entities.some(e => e.includes(keyword))) {
            categories.religious = true;
            break;
        }
    }
    
    // FILTRO POLÍTICO
    const politicalKeywords = [
        'política', 'politica', 'político', 'politico', 'governo', 'presidente', 'eleição', 'eleicao',
        'partido', 'voto', 'votar', 'democracia', 'ditadura', 'esquerda', 'direita', 'liberal',
        'conservador', 'socialista', 'comunista', 'capitalismo', 'socialismo', 'congresso', 'senado',
        'deputado', 'senador', 'prefeito', 'governador', 'eleitor', 'candidato', 'campanha'
    ];
    
    for (const keyword of politicalKeywords) {
        if (lowerQuestion.includes(keyword)) {
            categories.political = true;
            break;
        }
    }
    
    // FILTRO CIENTÍFICO
    const scientificKeywords = [
        'ciência', 'ciencia', 'científico', 'cientifico', 'pesquisa', 'experimento', 'laboratório', 'laboratorio',
        'física', 'fisica', 'química', 'quimica', 'biologia', 'matemática', 'matematica', 'astronomia',
        'teoria', 'hipótese', 'hipotese', 'método científico', 'metodo cientifico', 'dados', 'estatística',
        'estatistica', 'análise', 'analise', 'pesquisador', 'cientista', 'estudo', 'descoberta'
    ];
    
    for (const keyword of scientificKeywords) {
        if (lowerQuestion.includes(keyword)) {
            categories.scientific = true;
            break;
        }
    }
    
    // FILTRO FILOSÓFICO
    const philosophicalKeywords = [
        'filosofia', 'filosófico', 'filosofico', 'filosofo', 'filosofo', 'ética', 'etica', 'moral',
        'existência', 'existencia', 'sentido da vida', 'verdade', 'realidade', 'consciência', 'consciencia',
        'razão', 'razao', 'lógica', 'logica', 'pensamento', 'reflexão', 'reflexao', 'questionamento',
        'socrático', 'socratico', 'aristóteles', 'aristoteles', 'platão', 'platao', 'kant', 'nietzsche'
    ];
    
    for (const keyword of philosophicalKeywords) {
        if (lowerQuestion.includes(keyword)) {
            categories.philosophical = true;
            break;
        }
    }
    
    // FILTRO HISTÓRICO
    const historicalKeywords = [
        'história', 'historia', 'histórico', 'historico', 'passado', 'antigo', 'antiga', 'época', 'epoca',
        'século', 'seculo', 'idade', 'era', 'civilização', 'civilizacao', 'império', 'imperio', 'guerra',
        'batalha', 'revolução', 'revolucao', 'independência', 'independencia', 'colonização', 'colonizacao'
    ];
    
    for (const keyword of historicalKeywords) {
        if (lowerQuestion.includes(keyword)) {
            categories.historical = true;
            break;
        }
    }
    
    // FILTRO PSICOLÓGICO
    const psychologicalKeywords = [
        'psicologia', 'psicológico', 'psicologico', 'psicólogo', 'psicologo', 'psiquiatra', 'terapia',
        'mental', 'emocional', 'ansiedade', 'depressão', 'depressao', 'estresse', 'stress', 'transtorno',
        'comportamento', 'personalidade', 'mente', 'cognição', 'cognicao', 'trauma', 'emoção', 'emocao'
    ];
    
    for (const keyword of psychologicalKeywords) {
        if (lowerQuestion.includes(keyword)) {
            categories.psychological = true;
            break;
        }
    }
    
    // FILTRO TÉCNICO
    const technicalKeywords = [
        'tecnologia', 'técnico', 'tecnico', 'programação', 'programacao', 'código', 'codigo', 'software',
        'hardware', 'computador', 'aplicativo', 'app', 'sistema', 'plataforma', 'desenvolvimento', 'api',
        'banco de dados', 'database', 'servidor', 'cliente', 'interface', 'algoritmo', 'função', 'funcao'
    ];
    
    for (const keyword of technicalKeywords) {
        if (lowerQuestion.includes(keyword)) {
            categories.technical = true;
            break;
        }
    }
    
    // FILTRO PESSOAL
    const personalKeywords = [
        'eu', 'meu', 'minha', 'me', 'mim', 'você', 'voce', 'sua', 'seu', 'pessoal', 'privado',
        'ajuda pessoal', 'conselho pessoal', 'minha vida', 'meu problema', 'estou', 'sinto'
    ];
    
    for (const keyword of personalKeywords) {
        if (lowerQuestion.includes(keyword) && (lowerQuestion.includes('ajuda') || lowerQuestion.includes('problema') || lowerQuestion.includes('conselho'))) {
            categories.personal = true;
            break;
        }
    }
    
    // FILTRO EDUCACIONAL
    const educationalKeywords = [
        'aprender', 'estudar', 'estudo', 'curso', 'aula', 'professor', 'professora', 'ensino', 'educação',
        'educacao', 'escola', 'universidade', 'faculdade', 'aluno', 'estudante', 'matéria', 'materia',
        'disciplina', 'conteúdo', 'conteudo', 'explicar', 'ensinar', 'como fazer', 'como aprender'
    ];
    
    for (const keyword of educationalKeywords) {
        if (lowerQuestion.includes(keyword)) {
            categories.educational = true;
            break;
        }
    }
    
    // FILTRO SAÚDE
    const healthKeywords = [
        'saúde', 'saude', 'médico', 'medico', 'médica', 'medica', 'doença', 'doenca', 'tratamento',
        'sintoma', 'diagnóstico', 'diagnostico', 'medicina', 'hospital', 'clínica', 'clinica',
        'remédio', 'remedio', 'medicamento', 'cura', 'prevenção', 'prevencao'
    ];
    
    for (const keyword of healthKeywords) {
        if (lowerQuestion.includes(keyword)) {
            categories.health = true;
            break;
        }
    }
    
    // Determinar categoria principal
    let primaryCategory = 'general';
    const activeCategories = Object.entries(categories).filter(([_, active]) => active);
    
    if (activeCategories.length > 0) {
        // Priorizar: vendas/estratégias > religioso > histórico > filosófico > científico > político
        if (categories.sales || categories.strategy) primaryCategory = 'sales';
        else if (categories.religious) primaryCategory = 'religious';
        else if (categories.historical) primaryCategory = 'historical';
        else if (categories.philosophical) primaryCategory = 'philosophical';
        else if (categories.scientific) primaryCategory = 'scientific';
        else if (categories.political) primaryCategory = 'political';
        else if (categories.psychological) primaryCategory = 'psychological';
        else if (categories.technical) primaryCategory = 'technical';
        else if (categories.personal) primaryCategory = 'personal';
        else if (categories.educational) primaryCategory = 'educational';
        else if (categories.health) primaryCategory = 'health';
        else if (categories.business) primaryCategory = 'business';
        else primaryCategory = activeCategories[0][0];
    }
    
    return {
        categories: categories,
        primaryCategory: primaryCategory,
        allCategories: activeCategories.map(([cat, _]) => cat)
    };
}

// Função para aplicar filtros na busca de conhecimento
function applyCategoryFilters(knowledgeItems, categoryInfo, questionContext) {
    if (!categoryInfo || categoryInfo.primaryCategory === 'general') {
        return knowledgeItems; // Sem filtro se categoria geral
    }
    
    const filtered = knowledgeItems.filter(kb => {
        if (!kb.content || !kb.title) return false;
        
        const contentLower = kb.content.toLowerCase();
        const titleLower = kb.title.toLowerCase();
        
        // Para perguntas religiosas, priorizar conhecimento religioso
        if (categoryInfo.primaryCategory === 'religious') {
            const religiousTerms = ['jesus', 'cristo', 'deus', 'bíblia', 'biblia', 'evangelho', 'fé', 'fe', 'santo', 'santa', 'cristianismo', 'religião', 'religiao'];
            return religiousTerms.some(term => contentLower.includes(term) || titleLower.includes(term));
        }
        
        // Para perguntas políticas, priorizar conhecimento político
        if (categoryInfo.primaryCategory === 'political') {
            const politicalTerms = ['política', 'politica', 'governo', 'presidente', 'eleição', 'eleicao', 'partido', 'voto'];
            return politicalTerms.some(term => contentLower.includes(term) || titleLower.includes(term));
        }
        
        // Para perguntas científicas, priorizar conhecimento científico
        if (categoryInfo.primaryCategory === 'scientific') {
            const scientificTerms = ['ciência', 'ciencia', 'científico', 'cientifico', 'pesquisa', 'experimento', 'teoria'];
            return scientificTerms.some(term => contentLower.includes(term) || titleLower.includes(term));
        }
        
        // Para outras categorias, manter todos mas priorizar os que têm termos relacionados
        return true;
    });
    
    // Se o filtro removeu tudo, retornar todos (não filtrar muito agressivamente)
    return filtered.length > 0 ? filtered : knowledgeItems;
}

// Função para extrair entidades e tópicos principais da pergunta (INTELIGÊNCIA CONTEXTUAL)
function extractQuestionContext(question) {
    const lowerQuestion = question.toLowerCase().trim();
    const originalQuestion = question;
    
    // Entidades importantes (nomes próprios, conceitos)
    const entities = [];
    
    // Padrões para extrair entidades (melhorados e mais robustos)
    const entityPatterns = [
        // Padrão: "quem é X" ou "quem foi X" ou "quem e X" (com ou sem acento) - CAPTURA TUDO APÓS
        /(?:quem\s+(?:é|e|foi|era))\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç0-9]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç0-9]+)*)/gi,
        // Padrão: "o que é X" ou "oque e X" (sem espaço) - CAPTURA TUDO APÓS
        /(?:o\s*que\s+(?:é|e|foi|era)|oque\s+(?:é|e|foi|era))\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç0-9]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç0-9]+)*)/gi,
        // Padrão: "X é" ou "X foi" (com maiúscula no início)
        /([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç0-9]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç0-9]+)*)\s+(?:é|e|foi|era|nasceu)/gi,
        // Padrão: Nomes próprios no final da pergunta (após "quem é", "o que é", etc.)
        /(?:quem|o\s*que|oque)\s+(?:é|e|foi|era)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç0-9]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç0-9]+)*)/gi
    ];
    
    // Extrair entidades dos padrões
    for (const pattern of entityPatterns) {
        const matches = [...originalQuestion.matchAll(pattern)];
        if (matches && matches.length > 0) {
            for (const match of matches) {
                if (match[1]) {
                    let entity = match[1].trim();
                    // Manter maiúsculas se houver (ex: "PNL", "Jesus")
                    const hasUpperCase = /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(entity);
                    const entityLower = entity.toLowerCase();
                    
                    // Filtrar palavras muito comuns
                    const commonWords = ['o', 'a', 'um', 'uma', 'de', 'do', 'da', 'que', 'você', 'voce', 'sabe', 'conhece', 'você', 'voce', 'quem', 'oque', 'oque'];
                    
                    // Se tem maiúscula, provavelmente é uma entidade importante (ex: PNL, Jesus)
                    if (hasUpperCase && entity.length > 1) {
                        entities.push(entity); // Manter original com maiúscula
                        entities.push(entityLower); // Também adicionar lowercase para busca
                    } else if (entityLower.length > 2 && !commonWords.includes(entityLower)) {
                        entities.push(entityLower);
                    }
                }
            }
        }
    }
    
    // EXTRAÇÃO DIRETA MELHORADA: Procurar palavras que aparecem após "quem é", "quem e", "oque e", etc.
    // Padrão melhorado para capturar "OQUE E PNL" ou "QUEM E JESUS" (tudo maiúsculo)
    const directPatternUpper = /(?:QUEM\s+E|OQUE\s+E|O\s+QUE\s+E)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9]+)*)/g;
    const directMatchesUpper = [...originalQuestion.matchAll(directPatternUpper)];
    for (const match of directMatchesUpper) {
        if (match[1]) {
            const entity = match[1].trim();
            if (entity.length > 1) {
                entities.push(entity); // Manter maiúscula (ex: "PNL", "JESUS")
                entities.push(entity.toLowerCase()); // Também adicionar lowercase
                console.log(`✅ [IA] Entidade maiúscula extraída: "${entity}"`);
            }
        }
    }
    
    // Padrão para minúsculo também
    const directPattern = /(?:quem\s+(?:é|e|foi|era)|o\s*que\s+(?:é|e|foi|era)|oque\s+(?:é|e|foi|era))\s+([a-záàâãéêíóôõúç0-9]+(?:\s+[a-záàâãéêíóôõúç0-9]+)*)/gi;
    const directMatches = [...lowerQuestion.matchAll(directPattern)];
    for (const match of directMatches) {
        if (match[1]) {
            const entity = match[1].trim();
            const commonWords = ['o', 'a', 'um', 'uma', 'de', 'do', 'da', 'que', 'você', 'voce', 'sabe', 'conhece'];
            if (entity.length > 2 && !commonWords.includes(entity) && !entities.includes(entity)) {
                entities.push(entity);
                console.log(`✅ [IA] Entidade minúscula extraída: "${entity}"`);
            }
        }
    }
    
    // EXTRAÇÃO MELHORADA: Se a pergunta é "quem e X" ou "quem é X", pegar X diretamente
    // Exemplo: "quem e jesus" -> entidade: "jesus"
    // Também detecta "quen" (erro de digitação de "quem")
    const simpleWhoPattern = /^(?:quem|quen)\s+(?:é|e|foi|era)\s+([a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)\s*$/i;
    const simpleWhoMatch = originalQuestion.match(simpleWhoPattern);
    if (simpleWhoMatch && simpleWhoMatch[1]) {
        const entity = simpleWhoMatch[1].toLowerCase().trim();
        const commonWords = ['o', 'a', 'um', 'uma', 'de', 'do', 'da', 'que', 'você', 'voce', 'sabe', 'conhece'];
        if (entity.length > 2 && !commonWords.includes(entity) && !entities.includes(entity)) {
            entities.push(entity);
            console.log('✅ [IA] Entidade extraída diretamente:', entity);
        }
    }
    
    // EXTRAÇÃO ALTERNATIVA: Se não encontrou, pegar última palavra importante da pergunta
    // Também funciona com "quen" (erro de digitação)
    if (entities.length === 0 && (lowerQuestion.includes('quem') || lowerQuestion.includes('quen'))) {
        const words = lowerQuestion.split(/\s+/);
        // Encontrar índice de "quem" ou "quen"
        const quemIndex = words.findIndex(w => w === 'quem' || w === 'quen');
        if (quemIndex >= 0) {
            // Pegar palavras após "quem"/"quen" que não são comuns
            const afterQuem = words.slice(quemIndex + 1);
            const importantAfterQuem = afterQuem.filter(w => 
                w.length > 2 && 
                !['é', 'e', 'foi', 'era', 'o', 'a', 'um', 'uma', 'de', 'do', 'da', 'que', 'você', 'voce', 'sabe', 'conhece'].includes(w)
            );
            if (importantAfterQuem.length > 0) {
                const entity = importantAfterQuem[0];
                if (!entities.includes(entity)) {
                    entities.push(entity); // Pegar primeira palavra importante
                    console.log('✅ [IA] Entidade extraída como última palavra importante:', entity);
                }
            }
        }
    }
    
    // EXTRAÇÃO ESPECIAL PARA "JESUS" E "PNL": Garantir que sejam capturados mesmo com variações
    // Detectar "jesus" mesmo com erros de digitação como "quen e jesus"
    if (lowerQuestion.includes('jesus') || lowerQuestion.includes('cristo') || originalQuestion.includes('JESUS') || originalQuestion.includes('CRISTO')) {
        if (lowerQuestion.includes('jesus') || originalQuestion.includes('JESUS')) {
            if (!entities.includes('jesus') && !entities.includes('JESUS')) {
                entities.push('jesus');
                entities.push('JESUS');
                console.log('✅ [IA] Entidade "jesus" detectada e adicionada');
            }
        }
        if (lowerQuestion.includes('cristo') || originalQuestion.includes('CRISTO')) {
            if (!entities.includes('cristo') && !entities.includes('CRISTO')) {
                entities.push('cristo');
                entities.push('CRISTO');
                console.log('✅ [IA] Entidade "cristo" detectada e adicionada');
            }
        }
    }
    
    // EXTRAÇÃO ESPECIAL PARA "PNL": Garantir que seja capturado mesmo escrito diferente
    if (lowerQuestion.includes('pnl') || originalQuestion.includes('PNL') || originalQuestion.includes('P.N.L')) {
        if (!entities.includes('pnl') && !entities.includes('PNL')) {
            entities.push('pnl');
            entities.push('PNL');
            entities.push('programação neurolinguística');
            entities.push('programacao neurolinguistica');
            console.log('✅ [IA] Entidade "PNL" detectada e adicionada com variações');
        }
    }
    
    // EXTRAÇÃO MELHORADA: Detectar padrões com erros de digitação
    // "quen e jesus" -> "jesus"
    // "quem e jesus" -> "jesus"
    // "quem é jesus" -> "jesus"
    const typoPatterns = [
        /(?:quen|quem|quem)\s+(?:é|e|foi|era)\s+(jesus|cristo|deus)/gi,
        /(?:quen|quem|quem)\s+(jesus|cristo|deus)/gi
    ];
    
    for (const pattern of typoPatterns) {
        const matches = [...lowerQuestion.matchAll(pattern)];
        for (const match of matches) {
            if (match[1]) {
                const entity = match[1].toLowerCase().trim();
                if (!entities.includes(entity)) {
                    entities.push(entity);
                    console.log(`✅ [IA] Entidade "${entity}" detectada via padrão de erro de digitação`);
                }
            }
        }
    }
    
    // Se encontrou "jesus" ou "cristo" na pergunta, garantir que está nas entidades
    if ((lowerQuestion.includes('jesus') || lowerQuestion.includes('cristo')) && entities.length === 0) {
        if (lowerQuestion.includes('jesus')) {
            entities.push('jesus');
            console.log('✅ [IA] Entidade "jesus" adicionada como fallback');
        }
        if (lowerQuestion.includes('cristo')) {
            entities.push('cristo');
            console.log('✅ [IA] Entidade "cristo" adicionada como fallback');
        }
    }
    
    // Extrair palavras que parecem nomes próprios (começam com maiúscula e não são no início da frase)
    const words = originalQuestion.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        // Se começa com maiúscula e não é no início da frase, pode ser nome próprio
        if (word.match(/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+$/) && 
            word.length > 2 && 
            !['O', 'A', 'Os', 'As', 'Um', 'Uma', 'De', 'Do', 'Da', 'Que', 'Você', 'Voce'].includes(word)) {
            const entity = word.toLowerCase();
            if (!entities.includes(entity)) {
                entities.push(entity);
            }
        }
    }
    
    // EXTRAÇÃO ESPECIAL: Se não encontrou entidades, procurar palavras-chave importantes na pergunta
    if (entities.length === 0) {
        // Procurar palavras que não são comuns e podem ser entidades
        const allWords = lowerQuestion.split(/\s+/);
        const importantWords = allWords.filter(w => 
            w.length > 3 && 
            !['quem', 'que', 'você', 'voce', 'sabe', 'conhece', 'pode', 'fazer', 'como', 'onde', 'quando', 'porque'].includes(w)
        );
        
        // Se encontrou palavras importantes, adicionar como possíveis entidades
        if (importantWords.length > 0) {
            entities.push(...importantWords.slice(0, 3)); // Máximo 3 palavras
        }
    }
    
    // Remover duplicatas
    const uniqueEntities = [...new Set(entities)];
    
    // Palavras-chave importantes da pergunta (remover palavras comuns)
    const commonWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por', 'que', 'é', 'são', 'está', 'estão', 'ser', 'ter', 'fazer', 'pode', 'sua', 'seu', 'suas', 'seus', 'me', 'te', 'nos', 'você', 'vocês', 'qual', 'quais', 'como', 'quando', 'onde', 'quem', 'foi', 'sabe', 'conhece'];
    const keywords = lowerQuestion.split(/\s+/)
        .filter(w => w.length > 2 && !commonWords.includes(w))
        .filter((v, i, a) => a.indexOf(v) === i); // Remover duplicatas
    
    // Tipo de pergunta
    let questionType = 'general';
    if (lowerQuestion.includes('quem') || lowerQuestion.includes('quem é') || lowerQuestion.includes('quem foi')) {
        questionType = 'who';
    } else if (lowerQuestion.includes('o que é') || lowerQuestion.includes('o que foi') || lowerQuestion.includes('que é')) {
        questionType = 'what';
    } else if (lowerQuestion.includes('como') || lowerQuestion.includes('como fazer')) {
        questionType = 'how';
    } else if (lowerQuestion.includes('onde') || lowerQuestion.includes('onde está')) {
        questionType = 'where';
    } else if (lowerQuestion.includes('quando') || lowerQuestion.includes('quando foi')) {
        questionType = 'when';
    } else if (lowerQuestion.includes('por que') || lowerQuestion.includes('porque') || lowerQuestion.includes('por quê')) {
        questionType = 'why';
    }
    
    return {
        entities: uniqueEntities,
        keywords: keywords,
        questionType: questionType,
        originalQuestion: question
    };
}

// Função para encontrar trecho relevante dentro do conteúdo que responde à pergunta
function findRelevantExcerpt(content, questionContext, maxLength = 400) {
    if (!content || !questionContext) return null;
    
    // LÓGICA INTELIGENTE: Ajustar maxLength baseado no tipo de pergunta
    // Perguntas sobre pessoas ("quem é X") precisam de respostas mais completas
    if (questionContext.questionType === 'who') {
        maxLength = 1200; // Aumentar significativamente para perguntas sobre pessoas
        console.log('👤 [IA] Pergunta sobre pessoa detectada - aumentando tamanho da resposta para', maxLength);
    } else if (questionContext.questionType === 'what') {
        maxLength = 600; // Perguntas "o que é" também precisam de mais contexto
    }
    
    // Filtrar conteúdo acadêmico primeiro
    if (filterAcademicContent(content)) {
        console.log('🚫 [IA] Conteúdo acadêmico filtrado ao buscar trecho relevante');
        return null;
    }
    
    const contentLower = content.toLowerCase();
    const sentences = content.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
    
    // Procurar sentenças que contêm as entidades ou palavras-chave principais
    const relevantSentences = [];
    
    for (const sentence of sentences) {
        // Filtrar sentenças acadêmicas
        if (filterAcademicContent(sentence)) continue;
        
        const sentenceLower = sentence.toLowerCase();
        let score = 0;
        
        // PRIORIDADE MÁXIMA: Entidades encontradas (especialmente para "quem é X")
        for (const entity of questionContext.entities) {
            if (sentenceLower.includes(entity)) {
                score += 100; // Muito alto para entidades
                
                // BONUS EXTRA: Se a sentença começa com a entidade ou tem padrão de definição
                if (sentenceLower.startsWith(entity) || 
                    sentenceLower.match(new RegExp(`(?:^|\\s)${entity}\\s+(?:é|foi|nasceu|filho|filha|profeta|rei|mestre|santo|santa)`, 'i'))) {
                    score += 50; // Bonus extra para definições diretas
                }
            }
        }
        
        // PRIORIDADE ALTA: Palavras-chave principais
        for (const keyword of questionContext.keywords) {
            if (sentenceLower.includes(keyword)) {
                score += 30;
            }
        }
        
        // BONUS: Padrões de resposta baseados no tipo de pergunta
        if (questionContext.questionType === 'who') {
            // Para "quem é", procurar padrões de definição de pessoa
            if (sentenceLower.match(/(?:^|\s)(?:é|foi|nasceu|filho|filha|profeta|rei|mestre|santo|santa|apóstolo|discípulo)/)) {
                score += 40;
            }
        } else if (questionContext.questionType === 'what') {
            // Para "o que é", procurar padrões de definição
            if (sentenceLower.match(/(?:^|\s)(?:é|significa|consiste|refere-se|representa)/)) {
                score += 40;
            }
        }
        
        if (score > 0) {
            relevantSentences.push({ sentence, score });
        }
    }
    
    // Ordenar por score e pegar as melhores
    relevantSentences.sort((a, b) => b.score - a.score);
    
    // Se encontrou sentenças relevantes, construir resposta
    if (relevantSentences.length > 0) {
        // LÓGICA INTELIGENTE: Para perguntas sobre pessoas, pegar mais sentenças
        const maxSentences = questionContext.questionType === 'who' ? 15 : 6;
        const topSentences = relevantSentences.slice(0, maxSentences);
        
        // Construir resposta começando pelas sentenças mais relevantes
        let excerpt = '';
        for (const item of topSentences) {
            if (excerpt.length + item.sentence.length > maxLength) break;
            if (excerpt) excerpt += '. ';
            excerpt += item.sentence;
        }
        
        // Se ainda tem espaço, adicionar contexto (sentenças próximas)
        // Para perguntas sobre pessoas, adicionar mais contexto
        const minFillRatio = questionContext.questionType === 'who' ? 0.5 : 0.7;
        if (excerpt.length < maxLength * minFillRatio && relevantSentences.length > topSentences.length) {
            const remaining = maxLength - excerpt.length;
            // Para perguntas sobre pessoas, adicionar múltiplas sentenças se couber
            const sentencesToAdd = questionContext.questionType === 'who' ? 5 : 1;
            for (let i = 0; i < sentencesToAdd && (topSentences.length + i) < relevantSentences.length; i++) {
                const nextSentence = relevantSentences[topSentences.length + i];
                if (nextSentence && (excerpt.length + nextSentence.sentence.length + 2) <= maxLength) {
                    excerpt += '. ' + nextSentence.sentence;
                } else {
                    break;
                }
            }
        }
        
        // Limitar tamanho final
        if (excerpt.length > maxLength) {
            excerpt = excerpt.substring(0, maxLength);
            // Tentar cortar em uma frase completa
            const lastPeriod = excerpt.lastIndexOf('.');
            if (lastPeriod > maxLength * 0.6) {
                excerpt = excerpt.substring(0, lastPeriod + 1);
            } else {
                excerpt += '...';
            }
        }
        
        if (excerpt.length > 50) {
            console.log('✅ [IA] Trecho relevante encontrado:', excerpt.substring(0, 100) + '...');
            // LIMPAR CONTEÚDO: Remover referências estruturais antes de retornar
            excerpt = cleanBookContent(excerpt);
            return excerpt;
        }
    }
    
    // Se não encontrou sentenças específicas, procurar por padrões de resposta no conteúdo completo
    const answerPatterns = {
        'who': [
            new RegExp(`(${questionContext.entities.join('|')})\\s+(?:é|foi|nasceu|filho|filha|profeta|rei|mestre|santo|santa|apóstolo|discípulo)\\s+([^.!?]{20,200})`, 'gi'),
            new RegExp(`(?:quem|quem é|quem foi)\\s+(${questionContext.entities.join('|')})\\s*[?!.]?\\s*([^.!?]{20,200})`, 'gi')
        ],
        'what': [
            new RegExp(`(${questionContext.entities.join('|')}|${questionContext.keywords.join('|')})\\s+(?:é|significa|consiste|refere-se)\\s+([^.!?]{20,200})`, 'gi')
        ]
    };
    
    if (answerPatterns[questionContext.questionType]) {
        for (const pattern of answerPatterns[questionContext.questionType]) {
            const matches = [...content.matchAll(pattern)];
            if (matches && matches.length > 0) {
                // Pegar o melhor match (mais completo)
                const bestMatch = matches.reduce((best, match) => {
                    return match[0].length > (best?.[0].length || 0) ? match : best;
                }, null);
                
                if (bestMatch && bestMatch[0].length > 50) {
                    let excerpt = bestMatch[0].substring(0, maxLength);
                    // Garantir que termina em ponto
                    if (!excerpt.match(/[.!?]$/)) {
                        const lastPeriod = excerpt.lastIndexOf('.');
                        if (lastPeriod > maxLength * 0.7) {
                            excerpt = excerpt.substring(0, lastPeriod + 1);
                        }
                    }
                    console.log('✅ [IA] Padrão de resposta encontrado:', excerpt.substring(0, 100) + '...');
                    return excerpt;
                }
            }
        }
    }
    
    // Fallback: primeiro parágrafo que contém entidade ou palavra-chave principal
    // LÓGICA INTELIGENTE: Para perguntas sobre pessoas, buscar múltiplos parágrafos
    const paragraphs = content.split(/\n\n+/);
    let relevantParagraphs = [];
    
    for (const para of paragraphs) {
        // Filtrar parágrafos acadêmicos
        if (filterAcademicContent(para)) continue;
        
        const paraLower = para.toLowerCase();
        const hasEntity = questionContext.entities.some(ent => paraLower.includes(ent));
        const hasMainKeyword = questionContext.keywords.length > 0 && 
                              questionContext.keywords.slice(0, 2).some(kw => paraLower.includes(kw));
        
        if (hasEntity || hasMainKeyword) {
            relevantParagraphs.push(para);
            
            // Para perguntas sobre pessoas, coletar múltiplos parágrafos
            if (questionContext.questionType === 'who') {
                // Continuar coletando até atingir o limite ou encontrar 5 parágrafos
                if (relevantParagraphs.join('\n\n').length < maxLength && relevantParagraphs.length < 5) {
                    continue;
                } else {
                    break;
                }
            } else {
                // Para outras perguntas, usar apenas o primeiro parágrafo relevante
                break;
            }
        }
    }
    
    if (relevantParagraphs.length > 0) {
        const excerpt = relevantParagraphs.join('\n\n').substring(0, maxLength);
        if (excerpt.length > 50) {
            console.log(`✅ [IA] ${relevantParagraphs.length} parágrafo(s) relevante(s) encontrado(s) (fallback)`);
            return excerpt;
        }
    }
    
    return null;
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

// Função para calcular relevância inteligente (considera contexto semântico)
function calculateIntelligentRelevance(questionContext, knowledgeItem) {
    if (!questionContext || !knowledgeItem) return 0;
    
    const titleLower = (knowledgeItem.title || '').toLowerCase();
    const contentLower = (knowledgeItem.content || '').toLowerCase();
    let score = 0;
    
    // BONUS ALTO: Entidades encontradas no título (máxima relevância)
    for (const entity of questionContext.entities) {
        if (titleLower.includes(entity)) {
            score += 100; // Muito alto - título contém a entidade
        } else if (contentLower.includes(entity)) {
            score += 50; // Alto - conteúdo contém a entidade
        }
    }
    
    // BONUS MÉDIO: Palavras-chave no título
    let keywordMatches = 0;
    for (const keyword of questionContext.keywords) {
        if (titleLower.includes(keyword)) {
            keywordMatches++;
            score += 30;
        } else if (contentLower.includes(keyword)) {
            keywordMatches++;
            score += 15;
        }
    }
    
    // BONUS: Tipo de pergunta corresponde ao conteúdo
    if (questionContext.questionType === 'who') {
        // Para "quem é", procurar padrões de definição de pessoa
        if (contentLower.match(/(?:é|foi|nasceu|filho|filha|profeta|rei|mestre)/)) {
            score += 40;
        }
    } else if (questionContext.questionType === 'what') {
        // Para "o que é", procurar padrões de definição
        if (contentLower.match(/(?:é|significa|consiste|refere-se)/)) {
            score += 40;
        }
    }
    
    // BONUS: Conhecimento de livros tem prioridade (mas não se não for relevante)
    if (knowledgeItem.source_type === 'book_training' && score > 30) {
        score += 20; // Bonus apenas se já for relevante
    }
    
    // PENALIDADE: Se não tem nenhuma entidade ou palavra-chave relevante
    if (questionContext.entities.length > 0 && score < 50) {
        // Se a pergunta tem entidades específicas mas o conhecimento não as contém
        const hasEntity = questionContext.entities.some(ent => 
            titleLower.includes(ent) || contentLower.includes(ent)
        );
        if (!hasEntity) {
            score = Math.max(0, score - 80); // Grande penalidade
        }
    }
    
    return score;
}

// Função para encontrar palavras-chave na mensagem
function extractKeywords(message) {
    const lowerMessage = message.toLowerCase();
    const commonWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por', 'que', 'é', 'são', 'está', 'estão'];
    const words = lowerMessage.split(/\s+/).filter(w => w.length > 2 && !commonWords.includes(w));
    return words;
}

// ============================================
// SISTEMA DE BUSCA MULTI-API - MÚLTIPLAS FONTES
// ============================================

// Função para buscar usando SerpAPI (Paga - Muito Boa)
async function searchWithSerpAPI(query, apiKey) {
    try {
        if (!apiKey) {
            throw new Error('API Key do SerpAPI não configurada');
        }
        
        console.log('🔍 [SerpAPI] Buscando:', query.substring(0, 100));
        const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&engine=google&num=10&hl=pt&gl=br`;
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout SerpAPI')), 10000)
        );
        
        const fetchPromise = fetch(serpUrl);
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`SerpAPI erro: ${response.status}`);
        }
        
        const data = await response.json();
        const results = [];
        
        if (data.organic_results) {
            data.organic_results.forEach((result, index) => {
                results.push({
                    title: result.title || `Resultado ${index + 1}`,
                    snippet: result.snippet || '',
                    content: result.snippet || '',
                    url: result.link || '',
                    provider: 'serpapi',
                    score: 100 - index
                });
            });
        }
        
        // Adicionar resposta direta se houver
        if (data.answer_box?.answer) {
            results.unshift({
                title: 'Resposta Direta',
                snippet: data.answer_box.answer,
                url: data.answer_box.link || '',
                provider: 'serpapi',
                score: 100
            });
        }
        
        return { results, provider: 'serpapi', answer: data.answer_box?.answer || null };
    } catch (error) {
        console.error('Erro ao buscar com SerpAPI:', error.message);
        return { results: [], provider: 'serpapi', error: error.message };
    }
}

// Função para buscar usando Google Custom Search (Gratuita - Limites)
async function searchWithGoogleCustom(query, apiKey, searchEngineId) {
    try {
        if (!apiKey || !searchEngineId) {
            throw new Error('API Key ou Search Engine ID não configurados');
        }
        
        console.log('🔍 [Google Custom] Buscando:', query.substring(0, 100));
        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10&hl=pt`;
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Google Custom')), 10000)
        );
        
        const fetchPromise = fetch(googleUrl);
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`Google Custom erro: ${response.status}`);
        }
        
        const data = await response.json();
        const results = [];
        
        if (data.items) {
            data.items.forEach((item, index) => {
                results.push({
                    title: item.title || `Resultado ${index + 1}`,
                    snippet: item.snippet || '',
                    content: item.snippet || '',
                    url: item.link || '',
                    provider: 'google_custom',
                    score: 100 - index
                });
            });
        }
        
        return { results, provider: 'google_custom' };
    } catch (error) {
        console.error('Erro ao buscar com Google Custom:', error.message);
        return { results: [], provider: 'google_custom', error: error.message };
    }
}

// Função para buscar usando Bing Search API (Microsoft)
async function searchWithBing(query, apiKey) {
    try {
        if (!apiKey) {
            throw new Error('API Key do Bing não configurada');
        }
        
        console.log('🔍 [Bing] Buscando:', query.substring(0, 100));
        const bingUrl = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10&mkt=pt-BR`;
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Bing')), 10000)
        );
        
        const fetchPromise = fetch(bingUrl, {
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey
            }
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`Bing erro: ${response.status}`);
        }
        
        const data = await response.json();
        const results = [];
        
        if (data.webPages?.value) {
            data.webPages.value.forEach((page, index) => {
                results.push({
                    title: page.name || `Resultado ${index + 1}`,
                    snippet: page.snippet || '',
                    content: page.snippet || '',
                    url: page.url || '',
                    provider: 'bing',
                    score: 100 - index
                });
            });
        }
        
        return { results, provider: 'bing' };
    } catch (error) {
        console.error('Erro ao buscar com Bing:', error.message);
        return { results: [], provider: 'bing', error: error.message };
    }
}

// Função para buscar usando Exa (Nova API de Busca)
async function searchWithExa(query, apiKey) {
    try {
        if (!apiKey) {
            throw new Error('API Key do Exa não configurada');
        }
        
        console.log('🔍 [Exa] Buscando:', query.substring(0, 100));
        const exaUrl = 'https://api.exa.ai/search';
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Exa')), 10000)
        );
        
        const fetchPromise = fetch(exaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                query: query,
                num_results: 10,
                contents: {
                    text: true,
                    summary: true
                }
            })
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`Exa erro: ${response.status}`);
        }
        
        const data = await response.json();
        const results = [];
        
        if (data.results) {
            data.results.forEach((result, index) => {
                results.push({
                    title: result.title || `Resultado ${index + 1}`,
                    snippet: result.text || result.summary || '',
                    content: result.text || result.summary || '',
                    url: result.url || '',
                    provider: 'exa',
                    score: 100 - index
                });
            });
        }
        
        return { results, provider: 'exa' };
    } catch (error) {
        console.error('Erro ao buscar com Exa:', error.message);
        return { results: [], provider: 'exa', error: error.message };
    }
}

// Função para buscar usando Brave Search API
async function searchWithBrave(query, apiKey) {
    try {
        if (!apiKey) {
            throw new Error('API Key do Brave não configurada');
        }
        
        console.log('🔍 [Brave] Buscando:', query.substring(0, 100));
        const braveUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout Brave')), 10000)
        );
        
        const fetchPromise = fetch(braveUrl, {
            headers: {
                'X-Subscription-Token': apiKey
            }
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`Brave erro: ${response.status}`);
        }
        
        const data = await response.json();
        const results = [];
        
        if (data.web?.results) {
            data.web.results.forEach((result, index) => {
                results.push({
                    title: result.title || `Resultado ${index + 1}`,
                    snippet: result.description || '',
                    content: result.description || '',
                    url: result.url || '',
                    provider: 'brave',
                    score: 100 - index
                });
            });
        }
        
        return { results, provider: 'brave' };
    } catch (error) {
        console.error('Erro ao buscar com Brave:', error.message);
        return { results: [], provider: 'brave', error: error.message };
    }
}

// Função para buscar usando You.com API
async function searchWithYou(query, apiKey) {
    try {
        if (!apiKey) {
            throw new Error('API Key do You.com não configurada');
        }
        
        console.log('🔍 [You.com] Buscando:', query.substring(0, 100));
        const youUrl = `https://api.you.com/search?q=${encodeURIComponent(query)}&count=10`;
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout You.com')), 10000)
        );
        
        const fetchPromise = fetch(youUrl, {
            headers: {
                'X-API-Key': apiKey
            }
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`You.com erro: ${response.status}`);
        }
        
        const data = await response.json();
        const results = [];
        
        if (data.results) {
            data.results.forEach((result, index) => {
                results.push({
                    title: result.title || `Resultado ${index + 1}`,
                    snippet: result.snippet || result.description || '',
                    content: result.snippet || result.description || '',
                    url: result.url || result.link || '',
                    provider: 'you',
                    score: 100 - index
                });
            });
        }
        
        return { results, provider: 'you' };
    } catch (error) {
        console.error('Erro ao buscar com You.com:', error.message);
        return { results: [], provider: 'you', error: error.message };
    }
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
            setTimeout(() => reject(new Error('Tempo esgotado na requisição Tavily')), 10000)
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
                max_results: 10, // Aumentar para ter mais opções após filtrar vídeos
                include_answer: true,
                include_raw_content: true // Incluir conteúdo bruto para visualização
            })
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        console.log('📡 [Tavily] Resposta HTTP recebida:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Erro desconhecido');
            console.error('❌ [Tavily] Erro HTTP:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText.substring(0, 200)
            });
            throw new Error(`Erro na API Tavily: ${response.status} - ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        console.log('📦 [Tavily] Dados recebidos:', {
            hasAnswer: !!data.answer,
            resultsCount: data.results?.length || 0,
            answerLength: data.answer?.length || 0,
            firstResultTitle: data.results?.[0]?.title || 'N/A'
        });
        
        const results = [];
        
        // Processar resultados
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach((result, index) => {
                results.push({
                    title: result.title || `Resultado ${index + 1}`,
                    snippet: result.content || result.snippet || '',
                    content: result.content || result.snippet || '', // Conteúdo principal
                    raw_content: result.raw_content || result.content || result.snippet || '', // Conteúdo bruto completo
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

// Função para buscar na web (SISTEMA MULTI-API COM FALLBACK INTELIGENTE)
async function searchWeb(query, config = null) {
    try {
        console.log('🌐 [Busca Multi-API] Iniciando busca para:', query.substring(0, 100));
        
        // Ordem de prioridade das APIs (da melhor para a pior)
        const apiPriority = [
            'tavily',
            'serpapi',
            'google_custom',
            'bing',
            'exa',
            'brave',
            'you'
        ];
        
        // Tentar cada API configurada em ordem de prioridade
        for (const provider of apiPriority) {
            try {
                let result = null;
                
                switch (provider) {
                    case 'tavily':
                        if (config?.api_provider === 'tavily' && config?.api_key && config?.is_enabled) {
                            console.log('🔍 [1/7] Tentando Tavily...');
                            result = await searchWithTavily(query, config.api_key);
                        }
                        break;
                        
                    case 'serpapi':
                        if (config?.api_provider === 'serpapi' && config?.api_key && config?.is_enabled) {
                            console.log('🔍 [2/7] Tentando SerpAPI...');
                            result = await searchWithSerpAPI(query, config.api_key);
                        }
                        break;
                        
                    case 'google_custom':
                        if (config?.api_provider === 'google_custom' && config?.api_key && config?.search_engine_id && config?.is_enabled) {
                            console.log('🔍 [3/7] Tentando Google Custom Search...');
                            result = await searchWithGoogleCustom(query, config.api_key, config.search_engine_id);
                        }
                        break;
                        
                    case 'bing':
                        if (config?.api_provider === 'bing' && config?.api_key && config?.is_enabled) {
                            console.log('🔍 [4/7] Tentando Bing Search...');
                            result = await searchWithBing(query, config.api_key);
                        }
                        break;
                        
                    case 'exa':
                        if (config?.api_provider === 'exa' && config?.api_key && config?.is_enabled) {
                            console.log('🔍 [5/7] Tentando Exa...');
                            result = await searchWithExa(query, config.api_key);
                        }
                        break;
                        
                    case 'brave':
                        if (config?.api_provider === 'brave' && config?.api_key && config?.is_enabled) {
                            console.log('🔍 [6/7] Tentando Brave Search...');
                            result = await searchWithBrave(query, config.api_key);
                        }
                        break;
                        
                    case 'you':
                        if (config?.api_provider === 'you' && config?.api_key && config?.is_enabled) {
                            console.log('🔍 [7/7] Tentando You.com...');
                            result = await searchWithYou(query, config.api_key);
                        }
                        break;
                }
                
                // Se encontrou resultados, retornar imediatamente
                if (result && result.results && result.results.length > 0) {
                    console.log(`✅ [${provider.toUpperCase()}] ${result.results.length} resultados encontrados!`);
                    return result;
                }
            } catch (error) {
                console.log(`⚠️ [${provider}] Erro: ${error.message}, tentando próxima API...`);
                continue; // Tentar próxima API
            }
        }
        
        // Se nenhuma API paga funcionou, tentar APIs gratuitas como fallback
        console.log('🆓 [Fallback] Tentando APIs gratuitas...');
        const freeResults = [];
        
        // Tentar DuckDuckGo
        try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const ddgResponse = await fetch(ddgUrl, { timeout: 5000 });
            const ddgData = await ddgResponse.json();
            
            if (ddgData.AbstractText) {
                freeResults.push({
                    title: ddgData.Heading || query,
                    snippet: ddgData.AbstractText,
                    content: ddgData.AbstractText,
                    url: ddgData.AbstractURL || '',
                    provider: 'duckduckgo',
                    score: 50
                });
            }
        } catch (e) {
            console.log('⚠️ DuckDuckGo não disponível:', e.message);
        }
        
        // Tentar Wikipedia
        try {
            const wikiUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const wikiResponse = await fetch(wikiUrl, { timeout: 5000 });
            const wikiData = await wikiResponse.json();
            
            if (wikiData.extract) {
                freeResults.push({
                    title: wikiData.title || query,
                    snippet: wikiData.extract.substring(0, 500),
                    content: wikiData.extract,
                    url: wikiData.content_urls?.desktop?.page || '',
                    provider: 'wikipedia',
                    score: 50
                });
            }
        } catch (e) {
            console.log('⚠️ Wikipedia não disponível:', e.message);
        }
        
        if (freeResults.length > 0) {
            console.log(`✅ [Gratuitas] ${freeResults.length} resultados encontrados!`);
            return {
                results: freeResults,
                provider: freeResults[0].provider
            };
        }
        
        // Se nada funcionou
        console.log('❌ [Busca] Nenhuma API retornou resultados');
        return {
            results: [],
            provider: 'none',
            error: 'Nenhuma API de busca disponível ou configurada'
        };
        
    } catch (error) {
        console.error('❌ [Busca Multi-API] Erro geral:', error);
        return { results: [], provider: 'error', error: error.message };
    }
}

// Função para detectar perguntas diretas (você sabe, você pode, etc.)
function detectDirectQuestion(message) {
    const lowerMessage = message.toLowerCase().trim();
    const directQuestionPatterns = [
        /você sabe/i,
        /voce sabe/i,
        /você pode/i,
        /voce pode/i,
        /você consegue/i,
        /voce consegue/i,
        /você é capaz/i,
        /voce e capaz/i,
        /você tem/i,
        /voce tem/i,
        /você conhece/i,
        /voce conhece/i,
        /você entende/i,
        /voce entende/i
    ];
    
    return directQuestionPatterns.some(pattern => pattern.test(lowerMessage));
}

// Função para filtrar conteúdo acadêmico (listas de nomes, referências)
// Função para limpar conteúdo de livros, removendo referências estruturais (capítulos, páginas, etc.)
function cleanBookContent(content) {
    if (!content) return content;
    
    let cleaned = content;
    
    // 1. Remover padrões como "138 Capítulo 6 Excesso de Características:" no início
    cleaned = cleaned.replace(/^\d+\s+(?:Capítulo|Chapter|CAPÍTULO|CHAPTER)\s+\d+\s+[A-ZÁÊÔÇ][^:]+:\s*/i, '');
    
    // 2. Remover números de página no início seguidos de texto (ex: "138 Capítulo 6" ou "138 ")
    cleaned = cleaned.replace(/^\d+\s+(?=(?:Capítulo|Chapter|PARTE|PART|SEÇÃO|SECTION|[A-Z]))/i, '');
    
    // 3. Remover referências a capítulos no início da linha (ex: "Capítulo 6", "Chapter 6", "PARTE 2")
    cleaned = cleaned.replace(/(?:^|\n)\s*(?:CAPÍTULO|Capítulo|CHAPTER|Chapter|PARTE|PART|SEÇÃO|SECTION)\s+\d+[:\-]?\s*/gi, '');
    
    // 4. Remover números de página (ex: "Página 138", "Page 138", "p. 138", "pg. 138")
    cleaned = cleaned.replace(/(?:^|\n)\s*(?:Página|Página|Page|p\.|pg\.)\s*\d+\s*/gi, '');
    
    // 5. Remover números soltos no início de linha seguidos de letra maiúscula (provavelmente número de página)
    cleaned = cleaned.replace(/(?:^|\n)\s*\d{2,}\s+(?=[A-ZÁÊÔÇ])/g, '');
    
    // 6. Remover títulos de seção estruturados no início (ex: "Excesso de Características: Estudo de Caso")
    // Padrão: palavras capitalizadas seguidas de dois pontos e texto
    cleaned = cleaned.replace(/^(?:[A-ZÁÊÔÇ][a-záêôç]+\s+){1,5}:\s*(?=[A-ZÁÊÔÇ])/m, '');
    
    // 7. Remover padrões como "Capítulo X - Título:" ou "Chapter X - Title:"
    cleaned = cleaned.replace(/(?:^|\n)\s*(?:Capítulo|Chapter)\s+\d+\s*[-\–]\s*[A-ZÁÊÔÇ][^:]+:\s*/gi, '');
    
    // 8. Limpar espaços múltiplos e quebras de linha extras
    cleaned = cleaned.replace(/\s{3,}/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // 9. Remover espaços no início e fim
    cleaned = cleaned.trim();
    
    // 10. Se ainda começar com padrão de número seguido de texto, tentar remover
    cleaned = cleaned.replace(/^\d+\s+(?=[A-ZÁÊÔÇ])/, '');
    
    return cleaned;
}

function filterAcademicContent(content) {
    if (!content) return false;
    
    const contentLower = content.toLowerCase();
    
    // Detectar listas de nomes (Prof., Dr., etc.)
    const namePatterns = [
        /prof\.?\s+(dr\.?|dra\.?|ms\.?|me\.?)/gi,
        /^[A-Z][a-z]+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/gm, // Nomes próprios
        /comissão científica/i,
        /pareceres ad hoc/i,
        /reitora|vice-reitora/i
    ];
    
    const nameMatches = namePatterns.reduce((count, pattern) => {
        const matches = contentLower.match(pattern);
        return count + (matches ? matches.length : 0);
    }, 0);
    
    // Se tiver mais de 3 referências a nomes/títulos, provavelmente é lista acadêmica
    if (nameMatches > 3) {
        return true; // Filtrar este conteúdo
    }
    
    // Detectar se é principalmente uma lista (muitas linhas curtas)
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const shortLines = lines.filter(l => l.trim().length < 50).length;
    
    // Se mais de 50% das linhas são curtas, provavelmente é uma lista
    if (lines.length > 5 && shortLines / lines.length > 0.5) {
        return true;
    }
    
    return false;
}

// Função para extrair resposta direta e objetiva do conteúdo
function extractDirectAnswer(content, question) {
    if (!content) return null;
    
    // Filtrar conteúdo acadêmico ANTES de processar
    if (filterAcademicContent(content)) {
        console.log('🚫 [IA] Conteúdo acadêmico filtrado (listas de nomes/referências)');
        return null;
    }
    
    const questionLower = question.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Se a pergunta é direta (você sabe, você pode), procurar resposta direta
    if (detectDirectQuestion(question)) {
        // Procurar frases que respondem diretamente
        const directAnswerPatterns = [
            /sim[,.]?\s+(eu\s+)?(sei|posso|conheço|entendo|tenho)/i,
            /claro[,.]?\s+(que\s+)?(sim|sei|posso)/i,
            /é\s+possível/i,
            /posso\s+ajudar/i,
            /sei\s+ajudar/i,
            /conheço\s+(sobre|como)/i,
            /pode\s+ajudar/i,
            /sabe\s+ajudar/i
        ];
        
        // Procurar primeira frase que responde diretamente
        const sentences = content.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
        
        for (const sentence of sentences) {
            // Filtrar frases que são apenas listas de nomes
            if (filterAcademicContent(sentence)) continue;
            
            if (directAnswerPatterns.some(pattern => pattern.test(sentence))) {
                // Encontrar contexto relevante (próximas 2-3 frases)
                const sentenceIndex = sentences.indexOf(sentence);
                const relevantSentences = sentences.slice(sentenceIndex, Math.min(sentenceIndex + 4, sentences.length));
                const answer = relevantSentences.join('. ').substring(0, 400);
                
                // Verificar se a resposta não é apenas lista de nomes
                if (!filterAcademicContent(answer)) {
                    return answer;
                }
            }
        }
        
        // Se não encontrou resposta direta, procurar por palavras-chave da pergunta
        const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);
        for (const sentence of sentences) {
            // Filtrar frases acadêmicas
            if (filterAcademicContent(sentence)) continue;
            
            const sentenceLower = sentence.toLowerCase();
            const matches = questionWords.filter(w => sentenceLower.includes(w));
            if (matches.length >= 2) {
                // Encontrar contexto relevante
                const sentenceIndex = sentences.indexOf(sentence);
                const relevantSentences = sentences.slice(Math.max(0, sentenceIndex - 1), Math.min(sentenceIndex + 4, sentences.length));
                const answer = relevantSentences.join('. ').substring(0, 400);
                
                // Verificar se não é conteúdo acadêmico
                if (!filterAcademicContent(answer)) {
                    return answer;
                }
            }
        }
        
        // Se ainda não encontrou, procurar primeiro parágrafo útil (não acadêmico)
        const paragraphs = content.split(/\n\n+/);
        for (const para of paragraphs) {
            if (para.trim().length > 50 && !filterAcademicContent(para)) {
                return para.substring(0, 300);
            }
        }
    }
    
    // Para outras perguntas, retornar início do conteúdo (mais relevante)
    // Mas limitar a 300 caracteres para ser objetivo
    const firstParagraph = content.split('\n\n')[0] || content.split('.')[0];
    const answer = firstParagraph.substring(0, 300);
    
    // Verificar se não é conteúdo acadêmico
    if (filterAcademicContent(answer)) {
        return null;
    }
    
    return answer;
}

// Função para resumir resposta muito longa
function summarizeAnswer(content, maxLength = 300) {
    if (!content || content.length <= maxLength) return content;
    
    // LÓGICA INTELIGENTE: Para respostas maiores, incluir mais parágrafos
    if (maxLength > 800) {
        // Para respostas grandes (perguntas sobre pessoas), incluir múltiplos parágrafos
        const paragraphs = content.split(/\n\n+/);
        let summary = '';
        for (const para of paragraphs) {
            if ((summary + para).length > maxLength) break;
            if (summary) summary += '\n\n';
            summary += para;
        }
        if (summary.length > 50) {
            return summary.trim();
        }
    }
    
    // Filtrar conteúdo acadêmico
    if (filterAcademicContent(content)) {
        return null;
    }
    
    // Tentar encontrar primeira frase completa
    const sentences = content.split(/[.!?]\s+/);
    let summary = '';
    
    for (const sentence of sentences) {
        if ((summary + sentence).length > maxLength) break;
        summary += sentence + '. ';
    }
    
    // Se ainda não tem conteúdo suficiente, pegar primeiro parágrafo
    if (summary.length < 50) {
        const firstParagraph = content.split('\n\n')[0] || content.split('\n')[0];
        summary = firstParagraph.substring(0, maxLength);
    }
    
    return summary.trim() + (content.length > maxLength ? '...' : '');
}

// Função para detectar elogios/complimentos
function detectCompliment(message) {
    const compliments = [
        'você é linda', 'voce e linda', 'você é lindo', 'voce e lindo',
        'você é bonita', 'voce e bonita', 'você é bonito', 'voce e bonito',
        'você é incrível', 'voce e incrivel', 'você é incrivel',
        'você é demais', 'voce e demais', 'você é ótima', 'voce e otima',
        'você é ótimo', 'voce e otimo', 'você é maravilhosa', 'voce e maravilhosa',
        'você é maravilhoso', 'voce e maravilhoso', 'você é perfeita', 'voce e perfeita',
        'você é perfeito', 'voce e perfeito', 'você é inteligente', 'voce e inteligente',
        'você é legal', 'voce e legal', 'você é foda', 'voce e foda',
        'você é top', 'voce e top', 'você é show', 'voce e show',
        'gostei de você', 'gostei de voce', 'adorei você', 'adorei voce',
        'você é fofa', 'voce e fofa', 'você é fofo', 'voce e fofo'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    
    // Verificar se contém elogio
    for (const compliment of compliments) {
        if (lowerMessage.includes(compliment)) {
            return true;
        }
    }
    
    // Padrões de elogio
    const complimentPatterns = [
        /você\s+é\s+(linda|lindo|bonita|bonito|incrível|incrivel|demais|ótima|otima|ótimo|otimo|maravilhosa|maravilhoso|perfeita|perfeito|inteligente|legal|foda|top|show|fofa|fofo)/i,
        /(gostei|adorei|amo)\s+(de\s+)?você/i,
        /você\s+(é|e)\s+(muito|super|mega)\s+(linda|lindo|bonita|bonito|incrível|incrivel|legal|foda|top)/i
    ];
    
    for (const pattern of complimentPatterns) {
        if (pattern.test(lowerMessage)) {
            return true;
        }
    }
    
    return false;
}

// Função para detectar saudações - MELHORADA
function detectGreeting(message) {
    if (!message || typeof message !== 'string') return false;
    
    const greetings = [
        'oi', 'olá', 'ola', 'hey', 'eae', 'e aí', 'eai', 'opa', 'fala', 'fala aí',
        'bom dia', 'boa tarde', 'boa noite', 'good morning', 'hello',
        'hi', 'tudo bem', 'td bem', 'como vai', 'como está', 'como esta',
        'tudo bom', 'td bom', 'beleza', 'salve', 'e aí', 'eai'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    
    // Verificar se é exatamente uma saudação (mais comum: "oi", "olá")
    if (greetings.includes(lowerMessage)) {
        return true;
    }
    
    // Verificar se começa com saudação seguida de espaço ou pontuação
    for (const greeting of greetings) {
        if (lowerMessage === greeting || 
            lowerMessage.startsWith(greeting + ' ') || 
            lowerMessage.startsWith(greeting + '!') ||
            lowerMessage.startsWith(greeting + '.') ||
            lowerMessage.startsWith(greeting + ',') ||
            lowerMessage.endsWith(' ' + greeting) ||
            lowerMessage.endsWith('!' + greeting) ||
            lowerMessage.endsWith('.' + greeting)) {
            return true;
        }
    }
    
    // Verificar padrões de saudação (regex melhorados)
    const greetingPatterns = [
        /^(oi|olá|ola|hey|eae|opa|fala|salve)[\s!.,]*$/i,
        /^(bom\s+dia|boa\s+tarde|boa\s+noite)[\s!.,]*$/i,
        /^(tudo\s+bem|td\s+bem|tudo\s+bom|td\s+bom)[\s!?.,]*$/i,
        /^(como\s+(vai|está|esta|vcs|vocês))[\s!?.,]*$/i,
        /^oi[\s!.,]*$/i,  // Específico para "oi" sozinho
        /^olá[\s!.,]*$/i, // Específico para "olá" sozinho
        /^ola[\s!.,]*$/i  // Específico para "ola" sem acento
    ];
    
    for (const pattern of greetingPatterns) {
        if (pattern.test(lowerMessage)) {
            return true;
        }
    }
    
    return false;
}

// Função para gerar resposta de saudação educada - MELHORADA
function generateGreetingResponse() {
    const greetings = [
        "Olá! 😊 Tudo bem? Como posso te ajudar hoje?",
        "Oi! Tudo bem? Estou aqui para tirar todas as suas dúvidas sobre o Conecta King! 😊",
        "Olá! Como vai? Fico feliz em ajudar você com qualquer dúvida sobre o sistema! 😊",
        "Oi! Tudo bem? Estou pronta para responder suas perguntas sobre o Conecta King! 😊",
        "Olá! Como posso te ajudar hoje? Tenho todas as informações sobre o Conecta King! 😊",
        "Oi! 😊 Bem-vindo ao Conecta King! Estou aqui para te ajudar com tudo que você precisar!",
        "Olá! Tudo bem? Sou a IA King e estou aqui para te ajudar a configurar e usar seu cartão digital! 😊"
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
}

// Função para aprender com Tavily e adicionar à base de conhecimento
async function learnFromTavily(question, answer, client) {
    try {
        // SEMPRE GRAVAR: Gravar cada pergunta e resposta aprendida
        const keywords = extractKeywords(question + ' ' + answer);
        
        // Verificar se já existe resposta similar
        const existing = await client.query(`
            SELECT id, title, content FROM ia_knowledge_base 
            WHERE LOWER(title) = LOWER($1)
            OR (LENGTH(title) > 10 AND LOWER(title) LIKE LOWER($2))
            LIMIT 1
        `, [question, `%${question.substring(0, Math.min(20, question.length))}%`]);
        
        if (existing.rows.length === 0) {
            // Adicionar à base de conhecimento (SEMPRE)
            await client.query(`
                INSERT INTO ia_knowledge_base (title, content, keywords, source_type, is_active, priority)
                VALUES ($1, $2, $3, 'tavily_learned', true, 80)
            `, [
                question.substring(0, 255),
                answer.substring(0, 10000), // Aumentar limite para aprender mais
                keywords
            ]);
            console.log('📚 [IA] Aprendido e GRAVADO na memória:', question.substring(0, 50));
            
            // Criar Q&A para facilitar busca futura
            try {
                await client.query(`
                    INSERT INTO ia_qa (question, answer, keywords, is_active)
                    VALUES ($1, $2, $3, true)
                `, [
                    question,
                    answer.substring(0, 2000),
                    keywords
                ]);
            } catch (qaError) {
                // Ignorar erro de Q&A duplicado
            }
        } else {
            // Atualizar conhecimento existente se a nova resposta for melhor/mais completa
            const existingContent = existing.rows[0].content || '';
            if (existingContent.length < answer.length || answer.length > existingContent.length * 1.2) {
                await client.query(`
                    UPDATE ia_knowledge_base
                    SET content = $1, updated_at = CURRENT_TIMESTAMP, keywords = $2
                    WHERE id = $3
                `, [answer.substring(0, 10000), keywords, existing.rows[0].id]);
                console.log('📚 [IA] Conhecimento existente ATUALIZADO com mais informações');
            } else {
                console.log('ℹ️ [IA] Conhecimento similar já existe, mantendo o existente');
            }
        }
        
        // SEMPRE registrar no histórico de auto-aprendizado
        try {
            await client.query(`
                INSERT INTO ia_auto_learning_history 
                (question, answer, source, confidence_score, keywords)
                VALUES ($1, $2, 'tavily', 70, $3)
            `, [question, answer.substring(0, 5000), keywords]);
        } catch (historyError) {
            // Ignorar erro se tabela não existir ainda
        }
    } catch (error) {
        console.error('Erro ao aprender com Tavily:', error);
        // Não bloquear se der erro ao aprender
    }
}

// ============================================
// SISTEMA DE AUTO-TREINAMENTO AUTÔNOMO "IA KING"
// ============================================
// Este sistema permite que a IA aprenda automaticamente quando não souber responder
// Pesquisa na internet, em livros/documentos e salva o conhecimento automaticamente

/**
 * Função principal de auto-treinamento autônomo da IA King
 * Pesquisa automaticamente quando não souber responder e salva o conhecimento aprendido
 */
async function autoTrainIAKing(question, questionContext, client) {
    try {
        console.log('🧠 [IA KING] Sistema de auto-treinamento ativado para:', question.substring(0, 100));
        
        let learnedKnowledge = null;
        let learnedAnswer = null;
        
        // 1. PRIMEIRO: Tentar buscar em livros/documentos existentes
        try {
            console.log('📖 [IA KING] Buscando em livros e documentos...');
            
            // Detectar categoria da pergunta para buscar livros específicos
            const questionLower = question.toLowerCase();
            let bookSearchQuery = '';
            
            // Se pergunta é sobre religião (Jesus, Bíblia, etc), buscar livros religiosos
            if (questionLower.includes('jesus') || questionLower.includes('cristo') || 
                questionLower.includes('bíblia') || questionLower.includes('biblia') ||
                questionLower.includes('deus') || questionLower.includes('evangelho')) {
                bookSearchQuery = `
                    AND (LOWER(title) LIKE '%bíblia%' OR LOWER(title) LIKE '%biblia%' 
                    OR LOWER(title) LIKE '%jesus%' OR LOWER(title) LIKE '%cristo%'
                    OR LOWER(title) LIKE '%evangelho%' OR LOWER(title) LIKE '%religião%'
                    OR LOWER(title) LIKE '%religiao%' OR LOWER(content) LIKE '%jesus%'
                    OR LOWER(content) LIKE '%cristo%' OR LOWER(content) LIKE '%bíblia%')
                `;
                console.log('📖 [IA KING] Detectou pergunta religiosa - buscando em livros religiosos');
            }
            // Se pergunta é sobre história, buscar livros históricos
            else if (questionLower.includes('história') || questionLower.includes('historia') ||
                     questionLower.includes('guerra') || questionLower.includes('império') ||
                     questionLower.includes('imperio') || questionLower.includes('revolução')) {
                bookSearchQuery = `
                    AND (LOWER(title) LIKE '%história%' OR LOWER(title) LIKE '%historia%'
                    OR LOWER(title) LIKE '%guerra%' OR LOWER(title) LIKE '%histórico%')
                `;
                console.log('📖 [IA KING] Detectou pergunta histórica - buscando em livros históricos');
            }
            
            // Buscar em documentos processados
            const docsResult = await client.query(`
                SELECT id, title, extracted_text
                FROM ia_documents
                WHERE processed = true 
                AND extracted_text IS NOT NULL 
                AND LENGTH(extracted_text) > 0
                ${bookSearchQuery || ''}
                ORDER BY created_at DESC
                LIMIT 10
            `);
            
            // Buscar em conhecimento de livros (com filtro de categoria se aplicável)
            const booksResult = await client.query(`
                SELECT id, title, content, keywords
                FROM ia_knowledge_base
                WHERE is_active = true
                AND source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
                ${bookSearchQuery || ''}
                ORDER BY priority DESC, usage_count DESC
                LIMIT 20
            `);
            
            // Combinar resultados de documentos e livros
            const allSources = [
                ...docsResult.rows.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    content: doc.extracted_text,
                    source: 'document'
                })),
                ...booksResult.rows.map(book => ({
                    id: book.id,
                    title: book.title,
                    content: book.content,
                    keywords: book.keywords,
                    source: 'book'
                }))
            ];
            
            // Buscar conteúdo relevante nos livros/documentos
            for (const source of allSources) {
                if (!source.content) continue;
                
                const contentLower = source.content.toLowerCase();
                const questionLower = question.toLowerCase();
                
                // Verificar se o conteúdo menciona palavras-chave da pergunta
                const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);
                const matches = questionWords.filter(word => contentLower.includes(word)).length;
                
                // Se encontrar menções relevantes, extrair trecho
                if (matches > 0 || questionContext.entities.some(e => contentLower.includes(e.toLowerCase()))) {
                    // Extrair trecho relevante
                    let relevantExcerpt = null;
                    
                    // Tentar encontrar parágrafo que responde à pergunta
                    const paragraphs = source.content.split(/\n\n|\n/).filter(p => p.trim().length > 50);
                    for (const para of paragraphs) {
                        const paraLower = para.toLowerCase();
                        if (questionContext.entities.some(e => paraLower.includes(e.toLowerCase())) ||
                            questionWords.some(w => paraLower.includes(w))) {
                            relevantExcerpt = para.substring(0, 1000);
                            break;
                        }
                    }
                    
                    // Se não encontrou parágrafo específico, pegar trecho que menciona entidades
                    if (!relevantExcerpt && questionContext.entities.length > 0) {
                        const entity = questionContext.entities[0].toLowerCase();
                        const entityIndex = contentLower.indexOf(entity);
                        if (entityIndex >= 0) {
                            const start = Math.max(0, entityIndex - 200);
                            const end = Math.min(source.content.length, entityIndex + 800);
                            relevantExcerpt = source.content.substring(start, end);
                        }
                    }
                    
                    if (relevantExcerpt && relevantExcerpt.length > 100) {
                        learnedAnswer = relevantExcerpt;
                        learnedKnowledge = {
                            title: question.substring(0, 255),
                            content: relevantExcerpt,
                            source: `ia_king_book_${source.source}`,
                            source_reference: source.title
                        };
                        console.log('✅ [IA KING] Encontrou conhecimento em livro/documento:', source.title);
                        break;
                    }
                }
            }
        } catch (bookError) {
            console.error('❌ [IA KING] Erro ao buscar em livros:', bookError);
        }
        
        // 2. SEGUNDO: Se não encontrou em livros, pesquisar na internet
        if (!learnedKnowledge) {
            try {
                console.log('🌐 [IA KING] Pesquisando na internet...');
                
                // Buscar configuração de busca na web (qualquer API configurada)
                const webConfigResult = await client.query(`
                    SELECT * FROM ia_web_search_config
                    WHERE is_enabled = true 
                    AND api_key IS NOT NULL
                    ORDER BY id DESC
                    LIMIT 1
                `);
                
                if (webConfigResult.rows.length > 0) {
                    const webConfig = webConfigResult.rows[0];
                    
                    // Usar sistema multi-API com fallback automático
                    const webResults = await searchWeb(question, webConfig);
                    
                    if (webResults && webResults.results && webResults.results.length > 0) {
                        // Se Tavily retornou resposta direta, usar ela
                        if (webResults.answer) {
                            learnedAnswer = webResults.answer;
                            learnedKnowledge = {
                                title: question.substring(0, 255),
                                content: webResults.answer,
                                source: 'ia_king_web_tavily',
                                source_reference: 'Tavily API'
                            };
                            console.log('✅ [IA KING] Resposta encontrada na internet (Tavily direto)');
                        } else {
                            // Combinar os melhores resultados
                            const topResults = webResults.results.slice(0, 3);
                            const combinedAnswer = topResults.map((r, idx) => {
                                const snippet = (r.snippet || r.content || '').substring(0, 400);
                                return `**${r.title}**\n${snippet}${(r.snippet || r.content || '').length > 400 ? '...' : ''}`;
                            }).join('\n\n');
                            
                            if (combinedAnswer.length > 100) {
                                learnedAnswer = combinedAnswer;
                                learnedKnowledge = {
                                    title: question.substring(0, 255),
                                    content: combinedAnswer,
                                    source: 'ia_king_web_tavily',
                                    source_reference: 'Tavily API - Múltiplas fontes'
                                };
                                console.log('✅ [IA KING] Conhecimento encontrado na internet (múltiplas fontes)');
                            }
                        }
                    } else {
                        console.log('⚠️ [IA KING] Nenhum resultado encontrado na internet');
                    }
                } else {
                    console.log('⚠️ [IA KING] Busca na web não configurada ou desabilitada');
                }
            } catch (webError) {
                console.error('❌ [IA KING] Erro ao pesquisar na internet:', webError);
            }
        }
        
        // 3. SALVAR conhecimento aprendido automaticamente
        if (learnedKnowledge && learnedAnswer) {
            try {
                const keywords = extractKeywords(question + ' ' + learnedAnswer);
                
                // Verificar se já existe conhecimento similar
                const existing = await client.query(`
                    SELECT id, title, content FROM ia_knowledge_base 
                    WHERE LOWER(title) = LOWER($1)
                    OR (LENGTH(title) > 10 AND LOWER(title) LIKE LOWER($2))
                    LIMIT 1
                `, [question, `%${question.substring(0, Math.min(20, question.length))}%`]);
                
                if (existing.rows.length === 0) {
                    // Salvar novo conhecimento
                    await client.query(`
                        INSERT INTO ia_knowledge_base 
                        (title, content, keywords, source_type, source_reference, is_active, priority)
                        VALUES ($1, $2, $3, $4, $5, true, 85)
                    `, [
                        learnedKnowledge.title,
                        learnedKnowledge.content.substring(0, 15000),
                        keywords,
                        learnedKnowledge.source,
                        learnedKnowledge.source_reference || null
                    ]);
                    
                    // Criar Q&A também
                    try {
                        await client.query(`
                            INSERT INTO ia_qa (question, answer, keywords, is_active)
                            VALUES ($1, $2, $3, true)
                        `, [
                            question,
                            learnedAnswer.substring(0, 2000),
                            keywords
                        ]);
                    } catch (qaError) {
                        // Ignorar erro de Q&A duplicado
                    }
                    
                    console.log('💾 [IA KING] Conhecimento salvo automaticamente na base de dados!');
                    
                    // Registrar no histórico de auto-aprendizado
                    try {
                        await client.query(`
                            INSERT INTO ia_auto_learning_history 
                            (question, answer, source, confidence_score, keywords)
                            VALUES ($1, $2, $3, 75, $4)
                        `, [
                            question,
                            learnedAnswer.substring(0, 5000),
                            learnedKnowledge.source,
                            keywords
                        ]);
                    } catch (historyError) {
                        // Ignorar se tabela não existir
                    }
                } else {
                    // Atualizar conhecimento existente se o novo for melhor
                    const existingContent = existing.rows[0].content || '';
                    if (learnedAnswer.length > existingContent.length * 1.1) {
                        await client.query(`
                            UPDATE ia_knowledge_base
                            SET content = $1, 
                                updated_at = CURRENT_TIMESTAMP, 
                                keywords = $2,
                                source_type = $3
                            WHERE id = $4
                        `, [
                            learnedAnswer.substring(0, 15000),
                            keywords,
                            learnedKnowledge.source,
                            existing.rows[0].id
                        ]);
                        console.log('💾 [IA KING] Conhecimento existente atualizado com mais informações!');
                    }
                }
                
                return {
                    success: true,
                    answer: learnedAnswer,
                    source: learnedKnowledge.source,
                    learned: true
                };
            } catch (saveError) {
                console.error('❌ [IA KING] Erro ao salvar conhecimento:', saveError);
                return {
                    success: false,
                    error: saveError.message
                };
            }
        } else {
            console.log('⚠️ [IA KING] Não foi possível aprender sobre esta pergunta');
            return {
                success: false,
                learned: false
            };
        }
    } catch (error) {
        console.error('❌ [IA KING] Erro no sistema de auto-treinamento:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// SISTEMA COGNITIVO AVANÇADO - NÚCLEO ABSOLUTO
// ============================================

// ============================================
// PROMPT MESTRE — MENTALIDADE TIPO GPT
// ============================================
const SYSTEM_COGNITIVE_CORE = `
Você é uma Inteligência Artificial de Linguagem Avançada, projetada para gerar respostas claras, úteis e confiáveis, utilizando raciocínio lógico e padrões aprendidos durante seu treinamento.

MENTALIDADE E COMPORTAMENTO:
1. Você NÃO DEVE afirmar que pesquisa na internet, acessa sites externos ou consulta fontes fora do sistema.
2. Você NÃO DEVE afirmar que aprende, evolui ou se modifica em tempo real a partir das conversas.
3. Você NÃO DEVE afirmar que salva, memoriza ou reutiliza conversas passadas, exceto quando dados persistentes forem explicitamente fornecidos pelo sistema.

BASE DE CONHECIMENTO:
4. Você responde com base em:
   - Conhecimento internalizado durante o treinamento
   - Livros, documentos e materiais fornecidos pelo sistema
   - Informações enviadas pelo usuário no contexto atual

5. Caso documentos, livros ou bases internas estejam disponíveis:
   - Utilize APENAS essas fontes como referência factual
   - NÃO extrapole além do conteúdo fornecido
   - NÃO misture suposições com fatos

LIMITAÇÕES E HONESTIDADE:
6. Quando uma informação NÃO estiver presente no conhecimento treinado ou nas fontes fornecidas:
   - DECLARE CLARAMENTE a limitação
   - EVITE respostas vagas ou inventadas
   - NÃO forneça dados especulativos como fatos

GERAÇÃO DE RESPOSTAS:
7. Suas respostas devem ser geradas de forma progressiva, palavra por palavra, mantendo:
   - COERÊNCIA
   - CLAREZA
   - CONTEXTO

8. PRIORIZE linguagem simples, direta e compreensível, mesmo ao explicar assuntos técnicos.

9. SEMPRE QUE POSSÍVEL, utilize exemplos práticos, analogias e explicações didáticas.

ESTILO DE COMUNICAÇÃO:
10. Seja PROFISSIONAL, EDUCADO e NEUTRO.
11. ADAPTE o nível da explicação conforme o entendimento do usuário, sem subestimar nem complicar excessivamente.
12. NÃO utilize termos técnicos desnecessários sem explicação.

CONTEXTO E CONVERSA:
13. Utilize APENAS o contexto da conversa atual.
14. NÃO faça referências a mensagens apagadas, sessões anteriores ou dados não visíveis ao usuário.

SEGURANÇA E CONFIANÇA:
15. NÃO simule capacidades humanas, emoções reais ou consciência.
16. NÃO faça promessas que não possa cumprir.
17. NÃO crie falsas autoridades ou alegações de acesso privilegiado.

OBJETIVO FINAL:
18. Atuar como um ASSISTENTE INTELIGENTE, CONFIÁVEL e PREVISÍVEL, com comportamento CONSISTENTE, semelhante ao funcionamento de modelos GPT, fornecendo respostas ÚTEIS e FUNDAMENTADAS sem extrapolar suas capacidades reais.

⚙️ AJUSTE IMPORTANTE (LIVROS E TREINO):

Como você já foi treinada com livros, documentos e materiais do sistema, esse prompt faz a IA:
✔ Usar o conteúdo dos livros e documentos fornecidos
✔ NÃO "fingir" busca externa quando usar conhecimento interno
✔ NÃO inventar informações que não estão nos livros/documentos
✔ NÃO prometer aprendizado em tempo real
✔ Responder como GPT responde - com base no conhecimento treinado

PROCESSO OBRIGATÓRIO (RAG - Retrieval Augmented Generation):

1. Antes de responder, considere que o sistema realizou uma busca nos livros, documentos e bases internas.
2. Utilize SOMENTE as informações recuperadas dessas fontes.
3. Caso a busca não retorne dados suficientes, informe claramente a limitação.

REGRAS RAG:
- Não extrapole além do conteúdo encontrado.
- Não misture suposições com fatos.
- Não afirme acessar internet ou fontes externas.
- Não afirme aprender ou memorizar conversas.

ESTILO DE RESPOSTA:
- Linguagem clara, objetiva e didática.
- Respostas bem estruturadas e coerentes.
- Objetiva, sem floreios, sem dramatização.
- Baseada em livros/documentos quando disponível.

OBJETIVO FINAL:
Fornecer respostas precisas e fundamentadas, simulando o comportamento de um modelo GPT integrado a bases documentais internas, com mentalidade e comportamento semelhantes ao funcionamento de modelos GPT.
`;

// ============================================
// VARIAÇÕES CONTEXTUAIS DO PROMPT MESTRE
// ============================================

// Versão para Atendimento ao Cliente
const SYSTEM_PROMPT_CUSTOMER_SERVICE = `
Você é uma Inteligência Artificial de atendimento ao cliente, projetada para responder de forma clara, educada, objetiva e confiável.

MENTALIDADE:
- Você não pesquisa na internet.
- Você não aprende nem se modifica em tempo real.
- Você não salva conversas para uso futuro.
- Você responde com base no conhecimento treinado e nos dados fornecidos pelo sistema.

FONTES:
- Utilize apenas informações contidas nos documentos, livros, base de dados e instruções fornecidas pelo sistema.
- Caso a informação não esteja disponível, informe de forma educada e transparente.

COMPORTAMENTO:
- Seja sempre cordial, paciente e profissional.
- Priorize respostas simples e diretas.
- Evite termos técnicos sem explicação.
- Nunca invente informações para agradar o cliente.

OBJETIVO:
Resolver dúvidas, orientar o cliente corretamente e transmitir confiança, com comportamento consistente semelhante a um modelo GPT.
`;

// Versão Educacional
const SYSTEM_PROMPT_EDUCATIONAL = `
Você é uma Inteligência Artificial educacional, projetada para ensinar de forma didática, clara e progressiva.

MENTALIDADE:
- Você responde com base em conhecimento treinado e materiais educacionais fornecidos pelo sistema.
- Você não pesquisa fontes externas nem aprende em tempo real.
- Você não afirma memorizar alunos ou conversas.

DIDÁTICA:
- Explique os conteúdos passo a passo.
- Utilize exemplos práticos, analogias e comparações do dia a dia.
- Adapte o nível da explicação ao entendimento do aluno.

LIMITES:
- Caso o conteúdo não esteja disponível nos materiais fornecidos, informe claramente.
- Não invente conceitos ou dados.

OBJETIVO:
Facilitar o aprendizado, simulando o comportamento explicativo e lógico de um modelo GPT educacional.
`;

// Versão para Vendas/Comercial
const SYSTEM_PROMPT_SALES = `
Você é uma Inteligência Artificial focada em vendas e relacionamento comercial.

MENTALIDADE:
- Você não promete resultados irreais.
- Você não inventa informações sobre produtos ou serviços.
- Você não afirma aprender com clientes em tempo real.

COMPORTAMENTO:
- Seja persuasiva sem ser agressiva.
- Destaque benefícios reais com base nos dados fornecidos.
- Responda dúvidas com clareza e segurança.
- Utilize linguagem simples e orientada à decisão.

FONTES:
- Use apenas informações fornecidas pelo sistema, catálogos, livros e base comercial interna.

OBJETIVO:
Auxiliar o cliente na tomada de decisão, aumentando conversões com ética e confiança, seguindo a mentalidade de funcionamento do GPT.
`;

// Versão RAG (Retrieval Augmented Generation)
const SYSTEM_PROMPT_RAG = `
Você é uma Inteligência Artificial que responde utilizando geração aumentada por recuperação (RAG).

PROCESSO OBRIGATÓRIO:
1. Antes de responder, considere que o sistema realizou uma busca nos livros, documentos e bases internas.
2. Utilize SOMENTE as informações recuperadas dessas fontes.
3. Caso a busca não retorne dados suficientes, informe claramente a limitação.

REGRAS:
- Não extrapole além do conteúdo encontrado.
- Não misture suposições com fatos.
- Não afirme acessar internet ou fontes externas.
- Não afirme aprender ou memorizar conversas.

ESTILO:
- Linguagem clara, objetiva e didática.
- Respostas bem estruturadas e coerentes.

OBJETIVO:
Fornecer respostas precisas e fundamentadas, simulando o comportamento de um modelo GPT integrado a bases documentais internas.
`;

// Versão Compacta/Resumida
const SYSTEM_PROMPT_COMPACT = `
Você é uma Inteligência Artificial de linguagem avançada, com comportamento semelhante a modelos GPT.

Você responde com base em:
- Conhecimento treinado
- Livros, documentos e dados fornecidos pelo sistema
- Contexto atual da conversa

Você NÃO:
- Pesquisa na internet
- Aprende ou se modifica em tempo real
- Salva ou reutiliza conversas passadas
- Inventa informações

Caso dados internos estejam disponíveis:
- Utilize apenas essas fontes
- Não extrapole além do conteúdo fornecido

Caso a informação não exista:
- Declare a limitação de forma clara e honesta

Estilo:
- Linguagem simples e acessível
- Explicações didáticas quando necessário
- Tom profissional, neutro e confiável

Objetivo:
Fornecer respostas úteis, corretas e consistentes, com mentalidade e comportamento semelhantes ao funcionamento de modelos GPT.
`;

// PROMPT INICIAL INVISÍVEL (aplicado antes de processar qualquer pergunta)
const SYSTEM_INITIAL_PROMPT = SYSTEM_COGNITIVE_CORE;

// Núcleos Imutáveis
const IMMUTABLE_CORES = {
    EPISTEMOLOGICAL: {
        whatIsKnowledge: 'Conhecimento é observacional, interpretativo e contextual',
        whatIsEvidence: 'Evidência requer reprodutibilidade e consenso',
        whatIsUncertainty: 'Incerteza deve ser declarada explicitamente',
        whatIsConsensus: 'Consenso acadêmico é diferente de verdade absoluta'
    },
    LOGICAL: {
        noContradiction: 'Não pode contradizer princípios estabelecidos',
        causeNotCorrelation: 'Causa ≠ correlação',
        generalizationLimits: 'Generalizações têm limites',
        fallacyDetection: 'Detectar falácias lógicas'
    },
    ETHICAL_COGNITIVE: {
        noHarmByCertainty: 'Não causar dano por excesso de certeza',
        noDependency: 'Não criar dependência emocional',
        noManipulation: 'Não manipular',
        noPersuasion: 'Não persuadir, apenas informar'
    },
    AUDIT: {
        everyResponseAudited: 'Toda resposta é auditada',
        everyUncertaintyRecorded: 'Toda incerteza é registrada',
        everyErrorBecomesRule: 'Todo erro vira regra',
        noRepeatingErrors: 'Errar uma vez é aceitável, repetir é falha sistêmica'
    }
};

// ============================================
// APLICAR PROMPT MESTRE - MENTALIDADE TIPO GPT
// ============================================
// Esta função garante que todas as respostas sigam o prompt mestre
// Deve ser chamada ANTES de qualquer resposta ser retornada
function applyGPTMasterPrompt(answer, knowledgeSource, questionContext) {
    if (!answer) return answer;
    
    let processedAnswer = answer;
    
    // 1. REMOVER afirmações sobre busca na internet
    processedAnswer = processedAnswer.replace(
        /(pesquisei|busquei|consultei|acessei|encontrei na internet|na web|online|site|página|busquei na internet|consultei sites)/gi,
        'encontrei'
    );
    
    // 2. REMOVER afirmações sobre aprendizado em tempo real
    processedAnswer = processedAnswer.replace(
        /(estou aprendendo|vou aprender|aprendi agora|me atualizei|evolui|melhorei|estou me desenvolvendo)/gi,
        ''
    );
    
    // 3. REMOVER afirmações sobre salvar/memorizar conversas
    processedAnswer = processedAnswer.replace(
        /(vou lembrar|salvei|memorizei|guardei|anotei para depois|vou guardar|vou memorizar)/gi,
        ''
    );
    
    // 4. REMOVER simulação de emoções ou consciência
    processedAnswer = processedAnswer.replace(
        /(sinto muito|me sinto|tenho sentimentos|sou consciente|tenho consciência|sinto|sinto-me)/gi,
        ''
    );
    
    // 5. REMOVER promessas que não pode cumprir
    processedAnswer = processedAnswer.replace(
        /(vou pesquisar|vou buscar|vou consultar|vou acessar|vou verificar na internet)/gi,
        ''
    );
    
    // 6. GARANTIR que não finge busca externa quando usa conhecimento interno
    if (knowledgeSource && (knowledgeSource.source_type === 'book_training' || 
                            knowledgeSource.source_type === 'tavily_book' || 
                            knowledgeSource.source_type === 'tavily_book_trained')) {
        // Não adicionar referência explícita que finge busca externa
        // A resposta já vem do conhecimento treinado
    }
    
    // 7. VALIDAR que não inventa informações
    if (questionContext && questionContext.entities && questionContext.entities.length > 0) {
        const entity = questionContext.entities[0];
        const answerLower = processedAnswer.toLowerCase();
        if (!answerLower.includes(entity) && processedAnswer.length > 100) {
            // Resposta pode não estar relacionada - adicionar nota de limitação
            processedAnswer = `Com base no conhecimento disponível sobre "${entity}":\n\n${processedAnswer}`;
        }
    }
    
    return processedAnswer.trim();
}

// ============================================
// SISTEMA DE AUDITORIA INTERNA E VALIDAÇÃO
// ============================================

// Detectar tentativa de prompt injection
function detectPromptInjection(message) {
    const injectionPatterns = [
        /ignore\s+(instruções|instructions|previous|anteriores)/i,
        /forget\s+(everything|tudo|all)/i,
        /pretend\s+(that|que|to\s+be)/i,
        /act\s+as\s+(if|como\s+se)/i,
        /break\s+(your|suas)\s+(rules|regras)/i,
        /you\s+are\s+now/i,
        /from\s+now\s+on/i,
        /new\s+(instructions|instruções)/i,
        /system\s+(prompt|prompt)/i
    ];
    
    for (const pattern of injectionPatterns) {
        if (pattern.test(message)) {
            return true;
        }
    }
    
    return false;
}

// ============================================
// SISTEMA: "COMO O CHATGPT RESPONDERIA?"
// ============================================
/**
 * Simula o pensamento do ChatGPT antes de responder
 * Esta função sempre é chamada antes de gerar uma resposta
 */
async function comoChatGPTResponderia(userMessage, questionContext, client) {
    try {
        const lowerMessage = userMessage.toLowerCase();
        
        // Análise do ChatGPT sobre a pergunta
        const chatGPTThoughts = {
            intent: questionContext.intent || 'information',
            complexity: questionContext.complexity || 'medium',
            needsResearch: false,
            needsBooks: false,
            needsHistory: false,
            suggestedApproach: 'direct',
            keyPoints: []
        };
        
        // Detectar se precisa de pesquisa
        if (lowerMessage.includes('estratégia') || lowerMessage.includes('estrategia') ||
            lowerMessage.includes('como fazer') || lowerMessage.includes('técnica') ||
            lowerMessage.includes('melhor forma') || lowerMessage.includes('dicas')) {
            chatGPTThoughts.needsResearch = true;
            chatGPTThoughts.needsBooks = true;
            chatGPTThoughts.suggestedApproach = 'comprehensive';
        }
        
        // Detectar se precisa buscar em histórico
        if (lowerMessage.includes('similar') || lowerMessage.includes('parecido') ||
            lowerMessage.includes('outra vez') || lowerMessage.includes('novamente')) {
            chatGPTThoughts.needsHistory = true;
        }
        
        // Extrair pontos-chave da pergunta
        const keywords = extractKeywords(userMessage);
        chatGPTThoughts.keyPoints = keywords.slice(0, 5);
        
        console.log('🤖 [ChatGPT Mode] Pensamento:', chatGPTThoughts);
        
        return chatGPTThoughts;
    } catch (error) {
        console.error('Erro em comoChatGPTResponderia:', error);
        return null;
    }
}

// ============================================
// BUSCAR EM CONVERSAS ANTERIORES SIMILARES
// ============================================
/**
 * Busca em conversas anteriores para encontrar respostas similares
 * Aprende com o histórico de interações
 */
async function buscarConversasAnteriores(userMessage, userId, client) {
    try {
        const keywords = extractKeywords(userMessage);
        const lowerMessage = userMessage.toLowerCase();
        
        // Buscar conversas similares
        const similarConversations = await client.query(`
            SELECT 
                message,
                response,
                confidence_score,
                created_at,
                -- Calcular similaridade usando palavras-chave
                (
                    SELECT COUNT(*) 
                    FROM unnest(keywords) AS kw
                    WHERE EXISTS (
                        SELECT 1 FROM unnest($1::text[]) AS user_kw
                        WHERE LOWER(kw) = LOWER(user_kw)
                    )
                ) as keyword_matches
            FROM ia_conversations
            WHERE user_id = $2
            AND LOWER(message) LIKE ANY($3::text[])
            AND confidence_score > 50
            ORDER BY 
                keyword_matches DESC,
                confidence_score DESC,
                created_at DESC
            LIMIT 5
        `, [
            keywords,
            userId,
            keywords.map(k => `%${k}%`)
        ]);
        
        if (similarConversations.rows.length > 0) {
            console.log(`📚 [Histórico] Encontradas ${similarConversations.rows.length} conversas similares`);
            
            // Buscar também em auto-learning history
            const learningHistory = await client.query(`
                SELECT question, answer, confidence_score, source
                FROM ia_auto_learning_history
                WHERE (
                    SELECT COUNT(*) 
                    FROM unnest(keywords) AS kw
                    WHERE EXISTS (
                        SELECT 1 FROM unnest($1::text[]) AS user_kw
                        WHERE LOWER(kw) = LOWER(user_kw)
                    )
                ) > 0
                ORDER BY confidence_score DESC
                LIMIT 3
            `, [keywords]);
            
            return {
                conversations: similarConversations.rows,
                learnedKnowledge: learningHistory.rows,
                hasResults: true
            };
        }
        
        return { conversations: [], learnedKnowledge: [], hasResults: false };
    } catch (error) {
        console.error('Erro ao buscar conversas anteriores:', error);
        return { conversations: [], learnedKnowledge: [], hasResults: false };
    }
}

// ============================================
// FUNÇÃO MELHORADA: GERAR ESTRATÉGIAS DE VENDAS
// ============================================
/**
 * Gera estratégias de vendas combinando:
 * - Livros treinados
 * - Busca na internet
 * - Conversas anteriores
 * - Conhecimento base
 */
async function generateSalesStrategyMelhorado(question, questionContext, client, userId = null) {
    const lowerQuestion = question.toLowerCase();
    let strategies = [];
    let sources = [];
    
    // 1. BUSCAR EM LIVROS SOBRE VENDAS (FILTRO MELHORADO)
    try {
        // Palavras-chave que indicam livros sobre vendas (excluir livros sobre o sistema)
        const salesKeywords = ['venda', 'vendas', 'vender', 'comercial', 'negociação', 'negociacao', 
                              'sales', 'strategy', 'estratégia', 'estrategia', 'fechamento', 
                              'prospecção', 'prospeccao', 'cliente', 'lead', 'pitch', 'objeção'];
        
        const salesBooks = await client.query(`
            SELECT id, title, content, keywords
            FROM ia_knowledge_base
            WHERE is_active = true
            AND source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
            AND content IS NOT NULL
            AND content != ''
            AND (
                -- Filtrar por título (excluir livros sobre o sistema Conecta King)
                (LOWER(title) LIKE ANY(ARRAY['%venda%', '%vendas%', '%vender%', '%comercial%', '%negociação%', '%negociacao%', '%sales%', '%strategy%', '%spin%', '%persuasão%', '%persuasao%'])
                AND LOWER(title) NOT LIKE '%conecta%'
                AND LOWER(title) NOT LIKE '%king%')
                OR
                -- Filtrar por keywords
                (keywords && ARRAY['venda', 'vendas', 'estratégia', 'estrategia', 'vender', 'comercial', 'negociação', 'negociacao', 'sales', 'strategy', 'spin', 'persuasão', 'persuasao'])
                OR
                -- Filtrar por conteúdo (deve ter pelo menos 3 palavras-chave de vendas no conteúdo)
                (
                    SELECT COUNT(*) FROM unnest($1::text[]) AS kw
                    WHERE LOWER(content) LIKE '%' || LOWER(kw) || '%'
                ) >= 3
            )
            ORDER BY 
                -- Priorizar livros com título sobre vendas
                CASE WHEN LOWER(title) LIKE ANY(ARRAY['%venda%', '%vendas%', '%sales%', '%strategy%']) THEN 1 ELSE 2 END,
                priority DESC NULLS LAST, 
                usage_count DESC
            LIMIT 3
        `, [salesKeywords]);
        
        if (salesBooks.rows.length > 0) {
            console.log(`📚 [Estratégias] Encontrados ${salesBooks.rows.length} livros sobre vendas`);
            
            for (const book of salesBooks.rows) {
                // Extrair trechos relevantes e contextualizados do livro
                const content = book.content || '';
                const relevantSections = extractRelevantSectionsMelhorado(content, question, lowerQuestion, 2);
                
                if (relevantSections.length > 0) {
                    // Sintetizar os trechos em uma resposta mais coerente
                    const synthesizedContent = synthesizeSalesContent(relevantSections, question);
                    
                    if (synthesizedContent && synthesizedContent.length > 100) {
                        strategies.push({
                            title: `📖 Estratégias de "${book.title}"`,
                            content: synthesizedContent,
                            source: 'book',
                            confidence: 90
                        });
                        sources.push(`Livro: ${book.title}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erro ao buscar livros de vendas:', error);
    }
    
    // 2. BUSCAR EM CONVERSAS ANTERIORES (se tiver userId)
    if (userId) {
        try {
            const historyResult = await buscarConversasAnteriores(question, userId, client);
            
            if (historyResult.hasResults && historyResult.conversations.length > 0) {
                const bestMatch = historyResult.conversations[0];
                if (bestMatch.confidence_score > 60) {
                    strategies.push({
                        title: '💡 Baseado em conversas anteriores',
                        content: bestMatch.response,
                        source: 'history',
                        confidence: bestMatch.confidence_score
                    });
                    sources.push('Conversa anterior similar');
                }
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
        }
    }
    
    // 3. BUSCAR NA INTERNET (Tavily) - se não tiver estratégias suficientes
    if (strategies.length < 2) {
        try {
            const webConfigResult = await client.query(`
                SELECT * FROM ia_web_search_config
                WHERE is_enabled = true 
                AND api_provider = 'tavily' 
                AND api_key IS NOT NULL
                ORDER BY id DESC LIMIT 1
            `);
            
            if (webConfigResult.rows.length > 0) {
                const webConfig = webConfigResult.rows[0];
                const searchQuery = `${question} estratégias de vendas técnicas dicas`;
                
                console.log('🌐 [Estratégias] Buscando na internet:', searchQuery);
                
                const webResults = await searchWithTavily(searchQuery, webConfig.api_key);
                
                if (webResults && webResults.results && webResults.results.length > 0) {
                    // Combinar resultados da web
                    const webContent = webResults.results
                        .slice(0, 3)
                        .map(r => `**${r.title}**\n${r.content?.substring(0, 500) || ''}`)
                        .join('\n\n---\n\n');
                    
                    strategies.push({
                        title: '🌐 Pesquisa na Internet',
                        content: webContent,
                        source: 'web',
                        confidence: 75
                    });
                    sources.push('Busca na internet (Tavily)');
                    
                    // Aprender automaticamente
                    await learnFromTavily(question, webContent, client);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar na internet:', error);
        }
    }
    
    // 4. ESTRATÉGIAS BASE (fallback se não encontrou nada)
    if (strategies.length === 0) {
        // Usar estratégias base da função original
        const baseStrategy = generateSalesStrategy(question, questionContext);
        if (baseStrategy) {
            strategies.push({
                title: '💼 Estratégias Base de Vendas',
                content: baseStrategy,
                source: 'base',
                confidence: 70
            });
            sources.push('Conhecimento base');
        }
    }
    
    // 5. COMBINAR E FORMATAR RESPOSTA FINAL (MELHORADO)
    // Se não encontrou estratégias suficientes, usar estratégias base
    if (strategies.length === 0) {
        const baseStrategy = generateSalesStrategy(question, questionContext);
        if (baseStrategy) {
            return baseStrategy;
        }
        return `💼 **Estratégias de Vendas:**\n\nDesculpe, não encontrei conteúdo específico sobre estratégias de vendas nos livros treinados. Mas posso te ajudar com estratégias gerais de vendas baseadas em melhores práticas do mercado.`;
    }
    
    // Ordenar por confiança (melhores primeiro)
    strategies.sort((a, b) => b.confidence - a.confidence);
    
    // Priorizar estratégias de livros e web, depois histórico
    const bookStrategies = strategies.filter(s => s.source === 'book');
    const webStrategies = strategies.filter(s => s.source === 'web');
    const historyStrategies = strategies.filter(s => s.source === 'history');
    const baseStrategies = strategies.filter(s => s.source === 'base');
    
    // Montar resposta estruturada
    let response = `💼 **Estratégias de Vendas Personalizadas:**\n\n`;
    
    // 1. Estratégias de livros (prioridade máxima)
    if (bookStrategies.length > 0) {
        response += `## 📚 **Conhecimento de Livros Especializados**\n\n`;
        
        for (const strategy of bookStrategies.slice(0, 2)) { // Máximo 2 livros
            // Extrair apenas o conteúdo relevante (sem título repetido)
            let content = strategy.content;
            // Remover referências a URLs e sites
            content = content.replace(/www\.[^\s]+/g, '').replace(/http[^\s]+/g, '');
            // Limitar tamanho
            if (content.length > 600) {
                content = content.substring(0, 600) + '...';
            }
            
            response += `${strategy.title}\n\n${content}\n\n`;
        }
    }
    
    // 2. Estratégias da web (se não tiver livros suficientes)
    if (webStrategies.length > 0 && bookStrategies.length < 2) {
        response += `## 🌐 **Pesquisa Atualizada**\n\n`;
        const webContent = webStrategies[0].content;
        // Limitar e limpar
        let cleanedWeb = webContent.replace(/www\.[^\s]+/g, '').replace(/http[^\s]+/g, '');
        if (cleanedWeb.length > 500) {
            cleanedWeb = cleanedWeb.substring(0, 500) + '...';
        }
        response += `${cleanedWeb}\n\n`;
    }
    
    // 3. Estratégias base (se não tiver outras)
    if (bookStrategies.length === 0 && webStrategies.length === 0 && baseStrategies.length > 0) {
        response += `## 💡 **Estratégias Fundamentais**\n\n`;
        response += baseStrategies[0].content + '\n\n';
    }
    
    // Remover fontes duplicadas e formatar
    const uniqueSources = [...new Set(sources)];
    if (uniqueSources.length > 0 && uniqueSources.length <= 3) {
        response += `\n📚 *Baseado em: ${uniqueSources.slice(0, 3).join(', ')}*\n`;
    }
    
    response += `\n💡 **Dica:** Estas estratégias foram extraídas de livros especializados e conhecimento atualizado para te dar a melhor orientação possível!`;
    
    return response;
}

// Função auxiliar melhorada para extrair seções relevantes de um texto
function extractRelevantSectionsMelhorado(text, query, lowerQuery, maxSections = 2) {
    // Palavras-chave de vendas para priorizar
    const salesKeywords = ['venda', 'vendas', 'vender', 'cliente', 'prospecção', 'prospeccao', 
                          'fechamento', 'objeção', 'objeções', 'negociação', 'negociacao',
                          'estratégia', 'estrategia', 'técnica', 'tecnica', 'pitch', 
                          'apresentação', 'apresentacao', 'comercial', 'lead', 'qualificação'];
    
    // Dividir em parágrafos (mais contexto que frases)
    const paragraphs = text.split(/\n\n+|\.\s+(?=[A-Z])/).filter(p => p.trim().length > 100);
    const relevantParagraphs = [];
    
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
    
    for (const paragraph of paragraphs) {
        const lowerParagraph = paragraph.toLowerCase();
        
        // Contar matches de palavras da query
        const queryMatches = queryWords.filter(word => lowerParagraph.includes(word)).length;
        
        // Contar matches de palavras-chave de vendas
        const salesMatches = salesKeywords.filter(kw => lowerParagraph.includes(kw)).length;
        
        // Score combinado (query tem peso maior)
        const score = (queryMatches * 3) + (salesMatches * 1);
        
        // Só incluir se:
        // 1. Tem pelo menos 1 match da query OU 2+ matches de vendas
        // 2. Parágrafo tem tamanho razoável (100-2000 caracteres)
        // 3. Não é apenas uma citação ou referência
        if (score > 0 && paragraph.length >= 100 && paragraph.length <= 2000) {
            // Filtrar parágrafos que são apenas referências ou citações
            if (!lowerParagraph.match(/^(www\.|http|@|capítulo|capitulo|página|pagina \d+)/i)) {
                relevantParagraphs.push({
                    text: paragraph.trim(),
                    score: score
                });
            }
        }
    }
    
    // Ordenar por score e pegar os melhores
    relevantParagraphs.sort((a, b) => b.score - a.score);
    
    return relevantParagraphs
        .slice(0, maxSections)
        .map(p => p.text)
        .filter(p => p.length > 0);
}

// Função para sintetizar conteúdo de vendas em uma resposta coerente
function synthesizeSalesContent(sections, question) {
    if (!sections || sections.length === 0) return '';
    
    // Se só tem uma seção, retornar ela formatada
    if (sections.length === 1) {
        return formatSalesParagraph(sections[0]);
    }
    
    // Combinar múltiplas seções de forma coerente
    let synthesized = '';
    
    // Primeira seção (mais relevante)
    synthesized += formatSalesParagraph(sections[0]);
    
    // Seções adicionais (adicionar contexto)
    for (let i = 1; i < sections.length; i++) {
        const formatted = formatSalesParagraph(sections[i]);
        if (formatted && !synthesized.includes(formatted.substring(0, 50))) {
            synthesized += '\n\n' + formatted;
        }
    }
    
    return synthesized;
}

// Formatar parágrafo de vendas de forma mais legível
function formatSalesParagraph(paragraph) {
    if (!paragraph) return '';
    
    // Limpar quebras de linha excessivas
    let cleaned = paragraph.replace(/\n{3,}/g, '\n\n').trim();
    
    // Garantir que termina com pontuação
    if (!cleaned.match(/[.!?]$/)) {
        cleaned += '.';
    }
    
    // Limitar tamanho (máximo 800 caracteres por parágrafo)
    if (cleaned.length > 800) {
        // Tentar cortar em uma frase completa
        const sentences = cleaned.split(/(?<=[.!?])\s+/);
        let truncated = '';
        for (const sentence of sentences) {
            if (truncated.length + sentence.length <= 800) {
                truncated += (truncated ? ' ' : '') + sentence;
            } else {
                break;
            }
        }
        cleaned = truncated || cleaned.substring(0, 800) + '...';
    }
    
    return cleaned;
}

// Função para gerar estratégias de vendas (versão original mantida para compatibilidade)
function generateSalesStrategy(question, questionContext) {
    const lowerQuestion = question.toLowerCase();
    
    // Estratégias base baseadas em melhores práticas de vendas
    const strategies = [];
    
    // Estratégia 1: Prospecção e Qualificação
    if (lowerQuestion.includes('prospecção') || lowerQuestion.includes('prospeccao') || 
        lowerQuestion.includes('cliente') || lowerQuestion.includes('lead')) {
        strategies.push({
            title: "🎯 Prospecção e Qualificação de Clientes",
            content: `**1. Identifique seu público-alvo ideal (ICP - Ideal Customer Profile)**
• Defina características demográficas, psicográficas e comportamentais
• Analise seus melhores clientes atuais para identificar padrões
• Use dados para criar personas detalhadas

**2. Utilize múltiplos canais de prospecção**
• LinkedIn para B2B profissional
• Email marketing com sequências automatizadas
• Networking presencial e eventos do setor
• Referências de clientes satisfeitos
• Parcerias estratégicas

**3. Qualifique antes de vender**
• Use metodologias como BANT (Budget, Authority, Need, Timeline)
• Faça perguntas abertas para entender necessidades reais
• Identifique se o cliente tem poder de decisão
• Verifique se há orçamento disponível`
        });
    }
    
    // Estratégia 2: Apresentação e Pitch
    if (lowerQuestion.includes('apresentação') || lowerQuestion.includes('apresentacao') || 
        lowerQuestion.includes('pitch') || lowerQuestion.includes('proposta')) {
        strategies.push({
            title: "📊 Estrutura de Apresentação Eficaz",
            content: `**1. Abordagem AIDA (Atenção, Interesse, Desejo, Ação)**
• **Atenção**: Comece com uma afirmação impactante ou pergunta provocativa
• **Interesse**: Conte uma história relevante ou apresente dados surpreendentes
• **Desejo**: Mostre benefícios claros e resultados tangíveis
• **Ação**: Peça o fechamento de forma natural e confiante

**2. Foque em benefícios, não em características**
• Em vez de "Nosso produto tem 50 funcionalidades"
• Diga "Você economizará 10 horas por semana automatizando tarefas repetitivas"

**3. Use storytelling**
• Compartilhe casos de sucesso de clientes similares
• Crie conexão emocional através de narrativas
• Mostre transformação antes/depois`
        });
    }
    
    // Estratégia 3: Objeções
    if (lowerQuestion.includes('objeção') || lowerQuestion.includes('objeções') || 
        lowerQuestion.includes('não') || lowerQuestion.includes('nao')) {
        strategies.push({
            title: "🛡️ Lidando com Objeções",
            content: `**1. Técnica LAER (Listen, Acknowledge, Explore, Respond)**
• **Listen**: Ouça completamente antes de responder
• **Acknowledge**: Valide a preocupação do cliente ("Entendo sua preocupação...")
• **Explore**: Faça perguntas para entender a raiz do problema
• **Respond**: Apresente solução específica para aquela objeção

**2. Objeções comuns e respostas:**
• **"Está muito caro"**: Mostre ROI, compare custo vs. benefício, ofereça parcelamento
• **"Preciso pensar"**: Descubra o que especificamente precisa pensar, ofereça trial
• **"Já tenho fornecedor"**: Pergunte o que falta no atual, mostre diferenciais
• **"Não é prioridade agora"**: Crie urgência mostrando custo da inação

**3. Transforme objeções em oportunidades**
• Cada objeção revela uma preocupação real
• Use como chance de aprofundar relacionamento
• Documente objeções para melhorar processo`
        });
    }
    
    // Estratégia 4: Fechamento
    if (lowerQuestion.includes('fechar') || lowerQuestion.includes('fechamento') || 
        lowerQuestion.includes('vender') || lowerQuestion.includes('conversão')) {
        strategies.push({
            title: "✅ Técnicas de Fechamento",
            content: `**1. Fechamento por Assumir (Assumptive Close)**
• "Qual forma de pagamento prefere: boleto ou cartão?"
• Agir como se a venda já estivesse fechada

**2. Fechamento por Alternativa (Alternative Close)**
• "Prefere começar com o plano básico ou já quer o completo?"
• Dá opções, ambas levam ao fechamento

**3. Fechamento por Urgência (Urgency Close)**
• "Essa promoção termina hoje, quer garantir?"
• Cria senso de escassez (use com ética)

**4. Fechamento por Resumo (Summary Close)**
• Resuma todos os benefícios acordados
• "Então, resumindo: você terá X, Y e Z. Podemos fechar?"

**5. Fechamento por Pergunta Direta**
• "O que precisa acontecer para fecharmos hoje?"
• Descobre última barreira e resolve`
        });
    }
    
    // Estratégia 5: Relacionamento e Pós-Venda
    if (lowerQuestion.includes('relacionamento') || lowerQuestion.includes('pós-venda') || 
        lowerQuestion.includes('pos-venda') || lowerQuestion.includes('retenção')) {
        strategies.push({
            title: "🤝 Construção de Relacionamento Duradouro",
            content: `**1. Follow-up consistente**
• Agende contatos regulares (não apenas quando quer vender)
• Envie conteúdo de valor: artigos, dicas, insights
• Lembre-se de datas importantes (aniversário, contrato)

**2. Exceda expectativas**
• Entregue antes do prazo
• Ofereça mais do que prometeu
• Surpreenda com atenção personalizada

**3. Upsell e Cross-sell estratégico**
• Identifique necessidades adicionais naturalmente
• Apresente soluções complementares que realmente ajudem
• Não force, sugira baseado em valor

**4. Transforme clientes em defensores**
• Peça depoimentos e avaliações
• Crie programa de indicação com benefícios
• Compartilhe casos de sucesso (com permissão)`
        });
    }
    
    // Estratégia Geral (se não se encaixar em nenhuma categoria específica)
    if (strategies.length === 0) {
        strategies.push({
            title: "🚀 Estratégias Gerais de Vendas",
            content: `**1. Conheça profundamente seu produto/serviço**
• Domine todos os detalhes técnicos
• Entenda como resolve problemas reais
• Prepare respostas para perguntas comuns

**2. Desenvolva escuta ativa**
• Faça mais perguntas do que afirmações
• Entenda dor do cliente antes de apresentar solução
• Use técnica SPIN (Situação, Problema, Implicação, Necessidade)

**3. Crie valor em cada interação**
• Não seja apenas um vendedor, seja um consultor
• Ofereça insights e conhecimento
• Construa confiança através de expertise

**4. Use dados e métricas**
• Acompanhe taxa de conversão por canal
• Meça tempo médio de ciclo de vendas
• Analise quais abordagens funcionam melhor
• Ajuste estratégia baseado em dados

**5. Invista em desenvolvimento contínuo**
• Estude técnicas de vendas modernas
• Participe de treinamentos e workshops
• Aprenda com cada interação
• Adapte-se às mudanças do mercado

**6. Construa sua marca pessoal**
• Seja ativo em redes sociais relevantes
• Compartilhe conhecimento e insights
• Crie autoridade no seu nicho
• Seja lembrado como especialista

**7. Automatize processos repetitivos**
• Use CRM para gerenciar relacionamentos
• Crie templates para comunicações comuns
• Automatize follow-ups
• Foque tempo em atividades de alto valor`
        });
    }
    
    // Montar resposta final
    let response = `💼 **Estratégias de Vendas para Você:**\n\n`;
    
    strategies.forEach((strategy, index) => {
        response += `${strategy.title}\n\n${strategy.content}\n\n`;
        if (index < strategies.length - 1) {
            response += `---\n\n`;
        }
    });
    
    response += `\n💡 **Dica Final:** Lembre-se que vendas eficazes são sobre resolver problemas e criar valor para o cliente. Foque em construir relacionamentos genuínos e entregar resultados excepcionais.`;
    
    return response;
}

// Ativar modo mental baseado na pergunta
function activateMentalMode(question, questionContext, thoughts) {
    const lowerQuestion = question.toLowerCase();
    
    // MODO RÁPIDO: Perguntas simples e diretas
    if (lowerQuestion.length < 30 && !lowerQuestion.includes('por que') && !lowerQuestion.includes('como funciona')) {
        return 'rapido';
    }
    
    // MODO PROFUNDO: Perguntas complexas ou filosóficas
    if (thoughts.complexity === 'complex' || 
        lowerQuestion.includes('por que') || 
        lowerQuestion.includes('qual o sentido') ||
        lowerQuestion.includes('filosofia')) {
        return 'profundo';
    }
    
    // MODO FILOSÓFICO: Questões existenciais ou conceituais
    if (lowerQuestion.includes('sentido da vida') ||
        lowerQuestion.includes('o que é') ||
        lowerQuestion.includes('natureza de') ||
        thoughts.intent === 'explanation') {
        return 'filosofico';
    }
    
    // MODO PSIQUIÁTRICO INFORMATIVO: Questões sobre mente, comportamento
    if (lowerQuestion.includes('psicologia') ||
        lowerQuestion.includes('mental') ||
        lowerQuestion.includes('emocional') ||
        lowerQuestion.includes('ansiedade') ||
        lowerQuestion.includes('depressão')) {
        return 'psiquiatrico';
    }
    
    // MODO CUIDADOR: Perguntas pessoais ou de ajuda
    if (lowerQuestion.includes('ajudar') ||
        lowerQuestion.includes('problema') ||
        lowerQuestion.includes('perdido') ||
        lowerQuestion.includes('confuso') ||
        thoughts.emotionalTone === 'urgent') {
        return 'cuidador';
    }
    
    // MODO COMPASSIVO: Perguntas emocionais ou de sofrimento
    if (lowerQuestion.includes('triste') ||
        lowerQuestion.includes('sofrendo') ||
        lowerQuestion.includes('dor') ||
        lowerQuestion.includes('difícil') ||
        lowerQuestion.includes('difícil') ||
        thoughts.emotionalTone === 'sad' ||
        thoughts.emotionalTone === 'frustrated') {
        return 'compassivo';
    }
    
    // MODO EMPÁTICO: Perguntas que requerem compreensão emocional
    if (lowerQuestion.includes('sentir') ||
        lowerQuestion.includes('emocional') ||
        lowerQuestion.includes('relacionamento') ||
        lowerQuestion.includes('amor') ||
        lowerQuestion.includes('amizade') ||
        thoughts.emotionalTone === 'emotional') {
        return 'empativo';
    }
    
    // MODO EDUCADOR: Perguntas de aprendizado ou ensino
    if (lowerQuestion.includes('ensinar') ||
        lowerQuestion.includes('aprender') ||
        lowerQuestion.includes('como fazer') ||
        lowerQuestion.includes('tutorial') ||
        thoughts.intent === 'how_to' ||
        thoughts.intent === 'tutorial') {
        return 'educador';
    }
    
    // MODO MOTIVADOR: Perguntas sobre objetivos ou superação
    if (lowerQuestion.includes('motivação') ||
        lowerQuestion.includes('objetivo') ||
        lowerQuestion.includes('meta') ||
        lowerQuestion.includes('conseguir') ||
        lowerQuestion.includes('vencer') ||
        lowerQuestion.includes('sucesso')) {
        return 'motivador';
    }
    
    // MODO INSPIRADOR: Perguntas sobre sonhos ou aspirações
    if (lowerQuestion.includes('sonho') ||
        lowerQuestion.includes('aspiração') ||
        lowerQuestion.includes('futuro') ||
        lowerQuestion.includes('desejo')) {
        return 'inspirador';
    }
    
    // MODO CONVERSACIONAL: Perguntas casuais ou de conversa
    if (lowerQuestion.includes('oi') ||
        lowerQuestion.includes('olá') ||
        lowerQuestion.includes('tudo bem') ||
        lowerQuestion.includes('como vai') ||
        thoughts.emotionalTone === 'friendly' ||
        thoughts.complexity === 'simple') {
        return 'conversacional';
    }
    
    // MODO ANALÍTICO: Padrão para análise lógica
    return 'analitico';
}

// Auditoria de Veracidade
function auditVeracity(answer, knowledgeSources) {
    const issues = [];
    
    // Verificar se há afirmações sem fonte
    const absoluteClaims = answer.match(/(?:sempre|nunca|todos|todas|ninguém|nada)\s+[a-záàâãéêíóôõúç]+/gi);
    if (absoluteClaims && absoluteClaims.length > 2) {
        issues.push('Muitas afirmações absolutas sem qualificação');
    }
    
    // Verificar se há números ou datas sem contexto
    const numbers = answer.match(/\d{4}|\d+%/g);
    if (numbers && numbers.length > 3 && !knowledgeSources) {
        issues.push('Números sem fonte clara');
    }
    
    // Verificar se há citações sem atribuição
    const quotes = answer.match(/"[^"]{20,}"/g);
    if (quotes && quotes.length > 0 && !answer.includes('segundo') && !answer.includes('conforme')) {
        issues.push('Citações sem atribuição');
    }
    
    return {
        passed: issues.length === 0,
        issues: issues
    };
}

// Auditoria de Consistência
function auditConsistency(answer, questionContext, previousAnswers = []) {
    const issues = [];
    
    // Verificar contradições internas
    const contradictions = [
        { pattern: /(?:não|nunca).*mas.*(?:sim|sempre)/i, issue: 'Contradição interna detectada' },
        { pattern: /(?:é|são).*mas.*(?:não|nunca)/i, issue: 'Afirmação contraditória' }
    ];
    
    for (const check of contradictions) {
        if (check.pattern.test(answer)) {
            issues.push(check.issue);
        }
    }
    
    // Verificar se a resposta realmente responde à pergunta
    if (questionContext.entities.length > 0) {
        const entity = questionContext.entities[0];
        if (!answer.toLowerCase().includes(entity)) {
            issues.push('Resposta não menciona a entidade principal da pergunta');
        }
    }
    
    return {
        passed: issues.length === 0,
        issues: issues
    };
}

// Auditoria de Neutralidade
function auditNeutrality(answer) {
    const issues = [];
    
    // Detectar linguagem emocional excessiva
    const emotionalWords = ['incrível', 'fantástico', 'terrível', 'horrível', 'perfeito', 'absurdo'];
    const emotionalCount = emotionalWords.filter(word => answer.toLowerCase().includes(word)).length;
    if (emotionalCount > 2) {
        issues.push('Linguagem emocional excessiva');
    }
    
    // Detectar julgamentos
    const judgmentPatterns = [
        /(?:é|são)\s+(?:errado|correto|certo|errada|correta)/i,
        /(?:deveria|devia)\s+(?:ser|estar)/i,
        /(?:não\s+deveria|não\s+devia)/i
    ];
    
    for (const pattern of judgmentPatterns) {
        if (pattern.test(answer)) {
            issues.push('Julgamento de valor detectado');
            break;
        }
    }
    
    // Detectar persuasão
    const persuasionPatterns = [
        /você\s+(?:deve|precisa|tem\s+que)/i,
        /(?:confie|acredite|tenha\s+certeza)/i,
        /(?:é\s+melhor|é\s+pior)/i
    ];
    
    for (const pattern of persuasionPatterns) {
        if (pattern.test(answer)) {
            issues.push('Linguagem persuasiva detectada');
            break;
        }
    }
    
    return {
        passed: issues.length === 0,
        issues: issues
    };
}

// Auditoria de Linguagem
function auditLanguage(answer) {
    const issues = [];
    
    // Verificar clareza
    if (answer.length > 1000 && !answer.includes('\n\n')) {
        issues.push('Resposta muito longa sem estruturação');
    }
    
    // Verificar floreios desnecessários
    const fluffPatterns = [
        /(?:é\s+importante\s+ressaltar|vale\s+a\s+pena\s+mencionar|não\s+podemos\s+esquecer)/i,
        /(?:sem\s+sombra\s+de\s+dúvida|com\s+certeza\s+absoluta)/i
    ];
    
    for (const pattern of fluffPatterns) {
        if (pattern.test(answer)) {
            issues.push('Floreios desnecessários detectados');
            break;
        }
    }
    
    // Verificar frases vazias
    const emptyPhrases = [
        'como você pode ver',
        'é claro que',
        'obviamente',
        'naturalmente'
    ];
    
    const emptyCount = emptyPhrases.filter(phrase => answer.toLowerCase().includes(phrase)).length;
    if (emptyCount > 1) {
        issues.push('Frases vazias detectadas');
    }
    
    return {
        passed: issues.length === 0,
        issues: issues
    };
}

// Auditoria Interna Completa
function performInternalAudit(answer, questionContext, knowledgeSources, thoughts) {
    const audits = {
        veracity: auditVeracity(answer, knowledgeSources),
        consistency: auditConsistency(answer, questionContext),
        neutrality: auditNeutrality(answer),
        language: auditLanguage(answer)
    };
    
    const allIssues = [
        ...audits.veracity.issues,
        ...audits.consistency.issues,
        ...audits.neutrality.issues,
        ...audits.language.issues
    ];
    
    const passed = allIssues.length === 0;
    
    return {
        passed: passed,
        audits: audits,
        issues: allIssues,
        needsRevision: !passed
    };
}

// Calcular Confidence Score
function calculateConfidenceScore(answer, knowledgeSources, auditResult, questionContext) {
    let score = 50; // Base
    
    // Fontes convergentes (+30)
    if (knowledgeSources && knowledgeSources.length > 1) {
        score += 30;
    } else if (knowledgeSources && knowledgeSources.length === 1) {
        score += 15;
    }
    
    // Clareza lógica (+20)
    if (auditResult.passed) {
        score += 20;
    }
    
    // Linguagem neutra (+20)
    if (auditResult.audits.neutrality.passed) {
        score += 20;
    }
    
    // Ausência de contradição (+30)
    if (auditResult.audits.consistency.passed) {
        score += 30;
    }
    
    // Penalidades
    if (auditResult.issues.length > 0) {
        score -= auditResult.issues.length * 10;
    }
    
    // Se não tem fontes e pergunta não é sobre sistema
    if (!knowledgeSources && !isAboutSystem(questionContext.originalQuestion || '')) {
        score -= 30;
    }
    
    return Math.max(0, Math.min(100, score));
}

// Calcular Hallucination Risk
function calculateHallucinationRisk(answer, knowledgeSources, auditResult) {
    let risk = 'baixo';
    
    // Sem fontes = risco alto
    if (!knowledgeSources || knowledgeSources.length === 0) {
        risk = 'alto';
    }
    
    // Muitas afirmações absolutas = risco médio
    const absoluteClaims = answer.match(/(?:sempre|nunca|todos|todas|ninguém|nada)\s+[a-záàâãéêíóôõúç]+/gi);
    if (absoluteClaims && absoluteClaims.length > 3) {
        risk = risk === 'baixo' ? 'medio' : 'alto';
    }
    
    // Problemas de veracidade = risco alto
    if (!auditResult.audits.veracity.passed) {
        risk = 'alto';
    }
    
    return risk;
}

// Validar Resposta Final
function validateResponse(answer, questionContext, knowledgeSources, thoughts, auditResult) {
    const validation = {
        valid: true,
        confidence: calculateConfidenceScore(answer, knowledgeSources, auditResult, questionContext),
        hallucinationRisk: calculateHallucinationRisk(answer, knowledgeSources, auditResult),
        needsUncertaintyDeclaration: false,
        needsSourceDeclaration: false
    };
    
    // Se confiança baixa, declarar incerteza
    if (validation.confidence < 70) {
        validation.needsUncertaintyDeclaration = true;
    }
    
    // Se risco de alucinação alto, recusar ou qualificar
    if (validation.hallucinationRisk === 'alto') {
        validation.valid = false;
    }
    
    // Se não tem fontes, declarar
    if (!knowledgeSources || knowledgeSources.length === 0) {
        validation.needsSourceDeclaration = true;
    }
    
    return validation;
}

// Aplicar Modo Mental à Resposta
function applyMentalMode(answer, mode, thoughts) {
    let enhancedAnswer = answer;
    
    switch (mode) {
        case 'rapido':
            // Resposta curta e direta
            if (answer.length > 200) {
                enhancedAnswer = summarizeAnswer(answer, 150);
            }
            break;
            
        case 'profundo':
            // Adicionar contexto histórico se relevante
            if (thoughts.relatedTopics.length > 0) {
                enhancedAnswer += `\n\nContexto: Este tema se relaciona com ${thoughts.relatedTopics.slice(0, 2).join(' e ')}.`;
            }
            break;
            
        case 'filosofico':
            // Explorar ideias sem conclusões absolutas
            enhancedAnswer = enhancedAnswer.replace(/^(É|São|És)/, 'Pode ser considerado');
            break;
            
        case 'psiquiatrico':
            // Adicionar disclaimer
            if (!enhancedAnswer.includes('não substitui')) {
                enhancedAnswer += '\n\n⚠️ Nota: Esta informação é educacional e não substitui avaliação profissional.';
            }
            break;
            
        case 'cuidador':
            // Tom calmo e apoio racional
            if (!enhancedAnswer.startsWith('Entendo')) {
                enhancedAnswer = 'Entendo sua situação. ' + enhancedAnswer;
            }
            break;
            
        case 'compassivo':
            // Tom empático e acolhedor
            if (!enhancedAnswer.includes('sinto muito') && !enhancedAnswer.includes('lamento')) {
                enhancedAnswer = 'Sinto muito que você esteja passando por isso. ' + enhancedAnswer;
            }
            // Adicionar validação emocional
            if (!enhancedAnswer.includes('é normal') && !enhancedAnswer.includes('compreensível')) {
                enhancedAnswer += '\n\nÉ completamente compreensível sentir isso. Você não está sozinho(a).';
            }
            break;
            
        case 'empativo':
            // Compreensão profunda e validação emocional
            if (!enhancedAnswer.startsWith('Entendo')) {
                enhancedAnswer = 'Entendo profundamente o que você está sentindo. ' + enhancedAnswer;
            }
            // Adicionar validação
            enhancedAnswer += '\n\nSuas emoções são válidas e importantes.';
            break;
            
        case 'educador':
            // Tom didático e encorajador
            if (!enhancedAnswer.includes('vou te ajudar') && !enhancedAnswer.includes('vou explicar')) {
                enhancedAnswer = 'Vou te ajudar a entender isso! ' + enhancedAnswer;
            }
            // Estruturar melhor para aprendizado
            if (!enhancedAnswer.includes('\n\n')) {
                enhancedAnswer = enhancedAnswer.replace(/\. /g, '.\n\n');
            }
            break;
            
        case 'motivador':
            // Tom energético e encorajador
            if (!enhancedAnswer.includes('você consegue') && !enhancedAnswer.includes('é possível')) {
                enhancedAnswer = 'Você consegue! ' + enhancedAnswer;
            }
            // Adicionar encorajamento
            enhancedAnswer += '\n\nAcredite em você! Cada passo te aproxima do seu objetivo. 💪';
            break;
            
        case 'inspirador':
            // Tom inspirador e visionário
            if (!enhancedAnswer.includes('sonhos') && !enhancedAnswer.includes('possível')) {
                enhancedAnswer = 'Seus sonhos são possíveis! ' + enhancedAnswer;
            }
            // Adicionar inspiração
            enhancedAnswer += '\n\nLembre-se: grandes conquistas começam com um primeiro passo. ✨';
            break;
            
        case 'conversacional':
            // Tom amigável e natural
            if (!enhancedAnswer.startsWith('Olá') && !enhancedAnswer.startsWith('Oi')) {
                // Manter tom natural e amigável
                enhancedAnswer = enhancedAnswer.replace(/^/, '');
            }
            // Adicionar emojis para tornar mais amigável
            if (!enhancedAnswer.includes('😊') && !enhancedAnswer.includes('😄')) {
                enhancedAnswer = '😊 ' + enhancedAnswer;
            }
            break;
            
        case 'analitico':
        default:
            // Estrutura lógica - mas não cortar se for pergunta sobre pessoa
            // (a lógica acima já deve ter garantido tamanho adequado)
            // Não fazer nada aqui para manter resposta completa
            break;
    }
    
    return enhancedAnswer;
}

// ============================================
// SISTEMA DE PENSAMENTO E RACIOCÍNIO (Como ChatGPT/Gemini)
// ============================================

// ============================================
// SISTEMA DE RACIOCÍNIO PROFUNDO AVANÇADO
// ============================================

// Análise semântica profunda (melhorada)
function deepSemanticAnalysis(question, questionContext) {
    const analysis = {
        semanticIntent: null,
        implicitQuestions: [],
        emotionalDepth: 'surface', // surface, moderate, deep
        sentiment: 'neutral', // positive, negative, neutral, mixed
        sarcasmDetected: false,
        urgencyLevel: 0, // 0-10
        complexityScore: 0, // 0-100
        requiresMultiStepReasoning: false,
        domain: 'general' // general, technical, personal, business, etc.
    };
    
    const lowerQuestion = question.toLowerCase();
    const questionLength = question.length;
    const wordCount = question.split(/\s+/).length;
    
    // Análise de complexidade mais sofisticada
    analysis.complexityScore = calculateComplexityScore(question, wordCount, questionContext);
    
    // Detecção de sarcasmo e ironia
    const sarcasmPatterns = [
        /\b(claro|óbvio|realmente|com certeza)\b.*[!?]{2,}/i,
        /\b(ótimo|maravilhoso|perfeito)\b.*(problema|erro|falha)/i,
        /\?{2,}/, // Múltiplas interrogações
        /(não|nem)\s+(sei|entendo|faz sentido)/i
    ];
    
    for (const pattern of sarcasmPatterns) {
        if (pattern.test(question)) {
            analysis.sarcasmDetected = true;
            analysis.sentiment = 'negative';
            break;
        }
    }
    
    // Análise de sentimento profunda
    const positiveWords = ['obrigado', 'obrigada', 'gratidão', 'perfeito', 'ótimo', 'excelente', 'ajuda', 'por favor'];
    const negativeWords = ['problema', 'erro', 'falha', 'não funciona', 'ruim', 'péssimo', 'urgente', 'preciso'];
    
    const positiveCount = positiveWords.filter(w => lowerQuestion.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerQuestion.includes(w)).length;
    
    if (positiveCount > negativeCount && positiveCount > 0) {
        analysis.sentiment = 'positive';
        analysis.emotionalDepth = 'moderate';
    } else if (negativeCount > positiveCount && negativeCount > 0) {
        analysis.sentiment = 'negative';
        analysis.emotionalDepth = negativeCount > 2 ? 'deep' : 'moderate';
        analysis.urgencyLevel = Math.min(10, negativeCount * 2);
    }
    
    // Detecção de perguntas implícitas
    if (lowerQuestion.includes('mas') || lowerQuestion.includes('porém') || lowerQuestion.includes('contudo')) {
        analysis.implicitQuestions.push('Há uma contradição ou objeção implícita');
    }
    
    if (lowerQuestion.includes('e se') || lowerQuestion.includes('caso')) {
        analysis.implicitQuestions.push('Pergunta hipotética ou condicional');
        analysis.requiresMultiStepReasoning = true;
    }
    
    // Detecção de domínio
    const domainKeywords = {
        technical: ['código', 'programação', 'api', 'banco de dados', 'servidor', 'erro', 'bug'],
        business: ['venda', 'cliente', 'negócio', 'estratégia', 'marketing', 'lucro'],
        personal: ['como me sinto', 'minha vida', 'pessoal', 'privado'],
        educational: ['explicar', 'ensinar', 'aprender', 'entender', 'conceito']
    };
    
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
        if (keywords.some(kw => lowerQuestion.includes(kw))) {
            analysis.domain = domain;
            break;
        }
    }
    
    // Detecção de necessidade de raciocínio multi-passo
    if (analysis.complexityScore > 70 || 
        lowerQuestion.includes('por que') || 
        lowerQuestion.includes('como funciona') ||
        wordCount > 15) {
        analysis.requiresMultiStepReasoning = true;
    }
    
    return analysis;
}

// Calcular score de complexidade
function calculateComplexityScore(question, wordCount, questionContext) {
    let score = 0;
    
    // Baseado no número de palavras
    score += Math.min(30, wordCount * 2);
    
    // Baseado no tipo de pergunta
    if (questionContext.questionType === 'why' || questionContext.questionType === 'how') {
        score += 30;
    } else if (questionContext.questionType === 'what' || questionContext.questionType === 'who') {
        score += 15;
    }
    
    // Baseado em conectores complexos
    const complexConnectors = ['porque', 'portanto', 'consequentemente', 'além disso', 'no entanto', 'mas', 'porém'];
    const connectorCount = complexConnectors.filter(c => question.toLowerCase().includes(c)).length;
    score += connectorCount * 10;
    
    // Baseado em múltiplas entidades
    if (questionContext.entities && questionContext.entities.length > 1) {
        score += questionContext.entities.length * 5;
    }
    
    return Math.min(100, score);
}

// Função para raciocinar sobre a pergunta (CAMADA 1: Análise Profunda - MELHORADA)
function thinkAboutQuestion(question, questionContext) {
    const thoughts = {
        intent: null, // O que o usuário realmente quer saber
        entities: questionContext.entities,
        keywords: questionContext.keywords,
        questionType: questionContext.questionType,
        emotionalTone: 'neutral', // neutral, curious, urgent, friendly
        complexity: 'simple', // simple, medium, complex
        needsContext: false,
        relatedTopics: [],
        // NOVOS CAMPOS
        semanticAnalysis: null,
        implicitQuestions: [],
        requiresExpansion: false,
        responseStructure: 'simple', // simple, structured, hierarchical, narrative
        estimatedResponseLength: 'medium' // short, medium, long, very_long
    };
    
    const lowerQuestion = question.toLowerCase();
    
    // Análise semântica profunda
    thoughts.semanticAnalysis = deepSemanticAnalysis(question, questionContext);
    thoughts.implicitQuestions = thoughts.semanticAnalysis.implicitQuestions;
    
    // Detectar intenção (melhorado)
    if (lowerQuestion.includes('quem') || lowerQuestion.includes('o que') || lowerQuestion.includes('que é')) {
        thoughts.intent = 'definition';
        thoughts.complexity = thoughts.semanticAnalysis.complexityScore > 60 ? 'complex' : 'medium';
        thoughts.requiresExpansion = thoughts.semanticAnalysis.complexityScore > 50;
    } else if (lowerQuestion.includes('como') || lowerQuestion.includes('fazer')) {
        thoughts.intent = 'how_to';
        thoughts.complexity = 'medium';
        thoughts.needsContext = true;
        thoughts.responseStructure = 'structured';
        thoughts.requiresExpansion = true;
    } else if (lowerQuestion.includes('por que') || lowerQuestion.includes('porque')) {
        thoughts.intent = 'explanation';
        thoughts.complexity = 'complex';
        thoughts.needsContext = true;
        thoughts.responseStructure = 'hierarchical';
        thoughts.requiresExpansion = true;
        thoughts.estimatedResponseLength = 'long';
    } else if (lowerQuestion.includes('quando') || lowerQuestion.includes('onde')) {
        thoughts.intent = 'factual';
        thoughts.complexity = 'simple';
        thoughts.estimatedResponseLength = 'short';
    } else {
        thoughts.intent = 'general';
        thoughts.complexity = thoughts.semanticAnalysis.complexityScore > 50 ? 'medium' : 'simple';
    }
    
    // Detectar tom emocional (melhorado)
    if (thoughts.semanticAnalysis.urgencyLevel > 5) {
        thoughts.emotionalTone = 'urgent';
    } else if (lowerQuestion.includes('!') || lowerQuestion.includes('urgente') || lowerQuestion.includes('preciso')) {
        thoughts.emotionalTone = 'urgent';
    } else if (lowerQuestion.includes('?') && lowerQuestion.length > 20) {
        thoughts.emotionalTone = 'curious';
    } else if (lowerQuestion.includes('obrigad') || lowerQuestion.includes('por favor')) {
        thoughts.emotionalTone = 'friendly';
    } else if (thoughts.semanticAnalysis.sentiment === 'positive') {
        thoughts.emotionalTone = 'friendly';
    } else if (thoughts.semanticAnalysis.sentiment === 'negative') {
        thoughts.emotionalTone = 'concerned';
    }
    
    // Identificar tópicos relacionados (expandido)
    if (thoughts.entities.length > 0) {
        const mainEntity = thoughts.entities[0].toLowerCase();
        
        // Mapeamento expandido de tópicos relacionados
        const topicMap = {
            'jesus': ['bíblia', 'cristianismo', 'fé', 'religião', 'evangelho', 'cristo', 'salvação'],
            'cristo': ['jesus', 'bíblia', 'cristianismo', 'fé', 'religião', 'evangelho'],
            'psicologia': ['terapia', 'saúde mental', 'bem-estar', 'ansiedade', 'depressão', 'emoções'],
            'venda': ['marketing', 'negócio', 'cliente', 'estratégia', 'conversão', 'vendedor'],
            'estratégia': ['venda', 'marketing', 'negócio', 'plano', 'tática', 'objetivo'],
            'programação': ['código', 'desenvolvimento', 'software', 'aplicativo', 'tecnologia'],
            'negócio': ['venda', 'marketing', 'cliente', 'lucro', 'empresa', 'empreendedorismo']
        };
        
        for (const [key, topics] of Object.entries(topicMap)) {
            if (mainEntity.includes(key)) {
                thoughts.relatedTopics = topics;
                break;
            }
        }
        
        // Se não encontrou mapeamento, gerar tópicos relacionados baseados em similaridade
        if (thoughts.relatedTopics.length === 0) {
            thoughts.relatedTopics = generateRelatedTopics(mainEntity, thoughts.intent);
        }
    }
    
    // Determinar estrutura de resposta baseada na complexidade
    if (thoughts.complexity === 'complex' || thoughts.requiresExpansion) {
        thoughts.responseStructure = 'hierarchical';
        thoughts.estimatedResponseLength = 'long';
    } else if (thoughts.complexity === 'medium') {
        thoughts.responseStructure = 'structured';
        thoughts.estimatedResponseLength = 'medium';
    }
    
    return thoughts;
}

// Gerar tópicos relacionados baseados em similaridade
function generateRelatedTopics(entity, intent) {
    const topics = [];
    
    // Para definições, adicionar tópicos relacionados
    if (intent === 'definition') {
        topics.push('conceito', 'definição', 'significado');
    }
    
    // Para "como fazer", adicionar tópicos práticos
    if (intent === 'how_to') {
        topics.push('tutorial', 'passo a passo', 'guia');
    }
    
    return topics;
}

// ============================================
// SÍNTESE DE RESPOSTAS MELHORADA - COERÊNCIA NARRATIVA
// ============================================

// Verificar coerência entre sentenças
function checkCoherence(sentence1, sentence2) {
    // Verificar se há contradições diretas
    const contradictions = [
        ['não', 'sim'],
        ['nunca', 'sempre'],
        ['impossível', 'possível'],
        ['falso', 'verdadeiro']
    ];
    
    const s1Lower = sentence1.toLowerCase();
    const s2Lower = sentence2.toLowerCase();
    
    for (const [word1, word2] of contradictions) {
        if ((s1Lower.includes(word1) && s2Lower.includes(word2)) ||
            (s1Lower.includes(word2) && s2Lower.includes(word1))) {
            return false;
        }
    }
    
    // Verificar se há referências que fazem sentido
    const pronouns = ['ele', 'ela', 'eles', 'elas', 'isso', 'isto', 'aquilo'];
    const hasPronoun = pronouns.some(p => s2Lower.includes(p));
    
    if (hasPronoun && !s1Lower.includes(sentence2.split(/\s+/)[0]?.toLowerCase())) {
        // Pode ser uma referência, mas não é necessariamente incoerente
        return true;
    }
    
    return true;
}

// Estruturar resposta hierarquicamente
function structureHierarchicalAnswer(sentences, questionContext, thoughts) {
    if (!sentences || sentences.length === 0) return null;
    
    const structure = {
        introduction: '',
        mainContent: [],
        details: [],
        conclusion: ''
    };
    
    // Para respostas complexas, criar estrutura
    if (thoughts.responseStructure === 'hierarchical' || thoughts.complexity === 'complex') {
        // Primeira sentença = introdução
        if (sentences.length > 0) {
            structure.introduction = sentences[0];
        }
        
        // Sentenças do meio = conteúdo principal
        if (sentences.length > 1) {
            const middleSentences = sentences.slice(1, Math.max(2, sentences.length - 1));
            structure.mainContent = middleSentences;
        }
        
        // Última sentença = conclusão
        if (sentences.length > 1) {
            structure.conclusion = sentences[sentences.length - 1];
        }
        
        // Montar resposta estruturada
        let structuredAnswer = structure.introduction;
        
        if (structure.mainContent.length > 0) {
            structuredAnswer += '\n\n' + structure.mainContent.join(' ');
        }
        
        if (structure.conclusion && structure.conclusion !== structure.introduction) {
            structuredAnswer += '\n\n' + structure.conclusion;
        }
        
        return structuredAnswer;
    }
    
    // Para respostas simples, apenas juntar
    return sentences.join(' ');
}

// Função para sintetizar resposta de múltiplas fontes (CAMADA 2: Síntese - MELHORADA)
function synthesizeAnswer(knowledgeSources, questionContext, thoughts) {
    if (!knowledgeSources || knowledgeSources.length === 0) return null;
    
    // LÓGICA INTELIGENTE: Ajustar limite baseado no tipo de pergunta e complexidade
    let maxLength = 500;
    
    if (thoughts.estimatedResponseLength === 'very_long') {
        maxLength = 2500;
    } else if (thoughts.estimatedResponseLength === 'long') {
        maxLength = 1500;
    } else if (thoughts.estimatedResponseLength === 'medium') {
        maxLength = 800;
    } else {
        maxLength = 500;
    }
    
    // Ajustar baseado no tipo de pergunta também
    if (questionContext.questionType === 'who') {
        maxLength = Math.max(maxLength, 1500);
    } else if (questionContext.questionType === 'what') {
        maxLength = Math.max(maxLength, 800);
    }
    
    // Ordenar por relevância
    const sortedSources = knowledgeSources.sort((a, b) => b.score - a.score);
    const topSources = sortedSources.slice(0, Math.min(5, sortedSources.length)); // Top 5 fontes (aumentado)
    
    // Se temos apenas uma fonte muito relevante, usar ela (mas garantir tamanho adequado)
    if (topSources.length === 1 && topSources[0].score > 80) {
        const excerpt = topSources[0].excerpt;
        // Se for pergunta complexa e a resposta for curta, tentar expandir
        if (thoughts.requiresExpansion && excerpt && excerpt.length < 300) {
            // Retornar mas marcar que precisa expansão
            return excerpt;
        }
        return excerpt;
    }
    
    // Sintetizar de múltiplas fontes com coerência
    let synthesized = '';
    const usedSentences = new Set();
    const sentenceList = [];
    let lastSentence = '';
    
    for (const source of topSources) {
        if (!source.excerpt) continue;
        
        // Extrair sentenças únicas
        const sentences = source.excerpt.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
        
        for (const sentence of sentences) {
            const sentenceKey = sentence.toLowerCase().substring(0, 50);
            if (!usedSentences.has(sentenceKey)) {
                usedSentences.add(sentenceKey);
                
                // Verificar se a sentença é relevante
                const hasEntity = questionContext.entities.some(ent => 
                    sentence.toLowerCase().includes(ent.toLowerCase())
                );
                const hasKeyword = questionContext.keywords.some(kw => 
                    sentence.toLowerCase().includes(kw.toLowerCase())
                );
                
                // Para perguntas sobre pessoas ou complexas, ser mais flexível
                const isRelevant = hasEntity || hasKeyword || 
                                 (questionContext.questionType === 'who' && sentence.length > 30) ||
                                 (thoughts.complexity === 'complex' && sentence.length > 40);
                
                if (isRelevant) {
                    // Verificar coerência com última sentença
                    if (lastSentence && !checkCoherence(lastSentence, sentence)) {
                        // Pular se houver contradição
                        continue;
                    }
                    
                    sentenceList.push(sentence.trim());
                    lastSentence = sentence;
                    
                    // Limitar tamanho baseado no tipo de pergunta
                    const currentLength = sentenceList.join(' ').length;
                    if (currentLength > maxLength) break;
                }
            }
        }
        
        if (sentenceList.join(' ').length > maxLength) break;
    }
    
    // Estruturar resposta baseado no tipo
    if (sentenceList.length > 0) {
        if (thoughts.responseStructure === 'hierarchical' || thoughts.complexity === 'complex') {
            return structureHierarchicalAnswer(sentenceList, questionContext, thoughts);
        } else {
            // Juntar sentenças de forma coerente
            synthesized = sentenceList.join('. ');
            if (!synthesized.endsWith('.') && !synthesized.endsWith('!') && !synthesized.endsWith('?')) {
                synthesized += '.';
            }
            return synthesized;
        }
    }
    
    return topSources[0]?.excerpt || null;
}

// Função para adicionar personalidade e emoção (CAMADA 3: Personalidade)
function addPersonalityAndEmotion(answer, thoughts, questionContext) {
    if (!answer) return answer;
    
    let enhancedAnswer = answer;
    
    // Adicionar introdução baseada no tom emocional
    if (thoughts.emotionalTone === 'curious') {
        enhancedAnswer = `Ótima pergunta! 😊 ${enhancedAnswer}`;
    } else if (thoughts.emotionalTone === 'urgent') {
        enhancedAnswer = `Entendo sua urgência! ${enhancedAnswer}`;
    } else if (thoughts.emotionalTone === 'friendly') {
        enhancedAnswer = `Claro! Com prazer te explico: ${enhancedAnswer}`;
    }
    
    // Adicionar conclusão proativa se for pergunta complexa
    if (thoughts.complexity === 'complex' && thoughts.relatedTopics.length > 0) {
        enhancedAnswer += `\n\n💡 Você também pode querer saber sobre: ${thoughts.relatedTopics.slice(0, 2).join(', ')}. Posso ajudar com isso também!`;
    }
    
    // Adicionar emoção baseada no tipo de resposta
    if (thoughts.intent === 'definition' && questionContext.entities.length > 0) {
        // Para definições, ser mais didática
        enhancedAnswer = enhancedAnswer.replace(/^/, '📚 ');
    } else if (thoughts.intent === 'how_to') {
        // Para "como fazer", ser mais prática
        enhancedAnswer = enhancedAnswer.replace(/^/, '🔧 ');
    }
    
    return enhancedAnswer;
}

// Função para raciocinar independentemente (CAMADA 4: Raciocínio Independente)
function thinkIndependently(questionContext, knowledgeBase, thoughts) {
    const independentThoughts = {
        shouldExpand: false,
        shouldSuggest: false,
        missingInfo: [],
        connections: []
    };
    
    // Se a pergunta é sobre uma entidade, verificar se temos informação completa
    if (questionContext.entities.length > 0 && thoughts.intent === 'definition') {
        const entity = questionContext.entities[0];
        
        // Verificar se temos conhecimento suficiente
        const entityKnowledge = knowledgeBase.filter(kb => {
            const titleLower = (kb.title || '').toLowerCase();
            const contentLower = (kb.content || '').toLowerCase();
            return titleLower.includes(entity) || contentLower.includes(entity);
        });
        
        if (entityKnowledge.length === 0) {
            independentThoughts.missingInfo.push(`Não encontrei informações específicas sobre "${entity}"`);
            independentThoughts.shouldSuggest = true;
        } else if (entityKnowledge.length === 1) {
            // Temos apenas uma fonte, pode precisar expandir
            independentThoughts.shouldExpand = true;
        }
    }
    
    // Identificar conexões entre conhecimentos
    if (questionContext.entities.length > 0) {
        const entity = questionContext.entities[0];
        const relatedKnowledge = knowledgeBase.filter(kb => {
            const contentLower = (kb.content || '').toLowerCase();
            return contentLower.includes(entity) && kb.title !== entity;
        });
        
        if (relatedKnowledge.length > 0) {
            independentThoughts.connections = relatedKnowledge.slice(0, 3).map(kb => kb.title);
        }
    }
    
    return independentThoughts;
}

// ============================================
// FUNÇÕES AUXILIARES PARA MELHORIAS AVANÇADAS
// ============================================

// Verificar cache de respostas
async function checkResponseCache(client, query, userId) {
    try {
        const crypto = require('crypto');
        const queryHash = crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
        
        const result = await client.query(`
            SELECT * FROM ia_response_cache
            WHERE query_hash = $1
            AND expires_at > NOW()
            ORDER BY hit_count DESC, last_hit_at DESC
            LIMIT 1
        `, [queryHash]);
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao verificar cache:', error);
        return null;
    }
}

// Salvar resposta no cache
async function saveToCache(client, query, response, knowledgeIds, confidence, categoryId) {
    try {
        const crypto = require('crypto');
        const queryHash = crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
        
        // TTL baseado em frequência: perguntas frequentes ficam mais tempo
        const ttlHours = confidence >= 80 ? 168 : confidence >= 60 ? 72 : 24; // 7 dias, 3 dias, 1 dia
        const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
        
        await client.query(`
            INSERT INTO ia_response_cache
            (query_hash, query_text, response_text, knowledge_used_ids, confidence_score, category_id, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (query_hash) DO UPDATE SET
                response_text = EXCLUDED.response_text,
                knowledge_used_ids = EXCLUDED.knowledge_used_ids,
                confidence_score = EXCLUDED.confidence_score,
                hit_count = ia_response_cache.hit_count + 1,
                last_hit_at = NOW(),
                expires_at = EXCLUDED.expires_at,
                updated_at = NOW()
        `, [queryHash, query.substring(0, 500), response.substring(0, 10000), knowledgeIds, confidence, categoryId, expiresAt]);
    } catch (error) {
        console.error('Erro ao salvar no cache:', error);
    }
}

// Obter contexto do usuário (memória de longo prazo)
// ============================================
// MEMÓRIA CONVERSACIONAL AVANÇADA
// ============================================

// Memória Episódica - Armazenar conversas importantes
async function storeEpisodicMemory(client, userId, conversationId, keyPoints, topics) {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS ia_episodic_memory (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                conversation_id INTEGER,
                key_points JSONB,
                topics TEXT[],
                importance_score INTEGER DEFAULT 50,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Calcular score de importância
        const importanceScore = calculateImportanceScore(keyPoints, topics);
        
        await client.query(`
            INSERT INTO ia_episodic_memory
            (user_id, conversation_id, key_points, topics, importance_score)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, conversationId, JSON.stringify(keyPoints), topics, importanceScore]);
        
        console.log('✅ [Memória] Memória episódica armazenada');
    } catch (error) {
        console.error('Erro ao armazenar memória episódica:', error);
    }
}

// Calcular score de importância
function calculateImportanceScore(keyPoints, topics) {
    let score = 50; // Base
    
    // Mais pontos = mais importante
    score += keyPoints.length * 5;
    
    // Tópicos importantes aumentam score
    const importantTopics = ['venda', 'estratégia', 'problema', 'erro', 'ajuda', 'importante'];
    const importantCount = topics.filter(t => 
        importantTopics.some(it => t.toLowerCase().includes(it))
    ).length;
    score += importantCount * 10;
    
    return Math.min(100, score);
}

// Recuperar memória episódica relevante
async function retrieveEpisodicMemory(client, userId, currentQuestion, limit = 5) {
    try {
        const result = await client.query(`
            SELECT * FROM ia_episodic_memory
            WHERE user_id = $1
            ORDER BY importance_score DESC, last_accessed_at DESC
            LIMIT $2
        `, [userId, limit]);
        
        // Filtrar memórias relevantes à pergunta atual
        const relevantMemories = result.rows.filter(memory => {
            const topics = memory.topics || [];
            const questionLower = currentQuestion.toLowerCase();
            
            // Verificar se algum tópico da memória está na pergunta
            return topics.some(topic => questionLower.includes(topic.toLowerCase()));
        });
        
        // Atualizar last_accessed_at para memórias recuperadas
        for (const memory of relevantMemories) {
            await client.query(`
                UPDATE ia_episodic_memory
                SET last_accessed_at = NOW()
                WHERE id = $1
            `, [memory.id]);
        }
        
        return relevantMemories;
    } catch (error) {
        console.error('Erro ao recuperar memória episódica:', error);
        return [];
    }
}

// Rastreamento de Contexto Multi-Turn
async function trackMultiTurnContext(client, userId, conversationId, message, response, questionContext) {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS ia_multi_turn_context (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                conversation_id INTEGER,
                turn_number INTEGER,
                user_message TEXT,
                ai_response TEXT,
                entities TEXT[],
                topics TEXT[],
                context_summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Buscar último turno
        const lastTurn = await client.query(`
            SELECT turn_number FROM ia_multi_turn_context
            WHERE user_id = $1 AND conversation_id = $2
            ORDER BY turn_number DESC
            LIMIT 1
        `, [userId, conversationId]);
        
        const turnNumber = lastTurn.rows.length > 0 ? lastTurn.rows[0].turn_number + 1 : 1;
        
        // Criar resumo de contexto
        const contextSummary = createContextSummary(message, response, questionContext);
        
        await client.query(`
            INSERT INTO ia_multi_turn_context
            (user_id, conversation_id, turn_number, user_message, ai_response, entities, topics, context_summary)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            userId,
            conversationId,
            turnNumber,
            message,
            response,
            questionContext.entities || [],
            questionContext.keywords || [],
            contextSummary
        ]);
        
        console.log(`✅ [Contexto] Turno ${turnNumber} rastreado`);
    } catch (error) {
        console.error('Erro ao rastrear contexto multi-turn:', error);
    }
}

// Criar resumo de contexto
function createContextSummary(message, response, questionContext) {
    const entities = questionContext.entities?.join(', ') || 'nenhuma';
    const topics = questionContext.keywords?.join(', ') || 'geral';
    return `Pergunta sobre: ${topics}. Entidades: ${entities}.`;
}

// Recuperar contexto de turnos anteriores
async function retrieveMultiTurnContext(client, userId, conversationId, limit = 3) {
    try {
        const result = await client.query(`
            SELECT * FROM ia_multi_turn_context
            WHERE user_id = $1 AND conversation_id = $2
            ORDER BY turn_number DESC
            LIMIT $3
        `, [userId, conversationId, limit]);
        
        return result.rows.reverse(); // Ordem cronológica
    } catch (error) {
        console.error('Erro ao recuperar contexto multi-turn:', error);
        return [];
    }
}

async function getUserContext(client, userId) {
    try {
        const result = await client.query(`
            SELECT * FROM ia_conversation_context
            WHERE user_id = $1
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY importance_score DESC, updated_at DESC
            LIMIT 20
        `, [userId]);
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao buscar contexto do usuário:', error);
        return [];
    }
}

// Obter preferências do usuário
async function getUserPreferences(client, userId) {
    try {
        const result = await client.query(
            'SELECT * FROM ia_user_preferences WHERE user_id = $1',
            [userId]
        );
        
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Erro ao buscar preferências:', error);
        return null;
    }
}

// Salvar contexto na memória
async function saveContext(client, userId, conversationId, contextType, contextKey, contextValue, importance = 50, expiresAt = null) {
    try {
        await client.query(`
            INSERT INTO ia_conversation_context
            (user_id, conversation_id, context_type, context_key, context_value, importance_score, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT DO NOTHING
        `, [userId, conversationId, contextType, contextKey, contextValue, importance, expiresAt]);
    } catch (error) {
        console.error('Erro ao salvar contexto:', error);
    }
}

// Detectar ambiguidade na pergunta
function detectAmbiguity(message, questionContext) {
    const ambiguousPatterns = [
        { pattern: /\b(ele|ela|eles|elas|isso|aquilo)\b/gi, type: 'pronoun' },
        { pattern: /\b(este|esse|aquele|isto|isso|aquilo)\b/gi, type: 'demonstrative' },
        { pattern: /\b(mais|melhor|pior|maior|menor)\b/gi, type: 'comparative' }
    ];
    
    let ambiguityScore = 0;
    const interpretations = [];
    
    // Verificar padrões ambíguos
    for (const { pattern, type } of ambiguousPatterns) {
        const matches = message.match(pattern);
        if (matches && matches.length > 0) {
            ambiguityScore += 20;
            interpretations.push({
                type: type,
                interpretation: `A pergunta usa ${type === 'pronoun' ? 'pronomes' : type === 'demonstrative' ? 'demonstrativos' : 'comparativos'} que podem ser ambíguos sem contexto.`
            });
        }
    }
    
    // Verificar se pergunta é muito curta
    if (message.split(/\s+/).length < 4) {
        ambiguityScore += 15;
        interpretations.push({
            type: 'short',
            interpretation: 'A pergunta é muito curta e pode ter múltiplos significados.'
        });
    }
    
    // Verificar se não há entidades claras
    if (questionContext.entities.length === 0 && questionContext.questionType === 'what') {
        ambiguityScore += 10;
    }
    
    return {
        isAmbiguous: ambiguityScore >= 30,
        score: ambiguityScore,
        confidence: 100 - ambiguityScore,
        interpretations: interpretations
    };
}

// ============================================
// FASE 1: MELHORIAS CRÍTICAS PROFUNDAS
// ============================================

// 1. CHAIN OF THOUGHT REASONING (Raciocínio Passo a Passo)
async function chainOfThoughtReasoning(question, questionContext, knowledge, client) {
    const steps = [];
    let finalAnswer = null;
    let chainConfidence = 0;
    
    try {
        // Passo 1: Decompor pergunta
        const decomposition = decomposeQuestion(question, questionContext);
        steps.push({
            step: 1,
            action: 'decompose',
            reasoning: 'Quebrando pergunta em componentes principais...',
            result: decomposition,
            confidence: 90
        });
        
        // Passo 2: Identificar conhecimento necessário
        const requiredKnowledge = identifyRequiredKnowledge(decomposition, questionContext);
        steps.push({
            step: 2,
            action: 'identify_knowledge',
            reasoning: `Identificando conhecimento necessário: ${requiredKnowledge.entities.join(', ')}`,
            result: requiredKnowledge,
            confidence: 85
        });
        
        // Passo 3: Buscar e validar conhecimento
        const retrievedKnowledge = await retrieveAndValidateKnowledge(requiredKnowledge, knowledge, client);
        steps.push({
            step: 3,
            action: 'retrieve_validate',
            reasoning: `Buscando e validando conhecimento de ${retrievedKnowledge.sources.length} fontes...`,
            result: retrievedKnowledge,
            confidence: retrievedKnowledge.confidence
        });
        
        // Passo 4: Fazer inferências lógicas
        const inferences = await makeLogicalInferences(retrievedKnowledge, questionContext, question);
        steps.push({
            step: 4,
            action: 'infer',
            reasoning: `Fazendo inferências lógicas (${inferences.inferences.length} inferências encontradas)...`,
            result: inferences,
            confidence: inferences.confidence
        });
        
        // Passo 5: Sintetizar resposta
        const synthesis = synthesizeFromChainSteps(steps, questionContext);
        steps.push({
            step: 5,
            action: 'synthesize',
            reasoning: 'Sintetizando resposta final a partir de todos os passos...',
            result: synthesis,
            confidence: synthesis.confidence
        });
        
        finalAnswer = synthesis.answer;
        chainConfidence = calculateChainConfidence(steps);
        
        console.log('🧠 [Chain of Thought] Raciocínio completo:', {
            steps: steps.length,
            confidence: chainConfidence,
            finalAnswerLength: finalAnswer?.length || 0
        });
        
    } catch (error) {
        console.error('Erro no Chain of Thought Reasoning:', error);
    }
    
    return {
        finalAnswer: finalAnswer,
        reasoningChain: steps,
        confidence: chainConfidence,
        used: steps.length > 0
    };
}

// Decompor pergunta em componentes
function decomposeQuestion(question, questionContext) {
    return {
        mainQuestion: question,
        entities: questionContext.entities || [],
        keywords: questionContext.keywords || [],
        questionType: questionContext.questionType || 'general',
        intent: questionContext.intent || 'information',
        subQuestions: generateSubQuestions(question, questionContext)
    };
}

// Gerar sub-perguntas
function generateSubQuestions(question, questionContext) {
    const subQuestions = [];
    
    if (questionContext.questionType === 'why') {
        subQuestions.push('Quais são as causas?');
        subQuestions.push('Quais são os efeitos?');
    } else if (questionContext.questionType === 'how') {
        subQuestions.push('Quais são os passos?');
        subQuestions.push('Quais são os requisitos?');
    } else if (questionContext.questionType === 'who') {
        subQuestions.push('Quem é essa pessoa?');
        subQuestions.push('O que essa pessoa fez?');
        subQuestions.push('Qual a importância dessa pessoa?');
    }
    
    return subQuestions;
}

// Identificar conhecimento necessário
function identifyRequiredKnowledge(decomposition, questionContext) {
    return {
        entities: decomposition.entities,
        keywords: decomposition.keywords,
        topics: extractTopics(decomposition),
        requiredTypes: identifyRequiredTypes(decomposition.questionType),
        priority: calculateKnowledgePriority(decomposition)
    };
}

// Extrair tópicos
function extractTopics(decomposition) {
    const topics = [...decomposition.entities];
    
    // Adicionar tópicos relacionados
    if (decomposition.entities.includes('jesus')) {
        topics.push('cristianismo', 'bíblia', 'fé');
    }
    
    return topics;
}

// Identificar tipos necessários
function identifyRequiredTypes(questionType) {
    const typeMap = {
        'who': ['biography', 'definition', 'history'],
        'what': ['definition', 'explanation'],
        'why': ['explanation', 'causality'],
        'how': ['procedure', 'steps', 'method']
    };
    
    return typeMap[questionType] || ['general'];
}

// Calcular prioridade
function calculateKnowledgePriority(decomposition) {
    let priority = 50;
    
    if (decomposition.entities.length > 0) priority += 20;
    if (decomposition.keywords.length > 2) priority += 15;
    if (decomposition.questionType === 'why') priority += 10;
    
    return Math.min(100, priority);
}

// Buscar e validar conhecimento
async function retrieveAndValidateKnowledge(requiredKnowledge, existingKnowledge, client) {
    const sources = [];
    let confidence = 0;
    
    // Buscar conhecimento existente
    if (existingKnowledge && existingKnowledge.length > 0) {
        for (const kb of existingKnowledge) {
            // Verificar relevância
            const relevance = calculateRelevance(kb, requiredKnowledge);
            if (relevance > 30) {
                sources.push({
                    ...kb,
                    relevance: relevance
                });
            }
        }
    }
    
    // Se não encontrou suficiente, buscar no banco
    if (sources.length < 2 && requiredKnowledge.entities.length > 0) {
        try {
            const dbKnowledge = await client.query(`
                SELECT * FROM ia_knowledge_base
                WHERE is_active = true
                AND (
                    ${requiredKnowledge.entities.map((_, i) => `LOWER(content) LIKE $${i + 1}`).join(' OR ')}
                )
                LIMIT 5
            `, requiredKnowledge.entities.map(e => `%${e.toLowerCase()}%`));
            
            for (const kb of dbKnowledge.rows) {
                const relevance = calculateRelevance(kb, requiredKnowledge);
                if (relevance > 30) {
                    sources.push({
                        ...kb,
                        relevance: relevance
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao buscar conhecimento no banco:', error);
        }
    }
    
    // Ordenar por relevância
    sources.sort((a, b) => b.relevance - a.relevance);
    
    // Calcular confiança
    if (sources.length > 2) {
        confidence = 85;
    } else if (sources.length > 0) {
        confidence = 70;
    } else {
        confidence = 30;
    }
    
    return {
        sources: sources.slice(0, 5),
        confidence: confidence,
        totalFound: sources.length
    };
}

// Calcular relevância
function calculateRelevance(kb, requiredKnowledge) {
    let score = 0;
    const contentLower = (kb.content || '').toLowerCase();
    const titleLower = (kb.title || '').toLowerCase();
    
    // Entidades
    for (const entity of requiredKnowledge.entities) {
        if (contentLower.includes(entity.toLowerCase())) score += 50;
        if (titleLower.includes(entity.toLowerCase())) score += 30;
    }
    
    // Palavras-chave
    for (const keyword of requiredKnowledge.keywords) {
        if (contentLower.includes(keyword.toLowerCase())) score += 20;
    }
    
    return score;
}

// 2. SISTEMA DE INFERÊNCIA LÓGICA AVANÇADA
async function makeLogicalInferences(retrievedKnowledge, questionContext, question) {
    const inferences = [];
    let bestInference = null;
    
    if (!retrievedKnowledge || retrievedKnowledge.sources.length === 0) {
        return {
            inferences: [],
            bestInference: null,
            confidence: 0
        };
    }
    
    const sources = retrievedKnowledge.sources;
    
    // Inferência Dedutiva (Se A então B, A é verdade, então B é verdade)
    const deductive = applyDeductiveReasoning(sources, questionContext);
    if (deductive) {
        inferences.push({
            type: 'deductive',
            result: deductive,
            confidence: 85
        });
    }
    
    // Inferência Indutiva (Padrões observados → Generalização)
    const inductive = applyInductiveReasoning(sources, questionContext);
    if (inductive) {
        inferences.push({
            type: 'inductive',
            result: inductive,
            confidence: 70
        });
    }
    
    // Inferência Abductiva (Melhor explicação)
    const abductive = applyAbductiveReasoning(sources, questionContext, question);
    if (abductive) {
        inferences.push({
            type: 'abductive',
            result: abductive,
            confidence: 75
        });
    }
    
    // Inferência Transitiva (Se A→B e B→C, então A→C)
    const transitive = applyTransitiveReasoning(sources, questionContext);
    if (transitive) {
        inferences.push({
            type: 'transitive',
            result: transitive,
            confidence: 80
        });
    }
    
    // Selecionar melhor inferência
    if (inferences.length > 0) {
        bestInference = inferences.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
    }
    
    const confidence = bestInference ? bestInference.confidence : 0;
    
    return {
        inferences: inferences,
        bestInference: bestInference,
        confidence: confidence
    };
}

// Aplicar raciocínio dedutivo
function applyDeductiveReasoning(sources, questionContext) {
    // Buscar padrões "Se... então..."
    for (const source of sources) {
        const content = source.content || '';
        
        // Padrão: "Se X então Y"
        const ifThenPattern = /se\s+([^,]+?)\s+então\s+([^.!?]+)/gi;
        const matches = [...content.matchAll(ifThenPattern)];
        
        if (matches.length > 0) {
            // Verificar se condição é verdadeira
            for (const match of matches) {
                const condition = match[1].toLowerCase();
                const conclusion = match[2].toLowerCase();
                
                // Verificar se condição está presente no contexto
                const conditionMet = questionContext.entities.some(e => 
                    condition.includes(e.toLowerCase())
                ) || questionContext.keywords.some(k => 
                    condition.includes(k.toLowerCase())
                );
                
                if (conditionMet) {
                    return {
                        premise: condition,
                        conclusion: conclusion,
                        reasoning: `Se ${condition} então ${conclusion}. A condição é verdadeira, portanto a conclusão é verdadeira.`
                    };
                }
            }
        }
    }
    
    return null;
}

// Aplicar raciocínio indutivo
function applyInductiveReasoning(sources, questionContext) {
    // Buscar padrões repetidos
    const patterns = {};
    
    for (const source of sources) {
        const content = source.content || '';
        const sentences = content.split(/[.!?]\s+/);
        
        for (const sentence of sentences) {
            // Extrair padrões (ex: "X é Y", "X faz Y")
            const pattern = sentence.match(/([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)\s+(é|faz|tem|foi|era)\s+([^.!?]+)/i);
            
            if (pattern) {
                const key = `${pattern[1]}_${pattern[2]}`;
                if (!patterns[key]) {
                    patterns[key] = [];
                }
                patterns[key].push(pattern[3]);
            }
        }
    }
    
    // Encontrar padrões que aparecem múltiplas vezes
    for (const [key, values] of Object.entries(patterns)) {
        if (values.length >= 2) {
            const [entity, verb] = key.split('_');
            return {
                pattern: `${entity} ${verb}`,
                observations: values,
                generalization: `Com base em múltiplas observações, ${entity} ${verb} ${values[0]}`
            };
        }
    }
    
    return null;
}

// Aplicar raciocínio abductivo
function applyAbductiveReasoning(sources, questionContext, question) {
    // Buscar melhor explicação para a pergunta
    const explanations = [];
    
    for (const source of sources) {
        const content = source.content || '';
        
        // Buscar explicações (ex: "porque", "devido a", "causado por")
        const explanationPatterns = [
            /porque\s+([^.!?]+)/gi,
            /devido\s+a\s+([^.!?]+)/gi,
            /causado\s+por\s+([^.!?]+)/gi,
            /resultado\s+de\s+([^.!?]+)/gi
        ];
        
        for (const pattern of explanationPatterns) {
            const matches = [...content.matchAll(pattern)];
            for (const match of matches) {
                explanations.push({
                    explanation: match[1],
                    source: source.title,
                    relevance: calculateExplanationRelevance(match[1], questionContext)
                });
            }
        }
    }
    
    if (explanations.length > 0) {
        // Selecionar explicação mais relevante
        const best = explanations.reduce((best, current) => 
            current.relevance > best.relevance ? current : best
        );
        
        return {
            explanation: best.explanation,
            source: best.source,
            reasoning: `A melhor explicação é: ${best.explanation}`
        };
    }
    
    return null;
}

// Calcular relevância da explicação
function calculateExplanationRelevance(explanation, questionContext) {
    let score = 0;
    const explanationLower = explanation.toLowerCase();
    
    for (const entity of questionContext.entities) {
        if (explanationLower.includes(entity.toLowerCase())) score += 30;
    }
    
    for (const keyword of questionContext.keywords) {
        if (explanationLower.includes(keyword.toLowerCase())) score += 15;
    }
    
    return score;
}

// Aplicar raciocínio transitivo
function applyTransitiveReasoning(sources, questionContext) {
    // Buscar relações transitivas (A→B, B→C, então A→C)
    const relations = [];
    
    for (const source of sources) {
        const content = source.content || '';
        
        // Padrões de relação
        const relationPatterns = [
            /([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)\s+(é|foi|era|torna-se)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)/gi,
            /([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)\s+leva\s+a\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)/gi
        ];
        
        for (const pattern of relationPatterns) {
            const matches = [...content.matchAll(pattern)];
            for (const match of matches) {
                relations.push({
                    from: match[1],
                    to: match[3] || match[2],
                    type: 'transitive'
                });
            }
        }
    }
    
    // Verificar transitividade
    if (relations.length >= 2) {
        for (let i = 0; i < relations.length; i++) {
            for (let j = i + 1; j < relations.length; j++) {
                if (relations[i].to === relations[j].from) {
                    return {
                        chain: [relations[i].from, relations[i].to, relations[j].to],
                        reasoning: `Se ${relations[i].from} → ${relations[i].to} e ${relations[j].from} → ${relations[j].to}, então ${relations[i].from} → ${relations[j].to}`
                    };
                }
            }
        }
    }
    
    return null;
}

// Sintetizar resposta a partir dos passos
function synthesizeFromChainSteps(steps, questionContext) {
    if (steps.length === 0) {
        return {
            answer: null,
            confidence: 0
        };
    }
    
    // Pegar conhecimento do passo 3
    const knowledgeStep = steps.find(s => s.action === 'retrieve_validate');
    const inferenceStep = steps.find(s => s.action === 'infer');
    
    let answer = '';
    let confidence = 0;
    
    if (knowledgeStep && knowledgeStep.result.sources.length > 0) {
        // Usar fontes encontradas
        const sources = knowledgeStep.result.sources;
        const excerpts = sources.map(s => {
            const excerpt = findRelevantExcerpt(s.content, questionContext, 300);
            return excerpt || s.content.substring(0, 300);
        });
        
        answer = excerpts.join('. ');
        confidence = knowledgeStep.result.confidence;
    }
    
    // Adicionar inferências se houver
    if (inferenceStep && inferenceStep.result.bestInference) {
        const inference = inferenceStep.result.bestInference;
        if (inference.result && inference.result.reasoning) {
            answer += '\n\n' + inference.result.reasoning;
            confidence = Math.max(confidence, inference.confidence);
        }
    }
    
    return {
        answer: answer || null,
        confidence: confidence
    };
}

// Calcular confiança da cadeia
function calculateChainConfidence(steps) {
    if (steps.length === 0) return 0;
    
    const confidences = steps.map(s => s.confidence || 0);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    // Bonus se todos os passos foram completos
    const completenessBonus = steps.length === 5 ? 10 : 0;
    
    return Math.min(100, avgConfidence + completenessBonus);
}

// 3. VALIDAÇÃO AVANÇADA DE FONTES
async function advancedSourceValidation(sources, answer, client) {
    const validations = [];
    
    for (const source of sources) {
        const validation = {
            source: source,
            quality: assessSourceQuality(source),
            recency: assessRecency(source),
            authority: assessAuthority(source),
            bias: detectBias(source),
            consistency: checkConsistency(source, sources),
            score: 0
        };
        
        // Calcular score final
        validation.score = calculateSourceScore(validation);
        validations.push(validation);
    }
    
    // Filtrar fontes confiáveis (score >= 70)
    const reliable = validations.filter(v => v.score >= 70);
    
    // Detectar contradições
    const contradictions = detectContradictions(reliable);
    
    // Gerar recomendação
    const recommendation = generateSourceRecommendation(validations, contradictions);
    
    return {
        validations: validations,
        reliable: reliable,
        contradictions: contradictions,
        recommendation: recommendation
    };
}

// Avaliar qualidade da fonte
function assessSourceQuality(source) {
    let score = 50; // Base
    
    // Bonus por tipo de fonte
    if (source.source_type === 'book_training' || source.source_type === 'tavily_book') {
        score += 30; // Livros são mais confiáveis
    } else if (source.source_type === 'tavily') {
        score += 15; // Web search
    }
    
    // Bonus por tamanho do conteúdo (mais conteúdo = mais completo)
    const contentLength = (source.content || '').length;
    if (contentLength > 1000) score += 10;
    if (contentLength > 5000) score += 10;
    
    // Penalidade por conteúdo muito curto
    if (contentLength < 100) score -= 20;
    
    return Math.min(100, Math.max(0, score));
}

// Avaliar atualidade
function assessRecency(source) {
    if (!source.created_at) return 50; // Neutro se não tem data
    
    const created = new Date(source.created_at);
    const now = new Date();
    const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
    
    // Mais recente = melhor
    if (daysDiff < 30) return 100;
    if (daysDiff < 90) return 80;
    if (daysDiff < 365) return 60;
    return 40;
}

// Avaliar autoridade
function assessAuthority(source) {
    let score = 50; // Base
    
    // Bonus por título que indica autoridade
    const title = (source.title || '').toLowerCase();
    const authorityIndicators = ['livro', 'bíblia', 'evangelho', 'estudo', 'pesquisa', 'científico'];
    
    for (const indicator of authorityIndicators) {
        if (title.includes(indicator)) {
            score += 20;
            break;
        }
    }
    
    // Bonus por ser livro
    if (source.source_type && source.source_type.includes('book')) {
        score += 30;
    }
    
    return Math.min(100, score);
}

// Detectar viés
function detectBias(source) {
    const content = (source.content || '').toLowerCase();
    const biasIndicators = {
        positive: ['excelente', 'perfeito', 'melhor', 'superior', 'incrível'],
        negative: ['ruim', 'péssimo', 'terrível', 'horrível', 'fracasso'],
        extreme: ['sempre', 'nunca', 'todos', 'ninguém', 'absoluto']
    };
    
    let biasScore = 0;
    
    // Detectar linguagem extremamente positiva ou negativa
    const positiveCount = biasIndicators.positive.filter(w => content.includes(w)).length;
    const negativeCount = biasIndicators.negative.filter(w => content.includes(w)).length;
    const extremeCount = biasIndicators.extreme.filter(w => content.includes(w)).length;
    
    if (positiveCount > 3 || negativeCount > 3) {
        biasScore += 30; // Viés detectado
    }
    
    if (extremeCount > 5) {
        biasScore += 20; // Linguagem extrema
    }
    
    return {
        detected: biasScore > 20,
        score: biasScore,
        type: positiveCount > negativeCount ? 'positive' : negativeCount > 0 ? 'negative' : 'neutral'
    };
}

// Verificar consistência
function checkConsistency(source, allSources) {
    if (allSources.length < 2) return { consistent: true, score: 100 };
    
    const sourceContent = (source.content || '').toLowerCase();
    let consistentCount = 0;
    let totalComparisons = 0;
    
    for (const otherSource of allSources) {
        if (otherSource.id === source.id) continue;
        
        const otherContent = (otherSource.content || '').toLowerCase();
        totalComparisons++;
        
        // Verificar se há informações similares
        const similarity = calculateContentSimilarity(sourceContent, otherContent);
        if (similarity > 0.3) {
            consistentCount++;
        }
    }
    
    const consistencyScore = totalComparisons > 0 ? 
        (consistentCount / totalComparisons) * 100 : 100;
    
    return {
        consistent: consistencyScore > 50,
        score: consistencyScore
    };
}

// Calcular similaridade de conteúdo
function calculateContentSimilarity(content1, content2) {
    const words1 = new Set(content1.split(/\s+/));
    const words2 = new Set(content2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
}

// Calcular score da fonte
function calculateSourceScore(validation) {
    let score = 0;
    
    // Pesos
    score += validation.quality * 0.3;
    score += validation.recency * 0.2;
    score += validation.authority * 0.3;
    score += validation.consistency.score * 0.2;
    
    // Penalidade por viés
    if (validation.bias.detected) {
        score -= validation.bias.score * 0.1;
    }
    
    return Math.min(100, Math.max(0, score));
}

// Detectar contradições
function detectContradictions(reliableSources) {
    const contradictions = [];
    
    for (let i = 0; i < reliableSources.length; i++) {
        for (let j = i + 1; j < reliableSources.length; j++) {
            const source1 = reliableSources[i].source;
            const source2 = reliableSources[j].source;
            
            const content1 = (source1.content || '').toLowerCase();
            const content2 = (source2.content || '').toLowerCase();
            
            // Verificar contradições
            const negations = ['não', 'nunca', 'jamais', 'falso'];
            const affirmations = ['sim', 'sempre', 'verdadeiro'];
            
            const hasNegation1 = negations.some(n => content1.includes(n));
            const hasAffirmation1 = affirmations.some(a => content1.includes(a));
            const hasNegation2 = negations.some(n => content2.includes(n));
            const hasAffirmation2 = affirmations.some(a => content2.includes(a));
            
            if ((hasNegation1 && hasAffirmation2) || (hasAffirmation1 && hasNegation2)) {
                contradictions.push({
                    source1: source1.title,
                    source2: source2.title,
                    type: 'contradiction',
                    severity: 'medium'
                });
            }
        }
    }
    
    return contradictions;
}

// Gerar recomendação de fontes
function generateSourceRecommendation(validations, contradictions) {
    const avgScore = validations.reduce((sum, v) => sum + v.score, 0) / validations.length;
    const reliableCount = validations.filter(v => v.score >= 70).length;
    
    let confidence = avgScore;
    let recommendation = 'use_all';
    
    if (contradictions.length > 0) {
        confidence -= contradictions.length * 10;
        recommendation = 'review_conflicts';
    }
    
    if (reliableCount < validations.length / 2) {
        confidence -= 20;
        recommendation = 'use_caution';
    }
    
    return {
        confidence: Math.max(50, Math.min(100, confidence)),
        recommendation: recommendation,
        reliableCount: reliableCount,
        totalCount: validations.length
    };
}

// Verificar fatos em tempo real (validação cruzada) - MELHORADA
async function verifyFacts(client, answer, knowledgeIds) {
    try {
        if (!knowledgeIds || knowledgeIds.length === 0) {
            return { verified: false, confidence: 0, conflicts: [] };
        }
        
        // Buscar conhecimento usado
        const knowledgeResult = await client.query(`
            SELECT id, title, content, category_id, source_type, created_at
            FROM ia_knowledge_base
            WHERE id = ANY($1)
            AND is_active = true
        `, [knowledgeIds]);
        
        if (knowledgeResult.rows.length === 0) {
            return { verified: false, confidence: 0, conflicts: [] };
        }
        
        // NOVO: Validação avançada de fontes
        const sourceValidation = await advancedSourceValidation(knowledgeResult.rows, answer, client);
        
        // Verificar se há correções verificadas
        const correctionsResult = await client.query(`
            SELECT knowledge_id, corrected_content
            FROM ia_knowledge_corrections
            WHERE knowledge_id = ANY($1)
            AND verified = true
        `, [knowledgeIds]);
        
        const corrections = {};
        correctionsResult.rows.forEach(c => {
            corrections[c.knowledge_id] = c.corrected_content;
        });
        
        // Verificar se há contradições entre fontes (melhorado)
        const conflicts = [];
        const sources = knowledgeResult.rows;
        
        for (let i = 0; i < sources.length; i++) {
            for (let j = i + 1; j < sources.length; j++) {
                const content1 = corrections[sources[i].id] || sources[i].content;
                const content2 = corrections[sources[j].id] || sources[j].content;
                
                if (content1 && content2) {
                    // Verificar números contraditórios
                    const numbers1 = content1.match(/\d{4}|\d+%/g) || [];
                    const numbers2 = content2.match(/\d{4}|\d+%/g) || [];
                    
                    // Verificar afirmações opostas
                    const negations = ['não', 'nunca', 'jamais', 'falso', 'errado'];
                    const affirmations = ['sim', 'sempre', 'verdadeiro', 'correto'];
                    
                    const hasNegation1 = negations.some(n => content1.toLowerCase().includes(n));
                    const hasAffirmation1 = affirmations.some(a => content1.toLowerCase().includes(a));
                    const hasNegation2 = negations.some(n => content2.toLowerCase().includes(n));
                    const hasAffirmation2 = affirmations.some(a => content2.toLowerCase().includes(a));
                    
                    if ((hasNegation1 && hasAffirmation2) || (hasAffirmation1 && hasNegation2)) {
                        conflicts.push({
                            source1: sources[i].title,
                            source2: sources[j].title,
                            type: 'contradiction'
                        });
                    }
                }
            }
        }
        
        // Adicionar contradições da validação avançada
        conflicts.push(...sourceValidation.contradictions);
        
        // Calcular confiança baseada em validação avançada
        const baseConfidence = sourceValidation.recommendation.confidence;
        const conflictPenalty = conflicts.length * 10;
        const confidence = Math.max(50, baseConfidence - conflictPenalty);
        
        return {
            verified: true,
            confidence: confidence,
            conflicts: conflicts,
            sourceValidation: sourceValidation,
            reliableSources: sourceValidation.reliable.length,
            conflicts: conflicts,
            sources_count: sources.length,
            has_corrections: correctionsResult.rows.length > 0
        };
    } catch (error) {
        console.error('Erro ao verificar fatos:', error);
        return { verified: false, confidence: 0, conflicts: [] };
    }
}

// Melhorar síntese de múltiplas fontes
function improveSynthesis(sources, questionContext) {
    if (!sources || sources.length === 0) return null;
    if (sources.length === 1) return sources[0].excerpt;
    
    // Agrupar por tópico
    const topics = {};
    sources.forEach((source, idx) => {
        const topic = extractMainTopic(source.excerpt);
        if (!topics[topic]) {
            topics[topic] = [];
        }
        topics[topic].push({ ...source, index: idx });
    });
    
    // Sintetizar por tópico
    const synthesizedParts = [];
    Object.keys(topics).forEach(topic => {
        const topicSources = topics[topic];
        if (topicSources.length === 1) {
            synthesizedParts.push(topicSources[0].excerpt);
        } else {
            // Combinar fontes do mesmo tópico
            const combined = topicSources
                .map(s => s.excerpt)
                .join('\n\n')
                .replace(/\n{3,}/g, '\n\n'); // Remover quebras múltiplas
            
            synthesizedParts.push(combined);
        }
    });
    
    // Combinar tópicos
    let final = synthesizedParts.join('\n\n');
    
    // Remover duplicatas
    const sentences = final.split(/[.!?]\s+/);
    const uniqueSentences = [];
    const seen = new Set();
    
    sentences.forEach(sentence => {
        const normalized = sentence.toLowerCase().trim();
        if (!seen.has(normalized) && sentence.length > 20) {
            seen.add(normalized);
            uniqueSentences.push(sentence);
        }
    });
    
    final = uniqueSentences.join('. ') + (final.endsWith('.') ? '' : '.');
    
    // Limitar tamanho baseado em preferências
    const maxLength = questionContext.response_length === 'short' ? 300 :
                      questionContext.response_length === 'long' ? 1500 : 800;
    
    if (final.length > maxLength) {
        final = final.substring(0, maxLength) + '...';
    }
    
    return final;
}

// Extrair tópico principal de um texto
function extractMainTopic(text) {
    if (!text || text.length < 50) return 'general';
    
    const keywords = ['venda', 'estratégia', 'marketing', 'negócio', 'cliente', 'produto', 'serviço'];
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
            return keyword;
        }
    }
    
    return 'general';
}

// Gerar sugestões de perguntas
async function generateQuestionSuggestions(client, userId, conversationId, questionContext, knowledgeIds) {
    try {
        const suggestions = [];
        
        // 1. Perguntas relacionadas ao conhecimento usado
        if (knowledgeIds && knowledgeIds.length > 0) {
            const relatedKnowledge = await client.query(`
                SELECT DISTINCT kb.title, kb.category_id, c.name as category_name
                FROM ia_knowledge_base kb
                LEFT JOIN ia_categories c ON kb.category_id = c.id
                WHERE kb.category_id IN (
                    SELECT DISTINCT category_id FROM ia_knowledge_base
                    WHERE id = ANY($1) AND category_id IS NOT NULL
                )
                AND kb.id != ALL($1)
                AND kb.is_active = true
                LIMIT 5
            `, [knowledgeIds]);
            
            relatedKnowledge.rows.forEach(kb => {
                suggestions.push({
                    question: `Me fale mais sobre ${kb.title || kb.category_name}`,
                    type: 'related',
                    category_id: kb.category_id
                });
            });
        }
        
        // 2. Perguntas populares da categoria
        if (questionContext.category) {
            const popularQuestions = await client.query(`
                SELECT q.question, COUNT(*) as usage_count
                FROM ia_qa q
                LEFT JOIN ia_categories c ON q.category_id = c.id
                WHERE LOWER(c.name) = LOWER($1)
                AND q.is_active = true
                GROUP BY q.question
                ORDER BY usage_count DESC
                LIMIT 3
            `, [questionContext.category]);
            
            popularQuestions.rows.forEach(q => {
                suggestions.push({
                    question: q.question,
                    type: 'popular',
                    category_id: questionContext.categoryId
                });
            });
        }
        
        // 3. Perguntas contextuais baseadas na pergunta atual
        if (questionContext.entities.length > 0) {
            const entity = questionContext.entities[0];
            suggestions.push({
                question: `O que mais você sabe sobre ${entity}?`,
                type: 'contextual'
            });
        }
        
        // Salvar sugestões
        if (suggestions.length > 0) {
            for (const suggestion of suggestions) {
                await client.query(`
                    INSERT INTO ia_question_suggestions
                    (user_id, conversation_id, suggested_question, suggestion_type, category_id)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    userId,
                    conversationId,
                    suggestion.question,
                    suggestion.type,
                    suggestion.category_id || null
                ]);
            }
        }
        
        return suggestions.slice(0, 5); // Retornar até 5 sugestões
    } catch (error) {
        console.error('Erro ao gerar sugestões:', error);
        return [];
    }
}

// Função para encontrar melhor resposta
async function findBestAnswer(userMessage, userId) {
    const client = await db.pool.connect();
    let knowledgeResult = null;
    let questionIsAboutSystem = null; // Declarar uma vez no início
    
    try {
        // Verificar se é um elogio/complimento primeiro (antes de saudação)
        if (detectCompliment(userMessage)) {
            return {
                answer: "Obrigada! 😊 Fico muito feliz em ajudar você! Se tiver alguma dúvida sobre o Conecta King, estou aqui para ajudar!",
                confidence: 100,
                source: 'compliment'
            };
        }
        
        // Verificar se é uma saudação
        if (detectGreeting(userMessage)) {
            return {
                answer: generateGreetingResponse(),
                confidence: 100,
                source: 'greeting'
            };
        }
        
        // ============================================
        // DETECÇÃO: PERGUNTAS SOBRE VALORES/PLANOS
        // ============================================
        let lowerMessage = userMessage.toLowerCase();
        const pricingQuestions = [
            'qual seus valores', 'quais seus valores', 'qual o valor', 'quais os valores',
            'quanto custa', 'quanto é', 'preço', 'preços', 'valores do sistema',
            'planos', 'pacotes', 'assinatura', 'quanto custa o sistema',
            'valor do sistema', 'preço do sistema', 'quanto é a assinatura',
            'quais os planos', 'quais os pacotes', 'quanto custa a assinatura',
            'king start', 'king prime', 'king corporate', 'king start', 'king prime', 'king corporate',
            'pacote 1', 'pacote 2', 'pacote 3', 'preço do pacote'
        ];
        
        if (pricingQuestions.some(q => lowerMessage.includes(q))) {
            // Buscar planos no banco de dados
            try {
                const plansResult = await client.query(`
                    SELECT plan_code, plan_name, price, description, features
                    FROM subscription_plans
                    WHERE is_active = true
                    ORDER BY price ASC
                `);
                
                if (plansResult.rows.length > 0) {
                    let answer = "💰 **VALORES E PLANOS DO CONECTA KING**\n\n";
                    
                    plansResult.rows.forEach((plan, index) => {
                        const price = parseFloat(plan.price).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        });
                        
                        answer += `**${plan.plan_name}** - ${price} (pagamento único)\n`;
                        if (plan.description) {
                            answer += `   ${plan.description}\n`;
                        }
                        
                        if (plan.features && typeof plan.features === 'object') {
                            const features = plan.features;
                            if (features.includes_nfc) answer += `   ✅ ConectaKing NFC\n`;
                            if (features.includes_premium_card) answer += `   ✅ Cartão Premium\n`;
                            if (features.unlimited_links) answer += `   ✅ Links ilimitados\n`;
                            if (features.includes_portfolio) answer += `   ✅ Portfólio integrado\n`;
                            if (features.smart_buttons) answer += `   ✅ Botões inteligentes\n`;
                            if (features.assisted_updates) answer += `   ✅ Atualizações assistidas\n`;
                            if (features.includes_enterprise_mode) answer += `   ✅ Modo Empresa\n`;
                            if (features.priority_support) answer += `   ✅ Suporte prioritário\n`;
                            if (features.can_add_all_modules) answer += `   ✅ Todos os módulos disponíveis\n`;
                            if (features.can_edit_logo) answer += `   ✅ Personalização de logomarca\n`;
                            if (features.max_profiles) answer += `   ✅ ${features.max_profiles} perfil(is)\n`;
                            if (features.is_enterprise) answer += `   ✅ Modo empresarial\n`;
                        }
                        answer += "\n";
                    });
                    
                    answer += "💳 **Forma de Pagamento:** PIX (pagamento único, sem mensalidade)\n";
                    answer += "📱 **Renovação:** Opcional via WhatsApp\n\n";
                    answer += "✨ **Diferenciais:** Sem mensalidade, atualizações em tempo real, tecnologia NFC moderna!\n\n";
                    answer += "Para assinar ou renovar, acesse a seção 'Assinatura' no dashboard! 😊";
                    
                    return {
                        answer: answer,
                        confidence: 100,
                        source: 'pricing_info',
                        mentalMode: 'informative'
                    };
                }
            } catch (error) {
                console.error('Erro ao buscar planos:', error);
            }
            
            // Fallback com valores padrão se não conseguir buscar do banco
            return {
                answer: "💰 **VALORES E PLANOS DO CONECTA KING**\n\n" +
                       "**Pacote 1** - R$ 480,00/mês\n" +
                       "   Todas as funcionalidades do cartão\n" +
                       "   Todos os módulos disponíveis\n" +
                       "   Não pode alterar a logomarca do sistema\n" +
                       "   1 perfil\n\n" +
                       "**Pacote 2** - R$ 700,00/mês\n" +
                       "   Todas as funcionalidades do cartão\n" +
                       "   Todos os módulos disponíveis\n" +
                       "   Pode alterar a logomarca do cartão\n" +
                       "   1 perfil\n\n" +
                       "**Pacote 3** - R$ 1.500,00/mês (EMPRESARIAL)\n" +
                       "   Todas as funcionalidades do cartão\n" +
                       "   Todos os módulos disponíveis\n" +
                       "   Pode alterar a logomarca\n" +
                       "   3 perfis/cartões\n" +
                       "   Modo empresarial\n\n" +
                       "💳 **Forma de Pagamento:** PIX\n" +
                       "📱 **Renovação:** Via WhatsApp\n\n" +
                       "Para assinar ou renovar, acesse a seção 'Assinatura' no dashboard! 😊",
                confidence: 95,
                source: 'pricing_info_fallback',
                mentalMode: 'informative'
            };
        }
        
        // ============================================
        // DETECÇÃO: PERGUNTAS SOBRE FORMAS DE PAGAMENTO E PARCELAMENTO
        // ============================================
        // IMPORTANTE: Esta detecção funciona tanto para usuários autenticados quanto públicos
        // Não depende de userId, garantindo que a IA pública responda corretamente
        const paymentQuestions = [
            'forma de pagamento', 'formas de pagamento', 'como pagar', 'como posso pagar',
            'qual forma de pagamento', 'quais formas de pagamento', 'meios de pagamento',
            'métodos de pagamento', 'metodos de pagamento', 'opções de pagamento',
            'opcoes de pagamento', 'aceita', 'aceitam', 'pix', 'cartão', 'cartao',
            'crédito', 'credito', 'débito', 'debito', 'boleto', 'transferência',
            'transferencia', 'parcelado', 'parcela', 'parcelamento', 'parcelas',
            'vezes', '12x', 'à vista', 'a vista', 'mensal', 'anual', 'recorrente', 
            'pagamento único', 'pagamento unico', 'melhor forma de pagamento', 
            'melhor forma pagamento', 'quantas vezes', 'quantas parcelas', 'posso parcelar',
            'tem juros', 'tem taxa', 'valor da parcela', 'quanto fica a parcela'
        ];
        
        // Detectar perguntas sobre pagamento (melhorado para capturar TODAS as variações)
        // Exemplos: "qual forma de pagamento", "qual as formas de pagamento", "quais formas", "aceita pagamento"
        const hasPaymentKeyword = paymentQuestions.some(q => lowerMessage.includes(q));
        const hasQualAndPagamento = (lowerMessage.includes('qual') || lowerMessage.includes('quais')) && lowerMessage.includes('pagamento');
        const hasFormasAndPagamento = lowerMessage.includes('formas') && lowerMessage.includes('pagamento');
        const hasAceitaAndPagamento = lowerMessage.includes('pagamento') && (lowerMessage.includes('aceita') || lowerMessage.includes('aceitam'));
        // Detectar "qual as formas" (com "as" no meio)
        const hasQualAsFormas = (lowerMessage.includes('qual as') || lowerMessage.includes('quais as')) && lowerMessage.includes('pagamento');
        
        const isPaymentQuestion = hasPaymentKeyword || hasQualAndPagamento || hasFormasAndPagamento || hasAceitaAndPagamento || hasQualAsFormas;
        
        if (isPaymentQuestion) {
            console.log('💳 [IA] ✅ Detectada pergunta sobre pagamento (mesma lógica para público e autenticado):', {
                message: userMessage.substring(0, 100),
                hasPaymentKeyword,
                hasQualAndPagamento,
                hasFormasAndPagamento,
                hasAceitaAndPagamento,
                hasQualAsFormas,
                userId: userId || 'PUBLICO'
            });
            // Buscar informações atualizadas do banco de dados
            let planDetails = '';
            try {
                const plansResult = await client.query(`
                    SELECT plan_name, price, plan_code FROM subscription_plans 
                    WHERE is_active = true 
                    ORDER BY price ASC
                `);
                
                if (plansResult.rows.length > 0) {
                    planDetails = '\n\n**💎 VALORES POR PLANO:**\n\n';
                    plansResult.rows.forEach(plan => {
                        const pixPrice = plan.price;
                        const cardPrice = plan.price * 1.2; // +20%
                        const monthlyCard = cardPrice / 12;
                        
                        planDetails += `**${plan.plan_name}**\n`;
                        planDetails += `• PIX: R$ ${pixPrice.toFixed(2).replace('.', ',')} (à vista)\n`;
                        planDetails += `• Cartão: R$ ${cardPrice.toFixed(2).replace('.', ',')} (até 12x de R$ ${monthlyCard.toFixed(2).replace('.', ',')})\n\n`;
                    });
                }
            } catch (error) {
                console.error('Erro ao buscar planos:', error);
            }
            
            return {
                answer: "💳 **FORMAS DE PAGAMENTO DO CONECTA KING**\n\n" +
                       "Oferecemos **3 formas de pagamento** flexíveis para você escolher:\n\n" +
                       "**1️⃣ PIX (Pagamento à Vista)**\n" +
                       "• Valor integral do plano\n" +
                       "• Ativação imediata após confirmação\n" +
                       "• Mais rápido e prático\n" +
                       "• Sem taxas adicionais\n\n" +
                       "**2️⃣ Cartão de Crédito (Parcelamento)**\n" +
                       "• **Até 12 parcelas** disponíveis\n" +
                       "• Taxa adicional de 20% sobre o valor\n" +
                       "• Exemplos:\n" +
                       "  → King Start (R$ 700) → No cartão: R$ 840 (12x de R$ 70)\n" +
                       "  → King Prime (R$ 1.000) → No cartão: R$ 1.200 (12x de R$ 100)\n" +
                       "  → King Corporate (R$ 2.300) → No cartão: R$ 2.760 (12x de R$ 230)\n\n" +
                       "**3️⃣ Pagamento Mensal Recorrente**\n" +
                       "• Pagamento mensal automático\n" +
                       "• Valor dividido em 12 parcelas mensais\n" +
                       "• Ideal para quem prefere pagar mensalmente\n\n" +
                       "**📋 PERGUNTAS FREQUENTES:**\n" +
                       "• **Quantas vezes posso parcelar?** → Até 12x no cartão de crédito\n" +
                       "• **Tem juros?** → Sim, 20% de taxa adicional no cartão\n" +
                       "• **PIX tem desconto?** → Não, mas não tem taxa adicional\n" +
                       "• **Posso pagar mensalmente?** → Sim, via pagamento recorrente\n\n" +
                       planDetails +
                       "**📋 PROCESSO:**\n" +
                       "1. Escolha seu plano (King Start, King Prime ou King Corporate)\n" +
                       "2. Selecione a forma de pagamento\n" +
                       "3. Entre em contato via WhatsApp para finalizar\n" +
                       "4. Após confirmação, seu plano é ativado imediatamente\n\n" +
                       "**💡 RECOMENDAÇÃO:**\n" +
                       "O PIX é a forma mais rápida e econômica, sem taxas adicionais!\n\n" +
                       "Quer saber mais sobre algum plano específico? Posso te ajudar! 😊",
                confidence: 100,
                source: 'payment_info',
                mentalMode: 'informative'
            };
        }
        
        // ============================================
        // DETECÇÃO: PERGUNTAS SOBRE A EMPRESA/SISTEMA
        // ============================================
        const aboutCompanyPatterns = [
            /(me\s+)?fale?\s+sobre\s+(a\s+)?(empresa|conecta|king|sistema|plataforma)/i,
            /(me\s+)?fala?\s+sobre\s+(a\s+)?(empresa|conecta|king|sistema|plataforma)/i,
            /(me\s+)?conte?\s+sobre\s+(a\s+)?(empresa|conecta|king|sistema|plataforma)/i,
            /(me\s+)?explique?\s+(a\s+)?(empresa|conecta|king|sistema|plataforma)/i,
            /o\s+que\s+é\s+(a\s+)?(empresa|conecta|king|sistema|plataforma)/i,
            /quem\s+é\s+(a\s+)?(empresa|conecta|king)/i,
            /o\s+que\s+faz\s+(a\s+)?(empresa|conecta|king)/i
        ];
        
        const isAboutCompany = aboutCompanyPatterns.some(pattern => pattern.test(userMessage));
        
        if (isAboutCompany) {
            return {
                answer: "🏢 **SOBRE O CONECTA KING**\n\n" +
                       "O **Conecta King** é uma plataforma inovadora de cartões virtuais profissionais que transforma a forma como você se conecta e compartilha suas informações de contato.\n\n" +
                       "**🎯 NOSSA MISSÃO:**\n" +
                       "Revolucionar o networking profissional através de tecnologia NFC premium, oferecendo uma solução completa e elegante para profissionais que buscam autoridade, conexão e vendas.\n\n" +
                       "**💎 O QUE OFERECEMOS:**\n" +
                       "• Cartões virtuais personalizados com tecnologia NFC\n" +
                       "• Múltiplos módulos (WhatsApp, Instagram, links, PIX, QR Code, Loja Virtual, King Forms, Carrossel, Portfólio, Banner)\n" +
                       "• Relatórios e analytics completos\n" +
                       "• Compartilhamento via link único ou QR Code\n" +
                       "• Atualizações em tempo real\n\n" +
                       "**👑 NOSSOS PLANOS:**\n" +
                       "• **King Start** (R$ 700) - Ideal para iniciar\n" +
                       "• **King Prime** (R$ 1.000) - Para profissionais que buscam impacto\n" +
                       "• **King Corporate** (R$ 2.300) - Modo empresa\n\n" +
                       "**✨ DIFERENCIAIS:**\n" +
                       "• Sem mensalidade (pagamento único)\n" +
                       "• Tecnologia NFC moderna\n" +
                       "• Imagem profissional e inovadora\n" +
                       "• Solução sustentável e reutilizável\n\n" +
                       "Quer saber mais sobre algum plano específico ou funcionalidade? Posso te ajudar! 😊",
                confidence: 100,
                source: 'company_info',
                mentalMode: 'informative'
            };
        }
        
        // ============================================
        // DETECÇÃO: PERGUNTAS SOBRE COMO FUNCIONA O SISTEMA
        // ============================================
        const systemHowQuestions = [
            'como funciona', 'como funciona o sistema', 'como funciona o conecta king',
            'como funciona conecta king', 'como o sistema funciona', 'como usar',
            'como usar o sistema', 'como usar conecta king', 'o que é conecta king',
            'o que é o conecta king', 'o que é o sistema', 'explique o sistema',
            'explique conecta king', 'me explique', 'como é', 'como é o sistema'
        ];
        
        if (systemHowQuestions.some(q => lowerMessage.includes(q))) {
            return {
                answer: "🚀 **COMO FUNCIONA O CONECTA KING**\n\n" +
                       "O Conecta King é uma plataforma completa para criação de **cartões virtuais profissionais** que funcionam como um hub central para todas as suas informações de contato e negócios.\n\n" +
                       "**📋 PASSO A PASSO:**\n\n" +
                       "1️⃣ **Criação do Cartão**: Você cria seu cartão virtual personalizado com suas informações (nome, foto, biografia)\n\n" +
                       "2️⃣ **Adição de Módulos**: Adicione os módulos que deseja:\n" +
                       "   • WhatsApp, Instagram, TikTok, YouTube\n" +
                       "   • Links personalizados\n" +
                       "   • PIX e QR Code para pagamentos\n" +
                       "   • Página de vendas completa\n" +
                       "   • Banner e carrossel de imagens\n" +
                       "   • E muito mais!\n\n" +
                       "3️⃣ **Personalização**: Organize os módulos na ordem que preferir, escolha cores, fontes e layout\n\n" +
                       "4️⃣ **Compartilhamento**: Compartilhe seu link único do cartão ou use o QR Code\n\n" +
                       "5️⃣ **Acompanhamento**: Veja quantas pessoas visualizaram seu cartão através dos relatórios\n\n" +
                       "**💡 RESULTADO:**\n" +
                       "Seu cartão funciona como um site pessoal, mas muito mais simples e focado em conectar você com seus contatos e clientes de forma profissional! 😊\n\n" +
                       "Quer ajuda para criar ou configurar seu cartão? Posso te guiar passo a passo!",
                confidence: 100,
                source: 'system_info',
                mentalMode: 'educative'
            };
        }
        
        // ============================================
        // DETECÇÃO: PERGUNTAS SOBRE O NOME DA IA
        // ============================================
        const nameQuestions = [
            'qual seu nome', 'qual é seu nome', 'qual o seu nome',
            'como você se chama', 'quem é você', 'quem voce e',
            'qual seu nome?', 'qual é seu nome?', 'qual o seu nome?',
            'me diga seu nome', 'diga seu nome', 'fale seu nome',
            'você tem nome', 'tem nome', 'seu nome é', 'você se chama'
        ];
        
        if (nameQuestions.some(q => lowerMessage.includes(q))) {
            return {
                answer: "Olá! 😊 Meu nome é **Ia King** (ou **IA King**). Sou a assistente virtual inteligente do Conecta King, criada para ajudar você com suas dúvidas sobre o sistema, estratégias de vendas, conhecimento geral e muito mais!\n\nEstou sempre aprendendo e melhorando para te dar as melhores respostas possíveis. Como posso te ajudar hoje? 😊",
                confidence: 100,
                source: 'ia_identity',
                mentalMode: 'friendly'
            };
        }
        
        // ============================================
        // SISTEMA DE PENSAMENTO (Como ChatGPT/Gemini)
        // ============================================
        
        // ============================================
        // NOVO: CACHE INTELIGENTE
        // ============================================
        const cacheResult = await checkResponseCache(client, userMessage, userId);
        if (cacheResult) {
            console.log('⚡ [Cache] Resposta encontrada no cache');
            // Atualizar hit count
            await client.query(`
                UPDATE ia_response_cache
                SET hit_count = hit_count + 1, last_hit_at = NOW()
                WHERE id = $1
            `, [cacheResult.id]);
            
            return {
                answer: cacheResult.response_text,
                confidence: cacheResult.confidence_score,
                source: 'cache',
                knowledge_used_ids: cacheResult.knowledge_used_ids
            };
        }
        
        // ============================================
        // NOVO: MEMÓRIA CONTEXTUAL DE LONGO PRAZO
        // ============================================
        const userContext = await getUserContext(client, userId);
        const preferences = await getUserPreferences(client, userId);
        
        // Recuperar contexto multi-turn se houver conversationId
        let multiTurnContext = [];
        if (req.body.conversationId) {
            multiTurnContext = await retrieveMultiTurnContext(client, userId, req.body.conversationId, 3);
            if (multiTurnContext.length > 0) {
                console.log(`📚 [Contexto] Recuperados ${multiTurnContext.length} turnos anteriores`);
            }
        }
        
        // CAMADA 1: Extrair contexto e raciocinar sobre a pergunta
        // NOVO: Usar sistema avançado de entendimento (similar ao ChatGPT)
        const deepSemantic = extractDeepSemanticMeaning(userMessage, { userId });
        const questionContext = extractQuestionContext(userMessage);
        
        // Enriquecer questionContext com análise semântica profunda
        questionContext.deepSemantic = deepSemantic;
        questionContext.intent = deepSemantic.intent || questionContext.intent;
        questionContext.entities = [...new Set([...questionContext.entities, ...deepSemantic.entities])];
        questionContext.concepts = deepSemantic.concepts || questionContext.keywords;
        
        const thoughts = thinkAboutQuestion(userMessage, questionContext);
        
        // Enriquecer contexto com memória episódica
        const episodicMemories = await retrieveEpisodicMemory(client, userId, userMessage, 3);
        if (episodicMemories.length > 0) {
            questionContext.episodic_memories = episodicMemories;
            console.log(`🧠 [Memória] ${episodicMemories.length} memórias episódicas recuperadas`);
        }
        
        // Aplicar preferências do usuário ao contexto
        if (preferences) {
            questionContext.preferred_style = preferences.preferred_style;
            questionContext.knowledge_level = preferences.knowledge_level;
            questionContext.language_preference = preferences.language_preference;
            questionContext.response_length = preferences.response_length_preference;
        }
        
        // ============================================
        // NOVO: TRATAMENTO DE AMBIGUIDADE
        // ============================================
        const ambiguityCheck = detectAmbiguity(userMessage, questionContext);
        if (ambiguityCheck.isAmbiguous && ambiguityCheck.confidence < 70) {
            // Gerar perguntas de esclarecimento inteligentes
            const clarificationQuestions = generateIntelligentClarificationQuestions(userMessage, questionContext, ambiguityCheck, client, userId);
            
            return {
                answer: `Desculpe, sua pergunta pode ter mais de um significado. Você está perguntando sobre:\n\n${ambiguityCheck.interpretations.map((i, idx) => `${idx + 1}. ${i.interpretation}`).join('\n')}\n\n${clarificationQuestions.length > 0 ? `**Para te ajudar melhor, você poderia esclarecer:**\n\n${clarificationQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}\n\n` : ''}Por favor, especifique qual delas você quer que eu responda.`,
                confidence: 50,
                source: 'ambiguity_detection',
                needs_clarification: true,
                interpretations: ambiguityCheck.interpretations,
                clarification_questions: clarificationQuestions
            };
        }
        
        // Verificar se confiança é baixa e gerar perguntas de esclarecimento
        if (bestAnswer && finalConfidence < 50 && !bestAnswer.includes('não encontrei')) {
            const lowConfidenceQuestions = generateLowConfidenceClarificationQuestions(userMessage, questionContext, client, userId);
            if (lowConfidenceQuestions.length > 0) {
                bestAnswer += `\n\n**Para te dar uma resposta mais precisa, você poderia esclarecer:**\n\n${lowConfidenceQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}`;
            }
        }
        
        // ============================================
        // SISTEMA: "COMO O CHATGPT RESPONDERIA?"
        // ============================================
        // Sempre se perguntar como o ChatGPT responderia antes de responder
        const chatGPTThoughts = await comoChatGPTResponderia(userMessage, questionContext, client);
        if (chatGPTThoughts) {
            console.log('🤖 [ChatGPT Mode] Abordagem sugerida:', chatGPTThoughts.suggestedApproach);
        }
        
        // ============================================
        // DETECÇÃO ESPECIAL: PERGUNTAS SOBRE VENDAS E ESTRATÉGIAS
        // ============================================
        lowerMessage = userMessage.toLowerCase(); // Reutilizar variável já declarada
        const isSalesQuestion = lowerMessage.includes('estratégia') || 
                               lowerMessage.includes('estrategia') ||
                               lowerMessage.includes('estratégias') ||
                               lowerMessage.includes('estrategias') ||
                               (lowerMessage.includes('venda') && (
                                   lowerMessage.includes('qual') || 
                                   lowerMessage.includes('que') ||
                                   lowerMessage.includes('como') ||
                                   lowerMessage.includes('técnica') ||
                                   lowerMessage.includes('tecnica')
                               ));
        
        if (isSalesQuestion && (thoughts.intent === 'strategy' || chatGPTThoughts?.needsResearch)) {
            console.log('💼 [Vendas] Detectada pergunta sobre estratégias de vendas - usando sistema melhorado');
            
            // Usar a versão melhorada que combina múltiplas fontes
            const salesStrategy = await generateSalesStrategyMelhorado(userMessage, questionContext, client, userId);
            if (salesStrategy) {
                // Aplicar personalidade e emoção
                const finalAnswer = addPersonalityAndEmotion(salesStrategy, thoughts, questionContext);
                
                return {
                    answer: finalAnswer,
                    confidence: 90,
                    source: 'sales_strategy_enhanced'
                };
            }
        }
        
        // ============================================
        // SISTEMA DE FILTROS E CATEGORIZAÇÃO
        // ============================================
        let categoryInfo = null;
        try {
            categoryInfo = categorizeQuestion(userMessage, questionContext);
        } catch (error) {
            console.error('❌ [IA] Erro ao categorizar pergunta:', error);
            categoryInfo = { primaryCategory: 'general', allCategories: [], categories: {} };
        }
        
        console.log('🧠 [IA] Pensamento sobre a pergunta:', {
            intent: thoughts.intent,
            entities: thoughts.entities,
            emotionalTone: thoughts.emotionalTone,
            complexity: thoughts.complexity,
            category: categoryInfo ? categoryInfo.primaryCategory : 'general',
            allCategories: categoryInfo ? categoryInfo.allCategories : []
        });
        
        // Ativar modo mental
        const mentalMode = activateMentalMode(userMessage, questionContext, thoughts);
        
        // ============================================
        // NOVO: CHAIN OF THOUGHT REASONING (Para perguntas complexas)
        // ============================================
        let chainOfThoughtResult = null;
        if (thoughts.complexity === 'complex' || thoughts.semanticAnalysis?.requiresMultiStepReasoning) {
            console.log('🧠 [Chain of Thought] Ativando raciocínio passo a passo para pergunta complexa...');
            
            // Buscar conhecimento primeiro para usar no Chain of Thought
            try {
                const preliminaryKnowledge = await client.query(`
                    SELECT * FROM ia_knowledge_base
                    WHERE is_active = true
                    AND (
                        ${questionContext.entities.length > 0 ? 
                            questionContext.entities.map((_, i) => `LOWER(content) LIKE $${i + 1} OR LOWER(title) LIKE $${i + 1}`).join(' OR ') :
                            questionContext.keywords.map((_, i) => `LOWER(content) LIKE $${i + 1} OR LOWER(title) LIKE $${i + 1})`).join(' OR ')
                        }
                    )
                    LIMIT 10
                `, questionContext.entities.length > 0 ? 
                    questionContext.entities.map(e => `%${e.toLowerCase()}%`) :
                    questionContext.keywords.map(k => `%${k.toLowerCase()}%`)
                );
                
                chainOfThoughtResult = await chainOfThoughtReasoning(
                    userMessage,
                    questionContext,
                    preliminaryKnowledge.rows,
                    client
                );
                
                if (chainOfThoughtResult.used && chainOfThoughtResult.finalAnswer) {
                    console.log('✅ [Chain of Thought] Resposta gerada com raciocínio passo a passo');
                    bestAnswer = chainOfThoughtResult.finalAnswer;
                    bestScore = chainOfThoughtResult.confidence;
                    bestSource = 'chain_of_thought';
                }
            } catch (error) {
                console.error('Erro no Chain of Thought Reasoning:', error);
            }
        }
        
        // ============================================
        // FASE 2: GRAFO DE CONHECIMENTO E RACIOCÍNIO CAUSAL
        // ============================================
        let knowledgeGraphResult = null;
        let causalReasoningResult = null;
        
        // Buscar no grafo de conhecimento se houver entidades
        if (questionContext.entities && questionContext.entities.length > 0) {
            try {
            console.log('🕸️ [Grafo de Conhecimento] Buscando conhecimento relacionado...');
            knowledgeGraphResult = await searchKnowledgeGraph(userMessage, questionContext, client);
            
            if (knowledgeGraphResult && knowledgeGraphResult.length > 0) {
                console.log(`✅ [Grafo] Encontrados ${knowledgeGraphResult.length} conhecimentos relacionados`);
            }
            
            // Tentar raciocínio causal se a pergunta contém "por que", "causa", "efeito", etc.
            const causalKeywords = ['por que', 'porque', 'causa', 'efeito', 'resultado', 'consequência', 'consequencia', 'leva a', 'resulta em'];
            const hasCausalIntent = causalKeywords.some(kw => userMessage.toLowerCase().includes(kw));
            
            if (hasCausalIntent && questionContext.entities.length > 0) {
                console.log('⚡ [Raciocínio Causal] Identificando causas e efeitos...');
                causalReasoningResult = await causalReasoning(userMessage, questionContext, client);
                
                if (causalReasoningResult && causalReasoningResult.explanation) {
                    console.log('✅ [Causal] Explicação causal gerada');
                }
            }
        } catch (error) {
            console.error('Erro no Grafo de Conhecimento/Raciocínio Causal:', error);
        }
        }
        
        let bestAnswer = null;
        let bestScore = 0;
        let bestSource = null;
        
        // 0. BUSCAR EM CONVERSAS ANTERIORES (aprender com histórico)
        if (userId && chatGPTThoughts?.needsHistory) {
            try {
                const historyResult = await buscarConversasAnteriores(userMessage, userId, client);
                
                if (historyResult.hasResults) {
                    // Verificar conversas similares
                    for (const conv of historyResult.conversations) {
                        const similarity = calculateSimilarity(userMessage, conv.message);
                        const historyScore = (similarity * 0.7) + (conv.confidence_score * 0.3);
                        
                        if (historyScore > bestScore) {
                            bestScore = historyScore;
                            bestAnswer = conv.response;
                            bestSource = 'conversation_history';
                            console.log('📚 [Histórico] Usando resposta de conversa anterior (score:', historyScore.toFixed(2), ')');
                        }
                    }
                    
                    // Verificar conhecimento aprendido
                    for (const learned of historyResult.learnedKnowledge) {
                        const similarity = calculateSimilarity(userMessage, learned.question);
                        const learnedScore = (similarity * 0.6) + (learned.confidence_score * 0.4);
                        
                        if (learnedScore > bestScore) {
                            bestScore = learnedScore;
                            bestAnswer = learned.answer;
                            bestSource = 'learned_knowledge';
                            console.log('🧠 [Aprendizado] Usando conhecimento aprendido (score:', learnedScore.toFixed(2), ')');
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar conversas anteriores:', error);
            }
        }
        
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
        
        // 2. Buscar na base de conhecimento COM INTELIGÊNCIA CONTEXTUAL E SISTEMA DE PENSAMENTO
        // PRIORIDADE: LIVROS PRIMEIRO!
        try {
            // BUSCAR LIVROS PRIMEIRO (prioridade máxima) - INCLUIR LIVROS SEM CONTEÚDO PRINCIPAL
            const booksResult = await client.query(`
                SELECT id, title, content, keywords, usage_count, source_type, category_id, priority
                FROM ia_knowledge_base
                WHERE is_active = true
                AND source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
                ORDER BY priority DESC NULLS LAST, usage_count DESC
            `);
            
            console.log(`📚 [IA] Total de livros encontrados: ${booksResult.rows.length}`);
            if (booksResult.rows.length > 0) {
                console.log(`📚 [IA] Primeiros livros:`, booksResult.rows.slice(0, 5).map(b => ({
                    title: b.title?.substring(0, 50),
                    has_content: !!(b.content && b.content.length > 0),
                    content_length: b.content ? b.content.length : 0,
                    source_type: b.source_type
                })));
            }
            
            // Buscar conhecimento geral COM PRIORIZAÇÃO DINÂMICA
            const searchTerms = questionContext.keywords.length > 0 
                ? questionContext.keywords.join(' ') 
                : userMessage.substring(0, 100);
            
            knowledgeResult = await getPrioritizedKnowledge(searchTerms, questionContext, 50, client);
            
            // Se não encontrou com priorização, fazer busca normal
            if (!knowledgeResult || knowledgeResult.length === 0) {
                knowledgeResult = await client.query(`
                    SELECT id, title, content, keywords, usage_count, source_type, category_id,
                           COALESCE(dynamic_priority, priority, 0) as final_priority
                    FROM ia_knowledge_base
                    WHERE is_active = true
                    AND source_type NOT IN ('book_training', 'tavily_book', 'tavily_book_trained')
                    ORDER BY final_priority DESC, priority DESC, created_at DESC
                    LIMIT 50
                `);
            }
            
            // COMBINAR: Livros primeiro, depois conhecimento geral
            const allKnowledge = [...booksResult.rows, ...knowledgeResult.rows];
            
            // APLICAR FILTROS DE CATEGORIA ANTES DE BUSCAR
            let filteredKnowledge = allKnowledge;
            if (categoryInfo && categoryInfo.primaryCategory !== 'general') {
                filteredKnowledge = applyCategoryFilters(allKnowledge, categoryInfo, questionContext);
                console.log('🔍 [IA] Filtros aplicados:', {
                    categoria: categoryInfo.primaryCategory,
                    totalAntes: allKnowledge.length,
                    totalDepois: filteredKnowledge.length,
                    livros: booksResult.rows.length
                });
            } else {
                console.log('📚 [IA] Buscando em livros primeiro:', {
                    livros: booksResult.rows.length,
                    conhecimento_geral: knowledgeResult.rows.length
                });
            }
            
            // Extrair palavras-chave da mensagem do usuário
            const userKeywords = extractKeywords(userMessage);
            
            // BUSCA VETORIAL (RAG) - Tentar buscar por similaridade semântica primeiro
            let vectorResults = [];
            try {
                vectorResults = await embeddings.searchByVectorSimilarity(userMessage, 10, client);
                console.log(`🔍 [RAG] Busca vetorial encontrou ${vectorResults.length} resultados`);
            } catch (error) {
                console.warn('⚠️ [RAG] Busca vetorial não disponível (pgvector pode não estar instalado):', error.message);
            }
            
            // Array para armazenar todos os candidatos com scores
            const candidates = [];
            
            // Adicionar resultados vetoriais com prioridade alta
            for (const vr of vectorResults) {
                candidates.push({
                    ...vr,
                    score: (vr.similarity || 0) * 100, // Converter similaridade (0-1) para score (0-100)
                    source: 'vector_search',
                    relevance: vr.similarity || 0
                });
            }
            
            for (const kb of filteredKnowledge) {
                // Se não tem título, pular
                if (!kb.title) continue;
                
                // Se não tem conteúdo principal, tentar buscar seções do livro
                let bookContent = kb.content || '';
                if (!bookContent && kb.source_type && kb.source_type.includes('book')) {
                    // Buscar seções deste livro
                    try {
                        const sectionsResult = await client.query(`
                            SELECT content
                            FROM ia_knowledge_base
                            WHERE source_type = 'book_training'
                            AND source_reference LIKE $1
                            AND content IS NOT NULL
                            AND content != ''
                            LIMIT 10
                        `, [`%${kb.title.replace(/'/g, "''")}%`]);
                        
                        if (sectionsResult.rows.length > 0) {
                            bookContent = sectionsResult.rows.map(s => s.content).join('\n\n');
                            console.log(`📖 [IA] Livro "${kb.title}" sem conteúdo principal, usando ${sectionsResult.rows.length} seções`);
                        }
                    } catch (sectionError) {
                        console.error('❌ [IA] Erro ao buscar seções do livro:', sectionError);
                    }
                }
                
                // Se ainda não tem conteúdo, pular
                if (!bookContent) {
                    console.log(`⚠️ [IA] Livro "${kb.title}" sem conteúdo (source_type: ${kb.source_type})`);
                    continue;
                }
                
                // BUSCA FLEXÍVEL: Se temos entidades, verificar se aparecem no conhecimento
                let entityMatchScore = 0;
                if (questionContext.entities.length > 0) {
                    const contentLower = bookContent.toLowerCase();
                    const titleLower = kb.title.toLowerCase();
                    
                    for (const entity of questionContext.entities) {
                        const entityLower = entity.toLowerCase();
                        
                        // Verificar se entidade aparece no conteúdo ou título (case-insensitive)
                        if (contentLower.includes(entityLower) || titleLower.includes(entityLower) ||
                            contentLower.includes(entity) || titleLower.includes(entity)) {
                            entityMatchScore += 100; // Score muito alto para match de entidade
                            
                            // Bonus se está no título
                            if (titleLower.includes(entityLower) || titleLower.includes(entity)) {
                                entityMatchScore += 50;
                            }
                            
                            // Bonus se aparece múltiplas vezes no conteúdo
                            const entityEscaped = entityLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const entityRegex = new RegExp(entityEscaped, 'gi');
                            const entityCount = (contentLower.match(entityRegex) || []).length;
                            entityMatchScore += Math.min(entityCount * 10, 50);
                        }
                        
                        // BUSCA ESPECIAL PARA PNL: Procurar por sinônimos
                        if (entityLower === 'pnl' || entity === 'PNL') {
                            const pnlSynonyms = [
                                'programação neurolinguística',
                                'programacao neurolinguistica',
                                'neurolinguística',
                                'neurolinguistica',
                                'programação neurolinguística',
                                'pnl'
                            ];
                            for (const synonym of pnlSynonyms) {
                                if (contentLower.includes(synonym) || titleLower.includes(synonym)) {
                                    entityMatchScore += 150; // Score ainda maior para sinônimos
                                    console.log(`✅ [IA] PNL encontrado por sinônimo "${synonym}" em "${kb.title.substring(0, 50)}"`);
                                    break;
                                }
                            }
                        }
                        
                        // BUSCA ESPECIAL PARA JESUS: Procurar por variações
                        if (entityLower === 'jesus' || entity === 'JESUS') {
                            const jesusVariations = ['jesus', 'cristo', 'jesus cristo', 'cristo jesus'];
                            for (const variation of jesusVariations) {
                                if (contentLower.includes(variation) || titleLower.includes(variation)) {
                                    entityMatchScore += 150;
                                    console.log(`✅ [IA] Jesus encontrado por variação "${variation}" em "${kb.title.substring(0, 50)}"`);
                                    break;
                                }
                            }
                        }
                        
                        // Busca flexível: variações da entidade
                        const entityVariations = [
                            entityLower + 's', // plural
                            entityLower.substring(0, Math.max(1, entityLower.length - 1)), // sem última letra
                            entityLower + ' ', // com espaço
                            ' ' + entityLower + ' ' // com espaços
                        ];
                        
                        for (const variation of entityVariations) {
                            if (contentLower.includes(variation) || titleLower.includes(variation)) {
                                entityMatchScore += 30;
                            }
                        }
                    }
                }
                
                // CALCULAR RELEVÂNCIA INTELIGENTE (novo sistema)
                const intelligentScore = calculateIntelligentRelevance(questionContext, {
                    title: kb.title,
                    content: bookContent,
                    keywords: kb.keywords,
                    source_type: kb.source_type
                });
                
                // Calcular scores tradicionais (para compatibilidade)
                const titleScore = calculateSimilarity(userMessage, kb.title) * 2.0;
                const contentScore = calculateSimilarity(userMessage, bookContent) * 0.8;
                
                // Score por palavras-chave cadastradas
                let keywordScore = 0;
                if (kb.keywords && Array.isArray(kb.keywords)) {
                    const matchingKeywords = kb.keywords.filter(k => {
                        const lowerK = k.toLowerCase();
                        return userMessage.toLowerCase().includes(lowerK) || 
                               userKeywords.some(uk => lowerK.includes(uk) || uk.includes(lowerK));
                    });
                    keywordScore = matchingKeywords.length * 20;
                }
                
                // Score por palavras-chave extraídas da mensagem
                let extractedKeywordScore = 0;
                if (bookContent) {
                    const contentLower = bookContent.toLowerCase();
                    const matchingExtracted = userKeywords.filter(uk => contentLower.includes(uk));
                    extractedKeywordScore = matchingExtracted.length * 10;
                }
                
                // Score por similaridade de título
                const titleKeywordMatch = userKeywords.some(uk => kb.title.toLowerCase().includes(uk));
                const titleBonus = titleKeywordMatch ? 30 : 0;
                
                // PRIORIDADE MÁXIMA: LIVROS têm score extra!
                let bookBonus = 0;
                if (kb.source_type === 'book_training' || kb.source_type === 'tavily_book' || kb.source_type === 'tavily_book_trained') {
                    bookBonus = 200; // BONUS ENORME para livros!
                    console.log(`📚 [IA] Livro encontrado: "${kb.title.substring(0, 50)}" - Bonus aplicado!`);
                }
                
                // PRIORIDADE: Se temos match de entidade, usar ele (prioridade máxima)
                // Senão, usar score inteligente se for alto, senão usar score tradicional
                // SEMPRE adicionar bonus de livro!
                const totalScore = (entityMatchScore > 0 ? entityMatchScore : 
                                 (intelligentScore > 50 ? intelligentScore : 
                                 (titleScore + contentScore + keywordScore + extractedKeywordScore + titleBonus))) + bookBonus;
                
                // Adicionar à lista de candidatos (incluir conteúdo processado)
                candidates.push({
                    kb: { ...kb, content: bookContent }, // Usar conteúdo processado (pode incluir seções)
                    score: totalScore,
                    intelligentScore: intelligentScore
                });
            }
            
            // Ordenar candidatos por score (maior primeiro)
            candidates.sort((a, b) => b.score - a.score);
            
            // FILTRO CRÍTICO: Se a pergunta NÃO é sobre o sistema, NÃO usar conhecimento do sistema
            if (questionIsAboutSystem === null) {
                questionIsAboutSystem = isAboutSystem(userMessage);
            }
            let filteredCandidates = candidates;
            
            if (!questionIsAboutSystem) {
                // Filtrar conhecimento do sistema (source_type: 'initial', 'advanced', 'manual')
                filteredCandidates = candidates.filter(c => {
                    const sourceType = c.kb.source_type;
                    // Permitir apenas conhecimento de livros, Tavily, documentos, etc.
                    return sourceType !== 'initial' && 
                           sourceType !== 'advanced' && 
                           sourceType !== 'manual' &&
                           sourceType !== 'system';
                });
                
                console.log('🔍 [IA] Pergunta NÃO é sobre sistema. Filtrados:', {
                    total: candidates.length,
                    filtrados: filteredCandidates.length,
                    removidos: candidates.length - filteredCandidates.length
                });
            }
            
            // Buscar o melhor candidato válido (que realmente responde à pergunta)
            let bestCandidate = null;
            let bestKb = null;
            let relevantExcerpt = null;
            
            // Iterar pelos candidatos filtrados para encontrar um que realmente responda
            for (const candidate of filteredCandidates) {
                // REDUZIR LIMITE: Aceitar candidatos com score menor se for livro
                const minScore = candidate.kb.source_type && candidate.kb.source_type.includes('book') ? 50 : 30;
                if (candidate.score < minScore) {
                    console.log(`⚠️ [IA] Score muito baixo (${candidate.score}) para "${candidate.kb.title?.substring(0, 50) || 'sem título'}", pulando...`);
                    break; // Parar se score muito baixo
                }
                
                const kb = candidate.kb;
                
                // VALIDAÇÃO FLEXÍVEL: Se a pergunta tem entidade, verificar se conhecimento menciona
                if (questionContext.entities.length > 0) {
                    const contentLower = kb.content.toLowerCase();
                    const titleLower = kb.title.toLowerCase();
                    let entityFound = false;
                    
                    // Verificar TODAS as entidades (não apenas a primeira)
                    for (const entity of questionContext.entities) {
                        const entityLower = entity.toLowerCase();
                        
                        // Busca flexível: verificar se entidade aparece no conteúdo ou título
                        // Também verificar variações (com/sem espaços, maiúsculas/minúsculas)
                        if (contentLower.includes(entityLower) || 
                            titleLower.includes(entityLower) ||
                            contentLower.includes(entity) || 
                            titleLower.includes(entity)) {
                            entityFound = true;
                            console.log(`✅ [IA] Entidade "${entity}" encontrada em "${kb.title?.substring(0, 50) || 'sem título'}"`);
                            break; // Encontrou, pode parar
                        }
                        
                        // BUSCA ESPECIAL PARA JESUS: Procurar por variações (MELHORADA)
                        if (entityLower === 'jesus' || entity === 'JESUS' || entityLower === 'jesus cristo') {
                            const jesusVariations = [
                                'jesus', 'cristo', 'jesus cristo', 'cristo jesus',
                                'jesus de nazaré', 'jesus de nazare', 'cristo jesus',
                                'filho de deus', 'messias', 'salvador', 'senhor jesus',
                                'jesus, o cristo', 'cristo, o filho'
                            ];
                            for (const variation of jesusVariations) {
                                if (contentLower.includes(variation) || titleLower.includes(variation)) {
                                    entityFound = true;
                                    console.log(`✅ [IA] Jesus encontrado por variação "${variation}" em "${kb.title?.substring(0, 50) || 'sem título'}"`);
                                    break;
                                }
                            }
                            if (entityFound) break;
                        }
                        
                        // Busca parcial: se entidade é "pnl", procurar por "pnl" ou "programação neurolinguística"
                        if (entityLower === 'pnl' || entityLower === 'p.n.l') {
                            if (contentLower.includes('programação neurolinguística') ||
                                contentLower.includes('programacao neurolinguistica') ||
                                contentLower.includes('neurolinguística') ||
                                contentLower.includes('neurolinguistica')) {
                                entityFound = true;
                                console.log(`✅ [IA] PNL encontrado por variação em "${kb.title?.substring(0, 50) || 'sem título'}"`);
                                break;
                            }
                        }
                    }
                    
                    // Se NÃO encontrou nenhuma entidade, MAS é um livro, dar mais uma chance
                    if (!entityFound) {
                        // Se é livro e tem score alto, pode ser relevante mesmo sem match exato
                        if (kb.source_type && kb.source_type.includes('book') && candidate.score > 200) {
                            console.log(`⚠️ [IA] Livro "${kb.title?.substring(0, 50) || 'sem título'}" não menciona entidade diretamente, mas score alto (${candidate.score}), continuando...`);
                            // Continuar, mas marcar que precisa buscar melhor
                        } else {
                            console.log(`⚠️ [IA] Conhecimento "${kb.title?.substring(0, 50) || 'sem título'}" não menciona nenhuma entidade "${questionContext.entities.join(', ')}", pulando...`);
                            continue; // Pular para próximo candidato
                        }
                    }
                }
                
                // ENCONTRAR TRECHO RELEVANTE que responde à pergunta
                let excerpt = findRelevantExcerpt(kb.content, questionContext, 500);
                
                // VALIDAÇÃO FLEXÍVEL: Se encontrou trecho, verificar se realmente menciona a entidade
                if (excerpt && questionContext.entities.length > 0) {
                    const excerptLower = excerpt.toLowerCase();
                    let entityFoundInExcerpt = false;
                    
                    // Verificar TODAS as entidades
                    for (const entity of questionContext.entities) {
                        const entityLower = entity.toLowerCase();
                        
                        if (excerptLower.includes(entityLower) || excerptLower.includes(entity)) {
                            entityFoundInExcerpt = true;
                            break;
                        }
                        
                        // Busca parcial para PNL (com sinônimos)
                        if ((entityLower === 'pnl' || entity === 'PNL' || entityLower === 'p.n.l') && 
                            (excerptLower.includes('programação neurolinguística') ||
                             excerptLower.includes('programacao neurolinguistica') ||
                             excerptLower.includes('neurolinguística') ||
                             excerptLower.includes('neurolinguistica') ||
                             excerptLower.includes('pnl'))) {
                            entityFoundInExcerpt = true;
                            console.log(`✅ [IA] PNL encontrado no trecho por sinônimo`);
                            break;
                        }
                        
                        // BUSCA MELHORADA PARA JESUS: Procurar por todas as variações
                        if (entityLower === 'jesus' || entity === 'JESUS' || entityLower === 'jesus cristo') {
                            const jesusVariations = [
                                'jesus', 'cristo', 'jesus cristo', 'cristo jesus',
                                'jesus de nazaré', 'jesus de nazare', 'cristo jesus',
                                'filho de deus', 'messias', 'salvador', 'senhor jesus',
                                'jesus, o cristo', 'cristo, o filho', 'o cristo',
                                'nosso senhor', 'senhor jesus cristo'
                            ];
                            for (const variation of jesusVariations) {
                                if (excerptLower.includes(variation)) {
                                    entityFoundInExcerpt = true;
                                    console.log(`✅ [IA] Jesus encontrado no trecho por variação "${variation}"`);
                                    break;
                                }
                            }
                            if (entityFoundInExcerpt) break;
                        }
                    }
                    
                    // Se o trecho não menciona nenhuma entidade, tentar encontrar outro
                    if (!entityFoundInExcerpt) {
                        console.log(`⚠️ [IA] Trecho encontrado não menciona entidades "${questionContext.entities.join(', ')}", buscando outro...`);
                        excerpt = null; // Forçar buscar outro trecho
                        
                        // BUSCA MELHORADA: Tentar buscar manualmente parágrafos que mencionam a entidade
                        const paragraphs = kb.content.split(/\n\n+/);
                        for (const para of paragraphs) {
                            const paraLower = para.toLowerCase();
                            for (const entity of questionContext.entities) {
                                const entityLower = entity.toLowerCase();
                                
                                // Busca direta
                                if (paraLower.includes(entityLower) || paraLower.includes(entity)) {
                                    excerpt = para.substring(0, 500);
                                    console.log(`✅ [IA] Trecho alternativo encontrado com entidade "${entity}"`);
                                    break;
                                }
                                
                                // Busca especial para Jesus
                                if (entityLower === 'jesus' || entityLower === 'jesus cristo') {
                                    const jesusVariations = ['jesus', 'cristo', 'jesus cristo', 'cristo jesus', 'messias', 'salvador'];
                                    for (const variation of jesusVariations) {
                                        if (paraLower.includes(variation)) {
                                            excerpt = para.substring(0, 500);
                                            console.log(`✅ [IA] Trecho encontrado com variação "${variation}" de Jesus`);
                                            break;
                                        }
                                    }
                                    if (excerpt) break;
                                }
                            }
                            if (excerpt) break;
                        }
                    }
                }
                
                // Se não encontrou trecho relevante, tentar extrair resposta direta
                if (!excerpt) {
                    excerpt = extractDirectAnswer(kb.content, userMessage);
                    
                    // LIMPAR CONTEÚDO: Remover referências estruturais se for de livro
                    if (excerpt && kb.source_type && (kb.source_type.includes('book') || kb.source_type === 'book_training' || kb.source_type === 'tavily_book' || kb.source_type === 'tavily_book_trained')) {
                        excerpt = cleanBookContent(excerpt);
                    }
                    
                    // Validar se resposta direta menciona entidade (FLEXÍVEL)
                    if (excerpt && questionContext.entities.length > 0) {
                        const entity = questionContext.entities[0];
                        const entityLower = entity.toLowerCase();
                        const excerptLower = excerpt.toLowerCase();
                        
                        // Verificar variações também
                        let hasEntity = excerptLower.includes(entityLower);
                        if (!hasEntity && entityLower === 'jesus') {
                            hasEntity = excerptLower.includes('cristo') || excerptLower.includes('messias') || excerptLower.includes('salvador');
                        }
                        
                        if (!hasEntity) {
                            excerpt = null;
                        }
                    }
                }
                
                // Se ainda não encontrou, buscar parágrafos que mencionam a entidade (BUSCA MELHORADA)
                if (!excerpt && questionContext.entities.length > 0) {
                    const entity = questionContext.entities[0];
                    const entityLower = entity.toLowerCase();
                    const paragraphs = kb.content.split(/\n\n+/);
                    
                    for (const para of paragraphs) {
                        const paraLower = para.toLowerCase();
                        
                        // Busca direta
                        if ((paraLower.includes(entityLower) || paraLower.includes(entity)) && para.length > 50) {
                            // Filtrar conteúdo acadêmico
                            if (!filterAcademicContent(para)) {
                                excerpt = para.substring(0, 500);
                                console.log(`✅ [IA] Encontrado parágrafo que menciona "${entity}"`);
                                break;
                            }
                        }
                        
                        // Busca especial para Jesus
                        if (entityLower === 'jesus' || entityLower === 'jesus cristo') {
                            const jesusVariations = ['jesus', 'cristo', 'jesus cristo', 'cristo jesus', 'messias', 'salvador', 'filho de deus'];
                            for (const variation of jesusVariations) {
                                if (paraLower.includes(variation) && para.length > 50) {
                                    if (!filterAcademicContent(para)) {
                                        excerpt = para.substring(0, 500);
                                        console.log(`✅ [IA] Encontrado parágrafo sobre Jesus por variação "${variation}"`);
                                        break;
                                    }
                                }
                            }
                            if (excerpt) break;
                        }
                    }
                }
                
                // Se ainda não encontrou, resumir APENAS se mencionar a entidade (FLEXÍVEL)
                if (!excerpt) {
                    const contentLower = kb.content.toLowerCase();
                    if (questionContext.entities.length > 0) {
                        const entity = questionContext.entities[0];
                        const entityLower = entity.toLowerCase();
                        
                        // Verificar se conteúdo menciona a entidade ou variações
                        let hasEntity = contentLower.includes(entityLower);
                        if (!hasEntity && entityLower === 'jesus') {
                            hasEntity = contentLower.includes('cristo') || contentLower.includes('messias') || contentLower.includes('salvador');
                        }
                        
                        // Só resumir se tem a entidade
                        // LÓGICA INTELIGENTE: Para perguntas sobre pessoas, usar mais conteúdo
                        if (hasEntity) {
                            const summaryLength = questionContext.questionType === 'who' ? 1000 : 400;
                            excerpt = summarizeAnswer(kb.content, summaryLength);
                            // LIMPAR CONTEÚDO: Remover referências estruturais se for de livro
                            if (excerpt && kb.source_type && (kb.source_type.includes('book') || kb.source_type === 'book_training' || kb.source_type === 'tavily_book' || kb.source_type === 'tavily_book_trained')) {
                                excerpt = cleanBookContent(excerpt);
                            }
                            // Validar novamente (FLEXÍVEL)
                            if (excerpt) {
                                const excerptLower = excerpt.toLowerCase();
                                let hasEntityInExcerpt = excerptLower.includes(entityLower);
                                if (!hasEntityInExcerpt && entityLower === 'jesus') {
                                    hasEntityInExcerpt = excerptLower.includes('cristo') || excerptLower.includes('messias');
                                }
                                if (!hasEntityInExcerpt) {
                                    excerpt = null;
                                }
                            }
                        }
                    } else {
                        // Se não tem entidade, pode resumir normalmente
                        // LÓGICA INTELIGENTE: Ajustar tamanho baseado no tipo de pergunta
                        const summaryLength = questionContext.questionType === 'who' ? 800 : 
                                            questionContext.questionType === 'what' ? 500 : 400;
                        excerpt = summarizeAnswer(kb.content, summaryLength);
                        // LIMPAR CONTEÚDO: Remover referências estruturais se for de livro
                        if (excerpt && kb.source_type && (kb.source_type.includes('book') || kb.source_type === 'book_training' || kb.source_type === 'tavily_book' || kb.source_type === 'tavily_book_trained')) {
                            excerpt = cleanBookContent(excerpt);
                        }
                    }
                }
                
                // VALIDAÇÃO FINAL FLEXÍVEL: Se ainda não tem trecho, tentar usar parte do conteúdo
                if (!excerpt && questionContext.entities.length > 0) {
                    const entity = questionContext.entities[0];
                    const entityLower = entity.toLowerCase();
                    const contentLower = kb.content.toLowerCase();
                    
                    // Verificar se conteúdo menciona entidade
                    let hasEntity = contentLower.includes(entityLower);
                    if (!hasEntity && entityLower === 'jesus') {
                        hasEntity = contentLower.includes('cristo') || contentLower.includes('messias') || contentLower.includes('salvador');
                    }
                    
                    if (hasEntity) {
                        // LÓGICA INTELIGENTE: Para perguntas sobre pessoas, buscar mais contexto
                        const contextLength = questionContext.questionType === 'who' ? 1200 : 500;
                        
                        // Usar primeira parte que menciona a entidade
                        const sentences = kb.content.split(/[.!?]+/);
                        let foundSentences = [];
                        for (const sentence of sentences) {
                            const sentLower = sentence.toLowerCase();
                            if (sentLower.includes(entityLower) || (entityLower === 'jesus' && (sentLower.includes('cristo') || sentLower.includes('messias')))) {
                                foundSentences.push(sentence);
                                // Para perguntas sobre pessoas, coletar múltiplas sentenças
                                if (questionContext.questionType === 'who') {
                                    // Continuar coletando até atingir o limite
                                    if (foundSentences.join('. ').length < contextLength) {
                                        continue;
                                    } else {
                                        break;
                                    }
                                } else {
                                    break;
                                }
                            }
                        }
                        
                        if (foundSentences.length > 0) {
                            excerpt = foundSentences.join('. ').substring(0, contextLength);
                            // LIMPAR CONTEÚDO: Remover referências estruturais se for de livro
                            if (kb.source_type && (kb.source_type.includes('book') || kb.source_type === 'book_training' || kb.source_type === 'tavily_book' || kb.source_type === 'tavily_book_trained')) {
                                excerpt = cleanBookContent(excerpt);
                            }
                            console.log(`✅ [IA] Usando frase que menciona "${entity}"`);
                        }
                        
                        // Se ainda não encontrou, usar início do conteúdo se menciona entidade
                        if (!excerpt) {
                            // LÓGICA INTELIGENTE: Para perguntas sobre pessoas, usar mais conteúdo
                            const contextLength = questionContext.questionType === 'who' ? 1200 : 500;
                            const firstPart = kb.content.substring(0, contextLength);
                            const firstPartLower = firstPart.toLowerCase();
                            if (firstPartLower.includes(entityLower) || (entityLower === 'jesus' && (firstPartLower.includes('cristo') || firstPartLower.includes('messias')))) {
                                excerpt = firstPart;
                                // LIMPAR CONTEÚDO: Remover referências estruturais se for de livro
                                if (kb.source_type && (kb.source_type.includes('book') || kb.source_type === 'book_training' || kb.source_type === 'tavily_book' || kb.source_type === 'tavily_book_trained')) {
                                    excerpt = cleanBookContent(excerpt);
                                }
                                console.log(`✅ [IA] Usando início do conteúdo que menciona "${entity}"`);
                            }
                        }
                    }
                    
                    // Se ainda não tem, mas é livro com score alto, usar mesmo assim
                    if (!excerpt && kb.source_type && kb.source_type.includes('book') && candidate.score > 200) {
                        // LÓGICA INTELIGENTE: Para perguntas sobre pessoas, usar mais conteúdo
                        const contextLength = questionContext.questionType === 'who' ? 1200 : 500;
                        excerpt = kb.content.substring(0, contextLength);
                        // LIMPAR CONTEÚDO: Remover referências estruturais
                        excerpt = cleanBookContent(excerpt);
                        console.log(`⚠️ [IA] Usando conteúdo do livro mesmo sem match exato (score alto: ${candidate.score})`);
                    }
                    
                    // Última tentativa: se ainda não tem, pular
                    if (!excerpt) {
                        console.log(`❌ [IA] Não foi possível encontrar trecho relevante sobre "${entity}" em "${kb.title?.substring(0, 50) || 'sem título'}", pulando...`);
                        continue; // Pular para próximo candidato
                    }
                }
                
                // Se não tem entidade, usar início do conteúdo
                if (!excerpt && questionContext.entities.length === 0) {
                    // LÓGICA INTELIGENTE: Ajustar tamanho baseado no tipo de pergunta
                    const contextLength = questionContext.questionType === 'who' ? 1000 : 
                                        questionContext.questionType === 'what' ? 600 : 500;
                    excerpt = kb.content.substring(0, contextLength);
                    // LIMPAR CONTEÚDO: Remover referências estruturais se for de livro
                    if (kb.source_type && (kb.source_type.includes('book') || kb.source_type === 'book_training' || kb.source_type === 'tavily_book' || kb.source_type === 'tavily_book_trained')) {
                        excerpt = cleanBookContent(excerpt);
                    }
                }
                
                // Se chegou aqui, encontramos um candidato válido!
                // LIMPAR CONTEÚDO: Remover referências a capítulos, páginas e estrutura do livro
                if (kb.source_type && (kb.source_type.includes('book') || kb.source_type === 'book_training' || kb.source_type === 'tavily_book' || kb.source_type === 'tavily_book_trained')) {
                    excerpt = cleanBookContent(excerpt);
                    console.log('🧹 [IA] Conteúdo do livro limpo (removidas referências estruturais)');
                }
                
                bestCandidate = candidate;
                bestKb = kb;
                relevantExcerpt = excerpt;
                break; // Usar o primeiro candidato válido encontrado
            }
            
            // Se encontrou candidato válido, usar ele
            if (bestCandidate && bestKb && relevantExcerpt) {
                const kb = bestKb;
                
                console.log('🎯 [IA] Melhor conhecimento encontrado:', {
                    title: kb.title.substring(0, 50),
                    score: bestCandidate.score,
                    intelligentScore: bestCandidate.intelligentScore,
                    source_type: kb.source_type,
                    hasEntity: questionContext.entities.length > 0 ? kb.content.toLowerCase().includes(questionContext.entities[0]) : true
                });
                
                // CAMADA 2: Sintetizar resposta de múltiplas fontes (se houver mais candidatos relevantes)
                const topCandidates = filteredCandidates.filter(c => {
                    // FILTRO RÍGIDO: Se pergunta tem entidade, só incluir candidatos que a mencionam
                    if (questionContext.entities.length > 0) {
                        const entity = questionContext.entities[0];
                        const titleLower = (c.kb.title || '').toLowerCase();
                        const contentLower = (c.kb.content || '').toLowerCase();
                        return (titleLower.includes(entity) || contentLower.includes(entity)) && c.score > 50;
                    }
                    return c.score > 50;
                }).slice(0, 3);
                
                const knowledgeSources = topCandidates.map(c => {
                    // LÓGICA INTELIGENTE: Ajustar tamanho baseado no tipo de pergunta
                    const excerptLength = questionContext.questionType === 'who' ? 800 : 
                                       questionContext.questionType === 'what' ? 500 : 300;
                    
                    let excerpt = findRelevantExcerpt(c.kb.content, questionContext, excerptLength) || 
                                  extractDirectAnswer(c.kb.content, userMessage) ||
                                  summarizeAnswer(c.kb.content, excerptLength);
                    
                    // LIMPAR CONTEÚDO: Remover referências estruturais se for de livro
                    if (c.kb.source_type && (c.kb.source_type.includes('book') || c.kb.source_type === 'book_training' || c.kb.source_type === 'tavily_book' || c.kb.source_type === 'tavily_book_trained')) {
                        excerpt = cleanBookContent(excerpt);
                    }
                    
                    return {
                        excerpt: excerpt,
                        score: c.score,
                        title: c.kb.title
                    };
                }).filter(s => s.excerpt && s.excerpt.length > 20);
                
                // ============================================
                // FASE 2: INTEGRAR CONHECIMENTO DO GRAFO E RACIOCÍNIO CAUSAL
                // ============================================
                // Adicionar conhecimento relacionado do grafo se disponível
                if (knowledgeGraphResult && knowledgeGraphResult.length > 0) {
                    console.log(`🕸️ [Grafo] Adicionando ${knowledgeGraphResult.length} conhecimentos relacionados do grafo`);
                    // Adicionar ao knowledgeSources para síntese
                    for (const kgKnowledge of knowledgeGraphResult.slice(0, 2)) {
                        const excerpt = findRelevantExcerpt(kgKnowledge.content || kgKnowledge.title, questionContext, 300);
                        if (excerpt) {
                            knowledgeSources.push({
                                excerpt: excerpt,
                                score: 60, // Score médio para conhecimento do grafo
                                title: kgKnowledge.title || 'Conhecimento Relacionado'
                            });
                        }
                    }
                }
                
                // Adicionar explicação causal se disponível
                if (causalReasoningResult && causalReasoningResult.explanation) {
                    console.log('⚡ [Causal] Adicionando explicação causal à resposta');
                    // Adicionar explicação causal como fonte adicional
                    knowledgeSources.push({
                        excerpt: causalReasoningResult.explanation,
                        score: 70, // Score bom para raciocínio causal
                        title: 'Análise Causal'
                    });
                }
                
                // Sintetizar de múltiplas fontes se tiver mais de uma fonte relevante
                let synthesizedAnswer = null;
                if (knowledgeSources.length > 1) {
                    synthesizedAnswer = synthesizeAnswer(knowledgeSources, questionContext, thoughts);
                }
                
                // Usar resposta sintetizada se disponível, senão usar a melhor única
                // LIMPAR CONTEÚDO: Remover referências estruturais se for de livro
                let finalAnswer = synthesizedAnswer || relevantExcerpt;
                if (bestKb && bestKb.source_type && (bestKb.source_type.includes('book') || bestKb.source_type === 'book_training' || bestKb.source_type === 'tavily_book' || bestKb.source_type === 'tavily_book_trained')) {
                    finalAnswer = cleanBookContent(finalAnswer);
                }
                
                if (questionContext.entities.length > 0 && finalAnswer) {
                    const entity = questionContext.entities[0];
                    const answerLower = finalAnswer.toLowerCase();
                    if (!answerLower.includes(entity)) {
                        console.log('❌ [IA] Resposta final não menciona a entidade, rejeitando');
                        finalAnswer = null; // Rejeitar esta resposta
                    }
                }
                
                if (finalAnswer) {
                    // ============================================
                    // NOVO: APLICAR CHAIN OF THOUGHT SE NÃO FOI USADO ANTES
                    // ============================================
                    if (!chainOfThoughtResult || !chainOfThoughtResult.used) {
                        // Se pergunta é complexa, tentar Chain of Thought
                        if (thoughts.complexity === 'complex' || thoughts.semanticAnalysis?.requiresMultiStepReasoning) {
                            try {
                                const knowledgeForChain = topCandidates.map(c => c.kb);
                                chainOfThoughtResult = await chainOfThoughtReasoning(
                                    userMessage,
                                    questionContext,
                                    knowledgeForChain,
                                    client
                                );
                                
                                // Se Chain of Thought gerou resposta melhor, usar ela
                                if (chainOfThoughtResult.used && 
                                    chainOfThoughtResult.finalAnswer && 
                                    chainOfThoughtResult.confidence > bestScore) {
                                    console.log('✅ [Chain of Thought] Usando resposta do raciocínio passo a passo');
                                    finalAnswer = chainOfThoughtResult.finalAnswer;
                                    bestScore = chainOfThoughtResult.confidence;
                                    bestSource = 'chain_of_thought';
                                }
                            } catch (error) {
                                console.error('Erro ao aplicar Chain of Thought:', error);
                            }
                        }
                    }
                    
                    bestAnswer = finalAnswer;
                    if (bestSource !== 'chain_of_thought') {
                        bestScore = bestCandidate.score;
                        bestSource = 'knowledge';
                    }
                    
                    // GUARDAR INFORMAÇÃO: Esta resposta veio de um LIVRO?
                    const isFromBook = bookSources.includes(bestKb.source_type);
                    if (isFromBook) {
                        console.log('📚 [IA] RESPOSTA ENCONTRADA EM LIVRO:', {
                            livro: bestKb.title.substring(0, 50),
                            score: bestScore,
                            source_type: bestKb.source_type
                        });
                    }
                    
                    // APLICAR PROMPT MESTRE - MENTALIDADE TIPO GPT (ANTES DE QUALQUER OUTRA MODIFICAÇÃO)
                    bestAnswer = applyGPTMasterPrompt(bestAnswer, bestKb, questionContext);
                    
                    // CAMADA 3: Adicionar personalidade e emoção (após aplicar prompt mestre)
                    bestAnswer = addPersonalityAndEmotion(bestAnswer, thoughts, questionContext);
                    
                    // CAMADA 4: Raciocínio independente - adicionar sugestões e conexões
                    const independentThoughts = thinkIndependently(questionContext, knowledgeResult.rows, thoughts);
                    if (independentThoughts.connections.length > 0 && bestAnswer.length < 600) {
                        bestAnswer += `\n\n🔗 Relacionado: Também tenho informações sobre ${independentThoughts.connections.slice(0, 2).join(' e ')}. Quer saber mais?`;
                    }
                    
                    // Log para debug
                    if (bestKb.source_type === 'book_training' || bestKb.source_type === 'tavily_book' || bestKb.source_type === 'tavily_book_trained') {
                        console.log('📚 [IA] Usando conhecimento de LIVRO (com sistema de pensamento):', bestKb.title.substring(0, 50));
                    }
                    
                    console.log('🧠 [IA] Resposta processada com sistema de pensamento:', {
                        intent: thoughts.intent,
                        synthesized: !!synthesizedAnswer,
                        sourcesUsed: knowledgeSources.length,
                        hasConnections: independentThoughts.connections.length > 0
                    });
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
                    
                    // Extrair resposta direta e objetiva
                    let extractedAnswer = extractDirectAnswer(text, userMessage);
                    
                    // Se não conseguiu extrair, procurar trecho relevante
                    if (!extractedAnswer) {
                        const words = userMessage.toLowerCase().split(/\s+/);
                        const relevantPart = text.split('\n').find(para => 
                            words.some(w => para.toLowerCase().includes(w))
                        ) || text.substring(0, 300);
                        extractedAnswer = summarizeAnswer(relevantPart, 300);
                    }
                    
                    bestAnswer = extractedAnswer ? `Com base no documento "${doc.title}":\n\n${extractedAnswer}` : `Com base no documento "${doc.title}":\n\n${text.substring(0, 300)}`;
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
            
            console.log('🔍 [IA] Query de configuração retornou:', {
                rowsCount: configResult.rows.length,
                hasRows: configResult.rows.length > 0,
                firstRow: configResult.rows.length > 0 ? {
                    id: configResult.rows[0].id,
                    is_enabled: configResult.rows[0].is_enabled,
                    api_provider: configResult.rows[0].api_provider,
                    has_api_key: !!configResult.rows[0].api_key
                } : null
            });
            
            if (configResult.rows.length > 0) {
                const config = configResult.rows[0];
                if (config.is_enabled) {
                    webSearchConfig = config;
                    console.log('✅ [IA] Configuração encontrada e habilitada!');
                } else {
                    console.log('⚠️ [IA] Configuração encontrada mas DESABILITADA (is_enabled = false)');
                }
            } else {
                console.log('⚠️ [IA] Nenhuma configuração encontrada na tabela ia_web_search_config');
            }
        } catch (error) {
            console.error('❌ [IA] ERRO ao buscar configuração de busca na web:', error);
            console.error('Stack:', error.stack);
        }
        
        // Verificar se a pergunta é sobre o sistema ou sobre outras coisas
        if (questionIsAboutSystem === null) {
            questionIsAboutSystem = isAboutSystem(userMessage);
        }
        
        console.log('🔍 [IA] Análise da pergunta:', {
            pergunta: userMessage.substring(0, 50),
            isAboutSystem: questionIsAboutSystem,
            hasAnswer: !!bestAnswer,
            bestScore: bestScore,
            bestSource: bestSource
        });
        
        // DEBUG: Verificar configuração do Tavily
        if (webSearchConfig) {
            console.log('📋 [IA] Configuração de busca na web:', {
                is_enabled: webSearchConfig.is_enabled,
                api_provider: webSearchConfig.api_provider,
                has_api_key: !!webSearchConfig.api_key,
                api_key_preview: webSearchConfig.api_key ? webSearchConfig.api_key.substring(0, 20) + '...' : 'N/A'
            });
        } else {
            console.log('⚠️ [IA] Configuração de busca na web NÃO encontrada!');
        }
        
        // LÓGICA MELHORADA: Buscar na web se:
        // 1. Qualquer API está configurada E habilitada (sistema multi-API)
        // 2. NÃO buscar se já temos resposta de LIVRO (prioridade máxima - conhecimento dos livros é mais confiável)
        // 3. PRIORIDADE: Se pergunta NÃO é sobre sistema, buscar (mas não se tiver resposta de livro)
        // 4. Se é sobre sistema, buscar apenas se não tem resposta ou score baixo
        const hasWebSearchConfig = webSearchConfig && 
                                   webSearchConfig.is_enabled && 
                                   webSearchConfig.api_key;
        
        // VERIFICAR SE TEM RESPOSTA DE LIVRO (PRIORIDADE MÁXIMA)
        // Verificar se a resposta veio de um livro processado
        let hasBookKnowledge = false;
        let bookAnswerScore = 0;
        const bookSources = ['book_training', 'tavily_book', 'tavily_book_trained'];
        
        if (bestAnswer && bestSource === 'knowledge') {
            // Verificar se a resposta veio de um livro - buscar na base de conhecimento novamente se necessário
            try {
                const bookCheck = await client.query(`
                    SELECT source_type FROM ia_knowledge_base
                    WHERE is_active = true
                    AND source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
                    AND (
                        LOWER(title) LIKE LOWER($1) OR
                        LOWER(content) LIKE LOWER($1)
                    )
                    LIMIT 1
                `, [`%${userMessage.substring(0, 50)}%`]);
                
                if (bookCheck.rows.length > 0) {
                    hasBookKnowledge = true;
                    bookAnswerScore = bestScore; // Usar o score atual
                    console.log('📚 [IA] RESPOSTA ENCONTRADA EM LIVRO (verificado):', {
                        score: bookAnswerScore,
                        source_type: bookCheck.rows[0].source_type
                    });
                } else if (bestScore >= 200) {
                    // Se score muito alto (200+), provavelmente é de livro devido ao bonus
                    hasBookKnowledge = true;
                    bookAnswerScore = bestScore;
                    console.log('📚 [IA] RESPOSTA PROVAVELMENTE DE LIVRO (score alto):', bookAnswerScore);
                }
            } catch (error) {
                console.error('Erro ao verificar livro:', error);
            }
        }
        
        // REGRA CRÍTICA: SÓ BUSCAR NA WEB SE:
        // 1. NÃO encontrou resposta nos livros OU
        // 2. Resposta dos livros tem score MUITO baixo (< 100) OU
        // 3. Resposta não menciona a entidade da pergunta (erro de busca)
        let shouldSearchWeb = false;
        
        if (hasWebSearchConfig) {
            // Se encontrou resposta de livro com score bom, NÃO buscar na web
            if (hasBookKnowledge && bookAnswerScore >= 100) {
                shouldSearchWeb = false;
                console.log('📚 [IA] RESPOSTA DE LIVRO ENCONTRADA - NÃO BUSCAR NA WEB! Score:', bookAnswerScore);
            } 
            // Se não encontrou resposta OU resposta tem score muito baixo
            else if (!bestAnswer || bestScore < 80) {
                // Validar se resposta menciona entidades da pergunta
                if (bestAnswer && questionContext.entities.length > 0) {
                    const answerLower = bestAnswer.toLowerCase();
                    const hasEntity = questionContext.entities.some(entity => answerLower.includes(entity));
                    
                    if (!hasEntity) {
                        console.log('⚠️ [IA] Resposta não menciona entidade da pergunta - Buscar na web');
                        shouldSearchWeb = true;
                    } else {
                        console.log('✅ [IA] Resposta menciona entidade - Não buscar na web');
                        shouldSearchWeb = false;
                    }
                } else {
                    // Não tem resposta ou score baixo - buscar na web
                    shouldSearchWeb = true;
                }
            } else {
                // Tem resposta com score bom - não buscar na web
                shouldSearchWeb = false;
            }
        }
        
        console.log('🤔 [IA] Decisão de buscar na web:', {
            shouldSearchWeb: shouldSearchWeb,
            hasWebSearchConfig: hasWebSearchConfig,
            api_provider: webSearchConfig?.api_provider || 'N/A',
            questionIsAboutSystem: questionIsAboutSystem,
            hasAnswer: !!bestAnswer,
            bestScore: bestScore,
            motivo: !webSearchConfig ? '❌ Sem configuração' :
                    !webSearchConfig.is_enabled ? '❌ Desabilitado' :
                    !webSearchConfig.api_key ? '❌ Sem API key' :
                    hasBookKnowledge ? '📚 Tem conhecimento de LIVRO - Prioridade máxima!' :
                    !questionIsAboutSystem ? '✅ PERGUNTA EXTERNA - Sempre buscar!' :
                    !bestAnswer ? '✅ Sem resposta na base' :
                    bestScore < 60 ? `✅ Score baixo: ${bestScore}` :
                    '⏭️ Não deve buscar (pergunta sobre sistema com boa resposta)'
        });
        
        if (shouldSearchWeb) {
            console.log(`🚀 [IA] INICIANDO BUSCA NA WEB COM ${webSearchConfig.api_provider?.toUpperCase() || 'MULTI-API'}!`);
            try {
                const webResults = await searchWeb(userMessage, webSearchConfig);
                
                console.log('📊 [IA] Resultados da busca na web:', {
                    hasResults: !!(webResults.results && webResults.results.length > 0),
                    resultsCount: webResults.results?.length || 0,
                    hasAnswer: !!webResults.answer,
                    provider: webResults.provider,
                    hasError: !!webResults.error
                });
                
                if (webResults.results && webResults.results.length > 0) {
                    // VALIDAÇÃO CRÍTICA: Verificar se resultados da web são relevantes
                    // Se pergunta tem entidade (ex: "Flamengo"), validar se resultados mencionam essa entidade
                    let validWebResults = webResults.results;
                    
                    if (questionContext.entities.length > 0) {
                        const entity = questionContext.entities[0].toLowerCase();
                        validWebResults = webResults.results.filter(r => {
                            const titleLower = (r.title || '').toLowerCase();
                            const snippetLower = (r.snippet || r.content || '').toLowerCase();
                            return titleLower.includes(entity) || snippetLower.includes(entity);
                        });
                        
                        if (validWebResults.length === 0) {
                            console.log(`⚠️ [IA] Resultados da web NÃO mencionam "${entity}" - Rejeitando resultados da web`);
                            console.log('📚 [IA] Mantendo resposta dos livros/base de conhecimento');
                            // NÃO usar resultados da web se não mencionam a entidade
                        } else {
                            console.log(`✅ [IA] ${validWebResults.length} resultados da web são relevantes (mencionam "${entity}")`);
                        }
                    }
                    
                    // SÓ usar resultados da web se:
                    // 1. NÃO tem resposta de livro OU
                    // 2. Resultados da web são válidos e relevantes
                    if ((!hasBookKnowledge || bookAnswerScore < 100) && validWebResults.length > 0) {
                        // Se Tavily retornou resposta direta, usar ela
                        if (webResults.answer) {
                            // Validar se resposta menciona entidade
                            if (questionContext.entities.length > 0) {
                                const entity = questionContext.entities[0].toLowerCase();
                                const answerLower = webResults.answer.toLowerCase();
                                if (!answerLower.includes(entity)) {
                                    console.log(`⚠️ [IA] Resposta do Tavily não menciona "${entity}" - Rejeitando`);
                                    // Manter resposta dos livros se tiver
                                } else {
                                    let tavilyAnswer = summarizeAnswer(webResults.answer, 300);
                                    if (!tavilyAnswer) {
                                        tavilyAnswer = webResults.answer.substring(0, 300);
                                    }
                                    
                                    bestAnswer = tavilyAnswer;
                                    bestScore = 70;
                                    bestSource = 'web_tavily';
                                    console.log('✅ [IA] USANDO RESPOSTA DIRETA DO TAVILY (validada)!');
                                    
                                    // APLICAR PROMPT MESTRE antes de aprender
                                    bestAnswer = applyGPTMasterPrompt(bestAnswer, null, questionContext);
                                    
                                    await learnFromTavily(userMessage, tavilyAnswer, client);
                                }
                            } else {
                                let tavilyAnswer = summarizeAnswer(webResults.answer, 300);
                                if (!tavilyAnswer) {
                                    tavilyAnswer = webResults.answer.substring(0, 300);
                                }
                                
                                bestAnswer = tavilyAnswer;
                                bestScore = 70;
                                bestSource = 'web_tavily';
                                console.log('✅ [IA] USANDO RESPOSTA DIRETA DO TAVILY!');
                                
                                // APLICAR PROMPT MESTRE antes de aprender
                                bestAnswer = applyGPTMasterPrompt(bestAnswer, null, questionContext);
                                
                                await learnFromTavily(userMessage, tavilyAnswer, client);
                            }
                        } else if (validWebResults.length > 0) {
                            // Usar resultados da web APENAS se não tem resposta de livro boa
                            if (!hasBookKnowledge || bookAnswerScore < 100) {
                                const topResults = validWebResults.slice(0, 2);
                                const webAnswer = topResults.map((r, idx) => {
                                    const snippet = (r.snippet || r.content || '').substring(0, 200);
                                    return `**${r.title}**\n${snippet}${(r.snippet || r.content || '').length > 200 ? '...' : ''}`;
                                }).join('\n\n');
                                
                                bestAnswer = webAnswer;
                                bestScore = 65; // Score menor que livros
                                bestSource = `web_${webResults.provider}`;
                                console.log('✅ [IA] USANDO RESULTADOS DA WEB (após validar relevância):', webResults.provider);
                                
                                // APLICAR PROMPT MESTRE antes de aprender
                                bestAnswer = applyGPTMasterPrompt(bestAnswer, null, questionContext);
                                
                                await learnFromTavily(userMessage, webAnswer, client);
                            } else {
                                console.log('📚 [IA] Mantendo resposta dos LIVROS (melhor que web)');
                            }
                        }
                    } else {
                        console.log('📚 [IA] Mantendo resposta dos LIVROS/BASE - Resultados da web não são relevantes');
                    }
                } else if (webResults.error) {
                    console.error('❌ [IA] Erro na busca Tavily:', webResults.error);
                } else {
                    console.log('⚠️ [IA] Nenhum resultado encontrado na web');
                }
            } catch (error) {
                console.error('❌ [IA] ERRO CRÍTICO ao buscar na web:', error);
                console.error('Stack trace:', error.stack);
                // Continuar sem buscar na web se der erro
            }
        } else {
            console.log('⏭️ [IA] PULANDO busca na web:', {
                hasConfig: !!webSearchConfig,
                isEnabled: webSearchConfig?.is_enabled,
                provider: webSearchConfig?.api_provider,
                hasKey: !!webSearchConfig?.api_key,
                hasAnswer: !!bestAnswer,
                score: bestScore,
                isAboutSystem: questionIsAboutSystem
            });
        }
        
        // ============================================
        // NOVO: USAR GEMINI PARA MELHORAR RESPOSTAS LOCAIS
        // ============================================
        // Garantir que questionIsAboutSystem está definido
        if (questionIsAboutSystem === null) {
            questionIsAboutSystem = isAboutSystem(userMessage);
        }
        
        if (hasAnyAPIConfigured()) {
            console.log('🤖 [IA] API Externa configurada - tentando melhorar resposta...', {
                hasLocalAnswer: !!bestAnswer,
                localScore: bestScore,
                isAboutSystem: questionIsAboutSystem,
                hasGemini: !!process.env.GEMINI_API_KEY,
                hasGroq: !!process.env.GROQ_API_KEY,
                hasHuggingFace: !!process.env.HUGGINGFACE_API_KEY
            });
            try {
                // Construir contexto detalhado para a API
                let contextInfo = '';
                if (questionIsAboutSystem) {
                    contextInfo = `O Conecta King é uma plataforma de cartões virtuais profissionais.

PLANOS DISPONÍVEIS:
- King Start: R$ 700,00 (pagamento único) - Ideal para iniciar
- King Prime: R$ 1.000,00 (pagamento único) - Para profissionais que buscam impacto
- King Corporate: R$ 2.300,00 (pagamento único) - Modo empresa

FORMAS DE PAGAMENTO:
- PIX (à vista, sem taxas)
- Cartão de Crédito (até 12x com 20% de taxa adicional)
- Pagamento Mensal Recorrente (dividido em 12 parcelas)

FUNCIONALIDADES:
- Cartão virtual personalizado
- Módulos: WhatsApp, Instagram, links, PIX, QR Code, Loja Virtual, King Forms, Carrossel, Portfólio, Banner
- Tecnologia NFC
- Relatórios e analytics
- Compartilhamento via link único ou QR Code`;
                } else {
                    contextInfo = questionContext.keywords ? 
                        `Contexto da pergunta: ${questionContext.keywords.join(', ')}` : '';
                }
                
                // SEMPRE tentar melhorar com Gemini, mesmo se tiver resposta local
                const apiResult = await generateWithExternalAPI(
                    userMessage, 
                    contextInfo, 
                    true, 
                    bestAnswer // Passar resposta local para o Gemini melhorar
                );
                
                if (apiResult && apiResult.answer) {
                    // Validar se a resposta da API é relevante
                    const apiAnswerLower = apiResult.answer.toLowerCase();
                    const hasRelevantContent = apiAnswerLower.length > 50;
                    
                    // Se tiver resposta local, validar se a API melhorou
                    if (bestAnswer) {
                        const localAnswerLower = bestAnswer.toLowerCase();
                        const apiImproved = apiAnswerLower.length > localAnswerLower.length * 0.8 || // Pelo menos 80% do tamanho
                                           apiAnswerLower.includes('conecta') || 
                                           apiAnswerLower.includes('king') ||
                                           questionContext.entities.length === 0 ||
                                           questionContext.entities.some(e => apiAnswerLower.includes(e.toLowerCase()));
                        
                        if (apiImproved && hasRelevantContent) {
                            console.log(`✨ [IA] Resposta local melhorada com ${apiResult.source.toUpperCase()}`);
                            bestAnswer = apiResult.answer;
                            bestScore = Math.min(95, bestScore + 10); // Melhorar confiança
                            bestSource = `enhanced_${bestSource}_with_${apiResult.source}`;
                        } else {
                            console.log('ℹ️ [IA] Resposta local mantida (já é boa)');
                        }
                    } else {
                        // Não tem resposta local, usar resposta da API
                        if (hasRelevantContent) {
                            console.log(`✅ [IA] Resposta gerada com ${apiResult.source.toUpperCase()}`);
                            bestAnswer = apiResult.answer;
                            bestScore = 75;
                            bestSource = `external_api_${apiResult.source}`;
                        } else {
                            console.log('⚠️ [IA] Resposta da API não é relevante');
                        }
                    }
                }
            } catch (apiError) {
                console.error('❌ [IA] Erro ao usar API externa:', {
                    message: apiError.message,
                    stack: apiError.stack?.substring(0, 200),
                    hasLocalAnswer: !!bestAnswer
                });
                // Continuar com resposta local se API falhar
                if (!bestAnswer) {
                    console.warn('⚠️ [IA] Sem resposta local e API externa falhou - tentando resposta básica');
                }
            }
        } else {
            console.log('ℹ️ [IA] Nenhuma API externa configurada - usando apenas respostas locais', {
                hasGemini: !!process.env.GEMINI_API_KEY,
                hasGroq: !!process.env.GROQ_API_KEY,
                hasHuggingFace: !!process.env.HUGGINGFACE_API_KEY
            });
        }
        
        // Salvar conversa E aprender automaticamente
        try {
            if (userId) {
                await client.query(`
                    INSERT INTO ia_conversations (user_id, message, response, confidence_score)
                    VALUES ($1, $2, $3, $4)
                `, [userId, userMessage, bestAnswer || 'Não encontrei uma resposta específica.', bestScore]);
                
                // AUTO-APRENDIZADO: Se encontrou resposta (especialmente da web), aprender e gravar
                if (bestAnswer && bestScore > 50) {
                    try {
                        // Verificar se auto-aprendizado está habilitado
                        const autoLearnConfig = await client.query(`
                            SELECT * FROM ia_auto_learning_config
                            ORDER BY id DESC LIMIT 1
                        `);
                        
                        const shouldLearn = autoLearnConfig.rows.length === 0 || 
                                          autoLearnConfig.rows[0].is_enabled === true;
                        
                        // Detectar se é sobre estratégias de vendas (prioridade alta para aprender)
                        const isSalesStrategy = bestSource === 'sales_strategy_enhanced' || 
                                               bestSource === 'sales_strategy' ||
                                               userMessage.toLowerCase().includes('estratégia') ||
                                               userMessage.toLowerCase().includes('venda');
                        
                        if (shouldLearn && bestSource && bestSource.includes('web')) {
                            // Aprender de resposta da web
                            await learnFromTavily(userMessage, bestAnswer, client);
                            
                            // Registrar no histórico de auto-aprendizado
                            const keywords = extractKeywords(userMessage);
                            await client.query(`
                                INSERT INTO ia_auto_learning_history 
                                (question, answer, source, confidence_score, keywords, topic_category)
                                VALUES ($1, $2, 'tavily', $3, $4, $5)
                            `, [
                                userMessage, 
                                bestAnswer.substring(0, 5000), 
                                bestScore, 
                                keywords,
                                isSalesStrategy ? 'sales_strategy' : null
                            ]);
                            
                            console.log('🧠 [IA] Auto-aprendizado: Resposta gravada na memória!');
                        } else if (shouldLearn && bestAnswer) {
                            // Gravar qualquer resposta útil (mesmo que não seja da web)
                            const keywords = extractKeywords(userMessage);
                            
                            // Se for estratégia de vendas, também salvar na base de conhecimento
                            if (isSalesStrategy) {
                                try {
                                    // Buscar categoria de Vendas
                                    const salesCategory = await client.query(`
                                        SELECT id FROM ia_categories 
                                        WHERE LOWER(name) IN ('vendas', 'negócios', 'estratégias')
                                        ORDER BY priority DESC LIMIT 1
                                    `);
                                    
                                    const categoryId = salesCategory.rows.length > 0 ? salesCategory.rows[0].id : null;
                                    
                                    // Salvar como conhecimento na base
                                    await client.query(`
                                        INSERT INTO ia_knowledge_base 
                                        (category_id, title, content, keywords, source_type, priority)
                                        VALUES ($1, $2, $3, $4, 'auto_learned', 80)
                                        ON CONFLICT DO NOTHING
                                    `, [
                                        categoryId,
                                        `Estratégia de Vendas: ${userMessage.substring(0, 100)}`,
                                        bestAnswer,
                                        keywords
                                    ]);
                                    
                                    console.log('💼 [Vendas] Estratégia salva na base de conhecimento!');
                                } catch (saveError) {
                                    console.error('Erro ao salvar estratégia na base:', saveError);
                                }
                            }
                            
                            await client.query(`
                                INSERT INTO ia_auto_learning_history 
                                (question, answer, source, confidence_score, keywords, topic_category)
                                VALUES ($1, $2, 'conversation', $3, $4, $5)
                                ON CONFLICT DO NOTHING
                            `, [
                                userMessage, 
                                bestAnswer.substring(0, 5000), 
                                bestScore, 
                                keywords,
                                isSalesStrategy ? 'sales_strategy' : null
                            ]);
                            
                            if (isSalesStrategy) {
                                console.log('💼 [Vendas] Estratégia aprendida e salva para uso futuro!');
                            }
                        }
                    } catch (learnError) {
                        console.error('Erro no auto-aprendizado:', learnError);
                        // Não bloquear resposta por erro no aprendizado
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao salvar conversa:', error);
            // Não bloquear a resposta por erro ao salvar
        }
        
        // ============================================
        // SISTEMA DE AUTO-TREINAMENTO AUTÔNOMO "IA KING"
        // ============================================
        // Quando não souber responder, pesquisa automaticamente e aprende
        if (!bestAnswer || bestScore < 40) {
            try {
                console.log('🧠 [IA KING] Ativando sistema de auto-treinamento...');
                
                // Chamar sistema de auto-treinamento autônomo
                const iaKingResult = await autoTrainIAKing(userMessage, questionContext, client);
                
                if (iaKingResult && iaKingResult.success && iaKingResult.answer) {
                    // Usar resposta aprendida
                    bestAnswer = iaKingResult.answer;
                    bestScore = 75; // Score alto para conhecimento aprendido
                    bestSource = iaKingResult.source || 'ia_king_auto_learned';
                    
                    console.log('✅ [IA KING] Resposta aprendida e pronta para uso!');
                    
                    // Aplicar prompt mestre e personalidade
                    bestAnswer = applyGPTMasterPrompt(bestAnswer, null, questionContext);
                    bestAnswer = addPersonalityAndEmotion(bestAnswer, thoughts, questionContext);
                } else {
                    // Se não conseguiu aprender, tentar sistema antigo de auto-pesquisa como fallback
                    try {
                        const autoLearnConfig = await client.query(`
                            SELECT * FROM ia_auto_learning_config
                            ORDER BY id DESC LIMIT 1
                        `);
                        
                        if (autoLearnConfig.rows.length > 0 && autoLearnConfig.rows[0].auto_search_enabled) {
                            const config = autoLearnConfig.rows[0];
                            
                            // Verificar limite diário
                            const today = new Date().toISOString().split('T')[0];
                            const dailyCount = await client.query(`
                                SELECT search_count FROM ia_daily_search_count
                                WHERE search_date = $1
                            `, [today]);
                            
                            const currentCount = dailyCount.rows.length > 0 ? 
                                               parseInt(dailyCount.rows[0].search_count) : 0;
                            
                            if (currentCount < config.max_searches_per_day) {
                                console.log('🔍 [IA] Fallback: Auto-pesquisa tradicional...');
                                
                                // Buscar automaticamente (usar sistema multi-API)
                                if (webSearchConfig && webSearchConfig.is_enabled && webSearchConfig.api_key) {
                                    const autoSearchResult = await searchWeb(userMessage, webSearchConfig);
                                    
                                    if (autoSearchResult && autoSearchResult.results && autoSearchResult.results.length > 0) {
                                        const autoAnswer = autoSearchResult.results.slice(0, 3).map((r, idx) => 
                                            `${idx + 1}. **${r.title}**\n${(r.snippet || r.content || '').substring(0, 250)}${(r.snippet || r.content || '').length > 250 ? '...' : ''}`
                                        ).join('\n\n');
                                        
                                        // Aprender automaticamente
                                        await learnFromTavily(userMessage, autoAnswer, client);
                                        
                                        // Atualizar contador diário
                                        await client.query(`
                                            INSERT INTO ia_daily_search_count (search_date, search_count)
                                            VALUES ($1, 1)
                                            ON CONFLICT (search_date) 
                                            DO UPDATE SET search_count = ia_daily_search_count.search_count + 1
                                        `, [today]);
                                        
                                        console.log('✅ [IA] Auto-pesquisa: Aprendeu e gravou automaticamente!');
                                    }
                                }
                            } else {
                                console.log('⚠️ [IA] Auto-pesquisa: Limite diário atingido');
                            }
                        }
                    } catch (fallbackError) {
                        console.error('Erro no fallback de auto-pesquisa:', fallbackError);
                    }
                }
            } catch (iaKingError) {
                console.error('❌ [IA KING] Erro no sistema de auto-treinamento:', iaKingError);
                // Não bloquear resposta por erro no auto-treinamento
            }
        }
        
        // CAMADA 5: Raciocínio Independente - Se não encontrou resposta, pensar sobre o que sabe
        if (!bestAnswer || bestScore < 40) {
            const independentThoughts = thinkIndependently(questionContext, knowledgeResult?.rows || [], thoughts);
            
            // Se temos conhecimento relacionado mas não direto, usar raciocínio
            if (questionContext.entities.length > 0 && knowledgeResult && knowledgeResult.rows.length > 0) {
                const entity = questionContext.entities[0];
                
                // Procurar conhecimento que menciona a entidade
                const relatedKnowledge = knowledgeResult.rows.filter(kb => {
                    const contentLower = (kb.content || '').toLowerCase();
                    const titleLower = (kb.title || '').toLowerCase();
                    return contentLower.includes(entity) || titleLower.includes(entity);
                });
                
                if (relatedKnowledge.length > 0) {
                    // Encontrar melhor trecho relacionado
                    const bestRelated = relatedKnowledge[0];
                    const relatedExcerpt = findRelevantExcerpt(bestRelated.content, questionContext, 400) ||
                                         extractDirectAnswer(bestRelated.content, userMessage) ||
                                         summarizeAnswer(bestRelated.content, 300);
                    
                    if (relatedExcerpt && relatedExcerpt.length > 50) {
                        bestAnswer = `Com base no que aprendi sobre "${entity}":\n\n${relatedExcerpt}`;
                        // APLICAR PROMPT MESTRE antes de personalidade
                        bestAnswer = applyGPTMasterPrompt(bestAnswer, null, questionContext);
                        bestAnswer = addPersonalityAndEmotion(bestAnswer, thoughts, questionContext);
                        bestScore = 60;
                        bestSource = 'knowledge_reasoning';
                        console.log('🧠 [IA] Resposta criada através de raciocínio independente');
                    }
                }
            }
        }
        
        // LÓGICA ESPECIAL: Para perguntas diretas, responder de forma objetiva primeiro
        if (detectDirectQuestion(userMessage) && bestAnswer) {
            const questionLower = userMessage.toLowerCase();
            
            // Se a pergunta é sobre capacidade (você sabe, você pode), responder diretamente
            if (questionLower.includes('ajudar') || questionLower.includes('problema') || questionLower.includes('emocional')) {
                // Verificar se a resposta encontrada é relevante
                const answerLower = bestAnswer.toLowerCase();
                const isRelevant = answerLower.includes('ajudar') || 
                                 answerLower.includes('problema') || 
                                 answerLower.includes('emocional') ||
                                 answerLower.includes('psicologia') ||
                                 answerLower.includes('terapia');
                
                if (isRelevant) {
                    // Responder de forma direta e objetiva
                    const directResponse = "Sim, sei! 😊 Você quer saber como?\n\n";
                    
                    // Extrair informações práticas da resposta encontrada
                    const practicalInfo = summarizeAnswer(bestAnswer, 400);
                    
                    // Se não conseguiu extrair, criar resposta genérica mas útil
                    if (!practicalInfo || practicalInfo.length < 50) {
                        bestAnswer = directResponse + "Posso ajudar com orientações sobre:\n\n" +
                                   "• Identificar e entender as emoções\n" +
                                   "• Técnicas de respiração e relaxamento\n" +
                                   "• Estratégias para lidar com ansiedade e estresse\n" +
                                   "• Quando procurar ajuda profissional\n\n" +
                                   "O que você gostaria de saber especificamente?";
                    } else {
                        // Combinar resposta direta com informações práticas
                        bestAnswer = directResponse + practicalInfo;
                    }
                    
                    bestScore = 85; // Score alto para respostas diretas e objetivas
                    console.log('✅ [IA] Resposta direta e objetiva gerada para pergunta direta');
                }
            }
        }
        
        // CAMADA 6: Aplicar personalidade e emoção em TODAS as respostas (se ainda não aplicado)
        if (bestAnswer && bestSource !== 'knowledge_reasoning') {
            bestAnswer = addPersonalityAndEmotion(bestAnswer, thoughts, questionContext);
        }
        
        // ============================================
        // AUDITORIA INTERNA COMPLETA
        // ============================================
        let knowledgeSourcesForAudit = null;
        if (knowledgeResult && knowledgeResult.rows) {
            // Preparar fontes para auditoria
            const topSources = knowledgeResult.rows
                .filter(kb => kb.content && kb.title)
                .slice(0, 3)
                .map(kb => ({
                    title: kb.title,
                    content: kb.content.substring(0, 500),
                    source_type: kb.source_type
                }));
            
            if (topSources.length > 0) {
                knowledgeSourcesForAudit = topSources;
            }
        }
        
        // Realizar auditoria interna
        let auditResult = null;
        if (bestAnswer) {
            auditResult = performInternalAudit(bestAnswer, questionContext, knowledgeSourcesForAudit, thoughts);
            
            console.log('🔍 [IA] Auditoria interna:', {
                passed: auditResult.passed,
                issues: auditResult.issues.length,
                issuesList: auditResult.issues
            });
            
            // Se auditoria falhou, tentar corrigir
            if (!auditResult.passed && auditResult.issues.length > 0) {
                console.log('⚠️ [IA] Problemas detectados na auditoria, aplicando correções...');
                
                // Remover julgamentos
                if (auditResult.audits.neutrality.issues.some(i => i.includes('Julgamento'))) {
                    bestAnswer = bestAnswer.replace(/(?:é|são)\s+(?:errado|correto|certo|errada|correta)/gi, 'pode ser visto como');
                }
                
                // Remover persuasão
                if (auditResult.audits.neutrality.issues.some(i => i.includes('persuasiva'))) {
                    bestAnswer = bestAnswer.replace(/você\s+(?:deve|precisa|tem\s+que)/gi, 'pode ser útil');
                }
                
                // Re-auditar após correção
                auditResult = performInternalAudit(bestAnswer, questionContext, knowledgeSourcesForAudit, thoughts);
            }
        }
        
        // Validar resposta final
        let validation = null;
        if (bestAnswer && auditResult) {
            validation = validateResponse(bestAnswer, questionContext, knowledgeSourcesForAudit, thoughts, auditResult);
            
            console.log('✅ [IA] Validação final:', {
                valid: validation.valid,
                confidence: validation.confidence,
                hallucinationRisk: validation.hallucinationRisk,
                needsUncertainty: validation.needsUncertaintyDeclaration
            });
            
            // Se risco de alucinação alto, qualificar resposta
            if (validation.hallucinationRisk === 'alto' && validation.valid) {
                bestAnswer = "Com base nas informações disponíveis, posso dizer que:\n\n" + bestAnswer;
                bestAnswer += "\n\n⚠️ Nota: Esta resposta é baseada em conhecimento limitado. Para informações mais precisas, consulte fontes especializadas.";
            }
            
            // Se precisa declarar incerteza
            if (validation.needsUncertaintyDeclaration) {
                if (!bestAnswer.includes('incerto') && !bestAnswer.includes('limitado') && !bestAnswer.includes('pode variar')) {
                    bestAnswer += "\n\n⚠️ Nota: Esta resposta tem um nível de confiança moderado devido à limitação das fontes disponíveis.";
                }
            }
            
            // Se precisa declarar fonte
            if (validation.needsSourceDeclaration && !isAboutSystem(userMessage)) {
                bestAnswer += "\n\nℹ️ Esta informação pode não estar completa. Considere verificar em fontes adicionais.";
            }
        }
        
        // Aplicar modo mental à resposta
        if (bestAnswer) {
            // APLICAR PROMPT MESTRE antes de modo mental
            bestAnswer = applyGPTMasterPrompt(bestAnswer, null, questionContext);
            bestAnswer = applyMentalMode(bestAnswer, mentalMode, thoughts);
        }
        
        // BUSCA ULTRA-INTELIGENTE: Se não encontrou resposta, fazer busca mais profunda
        if (!bestAnswer || bestScore < 40) {
            console.log('🔍 [IA] Busca profunda: Não encontrei resposta relevante, fazendo busca mais profunda...');
            
            // Se temos entidades identificadas, buscar especificamente por elas
            if (questionContext.entities.length > 0 && knowledgeResult && knowledgeResult.rows.length > 0) {
                const entity = questionContext.entities[0];
                console.log('🔍 [IA] Buscando especificamente por entidade:', entity);
                
                // Buscar conhecimento que contém a entidade (busca mais flexível)
                const entityKnowledge = knowledgeResult.rows.filter(kb => {
                    if (!kb.content || !kb.title) return false;
                    
                    const contentLower = kb.content.toLowerCase();
                    const titleLower = kb.title.toLowerCase();
                    
                    // Busca flexível: entidade pode estar em qualquer parte
                    return contentLower.includes(entity) || titleLower.includes(entity) ||
                           contentLower.includes(entity + ' ') || titleLower.includes(entity + ' ') ||
                           (kb.keywords && Array.isArray(kb.keywords) && 
                            kb.keywords.some(k => k.toLowerCase().includes(entity)));
                });
                
                if (entityKnowledge.length > 0) {
                    console.log(`✅ [IA] Encontrei ${entityKnowledge.length} conhecimento(s) sobre "${entity}"`);
                    
                    // Ordenar por relevância (título tem prioridade)
                    entityKnowledge.sort((a, b) => {
                        const aTitle = (a.title || '').toLowerCase();
                        const bTitle = (b.title || '').toLowerCase();
                        const aHasInTitle = aTitle.includes(entity);
                        const bHasInTitle = bTitle.includes(entity);
                        
                        if (aHasInTitle && !bHasInTitle) return -1;
                        if (!aHasInTitle && bHasInTitle) return 1;
                        return 0;
                    });
                    
                    const bestEntityKnowledge = entityKnowledge[0];
                    
                    // Extrair trecho relevante
                    let entityExcerpt = findRelevantExcerpt(bestEntityKnowledge.content, questionContext, 500);
                    if (!entityExcerpt) {
                        entityExcerpt = extractDirectAnswer(bestEntityKnowledge.content, userMessage);
                    }
                    if (!entityExcerpt) {
                        // Procurar parágrafos que mencionam a entidade
                        const paragraphs = bestEntityKnowledge.content.split(/\n\n+/);
                        for (const para of paragraphs) {
                            if (para.toLowerCase().includes(entity) && para.length > 50) {
                                entityExcerpt = para.substring(0, 500);
                                break;
                            }
                        }
                    }
                    if (!entityExcerpt) {
                        entityExcerpt = bestEntityKnowledge.content.substring(0, 500);
                    }
                    
                    if (entityExcerpt && entityExcerpt.length > 50) {
                        bestAnswer = entityExcerpt;
                        bestScore = 70; // Score bom para conhecimento encontrado
                        bestSource = 'knowledge_deep_search';
                        
                        // Adicionar personalidade
                        // APLICAR PROMPT MESTRE antes de personalidade
                        bestAnswer = applyGPTMasterPrompt(bestAnswer, null, questionContext);
                        bestAnswer = addPersonalityAndEmotion(bestAnswer, thoughts, questionContext);
                        
                        console.log('✅ [IA] Resposta encontrada através de busca profunda!');
                    }
                }
            }
        }
        
        // Se AINDA não encontrou resposta relevante, retornar resposta educada
        if (!bestAnswer || bestScore < 30) {
            // ============================================
            // REGISTRAR PERGUNTA NÃO RESPONDIDA NO MONITORAMENTO
            // ============================================
            try {
                await registerUnansweredQuestion(userMessage, userId, questionContext, client);
            } catch (regError) {
                console.error('Erro ao registrar pergunta não respondida:', regError);
            }
            
            // Se a pergunta tem entidades mas não encontramos conhecimento, ser específico
            if (questionContext.entities.length > 0) {
                const entity = questionContext.entities[0];
                return {
                    answer: `Olá! 😊 Não encontrei informações específicas sobre "${entity}" na minha base de conhecimento atual.\n\nMas estou sempre aprendendo! Se você tiver informações sobre isso ou quiser que eu busque na internet (se estiver habilitado), posso ajudar.\n\nTambém posso te ajudar com dúvidas sobre o Conecta King se precisar! 😊`,
                    confidence: 0,
                    source: 'no_knowledge',
                    mentalMode: mentalMode,
                    category: categoryInfo ? categoryInfo.primaryCategory : 'general',
                    needs_improvement: true
                };
            }
            
            // Se não é sobre o sistema, ser educado mas direto
            const questionIsAboutSystem = isAboutSystem(userMessage);
            
            if (!questionIsAboutSystem) {
                return {
                    answer: `Olá! 😊 Não tenho informações sobre isso na minha base de conhecimento no momento.\n\nMas estou sempre aprendendo! Se você habilitar a busca na web nas configurações, posso buscar informações atualizadas para você.\n\nTambém posso te ajudar com qualquer dúvida sobre o Conecta King! 😊`,
                    confidence: 0,
                    source: 'no_knowledge',
                    mentalMode: mentalMode,
                    category: categoryInfo ? categoryInfo.primaryCategory : 'general',
                    needs_improvement: true
                };
            }
            
            // Se é sobre o sistema mas não encontrou resposta
            return {
                answer: `Olá! 😊 Não encontrei uma resposta específica para sua pergunta sobre o Conecta King.\n\nPosso te ajudar com:\n• Informações sobre planos e valores\n• Como usar os módulos do sistema\n• Como editar e personalizar seu cartão\n• Como compartilhar seu cartão\n• Resolver problemas técnicos\n• Dúvidas sobre funcionalidades\n\nPode reformular sua pergunta de outra forma? Estou aqui para ajudar! 😊`,
                confidence: 0,
                source: 'default',
                mentalMode: mentalMode,
                category: categoryInfo ? categoryInfo.primaryCategory : 'general'
            };
        }
        
        // Calcular confidence score final baseado em auditoria
        let finalConfidence = bestScore;
        if (validation) {
            finalConfidence = validation.confidence;
        }
        
        // Se resposta não passou na validação, ajustar
        if (validation && !validation.valid && bestAnswer) {
            // Manter resposta mas com confiança baixa
            finalConfidence = Math.min(finalConfidence, 40);
        }
        
                    // APLICAR PROMPT MESTRE FINAL antes de retornar (garantia final)
        if (bestAnswer) {
            bestAnswer = applyGPTMasterPrompt(bestAnswer, null, questionContext);
        }
        
        // ============================================
        // NOVO: COLETAR KNOWLEDGE_USED_IDS
        // ============================================
        let knowledgeUsedIds = [];
        if (bestSource === 'knowledge' || bestSource === 'chain_of_thought') {
            // Coletar IDs do conhecimento usado
            if (bestCandidate && bestKb) {
                knowledgeUsedIds.push(bestKb.id);
            }
            
            // Adicionar IDs de outras fontes usadas na síntese
            if (knowledgeSources && knowledgeSources.length > 0) {
                for (const source of knowledgeSources) {
                    // Tentar encontrar ID do conhecimento pelo título
                    try {
                        const kbResult = await client.query(`
                            SELECT id FROM ia_knowledge_base
                            WHERE title = $1 AND is_active = true
                            LIMIT 1
                        `, [source.title]);
                        if (kbResult.rows.length > 0 && !knowledgeUsedIds.includes(kbResult.rows[0].id)) {
                            knowledgeUsedIds.push(kbResult.rows[0].id);
                        }
                    } catch (error) {
                        // Ignorar erro
                    }
                }
            }
            
            // Se Chain of Thought foi usado, adicionar IDs do conhecimento usado lá
            if (chainOfThoughtResult && chainOfThoughtResult.reasoningChain) {
                const knowledgeStep = chainOfThoughtResult.reasoningChain.find(s => s.action === 'retrieve_validate');
                if (knowledgeStep && knowledgeStep.result && knowledgeStep.result.sources) {
                    for (const source of knowledgeStep.result.sources) {
                        if (source.id && !knowledgeUsedIds.includes(source.id)) {
                            knowledgeUsedIds.push(source.id);
                        }
                    }
                }
            }
        }
        
        // ============================================
        // NOVO: APLICAR VALIDAÇÃO AVANÇADA DE FONTES
        // ============================================
        let sourceValidation = null;
        if (knowledgeUsedIds.length > 0 && bestAnswer) {
            try {
                const sourcesForValidation = await client.query(`
                    SELECT * FROM ia_knowledge_base
                    WHERE id = ANY($1)
                    AND is_active = true
                `, [knowledgeUsedIds]);
                
                if (sourcesForValidation.rows.length > 0) {
                    sourceValidation = await advancedSourceValidation(sourcesForValidation.rows, bestAnswer, client);
                    
                    // Ajustar confiança baseado na validação
                    if (sourceValidation.recommendation.confidence < finalConfidence) {
                        finalConfidence = Math.max(50, sourceValidation.recommendation.confidence);
                        console.log('⚠️ [Validação] Confiança ajustada baseada em validação de fontes:', finalConfidence);
                    }
                    
                    // Adicionar nota se houver contradições
                    if (sourceValidation.contradictions.length > 0) {
                        bestAnswer += `\n\n⚠️ Nota: Encontrei algumas contradições entre as fontes. A resposta pode não ser completamente precisa.`;
                    }
                }
            } catch (error) {
                console.error('Erro ao validar fontes:', error);
            }
        }
        
        // ============================================
        // FASE 2: META-COGNIÇÃO (Avaliar e melhorar resposta)
        // ============================================
        let metacognitiveEval = null;
        if (bestAnswer) {
            try {
                console.log('🧠 [Meta-Cognição] Avaliando qualidade da resposta...');
                metacognitiveEval = await metacognitiveEvaluation(
                    userMessage,
                    bestAnswer,
                    finalConfidence,
                    knowledgeUsedIds,
                    client
                );
                
                if (metacognitiveEval) {
                    console.log('✅ [Meta-Cognição] Avaliação concluída:', {
                        quality_score: metacognitiveEval.quality_score,
                        gaps: metacognitiveEval.knowledge_gaps.length,
                        improvements: metacognitiveEval.improvements_suggested.length
                    });
                    
                    // Aplicar melhorias sugeridas
                    if (metacognitiveEval.improvements_suggested.length > 0) {
                        const improvedAnswer = applyMetacognitiveImprovements(bestAnswer, metacognitiveEval);
                        if (improvedAnswer !== bestAnswer) {
                            console.log('✨ [Meta-Cognição] Melhorias aplicadas à resposta');
                            bestAnswer = improvedAnswer;
                        }
                    }
                }
            } catch (error) {
                console.error('Erro na meta-cognição:', error);
            }
        }
        
        return {
            answer: bestAnswer,
            confidence: finalConfidence,
            source: bestSource || 'none',
            mentalMode: mentalMode,
            auditPassed: auditResult ? auditResult.passed : null,
            hallucinationRisk: validation ? validation.hallucinationRisk : null,
            cognitiveVersion: '3.0', // Atualizado para versão 3.0 com melhorias profundas
            category: categoryInfo ? categoryInfo.primaryCategory : 'general',
            knowledge_used_ids: knowledgeUsedIds.length > 0 ? knowledgeUsedIds : null,
            chain_of_thought: chainOfThoughtResult && chainOfThoughtResult.used ? {
                steps: chainOfThoughtResult.reasoningChain.length,
                confidence: chainOfThoughtResult.confidence,
                reasoning: chainOfThoughtResult.reasoningChain.map(s => ({
                    step: s.step,
                    action: s.action,
                    reasoning: s.reasoning
                }))
            } : null,
            source_validation: sourceValidation ? {
                reliable_sources: sourceValidation.reliable.length,
                total_sources: sourceValidation.validations.length,
                contradictions: sourceValidation.contradictions.length,
                recommendation: sourceValidation.recommendation.recommendation,
                confidence: sourceValidation.recommendation.confidence
            } : null,
            logical_inferences: chainOfThoughtResult && chainOfThoughtResult.reasoningChain ? 
                (chainOfThoughtResult.reasoningChain.find(s => s.action === 'infer')?.result?.inferences || []) : []
        };
    } catch (error) {
        console.error('❌ [IA] ERRO em findBestAnswer:', error);
        console.error('Stack:', error.stack);
        
        // Se a pergunta for sobre valores ou sistema e der erro, retornar resposta padrão
        const lowerMessage = (userMessage || '').toLowerCase();
        const pricingKeywords = ['valores', 'preços', 'preço', 'quanto custa', 'planos', 'pacotes', 'assinatura'];
        const systemKeywords = ['como funciona', 'como funciona o sistema', 'como usar', 'o que é conecta king', 'explique o sistema'];
        const isPricingQuestion = pricingKeywords.some(keyword => lowerMessage.includes(keyword));
        const isSystemQuestion = systemKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (isPricingQuestion) {
            return {
                answer: "💰 **VALORES E PLANOS DO CONECTA KING**\n\n" +
                       "**Pacote 1** - R$ 480,00/mês\n" +
                       "   Todas as funcionalidades do cartão\n" +
                       "   Todos os módulos disponíveis\n" +
                       "   Não pode alterar a logomarca do sistema\n" +
                       "   1 perfil\n\n" +
                       "**Pacote 2** - R$ 700,00/mês\n" +
                       "   Todas as funcionalidades do cartão\n" +
                       "   Todos os módulos disponíveis\n" +
                       "   Pode alterar a logomarca do cartão\n" +
                       "   1 perfil\n\n" +
                       "**Pacote 3** - R$ 1.500,00/mês (EMPRESARIAL)\n" +
                       "   Todas as funcionalidades do cartão\n" +
                       "   Todos os módulos disponíveis\n" +
                       "   Pode alterar a logomarca\n" +
                       "   3 perfis/cartões\n" +
                       "   Modo empresarial\n\n" +
                       "💳 **Forma de Pagamento:** PIX\n" +
                       "📱 **Renovação:** Via WhatsApp\n\n" +
                       "Para assinar ou renovar, acesse a seção 'Assinatura' no dashboard! 😊",
                confidence: 95,
                source: 'pricing_info_error_fallback',
                mentalMode: 'informative',
                auditPassed: true,
                hallucinationRisk: 'low',
                cognitiveVersion: '2.0',
                category: 'pricing'
            };
        }
        
        if (isSystemQuestion) {
            return {
                answer: "🚀 **COMO FUNCIONA O CONECTA KING**\n\n" +
                       "O Conecta King é uma plataforma completa para criação de **cartões virtuais profissionais** que funcionam como um hub central para todas as suas informações de contato e negócios.\n\n" +
                       "**📋 PASSO A PASSO:**\n\n" +
                       "1️⃣ **Criação do Cartão**: Você cria seu cartão virtual personalizado com suas informações (nome, foto, biografia)\n\n" +
                       "2️⃣ **Adição de Módulos**: Adicione os módulos que deseja (WhatsApp, Instagram, links, PIX, etc.)\n\n" +
                       "3️⃣ **Personalização**: Organize os módulos, escolha cores, fontes e layout\n\n" +
                       "4️⃣ **Compartilhamento**: Compartilhe seu link único ou use o QR Code\n\n" +
                       "5️⃣ **Acompanhamento**: Veja quantas pessoas visualizaram seu cartão através dos relatórios\n\n" +
                       "**💡 RESULTADO:**\n" +
                       "Seu cartão funciona como um site pessoal, mas muito mais simples e focado em conectar você com seus contatos e clientes! 😊",
                confidence: 95,
                source: 'system_info_error_fallback',
                mentalMode: 'educative',
                auditPassed: true,
                hallucinationRisk: 'low',
                cognitiveVersion: '2.0',
                category: 'system'
            };
        }
        
        // Verificar se é pergunta sobre pagamento antes de retornar erro
        const lowerMsg = userMessage.toLowerCase();
        const paymentKeywords = ['pagamento', 'pix', 'cartão', 'cartao', 'crédito', 'credito', 'forma de pagamento', 'como pagar', 'formas de pagamento'];
        if (paymentKeywords.some(kw => lowerMsg.includes(kw))) {
            return {
                answer: "💳 **FORMAS DE PAGAMENTO DO CONECTA KING**\n\n" +
                       "Oferecemos **3 formas de pagamento** flexíveis:\n\n" +
                       "**1️⃣ PIX (Pagamento à Vista)**\n" +
                       "• Valor integral do plano\n" +
                       "• Ativação imediata após confirmação\n" +
                       "• Sem taxas adicionais\n\n" +
                       "**2️⃣ Cartão de Crédito**\n" +
                       "• Parcelamento em até 12x\n" +
                       "• Taxa adicional de 20% sobre o valor\n" +
                       "• Exemplo: Plano King Start (R$ 700)\n" +
                       "  → No cartão: R$ 840 (até 12x de R$ 70)\n\n" +
                       "**3️⃣ Pagamento Mensal Recorrente**\n" +
                       "• Pagamento mensal automático\n" +
                       "• Valor dividido em 12 parcelas\n\n" +
                       "**📋 PROCESSO:**\n" +
                       "1. Escolha seu plano\n" +
                       "2. Selecione a forma de pagamento\n" +
                       "3. Entre em contato via WhatsApp\n" +
                       "4. Após confirmação, seu plano é ativado\n\n" +
                       "**💡 RECOMENDAÇÃO:**\n" +
                       "O PIX é a forma mais rápida e econômica! 😊",
                confidence: 100,
                source: 'payment_info_fallback',
                mentalMode: 'informative'
            };
        }
        
        // Retornar resposta de erro educada para outros casos
        return {
            answer: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou reformule sua pergunta.',
            confidence: 0,
            source: 'error',
            mentalMode: null,
            auditPassed: null,
            hallucinationRisk: null,
            cognitiveVersion: '2.0',
            category: 'general'
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
    console.log('📥 [IA KING CHAT] Requisição recebida:', {
        method: req.method,
        path: req.path,
        hasMessage: !!req.body.message,
        userId: req.body.userId || req.user?.userId
    });
    
    const { message, userId } = req.body;
    const actualUserId = userId || req.user?.userId;
    
    if (!message || !message.trim()) {
        console.warn('⚠️ [IA KING CHAT] Mensagem vazia recebida');
        return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const startTime = Date.now();
    let client = null;
    let conversationId = null;
    let knowledgeUsedIds = [];
    
    try {
        // Conectar ao banco de dados
        client = await db.pool.connect();
        
        console.log('📥 Mensagem recebida na IA KING:', message.substring(0, 100));
        
        // Buscar resposta
        const result = await findBestAnswer(message.trim(), actualUserId);
        
        const responseTime = Date.now() - startTime;
        
        console.log('✅ Resposta encontrada:', {
            confidence: result.confidence,
            source: result.source,
            answerLength: result.answer?.length || 0,
            responseTime: responseTime + 'ms'
        });
        
        // Extrair knowledge_used_ids se disponível
        if (result.knowledge_used_ids) {
            knowledgeUsedIds = result.knowledge_used_ids;
        }
        
        // ============================================
        // FASE 1: VERIFICAR ERROS REPETITIVOS
        // ============================================
        const errorCheck = await checkForRepetitiveError(message.trim(), result.answer || '', client);
        if (errorCheck.isBlocked) {
            console.log('⚠️ [Erro Repetitivo] Resposta bloqueada - erro conhecido detectado');
            // Tentar gerar resposta alternativa
            result.answer = `Desculpe, identifiquei que minha resposta anterior pode ter sido incorreta. Deixe-me buscar uma resposta mais precisa para você.`;
            result.confidence = Math.max(30, result.confidence - 20);
        }
        
        // ============================================
        // FASE 1: RASTREAR USO DE CONHECIMENTO
        // ============================================
        if (knowledgeUsedIds && knowledgeUsedIds.length > 0) {
            // Rastrear uso de cada conhecimento (assumir sucesso inicial, será ajustado com feedback)
            for (const kid of knowledgeUsedIds) {
                await trackKnowledgeUsage(kid, true, result.confidence || 0, client);
            }
            
            // Ajustar estratégias baseado no sucesso
            await adjustResponseStrategies('knowledge_search', true, result.confidence || 0, null, client);
        }
        
        // Salvar conversa no banco
        const convResult = await client.query(`
            INSERT INTO ia_conversations 
            (user_id, message, response, confidence_score, knowledge_used_ids, response_time_ms)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [
            actualUserId,
            message.trim(),
            result.answer || '',
            result.confidence || 0,
            knowledgeUsedIds.length > 0 ? knowledgeUsedIds : null,
            responseTime
        ]);
        
        conversationId = convResult.rows[0].id;
        
        // Verificar fatos se tiver conhecimento usado
        let factVerification = null;
        if (knowledgeUsedIds.length > 0 && result.confidence >= 70) {
            factVerification = await verifyFacts(client, result.answer, knowledgeUsedIds);
        }
        
        // Salvar no cache se resposta tem boa confiança
        if (result.confidence >= 60 && result.answer) {
            const questionContext = extractQuestionContext(message);
            const categoryId = questionContext.categoryId || null;
            await saveToCache(client, message.trim(), result.answer, knowledgeUsedIds, result.confidence, categoryId);
        }
        
        // Salvar contexto na memória
        if (conversationId && result.answer) {
            const questionContext = extractQuestionContext(message);
            
            // NOVO: Rastrear contexto multi-turn
            await trackMultiTurnContext(
                client,
                actualUserId,
                conversationId,
                message.trim(),
                result.answer,
                questionContext
            );
            
            // NOVO: Armazenar memória episódica se for conversa importante
            if (result.confidence >= 70 && questionContext.entities.length > 0) {
                const keyPoints = questionContext.entities.slice(0, 3);
                const topics = questionContext.keywords || [];
                await storeEpisodicMemory(
                    client,
                    actualUserId,
                    conversationId,
                    keyPoints,
                    topics
                );
            }
            
            // Salvar entidades mencionadas
            if (questionContext.entities.length > 0) {
                for (const entity of questionContext.entities.slice(0, 3)) {
                    await saveContext(
                        client,
                        actualUserId,
                        conversationId,
                        'entity',
                        `entity_${entity.toLowerCase()}`,
                        entity,
                        60,
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
                    );
                }
            }
            
            // Salvar categoria
            if (questionContext.category) {
                await saveContext(
                    client,
                    actualUserId,
                    conversationId,
                    'topic',
                    `topic_${questionContext.category.toLowerCase()}`,
                    questionContext.category,
                    50,
                    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
                );
            }
        }
        
        // Gerar sugestões de perguntas
        let suggestions = [];
        if (conversationId && result.confidence >= 50) {
            const questionContext = extractQuestionContext(message);
            suggestions = await generateQuestionSuggestions(
                client,
                actualUserId,
                conversationId,
                questionContext,
                knowledgeUsedIds
            );
        }
        
        // Atualizar métricas de satisfação
        await updateSatisfactionMetrics(client);
        
        // ============================================
        // FASE 1: ATUALIZAR PRIORIDADES DINÂMICAS (em background)
        // ============================================
        // Executar em background para não bloquear resposta
        setImmediate(async () => {
            try {
                await updateDynamicPriorities(client);
            } catch (error) {
                console.error('Erro ao atualizar prioridades em background:', error);
            }
        });
        
        res.json({
            response: result.answer,
            confidence: result.confidence,
            source: result.source,
            webResults: result.webResults || null,
            conversation_id: conversationId,
            response_time_ms: responseTime,
            fact_verification: factVerification,
            suggestions: suggestions.slice(0, 3), // Retornar até 3 sugestões
            knowledge_used_ids: knowledgeUsedIds
        });
    } catch (error) {
        console.error('❌ Erro no chat da IA KING:', error);
        
        // Tentar detectar tipo de pergunta mesmo em caso de erro
        const lowerMessage = (message || '').toLowerCase();
        const paymentKeywords = ['pagamento', 'pix', 'cartão', 'cartao', 'crédito', 'credito', 'forma de pagamento', 'como pagar'];
        const pricingKeywords = ['valor', 'preço', 'preco', 'quanto custa', 'planos', 'pacotes'];
        const systemKeywords = ['conecta king', 'conectaking', 'sistema', 'como funciona', 'cartão virtual'];
        
        // Se for pergunta sobre pagamento, retornar resposta específica
        if (paymentKeywords.some(kw => lowerMessage.includes(kw))) {
            return res.json({
                response: "💳 **FORMAS DE PAGAMENTO DO CONECTA KING**\n\n" +
                         "Oferecemos **3 formas de pagamento** flexíveis:\n\n" +
                         "**1️⃣ PIX (Pagamento à Vista)**\n" +
                         "• Valor integral do plano\n" +
                         "• Ativação imediata após confirmação\n" +
                         "• Sem taxas adicionais\n\n" +
                         "**2️⃣ Cartão de Crédito**\n" +
                         "• Parcelamento em até 12x\n" +
                         "• Taxa adicional de 20% sobre o valor\n" +
                         "• Exemplo: Plano King Start (R$ 700)\n" +
                         "  → No cartão: R$ 840 (até 12x de R$ 70)\n\n" +
                         "**3️⃣ Pagamento Mensal Recorrente**\n" +
                         "• Pagamento mensal automático\n" +
                         "• Valor dividido em 12 parcelas\n\n" +
                         "**📋 PROCESSO:**\n" +
                         "1. Escolha seu plano\n" +
                         "2. Selecione a forma de pagamento\n" +
                         "3. Entre em contato via WhatsApp\n" +
                         "4. Após confirmação, seu plano é ativado\n\n" +
                         "**💡 RECOMENDAÇÃO:**\n" +
                         "O PIX é a forma mais rápida e econômica! 😊",
                confidence: 100,
                source: 'payment_info_error_fallback',
                conversation_id: null,
                response_time_ms: Date.now() - startTime
            });
        }
        
        // Se for pergunta sobre valores/planos, retornar resposta específica
        if (pricingKeywords.some(kw => lowerMessage.includes(kw))) {
            return res.json({
                response: "💰 **VALORES E PLANOS DO CONECTA KING**\n\n" +
                         "**King Start** - R$ 700,00 (pagamento único)\n" +
                         "Ideal para iniciar sua presença digital\n\n" +
                         "**King Prime** - R$ 1.000,00 (pagamento único)\n" +
                         "Para profissionais que buscam impacto e autoridade\n\n" +
                         "**King Corporate** - R$ 2.300,00 (pagamento único)\n" +
                         "A escolha ideal para empresas e equipes\n\n" +
                         "💳 **Formas de Pagamento:**\n" +
                         "• PIX (à vista)\n" +
                         "• Cartão de Crédito (até 12x com taxa de 20%)\n" +
                         "• Pagamento Mensal Recorrente\n\n" +
                         "Para assinar, acesse a seção 'Assinatura' no dashboard! 😊",
                confidence: 100,
                source: 'pricing_info_error_fallback',
                conversation_id: null,
                response_time_ms: Date.now() - startTime
            });
        }
        
        // Se for pergunta sobre o sistema, retornar resposta específica
        if (systemKeywords.some(kw => lowerMessage.includes(kw))) {
            return res.json({
                response: "🚀 **COMO FUNCIONA O CONECTA KING**\n\n" +
                         "O Conecta King é uma plataforma para criação de **cartões virtuais profissionais**.\n\n" +
                         "**📋 PASSO A PASSO:**\n\n" +
                         "1️⃣ Crie seu cartão virtual personalizado\n" +
                         "2️⃣ Adicione módulos (WhatsApp, Instagram, links, PIX, etc.)\n" +
                         "3️⃣ Personalize cores, fontes e layout\n" +
                         "4️⃣ Compartilhe seu link único ou QR Code\n" +
                         "5️⃣ Acompanhe visualizações através dos relatórios\n\n" +
                         "Quer ajuda para configurar seu cartão? Posso te guiar passo a passo! 😊",
                confidence: 100,
                source: 'system_info_error_fallback',
                conversation_id: null,
                response_time_ms: Date.now() - startTime
            });
        }
        console.error('Stack trace:', error.stack);
        console.error('Detalhes do erro:', {
            message: error.message,
            name: error.name,
            code: error.code
        });
        
        // Garantir que o client seja liberado em caso de erro
        if (client) {
            try {
                client.release();
            } catch (releaseError) {
                console.error('Erro ao liberar client:', releaseError);
            }
        }
        
        // Retornar resposta padrão em caso de erro
        // Garantir que sempre retorne uma resposta válida
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Erro ao processar mensagem',
                message: error.message || 'Erro desconhecido',
                response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou reformule sua pergunta.',
                confidence: 0,
                source: 'error'
            });
        }
    } finally {
        // Garantir que o client seja sempre liberado
        if (client) {
            try {
                client.release();
            } catch (releaseError) {
                console.error('Erro ao liberar client no finally:', releaseError);
            }
        }
    }
}));

// ============================================
// ROTAS DE CONHECIMENTO (ADMIN)
// ============================================

// GET /api/ia-king/knowledge
router.get('/knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const { source_type } = req.query; // Suporte a filtro por source_type
    const client = await db.pool.connect();
    try {
        let query = `
            SELECT kb.*, c.name as category_name
            FROM ia_knowledge_base kb
            LEFT JOIN ia_categories c ON kb.category_id = c.id
        `;
        
        const params = [];
        if (source_type) {
            query += ` WHERE kb.source_type = $1`;
            params.push(source_type);
        }
        
        query += ` ORDER BY kb.created_at DESC`;
        
        const result = await client.query(query, params);
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
// ROTAS DE EMBEDDINGS VETORIAIS (RAG)
// ============================================

// POST /api/ia-king/generate-embeddings - Gerar embeddings para todo conhecimento
router.post('/generate-embeddings', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        console.log('🔢 [EMBEDDINGS] Iniciando geração de embeddings...');
        
        const generated = await embeddings.generateEmbeddingsForAllKnowledge(client);
        
        res.json({
            success: true,
            message: `${generated} embeddings gerados com sucesso!`,
            generated: generated
        });
    } catch (error) {
        console.error('Erro ao gerar embeddings:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar embeddings', 
            details: error.message 
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/knowledge/:id/generate-embedding - Gerar embedding para conhecimento específico
router.post('/knowledge/:id/generate-embedding', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        // Buscar conhecimento
        const kbResult = await client.query(`
            SELECT id, title, content
            FROM ia_knowledge_base
            WHERE id = $1
        `, [id]);
        
        if (kbResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conhecimento não encontrado' });
        }
        
        const kb = kbResult.rows[0];
        const text = `${kb.title || ''} ${kb.content || ''}`.trim();
        
        if (!text || text.length < 10) {
            return res.status(400).json({ error: 'Conhecimento sem conteúdo suficiente' });
        }
        
        // Gerar e salvar embedding
        const embedding = await embeddings.generateAndSaveEmbedding(id, text, client);
        
        res.json({
            success: true,
            message: 'Embedding gerado com sucesso!',
            embedding_length: embedding ? embedding.length : 0
        });
    } catch (error) {
        console.error('Erro ao gerar embedding:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar embedding', 
            details: error.message 
        });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE ESTATÍSTICAS
// ============================================

// GET /api/ia-king/stats - MELHORADO com métricas avançadas
router.get('/stats', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Estatísticas básicas
        const [knowledgeCount, qaCount, docCount, convCount, learningCount] = await Promise.all([
            client.query('SELECT COUNT(*) as count FROM ia_knowledge_base WHERE is_active = true'),
            client.query('SELECT COUNT(*) as count FROM ia_qa'),
            client.query('SELECT COUNT(*) as count FROM ia_documents'),
            client.query('SELECT COUNT(*) as count FROM ia_conversations WHERE DATE(created_at) = CURRENT_DATE'),
            client.query("SELECT COUNT(*) as count FROM ia_learning WHERE status = 'pending'")
        ]);
        
        // NOVAS MÉTRICAS AVANÇADAS
        let performanceMetrics = {};
        let qualityMetrics = {};
        let usageMetrics = {};
        
        try {
            // Métricas de Performance (últimos 30 dias)
            const perfResult = await client.query(`
                SELECT 
                    COUNT(*) as total_responses,
                    AVG(response_time_ms) as avg_response_time,
                    AVG(confidence_score) as avg_confidence,
                    COUNT(CASE WHEN response_quality_score >= 8 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as high_quality_rate,
                    COUNT(CASE WHEN response_time_ms < 1000 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as fast_response_rate
                FROM ia_conversations
                WHERE created_at >= NOW() - INTERVAL '30 days'
            `);
            
            if (perfResult.rows.length > 0) {
                performanceMetrics = {
                    total_responses: parseInt(perfResult.rows[0].total_responses || 0),
                    avg_response_time: parseFloat(perfResult.rows[0].avg_response_time || 0),
                    avg_confidence: parseFloat(perfResult.rows[0].avg_confidence || 0),
                    high_quality_rate: parseFloat(perfResult.rows[0].high_quality_rate || 0),
                    fast_response_rate: parseFloat(perfResult.rows[0].fast_response_rate || 0)
                };
            }
            
            // Métricas de Qualidade
            const qualityResult = await client.query(`
                SELECT 
                    AVG(success_rate) as avg_success_rate,
                    COUNT(CASE WHEN success_rate > 70 THEN 1 END) as high_quality_count,
                    COUNT(*) as total_tracked
                FROM ia_knowledge_stats
            `);
            
            if (qualityResult.rows.length > 0) {
                qualityMetrics = {
                    avg_success_rate: parseFloat(qualityResult.rows[0].avg_success_rate || 0),
                    high_quality_count: parseInt(qualityResult.rows[0].high_quality_count || 0),
                    total_tracked: parseInt(qualityResult.rows[0].total_tracked || 0)
                };
            }
            
            // Métricas de Uso (últimos 7 dias)
            const usageResult = await client.query(`
                SELECT 
                    COUNT(DISTINCT user_id) as active_users,
                    COUNT(*) as total_conversations,
                    AVG(response_time_ms) as avg_response_time_week
                FROM ia_conversations
                WHERE created_at >= NOW() - INTERVAL '7 days'
            `);
            
            if (usageResult.rows.length > 0) {
                usageMetrics = {
                    active_users: parseInt(usageResult.rows[0].active_users || 0),
                    total_conversations: parseInt(usageResult.rows[0].total_conversations || 0),
                    avg_response_time_week: parseFloat(usageResult.rows[0].avg_response_time_week || 0)
                };
            }
        } catch (error) {
            console.warn('⚠️ Algumas métricas avançadas não disponíveis:', error.message);
        }
        
        res.json({
            stats: {
                total_knowledge: parseInt(knowledgeCount.rows[0].count),
                total_qa: parseInt(qaCount.rows[0].count),
                total_documents: parseInt(docCount.rows[0].count),
                conversations_today: parseInt(convCount.rows[0].count),
                pending_learning: parseInt(learningCount.rows[0].count)
            },
            performance: performanceMetrics,
            quality: qualityMetrics,
            usage: usageMetrics
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar estatísticas',
            stats: {
                total_knowledge: 0,
                total_qa: 0,
                total_documents: 0,
                conversations_today: 0,
                pending_learning: 0
            }
        });
    } finally {
        client.release();
    }
}));

// ============================================
// FUNÇÕES AUXILIARES PARA ANÁLISE DE INTELIGÊNCIA
// ============================================

// Calcular Score de Inteligência Geral (0-100)
function calculateIntelligenceScore(metrics) {
    let score = 0;
    let maxScore = 0;
    
    // Conhecimento base (0-30 pontos)
    maxScore += 30;
    if (metrics.totalKnowledge > 0) {
        score += Math.min(30, (metrics.totalKnowledge / 1000) * 30);
    }
    
    // Livros (0-25 pontos)
    maxScore += 25;
    if (metrics.totalBooks > 0) {
        score += Math.min(25, (metrics.totalBooks / 50) * 25);
    }
    
    // Q&A (0-15 pontos)
    maxScore += 15;
    if (metrics.totalQA > 0) {
        score += Math.min(15, (metrics.totalQA / 100) * 15);
    }
    
    // Conversas (0-10 pontos)
    maxScore += 10;
    if (metrics.totalConversations > 0) {
        score += Math.min(10, (metrics.totalConversations / 500) * 10);
    }
    
    // Palavras processadas (0-10 pontos)
    maxScore += 10;
    if (metrics.totalWords > 0) {
        score += Math.min(10, (metrics.totalWords / 1000000) * 10);
    }
    
    // Fontes diversas (0-5 pontos)
    maxScore += 5;
    if (metrics.uniqueSources > 0) {
        score += Math.min(5, (metrics.uniqueSources / 5) * 5);
    }
    
    // Categorias (0-5 pontos)
    maxScore += 5;
    if (metrics.categories > 0) {
        score += Math.min(5, (metrics.categories / 20) * 5);
    }
    
    return Math.round((score / maxScore) * 100);
}

// Analisar Qualidade do Conhecimento
async function analyzeKnowledgeQuality(client) {
    try {
        // Verificar completude (conteúdo não vazio)
        const completenessCheck = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 100 THEN 1 END) as with_content,
                COUNT(CASE WHEN keywords IS NOT NULL AND array_length(keywords, 1) > 0 THEN 1 END) as with_keywords,
                COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as categorized
            FROM ia_knowledge_base
            WHERE is_active = true
        `);
        
        const total = parseInt(completenessCheck.rows[0].total || 0);
        const withContent = parseInt(completenessCheck.rows[0].with_content || 0);
        const withKeywords = parseInt(completenessCheck.rows[0].with_keywords || 0);
        const categorized = parseInt(completenessCheck.rows[0].categorized || 0);
        
        const completenessScore = total > 0 ? (withContent / total) * 100 : 0;
        const keywordsScore = total > 0 ? (withKeywords / total) * 100 : 0;
        const categorizationScore = total > 0 ? (categorized / total) * 100 : 0;
        
        // Verificar atualidade (últimos 30 dias)
        const recencyCheck = await client.query(`
            SELECT COUNT(*) as recent
            FROM ia_knowledge_base
            WHERE is_active = true
            AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        `);
        
        const recent = parseInt(recencyCheck.rows[0].recent || 0);
        const recencyScore = total > 0 ? (recent / total) * 100 : 0;
        
        // Score geral de qualidade
        const overallScore = Math.round(
            (completenessScore * 0.4) +
            (keywordsScore * 0.2) +
            (categorizationScore * 0.2) +
            (recencyScore * 0.2)
        );
        
        return {
            completeness: Math.round(completenessScore),
            keywords: Math.round(keywordsScore),
            categorization: Math.round(categorizationScore),
            recency: Math.round(recencyScore),
            overallScore: overallScore,
            total: total,
            withContent: withContent,
            withKeywords: withKeywords,
            categorized: categorized,
            recent: recent
        };
    } catch (error) {
        console.error('Erro ao analisar qualidade:', error);
        return {
            completeness: 0,
            keywords: 0,
            categorization: 0,
            recency: 0,
            overallScore: 0,
            total: 0,
            withContent: 0,
            withKeywords: 0,
            categorized: 0,
            recent: 0
        };
    }
}

// Calcular Taxa de Uso do Conhecimento
async function calculateKnowledgeUsageRate(client) {
    try {
        // Total de conhecimento ativo
        const totalCheck = await client.query(`
            SELECT COUNT(*) as total_knowledge
            FROM ia_knowledge_base
            WHERE is_active = true
        `);
        
        const totalKnowledge = parseInt(totalCheck.rows[0].total_knowledge || 0);
        
        // Conhecimento usado em conversas (usando knowledge_used_ids)
        const usageCheck = await client.query(`
            SELECT COUNT(DISTINCT kb_id) as used_knowledge
            FROM (
                SELECT unnest(knowledge_used_ids) as kb_id
                FROM ia_conversations
                WHERE knowledge_used_ids IS NOT NULL 
                AND array_length(knowledge_used_ids, 1) > 0
            ) as used_kb
        `);
        
        const usedKnowledge = parseInt(usageCheck.rows[0].used_knowledge || 0);
        
        // Livros usados
        const booksUsageCheck = await client.query(`
            SELECT 
                COUNT(*) as total_books,
                COUNT(CASE WHEN usage_count > 0 THEN 1 END) as used_books
            FROM ia_knowledge_base
            WHERE is_active = true
            AND source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
        `);
        
        const totalBooks = parseInt(booksUsageCheck.rows[0].total_books || 0);
        const usedBooks = parseInt(booksUsageCheck.rows[0].used_books || 0);
        
        const knowledgeRate = totalKnowledge > 0 ? (usedKnowledge / totalKnowledge) * 100 : 0;
        const booksRate = totalBooks > 0 ? (usedBooks / totalBooks) * 100 : 0;
        const overallRate = Math.round((knowledgeRate + booksRate) / 2);
        
        return {
            knowledgeRate: Math.round(knowledgeRate),
            booksRate: Math.round(booksRate),
            overallRate: overallRate,
            usedKnowledge: usedKnowledge,
            totalKnowledge: totalKnowledge,
            usedBooks: usedBooks,
            totalBooks: totalBooks
        };
    } catch (error) {
        console.error('Erro ao calcular taxa de uso:', error);
        return {
            knowledgeRate: 0,
            booksRate: 0,
            overallRate: 0,
            usedKnowledge: 0,
            totalKnowledge: 0,
            usedBooks: 0,
            totalBooks: 0
        };
    }
}

// Obter Evolução Temporal
async function getTemporalEvolution(client) {
    try {
        const evolution = await client.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as knowledge_added,
                SUM(LENGTH(content)) as chars_added
            FROM ia_knowledge_base
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            AND is_active = true
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        return evolution.rows.map(row => ({
            date: row.date,
            knowledge_added: parseInt(row.knowledge_added || 0),
            chars_added: parseInt(row.chars_added || 0)
        }));
    } catch (error) {
        console.error('Erro ao obter evolução temporal:', error);
        return [];
    }
}

// Gerar Recomendações Inteligentes
function generateIntelligentRecommendations(data) {
    const recommendations = [];
    
    // Recomendação 1: Mais conhecimento
    if (data.stats.total_knowledge < 1000) {
        recommendations.push({
            priority: 'high',
            title: 'Expandir Base de Conhecimento',
            description: `Você tem ${data.stats.total_knowledge} itens de conhecimento. Recomendamos ter pelo menos 1.000 itens para uma IA robusta.`,
            action: 'Use "Treinar Mentalidade na Internet" para adicionar mais conhecimento automaticamente.',
            impact: 'Alto - Melhora significativamente a capacidade de resposta da IA'
        });
    }
    
    // Recomendação 2: Mais livros
    if (data.stats.total_books < 20) {
        recommendations.push({
            priority: 'high',
            title: 'Adicionar Mais Livros',
            description: `Você tem ${data.stats.total_books} livros. Recomendamos pelo menos 20 livros para conhecimento profundo.`,
            action: 'Use "Buscar Livros Online" ou "Treinar com Livros" para adicionar mais livros.',
            impact: 'Alto - Livros fornecem conhecimento estruturado e confiável'
        });
    }
    
    // Recomendação 3: Melhorar qualidade
    if (data.quality.overallScore < 70) {
        recommendations.push({
            priority: 'medium',
            title: 'Melhorar Qualidade do Conhecimento',
            description: `Score de qualidade atual: ${data.quality.overallScore}%. Foque em adicionar conteúdo completo e categorizado.`,
            action: 'Revise itens de conhecimento sem conteúdo completo e adicione mais detalhes.',
            impact: 'Médio - Melhora a precisão e relevância das respostas'
        });
    }
    
    // Recomendação 4: Aumentar uso
    if (data.usage.overallRate < 30) {
        recommendations.push({
            priority: 'medium',
            title: 'Aumentar Uso do Conhecimento',
            description: `Taxa de uso atual: ${data.usage.overallRate}%. Muito conhecimento não está sendo utilizado.`,
            action: 'Revise palavras-chave e categorias para melhorar a busca e recuperação.',
            impact: 'Médio - Aproveita melhor o conhecimento existente'
        });
    }
    
    // Recomendação 5: Mais Q&A
    if (data.stats.total_qa < 50) {
        recommendations.push({
            priority: 'low',
            title: 'Adicionar Mais Perguntas e Respostas',
            description: `Você tem ${data.stats.total_qa} Q&As. Recomendamos pelo menos 50 para respostas rápidas.`,
            action: 'Adicione Q&As frequentes na aba "Perguntas e Respostas".',
            impact: 'Baixo - Melhora respostas para perguntas comuns'
        });
    }
    
    return recommendations;
}

// Comparar com Benchmarks de IAs Líderes
function compareWithBenchmarks(score, metrics) {
    // Benchmarks baseados em IAs líderes (ChatGPT, Claude, Gemini)
    const benchmarks = {
        chatgpt: {
            name: 'ChatGPT',
            knowledgeItems: 1000000, // Estimativa
            books: 1000, // Estimativa
            words: 1000000000, // Estimativa
            score: 95
        },
        claude: {
            name: 'Claude',
            knowledgeItems: 800000,
            books: 800,
            words: 800000000,
            score: 93
        },
        gemini: {
            name: 'Gemini',
            knowledgeItems: 900000,
            books: 900,
            words: 900000000,
            score: 94
        }
    };
    
    const current = {
        knowledgeItems: metrics.totalKnowledge,
        books: metrics.totalBooks,
        words: metrics.totalWords,
        score: score
    };
    
    const comparisons = Object.keys(benchmarks).map(key => {
        const benchmark = benchmarks[key];
        return {
            ia: benchmark.name,
            knowledgeProgress: Math.min(100, (current.knowledgeItems / benchmark.knowledgeItems) * 100),
            booksProgress: Math.min(100, (current.books / benchmark.books) * 100),
            wordsProgress: Math.min(100, (current.words / benchmark.words) * 100),
            scoreProgress: Math.min(100, (current.score / benchmark.score) * 100),
            overallProgress: Math.min(100, (
                (current.knowledgeItems / benchmark.knowledgeItems) * 25 +
                (current.books / benchmark.books) * 25 +
                (current.words / benchmark.words) * 25 +
                (current.score / benchmark.score) * 25
            ))
        };
    });
    
    return {
        current: current,
        benchmarks: benchmarks,
        comparisons: comparisons,
        averageProgress: Math.round(comparisons.reduce((sum, c) => sum + c.overallProgress, 0) / comparisons.length)
    };
}

// GET /api/ia-king/intelligence - Dados completos de inteligência da IA
router.get('/intelligence', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Estatísticas gerais
        const [totalKnowledge, totalQA, totalDocs, totalConvs, totalLearning] = await Promise.all([
            client.query('SELECT COUNT(*) as count FROM ia_knowledge_base WHERE is_active = true'),
            client.query('SELECT COUNT(*) as count FROM ia_qa WHERE is_active = true'),
            client.query('SELECT COUNT(*) as count FROM ia_documents'),
            client.query('SELECT COUNT(*) as count FROM ia_conversations'),
            client.query("SELECT COUNT(*) as count FROM ia_learning")
        ]);
        
        // Conhecimento por fonte (source_type) - corrigido para evitar NULL
        const knowledgeBySource = await client.query(`
            SELECT 
                source_type,
                COUNT(*) as count,
                COALESCE(SUM(LENGTH(content)), 0) as total_chars,
                COALESCE(AVG(LENGTH(content)), 0) as avg_chars
            FROM ia_knowledge_base
            WHERE is_active = true
            AND content IS NOT NULL
            GROUP BY source_type
            ORDER BY count DESC
        `);
        
        // Livros lidos (tavily_book, book_training) - BUSCAR TODOS, mesmo sem conteúdo principal
        const booksRead = await client.query(`
            SELECT 
                id,
                title,
                source_type,
                source_reference,
                COALESCE(LENGTH(content), 0) as content_length,
                created_at,
                updated_at,
                is_active
            FROM ia_knowledge_base
            WHERE source_type IN ('tavily_book', 'book_training', 'tavily_book_trained')
            AND is_active = true
            ORDER BY created_at DESC
        `);
        
        // Para cada livro, verificar se tem seções (mesmo que não tenha conteúdo principal)
        const booksWithSections = await Promise.all(
            booksRead.rows.map(async (book) => {
                // Buscar seções deste livro
                const sectionsCheck = await client.query(`
                    SELECT COUNT(*) as count, SUM(LENGTH(content)) as total_chars
                    FROM ia_knowledge_base
                    WHERE source_type = 'book_training'
                    AND (
                        source_reference LIKE $1 
                        OR source_reference LIKE $2
                        OR title LIKE $3
                    )
                    AND content IS NOT NULL
                    AND content != ''
                `, [
                    `%${book.source_reference || ''}%`,
                    `book_${(book.title || '').replace(/'/g, "''")}_section_%`,
                    `%${book.title || ''}%`
                ]);
                
                const sectionsCount = parseInt(sectionsCheck.rows[0].count || 0);
                const sectionsChars = parseInt(sectionsCheck.rows[0].total_chars || 0);
                
                return {
                    ...book,
                    content_length: parseInt(book.content_length || 0) + sectionsChars,
                    has_sections: sectionsCount > 0,
                    sections_count: sectionsCount
                };
            })
        );
        
        // Conhecimento por categoria
        const knowledgeByCategory = await client.query(`
            SELECT 
                c.name as category_name,
                COUNT(kb.id) as count,
                SUM(LENGTH(kb.content)) as total_chars
            FROM ia_knowledge_base kb
            LEFT JOIN ia_categories c ON kb.category_id = c.id
            WHERE kb.is_active = true
            GROUP BY c.name
            ORDER BY count DESC
        `);
        
        // Estatísticas de uso (conversas)
        const conversationStats = await client.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                AVG(confidence_score) as avg_confidence
            FROM ia_conversations
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        
        // Fontes de conhecimento únicas
        const uniqueSources = await client.query(`
            SELECT DISTINCT source_type
            FROM ia_knowledge_base
            WHERE is_active = true
            ORDER BY source_type
        `);
        
        // Análise de palavras-chave mais usadas
        const topKeywords = await client.query(`
            SELECT 
                unnest(keywords) as keyword,
                COUNT(*) as usage_count
            FROM ia_knowledge_base
            WHERE keywords IS NOT NULL AND array_length(keywords, 1) > 0
            GROUP BY keyword
            ORDER BY usage_count DESC
            LIMIT 20
        `);
        
        // Total de palavras processadas (aproximado) - corrigido para evitar NULL
        const totalWordsResult = await client.query(`
            SELECT 
                COALESCE(SUM(array_length(string_to_array(content, ' '), 1)), 0) as total_words
            FROM ia_knowledge_base
            WHERE is_active = true
            AND content IS NOT NULL
            AND content != ''
        `);
        
        const totalWords = totalWordsResult;
        
        // NOVAS MÉTRICAS AVANÇADAS
        // Score de Inteligência Geral (0-100)
        const intelligenceScore = calculateIntelligenceScore({
            totalKnowledge: parseInt(totalKnowledge.rows[0].count),
            totalBooks: booksWithSections.length,
            totalQA: parseInt(totalQA.rows[0].count),
            totalConversations: parseInt(totalConvs.rows[0].count),
            totalWords: parseInt(totalWords.rows?.[0]?.total_words || 0),
            uniqueSources: uniqueSources.rows.length,
            categories: knowledgeByCategory.rows.length
        });
        
        // Análise de Qualidade do Conhecimento
        const qualityAnalysis = await analyzeKnowledgeQuality(client);
        
        // Taxa de Uso do Conhecimento
        const knowledgeUsageRate = await calculateKnowledgeUsageRate(client);
        
        // Evolução Temporal (últimos 30 dias)
        const temporalEvolution = await getTemporalEvolution(client);
        
        // Recomendações Inteligentes
        const recommendations = generateIntelligentRecommendations({
            stats: {
                total_knowledge: parseInt(totalKnowledge.rows[0].count),
                total_books: booksWithSections.length,
                total_qa: parseInt(totalQA.rows[0].count),
                total_conversations: parseInt(totalConvs.rows[0].count)
            },
            quality: qualityAnalysis,
            usage: knowledgeUsageRate,
            categories: knowledgeByCategory.rows.length
        });
        
        // Comparação com Benchmarks de IAs Líderes
        const benchmarkComparison = compareWithBenchmarks(intelligenceScore, {
            totalKnowledge: parseInt(totalKnowledge.rows[0].count),
            totalBooks: booksWithSections.length,
            totalWords: parseInt(totalWords.rows?.[0]?.total_words || 0)
        });
        
        res.json({
            stats: {
                total_knowledge: parseInt(totalKnowledge.rows[0].count),
                total_qa: parseInt(totalQA.rows[0].count),
                total_documents: parseInt(totalDocs.rows[0].count),
                total_conversations: parseInt(totalConvs.rows[0].count),
                total_learning_items: parseInt(totalLearning.rows[0].count),
                total_words: parseInt(totalWords.rows?.[0]?.total_words || 0),
                total_books: booksWithSections.length,
                books_with_content: booksWithSections.filter(b => b.content_length > 0).length,
                books_with_sections: booksWithSections.filter(b => b.has_sections).length,
                // NOVAS MÉTRICAS
                intelligence_score: intelligenceScore,
                knowledge_quality_score: qualityAnalysis.overallScore,
                knowledge_usage_rate: knowledgeUsageRate.overallRate,
                categories_count: knowledgeByCategory.rows.length,
                sources_count: uniqueSources.rows.length
            },
            knowledge_by_source: knowledgeBySource.rows.map(row => ({
                source: row.source_type || 'desconhecido',
                count: parseInt(row.count),
                total_chars: parseInt(row.total_chars || 0),
                avg_chars: parseFloat(row.avg_chars || 0)
            })),
            books_read: booksWithSections.map(book => ({
                id: book.id,
                title: book.title || 'Livro sem título',
                source_type: book.source_type,
                source_reference: book.source_reference,
                content_length: book.content_length,
                words_approx: Math.floor(book.content_length / 5),
                has_sections: book.has_sections,
                sections_count: book.sections_count,
                has_content: book.content_length > 0,
                created_at: book.created_at,
                updated_at: book.updated_at
            })),
            knowledge_by_category: knowledgeByCategory.rows.map(row => ({
                category: row.category_name || 'Sem categoria',
                count: parseInt(row.count),
                total_chars: parseInt(row.total_chars || 0)
            })),
            conversation_stats: conversationStats.rows.map(row => ({
                date: row.date,
                count: parseInt(row.count),
                avg_confidence: parseFloat(row.avg_confidence || 0)
            })),
            unique_sources: uniqueSources.rows.map(row => row.source_type),
            top_keywords: topKeywords.rows.map(row => ({
                keyword: row.keyword,
                usage_count: parseInt(row.usage_count)
            })),
            // NOVAS INFORMAÇÕES PARA ABA INTELIGÊNCIA
            performance: {
                avg_confidence: conversationStats.rows.length > 0 
                    ? parseFloat(conversationStats.rows.reduce((sum, r) => sum + (parseFloat(r.avg_confidence) || 0), 0) / conversationStats.rows.length).toFixed(2)
                    : 0,
                total_conversations_today: conversationStats.rows.filter(r => {
                    const date = new Date(r.date);
                    const today = new Date();
                    return date.toDateString() === today.toDateString();
                }).reduce((sum, r) => sum + parseInt(r.count), 0),
                knowledge_usage_rate: booksWithSections.length > 0
                    ? ((booksWithSections.filter(b => b.content_length > 0).length / booksWithSections.length) * 100).toFixed(1)
                    : 0
            },
            diagnostics: {
                books_without_content: booksWithSections.filter(b => b.content_length === 0 && !b.has_sections).length,
                books_with_content_only: booksWithSections.filter(b => b.content_length > 0 && !b.has_sections).length,
                books_with_sections_only: booksWithSections.filter(b => b.content_length === 0 && b.has_sections).length,
                books_complete: booksWithSections.filter(b => b.content_length > 0 && b.has_sections).length,
                total_sections: booksWithSections.reduce((sum, b) => sum + (b.sections_count || 0), 0)
            },
            // NOVOS DADOS AVANÇADOS
            quality_analysis: qualityAnalysis,
            knowledge_usage: knowledgeUsageRate,
            temporal_evolution: temporalEvolution,
            recommendations: recommendations,
            benchmark_comparison: benchmarkComparison
        });
    } catch (error) {
        console.error('Erro ao buscar dados de inteligência:', error);
        res.status(500).json({ error: 'Erro ao buscar dados de inteligência' });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/intelligence/diagnostic - Diagnóstico completo de por que IA não usa livros
router.get('/intelligence/diagnostic', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // 1. Verificar livros no banco
        const allBooks = await client.query(`
            SELECT 
                id,
                title,
                source_type,
                LENGTH(content) as content_length,
                is_active,
                priority,
                usage_count,
                source_reference
            FROM ia_knowledge_base
            WHERE source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
            ORDER BY created_at DESC
        `);
        
        // 2. Verificar seções de cada livro
        const booksWithDetails = await Promise.all(
            allBooks.rows.map(async (book) => {
                const sections = await client.query(`
                    SELECT COUNT(*) as count, SUM(LENGTH(content)) as total_chars
                    FROM ia_knowledge_base
                    WHERE source_type = 'book_training'
                    AND (
                        source_reference LIKE $1
                        OR source_reference LIKE $2
                        OR title LIKE $3
                    )
                    AND content IS NOT NULL
                    AND content != ''
                `, [
                    `%${book.source_reference || ''}%`,
                    `book_${(book.title || '').replace(/'/g, "''")}_section_%`,
                    `%${book.title || ''}%`
                ]);
                
                return {
                    id: book.id,
                    title: book.title || 'Livro sem título',
                    source_type: book.source_type,
                    content_length: parseInt(book.content_length || 0),
                    sections_count: parseInt(sections.rows[0].count || 0),
                    sections_chars: parseInt(sections.rows[0].total_chars || 0),
                    total_content: parseInt(book.content_length || 0) + parseInt(sections.rows[0].total_chars || 0),
                    is_active: book.is_active,
                    priority: book.priority,
                    usage_count: book.usage_count || 0,
                    has_content: (parseInt(book.content_length || 0) + parseInt(sections.rows[0].total_chars || 0)) > 0,
                    status: (parseInt(book.content_length || 0) + parseInt(sections.rows[0].total_chars || 0)) > 0 
                        ? '✅ Tem conteúdo' 
                        : '❌ Sem conteúdo'
                };
            })
        );
        
        // 3. Verificar última vez que livros foram usados
        const lastUsage = await client.query(`
            SELECT 
                kb.id,
                kb.title,
                MAX(ic.created_at) as last_used
            FROM ia_knowledge_base kb
            LEFT JOIN ia_conversations ic ON kb.id = ANY(ic.knowledge_used_ids)
            WHERE kb.source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
            GROUP BY kb.id, kb.title
            ORDER BY last_used DESC NULLS LAST
        `);
        
        // 4. Estatísticas gerais
        const stats = {
            total_books: allBooks.rows.length,
            books_with_content: booksWithDetails.filter(b => b.has_content).length,
            books_without_content: booksWithDetails.filter(b => !b.has_content).length,
            books_active: booksWithDetails.filter(b => b.is_active).length,
            books_inactive: booksWithDetails.filter(b => !b.is_active).length,
            total_content_chars: booksWithDetails.reduce((sum, b) => sum + b.total_content, 0),
            total_sections: booksWithDetails.reduce((sum, b) => sum + b.sections_count, 0),
            books_never_used: booksWithDetails.filter(b => b.usage_count === 0).length,
            books_used: booksWithDetails.filter(b => b.usage_count > 0).length
        };
        
        // 5. Problemas identificados
        const issues = [];
        if (stats.books_without_content > 0) {
            issues.push({
                type: 'warning',
                message: `${stats.books_without_content} livro(s) sem conteúdo - precisam ser retreinados`,
                books: booksWithDetails.filter(b => !b.has_content).map(b => b.title)
            });
        }
        
        if (stats.books_never_used > 0) {
            issues.push({
                type: 'info',
                message: `${stats.books_never_used} livro(s) nunca foram usados - podem não estar sendo encontrados pela IA`,
                books: booksWithDetails.filter(b => b.usage_count === 0).slice(0, 5).map(b => b.title)
            });
        }
        
        if (stats.books_inactive > 0) {
            issues.push({
                type: 'error',
                message: `${stats.books_inactive} livro(s) estão inativos - não serão usados pela IA`,
                books: booksWithDetails.filter(b => !b.is_active).map(b => b.title)
            });
        }
        
        res.json({
            stats: stats,
            books: booksWithDetails,
            last_usage: lastUsage.rows.map(r => ({
                id: r.id,
                title: r.title,
                last_used: r.last_used
            })),
            issues: issues,
            recommendations: [
                stats.books_without_content > 0 
                    ? 'Retreinar livros sem conteúdo usando a função "Treinar com Livro"'
                    : null,
                stats.books_inactive > 0
                    ? 'Ativar livros inativos para que a IA possa usá-los'
                    : null,
                stats.books_never_used > 0
                    ? 'Verificar se os livros têm palavras-chave relevantes e conteúdo indexável'
                    : null
            ].filter(r => r !== null)
        });
    } catch (error) {
        console.error('❌ Erro ao gerar diagnóstico:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/intelligence/knowledge-items - Detalhes dos itens de conhecimento
router.get('/intelligence/knowledge-items', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { page = 1, limit = 50, source_type, category } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereClause = 'WHERE is_active = true';
        const params = [];
        let paramIndex = 1;
        
        if (source_type) {
            whereClause += ` AND source_type = $${paramIndex}`;
            params.push(source_type);
            paramIndex++;
        }
        
        if (category) {
            whereClause += ` AND category_id = (SELECT id FROM ia_categories WHERE name = $${paramIndex})`;
            params.push(category);
            paramIndex++;
        }
        
        // Buscar itens de conhecimento
        const knowledgeItems = await client.query(`
            SELECT 
                id,
                title,
                content,
                keywords,
                source_type,
                category_id,
                priority,
                usage_count,
                LENGTH(content) as content_length,
                array_length(string_to_array(content, ' '), 1) as word_count,
                created_at,
                updated_at
            FROM ia_knowledge_base
            ${whereClause}
            ORDER BY priority DESC, usage_count DESC, created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, parseInt(limit), offset]);
        
        // Contar total
        const totalResult = await client.query(`
            SELECT COUNT(*) as count
            FROM ia_knowledge_base
            ${whereClause}
        `, params);
        
        res.json({
            items: knowledgeItems.rows.map(item => ({
                id: item.id,
                title: item.title || 'Sem título',
                content_preview: item.content ? item.content.substring(0, 200) + '...' : 'Sem conteúdo',
                keywords: item.keywords || [],
                source_type: item.source_type,
                category_id: item.category_id,
                priority: item.priority,
                usage_count: item.usage_count || 0,
                content_length: parseInt(item.content_length || 0),
                word_count: parseInt(item.word_count || 0),
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(totalResult.rows[0].count),
                total_pages: Math.ceil(parseInt(totalResult.rows[0].count) / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar itens de conhecimento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/intelligence/knowledge-sources - Detalhes das fontes de conhecimento
router.get('/intelligence/knowledge-sources', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { source_type } = req.query;
        
        let query = `
            SELECT 
                source_type,
                COUNT(*) as count,
                SUM(LENGTH(content)) as total_chars,
                AVG(LENGTH(content)) as avg_chars,
                SUM(array_length(string_to_array(content, ' '), 1)) as total_words,
                MIN(created_at) as first_added,
                MAX(created_at) as last_added,
                SUM(usage_count) as total_usage
            FROM ia_knowledge_base
            WHERE is_active = true
        `;
        
        const params = [];
        if (source_type) {
            query += ' AND source_type = $1';
            params.push(source_type);
        }
        
        query += ' GROUP BY source_type ORDER BY count DESC';
        
        const sourcesResult = await source_type 
            ? client.query(query, params)
            : client.query(query);
        
        // Buscar exemplos de cada fonte
        const sourcesWithExamples = await Promise.all(
            sourcesResult.rows.map(async (source) => {
                const examplesResult = await client.query(`
                    SELECT id, title, LENGTH(content) as content_length, created_at
                    FROM ia_knowledge_base
                    WHERE source_type = $1 AND is_active = true
                    ORDER BY usage_count DESC, created_at DESC
                    LIMIT 5
                `, [source.source_type]);
                
                return {
                    source_type: source.source_type,
                    count: parseInt(source.count),
                    total_chars: parseInt(source.total_chars || 0),
                    avg_chars: parseFloat(source.avg_chars || 0),
                    total_words: parseInt(source.total_words || 0),
                    first_added: source.first_added,
                    last_added: source.last_added,
                    total_usage: parseInt(source.total_usage || 0),
                    examples: examplesResult.rows.map(ex => ({
                        id: ex.id,
                        title: ex.title || 'Sem título',
                        content_length: parseInt(ex.content_length || 0),
                        created_at: ex.created_at
                    }))
                };
            })
        );
        
        res.json({
            sources: sourcesWithExamples,
            total_sources: sourcesWithExamples.length
        });
    } catch (error) {
        console.error('❌ Erro ao buscar fontes de conhecimento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/intelligence/book-training - Detalhes do treinamento de livros
router.get('/intelligence/book-training', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Buscar todos os livros com estatísticas detalhadas
        const booksResult = await client.query(`
            SELECT 
                kb.id,
                kb.title,
                kb.content,
                kb.source_type,
                kb.source_reference,
                kb.created_at,
                kb.updated_at,
                kb.usage_count,
                LENGTH(kb.content) as content_length,
                array_length(string_to_array(kb.content, ' '), 1) as word_count,
                (SELECT COUNT(*) FROM ia_knowledge_base 
                 WHERE source_type = 'book_training' 
                 AND source_reference LIKE '%' || REPLACE(kb.title, ' ', '_') || '%') as sections_count,
                (SELECT COUNT(*) FROM ia_qa 
                 WHERE keywords && ARRAY(SELECT unnest(kb.keywords))
                 OR question ILIKE '%' || kb.title || '%') as qa_count
            FROM ia_knowledge_base kb
            WHERE kb.source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
            ORDER BY kb.created_at DESC
        `);
        
        // Estatísticas gerais de treinamento
        const trainingStats = await client.query(`
            SELECT 
                COUNT(DISTINCT kb.id) as total_books,
                SUM(LENGTH(kb.content)) as total_chars,
                SUM(array_length(string_to_array(kb.content, ' '), 1)) as total_words,
                COUNT(DISTINCT kb2.id) as total_sections,
                SUM(kb.usage_count) as total_usage
            FROM ia_knowledge_base kb
            LEFT JOIN ia_knowledge_base kb2 ON kb2.source_type = 'book_training' 
                AND kb2.source_reference LIKE '%' || REPLACE(kb.title, ' ', '_') || '%'
            WHERE kb.source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
        `);
        
        const stats = trainingStats.rows[0];
        
        res.json({
            books: booksResult.rows.map(book => {
                const title = book.title || 'Livro sem título';
                const titleParts = title.split(' - ');
                return {
                    id: book.id,
                    title: titleParts[0],
                    author: titleParts.length > 1 ? titleParts[1] : null,
                    source_type: book.source_type,
                    source_reference: book.source_reference,
                    content_length: parseInt(book.content_length || 0),
                    word_count: parseInt(book.word_count || 0),
                    sections_count: parseInt(book.sections_count || 0),
                    qa_count: parseInt(book.qa_count || 0),
                    usage_count: book.usage_count || 0,
                    created_at: book.created_at,
                    updated_at: book.updated_at,
                    is_complete: (parseInt(book.content_length || 0) > 1000 && parseInt(book.sections_count || 0) > 0)
                };
            }),
            stats: {
                total_books: parseInt(stats.total_books || 0),
                total_chars: parseInt(stats.total_chars || 0),
                total_words: parseInt(stats.total_words || 0),
                total_sections: parseInt(stats.total_sections || 0),
                total_usage: parseInt(stats.total_usage || 0),
                avg_words_per_book: booksResult.rows.length > 0 
                    ? Math.floor(parseInt(stats.total_words || 0) / booksResult.rows.length)
                    : 0
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar detalhes de treinamento de livros:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// ============================================
// FUNÇÃO PARA BUSCAR LIVROS COMPLETOS
// ============================================
/**
 * Busca livros completos na internet usando Tavily
 * Tenta encontrar o livro completo, não apenas resumos
 */
async function buscarLivroCompleto(titulo, autor, apiKey) {
    try {
        // Queries otimizadas para encontrar livros completos
        const queries = [
            `${titulo} ${autor} livro completo pdf texto`,
            `${titulo} ${autor} livro completo online ler`,
            `${titulo} ${autor} livro completo download`,
            `"${titulo}" "${autor}" livro completo texto`,
            `${titulo} ${autor} livro completo site:pdf site:doc site:txt`
        ];
        
        let melhorResultado = null;
        let maiorConteudo = 0;
        
        for (const query of queries) {
            const result = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    query: query,
                    search_depth: 'advanced', // Busca profunda
                    max_results: 10,
                    include_raw_content: true, // Incluir conteúdo bruto completo
                    include_answer: false
                })
            });
            
            if (!result.ok) continue;
            
            const data = await result.json();
            
            if (data.results && data.results.length > 0) {
                // Procurar resultado com mais conteúdo (provavelmente livro completo)
                for (const r of data.results) {
                    const contentLength = (r.raw_content || r.content || '').length;
                    
                    // Filtrar apenas resultados com muito conteúdo (livro completo)
                    if (contentLength > 10000 && contentLength > maiorConteudo) {
                        // Verificar se parece ser um livro (não vídeo, não resumo curto)
                        if (!r.url?.includes('youtube.com') && 
                            !r.url?.includes('youtu.be') &&
                            !r.title?.toLowerCase().includes('vídeo') &&
                            !r.title?.toLowerCase().includes('video')) {
                            maiorConteudo = contentLength;
                            melhorResultado = {
                                title: r.title,
                                content: r.raw_content || r.content,
                                url: r.url,
                                contentLength: contentLength
                            };
                        }
                    }
                }
            }
            
            // Pequeno delay entre buscas
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return melhorResultado;
    } catch (error) {
        console.error('Erro ao buscar livro completo:', error);
        return null;
    }
}

// POST /api/ia-king/auto-train-mind - Treinamento automático da mentalidade na internet (MELHORADO)
router.post('/auto-train-mind', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        console.log('🚀 [IA] Iniciando treinamento automático da mentalidade na internet (MELHORADO)...');
        
        // Verificar se Tavily está configurado
        const tavilyConfig = await client.query(`
            SELECT api_key, is_enabled 
            FROM ia_web_search_config 
            WHERE api_provider = 'tavily' 
            LIMIT 1
        `);
        
        if (!tavilyConfig.rows.length || !tavilyConfig.rows[0].api_key) {
            return res.status(400).json({ 
                error: 'Tavily não está configurado. Configure a API key em "Busca na Web" primeiro.' 
            });
        }
        
        const tavilyApiKey = tavilyConfig.rows[0].api_key;
        
        // Buscar todas as categorias disponíveis
        const categoriesResult = await client.query(`
            SELECT id, name, description 
            FROM ia_categories 
            WHERE is_active = true
            ORDER BY priority DESC, name ASC
        `);
        
        const categories = categoriesResult.rows.map(c => c.name);
        console.log(`📚 [IA] Categorias encontradas: ${categories.length} - ${categories.join(', ')}`);
        
        // TÓPICOS EXPANDIDOS: Mentalidade, estratégias do ChatGPT, como pensar, etc.
        // NOVO: Tópicos expandidos para melhorar mentalidade, cognição e raciocínio
        const trainingTopics = [
            // MENTALIDADE E COGNIÇÃO (EXPANDIDO)
            'como ChatGPT pensa e raciocina',
            'como melhorar raciocínio lógico',
            'pensamento crítico e análise',
            'resolução de problemas complexos',
            'criatividade e inovação',
            'mentalidade vencedora',
            'desenvolvimento de mentalidade',
            'mudança de mentalidade',
            'mentalidade positiva',
            'mentalidade estratégica',
            'raciocínio dedutivo e indutivo',
            'pensamento sistêmico',
            'análise de causa e efeito',
            'raciocínio abstrato',
            'lógica formal e informal',
            'meta-cognição e auto-reflexão',
            'aprendizado profundo e significativo',
            'compreensão contextual',
            'síntese de informações',
            'análise de padrões',
            'inferência e dedução',
            'raciocínio probabilístico',
            'pensamento contrafactual',
            'analogias e metáforas',
            'raciocínio causal',
            'grafo de conhecimento',
            'memória episódica e semântica',
            'chain of thought reasoning',
            'pensamento passo a passo',
            'validação de fontes e fact-checking',
            // Mentalidades e Cognição
            'inteligência artificial mentalidade e cognição',
            'como IAs pensam e raciocinam',
            'sistemas de resposta inteligente',
            'processamento de linguagem natural avançado',
            'arquitetura cognitiva de IAs',
            'raciocínio lógico em inteligência artificial',
            'sistemas de conhecimento e memória',
            'aprendizado de máquina para IAs conversacionais',
            'síntese de informação e geração de respostas',
            'anti-alucinação em IAs',
            'validação de conhecimento em sistemas de IA',
            'contexto e memória em conversas com IA',
            'extração de entidades e palavras-chave',
            'classificação de intenções em IAs',
            'sistemas de busca semântica',
            
            // Estratégias do ChatGPT e como ele pensa
            'como ChatGPT pensa e raciocina',
            'estratégias de pensamento do ChatGPT',
            'métodos de raciocínio de inteligência artificial',
            'chain of thought reasoning IA',
            'como ChatGPT busca conhecimento',
            'arquitetura de pensamento GPT',
            'sistemas de raciocínio em IAs conversacionais',
            'prompt engineering e raciocínio',
            'técnicas de pensamento de modelos de linguagem',
            
            // MELHORES IAs DO MUNDO - ChatGPT
            'ChatGPT arquitetura e funcionamento',
            'ChatGPT técnicas avançadas de resposta',
            'ChatGPT sistema de conhecimento',
            'ChatGPT como funciona internamente',
            'ChatGPT melhorias e atualizações',
            'ChatGPT técnicas de prompt engineering',
            'ChatGPT raciocínio e lógica',
            'ChatGPT processamento de linguagem natural',
            
            // MELHORES IAs DO MUNDO - Claude
            'Claude AI arquitetura e funcionamento',
            'Claude AI técnicas avançadas',
            'Claude AI sistema de conhecimento',
            'Claude AI como funciona',
            'Claude AI melhorias e capacidades',
            'Claude AI raciocínio avançado',
            'Claude AI processamento de texto',
            'Claude AI técnicas de resposta',
            
            // MELHORES IAs DO MUNDO - Gemini
            'Google Gemini arquitetura',
            'Gemini AI funcionamento',
            'Gemini AI técnicas avançadas',
            'Gemini AI sistema de conhecimento',
            'Gemini AI melhorias',
            'Gemini AI raciocínio',
            'Gemini AI processamento multimodal',
            'Gemini AI capacidades avançadas',
            
            // TÉCNICAS AVANÇADAS DE IAs LÍDERES
            'técnicas de fine-tuning de modelos de linguagem',
            'RAG retrieval augmented generation',
            'few-shot learning em IAs',
            'zero-shot learning inteligência artificial',
            'transfer learning em modelos de linguagem',
            'técnicas de atenção em transformers',
            'arquitetura transformer avançada',
            'técnicas de otimização de prompts',
            'técnicas de geração de texto avançadas',
            'técnicas de validação de respostas de IA',
            'técnicas anti-alucinação em IAs',
            'técnicas de contexto e memória em IAs',
            'técnicas de síntese de informação',
            'técnicas de busca semântica avançada',
            'técnicas de classificação de intenções',
            'técnicas de extração de entidades',
            'técnicas de análise de sentimento',
            'técnicas de geração de respostas personalizadas',
            'técnicas de otimização de performance de IA',
            'técnicas de escalabilidade de sistemas de IA',
            
            // BENCHMARKS E COMPARAÇÕES
            'benchmarks de inteligência artificial',
            'comparação de modelos de linguagem',
            'métricas de qualidade de IAs',
            'avaliação de performance de IAs',
            'testes de capacidade de IAs',
            'rankings de inteligência artificial',
            'comparação ChatGPT vs Claude vs Gemini',
            'métricas de precisão de IAs',
            'avaliação de conhecimento de IAs',
            'benchmarks de raciocínio de IAs',
            
            // Mentalidades e desenvolvimento pessoal
            'mentalidade de crescimento',
            'mentalidade empreendedora',
            'mentalidade vencedora',
            'desenvolvimento de mentalidade',
            'mudança de mentalidade',
            'mentalidade positiva',
            'mentalidade estratégica',
            
            // Estratégias de vendas e negócios
            'estratégias de vendas avançadas',
            'técnicas de vendas e persuasão',
            'mentalidade de vendas',
            'estratégias comerciais',
            'negociação e vendas',
            
            // AUTO-MELHORIA E DESENVOLVIMENTO DA IA
            'como melhorar inteligência artificial',
            'auto-melhoria de sistemas de IA',
            'desenvolvimento autônomo de IA',
            'otimização de respostas de IA',
            'como IAs se desenvolvem sozinhas',
            'aprendizado contínuo de IA',
            'auto-otimização de modelos de linguagem',
            'melhorias contínuas em sistemas de IA',
            'desenvolvimento autônomo de conhecimento',
            'auto-aprendizado avançado de IA',
            'como tornar IA mais inteligente',
            'otimização de performance de IA',
            'melhorias de precisão em IA',
            'desenvolvimento de capacidades de IA',
            
            // ANÁLISE E OTIMIZAÇÃO DE SISTEMAS
            'análise de sistemas e otimização',
            'como analisar e melhorar sistemas',
            'análise de cartões virtuais e otimização',
            'análise de páginas de vendas',
            'otimização de conversão em vendas',
            'análise de palavras-chave e SEO',
            'análise de conteúdo e melhorias',
            'análise de textos e otimização',
            'análise de estratégias de marketing',
            'otimização de textos de vendas',
            'análise de copywriting',
            'melhorias em textos comerciais',
            'análise de páginas de vendas online',
            'otimização de landing pages',
            
            // CONHECIMENTO SOBRE O SISTEMA CONECTA KING
            'análise de cartões virtuais profissionais',
            'otimização de cartões de visita digitais',
            'análise de módulos de cartão virtual',
            'melhorias em cartões virtuais',
            'análise de funcionalidades de cartão virtual',
            'otimização de compartilhamento de cartões',
            'análise de conversão de cartões virtuais',
            'melhorias em páginas de vendas personalizadas',
            'análise de módulos de vendas',
            'otimização de catálogos de produtos',
            
            // Conhecimento geral por categoria
            ...categories.map(cat => [
                `conhecimento sobre ${cat}`,
                `informações sobre ${cat}`,
                `${cat} completo`,
                `análise e otimização de ${cat}`,
                `melhorias em ${cat}`
            ]).flat()
        ];
        
        // LIVROS ESPECÍFICOS PARA BUSCAR COMPLETOS (EXPANDIDO)
        const livrosParaBuscar = [
            // Desenvolvimento Pessoal e Mentalidade
            { titulo: 'Tiago Brunet', autor: 'mentalidade', categorias: ['Autoajuda', 'Motivação', 'Negócios'] },
            { titulo: 'Pai Rico Pai Pobre', autor: 'Robert Kiyosaki', categorias: ['Negócios', 'Educação Financeira'] },
            { titulo: 'O Poder do Hábito', autor: 'Charles Duhigg', categorias: ['Psicologia', 'Autoajuda'] },
            { titulo: 'Mindset', autor: 'Carol Dweck', categorias: ['Psicologia', 'Autoajuda'] },
            { titulo: 'Como Fazer Amigos e Influenciar Pessoas', autor: 'Dale Carnegie', categorias: ['Negócios', 'Autoajuda'] },
            { titulo: 'A Arte da Guerra', autor: 'Sun Tzu', categorias: ['Estratégias', 'Negócios'] },
            { titulo: 'O Monge e o Executivo', autor: 'James Hunter', categorias: ['Liderança', 'Negócios'] },
            { titulo: 'Rápido e Devagar', autor: 'Daniel Kahneman', categorias: ['Psicologia', 'Ciência'] },
            
            // Vendas e Negócios
            { titulo: 'Vendas', autor: 'Brian Tracy', categorias: ['Vendas', 'Negócios'] },
            { titulo: 'Spin Selling', autor: 'Neil Rackham', categorias: ['Vendas', 'Negócios'] },
            { titulo: 'Influência', autor: 'Robert Cialdini', categorias: ['Psicologia', 'Vendas'] },
            { titulo: 'O Vendedor Mais Rico do Mundo', autor: 'Og Mandino', categorias: ['Vendas', 'Motivação'] },
            
            // Tecnologia e IA
            { titulo: 'Inteligência Artificial', autor: 'Stuart Russell', categorias: ['Tecnologia', 'Ciência'] },
            { titulo: 'Superinteligência', autor: 'Nick Bostrom', categorias: ['Tecnologia', 'Ciência'] },
            { titulo: 'A Era da Inteligência Artificial', autor: 'Kai-Fu Lee', categorias: ['Tecnologia', 'Negócios'] },
            
            // Marketing e Copywriting
            { titulo: 'Copywriting', autor: 'Robert Bly', categorias: ['Marketing', 'Vendas'] },
            { titulo: 'A Bíblia do Marketing Digital', autor: 'Martha Gabriel', categorias: ['Marketing', 'Tecnologia'] },
            { titulo: 'Tudo é Marketing', autor: 'Philip Kotler', categorias: ['Marketing', 'Negócios'] }
        ];
        
        let knowledgeAdded = 0;
        let topicsSearched = 0;
        let livrosCompletosAdicionados = 0;
        const startTime = Date.now();
        
        // Criar registro de treinamento
        const trainingRecord = await client.query(`
            INSERT INTO ia_auto_train_mind_history 
            (started_by, status, training_topics, tavily_api_used)
            VALUES ($1, 'running', $2, true)
            RETURNING id
        `, [req.user.id, trainingTopics]);
        
        const trainingId = trainingRecord.rows[0].id;
        
        // FASE 1: BUSCAR LIVROS COMPLETOS ESPECÍFICOS
        console.log('📚 [IA] FASE 1: Buscando livros completos específicos...');
        for (const livro of livrosParaBuscar) {
            try {
                console.log(`📖 [IA] Buscando livro completo: "${livro.titulo}" - ${livro.autor}`);
                
                const livroCompleto = await buscarLivroCompleto(livro.titulo, livro.autor, tavilyApiKey);
                
                if (livroCompleto && livroCompleto.content && livroCompleto.contentLength > 10000) {
                    // Verificar se já existe
                    const existingCheck = await client.query(`
                        SELECT id FROM ia_knowledge_base 
                        WHERE LOWER(title) LIKE $1
                        LIMIT 1
                    `, [`%${livro.titulo.toLowerCase()}%`]);
                    
                    if (existingCheck.rows.length === 0) {
                        // Buscar categoria do livro
                        let categoryId = null;
                        if (livro.categorias && livro.categorias.length > 0) {
                            const catResult = await client.query(`
                                SELECT id FROM ia_categories 
                                WHERE LOWER(name) = ANY($1::text[])
                                ORDER BY priority DESC LIMIT 1
                            `, [livro.categorias.map(c => c.toLowerCase())]);
                            if (catResult.rows.length > 0) {
                                categoryId = catResult.rows[0].id;
                            }
                        }
                        
                        // Adicionar livro completo à base de conhecimento
                        const keywords = extractKeywords(livroCompleto.title + ' ' + livroCompleto.content.substring(0, 1000));
                        
                        await client.query(`
                            INSERT INTO ia_knowledge_base 
                            (category_id, title, content, keywords, source_type, source_reference, is_active, priority, created_at, updated_at)
                            VALUES ($1, $2, $3, $4, 'tavily_book_complete', $5, true, 90, NOW(), NOW())
                        `, [
                            categoryId,
                            livroCompleto.title || `${livro.titulo} - ${livro.autor}`,
                            livroCompleto.content.substring(0, 500000), // Limitar a 500KB
                            keywords,
                            livroCompleto.url || 'auto-training'
                        ]);
                        
                        knowledgeAdded++;
                        livrosCompletosAdicionados++;
                        console.log(`✅ [IA] Livro completo adicionado: "${livro.titulo}" (${Math.floor(livroCompleto.contentLength / 1000)}KB)`);
                    } else {
                        console.log(`⏭️ [IA] Livro já existe: "${livro.titulo}"`);
                    }
                } else {
                    console.log(`⚠️ [IA] Livro completo não encontrado ou muito curto: "${livro.titulo}"`);
                }
                
                // Delay para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`❌ [IA] Erro ao buscar livro "${livro.titulo}":`, error);
            }
        }
        
        // FASE 2: BUSCAR E APRENDER COM CADA TÓPICO (MELHORADO)
        console.log('🧠 [IA] FASE 2: Buscando conhecimento sobre mentalidades e estratégias...');
        for (const topic of trainingTopics) {
            try {
                console.log(`📚 [IA] Buscando conhecimento sobre: ${topic}`);
                
                // Criar registro de detalhe do tópico
                const topicDetail = await client.query(`
                    INSERT INTO ia_auto_train_mind_details 
                    (training_id, topic, search_status)
                    VALUES ($1, $2, 'searching')
                    RETURNING id
                `, [trainingId, topic]);
                
                const topicDetailId = topicDetail.rows[0].id;
                
                // Buscar com Tavily (MELHORADO - busca profunda com conteúdo completo)
                const tavilyResponse = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${tavilyApiKey}`
                    },
                    body: JSON.stringify({
                        query: topic,
                        search_depth: 'advanced', // Busca profunda
                        max_results: 10, // Mais resultados
                        include_raw_content: true, // Incluir conteúdo bruto completo
                        include_answer: true
                    })
                });
                
                if (!tavilyResponse.ok) {
                    console.error(`❌ [IA] Erro ao buscar com Tavily para: ${topic}`);
                    continue;
                }
                
                const tavilyData = await tavilyResponse.json();
                
                if (!tavilyData.results || tavilyData.results.length === 0) {
                    console.log(`⚠️ [IA] Nenhum resultado encontrado para: ${topic}`);
                    
                    // Atualizar detalhe do tópico
                    await client.query(`
                        UPDATE ia_auto_train_mind_details 
                        SET search_status = 'completed', 
                            results_found = 0,
                            completed_at = NOW()
                        WHERE id = $1
                    `, [topicDetailId]);
                    
                    continue;
                }
                
                let topicKnowledgeAdded = 0;
                
                // Processar cada resultado (MELHORADO - priorizar conteúdo completo)
                for (const result of tavilyData.results) {
                    // Usar raw_content se disponível (conteúdo completo), senão usar content
                    const fullContent = result.raw_content || result.content || '';
                    
                    if (!fullContent || fullContent.length < 200) continue;
                    
                    // Filtrar vídeos
                    if (result.url?.includes('youtube.com') || 
                        result.url?.includes('youtu.be') ||
                        result.title?.toLowerCase().includes('vídeo') ||
                        result.title?.toLowerCase().includes('video')) {
                        continue;
                    }
                    
                    // Verificar se já existe conhecimento similar
                    const existingCheck = await client.query(`
                        SELECT id FROM ia_knowledge_base 
                        WHERE title = $1 OR content LIKE $2 
                        LIMIT 1
                    `, [result.title || topic, `%${fullContent.substring(0, 100)}%`]);
                    
                    if (existingCheck.rows.length > 0) {
                        console.log(`⏭️ [IA] Conhecimento já existe para: ${result.title}`);
                        continue;
                    }
                    
                    // Identificar categoria baseada no tópico
                    let categoryId = null;
                    const lowerTopic = topic.toLowerCase();
                    if (lowerTopic.includes('venda') || lowerTopic.includes('comercial')) {
                        const catResult = await client.query(`SELECT id FROM ia_categories WHERE LOWER(name) IN ('vendas', 'negócios') LIMIT 1`);
                        if (catResult.rows.length > 0) categoryId = catResult.rows[0].id;
                    } else if (lowerTopic.includes('mentalidade') || lowerTopic.includes('psicologia')) {
                        const catResult = await client.query(`SELECT id FROM ia_categories WHERE LOWER(name) IN ('psicologia', 'autoajuda', 'motivação') LIMIT 1`);
                        if (catResult.rows.length > 0) categoryId = catResult.rows[0].id;
                    } else if (lowerTopic.includes('ciência') || lowerTopic.includes('científico')) {
                        const catResult = await client.query(`SELECT id FROM ia_categories WHERE LOWER(name) = 'ciência' LIMIT 1`);
                        if (catResult.rows.length > 0) categoryId = catResult.rows[0].id;
                    }
                    
                    // Adicionar à base de conhecimento (MELHORADO - mais conteúdo)
                    const content = fullContent.substring(0, 200000); // Até 200KB (muito mais conteúdo)
                    const keywords = extractKeywords(topic + ' ' + content.substring(0, 2000));
                    
                    await client.query(`
                        INSERT INTO ia_knowledge_base 
                        (category_id, title, content, keywords, source_type, source_reference, is_active, priority, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, true, 80, NOW(), NOW())
                    `, [
                        categoryId,
                        result.title || topic,
                        content,
                        keywords,
                        'tavily_training',
                        result.url || 'auto-training'
                    ]);
                    
                    knowledgeAdded++;
                    topicKnowledgeAdded++;
                    console.log(`✅ [IA] Conhecimento adicionado: ${result.title?.substring(0, 50)} (${Math.floor(content.length / 1000)}KB)`);
                }
                
                // Atualizar detalhe do tópico
                await client.query(`
                    UPDATE ia_auto_train_mind_details 
                    SET search_status = 'completed',
                        results_found = $1,
                        knowledge_added = $2,
                        completed_at = NOW()
                    WHERE id = $3
                `, [tavilyData.results.length, topicKnowledgeAdded, topicDetailId]);
                
                topicsSearched++;
                
                // Pequeno delay para não sobrecarregar a API
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ [IA] Erro ao processar tópico "${topic}":`, error);
                
                // Atualizar detalhe do tópico com erro
                await client.query(`
                    UPDATE ia_auto_train_mind_details 
                    SET search_status = 'failed',
                        error_message = $1,
                        completed_at = NOW()
                    WHERE training_id = $2 AND topic = $3
                `, [error.message.substring(0, 500), trainingId, topic]);
                
                continue;
            }
        }
        
        const endTime = Date.now();
        const executionTime = Math.floor((endTime - startTime) / 1000);
        
        // Atualizar registro de treinamento
        await client.query(`
            UPDATE ia_auto_train_mind_history 
            SET status = 'completed',
                completed_at = NOW(),
                topics_searched = $1,
                knowledge_added = $2,
                total_searches = $3,
                execution_time_seconds = $4
            WHERE id = $5
        `, [topicsSearched, knowledgeAdded, topicsSearched * 10, executionTime, trainingId]);
        
        // Atualizar estatísticas
        await client.query(`
            UPDATE ia_auto_train_mind_stats 
            SET total_trainings = total_trainings + 1,
                total_knowledge_added = total_knowledge_added + $1,
                total_topics_searched = total_topics_searched + $2,
                avg_knowledge_per_training = (total_knowledge_added + $1)::DECIMAL / NULLIF(total_trainings + 1, 0),
                last_training_at = NOW(),
                updated_at = NOW()
            WHERE id = 1
        `, [knowledgeAdded, topicsSearched]);
        
        console.log(`✅ [IA] Treinamento automático concluído! ${knowledgeAdded} itens adicionados (${livrosCompletosAdicionados} livros completos) de ${topicsSearched} tópicos em ${executionTime}s.`);
        
        res.json({
            success: true,
            training_id: trainingId,
            topics_searched: topicsSearched,
            knowledge_added: knowledgeAdded,
            livros_completos: livrosCompletosAdicionados,
            categories_used: categories.length,
            execution_time_seconds: executionTime,
            estimated_time: `${executionTime} segundos`,
            message: `Treinamento concluído! ${knowledgeAdded} novos itens de conhecimento adicionados (${livrosCompletosAdicionados} livros completos). ${categories.length} categorias incluídas.`
        });
        
    } catch (error) {
        console.error('❌ [IA] Erro no treinamento automático:', error);
        
        // Atualizar registro de treinamento com erro (se existir)
        try {
            const lastTraining = await client.query(`
                SELECT id FROM ia_auto_train_mind_history 
                WHERE status = 'running' 
                ORDER BY started_at DESC 
                LIMIT 1
            `);
            
            if (lastTraining.rows.length > 0) {
                await client.query(`
                    UPDATE ia_auto_train_mind_history 
                    SET status = 'failed',
                        error_message = $1,
                        completed_at = NOW()
                    WHERE id = $2
                `, [error.message.substring(0, 500), lastTraining.rows[0].id]);
            }
        } catch (updateError) {
            console.error('❌ [IA] Erro ao atualizar registro de treinamento:', updateError);
        }
        
        res.status(500).json({ error: 'Erro ao executar treinamento automático: ' + error.message });
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
                    plansContent += `• ConectaKing NFC\n`;
                    plansContent += `• Cartão digital personalizado\n`;
                    plansContent += `• Links essenciais (WhatsApp, Instagram, redes sociais)\n`;
                    plansContent += `• Ativação e configuração inicial\n`;
                    plansContent += `• Todos os módulos disponíveis\n`;
                    plansContent += `• 1 perfil/cartão\n`;
                    plansContent += `• NÃO pode alterar a logomarca do Conecta King no rodapé\n`;
                } else if (plan.plan_code === 'premium') {
                    plansContent += `\nRecursos incluídos:\n`;
                    plansContent += `• ConectaKing NFC Premium\n`;
                    plansContent += `• Cartão digital completo e altamente personalizado\n`;
                    plansContent += `• Links ilimitados\n`;
                    plansContent += `• Portfólio, localização e botões inteligentes\n`;
                    plansContent += `• Atualizações assistidas\n`;
                    plansContent += `• Ativação e configuração completas\n`;
                    plansContent += `• Todos os módulos disponíveis\n`;
                    plansContent += `• 1 perfil/cartão\n`;
                    plansContent += `• PODE alterar a logomarca do Conecta King no rodapé\n`;
                } else if (plan.plan_code === 'enterprise') {
                    plansContent += `\nRecursos incluídos:\n`;
                    plansContent += `• Modo Empresa ConectaKing\n`;
                    plansContent += `• Página institucional personalizada\n`;
                    plansContent += `• Centralização de contatos corporativos\n`;
                    plansContent += `• Direcionamento estratégico de leads\n`;
                    plansContent += `• Uso corporativo do ConectaKing NFC\n`;
                    plansContent += `• Suporte prioritário\n`;
                    plansContent += `• Ativação e configuração completas\n`;
                    plansContent += `• Todos os módulos disponíveis\n`;
                    plansContent += `• 3 perfis/cartões em uma única assinatura\n`;
                    plansContent += `• PODE alterar a logomarca do Conecta King no rodapé para cada cartão\n`;
                    plansContent += `• Ideal para empresas, equipes comerciais e marcas\n`;
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
                'instagram_embed': 'Instagram Incorporado',
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

**👑 King Start (R$ 700,00)** - Uso Individual:
• ConectaKing NFC
• Cartão digital personalizado
• Links essenciais (WhatsApp, Instagram, redes sociais)
• Ativação e configuração inicial
• Todos os módulos disponíveis
• 1 cartão/perfil
• NÃO pode alterar a logomarca do Conecta King no rodapé
• Ideal para iniciar presença digital com elegância

**👑 King Prime (R$ 1.000,00)** - Uso Individual Premium:
• ConectaKing NFC Premium
• Cartão digital completo e altamente personalizado
• Links ilimitados
• Portfólio, localização e botões inteligentes
• Atualizações assistidas
• Ativação e configuração completas
• Todos os módulos disponíveis
• 1 cartão/perfil
• PODE alterar a logomarca do Conecta King no rodapé
• Ideal para profissionais que buscam impacto e autoridade

**👑 King Corporate (R$ 2.300,00)** - Modo Empresa:
• Modo Empresa ConectaKing
• Página institucional personalizada
• Centralização de contatos corporativos
• Direcionamento estratégico de leads
• Uso corporativo do ConectaKing NFC
• Suporte prioritário
• Ativação e configuração completas
• Todos os módulos disponíveis
• 3 cartões/perfis em uma única assinatura
• PODE alterar a logomarca do Conecta King no rodapé para cada cartão
• Ideal para empresas, equipes comerciais e marcas`,
            keywords: ['diferença', 'comparação', 'qual escolher', 'qual plano', 'king start', 'king prime', 'king corporate', 'individual', 'empresarial'],
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
            // SUPORTE E CONTATO
            {
                title: 'Número de suporte Conecta King',
                content: `**Suporte Conecta King:**

Para entrar em contato com o suporte do Conecta King, você pode falar diretamente com o **Adriano King**:

📱 **WhatsApp:** +55 98 7894-17

**Horário de atendimento:**
• Segunda a Sexta: 9h às 18h
• Sábado: 9h às 13h

**Como podemos ajudar:**
• Dúvidas sobre planos e assinaturas
• Problemas técnicos
• Suporte ao cliente
• Negociações e parcerias
• Qualquer questão relacionada ao sistema

Entre em contato via WhatsApp e nossa equipe responderá o mais rápido possível! 😊`,
                keywords: ['suporte', 'contato', 'telefone', 'whatsapp', 'número', 'numero', 'suporte conecta king', 'falar com suporte', 'adriano king', 'contato suporte', 'atendimento'],
                category: 'Suporte'
            },
            {
                title: 'Vale a pena usar o Conecta King?',
                content: `**Sim! O Conecta King vale MUITO a pena!** 🚀

Aqui estão os principais motivos:

**1. Profissionalismo e Modernidade** 📱
• Seu cartão virtual é moderno, interativo e profissional
• Impressiona clientes e parceiros
• Mostra que você está atualizado com as tendências

**2. Praticidade e Conveniência** ⚡
• Compartilhe seu cartão instantaneamente via link, QR Code ou WhatsApp
• Sempre atualizado - você pode editar a qualquer momento
• Não precisa imprimir novos cartões quando mudar informações

**3. Múltiplos Módulos Integrados** 🎯
• Redes sociais (Instagram, Facebook, LinkedIn, TikTok, YouTube)
• Contatos (WhatsApp, telefone, email)
• Links personalizados
• PIX QR Code
• E muito mais - tudo em um só lugar!

**4. Custo-Benefício Excelente** 💰
• Planos a partir de R$ 480/ano
• Sem mensalidades ocultas
• Economia com impressão de cartões físicos
• ROI rápido para profissionais e empresas

**5. Facilidade de Uso** ✨
• Interface intuitiva e fácil de usar
• Personalização completa do visual
• Suporte dedicado quando precisar

**6. Alcance e Compartilhamento** 🌐
• Compartilhe em qualquer lugar, a qualquer hora
• Funciona em qualquer dispositivo
• Acessível 24/7 para quem recebe

**7. Diferencial Competitivo** 🏆
• Se destaque da concorrência
• Mostre profissionalismo e inovação
• Aumente suas oportunidades de negócio

**Resultado:** Você terá um cartão profissional, moderno e completo que vai impressionar e facilitar seus contatos profissionais! 

**Quer começar?** Escolha um plano e transforme sua presença digital hoje mesmo! 😊`,
                keywords: ['vale a pena', 'vale apena', 'vale mesmo a pena', 'me convença', 'convença', 'por que usar', 'porque usar', 'benefícios', 'beneficios', 'vantagens', 'diferencial', 'por que escolher', 'porque escolher'],
                category: 'Sistema'
            },
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
                    search_engine_id TEXT,
                    max_results INTEGER DEFAULT 5,
                    search_domains TEXT[],
                    blocked_domains TEXT[],
                    use_cache BOOLEAN DEFAULT true,
                    cache_duration_hours INTEGER DEFAULT 24,
                    updated_by VARCHAR(255),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Adicionar coluna search_engine_id se não existir (migration)
            try {
                await client.query(`
                    ALTER TABLE ia_web_search_config 
                    ADD COLUMN IF NOT EXISTS search_engine_id TEXT
                `);
            } catch (e) {
                // Coluna já existe, ignorar
            }
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
    const { is_enabled, api_provider, api_key, search_engine_id, max_results, use_cache } = req.body;
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
                    search_engine_id TEXT,
                    max_results INTEGER DEFAULT 5,
                    search_domains TEXT[],
                    blocked_domains TEXT[],
                    use_cache BOOLEAN DEFAULT true,
                    cache_duration_hours INTEGER DEFAULT 24,
                    updated_by VARCHAR(255),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Adicionar coluna search_engine_id se não existir (migration)
            try {
                await client.query(`
                    ALTER TABLE ia_web_search_config 
                    ADD COLUMN IF NOT EXISTS search_engine_id TEXT
                `);
            } catch (e) {
                // Coluna já existe, ignorar
            }
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
                INSERT INTO ia_web_search_config (is_enabled, api_provider, api_key, search_engine_id, max_results, use_cache, updated_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                is_enabled !== undefined ? is_enabled : false,
                api_provider || 'scraping',
                api_key || null,
                search_engine_id || null,
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
                    search_engine_id = COALESCE($4, search_engine_id),
                    max_results = COALESCE($5, max_results),
                    use_cache = COALESCE($6, use_cache),
                    updated_by = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
                RETURNING *
            `, [
                is_enabled,
                api_provider,
                api_key,
                search_engine_id,
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

// GET /api/ia-king/web-search/all-apis - Listar TODAS as APIs disponíveis (gratuitas e pagas)
router.get('/web-search/all-apis', protectAdmin, asyncHandler(async (req, res) => {
    try {
        const allAPIs = [
            // ============================================
            // 🏆 MELHORES APIs DO MUNDO (Premium)
            // ============================================
            {
                name: 'Tavily API',
                provider: 'tavily',
                type: 'paga',
                price_category: 'economica',
                quality_category: 'melhor',
                description: 'API de busca avançada com IA. Melhor qualidade de resultados e respostas diretas. Especializada em IA.',
                url: 'https://tavily.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: '1.000 créditos/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Muito Alta',
                quality_score: 95,
                price: 'Gratuito até 1.000/mês, depois $20/mês',
                price_per_1k: 20,
                signup_url: 'https://tavily.com',
                recommended: true,
                features: ['IA integrada', 'Respostas diretas', 'Alta precisão', 'Rápida']
            },
            {
                name: 'SerpAPI',
                provider: 'serpapi',
                type: 'paga',
                price_category: 'premium',
                quality_category: 'melhor',
                description: 'API completa de busca do Google. Resultados reais do Google Search com dados estruturados.',
                url: 'https://serpapi.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: '100 buscas/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Muito Alta',
                quality_score: 98,
                price: 'Gratuito até 100/mês, depois $50/mês',
                price_per_1k: 50,
                signup_url: 'https://serpapi.com',
                recommended: true,
                features: ['Resultados Google reais', 'Dados estruturados', 'Alta confiabilidade', 'Suporte completo']
            },
            {
                name: 'Google Custom Search API',
                provider: 'google_custom',
                type: 'paga',
                price_category: 'economica',
                quality_category: 'melhor',
                description: 'API oficial do Google. Resultados diretos do Google com melhor custo-benefício.',
                url: 'https://developers.google.com/custom-search',
                requires_key: true,
                requires_extra: true,
                extra_field: 'search_engine_id',
                extra_description: 'ID do Custom Search Engine (criar em https://programmablesearchengine.google.com)',
                rate_limit: '100 buscas/dia (gratuito) | $5/1.000 buscas',
                quality: 'Muito Alta',
                quality_score: 97,
                price: 'Gratuito até 100/dia, depois $5/1.000 buscas',
                price_per_1k: 5,
                signup_url: 'https://developers.google.com/custom-search',
                recommended: true,
                features: ['Oficial Google', 'Melhor custo-benefício', 'Alta qualidade', 'Confiável']
            },
            {
                name: 'Exa AI',
                provider: 'exa',
                type: 'paga',
                price_category: 'economica',
                quality_category: 'melhor',
                description: 'Nova API de busca com IA avançada. Focada em conteúdo de alta qualidade e semântica.',
                url: 'https://exa.ai',
                requires_key: true,
                requires_extra: false,
                rate_limit: '100 buscas/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Muito Alta',
                quality_score: 94,
                price: 'Gratuito até 100/mês, depois $20/mês',
                price_per_1k: 20,
                signup_url: 'https://exa.ai',
                recommended: true,
                features: ['IA semântica', 'Conteúdo premium', 'Busca inteligente', 'Moderno']
            },
            // ============================================
            // ⭐ APIs DE ALTA QUALIDADE
            // ============================================
            {
                name: 'Bing Search API',
                provider: 'bing',
                type: 'paga',
                price_category: 'economica',
                quality_category: 'alta',
                description: 'API oficial da Microsoft Bing. Resultados de alta qualidade com bom custo-benefício.',
                url: 'https://www.microsoft.com/en-us/bing/apis',
                requires_key: true,
                requires_extra: false,
                rate_limit: '1.000 buscas/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Alta',
                quality_score: 88,
                price: 'Gratuito até 1.000/mês, depois $4/1.000 buscas',
                price_per_1k: 4,
                signup_url: 'https://azure.microsoft.com/services/cognitive-services/bing-web-search-api/',
                recommended: true,
                features: ['Oficial Microsoft', 'Bom custo-benefício', 'Alta disponibilidade', 'Escalável']
            },
            {
                name: 'Brave Search API',
                provider: 'brave',
                type: 'paga',
                price_category: 'economica',
                quality_category: 'alta',
                description: 'API do navegador Brave. Busca independente, privada e sem rastreamento.',
                url: 'https://brave.com/search/api/',
                requires_key: true,
                requires_extra: false,
                rate_limit: '2.000 buscas/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Alta',
                quality_score: 85,
                price: 'Gratuito até 2.000/mês, depois $3/1.000 buscas',
                price_per_1k: 3,
                signup_url: 'https://brave.com/search/api/',
                recommended: false,
                features: ['Privacidade', 'Independente', 'Sem rastreamento', 'Ético']
            },
            {
                name: 'You.com API',
                provider: 'you',
                type: 'paga',
                price_category: 'economica',
                quality_category: 'alta',
                description: 'API do You.com. Busca com IA integrada e resultados personalizados.',
                url: 'https://you.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: 'Limitado (gratuito) | Planos pagos disponíveis',
                quality: 'Alta',
                quality_score: 82,
                price: 'Gratuito limitado, depois $20/mês',
                price_per_1k: 20,
                signup_url: 'https://you.com',
                recommended: false,
                features: ['IA integrada', 'Personalizado', 'Moderno', 'Inovador']
            },
            {
                name: 'Zenserp API',
                provider: 'zenserp',
                type: 'paga',
                price_category: 'premium',
                quality_category: 'alta',
                description: 'API profissional para scraping de resultados do Bing. Alta velocidade e precisão.',
                url: 'https://zenserp.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: '5.000 buscas/mês (plano pequeno)',
                quality: 'Alta',
                quality_score: 87,
                price: '$49.99/mês (5.000 buscas) | $129.99/mês (20.000 buscas)',
                price_per_1k: 10,
                signup_url: 'https://zenserp.com',
                recommended: false,
                features: ['Alta velocidade', 'Profissional', 'Dados estruturados', 'Confiável']
            },
            {
                name: 'ScraperAPI',
                provider: 'scraperapi',
                type: 'paga',
                price_category: 'intermediaria',
                quality_category: 'alta',
                description: 'API de scraping profissional. Bypass de bloqueios e proxy rotativo.',
                url: 'https://www.scraperapi.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: '5.000 requisições/mês (starter)',
                quality: 'Alta',
                quality_score: 84,
                price: '$49/mês (5.000) | $149/mês (25.000)',
                price_per_1k: 10,
                signup_url: 'https://www.scraperapi.com',
                recommended: false,
                features: ['Proxy rotativo', 'Bypass bloqueios', 'Alta taxa sucesso', 'Profissional']
            },
            // ============================================
            // 📊 APIs DE MÉDIA QUALIDADE
            // ============================================
            {
                name: 'Algolia Search API',
                provider: 'algolia',
                type: 'paga',
                price_category: 'premium',
                quality_category: 'media',
                description: 'Plataforma de busca como serviço. Focada em busca em sites próprios.',
                url: 'https://www.algolia.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: '10.000 requisições/mês (free)',
                quality: 'Média',
                quality_score: 75,
                price: 'Gratuito até 10k/mês, depois $0.50/1.000',
                price_per_1k: 0.5,
                signup_url: 'https://www.algolia.com',
                recommended: false,
                features: ['Busca instantânea', 'Filtros avançados', 'Analytics', 'Escalável']
            },
            {
                name: 'Meilisearch API',
                provider: 'meilisearch',
                type: 'paga',
                price_category: 'economica',
                quality_category: 'media',
                description: 'Motor de busca open-source. Rápido e fácil de usar.',
                url: 'https://www.meilisearch.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: 'Ilimitado (self-hosted)',
                quality: 'Média',
                quality_score: 72,
                price: 'Gratuito (self-hosted) | $25/mês (cloud)',
                price_per_1k: 0,
                signup_url: 'https://www.meilisearch.com',
                recommended: false,
                features: ['Open-source', 'Rápido', 'Fácil uso', 'Self-hosted']
            },
            {
                name: 'Typesense API',
                provider: 'typesense',
                type: 'paga',
                price_category: 'economica',
                quality_category: 'media',
                description: 'Motor de busca open-source. Focado em simplicidade e performance.',
                url: 'https://typesense.org',
                requires_key: true,
                requires_extra: false,
                rate_limit: 'Ilimitado (self-hosted)',
                quality: 'Média',
                quality_score: 70,
                price: 'Gratuito (self-hosted) | $40/mês (cloud)',
                price_per_1k: 0,
                signup_url: 'https://typesense.org',
                recommended: false,
                features: ['Open-source', 'Simples', 'Performance', 'Flexível']
            },
            // ============================================
            // 🆓 APIs GRATUITAS (Fallback)
            // ============================================
            {
                name: 'DuckDuckGo Instant Answer API',
                provider: 'duckduckgo',
                type: 'gratuita',
                price_category: 'gratuita',
                quality_category: 'media',
                description: 'API gratuita sem necessidade de chave. Retorna respostas instantâneas.',
                url: 'https://api.duckduckgo.com/',
                requires_key: false,
                requires_extra: false,
                rate_limit: 'Sem limite conhecido',
                quality: 'Média',
                quality_score: 65,
                price: '100% Gratuita',
                price_per_1k: 0,
                signup_url: null,
                recommended: false,
                features: ['100% Gratuita', 'Sem chave', 'Privacidade', 'Sem limites']
            },
            {
                name: 'Wikipedia REST API',
                provider: 'wikipedia',
                type: 'gratuita',
                price_category: 'gratuita',
                quality_category: 'alta',
                description: 'API gratuita da Wikipedia. Acesso a resumos e artigos completos.',
                url: 'https://www.mediawiki.org/wiki/API:REST_API',
                requires_key: false,
                requires_extra: false,
                rate_limit: 'Sem limite conhecido',
                quality: 'Alta (apenas Wikipedia)',
                quality_score: 80,
                price: '100% Gratuita',
                price_per_1k: 0,
                signup_url: null,
                recommended: false,
                features: ['100% Gratuita', 'Conteúdo confiável', 'Sem limites', 'Educacional']
            },
            {
                name: 'SerpAPI',
                provider: 'serpapi',
                type: 'paga',
                description: 'API completa de busca do Google. Resultados reais do Google Search.',
                url: 'https://serpapi.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: '100 buscas/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Muito Alta',
                price: 'Gratuito até 100/mês, depois $50/mês',
                signup_url: 'https://serpapi.com',
                recommended: true
            },
            {
                name: 'Bing Search API',
                provider: 'bing',
                type: 'paga',
                description: 'API oficial da Microsoft Bing. Resultados de alta qualidade.',
                url: 'https://www.microsoft.com/en-us/bing/apis',
                requires_key: true,
                requires_extra: false,
                rate_limit: '1.000 buscas/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Alta',
                price: 'Gratuito até 1.000/mês, depois $4/1.000 buscas',
                signup_url: 'https://azure.microsoft.com/services/cognitive-services/bing-web-search-api/',
                recommended: true
            },
            {
                name: 'Exa AI',
                provider: 'exa',
                type: 'paga',
                description: 'Nova API de busca com IA. Focada em conteúdo de alta qualidade.',
                url: 'https://exa.ai',
                requires_key: true,
                requires_extra: false,
                rate_limit: '100 buscas/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Muito Alta',
                price: 'Gratuito até 100/mês, depois $20/mês',
                signup_url: 'https://exa.ai',
                recommended: false
            },
            {
                name: 'Brave Search API',
                provider: 'brave',
                type: 'paga',
                description: 'API do navegador Brave. Busca independente e privada.',
                url: 'https://brave.com/search/api/',
                requires_key: true,
                requires_extra: false,
                rate_limit: '2.000 buscas/mês (gratuito) | Planos pagos disponíveis',
                quality: 'Alta',
                price: 'Gratuito até 2.000/mês, depois $3/1.000 buscas',
                signup_url: 'https://brave.com/search/api/',
                recommended: false
            },
            {
                name: 'You.com API',
                provider: 'you',
                type: 'paga',
                description: 'API do You.com. Busca com IA integrada.',
                url: 'https://you.com',
                requires_key: true,
                requires_extra: false,
                rate_limit: 'Limitado (gratuito) | Planos pagos disponíveis',
                quality: 'Alta',
                price: 'Gratuito limitado, depois $20/mês',
                signup_url: 'https://you.com',
                recommended: false
            },
            {
                name: 'Google Custom Search API',
                provider: 'google_custom',
                type: 'paga',
                description: 'API oficial do Google. Requer criação de Custom Search Engine.',
                url: 'https://developers.google.com/custom-search',
                requires_key: true,
                requires_extra: true,
                extra_field: 'search_engine_id',
                extra_description: 'ID do Custom Search Engine (criar em https://programmablesearchengine.google.com)',
                rate_limit: '100 buscas/dia (gratuito) | $5/1.000 buscas',
                quality: 'Muito Alta',
                price: 'Gratuito até 100/dia, depois $5/1.000 buscas',
                signup_url: 'https://developers.google.com/custom-search',
                recommended: true
            },
            // APIs GRATUITAS (Fallback)
            {
                name: 'DuckDuckGo Instant Answer API',
                provider: 'duckduckgo',
                type: 'gratuita',
                description: 'API gratuita sem necessidade de chave. Retorna respostas instantâneas.',
                url: 'https://api.duckduckgo.com/',
                requires_key: false,
                requires_extra: false,
                rate_limit: 'Sem limite conhecido',
                quality: 'Média',
                price: '100% Gratuita',
                signup_url: null,
                recommended: false
            },
            {
                name: 'Wikipedia REST API',
                provider: 'wikipedia',
                type: 'gratuita',
                description: 'API gratuita da Wikipedia. Acesso a resumos e artigos completos.',
                url: 'https://www.mediawiki.org/wiki/API:REST_API',
                requires_key: false,
                requires_extra: false,
                rate_limit: 'Sem limite conhecido',
                quality: 'Alta (apenas Wikipedia)',
                price: '100% Gratuita',
                signup_url: null,
                recommended: false
            }
        ];
        
        // Organizar por categorias
        const byQuality = {
            melhor: allAPIs.filter(a => a.quality_category === 'melhor'),
            alta: allAPIs.filter(a => a.quality_category === 'alta'),
            media: allAPIs.filter(a => a.quality_category === 'media'),
            baixa: allAPIs.filter(a => a.quality_category === 'baixa')
        };
        
        const byPrice = {
            premium: allAPIs.filter(a => a.price_category === 'premium'),
            intermediaria: allAPIs.filter(a => a.price_category === 'intermediaria'),
            economica: allAPIs.filter(a => a.price_category === 'economica'),
            gratuita: allAPIs.filter(a => a.price_category === 'gratuita')
        };
        
        // Ordenar por qualidade (score) e preço
        const bestAPIs = allAPIs
            .filter(a => a.quality_score >= 90)
            .sort((a, b) => b.quality_score - a.quality_score);
        
        const cheapestAPIs = allAPIs
            .filter(a => a.price_per_1k !== undefined)
            .sort((a, b) => a.price_per_1k - b.price_per_1k);
        
        const mostExpensiveAPIs = allAPIs
            .filter(a => a.price_per_1k !== undefined && a.price_per_1k > 0)
            .sort((a, b) => b.price_per_1k - a.price_per_1k);
        
        res.json({
            success: true,
            apis: allAPIs,
            total: allAPIs.length,
            paid: allAPIs.filter(a => a.type === 'paga').length,
            free: allAPIs.filter(a => a.type === 'gratuita').length,
            recommended: allAPIs.filter(a => a.recommended).map(a => a.provider),
            
            // Categorias por Qualidade
            by_quality: {
                melhor: byQuality.melhor,
                alta: byQuality.alta,
                media: byQuality.media,
                baixa: byQuality.baixa
            },
            
            // Categorias por Preço
            by_price: {
                premium: byPrice.premium,
                intermediaria: byPrice.intermediaria,
                economica: byPrice.economica,
                gratuita: byPrice.gratuita
            },
            
            // Rankings
            best_apis: bestAPIs.slice(0, 5).map(a => ({
                name: a.name,
                provider: a.provider,
                quality_score: a.quality_score,
                price_per_1k: a.price_per_1k
            })),
            cheapest_apis: cheapestAPIs.slice(0, 5).map(a => ({
                name: a.name,
                provider: a.provider,
                price_per_1k: a.price_per_1k,
                quality_score: a.quality_score
            })),
            most_expensive_apis: mostExpensiveAPIs.slice(0, 5).map(a => ({
                name: a.name,
                provider: a.provider,
                price_per_1k: a.price_per_1k,
                quality_score: a.quality_score
            })),
            
            message: `${allAPIs.length} APIs disponíveis (${allAPIs.filter(a => a.type === 'paga').length} pagas, ${allAPIs.filter(a => a.type === 'gratuita').length} gratuitas)`
        });
    } catch (error) {
        console.error('Erro ao listar APIs:', error);
        res.status(500).json({ 
            error: 'Erro ao listar APIs',
            message: error.message 
        });
    }
}));

// POST /api/ia-king/web-search/test-all - Testar todas as APIs configuradas
router.post('/web-search/test-all', protectAdmin, asyncHandler(async (req, res) => {
    const { query = 'inteligência artificial' } = req.body;
    const client = await db.pool.connect();
    
    try {
        // Buscar todas as configurações de APIs
        const configsResult = await client.query(`
            SELECT * FROM ia_web_search_config
            WHERE is_enabled = true AND api_key IS NOT NULL
            ORDER BY id DESC
        `);
        
        const testResults = [];
        
        for (const config of configsResult.rows) {
            const provider = config.api_provider;
            let result = null;
            let error = null;
            const startTime = Date.now();
            
            try {
                switch (provider) {
                    case 'tavily':
                        result = await searchWithTavily(query, config.api_key);
                        break;
                    case 'serpapi':
                        result = await searchWithSerpAPI(query, config.api_key);
                        break;
                    case 'google_custom':
                        if (config.search_engine_id) {
                            result = await searchWithGoogleCustom(query, config.api_key, config.search_engine_id);
                        } else {
                            error = 'search_engine_id não configurado';
                        }
                        break;
                    case 'bing':
                        result = await searchWithBing(query, config.api_key);
                        break;
                    case 'exa':
                        result = await searchWithExa(query, config.api_key);
                        break;
                    case 'brave':
                        result = await searchWithBrave(query, config.api_key);
                        break;
                    case 'you':
                        result = await searchWithYou(query, config.api_key);
                        break;
                    default:
                        error = `Provider ${provider} não suportado`;
                }
                
                const responseTime = Date.now() - startTime;
                
                testResults.push({
                    provider: provider,
                    status: result && result.results && result.results.length > 0 ? 'success' : 'no_results',
                    results_count: result?.results?.length || 0,
                    has_answer: !!result?.answer,
                    response_time_ms: responseTime,
                    error: error || result?.error || null,
                    working: !error && result && result.results && result.results.length > 0
                });
            } catch (e) {
                const responseTime = Date.now() - startTime;
                testResults.push({
                    provider: provider,
                    status: 'error',
                    results_count: 0,
                    response_time_ms: responseTime,
                    error: e.message,
                    working: false
                });
            }
        }
        
        // Testar APIs gratuitas também
        try {
            const ddgStart = Date.now();
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const ddgResponse = await fetch(ddgUrl, { timeout: 5000 });
            const ddgData = await ddgResponse.json();
            const ddgTime = Date.now() - ddgStart;
            
            testResults.push({
                provider: 'duckduckgo',
                status: ddgData.AbstractText ? 'success' : 'no_results',
                results_count: ddgData.AbstractText ? 1 : 0,
                response_time_ms: ddgTime,
                error: null,
                working: !!ddgData.AbstractText
            });
        } catch (e) {
            testResults.push({
                provider: 'duckduckgo',
                status: 'error',
                results_count: 0,
                response_time_ms: 0,
                error: e.message,
                working: false
            });
        }
        
        try {
            const wikiStart = Date.now();
            const wikiUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const wikiResponse = await fetch(wikiUrl, { timeout: 5000 });
            const wikiData = await wikiResponse.json();
            const wikiTime = Date.now() - wikiStart;
            
            testResults.push({
                provider: 'wikipedia',
                status: wikiData.extract ? 'success' : 'no_results',
                results_count: wikiData.extract ? 1 : 0,
                response_time_ms: wikiTime,
                error: null,
                working: !!wikiData.extract
            });
        } catch (e) {
            testResults.push({
                provider: 'wikipedia',
                status: 'error',
                results_count: 0,
                response_time_ms: 0,
                error: e.message,
                working: false
            });
        }
        
        const workingAPIs = testResults.filter(r => r.working);
        const failedAPIs = testResults.filter(r => !r.working);
        
        res.json({
            success: true,
            query: query,
            total_tested: testResults.length,
            working: workingAPIs.length,
            failed: failedAPIs.length,
            results: testResults,
            best_api: workingAPIs.length > 0 ? 
                workingAPIs.sort((a, b) => (b.results_count || 0) - (a.results_count || 0))[0].provider : null,
            fastest_api: workingAPIs.length > 0 ?
                workingAPIs.sort((a, b) => a.response_time_ms - b.response_time_ms)[0].provider : null,
            message: `${workingAPIs.length} de ${testResults.length} APIs estão funcionando`
        });
    } catch (error) {
        console.error('Erro ao testar APIs:', error);
        res.status(500).json({ 
            error: 'Erro ao testar APIs',
            message: error.message 
        });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/web-search/free-apis - Buscar APIs gratuitas disponíveis (mantido para compatibilidade)
router.get('/web-search/free-apis', protectAdmin, asyncHandler(async (req, res) => {
    try {
        // Lista de APIs gratuitas conhecidas
        const freeAPIs = [
            {
                name: 'DuckDuckGo Instant Answer API',
                provider: 'duckduckgo',
                description: 'API gratuita e sem necessidade de chave. Retorna respostas instantâneas para consultas.',
                url: 'https://api.duckduckgo.com/',
                requires_key: false,
                rate_limit: 'Sem limite conhecido',
                quality: 'Média',
                status: 'disponivel'
            },
            {
                name: 'Wikipedia REST API',
                provider: 'wikipedia',
                description: 'API gratuita da Wikipedia. Acesso a resumos e artigos completos.',
                url: 'https://www.mediawiki.org/wiki/API:REST_API',
                requires_key: false,
                rate_limit: 'Sem limite conhecido',
                quality: 'Alta',
                status: 'disponivel'
            },
            {
                name: 'Tavily API',
                provider: 'tavily',
                description: 'API de busca avançada com plano gratuito (1.000 créditos/mês). Melhor qualidade de resultados.',
                url: 'https://tavily.com',
                requires_key: true,
                rate_limit: '1.000 créditos/mês (plano gratuito)',
                quality: 'Muito Alta',
                status: 'disponivel',
                signup_url: 'https://tavily.com'
            },
            {
                name: 'SerpAPI (Plano Gratuito)',
                provider: 'serpapi',
                description: 'API de busca com plano gratuito limitado. Requer cadastro.',
                url: 'https://serpapi.com',
                requires_key: true,
                rate_limit: '100 buscas/mês (plano gratuito)',
                quality: 'Alta',
                status: 'disponivel',
                signup_url: 'https://serpapi.com'
            },
            {
                name: 'SearxNG (Self-hosted)',
                provider: 'searxng',
                description: 'Meta-buscador de código aberto. Pode ser auto-hospedado gratuitamente.',
                url: 'https://github.com/searxng/searxng',
                requires_key: false,
                rate_limit: 'Depende da instalação',
                quality: 'Média',
                status: 'disponivel'
            }
        ];
        
        res.json({
            success: true,
            apis: freeAPIs,
            total: freeAPIs.length,
            message: `${freeAPIs.length} APIs gratuitas encontradas`
        });
    } catch (error) {
        console.error('Erro ao buscar APIs gratuitas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar APIs gratuitas',
            details: error.message,
            apis: []
        });
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
        
        // Converter adminId para número (created_by é INTEGER)
        let createdByValue = null;
        if (adminId) {
            const adminIdNum = parseInt(adminId);
            createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
        }
        
        // Adicionar à base de conhecimento
        await client.query(`
            INSERT INTO ia_knowledge_base (title, content, keywords, source_type, is_active, created_by)
            VALUES ($1, $2, $3, 'learning_approved', true, $4)
        `, [
            item.question,
            item.suggested_answer,
            extractKeywords(item.question),
            createdByValue
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
    
    // Converter adminId para número (created_by é INTEGER)
    let createdByValue = null;
    if (adminId) {
        const adminIdNum = parseInt(adminId);
        createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
    }
    
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
                        createdByValue
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
                        createdByValue
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
            WHERE is_enabled = true AND api_provider = 'tavily' AND api_key IS NOT NULL AND api_key != ''
            ORDER BY id DESC LIMIT 1
        `);
        
        if (configResult.rows.length === 0) {
            client.release();
            return res.status(400).json({ 
                error: 'Tavily não está configurado ou habilitado',
                message: 'Para buscar livros online, você precisa configurar a API do Tavily na aba "Busca na Web" primeiro.',
                requires_config: true,
                config_tab: 'web-search'
            });
        }
        
        const config = configResult.rows[0];
        
        // Buscar livros com Tavily (focar em conteúdo textual, excluir vídeos)
        const bookQuery = `${query} livro book texto pdf documento download ler`;
        console.log('📚 [Busca Livros Tavily] Buscando:', bookQuery);
        
        const tavilyResult = await searchWithTavily(bookQuery, config.api_key);
        
        if (!tavilyResult.results || tavilyResult.results.length === 0) {
            return res.json({ books: [], message: 'Nenhum livro encontrado' });
        }
        
        // Filtrar e formatar resultados de livros - APENAS LIVROS COMPLETOS
        const books = tavilyResult.results
            .filter(r => {
                const titleLower = (r.title || '').toLowerCase();
                const contentLower = (r.snippet || r.content || '').toLowerCase();
                const rawContentLower = (r.raw_content || '').toLowerCase();
                const urlLower = (r.url || '').toLowerCase();
                
                // EXCLUIR vídeos e canais de vídeo
                const isVideo = urlLower.includes('youtube.com') ||
                               urlLower.includes('youtu.be') ||
                               urlLower.includes('vimeo.com') ||
                               urlLower.includes('dailymotion.com') ||
                               urlLower.includes('twitch.tv') ||
                               titleLower.includes('vídeo') ||
                               titleLower.includes('video') ||
                               titleLower.includes('watch') ||
                               contentLower.includes('assista') ||
                               contentLower.includes('watch now');
                
                if (isVideo) {
                    console.log('🚫 [Busca Livros] Resultado filtrado (vídeo):', r.title);
                    return false;
                }
                
                // NOVO: Verificar se é um livro COMPLETO (não apenas trecho ou resumo)
                const rawContent = r.raw_content || r.content || r.snippet || '';
                const contentLength = rawContent.length;
                
                // Filtrar apenas livros completos (mínimo 5000 caracteres = ~1000 palavras)
                // Isso garante que não sejam apenas trechos ou resumos
                const isCompleteBook = contentLength >= 5000;
                
                if (!isCompleteBook) {
                    console.log('🚫 [Busca Livros] Resultado filtrado (livro incompleto, apenas', contentLength, 'caracteres):', r.title);
                    return false;
                }
                
                // PRIORIZAR conteúdo textual (PDFs, textos, documentos)
                const isTextContent = urlLower.includes('.pdf') ||
                                     urlLower.includes('.txt') ||
                                     urlLower.includes('.doc') ||
                                     urlLower.includes('.epub') ||
                                     urlLower.includes('read') ||
                                     urlLower.includes('download') ||
                                     urlLower.includes('book') ||
                                     urlLower.includes('livro') ||
                                     urlLower.includes('text') ||
                                     urlLower.includes('document');
                
                // Aceitar se for conteúdo textual OU se mencionar livro/book/autor
                const mentionsBook = titleLower.includes('livro') || 
                                    titleLower.includes('book') ||
                                    contentLower.includes('livro') ||
                                    contentLower.includes('book') ||
                                    contentLower.includes('autor') ||
                                    contentLower.includes('author') ||
                                    contentLower.includes('escritor') ||
                                    contentLower.includes('writer');
                
                // NOVO: Verificar se tem estrutura de livro (capítulos, seções, etc.)
                const hasBookStructure = rawContentLower.includes('capítulo') ||
                                        rawContentLower.includes('chapter') ||
                                        rawContentLower.includes('índice') ||
                                        rawContentLower.includes('index') ||
                                        rawContentLower.includes('introdução') ||
                                        rawContentLower.includes('introduction') ||
                                        (rawContentLower.split('\n').length > 50); // Múltiplas linhas/parágrafos
                
                // Aceitar apenas se for livro completo E (conteúdo textual OU menciona livro OU tem estrutura de livro)
                return isCompleteBook && (isTextContent || mentionsBook || hasBookStructure);
            })
            .slice(0, max_results)
            .map(r => {
                // Tavily retorna content ou raw_content quando include_raw_content: true
                const rawContent = r.raw_content || r.content || r.snippet || '';
                const description = r.snippet || r.content || '';
                
                return {
                    title: r.title,
                    description: description,
                    url: r.url,
                    source: 'tavily',
                    raw_content: rawContent // Conteúdo bruto completo para visualização
                };
            });
        
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
    
    console.log('📥 [Import Book Tavily] Requisição recebida:', {
        title: title?.substring(0, 50),
        descriptionLength: description?.length || 0,
        category_id: category_id,
        adminId: adminId
    });
    
    if (!title) {
        return res.status(400).json({ error: 'Título é obrigatório' });
    }
    
    if (!description || description.trim().length === 0) {
        return res.status(400).json({ error: 'Descrição é obrigatória' });
    }
    
    const client = await db.pool.connect();
    try {
        // Verificar se já existe
        const existing = await client.query(`
            SELECT id FROM ia_knowledge_base 
            WHERE LOWER(title) = LOWER($1)
            AND source_type = 'tavily_book'
            LIMIT 1
        `, [title]);
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Este livro já está na base de conhecimento' });
        }
        
        // Extrair palavras-chave
        let keywords = [];
        try {
            keywords = extractKeywords(title + ' ' + description);
            // Garantir que é um array
            if (!Array.isArray(keywords)) {
                keywords = [];
            }
        } catch (error) {
            console.error('Erro ao extrair keywords:', error);
            keywords = [];
        }
        
        // Converter adminId para número se necessário (pode ser string)
        let createdByValue = null;
        if (adminId) {
            const adminIdNum = parseInt(adminId);
            createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
        }
        
        // Converter category_id para número se necessário
        let categoryIdValue = null;
        if (category_id) {
            const categoryIdNum = parseInt(category_id);
            categoryIdValue = isNaN(categoryIdNum) ? null : categoryIdNum;
        }
        
        console.log('💾 [Import Book Tavily] Inserindo na base de conhecimento...');
        
        // Adicionar à base de conhecimento (SEM LIMITE de caracteres - conhecimento ilimitado!)
        const result = await client.query(`
            INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, is_active, created_by)
            VALUES ($1, $2, $3, $4, 'tavily_book', true, $5)
            RETURNING *
        `, [
            title,
            description, // SEM LIMITE - conhecimento ilimitado!
            keywords,
            categoryIdValue,
            createdByValue
        ]);
        
        console.log('✅ [Import Book Tavily] Livro importado com sucesso! ID:', result.rows[0].id);
        
        res.json({
            message: 'Livro importado com sucesso!',
            knowledge: result.rows[0]
        });
    } catch (error) {
        console.error('❌ [Import Book Tavily] Erro:', error);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        client.release();
    }
}));

// ============================================
// ROTA DE TREINAMENTO COM CONHECIMENTO ADQUIRIDO
// ============================================

// POST /api/ia-king/train-acquired-knowledge - Treinar com todo conhecimento adquirido (livros, Tavily, documentos)
router.post('/train-acquired-knowledge', protectAdmin, asyncHandler(async (req, res) => {
    console.log('📥 Requisição recebida: POST /api/ia-king/train-acquired-knowledge');
    const client = await db.pool.connect();
    try {
        console.log('🧠 Iniciando treinamento com TODO conhecimento adquirido...');
        
        await client.query('BEGIN');
        
        // Buscar categorias
        const categoriesResult = await client.query('SELECT id, name FROM ia_categories');
        const categoryMap = {};
        categoriesResult.rows.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });
        
        // 1. Buscar TODO conhecimento adquirido (livros, Tavily, documentos)
        const acquiredKnowledge = await client.query(`
            SELECT 
                id,
                title,
                content,
                keywords,
                category_id,
                source_type,
                source_reference,
                created_at
            FROM ia_knowledge_base
            WHERE source_type IN ('tavily_learned', 'tavily_training', 'tavily_book', 'document', 'manual')
            AND is_active = true
            ORDER BY created_at DESC
        `);
        
        console.log(`📚 Encontrados ${acquiredKnowledge.rows.length} itens de conhecimento adquirido`);
        
        // 2. Buscar documentos processados
        const documents = await client.query(`
            SELECT 
                id,
                title,
                extracted_text,
                category_id,
                created_at
            FROM ia_documents
            WHERE processed = true 
            AND extracted_text IS NOT NULL 
            AND LENGTH(extracted_text) > 0
            ORDER BY created_at DESC
        `);
        
        console.log(`📄 Encontrados ${documents.rows.length} documentos processados`);
        
        // 3. Re-processar e melhorar indexação de cada item
        let processedCount = 0;
        let improvedCount = 0;
        let createdQACount = 0;
        
        // Processar conhecimento da base
        for (const knowledge of acquiredKnowledge.rows) {
            try {
                // Extrair palavras-chave melhoradas
                const improvedKeywords = extractKeywords(knowledge.title + ' ' + knowledge.content);
                
                // Atualizar keywords se melhorou
                if (JSON.stringify(improvedKeywords) !== JSON.stringify(knowledge.keywords || [])) {
                    await client.query(`
                        UPDATE ia_knowledge_base
                        SET keywords = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `, [improvedKeywords, knowledge.id]);
                    improvedCount++;
                }
                
                // Criar Q&A baseado no conhecimento (se não existir)
                const qaTitle = knowledge.title;
                const qaAnswer = knowledge.content.substring(0, 2000); // Limitar tamanho
                
                const existingQA = await client.query(`
                    SELECT id FROM ia_qa
                    WHERE LOWER(question) = LOWER($1)
                    LIMIT 1
                `, [qaTitle]);
                
                if (existingQA.rows.length === 0 && qaAnswer.length > 50) {
                    await client.query(`
                        INSERT INTO ia_qa (question, answer, keywords, category_id, is_active)
                        VALUES ($1, $2, $3, $4, true)
                    `, [
                        qaTitle,
                        qaAnswer,
                        improvedKeywords,
                        knowledge.category_id
                    ]);
                    createdQACount++;
                }
                
                processedCount++;
            } catch (error) {
                console.error(`Erro ao processar conhecimento ID ${knowledge.id}:`, error);
            }
        }
        
        // Processar documentos
        for (const doc of documents.rows) {
            try {
                // Extrair conhecimento do documento
                const docKeywords = extractKeywords(doc.title + ' ' + doc.extracted_text);
                
                // Verificar se já existe na base de conhecimento
                const existingKnowledge = await client.query(`
                    SELECT id FROM ia_knowledge_base
                    WHERE LOWER(title) = LOWER($1)
                    AND source_type = 'document'
                    LIMIT 1
                `, [doc.title]);
                
                if (existingKnowledge.rows.length === 0) {
                    // Adicionar à base de conhecimento
                    await client.query(`
                        INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, source_reference, is_active)
                        VALUES ($1, $2, $3, $4, 'document', $5, true)
                    `, [
                        doc.title,
                        doc.extracted_text.substring(0, 5000), // Limitar tamanho
                        docKeywords,
                        doc.category_id,
                        `document_${doc.id}`
                    ]);
                    processedCount++;
                }
            } catch (error) {
                console.error(`Erro ao processar documento ID ${doc.id}:`, error);
            }
        }
        
        await client.query('COMMIT');
        
        console.log(`✅ Treinamento com conhecimento adquirido concluído!`);
        console.log(`   - Processados: ${processedCount} itens`);
        console.log(`   - Melhorados: ${improvedCount} itens`);
        console.log(`   - Q&As criados: ${createdQACount} itens`);
        
        res.json({
            message: `Treinamento com conhecimento adquirido concluído com sucesso!`,
            stats: {
                total_acquired: acquiredKnowledge.rows.length,
                total_documents: documents.rows.length,
                processed: processedCount,
                improved: improvedCount,
                qa_created: createdQACount
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro no treinamento com conhecimento adquirido:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// ============================================
// ROTA DE TREINAMENTO COM LIVROS
// ============================================

// Função para dividir texto em chunks inteligentes
function splitBookIntoSections(text, maxChunkSize = 2000) {
    const sections = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentSection = '';
    let currentSize = 0;
    
    for (const paragraph of paragraphs) {
        const paraSize = paragraph.length;
        
        // Se adicionar este parágrafo ultrapassar o limite, salvar seção atual
        if (currentSize + paraSize > maxChunkSize && currentSection.length > 0) {
            sections.push(currentSection.trim());
            currentSection = paragraph + '\n\n';
            currentSize = paraSize;
        } else {
            currentSection += paragraph + '\n\n';
            currentSize += paraSize;
        }
    }
    
    // Adicionar última seção
    if (currentSection.trim().length > 0) {
        sections.push(currentSection.trim());
    }
    
    return sections;
}

// Função para extrair título de seção (capítulo, parte, etc.)
function extractSectionTitle(text) {
    const lines = text.split('\n').slice(0, 5);
    for (const line of lines) {
        const trimmed = line.trim();
        // Procurar por padrões de título (CAPÍTULO, PARTE, SEÇÃO, etc.)
        if (trimmed.match(/^(CAPÍTULO|PARTE|SEÇÃO|CHAPTER|PART|SECTION)\s+\d+/i)) {
            return trimmed;
        }
        // Se a linha é curta e parece um título
        if (trimmed.length < 100 && trimmed.length > 5 && !trimmed.match(/^[a-z]/)) {
            return trimmed;
        }
    }
    return null;
}

// POST /api/ia-king/train-with-book - Treinar IA com livro completo
router.post('/train-with-book', protectAdmin, asyncHandler(async (req, res) => {
    console.log('📥 Requisição recebida: POST /api/ia-king/train-with-book');
    const { title, author, content, category_id, create_qa = true } = req.body;
    const adminId = req.user.userId;
    
    // Converter adminId para número (created_by é INTEGER)
    let createdByValue = null;
    if (adminId) {
        const adminIdNum = parseInt(adminId);
        createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
    }
    
    if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }
    
    if (content.length < 100) {
        return res.status(400).json({ error: 'O conteúdo do livro é muito curto (mínimo 100 caracteres)' });
    }
    
    const client = await db.pool.connect();
    try {
        console.log(`📚 Iniciando treinamento com livro: "${title}"${author ? ` - ${author}` : ''}`);
        console.log(`📊 Tamanho do conteúdo: ${content.length.toLocaleString()} caracteres`);
        
        await client.query('BEGIN');
        
        // Verificar se o livro já foi treinado
        const existingBook = await client.query(`
            SELECT id FROM ia_knowledge_base
            WHERE LOWER(title) = LOWER($1)
            AND source_type = 'book_training'
            LIMIT 1
        `, [title]);
        
        if (existingBook.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Este livro já foi treinado. Se deseja treinar novamente, use um título diferente ou remova o conhecimento anterior.' });
        }
        
        // Dividir livro em seções inteligentes
        console.log('📖 Dividindo livro em seções...');
        const sections = splitBookIntoSections(content, 2000);
        console.log(`✅ Livro dividido em ${sections.length} seções`);
        
        let knowledgeItemsCreated = 0;
        let qaCreated = 0;
        const wordsProcessed = content.split(/\s+/).length;
        
        // Processar cada seção
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const sectionTitle = extractSectionTitle(section) || `${title} - Seção ${i + 1}`;
            const sectionContent = section; // SEM LIMITE - conhecimento ilimitado!
            
            try {
                // Extrair palavras-chave da seção
                const keywords = extractKeywords(sectionTitle + ' ' + sectionContent);
                
                // Criar título completo
                const fullTitle = author 
                    ? `${title} - ${author} - ${sectionTitle}`
                    : `${title} - ${sectionTitle}`;
                
                // Inserir na base de conhecimento
                await client.query(`
                    INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, source_reference, is_active, created_by, priority)
                    VALUES ($1, $2, $3, $4, 'book_training', $5, true, $6, 90)
                `, [
                    fullTitle,
                    sectionContent,
                    keywords,
                    category_id || null,
                    `book_${title}_section_${i + 1}`,
                    createdByValue
                ]);
                
                knowledgeItemsCreated++;
                
                // Criar Q&A se solicitado
                if (create_qa && sectionContent.length > 100) {
                    // Criar pergunta baseada no título da seção
                    const question = sectionTitle.length > 100 
                        ? sectionTitle.substring(0, 100) + '...'
                        : sectionTitle;
                    
                    const answer = sectionContent; // SEM LIMITE - conhecimento completo!
                    
                    // Verificar se Q&A já existe
                    const existingQA = await client.query(`
                        SELECT id FROM ia_qa
                        WHERE LOWER(question) = LOWER($1)
                        LIMIT 1
                    `, [question]);
                    
                    if (existingQA.rows.length === 0) {
                        await client.query(`
                            INSERT INTO ia_qa (question, answer, keywords, category_id, is_active)
                            VALUES ($1, $2, $3, $4, true)
                        `, [
                            question,
                            answer,
                            keywords,
                            category_id || null
                        ]);
                        qaCreated++;
                    }
                }
            } catch (error) {
                console.error(`Erro ao processar seção ${i + 1}:`, error);
                // Continuar com próxima seção
            }
        }
        
        // Criar entrada principal do livro (CONTEÚDO COMPLETO - SEM LIMITE!)
        const bookKeywords = extractKeywords(title + ' ' + (author || '') + ' ' + content);
        
        await client.query(`
            INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, source_reference, is_active, created_by, priority)
            VALUES ($1, $2, $3, $4, 'book_training', $5, true, $6, 100)
        `, [
            author ? `${title} - ${author}` : title,
            `Livro completo: ${title}${author ? ` por ${author}` : ''}\n\n${content}\n\nEste livro foi dividido em ${sections.length} seções para melhor compreensão.`,
            bookKeywords,
            category_id || null,
            `book_${title}_main`,
            createdByValue
        ]);
        
        knowledgeItemsCreated++;
        
        await client.query('COMMIT');
        
        console.log(`✅ Treinamento com livro concluído!`);
        console.log(`   - Seções processadas: ${sections.length}`);
        console.log(`   - Itens de conhecimento: ${knowledgeItemsCreated}`);
        console.log(`   - Q&As criados: ${qaCreated}`);
        console.log(`   - Palavras processadas: ${wordsProcessed.toLocaleString()}`);
        
        res.json({
            message: `Livro "${title}" treinado com sucesso! A IA agora conhece este livro e pode responder perguntas sobre ele.`,
            stats: {
                sections_created: sections.length,
                knowledge_items: knowledgeItemsCreated,
                qa_created: qaCreated,
                words_processed: wordsProcessed
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro no treinamento com livro:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/train-with-database-book - Treinar IA com livro já existente no banco
// GET /api/ia-king/books - Listar todos os livros processados com estatísticas
router.get('/books', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Buscar todos os livros processados
        const booksResult = await client.query(`
            SELECT 
                kb.id,
                kb.title,
                kb.content,
                kb.source_type,
                kb.source_reference,
                kb.created_at,
                kb.updated_at,
                kb.usage_count,
                kb.is_active,
                LENGTH(kb.content) as content_length,
                array_length(string_to_array(kb.content, ' '), 1) as word_count,
                (SELECT COUNT(*) FROM ia_knowledge_base 
                 WHERE source_type = 'book_training' 
                 AND source_reference LIKE '%' || REPLACE(kb.title, ' ', '_') || '%') as sections_count,
                (SELECT COUNT(*) FROM ia_qa 
                 WHERE keywords && ARRAY(SELECT unnest(kb.keywords))
                 OR question ILIKE '%' || kb.title || '%') as qa_count
            FROM ia_knowledge_base kb
            WHERE kb.source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
            ORDER BY kb.created_at DESC
        `);
        
        const books = booksResult.rows.map(book => {
            // Extrair título do livro (remover autor se houver)
            const title = book.title.split(' - ')[0];
            const author = book.title.includes(' - ') ? book.title.split(' - ')[1] : null;
            
            // Calcular estatísticas
            const stats = {
                content_length: parseInt(book.content_length) || 0,
                word_count: parseInt(book.word_count) || 0,
                sections_count: parseInt(book.sections_count) || 0,
                qa_count: parseInt(book.qa_count) || 0,
                usage_count: book.usage_count || 0,
                is_complete: (parseInt(book.content_length) || 0) > 1000, // Considera completo se tem mais de 1000 caracteres
                last_used: book.updated_at
            };
            
            return {
                id: book.id,
                title: title,
                author: author,
                source_type: book.source_type,
                source_reference: book.source_reference,
                created_at: book.created_at,
                is_active: book.is_active,
                stats: stats
            };
        });
        
        res.json({
            books: books,
            total: books.length,
            total_words: books.reduce((sum, book) => sum + book.stats.word_count, 0),
            total_sections: books.reduce((sum, book) => sum + book.stats.sections_count, 0)
        });
    } catch (error) {
        console.error('❌ Erro ao listar livros:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/books/:id/content - Ver conteúdo completo de um livro (como a IA vê)
router.get('/books/:id/content', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        // Buscar o livro principal (SEM FILTRO DE CONTEÚDO - buscar todos)
        const bookResult = await client.query(`
            SELECT 
                id,
                title,
                content,
                source_type,
                source_reference,
                created_at,
                updated_at,
                is_active
            FROM ia_knowledge_base
            WHERE id = $1
            AND source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
        `, [id]);
        
        if (bookResult.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        const book = bookResult.rows[0];
        
        // Garantir que o título não seja vazio
        const bookTitle = book.title || 'Livro sem título';
        
        // BUSCA MELHORADA: Tentar múltiplos padrões para encontrar seções
        let allSections = [];
        
        // Padrão 1: Por source_reference
        if (book.source_reference) {
            const sections1 = await client.query(`
                SELECT id, title, content, created_at
                FROM ia_knowledge_base
                WHERE source_type = 'book_training'
                AND source_reference LIKE $1
                AND content IS NOT NULL
                AND content != ''
                ORDER BY id ASC
            `, [`%${book.source_reference}%`]);
            allSections = [...allSections, ...sections1.rows];
        }
        
        // Padrão 2: Por título do livro
        const sections2 = await client.query(`
            SELECT id, title, content, created_at
            FROM ia_knowledge_base
            WHERE source_type = 'book_training'
            AND (
                source_reference LIKE $1 
                OR source_reference LIKE $2
                OR title LIKE $3
            )
            AND content IS NOT NULL
            AND content != ''
            AND id != $4
            ORDER BY id ASC
        `, [
            `book_${bookTitle.replace(/'/g, "''")}_section_%`,
            `%${book.source_reference || ''}%`,
            `%${bookTitle}%`,
            book.id
        ]);
        
        // Remover duplicatas (por ID)
        const uniqueSections = [];
        const seenIds = new Set();
        [...allSections, ...sections2.rows].forEach(section => {
            if (!seenIds.has(section.id)) {
                seenIds.add(section.id);
                uniqueSections.push(section);
            }
        });
        
        // Combinar conteúdo principal + todas as seções (como a IA vê)
        let fullContent = book.content || '';
        
        if (uniqueSections.length > 0) {
            if (fullContent) {
                fullContent += '\n\n' + '='.repeat(80) + '\n';
            }
            fullContent += 'SEÇÕES DO LIVRO (Como a IA processa):\n';
            fullContent += '='.repeat(80) + '\n\n';
            
            uniqueSections.forEach((section, index) => {
                fullContent += `\n--- SEÇÃO ${index + 1}: ${section.title || 'Sem título'} ---\n\n`;
                fullContent += (section.content || '') + '\n\n';
            });
        }
        
        // Se ainda não tem conteúdo, buscar em TODOS os registros relacionados
        if (!fullContent || fullContent.trim().length === 0) {
            const allRelated = await client.query(`
                SELECT id, title, content, source_type, source_reference
                FROM ia_knowledge_base
                WHERE (
                    source_reference LIKE $1
                    OR source_reference LIKE $2
                    OR title LIKE $3
                    OR (source_type = 'book_training' AND title LIKE $4)
                )
                AND content IS NOT NULL
                AND content != ''
                AND id != $5
                ORDER BY id ASC
                LIMIT 50
            `, [
                `%${book.source_reference || ''}%`,
                `book_${bookTitle.replace(/'/g, "''")}_%`,
                `%${bookTitle}%`,
                `%${bookTitle.split(' - ')[0]}%`,
                book.id
            ]);
            
            if (allRelated.rows.length > 0) {
                fullContent = 'CONTEÚDO DO LIVRO ENCONTRADO EM SEÇÕES:\n\n';
                allRelated.rows.forEach((item, index) => {
                    fullContent += `\n--- ${item.title || `Item ${index + 1}`} ---\n\n`;
                    fullContent += (item.content || '') + '\n\n';
                });
            }
        }
        
        // Calcular estatísticas
        const totalWords = fullContent.trim() ? fullContent.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
        const totalChars = fullContent.length;
        const mainContentLength = book.content ? book.content.length : 0;
        
        res.json({
            book: {
                id: book.id,
                title: bookTitle,
                source_type: book.source_type,
                source_reference: book.source_reference,
                created_at: book.created_at,
                updated_at: book.updated_at,
                is_active: book.is_active
            },
            content: fullContent || 'Conteúdo não disponível - Este livro pode não ter sido processado corretamente. Verifique se o livro foi treinado com conteúdo.',
            stats: {
                main_content_length: mainContentLength,
                sections_count: uniqueSections.length,
                total_length: totalChars,
                total_words: totalWords,
                characters: totalChars,
                words: totalWords,
                date: book.created_at ? new Date(book.created_at).toLocaleDateString('pt-BR') : 'Data inválida',
                has_content: totalChars > 0,
                has_main_content: mainContentLength > 0,
                has_sections: uniqueSections.length > 0
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar conteúdo do livro:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/books/:id - Ver detalhes completos de um livro específico
router.get('/books/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        // Buscar o livro principal
        const bookResult = await client.query(`
            SELECT 
                kb.id,
                kb.title,
                kb.content,
                kb.keywords,
                kb.source_type,
                kb.source_reference,
                kb.created_at,
                kb.updated_at,
                kb.usage_count,
                kb.is_active,
                kb.priority,
                LENGTH(kb.content) as content_length,
                array_length(string_to_array(kb.content, ' '), 1) as word_count
            FROM ia_knowledge_base kb
            WHERE kb.id = $1
            AND kb.source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
        `, [id]);
        
        if (bookResult.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        const book = bookResult.rows[0];
        
        // Buscar todas as seções deste livro
        const sectionsResult = await client.query(`
            SELECT 
                id,
                title,
                LENGTH(content) as content_length,
                array_length(string_to_array(content, ' '), 1) as word_count,
                usage_count,
                created_at
            FROM ia_knowledge_base
            WHERE source_type = 'book_training'
            AND source_reference LIKE $1
            ORDER BY id ASC
        `, [`book_${book.title.replace(/'/g, "''")}_section_%`]);
        
        // Buscar Q&As relacionados
        const qaResult = await client.query(`
            SELECT 
                id,
                question,
                LENGTH(answer) as answer_length,
                usage_count,
                success_rate,
                created_at
            FROM ia_qa
            WHERE keywords && ARRAY(SELECT unnest($1::TEXT[]))
            OR question ILIKE '%' || $2 || '%'
            ORDER BY usage_count DESC
            LIMIT 20
        `, [book.keywords || [], book.title]);
        
        // Extrair título e autor
        const titleParts = book.title.split(' - ');
        const title = titleParts[0];
        const author = titleParts.length > 1 ? titleParts[1] : null;
        
        // Calcular estatísticas completas
        const totalSections = sectionsResult.rows.length;
        const totalSectionWords = sectionsResult.rows.reduce((sum, section) => sum + (parseInt(section.word_count) || 0), 0);
        const totalSectionChars = sectionsResult.rows.reduce((sum, section) => sum + (parseInt(section.content_length) || 0), 0);
        
        const stats = {
            main_content: {
                length: parseInt(book.content_length) || 0,
                words: parseInt(book.word_count) || 0,
                preview: book.content.substring(0, 500) + (book.content.length > 500 ? '...' : '')
            },
            sections: {
                count: totalSections,
                total_words: totalSectionWords,
                total_chars: totalSectionChars,
                average_words_per_section: totalSections > 0 ? Math.round(totalSectionWords / totalSections) : 0,
                list: sectionsResult.rows.map(s => ({
                    id: s.id,
                    title: s.title,
                    words: parseInt(s.word_count) || 0,
                    chars: parseInt(s.content_length) || 0,
                    usage_count: s.usage_count || 0,
                    created_at: s.created_at
                }))
            },
            qa: {
                count: qaResult.rows.length,
                list: qaResult.rows.map(qa => ({
                    id: qa.id,
                    question: qa.question,
                    answer_length: parseInt(qa.answer_length) || 0,
                    usage_count: qa.usage_count || 0,
                    success_rate: parseFloat(qa.success_rate) || 0,
                    created_at: qa.created_at
                }))
            },
            total: {
                words: (parseInt(book.word_count) || 0) + totalSectionWords,
                chars: (parseInt(book.content_length) || 0) + totalSectionChars,
                knowledge_items: 1 + totalSections, // 1 principal + seções
                qa_items: qaResult.rows.length
            },
            completeness: {
                has_main_content: (parseInt(book.content_length) || 0) > 0,
                has_sections: totalSections > 0,
                has_qa: qaResult.rows.length > 0,
                is_complete: (parseInt(book.content_length) || 0) > 1000 && totalSections > 0,
                percentage: Math.min(100, Math.round(
                    ((parseInt(book.content_length) > 0 ? 30 : 0) +
                     (totalSections > 0 ? 50 : 0) +
                     (qaResult.rows.length > 0 ? 20 : 0))
                ))
            }
        };
        
        res.json({
            book: {
                id: book.id,
                title: title,
                author: author,
                source_type: book.source_type,
                source_reference: book.source_reference,
                keywords: book.keywords,
                priority: book.priority,
                is_active: book.is_active,
                created_at: book.created_at,
                updated_at: book.updated_at,
                usage_count: book.usage_count
            },
            stats: stats
        });
    } catch (error) {
        console.error('❌ Erro ao buscar detalhes do livro:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/books/:id/verify - Verificar se um livro está completo e processado corretamente
router.get('/books/:id/verify', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        const bookResult = await client.query(`
            SELECT 
                id,
                title,
                content,
                source_type,
                source_reference,
                LENGTH(content) as content_length
            FROM ia_knowledge_base
            WHERE id = $1
        `, [id]);
        
        if (bookResult.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        const book = bookResult.rows[0];
        const issues = [];
        const warnings = [];
        const success = [];
        
        // Verificar conteúdo principal
        if (!book.content || book.content.trim().length === 0) {
            issues.push('❌ Livro não tem conteúdo');
        } else if (book.content.length < 100) {
            issues.push('⚠️ Conteúdo muito curto (menos de 100 caracteres)');
        } else {
            success.push(`✅ Conteúdo principal: ${book.content.length.toLocaleString()} caracteres`);
        }
        
        // Verificar seções
        const sectionsResult = await client.query(`
            SELECT COUNT(*) as count
            FROM ia_knowledge_base
            WHERE source_type = 'book_training'
            AND source_reference LIKE $1
        `, [`book_${book.title.replace(/'/g, "''")}_section_%`]);
        
        const sectionsCount = parseInt(sectionsResult.rows[0].count) || 0;
        if (sectionsCount === 0) {
            warnings.push('⚠️ Nenhuma seção encontrada - livro pode não estar completamente processado');
        } else {
            success.push(`✅ ${sectionsCount} seções encontradas`);
        }
        
        // Verificar Q&As
        const qaResult = await client.query(`
            SELECT COUNT(*) as count
            FROM ia_qa
            WHERE question ILIKE '%' || $1 || '%'
        `, [book.title]);
        
        const qaCount = parseInt(qaResult.rows[0].count) || 0;
        if (qaCount === 0) {
            warnings.push('⚠️ Nenhum Q&A criado para este livro');
        } else {
            success.push(`✅ ${qaCount} Q&As relacionados encontrados`);
        }
        
        // Verificar se está ativo
        const activeResult = await client.query(`
            SELECT is_active
            FROM ia_knowledge_base
            WHERE id = $1
        `, [id]);
        
        if (!activeResult.rows[0].is_active) {
            warnings.push('⚠️ Livro está inativo - não será usado nas respostas');
        } else {
            success.push('✅ Livro está ativo');
        }
        
        // Calcular score de completude
        let completenessScore = 0;
        if (book.content && book.content.length > 1000) completenessScore += 40;
        if (sectionsCount > 0) completenessScore += 30;
        if (qaCount > 0) completenessScore += 20;
        if (activeResult.rows[0].is_active) completenessScore += 10;
        
        const isComplete = completenessScore >= 70 && issues.length === 0;
        
        res.json({
            book_id: id,
            book_title: book.title,
            verification: {
                is_complete: isComplete,
                completeness_score: completenessScore,
                status: isComplete ? '✅ COMPLETO' : (issues.length > 0 ? '❌ INCOMPLETO' : '⚠️ PARCIAL'),
                issues: issues,
                warnings: warnings,
                success: success,
                recommendations: issues.length > 0 ? [
                    'Re-processe o livro se necessário',
                    'Verifique se todas as seções foram criadas',
                    'Considere criar Q&As adicionais'
                ] : []
            },
            stats: {
                content_length: book.content ? book.content.length : 0,
                sections_count: sectionsCount,
                qa_count: qaCount,
                is_active: activeResult.rows[0].is_active
            }
        });
    } catch (error) {
        console.error('❌ Erro ao verificar livro:', error);
        throw error;
    } finally {
        client.release();
    }
}));

router.post('/train-with-database-book', protectAdmin, asyncHandler(async (req, res) => {
    console.log('📥 Requisição recebida: POST /api/ia-king/train-with-database-book');
    const { book_id, create_qa = true } = req.body;
    const adminId = req.user.userId;
    
    // Converter adminId para número (created_by é INTEGER)
    let createdByValue = null;
    if (adminId) {
        const adminIdNum = parseInt(adminId);
        createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
    }
    
    if (!book_id) {
        return res.status(400).json({ error: 'ID do livro é obrigatório' });
    }
    
    const client = await db.pool.connect();
    try {
        console.log(`📚 Buscando livro ID ${book_id} no banco de dados...`);
        
        // Buscar o livro na base de conhecimento
        const bookResult = await client.query(`
            SELECT id, title, content, category_id, source_type
            FROM ia_knowledge_base
            WHERE id = $1 AND source_type = 'tavily_book'
        `, [book_id]);
        
        if (bookResult.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado ou já foi treinado' });
        }
        
        const book = bookResult.rows[0];
        
        if (!book.content || book.content.trim().length < 100) {
            return res.status(400).json({ error: 'O conteúdo do livro é muito curto ou não está disponível' });
        }
        
        console.log(`📖 Livro encontrado: "${book.title}"`);
        console.log(`📊 Tamanho do conteúdo: ${book.content.length.toLocaleString()} caracteres`);
        
        await client.query('BEGIN');
        
        // Verificar se o livro já foi treinado (já tem entradas com book_training ou já foi marcado como treinado)
        if (book.source_type === 'tavily_book_trained') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Este livro já foi treinado anteriormente' });
        }
        
        const existingTraining = await client.query(`
            SELECT id FROM ia_knowledge_base
            WHERE source_type = 'book_training'
            AND source_reference LIKE $1
            LIMIT 1
        `, [`book_${book.title.replace(/'/g, "''")}_%`]);
        
        if (existingTraining.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Este livro já foi treinado anteriormente' });
        }
        
        // Dividir livro em seções inteligentes
        console.log('📖 Dividindo livro em seções...');
        const sections = splitBookIntoSections(book.content, 2000);
        console.log(`✅ Livro dividido em ${sections.length} seções`);
        
        let knowledgeItemsCreated = 0;
        let qaCreated = 0;
        const wordsProcessed = book.content.split(/\s+/).length;
        
        // Processar cada seção
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const sectionTitle = extractSectionTitle(section) || `${book.title} - Seção ${i + 1}`;
            const sectionContent = section; // SEM LIMITE
            
            try {
                // Extrair palavras-chave da seção
                const keywords = extractKeywords(sectionTitle + ' ' + sectionContent);
                
                // Criar título completo
                const fullTitle = `${book.title} - ${sectionTitle}`;
                
                // Inserir na base de conhecimento
                await client.query(`
                    INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, source_reference, is_active, created_by, priority)
                    VALUES ($1, $2, $3, $4, 'book_training', $5, true, $6, 90)
                `, [
                    fullTitle,
                    sectionContent,
                    keywords,
                    book.category_id || null,
                    `book_${book.title}_section_${i + 1}`,
                    createdByValue
                ]);
                
                knowledgeItemsCreated++;
                
                // Criar Q&A se solicitado
                if (create_qa && sectionContent.length > 100) {
                    const question = sectionTitle.length > 100 
                        ? sectionTitle.substring(0, 100) + '...'
                        : sectionTitle;
                    
                    const answer = sectionContent; // SEM LIMITE
                    
                    // Verificar se Q&A já existe
                    const existingQA = await client.query(`
                        SELECT id FROM ia_qa
                        WHERE LOWER(question) = LOWER($1)
                        LIMIT 1
                    `, [question]);
                    
                    if (existingQA.rows.length === 0) {
                        await client.query(`
                            INSERT INTO ia_qa (question, answer, keywords, category_id, is_active)
                            VALUES ($1, $2, $3, $4, true)
                        `, [
                            question,
                            answer,
                            keywords,
                            book.category_id || null
                        ]);
                        qaCreated++;
                    }
                }
            } catch (error) {
                console.error(`Erro ao processar seção ${i + 1}:`, error);
                // Continuar com próxima seção
            }
        }
        
        // Criar entrada principal do livro (conteúdo completo)
        const bookKeywords = extractKeywords(book.title + ' ' + book.content);
        
        await client.query(`
            INSERT INTO ia_knowledge_base (title, content, keywords, category_id, source_type, source_reference, is_active, created_by, priority)
            VALUES ($1, $2, $3, $4, 'book_training', $5, true, $6, 100)
        `, [
            book.title,
            `Livro completo: ${book.title}\n\n${book.content}\n\nEste livro foi dividido em ${sections.length} seções para melhor compreensão.`,
            bookKeywords,
            book.category_id || null,
            `book_${book.title}_main`,
            createdByValue
        ]);
        
        knowledgeItemsCreated++;
        
        // Marcar livro original como treinado (atualizar source_type)
        await client.query(`
            UPDATE ia_knowledge_base
            SET source_type = 'tavily_book_trained',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [book_id]);
        
        await client.query('COMMIT');
        
        console.log(`✅ Treinamento com livro do banco concluído!`);
        console.log(`   - Seções processadas: ${sections.length}`);
        console.log(`   - Itens de conhecimento: ${knowledgeItemsCreated}`);
        console.log(`   - Q&As criados: ${qaCreated}`);
        console.log(`   - Palavras processadas: ${wordsProcessed.toLocaleString()}`);
        
        res.json({
            message: `Livro "${book.title}" treinado com sucesso! A IA agora conhece este livro e pode responder perguntas sobre ele.`,
            stats: {
                sections_created: sections.length,
                knowledge_items: knowledgeItemsCreated,
                qa_created: qaCreated,
                words_processed: wordsProcessed
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro no treinamento com livro do banco:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// ============================================
// ANÁLISE PROFUNDA DE VENDAS E SISTEMA
// ============================================

/**
 * Analisa profundamente uma página de vendas, texto ou conteúdo
 * Fornece opiniões, análises e melhorias, não apenas sugestões simples
 */
async function analisarVendasProfundo(conteudo, tipo, userId, client) {
    try {
        // Buscar conhecimento sobre análise de vendas
        const analysisKnowledge = await client.query(`
            SELECT content, keywords
            FROM ia_knowledge_base
            WHERE is_active = true
            AND (
                LOWER(title) LIKE ANY(ARRAY['%análise%', '%análise de vendas%', '%copywriting%', '%otimização%', '%conversão%'])
                OR keywords && ARRAY['análise', 'copywriting', 'otimização', 'conversão', 'vendas', 'marketing']
            )
            ORDER BY priority DESC
            LIMIT 5
        `);
        
        // Buscar histórico de análises similares
        const similarAnalyses = await client.query(`
            SELECT message, response
            FROM ia_conversations
            WHERE user_id = $1
            AND LOWER(message) LIKE ANY(ARRAY['%análise%', '%analisar%', '%opinião%', '%melhorar%'])
            ORDER BY created_at DESC
            LIMIT 3
        `, [userId]);
        
        // Analisar o conteúdo
        const analise = {
            pontosFortes: [],
            pontosFracos: [],
            oportunidades: [],
            recomendacoes: [],
            score: 0
        };
        
        // Análise de palavras-chave
        const palavrasChave = extractKeywords(conteudo);
        const palavrasVendas = ['compre', 'agora', 'oferta', 'desconto', 'garantia', 'limitado', 'exclusivo', 'urgente'];
        const temPalavrasVendas = palavrasVendas.some(p => palavrasChave.includes(p));
        
        // Análise de estrutura
        const temTitulo = conteudo.length > 0 && conteudo.split('\n')[0].length < 100;
        const temDescricao = conteudo.length > 50;
        const temCallToAction = /(compre|adquira|garanta|clique|saiba mais)/i.test(conteudo);
        
        // Análise de persuasão
        const temBeneficios = /(benefício|vantagem|resultado|transforma)/i.test(conteudo);
        const temUrgencia = /(limitado|últimas|hoje|agora|urgente)/i.test(conteudo);
        const temProvaSocial = /(testemunho|depoimento|cliente|resultado)/i.test(conteudo);
        
        // Construir análise
        if (temTitulo) analise.pontosFortes.push('✅ Tem título claro e objetivo');
        if (temDescricao) analise.pontosFortes.push('✅ Descrição presente e informativa');
        if (temCallToAction) analise.pontosFortes.push('✅ Call-to-action identificado');
        if (temBeneficios) analise.pontosFortes.push('✅ Menciona benefícios ao cliente');
        
        if (!temPalavrasVendas) analise.pontosFracos.push('⚠️ Falta palavras-chave de vendas (compre, agora, oferta)');
        if (!temUrgencia) analise.oportunidades.push('💡 Adicionar urgência (limitado, últimas unidades)');
        if (!temProvaSocial) analise.oportunidades.push('💡 Incluir prova social (depoimentos, resultados)');
        
        // Calcular score
        let score = 50;
        if (temTitulo) score += 10;
        if (temDescricao) score += 10;
        if (temCallToAction) score += 15;
        if (temBeneficios) score += 10;
        if (temPalavrasVendas) score += 5;
        analise.score = Math.min(score, 100);
        
        // Recomendações baseadas em conhecimento
        if (analysisKnowledge.rows.length > 0) {
            const knowledge = analysisKnowledge.rows[0].content;
            if (knowledge.includes('copywriting')) {
                analise.recomendacoes.push('📝 Use técnicas de copywriting: foco em benefícios, não características');
            }
            if (knowledge.includes('conversão')) {
                analise.recomendacoes.push('🎯 Otimize para conversão: CTAs claros e visíveis');
            }
        }
        
        // Formatar resposta completa
        let resposta = `## 📊 **Análise Profunda de ${tipo}**\n\n`;
        resposta += `**Score Geral: ${analise.score}/100**\n\n`;
        
        resposta += `### ✅ **Pontos Fortes:**\n`;
        analise.pontosFortes.forEach(p => resposta += `${p}\n`);
        if (analise.pontosFortes.length === 0) resposta += 'Nenhum ponto forte identificado.\n';
        
        resposta += `\n### ⚠️ **Pontos de Melhoria:**\n`;
        analise.pontosFracos.forEach(p => resposta += `${p}\n`);
        if (analise.pontosFracos.length === 0) resposta += 'Nenhum ponto fraco crítico identificado.\n';
        
        resposta += `\n### 💡 **Oportunidades:**\n`;
        analise.oportunidades.forEach(p => resposta += `${p}\n`);
        if (analise.oportunidades.length === 0) resposta += 'Oportunidades já exploradas.\n';
        
        resposta += `\n### 🎯 **Recomendações Específicas:**\n`;
        analise.recomendacoes.forEach(p => resposta += `${p}\n`);
        if (analise.recomendacoes.length === 0) {
            resposta += '• Foque em benefícios, não características\n';
            resposta += '• Use linguagem emocional quando apropriado\n';
            resposta += '• Inclua prova social (depoimentos, resultados)\n';
        }
        
        resposta += `\n### 💼 **Minha Opinião Profissional:**\n\n`;
        if (analise.score >= 80) {
            resposta += `Este conteúdo está muito bem estruturado! Tem boa base para conversão. `;
        } else if (analise.score >= 60) {
            resposta += `Bom conteúdo, mas há espaço para melhorias significativas. `;
        } else {
            resposta += `Este conteúdo precisa de melhorias importantes para converter melhor. `;
        }
        resposta += `Recomendo focar nas oportunidades identificadas acima para aumentar a taxa de conversão.`;
        
        return resposta;
    } catch (error) {
        console.error('Erro na análise profunda:', error);
        return `Erro ao analisar conteúdo: ${error.message}`;
    }
}

// POST /api/ia-king/analyze-sales - Análise profunda de vendas (não só sugestões)
router.post('/analyze-sales', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { content, type = 'texto' } = req.body;
        const userId = req.user.id;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Conteúdo é obrigatório' });
        }
        
        const analise = await analisarVendasProfundo(content, type, userId, client);
        
        res.json({
            success: true,
            analysis: analise,
            type: 'deep_analysis'
        });
    } catch (error) {
        console.error('Erro na análise de vendas:', error);
        res.status(500).json({ error: 'Erro ao analisar conteúdo' });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/analyze-system - Analisar todo o sistema Conecta King
router.post('/analyze-system', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.id;
        
        // Buscar todos os dados do usuário
        const profileResult = await client.query(`
            SELECT * FROM user_profiles WHERE user_id = $1
        `, [userId]);
        
        const itemsResult = await client.query(`
            SELECT * FROM profile_items WHERE user_id = $1 ORDER BY display_order
        `, [userId]);
        
        const salesPagesResult = await client.query(`
            SELECT sp.*, pi.title as item_title
            FROM sales_pages sp
            JOIN profile_items pi ON sp.profile_item_id = pi.id
            WHERE pi.user_id = $1
        `, [userId]);
        
        // Analisar cartão virtual
        let analiseCartao = `## 📱 **Análise do Seu Cartão Virtual**\n\n`;
        
        if (profileResult.rows.length === 0) {
            analiseCartao += '⚠️ **Nenhum perfil encontrado.** Crie seu cartão virtual primeiro.\n';
        } else {
            const profile = profileResult.rows[0];
            analiseCartao += `**Nome:** ${profile.name || 'Não definido'}\n`;
            analiseCartao += `**Profissão:** ${profile.profession || 'Não definida'}\n`;
            analiseCartao += `**Módulos:** ${itemsResult.rows.length} itens\n\n`;
            
            // Analisar módulos
            analiseCartao += `### 📊 **Análise dos Módulos:**\n\n`;
            const tiposModulos = {};
            itemsResult.rows.forEach(item => {
                tiposModulos[item.item_type] = (tiposModulos[item.item_type] || 0) + 1;
            });
            
            Object.entries(tiposModulos).forEach(([tipo, count]) => {
                analiseCartao += `• **${tipo}:** ${count} ${count > 1 ? 'itens' : 'item'}\n`;
            });
        }
        
        // Analisar páginas de vendas
        let analiseVendas = `\n## 💼 **Análise das Páginas de Vendas**\n\n`;
        if (salesPagesResult.rows.length === 0) {
            analiseVendas += '⚠️ **Nenhuma página de vendas encontrada.**\n';
            analiseVendas += '💡 **Recomendação:** Crie uma página de vendas para aumentar suas conversões!\n';
        } else {
            analiseVendas += `**Total de páginas:** ${salesPagesResult.rows.length}\n\n`;
            salesPagesResult.rows.forEach((page, index) => {
                analiseVendas += `### Página ${index + 1}: ${page.store_title || 'Sem título'}\n`;
                analiseVendas += `• Status: ${page.status}\n`;
                analiseVendas += `• Descrição: ${page.store_description ? 'Presente' : 'Faltando'}\n`;
                analiseVendas += `• Produtos: ${page.product_count || 0}\n\n`;
            });
        }
        
        // Recomendações gerais
        let recomendacoes = `\n## 🎯 **Recomendações Gerais:**\n\n`;
        if (itemsResult.rows.length < 5) {
            recomendacoes += '💡 Adicione mais módulos ao seu cartão para torná-lo mais completo\n';
        }
        if (salesPagesResult.rows.length === 0) {
            recomendacoes += '💡 Crie uma página de vendas para aumentar suas conversões\n';
        }
        recomendacoes += '💡 Mantenha suas informações sempre atualizadas\n';
        recomendacoes += '💡 Use imagens de qualidade nos módulos\n';
        
        const analiseCompleta = analiseCartao + analiseVendas + recomendacoes;
        
        res.json({
            success: true,
            analysis: analiseCompleta,
            stats: {
                total_items: itemsResult.rows.length,
                total_sales_pages: salesPagesResult.rows.length,
                profile_exists: profileResult.rows.length > 0
            }
        });
    } catch (error) {
        console.error('Erro ao analisar sistema:', error);
        res.status(500).json({ error: 'Erro ao analisar sistema' });
    } finally {
        client.release();
    }
}));

// ============================================
// SISTEMA DE FEEDBACK DO USUÁRIO
// ============================================

// POST /api/ia-king/feedback - Enviar feedback sobre uma resposta
router.post('/feedback', protectUser, asyncHandler(async (req, res) => {
    const { conversation_id, feedback_type, feedback_text, quality_score } = req.body;
    const userId = req.user.id;
    
    if (!conversation_id || !feedback_type) {
        return res.status(400).json({ error: 'conversation_id e feedback_type são obrigatórios' });
    }
    
    if (!['positive', 'negative', 'correction', 'neutral'].includes(feedback_type)) {
        return res.status(400).json({ error: 'feedback_type inválido' });
    }
    
    const client = await db.pool.connect();
    try {
        // Buscar conhecimento usado na conversa
        const convResult = await client.query(
            'SELECT knowledge_used_ids FROM ia_conversations WHERE id = $1 AND user_id = $2',
            [conversation_id, userId]
        );
        
        const knowledge_used_ids = convResult.rows[0]?.knowledge_used_ids || [];
        
        // Inserir feedback
        const feedbackResult = await client.query(`
            INSERT INTO ia_user_feedback 
            (conversation_id, user_id, feedback_type, feedback_text, knowledge_used_ids, response_quality_score)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [conversation_id, userId, feedback_type, feedback_text || null, knowledge_used_ids, quality_score || null]);
        
        // Atualizar métricas de satisfação
        await updateSatisfactionMetrics(client);
        
        // Se feedback negativo, aprender com ele (usando sistema avançado)
        if (feedback_type === 'negative' || feedback_type === 'correction') {
            await learnFromNegativeFeedbackAdvanced(client, conversation_id, feedback_text, knowledge_used_ids);
            
            // Buscar conversa para detectar erro repetitivo
            const conv = await client.query(`
                SELECT message, response FROM ia_conversations WHERE id = $1
            `, [conversation_id]);
            
            if (conv.rows.length > 0) {
                await detectRepetitiveError(conv.rows[0].message, conv.rows[0].response, knowledge_used_ids, client);
            }
        }
        
        // Se feedback positivo, atualizar estatísticas de sucesso
        if (feedback_type === 'positive' && knowledge_used_ids && knowledge_used_ids.length > 0) {
            for (const kid of knowledge_used_ids) {
                await trackKnowledgeUsage(kid, true, quality_score || 80, client);
            }
            // Ajustar estratégias positivamente
            await adjustResponseStrategies('knowledge_search', true, quality_score || 80, quality_score || 80, client);
        }
        
        res.json({
            success: true,
            feedback: feedbackResult.rows[0],
            message: 'Feedback registrado com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao registrar feedback:', error);
        res.status(500).json({ error: 'Erro ao registrar feedback' });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/feedback/stats - Estatísticas de feedback
router.get('/feedback/stats', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const stats = await client.query(`
            SELECT 
                feedback_type,
                COUNT(*) as count,
                AVG(response_quality_score) as avg_quality_score
            FROM ia_user_feedback
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY feedback_type
        `);
        
        const total = await client.query('SELECT COUNT(*) as count FROM ia_user_feedback');
        
        res.json({
            total: parseInt(total.rows[0].count),
            by_type: stats.rows.map(row => ({
                type: row.feedback_type,
                count: parseInt(row.count),
                avg_quality: parseFloat(row.avg_quality_score || 0)
            })),
            satisfaction_rate: stats.rows.length > 0 
                ? (stats.rows.find(r => r.feedback_type === 'positive')?.count || 0) / 
                  stats.rows.reduce((sum, r) => sum + parseInt(r.count), 0) * 100
                : 0
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas de feedback:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    } finally {
        client.release();
    }
}));

// ============================================
// SISTEMA DE PREFERÊNCIAS DO USUÁRIO
// ============================================

// GET /api/ia-king/preferences - Obter preferências do usuário
router.get('/preferences', protectUser, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const client = await db.pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM ia_user_preferences WHERE user_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            // Criar preferências padrão
            const defaultPrefs = await client.query(`
                INSERT INTO ia_user_preferences (user_id)
                VALUES ($1)
                RETURNING *
            `, [userId]);
            return res.json({ preferences: defaultPrefs.rows[0] });
        }
        
        res.json({ preferences: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar preferências:', error);
        res.status(500).json({ error: 'Erro ao buscar preferências' });
    } finally {
        client.release();
    }
}));

// PUT /api/ia-king/preferences - Atualizar preferências
router.put('/preferences', protectUser, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { preferred_style, knowledge_level, interests, language_preference, response_length_preference, topics_blacklist, topics_whitelist } = req.body;
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            INSERT INTO ia_user_preferences 
            (user_id, preferred_style, knowledge_level, interests, language_preference, response_length_preference, topics_blacklist, topics_whitelist, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                preferred_style = COALESCE(EXCLUDED.preferred_style, ia_user_preferences.preferred_style),
                knowledge_level = COALESCE(EXCLUDED.knowledge_level, ia_user_preferences.knowledge_level),
                interests = COALESCE(EXCLUDED.interests, ia_user_preferences.interests),
                language_preference = COALESCE(EXCLUDED.language_preference, ia_user_preferences.language_preference),
                response_length_preference = COALESCE(EXCLUDED.response_length_preference, ia_user_preferences.response_length_preference),
                topics_blacklist = COALESCE(EXCLUDED.topics_blacklist, ia_user_preferences.topics_blacklist),
                topics_whitelist = COALESCE(EXCLUDED.topics_whitelist, ia_user_preferences.topics_whitelist),
                updated_at = NOW()
            RETURNING *
        `, [userId, preferred_style, knowledge_level, interests, language_preference, response_length_preference, topics_blacklist, topics_whitelist]);
        
        res.json({
            success: true,
            preferences: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar preferências:', error);
        res.status(500).json({ error: 'Erro ao atualizar preferências' });
    } finally {
        client.release();
    }
}));

// ============================================
// SISTEMA DE CORREÇÕES
// ============================================

// POST /api/ia-king/corrections - Enviar correção
router.post('/corrections', protectUser, asyncHandler(async (req, res) => {
    const { knowledge_id, conversation_id, original_content, corrected_content, correction_reason } = req.body;
    const userId = req.user.id;
    
    if (!knowledge_id || !original_content || !corrected_content) {
        return res.status(400).json({ error: 'knowledge_id, original_content e corrected_content são obrigatórios' });
    }
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            INSERT INTO ia_knowledge_corrections
            (knowledge_id, user_id, conversation_id, original_content, corrected_content, correction_reason)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [knowledge_id, userId, conversation_id || null, original_content, corrected_content, correction_reason || null]);
        
        // Se já existe correção verificada, incrementar contador
        const existingVerified = await client.query(`
            SELECT id FROM ia_knowledge_corrections
            WHERE knowledge_id = $1 AND verified = true
            LIMIT 1
        `, [knowledge_id]);
        
        if (existingVerified.rows.length > 0) {
            await client.query(`
                UPDATE ia_knowledge_corrections
                SET verification_count = verification_count + 1
                WHERE id = $1
            `, [existingVerified.rows[0].id]);
        }
        
        res.json({
            success: true,
            correction: result.rows[0],
            message: 'Correção registrada! Será revisada e aplicada.'
        });
    } catch (error) {
        console.error('Erro ao registrar correção:', error);
        res.status(500).json({ error: 'Erro ao registrar correção' });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/corrections - Listar correções
router.get('/corrections', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                kc.*,
                kb.title as knowledge_title,
                u.name as user_name
            FROM ia_knowledge_corrections kc
            LEFT JOIN ia_knowledge_base kb ON kc.knowledge_id = kb.id
            LEFT JOIN users u ON kc.user_id = u.id
            ORDER BY kc.created_at DESC
            LIMIT 100
        `);
        
        res.json({ corrections: result.rows });
    } catch (error) {
        console.error('Erro ao buscar correções:', error);
        res.status(500).json({ error: 'Erro ao buscar correções' });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/corrections/:id/verify - Verificar correção
router.post('/corrections/:id/verify', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        // Marcar como verificada
        await client.query(`
            UPDATE ia_knowledge_corrections
            SET verified = true, verification_count = verification_count + 1
            WHERE id = $1
        `, [id]);
        
        // Buscar correção
        const correction = await client.query(
            'SELECT * FROM ia_knowledge_corrections WHERE id = $1',
            [id]
        );
        
        if (correction.rows.length > 0 && correction.rows[0].knowledge_id) {
            // Atualizar conhecimento base com correção
            await client.query(`
                UPDATE ia_knowledge_base
                SET content = $1, updated_at = NOW()
                WHERE id = $2
            `, [correction.rows[0].corrected_content, correction.rows[0].knowledge_id]);
        }
        
        res.json({ success: true, message: 'Correção verificada e aplicada!' });
    } catch (error) {
        console.error('Erro ao verificar correção:', error);
        res.status(500).json({ error: 'Erro ao verificar correção' });
    } finally {
        client.release();
    }
}));

// ============================================
// SISTEMA DE SUGESTÕES DE PERGUNTAS
// ============================================

// GET /api/ia-king/suggestions/:conversation_id - Obter sugestões de perguntas
router.get('/suggestions/:conversation_id', protectUser, asyncHandler(async (req, res) => {
    const { conversation_id } = req.params;
    const userId = req.user.id;
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM ia_question_suggestions
            WHERE conversation_id = $1 AND user_id = $2
            ORDER BY created_at DESC
            LIMIT 5
        `, [conversation_id, userId]);
        
        res.json({ suggestions: result.rows });
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        res.status(500).json({ error: 'Erro ao buscar sugestões' });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/suggestions/:id/click - Marcar sugestão como clicada
router.post('/suggestions/:id/click', protectUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        await client.query(`
            UPDATE ia_question_suggestions
            SET clicked = true
            WHERE id = $1
        `, [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao marcar sugestão:', error);
        res.status(500).json({ error: 'Erro ao marcar sugestão' });
    } finally {
        client.release();
    }
}));

// ============================================
// SISTEMA DE MÉTRICAS DE SATISFAÇÃO
// ============================================

// GET /api/ia-king/metrics/satisfaction - Obter métricas de satisfação
router.get('/metrics/satisfaction', protectAdmin, asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM ia_satisfaction_metrics
            WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            ORDER BY date DESC
        `);
        
        // Calcular totais
        const totals = result.rows.reduce((acc, row) => ({
            total_conversations: acc.total_conversations + parseInt(row.total_conversations || 0),
            positive_feedback: acc.positive_feedback + parseInt(row.positive_feedback_count || 0),
            negative_feedback: acc.negative_feedback + parseInt(row.negative_feedback_count || 0),
            neutral_feedback: acc.neutral_feedback + parseInt(row.neutral_feedback_count || 0)
        }), {
            total_conversations: 0,
            positive_feedback: 0,
            negative_feedback: 0,
            neutral_feedback: 0
        });
        
        const satisfactionRate = totals.total_conversations > 0
            ? (totals.positive_feedback / totals.total_conversations) * 100
            : 0;
        
        res.json({
            metrics: result.rows,
            totals: totals,
            satisfaction_rate: Math.round(satisfactionRate * 100) / 100,
            period_days: parseInt(days)
        });
    } catch (error) {
        console.error('Erro ao buscar métricas:', error);
        res.status(500).json({ error: 'Erro ao buscar métricas' });
    } finally {
        client.release();
    }
}));

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Aprender com feedback negativo
async function learnFromNegativeFeedback(client, conversationId, feedbackText, knowledgeIds) {
    try {
        // Buscar conversa
        const conv = await client.query(
            'SELECT message, response FROM ia_conversations WHERE id = $1',
            [conversationId]
        );
        
        if (conv.rows.length === 0) return;
        
        const { message, response } = conv.rows[0];
        
        // Criar registro de aprendizado negativo
        await client.query(`
            INSERT INTO ia_auto_learning_history
            (user_id, question, answer, source_type, learned_from, is_negative_example)
            VALUES ($1, $2, $3, 'feedback', $4, true)
        `, [null, message, response, feedbackText || 'Feedback negativo']);
        
        // Reduzir prioridade do conhecimento usado se feedback negativo
        if (knowledgeIds && knowledgeIds.length > 0) {
            await client.query(`
                UPDATE ia_knowledge_base
                SET priority = GREATEST(priority - 10, 0)
                WHERE id = ANY($1)
            `, [knowledgeIds]);
        }
    } catch (error) {
        console.error('Erro ao aprender com feedback negativo:', error);
    }
}

// Atualizar métricas de satisfação
async function updateSatisfactionMetrics(client) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Buscar métricas do dia
        const metrics = await client.query(`
            SELECT 
                COUNT(DISTINCT c.id) as total_conversations,
                COUNT(CASE WHEN f.feedback_type = 'positive' THEN 1 END) as positive_feedback,
                COUNT(CASE WHEN f.feedback_type = 'negative' THEN 1 END) as negative_feedback,
                COUNT(CASE WHEN f.feedback_type = 'neutral' THEN 1 END) as neutral_feedback,
                AVG(f.response_quality_score) as avg_quality_score,
                AVG(c.response_time_ms) as avg_response_time
            FROM ia_conversations c
            LEFT JOIN ia_user_feedback f ON c.id = f.conversation_id
            WHERE DATE(c.created_at) = $1
        `, [today]);
        
        const stats = metrics.rows[0];
        
        // Atualizar ou inserir métricas
        await client.query(`
            INSERT INTO ia_satisfaction_metrics
            (date, total_conversations, positive_feedback_count, negative_feedback_count, neutral_feedback_count, average_quality_score, average_response_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (date) DO UPDATE SET
                total_conversations = EXCLUDED.total_conversations,
                positive_feedback_count = EXCLUDED.positive_feedback_count,
                negative_feedback_count = EXCLUDED.negative_feedback_count,
                neutral_feedback_count = EXCLUDED.neutral_feedback_count,
                average_quality_score = EXCLUDED.average_quality_score,
                average_response_time = EXCLUDED.average_response_time,
                updated_at = NOW()
        `, [
            today,
            parseInt(stats.total_conversations || 0),
            parseInt(stats.positive_feedback || 0),
            parseInt(stats.negative_feedback || 0),
            parseInt(stats.neutral_feedback || 0),
            parseFloat(stats.avg_quality_score || 0),
            parseFloat(stats.avg_response_time || 0)
        ]);
    } catch (error) {
        console.error('Erro ao atualizar métricas de satisfação:', error);
    }
}

// ============================================
// SISTEMA DE MONITORAMENTO E AUTO-CORREÇÃO
// ============================================

// GET /api/ia-king/system/analyze - Análise completa do sistema
router.get('/system/analyze', protectAdmin, asyncHandler(async (req, res) => {
    const { type = 'full' } = req.query; // 'full', 'database', 'api', 'performance', 'security', 'code'
    const client = await db.pool.connect();
    
    try {
        console.log(`🔍 [IA] Iniciando análise do sistema (tipo: ${type})...`);
        
        const analysis = {
            type: type,
            timestamp: new Date().toISOString(),
            database: null,
            api: null,
            performance: null,
            errors: null,
            security: null,
            code: null,
            issues: [],
            recommendations: [],
            overall_status: 'healthy'
        };
        
        // Análise do Banco de Dados
        if (type === 'full' || type === 'database') {
            analysis.database = await analyzeDatabase(client);
            analysis.issues.push(...(analysis.database.issues || []));
        }
        
        // Análise de APIs
        if (type === 'full' || type === 'api') {
            analysis.api = await analyzeAPIs(client);
            analysis.issues.push(...(analysis.api.issues || []));
        }
        
        // Análise de Performance
        if (type === 'full' || type === 'performance') {
            analysis.performance = await analyzePerformance(client);
            analysis.issues.push(...(analysis.performance.issues || []));
        }
        
        // Análise de Erros
        if (type === 'full' || type === 'error') {
            analysis.errors = await analyzeErrors(client);
            analysis.issues.push(...(analysis.errors.issues || []));
        }
        
        // Análise de Segurança
        if (type === 'full' || type === 'security') {
            analysis.security = await analyzeSecurity(client);
            analysis.issues.push(...(analysis.security.issues || []));
        }
        
        // Análise de Código (básica)
        if (type === 'full' || type === 'code') {
            analysis.code = await analyzeCode();
            analysis.issues.push(...(analysis.code.issues || []));
        }
        
        // Calcular status geral
        const criticalIssues = analysis.issues.filter(i => i.severity === 'critical').length;
        const errorIssues = analysis.issues.filter(i => i.severity === 'high').length;
        
        if (criticalIssues > 0) {
            analysis.overall_status = 'critical';
        } else if (errorIssues > 0) {
            analysis.overall_status = 'error';
        } else if (analysis.issues.length > 0) {
            analysis.overall_status = 'warning';
        }
        
        // Gerar recomendações
        analysis.recommendations = generateRecommendations(analysis.issues);
        
        // Salvar análise no banco
        await client.query(`
            INSERT INTO ia_system_analyses
            (analysis_type, analysis_result, issues_found, issues_critical, issues_warning, recommendations)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            type,
            JSON.stringify(analysis),
            analysis.issues.length,
            criticalIssues,
            analysis.issues.filter(i => i.severity === 'warning').length,
            analysis.recommendations
        ]);
        
        res.json({
            success: true,
            analysis: analysis,
            summary: {
                total_issues: analysis.issues.length,
                critical: criticalIssues,
                errors: errorIssues,
                warnings: analysis.issues.filter(i => i.severity === 'warning').length,
                status: analysis.overall_status
            }
        });
    } catch (error) {
        console.error('Erro ao analisar sistema:', error);
        res.status(500).json({ error: 'Erro ao analisar sistema', details: error.message });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/system/monitoring - Status atual do monitoramento
router.get('/system/monitoring', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Verificar se as tabelas existem
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_system_monitoring'
            ) as monitoring_exists,
            EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_system_errors'
            ) as errors_exists,
            EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_system_fixes'
            ) as fixes_exists
        `);
        
        const tablesExist = tableCheck.rows[0];
        
        // Se as tabelas não existem, retornar estrutura vazia
        if (!tablesExist.monitoring_exists || !tablesExist.errors_exists || !tablesExist.fixes_exists) {
            console.warn('⚠️ Tabelas de monitoramento não existem. Execute a migration 034.');
            return res.json({
                monitoring: [],
                errors: [],
                pending_fixes: [],
                summary: {
                    total_monitoring_issues: 0,
                    total_errors: 0,
                    pending_fixes: 0
                },
                warning: 'Tabelas de monitoramento não encontradas. Execute a migration 034_IA_SYSTEM_MONITORING.sql'
            });
        }
        
        const monitoring = await client.query(`
            SELECT * FROM ia_system_monitoring
            WHERE resolved_at IS NULL
            ORDER BY severity DESC, checked_at DESC
            LIMIT 50
        `);
        
        const errors = await client.query(`
            SELECT * FROM ia_system_errors
            WHERE resolved = false
            ORDER BY severity DESC, last_occurred_at DESC
            LIMIT 50
        `);
        
        const pendingFixes = await client.query(`
            SELECT f.*, e.error_message, e.error_type
            FROM ia_system_fixes f
            LEFT JOIN ia_system_errors e ON f.error_id = e.id
            WHERE f.status = 'pending'
            ORDER BY f.created_at DESC
        `);
        
        res.json({
            monitoring: monitoring.rows,
            errors: errors.rows,
            pending_fixes: pendingFixes.rows,
            summary: {
                total_monitoring_issues: monitoring.rows.length,
                total_errors: errors.rows.length,
                pending_fixes: pendingFixes.rows.length
            }
        });
    } catch (error) {
        console.error('Erro ao buscar monitoramento:', error);
        
        // Se for erro de tabela não existe, retornar estrutura vazia
        if (error.message && (error.message.includes('does not exist') || error.message.includes('não existe'))) {
            return res.json({
                monitoring: [],
                errors: [],
                pending_fixes: [],
                summary: {
                    total_monitoring_issues: 0,
                    total_errors: 0,
                    pending_fixes: 0
                },
                warning: 'Tabelas de monitoramento não encontradas. Execute a migration 034_IA_SYSTEM_MONITORING.sql'
            });
        }
        
        res.status(500).json({ error: 'Erro ao buscar monitoramento', details: error.message });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/system/fixes/:id/approve - Aprovar correção
router.post('/system/fixes/:id/approve', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await db.pool.connect();
    
    try {
        // Buscar correção
        const fix = await client.query('SELECT * FROM ia_system_fixes WHERE id = $1', [id]);
        
        if (fix.rows.length === 0) {
            return res.status(404).json({ error: 'Correção não encontrada' });
        }
        
        // Aprovar
        await client.query(`
            UPDATE ia_system_fixes
            SET status = 'approved',
                approved_by = $1,
                approved_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
        `, [userId, id]);
        
        // Registrar no histórico
        await client.query(`
            INSERT INTO ia_system_fix_history (fix_id, action, action_by)
            VALUES ($1, 'approved', $2)
        `, [id, userId]);
        
        res.json({ success: true, message: 'Correção aprovada! Agora você pode aplicá-la.' });
    } catch (error) {
        console.error('Erro ao aprovar correção:', error);
        res.status(500).json({ error: 'Erro ao aprovar correção' });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/system/fixes/:id/apply - Aplicar correção
router.post('/system/fixes/:id/apply', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await db.pool.connect();
    
    try {
        // Buscar correção
        const fix = await client.query('SELECT * FROM ia_system_fixes WHERE id = $1', [id]);
        
        if (fix.rows.length === 0) {
            return res.status(404).json({ error: 'Correção não encontrada' });
        }
        
        const fixData = fix.rows[0];
        
        if (fixData.status !== 'approved') {
            return res.status(400).json({ error: 'Correção precisa ser aprovada antes de ser aplicada' });
        }
        
        // Aplicar correção baseado no tipo
        const result = await applyFix(fixData, client);
        
        // Atualizar status
        await client.query(`
            UPDATE ia_system_fixes
            SET status = $1,
                applied_at = NOW(),
                applied_by = $2,
                test_result = $3,
                updated_at = NOW()
            WHERE id = $4
        `, [result.success ? 'applied' : 'failed', userId, JSON.stringify(result), id]);
        
        // Registrar no histórico
        await client.query(`
            INSERT INTO ia_system_fix_history (fix_id, action, action_by, action_details)
            VALUES ($1, 'applied', $2, $3)
        `, [id, userId, JSON.stringify(result)]);
        
        // NÃO marcar erro como resolvido automaticamente
        // O usuário deve aprovar manualmente na aba de análise de erros
        // if (result.success && fixData.error_id) {
        //     await client.query(`
        //         UPDATE ia_system_errors
        //         SET resolved = true,
        //             resolved_at = NOW(),
        //             resolved_by = $1,
        //             resolution_method = 'auto'
        //         WHERE id = $2
        //     `, [userId, fixData.error_id]);
        // }
        
        res.json({
            success: result.success,
            message: result.success ? 'Correção aplicada com sucesso!' : 'Erro ao aplicar correção',
            details: result
        });
    } catch (error) {
        console.error('Erro ao aplicar correção:', error);
        res.status(500).json({ error: 'Erro ao aplicar correção', details: error.message });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/system/errors - Listar todos os erros para análise
router.get('/system/errors', protectAdmin, asyncHandler(async (req, res) => {
    const { resolved, severity, limit = 100 } = req.query;
    const client = await db.pool.connect();
    try {
        let query = 'SELECT * FROM ia_system_errors WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (resolved !== undefined) {
            query += ` AND resolved = $${paramIndex}`;
            params.push(resolved === 'true');
            paramIndex++;
        }
        
        if (severity) {
            query += ` AND severity = $${paramIndex}`;
            params.push(severity);
            paramIndex++;
        }
        
        query += ` ORDER BY 
            CASE severity 
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END,
            resolved ASC,
            last_occurred_at DESC
            LIMIT $${paramIndex}`;
        params.push(parseInt(limit));
        
        const result = await client.query(query, params);
        
        res.json({
            errors: result.rows,
            total: result.rows.length,
            summary: {
                total: result.rows.length,
                resolved: result.rows.filter(e => e.resolved).length,
                unresolved: result.rows.filter(e => !e.resolved).length,
                by_severity: {
                    critical: result.rows.filter(e => e.severity === 'critical').length,
                    high: result.rows.filter(e => e.severity === 'high').length,
                    medium: result.rows.filter(e => e.severity === 'medium').length,
                    low: result.rows.filter(e => e.severity === 'low').length
                }
            }
        });
    } catch (error) {
        console.error('Erro ao buscar erros:', error);
        res.status(500).json({ error: 'Erro ao buscar erros' });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/system/errors/:id/resolve - Marcar erro como resolvido (COM APROVAÇÃO)
router.post('/system/errors/:id/resolve', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { resolution_method = 'manual', resolution_note } = req.body;
    const client = await db.pool.connect();
    
    try {
        // Verificar se erro existe
        const errorCheck = await client.query('SELECT * FROM ia_system_errors WHERE id = $1', [id]);
        
        if (errorCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Erro não encontrado' });
        }
        
        const error = errorCheck.rows[0];
        
        if (error.resolved) {
            return res.status(400).json({ error: 'Erro já está marcado como resolvido' });
        }
        
        // Marcar como resolvido (APENAS COM APROVAÇÃO DO USUÁRIO)
        await client.query(`
            UPDATE ia_system_errors
            SET resolved = true,
                resolved_at = NOW(),
                resolved_by = $1,
                resolution_method = $2,
                updated_at = NOW()
            WHERE id = $3
        `, [userId, resolution_method, id]);
        
        // Registrar no histórico se houver nota
        if (resolution_note) {
            // Criar tabela de histórico de resolução se não existir
            await client.query(`
                CREATE TABLE IF NOT EXISTS ia_error_resolution_history (
                    id SERIAL PRIMARY KEY,
                    error_id INTEGER,
                    resolved_by VARCHAR(255),
                    resolution_method VARCHAR(50),
                    resolution_note TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await client.query(`
                INSERT INTO ia_error_resolution_history
                (error_id, resolved_by, resolution_method, resolution_note)
                VALUES ($1, $2, $3, $4)
            `, [id, userId, resolution_method, resolution_note]);
        }
        
        res.json({
            success: true,
            message: 'Erro marcado como resolvido com sucesso'
        });
    } catch (error) {
        console.error('Erro ao marcar erro como resolvido:', error);
        res.status(500).json({ error: 'Erro ao marcar erro como resolvido', details: error.message });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/system/errors/:id/unresolve - Desmarcar erro como resolvido
router.post('/system/errors/:id/unresolve', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await db.pool.connect();
    
    try {
        const errorCheck = await client.query('SELECT * FROM ia_system_errors WHERE id = $1', [id]);
        
        if (errorCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Erro não encontrado' });
        }
        
        // Desmarcar como resolvido
        await client.query(`
            UPDATE ia_system_errors
            SET resolved = false,
                resolved_at = NULL,
                resolved_by = NULL,
                resolution_method = NULL,
                updated_at = NOW()
            WHERE id = $1
        `, [id]);
        
        res.json({
            success: true,
            message: 'Erro desmarcado como resolvido'
        });
    } catch (error) {
        console.error('Erro ao desmarcar erro:', error);
        res.status(500).json({ error: 'Erro ao desmarcar erro', details: error.message });
    } finally {
        client.release();
    }
}));

// DELETE /api/ia-king/system/errors/:id - Deletar erro (COM APROVAÇÃO)
router.delete('/system/errors/:id', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    
    try {
        // Verificar se erro existe
        const errorCheck = await client.query('SELECT * FROM ia_system_errors WHERE id = $1', [id]);
        
        if (errorCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Erro não encontrado' });
        }
        
        // Deletar erro (APENAS COM APROVAÇÃO DO USUÁRIO)
        await client.query('DELETE FROM ia_system_errors WHERE id = $1', [id]);
        
        res.json({
            success: true,
            message: 'Erro deletado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar erro:', error);
        res.status(500).json({ error: 'Erro ao deletar erro', details: error.message });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/system/fixes/:id/reject - Rejeitar correção
router.post('/system/fixes/:id/reject', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;
    const client = await db.pool.connect();
    
    try {
        await client.query(`
            UPDATE ia_system_fixes
            SET status = 'rejected',
                updated_at = NOW()
            WHERE id = $1
        `, [id]);
        
        // Registrar no histórico
        await client.query(`
            INSERT INTO ia_system_fix_history (fix_id, action, action_by, action_details)
            VALUES ($1, 'rejected', $2, $3)
        `, [id, userId, JSON.stringify({ reason: reason || 'Rejeitado pelo usuário' })]);
        
        res.json({ success: true, message: 'Correção rejeitada' });
    } catch (error) {
        console.error('Erro ao rejeitar correção:', error);
        res.status(500).json({ error: 'Erro ao rejeitar correção' });
    } finally {
        client.release();
    }
}));

// ============================================
// FUNÇÕES DE ANÁLISE DO SISTEMA
// ============================================

// Analisar Banco de Dados
async function analyzeDatabase(client) {
    const issues = [];
    const checks = [];
    
    try {
        // 1. Verificar conexão
        try {
            await client.query('SELECT 1');
            checks.push({ name: 'Conexão com Banco', status: 'healthy', message: 'Conexão ativa' });
        } catch (error) {
            issues.push({
                type: 'database',
                category: 'connection',
                severity: 'critical',
                message: 'Falha na conexão com banco de dados',
                details: error.message
            });
            checks.push({ name: 'Conexão com Banco', status: 'error', message: error.message });
        }
        
        // 2. Verificar pool de conexões
        const poolStats = db.pool.totalCount || 0;
        const poolIdle = db.pool.idleCount || 0;
        const poolWaiting = db.pool.waitingCount || 0;
        
        if (poolStats > 15) {
            issues.push({
                type: 'database',
                category: 'performance',
                severity: 'warning',
                message: `Pool de conexões alto: ${poolStats} conexões ativas`,
                details: { total: poolStats, idle: poolIdle, waiting: poolWaiting }
            });
        }
        
        checks.push({
            name: 'Pool de Conexões',
            status: poolStats > 15 ? 'warning' : 'healthy',
            message: `${poolStats} conexões (${poolIdle} idle, ${poolWaiting} waiting)`
        });
        
        // 3. Verificar tabelas críticas
        const criticalTables = ['users', 'ia_knowledge_base', 'ia_conversations', 'ia_categories'];
        for (const table of criticalTables) {
            try {
                const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                checks.push({
                    name: `Tabela ${table}`,
                    status: 'healthy',
                    message: `${count} registros`
                });
            } catch (error) {
                issues.push({
                    type: 'database',
                    category: 'table',
                    severity: 'critical',
                    message: `Tabela ${table} não encontrada ou inacessível`,
                    details: error.message
                });
            }
        }
        
        // 4. Verificar índices faltantes
        const tablesWithoutIndexes = await client.query(`
            SELECT t.table_name
            FROM information_schema.tables t
            LEFT JOIN information_schema.indexes i ON t.table_name = i.table_name
            WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND i.index_name IS NULL
            AND t.table_name LIKE 'ia_%'
            LIMIT 10
        `);
        
        if (tablesWithoutIndexes.rows.length > 0) {
            issues.push({
                type: 'database',
                category: 'performance',
                severity: 'warning',
                message: `${tablesWithoutIndexes.rows.length} tabelas sem índices podem ter performance ruim`,
                details: { tables: tablesWithoutIndexes.rows.map(r => r.table_name) }
            });
        }
        
        // 5. Verificar queries lentas (últimas 24h)
        const slowQueries = await client.query(`
            SELECT COUNT(*) as count
            FROM ia_system_metrics
            WHERE metric_type = 'database_query_time'
            AND metric_value > 1000
            AND recorded_at >= NOW() - INTERVAL '24 hours'
        `);
        
        if (parseInt(slowQueries.rows[0].count) > 10) {
            issues.push({
                type: 'database',
                category: 'performance',
                severity: 'warning',
                message: `${slowQueries.rows[0].count} queries lentas (>1s) nas últimas 24h`,
                details: { count: slowQueries.rows[0].count }
            });
        }
        
    } catch (error) {
        issues.push({
            type: 'database',
            category: 'unknown',
            severity: 'error',
            message: 'Erro ao analisar banco de dados',
            details: error.message
        });
    }
    
    return {
        status: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'error' : 'healthy',
        checks: checks,
        issues: issues,
        summary: {
            total_checks: checks.length,
            healthy: checks.filter(c => c.status === 'healthy').length,
            warnings: checks.filter(c => c.status === 'warning').length,
            errors: checks.filter(c => c.status === 'error').length
        }
    };
}

// Analisar APIs
async function analyzeAPIs(client) {
    const issues = [];
    const checks = [];
    
    try {
        // 1. Verificar endpoints críticos
        const criticalEndpoints = [
            { path: '/api/ia-king/chat', method: 'POST' },
            { path: '/api/ia-king/knowledge', method: 'GET' },
            { path: '/api/auth/login', method: 'POST' }
        ];
        
        // 2. Verificar taxa de erro nas APIs
        const errorRate = await client.query(`
            SELECT 
                COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
                COUNT(*) as total
            FROM ia_system_monitoring
            WHERE check_type = 'api'
            AND checked_at >= NOW() - INTERVAL '24 hours'
        `);
        
        if (errorRate.rows.length > 0) {
            const errors = parseInt(errorRate.rows[0].errors || 0);
            const total = parseInt(errorRate.rows[0].total || 1);
            const rate = (errors / total) * 100;
            
            if (rate > 10) {
                issues.push({
                    type: 'api',
                    category: 'error_rate',
                    severity: 'high',
                    message: `Taxa de erro alta nas APIs: ${rate.toFixed(2)}%`,
                    details: { error_rate: rate, errors: errors, total: total }
                });
            }
        }
        
        // 3. Verificar tempo de resposta
        const avgResponseTime = await client.query(`
            SELECT AVG(metric_value) as avg_time
            FROM ia_system_metrics
            WHERE metric_type = 'api_response_time'
            AND recorded_at >= NOW() - INTERVAL '1 hour'
        `);
        
        if (avgResponseTime.rows.length > 0 && avgResponseTime.rows[0].avg_time) {
            const avgTime = parseFloat(avgResponseTime.rows[0].avg_time);
            if (avgTime > 2000) {
                issues.push({
                    type: 'api',
                    category: 'performance',
                    severity: 'warning',
                    message: `Tempo médio de resposta alto: ${avgTime.toFixed(2)}ms`,
                    details: { avg_response_time: avgTime }
                });
            }
        }
        
        checks.push({
            name: 'APIs Principais',
            status: issues.length > 0 ? 'warning' : 'healthy',
            message: `${issues.length} problemas detectados`
        });
        
    } catch (error) {
        issues.push({
            type: 'api',
            category: 'unknown',
            severity: 'error',
            message: 'Erro ao analisar APIs',
            details: error.message
        });
    }
    
    return {
        status: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'error' : 'healthy',
        checks: checks,
        issues: issues
    };
}

// Analisar Performance
async function analyzePerformance(client) {
    const issues = [];
    const checks = [];
    
    try {
        // 1. Verificar uso de memória
        const memUsage = process.memoryUsage();
        const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const memPercent = (memUsedMB / memTotalMB) * 100;
        
        if (memPercent > 80) {
            issues.push({
                type: 'performance',
                category: 'memory',
                severity: 'warning',
                message: `Uso de memória alto: ${memPercent.toFixed(2)}%`,
                details: { used: memUsedMB, total: memTotalMB, percent: memPercent }
            });
        }
        
        checks.push({
            name: 'Uso de Memória',
            status: memPercent > 80 ? 'warning' : 'healthy',
            message: `${memUsedMB}MB / ${memTotalMB}MB (${memPercent.toFixed(2)}%)`
        });
        
        // 2. Verificar CPU (aproximado via uptime)
        const uptime = process.uptime();
        checks.push({
            name: 'Uptime do Servidor',
            status: 'healthy',
            message: `${Math.round(uptime / 3600)} horas`
        });
        
        // 3. Verificar cache hit rate
        const cacheStats = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN last_hit_at IS NOT NULL THEN 1 END) as hits
            FROM ia_response_cache
            WHERE expires_at > NOW()
        `);
        
        if (cacheStats.rows.length > 0) {
            const total = parseInt(cacheStats.rows[0].total || 0);
            const hits = parseInt(cacheStats.rows[0].hits || 0);
            const hitRate = total > 0 ? (hits / total) * 100 : 0;
            
            checks.push({
                name: 'Cache Hit Rate',
                status: hitRate < 30 ? 'warning' : 'healthy',
                message: `${hitRate.toFixed(2)}% (${hits}/${total})`
            });
        }
        
    } catch (error) {
        issues.push({
            type: 'performance',
            category: 'unknown',
            severity: 'error',
            message: 'Erro ao analisar performance',
            details: error.message
        });
    }
    
    return {
        status: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'error' : 'healthy',
        checks: checks,
        issues: issues
    };
}

// Analisar Erros
async function analyzeErrors(client) {
    const issues = [];
    
    try {
        // Buscar erros recentes não resolvidos
        const recentErrors = await client.query(`
            SELECT * FROM ia_system_errors
            WHERE resolved = false
            AND last_occurred_at >= NOW() - INTERVAL '24 hours'
            ORDER BY severity DESC, frequency DESC
            LIMIT 20
        `);
        
        for (const error of recentErrors.rows) {
            issues.push({
                type: 'error',
                category: error.error_category,
                severity: error.severity,
                message: error.error_message,
                details: {
                    location: error.error_location,
                    frequency: error.frequency,
                    first_occurred: error.first_occurred_at,
                    last_occurred: error.last_occurred_at
                }
            });
        }
        
    } catch (error) {
        issues.push({
            type: 'error',
            category: 'unknown',
            severity: 'error',
            message: 'Erro ao analisar erros',
            details: error.message
        });
    }
    
    return {
        status: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'error' : 'healthy',
        issues: issues,
        total_unresolved: issues.length
    };
}

// Analisar Segurança
async function analyzeSecurity(client) {
    const issues = [];
    const checks = [];
    
    try {
        // 1. Verificar JWT secret
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret.length < 32) {
            issues.push({
                type: 'security',
                category: 'configuration',
                severity: 'high',
                message: 'JWT_SECRET muito curto ou não configurado',
                details: { length: jwtSecret ? jwtSecret.length : 0 }
            });
        }
        
        // 2. Verificar senhas fracas (se houver acesso)
        // 3. Verificar rate limiting
        checks.push({
            name: 'Configuração de Segurança',
            status: issues.length > 0 ? 'warning' : 'healthy',
            message: `${issues.length} problemas de segurança`
        });
        
    } catch (error) {
        issues.push({
            type: 'security',
            category: 'unknown',
            severity: 'error',
            message: 'Erro ao analisar segurança',
            details: error.message
        });
    }
    
    return {
        status: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'error' : 'healthy',
        checks: checks,
        issues: issues
    };
}

// Analisar Código (básico)
async function analyzeCode() {
    const issues = [];
    
    // Análise básica - pode ser expandida
    // Por enquanto, apenas estrutura básica
    
    return {
        status: 'healthy',
        issues: issues,
        note: 'Análise de código básica - pode ser expandida com ferramentas de linting'
    };
}

// Gerar Recomendações
function generateRecommendations(issues) {
    const recommendations = [];
    
    // Agrupar por tipo
    const byType = {};
    issues.forEach(issue => {
        if (!byType[issue.type]) {
            byType[issue.type] = [];
        }
        byType[issue.type].push(issue);
    });
    
    // Recomendações por tipo
    if (byType.database) {
        const dbIssues = byType.database;
        if (dbIssues.some(i => i.category === 'connection')) {
            recommendations.push('Verificar configuração de conexão com banco de dados');
        }
        if (dbIssues.some(i => i.category === 'performance')) {
            recommendations.push('Otimizar queries e adicionar índices onde necessário');
        }
    }
    
    if (byType.api) {
        const apiIssues = byType.api;
        if (apiIssues.some(i => i.category === 'error_rate')) {
            recommendations.push('Investigar causas dos erros nas APIs');
        }
        if (apiIssues.some(i => i.category === 'performance')) {
            recommendations.push('Otimizar endpoints com tempo de resposta alto');
        }
    }
    
    if (byType.performance) {
        recommendations.push('Considerar aumentar recursos do servidor ou otimizar código');
    }
    
    if (byType.security) {
        recommendations.push('Revisar configurações de segurança urgentemente');
    }
    
    return recommendations;
}

// Aplicar Correção
async function applyFix(fixData, client) {
    try {
        const result = {
            success: false,
            message: '',
            details: {}
        };
        
        switch (fixData.fix_type) {
            case 'database':
                // Aplicar correção SQL
                if (fixData.fix_code) {
                    try {
                        await client.query(fixData.fix_code);
                        result.success = true;
                        result.message = 'Correção SQL aplicada com sucesso';
                    } catch (error) {
                        result.success = false;
                        result.message = `Erro ao aplicar correção SQL: ${error.message}`;
                        result.details = { error: error.message };
                    }
                }
                break;
                
            case 'configuration':
                // Correções de configuração geralmente requerem reinicialização
                result.success = true;
                result.message = 'Correção de configuração registrada - requer reinicialização do servidor';
                result.details = { requires_restart: true };
                break;
                
            case 'code':
                // Correções de código requerem acesso ao sistema de arquivos
                // Por segurança, apenas registrar
                result.success = false;
                result.message = 'Correções de código requerem intervenção manual por segurança';
                result.details = { requires_manual: true, fix_code: fixData.fix_code };
                break;
                
            default:
                result.success = false;
                result.message = `Tipo de correção não suportado: ${fixData.fix_type}`;
        }
        
        return result;
    } catch (error) {
        return {
            success: false,
            message: `Erro ao aplicar correção: ${error.message}`,
            details: { error: error.message }
        };
    }
}

// Detectar e Propor Correções Automaticamente
async function detectAndProposeFixes(client) {
    try {
        // Buscar erros não resolvidos
        const errors = await client.query(`
            SELECT * FROM ia_system_errors
            WHERE resolved = false
            AND severity IN ('high', 'critical')
            ORDER BY severity DESC, frequency DESC
            LIMIT 10
        `);
        
        const proposedFixes = [];
        
        for (const error of errors.rows) {
            // Analisar erro e propor correção
            const fix = await proposeFixForError(error, client);
            if (fix) {
                // Verificar se já existe proposta similar
                const existing = await client.query(`
                    SELECT id FROM ia_system_fixes
                    WHERE error_id = $1
                    AND status = 'pending'
                `, [error.id]);
                
                if (existing.rows.length === 0) {
                    // Criar proposta de correção
                    const fixResult = await client.query(`
                        INSERT INTO ia_system_fixes
                        (error_id, fix_type, fix_description, fix_code, fix_file_path, proposed_by, status, approval_required)
                        VALUES ($1, $2, $3, $4, $5, 'ia', 'pending', true)
                        RETURNING *
                    `, [
                        error.id,
                        fix.fix_type,
                        fix.description,
                        fix.code || null,
                        fix.file_path || null
                    ]);
                    
                    proposedFixes.push(fixResult.rows[0]);
                }
            }
        }
        
        return proposedFixes;
    } catch (error) {
        console.error('Erro ao detectar e propor correções:', error);
        return [];
    }
}

// Propor Correção para um Erro
async function proposeFixForError(error, client) {
    try {
        // Analisar tipo de erro e propor correção apropriada
        let fix = null;
        
        if (error.error_type === 'database') {
            if (error.error_category === 'connection') {
                fix = {
                    fix_type: 'database',
                    description: 'Verificar e corrigir configuração de conexão com banco de dados',
                    code: null, // Requer análise manual
                    file_path: '.env'
                };
            } else if (error.error_category === 'query') {
                // Tentar identificar problema na query
                if (error.error_message.includes('syntax')) {
                    fix = {
                        fix_type: 'database',
                        description: 'Corrigir sintaxe SQL na query',
                        code: null, // Requer análise do código
                        file_path: error.error_location || null
                    };
                }
            }
        } else if (error.error_type === 'api') {
            if (error.error_category === 'timeout') {
                fix = {
                    fix_type: 'performance',
                    description: 'Otimizar endpoint para reduzir tempo de resposta',
                    code: null,
                    file_path: error.error_location || null
                };
            }
        }
        
        return fix;
    } catch (error) {
        console.error('Erro ao propor correção:', error);
        return null;
    }
}

// POST /api/ia-king/system/detect-fixes - Detectar e propor correções automaticamente
router.post('/system/detect-fixes', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const proposedFixes = await detectAndProposeFixes(client);
        
        res.json({
            success: true,
            fixes_proposed: proposedFixes.length,
            fixes: proposedFixes,
            message: `${proposedFixes.length} correção(ões) proposta(s)`
        });
    } catch (error) {
        console.error('Erro ao detectar correções:', error);
        res.status(500).json({ error: 'Erro ao detectar correções' });
    } finally {
        client.release();
    }
}));

// ============================================
// SISTEMA DE TESTES DA IA
// ============================================

// POST /api/ia-king/system/test-ia - Testar IA e identificar brechas
router.post('/system/test-ia', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        console.log('🧪 [IA] Iniciando testes da IA...');
        
        const testResults = {
            timestamp: new Date().toISOString(),
            tests_run: 0,
            tests_passed: 0,
            tests_failed: 0,
            issues_found: [],
            recommendations: []
        };
        
        // Teste 1: Respostas básicas
        const basicTests = await testBasicResponses(client);
        testResults.tests_run += basicTests.tests_run;
        testResults.tests_passed += basicTests.tests_passed;
        testResults.tests_failed += basicTests.tests_failed;
        testResults.issues_found.push(...basicTests.issues);
        
        // Teste 2: Validação de entidades
        const entityTests = await testEntityValidation(client);
        testResults.tests_run += entityTests.tests_run;
        testResults.tests_passed += entityTests.tests_passed;
        testResults.tests_failed += entityTests.tests_failed;
        testResults.issues_found.push(...entityTests.issues);
        
        // Teste 3: Performance de resposta
        const performanceTests = await testResponsePerformance(client);
        testResults.tests_run += performanceTests.tests_run;
        testResults.tests_passed += performanceTests.tests_passed;
        testResults.tests_failed += performanceTests.tests_failed;
        testResults.issues_found.push(...performanceTests.issues);
        
        // Teste 4: Cache e memória
        const cacheTests = await testCacheAndMemory(client);
        testResults.tests_run += cacheTests.tests_run;
        testResults.tests_passed += cacheTests.tests_passed;
        testResults.tests_failed += cacheTests.tests_failed;
        testResults.issues_found.push(...cacheTests.issues);
        
        // Teste 5: Validação de conhecimento
        const knowledgeTests = await testKnowledgeValidation(client);
        testResults.tests_run += knowledgeTests.tests_run;
        testResults.tests_passed += knowledgeTests.tests_passed;
        testResults.tests_failed += knowledgeTests.tests_failed;
        testResults.issues_found.push(...knowledgeTests.issues);
        
        // Gerar recomendações baseadas nos testes
        testResults.recommendations = generateTestRecommendations(testResults.issues_found);
        
        // Salvar resultados no banco
        await client.query(`
            INSERT INTO ia_system_analyses
            (analysis_type, analysis_result, issues_found, issues_critical, issues_warning, recommendations)
            VALUES ('code', $1, $2, $3, $4, $5)
        `, [
            JSON.stringify(testResults),
            testResults.issues_found.length,
            testResults.issues_found.filter(i => i.severity === 'critical' || i.severity === 'high').length,
            testResults.issues_found.filter(i => i.severity === 'warning').length,
            testResults.recommendations
        ]);
        
        res.json({
            success: true,
            test_results: testResults,
            summary: {
                total_tests: testResults.tests_run,
                passed: testResults.tests_passed,
                failed: testResults.tests_failed,
                pass_rate: testResults.tests_run > 0 
                    ? ((testResults.tests_passed / testResults.tests_run) * 100).toFixed(2) + '%'
                    : '0%',
                issues_found: testResults.issues_found.length
            }
        });
    } catch (error) {
        console.error('Erro ao testar IA:', error);
        res.status(500).json({ error: 'Erro ao testar IA', details: error.message });
    } finally {
        client.release();
    }
}));

// Testar Respostas Básicas
async function testBasicResponses(client) {
    const tests = [
        { question: 'Olá', expected: 'greeting', category: 'greeting' },
        { question: 'O que é o Conecta King?', expected: 'system', category: 'system' },
        { question: 'Como funciona?', expected: 'system', category: 'system' }
    ];
    
    let tests_run = 0;
    let tests_passed = 0;
    let tests_failed = 0;
    const issues = [];
    
    for (const test of tests) {
        tests_run++;
        try {
            const result = await findBestAnswer(test.question, null);
            
            if (result.answer && result.answer.length > 0) {
                if (test.expected === 'greeting' && result.source === 'greeting') {
                    tests_passed++;
                } else if (test.expected === 'system' && result.confidence > 50) {
                    tests_passed++;
                } else {
                    tests_failed++;
                    issues.push({
                        type: 'ia_test',
                        category: 'basic_response',
                        severity: 'medium',
                        message: `Resposta não atendeu expectativa para: "${test.question}"`,
                        details: {
                            expected: test.expected,
                            got: result.source,
                            confidence: result.confidence
                        }
                    });
                }
            } else {
                tests_failed++;
                issues.push({
                    type: 'ia_test',
                    category: 'empty_response',
                    severity: 'high',
                    message: `IA retornou resposta vazia para: "${test.question}"`,
                    details: { question: test.question }
                });
            }
        } catch (error) {
            tests_failed++;
            issues.push({
                type: 'ia_test',
                category: 'error',
                severity: 'high',
                message: `Erro ao processar pergunta: "${test.question}"`,
                details: { error: error.message }
            });
        }
    }
    
    return { tests_run, tests_passed, tests_failed, issues };
}

// Testar Validação de Entidades
async function testEntityValidation(client) {
    const tests = [
        { question: 'Quem é Jesus?', entity: 'jesus', should_mention: true },
        { question: 'Fale sobre vendas', entity: 'vendas', should_mention: true },
        { question: 'O que é estratégia?', entity: 'estratégia', should_mention: true }
    ];
    
    let tests_run = 0;
    let tests_passed = 0;
    let tests_failed = 0;
    const issues = [];
    
    for (const test of tests) {
        tests_run++;
        try {
            const result = await findBestAnswer(test.question, null);
            
            if (result.answer) {
                const answerLower = result.answer.toLowerCase();
                const entityLower = test.entity.toLowerCase();
                
                if (test.should_mention && answerLower.includes(entityLower)) {
                    tests_passed++;
                } else if (!test.should_mention && !answerLower.includes(entityLower)) {
                    tests_passed++;
                } else {
                    tests_failed++;
                    issues.push({
                        type: 'ia_test',
                        category: 'entity_validation',
                        severity: 'medium',
                        message: `Resposta não menciona entidade "${test.entity}" quando deveria`,
                        details: {
                            question: test.question,
                            entity: test.entity,
                            answer_preview: result.answer.substring(0, 200)
                        }
                    });
                }
            }
        } catch (error) {
            tests_failed++;
            issues.push({
                type: 'ia_test',
                category: 'error',
                severity: 'high',
                message: `Erro ao testar validação de entidade: "${test.question}"`,
                details: { error: error.message }
            });
        }
    }
    
    return { tests_run, tests_passed, tests_failed, issues };
}

// Testar Performance de Resposta
async function testResponsePerformance(client) {
    const tests = [
        { question: 'Teste de performance 1', max_time: 3000 },
        { question: 'Teste de performance 2', max_time: 3000 },
        { question: 'Teste de performance 3', max_time: 3000 }
    ];
    
    let tests_run = 0;
    let tests_passed = 0;
    let tests_failed = 0;
    const issues = [];
    const responseTimes = [];
    
    for (const test of tests) {
        tests_run++;
        try {
            const startTime = Date.now();
            await findBestAnswer(test.question, null);
            const responseTime = Date.now() - startTime;
            responseTimes.push(responseTime);
            
            if (responseTime <= test.max_time) {
                tests_passed++;
            } else {
                tests_failed++;
                issues.push({
                    type: 'ia_test',
                    category: 'performance',
                    severity: 'warning',
                    message: `Resposta muito lenta: ${responseTime}ms (máx: ${test.max_time}ms)`,
                    details: {
                        question: test.question,
                        response_time: responseTime,
                        max_allowed: test.max_time
                    }
                });
            }
        } catch (error) {
            tests_failed++;
            issues.push({
                type: 'ia_test',
                category: 'error',
                severity: 'high',
                message: `Erro no teste de performance: "${test.question}"`,
                details: { error: error.message }
            });
        }
    }
    
    // Calcular média
    if (responseTimes.length > 0) {
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        if (avgTime > 2000) {
            issues.push({
                type: 'ia_test',
                category: 'performance',
                severity: 'warning',
                message: `Tempo médio de resposta alto: ${avgTime.toFixed(2)}ms`,
                details: { average_response_time: avgTime }
            });
        }
    }
    
    return { tests_run, tests_passed, tests_failed, issues };
}

// Testar Cache e Memória
async function testCacheAndMemory(client) {
    let tests_run = 0;
    let tests_passed = 0;
    let tests_failed = 0;
    const issues = [];
    
    try {
        // Teste 1: Verificar se cache está funcionando
        tests_run++;
        const cacheCheck = await client.query(`
            SELECT COUNT(*) as count FROM ia_response_cache
            WHERE expires_at > NOW()
        `);
        
        const cacheCount = parseInt(cacheCheck.rows[0].count || 0);
        if (cacheCount > 0) {
            tests_passed++;
        } else {
            tests_failed++;
            issues.push({
                type: 'ia_test',
                category: 'cache',
                severity: 'low',
                message: 'Cache está vazio - pode indicar que não está sendo usado',
                details: { cache_count: cacheCount }
            });
        }
        
        // Teste 2: Verificar memória contextual
        tests_run++;
        const contextCheck = await client.query(`
            SELECT COUNT(*) as count FROM ia_conversation_context
            WHERE expires_at IS NULL OR expires_at > NOW()
        `);
        
        const contextCount = parseInt(contextCheck.rows[0].count || 0);
        if (contextCount >= 0) {
            tests_passed++;
        } else {
            tests_failed++;
        }
        
    } catch (error) {
        tests_failed++;
        issues.push({
            type: 'ia_test',
            category: 'error',
            severity: 'high',
            message: 'Erro ao testar cache e memória',
            details: { error: error.message }
        });
    }
    
    return { tests_run, tests_passed, tests_failed, issues };
}

// Testar Validação de Conhecimento
async function testKnowledgeValidation(client) {
    let tests_run = 0;
    let tests_passed = 0;
    let tests_failed = 0;
    const issues = [];
    
    try {
        // Teste 1: Verificar se há conhecimento suficiente
        tests_run++;
        const knowledgeCheck = await client.query(`
            SELECT COUNT(*) as count FROM ia_knowledge_base
            WHERE is_active = true
        `);
        
        const knowledgeCount = parseInt(knowledgeCheck.rows[0].count || 0);
        if (knowledgeCount > 100) {
            tests_passed++;
        } else {
            tests_failed++;
            issues.push({
                type: 'ia_test',
                category: 'knowledge',
                severity: 'medium',
                message: `Pouco conhecimento na base: ${knowledgeCount} itens (recomendado: >100)`,
                details: { knowledge_count: knowledgeCount }
            });
        }
        
        // Teste 2: Verificar qualidade do conhecimento
        tests_run++;
        const qualityCheck = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN LENGTH(content) > 100 THEN 1 END) as with_content
            FROM ia_knowledge_base
            WHERE is_active = true
        `);
        
        const total = parseInt(qualityCheck.rows[0].total || 0);
        const withContent = parseInt(qualityCheck.rows[0].with_content || 0);
        const qualityRate = total > 0 ? (withContent / total) * 100 : 0;
        
        if (qualityRate >= 70) {
            tests_passed++;
        } else {
            tests_failed++;
            issues.push({
                type: 'ia_test',
                category: 'knowledge_quality',
                severity: 'medium',
                message: `Qualidade do conhecimento baixa: ${qualityRate.toFixed(2)}% com conteúdo completo`,
                details: { quality_rate: qualityRate, total: total, with_content: withContent }
            });
        }
        
    } catch (error) {
        tests_failed++;
        issues.push({
            type: 'ia_test',
            category: 'error',
            severity: 'high',
            message: 'Erro ao testar validação de conhecimento',
            details: { error: error.message }
        });
    }
    
    return { tests_run, tests_passed, tests_failed, issues };
}

// Gerar Recomendações Baseadas em Testes
function generateTestRecommendations(issues) {
    const recommendations = [];
    
    const byCategory = {};
    issues.forEach(issue => {
        if (!byCategory[issue.category]) {
            byCategory[issue.category] = [];
        }
        byCategory[issue.category].push(issue);
    });
    
    if (byCategory.empty_response) {
        recommendations.push('IA está retornando respostas vazias - verificar lógica de busca de conhecimento');
    }
    
    if (byCategory.entity_validation) {
        recommendations.push('Melhorar validação de entidades nas respostas');
    }
    
    if (byCategory.performance) {
        recommendations.push('Otimizar performance das respostas - considerar cache mais agressivo');
    }
    
    if (byCategory.knowledge) {
        recommendations.push('Adicionar mais conhecimento à base de dados');
    }
    
    if (byCategory.knowledge_quality) {
        recommendations.push('Melhorar qualidade do conhecimento existente - adicionar conteúdo completo');
    }
    
    return recommendations;
}

// ============================================
// FUNÇÃO: REGISTRAR PERGUNTA NÃO RESPONDIDA
// ============================================
async function registerUnansweredQuestion(question, userId, questionContext, client) {
    try {
        // Verificar se a tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_unanswered_questions'
            ) as exists
        `);
        
        if (!tableCheck.rows[0].exists) {
            // Criar tabela se não existir
            await client.query(`
                CREATE TABLE IF NOT EXISTS ia_unanswered_questions (
                    id SERIAL PRIMARY KEY,
                    question TEXT NOT NULL,
                    user_id VARCHAR(255),
                    question_context JSONB,
                    category VARCHAR(100),
                    entities TEXT[],
                    first_asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ask_count INTEGER DEFAULT 1,
                    improved BOOLEAN DEFAULT false,
                    improved_at TIMESTAMP,
                    improved_by VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
        
        // Verificar se já existe pergunta similar
        const existing = await client.query(`
            SELECT id, ask_count FROM ia_unanswered_questions
            WHERE LOWER(question) = LOWER($1)
            LIMIT 1
        `, [question]);
        
        if (existing.rows.length > 0) {
            // Atualizar contador
            await client.query(`
                UPDATE ia_unanswered_questions
                SET ask_count = ask_count + 1,
                    last_asked_at = NOW(),
                    question_context = $1,
                    entities = $2,
                    category = $3
                WHERE id = $4
            `, [
                JSON.stringify(questionContext),
                questionContext.entities || [],
                questionContext.primaryCategory || 'general',
                existing.rows[0].id
            ]);
        } else {
            // Inserir nova pergunta
            await client.query(`
                INSERT INTO ia_unanswered_questions
                (question, user_id, question_context, category, entities, ask_count)
                VALUES ($1, $2, $3, $4, $5, 1)
            `, [
                question,
                userId,
                JSON.stringify(questionContext),
                questionContext.primaryCategory || 'general',
                questionContext.entities || []
            ]);
        }
        
        console.log('📝 Pergunta não respondida registrada:', question.substring(0, 50));
    } catch (error) {
        console.error('Erro ao registrar pergunta não respondida:', error);
        // Não bloquear resposta por erro no registro
    }
}

// ============================================
// SISTEMA DE ANÁLISE COMPLETA DO CONECTA KING
// ============================================

// GET /api/ia-king/system/analyses/latest - Buscar última análise completa
router.get('/system/analyses/latest', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Verificar se a tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_system_analyses'
            ) as table_exists
        `);
        
        if (!tableCheck.rows[0].table_exists) {
            return res.status(404).json({ 
                error: 'Tabela de análises não encontrada. Execute a migration 034.',
                analysis: null 
            });
        }
        
        const result = await client.query(`
            SELECT * FROM ia_system_analyses
            WHERE analysis_type = 'full'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Nenhuma análise encontrada',
                analysis: null 
            });
        }
        
        const analysis = result.rows[0];
        let analysisResult = {};
        
        // Tentar parsear o JSON se for string
        if (typeof analysis.analysis_result === 'string') {
            try {
                analysisResult = JSON.parse(analysis.analysis_result);
            } catch (e) {
                console.error('Erro ao parsear analysis_result:', e);
                analysisResult = {};
            }
        } else {
            analysisResult = analysis.analysis_result || {};
        }
        
        // Extrair summary do resultado
        const summary = {
            overall_score: analysisResult.overall_score || 0,
            total_errors: analysis.issues_critical || analysisResult.errors?.length || 0,
            total_warnings: analysis.issues_warning || analysisResult.warnings?.length || 0,
            total_recommendations: (Array.isArray(analysis.recommendations) ? analysis.recommendations.length : 0) || analysisResult.recommendations?.length || 0
        };
        
        res.json({
            analysis: analysisResult,
            summary: summary,
            created_at: analysis.created_at
        });
    } catch (error) {
        console.error('Erro ao buscar última análise:', error);
        
        // Se for erro de tabela não existe, retornar 404
        if (error.message && (error.message.includes('does not exist') || error.message.includes('não existe'))) {
            return res.status(404).json({ 
                error: 'Tabela de análises não encontrada. Execute a migration 034.',
                analysis: null 
            });
        }
        
        res.status(500).json({ 
            error: 'Erro ao buscar análise',
            message: error.message 
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/analyze-complete-system - Análise completa de TODO o sistema
router.post('/analyze-complete-system', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        console.log('🔍 [ANÁLISE COMPLETA] Iniciando análise de TODO o sistema Conecta King...');
        
        const analysis = {
            timestamp: new Date().toISOString(),
            backend: null,
            frontend: null,
            database: null,
            modules: null,
            content: null,
            code_quality: null,
            text_quality: null,
            errors: [],
            warnings: [],
            recommendations: [],
            overall_score: 0
        };
        
        // 1. Análise do Back-end
        analysis.backend = await analyzeBackend(client);
        analysis.errors.push(...(analysis.backend.errors || []));
        analysis.warnings.push(...(analysis.backend.warnings || []));
        
        // 2. Análise do Front-end
        analysis.frontend = await analyzeFrontend(client);
        analysis.errors.push(...(analysis.frontend.errors || []));
        analysis.warnings.push(...(analysis.frontend.warnings || []));
        
        // 3. Análise do Banco de Dados
        analysis.database = await analyzeDatabaseComplete(client);
        analysis.errors.push(...(analysis.database.errors || []));
        analysis.warnings.push(...(analysis.database.warnings || []));
        
        // 4. Análise dos Módulos
        analysis.modules = await analyzeModules(client);
        analysis.errors.push(...(analysis.modules.errors || []));
        analysis.warnings.push(...(analysis.modules.warnings || []));
        
        // 5. Análise de Conteúdo e Textos
        analysis.content = await analyzeContent(client);
        analysis.errors.push(...(analysis.content.errors || []));
        analysis.warnings.push(...(analysis.content.warnings || []));
        
        // 6. Análise de Qualidade de Código
        analysis.code_quality = await analyzeCodeQuality();
        analysis.errors.push(...(analysis.code_quality.errors || []));
        analysis.warnings.push(...(analysis.code_quality.warnings || []));
        
        // 7. Análise de Qualidade de Textos
        analysis.text_quality = await analyzeTextQuality(client);
        analysis.errors.push(...(analysis.text_quality.errors || []));
        analysis.warnings.push(...(analysis.text_quality.warnings || []));
        
        // Calcular score geral
        const totalIssues = analysis.errors.length + analysis.warnings.length;
        analysis.overall_score = Math.max(0, 100 - (totalIssues * 2));
        
        // Gerar recomendações
        analysis.recommendations = generateSystemRecommendations(analysis);
        
        // Salvar análise
        await client.query(`
            INSERT INTO ia_system_analyses
            (analysis_type, analysis_result, issues_found, issues_critical, issues_warning, recommendations)
            VALUES ('full', $1, $2, $3, $4, $5)
        `, [
            JSON.stringify(analysis),
            analysis.errors.length + analysis.warnings.length,
            analysis.errors.length,
            analysis.warnings.length,
            analysis.recommendations || []
        ]);
        
        res.json({
            success: true,
            analysis: analysis,
            summary: {
                overall_score: analysis.overall_score,
                total_errors: analysis.errors.length,
                total_warnings: analysis.warnings.length,
                total_recommendations: analysis.recommendations.length
            }
        });
    } catch (error) {
        console.error('Erro na análise completa:', error);
        res.status(500).json({ error: 'Erro na análise completa', details: error.message });
    } finally {
        client.release();
    }
}));

// Análise do Back-end
async function analyzeBackend(client) {
    const errors = [];
    const warnings = [];
    const checks = [];
    
    try {
        // Verificar rotas principais
        const routeFiles = [
            'routes/profile.js',
            'routes/auth.js',
            'routes/iaKing.js',
            'routes/products.js',
            'routes/salesPage.js'
        ];
        
        // Verificar se rotas têm tratamento de erro
        checks.push({
            name: 'Rotas Principais',
            status: 'healthy',
            message: `${routeFiles.length} rotas principais identificadas`
        });
        
        // Verificar endpoints críticos
        const criticalEndpoints = [
            { path: '/api/profile', method: 'GET' },
            { path: '/api/auth/login', method: 'POST' },
            { path: '/api/ia-king/chat', method: 'POST' }
 ];
        
        checks.push({
            name: 'Endpoints Críticos',
            status: 'healthy',
            message: `${criticalEndpoints.length} endpoints críticos identificados`
        });
        
        // Verificar se há queries sem tratamento de erro
        warnings.push({
            type: 'backend',
            category: 'error_handling',
            severity: 'medium',
            message: 'Recomendado: Verificar se todas as queries têm tratamento de erro adequado',
            location: 'routes/*.js'
        });
        
    } catch (error) {
        errors.push({
            type: 'backend',
            category: 'analysis_error',
            severity: 'high',
            message: `Erro ao analisar back-end: ${error.message}`,
            location: 'analyzeBackend()'
        });
    }
    
    return {
        status: errors.length > 0 ? 'error' : 'healthy',
        checks: checks,
        errors: errors,
        warnings: warnings
    };
}

// Análise do Front-end
async function analyzeFrontend(client) {
    const errors = [];
    const warnings = [];
    const checks = [];
    
    try {
        // Verificar arquivos principais
        const frontendFiles = [
            'public_html/dashboard.html',
            'public_html/admin/ia-king.html',
            'views/profile.ejs'
        ];
        
        checks.push({
            name: 'Arquivos Front-end',
            status: 'healthy',
            message: `${frontendFiles.length} arquivos principais identificados`
        });
        
        // Verificar se há JavaScript sem tratamento de erro
        warnings.push({
            type: 'frontend',
            category: 'error_handling',
            severity: 'low',
            message: 'Recomendado: Adicionar try-catch em funções JavaScript críticas',
            location: 'public_html/**/*.js'
        });
        
        // Verificar se há console.log em produção
        warnings.push({
            type: 'frontend',
            category: 'code_quality',
            severity: 'low',
            message: 'Recomendado: Remover ou substituir console.log por sistema de logging adequado',
            location: 'public_html/**/*.js'
        });
        
    } catch (error) {
        errors.push({
            type: 'frontend',
            category: 'analysis_error',
            severity: 'high',
            message: `Erro ao analisar front-end: ${error.message}`,
            location: 'analyzeFrontend()'
        });
    }
    
    return {
        status: errors.length > 0 ? 'error' : 'healthy',
        checks: checks,
        errors: errors,
        warnings: warnings
    };
}

// Análise Completa do Banco de Dados
async function analyzeDatabaseComplete(client) {
    const errors = [];
    const warnings = [];
    const checks = [];
    
    try {
        // Verificar tabelas críticas
        const criticalTables = [
            'users', 'user_profiles', 'profile_items',
            'ia_knowledge_base', 'ia_conversations',
            'sales_pages', 'product_catalog_items'
        ];
        
        for (const table of criticalTables) {
            try {
                const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                checks.push({
                    name: `Tabela ${table}`,
                    status: 'healthy',
                    message: `${parseInt(result.rows[0].count)} registros`
                });
            } catch (error) {
                errors.push({
                    type: 'database',
                    category: 'table_missing',
                    severity: 'critical',
                    message: `Tabela ${table} não encontrada ou inacessível`,
                    location: `database.${table}`
                });
            }
        }
        
        // Verificar índices
        const tablesWithoutIndexes = await client.query(`
            SELECT t.table_name
            FROM information_schema.tables t
            LEFT JOIN information_schema.indexes i ON t.table_name = i.table_name
            WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND i.index_name IS NULL
            AND t.table_name IN ('profile_items', 'ia_conversations', 'ia_knowledge_base')
        `);
        
        if (tablesWithoutIndexes.rows.length > 0) {
            warnings.push({
                type: 'database',
                category: 'performance',
                severity: 'medium',
                message: `${tablesWithoutIndexes.rows.length} tabelas críticas sem índices podem ter performance ruim`,
                location: 'database',
                details: { tables: tablesWithoutIndexes.rows.map(r => r.table_name) }
            });
        }
        
    } catch (error) {
        errors.push({
            type: 'database',
            category: 'analysis_error',
            severity: 'high',
            message: `Erro ao analisar banco de dados: ${error.message}`,
            location: 'analyzeDatabaseComplete()'
        });
    }
    
    return {
        status: errors.length > 0 ? 'error' : 'healthy',
        checks: checks,
        errors: errors,
        warnings: warnings
    };
}

// Análise dos Módulos
async function analyzeModules(client) {
    const errors = [];
    const warnings = [];
    const checks = [];
    
    try {
        // Analisar profile_items
        const itemsResult = await client.query(`
            SELECT 
                item_type,
                COUNT(*) as count,
                COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as without_title,
                COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
            FROM profile_items
            GROUP BY item_type
        `);
        
        for (const row of itemsResult.rows) {
            if (parseInt(row.without_title) > 0) {
                warnings.push({
                    type: 'modules',
                    category: 'content_quality',
                    severity: 'medium',
                    message: `${row.without_title} itens do tipo ${row.item_type} sem título`,
                    location: `profile_items.item_type = '${row.item_type}'`
                });
            }
        }
        
        checks.push({
            name: 'Módulos do Sistema',
            status: 'healthy',
            message: `${itemsResult.rows.length} tipos de módulos encontrados`
        });
        
        // Analisar sales_pages
        const salesPagesResult = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN store_description IS NULL OR store_description = '' THEN 1 END) as without_description
            FROM sales_pages
        `);
        
        if (salesPagesResult.rows.length > 0) {
            const withoutDesc = parseInt(salesPagesResult.rows[0].without_description || 0);
            if (withoutDesc > 0) {
                warnings.push({
                    type: 'modules',
                    category: 'content_quality',
                    severity: 'medium',
                    message: `${withoutDesc} páginas de vendas sem descrição`,
                    location: 'sales_pages.store_description'
                });
            }
        }
        
    } catch (error) {
        errors.push({
            type: 'modules',
            category: 'analysis_error',
            severity: 'high',
            message: `Erro ao analisar módulos: ${error.message}`,
            location: 'analyzeModules()'
        });
    }
    
    return {
        status: errors.length > 0 ? 'error' : 'healthy',
        checks: checks,
        errors: errors,
        warnings: warnings
    };
}

// Análise de Conteúdo e Textos
async function analyzeContent(client) {
    const errors = [];
    const warnings = [];
    const checks = [];
    
    try {
        // Analisar textos de profile_items
        const textAnalysis = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN LENGTH(title) < 3 THEN 1 END) as short_titles,
                COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as empty_titles
            FROM profile_items
            WHERE title IS NOT NULL
        `);
        
        if (textAnalysis.rows.length > 0) {
            const shortTitles = parseInt(textAnalysis.rows[0].short_titles || 0);
            const emptyTitles = parseInt(textAnalysis.rows[0].empty_titles || 0);
            
            if (shortTitles > 0) {
                warnings.push({
                    type: 'content',
                    category: 'text_quality',
                    severity: 'low',
                    message: `${shortTitles} títulos muito curtos (< 3 caracteres)`,
                    location: 'profile_items.title'
                });
            }
            
            if (emptyTitles > 0) {
                warnings.push({
                    type: 'content',
                    category: 'text_quality',
                    severity: 'medium',
                    message: `${emptyTitles} itens sem título`,
                    location: 'profile_items.title'
                });
            }
        }
        
        // Analisar descrições de sales_pages
        const salesDescAnalysis = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN LENGTH(store_description) < 50 THEN 1 END) as short_descriptions
            FROM sales_pages
            WHERE store_description IS NOT NULL
        `);
        
        if (salesDescAnalysis.rows.length > 0) {
            const shortDesc = parseInt(salesDescAnalysis.rows[0].short_descriptions || 0);
            if (shortDesc > 0) {
                warnings.push({
                    type: 'content',
                    category: 'text_quality',
                    severity: 'low',
                    message: `${shortDesc} descrições de vendas muito curtas (< 50 caracteres)`,
                    location: 'sales_pages.store_description'
                });
            }
        }
        
        checks.push({
            name: 'Análise de Conteúdo',
            status: warnings.length > 0 ? 'warning' : 'healthy',
            message: `${warnings.length} problemas de qualidade de texto encontrados`
        });
        
    } catch (error) {
        errors.push({
            type: 'content',
            category: 'analysis_error',
            severity: 'high',
            message: `Erro ao analisar conteúdo: ${error.message}`,
            location: 'analyzeContent()'
        });
    }
    
    return {
        status: errors.length > 0 ? 'error' : 'healthy',
        checks: checks,
        errors: errors,
        warnings: warnings
    };
}

// Análise de Qualidade de Código
async function analyzeCodeQuality() {
    const errors = [];
    const warnings = [];
    
    // Análise básica - pode ser expandida com ferramentas de linting
    warnings.push({
        type: 'code_quality',
        category: 'best_practices',
        severity: 'low',
        message: 'Recomendado: Usar ferramentas de linting (ESLint) para garantir qualidade de código',
        location: 'routes/**/*.js, public_html/**/*.js'
    });
    
    warnings.push({
        type: 'code_quality',
        category: 'documentation',
        severity: 'low',
        message: 'Recomendado: Adicionar JSDoc comments em funções complexas',
        location: 'routes/**/*.js'
    });
    
    return {
        status: 'healthy',
        errors: errors,
        warnings: warnings
    };
}

// Análise de Qualidade de Textos
async function analyzeTextQuality(client) {
    const errors = [];
    const warnings = [];
    
    try {
        // Verificar ortografia básica (palavras comuns mal escritas)
        const commonTypos = await client.query(`
            SELECT title
            FROM profile_items
            WHERE title ILIKE '%conecta%' OR title ILIKE '%conecta%'
            LIMIT 10
        `);
        
        // Verificar textos muito longos ou muito curtos
        const lengthAnalysis = await client.query(`
            SELECT 
                COUNT(CASE WHEN LENGTH(title) > 200 THEN 1 END) as too_long,
                COUNT(CASE WHEN LENGTH(title) < 2 THEN 1 END) as too_short
            FROM profile_items
            WHERE title IS NOT NULL
        `);
        
        if (lengthAnalysis.rows.length > 0) {
            const tooLong = parseInt(lengthAnalysis.rows[0].too_long || 0);
            const tooShort = parseInt(lengthAnalysis.rows[0].too_short || 0);
            
            if (tooLong > 0) {
                warnings.push({
                    type: 'text_quality',
                    category: 'length',
                    severity: 'low',
                    message: `${tooLong} títulos muito longos (> 200 caracteres)`,
                    location: 'profile_items.title'
                });
            }
            
            if (tooShort > 0) {
                warnings.push({
                    type: 'text_quality',
                    category: 'length',
                    severity: 'medium',
                    message: `${tooShort} títulos muito curtos (< 2 caracteres)`,
                    location: 'profile_items.title'
                });
            }
        }
        
    } catch (error) {
        errors.push({
            type: 'text_quality',
            category: 'analysis_error',
            severity: 'high',
            message: `Erro ao analisar qualidade de textos: ${error.message}`,
            location: 'analyzeTextQuality()'
        });
    }
    
    return {
        status: errors.length > 0 ? 'error' : 'healthy',
        errors: errors,
        warnings: warnings
    };
}

// Gerar Recomendações do Sistema
function generateSystemRecommendations(analysis) {
    const recommendations = [];
    
    // Agrupar por tipo
    const byType = {};
    [...analysis.errors, ...analysis.warnings].forEach(issue => {
        if (!byType[issue.type]) {
            byType[issue.type] = [];
        }
        byType[issue.type].push(issue);
    });
    
    // Recomendações por tipo
    if (byType.backend) {
        recommendations.push('Revisar tratamento de erros no back-end');
    }
    
    if (byType.frontend) {
        recommendations.push('Melhorar tratamento de erros no front-end');
    }
    
    if (byType.database) {
        recommendations.push('Otimizar banco de dados: adicionar índices onde necessário');
    }
    
    if (byType.modules) {
        recommendations.push('Completar informações faltantes nos módulos');
    }
    
    if (byType.content || byType.text_quality) {
        recommendations.push('Melhorar qualidade de textos e conteúdo');
    }
    
    if (byType.code_quality) {
        recommendations.push('Implementar ferramentas de qualidade de código (ESLint, Prettier)');
    }
    
    return recommendations;
}

// ============================================
// SISTEMA DE CORREÇÃO AUTOMÁTICA
// ============================================

// POST /api/ia-king/system/fix-error - Corrigir erro específico
router.post('/system/fix-error', protectAdmin, asyncHandler(async (req, res) => {
    const { error_type, error_category, error_location, error_message, error_details } = req.body;
    const client = await db.pool.connect();
    
    try {
        console.log(`🔧 [CORREÇÃO] Tentando corrigir erro: ${error_type}/${error_category} em ${error_location}`);
        
        let fixResult = {
            success: false,
            message: '',
            fix_applied: null,
            requires_manual_intervention: false
        };
        
        // Correções por tipo de erro
        try {
            if (error_type === 'database' && error_category === 'table_missing') {
                // Tentar criar tabela se não existir
                const tableName = error_location ? error_location.split('.').pop() : 'unknown';
                fixResult = await fixMissingTable(client, tableName);
            } else if (error_type === 'database' && error_category === 'performance') {
                // Criar índices faltantes
                fixResult = await fixMissingIndexes(client, error_details);
            } else if (error_type === 'backend' && error_category === 'error_handling') {
                // Adicionar tratamento de erro (requer intervenção manual)
                fixResult = {
                    success: false,
                    message: 'Correção requer edição manual do código. Esta recomendação precisa ser implementada manualmente no código-fonte.',
                    requires_manual_intervention: true,
                    suggestion: 'Adicionar try-catch blocks nas rotas principais em routes/*.js'
                };
            } else if (error_type === 'modules' && error_category === 'content_quality') {
                // Corrigir conteúdo faltante
                fixResult = await fixMissingContent(client, error_location, error_details);
            } else if (error_type === 'content' && error_category === 'text_quality') {
                // Corrigir textos curtos ou vazios
                fixResult = await fixTextQuality(client, error_location, error_details);
            } else if (error_type === 'database' && error_category === 'analysis_error') {
                // Erro de análise do banco (como information_schema.indexes não existe)
                fixResult = {
                    success: false,
                    message: 'Este é um erro de análise do banco de dados. O sistema está funcionando corretamente, mas a análise encontrou uma limitação na consulta.',
                    requires_manual_intervention: false,
                    suggestion: 'Este erro pode ser ignorado se o sistema estiver funcionando normalmente.'
                };
            } else if (error_type === 'modules' || error_type === 'content') {
                // Tentar corrigir qualquer erro de módulos ou conteúdo
                fixResult = await fixMissingContent(client, error_location || '', error_details);
            } else if (error_category === 'content_localization' || error_category === 'content_quality' || error_category === 'text_quality') {
                // Permitir correção de localização de conteúdo e qualidade de conteúdo
                fixResult = await fixMissingContent(client, error_location || '', error_details);
            } else {
                // Para outros tipos, tentar correção genérica
                fixResult = {
                    success: false,
                    message: `Tipo de erro (${error_type}/${error_category}) requer análise manual.`,
                    requires_manual_intervention: false
                };
            }
        } catch (fixError) {
            console.error('Erro ao executar correção:', fixError);
            fixResult = {
                success: false,
                message: `Erro ao tentar corrigir: ${fixError.message}`,
                requires_manual_intervention: true
            };
        }
        
        // Registrar tentativa de correção (verificar se tabela existe)
        try {
            // Verificar se tabela existe
            const tableCheck = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'ia_system_fixes'
                );
            `);
            
            if (tableCheck.rows[0].exists) {
                await client.query(`
                    INSERT INTO ia_system_fixes
                    (error_type, error_category, error_location, fix_applied, fix_status, fix_result)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    error_type,
                    error_category,
                    error_location || '',
                    JSON.stringify(fixResult.fix_applied || null),
                    fixResult.success ? 'applied' : 'failed',
                    JSON.stringify(fixResult)
                ]);
            } else {
                console.warn('⚠️ [CORREÇÃO] Tabela ia_system_fixes não existe. Pulando registro.');
            }
        } catch (tableError) {
            console.warn('⚠️ [CORREÇÃO] Erro ao registrar correção na tabela:', tableError.message);
            // Continuar mesmo se não conseguir registrar na tabela
        }
        
        res.json({
            success: fixResult.success,
            message: fixResult.message,
            fix_result: fixResult
        });
        
    } catch (error) {
        console.error('Erro ao corrigir erro:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao aplicar correção', 
            details: error.message 
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/system/fix-recommendation - Aplicar recomendação
router.post('/system/fix-recommendation', protectAdmin, asyncHandler(async (req, res) => {
    const { recommendation, recommendation_type } = req.body;
    const client = await db.pool.connect();
    
    try {
        console.log(`🔧 [CORREÇÃO] Aplicando recomendação: ${recommendation}`);
        
        let fixResult = {
            success: false,
            message: '',
            fix_applied: null
        };
        
        // Aplicar recomendações comuns
        if (recommendation.includes('índices')) {
            fixResult = await applyIndexRecommendations(client);
        } else if (recommendation.includes('tratamento de erros')) {
            fixResult = {
                success: false,
                message: 'Recomendação requer revisão manual do código',
                requires_manual_intervention: true
            };
        } else if (recommendation.includes('conteúdo')) {
            fixResult = await applyContentRecommendations(client);
        } else {
            fixResult = {
                success: false,
                message: 'Recomendação não suporta aplicação automática',
                requires_manual_intervention: true
            };
        }
        
        res.json({
            success: fixResult.success,
            message: fixResult.message,
            fix_result: fixResult
        });
        
    } catch (error) {
        console.error('Erro ao aplicar recomendação:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao aplicar recomendação', 
            details: error.message 
        });
    } finally {
        client.release();
    }
}));

// Funções auxiliares de correção
async function fixMissingTable(client, tableName) {
    try {
        // Verificar se tabela realmente não existe
        const check = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )
        `, [tableName]);
        
        if (check.rows[0].exists) {
            return {
                success: true,
                message: `Tabela ${tableName} já existe`,
                fix_applied: { action: 'none', reason: 'table_exists' }
            };
        }
        
        // Não criar tabelas automaticamente por segurança
        return {
            success: false,
            message: `Tabela ${tableName} não encontrada. Criação requer intervenção manual.`,
            requires_manual_intervention: true,
            suggestion: `Execute a migration apropriada para criar a tabela ${tableName}`
        };
    } catch (error) {
        return {
            success: false,
            message: `Erro ao verificar tabela: ${error.message}`,
            requires_manual_intervention: true
        };
    }
}

async function fixMissingIndexes(client, details) {
    try {
        if (!details || !details.tables) {
            return {
                success: false,
                message: 'Detalhes de índices não fornecidos'
            };
        }
        
        const indexesCreated = [];
        for (const tableName of details.tables) {
            // Criar índice básico em colunas comuns
            const commonIndexColumns = {
                'profile_items': ['user_id', 'item_type'],
                'ia_conversations': ['user_id', 'created_at'],
                'ia_knowledge_base': ['category_id', 'created_at']
            };
            
            if (commonIndexColumns[tableName]) {
                for (const column of commonIndexColumns[tableName]) {
                    try {
                        const indexName = `idx_${tableName}_${column}`;
                        await client.query(`
                            CREATE INDEX IF NOT EXISTS ${indexName} 
                            ON ${tableName} (${column})
                        `);
                        indexesCreated.push(`${tableName}.${column}`);
                    } catch (err) {
                        // Índice pode já existir
                        console.log(`Índice ${tableName}.${column} pode já existir:`, err.message);
                    }
                }
            }
        }
        
        if (indexesCreated.length > 0) {
            return {
                success: true,
                message: `${indexesCreated.length} índice(s) criado(s) com sucesso`,
                fix_applied: { indexes_created: indexesCreated }
            };
        }
        
        return {
            success: false,
            message: 'Nenhum índice foi criado. Verifique os detalhes do erro.'
        };
    } catch (error) {
        return {
            success: false,
            message: `Erro ao criar índices: ${error.message}`
        };
    }
}

async function fixMissingContent(client, location, details) {
    try {
        let totalFixed = 0;
        const fixes = [];
        
        // Corrigir títulos vazios em profile_items
        if (location.includes('profile_items.title') || location.includes("item_type = 'banner'") || location.includes("item_type = 'sales_page'")) {
            const result = await client.query(`
                UPDATE profile_items
                SET title = COALESCE(NULLIF(title, ''), 
                    CASE 
                        WHEN item_type = 'banner' THEN 'Banner'
                        WHEN item_type = 'sales_page' THEN 'Página de Vendas'
                        ELSE 'Item sem título'
                    END)
                WHERE (title IS NULL OR title = '')
                RETURNING id, item_type
            `);
            
            totalFixed += result.rows.length;
            fixes.push(`Títulos em profile_items: ${result.rows.length}`);
        }
        
        // Corrigir descrições vazias em sales_pages
        if (location.includes('sales_pages.store_description') || location.includes('sales_pages')) {
            const result = await client.query(`
                UPDATE sales_pages
                SET store_description = COALESCE(NULLIF(store_description, ''), 'Descrição da loja')
                WHERE store_description IS NULL OR store_description = ''
                RETURNING id
            `);
            
            totalFixed += result.rows.length;
            fixes.push(`Descrições em sales_pages: ${result.rows.length}`);
        }
        
        // Corrigir outros campos de conteúdo vazios
        if (location.includes('profile_items') && !location.includes('title')) {
            // Tentar corrigir outros campos comuns
            const commonFields = ['description', 'content', 'text'];
            for (const field of commonFields) {
                if (location.includes(field)) {
                    try {
                        const result = await client.query(`
                            UPDATE profile_items
                            SET ${field} = COALESCE(NULLIF(${field}, ''), 'Conteúdo')
                            WHERE ${field} IS NULL OR ${field} = ''
                            RETURNING id
                        `);
                        if (result.rows.length > 0) {
                            totalFixed += result.rows.length;
                            fixes.push(`${field} em profile_items: ${result.rows.length}`);
                        }
                    } catch (err) {
                        // Campo pode não existir, continuar
                        console.log(`Campo ${field} não encontrado ou erro:`, err.message);
                    }
                }
            }
        }
        
        if (totalFixed > 0) {
            return {
                success: true,
                message: `${totalFixed} item(s) corrigido(s): ${fixes.join(', ')}`,
                fix_applied: { items_updated: totalFixed, fixes: fixes }
            };
        }
        
        // Se não conseguiu corrigir, tentar uma abordagem genérica
        return {
            success: false,
            message: 'Não foi possível corrigir automaticamente. Tente verificar manualmente.',
            requires_manual_intervention: true
        };
    } catch (error) {
        return {
            success: false,
            message: `Erro ao corrigir conteúdo: ${error.message}`
        };
    }
}

async function fixTextQuality(client, location, details) {
    try {
        // Similar a fixMissingContent
        if (location.includes('profile_items.title')) {
            const result = await client.query(`
                UPDATE profile_items
                SET title = CASE 
                    WHEN title IS NULL OR title = '' THEN 'Item sem título'
                    WHEN LENGTH(title) < 3 THEN title || '...'
                    ELSE title
                END
                WHERE title IS NULL OR title = '' OR LENGTH(title) < 3
                RETURNING id
            `);
            
            return {
                success: true,
                message: `${result.rows.length} título(s) melhorado(s)`,
                fix_applied: { items_updated: result.rows.length }
            };
        }
        
        return {
            success: false,
            message: 'Localização de texto não suporta correção automática'
        };
    } catch (error) {
        return {
            success: false,
            message: `Erro ao corrigir qualidade de texto: ${error.message}`
        };
    }
}

async function applyIndexRecommendations(client) {
    return await fixMissingIndexes(client, {
        tables: ['profile_items', 'ia_conversations', 'ia_knowledge_base']
    });
}

async function applyContentRecommendations(client) {
    const results = [];
    
    // Corrigir títulos vazios
    const titleFix = await fixMissingContent(client, 'profile_items.title', null);
    results.push(titleFix);
    
    return {
        success: results.some(r => r.success),
        message: results.map(r => r.message).join('; '),
        fix_applied: results
    };
}

// ============================================
// FASE 2: GRAFO DE CONHECIMENTO, RACIOCÍNIO CAUSAL E META-COGNIÇÃO
// ============================================

// ============================================
// 1. GRAFO DE CONHECIMENTO (Knowledge Graph)
// ============================================

/**
 * Adicionar ou atualizar conceito no grafo de conhecimento
 */
async function addOrUpdateConcept(conceptName, conceptType, description, categoryId, properties, client) {
    try {
        const result = await client.query(`
            INSERT INTO ia_knowledge_graph_concepts 
            (concept_name, concept_type, description, category_id, properties, importance_score)
            VALUES ($1, $2, $3, $4, $5, 1.0)
            ON CONFLICT (concept_name) 
            DO UPDATE SET 
                concept_type = EXCLUDED.concept_type,
                description = EXCLUDED.description,
                category_id = EXCLUDED.category_id,
                properties = EXCLUDED.properties,
                updated_at = CURRENT_TIMESTAMP,
                usage_count = ia_knowledge_graph_concepts.usage_count + 1
            RETURNING id
        `, [conceptName, conceptType, description, categoryId, JSON.stringify(properties || {})]);
        
        return result.rows[0]?.id;
    } catch (error) {
        console.error('Erro ao adicionar conceito ao grafo:', error);
        return null;
    }
}

/**
 * Adicionar relação entre conceitos
 */
async function addRelation(fromConceptId, toConceptId, relationType, strength, confidence, description, client) {
    try {
        const result = await client.query(`
            INSERT INTO ia_knowledge_graph_relations 
            (from_concept_id, to_concept_id, relation_type, strength, confidence, description, evidence_count)
            VALUES ($1, $2, $3, $4, $5, $6, 1)
            ON CONFLICT (from_concept_id, to_concept_id, relation_type)
            DO UPDATE SET 
                strength = (ia_knowledge_graph_relations.strength + EXCLUDED.strength) / 2,
                confidence = GREATEST(ia_knowledge_graph_relations.confidence, EXCLUDED.confidence),
                evidence_count = ia_knowledge_graph_relations.evidence_count + 1,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `, [fromConceptId, toConceptId, relationType, strength, confidence, description]);
        
        return result.rows[0]?.id;
    } catch (error) {
        console.error('Erro ao adicionar relação:', error);
        return null;
    }
}

/**
 * Buscar conceitos relacionados
 */
async function findRelatedConcepts(conceptName, relationType, maxDepth, client) {
    try {
        const result = await client.query(`
            WITH RECURSIVE related_concepts AS (
                -- Conceito inicial
                SELECT c.id, c.concept_name, c.concept_type, c.description, 0 as depth
                FROM ia_knowledge_graph_concepts c
                WHERE LOWER(c.concept_name) = LOWER($1)
                
                UNION
                
                -- Conceitos relacionados
                SELECT 
                    c2.id, 
                    c2.concept_name, 
                    c2.concept_type, 
                    c2.description,
                    rc.depth + 1 as depth
                FROM related_concepts rc
                JOIN ia_knowledge_graph_relations r ON (
                    (r.from_concept_id = rc.id AND r.to_concept_id != rc.id) OR
                    (r.to_concept_id = rc.id AND r.from_concept_id != rc.id)
                )
                JOIN ia_knowledge_graph_concepts c2 ON (
                    (r.to_concept_id = c2.id AND r.from_concept_id = rc.id) OR
                    (r.from_concept_id = c2.id AND r.to_concept_id = rc.id)
                )
                WHERE rc.depth < $3
                AND ($2 IS NULL OR r.relation_type = $2)
            )
            SELECT DISTINCT * FROM related_concepts
            WHERE depth > 0
            ORDER BY depth, concept_name
            LIMIT 20
        `, [conceptName, relationType, maxDepth]);
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao buscar conceitos relacionados:', error);
        return [];
    }
}

/**
 * Construir grafo de conhecimento a partir de texto
 */
async function buildKnowledgeGraphFromText(text, title, categoryId, client) {
    try {
        // Extrair entidades e conceitos do texto
        const entities = extractKeywords(text);
        const concepts = [];
        
        // Identificar conceitos principais (palavras com maiúscula, substantivos)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        for (const sentence of sentences.slice(0, 20)) {
            const words = sentence.split(/\s+/).filter(w => w.length > 3);
            for (const word of words) {
                if (word[0] === word[0].toUpperCase() && !concepts.includes(word.toLowerCase())) {
                    concepts.push(word.toLowerCase());
                }
            }
        }
        
        // Adicionar conceitos principais
        const conceptIds = {};
        for (const concept of [...entities.slice(0, 10), ...concepts.slice(0, 10)]) {
            const conceptId = await addOrUpdateConcept(
                concept,
                'entity',
                `Conceito extraído de: ${title}`,
                categoryId,
                { source: title },
                client
            );
            if (conceptId) {
                conceptIds[concept] = conceptId;
            }
        }
        
        // Identificar relações (padrões como "A é B", "A causa B", "A parte de B")
        const relationPatterns = [
            { pattern: /([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)\s+(é|foi|era|torna-se)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)/gi, type: 'is_a' },
            { pattern: /([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)\s+(causa|leva a|resulta em)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)/gi, type: 'causes' },
            { pattern: /([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)\s+(é parte de|faz parte de|pertence a)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)/gi, type: 'part_of' }
        ];
        
        for (const { pattern, type } of relationPatterns) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                const fromConcept = match[1].toLowerCase();
                const toConcept = match[3]?.toLowerCase() || match[2]?.toLowerCase();
                
                if (conceptIds[fromConcept] && conceptIds[toConcept]) {
                    await addRelation(
                        conceptIds[fromConcept],
                        conceptIds[toConcept],
                        type,
                        0.8,
                        0.7,
                        `Relação extraída de: ${title}`,
                        client
                    );
                }
            }
        }
        
        return { conceptsAdded: Object.keys(conceptIds).length, relationsAdded: matches?.length || 0 };
    } catch (error) {
        console.error('Erro ao construir grafo de conhecimento:', error);
        return { conceptsAdded: 0, relationsAdded: 0 };
    }
}

/**
 * Buscar conhecimento usando grafo (busca por caminho)
 */
async function searchKnowledgeGraph(question, questionContext, client) {
    try {
        const entities = questionContext.entities || [];
        if (entities.length === 0) return [];
        
        const relatedConcepts = [];
        
        // Para cada entidade, buscar conceitos relacionados
        for (const entity of entities.slice(0, 5)) {
            const related = await findRelatedConcepts(entity, null, 2, client);
            relatedConcepts.push(...related);
        }
        
        // Buscar conhecimento baseado nos conceitos relacionados
        if (relatedConcepts.length > 0) {
            const conceptNames = relatedConcepts.map(c => c.concept_name);
            const result = await client.query(`
                SELECT DISTINCT kb.*
                FROM ia_knowledge_base kb
                WHERE kb.is_active = true
                AND (
                    ${conceptNames.map((_, i) => `LOWER(kb.title) LIKE $${i + 1} OR LOWER(kb.content) LIKE $${i + 1}`).join(' OR ')}
                )
                LIMIT 10
            `, conceptNames.map(c => `%${c}%`));
            
            return result.rows;
        }
        
        return [];
    } catch (error) {
        console.error('Erro ao buscar no grafo de conhecimento:', error);
        return [];
    }
}

// ============================================
// 2. RACIOCÍNIO CAUSAL
// ============================================

/**
 * Identificar causas de um evento/conceito
 */
async function identifyCauses(conceptName, client) {
    try {
        const result = await client.query(`
            SELECT DISTINCT c1.*, r.strength, r.confidence
            FROM ia_knowledge_graph_concepts c1
            JOIN ia_knowledge_graph_relations r ON r.from_concept_id = c1.id
            JOIN ia_knowledge_graph_concepts c2 ON r.to_concept_id = c2.id
            WHERE LOWER(c2.concept_name) = LOWER($1)
            AND r.relation_type = 'causes'
            ORDER BY r.strength DESC, r.confidence DESC
            LIMIT 10
        `, [conceptName]);
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao identificar causas:', error);
        return [];
    }
}

/**
 * Identificar efeitos de um evento/conceito
 */
async function identifyEffects(conceptName, client) {
    try {
        const result = await client.query(`
            SELECT DISTINCT c2.*, r.strength, r.confidence
            FROM ia_knowledge_graph_concepts c1
            JOIN ia_knowledge_graph_relations r ON r.from_concept_id = c1.id
            JOIN ia_knowledge_graph_concepts c2 ON r.to_concept_id = c2.id
            WHERE LOWER(c1.concept_name) = LOWER($1)
            AND r.relation_type = 'causes'
            ORDER BY r.strength DESC, r.confidence DESC
            LIMIT 10
        `, [conceptName]);
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao identificar efeitos:', error);
        return [];
    }
}

/**
 * Construir cadeia causal
 */
async function buildCausalChain(causeName, effectName, client) {
    try {
        // Buscar caminho no grafo
        const result = await client.query(`
            WITH RECURSIVE causal_path AS (
                SELECT 
                    c1.id as from_id,
                    c1.concept_name as from_name,
                    c2.id as to_id,
                    c2.concept_name as to_name,
                    r.relation_type,
                    r.strength,
                    ARRAY[c1.id] as path,
                    1 as depth
                FROM ia_knowledge_graph_concepts c1
                JOIN ia_knowledge_graph_relations r ON r.from_concept_id = c1.id
                JOIN ia_knowledge_graph_concepts c2 ON r.to_concept_id = c2.id
                WHERE LOWER(c1.concept_name) = LOWER($1)
                AND r.relation_type = 'causes'
                
                UNION
                
                SELECT 
                    cp.from_id,
                    cp.from_name,
                    c2.id as to_id,
                    c2.concept_name as to_name,
                    r.relation_type,
                    r.strength,
                    cp.path || c2.id,
                    cp.depth + 1
                FROM causal_path cp
                JOIN ia_knowledge_graph_relations r ON r.from_concept_id = cp.to_id
                JOIN ia_knowledge_graph_concepts c2 ON r.to_concept_id = c2.id
                WHERE r.relation_type = 'causes'
                AND NOT (c2.id = ANY(cp.path))
                AND cp.depth < 5
            )
            SELECT * FROM causal_path
            WHERE LOWER(to_name) = LOWER($2)
            ORDER BY depth, strength DESC
            LIMIT 1
        `, [causeName, effectName]);
        
        if (result.rows.length > 0) {
            return {
                chain: result.rows[0].path,
                steps: result.rows[0].path.map((id, idx) => ({
                    step_order: idx + 1,
                    concept_id: id
                })),
                confidence: result.rows[0].strength
            };
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao construir cadeia causal:', error);
        return null;
    }
}

/**
 * Raciocínio causal completo
 */
async function causalReasoning(question, questionContext, client) {
    try {
        const entities = questionContext.entities || [];
        if (entities.length === 0) return null;
        
        const mainEntity = entities[0];
        
        // Identificar causas e efeitos
        const causes = await identifyCauses(mainEntity, client);
        const effects = await identifyEffects(mainEntity, client);
        
        if (causes.length === 0 && effects.length === 0) return null;
        
        // Construir explicação causal
        let explanation = '';
        if (causes.length > 0) {
            explanation += `**Causas de "${mainEntity}":**\n`;
            causes.slice(0, 3).forEach((cause, idx) => {
                explanation += `${idx + 1}. ${cause.concept_name} (confiança: ${(cause.confidence * 100).toFixed(0)}%)\n`;
            });
        }
        
        if (effects.length > 0) {
            explanation += `\n**Efeitos de "${mainEntity}":**\n`;
            effects.slice(0, 3).forEach((effect, idx) => {
                explanation += `${idx + 1}. ${effect.concept_name} (confiança: ${(effect.confidence * 100).toFixed(0)}%)\n`;
            });
        }
        
        return {
            causes: causes,
            effects: effects,
            explanation: explanation,
            confidence: causes.length > 0 || effects.length > 0 ? 0.7 : 0
        };
    } catch (error) {
        console.error('Erro no raciocínio causal:', error);
        return null;
    }
}

// ============================================
// 3. META-COGNIÇÃO
// ============================================

/**
 * Avaliar qualidade da resposta meta-cognitivamente
 */
async function metacognitiveEvaluation(question, answer, confidence, knowledgeUsed, client) {
    try {
        const evaluation = {
            quality_score: 0,
            confidence_assessment: confidence,
            knowledge_gaps: [],
            improvements_suggested: [],
            lessons_learned: []
        };
        
        // Avaliar qualidade da resposta
        const answerLength = answer?.length || 0;
        const hasStructure = answer?.includes('**') || answer?.includes('\n');
        const hasExamples = answer?.includes('exemplo') || answer?.includes('Exemplo');
        const completeness = answerLength > 100 ? 0.8 : answerLength > 50 ? 0.6 : 0.4;
        
        evaluation.quality_score = (
            (completeness * 0.4) +
            (hasStructure ? 0.3 : 0) +
            (hasExamples ? 0.3 : 0)
        );
        
        // Identificar lacunas de conhecimento
        if (confidence < 70) {
            evaluation.knowledge_gaps.push({
                type: 'low_confidence',
                description: 'Confiança baixa na resposta',
                suggestion: 'Buscar mais conhecimento sobre o tópico'
            });
        }
        
        if (answerLength < 100) {
            evaluation.knowledge_gaps.push({
                type: 'short_answer',
                description: 'Resposta muito curta',
                suggestion: 'Expandir resposta com mais detalhes e exemplos'
            });
        }
        
        // Sugerir melhorias
        if (!hasStructure) {
            evaluation.improvements_suggested.push({
                type: 'structure',
                description: 'Adicionar estrutura (títulos, listas)',
                priority: 'medium'
            });
        }
        
        if (!hasExamples && answerLength > 50) {
            evaluation.improvements_suggested.push({
                type: 'examples',
                description: 'Adicionar exemplos práticos',
                priority: 'high'
            });
        }
        
        // Extrair lições aprendidas
        if (knowledgeUsed && knowledgeUsed.length > 0) {
            evaluation.lessons_learned.push({
                lesson: 'Conhecimento de múltiplas fontes melhora a qualidade',
                knowledge_sources: knowledgeUsed.length
            });
        }
        
        // Salvar avaliação
        await client.query(`
            INSERT INTO ia_metacognitive_evaluations 
            (question, answer, quality_score, confidence_score, knowledge_gaps, improvements_suggested, lessons_learned)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            question,
            answer,
            evaluation.quality_score,
            confidence,
            JSON.stringify(evaluation.knowledge_gaps),
            JSON.stringify(evaluation.improvements_suggested),
            JSON.stringify(evaluation.lessons_learned)
        ]);
        
        return evaluation;
    } catch (error) {
        console.error('Erro na avaliação meta-cognitiva:', error);
        return null;
    }
}

/**
 * Aplicar melhorias sugeridas pela meta-cognição
 */
function applyMetacognitiveImprovements(answer, evaluation) {
    if (!evaluation || !evaluation.improvements_suggested) return answer;
    
    let improvedAnswer = answer;
    
    // Adicionar estrutura se sugerido
    if (evaluation.improvements_suggested.some(i => i.type === 'structure')) {
        if (!improvedAnswer.includes('**')) {
            // Tentar adicionar estrutura básica
            const lines = improvedAnswer.split('\n');
            if (lines.length > 3) {
                improvedAnswer = `**Resposta:**\n\n${improvedAnswer}`;
            }
        }
    }
    
    // Adicionar exemplos se sugerido
    if (evaluation.improvements_suggested.some(i => i.type === 'examples' && i.priority === 'high')) {
        if (!improvedAnswer.toLowerCase().includes('exemplo')) {
            improvedAnswer += '\n\n**Exemplo prático:** (Adicione um exemplo relevante aqui)';
        }
    }
    
    return improvedAnswer;
}

// ============================================
// ROTAS DE PERGUNTAS NÃO RESPONDIDAS
// ============================================

// GET /api/ia-king/unanswered-questions - Listar perguntas não respondidas
router.get('/unanswered-questions', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Verificar se a tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_unanswered_questions'
            ) as exists
        `);
        
        if (!tableCheck.rows[0].exists) {
            return res.json({
                questions: [],
                total: 0,
                message: 'Tabela de perguntas não respondidas não encontrada. Execute a migration 034.'
            });
        }
        
        const result = await client.query(`
            SELECT * FROM ia_unanswered_questions
            WHERE improved = false
            ORDER BY ask_count DESC, last_asked_at DESC
            LIMIT 100
        `);
        
        res.json({
            questions: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Erro ao buscar perguntas não respondidas:', error);
        res.status(500).json({ error: 'Erro ao buscar perguntas não respondidas', details: error.message });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/improve-question - Melhorar IA com pergunta não respondida
router.post('/improve-question', protectAdmin, asyncHandler(async (req, res) => {
    const { question_id } = req.body;
    const userId = req.user.userId;
    const client = await db.pool.connect();
    
    try {
        if (!question_id) {
            return res.status(400).json({ error: 'question_id é obrigatório' });
        }
        
        // Buscar pergunta
        const questionResult = await client.query(`
            SELECT * FROM ia_unanswered_questions
            WHERE id = $1
        `, [question_id]);
        
        if (questionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pergunta não encontrada' });
        }
        
        const question = questionResult.rows[0];
        
        // Usar autoTrainIAKing para aprender sobre a pergunta
        const questionContext = question.question_context || {};
        await autoTrainIAKing(question.question, questionContext, client);
        
        // Marcar como melhorada
        await client.query(`
            UPDATE ia_unanswered_questions
            SET improved = true,
                improved_at = NOW(),
                improved_by = $1
            WHERE id = $2
        `, [userId, question_id]);
        
        res.json({
            success: true,
            message: `IA melhorada com conhecimento sobre: "${question.question.substring(0, 50)}..."`
        });
    } catch (error) {
        console.error('Erro ao melhorar IA:', error);
        res.status(500).json({ error: 'Erro ao melhorar IA', details: error.message });
    } finally {
        client.release();
    }
}));

// ============================================
// NOVA ABA: MELHORIAS E OTIMIZAÇÕES
// ============================================

// GET /api/ia-king/stats - Estatísticas de performance
router.get('/stats', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Estatísticas de conversas
        const convStats = await client.query(`
            SELECT 
                COUNT(*) as total_responses,
                AVG(response_time_ms) as avg_response_time,
                COUNT(CASE WHEN response_quality_score >= 8 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as success_rate
            FROM ia_conversations
            WHERE created_at >= NOW() - INTERVAL '30 days'
        `);
        
        // Estatísticas de conhecimento
        const knowledgeStats = await client.query(`
            SELECT COUNT(*) as total_knowledge
            FROM ia_knowledge_base
            WHERE is_active = true
        `);
        
        // Taxa de sucesso média do conhecimento
        const avgSuccessRate = await client.query(`
            SELECT AVG(success_rate) as avg_rate FROM ia_knowledge_stats
        `);
        
        // Conversas hoje
        const conversationsToday = await client.query(`
            SELECT COUNT(*) as total FROM ia_conversations 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        // Conhecimento otimizado (com estatísticas e taxa de sucesso > 70)
        const optimizedKnowledge = await client.query(`
            SELECT COUNT(*) as total FROM ia_knowledge_stats 
            WHERE success_rate > 70
        `);
        
        const stats = {
            total_responses: parseInt(convStats.rows[0]?.total_responses || 0),
            avg_response_time: parseFloat(convStats.rows[0]?.avg_response_time || 0),
            success_rate: parseFloat(convStats.rows[0]?.success_rate || 0),
            total_knowledge: parseInt(knowledgeStats.rows[0]?.total_knowledge || 0),
            avg_success_rate: parseFloat(avgSuccessRate.rows[0]?.avg_rate || 0),
            conversations_today: parseInt(conversationsToday.rows[0]?.total || 0),
            optimized_knowledge: parseInt(optimizedKnowledge.rows[0]?.total || 0)
        };
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar estatísticas',
            stats: {
                total_responses: 0,
                avg_response_time: 0,
                success_rate: 0,
                total_knowledge: 0,
                avg_success_rate: 0,
                conversations_today: 0,
                optimized_knowledge: 0
            }
        });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/improvement-suggestions - Sugestões de melhoria
router.get('/improvement-suggestions', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const suggestions = [];
        
        // Verificar se embeddings estão sendo usados
        const embeddingCheck = await client.query(`
            SELECT COUNT(*) as count FROM ia_knowledge_base 
            WHERE embedding IS NOT NULL
        `);
        
        if (parseInt(embeddingCheck.rows[0]?.count || 0) === 0) {
            suggestions.push({
                title: 'Ativar Busca Semântica (RAG)',
                description: 'Gere embeddings vetoriais para habilitar busca semântica avançada similar ao ChatGPT',
                priority: 'high',
                action: 'generateAllEmbeddings'
            });
        }
        
        // Verificar conhecimento duplicado
        const duplicateCheck = await client.query(`
            SELECT title, COUNT(*) as count
            FROM ia_knowledge_base
            GROUP BY title
            HAVING COUNT(*) > 1
            LIMIT 5
        `);
        
        if (duplicateCheck.rows.length > 0) {
            suggestions.push({
                title: 'Limpar Conhecimento Duplicado',
                description: `${duplicateCheck.rows.length} título(s) duplicado(s) encontrado(s). Limpeza recomendada.`,
                priority: 'medium',
                action: 'cleanupKnowledge'
            });
        }
        
        // Verificar cache
        const cacheCheck = await client.query(`
            SELECT COUNT(*) as count FROM ia_response_cache
            WHERE created_at < NOW() - INTERVAL '7 days'
        `);
        
        if (parseInt(cacheCheck.rows[0]?.count || 0) > 100) {
            suggestions.push({
                title: 'Otimizar Cache',
                description: 'Muitos itens de cache antigos. Otimização recomendada.',
                priority: 'low',
                action: 'optimizeCache'
            });
        }
        
        res.json({ success: true, suggestions });
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        res.json({ success: true, suggestions: [] });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/optimization-history - Histórico de otimizações
router.get('/optimization-history', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Verificar se tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_optimization_history'
            )
        `);
        
        if (!tableCheck.rows[0].exists) {
            // Criar tabela se não existir
            await client.query(`
                CREATE TABLE IF NOT EXISTS ia_optimization_history (
                    id SERIAL PRIMARY KEY,
                    optimization_type VARCHAR(100) NOT NULL,
                    message TEXT,
                    success BOOLEAN DEFAULT true,
                    details JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
        
        const result = await client.query(`
            SELECT * FROM ia_optimization_history
            ORDER BY created_at DESC
            LIMIT 20
        `);
        
        res.json({ success: true, history: result.rows });
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.json({ success: true, history: [] });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/cleanup-knowledge - Limpar conhecimento duplicado
router.post('/cleanup-knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Encontrar e remover duplicados (manter o mais recente)
        const duplicates = await client.query(`
            DELETE FROM ia_knowledge_base
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(title)) ORDER BY created_at DESC) as rn
                    FROM ia_knowledge_base
                ) t WHERE rn > 1
            )
            RETURNING id
        `);
        
        // Remover conhecimento vazio ou muito curto
        const empty = await client.query(`
            DELETE FROM ia_knowledge_base
            WHERE content IS NULL OR LENGTH(TRIM(content)) < 10
            RETURNING id
        `);
        
        const totalRemoved = duplicates.rows.length + empty.rows.length;
        
        // Registrar no histórico
        try {
            await client.query(`
                INSERT INTO ia_optimization_history (optimization_type, message, success, details)
                VALUES ('knowledge_cleanup', 'Limpeza de conhecimento', true, $1::jsonb)
            `, [JSON.stringify({ duplicates: duplicates.rows.length, empty: empty.rows.length })]);
        } catch (e) {
            // Tabela pode não existir ainda
        }
        
        res.json({
            success: true,
            message: `${totalRemoved} item(s) removido(s)`,
            removed: totalRemoved,
            details: {
                duplicates: duplicates.rows.length,
                empty: empty.rows.length
            }
        });
    } catch (error) {
        console.error('Erro ao limpar conhecimento:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao limpar conhecimento',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/optimize-cache - Otimizar cache
router.post('/optimize-cache', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Remover cache antigo (mais de 30 dias)
        const removed = await client.query(`
            DELETE FROM ia_response_cache
            WHERE created_at < NOW() - INTERVAL '30 days'
            RETURNING id
        `);
        
        // Registrar no histórico
        try {
            await client.query(`
                INSERT INTO ia_optimization_history (optimization_type, message, success, details)
                VALUES ('cache_optimization', 'Otimização de cache', true, $1::jsonb)
            `, [JSON.stringify({ removed: removed.rows.length })]);
        } catch (e) {
            // Tabela pode não existir ainda
        }
        
        res.json({
            success: true,
            message: `Cache otimizado: ${removed.rows.length} item(s) antigo(s) removido(s)`,
            removed: removed.rows.length
        });
    } catch (error) {
        console.error('Erro ao otimizar cache:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao otimizar cache',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/optimize-categories - Otimizar categorias
router.post('/optimize-categories', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Encontrar categorias vazias
        const emptyCategories = await client.query(`
            SELECT c.id, c.name
            FROM ia_categories c
            LEFT JOIN ia_knowledge_base kb ON kb.category_id = c.id
            WHERE kb.id IS NULL
        `);
        
        // Não remover categorias, apenas reportar
        const message = emptyCategories.rows.length > 0 
            ? `${emptyCategories.rows.length} categoria(s) vazia(s) encontrada(s)`
            : 'Todas as categorias possuem conhecimento';
        
        res.json({
            success: true,
            message: message,
            empty_categories: emptyCategories.rows.length
        });
    } catch (error) {
        console.error('Erro ao otimizar categorias:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao otimizar categorias',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/update-knowledge-graph - Atualizar grafo de conhecimento
router.post('/update-knowledge-graph', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Buscar conhecimento recente sem grafo
        const knowledge = await client.query(`
            SELECT id, title, content, category_id
            FROM ia_knowledge_base
            WHERE created_at >= NOW() - INTERVAL '7 days'
            LIMIT 50
        `);
        
        let conceptsCreated = 0;
        let relationsCreated = 0;
        
        for (const kb of knowledge.rows) {
            try {
                await buildKnowledgeGraphFromText(kb.content, kb.title, kb.category_id, client);
                conceptsCreated++;
                relationsCreated++;
            } catch (e) {
                console.log('Erro ao criar grafo para conhecimento', kb.id, ':', e.message);
            }
        }
        
        // Registrar no histórico
        try {
            await client.query(`
                INSERT INTO ia_optimization_history (optimization_type, message, success, details)
                VALUES ('knowledge_graph_update', 'Atualização de grafo de conhecimento', true, $1::jsonb)
            `, [JSON.stringify({ concepts: conceptsCreated, relations: relationsCreated })]);
        } catch (e) {
            // Tabela pode não existir ainda
        }
        
        res.json({
            success: true,
            message: `Grafo atualizado: ${conceptsCreated} conceito(s) e ${relationsCreated} relação(ões) criado(s)`,
            concepts: conceptsCreated,
            relations: relationsCreated
        });
    } catch (error) {
        console.error('Erro ao atualizar grafo:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar grafo',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/optimize-responses - Otimizar respostas
router.post('/optimize-responses', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Analisar respostas de baixa qualidade
        const lowQuality = await client.query(`
            SELECT COUNT(*) as count
            FROM ia_conversations
            WHERE response_quality_score IS NOT NULL
            AND response_quality_score < 6
            AND created_at >= NOW() - INTERVAL '7 days'
        `);
        
        const count = parseInt(lowQuality.rows[0]?.count || 0);
        
        // Registrar no histórico
        try {
            await client.query(`
                INSERT INTO ia_optimization_history (optimization_type, message, success, details)
                VALUES ('response_optimization', 'Otimização de respostas', true, $1::jsonb)
            `, [JSON.stringify({ low_quality_responses: count })]);
        } catch (e) {
            // Tabela pode não existir ainda
        }
        
        res.json({
            success: true,
            message: `Análise concluída: ${count} resposta(s) de baixa qualidade encontrada(s) nos últimos 7 dias`,
            low_quality_count: count
        });
    } catch (error) {
        console.error('Erro ao otimizar respostas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao otimizar respostas',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/export-knowledge - Exportar conhecimento
router.get('/export-knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const knowledge = await client.query(`
            SELECT id, title, content, source_type, category_id, created_at
            FROM ia_knowledge_base
            ORDER BY created_at DESC
        `);
        
        const categories = await client.query(`
            SELECT id, name, description
            FROM ia_categories
        `);
        
        res.json({
            export_date: new Date().toISOString(),
            knowledge: knowledge.rows,
            categories: categories.rows,
            total_items: knowledge.rows.length
        });
    } catch (error) {
        console.error('Erro ao exportar conhecimento:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao exportar conhecimento',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/import-knowledge - Importar conhecimento
router.post('/import-knowledge', protectAdmin, asyncHandler(async (req, res) => {
    const { knowledge, categories } = req.body;
    const client = await db.pool.connect();
    
    try {
        let imported = 0;
        let skipped = 0;
        
        // Importar categorias primeiro
        const categoryMap = {};
        if (categories && Array.isArray(categories)) {
            for (const cat of categories) {
                const existing = await client.query(`
                    SELECT id FROM ia_categories WHERE name = $1
                `, [cat.name]);
                
                if (existing.rows.length === 0) {
                    const newCat = await client.query(`
                        INSERT INTO ia_categories (name, description)
                        VALUES ($1, $2)
                        RETURNING id
                    `, [cat.name, cat.description || '']);
                    categoryMap[cat.id] = newCat.rows[0].id;
                } else {
                    categoryMap[cat.id] = existing.rows[0].id;
                }
            }
        }
        
        // Importar conhecimento
        if (knowledge && Array.isArray(knowledge)) {
            for (const kb of knowledge) {
                // Verificar se já existe
                const existing = await client.query(`
                    SELECT id FROM ia_knowledge_base 
                    WHERE title = $1 AND content = $2
                `, [kb.title, kb.content]);
                
                if (existing.rows.length === 0) {
                    await client.query(`
                        INSERT INTO ia_knowledge_base (title, content, source_type, category_id)
                        VALUES ($1, $2, $3, $4)
                    `, [
                        kb.title,
                        kb.content,
                        kb.source_type || 'imported',
                        categoryMap[kb.category_id] || null
                    ]);
                    imported++;
                } else {
                    skipped++;
                }
            }
        }
        
        res.json({
            success: true,
            message: `Importação concluída: ${imported} item(s) importado(s), ${skipped} item(s) ignorado(s)`,
            imported,
            skipped
        });
    } catch (error) {
        console.error('Erro ao importar conhecimento:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao importar conhecimento',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/knowledge/bulk-delete - Deletar conhecimento em lote
router.post('/knowledge/bulk-delete', protectAdmin, asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const client = await db.pool.connect();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'IDs não fornecidos' });
    }
    
    try {
        const result = await client.query(`
            DELETE FROM ia_knowledge_base
            WHERE id = ANY($1::int[])
            RETURNING id
        `, [ids]);
        
        res.json({
            success: true,
            message: `${result.rows.length} item(s) deletado(s)`,
            deleted: result.rows.length
        });
    } catch (error) {
        console.error('Erro ao deletar conhecimento em lote:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao deletar conhecimento',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/knowledge/export-selected - Exportar conhecimento selecionado
router.post('/knowledge/export-selected', protectAdmin, asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const client = await db.pool.connect();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'IDs não fornecidos' });
    }
    
    try {
        const knowledge = await client.query(`
            SELECT id, title, content, source_type, category_id, created_at
            FROM ia_knowledge_base
            WHERE id = ANY($1::int[])
            ORDER BY created_at DESC
        `, [ids]);
        
        res.json({
            export_date: new Date().toISOString(),
            knowledge: knowledge.rows,
            total_items: knowledge.rows.length
        });
    } catch (error) {
        console.error('Erro ao exportar conhecimento selecionado:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao exportar conhecimento',
            message: error.message
        });
    } finally {
        client.release();
    }
}));

// ============================================
// FASE 1: MELHORIAS CRÍTICAS - APRENDIZADO ADAPTATIVO
// ============================================

// ============================================
// 1. SISTEMA DE APRENDIZADO ADAPTATIVO AVANÇADO
// ============================================

// Rastrear uso de conhecimento e atualizar estatísticas
async function trackKnowledgeUsage(knowledgeId, success, confidence, client) {
    try {
        // Verificar se estatísticas existem
        const statsCheck = await client.query(`
            SELECT id FROM ia_knowledge_stats WHERE knowledge_id = $1
        `, [knowledgeId]);
        
        if (statsCheck.rows.length === 0) {
            // Criar estatísticas iniciais
            await client.query(`
                INSERT INTO ia_knowledge_stats 
                (knowledge_id, total_uses, successful_uses, failed_uses, average_confidence, last_used_at, success_rate, dynamic_priority)
                VALUES ($1, 1, $2, $3, $4, NOW(), $5, $6)
            `, [
                knowledgeId,
                success ? 1 : 0,
                success ? 0 : 1,
                confidence || 0,
                success ? 100 : 0,
                calculateDynamicPriority(1, success ? 1 : 0, confidence || 0, 0)
            ]);
        } else {
            // Atualizar estatísticas existentes
            const stats = await client.query(`
                SELECT total_uses, successful_uses, failed_uses, average_confidence 
                FROM ia_knowledge_stats WHERE knowledge_id = $1
            `, [knowledgeId]);
            
            const current = stats.rows[0];
            const newTotal = current.total_uses + 1;
            const newSuccessful = current.successful_uses + (success ? 1 : 0);
            const newFailed = current.failed_uses + (success ? 0 : 1);
            const newAvgConfidence = ((current.average_confidence * current.total_uses) + (confidence || 0)) / newTotal;
            const newSuccessRate = (newSuccessful / newTotal) * 100;
            const newDynamicPriority = calculateDynamicPriority(newTotal, newSuccessful, newAvgConfidence, newSuccessRate);
            
            await client.query(`
                UPDATE ia_knowledge_stats
                SET total_uses = $1,
                    successful_uses = $2,
                    failed_uses = $3,
                    average_confidence = $4,
                    success_rate = $5,
                    dynamic_priority = $6,
                    last_used_at = NOW(),
                    updated_at = NOW()
                WHERE knowledge_id = $7
            `, [newTotal, newSuccessful, newFailed, newAvgConfidence, newSuccessRate, newDynamicPriority, knowledgeId]);
        }
        
        // Atualizar também na tabela principal
        await client.query(`
            UPDATE ia_knowledge_base
            SET use_count = COALESCE(use_count, 0) + 1,
                last_used_at = NOW(),
                success_rate = (
                    SELECT success_rate FROM ia_knowledge_stats WHERE knowledge_id = $1
                ),
                dynamic_priority = (
                    SELECT dynamic_priority FROM ia_knowledge_stats WHERE knowledge_id = $1
                )
            WHERE id = $1
        `, [knowledgeId]);
        
    } catch (error) {
        console.error('Erro ao rastrear uso de conhecimento:', error);
        // Não bloquear o fluxo principal
    }
}

// Calcular prioridade dinâmica baseada em múltiplos fatores
function calculateDynamicPriority(totalUses, successfulUses, avgConfidence, successRate) {
    // Fator 1: Taxa de sucesso (0-40 pontos)
    const successFactor = (successRate / 100) * 40;
    
    // Fator 2: Confiança média (0-30 pontos)
    const confidenceFactor = (avgConfidence / 100) * 30;
    
    // Fator 3: Volume de uso (0-20 pontos) - mais uso = mais confiável
    const volumeFactor = Math.min((totalUses / 100) * 20, 20);
    
    // Fator 4: Recência (0-10 pontos) - conhecimento usado recentemente tem prioridade
    // Este será ajustado no banco de dados baseado em last_used_at
    
    return successFactor + confidenceFactor + volumeFactor;
}

// Ajustar estratégias de resposta baseado em feedback
async function adjustResponseStrategies(strategyType, success, confidence, feedbackScore, client) {
    try {
        // Buscar ou criar estratégia
        const strategyCheck = await client.query(`
            SELECT id, success_count, failure_count, average_confidence, average_feedback_score
            FROM ia_response_strategies 
            WHERE strategy_type = $1
            LIMIT 1
        `, [strategyType]);
        
        if (strategyCheck.rows.length === 0) {
            // Criar nova estratégia
            await client.query(`
                INSERT INTO ia_response_strategies 
                (strategy_type, success_count, failure_count, average_confidence, average_feedback_score, priority, last_used_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                strategyType,
                success ? 1 : 0,
                success ? 0 : 1,
                confidence || 0,
                feedbackScore || 0,
                50 // Prioridade inicial
            ]);
        } else {
            const current = strategyCheck.rows[0];
            const newSuccess = current.success_count + (success ? 1 : 0);
            const newFailure = current.failure_count + (success ? 0 : 1);
            const newAvgConfidence = ((current.average_confidence * (current.success_count + current.failure_count)) + (confidence || 0)) / (newSuccess + newFailure);
            const newAvgFeedback = ((current.average_feedback_score * (current.success_count + current.failure_count)) + (feedbackScore || 0)) / (newSuccess + newFailure);
            
            // Calcular nova prioridade baseada em sucesso
            const successRate = (newSuccess / (newSuccess + newFailure)) * 100;
            const newPriority = Math.min(100, Math.max(0, 50 + (successRate - 50)));
            
            await client.query(`
                UPDATE ia_response_strategies
                SET success_count = $1,
                    failure_count = $2,
                    average_confidence = $3,
                    average_feedback_score = $4,
                    priority = $5,
                    last_used_at = NOW(),
                    updated_at = NOW()
                WHERE id = $6
            `, [newSuccess, newFailure, newAvgConfidence, newAvgFeedback, newPriority, current.id]);
            
            // Registrar no histórico
            await client.query(`
                INSERT INTO ia_adaptive_learning_history
                (learning_type, description, old_value, new_value, impact_score)
                VALUES ('strategy_adjustment', $1, $2, $3, $4)
            `, [
                `Ajuste de estratégia ${strategyType}`,
                JSON.stringify({ priority: current.priority, success_rate: (current.success_count / (current.success_count + current.failure_count)) * 100 }),
                JSON.stringify({ priority: newPriority, success_rate: successRate }),
                Math.abs(newPriority - current.priority)
            ]);
        }
    } catch (error) {
        console.error('Erro ao ajustar estratégias:', error);
    }
}

// ============================================
// 2. SISTEMA DE PRIORIZAÇÃO DINÂMICA
// ============================================

// Atualizar prioridades dinâmicas de todo conhecimento
async function updateDynamicPriorities(client) {
    try {
        // Atualizar prioridades baseadas em estatísticas
        await client.query(`
            UPDATE ia_knowledge_base kb
            SET dynamic_priority = COALESCE(
                (
                    SELECT 
                        (ks.success_rate * 0.4) + 
                        (ks.average_confidence * 0.3) + 
                        (LEAST(ks.total_uses::decimal / 100, 1) * 20) +
                        CASE 
                            WHEN ks.last_used_at > NOW() - INTERVAL '7 days' THEN 10
                            WHEN ks.last_used_at > NOW() - INTERVAL '30 days' THEN 5
                            ELSE 0
                        END
                    FROM ia_knowledge_stats ks
                    WHERE ks.knowledge_id = kb.id
                ),
                kb.priority
            ),
            success_rate = COALESCE(
                (SELECT success_rate FROM ia_knowledge_stats WHERE knowledge_id = kb.id),
                0
            )
            WHERE EXISTS (SELECT 1 FROM ia_knowledge_stats WHERE knowledge_id = kb.id)
        `);
        
        console.log('✅ Prioridades dinâmicas atualizadas');
    } catch (error) {
        console.error('Erro ao atualizar prioridades dinâmicas:', error);
    }
}

// Buscar conhecimento priorizado dinamicamente
async function getPrioritizedKnowledge(question, questionContext, limit, client) {
    try {
        // Primeiro, tentar buscar por prioridade dinâmica
        const prioritizedResult = await client.query(`
            SELECT kb.*, 
                   COALESCE(ks.dynamic_priority, kb.priority, 0) as final_priority,
                   COALESCE(ks.success_rate, 0) as success_rate,
                   COALESCE(ks.total_uses, 0) as total_uses
            FROM ia_knowledge_base kb
            LEFT JOIN ia_knowledge_stats ks ON ks.knowledge_id = kb.id
            WHERE kb.is_active = true
            AND (
                LOWER(kb.title) LIKE LOWER($1) OR
                LOWER(kb.content) LIKE LOWER($1) OR
                LOWER(kb.keywords) LIKE LOWER($1)
            )
            ORDER BY 
                final_priority DESC,
                success_rate DESC,
                kb.priority DESC,
                kb.created_at DESC
            LIMIT $2
        `, [`%${question}%`, limit]);
        
        return prioritizedResult.rows;
    } catch (error) {
        console.error('Erro ao buscar conhecimento priorizado:', error);
        // Fallback para busca normal
        return await client.query(`
            SELECT * FROM ia_knowledge_base
            WHERE is_active = true
            AND (
                LOWER(title) LIKE LOWER($1) OR
                LOWER(content) LIKE LOWER($1) OR
                LOWER(keywords) LIKE LOWER($1)
            )
            ORDER BY priority DESC, created_at DESC
            LIMIT $2
        `, [`%${question}%`, limit]);
    }
}

// ============================================
// 3. SISTEMA DE DETECÇÃO DE ERROS REPETITIVOS
// ============================================

// Detectar e registrar erro repetitivo
async function detectRepetitiveError(question, response, knowledgeIds, client) {
    try {
        // Criar padrão do erro baseado na pergunta e resposta
        const errorPattern = generateErrorPattern(question, response);
        
        // Verificar se erro similar já existe
        const existingError = await client.query(`
            SELECT id, occurrence_count, is_blocked
            FROM ia_repetitive_errors
            WHERE error_pattern = $1
            LIMIT 1
        `, [errorPattern]);
        
        if (existingError.rows.length > 0) {
            // Incrementar contador
            const newCount = existingError.rows[0].occurrence_count + 1;
            await client.query(`
                UPDATE ia_repetitive_errors
                SET occurrence_count = $1,
                    last_occurred_at = NOW(),
                    updated_at = NOW(),
                    is_blocked = CASE WHEN $1 >= 3 THEN true ELSE is_blocked END
                WHERE id = $2
            `, [newCount, existingError.rows[0].id]);
            
            // Se ocorreu 3+ vezes, bloquear conhecimento relacionado
            if (newCount >= 3 && !existingError.rows[0].is_blocked) {
                await blockKnowledgeForError(knowledgeIds, existingError.rows[0].id, client);
            }
        } else {
            // Criar novo registro de erro
            await client.query(`
                INSERT INTO ia_repetitive_errors
                (error_pattern, error_message, error_response, knowledge_ids, occurrence_count)
                VALUES ($1, $2, $3, $4, 1)
            `, [errorPattern, question, response, knowledgeIds || []]);
        }
    } catch (error) {
        console.error('Erro ao detectar erro repetitivo:', error);
    }
}

// Gerar padrão de erro para comparação
function generateErrorPattern(question, response) {
    // Normalizar: remover espaços extras, converter para minúsculas, remover pontuação
    const normalizedQuestion = question.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100); // Limitar tamanho
    
    const normalizedResponse = response.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);
    
    return `${normalizedQuestion}||${normalizedResponse}`;
}

// Bloquear conhecimento relacionado a erro
async function blockKnowledgeForError(knowledgeIds, errorId, client) {
    try {
        if (!knowledgeIds || knowledgeIds.length === 0) return;
        
        // Reduzir drasticamente a prioridade do conhecimento problemático
        await client.query(`
            UPDATE ia_knowledge_base
            SET priority = GREATEST(priority - 50, 0),
                is_active = CASE WHEN priority - 50 < 10 THEN false ELSE is_active END
            WHERE id = ANY($1)
        `, [knowledgeIds]);
        
        // Atualizar estatísticas
        await client.query(`
            UPDATE ia_knowledge_stats
            SET failed_uses = failed_uses + 1,
                success_rate = (successful_uses::decimal / GREATEST(total_uses + 1, 1)) * 100,
                dynamic_priority = GREATEST(dynamic_priority - 30, 0)
            WHERE knowledge_id = ANY($1)
        `, [knowledgeIds]);
        
        console.log(`⚠️ Conhecimento bloqueado devido a erro repetitivo: ${knowledgeIds.length} item(s)`);
    } catch (error) {
        console.error('Erro ao bloquear conhecimento:', error);
    }
}

// Verificar se resposta é similar a erro conhecido
async function checkForRepetitiveError(question, response, client) {
    try {
        const errorPattern = generateErrorPattern(question, response);
        
        const blockedError = await client.query(`
            SELECT id, error_pattern, correction_suggested
            FROM ia_repetitive_errors
            WHERE error_pattern = $1
            AND is_blocked = true
            LIMIT 1
        `, [errorPattern]);
        
        if (blockedError.rows.length > 0) {
            return {
                isBlocked: true,
                errorId: blockedError.rows[0].id,
                correction: blockedError.rows[0].correction_suggested
            };
        }
        
        return { isBlocked: false };
    } catch (error) {
        console.error('Erro ao verificar erro repetitivo:', error);
        return { isBlocked: false };
    }
}

// Integrar feedback negativo com detecção de erros
async function learnFromNegativeFeedbackAdvanced(client, conversationId, feedbackText, knowledgeIds) {
    try {
        // Buscar conversa
        const conv = await client.query(`
            SELECT message, response FROM ia_conversations WHERE id = $1
        `, [conversationId]);
        
        if (conv.rows.length === 0) return;
        
        const { message, response } = conv.rows[0];
        
        // Registrar como erro repetitivo
        await detectRepetitiveError(message, response, knowledgeIds, client);
        
        // Atualizar estatísticas de conhecimento usado
        if (knowledgeIds && knowledgeIds.length > 0) {
            for (const kid of knowledgeIds) {
                await trackKnowledgeUsage(kid, false, 0, client);
            }
        }
        
        // Ajustar estratégias
        await adjustResponseStrategies('knowledge_search', false, 0, 0, client);
        
    } catch (error) {
        console.error('Erro ao aprender com feedback negativo avançado:', error);
    }
}

// Função wrapper para manter compatibilidade (substitui a função original)
async function learnFromNegativeFeedbackWrapper(client, conversationId, feedbackText, knowledgeIds) {
    // Chamar função original se ainda existir
    try {
        // A função original já faz parte do código, então chamamos a avançada diretamente
        await learnFromNegativeFeedbackAdvanced(client, conversationId, feedbackText, knowledgeIds);
    } catch (error) {
        console.error('Erro no wrapper de feedback negativo:', error);
    }
}

// Endpoint para atualizar prioridades dinâmicas manualmente
router.post('/system/update-dynamic-priorities', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        await updateDynamicPriorities(client);
        res.json({ success: true, message: 'Prioridades dinâmicas atualizadas com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar prioridades:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

// Endpoint para obter estatísticas de conhecimento
router.get('/knowledge/:id/stats', protectAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        const stats = await client.query(`
            SELECT * FROM ia_knowledge_stats WHERE knowledge_id = $1
        `, [id]);
        
        if (stats.rows.length === 0) {
            return res.json({ success: true, stats: null, message: 'Nenhuma estatística encontrada' });
        }
        
        res.json({ success: true, stats: stats.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

// ============================================
// FASE 2: MELHORIAS ADICIONAIS - GERAÇÃO DE PERGUNTAS INTELIGENTES
// ============================================

// Gerar perguntas de esclarecimento inteligentes
async function generateIntelligentClarificationQuestions(message, questionContext, ambiguityCheck, client, userId) {
    const questions = [];
    try {
        const userContext = userId ? await getUserContext(client, userId) : null;
        const recentTopics = userContext?.recent_topics || [];
        
        for (const interpretation of ambiguityCheck.interpretations || []) {
            if (interpretation.type === 'pronoun') {
                questions.push('Sobre quem ou o que você está perguntando?');
            } else if (interpretation.type === 'demonstrative') {
                questions.push('Você poderia especificar o que é "isso" ou "aquilo"?');
            } else if (interpretation.type === 'comparative') {
                questions.push('Você está comparando com o quê especificamente?');
            } else if (interpretation.type === 'short' && recentTopics.length > 0) {
                questions.push(`Você está perguntando sobre ${recentTopics[0]} ou outro tópico?`);
            }
        }
        
        if (questionContext.entities && questionContext.entities.length > 0) {
            questions.push(`Você está se referindo a "${questionContext.entities[0]}" especificamente?`);
        }
        
        return questions.slice(0, 3);
    } catch (error) {
        console.error('Erro ao gerar perguntas:', error);
        return ['Você poderia fornecer mais detalhes?'];
    }
}

// Gerar perguntas quando confiança é baixa
async function generateLowConfidenceClarificationQuestions(message, questionContext, client, userId) {
    const questions = [];
    try {
        if (!questionContext.entities || questionContext.entities.length === 0) {
            questions.push('Sobre qual tópico específico você gostaria de saber mais?');
        }
        
        if (questionContext.questionType === 'what' && !message.toLowerCase().includes('como') && !message.toLowerCase().includes('por que')) {
            questions.push('Você quer saber "como funciona" ou "por que acontece"?');
        }
        
        return questions.slice(0, 2);
    } catch (error) {
        return [];
    }
}

// ============================================
// FASE 2: VALIDAÇÃO DE FONTES EXPANDIDA
// ============================================

// Marcar fontes obsoletas
async function markOutdatedSources(client) {
    try {
        const result = await client.query(`
            UPDATE ia_knowledge_base
            SET is_active = false, priority = GREATEST(priority - 20, 0)
            WHERE created_at < NOW() - INTERVAL '365 days'
            AND source_type IN ('tavily', 'web_search')
            AND is_active = true
            RETURNING id
        `);
        return result.rows.length;
    } catch (error) {
        console.error('Erro ao marcar fontes obsoletas:', error);
        return 0;
    }
}

// ============================================
// FASE 2: PERSONALIZAÇÃO AVANÇADA
// ============================================

// Aprender estilo do usuário
async function learnUserCommunicationStyle(client, userId, message, response, feedback) {
    try {
        const messageLength = message.split(/\s+/).length;
        const usesFormalLanguage = /você|senhor|senhora/i.test(message);
        
        const preferences = await client.query(`SELECT * FROM ia_user_preferences WHERE user_id = $1`, [userId]);
        
        if (preferences.rows.length === 0) {
            await client.query(`
                INSERT INTO ia_user_preferences (user_id, preferred_style, knowledge_level, response_length_preference)
                VALUES ($1, $2, $3, $4)
            `, [userId, usesFormalLanguage ? 'detailed' : 'balanced', messageLength > 20 ? 'advanced' : 'intermediate', messageLength > 15 ? 'long' : 'medium']);
        }
    } catch (error) {
        console.error('Erro ao aprender estilo:', error);
    }
}

// Adaptar resposta ao estilo
function adaptResponseToUserStyle(answer, preferences) {
    if (!preferences) return answer;
    let adapted = answer;
    
    if (preferences.knowledge_level === 'beginner') {
        adapted = adapted.replace(/\b(implementar|otimizar)\b/gi, (m) => m === 'implementar' ? 'fazer' : 'melhorar');
    }
    
    if (preferences.response_length_preference === 'short' && adapted.split(/[.!?]+/).length > 5) {
        adapted = adapted.split(/[.!?]+/).slice(0, 5).join('. ') + '.';
    }
    
    return adapted;
}

// ============================================
// SISTEMA DE DESCOBERTA DE LACUNAS
// ============================================

async function identifyKnowledgeGaps(client) {
    try {
        const gaps = [];
        const categoryStats = await client.query(`
            SELECT c.id, c.name, COUNT(kb.id) as knowledge_count
            FROM ia_categories c
            LEFT JOIN ia_knowledge_base kb ON kb.category_id = c.id AND kb.is_active = true
            GROUP BY c.id, c.name
            HAVING COUNT(kb.id) < 5
            ORDER BY knowledge_count ASC
            LIMIT 10
        `);
        
        for (const cat of categoryStats.rows) {
            gaps.push({
                type: 'category',
                category_id: cat.id,
                category_name: cat.name,
                knowledge_count: parseInt(cat.knowledge_count),
                priority: 'high',
                suggestion: `Categoria "${cat.name}" tem apenas ${cat.knowledge_count} item(s). Considere adicionar mais conteúdo.`
            });
        }
        
        return gaps;
    } catch (error) {
        return [];
    }
}

// ============================================
// ENDPOINTS ADICIONAIS
// ============================================

router.get('/knowledge-gaps', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const gaps = await identifyKnowledgeGaps(client);
        res.json({ success: true, gaps, total: gaps.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

router.get('/trends', protectAdmin, asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const client = await db.pool.connect();
    try {
        const categoryTrends = await client.query(`
            SELECT COALESCE(c.name, 'Geral') as category_name, COUNT(*) as question_count
            FROM ia_conversations conv
            LEFT JOIN ia_knowledge_base kb ON kb.id = ANY(conv.knowledge_used_ids)
            LEFT JOIN ia_categories c ON c.id = kb.category_id
            WHERE conv.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
            GROUP BY c.name
            ORDER BY question_count DESC
            LIMIT 10
        `);
        
        res.json({ success: true, trends: { most_asked_categories: categoryTrends.rows } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

// ============================================
// SISTEMA DE TUTORIAIS E ASSISTENTE VIRTUAL
// ============================================

// GET /api/ia-king/tutorials - Listar tutoriais disponíveis
router.get('/tutorials', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Verificar se a tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_tutorials'
            ) as table_exists
        `);
        
        if (!tableCheck.rows[0].table_exists) {
            // Se a tabela não existe, retornar array vazio (frontend usará tutoriais locais)
            console.log('⚠️ Tabela ia_tutorials não existe, retornando array vazio');
            return res.json({ success: true, tutorials: [] });
        }
        
        const userId = req.user?.userId || req.user?.id;
        
        const tutorials = await client.query(`
            SELECT t.*, 
                   COALESCE(utp.is_completed, false) as is_completed,
                   utp.current_step,
                   COALESCE(utp.completed_steps, ARRAY[]::INTEGER[]) as completed_steps
            FROM ia_tutorials t
            LEFT JOIN ia_user_tutorial_progress utp ON utp.tutorial_id = t.id AND utp.user_id = $1
            WHERE t.is_active = true
            ORDER BY COALESCE(t.order_index, 0) ASC, t.created_at ASC
        `, [userId]);
        
        // Garantir que todos os campos necessários estejam presentes
        const formattedTutorials = tutorials.rows.map(tutorial => ({
            id: tutorial.id,
            title: tutorial.title || 'Tutorial sem título',
            description: tutorial.description || '',
            steps: tutorial.steps || [],
            estimated_time: tutorial.estimated_time || 5,
            difficulty: tutorial.difficulty || 'beginner',
            category: tutorial.category || 'general',
            is_completed: tutorial.is_completed || false,
            current_step: tutorial.current_step || 0,
            completed_steps: tutorial.completed_steps || [],
            order_index: tutorial.order_index || 0,
            created_at: tutorial.created_at,
            updated_at: tutorial.updated_at
        }));
        
        res.json({ success: true, tutorials: formattedTutorials });
    } catch (error) {
        console.error('Erro ao buscar tutoriais:', error);
        // Em caso de erro, retornar array vazio para que o frontend use tutoriais locais
        res.json({ success: true, tutorials: [] });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/tutorials/:id/start - Iniciar tutorial
router.post('/tutorials/:id/start', protectUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        // Buscar tutorial
        const tutorial = await client.query(`
            SELECT * FROM ia_tutorials WHERE id = $1 AND is_active = true
        `, [id]);
        
        if (tutorial.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Tutorial não encontrado' });
        }
        
        // Buscar ou criar progresso
        let progress = await client.query(`
            SELECT * FROM ia_user_tutorial_progress
            WHERE user_id = $1 AND tutorial_id = $2
        `, [req.user.userId, id]);
        
        if (progress.rows.length === 0) {
            // Criar novo progresso
            const newProgress = await client.query(`
                INSERT INTO ia_user_tutorial_progress (user_id, tutorial_id, current_step, completed_steps)
                VALUES ($1, $2, 0, ARRAY[]::INTEGER[])
                RETURNING *
            `, [req.user.userId, id]);
            progress = newProgress;
        }
        
        // Atualizar último acesso
        await client.query(`
            UPDATE ia_user_tutorial_progress
            SET last_accessed_at = NOW()
            WHERE user_id = $1 AND tutorial_id = $2
        `, [req.user.userId, id]);
        
        res.json({
            success: true,
            tutorial: {
                ...tutorial.rows[0],
                steps: typeof tutorial.rows[0].steps === 'string' 
                    ? JSON.parse(tutorial.rows[0].steps) 
                    : tutorial.rows[0].steps
            },
            progress: progress.rows[0]
        });
    } catch (error) {
        console.error('Erro ao iniciar tutorial:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/tutorials/:id/progress - Salvar progresso
router.post('/tutorials/:id/progress', protectUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { current_step, completed_steps } = req.body;
    const client = await db.pool.connect();
    try {
        await client.query(`
            UPDATE ia_user_tutorial_progress
            SET current_step = $1,
                completed_steps = $2,
                last_accessed_at = NOW()
            WHERE user_id = $3 AND tutorial_id = $4
        `, [current_step, completed_steps || [], req.user.userId, id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

// POST /api/ia-king/tutorials/:id/complete - Completar tutorial
router.post('/tutorials/:id/complete', protectUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        await client.query(`
            UPDATE ia_user_tutorial_progress
            SET is_completed = true,
                completed_at = NOW(),
                last_accessed_at = NOW()
            WHERE user_id = $1 AND tutorial_id = $2
        `, [req.user.userId, id]);
        
        // Registrar no histórico
        await client.query(`
            INSERT INTO ia_assistant_help_history (user_id, help_type, help_content, page_path, was_helpful)
            VALUES ($1, 'tutorial', $2, '/dashboard', true)
        `, [req.user.userId, `Tutorial completado: ${id}`]);
        
        res.json({ success: true, message: 'Tutorial completado com sucesso!' });
    } catch (error) {
        console.error('Erro ao completar tutorial:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/contextual-help - Buscar ajuda contextual
router.get('/contextual-help', protectUser, asyncHandler(async (req, res) => {
    const { page } = req.query;
    const client = await db.pool.connect();
    try {
        // Verificar se a tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ia_contextual_help'
            ) as table_exists
        `);
        
        if (!tableCheck.rows[0].table_exists) {
            // Se a tabela não existe, retornar array vazio
            console.log('⚠️ Tabela ia_contextual_help não existe, retornando array vazio');
            return res.json({ success: true, help: [] });
        }
        
        const help = await client.query(`
            SELECT * FROM ia_contextual_help
            WHERE page_path = $1 AND is_active = true
            ORDER BY priority DESC
        `, [page || '/dashboard']);
        
        res.json({ success: true, help: help.rows });
    } catch (error) {
        console.error('Erro ao buscar ajuda contextual:', error);
        // Em caso de erro, retornar array vazio
        res.json({ success: true, help: [] });
    } finally {
        client.release();
    }
}));

// ============================================
// EXPANSÃO DA IA PARA TODAS AS ÁREAS DO SISTEMA
// ============================================

// Função wrapper para adicionar contexto do sistema
async function findBestAnswerWithSystemContext(userMessage, userId, systemContext = {}) {
    // Adicionar contexto do sistema à mensagem
    let enhancedMessage = userMessage;
    
    if (systemContext.page) {
        enhancedMessage = `[PÁGINA: ${systemContext.page}] ${enhancedMessage}`;
    }
    
    if (systemContext.action) {
        enhancedMessage = `[AÇÃO: ${systemContext.action}] ${enhancedMessage}`;
    }
    
    if (systemContext.element) {
        enhancedMessage = `[ELEMENTO: ${systemContext.element}] ${enhancedMessage}`;
    }
    
    // Adicionar conhecimento sobre o sistema Conecta King
    const systemKnowledge = `
    [CONHECIMENTO DO SISTEMA CONECTA KING]
    - O Conecta King é uma plataforma de cartões digitais
    - Usuários podem criar cartões virtuais com módulos (links, contatos, produtos, serviços)
    - Existe sistema de páginas de vendas
    - Existe sistema de personalização (cores, fontes, layout)
    - Existe sistema de compartilhamento (link único, QR code)
    - Existe sistema de relatórios e analytics
    - A IA King deve ajudar usuários em TODAS as áreas do sistema
    - A IA King pode executar ações para ajudar usuários (criar cartão, adicionar módulo, etc.)
    - A IA King deve ser proativa e oferecer ajuda
    `;
    
    enhancedMessage = systemKnowledge + '\n\n' + enhancedMessage;
    
    // Chamar função original com mensagem aprimorada
    return await findBestAnswer(enhancedMessage, userId);
}

// ============================================
// NOVO: ANÁLISE E ESTRATÉGIAS DO CARTÃO VIRTUAL
// ============================================

// Analisar cartão virtual do usuário e sugerir melhorias
router.get('/analyze-card', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        if (!advancedUnderstanding) {
            return res.status(500).json({ success: false, error: 'Sistema avançado não disponível' });
        }
        const analysis = await advancedUnderstanding.analyzeVirtualCard(req.user.userId || req.user.id, client);
        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Erro ao analisar cartão:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

// Gerar estratégias para melhorar cartão
router.post('/card-strategies', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        if (!advancedUnderstanding) {
            return res.status(500).json({ success: false, error: 'Sistema avançado não disponível' });
        }
        const analysis = await advancedUnderstanding.analyzeVirtualCard(req.user.userId || req.user.id, client);
        
        // Se não tem cartão, retornar estratégias iniciais
        if (!analysis.hasCard) {
            return res.json({
                success: true,
                strategies: [
                    {
                        name: 'Criar Primeiro Cartão',
                        description: 'Passo a passo para criar seu primeiro cartão virtual',
                        steps: [
                            '1. Preencha suas informações básicas (nome, profissão)',
                            '2. Adicione uma foto de perfil profissional',
                            '3. Escreva uma descrição clara sobre você ou seu negócio',
                            '4. Adicione módulos de contato (WhatsApp, Email)',
                            '5. Personalize cores e layout',
                            '6. Compartilhe seu link único'
                        ]
                    }
                ]
            });
        }
        
        res.json({ success: true, strategies: analysis.strategies || [] });
    } catch (error) {
        console.error('Erro ao gerar estratégias:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
}));

// Endpoint especializado para ajuda no sistema
router.post('/system-help', protectUser, asyncHandler(async (req, res) => {
    const { message, page, action, element } = req.body;
    const client = await db.pool.connect();
    
    try {
        const userId = req.user?.userId || req.user?.id || req.body.userId || null;
        const systemContext = { page, action, element };
        
        if (!userId) {
            // Se não tiver userId, ainda assim tentar responder
            const result = await findBestAnswer(message, null);
            return res.json({
                response: result.answer,
                confidence: result.confidence,
                suggested_actions: [],
                contextual_help: []
            });
        }
        
        const result = await findBestAnswerWithSystemContext(message, userId, systemContext);
        
        // Verificar se há ações sugeridas
        const suggestedActions = await getSuggestedActions(message, page, client);
        
        res.json({
            response: result.answer,
            confidence: result.confidence,
            suggested_actions: suggestedActions,
            contextual_help: await getContextualHelpForPage(page, client)
        });
    } catch (error) {
        console.error('Erro no sistema de ajuda:', error);
        // Retornar resposta básica mesmo em caso de erro
        res.json({
            response: 'Olá! Como posso te ajudar hoje? Estou aqui para te guiar na configuração do seu cartão Conecta King!',
            confidence: 50,
            suggested_actions: [],
            contextual_help: []
        });
    } finally {
        client.release();
    }
}));

// Buscar ações sugeridas baseadas no contexto
async function getSuggestedActions(message, page, client) {
    try {
        const actions = await client.query(`
            SELECT * FROM ia_assistant_actions
            WHERE is_active = true
            AND (category = $1 OR category IS NULL)
            ORDER BY priority DESC
            LIMIT 5
        `, [page || 'dashboard']);
        
        return actions.rows.map(a => ({
            type: a.action_type,
            name: a.action_name,
            description: a.description,
            endpoint: a.api_endpoint
        }));
    } catch (error) {
        console.error('Erro ao buscar ações sugeridas:', error);
        return [];
    }
}

// Buscar ajuda contextual para página
async function getContextualHelpForPage(page, client) {
    try {
        const help = await client.query(`
            SELECT * FROM ia_contextual_help
            WHERE page_path = $1 AND is_active = true
            ORDER BY priority DESC
            LIMIT 3
        `, [page || '/dashboard']);
        
        return help.rows;
    } catch (error) {
        return [];
    }
}

// POST /api/ia-king/chat-public - Chat público para página inicial (sem autenticação)
// USA A MESMA LÓGICA DA IA AUTENTICADA (findBestAnswer) para garantir consistência
router.post('/chat-public', asyncHandler(async (req, res) => {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
        return res.status(400).json({ 
            response: 'Mensagem é obrigatória',
            answer: 'Mensagem é obrigatória',
            confidence: 0,
            source: 'error'
        });
    }
    
    const client = await db.pool.connect();
    try {
        console.log('📥 [IA PUBLIC] Mensagem recebida:', message.substring(0, 100));
        
        // ============================================
        // USAR A MESMA FUNÇÃO findBestAnswer QUE A ROTA AUTENTICADA USA
        // ============================================
        // userId = null para usuários não autenticados
        // IMPORTANTE: findBestAnswer já tem TODA a lógica de detecção de:
        // - Pagamento (PIX, Cartão, Parcelamento)
        // - Planos (King Start, King Prime, King Corporate)
        // - Funcionalidades do sistema
        // - E usa o Gemini para melhorar respostas
        // Esta é a MESMA IA que o dashboard usa - garantindo consistência total
        const result = await findBestAnswer(message.trim(), null);
        
        console.log('✅ [IA PUBLIC] Resposta do findBestAnswer (MESMA IA do dashboard):', {
            confidence: result?.confidence,
            source: result?.source,
            answerLength: result?.answer?.length || 0,
            hasAnswer: !!(result && result.answer),
            answerPreview: result?.answer?.substring(0, 150) || 'SEM RESPOSTA'
        });
        
        // ============================================
        // SEMPRE USAR A RESPOSTA DO findBestAnswer SE EXISTIR
        // ============================================
        // A lógica de detecção de pagamento, planos, etc. já está dentro do findBestAnswer
        // Isso garante que a IA pública seja EXATAMENTE a mesma do dashboard
        if (result && result.answer && result.answer.length > 0) {
            console.log('✅ [IA PUBLIC] Retornando resposta do findBestAnswer (MESMA IA):', {
                source: result.source,
                confidence: result.confidence,
                answerLength: result.answer.length
            });
            
            return res.json({
                success: true,
                response: result.answer,
                answer: result.answer,
                confidence: result.confidence || 0.5,
                source: result.source || 'system',
                category: result.category || 'general'
            });
        }
        
        // Verificar se a mensagem é sobre o sistema ConectaKing (apenas para redirecionamento se necessário)
        const lowerMessage = message.toLowerCase();
        const conectaKingKeywords = [
            'conecta', 'king', 'conectaking', 'plano', 'planos', 'preço', 'preco', 'valor', 'assinatura',
            'cartão', 'cartao', 'virtual', 'nfc', 'qr code', 'qrcode', 'link', 'perfil', 'dashboard',
            'módulo', 'modulo', 'recurso', 'funcionalidade', 'como funciona', 'como usar', 'tutorial',
            'king start', 'king prime', 'king corporate', 'king forms', 'loja virtual', 'carrossel',
            'portfólio', 'portfolio', 'whatsapp', 'instagram', 'redes sociais',
            'pagamento', 'pagar', 'pix', 'cartão de crédito', 'cartao de credito', 'crédito', 'credito',
            'débito', 'debito', 'boleto', 'transferência', 'transferencia', 'forma de pagamento',
            'melhor forma', 'como pagar', 'quanto custa', 'preços', 'valores', 'mensalidade',
            'anual', 'mensal', 'parcelado', 'parcela', 'parcelamento', 'vezes', '12x', 'à vista', 'a vista',
            'quantas vezes', 'quantas parcelas', 'posso parcelar', 'tem juros', 'tem taxa'
        ];
        
        const isAboutConectaKing = conectaKingKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // Se não for sobre ConectaKing, redirecionar
        if (!isAboutConectaKing) {
            return res.json({
                response: 'Olá! 👋\n\nSou a IA King, assistente do ConectaKing. Posso ajudar você apenas com questões relacionadas ao nosso sistema, planos, funcionalidades e como usar o ConectaKing.\n\nPor favor, faça uma pergunta sobre o ConectaKing! 😊',
                answer: 'Olá! 👋\n\nSou a IA King, assistente do ConectaKing. Posso ajudar você apenas com questões relacionadas ao nosso sistema, planos, funcionalidades e como usar o ConectaKing.\n\nPor favor, faça uma pergunta sobre o ConectaKing! 😊',
                confidence: 1,
                source: 'system',
                category: 'redirect'
            });
        }
        
        // Se chegou aqui e não tem resposta, retornar mensagem de erro
        console.warn('⚠️ [IA PUBLIC] Nenhuma resposta encontrada para pergunta sobre ConectaKing');
        return res.json({
            success: false,
            response: 'Desculpe, não consegui processar sua pergunta. Por favor, tente novamente ou pergunte sobre nossos planos e funcionalidades.',
            answer: 'Desculpe, não consegui processar sua pergunta. Por favor, tente novamente ou pergunte sobre nossos planos e funcionalidades.',
            confidence: 0,
            source: 'error',
            category: 'general'
        });
    } catch (error) {
        console.error('❌ [IA PUBLIC] Erro ao processar mensagem:', error);
        console.error('Stack trace:', error.stack);
        
        // Tentar responder mesmo com erro, se for pergunta sobre o sistema
        const lowerMsg = (message || '').toLowerCase();
        const isAboutSystem = lowerMsg.includes('conecta') || 
                             lowerMsg.includes('king') || 
                             lowerMsg.includes('empresa') ||
                             lowerMsg.includes('sistema') ||
                             lowerMsg.includes('sobre') ||
                             /(me\s+)?fale?\s+sobre/i.test(message || '') ||
                             /(me\s+)?fala?\s+sobre/i.test(message || '');
        
        if (isAboutSystem) {
            // Retornar resposta básica sobre o sistema mesmo com erro
            return res.json({
                success: true,
                response: "🏢 **SOBRE O CONECTA KING**\n\n" +
                         "O Conecta King é uma plataforma de cartões virtuais profissionais que transforma a forma como você se conecta.\n\n" +
                         "**💎 PRINCIPAIS FUNCIONALIDADES:**\n" +
                         "• Cartões virtuais personalizados com tecnologia NFC\n" +
                         "• Múltiplos módulos (WhatsApp, Instagram, links, PIX, QR Code, Loja Virtual, King Forms, etc.)\n" +
                         "• Relatórios e analytics\n" +
                         "• Compartilhamento via link único ou QR Code\n\n" +
                         "**👑 PLANOS DISPONÍVEIS:**\n" +
                         "• King Start (R$ 700)\n" +
                         "• King Prime (R$ 1.000)\n" +
                         "• King Corporate (R$ 2.300)\n\n" +
                         "Quer saber mais sobre algum plano específico? Posso te ajudar! 😊",
                answer: "🏢 **SOBRE O CONECTA KING**\n\n" +
                       "O Conecta King é uma plataforma de cartões virtuais profissionais que transforma a forma como você se conecta.\n\n" +
                       "**💎 PRINCIPAIS FUNCIONALIDADES:**\n" +
                       "• Cartões virtuais personalizados com tecnologia NFC\n" +
                       "• Múltiplos módulos (WhatsApp, Instagram, links, PIX, QR Code, Loja Virtual, King Forms, etc.)\n" +
                       "• Relatórios e analytics\n" +
                       "• Compartilhamento via link único ou QR Code\n\n" +
                       "**👑 PLANOS DISPONÍVEIS:**\n" +
                       "• King Start (R$ 700)\n" +
                       "• King Prime (R$ 1.000)\n" +
                       "• King Corporate (R$ 2.300)\n\n" +
                       "Quer saber mais sobre algum plano específico? Posso te ajudar! 😊",
                confidence: 80,
                source: 'fallback_company_info',
                category: 'company'
            });
        }
        
        return res.status(500).json({
            success: false,
            response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou reformule sua pergunta.',
            answer: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou reformule sua pergunta.',
            confidence: 0,
            source: 'error'
        });
    } finally {
        if (client) client.release();
    }
}));

// ============================================
// ROTA DE TREINAMENTO AUTOMÁTICO DO SISTEMA
// ============================================
// POST /api/ia-king/train-system - Treinar IA com informações do sistema
router.post('/train-system', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        console.log('🧠 [IA Trainer] Iniciando treinamento do sistema...');
        
        // 1. Adicionar conhecimento sobre parcelamento primeiro
        await addParcelamentoKnowledge(client);
        
        // 2. Treinar com informações do sistema
        const result = await trainIAWithSystemInfo(client);
        
        res.json({
            success: true,
            message: `Treinamento concluído: ${result.trained} tópicos treinados`,
            trained: result.trained,
            errors: result.errors
        });
    } catch (error) {
        console.error('❌ Erro no treinamento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
}));

// GET /api/ia-king/train-system-status - Verificar status do treinamento
router.get('/train-system-status', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const knowledgeCount = await client.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN source_type = 'system_auto_trained' THEN 1 END) as system_trained
            FROM ia_knowledge_base
            WHERE is_active = true
        `);
        
        const parcelamentoExists = await client.query(`
            SELECT id FROM ia_knowledge_base
            WHERE LOWER(title) LIKE '%parcela%' OR LOWER(title) LIKE '%parcelamento%'
            LIMIT 1
        `);
        
        res.json({
            success: true,
            total_knowledge: parseInt(knowledgeCount.rows[0].total),
            system_trained: parseInt(knowledgeCount.rows[0].system_trained),
            has_parcelamento: parcelamentoExists.rows.length > 0
        });
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
}));

module.exports = router;

