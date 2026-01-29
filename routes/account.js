const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');

const router = express.Router();


router.get('/details', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados da conta.' });
    } finally {
        client.release();
    }
});

// Mapeamento account_type -> plan_code (igual ao moduleAvailability e subscription_plans) para Separação de Pacotes
// Os plan_code na tabela module_plan_availability são: basic, premium, king_base, king_finance, etc.
const accountTypeToPlanCode = {
    'individual': 'basic',
    'individual_com_logo': 'premium',
    'basic': 'basic',
    'king_start': 'basic',
    'premium': 'premium',
    'king_prime': 'premium',
    'business_owner': 'king_corporate',
    'enterprise': 'king_corporate',
    'king_base': 'king_base',
    'king_essential': 'king_base',
    'king_finance': 'king_finance',
    'king_finance_plus': 'king_finance_plus',
    'king_premium_plus': 'king_premium_plus',
    'king_corporate': 'king_corporate',
    'free': 'free',
    'adm_principal': 'adm_principal',
    'abm': 'adm_principal',
    'team_member': 'basic'  // Membros de equipe usam plano básico
};

router.get('/status', protectUser, async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.email,
                u.account_type AS "accountType",
                u.subscription_id AS "subscriptionId",
                u.is_admin AS "isAdmin",    
                p.display_name AS "name",
                p.profile_image_url AS "profileImageUrl",
                u.subscription_status AS "subscriptionStatus",
                u.subscription_expires_at AS "subscriptionExpiresAt",
                u.company_logo_url AS "companyLogoUrl",
                u.company_logo_size AS "companyLogoSize",   
                u.company_logo_link AS "companyLogoLink"   
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = $1
        `;
        const result = await db.query(query, [req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const user = result.rows[0];
        let planCode = null;
        let planSource = null; // para debug: de onde veio o planCode
        
        // Prioridade 1: subscription_id (plano da assinatura)
        if (user.subscriptionId) {
            const planRow = await db.query(
                'SELECT plan_code, plan_name, is_active FROM subscription_plans WHERE id = $1',
                [user.subscriptionId]
            );
            if (planRow.rows.length > 0) {
                const plan = planRow.rows[0];
                if (plan.is_active) {
                    planCode = plan.plan_code;
                    planSource = `subscription_id=${user.subscriptionId} (${plan.plan_name}, ${plan.plan_code})`;
                } else {
                    console.warn(`⚠️ Usuário ${user.email} (${req.user.userId}) tem subscription_id=${user.subscriptionId} mas o plano ${plan.plan_code} está INATIVO. Usando account_type como fallback.`);
                }
            } else {
                console.warn(`⚠️ Usuário ${user.email} (${req.user.userId}) tem subscription_id=${user.subscriptionId} mas o plano não existe na tabela subscription_plans. Usando account_type como fallback.`);
            }
        }
        
        // Prioridade 2: account_type mapeado
        if (!planCode) {
            const accountType = user.accountType || user.account_type;
            planCode = accountTypeToPlanCode[accountType] || accountType;
            if (planCode && planCode !== accountType) {
                planSource = `account_type=${accountType} → mapeado para ${planCode}`;
            } else if (planCode) {
                planSource = `account_type=${accountType} (usado diretamente)`;
            }
        }
        
        // Fallback: conta sem plano definido usa basic (King Start)
        if (!planCode) {
            planCode = 'basic';
            planSource = 'fallback (sem subscription_id e sem account_type válido)';
        }
        
        console.log(`📦 Usuário ${user.email} (${req.user.userId}): planCode=${planCode} (${planSource})`);

        // Módulos do plano base + extras individuais - exclusões (igual /api/modules/available)
        // Frontend usa para esconder botões: Gestão Financeira, Contratos, Agenda, Modo Empresa (igual Modo Empresa)
        let baseModules = [];
        let individualModules = [];
        let excludedModules = [];
        if (planCode) {
            const baseRes = await db.query(
                `SELECT module_type FROM module_plan_availability WHERE plan_code = $1 AND is_available = true`,
                [planCode]
            );
            baseModules = baseRes.rows.map(r => r.module_type);
            if (baseModules.length === 0) {
                console.warn(`⚠️ Usuário ${user.email} (${req.user.userId}): planCode=${planCode} não retornou nenhum módulo da tabela module_plan_availability. Verifique se o plano existe e tem módulos configurados.`);
            } else {
                console.log(`✅ Usuário ${user.email} (${req.user.userId}): ${baseModules.length} módulos encontrados para planCode=${planCode}: ${baseModules.slice(0, 5).join(', ')}${baseModules.length > 5 ? '...' : ''}`);
            }
        }
        const indRes = await db.query(
            'SELECT module_type FROM individual_user_plans WHERE user_id = $1',
            [req.user.userId]
        ).catch(() => ({ rows: [] }));
        individualModules = (indRes.rows || []).map(r => r.module_type);
        const exclRes = await db.query(
            'SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = $1',
            [req.user.userId]
        ).catch(() => ({ rows: [] }));
        excludedModules = (exclRes.rows || []).map(r => r.module_type);

        const baseSet = new Set(baseModules);
        const individualSet = new Set(individualModules);
        const excludedSet = new Set(excludedModules);
        const hasModule = (type) => (baseSet.has(type) && !excludedSet.has(type)) || individualSet.has(type);

        // Visibilidade dos módulos: segue exatamente a Separação de Módulos (module_plan_availability + individual_user_plans − exclusions)
        // Nenhum override para admin: o que está ativo/desativado no painel "Módulos por Plano" vale para todos, inclusive ADM.
        user.hasModoEmpresa = hasModule('modo_empresa');
        user.hasFinance = hasModule('finance');
        user.hasContract = hasModule('contract');
        user.hasAgenda = hasModule('agenda');
        user.hasBranding = hasModule('branding');
        user.plan_code = planCode; // para debug: qual plano foi usado para calcular os módulos
        
        // Buscar limites de links (módulo isolado)
        try {
            const linkLimitsService = require('../modules/linkLimits/linkLimits.service');
            user.linkLimits = await linkLimitsService.getUserLinkLimits(userId);
        } catch (limitError) {
            // Se houver erro, não quebrar a resposta, apenas logar
            console.warn('Erro ao buscar limites de links:', limitError.message);
            user.linkLimits = {};
        }
        
        // Log detalhado para debug
        console.log(`🔍 [${user.email}] Visibilidade dos módulos:`, {
            planCode: planCode,
            baseModules: Array.from(baseSet),
            individualModules: Array.from(individualSet),
            excludedModules: Array.from(excludedSet),
            hasFinance: user.hasFinance,
            hasContract: user.hasContract,
            hasAgenda: user.hasAgenda,
            hasModoEmpresa: user.hasModoEmpresa,
            hasBranding: user.hasBranding,
            financeInBase: baseSet.has('finance'),
            financeInIndividual: individualSet.has('finance'),
            financeExcluded: excludedSet.has('finance')
        });

        res.json(user);

    } catch (error) {
        console.error("Erro ao buscar status da conta:", error);
        res.status(500).json({ message: 'Erro ao buscar dados da conta.' });
    }
});

// GET /api/account/debug-plan/:email - Diagnóstico: verificar plano e módulos de uma conta específica (ADM)
router.get('/debug-plan/:email', protectUser, async (req, res) => {
    try {
        const { email } = req.params;
        
        // Verificar se é admin
        const adminCheck = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
        if (!adminCheck.rows.length || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem usar esta rota.' });
        }
        
        // Buscar usuário pelo email
        const userQuery = await db.query(
            `SELECT id, email, account_type, subscription_id FROM users WHERE email = $1`,
            [email]
        );
        
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ message: `Usuário com email ${email} não encontrado.` });
        }
        
        const user = userQuery.rows[0];
        let planCode = null;
        let planInfo = null;
        let planSource = null;
        
        // Verificar subscription_id
        if (user.subscription_id) {
            const planRow = await db.query(
                'SELECT id, plan_code, plan_name, price, monthly_price, annual_price, is_active FROM subscription_plans WHERE id = $1',
                [user.subscription_id]
            );
            if (planRow.rows.length > 0) {
                planInfo = planRow.rows[0];
                if (planInfo.is_active) {
                    planCode = planInfo.plan_code;
                    planSource = `subscription_id=${user.subscription_id}`;
                } else {
                    planSource = `subscription_id=${user.subscription_id} (PLANO INATIVO: ${planInfo.plan_code})`;
                }
            } else {
                planSource = `subscription_id=${user.subscription_id} (PLANO NÃO EXISTE NA TABELA)`;
            }
        }
        
        // Verificar account_type
        if (!planCode) {
            const accountType = user.account_type;
            planCode = accountTypeToPlanCode[accountType] || accountType;
            if (planCode && planCode !== accountType) {
                planSource = `account_type=${accountType} → mapeado para ${planCode}`;
            } else if (planCode) {
                planSource = `account_type=${accountType} (usado diretamente)`;
            }
        }
        
        // Fallback
        if (!planCode) {
            planCode = 'basic';
            planSource = 'fallback (sem subscription_id e sem account_type válido)';
        }
        
        // Buscar módulos disponíveis
        const modulesRes = await db.query(
            `SELECT module_type, is_available FROM module_plan_availability WHERE plan_code = $1 ORDER BY module_type`,
            [planCode]
        );
        
        const availableModules = modulesRes.rows.filter(r => r.is_available).map(r => r.module_type);
        const unavailableModules = modulesRes.rows.filter(r => !r.is_available).map(r => r.module_type);
        
        // Buscar módulos individuais e exclusões
        const indRes = await db.query(
            'SELECT module_type FROM individual_user_plans WHERE user_id = $1',
            [user.id]
        ).catch(() => ({ rows: [] }));
        const exclRes = await db.query(
            'SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = $1',
            [user.id]
        ).catch(() => ({ rows: [] }));
        
        res.json({
            user: {
                id: user.id,
                email: user.email,
                account_type: user.account_type,
                subscription_id: user.subscription_id
            },
            plan_resolution: {
                plan_code: planCode,
                source: planSource,
                subscription_plan: planInfo
            },
            modules: {
                available: availableModules,
                unavailable: unavailableModules,
                individual_adds: indRes.rows.map(r => r.module_type),
                individual_exclusions: exclRes.rows.map(r => r.module_type),
                final_available: [...new Set([...availableModules, ...indRes.rows.map(r => r.module_type)].filter(m => !exclRes.rows.some(e => e.module_type === m)))].sort()
            },
            flags: {
                hasFinance: availableModules.includes('finance') || indRes.rows.some(r => r.module_type === 'finance'),
                hasContract: availableModules.includes('contract') || indRes.rows.some(r => r.module_type === 'contract'),
                hasAgenda: availableModules.includes('agenda') || indRes.rows.some(r => r.module_type === 'agenda'),
                hasModoEmpresa: availableModules.includes('modo_empresa') || indRes.rows.some(r => r.module_type === 'modo_empresa'),
                hasBranding: availableModules.includes('branding') || indRes.rows.some(r => r.module_type === 'branding')
            }
        });
    } catch (error) {
        console.error("Erro ao diagnosticar plano:", error);
        res.status(500).json({ message: 'Erro ao diagnosticar plano da conta.' });
    }
});


router.post('/upgrade', protectUser, async (req, res) => {
    const { targetUserId, newPlan } = req.body; 
    
    if (!['individual', 'individual_com_logo', 'business_owner', 'free'].includes(newPlan)) {
        return res.status(400).json({ message: 'Plano inválido.' });
    }

    try {
        await db.query('UPDATE users SET account_type = $1 WHERE id = $2', [newPlan, targetUserId]);
        res.json({ message: `Usuário ${targetUserId} atualizado para o plano ${newPlan}!` });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar plano.' });
    }
});

router.put('/details', protectUser, async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
    }
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email',
            [name, email, req.user.userId]
        );
        res.json({ message: 'Dados atualizados com sucesso!', user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar os dados.' });
    } finally {
        client.release();
    }
});

router.put('/password', protectUser, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Todos os campos de senha são obrigatórios.' });
    }

    const client = await db.pool.connect();
    try {
        const userResult = await client.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'A senha atual está incorreta.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user.userId]);
        res.json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao alterar a senha.' });
    } finally {
        client.release();
    }
});

module.exports = router;