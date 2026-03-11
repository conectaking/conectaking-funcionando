const db = require('../../db');
const cartaoVirtualService = require('./cartaoVirtual.service');
const logger = require('../../utils/logger');

async function getPage(req, res) {
    const rawIdentifier = req.params.identifier;
    const identifier = String(rawIdentifier || '').trim();
    const identifierLower = identifier.toLowerCase();

    const reserved = ['privacidade', 'termos', 'recuperar-senha', 'resetar-senha', 'esqueci-senha', 'forgot'];
    if (!identifier || reserved.includes(identifierLower)) {
        return res.status(404).send('404 - Página não encontrada');
    }

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Last-Modified', new Date().toUTCString());
    res.set('ETag', `"${Date.now()}"`);

    let client;
    try {
        client = await db.pool.connect();
        const result = await cartaoVirtualService.getProfilePageData(client, identifier, req);

        if (result.type === 'notFound') {
            return res.status(404).send(result.message);
        }
        if (result.type === 'redirect') {
            return res.redirect(result.statusCode || 301, result.url);
        }
        if (result.type === 'inactive') {
            return res.render('inactive_profile');
        }
        if (result.type === 'render') {
            return res.render(result.view, result.data);
        }
        return res.status(404).send(result.message || 'Not found');
    } catch (error) {
        logger.error('❌ Erro ao carregar perfil público', {
            identifier,
            error: error.message,
            stack: error.stack,
            code: error.code
        });
        throw error;
    } finally {
        if (client) client.release();
    }
}

async function getApi(req, res) {
    const { identifier } = req.params;
    let client;
    try {
        client = await db.pool.connect();
        const result = await cartaoVirtualService.getProfileApi(client, identifier, req);
        if (result.type === 'notFound') {
            return res.status(404).json({ error: result.message || 'Perfil não encontrado' });
        }
        return res.json(result.data);
    } catch (error) {
        logger.error('Erro ao buscar perfil público via API:', error);
        return res.status(500).json({ error: 'Erro ao buscar perfil' });
    } finally {
        if (client) client.release();
    }
}

module.exports = { getPage, getApi };
