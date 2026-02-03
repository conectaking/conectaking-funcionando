/**
 * Health check endpoint
 * Retorna status do servidor, banco de dados e serviços
 */

const express = require('express');
const db = require('../db');
const logger = require('../utils/logger');
const config = require('../config');
const { r2Diagnostic } = require('../utils/r2');

const router = express.Router();

/** Diagnóstico R2: testa se o Node no Render consegue conectar ao Cloudflare R2. */
router.get('/diagnostic/r2', async (req, res) => {
    const token = (process.env.R2_DIAGNOSTIC_TOKEN || '').toString().trim();
    const provided = (req.query.token || req.headers['x-diagnostic-token'] || '').toString().trim();
    if (!token) {
        return res.status(503).json({
            ok: false,
            message: 'Configure R2_DIAGNOSTIC_TOKEN nas variáveis de ambiente do Render para usar este endpoint.'
        });
    }
    if (provided !== token) {
        return res.status(403).json({
            ok: false,
            message: 'Token inválido. Use ?token=SEU_TOKEN ou header X-Diagnostic-Token.'
        });
    }
    try {
        const result = await r2Diagnostic();
        res.json(result);
    } catch (err) {
        logger.error('Erro no diagnóstico R2', err);
        res.status(500).json({
            ok: false,
            message: err?.message || 'Erro ao executar diagnóstico',
            stack: config.nodeEnv !== 'production' ? err?.stack : undefined
        });
    }
});

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
