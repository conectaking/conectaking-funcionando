/**
 * Rotas de Sugestões de Texto
 * Gera sugestões inteligentes para descrições, títulos, etc.
 */

const express = require('express');
const router = express.Router();
const { protectUser } = require('../middleware/protectUser');

/**
 * POST /api/suggestions/generate
 * Gera sugestões de texto baseadas em prompt
 */
router.post('/generate', protectUser, async (req, res) => {
    try {
        const { type, prompt, context = {} } = req.body;

        if (!type || !prompt) {
            return res.status(400).json({
                success: false,
                error: 'Tipo e prompt são obrigatórios'
            });
        }

        const suggestions = generateSuggestions(type, prompt, context);

        res.json({
            success: true,
            suggestions: suggestions
        });

    } catch (error) {
        console.error('Erro ao gerar sugestões:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar sugestões'
        });
    }
});

/**
 * Função para gerar múltiplas sugestões
 */
function generateSuggestions(type, prompt, context = {}) {
    const suggestions = [];
    const keywords = prompt.toLowerCase().trim();

    switch (type) {
        case 'store_description':
            suggestions.push(...generateStoreDescriptions(prompt, context));
            break;
        case 'meta_title':
            suggestions.push(...generateMetaTitles(prompt, context));
            break;
        case 'meta_description':
            suggestions.push(...generateMetaDescriptions(prompt, context));
            break;
        case 'product_name':
            suggestions.push(...generateProductNames(prompt, context));
            break;
        case 'product_description':
            suggestions.push(...generateProductDescriptions(prompt, context));
            break;
        default:
            suggestions.push('Tipo de sugestão não reconhecido.');
    }

    return suggestions.map(s => formatText(s)); // Formatar todas as sugestões
}

/**
 * Gerar múltiplas descrições de loja
 */
function generateStoreDescriptions(prompt, context = {}) {
    const storeTitle = context.storeTitle || prompt;
    const suggestions = [];

    suggestions.push(
        `Bem-vindo à ${storeTitle}! Somos especialistas em oferecer produtos de alta qualidade com os melhores preços do mercado. Nossa missão é proporcionar uma experiência única de compra, com atendimento personalizado e entrega rápida. Confira nossos produtos exclusivos e descubra o que temos de melhor para você!`,
        
        `${storeTitle} - Sua loja de confiança! Trabalhamos com produtos selecionados, sempre pensando no seu bem-estar e satisfação. Oferecemos variedade, qualidade e preços que cabem no seu bolso. Venha conhecer nossas ofertas especiais e transforme sua experiência de compra!`,
        
        `Na ${storeTitle}, acreditamos que cada cliente merece o melhor. Por isso, selecionamos cuidadosamente nossos produtos para garantir qualidade, durabilidade e excelente custo-benefício. Faça parte da nossa família de clientes satisfeitos e aproveite as melhores ofertas!`,
        
        `Descubra ${storeTitle} - onde qualidade encontra preço justo! Nossa equipe está sempre pronta para atendê-lo com dedicação e carinho. Oferecemos produtos cuidadosamente escolhidos para atender suas necessidades. Venha nos visitar e aproveite nossas promoções exclusivas!`,
        
        `${storeTitle} é sinônimo de confiança e qualidade. Trabalhamos há anos no mercado, sempre priorizando a satisfação dos nossos clientes. Nossos produtos são selecionados com rigor para garantir que você tenha acesso ao melhor. Explore nosso catálogo e encontre exatamente o que procura!`,
        
        `Conheça a ${storeTitle}, sua parceira ideal para encontrar os melhores produtos com preços incríveis. Oferecemos uma experiência de compra completa, com atendimento diferenciado e produtos que realmente fazem a diferença. Aproveite nossas condições especiais!`,
        
        `${storeTitle} nasceu com o propósito de oferecer produtos de excelência a preços acessíveis. Nossa equipe trabalha diariamente para trazer as melhores opções do mercado, sempre pensando em você. Venha fazer parte da nossa comunidade de clientes satisfeitos!`
    );

    return suggestions;
}

/**
 * Gerar múltiplos meta títulos
 */
function generateMetaTitles(prompt, context = {}) {
    const storeTitle = context.storeTitle || prompt;
    const suggestions = [];

    suggestions.push(
        `${storeTitle} | Produtos de Qualidade e Preços Incríveis`,
        `${storeTitle} - Sua Loja de Confiança | Melhores Ofertas`,
        `${storeTitle} | Encontre Tudo que Você Precisa Aqui`,
        `Compre em ${storeTitle} | Qualidade Garantida e Entrega Rápida`,
        `${storeTitle} | Os Melhores Produtos com os Melhores Preços`,
        `${storeTitle} - Onde Qualidade Encontra Preço Justo`,
        `Produtos Selecionados em ${storeTitle} | Confira Nossas Ofertas`
    );

    return suggestions;
}

/**
 * Gerar múltiplas meta descrições
 */
function generateMetaDescriptions(prompt, context = {}) {
    const storeTitle = context.storeTitle || prompt;
    const suggestions = [];

    suggestions.push(
        `Descubra ${storeTitle} - sua loja de confiança com produtos de alta qualidade e os melhores preços. Atendimento personalizado, entrega rápida e garantia de satisfação. Aproveite nossas ofertas exclusivas!`,
        
        `Na ${storeTitle}, você encontra produtos selecionados com cuidado para garantir qualidade e durabilidade. Oferecemos variedade, preços justos e um atendimento que faz a diferença. Venha conhecer!`,
        
        `${storeTitle} - onde qualidade encontra preço justo! Trabalhamos com produtos cuidadosamente escolhidos para atender suas necessidades. Confira nossas promoções e transforme sua experiência de compra.`,
        
        `Explore ${storeTitle} e descubra uma seleção especial de produtos. Oferecemos qualidade, variedade e os melhores preços do mercado. Faça parte da nossa família de clientes satisfeitos!`,
        
        `Compre com confiança na ${storeTitle}. Produtos de excelência, preços competitivos e atendimento de primeira qualidade. Encontre exatamente o que você procura com as melhores condições!`,
        
        `${storeTitle} oferece os melhores produtos com preços que cabem no seu bolso. Qualidade garantida, entrega rápida e suporte especializado. Aproveite nossas condições especiais!`
    );

    return suggestions;
}

/**
 * Gerar múltiplos nomes de produto
 */
function generateProductNames(prompt, context = {}) {
    const suggestions = [];
    const baseName = prompt.charAt(0).toUpperCase() + prompt.slice(1);
    
    const prefixes = ['Premium', 'Pro', 'Elite', 'Plus', 'Max', 'Ultra', 'Super', 'Master', 'Expert'];
    const suffixes = ['Edition', 'Collection', 'Series', 'Line', 'Model'];
    const qualityWords = ['Qualidade', 'Selecionado', 'Especial', 'Exclusivo', 'Único', 'Profissional'];

    suggestions.push(
        `${baseName} ${prefixes[Math.floor(Math.random() * prefixes.length)]}`,
        `${qualityWords[Math.floor(Math.random() * qualityWords.length)]} ${baseName}`,
        `${baseName} - ${qualityWords[Math.floor(Math.random() * qualityWords.length)]}`,
        `Novo ${baseName}`,
        `${baseName} ${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`,
        `${baseName} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`,
        `${qualityWords[Math.floor(Math.random() * qualityWords.length)]} ${baseName} ${prefixes[Math.floor(Math.random() * prefixes.length)]}`
    );

    return suggestions;
}

/**
 * Gerar múltiplas descrições de produto
 */
function generateProductDescriptions(productName, context = {}) {
    const name = productName.trim();
    const suggestions = [];

    suggestions.push(
        `Descubra o ${name} - um produto de alta qualidade que combina funcionalidade e estilo. Perfeito para quem busca excelência e durabilidade. Não perca a oportunidade de adquirir este produto incrível!`,
        
        `O ${name} é a escolha ideal para você que valoriza qualidade e bom gosto. Com design moderno e materiais selecionados, este produto foi pensado para atender suas necessidades com excelência. Garanta já o seu!`,
        
        `Experimente o ${name} e descubra a diferença que um produto de qualidade faz. Desenvolvido com atenção aos detalhes, oferece performance superior e durabilidade comprovada. Aproveite esta oportunidade única!`,
        
        `${name} - qualidade que você pode confiar! Este produto foi cuidadosamente selecionado para oferecer o melhor custo-benefício. Ideal para quem busca praticidade sem abrir mão da excelência. Não deixe passar!`,
        
        `Conheça o ${name}, um produto que une inovação e tradição. Com características únicas e design diferenciado, é perfeito para quem busca algo especial. Adquira agora e transforme sua experiência!`,
        
        `O ${name} foi desenvolvido para atender às mais altas expectativas. Com tecnologia de ponta e materiais premium, oferece resultados excepcionais. Invista em qualidade e tenha a melhor experiência possível!`,
        
        `Descubra todas as vantagens do ${name}. Produto cuidadosamente elaborado para proporcionar máxima satisfação. Design elegante, funcionalidade superior e garantia de qualidade. Não perca esta oportunidade!`
    );

    return suggestions;
}

/**
 * Formatar texto - corrigir pontuação e espaçamento
 */
function formatText(text) {
    if (!text) return '';
    
    // Remover espaços múltiplos
    text = text.replace(/\s+/g, ' ');
    
    // Garantir espaço após pontuação
    text = text.replace(/([.!?])([A-Za-z])/g, '$1 $2');
    
    // Garantir espaço antes de pontuação (exceto vírgula e ponto)
    text = text.replace(/([a-z])([!?])/g, '$1 $2');
    
    // Remover espaços antes de vírgulas e pontos
    text = text.replace(/\s+([,\.])/g, '$1');
    
    // Garantir espaço após vírgula
    text = text.replace(/,([A-Za-z])/g, ', $1');
    
    // Remover espaços no início e fim
    text = text.trim();
    
    // Garantir que começa com maiúscula
    if (text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
    }
    
    // Garantir que termina com pontuação
    if (text.length > 0 && !/[.!?]$/.test(text)) {
        text += '.';
    }
    
    return text;
}

module.exports = router;

