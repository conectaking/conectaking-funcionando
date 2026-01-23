/**
 * Validadores específicos para módulo Financeiro
 * Validação robusta no backend para segurança
 */

const TYPES = require('./finance.types');

class FinanceValidators {
    /**
     * Validar dados de transação
     */
    validateTransaction(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.user_id) {
                errors.push('user_id é obrigatório');
            }
            if (!data.type || !Object.values(TYPES.TRANSACTION_TYPE).includes(data.type)) {
                errors.push('type deve ser INCOME ou EXPENSE');
            }
            if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
                errors.push('amount deve ser um número positivo');
            }
            if (data.amount > TYPES.MAX_AMOUNT) {
                errors.push(`amount não pode ser maior que ${TYPES.MAX_AMOUNT}`);
            }
            if (!data.transaction_date) {
                errors.push('transaction_date é obrigatório');
            }
        }

        if (data.type !== undefined) {
            if (!Object.values(TYPES.TRANSACTION_TYPE).includes(data.type)) {
                errors.push('type deve ser INCOME ou EXPENSE');
            }
        }

        if (data.amount !== undefined) {
            if (typeof data.amount !== 'number' || data.amount <= 0) {
                errors.push('amount deve ser um número positivo');
            }
            if (data.amount > TYPES.MAX_AMOUNT) {
                errors.push(`amount não pode ser maior que ${TYPES.MAX_AMOUNT}`);
            }
            if (data.amount < TYPES.MIN_AMOUNT) {
                errors.push(`amount deve ser pelo menos ${TYPES.MIN_AMOUNT}`);
            }
        }

        if (data.status !== undefined) {
            if (!Object.values(TYPES.TRANSACTION_STATUS).includes(data.status)) {
                errors.push('status deve ser PENDING ou PAID');
            }
        }

        if (data.description !== undefined && data.description) {
            if (typeof data.description !== 'string') {
                errors.push('description deve ser uma string');
            }
            if (data.description.length > TYPES.MAX_DESCRIPTION_LENGTH) {
                errors.push(`description não pode ter mais de ${TYPES.MAX_DESCRIPTION_LENGTH} caracteres`);
            }
        }

        if (data.transaction_date !== undefined) {
            const date = new Date(data.transaction_date);
            if (isNaN(date.getTime())) {
                errors.push('transaction_date deve ser uma data válida');
            }
        }

        if (data.recurrence_type !== undefined && data.recurrence_type) {
            if (!Object.values(TYPES.RECURRENCE_TYPE).includes(data.recurrence_type)) {
                errors.push('recurrence_type deve ser WEEKLY, MONTHLY ou YEARLY');
            }
            if (data.recurrence_type && !data.recurrence_end_date) {
                errors.push('recurrence_end_date é obrigatório quando recurrence_type está definido');
            }
        }

        if (data.installment_number !== undefined) {
            if (typeof data.installment_number !== 'number' || data.installment_number < 1) {
                errors.push('installment_number deve ser um número positivo');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de categoria
     */
    validateCategory(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.user_id) {
                errors.push('user_id é obrigatório');
            }
            if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
                errors.push('name deve ter pelo menos 2 caracteres');
            }
            if (!data.type || !Object.values(TYPES.TRANSACTION_TYPE).includes(data.type)) {
                errors.push('type deve ser INCOME ou EXPENSE');
            }
        }

        if (data.name !== undefined) {
            if (typeof data.name !== 'string' || data.name.trim().length < 2) {
                errors.push('name deve ter pelo menos 2 caracteres');
            }
            if (data.name.length > 100) {
                errors.push('name não pode ter mais de 100 caracteres');
            }
        }

        if (data.color !== undefined && data.color) {
            if (typeof data.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
                errors.push('color deve ser um código hexadecimal válido (ex: #FF0000)');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de conta
     */
    validateAccount(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.user_id) {
                errors.push('user_id é obrigatório');
            }
            if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
                errors.push('name deve ter pelo menos 2 caracteres');
            }
            if (!data.type || !Object.values(TYPES.ACCOUNT_TYPE).includes(data.type)) {
                errors.push('type deve ser BANK, CASH, PIX ou WALLET');
            }
        }

        if (data.name !== undefined) {
            if (typeof data.name !== 'string' || data.name.trim().length < 2) {
                errors.push('name deve ter pelo menos 2 caracteres');
            }
            if (data.name.length > 100) {
                errors.push('name não pode ter mais de 100 caracteres');
            }
        }

        if (data.initial_balance !== undefined) {
            if (typeof data.initial_balance !== 'number') {
                errors.push('initial_balance deve ser um número');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de cartão
     */
    validateCard(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.user_id) {
                errors.push('user_id é obrigatório');
            }
            if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
                errors.push('name deve ter pelo menos 2 caracteres');
            }
            if (!data.limit_amount || typeof data.limit_amount !== 'number' || data.limit_amount <= 0) {
                errors.push('limit_amount deve ser um número positivo');
            }
        }

        if (data.limit_amount !== undefined) {
            if (typeof data.limit_amount !== 'number' || data.limit_amount <= 0) {
                errors.push('limit_amount deve ser um número positivo');
            }
        }

        if (data.closing_day !== undefined && data.closing_day !== null) {
            if (typeof data.closing_day !== 'number' || data.closing_day < 1 || data.closing_day > 31) {
                errors.push('closing_day deve ser um número entre 1 e 31');
            }
        }

        if (data.due_day !== undefined && data.due_day !== null) {
            if (typeof data.due_day !== 'number' || data.due_day < 1 || data.due_day > 31) {
                errors.push('due_day deve ser um número entre 1 e 31');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de orçamento
     */
    validateBudget(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.user_id) {
                errors.push('user_id é obrigatório');
            }
            if (!data.category_id || typeof data.category_id !== 'number') {
                errors.push('category_id é obrigatório');
            }
            if (!data.month || typeof data.month !== 'number' || data.month < 1 || data.month > 12) {
                errors.push('month deve ser um número entre 1 e 12');
            }
            if (!data.year || typeof data.year !== 'number' || data.year < 2020 || data.year > 2100) {
                errors.push('year deve ser um ano válido');
            }
            if (!data.limit_amount || typeof data.limit_amount !== 'number' || data.limit_amount <= 0) {
                errors.push('limit_amount deve ser um número positivo');
            }
        }

        if (data.month !== undefined) {
            if (typeof data.month !== 'number' || data.month < 1 || data.month > 12) {
                errors.push('month deve ser um número entre 1 e 12');
            }
        }

        if (data.year !== undefined) {
            if (typeof data.year !== 'number' || data.year < 2020 || data.year > 2100) {
                errors.push('year deve ser um ano válido');
            }
        }

        if (data.limit_amount !== undefined) {
            if (typeof data.limit_amount !== 'number' || data.limit_amount <= 0) {
                errors.push('limit_amount deve ser um número positivo');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de transferência entre contas
     */
    validateTransfer(data) {
        const errors = [];

        if (!data.user_id) {
            errors.push('user_id é obrigatório');
        }
        if (!data.from_account_id || typeof data.from_account_id !== 'number') {
            errors.push('from_account_id é obrigatório');
        }
        if (!data.to_account_id || typeof data.to_account_id !== 'number') {
            errors.push('to_account_id é obrigatório');
        }
        if (data.from_account_id === data.to_account_id) {
            errors.push('from_account_id e to_account_id devem ser diferentes');
        }
        if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
            errors.push('amount deve ser um número positivo');
        }
        if (!data.transaction_date) {
            errors.push('transaction_date é obrigatório');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de perfil financeiro
     */
    validateProfile(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.user_id) {
            errors.push('user_id é obrigatório');
        }
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            errors.push('name é obrigatório e deve ser uma string não vazia');
        }
        if (data.name && data.name.length > 100) {
            errors.push('name deve ter no máximo 100 caracteres');
        }
        if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
            errors.push('color deve ser um código hexadecimal válido (ex: #3b82f6)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = new FinanceValidators();
