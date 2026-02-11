/**
 * Rotas públicas do módulo Meu site
 * GET / (com Host = domínio personalizado) - Site no domínio comprado (ex: adrianoking.com)
 * POST /site/arquetipo e POST /site/orcamento (com Host = domínio personalizado)
 * GET /:slug/site - Página do site pelo slug do perfil
 * POST /:slug/site/arquetipo - Enviar lead do teste de arquétipo (público)
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const sitesService = require('../modules/sites/sites.service');
const orcamentosService = require('../modules/orcamentos/orcamentos.service');
const logger = require('../utils/logger');

function normalizeHost(host) {
    if (!host || typeof host !== 'string') return '';
    return host.replace(/^www\./, '').trim().toLowerCase().split(':')[0];
}

// GET / — quando o Host é um domínio personalizado (ex: adrianoking.com)
router.get('/', asyncHandler(async (req, res, next) => {
    const host = normalizeHost(req.get('host'));
    if (!host) return next();
    const site = await sitesService.getPublicByCustomDomain(host);
    if (!site) return next();
    if (site.em_manutencao) {
        return res.status(503).send(`
            <!DOCTYPE html>
            <html><head><meta charset="utf-8"><title>Em manutenção</title></head>
            <body style="font-family:sans-serif;text-align:center;padding:3rem;">
                <h1>Site em manutenção</h1>
                <p>Voltamos em breve.</p>
            </body></html>
        `);
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.render('sitePublic', {
        site,
        slug: '',
        formBasePath: '',
        baseUrl,
        API_URL: process.env.FRONTEND_URL || baseUrl
    });
}));

// POST /site/arquetipo — domínio personalizado (identifica pelo Host)
router.post('/site/arquetipo', asyncHandler(async (req, res, next) => {
    const host = normalizeHost(req.get('host'));
    if (!host) return next();
    try {
        const lead = await sitesService.submitArquetipoLeadByHost(host, req.body || {});
        return res.status(201).json({ success: true, message: 'Recebemos seus dados. Em breve você receberá seu resultado.', id: lead.id });
    } catch (e) {
        if (e.message === 'Site não encontrado.' || e.message === 'Site em manutenção.') return next();
        logger.error('publicSite arquetipo (custom domain):', e);
        return res.status(400).json({ success: false, message: e.message || 'Erro ao enviar.' });
    }
}));

// POST /site/orcamento — domínio personalizado (identifica pelo Host)
router.post('/site/orcamento', asyncHandler(async (req, res, next) => {
    const host = normalizeHost(req.get('host'));
    if (!host) return next();
    try {
        const lead = await orcamentosService.submitByHost(host, req.body || {});
        return res.status(201).json({ success: true, message: 'Recebemos seu pedido. Em breve entraremos em contato com o orçamento.', id: lead.id });
    } catch (e) {
        if (e.message === 'Site não encontrado.' || e.message === 'Site em manutenção.') return next();
        logger.error('publicSite orcamento (custom domain):', e);
        return res.status(400).json({ success: false, message: e.message || 'Erro ao enviar.' });
    }
}));

router.get('/:slug/site', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    try {
        const site = await sitesService.getPublicBySlug(slug);
        if (!site) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"><title>Site não encontrado</title></head>
                <body style="font-family:sans-serif;text-align:center;padding:3rem;">
                    <h1>Site não encontrado</h1>
                    <p>O link pode estar incorreto ou o site foi desativado.</p>
                </body></html>
            `);
        }
        if (site.em_manutencao) {
            return res.status(503).send(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"><title>Em manutenção</title></head>
                <body style="font-family:sans-serif;text-align:center;padding:3rem;">
                    <h1>Site em manutenção</h1>
                    <p>Voltamos em breve.</p>
                </body></html>
            `);
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.render('sitePublic', {
            site,
            slug,
            formBasePath: '/' + slug,
            baseUrl,
            API_URL: process.env.FRONTEND_URL || baseUrl
        });
    } catch (e) {
        logger.error('publicSite:', e);
        res.status(500).send('<h1>Erro ao carregar site</h1>');
    }
}));

router.post('/:slug/site/arquetipo', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const body = req.body || {};
    try {
        const lead = await sitesService.submitArquetipoLead(slug, {
            nome: body.nome,
            email: body.email,
            whatsapp: body.whatsapp,
            instagram: body.instagram,
            arquetipo_resultado: body.arquetipo_resultado,
            arquetipo_scores: body.arquetipo_scores
        });
        return res.status(201).json({ success: true, message: 'Recebemos seus dados. Em breve você receberá seu resultado.', id: lead.id });
    } catch (e) {
        logger.error('publicSite arquetipo:', e);
        return res.status(400).json({ success: false, message: e.message || 'Erro ao enviar.' });
    }
}));

router.post('/:slug/site/orcamento', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const body = req.body || {};
    try {
        const lead = await orcamentosService.submitBySlug(slug, {
            nome: body.nome,
            email: body.email,
            whatsapp: body.whatsapp,
            profissao: body.profissao,
            respostas: body.respostas || body
        });
        return res.status(201).json({ success: true, message: 'Recebemos seu pedido. Em breve entraremos em contato com o orçamento.', id: lead.id });
    } catch (e) {
        logger.error('publicSite orcamento:', e);
        return res.status(400).json({ success: false, message: e.message || 'Erro ao enviar.' });
    }
}));

module.exports = router;
