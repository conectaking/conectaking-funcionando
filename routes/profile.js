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
        
        // Buscar dados adicionais para digital_form, contract e guest_list
        const items = await Promise.all(itemsRes.rows.map(async (item) => {
            if (item.item_type === 'digital_form') {
                try {
                    // IMPORTANTE: Buscar sempre o registro mais recente baseado em updated_at
                    const digitalFormRes = await client.query(
                        `SELECT * FROM digital_form_items 
                         WHERE profile_item_id = $1 
                         ORDER BY 
                            COALESCE(updated_at, '1970-01-01'::timestamp) DESC, 
                            id DESC 
                         LIMIT 1`,
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
            } else if (item.item_type === 'contract') {
                try {
                    const contractRes = await client.query(
                        'SELECT * FROM contract_items WHERE profile_item_id = $1',
                        [item.id]
                    );
                    if (contractRes.rows.length > 0) {
                        item.contract_data = contractRes.rows[0];
                    } else {
                        item.contract_data = {};
                    }
                } catch (contractError) {
                    console.error('Erro ao carregar dados do contrato', {
                        itemId: item.id,
                        error: contractError.message
                    });
                    item.contract_data = {};
                }
            } else if (item.item_type === 'guest_list') {
                try {
                    // IMPORTANTE: Buscar sempre o registro mais recente baseado em updated_at
                    const guestListRes = await client.query(
                        `SELECT * FROM guest_list_items 
                         WHERE profile_item_id = $1 
                         ORDER BY 
                            COALESCE(updated_at, '1970-01-01'::timestamp) DESC, 
                            id DESC 
                         LIMIT 1`,
                        [item.id]
                    );
                    if (guestListRes.rows.length > 0) {
                        item.guest_list_data = guestListRes.rows[0];
                    } else {
                        item.guest_list_data = {};
                    }
                } catch (guestListError) {
                    console.error('Erro ao carregar dados da lista de convidados', {
                        itemId: item.id,
                        error: guestListError.message
                    });
                    item.guest_list_data = {};
                }
            }
            return item;
        }));

        // Normalizar itens para o frontend (dashboard/mobile): garantir campos usados em layout
        const normalizedItems = (items || []).map((item, index) => {
            const row = item && typeof item === 'object' ? item : {};
            return {
                ...row,
                id: row.id ?? null,
                item_type: row.item_type ?? 'link',
                title: row.title ?? row.item_type ?? '',
                display_order: typeof row.display_order === 'number' ? row.display_order : index,
                is_active: row.is_active !== false,
                image_url: row.image_url ?? null
            };
        });

        const details = profileRes.rows[0];
        details.button_color_rgb = hexToRgb(details.button_color);
        details.card_color_rgb = hexToRgb(details.card_background_color);

        console.log('📱 [GET /api/profile] WhatsApp retornado:', details.whatsapp);
        console.log('📱 [GET /api/profile] Coluna whatsapp existe?', existingColumns.includes('whatsapp'));

        const fullProfile = {
            details: details,
            items: normalizedItems
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
                    details.background_color ?? details.backgroundColor ?? null,
                    details.text_color || details.textColor || null,
                    details.button_color || details.buttonColor || null,
                    details.button_text_color || details.buttonTextColor || null,
                    (details.button_opacity ?? details.buttonOpacity) !== undefined ? (details.button_opacity ?? details.buttonOpacity) : null,
                    details.button_border_radius || details.buttonBorderRadius || null,
                    details.button_content_align || details.buttonContentAlign || null,
                    details.background_type ?? details.backgroundType ?? null,
                    (details.background_image_url !== undefined || details.backgroundImageUrl !== undefined) ? (details.background_image_url ?? details.backgroundImageUrl ?? '') : null,
                    details.card_background_color ?? details.cardBackgroundColor ?? null,
                    (details.card_opacity ?? details.cardOpacity) !== undefined ? (details.card_opacity ?? details.cardOpacity) : null,
                    details.button_font_size || details.buttonFontSize || null,
                    (details.background_image_opacity ?? details.backgroundImageOpacity) !== undefined ? (details.background_image_opacity ?? details.backgroundImageOpacity) : null,
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
                    details.background_color ?? details.backgroundColor ?? null,
                    details.text_color || details.textColor || null,
                    details.button_color || details.buttonColor || null,
                    details.button_text_color || details.buttonTextColor || null,
                    (details.button_opacity ?? details.buttonOpacity) !== undefined ? (details.button_opacity ?? details.buttonOpacity) : null,
                    details.button_border_radius || details.buttonBorderRadius || null,
                    details.button_content_align || details.buttonContentAlign || null,
                    details.background_type ?? details.backgroundType ?? null,
                    (details.background_image_url !== undefined || details.backgroundImageUrl !== undefined)
                        ? (details.background_image_url ?? details.backgroundImageUrl ?? '')
                        : null,
                    details.card_background_color ?? details.cardBackgroundColor ?? null,
                    (details.card_opacity ?? details.cardOpacity) !== undefined ? (details.card_opacity ?? details.cardOpacity) : null,
                    details.button_font_size || details.buttonFontSize || null,
                    (details.background_image_opacity ?? details.backgroundImageOpacity) !== undefined ? (details.background_image_opacity ?? details.backgroundImageOpacity) : null,
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
            button_logo_size,
            show_logo_corner,
            form_description,
            prayer_requests_text,
            meetings_text,
            welcome_text,
            whatsapp_number,
            enable_pastor_button,
            pastor_whatsapp_number,
            pastor_button_name,
            display_format,
            banner_image_url,
            header_image_url,
            background_image_url,
            background_opacity,
            background_color,
            form_fields,
            theme,
            primary_color,
            secondary_color,
            text_color,
            card_color,
            decorative_bar_color,
            separator_line_color,
            is_active, 
            display_order,
            is_listed,
            generate_share_token,
            item_type,
            enable_whatsapp,
            enable_guest_list_submit,
            send_mode,
            event_date,
            event_address,
            event_address_lat,
            event_address_lon
        } = req.body;

        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }

        console.log(`📝 PUT /api/profile/items/digital_form/${itemId} - userId: ${userId}`);
        console.log(`📝 [DIGITAL_FORM] Body recebido:`, JSON.stringify(req.body, null, 2));
        console.log(`📝 [DIGITAL_FORM] enable_guest_list_submit recebido:`, enable_guest_list_submit, typeof enable_guest_list_submit);

        // Verificar se o item pertence ao usuário (pode ser digital_form ou guest_list que será convertido)
        const checkRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (checkRes.rows.length === 0) {
            console.log(`❌ Formulário King ${itemId} não encontrado ou não pertence ao usuário ${userId}`);
            return res.status(404).json({ message: 'Formulário King não encontrado ou você não tem permissão para editá-lo.' });
        }
        
        // Verificar se é realmente um digital_form ou guest_list (que pode ser convertido)
        const currentItemType = checkRes.rows[0].item_type;
        if (currentItemType !== 'digital_form' && currentItemType !== 'guest_list') {
            return res.status(400).json({ message: 'Este item não é um formulário digital.' });
        }
        
        // Se o item_type no body é 'digital_form' e o item atual é 'guest_list', vamos converter
        if (item_type === 'digital_form' && currentItemType === 'guest_list') {
            console.log(`🔄 [DIGITAL_FORM] Convertendo item ${itemId} de guest_list para digital_form`);
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
            // Garantir que is_listed seja um booleano
            const isListedValue = is_listed === true || is_listed === 'true' || is_listed === 1 || is_listed === '1';
            updateValues.push(isListedValue);
            console.log(`💾 [DIGITAL_FORM] Salvando is_listed: ${isListedValue} (recebido: ${is_listed}, tipo: ${typeof is_listed})`);
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

        // Se o item era guest_list, atualizar para digital_form
        const checkItemType = await client.query(
            'SELECT item_type FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );
        if (checkItemType.rows.length > 0 && checkItemType.rows[0].item_type === 'guest_list') {
            console.log(`🔄 [DIGITAL_FORM] Convertendo item_type de guest_list para digital_form para item ${itemId}`);
            // Verificar se item_type já está sendo atualizado
            const hasItemType = updateFields.some(field => field.startsWith('item_type ='));
            if (!hasItemType) {
                updateFields.push(`item_type = $${paramIndex++}`);
                updateValues.push('digital_form');
            }
        }
        
        // Se o item_type está sendo explicitamente atualizado (guest_list ou digital_form), fazer isso também
        if (req.body.item_type === 'guest_list' || req.body.item_type === 'digital_form') {
            const hasItemType = updateFields.some(field => field.startsWith('item_type ='));
            if (!hasItemType) {
                updateFields.push(`item_type = $${paramIndex++}`);
                updateValues.push(req.body.item_type);
                console.log(`🔄 [DIGITAL_FORM] Atualizando item_type explicitamente para: ${req.body.item_type}`);
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
        // IMPORTANTE: Só processar form_fields se for explicitamente enviado
        let formFieldsArray = [];
        let formFieldsJSON = '[]';
        
        if (form_fields !== undefined) {
            // Garantir que form_fields seja sempre um array válido
            formFieldsArray = Array.isArray(form_fields) ? form_fields : (form_fields ? [form_fields] : []);
            formFieldsJSON = JSON.stringify(formFieldsArray);
            
            console.log(`📝 [DIGITAL_FORM] Processando form_fields:`, {
                itemId: itemId,
                receivedType: typeof form_fields,
                isArray: Array.isArray(form_fields),
                fieldsCount: formFieldsArray.length
            });
        } else {
            console.log(`📝 [DIGITAL_FORM] form_fields não foi enviado no request, será preservado do banco`);
        }
        
        // Verificar se já existe registro em digital_form_items
        // IMPORTANTE: Se houver múltiplos registros, vamos manter apenas o mais recente
        const formCheck = await client.query(
            `SELECT id FROM digital_form_items 
             WHERE profile_item_id = $1 
             ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC 
             LIMIT 1`,
            [itemId]
        );
        
        console.log(`🔍 [DIGITAL_FORM] Registro existente encontrado? ${formCheck.rows.length > 0 ? 'SIM' : 'NÃO'}`);
        if (formCheck.rows.length > 0) {
            console.log(`🔍 [DIGITAL_FORM] ID do registro existente: ${formCheck.rows[0].id}`);
        }
        
        // Se houver múltiplos registros, deletar os antigos
        const allFormsCheck = await client.query(
            'SELECT id FROM digital_form_items WHERE profile_item_id = $1',
            [itemId]
        );
        
        if (allFormsCheck.rows.length > 1) {
            console.log(`⚠️ [DIGITAL_FORM] Encontrados ${allFormsCheck.rows.length} registros para item ${itemId}. Mantendo apenas o mais recente.`);
            // Manter apenas o mais recente, deletar os outros
            const latestId = formCheck.rows.length > 0 ? formCheck.rows[0].id : null;
            if (latestId) {
                await client.query(
                    'DELETE FROM digital_form_items WHERE profile_item_id = $1 AND id != $2',
                    [itemId, latestId]
                );
                console.log(`✅ [DIGITAL_FORM] Registros duplicados deletados. Mantido registro ID: ${latestId}`);
            }
        }

        if (formCheck.rows.length > 0) {
            // Atualizar registro existente (o mais recente)
            const updateFormFields = [];
            const updateFormValues = [];
            let formParamIndex = 1;
            
            // IMPORTANTE: form_title deve ser sempre atualizado, mesmo que seja string vazia
            // Removido o check de !== undefined para garantir que sempre atualize
            const formTitleToSave = form_title !== undefined && form_title !== null ? (form_title.trim() || 'Formulário King') : 'Formulário King';
            updateFormFields.push(`form_title = $${formParamIndex++}`);
            updateFormValues.push(formTitleToSave);
            console.log(`📝 [DIGITAL_FORM] Atualizando form_title: "${formTitleToSave}" (recebido: "${form_title}")`);
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
            // Campos de evento (data e endereço)
            if (event_date !== undefined) {
                // Verificar se a coluna existe antes de salvar
                const eventDateCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items'
                    AND column_name = 'event_date'
                `);
                if (eventDateCheck.rows.length > 0) {
                    updateFormFields.push(`event_date = $${formParamIndex++}`);
                    updateFormValues.push(event_date || null);
                    console.log(`📅 [DIGITAL_FORM] Salvando event_date:`, {
                        itemId: itemId,
                        event_date: event_date
                    });
                }
            }
            if (event_address !== undefined) {
                // Verificar se a coluna existe antes de salvar
                const eventAddressCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items'
                    AND column_name = 'event_address'
                `);
                if (eventAddressCheck.rows.length > 0) {
                    updateFormFields.push(`event_address = $${formParamIndex++}`);
                    updateFormValues.push(event_address || null);
                    console.log(`📍 [DIGITAL_FORM] Salvando event_address:`, {
                        itemId: itemId,
                        event_address: event_address
                    });
                }
            }
            if (event_address_lat !== undefined && event_address_lat !== null && event_address_lat !== '') {
                const coordCheck = await client.query(`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'event_address_lat'
                `);
                if (coordCheck.rows.length > 0) {
                    const lat = parseFloat(event_address_lat);
                    if (!isNaN(lat)) {
                        updateFormFields.push(`event_address_lat = $${formParamIndex++}`);
                        updateFormValues.push(lat);
                    }
                }
            }
            if (event_address_lon !== undefined && event_address_lon !== null && event_address_lon !== '') {
                const coordCheck = await client.query(`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'event_address_lon'
                `);
                if (coordCheck.rows.length > 0) {
                    const lon = parseFloat(event_address_lon);
                    if (!isNaN(lon)) {
                        updateFormFields.push(`event_address_lon = $${formParamIndex++}`);
                        updateFormValues.push(lon);
                    }
                }
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
            if (button_logo_url !== undefined) {
                const buttonLogoCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items'
                    AND column_name = 'button_logo_url'
                `);
                if (buttonLogoCheck.rows.length > 0) {
                    updateFormFields.push(`button_logo_url = $${formParamIndex++}`);
                    updateFormValues.push(button_logo_url || null);
                    console.log(`🖼️ [DIGITAL_FORM] Salvando button_logo_url:`, {
                        itemId: itemId,
                        button_logo_url: button_logo_url,
                        button_logo_url_type: typeof button_logo_url,
                        willBeSaved: button_logo_url || null
                    });
                } else {
                    console.warn(`⚠️ [DIGITAL_FORM] Coluna button_logo_url não existe na tabela digital_form_items para item ${itemId}`);
                }
            }
            if (button_logo_size !== undefined) {
                const buttonLogoSizeCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items'
                    AND column_name = 'button_logo_size'
                `);
                if (buttonLogoSizeCheck.rows.length > 0) {
                    const parsedSize = parseInt(button_logo_size, 10);
                    const validSize = (!isNaN(parsedSize) && parsedSize >= 20 && parsedSize <= 80) ? parsedSize : 40;
                    updateFormFields.push(`button_logo_size = $${formParamIndex++}`);
                    updateFormValues.push(validSize);
                    console.log(`🖼️ [DIGITAL_FORM] Salvando button_logo_size:`, {
                        itemId: itemId,
                        button_logo_size_received: button_logo_size,
                        button_logo_size_type: typeof button_logo_size,
                        parsedSize: parsedSize,
                        validSize: validSize,
                        willBeSaved: validSize
                    });
                } else {
                    console.warn(`⚠️ [DIGITAL_FORM] Coluna button_logo_size não existe na tabela digital_form_items para item ${itemId}`);
                }
            }
            if (display_format !== undefined) {
                updateFormFields.push(`display_format = $${formParamIndex++}`);
                updateFormValues.push(display_format || 'button');
            }
            if (banner_image_url !== undefined) {
                updateFormFields.push(`banner_image_url = $${formParamIndex++}`);
                updateFormValues.push(banner_image_url || null);
            }
            // IMPORTANTE: Só atualizar form_fields se for explicitamente enviado
            // Se não for enviado, preservar o valor existente no banco
            if (form_fields !== undefined) {
                updateFormFields.push(`form_fields = $${formParamIndex++}::jsonb`);
                updateFormValues.push(formFieldsJSON);
                console.log(`📝 [DIGITAL_FORM] Salvando form_fields:`, {
                    itemId: itemId,
                    formFieldsCount: formFieldsArray.length,
                    formFieldsJSON: formFieldsJSON.substring(0, 200) + (formFieldsJSON.length > 200 ? '...' : '')
                });
            } else {
                console.log(`📝 [DIGITAL_FORM] form_fields não foi enviado, preservando valor existente no banco`);
            }
            if (theme !== undefined) {
                updateFormFields.push(`theme = $${formParamIndex++}`);
                updateFormValues.push(theme || 'light');
            }
            if (primary_color !== undefined) {
                updateFormFields.push(`primary_color = $${formParamIndex++}`);
                const primaryColorValue = primary_color && primary_color.trim() ? primary_color.trim() : '#4A90E2';
                updateFormValues.push(primaryColorValue);
                console.log(`🎨 [DIGITAL_FORM] PRIMARY_COLOR: Salvando APENAS em digital_form_items: "${primaryColorValue}"`);
                console.log(`🎨 [DIGITAL_FORM] IMPORTANTE: Esta cor NÃO afeta guest_list_items (portaria) - sistemas separados!`);
            }
            // Verificar se coluna secondary_color existe antes de atualizar
            if (secondary_color !== undefined) {
                const secondaryColorCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'secondary_color'
                `);
                if (secondaryColorCheck.rows.length > 0) {
                    console.log(`🎨 [SECONDARY_COLOR] Recebido no backend: "${secondary_color}", tipo: ${typeof secondary_color}`);
                    // Tratar string vazia como null
                    const valueToSave = (secondary_color && typeof secondary_color === 'string' && secondary_color.trim() !== '' && secondary_color !== 'null' && secondary_color !== 'undefined') 
                        ? secondary_color.trim() 
                        : (secondary_color && secondary_color !== null && secondary_color !== undefined && secondary_color !== 'null' && secondary_color !== 'undefined' ? secondary_color : null);
                    updateFormFields.push(`secondary_color = $${formParamIndex++}`);
                    updateFormValues.push(valueToSave);
                    console.log(`🎨 [SECONDARY_COLOR] Valor a ser salvo no banco: "${valueToSave}"`);
                }
            }
            if (text_color !== undefined) {
                updateFormFields.push(`text_color = $${formParamIndex++}`);
                updateFormValues.push(text_color || '#333333');
            }
            // Verificar se coluna card_color existe antes de atualizar
            if (card_color !== undefined) {
                const cardColorCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'card_color'
                `);
                if (cardColorCheck.rows.length > 0) {
                    updateFormFields.push(`card_color = $${formParamIndex++}`);
                    updateFormValues.push(card_color || '#FFFFFF');
                }
            }
            // Verificar se coluna decorative_bar_color existe antes de atualizar
            if (decorative_bar_color !== undefined) {
                const decorativeBarColorCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'decorative_bar_color'
                `);
                if (decorativeBarColorCheck.rows.length > 0) {
                    updateFormFields.push(`decorative_bar_color = $${formParamIndex++}`);
                    updateFormValues.push(decorative_bar_color || primary_color || '#4A90E2');
                    console.log(`🎨 [DECORATIVE_BAR_COLOR] Valor a ser salvo: "${decorative_bar_color || primary_color || '#4A90E2'}"`);
                } else {
                    console.warn(`⚠️ [DECORATIVE_BAR_COLOR] Coluna decorative_bar_color não existe na tabela digital_form_items`);
                }
            }
            // Verificar se coluna separator_line_color existe antes de atualizar
            if (separator_line_color !== undefined) {
                const separatorLineColorCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'separator_line_color'
                `);
                if (separatorLineColorCheck.rows.length > 0) {
                    // Tratar string vazia ou 'null' como valor válido (usar o que veio)
                    // Não usar fallback automático - usar apenas se realmente não existir
                    const valueToSave = (separator_line_color && 
                                         typeof separator_line_color === 'string' && 
                                         separator_line_color.trim() !== '' && 
                                         separator_line_color !== 'null' && 
                                         separator_line_color !== 'undefined') 
                                         ? separator_line_color.trim() 
                                         : (separator_line_color !== null && separator_line_color !== undefined ? separator_line_color : '#e8eaed');
                    updateFormFields.push(`separator_line_color = $${formParamIndex++}`);
                    updateFormValues.push(valueToSave);
                    console.log(`🎨 [SEPARATOR_LINE_COLOR] Valor a ser salvo: "${valueToSave}" (recebido: "${separator_line_color}")`);
                } else {
                    console.warn(`⚠️ [SEPARATOR_LINE_COLOR] Coluna separator_line_color não existe na tabela digital_form_items`);
                }
            }
            // Verificar se coluna pastor_button_name existe antes de atualizar
            if (pastor_button_name !== undefined) {
                const pastorButtonNameCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'pastor_button_name'
                `);
                if (pastorButtonNameCheck.rows.length > 0) {
                    updateFormFields.push(`pastor_button_name = $${formParamIndex++}`);
                    updateFormValues.push(pastor_button_name || 'Enviar Mensagem para o Pastor');
                }
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
                    console.log(`🎨 [DIGITAL_FORM] BACKGROUND_COLOR: Salvando APENAS em digital_form_items: "${background_color || '#FFFFFF'}"`);
                    console.log(`🎨 [DIGITAL_FORM] IMPORTANTE: Esta cor NÃO afeta guest_list_items (portaria) - sistemas COMPLETAMENTE separados!`);
                    console.log(`🎨 [DIGITAL_FORM] Personalizar Portaria mantém suas próprias cores independentes em guest_list_items`);
                }
            }
            
            // IMPORTANTE: CORES COMPLETAMENTE SEPARADAS!
            // NÃO atualizar guest_list_items quando salvar no King Forms
            // Cada sistema (King Forms/digital_form_items e Portaria/guest_list_items) mantém suas próprias cores
            // Não há sincronização de cores entre sistemas
            console.log(`🎨 [DIGITAL_FORM] CORES SEPARADAS: King Forms não sincroniza cores para guest_list_items (Portaria)`);
            
            // Adicionar enable_whatsapp e enable_guest_list_submit se existirem
            if (enable_whatsapp !== undefined) {
                const enableWhatsappCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'enable_whatsapp'
                `);
                if (enableWhatsappCheck.rows.length > 0) {
                    updateFormFields.push(`enable_whatsapp = $${formParamIndex++}`);
                    // Garantir que seja booleano - respeitar false!
                    const enableWhatsappValue = enable_whatsapp === true || enable_whatsapp === 'true' || enable_whatsapp === 1 || enable_whatsapp === '1';
                    updateFormValues.push(enableWhatsappValue);
                    console.log(`💾 [DIGITAL_FORM] Salvando enable_whatsapp: ${enableWhatsappValue} (recebido: ${enable_whatsapp}, tipo: ${typeof enable_whatsapp})`);
                }
            }
            
            if (enable_guest_list_submit !== undefined) {
                const enableGuestListSubmitCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' AND column_name = 'enable_guest_list_submit'
                `);
                if (enableGuestListSubmitCheck.rows.length > 0) {
                    updateFormFields.push(`enable_guest_list_submit = $${formParamIndex++}`);
                    // Garantir que seja booleano - respeitar false!
                    const enableGuestListSubmitValue = enable_guest_list_submit === true || enable_guest_list_submit === 'true' || enable_guest_list_submit === 1 || enable_guest_list_submit === '1';
                    updateFormValues.push(enableGuestListSubmitValue);
                    console.log(`💾 [DIGITAL_FORM] Salvando enable_guest_list_submit: ${enableGuestListSubmitValue} (recebido: ${enable_guest_list_submit}, tipo: ${typeof enable_guest_list_submit})`);
                }
            }

            // IMPORTANTE: Sempre incluir pelo menos form_title no update
            if (updateFormFields.length > 0) {
                // Usar o ID do registro mais recente ao invés de profile_item_id
                const latestFormId = formCheck.rows[0].id;
                updateFormValues.push(latestFormId);
                // IMPORTANTE: Forçar atualização do updated_at explicitamente
                // Usar ID específico ao invés de profile_item_id para garantir que atualize o registro correto
                // O índice do parâmetro WHERE é o comprimento do array (já que latestFormId foi adicionado no final)
                const whereParamIndex = updateFormValues.length;
                const formUpdateQuery = `
                    UPDATE digital_form_items 
                    SET ${updateFormFields.join(', ')}, updated_at = NOW()
                    WHERE id = $${whereParamIndex}
                    RETURNING *
                `;
                console.log(`🔍 [DIGITAL_FORM] Query de UPDATE:`, formUpdateQuery);
                console.log(`🔍 [DIGITAL_FORM] Valores:`, updateFormValues);
                const updateResult = await client.query(formUpdateQuery, updateFormValues);
                console.log(`✅ [DIGITAL_FORM] UPDATE executado no registro ID ${latestFormId} para item ${itemId}`);
                
            // LOG DETALHADO APÓS UPDATE - INCLUINDO LOGO DO BOTÃO
            if (updateResult.rows.length > 0) {
                console.log(`✅ [DIGITAL_FORM] UPDATE executado com sucesso:`, {
                    itemId: itemId,
                    updated_at: updateResult.rows[0].updated_at,
                    form_title: updateResult.rows[0].form_title,
                    form_logo_url: updateResult.rows[0].form_logo_url,
                    button_logo_url: updateResult.rows[0].button_logo_url,
                    button_logo_size: updateResult.rows[0].button_logo_size,
                    display_format: updateResult.rows[0].display_format,
                    enable_whatsapp: updateResult.rows[0].enable_whatsapp,
                    enable_guest_list_submit: updateResult.rows[0].enable_guest_list_submit,
                    primary_color: updateResult.rows[0].primary_color,
                    secondary_color: updateResult.rows[0].secondary_color,
                    id: updateResult.rows[0].id
                });
            }
            }
        } else {
            // Criar novo registro
            // Verificar se colunas do pastor, logo corner, button_logo_url, button_logo_size, background_color, secondary_color, card_color, pastor_button_name, enable_whatsapp e enable_guest_list_submit existem
            const extraColumnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'digital_form_items'
                AND column_name IN ('enable_pastor_button', 'pastor_whatsapp_number', 'pastor_button_name', 'show_logo_corner', 'button_logo_url', 'button_logo_size', 'background_color', 'secondary_color', 'card_color', 'enable_whatsapp', 'enable_guest_list_submit')
            `);
            const existingColumns = extraColumnsCheck.rows.map(r => r.column_name);
            const hasPastorColumns = existingColumns.includes('enable_pastor_button');
            const hasPastorButtonName = existingColumns.includes('pastor_button_name');
            const hasLogoCorner = existingColumns.includes('show_logo_corner');
            const hasButtonLogo = existingColumns.includes('button_logo_url');
            const hasButtonLogoSize = existingColumns.includes('button_logo_size');
            const hasBackgroundColor = existingColumns.includes('background_color');
            const hasSecondaryColor = existingColumns.includes('secondary_color');
            const hasCardColor = existingColumns.includes('card_color');
            const hasEnableWhatsapp = existingColumns.includes('enable_whatsapp');
            const hasEnableGuestListSubmit = existingColumns.includes('enable_guest_list_submit');
            
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
            if (hasPastorButtonName && pastor_button_name !== undefined) {
                extraFields += ', pastor_button_name';
                extraValues += `, $${paramIdx++}`;
                extraParams.push(pastor_button_name || 'Enviar Mensagem para o Pastor');
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
            if (hasSecondaryColor && secondary_color !== undefined) {
                extraFields += ', secondary_color';
                extraValues += `, $${paramIdx++}`;
                extraParams.push(secondary_color || null);
            }
            if (hasCardColor && card_color !== undefined) {
                extraFields += ', card_color';
                extraValues += `, $${paramIdx++}`;
                extraParams.push(card_color || '#FFFFFF');
            }
            
            // Adicionar enable_whatsapp se existir e for enviado
            if (hasEnableWhatsapp && enable_whatsapp !== undefined) {
                extraFields += ', enable_whatsapp';
                extraValues += `, $${paramIdx++}`;
                const enableWhatsappValue = enable_whatsapp === true || enable_whatsapp === 'true' || enable_whatsapp === 1 || enable_whatsapp === '1';
                extraParams.push(enableWhatsappValue);
                console.log(`💾 [DIGITAL_FORM] Criando registro com enable_whatsapp: ${enableWhatsappValue}`);
            }
            
            // Adicionar enable_guest_list_submit se existir e for enviado
            if (hasEnableGuestListSubmit && enable_guest_list_submit !== undefined) {
                extraFields += ', enable_guest_list_submit';
                extraValues += `, $${paramIdx++}`;
                const enableGuestListSubmitValue = enable_guest_list_submit === true || enable_guest_list_submit === 'true' || enable_guest_list_submit === 1 || enable_guest_list_submit === '1';
                extraParams.push(enableGuestListSubmitValue);
                console.log(`💾 [DIGITAL_FORM] Criando registro com enable_guest_list_submit: ${enableGuestListSubmitValue}`);
            }
            
            // Construir lista de campos e valores dinamicamente
            let insertFields = 'profile_item_id, form_title, form_logo_url, form_description, prayer_requests_text, meetings_text, welcome_text, whatsapp_number, display_format, banner_image_url, header_image_url, background_image_url, background_opacity, form_fields, theme, primary_color';
            let insertValues = '$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16';
            let insertParams = [
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
                primary_color || '#4A90E2'
            ];
            let paramCounter = 17;
            
            // Adicionar secondary_color se existir
            if (hasSecondaryColor && secondary_color !== undefined) {
                insertFields += ', secondary_color';
                insertValues += `, $${paramCounter++}`;
                insertParams.push(secondary_color || null);
            }
            
            // Adicionar text_color
            insertFields += ', text_color';
            insertValues += `, $${paramCounter++}`;
            insertParams.push(text_color || '#333333');
            
            // Adicionar campos extras
            if (extraFields) {
                insertFields += extraFields;
                insertValues += extraValues;
                insertParams.push(...extraParams);
            }
            
            console.log(`🔍 [DIGITAL_FORM] Criando novo registro com campos:`, insertFields);
            console.log(`🔍 [DIGITAL_FORM] Valores:`, insertParams);
            await client.query(`
                INSERT INTO digital_form_items (${insertFields})
                VALUES (${insertValues})
            `, insertParams);
            console.log(`✅ [DIGITAL_FORM] Novo registro criado com sucesso para item ${itemId}`);
        }

        // Buscar dados atualizados
        const result = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        // Buscar dados atualizados do formulário (sempre o mais recente baseado em updated_at)
        const formResult = await client.query(
            `SELECT * FROM digital_form_items 
             WHERE profile_item_id = $1 
             ORDER BY 
                COALESCE(updated_at, '1970-01-01'::timestamp) DESC, 
                id DESC 
             LIMIT 1`,
            [itemId]
        );

        const responseData = result.rows[0];
        if (formResult.rows.length > 0) {
            responseData.digital_form_data = formResult.rows[0];
            
            // LOG DETALHADO PARA DEBUG - INCLUINDO LOGO DO BOTÃO
            console.log(`✅ [DIGITAL_FORM] Formulário ${itemId} atualizado com sucesso:`, {
                form_title: responseData.digital_form_data.form_title,
                form_logo_url: responseData.digital_form_data.form_logo_url,
                button_logo_url: responseData.digital_form_data.button_logo_url,
                button_logo_size: responseData.digital_form_data.button_logo_size,
                display_format: responseData.digital_form_data.display_format,
                primary_color: responseData.digital_form_data.primary_color,
                secondary_color: responseData.digital_form_data.secondary_color,
                enable_whatsapp: responseData.digital_form_data.enable_whatsapp,
                enable_guest_list_submit: responseData.digital_form_data.enable_guest_list_submit,
                updated_at: responseData.digital_form_data.updated_at,
                id: responseData.digital_form_data.id
            });
        } else {
            console.warn(`⚠️ [DIGITAL_FORM] Nenhum registro encontrado em digital_form_items para item ${itemId}`);
        }

        console.log(`✅ Formulário King ${itemId} atualizado com sucesso`);
        
        // IMPORTANTE: GARANTIR QUE NADA FOI ATUALIZADO EM guest_list_items
        // Verificar se houve alguma atualização acidental em guest_list_items
        const guestListCheck = await client.query(`
            SELECT id, primary_color, secondary_color, background_color, text_color, updated_at
            FROM guest_list_items 
            WHERE profile_item_id = $1
        `, [itemId]);
        
        if (guestListCheck.rows.length > 0) {
            console.log(`🔍 [DIGITAL_FORM] Verificação: guest_list_items NÃO foi alterado (cores permanecem independentes):`, {
                guest_list_id: guestListCheck.rows[0].id,
                primary_color: guestListCheck.rows[0].primary_color,
                secondary_color: guestListCheck.rows[0].secondary_color,
                background_color: guestListCheck.rows[0].background_color,
                text_color: guestListCheck.rows[0].text_color,
                updated_at: guestListCheck.rows[0].updated_at,
                message: 'Cores de guest_list_items NÃO foram alteradas - sistemas completamente separados'
            });
        }

        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(responseData);
    } catch (error) {
        console.error(`❌ Erro ao atualizar Formulário King ${req.params.id}:`, error);
        console.error(`❌ Stack trace:`, error.stack);
        console.error(`❌ Error name:`, error.name);
        console.error(`❌ Error code:`, error.code);
        console.error(`❌ Error detail:`, error.detail);
        console.error(`❌ Error hint:`, error.hint);
        res.status(500).json({ 
            message: 'Erro ao salvar configuração', 
            error: error.message 
        });
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

// Colunas prioritárias para fallback (perguntas + imagens + temas). Usar só as que existirem na tabela.
const DIGITAL_FORM_FALLBACK_COLS = [
    'profile_item_id', 'form_title', 'display_format', 'form_fields', 'form_logo_url', 'form_description',
    'banner_image_url', 'header_image_url', 'background_image_url', 'background_opacity', 'theme',
    'primary_color', 'secondary_color', 'text_color', 'button_logo_url', 'button_logo_size',
    'whatsapp_number', 'welcome_text', 'prayer_requests_text', 'meetings_text',
    'background_color', 'card_color', 'decorative_bar_color', 'separator_line_color',
    'enable_whatsapp', 'enable_guest_list_submit', 'enable_pastor_button', 'pastor_whatsapp_number', 'pastor_button_name',
    'show_logo_corner', 'event_date', 'event_address', 'send_mode'
];

// Copia TODOS os dados de digital_form_items (perguntas, fotos, textos, cores, etc.) para um novo profile_item_id
async function copyDigitalFormItemsFull(client, sourceId, newProfileItemId, titleSuffix = ' (cópia)') {
    const df = await client.query(
        `SELECT * FROM digital_form_items WHERE profile_item_id = $1 ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
        [sourceId]
    );
    if (df.rows.length === 0) return;
    const d = df.rows[0];
    const colRes = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'digital_form_items' AND column_name NOT IN ('id', 'created_at', 'updated_at') ORDER BY ordinal_position`
    );
    const cols = colRes.rows.map(r => r.column_name);
    const isJsonb = colRes.rows.map(r => r.data_type === 'jsonb');
    const vals = cols.map((c, i) => {
        if (c === 'profile_item_id') return newProfileItemId;
        if (c === 'form_title') return (d.form_title || '') + titleSuffix;
        const v = d[c];
        if (v === undefined || v === null) return null;
        if (isJsonb[i]) return typeof v === 'string' ? v : JSON.stringify(v);
        return v;
    });
    const placeholders = cols.map((c, i) => (isJsonb[i] ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(', ');
    await client.query(
        `INSERT INTO digital_form_items (${cols.join(', ')}) VALUES (${placeholders})`,
        vals
    );
}

// Fallback: insere em digital_form_items usando apenas colunas que existem na tabela (evita erro em DBs com migrações parciais)
async function copyDigitalFormItemsFallback(client, sourceId, newProfileItemId, titleSuffix = ' (cópia)') {
    const df = await client.query(
        `SELECT * FROM digital_form_items WHERE profile_item_id = $1 ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
        [sourceId]
    );
    if (df.rows.length === 0) return;
    const d = df.rows[0];
    const existingRes = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'digital_form_items' AND column_name NOT IN ('id', 'created_at', 'updated_at') ORDER BY ordinal_position`
    );
    const existingSet = new Set(existingRes.rows.map(r => r.column_name));
    const typeByCol = Object.fromEntries(existingRes.rows.map(r => [r.column_name, r.data_type]));
    const cols = DIGITAL_FORM_FALLBACK_COLS.filter(c => existingSet.has(c));
    if (cols.length === 0) return;
    const isJsonb = cols.map(c => typeByCol[c] === 'jsonb');
    const vals = cols.map((c, i) => {
        if (c === 'profile_item_id') return newProfileItemId;
        if (c === 'form_title') return (d.form_title || '') + titleSuffix;
        const v = d[c];
        if (v === undefined || v === null) return null;
        if (isJsonb[i]) return typeof v === 'string' ? v : JSON.stringify(v);
        return v;
    });
    const placeholders = cols.map((c, i) => (isJsonb[i] ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(', ');
    await client.query(
        `INSERT INTO digital_form_items (${cols.join(', ')}) VALUES (${placeholders})`,
        vals
    );
}

// Colunas que devem ser regeneradas ou anuladas ao copiar guest_list (tokens únicos, slugs únicos)
const GUEST_LIST_TOKEN_COLS = ['registration_token', 'confirmation_token', 'public_view_token'];
const GUEST_LIST_NULL_ON_COPY = ['portaria_slug', 'cadastro_slug'];

// Copia TODOS os dados de guest_list_items (perguntas custom_form_fields, imagens, cores, etc.) para um novo profile_item_id
async function copyGuestListItemsFull(client, sourceId, newProfileItemId, titleSuffix = ' (cópia)') {
    const gl = await client.query(
        `SELECT * FROM guest_list_items WHERE profile_item_id = $1 ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
        [sourceId]
    );
    if (gl.rows.length === 0) return;
    const g = gl.rows[0];
    const crypto = require('crypto');
    const colRes = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'guest_list_items' AND column_name NOT IN ('id', 'created_at', 'updated_at') ORDER BY ordinal_position`
    );
    const cols = colRes.rows.map(r => r.column_name);
    const isJsonb = colRes.rows.map(r => r.data_type === 'jsonb');
    const vals = cols.map((c, i) => {
        if (c === 'profile_item_id') return newProfileItemId;
        if (c === 'event_title') return (g.event_title || '') + titleSuffix;
        if (GUEST_LIST_TOKEN_COLS.includes(c)) return crypto.randomBytes(16).toString('hex');
        if (GUEST_LIST_NULL_ON_COPY.includes(c)) return null;
        const v = g[c];
        if (v === undefined || v === null) return null;
        if (isJsonb[i]) return typeof v === 'string' ? v : JSON.stringify(v);
        return v;
    });
    const placeholders = cols.map((c, i) => (isJsonb[i] ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(', ');
    await client.query(
        `INSERT INTO guest_list_items (${cols.join(', ')}) VALUES (${placeholders})`,
        vals
    );
}

// POST /api/profile/items/:id/duplicate - Duplicar módulo (copia configuração e dados relacionados)
router.post('/items/:id/duplicate', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const sourceId = parseInt(req.params.id, 10);
        if (!sourceId || isNaN(sourceId)) {
            return res.status(400).json({ message: 'ID do item inválido.' });
        }
        const src = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
            [sourceId, userId]
        );
        if (src.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado ou sem permissão.' });
        }
        const item = src.rows[0];
        const nextOrder = await client.query(
            'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM profile_items WHERE user_id = $1',
            [userId]
        );
        const display_order = nextOrder.rows[0].next_order;
        const copyFields = ['user_id', 'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'is_active', 'logo_size', 'pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url', 'whatsapp_message', 'aspect_ratio'];
        const existingCols = await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'profile_items' AND column_name = ANY($1)",
            [copyFields]
        );
        const colNames = ['display_order', ...existingCols.rows.map(r => r.column_name)];
        const vals = [display_order, ...existingCols.rows.map(r => (item[r.column_name] != null ? item[r.column_name] : null))];
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const ins = await client.query(
            `INSERT INTO profile_items (${colNames.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            vals
        );
        const newItem = ins.rows[0];
        if (item.item_type === 'sales_page') {
            const sp = await client.query('SELECT * FROM sales_pages WHERE profile_item_id = $1', [sourceId]);
            if (sp.rows.length > 0) {
                const s = sp.rows[0];
                const crypto = require('crypto');
                const newSp = await client.query(
                    `INSERT INTO sales_pages (profile_item_id, slug, store_title, store_description, button_text, button_logo_url, theme, background_color, text_color, button_color, button_text_color, background_image_url, whatsapp_number, meta_title, meta_description, meta_image_url, preview_token, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
                    [newItem.id, (s.slug || 'loja') + '-copia-' + Date.now().toString(36), (s.store_title || '') + ' (cópia)', s.store_description, s.button_text, s.button_logo_url, s.theme, s.background_color, s.text_color, s.button_color, s.button_text_color, s.background_image_url, s.whatsapp_number, s.meta_title, s.meta_description, s.meta_image_url, crypto.randomBytes(32).toString('hex'), 'DRAFT']
                );
                const newSpId = newSp.rows[0].id;
                const prods = await client.query('SELECT * FROM sales_page_products WHERE sales_page_id = $1 ORDER BY display_order', [s.id]);
                for (const p of prods.rows) {
                    await client.query(
                        `INSERT INTO sales_page_products (sales_page_id, name, description, price, compare_price, stock, variations, image_url, display_order, status, badge, youtube_video_url)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                        [newSpId, p.name, p.description, p.price, p.compare_price, p.stock, p.variations, p.image_url, p.display_order, p.status, p.badge, p.youtube_video_url || null]
                    );
                }
            }
        }
        if (item.item_type === 'digital_form') {
            try {
                await copyDigitalFormItemsFull(client, sourceId, newItem.id, ' (cópia)');
            } catch (formCopyErr) {
                console.error('Erro ao copiar digital_form_items (fallback):', formCopyErr.message);
                await copyDigitalFormItemsFallback(client, sourceId, newItem.id, ' (cópia)');
            }
            // Formulário pode estar em modo "Lista de Convidados": perguntas estão em guest_list_items.custom_form_fields
            // Se existir guest_list_items para o mesmo profile_item, copiar também para o duplicado
            const hasGuestList = await client.query(
                'SELECT 1 FROM guest_list_items WHERE profile_item_id = $1 LIMIT 1',
                [sourceId]
            );
            if (hasGuestList.rows.length > 0) {
                await copyGuestListItemsFull(client, sourceId, newItem.id, ' (cópia)');
            }
        }
        if (item.item_type === 'contract') {
            const ci = await client.query('SELECT * FROM contract_items WHERE profile_item_id = $1', [sourceId]);
            if (ci.rows.length > 0) {
                const c = ci.rows[0];
                await client.query(
                    `INSERT INTO contract_items (profile_item_id, contract_title, contract_type, contract_template, require_signature, require_stamp, allow_digital_signature, allow_photo_signature, stamp_image_url, stamp_text)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [newItem.id, (c.contract_title || '') + ' (cópia)', c.contract_type, c.contract_template, c.require_signature, c.require_stamp, c.allow_digital_signature, c.allow_photo_signature, c.stamp_image_url, c.stamp_text]
                );
            }
        }
        if (item.item_type === 'guest_list') {
            await copyGuestListItemsFull(client, sourceId, newItem.id, ' (cópia)');
        }
        res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        res.status(201).json(newItem);
    } catch (error) {
        console.error("Erro ao duplicar item:", error);
        const msg = error.message || 'Erro ao duplicar item.';
        res.status(500).json({ message: msg, error: process.env.NODE_ENV === 'development' ? msg : undefined });
    } finally {
        client.release();
    }
}));

// ===========================================
// COMPARTILHAR FORMULÁRIO PRONTO (importar em outra conta)
// ===========================================

// POST /api/profile/items/digital_form/:id/create-import-link - Gera link e código para outro usuário importar este formulário
router.post('/items/digital_form/:id/create-import-link', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.id, 10);
        if (!itemId || isNaN(itemId)) return res.status(400).json({ message: 'ID do formulário inválido.' });
        const check = await client.query(
            'SELECT id, item_type FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );
        if (check.rows.length === 0) return res.status(404).json({ message: 'Formulário não encontrado ou não é seu.' });
        if (check.rows[0].item_type !== 'digital_form') return res.status(400).json({ message: 'Este item não é um formulário.' });
        const crypto = require('crypto');
        const token = crypto.randomBytes(24).toString('hex');
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'KING-';
        for (let i = 0; i < 5; i++) code += chars[crypto.randomInt(0, chars.length)];
        const hasCodeCol = await client.query(
            "SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_items' AND column_name = 'import_code'"
        );
        if (hasCodeCol.rows.length > 0) {
            await client.query(
                'UPDATE profile_items SET import_token = $1, import_code = $2 WHERE id = $3 AND user_id = $4',
                [token, code, itemId, userId]
            );
        } else {
            await client.query(
                'UPDATE profile_items SET import_token = $1 WHERE id = $2 AND user_id = $3',
                [token, itemId, userId]
            );
            code = null;
        }
        res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        res.json({ token, code: code || token.substring(0, 10) });
    } catch (error) {
        console.error('Erro ao criar link de importação:', error);
        res.status(500).json({ message: error.message || 'Erro ao criar link.' });
    } finally {
        client.release();
    }
}));

// GET /api/profile/import-form-info?token= ou ?code= - Info pública do formulário (sem auth)
router.get('/import-form-info', asyncHandler(async (req, res) => {
    const token = (req.query.token || req.query.code || '').trim();
    if (!token) return res.status(400).json({ message: 'Token ou código não informado.' });
    const client = await db.pool.connect();
    try {
        const hasCodeCol = await client.query(
            "SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_items' AND column_name = 'import_code'"
        );
        const whereClause = hasCodeCol.rows.length > 0
            ? '(pi.import_token = $1 OR pi.import_code = $1)'
            : 'pi.import_token = $1';
        const row = await client.query(
            `SELECT pi.id, pi.title, p.display_name
             FROM profile_items pi
             LEFT JOIN user_profiles p ON p.user_id = pi.user_id
             WHERE pi.item_type = 'digital_form' AND ${whereClause}`,
            [token]
        );
        if (row.rows.length === 0) return res.status(404).json({ message: 'Link ou código inválido.' });
        const r = row.rows[0];
        res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        res.json({ formTitle: r.title || 'Formulário King', ownerName: r.display_name || 'Um usuário' });
    } catch (error) {
        console.error('Erro ao buscar info de importação:', error);
        res.status(500).json({ message: 'Erro ao validar link.' });
    } finally {
        client.release();
    }
}));

// POST /api/profile/import-form - Importa formulário (body: { token } ou { code }; opcional: { intoItemId } = importar dentro do formulário atual)
router.post('/import-form', protectUser, asyncHandler(async (req, res) => {
    const tokenOrCode = (req.body && (req.body.token || req.body.code)) ? String(req.body.token || req.body.code).trim() : '';
    if (!tokenOrCode) return res.status(400).json({ message: 'Token ou código não informado.' });
    const intoItemId = req.body && (req.body.intoItemId != null || req.body.into_item_id != null)
        ? parseInt(String(req.body.intoItemId || req.body.into_item_id), 10) : null;
    const client = await db.pool.connect();
    try {
        const targetUserId = req.user.userId;
        const hasCodeCol = await client.query(
            "SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_items' AND column_name = 'import_code'"
        );
        const whereClause = hasCodeCol.rows.length > 0
            ? '(import_token = $1 OR import_code = $1) AND item_type = \'digital_form\''
            : 'import_token = $1 AND item_type = \'digital_form\'';
        const src = await client.query(
            `SELECT id, user_id, item_type, title FROM profile_items WHERE ${whereClause}`,
            [tokenOrCode]
        );
        if (src.rows.length === 0) return res.status(404).json({ message: 'Link ou código inválido.' });
        const sourceId = src.rows[0].id;

        // Modo "importar dentro deste formulário": não cria novo módulo, só sobrescreve o conteúdo do item atual
        if (intoItemId && !isNaN(intoItemId)) {
            const targetCheck = await client.query(
                'SELECT id, item_type FROM profile_items WHERE id = $1 AND user_id = $2',
                [intoItemId, targetUserId]
            );
            if (targetCheck.rows.length === 0) return res.status(404).json({ message: 'Formulário de destino não encontrado ou sem permissão.' });
            const targetType = targetCheck.rows[0].item_type;
            if (targetType !== 'digital_form' && targetType !== 'guest_list') {
                return res.status(400).json({ message: 'Só é possível importar em um formulário digital ou lista de convidados.' });
            }
            await client.query('DELETE FROM digital_form_items WHERE profile_item_id = $1', [intoItemId]);
            try {
                await copyDigitalFormItemsFull(client, sourceId, intoItemId, '');
            } catch (formCopyErr) {
                console.error('Erro ao copiar digital_form_items na importação-into (fallback):', formCopyErr.message);
                await copyDigitalFormItemsFallback(client, sourceId, intoItemId, '');
            }
            const hasGuestList = await client.query(
                'SELECT 1 FROM guest_list_items WHERE profile_item_id = $1 LIMIT 1',
                [sourceId]
            );
            await client.query('DELETE FROM guest_list_items WHERE profile_item_id = $1', [intoItemId]);
            if (hasGuestList.rows.length > 0) {
                await copyGuestListItemsFull(client, sourceId, intoItemId, '');
            }
            res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
            return res.status(200).json({ id: intoItemId, itemId: intoItemId, into: true });
        }

        // Modo clássico: cria novo módulo (duplicar)
        const nextOrder = await client.query(
            'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM profile_items WHERE user_id = $1',
            [targetUserId]
        );
        const display_order = nextOrder.rows[0].next_order;
        const copyFields = ['item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'is_active', 'logo_size', 'pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url', 'whatsapp_message', 'aspect_ratio'];
        const existingCols = await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'profile_items' AND column_name = ANY($1)",
            [copyFields]
        );
        const colNames = ['user_id', 'display_order', ...existingCols.rows.map(r => r.column_name)];
        const itemRow = (await client.query('SELECT * FROM profile_items WHERE id = $1', [sourceId])).rows[0];
        const vals = [targetUserId, display_order, ...existingCols.rows.map(r => (itemRow[r.column_name] != null ? itemRow[r.column_name] : null))];
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const ins = await client.query(
            `INSERT INTO profile_items (${colNames.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            vals
        );
        const newItem = ins.rows[0];
        try {
            await copyDigitalFormItemsFull(client, sourceId, newItem.id, ' (cópia)');
        } catch (formCopyErr) {
            console.error('Erro ao copiar digital_form_items na importação (fallback):', formCopyErr.message);
            await copyDigitalFormItemsFallback(client, sourceId, newItem.id, ' (cópia)');
        }
        const hasGuestList = await client.query(
            'SELECT 1 FROM guest_list_items WHERE profile_item_id = $1 LIMIT 1',
            [sourceId]
        );
        if (hasGuestList.rows.length > 0) {
            await copyGuestListItemsFull(client, sourceId, newItem.id, ' (cópia)');
        }
        res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        res.status(201).json({ id: newItem.id, itemId: newItem.id, title: newItem.title, ...newItem });
    } catch (error) {
        console.error('Erro ao importar formulário:', error);
        res.status(500).json({ message: error.message || 'Erro ao importar.' });
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

        // Formato igual ao item em GET /api/profile (com digital_form_data ou guest_list_data)
        let responseData = { ...result.rows[0], profile_id: profileId };
        if (responseData.item_type === 'digital_form') {
            const formResult = await client.query(
                `SELECT * FROM digital_form_items WHERE profile_item_id = $1 ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
                [itemId]
            );
            if (formResult.rows.length > 0) {
                responseData.digital_form_data = formResult.rows[0];
                if (responseData.digital_form_data.form_fields && typeof responseData.digital_form_data.form_fields === 'string') {
                    try { responseData.digital_form_data.form_fields = JSON.parse(responseData.digital_form_data.form_fields); } catch (_) { responseData.digital_form_data.form_fields = []; }
                }
            } else {
                responseData.digital_form_data = { form_fields: [] };
            }
        }
        if (responseData.item_type === 'guest_list') {
            const glResult = await client.query(
                `SELECT * FROM guest_list_items WHERE profile_item_id = $1 ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
                [itemId]
            );
            responseData.guest_list_data = glResult.rows.length > 0 ? glResult.rows[0] : {};
        }

        // Evitar cache do navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json({ success: true, data: responseData });
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

        // Verificar limite de links (módulo isolado)
        try {
            const linkLimitsService = require('../modules/linkLimits/linkLimits.service');
            const limitCheck = await linkLimitsService.checkLinkLimit(userId, item_type);
            
            if (!limitCheck.allowed) {
                // Buscar sugestão de upgrade
                const upgradeSuggestion = await linkLimitsService.getUpgradeSuggestion(userId, item_type);
                
                return res.status(403).json({
                    error: 'LIMIT_EXCEEDED',
                    message: limitCheck.message || `Você atingiu o limite de ${limitCheck.limit} links do tipo ${item_type} no seu plano atual. Faça upgrade para adicionar mais links!`,
                    current: limitCheck.current,
                    limit: limitCheck.limit,
                    upgrade_suggestion: upgradeSuggestion
                });
            }
        } catch (limitError) {
            // Se houver erro na verificação de limite, logar mas continuar (comportamento seguro)
            console.warn('Erro ao verificar limite de links (continuando):', limitError.message);
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
        
        // Se for contract, criar registro na tabela contract_items
        if (item_type === 'contract') {
            try {
                await client.query(`
                    INSERT INTO contract_items (
                        profile_item_id, contract_title, contract_type, contract_template,
                        require_signature, require_stamp, allow_digital_signature, 
                        allow_photo_signature, stamp_image_url, stamp_text
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    newItem.id,
                    title || 'Contrato Digital',
                    'general',
                    '',
                    true,
                    true,
                    true,
                    true,
                    null,
                    null
                ]);
                console.log(`✅ Contrato criado para item ${newItem.id}`);
            } catch (error) {
                console.error("Erro ao criar contrato:", error);
                // Não falhar a criação do item se falhar criar o contrato
            }
        }
        
        // Se for guest_list, criar registro na tabela guest_list_items
        if (item_type === 'guest_list') {
            try {
                const crypto = require('crypto');
                const registrationToken = crypto.randomBytes(16).toString('hex');
                const confirmationToken = crypto.randomBytes(16).toString('hex');
                
                await client.query(`
                    INSERT INTO guest_list_items (
                        profile_item_id, event_title, event_description, event_date, event_time,
                        event_location, max_guests, require_confirmation, allow_self_registration,
                        registration_token, confirmation_token
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    newItem.id,
                    title || 'Lista de Convidados',
                    null,
                    null,
                    null,
                    null,
                    null,
                    true,
                    true,
                    registrationToken,
                    confirmationToken
                ]);
                console.log(`✅ Lista de convidados criada para item ${newItem.id}`);
            } catch (error) {
                console.error("Erro ao criar lista de convidados:", error);
                // Não falhar a criação do item se falhar criar a lista
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

        // Mensagem amigável para o caso comum: ENUM não atualizado no banco
        // (ex.: invalid input value for enum item_type_enum: "king_selection")
        const isEnumError =
            error && (
                error.code === '22P02' ||
                (typeof error.message === 'string' && error.message.toLowerCase().includes('invalid input value for enum'))
            );

        if (isEnumError) {
            return res.status(500).json({
                message: 'Erro ao criar item: o banco de dados ainda não foi atualizado para este tipo de módulo. Execute as migrations (especialmente a que adiciona o valor no item_type_enum).',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

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


