/**
 * Controller: códigos de convite da empresa.
 */
const service = require('./codigosConvite.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

async function getCodes(req, res) {
    try {
        const rows = await service.listCodes(req.user.userId);
        return responseFormatter.success(res, rows);
    } catch (err) {
        logger.error('Erro ao buscar códigos:', err);
        return responseFormatter.error(res, 'Erro ao buscar códigos.', 500);
    }
}

async function postGenerateCode(req, res) {
    try {
        const result = await service.generateCode(req.user.userId);
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

async function postGenerateManual(req, res) {
    const { customCode } = req.body || {};
    try {
        const result = await service.generateManual(req.user.userId, customCode);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.status(201).json({
            success: true,
            data: { code: result.code },
            message: result.message,
            code: result.code,
        });
    } catch (err) {
        if (err.code === '23505') {
            return responseFormatter.error(res, 'Este código personalizado já existe. Tente outro.', 409);
        }
        logger.error('Erro ao criar código manual de equipe:', err);
        return responseFormatter.error(res, 'Erro no servidor ao criar código.', 500);
    }
}

module.exports = {
    getCodes,
    postGenerateCode,
    postGenerateManual,
};
