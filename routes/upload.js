const express = require('express');
const fetch = require('node-fetch');
const { protectUser } = require('../middleware/protectUser');
const config = require('../config');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
require('dotenv').config();

const router = express.Router();

router.post('/auth', protectUser, asyncHandler(async (req, res) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || config.cloudflare.apiToken;

    if (!accountId || !apiToken) {
        logger.error('Credenciais do Cloudflare não encontradas');
        throw new Error('Erro de configuração do servidor.');
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });

        const data = await response.json();
        
        if (data.success && data.result) {
            logger.debug('URL de upload do Cloudflare gerada', { 
                userId: req.user.userId,
                imageId: data.result.id,
                uploadURL: data.result.uploadURL
            });
            res.json({
                success: true,
                uploadURL: data.result.uploadURL,
                imageId: data.result.id,
                accountHash: config.cloudflare.accountHash || accountId // Incluir accountHash se disponível
            });
        } else {
            logger.error('Erro da API Cloudflare', { errors: data.errors });
            throw new Error(data.errors[0]?.message || 'Falha ao obter URL de upload.');
        }
    } catch (error) {
        logger.error('Erro ao autenticar com Cloudflare', error);
        throw error;
    }
}));

// Endpoint para obter URL completa da imagem após upload
router.get('/get-url/:imageId', protectUser, asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || config.cloudflare.apiToken;

    if (!accountId || !apiToken) {
        logger.error('Credenciais do Cloudflare não encontradas');
        throw new Error('Erro de configuração do servidor.');
    }

    try {
        // Buscar informações da imagem no Cloudflare
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });

        const data = await response.json();
        
        if (data.success && data.result) {
            // Cloudflare retorna a imagem em variants - usar a primeira variante pública
            let imageUrl = data.result.variants?.[0] || data.result.filename || null;
            
            if (imageUrl) {
                logger.debug('✅ [UPLOAD] URL da imagem obtida do Cloudflare variants', { 
                    imageId, 
                    userId: req.user.userId,
                    imageUrl 
                });
                res.json({
                    success: true,
                    url: imageUrl,
                    imageUrl: imageUrl
                });
            } else {
                // Se não tiver variant, construir URL baseada no account hash
                const accountHash = config.cloudflare.accountHash || accountId;
                // Cloudflare Images usa o formato: https://imagedelivery.net/{account_hash}/{image_id}/{variant_name}
                imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`;
                
                logger.debug('⚠️ [UPLOAD] Construindo URL baseada em accountHash e imageId', { 
                    imageId,
                    accountHash,
                    imageUrl,
                    userId: req.user.userId
                });
                
                res.json({
                    success: true,
                    url: imageUrl,
                    imageUrl: imageUrl
                });
            }
        } else {
            logger.error('❌ [UPLOAD] Erro ao buscar imagem no Cloudflare', { 
                errors: data.errors,
                imageId,
                userId: req.user.userId 
            });
            throw new Error(data.errors[0]?.message || 'Falha ao obter URL da imagem.');
        }
    } catch (error) {
        logger.error('Erro ao obter URL da imagem:', error);
        throw error;
    }
}));

module.exports = router;