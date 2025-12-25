const express = require('express');
const db = require('../db');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 20, g: 20, b: 23 }; 
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 20, g: 20, b: 23 };
}

// Rota: GET /:slug/produto/:productId
router.get('/:slug/produto/:productId', asyncHandler(async (req, res) => {
    const { slug, productId } = req.params;
    
    // Headers para evitar cache no navegador
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const client = await db.pool.connect();
    
    try {
        // Buscar usuário por slug
        const userRes = await client.query(
            'SELECT id, account_type FROM users WHERE profile_slug = $1 OR id = $1',
            [slug]
        );
        
        if (userRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não encontrado</h1>');
        }

        const user = userRes.rows[0];

        if (user.account_type === 'free') {
            return res.render('inactive_profile');
        }

        const userId = user.id;

        // Buscar produto e validar que pertence ao perfil correto
        const productRes = await client.query(
            `SELECT 
                pci.*,
                pi.user_id,
                pi.destination_url as whatsapp_url
             FROM product_catalog_items pci
             INNER JOIN profile_items pi ON pci.profile_item_id = pi.id
             WHERE pci.id = $1 AND pi.user_id = $2 AND pi.item_type = 'product_catalog'`,
            [productId, userId]
        );

        if (productRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Produto não encontrado</h1>');
        }

        const product = productRes.rows[0];

        // Buscar dados do perfil para layout
        const profileRes = await client.query(
            `SELECT 
                u.id AS user_id,
                p.*,
                CASE
                    WHEN u.account_type = 'business_owner' THEN u.company_logo_url
                    ELSE parent.company_logo_url
                END AS company_logo_url,
                CASE
                    WHEN u.account_type = 'business_owner' THEN u.company_logo_size
                    ELSE parent.company_logo_size
                END AS company_logo_size,
                CASE
                    WHEN u.account_type = 'business_owner' THEN u.company_logo_link
                    ELSE parent.company_logo_link
                END AS company_logo_link
            FROM users u
            INNER JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN users parent ON u.parent_user_id = parent.id
            WHERE u.id = $1`,
            [userId]
        );

        if (profileRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não configurado</h1>');
        }

        const details = profileRes.rows[0];
        details.button_color_rgb = hexToRgb(details.button_color);
        details.card_color_rgb = hexToRgb(details.card_background_color);

        // URL do perfil para botão voltar
        const profileUrl = `/${slug}`;

        res.render('product', {
            details: details,
            product: product,
            profileUrl: profileUrl
        });

    } finally {
        client.release();
    }
}));

module.exports = router;

