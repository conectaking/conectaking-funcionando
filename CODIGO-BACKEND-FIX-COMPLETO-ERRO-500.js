// ============================================
// CÓDIGO COMPLETO PARA CORRIGIR ERRO 500
// ============================================
// 
// Este código adiciona validação robusta e tratamento de erros
// para evitar que qualquer item inválido quebre a página pública
//
// INSTRUÇÕES:
// 1. Abra o arquivo: routes/publicProfile.js (ou similar)
// 2. Substitua TODO o código da rota GET '/:slug' pelo código abaixo
// 3. Salve e faça deploy
//
// ============================================

app.get('/:slug', async (req, res) => {
    try {
        // 1. Buscar perfil
        const profileRes = await pool.query(
            'SELECT * FROM profiles WHERE profile_slug = $1',
            [req.params.slug]
        );
        
        if (profileRes.rows.length === 0) {
            return res.status(404).render('404');
        }
        
        const profile = profileRes.rows[0];
        
        // 2. Buscar itens do perfil
        const itemsRes = await pool.query(
            'SELECT * FROM profile_items WHERE profile_id = $1 AND is_active = true ORDER BY display_order',
            [profile.id]
        );
        
        // 3. FILTRAR E VALIDAR ITENS - Remover itens problemáticos
        const validItems = [];
        
        for (const item of (itemsRes.rows || [])) {
            try {
                // Remover carrosséis
                if (item.item_type === 'banner_carousel') {
                    console.log(`[SKIP] Item ${item.id}: banner_carousel removido`);
                    continue;
                }
                
                // Remover banners que são carrosséis (destination_url é JSON array)
                if (item.item_type === 'banner' && item.destination_url) {
                    try {
                        const destUrl = String(item.destination_url).trim();
                        if (destUrl.startsWith('[') || destUrl === '[]') {
                            console.log(`[SKIP] Item ${item.id}: banner com destination_url JSON (carrossel) removido`);
                            continue;
                        }
                    } catch (e) {
                        console.log(`[SKIP] Item ${item.id}: erro ao verificar destination_url:`, e.message);
                        continue;
                    }
                }
                
                // Validar campos obrigatórios básicos
                if (!item.item_type) {
                    console.log(`[SKIP] Item ${item.id}: sem item_type`);
                    continue;
                }
                
                // Validar destination_url se necessário
                if (item.destination_url && typeof item.destination_url !== 'string') {
                    try {
                        item.destination_url = String(item.destination_url);
                    } catch (e) {
                        console.log(`[SKIP] Item ${item.id}: destination_url inválido`);
                        continue;
                    }
                }
                
                // Validar image_url se necessário
                if (item.image_url && typeof item.image_url !== 'string') {
                    try {
                        item.image_url = String(item.image_url);
                    } catch (e) {
                        // Se não conseguir converter, definir como null
                        item.image_url = null;
                    }
                }
                
                // Validar title se necessário
                if (item.title && typeof item.title !== 'string') {
                    try {
                        item.title = String(item.title);
                    } catch (e) {
                        item.title = null;
                    }
                }
                
                // Validar aspect_ratio se necessário
                if (item.aspect_ratio && typeof item.aspect_ratio !== 'string') {
                    try {
                        item.aspect_ratio = String(item.aspect_ratio);
                    } catch (e) {
                        item.aspect_ratio = null;
                    }
                }
                
                // Se chegou aqui, o item é válido
                validItems.push(item);
                
            } catch (itemError) {
                // Se houver qualquer erro ao processar um item, pular ele
                console.error(`[ERROR] Erro ao processar item ${item.id}:`, itemError);
                continue;
            }
        }
        
        console.log(`[INFO] Perfil ${req.params.slug}: ${validItems.length} itens válidos de ${itemsRes.rows.length} totais`);
        
        // 4. Processar itens (ex: converter YouTube URLs)
        const processedItems = validItems.map(item => {
            try {
                // Converter YouTube URLs para embed
                if (item.item_type === 'youtube_embed' && item.destination_url) {
                    const { convertYouTubeUrlToEmbed } = require('../utils/youtube');
                    item.embed_url = convertYouTubeUrlToEmbed(item.destination_url);
                }
                return item;
            } catch (e) {
                console.error(`[ERROR] Erro ao processar item ${item.id}:`, e);
                return item; // Retornar item sem processamento se houver erro
            }
        });
        
        // 5. Renderizar template
        res.render('profile', {
            profile: profile,
            items: processedItems
        });
        
    } catch (error) {
        // Log detalhado do erro
        console.error('========================================');
        console.error('[ERROR] Erro ao carregar perfil público:', req.params.slug);
        console.error('[ERROR] Mensagem:', error.message);
        console.error('[ERROR] Stack:', error.stack);
        console.error('========================================');
        
        // Retornar página de erro genérica
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Erro - Conecta King</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background: #0D0D0F; 
                        color: #ECECEC; 
                    }
                    h1 { color: #ff4444; }
                </style>
            </head>
            <body>
                <h1>Erro ao carregar perfil</h1>
                <p>Desculpe, ocorreu um erro ao carregar este perfil.</p>
                <p>Tente novamente mais tarde.</p>
            </body>
            </html>
        `);
    }
});

// ============================================
// ALTERNATIVA: Se você já tem código existente
// ============================================
// 
// Se você não quiser substituir todo o código, adicione apenas
// esta função de validação e use antes de renderizar:
//
// function validateAndFilterItems(items) {
//     const validItems = [];
//     
//     for (const item of items) {
//         try {
//             // Remover carrosséis
//             if (item.item_type === 'banner_carousel') continue;
//             
//             // Remover banners que são carrosséis
//             if (item.item_type === 'banner' && item.destination_url) {
//                 const destUrl = String(item.destination_url).trim();
//                 if (destUrl.startsWith('[') || destUrl === '[]') continue;
//             }
//             
//             // Validar campos básicos
//             if (!item.item_type) continue;
//             
//             // Converter campos para string se necessário
//             if (item.destination_url && typeof item.destination_url !== 'string') {
//                 item.destination_url = String(item.destination_url);
//             }
//             
//             validItems.push(item);
//         } catch (e) {
//             console.error(`Erro ao validar item ${item.id}:`, e);
//             continue;
//         }
//     }
//     
//     return validItems;
// }
//
// // Use assim:
// const items = validateAndFilterItems(itemsRes.rows || []);
// res.render('profile', { profile, items });

