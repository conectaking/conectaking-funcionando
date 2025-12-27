/**
 * Utilitário para gerar slugs únicos
 */

/**
 * Gera um slug a partir de uma string
 */
function generateSlug(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
        .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
        .substring(0, 255); // Limita tamanho
}

/**
 * Gera um slug único verificando se já existe
 * @param {string} text - Texto para gerar slug
 * @param {Function} checkExists - Função que retorna true se slug existe
 * @returns {Promise<string>} - Slug único
 */
async function generateUnique(text, checkExists) {
    let baseSlug = generateSlug(text);
    if (!baseSlug) {
        baseSlug = 'item';
    }

    let slug = baseSlug;
    let counter = 1;
    const maxAttempts = 1000;

    while (await checkExists(slug) && counter < maxAttempts) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    if (counter >= maxAttempts) {
        // Fallback: usar timestamp
        slug = `${baseSlug}-${Date.now()}`;
    }

    return slug;
}

module.exports = {
    generateSlug,
    generateUnique
};

