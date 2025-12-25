const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();

router.post('/submit', async (req, res) => {
    const { nome, email, empresa, cargo, colaboradores, objetivo } = req.body;

    if (!nome || !email || !empresa || !cargo || !colaboradores) {
        return res.status(400).json({ success: false, message: 'Por favor, preencha todos os campos obrigatórios.' });
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Notificação Conecta King" <conectaking@gmail.com>`,
        to: process.env.EMAIL_TO_NOTIFY, 
        subject: `Novo Pedido de Reunião - ${empresa}`,
        html: `
            <h1>👑 Novo Lead Empresarial para Conecta King!</h1>
            <p>Uma nova empresa demonstrou interesse em uma demonstração. Aqui estão os detalhes:</p>
            <ul>
                <li><strong>Nome do Contato:</strong> ${nome}</li>
                <li><strong>E-mail:</strong> ${email}</li>
                <li><strong>Empresa:</strong> ${empresa}</li>
                <li><strong>Cargo:</strong> ${cargo}</li>
                <li><strong>Número de Colaboradores:</strong> ${colaboradores}</li>
                <li><strong>Principal Objetivo:</strong> ${objetivo || 'Não informado'}</li>
            </ul>
            <p><strong>Ação recomendada:</strong> Entre em contato o mais rápido possível!</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Solicitação enviada com sucesso! Entraremos em contato em breve.' });
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        res.status(500).json({ success: false, message: 'Houve um erro ao enviar sua solicitação. Tente novamente mais tarde.' });
    }
});

module.exports = router;