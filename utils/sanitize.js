/**
 * Utilitários para sanitização de inputs
 * Previne XSS e outros ataques
 */

/**
 * Sanitiza string HTML (remove todas as tags)
 */
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    // Remove todas as tags HTML
    return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitiza string de texto (remove HTML)
 */
function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    // Remove HTML tags
    return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitiza email
 */
function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
        return '';
    }
    return email.toLowerCase().trim();
}

/**
 * Sanitiza URL
 */
function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }
    // Remove espaços e caracteres perigosos
    return url.trim().replace(/[\s<>'"]/g, '');
}

/**
 * Sanitiza objeto removendo propriedades perigosas
 */
function sanitizeObject(obj, allowedKeys = []) {
    if (!obj || typeof obj !== 'object') {
        return {};
    }

    const sanitized = {};
    const keys = allowedKeys.length > 0 ? allowedKeys : Object.keys(obj);

    keys.forEach(key => {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                sanitized[key] = sanitizeText(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    });

    return sanitized;
}

/**
 * Middleware para sanitizar body da requisição
 */
function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        // Sanitizar strings no body
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Preservar emails e URLs como estão (já serão validados separadamente)
                if (key.toLowerCase().includes('email')) {
                    req.body[key] = sanitizeEmail(req.body[key]);
                } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
                    req.body[key] = sanitizeUrl(req.body[key]);
                } else {
                    req.body[key] = sanitizeText(req.body[key]);
                }
            }
        });
    }
    next();
}

module.exports = {
    sanitizeHtml,
    sanitizeText,
    sanitizeEmail,
    sanitizeUrl,
    sanitizeObject,
    sanitizeBody
};

