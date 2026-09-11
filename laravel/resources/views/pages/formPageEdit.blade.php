<!DOCTYPE html>
<html lang="pt-BR" class="form-edit-page-html">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar King Forms - Dashboard</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/formPageEdit.js'])
</head>
<body class="form-edit-page form-edit-page-body">
    <div class="form-edit-header">
        <div class="ck-fpe2-c9a733">
            <a href="/kingForms" target="_top" class="btn-back">
                <i class="fas fa-arrow-left"></i> Voltar
            </a>
            <h1>Editar King Forms</h1>
        </div>
        <button class="btn-save-form" id="save-form-btn">
            <i class="fas fa-save"></i> Salvar
        </button>
    </div>
    
    <div class="form-edit-main">
        <!-- Sidebar -->
        <div class="form-edit-sidebar">
            <div class="sidebar-section">
                <div class="sidebar-section-title">Adicionar Elementos</div>
                
                <!-- Busca de Perguntas -->
                <div class="ck-fpe-dc36b9">
                    <div class="ck-fpe-50666a">
                        <input class="ck-fpe-892057" type="text" id="search-questions-input" placeholder="Buscar perguntas..." onfocus="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)';" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.05)';">
                        <button class="ck-fpe2-70e5b5" id="clear-search-btn" title="Limpar busca">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <button class="sidebar-btn" id="sidebar-add-question">
                    <i class="fas fa-plus-circle"></i>
                    <span>Adicionar pergunta</span>
                </button>
                <button class="sidebar-btn" id="sidebar-add-title">
                    <i class="fas fa-heading"></i>
                    <span>Adicionar título e descrição</span>
                </button>
                <button class="sidebar-btn" id="sidebar-add-header-image">
                    <i class="fas fa-image"></i>
                    <span>Adicionar imagem de cabeçalho</span>
                </button>
                <button class="sidebar-btn" id="sidebar-add-image">
                    <i class="fas fa-image"></i>
                    <span>Adicionar imagem</span>
                </button>
                <button class="sidebar-btn" id="sidebar-customize-colors">
                    <i class="fas fa-palette"></i>
                    <span>Cores e Temas</span>
                </button>
                <button class="sidebar-btn" id="sidebar-load-module">
                    <i class="fas fa-layer-group"></i>
                    <span>Módulos/Templates</span>
                </button>
                <button class="sidebar-btn" id="sidebar-settings">
                    <i class="fas fa-cog"></i>
                    <span>Configurações</span>
                </button>
                <button class="sidebar-btn" id="sidebar-responses">
                    <i class="fas fa-inbox"></i>
                    <span>Envios | Listas</span>
                </button>
                <button class="sidebar-btn" id="sidebar-dashboard">
                    <i class="fas fa-chart-bar"></i>
                    <span>Dashboard</span>
                </button>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-section-title">Compartilhar</div>
                <button class="sidebar-btn" id="sidebar-share-form-ready" title="Gera um código para outro usuário importar este formulário na conta dele">
                    <i class="fas fa-share-alt"></i>
                    <span>Gerar código</span>
                </button>
                <button class="sidebar-btn" id="sidebar-import-form" title="Importar um formulário: digite o código que alguém te passou">
                    <i class="fas fa-file-import"></i>
                    <span>Importar formulário</span>
                </button>
            </div>
            
        </div>
        
        <!-- Preview Area -->
        <div class="form-edit-preview ck-fpe2-0dd877">
            <!-- Barra de Controles da Pré-visualização -->
            <div class="preview-controls-bar ck-fpe2-7613ab">
                <div class="ck-fpe2-c9a733">
                    <h3 class="ck-fpe2-0c9f24">
                        <i class="fas fa-eye ck-fpe-13e70b"></i>
                        Pré-visualização
                    </h3>
                    <div class="preview-separator ck-fpe-6c9375"></div>
                    <div class="preview-mode-buttons ck-fpe2-693434">
                        <button id="preview-mode-desktop" class="preview-mode-btn active ck-fpe2-cd479f" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">
                            <i class="fas fa-desktop"></i>
                            Desktop
                        </button>
                        <button id="preview-mode-mobile" class="preview-mode-btn ck-fpe2-b015db" onmouseover="this.style.borderColor='rgba(255,199,0,0.3)'; this.style.color='#FFC700';" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#A1A1A1';">
                            <i class="fas fa-mobile-alt"></i>
                            Celular
                        </button>
                    </div>
                </div>
                <div class="ck-fpe-67e95f">
                    <i class="fas fa-info-circle"></i>
                    Visualização idêntica ao formulário público
                </div>
            </div>
            <div class="form-preview-container ck-fpe2-95a3e6">
                <!-- Estrutura idêntica ao formulário público -->
                <div class="preview-form-wrapper ck-fpe-a03f6a">
                    <!-- Header Image -->
                    <div class="ck-fpe2-7649aa" id="preview-header-image-container">
                        <img class="ck-fpe2-101db9" id="preview-header-image">
                        <button class="ck-fpe2-5d459b" id="remove-header-image-preview">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Header (simulado) -->
                    <header class="preview-form-header ck-fpe-b60d56">
                        <div class="ck-fpe2-3619f8">
                            <h1 class="preview-form-title ck-fpe-b34d3f" contenteditable="true" id="preview-title" data-placeholder="Formulário sem título">Formulário sem título</h1>
                        </div>
                    </header>
                    
                    <!-- Main Content - Layout do formulário (preview) -->
                    <main class="preview-form-container ck-fpe-579a15">
                        <div class="preview-container ck-fpe-5c93eb">
                            <div class="preview-checkout-layout ck-fpe2-247c92">
                                <!-- Coluna Principal - Formulário -->
                                <div class="preview-checkout-main">
                                    <!-- Descrição -->
                                    <div class="ck-fpe2-b80dda" id="preview-description-container">
                                        <button class="ck-fpe2-11d566" id="remove-description-btn" title="Remover descrição" onmouseover="this.style.opacity='1'; this.style.background='rgba(0,0,0,0.1)';" onmouseout="this.style.opacity='0.6'; this.style.background='rgba(0,0,0,0.05)';">
                                            <i class="fas fa-times"></i>
                                        </button>
                                        <div class="ck-fpe2-7f1517">
                                            <div class="ck-fpe2-79c1e2">
                                                <i class="fas fa-info-circle"></i>
                                            </div>
                                            <h2 class="ck-fpe-923943">Informações</h2>
                                        </div>
                                        <p class="preview-form-description ck-fpe-5d08ed" contenteditable="true" id="preview-description" data-placeholder="Descrição do formulário">Descrição do formulário</p>
                                    </div>

                                    <!-- Formulário -->
                                    <form class="preview-digital-form ck-fpe-dea2e6">
                                        <div class="ck-fpe-d041d7"></div>
                                        
                                        <div class="ck-fpe-c0a1e1">
                                            <h2 class="ck-fpe2-e2792a">
                                                <div class="ck-fpe-3e0cf7"></div>
                                                Preencha os dados
                                            </h2>
                                            <p class="ck-fpe-88192b">Todos os campos marcados com * são obrigatórios</p>
                                        </div>
                                        
                                        <!-- Campos Dinâmicos -->
                                        <div class="ck-fpe-70cbde" id="preview-questions-container">
                                            <div class="add-question-placeholder" id="add-question-placeholder">
                                                <i class="fas fa-plus-circle"></i>
                                                <div>Adicione a primeira pergunta</div>
                                            </div>
                                        </div>
                                        
                                        <!-- Botão Enviar -->
                                        <button type="button" class="preview-submit-btn ck-fpe2-0f1883">
                                            <i class="fab fa-whatsapp ck-fpe-4ef9d2"></i>
                                            <span>Enviar via WhatsApp</span>
                                            <i class="fas fa-arrow-right ck-fpe-fb8ad4"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
        
        <!-- Campos hidden para configurações (usados pelo código JS) -->
        <div class="ck-hidden">
            <input type="text" id="form-module-title" placeholder="King Forms">
            <input type="text" id="form-title" placeholder="Ex: Formulário de Contato">
            <textarea id="form-description" rows="4" placeholder="Descreva o propósito do formulário..."></textarea>
            <input type="text" id="whatsapp-number" placeholder="5511999999999">
            <input type="hidden" id="enable-pastor-button" value="false">
            <input type="hidden" id="pastor-whatsapp-number" value="">
            <input type="hidden" id="pastor-button-name" value="Enviar Mensagem para o Pastor">
            <input type="hidden" id="show-logo-corner" value="false">
            <input type="hidden" id="logo-url">
            <input type="hidden" id="button-logo-url">
            <input type="hidden" id="button-logo-size" value="40">
            <input type="hidden" id="banner-image-url">
            <input type="hidden" id="header-image-url">
            <input type="hidden" id="background-image-url">
            <input type="hidden" id="background-color-url" value="#FFFFFF">
            <input type="hidden" id="card-color" value="#FFFFFF">
            <input type="range" id="background-opacity" min="0" max="1" step="0.1" value="1">
            <select id="form-theme">
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
            </select>
            <input type="color" id="primary-color" value="#4A90E2">
            <input type="color" id="text-color" value="#333333">
            <input type="color" id="secondary-color" value="#6BA3F0">
            <label>
                <input type="radio" name="display-format" value="button" checked>
            </label>
            <label>
                <input type="radio" name="display-format" value="banner">
            </label>
            <div class="ck-hidden" id="banner-image-container"></div>
            <input type="hidden" id="form-fields-json" value="[]">
            
            <!-- Elementos de upload (ocultos mas acessíveis pelo JS) -->
            <div class="ck-sr-only" id="banner-upload-area">
                <input type="file" id="banner-file-input" accept="image/*">
                <img id="banner-preview">
                <div id="banner-upload-text"></div>
                <button type="button" id="remove-banner-btn"></button>
            </div>
            <div class="ck-sr-only" id="logo-upload-area">
                <input type="file" id="logo-file-input" accept="image/png,image/jpeg,image/jpg">
                <img id="logo-preview">
                <div id="logo-upload-text"></div>
                <button type="button" id="remove-logo-btn"></button>
            </div>
            <div class="ck-sr-only" id="header-upload-area">
                <input type="file" id="header-file-input" accept="image/*">
                <img id="header-preview">
                <div id="header-upload-text"></div>
                <button type="button" id="remove-header-btn"></button>
            </div>
            <div class="ck-sr-only" id="background-upload-area">
                <input type="file" id="background-file-input" accept="image/*">
                <img id="background-preview">
                <div id="background-upload-text"></div>
                <button type="button" id="remove-background-btn"></button>
            </div>
        </div>
        
        <!-- Outras tabs (ocultas por enquanto) -->
        <div class="ck-hidden">
            <div class="form-tab-content" data-tab-content="questions">
            <div class="ck-mb-20">
                <button type="button" class="btn-save-form" id="add-question-btn">
                    <i class="fas fa-plus"></i> Adicionar Pergunta
                </button>
            </div>
            <div id="questions-container">
                <div class="ck-fpe-53c292">
                    <i class="fas fa-question-circle ck-fpe-aba3c5"></i>
                    <p>Nenhuma pergunta adicionada ainda.</p>
                    <p class="ck-fpe-db0b67">Clique em "Adicionar Pergunta" para começar.</p>
                </div>
            </div>
            <input type="hidden" id="form-fields-json">
        </div>
        
        <div class="form-tab-content" data-tab-content="responses">
            <div id="responses-dashboard">
                <div class="ck-fpe-53c292">
                    <i class="fas fa-spinner fa-spin ck-fpe-918199"></i>
                    <p>Carregando respostas...</p>
                </div>
            </div>
        </div>
    </div>
    
</body>
</html>

