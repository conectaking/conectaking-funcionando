const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { protectUser } = require('../middleware/protectUser');

/**
 * ROTAS DE LINKS ÚNICOS
 * Sistema separado para links únicos com expiração e limite de uso
 */

/**
 * POST /api/unique-links/:itemId/create
 * Criar um novo link único para um formulário
 */
router.post('/:itemId/create', protectUser, asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    // IMPORTANTE: user_id no banco é VARCHAR (string como "ADRIANO-KING")
    // req.user vem do JWT e deve ter userId ou id
    const userId = req.user.userId || req.user.id || req.user.user_id;
    
    if (!userId) {
        logger.error(`❌ [UNIQUE_LINKS] userId não encontrado em req.user:`, req.user);
        return res.status(401).json({ error: 'Usuário não autenticado corretamente' });
    }

    const { description, expiresInHours = 24, maxUses = 1 } = req.body;

    logger.info(`🔗 [UNIQUE_LINKS] Criando link único para item ${itemId}, userId: ${userId} (tipo: ${typeof userId}), req.user:`, {
        userId: req.user.userId,
        id: req.user.id,
        user_id: req.user.user_id,
        email: req.user.email
    });

    // Validar parâmetros
    if (!itemId) {
        return res.status(400).json({ error: 'itemId é obrigatório' });
    }

    if (maxUses < 1) {
        return res.status(400).json({ error: 'maxUses deve ser pelo menos 1' });
    }

    if (expiresInHours < 1) {
        return res.status(400).json({ error: 'expiresInHours deve ser pelo menos 1' });
    }

    // Verificar se o item existe e pertence ao usuário
    const itemCheck = await db.query(
        'SELECT id, user_id, item_type FROM profile_items WHERE id = $1',
        [itemId]
    );

    if (itemCheck.rows.length === 0) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Item não encontrado: ${itemId}`);
        return res.status(404).json({ error: 'Item não encontrado' });
    }

    const item = itemCheck.rows[0];

    // user_id no banco é VARCHAR (string), então comparar como string
    const itemUserId = String(item.user_id || '').trim();
    const currentUserId = String(userId || '').trim();

    logger.info(`🔍 [UNIQUE_LINKS] Verificando permissão para criar: item.user_id="${itemUserId}" (tipo: ${typeof item.user_id}), userId="${currentUserId}" (tipo: ${typeof userId}), itemId=${itemId}`);

    if (itemUserId !== currentUserId) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Permissão negada ao criar: item.user_id="${itemUserId}", userId="${currentUserId}", itemId=${itemId}`);
        return res.status(403).json({ error: 'Você não tem permissão para criar links para este item' });
    }
    
    logger.info(`✅ [UNIQUE_LINKS] Permissão aprovada para criar link único`);

    // Verificar se o item é um formulário ou lista de convidados
    if (item.item_type !== 'digital_form' && item.item_type !== 'guest_list') {
        return res.status(400).json({ error: 'Links únicos são válidos apenas para formulários ou listas de convidados' });
    }

    // Verificar se a tabela existe
    try {
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'unique_form_links'
            ) as table_exists
        `);
        
        if (!tableCheck.rows[0]?.table_exists) {
            logger.error(`❌ [UNIQUE_LINKS] Tabela unique_form_links não encontrada. Execute a migration 084 primeiro.`);
            return res.status(500).json({ 
                error: 'Tabela de links únicos não encontrada. Execute a migration 084 primeiro.' 
            });
        }
    } catch (tableCheckError) {
        logger.error(`❌ [UNIQUE_LINKS] Erro ao verificar tabela:`, tableCheckError);
        return res.status(500).json({ 
            error: 'Erro ao verificar tabela de links únicos' 
        });
    }

    // Gerar token único
    const token = `unique_${crypto.randomBytes(16).toString('hex')}`;

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(expiresInHours));

    // Inserir link único no banco
    const insertQuery = `
        INSERT INTO unique_form_links 
        (profile_item_id, token, description, expires_at, max_uses, created_by_user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;

    const result = await db.query(insertQuery, [
        itemId,
        token,
        description || null,
        expiresAt,
        maxUses,
        userId
    ]);

    const uniqueLink = result.rows[0];

    logger.info(`✅ [UNIQUE_LINKS] Link único criado: ${token} para item ${itemId}`);

    // Buscar slug do usuário do banco de dados
    // IMPORTANTE: user_id pode ser VARCHAR (string como "ADRIANO-KING") ou INTEGER
    let userSlug = 'user';
    try {
        const userRes = await db.query(
            'SELECT profile_slug FROM users WHERE id = $1 OR id::text = $1',
            [userId]
        );
        userSlug = userRes.rows[0]?.profile_slug || 'user';
    } catch (slugError) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Erro ao buscar slug do usuário ao criar link, usando padrão:`, slugError);
    }

    // Construir URL completa do link
    const baseUrl = process.env.FRONTEND_URL || 'https://tag.conectaking.com.br';
    const fullUrl = `${baseUrl}/${userSlug}/form/share/${token}`;

    res.status(201).json({
        success: true,
        data: {
            ...uniqueLink,
            fullUrl,
            expiresAt: uniqueLink.expires_at
        }
    });
}));

/**
 * GET /api/unique-links/:itemId/list
 * Listar todos os links únicos de um formulário
 */
router.get('/:itemId/list', protectUser, asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    // IMPORTANTE: user_id no banco é VARCHAR (string como "ADRIANO-KING")
    const userId = req.user.userId || req.user.id || req.user.user_id;

    if (!userId) {
        logger.error(`❌ [UNIQUE_LINKS] userId não encontrado em req.user ao listar:`, req.user);
        return res.status(401).json({ error: 'Usuário não autenticado corretamente' });
    }

    logger.info(`🔗 [UNIQUE_LINKS] Listando links únicos para item ${itemId}, userId: ${userId} (tipo: ${typeof userId})`);

    // Verificar se o item existe e pertence ao usuário
    const itemCheck = await db.query(
        'SELECT id, user_id FROM profile_items WHERE id = $1',
        [itemId]
    );

    if (itemCheck.rows.length === 0) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Item não encontrado: ${itemId}`);
        return res.status(404).json({ error: 'Item não encontrado' });
    }

    // user_id no banco é VARCHAR (string), então comparar como string
    const itemUserId = String(itemCheck.rows[0].user_id || '').trim();
    const currentUserId = String(userId || '').trim();

    logger.info(`🔍 [UNIQUE_LINKS] Verificando permissão para listar: item.user_id="${itemUserId}" (tipo: ${typeof itemCheck.rows[0].user_id}), userId="${currentUserId}" (tipo: ${typeof userId}), itemId=${itemId}`);

    if (itemUserId !== currentUserId) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Permissão negada para listar: item.user_id="${itemUserId}", userId="${currentUserId}", itemId=${itemId}`);
        return res.status(403).json({ error: 'Você não tem permissão para ver links deste item' });
    }
    
    logger.info(`✅ [UNIQUE_LINKS] Permissão aprovada para listar links únicos`);

    // Buscar links únicos
    let result;
    try {
        // Verificar se a tabela existe primeiro
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'unique_form_links'
            ) as table_exists
        `);
        
        if (!tableCheck.rows[0]?.table_exists) {
            logger.warn(`⚠️ [UNIQUE_LINKS] Tabela unique_form_links não encontrada. Execute a migration 084 primeiro.`);
            // Retornar array vazio se tabela não existe (sistema ainda não foi migrado)
            return res.json({
                success: true,
                data: []
            });
        }

        const query = `
            SELECT 
                ufl.*,
                g.name as guest_name,
                g.email as guest_email,
                g.whatsapp as guest_whatsapp
            FROM unique_form_links ufl
            LEFT JOIN guests g ON ufl.guest_id = g.id
            WHERE ufl.profile_item_id = $1
            ORDER BY ufl.created_at DESC
        `;

        result = await db.query(query, [itemId]);
    } catch (queryError) {
        logger.error(`❌ [UNIQUE_LINKS] Erro ao buscar links únicos para item ${itemId}:`, {
            error: queryError.message,
            stack: queryError.stack,
            userId: userId
        });
        
        // Se for erro de tabela não existe, retornar array vazio
        if (queryError.message && queryError.message.includes('does not exist')) {
            logger.warn(`⚠️ [UNIQUE_LINKS] Tabela unique_form_links não existe. Execute a migration 084 primeiro.`);
            return res.json({
                success: true,
                data: []
            });
        }
        
        return res.status(500).json({ 
            error: 'Erro ao buscar links únicos',
            details: process.env.NODE_ENV === 'development' ? queryError.message : undefined
        });
    }

    // Buscar slug do usuário do banco de dados
    // IMPORTANTE: user_id pode ser VARCHAR (string como "ADRIANO-KING") ou INTEGER
    let userSlug = 'user';
    try {
        const userRes = await db.query(
            'SELECT profile_slug FROM users WHERE id = $1 OR id::text = $1',
            [userId]
        );
        userSlug = userRes.rows[0]?.profile_slug || 'user';
    } catch (slugError) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Erro ao buscar slug do usuário, usando padrão:`, slugError);
        // Continuar com slug padrão se houver erro
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://tag.conectaking.com.br';

    // Adicionar URL completa e status atualizado
    const links = result.rows.map(link => {
        const fullUrl = `${baseUrl}/${userSlug}/form/share/${link.token}`;
        
        // Verificar status atual
        let status = link.status;
        if (status === 'active' && new Date(link.expires_at) < new Date()) {
            status = 'expired';
        }
        if (status === 'active' && link.current_uses >= link.max_uses) {
            status = 'used';
        }

        return {
            ...link,
            fullUrl,
            status,
            isExpired: new Date(link.expires_at) < new Date(),
            isUsed: link.current_uses >= link.max_uses,
            timeRemaining: new Date(link.expires_at) > new Date() 
                ? Math.max(0, Math.ceil((new Date(link.expires_at) - new Date()) / (1000 * 60 * 60)))
                : 0
        };
    });

    res.json({
        success: true,
        data: links
    });
}));

/**
 * DELETE /api/unique-links/:linkId
 * Desativar um link único
 */
router.delete('/:linkId', protectUser, asyncHandler(async (req, res) => {
    const { linkId } = req.params;
    // IMPORTANTE: user_id no banco é VARCHAR (string como "ADRIANO-KING")
    const userId = req.user.userId || req.user.id || req.user.user_id;

    if (!userId) {
        logger.error(`❌ [UNIQUE_LINKS] userId não encontrado em req.user ao desativar:`, req.user);
        return res.status(401).json({ error: 'Usuário não autenticado corretamente' });
    }

    logger.info(`🔗 [UNIQUE_LINKS] Desativando link único ${linkId}, userId: ${userId} (tipo: ${typeof userId})`);

    // Verificar se o link existe e pertence ao usuário
    const linkCheck = await db.query(`
        SELECT ufl.*, pi.user_id
        FROM unique_form_links ufl
        JOIN profile_items pi ON ufl.profile_item_id = pi.id
        WHERE ufl.id = $1
    `, [linkId]);

    if (linkCheck.rows.length === 0) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Link não encontrado: ${linkId}`);
        return res.status(404).json({ error: 'Link não encontrado' });
    }

    // user_id no banco é VARCHAR (string), então comparar como string
    const linkUserId = String(linkCheck.rows[0].user_id || '').trim();
    const currentUserId = String(userId || '').trim();

    logger.info(`🔍 [UNIQUE_LINKS] Verificando permissão para desativar: link.user_id="${linkUserId}" (tipo: ${typeof linkCheck.rows[0].user_id}), userId="${currentUserId}" (tipo: ${typeof userId}), linkId=${linkId}`);

    if (linkUserId !== currentUserId) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Permissão negada ao desativar: link.user_id="${linkUserId}", userId="${currentUserId}", linkId=${linkId}`);
        return res.status(403).json({ error: 'Você não tem permissão para desativar este link' });
    }
    
    logger.info(`✅ [UNIQUE_LINKS] Permissão aprovada para desativar link`);

    // Desativar link
    await db.query(
        'UPDATE unique_form_links SET status = $1 WHERE id = $2',
        ['deactivated', linkId]
    );

    logger.info(`✅ [UNIQUE_LINKS] Link único ${linkId} desativado`);

    res.json({
        success: true,
        message: 'Link desativado com sucesso'
    });
}));

/**
 * GET /api/unique-links/validate/:token
 * Validar se um token de link único é válido (endpoint público)
 */
router.get('/validate/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;

    logger.info(`🔍 [UNIQUE_LINKS] Validando token: ${token}`);

    // Usar função do banco para validar
    const validationResult = await db.query(
        'SELECT is_unique_link_valid($1) as is_valid',
        [token]
    );

    const isValid = validationResult.rows[0].is_valid;

    if (!isValid) {
        // Buscar motivo da invalidação
        const linkInfo = await db.query(`
            SELECT 
                status,
                expires_at,
                current_uses,
                max_uses
            FROM unique_form_links
            WHERE token = $1
        `, [token]);

        let reason = 'Link inválido';

        if (linkInfo.rows.length === 0) {
            reason = 'Link não encontrado';
        } else {
            const link = linkInfo.rows[0];
            if (link.status === 'used' || link.current_uses >= link.max_uses) {
                reason = 'Link já foi utilizado';
            } else if (link.status === 'expired' || new Date(link.expires_at) < new Date()) {
                reason = 'Link expirou';
            } else if (link.status === 'deactivated') {
                reason = 'Link foi desativado';
            }
        }

        return res.status(400).json({
            success: false,
            valid: false,
            reason
        });
    }

    // Buscar informações do link
    const linkInfo = await db.query(`
        SELECT 
            ufl.*,
            pi.item_type,
            pi.user_id
        FROM unique_form_links ufl
        JOIN profile_items pi ON ufl.profile_item_id = pi.id
        WHERE ufl.token = $1
    `, [token]);

    const link = linkInfo.rows[0];

    res.json({
        success: true,
        valid: true,
        data: {
            token: link.token,
            itemId: link.profile_item_id,
            itemType: link.item_type,
            expiresAt: link.expires_at,
            maxUses: link.max_uses,
            currentUses: link.current_uses,
            timeRemaining: Math.max(0, Math.ceil((new Date(link.expires_at) - new Date()) / (1000 * 60)))
        }
    });
}));

/**
 * POST /api/unique-links/mark-as-used/:token
 * Marcar um link como usado (chamado após cadastro bem-sucedido)
 */
router.post('/mark-as-used/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { guestId } = req.body;

    logger.info(`✅ [UNIQUE_LINKS] Marcando link como usado: ${token}, guestId: ${guestId}`);

    // Usar função do banco para marcar como usado
    try {
        const result = await db.query(
            'SELECT mark_unique_link_as_used($1, $2) as success',
            [token, guestId || null]
        );

        const success = result.rows[0].success;

        if (!success) {
            return res.status(400).json({
                success: false,
                error: 'Link já foi utilizado ou não está mais disponível'
            });
        }

        res.json({
            success: true,
            message: 'Link marcado como usado com sucesso'
        });
    } catch (error) {
        if (error.message === 'Link não encontrado') {
            return res.status(404).json({
                success: false,
                error: 'Link não encontrado'
            });
        }
        throw error;
    }
}));

module.exports = router;
