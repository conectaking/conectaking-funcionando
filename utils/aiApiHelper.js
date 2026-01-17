/**
 * Helper para integração com APIs de IA gratuitas
 * Suporta: Google Gemini, Hugging Face, Groq
 */

const fetch = require('node-fetch');

// Configuração das APIs (variáveis de ambiente)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || null;
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large';

const GROQ_API_KEY = process.env.GROQ_API_KEY || null;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Gera resposta usando Google Gemini API (GRATUITA)
 */
async function generateWithGemini(userMessage, context = '', localAnswer = null) {
    if (!GEMINI_API_KEY) {
        console.log('⚠️ [Gemini] API Key não configurada');
        return null;
    }

    console.log('🚀 [Gemini] Iniciando geração de resposta...', {
        hasContext: !!context,
        hasLocalAnswer: !!localAnswer,
        messageLength: userMessage.length
    });

    try {
        let systemPrompt = `Você é a IA King, assistente virtual do Conecta King, uma plataforma de cartões virtuais profissionais.

CONTEXTO DO SISTEMA:
${context || 'Você ajuda usuários com dúvidas sobre o sistema Conecta King, planos, funcionalidades e como usar a plataforma.'}`;

        // Se tiver resposta local, pedir para melhorar/refinar
        if (localAnswer) {
            systemPrompt += `\n\nRESPOSTA LOCAL ENCONTRADA (melhore e refine esta resposta):
${localAnswer}

INSTRUÇÕES:
- Use a resposta local como base, mas melhore-a tornando-a mais natural, clara e contextualizada
- Mantenha todas as informações importantes da resposta local
- Adicione contexto quando necessário
- Torne a linguagem mais fluida e profissional
- Se a resposta local estiver incompleta, complete com informações relevantes`;
        } else {
            systemPrompt += `\n\nINSTRUÇÕES:
- Seja educada, profissional e prestativa
- Responda em português brasileiro
- Se a pergunta não for sobre o Conecta King, redirecione educadamente
- Use emojis moderadamente
- Seja clara e objetiva
- Se não souber algo, seja honesta`;
        }

        const prompt = `${systemPrompt}\n\nUsuário: ${userMessage}\n\nIA King:`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            }),
            timeout: 10000 // 10 segundos
        });

        if (!response.ok) {
            console.error('❌ [Gemini] Erro na API:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const answer = data.candidates[0].content.parts[0].text;
            console.log('✅ [Gemini] Resposta gerada com sucesso', {
                answerLength: answer.length,
                preview: answer.substring(0, 100) + '...'
            });
            return answer.trim();
        }

        console.warn('⚠️ [Gemini] Resposta vazia ou formato inesperado:', JSON.stringify(data).substring(0, 200));
        return null;
    } catch (error) {
        console.error('❌ [Gemini] Erro ao gerar resposta:', error.message);
        return null;
    }
}

/**
 * Gera resposta usando Groq API (GRATUITA e RÁPIDA)
 */
async function generateWithGroq(userMessage, context = '') {
    if (!GROQ_API_KEY) {
        return null;
    }

    try {
        const systemPrompt = `Você é a IA King, assistente virtual do Conecta King, uma plataforma de cartões virtuais profissionais.

${context || 'Você ajuda usuários com dúvidas sobre o sistema Conecta King, planos, funcionalidades e como usar a plataforma.'}

Seja educada, profissional e prestativa. Responda em português brasileiro.`;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 1024,
            }),
            timeout: 10000
        });

        if (!response.ok) {
            console.error('❌ [Groq] Erro na API:', response.status);
            return null;
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const answer = data.choices[0].message.content;
            console.log('✅ [Groq] Resposta gerada com sucesso');
            return answer.trim();
        }

        return null;
    } catch (error) {
        console.error('❌ [Groq] Erro ao gerar resposta:', error.message);
        return null;
    }
}

/**
 * Gera resposta usando Hugging Face (GRATUITA)
 */
async function generateWithHuggingFace(userMessage, context = '') {
    if (!HUGGINGFACE_API_KEY) {
        return null;
    }

    try {
        const prompt = `Contexto: ${context || 'Você é a IA King, assistente do Conecta King.'}\n\nUsuário: ${userMessage}\n\nIA King:`;

        const response = await fetch(HUGGINGFACE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: 200,
                    temperature: 0.7,
                }
            }),
            timeout: 15000
        });

        if (!response.ok) {
            console.error('❌ [HuggingFace] Erro na API:', response.status);
            return null;
        }

        const data = await response.json();
        
        if (data && data[0] && data[0].generated_text) {
            const answer = data[0].generated_text.replace(prompt, '').trim();
            console.log('✅ [HuggingFace] Resposta gerada com sucesso');
            return answer;
        }

        return null;
    } catch (error) {
        console.error('❌ [HuggingFace] Erro ao gerar resposta:', error.message);
        return null;
    }
}

/**
 * Tenta gerar resposta usando APIs externas (com fallback)
 * Ordem de prioridade: Gemini > Groq > HuggingFace
 */
async function generateWithExternalAPI(userMessage, context = '', useFallback = true, localAnswer = null) {
    // Tentar Gemini primeiro (melhor qualidade)
    let answer = await generateWithGemini(userMessage, context, localAnswer);
    if (answer) return { answer, source: 'gemini' };

    // Tentar Groq (mais rápido)
    answer = await generateWithGroq(userMessage, context);
    if (answer) return { answer, source: 'groq' };

    // Tentar HuggingFace (último recurso)
    if (useFallback) {
        answer = await generateWithHuggingFace(userMessage, context);
        if (answer) return { answer, source: 'huggingface' };
    }

    return null;
}

/**
 * Verifica se alguma API está configurada
 */
function hasAnyAPIConfigured() {
    return !!(GEMINI_API_KEY || GROQ_API_KEY || HUGGINGFACE_API_KEY);
}

module.exports = {
    generateWithGemini,
    generateWithGroq,
    generateWithHuggingFace,
    generateWithExternalAPI,
    hasAnyAPIConfigured
};
