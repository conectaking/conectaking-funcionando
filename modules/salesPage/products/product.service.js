const repository = require('./product.repository');
const validators = require('./product.validators');
const TYPES = require('./product.types');
const salesPageService = require('../salesPage.service');
const salesPageRepository = require('../salesPage.repository');
const logger = require('../../../utils/logger');

class ProductService {
    /**
     * Criar produto
     */
    async create(data, userId) {
        // Validar dados
        const validation = validators.validateProductData(data, false);
        if (!validation.isValid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Verificar ownership da página
        const salesPage = await salesPageService.findById(data.sales_page_id);
        const ownsPage = await salesPageRepository.checkOwnership(data.sales_page_id, userId);
        if (!ownsPage) {
            throw new Error('Você não tem permissão para adicionar produtos nesta página');
        }

        // Verificar limite de produtos
        await salesPageService.checkProductLimit(data.sales_page_id);

        // Sanitizar dados
        const sanitized = validators.sanitize(data);

        // Processar variations se for objeto
        if (sanitized.variations && typeof sanitized.variations === 'string') {
            try {
                sanitized.variations = JSON.parse(sanitized.variations);
            } catch (e) {
                sanitized.variations = null;
            }
        }

        // Criar produto
        const product = await repository.create(sanitized);
        logger.info(`Produto criado: ${product.id} na página ${data.sales_page_id}`);
        
        return product;
    }

    /**
     * Buscar produto por ID
     */
    async findById(id) {
        const product = await repository.findById(id);
        if (!product) {
            throw new Error('Produto não encontrado');
        }
        return product;
    }

    /**
     * Listar produtos de uma página
     */
    async findBySalesPageId(salesPageId, includeArchived = false) {
        return await repository.findBySalesPageId(salesPageId, includeArchived);
    }

    /**
     * Atualizar produto
     */
    async update(id, userId, data) {
        // Verificar ownership
        const ownsProduct = await repository.checkOwnership(id, userId);
        if (!ownsProduct) {
            throw new Error('Você não tem permissão para editar este produto');
        }

        // Buscar produto atual
        const currentProduct = await repository.findById(id);
        if (!currentProduct) {
            throw new Error('Produto não encontrado');
        }

        // Verificar se está arquivado
        if (currentProduct.status === TYPES.STATUS.ARCHIVED) {
            throw new Error('Não é possível editar um produto arquivado');
        }

        // Validar dados
        const validation = validators.validateProductData(data, true);
        if (!validation.isValid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Sanitizar dados
        const sanitized = validators.sanitize(data);

        // Processar variations
        if (sanitized.variations && typeof sanitized.variations === 'string') {
            try {
                sanitized.variations = JSON.parse(sanitized.variations);
            } catch (e) {
                sanitized.variations = null;
            }
        }

        // Atualizar produto
        const updated = await repository.update(id, sanitized);
        logger.info(`Produto atualizado: ${id}`);
        
        return updated;
    }

    /**
     * Atualizar status do produto
     */
    async updateStatus(id, userId, status) {
        // Verificar ownership
        const ownsProduct = await repository.checkOwnership(id, userId);
        if (!ownsProduct) {
            throw new Error('Você não tem permissão para alterar o status deste produto');
        }

        // Buscar produto
        const product = await repository.findById(id);
        if (!product) {
            throw new Error('Produto não encontrado');
        }

        // Validar transição
        const validation = validators.validateStatusTransition(product.status, status);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Atualizar status
        const updated = await repository.updateStatus(id, status);
        logger.info(`Status do produto ${id} alterado para ${status}`);
        
        return updated;
    }

    /**
     * Deletar produto
     */
    async delete(id, userId) {
        // Verificar ownership
        const ownsProduct = await repository.checkOwnership(id, userId);
        if (!ownsProduct) {
            throw new Error('Você não tem permissão para deletar este produto');
        }

        // Deletar
        await repository.delete(id);
        logger.info(`Produto deletado: ${id}`);
        
        return true;
    }

    /**
     * Reordenar produtos
     */
    async reorder(salesPageId, userId, productOrders) {
        // Verificar ownership da página
        const ownsPage = await salesPageRepository.checkOwnership(salesPageId, userId);
        if (!ownsPage) {
            throw new Error('Você não tem permissão para reordenar produtos desta página');
        }

        // Validar dados
        if (!Array.isArray(productOrders) || productOrders.length === 0) {
            throw new Error('productOrders deve ser um array não vazio');
        }

        // Reordenar
        await repository.reorder(salesPageId, productOrders);
        logger.info(`Produtos reordenados na página ${salesPageId}`);
        
        return true;
    }
}

module.exports = new ProductService();

