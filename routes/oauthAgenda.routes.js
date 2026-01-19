/**
 * Rotas OAuth do módulo Agenda (isoladas)
 * Gerencia autenticação OAuth do Google para dono e cliente
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { protectAgenda } = require('../middleware/protectAgenda');
const googleOAuthService = require('../modules/agenda/google/googleOAuth.service');
const responseFormatter = require('../utils/responseFormatter');
const logger = require('../utils/logger');
const db = require('../db');

/**
 * Iniciar OAuth do dono
 * GET /api/oauth/agenda/google/owner/connect
 */
router.get('/google/owner/connect', protectAgenda, asyncHandler(async (req, res) => {
    try {
        const userId = req.user.userId;
        const state = Buffer.from(JSON.stringify({ userId, type: 'owner' })).toString('base64');
        const authUrl = googleOAuthService.getAuthUrl('owner', state);
        res.redirect(authUrl);
    } catch (error) {
        logger.error('Erro ao iniciar OAuth do dono:', error);
        res.status(500).send('Erro ao conectar Google Calendar');
    }
}));

/**
 * Callback OAuth do dono
 * GET /api/oauth/agenda/google/owner/callback
 */
router.get('/google/owner/callback', asyncHandler(async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).send('Código de autorização não fornecido');
        }

        // Decodificar state
        let stateData = {};
        if (state) {
            try {
                stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            } catch (e) {
                logger.warn('Erro ao decodificar state:', e);
            }
        }

        const userId = stateData.userId || req.user?.userId;
        if (!userId) {
            return res.status(401).send('Usuário não identificado');
        }

        // Obter tokens
        const tokens = await googleOAuthService.getTokensFromCode(code, 'owner');

        // Criptografar tokens
        const encryptedTokens = googleOAuthService.encryptTokens(tokens);

        // Buscar informações do usuário Google
        const oauth2Client = googleOAuthService.createAuthenticatedClient(tokens);
        const oauth2 = require('googleapis').google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Salvar ou atualizar conta OAuth
        const client = await db.pool.connect();
        try {
            await client.query(
                `INSERT INTO oauth_accounts (
                    user_id, provider, provider_account_id, email,
                    access_token_encrypted, refresh_token_encrypted, token_expiry, scopes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (provider, provider_account_id) 
                DO UPDATE SET 
                    access_token_encrypted = EXCLUDED.access_token_encrypted,
                    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                    token_expiry = EXCLUDED.token_expiry,
                    updated_at = NOW()`,
                [
                    userId,
                    'google',
                    userInfo.data.id,
                    userInfo.data.email,
                    encryptedTokens.access_token_encrypted,
                    encryptedTokens.refresh_token_encrypted,
                    encryptedTokens.token_expiry,
                    ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
                ]
            );
        } finally {
            client.release();
        }

        // Redirecionar para dashboard
        const frontendUrl = process.env.FRONTEND_URL || 'https://conectaking.com.br';
        res.redirect(`${frontendUrl}/dashboard.html?agenda=connected`);
    } catch (error) {
        logger.error('Erro no callback OAuth do dono:', error);
        res.status(500).send('Erro ao conectar Google Calendar');
    }
}));

/**
 * Iniciar OAuth do cliente
 * GET /api/oauth/agenda/google/client/start
 */
router.get('/google/client/start', asyncHandler(async (req, res) => {
    try {
        const { reservation_id } = req.query;

        if (!reservation_id) {
            return responseFormatter.error(res, 'reservation_id é obrigatório', 400);
        }

        const state = Buffer.from(JSON.stringify({ reservation_id, type: 'client' })).toString('base64');
        const authUrl = googleOAuthService.getAuthUrl('client', state);
        res.redirect(authUrl);
    } catch (error) {
        logger.error('Erro ao iniciar OAuth do cliente:', error);
        res.status(500).send('Erro ao iniciar autenticação Google');
    }
}));

/**
 * Callback OAuth do cliente
 * GET /api/oauth/agenda/google/client/callback
 */
router.get('/google/client/callback', asyncHandler(async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).send('Código de autorização não fornecido');
        }

        // Decodificar state
        let stateData = {};
        if (state) {
            try {
                stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            } catch (e) {
                logger.warn('Erro ao decodificar state:', e);
            }
        }

        const reservationId = stateData.reservation_id;
        if (!reservationId) {
            return res.status(400).send('ID de reserva não encontrado');
        }

        // Obter tokens (não armazenar refresh_token para clientes por padrão)
        const tokens = await googleOAuthService.getTokensFromCode(code, 'client');

        // Buscar informações do usuário Google
        const oauth2Client = googleOAuthService.createAuthenticatedClient(tokens);
        const oauth2 = require('googleapis').google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Confirmar agendamento com tokens do cliente
        const agendaService = require('../modules/agenda/agenda.service');
        const confirmation = await agendaService.confirmAppointment(reservationId, tokens);

        // Redirecionar para página de sucesso
        const frontendUrl = process.env.FRONTEND_URL || 'https://conectaking.com.br';
        res.redirect(`${frontendUrl}/agenda/success?meetLink=${encodeURIComponent(confirmation.meetLink || '')}`);
    } catch (error) {
        logger.error('Erro no callback OAuth do cliente:', error);
        res.status(500).send('Erro ao confirmar agendamento');
    }
}));

module.exports = router;
