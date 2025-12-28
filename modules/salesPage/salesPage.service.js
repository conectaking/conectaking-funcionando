const repository = require('./salesPage.repository');
const validators = require('./salesPage.validators');
const TYPES = require('./salesPage.types');
const slugify = require('../../utils/slugify');
const crypto = require('crypto');
const logger = require('../../utils/logger');

class SalesPageService {
    /**
     * Criar nova página de vendas
     */
    async create(data) {
        // Garantir que whatsapp_number seja string vazia se não fornecido (NOT NULL no banco)
        if (!data.whatsapp_number && data.whatsapp_number !== '') {
            data.whatsapp_number = '';
        }
        
        // Validar dados
        const validation = validators.validateSalesPageData(data, false);
        if (!validation.isValid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Sanitizar dados
        const sanitized = validators.sanitize(data);

        // Garantir que whatsapp_number não seja null após sanitização (NOT NULL no banco)
        if (!sanitized.whatsapp_number && sanitized.whatsapp_number !== '') {
            sanitized.whatsapp_number = '';
        }

        // Gerar slug se não fornecido
        if (!sanitized.slug && sanitized.store_title) {
            sanitized.slug = await slugify.generateUnique(sanitized.store_title, (slug) => 
                repository.slugExists(slug)
            );
        }

        // Gerar preview_token se não fornecido
        if (!sanitized.preview_token) {
            sanitized.preview_token = crypto.randomBytes(32).toString('hex');
        }

        // Criar página
        const salesPage = await repository.create(sanitized);
        logger.info(`Página de vendas criada: ${salesPage.id}`);
        
        return salesPage;
    }

    /**
     * Buscar página por ID
     */
    async findById(id) {
        const salesPage = await repository.findById(id);
        if (!salesPage) {
            throw new Error('Página de vendas não encontrada');
        }
        return salesPage;
    }

    /**
     * Buscar página por profile_item_id (com verificação de ownership)
     */
    async findByProfileItemId(profileItemId, userId) {
        const salesPage = await repository.findByProfileItemId(profileItemId, userId);
        if (!salesPage) {
            return null;
        }
        return salesPage;
    }

    /**
     * Buscar página por slug (pública)
     */
    async findBySlug(slug) {
        const salesPage = await repository.findBySlug(slug);
        if (!salesPage) {
            throw new Error('Página de vendas não encontrada');
        }
        
        // Verificar se está publicada
        if (salesPage.status !== TYPES.STATUS.PUBLISHED) {
            throw new Error('Página não está publicada');
        }
        
        return salesPage;
    }

    /**
     * Buscar página por preview_token (preview seguro)
     */
    async findByPreviewToken(token) {
        const salesPage = await repository.findByPreviewToken(token);
        if (!salesPage) {
            throw new Error('Token de preview inválido');
        }
        return salesPage;
    }

    /**
     * Atualizar página
     */
    async update(id, userId, data) {
        // Verificar ownership
        const ownsPage = await repository.checkOwnership(id, userId);
        if (!ownsPage) {
            throw new Error('Você não tem permissão para editar esta página');
        }

        // Buscar página atual
        const currentPage = await repository.findById(id);
        if (!currentPage) {
            throw new Error('Página de vendas não encontrada');
        }

        // Se está apenas mudando status, validar transição primeiro
        if (Object.keys(data).length === 1 && data.status) {
            const validation = validators.validateStatusTransition(currentPage.status, data.status);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }
            // Se está desarquivando (ARCHIVED -> DRAFT), permitir
            if (currentPage.status === TYPES.STATUS.ARCHIVED && data.status === TYPES.STATUS.DRAFT) {
                // Permitir continuar com a atualização
            }
        } else {
            // Se está arquivada e tentando editar outros campos (não apenas status), bloquear
            if (currentPage.status === TYPES.STATUS.ARCHIVED) {
                throw new Error('Não é possível editar uma página arquivada. Altere o status para "Rascunho" primeiro para desarquivar.');
            }
            
            // Validar dados completos
            const validation = validators.validateSalesPageData(data, true);
            if (!validation.isValid) {
                throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
            }
        }

        // Sanitizar dados
        const sanitized = validators.sanitize(data);

        // Gerar slug se título mudou e slug não foi fornecido
        if (sanitized.store_title && sanitized.store_title !== currentPage.store_title && !sanitized.slug) {
            sanitized.slug = await slugify.generateUnique(sanitized.store_title, (slug) => 
                repository.slugExists(slug, id)
            );
        }

        // Atualizar página
        const updated = await repository.update(id, sanitized);
        logger.info(`Página de vendas atualizada: ${id}`);
        
        return updated;
    }

    /**
     * Publicar página
     */
    async publish(id, userId) {
        // Verificar ownership
        const ownsPage = await repository.checkOwnership(id, userId);
        if (!ownsPage) {
            throw new Error('Você não tem permissão para publicar esta página');
        }

        // Buscar página
        const salesPage = await repository.findById(id);
        if (!salesPage) {
            throw new Error('Página de vendas não encontrada');
        }

        // Validar transição de status
        const validation = validators.validateStatusTransition(salesPage.status, TYPES.STATUS.PUBLISHED);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Garantir que tem slug
        let slug = salesPage.slug;
        if (!slug) {
            slug = await slugify.generateUnique(salesPage.store_title || `loja-${id}`, (s) => 
                repository.slugExists(s, id)
            );
            await repository.update(id, { slug });
        }

        // Publicar
        const published = await repository.updateStatus(id, TYPES.STATUS.PUBLISHED, new Date());
        logger.info(`Página de vendas publicada: ${id}`);
        
        return published;
    }

    /**
     * Pausar página
     */
    async pause(id, userId) {
        // Verificar ownership
        const ownsPage = await repository.checkOwnership(id, userId);
        if (!ownsPage) {
            throw new Error('Você não tem permissão para pausar esta página');
        }

        // Buscar página
        const salesPage = await repository.findById(id);
        if (!salesPage) {
            throw new Error('Página de vendas não encontrada');
        }

        // Validar transição
        const validation = validators.validateStatusTransition(salesPage.status, TYPES.STATUS.PAUSED);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Pausar
        const paused = await repository.updateStatus(id, TYPES.STATUS.PAUSED);
        logger.info(`Página de vendas pausada: ${id}`);
        
        return paused;
    }

    /**
     * Arquivar página
     */
    async archive(id, userId) {
        // Verificar ownership
        const ownsPage = await repository.checkOwnership(id, userId);
        if (!ownsPage) {
            throw new Error('Você não tem permissão para arquivar esta página');
        }

        // Buscar página
        const salesPage = await repository.findById(id);
        if (!salesPage) {
            throw new Error('Página de vendas não encontrada');
        }

        // Validar transição
        const validation = validators.validateStatusTransition(salesPage.status, TYPES.STATUS.ARCHIVED);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Arquivar
        const archived = await repository.updateStatus(id, TYPES.STATUS.ARCHIVED);
        logger.info(`Página de vendas arquivada: ${id}`);
        
        return archived;
    }

    /**
     * Deletar página
     */
    async delete(id, userId) {
        // Verificar ownership
        const ownsPage = await repository.checkOwnership(id, userId);
        if (!ownsPage) {
            throw new Error('Você não tem permissão para deletar esta página');
        }

        // Deletar (cascade vai deletar produtos e eventos)
        await repository.delete(id);
        logger.info(`Página de vendas deletada: ${id}`);
        
        return true;
    }

    /**
     * Verificar limite de produtos
     */
    async checkProductLimit(salesPageId) {
        const count = await repository.countProducts(salesPageId);
        if (count >= TYPES.MAX_PRODUCTS_PER_PAGE) {
            throw new Error(`Limite de ${TYPES.MAX_PRODUCTS_PER_PAGE} produtos por página atingido`);
        }
        return count;
    }
}

module.exports = new SalesPageService();

