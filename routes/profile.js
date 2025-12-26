const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');

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

// ===========================================
// ROTAS PARA GERENCIAR ABAS (TABS)
// ===========================================

// GET /api/profile/tabs - Listar todas as abas do usuário
router.get('/tabs', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const result = await client.query(
            'SELECT * FROM profile_tabs WHERE user_id = $1 ORDER BY display_order ASC',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        // Se a tabela não existir (erro 42P01), retornar array vazio
        if (error.code === '42P01') {
            console.log("Tabela profile_tabs não existe ainda, retornando array vazio");
            return res.json([]);
        }
        console.error("Erro ao buscar abas:", error);
        res.status(500).json({ message: 'Erro ao buscar abas.' });
    } finally {
        client.release();
    }
});

// POST /api/profile/tabs - Criar nova aba
router.post('/tabs', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { tab_name, tab_icon, content_type, content_data } = req.body;

        if (!tab_name) {
            return res.status(400).json({ message: 'O nome da aba é obrigatório.' });
        }

        // Obter próxima ordem
        const orderResult = await client.query(
            'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM profile_tabs WHERE user_id = $1',
            [userId]
        );
        const nextOrder = orderResult.rows[0].next_order;

        const result = await client.query(
            `INSERT INTO profile_tabs (user_id, tab_name, tab_icon, display_order, content_type, content_data)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, tab_name, tab_icon || null, nextOrder, content_type || 'modules', content_data ? JSON.stringify(content_data) : null]
        );

        res.status(201).json({ message: 'Aba criada com sucesso!', tab: result.rows[0] });
    } catch (error) {
        // Se a tabela não existir (erro 42P01), retornar erro específico
        if (error.code === '42P01') {
            console.log("Tabela profile_tabs não existe ainda");
            return res.status(503).json({ message: 'Funcionalidade de abas não está disponível ainda. A tabela ainda não foi criada.' });
        }
        console.error("Erro ao criar aba:", error);
        res.status(500).json({ message: 'Erro ao criar aba.' });
    } finally {
        client.release();
    }
});

// PUT /api/profile/tabs/:tabId - Atualizar aba
router.put('/tabs/:tabId', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { tabId } = req.params;
        const { tab_name, tab_icon, content_type, content_data, is_active } = req.body;

        // Verificar se a aba pertence ao usuário
        let checkRes;
        try {
            checkRes = await client.query(
                'SELECT * FROM profile_tabs WHERE id = $1 AND user_id = $2',
                [tabId, userId]
            );
        } catch (checkError) {
            // Se a tabela não existir (erro 42P01), retornar erro específico
            if (checkError.code === '42P01') {
                console.log("Tabela profile_tabs não existe ainda");
                return res.status(503).json({ message: 'Funcionalidade de abas não está disponível ainda. A tabela ainda não foi criada.' });
            }
            throw checkError; // Re-lançar se for outro erro
        }

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Aba não encontrada ou você não tem permissão para editá-la.' });
        }

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (tab_name !== undefined) {
            updateFields.push(`tab_name = $${paramIndex++}`);
            updateValues.push(tab_name);
        }
        if (tab_icon !== undefined) {
            updateFields.push(`tab_icon = $${paramIndex++}`);
            updateValues.push(tab_icon);
        }
        if (content_type !== undefined) {
            updateFields.push(`content_type = $${paramIndex++}`);
            updateValues.push(content_type);
        }
        if (content_data !== undefined) {
            updateFields.push(`content_data = $${paramIndex++}`);
            updateValues.push(content_data ? JSON.stringify(content_data) : null);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            updateValues.push(is_active);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }

        updateValues.push(tabId, userId);
        const query = `
            UPDATE profile_tabs 
            SET ${updateFields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
            RETURNING *
        `;

        const result = await client.query(query, updateValues);
        res.json({ message: 'Aba atualizada com sucesso!', tab: result.rows[0] });
    } catch (error) {
        // Se a tabela não existir (erro 42P01), retornar erro específico
        if (error.code === '42P01') {
            console.log("Tabela profile_tabs não existe ainda");
            return res.status(503).json({ message: 'Funcionalidade de abas não está disponível ainda. A tabela ainda não foi criada.' });
        }
        console.error("Erro ao atualizar aba:", error);
        res.status(500).json({ message: 'Erro ao atualizar aba.' });
    } finally {
        client.release();
    }
});

// DELETE /api/profile/tabs/:tabId - Deletar aba
router.delete('/tabs/:tabId', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { tabId } = req.params;

        // Verificar se a aba pertence ao usuário
        let checkRes;
        try {
            checkRes = await client.query(
                'SELECT * FROM profile_tabs WHERE id = $1 AND user_id = $2',
                [tabId, userId]
            );
        } catch (checkError) {
            // Se a tabela não existir (erro 42P01), retornar erro específico
            if (checkError.code === '42P01') {
                console.log("Tabela profile_tabs não existe ainda");
                return res.status(503).json({ message: 'Funcionalidade de abas não está disponível ainda. A tabela ainda não foi criada.' });
            }
            throw checkError; // Re-lançar se for outro erro
        }

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Aba não encontrada ou você não tem permissão para removê-la.' });
        }

        await client.query('DELETE FROM profile_tabs WHERE id = $1 AND user_id = $2', [tabId, userId]);
        res.json({ message: 'Aba removida com sucesso!' });
    } catch (error) {
        // Se a tabela não existir (erro 42P01), retornar erro específico
        if (error.code === '42P01') {
            console.log("Tabela profile_tabs não existe ainda");
            return res.status(503).json({ message: 'Funcionalidade de abas não está disponível ainda. A tabela ainda não foi criada.' });
        }
        console.error("Erro ao deletar aba:", error);
        res.status(500).json({ message: 'Erro ao deletar aba.' });
    } finally {
        client.release();
    }
});

// PUT /api/profile/tabs/reorder - Reordenar abas
router.put('/tabs/reorder', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { orderedTabIds } = req.body;

        if (!Array.isArray(orderedTabIds)) {
            return res.status(400).json({ message: 'Dados de ordenação inválidos.' });
        }

        await client.query('BEGIN');

        for (let i = 0; i < orderedTabIds.length; i++) {
            const tabId = orderedTabIds[i];
            await client.query(
                'UPDATE profile_tabs SET display_order = $1 WHERE id = $2 AND user_id = $3',
                [i, tabId, userId]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Ordem das abas salva com sucesso!' });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {}); // Ignorar erro se já foi feito rollback
        // Se a tabela não existir (erro 42P01), retornar erro específico
        if (error.code === '42P01') {
            console.log("Tabela profile_tabs não existe ainda");
            return res.status(503).json({ message: 'Funcionalidade de abas não está disponível ainda. A tabela ainda não foi criada.' });
        }
        console.error("Erro ao reordenar abas:", error);
        res.status(500).json({ message: 'Erro ao reordenar abas.' });
    } finally {
        client.release();
    }
});

// PUT /api/profile/save-all - Salvar todas as alterações do perfil (detalhes + itens)
router.put('/save-all', protectUser, async (req, res) => {
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
            // Deletar todos os itens existentes do usuário
            await client.query('DELETE FROM profile_items WHERE user_id = $1', [userId]);

            // Inserir novos itens
            for (const item of items) {
                await client.query(`
                    INSERT INTO profile_items (
                        user_id, item_type, title, destination_url, image_url,
                        icon_class, display_order, is_active, pix_key, recipient_name,
                        pix_amount, pix_description, pdf_url, logo_size, whatsapp_message, aspect_ratio
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                `, [
                    userId,
                    item.item_type,
                    item.title || null,
                    item.destination_url || null,
                    item.image_url || null,
                    item.icon_class || null,
                    item.display_order !== undefined ? item.display_order : 0,
                    item.is_active !== undefined ? item.is_active : true,
                    item.pix_key || null,
                    item.recipient_name || null,
                    item.pix_amount || null,
                    item.pix_description || null,
                    item.pdf_url || null,
                    item.logo_size || null,
                    item.whatsapp_message || null,
                    item.aspect_ratio || null
                ]);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Todas as alterações salvas com sucesso');
        res.json({ message: 'Alterações salvas com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Erro ao salvar alterações:', error);
        res.status(500).json({ 
            message: 'Erro ao salvar alterações.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

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

