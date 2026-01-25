/**
 * Rotas públicas para recuperação e redefinição de senha
 * GET /recuperar-senha, GET /resetar-senha
 */

const express = require('express');
const router = express.Router();

router.get('/recuperar-senha', (req, res) => {
    res.render('recuperarSenha', { title: 'Recuperar senha - Conecta King' });
});

router.get('/esqueci-senha', (req, res) => res.redirect(301, '/recuperar-senha'));
router.get('/forgot', (req, res) => res.redirect(301, '/recuperar-senha'));

router.get('/resetar-senha', (req, res) => {
    const token = (req.query.token || '').trim();
    res.render('resetarSenha', { token: token || undefined, title: 'Nova senha - Conecta King' });
});

module.exports = router;
