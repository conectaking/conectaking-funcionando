const db = require('../../db');
const logger = require('../../utils/logger');

class ContractRepository {
    /**
     * Criar novo contrato
     * @param {Object} data - Dados do contrato
     * @param {Object} existingClient - Cliente de banco existente (opcional, para usar em transações)
     */
    async create(data, existingClient = null) {
        const {
            user_id,
            template_id,
            title,
            status = 'draft',
            contract_type = 'template',
            pdf_url,
            pdf_content,
            variables = {},
            original_pdf_hash,
            final_pdf_url,
            final_pdf_hash,
            expires_at,
            completed_at
        } = data;

        const client = existingClient || await db.pool.connect();
        const shouldRelease = !existingClient;
        
        try {
            const result = await client.query(
                `INSERT INTO ck_contracts (
                    user_id, template_id, title, status, contract_type,
                    pdf_url, pdf_content, variables, original_pdf_hash,
                    final_pdf_url, final_pdf_hash, expires_at, completed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *`,
                [
                    user_id, template_id, title, status, contract_type,
                    pdf_url, pdf_content, JSON.stringify(variables), original_pdf_hash,
                    final_pdf_url, final_pdf_hash, expires_at, completed_at
                ]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Erro ao criar contrato:', error);
            throw error;
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Buscar contrato por ID
     */
    async findById(id) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM ck_contracts WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar contratos do usuário (com filtros e busca)
     */
    async findByUserId(userId, filters = {}) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT DISTINCT c.* FROM ck_contracts c';
            const params = [userId];
            let paramCount = 2;

            // Buscar signatários para busca por nome
            if (filters.search) {
                query += ` LEFT JOIN ck_contracts_signers cs ON c.id = cs.contract_id`;
            }

            query += ' WHERE c.user_id = $1';

            // Busca por título, conteúdo ou signatário
            if (filters.search) {
                query += ` AND (c.title ILIKE $${paramCount} OR c.pdf_content ILIKE $${paramCount} OR cs.name ILIKE $${paramCount} OR cs.email ILIKE $${paramCount})`;
                params.push(`%${filters.search}%`);
                paramCount++;
            }

            // Filtro por status único
            if (filters.status) {
                query += ` AND c.status = $${paramCount}`;
                params.push(filters.status);
                paramCount++;
            }

            // Filtro por múltiplos status
            if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
                query += ` AND c.status = ANY($${paramCount})`;
                params.push(filters.statuses);
                paramCount++;
            }

            // Filtro por data de criação - De
            if (filters.dateFrom) {
                query += ` AND c.created_at >= $${paramCount}::date`;
                params.push(filters.dateFrom);
                paramCount++;
            }

            // Filtro por data de criação - Até
            if (filters.dateTo) {
                query += ` AND c.created_at <= $${paramCount}::date`;
                params.push(filters.dateTo);
                paramCount++;
            }

            // Ordenação
            const orderBy = filters.orderBy || 'created_at';
            const orderDir = filters.orderDir || 'DESC';
            
            // Validar orderBy para prevenir SQL injection
            const allowedOrderBy = ['created_at', 'title', 'status', 'completed_at', 'updated_at'];
            const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'created_at';
            const safeOrderDir = orderDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            
            query += ` ORDER BY c.${safeOrderBy} ${safeOrderDir}`;

            // Contar total de resultados (antes da paginação)
            // Criar query de contagem sem ORDER BY, LIMIT e OFFSET
            let countQuery = query.replace(/SELECT DISTINCT c\.\*/i, 'SELECT COUNT(DISTINCT c.id) as total');
            countQuery = countQuery.replace(/\s+ORDER BY.*$/i, '');
            
            // Usar os mesmos parâmetros, mas sem os últimos 2 (limit e offset que serão adicionados depois)
            // Por enquanto, usar todos os parâmetros (limit e offset ainda não foram adicionados)
            const countParams = params.slice(0, params.length);
            const countResult = await client.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0]?.total || 0);

            // Paginação
            const limit = filters.limit || 20; // Padrão: 20 por página
            const offset = filters.offset || 0;
            
            query += ` LIMIT $${paramCount}`;
            params.push(limit);
            paramCount++;
            
            query += ` OFFSET $${paramCount}`;
            params.push(offset);
            paramCount++;

            const result = await client.query(query, params);
            return {
                data: result.rows,
                pagination: {
                    total,
                    limit,
                    offset,
                    page: Math.floor(offset / limit) + 1,
                    totalPages: Math.ceil(total / limit),
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        } finally {
            client.release();
        }
    }

    /**
     * Verificar ownership (se o contrato pertence ao usuário)
     */
    async checkOwnership(contractId, userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT id FROM ck_contracts WHERE id = $1 AND user_id = $2',
                [contractId, userId]
            );
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar contrato
     * @param {Object} existingClient - Cliente de banco existente (opcional, para usar em transações)
     */
    async update(id, data, existingClient = null) {
        const client = existingClient || await db.pool.connect();
        const shouldRelease = !existingClient;
        
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(data).forEach(key => {
                if (data[key] !== undefined) {
                    if (key === 'variables') {
                        // Converter objeto para JSON string
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
                return await this.findById(id);
            }

            values.push(id);
            const result = await client.query(
                `UPDATE ck_contracts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
                values
            );
            return result.rows[0] || null;
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Deletar contrato (CASCADE remove signers, signatures, audit_logs)
     */
    async delete(id) {
        const client = await db.pool.connect();
        try {
            await client.query('DELETE FROM ck_contracts WHERE id = $1', [id]);
            return true;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar templates (todos ou por categoria)
     */
    async findTemplates(category = null) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM ck_contracts_templates';
            const params = [];
            
            if (category) {
                query += ' WHERE category = $1';
                params.push(category);
            }
            
            query += ' ORDER BY category, title';
            
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar template por ID
     */
    async findTemplateById(id) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM ck_contracts_templates WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar signatários do contrato
     */
    async findSignersByContractId(contractId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM ck_contracts_signers WHERE contract_id = $1 ORDER BY sign_order, created_at',
                [contractId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar signatário por token
     */
    async findSignerByToken(token) {
        const client = await db.pool.connect();
        try {
            // Buscar token exato (suporta tokens antigos com hífens e novos sem hífens)
            const result = await client.query(
                'SELECT * FROM ck_contracts_signers WHERE sign_token = $1',
                [token]
            );
            
            // Se não encontrou e o token tem hífen, pode ser que o Express cortou
            // Tentar buscar tokens que começam com o token recebido (para tokens antigos longos)
            if (!result.rows[0] && token.length < 50) {
                const partialResult = await client.query(
                    'SELECT * FROM ck_contracts_signers WHERE sign_token LIKE $1 LIMIT 1',
                    [`${token}%`]
                );
                if (partialResult.rows[0]) {
                    logger.warn('Token parcial encontrado - pode indicar problema de roteamento', { 
                        receivedToken: token, 
                        foundToken: partialResult.rows[0].sign_token 
                    });
                    return partialResult.rows[0];
                }
            }
            
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar signatário por ID
     */
    async findSignerById(id) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM ck_contracts_signers WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Criar signatário
     */
    async createSigner(data, existingClient = null) {
        const {
            contract_id,
            name,
            email,
            role = 'signer',
            sign_order = 0,
            sign_token,
            token_expires_at,
            ip_address,
            user_agent
        } = data;

        const client = existingClient || await db.pool.connect();
        const shouldRelease = !existingClient;
        
        try {
            const result = await client.query(
                `INSERT INTO ck_contracts_signers (
                    contract_id, name, email, role, sign_order,
                    sign_token, token_expires_at, ip_address, user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    contract_id, name, email, role, sign_order,
                    sign_token, token_expires_at, ip_address, user_agent
                ]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Erro ao criar signatário:', error);
            throw error;
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Atualizar signatário (marcar como assinado)
     * @param {Object} existingClient - Cliente de banco existente (opcional, para usar em transações)
     */
    async updateSigner(signerId, data, existingClient = null) {
        const client = existingClient || await db.pool.connect();
        const shouldRelease = !existingClient;
        
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(data).forEach(key => {
                if (data[key] !== undefined) {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(data[key]);
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                return null;
            }

            values.push(signerId);
            const result = await client.query(
                `UPDATE ck_contracts_signers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                values
            );
            return result.rows[0] || null;
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Criar assinatura
     */
    async createSignature(data, existingClient = null) {
        const {
            signer_id,
            contract_id,
            signature_type,
            signature_data,
            signature_image_url,
            signature_page,
            signature_x,
            signature_y,
            signature_width,
            signature_height,
            ip_address,
            user_agent
        } = data;

        const client = existingClient || await db.pool.connect();
        const shouldRelease = !existingClient;
        
        try {
            const result = await client.query(
                `INSERT INTO ck_contracts_signatures (
                    signer_id, contract_id, signature_type, signature_data,
                    signature_image_url, signature_page, signature_x, signature_y,
                    signature_width, signature_height, ip_address, user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *`,
                [
                    signer_id, contract_id, signature_type, signature_data,
                    signature_image_url, signature_page || 1, signature_x || null, signature_y || null,
                    signature_width || 200, signature_height || 80, ip_address, user_agent
                ]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Erro ao criar assinatura:', error);
            throw error;
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Buscar assinaturas do contrato
     */
    async findSignaturesByContractId(contractId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT s.*, signer.name as signer_name, signer.email as signer_email
                 FROM ck_contracts_signatures s
                 JOIN ck_contracts_signers signer ON s.signer_id = signer.id
                 WHERE s.contract_id = $1
                 ORDER BY s.signed_at`,
                [contractId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Criar log de auditoria
     */
    async createAuditLog(data, existingClient = null) {
        const {
            contract_id,
            user_id,
            action,
            details = {},
            ip_address,
            user_agent
        } = data;

        const client = existingClient || await db.pool.connect();
        const shouldRelease = !existingClient;
        
        try {
            const result = await client.query(
                `INSERT INTO ck_contracts_audit_logs (
                    contract_id, user_id, action, details, ip_address, user_agent
                ) VALUES ($1, $2, $3, $4::jsonb, $5, $6)
                RETURNING *`,
                [
                    contract_id, user_id, action, JSON.stringify(details), ip_address, user_agent
                ]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Erro ao criar log de auditoria:', error);
            throw error;
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Buscar logs de auditoria do contrato
     */
    async findAuditLogsByContractId(contractId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT a.*, u.name as user_name, u.email as user_email
                 FROM ck_contracts_audit_logs a
                 LEFT JOIN users u ON a.user_id = u.id
                 WHERE a.contract_id = $1
                 ORDER BY a.created_at DESC`,
                [contractId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Estatísticas de contratos do usuário
     */
    async getStats(userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'draft') as drafts,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
                 FROM ck_contracts
                 WHERE user_id = $1`,
                [userId]
            );
            return result.rows[0] || { total: 0, drafts: 0, sent: 0, completed: 0, cancelled: 0 };
        } finally {
            client.release();
        }
    }
}

module.exports = new ContractRepository();
