
const express = require('express');
const axios = require('axios');
const db = require('../db');

const router = express.Router();

router.get('/pdf/:itemId', async (req, res) => {
    const { itemId } = req.params;

    try {
        const itemRes = await db.query('SELECT pdf_url, title FROM profile_items WHERE id = $1', [itemId]);

        if (itemRes.rows.length === 0) {
            return res.status(404).send('Arquivo não encontrado.');
        }

        const { pdf_url, title } = itemRes.rows[0];

        const response = await axios({
            method: 'GET',
            url: pdf_url,
            responseType: 'stream'
        });

        const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : 'documento.pdf';
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/pdf');

        response.data.pipe(res);

    } catch (error) {
        console.error("Erro ao processar download do PDF:", error);
        res.status(500).send('Não foi possível baixar o arquivo.');
    }
});

module.exports = router;