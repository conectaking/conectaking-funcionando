const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Listar produtos de um catálogo
router.get('/items/:itemId/products', protectUser, asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.userId;

    const client = await db.pool.connect();
    try {
        // Verificar se o item pertence ao usuário e é do tipo product_catalog
        const itemCheck = await client.query(
            'SELECT id, user_id, item_type FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }

        if (itemCheck.rows[0].item_type !== 'product_catalog') {
            return res.status(400).json({ message: 'Item não é um catálogo de produtos.' });
        }

        // Buscar produtos
        const productsRes = await client.query(
            'SELECT * FROM product_catalog_items WHERE profile_item_id = $1 ORDER BY display_order ASC, created_at ASC',
            [itemId]
        );

        res.json({ products: productsRes.rows });
    } finally {
        client.release();
    }
}));

// Adicionar produto ao catálogo
router.post('/items/:itemId/products', protectUser, asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.userId;
    const { name, description, price, image_url, display_order } = req.body;

    // Validações
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ message: 'Nome do produto é obrigatório (mínimo 2 caracteres).' });
    }

    if (!price || isNaN(price) || parseFloat(price) <= 0) {
        return res.status(400).json({ message: 'Preço deve ser maior que zero.' });
    }

    const client = await db.pool.connect();
    try {
        // Verificar se o item pertence ao usuário e é do tipo product_catalog
        const itemCheck = await client.query(
            'SELECT id, user_id, item_type FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }

        if (itemCheck.rows[0].item_type !== 'product_catalog') {
            return res.status(400).json({ message: 'Item não é um catálogo de produtos.' });
        }

        // Determinar display_order (último + 1 se não especificado)
        let finalDisplayOrder = display_order;
        if (finalDisplayOrder === undefined || finalDisplayOrder === null) {
            const lastOrderRes = await client.query(
                'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM product_catalog_items WHERE profile_item_id = $1',
                [itemId]
            );
            finalDisplayOrder = lastOrderRes.rows[0].next_order;
        }

        // Inserir produto
        const insertRes = await client.query(
            `INSERT INTO product_catalog_items (profile_item_id, name, description, price, image_url, display_order)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [itemId, name.trim(), description ? description.trim() : null, parseFloat(price), image_url || null, finalDisplayOrder]
        );

        res.status(201).json({ product: insertRes.rows[0] });
    } finally {
        client.release();
    }
}));

// Atualizar produto
router.put('/items/:itemId/products/:productId', protectUser, asyncHandler(async (req, res) => {
    const { itemId, productId } = req.params;
    const userId = req.user.userId;
    const { name, description, price, image_url, display_order } = req.body;

    const client = await db.pool.connect();
    try {
        // Verificar se o item pertence ao usuário e é do tipo product_catalog
        const itemCheck = await client.query(
            'SELECT id, user_id, item_type FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }

        if (itemCheck.rows[0].item_type !== 'product_catalog') {
            return res.status(400).json({ message: 'Item não é um catálogo de produtos.' });
        }

        // Verificar se o produto existe e pertence ao catálogo
        const productCheck = await client.query(
            'SELECT id FROM product_catalog_items WHERE id = $1 AND profile_item_id = $2',
            [productId, itemId]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }

        // Validações (apenas se fornecidos)
        if (name !== undefined) {
            if (!name || typeof name !== 'string' || name.trim().length < 2) {
                return res.status(400).json({ message: 'Nome do produto deve ter no mínimo 2 caracteres.' });
            }
        }

        if (price !== undefined) {
            if (isNaN(price) || parseFloat(price) <= 0) {
                return res.status(400).json({ message: 'Preço deve ser maior que zero.' });
            }
        }

        // Construir query de atualização dinâmica
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name.trim());
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description ? description.trim() : null);
        }
        if (price !== undefined) {
            updates.push(`price = $${paramCount++}`);
            values.push(parseFloat(price));
        }
        if (image_url !== undefined) {
            updates.push(`image_url = $${paramCount++}`);
            values.push(image_url || null);
        }
        if (display_order !== undefined) {
            updates.push(`display_order = $${paramCount++}`);
            values.push(parseInt(display_order));
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }

        values.push(productId, itemId);

        const updateRes = await client.query(
            `UPDATE product_catalog_items 
             SET ${updates.join(', ')} 
             WHERE id = $${paramCount++} AND profile_item_id = $${paramCount++}
             RETURNING *`,
            values
        );

        res.json({ product: updateRes.rows[0] });
    } finally {
        client.release();
    }
}));

// Remover produto
router.delete('/items/:itemId/products/:productId', protectUser, asyncHandler(async (req, res) => {
    const { itemId, productId } = req.params;
    const userId = req.user.userId;

    const client = await db.pool.connect();
    try {
        // Verificar se o item pertence ao usuário e é do tipo product_catalog
        const itemCheck = await client.query(
            'SELECT id, user_id, item_type FROM profile_items WHERE id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }

        if (itemCheck.rows[0].item_type !== 'product_catalog') {
            return res.status(400).json({ message: 'Item não é um catálogo de produtos.' });
        }

        // Verificar se o produto existe e pertence ao catálogo
        const productCheck = await client.query(
            'SELECT id FROM product_catalog_items WHERE id = $1 AND profile_item_id = $2',
            [productId, itemId]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }

        // Deletar produto
        await client.query(
            'DELETE FROM product_catalog_items WHERE id = $1 AND profile_item_id = $2',
            [productId, itemId]
        );

        res.json({ message: 'Produto removido com sucesso.' });
    } finally {
        client.release();
    }
}));

module.exports = router;

