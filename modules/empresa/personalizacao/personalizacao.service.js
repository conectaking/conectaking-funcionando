/**
 * Service: personalização da marca (logo da empresa).
 */
const repository = require('./personalizacao.repository');

async function saveBranding(userId, body) {
    const logoUrl = (body.logoUrl && String(body.logoUrl).trim()) || null;
    const logoSize = Math.min(420, Math.max(20, parseInt(body.logoSize, 10) || 60));
    const logoLink = (body.logoLink && String(body.logoLink).trim()) || null;
    await repository.updateBranding(userId, {
        logoUrl,
        logoSize,
        logoLink,
    });
    return {
        message: logoUrl ? 'Personalização da marca salva com sucesso!' : 'Logo da empresa removido.',
    };
}

module.exports = {
    saveBranding,
};
