const express = require('express');
const empresaEquipeRoutes = require('../modules/empresa/equipe/equipe.routes');
const empresaCodigosRoutes = require('../modules/empresa/codigosConvite/codigosConvite.routes');
const empresaPersonalizacaoRoutes = require('../modules/empresa/personalizacao/personalizacao.routes');

const router = express.Router();

router.use(empresaEquipeRoutes);
router.use(empresaCodigosRoutes);
router.use(empresaPersonalizacaoRoutes);

module.exports = router;
