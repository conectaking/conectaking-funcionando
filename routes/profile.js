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
        res.status(500).json({ message: 'Erro ao buscar dados do perfil.' });
    } finally {
        client.release();
    }
});

router.put('/details', protectUser, async (req, res) => {
    const { displayName, profileImageUrl } = req.body;
    const userId = req.user.userId;

    if (!displayName) {
        return res.status(400).json({ message: 'O nome de exibição é obrigatório.' });
    }

    try {
        const currentProfileRes = await db.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
        
        if (currentProfileRes.rows.length === 0) {
            await db.query(
                'INSERT INTO user_profiles (user_id, display_name, profile_image_url) VALUES ($1, $2, $3)',
                [userId, displayName, profileImageUrl]
            );
            return res.status(200).json({ message: 'Perfil criado e salvo com sucesso!' });
        }

        const currentProfile = currentProfileRes.rows[0];
        const updatedDetails = {
            displayName: displayName, // Sempre atualiza com o que veio
            profileImageUrl: profileImageUrl, // Sempre atualiza com o que veio
            bio: req.body.bio !== undefined ? req.body.bio : currentProfile.bio,
            fontFamily: req.body.fontFamily !== undefined ? req.body.fontFamily : currentProfile.font_family,
            backgroundColor: req.body.backgroundColor !== undefined ? req.body.backgroundColor : currentProfile.background_color,
            textColor: req.body.textColor !== undefined ? req.body.textColor : currentProfile.text_color,
            buttonColor: req.body.buttonColor !== undefined ? req.body.buttonColor : currentProfile.button_color,
            buttonTextColor: req.body.buttonTextColor !== undefined ? req.body.buttonTextColor : currentProfile.button_text_color,
            buttonOpacity: req.body.buttonOpacity !== undefined ? req.body.buttonOpacity : currentProfile.button_opacity,
            buttonBorderRadius: req.body.buttonBorderRadius !== undefined ? req.body.buttonBorderRadius : currentProfile.button_border_radius,
            buttonContentAlign: req.body.buttonContentAlign !== undefined ? req.body.buttonContentAlign : currentProfile.button_content_align,
            backgroundType: req.body.backgroundType !== undefined ? req.body.backgroundType : currentProfile.background_type,
            backgroundImageUrl: req.body.backgroundImageUrl !== undefined ? req.body.backgroundImageUrl : currentProfile.background_image_url,
            cardBackgroundColor: req.body.cardBackgroundColor !== undefined ? req.body.cardBackgroundColor : currentProfile.card_background_color,
            cardOpacity: req.body.cardOpacity !== undefined ? req.body.cardOpacity : currentProfile.card_opacity,
            buttonFontSize: req.body.buttonFontSize !== undefined ? req.body.buttonFontSize : currentProfile.button_font_size,
            backgroundImageOpacity: req.body.backgroundImageOpacity !== undefined ? req.body.backgroundImageOpacity : currentProfile.background_image_opacity,
        };

        await db.query(
            `UPDATE user_profiles SET
                display_name = $1, profile_image_url = $2, bio = $3, font_family = $4,
                background_color = $5, text_color = $6, button_color = $7, button_text_color = $8,
                button_opacity = $9, button_border_radius = $10, button_content_align = $11,
                background_type = $12, background_image_url = $13, card_background_color = $14,
                card_opacity = $15, button_font_size = $16, background_image_opacity = $17
            WHERE user_id = $18`,
            [
                updatedDetails.displayName, updatedDetails.profileImageUrl, updatedDetails.bio, updatedDetails.fontFamily,
                updatedDetails.backgroundColor, updatedDetails.textColor, updatedDetails.buttonColor, updatedDetails.buttonTextColor,
                updatedDetails.buttonOpacity, updatedDetails.buttonBorderRadius, updatedDetails.buttonContentAlign,
                updatedDetails.backgroundType, updatedDetails.backgroundImageUrl, updatedDetails.cardBackgroundColor,
                updatedDetails.cardOpacity, updatedDetails.buttonFontSize, updatedDetails.backgroundImageOpacity,
                userId
            ]
        );

        res.status(200).json({ message: 'Perfil salvo com sucesso!' });

    } catch (error) {
        console.error("Erro ao salvar detalhes do perfil:", error);
        res.status(500).json({ message: 'Erro no servidor ao salvar o perfil.' });
    }
});

router.post('/items', protectUser, async (req, res) => {
    const { item_type } = req.body;
    const userId = req.user.userId;
    
    console.log('=== CRIANDO ITEM ===');
    console.log('item_type recebido:', item_type);
    console.log('tipo do item_type:', typeof item_type);
    console.log('body completo:', JSON.stringify(req.body, null, 2));
    
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const orderResult = await client.query('SELECT COUNT(*) FROM profile_items WHERE user_id = $1', [userId]);
        const nextOrder = parseInt(orderResult.rows[0].count, 10);

        let query, params;
        
        const ALL_COLUMNS = `(user_id, item_type, title, destination_url, icon_class, image_url, pix_key, pdf_url, display_order)`;

        if (['link', 'whatsapp', 'telegram', 'email', 'facebook', 'instagram', 'pinterest', 'reddit', 'tiktok', 'twitch', 'twitter', 'linkedin', 'portfolio', 'youtube', 'spotify'].includes(item_type)) {
            const defaults = {
                link: { title: 'Link Personalizado', url: '#', icon: 'fas fa-link' },
                whatsapp: { title: 'WhatsApp', url: '', icon: 'fab fa-whatsapp' },
                telegram: { title: 'Telegram', url: 'https://t.me/', icon: 'fab fa-telegram' },
                email: { title: 'Email', url: 'seu@email.com', icon: 'fas fa-envelope' },
                facebook: { title: 'Facebook', url: 'https://facebook.com/', icon: 'fab fa-facebook' },
                instagram: { title: 'Instagram', url: 'https://instagram.com/', icon: 'fab fa-instagram' },
                pinterest: { title: 'Pinterest', url: 'https://pinterest.com/', icon: 'fab fa-pinterest' },
                reddit: { title: 'Reddit', url: 'https://reddit.com/u/', icon: 'fab fa-reddit' },
                tiktok: { title: 'TikTok', url: 'https://tiktok.com/@', icon: 'fab fa-tiktok' },
                twitch: { title: 'Twitch', url: 'https://twitch.tv/', icon: 'fab fa-twitch' },
                twitter: { title: 'X / Twitter', url: 'https://x.com/', icon: 'fab fa-twitter' },
                linkedin: { title: 'LinkedIn', url: 'https://linkedin.com/in/', icon: 'fab fa-linkedin' },
                portfolio: { title: 'Meu Portfólio', url: '#', icon: 'fas fa-briefcase' },
                youtube: { title: 'YouTube', url: 'https://youtube.com/', icon: 'fab fa-youtube' },
                spotify: { title: 'Spotify', url: 'https://open.spotify.com/', icon: 'fab fa-spotify' }
            };
            query = `INSERT INTO profile_items ${ALL_COLUMNS} VALUES ($1, $2, $3, $4, $5, null, null, null, $6) RETURNING *;`;
            params = [userId, item_type, defaults[item_type].title, defaults[item_type].url, defaults[item_type].icon, nextOrder];
        
        } else if (item_type === 'banner') {
            const defaultAspectRatio = '4:3';
            query = `INSERT INTO profile_items (user_id, item_type, destination_url, image_url, display_order, aspect_ratio) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
            params = [userId, 'banner', '#', 'https://via.placeholder.com/600x200', nextOrder, defaultAspectRatio];
        } else if (item_type === 'pix') {
            query = `INSERT INTO profile_items ${ALL_COLUMNS} VALUES ($1, $2, $3, '#', $4, null, $5, null, $6) RETURNING *;`;
            params = [userId, 'pix', 'Meu PIX', 'fa-solid fa-copy', 'SuaChavePIXAqui', nextOrder];
        
        } else if (item_type === 'pix_qrcode') {
            query = `INSERT INTO profile_items ${ALL_COLUMNS} VALUES ($1, $2, $3, '#', $4, null, $5, null, $6) RETURNING *;`;
            params = [userId, 'pix_qrcode', 'PIX QR Code', 'fas fa-qrcode', '', nextOrder];

        } else if (item_type === 'pdf') {
            query = `INSERT INTO profile_items ${ALL_COLUMNS} VALUES ($1, $2, $3, '#', $4, null, null, '#', $5) RETURNING *;`;
            params = [userId, 'pdf', 'Baixar PDF', 'fa-solid fa-file-pdf', nextOrder];

        } else if (item_type === 'instagram_embed' || item_type === 'youtube_embed' || item_type === 'tiktok_embed' || item_type === 'spotify_embed' || item_type === 'linkedin_embed' || item_type === 'pinterest_embed') {
            const defaults = {
                instagram_embed: { title: 'Perfil do Instagram', url: 'https://www.instagram.com/seu_usuario/', icon: 'fab fa-instagram' },
                youtube_embed: { title: 'Vídeo do YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', icon: 'fab fa-youtube' },
                tiktok_embed: { title: 'Perfil do TikTok', url: 'https://www.tiktok.com/@seu_usuario', icon: 'fab fa-tiktok' },
                spotify_embed: { title: 'Perfil do Spotify', url: 'https://open.spotify.com/user/seu_usuario', icon: 'fab fa-spotify' },
                linkedin_embed: { title: 'Perfil do LinkedIn', url: 'https://www.linkedin.com/in/seu_perfil', icon: 'fab fa-linkedin' },
                pinterest_embed: { title: 'Perfil do Pinterest', url: 'https://www.pinterest.com/seu_usuario', icon: 'fab fa-pinterest' }
            };
            
            // Validar que o tipo existe nos defaults
            if (!defaults[item_type]) {
                console.error('Tipo de embed não encontrado nos defaults:', item_type);
                return res.status(400).json({ message: `Tipo de item não suportado: ${item_type}` });
            }
            
            const defaultConfig = defaults[item_type];
            query = `INSERT INTO profile_items ${ALL_COLUMNS} VALUES ($1, $2, $3, $4, $5, null, null, null, $6) RETURNING *;`;
            params = [userId, item_type, defaultConfig.title, defaultConfig.url, defaultConfig.icon, nextOrder];
        
        } else if (item_type === 'pdf_embed') {
            query = `INSERT INTO profile_items ${ALL_COLUMNS} VALUES ($1, $2, $3, '#', $4, null, null, '#', $5) RETURNING *;`;
            params = [userId, 'pdf_embed', 'Documento PDF', 'fas fa-file-import', nextOrder];

        } else if (item_type === 'carousel') {
            // Carrossel de imagens - armazena array de URLs em destination_url como JSON
            // image_url armazena a primeira imagem para preview
            // Usando estrutura similar ao banner, mas com title e destination_url como JSON
            const defaultImageUrl = 'https://via.placeholder.com/600x400';
            const defaultImagesArray = JSON.stringify([defaultImageUrl]);
            query = `INSERT INTO profile_items (user_id, item_type, destination_url, image_url, display_order, aspect_ratio) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
            params = [userId, 'carousel', defaultImagesArray, defaultImageUrl, nextOrder, '16:9'];

        } else if (item_type === 'product_catalog') {
            // Catálogo de produtos - destination_url armazena URL do WhatsApp
            // Produtos serão armazenados na tabela product_catalog_items
            query = `INSERT INTO profile_items ${ALL_COLUMNS} VALUES ($1, $2, $3, $4, $5, null, null, null, $6) RETURNING *;`;
            params = [userId, 'product_catalog', 'Minha Loja', '', 'fas fa-store', nextOrder];

        } else {
            console.error('=== ERRO: Tipo de item inválido ===');
            console.error('item_type recebido:', item_type);
            console.error('tipo:', typeof item_type);
            console.error('valor exato:', JSON.stringify(item_type));
            console.error('Comparações:');
            console.error('  - tiktok_embed ===', item_type === 'tiktok_embed');
            console.error('  - spotify_embed ===', item_type === 'spotify_embed');
            console.error('  - linkedin_embed ===', item_type === 'linkedin_embed');
            console.error('  - pinterest_embed ===', item_type === 'pinterest_embed');
            return res.status(400).json({ message: 'Tipo de item inválido.' });
        }

        console.log('Executando query:', { query, params, item_type });
        const result = await client.query(query, params);
        console.log('Query executada com sucesso, resultado:', result.rows[0]);
        await client.query('COMMIT');
        
        // Registrar atividade de criação de link
        try {
            const activityLogger = require('../utils/activityLogger');
            await activityLogger.logLinkCreated(userId, result.rows[0].id, req);
        } catch (activityError) {
            console.warn('Erro ao registrar atividade de criação de link', { error: activityError.message });
        }
        
        res.status(201).json({ message: 'Item adicionado!', item: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("=== ERRO DETALHADO AO ADICIONAR ITEM ===");
        console.error("Erro:", error.message);
        console.error("Código:", error.code);
        console.error("Detalhe:", error.detail);
        console.error("Hint:", error.hint);
        console.error("Stack trace:", error.stack);
        console.error("Query que falhou:", query);
        console.error("Params que falharam:", params);
        console.error("item_type recebido:", item_type);
        console.error("typeof item_type:", typeof item_type);
        console.error("==========================================");
        
        // Em desenvolvimento, retornar mais detalhes
        const errorResponse = {
            success: false,
            message: 'Erro no servidor ao adicionar o item.',
            error: error.message
        };
        
        // Adicionar detalhes extras em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            errorResponse.code = error.code;
            errorResponse.detail = error.detail;
            errorResponse.hint = error.hint;
            errorResponse.item_type = item_type;
        }
        
        res.status(500).json(errorResponse);
    } finally {
        client.release();
    }
});

router.put('/items/:itemId', protectUser, async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.userId;
    const client = await db.pool.connect();

    try {
        const existingItemRes = await client.query('SELECT * FROM profile_items WHERE id = $1 AND user_id = $2', [itemId, userId]);

        if (existingItemRes.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado ou você não tem permissão para editá-lo.' });
        }
        const existingItem = existingItemRes.rows[0];

        // Garantir que is_active seja boolean
        let isActiveValue = existingItem.is_active !== false;
        if (req.body.is_active !== undefined) {
            isActiveValue = req.body.is_active !== false && req.body.is_active !== 'false' && req.body.is_active !== 0 && req.body.is_active !== '0';
        }

        const updatedItem = {
            title: req.body.title !== undefined ? req.body.title : existingItem.title,
            destination_url: req.body.destination_url !== undefined ? req.body.destination_url : existingItem.destination_url,
            icon_class: req.body.icon_class !== undefined ? req.body.icon_class : existingItem.icon_class,
            image_url: req.body.image_url !== undefined ? req.body.image_url : existingItem.image_url,
            logo_size: req.body.logo_size !== undefined ? parseInt(req.body.logo_size) || 24 : (existingItem.logo_size || 24),
            pix_key: req.body.pix_key !== undefined ? req.body.pix_key : existingItem.pix_key,
            pdf_url: req.body.pdf_url !== undefined ? req.body.pdf_url : existingItem.pdf_url,
            whatsapp_message: req.body.whatsapp_message !== undefined ? req.body.whatsapp_message : existingItem.whatsapp_message,
            is_active: isActiveValue
        };

        const query = `
            UPDATE profile_items 
            SET title = $1, destination_url = $2, icon_class = $3, image_url = $4, logo_size = $5, pix_key = $6, pdf_url = $7, whatsapp_message = $8, is_active = $9
            WHERE id = $10 AND user_id = $11
            RETURNING *;
        `;
        const values = [
            updatedItem.title,
            updatedItem.destination_url,
            updatedItem.icon_class,
            updatedItem.image_url,
            updatedItem.logo_size,
            updatedItem.pix_key,
            updatedItem.pdf_url,
            updatedItem.whatsapp_message,
            updatedItem.is_active,
            itemId,
            userId
        ];
        
        const result = await client.query(query, values);
        
        // Registrar atividade de atualização de link
        try {
            const activityLogger = require('../utils/activityLogger');
            await activityLogger.logLinkUpdated(userId, itemId, req);
        } catch (activityError) {
            console.warn('Erro ao registrar atividade de atualização de link', { error: activityError.message });
        }
        
        res.json({ message: 'Item atualizado com sucesso!', item: result.rows[0] });

    } catch (error) {
        console.error("Erro ao atualizar item:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar o item.' });
    } finally {
        client.release();
    }
});

// Rota PATCH específica para atualizar apenas is_active (usada pelo toggle)
router.patch('/items/:itemId', protectUser, async (req, res) => {
    // Suporta atualização de is_active para ativar/desativar módulos
    const { itemId } = req.params;
    const userId = req.user.userId;
    const client = await db.pool.connect();

    try {
        // Verificar se o item existe e pertence ao usuário
        const existingItemRes = await client.query(
            'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2', 
            [itemId, userId]
        );

        if (existingItemRes.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado ou você não tem permissão para editá-lo.' });
        }

        // Garantir que is_active seja boolean
        let isActiveValue = true; // padrão
        if (req.body.is_active !== undefined) {
            isActiveValue = req.body.is_active !== false && 
                          req.body.is_active !== 'false' && 
                          req.body.is_active !== 0 && 
                          req.body.is_active !== '0' &&
                          req.body.is_active !== null;
        }

        // Atualizar apenas is_active
        const updateQuery = `
            UPDATE profile_items 
            SET is_active = $1
            WHERE id = $2 AND user_id = $3
            RETURNING *;
        `;
        
        const result = await client.query(updateQuery, [isActiveValue, itemId, userId]);
        
        console.log(`✅ PATCH: Item ${itemId} atualizado - is_active = ${isActiveValue}`);
        
        res.status(200).json({ 
            message: 'Status do módulo atualizado com sucesso!', 
            item: result.rows[0] 
        });

    } catch (error) {
        console.error("Erro ao atualizar status do item:", error);
        res.status(500).json({ message: 'Erro ao atualizar o status do módulo.' });
    } finally {
        client.release();
    }
});

router.put('/items/order', protectUser, async (req, res) => {
    const { orderedItemIds } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(orderedItemIds)) {
        return res.status(400).json({ message: 'Dados de ordenação inválidos.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        for (let i = 0; i < orderedItemIds.length; i++) {
            const itemId = orderedItemIds[i];
            const order = i; 
            
            await client.query(
                'UPDATE profile_items SET display_order = $1 WHERE id = $2 AND user_id = $3',
                [order, itemId, userId]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Ordem dos itens salva com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("ERRO AO REORDENAR ITENS:", error); 
        res.status(500).json({ message: 'Erro no servidor ao atualizar a ordem.' });
    } finally {
        client.release();
    }
});

router.delete('/items/:itemId', protectUser, async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.userId;
    const client = await db.pool.connect();
    try {
        const result = await client.query('DELETE FROM profile_items WHERE id = $1 AND user_id = $2', [itemId, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Item não encontrado ou você não tem permissão para removê-lo.' });
        }
        
        // Registrar atividade de deleção de link
        try {
            const activityLogger = require('../utils/activityLogger');
            await activityLogger.logLinkDeleted(userId, itemId, req);
        } catch (activityError) {
            console.warn('Erro ao registrar atividade de deleção de link', { error: activityError.message });
        }
        
        res.json({ message: 'Item removido com sucesso!' });
    } catch (error) {
        console.error("Erro ao deletar item:", error);
        res.status(500).json({ message: 'Erro ao remover o item.' });
    } finally {
        client.release();
    }
});

router.put('/save-all', protectUser, async (req, res) => {
    const { details, items } = req.body;
    const userId = req.user.userId;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN'); 

        const profileUpdateQuery = `
            UPDATE user_profiles 
            SET 
                display_name = $1, bio = $2, profile_image_url = $3, font_family = $4,
                background_color = $5, text_color = $6, button_color = $7, button_text_color = $8,
                button_opacity = $9, button_border_radius = $10, button_content_align = $11,
                background_type = $12, background_image_url = $13,
                card_background_color = $14, card_opacity = $15, 
                button_font_size = $16, background_image_opacity = $17,
                show_vcard_button = $18
            WHERE user_id = $19;
        `;
        // Validar e garantir que buttonContentAlign seja sempre 'left', 'center' ou 'right'
        const validAlignments = ['left', 'center', 'right'];
        const buttonContentAlign = validAlignments.includes(details.buttonContentAlign) 
            ? details.buttonContentAlign 
            : 'center';

        await client.query(profileUpdateQuery, [
            details.displayName, details.bio, details.profileImageUrl, details.fontFamily,
            details.backgroundColor, details.textColor, details.buttonColor, details.buttonTextColor,
            details.buttonOpacity, details.buttonBorderRadius, buttonContentAlign,
            details.backgroundType, details.backgroundImageUrl,
            details.cardBackgroundColor, details.cardOpacity,
            details.buttonFontSize, details.backgroundImageOpacity,
            details.showVcardButton,
            userId
        ]);

        if (details.profile_slug) {
            await client.query('UPDATE users SET profile_slug = $1 WHERE id = $2', [details.profile_slug, userId]);
        }

        const itemUpdateQuery = `
            UPDATE profile_items SET
                title = $1,
                destination_url = $2,
                icon_class = $3,
                image_url = $4,
                logo_size = $5,
                pix_key = $6,
                pdf_url = $7,
                aspect_ratio = $8,
                display_order = $9,
                whatsapp_message = $10,
                is_active = $11
            WHERE id = $12 AND user_id = $13;
        `;

        const itemUpdatePromises = items.map(item => {
            // Garantir que title e whatsapp_message sejam tratados corretamente
            const titleValue = item.title !== undefined && item.title !== null ? String(item.title).trim() : null;
            const whatsappValue = item.whatsapp_message !== undefined && item.whatsapp_message !== null ? String(item.whatsapp_message).trim() : null;
            
            // Log para debug (apenas para banners)
            if (item.item_type === 'banner') {
                console.log('Backend - Salvando banner:', {
                    id: item.id,
                    title: titleValue,
                    whatsapp_message: whatsappValue,
                    titleOriginal: item.title,
                    whatsappOriginal: item.whatsapp_message
                });
            }
            
            // Garantir que valores vazios viram null (não string vazia)
            const finalTitleValue = (titleValue && titleValue.trim()) ? titleValue.trim() : null;
            const finalWhatsappValue = (whatsappValue && whatsappValue.trim()) ? whatsappValue.trim() : null;
            
            // Garantir que is_active seja boolean
            const isActive = item.is_active !== false && item.is_active !== 'false' && item.is_active !== 0 && item.is_active !== '0';
            
            return client.query(itemUpdateQuery, [
                finalTitleValue,
                item.destination_url,
                item.icon_class,
                item.image_url,
                item.logo_size !== undefined ? parseInt(item.logo_size) || 24 : 24,
                item.pix_key,
                item.pdf_url,
                item.aspect_ratio,
                item.display_order,
                finalWhatsappValue,
                isActive, // is_active como boolean
                item.id,
                userId
            ]);
        });

        await Promise.all(itemUpdatePromises);

        await client.query('COMMIT');
        
        // Log de sucesso com detalhes dos banners
        const bannerItems = items.filter(item => item.item_type === 'banner');
        if (bannerItems.length > 0) {
            console.log(`✅ ${items.length} itens atualizados. Banners: ${bannerItems.length}`);
            bannerItems.forEach(banner => {
                console.log(`  - Banner ID ${banner.id}: title="${banner.title || '(vazio)'}", whatsapp_message="${banner.whatsapp_message || '(vazio)'}"`);
            });
        } else {
            console.log(`✅ ${items.length} itens atualizados com sucesso`);
        }
        
        // Registrar atividade de atualização de perfil
        try {
            const activityLogger = require('../utils/activityLogger');
            const updatedFields = Object.keys(details).filter(key => details[key] !== undefined);
            await activityLogger.logProfileUpdate(userId, req, updatedFields);
        } catch (activityError) {
            console.warn('Erro ao registrar atividade de atualização de perfil', { error: activityError.message });
        }
        
        res.status(200).json({ message: 'Todas as alterações foram salvas com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error("ERRO AO SALVAR TUDO:", error);
        res.status(500).json({ message: 'Ocorreu um erro no servidor ao salvar os dados.' });
    } finally {
        client.release();
    }
});

// Rota para salvar tema global
router.post('/theme', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { theme } = req.body;
        
        if (!theme) {
            return res.status(400).json({ message: 'Tema não fornecido.' });
        }
        
        // Salvar tema na tabela de usuários ou criar coluna se não existir
        // Por enquanto, vamos usar uma tabela de preferências ou adicionar na tabela users
        const updateQuery = `
            UPDATE users 
            SET theme = $1 
            WHERE id = $2
            RETURNING theme;
        `;
        
        // Se a coluna não existir, criar
        try {
            await client.query(updateQuery, [theme, userId]);
            res.json({ message: 'Tema salvo com sucesso.', theme });
        } catch (err) {
            // Se a coluna não existir, criar e tentar novamente
            if (err.message.includes('column') && err.message.includes('does not exist')) {
                await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(50) DEFAULT \'gold\'');
                await client.query(updateQuery, [theme, userId]);
                res.json({ message: 'Tema salvo com sucesso.', theme });
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('Erro ao salvar tema:', error);
        res.status(500).json({ message: 'Erro ao salvar tema.' });
    } finally {
        client.release();
    }
});

// Rota para obter tema
router.get('/theme', protectUser, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const themeQuery = 'SELECT theme FROM users WHERE id = $1';
        const result = await client.query(themeQuery, [userId]);
        
        const theme = result.rows[0]?.theme || 'gold';
        res.json({ theme });
    } catch (error) {
        console.error('Erro ao obter tema:', error);
        res.json({ theme: 'gold' }); // Default
    } finally {
        client.release();
    }
});

module.exports = router;
