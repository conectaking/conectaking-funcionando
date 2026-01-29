const TYPES = require('./linkLimits.types');

class LinkLimitsValidators {
    /**
     * Validar dados de criação/atualização de limite
     */
    validateLimitData(data) {
        const errors = [];

        if (!data.module_type) {
            errors.push('module_type é obrigatório');
        } else if (!TYPES.MODULE_TYPES.includes(data.module_type)) {
            errors.push(`module_type inválido. Deve ser um dos: ${TYPES.MODULE_TYPES.join(', ')}`);
        }

        if (!data.plan_code) {
            errors.push('plan_code é obrigatório');
        } else if (typeof data.plan_code !== 'string' || data.plan_code.trim().length === 0) {
            errors.push('plan_code deve ser uma string não vazia');
        }

        if (data.max_links !== undefined && data.max_links !== null) {
            if (typeof data.max_links !== 'number' || !Number.isInteger(data.max_links)) {
                errors.push('max_links deve ser um número inteiro ou null');
            } else if (data.max_links < 0) {
                errors.push('max_links não pode ser negativo');
            } else if (data.max_links > TYPES.MAX_RECOMMENDED_LINKS) {
                errors.push(`max_links não pode ser maior que ${TYPES.MAX_RECOMMENDED_LINKS}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de atualização em lote
     */
    validateBulkUpdateData(data) {
        const errors = [];

        if (!Array.isArray(data.limits)) {
            errors.push('limits deve ser um array');
            return { isValid: false, errors };
        }

        if (data.limits.length === 0) {
            errors.push('limits não pode estar vazio');
            return { isValid: false, errors };
        }

        data.limits.forEach((limit, index) => {
            const validation = this.validateLimitData(limit);
            if (!validation.isValid) {
                errors.push(`Item ${index}: ${validation.errors.join(', ')}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitizar dados
     */
    sanitize(data) {
        const sanitized = { ...data };

        if (sanitized.module_type) {
            sanitized.module_type = sanitized.module_type.trim().toLowerCase();
        }

        if (sanitized.plan_code) {
            sanitized.plan_code = sanitized.plan_code.trim().toLowerCase();
        }

        if (sanitized.max_links !== undefined && sanitized.max_links !== null) {
            sanitized.max_links = parseInt(sanitized.max_links, 10);
            if (isNaN(sanitized.max_links)) {
                sanitized.max_links = null;
            }
        }

        return sanitized;
    }
}

module.exports = new LinkLimitsValidators();
