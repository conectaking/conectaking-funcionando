<!DOCTYPE html>
<html lang="pt-BR" class="form-edit-page-html guest-list-mode">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar Lista de Convidados - King Forms</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    <!-- IMPORTAR TODOS OS ESTILOS DO FORM EDIT -->
    
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/guestListEdit.js'])
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
            <button class="btn btn-secondary ck-gl-4c7da8" onclick="deleteGuestList()">
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
            <div class="link-section ck-gl-1e6637">
                <div class="ck-gl-294406">
                    <h3 class="ck-gl-ecce22">
                        <i class="fas fa-sliders-h"></i> Personalização do Formulrio
                    </h3>
                    <label class="ck-flex-gap-8">
                        <input class="ck-gl-5ef9a4" type="checkbox" id="use-custom-form" onchange="toggleCustomForm()">
                        <span>Usar campos customizados (KingForms)</span>
                    </label>
                </div>
                <div class="ck-gl-9474b6" id="custom-form-builder">
                    <p class="ck-gl-39446f">
                        Personalize o formulrio de inscrio com campos customizados. Se desativado, será usado o formulrio padr</p>
                    <button onclick="openCustomFieldsEditor()" class="btn btn-secondary ck-gl-55a442">
                        <i class="fas fa-edit"></i> Editar Campos Customizados
                    </button>
                    <div class="ck-gl-88c597" id="custom-fields-preview">
                        <i class="fas fa-info-circle"></i> Nenhum campo customizado definido. Clique em "Editar Campos Customizados" para comear.
                    </div>
                </div>
            </div>
            
            <div class="link-section ck-gl-f0a650">
                <h3 class="ck-gl-e4c9a0">
                    <i class="fas fa-link"></i> Link Pblico de Inscrio
                </h3>
                <p class="ck-gl-b5a0a4">
                    <strong>Compartilhe este link</strong> para que as pessoas possam se inscrever no evento. Quando algum preencher o formulrio atravdeste link, os dados seráo salvos <strong>diretamente nesta lista</strong> e aparecero na aba "Convidados Cadastrados".
                </p>
                <div class="link-box ck-gl-bc6560">
                    <input type="text" class="link-input ck-gl-efba8d" id="registration-link" readonly>
                    <button class="btn-copy ck-gl-6f57c8" onclick="copyToClipboard('registration-link', event)">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                </div>
                <p class="ck-gl-dad417">
                    <i class="fas fa-info-circle"></i> Envie este link por WhatsApp, email ou qualquer outro meio. As pessoas que preencherem aparecero aqui automaticamente.
                </p>
            </div>
            
            <div class="stats-cards" id="registered-stats">
                <!-- Stats seráo preenchidos via JavaScript -->
            </div>
            
            <!-- Busca -->
            <div class="ck-gl-7cfd4d">
                <div class="ck-gl-5346d9">
                    <i class="fas fa-search ck-gl-fd556e"></i>
                    <input class="ck-gl-fa30b4" type="text" id="search-registered" placeholder="Buscar convidados cadastrados..." 
                           oninput="filterGuests('registered', this.value)"
                          >
                </div>
                <button onclick="exportToPDF('registered')" class="btn btn-secondary ck-gl-885b48">
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
                <p class="ck-gl-8de580">
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
            <div class="ck-gl-7cfd4d">
                <div class="ck-gl-5346d9">
                    <i class="fas fa-search ck-gl-fd556e"></i>
                    <input class="ck-gl-fa30b4" type="text" id="search-confirmation" placeholder="Buscar convidados para confirma.." 
                           oninput="filterGuests('confirmation', this.value)"
                          >
                </div>
                <button onclick="exportToPDF('confirmation')" class="btn btn-secondary ck-gl-885b48">
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
            <div class="link-section ck-gl-4777d3">
                <h3 class="ck-gl-ee6781"><i class="fas fa-eye"></i> Link Pblico de Visualizao Completa (Portaria)</h3>
                <p class="ck-gl-b5a0a4">
                    <strong>Compartilhe este link com a pessoa da portaria</strong> para que ela possa ver todas as abas (Cadastrados, para Confirmao e Confirmados) em uma nica página pblica.
                </p>
                <div class="link-box">
                    <input type="text" class="link-input ck-gl-efba8d" id="public-view-link" readonly>
                    <button class="btn-copy ck-gl-719d3e" onclick="copyToClipboard('public-view-link', event)">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                </div>
                <p class="ck-gl-dad417">
                    <i class="fas fa-info-circle"></i> A pessoa da portaria poder ver todas as informaes dos convidados em uma página nica e completa.
                </p>
            </div>
            
            <div class="link-section">
                <h3><i class="fas fa-link"></i> Link Pblico para Ver Confirmados</h3>
                <p class="ck-gl-8de580">
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
            <div class="ck-gl-7cfd4d">
                <div class="ck-gl-5346d9">
                    <i class="fas fa-search ck-gl-fd556e"></i>
                    <input class="ck-gl-fa30b4" type="text" id="search-confirmed" placeholder="Buscar convidados confirmados..." 
                           oninput="filterGuests('confirmed', this.value)"
                          >
                </div>
                <button onclick="exportToPDF('confirmed')" class="btn btn-secondary ck-gl-885b48">
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
            <div class="link-section ck-gl-f02528">
                <h3 class="ck-gl-23f0b6">
                    <i class="fas fa-link"></i> Links para Compartilhar
                </h3>
                
                <!-- Links de Cadastro Personalizados -->
                <div class="ck-gl-8d7033">
                    <h4 class="ck-gl-f0acb1">
                        Links de Cadastro Personalizados
                    </h4>
                    <p class="ck-gl-6eeacc">
                        Crie e gerencie links personalizados para cadastro. Crie links personalizados para as pessoas se inscreverem. Cada link pode ter sua prpria descrição, validade e limite de usos.
                    </p>
                    <button onclick="openCreateLinkModal()" class="btn-create-link ck-gl-628329">
                        <i class="fas fa-plus"></i> Criar Novo Link Personalizado
                    </button>
                    <div id="personalized-links-list">
                        <!-- Links personalizados seráo preenchidos via JavaScript -->
                    </div>
                </div>
                
                <!-- Link da Portaria -->
                <div class="ck-gl-3141c1" id="portaria-link-section">
                    <h4 class="ck-gl-6ee1ec">
                        <i class="fas fa-building"></i> Link da Portaria
                    </h4>
                    <p class="ck-gl-6eeacc">
                        Para confirmar chegada dos convidados. Envie este link para o porteiro/recepcionista. Ele poder ver a lista completa, buscar convidados e confirmar presenas.
                    </p>
                    <div class="link-box ck-gl-00f0d1">
                        <input type="text" class="link-input ck-gl-eaf047" id="portaria-link" readonly>
                        <button class="btn-copy ck-gl-719d3e" onclick="copyToClipboard('portaria-link', event)">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                    
                    <!-- Personalizar Link (Slug) -->
                    <div class="ck-gl-9375d9">
                        <label class="ck-gl-b6cf64">
                            Personalizar Link (Slug)
                        </label>
                        <div class="link-box ck-gl-bc6560">
                            <input type="text" class="link-input ck-gl-899351" id="portaria-slug-input" placeholder="ex: kingsuces">
                            <button onclick="savePortariaSlug()" class="btn-copy ck-gl-a864d4">
                                <i class="fas fa-save"></i> Salvar
                            </button>
                        </div>
                        <p class="ck-gl-0986f3">
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
            <div class="ck-gl-f037ae">
                <p class="ck-gl-bf1659">
                    <strong class="ck-gl-03ce61">Integrao com KingForms</strong><br>
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

