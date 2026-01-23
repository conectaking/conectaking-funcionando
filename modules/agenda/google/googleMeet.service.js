/**
 * Serviço Google Meet (isolado para módulo Agenda)
 * Cria links do Google Meet automaticamente
 */

const { google } = require('googleapis');
const logger = require('../../../utils/logger');

class GoogleMeetService {
    /**
     * Criar solicitação de conferência (Google Meet)
     */
    createConferenceRequest() {
        return {
            createRequest: {
                requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                conferenceSolutionKey: {
                    type: 'hangoutsMeet'
                }
            }
        };
    }

    /**
     * Extrair link do Meet do evento criado
     */
    extractMeetLink(event) {
        if (event.conferenceData) {
            const entryPoint = event.conferenceData.entryPoints?.find(
                ep => ep.entryPointType === 'video'
            );
            if (entryPoint) {
                return entryPoint.uri;
            }
        }

        // Fallback: hangoutLink (legado)
        if (event.hangoutLink) {
            return event.hangoutLink;
        }

        return null;
    }

    /**
     * Buscar link do Meet após criar evento (se não veio na resposta)
     */
    async getMeetLinkFromEvent(calendar, calendarId, eventId) {
        try {
            const response = await calendar.events.get({
                calendarId: calendarId,
                eventId: eventId,
                conferenceDataVersion: 1
            });

            return this.extractMeetLink(response.data);
        } catch (error) {
            logger.error('Erro ao buscar link do Meet:', error);
            return null;
        }
    }
}

module.exports = new GoogleMeetService();
