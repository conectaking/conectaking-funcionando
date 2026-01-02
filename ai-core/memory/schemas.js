/**
 * SCHEMAS DE MEMÓRIA
 * 
 * Define os schemas e estruturas de dados para o sistema de memória
 */

/**
 * Schema para conhecimento do produto
 */
const conhecimentoProdutoSchema = {
    title: String,
    content: String,
    keywords: Array,
    metadata: {
        category: String,
        feature: String,
        version: String
    }
};

/**
 * Schema para dúvidas frequentes
 */
const duvidaFrequenteSchema = {
    question: String,
    answer: String,
    keywords: Array,
    metadata: {
        question: String,
        variations: Array,
        category: String
    }
};

/**
 * Schema para estratégias validadas
 */
const estrategiaValidadaSchema = {
    title: String,
    content: String,
    keywords: Array,
    metadata: {
        results: Object,
        validation_date: String,
        success_rate: Number
    }
};

/**
 * Schema para copies de alta conversão
 */
const copyAltaConversaoSchema = {
    title: String,
    copy: String,
    keywords: Array,
    metadata: {
        conversion_rate: Number,
        platform: String,
        context: Object
    }
};

/**
 * Schema para padrões de venda
 */
const padraoVendaSchema = {
    title: String,
    content: String,
    keywords: Array,
    metadata: {
        success_rate: Number,
        context: Object,
        frequency: Number
    }
};

/**
 * Schema para erros do sistema
 */
const erroSistemaSchema = {
    title: String,
    description: String,
    keywords: Array,
    metadata: {
        error_type: String,
        solution: String,
        frequency: Number
    }
};

/**
 * Schema para soluções confirmadas
 */
const solucaoConfirmadaSchema = {
    title: String,
    solution: String,
    keywords: Array,
    metadata: {
        problem: String,
        confirmation_count: Number
    }
};

/**
 * Schema para aprendizados administrativos
 */
const aprendizadoAdminSchema = {
    title: String,
    content: String,
    keywords: Array,
    metadata: {
        admin_id: Number,
        training_type: String,
        priority_override: Boolean
    }
};

module.exports = {
    conhecimentoProdutoSchema,
    duvidaFrequenteSchema,
    estrategiaValidadaSchema,
    copyAltaConversaoSchema,
    padraoVendaSchema,
    erroSistemaSchema,
    solucaoConfirmadaSchema,
    aprendizadoAdminSchema
};

