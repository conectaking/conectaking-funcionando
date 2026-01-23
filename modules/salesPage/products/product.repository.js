const db = require('../../../db');

class ProductRepository {
    /**
     * Criar produto
     */
    async create(data) {
        const {
            sales_page_id,
            name,
            description,
            price,
            compare_price,
            stock,
            variations,
            image_url,
            display_order,
            status,
            badge
        } = data;

        const client = await db.pool.connect();
        try {
            const finalStatus = status || 'ACTIVE';
            console.log(`💾 [PRODUCT-REPO] Criando produto:`, {
                sales_page_id,
                name,
                price,
                status: finalStatus,
                display_order: display_order || 0
            });
            
            const result = await client.query(
                `INSERT INTO sales_page_products (
                    sales_page_id, name, description, price, compare_price,
                    stock, variations, image_url, display_order, status, badge
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *`,
                [
                    sales_page_id, name, description || null, price,
                    compare_price || null, stock, variations || null,
                    image_url || null, display_order || 0, finalStatus,
                    badge || null
                ]
            );
            console.log(`✅ [PRODUCT-REPO] Produto criado com sucesso: ID ${result.rows[0].id}, status: ${result.rows[0].status}`);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar produto por ID
     */
    async findById(id) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM sales_page_products WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Listar produtos de uma página (apenas ACTIVE para público)
     */
    async findBySalesPageId(salesPageId, includeArchived = false) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM sales_page_products WHERE sales_page_id = $1';
            const params = [salesPageId];

            if (!includeArchived) {
                // Para página pública, mostrar apenas produtos ACTIVE
                query += ' AND status = $2';
                params.push('ACTIVE');
            } else {
                // Para admin, mostrar todos exceto ARCHIVED
                query += ' AND status != $2';
                params.push('ARCHIVED');
            }

            query += ' ORDER BY display_order ASC, created_at ASC';

            console.log(`🔍 [PRODUCT-REPO] Buscando produtos para sales_page_id: ${salesPageId}, query: ${query}, params:`, params);
            const result = await client.query(query, params);
            console.log(`✅ [PRODUCT-REPO] Encontrados ${result.rows.length} produtos`);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar produto
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
                `UPDATE sales_page_products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
                values
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar status do produto
     */
    async updateStatus(id, status) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'UPDATE sales_page_products SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [status, id]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Deletar produto
     */
    async delete(id) {
        const client = await db.pool.connect();
        try {
            await client.query('DELETE FROM sales_page_products WHERE id = $1', [id]);
            return true;
        } finally {
            client.release();
        }
    }

    /**
     * Reordenar produtos
     */
    async reorder(salesPageId, productOrders) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const { id, display_order } of productOrders) {
                await client.query(
                    'UPDATE sales_page_products SET display_order = $1 WHERE id = $2 AND sales_page_id = $3',
                    [display_order, id, salesPageId]
                );
            }
            
            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Verificar ownership (se produto pertence a uma página do usuário)
     */
    async checkOwnership(productId, userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT p.* FROM sales_page_products p
                 INNER JOIN sales_pages sp ON p.sales_page_id = sp.id
                 INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
                 WHERE p.id = $1 AND pi.user_id = $2`,
                [productId, userId]
            );
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    /**
     * Contar produtos ativos de uma página
     */
    async countActive(salesPageId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT COUNT(*) as count FROM sales_page_products WHERE sales_page_id = $1 AND status = $2',
                [salesPageId, 'ACTIVE']
            );
            return parseInt(result.rows[0].count);
        } finally {
            client.release();
        }
    }
}

module.exports = new ProductRepository();

