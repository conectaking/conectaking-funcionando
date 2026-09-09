// Implementação segura de showSuccessMessage para evitar recursão infinita
        (function() {
            let originalShowSuccessMessage = null;
            let isShowingMessage = false;
            let messageQueue = [];
            
            // Aguardar até que formPageEdit.js seja carregado
            function setupSafeShowSuccessMessage() {
                if (typeof showSuccessMessage === 'function' && !window._safeShowSuccessMessageSetup) {
                    originalShowSuccessMessage = showSuccessMessage;
                    window._safeShowSuccessMessageSetup = true;
                    
                    // Substituir por versão segura
                    window.showSuccessMessage = function(message) {
                        // Se já está mostrando, adicionar à fila ou ignorar silenciosamente
                        if (isShowingMessage) {
                            // Silenciosamente ignorar chamadas recursivas (sem log para não poluir o console)
                            return;
                        }
                        
                        try {
                            isShowingMessage = true;
                            originalShowSuccessMessage(message);
                        } catch (error) {
                            console.error('Erro em showSuccessMessage:', error);
                            // Fallback seguro - mostrar mensagem simples
                            if (typeof message === 'string') {
                                // Criar notificação simples sem depender da função original
                                const notification = document.createElement('div');
                                notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #25D366; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: Arial, sans-serif;';
                                notification.textContent = message;
                                document.body.appendChild(notification);
                                
                                setTimeout(() => {
                                    notification.style.opacity = '0';
                                    notification.style.transition = 'opacity 0.3s';
                                    setTimeout(() => notification.remove(), 300);
                                }, 3000);
                            } else {
                                console.log('', message);
                            }
                        } finally {
                            setTimeout(() => {
                                isShowingMessage = false;
                                // Processar fila se houver mensagens pendentes
                                if (messageQueue.length > 0) {
                                    const nextMessage = messageQueue.shift();
                                    window.showSuccessMessage(nextMessage);
                                }
                            }, 500);
                        }
                    };
                }
            }
            
            // Tentar configurar imediatamente
            setupSafeShowSuccessMessage();
            
            // Também tentar após o DOM estar pronto
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupSafeShowSuccessMessage);
            } else {
                setupSafeShowSuccessMessage();
            }
            
            // Tentar novamente após um pequeno delay para garantir que formPageEdit.js foi carregado
            setTimeout(setupSafeShowSuccessMessage, 100);
            setTimeout(setupSafeShowSuccessMessage, 500);
        })();
        
        // Verificar se é uma lista de convidados e mostrar botões de personalização
        document.addEventListener('DOMContentLoaded', function() {
            // Flag para evitar loops infinitos quando atualizamos programaticamente
            let isUpdatingGuestListSection = false;
            // Tornar flag global para acesso externo
            window.isUpdatingGuestListSection = false;
            
            function checkGuestListAndShowButtons() {
                try {
                    // Evitar execução se já estiver atualizando
                    if (isUpdatingGuestListSection || window.isUpdatingGuestListSection) return;
                    
                    const guestListSection = document.getElementById('guest-list-customize-section');
                    if (!guestListSection) return;
                    
                    // Obter itemId da URL (aceita itemId, itemid ou id)
                    const urlParams = new URLSearchParams(window.location.search);
                    let itemId = urlParams.get('itemId') || urlParams.get('itemid') || urlParams.get('id');
                    
                    // Se não tiver na URL, tentar obter de outros lugares
                    if (!itemId) {
                        // Tentar obter do window.formData ou window.currentFormData
                        if (window.formData && window.formData.id) {
                            itemId = window.formData.id;
                        } else if (window.currentFormData && window.currentFormData.id) {
                            itemId = window.currentFormData.id;
                        } else {
                            // Tentar obter do localStorage ou sessionStorage
                            const savedData = localStorage.getItem('currentFormData') || sessionStorage.getItem('currentFormData');
                            if (savedData) {
                                try {
                                    const parsed = JSON.parse(savedData);
                                    itemId = parsed.id || parsed.profile_item_id;
                                } catch (e) {}
                            }
                        }
                    }
                    
                    // Verificar se enable_guest_list_submit / send_mode Check-in está ativo
                    let isGuestListEnabled = false;
                    
                    // Preferir flags globais do editor (Tipo Captação / Check-in)
                    if (window.sendModeValue === 'checkin' || window.enableGuestListSubmitValue === true || window.currentFormIsGuestList === true) {
                        isGuestListEnabled = true;
                    }
                    if (window.sendModeValue === 'lead' || window.enableGuestListSubmitValue === false) {
                        // Captação explícita: não ativar portaria só por elementos com "guest" no DOM
                        if (window.sendModeValue === 'lead' || document.getElementById('enable-guest-list-submit-value')?.value === 'false') {
                            isGuestListEnabled = false;
                        }
                    }
                    
                    // Verificar checkbox/input (incluindo o toggle da sidebar)
                    const sidebarToggle = document.getElementById('sidebar-enable-guest-list-toggle');
                    const enableGuestListSubmit = document.getElementById('enable-guest-list-submit') || 
                                                 document.getElementById('enable-guest-list-submit-checkbox') ||
                                                 document.querySelector('[name="enable_guest_list_submit"]');
                    
                    // Verificar primeiro o toggle da sidebar
                    if (sidebarToggle) {
                        isGuestListEnabled = sidebarToggle.checked;
                    }
                    
                    // Se não estiver ativo, verificar outros elementos
                    if (!isGuestListEnabled && enableGuestListSubmit) {
                        isGuestListEnabled = enableGuestListSubmit.checked || 
                                           enableGuestListSubmit.value === 'true' || 
                                           enableGuestListSubmit.value === true ||
                                           enableGuestListSubmit.getAttribute('checked') !== null;
                    }
                    
                    // Verificar input hidden
                    if (!isGuestListEnabled) {
                        const enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                        if (enableGuestListSubmitInput) {
                            isGuestListEnabled = enableGuestListSubmitInput.value === 'true' || enableGuestListSubmitInput.value === true;
                        }
                    }
                    const sendModeInput = document.getElementById('send-mode-value');
                    if (sendModeInput?.value === 'checkin') isGuestListEnabled = true;
                    if (sendModeInput?.value === 'lead') isGuestListEnabled = false;
                    
                    // Verificar em window.formData
                    if (!isGuestListEnabled && window.formData) {
                        isGuestListEnabled = window.formData.enable_guest_list_submit === true || 
                                           window.formData.enable_guest_list_submit === 'true' ||
                                           window.formData.send_mode === 'checkin';
                    }
                    
                    // Verificar em localStorage/sessionStorage
                    if (!isGuestListEnabled) {
                        try {
                            const savedFormData = localStorage.getItem('currentFormData') || sessionStorage.getItem('currentFormData');
                            if (savedFormData) {
                                const parsed = JSON.parse(savedFormData);
                                isGuestListEnabled = parsed.enable_guest_list_submit === true || parsed.enable_guest_list_submit === 'true' || parsed.send_mode === 'checkin';
                            }
                        } catch (e) {}
                    }
                    
                    // Confirmar via API pelas flags (não pela existência de guest_list)
                    if (itemId && sendModeInput == null && document.getElementById('enable-guest-list-submit-value') == null) {
                                const apiBaseUrl = String(window.API_URL || window.API_BASE || window.location.origin || '').replace(/\/$/, '');
                                const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
                                fetch(`${apiBaseUrl}/api/profile/items/${itemId}`, {
                                    headers: {
                                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                    }
                                })
                                    .then(res => res.json())
                                    .then(data => {
                                        const dfi = data?.data?.digital_form_data || data?.digital_form_data || data || {};
                                        let mode = (dfi.send_mode || '').toString().toLowerCase();
                                        if (mode === 'system-only') mode = 'checkin';
                                        const glOn = dfi.enable_guest_list_submit === true || dfi.enable_guest_list_submit === 'true';
                                        const enabled = mode === 'checkin' || (mode !== 'lead' && glOn);
                                        updateGuestListSection(enabled, itemId, guestListSection);
                                    })
                                    .catch(() => {
                                        updateGuestListSection(false, itemId, guestListSection);
                                    });
                                return;
                    }
                    updateGuestListSection(isGuestListEnabled, itemId, guestListSection);
                    
                    // Função para atualizar a seção (tornada global para acesso externo)
                    function updateGuestListSection(enabled, id, section) {
                        if (!section) return;
                        
                        // Marcar que estamos atualizando para evitar loops infinitos
                        isUpdatingGuestListSection = true;
                        
                        try {
                            const toggleCheckbox = document.getElementById('sidebar-enable-guest-list-toggle');
                            const toggleSwitch = document.getElementById('guest-list-toggle-switch');
                            const statusDiv = document.getElementById('guest-list-status');
                            // Não buscar o botão aqui - buscar quando necessário para garantir referência atualizada
                            
                            // Atualizar toggle - remover listener temporariamente para evitar loop
                            if (toggleCheckbox) {
                                // Remover listener temporariamente
                                const currentChecked = toggleCheckbox.checked;
                                if (currentChecked !== enabled) {
                                    // Desabilitar observer temporariamente
                                    toggleCheckbox.checked = enabled;
                                }
                            }
                        if (toggleSwitch) {
                            const toggleSpan = toggleSwitch.querySelector('span');
                            if (enabled) {
                                toggleSwitch.style.background = '#25D366';
                                toggleSwitch.style.borderColor = '#25D366';
                                if (toggleSpan) toggleSpan.style.left = '27px';
                            } else {
                                toggleSwitch.style.background = 'rgba(255,255,255,0.2)';
                                toggleSwitch.style.borderColor = 'rgba(255,255,255,0.2)';
                                if (toggleSpan) toggleSpan.style.left = '3px';
                            }
                        }
                        
                        if (enabled && id) {
                            // Mostrar status ativo e habilitar botões
                            if (statusDiv) statusDiv.style.display = 'block';
                            
                            // Buscar botão novamente para garantir que temos a referência correta
                            const customizePortariaBtn = document.getElementById('customize-portaria-btn');
                            
                            if (customizePortariaBtn) {
                                console.log('Habilitando botão de personalização da portaria para item:', id);
                                // Remover todos os event listeners anteriores
                                const newBtn = customizePortariaBtn.cloneNode(true);
                                customizePortariaBtn.parentNode.replaceChild(newBtn, customizePortariaBtn);
                                
                                // Atualizar referência
                                const updatedBtn = document.getElementById('customize-portaria-btn');
                                
                                if (updatedBtn) {
                                    updatedBtn.disabled = false;
                                    updatedBtn.style.opacity = '1';
                                    updatedBtn.style.cursor = 'pointer';
                                    
                                    // Adicionar novo listener
                                    updatedBtn.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        // Obter token do localStorage
                                        const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
                                        
                                        if (!token) {
                                            alert('Erro: Token de autenticação não encontrado. Por favor, faça login novamente.');
                                            return;
                                        }
                                        
                                        // Cookie SameSite para o documento HTML (sem ?token= na URL)
                                        try {
                                            const secure = location.protocol === 'https:' ? '; Secure' : '';
                                            document.cookie = `token=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
                                        } catch (_) {}
                                        const apiBaseUrl = String(window.API_URL || window.API_BASE || window.location.origin || '').replace(/\/$/, '');
                                        const url = `${apiBaseUrl}/api/guest-lists/${id}/customize-portaria`;
                                        
                                        console.log('Abrindo página de personalização da portaria');
                                        window.open(url, '_blank');
                                    });
                                }
                            }
                        } else {
                            // Ocultar status e desabilitar botões
                            if (statusDiv) statusDiv.style.display = 'none';
                            
                            // Buscar botão novamente para garantir que temos a referência correta
                            const customizePortariaBtn = document.getElementById('customize-portaria-btn');
                            
                            if (customizePortariaBtn) {
                                console.log('O Desabilitando botão de personalização da portaria');
                                // Remover listeners e desabilitar
                                const newBtn = customizePortariaBtn.cloneNode(true);
                                customizePortariaBtn.parentNode.replaceChild(newBtn, customizePortariaBtn);
                                
                                const updatedBtn = document.getElementById('customize-portaria-btn');
                                if (updatedBtn) {
                                    updatedBtn.disabled = true;
                                    updatedBtn.style.opacity = '0.5';
                                    updatedBtn.style.cursor = 'not-allowed';
                                }
                            }
                        }
                        } finally {
                            // Sempre restaurar a flag após um pequeno delay para permitir que o DOM se atualize
                            setTimeout(() => {
                                isUpdatingGuestListSection = false;
                                window.isUpdatingGuestListSection = false;
                            }, 100);
                        }
                    }
                    
                    // Tornar função global para acesso externo
                    window.updateGuestListSection = updateGuestListSection;
                    
                } catch (error) {
                    console.error('Erro ao verificar guest list:', error);
                }
            }
            
            // Verificar múltiplas vezes para garantir
            setTimeout(checkGuestListAndShowButtons, 500);
            setTimeout(checkGuestListAndShowButtons, 1500);
            setTimeout(checkGuestListAndShowButtons, 3000);
            
            // Observar mudanças no DOM - mas evitar loops infinitos
            const observer = new MutationObserver(function(mutations) {
                // Ignorar se estiver atualizando programaticamente
                if (isUpdatingGuestListSection || window.isUpdatingGuestListSection) return;
                
                // Verificar se a mudança é relevante antes de chamar
                let shouldUpdate = false;
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes') {
                        const target = mutation.target;
                        // Ignorar mudanças no checkbox que estamos atualizando programaticamente
                        if (target.id === 'sidebar-enable-guest-list-toggle' && mutation.attributeName === 'checked') {
                            continue;
                        }
                        shouldUpdate = true;
                        break;
                    } else if (mutation.type === 'childList') {
                        shouldUpdate = true;
                        break;
                    }
                }
                
                if (shouldUpdate) {
                    checkGuestListAndShowButtons();
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['value', 'checked']
            });
            
            // Observar mudanças no checkbox de lista de convidados no modal
            const modalObserver = new MutationObserver(function() {
                // Ignorar se estiver atualizando programaticamente
                if (isUpdatingGuestListSection || window.isUpdatingGuestListSection) return;
                checkGuestListAndShowButtons();
            });
            
            // Observar quando o modal de configurações é aberto
            document.addEventListener('click', function(e) {
                if (e.target.closest('#sidebar-settings')) {
                    setTimeout(() => {
                        const modal = document.querySelector('.settings-modal');
                        if (modal) {
                            const guestListCheckbox = modal.querySelector('#modal-enable-guest-list-submit');
                            if (guestListCheckbox) {
                                guestListCheckbox.addEventListener('change', function() {
                                    setTimeout(checkGuestListAndShowButtons, 200);
                                });
                            }
                        }
                    }, 500);
                }
            });
            
            // Tornar função global para acesso externo
            window.checkGuestListAndShowButtons = checkGuestListAndShowButtons;
            
            // Toggle para ativar/desativar lista de convidados
            const guestListToggle = document.getElementById('sidebar-enable-guest-list-toggle');
            if (guestListToggle) {
                guestListToggle.addEventListener('change', async function() {
                    const isEnabled = this.checked;
                    const toggleSwitch = document.getElementById('guest-list-toggle-switch');
                    
                    // Obter itemId de múltiplas fontes (URL aceita itemId, itemid ou id)
                    const urlParams = new URLSearchParams(window.location.search);
                    let itemId = urlParams.get('itemId') || urlParams.get('itemid') || urlParams.get('id');
                    
                    if (!itemId) {
                        // Tentar obter de várias fontes (em ordem de prioridade)
                        // 1. window.currentItemId (do formPageEdit.js)
                        if (typeof window !== 'undefined' && window.currentItemId) {
                            itemId = window.currentItemId;
                        }
                        // 2. localStorage do formPageEdit.js
                        if (!itemId) {
                            const lastEditedItemId = localStorage.getItem('lastEditedFormItemId');
                            if (lastEditedItemId) {
                                itemId = lastEditedItemId;
                            }
                        }
                        // 3. window.formData
                        if (!itemId && window.formData && window.formData.id) {
                            itemId = window.formData.id;
                        }
                        // 4. window.currentFormData
                        if (!itemId && window.currentFormData && window.currentFormData.id) {
                            itemId = window.currentFormData.id;
                        }
                        // 5. localStorage/sessionStorage
                        if (!itemId) {
                            const savedData = localStorage.getItem('currentFormData') || sessionStorage.getItem('currentFormData');
                            if (savedData) {
                                try {
                                    const parsed = JSON.parse(savedData);
                                    itemId = parsed.id || parsed.profile_item_id;
                                } catch (e) {}
                            }
                        }
                    }
                    
                    // Se ainda não tiver itemId, tentar buscar do formPageEdit.js
                    if (!itemId && typeof window !== 'undefined') {
                        // Verificar se há algum elemento com data-item-id
                        const itemElement = document.querySelector('[data-item-id]');
                        if (itemElement) {
                            itemId = itemElement.getAttribute('data-item-id');
                        }
                    }
                    
                    if (!itemId) {
                        console.error('ItemId não encontrado. Fontes verificadas:', {
                            url: window.location.href,
                            windowCurrentItemId: window.currentItemId,
                            windowFormData: window.formData?.id,
                            windowCurrentFormData: window.currentFormData?.id
                        });
                        alert('Erro: ID do formulário não encontrado. Por favor, recarregue a página e tente novamente.');
                        this.checked = !isEnabled;
                        // Reverter visual do toggle
                        if (toggleSwitch) {
                            const toggleSpan = toggleSwitch.querySelector('span');
                            if (!isEnabled) {
                                toggleSwitch.style.background = '#25D366';
                                toggleSwitch.style.borderColor = '#25D366';
                                if (toggleSpan) toggleSpan.style.left = '27px';
                            } else {
                                toggleSwitch.style.background = 'rgba(255,255,255,0.2)';
                                toggleSwitch.style.borderColor = 'rgba(255,255,255,0.2)';
                                if (toggleSpan) toggleSpan.style.left = '3px';
                            }
                        }
                        return;
                    }
                    
                    // Atualizar input hidden
                    let enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                    if (!enableGuestListSubmitInput) {
                        enableGuestListSubmitInput = document.createElement('input');
                        enableGuestListSubmitInput.type = 'hidden';
                        enableGuestListSubmitInput.id = 'enable-guest-list-submit-value';
                        document.body.appendChild(enableGuestListSubmitInput);
                    }
                    enableGuestListSubmitInput.value = isEnabled ? 'true' : 'false';
                    window.enableGuestListSubmitValue = isEnabled;
                    
                    // Salvar no servidor
                    try {
                        // Usar rota específica para digital_form que atualiza enable_guest_list_submit
                        // Obter token correto (pode ser 'token' ou 'conectaKingToken')
                        const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
                        
                        const requestBody = {
                            enable_guest_list_submit: isEnabled
                        };
                        
                        // Same-origin (Laravel local ou produção)
                        const apiBaseUrl = String(window.API_URL || window.API_BASE || window.location.origin || '').replace(/\/$/, '');
                        
                        console.log(`[GUEST_LIST] Enviando requisição PUT para ${apiBaseUrl}/api/profile/items/digital_form/${itemId}`);
                        console.log(`[GUEST_LIST] Body:`, requestBody);
                        console.log(`[GUEST_LIST] Token presente:`, !!token);
                        
                        const response = await fetch(`${apiBaseUrl}/api/profile/items/digital_form/${itemId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                            },
                            body: JSON.stringify(requestBody)
                        });
                        
                        // Tentar parsear resposta JSON apenas se houver conteúdo
                        let responseData = null;
                        const contentType = response.headers.get('content-type');
                        const responseText = await response.text();
                        
                        if (responseText && contentType && contentType.includes('application/json')) {
                            try {
                                responseData = JSON.parse(responseText);
                            } catch (parseError) {
                                console.warn('Resposta não é JSON válido:', responseText);
                                responseData = { message: 'Resposta inválida do servidor' };
                            }
                        } else if (responseText.trim()) {
                            // Se não for JSON mas tiver texto, usar como mensagem
                            responseData = { message: responseText };
                        } else {
                            // Resposta vazia - considerar sucesso se status for OK
                            responseData = {};
                        }
                        
                        console.log(`[GUEST_LIST] Resposta recebida:`, {
                            status: response.status,
                            statusText: response.statusText,
                            ok: response.ok,
                            responseData: responseData,
                            responseText: responseText.substring(0, 500)
                        });
                        
                        if (response.ok) {
                            // Atualizar seção - buscar guestListSection se não estiver disponível
                            const guestListSection = document.getElementById('guest-list-customize-section');
                            if (typeof window.updateGuestListSection === 'function') {
                                window.updateGuestListSection(isEnabled, itemId, guestListSection);
                            } else if (typeof updateGuestListSection === 'function') {
                                updateGuestListSection(isEnabled, itemId, guestListSection);
                            } else {
                                console.warn('updateGuestListSection não está disponível. Tentando recarregar a seção...');
                                // Tentar recarregar a página ou atualizar manualmente
                                if (guestListSection) {
                                    // Usar flag global se disponível para evitar loops
                                    if (typeof window.isUpdatingGuestListSection !== 'undefined') {
                                        window.isUpdatingGuestListSection = true;
                                    }
                                    
                                    const toggleCheckbox = document.getElementById('sidebar-enable-guest-list-toggle');
                                    const toggleSwitch = document.getElementById('guest-list-toggle-switch');
                                    if (toggleCheckbox) toggleCheckbox.checked = isEnabled;
                                    if (toggleSwitch) {
                                        const toggleSpan = toggleSwitch.querySelector('span');
                                        if (isEnabled) {
                                            toggleSwitch.style.background = '#25D366';
                                            toggleSwitch.style.borderColor = '#25D366';
                                            if (toggleSpan) toggleSpan.style.left = '27px';
                                        } else {
                                            toggleSwitch.style.background = 'rgba(255,255,255,0.2)';
                                            toggleSwitch.style.borderColor = 'rgba(255,255,255,0.2)';
                                            if (toggleSpan) toggleSpan.style.left = '3px';
                                        }
                                    }
                                    
                                    // Restaurar flag após atualização
                                    if (typeof window.isUpdatingGuestListSection !== 'undefined') {
                                        setTimeout(() => {
                                            window.isUpdatingGuestListSection = false;
                                        }, 100);
                                    }
                                }
                            }
                            
                            // Atualizar window.formData se existir
                            if (window.formData) {
                                window.formData.enable_guest_list_submit = isEnabled;
                            }
                            if (window.currentFormData) {
                                window.currentFormData.enable_guest_list_submit = isEnabled;
                            }
                            
                            // Mostrar mensagem de sucesso - com proteção contra recursão
                            const successMessage = isEnabled ? 'Lista de Convidados ativada!' : 'Lista de Convidados desativada!';
                            
                            // Verificar se showSuccessMessage existe e não está em loop
                            if (typeof showSuccessMessage === 'function') {
                                // Proteção contra recursão infinita
                                if (!window._showingSuccessMessage) {
                                    try {
                                        window._showingSuccessMessage = true;
                                        showSuccessMessage(successMessage);
                                        // Resetar flag após um delay
                                        setTimeout(() => {
                                            window._showingSuccessMessage = false;
                                        }, 1000);
                                    } catch (error) {
                                        console.error('Erro ao mostrar mensagem de sucesso:', error);
                                        // Fallback para console.log se showSuccessMessage falhar
                                        console.log(successMessage);
                                        window._showingSuccessMessage = false;
                                    }
                                } else {
                                    // Se já está mostrando, usar console.log como fallback
                                    console.log(successMessage);
                                }
                            } else {
                                console.log(successMessage);
                            }
                        } else {
                            // Tratar diferentes tipos de erro
                            const errorMessage = (responseData && (responseData.message || responseData.error)) || 
                                               responseText || 
                                               'Erro ao salvar configuração';
                            
                            console.error(`[GUEST_LIST] Erro na resposta:`, {
                                status: response.status,
                                statusText: response.statusText,
                                errorMessage: errorMessage,
                                responseData: responseData,
                                responseText: responseText
                            });
                            
                            if (response.status === 404) {
                                alert('Formulário não encontrado. Verifique se o formulário ainda existe e recarregue a página.');
                            } else if (response.status === 403) {
                                alert('Você não tem permissão para editar este formulário.');
                            } else if (response.status === 500) {
                                alert(`Erro interno do servidor: ${errorMessage}`);
                            } else {
                                alert(`Erro ao salvar: ${errorMessage}`);
                            }
                            
                            // Reverter toggle
                            this.checked = !isEnabled;
                            if (toggleSwitch) {
                                const toggleSpan = toggleSwitch.querySelector('span');
                                if (!isEnabled) {
                                    toggleSwitch.style.background = '#25D366';
                                    toggleSwitch.style.borderColor = '#25D366';
                                    if (toggleSpan) toggleSpan.style.left = '27px';
                                } else {
                                    toggleSwitch.style.background = 'rgba(255,255,255,0.2)';
                                    toggleSwitch.style.borderColor = 'rgba(255,255,255,0.2)';
                                    if (toggleSpan) toggleSpan.style.left = '3px';
                                }
                            }
                        }
                    } catch (error) {
                        console.error('O Erro ao salvar configuração:', error);
                        console.error('O Stack trace:', error.stack);
                        console.error('O Error name:', error.name);
                        console.error('O Error message:', error.message);
                        alert(`Erro ao salvar configuração: ${error.message || 'Erro de conexão. Verifique sua internet e tente novamente.'}`);
                        // Reverter toggle
                        this.checked = !isEnabled;
                        const toggleSwitch = document.getElementById('guest-list-toggle-switch');
                        if (toggleSwitch) {
                            const toggleSpan = toggleSwitch.querySelector('span');
                            if (!isEnabled) {
                                toggleSwitch.style.background = '#25D366';
                                toggleSwitch.style.borderColor = '#25D366';
                                if (toggleSpan) toggleSpan.style.left = '27px';
                            } else {
                                toggleSwitch.style.background = 'rgba(255,255,255,0.2)';
                                toggleSwitch.style.borderColor = 'rgba(255,255,255,0.2)';
                                if (toggleSpan) toggleSpan.style.left = '3px';
                            }
                        }
                    }
                });
            }
        });
