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

router.put('/users/:id/manage', protectAdmin, async (req, res) => {
    const { id } = req.params;
    const { email, accountType, isAdmin, subscriptionStatus, expiresAt, maxTeamInvites  } = req.body; 
    const adminUserId = req.user.userId;

    if (parseInt(id, 10) === adminUserId && isAdmin === false) {
        return res.status(403).json({ message: 'Você não pode remover seu próprio status de administrador.' });
    }
    const validAccountTypes = ['king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'team_member', 
                               'free', 'individual', 'individual_com_logo', 'business_owner']; // Manter compatibilidade
    if (!email || !validAccountTypes.includes(accountType) || typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: 'Dados inválidos.' });
    }
    const maxInvites = (accountType === 'king_corporate' || accountType === 'business_owner') ? parseInt(maxTeamInvites, 10) : 3;
    if (isNaN(maxInvites) || maxInvites < 0) {
        return res.status(400).json({ message: 'O valor para máximo de convites é inválido.'});
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const currentUser = await client.query('SELECT email FROM users WHERE id = $1', [id]);
        if (currentUser.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (currentUser.rows[0].email !== email) {
            const emailExists = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
            if (emailExists.rows.length > 0) {
                return res.status(409).json({ message: 'O novo e-mail fornecido já está em uso por outra conta.' });
            }
        }
        
        const expiresAtForDb = expiresAt ? expiresAt : null;
        const statusForDb = subscriptionStatus ? subscriptionStatus : null;

        const { rows } = await client.query(
            `UPDATE users 
             SET email = $1, account_type = $2, is_admin = $3, subscription_status = $4, subscription_expires_at = $5, max_team_invites = $6
             WHERE id = $7 
             RETURNING id, email, account_type, is_admin, subscription_status, subscription_expires_at, max_team_invites`,
            [email, accountType, isAdmin, statusForDb, expiresAtForDb, maxInvites, id]
        );

        await client.query('COMMIT');

        res.json({ message: 'Usuário atualizado com sucesso!', user: rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro ao gerenciar usuário:", error);
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

    const validAccountTypes = ['king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'team_member',
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
// ROTA ATUALIZADA para buscar códigos com mais detalhes
router.get('/codes', protectAdmin, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const query = `
            SELECT 
                c.code, 
                c.is_claimed, 
                c.created_at, 
                c.claimed_at, 
                u.email as claimed_by_email,
                gen.email as generated_by_email
            FROM registration_codes c
            LEFT JOIN users u ON c.claimed_by_user_id = u.id
            LEFT JOIN users gen ON c.generated_by_user_id = gen.id
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
    const { customCode } = req.body;

    if (!customCode || customCode.length > 12 || customCode.includes(' ')) {
        return res.status(400).json({ message: 'Código personalizado inválido, muito longo ou contém espaços.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('INSERT INTO registration_codes (code) VALUES ($1)', [customCode]);
        console.log(`🔑 Novo código personalizado gerado: ${customCode}`);
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
    const newCode = nanoid(8);
    const client = await db.pool.connect();
    try {
        await client.query('INSERT INTO registration_codes (code) VALUES ($1)', [newCode]);
        res.status(201).json({ message: 'Novo código gerado com sucesso!', code: newCode });
    } catch (error) {
        console.error("Erro ao gerar código:", error);
        res.status(500).json({ message: 'Erro ao gerar código.' });
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