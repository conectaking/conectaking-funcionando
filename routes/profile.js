const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 20, g: 20, b: 23 };
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 20, g: 20, b: 23 };
}

router.get('/', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const profileQuery = `
            SELECT 
                u.id, u.email, u.profile_slug,
                p.display_name, p.bio, p.profile_image_url, 
                COALESCE(p.avatar_format, 'circular') as avatar_format, 
                p.font_family,
                p.background_color, p.text_color, p.button_color, p.button_text_color,
                p.button_opacity, p.button_border_radius, p.button_content_align,
                p.background_type, p.background_image_url,
                p.card_background_color, p.card_opacity,
                p.button_font_size, p.background_image_opacity,
                p.show_vcard_button
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = $1;
        `;
        const profileRes = await client.query(profileQuery, [userId]);

        if (profileRes.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        // Buscar TODOS os itens (ativos e inativos) para o dashboard
        const itemsRes = await client.query('SELECT * FROM profile_items WHERE user_id = $1 ORDER BY display_order ASC', [userId]);
        
        const details = profileRes.rows[0];
        details.button_color_rgb = hexToRgb(details.button_color);
        details.card_color_rgb = hexToRgb(details.card_background_color);

        const fullProfile = {
            details: details,
            items: itemsRes.rows || []
        };
        
        res.json(fullProfile);

    } catch (error) {
        console.error("Erro ao buscar perfil completo:", error);
        // Se o erro for relacionado à coluna avatar_format não existir, tentar novamente sem ela
        if (error.message && error.message.includes('avatar_format')) {
            try {
                const fallbackQuery = `
                    SELECT 
                        u.id, u.email, u.profile_slug,
                        p.display_name, p.bio, p.profile_image_url, p.font_family,
                        p.background_color, p.text_color, p.button_color, p.button_text_color,
                        p.button_opacity, p.button_border_radius, p.button_content_align,
                        p.background_type, p.background_image_url,
                        p.card_background_color, p.card_opacity,
                        p.button_font_size, p.background_image_opacity,
                        p.show_vcard_button
                    FROM users u
                    LEFT JOIN user_profiles p ON u.id = p.user_id
                    WHERE u.id = $1;
                `;
                const fallbackRes = await client.query(fallbackQuery, [userId]);
                if (fallbackRes.rows.length > 0) {
                    const details = fallbackRes.rows[0];
                    details.avatar_format = 'circular'; // Valor padrão
                    details.button_color_rgb = hexToRgb(details.button_color);
                    details.card_color_rgb = hexToRgb(details.card_background_color);
                    const itemsRes = await client.query('SELECT * FROM profile_items WHERE user_id = $1 ORDER BY display_order ASC', [userId]);
                    return res.json({
                        details: details,
                        items: itemsRes.rows || []
                    });
                }
            } catch (fallbackError) {
                console.error("Erro no fallback:", fallbackError);
            }
        }
        res.status(500).json({ message: 'Erro ao buscar dados do perfil.' });
    } finally {
        client.release();
    }
});

// PUT /api/profile/save-all - Salvar todas as alterações do perfil (detalhes + itens)
router.put('/save-all', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user.userId;
        const { details, items } = req.body;

        console.log('💾 Salvando todas as alterações do perfil:', { userId, hasDetails: !!details, itemsCount: items?.length || 0 });

        // Salvar detalhes do perfil
        if (details) {
            // Verificar se o perfil existe (user_id é a chave primária, não precisa selecionar id)
            const checkProfile = await client.query(
                'SELECT user_id FROM user_profiles WHERE user_id = $1',
                [userId]
            );

            if (checkProfile.rows.length === 0) {
                // Verificar se a coluna avatar_format existe antes de tentar inserir
                const columnCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'user_profiles' 
                        AND column_name = 'avatar_format'
                    ) AS coluna_existe
                `);
                const hasAvatarFormat = columnCheck.rows[0]?.coluna_existe;
                const avatarFormatValue = details.avatar_format || details.avatarFormat || 'circular';

                const insertFields = [
                    'user_id', 'display_name', 'bio', 'profile_image_url', 'font_family',
                    'background_color', 'text_color', 'button_color', 'button_text_color',
                    'button_opacity', 'button_border_radius', 'button_content_align',
                    'background_type', 'background_image_url',
                    'card_background_color', 'card_opacity',
                    'button_font_size', 'background_image_opacity',
                    'show_vcard_button'
                ];
                const insertValues = [
                    userId,
                    details.display_name || details.displayName || null,
                    details.bio || null,
                    details.profile_image_url || details.profileImageUrl || null,
                    details.font_family || details.fontFamily || null,
                    details.background_color || details.backgroundColor || null,
                    details.text_color || details.textColor || null,
                    details.button_color || details.buttonColor || null,
                    details.button_text_color || details.buttonTextColor || null,
                    details.button_opacity || details.buttonOpacity || null,
                    details.button_border_radius || details.buttonBorderRadius || null,
                    details.button_content_align || details.buttonContentAlign || null,
                    details.background_type || details.backgroundType || null,
                    details.background_image_url || details.backgroundImageUrl || null,
                    details.card_background_color || details.cardBackgroundColor || null,
                    details.card_opacity || details.cardOpacity || null,
                    details.button_font_size || details.buttonFontSize || null,
                    details.background_image_opacity || details.backgroundImageOpacity || null,
                    details.show_vcard_button !== undefined ? details.show_vcard_button : (details.showVcardButton !== undefined ? details.showVcardButton : true)
                ];

                if (hasAvatarFormat) {
                    insertFields.push('avatar_format');
                    insertValues.push(avatarFormatValue);
                }

                const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
                await client.query(`
                    INSERT INTO user_profiles (${insertFields.join(', ')})
                    VALUES (${placeholders})
                `, insertValues);
            } else {
                // Atualizar perfil existente
                // Verificar se a coluna avatar_format existe antes de tentar atualizar
                const columnCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'user_profiles' 
                        AND column_name = 'avatar_format'
                    ) AS coluna_existe
                `);
                const hasAvatarFormat = columnCheck.rows[0]?.coluna_existe;

                const avatarFormatValue = details.avatar_format || details.avatarFormat;
                const updateFields = [
                    'display_name = COALESCE($1, display_name)',
                    'bio = COALESCE($2, bio)',
                    'profile_image_url = COALESCE($3, profile_image_url)',
                    'font_family = COALESCE($4, font_family)',
                    'background_color = COALESCE($5, background_color)',
                    'text_color = COALESCE($6, text_color)',
                    'button_color = COALESCE($7, button_color)',
                    'button_text_color = COALESCE($8, button_text_color)',
                    'button_opacity = COALESCE($9, button_opacity)',
                    'button_border_radius = COALESCE($10, button_border_radius)',
                    'button_content_align = COALESCE($11, button_content_align)',
                    'background_type = COALESCE($12, background_type)',
                    'background_image_url = COALESCE($13, background_image_url)',
                    'card_background_color = COALESCE($14, card_background_color)',
                    'card_opacity = COALESCE($15, card_opacity)',
                    'button_font_size = COALESCE($16, button_font_size)',
                    'background_image_opacity = COALESCE($17, background_image_opacity)',
                    'show_vcard_button = COALESCE($18, show_vcard_button)'
                ];
                const updateValues = [
                    details.display_name || details.displayName || null,
                    details.bio || null,
                    details.profile_image_url || details.profileImageUrl || null,
                    details.font_family || details.fontFamily || null,
                    details.background_color || details.backgroundColor,
                    details.text_color || details.textColor,
                    details.button_color || details.buttonColor,
                    details.button_text_color || details.buttonTextColor,
                    details.button_opacity || details.buttonOpacity,
                    details.button_border_radius || details.buttonBorderRadius,
                    details.button_content_align || details.buttonContentAlign,
                    details.background_type || details.backgroundType,
                    details.background_image_url || details.backgroundImageUrl,
                    details.card_background_color || details.cardBackgroundColor,
                    details.card_opacity || details.cardOpacity,
                    details.button_font_size || details.buttonFontSize,
                    details.background_image_opacity || details.backgroundImageOpacity,
                    details.show_vcard_button !== undefined ? details.show_vcard_button : (details.showVcardButton !== undefined ? details.showVcardButton : undefined)
                ];

                if (hasAvatarFormat && avatarFormatValue) {
                    updateFields.push('avatar_format = COALESCE($19, avatar_format)');
                    updateValues.push(avatarFormatValue);
                }

                updateValues.push(userId);
                const paramIndex = updateValues.length;

                await client.query(`
                    UPDATE user_profiles SET
                        ${updateFields.join(', ')}
                    WHERE user_id = $${paramIndex}
                `, updateValues);
            }

            // Atualizar profile_slug na tabela users se fornecido
            if (details.profile_slug || details.profileSlug) {
                await client.query(
                    'UPDATE users SET profile_slug = $1 WHERE id = $2',
                    [details.profile_slug || details.profileSlug, userId]
                );
            }
        }

        // Salvar itens do perfil
        if (items && Array.isArray(items)) {
            // Verificar quais colunas existem na tabela profile_items
            const columnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'profile_items'
            `);
            const existingColumns = columnsCheck.rows.map(row => row.column_name);
            
            // Deletar todos os itens existentes do usuário
            await client.query('DELETE FROM profile_items WHERE user_id = $1', [userId]);
            console.log(`🗑️ Todos os itens do usuário ${userId} foram deletados`);

            console.log(`💾 Salvando ${items.length} itens para o usuário ${userId}`);
            
            // Inserir novos itens (preservando IDs quando fornecidos)
            for (const item of items) {
                console.log(`📝 Salvando item:`, {
                    id: item.id,
                    item_type: item.item_type,
                    title: item.title,
                    is_active: item.is_active,
                    display_order: item.display_order,
                    has_image_url: !!item.image_url,
                    logo_size: item.logo_size
                });
                
                // Verificar se item.id é válido (número e maior que 0)
                const hasValidId = item.id && !isNaN(parseInt(item.id, 10)) && parseInt(item.id, 10) > 0;
                console.log(`🔍 Item tem ID válido? ${hasValidId} (ID: ${item.id})`);
                
                // Normalizar destination_url para carrossel (evitar dupla codificação JSON)
                let normalizedDestinationUrl = item.destination_url || null;
                if (item.item_type === 'carousel' && normalizedDestinationUrl) {
                    try {
                        // Se já for uma string JSON válida, tentar parsear e re-stringify para garantir formato correto
                        const parsed = JSON.parse(normalizedDestinationUrl);
                        if (Array.isArray(parsed)) {
                            normalizedDestinationUrl = JSON.stringify(parsed);
                        } else {
                            // Se não for array, converter para array
                            normalizedDestinationUrl = JSON.stringify([parsed]);
                        }
                    } catch (e) {
                        // Se não for JSON válido, tentar tratar como string simples
                        if (typeof normalizedDestinationUrl === 'string' && !normalizedDestinationUrl.startsWith('[')) {
                            normalizedDestinationUrl = JSON.stringify([normalizedDestinationUrl]);
                        }
                    }
                }
                
                // Se o item tem ID válido, incluir no INSERT para preservar
                const insertFields = hasValidId ? ['id', 'user_id', 'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'] : ['user_id', 'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'];
                const insertValues = hasValidId ? [
                    parseInt(item.id, 10), // Preservar ID original (garantir que é número)
                    userId,
                    item.item_type,
                    item.title || null,
                    normalizedDestinationUrl,
                    item.image_url || null,
                    item.icon_class || null,
                    item.display_order !== undefined ? item.display_order : 0,
                    item.is_active !== undefined ? item.is_active : true
                ] : [
                    userId,
                    item.item_type,
                    item.title || null,
                    normalizedDestinationUrl,
                    item.image_url || null,
                    item.icon_class || null,
                    item.display_order !== undefined ? item.display_order : 0,
                    item.is_active !== undefined ? item.is_active : true
                ];
                
                // Adicionar campos opcionais apenas se as colunas existirem
                if (existingColumns.includes('pix_key')) {
                    insertFields.push('pix_key');
                    insertValues.push(item.pix_key || null);
                }
                if (existingColumns.includes('recipient_name')) {
                    insertFields.push('recipient_name');
                    insertValues.push(item.recipient_name || null);
                }
                if (existingColumns.includes('pix_amount')) {
                    insertFields.push('pix_amount');
                    insertValues.push(item.pix_amount || null);
                }
                if (existingColumns.includes('pix_description')) {
                    insertFields.push('pix_description');
                    insertValues.push(item.pix_description || null);
                }
                if (existingColumns.includes('pdf_url')) {
                    insertFields.push('pdf_url');
                    insertValues.push(item.pdf_url || null);
                }
                if (existingColumns.includes('logo_size')) {
                    insertFields.push('logo_size');
                    insertValues.push(item.logo_size || null);
                }
                if (existingColumns.includes('whatsapp_message')) {
                    insertFields.push('whatsapp_message');
                    insertValues.push(item.whatsapp_message || null);
                }
                if (existingColumns.includes('aspect_ratio')) {
                    insertFields.push('aspect_ratio');
                    insertValues.push(item.aspect_ratio || null);
                }
                
                const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
                
                // Declarar insertedId fora do try para que possa ser usada depois
                let insertedId = null;
                
                try {
                    // Se estamos preservando um ID, precisamos atualizar a sequência do PostgreSQL ANTES do INSERT
                    if (hasValidId) {
                        const itemIdInt = parseInt(item.id, 10);
                        console.log(`🔄 Atualizando sequência para ID: ${itemIdInt}`);
                        // Atualizar a sequência para o próximo valor após o ID inserido
                        await client.query(`
                            SELECT setval('profile_items_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM profile_items), 0), $1), true)
                        `, [itemIdInt]);
                        console.log(`✅ Sequência atualizada para ${itemIdInt}`);
                    }
                    
                    console.log(`💾 Executando INSERT com campos: ${insertFields.join(', ')}`);
                    console.log(`💾 Valores:`, insertValues);
                    
                    const result = await client.query(`
                        INSERT INTO profile_items (${insertFields.join(', ')})
                        VALUES (${placeholders})
                        RETURNING id, user_id, item_type
                    `, insertValues);
                    
                    insertedId = result.rows[0].id;
                    const insertedUserId = result.rows[0].user_id;
                    const insertedItemType = result.rows[0].item_type;
                    
                    console.log(`✅ Item inserido com sucesso!`);
                    console.log(`   - ID: ${insertedId} (original: ${item.id || 'novo'})`);
                    console.log(`   - User ID: ${insertedUserId} (esperado: ${userId})`);
                    console.log(`   - Tipo: ${insertedItemType}`);
                    
                    // Se o ID inserido não corresponde ao original, logar aviso
                    if (hasValidId && insertedId !== parseInt(item.id, 10)) {
                        console.warn(`⚠️ ID não preservado! Esperado: ${item.id}, Inserido: ${insertedId}`);
                    }
                    
                    // Verificar se o item foi realmente inserido
                    const verifyResult = await client.query(
                        'SELECT id, user_id FROM profile_items WHERE id = $1 AND user_id = $2',
                        [insertedId, userId]
                    );
                    console.log(`🔍 Verificação pós-insert: ${verifyResult.rows.length} registro(s) encontrado(s)`);
                    
                } catch (insertError) {
                    console.error(`❌ Erro ao inserir item ${item.id || 'novo'}:`, insertError);
                    console.error(`   - Código: ${insertError.code}`);
                    console.error(`   - Mensagem: ${insertError.message}`);
                    throw insertError; // Re-throw para que a transação seja revertida
                }
                
                // Se for sales_page e o item foi criado/recriado, garantir que existe registro na tabela sales_pages
                if (item.item_type === 'sales_page' && insertedId) {
                    // Usar a mesma conexão da transação para garantir consistência
                    const salesPageCheck = await client.query(
                        'SELECT id FROM sales_pages WHERE profile_item_id = $1',
                        [insertedId]
                    );
                    
                    if (salesPageCheck.rows.length === 0) {
                        console.log(`⚠️ Sales page não encontrada para item ${insertedId}, criando...`);
                        const salesPageService = require('../modules/salesPage/salesPage.service');
                        const crypto = require('crypto');
                        
                        try {
                            const salesPageData = {
                                profile_item_id: insertedId,
                                store_title: item.title || 'Minha Loja',
                                button_text: item.title || 'Minha Loja',
                                button_logo_url: item.image_url || null,
                                whatsapp_number: '', // String vazia (NOT NULL no banco)
                                theme: 'dark',
                                status: 'DRAFT'
                            };

                            // Gerar preview_token
                            salesPageData.preview_token = crypto.randomBytes(32).toString('hex');
                            
                            await salesPageService.create(salesPageData);
                            console.log(`✅ Página de vendas criada para item ${insertedId}`);
                        } catch (error) {
                            console.error(`❌ Erro ao criar página de vendas para item ${insertedId}:`, error);
                            console.error(`   - Stack: ${error.stack}`);
                            // Não falhar a criação do item se falhar criar a página
                            // Mas logar o erro para debug
                        }
                    } else {
                        console.log(`✅ Sales page já existe para item ${insertedId} (ID: ${salesPageCheck.rows[0].id})`);
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log('✅ Todas as alterações salvas com sucesso');
        res.json({ message: 'Alterações salvas com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Erro ao salvar alterações:', error);
        console.error('Stack trace:', error.stack);
        throw error; // Deixar asyncHandler tratar o erro
    } finally {
        client.release();
    }
}));

// ===========================================
// ROTAS PARA GERENCIAR ITENS (ITEMS) - ROTAS ESPECÍFICAS PRIMEIRO
// ===========================================

// DELETE /api/profile/items/:id - Deletar item (DEVE VIR ANTES DAS ROTAS DE PRODUTOS PARA EVITAR CONFLITO)
router.delete('/items/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        console.log(`🗑️ Tentando deletar item ${itemId} para usuário ${userId}`);

        // Verificar se o item pertence ao usuário
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (checkRes.rows.length === 0) {
            console.log(`❌ Item ${itemId} não encontrado ou não pertence ao usuário ${userId}`);
            return res.status(404).json({ message: 'Item não encontrado ou você não tem permissão para removê-lo.' });
        }

        // Deletar produtos do catálogo se for product_catalog
        if (checkRes.rows[0].item_type === 'product_catalog') {
            await client.query('DELETE FROM product_catalog_items WHERE profile_item_id = $1', [itemId]);
            console.log(`🗑️ Produtos do catálogo ${itemId} deletados`);
        }
        
        if (checkRes.rows[0].item_type === 'sales_page') {
            await client.query('DELETE FROM sales_pages WHERE profile_item_id = $1', [itemId]);
            console.log(`🗑️ Página de vendas ${itemId} deletada`);
        }

        // Deletar o item
        await client.query('DELETE FROM profile_items WHERE id = $1 AND user_id = $2', [itemId, userId]);
        console.log(`✅ Item ${itemId} deletado com sucesso`);
        
        res.json({ message: 'Item removido com sucesso!' });
    } catch (error) {
        console.error("❌ Erro ao deletar item:", error);
        res.status(500).json({ message: 'Erro ao deletar item.', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
        client.release();
    }
}));

// ===========================================
// ROTAS PARA GERENCIAR ITENS (ITEMS) - CONTINUAÇÃO
// ===========================================

// GET /api/profile/items - Listar todos os itens do usuário
router.get('/items', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const result = await client.query(
            'SELECT * FROM profile_items WHERE user_id = $1 ORDER BY display_order ASC',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar itens:", error);
        res.status(500).json({ message: 'Erro ao buscar itens.' });
    } finally {
        client.release();
    }
}));

// GET /api/profile/items/:id - Buscar item específico (DEVE VIR ANTES DO router.use)
router.get('/items/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);

        console.log(`📥 GET /api/profile/items/:id - userId: ${userId}, itemId: ${itemId}`);

        if (!itemId || isNaN(itemId)) {
            console.log(`❌ ID do item inválido: ${req.params.id}`);
            return res.status(400).json({ success: false, error: 'ID do item inválido.' });
        }

        // Primeiro verificar se o item existe (sem filtro de user_id para debug)
        const checkExists = await client.query(
            'SELECT id, user_id, item_type FROM profile_items WHERE id = $1',
            [itemId]
        );

        if (checkExists.rows.length === 0) {
            console.log(`❌ Item ${itemId} não existe no banco de dados`);
            return res.status(404).json({ success: false, error: 'Item não encontrado.' });
        }

        // Verificar se pertence ao usuário
        const result = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        console.log(`🔍 Resultado da busca: ${result.rows.length} item(s) encontrado(s)`);
        console.log(`🔍 Item existe? ${checkExists.rows.length > 0 ? 'Sim' : 'Não'}`);
        if (checkExists.rows.length > 0) {
            console.log(`🔍 Item pertence ao usuário ${checkExists.rows[0].user_id}, usuário atual: ${userId}`);
        }

        if (result.rows.length === 0) {
            console.log(`❌ Item ${itemId} não encontrado para usuário ${userId}`);
            // Se o item existe mas não pertence ao usuário, retornar erro de permissão
            if (checkExists.rows.length > 0 && checkExists.rows[0].user_id !== userId) {
                return res.status(403).json({ success: false, error: 'Você não tem permissão para acessar este item.' });
            }
            return res.status(404).json({ success: false, error: 'Item não encontrado.' });
        }

        // Buscar profile_id do usuário
        const userResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
        const profileId = userResult.rows[0]?.id || userId;

        res.json({ 
            success: true, 
            data: {
                ...result.rows[0],
                profile_id: profileId
            }
        });
    } catch (error) {
        console.error("Erro ao buscar item:", error);
        res.status(500).json({ success: false, error: 'Erro ao buscar item.' });
    } finally {
        client.release();
    }
}));

// POST /api/profile/items - Criar novo item
router.post('/items', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { item_type, title, destination_url, icon_class, pix_key, recipient_name, pix_amount, pix_description, pdf_url, aspect_ratio, image_url, logo_size } = req.body;

        if (!item_type) {
            return res.status(400).json({ message: 'Tipo de item é obrigatório.' });
        }

        // Obter próxima ordem
        const orderResult = await client.query(
            'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM profile_items WHERE user_id = $1',
            [userId]
        );
        const nextOrder = orderResult.rows[0].next_order;

        // Verificar quais colunas existem na tabela
        const columnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profile_items'
        `);
        const existingColumns = columnsCheck.rows.map(row => row.column_name);

        // Construir campos e valores dinamicamente
        const insertFields = ['user_id', 'item_type', 'display_order', 'is_active'];
        const insertValues = [userId, item_type, nextOrder, true];
        let paramIndex = insertValues.length + 1;

        // Campos padrão que sempre existem
        if (title !== undefined) {
            insertFields.push('title');
            // Se title for vazio/null e for product_catalog, usar nome padrão
            const finalTitle = title || (item_type === 'product_catalog' ? 'Catálogo de Produtos' : null);
            insertValues.push(finalTitle);
            paramIndex++;
        } else if (item_type === 'product_catalog') {
            // Se title não foi fornecido mas é product_catalog, adicionar título padrão
            insertFields.push('title');
            insertValues.push('Catálogo de Produtos');
            paramIndex++;
        }
        if (destination_url !== undefined) {
            insertFields.push('destination_url');
            insertValues.push(destination_url || null);
            paramIndex++;
        }
        if (image_url !== undefined) {
            insertFields.push('image_url');
            insertValues.push(image_url || null);
            paramIndex++;
        }
        if (icon_class !== undefined) {
            insertFields.push('icon_class');
            insertValues.push(icon_class || null);
            paramIndex++;
        }

        // Campos opcionais (apenas se existirem na tabela)
        const optionalFields = ['pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url', 'logo_size', 'whatsapp_message', 'aspect_ratio'];
        for (const field of optionalFields) {
            if (existingColumns.includes(field) && req.body[field] !== undefined) {
                insertFields.push(field);
                insertValues.push(req.body[field] || null);
                paramIndex++;
            }
        }

        console.log(`💾 Criando novo item para usuário ${userId}:`, { item_type, title, display_order: nextOrder, insertFields });
        
        const placeholders = insertFields.map((_, i) => `$${i + 1}`).join(', ');
        const result = await client.query(
            `INSERT INTO profile_items (${insertFields.join(', ')})
             VALUES (${placeholders})
             RETURNING *`,
            insertValues
        );

        const newItem = result.rows[0];

        // Se for sales_page, criar registro na tabela sales_pages
        if (item_type === 'sales_page') {
            const salesPageService = require('../modules/salesPage/salesPage.service');
            const crypto = require('crypto');
            
            try {
                const salesPageData = {
                    profile_item_id: newItem.id,
                    store_title: title || 'Minha Loja',
                    button_text: title || 'Minha Loja',
                    button_logo_url: image_url || null,
                    whatsapp_number: req.body.whatsapp_number || '',
                    theme: 'dark',
                    status: 'DRAFT'
                };

                // Gerar preview_token
                salesPageData.preview_token = crypto.randomBytes(32).toString('hex');

                await salesPageService.create(salesPageData);
                console.log(`✅ Página de vendas criada para item ${newItem.id}`);
            } catch (error) {
                console.error("Erro ao criar página de vendas:", error);
                // Não falhar a criação do item se falhar criar a página
            }
        }

        console.log(`✅ Item criado com sucesso:`, newItem);
        res.status(201).json(newItem);
    } catch (error) {
        console.error("Erro ao criar item:", error);
        res.status(500).json({ message: 'Erro ao criar item.', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
        client.release();
    }
}));

// PUT /api/profile/items/:id - Atualizar item
router.put('/items/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = req.params.id;
        const updates = req.body;

        // Verificar se o item pertence ao usuário
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado ou você não tem permissão para editá-lo.' });
        }

        // Verificar quais colunas existem na tabela
        const columnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profile_items'
        `);
        const existingColumns = columnsCheck.rows.map(row => row.column_name);

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        // Campos que sempre existem
        const standardFields = ['title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'];
        for (const field of standardFields) {
            if (updates.hasOwnProperty(field)) {
                updateFields.push(`${field} = $${paramIndex++}`);
                updateValues.push(updates[field]);
            }
        }

        // Campos opcionais (apenas se existirem na tabela)
        const optionalFields = ['pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url', 'logo_size', 'whatsapp_message', 'aspect_ratio'];
        for (const field of optionalFields) {
            if (existingColumns.includes(field) && updates.hasOwnProperty(field)) {
                updateFields.push(`${field} = $${paramIndex++}`);
                updateValues.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }

        updateValues.push(itemId, userId);
        const query = `
            UPDATE profile_items 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
            RETURNING *
        `;
        const result = await client.query(query, updateValues);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao atualizar item:", error);
        res.status(500).json({ message: 'Erro ao atualizar item.' });
    } finally {
        client.release();
    }
}));

// PATCH /api/profile/items/:id - Atualizar item (alternativa ao PUT)
router.patch('/items/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = req.params.id;
        const updates = req.body;

        // Verificar se o item pertence ao usuário
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado ou você não tem permissão para editá-lo.' });
        }

        // Verificar quais colunas existem na tabela
        const columnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profile_items'
        `);
        const existingColumns = columnsCheck.rows.map(row => row.column_name);

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        // Campos que sempre existem
        const standardFields = ['title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'];
        for (const field of standardFields) {
            if (updates.hasOwnProperty(field)) {
                updateFields.push(`${field} = $${paramIndex++}`);
                updateValues.push(updates[field]);
            }
        }

        // Campos opcionais (apenas se existirem na tabela)
        const optionalFields = ['pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url', 'logo_size', 'whatsapp_message', 'aspect_ratio'];
        for (const field of optionalFields) {
            if (existingColumns.includes(field) && updates.hasOwnProperty(field)) {
                updateFields.push(`${field} = $${paramIndex++}`);
                updateValues.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }

        updateValues.push(itemId, userId);
        const query = `
            UPDATE profile_items 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
            RETURNING *
        `;
        const result = await client.query(query, updateValues);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao atualizar item:", error);
        res.status(500).json({ message: 'Erro ao atualizar item.' });
    } finally {
        client.release();
    }
}));


// PUT /api/profile/avatar-format - Atualizar formato do avatar
router.put('/avatar-format', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Verificar se req.body existe e tem avatar_format
        console.log('📝 Recebida requisição PUT /avatar-format:', { 
            userId, 
            bodyExists: !!req.body, 
            bodyType: typeof req.body,
            bodyKeys: req.body ? Object.keys(req.body) : [],
            contentType: req.headers['content-type']
        });
        
        if (!req.body || typeof req.body !== 'object') {
            console.error('❌ req.body está undefined ou inválido:', req.body);
            return res.status(400).json({ message: 'Corpo da requisição inválido.' });
        }
        
        const { avatar_format } = req.body;
        
        console.log('📝 Dados extraídos do body:', { avatar_format, bodyKeys: Object.keys(req.body) });
        
        if (!avatar_format) {
            console.error('❌ avatar_format está vazio ou undefined:', avatar_format);
            return res.status(400).json({ message: 'Formato de avatar não fornecido.' });
        }
        
        if (!['circular', 'square-full', 'square-small'].includes(avatar_format)) {
            console.error('❌ avatar_format inválido:', avatar_format);
            return res.status(400).json({ message: `Formato de avatar inválido: ${avatar_format}. Valores permitidos: circular, square-full, square-small` });
        }
        
        // Verificar se a coluna existe (se não existir, pode ser que a migration não foi executada)
        let columnExists = false;
        try {
            const columnCheck = await client.query(`
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' 
                    AND column_name = 'avatar_format'
                ) AS coluna_existe
            `);
            columnExists = columnCheck.rows[0]?.coluna_existe || false;
        } catch (checkError) {
            console.warn('⚠️ Erro ao verificar coluna avatar_format:', checkError.message);
            // Continuar mesmo se a verificação falhar
        }
        
        if (!columnExists) {
            console.warn('⚠️ Coluna avatar_format não existe. Retornando sucesso sem atualizar.');
            // Retornar sucesso mesmo sem atualizar, para não quebrar o frontend
            // O formato será salvo quando o usuário usar save-all ou quando a migration for executada
            return res.json({ 
                message: 'Formato de avatar registrado localmente. Execute a migration 015 para salvar no banco.',
                avatar_format,
                warning: 'Coluna avatar_format ainda não existe no banco de dados.'
            });
        }
        
        // Garantir que o perfil existe (user_id é a chave primária)
        const checkRes = await client.query(
            'SELECT user_id FROM user_profiles WHERE user_id = $1',
            [userId]
        );
        
        if (checkRes.rows.length === 0) {
            // Criar perfil se não existir
            console.log('📝 Criando novo perfil com avatar_format');
            try {
                await client.query(
                    'INSERT INTO user_profiles (user_id, avatar_format) VALUES ($1, $2)',
                    [userId, avatar_format]
                );
            } catch (insertError) {
                // Se o INSERT falhar por causa da coluna, tentar sem ela
                if (insertError.code === '42703' || insertError.message.includes('avatar_format')) {
                    console.warn('⚠️ Erro ao inserir avatar_format, criando perfil sem ele');
                    await client.query(
                        'INSERT INTO user_profiles (user_id) VALUES ($1)',
                        [userId]
                    );
                    return res.json({ 
                        message: 'Perfil criado. Execute a migration 015 para habilitar formato de avatar.',
                        avatar_format,
                        warning: 'Coluna avatar_format não existe ainda.'
                    });
                }
                throw insertError;
            }
        } else {
            // Atualizar perfil existente
            console.log('📝 Atualizando avatar_format do perfil existente');
            try {
                const updateResult = await client.query(
                    'UPDATE user_profiles SET avatar_format = $1 WHERE user_id = $2',
                    [avatar_format, userId]
                );
                console.log('✅ Update executado:', updateResult.rowCount, 'linha(s) atualizada(s)');
            } catch (updateError) {
                // Se o UPDATE falhar por causa da coluna, retornar aviso mas não erro
                if (updateError.code === '42703' || updateError.message.includes('avatar_format')) {
                    console.warn('⚠️ Erro ao atualizar avatar_format, coluna não existe');
                    return res.json({ 
                        message: 'Formato registrado localmente. Execute a migration 015 para salvar no banco.',
                        avatar_format,
                        warning: 'Coluna avatar_format não existe ainda.'
                    });
                }
                throw updateError;
            }
        }
        
        console.log('✅ Formato de avatar atualizado com sucesso');
        res.json({ message: 'Formato de avatar atualizado com sucesso.', avatar_format });
    } catch (error) {
        console.error('❌ Erro ao atualizar formato de avatar:', error);
        console.error('❌ Detalhes do erro:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint
        });
        res.status(500).json({ 
            message: 'Erro ao atualizar formato de avatar.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

// Rota de reparo: Criar sales_pages para itens sales_page que não têm
router.post('/items/repair-sales-pages', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        console.log(`🔧 Iniciando reparo de sales_pages para usuário ${userId}`);
        
        // Buscar todos os itens sales_page do usuário que não têm sales_page associada
        const itemsWithoutSalesPage = await client.query(`
            SELECT pi.id, pi.title, pi.image_url, pi.user_id
            FROM profile_items pi
            LEFT JOIN sales_pages sp ON pi.id = sp.profile_item_id
            WHERE pi.user_id = $1 
            AND pi.item_type = 'sales_page'
            AND sp.id IS NULL
        `, [userId]);
        
        console.log(`📊 Encontrados ${itemsWithoutSalesPage.rows.length} itens sales_page sem sales_page associada`);
        
        if (itemsWithoutSalesPage.rows.length === 0) {
            return res.json({ 
                success: true, 
                message: 'Todos os itens sales_page já têm sales_page associada',
                created: 0,
                total: 0
            });
        }
        
        const salesPageService = require('../modules/salesPage/salesPage.service');
        const crypto = require('crypto');
        let created = 0;
        const errors = [];
        
        for (const item of itemsWithoutSalesPage.rows) {
            try {
                const salesPageData = {
                    profile_item_id: item.id,
                    store_title: item.title || 'Minha Loja',
                    button_text: item.title || 'Minha Loja',
                    button_logo_url: item.image_url || null,
                    whatsapp_number: '', // String vazia (NOT NULL no banco)
                    theme: 'dark',
                    status: 'DRAFT'
                };

                // Gerar preview_token
                salesPageData.preview_token = crypto.randomBytes(32).toString('hex');
                
                await salesPageService.create(salesPageData);
                console.log(`✅ Página de vendas criada para item ${item.id}`);
                created++;
            } catch (error) {
                console.error(`❌ Erro ao criar página de vendas para item ${item.id}:`, error);
                errors.push({ itemId: item.id, error: error.message });
            }
        }
        
        res.json({
            success: true,
            message: `Reparo concluído. ${created} sales_page(s) criada(s)`,
            created,
            total: itemsWithoutSalesPage.rows.length,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('❌ Erro ao reparar sales_pages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao reparar sales_pages',
            message: error.message 
        });
    } finally {
        client.release();
    }
}));

module.exports = router;

