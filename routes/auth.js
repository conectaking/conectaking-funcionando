const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../db');
const config = require('../config');
const logger = require('../utils/logger');
const { asyncHandler, ValidationError, UnauthorizedError } = require('../middleware/errorHandler');
const { validateRegistration, validateLogin, handleValidationErrors } = require('../utils/validation');
const { generateTokenPair, saveRefreshToken, validateRefreshToken, revokeRefreshToken } = require('../middleware/refreshToken');
const { emailLocalPartWithoutDots } = require('../utils/emailHelpers');

const router = express.Router();

router.post(
    '/register',
    validateRegistration,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { email, password, registrationCode } = req.body;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            const codeResult = await client.query('SELECT * FROM registration_codes WHERE code = $1 AND is_claimed = FALSE', [registrationCode]);
            if (codeResult.rows.length === 0) {
                throw new ValidationError('Código de registro inválido ou já utilizado.');
            }
            const codeData = codeResult.rows[0];

            const userExists = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userExists.rows.length > 0) {
                throw new ValidationError('Este e-mail já está em uso.');
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            
            let accountType = 'individual';
            let parentUserId = null;
            let expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            // Se o código foi gerado por uma empresa, ele se torna um membro de equipe
            if (codeData.generated_by_user_id) {
                accountType = 'team_member';
                parentUserId = codeData.generated_by_user_id;
                expiresAt = null;
            }
            
            const newUserResult = await client.query(
                `INSERT INTO users (id, email, password_hash, profile_slug, account_type, parent_user_id, subscription_status, subscription_expires_at) 
                 VALUES ($1, $2, $3, $1, $4, $5, $6, $7) RETURNING *`,
                [
                    registrationCode, 
                    email, 
                    passwordHash, 
                    accountType, 
                    parentUserId,
                    accountType === 'individual' ? 'pre_sale_trial' : null,
                    expiresAt
                ]
            );
            
            const newUser = newUserResult.rows[0];

            await client.query('INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2)', [newUser.id, newUser.email]);
            
            await client.query('UPDATE registration_codes SET is_claimed = TRUE, claimed_by_user_id = $1, claimed_at = NOW() WHERE code = $2', [newUser.id, registrationCode]);
            
            await client.query('COMMIT');
            
            logger.info('Novo usuário registrado', { userId: newUser.id, email: newUser.email });
            
            res.status(201).json({ 
                success: true,
                message: 'Usuário registrado com sucesso! Você ganhou 30 dias de acesso. Faça o login para continuar.' 
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    })
);

router.post(
    '/login',
    validateLogin,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        const loginStartTime = Date.now();
        
        try {
            // Usar client com timeout configurado (30 segundos)
            const client = await db.pool.connect();
            let user;
            try {
                // Configurar statement_timeout no client
                await client.query('SET statement_timeout = 30000'); // 30 segundos
                
                // Buscar por email. Contas antigas foram salvas sem pontos na parte local;
                // tentar também a versão sem pontos para compatibilidade.
                const queryPromise = (async () => {
                    let res = await client.query('SELECT * FROM users WHERE email = $1', [email]);
                    if (res.rows.length === 0) {
                        const alt = emailLocalPartWithoutDots(email);
                        if (alt !== email) {
                            res = await client.query('SELECT * FROM users WHERE email = $1', [alt]);
                        }
                    }
                    return res;
                })();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout: Query do banco demorou mais de 30 segundos')), 30000)
                );
                
                const userResult = await Promise.race([queryPromise, timeoutPromise]);
                
                if (userResult.rows.length === 0) {
                    logger.warn('Tentativa de login com email não encontrado', { email });
                    throw new UnauthorizedError('Credenciais inválidas.');
                }

                user = userResult.rows[0];
            } finally {
                client.release();
            }
            
            
            // Verificar se o usuário tem password_hash (caso de usuários antigos ou problemas)
            if (!user.password_hash) {
                logger.error('Usuário sem password_hash', { userId: user.id, email });
                throw new Error('Erro interno: conta sem senha cadastrada. Entre em contato com o suporte.');
            }
            
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                logger.warn('Tentativa de login com senha incorreta', { email });
                throw new UnauthorizedError('Credenciais inválidas.');
            }
            
            // Gerar par de tokens (access + refresh)
            const { accessToken, refreshToken } = generateTokenPair(user);
            
            // Salvar refresh token no banco (com timeout de 10 segundos - aumentado)
            try {
                const saveTokenPromise = saveRefreshToken(user.id, refreshToken);
                const tokenTimeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout ao salvar refresh token')), 10000)
                );
                await Promise.race([saveTokenPromise, tokenTimeoutPromise]);
            } catch (tokenError) {
                logger.error('Erro ao salvar refresh token (continuando mesmo assim)', { 
                    error: tokenError.message, 
                    userId: user.id 
                });
                // Continua mesmo se falhar ao salvar o refresh token
            }
            
            // Registrar atividade de login (com timeout de 5 segundos - aumentado, não bloqueia login)
            try {
                const activityLogger = require('../utils/activityLogger');
                const logPromise = activityLogger.logLogin(user.id, req);
                const logTimeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout ao registrar atividade')), 5000)
                );
                await Promise.race([logPromise, logTimeoutPromise]);
            } catch (activityError) {
                // Não queremos que erro no log de atividade quebre o login
                logger.warn('Erro ao registrar atividade de login', { error: activityError.message });
            }
            
            const loginDuration = Date.now() - loginStartTime;
            logger.info('Login bem-sucedido', { 
                userId: user.id, 
                email: user.email,
                duration: `${loginDuration}ms`
            });
            
            // Retorna os dados essenciais para o front-end
            res.json({ 
                success: true,
                message: 'Login bem-sucedido!', 
                token: accessToken,
                refreshToken: refreshToken,
                user: { 
                    id: user.id, 
                    email: user.email, 
                    name: user.name, 
                    isAdmin: user.is_admin,
                    accountType: user.account_type
                }
            });
        } catch (error) {
            const loginDuration = Date.now() - loginStartTime;
            
            // Se já é um erro tratado (ValidationError, UnauthorizedError), apenas propaga
            if (error instanceof ValidationError || error instanceof UnauthorizedError) {
                logger.warn('Login falhou', { 
                    email, 
                    error: error.message,
                    duration: `${loginDuration}ms`
                });
                throw error;
            }
            
            // Log do erro completo para debug
            logger.error('Erro interno no login', { 
                error: error.message, 
                stack: error.stack, 
                email,
                duration: `${loginDuration}ms`
            });
            
            // Propagar erro para o errorHandler
            throw error;
        }
    })
);

/**
 * Rota para refresh token
 */
router.post(
    '/refresh',
    body('refreshToken').notEmpty().withMessage('Refresh token é obrigatório.'),
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;

        // Validar refresh token
        const decoded = await validateRefreshToken(refreshToken);

        // Buscar usuário
        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (userResult.rows.length === 0) {
            throw new UnauthorizedError('Usuário não encontrado.');
        }

        const user = userResult.rows[0];

        // Gerar novos tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

        // Salvar novo refresh token (revoga o antigo)
        await revokeRefreshToken(refreshToken);
        await saveRefreshToken(user.id, newRefreshToken);

        logger.info('Tokens renovados', { userId: user.id });

        res.json({
            success: true,
            token: accessToken,
            refreshToken: newRefreshToken
        });
    })
);

/**
 * Rota para logout (revoga refresh token)
 */
router.post(
    '/logout',
    body('refreshToken').optional(),
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
            logger.info('Logout realizado', { refreshToken: refreshToken.substring(0, 10) + '...' });
        }

        res.json({
            success: true,
            message: 'Logout realizado com sucesso.'
        });
    })
);

module.exports = router;