const repository = require('./location.repository');
const logger = require('../../utils/logger');

async function getConfig(profileItemId, userId) {
    const ok = await repository.ensureOwnership(profileItemId, userId);
    if (!ok) return null;
    return repository.findByProfileItemId(profileItemId);
}

async function saveConfig(profileItemId, userId, data) {
    const ok = await repository.ensureOwnership(profileItemId, userId);
    if (!ok) throw new Error('Acesso negado a este item.');
    let row = await repository.findByProfileItemId(profileItemId);
    if (!row) {
        await repository.create(profileItemId);
        row = await repository.findByProfileItemId(profileItemId);
    }
    const payload = {};
    if (data.address !== undefined) payload.address = data.address;
    if (data.address_formatted !== undefined) payload.address_formatted = data.address_formatted;
    if (data.latitude !== undefined) payload.latitude = data.latitude == null ? null : Number(data.latitude);
    if (data.longitude !== undefined) payload.longitude = data.longitude == null ? null : Number(data.longitude);
    if (data.place_name !== undefined) payload.place_name = data.place_name;
    const updated = await repository.update(profileItemId, payload);
    return updated || row;
}

module.exports = {
    getConfig,
    saveConfig
};
