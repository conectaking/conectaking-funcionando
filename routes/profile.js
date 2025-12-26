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
        const checkRes = await client.query(
            'SELECT * FROM profile_tabs WHERE id = $1 AND user_id = $2',
            [tabId, userId]
        );

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
        const checkRes = await client.query(
            'SELECT * FROM profile_tabs WHERE id = $1 AND user_id = $2',
            [tabId, userId]
        );

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Aba não encontrada ou você não tem permissão para removê-la.' });
        }

        await client.query('DELETE FROM profile_tabs WHERE id = $1 AND user_id = $2', [tabId, userId]);
        res.json({ message: 'Aba removida com sucesso!' });
    } catch (error) {
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
        await client.query('ROLLBACK');
        console.error("Erro ao reordenar abas:", error);
        res.status(500).json({ message: 'Erro ao reordenar abas.' });
    } finally {
        client.release();
    }
});

module.exports = router;

