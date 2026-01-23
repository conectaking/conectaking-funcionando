const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/subscription/info - Buscar informações da assinatura do usuário
router.get('/info', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Buscar informações do usuário
        const userQuery = `
            SELECT 
                u.id,
                u.email,
                u.account_type,
                u.subscription_status,
                u.subscription_expires_at,
                u.subscription_id,
                u.created_at,
                u.is_admin
            FROM users u
            WHERE u.id = $1
        `;
        const userResult = await client.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        const user = userResult.rows[0];
        
        // Buscar planos disponíveis
        const plansQuery = `
            SELECT 
                id,
                plan_code,
                plan_name,
                price,
                monthly_price,
                annual_price,
                description,
                features,
                whatsapp_number,
                whatsapp_message,
                pix_key,
                is_active
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY COALESCE(monthly_price, price) ASC
        `;
        const plansResult = await client.query(plansQuery);
        
        // Determinar qual plano o usuário tem baseado no account_type
        // Mapear account_type para plan_code
        const accountTypeToPlanCode = {
            'individual': 'basic',
            'individual_com_logo': 'premium',
            'basic': 'basic',
            'premium': 'premium',
            'business_owner': 'king_corporate',
            'enterprise': 'king_corporate',
            'king_base': 'king_base',
            'king_finance': 'king_finance',
            'king_finance_plus': 'king_finance_plus',
            'king_premium_plus': 'king_premium_plus',
            'king_corporate': 'king_corporate'
        };
        
        let currentPlan = null;
        const planCode = accountTypeToPlanCode[user.account_type];
        
        if (planCode) {
            currentPlan = plansResult.rows.find(p => p.plan_code === planCode);
        }
        
        // Se não encontrou pelo mapeamento, tentar encontrar pelo account_type diretamente
        if (!currentPlan && user.account_type) {
            currentPlan = plansResult.rows.find(p => p.plan_code === user.account_type);
        }
        
        // Se ainda não encontrou e não é free, usar o primeiro plano como fallback
        if (!currentPlan && user.account_type !== 'free') {
            currentPlan = plansResult.rows[0];
        }
        
        res.json({
            user: {
                id: user.id,
                email: user.email,
                accountType: user.account_type,
                subscriptionStatus: user.subscription_status,
                subscriptionExpiresAt: user.subscription_expires_at,
                subscriptionId: user.subscription_id,
                createdAt: user.created_at,
                isAdmin: user.is_admin
            },
            currentPlan: currentPlan,
            availablePlans: plansResult.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar informações de assinatura:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/subscription/plans - Buscar todos os planos (ADM pode editar)
router.get('/plans', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        
        const plansQuery = `
            SELECT 
                id,
                plan_code,
                plan_name,
                price,
                monthly_price,
                annual_price,
                description,
                features,
                whatsapp_number,
                whatsapp_message,
                pix_key,
                is_active,
                created_at,
                updated_at
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY COALESCE(monthly_price, price) ASC
        `;
        const plansResult = await client.query(plansQuery);
        
        res.json({
            plans: plansResult.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar planos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/subscription/plans/:id - Atualizar plano (apenas ADM)
router.put('/plans/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const planId = parseInt(req.params.id, 10);
        const { 
            plan_name, 
            price, 
            monthly_price, 
            annual_price, 
            description, 
            features, 
            whatsapp_number, 
            whatsapp_message, 
            pix_key, 
            is_active,
            included_modules,  // String separada por vírgula: "Carrossel, Portfólio, Banner"
            excluded_modules    // String separada por vírgula: "King Forms, Gestão Financeira"
        } = req.body;
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem editar planos.' });
        }
        
        // Verificar se plano existe e obter plan_code
        const planCheck = await client.query('SELECT id, plan_code FROM subscription_plans WHERE id = $1', [planId]);
        if (planCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Plano não encontrado.' });
        }
        
        const planCode = planCheck.rows[0].plan_code;
        
        // Iniciar transação
        await client.query('BEGIN');
        
        try {
            // Construir query de atualização dinamicamente
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            
            if (plan_name !== undefined) {
                updateFields.push(`plan_name = $${paramIndex++}`);
                updateValues.push(plan_name);
            }
            if (price !== undefined) {
                updateFields.push(`price = $${paramIndex++}`);
                updateValues.push(parseFloat(price));
            }
            if (monthly_price !== undefined) {
                updateFields.push(`monthly_price = $${paramIndex++}`);
                updateValues.push(monthly_price ? parseFloat(monthly_price) : null);
            }
            if (annual_price !== undefined) {
                updateFields.push(`annual_price = $${paramIndex++}`);
                updateValues.push(annual_price ? parseFloat(annual_price) : null);
            }
            if (description !== undefined) {
                updateFields.push(`description = $${paramIndex++}`);
                updateValues.push(description);
            }
            if (features !== undefined) {
                updateFields.push(`features = $${paramIndex++}`);
                // Se features já é string, usar diretamente; se for objeto, fazer stringify
                const featuresValue = typeof features === 'string' ? features : JSON.stringify(features);
                updateValues.push(featuresValue);
            }
            if (whatsapp_number !== undefined) {
                updateFields.push(`whatsapp_number = $${paramIndex++}`);
                updateValues.push(whatsapp_number || null);
            }
            if (whatsapp_message !== undefined) {
                updateFields.push(`whatsapp_message = $${paramIndex++}`);
                updateValues.push(whatsapp_message || null);
            }
            if (pix_key !== undefined) {
                updateFields.push(`pix_key = $${paramIndex++}`);
                updateValues.push(pix_key || null);
            }
            if (is_active !== undefined) {
                updateFields.push(`is_active = $${paramIndex++}`);
                updateValues.push(is_active);
            }
            
            // Atualizar plano se houver campos para atualizar
            if (updateFields.length > 0) {
                // Adicionar updated_at
                updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
                
                // Adicionar planId no final
                updateValues.push(planId);
                
                const updateQuery = `
                    UPDATE subscription_plans 
                    SET ${updateFields.join(', ')}
                    WHERE id = $${paramIndex}
                    RETURNING *
                `;
                
                await client.query(updateQuery, updateValues);
            }
            
            // Processar módulos incluídos e não incluídos
            if ((included_modules !== undefined || excluded_modules !== undefined) && planCode) {
                console.log('🔄 Processando módulos para o plano:', planCode);
                
                // Mapear nomes de módulos para códigos
                const moduleNameToCode = {
                    'Carrossel': 'carousel',
                    'Loja Virtual': 'sales_page',
                    'King Forms': 'digital_form',
                    'Portfólio': 'portfolio',
                    'Banner': 'banner',
                    'Gestão Financeira': 'finance',
                    'Contratos': 'contract',
                    'Agenda Inteligente': 'agenda'
                };
                
                // Processar módulos incluídos
                const includedList = included_modules 
                    ? included_modules.split(',').map(m => m.trim()).filter(m => m)
                    : [];
                
                // Processar módulos não incluídos
                const excludedList = excluded_modules 
                    ? excluded_modules.split(',').map(m => m.trim()).filter(m => m)
                    : [];
                
                // Criar sets para busca rápida
                const includedSet = new Set(includedList);
                const excludedSet = new Set(excludedList);
                
                // Buscar todos os módulos do sistema
                const allModuleNames = Object.keys(moduleNameToCode);
                
                // Atualizar disponibilidade de cada módulo
                let updatedCount = 0;
                let createdCount = 0;
                
                for (const moduleName of allModuleNames) {
                    const moduleCode = moduleNameToCode[moduleName];
                    if (!moduleCode) continue;
                    
                    // Determinar se o módulo está disponível
                    let isAvailable = false;
                    if (includedSet.has(moduleName)) {
                        isAvailable = true;
                    } else if (excludedSet.has(moduleName)) {
                        isAvailable = false;
                    } else {
                        // Se não está em nenhuma lista, manter o valor atual ou usar false como padrão
                        // Vamos verificar o valor atual primeiro
                        const currentCheck = await client.query(
                            'SELECT is_available FROM module_plan_availability WHERE module_type = $1 AND plan_code = $2',
                            [moduleCode, planCode]
                        );
                        if (currentCheck.rows.length > 0) {
                            isAvailable = currentCheck.rows[0].is_available;
                        } else {
                            isAvailable = false; // Padrão: não disponível se não especificado
                        }
                    }
                    
                    // Verificar se registro existe
                    const checkQuery = `
                        SELECT id FROM module_plan_availability 
                        WHERE module_type = $1 AND plan_code = $2
                    `;
                    const checkResult = await client.query(checkQuery, [moduleCode, planCode]);
                    
                    if (checkResult.rows.length > 0) {
                        // Atualizar existente
                        const updateResult = await client.query(`
                            UPDATE module_plan_availability 
                            SET is_available = $1, updated_at = CURRENT_TIMESTAMP
                            WHERE module_type = $2 AND plan_code = $3
                            RETURNING id, is_available
                        `, [isAvailable, moduleCode, planCode]);
                        updatedCount++;
                        console.log(`  ✅ ${moduleName} (${moduleCode}) → ${isAvailable ? 'incluído' : 'não incluído'} [atualizado]`);
                        console.log(`     Verificação: ID=${updateResult.rows[0].id}, is_available=${updateResult.rows[0].is_available}`);
                    } else {
                        // Criar novo
                        const insertResult = await client.query(`
                            INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                            VALUES ($1, $2, $3)
                            RETURNING id, is_available
                        `, [moduleCode, planCode, isAvailable]);
                        createdCount++;
                        console.log(`  ✅ ${moduleName} (${moduleCode}) → ${isAvailable ? 'incluído' : 'não incluído'} [criado]`);
                        console.log(`     Verificação: ID=${insertResult.rows[0].id}, is_available=${insertResult.rows[0].is_available}`);
                    }
                }
                
                console.log(`✅ Módulos processados: ${updatedCount} atualizados, ${createdCount} criados`);
            }
            
            // Commit da transação
            await client.query('COMMIT');
            console.log('✅ Transação commitada com sucesso!');
            
            // Verificar se os módulos foram realmente salvos (após commit)
            if ((included_modules !== undefined || excluded_modules !== undefined) && planCode) {
                console.log('🔍 Verificando módulos salvos após commit...');
                const verifyQuery = `
                    SELECT module_type, is_available 
                    FROM module_plan_availability 
                    WHERE plan_code = $1 
                    AND module_type IN ('carousel', 'sales_page', 'digital_form', 'portfolio', 'banner', 'finance', 'contract', 'agenda')
                    ORDER BY module_type
                `;
                const verifyResult = await client.query(verifyQuery, [planCode]);
                console.log(`📊 Módulos verificados no banco para ${planCode}:`);
                verifyResult.rows.forEach(row => {
                    console.log(`   ${row.module_type}: is_available = ${row.is_available}`);
                });
            }
            
            // Buscar plano atualizado
            const finalPlanResult = await client.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
            
            res.json({
                message: 'Plano atualizado com sucesso.',
                plan: finalPlanResult.rows[0],
                modulesUpdated: (included_modules !== undefined || excluded_modules !== undefined) ? true : false
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro na transação (ROLLBACK executado):', error);
            throw error;
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar plano:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/subscription/plans-public - Buscar planos disponíveis (público, sem autenticação)
router.get('/plans-public', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const plansQuery = `
            SELECT 
                id,
                plan_code,
                plan_name,
                price,
                monthly_price,
                annual_price,
                description,
                features,
                whatsapp_number,
                whatsapp_message,
                pix_key,
                is_active
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY COALESCE(monthly_price, price) ASC
        `;
        const plansResult = await client.query(plansQuery);
        
        res.json({
            success: true,
            plans: plansResult.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar planos públicos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;

