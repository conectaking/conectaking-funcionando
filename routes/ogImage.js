const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Rota para gerar imagem Open Graph (og-image.jpg) para preview no WhatsApp
 * Gera uma imagem bonita com logo e nome CONECTAKING no fundo vermelho/preto
 */
router.get('/og-image.jpg', asyncHandler(async (req, res) => {
    try {
        const logoPath = path.join(__dirname, '../public_html/logo.png');
        const outputWidth = 1200;
        const outputHeight = 630;
        
        // Verificar se logo existe
        let logoBuffer = null;
        try {
            logoBuffer = await fs.readFile(logoPath);
        } catch (error) {
            logger.warn('Logo não encontrado, criando imagem sem logo');
        }
        
        // Criar fundo gradiente vermelho/preto
        const gradientSvg = `
            <svg width="${outputWidth}" height="${outputHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#991B1B;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#000000;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#991B1B;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="${outputWidth}" height="${outputHeight}" fill="url(#grad)"/>
            </svg>
        `;
        
        // Criar imagem base com gradiente
        let image = sharp(Buffer.from(gradientSvg))
            .resize(outputWidth, outputHeight);
        
        // Se tiver logo, adicionar ao centro-esquerda
        if (logoBuffer) {
            try {
                // Redimensionar logo para ~200px de altura
                const logoResized = await sharp(logoBuffer)
                    .resize(200, 200, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .toBuffer();
                
                // Adicionar logo na posição (150, 200)
                image = image.composite([{
                    input: logoResized,
                    left: 150,
                    top: 200
                }]);
            } catch (error) {
                logger.warn('Erro ao processar logo:', error.message);
            }
        }
        
        // Adicionar texto "CONECTAKING" usando SVG
        const textX = logoBuffer ? 400 : outputWidth / 2;
        const textAnchor = logoBuffer ? 'start' : 'middle';
        const textSvg = `
            <svg width="${outputWidth}" height="${outputHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <text 
                    x="${textX}" 
                    y="${outputHeight / 2 + 30}" 
                    font-family="Arial, sans-serif" 
                    font-size="90" 
                    font-weight="bold" 
                    fill="#F5F5F5"
                    text-anchor="${textAnchor}"
                    filter="url(#glow)"
                >CONECTAKING</text>
                <text 
                    x="${textX}" 
                    y="${outputHeight / 2 + 130}" 
                    font-family="Arial, sans-serif" 
                    font-size="36" 
                    fill="#FFC700"
                    text-anchor="${textAnchor}"
                    font-weight="600"
                >Sua Presença Digital. Um Toque. Poder Absoluto.</text>
            </svg>
        `;
        
        const textBuffer = Buffer.from(textSvg);
        
        // Compor texto sobre a imagem
        image = image.composite([{
            input: textBuffer,
            blend: 'over'
        }]);
        
        // Converter para JPEG
        const finalImage = await image
            .jpeg({ quality: 90 })
            .toBuffer();
        
        // Configurar headers
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400'); // Cache por 1 dia
        res.set('Content-Length', finalImage.length);
        
        res.send(finalImage);
        
        logger.debug('✅ [OG Image] Imagem gerada com sucesso');
    } catch (error) {
        logger.error('❌ [OG Image] Erro ao gerar imagem:', error);
        
        // Fallback: retornar imagem simples
        const fallbackSvg = `
            <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
                <rect width="1200" height="630" fill="#991B1B"/>
                <text x="600" y="315" font-family="Arial" font-size="80" font-weight="bold" fill="#F5F5F5" text-anchor="middle">CONECTAKING</text>
            </svg>
        `;
        
        const fallbackImage = await sharp(Buffer.from(fallbackSvg))
            .jpeg({ quality: 90 })
            .toBuffer();
        
        res.set('Content-Type', 'image/jpeg');
        res.send(fallbackImage);
    }
}));

module.exports = router;
