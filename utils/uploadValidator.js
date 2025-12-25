/**
 * Utilitários para validação de uploads
 * Valida tipos MIME reais, tamanhos, etc.
 */

const config = require('../config');
const logger = require('./logger');

/**
 * Valida tipo MIME real do arquivo (não apenas extensão)
 */
function validateMimeType(file, allowedTypes) {
    if (!file || !file.mimetype) {
        return { valid: false, error: 'Tipo de arquivo não identificado' };
    }

    if (!allowedTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: `Tipo de arquivo não permitido. Permitidos: ${allowedTypes.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Valida tamanho do arquivo
 */
function validateFileSize(file, maxSize = config.upload.maxFileSize) {
    if (!file || !file.size) {
        return { valid: false, error: 'Tamanho do arquivo não identificado' };
    }

    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
        return {
            valid: false,
            error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`
        };
    }

    return { valid: true };
}

/**
 * Valida imagem
 */
function validateImage(file) {
    const mimeCheck = validateMimeType(file, config.upload.allowedMimeTypes.image);
    if (!mimeCheck.valid) {
        return mimeCheck;
    }

    const sizeCheck = validateFileSize(file);
    if (!sizeCheck.valid) {
        return sizeCheck;
    }

    return { valid: true };
}

/**
 * Valida PDF
 */
function validatePDF(file) {
    const mimeCheck = validateMimeType(file, config.upload.allowedMimeTypes.pdf);
    if (!mimeCheck.valid) {
        return mimeCheck;
    }

    const sizeCheck = validateFileSize(file);
    if (!sizeCheck.valid) {
        return sizeCheck;
    }

    return { valid: true };
}

/**
 * Middleware para validação de upload de imagem
 */
const validateImageUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Nenhum arquivo enviado'
        });
    }

    const validation = validateImage(req.file);
    if (!validation.valid) {
        logger.warn('Upload de imagem rejeitado', {
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            error: validation.error
        });
        return res.status(400).json({
            success: false,
            message: validation.error
        });
    }

    next();
};

/**
 * Middleware para validação de upload de PDF
 */
const validatePDFUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Nenhum arquivo enviado'
        });
    }

    const validation = validatePDF(req.file);
    if (!validation.valid) {
        logger.warn('Upload de PDF rejeitado', {
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            error: validation.error
        });
        return res.status(400).json({
            success: false,
            message: validation.error
        });
    }

    next();
};

module.exports = {
    validateImage,
    validatePDF,
    validateMimeType,
    validateFileSize,
    validateImageUpload,
    validatePDFUpload
};
