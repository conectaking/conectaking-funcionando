const repository = require('./convite.repository');
const logger = require('../../utils/logger');

async function getConfig(profileItemId, userId) {
    const owned = await repository.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Sem permissão para este convite.');
    let item = await repository.findByProfileItemId(profileItemId);
    if (!item) {
        item = await repository.create(profileItemId);
    }
    if (item.galeria_fotos && typeof item.galeria_fotos !== 'object')
        item.galeria_fotos = typeof item.galeria_fotos === 'string' ? JSON.parse(item.galeria_fotos || '[]') : [];
    return item;
}

async function saveConfig(profileItemId, userId, data) {
    const owned = await repository.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Sem permissão para este convite.');
    let item = await repository.findByProfileItemId(profileItemId);
    if (!item) item = await repository.create(profileItemId);
    return await repository.update(profileItemId, data);
}

async function getPublicBySlug(slug, options = {}) {
    const item = await repository.findBySlug(slug);
    if (!item) return null;
    if (!item.is_active) return null;
    const previewToken = options.previewToken || null;
    if (item.preview_token) {
        if (previewToken !== item.preview_token) return null;
    }
    if (item.galeria_fotos && typeof item.galeria_fotos !== 'object')
        item.galeria_fotos = typeof item.galeria_fotos === 'string' ? JSON.parse(item.galeria_fotos || '[]') : [];
    return item;
}

async function recordView(conviteItemId) {
    return repository.incrementViewCount(conviteItemId);
}

async function getStats(profileItemId, userId) {
    const owned = await repository.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Sem permissão.');
    const item = await repository.findByProfileItemId(profileItemId);
    if (!item) return { view_count: 0, views_last_7_days: 0 };
    return repository.getStats(item.id);
}

async function getPreviewLink(profileItemId, userId) {
    const token = await repository.generatePreviewToken(profileItemId, userId);
    if (!token) return null;
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://conectaking.com.br';
    const slug = (await require('../../db').pool.query(
        'SELECT slug FROM profile_items WHERE id = $1',
        [profileItemId]
    )).rows[0]?.slug;
    if (!slug) return null;
    return `${baseUrl}/${slug}/convite?preview=${token}`;
}

module.exports = {
    getConfig,
    saveConfig,
    getPublicBySlug,
    recordView,
    getStats,
    getPreviewLink
};
