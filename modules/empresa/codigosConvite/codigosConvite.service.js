/**
 * Service: códigos de convite da empresa (gerar automático, manual, listar).
 */
const db = require('../../../db');
const { nanoid } = require('nanoid');
const repository = require('./codigosConvite.repository');

async function listCodes(ownerId) {
    return repository.listCodesByOwner(ownerId);
}

async function generateCode(ownerId) {
    const maxInvites = await repository.getMaxTeamInvites(ownerId);
    if (maxInvites == null) return { error: 'Usuário não encontrado.', status: 404 };
    const codeCount = await repository.countCodesByOwner(ownerId);
    if (codeCount >= maxInvites) {
        return { error: `Limite de ${maxInvites} códigos de equipe atingido.`, status: 403 };
    }
    const newCode = nanoid(10).toUpperCase();
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await repository.insertTeamCode(client, newCode, ownerId);
        await client.query('COMMIT');
        return { code: newCode, message: 'Novo código de equipe gerado!' };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function generateManual(ownerId, customCode) {
    if (!customCode || customCode.length > 12 || customCode.includes(' ')) {
        return { error: 'Código personalizado inválido. Deve ter no máximo 12 caracteres e não conter espaços.', status: 400 };
    }
    const maxInvites = await repository.getMaxTeamInvites(ownerId);
    if (maxInvites == null) return { error: 'Usuário não encontrado.', status: 404 };
    const codeCount = await repository.countCodesByOwner(ownerId);
    if (codeCount >= maxInvites) {
        return { error: `Limite de ${maxInvites} códigos de equipe atingido. Não é possível criar um novo.`, status: 403 };
    }
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await repository.insertTeamCode(client, customCode, ownerId);
        await client.query('COMMIT');
        return { code: customCode, message: `Código '${customCode}' criado com sucesso!` };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    listCodes,
    generateCode,
    generateManual,
};
