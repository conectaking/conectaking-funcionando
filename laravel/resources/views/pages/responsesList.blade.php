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
                    <i class="fas fa-users" style="font-size: 2rem; color: #FFC700;"></i>
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
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px;"></i>
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
                            <button onclick="showCreateMultipleCadastroLinksModal()" 
                                    style="margin-top: 20px; width: 100%; padding: 14px 24px; background: #000; border: 2px solid #43e97b; border-radius: 10px; color: #43e97b; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; box-sizing: border-box;"
                                    onmouseover="this.style.background='#43e97b'; this.style.color='#000';"
                                    onmouseout="this.style.background='#000'; this.style.color='#43e97b';">
                                <i class="fas fa-plus-circle"></i> Criar Novo Link Personalizado
                            </button>
                            
                            <!-- Lista de Links Personalizados Criados -->
                            <div id="cadastro-links-list" style="margin-top: 20px;">
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
                            <div class="link-card-input-group" id="link-portaria-personalizado-group" style="display: none; margin-bottom: 12px;">
                                <input type="text" id="link-portaria-personalizado" readonly placeholder="Link personalizado...">
                                <button class="link-card-btn portaria" onclick="copyLinkToClipboard('link-portaria-personalizado', event)" style="background: linear-gradient(135deg, #FFC700, #FFA500); white-space: normal; word-wrap: break-word; overflow-wrap: break-word;">
                                    <i class="fas fa-copy"></i> Copiar Link Personalizado
                                </button>
                            </div>
                            
                            <div style="margin-top: 12px; padding: 12px; background: rgba(74,144,226,0.1); border-radius: 8px; border: 1px solid rgba(74,144,226,0.3);">
                                <label style="display: block; color: #ECECEC; margin-bottom: 8px; font-weight: 600; font-size: 13px;">
                                    <i class="fas fa-link"></i> Personalizar Link (Slug)
                                </label>
                                <div style="display: flex; gap: 8px; align-items: stretch; width: 100%; max-width: 100%; box-sizing: border-box;">
                                    <input type="text" id="portaria-slug-input" 
                                           placeholder="Ex: portaria-2026, conecta-portaria" 
                                           style="flex: 1; padding: 10px 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(74,144,226,0.3); border-radius: 8px; color: #ECECEC; font-size: 13px; min-width: 0; max-width: 100%; box-sizing: border-box; word-break: break-all; overflow-wrap: anywhere;"
                                           pattern="[a-z0-9_-]+" 
                                           title="Apenas letras minúsculas, números, hífens e underscores">
                                    <button onclick="savePortariaSlug(event)" 
                                            style="padding: 10px 20px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; box-sizing: border-box;">
                                        <i class="fas fa-save"></i> Salvar
                                    </button>
                                    <button onclick="clearPortariaSlug()" 
                                            style="padding: 10px 14px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #ECECEC; cursor: pointer; font-weight: 600; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <p style="color: #A1A1A1; font-size: 11px; margin-top: 8px; line-height: 1.4;">
                                    <i class="fas fa-info-circle"></i> Crie um link curto e fácil de compartilhar. Ex: "portaria-2026" criará o link: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">/portaria/portaria-2026</code>
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
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ECECEC; font-weight: 600;">
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

