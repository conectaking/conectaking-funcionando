const repository = require('./finance.repository');
const validators = require('./finance.validators');
const logger = require('../../utils/logger');
const TYPES = require('./finance.types');

class FinanceService {
    /**
     * Criar nova transação
     */
    async createTransaction(userId, data) {
        // Validar dados
        const validation = validators.validateTransaction({ ...data, user_id: userId });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const db = require('../../db');
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Criar transação principal
            const transaction = await repository.createTransaction({
                ...data,
                user_id: userId
            }, client);

            // Se for recorrente, criar transações para os meses seguintes
            if (data.is_recurring && data.recurring_times && data.recurring_times > 1) {
                const baseDate = new Date(data.transaction_date);
                const createdTransactions = [transaction];

                for (let i = 1; i < data.recurring_times; i++) {
                    // Criar nova data adicionando meses corretamente
                    const nextDate = new Date(baseDate);
                    // Usar setFullYear e setMonth para evitar problemas com virada de ano
                    const nextYear = nextDate.getFullYear();
                    const nextMonth = nextDate.getMonth() + i;
                    
                    // Ajustar ano se necessário
                    const finalYear = nextYear + Math.floor(nextMonth / 12);
                    const finalMonth = nextMonth % 12;
                    
                    nextDate.setFullYear(finalYear);
                    nextDate.setMonth(finalMonth);
                    // Manter o mesmo dia do mês
                    const dayOfMonth = baseDate.getDate();
                    nextDate.setDate(Math.min(dayOfMonth, new Date(finalYear, finalMonth + 1, 0).getDate()));

                    const recurringTransaction = await repository.createTransaction({
                        ...data,
                        user_id: userId,
                        transaction_date: nextDate.toISOString().split('T')[0],
                        is_recurring: false, // Apenas a primeira é marcada como recorrente
                        recurring_times: null
                    }, client);

                    createdTransactions.push(recurringTransaction);
                }

                logger.info(`Transação recorrente criada: ${transaction.id} + ${createdTransactions.length - 1} transações futuras para usuário ${userId}`);
                await client.query('COMMIT');
                
                // Atualizar saldos das contas se necessário
                if (transaction.account_id) {
                    await this.updateAccountBalance(transaction.account_id, userId);
                }
                
                return transaction;
            }

            await client.query('COMMIT');

            // Se for despesa paga em conta, atualizar saldo
            if (transaction.type === 'EXPENSE' && transaction.status === 'PAID' && transaction.account_id) {
                await this.updateAccountBalance(transaction.account_id, userId);
            }

            // Se for receita paga em conta, atualizar saldo
            if (transaction.type === 'INCOME' && transaction.status === 'PAID' && transaction.account_id) {
                await this.updateAccountBalance(transaction.account_id, userId);
            }

            logger.info(`Transação criada: ${transaction.id} para usuário ${userId}`);
            return transaction;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Erro ao criar transação:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar transação por ID
     */
    async findTransactionById(id, userId) {
        const transaction = await repository.findTransactionById(id, userId);
        if (!transaction) {
            throw new Error('Transação não encontrada');
        }
        return transaction;
    }

    /**
     * Buscar transações do usuário
     */
    async findTransactionsByUserId(userId, filters = {}) {
        return await repository.findTransactionsByUserId(userId, filters);
    }

    /**
     * Atualizar transação
     */
    async updateTransaction(id, userId, data) {
        // Verificar se existe
        const existing = await repository.findTransactionById(id, userId);
        if (!existing) {
            throw new Error('Transação não encontrada');
        }

        // Validar dados
        const validation = validators.validateTransaction(data, true);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const db = require('../../db');
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Atualizar transação existente
            const updated = await repository.updateTransaction(id, userId, data);

            // Se foi marcado como recorrente e tem recurring_times, criar transações futuras
            if (data.is_recurring && data.recurring_times && data.recurring_times > 1) {
                // Verificar se já existem transações recorrentes criadas para esta transação
                // (buscar por mesma descrição e datas futuras próximas)
                const baseDate = new Date(data.transaction_date || existing.transaction_date);
                
                // Criar transações para os meses seguintes
                for (let i = 1; i < data.recurring_times; i++) {
                    const nextDate = new Date(baseDate);
                    const nextYear = nextDate.getFullYear();
                    const nextMonth = nextDate.getMonth() + i;
                    
                    const finalYear = nextYear + Math.floor(nextMonth / 12);
                    const finalMonth = nextMonth % 12;
                    
                    nextDate.setFullYear(finalYear);
                    nextDate.setMonth(finalMonth);
                    const dayOfMonth = baseDate.getDate();
                    nextDate.setDate(Math.min(dayOfMonth, new Date(finalYear, finalMonth + 1, 0).getDate()));

                    // Verificar se já existe transação para esta data
                    const existingRecurring = await repository.findTransactionsByUserId(userId, {
                        dateFrom: nextDate.toISOString().split('T')[0],
                        dateTo: nextDate.toISOString().split('T')[0],
                        limit: 100
                    });
                    
                    const alreadyExists = existingRecurring.data.some(t => 
                        t.description === (data.description || existing.description) &&
                        t.type === (data.type || existing.type) &&
                        Math.abs(new Date(t.transaction_date).getTime() - nextDate.getTime()) < 86400000 // Mesmo dia
                    );
                    
                    if (!alreadyExists) {
                        await repository.createTransaction({
                            ...data,
                            user_id: userId,
                            transaction_date: nextDate.toISOString().split('T')[0],
                            is_recurring: false,
                            recurring_times: null
                        }, client);
                    }
                }
            }

            await client.query('COMMIT');

            // Se mudou status ou valor, atualizar saldo da conta
            if ((data.status !== undefined || data.amount !== undefined) && updated.account_id) {
                await this.updateAccountBalance(updated.account_id, userId);
            }

            logger.info(`Transação atualizada: ${id} para usuário ${userId}`);
            return updated;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Erro ao atualizar transação:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Deletar transação
     */
    async deleteTransaction(id, userId) {
        const transaction = await repository.findTransactionById(id, userId);
        if (!transaction) {
            throw new Error('Transação não encontrada');
        }

        await repository.deleteTransaction(id, userId);

        // Atualizar saldo da conta se necessário
        if (transaction.account_id) {
            await this.updateAccountBalance(transaction.account_id, userId);
        }

        logger.info(`Transação deletada: ${id} para usuário ${userId}`);
        return { success: true };
    }

    /**
     * Criar categoria
     */
    async createCategory(userId, data) {
        const validation = validators.validateCategory({ ...data, user_id: userId });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        return await repository.createCategory({
            ...data,
            user_id: userId
        });
    }

    /**
     * Buscar categorias do usuário
     */
    async findCategoriesByUserId(userId, type = null) {
        return await repository.findCategoriesByUserId(userId, type);
    }

    /**
     * Criar conta
     */
    async createAccount(userId, data) {
        const validation = validators.validateAccount({ ...data, user_id: userId });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        return await repository.createAccount({
            ...data,
            user_id: userId
        });
    }

    /**
     * Buscar contas do usuário
     */
    async findAccountsByUserId(userId) {
        return await repository.findAccountsByUserId(userId);
    }

    /**
     * Atualizar saldo da conta
     */
    async updateAccountBalance(accountId, userId) {
        // Calcular saldo atual baseado em transações
        const transactions = await repository.findTransactionsByUserId(userId, {
            account_id: accountId,
            limit: 10000 // Buscar todas
        });

        const account = await repository.findAccountsByUserId(userId);
        const accountData = account.find(a => a.id === accountId);
        if (!accountData) {
            return;
        }

        let balance = accountData.initial_balance || 0;

        transactions.data.forEach(t => {
            if (t.status === 'PAID') {
                if (t.type === 'INCOME') {
                    balance += parseFloat(t.amount);
                } else if (t.type === 'EXPENSE') {
                    balance -= parseFloat(t.amount);
                }
            }
        });

        await repository.updateAccountBalance(accountId, userId, balance);
        return balance;
    }

    /**
     * Criar cartão
     */
    async createCard(userId, data) {
        const validation = validators.validateCard({ ...data, user_id: userId });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        return await repository.createCard({
            ...data,
            user_id: userId
        });
    }

    /**
     * Buscar cartões do usuário
     */
    async findCardsByUserId(userId) {
        return await repository.findCardsByUserId(userId);
    }

    /**
     * Criar orçamento
     */
    async createBudget(userId, data) {
        const validation = validators.validateBudget({ ...data, user_id: userId });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        return await repository.createBudget({
            ...data,
            user_id: userId
        });
    }

    /**
     * Buscar orçamentos do usuário
     */
    async findBudgetsByUserId(userId, month = null, year = null) {
        return await repository.findBudgetsByUserId(userId, month, year);
    }

    /**
     * Transferir entre contas
     */
    async transferBetweenAccounts(userId, data) {
        const validation = validators.validateTransfer({ ...data, user_id: userId });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const client = await require('../../db').pool.connect();
        try {
            await client.query('BEGIN');

            // Criar transação de saída
            const fromTransaction = await repository.createTransaction({
                user_id: userId,
                type: 'EXPENSE',
                amount: data.amount,
                description: `Transferência para ${data.to_account_id}`,
                transaction_date: data.transaction_date,
                account_id: data.from_account_id,
                status: 'PAID'
            }, client);

            // Criar transação de entrada
            const toTransaction = await repository.createTransaction({
                user_id: userId,
                type: 'INCOME',
                amount: data.amount,
                description: `Transferência de ${data.from_account_id}`,
                transaction_date: data.transaction_date,
                account_id: data.to_account_id,
                status: 'PAID'
            }, client);

            await client.query('COMMIT');

            // Atualizar saldos
            await this.updateAccountBalance(data.from_account_id, userId);
            await this.updateAccountBalance(data.to_account_id, userId);

            return {
                fromTransaction,
                toTransaction
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obter estatísticas do dashboard
     */
    async getDashboardStats(userId, dateFrom, dateTo, profileId = null) {
        const stats = await repository.getDashboardStats(userId, dateFrom, dateTo, profileId);

        // Buscar saldo total de todas as contas do perfil
        const accounts = await repository.findAccountsByUserId(userId);
        const filteredAccounts = profileId 
            ? accounts.filter(acc => acc.profile_id === profileId)
            : accounts.filter(acc => !acc.profile_id || acc.profile_id === null);
        const totalBalance = filteredAccounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);

        // Buscar orçamentos do mês atual do perfil
        const now = new Date();
        const budgets = await repository.findBudgetsByUserId(userId, now.getMonth() + 1, now.getFullYear());
        const filteredBudgets = profileId 
            ? budgets.filter(b => b.profile_id === profileId)
            : budgets.filter(b => !b.profile_id || b.profile_id === null);

        // Calcular gastos por categoria com orçamento
        const budgetsWithSpent = await Promise.all(
            filteredBudgets.map(async (budget) => {
                const categoryTransactions = await repository.findTransactionsByUserId(userId, {
                    category_id: budget.category_id,
                    type: 'EXPENSE',
                    dateFrom: `${budget.year}-${String(budget.month).padStart(2, '0')}-01`,
                    dateTo: `${budget.year}-${String(budget.month).padStart(2, '0')}-31`,
                    profile_id: profileId,
                    limit: 10000
                });

                const spent = categoryTransactions.data
                    .filter(t => budget.consider_pending || t.status === 'PAID')
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                const percentage = (spent / parseFloat(budget.limit_amount)) * 100;

                return {
                    ...budget,
                    spent,
                    percentage,
                    remaining: parseFloat(budget.limit_amount) - spent,
                    isOverBudget: spent > parseFloat(budget.limit_amount),
                    isNearLimit: percentage >= 80 && percentage <= 100
                };
            })
        );

        return {
            ...stats,
            totalBalance,
            budgets: budgetsWithSpent
        };
    }
}

    /**
     * Criar perfil financeiro
     */
    async createProfile(userId, data) {
        const validation = validators.validateProfile({ ...data, user_id: userId });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        return await repository.createProfile({
            ...data,
            user_id: userId
        });
    }

    /**
     * Buscar perfis do usuário
     */
    async findProfilesByUserId(userId) {
        return await repository.findProfilesByUserId(userId);
    }

    /**
     * Buscar perfil por ID
     */
    async findProfileById(id, userId) {
        const profile = await repository.findProfileById(id, userId);
        if (!profile) {
            throw new Error('Perfil não encontrado');
        }
        return profile;
    }

    /**
     * Buscar perfil principal
     */
    async findPrimaryProfile(userId) {
        let profile = await repository.findPrimaryProfile(userId);
        // Se não tiver perfil principal, buscar qualquer perfil ativo
        if (!profile) {
            const profiles = await repository.findProfilesByUserId(userId);
            if (profiles.length > 0) {
                profile = profiles[0];
                // Tornar este perfil como principal
                await repository.updateProfile(profile.id, userId, { is_primary: true });
                profile.is_primary = true;
            }
        }
        return profile;
    }

    /**
     * Atualizar perfil
     */
    async updateProfile(id, userId, data) {
        const existing = await repository.findProfileById(id, userId);
        if (!existing) {
            throw new Error('Perfil não encontrado');
        }
        return await repository.updateProfile(id, userId, data);
    }

    /**
     * Deletar perfil
     */
    async deleteProfile(id, userId) {
        const existing = await repository.findProfileById(id, userId);
        if (!existing) {
            throw new Error('Perfil não encontrado');
        }
        return await repository.deleteProfile(id, userId);
    }
}

module.exports = new FinanceService();
