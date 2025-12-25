

const express = require('express');
const { QrCodePix } = require('qrcode-pix');
const db = require('../db');

const router = express.Router();

router.get('/qrcode/:itemId', async (req, res) => {
    const { itemId } = req.params;

    try {
        const query = `
            SELECT 
                i.pix_key, 
                p.display_name
            FROM profile_items i
            JOIN user_profiles p ON i.user_id = p.user_id
            WHERE i.id = $1 AND i.item_type = 'pix_qrcode'
        `;
        const result = await db.query(query, [itemId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item PIX QR Code não encontrado.' });
        }

        const { pix_key, display_name } = result.rows[0];

        if (!pix_key) {
             return res.status(400).json({ message: 'Nenhuma chave PIX configurada para este item.' });
        }

        const qrCodePix = QrCodePix({
            version: '01',
            key: pix_key, 
            name: display_name || 'Recebedor', 
            city: 'CIDADE', 
        });

        const brCodePayload = qrCodePix.payload();

        res.json({ brcode: brCodePayload });

    } catch (error) {
        console.error("Erro ao gerar BR Code do PIX:", error);
        res.status(500).json({ message: 'Erro no servidor ao gerar o QR Code do PIX.' });
    }
});

module.exports = router;