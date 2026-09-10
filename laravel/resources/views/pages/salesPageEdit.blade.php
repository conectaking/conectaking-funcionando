<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover">
    <title>Editar Página de Vendas - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
<link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <!-- Cache-bust CSS - v2025-01-31-04 --><!-- CSS CRÍTICO INLINE PARA MOBILE - Garantir scroll funcionando -->
    @vite(['resources/js/pages/salesPageEdit.js'])
</head>
<body class="sales-page-edit-page">
    <div class="dashboard-layout">
        <!-- Header Fixo -->
        <header class="sales-page-edit-header">
            <div class="header-content">
                <button class="btn-back" id="btn-back-to-dashboard">
                    <i class="fas fa-arrow-left"></i> Voltar ao Dashboard
                </button>
                <h1 class="page-title" id="page-title">Editar Página de Vendas</h1>
                <div class="header-actions">
                    <button class="btn-save" id="btn-save-all">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            </div>
        </header>

        <!-- Navegação por Abas -->
        <nav class="sales-page-tabs">
            <button class="tab-btn active" data-tab="config">
                <i class="fas fa-cog"></i> Configurações
            </button>
            <button class="tab-btn" data-tab="products">
                <i class="fas fa-box"></i> Produtos <span class="badge" id="products-count-badge">0</span>
            </button>
            <button class="tab-btn" data-tab="analytics">
                <i class="fas fa-chart-line"></i> Analytics
            </button>
            <button class="tab-btn" data-tab="preview">
                <i class="fas fa-eye"></i> Preview
            </button>
        </nav>

        <!-- Conteúdo das Abas -->
        <main class="sales-page-edit-content">
            <!-- Aba Configurações -->
            <div class="tab-content active" id="tab-config">
                <div class="config-section">
                    <h2 class="section-title">
                        <i class="fas fa-store"></i> Informações da Loja
                    </h2>
                    <div class="form-group">
                        <label for="store-title">Título da Loja *</label>
                        <input type="text" id="store-title" class="form-input" placeholder="Ex: Minha Loja de Vendas" required>
                    </div>
                    <div class="form-group">
                        <label for="store-description">Descrição da Loja</label>
                        <div class="suggestions-container" id="store-description-container">
                            <textarea id="store-description" class="form-textarea" rows="3" placeholder="Descreva sua loja..."></textarea>
                            <div class="suggestions-buttons-group">
                                <button type="button" class="btn-suggestions" id="btn-store-description-suggestions">
                                    <i class="fas fa-magic"></i> Gerar Sugestão
                                </button>
                                <button type="button" class="btn-more-suggestions" id="btn-more-store-description" style="display: none;">
                                    <i class="fas fa-sync-alt"></i> Mais Sugestões
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="config-section">
                    <h2 class="section-title">
                        <i class="fas fa-palette"></i> Personalização Visual
                    </h2>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="theme-select">Tema</label>
                            <select id="theme-select" class="form-select">
                                <option value="dark">Escuro</option>
                                <option value="light">Claro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="background-color">Cor de Fundo</label>
                            <div class="color-input-group">
                                <input type="color" id="background-color" class="color-picker" value="#0D0D0F">
                                <input type="text" id="background-color-text" class="form-input color-text" value="#0D0D0F">
                            </div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="text-color">Cor do Texto</label>
                            <div class="color-input-group">
                                <input type="color" id="text-color" class="color-picker" value="#ECECEC">
                                <input type="text" id="text-color-text" class="form-input color-text" value="#ECECEC">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="button-color">Cor do Botão</label>
                            <div class="color-input-group">
                                <input type="color" id="button-color" class="color-picker" value="#FFC700">
                                <input type="text" id="button-color-text" class="form-input color-text" value="#FFC700">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="background-image-url">Imagem de Fundo (opcional)</label>
                        <div class="image-upload-group">
                            <input type="hidden" id="background-image-url" class="form-input">
                            <button type="button" class="btn-upload" id="btn-upload-background-image">
                                <i class="fas fa-upload"></i> Fazer Upload da Imagem
                            </button>
                        </div>
                        <div class="image-preview" id="background-image-preview"></div>
                        <small class="form-help">Faça upload de uma imagem para usar como fundo da sua loja</small>
                    </div>
                </div>

                <div class="config-section">
                    <h2 class="section-title">
                        <i class="fas fa-mobile-alt"></i> Botão do Módulo
                    </h2>
                    <div class="form-group">
                        <label for="button-text">Texto do Botão *</label>
                        <input type="text" id="button-text" class="form-input" placeholder="Ex: Minha Loja de Vendas" required>
                    </div>
                    <div class="form-group">
                        <label for="button-logo-url">Mudar Logo</label>
                        <div class="image-upload-group">
                            <input type="hidden" id="button-logo-url" class="form-input">
                            <button type="button" class="btn-upload" id="btn-upload-logo">
                                <i class="fas fa-upload"></i> Fazer Upload da Logo
                            </button>
                        </div>
                        <div class="image-preview" id="logo-preview"></div>
                        <small class="form-help">Faça upload da logo que aparecerá no botão do módulo</small>
                    </div>
                    <div class="form-group" id="logo-size-group" style="display: none;">
                        <label for="button-logo-size">Tamanho da Logo (em pixels)</label>
                        <div class="input-group range-slider" style="margin-bottom: 15px;">
                            <div class="range-slider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <label style="margin: 0; color: var(--text, #ECECEC);">Tamanho: <span id="logo-size-value">24</span>px</label>
                                <input type="number" id="button-logo-size" class="form-input" value="24" min="20" max="600" step="1" style="width: 80px; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC); text-align: center;">
                            </div>
                            <input type="range" id="button-logo-size-slider" value="24" min="20" max="600" step="5" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-dark, #A1A1A1);">
                                <span>20px</span>
                                <span>600px</span>
                            </div>
                        </div>
                        <small class="form-help">Ajuste o tamanho da logo que aparecerá no botão do módulo no cartão público</small>
                    </div>
                </div>

                <div class="config-section">
                    <h2 class="section-title">
                        <i class="fas fa-id-card"></i> Formato no Cartão
                    </h2>
                    <p class="form-help" style="margin-bottom: 12px;">Como a página de vendas aparece no seu cartão virtual (igual ao King Forms).</p>
                    <div class="form-group">
                        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" name="card-display-format" value="button" id="card-format-button" checked>
                                <span>Botão</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" name="card-display-format" value="banner" id="card-format-banner">
                                <span>Banner</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group" id="card-banner-image-group" style="display: none;">
                        <label>Imagem do Banner (no cartão)</label>
                        <div class="image-upload-group">
                            <input type="hidden" id="card-banner-image-url" class="form-input">
                            <button type="button" class="btn-upload" id="btn-upload-card-banner">
                                <i class="fas fa-upload"></i> Fazer Upload do Banner
                            </button>
                        </div>
                        <div class="image-preview" id="card-banner-preview"></div>
                        <small class="form-help">Imagem que aparecerá no cartão quando o formato for Banner</small>
                    </div>
                </div>

                <div class="config-section">
                    <h2 class="section-title">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </h2>
                    <div class="form-group">
                        <label for="whatsapp-number">Número do WhatsApp *</label>
                        <input type="tel" id="whatsapp-number" class="form-input" placeholder="5511999999999" required>
                        <small class="form-help">Apenas números, com código do país (ex: 5511999999999)</small>
                    </div>
                </div>

                <div class="config-section">
                    <h2 class="section-title">
                        <i class="fas fa-search"></i> SEO (Otimização para Buscas)
                    </h2>
                    <div class="form-group">
                        <label for="meta-title">Meta Título</label>
                        <div class="suggestions-container" id="meta-title-container">
                            <input type="text" id="meta-title" class="form-input" placeholder="Título para compartilhamento">
                            <div class="suggestions-buttons-group">
                                <button type="button" class="btn-suggestions" id="btn-meta-title-suggestions">
                                    <i class="fas fa-magic"></i> Gerar Sugestão
                                </button>
                                <button type="button" class="btn-more-suggestions" id="btn-more-meta-title" style="display: none;">
                                    <i class="fas fa-sync-alt"></i> Mais Sugestões
                                </button>
                            </div>
                        </div>
                        <small class="form-help">Título que aparece quando sua loja  compartilhada em redes sociais</small>
                    </div>
                    <div class="form-group">
                        <label for="meta-description">Meta Descrição</label>
                        <div class="suggestions-container" id="meta-description-container">
                            <textarea id="meta-description" class="form-textarea" rows="2" placeholder="Descrição para compartilhamento"></textarea>
                            <div class="suggestions-buttons-group">
                                <button type="button" class="btn-suggestions" id="btn-meta-description-suggestions">
                                    <i class="fas fa-magic"></i> Gerar Sugestão
                                </button>
                                <button type="button" class="btn-more-suggestions" id="btn-more-meta-description" style="display: none;">
                                    <i class="fas fa-sync-alt"></i> Mais Sugestões
                                </button>
                            </div>
                        </div>
                        <small class="form-help">Descrição que aparece quando sua loja  compartilhada em redes sociais</small>
                    </div>
                    <div class="form-group">
                        <label for="meta-image-url">Imagem para Compartilhamento</label>
                        <div class="image-upload-group">
                            <input type="hidden" id="meta-image-url" class="form-input">
                            <button type="button" class="btn-upload" id="btn-upload-meta-image">
                                <i class="fas fa-upload"></i> Fazer Upload da Imagem
                            </button>
                        </div>
                        <div class="image-preview" id="meta-image-preview"></div>
                        <small class="form-help">Imagem que aparece quando sua loja  compartilhada em redes sociais (WhatsApp, Facebook, etc.). Esta imagem  usada para criar uma prévia visual atraente do seu link.</small>
                    </div>
                </div>
            </div>

            <!-- Aba Produtos -->
            <div class="tab-content" id="tab-products">
                <div class="products-header">
                    <h2 class="section-title">
                        <i class="fas fa-box"></i> Produtos <span class="products-count">(<span id="products-count">0</span>/50)</span>
                    </h2>
                    <div class="products-header-actions">
                        <div class="view-controls-edit">
                            <div class="view-mode-controls-edit">
                                <button class="view-btn-edit active" data-mode="grid" title="Modo Miniatura">
                                    <i class="fas fa-th"></i>
                                </button>
                                <button class="view-btn-edit" data-mode="list" title="Modo Lista">
                                    <i class="fas fa-list"></i>
                                </button>
                            </div>
                            <div class="view-size-controls-edit">
                                <button class="size-btn-edit active" data-size="small" title="Pequeno">
                                    <i class="fas fa-square" style="font-size: 0.7rem;"></i>
                                </button>
                                <button class="size-btn-edit" data-size="medium" title="Médio">
                                    <i class="fas fa-square" style="font-size: 0.85rem;"></i>
                                </button>
                                <button class="size-btn-edit" data-size="large" title="Grande">
                                    <i class="fas fa-square" style="font-size: 1rem;"></i>
                                </button>
                            </div>
                        </div>
                        <button class="btn-add-product" id="btn-add-product">
                            <i class="fas fa-plus"></i> Adicionar Produto
                        </button>
                    </div>
                </div>

                <div class="products-filter-tabs">
                    <button class="filter-tab active" data-filter="all">
                        <i class="fas fa-th"></i> Todos
                    </button>
                    <button class="filter-tab" data-filter="oferta">
                        <i class="fas fa-tag"></i> Oferta
                    </button>
                    <button class="filter-tab" data-filter="destaque">
                        <i class="fas fa-star"></i> Destaque
                    </button>
                    <button class="filter-tab" data-filter="novo">
                        <i class="fas fa-sparkles"></i> Novidade
                    </button>
                </div>

                <div class="products-list" id="products-list" data-view-mode="grid" data-card-size="small" data-filter="all">
                    <div class="empty-state" id="products-empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Nenhum produto cadastrado ainda.</p>
                        <button class="btn-primary" id="btn-add-first-product">
                            <i class="fas fa-plus"></i> Adicionar Primeiro Produto
                        </button>
                    </div>
                </div>
            </div>

            <!-- Aba Analytics -->
            <div class="tab-content" id="tab-analytics">
                <div class="analytics-header">
                    <h2 class="section-title">
                        <i class="fas fa-chart-line"></i> Analytics
                    </h2>
                    <select class="period-select" id="analytics-period">
                        <option value="7">últimos 7 dias</option>
                        <option value="30" selected>últimos 30 dias</option>
                        <option value="90">últimos 90 dias</option>
                        <option value="all">Todo o período</option>
                    </select>
                </div>

                <!-- Métricas Gerais -->
                <div class="analytics-metrics">
                    <div class="metric-card">
                        <div class="metric-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                            <i class="fas fa-eye"></i>
                        </div>
                        <div class="metric-info">
                            <div class="metric-value" id="metric-page-views">0</div>
                            <div class="metric-label">Visualizações</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
                            <i class="fas fa-mouse-pointer"></i>
                        </div>
                        <div class="metric-info">
                            <div class="metric-value" id="metric-product-clicks">0</div>
                            <div class="metric-label">Cliques em Produtos</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="metric-info">
                            <div class="metric-value" id="metric-add-to-cart">0</div>
                            <div class="metric-label">Adicionados ao Carrinho</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
                            <i class="fab fa-whatsapp"></i>
                        </div>
                        <div class="metric-info">
                            <div class="metric-value" id="metric-checkout-clicks">0</div>
                            <div class="metric-label">Checkouts (WhatsApp)</div>
                        </div>
                    </div>
                </div>

                <!-- Funil de Vendas -->
                <div class="analytics-section">
                    <h3 class="subsection-title">Funil de Vendas</h3>
                    <div class="funnel-container" id="funnel-container">
                        <div class="funnel-step">
                            <div class="funnel-label">Visualizações da Página</div>
                            <div class="funnel-bar">
                                <div class="funnel-fill" id="funnel-page-views" style="width: 100%"></div>
                            </div>
                            <div class="funnel-value" id="funnel-page-views-value">0</div>
                        </div>
                        <div class="funnel-step">
                            <div class="funnel-label">Visualizações de Produtos</div>
                            <div class="funnel-bar">
                                <div class="funnel-fill" id="funnel-product-views" style="width: 0%"></div>
                            </div>
                            <div class="funnel-value" id="funnel-product-views-value">0 <span class="funnel-percent">(0%)</span></div>
                        </div>
                        <div class="funnel-step">
                            <div class="funnel-label">Cliques em Produtos</div>
                            <div class="funnel-bar">
                                <div class="funnel-fill" id="funnel-product-clicks" style="width: 0%"></div>
                            </div>
                            <div class="funnel-value" id="funnel-product-clicks-value">0 <span class="funnel-percent">(0%)</span></div>
                        </div>
                        <div class="funnel-step">
                            <div class="funnel-label">Adicionados ao Carrinho</div>
                            <div class="funnel-bar">
                                <div class="funnel-fill" id="funnel-add-to-cart" style="width: 0%"></div>
                            </div>
                            <div class="funnel-value" id="funnel-add-to-cart-value">0 <span class="funnel-percent">(0%)</span></div>
                        </div>
                        <div class="funnel-step">
                            <div class="funnel-label">Checkouts (WhatsApp)</div>
                            <div class="funnel-bar">
                                <div class="funnel-fill" id="funnel-checkout" style="width: 0%"></div>
                            </div>
                            <div class="funnel-value" id="funnel-checkout-value">0 <span class="funnel-percent">(0%)</span></div>
                        </div>
                    </div>
                </div>

                <!-- Ranking de Produtos -->
                <div class="analytics-section">
                    <h3 class="subsection-title">Ranking de Produtos</h3>
                    <div class="products-ranking" id="products-ranking">
                        <div class="empty-state">
                            <i class="fas fa-chart-bar"></i>
                            <p>Nenhum dado de analytics disponível ainda.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Aba Preview -->
            <div class="tab-content" id="tab-preview">
                <div class="preview-header">
                    <h2 class="section-title">
                        <i class="fas fa-eye"></i> Preview da Página
                    </h2>
                    <div class="preview-actions">
                        <button class="btn-secondary" id="btn-refresh-preview">
                            <i class="fas fa-sync-alt"></i> Atualizar Preview
                        </button>
                        <a href="#" target="_blank" class="btn-primary" id="btn-open-preview">
                            <i class="fas fa-external-link-alt"></i> Abrir em Nova Aba
                        </a>
                    </div>
                </div>
                <div class="preview-container">
                    <iframe id="preview-iframe" src="about:blank" frameborder="0"></iframe>
                </div>
            </div>
        </main>
    </div>

    <!-- Modal de Produto -->
    <div class="modal" id="product-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="product-modal-title">Adicionar Produto</h3>
                <button class="modal-close" id="product-modal-close">&times;</button>
            </div>
            <div class="modal-body" id="product-modal-body">
                <!-- Conteúdo será inserido via JS -->
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" id="product-modal-cancel">Cancelar</button>
                <button class="btn-primary" id="product-modal-save">Salvar Produto</button>
            </div>
        </div>
    </div>

    <!-- Modal de Crop para Logo -->
    <div id="cropper-modal" class="modal-overlay">
        <div class="modal-content large">
            <div class="modal-header">
                <h4>Enquadrar Logo</h4>
            </div>
            <div class="modal-body cropper-body">
                <div class="cropper-container">
                    <img id="image-to-crop" src="">
                </div>
            </div>
            <div class="modal-footer">
                <button id="cancel-crop-btn" class="btn btn-secondary">Cancelar</button>
                <button id="crop-and-upload-btn" class="btn btn-primary">Enquadrar e Enviar</button>
            </div>
        </div>
    </div>

</body>
</html>

