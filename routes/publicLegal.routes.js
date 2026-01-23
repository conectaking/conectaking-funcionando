/**
 * Rotas públicas para páginas legais
 * Política de Privacidade e Termos de Serviço
 */

const express = require('express');
const router = express.Router();

/**
 * Política de Privacidade
 * GET /privacidade
 */
router.get('/privacidade', (req, res) => {
    res.render('privacidade', {
        title: 'Política de Privacidade - Conecta King',
        currentYear: new Date().getFullYear()
    });
});

/**
 * Termos de Serviço
 * GET /termos
 */
router.get('/termos', (req, res) => {
    res.render('termos', {
        title: 'Termos de Serviço - Conecta King',
        currentYear: new Date().getFullYear()
    });
});

module.exports = router;
