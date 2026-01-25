
const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');

const router = express.Router();

/**
 * Enriquecer req.user com is_admin e account_type do DB.
 * ADM sempre tem acesso ao modo empresa; não depende do JWT.
 */
async function enrichUserForBusiness(req, res, next) {
    if (!req.user || !req.user.userId) {
        return next();
    }
    try {
        const r = await db.query(
            'SELECT is_admin, account_type FROM users WHERE id = $1',
            [req.user.userId]
        );
        if (r.rows.length > 0) {
            req.user.is_admin = r.rows[0].is_admin;
            req.user.isAdmin = r.rows[0].is_admin === true;
            req.user.account_type = r.rows[0].account_type;
            req.user.accountType = r.rows[0].account_type;
        }
        const planCode = req.user.accountType || req.user.account_type;
        if (planCode) {
            const mod = await db.query(
                `SELECT 1 FROM module_plan_availability 
                 WHERE module_type = 'modo_empresa' AND plan_code = $1 AND is_available = true`,
                [planCode]
            );
            req.user.hasModoEmpresa = mod.rows.length > 0;
        } else {
            req.user.hasModoEmpresa = false;
        }
    } catch (e) {
        console.warn('enrichUserForBusiness:', e.message);
    }
    next();
}

// Modo empresa: King Corporate, business_owner, enterprise, ou plano com modo_empresa. ADM tem acesso sempre.
const protectBusinessOwner = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ message: 'Acesso negado. Apenas para contas empresariais.' });
    }
    const accountType = req.user.accountType || req.user.account_type;
    const isAdmin = req.user.isAdmin === true || req.user.is_admin === true;
    const hasEnterprise = accountType === 'business_owner' || accountType === 'king_corporate' || accountType === 'enterprise';
    const hasModoEmpresa = req.user.hasModoEmpresa === true;
    if (isAdmin || hasEnterprise || hasModoEmpresa) {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Apenas para contas empresariais (King Corporate), plano com Modo Empresa ou ADM.' });
    }
};

// Middleware para personalização de logo: planos com direito a logo (sem exigir Modo Empresa)
const planosComPersonalizarLogo = ['king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'business_owner', 'individual_com_logo', 'enterprise'];
const protectBusinessOwnerOrLogo = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ message: 'Acesso negado. Faça login para personalizar o logo.' });
    }
    const accountType = req.user.accountType || req.user.account_type;
    const isAdmin = req.user.isAdmin === true || req.user.is_admin === true;
    const allowed = planosComPersonalizarLogo.includes(accountType);
    if (isAdmin || allowed) {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. A personalização de logo está disponível apenas para os planos King Finance, King Finance Plus, King Premium Plus e King Corporate.' });
    }
};

router.get('/team', protectUser, enrichUserForBusiness, protectBusinessOwner, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT u.id, p.display_name, u.email, u.created_at 
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.parent_user_id = $1`,
            [req.user.userId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados da equipe.' });
    }
});

router.post('/generate-code', protectUser, enrichUserForBusiness, protectBusinessOwner, async (req, res) => {
    const ownerId = req.user.userId;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const limitResult = await client.query('SELECT max_team_invites FROM users WHERE id = $1', [ownerId]);
        if (limitResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const maxInvites = limitResult.rows[0].max_team_invites;

        const countResult = await client.query('SELECT COUNT(*) FROM registration_codes WHERE generated_by_user_id = $1', [ownerId]);
        const codeCount = parseInt(countResult.rows[0].count, 10);

        if (codeCount >= maxInvites) {
            return res.status(403).json({ message: `Limite de ${maxInvites} códigos de equipe atingido.` });
        }

        const newCode = nanoid(10).toUpperCase();
        
        await client.query(
            'INSERT INTO registration_codes (code, generated_by_user_id) VALUES ($1, $2)',
            [newCode, ownerId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Novo código de equipe gerado!', code: newCode });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Erro ao gerar código.' });
    } finally {
        client.release();
    }
});

router.put('/branding', protectUser, enrichUserForBusiness, protectBusinessOwnerOrLogo, async (req, res) => {
    const { logoUrl, logoSize, logoLink } = req.body;
    const ownerId = req.user.userId;

    if (!logoUrl) {
        return res.status(400).json({ message: 'URL do logo é obrigatória.' });
    }
    const size = parseInt(logoSize, 10) || 60;

    try {
        await db.query(
            'UPDATE users SET company_logo_url = $1, company_logo_size = $2, company_logo_link = $3 WHERE id = $4',
            [logoUrl, size, logoLink, ownerId]
        );
        res.status(200).json({ message: 'Personalização da marca salva com sucesso!' });
    } catch (error) {
        console.error("Erro ao salvar personalização da marca:", error);
        res.status(500).json({ message: 'Erro no servidor ao salvar as alterações.' });
    }
});

router.post('/codes/generate-manual', protectUser, enrichUserForBusiness, protectBusinessOwner, async (req, res) => {
    const { customCode } = req.body;
    const ownerId = req.user.userId;
    const client = await db.pool.connect();

    // Validação do código recebido
    if (!customCode || customCode.length > 12 || customCode.includes(' ')) {
        return res.status(400).json({ message: 'Código personalizado inválido. Deve ter no máximo 12 caracteres e não conter espaços.' });
    }

    try {
        await client.query('BEGIN');

        const limitResult = await client.query('SELECT max_team_invites FROM users WHERE id = $1', [ownerId]);
        const maxInvites = limitResult.rows[0].max_team_invites;

        const countResult = await client.query('SELECT COUNT(*) FROM registration_codes WHERE generated_by_user_id = $1', [ownerId]);
        const codeCount = parseInt(countResult.rows[0].count, 10);

        if (codeCount >= maxInvites) {
            return res.status(403).json({ message: `Limite de ${maxInvites} códigos de equipe atingido. Não é possível criar um novo.` });
        }

        // 4. Tenta inserir o novo código
        await client.query(
            'INSERT INTO registration_codes (code, generated_by_user_id) VALUES ($1, $2)',
            [customCode, ownerId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: `Código '${customCode}' criado com sucesso!`, code: customCode });

    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') { 
            return res.status(409).json({ message: 'Este código personalizado já existe. Tente outro.' });
        }
        console.error("Erro ao criar código manual de equipe:", error);
        res.status(500).json({ message: 'Erro no servidor ao criar código.' });
    } finally {
        client.release();
    }
});

router.get('/codes', protectUser, enrichUserForBusiness, protectBusinessOwner, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT code, is_claimed, claimed_at, 
            (SELECT email FROM users WHERE id = claimed_by_user_id) as claimed_by_email
            FROM registration_codes WHERE generated_by_user_id = $1`,
            [req.user.userId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar códigos.' });
    }
});


module.exports = router;