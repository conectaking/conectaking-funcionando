/**
 * Sistema de logging estruturado
 * Fornece logs formatados com níveis apropriados
 */

const config = require('../config');

const logLevels = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const currentLogLevel = config.isProduction ? logLevels.INFO : logLevels.DEBUG;

function formatLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...(data && { data })
    };
    
    if (config.isProduction) {
        return JSON.stringify(logEntry);
    } else {
        // Em desenvolvimento, formata mais legível
        let output = `[${timestamp}] ${level}: ${message}`;
        if (data) {
            // Formata data de forma mais legível
            try {
                output += '\n' + JSON.stringify(data, null, 2);
            } catch (e) {
                output += '\n' + String(data);
            }
        }
        return output;
    }
}

const logger = {
    error: (message, error = null) => {
        if (logLevels.ERROR <= currentLogLevel) {
            let errorData = null;
            if (error) {
                if (error instanceof Error) {
                    errorData = {
                        message: error.message,
                        stack: config.isProduction ? undefined : error.stack,
                        ...(error.code && { code: error.code })
                    };
                } else if (typeof error === 'object') {
                    errorData = error;
                } else {
                    errorData = { error: String(error) };
                }
            }
            console.error(formatLog('ERROR', message, errorData));
        }
    },
    
    warn: (message, data = null) => {
        if (logLevels.WARN <= currentLogLevel) {
            console.warn(formatLog('WARN', message, data));
        }
    },
    
    info: (message, data = null) => {
        if (logLevels.INFO <= currentLogLevel) {
            console.log(formatLog('INFO', message, data));
        }
    },
    
    debug: (message, data = null) => {
        if (logLevels.DEBUG <= currentLogLevel) {
            console.log(formatLog('DEBUG', message, data));
        }
    }
};

module.exports = logger;
