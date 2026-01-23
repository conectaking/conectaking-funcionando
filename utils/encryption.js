/**
 * Utilitário de criptografia isolado
 * Funções puras para criptografar/descriptografar dados sensíveis
 * Usado por módulos Financeiro e Agenda para tokens OAuth e CPF
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Deriva chave de 32 bytes a partir de uma string
 */
function deriveKey(keyString) {
    return crypto.createHash('sha256').update(keyString).digest();
}

/**
 * Criptografa texto usando AES-256-GCM
 * @param {string} text - Texto a ser criptografado
 * @param {string} keyString - Chave de criptografia (será derivada para 32 bytes)
 * @returns {string} - String criptografada em formato base64 (iv:salt:tag:encrypted)
 */
function encrypt(text, keyString) {
    if (!text || typeof text !== 'string') {
        throw new Error('Texto inválido para criptografia');
    }
    
    if (!keyString || typeof keyString !== 'string') {
        throw new Error('Chave de criptografia inválida');
    }

    const key = deriveKey(keyString);
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Formato: iv:salt:tag:encrypted (todos em base64)
    return Buffer.concat([
        iv,
        salt,
        tag,
        Buffer.from(encrypted, 'base64')
    ]).toString('base64');
}

/**
 * Descriptografa texto usando AES-256-GCM
 * @param {string} encryptedData - Dados criptografados em formato base64
 * @param {string} keyString - Chave de criptografia (será derivada para 32 bytes)
 * @returns {string} - Texto descriptografado
 */
function decrypt(encryptedData, keyString) {
    if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Dados criptografados inválidos');
    }
    
    if (!keyString || typeof keyString !== 'string') {
        throw new Error('Chave de descriptografia inválida');
    }

    try {
        const key = deriveKey(keyString);
        const buffer = Buffer.from(encryptedData, 'base64');
        
        // Extrair componentes
        const iv = buffer.slice(0, IV_LENGTH);
        const salt = buffer.slice(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
        const tag = buffer.slice(IV_LENGTH + SALT_LENGTH, IV_LENGTH + SALT_LENGTH + TAG_LENGTH);
        const encrypted = buffer.slice(IV_LENGTH + SALT_LENGTH + TAG_LENGTH);
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        throw new Error('Falha ao descriptografar: ' + error.message);
    }
}

/**
 * Mascara CPF para exibição (***.***.***-**)
 * @param {string} cpf - CPF completo
 * @returns {string} - CPF mascarado
 */
function maskCPF(cpf) {
    if (!cpf || typeof cpf !== 'string') {
        return '***.***.***-**';
    }
    
    // Remove formatação
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) {
        return '***.***.***-**';
    }
    
    return `***.***.***-${cleanCPF.slice(-2)}`;
}

module.exports = {
    encrypt,
    decrypt,
    maskCPF
};
