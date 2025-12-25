/**
 * Helpers adicionais para validação
 * Complementa express-validator
 */

/**
 * Valida se valor está presente e não vazio
 */
function isNotEmpty(value) {
    if (value === null || value === undefined) {
        return false;
    }
    
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    
    if (typeof value === 'object') {
        return Object.keys(value).length > 0;
    }
    
    return true;
}

/**
 * Valida se é um número válido
 */
function isNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Valida se é um inteiro
 */
function isInteger(value) {
    return isNumber(value) && Number.isInteger(value);
}

/**
 * Valida range de número
 */
function isInRange(value, min, max) {
    if (!isNumber(value)) {
        return false;
    }
    return value >= min && value <= max;
}

/**
 * Valida se string tem tamanho mínimo e máximo
 */
function isLength(value, min, max) {
    if (typeof value !== 'string') {
        return false;
    }
    const length = value.trim().length;
    return length >= min && length <= max;
}

/**
 * Valida enum (valores permitidos)
 */
function isEnum(value, allowedValues) {
    return allowedValues.includes(value);
}

/**
 * Valida formato de data ISO
 */
function isISO8601(value) {
    if (typeof value !== 'string') {
        return false;
    }
    
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!iso8601Regex.test(value)) {
        return false;
    }
    
    const date = new Date(value);
    return !isNaN(date.getTime());
}

/**
 * Valida se é um UUID
 */
function isUUID(value) {
    if (typeof value !== 'string') {
        return false;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

module.exports = {
    isNotEmpty,
    isNumber,
    isInteger,
    isInRange,
    isLength,
    isEnum,
    isISO8601,
    isUUID
};

