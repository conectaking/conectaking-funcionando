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
        entertainment: false   // Entretenimento
    };
    
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
        // Priorizar: religioso > histórico > filosófico > científico > político
        if (categories.religious) primaryCategory = 'religious';
        else if (categories.historical) primaryCategory = 'historical';
        else if (categories.philosophical) primaryCategory = 'philosophical';
        else if (categories.scientific) primaryCategory = 'scientific';
        else if (categories.political) primaryCategory = 'political';
        else if (categories.psychological) primaryCategory = 'psychological';
        else if (categories.technical) primaryCategory = 'technical';
        else if (categories.personal) primaryCategory = 'personal';
        else if (categories.educational) primaryCategory = 'educational';
        else if (categories.health) primaryCategory = 'health';
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

// Função para buscar na web (com suporte a Tavily)
async function searchWeb(query, config = null) {
    try {
        const results = [];
        
        // Se Tavily estiver configurado e habilitado, usar primeiro
        if (config && config.is_enabled && config.api_provider === 'tavily' && config.api_key) {
            console.log('🚀 [Tavily] INICIANDO BUSCA COM TAVILY!');
            console.log('🔍 [Tavily] Query:', query.substring(0, 100));
            console.log('🔑 [Tavily] API Key:', config.api_key.substring(0, 20) + '...');
            
            try {
                const tavilyResult = await searchWithTavily(query, config.api_key);
                
                console.log('📊 [Tavily] Resultado da busca:', {
                    hasResults: !!(tavilyResult.results && tavilyResult.results.length > 0),
                    resultsCount: tavilyResult.results?.length || 0,
                    hasAnswer: !!tavilyResult.answer,
                    hasError: !!tavilyResult.error,
                    error: tavilyResult.error
                });
                
                if (tavilyResult.results && tavilyResult.results.length > 0) {
                    console.log('✅ [Tavily] RESULTADOS ENCONTRADOS! Retornando resultados do Tavily.');
                    return tavilyResult;
                } else if (tavilyResult.error) {
                    console.error('❌ [Tavily] ERRO na busca:', tavilyResult.error);
                    // Continuar para fallback
                } else {
                    console.log('⚠️ [Tavily] Nenhum resultado encontrado, usando fallback');
                }
            } catch (error) {
                console.error('❌ [Tavily] EXCEÇÃO ao buscar:', error);
                console.error('Stack:', error.stack);
                // Continuar para fallback
            }
        } else {
            console.log('⚠️ [Tavily] NÃO VAI USAR TAVILY. Verificando configuração...');
            console.log('📋 [Tavily] Config recebida:', {
                hasConfig: !!config,
                is_enabled: config?.is_enabled,
                api_provider: config?.api_provider,
                has_api_key: !!config?.api_key,
                api_key_length: config?.api_key?.length || 0
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
                
                // Buscar configuração de busca na web
                const webConfigResult = await client.query(`
                    SELECT * FROM ia_web_search_config
                    WHERE is_enabled = true 
                    AND api_provider = 'tavily' 
                    AND api_key IS NOT NULL
                    ORDER BY id DESC
                    LIMIT 1
                `);
                
                if (webConfigResult.rows.length > 0) {
                    const webConfig = webConfigResult.rows[0];
                    
                    // Pesquisar com Tavily
                    const webResults = await searchWithTavily(question, webConfig.api_key);
                    
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

// Função para raciocinar sobre a pergunta (CAMADA 1: Análise Profunda)
function thinkAboutQuestion(question, questionContext) {
    const thoughts = {
        intent: null, // O que o usuário realmente quer saber
        entities: questionContext.entities,
        keywords: questionContext.keywords,
        questionType: questionContext.questionType,
        emotionalTone: 'neutral', // neutral, curious, urgent, friendly
        complexity: 'simple', // simple, medium, complex
        needsContext: false,
        relatedTopics: []
    };
    
    const lowerQuestion = question.toLowerCase();
    
    // Detectar intenção
    if (lowerQuestion.includes('quem') || lowerQuestion.includes('o que') || lowerQuestion.includes('que é')) {
        thoughts.intent = 'definition';
        thoughts.complexity = 'medium';
    } else if (lowerQuestion.includes('como') || lowerQuestion.includes('fazer')) {
        thoughts.intent = 'how_to';
        thoughts.complexity = 'medium';
        thoughts.needsContext = true;
    } else if (lowerQuestion.includes('por que') || lowerQuestion.includes('porque')) {
        thoughts.intent = 'explanation';
        thoughts.complexity = 'complex';
        thoughts.needsContext = true;
    } else if (lowerQuestion.includes('quando') || lowerQuestion.includes('onde')) {
        thoughts.intent = 'factual';
        thoughts.complexity = 'simple';
    } else {
        thoughts.intent = 'general';
    }
    
    // Detectar tom emocional
    if (lowerQuestion.includes('!') || lowerQuestion.includes('urgente') || lowerQuestion.includes('preciso')) {
        thoughts.emotionalTone = 'urgent';
    } else if (lowerQuestion.includes('?') && lowerQuestion.length > 20) {
        thoughts.emotionalTone = 'curious';
    } else if (lowerQuestion.includes('obrigad') || lowerQuestion.includes('por favor')) {
        thoughts.emotionalTone = 'friendly';
    }
    
    // Identificar tópicos relacionados
    if (thoughts.entities.length > 0) {
        const mainEntity = thoughts.entities[0];
        // Adicionar tópicos relacionados baseados na entidade
        if (mainEntity.includes('jesus') || mainEntity.includes('cristo')) {
            thoughts.relatedTopics = ['bíblia', 'cristianismo', 'fé', 'religião', 'evangelho'];
        } else if (mainEntity.includes('psicologia') || mainEntity.includes('emocional')) {
            thoughts.relatedTopics = ['terapia', 'saúde mental', 'bem-estar', 'ansiedade'];
        }
    }
    
    return thoughts;
}

// Função para sintetizar resposta de múltiplas fontes (CAMADA 2: Síntese)
function synthesizeAnswer(knowledgeSources, questionContext, thoughts) {
    if (!knowledgeSources || knowledgeSources.length === 0) return null;
    
    // LÓGICA INTELIGENTE: Ajustar limite baseado no tipo de pergunta
    const maxLength = questionContext.questionType === 'who' ? 1500 : 
                     questionContext.questionType === 'what' ? 800 : 500;
    
    // Ordenar por relevância
    const sortedSources = knowledgeSources.sort((a, b) => b.score - a.score);
    const topSources = sortedSources.slice(0, 3); // Top 3 fontes
    
    // Se temos apenas uma fonte muito relevante, usar ela (mas garantir tamanho adequado)
    if (topSources.length === 1 && topSources[0].score > 80) {
        const excerpt = topSources[0].excerpt;
        // Se for pergunta sobre pessoa e a resposta for muito curta, tentar expandir
        if (questionContext.questionType === 'who' && excerpt && excerpt.length < 300) {
            // Tentar buscar mais conteúdo da mesma fonte
            return excerpt; // Por enquanto retornar, mas a lógica acima já deve ter pego mais
        }
        return excerpt;
    }
    
    // Sintetizar de múltiplas fontes
    let synthesized = '';
    const usedSentences = new Set();
    
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
                    sentence.toLowerCase().includes(ent)
                );
                const hasKeyword = questionContext.keywords.some(kw => 
                    sentence.toLowerCase().includes(kw)
                );
                
                // Para perguntas sobre pessoas, ser mais flexível (aceitar mais sentenças)
                const isRelevant = hasEntity || hasKeyword || 
                                 (questionContext.questionType === 'who' && sentence.length > 30);
                
                if (isRelevant) {
                    if (synthesized) synthesized += ' ';
                    synthesized += sentence.trim();
                    if (!sentence.match(/[.!?]$/)) synthesized += '.';
                    
                    // Limitar tamanho baseado no tipo de pergunta
                    if (synthesized.length > maxLength) break;
                }
            }
        }
        
        if (synthesized.length > maxLength) break;
    }
    
    return synthesized || (topSources[0]?.excerpt || null);
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
        // SISTEMA DE PENSAMENTO (Como ChatGPT/Gemini)
        // ============================================
        
        // CAMADA 1: Extrair contexto e raciocinar sobre a pergunta
        const questionContext = extractQuestionContext(userMessage);
        const thoughts = thinkAboutQuestion(userMessage, questionContext);
        
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
            
            // Buscar conhecimento geral
            knowledgeResult = await client.query(`
                SELECT id, title, content, keywords, usage_count, source_type, category_id
                FROM ia_knowledge_base
                WHERE is_active = true
                AND source_type NOT IN ('book_training', 'tavily_book', 'tavily_book_trained')
            `);
            
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
            
            // Array para armazenar todos os candidatos com scores
            const candidates = [];
            
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
                                break;
                            }
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
                } else if (!excerpt) {
                    // Se não tem entidade, usar início do conteúdo
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
                    bestAnswer = finalAnswer;
                    bestScore = bestCandidate.score;
                    bestSource = 'knowledge';
                    
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
        // 1. Tavily está configurado E habilitado
        // 2. NÃO buscar se já temos resposta de LIVRO (prioridade máxima - conhecimento dos livros é mais confiável)
        // 3. PRIORIDADE: Se pergunta NÃO é sobre sistema, buscar (mas não se tiver resposta de livro)
        // 4. Se é sobre sistema, buscar apenas se não tem resposta ou score baixo
        const hasTavilyConfig = webSearchConfig && 
                                webSearchConfig.is_enabled && 
                                webSearchConfig.api_provider === 'tavily' &&
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
        
        if (hasTavilyConfig) {
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
            hasTavilyConfig: hasTavilyConfig,
            questionIsAboutSystem: questionIsAboutSystem,
            hasAnswer: !!bestAnswer,
            bestScore: bestScore,
            motivo: !webSearchConfig ? '❌ Sem configuração' :
                    !webSearchConfig.is_enabled ? '❌ Desabilitado' :
                    webSearchConfig.api_provider !== 'tavily' ? `❌ Provider errado: ${webSearchConfig.api_provider}` :
                    !webSearchConfig.api_key ? '❌ Sem API key' :
                    hasBookKnowledge ? '📚 Tem conhecimento de LIVRO - Prioridade máxima!' :
                    !questionIsAboutSystem ? '✅ PERGUNTA EXTERNA - Sempre buscar!' :
                    !bestAnswer ? '✅ Sem resposta na base' :
                    bestScore < 60 ? `✅ Score baixo: ${bestScore}` :
                    '⏭️ Não deve buscar (pergunta sobre sistema com boa resposta)'
        });
        
        if (shouldSearchWeb) {
            console.log('🚀 [IA] INICIANDO BUSCA NA WEB COM TAVILY!');
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
                        
                        if (shouldLearn && bestSource && bestSource.includes('web')) {
                            // Aprender de resposta da web
                            await learnFromTavily(userMessage, bestAnswer, client);
                            
                            // Registrar no histórico de auto-aprendizado
                            const keywords = extractKeywords(userMessage);
                            await client.query(`
                                INSERT INTO ia_auto_learning_history 
                                (question, answer, source, confidence_score, keywords)
                                VALUES ($1, $2, 'tavily', $3, $4)
                            `, [userMessage, bestAnswer.substring(0, 5000), bestScore, keywords]);
                            
                            console.log('🧠 [IA] Auto-aprendizado: Resposta gravada na memória!');
                        } else if (shouldLearn && bestAnswer) {
                            // Gravar qualquer resposta útil (mesmo que não seja da web)
                            const keywords = extractKeywords(userMessage);
                            await client.query(`
                                INSERT INTO ia_auto_learning_history 
                                (question, answer, source, confidence_score, keywords)
                                VALUES ($1, $2, 'conversation', $3, $4)
                                ON CONFLICT DO NOTHING
                            `, [userMessage, bestAnswer.substring(0, 5000), bestScore, keywords]);
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
                                
                                // Buscar automaticamente
                                if (webSearchConfig && webSearchConfig.is_enabled && webSearchConfig.api_provider === 'tavily' && webSearchConfig.api_key) {
                                    const autoSearchResult = await searchWithTavily(userMessage, webSearchConfig.api_key);
                                    
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
            // Se a pergunta tem entidades mas não encontramos conhecimento, ser específico
            if (questionContext.entities.length > 0) {
                const entity = questionContext.entities[0];
                return {
                    answer: `Olá! 😊 Não encontrei informações específicas sobre "${entity}" na minha base de conhecimento atual.\n\nMas estou sempre aprendendo! Se você tiver informações sobre isso ou quiser que eu busque na internet (se estiver habilitado), posso ajudar.\n\nTambém posso te ajudar com dúvidas sobre o Conecta King se precisar! 😊`,
                    confidence: 0,
                    source: 'no_knowledge',
                    mentalMode: mentalMode,
                    category: categoryInfo ? categoryInfo.primaryCategory : 'general'
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
                    category: categoryInfo ? categoryInfo.primaryCategory : 'general'
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
        
        return {
            answer: bestAnswer,
            confidence: finalConfidence,
            source: bestSource || 'none',
            mentalMode: mentalMode,
            auditPassed: auditResult ? auditResult.passed : null,
            hallucinationRisk: validation ? validation.hallucinationRisk : null,
            cognitiveVersion: '2.0',
            category: categoryInfo ? categoryInfo.primaryCategory : 'general'
        };
    } catch (error) {
        console.error('❌ [IA] ERRO em findBestAnswer:', error);
        console.error('Stack:', error.stack);
        
        // Retornar resposta de erro educada
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
                books_with_sections: booksWithSections.filter(b => b.has_sections).length
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
            }
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
            LEFT JOIN ia_conversations ic ON kb.id = ANY(ic.knowledge_used)
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

// POST /api/ia-king/auto-train-mind - Treinamento automático da mentalidade na internet
router.post('/auto-train-mind', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        console.log('🚀 [IA] Iniciando treinamento automático da mentalidade na internet...');
        
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
        
        // Tópicos para treinar a IA (mentalidade, cognição, resposta, entendimento)
        const trainingTopics = [
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
            'sistemas de busca semântica'
        ];
        
        let knowledgeAdded = 0;
        let topicsSearched = 0;
        const startTime = Date.now();
        
        // Criar registro de treinamento
        const trainingRecord = await client.query(`
            INSERT INTO ia_auto_train_mind_history 
            (started_by, status, training_topics, tavily_api_used)
            VALUES ($1, 'running', $2, true)
            RETURNING id
        `, [req.user.id, trainingTopics]);
        
        const trainingId = trainingRecord.rows[0].id;
        
        // Buscar e aprender com cada tópico
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
                
                // Buscar com Tavily
                const tavilyResponse = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        api_key: tavilyApiKey,
                        query: topic,
                        search_depth: 'advanced',
                        max_results: 5
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
                
                // Processar cada resultado
                for (const result of tavilyData.results) {
                    if (!result.content || result.content.length < 100) continue;
                    
                    // Verificar se já existe conhecimento similar
                    const existingCheck = await client.query(`
                        SELECT id FROM ia_knowledge_base 
                        WHERE title = $1 OR content LIKE $2 
                        LIMIT 1
                    `, [result.title || topic, `%${result.content.substring(0, 50)}%`]);
                    
                    if (existingCheck.rows.length > 0) {
                        console.log(`⏭️ [IA] Conhecimento já existe para: ${result.title}`);
                        continue;
                    }
                    
                    // Adicionar à base de conhecimento
                    const content = (result.content || '').substring(0, 10000); // Limitar tamanho
                    const keywords = extractKeywords(topic + ' ' + content);
                    
                    await client.query(`
                        INSERT INTO ia_knowledge_base 
                        (title, content, keywords, source_type, source_reference, is_active, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
                    `, [
                        result.title || topic,
                        content,
                        keywords,
                        'tavily_training',
                        result.url || 'auto-training'
                    ]);
                    
                    knowledgeAdded++;
                    topicKnowledgeAdded++;
                    console.log(`✅ [IA] Conhecimento adicionado: ${result.title?.substring(0, 50)}`);
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
        `, [topicsSearched, knowledgeAdded, topicsSearched * 5, executionTime, trainingId]);
        
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
        
        console.log(`✅ [IA] Treinamento automático concluído! ${knowledgeAdded} itens adicionados de ${topicsSearched} tópicos em ${executionTime}s.`);
        
        res.json({
            success: true,
            training_id: trainingId,
            topics_searched: topicsSearched,
            knowledge_added: knowledgeAdded,
            execution_time_seconds: executionTime,
            estimated_time: `${executionTime} segundos`,
            message: `Treinamento concluído! ${knowledgeAdded} novos itens de conhecimento adicionados.`
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
            WHERE is_enabled = true AND api_provider = 'tavily' AND api_key IS NOT NULL
            ORDER BY id DESC LIMIT 1
        `);
        
        if (configResult.rows.length === 0) {
            return res.status(400).json({ error: 'Tavily não está configurado ou habilitado' });
        }
        
        const config = configResult.rows[0];
        
        // Buscar livros com Tavily (focar em conteúdo textual, excluir vídeos)
        const bookQuery = `${query} livro book texto pdf documento download ler`;
        console.log('📚 [Busca Livros Tavily] Buscando:', bookQuery);
        
        const tavilyResult = await searchWithTavily(bookQuery, config.api_key);
        
        if (!tavilyResult.results || tavilyResult.results.length === 0) {
            return res.json({ books: [], message: 'Nenhum livro encontrado' });
        }
        
        // Filtrar e formatar resultados de livros
        const books = tavilyResult.results
            .filter(r => {
                const titleLower = (r.title || '').toLowerCase();
                const contentLower = (r.snippet || r.content || '').toLowerCase();
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
                
                return isTextContent || mentionsBook;
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

module.exports = router;
