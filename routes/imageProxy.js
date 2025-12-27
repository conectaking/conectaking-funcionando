const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const fetch = require('node-fetch');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Rota para processar imagens PNG e adicionar fundo preto
 * Para JPEG mantém original
 */
router.get('/profile-image', asyncHandler(async (req, res) => {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'URL da imagem não fornecida' });
    }
    
    try {
        // Baixar a imagem
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Erro ao baixar imagem: ${imageResponse.statusText}`);
        }
        
        const imageBuffer = await imageResponse.buffer();
        
        // Detectar formato da imagem
        const metadata = await sharp(imageBuffer).metadata();
        const format = metadata.format;
        
        let processedBuffer;
        
        // Se for PNG, adicionar fundo preto
        if (format === 'png') {
            // Criar uma imagem com fundo preto
            processedBuffer = await sharp({
                create: {
                    width: metadata.width,
                    height: metadata.height,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 1 }
                }
            })
            .composite([{ input: imageBuffer, blend: 'over' }])
            .png()
            .toBuffer();
            
            res.set('Content-Type', 'image/png');
        } else {
            // Para JPEG ou outros formatos, manter original
            processedBuffer = imageBuffer;
            res.set('Content-Type', `image/${format}`);
        }
        
        // Configurar headers para cache
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache por 1 ano
        res.set('Content-Length', processedBuffer.length);
        
        res.send(processedBuffer);
    } catch (error) {
        logger.error('Erro ao processar imagem:', error);
        res.status(500).json({ error: 'Erro ao processar imagem' });
    }
}));

module.exports = router;

