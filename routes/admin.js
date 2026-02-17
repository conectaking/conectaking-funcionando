const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { protectAdmin } = require('../middleware/protectAdmin');

const router = express.Router();

/**
 * @route   GET /api/admin/stats
 * @desc    Busca estatísticas gerais da plataforma (CORRIGIDO)
 * @access  Private (Admin)
 */
router.get('/stats', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const usersCountQuery = client.query('SELECT COUNT(*) FROM users;');
        const codesCountQuery = client.query('SELECT COUNT(*) FROM registration_codes;');
        const claimedCodesCountQuery = client.query('SELECT COUNT(*) FROM registration_codes WHERE is_claimed = TRUE;');
        
        const viewsCountQuery = client.query("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'view';");
        const clicksCountQuery = client.query("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'click';");

        const [usersCount, codesCount, claimedCodesCount, viewsCount, clicksCount] = await Promise.all([
            usersCountQuery, codesCountQuery, claimedCodesCountQuery, viewsCountQuery, clicksCountQuery
        ]);

        res.json({
            totalUsers: parseInt(usersCount.rows[0].count, 10),
            totalCodes: parseInt(codesCount.rows[0].count, 10),
            claimedCodes: parseInt(claimedCodesCount.rows[0].count, 10),
            totalViews: parseInt(viewsCount.rows[0].count, 10),
            totalClicks: parseInt(clicksCount.rows[0].count, 10),
        });
    } catch (error) {
        console.error("Erro ao buscar estatísticas do admin:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar estatísticas.' });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/admin/advanced-stats
 * @desc    Busca estatísticas avançadas de atividades dos usuários
 * @access  Private (Admin)
 */
router.get('/advanced-stats', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Usuários ativos nos últimos 7 dias
        const activeUsers7dQuery = client.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM user_activities
            WHERE created_at >= NOW() - INTERVAL '7 days'
            AND created_at <= NOW()
        `);

        // Usuários ativos hoje (qualquer atividade hoje)
        const activeTodayQuery = client.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM user_activities
            WHERE DATE(created_at) = CURRENT_DATE
        `);

        // Usuários que fizeram login hoje
        const loginsTodayQuery = client.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM user_activities
            WHERE activity_type = 'login'
            AND DATE(created_at) = CURRENT_DATE
        `);

        // Usuários que alteraram algo hoje (profile_update, link_created, etc)
        const modifiedTodayQuery = client.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM user_activities
            WHERE activity_type IN ('profile_update', 'link_created', 'link_updated', 'link_deleted', 'settings_updated')
            AND DATE(created_at) = CURRENT_DATE
        `);

        // Usuários com assinatura vencida
        const expiredSubscriptionsQuery = client.query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE subscription_status IN ('expired', 'pre_sale_trial')
            AND (subscription_expires_at IS NULL OR subscription_expires_at < NOW())
        `);

        // Usuários que vão vencer em breve (próximos 7 dias)
        const expiringSoonQuery = client.query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE subscription_expires_at IS NOT NULL
            AND subscription_expires_at >= NOW()
            AND subscription_expires_at <= NOW() + INTERVAL '7 days'
            AND subscription_status = 'active'
        `);

        // Usuários com perfil ativo (que criaram pelo menos um link)
        const usersWithProfileQuery = client.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM profile_items
        `);

        // Total de links criados
        const totalLinksQuery = client.query(`
            SELECT COUNT(*) as count
            FROM profile_items
        `);

        // Lista de usuários com última atividade
        const usersLastActivityQuery = client.query(`
            SELECT 
                u.id,
                u.email,
                p.display_name,
                u.subscription_status,
                u.subscription_expires_at,
                MAX(ua.created_at) as last_activity_date,
                CASE 
                    WHEN MAX(ua.created_at) IS NULL THEN NULL
                    WHEN DATE(MAX(ua.created_at)) = CURRENT_DATE THEN 0
                    ELSE EXTRACT(DAY FROM (NOW() - MAX(ua.created_at)))::INTEGER
                END as days_since_last_activity,
                CASE 
                    WHEN MAX(ua.created_at) IS NULL THEN NULL
                    WHEN DATE(MAX(ua.created_at)) = CURRENT_DATE THEN true
                    ELSE false
                END as used_today
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN user_activities ua ON u.id = ua.user_id
            GROUP BY u.id, u.email, p.display_name, u.subscription_status, u.subscription_expires_at
            ORDER BY last_activity_date DESC NULLS LAST
        `);

        const [
            activeUsers7d,
            activeToday,
            loginsToday,
            modifiedToday,
            expiredSubscriptions,
            expiringSoon,
            usersWithProfile,
            totalLinks,
            usersLastActivity
        ] = await Promise.all([
            activeUsers7dQuery,
            activeTodayQuery,
            loginsTodayQuery,
            modifiedTodayQuery,
            expiredSubscriptionsQuery,
            expiringSoonQuery,
            usersWithProfileQuery,
            totalLinksQuery,
            usersLastActivityQuery
        ]);

        // Calcular usuários que não usaram hoje
        const notUsedToday = usersLastActivity.rows.filter(u => !u.used_today || u.last_activity_date === null).length;

        // Separar usuários ativos e vencidos
        const activeUsers = usersLastActivity.rows.filter(u => {
            const isExpired = u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date() && u.subscription_status !== 'free';
            return !isExpired;
        });
        
        const expiredUsers = usersLastActivity.rows.filter(u => {
            const isExpired = u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date() && u.subscription_status !== 'free';
            return isExpired;
        });

        res.json({
            activeUsers7d: parseInt(activeUsers7d.rows[0].count, 10) || 0,
            activeUsersToday: parseInt(activeToday.rows[0].count, 10) || 0,
            loginsToday: parseInt(loginsToday.rows[0].count, 10) || 0,
            modifiedToday: parseInt(modifiedToday.rows[0].count, 10) || 0,
            expiredSubscriptions: parseInt(expiredSubscriptions.rows[0].count, 10) || 0,
            expiringSoon: parseInt(expiringSoon.rows[0].count, 10) || 0,
            usersWithProfile: parseInt(usersWithProfile.rows[0].count, 10) || 0,
            totalLinks: parseInt(totalLinks.rows[0].count, 10) || 0,
            notUsedToday: notUsedToday || 0,
            activeUsersCount: activeUsers.length,
            expiredUsersCount: expiredUsers.length,
            usersActivity: usersLastActivity.rows.map(u => ({
                id: u.id,
                email: u.email,
                displayName: u.display_name || u.email,
                subscriptionStatus: u.subscription_status,
                subscriptionExpiresAt: u.subscription_expires_at,
                lastActivityDate: u.last_activity_date,
                daysSinceLastActivity: u.days_since_last_activity,
                usedToday: u.used_today || false,
                isExpired: u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date() && u.subscription_status !== 'free'
            })),
            activeUsersList: activeUsers.map(u => ({
                id: u.id,
                email: u.email,
                displayName: u.display_name || u.email,
                subscriptionStatus: u.subscription_status,
                subscriptionExpiresAt: u.subscription_expires_at,
                lastActivityDate: u.last_activity_date,
                daysSinceLastActivity: u.days_since_last_activity
            })),
            expiredUsersList: expiredUsers.map(u => {
                let daysExpired = null;
                if (u.subscription_expires_at) {
                    const expiresDate = new Date(u.subscription_expires_at);
                    const now = new Date();
                    daysExpired = Math.floor((now - expiresDate) / (1000 * 60 * 60 * 24));
                }
                return {
                    id: u.id,
                    email: u.email,
                    displayName: u.display_name || u.email,
                    subscriptionStatus: u.subscription_status,
                    subscriptionExpiresAt: u.subscription_expires_at,
                    lastActivityDate: u.last_activity_date,
                    daysSinceLastActivity: u.days_since_last_activity,
                    daysExpired: daysExpired
                };
            })
        });
    } catch (error) {
        console.error("Erro ao buscar estatísticas avançadas:", error);
        res.status(500).json({ 
            message: 'Erro no servidor ao buscar estatísticas avançadas.',
            error: error.message
        });
    } finally {
        client.release();
    }
});

router.get('/users', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const query = `
            SELECT 
                u.id, 
                p.display_name, 
                u.email, 
                u.profile_slug, 
                u.is_admin, 
                u.created_at,
                u.account_type,
                u.parent_user_id,
                parent.email as parent_email,
                u.subscription_status,
                u.subscription_expires_at,
                u.max_team_invites
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN users parent ON u.parent_user_id = parent.id
            ORDER BY u.created_at DESC
        `;
        const { rows } = await client.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ message: 'Erro ao buscar usuários.' });
    } finally {
        client.release();
    }
});

/**
 * Dashboard detalhado do usuário (apenas admin) — logins, acessos ao cartão, cliques, IPs, links
 */
router.get('/users/:id/dashboard', protectAdmin, async (req, res) => {
    const userId = req.params.id;
    const client = await db.pool.connect();
    try {
        const userRes = await client.query(
            `SELECT u.id, u.email, u.profile_slug, u.created_at,
             p.display_name
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id = $1`,
            [userId]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const user = userRes.rows[0];

        const loginCountRes = await client.query(
            `SELECT COUNT(*) as total, MAX(created_at) as last_at
             FROM user_activities
             WHERE user_id = $1 AND activity_type = 'login'`,
            [userId]
        );
        const viewCountRes = await client.query(
            `SELECT COUNT(*) as total, MAX(created_at) as last_at
             FROM analytics_events
             WHERE user_id = $1 AND event_type = 'view'`,
            [userId]
        );
        const clickCountRes = await client.query(
            `SELECT COUNT(*) as total, MAX(created_at) as last_at
             FROM analytics_events
             WHERE user_id = $1 AND event_type = 'click'`,
            [userId]
        );

        const byIpRes = await client.query(
            `SELECT ip_address, user_agent,
              COUNT(*) FILTER (WHERE event_type = 'view') as views,
              COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
              MAX(created_at) as last_at
             FROM analytics_events
             WHERE user_id = $1 AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)
             GROUP BY ip_address, user_agent
             ORDER BY last_at DESC NULLS LAST
             LIMIT 100`,
            [userId]
        );

        const byLinkRes = await client.query(
            `SELECT ae.item_id, pi.title, pi.item_type, pi.destination_url,
              COUNT(*) as clicks, MAX(ae.created_at) as last_at
             FROM analytics_events ae
             LEFT JOIN profile_items pi ON ae.item_id = pi.id
             WHERE ae.user_id = $1 AND ae.event_type = 'click'
             GROUP BY ae.item_id, pi.title, pi.item_type, pi.destination_url
             ORDER BY clicks DESC, last_at DESC NULLS LAST
             LIMIT 50`,
            [userId]
        );

        const lastLoginRes = await client.query(
            `SELECT created_at, ip_address, user_agent
             FROM user_activities
             WHERE user_id = $1 AND activity_type = 'login'
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        const codeRes = await client.query(
            `SELECT code FROM registration_codes
             WHERE claimed_by_user_id = $1 AND is_claimed = TRUE
             ORDER BY claimed_at DESC LIMIT 1`,
            [userId]
        );
        const tagCode = codeRes.rows[0]?.code || null;

        res.json({
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name || user.email,
                profile_slug: user.profile_slug,
                tag_code: tagCode,
                created_at: user.created_at
            },
            logins: {
                total: parseInt(loginCountRes.rows[0]?.total || 0, 10),
                last_at: loginCountRes.rows[0]?.last_at || null,
                last_detail: lastLoginRes.rows[0] || null
            },
            card_views: {
                total: parseInt(viewCountRes.rows[0]?.total || 0, 10),
                last_at: viewCountRes.rows[0]?.last_at || null
            },
            link_clicks: {
                total: parseInt(clickCountRes.rows[0]?.total || 0, 10),
                last_at: clickCountRes.rows[0]?.last_at || null
            },
            by_ip: (byIpRes.rows || []).map(r => ({
                ip_address: r.ip_address,
                user_agent: r.user_agent,
                views: parseInt(r.views || 0, 10),
                clicks: parseInt(r.clicks || 0, 10),
                last_at: r.last_at
            })),
            by_link: (byLinkRes.rows || []).map(r => ({
                item_id: r.item_id,
                title: r.title,
                item_type: r.item_type,
                destination_url: r.destination_url,
                clicks: parseInt(r.clicks || 0, 10),
                last_at: r.last_at
            }))
        });
    } catch (err) {
        console.error('Erro ao buscar dashboard do usuário:', err);
        res.status(500).json({ message: 'Erro ao carregar dashboard do usuário.' });
    } finally {
        client.release();
    }
});

/** Formato básico de e-mail; pontos na parte local são preservados. */
function isValidEmail(s) {
    if (typeof s !== 'string') return false;
    const t = s.trim();
    return t.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

router.put('/users/:id/manage', protectAdmin, async (req, res) => {
    const { id } = req.params;
    const { email, accountType, isAdmin, subscriptionStatus, expiresAt, maxTeamInvites } = req.body;
    const adminUserId = req.user.userId;

    if (parseInt(id, 10) === adminUserId && isAdmin === false) {
        return res.status(403).json({ message: 'Você não pode remover seu próprio status de administrador.' });
    }
    const validAccountTypes = ['adm_principal', 'abm', 'basic', 'premium', 'king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'team_member',
        'free', 'individual', 'individual_com_logo', 'business_owner'];
    if (!validAccountTypes.includes(accountType) || typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: 'Dados inválidos.' });
    }
    const maxInvites = (accountType === 'king_corporate' || accountType === 'business_owner') ? parseInt(maxTeamInvites, 10) : (accountType === 'adm_principal' || accountType === 'abm' ? 999 : 3);
    if (isNaN(maxInvites) || maxInvites < 0) {
        return res.status(400).json({ message: 'O valor para máximo de convites é inválido.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const currentUser = await client.query('SELECT email FROM users WHERE id = $1', [id]);
        if (currentUser.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const currentEmail = currentUser.rows[0].email;
        let emailToUse = currentEmail;

        if (email != null && String(email).trim() !== '') {
            const e = String(email).trim();
            if (!isValidEmail(e)) {
                return res.status(400).json({ message: 'E-mail inválido.' });
            }
            if (e !== currentEmail) {
                const emailExists = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [e, id]);
                if (emailExists.rows.length > 0) {
                    return res.status(409).json({ message: 'O novo e-mail já está em uso por outra conta.' });
                }
                emailToUse = e;
            }
        }

        const expiresAtForDb = expiresAt || null;
        const statusForDb = subscriptionStatus || null;

        const { rows } = await client.query(
            `UPDATE users 
             SET email = $1, account_type = $2, is_admin = $3, subscription_status = $4, subscription_expires_at = $5, max_team_invites = $6
             WHERE id = $7 
             RETURNING id, email, account_type, is_admin, subscription_status, subscription_expires_at, max_team_invites`,
            [emailToUse, accountType, isAdmin, statusForDb, expiresAtForDb, maxInvites, id]
        );

        await client.query('COMMIT');

        res.json({ message: 'Usuário atualizado com sucesso!', user: rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao gerenciar usuário:', error);
        res.status(500).json({ message: 'Erro ao atualizar dados do usuário.' });
    } finally {
        client.release();
    }
});

router.put('/users/:id/update-role', protectAdmin, async (req, res) => {
    const { id } = req.params;
    const { accountType, isAdmin } = req.body;
    const adminUserId = req.user.userId;

    if (id === adminUserId && isAdmin === false) {
        return res.status(403).json({ message: 'Você não pode remover seu próprio status de administrador.' });
    }

    const validAccountTypes = ['adm_principal', 'abm', 'basic', 'premium', 'king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'team_member',
                               'free', 'individual', 'individual_com_logo', 'business_owner']; // Manter compatibilidade
    if (!validAccountTypes.includes(accountType) || typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: 'Dados de atualização inválidos.' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE users SET account_type = $1, is_admin = $2 WHERE id = $3 RETURNING id, account_type, is_admin',
            [accountType, isAdmin, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json({ message: 'Usuário atualizado com sucesso!', user: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        res.status(500).json({ message: 'Erro ao atualizar usuário.' });
    }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Atualiza apenas o tipo de conta de um usuário
 * @access  Private (Admin)
 */
router.put('/users/:id', protectAdmin, async (req, res) => {
    const { id } = req.params;
    const { account_type } = req.body;
    
    const validAccountTypes = ['adm_principal', 'abm', 'basic', 'premium', 'king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'team_member',
                               'free', 'individual', 'individual_com_logo', 'business_owner'];
    
    if (!account_type || !validAccountTypes.includes(account_type)) {
        return res.status(400).json({ message: 'Tipo de conta inválido.' });
    }
    
    const client = await db.pool.connect();
    try {
        const { rows } = await client.query(
            'UPDATE users SET account_type = $1 WHERE id = $2 RETURNING id, account_type',
            [account_type, id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        res.json({ message: 'Tipo de conta atualizado com sucesso!', user: rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar tipo de conta:", error);
        res.status(500).json({ message: 'Erro ao atualizar tipo de conta.' });
    } finally {
        client.release();
    }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Deleta um usuário específico
 * @access  Private (Admin)
 */
router.delete('/users/:id', protectAdmin, async (req, res) => {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.userId) {
        return res.status(403).json({ message: 'Você não pode deletar sua própria conta de administrador.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM analytics_events WHERE user_id = $1', [id]);

        await client.query('DELETE FROM profile_items WHERE user_id = $1', [id]);
        
        await client.query('DELETE FROM user_profiles WHERE user_id = $1', [id]);
        
        await client.query('UPDATE registration_codes SET generated_by_user_id = NULL WHERE generated_by_user_id = $1', [id]);
        
        const result = await client.query('DELETE FROM users WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        await client.query('COMMIT');

        res.json({ message: 'Usuário e todos os seus dados foram deletados com sucesso.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro ao deletar usuário em cascata:", error);
        res.status(500).json({ message: 'Erro no servidor ao tentar deletar o usuário.' });
    } finally {
        client.release();
    }
});


/**
 * @route   GET /api/admin/codes
 * @desc    Busca todos os códigos de registro
 * @access  Private (Admin)
 */
// ROTA ATUALIZADA para buscar códigos com mais detalhes (incluindo expires_at)
router.get('/codes', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { filter } = req.query; // 'expired', 'active', ou null para todos
        
        let whereClause = '';
        if (filter === 'expired') {
            whereClause = 'WHERE c.expires_at IS NOT NULL AND c.expires_at < NOW()';
        } else if (filter === 'active') {
            whereClause = 'WHERE c.expires_at IS NULL OR c.expires_at >= NOW()';
        }
        
        const query = `
            SELECT 
                c.code, 
                c.is_claimed, 
                c.created_at, 
                c.claimed_at,
                c.expires_at,
                u.email as claimed_by_email,
                gen.email as generated_by_email,
                CASE 
                    WHEN c.expires_at IS NULL THEN 'no_expiration'
                    WHEN c.expires_at < NOW() THEN 'expired'
                    ELSE 'active'
                END as expiration_status
            FROM registration_codes c
            LEFT JOIN users u ON c.claimed_by_user_id = u.id
            LEFT JOIN users gen ON c.generated_by_user_id = gen.id
            ${whereClause}
            ORDER BY c.created_at DESC
        `;
        const { rows } = await client.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar códigos:", error);
        res.status(500).json({ message: 'Erro ao buscar códigos.' });
    } finally {
        client.release();
    }
});

router.post('/codes/generate-manual', protectAdmin, async (req, res) => {
    const { customCode, expiresAt } = req.body;

    if (!customCode || customCode.length > 12 || customCode.includes(' ')) {
        return res.status(400).json({ message: 'Código personalizado inválido, muito longo ou contém espaços.' });
    }

    const client = await db.pool.connect();
    try {
        let expiresAtValue = null;
        if (expiresAt) {
            expiresAtValue = new Date(expiresAt);
            if (isNaN(expiresAtValue.getTime())) {
                return res.status(400).json({ message: 'Data de expiração inválida.' });
            }
        }
        
        await client.query(
            'INSERT INTO registration_codes (code, expires_at) VALUES ($1, $2)', 
            [customCode, expiresAtValue]
        );
        console.log(`🔑 Novo código personalizado gerado: ${customCode}${expiresAtValue ? ` (expira em ${expiresAtValue.toISOString()})` : ''}`);
        res.status(201).json({ message: `Código '${customCode}' criado com sucesso!`, codes: [customCode] });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') { // Código de erro para violação de chave única
            return res.status(409).json({ message: 'Este código personalizado já existe. Tente outro.' });
        }
        console.error("Erro ao criar código personalizado:", error);
        res.status(500).json({ message: 'Erro ao criar código personalizado.' });
    } finally {
        client.release();
    }
});

/**
 * @route   POST /api/admin/generate-code
 * @desc    Gera um novo código de registro
 * @access  Private (Admin)
 */
router.post('/generate-code', protectAdmin, async (req, res) => {
    const { expiresAt } = req.body;
    const newCode = nanoid(8);
    const client = await db.pool.connect();
    try {
        let expiresAtValue = null;
        if (expiresAt) {
            expiresAtValue = new Date(expiresAt);
            if (isNaN(expiresAtValue.getTime())) {
                return res.status(400).json({ message: 'Data de expiração inválida.' });
            }
        }
        
        await client.query(
            'INSERT INTO registration_codes (code, expires_at) VALUES ($1, $2)', 
            [newCode, expiresAtValue]
        );
        res.status(201).json({ message: 'Novo código gerado com sucesso!', code: newCode });
    } catch (error) {
        console.error("Erro ao gerar código:", error);
        res.status(500).json({ message: 'Erro ao gerar código.' });
    } finally {
        client.release();
    }
});

/**
 * @route   POST /api/admin/codes/generate-batch
 * @desc    Gera múltiplos códigos em lote
 * @access  Private (Admin)
 */
router.post('/codes/generate-batch', protectAdmin, async (req, res) => {
    const { prefix, count, expiresAt } = req.body;
    
    if (!prefix || !count || count < 1 || count > 100) {
        return res.status(400).json({ message: 'Prefixo e quantidade (1-100) são obrigatórios.' });
    }

    const client = await db.pool.connect();
    try {
        let expiresAtValue = null;
        if (expiresAt) {
            expiresAtValue = new Date(expiresAt);
            if (isNaN(expiresAtValue.getTime())) {
                return res.status(400).json({ message: 'Data de expiração inválida.' });
            }
        }
        
        const codes = [];
        for (let i = 0; i < count; i++) {
            const randomSuffix = nanoid(8);
            const code = `${prefix}${randomSuffix}`;
            codes.push(code);
        }
        
        // Inserir todos os códigos
        for (const code of codes) {
            await client.query(
                'INSERT INTO registration_codes (code, expires_at) VALUES ($1, $2)',
                [code, expiresAtValue]
            );
        }
        
        console.log(`🔑 ${count} códigos gerados em lote com prefixo ${prefix}`);
        res.status(201).json({ 
            message: `${count} códigos gerados com sucesso!`, 
            codes: codes 
        });
    } catch (error) {
        console.error("Erro ao gerar códigos em lote:", error);
        res.status(500).json({ message: 'Erro ao gerar códigos em lote.' });
    } finally {
        client.release();
    }
});

/**
 * @route   PUT /api/admin/codes/:code
 * @desc    Atualiza um código (expires_at)
 * @access  Private (Admin)
 */
router.put('/codes/:code', protectAdmin, async (req, res) => {
    const { code } = req.params;
    const { expiresAt } = req.body;
    
    const client = await db.pool.connect();
    try {
        let expiresAtValue = null;
        if (expiresAt !== undefined) {
            if (expiresAt === null || expiresAt === '') {
                expiresAtValue = null;
            } else {
                expiresAtValue = new Date(expiresAt);
                if (isNaN(expiresAtValue.getTime())) {
                    return res.status(400).json({ message: 'Data de expiração inválida.' });
                }
            }
        }
        
        const result = await client.query(
            'UPDATE registration_codes SET expires_at = $1 WHERE code = $2 RETURNING *',
            [expiresAtValue, code]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Código não encontrado.' });
        }
        
        res.json({ message: 'Código atualizado com sucesso!', code: result.rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar código:", error);
        res.status(500).json({ message: 'Erro ao atualizar código.' });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/admin/codes/auto-delete-config
 * @desc    Busca configuração de exclusão automática
 * @access  Private (Admin)
 */
router.get('/codes/auto-delete-config', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM code_auto_delete_config ORDER BY days_after_expiration'
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar configuração:", error);
        res.status(500).json({ message: 'Erro ao buscar configuração.' });
    } finally {
        client.release();
    }
});

/**
 * @route   POST /api/admin/codes/auto-delete-config
 * @desc    Cria ou atualiza configuração de exclusão automática
 * @access  Private (Admin)
 */
router.post('/codes/auto-delete-config', protectAdmin, async (req, res) => {
    const { days_after_expiration, is_active } = req.body;
    
    if (!days_after_expiration || days_after_expiration < 1) {
        return res.status(400).json({ message: 'days_after_expiration deve ser maior que 0.' });
    }
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO code_auto_delete_config (days_after_expiration, is_active, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (days_after_expiration) 
             DO UPDATE SET is_active = $2, updated_at = NOW()
             RETURNING *`,
            [days_after_expiration, is_active !== undefined ? is_active : true]
        );
        
        res.json({ message: 'Configuração salva com sucesso!', config: result.rows[0] });
    } catch (error) {
        console.error("Erro ao salvar configuração:", error);
        res.status(500).json({ message: 'Erro ao salvar configuração.' });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/admin/users/auto-delete-config
 * @desc    Busca configuração de exclusão automática de usuários
 * @access  Private (Admin)
 */
router.get('/users/auto-delete-config', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM user_auto_delete_config ORDER BY days_after_expiration'
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar configuração:", error);
        res.status(500).json({ message: 'Erro ao buscar configuração.' });
    } finally {
        client.release();
    }
});

/**
 * @route   POST /api/admin/users/auto-delete-config
 * @desc    Cria ou atualiza configuração de exclusão automática de usuários
 * @access  Private (Admin)
 */
router.post('/users/auto-delete-config', protectAdmin, async (req, res) => {
    const { days_after_expiration, is_active } = req.body;
    
    if (!days_after_expiration || days_after_expiration < 1) {
        return res.status(400).json({ message: 'days_after_expiration deve ser maior que 0.' });
    }
    
    const client = await db.pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO user_auto_delete_config (days_after_expiration, is_active, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (days_after_expiration) 
             DO UPDATE SET is_active = $2, updated_at = NOW()
             RETURNING *`,
            [days_after_expiration, is_active !== undefined ? is_active : true]
        );
        
        res.json({ message: 'Configuração salva com sucesso!', config: result.rows[0] });
    } catch (error) {
        console.error("Erro ao salvar configuração:", error);
        res.status(500).json({ message: 'Erro ao salvar configuração.' });
    } finally {
        client.release();
    }
});

/**
 * @route   POST /api/admin/users/execute-auto-delete
 * @desc    Executa exclusão automática de usuários vencidos conforme configuração
 * @access  Private (Admin)
 */
router.post('/users/execute-auto-delete', protectAdmin, async (req, res) => {
    const { days_after_expiration } = req.body;
    const client = await db.pool.connect();
    try {
        // Validar dias fornecidos
        if (!days_after_expiration || days_after_expiration < 1) {
            return res.status(400).json({ message: 'Número de dias inválido. Informe um valor maior que 0.' });
        }
        
        const days = parseInt(days_after_expiration);
        
        // Calcular data de corte: usuários que expiraram há mais de X dias
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        // Primeiro, contar quantos usuários serão excluídos (para feedback)
        const countResult = await client.query(
            `SELECT COUNT(*) as count
             FROM users 
             WHERE subscription_expires_at IS NOT NULL 
             AND subscription_expires_at < $1 
             AND is_admin = false`,
            [cutoffDate]
        );
        
        const countToDelete = parseInt(countResult.rows[0].count);
        
        if (countToDelete === 0) {
            return res.json({ 
                message: `Nenhum usuário encontrado vencido há mais de ${days} dias para excluir.`,
                deleted: 0,
                count: 0
            });
        }
        
        // Executar exclusão
        // Exclui usuários vencidos há mais de X dias, exceto admins
        // Inclui todos os tipos de conta que tenham data de expiração
        const result = await client.query(
            `DELETE FROM users 
             WHERE subscription_expires_at IS NOT NULL 
             AND subscription_expires_at < $1 
             AND is_admin = false
             RETURNING id, email, account_type, subscription_expires_at`,
            [cutoffDate]
        );
        
        const totalDeleted = result.rowCount;
        console.log(`🗑️ Excluídos ${totalDeleted} usuários vencidos há mais de ${days} dias`);
        
        res.json({ 
            message: `Exclusão executada com sucesso! ${totalDeleted} usuário(s) vencido(s) há mais de ${days} dias foram excluído(s).`,
            deleted: totalDeleted,
            count: countToDelete
        });
    } catch (error) {
        console.error("Erro ao executar exclusão automática:", error);
        res.status(500).json({ message: 'Erro ao executar exclusão automática.' });
    } finally {
        client.release();
    }
});

/**
 * @route   POST /api/admin/codes/execute-auto-delete
 * @desc    Executa exclusão automática de códigos vencidos conforme configuração
 * @access  Private (Admin)
 */
router.post('/codes/execute-auto-delete', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Buscar configurações ativas
        const configs = await client.query(
            'SELECT days_after_expiration FROM code_auto_delete_config WHERE is_active = true'
        );
        
        if (configs.rows.length === 0) {
            return res.json({ message: 'Nenhuma configuração ativa encontrada.', deleted: 0 });
        }
        
        let totalDeleted = 0;
        
        for (const config of configs.rows) {
            const days = config.days_after_expiration;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const result = await client.query(
                `DELETE FROM registration_codes 
                 WHERE expires_at IS NOT NULL 
                 AND expires_at < $1 
                 AND is_claimed = false
                 RETURNING code`,
                [cutoffDate]
            );
            
            totalDeleted += result.rowCount;
            console.log(`🗑️ Excluídos ${result.rowCount} códigos vencidos há mais de ${days} dias`);
        }
        
        res.json({ 
            message: `Exclusão automática executada. ${totalDeleted} código(s) excluído(s).`,
            deleted: totalDeleted 
        });
    } catch (error) {
        console.error("Erro ao executar exclusão automática:", error);
        res.status(500).json({ message: 'Erro ao executar exclusão automática.' });
    } finally {
        client.release();
    }
});


/**
 * @route   DELETE /api/admin/codes/:code
 * @desc    Deleta um código de registro (AGORA FUNCIONAL)
 * @access  Private (Admin)
 */
router.delete('/codes/:code', protectAdmin, async (req, res) => {
    const { code } = req.params;
    const client = await db.pool.connect();
    try {
        const result = await client.query('DELETE FROM registration_codes WHERE code = $1', [code]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Código não encontrado.' });
        }
        res.json({ message: 'Código de registro deletado com sucesso.' });
    } catch (error) {
        console.error("Erro ao deletar código:", error);
        res.status(500).json({ message: 'Erro ao deletar código.' });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/admin/analytics/users
 * @desc    Busca analytics detalhados de todos os usuários
 * @access  Private (Admin)
 */
router.get('/analytics/users', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Usar subconsultas para evitar problemas com múltiplos LEFT JOINs
        const query = `
            SELECT 
                u.id,
                u.email,
                p.display_name,
                u.profile_slug,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM analytics_events 
                    WHERE user_id = u.id AND event_type = 'view'
                ), 0) AS total_views,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM analytics_events 
                    WHERE user_id = u.id AND event_type = 'click'
                ), 0) AS total_clicks,
                (
                    SELECT MAX(created_at)
                    FROM analytics_events
                    WHERE user_id = u.id AND event_type = 'view'
                ) AS last_view_date
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            ORDER BY total_views DESC
        `;
        const { rows } = await client.query(query);
        console.log(`📊 Analytics de usuários: ${rows.length} usuários encontrados`);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar analytics de usuários:", error);
        res.status(500).json({ message: 'Erro ao buscar analytics de usuários.' });
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/admin/analytics/user/:userId/details
 * @desc    Busca analytics detalhados de um usuário específico (cliques por link)
 * @access  Private (Admin)
 */
router.get('/analytics/user/:userId/details', protectAdmin, async (req, res) => {
    const { userId } = req.params;
    const period = parseInt(req.query.period || '30', 10); // Padrão: últimos 30 dias
    const client = await db.pool.connect();
    try {
        // Validar período
        if (isNaN(period) || period < 1 || period > 365) {
            return res.status(400).json({ message: 'Período inválido. Deve ser entre 1 e 365 dias.' });
        }
        
        console.log(`📊 Buscando analytics detalhados para usuário ${userId}, período: ${period} dias`);
        // Buscar cliques por item/link com mais detalhes
        const clicksQuery = `
            SELECT 
                pi.id,
                pi.title,
                pi.destination_url AS url,
                pi.icon_class,
                COALESCE(COUNT(e.id), 0)::INTEGER AS click_count,
                MAX(e.created_at) AS last_click_date,
                MIN(e.created_at) AS first_click_date
            FROM profile_items pi
            LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
            WHERE pi.user_id = $1
            GROUP BY pi.id, pi.title, pi.destination_url, pi.icon_class
            ORDER BY click_count DESC, pi.title ASC
        `;
        
        const { rows: clicksRows } = await client.query(clicksQuery, [userId]);
        console.log(`📊 Links encontrados para usuário ${userId}:`, clicksRows.length);
        
        // Buscar estatísticas gerais do usuário
        // Usar subquery para garantir que sempre retornamos uma linha mesmo sem dados
        const statsQuery = `
            SELECT 
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view'), 0)::INTEGER AS total_views,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click'), 0)::INTEGER AS total_clicks,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'vcard_download'), 0)::INTEGER AS total_vcard_downloads,
                (SELECT MAX(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'view') AS last_view_date,
                (SELECT MAX(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'click') AS last_click_date,
                (SELECT MIN(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'view') AS first_view_date
        `;
        
        const { rows: statsRows } = await client.query(statsQuery, [userId]);
        console.log(`📊 Estatísticas gerais encontradas:`, statsRows[0] || 'nenhuma linha');
        
        // Estatísticas por período (últimos N dias) - usar INTERVAL com multiplicação para segurança
        const periodStatsQuery = `
            SELECT 
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS views_period,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS clicks_period
        `;
        
        const { rows: periodStatsRows } = await client.query(periodStatsQuery, [userId, period]);
        console.log(`📊 Estatísticas do período encontradas:`, periodStatsRows[0] || 'nenhuma linha');
        
        // Gráfico de performance (visualizações e cliques por dia)
        const performanceQuery = `
            SELECT 
                DATE(created_at) AS date,
                COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0)::INTEGER AS views,
                COALESCE(COUNT(*) FILTER (WHERE event_type = 'click'), 0)::INTEGER AS clicks
            FROM analytics_events
            WHERE user_id = $1 
            AND created_at >= NOW() - (INTERVAL '1 day' * $2)
            AND created_at <= NOW()
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;
        
        const { rows: performanceRows } = await client.query(performanceQuery, [userId, period]);
        console.log(`📊 Dados de performance encontrados:`, performanceRows ? performanceRows.length : 0, 'dias');
        
        // Histórico recente de cliques (últimos 20)
        const recentClicksQuery = `
            SELECT 
                e.created_at,
                pi.title,
                pi.destination_url AS url,
                pi.icon_class,
                e.ip_address,
                e.user_agent
            FROM analytics_events e
            JOIN profile_items pi ON e.item_id = pi.id
            WHERE e.user_id = $1 
            AND e.event_type = 'click'
            ORDER BY e.created_at DESC
            LIMIT 20
        `;
        
        const { rows: recentClicksRows } = await client.query(recentClicksQuery, [userId]);
        
        // Estatísticas por link no período
        const linksPeriodQuery = `
            SELECT 
                pi.id,
                pi.title,
                COALESCE(COUNT(e.id), 0)::INTEGER AS click_count_period
            FROM profile_items pi
            LEFT JOIN analytics_events e ON pi.id = e.item_id 
                AND e.event_type = 'click'
                AND e.created_at >= NOW() - (INTERVAL '1 day' * $2)
                AND e.created_at <= NOW()
            WHERE pi.user_id = $1
            GROUP BY pi.id, pi.title
            ORDER BY click_count_period DESC
        `;
        
        const { rows: linksPeriodRows } = await client.query(linksPeriodQuery, [userId, period]);
        console.log(`📊 Estatísticas por link no período ${period} dias:`, linksPeriodRows.length);
        
        // Combinar dados de links com estatísticas do período
        const linksWithPeriod = clicksRows.map(link => {
            const periodData = linksPeriodRows.find(l => l.id === link.id);
            return {
                ...link,
                click_count: parseInt(link.click_count) || 0,
                click_count_period: parseInt(periodData?.click_count_period || 0, 10)
            };
        });
        
        // Garantir que sempre retornamos valores numéricos, não NULL
        // As subqueries sempre retornam uma linha, então podemos usar [0] com segurança
        const stats = statsRows && statsRows.length > 0 ? statsRows[0] : {};
        const periodStats = periodStatsRows && periodStatsRows.length > 0 ? periodStatsRows[0] : {};
        
        const responseData = {
            links: linksWithPeriod || [],
            stats: {
                total_views: parseInt(stats.total_views) || 0,
                total_clicks: parseInt(stats.total_clicks) || 0,
                total_vcard_downloads: parseInt(stats.total_vcard_downloads) || 0,
                last_view_date: stats.last_view_date || null,
                last_click_date: stats.last_click_date || null,
                first_view_date: stats.first_view_date || null
            },
            period_stats: {
                views_period: parseInt(periodStats.views_period) || 0,
                clicks_period: parseInt(periodStats.clicks_period) || 0
            },
            performance: performanceRows || [],
            recent_clicks: recentClicksRows || []
        };
        
        console.log(`✅ Retornando analytics para usuário ${userId}:`, {
            linksCount: responseData.links.length,
            totalViews: responseData.stats.total_views,
            totalClicks: responseData.stats.total_clicks,
            performanceDays: responseData.performance.length,
            recentClicks: responseData.recent_clicks.length
        });
        
        res.json(responseData);
    } catch (error) {
        console.error("❌ Erro ao buscar detalhes de analytics do usuário:", error);
        console.error("📋 Stack trace:", error.stack);
        console.error("📋 Mensagem do erro:", error.message);
        console.error("📋 Código do erro:", error.code);
        console.error("📋 Detalhes:", error.detail);
        
        // Retornar mensagem de erro mais detalhada em desenvolvimento
        const errorResponse = {
            message: 'Erro ao buscar detalhes de analytics.',
            error: error.message,
            code: error.code
        };
        
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
            errorResponse.stack = error.stack;
            errorResponse.detail = error.detail;
        }
        
        res.status(500).json(errorResponse);
    } finally {
        client.release();
    }
});


module.exports = router;