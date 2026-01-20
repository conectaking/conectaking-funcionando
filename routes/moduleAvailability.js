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
                'youtube_embed', 'sales_page', 'digital_form',
                'finance', 'agenda', 'contract'
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
        
        // Buscar todos os módulos e sua disponibilidade por plano
        // Apenas módulos que existem e estão ativos no sistema
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
                'youtube_embed', 'sales_page', 'digital_form',
                'finance', 'agenda', 'contract'
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

// PUT /api/modules/plan-availability - Atualizar disponibilidade de módulos por plano
router.put('/plan-availability', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { updates } = req.body; // Array de { module_type, plan_code, is_available }
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem editar.' });
        }
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ message: 'Lista de atualizações inválida.' });
        }
        
        await client.query('BEGIN');
        
        try {
            for (const update of updates) {
                const { module_type, plan_code, is_available } = update;
                
                if (!module_type || !plan_code || typeof is_available !== 'boolean') {
                    throw new Error('Dados de atualização inválidos');
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
                } else {
                    // Criar novo
                    await client.query(`
                        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                        VALUES ($1, $2, $3)
                    `, [module_type, plan_code, is_available]);
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                message: 'Disponibilidade de módulos atualizada com sucesso.',
                updated: updates.length
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar disponibilidade de módulos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/modules/available - Buscar módulos disponíveis para o usuário atual ou por plan_code
router.get('/available', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const planCode = req.query.plan_code; // Parâmetro opcional para buscar por plan_code
        
        let accountType;
        
        if (planCode) {
            // Mapear plan_code para account_type
            const planCodeMap = {
                'individual': 'individual',
                'individual_com_logo': 'individual_com_logo',
                'business_owner': 'business_owner',
                'free': 'free'
            };
            accountType = planCodeMap[planCode] || planCode;
        } else {
            // Buscar account_type do usuário
            const userQuery = await client.query('SELECT account_type FROM users WHERE id = $1', [userId]);
            if (userQuery.rows.length === 0) {
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }
            accountType = userQuery.rows[0].account_type;
        }
        
        // Buscar módulos disponíveis para este plano
        const modulesQuery = `
            SELECT DISTINCT module_type
            FROM module_plan_availability
            WHERE plan_code = $1 AND is_available = true
            ORDER BY module_type
        `;
        const modulesResult = await client.query(modulesQuery, [accountType]);
        
        res.json({
            account_type: accountType,
            plan_code: planCode || null,
            available_modules: modulesResult.rows.map(r => r.module_type)
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
                u.is_admin
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
        
        // Buscar módulos individuais do usuário
        const individualModulesResult = await client.query(`
            SELECT module_type
            FROM individual_user_plans
            WHERE user_id = $1
        `, [targetUserId]);
        
        const individualModules = individualModulesResult.rows.map(r => r.module_type);
        
        // Buscar todos os módulos disponíveis e sua disponibilidade no plano do usuário
        const planCode = user.account_type || 'free';
        
        const allModulesResult = await client.query(`
            SELECT DISTINCT
                m1.module_type,
                COALESCE(m2.is_available, false) as in_base_plan
            FROM module_plan_availability m1
            LEFT JOIN module_plan_availability m2 
                ON m1.module_type = m2.module_type 
                AND m2.plan_code = $1
            ORDER BY m1.module_type
        `, [planCode]);
        
        res.json({
            user: user,
            modules: allModulesResult.rows.map(m => ({
                module_type: m.module_type,
                in_base_plan: m.in_base_plan,
                is_individual: individualModules.includes(m.module_type)
            }))
        });
    } catch (error) {
        console.error('❌ Erro ao buscar módulos do usuário:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/modules/individual-plans/:userId - Atualizar módulos individuais de um usuário (ADM)
router.put('/individual-plans/:userId', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const adminUserId = req.user.userId;
        const targetUserId = req.params.userId;
        const { modules } = req.body; // Array de module_type que devem estar ativos
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [adminUserId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        
        if (!Array.isArray(modules)) {
            return res.status(400).json({ message: 'modules deve ser um array.' });
        }
        
        // Buscar account_type do usuário
        const userResult = await client.query('SELECT account_type FROM users WHERE id = $1', [targetUserId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        const planCode = userResult.rows[0].account_type || 'free';
        
        await client.query('BEGIN');
        
        try {
            // Remover todos os módulos individuais existentes
            await client.query('DELETE FROM individual_user_plans WHERE user_id = $1', [targetUserId]);
            
            // Buscar módulos que estão no plano base
            const baseModulesResult = await client.query(`
                SELECT module_type
                FROM module_plan_availability
                WHERE plan_code = $1 AND is_available = true
            `, [planCode]);
            
            const baseModules = baseModulesResult.rows.map(r => r.module_type);
            
            // Inserir apenas módulos que NÃO estão no plano base
            for (const moduleType of modules) {
                if (!baseModules.includes(moduleType)) {
                    await client.query(`
                        INSERT INTO individual_user_plans (user_id, module_type, plan_code)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (user_id, module_type) DO UPDATE SET updated_at = NOW()
                    `, [targetUserId, moduleType, planCode]);
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                message: 'Módulos individuais atualizados com sucesso.'
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



module.exports = router;

