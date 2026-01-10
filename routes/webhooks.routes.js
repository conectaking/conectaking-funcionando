// Rotas de Webhooks (Melhoria 20)
const express = require('express');
const router = express.Router();
const { protectUser } = require('../middleware/protectUser');
const asyncHandler = require('../middleware/asyncHandler');
const db = require('../db');
const logger = require('../utils/logger');
const { logAuditAction } = require('../utils/auditLogger');

/**
 * GET /api/webhooks - Listar webhooks do usuário
 */
router.get('/', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        const result = await client.query(`
            SELECT id, name, url, events, is_active, retry_count, timeout_ms,
                   created_at, updated_at, last_triggered_at
            FROM webhooks
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);
        
        // Log de auditoria (Melhoria 16)
        await logAuditAction({
            userId,
            actionType: 'view',
            resourceType: 'webhook',
            req
        });
        
        res.json({
            success: true,
            webhooks: result.rows
        });
    } finally {
        client.release();
    }
}));

/**
 * POST /api/webhooks - Criar novo webhook
 */
router.post('/', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const { name, url, events, secret_token, headers, retry_count, timeout_ms } = req.body;
        
        if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nome, URL e eventos são obrigatórios'
            });
        }
        
        // Validar URL
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: 'URL inválida'
            });
        }
        
        const result = await client.query(`
            INSERT INTO webhooks (
                user_id, name, url, events, secret_token, headers,
                retry_count, timeout_ms, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
            RETURNING id, name, url, events, is_active, created_at
        `, [
            userId,
            name,
            url,
            events,
            secret_token || null,
            headers ? JSON.stringify(headers) : null,
            retry_count || 3,
            timeout_ms || 30000
        ]);
        
        // Log de auditoria (Melhoria 16)
        await logAuditAction({
            userId,
            actionType: 'create',
            resourceType: 'webhook',
            resourceId: result.rows[0].id,
            details: { name, url, events },
            req
        });
        
        res.status(201).json({
            success: true,
            message: 'Webhook criado com sucesso',
            webhook: result.rows[0]
        });
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/webhooks/:id - Atualizar webhook
 */
router.put('/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const webhookId = parseInt(req.params.id, 10);
        const { name, url, events, secret_token, headers, retry_count, timeout_ms, is_active } = req.body;
        
        // Verificar se o webhook pertence ao usuário
        const check = await client.query(`
            SELECT id FROM webhooks WHERE id = $1 AND user_id = $2
        `, [webhookId, userId]);
        
        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Webhook não encontrado'
            });
        }
        
        // Construir query de update dinamicamente
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (url !== undefined) {
            updates.push(`url = $${paramIndex++}`);
            values.push(url);
        }
        if (events !== undefined) {
            updates.push(`events = $${paramIndex++}`);
            values.push(events);
        }
        if (secret_token !== undefined) {
            updates.push(`secret_token = $${paramIndex++}`);
            values.push(secret_token || null);
        }
        if (headers !== undefined) {
            updates.push(`headers = $${paramIndex++}`);
            values.push(headers ? JSON.stringify(headers) : null);
        }
        if (retry_count !== undefined) {
            updates.push(`retry_count = $${paramIndex++}`);
            values.push(retry_count);
        }
        if (timeout_ms !== undefined) {
            updates.push(`timeout_ms = $${paramIndex++}`);
            values.push(timeout_ms);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        
        updates.push(`updated_at = NOW()`);
        
        values.push(webhookId, userId);
        
        const result = await client.query(`
            UPDATE webhooks 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
            RETURNING id, name, url, events, is_active, updated_at
        `, values);
        
        // Log de auditoria (Melhoria 16)
        await logAuditAction({
            userId,
            actionType: 'update',
            resourceType: 'webhook',
            resourceId: webhookId,
            details: req.body,
            req
        });
        
        res.json({
            success: true,
            message: 'Webhook atualizado com sucesso',
            webhook: result.rows[0]
        });
    } finally {
        client.release();
    }
}));

/**
 * DELETE /api/webhooks/:id - Deletar webhook
 */
router.delete('/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const webhookId = parseInt(req.params.id, 10);
        
        // Verificar se o webhook pertence ao usuário
        const check = await client.query(`
            SELECT id FROM webhooks WHERE id = $1 AND user_id = $2
        `, [webhookId, userId]);
        
        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Webhook não encontrado'
            });
        }
        
        await client.query(`
            DELETE FROM webhooks WHERE id = $1 AND user_id = $2
        `, [webhookId, userId]);
        
        // Log de auditoria (Melhoria 16)
        await logAuditAction({
            userId,
            actionType: 'delete',
            resourceType: 'webhook',
            resourceId: webhookId,
            req
        });
        
        res.json({
            success: true,
            message: 'Webhook deletado com sucesso'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/webhooks/:id/deliveries - Histórico de entregas do webhook
 */
router.get('/:id/deliveries', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const webhookId = parseInt(req.params.id, 10);
        const limit = parseInt(req.query.limit, 10) || 50;
        
        // Verificar se o webhook pertence ao usuário
        const check = await client.query(`
            SELECT id FROM webhooks WHERE id = $1 AND user_id = $2
        `, [webhookId, userId]);
        
        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Webhook não encontrado'
            });
        }
        
        const result = await client.query(`
            SELECT id, event_type, status, http_status, error_message,
                   attempt_number, created_at, delivered_at
            FROM webhook_deliveries
            WHERE webhook_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [webhookId, limit]);
        
        res.json({
            success: true,
            deliveries: result.rows
        });
    } finally {
        client.release();
    }
}));

module.exports = router;
