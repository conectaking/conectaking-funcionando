/**
 * Desativado: inversão de imagem piorava leituras que já funcionavam.
 * Mantido só para compatibilidade — repassa o buffer sem alterar.
 */
async function preprocessarImagemExtrato(imageBuffer) {
    return imageBuffer;
}

module.exports = { preprocessarImagemExtrato };
