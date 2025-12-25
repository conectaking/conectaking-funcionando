/**
 * Sistema de cache em memória simples
 * Para produção, considere usar Redis
 */

const config = require('../config');
const logger = require('./logger');

class SimpleCache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    set(key, value, ttl = config.cache.ttl) {
        // Limpar timer existente se houver
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Armazenar valor
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttl * 1000)
        });

        // Configurar expiração
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl * 1000);

        this.timers.set(key, timer);

        // Limitar tamanho do cache
        if (this.cache.size > config.cache.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.delete(firstKey);
        }
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        // Verificar se expirou
        if (Date.now() > item.expiresAt) {
            this.delete(key);
            return null;
        }

        return item.value;
    }

    delete(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        this.cache.delete(key);
    }

    clear() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
        logger.info('Cache limpo');
    }

    size() {
        return this.cache.size;
    }
}

// Criar cache apenas se habilitado (verifica string 'true')
const cache = (config.cache.enabled === true || config.cache.enabled === 'true') 
    ? new SimpleCache() 
    : null;

module.exports = cache;
