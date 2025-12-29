const express = require('express');
const db = require('../db');
const router = express.Router();
const { convertYouTubeUrlToEmbed } = require('../utils/youtube');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const fetch = require('node-fetch');

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 20, g: 20, b: 23 }; 
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 20, g: 20, b: 23 };
}

router.get('/:identifier', asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    
    // Headers para evitar cache no navegador
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const client = await db.pool.connect();
    
    try {
        const userRes = await client.query('SELECT id, account_type FROM users WHERE profile_slug = $1 OR id = $1', [identifier]);
        
        if (userRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não encontrado</h1>');
        }

        const user = userRes.rows[0];

        if (user.account_type === 'free') {
            return res.render('inactive_profile');
        }

        const userId = user.id;

        const profileQuery = `
            SELECT 
                u.id AS user_id,
                u.profile_slug,
                p.*,
                CASE
                    WHEN u.account_type = 'business_owner' THEN u.company_logo_url
                    ELSE parent.company_logo_url
                END AS company_logo_url,
                CASE
                    WHEN u.account_type = 'business_owner' THEN u.company_logo_size
                    ELSE parent.company_logo_size
                END AS company_logo_size,
                CASE
                    WHEN u.account_type = 'business_owner' THEN u.company_logo_link
                    ELSE parent.company_logo_link
                END AS company_logo_link
            FROM users u
            INNER JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN users parent ON u.parent_user_id = parent.id
            WHERE u.id = $1
        `;
        const profileRes = await client.query(profileQuery, [userId]);
        
        if (profileRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não configurado</h1>');
        }
        
        const itemsRes = await client.query('SELECT * FROM profile_items WHERE user_id = $1 AND is_active = true ORDER BY display_order ASC', [userId]);
        
        // Log para debug
        logger.debug('Itens encontrados no banco', { 
            userId, 
            total: itemsRes.rows.length,
            itemTypes: itemsRes.rows.map(i => i.item_type)
        });
        
        // Log específico para banners
        const banners = itemsRes.rows.filter(i => i.item_type === 'banner');
        if (banners.length > 0) {
            logger.debug('Banners encontrados', {
                total: banners.length,
                banners: banners.map(b => ({
                    id: b.id,
                    title: b.title,
                    hasImageUrl: !!b.image_url,
                    imageUrl: b.image_url ? (b.image_url.substring(0, 50) + '...') : 'null',
                    destinationUrl: b.destination_url || 'null',
                    isActive: b.is_active,
                    displayOrder: b.display_order
                }))
            });
        }
        
        // Filtrar e validar itens
        const validItems = (itemsRes.rows || []).filter(item => {
            if (item.item_type === 'banner_carousel') {
                return false;
            }
            
            // Para banners, verificar se tem image_url válido
            if (item.item_type === 'banner') {
                // Log detalhado do banner antes de filtrar
                logger.debug('Banner sendo avaliado', {
                    id: item.id,
                    title: item.title,
                    hasImageUrl: !!item.image_url,
                    imageUrl: item.image_url ? item.image_url.substring(0, 100) : 'null',
                    imageUrlLength: item.image_url ? item.image_url.length : 0,
                    isPlaceholder: item.image_url ? item.image_url.includes('placeholder') : false,
                    isSvg: item.image_url ? item.image_url.startsWith('data:image/svg') : false,
                    isActive: item.is_active,
                    destinationUrl: item.destination_url || 'null'
                });
                
                // Se não tem image_url ou é placeholder, não incluir
                if (!item.image_url || 
                    item.image_url.trim() === '' || 
                    item.image_url.includes('placeholder') || 
                    item.image_url.startsWith('data:image/svg')) {
                    logger.debug('Banner filtrado - sem imagem válida', {
                        id: item.id,
                        title: item.title,
                        image_url: item.image_url ? item.image_url.substring(0, 50) : 'null'
                    });
                    return false;
                }
                
                // Se destination_url é JSON (carrossel antigo), filtrar
                if (item.destination_url) {
                    const destUrl = String(item.destination_url).trim();
                    if (destUrl.startsWith('[') || destUrl === '[]') {
                        logger.debug('Banner filtrado - destination_url é JSON', {
                            id: item.id,
                            destination_url: destUrl
                        });
                        return false;
                    }
                }
                
                // Banner válido - incluir
                logger.debug('✅ Banner válido incluído no cartão público', {
                    id: item.id,
                    title: item.title,
                    hasImageUrl: !!item.image_url,
                    imageUrl: item.image_url ? item.image_url.substring(0, 50) + '...' : 'null',
                    destinationUrl: item.destination_url || 'null'
                });
            }
            
            return true;
        });
        
        // Converter URLs do YouTube para formato embed, buscar Instagram oEmbed e carregar produtos dos catálogos
        const items = await Promise.all(validItems.map(async (item) => {
            if (item.item_type === 'youtube_embed' && item.destination_url) {
                item.embed_url = convertYouTubeUrlToEmbed(item.destination_url);
            }
            
            // Processar Instagram embed - usar iframe direto (mais confiável que oEmbed API)
            if (item.item_type === 'instagram_embed' && item.destination_url) {
                console.log(`🔍 [INSTAGRAM] Processando item ${item.id} com URL: ${item.destination_url}`);
                try {
                    // Normalizar e verificar URL
                    let urlToProcess = String(item.destination_url).trim();
                    
                    // Remover TODOS os espaços e caracteres estranhos (incluindo espaços no meio)
                    urlToProcess = urlToProcess.replace(/\s+/g, '');
                    
                    // Remover espaços antes e depois de barras
                    urlToProcess = urlToProcess.replace(/\s*\/\s*/g, '/');
                    urlToProcess = urlToProcess.replace(/\/+/g, '/'); // Remover barras duplicadas
                    
                    // PRIMEIRO: Extrair apenas a primeira ocorrência válida de URL do Instagram
                    // Isso resolve o problema de duplicação: https://www.https:/www.
                    const instagramUrlMatch = urlToProcess.match(/(https?:\/\/www?\.?instagram\.com\/[^\s\?]*)/i);
                    if (instagramUrlMatch) {
                        // Usar apenas a primeira ocorrência válida
                        urlToProcess = instagramUrlMatch[1];
                        // Normalizar para formato padrão
                        urlToProcess = urlToProcess.replace(/^https?:\/\/(www\.)?instagram\.com/i, 'https://www.instagram.com');
                    } else {
                        // Se não encontrou padrão válido, construir a URL
                        // Remover duplicações de protocolo
                        urlToProcess = urlToProcess.replace(/^(https?:\/\/)+/i, 'https://');
                        urlToProcess = urlToProcess.replace(/(https?:\/\/)(www\.)+/i, '$1www.');
                        
                        // Garantir que começa com http:// ou https:// (só se não tiver)
                        if (!urlToProcess.startsWith('http://') && !urlToProcess.startsWith('https://')) {
                            if (urlToProcess.startsWith('www.instagram.com') || urlToProcess.startsWith('instagram.com')) {
                                urlToProcess = 'https://' + urlToProcess;
                            } else if (urlToProcess.includes('instagram.com')) {
                                urlToProcess = 'https://www.' + urlToProcess.replace(/^(www\.)?/i, '');
                            }
                        }
                        
                        // Garantir que tem www. após https://
                        urlToProcess = urlToProcess.replace(/^https:\/\/instagram\.com/i, 'https://www.instagram.com');
                    }
                    
                    console.log(`🔍 [INSTAGRAM] URL normalizada: ${urlToProcess}`);
                    
                    // Verificar se é um post (contém /p/ ou /reel/)
                    const isPost = urlToProcess.includes('/p/') || urlToProcess.includes('/reel/');
                    console.log(`🔍 [INSTAGRAM] É post? ${isPost}`);
                    
                    if (isPost) {
                        // Normalizar URL para usar na API oEmbed
                        const normalizedUrl = urlToProcess.split('?')[0].split('#')[0].trim();
                        
                        console.log(`✅ [INSTAGRAM] Tentando buscar embed via oEmbed API para: ${normalizedUrl}`);
                        
                        // Tentar buscar via oEmbed API (método oficial do Instagram)
                        try {
                            const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omitscript=true`;
                            
                            // Usar Promise.race para timeout
                            const fetchPromise = fetch(oembedUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Accept': 'application/json'
                                }
                            });
                            
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Timeout')), 8000)
                            );
                            
                            try {
                                const response = await Promise.race([fetchPromise, timeoutPromise]);
                                
                                if (response.ok) {
                                    const data = await response.json();
                                    if (data.html && data.html.trim()) {
                                        console.log(`✅ [INSTAGRAM] Embed HTML obtido via oEmbed API`);
                                        item.instagram_embed_html = data.html;
                                        item.instagram_embed_url = null;
                                        item.instagram_is_profile = false;
                                    } else {
                                        throw new Error('Resposta oEmbed não contém HTML');
                                    }
                                } else if (response.status === 429) {
                                    console.warn(`⚠️ [INSTAGRAM] Rate limit (429), usando fallback`);
                                    // Fallback: usar URL de embed direto mesmo com limitações
                                    item.instagram_embed_url = normalizedUrl + (normalizedUrl.endsWith('/') ? '' : '/') + 'embed/';
                                    item.instagram_embed_html = null;
                                    item.instagram_is_profile = false;
                                } else {
                                    throw new Error(`HTTP ${response.status}`);
                                }
                            } catch (fetchError) {
                                if (fetchError.message === 'Timeout') {
                                    console.warn(`⚠️ [INSTAGRAM] Timeout na API, usando fallback`);
                                } else {
                                    console.warn(`⚠️ [INSTAGRAM] Erro na API: ${fetchError.message}, usando fallback`);
                                }
                                // Fallback: usar URL de embed direto
                                item.instagram_embed_url = normalizedUrl + (normalizedUrl.endsWith('/') ? '' : '/') + 'embed/';
                                item.instagram_embed_html = null;
                                item.instagram_is_profile = false;
                            }
                        } catch (error) {
                            console.error(`❌ [INSTAGRAM] Erro ao processar oEmbed: ${error.message}`);
                            // Fallback: usar URL de embed direto
                            item.instagram_embed_url = normalizedUrl + (normalizedUrl.endsWith('/') ? '' : '/') + 'embed/';
                            item.instagram_embed_html = null;
                            item.instagram_is_profile = false;
                        }
                    } else {
                        // É um perfil - extrair username
                        const profileMatch = urlToProcess.match(/instagram\.com\/([^\/\?]+)/);
                        const username = profileMatch ? profileMatch[1].replace('@', '') : null;
                        
                        if (username) {
                            console.log(`✅ [INSTAGRAM] Detectado perfil: @${username}`);
                            console.log(`✅ [INSTAGRAM] Usando widget de feed do Instagram`);
                            
                            // Marcar como perfil e armazenar username
                            item.instagram_is_profile = true;
                            item.instagram_username = username;
                            item.instagram_embed_url = null;
                            item.instagram_embed_html = null;
                        } else {
                            console.log(`⚠️ [INSTAGRAM] Não foi possível extrair username do perfil`);
                            item.instagram_is_profile = false;
                            item.instagram_embed_url = null;
                            item.instagram_embed_html = null;
                        }
                    }
                } catch (error) {
                    console.error(`❌ [INSTAGRAM] Erro ao processar URL para item ${item.id}:`, error.message);
                    item.instagram_embed_url = null;
                    item.instagram_embed_html = null;
                }
            }
            
            if (item.item_type === 'product_catalog') {
                try {
                    const productsRes = await client.query(
                        'SELECT * FROM product_catalog_items WHERE profile_item_id = $1 ORDER BY display_order ASC, created_at ASC',
                        [item.id]
                    );
                    item.products = productsRes.rows || [];
                } catch (productError) {
                    logger.error('Erro ao carregar produtos do catálogo', { 
                        itemId: item.id, 
                        error: productError.message 
                    });
                    item.products = [];
                }
            }
            
            if (item.item_type === 'sales_page') {
                try {
                    // Buscar sales_page (mesmo que não esteja publicada, para construir a URL)
                    const salesPageRes = await client.query(
                        'SELECT slug, status FROM sales_pages WHERE profile_item_id = $1',
                        [item.id]
                    );
                    if (salesPageRes.rows.length > 0) {
                        const salesPage = salesPageRes.rows[0];
                        item.sales_page_slug = salesPage.slug;
                        item.sales_page_status = salesPage.status;
                        // Se não estiver publicada, não definir URL (será '#')
                        if (salesPage.status !== 'PUBLISHED') {
                            item.sales_page_slug = null; // Não permitir acesso público se não estiver publicada
                        }
                    } else {
                        // Se não existe sales_page, não definir slug
                        item.sales_page_slug = null;
                    }
                } catch (salesPageError) {
                    logger.error('Erro ao carregar dados da página de vendas', { 
                        itemId: item.id, 
                        error: salesPageError.message 
                    });
                    item.sales_page_slug = null;
                }
            }
            
            return item;
        }));
        
        const details = profileRes.rows[0];
        details.button_color_rgb = hexToRgb(details.button_color);
        details.card_color_rgb = hexToRgb(details.card_background_color);
        
        // Garantir que profile_slug está disponível em details
        if (!details.profile_slug) {
            details.profile_slug = user.profile_slug || identifier;
        }
        
        if (!details.button_content_align || !['left', 'center', 'right'].includes(details.button_content_align)) {
            details.button_content_align = 'center';
        }

        // Preparar URL da imagem processada para og:image (se houver imagem)
        // Adicionar cache-busting baseado na URL da imagem para forçar atualização
        let ogImageUrl = null;
        if (details.profile_image_url) {
            // Extrair parte única da URL (ID do Cloudflare) para cache-busting
            const urlParts = details.profile_image_url.match(/[a-zA-Z0-9_-]+/g);
            const cacheBuster = urlParts ? urlParts[urlParts.length - 1] : Date.now();
            ogImageUrl = `${req.protocol}://${req.get('host')}/api/image/profile-image?url=${encodeURIComponent(details.profile_image_url)}&v=${cacheBuster}`;
        }
        
        // Buscar profile_slug do usuário para usar nas URLs
        const userSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const userProfileSlug = userSlugRes.rows[0]?.profile_slug || identifier;
        
        const profileData = {
            details: details,
            items: items,
            origin: req.protocol + '://' + req.get('host'),
            ogImageUrl: ogImageUrl,
            profile_slug: userProfileSlug, // Adicionar profile_slug para uso no template
            identifier: identifier // Adicionar identifier também
        };
        
        res.render('profile', profileData);

    } finally {
        client.release();
    }
}));

module.exports = router;


