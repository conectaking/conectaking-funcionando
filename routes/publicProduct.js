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

        // Primeiro tentar buscar produto de sales page
        let productRes = await client.query(
            `SELECT 
                spp.*,
                sp.store_title,
                sp.store_description,
                sp.whatsapp_number,
                sp.profile_item_id,
                pi.user_id
             FROM sales_page_products spp
             INNER JOIN sales_pages sp ON spp.sales_page_id = sp.id
             INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
             WHERE spp.id = $1 AND pi.user_id = $2 AND spp.status != 'ARCHIVED'`,
            [productId, userId]
        );

        let product = null;
        let isSalesPageProduct = false;

        if (productRes.rows.length > 0) {
            product = productRes.rows[0];
            isSalesPageProduct = true;
        } else {
            // Se não encontrou, tentar buscar produto de catálogo
            productRes = await client.query(
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

            product = productRes.rows[0];
        }

        // Buscar dados do perfil para layout
        const profileRes = await client.query(
            `SELECT 
                u.id AS user_id,
                p.*,
                CASE
                    WHEN u.account_type = 'business_owner' OR u.account_type = 'individual_com_logo' OR u.account_type = 'king_corporate' OR u.account_type = 'king_finance' OR u.account_type = 'king_finance_plus' OR u.account_type = 'king_premium_plus' THEN u.company_logo_url
                    ELSE parent.company_logo_url
                END AS company_logo_url,
                CASE
                    WHEN u.account_type = 'business_owner' OR u.account_type = 'individual_com_logo' OR u.account_type = 'king_corporate' OR u.account_type = 'king_finance' OR u.account_type = 'king_finance_plus' OR u.account_type = 'king_premium_plus' THEN u.company_logo_size
                    ELSE parent.company_logo_size
                END AS company_logo_size,
                CASE
                    WHEN u.account_type = 'business_owner' OR u.account_type = 'individual_com_logo' OR u.account_type = 'king_corporate' OR u.account_type = 'king_finance' OR u.account_type = 'king_finance_plus' OR u.account_type = 'king_premium_plus' THEN u.company_logo_link
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

        // Se for produto de sales page, buscar dados da sales page e URL da loja
        let salesPageData = null;
        let backUrl = `/${slug}`; // Default: voltar para perfil
        
        if (isSalesPageProduct) {
            const salesPageRes = await client.query(
                `SELECT sp.*, pi.id as profile_item_id
                 FROM sales_pages sp
                 INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
                 WHERE sp.id = $1 AND pi.user_id = $2`,
                [product.sales_page_id, userId]
            );
            if (salesPageRes.rows.length > 0) {
                salesPageData = salesPageRes.rows[0];
                // URL para voltar à loja (sales page) - formato: /:slug/:storeSlug
                const storeSlug = salesPageData.slug || 'loja';
                backUrl = `/${slug}/${storeSlug}`;
            }
        }
        
        // Preparar todas as imagens do produto (principal + adicionais)
        const allImages = [];
        if (product.image_url) {
            allImages.push(product.image_url);
        }
        // Adicionar imagens de variations se existirem
        if (product.variations) {
            try {
                const variations = typeof product.variations === 'string' 
                    ? JSON.parse(product.variations) 
                    : product.variations;
                if (variations.images && Array.isArray(variations.images)) {
                    allImages.push(...variations.images);
                }
            } catch (e) {
                console.error('Erro ao parsear variations:', e);
            }
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        res.render('product', {
            details: details,
            product: product,
            profileUrl: backUrl,
            isSalesPageProduct: isSalesPageProduct,
            salesPageData: salesPageData,
            baseUrl: baseUrl,
            slug: slug,
            allImages: allImages,
            backButtonText: isSalesPageProduct && salesPageData ? (salesPageData.store_title || 'Voltar à Loja') : 'Voltar ao Catálogo'
        });

    } finally {
        client.release();
    }
}));

module.exports = router;

