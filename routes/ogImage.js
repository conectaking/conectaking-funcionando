const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const { protectAdmin } = require('../middleware/protectAdmin');
const logger = require('../utils/logger');

/**
 * Rota para gerar imagem Open Graph (og-image.jpg) para preview no WhatsApp
 * Gera uma imagem bonita com logo e nome CONECTAKING no fundo vermelho/preto
 * Agora suporta personalização via banco de dados
 */
router.get('/og-image.jpg', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Buscar configurações personalizadas do banco
        let customConfig = null;
        try {
            const configResult = await client.query(`
                SELECT * FROM site_link_preview_config 
                WHERE is_active = true 
                ORDER BY updated_at DESC 
                LIMIT 1
            `);
            if (configResult.rows.length > 0) {
                customConfig = configResult.rows[0];
            }
        } catch (error) {
            logger.warn('Erro ao buscar configuração personalizada, usando padrão:', error.message);
        }
        
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
        
        // Usar configurações personalizadas ou padrão
        const title = customConfig?.title || 'CONECTAKING';
        const subtitle = customConfig?.subtitle || 'Sua Presença Digital. Um Toque. Poder Absoluto.';
        const bgColor1 = customConfig?.bg_color_1 || '#991B1B';
        const bgColor2 = customConfig?.bg_color_2 || '#000000';
        const textColor = customConfig?.text_color || '#F5F5F5';
        const subtitleColor = customConfig?.subtitle_color || '#FFC700';
        
        // Criar fundo gradiente vermelho/preto (ou cores personalizadas)
        const gradientSvg = `
            <svg width="${outputWidth}" height="${outputHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:${bgColor1};stop-opacity:1" />
                        <stop offset="50%" style="stop-color:${bgColor2};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${bgColor1};stop-opacity:1" />
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
                // Redimensionar logo para ~180px de altura
                const logoResized = await sharp(logoBuffer)
                    .resize(180, 180, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .toBuffer();
                
                // Adicionar logo na posição (120, 200)
                image = image.composite([{
                    input: logoResized,
                    left: 120,
                    top: 200
                }]);
            } catch (error) {
                logger.warn('Erro ao processar logo:', error.message);
            }
        }
        
        // Adicionar texto usando SVG com melhor formatação
        const textX = logoBuffer ? 350 : outputWidth / 2;
        const textAnchor = logoBuffer ? 'start' : 'middle';
        const textSvg = `
            <svg width="${outputWidth}" height="${outputHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="shadow">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.5"/>
                    </filter>
                </defs>
                <text 
                    x="${textX}" 
                    y="${outputHeight / 2 + 20}" 
                    font-family="Arial, 'Helvetica Neue', sans-serif" 
                    font-size="100" 
                    font-weight="900" 
                    fill="${textColor}"
                    text-anchor="${textAnchor}"
                    filter="url(#glow) url(#shadow)"
                    letter-spacing="2"
                >${title}</text>
                <text 
                    x="${textX}" 
                    y="${outputHeight / 2 + 140}" 
                    font-family="Arial, 'Helvetica Neue', sans-serif" 
                    font-size="38" 
                    fill="${subtitleColor}"
                    text-anchor="${textAnchor}"
                    font-weight="600"
                    letter-spacing="1"
                >${subtitle}</text>
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
            .jpeg({ quality: 95 })
            .toBuffer();
        
        // Configurar headers
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora (reduzido para permitir atualizações)
        res.set('Content-Length', finalImage.length);
        
        res.send(finalImage);
        
        logger.debug('✅ [OG Image] Imagem gerada com sucesso', {
            custom: !!customConfig,
            title: title.substring(0, 20)
        });
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
    } finally {
        client.release();
    }
}));

/**
 * Rota para salvar configuração personalizada do link preview (APENAS ADM)
 */
router.post('/link-preview-config', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { title, subtitle, bg_color_1, bg_color_2, text_color, subtitle_color } = req.body;
        
        // Desativar configurações antigas
        await client.query(`
            UPDATE site_link_preview_config 
            SET is_active = false 
            WHERE is_active = true
        `);
        
        // Inserir nova configuração
        const result = await client.query(`
            INSERT INTO site_link_preview_config 
            (title, subtitle, bg_color_1, bg_color_2, text_color, subtitle_color, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
            RETURNING *
        `, [title, subtitle, bg_color_1, bg_color_2, text_color, subtitle_color]);
        
        logger.info('✅ [Link Preview] Configuração salva pelo ADM', {
            adminId: req.user.userId,
            title: title
        });
        
        res.json({
            success: true,
            config: result.rows[0]
        });
    } catch (error) {
        logger.error('❌ [Link Preview] Erro ao salvar configuração:', error);
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * Rota para buscar configuração atual (APENAS ADM)
 */
router.get('/link-preview-config', protectAdmin, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM site_link_preview_config 
            WHERE is_active = true 
            ORDER BY updated_at DESC 
            LIMIT 1
        `);
        
        if (result.rows.length > 0) {
            res.json({
                success: true,
                config: result.rows[0]
            });
        } else {
            // Retornar valores padrão
            res.json({
                success: true,
                config: {
                    title: 'CONECTAKING',
                    subtitle: 'Sua Presença Digital. Um Toque. Poder Absoluto.',
                    bg_color_1: '#991B1B',
                    bg_color_2: '#000000',
                    text_color: '#F5F5F5',
                    subtitle_color: '#FFC700'
                }
            });
        }
    } catch (error) {
        logger.error('❌ [Link Preview] Erro ao buscar configuração:', error);
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
