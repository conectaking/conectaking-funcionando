// Utilitário de Histórico de Confirmações (Melhoria 7)
const db = require('../db');
const logger = require('./logger');

/**
 * Registra uma mudança de status no histórico de confirmações
 * @param {Object} options - Opções da confirmação
 * @param {number} options.guestId - ID do convidado
 * @param {number} options.guestListId - ID da lista de convidados
 * @param {string} options.action - Ação realizada (registered, confirmed, checked_in, cancelled)
 * @param {string} options.previousStatus - Status anterior
 * @param {string} options.newStatus - Novo status
 * @param {string} options.confirmedBy - ID ou nome de quem confirmou (opcional)
 * @param {string} options.confirmationMethod - Método usado (qr_code, cpf, manual, whatsapp, api, webhook)
 * @param {Object} options.req - Request object (para IP, user agent)
 * @param {string} options.notes - Notas adicionais (opcional)
 */
async function logConfirmationHistory(options) {
    const {
        guestId,
        guestListId,
        action,
        previousStatus,
        newStatus,
        confirmedBy = null,
        confirmationMethod = 'manual',
        req = null,
        notes = null
    } = options;

    try {
        const client = await db.pool.connect();
        
        try {
            const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
            const userAgent = req?.headers?.['user-agent'] || null;

            await client.query(`
                INSERT INTO guest_confirmation_history (
                    guest_id, guest_list_id, action, previous_status, new_status,
                    confirmed_by, confirmation_method, ip_address, user_agent, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                guestId,
                guestListId,
                action,
                previousStatus || null,
                newStatus,
                confirmedBy || null,
                confirmationMethod,
                ipAddress,
                userAgent,
                notes || null
            ]);
        } finally {
            client.release();
        }
    } catch (error) {
        // Não queremos que falhas no histórico quebrem o sistema
        logger.error('Erro ao registrar histórico de confirmação:', error);
    }
}

/**
 * Busca histórico de confirmações de um convidado
 * @param {number} guestId - ID do convidado
 * @param {number} limit - Limite de resultados (padrão: 50)
 */
async function getGuestConfirmationHistory(guestId, limit = 50) {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                id, action, previous_status, new_status, confirmed_by,
                confirmation_method, ip_address, user_agent, notes, created_at
            FROM guest_confirmation_history
            WHERE guest_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [guestId, limit]);
        
        return result.rows;
    } finally {
        client.release();
    }
}

/**
 * Busca histórico de confirmações de uma lista
 * @param {number} guestListId - ID da lista
 * @param {number} limit - Limite de resultados (padrão: 100)
 */
async function getListConfirmationHistory(guestListId, limit = 100) {
    const client = await db.pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                h.id, h.guest_id, g.name as guest_name,
                h.action, h.previous_status, h.new_status, h.confirmed_by,
                h.confirmation_method, h.ip_address, h.user_agent, h.notes, h.created_at
            FROM guest_confirmation_history h
            INNER JOIN guests g ON g.id = h.guest_id
            WHERE h.guest_list_id = $1
            ORDER BY h.created_at DESC
            LIMIT $2
        `, [guestListId, limit]);
        
        return result.rows;
    } finally {
        client.release();
    }
}

module.exports = {
    logConfirmationHistory,
    getGuestConfirmationHistory,
    getListConfirmationHistory
};
