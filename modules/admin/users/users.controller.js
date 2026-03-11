/**
 * Controller: usuários admin. Extrai req, chama service, formata resposta.
 */
const service = require('./users.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

async function getUsers(req, res) {
    try {
        const rows = await service.listUsers();
        return responseFormatter.success(res, rows);
    } catch (err) {
        logger.error('Erro ao buscar usuários:', err);
        return responseFormatter.error(res, 'Erro ao buscar usuários.', 500);
    }
}

async function getUserDashboard(req, res) {
    const userId = req.params.id;
    try {
        const data = await service.getUserDashboard(userId);
        if (!data) return responseFormatter.error(res, 'Usuário não encontrado.', 404);
        return responseFormatter.success(res, data);
    } catch (err) {
        logger.error('Erro ao buscar dashboard do usuário:', err);
        return responseFormatter.error(res, 'Erro ao carregar dashboard do usuário.', 500);
    }
}

async function putUserManage(req, res) {
    const id = req.params.id;
    const adminUserId = req.user.userId;
    if (parseInt(id, 10) === adminUserId && req.body.isAdmin === false) {
        return responseFormatter.error(res, 'Você não pode remover seu próprio status de administrador.', 403);
    }
    try {
        const result = await service.updateUserManage(id, adminUserId, req.body);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return responseFormatter.success(res, { user: result.user }, result.message);
    } catch (err) {
        logger.error('Erro ao gerenciar usuário:', err);
        return responseFormatter.error(res, 'Erro ao atualizar dados do usuário.', 500);
    }
}

async function putUserUpdateRole(req, res) {
    const id = req.params.id;
    const adminUserId = req.user.userId;
    if (id === adminUserId && req.body.isAdmin === false) {
        return responseFormatter.error(res, 'Você não pode remover seu próprio status de administrador.', 403);
    }
    try {
        const result = await service.updateUserRole(id, adminUserId, req.body);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return responseFormatter.success(res, { user: result.user }, result.message);
    } catch (err) {
        logger.error('Erro ao atualizar usuário:', err);
        return responseFormatter.error(res, 'Erro ao atualizar usuário.', 500);
    }
}

async function putUser(req, res) {
    const id = req.params.id;
    try {
        const result = await service.updateUserAccountType(id, req.body);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return responseFormatter.success(res, { user: result.user }, result.message);
    } catch (err) {
        logger.error('Erro ao atualizar tipo de conta:', err);
        return responseFormatter.error(res, 'Erro ao atualizar tipo de conta.', 500);
    }
}

async function deleteUser(req, res) {
    const id = req.params.id;
    if (parseInt(id, 10) === req.user.userId) {
        return responseFormatter.error(res, 'Você não pode deletar sua própria conta de administrador.', 403);
    }
    try {
        const result = await service.deleteUser(id, req.user.userId);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return responseFormatter.success(res, null, result.message);
    } catch (err) {
        logger.error('Erro ao deletar usuário:', err);
        return responseFormatter.error(res, 'Erro no servidor ao tentar deletar o usuário.', 500);
    }
}

async function getAutoDeleteConfig(req, res) {
    try {
        const rows = await service.getAutoDeleteConfig();
        return responseFormatter.success(res, rows);
    } catch (err) {
        logger.error('Erro ao buscar configuração:', err);
        return responseFormatter.error(res, 'Erro ao buscar configuração.', 500);
    }
}

async function postAutoDeleteConfig(req, res) {
    try {
        const result = await service.saveAutoDeleteConfig(req.body);
        return responseFormatter.success(res, { config: result.config }, result.message);
    } catch (err) {
        logger.error('Erro ao salvar configuração:', err);
        return responseFormatter.error(res, 'Erro ao salvar configuração.', 500);
    }
}

async function postExecuteAutoDelete(req, res) {
    try {
        const result = await service.executeAutoDelete(req.body);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return responseFormatter.success(res, {
            deleted: result.deleted,
            count: result.count,
        }, result.message);
    } catch (err) {
        logger.error('Erro ao executar exclusão automática:', err);
        return responseFormatter.error(res, 'Erro ao executar exclusão automática.', 500);
    }
}

module.exports = {
    getUsers,
    getUserDashboard,
    putUserManage,
    putUserUpdateRole,
    putUser,
    deleteUser,
    getAutoDeleteConfig,
    postAutoDeleteConfig,
    postExecuteAutoDelete,
};
