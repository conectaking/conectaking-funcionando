const TYPES = require('./product.types');

class ProductValidators {
    /**
     * Validar dados de produto
     */
    validateProductData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.sales_page_id) {
                errors.push('sales_page_id é obrigatório');
            }
        }

        if (data.name !== undefined) {
            if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
                errors.push('name deve ter pelo menos 2 caracteres');
            }
            if (data.name && data.name.length > 255) {
                errors.push('name não pode ter mais de 255 caracteres');
            }
        }

        if (data.price !== undefined) {
            const priceNum = parseFloat(data.price);
            if (isNaN(priceNum) || priceNum <= 0) {
                errors.push('price deve ser um número maior que zero');
            }
        }

        if (data.compare_price !== undefined && data.compare_price !== null) {
            const comparePriceNum = parseFloat(data.compare_price);
            if (isNaN(comparePriceNum) || comparePriceNum <= 0) {
                errors.push('compare_price deve ser um número maior que zero');
            }
            if (data.price && comparePriceNum <= parseFloat(data.price)) {
                errors.push('compare_price deve ser maior que price');
            }
        }

        if (data.stock !== undefined && data.stock !== null) {
            const stockNum = parseInt(data.stock);
            if (isNaN(stockNum) || stockNum < 0) {
                errors.push('stock deve ser um número inteiro maior ou igual a zero');
            }
        }

        if (data.status !== undefined && !Object.values(TYPES.STATUS).includes(data.status)) {
            errors.push(`status deve ser um dos valores: ${Object.values(TYPES.STATUS).join(', ')}`);
        }

        if (data.badge !== undefined && data.badge && !Object.values(TYPES.BADGES).includes(data.badge)) {
            errors.push(`badge deve ser um dos valores: ${Object.values(TYPES.BADGES).join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar transição de status
     */
    validateStatusTransition(currentStatus, newStatus) {
        const allowedTransitions = TYPES.STATUS_TRANSITIONS[currentStatus] || [];
        
        if (!allowedTransitions.includes(newStatus)) {
            return {
                isValid: false,
                error: `Não é possível transicionar de ${currentStatus} para ${newStatus}. Transições permitidas: ${allowedTransitions.join(', ')}`
            };
        }

        return { isValid: true };
    }

    /**
     * Sanitizar dados
     */
    sanitize(data) {
        const sanitized = {};

        if (data.name !== undefined) {
            sanitized.name = data.name ? data.name.trim() : null;
        }
        if (data.description !== undefined) {
            sanitized.description = data.description ? data.description.trim() : null;
        }
        if (data.price !== undefined) {
            sanitized.price = parseFloat(data.price);
        }
        if (data.compare_price !== undefined) {
            sanitized.compare_price = data.compare_price ? parseFloat(data.compare_price) : null;
        }
        if (data.stock !== undefined) {
            sanitized.stock = data.stock !== null ? parseInt(data.stock) : null;
        }
        if (data.variations !== undefined) {
            sanitized.variations = data.variations ? JSON.stringify(data.variations) : null;
        }
        if (data.display_order !== undefined) {
            sanitized.display_order = parseInt(data.display_order) || 0;
        }

        const fieldsToCopy = ['sales_page_id', 'image_url', 'status', 'badge', 'is_featured'];
        fieldsToCopy.forEach(field => {
            if (data[field] !== undefined) {
                sanitized[field] = data[field];
            }
        });

        return sanitized;
    }
}

module.exports = new ProductValidators();

