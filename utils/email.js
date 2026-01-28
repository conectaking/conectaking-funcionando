/**
 * Utilitários para envio de emails
 * Centraliza lógica de email
 */

const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('./logger');

let transporter = null;

/**
 * Inicializa transporter de email
 */
function initEmailTransporter() {
    if (transporter) {
        return transporter;
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('SMTP não configurado: defina SMTP_USER e SMTP_PASS para envio de e-mails (recuperação de senha, etc.).');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporter;
}

/**
 * Envia email
 */
async function sendEmail(to, subject, html, text = null, attachments = []) {
    try {
        const emailTransporter = initEmailTransporter();

        if (!emailTransporter) {
            logger.warn('Email transporter não configurado');
            return { success: false, error: 'Email não configurado' };
        }

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@conectaking.com.br',
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''), // Remove HTML se text não fornecido
            attachments: attachments.length > 0 ? attachments : undefined,
            encoding: 'UTF-8',
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Content-Transfer-Encoding': 'quoted-printable'
            }
        };

        const info = await emailTransporter.sendMail(mailOptions);
        
        logger.info('Email enviado', { to, subject, messageId: info.messageId, attachments: attachments.length });
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Erro ao enviar email', error);
        return { success: false, error: error.message };
    }
}

/**
 * Envia email de boas-vindas
 */
async function sendWelcomeEmail(userEmail, userName) {
    const subject = 'Bem-vindo ao Conecta King!';
    const html = `
        <h1>Bem-vindo ao Conecta King, ${userName}!</h1>
        <p>Obrigado por se cadastrar. Seu cartão de visita digital está pronto para ser personalizado.</p>
        <p>Acesse seu painel para começar a criar seu perfil único.</p>
        <p>Equipe Conecta King</p>
    `;

    return await sendEmail(userEmail, subject, html);
}

/**
 * Envia email de recuperação de senha
 */
async function sendPasswordResetEmail(userEmail, resetToken) {
    const baseUrl = config.urls.api || config.urls.frontend || 'https://conectaking-api.onrender.com';
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/resetar-senha?token=${encodeURIComponent(resetToken)}`;
    const subject = 'Recuperação de Senha - Conecta King';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ffd700;">CONECTA KING</h1>
                <p style="color: #999;">Recuperação de Senha</p>
            </div>
            
            <div style="background-color: #2a2a2a; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                <h2 style="color: #ffd700; margin-top: 0;">Olá!</h2>
                <p>Você solicitou a recuperação de senha para sua conta no Conecta King.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="display: inline-block; background-color: #ffd700; color: #1a1a1a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Resetar Senha
                    </a>
                </div>
                
                <p style="color: #999; font-size: 14px;">
                    Ou copie e cole este link no seu navegador:<br>
                    <a href="${resetUrl}" style="color: #ffd700; word-break: break-all;">${resetUrl}</a>
                </p>
            </div>
            
            <div style="text-align: center; padding: 20px; border-top: 1px solid #333;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    ⏱️ Este link expira em 1 hora.<br>
                    Se você não solicitou esta recuperação, ignore este email.
                </p>
            </div>
        </div>
    `;

    return await sendEmail(userEmail, subject, html);
}

/**
 * Envia email de notificação de expiração de assinatura
 */
async function sendSubscriptionExpiringEmail(userEmail, userName, daysLeft) {
    const subject = `Sua assinatura expira em ${daysLeft} dia(s)`;
    const html = `
        <h1>Olá, ${userName}!</h1>
        <p>Sua assinatura do Conecta King expira em ${daysLeft} dia(s).</p>
        <p>Renove agora para continuar aproveitando todos os recursos.</p>
        <p><a href="${config.urls.frontend}/conta.html">Renovar Assinatura</a></p>
    `;

    return await sendEmail(userEmail, subject, html);
}

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendSubscriptionExpiringEmail,
    initEmailTransporter
};

