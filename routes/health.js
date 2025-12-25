/**
 * Health check endpoint
 * Retorna status do servidor, banco de dados e serviços
 */

const express = require('express');
const db = require('../db');
const logger = require('../utils/logger');
const config = require('../config');

const router = express.Router();

router.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
        services: {
            database: 'unknown',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                unit: 'MB'
            }
        }
    };

    // Verificar conexão com banco de dados
    try {
        const client = await db.pool.connect();
        try {
            await client.query('SELECT 1');
            health.services.database = 'connected';
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Erro ao verificar conexão com banco', error);
        health.services.database = 'disconnected';
        health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

module.exports = router;
