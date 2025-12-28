const db = require('../../db');
const logger = require('../../utils/logger');

class SalesPageRepository {
    /**
     * Criar nova página de vendas
     */
    async create(data) {
        const {
            profile_item_id,
            slug,
            store_title,
            store_description,
            button_text,
            button_logo_url,
            theme,
            background_color,
            text_color,
            button_color,
            button_text_color,
            background_image_url,
            whatsapp_number,
            meta_title,
            meta_description,
            meta_image_url,
            preview_token
        } = data;

        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO sales_pages (
                    profile_item_id, slug, store_title, store_description,
                    button_text, button_logo_url, theme, background_color,
                    text_color, button_color, button_text_color,
                    background_image_url, whatsapp_number, meta_title,
                    meta_description, meta_image_url, preview_token, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'DRAFT')
                RETURNING *`,
                [
                    profile_item_id, slug, store_title, store_description,
                    button_text, button_logo_url, theme || 'dark', background_color,
                    text_color, button_color, button_text_color,
                    background_image_url, whatsapp_number, meta_title,
                    meta_description, meta_image_url, preview_token
                ]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar página por ID
     */
    async findById(id) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM sales_pages WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar página por profile_item_id (com verificação de ownership)
     */
    async findByProfileItemId(profileItemId, userId) {
        const client = await db.pool.connect();
        try {
            // Verificar se o profile_item pertence ao usuário antes de buscar a sales_page
            const itemCheck = await client.query(
                'SELECT id FROM profile_items WHERE id = $1 AND user_id = $2',
                [profileItemId, userId]
            );
            
            if (itemCheck.rows.length === 0) {
                return null; // Item não encontrado ou não pertence ao usuário
            }
            
            const result = await client.query(
                'SELECT * FROM sales_pages WHERE profile_item_id = $1',
                [profileItemId]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar página por slug
     */
    async findBySlug(slug) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM sales_pages WHERE slug = $1',
                [slug]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar página por preview_token
     */
    async findByPreviewToken(token) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM sales_pages WHERE preview_token = $1',
                [token]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar página
     */
    async update(id, data) {
        const client = await db.pool.connect();
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(data).forEach(key => {
                if (data[key] !== undefined) {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(data[key]);
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                return await this.findById(id);
            }

            values.push(id);
            const result = await client.query(
                `UPDATE sales_pages SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
                values
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar status da página
     */
    async updateStatus(id, status, publishedAt = null) {
        const client = await db.pool.connect();
        try {
            const updateFields = ['status = $1', 'updated_at = NOW()'];
            const values = [status];

            if (publishedAt !== null) {
                updateFields.push('published_at = $2');
                values.push(publishedAt);
                values.push(id);
            } else {
                values.push(id);
            }

            const result = await client.query(
                `UPDATE sales_pages SET ${updateFields.join(', ')} WHERE id = $${values.length} RETURNING *`,
                values
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Deletar página
     */
    async delete(id) {
        const client = await db.pool.connect();
        try {
            await client.query('DELETE FROM sales_pages WHERE id = $1', [id]);
            return true;
        } finally {
            client.release();
        }
    }

    /**
     * Verificar se slug já existe
     */
    async slugExists(slug, excludeId = null) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT COUNT(*) as count FROM sales_pages WHERE slug = $1';
            const params = [slug];
            
            if (excludeId) {
                query += ' AND id != $2';
                params.push(excludeId);
            }

            const result = await client.query(query, params);
            return parseInt(result.rows[0].count) > 0;
        } finally {
            client.release();
        }
    }

    /**
     * Verificar ownership (se página pertence ao usuário)
     */
    async checkOwnership(id, userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT sp.* FROM sales_pages sp
                 INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
                 WHERE sp.id = $1 AND pi.user_id = $2`,
                [id, userId]
            );
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    /**
     * Contar produtos de uma página
     */
    async countProducts(salesPageId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT COUNT(*) as count FROM sales_page_products WHERE sales_page_id = $1 AND status != $2',
                [salesPageId, 'ARCHIVED']
            );
            return parseInt(result.rows[0].count);
        } finally {
            client.release();
        }
    }
}

module.exports = new SalesPageRepository();

