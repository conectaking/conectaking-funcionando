const express = require('express');
const { nanoid } = require('nanoid'); 
const db = require('../db');

const router = express.Router();

router.post('/new-key', async (req, res) => {
    const newKey = nanoid(8); 

    const client = await db.pool.connect();
    try {
        await client.query('INSERT INTO registration_codes (code) VALUES ($1)', [newKey]);
        
        console.log(`🔑 Nova chave curta gerada: ${newKey}`);
        res.status(201).json({ success: true, newKey: newKey });
    } catch (error) {
        console.error("Erro ao gerar nova chave:", error);
        res.status(500).json({ success: false, message: 'Erro ao gerar chave no banco de dados.' });
    } finally {
        client.release();
    }
});

module.exports = router;