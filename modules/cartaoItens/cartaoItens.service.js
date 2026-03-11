/**
 * Service: itens do cartão (profile_items).
 */
const repo = require('./cartaoItens.repository');
const logger = require('../../utils/logger');

async function listItems(client, userId) {
    return repo.listByUserId(client, userId);
}

async function getItem(client, itemId, userId) {
    const itemIdNum = parseInt(itemId, 10);
    if (!itemIdNum || isNaN(itemIdNum)) {
        return { badRequest: true, error: 'ID do item inválido.' };
    }
    const checkExists = await repo.getByIdForCheck(client, itemIdNum);
    if (!checkExists) {
        return { notFound: true, error: 'Item não encontrado.' };
    }
    if (checkExists.user_id !== userId) {
        return { forbidden: true, error: 'Você não tem permissão para acessar este item.' };
    }
    const item = await repo.getById(client, itemIdNum, userId);
    if (!item) {
        return { notFound: true, error: 'Item não encontrado.' };
    }
    const responseData = { ...item, profile_id: userId };
    if (item.item_type === 'digital_form') {
        const formRow = await repo.getDigitalFormData(client, itemIdNum);
        responseData.digital_form_data = formRow || { form_fields: [] };
        if (responseData.digital_form_data.form_fields && typeof responseData.digital_form_data.form_fields === 'string') {
            try {
                responseData.digital_form_data.form_fields = JSON.parse(responseData.digital_form_data.form_fields);
            } catch (_) {
                responseData.digital_form_data.form_fields = [];
            }
        }
    }
    if (item.item_type === 'guest_list') {
        const glRow = await repo.getGuestListData(client, itemIdNum);
        responseData.guest_list_data = glRow || {};
    }
    return { success: true, data: responseData };
}

module.exports = {
    listItems,
    getItem
};
