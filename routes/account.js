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

router.get('/status', protectUser, async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.email,
                u.account_type AS "accountType",
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
        
        res.json(result.rows[0]);

    } catch (error) {
        console.error("Erro ao buscar status da conta:", error);
        res.status(500).json({ message: 'Erro ao buscar dados da conta.' });
    }
});


router.post('/upgrade', protectUser, async (req, res) => {
    const { targetUserId, newPlan } = req.body; 
    
    // Planos válidos (incluindo novos planos King)
    const validPlans = [
        'individual', 'individual_com_logo', 'business_owner', 'free',
        'king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate',
        'basic', 'premium', 'enterprise'
    ];
    
    if (!validPlans.includes(newPlan)) {
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