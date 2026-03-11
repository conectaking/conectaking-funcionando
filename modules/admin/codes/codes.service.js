/**
 * Service: regras de negócio de códigos de registro admin.
 */
const { nanoid } = require('nanoid');
const repository = require('./codes.repository');

function parseExpiresAt(expiresAt) {
    if (expiresAt == null || expiresAt === '') return null;
    const d = new Date(expiresAt);
    return isNaN(d.getTime()) ? undefined : d; // undefined = invalid
}

async function listCodes(filter) {
    return repository.listCodes(filter || null);
}

async function generateManual(customCode, expiresAt) {
    if (!customCode || customCode.length > 12 || customCode.includes(' ')) {
        return { error: 'Código personalizado inválido, muito longo ou contém espaços.', status: 400 };
    }
    const expiresAtValue = parseExpiresAt(expiresAt);
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' && expiresAtValue === undefined) {
        return { error: 'Data de expiração inválida.', status: 400 };
    }
    await repository.insertCode(customCode, expiresAtValue ?? null);
    return { codes: [customCode], message: `Código '${customCode}' criado com sucesso!` };
}

async function generateCode(expiresAt) {
    const newCode = nanoid(8);
    const expiresAtValue = parseExpiresAt(expiresAt);
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' && expiresAtValue === undefined) {
        return { error: 'Data de expiração inválida.', status: 400 };
    }
    await repository.insertCode(newCode, expiresAtValue ?? null);
    return { code: newCode, message: 'Novo código gerado com sucesso!' };
}

async function generateBatch(prefix, count, expiresAt) {
    if (!prefix || !count || count < 1 || count > 100) {
        return { error: 'Prefixo e quantidade (1-100) são obrigatórios.', status: 400 };
    }
    const expiresAtValue = parseExpiresAt(expiresAt);
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' && expiresAtValue === undefined) {
        return { error: 'Data de expiração inválida.', status: 400 };
    }
    const codes = [];
    for (let i = 0; i < count; i++) {
        codes.push(`${prefix}${nanoid(8)}`);
    }
    for (const code of codes) {
        await repository.insertCode(code, expiresAtValue ?? null);
    }
    return { codes, message: `${count} códigos gerados com sucesso!` };
}

async function updateCode(code, expiresAt) {
    let expiresAtValue = null;
    if (expiresAt !== undefined) {
        if (expiresAt === null || expiresAt === '') {
            expiresAtValue = null;
        } else {
            const d = parseExpiresAt(expiresAt);
            if (d === undefined) return { error: 'Data de expiração inválida.', status: 400 };
            expiresAtValue = d;
        }
    }
    const updated = await repository.updateCodeExpires(code, expiresAtValue);
    if (!updated) return { error: 'Código não encontrado.', status: 404 };
    return { code: updated, message: 'Código atualizado com sucesso!' };
}

async function getAutoDeleteConfig() {
    return repository.getAutoDeleteConfig();
}

async function saveAutoDeleteConfig(days_after_expiration, is_active) {
    if (!days_after_expiration || days_after_expiration < 1) {
        return { error: 'days_after_expiration deve ser maior que 0.', status: 400 };
    }
    const isActive = is_active !== undefined ? is_active : true;
    const config = await repository.saveAutoDeleteConfig(days_after_expiration, isActive);
    return { config, message: 'Configuração salva com sucesso!' };
}

async function executeAutoDelete() {
    const configs = await repository.getActiveAutoDeleteConfigs();
    if (configs.length === 0) {
        return { message: 'Nenhuma configuração ativa encontrada.', deleted: 0 };
    }
    let totalDeleted = 0;
    for (const config of configs) {
        const days = config.days_after_expiration;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        totalDeleted += await repository.deleteExpiredCodes(cutoffDate);
    }
    return {
        message: `Exclusão automática executada. ${totalDeleted} código(s) excluído(s).`,
        deleted: totalDeleted,
    };
}

async function deleteCode(code) {
    const deleted = await repository.deleteCode(code);
    if (!deleted) return { error: 'Código não encontrado.', status: 404 };
    return { message: 'Código de registro deletado com sucesso.' };
}

module.exports = {
    listCodes,
    generateManual,
    generateCode,
    generateBatch,
    updateCode,
    getAutoDeleteConfig,
    saveAutoDeleteConfig,
    executeAutoDelete,
    deleteCode,
};
