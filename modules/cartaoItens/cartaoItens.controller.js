const db = require('../../db');
const service = require('./cartaoItens.service');
const logger = require('../../utils/logger');

async function list(req, res) {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const rows = await service.listItems(client, userId);
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao buscar itens', { error: error.message });
        res.status(500).json({ message: 'Erro ao buscar itens.' });
    } finally {
        client.release();
    }
}

async function getById(req, res) {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = req.params.id;
        const result = await service.getItem(client, itemId, userId);
        if (result.badRequest) {
            return res.status(400).json({ success: false, error: result.error });
        }
        if (result.notFound) {
            return res.status(404).json({ success: false, error: result.error });
        }
        if (result.forbidden) {
            return res.status(403).json({ success: false, error: result.error });
        }
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.json(result);
    } catch (error) {
        logger.error('Erro ao buscar item', { error: error.message });
        res.status(500).json({ success: false, error: 'Erro ao buscar item.' });
    } finally {
        client.release();
    }
}

module.exports = {
    list,
    getById
};
