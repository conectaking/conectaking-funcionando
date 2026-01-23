const repository = require('./agenda.repository');
const validators = require('./agenda.validators');
const googleOAuthService = require('./google/googleOAuth.service');
const googleCalendarService = require('./google/googleCalendar.service');
const { encrypt, decrypt, maskCPF } = require('../../utils/encryption');
const logger = require('../../utils/logger');
const TYPES = require('./agenda.types');
const db = require('../../db');

class AgendaService {
    /**
     * Buscar ou criar configurações
     */
    async getSettings(ownerUserId) {
        return await repository.findOrCreateSettings(ownerUserId);
    }

    /**
     * Atualizar configurações
     */
    async updateSettings(ownerUserId, data) {
        const validation = validators.validateSettings(data, true);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        return await repository.updateSettings(ownerUserId, data);
    }

    /**
     * Criar slot
     */
    async createSlot(ownerUserId, data) {
        const validation = validators.validateSlot({ ...data, owner_user_id: ownerUserId });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        return await repository.createSlot({
            ...data,
            owner_user_id: ownerUserId
        });
    }

    /**
     * Buscar slots do usuário
     */
    async findSlotsByOwnerId(ownerUserId, isActive = true) {
        return await repository.findSlotsByOwnerId(ownerUserId, isActive);
    }

    /**
     * Deletar slot
     */
    async deleteSlot(slotId, ownerUserId) {
        const slot = await repository.findSlotsByOwnerId(ownerUserId);
        const foundSlot = slot.find(s => s.id === slotId);
        if (!foundSlot) {
            throw new Error('Slot não encontrado');
        }

        return await repository.deleteSlot(slotId, ownerUserId);
    }

    /**
     * Criar data bloqueada
     */
    async createBlockedDate(ownerUserId, data) {
        return await repository.createBlockedDate({
            ...data,
            owner_user_id: ownerUserId
        });
    }

    /**
     * Buscar datas bloqueadas
     */
    async findBlockedDatesByOwnerId(ownerUserId, dateFrom = null, dateTo = null) {
        return await repository.findBlockedDatesByOwnerId(ownerUserId, dateFrom, dateTo);
    }

    /**
     * Buscar disponibilidade para uma data
     */
    async getAvailability(ownerUserId, date) {
        // Buscar configurações
        const settings = await repository.findOrCreateSettings(ownerUserId);
        
        // Buscar slots disponíveis
        const slots = await repository.findAvailableSlots(ownerUserId, date);
        
        // Buscar datas bloqueadas
        const blockedDates = await repository.findBlockedDatesByOwnerId(ownerUserId, date, date);
        const isBlocked = blockedDates.length > 0;
        
        // Buscar agendamentos existentes para esta data
        const appointments = await repository.findAppointmentsByOwnerId(ownerUserId, {
            dateFrom: `${date}T00:00:00`,
            dateTo: `${date}T23:59:59`,
            status: 'CONFIRMED'
        });

        // Filtrar slots ocupados
        const availableSlots = slots.filter(slot => {
            const slotStart = `${date}T${slot.start_time}`;
            const slotEnd = slot.end_time ? `${date}T${slot.end_time}` : null;
            
            // Verificar se há conflito com agendamentos
            const hasConflict = appointments.some(apt => {
                const aptStart = new Date(apt.start_at);
                const aptEnd = new Date(apt.end_at);
                const slotStartTime = new Date(slotStart);
                const slotEndTime = slotEnd ? new Date(slotEnd) : new Date(slotStartTime.getTime() + settings.meeting_duration_minutes * 60000);
                
                return (slotStartTime < aptEnd && slotEndTime > aptStart);
            });

            return !hasConflict;
        });

        return {
            date,
            isBlocked,
            slots: availableSlots,
            settings: {
                meeting_duration_minutes: settings.meeting_duration_minutes,
                buffer_minutes: settings.buffer_minutes
            }
        };
    }

    /**
     * Reservar slot (cria PENDING)
     */
    async reserveSlot(ownerUserId, data) {
        const validation = validators.validateAppointment({
            ...data,
            owner_user_id: ownerUserId
        });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        // Verificar conflito
        const hasConflict = await repository.checkConflict(
            ownerUserId,
            data.start_at,
            data.end_at
        );

        if (hasConflict) {
            throw new Error('Horário já está ocupado');
        }

        // Criar ou buscar lead
        let lead = await repository.findLeadByEmail(ownerUserId, data.email);
        if (!lead) {
            const leadValidation = validators.validateLead({
                owner_user_id: ownerUserId,
                full_name: data.full_name,
                email: data.email,
                whatsapp: data.whatsapp || null
            });
            if (!leadValidation.isValid) {
                throw new Error(leadValidation.errors.join(', '));
            }

            // Criptografar CPF se fornecido
            let cpfEncrypted = null;
            if (data.cpf) {
                const encryptionKey = process.env.ENCRYPTION_KEY_FOR_CPF || process.env.JWT_SECRET;
                cpfEncrypted = encrypt(data.cpf, encryptionKey);
            }

            lead = await repository.createLead({
                owner_user_id: ownerUserId,
                full_name: data.full_name,
                email: data.email,
                whatsapp: data.whatsapp || null,
                cpf_encrypted: cpfEncrypted
            });
        }

        // Criar agendamento PENDING
        const appointment = await repository.createAppointment({
            owner_user_id: ownerUserId,
            lead_id: lead.id,
            start_at: data.start_at,
            end_at: data.end_at,
            status: 'PENDING',
            event_type: data.event_type || TYPES.DEFAULT_EVENT_TYPE,
            location_address: data.location_address || null,
            location_maps_url: data.location_maps_url || null,
            notes: data.notes || null,
            form_data: data.form_data || null,
            lgpd_consent_at: data.lgpd_consent ? new Date() : null,
            lgpd_consent_ip: data.lgpd_consent_ip || null,
            lgpd_consent_user_agent: data.lgpd_consent_user_agent || null,
            lgpd_consent_version: '1.0',
            auto_confirm: data.auto_confirm || false
        });

        logger.info(`Slot reservado: ${appointment.id} para usuário ${ownerUserId}`);
        return {
            appointment,
            reservation_id: appointment.id
        };
    }

    /**
     * Confirmar agendamento (cria eventos no Google Calendar)
     */
    async confirmAppointment(reservationId, clientTokens) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Buscar agendamento
            const appointment = await repository.findAppointmentById(reservationId);
            if (!appointment) {
                throw new Error('Agendamento não encontrado');
            }

            if (appointment.status !== 'PENDING') {
                throw new Error('Agendamento já foi processado');
            }

            // Buscar lead
            const lead = await client.query(
                'SELECT * FROM agenda_leads WHERE id = $1',
                [appointment.lead_id]
            );
            if (lead.rows.length === 0) {
                throw new Error('Lead não encontrado');
            }
            const leadData = lead.rows[0];

            // Buscar configurações
            const settings = await repository.findOrCreateSettings(appointment.owner_user_id);

            // Buscar tokens OAuth do dono
            const ownerOAuth = await client.query(
                `SELECT * FROM oauth_accounts 
                 WHERE user_id = $1 AND provider = 'google' 
                 ORDER BY created_at DESC LIMIT 1`,
                [appointment.owner_user_id]
            );

            if (ownerOAuth.rows.length === 0) {
                throw new Error('Google Calendar do dono não está conectado');
            }

            const ownerTokens = googleOAuthService.decryptTokens(ownerOAuth.rows[0]);
            const ownerCalendar = await googleCalendarService.createCalendarClient(ownerTokens);

            // Verificar disponibilidade do dono
            const ownerFree = await googleCalendarService.checkFreeBusy(
                ownerCalendar,
                appointment.start_at,
                appointment.end_at,
                settings.google_calendar_id
            );

            if (!ownerFree) {
                throw new Error('Horário não está mais disponível no calendário do dono');
            }

            // Verificar disponibilidade do cliente (se tokens fornecidos)
            let clientFree = true;
            if (clientTokens) {
                try {
                    const clientCalendar = await googleCalendarService.createCalendarClient(clientTokens);
                    clientFree = await googleCalendarService.checkFreeBusy(
                        clientCalendar,
                        appointment.start_at,
                        appointment.end_at,
                        'primary'
                    );
                } catch (error) {
                    logger.warn('Erro ao verificar disponibilidade do cliente:', error);
                    // Continuar mesmo se falhar
                }
            }

            if (!clientFree) {
                throw new Error('Horário não está disponível no seu calendário');
            }

            // Determinar se deve criar Google Meet (apenas para reuniões, não para trabalho)
            const shouldCreateMeet = appointment.event_type === 'REUNIAO';
            
            // Criar evento no calendário do dono
            const ownerEventDescription = await this.buildEventDescription(leadData, appointment, 'owner', client);
            const eventTitle = appointment.event_type === 'TRABALHO' 
                ? `Trabalho: ${leadData.full_name}` 
                : `Reunião com ${leadData.full_name}`;
            
            const ownerEventData = {
                summary: eventTitle,
                description: ownerEventDescription,
                startDateTime: appointment.start_at,
                endDateTime: appointment.end_at,
                timeZone: settings.timezone,
                location: appointment.location_address || null,
                locationMapsUrl: appointment.location_maps_url || null
            };

            const ownerEvent = await googleCalendarService.createEvent(
                ownerCalendar,
                ownerEventData,
                settings.google_calendar_id,
                shouldCreateMeet // criar Meet apenas para reuniões
            );

            // Criar evento no calendário do cliente
            let clientEvent = null;
            if (clientTokens) {
                try {
                    const clientCalendar = await googleCalendarService.createCalendarClient(clientTokens);
                    const ownerResult = await client.query('SELECT name FROM users WHERE id = $1', [appointment.owner_user_id]);
                    const ownerName = ownerResult.rows[0]?.name || 'Profissional';
                    const clientEventDescription = await this.buildEventDescription(leadData, appointment, 'client', client);
                    const clientEventTitle = appointment.event_type === 'TRABALHO' 
                        ? `Trabalho: ${ownerName}` 
                        : `Reunião com ${ownerName}`;
                    
                    const clientEventData = {
                        summary: clientEventTitle,
                        description: clientEventDescription,
                        startDateTime: appointment.start_at,
                        endDateTime: appointment.end_at,
                        timeZone: appointment.client_timezone || settings.timezone,
                        location: appointment.location_address || null,
                        locationMapsUrl: appointment.location_maps_url || null
                    };

                    clientEvent = await googleCalendarService.createEvent(
                        clientCalendar,
                        clientEventData,
                        'primary',
                        false // não criar Meet (já tem do dono)
                    );
                } catch (error) {
                    logger.error('Erro ao criar evento no calendário do cliente:', error);
                    // Tentar cancelar evento do dono
                    try {
                        await googleCalendarService.deleteEvent(
                            ownerCalendar,
                            settings.google_calendar_id,
                            ownerEvent.eventId
                        );
                    } catch (rollbackError) {
                        logger.error('Erro ao fazer rollback:', rollbackError);
                    }
                    throw new Error('Falha ao criar evento no calendário do cliente');
                }
            }

            // Atualizar agendamento
            const updatedAppointment = await repository.updateAppointment(
                reservationId,
                appointment.owner_user_id,
                {
                    status: 'CONFIRMED',
                    meet_link: ownerEvent.meetLink,
                    owner_google_event_id: ownerEvent.eventId,
                    client_google_event_id: clientEvent?.eventId || null
                }
            );

            await client.query('COMMIT');

            logger.info(`Agendamento confirmado: ${reservationId}`);
            return {
                appointment: updatedAppointment,
                meetLink: ownerEvent.meetLink,
                ownerEventId: ownerEvent.eventId,
                clientEventId: clientEvent?.eventId || null
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Construir descrição do evento
     */
    async buildEventDescription(lead, appointment, type = 'owner', client = null) {
        const formData = appointment.form_data || {};
        let description = '';

        if (type === 'owner') {
            description += `Cliente: ${lead.full_name}\n`;
            description += `Email: ${lead.email}\n`;
            if (lead.whatsapp) {
                description += `WhatsApp: ${lead.whatsapp}\n`;
            }
            if (formData.cpf) {
                description += `CPF: ${maskCPF(formData.cpf)}\n`;
            }
        } else {
            // Buscar nome do dono usando client da transação se disponível
            let ownerName = 'Profissional';
            if (client) {
                const ownerResult = await client.query('SELECT name FROM users WHERE id = $1', [appointment.owner_user_id]);
                ownerName = ownerResult.rows[0]?.name || 'Profissional';
            } else {
                const ownerResult = await db.pool.query('SELECT name FROM users WHERE id = $1', [appointment.owner_user_id]);
                ownerName = ownerResult.rows[0]?.name || 'Profissional';
            }
            description += `Profissional: ${ownerName}\n`;
        }

        // Adicionar tipo de evento
        if (appointment.event_type) {
            description += `Tipo: ${appointment.event_type === 'REUNIAO' ? 'Reunião' : 'Trabalho'}\n`;
        }

        // Adicionar localização se for presencial
        if (appointment.location_address) {
            description += `\n📍 Local: ${appointment.location_address}\n`;
            if (appointment.location_maps_url) {
                description += `🗺️ Mapa: ${appointment.location_maps_url}\n`;
            }
        }

        if (formData.company) {
            description += `Empresa: ${formData.company}\n`;
        }
        if (formData.reason) {
            description += `Motivo: ${formData.reason}\n`;
        }
        if (appointment.notes) {
            description += `Observações: ${appointment.notes}\n`;
        }

        description += `\nAgendado via ConectaKing`;

        return description;
    }

    /**
     * Cancelar agendamento
     */
    async cancelAppointment(appointmentId, ownerUserId) {
        const appointment = await repository.findAppointmentById(appointmentId, ownerUserId);
        if (!appointment) {
            throw new Error('Agendamento não encontrado');
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Buscar configurações
            const settings = await repository.findOrCreateSettings(ownerUserId);

            // Cancelar eventos no Google Calendar se existirem
            if (appointment.owner_google_event_id) {
                try {
                    const ownerOAuth = await client.query(
                        `SELECT * FROM oauth_accounts 
                         WHERE user_id = $1 AND provider = 'google' 
                         ORDER BY created_at DESC LIMIT 1`,
                        [ownerUserId]
                    );

                    if (ownerOAuth.rows.length > 0) {
                        const ownerTokens = googleOAuthService.decryptTokens(ownerOAuth.rows[0]);
                        const ownerCalendar = await googleCalendarService.createCalendarClient(ownerTokens);
                        await googleCalendarService.deleteEvent(
                            ownerCalendar,
                            settings.google_calendar_id,
                            appointment.owner_google_event_id
                        );
                    }
                } catch (error) {
                    logger.warn('Erro ao cancelar evento do dono:', error);
                }
            }

            if (appointment.client_google_event_id) {
                // Tentar cancelar evento do cliente (se tiver tokens)
                // Por enquanto, apenas marcar como cancelado
            }

            // Atualizar status
            await repository.updateAppointment(appointmentId, ownerUserId, {
                status: 'CANCELLED'
            });

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar agendamentos do usuário
     */
    async findAppointmentsByOwnerId(ownerUserId, filters = {}) {
        return await repository.findAppointmentsByOwnerId(ownerUserId, filters);
    }

    /**
     * Verificar status da conexão do Google Calendar
     */
    async getGoogleCalendarStatus(ownerUserId) {
        const client = await db.pool.connect();
        try {
            const oauthResult = await client.query(
                `SELECT email, created_at, updated_at 
                 FROM oauth_accounts 
                 WHERE user_id = $1 AND provider = 'google' 
                 ORDER BY created_at DESC LIMIT 1`,
                [ownerUserId]
            );

            const isConnected = oauthResult.rows.length > 0;
            const email = isConnected ? oauthResult.rows[0].email : null;
            const connectedAt = isConnected ? oauthResult.rows[0].created_at : null;

            return {
                isConnected,
                email,
                connectedAt
            };
        } finally {
            client.release();
        }
    }

    /**
     * Obter dashboard resumido da agenda
     */
    async getDashboard(ownerUserId) {
        const client = await db.pool.connect();
        try {
            // Buscar configurações
            const settings = await repository.findOrCreateSettings(ownerUserId);

            // Verificar status do Google Calendar
            const googleStatus = await this.getGoogleCalendarStatus(ownerUserId);

            // Contar próximos agendamentos (próximos 7 dias)
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const upcomingAppointments = await repository.findAppointmentsByOwnerId(ownerUserId, {
                status: 'CONFIRMED',
                dateFrom: new Date().toISOString(),
                dateTo: nextWeek.toISOString()
            });

            // Contar slots ativos
            const slots = await repository.findSlotsByOwnerId(ownerUserId, true);
            const activeSlots = slots.filter(s => s.is_active === true);

            return {
                settings: {
                    is_active_in_card: settings.is_active_in_card || false,
                    card_button_text: settings.card_button_text || 'Agendar Reunião',
                    card_button_icon: settings.card_button_icon || 'fa-calendar'
                },
                googleCalendar: {
                    isConnected: googleStatus.isConnected,
                    email: googleStatus.email,
                    connectedAt: googleStatus.connectedAt
                },
                stats: {
                    upcomingCount: upcomingAppointments.length,
                    activeSlotsCount: activeSlots.length
                }
            };
        } finally {
            client.release();
        }
    }
}

module.exports = new AgendaService();
