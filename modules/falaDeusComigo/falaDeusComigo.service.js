const repo = require('./falaDeusComigo.repository');
const logger = require('../../utils/logger');

async function getConfig(profileItemId, userId) {
    const owned = await repo.ensureOwnership(profileItemId, userId);
    if (!owned) return null;
    const item = await repo.findByProfileItemId(profileItemId);
    return item ? { profile_item_id: profileItemId, exists: true } : { profile_item_id: profileItemId, exists: false };
}

async function listMensagens(profileItemId, userId) {
    const owned = await repo.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Acesso negado a este módulo.');
    return repo.listMensagens(profileItemId);
}

async function createMensagem(profileItemId, userId, data) {
    const owned = await repo.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Acesso negado a este módulo.');
    if (!data.mensagem || String(data.mensagem).trim() === '') throw new Error('O campo mensagem é obrigatório.');
    return repo.createMensagem(profileItemId, {
        versiculo_ref: data.versiculo_ref,
        versiculo_texto: data.versiculo_texto,
        resumo: data.resumo,
        mensagem: data.mensagem,
        attachment_url: data.attachment_url,
        display_order: data.display_order
    });
}

async function updateMensagem(mensagemId, profileItemId, userId, data) {
    const owned = await repo.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Acesso negado a este módulo.');
    const existing = await repo.getMensagemById(mensagemId, profileItemId);
    if (!existing) throw new Error('Mensagem não encontrada.');
    return repo.updateMensagem(mensagemId, profileItemId, data);
}

async function deleteMensagem(mensagemId, profileItemId, userId) {
    const owned = await repo.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Acesso negado a este módulo.');
    const ok = await repo.deleteMensagem(mensagemId, profileItemId);
    if (!ok) throw new Error('Mensagem não encontrada.');
    return { deleted: true };
}

/** Público: uma mensagem aleatória para o profile_item (usado na página por slug) */
async function getRandomMessageByProfileItemId(profileItemId) {
    return repo.getRandomMensagem(profileItemId);
}

module.exports = {
    getConfig,
    listMensagens,
    createMensagem,
    updateMensagem,
    deleteMensagem,
    getRandomMessageByProfileItemId
};
