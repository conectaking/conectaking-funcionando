/**
 * Validadores específicos para módulo de Contratos
 * Validação robusta no backend para segurança
 */

const { isValidEmail, isValidPhone, isValidCPF, sanitizeString, escapeHtml } = require('../../utils/formValidators');
const TYPES = require('./contract.types');

class ContractValidators {
    /**
     * Validar dados de criação/atualização de contrato
     */
    validateContractData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.user_id) {
                errors.push('user_id é obrigatório');
            }
            if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
                errors.push('title deve ter pelo menos 3 caracteres');
            }
        }

        if (data.title !== undefined) {
            if (data.title && typeof data.title === 'string' && data.title.trim().length < 3) {
                errors.push('title deve ter pelo menos 3 caracteres');
            }
            if (data.title && data.title.length > 255) {
                errors.push('title não pode ter mais de 255 caracteres');
            }
        }

        if (data.status !== undefined) {
            const validStatuses = Object.values(TYPES.STATUS);
            if (!validStatuses.includes(data.status)) {
                errors.push(`status deve ser um dos: ${validStatuses.join(', ')}`);
            }
        }

        if (data.contract_type !== undefined) {
            const validTypes = Object.values(TYPES.CONTRACT_TYPE);
            if (!validTypes.includes(data.contract_type)) {
                errors.push(`contract_type deve ser um dos: ${validTypes.join(', ')}`);
            }
        }

        // Validar variáveis JSONB
        if (data.variables !== undefined && data.variables !== null) {
            if (typeof data.variables !== 'object' || Array.isArray(data.variables)) {
                errors.push('variables deve ser um objeto JSON');
            }
        }

        // Validar PDF URL (se fornecido)
        if (data.pdf_url !== undefined && data.pdf_url) {
            if (typeof data.pdf_url !== 'string' || data.pdf_url.trim().length === 0) {
                errors.push('pdf_url deve ser uma URL válida');
            }
        }

        // Validar template_id (se fornecido)
        if (data.template_id !== undefined && data.template_id !== null) {
            if (!Number.isInteger(data.template_id) || data.template_id < 1) {
                errors.push('template_id deve ser um número inteiro positivo');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar dados de signatário
     */
    validateSignerData(data) {
        const errors = [];

        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
            errors.push('name deve ter pelo menos 2 caracteres');
        }

        if (!data.email || !isValidEmail(data.email)) {
            errors.push('email deve ser um email válido');
        }

        if (data.role !== undefined) {
            const validRoles = Object.values(TYPES.SIGNER_ROLE);
            if (!validRoles.includes(data.role)) {
                errors.push(`role deve ser um dos: ${validRoles.join(', ')}`);
            }
        }

        if (data.sign_order !== undefined) {
            if (!Number.isInteger(data.sign_order) || data.sign_order < 0) {
                errors.push('sign_order deve ser um número inteiro >= 0');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validar assinatura
     */
    validateSignatureData(data) {
        const errors = [];

        if (!data.signature_type) {
            errors.push('signature_type é obrigatório');
        } else {
            const validTypes = Object.values(TYPES.SIGNATURE_TYPE);
            if (!validTypes.includes(data.signature_type)) {
                errors.push(`signature_type deve ser um dos: ${validTypes.join(', ')}`);
            }
        }

        if (!data.signature_data || typeof data.signature_data !== 'string') {
            errors.push('signature_data é obrigatório e deve ser uma string');
        }

        // Validações específicas por tipo
        if (data.signature_type === 'canvas') {
            // Canvas deve ser base64
            if (!data.signature_data.startsWith('data:image/')) {
                errors.push('Canvas signature_data deve ser base64 de imagem (data:image/...)');
            }
        } else if (data.signature_type === 'upload') {
            // Upload deve ser URL ou base64
            if (!data.signature_data.startsWith('http') && !data.signature_data.startsWith('data:image/')) {
                errors.push('Upload signature_data deve ser URL ou base64 de imagem');
            }
        } else if (data.signature_type === 'typed') {
            // Typed deve ser texto
            if (data.signature_data.trim().length < 2) {
                errors.push('Assinatura digitada deve ter pelo menos 2 caracteres');
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
                error: `Não é possível transicionar de ${currentStatus} para ${newStatus}. Transições permitidas: ${allowedTransitions.join(', ') || 'nenhuma'}`
            };
        }

        return { isValid: true };
    }

    /**
     * Validar PDF
     */
    validatePDF(file) {
        if (!file) {
            return { valid: false, error: 'Arquivo PDF é obrigatório' };
        }

        // Validar tipo MIME
        if (file.mimetype !== 'application/pdf') {
            return { valid: false, error: 'Arquivo deve ser um PDF (application/pdf)' };
        }

        // Validar tamanho (10MB máximo)
        if (file.size > TYPES.MAX_PDF_SIZE_BYTES) {
            return { valid: false, error: `PDF não pode ter mais de ${TYPES.MAX_PDF_SIZE_MB}MB` };
        }

        return { valid: true };
    }

    /**
     * Validar imagem de assinatura
     */
    validateSignatureImage(file) {
        if (!file) {
            return { valid: false, error: 'Imagem de assinatura é obrigatória' };
        }

        // Validar tipo MIME (PNG ou JPG)
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return { valid: false, error: 'Imagem deve ser PNG ou JPG' };
        }

        // Validar tamanho (2MB máximo)
        if (file.size > TYPES.MAX_SIGNATURE_IMAGE_SIZE_BYTES) {
            return { valid: false, error: `Imagem não pode ter mais de ${TYPES.MAX_SIGNATURE_IMAGE_SIZE_MB}MB` };
        }

        return { valid: true };
    }

    /**
     * Sanitizar dados de entrada
     */
    sanitize(data) {
        const sanitized = {};

        if (data.title !== undefined) {
            sanitized.title = data.title ? sanitizeString(data.title) : null;
        }
        if (data.pdf_content !== undefined) {
            sanitized.pdf_content = data.pdf_content ? sanitizeString(data.pdf_content) : null;
        }

        // Copiar campos que não precisam sanitização
        const fieldsToCopy = [
            'user_id', 'template_id', 'status', 'contract_type', 'pdf_url',
            'variables', 'original_pdf_hash', 'final_pdf_url', 'final_pdf_hash',
            'expires_at', 'completed_at'
        ];

        fieldsToCopy.forEach(field => {
            if (data[field] !== undefined) {
                sanitized[field] = data[field];
            }
        });

        return sanitized;
    }

    /**
     * Sanitizar dados de signatário
     */
    sanitizeSigner(data) {
        return {
            name: data.name ? sanitizeString(data.name) : null,
            email: data.email ? data.email.trim().toLowerCase() : null,
            role: data.role || TYPES.SIGNER_ROLE.SIGNER,
            sign_order: data.sign_order !== undefined ? parseInt(data.sign_order) : 0
        };
    }
}

module.exports = new ContractValidators();
