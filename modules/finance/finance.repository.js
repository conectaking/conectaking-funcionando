const db = require('../../db');
const logger = require('../../utils/logger');

class FinanceRepository {
    /**
     * Criar nova transação
     */
    async createTransaction(data, existingClient = null) {
        const {
            user_id,
            type,
            amount,
            description,
            transaction_date,
            category_id,
            account_id,
            card_id,
            status = 'PENDING',
            installment_group_id,
            installment_number,
            recurrence_type,
            recurrence_end_date,
            attachment_url,
            tags,
            project_name,
            cost_center,
            client_name,
            notes,
            is_recurring = false,
            recurring_times = null
        } = data;

        const client = existingClient || await db.pool.connect();
        const shouldRelease = !existingClient;

        try {
            const result = await client.query(
                `INSERT INTO finance_transactions (
                    user_id, type, amount, description, transaction_date,
                    category_id, account_id, card_id, status,
                    installment_group_id, installment_number,
                    recurrence_type, recurrence_end_date,
                    attachment_url, tags, project_name, cost_center,
                    client_name, notes, is_recurring, recurring_times, profile_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                RETURNING *`,
                [
                    user_id, type, amount, description, transaction_date,
                    category_id, account_id, card_id, status,
                    installment_group_id, installment_number,
                    recurrence_type, recurrence_end_date,
                    attachment_url, tags || [], project_name, cost_center,
                    client_name, notes, is_recurring, recurring_times, data.profile_id || null
                ]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Erro ao criar transação:', error);
            throw error;
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    /**
     * Buscar transação por ID
     */
    async findTransactionById(id, userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM finance_transactions WHERE id = $1 AND user_id = $2',
                [id, userId]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar transações do usuário (com filtros)
     */
    async findTransactionsByUserId(userId, filters = {}) {
        const client = await db.pool.connect();
        try {
            let query = `SELECT t.*, 
                c.name as category_name, 
                c.color as category_color, 
                c.icon as category_icon,
                a.name as account_name
                FROM finance_transactions t
                LEFT JOIN finance_categories c ON t.category_id = c.id
                LEFT JOIN finance_accounts a ON t.account_id = a.id
                WHERE t.user_id = $1`;
            const params = [userId];
            let paramCount = 2;

            // Filtro por perfil (se não especificado, buscar do perfil principal ou todas)
            if (filters.profile_id !== undefined && filters.profile_id !== null) {
                query += ` AND t.profile_id = $${paramCount}`;
                params.push(filters.profile_id);
                paramCount++;
            }

            // Filtro por tipo
            if (filters.type) {
                query += ` AND t.type = $${paramCount}`;
                params.push(filters.type);
                paramCount++;
            }

            // Filtro por status
            if (filters.status) {
                query += ` AND t.status = $${paramCount}`;
                params.push(filters.status);
                paramCount++;
            }

            // Filtro por categoria
            if (filters.category_id) {
                query += ` AND t.category_id = $${paramCount}`;
                params.push(filters.category_id);
                paramCount++;
            }

            // Filtro por conta
            if (filters.account_id) {
                query += ` AND t.account_id = $${paramCount}`;
                params.push(filters.account_id);
                paramCount++;
            }

            // Filtro por cartão
            if (filters.card_id) {
                query += ` AND card_id = $${paramCount}`;
                params.push(filters.card_id);
                paramCount++;
            }

            // Filtro por data (de)
            if (filters.dateFrom) {
                query += ` AND transaction_date >= $${paramCount}::date`;
                params.push(filters.dateFrom);
                paramCount++;
            }

            // Filtro por data (até)
            if (filters.dateTo) {
                query += ` AND transaction_date <= $${paramCount}::date`;
                params.push(filters.dateTo);
                paramCount++;
            }

            // Busca por descrição
            if (filters.search) {
                query += ` AND (description ILIKE $${paramCount} OR client_name ILIKE $${paramCount})`;
                params.push(`%${filters.search}%`);
                params.push(`%${filters.search}%`);
                paramCount += 2;
            }

            // Ordenação
            const orderBy = filters.orderBy || 'transaction_date';
            const orderDir = filters.orderDir || 'DESC';
            const allowedOrderBy = ['transaction_date', 'amount', 'created_at', 'description'];
            const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'transaction_date';
            const safeOrderDir = orderDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            query += ` ORDER BY ${safeOrderBy} ${safeOrderDir}`;

            // Paginação
            const limit = filters.limit || 20;
            const offset = filters.offset || 0;
            query += ` LIMIT $${paramCount}`;
            params.push(limit);
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            params.push(offset);

            const result = await client.query(query, params);
            
            // Contar total
            let countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*) as total');
            countQuery = countQuery.replace(/\s+ORDER BY.*$/i, '');
            countQuery = countQuery.replace(/\s+LIMIT.*$/i, '');
            countQuery = countQuery.replace(/\s+OFFSET.*$/i, '');
            const countParams = params.slice(0, params.length - 2); // Remove limit e offset
            const countResult = await client.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0]?.total || 0);

            return {
                data: result.rows,
                pagination: {
                    total,
                    limit,
                    offset,
                    page: Math.floor(offset / limit) + 1,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar transação
     */
    async updateTransaction(id, userId, data) {
        const client = await db.pool.connect();
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && key !== 'id' && key !== 'user_id') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(data[key]);
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                return await this.findTransactionById(id, userId);
            }

            fields.push(`updated_at = NOW()`);
            values.push(id, userId);

            const result = await client.query(
                `UPDATE finance_transactions 
                 SET ${fields.join(', ')} 
                 WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
                 RETURNING *`,
                values
            );

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Deletar transação
     */
    async deleteTransaction(id, userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'DELETE FROM finance_transactions WHERE id = $1 AND user_id = $2 RETURNING *',
                [id, userId]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Criar categoria
     */
    async createCategory(data) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO finance_categories (user_id, name, type, icon, color)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [data.user_id, data.name, data.type, data.icon || null, data.color || null]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar categorias do usuário
     */
    async findCategoriesByUserId(userId, type = null) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM finance_categories WHERE user_id = $1 AND is_active = true';
            const params = [userId];

            if (type) {
                query += ' AND type = $2';
                params.push(type);
            }

            query += ' ORDER BY name ASC';
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Criar conta
     */
    async createAccount(data) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO finance_accounts (user_id, name, type, initial_balance, current_balance)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [
                    data.user_id,
                    data.name,
                    data.type,
                    data.initial_balance || 0,
                    data.current_balance || data.initial_balance || 0
                ]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar contas do usuário
     */
    async findAccountsByUserId(userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM finance_accounts WHERE user_id = $1 AND is_active = true ORDER BY name ASC',
                [userId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar saldo da conta
     */
    async updateAccountBalance(accountId, userId, newBalance) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `UPDATE finance_accounts 
                 SET current_balance = $1, updated_at = NOW()
                 WHERE id = $2 AND user_id = $3
                 RETURNING *`,
                [newBalance, accountId, userId]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Criar cartão
     */
    async createCard(data) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO finance_cards (user_id, name, brand, limit_amount, closing_day, due_day)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    data.user_id,
                    data.name,
                    data.brand || null,
                    data.limit_amount,
                    data.closing_day || null,
                    data.due_day || null
                ]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar cartões do usuário
     */
    async findCardsByUserId(userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM finance_cards WHERE user_id = $1 AND is_active = true ORDER BY name ASC',
                [userId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Criar orçamento
     */
    async createBudget(data) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO finance_budgets (user_id, category_id, month, year, limit_amount, consider_pending)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (user_id, category_id, month, year) 
                 DO UPDATE SET limit_amount = EXCLUDED.limit_amount, consider_pending = EXCLUDED.consider_pending, updated_at = NOW()
                 RETURNING *`,
                [
                    data.user_id,
                    data.category_id,
                    data.month,
                    data.year,
                    data.limit_amount,
                    data.consider_pending || false
                ]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar orçamentos do usuário
     */
    async findBudgetsByUserId(userId, month = null, year = null) {
        const client = await db.pool.connect();
        try {
            let query = 'SELECT * FROM finance_budgets WHERE user_id = $1';
            const params = [userId];

            if (month && year) {
                query += ' AND month = $2 AND year = $3';
                params.push(month, year);
            }

            query += ' ORDER BY year DESC, month DESC';
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Calcular estatísticas do dashboard
     */
    async getDashboardStats(userId, dateFrom, dateTo, profileId = null) {
        const client = await db.pool.connect();
        try {
            // Construir filtro de perfil (especificar tabela para evitar ambiguidade)
            const profileFilter = profileId ? 'AND t.profile_id = $4' : 'AND (t.profile_id IS NULL OR t.profile_id IN (SELECT id FROM finance_profiles WHERE user_id = $1 AND is_primary = TRUE))';
            const params = profileId ? [userId, dateFrom, dateTo, profileId] : [userId, dateFrom, dateTo];
            
            // Total de receitas pagas
            const incomePaidResult = await client.query(
                `SELECT COALESCE(SUM(t.amount), 0) as total
                 FROM finance_transactions t
                 WHERE t.user_id = $1 AND t.type = 'INCOME' AND t.status = 'PAID'
                 AND t.transaction_date BETWEEN $2::date AND $3::date ${profileFilter}`,
                params
            );

            // Total de receitas pendentes (o que falta receber)
            const incomePendingResult = await client.query(
                `SELECT COALESCE(SUM(t.amount), 0) as total
                 FROM finance_transactions t
                 WHERE t.user_id = $1 AND t.type = 'INCOME' AND t.status = 'PENDING'
                 AND t.transaction_date BETWEEN $2::date AND $3::date ${profileFilter}`,
                params
            );

            // Total de despesas pagas
            const expensePaidResult = await client.query(
                `SELECT COALESCE(SUM(t.amount), 0) as total
                 FROM finance_transactions t
                 WHERE t.user_id = $1 AND t.type = 'EXPENSE' AND t.status = 'PAID'
                 AND t.transaction_date BETWEEN $2::date AND $3::date ${profileFilter}`,
                params
            );

            // Total de despesas pendentes (o que falta pagar)
            const expensePendingResult = await client.query(
                `SELECT COALESCE(SUM(t.amount), 0) as total
                 FROM finance_transactions t
                 WHERE t.user_id = $1 AND t.type = 'EXPENSE' AND t.status = 'PENDING'
                 AND t.transaction_date BETWEEN $2::date AND $3::date ${profileFilter}`,
                params
            );

            // Saldo disponível (soma dos saldos das contas ativas do perfil)
            const accountProfileFilter = profileId ? 'AND a.profile_id = $2' : 'AND (a.profile_id IS NULL OR a.profile_id IN (SELECT id FROM finance_profiles WHERE user_id = $1 AND is_primary = TRUE))';
            const accountParams = profileId ? [userId, profileId] : [userId];
            
            const accountBalanceResult = await client.query(
                `SELECT COALESCE(SUM(a.current_balance), 0) as total
                 FROM finance_accounts a
                 WHERE a.user_id = $1 AND a.is_active = true ${accountProfileFilter}`,
                accountParams
            );
            
            // Verificar se há contas cadastradas
            const accountsCountResult = await client.query(
                `SELECT COUNT(*) as count
                 FROM finance_accounts a
                 WHERE a.user_id = $1 AND a.is_active = true ${accountProfileFilter}`,
                accountParams
            );
            const hasAccounts = parseInt(accountsCountResult.rows[0]?.count || 0) > 0;

            // Top 5 categorias de gasto
            const topCategoriesResult = await client.query(
                `SELECT c.name, c.color, SUM(t.amount) as total
                 FROM finance_transactions t
                 JOIN finance_categories c ON t.category_id = c.id
                 WHERE t.user_id = $1 AND t.type = 'EXPENSE' AND t.status = 'PAID'
                 AND t.transaction_date BETWEEN $2::date AND $3::date ${profileFilter}
                 GROUP BY c.id, c.name, c.color
                 ORDER BY total DESC
                 LIMIT 5`,
                params
            );

            const totalIncomePaid = parseFloat(incomePaidResult.rows[0]?.total || 0);
            const totalIncomePending = parseFloat(incomePendingResult.rows[0]?.total || 0);
            const totalExpensePaid = parseFloat(expensePaidResult.rows[0]?.total || 0);
            const totalExpensePending = parseFloat(expensePendingResult.rows[0]?.total || 0);
            
            // Calcular saldo disponível ACUMULADO (todas as transações pagas, sem filtro de data)
            const accumulatedProfileFilter = profileId ? 'AND t.profile_id = $2' : 'AND (t.profile_id IS NULL OR t.profile_id IN (SELECT id FROM finance_profiles WHERE user_id = $1 AND is_primary = TRUE))';
            const accumulatedParams = profileId ? [userId, profileId] : [userId];
            
            const accountBalanceAccumulatedResult = await client.query(
                `SELECT 
                    COALESCE(SUM(CASE WHEN t.type = 'INCOME' AND t.status = 'PAID' THEN t.amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' AND t.status = 'PAID' THEN t.amount ELSE 0 END), 0) as total_expense
                 FROM finance_transactions t
                 WHERE t.user_id = $1 AND t.status = 'PAID' ${accumulatedProfileFilter}`,
                accumulatedParams
            );
            
            const totalIncomeAccumulated = parseFloat(accountBalanceAccumulatedResult.rows[0]?.total_income || 0);
            const totalExpenseAccumulated = parseFloat(accountBalanceAccumulatedResult.rows[0]?.total_expense || 0);
            const accountBalanceAccumulated = totalIncomeAccumulated - totalExpenseAccumulated;
            
            // Calcular saldo disponível do mês (apenas do período filtrado)
            const accountBalanceFromAccounts = parseFloat(accountBalanceResult.rows[0]?.total || 0);
            const accountBalanceFromTransactions = totalIncomePaid - totalExpensePaid;
            
            // Usar o saldo calculado das transações (mais preciso)
            // Se houver contas e o saldo for maior, usar o maior valor
            let accountBalance = accountBalanceFromTransactions;
            if (hasAccounts && accountBalanceFromAccounts > accountBalanceFromTransactions) {
                accountBalance = accountBalanceFromAccounts;
            }

            // Calcular variação em relação ao mês anterior
            const currentDate = new Date(dateFrom);
            const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const previousMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
            const previousMonthFrom = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}-01`;
            const previousMonthTo = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}-${previousMonthLastDay}`;
            
            const previousMonthParams = profileId ? [userId, profileId, previousMonthFrom, previousMonthTo] : [userId, previousMonthFrom, previousMonthTo];
            const previousMonthFilter = profileId ? 'AND t.profile_id = $2' : 'AND (t.profile_id IS NULL OR t.profile_id IN (SELECT id FROM finance_profiles WHERE user_id = $1 AND is_primary = TRUE))';
            
            const previousMonthBalanceResult = await client.query(
                `SELECT 
                    COALESCE(SUM(CASE WHEN t.type = 'INCOME' AND t.status = 'PAID' THEN t.amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' AND t.status = 'PAID' THEN t.amount ELSE 0 END), 0) as total_expense
                 FROM finance_transactions t
                 WHERE t.user_id = $1 AND t.status = 'PAID' ${previousMonthFilter}
                 AND t.transaction_date BETWEEN ${profileId ? '$3' : '$2'}::date AND ${profileId ? '$4' : '$3'}::date`,
                previousMonthParams
            );
            
            const previousMonthIncome = parseFloat(previousMonthBalanceResult.rows[0]?.total_income || 0);
            const previousMonthExpense = parseFloat(previousMonthBalanceResult.rows[0]?.total_expense || 0);
            const previousMonthBalance = previousMonthIncome - previousMonthExpense;
            const currentMonthBalance = totalIncomePaid - totalExpensePaid;
            
            // Calcular variação percentual
            let balanceVariation = 0;
            if (previousMonthBalance !== 0) {
                balanceVariation = ((currentMonthBalance - previousMonthBalance) / Math.abs(previousMonthBalance)) * 100;
            } else if (currentMonthBalance !== 0) {
                balanceVariation = currentMonthBalance > 0 ? 100 : -100;
            }

            return {
                totalIncome: totalIncomePaid,
                totalExpense: totalExpensePaid,
                pendingExpense: totalExpensePending,
                pendingIncome: totalIncomePending,
                accountBalance: accountBalanceAccumulated, // Saldo disponível acumulado (permanente)
                monthlyBalance: totalIncomePaid - totalExpensePaid, // Saldo total do mês
                netProfit: totalIncomePaid - totalExpensePaid,
                balanceVariation: balanceVariation, // Variação percentual em relação ao mês anterior
                topCategories: topCategoriesResult.rows
            };
        } finally {
            client.release();
        }
    }

    /**
     * Criar grupo de parcelamento
     */
    async createInstallmentGroup(data) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO finance_installment_groups (user_id, description, total_amount, total_installments)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [data.user_id, data.description, data.total_amount, data.total_installments]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Criar perfil financeiro
     */
    async createProfile(data) {
        const { user_id, name, description, color, icon } = data;
        const client = await db.pool.connect();
        try {
            // Se for marcado como principal, desmarcar outros
            if (data.is_primary) {
                await client.query(
                    'UPDATE finance_profiles SET is_primary = FALSE WHERE user_id = $1',
                    [user_id]
                );
            }
            
            const result = await client.query(
                `INSERT INTO finance_profiles (user_id, name, description, color, icon, is_primary, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, TRUE)
                 RETURNING *`,
                [user_id, name, description || null, color || '#3b82f6', icon || 'fa-wallet', data.is_primary || false]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Buscar perfis do usuário
     */
    async findProfilesByUserId(userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM finance_profiles WHERE user_id = $1 AND is_active = TRUE ORDER BY is_primary DESC, name ASC',
                [userId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar perfil por ID
     */
    async findProfileById(id, userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM finance_profiles WHERE id = $1 AND user_id = $2',
                [id, userId]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar perfil principal do usuário
     */
    async findPrimaryProfile(userId) {
        const client = await db.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM finance_profiles WHERE user_id = $1 AND is_primary = TRUE AND is_active = TRUE LIMIT 1',
                [userId]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Atualizar perfil
     */
    async updateProfile(id, userId, data) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Se for marcado como principal, desmarcar outros
            if (data.is_primary) {
                await client.query(
                    'UPDATE finance_profiles SET is_primary = FALSE WHERE user_id = $1 AND id != $2',
                    [userId, id]
                );
            }
            
            const updates = [];
            const values = [];
            let paramCount = 1;
            
            if (data.name !== undefined) {
                updates.push(`name = $${paramCount++}`);
                values.push(data.name);
            }
            if (data.description !== undefined) {
                updates.push(`description = $${paramCount++}`);
                values.push(data.description);
            }
            if (data.color !== undefined) {
                updates.push(`color = $${paramCount++}`);
                values.push(data.color);
            }
            if (data.icon !== undefined) {
                updates.push(`icon = $${paramCount++}`);
                values.push(data.icon);
            }
            if (data.is_primary !== undefined) {
                updates.push(`is_primary = $${paramCount++}`);
                values.push(data.is_primary);
            }
            if (data.is_active !== undefined) {
                updates.push(`is_active = $${paramCount++}`);
                values.push(data.is_active);
            }
            
            updates.push(`updated_at = NOW()`);
            values.push(id, userId);
            
            const result = await client.query(
                `UPDATE finance_profiles SET ${updates.join(', ')} WHERE id = $${paramCount++} AND user_id = $${paramCount++} RETURNING *`,
                values
            );
            
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Deletar perfil
     */
    async deleteProfile(id, userId) {
        const client = await db.pool.connect();
        try {
            // Verificar se é o único perfil
            const countResult = await client.query(
                'SELECT COUNT(*) FROM finance_profiles WHERE user_id = $1 AND is_active = TRUE',
                [userId]
            );
            if (parseInt(countResult.rows[0].count) <= 1) {
                throw new Error('Não é possível deletar o único perfil financeiro');
            }
            
            // Verificar se é o perfil principal
            const profile = await this.findProfileById(id, userId);
            if (profile && profile.is_primary) {
                // Tornar outro perfil como principal
                const otherProfile = await client.query(
                    'SELECT id FROM finance_profiles WHERE user_id = $1 AND id != $2 AND is_active = TRUE LIMIT 1',
                    [userId, id]
                );
                if (otherProfile.rows.length > 0) {
                    await client.query(
                        'UPDATE finance_profiles SET is_primary = TRUE WHERE id = $1',
                        [otherProfile.rows[0].id]
                    );
                }
            }
            
            // Marcar como inativo ao invés de deletar (para manter histórico)
            const result = await client.query(
                'UPDATE finance_profiles SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING *',
                [id, userId]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }
}

module.exports = new FinanceRepository();
