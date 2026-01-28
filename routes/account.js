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

// Mapeamento account_type -> plan_code (igual ao moduleAvailability e subscription) para Separação de Pacotes
const accountTypeToPlanCode = {
    'individual': 'basic',
    'individual_com_logo': 'premium',
    'basic': 'basic',
    'premium': 'premium',
    'business_owner': 'king_corporate',
    'enterprise': 'king_corporate',
    'king_base': 'king_base',
    'king_essential': 'king_essential',
    'king_finance': 'king_finance',
    'king_finance_plus': 'king_finance_plus',
    'king_premium_plus': 'king_premium_plus',
    'king_corporate': 'king_corporate',
    'free': 'free'
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
        if (user.subscriptionId) {
            const planRow = await db.query(
                'SELECT plan_code FROM subscription_plans WHERE id = $1 AND is_active = true',
                [user.subscriptionId]
            );
            if (planRow.rows.length > 0) {
                planCode = planRow.rows[0].plan_code;
            }
        }
        if (!planCode) {
            const accountType = user.accountType || user.account_type;
            planCode = accountTypeToPlanCode[accountType] || accountType;
        }

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

        user.hasModoEmpresa = hasModule('modo_empresa');
        user.hasFinance = hasModule('finance');
        user.hasContract = hasModule('contract');
        user.hasAgenda = hasModule('agenda');

        res.json(user);

    } catch (error) {
        console.error("Erro ao buscar status da conta:", error);
        res.status(500).json({ message: 'Erro ao buscar dados da conta.' });
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