/**
 * Restaurar Modo Empresa e Alterar Logo no Dashboard
 * 
 * Funcionalidades:
 * 1. Restaura botão "Modo Empresa" no sidebar (só para King Corporation)
 * 2. Restaura opção "Alterar Logo" (para King Finance, King Finance Plus, King Premium Plus, King Corporation)
 * 3. Atualiza mapeamento: individual_com_logo → king_corporate
 */

(function() {
    'use strict';

    console.log('🔧 Inicializando restauração de Modo Empresa e Alterar Logo...');

    /**
     * Verificar se plano tem permissão para alterar logo
     */
    function canEditLogo(planCode) {
        const plansWithLogo = [
            'king_finance',
            'king_finance_plus',
            'king_premium_plus',
            'king_corporate'
        ];
        return plansWithLogo.includes(planCode);
    }

    /**
     * Verificar se plano tem modo empresa
     */
    function hasModoEmpresa(planCode) {
        return planCode === 'king_corporate';
    }

    /**
     * Obter plan_code do usuário
     */
    async function getUserPlanCode() {
        try {
            // Tentar obter do accountData
            if (window.accountData && window.accountData.accountType) {
                const accountType = window.accountData.accountType;
                return mapAccountTypeToPlanCode(accountType);
            }

            // Tentar obter do localStorage
            const cachedAccountType = localStorage.getItem('accountType');
            if (cachedAccountType) {
                return mapAccountTypeToPlanCode(cachedAccountType);
            }

            // Buscar da API
            const response = await fetch('/api/account/status', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.accountType) {
                    // Armazenar no cache
                    localStorage.setItem('accountType', data.accountType);
                    if (!window.accountData) {
                        window.accountData = {};
                    }
                    window.accountData.accountType = data.accountType;
                    return mapAccountTypeToPlanCode(data.accountType);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao obter plan_code:', error);
        }

        return null;
    }

    /**
     * Mapear account_type para plan_code
     */
    function mapAccountTypeToPlanCode(accountType) {
        const mapping = {
            'king_finance': 'king_finance',
            'king_finance_plus': 'king_finance_plus',
            'king_premium_plus': 'king_premium_plus',
            'king_corporate': 'king_corporate',
            'king_base': 'king_base',
            'king_start': 'king_base', // Alias
            'king_prime': 'premium', // Alias
            'basic': 'king_base',
            'premium': 'premium',
            'enterprise': 'king_corporate',
            // Mapeamento atualizado: individual_com_logo → king_corporate
            'individual_com_logo': 'king_corporate',
            'business_owner': 'king_corporate',
            'individual': 'king_base',
            'free': 'free'
        };

        return mapping[accountType] || accountType;
    }

    /**
     * Criar botão "Modo Empresa" ao lado de "Perfis" na área principal
     */
    function createEmpresaButton() {
        // Procurar pelo botão "Perfis" na área principal (não no sidebar)
        // O botão está na área de conteúdo, logo abaixo do logo
        const perfilButton = document.querySelector(
            '[data-tab="perfis"], [data-tab="Perfis"], ' +
            'button:contains("Perfis"), a:contains("Perfis"), ' +
            '[class*="tab"][class*="perfis"], [class*="tab"][class*="Perfis"], ' +
            '[onclick*="perfis"], [onclick*="Perfis"]'
        );

        // Procurar por qualquer elemento que contenha "Perfis" na área principal
        const allButtons = document.querySelectorAll('button, a, [class*="tab"], [class*="button"]');
        let perfilElement = null;

        allButtons.forEach(item => {
            const text = (item.textContent || '').trim();
            const onclick = item.getAttribute('onclick') || '';
            const classList = item.className || '';
            
            // Verificar se contém "Perfis" e não está no sidebar
            if ((text.includes('Perfis') || text.includes('perfis') || onclick.includes('perfis')) &&
                !item.closest('.sidebar, .nav, [class*="sidebar"], [class*="nav"]')) {
                perfilElement = item;
            }
        });

        // Se não encontrou, procurar por elementos com fundo amarelo (botão ativo)
        if (!perfilElement) {
            const yellowButtons = document.querySelectorAll('button, a');
            yellowButtons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                const bgColor = style.backgroundColor;
                const text = (btn.textContent || '').trim();
                
                // Verificar se tem fundo amarelo e contém "Perfis"
                if ((bgColor.includes('255, 199') || bgColor.includes('rgb(255, 199') || bgColor.includes('#FFC7')) &&
                    (text.includes('Perfis') || text.includes('perfis')) &&
                    !btn.closest('.sidebar, .nav')) {
                    perfilElement = btn;
                }
            });
        }

        if (!perfilElement) {
            console.warn('⚠️ Botão "Perfis" não encontrado na área principal');
            // Tentar criar próximo ao logo
            const logo = document.querySelector('[alt*="CONECTA"], [alt*="Conecta"], [class*="logo"]');
            if (logo) {
                const container = logo.closest('header, .header, [class*="header"]') || logo.parentElement;
                if (container) {
                    createEmpresaButtonNearLogo(container);
                    return;
                }
            }
            return;
        }

        // Verificar se botão Empresa já existe
        const existingEmpresa = document.querySelector(
            '[data-tab="empresa"], [data-tab="Empresa"], ' +
            '[data-empresa-button="true"]'
        );

        if (existingEmpresa) {
            console.log('✅ Botão "Empresa" já existe');
            return;
        }

        // Criar botão Empresa baseado no botão Perfis
        const empresaButton = perfilElement.cloneNode(true);
        
        // Atualizar texto
        empresaButton.textContent = 'Empresa';
        empresaButton.innerHTML = empresaButton.innerHTML.replace(/Perfis|perfis/gi, 'Empresa');
        
        // Atualizar atributos
        empresaButton.setAttribute('data-tab', 'empresa');
        empresaButton.setAttribute('data-empresa-button', 'true');
        
        // Remover classe active se existir
        empresaButton.classList.remove('active');
        
        // Atualizar onclick se existir
        const onclick = empresaButton.getAttribute('onclick');
        if (onclick) {
            empresaButton.setAttribute('onclick', onclick.replace(/perfis|Perfis/gi, 'empresa'));
        }

        // Inserir ao lado do botão Perfis (no mesmo container)
        const parent = perfilElement.parentNode;
        if (parent) {
            parent.insertBefore(empresaButton, perfilElement.nextSibling);
            console.log('✅ Botão "Empresa" criado ao lado de "Perfis"');
        } else {
            perfilElement.after(empresaButton);
            console.log('✅ Botão "Empresa" criado após "Perfis"');
        }
    }

    /**
     * Criar botão Empresa próximo ao logo (fallback)
     */
    function createEmpresaButtonNearLogo(container) {
        // Criar container de tabs se não existir
        let tabsContainer = container.querySelector('.tabs-container, .tab-buttons, [class*="tabs"]');
        
        if (!tabsContainer) {
            tabsContainer = document.createElement('div');
            tabsContainer.className = 'tabs-container';
            tabsContainer.style.display = 'flex';
            tabsContainer.style.gap = '12px';
            tabsContainer.style.marginTop = '16px';
            tabsContainer.style.marginBottom = '16px';
            
            // Inserir após o logo
            const logo = container.querySelector('[alt*="CONECTA"], [alt*="Conecta"], [class*="logo"]');
            if (logo && logo.parentElement) {
                logo.parentElement.insertBefore(tabsContainer, logo.nextSibling);
            } else {
                container.appendChild(tabsContainer);
            }
        }

        // Criar botão Perfis se não existir
        let perfilButton = tabsContainer.querySelector('[data-tab="perfis"], button:contains("Perfis")');
        if (!perfilButton) {
            perfilButton = document.createElement('button');
            perfilButton.textContent = 'Perfis';
            perfilButton.setAttribute('data-tab', 'perfis');
            perfilButton.className = 'tab-button active';
            perfilButton.style.padding = '12px 24px';
            perfilButton.style.borderRadius = '8px';
            perfilButton.style.background = '#FFC700';
            perfilButton.style.color = '#000';
            perfilButton.style.border = 'none';
            perfilButton.style.cursor = 'pointer';
            perfilButton.style.fontWeight = '600';
            tabsContainer.appendChild(perfilButton);
        }

        // Criar botão Empresa
        const empresaButton = document.createElement('button');
        empresaButton.textContent = 'Empresa';
        empresaButton.setAttribute('data-tab', 'empresa');
        empresaButton.setAttribute('data-empresa-button', 'true');
        empresaButton.className = 'tab-button';
        empresaButton.style.padding = '12px 24px';
        empresaButton.style.borderRadius = '8px';
        empresaButton.style.background = 'transparent';
        empresaButton.style.color = '#fff';
        empresaButton.style.border = 'none';
        empresaButton.style.cursor = 'pointer';
        empresaButton.style.fontWeight = '600';
        
        tabsContainer.appendChild(empresaButton);
        console.log('✅ Botão "Empresa" criado próximo ao logo');
    }

    /**
     * Criar opção "Alterar Logo"
     */
    function createAlterarLogoOption() {
        // Procurar pela seção de informações do perfil
        const infoSection = document.querySelector(
            '#info-editor, .info-editor, [data-section="info"], ' +
            '.profile-info, .informacoes-perfil'
        );

        if (!infoSection) {
            console.warn('⚠️ Seção de informações não encontrada');
            return;
        }

        // Verificar se opção já existe
        const existingLogoOption = document.querySelector(
            '[data-logo-option], .alterar-logo, [id*="logo"]'
        );

        if (existingLogoOption) {
            console.log('✅ Opção "Alterar Logo" já existe');
            return;
        }

        // Criar campo de alterar logo
        const logoSection = document.createElement('div');
        logoSection.className = 'form-group alterar-logo-section';
        logoSection.setAttribute('data-logo-option', 'true');
        logoSection.innerHTML = `
            <label for="company-logo-upload" class="form-label">
                <i class="fas fa-image"></i> Alterar Logomarca
            </label>
            <div class="logo-upload-container">
                <input type="file" id="company-logo-upload" accept="image/*" class="form-control" style="display: none;">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('company-logo-upload').click()">
                    <i class="fas fa-upload"></i> Selecionar Logo
                </button>
                <div id="logo-preview" class="logo-preview" style="display: none; margin-top: 10px;">
                    <img id="logo-preview-img" src="" alt="Preview" style="max-width: 200px; max-height: 200px;">
                </div>
            </div>
            <small class="form-text text-muted">
                Faça upload da logomarca da sua empresa (PNG, JPG, SVG)
            </small>
        `;

        // Inserir após o campo de avatar ou no final da seção
        const avatarField = infoSection.querySelector('[id*="avatar"], [class*="avatar"]');
        if (avatarField) {
            avatarField.parentNode.insertBefore(logoSection, avatarField.nextSibling);
        } else {
            infoSection.appendChild(logoSection);
        }

        // Adicionar event listener para upload
        const uploadInput = logoSection.querySelector('#company-logo-upload');
        if (uploadInput) {
            uploadInput.addEventListener('change', handleLogoUpload);
        }

        console.log('✅ Opção "Alterar Logo" criada');
    }

    /**
     * Handler para upload de logo
     */
    async function handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione um arquivo de imagem válido.');
            return;
        }

        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo é muito grande. Tamanho máximo: 5MB');
            return;
        }

        // Mostrar preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('logo-preview-img');
            const previewDiv = document.getElementById('logo-preview');
            if (previewImg && previewDiv) {
                previewImg.src = e.target.result;
                previewDiv.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);

        // Fazer upload
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await fetch('/api/business/logo', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                alert('✅ Logo atualizada com sucesso!');
                
                // Atualizar interface sem recarregar
                if (data.logoUrl) {
                    // Atualizar preview
                    const previewImg = document.getElementById('logo-preview-img');
                    if (previewImg) {
                        previewImg.src = data.logoUrl;
                    }
                    
                    // Disparar evento para atualizar outras partes da interface
                    window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: data.logoUrl } }));
                }
                
                // Recarregar página se estiver na aba empresa
                if (window.location.hash.includes('empresa')) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } else {
                const error = await response.json();
                alert('❌ Erro ao atualizar logo: ' + (error.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('❌ Erro ao fazer upload:', error);
            alert('❌ Erro ao fazer upload da logo. Tente novamente.');
        }
    }

    /**
     * Mostrar/ocultar elementos baseado no plano
     */
    async function updateVisibility() {
        const planCode = await getUserPlanCode();
        
        if (!planCode) {
            console.warn('⚠️ Não foi possível obter plan_code');
            // Ocultar tudo por segurança
            hideAllEmpresaElements();
            return;
        }

        console.log('📋 Plan Code do usuário:', planCode);

        // Verificar se pode alterar logo
        const canEdit = canEditLogo(planCode);
        const hasEmpresa = hasModoEmpresa(planCode);

        // Mostrar/ocultar botão Empresa no sidebar
        const empresaTabSidebar = document.querySelector('.sidebar-tab[data-tab="times"], #empresa-tab-sidebar');
        if (empresaTabSidebar) {
            if (hasEmpresa) {
                empresaTabSidebar.style.display = 'flex';
                empresaTabSidebar.style.visibility = 'visible';
                console.log('✅ Tab "Empresa" no sidebar visível');
            } else {
                empresaTabSidebar.style.display = 'none';
                empresaTabSidebar.style.visibility = 'hidden';
                console.log('❌ Tab "Empresa" no sidebar oculta');
            }
        }

        // Mostrar/ocultar botão Empresa criado dinamicamente (se existir)
        const empresaButton = document.querySelector('[data-empresa-button="true"]');
        if (empresaButton) {
            if (hasEmpresa) {
                empresaButton.style.display = '';
                empresaButton.style.visibility = 'visible';
                console.log('✅ Botão "Modo Empresa" visível');
            } else {
                empresaButton.style.display = 'none';
                empresaButton.style.visibility = 'hidden';
                // Remover o botão se não tiver permissão
                empresaButton.remove();
                console.log('❌ Botão "Modo Empresa" removido');
            }
        }

        // Mostrar/ocultar opção Alterar Logo
        const logoOption = document.querySelector('[data-logo-option="true"]');
        if (logoOption) {
            if (canEdit) {
                logoOption.style.display = '';
                logoOption.style.visibility = 'visible';
                console.log('✅ Opção "Alterar Logo" visível');
            } else {
                logoOption.style.display = 'none';
                logoOption.style.visibility = 'hidden';
                console.log('❌ Opção "Alterar Logo" oculta');
            }
        }
    }

    /**
     * Interceptar fetch para armazenar accountType
     */
    function setupFetchInterceptor() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            
            // Se for /api/account/status e foi bem-sucedido
            if (response.ok && args[0] && args[0].includes('/api/account/status')) {
                try {
                    const data = await response.clone().json();
                    if (data.accountType) {
                        localStorage.setItem('accountType', data.accountType);
                        if (!window.accountData) {
                            window.accountData = {};
                        }
                        window.accountData.accountType = data.accountType;
                        
                        // Atualizar visibilidade
                        setTimeout(() => {
                            updateVisibility();
                        }, 300);
                    }
                } catch (e) {
                    // Ignorar erro de parse
                }
            }
            
            return response;
        };
    }

    /**
     * Inicializar
     */
    async function init() {
        console.log('🚀 Inicializando restauração de Modo Empresa e Alterar Logo...');

        // Interceptar fetch
        setupFetchInterceptor();

        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                await setupElements();
            });
        } else {
            await setupElements();
        }
    }

    /**
     * Ocultar todos os elementos de Empresa
     */
    function hideAllEmpresaElements() {
        const empresaTabSidebar = document.querySelector('.sidebar-tab[data-tab="times"], #empresa-tab-sidebar');
        if (empresaTabSidebar) {
            empresaTabSidebar.style.display = 'none';
            empresaTabSidebar.style.visibility = 'hidden';
        }
        
        const empresaButton = document.querySelector('[data-empresa-button="true"]');
        if (empresaButton) {
            empresaButton.remove();
        }
    }

    /**
     * Configurar elementos
     */
    async function setupElements() {
        // Aguardar um pouco para garantir que sidebar está renderizado
        await new Promise(resolve => setTimeout(resolve, 500));

        // PRIMEIRO: Verificar se tem permissão antes de criar
        const planCode = await getUserPlanCode();
        const hasEmpresa = planCode && hasModoEmpresa(planCode);

        // Criar botão Empresa APENAS se tiver permissão
        if (hasEmpresa) {
            createEmpresaButton();
        } else {
            // Remover se já existir
            const existingButton = document.querySelector('[data-empresa-button="true"]');
            if (existingButton) {
                existingButton.remove();
            }
        }

        // Criar opção Alterar Logo (sempre criar, depois ocultar se necessário)
        createAlterarLogoOption();

        // Atualizar visibilidade baseado no plano
        await updateVisibility();

        // Observar mudanças no DOM
        const observer = new MutationObserver(() => {
            setTimeout(() => {
                updateVisibility();
            }, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Executar periodicamente
        setInterval(() => {
            updateVisibility();
        }, 5000);
    }

    // Inicializar
    init();

    // Expor funções globalmente
    window.canEditLogo = canEditLogo;
    window.hasModoEmpresa = hasModoEmpresa;
    window.getUserPlanCode = getUserPlanCode;
    window.updateEmpresaLogoVisibility = updateVisibility;

    console.log('✅ Restauração de Modo Empresa e Alterar Logo carregada');

})();
