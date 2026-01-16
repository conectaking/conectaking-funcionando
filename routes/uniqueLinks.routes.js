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

    const { description, expiresInHours = null, expiresInMinutes = null, maxUses = 1, customSlug = null } = req.body;
    
    // Calcular expiresInHours se for fornecido em minutos ou horas
    // Se ambos forem null/undefined, link será criado SEM expiração
    let finalExpiresInHours = null;
    if (expiresInMinutes !== null && expiresInMinutes !== undefined) {
        finalExpiresInHours = expiresInMinutes / 60;
    } else if (expiresInHours !== null && expiresInHours !== undefined) {
        finalExpiresInHours = expiresInHours;
    }
    // Se ambos forem null/undefined, finalExpiresInHours permanece null = sem expiração

    logger.info(`🔗 [UNIQUE_LINKS] Criando link único para item ${itemId}, userId: ${userId} (tipo: ${typeof userId}), validade: ${finalExpiresInHours !== null ? finalExpiresInHours + 'h' : 'SEM EXPIRAÇÃO'}, custom_slug: ${customSlug || 'não informado'}, req.user:`, {
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

    // Se validade for fornecida, validar
    if (finalExpiresInHours !== null && finalExpiresInHours !== undefined) {
        if (finalExpiresInHours < 0.0167) { // Mínimo de 1 minuto (0.0167 horas)
            return res.status(400).json({ error: 'Validade deve ser de pelo menos 1 minuto' });
        }
        
        if (finalExpiresInHours > 8760) { // Máximo de 1 ano (8760 horas)
            return res.status(400).json({ error: 'Validade não pode ser superior a 1 ano' });
        }
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

    // Verificar se a tabela existe - método mais simples e confiável
    let tableExists = false;
    try {
        // Tentar fazer SELECT direto na tabela (método mais confiável)
        try {
            await db.query(`SELECT 1 FROM unique_form_links LIMIT 1`);
            tableExists = true;
            logger.info(`✅ [UNIQUE_LINKS] Tabela unique_form_links existe e é acessível`);
        } catch (directError) {
            // Erro 42P01 = relation "unique_form_links" does not exist
            if (directError.code === '42P01' || (directError.message && directError.message.includes('does not exist'))) {
                tableExists = false;
                logger.error(`❌ [UNIQUE_LINKS] Tabela unique_form_links NÃO existe (erro PostgreSQL 42P01)`);
                logger.error(`❌ [UNIQUE_LINKS] Mensagem: ${directError.message}`);
                
                // Tentar verificar via information_schema para dar mais detalhes
                try {
                    const schemaCheck = await db.query(`
                        SELECT table_name, table_schema 
                        FROM information_schema.tables 
                        WHERE table_name LIKE '%unique%' OR table_name LIKE '%link%'
                        ORDER BY table_schema, table_name
                    `);
                    logger.info(`🔍 [UNIQUE_LINKS] Tabelas similares encontradas:`, schemaCheck.rows);
                } catch (schemaError) {
                    logger.warn(`⚠️ [UNIQUE_LINKS] Não foi possível verificar tabelas similares:`, schemaError.message);
                }
            } else {
                // Outro erro - pode ser problema de permissão, conexão, ou sintaxe
                logger.error(`❌ [UNIQUE_LINKS] Erro ao acessar tabela (não é erro de "não existe"):`, {
                    code: directError.code,
                    message: directError.message,
                    detail: directError.detail
                });
                // Considerar que a tabela existe, mas há problema de acesso
                // Isso evita bloqueios desnecessários se for erro de permissão
                tableExists = true;
                logger.warn(`⚠️ [UNIQUE_LINKS] Assumindo que tabela existe, mas há problema de acesso`);
            }
        }
        
        if (!tableExists) {
            logger.error(`❌ [UNIQUE_LINKS] ============================================`);
            logger.error(`❌ [UNIQUE_LINKS] MIGRATION NECESSÁRIA: Execute a migration 084`);
            logger.error(`❌ [UNIQUE_LINKS] Comando: psql -U seu_usuario -d seu_banco -f migrations/084_create_unique_form_links.sql`);
            logger.error(`❌ [UNIQUE_LINKS] OU execute o script SQL diretamente no seu banco de dados`);
            logger.error(`❌ [UNIQUE_LINKS] ============================================`);
            
            return res.status(500).json({ 
                error: 'Tabela de links únicos não encontrada. Execute a migration 084 primeiro.',
                hint: 'Execute: psql -U seu_usuario -d seu_banco -f migrations/084_create_unique_form_links.sql'
            });
        }
        
    } catch (tableCheckError) {
        logger.error(`❌ [UNIQUE_LINKS] Erro crítico ao verificar tabela:`, {
            error: tableCheckError.message,
            code: tableCheckError.code,
            stack: tableCheckError.stack
        });
        return res.status(500).json({ 
            error: 'Erro ao verificar tabela de links únicos',
            details: process.env.NODE_ENV === 'development' ? tableCheckError.message : undefined
        });
    }

    // Gerar token único
    const token = `unique_${crypto.randomBytes(16).toString('hex')}`;

    // Calcular data de expiração (NULL se não fornecida = link sem expiração)
    let expiresAt = null;
    if (finalExpiresInHours !== null && finalExpiresInHours !== undefined) {
        expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + Math.round(finalExpiresInHours * 60));
        logger.info(`🔗 [UNIQUE_LINKS] Link com expiração: ${finalExpiresInHours}h (${expiresAt.toISOString()})`);
    } else {
        logger.info(`🔗 [UNIQUE_LINKS] Link SEM expiração (válido até ser excluído)`);
    }

    // Validar custom_slug se fornecido
    let finalCustomSlug = null;
    if (customSlug && customSlug.trim()) {
        const slug = customSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (slug.length < 3 || slug.length > 50) {
            return res.status(400).json({ error: 'Slug personalizado deve ter entre 3 e 50 caracteres e conter apenas letras, números e hífens' });
        }
        
        // Verificar se a coluna custom_slug existe
        try {
            // Verificar se o slug já existe
            const slugCheck = await db.query(
                'SELECT id FROM unique_form_links WHERE custom_slug = $1',
                [slug]
            );
            
            if (slugCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Este slug personalizado já está em uso. Escolha outro.' });
            }
            
            finalCustomSlug = slug;
            logger.info(`🔗 [UNIQUE_LINKS] Custom slug validado: "${slug}"`);
        } catch (slugError) {
            // Se erro for de coluna não existe, ignorar custom_slug
            if (slugError.code === '42703' || slugError.message.includes('custom_slug')) {
                logger.warn(`⚠️ [UNIQUE_LINKS] Coluna custom_slug não existe. Execute a migration 088 primeiro. Ignorando custom_slug.`);
                finalCustomSlug = null;
            } else {
                throw slugError;
            }
        }
    }
    
    // Verificar se a coluna custom_slug existe antes de inserir
    let hasCustomSlugColumn = false;
    try {
        const columnCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'unique_form_links'
            AND column_name = 'custom_slug'
        `);
        hasCustomSlugColumn = columnCheck.rows.length > 0;
    } catch (checkError) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Erro ao verificar coluna custom_slug:`, checkError);
    }
    
    // Inserir link único no banco
    const insertFields = ['profile_item_id', 'token', 'description', 'expires_at', 'max_uses', 'created_by_user_id'];
    const insertValues = [itemId, token, description || null, expiresAt, maxUses, userId];
    
    if (hasCustomSlugColumn && finalCustomSlug !== null) {
        insertFields.push('custom_slug');
        insertValues.push(finalCustomSlug);
    }
    
    const insertQuery = `
        INSERT INTO unique_form_links (${insertFields.join(', ')})
        VALUES (${insertFields.map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
    `;

    const result = await db.query(insertQuery, insertValues);

    const uniqueLink = result.rows[0];

    logger.info(`✅ [UNIQUE_LINKS] Link único criado: ${token} para item ${itemId}, custom_slug: ${uniqueLink.custom_slug || 'não informado'}`);

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
    // IMPORTANTE: Se tiver custom_slug, usar APENAS o custom_slug (sem unique_)
    // Se não tiver custom_slug, usar o token (unique_...)
    const urlIdentifier = uniqueLink.custom_slug || token;
    const fullUrl = `${baseUrl}/${userSlug}/form/share/${urlIdentifier}`;
    
    logger.info(`🔗 [UNIQUE_LINKS] URL gerada: ${fullUrl} (custom_slug: ${uniqueLink.custom_slug || 'não usado'}, token: ${token})`);

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
        // Verificar se a tabela existe primeiro - método mais simples (sem erro)
        try {
            await db.query(`SELECT 1 FROM unique_form_links LIMIT 1`);
        } catch (tableError) {
            // Erro 42P01 = relation does not exist
            if (tableError.code === '42P01') {
                logger.warn(`⚠️ [UNIQUE_LINKS] Tabela unique_form_links não encontrada ao listar. Execute a migration 084 primeiro.`);
                // Retornar array vazio se tabela não existe (sistema ainda não foi migrado)
                return res.json({
                    success: true,
                    data: []
                });
            }
            // Outro erro, propagar
            throw tableError;
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
        // IMPORTANTE: Usar custom_slug se existir, senão usar token
        const urlIdentifier = link.custom_slug || link.token;
        const fullUrl = `${baseUrl}/${userSlug}/form/share/${urlIdentifier}`;
        
        // Verificar status atual
        let status = link.status;
        if (status === 'active' && new Date(link.expires_at) < new Date()) {
            status = 'expired';
        }
        if (status === 'active' && link.current_uses >= link.max_uses) {
            status = 'used';
        }

        // Verificar se tem expiração (expires_at pode ser NULL)
        const hasExpiration = link.expires_at !== null && link.expires_at !== undefined;
        const isExpired = hasExpiration ? new Date(link.expires_at) < new Date() : false;
        const timeRemaining = hasExpiration && new Date(link.expires_at) > new Date() 
            ? Math.max(0, Math.ceil((new Date(link.expires_at) - new Date()) / (1000 * 60 * 60)))
            : (hasExpiration ? 0 : null); // null = sem expiração

        return {
            ...link,
            fullUrl,
            status,
            isExpired,
            isUsed: link.current_uses >= link.max_uses,
            timeRemaining,
            hasExpiration
        };
    });

    res.json({
        success: true,
        data: links
    });
}));

/**
 * DELETE /api/unique-links/:linkId
 * Apagar um link único (desativa automaticamente antes de apagar)
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

    logger.info(`🔍 [UNIQUE_LINKS] Verificando permissão para apagar: link.user_id="${linkUserId}" (tipo: ${typeof linkCheck.rows[0].user_id}), userId="${currentUserId}" (tipo: ${typeof userId}), linkId=${linkId}`);

    if (linkUserId !== currentUserId) {
        logger.warn(`⚠️ [UNIQUE_LINKS] Permissão negada ao apagar: link.user_id="${linkUserId}", userId="${currentUserId}", linkId=${linkId}`);
        return res.status(403).json({ error: 'Você não tem permissão para apagar este link' });
    }
    
    logger.info(`✅ [UNIQUE_LINKS] Permissão aprovada para apagar link`);

    // Apagar link (DELETE físico - remove do banco)
    // O banco de dados já tem CASCADE configurado, então remove automaticamente
    await db.query(
        'DELETE FROM unique_form_links WHERE id = $1',
        [linkId]
    );

    logger.info(`✅ [UNIQUE_LINKS] Link único ${linkId} apagado com sucesso`);

    res.json({
        success: true,
        message: 'Link apagado com sucesso'
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
