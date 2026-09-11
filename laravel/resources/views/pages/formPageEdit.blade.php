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
        <div style="display: flex; align-items: center; gap: 16px;">
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
                <div style="padding: 0 16px 12px 16px;">
                    <div style="position: relative;">
                        <input type="text" id="search-questions-input" placeholder="Buscar perguntas..." style="width: 100%; padding: 10px 36px 10px 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; color: #ECECEC; font-size: 14px; transition: all 0.3s;" onfocus="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)';" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.05)';">
                        <button id="clear-search-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: #A1A1A1; cursor: pointer; padding: 4px; display: none; font-size: 14px;" title="Limpar busca">
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
        <div class="form-edit-preview" style="display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden;">
            <!-- Barra de Controles da Pré-visualização -->
            <div class="preview-controls-bar" style="position: sticky; top: 0; z-index: 1000; background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 16px 24px; border-bottom: 2px solid rgba(255,199,0,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <h3 style="margin: 0; color: #ECECEC; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-eye" style="color: #FFC700;"></i>
                        Pré-visualização
                    </h3>
                    <div class="preview-separator" style="width: 2px; height: 24px; background: rgba(255,255,255,0.1);"></div>
                    <div class="preview-mode-buttons" style="display: flex; gap: 8px;">
                        <button id="preview-mode-desktop" class="preview-mode-btn active" style="padding: 8px 16px; background: linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1)); border: 2px solid #FFC700; border-radius: 8px; color: #FFC700; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 8px;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">
                            <i class="fas fa-desktop"></i>
                            Desktop
                        </button>
                        <button id="preview-mode-mobile" class="preview-mode-btn" style="padding: 8px 16px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; color: #A1A1A1; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 8px;" onmouseover="this.style.borderColor='rgba(255,199,0,0.3)'; this.style.color='#FFC700';" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#A1A1A1';">
                            <i class="fas fa-mobile-alt"></i>
                            Celular
                        </button>
                    </div>
                </div>
                <div style="font-size: 12px; color: #A1A1A1;">
                    <i class="fas fa-info-circle"></i>
                    Visualização idêntica ao formulário público
                </div>
            </div>
            <div class="form-preview-container" style="flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px; background: #f8f9fa; min-height: 100%; display: block !important; visibility: visible !important; opacity: 1 !important;">
                <!-- Estrutura idêntica ao formulário público -->
                <div class="preview-form-wrapper" style="max-width: 1000px; margin: 0 auto;">
                    <!-- Header Image -->
                    <div id="preview-header-image-container" style="display: none; position: relative; width: 100%; overflow: hidden; margin-bottom: 0; line-height: 0; background: #0a0a0a;">
                        <img id="preview-header-image" style="width: 100%; height: auto; max-width: 100%; object-fit: contain; object-position: center center; display: block;">
                        <button id="remove-header-image-preview" style="position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; z-index: 10;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Header (simulado) -->
                    <header class="preview-form-header" style="background: linear-gradient(135deg, var(--preview-primary-color, #4A90E2) 0%, rgba(74, 144, 226, 0.9) 100%); color: white; padding: 24px; border-radius: 0; box-shadow: 0 2px 16px rgba(0,0,0,0.12); margin-bottom: 0;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <h1 class="preview-form-title" contenteditable="true" id="preview-title" data-placeholder="Formulário sem título" style="margin: 0; font-size: 32px; font-weight: 700; flex: 1; letter-spacing: -0.5px; line-height: 1.2; color: white; word-wrap: break-word; overflow-wrap: break-word;">Formulário sem título</h1>
                        </div>
                    </header>
                    
                    <!-- Main Content - Layout do formulário (preview) -->
                    <main class="preview-form-container" style="padding: 40px 0 80px 0; position: relative; z-index: 5; min-height: calc(100vh - 200px);">
                        <div class="preview-container" style="max-width: 1000px; margin: 0 auto; padding: 0 24px;">
                            <div class="preview-checkout-layout" style="display: grid; grid-template-columns: 1fr; gap: 32px; align-items: start;">
                                <!-- Coluna Principal - Formulário -->
                                <div class="preview-checkout-main">
                                    <!-- Descrição -->
                                    <div id="preview-description-container" style="display: none; background: var(--preview-card-color, #ffffff); padding: 32px 40px; border-radius: 20px; margin-bottom: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.06); position: relative;">
                                        <button id="remove-description-btn" style="position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.05); border: none; color: #5f6368; cursor: pointer; padding: 8px 12px; font-size: 14px; border-radius: 8px; opacity: 0.6; transition: opacity 0.2s; display: none;" title="Remover descrição" onmouseover="this.style.opacity='1'; this.style.background='rgba(0,0,0,0.1)';" onmouseout="this.style.opacity='0.6'; this.style.background='rgba(0,0,0,0.05)';">
                                            <i class="fas fa-times"></i>
                                        </button>
                                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--preview-primary-color, #4A90E2), rgba(74, 144, 226, 0.7)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
                                                <i class="fas fa-info-circle"></i>
                                            </div>
                                            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--preview-text-color, #202124);">Informações</h2>
                                        </div>
                                        <p class="preview-form-description" contenteditable="true" id="preview-description" data-placeholder="Descrição do formulário" style="margin: 0; padding-left: 52px; line-height: 1.9; color: var(--preview-text-color, #333); font-size: 16px; font-weight: 400; letter-spacing: 0.2px; word-wrap: break-word; overflow-wrap: break-word;">Descrição do formulário</p>
                                    </div>

                                    <!-- Formulário -->
                                    <form class="preview-digital-form" style="background: var(--preview-card-color, white); padding: 48px 56px; border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.06); position: relative; overflow: hidden;">
                                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--preview-primary-color, #4A90E2), rgba(74, 144, 226, 0.6));"></div>
                                        
                                        <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e8eaed;">
                                            <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: var(--preview-text-color, #202124); letter-spacing: -0.5px; display: flex; align-items: center; gap: 12px;">
                                                <div style="width: 6px; height: 32px; background: linear-gradient(180deg, var(--preview-primary-color, #4A90E2), rgba(74, 144, 226, 0.6)); border-radius: 3px;"></div>
                                                Preencha os dados
                                            </h2>
                                            <p style="margin: 12px 0 0 18px; color: #5f6368; font-size: 14px;">Todos os campos marcados com * são obrigatórios</p>
                                        </div>
                                        
                                        <!-- Campos Dinâmicos -->
                                        <div id="preview-questions-container" style="min-height: 200px;">
                                            <div class="add-question-placeholder" id="add-question-placeholder">
                                                <i class="fas fa-plus-circle"></i>
                                                <div>Adicione a primeira pergunta</div>
                                            </div>
                                        </div>
                                        
                                        <!-- Botão Enviar -->
                                        <button type="button" class="preview-submit-btn" style="width: 100%; padding: 16px 24px; background: linear-gradient(135deg, #25D366, #20BA5A); color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 16px; cursor: default; margin-top: 32px; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 4px 16px rgba(37, 211, 102, 0.3);">
                                            <i class="fab fa-whatsapp" style="font-size: 20px;"></i>
                                            <span>Enviar via WhatsApp</span>
                                            <i class="fas fa-arrow-right" style="font-size: 14px; margin-left: auto;"></i>
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
                <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>Nenhuma pergunta adicionada ainda.</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">Clique em "Adicionar Pergunta" para começar.</p>
                </div>
            </div>
            <input type="hidden" id="form-fields-json">
        </div>
        
        <div class="form-tab-content" data-tab-content="responses">
            <div id="responses-dashboard">
                <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                    <p>Carregando respostas...</p>
                </div>
            </div>
        </div>
    </div>
    
</body>
</html>

