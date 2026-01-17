

const express = require('express');
const { QrCodePix } = require('qrcode-pix');
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/qrcode/:itemId', asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    try {
        // Validar itemId
        const parsedItemId = parseInt(itemId, 10);
        if (!parsedItemId || isNaN(parsedItemId)) {
            logger.warn('Tentativa de acessar PIX QR Code com ID inválido', {
                itemId: itemId,
                ip: req.ip
            });
            return res.status(400).json({ 
                success: false,
                message: 'ID do item inválido.' 
            });
        }

        const query = `
            SELECT 
                i.pix_key, 
                p.display_name
            FROM profile_items i
            JOIN user_profiles p ON i.user_id = p.user_id
            WHERE i.id = $1 AND i.item_type = 'pix_qrcode'
        `;
        
        const result = await db.query(query, [parsedItemId]);

        if (result.rows.length === 0) {
            logger.warn('Item PIX QR Code não encontrado', {
                itemId: parsedItemId,
                ip: req.ip
            });
            return res.status(404).json({ 
                success: false,
                message: 'Item PIX QR Code não encontrado.' 
            });
        }

        const { pix_key, display_name } = result.rows[0];

        if (!pix_key || pix_key.trim() === '') {
            logger.warn('Chave PIX não configurada para o item', {
                itemId: parsedItemId,
                ip: req.ip
            });
            return res.status(400).json({ 
                success: false,
                message: 'Nenhuma chave PIX configurada para este item.' 
            });
        }

        // Gerar QR Code PIX
        const qrCodePix = QrCodePix({
            version: '01',
            key: pix_key.trim(), 
            name: (display_name || 'Recebedor').trim(), 
            city: 'CIDADE', 
        });

        const brCodePayload = qrCodePix.payload();

        logger.info('QR Code PIX gerado com sucesso', {
            itemId: parsedItemId,
            hasKey: !!pix_key
        });

        res.json({ 
            success: true,
            brcode: brCodePayload 
        });

    } catch (error) {
        logger.error("Erro ao gerar BR Code do PIX", {
            error: error.message,
            stack: error.stack,
            itemId: itemId,
            ip: req.ip
        });
        
        // Re-throw para o asyncHandler tratar
        throw error;
    }
}));

module.exports = router;