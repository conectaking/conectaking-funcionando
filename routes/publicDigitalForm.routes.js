const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Rota pública: GET /form/share/:token
 * Acesso via link compartilhável (formulário oculto do cartão público)
 */
router.get('/form/share/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;
    const client = await db.pool.connect();
    
    try {
        // Buscar formulário pelo share_token
        const itemRes = await client.query(
            `SELECT pi.* 
             FROM profile_items pi
             WHERE pi.share_token = $1 AND pi.item_type = 'digital_form' AND pi.is_active = true`,
            [token]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1><p>O link compartilhável é inválido ou expirou.</p>');
        }

        const item = itemRes.rows[0];
        const userId = item.user_id;
        const itemIdInt = item.id;

        // Buscar dados do formulário
        const formRes = await client.query(
            'SELECT * FROM digital_form_items WHERE profile_item_id = $1',
            [itemIdInt]
        );

        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Dados do formulário não encontrados</h1>');
        }

        let formData = formRes.rows[0];
        
        // Garantir que form_fields seja um array
        if (formData.form_fields) {
            if (typeof formData.form_fields === 'string') {
                try {
                    formData.form_fields = JSON.parse(formData.form_fields);
                } catch (e) {
                    logger.error('Erro ao parsear form_fields:', e);
                    formData.form_fields = [];
                }
            }
            if (!Array.isArray(formData.form_fields)) {
                formData.form_fields = [];
            }
        } else {
            formData.form_fields = [];
        }

        // Buscar profile_slug
        const profileSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = profileSlugRes.rows[0]?.profile_slug || userId;

        // Garantir que show_logo_corner esteja disponível (pode não existir em versões antigas)
        if (formData.show_logo_corner === undefined) {
            formData.show_logo_corner = false;
        }
        
        // Renderizar página
        res.render('digitalForm', {
            item: item,
            formData: formData,
            profileSlug: profileSlug,
            slug: profileSlug,
            itemId: itemIdInt
        });

    } catch (error) {
        logger.error('Erro ao carregar formulário via share_token:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar formulário</h1>');
    } finally {
        client.release();
    }
}));

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

        // Buscar item do tipo digital_form (verificar se está listado ou se é acesso direto)
        const itemRes = await client.query(
            `SELECT pi.* 
             FROM profile_items pi
             WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = 'digital_form' AND pi.is_active = true
             AND (pi.is_listed IS NULL OR pi.is_listed = true)`,
            [itemIdInt, userId]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1><p>Este formulário não está disponível publicamente. Use o link compartilhável se você tiver um.</p>');
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

        let formData = formRes.rows[0];
        
        // Garantir que form_fields seja um array (pode vir como string JSON do PostgreSQL)
        if (formData.form_fields) {
            if (typeof formData.form_fields === 'string') {
                try {
                    formData.form_fields = JSON.parse(formData.form_fields);
                } catch (e) {
                    logger.error('Erro ao parsear form_fields:', e);
                    formData.form_fields = [];
                }
            }
            // Garantir que seja um array
            if (!Array.isArray(formData.form_fields)) {
                formData.form_fields = [];
            }
        } else {
            formData.form_fields = [];
        }

        // Buscar profile_slug
        const profileSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = profileSlugRes.rows[0]?.profile_slug || slug;

        // Registrar evento 'view' de analytics (será feito via JavaScript no frontend)
        
        // Renderizar página
        res.render('digitalForm', {
            item: item,
            formData: formData,
            profileSlug: profileSlug,
            slug: slug,
            itemId: itemIdInt
        });

    } catch (error) {
        logger.error('Erro ao carregar formulário digital:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar formulário</h1>');
    } finally {
        client.release();
    }
}));

// POST /:slug/form/:itemId/submit - Salvar resposta do formulário (público)
router.post('/:slug/form/:itemId/submit', asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    const { response_data, responder_name, responder_email, responder_phone } = req.body;
    
    const client = await db.pool.connect();
    
    try {
        // Buscar usuário por slug
        const userRes = await client.query(
            'SELECT id FROM users WHERE profile_slug = $1 OR id = $1',
            [slug]
        );
        
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'Perfil não encontrado' });
        }

        const userId = userRes.rows[0].id;
        const itemIdInt = parseInt(itemId, 10);

        if (isNaN(itemIdInt)) {
            return res.status(400).json({ message: 'ID do formulário inválido' });
        }

        if (!response_data || typeof response_data !== 'object') {
            return res.status(400).json({ message: 'Dados de resposta são obrigatórios' });
        }

        // Verificar se o formulário existe e está ativo
        const itemRes = await client.query(
            `SELECT pi.id 
             FROM profile_items pi
             WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = 'digital_form' AND pi.is_active = true`,
            [itemIdInt, userId]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).json({ message: 'Formulário não encontrado ou não está ativo' });
        }

        // Inserir resposta
        const result = await client.query(`
            INSERT INTO digital_form_responses (
                profile_item_id, response_data, responder_name, responder_email, responder_phone
            ) VALUES ($1, $2::jsonb, $3, $4, $5)
            RETURNING id, submitted_at
        `, [
            itemIdInt,
            JSON.stringify(response_data),
            responder_name || null,
            responder_email || null,
            responder_phone || null
        ]);

        // Registrar evento 'submit' de analytics
        const user_ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
        const user_agent = req.headers['user-agent'] || null;
        const referer = req.headers.referer || null;
        const session_id = req.body.session_id || null;
        
        try {
            await client.query(`
                INSERT INTO digital_form_analytics (
                    profile_item_id, event_type, user_ip, user_agent, referer, session_id
                ) VALUES ($1, 'submit', $2, $3, $4, $5)
            `, [itemIdInt, user_ip, user_agent, referer, session_id]);
        } catch (analyticsError) {
            logger.warn('Erro ao registrar analytics de submit:', analyticsError);
            // Não falhar a requisição se analytics falhar
        }

        logger.info('Resposta do formulário salva', { 
            itemId: itemIdInt, 
            responseId: result.rows[0].id 
        });

        res.json({
            success: true,
            message: 'Resposta salva com sucesso',
            response_id: result.rows[0].id
        });

    } catch (error) {
        logger.error('Erro ao salvar resposta do formulário:', error);
        res.status(500).json({ message: 'Erro ao salvar resposta', error: error.message });
    } finally {
        client.release();
    }
}));

module.exports = router;

