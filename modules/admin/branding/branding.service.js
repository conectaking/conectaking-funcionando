/**
 * Service: regras de negócio da logomarca padrão (admin).
 * Read-only: não guarda estado.
 */
const repository = require('./branding.repository');

/**
 * Retorna dados da logomarca padrão
 */
async function getDefaultBranding() {
    return repository.getDefaultBranding();
}

/**
 * Valida e persiste logomarca padrão
 * @param {{ logo_url?: string, logo_size?: number, logo_link?: string }} input
 */
async function updateDefaultBranding(input) {
    const urlToSave = (input.logo_url != null && String(input.logo_url).trim() !== '')
        ? String(input.logo_url).trim()
        : null;
    const size = Math.min(420, Math.max(20, parseInt(input.logo_size, 10) || 60));
    const linkToSave = (input.logo_link != null && String(input.logo_link).trim() !== '')
        ? String(input.logo_link).trim()
        : null;

    await repository.updateDefaultBranding({
        logo_url: urlToSave,
        logo_size: size,
        logo_link: linkToSave,
    });
    return { message: 'Logomarca padrão atualizada. Contas que já definiram a própria logo (modo empresa) não são afetadas.' };
}

module.exports = {
    getDefaultBranding,
    updateDefaultBranding,
};
