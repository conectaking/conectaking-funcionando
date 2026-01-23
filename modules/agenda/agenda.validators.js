/**
 * Validadores específicos para módulo Agenda
 * Validação robusta no backend para segurança
 */

const TYPES = require('./agenda.types');

class AgendaValidators {
    /**
     * Validar dados de configuração
     */
    validateSettings(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.owner_user_id) {
            errors.push('owner_user_id é obrigatório');
        }

        if (data.meeting_duration_minutes !== undefined) {
            if (typeof data.meeting_duration_minutes !== 'number' || data.meeting_duration_minutes < 15 || data.meeting_duration_minutes > 480) {
                errors.push('meeting_duration_minutes deve ser entre 15 e 480 minutos');
            }
        }

        if (data.buffer_minutes !== undefined) {
            if (typeof data.buffer_minutes !== 'number' || data.buffer_minutes < 0 || data.buffer_minutes > 60) {
                errors.push('buffer_minutes deve ser entre 0 e 60 minutos');
            }
        }

        if (data.scheduling_window_days !== undefined) {
            if (typeof data.scheduling_window_days !== 'number' || data.scheduling_window_days < 1 || data.scheduling_window_days > 365) {
                errors.push('scheduling_window_days deve ser entre 1 e 365 dias');
            }
        }

        if (data.meeting_type_default !== undefined) {
            if (!Object.values(TYPES.MEETING_TYPE).includes(data.meeting_type_default)) {
                errors.push('meeting_type_default deve ser ONLINE, PRESENCIAL ou HIBRIDO');
            }
        }

        if (data.card_button_text !== undefined) {
            if (typeof data.card_button_text !== 'string' || data.card_button_text.length > 100) {
                errors.push('card_button_text deve ser uma string com no máximo 100 caracteres');
            }
        }

        if (data.card_button_icon !== undefined) {
            if (typeof data.card_button_icon !== 'string' || data.card_button_icon.length > 50) {
                errors.push('card_button_icon deve ser uma string com no máximo 50 caracteres');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de slot
     */
    validateSlot(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.owner_user_id) {
                errors.push('owner_user_id é obrigatório');
            }
            if (!data.type || !Object.values(TYPES.SLOT_TYPE).includes(data.type)) {
                errors.push('type deve ser RECURRING ou ONE_OFF');
            }
            if (!data.start_time) {
                errors.push('start_time é obrigatório');
            }
        }

        if (data.type === 'RECURRING') {
            if (data.day_of_week === undefined || typeof data.day_of_week !== 'number' || data.day_of_week < 0 || data.day_of_week > 6) {
                errors.push('day_of_week deve ser um número entre 0 (domingo) e 6 (sábado) para slots recorrentes');
            }
        }

        if (data.type === 'ONE_OFF') {
            if (!data.date) {
                errors.push('date é obrigatório para slots avulsos');
            }
            const date = new Date(data.date);
            if (isNaN(date.getTime())) {
                errors.push('date deve ser uma data válida');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de agendamento
     */
    validateAppointment(data) {
        const errors = [];

        if (!data.owner_user_id) {
            errors.push('owner_user_id é obrigatório');
        }
        if (!data.lead_id) {
            errors.push('lead_id é obrigatório');
        }
        if (!data.start_at) {
            errors.push('start_at é obrigatório');
        }
        if (!data.end_at) {
            errors.push('end_at é obrigatório');
        }

        if (data.start_at && data.end_at) {
            const start = new Date(data.start_at);
            const end = new Date(data.end_at);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                errors.push('start_at e end_at devem ser datas válidas');
            } else if (end <= start) {
                errors.push('end_at deve ser posterior a start_at');
            }
        }

        if (data.event_type !== undefined) {
            if (!Object.values(TYPES.EVENT_TYPE).includes(data.event_type)) {
                errors.push('event_type deve ser REUNIAO ou TRABALHO');
            }
        }

        if (data.location_maps_url !== undefined && data.location_maps_url !== null) {
            if (typeof data.location_maps_url !== 'string' || data.location_maps_url.length > 500) {
                errors.push('location_maps_url deve ser uma string com no máximo 500 caracteres');
            } else if (data.location_maps_url && !/^https?:\/\/.+/.test(data.location_maps_url)) {
                errors.push('location_maps_url deve ser uma URL válida');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de lead
     */
    validateLead(data) {
        const errors = [];

        if (!data.owner_user_id) {
            errors.push('owner_user_id é obrigatório');
        }
        if (!data.full_name || typeof data.full_name !== 'string' || data.full_name.trim().length < 2) {
            errors.push('full_name deve ter pelo menos 2 caracteres');
        }
        if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('email deve ser um email válido');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = new AgendaValidators();
