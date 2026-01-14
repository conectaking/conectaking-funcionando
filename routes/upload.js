const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const { protectUser } = require('../middleware/protectUser');
const config = require('../config');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
require('dotenv').config();

const router = express.Router();

// Configurar multer para upload de imagens em memória
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'), false);
        }
    }
});

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

/**
 * POST /api/upload/image - Upload direto de imagem (para páginas de personalização)
 * Recebe FormData com campo 'image' e faz upload completo para Cloudflare
 */
router.post('/image', protectUser, upload.single('image'), asyncHandler(async (req, res) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || config.cloudflare.apiToken;

    if (!accountId || !apiToken) {
        logger.error('Credenciais do Cloudflare não encontradas');
        return res.status(500).json({ 
            success: false,
            message: 'Erro de configuração do servidor.' 
        });
    }

    if (!req.file) {
        return res.status(400).json({ 
            success: false,
            message: 'Nenhuma imagem enviada.' 
        });
    }
    
    try {
        // Obter URL de upload do Cloudflare
        const authResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });
        
        const authData = await authResponse.json();
        
        if (!authData.success || !authData.result) {
            throw new Error(authData.errors?.[0]?.message || 'Falha ao obter URL de upload');
        }
        
        const { uploadURL, id: imageId } = authData.result;
        
        // Fazer upload da imagem para Cloudflare usando FormData do Node.js
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'image.jpg',
            contentType: req.file.mimetype
        });
        
        const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            logger.error('Erro no upload para Cloudflare:', errorText);
            throw new Error('Falha ao fazer upload da imagem para Cloudflare');
        }
        
        // Construir URL final da imagem
        const accountHash = config.cloudflare.accountHash || accountId;
        const imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`;
        
        logger.info('✅ [UPLOAD] Imagem enviada com sucesso', { 
            imageId,
            userId: req.user.userId,
            imageUrl 
        });
        
        res.json({
            success: true,
            url: imageUrl,
            imageUrl: imageUrl
        });
    } catch (error) {
        logger.error('Erro ao fazer upload da imagem:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao fazer upload: ' + error.message 
        });
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