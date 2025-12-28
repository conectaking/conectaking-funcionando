const express = require('express');
const db = require('../db');
const router = express.Router();
const { convertYouTubeUrlToEmbed } = require('../utils/youtube');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 20, g: 20, b: 23 }; 
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 20, g: 20, b: 23 };
}

router.get('/:identifier', asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    
    // Headers para evitar cache no navegador
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const client = await db.pool.connect();
    
    try {
        const userRes = await client.query('SELECT id, account_type FROM users WHERE profile_slug = $1 OR id = $1', [identifier]);
        
        if (userRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não encontrado</h1>');
        }

        const user = userRes.rows[0];

        if (user.account_type === 'free') {
            return res.render('inactive_profile');
        }

        const userId = user.id;

        const profileQuery = `
            SELECT 
                u.id AS user_id,
                u.profile_slug,
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
            WHERE u.id = $1
        `;
        const profileRes = await client.query(profileQuery, [userId]);
        
        if (profileRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não configurado</h1>');
        }
        
        const itemsRes = await client.query('SELECT * FROM profile_items WHERE user_id = $1 AND is_active = true ORDER BY display_order ASC', [userId]);
        
        // Log para debug
        logger.debug('Itens encontrados no banco', { 
            userId, 
            total: itemsRes.rows.length,
            itemTypes: itemsRes.rows.map(i => i.item_type)
        });
        
        // Filtrar e validar itens
        const validItems = (itemsRes.rows || []).filter(item => {
            if (item.item_type === 'banner_carousel') {
                return false;
            }
            
            if (item.item_type === 'banner' && item.destination_url) {
                const destUrl = String(item.destination_url).trim();
                if (destUrl.startsWith('[') || destUrl === '[]') {
                    return false;
                }
            }
            
            return true;
        });
        
        // Converter URLs do YouTube para formato embed e carregar produtos dos catálogos
        const items = await Promise.all(validItems.map(async (item) => {
            if (item.item_type === 'youtube_embed' && item.destination_url) {
                item.embed_url = convertYouTubeUrlToEmbed(item.destination_url);
            }
            
            if (item.item_type === 'product_catalog') {
                try {
                    const productsRes = await client.query(
                        'SELECT * FROM product_catalog_items WHERE profile_item_id = $1 ORDER BY display_order ASC, created_at ASC',
                        [item.id]
                    );
                    item.products = productsRes.rows || [];
                } catch (productError) {
                    logger.error('Erro ao carregar produtos do catálogo', { 
                        itemId: item.id, 
                        error: productError.message 
                    });
                    item.products = [];
                }
            }
            
            if (item.item_type === 'sales_page') {
                try {
                    // Buscar sales_page (mesmo que não esteja publicada, para construir a URL)
                    const salesPageRes = await client.query(
                        'SELECT slug, status FROM sales_pages WHERE profile_item_id = $1',
                        [item.id]
                    );
                    if (salesPageRes.rows.length > 0) {
                        const salesPage = salesPageRes.rows[0];
                        item.sales_page_slug = salesPage.slug;
                        item.sales_page_status = salesPage.status;
                        // Se não estiver publicada, não definir URL (será '#')
                        if (salesPage.status !== 'PUBLISHED') {
                            item.sales_page_slug = null; // Não permitir acesso público se não estiver publicada
                        }
                    } else {
                        // Se não existe sales_page, não definir slug
                        item.sales_page_slug = null;
                    }
                } catch (salesPageError) {
                    logger.error('Erro ao carregar dados da página de vendas', { 
                        itemId: item.id, 
                        error: salesPageError.message 
                    });
                    item.sales_page_slug = null;
                }
            }
            
            return item;
        }));
        
        const details = profileRes.rows[0];
        details.button_color_rgb = hexToRgb(details.button_color);
        details.card_color_rgb = hexToRgb(details.card_background_color);
        
        // Garantir que profile_slug está disponível em details
        if (!details.profile_slug) {
            details.profile_slug = user.profile_slug || identifier;
        }
        
        if (!details.button_content_align || !['left', 'center', 'right'].includes(details.button_content_align)) {
            details.button_content_align = 'center';
        }

        // Preparar URL da imagem processada para og:image (se houver imagem)
        // Adicionar cache-busting baseado na URL da imagem para forçar atualização
        let ogImageUrl = null;
        if (details.profile_image_url) {
            // Extrair parte única da URL (ID do Cloudflare) para cache-busting
            const urlParts = details.profile_image_url.match(/[a-zA-Z0-9_-]+/g);
            const cacheBuster = urlParts ? urlParts[urlParts.length - 1] : Date.now();
            ogImageUrl = `${req.protocol}://${req.get('host')}/api/image/profile-image?url=${encodeURIComponent(details.profile_image_url)}&v=${cacheBuster}`;
        }
        
        // Buscar profile_slug do usuário para usar nas URLs
        const userSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const userProfileSlug = userSlugRes.rows[0]?.profile_slug || identifier;
        
        const profileData = {
            details: details,
            items: items,
            origin: req.protocol + '://' + req.get('host'),
            ogImageUrl: ogImageUrl,
            profile_slug: userProfileSlug, // Adicionar profile_slug para uso no template
            identifier: identifier // Adicionar identifier também
        };
        
        res.render('profile', profileData);

    } finally {
        client.release();
    }
}));

module.exports = router;

