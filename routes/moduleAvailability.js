const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/modules/plan-availability-public - Buscar disponibilidade de módulos por plano (público)
router.get('/plan-availability-public', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Buscar todos os módulos e sua disponibilidade por plano
        const availabilityQuery = `
            SELECT 
                mpa.id,
                mpa.module_type,
                mpa.plan_code,
                mpa.is_available,
                mpa.updated_at
            FROM module_plan_availability mpa
            WHERE mpa.module_type IN (
                'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode',
                'facebook', 'instagram', 'tiktok', 'twitter', 'youtube', 
                'spotify', 'linkedin', 'pinterest',
                'link', 'portfolio', 'banner', 'carousel', 
                'youtube_embed', 'instagram_embed', 'sales_page', 'digital_form',
                'finance', 'agenda', 'contract',
                'modo_empresa'
            )
            ORDER BY mpa.module_type, mpa.plan_code
        `;
        const availabilityResult = await client.query(availabilityQuery);
        
        // Organizar por módulo
        const modulesMap = {};
        availabilityResult.rows.forEach(row => {
            if (!modulesMap[row.module_type]) {
                modulesMap[row.module_type] = {
                    module_type: row.module_type,
                    plans: {}
                };
            }
            modulesMap[row.module_type].plans[row.plan_code] = {
                is_available: row.is_available,
                id: row.id
            };
        });
        
        res.json({
            modules: Object.values(modulesMap)
        });
    } catch (error) {
        console.error('❌ Erro ao buscar disponibilidade de módulos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/modules/plan-availability - Buscar disponibilidade de módulos por plano
router.get('/plan-availability', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        
        // Buscar planos ativos da tabela subscription_plans
        const plansResult = await client.query(`
            SELECT plan_code, plan_name, price
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY price ASC
        `);
        
        const activePlans = plansResult.rows.map(row => ({
            plan_code: row.plan_code,
            plan_name: row.plan_name,
            price: parseFloat(row.price)
        }));
        
        // Buscar todos os módulos únicos que existem na tabela
        const allModulesResult = await client.query(`
            SELECT DISTINCT module_type
            FROM module_plan_availability
            ORDER BY module_type
        `);
        
        const allModuleTypes = allModulesResult.rows.map(r => r.module_type);
        
        // Buscar disponibilidade de módulos por plano (apenas para planos ativos)
        const planCodes = activePlans.map(p => p.plan_code);
        const availabilityQuery = `
            SELECT 
                mpa.id,
                mpa.module_type,
                mpa.plan_code,
                mpa.is_available,
                mpa.updated_at
            FROM module_plan_availability mpa
            WHERE mpa.module_type = ANY($1)
            AND mpa.plan_code = ANY($2)
            ORDER BY mpa.module_type, mpa.plan_code
        `;
        const availabilityResult = await client.query(availabilityQuery, [allModuleTypes, planCodes]);
        
        // Organizar por módulo
        const modulesMap = {};
        allModuleTypes.forEach(moduleType => {
            modulesMap[moduleType] = {
                module_type: moduleType,
                plans: {}
            };
            
            // Inicializar todos os planos ativos para este módulo como false (padrão)
            activePlans.forEach(plan => {
                modulesMap[moduleType].plans[plan.plan_code] = {
                    is_available: false,
                    id: null
                };
            });
        });
        
        // Preencher com dados da tabela (sobrescreve os valores padrão)
        availabilityResult.rows.forEach(row => {
            if (modulesMap[row.module_type] && modulesMap[row.module_type].plans[row.plan_code]) {
                // IMPORTANTE: Usar o valor real da tabela, não assumir false
                modulesMap[row.module_type].plans[row.plan_code] = {
                    is_available: row.is_available === true, // Garantir boolean
                    id: row.id
                };
            }
        });
        
        // Log para debug
        console.log(`📊 Módulos carregados: ${Object.keys(modulesMap).length} tipos, ${availabilityResult.rows.length} registros na tabela`);
        
        res.json({
            plans: activePlans,
            modules: Object.values(modulesMap)
        });
    } catch (error) {
        console.error('❌ Erro ao buscar disponibilidade de módulos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/modules/plan-availability - Atualizar disponibilidade de módulos por plano
router.put('/plan-availability', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { updates } = req.body; // Array de { module_type, plan_code, is_available }
        
        console.log(`🔄 Recebida requisição para atualizar módulos. User ID: ${userId}, Updates: ${updates?.length || 0}`);
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            console.warn(`⚠️ Tentativa de acesso negado. User ID: ${userId}, is_admin: ${adminCheck.rows[0]?.is_admin}`);
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem editar.' });
        }
        
        if (!Array.isArray(updates) || updates.length === 0) {
            console.error('❌ Lista de atualizações inválida:', { updates, type: typeof updates, isArray: Array.isArray(updates) });
            return res.status(400).json({ message: 'Lista de atualizações inválida.' });
        }
        
        console.log(`📋 Processando ${updates.length} atualizações de módulos`);
        
        await client.query('BEGIN');
        
        try {
            let updatedCount = 0;
            let createdCount = 0;
            
            for (let i = 0; i < updates.length; i++) {
                const update = updates[i];
                const { module_type, plan_code, is_available } = update;
                
                console.log(`🔍 Processando update ${i + 1}/${updates.length}:`, { module_type, plan_code, is_available, type: typeof is_available });
                
                // Validação rigorosa
                if (!module_type || typeof module_type !== 'string') {
                    console.error(`❌ Update ${i + 1} inválido - module_type:`, { module_type, type: typeof module_type, update });
                    throw new Error(`module_type inválido no update ${i + 1}: ${JSON.stringify(module_type)} (tipo: ${typeof module_type})`);
                }
                if (!plan_code || typeof plan_code !== 'string') {
                    console.error(`❌ Update ${i + 1} inválido - plan_code:`, { plan_code, type: typeof plan_code, update });
                    throw new Error(`plan_code inválido no update ${i + 1}: ${JSON.stringify(plan_code)} (tipo: ${typeof plan_code})`);
                }
                if (typeof is_available !== 'boolean') {
                    console.error(`❌ Update ${i + 1} inválido - is_available:`, { is_available, type: typeof is_available, update });
                    throw new Error(`is_available deve ser boolean no update ${i + 1}, recebido: ${JSON.stringify(is_available)} (tipo: ${typeof is_available})`);
                }
                
                // Verificar se registro existe
                const checkQuery = `
                    SELECT id FROM module_plan_availability 
                    WHERE module_type = $1 AND plan_code = $2
                `;
                const checkResult = await client.query(checkQuery, [module_type, plan_code]);
                
                if (checkResult.rows.length > 0) {
                    // Atualizar existente
                    await client.query(`
                        UPDATE module_plan_availability 
                        SET is_available = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE module_type = $2 AND plan_code = $3
                    `, [is_available, module_type, plan_code]);
                    updatedCount++;
                } else {
                    // Criar novo
                    await client.query(`
                        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                        VALUES ($1, $2, $3)
                    `, [module_type, plan_code, is_available]);
                    createdCount++;
                }
            }
            
            await client.query('COMMIT');
            
            console.log(`✅ Commit realizado: ${updates.length} módulos processados (${updatedCount} atualizados, ${createdCount} criados)`);
            
            res.json({
                message: 'Disponibilidade de módulos atualizada com sucesso.',
                updated: updates.length,
                updatedCount: updatedCount,
                createdCount: createdCount
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro na transação (ROLLBACK executado):', error.message);
            console.error('Stack:', error.stack);
            throw error;
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar disponibilidade de módulos:', error.message);
        console.error('Stack completo:', error.stack);
        console.error('Detalhes do erro:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        throw error;
    } finally {
        client.release();
    }
}));

// Mapeamento account_type -> plan_code (compatível com subscription_plans e module_plan_availability)
// King Start = basic; King Prime = premium (nomes de exibição podem variar)
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
    'abm': 'adm_principal'
};

// GET /api/modules/available - Buscar módulos disponíveis para o usuário atual ou por plan_code
// IMPORTANTE: Usa o plano da ASSINATURA (subscription_id) para respeitar a Separação de Pacotes.
// Apenas os módulos marcados como disponíveis para esse plano na configuração admin são retornados.
router.get('/available', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const planCodeQuery = req.query.plan_code; // Parâmetro opcional para buscar por plan_code
        
        let planCode; // plan_code usado na tabela module_plan_availability (ex: basic, premium, king_prime, etc.)
        let accountType;
        
        if (planCodeQuery) {
            planCode = accountTypeToPlanCode[planCodeQuery] || planCodeQuery;
            accountType = planCodeQuery;
        } else {
            // Buscar usuário com subscription_id e account_type
            const userQuery = await client.query(
                'SELECT account_type, subscription_id FROM users WHERE id = $1',
                [userId]
            );
            if (userQuery.rows.length === 0) {
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }
            const user = userQuery.rows[0];
            accountType = user.account_type;
            
            // Prioridade 1: usar o plano da assinatura (Separação de Pacotes)
            if (user.subscription_id) {
                const planResult = await client.query(
                    'SELECT plan_code, plan_name, is_active FROM subscription_plans WHERE id = $1',
                    [user.subscription_id]
                );
                if (planResult.rows.length > 0) {
                    const plan = planResult.rows[0];
                    if (plan.is_active) {
                        planCode = plan.plan_code;
                    } else {
                        console.warn(`⚠️ /api/modules/available: Usuário ${userId} tem subscription_id=${user.subscription_id} mas o plano ${plan.plan_code} está INATIVO. Usando account_type como fallback.`);
                    }
                } else {
                    console.warn(`⚠️ /api/modules/available: Usuário ${userId} tem subscription_id=${user.subscription_id} mas o plano não existe. Usando account_type como fallback.`);
                }
            }
            
            // Prioridade 2: mapear account_type para plan_code
            if (!planCode) {
                planCode = accountTypeToPlanCode[accountType] || accountType;
            }
            
            // Fallback: conta sem plano definido usa basic
            if (!planCode) {
                planCode = 'basic';
            }
        }
        
        // Buscar módulos do plano base
        const modulesQuery = `
            SELECT DISTINCT module_type
            FROM module_plan_availability
            WHERE plan_code = $1 AND is_available = true
            ORDER BY module_type
        `;
        const modulesResult = await client.query(modulesQuery, [planCode]);
        let availableModules = modulesResult.rows.map(r => r.module_type);
        
        if (availableModules.length === 0) {
            console.warn(`⚠️ /api/modules/available: planCode=${planCode} não retornou nenhum módulo. Verifique se o plano existe em module_plan_availability e tem módulos com is_available=true.`);
        }

        // Aplicar personalização por usuário (apenas quando não é query por plan_code)
        if (!planCodeQuery) {
            const exclusionsResult = await client.query(
                `SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = $1`,
                [userId]
            ).catch(() => ({ rows: [] }));
            const exclusions = new Set((exclusionsResult.rows || []).map(r => r.module_type));
            const individualResult = await client.query(
                `SELECT module_type FROM individual_user_plans WHERE user_id = $1`,
                [userId]
            ).catch(() => ({ rows: [] }));
            const individualAdds = new Set((individualResult.rows || []).map(r => r.module_type));
            availableModules = [...new Set([...availableModules, ...individualAdds].filter(m => !exclusions.has(m)))].sort();
        }

        res.json({
            account_type: accountType,
            plan_code: planCode,
            available_modules: availableModules
        });
    } catch (error) {
        console.error('❌ Erro ao buscar módulos disponíveis:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/modules/individual-plans - Buscar planos individuais por usuário (ADM)
router.get('/individual-plans', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        
        // Verificar se a tabela existe
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'individual_user_plans'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            return res.json({ plans: [] });
        }
        
        const result = await client.query(`
            SELECT 
                iup.id,
                iup.user_id,
                u.email as user_email,
                p.display_name as user_name,
                iup.module_type,
                iup.plan_code,
                iup.created_at,
                iup.updated_at
            FROM individual_user_plans iup
            JOIN users u ON iup.user_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            ORDER BY iup.created_at DESC
        `);
        
        res.json({
            plans: result.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar planos individuais:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/modules/users-list - Buscar lista de usuários para seleção (ADM)
router.get('/users-list', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        
        const result = await client.query(`
            SELECT 
                u.id,
                u.email,
                COALESCE(p.display_name, u.email) as name,
                u.account_type,
                u.subscription_status,
                u.subscription_expires_at,
                u.created_at,
                u.is_admin,
                CASE 
                    WHEN u.subscription_expires_at IS NULL THEN true
                    WHEN u.subscription_expires_at >= CURRENT_DATE THEN true
                    ELSE false
                END as is_active
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            ORDER BY COALESCE(p.display_name, u.email) ASC
        `);
        
        res.json({
            users: result.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar lista de usuários:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/modules/individual-plans/:userId - Buscar módulos de um usuário específico (ADM)
router.get('/individual-plans/:userId', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const adminUserId = req.user.userId;
        const targetUserId = req.params.userId;
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [adminUserId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        
        // Buscar informações do usuário
        const userResult = await client.query(`
            SELECT 
                u.id,
                u.email,
                COALESCE(p.display_name, u.email) as name,
                u.account_type
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = $1
        `, [targetUserId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        const user = userResult.rows[0];
        
        // Buscar módulos individuais (extras) e exclusões (tirar do plano)
        const individualModulesResult = await client.query(`
            SELECT module_type FROM individual_user_plans WHERE user_id = $1
        `, [targetUserId]);
        const individualModules = individualModulesResult.rows.map(r => r.module_type);
        const exclusionsResult = await client.query(`
            SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = $1
        `, [targetUserId]).catch(() => ({ rows: [] }));
        const excludedModules = new Set((exclusionsResult.rows || []).map(r => r.module_type));
        
        // Resolver plan_code: prioridade subscription_id (plano da assinatura), depois account_type
        let planCode = null;
        const userWithSub = await client.query(
            'SELECT account_type, subscription_id FROM users WHERE id = $1',
            [targetUserId]
        );
        if (userWithSub.rows.length > 0 && userWithSub.rows[0].subscription_id) {
            const planRow = await client.query(
                'SELECT plan_code FROM subscription_plans WHERE id = $1 AND is_active = true',
                [userWithSub.rows[0].subscription_id]
            );
            if (planRow.rows.length > 0) planCode = planRow.rows[0].plan_code;
        }
        if (!planCode) planCode = user.account_type || 'free';
        
        // Buscar todos os plan_codes que existem na tabela module_plan_availability
        const availablePlanCodesResult = await client.query(`
            SELECT DISTINCT plan_code 
            FROM module_plan_availability 
            ORDER BY plan_code
        `);
        
        const availablePlanCodes = availablePlanCodesResult.rows.map(r => r.plan_code);
        
        // Verificar se o plan_code do usuário existe na tabela
        if (!availablePlanCodes.includes(planCode)) {
            // Tentar mapear account_type para plan_code conhecido
            const planCodeMap = {
                'basic': 'basic',
                'premium': 'premium',
                'enterprise': 'enterprise',
                'king_base': 'king_base',
                'king_finance': 'king_finance',
                'king_finance_plus': 'king_finance_plus',
                'king_premium_plus': 'king_premium_plus',
                'king_corporate': 'king_corporate',
                'individual': 'basic',
                'individual_com_logo': 'premium',
                'business_owner': 'enterprise',
                'free': 'free'
            };
            
            // Tentar mapear
            const mappedPlanCode = planCodeMap[planCode];
            
            if (mappedPlanCode && availablePlanCodes.includes(mappedPlanCode)) {
                console.log(`📋 Plan code '${planCode}' mapeado para '${mappedPlanCode}'`);
                planCode = mappedPlanCode;
            } else {
                // Buscar plan_code da tabela subscription_plans
                const subscriptionPlanResult = await client.query(`
                    SELECT plan_code
                    FROM subscription_plans
                    WHERE plan_code = $1 AND is_active = true
                    LIMIT 1
                `, [planCode]);
                
                if (subscriptionPlanResult.rows.length > 0) {
                    // O plan_code existe em subscription_plans
                    // Mapear para planos equivalentes na tabela module_plan_availability
                    const equivalentMap = {
                        'basic': 'king_base',      // basic -> king_base (equivalente)
                        'premium': 'king_premium_plus', // premium -> king_premium_plus (equivalente)
                        'enterprise': 'king_corporate',  // enterprise -> king_corporate (equivalente)
                        'individual': 'king_base',
                        'individual_com_logo': 'king_premium_plus',
                        'business_owner': 'king_corporate'
                    };
                    
                    const equivalentPlan = equivalentMap[planCode];
                    
                    if (equivalentPlan && availablePlanCodes.includes(equivalentPlan)) {
                        console.log(`📋 Plan code '${planCode}' mapeado para equivalente '${equivalentPlan}'`);
                        planCode = equivalentPlan;
                    } else if (availablePlanCodes.length > 0) {
                        // Usar o primeiro plano disponível como fallback
                        planCode = availablePlanCodes[0];
                        console.log(`⚠️ Plan code '${user.account_type}' não encontrado, usando '${planCode}' como fallback`);
                    }
                } else if (availablePlanCodes.length > 0) {
                    // Usar o primeiro plano disponível como fallback
                    planCode = availablePlanCodes[0];
                    console.log(`⚠️ Plan code '${user.account_type}' não encontrado, usando '${planCode}' como fallback`);
                }
            }
        }
        
        console.log(`📋 Plan codes disponíveis: ${availablePlanCodes.join(', ')}`);
        console.log(`📋 Usuário: ${user.email}, Account Type: ${user.account_type}, Plan Code usado: ${planCode}`);
        
        // Buscar TODOS os módulos que existem na tabela (de qualquer plano)
        // Isso garante que só mostramos módulos que realmente existem no sistema
        const allModulesInSystemResult = await client.query(`
            SELECT DISTINCT module_type
            FROM module_plan_availability
            ORDER BY module_type
        `);
        
        const allModuleTypes = allModulesInSystemResult.rows.map(r => r.module_type);
        
        // Buscar módulos que estão disponíveis no plano base do usuário
        const baseModulesResult = await client.query(`
            SELECT module_type
            FROM module_plan_availability
            WHERE plan_code = $1 AND is_available = true
        `, [planCode]);
        
        const baseModules = new Set(baseModulesResult.rows.map(r => r.module_type));
        
        console.log(`📋 Usuário: ${user.email}, Plan Code: ${planCode}, Módulos no sistema: ${allModuleTypes.length}, Módulos no plano base: ${baseModulesResult.rows.length}`);
        
        // Lista de módulos: in_base_plan, is_individual (extra), is_excluded (tirou do plano). Todos editáveis.
        const allModules = allModuleTypes.map(moduleType => {
            const inBase = baseModules.has(moduleType);
            const isIndividual = individualModules.includes(moduleType);
            const isExcluded = excludedModules.has(moduleType);
            const isActive = (inBase && !isExcluded) || isIndividual;
            return {
                module_type: moduleType,
                in_base_plan: inBase,
                is_individual: isIndividual,
                is_excluded: isExcluded,
                is_active: isActive  // efetivo: marcado = usuário tem acesso
            };
        });
        
        res.json({
            user: user,
            plan_code: planCode,
            modules: allModules,
            can_edit_base_modules: true  // frontend pode habilitar checkbox em "Já no plano" para tirar do plano
        });
    } catch (error) {
        console.error('❌ Erro ao buscar módulos do usuário:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/modules/individual-plans/:userId - Atualizar módulos do usuário (ADM)
// modules = lista completa de module_type que devem estar ATIVOS (inclui "já no plano" e "adicionar")
// Permite "tirar do plano": desmarcar um módulo que está no plano base grava em exclusions.
router.put('/individual-plans/:userId', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const adminUserId = req.user.userId;
        const targetUserId = req.params.userId;
        const { modules } = req.body; // Array de module_type que devem estar ATIVOS (lista completa)
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [adminUserId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        
        if (!Array.isArray(modules)) {
            return res.status(400).json({ message: 'modules deve ser um array (lista de module_type ativos).' });
        }
        
        const userResult = await client.query(
            'SELECT account_type, subscription_id FROM users WHERE id = $1',
            [targetUserId]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        let planCode = userResult.rows[0].account_type || 'free';
        if (userResult.rows[0].subscription_id) {
            const planRow = await client.query(
                'SELECT plan_code FROM subscription_plans WHERE id = $1 AND is_active = true',
                [userResult.rows[0].subscription_id]
            );
            if (planRow.rows.length > 0) planCode = planRow.rows[0].plan_code;
        }
        
        const activeSet = new Set(modules);
        
        const baseModulesResult = await client.query(`
            SELECT module_type FROM module_plan_availability
            WHERE plan_code = $1 AND is_available = true
        `, [planCode]);
        const baseModules = new Set(baseModulesResult.rows.map(r => r.module_type));
        
        await client.query('BEGIN');
        
        try {
            await client.query('DELETE FROM individual_user_plans WHERE user_id = $1', [targetUserId]);
            await client.query(
                'DELETE FROM individual_user_plan_exclusions WHERE user_id = $1',
                [targetUserId]
            ).catch(() => {});
            
            // Exclusões: módulos do plano base que o admin desmarcou (tirar do plano)
            for (const moduleType of baseModules) {
                if (!activeSet.has(moduleType)) {
                    await client.query(`
                        INSERT INTO individual_user_plan_exclusions (user_id, module_type)
                        VALUES ($1, $2)
                        ON CONFLICT (user_id, module_type) DO NOTHING
                    `, [targetUserId, moduleType]).catch(() => {});
                }
            }
            
            // Extras: módulos ativos que não estão no plano base (adicionar)
            for (const moduleType of activeSet) {
                if (!baseModules.has(moduleType)) {
                    await client.query(`
                        INSERT INTO individual_user_plans (user_id, module_type, plan_code)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (user_id, module_type) DO UPDATE SET updated_at = NOW()
                    `, [targetUserId, moduleType, planCode]);
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                message: 'Módulos atualizados com sucesso. Alterações em "Já no plano" e "Adicionar" foram salvas.'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar módulos individuais:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/modules/configure-modules-page/:userId - Página para configurar módulos (todos editáveis, inclusive "Já no plano")
router.get('/configure-modules-page/:userId', protectUser, asyncHandler(async (req, res) => {
    const adminUserId = req.user.userId;
    const targetUserId = req.params.userId;
    const adminCheck = await db.query('SELECT is_admin FROM users WHERE id = $1', [adminUserId]);
    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    res.render('configureModules', {
        userId: targetUserId,
        userName: '',
        planName: ''
    });
}));

module.exports = router;

