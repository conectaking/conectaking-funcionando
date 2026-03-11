/**
 * Service: regras de negócio de usuários admin (listagem, dashboard, gestão, auto-delete).
 */
const db = require('../../../db');
const repository = require('./users.repository');

const VALID_ACCOUNT_TYPES = [
    'adm_principal', 'abm', 'basic', 'premium', 'king_base', 'king_finance', 'king_finance_plus',
    'king_premium_plus', 'king_corporate', 'team_member', 'free', 'individual', 'individual_com_logo', 'business_owner',
];

function isValidEmail(s) {
    if (typeof s !== 'string') return false;
    const t = s.trim();
    return t.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function computeMaxInvites(accountType, maxTeamInvites) {
    if (accountType === 'king_corporate' || accountType === 'business_owner') {
        const n = parseInt(maxTeamInvites, 10);
        return (isNaN(n) || n < 0) ? null : n;
    }
    if (accountType === 'adm_principal' || accountType === 'abm') return 999;
    return 3;
}

async function listUsers() {
    return repository.listUsers();
}

async function getUserDashboard(userId) {
    const user = await repository.getUserById(userId);
    if (!user) return null;

    const [
        loginCountRes,
        viewCountRes,
        clickCountRes,
        byIpRes,
        byLinkRes,
        lastLoginRes,
        tagCode,
    ] = await Promise.all([
        repository.getLoginStats(userId),
        repository.getViewStats(userId),
        repository.getClickStats(userId),
        repository.getByIp(userId),
        repository.getByLink(userId),
        repository.getLastLogin(userId),
        repository.getTagCodeByUser(userId),
    ]);

    return {
        user: {
            id: user.id,
            email: user.email,
            display_name: user.display_name || user.email,
            profile_slug: user.profile_slug,
            tag_code: tagCode,
            created_at: user.created_at,
        },
        logins: {
            total: parseInt(loginCountRes?.total || 0, 10),
            last_at: loginCountRes?.last_at || null,
            last_detail: lastLoginRes || null,
        },
        card_views: {
            total: parseInt(viewCountRes?.total || 0, 10),
            last_at: viewCountRes?.last_at || null,
        },
        link_clicks: {
            total: parseInt(clickCountRes?.total || 0, 10),
            last_at: clickCountRes?.last_at || null,
        },
        by_ip: (byIpRes || []).map((r) => ({
            ip_address: r.ip_address,
            user_agent: r.user_agent,
            views: parseInt(r.views || 0, 10),
            clicks: parseInt(r.clicks || 0, 10),
            last_at: r.last_at,
        })),
        by_link: (byLinkRes || []).map((r) => ({
            item_id: r.item_id,
            title: r.title,
            item_type: r.item_type,
            destination_url: r.destination_url,
            clicks: parseInt(r.clicks || 0, 10),
            last_at: r.last_at,
        })),
    };
}

async function updateUserManage(id, adminUserId, body) {
    const { email, accountType, isAdmin, subscriptionStatus, expiresAt, maxTeamInvites } = body;

    const maxInvites = computeMaxInvites(accountType, maxTeamInvites);
    if (maxInvites === null) return { error: 'O valor para máximo de convites é inválido.', status: 400 };
    if (!VALID_ACCOUNT_TYPES.includes(accountType) || typeof isAdmin !== 'boolean') {
        return { error: 'Dados inválidos.', status: 400 };
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const currentEmail = await repository.getCurrentUserEmail(client, id);
        if (currentEmail === null) {
            return { error: 'Usuário não encontrado.', status: 404 };
        }

        let emailToUse = currentEmail;
        if (email != null && String(email).trim() !== '') {
            const e = String(email).trim();
            if (!isValidEmail(e)) return { error: 'E-mail inválido.', status: 400 };
            if (e !== currentEmail) {
                const exists = await repository.findUserByEmail(client, e, id);
                if (exists) return { error: 'O novo e-mail já está em uso por outra conta.', status: 409 };
                emailToUse = e;
            }
        }

        const user = await repository.updateUserManage(client, id, {
            email: emailToUse,
            accountType,
            isAdmin,
            subscriptionStatus: subscriptionStatus || null,
            subscriptionExpiresAt: expiresAt || null,
            maxTeamInvites: maxInvites,
        });
        await client.query('COMMIT');
        return { user, message: 'Usuário atualizado com sucesso!' };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function updateUserRole(id, adminUserId, body) {
    const { accountType, isAdmin } = body;
    if (!VALID_ACCOUNT_TYPES.includes(accountType) || typeof isAdmin !== 'boolean') {
        return { error: 'Dados de atualização inválidos.', status: 400 };
    }
    const user = await repository.updateUserRole(id, accountType, isAdmin);
    if (!user) return { error: 'Usuário não encontrado.', status: 404 };
    return { user, message: 'Usuário atualizado com sucesso!' };
}

async function updateUserAccountType(id, body) {
    const { account_type } = body;
    if (!account_type || !VALID_ACCOUNT_TYPES.includes(account_type)) {
        return { error: 'Tipo de conta inválido.', status: 400 };
    }
    const user = await repository.updateUserAccountType(id, account_type);
    if (!user) return { error: 'Usuário não encontrado.', status: 404 };
    return { user, message: 'Tipo de conta atualizado com sucesso!' };
}

async function deleteUser(id, adminUserId) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const deleted = await repository.deleteUserCascade(client, id);
        if (!deleted) {
            await client.query('ROLLBACK');
            return { error: 'Usuário não encontrado.', status: 404 };
        }
        await client.query('COMMIT');
        return { message: 'Usuário e todos os seus dados foram deletados com sucesso.' };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function getAutoDeleteConfig() {
    return repository.getAutoDeleteConfig();
}

async function saveAutoDeleteConfig(body) {
    const { days_after_expiration, is_active } = body;
    const isActive = is_active !== undefined ? is_active : true;
    const config = await repository.saveAutoDeleteConfig(days_after_expiration, isActive);
    return { config, message: 'Configuração salva com sucesso!' };
}

async function executeAutoDelete(body) {
    const { days_after_expiration } = body;
    const days = parseInt(days_after_expiration, 10);
    if (!days_after_expiration || days < 1) {
        return { error: 'Número de dias inválido. Informe um valor maior que 0.', status: 400 };
    }
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const countToDelete = await repository.countUsersToAutoDelete(cutoffDate);
    if (countToDelete === 0) {
        return {
            message: `Nenhum usuário encontrado vencido há mais de ${days} dias para excluir.`,
            deleted: 0,
            count: 0,
        };
    }
    const totalDeleted = await repository.executeAutoDeleteUsers(cutoffDate);
    return {
        message: `Exclusão executada com sucesso! ${totalDeleted} usuário(s) vencido(s) há mais de ${days} dias foram excluído(s).`,
        deleted: totalDeleted,
        count: countToDelete,
    };
}

module.exports = {
    isValidEmail,
    VALID_ACCOUNT_TYPES,
    listUsers,
    getUserDashboard,
    updateUserManage,
    updateUserRole,
    updateUserAccountType,
    deleteUser,
    getAutoDeleteConfig,
    saveAutoDeleteConfig,
    executeAutoDelete,
};
