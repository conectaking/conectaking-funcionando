const path = require('path');
const fs = require('fs');
const mainService = require('./main.service');

const publicHtmlDir = path.join(__dirname, '../../public_html');

async function getRoot(req, res) {
    const host = (req.get('host') || '').replace(/^www\./, '').trim().toLowerCase().split(':')[0];
    const result = await mainService.getRootResponse(host, req);

    if (result.type === 'site_manutencao') {
        return res.status(503).send(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Em manutenção</title></head>' +
            '<body style="font-family:sans-serif;text-align:center;padding:3rem;"><h1>Site em manutenção</h1><p>Voltamos em breve.</p></body></html>'
        );
    }
    if (result.type === 'site_public') {
        return res.render('sitePublic', {
            site: result.site,
            slug: '',
            formBasePath: '',
            baseUrl: result.baseUrl,
            API_URL: process.env.FRONTEND_URL || result.baseUrl
        });
    }
    const indexPath = path.join(publicHtmlDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    return res.status(200).json({
        status: 'ok',
        service: 'Conecta King API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Servidor Conecta King está funcionando corretamente'
    });
}

module.exports = { getRoot };
