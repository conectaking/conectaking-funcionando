const express = require('express');
const router = express.Router();
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /api/guest-lists/:id/customize-portaria - Página de personalização da portaria
 */
router.get('/:id/customize-portaria', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        
        // Buscar lista de convidados
        const result = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE pi.id = $1 AND pi.user_id = $2 AND pi.is_active = true
        `, [listId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Lista não encontrada',
                title: 'Erro'
            });
        }
        
        const guestList = result.rows[0];
        
        // Garantir valores padrão
        if (!guestList.primary_color) guestList.primary_color = '#FFC700';
        if (!guestList.secondary_color) guestList.secondary_color = '#FFB700';
        if (!guestList.text_color) guestList.text_color = '#ECECEC';
        if (!guestList.background_color) guestList.background_color = '#0D0D0F';
        if (!guestList.background_opacity) guestList.background_opacity = 1.0;
        if (!guestList.theme_portaria) guestList.theme_portaria = 'default';
        
        res.render('guestListCustomizePortaria', {
            guestList,
            profileItemId: listId
        });
    } catch (error) {
        logger.error('Erro ao carregar página de personalização da portaria:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/:id/customize-confirmacao - Página de personalização da confirmação
 */
router.get('/:id/customize-confirmacao', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        
        // Buscar lista de convidados
        const result = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE pi.id = $1 AND pi.user_id = $2 AND pi.is_active = true
        `, [listId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Lista não encontrada',
                title: 'Erro'
            });
        }
        
        const guestList = result.rows[0];
        
        // Garantir valores padrão
        if (!guestList.primary_color) guestList.primary_color = '#FFC700';
        if (!guestList.secondary_color) guestList.secondary_color = '#FFB700';
        if (!guestList.text_color) guestList.text_color = '#ECECEC';
        if (!guestList.background_color) guestList.background_color = '#0D0D0F';
        if (!guestList.background_opacity) guestList.background_opacity = 1.0;
        if (!guestList.theme_confirmacao) guestList.theme_confirmacao = 'default';
        
        res.render('guestListCustomizeConfirmacao', {
            guestList,
            profileItemId: listId
        });
    } catch (error) {
        logger.error('Erro ao carregar página de personalização da confirmação:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/guest-lists/:id/customize-portaria - Salvar personalização da portaria
 */
router.put('/:id/customize-portaria', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const {
            primary_color,
            secondary_color,
            text_color,
            background_color,
            background_image_url,
            background_opacity,
            header_image_url,
            form_logo_url,
            theme_portaria
        } = req.body;
        
        // Verificar se a lista pertence ao usuário
        const checkResult = await client.query(`
            SELECT gli.id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE pi.id = $1 AND pi.user_id = $2 AND pi.is_active = true
        `, [listId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestListItemId = checkResult.rows[0].id;
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (primary_color !== undefined) {
            updateFields.push(`primary_color = $${paramIndex++}`);
            updateValues.push(primary_color);
        }
        if (secondary_color !== undefined) {
            updateFields.push(`secondary_color = $${paramIndex++}`);
            updateValues.push(secondary_color);
        }
        if (text_color !== undefined) {
            updateFields.push(`text_color = $${paramIndex++}`);
            updateValues.push(text_color);
        }
        if (background_color !== undefined) {
            updateFields.push(`background_color = $${paramIndex++}`);
            updateValues.push(background_color);
        }
        if (background_image_url !== undefined) {
            updateFields.push(`background_image_url = $${paramIndex++}`);
            updateValues.push(background_image_url || null);
        }
        if (background_opacity !== undefined) {
            updateFields.push(`background_opacity = $${paramIndex++}`);
            updateValues.push(parseFloat(background_opacity) || 1.0);
        }
        if (header_image_url !== undefined) {
            updateFields.push(`header_image_url = $${paramIndex++}`);
            updateValues.push(header_image_url || null);
        }
        if (form_logo_url !== undefined) {
            updateFields.push(`form_logo_url = $${paramIndex++}`);
            updateValues.push(form_logo_url || null);
        }
        if (theme_portaria !== undefined) {
            // Verificar se a coluna existe antes de atualizar
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'guest_list_items' 
                AND column_name = 'theme_portaria'
            `);
            if (columnCheck.rows.length > 0) {
                updateFields.push(`theme_portaria = $${paramIndex++}`);
                updateValues.push(theme_portaria);
            }
        }
        
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(guestListItemId);
        
        if (updateFields.length > 1) {
            await client.query(`
                UPDATE guest_list_items 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
            `, updateValues);
        }
        
        res.json({ success: true, message: 'Personalização salva com sucesso!' });
    } catch (error) {
        logger.error('Erro ao salvar personalização da portaria:', error);
        res.status(500).json({ message: 'Erro ao salvar personalização', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/guest-lists/:id/customize-confirmacao - Salvar personalização da confirmação
 */
router.put('/:id/customize-confirmacao', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const {
            primary_color,
            secondary_color,
            text_color,
            background_color,
            background_image_url,
            background_opacity,
            header_image_url,
            form_logo_url,
            theme_confirmacao
        } = req.body;
        
        // Verificar se a lista pertence ao usuário
        const checkResult = await client.query(`
            SELECT gli.id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE pi.id = $1 AND pi.user_id = $2 AND pi.is_active = true
        `, [listId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestListItemId = checkResult.rows[0].id;
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (primary_color !== undefined) {
            updateFields.push(`primary_color = $${paramIndex++}`);
            updateValues.push(primary_color);
        }
        if (secondary_color !== undefined) {
            updateFields.push(`secondary_color = $${paramIndex++}`);
            updateValues.push(secondary_color);
        }
        if (text_color !== undefined) {
            updateFields.push(`text_color = $${paramIndex++}`);
            updateValues.push(text_color);
        }
        if (background_color !== undefined) {
            updateFields.push(`background_color = $${paramIndex++}`);
            updateValues.push(background_color);
        }
        if (background_image_url !== undefined) {
            updateFields.push(`background_image_url = $${paramIndex++}`);
            updateValues.push(background_image_url || null);
        }
        if (background_opacity !== undefined) {
            updateFields.push(`background_opacity = $${paramIndex++}`);
            updateValues.push(parseFloat(background_opacity) || 1.0);
        }
        if (header_image_url !== undefined) {
            updateFields.push(`header_image_url = $${paramIndex++}`);
            updateValues.push(header_image_url || null);
        }
        if (form_logo_url !== undefined) {
            updateFields.push(`form_logo_url = $${paramIndex++}`);
            updateValues.push(form_logo_url || null);
        }
        if (theme_confirmacao !== undefined) {
            // Verificar se a coluna existe antes de atualizar
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'guest_list_items' 
                AND column_name = 'theme_confirmacao'
            `);
            if (columnCheck.rows.length > 0) {
                updateFields.push(`theme_confirmacao = $${paramIndex++}`);
                updateValues.push(theme_confirmacao);
            }
        }
        
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(guestListItemId);
        
        if (updateFields.length > 1) {
            await client.query(`
                UPDATE guest_list_items 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
            `, updateValues);
        }
        
        res.json({ success: true, message: 'Personalização salva com sucesso!' });
    } catch (error) {
        logger.error('Erro ao salvar personalização da confirmação:', error);
        res.status(500).json({ message: 'Erro ao salvar personalização', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/:id/customize-inscricao - Página de personalização da inscrição (formSuccess)
 */
router.get('/:id/customize-inscricao', protectUser, asyncHandler(async (req, res) => {
    const listId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    
    const client = await db.pool.connect();
    try {
        // Buscar dados do formulário (digital_form_items)
        const result = await client.query(`
            SELECT dfi.*, pi.id as profile_item_id, pi.user_id
            FROM digital_form_items dfi
            INNER JOIN profile_items pi ON pi.id = dfi.profile_item_id
            WHERE pi.id = $1 AND pi.user_id = $2
            ORDER BY COALESCE(dfi.updated_at, '1970-01-01'::timestamp) DESC, dfi.id DESC
            LIMIT 1
        `, [listId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Formulário não encontrado',
                title: 'Erro'
            });
        }
        
        const formData = result.rows[0];
        
        // Buscar profile_slug do usuário para construir URL de preview
        const userSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = userSlugRes.rows[0]?.profile_slug || userId;
        
        // Garantir valores padrão
        if (!formData.primary_color) formData.primary_color = '#4A90E2';
        if (!formData.secondary_color) formData.secondary_color = '#6BA3F0';
        if (!formData.background_color) formData.background_color = '#FFFFFF';
        if (!formData.background_opacity) formData.background_opacity = 1.0;
        
        res.render('guestListCustomizeInscricao', {
            formData,
            profileItemId: listId,
            profileSlug: profileSlug
        });
    } catch (error) {
        logger.error('Erro ao carregar página de personalização da inscrição:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/guest-lists/:id/customize-inscricao - Salvar personalização da inscrição
 */
router.put('/:id/customize-inscricao', protectUser, asyncHandler(async (req, res) => {
    const listId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    
    const client = await db.pool.connect();
    try {
        // Verificar se o formulário pertence ao usuário
        const checkResult = await client.query(`
            SELECT dfi.id, pi.user_id
            FROM digital_form_items dfi
            INNER JOIN profile_items pi ON pi.id = dfi.profile_item_id
            WHERE pi.id = $1 AND pi.user_id = $2
            ORDER BY COALESCE(dfi.updated_at, '1970-01-01'::timestamp) DESC, dfi.id DESC
            LIMIT 1
        `, [listId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Formulário não encontrado' });
        }
        
        const formItemId = checkResult.rows[0].id;
        
        const {
            primary_color,
            secondary_color,
            background_color,
            background_image_url,
            background_opacity
        } = req.body;
        
        // Construir query dinamicamente
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (primary_color !== undefined) {
            updateFields.push(`primary_color = $${paramIndex++}`);
            updateValues.push(primary_color || '#4A90E2');
        }
        if (secondary_color !== undefined) {
            updateFields.push(`secondary_color = $${paramIndex++}`);
            updateValues.push(secondary_color || '#6BA3F0');
        }
        if (background_color !== undefined) {
            // Verificar se coluna existe
            const colorColumnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'digital_form_items' AND column_name = 'background_color'
            `);
            if (colorColumnCheck.rows.length > 0) {
                updateFields.push(`background_color = $${paramIndex++}`);
                updateValues.push(background_color || '#FFFFFF');
            }
        }
        if (background_image_url !== undefined) {
            updateFields.push(`background_image_url = $${paramIndex++}`);
            updateValues.push(background_image_url || null);
        }
        if (background_opacity !== undefined) {
            updateFields.push(`background_opacity = $${paramIndex++}`);
            updateValues.push(background_opacity !== undefined ? parseFloat(background_opacity) : 1.0);
        }
        
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(formItemId);
        
        if (updateFields.length > 1) {
            await client.query(`
                UPDATE digital_form_items 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
            `, updateValues);
        }
        
        res.json({ success: true, message: 'Personalização salva com sucesso!' });
    } catch (error) {
        logger.error('Erro ao salvar personalização da inscrição:', error);
        res.status(500).json({ message: 'Erro ao salvar personalização', error: error.message });
    } finally {
        client.release();
    }
}));

module.exports = router;
