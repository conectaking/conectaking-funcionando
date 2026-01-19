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
        
        // Limpar token (remover caracteres especiais ou espaços)
        const cleanToken = signToken.trim();
        
        logger.info('Tentando carregar página de assinatura', { 
            tokenLength: cleanToken.length,
            tokenPreview: cleanToken.length > 20 ? cleanToken.substring(0, 20) + '...' : cleanToken
        });
        
        // Buscar signatário por token
        const signer = await contractService.findSignerByToken(cleanToken);
        
        if (!signer) {
            logger.warn('Signatário não encontrado', { 
                tokenLength: cleanToken.length,
                tokenPreview: cleanToken.length > 20 ? cleanToken.substring(0, 20) + '...' : cleanToken
            });
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Token Inválido</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h1 { color: #EF4444; }
                    </style>
                </head>
                <body>
                    <h1>Token de Assinatura Inválido</h1>
                    <p>O link de assinatura não é válido ou expirou.</p>
                    <p>Por favor, entre em contato com quem enviou o contrato para receber um novo link.</p>
                </body>
                </html>
            `);
        }
        
        // Buscar contrato
        const contract = await contractRepository.findById(signer.contract_id);
        if (!contract) {
            logger.warn('Contrato não encontrado', { contractId: signer.contract_id });
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Contrato Não Encontrado</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h1 { color: #EF4444; }
                    </style>
                </head>
                <body>
                    <h1>Contrato Não Encontrado</h1>
                    <p>O contrato solicitado não foi encontrado no sistema.</p>
                </body>
                </html>
            `);
        }

        // Se o contrato não tiver conteúdo e for de template, buscar do template
        if (!contract.pdf_content && contract.template_id) {
            try {
                const template = await contractRepository.findTemplateById(contract.template_id);
                if (template && template.content) {
                    contract.pdf_content = template.content;
                    logger.info('Conteúdo do template carregado para exibição', { contractId: contract.id, templateId: template.id });
                }
            } catch (err) {
                logger.warn('Erro ao buscar conteúdo do template', { error: err.message, templateId: contract.template_id });
            }
        }

        logger.info('Renderizando página de assinatura', { 
            contractId: contract.id, 
            signerId: signer.id,
            hasContent: !!contract.pdf_content,
            contractType: contract.contract_type
        });

        // Renderizar página de assinatura
        res.render('contractSign', {
            contract,
            signer,
            signToken: cleanToken  // Usar o token limpo
        });
    } catch (error) {
        logger.error('Erro ao carregar página de assinatura:', error);
        
        // Retornar página de erro HTML simples se o template não existir
        const errorMessage = error.message || 'Token de assinatura inválido';
        const isExpired = errorMessage.includes('expirado');
        const isAlreadySigned = errorMessage.includes('já foi assinado');
        
        res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Erro ao Carregar Contrato</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        text-align: center; 
                        padding: 50px 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: #fff;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .error-container {
                        background: rgba(255, 255, 255, 0.95);
                        color: #333;
                        padding: 40px;
                        border-radius: 12px;
                        max-width: 600px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    }
                    h1 { 
                        color: #EF4444; 
                        margin-bottom: 20px;
                        font-size: 2rem;
                    }
                    p {
                        font-size: 1.1rem;
                        line-height: 1.6;
                        margin-bottom: 15px;
                    }
                    .icon {
                        font-size: 4rem;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="icon">${isExpired ? '⏰' : isAlreadySigned ? '✅' : '❌'}</div>
                    <h1>${isExpired ? 'Link Expirado' : isAlreadySigned ? 'Contrato Já Assinado' : 'Erro ao Carregar Contrato'}</h1>
                    <p>${errorMessage}</p>
                    ${isExpired ? '<p>Por favor, entre em contato com quem enviou o contrato para receber um novo link de assinatura.</p>' : ''}
                    ${isAlreadySigned ? '<p>Este contrato já foi assinado anteriormente.</p>' : ''}
                    ${!isExpired && !isAlreadySigned ? '<p>Por favor, verifique o link ou entre em contato com o suporte.</p>' : ''}
                </div>
            </body>
            </html>
        `);
    }
}));

/**
 * Visualizar PDF do contrato (rota pública usando token)
 * GET /contract/sign/:token/pdf
 */
router.get('/sign/:signToken/pdf', asyncHandler(async (req, res) => {
    try {
        const { signToken } = req.params;
        const token = signToken.trim();
        
        // Buscar signatário por token
        const signer = await contractService.findSignerByToken(token);
        
        // Buscar contrato
        const contract = await contractRepository.findById(signer.contract_id);
        if (!contract) {
            return res.status(404).json({ error: 'Contrato não encontrado' });
        }
        
        // Verificar se tem PDF
        if (!contract.pdf_file_path) {
            return res.status(404).json({ error: 'PDF não encontrado para este contrato' });
        }
        
        const fs = require('fs');
        const path = require('path');
        
        // Construir caminho do arquivo
        let filePath = contract.pdf_file_path;
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(__dirname, '..', filePath);
        }
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Arquivo PDF não encontrado' });
        }
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${contract.title || 'contrato'}.pdf"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        logger.error('Erro ao visualizar PDF público:', error);
        res.status(404).json({ error: error.message || 'Token de assinatura inválido' });
    }
}));

/**
 * API: Registrar acesso ao link de assinatura (tracking)
 * POST /contract/sign/:signToken/start
 */
router.post('/sign/:signToken/start', asyncHandler(async (req, res) => {
    try {
        const { signToken } = req.params;
        const token = signToken.trim();
        
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
 * POST /contract/sign/:signToken/submit
 */
router.post('/sign/:signToken/submit', asyncHandler(async (req, res) => {
    try {
        const { signToken } = req.params;
        const token = signToken.trim();
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
 * GET /contract/sign/:signToken/status
 */
router.get('/sign/:signToken/status', asyncHandler(async (req, res) => {
    try {
        const { signToken } = req.params;
        const token = signToken.trim();
        
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
 * POST /contract/sign/:signToken/send-code
 */
router.post('/sign/:signToken/send-code', asyncHandler(async (req, res) => {
    try {
        const { signToken } = req.params;
        const token = signToken.trim();
        
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
 * POST /contract/sign/:signToken/verify-code
 */
router.post('/sign/:signToken/verify-code', asyncHandler(async (req, res) => {
    try {
        const { signToken } = req.params;
        const token = signToken.trim();
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
