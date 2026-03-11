/**
 * Controller: compartilhar (vCard download).
 */
const service = require('./compartilhar.service');
const logger = require('../../utils/logger');

async function getVcard(req, res) {
    const { identifier } = req.params;
    try {
        const result = await service.getVcard(identifier);
        if (!result) {
            return res.status(404).send('Perfil não encontrado.');
        }
        const fileName = `${result.fullName.replace(/ /g, '_').toLowerCase()}.vcf`;
        res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.status(200).send(result.vCard);
    } catch (err) {
        logger.error('Erro ao gerar vCard', err, { identifier });
        return res.status(500).send('Erro ao gerar cartão de contato.');
    }
}

module.exports = {
    getVcard,
};
