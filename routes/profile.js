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

router.get('/', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        if (!userId) {
            return res.status(400).json({ message: 'ID do usuário não encontrado.' });
        }
        
        // Verificar quais colunas existem na tabela user_profiles
        let existingColumns = [];
        try {
            const columnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user_profiles'
            `);
            existingColumns = columnsCheck.rows.map(row => row.column_name);
        } catch (checkError) {
            console.warn('⚠️ Erro ao verificar colunas da tabela user_profiles:', checkError.message);
            // Se falhar, usar query mais simples
        }
        
        // Construir query dinamicamente baseada nas colunas existentes
        const baseFields = [
            'u.id', 'u.email', 'u.profile_slug',
            'p.display_name', 'p.bio', 'p.profile_image_url',
            'p.font_family',
            'p.background_color', 'p.text_color', 'p.button_color', 'p.button_text_color',
            'p.button_opacity', 'p.button_border_radius', 'p.button_content_align',
            'p.background_type', 'p.background_image_url',
            'p.card_background_color', 'p.card_opacity',
            'p.button_font_size', 'p.background_image_opacity',
            'p.show_vcard_button'
        ];
        
        // Adicionar colunas opcionais se existirem
        if (existingColumns.includes('avatar_format')) {
            baseFields.splice(3, 0, "COALESCE(p.avatar_format, 'circular') as avatar_format");
        } else {
            baseFields.splice(3, 0, "'circular' as avatar_format");
        }
        
        if (existingColumns.includes('logo_spacing')) {
            baseFields.push("COALESCE(p.logo_spacing, 'center') as logo_spacing");
        } else {
            baseFields.push("'center' as logo_spacing");
        }
        
        if (existingColumns.includes('share_image_url')) {
            baseFields.push('p.share_image_url');
        }
        
        if (existingColumns.includes('whatsapp')) {
            baseFields.push('p.whatsapp');
        }
        
        if (existingColumns.includes('whatsapp_number')) {
            baseFields.push('p.whatsapp_number');
        }
        
        const profileQuery = `
            SELECT 
                ${baseFields.join(', ')}
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
        
        // Buscar dados adicionais para digital_form
        const items = await Promise.all(itemsRes.rows.map(async (item) => {
            if (item.item_type === 'digital_form') {
                try {
                    const digitalFormRes = await client.query(
                        'SELECT * FROM digital_form_items WHERE profile_item_id = $1',
                        [item.id]
                    );
                    if (digitalFormRes.rows.length > 0) {
                        item.digital_form_data = digitalFormRes.rows[0];
                        
                        // Garantir que form_fields seja parseado corretamente (PostgreSQL pode retornar JSONB como string)
                        if (item.digital_form_data.form_fields) {
                            if (typeof item.digital_form_data.form_fields === 'string') {
                                try {
                                    item.digital_form_data.form_fields = JSON.parse(item.digital_form_data.form_fields);
                                } catch (e) {
                                    console.error('Erro ao parsear form_fields na API:', e);
                                    item.digital_form_data.form_fields = [];
                                }
                            }
                            // Garantir que seja um array
                            if (!Array.isArray(item.digital_form_data.form_fields)) {
                                item.digital_form_data.form_fields = [];
                            }
                        } else {
                            item.digital_form_data.form_fields = [];
                        }
                    } else {
                        item.digital_form_data = { form_fields: [] }; // Garantir que o objeto exista
                    }
                } catch (formError) {
                    console.error('Erro ao carregar dados do formulário digital', {
                        itemId: item.id,
                        error: formError.message
                    });
                    item.digital_form_data = {};
                }
            }
            return item;
        }));
        
        const details = profileRes.rows[0];
        details.button_color_rgb = hexToRgb(details.button_color);
        details.card_color_rgb = hexToRgb(details.card_background_color);
        
        console.log('📱 [GET /api/profile] WhatsApp retornado:', details.whatsapp);
        console.log('📱 [GET /api/profile] Coluna whatsapp existe?', existingColumns.includes('whatsapp'));

        const fullProfile = {
            details: details,
            items: items || []
        };
        
        res.json(fullProfile);

    } catch (error) {
        console.error("❌ Erro ao buscar perfil completo:", error);
        console.error("❌ Stack trace:", error.stack);
        console.error("❌ Error code:", error.code);
        console.error("❌ Error message:", error.message);
        
        // Não enviar resposta aqui, deixar asyncHandler tratar
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}));

// PUT /api/profile/save-all - Salvar todas as alterações do perfil (detalhes + itens)
router.put('/save-all', protectUser, asyncHandler(async (req, res) => {
    console.log('🚀 [SAVE-ALL] Iniciando rota save-all...');
    const startTime = Date.now();
    
    // Timeout de 2 minutos para a operação completa
    const timeout = setTimeout(() => {
        console.error('⏰ [SAVE-ALL] TIMEOUT: Operação demorou mais de 2 minutos');
    }, 120000);
    
    const client = await db.pool.connect();
    console.log('✅ [SAVE-ALL] Conexão do banco obtida');
    
    try {
        // Configurar timeout na conexão (aumentado para 120 segundos)
        await client.query('SET statement_timeout = 120000'); // 120 segundos
        console.log('⏱️ [SAVE-ALL] Timeout configurado para 120 segundos');
        
        console.log('🔄 [SAVE-ALL] Iniciando transação...');
        await client.query('BEGIN');
        console.log('✅ [SAVE-ALL] Transação iniciada');
        const userId = req.user.userId;
        const { details, items } = req.body;

        console.log('💾 Salvando todas as alterações do perfil:', { userId, hasDetails: !!details, itemsCount: items?.length || 0 });
        console.log('🔍 [DEBUG] logo_spacing recebido:', { 
            logo_spacing: details?.logo_spacing, 
            logoSpacing: details?.logoSpacing,
            tipo_logo_spacing: typeof details?.logo_spacing,
            tipo_logoSpacing: typeof details?.logoSpacing
        });

        // Salvar detalhes do perfil
        if (details) {
            console.log('📝 [SAVE-ALL] Processando detalhes do perfil...');
            
            // Verificar quais colunas existem na tabela user_profiles
            const columnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user_profiles'
                ORDER BY column_name
            `);
            const existingColumns = columnsCheck.rows.map(row => row.column_name);
            console.log(`✅ [SAVE-ALL] ${existingColumns.length} colunas encontradas na tabela user_profiles`);
            const hasWhatsapp = existingColumns.includes('whatsapp');
            console.log(`🔍 [SAVE-ALL] Coluna 'whatsapp' existe? ${hasWhatsapp}`);
            if (!hasWhatsapp) {
                console.log(`⚠️ [SAVE-ALL] ATENÇÃO: Coluna 'whatsapp' NÃO encontrada!`);
                console.log(`📋 [SAVE-ALL] Colunas disponíveis:`, existingColumns.join(', '));
            }
            
            // Verificar se o perfil existe (user_id é a chave primária, não precisa selecionar id)
            console.log('🔍 [SAVE-ALL] Verificando se perfil existe...');
            const checkStart = Date.now();
            const checkProfile = await client.query(
                'SELECT user_id FROM user_profiles WHERE user_id = $1',
                [userId]
            );
            console.log(`✅ [SAVE-ALL] Verificação de perfil concluída em ${Date.now() - checkStart}ms`);
            console.log(`✅ [SAVE-ALL] Perfil ${checkProfile.rows.length > 0 ? 'existe' : 'não existe'}`);

            if (checkProfile.rows.length === 0) {
                // Verificar se a coluna avatar_format existe antes de tentar inserir
                const hasAvatarFormat = existingColumns.includes('avatar_format');
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

                // Adicionar colunas opcionais se existirem
                if (existingColumns.includes('whatsapp')) {
                    insertFields.push('whatsapp');
                    const whatsappValue = details.whatsapp || details.whatsappNumber || null;
                    insertValues.push(whatsappValue);
                    console.log(`📱 [SAVE-ALL] INSERT - Valor do WhatsApp que será salvo:`, whatsappValue);
                } else {
                    console.log(`⚠️ [SAVE-ALL] INSERT - Coluna 'whatsapp' NÃO existe no banco de dados!`);
                    console.log(`💡 [SAVE-ALL] Execute a migration 045_add_whatsapp_to_user_profiles.sql no banco de dados do Render`);
                }
                
                if (existingColumns.includes('whatsapp_number')) {
                    insertFields.push('whatsapp_number');
                    insertValues.push(details.whatsapp_number || details.whatsappNumber || null);
                }
                
                if (existingColumns.includes('logo_spacing')) {
                    insertFields.push('logo_spacing');
                    insertValues.push((details.logo_spacing !== undefined && details.logo_spacing !== null) ? details.logo_spacing : ((details.logoSpacing !== undefined && details.logoSpacing !== null) ? details.logoSpacing : 'center'));
                }

                if (hasAvatarFormat) {
                    insertFields.push('avatar_format');
                    insertValues.push(avatarFormatValue);
                }
                
                // Adicionar share_image_url se existir
                if (existingColumns.includes('share_image_url')) {
                    insertFields.push('share_image_url');
                    insertValues.push(details.share_image_url || null);
                }

                const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
                console.log('🔄 [SAVE-ALL] Executando INSERT em user_profiles...');
                const insertStart = Date.now();
                await client.query(`
                    INSERT INTO user_profiles (${insertFields.join(', ')})
                    VALUES (${placeholders})
                `, insertValues);
                console.log(`✅ [SAVE-ALL] INSERT concluído em ${Date.now() - insertStart}ms`);
            } else {
                // Atualizar perfil existente
                const hasAvatarFormat = existingColumns.includes('avatar_format');
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
                
                let paramIndex = updateValues.length + 1;

                // Adicionar colunas opcionais se existirem
                if (existingColumns.includes('logo_spacing')) {
                    updateFields.push(`logo_spacing = CASE WHEN $${paramIndex}::VARCHAR IS NOT NULL THEN $${paramIndex}::VARCHAR ELSE logo_spacing END`);
                    updateValues.push((details.logo_spacing !== undefined && details.logo_spacing !== null) ? details.logo_spacing : ((details.logoSpacing !== undefined && details.logoSpacing !== null) ? details.logoSpacing : null));
                    paramIndex++;
                }
                
                if (existingColumns.includes('whatsapp')) {
                    console.log(`✅ [SAVE-ALL] Adicionando campo 'whatsapp' ao UPDATE`);
                    console.log(`📱 [SAVE-ALL] Valor do WhatsApp recebido:`, details.whatsapp);
                    updateFields.push(`whatsapp = COALESCE($${paramIndex}, whatsapp)`);
                    updateValues.push(details.whatsapp || null);
                    console.log(`📱 [SAVE-ALL] Valor do WhatsApp que será salvo:`, updateValues[updateValues.length - 1]);
                    paramIndex++;
                } else {
                    console.log(`⚠️ [SAVE-ALL] Coluna 'whatsapp' NÃO existe, pulando...`);
                    console.log(`📱 [SAVE-ALL] Valor do WhatsApp recebido (mas não será salvo):`, details.whatsapp);
                }
                
                if (existingColumns.includes('whatsapp_number')) {
                    updateFields.push(`whatsapp_number = COALESCE($${paramIndex}, whatsapp_number)`);
                    updateValues.push(details.whatsapp_number || details.whatsappNumber || null);
                    paramIndex++;
                }

                console.log(`🔍 [DEBUG] logo_spacing no updateValues:`, updateValues.find((v, i) => updateFields[i]?.includes('logo_spacing')));

                if (hasAvatarFormat && avatarFormatValue) {
                    updateFields.push(`avatar_format = COALESCE($${paramIndex}, avatar_format)`);
                    updateValues.push(avatarFormatValue);
                    paramIndex++;
                }
                
                // Adicionar share_image_url se existir
                if (existingColumns.includes('share_image_url')) {
                    updateFields.push(`share_image_url = COALESCE($${paramIndex}, share_image_url)`);
                    updateValues.push(details.share_image_url || null);
                    paramIndex++;
                }

                updateValues.push(userId);
                const userIdParamIndex = updateValues.length;

                console.log(`🔄 [SAVE-ALL] Executando UPDATE em user_profiles (${updateFields.length} campos)...`);
                console.log(`🔄 [SAVE-ALL] Primeiros 5 campos: ${updateFields.slice(0, 5).join(', ')}${updateFields.length > 5 ? '...' : ''}`);
                console.log(`🔍 [SAVE-ALL] Todos os campos do UPDATE:`, updateFields);
                console.log(`🔍 [SAVE-ALL] Verificando se 'whatsapp' está nos campos:`, updateFields.some(f => f.includes('whatsapp')));
                const updateStart = Date.now();
                
                // Verificar locks antes do UPDATE
                try {
                    const lockCheck = await client.query(`
                        SELECT locktype, relation::regclass, mode, granted 
                        FROM pg_locks 
                        WHERE relation = 'user_profiles'::regclass::oid
                        AND NOT granted
                    `);
                    if (lockCheck.rows.length > 0) {
                        console.warn(`⚠️ [SAVE-ALL] Locks detectados na tabela user_profiles:`, lockCheck.rows);
                    } else {
                        console.log(`✅ [SAVE-ALL] Nenhum lock detectado na tabela user_profiles`);
                    }
                } catch (lockError) {
                    console.warn(`⚠️ [SAVE-ALL] Erro ao verificar locks:`, lockError.message);
                }
                
                try {
                    const updateQuery = `
                        UPDATE user_profiles SET
                            ${updateFields.join(', ')}
                        WHERE user_id = $${userIdParamIndex}
                    `;
                    console.log(`🔍 [DEBUG] Query UPDATE:`, updateQuery.substring(0, 500));
                    console.log(`🔍 [DEBUG] Executando UPDATE com ${updateFields.length} campos e ${updateValues.length} valores`);
                    const updateResult = await client.query(updateQuery, updateValues);
                    console.log(`✅ [SAVE-ALL] UPDATE concluído em ${Date.now() - updateStart}ms (${updateResult.rowCount} linha(s) atualizada(s))`);
                    
                    // Verificar o valor salvo
                    const verifyRes = await client.query('SELECT logo_spacing FROM user_profiles WHERE user_id = $1', [userId]);
                    console.log(`🔍 [DEBUG] Valor de logo_spacing após UPDATE:`, verifyRes.rows[0]?.logo_spacing);
                } catch (updateError) {
                    console.error(`❌ [SAVE-ALL] Erro no UPDATE após ${Date.now() - updateStart}ms:`, updateError);
                    console.error(`❌ [SAVE-ALL] Código do erro: ${updateError.code}`);
                    console.error(`❌ [SAVE-ALL] Mensagem: ${updateError.message}`);
                    throw updateError;
                }
            }

            // Atualizar profile_slug na tabela users se fornecido
            if (details.profile_slug || details.profileSlug) {
                console.log('🔄 [SAVE-ALL] Atualizando profile_slug na tabela users...');
                const slugUpdateStart = Date.now();
                await client.query(
                    'UPDATE users SET profile_slug = $1 WHERE id = $2',
                    [details.profile_slug || details.profileSlug, userId]
                );
                console.log(`✅ [SAVE-ALL] profile_slug atualizado em ${Date.now() - slugUpdateStart}ms`);
            }
            console.log('✅ [SAVE-ALL] Detalhes do perfil processados com sucesso');
        }

        // Salvar itens do perfil
        if (items && Array.isArray(items)) {
            console.log(`📦 [SAVE-ALL] Processando ${items.length} itens do perfil...`);
            
            // IMPORTANTE: NÃO deletar mais todos os itens - usar UPDATE para preservar dados
            // Esta mudança evita perda de dados quando módulos são salvos individualmente
            
            // Verificar quais colunas existem na tabela profile_items (cachear resultado)
            console.log('🔍 [SAVE-ALL] Verificando colunas da tabela profile_items...');
            const columnsCheckStart = Date.now();
            const columnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'profile_items'
            `);
            console.log(`✅ [SAVE-ALL] Colunas verificadas em ${Date.now() - columnsCheckStart}ms`);
            const existingColumns = columnsCheck.rows.map(row => row.column_name);
            console.log(`✅ [SAVE-ALL] ${existingColumns.length} colunas encontradas`);
            
            // Buscar IDs de todos os itens existentes do usuário (exceto sales_page) para identificar o que precisa ser deletado
            const existingItemsResult = await client.query(
                'SELECT id FROM profile_items WHERE user_id = $1 AND item_type != $2',
                [userId, 'sales_page']
            );
            const existingItemIds = new Set(existingItemsResult.rows.map(row => row.id));
            console.log(`📋 [SAVE-ALL] ${existingItemIds.size} itens existentes encontrados (exceto sales_page)`);
            
            // Criar Set com IDs dos itens que estão sendo salvos
            const savedItemIds = new Set();

            // Encontrar o maior ID para atualizar sequência uma única vez
            const maxIdResult = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM profile_items');
            const currentMaxId = parseInt(maxIdResult.rows[0].max_id, 10);
            let maxIdToSet = currentMaxId;

            // Processar itens e encontrar o maior ID que será inserido
            const salesPageItems = [];
            
            for (const item of items) {
                // IMPORTANTE: Para sales_page, incluir APENAS is_active e display_order
                // NÃO incluir title, image_url, icon_class ou outros campos
                // Esses campos são gerenciados exclusivamente pela página de vendas
                if (item.item_type === 'sales_page') {
                    const hasValidId = item.id && !isNaN(parseInt(item.id, 10)) && parseInt(item.id, 10) > 0;
                    const itemIdInt = hasValidId ? parseInt(item.id, 10) : null;
                    const itemExists = itemIdInt && existingItemIds.has(itemIdInt);
                    
                    if (itemExists) {
                        // UPDATE apenas is_active e display_order para sales_page existente
                        await client.query(`
                            UPDATE profile_items 
                            SET display_order = $1, is_active = $2
                            WHERE id = $3 AND user_id = $4 AND item_type = 'sales_page'
                        `, [
                            item.display_order !== undefined ? item.display_order : 0,
                            item.is_active !== undefined ? item.is_active : true,
                            itemIdInt,
                            userId
                        ]);
                        savedItemIds.add(itemIdInt);
                        console.log(`✅ [SAVE-ALL] Sales_page ${itemIdInt} atualizado (apenas is_active e display_order)`);
                    } else {
                        // INSERT para novo sales_page
                    const insertFields = hasValidId ? ['id', 'user_id', 'item_type', 'display_order', 'is_active'] : ['user_id', 'item_type', 'display_order', 'is_active'];
                    const insertValues = hasValidId ? [
                            itemIdInt,
                        userId,
                        item.item_type,
                        item.display_order !== undefined ? item.display_order : 0,
                        item.is_active !== undefined ? item.is_active : true
                    ] : [
                        userId,
                        item.item_type,
                        item.display_order !== undefined ? item.display_order : 0,
                        item.is_active !== undefined ? item.is_active : true
                    ];
                    
                    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
                        const result = await client.query(`
                            INSERT INTO profile_items (${insertFields.join(', ')})
                            VALUES (${placeholders})
                            RETURNING id, user_id, item_type
                        `, insertValues);
                        
                        const insertedId = result.rows[0].id;
                        savedItemIds.add(insertedId);
                        console.log(`✅ [SAVE-ALL] Sales_page ${insertedId} inserido (novo)`);
                        
                        if (hasValidId && itemIdInt > maxIdToSet) {
                            maxIdToSet = itemIdInt;
                        }
                        
                        // Guardar para verificar se precisa criar sales_page (só se não existir)
                        salesPageItems.push({ insertedId, item });
                    }
                    continue;
                }
                
                // Para outros tipos de item: usar UPDATE se existir, INSERT se novo
                const hasValidId = item.id && !isNaN(parseInt(item.id, 10)) && parseInt(item.id, 10) > 0;
                const itemIdInt = hasValidId ? parseInt(item.id, 10) : null;
                const itemExists = itemIdInt && existingItemIds.has(itemIdInt);
                
                // Normalizar destination_url para carrossel (evitar dupla codificação JSON)
                let normalizedDestinationUrl = item.destination_url || null;
                if (item.item_type === 'carousel' && normalizedDestinationUrl) {
                    try {
                        const parsed = JSON.parse(normalizedDestinationUrl);
                        if (Array.isArray(parsed)) {
                            normalizedDestinationUrl = JSON.stringify(parsed);
                        } else {
                            normalizedDestinationUrl = JSON.stringify([parsed]);
                        }
                    } catch (e) {
                        if (typeof normalizedDestinationUrl === 'string' && !normalizedDestinationUrl.startsWith('[')) {
                            normalizedDestinationUrl = JSON.stringify([normalizedDestinationUrl]);
                        }
                    }
                }
                
                if (itemExists) {
                    // UPDATE: item existe, atualizar campos
                    const updateFields = [];
                    const updateValues = [];
                    let paramIndex = 1;
                    
                    // Campos padrão
                    updateFields.push(`title = $${paramIndex++}`);
                    updateValues.push(item.title || null);
                    updateFields.push(`destination_url = $${paramIndex++}`);
                    updateValues.push(normalizedDestinationUrl);
                    updateFields.push(`image_url = $${paramIndex++}`);
                    updateValues.push(item.image_url || null);
                    updateFields.push(`icon_class = $${paramIndex++}`);
                    updateValues.push(item.icon_class || null);
                    updateFields.push(`display_order = $${paramIndex++}`);
                    updateValues.push(item.display_order !== undefined ? item.display_order : 0);
                    updateFields.push(`is_active = $${paramIndex++}`);
                    updateValues.push(item.is_active !== undefined ? item.is_active : true);
                    
                    // Campos opcionais
                    if (existingColumns.includes('pix_key')) {
                        updateFields.push(`pix_key = $${paramIndex++}`);
                        updateValues.push(item.pix_key || null);
                    }
                    if (existingColumns.includes('recipient_name')) {
                        updateFields.push(`recipient_name = $${paramIndex++}`);
                        updateValues.push(item.recipient_name || null);
                    }
                    if (existingColumns.includes('pix_amount')) {
                        updateFields.push(`pix_amount = $${paramIndex++}`);
                        updateValues.push(item.pix_amount ? parseFloat(item.pix_amount) : null);
                    }
                    if (existingColumns.includes('pix_description')) {
                        updateFields.push(`pix_description = $${paramIndex++}`);
                        updateValues.push(item.pix_description || null);
                    }
                    if (existingColumns.includes('pdf_url')) {
                        updateFields.push(`pdf_url = $${paramIndex++}`);
                        updateValues.push(item.pdf_url || null);
                    }
                    if (existingColumns.includes('logo_size')) {
                        updateFields.push(`logo_size = $${paramIndex++}`);
                        let logoSizeValue = null;
                        if (item.logo_size !== undefined && item.logo_size !== null && item.logo_size !== '') {
                            const parsed = parseInt(item.logo_size, 10);
                            logoSizeValue = (!isNaN(parsed) && parsed > 0) ? parsed : null;
                        }
                        updateValues.push(logoSizeValue);
                    }
                    if (existingColumns.includes('logo_fit_mode')) {
                        updateFields.push(`logo_fit_mode = $${paramIndex++}`);
                        let logoFitModeValue = 'contain';
                        if (item.logo_fit_mode !== undefined && item.logo_fit_mode !== null && item.logo_fit_mode !== '') {
                            if (['contain', 'cover'].includes(item.logo_fit_mode)) {
                                logoFitModeValue = item.logo_fit_mode;
                            }
                        }
                        updateValues.push(logoFitModeValue);
                    }
                    if (existingColumns.includes('whatsapp_message')) {
                        updateFields.push(`whatsapp_message = $${paramIndex++}`);
                        updateValues.push(item.whatsapp_message || null);
                    }
                    if (existingColumns.includes('aspect_ratio')) {
                        updateFields.push(`aspect_ratio = $${paramIndex++}`);
                        updateValues.push(item.aspect_ratio || null);
                    }
                    
                    // Adicionar WHERE clause
                    updateValues.push(itemIdInt, userId);
                    
                    await client.query(`
                        UPDATE profile_items 
                        SET ${updateFields.join(', ')}
                        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
                    `, updateValues);
                    
                    savedItemIds.add(itemIdInt);
                    console.log(`✅ [SAVE-ALL] Item ${itemIdInt} (${item.item_type}) atualizado`);
                } else {
                    // INSERT: item novo
                const insertFields = hasValidId ? ['id', 'user_id', 'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'] : ['user_id', 'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'];
                const insertValues = hasValidId ? [
                        itemIdInt,
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
                
                    // Adicionar campos opcionais
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
                        insertValues.push(item.pix_amount ? parseFloat(item.pix_amount) : null);
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
                    let logoSizeValue = null;
                    if (item.logo_size !== undefined && item.logo_size !== null && item.logo_size !== '') {
                        const parsed = parseInt(item.logo_size, 10);
                        logoSizeValue = (!isNaN(parsed) && parsed > 0) ? parsed : null;
                    }
                    insertValues.push(logoSizeValue);
                }
                if (existingColumns.includes('logo_fit_mode')) {
                    insertFields.push('logo_fit_mode');
                        let logoFitModeValue = 'contain';
                    if (item.logo_fit_mode !== undefined && item.logo_fit_mode !== null && item.logo_fit_mode !== '') {
                        if (['contain', 'cover'].includes(item.logo_fit_mode)) {
                            logoFitModeValue = item.logo_fit_mode;
                        }
                    }
                    insertValues.push(logoFitModeValue);
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
                    const result = await client.query(`
                        INSERT INTO profile_items (${insertFields.join(', ')})
                        VALUES (${placeholders})
                        RETURNING id, user_id, item_type
                    `, insertValues);
                    
                    const insertedId = result.rows[0].id;
                    savedItemIds.add(insertedId);
                    
                    if (hasValidId && itemIdInt > maxIdToSet) {
                        maxIdToSet = itemIdInt;
                    }
                    
                    console.log(`✅ [SAVE-ALL] Item ${insertedId} (${item.item_type}) inserido (novo)`);
                }
            }
            
            // Deletar apenas itens que existem no banco mas não foram enviados no save-all
            // IMPORTANTE: não deletar sales_page
            const itemsToDelete = Array.from(existingItemIds).filter(id => !savedItemIds.has(id));
            if (itemsToDelete.length > 0) {
                console.log(`🗑️ [SAVE-ALL] Deletando ${itemsToDelete.length} itens que não foram incluídos no save-all...`);
                        await client.query(`
                    DELETE FROM profile_items 
                    WHERE id = ANY($1::int[]) AND user_id = $2
                `, [itemsToDelete, userId]);
                console.log(`✅ [SAVE-ALL] ${itemsToDelete.length} itens deletados`);
            }
            
            // Atualizar sequência uma única vez no final (se necessário)
            if (maxIdToSet > currentMaxId) {
                await client.query(`
                    SELECT setval('profile_items_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM profile_items), 0), $1), true)
                `, [maxIdToSet]);
            }
            
            // Processar sales_pages em lote (apenas para NOVOS itens, não atualizar existentes)
            if (salesPageItems.length > 0) {
                const salesPageService = require('../modules/salesPage/salesPage.service');
                const crypto = require('crypto');
                
                for (const { insertedId, item } of salesPageItems) {
                    try {
                        // IMPORTANTE: Verificar se já existe uma sales_page para este profile_item_id
                        // Se existir, NÃO criar/atualizar - apenas deixar como está
                        const existingSalesPage = await client.query(
                            'SELECT id FROM sales_pages WHERE profile_item_id = $1',
                            [insertedId]
                        );
                        
                        if (existingSalesPage.rows.length > 0) {
                            // Já existe uma sales_page - NÃO modificar
                            console.log(`⚠️ [SAVE-ALL] Sales_page já existe para item ${insertedId} - NÃO modificando (preservando dados existentes)`);
                            continue;
                        }
                        
                        // Apenas criar se NÃO existir (novo item)
                        const salesPageData = {
                            profile_item_id: insertedId,
                            store_title: item.title || 'Minha Loja',
                            button_text: item.title || 'Minha Loja',
                            button_logo_url: item.image_url || null,
                            whatsapp_number: '',
                            theme: 'dark',
                            status: 'DRAFT',
                            preview_token: crypto.randomBytes(32).toString('hex')
                        };
                        
                        // Passar o client existente para usar a mesma transação
                        await salesPageService.create(salesPageData, client);
                        console.log(`✅ [SAVE-ALL] Nova página de vendas criada para item ${insertedId}`);
                    } catch (error) {
                        console.error(`❌ [SAVE-ALL] Erro ao criar página de vendas para item ${insertedId}:`, error.message);
                        // Não falhar a operação inteira se uma sales_page falhar
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log('✅ Todas as alterações salvas com sucesso');
        console.log('📤 Enviando resposta para o cliente...');
        
        // Buscar dados atualizados para retornar
        const updatedItemsRes = await client.query(
            'SELECT * FROM profile_items WHERE user_id = $1 ORDER BY display_order ASC', 
            [userId]
        );
        
        // Evitar cache do navegador e retornar dados atualizados
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date().toUTCString()
        });
        res.json({ 
            message: 'Alterações salvas com sucesso!',
            items: updatedItemsRes.rows,
            timestamp: Date.now() // Timestamp para forçar atualização no frontend
        });
        console.log('✅ Resposta enviada com sucesso');

    } catch (error) {
        console.error('❌ Erro capturado no save-all. Fazendo ROLLBACK...');
        await client.query('ROLLBACK').catch((rollbackError) => {
            console.error('❌ Erro ao fazer ROLLBACK:', rollbackError);
        });
        console.error('❌ Erro ao salvar alterações:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        throw error; // Deixar asyncHandler tratar o erro
    } finally {
        console.log('🔄 Liberando conexão do banco de dados...');
        client.release();
        console.log('✅ Conexão liberada');
    }
}));

// ===========================================
// ROTAS PARA GERENCIAR ITENS (ITEMS) - ROTAS ESPECÍFICAS PRIMEIRO
// ===========================================

// PUT /api/profile/items/banner/:id - Atualizar banner específico
router.put('/items/banner/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);
        const { title, destination_url, image_url, whatsapp_message, aspect_ratio, is_active, display_order } = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        console.log(`📝 PUT /api/profile/items/banner/${itemId} - userId: ${userId}`);
        console.log(`📦 [BANNER] Dados recebidos:`, {
            title: title !== undefined ? (title || 'null') : 'undefined',
            destination_url: destination_url !== undefined ? (destination_url || 'null') : 'undefined',
            image_url: image_url !== undefined ? (image_url ? image_url.substring(0, 50) + '...' : 'null') : 'undefined',
            whatsapp_message: whatsapp_message !== undefined ? (whatsapp_message || 'null') : 'undefined',
            aspect_ratio: aspect_ratio !== undefined ? (aspect_ratio || 'null') : 'undefined',
            is_active: is_active !== undefined ? is_active : 'undefined',
            display_order: display_order !== undefined ? display_order : 'undefined'
        });

        // Verificar se o item pertence ao usuário e é do tipo banner
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
            [itemId, userId, 'banner']
        );

        if (checkRes.rows.length === 0) {
            console.log(`❌ Banner ${itemId} não encontrado ou não pertence ao usuário ${userId}`);
            return res.status(404).json({ message: 'Banner não encontrado ou você não tem permissão para editá-lo.' });
        }
        
        console.log(`✅ [BANNER] Banner encontrado:`, {
            id: checkRes.rows[0].id,
            title: checkRes.rows[0].title,
            currentImageUrl: checkRes.rows[0].image_url ? checkRes.rows[0].image_url.substring(0, 50) + '...' : 'null'
        });

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

        // Campos específicos do banner
        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            updateValues.push(title ? String(title).trim() || null : null);
        }
        if (destination_url !== undefined) {
            updateFields.push(`destination_url = $${paramIndex++}`);
            updateValues.push(destination_url ? String(destination_url).trim() || null : null);
        }
        if (image_url !== undefined) {
            // Sempre salvar image_url, mesmo se for null (permite limpar imagem)
            updateFields.push(`image_url = $${paramIndex++}`);
            const imageUrlValue = image_url && String(image_url).trim() ? String(image_url).trim() : null;
            updateValues.push(imageUrlValue);
            console.log(`📸 [BANNER] Salvando image_url: ${imageUrlValue ? 'URL presente (' + imageUrlValue.substring(0, 50) + '...)' : 'null'}`);
        }
        if (existingColumns.includes('whatsapp_message') && whatsapp_message !== undefined) {
            updateFields.push(`whatsapp_message = $${paramIndex++}`);
            updateValues.push(whatsapp_message ? String(whatsapp_message).trim() || null : null);
        }
        if (existingColumns.includes('aspect_ratio') && aspect_ratio !== undefined) {
            updateFields.push(`aspect_ratio = $${paramIndex++}`);
            updateValues.push(aspect_ratio ? String(aspect_ratio).trim() || null : null);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            // Garantir que is_active seja um booleano
            const isActiveValue = is_active === true || is_active === 'true' || is_active === 1 || is_active === '1';
            updateValues.push(isActiveValue);
        }
        if (display_order !== undefined && display_order !== null) {
            // display_order não pode ser null (constraint NOT NULL no banco)
            // Apenas atualizar se tiver um valor válido
            const displayOrderValue = parseInt(display_order, 10);
            if (!isNaN(displayOrderValue)) {
                updateFields.push(`display_order = $${paramIndex++}`);
                updateValues.push(displayOrderValue);
            }
            // Se for null ou NaN, simplesmente não atualizar (mantém o valor atual do banco)
        }

        // Validar que temos pelo menos um campo para atualizar
        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }

        // Validar que temos valores correspondentes
        if (updateFields.length !== updateValues.length) {
            console.error(`❌ [BANNER] Inconsistência: ${updateFields.length} campos mas ${updateValues.length} valores`);
            return res.status(500).json({ message: 'Erro interno: inconsistência entre campos e valores.' });
        }

        // Calcular números dos parâmetros (paramIndex já está no próximo número disponível)
        const itemIdParam = paramIndex;
        const userIdParam = paramIndex + 1;
        
        // Validar tipos dos parâmetros WHERE
        // itemId deve ser um número (é um INTEGER no banco)
        if (typeof itemId !== 'number' || isNaN(itemId)) {
            console.error(`❌ [BANNER] itemId inválido: ${itemId} (tipo: ${typeof itemId})`);
            return res.status(400).json({ message: 'ID do item inválido.' });
        }
        // userId pode ser string ou número (é VARCHAR no banco, mas pode vir como número em alguns casos)
        if (!userId || (typeof userId !== 'string' && typeof userId !== 'number')) {
            console.error(`❌ [BANNER] userId inválido: ${userId} (tipo: ${typeof userId})`);
            return res.status(400).json({ message: 'ID do usuário inválido.' });
        }
        
        // Adicionar itemId e userId aos valores (userId como string)
        updateValues.push(itemId, String(userId));
        
        const query = `
            UPDATE profile_items 
            SET ${updateFields.join(', ')}
            WHERE id = $${itemIdParam} AND user_id = $${userIdParam}
            RETURNING *
        `;
        
        console.log(`🔍 [BANNER] Query SQL:`, query.replace(/\s+/g, ' ').trim());
        console.log(`🔍 [BANNER] Total de campos: ${updateFields.length}`);
        console.log(`🔍 [BANNER] Total de valores: ${updateValues.length} (${updateFields.length} campos + itemId + userId)`);
        console.log(`🔍 [BANNER] Parâmetros WHERE: itemId=$${itemIdParam}, userId=$${userIdParam}`);
        console.log(`🔍 [BANNER] Valores:`, updateValues.map((v, i) => `$${i + 1}: ${v === null ? 'null' : (typeof v === 'string' && v.length > 50 ? v.substring(0, 50) + '...' : String(v))}`).join(', '));
        
        try {
            const result = await client.query(query, updateValues);
            console.log(`✅ [BANNER] Query executada com sucesso. Linhas afetadas: ${result.rowCount}`);

            if (result.rows.length === 0) {
                console.error(`❌ [BANNER] Nenhuma linha foi atualizada!`);
                return res.status(404).json({ message: 'Banner não encontrado ou não foi atualizado.' });
            }

            console.log(`✅ Banner ${itemId} atualizado com sucesso`);
            console.log(`📸 image_url salvo: ${result.rows[0].image_url ? 'Sim (' + result.rows[0].image_url.substring(0, 50) + '...)' : 'Não'}`);

            // Evitar cache do navegador
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.json(result.rows[0]);
        } catch (queryError) {
            console.error(`❌ [BANNER] Erro na query SQL:`, queryError);
            console.error(`❌ [BANNER] Query que falhou:`, query);
            console.error(`❌ [BANNER] Valores que falharam:`, updateValues);
            console.error(`❌ [BANNER] Stack trace:`, queryError.stack);
            // Não lançar o erro novamente, enviar resposta diretamente
            return res.status(500).json({ 
                message: 'Erro ao atualizar banner.', 
                error: queryError.message,
                details: process.env.NODE_ENV === 'development' ? queryError.stack : undefined
            });
        }
    } catch (error) {
        // Verificar se a resposta já foi enviada
        if (res.headersSent) {
            console.error(`❌ Erro após resposta já enviada:`, error);
            return;
        }
        console.error(`❌ Erro ao atualizar banner ${req.params.id}:`, error);
        console.error(`❌ Stack trace completo:`, error.stack);
        res.status(500).json({ 
            message: 'Erro ao atualizar banner.', 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        client.release();
    }
}));

// PUT /api/profile/items/link/:id - Atualizar link específico
router.put('/items/link/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);
        const { title, destination_url, image_url, icon_class, logo_size, is_active, display_order } = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        // Verificar se o item pertence ao usuário e é do tipo link
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
            [itemId, userId, 'link']
        );

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Link não encontrado ou você não tem permissão para editá-lo.' });
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

        // Campos específicos do link
        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            updateValues.push(title || null);
        }
        if (destination_url !== undefined) {
            updateFields.push(`destination_url = $${paramIndex++}`);
            updateValues.push(destination_url || null);
        }
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex++}`);
            updateValues.push(image_url || null);
        }
        if (icon_class !== undefined) {
            updateFields.push(`icon_class = $${paramIndex++}`);
            updateValues.push(icon_class || null);
        }
        if (existingColumns.includes('logo_size') && logo_size !== undefined) {
            updateFields.push(`logo_size = $${paramIndex++}`);
            updateValues.push(logo_size || null);
        }
        if (existingColumns.includes('logo_fit_mode') && item.logo_fit_mode !== undefined) {
            const logo_fit_mode = item.logo_fit_mode || 'contain'; // Padrão: completo, sem corte
            updateFields.push(`logo_fit_mode = $${paramIndex++}`);
            updateValues.push(['contain', 'cover'].includes(logo_fit_mode) ? logo_fit_mode : 'contain');
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            updateValues.push(is_active);
        }
        if (display_order !== undefined) {
            updateFields.push(`display_order = $${paramIndex++}`);
            updateValues.push(display_order);
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

        console.log(`✅ Link ${itemId} atualizado com sucesso`);
        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Erro ao atualizar link ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erro ao atualizar link.', error: error.message });
    } finally {
        client.release();
    }
}));

// PUT /api/profile/items/carousel/:id - Atualizar carousel específico
router.put('/items/carousel/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);
        const { title, destination_url, image_url, aspect_ratio, is_active, display_order } = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        console.log(`📝 PUT /api/profile/items/carousel/${itemId} - userId: ${userId}`);

        // Verificar se o item pertence ao usuário e é do tipo carousel
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
            [itemId, userId, 'carousel']
        );

        if (checkRes.rows.length === 0) {
            console.log(`❌ Carousel ${itemId} não encontrado ou não pertence ao usuário ${userId}`);
            return res.status(404).json({ message: 'Carousel não encontrado ou você não tem permissão para editá-lo.' });
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

        // Campos específicos do carousel
        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            updateValues.push(title || null);
        }
        if (destination_url !== undefined) {
            // destination_url do carousel é um JSON com array de imagens
            updateFields.push(`destination_url = $${paramIndex++}`);
            updateValues.push(destination_url || null);
        }
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex++}`);
            updateValues.push(image_url || null);
            console.log(`📸 [CAROUSEL] Salvando image_url: ${image_url ? 'URL presente' : 'null'}`);
        }
        if (existingColumns.includes('aspect_ratio') && aspect_ratio !== undefined) {
            updateFields.push(`aspect_ratio = $${paramIndex++}`);
            updateValues.push(aspect_ratio || null);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            updateValues.push(is_active);
        }
        if (display_order !== undefined) {
            updateFields.push(`display_order = $${paramIndex++}`);
            updateValues.push(display_order);
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

        console.log(`✅ Carousel ${itemId} atualizado com sucesso`);
        console.log(`📸 image_url salvo: ${result.rows[0].image_url ? 'Sim' : 'Não'}`);
        console.log(`🖼️ destination_url (JSON): ${result.rows[0].destination_url ? 'Presente' : 'Vazio'}`);

        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Erro ao atualizar carousel ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erro ao atualizar carousel.', error: error.message });
    } finally {
        client.release();
    }
}));

// PUT /api/profile/items/pix/:id - Atualizar PIX específico
router.put('/items/pix/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);
        const { title, pix_key, recipient_name, pix_amount, pix_description, icon_class, is_active, display_order } = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        console.log(`📝 PUT /api/profile/items/pix/${itemId} - userId: ${userId}`);

        // Verificar se o item pertence ao usuário e é do tipo pix ou pix_qrcode
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2 AND (item_type = $3 OR item_type = $4)',
            [itemId, userId, 'pix', 'pix_qrcode']
        );

        if (checkRes.rows.length === 0) {
            console.log(`❌ PIX ${itemId} não encontrado ou não pertence ao usuário ${userId}`);
            return res.status(404).json({ message: 'PIX não encontrado ou você não tem permissão para editá-lo.' });
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

        // Campos específicos do PIX
        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            updateValues.push(title || null);
        }
        if (existingColumns.includes('pix_key') && pix_key !== undefined) {
            updateFields.push(`pix_key = $${paramIndex++}`);
            updateValues.push(pix_key || null);
        }
        if (existingColumns.includes('recipient_name') && recipient_name !== undefined) {
            updateFields.push(`recipient_name = $${paramIndex++}`);
            updateValues.push(recipient_name || null);
        }
        if (existingColumns.includes('pix_amount') && pix_amount !== undefined) {
            updateFields.push(`pix_amount = $${paramIndex++}`);
            updateValues.push(pix_amount ? parseFloat(pix_amount) : null);
        }
        if (existingColumns.includes('pix_description') && pix_description !== undefined) {
            updateFields.push(`pix_description = $${paramIndex++}`);
            updateValues.push(pix_description || null);
        }
        if (icon_class !== undefined) {
            updateFields.push(`icon_class = $${paramIndex++}`);
            updateValues.push(icon_class || null);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            updateValues.push(is_active);
        }
        if (display_order !== undefined) {
            updateFields.push(`display_order = $${paramIndex++}`);
            updateValues.push(display_order);
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

        console.log(`✅ PIX ${itemId} atualizado com sucesso`);
        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Erro ao atualizar PIX ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erro ao atualizar PIX.', error: error.message });
    } finally {
        client.release();
    }
}));

// PUT /api/profile/items/pdf/:id - Atualizar PDF específico
router.put('/items/pdf/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);
        const { title, pdf_url, destination_url, is_active, display_order } = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        console.log(`📝 PUT /api/profile/items/pdf/${itemId} - userId: ${userId}`);

        // Verificar se o item pertence ao usuário e é do tipo pdf ou pdf_embed
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2 AND (item_type = $3 OR item_type = $4)',
            [itemId, userId, 'pdf', 'pdf_embed']
        );

        if (checkRes.rows.length === 0) {
            console.log(`❌ PDF ${itemId} não encontrado ou não pertence ao usuário ${userId}`);
            return res.status(404).json({ message: 'PDF não encontrado ou você não tem permissão para editá-lo.' });
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

        // Campos específicos do PDF
        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            updateValues.push(title || null);
        }
        if (existingColumns.includes('pdf_url') && pdf_url !== undefined) {
            updateFields.push(`pdf_url = $${paramIndex++}`);
            updateValues.push(pdf_url || null);
            console.log(`📄 [PDF] Salvando pdf_url: ${pdf_url ? 'URL presente' : 'null'}`);
        }
        if (destination_url !== undefined) {
            updateFields.push(`destination_url = $${paramIndex++}`);
            updateValues.push(destination_url || null);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            updateValues.push(is_active);
        }
        if (display_order !== undefined) {
            updateFields.push(`display_order = $${paramIndex++}`);
            updateValues.push(display_order);
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

        console.log(`✅ PDF ${itemId} atualizado com sucesso`);
        console.log(`📄 pdf_url salvo: ${result.rows[0].pdf_url ? 'Sim' : 'Não'}`);

        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Erro ao atualizar PDF ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erro ao atualizar PDF.', error: error.message });
    } finally {
        client.release();
    }
}));

// PUT /api/profile/items/digital_form/:id - Atualizar Formulário King específico
router.put('/items/digital_form/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);
        const { 
            title, 
            form_title,
            form_logo_url,
            button_logo_url,
            show_logo_corner,
            form_description,
            prayer_requests_text,
            meetings_text,
            welcome_text,
            whatsapp_number,
            enable_pastor_button,
            pastor_whatsapp_number,
            display_format,
            banner_image_url,
            header_image_url,
            background_image_url,
            background_opacity,
            background_color,
            form_fields,
            theme,
            primary_color,
            text_color,
            is_active, 
            display_order,
            is_listed,
            generate_share_token
        } = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        console.log(`📝 PUT /api/profile/items/digital_form/${itemId} - userId: ${userId}`);

        // Verificar se o item pertence ao usuário e é do tipo digital_form
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
            [itemId, userId, 'digital_form']
        );

        if (checkRes.rows.length === 0) {
            console.log(`❌ Formulário King ${itemId} não encontrado ou não pertence ao usuário ${userId}`);
            return res.status(404).json({ message: 'Formulário King não encontrado ou você não tem permissão para editá-lo.' });
        }

        // Verificar quais colunas existem na tabela profile_items
        const columnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profile_items'
        `);
        const existingColumns = columnsCheck.rows.map(row => row.column_name);

        // Atualizar profile_items
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            updateValues.push(title || null);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            updateValues.push(is_active);
        }
        if (display_order !== undefined) {
            updateFields.push(`display_order = $${paramIndex++}`);
            updateValues.push(display_order);
        }
        if (is_listed !== undefined && existingColumns.includes('is_listed')) {
            updateFields.push(`is_listed = $${paramIndex++}`);
            updateValues.push(is_listed);
        }
        // Gerar share_token se solicitado
        let generatedToken = null;
        if (generate_share_token === true && existingColumns.includes('share_token')) {
            // Verificar se já existe token
            const tokenCheck = await client.query(
                'SELECT share_token FROM profile_items WHERE id = $1',
                [itemId]
            );
            if (!tokenCheck.rows[0]?.share_token) {
                // Tentar usar função do banco, se não existir, criar manualmente
                try {
                    const tokenResult = await client.query('SELECT generate_share_token() as token');
                    generatedToken = tokenResult.rows[0]?.token;
                } catch (e) {
                    // Se função não existir, criar token manualmente
                    const crypto = require('crypto');
                    generatedToken = crypto.randomBytes(16).toString('hex').toUpperCase();
                    // Garantir que é único
                    let exists = true;
                    let attempts = 0;
                    while (exists && attempts < 10) {
                        const check = await client.query('SELECT 1 FROM profile_items WHERE share_token = $1', [generatedToken]);
                        exists = check.rows.length > 0;
                        if (exists) {
                            generatedToken = crypto.randomBytes(16).toString('hex').toUpperCase();
                            attempts++;
                        }
                    }
                }
                updateFields.push(`share_token = $${paramIndex++}`);
                updateValues.push(generatedToken);
                console.log(`🔗 [DIGITAL_FORM] Token gerado para formulário ${itemId}: ${generatedToken}`);
            } else {
                generatedToken = tokenCheck.rows[0].share_token;
            }
        }
        // Para digital_form, image_url pode ser usado para o banner_image_url
        if (banner_image_url !== undefined && display_format === 'banner') {
            if (existingColumns.includes('image_url')) {
                updateFields.push(`image_url = $${paramIndex++}`);
                updateValues.push(banner_image_url || null);
            }
        }

        if (updateFields.length > 0) {
            updateValues.push(itemId, userId);
            const profileQuery = `
                UPDATE profile_items 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
                RETURNING *
            `;
            const profileResult = await client.query(profileQuery, updateValues);
            
            // Se token foi gerado, retornar na resposta
            if (generate_share_token === true && existingColumns.includes('share_token')) {
                const updatedItem = profileResult.rows[0];
                if (updatedItem?.share_token) {
                    console.log(`🔗 [DIGITAL_FORM] Token disponível: ${updatedItem.share_token}`);
                }
            }
        }

        // Atualizar ou criar digital_form_items
        // Garantir que form_fields seja sempre um array válido
        const formFieldsArray = Array.isArray(form_fields) ? form_fields : (form_fields ? [form_fields] : []);
        const formFieldsJSON = JSON.stringify(formFieldsArray);
        
        console.log(`📝 [DIGITAL_FORM] Processando form_fields:`, {
            itemId: itemId,
            receivedType: typeof form_fields,
            isArray: Array.isArray(form_fields),
            fieldsCount: formFieldsArray.length
        });
        
        // Verificar se já existe registro em digital_form_items
        const formCheck = await client.query(
            'SELECT id FROM digital_form_items WHERE profile_item_id = $1',
            [itemId]
        );

        if (formCheck.rows.length > 0) {
            // Atualizar registro existente
            const updateFormFields = [];
            const updateFormValues = [];
            let formParamIndex = 1;

            if (form_title !== undefined) {
                updateFormFields.push(`form_title = $${formParamIndex++}`);
                updateFormValues.push(form_title || 'Formulário King');
            }
            if (form_logo_url !== undefined) {
                updateFormFields.push(`form_logo_url = $${formParamIndex++}`);
                updateFormValues.push(form_logo_url || null);
            }
            if (show_logo_corner !== undefined) {
                // Verificar se coluna existe antes de atualizar
                const logoCornerCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items'
                    AND column_name = 'show_logo_corner'
                `);
                if (logoCornerCheck.rows.length > 0) {
                    updateFormFields.push(`show_logo_corner = $${formParamIndex++}`);
                    updateFormValues.push(show_logo_corner || false);
                }
            }
            if (form_description !== undefined) {
                updateFormFields.push(`form_description = $${formParamIndex++}`);
                updateFormValues.push(form_description || null);
            }
            if (prayer_requests_text !== undefined) {
                updateFormFields.push(`prayer_requests_text = $${formParamIndex++}`);
                updateFormValues.push(prayer_requests_text || null);
            }
            if (meetings_text !== undefined) {
                updateFormFields.push(`meetings_text = $${formParamIndex++}`);
                updateFormValues.push(meetings_text || null);
            }
            if (welcome_text !== undefined) {
                updateFormFields.push(`welcome_text = $${formParamIndex++}`);
                updateFormValues.push(welcome_text || null);
            }
            if (whatsapp_number !== undefined) {
                updateFormFields.push(`whatsapp_number = $${formParamIndex++}`);
                updateFormValues.push(whatsapp_number || null);
            }
            if (enable_pastor_button !== undefined) {
                updateFormFields.push(`enable_pastor_button = $${formParamIndex++}`);
                updateFormValues.push(enable_pastor_button || false);
            }
            if (pastor_whatsapp_number !== undefined) {
                updateFormFields.push(`pastor_whatsapp_number = $${formParamIndex++}`);
                updateFormValues.push(pastor_whatsapp_number || null);
            }
            if (display_format !== undefined) {
                updateFormFields.push(`display_format = $${formParamIndex++}`);
                updateFormValues.push(display_format || 'button');
            }
            if (banner_image_url !== undefined) {
                updateFormFields.push(`banner_image_url = $${formParamIndex++}`);
                updateFormValues.push(banner_image_url || null);
            }
            // Sempre atualizar form_fields (mesmo que seja array vazio)
            updateFormFields.push(`form_fields = $${formParamIndex++}::jsonb`);
            updateFormValues.push(formFieldsJSON);
            console.log(`📝 [DIGITAL_FORM] Salvando form_fields:`, {
                itemId: itemId,
                formFieldsCount: formFieldsArray.length,
                formFieldsJSON: formFieldsJSON.substring(0, 200) + (formFieldsJSON.length > 200 ? '...' : '')
            });
            if (theme !== undefined) {
                updateFormFields.push(`theme = $${formParamIndex++}`);
                updateFormValues.push(theme || 'light');
            }
            if (primary_color !== undefined) {
                updateFormFields.push(`primary_color = $${formParamIndex++}`);
                updateFormValues.push(primary_color || '#4A90E2');
            }
            if (text_color !== undefined) {
                updateFormFields.push(`text_color = $${formParamIndex++}`);
                updateFormValues.push(text_color || '#333333');
            }
            if (header_image_url !== undefined) {
                updateFormFields.push(`header_image_url = $${formParamIndex++}`);
                updateFormValues.push(header_image_url || null);
            }
            if (background_image_url !== undefined) {
                updateFormFields.push(`background_image_url = $${formParamIndex++}`);
                updateFormValues.push(background_image_url || null);
            }
            if (background_opacity !== undefined) {
                updateFormFields.push(`background_opacity = $${formParamIndex++}`);
                updateFormValues.push(background_opacity !== undefined ? background_opacity : 1.0);
            }
            // Verificar se coluna background_color existe antes de atualizar
            if (background_color !== undefined) {
                const colorColumnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'background_color'
                `);
                if (colorColumnCheck.rows.length > 0) {
                    updateFormFields.push(`background_color = $${formParamIndex++}`);
                    updateFormValues.push(background_color || '#FFFFFF');
                }
            }

            if (updateFormFields.length > 0) {
                updateFormValues.push(itemId);
                const formUpdateQuery = `
                    UPDATE digital_form_items 
                    SET ${updateFormFields.join(', ')}
                    WHERE profile_item_id = $${formParamIndex++}
                    RETURNING *
                `;
                await client.query(formUpdateQuery, updateFormValues);
            }
        } else {
            // Criar novo registro
            // Verificar se colunas do pastor, logo corner e button_logo_url existem
            const extraColumnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'digital_form_items'
                AND column_name IN ('enable_pastor_button', 'pastor_whatsapp_number', 'show_logo_corner', 'button_logo_url')
            `);
            const existingColumns = extraColumnsCheck.rows.map(r => r.column_name);
            const hasPastorColumns = existingColumns.includes('enable_pastor_button');
            const hasLogoCorner = existingColumns.includes('show_logo_corner');
            const hasButtonLogo = existingColumns.includes('button_logo_url');
            
            let extraFields = '';
            let extraValues = '';
            let extraParams = [];
            let paramIdx = formParamIndex;
            
            // Adicionar button_logo_url se existir
            if (hasButtonLogo && button_logo_url !== undefined) {
                extraFields += ', button_logo_url';
                extraValues += `, $${paramIdx++}`;
                extraParams.push(button_logo_url || null);
            }
            
            if (hasPastorColumns) {
                extraFields += ', enable_pastor_button, pastor_whatsapp_number';
                extraValues += `, $${paramIdx++}, $${paramIdx++}`;
                extraParams.push(enable_pastor_button || false, pastor_whatsapp_number || null);
            }
            if (hasLogoCorner) {
                extraFields += ', show_logo_corner';
                extraValues += `, $${paramIdx++}`;
                extraParams.push(show_logo_corner || false);
            }
            if (hasBackgroundColor && background_color !== undefined) {
                extraFields += ', background_color';
                extraValues += `, $${paramIdx++}`;
                extraParams.push(background_color || '#FFFFFF');
            }
            
            await client.query(`
                INSERT INTO digital_form_items (
                    profile_item_id, form_title, form_logo_url, form_description,
                    prayer_requests_text, meetings_text, welcome_text,
                    whatsapp_number, display_format, banner_image_url,
                    header_image_url, background_image_url, background_opacity,
                    form_fields, theme, primary_color, text_color${extraFields}
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17${extraValues})
            `, [
                itemId,
                form_title || 'Formulário King',
                form_logo_url || null,
                form_description || null,
                prayer_requests_text || null,
                meetings_text || null,
                welcome_text || null,
                whatsapp_number || null,
                display_format || 'button',
                banner_image_url || null,
                header_image_url || null,
                background_image_url || null,
                background_opacity !== undefined ? background_opacity : 1.0,
                formFieldsJSON,
                theme || 'light',
                primary_color || '#4A90E2',
                text_color || '#333333',
                ...extraParams
            ]);
        }

        // Buscar dados atualizados
        const result = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        const formResult = await client.query(
            'SELECT * FROM digital_form_items WHERE profile_item_id = $1',
            [itemId]
        );

        const responseData = result.rows[0];
        if (formResult.rows.length > 0) {
            responseData.digital_form_data = formResult.rows[0];
        }

        console.log(`✅ Formulário King ${itemId} atualizado com sucesso`);

        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(responseData);
    } catch (error) {
        console.error(`❌ Erro ao atualizar Formulário King ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erro ao atualizar Formulário King.', error: error.message });
    } finally {
        client.release();
    }
}));

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
        
        if (checkRes.rows[0].item_type === 'digital_form') {
            await client.query('DELETE FROM digital_form_items WHERE profile_item_id = $1', [itemId]);
            console.log(`🗑️ Formulário King ${itemId} deletado`);
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
        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
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

        // Se for digital_form, buscar dados do formulário
        let responseData = result.rows[0];
        if (responseData.item_type === 'digital_form') {
            const formResult = await client.query(
                'SELECT * FROM digital_form_items WHERE profile_item_id = $1',
                [itemId]
            );
            if (formResult.rows.length > 0) {
                responseData.form_data = formResult.rows[0];
            }
        }

        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json({ 
            success: true, 
            data: {
                ...responseData,
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

        // Se for digital_form, criar registro na tabela digital_form_items
        if (item_type === 'digital_form') {
            try {
                await client.query(`
                    INSERT INTO digital_form_items (
                        profile_item_id, form_title, display_format
                    ) VALUES ($1, $2, $3)
                `, [
                    newItem.id,
                    title || 'Formulário King',
                    'button' // Padrão: formato botão
                ]);
                console.log(`✅ Formulário King criado para item ${newItem.id}`);
            } catch (error) {
                console.error("Erro ao criar formulário digital:", error);
                // Não falhar a criação do item se falhar criar o formulário
            }
        }

        console.log(`✅ Item criado com sucesso:`, newItem);
        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.status(201).json(newItem);
    } catch (error) {
        console.error("Erro ao criar item:", error);
        res.status(500).json({ message: 'Erro ao criar item.', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTA: IMAGEM DE COMPARTILHAMENTO (deve vir antes das rotas genéricas)
// ============================================

// PUT /api/profile/share-image - Atualizar imagem de compartilhamento
router.put('/share-image', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Verificar se req.body existe
        if (!req.body) {
            console.error('❌ req.body está undefined');
            return res.status(400).json({ 
                message: 'Corpo da requisição não encontrado. Verifique o Content-Type.',
                error: 'INVALID_REQUEST_BODY'
            });
        }
        
        const { share_image_url } = req.body || {};

        // Verificar se a coluna existe
        const columnCheck = await client.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'user_profiles' 
                AND column_name = 'share_image_url'
            ) AS coluna_existe
        `);

        if (!columnCheck.rows[0].coluna_existe) {
            return res.status(400).json({ 
                message: 'Coluna share_image_url não existe. Execute a migration 019 primeiro.',
                error: 'MIGRATION_REQUIRED'
            });
        }

        // Verificar se perfil existe
        const profileCheck = await client.query(
            'SELECT user_id FROM user_profiles WHERE user_id = $1',
            [userId]
        );

        if (profileCheck.rows.length === 0) {
            // Criar perfil se não existir
            await client.query(
                'INSERT INTO user_profiles (user_id, share_image_url) VALUES ($1, $2)',
                [userId, share_image_url || null]
            );
        } else {
            // Atualizar perfil existente
            await client.query(
                'UPDATE user_profiles SET share_image_url = $1 WHERE user_id = $2',
                [share_image_url || null, userId]
            );
        }

        res.json({ 
            message: 'Imagem de compartilhamento atualizada com sucesso.',
            share_image_url: share_image_url || null
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar imagem de compartilhamento:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/profile/items/:id - Atualizar item
router.put('/items/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    const startTime = Date.now();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);
        const updates = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        console.log(`📝 PUT /api/profile/items/${itemId} - userId: ${userId}, updates:`, Object.keys(updates));

        // Verificar se o item pertence ao usuário
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (checkRes.rows.length === 0) {
            console.log(`❌ Item ${itemId} não encontrado ou não pertence ao usuário ${userId}`);
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

        const duration = Date.now() - startTime;
        console.log(`✅ Item ${itemId} atualizado com sucesso em ${duration}ms`);

        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(result.rows[0]);
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Erro ao atualizar item ${req.params.id}:`, error);
        console.error(`   Duração: ${duration}ms`);
        console.error(`   Stack:`, error.stack);
        res.status(500).json({ message: 'Erro ao atualizar item.', error: error.message });
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

// POST /api/profile/digital-forms/:itemId/responses - Salvar resposta do formulário
router.post('/digital-forms/:itemId/responses', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.itemId, 10);
        const { response_data, responder_name, responder_email, responder_phone } = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do formulário inválido.' });
        }

        if (!response_data || typeof response_data !== 'object') {
            return res.status(400).json({ message: 'Dados de resposta são obrigatórios.' });
        }

        // Verificar se o formulário pertence ao usuário
        const formCheck = await client.query(
            'SELECT pi.id FROM profile_items pi WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = $3',
            [itemId, userId, 'digital_form']
        );

        if (formCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Formulário não encontrado ou você não tem permissão.' });
        }

        // Inserir resposta
        const result = await client.query(`
            INSERT INTO digital_form_responses (
                profile_item_id, response_data, responder_name, responder_email, responder_phone
            ) VALUES ($1, $2::jsonb, $3, $4, $5)
            RETURNING *
        `, [
            itemId,
            JSON.stringify(response_data),
            responder_name || null,
            responder_email || null,
            responder_phone || null
        ]);

        console.log(`✅ Resposta do formulário ${itemId} salva com sucesso`);

        res.status(201).json({
            success: true,
            response: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Erro ao salvar resposta do formulário:', error);
        res.status(500).json({ message: 'Erro ao salvar resposta.', error: error.message });
    } finally {
        client.release();
    }
}));

// GET /api/profile/digital-forms/:itemId/analytics - Buscar analytics do formulário
router.get('/digital-forms/:itemId/analytics', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.itemId, 10);
        
        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ success: false, message: 'ID do formulário inválido.' });
        }
        
        // Verificar se o formulário pertence ao usuário
        const formCheck = await client.query(
            'SELECT pi.id FROM profile_items pi WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = $3',
            [itemId, userId, 'digital_form']
        );
        
        if (formCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Formulário não encontrado.' });
        }
        
        // Estatísticas gerais por tipo de evento
        const stats = await client.query(`
            SELECT 
                event_type,
                COUNT(*) as count,
                COUNT(DISTINCT session_id) as unique_sessions,
                COUNT(DISTINCT user_ip) as unique_visitors
            FROM digital_form_analytics
            WHERE profile_item_id = $1
            GROUP BY event_type
        `, [itemId]);
        
        // Estatísticas por período (últimos 30 dias)
        const statsByPeriod = await client.query(`
            SELECT 
                DATE(created_at) as date,
                event_type,
                COUNT(*) as count,
                COUNT(DISTINCT session_id) as unique_sessions
            FROM digital_form_analytics
            WHERE profile_item_id = $1
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at), event_type
            ORDER BY date DESC
        `, [itemId]);
        
        // Taxa de conversão
        const conversionStats = await client.query(`
            SELECT 
                (SELECT COUNT(DISTINCT session_id) FROM digital_form_analytics WHERE profile_item_id = $1 AND event_type = 'view') as total_views,
                (SELECT COUNT(DISTINCT session_id) FROM digital_form_analytics WHERE profile_item_id = $1 AND event_type = 'submit') as total_submits,
                (SELECT COUNT(DISTINCT session_id) FROM digital_form_analytics WHERE profile_item_id = $1 AND event_type = 'start') as total_starts,
                (SELECT COUNT(DISTINCT session_id) FROM digital_form_analytics WHERE profile_item_id = $1 AND event_type = 'abandon') as total_abandons
        `, [itemId]);
        
        const views = parseInt(conversionStats.rows[0]?.total_views || 0);
        const submits = parseInt(conversionStats.rows[0]?.total_submits || 0);
        const starts = parseInt(conversionStats.rows[0]?.total_starts || 0);
        const abandons = parseInt(conversionStats.rows[0]?.total_abandons || 0);
        
        const conversion_rate = views > 0 ? ((submits / views) * 100).toFixed(2) : 0;
        const completion_rate = starts > 0 ? (((starts - abandons) / starts) * 100).toFixed(2) : 0;
        
        res.json({
            success: true,
            analytics: {
                by_type: stats.rows.map(row => ({
                    event_type: row.event_type,
                    count: parseInt(row.count),
                    unique_sessions: parseInt(row.unique_sessions),
                    unique_visitors: parseInt(row.unique_visitors)
                })),
                by_period: statsByPeriod.rows.map(row => ({
                    date: row.date,
                    event_type: row.event_type,
                    count: parseInt(row.count),
                    unique_sessions: parseInt(row.unique_sessions)
                })),
                summary: {
                    total_views: views,
                    total_submits: submits,
                    total_starts: starts,
                    total_abandons: abandons,
                    conversion_rate: parseFloat(conversion_rate),
                    completion_rate: parseFloat(completion_rate)
                }
            }
        });
    } catch (error) {
        console.error('Erro ao buscar analytics:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar analytics.' });
    } finally {
        client.release();
    }
}));

// GET /api/profile/digital-forms/:itemId/responses - Buscar respostas do formulário (dashboard)
router.get('/digital-forms/:itemId/responses', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.itemId, 10);

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do formulário inválido.' });
        }

        // Verificar se o formulário pertence ao usuário
        const formCheck = await client.query(
            'SELECT pi.id FROM profile_items pi WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = $3',
            [itemId, userId, 'digital_form']
        );

        if (formCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Formulário não encontrado ou você não tem permissão.' });
        }

        // Buscar respostas
        const responsesRes = await client.query(`
            SELECT * FROM digital_form_responses
            WHERE profile_item_id = $1
            ORDER BY submitted_at DESC
        `, [itemId]);

        // Estatísticas
        const statsRes = await client.query(`
            SELECT 
                COUNT(*) as total_responses,
                COUNT(DISTINCT responder_phone) as unique_responders,
                COUNT(DISTINCT responder_email) as unique_emails,
                MIN(submitted_at) as first_response,
                MAX(submitted_at) as last_response
            FROM digital_form_responses
            WHERE profile_item_id = $1
        `, [itemId]);

        console.log(`✅ Respostas do formulário ${itemId} buscadas: ${responsesRes.rows.length} resposta(s)`);

        res.json({
            success: true,
            responses: responsesRes.rows,
            statistics: statsRes.rows[0] || {
                total_responses: 0,
                unique_responders: 0,
                unique_emails: 0,
                first_response: null,
                last_response: null
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar respostas do formulário:', error);
        res.status(500).json({ message: 'Erro ao buscar respostas.', error: error.message });
    } finally {
        client.release();
    }
}));

// ============================================
// ROTAS DE RESPOSTAS E DASHBOARD DO FORMULÁRIO
// ============================================

// GET /api/profile/items/digital_form/:id/responses - Buscar respostas do formulário
router.get('/items/digital_form/:id/responses', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do formulário inválido.' });
        }

        // Verificar se o formulário pertence ao usuário
        const checkRes = await client.query(
            'SELECT id FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
            [itemId, userId, 'digital_form']
        );

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Formulário não encontrado ou você não tem permissão.' });
        }

        // Buscar respostas
        const responsesRes = await client.query(
            `SELECT id, response_data, responder_name, responder_email, responder_phone, submitted_at
             FROM digital_form_responses
             WHERE profile_item_id = $1
             ORDER BY submitted_at DESC`,
            [itemId]
        );

        res.json({
            responses: responsesRes.rows.map(row => {
                let responseData = row.response_data;
                // Parsear se for string (PostgreSQL JSONB pode retornar como string)
                if (typeof responseData === 'string') {
                    try {
                        responseData = JSON.parse(responseData);
                    } catch (e) {
                        console.error('Erro ao parsear response_data:', e);
                        responseData = {};
                    }
                }
                return {
                    ...row,
                    response_data: responseData
                };
            })
        });
    } catch (error) {
        console.error('Erro ao buscar respostas:', error);
        res.status(500).json({ message: 'Erro ao buscar respostas.', error: error.message });
    } finally {
        client.release();
    }
}));

// GET /api/profile/items/digital_form/:id/dashboard - Buscar estatísticas do formulário
router.get('/items/digital_form/:id/dashboard', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do formulário inválido.' });
        }

        // Verificar se o formulário pertence ao usuário
        const checkRes = await client.query(
            'SELECT id FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
            [itemId, userId, 'digital_form']
        );

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Formulário não encontrado ou você não tem permissão.' });
        }

        // Total de respostas
        const totalRes = await client.query(
            'SELECT COUNT(*) as total FROM digital_form_responses WHERE profile_item_id = $1',
            [itemId]
        );
        const totalResponses = parseInt(totalRes.rows[0].total) || 0;

        // Respostas dos últimos 7 dias
        const last7DaysRes = await client.query(
            `SELECT COUNT(*) as total 
             FROM digital_form_responses 
             WHERE profile_item_id = $1 AND submitted_at >= NOW() - INTERVAL '7 days'`,
            [itemId]
        );
        const last7Days = parseInt(last7DaysRes.rows[0].total) || 0;

        // Respostas dos últimos 30 dias
        const last30DaysRes = await client.query(
            `SELECT COUNT(*) as total 
             FROM digital_form_responses 
             WHERE profile_item_id = $1 AND submitted_at >= NOW() - INTERVAL '30 days'`,
            [itemId]
        );
        const last30Days = parseInt(last30DaysRes.rows[0].total) || 0;

        // Respostas por dia (últimos 30 dias) para gráfico
        const dailyRes = await client.query(
            `SELECT DATE(submitted_at) as date, COUNT(*) as count
             FROM digital_form_responses
             WHERE profile_item_id = $1 AND submitted_at >= NOW() - INTERVAL '30 days'
             GROUP BY DATE(submitted_at)
             ORDER BY date ASC`,
            [itemId]
        );

        // Analytics (visualizações, cliques, etc)
        const analyticsRes = await client.query(
            `SELECT 
                event_type,
                COUNT(*) as count
             FROM digital_form_analytics
             WHERE profile_item_id = $1
             GROUP BY event_type`,
            [itemId]
        );

        const analytics = {};
        analyticsRes.rows.forEach(row => {
            analytics[row.event_type] = parseInt(row.count) || 0;
        });

        // Respostas por hora (últimas 24 horas)
        const hourlyRes = await client.query(
            `SELECT EXTRACT(HOUR FROM submitted_at) as hour, COUNT(*) as count
             FROM digital_form_responses
             WHERE profile_item_id = $1 AND submitted_at >= NOW() - INTERVAL '24 hours'
             GROUP BY EXTRACT(HOUR FROM submitted_at)
             ORDER BY hour ASC`,
            [itemId]
        );

        // Taxa de conversão (submits / views)
        const conversionRate = analytics.view > 0 
            ? ((analytics.submit || 0) / analytics.view * 100).toFixed(2) 
            : 0;

        // Taxa de abandono
        const abandonmentRate = analytics.start > 0 
            ? ((analytics.abandon || 0) / analytics.start * 100).toFixed(2) 
            : 0;

        // Respostas com email/telefone
        const contactInfoRes = await client.query(
            `SELECT 
                COUNT(*) FILTER (WHERE responder_email IS NOT NULL) as with_email,
                COUNT(*) FILTER (WHERE responder_phone IS NOT NULL) as with_phone,
                COUNT(*) FILTER (WHERE responder_name IS NOT NULL) as with_name
             FROM digital_form_responses
             WHERE profile_item_id = $1`,
            [itemId]
        );

        const contactInfo = contactInfoRes.rows[0] || { with_email: 0, with_phone: 0, with_name: 0 };

        res.json({
            total_responses: totalResponses,
            last_7_days: last7Days,
            last_30_days: last30Days,
            daily_data: dailyRes.rows.map(row => ({
                date: row.date,
                count: parseInt(row.count) || 0
            })),
            hourly_data: hourlyRes.rows.map(row => ({
                hour: parseInt(row.hour) || 0,
                count: parseInt(row.count) || 0
            })),
            analytics: {
                views: analytics.view || 0,
                clicks: analytics.click || 0,
                submits: analytics.submit || 0,
                starts: analytics.start || 0,
                abandons: analytics.abandon || 0
            },
            metrics: {
                conversion_rate: parseFloat(conversionRate),
                abandonment_rate: parseFloat(abandonmentRate),
                with_email: parseInt(contactInfo.with_email) || 0,
                with_phone: parseInt(contactInfo.with_phone) || 0,
                with_name: parseInt(contactInfo.with_name) || 0
            }
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);
        res.status(500).json({ message: 'Erro ao buscar dashboard.', error: error.message });
    } finally {
        client.release();
    }
}));

module.exports = router;


