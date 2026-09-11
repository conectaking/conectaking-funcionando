<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de Check-in - King Forms</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/responsesList.js'])
</head>
<body>
    <div class="page-container">
        <div class="page-header">
            <div class="header-top">
                <div class="header-title">
                    <i class="fas fa-users ck-rl-0eebb9"></i>
                    <h1 id="page-title">Confirmação de Check-in</h1>
                </div>
                <a href="#" id="btn-voltar" class="btn-voltar" onclick="event.preventDefault(); return false;">
                    <i class="fas fa-arrow-left"></i> Voltar
                </a>
            </div>
            
            <div class="tabs-container" id="tabs-container">
                <!-- Tabs serão inseridas via JavaScript -->
            </div>
        </div>
        
        <div class="content-section">
            <div id="loading" class="loading">
                <i class="fas fa-spinner fa-spin ck-rl-11b181"></i>
                <div>Carregando dados...</div>
            </div>
            
            <div class="ck-hidden" id="content">
                <!-- SE—fO DE LINKS GRANDE E VISÍVEL (apenas para modo lista de convidados) -->
                <div id="links-hero-section" class="links-hero-section ck-hidden">
                    <div class="links-hero-title">
                        <i class="fas fa-link"></i>
                        <h2>Links para Compartilhar</h2>
                    </div>
                    <div class="links-grid">
                        <!-- Link para Cadastro -->
                        <div class="link-card cadastro">
                            <div class="link-card-header">
                                <div class="link-card-icon cadastro">
                                    <i class="fas fa-user-plus"></i>
                                </div>
                                <div>
                                    <h3 class="link-card-title">Links de Cadastro Personalizados</h3>
                                    <p class="link-card-subtitle">Crie e gerencie links personalizados para cadastro</p>
                                </div>
                            </div>
                            <p class="link-card-description">
                                <strong>Crie links personalizados para as pessoas se inscreverem.</strong><br>
                                Cada link pode ter sua própria descrição, validade e limite de usos.
                            </p>
                            
                            <!-- Botão Criar Múltiplos Links -->
                            <button class="ck-rl-543f30" onclick="showCreateMultipleCadastroLinksModal()" 
                                   
                                    onmouseover="this.style.background='#43e97b'; this.style.color='#000';"
                                    onmouseout="this.style.background='#000'; this.style.color='#43e97b';">
                                <i class="fas fa-plus-circle"></i> Criar Novo Link Personalizado
                            </button>
                            
                            <!-- Lista de Links Personalizados Criados -->
                            <div class="ck-rl-5fa693" id="cadastro-links-list">
                                <!-- Links personalizados serão inseridos aqui via JavaScript -->
                            </div>
                        </div>
                        
                        <!-- Link para Portaria -->
                        <div class="link-card portaria">
                            <div class="link-card-header">
                                <div class="link-card-icon portaria">
                                    <i class="fas fa-door-open"></i>
                                </div>
                                <div>
                                    <h3 class="link-card-title">Link da Portaria</h3>
                                    <p class="link-card-subtitle">Para confirmar chegada dos convidados</p>
                                </div>
                            </div>
                            <p class="link-card-description">
                                <strong>Envie este link para o porteiro/recepcionista.</strong><br>
                                Ele poderá ver a lista completa, buscar por nome, confirmar a chegada e ver estatísticas em tempo real.
                            </p>
                            <!-- Link Original (oculto quando slug personalizado estiver ativo) -->
                            <div class="link-card-input-group" id="link-portaria-original-group">
                                <input type="text" id="link-portaria" readonly placeholder="Carregando link...">
                                <button class="link-card-btn portaria" onclick="copyLinkToClipboard('link-portaria', event)">
                                    <i class="fas fa-copy"></i> Copiar Link
                                </button>
                            </div>
                            
                            <!-- Link Personalizado (visível apenas quando slug estiver ativo) -->
                            <div class="link-card-input-group ck-rl-56bb4e" id="link-portaria-personalizado-group">
                                <input type="text" id="link-portaria-personalizado" readonly placeholder="Link personalizado...">
                                <button class="link-card-btn portaria ck-rl-d0e1b8" onclick="copyLinkToClipboard('link-portaria-personalizado', event)">
                                    <i class="fas fa-copy"></i> Copiar Link Personalizado
                                </button>
                            </div>
                            
                            <div class="ck-rl-2aa823">
                                <label class="ck-rl-032f7c">
                                    <i class="fas fa-link"></i> Personalizar Link (Slug)
                                </label>
                                <div class="ck-rl-eb8e6a">
                                    <input class="ck-rl-c49e80" type="text" id="portaria-slug-input" 
                                           placeholder="Ex: portaria-2026, conecta-portaria" 
                                          
                                           pattern="[a-z0-9_-]+" 
                                           title="Apenas letras minúsculas, números, hífens e underscores">
                                    <button class="ck-rl-7b5040" onclick="savePortariaSlug(event)" 
                                           >
                                        <i class="fas fa-save"></i> Salvar
                                    </button>
                                    <button class="ck-rl-ad0629" onclick="clearPortariaSlug()" 
                                           >
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <p class="ck-rl-316642">
                                    <i class="fas fa-info-circle"></i> Crie um link curto e fácil de compartilhar. Ex: "portaria-2026" criará o link: <code class="ck-rl-7c7ee5">/portaria/portaria-2026</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Estatísticas Melhoradas (Removido contador de contratos conforme solicitado) -->
                <div id="stats-hero-section" class="stats-hero-grid ck-hidden">
                    <div class="stat-hero-card total">
                        <div class="stat-hero-icon total">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-hero-value total" id="stat-total">0</div>
                        <div class="stat-hero-label">Cadastrados</div>
                    </div>
                    <div class="stat-hero-card falta">
                        <div class="stat-hero-icon falta">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-hero-value falta" id="stat-falta">0</div>
                        <div class="stat-hero-label">Não Chegou</div>
                    </div>
                    <div class="stat-hero-card chegou">
                        <div class="stat-hero-icon chegou">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-hero-value chegou" id="stat-chegou">0</div>
                        <div class="stat-hero-label">Chegou</div>
                    </div>
                </div>
                
                <div class="stats-grid" id="stats-grid">
                    <!-- Estatísticas serão inseridas via JavaScript -->
                </div>
                
                <div class="search-bar">
                    <input type="text" id="search-input" class="search-input" placeholder="Buscar por nome, WhatsApp, email...">
                    <button id="export-pdf" class="btn-export pdf">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button id="export-csv" class="btn-export csv ck-hidden">
                        <i class="fas fa-file-csv"></i> CSV
                    </button>
                </div>
                
                <!-- Controles Administrativos -->
                <div id="admin-controls" class="admin-controls ck-hidden">
                    <div class="admin-controls-left">
                        <label class="ck-rl-53d37e">
                            <input type="checkbox" id="select-all-checkbox" class="guest-checkbox">
                            Selecionar Todos
                        </label>
                    </div>
                    <div class="admin-controls-right">
                        <button class="btn-delete-admin ck-hidden" id="delete-selected-btn">
                            <i class="fas fa-trash-alt"></i> Excluir Selecionados (<span id="selected-count">0</span>)
                        </button>
                        <button class="btn-delete-admin" id="delete-all-btn">
                            <i class="fas fa-trash"></i> Excluir Todos
                        </button>
                    </div>
                </div>
                
                <div class="items-list" id="items-list">
                    <!-- Itens serão inseridos via JavaScript -->
                </div>
            </div>
            
            <div id="empty" class="empty-state ck-hidden">
                <div class="empty-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3 class="empty-title">Nenhum dado ainda</h3>
                <p class="empty-text">Os dados aparecerão aqui quando disponíveis</p>
            </div>
        </div>
    </div>
    
    
</body>
</html>

