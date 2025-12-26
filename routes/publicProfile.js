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
    
    // Headers para evitar cache no navegador (sempre aplicar, mesmo com cache do servidor)
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Verificar cache (se habilitado)
    const cacheKey = `profile:${identifier}`;
    if (cache) {
        const cachedProfile = cache.get(cacheKey);
        if (cachedProfile) {
            logger.debug('Perfil servido do cache', { identifier });
            return res.render('profile', cachedProfile);
        }
    }
    
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
        
        const itemsRes = await client.query('SELECT * FROM profile_items WHERE user_id = $1 AND is_active = TRUE ORDER BY display_order ASC', [userId]);
        
        // Log para debug - remover depois
        logger.debug('Itens encontrados no banco', { 
            userId, 
            total: itemsRes.rows.length,
            itemTypes: itemsRes.rows.map(i => i.item_type)
        });
        
        // Filtrar e validar itens
        const validItems = (itemsRes.rows || []).filter(item => {
            // Remover carrosséis
            if (item.item_type === 'banner_carousel') {
                return false;
            }
            
            // Remover banners que são carrosséis
            if (item.item_type === 'banner' && item.destination_url) {
                const destUrl = String(item.destination_url).trim();
                if (destUrl.startsWith('[') || destUrl === '[]') {
                    return false;
                }
            }
            
            return true;
        });
        
        // Log itens válidos
        logger.debug('Itens válidos após filtro', { 
            validCount: validItems.length,
            itemTypes: validItems.map(i => i.item_type)
        });
        
        // Converter URLs do YouTube para formato embed e carregar produtos dos catálogos
        const items = await Promise.all(validItems.map(async (item) => {
            if (item.item_type === 'youtube_embed' && item.destination_url) {
                item.embed_url = convertYouTubeUrlToEmbed(item.destination_url);
            }
            
            // Se for catálogo de produtos, carregar produtos
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
                    // Em caso de erro, definir array vazio para não quebrar a página
                    item.products = [];
                }
            }
            
            return item;
        }));
        
        const details = profileRes.rows[0];
        details.button_color_rgb = hexToRgb(details.button_color);
        details.card_color_rgb = hexToRgb(details.card_background_color);
        
        // Garantir que button_content_align tenha um valor válido
        if (!details.button_content_align || !['left', 'center', 'right'].includes(details.button_content_align)) {
            details.button_content_align = 'center';
        }
        
        // Log para debug (pode remover depois)
        logger.debug('Dados do perfil público', { 
            userId, 
            button_content_align: details.button_content_align,
            hasButtonContentAlign: !!details.button_content_align
        });

        const profileData = {
            details: details,
            items: items
        };
        
        // Armazenar no cache (TTL de 1 hora) se habilitado
        // Desabilitar cache temporariamente para debug
        // if (cache) {
        //     cache.set(cacheKey, profileData, 3600);
        // }
        
        // Headers para evitar cache no navegador
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.render('profile', profileData);

    } finally {
        client.release();
    }
}));

module.exports = router;