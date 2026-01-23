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
 * MELHORADO: Para vendas, fornece análise profunda, não só sugestões simples
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

        // Se for tipo de venda, usar análise profunda
        const isSalesType = type.includes('sales') || 
                           type.includes('venda') || 
                           type.includes('store') ||
                           type.includes('product') ||
                           prompt.toLowerCase().includes('venda') ||
                           prompt.toLowerCase().includes('comercial');
        
        if (isSalesType) {
            // Usar análise profunda da IA KING
            try {
                const db = require('../db');
                const client = await db.pool.connect();
                
                try {
                    const analise = await analisarVendasProfundo(prompt, type, req.user.id, client);
                    
                    // Retornar análise profunda + sugestões
                    const suggestions = generateSuggestions(type, prompt, context);
                    
                    res.json({
                        success: true,
                        type: 'deep_analysis',
                        analysis: analise,
                        suggestions: suggestions,
                        message: 'Análise profunda realizada! Veja a análise completa acima e as sugestões abaixo.'
                    });
                } finally {
                    client.release();
                }
            } catch (analysisError) {
                console.error('Erro na análise profunda, usando sugestões normais:', analysisError);
                // Fallback para sugestões normais
                const suggestions = generateSuggestions(type, prompt, context);
                res.json({
                    success: true,
                    suggestions: suggestions
                });
            }
        } else {
            // Para outros tipos, usar sugestões normais
            const suggestions = generateSuggestions(type, prompt, context);
            res.json({
                success: true,
                suggestions: suggestions
            });
        }

    } catch (error) {
        console.error('Erro ao gerar sugestões:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar sugestões'
        });
    }
});

/**
 * Função para análise profunda de vendas (importada do iaKing.js)
 * Reutiliza a lógica de análise profunda
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
        
        // Analisar o conteúdo
        const analise = {
            pontosFortes: [],
            pontosFracos: [],
            oportunidades: [],
            recomendacoes: [],
            score: 0
        };
        
        // Análise de palavras-chave
        const palavrasChave = conteudo.toLowerCase().split(/\s+/).filter(w => w.length > 2);
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
    const keywords = prompt.toLowerCase();
    const suggestions = [];

    // Detectar tipo de negócio baseado em palavras-chave
    const isPhotography = keywords.includes('fotografo') || keywords.includes('fotografia') || 
                         keywords.includes('retratista') || keywords.includes('foto') ||
                         keywords.includes('ensaios') || keywords.includes('sessão');
    
    const isService = keywords.includes('serviço') || keywords.includes('consultoria') ||
                     keywords.includes('atendimento') || keywords.includes('trabalho');
    
    const isProduct = keywords.includes('produto') || keywords.includes('venda') ||
                     keywords.includes('loja') || keywords.includes('comércio');

    if (isPhotography) {
        // Sugestões específicas para fotógrafos e retratistas
        suggestions.push(
            `${storeTitle} - Especializado em fotografia e retratos profissionais. Capturo momentos únicos e transformo em memórias eternas. Com anos de experiência, ofereço serviços personalizados de alta qualidade para casamentos, eventos, ensaios e retratos familiares. Cada clique é uma obra de arte!`,
            
            `Bem-vindo à ${storeTitle}! Sou fotógrafo profissional especializado em retratos e ensaios fotográficos. Minha paixão é capturar a essência de cada pessoa, criando imagens autênticas e emocionantes. Trabalho com equipamentos de última geração e técnicas modernas para garantir resultados excepcionais.`,
            
            `${storeTitle} - Fotografia profissional com olhar artístico. Especializado em retratos que revelam a personalidade única de cada cliente. Ofereço sessões personalizadas, desde ensaios individuais até eventos corporativos. Cada projeto é tratado com dedicação e criatividade para superar expectativas.`,
            
            `Na ${storeTitle}, transformo momentos especiais em memórias duradouras através da fotografia profissional. Com experiência em diversos estilos e técnicas, ofereço serviços completos de retrato, eventos e ensaios. Comprometido em entregar imagens que emocionam e contam histórias únicas.`,
            
            `${storeTitle} - Sua referência em fotografia e retratos. Trabalho com paixão e profissionalismo para criar imagens que realmente importam. Especializado em capturar a beleza natural e autenticidade de cada pessoa. Agende sua sessão e descubra como a fotografia pode transformar momentos em arte!`,
            
            `Conheça ${storeTitle}, onde a fotografia encontra a arte. Especializado em retratos profissionais que valorizam a essência de cada cliente. Ofereço serviços personalizados com atenção aos detalhes, desde o planejamento até a entrega final. Cada imagem é cuidadosamente trabalhada para garantir excelência.`,
            
            `${storeTitle} - Fotografia profissional com toque artístico. Capturo momentos únicos através de uma visão criativa e técnica apurada. Especializado em retratos, ensaios e eventos, ofereço uma experiência completa e personalizada. Suas memórias merecem ser eternizadas com qualidade e dedicação.`
        );
    } else if (isService) {
        // Sugestões para serviços em geral
        suggestions.push(
            `${storeTitle} - Serviços profissionais de excelência. Oferecemos soluções personalizadas para atender suas necessidades com qualidade e comprometimento. Nossa equipe está preparada para entregar resultados que superam expectativas. Entre em contato e descubra como podemos ajudar!`,
            
            `Bem-vindo à ${storeTitle}! Somos especialistas em oferecer serviços de alta qualidade com atendimento diferenciado. Trabalhamos com dedicação e profissionalismo para garantir sua satisfação. Cada projeto é tratado com atenção especial e compromisso com a excelência.`,
            
            `${storeTitle} - Sua parceira em soluções profissionais. Oferecemos serviços personalizados com foco em resultados e qualidade. Nossa experiência e comprometimento fazem a diferença em cada atendimento. Conte conosco para transformar suas necessidades em soluções eficientes.`
        );
    } else {
        // Sugestões genéricas para produtos/lojas
        suggestions.push(
            `Bem-vindo à ${storeTitle}! Somos especialistas em oferecer produtos de alta qualidade com os melhores preços do mercado. Nossa missão é proporcionar uma experiência única de compra, com atendimento personalizado e entrega rápida. Confira nossos produtos exclusivos e descubra o que temos de melhor para você!`,
            
            `${storeTitle} - Sua loja de confiança! Trabalhamos com produtos selecionados, sempre pensando no seu bem-estar e satisfação. Oferecemos variedade, qualidade e preços que cabem no seu bolso. Venha conhecer nossas ofertas especiais e transforme sua experiência de compra!`,
            
            `Na ${storeTitle}, acreditamos que cada cliente merece o melhor. Por isso, selecionamos cuidadosamente nossos produtos para garantir qualidade, durabilidade e excelente custo-benefício. Faça parte da nossa família de clientes satisfeitos e aproveite as melhores ofertas!`,
            
            `Descubra ${storeTitle} - onde qualidade encontra preço justo! Nossa equipe está sempre pronta para atendê-lo com dedicação e carinho. Oferecemos produtos cuidadosamente escolhidos para atender suas necessidades. Venha nos visitar e aproveite nossas promoções exclusivas!`,
            
            `${storeTitle} é sinônimo de confiança e qualidade. Trabalhamos há anos no mercado, sempre priorizando a satisfação dos nossos clientes. Nossos produtos são selecionados com rigor para garantir que você tenha acesso ao melhor. Explore nosso catálogo e encontre exatamente o que procura!`
        );
    }

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
    const keywords = prompt.toLowerCase();
    const suggestions = [];

    // Detectar tipo de negócio
    const isPhotography = keywords.includes('fotografo') || keywords.includes('fotografia') || 
                         keywords.includes('retratista') || keywords.includes('foto') ||
                         keywords.includes('ensaios') || keywords.includes('sessão');
    
    const isService = keywords.includes('serviço') || keywords.includes('consultoria') ||
                     keywords.includes('atendimento') || keywords.includes('trabalho');

    if (isPhotography) {
        // Meta descrições para fotógrafos
        suggestions.push(
            `${storeTitle} - Fotografia profissional especializada em retratos e ensaios. Capturo momentos únicos e transformo em memórias eternas. Serviços personalizados com qualidade excepcional. Agende sua sessão!`,
            
            `Fotografia profissional com ${storeTitle}. Especializado em retratos que revelam a personalidade única. Ensaios personalizados, eventos e sessões corporativas. Qualidade e dedicação em cada projeto.`,
            
            `${storeTitle} oferece serviços de fotografia profissional com olhar artístico. Retratos autênticos, ensaios personalizados e cobertura de eventos. Transforme momentos especiais em obras de arte.`,
            
            `Fotógrafo profissional ${storeTitle} - Especializado em criar imagens que emocionam. Retratos, ensaios e eventos com técnica apurada e criatividade. Suas memórias merecem ser eternizadas com qualidade.`
        );
    } else if (isService) {
        // Meta descrições para serviços
        suggestions.push(
            `${storeTitle} - Serviços profissionais de excelência. Soluções personalizadas com qualidade e comprometimento. Entre em contato e descubra como podemos ajudar!`,
            
            `Serviços profissionais com ${storeTitle}. Atendimento diferenciado e resultados que superam expectativas. Qualidade e dedicação em cada projeto.`
        );
    } else {
        // Meta descrições genéricas
        suggestions.push(
            `Descubra ${storeTitle} - sua loja de confiança com produtos de alta qualidade e os melhores preços. Atendimento personalizado, entrega rápida e garantia de satisfação. Aproveite nossas ofertas exclusivas!`,
            
            `Na ${storeTitle}, você encontra produtos selecionados com cuidado para garantir qualidade e durabilidade. Oferecemos variedade, preços justos e um atendimento que faz a diferença. Venha conhecer!`,
            
            `${storeTitle} - onde qualidade encontra preço justo! Trabalhamos com produtos cuidadosamente escolhidos para atender suas necessidades. Confira nossas promoções e transforme sua experiência de compra.`
        );
    }

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

