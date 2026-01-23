// Serviço de Notificações Push (Melhoria 21)
const webpush = require('web-push');
const db = require('../db');
const logger = require('./logger');

// Configurar VAPID keys (deve estar nas variáveis de ambiente)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@conectaking.com.br';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Envia uma notificação push para um usuário
 * @param {number} userId - ID do usuário
 * @param {Object} notification - Objeto de notificação
 * @param {string} notification.title - Título da notificação
 * @param {string} notification.body - Corpo da notificação
 * @param {string} notification.icon - URL do ícone (opcional)
 * @param {string} notification.badge - URL do badge (opcional)
 * @param {Object} notification.data - Dados adicionais (opcional)
 */
async function sendPushNotification(userId, notification) {
    const { title, body, icon, badge, data = {} } = notification;
    
    try {
        const client = await db.pool.connect();
        
        try {
            // Buscar todas as subscrições ativas do usuário
            const subscriptions = await client.query(`
                SELECT id, endpoint, p256dh_key, auth_key
                FROM push_subscriptions
                WHERE user_id = $1
            `, [userId]);
            
            if (subscriptions.rows.length === 0) {
                logger.info(`Nenhuma subscrição push encontrada para usuário ${userId}`);
                return { sent: 0, failed: 0 };
            }
            
            let sent = 0;
            let failed = 0;
            
            // Enviar para todas as subscrições
            for (const subscription of subscriptions.rows) {
                try {
                    const pushSubscription = {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh_key,
                            auth: subscription.auth_key
                        }
                    };
                    
                    const payload = JSON.stringify({
                        title,
                        body,
                        icon: icon || '/logo.png',
                        badge: badge || '/logo.png',
                        data: {
                            timestamp: new Date().toISOString(),
                            userId,
                            ...data
                        }
                    });
                    
                    await webpush.sendNotification(pushSubscription, payload);
                    
                    // Registrar sucesso
                    await recordPushNotification(userId, subscription.id, {
                        title,
                        body,
                        icon,
                        badge,
                        data,
                        status: 'sent'
                    });
                    
                    // Atualizar last_notification_at
                    await client.query(`
                        UPDATE push_subscriptions 
                        SET last_notification_at = NOW() 
                        WHERE id = $1
                    `, [subscription.id]);
                    
                    sent++;
                } catch (error) {
                    logger.error(`Erro ao enviar push para subscrição ${subscription.id}:`, error);
                    
                    // Registrar falha
                    await recordPushNotification(userId, subscription.id, {
                        title,
                        body,
                        icon,
                        badge,
                        data,
                        status: 'failed',
                        errorMessage: error.message
                    });
                    
                    // Se a subscrição é inválida (410 Gone), remover
                    if (error.statusCode === 410) {
                        await client.query(`
                            DELETE FROM push_subscriptions WHERE id = $1
                        `, [subscription.id]);
                        logger.info(`Subscrição ${subscription.id} removida (inválida)`);
                    }
                    
                    failed++;
                }
            }
            
            return { sent, failed };
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Erro ao enviar notificações push:', error);
        return { sent: 0, failed: 0 };
    }
}

/**
 * Registra uma notificação push no histórico
 */
async function recordPushNotification(userId, subscriptionId, notification, result = {}) {
    const client = await db.pool.connect();
    try {
        await client.query(`
            INSERT INTO push_notifications (
                user_id, subscription_id, title, body, icon_url, badge_url,
                data, status, sent_at, error_message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            userId,
            subscriptionId,
            notification.title,
            notification.body,
            notification.icon || null,
            notification.badge || null,
            JSON.stringify(notification.data || {}),
            result.status || 'pending',
            result.status === 'sent' ? new Date() : null,
            result.errorMessage || null
        ]);
    } catch (error) {
        logger.error('Erro ao registrar notificação push:', error);
    } finally {
        client.release();
    }
}

/**
 * Salva uma subscrição push de um usuário
 */
async function savePushSubscription(userId, subscription) {
    const client = await db.pool.connect();
    try {
        const { endpoint, keys } = subscription;
        const userAgent = subscription.userAgent || null;
        
        // Verificar se já existe
        const existing = await client.query(`
            SELECT id FROM push_subscriptions WHERE endpoint = $1
        `, [endpoint]);
        
        if (existing.rows.length > 0) {
            // Atualizar
            await client.query(`
                UPDATE push_subscriptions 
                SET user_id = $1, p256dh_key = $2, auth_key = $3,
                    user_agent = $4, updated_at = NOW()
                WHERE endpoint = $5
            `, [userId, keys.p256dh, keys.auth, userAgent, endpoint]);
            
            return existing.rows[0].id;
        } else {
            // Criar nova
            const result = await client.query(`
                INSERT INTO push_subscriptions (
                    user_id, endpoint, p256dh_key, auth_key, user_agent
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [userId, endpoint, keys.p256dh, keys.auth, userAgent]);
            
            return result.rows[0].id;
        }
    } finally {
        client.release();
    }
}

module.exports = {
    sendPushNotification,
    savePushSubscription,
    vapidPublicKey
};
