<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Meu Painel - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
<!-- Navegação para páginas externas do sidebar (King Docs, Bíblia, etc.):
         o dashboard.js faz preventDefault em .nav-link — permitir sair do SPA. -->
<script src="/config.js?v=2026-09-09-vite1"></script>
    
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">

    <!-- Cache-buster para CSS - Atualizado para forçar reload -->
    
    <!-- Stubs: se o .js abaixo falhar (404 no deploy), dashboard.js ainda encontra as funções. O ficheiro real substitui estes no load. -->

@vite(['resources/css/fontawesome.css', 'resources/js/pages/dashboard.js'])
</head>
<body>

    <div id="ck-plan-block-overlay" role="dialog" aria-modal="true" aria-label="Acesso ao painel" aria-hidden="true">
        <div class="ck-plan-block-card">
            <p id="ck-plan-block-msg" class="ck-plan-block-msg"></p>
            <div class="ck-plan-block-actions">
                <button type="button" id="ck-plan-block-ok">Entendi</button>
                <button type="button" id="ck-plan-block-exit">Sair e entrar com outra conta</button>
            </div>
        </div>
    </div>
<div class="dashboard-layout"><button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Menu">
    <i class="fas fa-bars"></i>
</button>
<aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <a href="/" class="logo-link">
            <img src="logo.png" alt="Conecta King" class="logo-image">
            <span class="logo-text">CONECTA KING</span>
        </a>
    </div>
    
    <div class="sidebar-tabs">
        <button class="sidebar-tab active" data-tab="perfis">Perfis</button>
        <button class="sidebar-tab" data-tab="times">Empresa</button>
    </div>
    
    <div class="profile-card-sidebar" id="profile-card-sidebar">
        <div class="profile-avatar-sidebar">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzAiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI3NSIgeT0iODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+RiDwvdGV4dD48L3N2Zz4=" alt="Avatar" id="sidebar-profile-avatar">
        </div>
        <div class="profile-info-sidebar">
            <div class="profile-name-sidebar" id="sidebar-profile-name"></div>
            <div class="profile-handle-sidebar" id="sidebar-profile-handle"></div>
        </div>
    </div>
    
    <button class="btn-ver-monocard" id="btn-ver-monocard">
        <i class="fas fa-eye"></i> Ver Cartão
    </button>
    
    <nav class="sidebar-nav">
        <a href="#" class="nav-link active" data-target="editar-pane" title="Editar Conecta King"><i class="fas fa-pencil-alt"></i> <span>Editar Conecta King</span></a>
        <a href="#" class="nav-link ck-hidden" data-target="separacao-pacotes-pane" id="separacao-pacotes-link" title="Separação de Pacotes"><i class="fas fa-layer-group"></i> <span>Separação de Pacotes</span></a>
        <a href="#" class="nav-link nav-link-by-plan ck-hidden" data-module="finance" data-target="finance-pane" id="finance-link" title="Gestão Financeira"><i class="fas fa-wallet"></i> <span>Gestão Financeira</span></a>
        <a href="/kingForms" class="nav-link nav-link-by-plan" data-module="digital_form" id="king-forms-sidebar-link" title="King Forms"><i class="fas fa-file-signature"></i> <span>King Forms</span></a>
        <a href="/kingSelection?v=2026-09-08-no-render" class="nav-link nav-link-by-plan ck-hidden" data-module="king_selection" id="king-selection-sidebar-link" title="King Selection"><i class="fas fa-check-double"></i> <span>King Selection</span></a>
        <a href="/bibliaking" class="nav-link" id="bible-sidebar-link" title="Bíblia"><i class="fas fa-bible"></i> <span>Bíblia</span></a>
        <a href="/kingDocs" class="nav-link nav-link-by-plan" data-module="king_docs" id="king-docs-sidebar-link" title="King Docs"><i class="fas fa-file-shield"></i> <span>King Docs</span></a>
        <a href="/recibos-orcamentos" class="nav-link nav-link-by-plan ck-hidden" data-module="recibos_orcamentos" id="recibos-orcamentos-sidebar-link" title="Recibos e Orçamentos"><i class="fas fa-file-invoice-dollar"></i> <span>Recibos e Orçamentos</span></a>
        <a href="#" class="nav-link" data-target="relatorios-pane" title="Relatórios"><i class="fas fa-chart-bar"></i> <span>Relatórios</span></a>
        <a href="#" class="nav-link" data-target="compartilhar-pane" title="Compartilhar"><i class="fas fa-share-alt"></i> <span>Compartilhar</span></a>
        <a href="#" class="nav-link nav-link-by-plan ck-hidden" data-module="branding" data-target="branding-pane" id="branding-link" title="Personalização da Marca"><i class="fas fa-palette"></i> <span>Personalização da Marca</span></a>
    </nav>
    
    <div class="sidebar-footer">
        <div class="footer-section-title">DADOS GERAIS DA CONTA</div>
        <a href="/admin/" class="nav-link ck-hidden" id="adm-link"><i class="fas fa-user-shield"></i> <span>ADM</span></a>
        <a href="/admin-devocionais-365" class="nav-link ck-hidden" id="dev365-admin-link"><i class="fas fa-book-open"></i> <span>Bíblia &amp; Devocionais</span></a>
        <a href="#" class="nav-link ck-hidden" data-target="personalizar-link-pane" id="personalizar-link-link" title="Personalizar Link do Site"><i class="fas fa-link"></i> <span>Personalizar Link</span></a>
        <a href="#" class="nav-link" data-target="assinatura-pane" id="assinatura-link"><i class="fas fa-crown"></i> <span>Assinatura</span></a>
        <a href="business/?only=logo" class="nav-link ck-hidden" id="personalizacao-logo-link" title="Personalizar Logo"><i class="fas fa-palette"></i> <span>Personalizar Logo</span></a>
        <a href="#" id="logout-btn" class="nav-link" title="Sair"><i class="fas fa-sign-out-alt"></i> <span>Sair</span></a>
    </div>
</aside>

        <div class="content-wrapper">
            <main class="main-content active" id="editar-pane" data-pane>
                <header class="content-header">
                    <div class="header-title-wrapper">
                        <h1 class="header-title-top">EDITAR</h1>
                        <h1 class="header-title-bottom">CARTÃO VIRTUAL</h1>
                    </div>
                    <div class="header-actions">
                        <button id="tutorial-btn" class="btn btn-tutorial" title="Tutorial Interativo - Aprenda passo a passo">
                            <i class="fas fa-graduation-cap"></i> Tutorial
                        </button>
                        <button id="header-save-btn" class="btn btn-save-header">
                            <i class="fas fa-check"></i> Publicar alterações
                        </button>
                    </div>
                </header>
                
                <!-- Chips de cores -->
                
                <nav class="editor-nav">
                    <a href="#" class="editor-nav-link active" data-editor-target="modelos-editor">
                        <i class="fas fa-layer-group"></i> Modelos
                    </a>
                    <a href="#" class="editor-nav-link" data-editor-target="info-editor">
                        <i class="fas fa-info-circle"></i> Informações
                    </a>
                    <a href="#" class="editor-nav-link" data-editor-target="items-editor">
                        <i class="fas fa-th"></i> Módulos
                    </a>
                    <a href="#" class="editor-nav-link" data-editor-target="personalizar-editor">
                        <i class="fas fa-palette"></i> Personalizar
                    </a>
                </nav>

                <div class="editor-area">
 <div id="modelos-editor" class="editor-pane active">
    <div class="info-section-header">
        <h4><i class="fas fa-layer-group"></i> Modelos de Cartão</h4>
        <p class="ck-db-e050d4">Escolha o layout do seu cartão. O Modelo Clássico é o atual; o Modelo Vitrine usa arte no topo e faixa rolante.</p>
    </div>
    <div class="card-layout-selector ck-db-16363f" id="card-layout-selector">
        <button type="button" class="card-layout-card active ck-db-3158e7" data-layout="classic" id="card-layout-classic">
            <div class="ck-db-0e2afc"><i class="fas fa-id-card"></i> Modelo Clássico</div>
            <div class="ck-db-f6ac6d">Avatar, nome, bio e módulos em coluna — o cartão que você já usa.</div>
        </button>
        <button type="button" class="card-layout-card ck-db-777626" data-layout="vitrine" id="card-layout-vitrine">
            <div class="ck-db-0e2afc"><i class="fas fa-panorama"></i> Modelo Vitrine</div>
            <div class="ck-db-f6ac6d">Arte larga no topo, faixa de texto rolante, banners e bloco texto com botão.</div>
        </button>
    </div>

    <div class="ck-db-1fe563" id="vitrine-settings-panel">
        <h5 class="ck-db-b019c1"><i class="fas fa-image"></i> Arte do topo (proporção 16:9)</h5>
        <a href="img/guia-arte-vitrine-1920x1080.png" download="guia-arte-vitrine-1920x1080.png" class="btn btn-secondary ck-db-2d95ad">
            <i class="fas fa-download"></i> Baixar guia de medidas
        </a>
        <div id="vitrine-hero-upload-area" class="photo-upload-area ck-db-f1ec84">
            <img class="ck-db-3a8281" id="vitrine-hero-preview" src="" alt="Arte Vitrine">
            <div class="ck-db-45ae9d" id="vitrine-hero-placeholder">
                <i class="fas fa-cloud-upload-alt ck-db-ad3ec4"></i>
                <span>Clique para enviar a arte do topo</span>
                <span class="ck-db-292511">Você poderá ajustar o enquadramento (16:9)</span>
            </div>
            <input class="ck-db-75c55c" type="file" id="vitrine-hero-file-input" accept="image/*">
        </div>
        <button type="button" id="vitrine-hero-remove-btn" class="btn btn-secondary ck-db-7b4333"><i class="fas fa-trash"></i> Remover arte</button>

        <div class="input-group ck-db-9eb125">
            <label for="vitrine-marquee-text">Texto da faixa rolante</label>
            <input type="text" id="vitrine-marquee-text" placeholder="Ex: PRÓXIMA TURMA: 18 a 20 de Setembro | Santos/SP" maxlength="200">
            <p class="input-hint">Aparece logo abaixo da arte, passando de lado. A logomarca (se houver) fica na frente do texto.</p>
        </div>
        <div class="input-group">
            <label>Cor da faixa (fundo)</label>
            <div class="ck-flex-wrap-mt">
                <label class="ck-flex-gap-6"><input type="radio" name="vitrine-marquee-bg-type" value="solid" checked> Cor sólida</label>
                <label class="ck-flex-gap-6"><input type="radio" name="vitrine-marquee-bg-type" value="gradient"> Degradê</label>
            </div>
            <div class="ck-db-875a65">
                <div>
                    <label class="ck-hint-dark" for="vitrine-marquee-color1">Cor 1 (fundo)</label>
                    <input class="ck-db-286eb5" type="color" id="vitrine-marquee-color1" value="#2A2A2E">
                </div>
                <div id="vitrine-marquee-color2-wrap">
                    <label class="ck-hint-dark" for="vitrine-marquee-color2">Cor 2 (degradê)</label>
                    <input class="ck-db-286eb5" type="color" id="vitrine-marquee-color2" value="#FFC700">
                </div>
            </div>
            <div class="ck-db-d8c9dc">
                <label class="ck-db-280c25" for="vitrine-marquee-text-color">
                    <i class="fas fa-font"></i> Cor do texto da faixa rolante
                </label>
                <div class="ck-db-f2f0b3">
                    <input class="ck-db-87dc0b" type="color" id="vitrine-marquee-text-color" value="#FFC700">
                    <input class="ck-db-6efe3a" type="text" id="vitrine-marquee-text-color-hex" value="#FFC700" maxlength="7" placeholder="#FFC700">
                    <span class="ck-db-85d1a1">Escolha a cor ou digite o código (#RRGGBB)</span>
                </div>
            </div>
            <p class="input-hint">No degradê, o fundo da faixa vai da Cor 1 para a Cor 2. A cor do texto é independente.</p>
        </div>
        <div class="input-group">
            <label>Velocidade da faixa</label>
            <div class="ck-flex-wrap-mt">
                <label class="ck-flex-gap-6"><input type="radio" name="vitrine-marquee-speed" value="slow" checked> Lenta</label>
                <label class="ck-flex-gap-6"><input type="radio" name="vitrine-marquee-speed" value="normal"> Normal</label>
                <label class="ck-flex-gap-6"><input type="radio" name="vitrine-marquee-speed" value="fast"> Rápida</label>
            </div>
        </div>
        <div class="input-group">
            <label>Logomarca na frente do texto (até 3)</label>
            <p class="input-hint ck-db-a3a556">A primeira logo aparece logo antes do nome/texto que rola. Você pode adicionar até 3.</p>
            <div class="ck-db-989c32" id="vitrine-marquee-logos-list"></div>
            <input type="file" id="vitrine-marquee-logo-input" accept="image/*" class="ck-hidden">
            <button type="button" id="vitrine-marquee-logo-add" class="btn btn-secondary ck-db-22d055"><i class="fas fa-plus"></i> Adicionar logomarca</button>
        </div>
        <div class="input-group ck-db-9374e8">
            <label class="ck-db-4868a8">
                <input type="checkbox" id="vitrine-show-footer">
                Mostrar rodapé com nome e direitos reservados
            </label>
        </div>
        <div class="ck-db-a42dcb" id="vitrine-live-mini-preview">
            <div class="ck-db-d938d3" id="vitrine-mini-hero">Preview da arte</div>
            <div class="ck-db-fd4a3b" id="vitrine-mini-marquee">Faixa rolante</div>
        </div>
    </div>
</div>

 <div id="info-editor" class="editor-pane">
    <div class="info-section-header">
        <h4><i class="fas fa-user"></i> Informações do Perfil</h4>
    </div>
    
    <!-- Campos sempre visíveis -->
    <div class="info-editor-fields" id="info-editor-fields">
        <div class="info-editor-layout">
            <!-- Foto de perfil -->
            <div id="dashboard-photo-upload-area" class="photo-upload-area" title="Clique para alterar a foto">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzAiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI3NSIgeT0iODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+RiDwvdGV4dD48L3N2Zz4=" alt="Avatar do Usuário" id="dashboard-photo-preview">
                <div class="upload-overlay"><i class="fas fa-pencil-alt"></i></div>
                <div class="upload-loader"></div>
                <input class="ck-db-49296c" type="file" id="dashboard-photo-file-input" accept="image/*">
            </div>
            
            <div class="info-editor-fields-inner">
                <!-- Nome do perfil -->
                <div class="input-group">
                    <label for="displayName">Alterar o nome do perfil</label>
                    <input type="text" id="displayName" placeholder="Nome do perfil">
                </div>
                
                <!-- WhatsApp -->
                <div class="input-group">
                    <label for="whatsappNumber">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </label>
                    <input type="text" id="whatsappNumber" placeholder="5511999999999" maxlength="20">
                    <p class="input-hint">Digite apenas números com código do país (ex: 5511999999999 para Brasil, 12125551234 para EUA). Este número será usado no botão "Salvar Contato".</p>
                </div>
                
                <!-- Formato do Avatar (embaixo do nome) -->
                <div id="avatar-format-selector" class="avatar-format-selector">
                    <label class="avatar-format-label">Formato do Avatar</label>
                    <p class="avatar-format-description">Escolha como o avatar aparecerá no seu cartão virtual: circular, quadrado grande ou quadrado pequeno.</p>
                    <div class="avatar-format-options">
                        <button type="button" class="avatar-format-btn" data-format="circular" title="Circular">
                            <i class="fas fa-circle"></i>
                            <span>Circular</span>
                        </button>
                        <button type="button" class="avatar-format-btn" data-format="square-full" title="Quadrado Grande">
                            <i class="fas fa-square"></i>
                            <span>Quadrado Grande</span>
                        </button>
                        <button type="button" class="avatar-format-btn" data-format="square-small" title="Quadrado Pequeno">
                            <i class="fas fa-stop"></i>
                            <span>Quadrado Pequeno</span>
                        </button>
                    </div>
                </div>
                
                <!-- @ do Instagram -->
                <div class="input-group">
                    <label for="profileSlug">Alterar o @ do Instagram</label>
                    <div class="slug-input-wrapper">
                        <span class="slug-prefix">cnking.bio/</span>
                        <input type="text" id="profileSlug" placeholder="seu-usuario">
                    </div>
                    <button type="button" class="btn-copy-slug" id="btn-copy-slug" title="Copiar link do perfil">
                        <i class="fas fa-copy"></i>
                        <span>Copiar</span>
                    </button>
                    <p class="input-hint">Cole este link no seu perfil do Instagram para que seus seguidores encontrem seu cartão virtual.</p>
                </div>
                
                <!-- Biografia -->
                <div class="input-group">
                    <label for="bio">Biografia do perfil</label>
                    <textarea id="bio" rows="4" placeholder="Uma breve descrição sobre você..."></textarea>
                </div>
            </div>
        </div>
    </div>
</div>

                    <div id="items-editor" class="editor-pane">
                        <div class="modules-section-header">
                            <h4><i class="fas fa-th"></i> Módulos Ativos</h4>
                        </div>
                        <div class="modules-actions">
                            <button id="add-item-btn" class="btn btn-add-module"><i class="fas fa-plus"></i> Adicionar</button>
                        </div>
                        <div id="items-container" class="modules-list links-editor-list"></div>
                        
                        <!-- Seção de Gerenciamento de Abas -->
                    </div>

                    <div id="personalizar-editor" class="editor-pane">
                        <div class="config-section-header">
                            <h4><i class="fas fa-cog"></i> Configurações</h4>
                        </div>
                        <div class="config-options-list">
                            <button class="config-option-btn" id="btn-config-cabecalho">
                                <i class="fas fa-share-alt"></i>
                                <span>Imagem de compartilhamento</span>
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        
                        <!-- Configurações sempre visíveis -->
                        <div class="config-expanded-content" id="config-expanded-content">
                        <div data-section="fundo">
                        <h4><i class="fas fa-image"></i> Fundo de Tela</h4>

                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-address-card"></i>
                                <span>Botão "Salvar Contato"</span>
                            </div>
                            <div class="setting-control">
                                <div class="segmented-control">
                                    <input type="radio" id="vcard-on" name="vcard-toggle" value="true" checked>
                                    <label for="vcard-on"><i class="fas fa-eye"></i> Visível</label>
                                    <input type="radio" id="vcard-off" name="vcard-toggle" value="false">
                                    <label for="vcard-off"><i class="fas fa-eye-slash"></i> Oculto</label>
                                </div>
                            </div>
                        </div>

                        <div class="setting-item ck-hidden" id="bible-visibility-setting">
                            <div class="setting-label">
                                <i class="fas fa-bible"></i>
                                <span>Bíblia</span>
                            </div>
                            <div class="setting-control">
                                <div class="segmented-control">
                                    <input type="radio" id="bible-on" name="bible-toggle" value="true" checked>
                                    <label for="bible-on"><i class="fas fa-eye"></i> Visível</label>
                                    <input type="radio" id="bible-off" name="bible-toggle" value="false">
                                    <label for="bible-off"><i class="fas fa-eye-slash"></i> Oculto</label>
                                </div>
                            </div>
                        </div>
                        <div class="setting-item ck-hidden" id="bible-verse-position-setting">
                            <div class="setting-label">
                                <i class="fas fa-arrows-alt-v"></i>
                                <span>Palavra do Dia — posição</span>
                            </div>
                            <div class="setting-control">
                                <div class="segmented-control">
                                    <input type="radio" id="bible-verse-pos-top" name="bible-verse-position" value="top" checked>
                                    <label for="bible-verse-pos-top">Em cima</label>
                                    <input type="radio" id="bible-verse-pos-bottom" name="bible-verse-position" value="bottom">
                                    <label for="bible-verse-pos-bottom">Embaixo (logo)</label>
                                </div>
                            </div>
                        </div>
                        <div class="setting-item ck-hidden" id="bible-verse-size-setting">
                            <div class="setting-label">
                                <i class="fas fa-text-height"></i>
                                <span>Palavra do Dia — tamanho</span>
                            </div>
                            <div class="setting-control">
                                <div class="segmented-control">
                                    <input type="radio" id="bible-verse-size-normal" name="bible-verse-size" value="normal" checked>
                                    <label for="bible-verse-size-normal">Normal</label>
                                    <input type="radio" id="bible-verse-size-small" name="bible-verse-size" value="small">
                                    <label for="bible-verse-size-small">Menor</label>
                                    <input type="radio" id="bible-verse-size-xsmall" name="bible-verse-size" value="xsmall">
                                    <label for="bible-verse-size-xsmall">Bem menor</label>
                                </div>
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-font"></i>
                                <span>Fonte</span>
                            </div>
                            <div class="setting-control">
                                <select id="font-family-select">
                                    <option value="Inter">Inter (Moderna)</option>
                                    <option value="Roboto Slab">Roboto Slab (Elegante)</option>
                                    <option value="Lora">Lora (Clássica)</option>
                                </select>
                            </div>
                        </div>
                        <br>
                        <br>
                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-image"></i>
                                <span>Tipo de Fundo</span>
                            </div>
                            <div class="setting-control">
                                <div class="segmented-control">
                                    <input type="radio" id="bg-type-color" name="bg-type" value="color" checked>
                                    <label for="bg-type-color"><i class="fas fa-palette"></i> Cor</label>
                                    <input type="radio" id="bg-type-image" name="bg-type" value="image">
                                    <label for="bg-type-image"><i class="fas fa-image"></i> Imagem</label>
                                </div>
                            </div>
                        </div>
                        
                        <div id="background-color-container">
                            <div class="setting-item">
                                <div class="setting-label">
                                    <i class="fas fa-fill-drip"></i>
                                    <span>Cor de Fundo</span>
                                </div>
                                <div class="setting-control">
                                    <input type="color" id="background-color-picker" value="#0D0D0F">
                                </div>
                            </div>
                        </div>
                        
                            <div id="background-image-container" class="ck-hidden">
                                <p class="input-hint ck-db-5e9a86">
                                    <strong class="ck-db-dee14c">Antes de escolher o ficheiro:</strong> use foto grande em <strong>16:9</strong> (<strong>1920×1080</strong> px).
                                    No celular a foto é cortada nas laterais — o que importa (logo, rosto, texto) deve ficar na <strong>faixa central</strong>.
                                </p>
                                <a href="img/guia-fundo-cartao-1920x1080.png" download="guia-fundo-cartao-1920x1080.png" class="btn btn-secondary ck-db-2d95ad">
                                    <i class="fas fa-download"></i> Baixar guia de medidas (Photoshop)
                                </a>
                                <p class="input-hint ck-db-a6fad3">
                                    O PNG tem a <strong class="ck-db-dee14c">borda dourada do desktop</strong>, o <strong class="ck-db-729d2f">risco tracejado do mobile</strong> no meio e o círculo para a logomarca. Abra no Photoshop como camada de cima e enquadre a arte.
                                </p>
                                <div class="setting-item">
                                    <div class="setting-label">
                                        <i class="fas fa-image"></i>
                                        <span>Imagem de Fundo</span>
                                    </div>
                                    <div class="setting-control">
                                        <div id="background-upload-area" class="image-upload-area small-upload">
                                            <input type="file" id="background-file-input" accept="image/*" class="ck-hidden">
                                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzMzMzIi8+CjxwYXRoIGQ9Ik03NSA0MEM4NS4yODQzIDQwIDkzLjMzMzMgNDguMDQ5IDkzLjMzMzMgNTguMzMzM0M5My4zMzMzIDY4LjYxNzcgODUuMjg0MyA3Ni42NjY3IDc1IDc2LjY2NjdDNjQuNzE1NyA3Ni42NjY3IDU2LjY2NjcgNjguNjE3NyA1Ni42NjY3IDU4LjMzMzNDNTYuNjY2NyA0OC4wNDkgNjQuNzE1NyA0MCA3NSA0MFoiIGZpbGw9IiM2NjY2NjYiLz4KPHBhdGggZD0iTTQ1IDExMEM1NS4yODQzIDExMCA2My4zMzMzIDExOC4wNDkgNjMuMzMzMyAxMjguMzMzQzYzLjMzMzMgMTM4LjYxOCA1NS4yODQzIDE0Ni42NjcgNDUgMTQ2LjY2N0MzNC43MTU3IDE0Ni42NjcgMjYuNjY2NyAxMzguNjE4IDI2LjY2NjcgMTI4LjMzM0MyNi42NjY3IDExOC4wNDkgMzQuNzE1NyAxMTAgNDUgMTEwWiIgZmlsbD0iIzY2NjY2NiIvPgo8cGF0aCBkPSJNMTA1IDExMEMxMTUuMjg0IDExMCAxMjMuMzMzIDExOC4wNDkgMTIzLjMzMyAxMjguMzMzQzEyMy4zMzMgMTM4LjYxOCAxMTUuMjg0IDE0Ni42NjcgMTA1IDE0Ni42NjdDOTQuNzE1NyAxNDYuNjY3IDg2LjY2NjcgMTM4LjYxOCA4Ni42NjY3IDEyOC4zMzNDODYuNjY2NyAxMTguMDQ5IDk0LjcxNTcgMTEwIDEwNSAxMTBaIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9Ijc1IiB5PSIxMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiI+SW1hZ2VtPC90ZXh0Pgo8L3N2Zz4K" id="background-image-preview" class="banner-preview-thumb" alt="Preview Fundo"/>
                                            <div class="image-upload-text">
                                                <p>Alterar Imagem</p>
                                                <span>Clique para enviar</span>
                                            </div>
                                            <div class="upload-loader"></div>
                                        </div>
                                        <input type="hidden" id="background-image-url-input">
                                    </div>
                                </div>
                                    <div class="setting-item">
                                <div class="setting-label">
                                    <i class="fas fa-low-vision"></i>
                                    <span>Opacidade da Imagem de Fundo</span>
                                </div>
                                <div class="setting-control range-control">
                                    <span id="background-image-opacity-value">100%</span>
                                    <input type="range" id="background-image-opacity-picker" min="0" max="1" step="0.05" value="1">
                                </div>
                            </div>
                            </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-square-full"></i>
                                <span>Cor do Texto</span>
                            </div>
                            <div class="setting-control">
                                <input type="color" id="text-color-picker" value="#ECECEC">
                            </div>
                        </div>
                        <br>
                        <h4 class=""><i class="fas fa-id-card"></i> Card Principal</h4>
                        <br>
                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-paint-roller"></i>
                                <span>Cor de Fundo do Card</span>
                            </div>
                            <div class="setting-control">
                                <input type="color" id="card-background-color-picker" value="#141417">
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-low-vision"></i>
                                <span>Opacidade do Fundo do Card</span>
                            </div>
                            <div class="setting-control range-control">
                                <span id="card-opacity-value">100%</span>
                                <input type="range" id="card-opacity-picker" min="0" max="1" step="0.05" value="1">
                            </div>
                        </div>
                        <br>
                        <h4 class=""><i class="fas fa-link"></i> Botões (Módulos)</h4>
                        <br>
                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-fill"></i>
                                <span>Cor dos Botões</span>
                            </div>
                            <div class="setting-control">
                                <input type="color" id="button-color-picker" value="#1C1C21">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-pen-nib"></i>
                                <span>Cor do Texto dos Botões</span>
                            </div>
                            <div class="setting-control">
                                <input type="color" id="button-text-color-picker" value="#FFFFFF">
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-low-vision"></i>
                                <span>Opacidade dos Botões</span>
                            </div>
                            <div class="setting-control range-control">
                                <span id="button-opacity-value">100%</span>
                                <input type="range" id="button-opacity-picker" min="0.1" max="1" step="0.05" value="1">
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-text-height"></i>
                                <span>Tamanho da Fonte</span>
                            </div>
                            <div class="setting-control range-control">
                                <span id="button-font-size-value">16px</span>
                                <input type="range" id="button-font-size-picker" min="12" max="22" step="1" value="16">
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-align-center"></i>
                                <span>Alinhamento do Conteúdo</span>
                            </div>
                            <div class="setting-control">
                                <div class="segmented-control">
                                    <input type="radio" id="align-left" name="button-align" value="left">
                                    <label for="align-left"><i class="fas fa-align-left"></i></label>
                                    <input type="radio" id="align-center" name="button-align" value="center" checked>
                                    <label for="align-center"><i class="fas fa-align-center"></i></label>
                                    <input type="radio" id="align-right" name="button-align" value="right">
                                    <label for="align-right"><i class="fas fa-align-right"></i></label>
                                </div>
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-arrows-alt-h"></i>
                                <span>Aproximação da logo</span>
                            </div>
                            <div class="setting-control">
                                <div class="segmented-control">
                                    <input type="radio" id="logo-align-left" name="logo-align" value="left">
                                    <label for="logo-align-left"><i class="fas fa-align-left"></i></label>
                                    <input type="radio" id="logo-align-center" name="logo-align" value="center" checked>
                                    <label for="logo-align-center"><i class="fas fa-align-center"></i></label>
                                    <input type="radio" id="logo-align-right" name="logo-align" value="right">
                                    <label for="logo-align-right"><i class="fas fa-align-right"></i></label>
                                </div>
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <i class="fas fa-border-style"></i>
                                <span>Curvatura da Borda</span>
                            </div>
                            <div class="setting-control ck-db-6691b5">
                                <div class="segmented-control">
                                    <input type="radio" id="radius-preset-all" name="radius-preset" value="all" checked>
                                    <label for="radius-preset-all">Uniforme</label>
                                    <input type="radio" id="radius-preset-alt" name="radius-preset" value="alt">
                                    <label for="radius-preset-alt">Alternado</label>
                                    <input type="radio" id="radius-preset-square" name="radius-preset" value="square">
                                    <label for="radius-preset-square">Quadrado</label>
                                    <input type="radio" id="radius-preset-soft" name="radius-preset" value="soft">
                                    <label for="radius-preset-soft">Suave</label>
                                    <input type="radio" id="radius-preset-pill" name="radius-preset" value="pill">
                                    <label for="radius-preset-pill">Pílula</label>
                                    <input type="radio" id="radius-preset-top" name="radius-preset" value="top">
                                    <label for="radius-preset-top">Só Topo</label>
                                    <input type="radio" id="radius-preset-bottom" name="radius-preset" value="bottom">
                                    <label for="radius-preset-bottom">Só Base</label>
                                    <input type="radio" id="radius-preset-diagonal" name="radius-preset" value="diagonal">
                                    <label for="radius-preset-diagonal">Diagonal</label>
                                    <input type="radio" id="radius-preset-invert" name="radius-preset" value="invert">
                                    <label for="radius-preset-invert">Invertido</label>
                                </div>
                                <div class="radius-grid-4">
                                    <label>Topo Esq.<input type="number" id="radius-tl" min="0" value="12"></label>
                                    <label>Topo Dir.<input type="number" id="radius-tr" min="0" value="12"></label>
                                    <label>Base Esq.<input type="number" id="radius-bl" min="0" value="12"></label>
                                    <label>Base Dir.<input type="number" id="radius-br" min="0" value="12"></label>
                                </div>
                                <div class="ck-db-c6926f">
                                    <small id="button-border-radius-value">12px 12px 12px 12px</small>
                                    <button id="save-radius-default-btn" class="btn btn-secondary" type="button" title="Salvar esses valores como padrão">Aplicar como padrão</button>
                                </div>
                            </div>
                        </div>
                        </div>
                        </div>
            </main>
            
            <!-- Páginas adicionais que aparecem nas imagens -->
            <main id="eventos-pane" class="main-content ck-hidden" data-pane>
                <header class="content-header">
                    <h1>Últimos eventos</h1>
                </header>
                <p>Página em desenvolvimento</p>
            </main>
            
<!-- Página de Finanças -->
            <main id="finance-pane" class="main-content ck-hidden" data-pane>
                <header class="content-header">
                    <h1><i class="fas fa-wallet"></i> Gestão Financeira</h1>
                    <p class="ck-text-muted-mt">
                        Controle suas receitas, despesas, contas e orçamentos
                    </p>
                </header>
                <div class="ck-db-f8d354" id="finance-content">
                    <p class="ck-db-b4058b">
                        Carregando módulo financeiro...
                    </p>
                </div>
            </main>
            
            <!-- Página King Forms (mesma página, iframe) -->
            <main id="king-forms-pane" class="main-content ck-hidden" data-pane>
                <header class="content-header">
                    <h1><i class="fas fa-file-signature"></i> King Forms</h1>
                    <p class="ck-text-muted-mt">
                        Crie e gerencie vários formulários. Edite e apague na lista abaixo.
                    </p>
                </header>
                <div class="ck-db-851de4" id="king-forms-content">
                    <iframe class="ck-db-b125cd" id="king-forms-iframe" src="about:blank" title="King Forms"></iframe>
                </div>
            </main>
            
<main id="relatorios-pane" class="main-content" data-pane>
                <header class="content-header">
                    <h1>Relatórios de Desempenho</h1>
                    <div class="header-actions">
                        <select id="period-selector" class="btn btn-secondary">
                            <option value="7">Últimos 7 dias</option>
                            <option value="30" selected>Últimos 30 dias</option>
                            <option value="90">Últimos 90 dias</option>
                        </select>
                    </div>
                </header>

                <div class="reports-grid">
                    <div class="stat-card">
                        <h4>Total de Visualizações</h4>
                        <p id="kpi-total-views">...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Total de Cliques</h4>
                        <p id="kpi-total-clicks">...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Taxa de Clique (CTR)</h4>
                        <p id="kpi-ctr">...%</p>
                    </div>
                    <div class="stat-card">
                        <h4>Contatos Salvos</h4>
                        <p id="kpi-total-saves">...</p>
                    </div>

                    <div class="chart-container">
                        <h3>Visualizações e Cliques</h3>
                        <canvas id="performance-chart"></canvas>
                    </div>

                    <div class="ranked-list-container">
                        <h3>Top 5 Itens Mais Clicados</h3>
                        <ul id="top-items-list" class="ranked-list">
                            </ul>
                    </div>
                </div>

                <!-- Seção de Detalhes Completos dos Links -->
                <div class="ck-mt-40">
                    <h3 class="ck-db-3bbf37">
                        <i class="fas fa-list"></i> Detalhes Completos dos Seus Links
                    </h3>
                    <div class="ck-db-330c9b" id="all-links-details">
                        <p class="ck-db-e4d4ad">Carregando detalhes dos links...</p>
                    </div>
                </div>
            </main>
            <main id="compartilhar-pane" class="main-content" data-pane>
                <header class="content-header">
                    <h1>Compartilhe sua Tag</h1>
                </header>

                <div class="share-layout">
                    <div class="share-column-left">
                        <div class="qr-code-card" id="share-qr-art-card">
                            <h4>QR Code da sua Tag</h4>
                            <p class="qr-art-hint">Escolha um tema. A logomarca entra no centro e o PNG sai pronto para o cliente imprimir ou postar.</p>
                            <div id="qr-theme-picker" class="qr-theme-picker" role="listbox" aria-label="Temas do QR Code">
                                <button type="button" class="qr-theme-chip active" data-qr-theme="rei"><span class="qr-theme-swatch ck-db-1f668c"></span>Rei</button>
                                <button type="button" class="qr-theme-chip" data-qr-theme="classico"><span class="qr-theme-swatch ck-db-ebdda8"></span>Clássico</button>
                                <button type="button" class="qr-theme-chip" data-qr-theme="noite"><span class="qr-theme-swatch ck-db-e86160"></span>Noite</button>
                                <button type="button" class="qr-theme-chip" data-qr-theme="ouro"><span class="qr-theme-swatch ck-db-368076"></span>Ouro</button>
                                <button type="button" class="qr-theme-chip" data-qr-theme="vinho"><span class="qr-theme-swatch ck-db-2745ba"></span>Vinho</button>
                                <button type="button" class="qr-theme-chip" data-qr-theme="minimal"><span class="qr-theme-swatch ck-db-84cd4c"></span>Minimal</button>
                            </div>
                            <label class="qr-logo-toggle">
                                <input type="checkbox" id="qr-include-logo" checked>
                                <span>Incluir logomarca no centro</span>
                            </label>
                            <div id="qr-code-container" class="qr-hidden-source" aria-hidden="true"></div>
                            <div class="qr-art-preview-wrap">
                                <canvas id="qr-art-canvas" width="720" height="920"></canvas>
                            </div>
                            <button id="download-qr-btn" class="btn btn-secondary"><i class="fas fa-download"></i> Baixar PNG</button>
                        </div>
                    </div>

                    <div class="share-column-right">
                        <div class="share-options-list">
                            
                            <div class="share-option-item">
                                <div class="share-option-label">
                                    <i class="fas fa-link"></i>
                                    <span>Url</span>
                                </div>
                                <button id="copy-url-btn" class="btn btn-secondary">Copiar</button>
                            </div>

                            <div class="share-option-item">
                                <div class="share-option-label">
                                    <i class="fas fa-qrcode"></i>
                                    <span>QRCode</span>
                                </div>
                                <button id="download-qr-btn-alt" class="btn btn-secondary">Baixar</button>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
            
            <!-- Página de Personalização da Marca -->
            <main id="branding-pane" class="main-content ck-hidden" data-pane>
                <header class="content-header">
                    <h1><i class="fas fa-palette"></i> Personalização da Marca</h1>
                    <p class="ck-text-muted-mt">
                        Personalize o logo da sua empresa que aparecerá no seu cartão virtual
                    </p>
                </header>
                
                <div class="branding-container ck-container-900">
                    <!-- Preview do Logo -->
                    <div class="branding-preview-card ck-dash-card">
                        <h3 class="ck-dash-h">
                            <i class="fas fa-eye"></i> Preview do Logo
                        </h3>
                        <div class="ck-db-b6297f" id="branding-preview-container">
                            <img class="ck-db-a19f2b" id="branding-logo-preview" src="" alt="Logo da Empresa" />
                            <p class="ck-db-5558d6" id="branding-no-logo">Nenhum logo configurado</p>
                        </div>
                    </div>
                    
                    <!-- Formulário de Personalização -->
                    <div class="branding-form-card ck-dash-card-nb">
                        <h3 class="ck-dash-h-25">
                            <i class="fas fa-upload"></i> Configurar Logo
                        </h3>
                        
                        <form id="branding-form">
                            <input type="hidden" id="branding-logo-url" value="">
                            <div class="form-group ck-mb-25">
                                <label class="ck-label-primary">
                                    <i class="fas fa-upload"></i> Upload de Imagem
                                </label>
                                <input class="ck-input-dash" type="file" id="branding-logo-upload" accept="image/*">
                                <small class="ck-text-muted-sm">Formatos aceitos: PNG, JPG, JPEG, GIF, WebP</small>
                            </div>
                            
                            <div class="form-group ck-mb-25">
                                <label class="ck-label-primary">
                                    <i class="fas fa-ruler"></i> Tamanho do Logo (px)
                                </label>
                                <input type="number" id="branding-logo-size" class="form-input ck-input-dash" placeholder="60" min="20" max="200" value="60">
                                <small class="ck-text-muted-sm">Tamanho em pixels (recomendado: 60-120px)</small>
                            </div>
                            
                            <div class="form-group ck-mb-25">
                                <label class="ck-label-primary">
                                    <i class="fas fa-link"></i> Link do Logo (opcional)
                                </label>
                                <input type="url" id="branding-logo-link" class="form-input ck-input-dash" placeholder="https://seusite.com.br">
                                <small class="ck-text-muted-sm">URL para onde o logo redirecionará quando clicado</small>
                            </div>
                            
                            <div class="ck-db-48b122">
                                <button class="ck-db-86dddc" type="button" onclick="clearBranding()" 
                                       >
                                    Limpar
                                </button>
                                <button class="ck-db-13e7e7" type="submit" 
                                       >
                                    <i class="fas fa-save"></i> Salvar Personalização
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            
            <!-- Página de Separação de Pacotes (ADM) -->
            <main id="separacao-pacotes-pane" class="main-content ck-hidden" data-pane>
                <header class="content-header">
                    <h1>Separação de Pacotes</h1>
                </header>
                
                <!-- Abas de navegação -->
                <div class="ck-db-2e4831">
                    <button id="tab-modules" class="tab-button active ck-db-73b6d7" onclick="switchSeparationTab('modules')">
                        Módulos por Plano
                    </button>
                    <button id="tab-individual" class="tab-button ck-db-c615da" onclick="switchSeparationTab('individual')">
                        Planos Individuais por Usuário
                    </button>
                    <button id="tab-link-limits" class="tab-button ck-db-c615da" onclick="switchSeparationTab('link-limits')">
                        Quantidade de Links
                    </button>
                </div>
                
                <!-- Aba de Módulos por Plano -->
                <div id="tab-content-modules" class="tab-content-separation">
                    <div class="module-availability-container">
                        <div class="module-availability-header">
                            <p class="ck-text-muted-mb20">
                                Configure quais módulos estarão disponíveis para cada plano de assinatura.
                            </p>
                            <div class="ck-mb-16">
                                <label class="ck-label-muted" for="module-filter-input">Filtrar por módulo</label>
                                <input class="ck-db-3a6061" type="text" id="module-filter-input" placeholder="Ex: Banner, Carrossel, King Forms..." 
                                   >
                            </div>
                        </div>
                        
                        <div id="module-availability-list" class="module-availability-list">
                            <p>Carregando módulos...</p>
                        </div>
                        
                        <div class="module-availability-actions ck-db-ef7a9d">
                            <button id="save-module-availability-btn" class="btn btn-primary ck-hidden">
                                <i class="fas fa-save"></i> Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Aba de Planos Individuais por Usuário -->
                <div id="tab-content-individual" class="tab-content-separation ck-hidden">
                    <div class="individual-plans-container">
                        <div class="ck-db-8d7033">
                            <p class="ck-text-muted-mb20">
                                Configure planos individuais para usuários específicos. Exemplo: permitir que um usuário tenha acesso ao módulo Carrossel mesmo sem ter o plano completo.
                            </p>
                            <button id="add-individual-plan-btn" class="btn btn-primary" onclick="showAddIndividualPlanModal()">
                                <i class="fas fa-plus"></i> Adicionar Plano Individual
                            </button>
                        </div>
                        
                        <div id="individual-plans-list" class="individual-plans-list">
                            <p>Carregando planos individuais...</p>
                        </div>
                    </div>
                </div>
                
                <!-- Aba de Quantidade de Links -->
                <div id="tab-content-link-limits" class="tab-content-separation ck-hidden">
                    <div class="link-limits-container">
                        <div class="link-limits-header">
                            <p class="ck-text-muted-mb20">
                                Configure a quantidade máxima de links por tipo de módulo em cada plano. Deixe em branco para ilimitado.
                            </p>
                            <div class="ck-db-113f1f">
                                <div class="ck-db-72b66b">
                                    <label class="ck-label-muted" for="link-limits-filter-module">Filtrar por módulo</label>
                                    <input class="ck-input-graphite" type="text" id="link-limits-filter-module" placeholder="Ex: Banner, WhatsApp..." 
                                       >
                                </div>
                                <div class="ck-db-72b66b">
                                    <label class="ck-label-muted" for="link-limits-filter-plan">Filtrar por plano</label>
                                    <input class="ck-input-graphite" type="text" id="link-limits-filter-plan" placeholder="Ex: King Start, King Prime..." 
                                       >
                                </div>
                            </div>
                        </div>
                        
                        <div id="link-limits-grid" class="link-limits-grid ck-db-42d445">
                            <p>Carregando limites...</p>
                        </div>
                        
                        <div class="link-limits-actions ck-db-cf2c90">
                            <button id="save-link-limits-btn" class="btn btn-primary ck-hidden">
                                <i class="fas fa-save"></i> Salvar Alterações
                            </button>
                            <button id="reset-link-limits-btn" class="btn btn-secondary ck-hidden" onclick="resetLinkLimits()">
                                <i class="fas fa-undo"></i> Resetar para Ilimitado
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            
            <!-- Página de Assinatura -->
            <main id="assinatura-pane" class="main-content ck-hidden" data-pane>
                <header class="content-header">
                    <h1>Assinatura</h1>
                </header>
                
                <div class="subscription-container">
                    <!-- Informações da Assinatura Atual -->
                    <div class="subscription-current-card">
                        <h2><i class="fas fa-crown"></i> Sua Assinatura</h2>
                        <div id="subscription-info" class="subscription-info">
                            <p>Carregando informações...</p>
                        </div>
                    </div>
                    
                    <!-- Planos Disponíveis -->
                    <div class="subscription-plans-section">
                        <h2>Planos Disponíveis</h2>
                        <div id="subscription-plans-list" class="subscription-plans-grid">
                            <p>Carregando planos...</p>
                        </div>
                    </div>
                    
                    <!-- Seção de Edição (apenas ADM) -->
                    <div id="subscription-admin-section" class="ck-hidden">
                        <div class="subscription-admin-card">
                            <h2><i class="fas fa-edit"></i> Editar Planos (ADM)</h2>
                            <button id="edit-plans-btn" class="btn btn-primary">
                                <i class="fas fa-edit"></i> Editar Planos
                            </button>
                            <div class="ck-db-712f1f" id="plans-edit-form">
                                <!-- Formulário de edição será preenchido via JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <!-- Página de Personalizar Link do Site (APENAS ADM PRINCIPAL) -->
            <main id="personalizar-link-pane" class="main-content ck-hidden" data-pane>
                <header class="content-header">
                    <h1><i class="fas fa-link"></i> Personalizar Link do Site</h1>
                    <p class="ck-text-muted-mt">
                        Personalize a preview do link quando compartilhado no WhatsApp, Facebook e outras redes sociais
                    </p>
                </header>
                
                <div class="link-preview-container ck-container-900">
                    <!-- Preview da Imagem -->
                    <div class="link-preview-card ck-dash-card">
                        <h3 class="ck-dash-h">
                            <i class="fas fa-eye"></i> Preview da Imagem
                        </h3>
                        <div class="ck-db-792137" id="link-preview-image-container">
                            <img class="ck-db-bc47bf" id="link-preview-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%231a1a1a' width='400' height='200'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14'%3EPreview da imagem%3C/text%3E%3C/svg%3E" alt="Preview" />
                        </div>
                        <p class="ck-db-ef2a27">
                            Esta é a imagem que aparecerá quando o link do site for compartilhado
                        </p>
                    </div>
                    
                    <!-- Formulário de Personalização -->
                    <div class="link-preview-form-card ck-dash-card-nb">
                        <h3 class="ck-dash-h-25">
                            <i class="fas fa-palette"></i> Personalizar
                        </h3>
                        
                        <form id="link-preview-form">
                            <div class="form-group ck-mb-25">
                                <label class="ck-label-primary">
                                    <i class="fas fa-heading"></i> Título Principal
                                </label>
                                <input type="text" id="link-preview-title" class="form-input ck-input-dash" placeholder="CONECTAKING" maxlength="50">
                                <small class="ck-text-muted-sm">Texto principal exibido na preview (máx. 50 caracteres)</small>
                            </div>
                            
                            <div class="form-group ck-mb-25">
                                <label class="ck-label-primary">
                                    <i class="fas fa-text-height"></i> Subtítulo
                                </label>
                                <input type="text" id="link-preview-subtitle" class="form-input ck-input-dash" placeholder="Sua Presença Digital. Um Toque. Poder Absoluto." maxlength="100">
                                <small class="ck-text-muted-sm">Texto secundário exibido na preview (máx. 100 caracteres)</small>
                            </div>
                            
                            <div class="ck-db-75bb5d">
                                <div class="form-group">
                                    <label class="ck-label-primary">
                                        <i class="fas fa-fill"></i> Cor de Fundo 1
                                    </label>
                                    <div class="ck-flex-gap-10">
                                        <input class="ck-color-swatch" type="color" id="link-preview-bg1" value="#991B1B">
                                        <input class="ck-input-hex" type="text" id="link-preview-bg1-text" value="#991B1B" pattern="^#[0-9A-Fa-f]{6}$">
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="ck-label-primary">
                                        <i class="fas fa-fill"></i> Cor de Fundo 2
                                    </label>
                                    <div class="ck-flex-gap-10">
                                        <input class="ck-color-swatch" type="color" id="link-preview-bg2" value="#000000">
                                        <input class="ck-input-hex" type="text" id="link-preview-bg2-text" value="#000000" pattern="^#[0-9A-Fa-f]{6}$">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="ck-db-50ce5e">
                                <div class="form-group">
                                    <label class="ck-label-primary">
                                        <i class="fas fa-font"></i> Cor do Texto Principal
                                    </label>
                                    <div class="ck-flex-gap-10">
                                        <input class="ck-color-swatch" type="color" id="link-preview-text-color" value="#F5F5F5">
                                        <input class="ck-input-hex" type="text" id="link-preview-text-color-text" value="#F5F5F5" pattern="^#[0-9A-Fa-f]{6}$">
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="ck-label-primary">
                                        <i class="fas fa-font"></i> Cor do Subtítulo
                                    </label>
                                    <div class="ck-flex-gap-10">
                                        <input class="ck-color-swatch" type="color" id="link-preview-subtitle-color" value="#FFC700">
                                        <input class="ck-input-hex" type="text" id="link-preview-subtitle-color-text" value="#FFC700" pattern="^#[0-9A-Fa-f]{6}$">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="ck-db-48a0a1">
                                <button type="button" id="link-preview-reset-btn" class="btn btn-secondary ck-px-12-py-24">
                                    <i class="fas fa-undo"></i> Restaurar Padrão
                                </button>
                                <button type="button" id="link-preview-preview-btn" class="btn btn-secondary ck-px-12-py-24">
                                    <i class="fas fa-eye"></i> Atualizar Preview
                                </button>
                                <button type="submit" id="link-preview-save-btn" class="btn btn-primary ck-px-12-py-24">
                                    <i class="fas fa-save"></i> Salvar Configuração
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            
</div>

<aside class="live-preview">
    <div class="preview-header-section">
        <h3>Pré-visualização</h3>
    </div>
    <button id="preview-close-btn" class="preview-close-btn">&times;</button>
    <div class="phone-mockup">
        <div class="phone-screen" id="preview-screen">
            <div class="preview-card">
                <div class="preview-header">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzAiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI3NSIgeT0iODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+RiDwvdGV4dD48L3N2Zz4=" class="preview-avatar" id="preview-avatar" alt="Avatar">
                    <h3 id="preview-name">Seu Nome</h3>
                    <p id="preview-bio">Sua biografia aparecerá aqui.</p>
                </div>
                <div class="preview-items" id="preview-items-container"></div>
                <div class="preview-footer-icons">
                    <i class="fas fa-share-alt"></i>
                    <i class="fas fa-user"></i>
                </div>
                <div class="preview-branding-wrap ck-db-4762fe">
                    <img class="ck-db-189f2a" id="preview-branding-logo" src="" alt="Logo">
                </div>
            </div>
        </div>
    </div>
</aside>
    </div>
    
    <div id="icon-modal" class="modal-overlay"><div class="modal-content"><h4>Escolha um Ícone</h4><input type="text" id="icon-search" placeholder="Buscar ícone (ex: instagram)"><div id="icon-grid" class="icon-grid"></div><button id="close-modal-btn" class="btn btn-secondary">Fechar</button></div></div>

    <div id="edit-item-modal" class="modal-overlay">
    <div class="modal-content">
        <div class="modal-header">
            <h4 id="edit-modal-title">Editar Módulo</h4>
            <button id="close-edit-modal-btn" class="close-btn">×</button>
        </div>
        <div class="modal-body" id="edit-modal-body">
            </div>
        <div class="modal-footer">
            <button id="delete-modal-btn" class="btn btn-danger">Deletar Módulo</button>
            <button id="save-edit-modal-btn" class="btn btn-primary">Salvar</button>
        </div>
    </div>
</div>

<div id="add-item-modal" class="modal-overlay">
    <div class="modal-content large">
        <div class="modal-header">
            <h4>Adicionar novo módulo</h4>
            <button id="close-add-modal-btn" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <h5>Contato</h5>
            <div class="module-gallery">
                <div class="module-choice-card" data-item-type="whatsapp"><i class="fab fa-whatsapp"></i><span>WhatsApp</span></div>
                <div class="module-choice-card" data-item-type="telegram"><i class="fab fa-telegram"></i><span>Telegram</span></div>
                <div class="module-choice-card" data-item-type="email"><i class="fas fa-envelope"></i><span>Email</span></div>
                <div class="module-choice-card" data-item-type="pix"><i class="fa-solid fa-copy"></i><span>PIX (Copia e Cola)</span></div>
                <div class="module-choice-card" data-item-type="pix_qrcode"><i class="fas fa-qrcode"></i><span>PIX QR Code</span></div>
                <div class="module-choice-card" data-item-type="wifi"><i class="fas fa-wifi"></i><span>Wi‑Fi (QR Code)</span></div>
            </div>
            <hr class="divider">
            <h5>Redes Sociais</h5>
            <div class="module-gallery">
                <div class="module-choice-card" data-item-type="instagram"><i class="fab fa-instagram"></i><span>Instagram</span></div>
                <div class="module-choice-card" data-item-type="facebook"><i class="fab fa-facebook"></i><span>Facebook</span></div>
                <div class="module-choice-card" data-item-type="tiktok"><i class="fab fa-tiktok"></i><span>TikTok</span></div>
                <div class="module-choice-card" data-item-type="twitter"><i class="fab fa-twitter"></i><span>X (Twitter)</span></div>
                <div class="module-choice-card" data-item-type="youtube"><i class="fab fa-youtube"></i><span>YouTube</span></div>
                <div class="module-choice-card" data-item-type="spotify"><i class="fab fa-spotify"></i><span>Spotify</span></div>
                <div class="module-choice-card" data-item-type="linkedin"><i class="fab fa-linkedin"></i><span>LinkedIn</span></div>
                <div class="module-choice-card" data-item-type="pinterest"><i class="fab fa-pinterest"></i><span>Pinterest</span></div>
                <!-- <div class="module-choice-card" data-item-type="reddit"><i class="fab fa-reddit"></i><span>Reddit</span></div> -->
                <!-- <div class="module-choice-card" data-item-type="twitch"><i class="fab fa-twitch"></i><span>Twitch</span></div> -->
            </div>
            <hr class="divider">
            <h5>Outros</h5>
            <div class="module-gallery">
                <div class="module-choice-card" data-item-type="link"><i class="fas fa-link"></i><span>Link Personalizado</span></div>
                <div class="module-choice-card" data-item-type="portfolio"><i class="fas fa-briefcase"></i><span>Portfólio</span></div>
                <!-- KingSelection não é mais adicionado aqui; acesse pela aba lateral (abaixo de Gestão Financeira) -->
                <div class="module-choice-card" data-item-type="banner"><i class="fas fa-image"></i><span>Banner</span></div>
                <div class="module-choice-card" data-item-type="texto_com_botao"><i class="fas fa-font"></i><span>Texto com Botão</span></div>
                <div class="module-choice-card" data-item-type="carousel"><i class="fas fa-images"></i><span>Carrossel</span></div>
                <!-- <div class="module-choice-card" data-item-type="pdf"><i class="fas fa-file-pdf"></i><span>Baixar PDF</span></div> -->
                <!-- Módulos incorporados: instagram_embed visível para ADM e pacotes com o módulo -->
                <div class="module-choice-card" data-item-type="instagram_embed"><i class="fab fa-instagram"></i><span>Instagram Incorporado</span></div>
                <div class="module-choice-card" data-item-type="youtube_embed"><i class="fab fa-youtube"></i><span>YouTube Incorporado</span></div>
                <!-- <div class="module-choice-card" data-item-type="tiktok_embed"><i class="fab fa-tiktok"></i><span>TikTok Incorporado</span></div> -->
                <!-- <div class="module-choice-card" data-item-type="spotify_embed"><i class="fab fa-spotify"></i><span>Spotify Incorporado</span></div> -->
                <!-- <div class="module-choice-card" data-item-type="linkedin_embed"><i class="fab fa-linkedin"></i><span>LinkedIn Incorporado</span></div> -->
                <!-- <div class="module-choice-card" data-item-type="pinterest_embed"><i class="fab fa-pinterest"></i><span>Pinterest Incorporado</span></div> -->
                <div class="module-choice-card" data-item-type="digital_form"><i class="fas fa-file-signature"></i><span>Formulário King</span></div>
                <div class="module-choice-card" data-item-type="sales_page"><i class="fas fa-store"></i><span>Página de Vendas</span></div>
                <div class="module-choice-card" data-item-type="guest_list"><i class="fas fa-users"></i><span>Lista de Convidados</span></div>
                <div class="module-choice-card" data-item-type="bible"><i class="fas fa-bible"></i><span>Bíblia</span></div>
                <div class="module-choice-card" data-item-type="location"><i class="fas fa-map-marker-alt"></i><span>Localização</span></div>
            </div>
        </div>
    </div>
</div>

<div id="cropper-modal" class="modal-overlay">
    <div class="modal-content large">
        <div class="modal-header">
            <h4>Ajuste sua Imagem</h4>
        </div>
        <div class="cropper-meta-bar" id="cropper-meta-bar">
            <div><strong>Medidas do corte (pixels na imagem final):</strong> <span id="crop-size-readout">—</span> · <strong>Proporção:</strong> <span id="crop-aspect-readout">—</span></div>
            <p class="cropper-tip">Sugestão para fundo do cartão: <strong>1920×1080</strong> (16:9) ou <strong>1600×900</strong>. Prepare a foto nesse tamanho ou aproxime ao cortar. No telemóvel o fundo cobre o ecrã todo (centrado); detalhes nas bordas laterais podem sair fora.</p>
            <label class="cropper-mobile-toggle"><input type="checkbox" id="cropper-mobile-preview-toggle" checked> Mostrar faixa central tipo telemóvel (referência visual)</label>
        </div>
        <div class="modal-body cropper-body">
            <div class="cropper-container">
                <img id="image-to-crop" src="">
            </div>
        </div>
        <div class="modal-footer">
            <button id="cancel-crop-btn" class="btn btn-secondary">Cancelar</button>
            <button id="crop-and-upload-btn" class="btn btn-primary">Cortar e Enviar</button>
        </div>
    </div>
</div>

    <button id="mobile-preview-btn" class="mobile-preview-btn">
        <i class="fas fa-eye"></i>
    </button>

    <!-- Botão de salvar fixo no mobile - aparece em todas as abas -->
    <div class="mobile-save-button-container">
        <button id="mobile-save-all-btn" class="btn btn-save-changes mobile-save-btn">
            <i class="fas fa-check"></i> Publicar alterações
        </button>
    </div>

    <!-- Modal de Tutorial Interativo -->
    <div id="tutorial-modal" class="modal-overlay tutorial-modal-overlay">
        <div class="modal-content tutorial-modal-content">
            <div class="tutorial-header">
                <h2><i class="fas fa-graduation-cap"></i> Tutorial Interativo</h2>
                <button class="close-tutorial-btn" id="close-tutorial-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="tutorial-sidebar">
                <h3>Tutoriais Disponíveis</h3>
                <div id="tutorial-list" class="tutorial-list">
                    <!-- Tutoriais serão carregados aqui -->
                </div>
            </div>
            
            <div class="tutorial-content">
                <div id="tutorial-welcome" class="tutorial-welcome">
                    <div class="welcome-icon">🎯</div>
                    <h2>Bem-vindo ao Tutorial Interativo!</h2>
                    <p>Vou te guiar passo a passo para configurar seu cartão Conecta King.</p>
                    <p>Escolha um tutorial ao lado para começar, ou clique em "Tutorial Rápido" para uma visão geral.</p>
                    <button class="btn btn-primary" id="start-quick-tutorial">
                        <i class="fas fa-rocket"></i> Tutorial Rápido
                    </button>
                </div>
                
                <div id="tutorial-steps" class="tutorial-steps ck-hidden">
                    <div class="tutorial-progress">
                        <div class="progress-bar">
                            <div id="tutorial-progress-bar" class="progress-fill"></div>
                        </div>
                        <span id="tutorial-progress-text">Passo 1 de 6</span>
                    </div>
                    
                    <div class="tutorial-step-content" id="tutorial-step-content">
                        <!-- Conteúdo do passo será inserido aqui -->
                    </div>
                    
                    <div class="tutorial-actions">
                        <button class="btn btn-secondary ck-hidden" id="tutorial-prev-btn">
                            <i class="fas fa-arrow-left"></i> Anterior
                        </button>
                        <button class="btn btn-primary" id="tutorial-next-btn">
                            Próximo <i class="fas fa-arrow-right"></i>
                        </button>
                        <button class="btn btn-success ck-hidden" id="tutorial-complete-btn">
                            <i class="fas fa-check"></i> Concluir Tutorial
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Restaurar painel correto IMEDIATAMENTE (evita flash e demora de 7s no mobile) -->
<div id="wifi-qrcode-modal" class="wifi-modal-overlay" aria-hidden="true">
        <div class="wifi-modal-content">
            <button type="button" id="wifi-modal-close-btn" class="wifi-modal-close" aria-label="Fechar">&times;</button>
            <h4 id="wifi-modal-title">Conectar ao Wi‑Fi</h4>
            <div class="wifi-ssid-block">
                <span class="wifi-ssid-label">Nome da rede</span>
                <strong id="wifi-ssid-visible" class="wifi-ssid-value"></strong>
            </div>
            <p class="wifi-modal-hint">Escaneie o QR Code no celular ou copie a senha abaixo.</p>
            <div id="wifi-qrcode-container">
                <div id="wifi-qrcode-image"></div>
                <div id="wifi-qrcode-loader"></div>
            </div>
            <div class="wifi-password-row">Senha da rede: <strong id="wifi-password-visible"></strong></div>
            <div class="wifi-copy-row">
                <button type="button" id="wifi-copy-password-btn">Copiar senha</button>
            </div>
        </div>
    </div>
<!-- Base da API: mesma origem Laravel/FrankenPHP (produção e Docker :8080) -->
<!-- api-config.js já no <head> (credentials + CSRF) -->
</body>
</html>