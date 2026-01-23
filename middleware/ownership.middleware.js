/**
 * Middleware para verificar ownership de recursos
 * Usado para garantir que usuário só acesse seus próprios recursos
 */

const db = require('../db');
const logger = require('../utils/logger');

/**
 * Verificar se usuário é dono de uma página de vendas
 */
async function checkSalesPageOwnership(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT sp.* FROM sales_pages sp
                 INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
                 WHERE sp.id = $1 AND pi.user_id = $2`,
                [id, userId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Você não tem permissão para acessar este recurso'
                    }
                });
            }

            // Adicionar página ao request para uso posterior
            req.salesPage = result.rows[0];
            next();
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Erro ao verificar ownership:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro ao verificar permissões'
            }
        });
    }
}

/**
 * Verificar se usuário é dono de um produto
 */
async function checkProductOwnership(req, res, next) {
    try {
        const { productId } = req.params;
        const userId = req.user.userId;

        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT p.* FROM sales_page_products p
                 INNER JOIN sales_pages sp ON p.sales_page_id = sp.id
                 INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
                 WHERE p.id = $1 AND pi.user_id = $2`,
                [productId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Você não tem permissão para acessar este recurso'
                    }
                });
            }

            req.product = result.rows[0];
            next();
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Erro ao verificar ownership do produto:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro ao verificar permissões'
            }
        });
    }
}

module.exports = {
    checkSalesPageOwnership,
    checkProductOwnership
};

