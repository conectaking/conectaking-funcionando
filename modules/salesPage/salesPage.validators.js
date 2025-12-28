const TYPES = require('./salesPage.types');

class SalesPageValidators {
    /**
     * Validar dados de criação/atualização
     */
    validateSalesPageData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.profile_item_id) {
                errors.push('profile_item_id é obrigatório');
            }
        }

        if (data.store_title !== undefined) {
            if (!data.store_title || typeof data.store_title !== 'string' || data.store_title.trim().length < 2) {
                errors.push('store_title deve ter pelo menos 2 caracteres');
            }
            if (data.store_title && data.store_title.length > 255) {
                errors.push('store_title não pode ter mais de 255 caracteres');
            }
        }

        if (data.button_text !== undefined && data.button_text && data.button_text.length > 100) {
            errors.push('button_text não pode ter mais de 100 caracteres');
        }

        if (data.theme !== undefined && !['light', 'dark'].includes(data.theme)) {
            errors.push('theme deve ser "light" ou "dark"');
        }

        if (data.whatsapp_number !== undefined) {
            // whatsapp_number é obrigatório na criação (NOT NULL), mas pode ser string vazia temporariamente
            if (data.whatsapp_number && typeof data.whatsapp_number !== 'string') {
                errors.push('whatsapp_number deve ser uma string');
            } else if (data.whatsapp_number && typeof data.whatsapp_number === 'string' && data.whatsapp_number.trim()) {
                // Validar formato básico de WhatsApp apenas se não for vazio
                const whatsappRegex = /^[\d\s\+\-\(\)]+$/;
                if (!whatsappRegex.test(data.whatsapp_number)) {
                    errors.push('whatsapp_number deve conter apenas números e caracteres de formatação (+ - ( ) espaços)');
                }
            }
        }
        // Se não fornecido na criação, será tratado no service como string vazia

        if (data.background_color !== undefined && data.background_color) {
            if (!/^#[0-9A-Fa-f]{6}$/.test(data.background_color)) {
                errors.push('background_color deve ser um código hexadecimal válido (ex: #FF0000)');
            }
        }

        if (data.text_color !== undefined && data.text_color) {
            if (!/^#[0-9A-Fa-f]{6}$/.test(data.text_color)) {
                errors.push('text_color deve ser um código hexadecimal válido');
            }
        }

        if (data.button_color !== undefined && data.button_color) {
            if (!/^#[0-9A-Fa-f]{6}$/.test(data.button_color)) {
                errors.push('button_color deve ser um código hexadecimal válido');
            }
        }

        if (data.button_text_color !== undefined && data.button_text_color) {
            if (!/^#[0-9A-Fa-f]{6}$/.test(data.button_text_color)) {
                errors.push('button_text_color deve ser um código hexadecimal válido');
            }
        }

        if (data.slug !== undefined && data.slug) {
            if (!/^[a-z0-9-]+$/.test(data.slug)) {
                errors.push('slug deve conter apenas letras minúsculas, números e hífens');
            }
            if (data.slug.length > 255) {
                errors.push('slug não pode ter mais de 255 caracteres');
            }
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
     * Sanitizar dados de entrada
     */
    sanitize(data) {
        const sanitized = {};

        if (data.store_title !== undefined) {
            sanitized.store_title = data.store_title ? data.store_title.trim() : null;
        }
        if (data.store_description !== undefined) {
            sanitized.store_description = data.store_description ? data.store_description.trim() : null;
        }
        if (data.button_text !== undefined) {
            sanitized.button_text = data.button_text ? data.button_text.trim() : null;
        }
        if (data.whatsapp_number !== undefined) {
            // whatsapp_number é NOT NULL no banco, então usar string vazia se não fornecido ou null
            if (data.whatsapp_number === null || data.whatsapp_number === undefined) {
                sanitized.whatsapp_number = '';
            } else if (typeof data.whatsapp_number === 'string') {
                sanitized.whatsapp_number = data.whatsapp_number.trim() || '';
            } else {
                sanitized.whatsapp_number = String(data.whatsapp_number).trim() || '';
            }
        } else {
            // Se não fornecido, usar string vazia como padrão (NOT NULL no banco)
            sanitized.whatsapp_number = '';
        }
        if (data.meta_title !== undefined) {
            sanitized.meta_title = data.meta_title ? data.meta_title.trim() : null;
        }
        if (data.meta_description !== undefined) {
            sanitized.meta_description = data.meta_description ? data.meta_description.trim() : null;
        }
        if (data.slug !== undefined) {
            sanitized.slug = data.slug ? data.slug.toLowerCase().trim() : null;
        }

        // Copiar outros campos que não precisam sanitização
        const fieldsToCopy = [
            'profile_item_id', 'button_logo_url', 'theme', 'background_color',
            'text_color', 'button_color', 'button_text_color', 'background_image_url',
            'meta_image_url', 'preview_token', 'status' // IMPORTANTE: incluir status para permitir mudanças de status
        ];

        fieldsToCopy.forEach(field => {
            if (data[field] !== undefined) {
                sanitized[field] = data[field];
            }
        });

        return sanitized;
    }
}

module.exports = new SalesPageValidators();

