/**
 * Serviço Google Calendar (isolado para módulo Agenda)
 * Cria, atualiza e cancela eventos no Google Calendar
 */

const { google } = require('googleapis');
const googleOAuthService = require('./googleOAuth.service');
const googleMeetService = require('./googleMeet.service');
const logger = require('../../../utils/logger');

class GoogleCalendarService {
    /**
     * Criar cliente do Calendar API
     */
    async createCalendarClient(tokens) {
        const oauth2Client = googleOAuthService.createAuthenticatedClient(tokens);
        await googleOAuthService.refreshTokenIfNeeded(oauth2Client);
        return google.calendar({ version: 'v3', auth: oauth2Client });
    }

    /**
     * Verificar disponibilidade (freebusy)
     */
    async checkFreeBusy(calendar, timeMin, timeMax, calendarId = 'primary') {
        try {
            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin: timeMin,
                    timeMax: timeMax,
                    items: [{ id: calendarId }]
                }
            });

            const busy = response.data.calendars[calendarId]?.busy || [];
            return busy.length === 0; // true se estiver livre
        } catch (error) {
            logger.error('Erro ao verificar disponibilidade:', error);
            return false; // Em caso de erro, assumir ocupado por segurança
        }
    }

    /**
     * Criar evento no Google Calendar
     */
    async createEvent(calendar, eventData, calendarId = 'primary', createMeet = true) {
        try {
            const event = {
                summary: eventData.summary || 'Reunião',
                description: eventData.description || '',
                start: {
                    dateTime: eventData.startDateTime,
                    timeZone: eventData.timeZone || 'America/Sao_Paulo'
                },
                end: {
                    dateTime: eventData.endDateTime,
                    timeZone: eventData.timeZone || 'America/Sao_Paulo'
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 10 }
                    ]
                }
            };

            // Adicionar Google Meet se solicitado
            if (createMeet) {
                event.conferenceData = googleMeetService.createConferenceRequest();
            }

            const response = await calendar.events.insert({
                calendarId: calendarId,
                resource: event,
                conferenceDataVersion: createMeet ? 1 : 0,
                sendUpdates: 'none'
            });

            const createdEvent = response.data;
            const meetLink = googleMeetService.extractMeetLink(createdEvent);

            // Se não veio o link, tentar buscar
            if (!meetLink && createMeet) {
                const fetchedLink = await googleMeetService.getMeetLinkFromEvent(
                    calendar,
                    calendarId,
                    createdEvent.id
                );
                if (fetchedLink) {
                    createdEvent.hangoutLink = fetchedLink;
                }
            }

            return {
                eventId: createdEvent.id,
                meetLink: meetLink || createdEvent.hangoutLink || null,
                htmlLink: createdEvent.htmlLink || null
            };
        } catch (error) {
            logger.error('Erro ao criar evento no Google Calendar:', error);
            throw new Error('Falha ao criar evento no Google Calendar: ' + error.message);
        }
    }

    /**
     * Atualizar evento no Google Calendar
     */
    async updateEvent(calendar, calendarId, eventId, eventData) {
        try {
            // Buscar evento existente
            const existingEvent = await calendar.events.get({
                calendarId: calendarId,
                eventId: eventId
            });

            // Atualizar campos
            const updatedEvent = {
                ...existingEvent.data,
                summary: eventData.summary || existingEvent.data.summary,
                description: eventData.description || existingEvent.data.description,
                start: eventData.startDateTime ? {
                    dateTime: eventData.startDateTime,
                    timeZone: eventData.timeZone || 'America/Sao_Paulo'
                } : existingEvent.data.start,
                end: eventData.endDateTime ? {
                    dateTime: eventData.endDateTime,
                    timeZone: eventData.timeZone || 'America/Sao_Paulo'
                } : existingEvent.data.end
            };

            const response = await calendar.events.update({
                calendarId: calendarId,
                eventId: eventId,
                resource: updatedEvent
            });

            return response.data;
        } catch (error) {
            logger.error('Erro ao atualizar evento no Google Calendar:', error);
            throw new Error('Falha ao atualizar evento: ' + error.message);
        }
    }

    /**
     * Cancelar/deletar evento no Google Calendar
     */
    async deleteEvent(calendar, calendarId, eventId) {
        try {
            await calendar.events.delete({
                calendarId: calendarId,
                eventId: eventId,
                sendUpdates: 'all' // Notificar participantes
            });
            return true;
        } catch (error) {
            // Se evento não existe, considerar sucesso
            if (error.code === 404) {
                return true;
            }
            logger.error('Erro ao deletar evento no Google Calendar:', error);
            throw new Error('Falha ao deletar evento: ' + error.message);
        }
    }
}

module.exports = new GoogleCalendarService();
