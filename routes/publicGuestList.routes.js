const express = require('express');
const router = express.Router();
const portariaRouter = express.Router();
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /guest-list/register/:token - Página pública de inscrição
 */
router.get('/register/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        
        // Buscar lista pelo token (incluindo campos de estilo)
        const listResult = await client.query(`
            SELECT 
                gli.*,
                gli.primary_color,
                gli.text_color,
                gli.background_color,
                gli.header_image_url,
                gli.background_image_url,
                gli.background_opacity,
                gli.theme,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE gli.registration_token = $1 AND pi.is_active = true
        `, [token]);
        
        // Parsear custom_form_fields se for string
        if (listResult.rows.length > 0 && listResult.rows[0].custom_form_fields) {
            if (typeof listResult.rows[0].custom_form_fields === 'string') {
                try {
                    listResult.rows[0].custom_form_fields = JSON.parse(listResult.rows[0].custom_form_fields);
                } catch (e) {
                    listResult.rows[0].custom_form_fields = [];
                }
            }
        }
        
        // Garantir que os campos de estilo estejam presentes (valores padrão se não existirem)
        if (listResult.rows.length > 0) {
            const row = listResult.rows[0];
            row.primary_color = row.primary_color || '#FFC700';
            row.text_color = row.text_color || '#ECECEC';
            row.background_color = row.background_color || '#0D0D0F';
            row.background_opacity = row.background_opacity !== undefined ? parseFloat(row.background_opacity) : 1.0;
            row.theme = row.theme || 'dark';
        }
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link de inscrição inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Parsear custom_form_fields se for string
        if (guestList.custom_form_fields && typeof guestList.custom_form_fields === 'string') {
            try {
                guestList.custom_form_fields = JSON.parse(guestList.custom_form_fields);
            } catch (e) {
                guestList.custom_form_fields = [];
            }
        } else if (!guestList.custom_form_fields) {
            guestList.custom_form_fields = [];
        }
        
        // Garantir que os campos de estilo estejam presentes (valores padrão se não existirem)
        guestList.primary_color = guestList.primary_color || '#FFC700';
        guestList.text_color = guestList.text_color || '#ECECEC';
        guestList.background_color = guestList.background_color || '#0D0D0F';
        guestList.background_opacity = guestList.background_opacity !== undefined && guestList.background_opacity !== null ? parseFloat(guestList.background_opacity) : 1.0;
        guestList.theme = guestList.theme || 'dark';
        
        // Verificar se ainda há vagas
        const countResult = await client.query(`
            SELECT COUNT(*) as count FROM guests WHERE guest_list_id = $1
        `, [guestList.id]);
        
        const currentCount = parseInt(countResult.rows[0].count);
        const isFull = guestList.max_guests && currentCount >= guestList.max_guests;
        
        res.render('guestListRegister', {
            guestList,
            isFull,
            canRegister: guestList.allow_self_registration && !isFull,
            currentCount,
            maxGuests: guestList.max_guests
        });
    } catch (error) {
        logger.error('Erro ao carregar página de inscrição:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página de inscrição',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /guest-list/confirm/:token - Página pública de confirmação (ou itemId)
 */
router.get('/confirm/:identifier', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { identifier } = req.params;
        const tab = req.query.tab || 'confirmation';
        
        let listResult;
        
        // Tentar buscar por token primeiro
        listResult = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE gli.confirmation_token = $1 AND pi.is_active = true
        `, [identifier]);
        
        // Se não encontrou por token, tentar por itemId (profile_item_id)
        if (listResult.rows.length === 0) {
            const itemId = parseInt(identifier, 10);
            if (!isNaN(itemId)) {
                listResult = await client.query(`
                    SELECT 
                        gli.*,
                        pi.id as profile_item_id,
                        pi.title,
                        pi.user_id,
                        u.profile_slug
                    FROM guest_list_items gli
                    INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                    INNER JOIN users u ON u.id = pi.user_id
                    WHERE pi.id = $1 AND pi.is_active = true
                `, [itemId]);
            }
        }
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link de confirmação inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Garantir valores padrão
        if (!guestList.primary_color) guestList.primary_color = '#FFC700';
        if (!guestList.secondary_color) guestList.secondary_color = '#FFB700';
        if (!guestList.text_color) guestList.text_color = '#ECECEC';
        if (!guestList.background_color) guestList.background_color = '#0D0D0F';
        if (guestList.background_opacity === null || guestList.background_opacity === undefined) guestList.background_opacity = 1.0;
        if (!guestList.theme_confirmacao) guestList.theme_confirmacao = 'default';
        
        // Aplicar tema pré-definido se selecionado
        if (guestList.theme_confirmacao && guestList.theme_confirmacao !== 'default') {
            const themes = {
                dark: { primary: '#FFC700', secondary: '#FFB700', text: '#ECECEC', background: '#0D0D0F' },
                light: { primary: '#4A90E2', secondary: '#357ABD', text: '#333333', background: '#FFFFFF' },
                premium: { primary: '#667EEA', secondary: '#764BA2', text: '#FFFFFF', background: '#1A1A2E' },
                modern: { primary: '#F093FB', secondary: '#F5576C', text: '#FFFFFF', background: '#0D0D0F' },
                elegant: { primary: '#D4AF37', secondary: '#B8860B', text: '#ECECEC', background: '#1C1C1C' }
            };
            
            if (themes[guestList.theme_confirmacao] && !guestList.primary_color_override) {
                guestList.primary_color = themes[guestList.theme_confirmacao].primary;
                guestList.secondary_color = themes[guestList.theme_confirmacao].secondary;
                guestList.text_color = themes[guestList.theme_confirmacao].text;
                guestList.background_color = themes[guestList.theme_confirmacao].background;
            }
        }
        
        // Buscar convidados para confirmação (status: registered)
        const guestsResult = await client.query(`
            SELECT id, name, email, phone, status, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status = 'registered'
            ORDER BY created_at DESC
        `, [guestList.id]);
        
        const guests = guestsResult.rows || [];
        res.render('guestListConfirm', {
            guestList,
            guests,
            token: guestList.confirmation_token || identifier,
            profileItemId: guestList.profile_item_id,
            tab: tab,
            viewOnly: false
        });
    } catch (error) {
        logger.error('Erro ao carregar página de confirmação:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página de confirmação',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /guest-list/view-confirmed/:token - Página pública para ver lista de confirmados usando token
 */
router.get('/view-confirmed/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        const tab = req.query.tab || 'confirmed';
        
        // Buscar lista pelo token de confirmação
        const listResult = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE gli.confirmation_token = $1 AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Garantir valores padrão
        if (!guestList.primary_color) guestList.primary_color = '#FFC700';
        if (!guestList.secondary_color) guestList.secondary_color = '#FFB700';
        if (!guestList.text_color) guestList.text_color = '#ECECEC';
        if (!guestList.background_color) guestList.background_color = '#0D0D0F';
        if (guestList.background_opacity === null || guestList.background_opacity === undefined) guestList.background_opacity = 1.0;
        if (!guestList.theme_confirmacao) guestList.theme_confirmacao = 'default';
        
        // Aplicar tema pré-definido se selecionado
        if (guestList.theme_confirmacao && guestList.theme_confirmacao !== 'default') {
            const themes = {
                dark: { primary: '#FFC700', secondary: '#FFB700', text: '#ECECEC', background: '#0D0D0F' },
                light: { primary: '#4A90E2', secondary: '#357ABD', text: '#333333', background: '#FFFFFF' },
                premium: { primary: '#667EEA', secondary: '#764BA2', text: '#FFFFFF', background: '#1A1A2E' },
                modern: { primary: '#F093FB', secondary: '#F5576C', text: '#FFFFFF', background: '#0D0D0F' },
                elegant: { primary: '#D4AF37', secondary: '#B8860B', text: '#ECECEC', background: '#1C1C1C' }
            };
            
            if (themes[guestList.theme_confirmacao] && !guestList.primary_color_override) {
                guestList.primary_color = themes[guestList.theme_confirmacao].primary;
                guestList.secondary_color = themes[guestList.theme_confirmacao].secondary;
                guestList.text_color = themes[guestList.theme_confirmacao].text;
                guestList.background_color = themes[guestList.theme_confirmacao].background;
            }
        }
        
        // Buscar convidados confirmados e conferidos
        const confirmedResult = await client.query(`
            SELECT id, name, email, phone, status, confirmed_at, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status = 'confirmed'
            ORDER BY confirmed_at DESC, created_at DESC
        `, [guestList.id]);
        
        const checkedInResult = await client.query(`
            SELECT id, name, email, phone, status, checked_in_at, confirmed_at, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status = 'checked_in'
            ORDER BY checked_in_at DESC
        `, [guestList.id]);
        
        const registeredResult = await client.query(`
            SELECT id, name, email, phone, status, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status = 'registered'
            ORDER BY created_at DESC
        `, [guestList.id]);
        
        res.render('guestListConfirm', {
            guestList,
            guests: confirmedResult.rows,
            checkedInGuests: checkedInResult.rows,
            registeredGuests: registeredResult.rows,
            token: token,
            profileItemId: guestList.profile_item_id,
            tab: tab,
            viewOnly: true
        });
    } catch (error) {
        logger.error('Erro ao carregar página de visualização:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /guest-list/view/:itemId - Página pública para ver lista de confirmados
 */
router.get('/view/:itemId', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { itemId } = req.params;
        const tab = req.query.tab || 'confirmed';
        
        // Buscar lista pelo itemId
        const listResult = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE pi.id = $1 AND pi.is_active = true
        `, [itemId]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Lista não encontrada',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Buscar convidados confirmados
        const guestsResult = await client.query(`
            SELECT id, name, email, phone, status, confirmed_at, created_at
            FROM guests
            WHERE guest_list_id = $1 AND (status = 'confirmed' OR status = 'checked_in')
            ORDER BY confirmed_at DESC, created_at DESC
        `, [guestList.id]);
        
        res.render('guestListConfirm', {
            guestList,
            guests: guestsResult.rows,
            token: guestList.confirmation_token || itemId,
            profileItemId: guestList.profile_item_id,
            tab: tab,
            viewOnly: true
        });
    } catch (error) {
        logger.error('Erro ao carregar página de visualização:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * Handler compartilhado: visualização completa da portaria (usado em GET /portaria/:token).
 * GET /guest-list/view-full/:token redireciona 301 para /portaria/:token.
 */
const renderPortariaViewFull = asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        
        // Buscar lista pelo public_view_token, confirmation_token ou portaria_slug
        // IMPORTANTE: Incluir campos de logo e banner para personalização
        // Usar abordagem segura verificando se as colunas existem
        let listResult;
        try {
            // Primeiro, verificar quais colunas de logo existem
            const logoColumnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'guest_list_items' 
                AND column_name IN ('form_logo_url', 'button_logo_url', 'button_logo_size', 'show_logo_corner')
            `);
            
            const existingLogoColumns = logoColumnsCheck.rows.map(r => r.column_name);
            const hasFormLogoUrl = existingLogoColumns.includes('form_logo_url');
            const hasButtonLogoUrl = existingLogoColumns.includes('button_logo_url');
            const hasButtonLogoSize = existingLogoColumns.includes('button_logo_size');
            const hasShowLogoCorner = existingLogoColumns.includes('show_logo_corner');
            
            // Construir SELECT dinamicamente
            let selectFields = `
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id,
                u.profile_slug,
                COALESCE(gli.primary_color, '#FFC700') as primary_color,
                COALESCE(gli.secondary_color, '#FFB700') as secondary_color,
                COALESCE(gli.text_color, '#ECECEC') as text_color,
                COALESCE(gli.background_color, '#0D0D0F') as background_color,
                gli.header_image_url,
                gli.background_image_url,
                COALESCE(gli.background_opacity, 1.0) as background_opacity,
                gli.event_date,
                gli.event_location,
                gli.event_description`;
            
            if (hasFormLogoUrl) selectFields += ', gli.form_logo_url';
            if (hasButtonLogoUrl) selectFields += ', gli.button_logo_url';
            if (hasButtonLogoSize) selectFields += ', gli.button_logo_size';
            if (hasShowLogoCorner) selectFields += ', gli.show_logo_corner';
            
            // Adicionar campos de tema se existirem
            const themeColumnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'guest_list_items' 
                AND column_name IN ('theme_portaria', 'theme_confirmacao')
            `);
            const existingThemeColumns = themeColumnsCheck.rows.map(r => r.column_name);
            if (existingThemeColumns.includes('theme_portaria')) selectFields += ', gli.theme_portaria';
            if (existingThemeColumns.includes('theme_confirmacao')) selectFields += ', gli.theme_confirmacao';
            
            listResult = await client.query(`
                SELECT ${selectFields}
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                INNER JOIN users u ON u.id = pi.user_id
                WHERE (
                    gli.public_view_token = $1 
                    OR gli.confirmation_token = $1 
                    OR gli.portaria_slug = $1
                ) AND pi.is_active = true
            `, [token]);
        } catch (queryError) {
            // Se der erro, tentar query mais simples sem campos de logo
            logger.warn('Erro ao buscar com campos de logo, tentando query simples:', queryError);
            listResult = await client.query(`
                SELECT 
                    gli.*,
                    pi.id as profile_item_id,
                    pi.title,
                    pi.user_id,
                    u.profile_slug,
                    COALESCE(gli.primary_color, '#FFC700') as primary_color,
                    COALESCE(gli.secondary_color, '#FFB700') as secondary_color,
                    COALESCE(gli.text_color, '#ECECEC') as text_color,
                    COALESCE(gli.background_color, '#0D0D0F') as background_color,
                    gli.header_image_url,
                    gli.background_image_url,
                    COALESCE(gli.background_opacity, 1.0) as background_opacity,
                    gli.event_date,
                    gli.event_location,
                    gli.event_description,
                    COALESCE(gli.theme_portaria, 'default') as theme_portaria,
                    COALESCE(gli.theme_confirmacao, 'default') as theme_confirmacao
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                INNER JOIN users u ON u.id = pi.user_id
                WHERE (
                    gli.public_view_token = $1 
                    OR gli.confirmation_token = $1 
                    OR gli.portaria_slug = $1
                ) AND pi.is_active = true
            `, [token]);
        }
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // IMPORTANTE: Portaria usa APENAS cores de guest_list_items, NUNCA de digital_form_items
        // Garantir que campos opcionais existam com valores padrão
        if (!guestList.primary_color) guestList.primary_color = '#FFC700';
        if (!guestList.secondary_color) guestList.secondary_color = '#FFB700';
        if (!guestList.text_color) guestList.text_color = '#ECECEC';
        if (!guestList.background_color) guestList.background_color = '#0D0D0F';
        if (guestList.background_opacity === null || guestList.background_opacity === undefined) guestList.background_opacity = 1.0;
        if (!guestList.theme_portaria) guestList.theme_portaria = 'default';
        
        logger.info(`🎨 [PORTARIA] Cores carregadas APENAS de guest_list_items:`, {
            primary_color: guestList.primary_color,
            secondary_color: guestList.secondary_color,
            text_color: guestList.text_color,
            background_color: guestList.background_color,
            profile_item_id: guestList.profile_item_id
        });
        
        // Aplicar tema pré-definido se selecionado (mesmas definições da tela Personalizar Portaria)
        if (guestList.theme_portaria && guestList.theme_portaria !== 'default') {
            const themes = {
                dark: { primary: '#1C1C21', secondary: '#0D0D0F', text: '#E0E0E0', background: '#0D0D0F' },
                black: { primary: '#2D2D2D', secondary: '#000000', text: '#FFFFFF', background: '#0A0A0A' },
                light: { primary: '#4A90E2', secondary: '#357ABD', text: '#333333', background: '#FFFFFF' },
                'red-black': { primary: '#DC2626', secondary: '#000000', text: '#FFFFFF', background: '#1A1A1A' },
                premium: { primary: '#667EEA', secondary: '#764BA2', text: '#FFFFFF', background: '#1A1A2E' },
                'premium-gold': { primary: '#D4AF37', secondary: '#B8860B', text: '#1A1A1A', background: '#1C1C1C' },
                golden: { primary: '#FFD700', secondary: '#B8860B', text: '#1A1A1A', background: '#2C2416' },
                'premium-red': { primary: '#DC2626', secondary: '#991B1B', text: '#FFFFFF', background: '#0D0D0F' },
                modern: { primary: '#F093FB', secondary: '#F5576C', text: '#FFFFFF', background: '#0D0D0F' },
                elegant: { primary: '#434343', secondary: '#000000', text: '#ECECEC', background: '#1C1C1C' },
                blue: { primary: '#3B82F6', secondary: '#1D4ED8', text: '#FFFFFF', background: '#0F172A' },
                green: { primary: '#22C55E', secondary: '#15803D', text: '#FFFFFF', background: '#0D0D0F' },
                ocean: { primary: '#06B6D4', secondary: '#0891B2', text: '#FFFFFF', background: '#0C4A6E' },
                violet: { primary: '#8B5CF6', secondary: '#6D28D9', text: '#FFFFFF', background: '#1E1B4B' }
            };
            if (themes[guestList.theme_portaria] && !guestList.primary_color_override) {
                guestList.primary_color = themes[guestList.theme_portaria].primary;
                guestList.secondary_color = themes[guestList.theme_portaria].secondary;
                guestList.text_color = themes[guestList.theme_portaria].text;
                guestList.background_color = themes[guestList.theme_portaria].background;
            }
        }
        
        // Parsear custom_form_fields se for string
        if (guestList.custom_form_fields && typeof guestList.custom_form_fields === 'string') {
            try {
                guestList.custom_form_fields = JSON.parse(guestList.custom_form_fields);
            } catch (e) {
                guestList.custom_form_fields = [];
            }
        }
        
        // Buscar form_fields do formulário para mapear labels
        let formFields = [];
        try {
            const formFieldsRes = await client.query(`
                SELECT form_fields FROM digital_form_items 
                WHERE profile_item_id = $1
                ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1
            `, [guestList.profile_item_id]);
            
            if (formFieldsRes.rows.length > 0 && formFieldsRes.rows[0].form_fields) {
                const fields = formFieldsRes.rows[0].form_fields;
                if (typeof fields === 'string') {
                    formFields = JSON.parse(fields);
                } else if (Array.isArray(fields)) {
                    formFields = fields;
                }
            }
        } catch (e) {
            logger.warn('Erro ao buscar form_fields:', e);
        }
        
        // Buscar todos os convidados por status
        // IMPORTANTE: "Cadastrados" deve mostrar TODOS os convidados, independente do status
        const allGuestsResult = await client.query(`
            SELECT id, name, email, phone, whatsapp, document, address, neighborhood, city, state, zipcode, instagram, status, created_at, confirmed_at, checked_in_at, custom_responses
            FROM guests
            WHERE guest_list_id = $1
            ORDER BY 
                CASE status 
                    WHEN 'checked_in' THEN 1
                    WHEN 'confirmed' THEN 2
                    WHEN 'registered' THEN 3
                    ELSE 4
                END,
                name ASC
        `, [guestList.id]);
        
        // Separar por status para as abas específicas
        const registeredResult = { rows: (allGuestsResult.rows || []).filter(g => g.status === 'registered') };
        const confirmedResult = { rows: (allGuestsResult.rows || []).filter(g => g.status === 'confirmed') };
        const checkedInResult = { rows: (allGuestsResult.rows || []).filter(g => g.status === 'checked_in') };
        
        // "Quem Não Chegou" = todos que NÃO têm status 'checked_in' (registered, confirmed, etc)
        const notArrivedResult = { rows: (allGuestsResult.rows || []).filter(g => g.status !== 'checked_in') };
        
        // Para a aba "Cadastrados" (registered), usar TODOS os convidados
        const registeredGuests = allGuestsResult.rows || [];
        
        // Log detalhado dos resultados
        logger.info('📊 [GUEST-LIST-VIEW-FULL] Resultados da filtragem:', {
            total: allGuestsResult.rows.length,
            checkedIn: checkedInResult.rows.length,
            notArrived: notArrivedResult.rows.length,
            registered: registeredResult.rows.length,
            confirmed: confirmedResult.rows.length
        });
        
        // Log de exemplo dos primeiros convidados de cada categoria
        if (checkedInResult.rows.length > 0) {
            logger.info('📊 [GUEST-LIST-VIEW-FULL] Primeiro checkedIn:', {
                id: checkedInResult.rows[0].id,
                name: checkedInResult.rows[0].name,
                status: checkedInResult.rows[0].status,
                checked_in_at: checkedInResult.rows[0].checked_in_at
            });
        } else {
            logger.warn('⚠️ [GUEST-LIST-VIEW-FULL] Nenhum convidado checked_in encontrado!');
        }
        
        if (notArrivedResult.rows.length > 0) {
            logger.info('📊 [GUEST-LIST-VIEW-FULL] Primeiro notArrived:', {
                id: notArrivedResult.rows[0].id,
                name: notArrivedResult.rows[0].name,
                status: notArrivedResult.rows[0].status
            });
        } else {
            logger.warn('⚠️ [GUEST-LIST-VIEW-FULL] Nenhum convidado notArrived encontrado!');
        }
        
        // Log para debug
        logger.info('📊 [GUEST-LIST-VIEW-FULL] Estatísticas de convidados:', {
            total: allGuestsResult.rows.length,
            checkedIn: checkedInResult.rows.length,
            notArrived: notArrivedResult.rows.length,
            registered: registeredResult.rows.length,
            confirmed: confirmedResult.rows.length,
            guestListId: guestList.id
        });
        
        // Log detalhado dos status
        const statusCounts = {};
        allGuestsResult.rows.forEach(guest => {
            const status = guest.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        logger.info('📊 [GUEST-LIST-VIEW-FULL] Distribuição de status:', statusCounts);
        
        // Log de exemplo dos primeiros convidados de cada categoria
        if (checkedInResult.rows.length > 0) {
            logger.info('📊 [GUEST-LIST-VIEW-FULL] Exemplo checkedIn:', {
                id: checkedInResult.rows[0].id,
                name: checkedInResult.rows[0].name,
                status: checkedInResult.rows[0].status
            });
        }
        if (notArrivedResult.rows.length > 0) {
            logger.info('📊 [GUEST-LIST-VIEW-FULL] Exemplo notArrived:', {
                id: notArrivedResult.rows[0].id,
                name: notArrivedResult.rows[0].name,
                status: notArrivedResult.rows[0].status
            });
        }
        
        // Garantir que formFields seja sempre um array
        if (!Array.isArray(formFields)) {
            formFields = [];
        }
        
        // Função helper para formatar data no timezone de Brasília
        const formatDateBrasilia = (dateString) => {
            if (!dateString) return '-';
            try {
                const date = new Date(dateString);
                // Converter para timezone de Brasília (America/Sao_Paulo = UTC-3)
                return date.toLocaleString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            } catch (e) {
                console.error('Erro ao formatar data:', e);
                return dateString;
            }
        };
        
        const formatDateOnlyBrasilia = (dateString) => {
            if (!dateString) return '-';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {
                console.error('Erro ao formatar data:', e);
                return dateString;
            }
        };
        
        // Garantir que os arrays não sejam undefined
        const checkedInGuestsArray = Array.isArray(checkedInResult.rows) ? checkedInResult.rows : [];
        const notArrivedGuestsArray = Array.isArray(notArrivedResult.rows) ? notArrivedResult.rows : [];
        const confirmedGuestsArray = Array.isArray(confirmedResult.rows) ? confirmedResult.rows : [];
        const registeredGuestsArray = Array.isArray(registeredGuests) ? registeredGuests : [];
        
        logger.info('📊 [GUEST-LIST-VIEW-FULL] Arrays preparados para renderização:', {
            checkedInGuests: checkedInGuestsArray.length,
            notArrivedGuests: notArrivedGuestsArray.length,
            confirmedGuests: confirmedGuestsArray.length,
            registeredGuests: registeredGuestsArray.length,
            guestListId: guestList.id
        });
        
        // Garantir que todos os arrays sejam arrays válidos (não undefined, não null)
        const finalCheckedInGuests = Array.isArray(checkedInGuestsArray) ? checkedInGuestsArray : [];
        const finalNotArrivedGuests = Array.isArray(notArrivedGuestsArray) ? notArrivedGuestsArray : [];
        const finalConfirmedGuests = Array.isArray(confirmedGuestsArray) ? confirmedGuestsArray : [];
        const finalRegisteredGuests = Array.isArray(registeredGuestsArray) ? registeredGuestsArray : [];
        
        logger.info('📊 [GUEST-LIST-VIEW-FULL] Arrays finais para renderização:', {
            checkedInGuests: finalCheckedInGuests.length,
            notArrivedGuests: finalNotArrivedGuests.length,
            confirmedGuests: finalConfirmedGuests.length,
            registeredGuests: finalRegisteredGuests.length,
            guestListId: guestList.id
        });
        
        res.render('guestListViewFull', {
            guestList,
            registeredGuests: finalRegisteredGuests, // TODOS os convidados (para aba Cadastrados)
            confirmedGuests: finalConfirmedGuests,
            checkedInGuests: finalCheckedInGuests,
            notArrivedGuests: finalNotArrivedGuests, // Quem não chegou = todos que NÃO têm status 'checked_in'
            token: token,
            profileItemId: guestList.profile_item_id,
            formFields: formFields, // Campos do formulário para mapear labels
            formatDateBrasilia: formatDateBrasilia, // Função helper para formatar datas
            formatDateOnlyBrasilia: formatDateOnlyBrasilia // Função helper para formatar apenas data
        });
    } catch (error) {
        logger.error('Erro ao carregar visualização completa:', error);
        logger.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

/** Redirect: /guest-list/view-full/:token → /portaria/:token (link curto) */
router.get('/view-full/:token', (req, res) => res.redirect(301, '/portaria/' + encodeURIComponent(req.params.token)));

/** GET /portaria/:token - Link curto da portaria (visualização completa) */
portariaRouter.get('/:token', renderPortariaViewFull);

/**
 * POST /guest-list/view-full/:token/checkin/:guestId - Confirmar chegada (portaria pública)
 * POST /portaria/:token/checkin/:guestId - Mesmo, via link curto.
 */
const portariaCheckinHandler = asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token, guestId } = req.params;
        
        // Buscar lista pelo token (incluindo portaria_slug)
        const listResult = await client.query(`
            SELECT gli.*, pi.id as profile_item_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE (
                gli.public_view_token = $1 
                OR gli.confirmation_token = $1 
                OR gli.portaria_slug = $1
            ) AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestList = listResult.rows[0];
        const guestIdInt = parseInt(guestId, 10);
        
        // Verificar se o convidado existe e pertence à lista
        const guestResult = await client.query(`
            SELECT id, name, status FROM guests 
            WHERE id = $1 AND guest_list_id = $2
        `, [guestIdInt, guestList.id]);
        
        if (guestResult.rows.length === 0) {
            return res.status(404).json({ message: 'Convidado não encontrado' });
        }
        
        // Atualizar status para checked_in
        const updateResult = await client.query(`
            UPDATE guests 
            SET status = 'checked_in', 
                checked_in_at = NOW(),
                updated_at = NOW()
            WHERE id = $1 AND guest_list_id = $2
            RETURNING id, name, status, checked_in_at
        `, [guestIdInt, guestList.id]);
        
        if (updateResult.rows.length === 0) {
            return res.status(500).json({ message: 'Erro ao atualizar status' });
        }
        
        res.json({
            success: true,
            message: 'Chegada confirmada com sucesso',
            guest: updateResult.rows[0]
        });
    } catch (error) {
        logger.error('Erro ao confirmar chegada:', error);
        res.status(500).json({ message: 'Erro ao confirmar chegada', error: error.message });
    } finally {
        client.release();
    }
});

router.post('/view-full/:token/checkin/:guestId', portariaCheckinHandler);
portariaRouter.post('/:token/checkin/:guestId', portariaCheckinHandler);

/**
 * GET /guest-list/verify/qr/:qrToken - Verificar dados do cliente pelo QR Code (sem confirmar)
 */
router.get('/verify/qr/:qrToken', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { qrToken } = req.params;
        
        // Normalizar token (remover espaços e caracteres especiais)
        const normalizedToken = (qrToken || '').trim();
        
        if (!normalizedToken || normalizedToken.length < 32) {
            logger.warn('⚠️ [QR_VERIFY] Token inválido (muito curto):', {
                length: normalizedToken ? normalizedToken.length : 0
            });
            return res.status(400).json({ 
                success: false, 
                message: 'QR Code inválido. O token está muito curto.' 
            });
        }
        
        logger.info('🔍 [QR_VERIFY] Verificando QR Code:', {
            qrTokenLength: normalizedToken.length,
            qrTokenPrefix: normalizedToken.substring(0, 16) + '...'
        });
        
        // Buscar convidado pelo qr_token
        const guestResult = await client.query(`
            SELECT 
                g.*, 
                gli.public_view_token, 
                gli.profile_item_id, 
                gli.event_date,
                gli.event_title,
                gli.event_location,
                pi.title as form_title
            FROM guests g
            INNER JOIN guest_list_items gli ON gli.id = g.guest_list_id
            LEFT JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE g.qr_token = $1
        `, [normalizedToken]);
        
        if (guestResult.rows.length === 0) {
            logger.warn('⚠️ [QR_VERIFY] QR Code não encontrado:', {
                qrTokenPrefix: normalizedToken.substring(0, 16) + '...'
            });
            return res.status(404).json({ 
                success: false, 
                message: 'QR Code não encontrado. Verifique se o QR Code está correto ou se o convidado foi cadastrado.' 
            });
        }
        
        const guest = guestResult.rows[0];
        
        // Validação de Token com expiração
        if (guest.event_date) {
            const eventDate = new Date(guest.event_date);
            const now = new Date();
            const expirationDate = new Date(eventDate);
            expirationDate.setDate(expirationDate.getDate() + 30);
            
            if (now > expirationDate) {
                return res.status(400).json({
                    success: false,
                    message: 'QR Code expirado. Este código não pode mais ser usado para confirmar presença.',
                    expired: true
                });
            }
        }
        
        // Retornar dados do cliente (sem confirmar ainda)
        res.json({
            success: true,
            guest: {
                id: guest.id,
                name: guest.name,
                email: guest.email,
                whatsapp: guest.whatsapp,
                cpf: guest.cpf,
                status: guest.status,
                checked_in_at: guest.checked_in_at,
                created_at: guest.created_at,
                guest_list_id: guest.guest_list_id
            },
            event: {
                title: guest.event_title || guest.form_title || 'Evento',
                date: guest.event_date,
                location: guest.event_location || ''
            },
            alreadyCheckedIn: guest.status === 'checked_in'
        });
        
    } catch (error) {
        logger.error('❌ [QR_VERIFY] Erro ao verificar QR Code:', {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao verificar QR Code. Tente novamente.',
            ...(process.env.NODE_ENV !== 'production' ? { error: error.message } : {})
        });
    } finally {
        client.release();
    }
}));

/**
 * POST /guest-list/confirm/qr/:qrToken - Confirmar presença via QR Code
 */
router.post('/confirm/qr/:qrToken', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { qrToken } = req.params;
        
        // Normalizar token (remover espaços e caracteres especiais)
        const normalizedToken = (qrToken || '').trim();
        
        if (!normalizedToken || normalizedToken.length < 32) {
            logger.warn('⚠️ [QR_CONFIRM] Token inválido (muito curto):', {
                length: normalizedToken ? normalizedToken.length : 0
            });
            return res.status(400).json({ 
                success: false, 
                message: 'QR Code inválido. O token está muito curto.' 
            });
        }
        
        logger.info('🔍 [QR_CONFIRM] Recebida requisição de confirmação QR Code:', {
            qrTokenLength: normalizedToken.length,
            qrTokenPrefix: normalizedToken.substring(0, 16) + '...'
        });
        
        // Buscar convidado pelo qr_token (Melhoria 15: Validação de Token com expiração)
        // IMPORTANTE: Buscar exatamente como está armazenado (case-sensitive)
        const guestResult = await client.query(`
            SELECT g.*, gli.public_view_token, gli.profile_item_id, gli.event_date
            FROM guests g
            INNER JOIN guest_list_items gli ON gli.id = g.guest_list_id
            WHERE g.qr_token = $1
        `, [normalizedToken]);
        
        logger.info('🔍 [QR_CONFIRM] Resultado da busca:', {
            encontrados: guestResult.rows.length,
            tokenLength: normalizedToken.length
        });
        
        if (guestResult.rows.length === 0) {
            logger.warn('⚠️ [QR_CONFIRM] QR Code não encontrado:', {
                qrTokenPrefix: normalizedToken.substring(0, 16) + '...',
                tokenLength: normalizedToken.length
            });
            return res.status(404).json({ 
                success: false, 
                message: 'QR Code não encontrado. Verifique se o QR Code está correto ou se o convidado foi cadastrado.' 
            });
        }
        
        const guest = guestResult.rows[0];
        
        // Validação de Token com expiração (Melhoria 15)
        // Verificar se o evento ainda está válido (se event_date existir)
        if (guest.event_date) {
            const eventDate = new Date(guest.event_date);
            const now = new Date();
            // Permitir confirmação até 30 dias após o evento
            const expirationDate = new Date(eventDate);
            expirationDate.setDate(expirationDate.getDate() + 30);
            
            if (now > expirationDate) {
                return res.status(400).json({
                    success: false,
                    message: 'QR Code expirado. Este código não pode mais ser usado para confirmar presença.'
                });
            }
        }
        
        // Verificar se já foi confirmado
        if (guest.status === 'checked_in') {
            return res.json({
                success: true,
                message: 'Presença já confirmada anteriormente',
                guest: {
                    id: guest.id,
                    name: guest.name,
                    status: guest.status,
                    checked_in_at: guest.checked_in_at
                }
            });
        }
        
        // Obter status anterior antes de atualizar (Melhoria 7: Histórico)
        const previousStatus = guest.status;
        
        // Confirmar presença
        const updateResult = await client.query(`
            UPDATE guests 
            SET status = 'checked_in', 
                checked_in_at = NOW(),
                confirmed_at = COALESCE(confirmed_at, NOW())
            WHERE id = $1
            RETURNING id, name, email, whatsapp, status, checked_in_at, guest_list_id
        `, [guest.id]);
        
        // Registrar histórico de confirmação (Melhoria 7)
        try {
            const { logConfirmationHistory } = require('../utils/confirmationHistory');
            await logConfirmationHistory({
                guestId: guest.id,
                guestListId: guest.guest_list_id,
                action: 'checked_in',
                previousStatus,
                newStatus: 'checked_in',
                confirmedBy: guest.name || 'Sistema',
                confirmationMethod: 'qr_code',
                req,
                notes: `Confirmado via QR Code (token: ${normalizedToken.substring(0, 16)}...)`
            }).catch(err => logger.warn('Erro ao registrar histórico (não crítico):', err));
        } catch (histErr) {
            // Erro ao registrar histórico não deve impedir a confirmação
            logger.warn('Erro ao registrar histórico (não crítico):', histErr);
        }
        
        logger.info('✅ [QR_CONFIRM] Presença confirmada via QR Code:', {
            guestId: guest.id,
            name: guest.name,
            qrToken: normalizedToken.substring(0, 16) + '...'
        });
        
        res.json({
            success: true,
            message: 'Presença confirmada com sucesso!',
            guest: updateResult.rows[0]
        });
        
    } catch (error) {
        logger.error('❌ [QR_CONFIRM] Erro ao confirmar via QR Code:', {
            error: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        
        // Se já enviou resposta, não enviar novamente
        if (res.headersSent) {
            logger.warn('⚠️ [QR_CONFIRM] Resposta já foi enviada, ignorando erro');
            return;
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao confirmar presença. Tente novamente.',
            ...(process.env.NODE_ENV !== 'production' ? { error: error.message } : {})
        });
    } finally {
        client.release();
    }
}));

/**
 * POST /guest-list/confirm/cpf - Confirmar presença via CPF, Email ou Nome
 */
router.post('/confirm/cpf', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { search, token } = req.body; // Mudou de 'cpf' para 'search' para aceitar qualquer valor
        const cpf = search || req.body.cpf; // Mantém compatibilidade com 'cpf'
        
        if (!search && !cpf) {
            return res.status(400).json({ 
                success: false, 
                message: 'Digite CPF, Email ou Nome para buscar' 
            });
        }
        
        if (!token) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token é obrigatório' 
            });
        }
        
        const searchTerm = (search || cpf || '').trim();
        
        if (searchTerm.length < 2) {
            return res.status(400).json({ 
                success: false, 
                message: 'Digite pelo menos 2 caracteres para buscar' 
            });
        }
        
        // Buscar lista pelo token (incluindo portaria_slug)
        const listResult = await client.query(`
            SELECT gli.id, gli.profile_item_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE (
                gli.public_view_token = $1 
                OR gli.confirmation_token = $1 
                OR gli.portaria_slug = $1
            ) AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Token inválido ou lista não encontrada' 
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Determinar tipo de busca: CPF (numérico) ou Email/Nome (texto)
        const cleanSearch = searchTerm.replace(/\D/g, '');
        const isNumeric = /^\d+$/.test(cleanSearch);
        
        let guestResult;
        
        if (isNumeric && cleanSearch.length >= 3) {
            // Busca por CPF (numérico)
            const isPartial = cleanSearch.length < 11;
            
            if (isPartial) {
                guestResult = await client.query(`
                    SELECT * FROM guests
                    WHERE guest_list_id = $1 
                    AND document IS NOT NULL 
                    AND document != ''
                    AND LENGTH(REGEXP_REPLACE(document, '[^0-9]', '', 'g')) >= $3
                    AND REGEXP_REPLACE(document, '[^0-9]', '', 'g') LIKE $2
                    ORDER BY 
                        CASE 
                            WHEN REGEXP_REPLACE(document, '[^0-9]', '', 'g') = $4 THEN 1
                            ELSE 2
                        END,
                        created_at DESC
                    LIMIT 10
                `, [guestList.id, cleanSearch + '%', cleanSearch.length, cleanSearch]);
            } else {
                guestResult = await client.query(`
                    SELECT * FROM guests
                    WHERE guest_list_id = $1 
                    AND document IS NOT NULL 
                    AND document != ''
                    AND REGEXP_REPLACE(document, '[^0-9]', '', 'g') = $2
                `, [guestList.id, cleanSearch]);
            }
        } else {
            // Busca por Email ou Nome (texto)
            const searchPattern = `%${searchTerm}%`;
            guestResult = await client.query(`
                SELECT * FROM guests
                WHERE guest_list_id = $1 
                AND (
                    name ILIKE $2
                    OR email ILIKE $2
                    OR COALESCE(whatsapp, phone, '') ILIKE $2
                )
                ORDER BY 
                    CASE 
                        WHEN name ILIKE $2 THEN 1
                        WHEN email ILIKE $2 THEN 2
                        ELSE 3
                    END,
                    name ASC
                LIMIT 10
            `, [guestList.id, searchPattern]);
        }
        
        logger.info('🔍 [GUEST_SEARCH] Busca:', {
            searchTerm,
            isNumeric,
            found: guestResult.rows.length,
            guestListId: guestList.id
        });
        
        // Se encontrou múltiplos resultados, retornar lista para o usuário escolher
        if (guestResult.rows.length > 1) {
            return res.json({
                success: false,
                partial: true,
                message: `Encontrados ${guestResult.rows.length} convidados. Digite mais caracteres para refinar a busca.`,
                matches: guestResult.rows.length,
                suggestions: guestResult.rows.slice(0, 5).map(g => ({
                    id: g.id,
                    name: g.name,
                    email: g.email || '-',
                    cpf: g.document ? (g.document.length > 3 ? g.document.substring(0, 3) + '***.***-**' : '***') : '-'
                }))
            });
        }
        
        if (guestResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nenhum convidado encontrado com os dados informados' 
            });
        }
        
        const guest = guestResult.rows[0];
        
        // Verificar se já foi confirmado
        if (guest.status === 'checked_in') {
            return res.json({
                success: true,
                message: 'Presença já confirmada anteriormente',
                guest: {
                    id: guest.id,
                    name: guest.name,
                    status: guest.status,
                    checked_in_at: guest.checked_in_at
                }
            });
        }
        
        // Obter status anterior antes de atualizar (Melhoria 7: Histórico)
        const previousStatus = guest.status;
        
        // Confirmar presença
        const updateResult = await client.query(`
            UPDATE guests 
            SET status = 'checked_in', 
                checked_in_at = NOW(),
                confirmed_at = COALESCE(confirmed_at, NOW())
            WHERE id = $1
            RETURNING id, name, email, whatsapp, status, checked_in_at, guest_list_id
        `, [guest.id]);
        
        // Determinar método de confirmação
        const isNumericSearch = /^\d+$/.test(searchTerm.replace(/\D/g, ''));
        const confirmationMethod = isNumericSearch ? 'cpf' : 'search';
        const methodDescription = isNumericSearch ? 'CPF' : (searchTerm.includes('@') ? 'Email' : 'Nome');
        
        // Registrar histórico de confirmação (Melhoria 7)
        const { logConfirmationHistory } = require('../utils/confirmationHistory');
        await logConfirmationHistory({
            guestId: guest.id,
            guestListId: guest.guest_list_id,
            action: 'checked_in',
            previousStatus,
            newStatus: 'checked_in',
            confirmedBy: guest.name || 'Sistema',
            confirmationMethod: confirmationMethod,
            req,
            notes: `Confirmado via ${methodDescription}`
        }).catch(err => logger.warn('Erro ao registrar histórico:', err));
        
        // Disparar webhooks (Melhoria 20)
        const { triggerWebhooks } = require('../utils/webhookService');
        triggerWebhooks('guest.confirm', {
            guestId: guest.id,
            guestListId: guest.guest_list_id,
            guestName: guest.name,
            status: 'checked_in',
            method: confirmationMethod,
            timestamp: new Date().toISOString()
        }, null).catch(err => logger.warn('Erro ao disparar webhooks:', err));
        
        logger.info(`✅ [GUEST_CONFIRM] Presença confirmada via ${methodDescription}:`, {
            guestId: guest.id,
            name: guest.name,
            searchTerm: searchTerm.substring(0, 10) + '...'
        });
        
        res.json({
            success: true,
            message: 'Presença confirmada com sucesso!',
            guest: updateResult.rows[0]
        });
        
    } catch (error) {
        logger.error('❌ [CPF_CONFIRM] Erro ao confirmar via CPF:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao confirmar presença. Tente novamente.' 
        });
    } finally {
        client.release();
    }
}));

module.exports = router;
module.exports.portaria = portariaRouter;

