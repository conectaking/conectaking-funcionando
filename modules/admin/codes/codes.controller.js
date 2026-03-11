/**
 * Controller: códigos de registro admin. Extrai req, chama service, formata resposta.
 */
const service = require('./codes.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

async function getCodes(req, res) {
    try {
        const filter = req.query.filter;
        const rows = await service.listCodes(filter);
        return responseFormatter.success(res, rows);
    } catch (err) {
        logger.error('Erro ao buscar códigos:', err);
        return responseFormatter.error(res, 'Erro ao buscar códigos.', 500);
    }
}

async function postGenerateManual(req, res) {
    const { customCode, expiresAt } = req.body || {};
    try {
        const result = await service.generateManual(customCode, expiresAt);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.status(201).json({
            success: true,
            data: { codes: result.codes },
            message: result.message,
        });
    } catch (err) {
        if (err.code === '23505') {
            return responseFormatter.error(res, 'Este código personalizado já existe. Tente outro.', 409);
        }
        logger.error('Erro ao criar código personalizado:', err);
        return responseFormatter.error(res, 'Erro ao criar código personalizado.', 500);
    }
}

async function postGenerateCode(req, res) {
    const { expiresAt } = req.body || {};
    try {
        const result = await service.generateCode(expiresAt);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.status(201).json({
            success: true,
            data: { code: result.code },
            message: result.message,
            code: result.code,
        });
    } catch (err) {
        logger.error('Erro ao gerar código:', err);
        return responseFormatter.error(res, 'Erro ao gerar código.', 500);
    }
}

async function postGenerateBatch(req, res) {
    const { prefix, count, expiresAt } = req.body || {};
    try {
        const result = await service.generateBatch(prefix, count, expiresAt);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.status(201).json({
            success: true,
            data: { codes: result.codes },
            message: result.message,
        });
    } catch (err) {
        logger.error('Erro ao gerar códigos em lote:', err);
        return responseFormatter.error(res, 'Erro ao gerar códigos em lote.', 500);
    }
}

async function putCode(req, res) {
    const { code } = req.params;
    const { expiresAt } = req.body || {};
    try {
        const result = await service.updateCode(code, expiresAt);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return responseFormatter.success(res, { code: result.code }, result.message);
    } catch (err) {
        logger.error('Erro ao atualizar código:', err);
        return responseFormatter.error(res, 'Erro ao atualizar código.', 500);
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
    const { days_after_expiration, is_active } = req.body || {};
    try {
        const result = await service.saveAutoDeleteConfig(days_after_expiration, is_active);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return responseFormatter.success(res, { config: result.config }, result.message);
    } catch (err) {
        logger.error('Erro ao salvar configuração:', err);
        return responseFormatter.error(res, 'Erro ao salvar configuração.', 500);
    }
}

async function postExecuteAutoDelete(req, res) {
    try {
        const result = await service.executeAutoDelete();
        return responseFormatter.success(res, { deleted: result.deleted }, result.message);
    } catch (err) {
        logger.error('Erro ao executar exclusão automática:', err);
        return responseFormatter.error(res, 'Erro ao executar exclusão automática.', 500);
    }
}

async function deleteCode(req, res) {
    const { code } = req.params;
    try {
        const result = await service.deleteCode(code);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return responseFormatter.success(res, null, result.message);
    } catch (err) {
        logger.error('Erro ao deletar código:', err);
        return responseFormatter.error(res, 'Erro ao deletar código.', 500);
    }
}

module.exports = {
    getCodes,
    postGenerateManual,
    postGenerateCode,
    postGenerateBatch,
    putCode,
    getAutoDeleteConfig,
    postAutoDeleteConfig,
    postExecuteAutoDelete,
    deleteCode,
};
