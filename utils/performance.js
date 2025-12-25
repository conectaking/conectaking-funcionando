/**
 * Utilitários de performance e monitoramento
 */

const logger = require('./logger');

/**
 * Mede tempo de execução de uma função
 */
async function measureExecutionTime(fn, context = '') {
    const startTime = Date.now();
    let result;
    let error = null;

    try {
        result = await fn();
    } catch (err) {
        error = err;
        throw err;
    } finally {
        const duration = Date.now() - startTime;
        
        if (duration > 1000) {
            // Log apenas se demorar mais de 1 segundo
            logger.warn('Operação lenta detectada', {
                context,
                duration: `${duration}ms`,
                error: error?.message
            });
        } else {
            logger.debug('Tempo de execução', {
                context,
                duration: `${duration}ms`
            });
        }
    }

    return result;
}

/**
 * Wrapper para medir tempo de execução
 */
function withPerformanceMonitoring(fn, context) {
    return async (...args) => {
        return measureExecutionTime(() => fn(...args), context);
    };
}

/**
 * Cache de resultados de funções
 */
function memoize(fn, ttl = 60000) { // 1 minuto padrão
    const cache = new Map();

    return async (...args) => {
        const key = JSON.stringify(args);
        const cached = cache.get(key);

        if (cached && Date.now() < cached.expiresAt) {
            return cached.value;
        }

        const value = await fn(...args);
        cache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        });

        return value;
    };
}

/**
 * Retry com backoff exponencial
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                logger.debug(`Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms`, {
                    error: error.message
                });
            }
        }
    }

    throw lastError;
}

module.exports = {
    measureExecutionTime,
    withPerformanceMonitoring,
    memoize,
    retryWithBackoff
};

