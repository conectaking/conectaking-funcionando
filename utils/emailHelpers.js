/**
 * Helpers para e-mail (login, recuperação de senha, etc.)
 * Compatibilidade com contas antigas salvas sem pontos na parte local.
 */

/**
 * Retorna a versão do e-mail sem pontos na parte local (antes do @).
 * Contas antigas foram salvas sem pontos; login/recuperação precisam tentar as duas formas.
 * Ex.: user.name@gmail.com → username@gmail.com
 */
function emailLocalPartWithoutDots(email) {
    if (!email || typeof email !== 'string') return email;
    const i = email.indexOf('@');
    if (i === -1) return email;
    const local = email.slice(0, i).replace(/\./g, '');
    const domain = email.slice(i);
    return local + domain;
}

module.exports = {
    emailLocalPartWithoutDots
};
