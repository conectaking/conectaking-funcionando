// Serviço de Webhooks (Melhoria 20)
const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');
const logger = require('./logger');

/**
 * Dispara um webhook para todos os webhooks configurados para um evento
 * @param {string} eventType - Tipo do evento (form.submit, guest.confirm, response.create, etc)
 * @param {Object} payload - Dados do evento
 * @param {number} userId - ID do usuário (opcional, filtra webhooks do usuário)
 */
async function triggerWebhooks(eventType, payload, userId = null) {
    try {
        const client = await db.pool.connect();
        
        try {
            // Buscar webhooks ativos para este evento
            let query = `
                SELECT id, url, secret_token, retry_count, timeout_ms, headers
                FROM webhooks
                WHERE is_active = true
                AND $1 = ANY(events)
            `;
            const params = [eventType];
            
            if (userId) {
                query += ` AND user_id = $2`;
                params.push(userId);
            }
            
            const result = await client.query(query, params);
            const webhooks = result.rows;
            
            if (webhooks.length === 0) {
                return { triggered: 0, successful: 0, failed: 0 };
            }
            
            // Disparar webhooks em paralelo (sem aguardar)
            const promises = webhooks.map(webhook => 
                deliverWebhook(webhook.id, eventType, payload, webhook)
            );
            
            const results = await Promise.allSettled(promises);
            
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;
            
            logger.info(`✅ [WEBHOOKS] Evento ${eventType}: ${successful} sucessos, ${failed} falhas`);
            
            return { triggered: webhooks.length, successful, failed };
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Erro ao disparar webhooks:', error);
        return { triggered: 0, successful: 0, failed: 0 };
    }
}

/**
 * Entrega um webhook específico
 * @param {number} webhookId - ID do webhook
 * @param {string} eventType - Tipo do evento
 * @param {Object} payload - Dados do evento
 * @param {Object} webhookConfig - Configuração do webhook
 */
async function deliverWebhook(webhookId, eventType, payload, webhookConfig) {
    const maxRetries = webhookConfig.retry_count || 3;
    const timeout = webhookConfig.timeout_ms || 30000;
    let attempt = 1;
    let lastError = null;
    
    while (attempt <= maxRetries) {
        try {
            // Criar payload com metadata
            const webhookPayload = {
                event: eventType,
                timestamp: new Date().toISOString(),
                data: payload
            };
            
            // Criar assinatura HMAC se houver secret_token
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'ConectaKing-Webhook/1.0',
                ...(webhookConfig.headers || {})
            };
            
            if (webhookConfig.secret_token) {
                const signature = crypto
                    .createHmac('sha256', webhookConfig.secret_token)
                    .update(JSON.stringify(webhookPayload))
                    .digest('hex');
                headers['X-Webhook-Signature'] = `sha256=${signature}`;
            }
            
            // Fazer requisição
            const response = await axios.post(
                webhookConfig.url,
                webhookPayload,
                {
                    headers,
                    timeout,
                    validateStatus: (status) => status >= 200 && status < 500
                }
            );
            
            // Registrar sucesso
            await recordWebhookDelivery(webhookId, eventType, payload, {
                status: response.status < 400 ? 'success' : 'failed',
                httpStatus: response.status,
                responseBody: JSON.stringify(response.data).substring(0, 1000),
                attemptNumber: attempt
            });
            
            // Atualizar last_triggered_at
            const client = await db.pool.connect();
            try {
                await client.query(`
                    UPDATE webhooks 
                    SET last_triggered_at = NOW() 
                    WHERE id = $1
                `, [webhookId]);
            } finally {
                client.release();
            }
            
            if (response.status < 400) {
                return { success: true, attempt };
            }
            
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            lastError = error;
            
            // Registrar falha
            await recordWebhookDelivery(webhookId, eventType, payload, {
                status: 'failed',
                httpStatus: null,
                errorMessage: error.message,
                attemptNumber: attempt
            });
            
            // Se não é o último attempt, aguardar antes de tentar novamente (exponential backoff)
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        attempt++;
    }
    
    // Registrar retry agendado se ainda houver tentativas
    if (attempt <= maxRetries) {
        await recordWebhookDelivery(webhookId, eventType, payload, {
            status: 'retrying',
            attemptNumber: attempt,
            nextRetryAt: new Date(Date.now() + Math.min(1000 * Math.pow(2, attempt - 1), 30000))
        });
    }
    
    return { success: false, error: lastError?.message, attempts: attempt - 1 };
}

/**
 * Registra uma entrega de webhook no histórico
 */
async function recordWebhookDelivery(webhookId, eventType, payload, result) {
    const client = await db.pool.connect();
    try {
        await client.query(`
            INSERT INTO webhook_deliveries (
                webhook_id, event_type, payload, status, http_status,
                response_body, error_message, attempt_number, delivered_at, next_retry_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            webhookId,
            eventType,
            JSON.stringify(payload),
            result.status,
            result.httpStatus || null,
            result.responseBody || null,
            result.errorMessage || null,
            result.attemptNumber || 1,
            result.status === 'success' ? new Date() : null,
            result.nextRetryAt || null
        ]);
    } catch (error) {
        logger.error('Erro ao registrar entrega de webhook:', error);
    } finally {
        client.release();
    }
}

module.exports = {
    triggerWebhooks,
    deliverWebhook
};
