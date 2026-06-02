const core = require('../../shared/prosperidade-parse');

function bodyToDto(data) {
    return {
        titulo: data.titulo,
        decreto_entrada: data.decreto_entrada,
        fundamento_sagrado: data.fundamento_sagrado,
        diagnostico_escassez: data.diagnostico_escassez,
        estrada_com_king: data.estrada_com_king,
        diretriz_ilustracao: data.diretriz_ilustracao,
        mentalidade_travada: data.mentalidade_travada,
        nova_mentalidade: data.nova_mentalidade,
        exercicio_fixacao: data.exercicio_fixacao,
        ie_chave: data.ie_chave,
        treino_negocios: data.treino_negocios,
        treino_altar: data.treino_altar,
        sentenca_ativacao: data.sentenca_ativacao,
        proximo_episodio: data.proximo_episodio,
        proverbs_ref: data.proverbs_ref,
        storytelling_fase: data.storytelling_fase,
        content_source: data.content_source
    };
}

module.exports = {
    parsePastedActivation: core.parsePastedActivation,
    parseFrasesImpacto: core.parseFrasesImpacto,
    bodyToDto
};
