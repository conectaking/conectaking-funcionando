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
                'youtube_embed', 'sales_page', 'digital_form'
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
                'youtube_embed', 'sales_page', 'digital_form'
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

module.exports = router;

