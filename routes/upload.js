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
            logger.debug('URL de upload do Cloudflare gerada', { userId: req.user.userId });
            res.json({
                success: true,
                uploadURL: data.result.uploadURL,
                imageId: data.result.id
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

module.exports = router;