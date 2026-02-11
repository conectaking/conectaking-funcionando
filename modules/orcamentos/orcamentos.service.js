const orcamentosRepository = require('./orcamentos.repository');
const sitesRepository = require('../sites/sites.repository');
const logger = require('../../utils/logger');

/**
 * Calcula ticket (low/medium/high) e textos a partir das respostas do formulário.
 * Respostas esperadas: faixa_investimento, objetivo_fotos, quando_precisa, decisao_sozinho, etc.
 */
function computeTicket(respostas) {
    let score = 0;
    const r = respostas || {};
    if (r.faixa_investimento === 'acima' || r.faixa_investimento === 'alto') score += 3;
    else if (r.faixa_investimento === 'medio') score += 2;
    else if (r.faixa_investimento === 'baixo') score += 0;
    else score += 1;
    if (['posicionamento', 'marca_pessoal', 'linkedin', 'corporativo'].includes(r.objetivo_fotos)) score += 2;
    if (r.quando_precisa === 'urgente') score += 1;
    if (r.decisao_sozinho === true || r.decisao_sozinho === 'sim') score += 1;
    let ticket = 'medium';
    let reason = '';
    let recommendation = '';
    if (score >= 5) {
        ticket = 'high';
        reason = 'Faixa de investimento alta, objetivo de posicionamento/marca e urgência indicam alto potencial.';
        recommendation = 'Recomendação: cobrar no topo da sua tabela.';
    } else if (score <= 2) {
        ticket = 'low';
        reason = 'Investimento limitado ou indefinido, menor urgência.';
        recommendation = 'Recomendação: cobrar acessível ou oferecer pacote entry-level.';
    } else {
        reason = 'Perfil intermediário: orçamento e necessidade definidos.';
        recommendation = 'Recomendação: cobrar na faixa média.';
    }
    return { ticket, ticket_reason: reason, recommendation };
}

async function submitBySlug(slug, data) {
    const site = await sitesRepository.findBySlug(slug);
    if (!site) throw new Error('Site não encontrado.');
    if (site.site_em_manutencao) throw new Error('Site em manutenção.');
    const respostas = data.respostas || {
        nome: data.nome,
        email: data.email,
        whatsapp: data.whatsapp,
        profissao: data.profissao,
        ...data
    };
    const { ticket, ticket_reason, recommendation } = computeTicket(respostas);
    return orcamentosRepository.insert(site.user_id, {
        nome: data.nome,
        email: data.email,
        whatsapp: data.whatsapp,
        profissao: data.profissao,
        respostas,
        ticket,
        ticket_reason,
        recommendation,
        status: 'novo'
    });
}

async function list(userId, filters) {
    return orcamentosRepository.listByUserId(userId, filters || {});
}

async function getOne(id, userId) {
    return orcamentosRepository.getById(id, userId);
}

async function updateStatus(id, userId, status) {
    return orcamentosRepository.updateStatus(id, userId, status);
}

module.exports = {
    submitBySlug,
    list,
    getOne,
    updateStatus,
    computeTicket
};
