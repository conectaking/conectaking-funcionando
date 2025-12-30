const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting para IA (evitar abuso)
const iaLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // 10 requisições por minuto
    message: 'Muitas requisições. Aguarde um momento antes de tentar novamente.'
});

// POST /api/ia-king/chat - Enviar mensagem para a IA
router.post('/chat', protectUser, iaLimiter, asyncHandler(async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message || !message.trim()) {
        return res.status(400).json({ 
            message: 'Mensagem é obrigatória.' 
        });
    }
    
    try {
        // TODO: Implementar integração com IA baseada no prompt que será fornecido
        // Por enquanto, retorna uma resposta básica
        
        // Aqui será implementada a lógica da IA quando o prompt for fornecido
        const response = `Olá! Sou a IA King. Recebi sua mensagem: "${message}". 
        
Aguarde enquanto implemento a inteligência artificial completa baseada no prompt que será fornecido.`;

        res.json({
            response: response,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao processar mensagem da IA:', error);
        throw error;
    }
}));

module.exports = router;

