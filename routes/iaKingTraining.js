const express = require('express');
const db = require('../db');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Função auxiliar: Extrair palavras-chave
function extractKeywords(text) {
    if (!text) return [];
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);
    return [...new Set(words)].slice(0, 10);
}

// POST /api/ia-king/training/initialize - Treinar IA com todas as informações do sistema
router.post('/training/initialize', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    const adminId = req.user.userId;
    
    try {
        // Converter adminId para número ou usar NULL
        let createdByValue = null;
        if (adminId) {
            const adminIdNum = parseInt(adminId);
            createdByValue = isNaN(adminIdNum) ? null : adminIdNum;
        }
        
        await client.query('BEGIN');
        
        // 1. Buscar informações dos planos
        const plansResult = await client.query(`
            SELECT plan_code, plan_name, price, description, features, whatsapp_message
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY price ASC
        `);
        
        // 2. Buscar informações dos módulos
        const modulesResult = await client.query(`
            SELECT DISTINCT module_type, plan_code, is_available
            FROM module_plan_availability
            ORDER BY module_type, plan_code
        `);
        
        // 3. Organizar módulos por plano
        const modulesByPlan = {};
        modulesResult.rows.forEach(row => {
            if (!modulesByPlan[row.plan_code]) {
                modulesByPlan[row.plan_code] = [];
            }
            if (row.is_available) {
                modulesByPlan[row.plan_code].push(row.module_type);
            }
        });
        
        // 4. Criar conhecimento sobre planos
        const planKnowledge = [];
        for (const plan of plansResult.rows) {
            const features = plan.features ? JSON.parse(JSON.stringify(plan.features)) : {};
            const modules = modulesByPlan[plan.plan_code] || [];
            
            const planInfo = `
PLANO: ${plan.plan_name} (${plan.plan_code})
PREÇO: R$ ${plan.price.toFixed(2)} por mês

DESCRIÇÃO:
${plan.description || 'Plano do Conecta King'}

FUNCIONALIDADES:
${features.can_add_all_modules ? '✓ Pode adicionar todos os módulos disponíveis' : '✗ Módulos limitados'}
${features.can_edit_logo ? '✓ Pode alterar a logomarca do cartão' : '✗ Não pode alterar a logomarca'}
${features.max_profiles ? `✓ Até ${features.max_profiles} perfil(is)` : '✓ 1 perfil'}
${features.is_enterprise ? '✓ Modo empresarial com múltiplos cartões' : ''}

MÓDULOS DISPONÍVEIS:
${modules.length > 0 ? modules.map(m => `• ${m}`).join('\n') : 'Todos os módulos'}

${plan.whatsapp_message ? `MENSAGEM DE RENOVAÇÃO:\n${plan.whatsapp_message}` : ''}
`.trim();
            
            planKnowledge.push({
                title: `Plano ${plan.plan_name} - Conecta King`,
                content: planInfo,
                keywords: extractKeywords(`${plan.plan_name} ${plan.plan_code} ${plan.price} plano assinatura`)
            });
        }
        
        // 5. Criar conhecimento geral sobre o sistema
        const systemKnowledge = [
            {
                title: 'Conecta King - Sistema Completo',
                content: `
CONECTA KING - PLATAFORMA DE CARTÃO VIRTUAL PROFISSIONAL

O Conecta King é uma plataforma completa para criação de cartões virtuais profissionais com módulos personalizáveis.

FUNCIONALIDADES PRINCIPAIS:
• Criação de cartão virtual personalizado
• Múltiplos módulos integrados (WhatsApp, Instagram, TikTok, YouTube, etc.)
• Página de vendas personalizada
• Banner e carrossel de imagens
• Links personalizados
• Integração com redes sociais
• PIX e QR Code para pagamentos
• Compartilhamento fácil via link único

TIPOS DE CONTA:
• Free (30 dias): Período de teste gratuito
• Individual: Plano básico para pessoa física
• Individual com Logo: Plano premium com personalização de logo
• Empresarial: Plano para empresas com múltiplos cartões

MÓDULOS DISPONÍVEIS:
• WhatsApp: Link direto para conversa
• Telegram: Link para canal ou chat
• Email: Link para envio de email
• PIX: Informações de pagamento PIX
• PIX QR Code: QR Code para pagamento
• Facebook: Link para perfil
• Instagram: Link para perfil
• TikTok: Link para perfil
• Twitter/X: Link para perfil
• YouTube: Link para canal ou vídeo
• Spotify: Link para perfil
• LinkedIn: Link para perfil
• Pinterest: Link para perfil
• Link Personalizado: Link customizado com imagem
• Portfolio: Galeria de trabalhos
• Banner: Banner de imagem
• Carrossel: Carrossel de imagens
• YouTube Embed: Vídeo incorporado
• Página de Vendas: Página completa de vendas personalizada

VALORES DOS PLANOS:
• King Start: R$ 700,00 - Uso Individual - ConectaKing NFC, cartão personalizado, links essenciais
• King Prime: R$ 1.000,00 - Uso Individual Premium - NFC Premium, links ilimitados, portfólio, atualizações assistidas
• King Corporate: R$ 2.300,00 - Modo Empresa - 3 cartões, página institucional, suporte prioritário

COMO FUNCIONA:
1. Crie sua conta no Conecta King
2. Escolha um plano de assinatura
3. Personalize seu cartão virtual
4. Adicione os módulos que deseja
5. Compartilhe seu link único
6. Seus contatos acessam e veem todas suas informações

SUPORTE:
Para dúvidas, entre em contato através do WhatsApp ou suporte do sistema.
`.trim(),
                keywords: extractKeywords('conecta king sistema cartão virtual módulos planos funcionalidades')
            },
            {
                title: 'Planos e Valores - Conecta King',
                content: `
PLANOS E VALORES DO CONECTA KING

👑 KING START - R$ 700,00 | Uso Individual
Ideal para quem deseja iniciar sua presença digital com elegância e praticidade.

Incluso:
• ConectaKing NFC
• Cartão digital personalizado
• Links essenciais (WhatsApp, Instagram, redes sociais)
• Ativação e configuração inicial
• Todos os módulos disponíveis
• 1 perfil/cartão
• NÃO pode alterar a logomarca do sistema

👑 KING PRIME - R$ 1.000,00 | Uso Individual Premium
Criado para profissionais que buscam impacto, autoridade e máximo aproveitamento da tecnologia.

Incluso:
• ConectaKing NFC Premium
• Cartão digital completo e altamente personalizado
• Links ilimitados
• Portfólio, localização e botões inteligentes
• Atualizações assistidas
• Ativação e configuração completas
• Todos os módulos disponíveis
• 1 perfil/cartão
• PODE alterar a logomarca do cartão

👑 KING CORPORATE - R$ 2.300,00 | Modo Empresa
A escolha ideal para empresas, equipes comerciais e marcas que desejam padronização, profissionalismo e conversão.

Incluso:
• Modo Empresa ConectaKing
• Página institucional personalizada
• Centralização de contatos corporativos
• Direcionamento estratégico de leads
• Uso corporativo do ConectaKing NFC
• Suporte prioritário
• Ativação e configuração completas
• Todos os módulos disponíveis
• 3 perfis/cartões em uma única assinatura
• PODE alterar a logomarca para cada cartão

FORMAS DE PAGAMENTO:
• PIX: Pagamento à vista (sem acréscimo)
• Cartão de Crédito: Até 12x com acréscimo de 20%
• WhatsApp para renovação

DIFERENCIAIS CONECTAKING:
• Sem mensalidade
• Atualizações em tempo real
• Tecnologia NFC moderna
• Imagem profissional e inovadora
• Solução sustentável e reutilizável

Para assinar ou renovar, acesse a seção "Assinatura" no dashboard.
`.trim(),
                keywords: extractKeywords('planos valores preços king start king prime king corporate R$ 700 1000 2300')
            },
            {
                title: 'Módulos do Conecta King',
                content: `
MÓDULOS DISPONÍVEIS NO CONECTA KING

REDES SOCIAIS:
• WhatsApp: Adicione seu número e crie link direto para conversa
• Telegram: Link para seu canal ou chat no Telegram
• Facebook: Link para seu perfil no Facebook
• Instagram: Link para seu perfil no Instagram
• TikTok: Link para seu perfil no TikTok
• Twitter/X: Link para seu perfil no Twitter/X
• YouTube: Link para seu canal ou vídeo específico
• LinkedIn: Link para seu perfil profissional
• Pinterest: Link para seu perfil no Pinterest
• Spotify: Link para seu perfil no Spotify

CONTATO E PAGAMENTO:
• Email: Link para envio de email
• PIX: Informações de pagamento PIX
• PIX QR Code: QR Code para pagamento rápido

CONTEÚDO PERSONALIZADO:
• Link Personalizado: Crie links customizados com imagem e descrição
• Portfolio: Galeria de trabalhos e projetos
• Banner: Banner de imagem promocional
• Carrossel: Carrossel de múltiplas imagens
• YouTube Embed: Vídeo do YouTube incorporado diretamente
• Página de Vendas: Página completa personalizada para vendas

COMO ADICIONAR MÓDULOS:
1. Acesse seu dashboard
2. Clique em "Adicionar Módulo"
3. Escolha o módulo desejado
4. Preencha as informações
5. Salve e publique

Os módulos disponíveis dependem do seu plano de assinatura.
`.trim(),
                keywords: extractKeywords('módulos whatsapp instagram tiktok youtube facebook linkedin pix email')
            }
        ];
        
        // 6. Inserir todo o conhecimento na base
        let insertedCount = 0;
        
        // Inserir conhecimento sobre planos
        for (const knowledge of planKnowledge) {
            await client.query(
                `INSERT INTO ia_knowledge_base (title, content, keywords, source_type, source_reference, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT DO NOTHING`,
                [
                    knowledge.title,
                    knowledge.content,
                    knowledge.keywords,
                    'system_training',
                    'subscription_plans',
                    createdByValue
                ]
            );
            insertedCount++;
        }
        
        // Inserir conhecimento geral do sistema
        for (const knowledge of systemKnowledge) {
            await client.query(
                `INSERT INTO ia_knowledge_base (title, content, keywords, source_type, source_reference, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT DO NOTHING`,
                [
                    knowledge.title,
                    knowledge.content,
                    knowledge.keywords,
                    'system_training',
                    'system_info',
                    createdByValue
                ]
            );
            insertedCount++;
        }
        
        await client.query('COMMIT');
        
        res.json({
            message: `Treinamento inicial concluído! ${insertedCount} itens de conhecimento adicionados.`,
            inserted: insertedCount,
            plans: plansResult.rows.length,
            modules: modulesResult.rows.length
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao treinar IA:', error);
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;

