const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Rota pública: GET /:slug/form/:itemId
 * Renderiza o formulário digital público
 */
router.get('/:slug/form/:itemId', asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    
    // Headers para evitar cache
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
        const itemIdInt = parseInt(itemId, 10);

        if (isNaN(itemIdInt)) {
            return res.status(400).send('<h1>400 - ID do formulário inválido</h1>');
        }

        // Buscar item do tipo digital_form
        const itemRes = await client.query(
            `SELECT pi.* 
             FROM profile_items pi
             WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = 'digital_form' AND pi.is_active = true`,
            [itemIdInt, userId]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1>');
        }

        const item = itemRes.rows[0];

        // Buscar dados do formulário
        const formRes = await client.query(
            'SELECT * FROM digital_form_items WHERE profile_item_id = $1',
            [itemIdInt]
        );

        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Dados do formulário não encontrados</h1>');
        }

        const formData = formRes.rows[0];

        // Buscar profile_slug
        const profileSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = profileSlugRes.rows[0]?.profile_slug || slug;

        // Renderizar página
        res.render('digitalForm', {
            item: item,
            formData: formData,
            profileSlug: profileSlug,
            slug: slug
        });

    } catch (error) {
        logger.error('Erro ao carregar formulário digital:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar formulário</h1>');
    } finally {
        client.release();
    }
}));

module.exports = router;

