// ============================================
// CÓDIGO PARA CORRIGIR ERRO 500 - REMOVER CARROSSEL
// ============================================
// 
// INSTRUÇÕES:
// 1. Abra o arquivo: routes/publicProfile.js (ou similar)
// 2. Encontre a parte que busca os itens do perfil
// 3. Adicione o filtro para remover carrosséis
// 4. Salve e faça deploy
//
// ============================================

// EXEMPLO DE CÓDIGO ANTES (como deve estar agora):
/*
app.get('/:slug', async (req, res) => {
    try {
        const profileRes = await pool.query(
            'SELECT * FROM profiles WHERE profile_slug = $1',
            [req.params.slug]
        );
        
        if (profileRes.rows.length === 0) {
            return res.status(404).render('404');
        }
        
        const itemsRes = await pool.query(
            'SELECT * FROM profile_items WHERE profile_id = $1 AND is_active = true ORDER BY display_order',
            [profileRes.rows[0].id]
        );
        
        res.render('profile', {
            profile: profileRes.rows[0],
            items: itemsRes.rows || []
        });
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).send('Erro Interno do Servidor');
    }
});
*/

// ============================================
// CÓDIGO DEPOIS (com filtro para remover carrosséis):
// ============================================

app.get('/:slug', async (req, res) => {
    try {
        const profileRes = await pool.query(
            'SELECT * FROM profiles WHERE profile_slug = $1',
            [req.params.slug]
        );
        
        if (profileRes.rows.length === 0) {
            return res.status(404).render('404');
        }
        
        const itemsRes = await pool.query(
            'SELECT * FROM profile_items WHERE profile_id = $1 AND is_active = true ORDER BY display_order',
            [profileRes.rows[0].id]
        );
        
        // FILTRO: Remover carrosséis para evitar erro 500
        const items = (itemsRes.rows || []).filter(item => {
            // Remover itens do tipo banner_carousel
            if (item.item_type === 'banner_carousel') {
                return false;
            }
            
            // Remover banners que são carrosséis (destination_url é JSON array)
            if (item.item_type === 'banner' && item.destination_url) {
                try {
                    const destUrl = item.destination_url.trim();
                    if (destUrl.startsWith('[') || destUrl === '[]') {
                        return false; // É um carrossel, remover
                    }
                } catch (e) {
                    // Se houver erro ao verificar, manter o item
                }
            }
            
            return true;
        });
        
        res.render('profile', {
            profile: profileRes.rows[0],
            items: items // Usar items filtrados
        });
    } catch (error) {
        console.error('Erro ao carregar perfil público:', error);
        res.status(500).send('Erro Interno do Servidor');
    }
});

// ============================================
// ALTERNATIVA: Se você já tem um processamento de items
// ============================================

// Se o código já processa os items (ex: converte YouTube URLs), 
// adicione o filtro ANTES do processamento:

/*
const itemsRes = await pool.query(...);

// FILTRO: Remover carrosséis
let items = (itemsRes.rows || []).filter(item => {
    if (item.item_type === 'banner_carousel') return false;
    if (item.item_type === 'banner' && item.destination_url) {
        const destUrl = item.destination_url.trim();
        if (destUrl.startsWith('[') || destUrl === '[]') return false;
    }
    return true;
});

// Depois processe os items normalmente (ex: converter YouTube URLs)
items = items.map(item => {
    if (item.item_type === 'youtube_embed' && item.destination_url) {
        item.embed_url = convertYouTubeUrlToEmbed(item.destination_url);
    }
    return item;
});

res.render('profile', {
    profile: profileRes.rows[0],
    items: items
});
*/

// ============================================
// QUERY SQL PARA REMOVER CARROSSÉIS DO BANCO (OPCIONAL)
// ============================================
// 
// ATENÇÃO: Isso vai DELETAR permanentemente todos os carrosséis!
// Execute apenas se quiser remover completamente do banco de dados.
//
// DELETE FROM profile_items WHERE item_type = 'banner_carousel';
//
// Ou para remover banners que são carrosséis:
// DELETE FROM profile_items 
// WHERE item_type = 'banner' 
// AND (destination_url LIKE '[%' OR destination_url = '[]');
//

