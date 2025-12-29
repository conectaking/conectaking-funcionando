const express = require('express');
const router = express.Router();
const db = require('../db');
const salesPageService = require('../modules/salesPage/salesPage.service');
const productService = require('../modules/salesPage/products/product.service');
const analyticsService = require('../modules/salesPage/analytics/analytics.service');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Rota pública: /:slug/loja/:itemId ou /:slug/loja/:slug
 */
router.get('/:slug/loja/:identifier', asyncHandler(async (req, res) => {
    const { slug, identifier } = req.params;
    const { token } = req.query; // Para preview seguro

    const client = await db.pool.connect();
    try {
        // Buscar usuário pelo slug
        const userRes = await client.query(
            'SELECT id FROM users WHERE profile_slug = $1',
            [slug]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não encontrado</h1>');
        }

        const userId = userRes.rows[0].id;

        // Buscar página de vendas
        let salesPage;
        const isNumeric = /^\d+$/.test(identifier);

        if (isNumeric) {
            // Buscar por profile_item_id
            const itemRes = await client.query(
                'SELECT id FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
                [identifier, userId, 'sales_page']
            );

            if (itemRes.rows.length === 0) {
                return res.status(404).send('<h1>404 - Página de vendas não encontrada</h1>');
            }

            salesPage = await salesPageService.findByProfileItemId(itemRes.rows[0].id, userId);
        } else {
            // Buscar por slug
            try {
                salesPage = await salesPageService.findBySlug(identifier);
                
                if (!salesPage) {
                    return res.status(404).send('<h1>404 - Página de vendas não encontrada</h1>');
                }
                
                // Verificar se pertence ao usuário
                const itemRes = await client.query(
                    'SELECT id FROM profile_items WHERE id = $1 AND user_id = $2',
                    [salesPage.profile_item_id, userId]
                );

                if (itemRes.rows.length === 0) {
                    return res.status(404).send('<h1>404 - Página de vendas não encontrada</h1>');
                }
            } catch (error) {
                logger.error('Erro ao buscar sales page por slug:', error);
                return res.status(404).send('<h1>404 - Página de vendas não encontrada</h1>');
            }
        }

        // Verificar se está publicada ou se tem token de preview
        if (!salesPage) {
            return res.status(404).send('<h1>404 - Página de vendas não encontrada</h1>');
        }
        
        if (salesPage.status !== 'PUBLISHED') {
            if (!token || token !== salesPage.preview_token) {
                return res.status(404).send('<h1>404 - Página não encontrada ou não publicada</h1>');
            }
        }

        // Buscar produtos ativos (apenas ACTIVE para página pública)
        console.log(`🔍 [SALES-PAGE] Buscando produtos para sales_page_id: ${salesPage.id}`);
        console.log(`🔍 [SALES-PAGE] Sales page encontrada:`, {
            id: salesPage.id,
            profile_item_id: salesPage.profile_item_id,
            status: salesPage.status,
            store_title: salesPage.store_title
        });
        const products = await productService.findBySalesPageId(salesPage.id, false);
        console.log(`✅ [SALES-PAGE] Encontrados ${products.length} produtos para exibição`);
        if (products.length === 0) {
            console.warn(`⚠️ [SALES-PAGE] Nenhum produto encontrado para sales_page_id: ${salesPage.id}`);
            // Verificar se há produtos no banco (mesmo com status diferente)
            const allProductsCheck = await productService.findBySalesPageId(salesPage.id, true);
            console.log(`🔍 [SALES-PAGE] Total de produtos no banco (incluindo arquivados): ${allProductsCheck.length}`);
            if (allProductsCheck.length > 0) {
                console.log(`📊 [SALES-PAGE] Status dos produtos:`, allProductsCheck.map(p => ({ id: p.id, name: p.name, status: p.status })));
            }
        }

        // Registrar evento page_view
        try {
            await analyticsService.trackEvent({
                sales_page_id: salesPage.id,
                product_id: null,
                event_type: 'page_view',
                metadata: {
                    ip: req.ip,
                    user_agent: req.get('user-agent'),
                    referrer: req.get('referer'),
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            logger.error('Erro ao registrar page_view:', error);
            // Não bloquear renderização se falhar
        }

        // Buscar profile_slug do usuário para usar no template
        const profileSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = profileSlugRes.rows[0]?.profile_slug || slug;
        
        // Renderizar página
        res.render('salesPage', {
            salesPage,
            products,
            isPreview: !!token && token === salesPage.preview_token,
            whatsappNumber: salesPage.whatsapp_number,
            profileSlug: profileSlug // Passar profile_slug para o template
        });

    } catch (error) {
        logger.error('Erro ao carregar página de vendas:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar página</h1>');
    } finally {
        client.release();
    }
}));

module.exports = router;

