/**
 * Sistema de Treinamento Automático da IA
 * Analisa o sistema (index.html, planos, etc.) e treina a IA com essas informações
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

/**
 * Extrai informações sobre planos e pagamento do index.html
 */
function extractPlanInfoFromHTML(htmlContent) {
    const planInfo = {
        plans: [],
        paymentMethods: [],
        features: []
    };

    // Extrair informações de planos usando regex
    const planRegex = /King\s+(Start|Prime|Corporate)[^<]*?R\$\s*([\d.,]+)/gi;
    const matches = htmlContent.match(planRegex);
    
    if (matches) {
        matches.forEach(match => {
            const planMatch = match.match(/(Start|Prime|Corporate).*?R\$\s*([\d.,]+)/i);
            if (planMatch) {
                planInfo.plans.push({
                    name: `King ${planMatch[1]}`,
                    price: parseFloat(planMatch[2].replace(/\./g, '').replace(',', '.'))
                });
            }
        });
    }

    // Extrair informações de parcelamento
    const parcelRegex = /(\d+)x|parcela|parcelado|dividido/gi;
    if (parcelRegex.test(htmlContent)) {
        planInfo.paymentMethods.push('Cartão de Crédito (até 12x)');
    }

    // Extrair PIX
    if (/pix|PIX/gi.test(htmlContent)) {
        planInfo.paymentMethods.push('PIX (à vista)');
    }

    return planInfo;
}

/**
 * Usa Gemini para analisar o sistema e gerar conhecimento
 */
async function analyzeSystemWithGemini(systemContent, topic) {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    try {
        const prompt = `Você é um especialista em análise de sistemas. Analise o seguinte conteúdo do sistema Conecta King e extraia informações importantes sobre "${topic}".

CONTEÚDO DO SISTEMA:
${systemContent.substring(0, 8000)}

TAREFA:
1. Identifique todas as informações relevantes sobre "${topic}"
2. Organize as informações de forma clara e estruturada
3. Crie uma resposta completa que a IA pode usar para responder perguntas sobre "${topic}"

RESPOSTA (em português brasileiro, formato markdown):`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            }),
            timeout: 15000
        });

        if (!response.ok) {
            console.error('❌ [Gemini Trainer] Erro na API:', response.status);
            return null;
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const answer = data.candidates[0].content.parts[0].text;
            console.log('✅ [Gemini Trainer] Análise concluída para:', topic);
            return answer.trim();
        }

        return null;
    } catch (error) {
        console.error('❌ [Gemini Trainer] Erro ao analisar:', error.message);
        return null;
    }
}

/**
 * Treina a IA com informações do sistema
 */
async function trainIAWithSystemInfo(client) {
    try {
        console.log('🧠 [IA Trainer] Iniciando treinamento com informações do sistema...');

        // 1. Ler index.html
        const indexPath = path.join(__dirname, '../public_html/index.html');
        if (!fs.existsSync(indexPath)) {
            console.warn('⚠️ [IA Trainer] index.html não encontrado');
            return { trained: 0, errors: [] };
        }

        const htmlContent = fs.readFileSync(indexPath, 'utf-8');
        console.log('✅ [IA Trainer] index.html lido');

        // 2. Extrair informações básicas
        const planInfo = extractPlanInfoFromHTML(htmlContent);

        // 3. Tópicos importantes para treinar
        const topics = [
            {
                name: 'Formas de Pagamento e Parcelamento',
                keywords: ['pagamento', 'pix', 'cartão', 'parcela', 'parcelado', '12x', 'à vista'],
                content: htmlContent
            },
            {
                name: 'Planos e Preços',
                keywords: ['king start', 'king prime', 'king corporate', 'preço', 'valor', 'plano'],
                content: htmlContent
            },
            {
                name: 'Funcionalidades do Sistema',
                keywords: ['módulo', 'funcionalidade', 'recurso', 'carrossel', 'loja virtual', 'king forms'],
                content: htmlContent
            },
            {
                name: 'Como Funciona o Conecta King',
                keywords: ['como funciona', 'nfc', 'cartão virtual', 'compartilhar', 'qr code'],
                content: htmlContent
            }
        ];

        let trained = 0;
        const errors = [];

        // 4. Para cada tópico, usar Gemini para analisar e criar conhecimento
        for (const topic of topics) {
            try {
                console.log(`📚 [IA Trainer] Treinando sobre: ${topic.name}`);

                // Verificar se já existe conhecimento sobre este tópico
                const existing = await client.query(`
                    SELECT id FROM ia_knowledge_base
                    WHERE LOWER(title) LIKE LOWER($1)
                    OR keywords::text LIKE LOWER($2)
                    LIMIT 1
                `, [`%${topic.name}%`, `%${topic.keywords[0]}%`]);

                if (existing.rows.length > 0) {
                    console.log(`⏭️ [IA Trainer] Conhecimento já existe para: ${topic.name}`);
                    continue;
                }

                // Usar Gemini para analisar e criar resposta estruturada
                const geminiAnalysis = await analyzeSystemWithGemini(topic.content, topic.name);

                if (geminiAnalysis) {
                    // Buscar categoria
                    let categoryId = null;
                    const catResult = await client.query(`
                        SELECT id FROM ia_categories 
                        WHERE LOWER(name) IN ('assinatura', 'planos', 'sistema', 'funcionalidades')
                        ORDER BY priority DESC LIMIT 1
                    `);
                    if (catResult.rows.length > 0) {
                        categoryId = catResult.rows[0].id;
                    }

                    // Adicionar à base de conhecimento
                    await client.query(`
                        INSERT INTO ia_knowledge_base 
                        (category_id, title, content, keywords, source_type, is_active, priority, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, 'system_auto_trained', true, 95, NOW(), NOW())
                    `, [
                        categoryId,
                        topic.name,
                        geminiAnalysis,
                        topic.keywords.join(', ')
                    ]);

                    trained++;
                    console.log(`✅ [IA Trainer] Conhecimento adicionado: ${topic.name}`);
                } else {
                    // Se Gemini não funcionar, criar conhecimento básico
                    let basicContent = '';
                    
                    if (topic.name.includes('Pagamento')) {
                        basicContent = `**FORMAS DE PAGAMENTO DO CONECTA KING**

1. **PIX (Pagamento à Vista)**
   - Valor integral do plano
   - Ativação imediata após confirmação
   - Sem taxas adicionais

2. **Cartão de Crédito**
   - Parcelamento em até 12x
   - Taxa adicional de 20% sobre o valor
   - Exemplo: Plano King Start (R$ 700) → No cartão: R$ 840 (até 12x de R$ 70)

3. **Pagamento Mensal Recorrente**
   - Pagamento mensal automático
   - Valor dividido em 12 parcelas

**PROCESSO:**
1. Escolha seu plano
2. Selecione a forma de pagamento
3. Entre em contato via WhatsApp
4. Após confirmação, seu plano é ativado

**RECOMENDAÇÃO:** O PIX é a forma mais rápida e econômica!`;
                    } else if (topic.name.includes('Planos')) {
                        basicContent = `**PLANOS DO CONECTA KING**

**King Start** - R$ 700,00 (pagamento único)
- Ideal para iniciar sua presença digital
- Acesso a todos os módulos exceto: Loja Virtual, King Forms, Carrossel
- Link Personalizado (bônus)

**King Prime** - R$ 1.000,00 (pagamento único)
- Para profissionais que buscam impacto
- Todos os módulos disponíveis
- Link Personalizado incluído

**King Corporate** - R$ 2.300,00 (pagamento único)
- Modo empresa
- 3 perfis/cartões
- Todos os módulos e funcionalidades`;
                    }

                    if (basicContent) {
                        let categoryId = null;
                        const catResult = await client.query(`
                            SELECT id FROM ia_categories 
                            WHERE LOWER(name) IN ('assinatura', 'planos')
                            ORDER BY priority DESC LIMIT 1
                        `);
                        if (catResult.rows.length > 0) {
                            categoryId = catResult.rows[0].id;
                        }

                        await client.query(`
                            INSERT INTO ia_knowledge_base 
                            (category_id, title, content, keywords, source_type, is_active, priority, created_at, updated_at)
                            VALUES ($1, $2, $3, $4, 'system_auto_trained', true, 95, NOW(), NOW())
                        `, [
                            categoryId,
                            topic.name,
                            basicContent,
                            topic.keywords.join(', ')
                        ]);

                        trained++;
                        console.log(`✅ [IA Trainer] Conhecimento básico adicionado: ${topic.name}`);
                    }
                }

                // Delay para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`❌ [IA Trainer] Erro ao treinar ${topic.name}:`, error.message);
                errors.push({ topic: topic.name, error: error.message });
            }
        }

        console.log(`✅ [IA Trainer] Treinamento concluído: ${trained} tópicos treinados`);
        return { trained, errors };

    } catch (error) {
        console.error('❌ [IA Trainer] Erro geral:', error);
        return { trained: 0, errors: [error.message] };
    }
}

/**
 * Adiciona conhecimento específico sobre parcelamento
 */
async function addParcelamentoKnowledge(client) {
    try {
        // Verificar se já existe
        const existing = await client.query(`
            SELECT id FROM ia_knowledge_base
            WHERE LOWER(title) LIKE '%parcela%' OR LOWER(title) LIKE '%parcelamento%'
            LIMIT 1
        `);

        if (existing.rows.length > 0) {
            console.log('⏭️ [IA Trainer] Conhecimento sobre parcelamento já existe');
            return;
        }

        const content = `**PARCELAMENTO E FORMAS DE PAGAMENTO**

O Conecta King oferece **3 formas de pagamento**:

**1. PIX (Pagamento à Vista)**
- Valor integral do plano
- Sem taxas adicionais
- Ativação imediata

**2. Cartão de Crédito (Parcelamento)**
- **Até 12 parcelas** disponíveis
- Taxa adicional de 20% sobre o valor
- Exemplos:
  * King Start (R$ 700) → No cartão: R$ 840 (12x de R$ 70)
  * King Prime (R$ 1.000) → No cartão: R$ 1.200 (12x de R$ 100)
  * King Corporate (R$ 2.300) → No cartão: R$ 2.760 (12x de R$ 230)

**3. Pagamento Mensal Recorrente**
- Pagamento mensal automático
- Valor dividido em 12 parcelas mensais

**PERGUNTAS FREQUENTES:**
- "Quantas vezes posso parcelar?" → Até 12x no cartão de crédito
- "Tem juros?" → Sim, 20% de taxa adicional no cartão
- "PIX tem desconto?" → Não, mas não tem taxa adicional
- "Posso pagar mensalmente?" → Sim, via pagamento recorrente`;

        let categoryId = null;
        const catResult = await client.query(`
            SELECT id FROM ia_categories 
            WHERE LOWER(name) IN ('assinatura', 'pagamento')
            ORDER BY priority DESC LIMIT 1
        `);
        if (catResult.rows.length > 0) {
            categoryId = catResult.rows[0].id;
        }

        await client.query(`
            INSERT INTO ia_knowledge_base 
            (category_id, title, content, keywords, source_type, is_active, priority, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'system_auto_trained', true, 100, NOW(), NOW())
        `, [
            categoryId,
            'Parcelamento e Formas de Pagamento',
            content,
            'parcela, parcelamento, parcelado, 12x, cartão de crédito, pagamento, pix, formas de pagamento, quantas vezes, juros'
        ]);

        console.log('✅ [IA Trainer] Conhecimento sobre parcelamento adicionado');

    } catch (error) {
        console.error('❌ [IA Trainer] Erro ao adicionar conhecimento de parcelamento:', error);
    }
}

module.exports = {
    trainIAWithSystemInfo,
    addParcelamentoKnowledge,
    extractPlanInfoFromHTML,
    analyzeSystemWithGemini
};
