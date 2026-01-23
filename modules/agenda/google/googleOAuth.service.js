/**
 * Serviço OAuth do Google (isolado para módulo Agenda)
 * Gerencia autenticação OAuth para dono e cliente
 */

const { google } = require('googleapis');
const { encrypt, decrypt } = require('../../../utils/encryption');
const logger = require('../../../utils/logger');
const config = require('../../../config');

class GoogleOAuthService {
    constructor() {
        this.clientId = process.env.GOOGLE_CLIENT_ID;
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        // URL do backend para o callback (deve ser acessível pelo Google)
        // IMPORTANTE: Sempre usar BACKEND_URL, nunca FRONTEND_URL para callbacks OAuth
        const backendUrl = process.env.BACKEND_URL || config.urls.api || 'https://conectaking-api.onrender.com';
        this.redirectUriOwner = process.env.GOOGLE_REDIRECT_URI_OWNER || `${backendUrl}/api/oauth/agenda/google/owner/callback`;
        this.redirectUriClient = process.env.GOOGLE_REDIRECT_URI_CLIENT || `${backendUrl}/api/oauth/agenda/google/client/callback`;
        this.encryptionKey = process.env.ENCRYPTION_KEY_FOR_TOKENS || process.env.JWT_SECRET;
        
        // Validar se as credenciais estão configuradas
        if (!this.clientId || !this.clientSecret) {
            logger.warn('⚠️ GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurados. A integração com Google Calendar não funcionará.');
        } else {
            // Log das URLs de callback para debug
            logger.info('🔗 Google OAuth URLs configuradas:');
            logger.info(`   Owner callback: ${this.redirectUriOwner}`);
            logger.info(`   Client callback: ${this.redirectUriClient}`);
        }
    }

    /**
     * Criar cliente OAuth2
     */
    createOAuth2Client(type = 'owner') {
        const redirectUri = type === 'owner' ? this.redirectUriOwner : this.redirectUriClient;
        
        return new google.auth.OAuth2(
            this.clientId,
            this.clientSecret,
            redirectUri
        );
    }

    /**
     * Gerar URL de autorização
     */
    getAuthUrl(type = 'owner', state = null) {
        // Validar se as credenciais estão configuradas
        if (!this.clientId || !this.clientSecret) {
            throw new Error('Google OAuth não configurado. Por favor, configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas variáveis de ambiente.');
        }
        
        const oauth2Client = this.createOAuth2Client(type);
        
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: state || undefined
        });

        return authUrl;
    }

    /**
     * Trocar código por tokens
     */
    async getTokensFromCode(code, type = 'owner') {
        const oauth2Client = this.createOAuth2Client(type);
        
        try {
            const { tokens } = await oauth2Client.getToken(code);
            return tokens;
        } catch (error) {
            logger.error('Erro ao obter tokens do Google:', error);
            throw new Error('Falha ao obter tokens de autenticação');
        }
    }

    /**
     * Criptografar tokens
     */
    encryptTokens(tokens) {
        if (!this.encryptionKey) {
            throw new Error('Chave de criptografia não configurada');
        }

        return {
            access_token_encrypted: tokens.access_token ? encrypt(tokens.access_token, this.encryptionKey) : null,
            refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token, this.encryptionKey) : null,
            token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        };
    }

    /**
     * Descriptografar tokens
     */
    decryptTokens(encryptedTokens) {
        if (!this.encryptionKey) {
            throw new Error('Chave de criptografia não configurada');
        }

        return {
            access_token: encryptedTokens.access_token_encrypted ? decrypt(encryptedTokens.access_token_encrypted, this.encryptionKey) : null,
            refresh_token: encryptedTokens.refresh_token_encrypted ? decrypt(encryptedTokens.refresh_token_encrypted, this.encryptionKey) : null,
            expiry_date: encryptedTokens.token_expiry ? encryptedTokens.token_expiry.getTime() : null
        };
    }

    /**
     * Criar cliente autenticado a partir de tokens descriptografados
     */
    createAuthenticatedClient(tokens) {
        const oauth2Client = this.createOAuth2Client();
        oauth2Client.setCredentials(tokens);
        return oauth2Client;
    }

    /**
     * Refresh token se necessário
     */
    async refreshTokenIfNeeded(oauth2Client) {
        try {
            const credentials = oauth2Client.credentials;
            
            if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
                const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
                oauth2Client.setCredentials(newCredentials);
                return newCredentials;
            }
            
            return credentials;
        } catch (error) {
            logger.error('Erro ao atualizar token:', error);
            throw error;
        }
    }
}

module.exports = new GoogleOAuthService();
