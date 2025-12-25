/**
 * Utility para registrar atividades dos usuários
 * Usado para analytics avançado e rastreamento de uso
 */

const db = require('../db');
const logger = require('./logger');

/**
 * Tipos de atividade disponíveis
 */
const ActivityTypes = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    PROFILE_UPDATE: 'profile_update',
    LINK_CREATED: 'link_created',
    LINK_UPDATED: 'link_updated',
    LINK_DELETED: 'link_deleted',
    PROFILE_VIEWED: 'profile_viewed', // Quando o próprio usuário visualiza seu perfil
    SETTINGS_UPDATED: 'settings_updated',
    CODE_GENERATED: 'code_generated',
    TEAM_MEMBER_ADDED: 'team_member_added',
    TEAM_MEMBER_REMOVED: 'team_member_removed',
    SUBSCRIPTION_UPDATED: 'subscription_updated',
    PAYMENT_PROCESSED: 'payment_processed',
    PASSWORD_CHANGED: 'password_changed'
};

/**
 * Registra uma atividade do usuário
 * @param {string} userId - ID do usuário
 * @param {string} activityType - Tipo de atividade (usar ActivityTypes)
 * @param {Object} options - Opções adicionais
 * @param {string} options.description - Descrição da atividade
 * @param {Object} options.req - Request object (para pegar IP e User-Agent)
 * @param {Object} options.metadata - Dados extras em formato JSON
 * @returns {Promise<void>}
 */
async function logActivity(userId, activityType, options = {}) {
    try {
        if (!userId || !activityType) {
            logger.warn('Tentativa de registrar atividade sem userId ou activityType', { userId, activityType });
            return;
        }

        const { description = null, req = null, metadata = null } = options;
        
        let ipAddress = null;
        let userAgent = null;
        
        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || null;
            userAgent = req.headers['user-agent'] || null;
            
            // Se x-forwarded-for contém múltiplos IPs, pega o primeiro
            if (ipAddress && ipAddress.includes(',')) {
                ipAddress = ipAddress.split(',')[0].trim();
            }
        }

        await db.query(
            `INSERT INTO user_activities (user_id, activity_type, activity_description, ip_address, user_agent, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
                userId,
                activityType,
                description,
                ipAddress,
                userAgent,
                metadata ? JSON.stringify(metadata) : null
            ]
        );
        
        logger.debug('Atividade registrada', { userId, activityType });
    } catch (error) {
        // Não queremos que erros no log de atividades quebrem o fluxo principal
        logger.error('Erro ao registrar atividade do usuário', { 
            error: error.message, 
            userId, 
            activityType 
        });
    }
}

/**
 * Registra login do usuário
 */
async function logLogin(userId, req) {
    await logActivity(userId, ActivityTypes.LOGIN, {
        description: 'Usuário fez login no sistema',
        req
    });
}

/**
 * Registra atualização de perfil
 */
async function logProfileUpdate(userId, req, updatedFields = null) {
    await logActivity(userId, ActivityTypes.PROFILE_UPDATE, {
        description: 'Usuário atualizou informações do perfil',
        req,
        metadata: updatedFields ? { fields: updatedFields } : null
    });
}

/**
 * Registra criação de link
 */
async function logLinkCreated(userId, linkId, req) {
    await logActivity(userId, ActivityTypes.LINK_CREATED, {
        description: 'Usuário criou um novo link',
        req,
        metadata: { link_id: linkId }
    });
}

/**
 * Registra atualização de link
 */
async function logLinkUpdated(userId, linkId, req) {
    await logActivity(userId, ActivityTypes.LINK_UPDATED, {
        description: 'Usuário atualizou um link',
        req,
        metadata: { link_id: linkId }
    });
}

/**
 * Registra deleção de link
 */
async function logLinkDeleted(userId, linkId, req) {
    await logActivity(userId, ActivityTypes.LINK_DELETED, {
        description: 'Usuário deletou um link',
        req,
        metadata: { link_id: linkId }
    });
}

/**
 * Registra atualização de configurações
 */
async function logSettingsUpdate(userId, req, settingsUpdated = null) {
    await logActivity(userId, ActivityTypes.SETTINGS_UPDATED, {
        description: 'Usuário atualizou configurações',
        req,
        metadata: settingsUpdated ? { settings: settingsUpdated } : null
    });
}

module.exports = {
    logActivity,
    logLogin,
    logProfileUpdate,
    logLinkCreated,
    logLinkUpdated,
    logLinkDeleted,
    logSettingsUpdate,
    ActivityTypes
};
