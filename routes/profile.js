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

            console.log(`💾 Salvando ${items.length} itens para o usuário ${userId}`);
            
            // Inserir novos itens
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
                
                const insertFields = ['user_id', 'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'];
                const insertValues = [
                    userId,
                    item.item_type,
                    item.title || null,
                    item.destination_url || null,
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
                await client.query(`
                    INSERT INTO profile_items (${insertFields.join(', ')})
                    VALUES (${placeholders})
                `, insertValues);
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
// ROTAS DE PRODUTOS (DEVEM VIR ANTES DAS ROTAS DE ITEMS)
// ===========================================
// Importar e montar rotas de produtos ANTES das rotas de items
const productsRouter = require('./products');
router.use('/', productsRouter);

// ===========================================
// ROTAS PARA GERENCIAR ITENS (ITEMS)
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

// POST /api/profile/items - Criar novo item
router.post('/items', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { item_type } = req.body;

        if (!item_type) {
            return res.status(400).json({ message: 'Tipo de item é obrigatório.' });
        }

        // Obter próxima ordem
        const orderResult = await client.query(
            'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM profile_items WHERE user_id = $1',
            [userId]
        );
        const nextOrder = orderResult.rows[0].next_order;

        const result = await client.query(
            `INSERT INTO profile_items (user_id, item_type, display_order, is_active)
             VALUES ($1, $2, $3, true)
             RETURNING *`,
            [userId, item_type, nextOrder]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao criar item:", error);
        res.status(500).json({ message: 'Erro ao criar item.' });
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

// DELETE /api/profile/items/:id - Deletar item
router.delete('/items/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = req.params.id;

        // Verificar se o item pertence ao usuário
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado ou você não tem permissão para removê-lo.' });
        }

        await client.query('DELETE FROM profile_items WHERE id = $1 AND user_id = $2', [itemId, userId]);
        res.json({ message: 'Item removido com sucesso!' });
    } catch (error) {
        console.error("Erro ao deletar item:", error);
        res.status(500).json({ message: 'Erro ao deletar item.' });
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

module.exports = router;

