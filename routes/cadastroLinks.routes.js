const express = require('express');
const router = express.Router();
const db = require('../db');
const { protectUser } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * GET /api/guest-lists/:id/cadastro-links
 * Listar todos os links personalizados de um item
 */
router.get('/:id/cadastro-links', protectUser, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const itemId = parseInt(req.params.id, 10);
    
    if (isNaN(itemId)) {
        return res.status(400).json({ 
            success: false,
            message: 'ID do item inválido' 
        });
    }
    
    const client = await db.pool.connect();
    
    try {
        // Verificar se o item pertence ao usuário
        const itemCheck = await client.query(`
            SELECT gli.id, pi.user_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE pi.id = $1 AND pi.user_id = $2 AND pi.is_active = true
        `, [itemId, userId]);
        
        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Item não encontrado ou você não tem permissão para acessá-lo' 
            });
        }
        
        // Buscar todos os links personalizados
        const result = await client.query(`
            SELECT 
                cl.id,
                cl.slug,
                cl.description,
                cl.expires_at,
                cl.max_uses,
                cl.current_uses,
                cl.created_at,
                CASE 
                    WHEN cl.expires_at IS NOT NULL AND cl.expires_at < NOW() THEN true
                    ELSE false
                END as is_expired,
                CASE 
                    WHEN cl.max_uses != 999999 AND cl.current_uses >= cl.max_uses THEN true
                    ELSE false
                END as is_used
            FROM cadastro_links cl
            WHERE cl.guest_list_item_id = $1
            ORDER BY cl.created_at DESC
        `, [itemCheck.rows[0].id]);
        
        const links = result.rows.map(link => ({
            id: link.id,
            slug: link.slug,
            description: link.description,
            expires_at: link.expires_at,
            max_uses: link.max_uses,
            current_uses: link.current_uses,
            created_at: link.created_at,
            isExpired: link.is_expired,
            isUsed: link.is_used
        }));
        
        res.json({
            success: true,
            data: links
        });
    } catch (error) {
        logger.error('Erro ao listar links personalizados:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao listar links personalizados',
            error: error.message 
        });
    } finally {
        client.release();
    }
}));

/**
 * POST /api/guest-lists/:id/cadastro-links
 * Criar um novo link personalizado
 */
router.post('/:id/cadastro-links', protectUser, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const itemId = parseInt(req.params.id, 10);
    const { slug, description, expiresInHours, expiresInMinutes, maxUses } = req.body;
    
    if (isNaN(itemId)) {
        return res.status(400).json({ 
            success: false,
            message: 'ID do item inválido' 
        });
    }
    
    // Validar slug
    if (!slug || !slug.trim()) {
        return res.status(400).json({ 
            success: false,
            message: 'Slug é obrigatório' 
        });
    }
    
    const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    if (!normalizedSlug || normalizedSlug.length < 3) {
        return res.status(400).json({ 
            success: false,
            message: 'Slug inválido. Use apenas letras minúsculas, números e hífens. Mínimo 3 caracteres.' 
        });
    }
    
    // Validar formato do slug
    if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
        return res.status(400).json({ 
            success: false,
            message: 'Slug inválido. Use apenas letras minúsculas, números e hífens.' 
        });
    }
    
    const client = await db.pool.connect();
    
    try {
        // Verificar se o item pertence ao usuário
        const itemCheck = await client.query(`
            SELECT gli.id, pi.user_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE pi.id = $1 AND pi.user_id = $2 AND pi.is_active = true
        `, [itemId, userId]);
        
        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Item não encontrado ou você não tem permissão para acessá-lo' 
            });
        }
        
        const guestListItemId = itemCheck.rows[0].id;
        
        // Verificar se o slug já existe
        const slugCheck = await client.query(`
            SELECT id FROM cadastro_links WHERE slug = $1
        `, [normalizedSlug]);
        
        if (slugCheck.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Este slug já está em uso. Escolha outro.' 
            });
        }
        
        // Calcular expires_at
        let expiresAt = null;
        if (expiresInHours !== undefined && expiresInHours !== null) {
            expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
        } else if (expiresInMinutes !== undefined && expiresInMinutes !== null) {
            expiresAt = new Date(Date.now() + (expiresInMinutes * 60 * 1000));
        }
        
        // Definir max_uses (null ou 999999 = ilimitado)
        const maxUsesValue = maxUses && maxUses !== 999999 ? parseInt(maxUses) : 999999;
        
        // Criar o link
        const result = await client.query(`
            INSERT INTO cadastro_links (
                guest_list_item_id,
                slug,
                description,
                expires_at,
                max_uses,
                current_uses,
                created_by_user_id
            ) VALUES ($1, $2, $3, $4, $5, 0, $6)
            RETURNING *
        `, [
            guestListItemId,
            normalizedSlug,
            description && description.trim() ? description.trim() : null,
            expiresAt,
            maxUsesValue,
            userId
        ]);
        
        const newLink = result.rows[0];
        
        logger.info(`✅ [CADASTRO_LINKS] Link criado: ${normalizedSlug} para item ${itemId}`);
        
        res.status(201).json({
            success: true,
            data: {
                id: newLink.id,
                slug: newLink.slug,
                description: newLink.description,
                expires_at: newLink.expires_at,
                max_uses: newLink.max_uses,
                current_uses: newLink.current_uses
            }
        });
    } catch (error) {
        logger.error('Erro ao criar link personalizado:', error);
        
        // Verificar se é erro de constraint única
        if (error.code === '23505') {
            return res.status(400).json({ 
                success: false,
                message: 'Este slug já está em uso. Escolha outro.' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Erro ao criar link personalizado',
            error: error.message 
        });
    } finally {
        client.release();
    }
}));

/**
 * DELETE /api/guest-lists/cadastro-links/:linkId
 * Deletar um link personalizado
 */
router.delete('/cadastro-links/:linkId', protectUser, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const linkId = parseInt(req.params.linkId, 10);
    
    if (isNaN(linkId)) {
        return res.status(400).json({ 
            success: false,
            message: 'ID do link inválido' 
        });
    }
    
    const client = await db.pool.connect();
    
    try {
        // Verificar se o link pertence a um item do usuário
        const linkCheck = await client.query(`
            SELECT cl.id, pi.user_id
            FROM cadastro_links cl
            INNER JOIN guest_list_items gli ON gli.id = cl.guest_list_item_id
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE cl.id = $1 AND pi.user_id = $2
        `, [linkId, userId]);
        
        if (linkCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Link não encontrado ou você não tem permissão para deletá-lo' 
            });
        }
        
        // Deletar o link
        await client.query(`
            DELETE FROM cadastro_links WHERE id = $1
        `, [linkId]);
        
        logger.info(`✅ [CADASTRO_LINKS] Link deletado: ${linkId}`);
        
        res.json({
            success: true,
            message: 'Link deletado com sucesso'
        });
    } catch (error) {
        logger.error('Erro ao deletar link personalizado:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao deletar link personalizado',
            error: error.message 
        });
    } finally {
        client.release();
    }
}));

module.exports = router;
