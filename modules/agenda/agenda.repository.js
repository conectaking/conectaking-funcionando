const db = require('../../db');
const logger = require('../../utils/logger');

class AgendaRepository {
    /**
     * Buscar ou criar configurações do usuário
     */
    async findOrCreateSettings(ownerUserId) {
        const client = await db.pool.connect();
        try {
            // Tentar buscar existente
            let result = await client.query(
                'SELECT * FROM agenda_settings WHERE owner_user_id = $1',
                [ownerUserId]
            );

            if (result.rows.length > 0) {
                return result.rows[0];
            }

            // Criar novo
            result = await client.query(
                `INSERT INTO agenda_settings (owner_user_id) 
                 VALUES ($1) 
                 RETURNING *`,
                [ownerUserId]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar configurações
     */
    async updateSettings(ownerUserId, data) {
        const client = await db.pool.connect();
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && key !== 'owner_user_id' && key !== 'id') {
                    if (key === 'form_fields') {
                        fields.push(`${key} = $${paramCount}::jsonb`);
                        values.push(JSON.stringify(data[key]));
                    } else {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(data[key]);
                    }
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                return await this.findOrCreateSettings(ownerUserId);
            }

            fields.push(`updated_at = NOW()`);
            values.push(ownerUserId);

            const result = await client.query(
                `UPDATE agenda_settings 
                 SET ${fields.join(', ')} 
                 WHERE owner_user_id = $${paramCount}
                 RETURNING *`,
                values
            );

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Criar slot
     */
    async createSlot(data) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO agenda_slots (owner_user_id, type, day_of_week, start_time, end_time, date)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    data.owner_user_id,
                    data.type,
                    data.day_of_week || null,
                    data.start_time,
                    data.end_time || null,
                    data.date || null
                ]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar slots do usuário
     */
    async findSlotsByOwnerId(ownerUserId, isActive = true) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM agenda_slots WHERE owner_user_id = $1';
            const params = [ownerUserId];

            if (isActive !== null) {
                query += ' AND is_active = $2';
                params.push(isActive);
            }

            query += ' ORDER BY type, day_of_week, start_time';
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Deletar slot
     */
    async deleteSlot(slotId, ownerUserId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'DELETE FROM agenda_slots WHERE id = $1 AND owner_user_id = $2 RETURNING *',
                [slotId, ownerUserId]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Criar data bloqueada
     */
    async createBlockedDate(data) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO agenda_blocked_dates (owner_user_id, date, reason)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (owner_user_id, date) DO UPDATE SET reason = EXCLUDED.reason
                 RETURNING *`,
                [data.owner_user_id, data.date, data.reason || null]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar datas bloqueadas
     */
    async findBlockedDatesByOwnerId(ownerUserId, dateFrom = null, dateTo = null) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM agenda_blocked_dates WHERE owner_user_id = $1';
            const params = [ownerUserId];

            if (dateFrom) {
                query += ' AND date >= $2';
                params.push(dateFrom);
                if (dateTo) {
                    query += ' AND date <= $3';
                    params.push(dateTo);
                }
            } else if (dateTo) {
                query += ' AND date <= $2';
                params.push(dateTo);
            }

            query += ' ORDER BY date ASC';
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Criar lead
     */
    async createLead(data) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO agenda_leads (owner_user_id, full_name, email, whatsapp, cpf_encrypted, google_email)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    data.owner_user_id,
                    data.full_name,
                    data.email,
                    data.whatsapp || null,
                    data.cpf_encrypted || null,
                    data.google_email || null
                ]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar lead por email
     */
    async findLeadByEmail(ownerUserId, email) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM agenda_leads WHERE owner_user_id = $1 AND email = $2 ORDER BY created_at DESC LIMIT 1',
                [ownerUserId, email]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Criar agendamento
     */
    async createAppointment(data, existingClient = null) {
        const client = existingClient || await db.pool.connect();
        const shouldRelease = !existingClient;

        try {
            const result = await client.query(
                `INSERT INTO agenda_appointments (
                    owner_user_id, lead_id, start_at, end_at, status,
                    meet_link, owner_google_event_id, client_google_event_id,
                    client_timezone, notes, form_data,
                    lgpd_consent_at, lgpd_consent_ip, lgpd_consent_user_agent, lgpd_consent_version,
                    event_type, location_address, location_maps_url, auto_confirm
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING *`,
                [
                    data.owner_user_id,
                    data.lead_id,
                    data.start_at,
                    data.end_at,
                    data.status || 'PENDING',
                    data.meet_link || null,
                    data.owner_google_event_id || null,
                    data.client_google_event_id || null,
                    data.client_timezone || null,
                    data.notes || null,
                    data.form_data ? JSON.stringify(data.form_data) : null,
                    data.lgpd_consent_at || null,
                    data.lgpd_consent_ip || null,
                    data.lgpd_consent_user_agent || null,
                    data.lgpd_consent_version || null,
                    data.event_type || 'REUNIAO',
                    data.location_address || null,
                    data.location_maps_url || null,
                    data.auto_confirm || false
                ]
            );
            return result.rows[0];
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Buscar agendamento por ID
     */
    async findAppointmentById(id, ownerUserId = null) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM agenda_appointments WHERE id = $1';
            const params = [id];

            if (ownerUserId) {
                query += ' AND owner_user_id = $2';
                params.push(ownerUserId);
            }

            const result = await client.query(query, params);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar agendamentos do usuário
     */
    async findAppointmentsByOwnerId(ownerUserId, filters = {}) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT a.*, l.full_name, l.email, l.whatsapp FROM agenda_appointments a JOIN agenda_leads l ON a.lead_id = l.id WHERE a.owner_user_id = $1';
            const params = [ownerUserId];
            let paramCount = 2;

            if (filters.status) {
                query += ` AND a.status = $${paramCount}`;
                params.push(filters.status);
                paramCount++;
            }

            if (filters.dateFrom) {
                query += ` AND a.start_at >= $${paramCount}::timestamp`;
                params.push(filters.dateFrom);
                paramCount++;
            }

            if (filters.dateTo) {
                query += ` AND a.start_at <= $${paramCount}::timestamp`;
                params.push(filters.dateTo);
                paramCount++;
            }

            query += ' ORDER BY a.start_at DESC';

            if (filters.limit) {
                query += ` LIMIT $${paramCount}`;
                params.push(filters.limit);
            }

            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Verificar conflitos de agendamento
     */
    async checkConflict(ownerUserId, startAt, endAt, excludeAppointmentId = null) {
        const client = await db.pool.connect();
        try {
            let query = `
                SELECT * FROM agenda_appointments 
                WHERE owner_user_id = $1 
                AND status IN ('PENDING', 'CONFIRMED')
                AND (
                    (start_at <= $2 AND end_at > $2) OR
                    (start_at < $3 AND end_at >= $3) OR
                    (start_at >= $2 AND end_at <= $3)
                )
            `;
            const params = [ownerUserId, startAt, endAt];

            if (excludeAppointmentId) {
                query += ' AND id != $4';
                params.push(excludeAppointmentId);
            }

            const result = await client.query(query, params);
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar agendamento
     */
    async updateAppointment(id, ownerUserId, data) {
        const client = await db.pool.connect();
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && key !== 'id' && key !== 'owner_user_id') {
                    if (key === 'form_data') {
                        fields.push(`${key} = $${paramCount}::jsonb`);
                        values.push(JSON.stringify(data[key]));
                    } else {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(data[key]);
                    }
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                return await this.findAppointmentById(id, ownerUserId);
            }

            fields.push(`updated_at = NOW()`);
            values.push(id, ownerUserId);

            const result = await client.query(
                `UPDATE agenda_appointments 
                 SET ${fields.join(', ')} 
                 WHERE id = $${paramCount} AND owner_user_id = $${paramCount + 1}
                 RETURNING *`,
                values
            );

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Expirar agendamentos pendentes antigos
     */
    async expirePendingAppointments() {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `UPDATE agenda_appointments 
                 SET status = 'EXPIRED', updated_at = NOW()
                 WHERE status = 'PENDING' 
                 AND created_at < NOW() - INTERVAL '5 minutes'
                 RETURNING *`
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar slots disponíveis para uma data
     */
    async findAvailableSlots(ownerUserId, date) {
        const client = await db.pool.connect();
        try {
            const dateObj = new Date(date);
            const dayOfWeek = dateObj.getDay(); // 0 = domingo, 6 = sábado

            // Buscar slots recorrentes para este dia da semana
            const recurringSlots = await client.query(
                `SELECT * FROM agenda_slots 
                 WHERE owner_user_id = $1 
                 AND type = 'RECURRING' 
                 AND day_of_week = $2 
                 AND is_active = true
                 ORDER BY start_time`,
                [ownerUserId, dayOfWeek]
            );

            // Buscar slots avulsos para esta data específica
            const oneOffSlots = await client.query(
                `SELECT * FROM agenda_slots 
                 WHERE owner_user_id = $1 
                 AND type = 'ONE_OFF' 
                 AND date = $2 
                 AND is_active = true
                 ORDER BY start_time`,
                [ownerUserId, date]
            );

            // Combinar e retornar
            return [...recurringSlots.rows, ...oneOffSlots.rows];
        } finally {
            client.release();
        }
    }
}

module.exports = new AgendaRepository();
