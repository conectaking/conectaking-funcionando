<!DOCTYPE html>
<html lang="pt-BR" class="form-edit-page-html guest-list-mode">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar Lista de Convidados - King Forms</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    <!-- IMPORTAR TODOS OS ESTILOS DO FORM EDIT -->
    
    @vite(['resources/js/pages/guestListEdit.js'])
</head>
<body class="form-edit-page form-edit-page-body">
    <!-- Estrutura do Editor KingForms será carregada dinamicamente via formPageEdit.js quando necessário -->
    
    <!-- Estrutura de Gerenciamento (será mostrada quando não houver itemId ou mode=manage) -->
    <div class="guest-list-management-container" id="guest-list-management-container">
    <div class="guest-list-header">
        <h1>
            <i class="fas fa-users"></i>
            <span id="event-title">Lista de Convidados</span>
        </h1>
        <div class="header-actions">
            <button class="btn btn-secondary" onclick="deleteGuestList()" style="background: rgba(255, 68, 68, 0.1); border-color: #ff4444; color: #ff4444;">
                <i class="fas fa-trash"></i> Excluir Lista
            </button>
            <button class="btn btn-secondary" onclick="goBackToDashboard()">
                <i class="fas fa-arrow-left"></i> Voltar
            </button>
            <button class="btn btn-primary" onclick="saveGuestList()">
                <i class="fas fa-save"></i> Salvar
            </button>
        </div>
    </div>
    
    <div class="main-container">
        <!-- Abas -->
        <div class="tabs-container">
            <button class="tab-button" data-tab="registered" onclick="switchTab('registered')">
                <i class="fas fa-user-plus"></i> <span class="tab-label">Inscritos</span> <span class="tab-count" id="tab-count-registered">(0)</span>
            </button>
            <button class="tab-button" data-tab="confirmation" onclick="switchTab('confirmation')">
                <i class="fas fa-user-check"></i> <span class="tab-label">Para Confirmao</span> <span class="tab-count" id="tab-count-confirmation">(0)</span>
            </button>
            <button class="tab-button" data-tab="confirmed" onclick="switchTab('confirmed')">
                <i class="fas fa-check-circle"></i> <span class="tab-label">Confirmados</span> <span class="tab-count" id="tab-count-confirmed">(0)</span>
            </button>
            <button class="tab-button active" data-tab="links" onclick="switchTab('links')">
                <i class="fas fa-link"></i> <span class="tab-label">Links</span>
            </button>
        </div>
        
        <!-- Aba: Convidados Cadastrados -->
        <div id="tab-registered" class="tab-content">
            <!-- Seção de Campos Customizados -->
            <div class="link-section" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05)); border: 2px solid rgba(74, 144, 226, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="color: #4A90E2; margin: 0;">
                        <i class="fas fa-sliders-h"></i> Personalização do Formulrio
                    </h3>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="use-custom-form" onchange="toggleCustomForm()" style="width: 20px; height: 20px; cursor: pointer;">
                        <span>Usar campos customizados (KingForms)</span>
                    </label>
                </div>
                <div id="custom-form-builder" style="display: none; margin-top: 16px;">
                    <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px; font-size: 14px;">
                        Personalize o formulrio de inscrio com campos customizados. Se desativado, será usado o formulrio padr</p>
                    <button onclick="openCustomFieldsEditor()" class="btn btn-secondary" style="width: 100%; padding: 12px; margin-bottom: 12px;">
                        <i class="fas fa-edit"></i> Editar Campos Customizados
                    </button>
                    <div id="custom-fields-preview" style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 13px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-info-circle"></i> Nenhum campo customizado definido. Clique em "Editar Campos Customizados" para comear.
                    </div>
                </div>
            </div>
            
            <div class="link-section" style="background: linear-gradient(135deg, rgba(255,199,0,0.1), rgba(255,199,0,0.05)); border: 2px solid rgba(255,199,0,0.3);">
                <h3 style="color: var(--dourado-principal, #FFC700); margin-bottom: 12px;">
                    <i class="fas fa-link"></i> Link Pblico de Inscrio
                </h3>
                <p style="color: var(--text, #ECECEC); margin-bottom: 20px; font-size: 15px; line-height: 1.6;">
                    <strong>Compartilhe este link</strong> para que as pessoas possam se inscrever no evento. Quando algum preencher o formulrio atravdeste link, os dados seráo salvos <strong>diretamente nesta lista</strong> e aparecero na aba "Convidados Cadastrados".
                </p>
                <div class="link-box" style="display: flex; gap: 12px; align-items: center;">
                    <input type="text" class="link-input" id="registration-link" readonly style="flex: 1; padding: 14px 16px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px; font-family: monospace;">
                    <button class="btn-copy" onclick="copyToClipboard('registration-link', event)" style="padding: 14px 24px; background: linear-gradient(135deg, #FFC700, #FFA500); color: #000; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                </div>
                <p style="color: var(--text-dark, #A1A1A1); margin-top: 12px; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> Envie este link por WhatsApp, email ou qualquer outro meio. As pessoas que preencherem aparecero aqui automaticamente.
                </p>
            </div>
            
            <div class="stats-cards" id="registered-stats">
                <!-- Stats seráo preenchidos via JavaScript -->
            </div>
            
            <!-- Busca -->
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                <div style="flex: 1; position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-dark, #A1A1A1);"></i>
                    <input type="text" id="search-registered" placeholder="Buscar convidados cadastrados..." 
                           oninput="filterGuests('registered', this.value)"
                           style="width: 100%; padding: 12px 16px 12px 48px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px;">
                </div>
                <button onclick="exportToPDF('registered')" class="btn btn-secondary" style="padding: 12px 20px;">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
            
            <div class="guests-table">
                <div class="table-header">
                    <div>Nome Completo</div>
                    <div>Email</div>
                    <div>Telefone</div>
                    <div>Status</div>
                    <div>Inscrito em</div>
                    <div>Aes</div>
                </div>
                <div id="registered-guests-list">
                    <!-- Lista será preenchida via JavaScript -->
                </div>
            </div>
        </div>
        
        <!-- Aba: Convidados para Confirmao -->
        <div id="tab-confirmation" class="tab-content">
            <div class="link-section">
                <h3><i class="fas fa-link"></i> Link Pblico de Confirmao</h3>
                <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px;">
                    Compartilhe este link para que as pessoas possam confirmar a presena dos convidados. Quem tiver o link pode acessar esta aba e confirmar convidados.
                </p>
                <div class="link-box">
                    <input type="text" class="link-input" id="confirmation-link" readonly>
                    <button class="btn-copy" onclick="copyToClipboard('confirmation-link', event)">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
            </div>
            
            <div class="stats-cards" id="confirmation-stats">
                <!-- Stats seráo preenchidos via JavaScript -->
            </div>
            
            <!-- Busca -->
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                <div style="flex: 1; position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-dark, #A1A1A1);"></i>
                    <input type="text" id="search-confirmation" placeholder="Buscar convidados para confirma.." 
                           oninput="filterGuests('confirmation', this.value)"
                           style="width: 100%; padding: 12px 16px 12px 48px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px;">
                </div>
                <button onclick="exportToPDF('confirmation')" class="btn btn-secondary" style="padding: 12px 20px;">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
            
            <div class="guests-table">
                <div class="table-header">
                    <div>Nome Completo</div>
                    <div>Email</div>
                    <div>Telefone</div>
                    <div>Status</div>
                    <div>Inscrito em</div>
                    <div>Aes</div>
                </div>
                <div id="confirmation-guests-list">
                    <!-- Lista será preenchida via JavaScript -->
                </div>
            </div>
        </div>
        
        <!-- Aba: Convidados Confirmados -->
        <div id="tab-confirmed" class="tab-content">
            <div class="link-section" style="background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05)); border: 2px solid rgba(74, 144, 226, 0.3);">
                <h3 style="color: #4A90E2; margin-bottom: 12px;"><i class="fas fa-eye"></i> Link Pblico de Visualizao Completa (Portaria)</h3>
                <p style="color: var(--text, #ECECEC); margin-bottom: 20px; font-size: 15px; line-height: 1.6;">
                    <strong>Compartilhe este link com a pessoa da portaria</strong> para que ela possa ver todas as abas (Cadastrados, para Confirmao e Confirmados) em uma nica página pblica.
                </p>
                <div class="link-box">
                    <input type="text" class="link-input" id="public-view-link" readonly style="flex: 1; padding: 14px 16px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px; font-family: monospace;">
                    <button class="btn-copy" onclick="copyToClipboard('public-view-link', event)" style="padding: 14px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                </div>
                <p style="color: var(--text-dark, #A1A1A1); margin-top: 12px; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> A pessoa da portaria poder ver todas as informaes dos convidados em uma página nica e completa.
                </p>
            </div>
            
            <div class="link-section">
                <h3><i class="fas fa-link"></i> Link Pblico para Ver Confirmados</h3>
                <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px;">
                    Compartilhe este link para que as pessoas possam ver a lista de convidados confirmados. Quem tiver o link pode acessar esta aba.
                </p>
                <div class="link-box">
                    <input type="text" class="link-input" id="confirmed-link" readonly>
                    <button class="btn-copy" onclick="copyToClipboard('confirmed-link', event)">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
            </div>
            
            <div class="stats-cards" id="confirmed-stats">
                <!-- Stats seráo preenchidos via JavaScript -->
            </div>
            
            <!-- Busca -->
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                <div style="flex: 1; position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-dark, #A1A1A1);"></i>
                    <input type="text" id="search-confirmed" placeholder="Buscar convidados confirmados..." 
                           oninput="filterGuests('confirmed', this.value)"
                           style="width: 100%; padding: 12px 16px 12px 48px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px;">
                </div>
                <button onclick="exportToPDF('confirmed')" class="btn btn-secondary" style="padding: 12px 20px;">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
            
            <div class="guests-table">
                <div class="table-header">
                    <div>Nome Completo</div>
                    <div>Email</div>
                    <div>Telefone</div>
                    <div>Status</div>
                    <div>Confirmado em</div>
                    <div>Aes</div>
                </div>
                <div id="confirmed-guests-list">
                    <!-- Lista será preenchida via JavaScript -->
                </div>
            </div>
        </div>
        
        <!-- Aba: Links -->
        <div id="tab-links" class="tab-content active">
            <!-- Links para Compartilhar -->
            <div class="link-section" style="background: linear-gradient(135deg, rgba(37, 211, 102, 0.1), rgba(37, 211, 102, 0.05)); border: 2px solid rgba(37, 211, 102, 0.3); margin-bottom: 24px;">
                <h3 style="color: #25D366; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-link"></i> Links para Compartilhar
                </h3>
                
                <!-- Links de Cadastro Personalizados -->
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--text, #ECECEC); margin-bottom: 8px; font-size: 16px; font-weight: 600;">
                        Links de Cadastro Personalizados
                    </h4>
                    <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px; font-size: 14px; line-height: 1.6;">
                        Crie e gerencie links personalizados para cadastro. Crie links personalizados para as pessoas se inscreverem. Cada link pode ter sua prpria descrição, validade e limite de usos.
                    </p>
                    <button onclick="openCreateLinkModal()" class="btn-create-link" style="margin-bottom: 16px; padding: 12px 20px; background: linear-gradient(135deg, #25D366, #1DB954); color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; justify-content: center; width: 100%; max-width: 300px;">
                        <i class="fas fa-plus"></i> Criar Novo Link Personalizado
                    </button>
                    <div id="personalized-links-list">
                        <!-- Links personalizados seráo preenchidos via JavaScript -->
                    </div>
                </div>
                
                <!-- Link da Portaria -->
                <div id="portaria-link-section" style="background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05)); border: 2px solid rgba(74, 144, 226, 0.3); border-radius: 12px; padding: 20px; margin-top: 24px; display: block !important; visibility: visible !important; overflow: visible !important;">
                    <h4 style="color: #4A90E2; margin-bottom: 8px; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-building"></i> Link da Portaria
                    </h4>
                    <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px; font-size: 14px; line-height: 1.6;">
                        Para confirmar chegada dos convidados. Envie este link para o porteiro/recepcionista. Ele poder ver a lista completa, buscar convidados e confirmar presenas.
                    </p>
                    <div class="link-box" style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
                        <input type="text" class="link-input" id="portaria-link" readonly style="flex: 1; padding: 14px 16px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px; font-family: monospace; word-break: break-all;">
                        <button class="btn-copy" onclick="copyToClipboard('portaria-link', event)" style="padding: 14px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                    
                    <!-- Personalizar Link (Slug) -->
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(74, 144, 226, 0.2);">
                        <label style="color: var(--text, #ECECEC); font-size: 14px; font-weight: 600; margin-bottom: 8px; display: block;">
                            Personalizar Link (Slug)
                        </label>
                        <div class="link-box" style="display: flex; gap: 12px; align-items: center;">
                            <input type="text" class="link-input" id="portaria-slug-input" placeholder="ex: kingsuces" style="flex: 1; padding: 12px 16px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px;">
                            <button onclick="savePortariaSlug()" class="btn-copy" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                                <i class="fas fa-save"></i> Salvar
                            </button>
                        </div>
                        <p style="color: var(--text-dark, #A1A1A1); margin-top: 8px; font-size: 12px;">
                            Crie um link curto e fcil de compartilhar. Ex: seusite.com/portaria/kingsuces
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal de Visualizao Completa -->
    <div id="guest-detail-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-user"></i> Dados do Convidado</h2>
                <button class="close-modal" onclick="closeGuestDetailModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="guest-detail-content" class="modal-info">
                <!-- conteúdo será preenchido via JavaScript -->
            </div>
        </div>
    </div>
    
    <!-- Modal de Campos Customizados (integrado com KingForms) -->
    <div id="custom-fields-modal" class="custom-fields-modal">
        <div class="custom-fields-content">
            <div class="custom-fields-header">
                <h2><i class="fas fa-sliders-h"></i> Editar Campos Customizados</h2>
                <button class="close-modal" onclick="closeCustomFieldsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="color: var(--text-dark, #A1A1A1); margin-bottom: 24px; padding: 16px; background: rgba(255, 199, 0, 0.1); border-radius: 8px; border: 1px solid rgba(255, 199, 0, 0.3);">
                <p style="margin: 0; line-height: 1.6;">
                    <strong style="color: var(--dourado-principal, #FFC700);">Integrao com KingForms</strong><br>
                    Você pode criar um formulrio personalizado para a inscriOs campos padrão (Nome, WhatsApp, CPF) seráo sempre includos automaticamente.
                </p>
            </div>
            <div id="custom-fields-editor">
                <!-- conteúdo será preenchido via JavaScript -->
            </div>
        </div>
    </div>
    
    </div> <!-- Fechar guest-list-management-container -->

</body>
</html>

