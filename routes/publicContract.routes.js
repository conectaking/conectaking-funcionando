const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const contractService = require('../modules/contracts/contract.service');
const contractRepository = require('../modules/contracts/contract.repository');
const responseFormatter = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * Página pública de assinatura de contrato
 * GET /contract/sign/:signToken
 */
router.get('/sign/:signToken', asyncHandler(async (req, res) => {
    try {
        const { signToken } = req.params;
        
        // Buscar signatário por token
        const signer = await contractService.findSignerByToken(signToken);
        
        // Buscar contrato
        const contract = await contractRepository.findById(signer.contract_id);
        if (!contract) {
            return res.status(404).render('error', { 
                message: 'Contrato não encontrado',
                error: { status: 404 }
            });
        }

        // Renderizar página de assinatura
        res.render('contractSign', {
            contract,
            signer,
            signToken
        });
    } catch (error) {
        logger.error('Erro ao carregar página de assinatura:', error);
        res.status(404).render('error', {
            message: error.message || 'Token de assinatura inválido',
            error: { status: 404 }
        });
    }
}));

/**
 * API: Registrar acesso ao link de assinatura (tracking)
 * POST /api/contracts/sign/:token/start
 */
router.post('/sign/:token/start', asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        
        // Buscar signatário
        const signer = await contractService.findSignerByToken(token);
        
        // Registrar IP e User-Agent (atualizar signatário)
        await contractRepository.updateSigner(signer.id, {
            ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'] || null
        });

        // Log de auditoria (viewed)
        await contractRepository.createAuditLog({
            contract_id: signer.contract_id,
            user_id: null,
            action: 'viewed',
            details: { signer_email: signer.email },
            ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'] || null
        });

        return responseFormatter.success(res, { success: true }, 'Acesso registrado');
    } catch (error) {
        logger.error('Erro ao registrar acesso:', error);
        return responseFormatter.error(res, error.message, 400);
    }
}));

/**
 * API: Submeter assinatura
 * POST /api/contracts/sign/:token/submit
 */
router.post('/sign/:token/submit', asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        const { signature_type, signature_data, signature_image_url } = req.body;

        // Buscar signatário
        const signer = await contractService.findSignerByToken(token);

        // Validar assinatura
        const validation = require('../modules/contracts/contract.validators').validateSignatureData({
            signature_type,
            signature_data,
            signature_image_url
        });

        if (!validation.isValid) {
            return responseFormatter.error(res, `Validação falhou: ${validation.errors.join(', ')}`, 400);
        }

        const client = await require('../db').pool.connect();
        
        try {
            await client.query('BEGIN');

            // Verificar código de verificação se necessário
            if (signer.verification_code && !signer.verification_code_verified) {
                return responseFormatter.error(res, 'Código de verificação não foi confirmado', 403);
            }

            // Criar assinatura
            await contractRepository.createSignature({
                signer_id: signer.id,
                contract_id: signer.contract_id,
                signature_type,
                signature_data,
                signature_image_url,
                signature_page: req.body.signature_page || 1,
                signature_x: req.body.signature_x || null,
                signature_y: req.body.signature_y || null,
                signature_width: req.body.signature_width || 200,
                signature_height: req.body.signature_height || 80,
                ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'] || null
            }, client);

            // Atualizar signatário (marcar como assinado)
            await contractRepository.updateSigner(signer.id, {
                signed_at: new Date()
            }, client);

            // Verificar se todos assinaram
            const allSigners = await contractRepository.findSignersByContractId(signer.contract_id);
            const allSigned = allSigners.every(s => s.signed_at !== null);

            if (allSigned) {
                // Atualizar contrato para completed
                await contractRepository.update(signer.contract_id, {
                    status: 'completed',
                    completed_at: new Date()
                }, client);

                // Log de auditoria (finalized)
                await contractRepository.createAuditLog({
                    contract_id: signer.contract_id,
                    user_id: null,
                    action: 'finalized',
                    details: { all_signers_signed: true },
                    ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                    user_agent: req.headers['user-agent'] || null
                }, client);
            } else {
                // Log de auditoria (signed)
                await contractRepository.createAuditLog({
                    contract_id: signer.contract_id,
                    user_id: null,
                    action: 'signed',
                    details: { signer_email: signer.email },
                    ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                    user_agent: req.headers['user-agent'] || null
                }, client);
            }

            await client.query('COMMIT');

            // Enviar notificações (fora da transação)
            const updatedContract = await contractRepository.findById(signer.contract_id);
            await contractService.sendSignatureNotification(updatedContract, signer, allSigned);

            return responseFormatter.success(res, {
                success: true,
                completed: allSigned
            }, 'Assinatura realizada com sucesso');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Erro ao submeter assinatura:', error);
        return responseFormatter.error(res, error.message, 400);
    }
}));

/**
 * API: Status da assinatura
 * GET /api/contracts/sign/:token/status
 */
router.get('/sign/:token/status', asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        
        // Buscar signatário
        const signer = await contractRepository.findSignerByToken(token);
        
        if (!signer) {
            return responseFormatter.error(res, 'Token inválido', 404);
        }

        // Buscar contrato
        const contract = await contractRepository.findById(signer.contract_id);

        return responseFormatter.success(res, {
            signed: !!signer.signed_at,
            signed_at: signer.signed_at,
            contract_status: contract.status,
            expires_at: signer.token_expires_at,
            expired: new Date(signer.token_expires_at) < new Date(),
            verification_required: !signer.verification_code_verified && signer.verification_code !== null
        });
    } catch (error) {
        logger.error('Erro ao buscar status:', error);
        return responseFormatter.error(res, error.message, 400);
    }
}));

/**
 * API: Enviar código de verificação
 * POST /api/contracts/sign/:token/send-code
 */
router.post('/sign/:token/send-code', asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        
        // Buscar signatário
        const signer = await contractService.findSignerByToken(token);
        
        // Buscar contrato
        const contract = await contractRepository.findById(signer.contract_id);
        if (!contract) {
            return responseFormatter.error(res, 'Contrato não encontrado', 404);
        }

        // Enviar código
        const { code, expiresAt } = await contractService.sendVerificationCode(signer, contract);

        return responseFormatter.success(res, {
            expires_at: expiresAt,
            message: 'Código enviado com sucesso'
        }, 'Código de verificação enviado');
    } catch (error) {
        logger.error('Erro ao enviar código:', error);
        return responseFormatter.error(res, error.message, 400);
    }
}));

/**
 * API: Verificar código de verificação
 * POST /api/contracts/sign/:token/verify-code
 */
router.post('/sign/:token/verify-code', asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        const { code } = req.body;

        if (!code || code.length !== 6) {
            return responseFormatter.error(res, 'Código inválido', 400);
        }

        // Buscar signatário
        const signer = await contractService.findSignerByToken(token);

        // Verificar código
        await contractService.verifyCode(signer.id, code);

        return responseFormatter.success(res, {
            verified: true
        }, 'Código verificado com sucesso');
    } catch (error) {
        logger.error('Erro ao verificar código:', error);
        return responseFormatter.error(res, error.message, 400);
    }
}));

module.exports = router;
