/**
 * Rotas públicas do módulo Agenda
 * Rotas acessíveis sem autenticação para agendamento público
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const agendaService = require('../modules/agenda/agenda.service');
const agendaRepository = require('../modules/agenda/agenda.repository');
const responseFormatter = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * Página pública de agendamento
 * GET /:slug/agenda
 */
router.get('/:slug/agenda', asyncHandler(async (req, res) => {
    try {
        // Buscar usuário por slug
        const { slug } = req.params;
        const db = require('../db');
        const userResult = await db.pool.query(
            `SELECT u.id FROM users u 
             JOIN profile_items pi ON u.id = pi.user_id 
             WHERE pi.slug = $1 AND pi.item_type = 'agenda' AND pi.is_active = true
             LIMIT 1`,
            [slug]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).render('error', { message: 'Página de agendamento não encontrada' });
        }

        const ownerUserId = userResult.rows[0].id;
        const settings = await agendaRepository.findOrCreateSettings(ownerUserId);

        // Renderizar página pública
        res.render('agendaPublic', {
            ownerUserId,
            settings,
            slug
        });
    } catch (error) {
        logger.error('Erro ao carregar página pública de agenda:', error);
        res.status(500).render('error', { message: 'Erro ao carregar página de agendamento' });
    }
}));

/**
 * Buscar disponibilidade para uma data
 * GET /api/agenda/:slug/availability
 */
router.get('/api/agenda/:slug/availability', asyncHandler(async (req, res) => {
    try {
        const { slug } = req.params;
        const { date } = req.query;

        if (!date) {
            return responseFormatter.error(res, 'Parâmetro date é obrigatório', 400);
        }

        // Buscar usuário por slug
        const db = require('../db');
        const userResult = await db.pool.query(
            `SELECT u.id FROM users u 
             JOIN profile_items pi ON u.id = pi.user_id 
             WHERE pi.slug = $1 AND pi.item_type = 'agenda' AND pi.is_active = true
             LIMIT 1`,
            [slug]
        );

        if (userResult.rows.length === 0) {
            return responseFormatter.error(res, 'Página de agendamento não encontrada', 404);
        }

        const ownerUserId = userResult.rows[0].id;
        const availability = await agendaService.getAvailability(ownerUserId, date);

        return responseFormatter.success(res, availability);
    } catch (error) {
        logger.error('Erro ao buscar disponibilidade:', error);
        return responseFormatter.error(res, error.message, 500);
    }
}));

/**
 * Reservar slot (cria PENDING)
 * POST /api/agenda/:slug/reserve
 */
router.post('/api/agenda/:slug/reserve', asyncHandler(async (req, res) => {
    try {
        const { slug } = req.params;
        const { start_at, end_at, full_name, email, whatsapp, cpf, notes, form_data, lgpd_consent, lgpd_consent_ip, lgpd_consent_user_agent } = req.body;

        // Buscar usuário por slug
        const db = require('../db');
        const userResult = await db.pool.query(
            `SELECT u.id FROM users u 
             JOIN profile_items pi ON u.id = pi.user_id 
             WHERE pi.slug = $1 AND pi.item_type = 'agenda' AND pi.is_active = true
             LIMIT 1`,
            [slug]
        );

        if (userResult.rows.length === 0) {
            return responseFormatter.error(res, 'Página de agendamento não encontrada', 404);
        }

        const ownerUserId = userResult.rows[0].id;

        const reservation = await agendaService.reserveSlot(ownerUserId, {
            start_at,
            end_at,
            full_name,
            email,
            whatsapp,
            cpf,
            notes,
            form_data,
            lgpd_consent: lgpd_consent === true || lgpd_consent === 'true',
            lgpd_consent_ip: lgpd_consent_ip || req.ip,
            lgpd_consent_user_agent: lgpd_consent_user_agent || req.get('user-agent')
        });

        return responseFormatter.success(res, reservation, 'Slot reservado com sucesso', 201);
    } catch (error) {
        logger.error('Erro ao reservar slot:', error);
        return responseFormatter.error(res, error.message, 400);
    }
}));

/**
 * Confirmar agendamento (cria eventos no Google Calendar)
 * POST /api/agenda/:slug/confirm
 */
router.post('/api/agenda/:slug/confirm', asyncHandler(async (req, res) => {
    try {
        const { slug } = req.params;
        const { reservation_id, client_tokens } = req.body;

        // Buscar usuário por slug
        const db = require('../db');
        const userResult = await db.pool.query(
            `SELECT u.id FROM users u 
             JOIN profile_items pi ON u.id = pi.user_id 
             WHERE pi.slug = $1 AND pi.item_type = 'agenda' AND pi.is_active = true
             LIMIT 1`,
            [slug]
        );

        if (userResult.rows.length === 0) {
            return responseFormatter.error(res, 'Página de agendamento não encontrada', 404);
        }

        const confirmation = await agendaService.confirmAppointment(reservation_id, client_tokens);

        return responseFormatter.success(res, confirmation, 'Agendamento confirmado com sucesso');
    } catch (error) {
        logger.error('Erro ao confirmar agendamento:', error);
        return responseFormatter.error(res, error.message, 400);
    }
}));

/**
 * Cancelar agendamento (público)
 * POST /api/agenda/:slug/cancel
 */
router.post('/api/agenda/:slug/cancel', asyncHandler(async (req, res) => {
    try {
        const { slug } = req.params;
        const { appointment_id } = req.body;

        // Buscar usuário por slug
        const db = require('../db');
        const userResult = await db.pool.query(
            `SELECT u.id FROM users u 
             JOIN profile_items pi ON u.id = pi.user_id 
             WHERE pi.slug = $1 AND pi.item_type = 'agenda' AND pi.is_active = true
             LIMIT 1`,
            [slug]
        );

        if (userResult.rows.length === 0) {
            return responseFormatter.error(res, 'Página de agendamento não encontrada', 404);
        }

        const ownerUserId = userResult.rows[0].id;
        await agendaService.cancelAppointment(appointment_id, ownerUserId);

        return responseFormatter.success(res, null, 'Agendamento cancelado com sucesso');
    } catch (error) {
        logger.error('Erro ao cancelar agendamento:', error);
        return responseFormatter.error(res, error.message, 400);
    }
}));

module.exports = router;
