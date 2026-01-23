const db = require('../../../db');

class AnalyticsRepository {
    /**
     * Registrar evento
     */
    async createEvent(data) {
        const {
            sales_page_id,
            product_id,
            event_type,
            metadata
        } = data;

        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO sales_page_events (sales_page_id, product_id, event_type, metadata)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [
                    sales_page_id,
                    product_id || null,
                    event_type,
                    metadata ? JSON.stringify(metadata) : null
                ]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar eventos de uma página
     */
    async findBySalesPageId(salesPageId, filters = {}) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM sales_page_events WHERE sales_page_id = $1';
            const params = [salesPageId];
            let paramCount = 2;

            if (filters.event_type) {
                query += ` AND event_type = $${paramCount}`;
                params.push(filters.event_type);
                paramCount++;
            }

            if (filters.start_date) {
                query += ` AND created_at >= $${paramCount}`;
                params.push(filters.start_date);
                paramCount++;
            }

            if (filters.end_date) {
                query += ` AND created_at <= $${paramCount}`;
                params.push(filters.end_date);
                paramCount++;
            }

            query += ' ORDER BY created_at DESC';
            
            if (filters.limit) {
                query += ` LIMIT $${paramCount}`;
                params.push(filters.limit);
            }

            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Contar eventos por tipo
     */
    async countByType(salesPageId, eventType = null) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT event_type, COUNT(*) as count FROM sales_page_events WHERE sales_page_id = $1';
            const params = [salesPageId];

            if (eventType) {
                query += ' AND event_type = $2';
                params.push(eventType);
            }

            query += ' GROUP BY event_type';

            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar eventos de um produto
     */
    async findByProductId(productId, eventType = null) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM sales_page_events WHERE product_id = $1';
            const params = [productId];

            if (eventType) {
                query += ' AND event_type = $2';
                params.push(eventType);
            }

            query += ' ORDER BY created_at DESC';

            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Contar eventos de produto por tipo
     */
    async countProductEventsByType(productId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT event_type, COUNT(*) as count 
                 FROM sales_page_events 
                 WHERE product_id = $1 
                 GROUP BY event_type`,
                [productId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar ranking de produtos por evento
     */
    async getProductRanking(salesPageId, eventType, limit = 10) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT 
                    p.id, p.name, p.image_url, p.price,
                    COUNT(e.id) as event_count
                 FROM sales_page_products p
                 LEFT JOIN sales_page_events e ON p.id = e.product_id AND e.event_type = $1
                 WHERE p.sales_page_id = $2 AND p.status != 'ARCHIVED'
                 GROUP BY p.id, p.name, p.image_url, p.price
                 ORDER BY event_count DESC, p.display_order ASC
                 LIMIT $3`,
                [eventType, salesPageId, limit]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar funil de vendas
     */
    async getSalesFunnel(salesPageId, startDate = null, endDate = null) {
        const client = await db.pool.connect();
        try {
            let dateFilter = '';
            const params = [salesPageId];
            let paramCount = 2;

            if (startDate) {
                dateFilter += ` AND created_at >= $${paramCount}`;
                params.push(startDate);
                paramCount++;
            }

            if (endDate) {
                dateFilter += ` AND created_at <= $${paramCount}`;
                params.push(endDate);
                paramCount++;
            }

            const result = await client.query(
                `SELECT 
                    event_type,
                    COUNT(*) as count
                 FROM sales_page_events
                 WHERE sales_page_id = $1 ${dateFilter}
                 GROUP BY event_type
                 ORDER BY 
                     CASE event_type
                         WHEN 'page_view' THEN 1
                         WHEN 'product_view' THEN 2
                         WHEN 'product_click' THEN 3
                         WHEN 'add_to_cart' THEN 4
                         WHEN 'checkout_click' THEN 5
                     END`,
                params
            );

            // Organizar em formato de funil
            const funnel = {
                page_view: 0,
                product_view: 0,
                product_click: 0,
                add_to_cart: 0,
                checkout_click: 0
            };

            result.rows.forEach(row => {
                funnel[row.event_type] = parseInt(row.count);
            });

            // Calcular percentuais e drop-off
            const funnelWithMetrics = {
                page_view: {
                    count: funnel.page_view,
                    percentage: 100
                },
                product_view: {
                    count: funnel.product_view,
                    percentage: funnel.page_view > 0 ? (funnel.product_view / funnel.page_view * 100).toFixed(2) : 0,
                    drop_off: funnel.page_view - funnel.product_view
                },
                product_click: {
                    count: funnel.product_click,
                    percentage: funnel.product_view > 0 ? (funnel.product_click / funnel.product_view * 100).toFixed(2) : 0,
                    drop_off: funnel.product_view - funnel.product_click
                },
                add_to_cart: {
                    count: funnel.add_to_cart,
                    percentage: funnel.product_click > 0 ? (funnel.add_to_cart / funnel.product_click * 100).toFixed(2) : 0,
                    drop_off: funnel.product_click - funnel.add_to_cart
                },
                checkout_click: {
                    count: funnel.checkout_click,
                    percentage: funnel.add_to_cart > 0 ? (funnel.checkout_click / funnel.add_to_cart * 100).toFixed(2) : 0,
                    drop_off: funnel.add_to_cart - funnel.checkout_click
                }
            };

            return funnelWithMetrics;
        } finally {
            client.release();
        }
    }
}

module.exports = new AnalyticsRepository();

