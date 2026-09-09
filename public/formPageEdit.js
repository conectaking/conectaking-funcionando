document.addEventListener('DOMContentLoaded', () => {
    const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
    let currentItemId = null;
    let formFields = [];
    let questionsSortableInstance = null;
    
    // Sistema de controle de rate limiting - evitar múltiplas requisições simultâneas
    let isAnyRequestPending = false;
    const requestQueue = [];
    
    // Função auxiliar para fazer requisições com controle de rate limiting
    async function safeFetch(url, options = {}, delay = 200) {
        // Se já há uma requisição pendente, aguardar um pouco
        if (isAnyRequestPending) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        isAnyRequestPending = true;
        try {
            const response = await fetch(url, options);
            // Pequeno delay após a requisição para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            return response;
        } finally {
            isAnyRequestPending = false;
        }
    }
    let currentItemData = {}; // Armazena dados do item atual (is_listed, share_token, etc.)
    
    // Sistema de Autosave
    let autosaveTimer = null;
    let lastSavedHash = '';
    
    function getFormHash() {
        const formFieldsJsonEl = document.getElementById('form-fields-json');
        const titleEl = document.getElementById('preview-title');
        const descEl = document.getElementById('preview-description');
        
        const data = {
            fields: formFieldsJsonEl?.value || '[]',
            title: titleEl?.textContent || '',
            description: descEl?.textContent || ''
        };
        
        return JSON.stringify(data);
    }
    
    function autoSave() {
        const currentHash = getFormHash();
        if (currentHash === lastSavedHash) {
            return; // Nada mudou
        }
        
        // Salvar em localStorage como rascunho
        const draft = {
            itemId: currentItemId,
            timestamp: new Date().toISOString(),
            data: {
                form_fields: JSON.parse(document.getElementById('form-fields-json')?.value || '[]'),
                form_title: document.getElementById('preview-title')?.textContent || '',
                form_description: document.getElementById('preview-description')?.textContent || ''
            }
        };
        
        localStorage.setItem(`kingForms_draft_${currentItemId}`, JSON.stringify(draft));
        
        // Mostrar indicador discreto
        const saveBtn = document.getElementById('save-form-btn');
        if (saveBtn) {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Rascunho salvo';
            saveBtn.style.opacity = '0.7';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.style.opacity = '1';
            }, 1500);
        }
        
        lastSavedHash = currentHash;
    }
    
    // Flag global para evitar loops no MutationObserver
    let isUpdatingStyles = false;
    
    function setupAutoSave() {
        // Autosave a cada 30 segundos se houver mudanças
        setInterval(() => {
            if (document.hasFocus()) {
                autoSave();
            }
        }, 30000);
        
        // Autosave quando detectar mudanças (apenas mudanças estruturais, não de estilo)
        const observer = new MutationObserver((mutations) => {
            // Ignorar se estivermos atualizando estilos
            if (isUpdatingStyles) return;
            
            // Ignorar mudanças apenas de atributos/style (não são mudanças estruturais importantes)
            const hasStructuralChanges = mutations.some(mutation => {
                if (mutation.type === 'childList') return true;
                if (mutation.type === 'attributes') {
                    // Ignorar mudanças de style e class (são apenas visuais)
                    const attrName = mutation.attributeName;
                    return attrName !== 'style' && attrName !== 'class';
                }
                return false;
            });
            
            if (hasStructuralChanges) {
                if (autosaveTimer) clearTimeout(autosaveTimer);
                autosaveTimer = setTimeout(autoSave, 2000); // Debounce 2s
            }
        });
        
        const previewContainer = document.getElementById('preview-questions-container');
        if (previewContainer) {
            // Observar apenas mudanças estruturais e atributos (mas ignorar style/class no callback)
            observer.observe(previewContainer, { 
                childList: true, 
                subtree: true,
                attributes: true
            });
        }
        
        // Autosave em inputs de título e descrição
        ['preview-title', 'preview-description'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    if (autosaveTimer) clearTimeout(autosaveTimer);
                    autosaveTimer = setTimeout(autoSave, 2000);
                });
            }
        });
    }
    
    // Verificar se há rascunho salvo ao carregar
    function checkDraft() {
        if (!currentItemId) return;
        
        const draftKey = `kingForms_draft_${currentItemId}`;
        const draftStr = localStorage.getItem(draftKey);
        
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                const draftAge = new Date() - new Date(draft.timestamp);
                const hoursOld = draftAge / (1000 * 60 * 60);
                
                if (hoursOld < 24) { // Rascunho válido por 24h
                    if (confirm(`Encontramos um rascunho salvo ${hoursOld < 1 ? 'há alguns minutos' : `há ${Math.floor(hoursOld)} horas`}.\n\nDeseja restaurar?`)) {
                        // Restaurar dados
                        if (draft.data.form_fields) {
                            document.getElementById('form-fields-json').value = JSON.stringify(draft.data.form_fields);
                            formFields = draft.data.form_fields;
                            renderPreviewQuestions();
                        }
                        if (draft.data.form_title) {
                            document.getElementById('preview-title').textContent = draft.data.form_title;
                        }
                        if (draft.data.form_description) {
                            document.getElementById('preview-description').textContent = draft.data.form_description;
                        }
                        showSuccessMessage('Rascunho restaurado com sucesso!');
                    } else {
                        // Remover rascunho se usuário não quiser restaurar
                        localStorage.removeItem(draftKey);
                    }
                } else {
                    localStorage.removeItem(draftKey);
                }
            } catch (e) {
                console.error('Erro ao restaurar rascunho:', e);
            }
        }
    }
    
    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        // Ctrl+S ou Cmd+S para salvar
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const saveBtn = document.getElementById('save-form-btn');
            if (saveBtn && !saveBtn.disabled) {
                saveBtn.click();
            }
        }
        
        // Esc para fechar modais
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.settings-modal, .dashboard-modal, .responses-modal, [style*="z-index: 10000"]');
            modals.forEach(modal => {
                if (modal.style.display !== 'none') {
                    modal.remove();
                }
            });
        }
    });
    
    // Obter itemId da URL (aceita itemId, itemid, id ou item_id)
    const urlParams = new URLSearchParams(window.location.search);
    currentItemId = urlParams.get('itemId') || urlParams.get('itemid') || urlParams.get('id') || urlParams.get('item_id');
    
    // Tornar currentItemId globalmente acessível
    window.currentItemId = currentItemId;
    
    // Se ainda não encontrou, tentar obter do hash da URL
    if (!currentItemId && window.location.hash) {
        const hashMatch = window.location.hash.match(/[?&]itemId=(\d+)/i);
        if (hashMatch) {
            currentItemId = hashMatch[1];
        }
    }
    
    // Tentar obter do localStorage (último item editado)
    if (!currentItemId) {
        const lastEditedItemId = localStorage.getItem('lastEditedFormItemId');
        if (lastEditedItemId) {
            console.log('[INIT] Usando itemId do localStorage:', lastEditedItemId);
            currentItemId = lastEditedItemId;
            // Atualizar URL sem recarregar
            const newUrl = `${window.location.pathname}?itemId=${currentItemId}`;
            window.history.replaceState({}, '', newUrl);
        }
    }
    
    console.log('[INIT] ItemId obtido da URL:', currentItemId);
    console.log('[INIT] URL completa:', window.location.href);
    console.log('[INIT] Query params:', window.location.search);
    
    if (!currentItemId) {
        console.error('O [INIT] ItemId não encontrado na URL');
        console.error('O [INIT] URL atual:', window.location.href);
        console.error('O [INIT] Tentando obter do localStorage...');
        
        // ltima tentativa: verificar se há algum item salvo
        const allKeys = Object.keys(localStorage);
        const formKeys = allKeys.filter(key => key.startsWith('kingForms_draft_'));
        if (formKeys.length > 0) {
            const lastKey = formKeys[formKeys.length - 1];
            const draftId = lastKey.replace('kingForms_draft_', '');
            console.log('[INIT] Encontrado rascunho com ID:', draftId);
            currentItemId = draftId;
            const newUrl = `${window.location.pathname}?itemId=${currentItemId}`;
            window.history.replaceState({}, '', newUrl);
        } else {
            alert('ID do formulário não encontrado na URL.\n\nPor favor, acesse o formulário através do dashboard.\n\nRedirecionando...');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
            return;
        }
    }
    
    // Salvar itemId no localStorage para uso futuro
    if (currentItemId) {
        localStorage.setItem('lastEditedFormItemId', currentItemId);
    }
    
    // Função para obter headers
    function getHeaders() {
        const token = localStorage.getItem('conectaKingToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
    // Apenas Authorization (para upload com FormData - não definir Content-Type)
    function getAuthHeadersOnly() {
        const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
        return token ? { 'Authorization': 'Bearer ' + token } : {};
    }
    
    // Função para atualizar previews de imagens e mostrar/esconder botões de remover
    function updateImagePreviews(formData) {
        console.log('[updateImagePreviews] Atualizando previews:', {
            logo: formData.form_logo_url || 'vazio',
            banner: formData.banner_image_url || 'vazio',
            header: formData.header_image_url || 'vazio',
            background: formData.background_image_url || 'vazio'
        });
        
        // Logo
        const logoPreview = document.getElementById('logo-preview');
        const logoUploadText = document.getElementById('logo-upload-text');
        const removeLogoBtn = document.getElementById('remove-logo-btn');
        const logoUrl = formData.form_logo_url || '';
        
        if (logoPreview && logoUrl) {
            logoPreview.src = logoUrl;
            logoPreview.style.display = 'block';
            logoPreview.style.maxWidth = '200px';
            logoPreview.style.maxHeight = '200px';
            logoPreview.style.borderRadius = '8px';
            logoPreview.style.marginBottom = '15px';
            if (logoUploadText) logoUploadText.style.display = 'none';
            if (removeLogoBtn) {
                removeLogoBtn.style.display = 'block';
                console.log('o. Botão remover logo visível');
            }
        } else if (logoPreview) {
            logoPreview.style.display = 'none';
            if (logoUploadText) logoUploadText.style.display = 'block';
            if (removeLogoBtn) removeLogoBtn.style.display = 'none';
        }
        
        // Banner
        const bannerPreview = document.getElementById('banner-preview');
        const bannerUploadText = document.getElementById('banner-upload-text');
        const removeBannerBtn = document.getElementById('remove-banner-btn');
        const bannerUrl = formData.banner_image_url || '';
        
        if (bannerPreview && bannerUrl) {
            bannerPreview.src = bannerUrl;
            bannerPreview.style.display = 'block';
            bannerPreview.style.maxWidth = '100%';
            bannerPreview.style.maxHeight = '300px';
            bannerPreview.style.borderRadius = '8px';
            bannerPreview.style.marginBottom = '15px';
            if (bannerUploadText) bannerUploadText.style.display = 'none';
            if (removeBannerBtn) {
                removeBannerBtn.style.display = 'block';
                console.log('o. Botão remover banner visível');
            }
        } else if (bannerPreview) {
            bannerPreview.style.display = 'none';
            if (bannerUploadText) bannerUploadText.style.display = 'block';
            if (removeBannerBtn) removeBannerBtn.style.display = 'none';
        }
        
        // Header
        const headerPreview = document.getElementById('header-preview');
        const headerUploadText = document.getElementById('header-upload-text');
        const removeHeaderBtn = document.getElementById('remove-header-btn');
        const headerUrl = formData.header_image_url || '';
        
        if (headerPreview && headerUrl) {
            headerPreview.src = headerUrl;
            headerPreview.style.display = 'block';
            headerPreview.style.maxWidth = '100%';
            headerPreview.style.maxHeight = '300px';
            headerPreview.style.borderRadius = '8px';
            headerPreview.style.marginBottom = '15px';
            if (headerUploadText) headerUploadText.style.display = 'none';
            if (removeHeaderBtn) {
                removeHeaderBtn.style.display = 'block';
                console.log('o. Botão remover header visível');
            }
        } else if (headerPreview) {
            headerPreview.style.display = 'none';
            if (headerUploadText) headerUploadText.style.display = 'block';
            if (removeHeaderBtn) removeHeaderBtn.style.display = 'none';
        }
        
        // Background (IMAGEM DE FUNDO) - ESTE É O PRINCIPAL PROBLEMA
        const backgroundPreview = document.getElementById('background-preview');
        const backgroundUploadText = document.getElementById('background-upload-text');
        const removeBackgroundBtn = document.getElementById('remove-background-btn');
        const backgroundUrl = formData.background_image_url || '';
        
        console.log('[Background] Verificando elementos:', {
            preview: !!backgroundPreview,
            uploadText: !!backgroundUploadText,
            removeBtn: !!removeBackgroundBtn,
            url: backgroundUrl || 'vazio'
        });
        
        if (backgroundPreview && backgroundUrl) {
            backgroundPreview.src = backgroundUrl;
            backgroundPreview.style.display = 'block';
            backgroundPreview.style.maxWidth = '100%';
            backgroundPreview.style.maxHeight = '300px';
            backgroundPreview.style.borderRadius = '8px';
            backgroundPreview.style.marginBottom = '15px';
            if (backgroundUploadText) backgroundUploadText.style.display = 'none';
            if (removeBackgroundBtn) {
                removeBackgroundBtn.style.display = 'block';
                console.log('o. Botão de remover imagem de fundo VISÍVEL');
            } else {
                console.error('O Botão remove-background-btn não encontrado!');
            }
        } else if (backgroundPreview) {
            backgroundPreview.style.display = 'none';
            if (backgroundUploadText) backgroundUploadText.style.display = 'block';
            if (removeBackgroundBtn) {
                removeBackgroundBtn.style.display = 'none';
                console.log('Botão de remover imagem de fundo oculto (sem imagem)');
            }
        } else {
            // Não é erro crítico - o elemento pode não existir em todas as páginas
            if (document.querySelector('.form-edit-page')) {
                console.warn('s️ Elemento background-preview não encontrado (pode não existir nesta página)');
            }
        }
    }
    
    // Função auxiliar para atualizar preview de imagem específica (usado após upload)
    function updateSingleImagePreview(imageType, imageUrl) {
        const formData = {};
        switch(imageType) {
            case 'logo':
                formData.form_logo_url = imageUrl;
                break;
            case 'banner':
                formData.banner_image_url = imageUrl;
                break;
            case 'header':
                formData.header_image_url = imageUrl;
                break;
            case 'background':
                formData.background_image_url = imageUrl;
                break;
        }
        updateImagePreviews(formData);
    }
    
    // Carregar dados do formulário
    let isLoadingFormData = false; // Proteção contra múltiplas chamadas simultâneas
    async function loadFormData() {
        // Proteção contra múltiplas chamadas simultâneas (rate limiting)
        if (isLoadingFormData) {
            console.warn('s️ [loadFormData] Já está carregando dados, ignorando chamada duplicada...');
            return;
        }
        
        try {
            isLoadingFormData = true;
            console.log('Y"" Carregando dados do formulário...', currentItemId);
            // Usar safeFetch para evitar rate limiting
            const response = await safeFetch(`${API_URL}/api/profile`, {
                method: 'GET',
                headers: getHeaders()
            }, 300); // Delay maior para requisição principal
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('O Erro na resposta:', response.status, errorText);
                throw new Error(`Erro ao carregar dados do perfil: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('[LOAD] Dados recebidos:', {
                totalItems: data.items?.length || 0,
                itemTypes: data.items?.map(i => i.item_type) || [],
                searchingFor: currentItemId
            });
            
            let item = data.items?.find(i => String(i.id) === String(currentItemId));
            // Se não veio na listagem (ex.: duplicado recém-criado, atraso de atualização), buscar o item direto por id
            if (!item) {
                console.warn('s️ [LOAD] Item não está na listagem do perfil, tentando GET /api/profile/items/' + currentItemId);
                try {
                    const itemRes = await safeFetch(`${API_URL}/api/profile/items/${currentItemId}`, { headers: getHeaders() }, 200);
                    if (itemRes.ok) {
                        const itemJson = await itemRes.json();
                        if (itemJson.success && itemJson.data) {
                            item = itemJson.data;
                            console.log('o. [LOAD] Item carregado via GET /api/profile/items/:id');
                        }
                    }
                } catch (e) {
                    console.warn('s️ [LOAD] Fallback por item id falhou:', e.message);
                }
            }
            if (!item) {
                console.error('O [LOAD] Item não encontrado no array de itens nem por id');
                console.error('O [LOAD] ItemId procurado:', currentItemId);
                console.error('O [LOAD] IDs disponíveis:', data.items?.map(i => `${i.id} (${i.item_type})`) || []);
                alert(`Formulário com ID ${currentItemId} não encontrado.\n\nVerifique se você tem permissão para editar este formulário.\n\nRedirecionando...`);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2500);
                return;
            }
            
            // Verificar se é digital_form ou guest_list (unificado)
            const isDigitalForm = item.item_type === 'digital_form';
            const isGuestList = item.item_type === 'guest_list';
            
            if (!isDigitalForm && !isGuestList) {
                console.error('O [LOAD] Item encontrado mas não é do tipo digital_form ou guest_list:', item.item_type);
                alert('O item selecionado não é um formulário digital ou lista de convidados.\n\nRedirecionando...');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
                return;
            }
            
            // Se for guest_list, carregar dados da lista de convidados
            if (isGuestList) {
                try {
                    // Usar safeFetch para evitar rate limiting
                    const guestListResponse = await safeFetch(`${API_URL}/api/guest-lists/${currentItemId}`, {
                        headers: getHeaders()
                    }, 200);
                    
                    if (guestListResponse.ok) {
                        const guestListData = await guestListResponse.json();
                        console.log('[LOAD] Dados da lista de convidados carregados:', guestListData);
                        
                        // Ativar modo lista de convidados
                        window.currentFormIsGuestList = true;
                        let guestListInput = document.getElementById('is-guest-list-mode');
                        if (!guestListInput) {
                            guestListInput = document.createElement('input');
                            guestListInput.type = 'hidden';
                            guestListInput.id = 'is-guest-list-mode';
                            document.body.appendChild(guestListInput);
                        }
                        guestListInput.value = 'true';
                        
                        // Mapear dados da lista para o formato do formulário
                        // IMPORTANTE: CORES COMPLETAMENTE SEPARADAS!
                        // King Forms usa APENAS cores de digital_form_items (item.digital_form_data)
                        // NÃO usar cores de guest_list_items para o editor do King Forms
                        // Apenas sincronizar dados funcionais (form_fields, form_title, logos, enable_whatsapp, enable_guest_list_submit)
                        const digitalFormColors = item.digital_form_data || {};
                        currentItemData = {
                            ...item,
                            item_type: 'digital_form', // Manter compatibilidade
                            is_listed: item.is_listed !== undefined ? item.is_listed : (item.is_listed === false ? false : true), // Preservar false se for false
                            share_token: item.share_token || null,
                            digital_form_data: {
                                ...digitalFormColors, // Preservar TODOS os dados de digital_form_items primeiro (incluindo cores)
                                // Apenas sobrescrever campos funcionais de guest_list_items (não cores)
                                form_title: guestListData.event_title || guestListData.title || digitalFormColors.form_title,
                                form_description: guestListData.event_description || digitalFormColors.form_description || '',
                                form_fields: guestListData.custom_form_fields || digitalFormColors.form_fields || [],
                                // CORES: Usar APENAS de digital_form_items (já estão em digitalFormColors), NÃO de guest_list_items
                                // primary_color, secondary_color, text_color, background_color, card_color, decorative_bar_color, separator_line_color
                                // vêm de digitalFormColors, não de guestListData
                                header_image_url: guestListData.header_image_url || digitalFormColors.header_image_url || '',
                                background_image_url: guestListData.background_image_url || digitalFormColors.background_image_url || '',
                                // background_opacity e theme podem vir de guest_list se necessário, mas preferir digital_form
                                background_opacity: digitalFormColors.background_opacity !== undefined ? digitalFormColors.background_opacity : (guestListData.background_opacity !== undefined ? guestListData.background_opacity : 1.0),
                                theme: digitalFormColors.theme || guestListData.theme || 'light',
                                // IMPORTANTE: Incluir campos de logo
                                form_logo_url: guestListData.form_logo_url || null,
                                button_logo_url: guestListData.button_logo_url || null,
                                button_logo_size: guestListData.button_logo_size !== undefined ? guestListData.button_logo_size : 40,
                                show_logo_corner: guestListData.show_logo_corner !== undefined ? guestListData.show_logo_corner : false,
                                // Incluir opções de envio
                                enable_whatsapp: guestListData.enable_whatsapp !== undefined ? guestListData.enable_whatsapp : true,
                                enable_guest_list_submit: guestListData.enable_guest_list_submit !== undefined ? guestListData.enable_guest_list_submit : false
                            },
                            guest_list_data: guestListData // Manter referência aos dados originais
                        };
                        
                        console.log('o. [LOAD] Dados de guest_list mapeados para digital_form_data:', {
                            form_logo_url: currentItemData.digital_form_data.form_logo_url,
                            button_logo_url: currentItemData.digital_form_data.button_logo_url,
                            button_logo_size: currentItemData.digital_form_data.button_logo_size,
                            show_logo_corner: currentItemData.digital_form_data.show_logo_corner
                        });
                    } else {
                        // Se não encontrou lista, tratar como formulário normal
                        currentItemData = {
                            ...item,
                            is_listed: item.is_listed !== undefined ? item.is_listed : (item.is_listed === false ? false : true), // Preservar false se for false
                            share_token: item.share_token || null
                        };
                    }
                } catch (err) {
                    console.error('Erro ao carregar lista de convidados:', err);
                    // Continuar como formulário normal
                    currentItemData = {
                        ...item,
                        is_listed: item.is_listed !== undefined ? item.is_listed : (item.is_listed === false ? false : true), // Preservar false se for false
                        share_token: item.share_token || null
                    };
                }
            } else {
                // Formulário digital normal
                currentItemData = {
                    ...item,
                    is_listed: item.is_listed !== undefined ? item.is_listed : (item.is_listed === false ? false : true), // Preservar false se for false
                    share_token: item.share_token || null
                };
                
                // Verificar se há lista de convidados associada a este profile_item
                // Primeiro, verificar diretamente no banco se existe guest_list_items associada
                try {
                    // Tentar buscar a lista - pode ser que o item_type seja digital_form mas tenha uma guest_list associada
                    // Usar safeFetch para evitar rate limiting
                    const guestListCheckResponse = await safeFetch(`${API_URL}/api/guest-lists/${currentItemId}`, {
                        headers: getHeaders()
                    }, 200);
                    
                    if (guestListCheckResponse.ok) {
                        const guestListData = await guestListCheckResponse.json();
                        // Ter guest_list_items NÃO significa Check-in: Captação também pode ter registro associado.
                        // O modo Check-in vem de enable_guest_list_submit / send_mode (resolvido mais abaixo).
                        const hasGuestList = guestListData && (guestListData.id != null || guestListData.profile_item_id != null || guestListData.guest_list_item_id != null);
                        if (hasGuestList) {
                        // Mapear dados da lista para o formato do formulário
                        // IMPORTANTE: CORES COMPLETAMENTE SEPARADAS!
                        // King Forms usa APENAS cores de digital_form_items (item.digital_form_data)
                        // NÃO usar cores de guest_list_items para o editor do King Forms
                        // Apenas sincronizar dados funcionais (form_fields, form_title, logos, enable_whatsapp, enable_guest_list_submit)
                        {
                            // IMPORTANTE: Preservar cores de digital_form_items (item.digital_form_data), NÃO usar cores de guest_list_items
                            const digitalFormColors = item.digital_form_data || currentItemData.digital_form_data || {};
                            let cfFields = guestListData.custom_form_fields != null ? guestListData.custom_form_fields : (digitalFormColors.form_fields || []);
                            if (typeof cfFields === 'string') { try { cfFields = JSON.parse(cfFields); } catch (e) { cfFields = []; } }
                            if (!Array.isArray(cfFields)) cfFields = [];
                            // Preferir flags de digital_form_items (fonte da verdade do Tipo Captação/Check-in)
                            const preferGl = digitalFormColors.enable_guest_list_submit !== undefined && digitalFormColors.enable_guest_list_submit !== null
                                ? digitalFormColors.enable_guest_list_submit
                                : (guestListData.enable_guest_list_submit !== undefined ? guestListData.enable_guest_list_submit : false);
                            const preferWa = digitalFormColors.enable_whatsapp !== undefined && digitalFormColors.enable_whatsapp !== null
                                ? digitalFormColors.enable_whatsapp
                                : (guestListData.enable_whatsapp !== undefined ? guestListData.enable_whatsapp : true);
                            currentItemData.digital_form_data = {
                                ...digitalFormColors, // Preservar TODOS os dados de digital_form_items primeiro (incluindo cores)
                                // Apenas sobrescrever campos funcionais de guest_list_items (não cores)
                                form_title: guestListData.event_title || guestListData.title || digitalFormColors.form_title,
                                form_description: guestListData.event_description || digitalFormColors.form_description || '',
                                form_fields: cfFields,
                                // CORES: Usar APENAS de digital_form_items (já estão em digitalFormColors), NÃO de guest_list_items
                                // primary_color, secondary_color, text_color, background_color, card_color, decorative_bar_color, separator_line_color
                                // vêm de digitalFormColors, não de guestListData
                                header_image_url: guestListData.header_image_url || digitalFormColors.header_image_url || '',
                                background_image_url: guestListData.background_image_url || digitalFormColors.background_image_url || '',
                                // background_opacity e theme podem vir de guest_list se necessário, mas preferir digital_form
                                background_opacity: digitalFormColors.background_opacity !== undefined ? digitalFormColors.background_opacity : (guestListData.background_opacity !== undefined ? guestListData.background_opacity : 1.0),
                                theme: digitalFormColors.theme || guestListData.theme || 'light',
                                // IMPORTANTE: Incluir campos de logo do guest_list_data
                                form_logo_url: guestListData.form_logo_url !== undefined ? guestListData.form_logo_url : (currentItemData.digital_form_data?.form_logo_url || null),
                                button_logo_url: guestListData.button_logo_url !== undefined ? guestListData.button_logo_url : (currentItemData.digital_form_data?.button_logo_url || null),
                                button_logo_size: guestListData.button_logo_size !== undefined ? guestListData.button_logo_size : (currentItemData.digital_form_data?.button_logo_size || 40),
                                show_logo_corner: guestListData.show_logo_corner !== undefined ? guestListData.show_logo_corner : (currentItemData.digital_form_data?.show_logo_corner || false),
                                // Incluir opções de envio
                                enable_whatsapp: preferWa,
                                enable_guest_list_submit: preferGl,
                                send_mode: digitalFormColors.send_mode || guestListData.send_mode || undefined
                            };
                            currentItemData.guest_list_data = guestListData;
                            console.log('o. [LOAD] Dados de guest_list mapeados para digital_form_data (sem forçar Check-in):', { form_fields_count: cfFields.length, form_logo_url: currentItemData.digital_form_data.form_logo_url, enable_guest_list_submit: currentItemData.digital_form_data.enable_guest_list_submit });
                        }
                        }
                    } else if (guestListCheckResponse.status === 404) {
                        // Não há lista associada - continuar como formulário normal
                        console.log('[LOAD] Formulário normal (não há lista de convidados associada)');
                    }
                } catch (err) {
                    // Erro na busca - continuar normalmente como formulário digital
                    console.log('[LOAD] Formulário normal (erro ao verificar lista de convidados):', err.message);
                }
            }
            
            console.log('[LOAD] Dados do item carregados:', currentItemData);
            
            // IMPORTANTE: CORES COMPLETAMENTE SEPARADAS!
            // Para cores, usar APENAS item.digital_form_data (digital_form_items), NUNCA guest_list_items
            // Para dados funcionais, pode usar currentItemData.digital_form_data (que pode ter form_fields de guest_list)
            const formDataForColors = item.digital_form_data || {}; // Cores APENAS de digital_form_items
            const formData = currentItemData.digital_form_data || item.digital_form_data || {}; // Dados gerais (form_fields podem vir de guest_list)
            
            // IMPORTANTE: Substituir cores em formData pelas de digital_form_items apenas
            // Isso garante que cores nunca venham de guest_list_items
            if (formDataForColors.primary_color) formData.primary_color = formDataForColors.primary_color;
            if (formDataForColors.secondary_color !== undefined) formData.secondary_color = formDataForColors.secondary_color;
            if (formDataForColors.text_color) formData.text_color = formDataForColors.text_color;
            if (formDataForColors.background_color) formData.background_color = formDataForColors.background_color;
            if (formDataForColors.card_color) formData.card_color = formDataForColors.card_color;
            if (formDataForColors.decorative_bar_color) formData.decorative_bar_color = formDataForColors.decorative_bar_color;
            if (formDataForColors.separator_line_color) formData.separator_line_color = formDataForColors.separator_line_color;
            if (formDataForColors.background_opacity !== undefined) formData.background_opacity = formDataForColors.background_opacity;
            if (formDataForColors.theme) formData.theme = formDataForColors.theme;
            
            console.log('YZ [LOAD] CORES SEPARADAS: Usando APENAS cores de digital_form_items:', {
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color,
                background_color: formData.background_color,
                card_color: formData.card_color,
                decorative_bar_color: formData.decorative_bar_color,
                source: 'digital_form_items (NÃO guest_list_items)'
            });
            
            // Preencher campos hidden (para salvar)
            const moduleTitleEl = document.getElementById('form-module-title');
            const formTitleEl = document.getElementById('form-title');
            const formDescEl = document.getElementById('form-description');
            const whatsappEl = document.getElementById('whatsapp-number');
            const logoEl = document.getElementById('logo-url');
            const bannerEl = document.getElementById('banner-image-url');
            const headerEl = document.getElementById('header-image-url');
            const backgroundEl = document.getElementById('background-image-url');
            const opacityEl = document.getElementById('background-opacity');
            const themeEl = document.getElementById('form-theme');
            const primaryColorEl = document.getElementById('primary-color');
            const textColorEl = document.getElementById('text-color');
            const secondaryColorEl = document.getElementById('secondary-color');
            const cardColorEl = document.getElementById('card-color');
            
            if (moduleTitleEl) moduleTitleEl.value = item.title || 'King Forms';
            if (formTitleEl) formTitleEl.value = formData.form_title || 'King Forms';
            if (formDescEl) formDescEl.value = formData.form_description || '';
            if (whatsappEl) whatsappEl.value = formData.whatsapp_number || '';
            if (cardColorEl) {
                cardColorEl.value = formData.card_color || '#FFFFFF';
                console.log('o. [LOAD] Cor do card carregada:', formData.card_color || '#FFFFFF');
            }
            
            // Carregar cor das barrinhas decorativas
            let decorativeBarColorEl = document.getElementById('decorative-bar-color');
            if (!decorativeBarColorEl) {
                decorativeBarColorEl = document.createElement('input');
                decorativeBarColorEl.type = 'hidden';
                decorativeBarColorEl.id = 'decorative-bar-color';
                document.body.appendChild(decorativeBarColorEl);
            }
            decorativeBarColorEl.value = formData.decorative_bar_color || formData.primary_color || '#4A90E2';
            console.log('o. [LOAD] Cor das barrinhas decorativas carregada:', decorativeBarColorEl.value);
            
            // Carregar cor da barra principal
            let barColorEl = document.getElementById('bar-color');
            if (!barColorEl) {
                barColorEl = document.createElement('input');
                barColorEl.type = 'hidden';
                barColorEl.id = 'bar-color';
                document.body.appendChild(barColorEl);
            }
            // Usar separator_line_color como fallback, mas preferir primary_color se não houver
            barColorEl.value = formData.separator_line_color || formData.primary_color || '#4A90E2';
            console.log('o. [LOAD] Cor da barra carregada:', barColorEl.value);
            
            // Carregar campos de evento (data e endereço)
            let eventDateEl = document.getElementById('event-date');
            let eventAddressEl = document.getElementById('event-address');
            
            // Criar inputs hidden se não existirem
            if (!eventDateEl) {
                eventDateEl = document.createElement('input');
                eventDateEl.type = 'hidden';
                eventDateEl.id = 'event-date';
                document.body.appendChild(eventDateEl);
            }
            if (!eventAddressEl) {
                eventAddressEl = document.createElement('input');
                eventAddressEl.type = 'hidden';
                eventAddressEl.id = 'event-address';
                document.body.appendChild(eventAddressEl);
            }
            let eventAddressLatEl = document.getElementById('event-address-lat');
            let eventAddressLonEl = document.getElementById('event-address-lon');
            if (!eventAddressLatEl) {
                eventAddressLatEl = document.createElement('input');
                eventAddressLatEl.type = 'hidden';
                eventAddressLatEl.id = 'event-address-lat';
                document.body.appendChild(eventAddressLatEl);
            }
            if (!eventAddressLonEl) {
                eventAddressLonEl = document.createElement('input');
                eventAddressLonEl.type = 'hidden';
                eventAddressLonEl.id = 'event-address-lon';
                document.body.appendChild(eventAddressLonEl);
            }
            
            // Carregar valores de event_date e event_address (e coordenadas)
            if (eventDateEl) {
                eventDateEl.value = formData.event_date || '';
                console.log('Y". [LOAD] event_date carregado:', formData.event_date || '');
            }
            if (eventAddressEl) {
                eventAddressEl.value = formData.event_address || '';
                console.log('[LOAD] event_address carregado:', formData.event_address || '');
            }
            if (eventAddressLatEl && (formData.event_address_lat != null && formData.event_address_lat !== '')) {
                eventAddressLatEl.value = String(formData.event_address_lat);
            }
            if (eventAddressLonEl && (formData.event_address_lon != null && formData.event_address_lon !== '')) {
                eventAddressLonEl.value = String(formData.event_address_lon);
            }
            
            // Carregar configurações do botão do pastor
            const enablePastorBtnEl = document.getElementById('enable-pastor-button');
            const pastorWhatsappEl = document.getElementById('pastor-whatsapp-number');
            const pastorButtonNameEl = document.getElementById('pastor-button-name');
            const showLogoCornerEl = document.getElementById('show-logo-corner');
            if (enablePastorBtnEl) {
                enablePastorBtnEl.value = formData.enable_pastor_button ? 'true' : 'false';
            }
            if (pastorWhatsappEl) {
                pastorWhatsappEl.value = formData.pastor_whatsapp_number || '';
            }
            if (pastorButtonNameEl) {
                pastorButtonNameEl.value = formData.pastor_button_name || 'Enviar Mensagem para o Pastor';
            }
            if (showLogoCornerEl) {
                showLogoCornerEl.value = formData.show_logo_corner ? 'true' : 'false';
            }
            
            const buttonLogoEl = document.getElementById('button-logo-url');
            if (logoEl) logoEl.value = formData.form_logo_url || '';
            if (buttonLogoEl) buttonLogoEl.value = formData.button_logo_url || '';
            const buttonLogoSizeEl = document.getElementById('button-logo-size');
            if (buttonLogoSizeEl) {
                const size = formData.button_logo_size || 40;
                buttonLogoSizeEl.value = parseInt(size, 10) || 40;
            }
            if (bannerEl) bannerEl.value = formData.banner_image_url || '';
            if (headerEl) headerEl.value = formData.header_image_url || '';
            const backgroundColorEl = document.getElementById('background-color-url');
            if (backgroundEl) backgroundEl.value = formData.background_image_url || '';
            if (backgroundColorEl) backgroundColorEl.value = formData.background_color || '#FFFFFF';
            if (opacityEl) opacityEl.value = formData.background_opacity !== undefined ? formData.background_opacity : 1.0;
            if (themeEl) themeEl.value = formData.theme || 'light';
            if (primaryColorEl) primaryColorEl.value = formData.primary_color || '#4A90E2';
            if (textColorEl) textColorEl.value = formData.text_color || '#333333';
            if (secondaryColorEl) secondaryColorEl.value = formData.secondary_color || '#6BA3F0';
            
            // Carregar opções de envio (se existirem)
            if (formData.enable_whatsapp !== undefined) {
                let enableWhatsappInput = document.getElementById('enable-whatsapp-value');
                if (!enableWhatsappInput) {
                    enableWhatsappInput = document.createElement('input');
                    enableWhatsappInput.type = 'hidden';
                    enableWhatsappInput.id = 'enable-whatsapp-value';
                    document.body.appendChild(enableWhatsappInput);
                }
                enableWhatsappInput.value = formData.enable_whatsapp !== false ? 'true' : 'false';
                window.enableWhatsappValue = formData.enable_whatsapp !== false;
            }
            
            if (formData.enable_guest_list_submit !== undefined) {
                let enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                if (!enableGuestListSubmitInput) {
                    enableGuestListSubmitInput = document.createElement('input');
                    enableGuestListSubmitInput.type = 'hidden';
                    enableGuestListSubmitInput.id = 'enable-guest-list-submit-value';
                    document.body.appendChild(enableGuestListSubmitInput);
                }
                // IMPORTANTE: Respeitar valores false do banco!
                const enableGuestListSubmitValue = formData.enable_guest_list_submit === true || formData.enable_guest_list_submit === 'true' || formData.enable_guest_list_submit === 1 || formData.enable_guest_list_submit === '1';
                enableGuestListSubmitInput.value = enableGuestListSubmitValue ? 'true' : 'false';
                window.enableGuestListSubmitValue = enableGuestListSubmitValue;
                console.log('Y"< [LOAD] enable_guest_list_submit carregado:', {
                    valor_banco: formData.enable_guest_list_submit,
                    tipo: typeof formData.enable_guest_list_submit,
                    valor_processado: enableGuestListSubmitValue
                });
            }

            // Carregar send_mode (lead = Captação, checkin = Check-in)
            {
                let sendModeInput = document.getElementById('send-mode-value');
                if (!sendModeInput) {
                    sendModeInput = document.createElement('input');
                    sendModeInput.type = 'hidden';
                    sendModeInput.id = 'send-mode-value';
                    document.body.appendChild(sendModeInput);
                }
                let mode = (formData.send_mode || '').toString().toLowerCase();
                if (mode === 'system-only') mode = 'checkin';
                if (mode === 'both' || mode === 'whatsapp-only') mode = 'lead';
                if (mode !== 'lead' && mode !== 'checkin') {
                    mode = (formData.enable_guest_list_submit === true || formData.enable_guest_list_submit === 'true') ? 'checkin' : 'lead';
                }
                sendModeInput.value = mode;
                window.sendModeValue = mode;
                const isCheckin = mode === 'checkin';
                window.enableGuestListSubmitValue = isCheckin;
                window.currentFormIsGuestList = isCheckin;
                let glInput = document.getElementById('enable-guest-list-submit-value');
                if (!glInput) {
                    glInput = document.createElement('input');
                    glInput.type = 'hidden';
                    glInput.id = 'enable-guest-list-submit-value';
                    document.body.appendChild(glInput);
                }
                glInput.value = isCheckin ? 'true' : 'false';
                let modeInput = document.getElementById('is-guest-list-mode');
                if (!modeInput) {
                    modeInput = document.createElement('input');
                    modeInput.type = 'hidden';
                    modeInput.id = 'is-guest-list-mode';
                    document.body.appendChild(modeInput);
                }
                modeInput.value = isCheckin ? 'true' : 'false';
                const sidebarSpan = document.querySelector('#sidebar-responses span');
                if (sidebarSpan) {
                    sidebarSpan.textContent = isCheckin ? 'Confirmação de Check-in' : 'Captação de Clientes';
                }
            }
            
            // Atualizar botão do preview após carregar dados
            setTimeout(() => {
                if (typeof updatePreviewButton === 'function') {
                    updatePreviewButton();
                }
            }, 300);
            
            // Mostrar/esconder botões de remover e previews de imagens
            updateImagePreviews(formData);
            
            // Preencher preview (título e descrição editáveis)
            const previewTitle = document.getElementById('preview-title');
            const previewDescription = document.getElementById('preview-description');
            const previewDescriptionContainer = document.getElementById('preview-description-container');
            if (previewTitle) {
                previewTitle.textContent = formData.form_title || 'Formulário sem título';
            }
            if (previewDescription && previewDescriptionContainer) {
                const descText = formData.form_description || '';
                if (descText) {
                    previewDescription.textContent = descText;
                    previewDescriptionContainer.style.display = 'block';
                    // Mostrar botão de remover se houver descrição
                    const removeDescBtn = document.getElementById('remove-description-btn');
                    if (removeDescBtn) removeDescBtn.style.display = 'block';
                } else {
                    previewDescription.textContent = 'Descrição do formulário';
                    previewDescriptionContainer.style.display = 'none';
                    const removeDescBtn = document.getElementById('remove-description-btn');
                    if (removeDescBtn) removeDescBtn.style.display = 'none';
                }
            }
            
            // Preencher imagem de cabeçalho
            const headerImageUrl = formData.header_image_url || '';
            const headerImageContainer = document.getElementById('preview-header-image-container');
            const headerImage = document.getElementById('preview-header-image');
            if (headerImageUrl && headerImageContainer && headerImage) {
                headerImage.src = headerImageUrl;
                headerImageContainer.style.display = 'block';
            }
            
            // Aplicar cores personalizadas (garantir que background_image_url seja aplicado)
            // Obter cor das barrinhas decorativas (já carregada acima na função loadFormData)
            const decorativeBarColor = decorativeBarColorEl?.value || formData.decorative_bar_color || formData.primary_color || '#4A90E2';
            
            applyCustomColors({
                theme: formData.theme || 'light',
                primary_color: formData.primary_color || '#4A90E2',
                secondary_color: formData.secondary_color || null,
                text_color: formData.text_color || '#333333',
                background_image_url: formData.background_image_url || '',
                background_color: formData.background_color || '#FFFFFF',
                background_opacity: formData.background_opacity !== undefined ? formData.background_opacity : 1.0,
                card_color: formData.card_color || '#FFFFFF',
                decorative_bar_color: decorativeBarColor
            });
            
            // Carregar campos do formulário (garantir que seja array)
            let loadedFormFields = formData.form_fields || [];
            
            // Parsear se for string (PostgreSQL pode retornar JSONB como string)
            if (typeof loadedFormFields === 'string') {
                try {
                    loadedFormFields = JSON.parse(loadedFormFields);
                } catch (e) {
                    console.error('O Erro ao parsear form_fields na carga:', e);
                    loadedFormFields = [];
                }
            }
            
            // Garantir que seja um array
            if (!Array.isArray(loadedFormFields)) {
                console.warn('s️ form_fields não é um array após parse:', typeof loadedFormFields);
                loadedFormFields = [];
            }
            
            formFields = loadedFormFields;
            ensureAllFormFieldIds();
            console.log('Y"< [LOAD] Form fields carregados:', {
                count: formFields.length,
                fields: formFields
            });
            
            const formFieldsJsonEl = document.getElementById('form-fields-json');
            if (formFieldsJsonEl) {
                formFieldsJsonEl.value = JSON.stringify(formFields);
                console.log('o. form-fields-json atualizado no load:', formFields.length, 'campos');
            }
            
            // Garantir que o container de preview esteja visível
            const previewContainer = document.querySelector('.form-preview-container');
            if (previewContainer) {
                previewContainer.style.display = 'block';
                previewContainer.style.visibility = 'visible';
                previewContainer.style.opacity = '1';
                console.log('o. Container de preview garantido como visível');
            }
            
            // Renderizar preview das perguntas
            renderPreviewQuestions();
            
            // IMPORTANTE: Reaplicar cores após renderizar as perguntas para atualizar as barras decorativas
            // Isso garante que as barras decorativas sejam encontradas e atualizadas com a cor correta
            // IMPORTANTE: Usar APENAS cores de digital_form_items (item.digital_form_data), NÃO de guest_list_items
            const formDataForColorsFinal = item.digital_form_data || {}; // Cores APENAS de digital_form_items
            const decorativeBarColorAfterLoad = formDataForColorsFinal.decorative_bar_color || formDataForColorsFinal.primary_color || '#4A90E2';
            applyCustomColors({
                theme: formDataForColorsFinal.theme || formData.theme || 'light',
                primary_color: formDataForColorsFinal.primary_color || formData.primary_color || '#4A90E2',
                secondary_color: formDataForColorsFinal.secondary_color !== undefined ? formDataForColorsFinal.secondary_color : (formData.secondary_color || null),
                text_color: formDataForColorsFinal.text_color || formData.text_color || '#333333',
                background_image_url: formDataForColorsFinal.background_image_url || formData.background_image_url || '',
                background_color: formDataForColorsFinal.background_color || formData.background_color || '#FFFFFF',
                background_opacity: formDataForColorsFinal.background_opacity !== undefined ? formDataForColorsFinal.background_opacity : (formData.background_opacity !== undefined ? formData.background_opacity : 1.0),
                card_color: formDataForColorsFinal.card_color || formData.card_color || '#FFFFFF',
                decorative_bar_color: decorativeBarColorAfterLoad
            });
            
            // Configurar listeners para edição do título e descrição
            const previewTitleEl = document.getElementById('preview-title');
            const previewDescriptionEl = document.getElementById('preview-description');
            
            // Reutilizar formTitleEl e formDescEl já declarados anteriormente
            if (previewTitleEl && formTitleEl) {
                // Remover listeners antigos se existirem (clonar elemento)
                const newPreviewTitle = previewTitleEl.cloneNode(true);
                previewTitleEl.parentNode.replaceChild(newPreviewTitle, previewTitleEl);
                
                newPreviewTitle.addEventListener('blur', function() {
                    if (formTitleEl) formTitleEl.value = this.textContent.trim() || 'Formulário sem título';
                });
            }
            
            if (previewDescriptionEl && formDescEl) {
                // Remover listeners antigos se existirem (clonar elemento)
                const newPreviewDesc = previewDescriptionEl.cloneNode(true);
                previewDescriptionEl.parentNode.replaceChild(newPreviewDesc, previewDescriptionEl);
                
                newPreviewDesc.addEventListener('blur', function() {
                    if (formDescEl) formDescEl.value = this.textContent.trim() || '';
                });
            }
            
        } catch (error) {
            console.error('O Erro ao carregar dados:', error);
            console.error('O Stack trace:', error.stack);
            console.error('O URL da API:', `${API_URL}/api/profile`);
            console.error();
            
            // Mensagem mais amigável
            let errorMessage = 'Erro ao carregar dados do formulário.\n\n';
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage += 'Verifique sua conexão ou se o servidor está online.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        } finally {
            // Sempre liberar o flag, mesmo em caso de erro
            isLoadingFormData = false;
        }
    }
    
    // Renderizar perguntas na preview (estilo Google Forms)
    function renderPreviewQuestions(applySearch = false) {
        // Tentar múltiplos seletores para encontrar o container
        let container = document.getElementById('preview-questions-container') ||
                       document.querySelector('.preview-questions-container');
        
        if (!container) {
            // Tentar encontrar ou criar container
            const previewContainer = document.querySelector('.form-preview-container') ||
                                   document.querySelector('.form-edit-preview') ||
                                   document.querySelector('#kingforms-editor-container .form-edit-preview');
            
            if (previewContainer) {
                // Criar container se não existir
                container = document.createElement('div');
                container.id = 'preview-questions-container';
                container.className = 'preview-questions-container';
                previewContainer.appendChild(container);
                console.log('o. Container preview-questions-container criado dinamicamente');
            } else {
                console.warn('s️ Container preview-questions-container não encontrado - pode não estar na página correta');
                return;
            }
        }
        
        // Garantir que o container esteja visível
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        
        // Remover placeholder se existir
        const placeholder = document.getElementById('add-question-placeholder');
        if (placeholder) placeholder.remove();
        
        // Aplicar filtro de busca se necessário
        let fieldsToRender = formFields || [];
        if (applySearch && searchTerm) {
            const term = searchTerm.toLowerCase();
            fieldsToRender = formFields.filter(field => {
                const label = (field.label || '').toLowerCase();
                const type = (field.type || '').toLowerCase();
                const placeholder = (field.placeholder || '').toLowerCase();
                return label.includes(term) || type.includes(term) || placeholder.includes(term);
            });
        }
        
        console.log('Y"" Renderizando preview de perguntas...', fieldsToRender.length, 'campos' + (searchTerm ? ` (filtrado de ${formFields?.length || 0})` : ''));
        
        if (!formFields || formFields.length === 0) {
            container.innerHTML = `
                <div class="add-question-placeholder" id="add-question-placeholder">
                    <i class="fas fa-plus-circle"></i>
                    <div>Adicione a primeira pergunta</div>
                </div>
            `;
            
            // Adicionar evento ao placeholder
            const newPlaceholder = document.getElementById('add-question-placeholder');
            if (newPlaceholder) {
                newPlaceholder.addEventListener('click', () => addQuestion());
            }
            console.log('o. Placeholder de adicionar pergunta exibido');
            return;
        }
        
        // Garantir que o container está visível
        container.style.display = 'block';
        
        try {
            let htmlContent = '';
            
            // Se há busca ativa, mostrar indicador
            if (searchTerm && fieldsToRender.length > 0) {
                htmlContent += `
                    <div style="padding: 12px 16px; background: rgba(255,199,0,0.1); border-left: 4px solid #FFC700; margin-bottom: 16px; border-radius: 4px; color: #ECECEC; font-size: 14px;">
                        <i class="fas fa-filter"></i> Mostrando ${fieldsToRender.length} de ${formFields.length} perguntas
                    </div>
                `;
            }
            
            if (fieldsToRender.length === 0 && searchTerm) {
                htmlContent = `
                    <div style="text-align: center; padding: 60px 20px; color: #A1A1A1;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                        <div style="font-size: 16px; margin-bottom: 8px;">Nenhuma pergunta encontrada</div>
                        <div style="font-size: 14px; opacity: 0.7;">Tente buscar por outros termos</div>
                    </div>
                `;
            } else {
                htmlContent += fieldsToRender.map((field, idx) => {
                    // Encontrar o índice original no array completo
                    const actualIndex = formFields.findIndex(f => 
                        JSON.stringify(f) === JSON.stringify(field)
                    );
                    const displayIndex = actualIndex >= 0 ? actualIndex : idx;
                    return renderQuestionPreview(field, displayIndex, searchTerm);
                }).join('');
            }
            
            container.innerHTML = htmlContent;
            
            console.log('o. Preview renderizado com sucesso:', formFields.length, 'perguntas');
        } catch (error) {
            console.error('O Erro ao renderizar preview:', error);
            container.innerHTML = `<div style="padding: 20px; color: #d32f2f;">Erro ao renderizar perguntas: ${error.message}</div>`;
        }
        
        // Adicionar event listeners para edição inline
        container.querySelectorAll('.question-label-edit').forEach(el => {
            // Remover listeners anteriores para evitar duplicatas
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
            
            newEl.addEventListener('blur', function() {
                const index = parseInt(this.dataset.index);
                if (!isNaN(index) && formFields[index]) {
                    const field = formFields[index];
                    const fieldName = this.dataset.field || 'label';
                    
                    if (fieldName === 'description') {
                        field.description = this.textContent.trim() || '';
                    } else {
                        field.label = this.textContent.trim() || 'Pergunta sem título';
                    }
                    
                    const formFieldsJsonEl = document.getElementById('form-fields-json');
                    if (formFieldsJsonEl) {
                        formFieldsJsonEl.value = JSON.stringify(formFields);
                    }
                    console.log('o. [PREVIEW] Campo editado inline:', fieldName, 'índice:', index);
                }
            });
            
            // Prevenir que o click na label interfira nos botões
            newEl.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });
        
        // Adicionar event listeners para botões de ação
        container.querySelectorAll('.question-edit-btn').forEach(btn => {
            // Remover listeners anteriores para evitar duplicatas
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            const action = newBtn.dataset.action;
            const index = parseInt(newBtn.dataset.index);
            
            if (isNaN(index)) {
                console.error('O [PREVIEW] Índice inválido para botão:', newBtn, 'action:', action);
                return;
            }
            
            if (action === 'edit') {
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('o. [PREVIEW] Botão Editar clicado para índice:', index);
                    editQuestionModal(index);
                });
            } else if (action === 'delete') {
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('o. [PREVIEW] Botão Excluir clicado para índice:', index);
                    const confirmDelete = confirm('Tem certeza que deseja excluir esta pergunta?\n\nEsta ação não pode ser desfeita.');
                    if (confirmDelete) {
                        deleteQuestion(index);
                    }
                });
            } else if (action === 'duplicate') {
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('o. [PREVIEW] Botão Duplicar clicado para índice:', index);
                    duplicateQuestion(index);
                });
            } else if (action === 'move-up') {
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    moveQuestion(index, -1);
                });
            } else if (action === 'move-down') {
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    moveQuestion(index, 1);
                });
            }
            
            // Garantir que o botão esteja visível e clicável
            newBtn.style.display = 'flex';
            newBtn.style.pointerEvents = 'auto';
            newBtn.style.zIndex = '1001';
        });
        
        console.log('o. Event listeners adicionados aos botões de ação');
        
        // Ativar arrastar para reordenar perguntas
        initQuestionsSortable(container);
        
        // Adicionar lógica de campos condicionais no preview
        setTimeout(() => {
            // Função para gerenciar campos condicionais no preview
            function handlePreviewConditionalFields(triggerInput) {
                const fieldIndex = parseInt(triggerInput.dataset.fieldIndex);
                if (isNaN(fieldIndex)) return;
                
                const triggerGroup = triggerInput.closest('.preview-form-group');
                const fieldId = triggerGroup ? (triggerGroup.dataset.fieldId || `field_${fieldIndex}`) : `field_${fieldIndex}`;
                const triggerValue = triggerInput.value;
                
                // Encontrar todos os campos que dependem deste (usar tanto ID quanto índice)
                const selectors = [
                    `.conditional-field[data-depends-on="${fieldId}"]`,
                    `.conditional-field[data-depends-on="field_${fieldIndex}"]`,
                    `.conditional-field[data-depends-on-index="${fieldIndex}"]`
                ];
                
                const allConditionalFields = new Set();
                selectors.forEach(selector => {
                    container.querySelectorAll(selector).forEach(el => allConditionalFields.add(el));
                });
                
                allConditionalFields.forEach(conditionalField => {
                    const requiredValue = conditionalField.dataset.dependsOnValue || 'Sim';
                    
                    // Normalizar valores para comparação
                    const normalizedRequired = requiredValue.toLowerCase().trim();
                    const normalizedTrigger = triggerValue.toLowerCase().trim();
                    
                    const shouldShow = normalizedTrigger === normalizedRequired || 
                                      (normalizedRequired === 'sim' && (normalizedTrigger === 'sim' || normalizedTrigger === 'yes' || normalizedTrigger === 's' || normalizedTrigger === 'Sim')) ||
                                      (normalizedRequired === 'não' && (normalizedTrigger === 'não' || normalizedTrigger === 'nao' || normalizedTrigger === 'no' || normalizedTrigger === 'n' || normalizedTrigger === 'Não'));
                    
                    if (shouldShow) {
                        conditionalField.style.display = 'block';
                        conditionalField.style.animation = 'fadeInUp 0.3s ease-out';
                    } else {
                        conditionalField.style.display = 'none';
                    }
                });
            }
            
            // Adicionar listeners para campos condicionais (mesmo que disabled, vamos simular)
            container.querySelectorAll('.preview-conditional-trigger').forEach(input => {
                // Criar um overlay clicável para simular interação no preview
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; cursor: pointer; z-index: 10;';
                overlay.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Simular mudança de valor para testar campos condicionais
                    const currentValue = input.value;
                    const allRadios = document.querySelectorAll(`input[name="${input.name}"]`);
                    allRadios.forEach(radio => {
                        if (radio === input) {
                            radio.checked = true;
                            handlePreviewConditionalFields(radio);
                            handlePreviewHideOnAnswer(radio);
                        } else {
                            radio.checked = false;
                        }
                    });
                });
                if (input.parentElement) {
                    input.parentElement.style.position = 'relative';
                    input.parentElement.appendChild(overlay);
                }
            });
            

            function handlePreviewHideOnAnswer(triggerInput) {
                const triggerGroup = triggerInput.closest('.preview-form-group');
                if (!triggerGroup) return;
                const hideSim = String(triggerGroup.dataset.hideOnSim || '').split(',').map(x => x.trim()).filter(Boolean);
                const hideNao = String(triggerGroup.dataset.hideOnNao || '').split(',').map(x => x.trim()).filter(Boolean);
                if (!hideSim.length && !hideNao.length) return;
                const allIds = new Set([...hideSim, ...hideNao]);
                const val = String(triggerInput.value || '').toLowerCase().trim();
                const isNao = val === 'não' || val === 'nao' || val === 'no' || val === 'n';
                const isSim = val === 'sim' || val === 'yes' || val === 's';
                const toHide = new Set(isNao ? hideNao : (isSim ? hideSim : []));
                allIds.forEach(id => {
                    const el = container.querySelector('.preview-form-group[data-field-id="' + id + '"]');
                    if (!el || el === triggerGroup) return;
                    if (toHide.has(id)) {
                        el.style.display = 'none';
                        el.dataset.hiddenByHideOnAnswer = '1';
                    } else if (el.dataset.hiddenByHideOnAnswer === '1') {
                        delete el.dataset.hiddenByHideOnAnswer;
                        if (!el.classList.contains('conditional-field')) {
                            el.style.display = 'block';
                        }
                    }
                });
            }

            // Adicionar listeners para yes_no_with_text no preview
            container.querySelectorAll('.preview-yes-no-trigger').forEach(input => {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; cursor: pointer; z-index: 10;';
                overlay.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const allRadios = document.querySelectorAll(`input[name="${input.name}"]`);
                    allRadios.forEach(radio => {
                        if (radio === input) {
                            radio.checked = true;
                            // Atualizar campo de texto
                            const group = input.closest('.yes-no-with-text-group');
                            if (group) {
                                const textField = group.querySelector('.yes-no-text-field');
                                const triggerValue = group.dataset.followUpTrigger || 'Sim';
                                if (textField) {
                                    if (input.value === triggerValue) {
                                        textField.style.display = 'block';
                                        textField.style.animation = 'fadeInUp 0.3s ease-out';
                                    } else {
                                        textField.style.display = 'none';
                                    }
                                }
                            }
                            handlePreviewHideOnAnswer(radio);
                        } else {
                            radio.checked = false;
                        }
                    });
                });
                if (input.parentElement) {
                    input.parentElement.style.position = 'relative';
                    input.parentElement.appendChild(overlay);
                }
            });
        }, 300);
        
        // Adicionar placeholder após todas as perguntas
        const addPlaceholder = document.createElement('div');
        addPlaceholder.className = 'add-question-placeholder';
        addPlaceholder.id = 'add-question-placeholder';
        addPlaceholder.innerHTML = `
            <i class="fas fa-plus-circle"></i>
            <div>Adicionar pergunta</div>
        `;
        addPlaceholder.addEventListener('click', () => addQuestion());
        container.appendChild(addPlaceholder);
    }
    
    // Renderizar preview de uma pergunta individual
    function renderQuestionPreview(field, index, highlightTerm = '') {
        const fieldTypes = {
            'short_text': 'Resposta Curta',
            'paragraph': 'Parágrafo',
            'multiple_choice': 'Escolha Múltipla',
            'checkbox': 'Caixa de Verificação',
            'dropdown': 'Lista Suspensa',
            'file_upload': 'Carregar Ficheiro',
            'linear_scale': 'Escala Linear',
            'rating': 'Classificação',
            'multiple_choice_grid': 'Grelha de Escolhas Múltiplas',
            'checkbox_grid': 'Grelha de Caixa de Verificação',
            'date': 'Data',
            'time': 'Hora',
            'datetime': 'Data e Hora',
            'yes_no': 'Sim/Não',
            'yes_no_with_text': 'Sim/Não com Resposta'
        };
        
        let inputHTML = '';
        
        switch (field.type) {
            case 'short_text':
            case 'email':
            case 'phone':
            case 'url':
            case 'number':
                const maxLength = field.max_length || (field.type === 'short_text' ? 255 : 255);
                const inputType = field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text';
                inputHTML = `<input type="${inputType}" id="preview-field-${index}" class="question-input-preview" placeholder="Sua resposta" maxlength="${maxLength}" disabled>`;
                if (field.show_character_count) {
                    inputHTML += `<div class="character-counter-preview" style="font-size: 12px; color: #5f6368; margin-top: 8px; text-align: right;">0 / ${maxLength} caracteres</div>`;
                }
                break;
            case 'paragraph':
                const paraMaxLength = field.max_length || 5000;
                inputHTML = `<textarea id="preview-field-${index}" class="question-input-preview" rows="4" placeholder="Sua resposta" maxlength="${paraMaxLength}" disabled style="resize: vertical; min-height: 100px;"></textarea>`;
                if (field.show_character_count) {
                    inputHTML += `<div class="character-counter-preview" style="font-size: 12px; color: #5f6368; margin-top: 8px; text-align: right;">0 / ${paraMaxLength} caracteres</div>`;
                }
                break;
            case 'multiple_choice':
            case 'yes_no':
            case 'single_choice':
                const options = field.options || (field.type === 'yes_no' ? ['Sim', 'Não'] : []);
                const radioName = `preview-${index}`;
                inputHTML = `<div class="radio-group" style="display: flex; flex-direction: column; gap: 12px;">` + options.map((opt, i) => `
                    <label class="radio-label preview-option-label" style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 2px solid #e8eaed; border-left: 4px solid var(--preview-option-bar-color, var(--preview-primary-color, #4A90E2)); border-radius: 12px; cursor: default; transition: all 0.2s; background: white;" onmouseover="this.style.borderColor='var(--preview-primary-color, #4A90E2)'; this.style.background='rgba(74,144,226,0.05)';" onmouseout="this.style.borderColor='#e8eaed'; this.style.background='white';">
                        <input type="radio" name="${radioName}" value="${opt}" data-field-index="${index}" class="preview-conditional-trigger" disabled style="width: 20px; height: 20px; cursor: default; accent-color: var(--preview-primary-color, #4A90E2);">
                        <span style="color: var(--preview-text-color, #202124); font-size: 15px; font-weight: 500; flex: 1;">${opt}</span>
                    </label>
                `).join('') + `</div>`;
                break;
            case 'yes_no_with_text':
                const yesNoTextName = `preview-${index}`;
                const textFieldId = `preview-text-${index}`;
                const placeholder = field.placeholder || field.Placeholder || 'Sua resposta';
                const followUpLabel = field.followUpLabel || field.follow_up_label || '';
                const followUpTrigger = (field.followUpTrigger || field.follow_up_trigger || 'Sim') === 'Não' ? 'Não' : 'Sim';
                inputHTML = `
                    <div class="yes-no-with-text-group" data-field-index="${index}" data-follow-up-trigger="${followUpTrigger}">
                        <div class="radio-group" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
                            <label class="radio-label preview-option-label" style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 2px solid #e8eaed; border-left: 4px solid var(--preview-option-bar-color, var(--preview-primary-color, #4A90E2)); border-radius: 12px; cursor: default; transition: all 0.2s; background: white;" onmouseover="this.style.borderColor='var(--preview-primary-color, #4A90E2)'; this.style.background='rgba(74,144,226,0.05)';" onmouseout="this.style.borderColor='#e8eaed'; this.style.background='white';">
                                <input type="radio" name="${yesNoTextName}" value="Sim" data-field-index="${index}" class="preview-yes-no-trigger" disabled style="width: 20px; height: 20px; cursor: default; accent-color: var(--preview-primary-color, #4A90E2);">
                                <span style="color: var(--preview-text-color, #202124); font-size: 15px; font-weight: 500; flex: 1;">Sim</span>
                            </label>
                            <label class="radio-label preview-option-label" style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 2px solid #e8eaed; border-left: 4px solid var(--preview-option-bar-color, var(--preview-primary-color, #4A90E2)); border-radius: 12px; cursor: default; transition: all 0.2s; background: white;" onmouseover="this.style.borderColor='var(--preview-primary-color, #4A90E2)'; this.style.background='rgba(74,144,226,0.05)';" onmouseout="this.style.borderColor='#e8eaed'; this.style.background='white';">
                                <input type="radio" name="${yesNoTextName}" value="Não" data-field-index="${index}" class="preview-yes-no-trigger" disabled style="width: 20px; height: 20px; cursor: default; accent-color: var(--preview-primary-color, #4A90E2);">
                                <span style="color: var(--preview-text-color, #202124); font-size: 15px; font-weight: 500; flex: 1;">Não</span>
                            </label>
                        </div>
                        <div id="${textFieldId}" class="yes-no-text-field" style="display: none; margin-top: 12px;">
                            ${followUpLabel ? `<label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--preview-text-color, #202124); font-size: 14px;">${followUpLabel}</label>` : ''}
                            <input type="text" placeholder="${placeholder}" disabled style="width: 100%; padding: 16px 20px; border: 2px solid #e8eaed; border-radius: 14px; font-size: 15px; background: #f8f9fa; color: var(--preview-text-color, #202124); box-sizing: border-box; cursor: default;">
                        </div>
                    </div>
                `;
                break;
            case 'checkbox':
                const checkOptions = field.options || [];
                inputHTML = `<div class="checkbox-group" style="display: flex; flex-direction: column; gap: 12px;">` + checkOptions.map((opt, i) => `
                    <label class="checkbox-label preview-option-label" style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 2px solid #e8eaed; border-left: 4px solid var(--preview-option-bar-color, var(--preview-primary-color, #4A90E2)); border-radius: 12px; cursor: default; transition: all 0.2s; background: white;" onmouseover="this.style.borderColor='var(--preview-primary-color, #4A90E2)'; this.style.background='rgba(74,144,226,0.05)';" onmouseout="this.style.borderColor='#e8eaed'; this.style.background='white';">
                        <input type="checkbox" name="preview-${index}" value="${opt}" disabled style="width: 20px; height: 20px; cursor: default; accent-color: var(--preview-primary-color, #4A90E2);">
                        <span style="color: var(--preview-text-color, #202124); font-size: 15px; font-weight: 500; flex: 1;">${opt}</span>
                    </label>
                `).join('') + `</div>`;
                break;
            case 'dropdown':
                const dropOptions = field.options || [];
                inputHTML = `<select id="preview-field-${index}" class="question-input-preview" disabled style="cursor: default; appearance: none; background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%235f6368\\'><path d=\\'M7 10l5 5 5-5z\\'/></svg>'); background-repeat: no-repeat; background-position: right 16px center; background-size: 20px; padding-right: 48px;">
                    <option value="">Selecione...</option>
                    ${dropOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>`;
                break;
            case 'date':
                inputHTML = `<input type="date" id="preview-field-${index}" class="question-input-preview" disabled style="cursor: default;">`;
                break;
            case 'time':
                inputHTML = `<input type="time" id="preview-field-${index}" class="question-input-preview" disabled style="cursor: default;">`;
                break;
            case 'datetime':
                inputHTML = `<input type="datetime-local" id="preview-field-${index}" class="question-input-preview" disabled style="cursor: default;">`;
                break;
            case 'file_upload':
                inputHTML = `<div style="padding: 40px; border: 2px dashed #dadce0; border-radius: 8px; text-align: center; color: #5f6368;">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 32px; margin-bottom: 10px;"></i>
                    <div>Clique para fazer upload</div>
                </div>`;
                break;
            case 'image':
                inputHTML = `<div style="margin-top: 16px;">
                    <img src="${field.image_url || ''}" alt="${field.label || 'Imagem'}" style="max-width: 100%; border-radius: 8px; border: 1px solid #dadce0;">
                </div>`;
                break;
            case 'section':
                inputHTML = `<div style="margin-top: 16px; padding: 16px 0; border-top: 2px solid #dadce0;">
                    <div style="font-size: 14px; color: #5f6368; margin-top: 8px;">${field.description || ''}</div>
                </div>`;
                break;
            default:
                inputHTML = `<input type="text" class="question-input-preview" placeholder="Sua resposta" disabled>`;
        }
        
        // Para seção, renderizar de forma diferente
        if (field.type === 'section') {
            return `
                <div class="form-question-item-preview" data-question-index="${index}" style="background: #f8f9fa; border: none; padding: 24px 0; position: relative;">
                    <div class="question-drag-handle" title="Arrastar para mover" style="position: absolute; left: 8px; top: 20px; color: #9aa0a6; cursor: grab; z-index: 10; padding: 6px; border-radius: 6px;" onmouseover="this.style.color='#5f6368'; this.style.background='#e8eaed';" onmouseout="this.style.color='#9aa0a6'; this.style.background='transparent';">
                        <i class="fas fa-grip-vertical" style="font-size: 16px;"></i>
                    </div>
                    <div class="question-edit-bar" style="display: flex; position: absolute; top: 16px; right: 16px; background: linear-gradient(135deg, white, #fafafa); border: 1px solid #dadce0; border-radius: 12px; padding: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1); z-index: 1000; white-space: nowrap; gap: 4px; pointer-events: auto;">
                        <button class="question-edit-btn" data-action="move-up" data-index="${index}" title="Mover para cima" ${index === 0 ? 'disabled' : ''} style="padding: 10px; background: transparent; border: none; cursor: ${index === 0 ? 'not-allowed' : 'pointer'}; color: ${index === 0 ? '#dadce0' : '#5f6368'}; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto;" onmouseover="if(!this.disabled){this.style.background='rgba(74,144,226,0.1)'; this.style.color='#4A90E2';}" onmouseout="if(!this.disabled){this.style.background='transparent'; this.style.color='#5f6368';}">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="question-edit-btn" data-action="move-down" data-index="${index}" title="Mover para baixo" style="padding: 10px; background: transparent; border: none; cursor: pointer; color: #5f6368; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto;" onmouseover="this.style.background='rgba(74,144,226,0.1)'; this.style.color='#4A90E2';" onmouseout="this.style.background='transparent'; this.style.color='#5f6368';">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="question-edit-btn" data-action="edit" data-index="${index}" title="Editar" style="padding: 10px; background: transparent; border: none; cursor: pointer; color: #5f6368; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto;" onmouseover="this.style.background='rgba(74,144,226,0.1)'; this.style.color='#4A90E2';" onmouseout="this.style.background='transparent'; this.style.color='#5f6368';">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="question-edit-btn" data-action="duplicate" data-index="${index}" title="Duplicar" style="padding: 10px; background: transparent; border: none; cursor: pointer; color: #5f6368; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto;" onmouseover="this.style.background='rgba(255,199,0,0.1)'; this.style.color='#FFC700';" onmouseout="this.style.background='transparent'; this.style.color='#5f6368';">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="question-edit-btn" data-action="delete" data-index="${index}" title="Excluir" data-confirm="true" style="padding: 10px; background: transparent; border: none; cursor: pointer; color: #5f6368; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto;" onmouseover="this.style.background='rgba(244,63,94,0.1)'; this.style.color='#F43F5E';" onmouseout="this.style.background='transparent'; this.style.color='#5f6368';">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="question-label-edit" contenteditable="true" data-index="${index}" style="font-size: 24px; font-weight: 400; color: #202124;">${field.label || 'Nova Seção'}</div>
                    <div style="font-size: 14px; color: #5f6368; margin-top: 8px;">
                        <div class="question-label-edit" contenteditable="true" data-index="${index}" data-field="description" style="font-size: 14px; font-weight: 400; padding: 8px; border: 2px dashed transparent; border-radius: 4px; min-height: 20px;">${field.description || 'Descrição da seção (opcional)'}</div>
                    </div>
                </div>
            `;
        }
        
        // Suporte para campos condicionais
        const dependsOn = field.dependsOn || field.depends_on;
        const dependsOnValue = dependsOn ? (dependsOn.value || 'Sim') : null;
        const dependsOnFieldId = dependsOn ? (dependsOn.fieldId || dependsOn) : null;
        const isConditional = dependsOn !== undefined && dependsOn !== null;
        const conditionalStyle = isConditional ? 'display: none;' : '';
        const conditionalClass = isConditional ? 'conditional-field' : '';
        
        // Encontrar o índice do campo pai para o preview
        let parentFieldIndex = -1;
        if (isConditional && dependsOnFieldId) {
            parentFieldIndex = formFields.findIndex((f, idx) => {
                const fId = (f.id || '').toString();
                const dependsId = dependsOnFieldId.toString();
                return fId === dependsId || 
                       fId === `field_${dependsId}` || 
                       `field_${fId}` === dependsId ||
                       (dependsId === idx.toString()) ||
                       (dependsId === `field_${idx}`);
            });
        }
        
        const conditionalAttrs = isConditional ? `data-depends-on="${dependsOnFieldId}" data-depends-on-index="${parentFieldIndex}" data-depends-on-value="${dependsOnValue}"` : '';
        ensureFieldId(field, index);
        const fieldIdAttr = `data-field-id="${field.id}"`;
        const hideRules = normalizeHideOnAnswer(field.hideOnAnswer || field.hide_on_answer);
        const hideAttrs = (field.type === 'yes_no' || field.type === 'yes_no_with_text')
            ? ` data-hide-on-sim="${hideRules.Sim.join(',')}" data-hide-on-nao="${hideRules.Não.join(',')}"`
            : '';
        const hideSummary = getHideOnAnswerSummary(field);
        const hideBadge = hideSummary
            ? `<div style="margin:6px 0 0 0;font-size:12px;font-weight:700;color:#b45309;background:rgba(255,199,0,0.18);display:inline-block;padding:4px 10px;border-radius:999px;">${hideSummary}</div>`
            : '';
        
        // Estrutura idêntica ao formulário público
        const isLastQuestion = index >= formFields.length - 1;
        return `
            <div class="form-group preview-form-group ${conditionalClass}" data-question-index="${index}" ${fieldIdAttr} ${conditionalAttrs}${hideAttrs} style="margin-bottom: 36px; position: relative; animation: fadeInUp 0.5s ease-out; padding-left: 28px; ${conditionalStyle}">
                <div class="question-drag-handle" title="Arrastar para mover" style="position: absolute; left: 2px; top: 14px; color: #5f6368; cursor: grab; z-index: 10; padding: 8px 6px; border-radius: 6px; background: #f1f3f4;">
                    <i class="fas fa-grip-vertical" style="font-size: 16px;"></i>
                </div>
                <div class="question-edit-bar" style="display: flex !important; position: absolute; top: 12px; right: 12px; background: linear-gradient(135deg, white, #fafafa); border: 1px solid #dadce0; border-radius: 12px; padding: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1); z-index: 1000; white-space: nowrap; gap: 4px; pointer-events: auto;">
                    <button type="button" class="question-edit-btn" data-action="move-up" data-index="${index}" title="Mover para cima" ${index === 0 ? 'disabled' : ''} style="padding: 10px; background: rgba(74,144,226,0.1); border: none; cursor: ${index === 0 ? 'not-allowed' : 'pointer'}; color: ${index === 0 ? '#dadce0' : '#4A90E2'}; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button type="button" class="question-edit-btn" data-action="move-down" data-index="${index}" title="Mover para baixo" ${isLastQuestion ? 'disabled' : ''} style="padding: 10px; background: rgba(74,144,226,0.1); border: none; cursor: ${isLastQuestion ? 'not-allowed' : 'pointer'}; color: ${isLastQuestion ? '#dadce0' : '#4A90E2'}; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <span style="width: 1px; background: #dadce0; margin: 4px 2px;"></span>
                    <button type="button" class="question-edit-btn" data-action="edit" data-index="${index}" title="Editar" style="padding: 10px; background: transparent; border: none; cursor: pointer; color: #5f6368; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="question-edit-btn" data-action="duplicate" data-index="${index}" title="Duplicar" style="padding: 10px; background: transparent; border: none; cursor: pointer; color: #5f6368; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button type="button" class="question-edit-btn" data-action="delete" data-index="${index}" title="Excluir" data-confirm="true" style="padding: 10px; background: transparent; border: none; cursor: pointer; color: #5f6368; font-size: 15px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <label for="preview-field-${index}" style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 14px; font-weight: 700; color: var(--preview-text-color, #202124); font-size: 15px; letter-spacing: -0.2px; line-height: 1.5; position: relative; padding-right: 200px;"> 
                    <span class="preview-decorative-bar" style="content: ''; width: 3px; height: 18px; background: linear-gradient(180deg, var(--preview-decorative-bar-color, var(--preview-primary-color, #4A90E2)), rgba(74, 144, 226, 0.6)); border-radius: 2px; display: inline-block; margin-right: 4px; margin-top: 2px; flex-shrink: 0;"></span>
                    <span class="question-label-edit" contenteditable="true" data-index="${index}" style="flex: 1; border: 2px dashed transparent; padding: 2px 4px; border-radius: 4px; min-height: 20px; outline: none; word-wrap: break-word; overflow-wrap: break-word;" onfocus="this.style.borderColor='var(--preview-primary-color, #4A90E2)'; this.style.background='rgba(74,144,226,0.05)';" onblur="this.style.borderColor='transparent'; this.style.background='transparent';">${highlightSearchTerm(field.label || 'Pergunta sem título', highlightTerm)}</span>
                    ${field.required ? '<span class="required" style="color: #ea4335; font-weight: 700; margin-left: 2px; flex-shrink: 0;">*</span>' : ''}
                </label>
                ${hideBadge}
                <div style="margin-top: 0;">
                    ${inputHTML.replace(/class="question-input-preview"/g, 'class="preview-form-input" style="width: 100%; padding: 16px 20px; border: 2px solid #e8eaed; border-radius: 14px; font-size: 15px; font-family: inherit; background: #f8f9fa; color: var(--preview-text-color, #202124); transition: all 0.2s; box-sizing: border-box;" onfocus="this.style.borderColor=\'var(--preview-primary-color, #4A90E2)\'; this.style.background=\'white\'; this.style.boxShadow=\'0 0 0 3px rgba(74,144,226,0.1)\';" onblur="this.style.borderColor=\'#e8eaed\'; this.style.background=\'#f8f9fa\'; this.style.boxShadow=\'none\';"')}
                </div>
            </div>
        `;
    }
    
    // Configurar listeners da sidebar
    function setupSidebarListeners() {
        console.log('Configurando listeners da sidebar...');
        
        // Adicionar pergunta
        const sidebarAddQuestion = document.getElementById('sidebar-add-question');
        if (sidebarAddQuestion) {
            const newBtn = sidebarAddQuestion.cloneNode(true);
            sidebarAddQuestion.parentNode.replaceChild(newBtn, sidebarAddQuestion);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão adicionar pergunta clicado');
                addQuestion();
            });
            console.log('o. Listener adicionado: sidebar-add-question');
        } else {
            console.error('O Botão sidebar-add-question não encontrado');
        }
        
        // Adicionar título e descrição
        const sidebarAddTitle = document.getElementById('sidebar-add-title');
        if (sidebarAddTitle) {
            const newBtn = sidebarAddTitle.cloneNode(true);
            sidebarAddTitle.parentNode.replaceChild(newBtn, sidebarAddTitle);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão adicionar título clicado');
                const previewTitleEl = document.getElementById('preview-title');
                if (previewTitleEl) {
                    previewTitleEl.focus();
                    const range = document.createRange();
                    range.selectNodeContents(previewTitleEl);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            });
            console.log('o. Listener adicionado: sidebar-add-title');
        } else if (isFormEditPage) {
            console.warn('s️ Botão sidebar-add-title não encontrado');
        }
        
        // Adicionar imagem de cabeçalho
        const sidebarAddHeaderImage = document.getElementById('sidebar-add-header-image');
        if (sidebarAddHeaderImage) {
            const newBtn = sidebarAddHeaderImage.cloneNode(true);
            sidebarAddHeaderImage.parentNode.replaceChild(newBtn, sidebarAddHeaderImage);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão adicionar imagem de cabeçalho clicado');
                addHeaderImage();
            });
            console.log('o. Listener adicionado: sidebar-add-header-image');
        } else if (isFormEditPage) {
            console.warn('s️ Botão sidebar-add-header-image não encontrado');
        }
        
        // Adicionar imagem
        const sidebarAddImage = document.getElementById('sidebar-add-image');
        if (sidebarAddImage) {
            const newBtn = sidebarAddImage.cloneNode(true);
            sidebarAddImage.parentNode.replaceChild(newBtn, sidebarAddImage);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão adicionar imagem clicado');
                addImage();
            });
            console.log('o. Listener adicionado: sidebar-add-image');
        } else if (isFormEditPage) {
            console.warn('s️ Botão sidebar-add-image não encontrado');
        }
        
        // Personalizar cores
        const sidebarCustomizeColors = document.getElementById('sidebar-customize-colors');
        if (sidebarCustomizeColors) {
            const newBtn = sidebarCustomizeColors.cloneNode(true);
            sidebarCustomizeColors.parentNode.replaceChild(newBtn, sidebarCustomizeColors);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão personalizar cores clicado');
                openColorCustomizer();
            });
            console.log('o. Listener adicionado: sidebar-customize-colors');
        } else if (isFormEditPage) {
            console.warn('s️ Botão sidebar-customize-colors não encontrado');
        }
        
        // Carregar módulo/template
        const sidebarLoadModule = document.getElementById('sidebar-load-module');
        if (sidebarLoadModule) {
            const newBtn = sidebarLoadModule.cloneNode(true);
            sidebarLoadModule.parentNode.replaceChild(newBtn, sidebarLoadModule);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão módulos/templates clicado');
                openModuleSelector();
            });
            console.log('o. Listener adicionado: sidebar-load-module');
        } else if (isFormEditPage) {
            console.warn('s️ Botão sidebar-load-module não encontrado');
        }
        
        // Abrir modal de configurações
        const sidebarSettings = document.getElementById('sidebar-settings');
        if (sidebarSettings) {
            const newBtn = sidebarSettings.cloneNode(true);
            sidebarSettings.parentNode.replaceChild(newBtn, sidebarSettings);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão configurações clicado');
                openSettingsModal();
            });
            console.log('o. Listener adicionado: sidebar-settings');
        } else if (isFormEditPage) {
            console.warn('s️ Botão sidebar-settings não encontrado');
        }
        
        // Listener para Lista de Convidados (pode ser sidebar-guest-list ou sidebar-responses)
        const guestListBtn = document.getElementById('sidebar-guest-list') || document.getElementById('sidebar-responses');
        console.log('Procurando botão de lista de convidados...', { 
            found: !!guestListBtn,
            id: guestListBtn?.id || 'não encontrado'
        });
        
        if (guestListBtn) {
            // Remover listeners anteriores se existirem (clone para limpar)
            const newBtn = guestListBtn.cloneNode(true);
            guestListBtn.parentNode.replaceChild(newBtn, guestListBtn);
            
            // Adicionar listener tanto via addEventListener quanto manter onclick como fallback
            newBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botão Lista de Convidados/Envios clicado (addEventListener)!');
                handleGuestListButtonClick();
            }, true); // useCapture = true para capturar primeiro
            
            // Garantir que o onclick também funcione como fallback
            if (!newBtn.getAttribute('onclick')) {
                newBtn.setAttribute('onclick', 'handleGuestListClick(event); return false;');
            }
            
            console.log('o. Listener adicionado:', guestListBtn.id, '- abre página completa');
        } else {
            // Botão não encontrado - não é crítico, apenas logar como warning (não error)
            console.warn('s️ Botão de lista de convidados não encontrado (sidebar-guest-list ou sidebar-responses). Funcionalidade pode não estar disponível.');
        }
        
        // Checkout removido (fora de escopo)
        const sidebarCheckout = document.getElementById('sidebar-checkout');
        if (sidebarCheckout) sidebarCheckout.remove();
        
        // Função auxiliar para lidar com clique
        function handleGuestListButtonClick() {
            try {
                // Verificar se está em modo lista de convidados
                const isGuestListMode = window.currentFormIsGuestList === true || 
                                       document.getElementById('is-guest-list-mode')?.value === 'true';
                
                const urlParams = new URLSearchParams(window.location.search);
                const currentItemId = urlParams.get('itemId');
                
                console.log('Y"< Verificando modo:', {
                    isGuestListMode,
                    currentItemId,
                    hasOpenModal: typeof openGuestListManagementModalForCurrentForm === 'function'
                });
                
                // Abrir modal de respostas/envios que agora também gerencia listas
                if (isGuestListMode && currentItemId) {
                    // Se estiver em modo lista, abrir o modal de respostas que mostrará a lista
                    console.log('o. Abrindo modal de confirmação de Check-in');
                    openResponsesModal();
                } else {
                    // Para formulários normais, também abrir modal de respostas
                    console.log('o. Abrindo modal de envios de formulário');
                    openResponsesModal();
                }
            } catch (error) {
                console.error('O Erro ao processar clique em Lista de Convidados:', error);
                // Fallback: sempre tentar redirecionar
                const urlParams = new URLSearchParams(window.location.search);
                const currentItemId = urlParams.get('itemId');
                if (currentItemId) {
                    window.location.href = `/guestListEdit?formItemId=${currentItemId}`;
                } else {
                    window.location.href = '/guestListEdit';
                }
            }
        }
        
        // Abrir página de respostas/envios (não mais modal)
        const sidebarResponses = document.getElementById('sidebar-responses');
        if (sidebarResponses) {
            const newBtn = sidebarResponses.cloneNode(true);
            sidebarResponses.parentNode.replaceChild(newBtn, sidebarResponses);
            
            // Atualizar texto do botão baseado no modo
            const updateButtonText = () => {
                const guestListInput = document.getElementById('is-guest-list-mode');
                let isGuestList = false;
                if (guestListInput) {
                    isGuestList = guestListInput.value === 'true';
                } else {
                    isGuestList = window.currentFormIsGuestList === true;
                }
                const buttonText = newBtn.querySelector('span');
                if (buttonText) {
                    buttonText.textContent = isGuestList ? 'Confirmação de Check-in' : 'Captação de Clientes';
                    console.log('Y"" [BUTTON] Texto atualizado:', buttonText.textContent, 'isGuestList:', isGuestList);
                }
            };
            
            // Atualizar texto inicial
            updateButtonText();
            
            // Observar mudanças no checkbox
            const observer = new MutationObserver(() => {
                updateButtonText();
            });
            
            // Observar mudanças no input hidden
            const guestListInput = document.getElementById('is-guest-list-mode');
            if (guestListInput) {
                observer.observe(guestListInput, { attributes: true, attributeFilter: ['value'] });
            }
            
            // Observar mudanças na variável global
            let lastValue = window.currentFormIsGuestList;
            setInterval(() => {
                if (window.currentFormIsGuestList !== lastValue) {
                    lastValue = window.currentFormIsGuestList;
                    updateButtonText();
                }
            }, 500);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão respostas clicado - redirecionando para página completa');
                
                // Redirecionar para página completa de Envios|Listas
                if (currentItemId) {
                    window.location.href = `/responsesList?itemId=${currentItemId}`;
                } else {
                    alert('Salve o formulário antes de visualizar os envios/listas');
                }
            });
            console.log('o. Listener adicionado: sidebar-responses');
        } else if (isFormEditPage) {
            console.warn('s️ Botão sidebar-responses não encontrado');
        }
        
        // Abrir modal de dashboard
        const sidebarDashboard = document.getElementById('sidebar-dashboard');
        if (sidebarDashboard) {
            const newBtn = sidebarDashboard.cloneNode(true);
            sidebarDashboard.parentNode.replaceChild(newBtn, sidebarDashboard);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('o. Botão dashboard clicado');
                openDashboardModal();
            });
            console.log('o. Listener adicionado: sidebar-dashboard');
        } else if (isFormEditPage) {
            console.warn('s️ Botão sidebar-dashboard não encontrado');
        }
        
        // Gerar código (compartilhar formulário pronto)
        const sidebarShareFormReady = document.getElementById('sidebar-share-form-ready');
        if (sidebarShareFormReady) {
            const newShareBtn = sidebarShareFormReady.cloneNode(true);
            sidebarShareFormReady.parentNode.replaceChild(newShareBtn, sidebarShareFormReady);
            newShareBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!currentItemId) {
                    alert('Salve o formulário primeiro para gerar o código.');
                    return;
                }
                newShareBtn.disabled = true;
                newShareBtn.querySelector('span').textContent = 'Gerando...';
                try {
                    const res = await fetch(`${API_URL}/api/profile/items/digital_form/${currentItemId}/create-import-link`, {
                        method: 'POST',
                        headers: getHeaders()
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.message || 'Erro ao gerar.');
                    const code = data.code || (data.token ? String(data.token).substring(0, 12) : '');
                    const modal = document.createElement('div');
                    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
                    modal.innerHTML = `
                        <div style="background:linear-gradient(135deg,#1C1C21,#0D0D0F);border:2px solid rgba(255,199,0,0.3);border-radius:16px;padding:28px;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
                            <h3 style="margin:0 0 8px 0;color:#FFC700;font-size:20px;display:flex;align-items:center;gap:10px;"><i class="fas fa-share-alt"></i> Compartilhar formulário pronto</h3>
                            <p style="color:#A1A1A1;font-size:14px;margin:0 0 20px 0;">Quem receber este código e usar &quot;Importar formulário&quot; (logado) importa uma cópia do seu formulário, com tudo que você salvou.</p>
                            <p style="color:#ECECEC;font-size:12px;font-weight:600;margin:0 0 6px 0;">Código</p>
                            <div style="display:flex;gap:8px;margin-bottom:20px;">
                                <input type="text" id="share-form-code" readonly value="${String(code).replace(/"/g, '&quot;')}" style="flex:1;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#FFC700;font-size:16px;font-weight:700;letter-spacing:1px;">
                                <button type="button" id="share-form-copy-code-btn" style="padding:12px 16px;background:linear-gradient(135deg,#FFC700,rgba(255,199,0,0.8));border:none;border-radius:10px;color:#000;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-copy"></i> Copiar</button>
                            </div>
                            <button type="button" id="share-form-close-btn" style="width:100%;padding:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#ECECEC;font-weight:600;cursor:pointer;">Fechar</button>
                        </div>`;
                    document.body.appendChild(modal);
                    const close = () => { modal.remove(); newShareBtn.disabled = false; newShareBtn.querySelector('span').textContent = 'Gerar código'; };
                    modal.querySelector('#share-form-close-btn').onclick = close;
                    modal.querySelector('#share-form-copy-code-btn').onclick = () => {
                        navigator.clipboard.writeText(code).then(() => {
                            const btn = modal.querySelector('#share-form-copy-code-btn');
                            btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                            btn.style.background = '#22c55e';
                            setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copiar'; btn.style.background = ''; }, 2000);
                        });
                    };
                    modal.onclick = (ev) => { if (ev.target === modal) close(); };
                } catch (err) {
                    alert(err.message || 'Erro ao gerar código.');
                } finally {
                    newShareBtn.disabled = false;
                    newShareBtn.querySelector('span').textContent = 'Gerar código';
                }
            });
        }

        // Importar formulário (digitar código)
        const sidebarImportForm = document.getElementById('sidebar-import-form');
        if (sidebarImportForm) {
            const newImportBtn = sidebarImportForm.cloneNode(true);
            sidebarImportForm.parentNode.replaceChild(newImportBtn, sidebarImportForm);
            newImportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = document.createElement('div');
                modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
                modal.innerHTML = `
                    <div style="background:linear-gradient(135deg,#1C1C21,#0D0D0F);border:2px solid rgba(255,199,0,0.3);border-radius:16px;padding:28px;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
                        <h3 style="margin:0 0 8px 0;color:#FFC700;font-size:20px;display:flex;align-items:center;gap:10px;"><i class="fas fa-file-import"></i> Importar formulário</h3>
                        <p style="color:#A1A1A1;font-size:14px;margin:0 0 16px 0;">Digite o código que alguém te passou (ex: KING-A1B2C).</p>
                        <label style="display:block;color:#ECECEC;font-size:12px;font-weight:600;margin-bottom:6px;">Código</label>
                        <input type="text" id="import-form-code-input" placeholder="Ex: KING-A1B2C" style="width:100%;padding:12px 14px;margin-bottom:20px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:#ECECEC;font-size:14px;box-sizing:border-box;">
                        <div style="display:flex;gap:10px;">
                            <button type="button" id="import-form-do-btn" style="flex:1;padding:14px;background:linear-gradient(135deg,#FFC700,rgba(255,199,0,0.8));border:none;border-radius:10px;color:#000;font-weight:700;cursor:pointer;"><i class="fas fa-download"></i> Importar</button>
                            <button type="button" id="import-form-cancel-btn" style="padding:14px 20px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#ECECEC;font-weight:600;cursor:pointer;">Cancelar</button>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
                const codeInput = modal.querySelector('#import-form-code-input');
                const doBtn = modal.querySelector('#import-form-do-btn');
                const closeImport = () => modal.remove();
                modal.querySelector('#import-form-cancel-btn').onclick = closeImport;
                modal.onclick = (ev) => { if (ev.target === modal) closeImport(); };
                doBtn.onclick = async () => {
                    const tokenOrCode = (codeInput.value || '').trim();
                    if (!tokenOrCode) {
                        alert('Digite o código.');
                        return;
                    }
                    doBtn.disabled = true;
                    doBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
                    try {
                        const infoRes = await fetch(`${API_URL}/api/profile/import-form-info?token=${encodeURIComponent(tokenOrCode)}`);
                        const info = await infoRes.json().catch(() => ({}));
                        if (!infoRes.ok) {
                            alert(info.message || 'Link ou código inválido.');
                            return;
                        }
                        const importIntoCurrent = !!currentItemId;
                        const confirmMsg = importIntoCurrent
                            ? 'Importar as perguntas e configurações do formulário "' + (info.formTitle || 'Formulário') + '"' + (info.ownerName ? ' de ' + info.ownerName : '') + '" para este formulário?\n\nO conteúdo atual será substituído.'
                            : 'Importar o formulário "' + (info.formTitle || 'Formulário') + '"' + (info.ownerName ? ' de ' + info.ownerName : '') + '?\n\nSerá criada uma cópia com todas as perguntas e configurações.';
                        if (!confirm(confirmMsg)) {
                            doBtn.disabled = false;
                            doBtn.innerHTML = '<i class="fas fa-download"></i> Importar';
                            return;
                        }
                        const body = { token: tokenOrCode, code: tokenOrCode };
                        if (importIntoCurrent) body.intoItemId = currentItemId;
                        const impRes = await fetch(`${API_URL}/api/profile/import-form`, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify(body)
                        });
                        const impData = await impRes.json().catch(() => ({}));
                        if (!impRes.ok) {
                            alert(impData.message || 'Erro ao importar.');
                            return;
                        }
                        closeImport();
                        if (impData.into && impData.id) {
                            if (typeof loadFormData === 'function') {
                                await loadFormData();
                            } else {
                                window.location.reload();
                            }
                        } else {
                            window.location.href = '/formPageEdit?itemId=' + (impData.id || impData.itemId);
                        }
                    } catch (err) {
                        alert(err.message || 'Erro ao importar.');
                    } finally {
                        doBtn.disabled = false;
                        doBtn.innerHTML = '<i class="fas fa-download"></i> Importar';
                    }
                };
            });
        }
        
    }
    
    // Função para abrir modal de gerenciamento de lista de convidados (quando está em modo lista)
    async function openGuestListManagementModalForCurrentForm() {
        const modal = document.createElement('div');
        modal.className = 'guest-list-management-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        try {
            // Buscar dados da lista de convidados
            const response = await fetch(`${API_URL}/api/guest-lists/${currentItemId}`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Erro ao carregar dados da lista');
            }
            
            const data = await response.json();
            const shortDomain = window.location.hostname.includes('localhost') 
                ? window.location.origin 
                : 'https://tag.conectaking.com.br';
            
            const registrationLink = `${shortDomain}/guest-list/register/${data.registration_token}`;
            const confirmationLink = `${shortDomain}/guest-list/confirm/${data.confirmation_token}`;
            const publicViewLink = `${shortDomain}/guest-list/view-full/${data.public_view_token}`;
            
            modal.innerHTML = `
                <div style="background: var(--card-background-color, #1C1C21); padding: 40px; border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border-color, #2C2C2F); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                        <h3 style="margin: 0; color: var(--dourado-principal, #FFC700); font-size: 24px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-users"></i> Gerenciar Lista de Convidados
                        </h3>
                        <button class="close-modal-btn" style="background: none; border: none; color: var(--text-dark, #A1A1A1); font-size: 24px; cursor: pointer; padding: 5px 10px; border-radius: 8px;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div style="display: grid; gap: 24px;">
                        <!-- Tipo Check-in (atalho; preferir Configurações) -->
                        <div style="padding: 20px; background: rgba(255,199,0,0.05); border-radius: 12px; border: 2px solid rgba(255,199,0,0.3);">
                            <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; color: var(--text, #ECECEC); font-weight: 600;">
                                <input type="checkbox" id="modal-guest-list-toggle" ${window.currentFormIsGuestList ? 'checked' : ''} style="width: 24px; height: 24px; cursor: pointer; margin-top: 2px; accent-color: var(--dourado-principal, #FFC700);">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                        <i class="fas fa-qrcode" style="color: var(--dourado-principal, #FFC700); font-size: 18px;"></i>
                                        <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">Modo Check-in</div>
                                    </div>
                                    <div style="font-size: 13px; color: var(--text-dark, #A1A1A1); font-weight: normal; line-height: 1.6; margin-bottom: 12px;">
                                        <strong>Ativar:</strong> QR Code, portaria e quem chegou / não chegou.<br>
                                        <strong>Desativar:</strong> volta para Captação de Clientes (só cadastro).<br>
                                        Prefira alterar também em <strong>Configurações — Tipo de Formulário</strong>.
                                    </div>
                                </div>
                            </label>
                        </div>
                        
                        <!-- WhatsApp (atalho) -->
                        <div id="guest-list-send-options" style="display: ${window.currentFormIsGuestList ? 'block' : 'none'}; padding: 20px; background: rgba(74,144,226,0.05); border-radius: 12px; border: 2px solid rgba(74,144,226,0.3);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                                <i class="fab fa-whatsapp" style="color: #25D366; font-size: 18px;"></i>
                                <div style="font-weight: 700; font-size: 16px; color: var(--text, #ECECEC);">WhatsApp</div>
                            </div>
                            
                            <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                                <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; color: var(--text, #ECECEC); font-weight: 500;">
                                    <input type="checkbox" id="modal-enable-whatsapp" style="width: 20px; height: 20px; cursor: pointer; margin-top: 2px; accent-color: #25D366;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">Também enviar via WhatsApp</div>
                                        <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); line-height: 1.5; margin-bottom: 8px;">
                                            No Check-in o botão público prioriza a inscrição com QR. WhatsApp pode ser usado como complemento.
                                        </div>
                                        <div id="whatsapp-number-field" style="display: none; margin-top: 12px;">
                                            <label style="display: block; margin-bottom: 8px; font-size: 12px; color: var(--text, #ECECEC); font-weight: 500;">
                                                <i class="fas fa-phone"></i> Número do WhatsApp (com DDD, ex: 11988789417)
                                            </label>
                                            <input type="text" id="modal-whatsapp-number" placeholder="11988789417" style="width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: var(--text, #ECECEC); font-size: 14px; font-family: monospace;" pattern="[0-9]{10,15}" maxlength="15">
                                        </div>
                                    </div>
                                </label>
                            </div>
                            
                            <button id="save-guest-list-toggle" style="margin-top: 16px; padding: 10px 20px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">
                                Salvar Configurações
                            </button>
                        </div>
                        
                        <!-- Link de Inscrição -->
                        <div style="padding: 20px; background: rgba(255,199,0,0.05); border-radius: 12px; border: 1px solid rgba(255,199,0,0.2);">
                            <label style="display: block; margin-bottom: 12px; color: var(--text, #ECECEC); font-weight: 600; font-size: 14px;">
                                <i class="fas fa-user-plus"></i> Link de Inscrição
                            </label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" value="${registrationLink}" readonly style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; color: var(--text, #ECECEC); font-size: 13px; font-family: monospace;">
                                <button onclick="navigator.clipboard.writeText('${registrationLink}'); alert('Link copiado!');" style="padding: 12px 20px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <p style="margin: 8px 0 0 0; font-size: 12px; color: var(--text-dark, #A1A1A1);">
                                Compartilhe este link para que as pessoas possam se inscrever na lista
                            </p>
                        </div>
                        
                        <!-- Link de Confirmação -->
                        <div style="padding: 20px; background: rgba(74,144,226,0.05); border-radius: 12px; border: 1px solid rgba(74,144,226,0.2);">
                            <label style="display: block; margin-bottom: 12px; color: var(--text, #ECECEC); font-weight: 600; font-size: 14px;">
                                <i class="fas fa-user-check"></i> Link de Confirmação
                            </label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" value="${confirmationLink}" readonly style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; color: var(--text, #ECECEC); font-size: 13px; font-family: monospace;">
                                <button onclick="navigator.clipboard.writeText('${confirmationLink}'); alert('Link copiado!');" style="padding: 12px 20px; background: #4A90E2; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <p style="margin: 8px 0 0 0; font-size: 12px; color: var(--text-dark, #A1A1A1);">
                                Link para que pessoas possam confirmar a presença dos convidados
                            </p>
                        </div>
                        
                        <!-- Link de Visualização Completa (Portaria) -->
                        <div style="padding: 20px; background: rgba(74,144,226,0.1); border-radius: 12px; border: 2px solid rgba(74,144,226,0.3);">
                            <label style="display: block; margin-bottom: 12px; color: #4A90E2; font-weight: 700; font-size: 14px;">
                                <i class="fas fa-eye"></i> Link de Visualização Completa (Portaria)
                            </label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" value="${publicViewLink}" readonly style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; color: var(--text, #ECECEC); font-size: 13px; font-family: monospace;">
                                <button onclick="navigator.clipboard.writeText('${publicViewLink}'); alert('Link copiado!');" style="padding: 12px 20px; background: #4A90E2; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <p style="margin: 8px 0 0 0; font-size: 12px; color: var(--text-dark, #A1A1A1);">
                                <strong>Para a portaria:</strong> Link completo com todas as abas (Cadastrados, para Confirmação, Confirmados)
                            </p>
                        </div>
                        
                        <!-- Botões de ação -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                            <button onclick="window.location.href='/guestListEdit?itemId=${currentItemId}&mode=manage';" style="padding: 14px 20px; background: linear-gradient(135deg, var(--dourado-principal, #FFC700), #FFD700); color: #000; border: none; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fas fa-users"></i> Gerenciar Convidados
                            </button>
                            <button onclick="window.open('${publicViewLink}', '_blank');" style="padding: 14px 20px; background: rgba(74,144,226,0.2); color: #4A90E2; border: 2px solid #4A90E2; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fas fa-external-link-alt"></i> Ver Página Pública
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Fechar modal
            modal.querySelector('.close-modal-btn').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            // Salvar toggle de Check-in
            const saveToggleBtn = modal.querySelector('#save-guest-list-toggle');
            const toggleCheckbox = modal.querySelector('#modal-guest-list-toggle');
            const sendOptionsDiv = modal.querySelector('#guest-list-send-options');
            const enableWhatsappCheckbox = modal.querySelector('#modal-enable-whatsapp');
            const enableGuestListSubmitCheckbox = modal.querySelector('#modal-enable-guest-list-submit');
            
            // Função para mostrar/esconder opções de envio
            const toggleSendOptions = (show) => {
                if (sendOptionsDiv) {
                    sendOptionsDiv.style.display = show ? 'block' : 'none';
                }
            };
            
            // Função para atualizar valores nos inputs hidden e no preview
            const updateWhatsappValues = () => {
                const enableWhatsapp = enableWhatsappCheckbox ? enableWhatsappCheckbox.checked : true;
                const enableGuestListSubmit = enableGuestListSubmitCheckbox ? enableGuestListSubmitCheckbox.checked : false;
                
                // Atualizar inputs hidden
                let enableWhatsappInput = document.getElementById('enable-whatsapp-value');
                if (!enableWhatsappInput) {
                    enableWhatsappInput = document.createElement('input');
                    enableWhatsappInput.type = 'hidden';
                    enableWhatsappInput.id = 'enable-whatsapp-value';
                    document.body.appendChild(enableWhatsappInput);
                }
                enableWhatsappInput.value = enableWhatsapp ? 'true' : 'false';
                window.enableWhatsappValue = enableWhatsapp;
                
                let enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                if (!enableGuestListSubmitInput) {
                    enableGuestListSubmitInput = document.createElement('input');
                    enableGuestListSubmitInput.type = 'hidden';
                    enableGuestListSubmitInput.id = 'enable-guest-list-submit-value';
                    document.body.appendChild(enableGuestListSubmitInput);
                }
                enableGuestListSubmitInput.value = enableGuestListSubmit ? 'true' : 'false';
                window.enableGuestListSubmitValue = enableGuestListSubmit;
                
                // Atualizar preview
                if (typeof updatePreviewButton === 'function') {
                    updatePreviewButton();
                }
                
                console.log('Y"" [CHECKBOX] Valores atualizados:', { enableWhatsapp, enableGuestListSubmit });
            };
            
            // Listener para checkbox de Check-in
            if (toggleCheckbox) {
                toggleCheckbox.addEventListener('change', (e) => {
                    toggleSendOptions(e.target.checked);
                });
            }
            
            // Função para mostrar/esconder campo de número do WhatsApp
            const toggleWhatsappNumberField = (show) => {
                const whatsappNumberField = modal.querySelector('#whatsapp-number-field');
                if (whatsappNumberField) {
                    whatsappNumberField.style.display = show ? 'block' : 'none';
                }
            };
            
            // Função para atualizar input hidden do número do WhatsApp
            const updateWhatsappNumberInput = () => {
                const whatsappNumberInput = modal.querySelector('#modal-whatsapp-number');
                const whatsappNumber = whatsappNumberInput ? whatsappNumberInput.value.trim() : '';
                
                // Atualizar input hidden principal
                let whatsappInput = document.getElementById('whatsapp-number');
                if (!whatsappInput) {
                    whatsappInput = document.createElement('input');
                    whatsappInput.type = 'hidden';
                    whatsappInput.id = 'whatsapp-number';
                    document.body.appendChild(whatsappInput);
                }
                whatsappInput.value = whatsappNumber;
                console.log('Y"" [WHATSAPP] Número atualizado:', whatsappNumber);
            };
            
            // Event listeners para checkboxes - PERMITIR ambas as opções juntas
            if (enableWhatsappCheckbox) {
                enableWhatsappCheckbox.addEventListener('change', (e) => {
                    // Mostrar/esconder campo de número do WhatsApp
                    toggleWhatsappNumberField(e.target.checked);
                    // Atualizar valores (permitir ambas as opções juntas)
                    updateWhatsappValues();
                    // Atualizar input hidden do número do WhatsApp
                    updateWhatsappNumberInput();
                });
            }
            
            if (enableGuestListSubmitCheckbox) {
                enableGuestListSubmitCheckbox.addEventListener('change', (e) => {
                    // Atualizar valores (permitir ambas as opções juntas - NÃO desmarcar WhatsApp)
                    updateWhatsappValues();
                });
            }
            
            // Event listener para campo de número do WhatsApp
            const whatsappNumberInput = modal.querySelector('#modal-whatsapp-number');
            if (whatsappNumberInput) {
                whatsappNumberInput.addEventListener('input', () => {
                    updateWhatsappNumberInput();
                });
                whatsappNumberInput.addEventListener('blur', () => {
                    updateWhatsappNumberInput();
                });
            }
            
            // Mostrar/esconder campo de número do WhatsApp baseado no estado inicial
            if (enableWhatsappCheckbox) {
                toggleWhatsappNumberField(enableWhatsappCheckbox.checked);
                // Atualizar input hidden com valor inicial
                if (whatsappNumberInput) {
                    updateWhatsappNumberInput();
                }
            }
            
            if (saveToggleBtn && toggleCheckbox) {
                // Definir estado inicial - verificar item_type atual do backend
                // IMPORTANTE: Aguardar loadFormData terminar antes de fazer esta requisição
                setTimeout(async () => {
                    try {
                        // Aguardar um pouco mais para evitar conflito com loadFormData
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const itemResponse = await safeFetch(`${API_URL}/api/profile/items/${currentItemId}`, {
                            headers: getHeaders()
                        }, 300);
                        if (itemResponse.ok) {
                            const itemData = await itemResponse.json();
                            const currentItemType = itemData.data?.item_type;
                            const currentState = currentItemType === 'guest_list';
                            toggleCheckbox.checked = currentState;
                            window.currentFormIsGuestList = currentState;
                            
                            // Mostrar/esconder opções de envio
                            toggleSendOptions(currentState);
                            
                            // Carregar valores de enable_whatsapp e enable_guest_list_submit
                            if (currentState && itemData.data?.digital_form_data) {
                                const formData = itemData.data.digital_form_data;
                                const enableWhatsappValue = formData.enable_whatsapp !== false; // Default true
                                const enableGuestListSubmitValue = formData.enable_guest_list_submit === true; // Default false
                                
                                if (enableWhatsappCheckbox) {
                                    enableWhatsappCheckbox.checked = enableWhatsappValue;
                                    // Mostrar/esconder campo de número do WhatsApp
                                    const whatsappNumberField = modal.querySelector('#whatsapp-number-field');
                                    if (whatsappNumberField) {
                                        whatsappNumberField.style.display = enableWhatsappValue ? 'block' : 'none';
                                    }
                                    // Carregar número do WhatsApp
                                    const whatsappNumberInput = modal.querySelector('#modal-whatsapp-number');
                                    if (whatsappNumberInput && formData.whatsapp_number) {
                                        whatsappNumberInput.value = formData.whatsapp_number;
                                    }
                                }
                                if (enableGuestListSubmitCheckbox) {
                                    enableGuestListSubmitCheckbox.checked = enableGuestListSubmitValue;
                                }
                                
                                // Salvar em inputs hidden
                                let enableWhatsappInput = document.getElementById('enable-whatsapp-value');
                                if (!enableWhatsappInput) {
                                    enableWhatsappInput = document.createElement('input');
                                    enableWhatsappInput.type = 'hidden';
                                    enableWhatsappInput.id = 'enable-whatsapp-value';
                                    document.body.appendChild(enableWhatsappInput);
                                }
                                enableWhatsappInput.value = enableWhatsappValue ? 'true' : 'false';
                                
                                let enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                                if (!enableGuestListSubmitInput) {
                                    enableGuestListSubmitInput = document.createElement('input');
                                    enableGuestListSubmitInput.type = 'hidden';
                                    enableGuestListSubmitInput.id = 'enable-guest-list-submit-value';
                                    document.body.appendChild(enableGuestListSubmitInput);
                                }
                                enableGuestListSubmitInput.value = enableGuestListSubmitValue ? 'true' : 'false';
                                
                                // Salvar em variáveis globais
                                window.enableWhatsappValue = enableWhatsappValue;
                                window.enableGuestListSubmitValue = enableGuestListSubmitValue;
                            } else if (currentState) {
                                // Se não tiver dados, usar defaults
                                if (enableWhatsappCheckbox) enableWhatsappCheckbox.checked = true;
                                if (enableGuestListSubmitCheckbox) enableGuestListSubmitCheckbox.checked = true;
                                
                                // Salvar defaults em inputs hidden
                                let enableWhatsappInput = document.getElementById('enable-whatsapp-value');
                                if (!enableWhatsappInput) {
                                    enableWhatsappInput = document.createElement('input');
                                    enableWhatsappInput.type = 'hidden';
                                    enableWhatsappInput.id = 'enable-whatsapp-value';
                                    document.body.appendChild(enableWhatsappInput);
                                }
                                enableWhatsappInput.value = 'true';
                                
                                let enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                                if (!enableGuestListSubmitInput) {
                                    enableGuestListSubmitInput = document.createElement('input');
                                    enableGuestListSubmitInput.type = 'hidden';
                                    enableGuestListSubmitInput.id = 'enable-guest-list-submit-value';
                                    document.body.appendChild(enableGuestListSubmitInput);
                                }
                                enableGuestListSubmitInput.value = 'true';
                                
                                window.enableWhatsappValue = true;
                                window.enableGuestListSubmitValue = true;
                            }
                            
                            // Atualizar input hidden
                            let guestListInput = document.getElementById('is-guest-list-mode');
                            if (!guestListInput) {
                                guestListInput = document.createElement('input');
                                guestListInput.type = 'hidden';
                                guestListInput.id = 'is-guest-list-mode';
                                document.body.appendChild(guestListInput);
                            }
                            guestListInput.value = currentState ? 'true' : 'false';
                            
                            console.log('o. [TOGGLE] Estado inicial carregado:', currentState ? 'Check-in' : 'Captação de Clientes');
                        }
                    } catch (err) {
                        console.warn('s️ Erro ao carregar estado inicial:', err);
                        // Fallback para estado atual
                        const currentState = window.currentFormIsGuestList === true || 
                                           document.getElementById('is-guest-list-mode')?.value === 'true';
                        toggleCheckbox.checked = currentState;
                        toggleSendOptions(currentState);
                    }
                })();
                
                saveToggleBtn.addEventListener('click', async () => {
                    const isChecked = toggleCheckbox.checked;
                    // Obter valores atualizados dos inputs hidden (já atualizados pelos event listeners)
                    const enableWhatsappInput = document.getElementById('enable-whatsapp-value');
                    const enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                    const enableWhatsapp = enableWhatsappInput ? enableWhatsappInput.value === 'true' : (enableWhatsappCheckbox ? enableWhatsappCheckbox.checked : true);
                    const enableGuestListSubmit = enableGuestListSubmitInput ? enableGuestListSubmitInput.value === 'true' : (enableGuestListSubmitCheckbox ? enableGuestListSubmitCheckbox.checked : false);
                    
                    window.currentFormIsGuestList = isChecked;
                    // Salvar valores em variáveis globais para uso no saveFormHandler
                    window.enableWhatsappValue = enableWhatsapp;
                    window.enableGuestListSubmitValue = enableGuestListSubmit;
                    
                    // Atualizar input hidden
                    let guestListInput = document.getElementById('is-guest-list-mode');
                    if (!guestListInput) {
                        guestListInput = document.createElement('input');
                        guestListInput.type = 'hidden';
                        guestListInput.id = 'is-guest-list-mode';
                        document.body.appendChild(guestListInput);
                    }
                    guestListInput.value = isChecked ? 'true' : 'false';
                    
                    // Salvar no backend
                    saveToggleBtn.disabled = true;
                    saveToggleBtn.textContent = 'Salvando...';
                    
                    try {
                        console.log('Y"" [TOGGLE] Alterando modo:', isChecked ? 'Check-in' : 'Captação de Clientes');
                        console.log('Y"" [TOGGLE] Opções:', { enableWhatsapp, enableGuestListSubmit });
                        
                        // Persistir flags (Check-in cria/sincroniza guest_list_items no backend)
                        {
                            const whatsappNumberInput = modal.querySelector('#modal-whatsapp-number');
                            const whatsappNumber = whatsappNumberInput ? whatsappNumberInput.value.trim() : '';
                            
                            let whatsappInput = document.getElementById('whatsapp-number');
                            if (!whatsappInput) {
                                whatsappInput = document.createElement('input');
                                whatsappInput.type = 'hidden';
                                whatsappInput.id = 'whatsapp-number';
                                document.body.appendChild(whatsappInput);
                            }
                            whatsappInput.value = whatsappNumber;
                            
                            const finalEnableWhatsapp = !!enableWhatsapp;
                            const finalEnableGL = !!isChecked;
                            const sendMode = finalEnableGL ? 'checkin' : 'lead';
                            
                            let enableWhatsappHidden = document.getElementById('enable-whatsapp-value');
                            if (!enableWhatsappHidden) {
                                enableWhatsappHidden = document.createElement('input');
                                enableWhatsappHidden.type = 'hidden';
                                enableWhatsappHidden.id = 'enable-whatsapp-value';
                                document.body.appendChild(enableWhatsappHidden);
                            }
                            enableWhatsappHidden.value = finalEnableWhatsapp ? 'true' : 'false';
                            window.enableWhatsappValue = finalEnableWhatsapp;
                            
                            let enableGLHidden = document.getElementById('enable-guest-list-submit-value');
                            if (!enableGLHidden) {
                                enableGLHidden = document.createElement('input');
                                enableGLHidden.type = 'hidden';
                                enableGLHidden.id = 'enable-guest-list-submit-value';
                                document.body.appendChild(enableGLHidden);
                            }
                            enableGLHidden.value = finalEnableGL ? 'true' : 'false';
                            window.enableGuestListSubmitValue = finalEnableGL;
                            
                            let sendModeHidden = document.getElementById('send-mode-value');
                            if (!sendModeHidden) {
                                sendModeHidden = document.createElement('input');
                                sendModeHidden.type = 'hidden';
                                sendModeHidden.id = 'send-mode-value';
                                document.body.appendChild(sendModeHidden);
                            }
                            sendModeHidden.value = sendMode;
                            
                            const saveOptionsResponse = await fetch(`${API_URL}/api/profile/items/digital_form/${currentItemId}`, {
                                method: 'PUT',
                                headers: getHeaders(),
                                body: JSON.stringify({
                                    enable_whatsapp: finalEnableWhatsapp,
                                    enable_guest_list_submit: finalEnableGL,
                                    send_mode: sendMode,
                                    whatsapp_number: whatsappNumber || null
                                })
                            });
                            
                            if (!saveOptionsResponse.ok) {
                                const errorData = await saveOptionsResponse.json().catch(() => ({}));
                                console.warn('s️ [TOGGLE] Erro ao salvar opções de envio:', errorData);
                            } else {
                                console.log('o. [TOGGLE] Tipo salvo:', { sendMode, finalEnableWhatsapp, finalEnableGL });
                            }
                        }
                        
                        // Se desativou, garantir que salve como formulário normal
                        if (!isChecked) {
                            // Salvar como formulário digital para garantir que está tudo certo
                            const saveBtn = document.getElementById('save-form-btn');
                            if (saveBtn) {
                                // Disparar o evento de salvar
                                saveBtn.click();
                                // Aguardar um pouco para o salvamento completar
                                await new Promise(resolve => setTimeout(resolve, 1500));
                            }
                        }
                        
                        saveToggleBtn.textContent = 'o" Salvo!';
                        setTimeout(() => {
                            modal.remove();
                            location.reload(); // Recarregar para refletir mudanças
                        }, 1000);
                    } catch (error) {
                        console.error('O [TOGGLE] Erro ao salvar:', error);
                        alert('Erro ao salvar configurações: ' + error.message);
                        saveToggleBtn.textContent = 'Salvar Configurações';
                        saveToggleBtn.disabled = false;
                    }
                });
            }
        } catch (err) {
            console.error('Erro ao carregar dados da lista:', err);
            modal.innerHTML = `
                <div style="background: var(--card-background-color, #1C1C21); padding: 40px; border-radius: 16px; max-width: 600px; width: 100%; text-align: center; border: 1px solid var(--border-color, #2C2C2F);">
                    <h3 style="color: var(--text, #ECECEC); margin-bottom: 20px;">Erro ao carregar lista</h3>
                    <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 24px;">${err.message}</p>
                    <button onclick="this.closest('.guest-list-management-modal').remove();" style="padding: 12px 24px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Fechar
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('button').addEventListener('click', () => modal.remove());
        }
    }
    
    // Função para abrir modal de respostas (PREMIUM)
    async function openResponsesModal() {
        // Verificar se é modo lista de convidados ou formulário normal
        const isGuestListMode = window.currentFormIsGuestList === true || 
                               document.getElementById('is-guest-list-mode')?.value === 'true';
        
        console.log('Y"< Abrindo modal de respostas/envios:', { isGuestListMode, currentItemId });
        
        const modal = document.createElement('div');
        modal.className = 'responses-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); backdrop-filter: blur(12px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;';
        
        // HTML diferente para modo lista vs formulário
        if (isGuestListMode) {
            modal.innerHTML = `
                <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 0; border-radius: 24px; max-width: 1400px; width: 100%; max-height: 95vh; overflow: hidden; color: #ECECEC; margin: auto; box-shadow: 0 30px 80px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.08);">
                    <div style="background: linear-gradient(135deg, #FFC70015 0%, transparent 100%); padding: 32px 40px; border-bottom: 1px solid rgba(255,255,255,0.1); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <div style="font-size: 2rem; color: #FFC700;">
                                        <i class="fas fa-users"></i>
                                    </div>
                                    <h3 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #ECECEC 0%, #A1A1A1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px;">Confirmação de Check-in</h3>
                                </div>
                                <p style="margin: 0; color: #A1A1A1; font-size: 15px; font-weight: 500;">Visualize quem chegou e quem ainda não chegou</p>
                            </div>
                            <button class="close-responses-modal" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #A1A1A1; font-size: 20px; cursor: pointer; padding: 12px 16px; border-radius: 12px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700'; this.style.color='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#A1A1A1';">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <!-- Tabs de Navegação para Lista -->
                        <div style="display: flex; gap: 8px; border-bottom: 2px solid rgba(255,255,255,0.1);">
                            <button class="response-tab active" data-tab="arrived" style="padding: 12px 24px; background: transparent; border: none; color: #A1A1A1; font-weight: 600; font-size: 15px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; position: relative; top: 2px;">
                                <i class="fas fa-check-circle"></i> Quem Chegou (<span id="tab-count-arrived">0</span>)
                            </button>
                            <button class="response-tab" data-tab="not-arrived" style="padding: 12px 24px; background: transparent; border: none; color: #A1A1A1; font-weight: 600; font-size: 15px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; position: relative; top: 2px;">
                                <i class="fas fa-clock"></i> Quem Não Chegou (<span id="tab-count-not-arrived">0</span>)
                            </button>
                        </div>
                    </div>
                
                <div style="padding: 32px 40px; overflow-y: auto; max-height: calc(95vh - 220px);">
                    <div id="responses-loading" style="text-align: center; padding: 60px 20px; color: #A1A1A1;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px;"></i>
                        <div>Carregando lista de convidados...</div>
                    </div>
                    
                    <div id="responses-content" style="display: none;">
                        <!-- Estatísticas Rápidas para Lista -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 14px; box-shadow: 0 4px 12px rgba(67, 233, 123, 0.3);">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-check-circle" style="font-size: 1.5rem; opacity: 0.9;"></i>
                                    <div style="font-size: 24px; font-weight: 800;" id="stats-arrived">0</div>
                                </div>
                                <div style="font-size: 13px; opacity: 0.9; font-weight: 500;">Chegaram</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 14px; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-clock" style="font-size: 1.5rem; opacity: 0.9;"></i>
                                    <div style="font-size: 24px; font-weight: 800;" id="stats-not-arrived">0</div>
                                </div>
                                <div style="font-size: 13px; opacity: 0.9; font-weight: 500;">Não Chegaram</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 14px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-users" style="font-size: 1.5rem; opacity: 0.9;"></i>
                                    <div style="font-size: 24px; font-weight: 800;" id="stats-total-guests">0</div>
                                </div>
                                <div style="font-size: 13px; opacity: 0.9; font-weight: 500;">Total</div>
                            </div>
                        </div>
                        
                        <!-- Busca e Filtros -->
                        <div style="margin-bottom: 24px; display: flex; gap: 12px; align-items: center;">
                            <input type="text" id="responses-search" placeholder="Buscar por nome..." style="flex: 1; padding: 14px 18px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: #ECECEC; font-size: 14px; transition: all 0.3s;" onfocus="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)';" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.05)';">
                            <button id="export-csv-btn" style="padding: 14px 20px; background: linear-gradient(135deg, #10B981, #059669); border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';" title="Exportar para CSV">
                                <i class="fas fa-file-csv"></i> CSV
                            </button>
                        </div>
                        
                        <div id="responses-list"></div>
                    </div>
                    
                    <div id="responses-empty" style="display: none; text-align: center; padding: 60px 20px;">
                        <div style="font-size: 4rem; color: #2C2C2F; margin-bottom: 20px;">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3 style="color: #ECECEC; margin: 0 0 12px 0; font-size: 24px;">Nenhum convidado ainda</h3>
                        <p style="color: #A1A1A1; margin: 0;">Os convidados aparecerão aqui quando confirmarem presença</p>
                    </div>
                </div>
            </div>
        `;
        } else {
            // HTML para modo formulário normal (código existente - manter como está)
            modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 0; border-radius: 24px; max-width: 1400px; width: 100%; max-height: 95vh; overflow: hidden; color: #ECECEC; margin: auto; box-shadow: 0 30px 80px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.08);">
                <div style="background: linear-gradient(135deg, #FFC70015 0%, transparent 100%); padding: 32px 40px; border-bottom: 1px solid rgba(255,255,255,0.1); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <div style="font-size: 2rem; color: #FFC700;">
                                    <i class="fas fa-inbox"></i>
                                </div>
                                <h3 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #ECECEC 0%, #A1A1A1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px;">Captação de Clientes</h3>
                            </div>
                            <p style="margin: 0; color: #A1A1A1; font-size: 15px; font-weight: 500;">Gerencie e visualize todas as respostas recebidas</p>
                        </div>
                        <button class="close-responses-modal" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #A1A1A1; font-size: 20px; cursor: pointer; padding: 12px 16px; border-radius: 12px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700'; this.style.color='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#A1A1A1';">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Tabs de Navegação -->
                    <div style="display: flex; gap: 8px; border-bottom: 2px solid rgba(255,255,255,0.1);">
                        <button class="response-tab active" data-tab="all" style="padding: 12px 24px; background: transparent; border: none; color: #A1A1A1; font-weight: 600; font-size: 15px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; position: relative; top: 2px;">
                            <i class="fas fa-list"></i> Todas (<span id="tab-count-all">0</span>)
                        </button>
                        <button class="response-tab" data-tab="today" style="padding: 12px 24px; background: transparent; border: none; color: #A1A1A1; font-weight: 600; font-size: 15px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; position: relative; top: 2px;">
                            <i class="fas fa-calendar-day"></i> Hoje (<span id="tab-count-today">0</span>)
                        </button>
                        <button class="response-tab" data-tab="week" style="padding: 12px 24px; background: transparent; border: none; color: #A1A1A1; font-weight: 600; font-size: 15px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; position: relative; top: 2px;">
                            <i class="fas fa-calendar-week"></i> Esta Semana (<span id="tab-count-week">0</span>)
                        </button>
                        <button class="response-tab" data-tab="month" style="padding: 12px 24px; background: transparent; border: none; color: #A1A1A1; font-weight: 600; font-size: 15px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; position: relative; top: 2px;">
                            <i class="fas fa-calendar-alt"></i> Este Mês (<span id="tab-count-month">0</span>)
                        </button>
                    </div>
                </div>
                
                <div style="padding: 32px 40px; overflow-y: auto; max-height: calc(95vh - 220px);">
                    <div id="responses-loading" style="text-align: center; padding: 60px 20px; color: #A1A1A1;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px;"></i>
                        <div>Carregando respostas...</div>
                    </div>
                    
                    <div id="responses-content" style="display: none;">
                        <!-- Estatísticas Rápidas -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 14px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-users" style="font-size: 1.5rem; opacity: 0.9;"></i>
                                    <div style="font-size: 24px; font-weight: 800;" id="stats-total-responders">0</div>
                                </div>
                                <div style="font-size: 13px; opacity: 0.9; font-weight: 500;">Respondentes</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 14px; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-inbox" style="font-size: 1.5rem; opacity: 0.9;"></i>
                                    <div style="font-size: 24px; font-weight: 800;" id="stats-total-responses">0</div>
                                </div>
                                <div style="font-size: 13px; opacity: 0.9; font-weight: 500;">Total de Respostas</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fas fa-envelope" style="font-size: 1.5rem; opacity: 0.9;"></i>
                                    <div style="font-size: 24px; font-weight: 800;" id="stats-with-email">0</div>
                                </div>
                                <div style="font-size: 13px; opacity: 0.9; font-weight: 500;">Com Email</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 14px; box-shadow: 0 4px 12px rgba(67, 233, 123, 0.3);">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <i class="fab fa-whatsapp" style="font-size: 1.5rem; opacity: 0.9;"></i>
                                    <div style="font-size: 24px; font-weight: 800;" id="stats-with-phone">0</div>
                                </div>
                                <div style="font-size: 13px; opacity: 0.9; font-weight: 500;">Com WhatsApp</div>
                            </div>
                        </div>
                        
                        <!-- Busca e Filtros Avançados (Melhorias 6, 10) -->
                        <div style="margin-bottom: 24px;">
                            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                                <div style="flex: 1; position: relative;">
                                    <input type="text" id="responses-search" placeholder="Buscar por nome, email, telefone, CPF ou qualquer campo..." style="width: 100%; padding: 14px 18px 14px 45px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: #ECECEC; font-size: 14px; transition: all 0.3s;" onfocus="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)';" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.05)';" aria-label="Buscar respostas">
                                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #A1A1A1; pointer-events: none;"></i>
                                </div>
                                <button id="advanced-filters-btn" style="padding: 14px 18px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; color: #ECECEC; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;" onmouseover="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)';" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.05)';" title="Filtros Avançados">
                                    <i class="fas fa-filter"></i> Filtros
                                </button>
                            </div>
                            
                            <!-- Painel de Filtros Avançados (Melhoria 10) -->
                            <div id="advanced-filters-panel" style="display: none; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 16px; animation: slideDown 0.3s ease-out;">
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                                    <div>
                                        <label style="display: block; margin-bottom: 6px; color: #ECECEC; font-size: 12px; font-weight: 600;">Filtrar por Campo</label>
                                        <select id="filter-by-field" style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ECECEC; font-size: 13px;">
                                            <option value="">Todos os campos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 6px; color: #ECECEC; font-size: 12px; font-weight: 600;">Data Inicial</label>
                                        <input type="date" id="filter-date-from" style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ECECEC; font-size: 13px;">
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 6px; color: #ECECEC; font-size: 12px; font-weight: 600;">Data Final</label>
                                        <input type="date" id="filter-date-to" style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ECECEC; font-size: 13px;">
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 6px; color: #ECECEC; font-size: 12px; font-weight: 600;">Status</label>
                                        <select id="filter-status" style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ECECEC; font-size: 13px;">
                                            <option value="">Todos</option>
                                            <option value="with_email">Com Email</option>
                                            <option value="with_phone">Com WhatsApp</option>
                                            <option value="recent">Mais Recentes</option>
                                        </select>
                                    </div>
                                </div>
                                <button id="clear-filters-btn" style="margin-top: 12px; padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #ECECEC; font-size: 12px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)';" onmouseout="this.style.background='rgba(255,255,255,0.05)';">
                                    <i class="fas fa-times"></i> Limpar Filtros
                                </button>
                            </div>
                            
                            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                                <button id="select-all-btn" style="padding: 10px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #ECECEC; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; transition: all 0.3s;" onmouseover="this.style.borderColor='#FFC700';" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';" title="Selecionar Todos">
                                    <i class="fas fa-check-square"></i> Selecionar
                                </button>
                                <span id="selected-count" style="color: #A1A1A1; font-size: 13px; display: none;"><span id="selected-count-num">0</span> selecionados</span>
                                <div style="flex: 1;"></div>
                                <button id="export-selected-btn" style="padding: 14px 20px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; display: none; align-items: center; gap: 8px; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';" title="Exportar Selecionados">
                                    <i class="fas fa-download"></i> Exportar Selecionados
                                </button>
                                <button id="export-csv-btn" style="padding: 14px 20px; background: linear-gradient(135deg, #10B981, #059669); border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';" title="Exportar para CSV">
                                    <i class="fas fa-file-csv"></i> CSV
                                </button>
                                <button id="export-excel-btn" style="padding: 14px 20px; background: linear-gradient(135deg, #FFC700, #FFA500); border: none; border-radius: 12px; color: #000; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';" title="Exportar para Excel">
                                    <i class="fas fa-file-excel"></i> Excel
                                </button>
                            </div>
                        </div>
                        
                        <div id="responses-list"></div>
                    </div>
                    
                    <div id="responses-empty" style="display: none; text-align: center; padding: 60px 20px;">
                        <div style="font-size: 4rem; color: #2C2C2F; margin-bottom: 20px;">
                            <i class="fas fa-inbox"></i>
                        </div>
                        <h3 style="color: #ECECEC; margin: 0 0 12px 0; font-size: 24px;">Nenhuma resposta ainda</h3>
                        <p style="color: #A1A1A1; margin: 0;">As respostas aparecerão aqui quando pessoas enviarem o formulário</p>
                    </div>
                </div>
            </div>
        `;
        }
        
        document.body.appendChild(modal);
        
        // Armazenar modal e respostas globalmente para uso nas funções
        modal._allResponses = [];
        modal._currentFilter = 'all';
        
        // Fechar modal
        modal.querySelector('.close-responses-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Navegação entre tabs
        modal.querySelectorAll('.response-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.response-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.color = '#A1A1A1';
                    t.style.borderBottomColor = 'transparent';
                });
                tab.classList.add('active');
                tab.style.color = '#FFC700';
                tab.style.borderBottomColor = '#FFC700';
                modal._currentFilter = tab.dataset.tab;
                
                if (modal._isGuestListMode) {
                    filterAndRenderGuestList(modal, modal._allResponses || []);
                } else {
                    filterAndRenderResponses(modal);
                }
            });
        });
        
        // Busca em tempo real com múltiplos critérios (Melhoria 6)
        const searchInput = modal.querySelector('#responses-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if (modal._isGuestListMode) {
                    filterAndRenderGuestList(modal, modal._allResponses || []);
                } else {
                    filterAndRenderResponses(modal);
                }
            });
            
            // Acessibilidade - Navegação por teclado (Melhoria 17)
            searchInput.setAttribute('aria-label', 'Buscar respostas');
            searchInput.setAttribute('role', 'searchbox');
        }
        
        // Toggle Filtros Avançados (Melhoria 10)
        const advancedFiltersBtn = modal.querySelector('#advanced-filters-btn');
        const advancedFiltersPanel = modal.querySelector('#advanced-filters-panel');
        if (advancedFiltersBtn && advancedFiltersPanel) {
            advancedFiltersBtn.addEventListener('click', () => {
                const isVisible = advancedFiltersPanel.style.display !== 'none';
                advancedFiltersPanel.style.display = isVisible ? 'none' : 'block';
                advancedFiltersBtn.style.background = isVisible ? 'rgba(255,255,255,0.05)' : 'rgba(255,199,0,0.2)';
                advancedFiltersBtn.style.borderColor = isVisible ? 'rgba(255,255,255,0.1)' : '#FFC700';
            });
            
            // Limpar filtros
            const clearFiltersBtn = modal.querySelector('#clear-filters-btn');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', () => {
                    modal.querySelector('#filter-by-field').value = '';
                    modal.querySelector('#filter-date-from').value = '';
                    modal.querySelector('#filter-date-to').value = '';
                    modal.querySelector('#filter-status').value = '';
                    if (modal._isGuestListMode) {
                        filterAndRenderGuestList(modal, modal._allResponses || []);
                    } else {
                        filterAndRenderResponses(modal);
                    }
                });
            }
            
            // Aplicar filtros avançados
            ['filter-by-field', 'filter-date-from', 'filter-date-to', 'filter-status'].forEach(id => {
                const filterEl = modal.querySelector(`#${id}`);
                if (filterEl) {
                    filterEl.addEventListener('change', () => {
                        if (modal._isGuestListMode) {
                            filterAndRenderGuestList(modal, modal._allResponses || []);
                        } else {
                            filterAndRenderResponses(modal);
                        }
                    });
                }
            });
        }
        
        // Seleção múltipla e exportação em lote (Melhoria 8)
        let selectedResponses = new Set();
        const selectAllBtn = modal.querySelector('#select-all-btn');
        const exportSelectedBtn = modal.querySelector('#export-selected-btn');
        const selectedCountEl = modal.querySelector('#selected-count');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                const allCheckboxes = modal.querySelectorAll('.response-checkbox');
                const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
                
                allCheckboxes.forEach(cb => {
                    cb.checked = !allChecked;
                    if (cb.checked) {
                        selectedResponses.add(cb.dataset.responseId);
                    } else {
                        selectedResponses.delete(cb.dataset.responseId);
                    }
                });
                
                updateSelectedCount();
            });
        }
        
        function updateSelectedCount() {
            const count = selectedResponses.size;
            if (selectedCountEl) {
                selectedCountEl.style.display = count > 0 ? 'inline' : 'none';
                selectedCountEl.querySelector('#selected-count-num').textContent = count;
            }
            if (exportSelectedBtn) {
                exportSelectedBtn.style.display = count > 0 ? 'flex' : 'none';
            }
            if (selectAllBtn) {
                selectAllBtn.innerHTML = count > 0 
                    ? `<i class="fas fa-check-square"></i> ${count} Selecionados`
                    : `<i class="fas fa-check-square"></i> Selecionar`;
            }
        }
        
        if (exportSelectedBtn) {
            exportSelectedBtn.addEventListener('click', () => {
                if (selectedResponses.size === 0) {
                    alert('Selecione pelo menos uma resposta para exportar.');
                    return;
                }
                
                const selected = (modal._allResponses || []).filter(r => 
                    selectedResponses.has(String(r.id))
                );
                
                if (modal._isGuestListMode) {
                    exportGuestListToCSV(selected);
                } else {
                    // Perguntar formato
                    const format = confirm('Exportar como CSV? (Cancelar = Excel)') ? 'csv' : 'excel';
                    if (format === 'csv') {
                        exportResponsesToCSV(selected, modal._formFields || []);
                    } else {
                        exportResponsesToExcel(selected, modal._formFields || []);
                    }
                }
                
                // Limpar seleção
                selectedResponses.clear();
                updateSelectedCount();
                modal.querySelectorAll('.response-checkbox').forEach(cb => cb.checked = false);
            });
        }
        
        // Exportar CSV
        const exportCsvBtn = modal.querySelector('#export-csv-btn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => {
                if (modal._isGuestListMode) {
                    exportGuestListToCSV(modal._allResponses || []);
                } else {
                    exportResponsesToCSV(modal._allResponses || [], modal._formFields || []);
                }
            });
        }
        
        // Exportar Excel (apenas para formulários)
        const exportExcelBtn = modal.querySelector('#export-excel-btn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => {
                if (!modal._isGuestListMode) {
                    exportResponsesToExcel(modal._allResponses || [], modal._formFields || []);
                }
            });
        }
        
        // Marcar modo do modal
        modal._isGuestListMode = isGuestListMode;
        modal._selectedGuests = new Set();
        modal._selectedResponses = new Set();
        modal._currentPage = 1;
        
        // Cache de dados (Melhoria 12)
        const cacheKey = `form_responses_${currentItemId}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                const cacheAge = Date.now() - (parsed.timestamp || 0);
                if (cacheAge < 300000) { // 5 minutos
                    console.log('o. Usando dados do cache');
                    modal._allResponses = parsed.data || [];
                    if (modal._allResponses.length > 0) {
                        if (isGuestListMode) {
                            filterAndRenderGuestList(modal, modal._allResponses);
                        } else {
                            filterAndRenderResponses(modal);
                        }
                    }
                }
            } catch (e) {
                console.warn('Erro ao usar cache:', e);
            }
        }
        
        // Carregar dados baseado no modo
        loadModalData(modal, isGuestListMode);
    }
    
    // Carregar dados do modal baseado no modo
    async function loadModalData(modal, isGuestListMode) {
        try {
            if (isGuestListMode) {
                // Carregar convidados da lista
                const guestsRes = await fetch(`${API_URL}/api/guest-lists/${currentItemId}/guests?mode=checkin`, {
                    method: 'GET',
                    headers: getHeaders()
                });
                
                if (!guestsRes.ok) {
                    const errorData = await guestsRes.json().catch(() => ({ message: 'Erro ao carregar convidados' }));
                    const errorMsg = errorData.message || `Erro ${guestsRes.status}: Não foi possível carregar os convidados`;
                    console.error('O Erro ao carregar convidados:', {
                        status: guestsRes.status,
                        message: errorMsg,
                        itemId: currentItemId,
                        url: `${API_URL}/api/guest-lists/${currentItemId}/guests`
                    });
                    throw new Error(errorMsg);
                }
                const guestsData = await guestsRes.json();
                
                const guests = Array.isArray(guestsData) ? guestsData : (guestsData.guests || []);
                console.log('Y"S Convidados carregados:', guests.length);
                modal._allResponses = guests;
                
                // Atualizar estatísticas
                const arrived = guests.filter(g => g.status === 'checked_in' || g.status === 'confirmed').length;
                const notArrived = guests.filter(g => g.status === 'registered').length;
                const total = guests.length;
                
                const statsArrivedEl = document.getElementById('stats-arrived');
                const statsNotArrivedEl = document.getElementById('stats-not-arrived');
                const statsTotalGuestsEl = document.getElementById('stats-total-guests');
                const tabCountArrivedEl = document.getElementById('tab-count-arrived');
                const tabCountNotArrivedEl = document.getElementById('tab-count-not-arrived');
                
                if (statsArrivedEl) statsArrivedEl.textContent = arrived;
                if (statsNotArrivedEl) statsNotArrivedEl.textContent = notArrived;
                if (statsTotalGuestsEl) statsTotalGuestsEl.textContent = total;
                if (tabCountArrivedEl) tabCountArrivedEl.textContent = arrived;
                if (tabCountNotArrivedEl) tabCountNotArrivedEl.textContent = notArrived;
                
                document.getElementById('responses-loading').style.display = 'none';
                
                if (guests.length === 0) {
                    document.getElementById('responses-empty').style.display = 'block';
                } else {
                    document.getElementById('responses-content').style.display = 'block';
                    filterAndRenderGuestList(modal, guests);
                }
            } else {
                // Carregar respostas de formulário normal
                // IMPORTANTE: Adicionar pequeno delay antes para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 200)); // Delay de 200ms
                
                // Fazer requisições sequenciais em vez de Promise.all para evitar rate limiting
                // (Promise.all fazia 2 requisições simultâneas, causando rate limit)
                const responsesRes = await fetch(`${API_URL}/api/profile/items/digital_form/${currentItemId}/responses?mode=lead`, {
                    method: 'GET',
                    headers: getHeaders()
                });
                
                // Pequeno delay entre requisições
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const formRes = await fetch(`${API_URL}/api/profile`, {
                    method: 'GET',
                    headers: getHeaders()
                });
                
                if (!responsesRes.ok) throw new Error('Erro ao carregar respostas');
                if (!formRes.ok) throw new Error('Erro ao carregar formulário');
                
                const responsesData = await responsesRes.json();
                const formData = await formRes.json();
                
                // Garantir que responses seja um array
                let responses = [];
                if (Array.isArray(responsesData)) {
                    responses = responsesData;
                } else if (responsesData.responses && Array.isArray(responsesData.responses)) {
                    responses = responsesData.responses;
                } else if (responsesData.data && Array.isArray(responsesData.data)) {
                    responses = responsesData.data;
                }
                
                console.log('Y"S Respostas carregadas:', responses.length);
                modal._allResponses = responses;
                
                // Encontrar dados do formulário atual
                const currentForm = formData.items?.find(item => String(item.id) === String(currentItemId));
                modal._formFields = currentForm?.digital_form_data?.form_fields || formFields || [];
                
                // Armazenar formFields no container para uso na paginação
                const responsesContainer = modal.querySelector('#responses-list');
                if (responsesContainer) {
                    responsesContainer._formFields = modal._formFields;
                }
                
                document.getElementById('responses-loading').style.display = 'none';
                
                if (responses.length === 0) {
                    document.getElementById('responses-empty').style.display = 'block';
                } else {
                    document.getElementById('responses-content').style.display = 'block';
                    updateResponseStats(modal, responses);
                    filterAndRenderResponses(modal);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            const loadingEl = document.getElementById('responses-loading');
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div style="color: #ff4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 16px;"></i>
                        <div>Erro ao carregar: ${error.message}</div>
                    </div>
                `;
            }
        }
    }
    
    // Filtrar e renderizar lista de convidados
    function filterAndRenderGuestList(modal, guests) {
        const filter = modal._currentFilter || 'arrived';
        const searchTerm = modal.querySelector('#responses-search')?.value.toLowerCase() || '';
        
        let filtered = [...guests];
        
        // Filtrar por status
        if (filter === 'arrived') {
            filtered = filtered.filter(g => g.status === 'checked_in' || g.status === 'confirmed');
        } else if (filter === 'not-arrived') {
            filtered = filtered.filter(g => g.status === 'registered');
        }
        
        // Filtrar por busca
        if (searchTerm) {
            filtered = filtered.filter(g => {
                const name = (g.name || '').toLowerCase();
                const whatsapp = (g.whatsapp || '').toLowerCase();
                const email = (g.email || '').toLowerCase();
                const document = (g.document || '').toLowerCase();
                return name.includes(searchTerm) || 
                       whatsapp.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       document.includes(searchTerm);
            });
        }
        
        renderGuestList(filtered, modal.querySelector('#responses-list'));
    }
    
    // Renderizar lista de convidados
    function renderGuestList(guests, container) {
        if (!container) return;
        
        if (guests.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #A1A1A1;">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Nenhum convidado encontrado</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = guests.map((guest, index) => {
            const checkedInTime = guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString('pt-BR') : '';
            const statusClass = (guest.status === 'checked_in' || guest.status === 'confirmed') ? 'success' : 'warning';
            const statusText = (guest.status === 'checked_in' || guest.status === 'confirmed') ? 'Chegou' : 'Não Chegou';
            const statusIcon = (guest.status === 'checked_in' || guest.status === 'confirmed') ? 'check-circle' : 'clock';
            
            return `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 16px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.05)'; this.style.borderColor='rgba(255,199,0,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.1)';">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <h4 style="margin: 0; color: #ECECEC; font-size: 18px; font-weight: 700;">${guest.name || 'Sem nome'}</h4>
                                <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${statusClass === 'success' ? 'rgba(67, 233, 123, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${statusClass === 'success' ? '#43e97b' : '#f59e0b'};">
                                    <i class="fas fa-${statusIcon}"></i> ${statusText}
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; color: #A1A1A1; font-size: 14px;">
                                ${guest.whatsapp ? `<div><i class="fab fa-whatsapp"></i> ${guest.whatsapp}</div>` : ''}
                                ${guest.email ? `<div><i class="fas fa-envelope"></i> ${guest.email}</div>` : ''}
                                ${guest.document ? `<div><i class="fas fa-id-card"></i> ${guest.document}</div>` : ''}
                                ${checkedInTime ? `<div><i class="fas fa-clock"></i> Chegou: ${checkedInTime}</div>` : ''}
                            </div>
                        </div>
                        ${(guest.status !== 'checked_in' && guest.status !== 'confirmed') ? `
                        <button onclick="checkInGuest(${guest.id}, '${(guest.name || '').replace(/'/g, "\\'")}')" style="padding: 10px 20px; background: linear-gradient(135deg, #43e97b, #38f9d7); border: none; border-radius: 8px; color: #000; font-weight: 600; cursor: pointer; white-space: nowrap;">
                            <i class="fas fa-check"></i> Confirmar Chegada
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Função para confirmar chegada de convidado
    async function checkInGuest(guestId, guestName) {
        if (!confirm(`Confirmar chegada de ${guestName}?`)) return;
        
        try {
            const response = await fetch(`${API_URL}/api/guest-lists/${currentItemId}/guests/${guestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getHeaders()
                },
                body: JSON.stringify({
                    status: 'checked_in',
                    checked_in_at: new Date().toISOString()
                })
            });
            
            if (!response.ok) throw new Error('Erro ao confirmar chegada');
            
            // Recarregar modal
            const modal = document.querySelector('.responses-modal');
            if (modal && modal._isGuestListMode) {
                await loadModalData(modal, true);
            }
        } catch (error) {
            console.error('Erro ao confirmar chegada:', error);
            alert('Erro ao confirmar chegada: ' + error.message);
        }
    }
    
    // Exportar lista de convidados para CSV
    function exportGuestListToCSV(guests) {
        const headers = ['Nome', 'WhatsApp', 'Email', 'CPF/CNPJ', 'Status', 'Data de Chegada'];
        const rows = guests.map(g => [
            g.name || '',
            g.whatsapp || '',
            g.email || '',
            g.document || '',
            g.status === 'checked_in' || g.status === 'confirmed' ? 'Chegou' : 'Não Chegou',
            g.checked_in_at ? new Date(g.checked_in_at).toLocaleString('pt-BR') : ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lista_convidados_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
    
    // Atualizar estatísticas de respostas (Melhoria 9: Estatísticas Avançadas com Chart.js)
    function updateResponseStats(modal, responses) {
        const total = responses.length;
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const todayResponses = responses.filter(r => {
            const date = new Date(r.submitted_at).toISOString().split('T')[0];
            return date === today;
        });
        
        const weekResponses = responses.filter(r => {
            const date = new Date(r.submitted_at);
            return date >= weekAgo;
        });
        
        const monthResponses = responses.filter(r => {
            const date = new Date(r.submitted_at);
            return date >= monthAgo;
        });
        
        const withEmail = responses.filter(r => r.responder_email && r.responder_email.trim()).length;
        const withPhone = responses.filter(r => r.responder_phone && r.responder_phone.trim()).length;
        const uniqueResponders = new Set(responses.map(r => r.responder_email || r.responder_phone || r.id)).size;
        
        // Atualizar elementos do DOM
        const statsTotalEl = modal.querySelector('#stats-total-responses');
        const statsRespondersEl = modal.querySelector('#stats-total-responders');
        const statsWithEmailEl = modal.querySelector('#stats-with-email');
        const statsWithPhoneEl = modal.querySelector('#stats-with-phone');
        const tabCountAllEl = modal.querySelector('#tab-count-all');
        const tabCountTodayEl = modal.querySelector('#tab-count-today');
        const tabCountWeekEl = modal.querySelector('#tab-count-week');
        const tabCountMonthEl = modal.querySelector('#tab-count-month');
        
        if (statsTotalEl) statsTotalEl.textContent = total;
        if (statsRespondersEl) statsRespondersEl.textContent = uniqueResponders;
        if (statsWithEmailEl) statsWithEmailEl.textContent = withEmail;
        if (statsWithPhoneEl) statsWithPhoneEl.textContent = withPhone;
        if (tabCountAllEl) tabCountAllEl.textContent = total;
        if (tabCountTodayEl) tabCountTodayEl.textContent = todayResponses.length;
        if (tabCountWeekEl) tabCountWeekEl.textContent = weekResponses.length;
        if (tabCountMonthEl) tabCountMonthEl.textContent = monthResponses.length;
        
        // Melhoria 9: Estatísticas Avançadas com Chart.js
        if (typeof Chart !== 'undefined' && total > 0) {
            createAdvancedCharts(modal, responses);
        }
    }
    
    // Criar gráficos avançados com Chart.js (Melhoria 9)
    function createAdvancedCharts(modal, responses) {
        // Remover gráficos antigos se existirem
        const existingChartsContainer = modal.querySelector('#advanced-charts-container');
        if (existingChartsContainer) {
            existingChartsContainer.remove();
        }
        
        // Criar container de gráficos
        const chartsContainer = document.createElement('div');
        chartsContainer.id = 'advanced-charts-container';
        chartsContainer.style.cssText = 'margin-top: 32px; display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;';
        
        // Gráfico 1: Respostas por dia (últimos 30 dias)
        const dailyChartContainer = document.createElement('div');
        dailyChartContainer.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px;';
        dailyChartContainer.innerHTML = '<h4 style="color: #ECECEC; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Respostas por Dia (ltimos 30 dias)</h4><canvas id="daily-responses-chart"></canvas>';
        chartsContainer.appendChild(dailyChartContainer);
        
        // Calcular dados diários
        const dailyData = {};
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyData[dateStr] = 0;
        }
        
        responses.forEach(r => {
            const date = new Date(r.submitted_at).toISOString().split('T')[0];
            if (dailyData.hasOwnProperty(date)) {
                dailyData[date]++;
            }
        });
        
        const dailyLabels = Object.keys(dailyData).map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        });
        const dailyValues = Object.values(dailyData);
        
        setTimeout(() => {
            const dailyCtx = document.getElementById('daily-responses-chart');
            if (dailyCtx) {
                new Chart(dailyCtx, {
                    type: 'line',
                    data: {
                        labels: dailyLabels,
                        datasets: [{
                            label: 'Respostas',
                            data: dailyValues,
                            borderColor: '#FFC700',
                            backgroundColor: 'rgba(255, 199, 0, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { display: false },
                            tooltip: { mode: 'index', intersect: false }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { color: '#A1A1A1' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            x: { ticks: { color: '#A1A1A1' }, grid: { display: false } }
                        }
                    }
                });
            }
        }, 100);
        
        // Gráfico 2: Distribuição por hora do dia
        const hourlyChartContainer = document.createElement('div');
        hourlyChartContainer.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px;';
        hourlyChartContainer.innerHTML = '<h4 style="color: #ECECEC; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Respostas por Hora do Dia</h4><canvas id="hourly-responses-chart"></canvas>';
        chartsContainer.appendChild(hourlyChartContainer);
        
        const hourlyData = Array(24).fill(0);
        responses.forEach(r => {
            const hour = new Date(r.submitted_at).getHours();
            hourlyData[hour]++;
        });
        
        setTimeout(() => {
            const hourlyCtx = document.getElementById('hourly-responses-chart');
            if (hourlyCtx) {
                new Chart(hourlyCtx, {
                    type: 'bar',
                    data: {
                        labels: Array.from({length: 24}, (_, i) => `${i}h`),
                        datasets: [{
                            label: 'Respostas',
                            data: hourlyData,
                            backgroundColor: 'rgba(74, 144, 226, 0.6)',
                            borderColor: '#4A90E2',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { color: '#A1A1A1' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            x: { ticks: { color: '#A1A1A1' }, grid: { display: false } }
                        }
                    }
                });
            }
        }, 200);
        
        // Inserir gráficos antes da lista de respostas
        const responsesContent = modal.querySelector('#responses-content');
        if (responsesContent) {
            const statsSection = responsesContent.querySelector('.stats-section') || responsesContent.firstElementChild;
            if (statsSection && statsSection.nextSibling) {
                responsesContent.insertBefore(chartsContainer, statsSection.nextSibling);
            } else {
                responsesContent.appendChild(chartsContainer);
            }
        }
    }
    
    // Filtrar e renderizar lista de convidados
    function filterAndRenderGuestList(modal, guests) {
        const filter = modal._currentFilter || 'arrived';
        const searchTerm = modal.querySelector('#responses-search')?.value.toLowerCase() || '';
        
        let filtered = [...guests];
        
        // Filtrar por status
        if (filter === 'arrived') {
            filtered = filtered.filter(g => g.status === 'checked_in' || g.status === 'confirmed');
        } else if (filter === 'not-arrived') {
            filtered = filtered.filter(g => g.status === 'registered');
        }
        
        // Filtrar por busca
        if (searchTerm) {
            filtered = filtered.filter(g => {
                const name = (g.name || '').toLowerCase();
                const whatsapp = (g.whatsapp || '').toLowerCase();
                const email = (g.email || '').toLowerCase();
                const document = (g.document || '').toLowerCase();
                return name.includes(searchTerm) || 
                       whatsapp.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       document.includes(searchTerm);
            });
        }
        
        renderGuestList(filtered, modal.querySelector('#responses-list'));
    }
    
    // Renderizar lista de convidados
    function renderGuestList(guests, container) {
        if (!container) return;
        
        if (guests.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #A1A1A1;">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Nenhum convidado encontrado</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = guests.map((guest, index) => {
            const checkedInTime = guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString('pt-BR') : '';
            const statusClass = (guest.status === 'checked_in' || guest.status === 'confirmed') ? 'success' : 'warning';
            const statusText = (guest.status === 'checked_in' || guest.status === 'confirmed') ? 'Chegou' : 'Não Chegou';
            const statusIcon = (guest.status === 'checked_in' || guest.status === 'confirmed') ? 'check-circle' : 'clock';
            
            return `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 16px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.05)'; this.style.borderColor='rgba(255,199,0,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.1)';">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <h4 style="margin: 0; color: #ECECEC; font-size: 18px; font-weight: 700;">${guest.name || 'Sem nome'}</h4>
                                <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${statusClass === 'success' ? 'rgba(67, 233, 123, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${statusClass === 'success' ? '#43e97b' : '#f59e0b'};">
                                    <i class="fas fa-${statusIcon}"></i> ${statusText}
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; color: #A1A1A1; font-size: 14px;">
                                ${guest.whatsapp ? `<div><i class="fab fa-whatsapp"></i> ${guest.whatsapp}</div>` : ''}
                                ${guest.email ? `<div><i class="fas fa-envelope"></i> ${guest.email}</div>` : ''}
                                ${guest.document ? `<div><i class="fas fa-id-card"></i> ${guest.document}</div>` : ''}
                                ${checkedInTime ? `<div><i class="fas fa-clock"></i> Chegou: ${checkedInTime}</div>` : ''}
                            </div>
                        </div>
                        ${(guest.status !== 'checked_in' && guest.status !== 'confirmed') ? `
                        <button onclick="checkInGuest(${guest.id}, '${(guest.name || '').replace(/'/g, "\\'")}')" style="padding: 10px 20px; background: linear-gradient(135deg, #43e97b, #38f9d7); border: none; border-radius: 8px; color: #000; font-weight: 600; cursor: pointer; white-space: nowrap;">
                            <i class="fas fa-check"></i> Confirmar Chegada
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Função para confirmar chegada de convidado (global para ser chamada do HTML)
    window.checkInGuest = async function(guestId, guestName) {
        if (!confirm(`Confirmar chegada de ${guestName}?`)) return;
        
        try {
            const response = await fetch(`${API_URL}/api/guest-lists/${currentItemId}/guests/${guestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getHeaders()
                },
                body: JSON.stringify({
                    status: 'checked_in',
                    checked_in_at: new Date().toISOString()
                })
            });
            
            if (!response.ok) throw new Error('Erro ao confirmar chegada');
            
            // Recarregar modal
            const modal = document.querySelector('.responses-modal');
            if (modal && modal._isGuestListMode) {
                await loadModalData(modal, true);
            }
        } catch (error) {
            console.error('Erro ao confirmar chegada:', error);
            alert('Erro ao confirmar chegada: ' + error.message);
        }
    };
    
    // Exportar lista de convidados para CSV
    function exportGuestListToCSV(guests) {
        const headers = ['Nome', 'WhatsApp', 'Email', 'CPF/CNPJ', 'Status', 'Data de Chegada'];
        const rows = guests.map(g => [
            g.name || '',
            g.whatsapp || '',
            g.email || '',
            g.document || '',
            g.status === 'checked_in' || g.status === 'confirmed' ? 'Chegou' : 'Não Chegou',
            g.checked_in_at ? new Date(g.checked_in_at).toLocaleString('pt-BR') : ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lista_convidados_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
    
    // Função para filtrar e renderizar respostas (Melhoria 6, 10)
    function filterAndRenderResponses(modal) {
        const filter = modal._currentFilter || 'all';
        const searchTerm = modal.querySelector('#responses-search')?.value.toLowerCase() || '';
        
        // Filtros avançados (Melhoria 10)
        const filterByField = modal.querySelector('#filter-by-field')?.value || '';
        const filterDateFrom = modal.querySelector('#filter-date-from')?.value || '';
        const filterDateTo = modal.querySelector('#filter-date-to')?.value || '';
        const filterStatus = modal.querySelector('#filter-status')?.value || '';
        
        let filtered = [...modal._allResponses];
        
        // Aplicar filtro de data (tab)
        if (filter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(response => {
                const date = new Date(response.submitted_at);
                switch (filter) {
                    case 'today':
                        return date.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return date >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return date >= monthAgo;
                    default:
                        return true;
                }
            });
        }
        
        // Busca múltiplos critérios (Melhoria 6)
        if (searchTerm) {
            filtered = filtered.filter(response => {
                const name = (response.responder_name || '').toLowerCase();
                const email = (response.responder_email || '').toLowerCase();
                const phone = (response.responder_phone || '').toLowerCase();
                const responseText = JSON.stringify(response.response_data || {}).toLowerCase();
                return name.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       phone.includes(searchTerm) || 
                       responseText.includes(searchTerm);
            });
        }
        
        // Filtro por campo específico (Melhoria 10)
        if (filterByField && modal._formFields) {
            filtered = filtered.filter(response => {
                const fieldValue = response.response_data?.[filterByField];
                return fieldValue && String(fieldValue).toLowerCase().includes(searchTerm.toLowerCase());
            });
        }
        
        // Filtro por data (range) (Melhoria 10)
        if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(response => {
                const date = new Date(response.submitted_at);
                date.setHours(0, 0, 0, 0);
                return date >= fromDate;
            });
        }
        
        if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(response => {
                const date = new Date(response.submitted_at);
                return date <= toDate;
            });
        }
        
        // Filtro por status (Melhoria 10)
        if (filterStatus) {
            if (filterStatus === 'with_email') {
                filtered = filtered.filter(r => r.responder_email && r.responder_email.trim() !== '');
            } else if (filterStatus === 'with_phone') {
                filtered = filtered.filter(r => r.responder_phone && r.responder_phone.trim() !== '');
            } else if (filterStatus === 'recent') {
                filtered = filtered.sort((a, b) => {
                    const dateA = new Date(a.submitted_at || 0);
                    const dateB = new Date(b.submitted_at || 0);
                    return dateB - dateA;
                });
            }
        }
        
        // Renderizar com paginação virtual (Melhoria 11)
        const container = modal.querySelector('#responses-list');
        if (container) {
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #A1A1A1;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                        <div>Nenhuma resposta encontrada</div>
                    </div>
                `;
            } else {
                // Paginação virtual (Melhoria 11) - renderizar apenas primeiros 50 para performance
                const itemsPerPage = 50;
                const currentPage = modal._currentPage || 1;
                const startIdx = (currentPage - 1) * itemsPerPage;
                const endIdx = startIdx + itemsPerPage;
                const pageResponses = filtered.slice(startIdx, endIdx);
                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                
                renderResponses(pageResponses, container, modal._formFields || [], modal, filtered.length, currentPage, totalPages);
            }
        }
    }
    
    // Extrair nome da resposta (tenta vários campos)
    function extractResponderName(response) {
        // Primeiro tenta responder_name
        if (response.responder_name && response.responder_name.trim() && response.responder_name !== 'Anônimo') {
            return response.responder_name.trim();
        }
        
        // Tenta campos comuns no response_data
        const responseData = response.response_data || {};
        const nameFields = ['Nome', 'nome', 'Nome completo', 'nome completo', 'Nome Completo', 'Name', 'name', 'Nome do visitante'];
        
        for (const field of nameFields) {
            if (responseData[field] && String(responseData[field]).trim()) {
                return String(responseData[field]).trim();
            }
        }
        
        // Tenta primeiro campo do response_data que tenha valor
        const firstField = Object.entries(responseData).find(([key, value]) => value && String(value).trim());
        if (firstField && firstField[1]) {
            const value = String(firstField[1]).trim();
            // Se parece com um nome (não muito longo e tem espaços)
            if (value.length < 100 && value.includes(' ')) {
                return value;
            }
        }
        
        // Fallback: email ou telefone
        if (response.responder_email) {
            return response.responder_email.split('@')[0];
        }
        if (response.responder_phone) {
            return response.responder_phone;
        }
        
        return 'Sem nome';
    }
    
    // Renderizar lista de respostas - VERSfO LIMPA E ORGANIZADA
    function renderResponses(responses, container, formFields) {
        if (!container) return;
        
        const currentPage = container._currentPage || 1;
        const itemsPerPage = 10;
        const totalPages = Math.ceil(responses.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedResponses = responses.slice(startIndex, endIndex);
        
        container.innerHTML = `
            <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                ${paginatedResponses.map((response, idx) => {
                    const globalIndex = startIndex + idx;
                    const responseData = response.response_data || {};
                    const submittedDate = new Date(response.submitted_at);
                    const formattedDate = submittedDate.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const responderName = extractResponderName(response);
                    const hasContact = response.responder_email || response.responder_phone;
                    
                    return `
                        <div class="response-item" data-response-id="${response.id || globalIndex}" style="background: linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.3s; cursor: pointer;" 
                             onmouseover="this.style.borderColor='rgba(255,199,0,0.4)'; this.style.transform='translateX(4px)';" 
                             onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.transform='translateX(0)';"
                             onclick="openResponseDetail(${JSON.stringify(response).replace(/"/g, '&quot;')}, ${JSON.stringify(formFields || []).replace(/"/g, '&quot;')})">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                                    <div style="background: linear-gradient(135deg, #FFC700 0%, #FFA500 100%); color: #000; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0;">
                                        ${globalIndex + 1}
                                    </div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 700; font-size: 16px; color: #ECECEC; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            ${responderName}
                                        </div>
                                        <div style="font-size: 13px; color: #A1A1A1; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-calendar-alt"></i>
                                            <span>${formattedDate}</span>
                                            ${hasContact ? '<span style="margin-left: 8px; padding: 2px 8px; background: rgba(255,199,0,0.2); border-radius: 4px; font-size: 11px;">Tem contato</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    ${response.responder_phone ? `
                                        <a href="https://wa.me/${response.responder_phone.replace(/\D/g, '')}" target="_blank" 
                                           onclick="event.stopPropagation();"
                                           style="background: #25D366; color: white; padding: 8px 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: all 0.3s;" 
                                           onmouseover="this.style.transform='scale(1.1)';" 
                                           onmouseout="this.style.transform='scale(1)';">
                                            <i class="fab fa-whatsapp"></i>
                                        </a>
                                    ` : ''}
                                    <button onclick="event.stopPropagation(); openResponseDetail(${JSON.stringify(response).replace(/"/g, '&quot;')}, ${JSON.stringify(formFields || []).replace(/"/g, '&quot;')})" 
                                            style="background: linear-gradient(135deg, #FFC700, #FFA500); color: #000; padding: 8px 16px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s;"
                                            onmouseover="this.style.transform='scale(1.05)';" 
                                            onmouseout="this.style.transform='scale(1)';">
                                        <i class="fas fa-eye"></i> Ver Completo
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            ${totalPages > 1 ? `
                <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <button onclick="paginateResponses(${container.id}, ${currentPage - 1}, ${totalPages})" 
                            ${currentPage === 1 ? 'disabled' : ''}
                            style="padding: 10px 16px; background: ${currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FFC700, #FFA500)'}; color: ${currentPage === 1 ? '#666' : '#000'}; border: none; border-radius: 8px; font-weight: 600; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'};">
                        <i class="fas fa-chevron-left"></i> Anterior
                    </button>
                    <span style="color: #ECECEC; font-weight: 600;">
                        Página ${currentPage} de ${totalPages}
                    </span>
                    <button onclick="paginateResponses(${container.id}, ${currentPage + 1}, ${totalPages})" 
                            ${currentPage === totalPages ? 'disabled' : ''}
                            style="padding: 10px 16px; background: ${currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FFC700, #FFA500)'}; color: ${currentPage === totalPages ? '#666' : '#000'}; border: none; border-radius: 8px; font-weight: 600; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'};">
                        Próxima <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            ` : ''}
        `;
        
        // Armazenar dados para paginação
        container._currentPage = currentPage;
        container._totalPages = totalPages;
        container._allResponses = responses;
        container._formFields = formFields;
    }
    
    // Função global para paginação (precisa estar no escopo global)
    window.paginateResponses = function(containerId, page, totalPages) {
        if (page < 1 || page > totalPages) return;
        const container = document.getElementById(containerId);
        if (!container) return;
        const responses = container._allResponses || [];
        const formFields = container._formFields || [];
        container._currentPage = page;
        renderResponses(responses, container, formFields);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    
    // Função para exportar resposta individual (PDF, CSV, Excel)
    function exportSingleResponse(response, formFields, format) {
        const responseData = response.response_data || {};
        const responderName = extractResponderName(response);
        const date = new Date(response.submitted_at).toLocaleString('pt-BR');
        
        if (format === 'pdf') {
            // Garantir que formFields seja válido
            if (!formFields || !Array.isArray(formFields) || formFields.length === 0) {
                // Tentar extrair do response_data se formFields estiver vazio
                const responseDataKeys = Object.keys(responseData || {});
                formFields = responseDataKeys.map((key, index) => ({
                    id: key,
                    label: key,
                    type: 'short_text'
                }));
            }
            
            // Criar mapa de valores já usados para evitar duplicatas
            const usedKeys = new Set();
            const fieldEntries = [];
            
            // Mapear campos do formulário com suas respostas
            formFields.forEach((field, fieldIndex) => {
                const label = field.label || field.Label || `Campo ${fieldIndex + 1}`;
                if (!label) return;
                
                // Buscar valor - usar a mesma lógica do openResponseDetail
                let value = null;
                let valueKey = null;
                
                // 1. Tentar buscar pelo ID do campo
                if (field.id && responseData[field.id]) {
                    value = responseData[field.id];
                    valueKey = field.id;
                } else {
                    // 2. Tentar buscar pela label exata
                    const labelLower = label.toLowerCase().trim();
                    const matchingKey = Object.keys(responseData).find(key => {
                        const keyLower = key.toLowerCase().trim();
                        return keyLower === labelLower || 
                               keyLower.includes(labelLower) || 
                               labelLower.includes(keyLower);
                    });
                    
                    if (matchingKey && !usedKeys.has(matchingKey)) {
                        value = responseData[matchingKey];
                        valueKey = matchingKey;
                    } else {
                        // 3. Tentar buscar por índice sequencial
                        const sortedKeys = Object.keys(responseData).sort();
                        if (sortedKeys.length > fieldIndex && sortedKeys[fieldIndex] && !usedKeys.has(sortedKeys[fieldIndex])) {
                            value = responseData[sortedKeys[fieldIndex]];
                            valueKey = sortedKeys[fieldIndex];
                        } else {
                            // 4. ltimo recurso: pegar qualquer valor não usado
                            const unusedEntry = Object.entries(responseData).find(([key]) => !usedKeys.has(key));
                            if (unusedEntry) {
                                value = unusedEntry[1];
                                valueKey = unusedEntry[0];
                            }
                        }
                    }
                }
                
                if (value !== null && value !== undefined && value !== '' && 
                    !(Array.isArray(value) && value.length === 0) && 
                    String(value).trim() !== '') {
                    usedKeys.add(valueKey);
                    fieldEntries.push({ label, value, valueKey });
                }
            });
            
            // Adicionar campos não mapeados - tentar encontrar label do campo
            Object.entries(responseData || {}).forEach(([key, value]) => {
                if (!usedKeys.has(key) && value !== null && value !== undefined && value !== '' &&
                    !(Array.isArray(value) && value.length === 0) && 
                    String(value).trim() !== '') {
                    
                    // Tentar encontrar label do campo baseado na chave
                    let label = key;
                    const field = formFields.find(f => {
                        if (f.id === key) return true;
                        const labelLower = (f.label || '').toLowerCase().trim();
                        const keyLower = key.toLowerCase().trim();
                        return labelLower === keyLower || keyLower.includes(labelLower) || labelLower.includes(keyLower);
                    });
                    
                    if (field && field.label) {
                        label = field.label;
                    } else {
                        // Tentar formatar a chave como label legível
                        label = key.replace(/field_/g, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                    
                    fieldEntries.push({ 
                        label: label, 
                        value: value, 
                        valueKey: key 
                    });
                }
            });
            
            // Criar HTML para PDF
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Resposta - ${responderName}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 40px; 
                            color: #000; 
                            line-height: 1.6;
                        }
                        h1 { 
                            color: #000; 
                            border-bottom: 3px solid #000; 
                            padding-bottom: 10px; 
                            margin-bottom: 20px;
                            font-weight: 700;
                        }
                        h2 {
                            color: #000;
                            margin-top: 30px;
                            margin-bottom: 20px;
                            font-size: 20px;
                            font-weight: 700;
                        }
                        .info { 
                            margin: 20px 0; 
                            padding: 20px; 
                            background: #f5f5f5; 
                            border-radius: 8px; 
                            border-left: 4px solid #000;
                        }
                        .info strong {
                            color: #000;
                            font-weight: 700;
                        }
                        .field { 
                            margin: 20px 0; 
                            padding: 20px; 
                            border-left: 4px solid #000; 
                            background: white; 
                            border: 1px solid #000;
                            border-radius: 4px;
                            page-break-inside: avoid;
                        }
                        .label { 
                            font-weight: 700; 
                            color: #000; 
                            margin-bottom: 10px; 
                            font-size: 14px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .value { 
                            color: #000; 
                            font-size: 16px; 
                            line-height: 1.8;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        @media print {
                            body { padding: 20px; }
                            .field { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Resposta do Formulário</h1>
                    <div class="info">
                        <strong>Nome:</strong> ${responderName}<br>
                        <strong>Email:</strong> ${response.responder_email || 'Não informado'}<br>
                        <strong>Telefone:</strong> ${response.responder_phone || 'Não informado'}<br>
                        <strong>Data/Hora:</strong> ${date}
                    </div>
                    <h2>Perguntas e Respostas</h2>
            `;
            
            // Renderizar todas as perguntas e respostas
            fieldEntries.forEach(entry => {
                const displayValue = Array.isArray(entry.value) 
                    ? entry.value.join(', ') 
                    : String(entry.value).replace(/\n/g, '<br>');
                
                htmlContent += `
                    <div class="field">
                        <div class="label">${entry.label}</div>
                        <div class="value">${displayValue}</div>
                    </div>
                `;
            });
            
            // Se não houver campos, mostrar mensagem
            if (fieldEntries.length === 0) {
                htmlContent += `
                    <div class="field">
                        <div class="label">Aviso</div>
                        <div class="value">Nenhuma resposta encontrada para este formulário.</div>
                    </div>
                `;
            }
            
            htmlContent += '</body></html>';
            
            // Abrir em nova janela e imprimir
            const printWindow = window.open('', '_blank');
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        } else if (format === 'csv') {
            const headers = ['Nome', 'Email', 'Telefone', 'Data/Hora'];
            formFields.forEach(field => {
                if (field.label) headers.push(field.label);
            });
            
            const row = [
                responderName,
                response.responder_email || '',
                response.responder_phone || '',
                date
            ];
            
            formFields.forEach(field => {
                if (field.label) {
                    const value = responseData[field.label] || '';
                    row.push(Array.isArray(value) ? value.join('; ') : String(value));
                }
            });
            
            const csvContent = [
                headers.join(','),
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            ].join('\n');
            
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `resposta_${responderName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } else if (format === 'excel') {
            const headers = ['Nome', 'Email', 'Telefone', 'Data/Hora'];
            formFields.forEach(field => {
                if (field.label) headers.push(field.label);
            });
            
            const row = [
                responderName,
                response.responder_email || '',
                response.responder_phone || '',
                date
            ];
            
            formFields.forEach(field => {
                if (field.label) {
                    const value = responseData[field.label] || '';
                    row.push(Array.isArray(value) ? value.join('; ') : String(value));
                }
            });
            
            const tsvContent = [
                headers.join('\t'),
                row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')
            ].join('\n');
            
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `resposta_${responderName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xls`;
            link.click();
            URL.revokeObjectURL(url);
        }
    }
    
    // Tornar função global
    window.exportSingleResponse = exportSingleResponse;
    
    // Função global para abrir detalhes da resposta
    window.openResponseDetail = function(response, formFields) {
        console.log('[RESPONSE DETAIL] Abrindo detalhes da resposta:', response);
        console.log('[RESPONSE DETAIL] FormFields recebidos:', formFields);
        
        // Obter responseData primeiro
        const responseData = response.response_data || {};
        console.log('Y"S [RESPONSE DETAIL] Response data:', responseData);
        
        // Garantir que formFields seja um array válido
        if (!formFields || !Array.isArray(formFields) || formFields.length === 0 || formFields.every(f => !f || Object.keys(f).length === 0)) {
            // Tentar carregar formFields do formulário atual
            const formFieldsJsonEl = document.getElementById('form-fields-json');
            if (formFieldsJsonEl && formFieldsJsonEl.value) {
                try {
                    const parsed = JSON.parse(formFieldsJsonEl.value);
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(f => f && Object.keys(f).length > 0)) {
                        formFields = parsed;
                        console.log('o. [RESPONSE DETAIL] FormFields carregados do DOM:', formFields);
                    } else {
                        console.warn('s️ [RESPONSE DETAIL] FormFields do DOM estão vazios');
                    }
                } catch (e) {
                    console.error('O [RESPONSE DETAIL] Erro ao parsear formFields:', e);
                }
            }
        }
        
        // Se ainda estiver vazio, tentar extrair campos diretamente do response_data
        if (!formFields || formFields.length === 0 || formFields.every(f => !f || Object.keys(f).length === 0)) {
            console.warn('s️ [RESPONSE DETAIL] FormFields vazio, tentando extrair do response_data');
            const responseDataKeys = Object.keys(responseData || {});
            
            // Criar formFields baseado nas chaves do response_data
            formFields = responseDataKeys.map((key, index) => {
                // Tentar identificar o tipo de campo baseado no valor
                const value = responseData[key];
                let type = 'short_text';
                
                if (Array.isArray(value)) {
                    type = 'checkbox';
                } else if (typeof value === 'number') {
                    type = 'number';
                } else if (value && String(value).match(/^\d{4}-\d{2}-\d{2}/)) {
                    type = 'date';
                } else if (value && String(value).match(/@/)) {
                    type = 'email';
                } else if (value && String(value).match(/^\d+$/)) {
                    type = 'phone';
                } else if (value && String(value).length > 100) {
                    type = 'paragraph';
                }
                
                // Tentar criar um label baseado na chave ou no valor
                let label = `Campo ${index + 1}`;
                if (key.includes('_')) {
                    label = `Campo ${index + 1}`;
                }
                
                return {
                    id: key,
                    label: label,
                    type: type
                };
            });
            
            console.log('o. [RESPONSE DETAIL] FormFields criados a partir do response_data:', formFields);
        }
        
        const modal = document.createElement('div');
        modal.className = 'response-detail-modal';
        modal.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: rgba(0,0,0,0.95) !important; backdrop-filter: blur(10px) !important; z-index: 99999 !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 20px !important; overflow-y: auto !important;';
        
        console.log('Y"S [RESPONSE DETAIL] Total campos no formFields:', formFields ? formFields.length : 0);
        
        const submittedDate = new Date(response.submitted_at);
        const formattedDate = submittedDate.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const responderName = extractResponderName(response);
        
        // Renderizar formulário completo como estava quando a pessoa preencheu
        let formHTML = `
            <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 0; border-radius: 24px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; color: #ECECEC; box-shadow: 0 30px 80px rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.05);">
                <div style="background: linear-gradient(135deg, #FFC70015 0%, transparent 100%); padding: 32px 40px; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 8px 0; color: #ECECEC; font-size: 28px; font-weight: 700;">
                                <i class="fas fa-file-alt" style="color: #FFC700; margin-right: 12px;"></i>
                                Formulário Completo - ${responderName}
                            </h3>
                            <div style="font-size: 14px; color: #A1A1A1; display: flex; gap: 16px; flex-wrap: wrap;">
                                <span><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
                                ${response.responder_email ? `<span><i class="fas fa-envelope"></i> ${response.responder_email}</span>` : ''}
                                ${response.responder_phone ? `<span><i class="fas fa-phone"></i> ${response.responder_phone}</span>` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="exportSingleResponse(${JSON.stringify(response).replace(/"/g, '&quot;')}, ${JSON.stringify(formFields || []).replace(/"/g, '&quot;')}, 'pdf')" 
                                    style="padding: 12px 20px; background: linear-gradient(135deg, #EF4444, #DC2626); border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;"
                                    onmouseover="this.style.transform='scale(1.05)';" 
                                    onmouseout="this.style.transform='scale(1)';">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                            <button onclick="exportSingleResponse(${JSON.stringify(response).replace(/"/g, '&quot;')}, ${JSON.stringify(formFields || []).replace(/"/g, '&quot;')}, 'csv')" 
                                    style="padding: 12px 20px; background: linear-gradient(135deg, #10B981, #059669); border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;"
                                    onmouseover="this.style.transform='scale(1.05)';" 
                                    onmouseout="this.style.transform='scale(1)';">
                                <i class="fas fa-file-csv"></i> CSV
                            </button>
                            <button onclick="exportSingleResponse(${JSON.stringify(response).replace(/"/g, '&quot;')}, ${JSON.stringify(formFields || []).replace(/"/g, '&quot;')}, 'excel')" 
                                    style="padding: 12px 20px; background: linear-gradient(135deg, #FFC700, #FFA500); border: none; border-radius: 10px; color: #000; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;"
                                    onmouseover="this.style.transform='scale(1.05)';" 
                                    onmouseout="this.style.transform='scale(1)';">
                                <i class="fas fa-file-excel"></i> Excel
                            </button>
                        </div>
                        <button onclick="this.closest('.response-detail-modal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: #ECECEC; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.transform='rotate(90deg)';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='rotate(0deg)';">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div style="padding: 40px;">
                    <div style="background: linear-gradient(135deg, rgba(255,199,0,0.1), rgba(255,199,0,0.05)); border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 1px solid rgba(255,199,0,0.2);">
                        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                            <div style="background: linear-gradient(135deg, #FFC700, #FFA500); color: #000; width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 24px;">
                                ${responderName.charAt(0).toUpperCase()}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 700; font-size: 22px; color: #ECECEC; margin-bottom: 8px;">
                                    ${responderName}
                                </div>
                                <div style="display: flex; gap: 20px; font-size: 14px; color: #A1A1A1;">
                                    ${response.responder_email ? `
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <i class="fas fa-envelope" style="color: #FFC700;"></i>
                                            ${response.responder_email}
                                        </div>
                                    ` : ''}
                                    ${response.responder_phone ? `
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <i class="fas fa-phone" style="color: #FFC700;"></i>
                                            ${response.responder_phone}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            ${response.responder_phone ? `
                                <a href="https://wa.me/${response.responder_phone.replace(/\D/g, '')}" target="_blank" 
                                   style="background: #25D366; color: white; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.3s;"
                                   onmouseover="this.style.transform='scale(1.05)';" 
                                   onmouseout="this.style.transform='scale(1)';">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </a>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Renderizar Formulário Completo como foi preenchido -->
                    <div style="background: white; border-radius: 16px; padding: 32px; margin-bottom: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="color: #202124; font-size: 24px; font-weight: 400; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #dadce0;">
                            Respostas do Formulário
                        </div>
                        
                        ${(() => {
                            // Criar um mapa de valores já usados para evitar duplicatas
                            const usedKeys = new Set();
                            const responseKeys = Object.keys(responseData || {}).sort();
                            
                            return formFields.map((field, fieldIndex) => {
                            const label = field.label || field.Label || `Campo ${fieldIndex + 1}`;
                            if (!label) return '';
                            
                            // Buscar valor - primeiro tentar pela chave/id do campo
                            let value = null;
                            let valueKey = null;
                            
                            // 1. Tentar buscar pelo ID do campo (se existir)
                            if (field.id && responseData[field.id]) {
                                value = responseData[field.id];
                                valueKey = field.id;
                            } else {
                                // 2. Tentar buscar pela label exata
                                const labelLower = label.toLowerCase().trim();
                                const matchingKey = Object.keys(responseData).find(key => {
                                    const keyLower = key.toLowerCase().trim();
                                    return keyLower === labelLower || 
                                           keyLower.includes(labelLower) || 
                                           labelLower.includes(keyLower);
                                });
                                
                                if (matchingKey) {
                                    value = responseData[matchingKey];
                                    valueKey = matchingKey;
                                } else {
                                    // 3. Tentar buscar por índice (se as chaves são field_xxx_0, field_xxx_1, etc)
                                    const sortedKeys = Object.keys(responseData).sort();
                                    if (sortedKeys.length > fieldIndex && sortedKeys[fieldIndex] && !usedKeys.has(sortedKeys[fieldIndex])) {
                                        value = responseData[sortedKeys[fieldIndex]];
                                        valueKey = sortedKeys[fieldIndex];
                                        usedKeys.add(valueKey);
                                    } else {
                                        // 4. ltimo recurso: pegar qualquer valor que ainda não foi usado
                                        const unusedEntry = Object.entries(responseData).find(([key]) => !usedKeys.has(key));
                                        if (unusedEntry) {
                                            value = unusedEntry[1];
                                            valueKey = unusedEntry[0];
                                            usedKeys.add(valueKey);
                                        }
                                    }
                                }
                            }
                            
                            if (!value || (Array.isArray(value) && value.length === 0) || String(value).trim() === '') {
                                return '';
                            }
                            
                                if (value && valueKey) {
                                    usedKeys.add(valueKey);
                                }
                                
                                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                                console.log(`[RESPONSE DETAIL] Campo "${label}" (${valueKey}): ${displayValue.substring(0, 50)}...`);
                                
                                let fieldDisplay = '';
                                const fieldType = field.type || 'short_text';
                                switch(fieldType) {
                                    case 'paragraph':
                                        fieldDisplay = `<div style="color: #202124; font-size: 15px; line-height: 1.8; white-space: pre-wrap; padding: 12px; background: #f8f9fa; border-radius: 8px;">${displayValue.replace(/\n/g, '<br>')}</div>`;
                                        break;
                                    case 'multiple_choice':
                                    case 'checkbox':
                                        fieldDisplay = `<div style="color: #202124; font-size: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px;">${displayValue}</div>`;
                                        break;
                                    default:
                                        fieldDisplay = `<div style="color: #202124; font-size: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px;">${displayValue}</div>`;
                                }
                                
                                return `
                                    <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e8eaed;">
                                        <div style="font-weight: 600; color: #5f6368; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
                                            ${field.required ? '<span style="color: #d93025; font-weight: 700;">*</span>' : ''}
                                            ${label}
                                        </div>
                                        ${fieldDisplay}
                                    </div>
                                `;
                            }).filter(html => html !== '').join('');
                        })()}
                        ${(() => {
                            // Adicionar campos do response_data que não foram mapeados
                            const mappedKeys = new Set();
                            const usedValueKeys = new Set();
                            
                            formFields.forEach((field, idx) => {
                                // Tentar encontrar chave mapeada
                                if (field.id && responseData[field.id]) {
                                    mappedKeys.add(field.id);
                                    usedValueKeys.add(field.id);
                                }
                                // Também mapear por índice se foi usado
                                const sortedKeys = Object.keys(responseData).sort();
                                if (sortedKeys.length > idx && sortedKeys[idx]) {
                                    usedValueKeys.add(sortedKeys[idx]);
                                }
                            });
                            
                            // Buscar labels para campos não mapeados
                            const unmappedEntries = Object.entries(responseData || {}).filter(([key]) => !usedValueKeys.has(key));
                            
                            if (unmappedEntries.length > 0) {
                                return unmappedEntries.map(([key, value]) => {
                                    if (!value || (Array.isArray(value) && value.length === 0) || String(value).trim() === '') {
                                        return '';
                                    }
                                    
                                    // Tentar encontrar label do campo baseado na chave
                                    let label = key;
                                    const field = formFields.find(f => {
                                        if (f.id === key) return true;
                                        const labelLower = (f.label || '').toLowerCase().trim();
                                        const keyLower = key.toLowerCase().trim();
                                        return labelLower === keyLower || keyLower.includes(labelLower) || labelLower.includes(keyLower);
                                    });
                                    
                                    if (field && field.label) {
                                        label = field.label;
                                    } else {
                                        // Tentar formatar a chave como label legível
                                        label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    }
                                    
                                    const displayValue = Array.isArray(value) ? value.join(', ') : String(value).replace(/\n/g, '<br>');
                                    return `
                                        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e8eaed;">
                                            <div style="font-weight: 600; color: #5f6368; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                                ${label}
                                            </div>
                                            <div style="color: #202124; font-size: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; white-space: pre-wrap;">${displayValue}</div>
                                        </div>
                                    `;
                                }).filter(html => html !== '').join('');
                            }
                            return '';
                        })()}
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); flex-wrap: wrap;">
                        <button onclick="exportSingleResponse(${JSON.stringify(response).replace(/"/g, '&quot;')}, ${JSON.stringify(formFields).replace(/"/g, '&quot;')}, 'pdf')" 
                                style="background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 12px 20px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;"
                                onmouseover="this.style.transform='scale(1.05)';" 
                                onmouseout="this.style.transform='scale(1)';">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button onclick="exportSingleResponse(${JSON.stringify(response).replace(/"/g, '&quot;')}, ${JSON.stringify(formFields).replace(/"/g, '&quot;')}, 'csv')" 
                                style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 12px 20px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;"
                                onmouseover="this.style.transform='scale(1.05)';" 
                                onmouseout="this.style.transform='scale(1)';">
                            <i class="fas fa-file-csv"></i> CSV
                        </button>
                        <button onclick="exportSingleResponse(${JSON.stringify(response).replace(/"/g, '&quot;')}, ${JSON.stringify(formFields).replace(/"/g, '&quot;')}, 'excel')" 
                                style="background: linear-gradient(135deg, #FFC700, #FFA500); color: #000; padding: 12px 20px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;"
                                onmouseover="this.style.transform='scale(1.05)';" 
                                onmouseout="this.style.transform='scale(1)';">
                            <i class="fas fa-file-excel"></i> Excel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        try {
            // Limpar modal anterior se existir
            const existingModal = document.querySelector('.response-detail-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Definir innerHTML do modal ANTES de adicionar ao DOM
            modal.innerHTML = formHTML;
            
            // Adicionar ao body
            document.body.appendChild(modal);
            console.log('o. [RESPONSE DETAIL] Modal adicionado ao DOM');
            console.log('o. [RESPONSE DETAIL] Modal HTML length:', formHTML.length);
            console.log('o. [RESPONSE DETAIL] Modal innerHTML length:', modal.innerHTML.length);
            
            // Forçar scroll para o topo
            modal.scrollTop = 0;
            window.scrollTo(0, 0);
            
            // Event listener para fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('response-detail-modal')) {
                    modal.remove();
                }
            });
            
            // Adicionar botão ESC para fechar
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
            
            // Verificar se o conteúdo foi renderizado
            setTimeout(() => {
                const contentDiv = modal.querySelector('div[style*="padding: 40px"]');
                if (!contentDiv) {
                    console.error('O [RESPONSE DETAIL] Conteúdo do modal não foi renderizado!');
                } else {
                    console.log('o. [RESPONSE DETAIL] Conteúdo do modal renderizado com sucesso');
                }
            }, 100);
            
        } catch (error) {
            console.error('O [RESPONSE DETAIL] Erro ao criar modal:', error);
            alert('Erro ao exibir detalhes da resposta: ' + error.message);
        }
    };
    
    // Exportar resposta individual para PDF (mantida para compatibilidade)
    window.exportResponseToPDF = function(response, formFields) {
        exportSingleResponse(response, formFields, 'pdf');
    };
    
    // Exportar resposta individual para CSV
    window.exportResponseToCSV = function(response, formFields) {
        const responderName = extractResponderName(response);
        const responseData = response.response_data || {};
        const headers = ['Campo', 'Resposta'];
        const rows = [
            ['Nome', responderName],
            ['Email', response.responder_email || ''],
            ['Telefone', response.responder_phone || ''],
            ['Data/Hora', new Date(response.submitted_at).toLocaleString('pt-BR')],
            ...formFields.map(field => {
                const value = responseData[field.label] || '';
                return [field.label, Array.isArray(value) ? value.join('; ') : String(value)];
            })
        ];
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resposta_${responderName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };
    
    // Função para exportar respostas para CSV
    function exportResponsesToCSV(responses, formFields) {
        if (!responses || responses.length === 0) {
            if (typeof showWarningMessage === 'function') {
                showWarningMessage('Não há respostas para exportar.');
            } else {
                alert('Não há respostas para exportar.');
            }
            return;
        }
        
        // Criar cabeçalhos
        const headers = ['Nome', 'Email', 'Telefone', 'Data/Hora'];
        formFields.forEach(field => {
            if (field.label) {
                headers.push(field.label);
            }
        });
        
        // Criar linhas
        const rows = responses.map(response => {
            const row = [
                response.responder_name || '',
                response.responder_email || '',
                response.responder_phone || '',
                new Date(response.submitted_at).toLocaleString('pt-BR')
            ];
            
            const responseData = response.response_data || {};
            formFields.forEach(field => {
                if (field.label) {
                    const value = responseData[field.label] || '';
                    row.push(Array.isArray(value) ? value.join('; ') : String(value));
                }
            });
            
            return row;
        });
        
        // Converter para CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        // Adicionar BOM para Excel reconhecer UTF-8
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `respostas_formulario_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        if (typeof showSuccessMessage === 'function') {
            showSuccessMessage('Respostas exportadas para CSV com sucesso!');
        }
    }
    
    // Função para exportar respostas para Excel (usando formato TSV melhorado)
    function exportResponsesToExcel(responses, formFields) {
        if (!responses || responses.length === 0) {
            if (typeof showWarningMessage === 'function') {
                showWarningMessage('Não há respostas para exportar.');
            } else {
                alert('Não há respostas para exportar.');
            }
            return;
        }
        
        // Criar cabeçalhos
        const headers = ['Nome', 'Email', 'Telefone', 'Data/Hora'];
        formFields.forEach(field => {
            if (field.label) {
                headers.push(field.label);
            }
        });
        
        // Criar linhas
        const rows = responses.map(response => {
            const row = [
                response.responder_name || '',
                response.responder_email || '',
                response.responder_phone || '',
                new Date(response.submitted_at).toLocaleString('pt-BR')
            ];
            
            const responseData = response.response_data || {};
            formFields.forEach(field => {
                if (field.label) {
                    const value = responseData[field.label] || '';
                    row.push(Array.isArray(value) ? value.join('; ') : String(value));
                }
            });
            
            return row;
        });
        
        // Converter para formato TSV (Excel-friendly)
        const tsvContent = [
            headers.join('\t'),
            ...rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t'))
        ].join('\n');
        
        // Adicionar BOM e salvar como .xls
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `respostas_formulario_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();
        URL.revokeObjectURL(url);
        
        if (typeof showSuccessMessage === 'function') {
            showSuccessMessage('Respostas exportadas para Excel com sucesso!');
        }
    }
    
    // Função para abrir modal de dashboard
    async function openDashboardModal() {
        const modal = document.createElement('div');
        modal.className = 'dashboard-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;';
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 0; border-radius: 24px; max-width: 1400px; width: 100%; max-height: 95vh; overflow-y: auto; color: #ECECEC; margin: auto; box-shadow: 0 30px 80px rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.05);">
                <div style="background: linear-gradient(135deg, #FFC70015 0%, transparent 100%); padding: 32px 40px; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <div style="font-size: 2rem; color: #FFC700;">
                                    <i class="fas fa-chart-bar"></i>
                                </div>
                                <h3 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #ECECEC 0%, #A1A1A1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px;">Dashboard</h3>
                            </div>
                            <p style="margin: 0; color: #A1A1A1; font-size: 15px; font-weight: 500;">Estatísticas e métricas do seu formulário</p>
                        </div>
                        <button class="close-dashboard-modal" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #A1A1A1; font-size: 20px; cursor: pointer; padding: 12px 16px; border-radius: 12px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700'; this.style.color='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#A1A1A1';">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div style="padding: 32px 40px;">
                    <div id="dashboard-loading" style="text-align: center; padding: 60px 20px; color: #A1A1A1;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 16px;"></i>
                        <div>Carregando estatísticas...</div>
                    </div>
                    
                    <div id="dashboard-content" style="display: none;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 40px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 16px; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                    <div style="font-size: 2rem; opacity: 0.9;">
                                        <i class="fas fa-inbox"></i>
                                    </div>
                                    <div style="font-size: 32px; font-weight: 800;" id="dashboard-total">0</div>
                                </div>
                                <div style="font-size: 14px; opacity: 0.9; font-weight: 500;">Total de Respostas</div>
                            </div>
                            
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 24px; border-radius: 16px; box-shadow: 0 8px 20px rgba(245, 87, 108, 0.3);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                    <div style="font-size: 2rem; opacity: 0.9;">
                                        <i class="fas fa-calendar-week"></i>
                                    </div>
                                    <div style="font-size: 32px; font-weight: 800;" id="dashboard-last7">0</div>
                                </div>
                                <div style="font-size: 14px; opacity: 0.9; font-weight: 500;">ltimos 7 dias</div>
                            </div>
                            
                            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 24px; border-radius: 16px; box-shadow: 0 8px 20px rgba(79, 172, 254, 0.3);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                    <div style="font-size: 2rem; opacity: 0.9;">
                                        <i class="fas fa-calendar-alt"></i>
                                    </div>
                                    <div style="font-size: 32px; font-weight: 800;" id="dashboard-last30">0</div>
                                </div>
                                <div style="font-size: 14px; opacity: 0.9; font-weight: 500;">ltimos 30 dias</div>
                            </div>
                            
                            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 24px; border-radius: 16px; box-shadow: 0 8px 20px rgba(67, 233, 123, 0.3);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                    <div style="font-size: 2rem; opacity: 0.9;">
                                        <i class="fas fa-eye"></i>
                                    </div>
                                    <div style="font-size: 32px; font-weight: 800;" id="dashboard-views">0</div>
                                </div>
                                <div style="font-size: 14px; opacity: 0.9; font-weight: 500;">Visualizações</div>
                            </div>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%); border-radius: 16px; padding: 32px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.05);">
                            <h4 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 700; color: #ECECEC;">Atividades</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                                <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                    <div style="font-size: 24px; font-weight: 700; color: #FFC700; margin-bottom: 8px;" id="dashboard-submits">0</div>
                                    <div style="font-size: 13px; color: #A1A1A1;">Submissões</div>
                                </div>
                                <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                    <div style="font-size: 24px; font-weight: 700; color: #FFC700; margin-bottom: 8px;" id="dashboard-clicks">0</div>
                                    <div style="font-size: 13px; color: #A1A1A1;">Cliques</div>
                                </div>
                                <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                    <div style="font-size: 24px; font-weight: 700; color: #FFC700; margin-bottom: 8px;" id="dashboard-starts">0</div>
                                    <div style="font-size: 13px; color: #A1A1A1;">Iniciados</div>
                                </div>
                                <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                    <div style="font-size: 24px; font-weight: 700; color: #FFC700; margin-bottom: 8px;" id="dashboard-abandons">0</div>
                                    <div style="font-size: 13px; color: #A1A1A1;">Abandonados</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Métricas Avançadas -->
                        <div style="background: linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%); border-radius: 16px; padding: 32px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.05);">
                            <h4 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 700; color: #ECECEC; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-chart-line" style="color: #FFC700;"></i>
                                Métricas de Performance
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                                <div style="padding: 20px; background: rgba(102, 126, 234, 0.1); border-radius: 12px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="font-size: 28px; font-weight: 800; color: #667eea; margin-bottom: 8px;" id="dashboard-conversion">0%</div>
                                    <div style="font-size: 13px; color: #A1A1A1; margin-bottom: 4px;">Taxa de Conversão</div>
                                    <div style="font-size: 11px; color: #667eea; opacity: 0.7;">Submissões / Visualizações</div>
                                </div>
                                <div style="padding: 20px; background: rgba(245, 87, 108, 0.1); border-radius: 12px; border: 1px solid rgba(245, 87, 108, 0.2);">
                                    <div style="font-size: 28px; font-weight: 800; color: #f5576c; margin-bottom: 8px;" id="dashboard-abandonment">0%</div>
                                    <div style="font-size: 13px; color: #A1A1A1; margin-bottom: 4px;">Taxa de Abandono</div>
                                    <div style="font-size: 11px; color: #f5576c; opacity: 0.7;">Abandonos / Iniciados</div>
                                </div>
                                <div style="padding: 20px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; border: 1px solid rgba(255, 199, 0, 0.2);">
                                    <div style="font-size: 28px; font-weight: 800; color: #FFC700; margin-bottom: 8px;" id="dashboard-with-email">0</div>
                                    <div style="font-size: 13px; color: #A1A1A1; margin-bottom: 4px;">Com Email</div>
                                    <div style="font-size: 11px; color: #FFC700; opacity: 0.7;">Respostas com email válido</div>
                                </div>
                                <div style="padding: 20px; background: rgba(37, 211, 102, 0.1); border-radius: 12px; border: 1px solid rgba(37, 211, 102, 0.2);">
                                    <div style="font-size: 28px; font-weight: 800; color: #25D366; margin-bottom: 8px;" id="dashboard-with-phone">0</div>
                                    <div style="font-size: 13px; color: #A1A1A1; margin-bottom: 4px;">Com WhatsApp</div>
                                    <div style="font-size: 11px; color: #25D366; opacity: 0.7;">Respostas com telefone</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Gráfico de Respostas por Dia -->
                        <div style="background: linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%); border-radius: 16px; padding: 32px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.05);">
                            <h4 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 700; color: #ECECEC; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-chart-area" style="color: #FFC700;"></i>
                                Respostas por Dia (últimos 30 dias)
                            </h4>
                            <div id="dashboard-chart" style="min-height: 300px; display: flex; align-items: center; justify-content: center; color: #A1A1A1;">
                            </div>
                        </div>
                        
                        <!-- Gráfico de Respostas por Hora -->
                        <div style="background: linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.05);">
                            <h4 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 700; color: #ECECEC; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-clock" style="color: #FFC700;"></i>
                                Respostas por Hora (últimas 24 horas)
                            </h4>
                            <div id="dashboard-hourly-chart" style="min-height: 250px; display: flex; align-items: center; justify-content: center; color: #A1A1A1;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar modal
        modal.querySelector('.close-dashboard-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Carregar dashboard
        try {
            const response = await fetch(`${API_URL}/api/profile/items/digital_form/${currentItemId}/dashboard`, {
                method: 'GET',
                headers: getHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao carregar dashboard');
            
            const data = await response.json();
            
            document.getElementById('dashboard-loading').style.display = 'none';
            document.getElementById('dashboard-content').style.display = 'block';
            
            // Preencher estatísticas principais
            document.getElementById('dashboard-total').textContent = data.total_responses || 0;
            document.getElementById('dashboard-last7').textContent = data.last_7_days || 0;
            document.getElementById('dashboard-last30').textContent = data.last_30_days || 0;
            document.getElementById('dashboard-views').textContent = data.analytics?.views || 0;
            document.getElementById('dashboard-submits').textContent = data.analytics?.submits || 0;
            document.getElementById('dashboard-clicks').textContent = data.analytics?.clicks || 0;
            document.getElementById('dashboard-starts').textContent = data.analytics?.starts || 0;
            document.getElementById('dashboard-abandons').textContent = data.analytics?.abandons || 0;
            
            // Preencher métricas avançadas
            document.getElementById('dashboard-conversion').textContent = (data.metrics?.conversion_rate || 0) + '%';
            document.getElementById('dashboard-abandonment').textContent = (data.metrics?.abandonment_rate || 0) + '%';
            document.getElementById('dashboard-with-email').textContent = data.metrics?.with_email || 0;
            document.getElementById('dashboard-with-phone').textContent = data.metrics?.with_phone || 0;
            
            // Renderizar gráficos
            renderSimpleChart(data.daily_data || [], document.getElementById('dashboard-chart'));
            renderHourlyChart(data.hourly_data || [], document.getElementById('dashboard-hourly-chart'));
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            document.getElementById('dashboard-loading').innerHTML = `
                <div style="color: #ff4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 16px;"></i>
                    <div>Erro ao carregar dashboard: ${error.message}</div>
                </div>
            `;
        }
    }
    
    // Renderizar gráfico de horas
    function renderHourlyChart(hourlyData, container) {
        if (!hourlyData || hourlyData.length === 0) {
            container.innerHTML = '<div style="color: #A1A1A1;">Não há dados suficientes para exibir o gráfico</div>';
            return;
        }
        
        // Preencher horas faltantes com 0
        const fullDayData = Array.from({ length: 24 }, (_, i) => {
            const existing = hourlyData.find(d => d.hour === i);
            return { hour: i, count: existing ? existing.count : 0 };
        });
        
        const maxValue = Math.max(...fullDayData.map(d => d.count), 1);
        const chartHTML = `
            <div style="display: flex; align-items: flex-end; gap: 4px; height: 250px; padding: 20px 0;">
                ${fullDayData.map(hour => {
                    const height = (hour.count / maxValue) * 100;
                    return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                            <div style="background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); width: 100%; border-radius: 4px 4px 0 0; min-height: ${height}%; max-height: 100%; display: flex; align-items: flex-end; justify-content: center; padding: 2px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); transition: all 0.3s;" onmouseover="this.style.transform='scaleY(1.15)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.5)';" onmouseout="this.style.transform='scaleY(1)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)';" title="${hour.count} resposta${hour.count !== 1 ? 's' : ''} às ${hour.hour}h">
                                ${hour.count > 0 ? `<span style="color: white; font-weight: 700; font-size: 10px; margin-bottom: 2px;">${hour.count}</span>` : ''}
                            </div>
                            <div style="font-size: 10px; color: #A1A1A1; font-weight: 500;">${hour.hour}h</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.innerHTML = chartHTML;
    }
    
    // Renderizar gráfico simples de barras
    function renderSimpleChart(dailyData, container) {
        if (!dailyData || dailyData.length === 0) {
            container.innerHTML = '<div style="color: #A1A1A1;">Não há dados suficientes para exibir o gráfico</div>';
            return;
        }
        
        const maxValue = Math.max(...dailyData.map(d => d.count), 1);
        const chartHTML = `
            <div style="display: flex; align-items: flex-end; gap: 8px; height: 300px; padding: 20px 0;">
                ${dailyData.map(day => {
                    const height = (day.count / maxValue) * 100;
                    const date = new Date(day.date);
                    const dayLabel = date.getDate();
                    return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <div style="background: linear-gradient(180deg, #FFC700 0%, #FFA500 100%); width: 100%; border-radius: 8px 8px 0 0; min-height: ${height}%; max-height: 100%; display: flex; align-items: flex-end; justify-content: center; padding: 4px; box-shadow: 0 4px 12px rgba(255,199,0,0.3); transition: all 0.3s;" onmouseover="this.style.transform='scaleY(1.1)'; this.style.boxShadow='0 6px 16px rgba(255,199,0,0.5)';" onmouseout="this.style.transform='scaleY(1)'; this.style.boxShadow='0 4px 12px rgba(255,199,0,0.3)';" title="${day.count} resposta${day.count !== 1 ? 's' : ''}">
                                <span style="color: #000; font-weight: 700; font-size: 12px; margin-bottom: 4px;">${day.count}</span>
                            </div>
                            <div style="font-size: 11px; color: #A1A1A1; font-weight: 500;">${dayLabel}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.innerHTML = chartHTML;
    }
    
    // Função para abrir seletor de módulos/templates
    function openModuleSelector() {
        const modules = {
            // ========== IGREJA ==========
            'church_vinho_novo': {
                name: 'Cadastro de Visitante - Igreja Vinho Novo',
                icon: 'fas fa-church',
                category: 'Igreja',
                description: 'Template oficial Igreja Evangélica Vinho Novo - Cadastro de visitantes com design inspirado nos materiais da igreja',
                form_title: 'Cadastro de Visitante',
                form_description: 'Olá! Seja bem-vindo à nossa família! Estamos imensamente felizes em recebê-lo(a) aqui, neste lugar tão precioso, sinta-se à vontade em nosso meio. Desejamos que você também faça parte de nossa família! Nossa igreja já é apaixonada por cuidar de pessoas, portanto dizemos de todo coração: Nós queremos cuidar de você e de sua preciosa família. Um forte abraço! Igreja Evangélica Vinho Novo',
                form_fields: [
                    { label: 'Nome', type: 'short_text', required: true, placeholder: 'Seu nome completo' },
                    { label: 'Endereço', type: 'paragraph', required: false, placeholder: 'Rua, número, bairro, cidade' },
                    { label: 'Bairro', type: 'short_text', required: false, placeholder: 'Nome do bairro' },
                    { label: 'WhatsApp', type: 'phone', required: true, placeholder: '(00) 00000-0000' },
                    { label: 'Data', type: 'date', required: false },
                    { label: 'Data de Nascimento', type: 'date', required: false },
                    { label: 'Faixa Etária', type: 'multiple_choice', required: false, options: ['Adulto', 'Idoso', 'Jovem', 'Adolescente', 'Criança'] },
                    {
                        label: 'Conhece algum membro da igreja?',
                        type: 'yes_no_with_text', 
                        required: false,
                        placeholder: 'Nome da pessoa'
                    },
                    { label: 'Interesses', type: 'checkbox', required: false, options: ['Quero uma visita em minha casa', 'Quero participar de uma célula', 'Quero participar de um Estudo Bíblico'] }
                ],
                theme: 'light',
                primary_color: '#B8860B',
                text_color: '#333333',
                enable_pastor_button: true
            },
            'church_prayer_request': {
                name: 'Pedidos de Oração',
                icon: 'fas fa-hands-praying',
                category: 'Igreja',
                description: 'Formulário para receber pedidos de oração',
                form_title: 'Pedidos de Oração',
                form_description: '"E tudo o que pedirem em oração, se crerem, vocês receberão". Mateus 21:22',
                form_fields: [
                    {
                        label: 'Seu nome',
                        type: 'short_text',
                        required: true,
                        placeholder: 'Digite seu nome'
                    },
                    {
                        label: 'Pedido de oração',
                        type: 'paragraph',
                        required: true,
                        placeholder: 'Descreva seu pedido de oração...'
                    },
                    {
                        label: '? urgente?',
                        type: 'yes_no',
                        required: false
                    },
                    {
                        label: 'Telefone para contato (opcional)',
                        type: 'phone',
                        required: false,
                        placeholder: '(00) 00000-0000'
                    }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            'church_tithe_offering': {
                name: 'Dízimos e Ofertas',
                icon: 'fas fa-hand-holding-heart',
                category: 'Igreja',
                description: 'Formulário para registro de dízimos e ofertas',
                form_title: 'Dízimos e Ofertas',
                form_description: '"Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria". 2 Coríntios 9:7',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'CPF', type: 'short_text', required: false, placeholder: '000.000.000-00' },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Telefone', type: 'phone', required: true },
                    { label: 'Tipo de contribuição', type: 'multiple_choice', required: true, options: ['Dízimo', 'Oferta', 'Oferta Missionária', 'Projeto Especial'] },
                    { label: 'Valor', type: 'number', required: true, placeholder: 'R$ 0,00' },
                    { label: 'Forma de pagamento', type: 'multiple_choice', required: true, options: ['Pix', 'Transferência', 'Dinheiro', 'Cartão'] },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            'church_ministry_interest': {
                name: 'Interesse em Ministério',
                icon: 'fas fa-users-cog',
                category: 'Igreja',
                description: 'Formulário para pessoas se candidatarem a ministérios',
                form_title: 'Interesse em Ministério',
                form_description: 'Deus tem um chamado para cada um! Se você sente que pode servir em algum ministério, preencha o formulário.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Idade', type: 'number', required: true, min: 16, max: 100 },
                    { label: 'Ministério de interesse', type: 'multiple_choice', required: true, options: ['Louvor e Adoração', 'Intercessão', 'Ensino', 'Evangelismo', 'Acolhimento', 'Crianças', 'Jovens', 'Jovens Adultos', 'Mulheres', 'Homens', 'Casa de Oração'] },
                    { label: 'Tempo como membro', type: 'multiple_choice', required: true, options: ['Menos de 6 meses', '6 meses a 1 ano', '1 a 3 anos', 'Mais de 3 anos'] },
                    { label: 'Experiência anterior', type: 'paragraph', required: false, placeholder: 'Tem experiência em algum ministério? Descreva...' },
                    { label: 'Disponibilidade', type: 'checkbox', required: false, options: ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados'] }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            'church_baptism_registration': {
                name: 'Inscrição para Batismo',
                icon: 'fas fa-water',
                category: 'Igreja',
                description: 'Formulário para inscrição em batismo',
                form_title: 'Inscrição para Batismo',
                form_description: 'O batismo é um passo importante na vida cristã! Se você deseja ser batizado, preencha o formulário.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Data de nascimento', type: 'date', required: true },
                    { label: 'CPF', type: 'short_text', required: true, placeholder: '000.000.000-00' },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Data de conversão', type: 'date', required: false },
                    { label: 'Já fez a Escola de Novos Convertidos?', type: 'yes_no', required: true },
                    { label: 'Motivo do batismo', type: 'paragraph', required: true, placeholder: 'Por que você deseja ser batizado?' }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            // ========== LOJA/ECOMMERCE ==========
            'store_customer_feedback': {
                name: 'Feedback do Cliente',
                icon: 'fas fa-star',
                category: 'Loja',
                description: 'Coleta feedback e avaliações de clientes',
                form_title: 'Avalie sua Experiência',
                form_description: 'Sua opinião é muito importante para melhorarmos nossos serviços!',
                form_fields: [
                    {
                        label: 'Nome',
                        type: 'short_text',
                        required: true
                    },
                    {
                        label: 'Como você avalia nossa loja?',
                        type: 'rating',
                        required: true,
                        max: 5
                    },
                    {
                        label: 'O que você achou do atendimento?',
                        type: 'multiple_choice',
                        required: true,
                        options: ['Excelente', 'Muito bom', 'Bom', 'Regular', 'Ruim']
                    },
                    {
                        label: 'Deixe seu comentário',
                        type: 'paragraph',
                        required: false,
                        placeholder: 'Compartilhe sua experiência conosco...'
                    }
                ],
                theme: 'light',
                primary_color: '#FF6B6B',
                text_color: '#333333'
            },
            // ========== MENTORIAS/EDUCA—fO ==========
            'mentorship_registration': {
                name: 'Inscrição em Mentoria',
                icon: 'fas fa-graduation-cap',
                category: 'Mentoria',
                description: 'Formulário de inscrição para programas de mentoria',
                form_title: 'Inscrição em Mentoria',
                form_description: 'Transforme sua vida com nossos programas de mentoria personalizados. Preencha o formulário e comece sua jornada!',
                form_fields: [
                    {
                        label: 'Nome completo',
                        type: 'short_text',
                        required: true,
                        placeholder: 'Seu nome completo'
                    },
                    {
                        label: 'Email',
                        type: 'email',
                        required: true,
                        placeholder: 'seu@email.com'
                    },
                    {
                        label: 'WhatsApp',
                        type: 'phone',
                        required: true,
                        placeholder: '(00) 00000-0000'
                    },
                    {
                        label: 'Qual área você quer mentoria?',
                        type: 'multiple_choice',
                        required: true,
                        options: ['Negócios', 'Carreira', 'Marketing', 'Vendas', 'Desenvolvimento Pessoal', 'Outra']
                    },
                    {
                        label: 'Qual seu objetivo principal?',
                        type: 'paragraph',
                        required: true,
                        placeholder: 'Descreva seus objetivos e o que você espera alcançar...'
                    },
                    {
                        label: 'Horário preferido para contato',
                        type: 'multiple_choice',
                        required: false,
                        options: ['Manhã (8h-12h)', 'Tarde (12h-18h)', 'Noite (18h-22h)']
                    }
                ],
                theme: 'light',
                primary_color: '#9B59B6',
                text_color: '#333333'
            },
            'course_registration': {
                name: 'Inscrição em Curso',
                icon: 'fas fa-book',
                category: 'Mentoria',
                description: 'Formulário para inscrição em cursos online ou presenciais',
                form_title: 'Inscrição no Curso',
                form_description: 'Garanta sua vaga! Preencha seus dados e comece a transformar sua vida hoje mesmo.',
                form_fields: [
                    {
                        label: 'Nome completo',
                        type: 'short_text',
                        required: true
                    },
                    {
                        label: 'Email',
                        type: 'email',
                        required: true
                    },
                    {
                        label: 'WhatsApp',
                        type: 'phone',
                        required: true
                    },
                    {
                        label: 'CPF',
                        type: 'short_text',
                        required: true,
                        placeholder: '000.000.000-00'
                    },
                    {
                        label: 'Forma de pagamento preferida',
                        type: 'multiple_choice',
                        required: true,
                        options: ['Pix', 'Cartão de Crédito', 'Boleto', 'Transferência']
                    },
                    {
                        label: 'Como conheceu o curso?',
                        type: 'multiple_choice',
                        required: false,
                        options: ['Instagram', 'Facebook', 'Indicação', 'Google', 'YouTube', 'Outro']
                    }
                ],
                theme: 'light',
                primary_color: '#9B59B6',
                text_color: '#333333'
            },
            // ========== GERAL ==========
            'contact_form': {
                name: 'Formulário de Contato',
                icon: 'fas fa-envelope',
                category: 'Geral',
                description: 'Formulário básico para contato',
                form_title: 'Entre em Contato',
                form_description: 'Preencha o formulário abaixo e entraremos em contato em breve.',
                form_fields: [
                    {
                        label: 'Nome',
                        type: 'short_text',
                        required: true,
                        placeholder: 'Seu nome'
                    },
                    {
                        label: 'Email',
                        type: 'email',
                        required: true,
                        placeholder: 'seu@email.com'
                    },
                    {
                        label: 'Telefone',
                        type: 'phone',
                        required: false,
                        placeholder: '(00) 00000-0000'
                    },
                    {
                        label: 'Assunto',
                        type: 'short_text',
                        required: false,
                        placeholder: 'Assunto da mensagem'
                    },
                    {
                        label: 'Mensagem',
                        type: 'paragraph',
                        required: true,
                        placeholder: 'Sua mensagem'
                    }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            'feedback_form': {
                name: 'Formulário de Feedback',
                icon: 'fas fa-comments',
                category: 'Geral',
                description: 'Coleta feedback e avaliações',
                form_title: 'Deixe seu Feedback',
                form_description: 'Sua opinião é muito importante para nós!',
                form_fields: [
                    {
                        label: 'Nome',
                        type: 'short_text',
                        required: true
                    },
                    {
                        label: 'Email',
                        type: 'email',
                        required: false,
                        placeholder: 'seu@email.com'
                    },
                    {
                        label: 'Como você avalia nosso serviço?',
                        type: 'linear_scale',
                        required: true,
                        min: 1,
                        max: 5
                    },
                    {
                        label: 'O que podemos melhorar?',
                        type: 'paragraph',
                        required: false,
                        placeholder: 'Deixe sua sugestão'
                    }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            // ========== EVENTOS ==========
            'event_registration': {
                name: 'Inscrição para Evento',
                icon: 'fas fa-calendar-check',
                category: 'Eventos',
                description: 'Formulário para inscrição em eventos',
                form_title: 'Inscrição para Evento',
                form_description: 'Preencha seus dados para se inscrever no evento',
                form_fields: [
                    {
                        label: 'Nome completo',
                        type: 'short_text',
                        required: true
                    },
                    {
                        label: 'Email',
                        type: 'email',
                        required: true
                    },
                    {
                        label: 'Telefone',
                        type: 'phone',
                        required: true
                    },
                    {
                        label: 'Você tem alguma restrição alimentar?',
                        type: 'yes_no_with_text',
                        required: false,
                        placeholder: 'Descreva sua restrição alimentar'
                    },
                    {
                        label: 'Observações',
                        type: 'paragraph',
                        required: false,
                        placeholder: 'Alguma observação adicional?'
                    }
                ],
                theme: 'light',
                primary_color: '#E67E22',
                text_color: '#333333'
            },
            // ========== SERVI?OS ==========
            'service_quote': {
                name: 'Solicitar Orçamento',
                icon: 'fas fa-file-invoice-dollar',
                category: 'Serviços',
                description: 'Formulário para solicitar orçamento de serviços',
                form_title: 'Solicite seu Orçamento',
                form_description: 'Preencha o formulário e receba um orçamento personalizado sem compromisso!',
                form_fields: [
                    {
                        label: 'Nome completo',
                        type: 'short_text',
                        required: true
                    },
                    {
                        label: 'Email',
                        type: 'email',
                        required: true
                    },
                    {
                        label: 'Telefone/WhatsApp',
                        type: 'phone',
                        required: true
                    },
                    {
                        label: 'Tipo de serviço',
                        type: 'multiple_choice',
                        required: true,
                        options: ['Design', 'Marketing', 'Desenvolvimento', 'Consultoria', 'Outro']
                    },
                    {
                        label: 'Descreva o que você precisa',
                        type: 'paragraph',
                        required: true,
                        placeholder: 'Conte-nos mais sobre o projeto...'
                    },
                    {
                        label: 'Prazo desejado',
                        type: 'short_text',
                        required: false,
                        placeholder: 'Ex: 30 dias, urgente, etc.'
                    }
                ],
                theme: 'light',
                primary_color: '#16A085',
                text_color: '#333333'
            },
            'church_event_registration': {
                name: 'Inscrição Evento Igreja',
                icon: 'fas fa-calendar-alt',
                category: 'Igreja',
                description: 'Formulário para inscrição em eventos da igreja',
                form_title: 'Inscrição para Evento',
                form_description: 'Não perca este evento especial! Preencha seus dados e garanta sua vaga.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Idade', type: 'number', required: true, min: 1, max: 120 },
                    { label: 'Você é membro da igreja?', type: 'yes_no', required: true },
                    { label: 'Precisa de transporte?', type: 'yes_no', required: false },
                    { label: 'Restrições alimentares', type: 'paragraph', required: false, placeholder: 'Alguma alergia ou restrição?' }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            'store_pre_order': {
                name: 'Pré-venda',
                icon: 'fas fa-shopping-cart',
                category: 'Loja',
                description: 'Formulário para pré-vendas e lançamentos',
                form_title: 'Garanta já o seu!',
                form_description: 'Seja o primeiro a adquirir! Faça sua pré-reserva agora.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'CPF', type: 'short_text', required: true, placeholder: '000.000.000-00' },
                    { label: 'Quantidade desejada', type: 'number', required: true, min: 1 },
                    { label: 'Forma de pagamento', type: 'multiple_choice', required: true, options: ['Pix', 'Cartão de Crédito', 'Boleto'] },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#FF6B6B',
                text_color: '#333333'
            },
            'mentorship_consultation': {
                name: 'Agendamento de Consultoria',
                icon: 'fas fa-calendar-check',
                category: 'Mentoria',
                description: 'Formulário para agendamento de consultorias e mentorias',
                form_title: 'Agende sua Consultoria',
                form_description: 'Transforme sua vida com uma consultoria personalizada. Escolha o melhor horário para você!',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Área de interesse', type: 'multiple_choice', required: true, options: ['Negócios', 'Carreira', 'Marketing Digital', 'Vendas', 'Desenvolvimento Pessoal', 'Finanças', 'Empreendedorismo'] },
                    { label: 'Data preferida', type: 'date', required: true },
                    { label: 'Horário preferido', type: 'multiple_choice', required: true, options: ['Manhã (8h-12h)', 'Tarde (12h-18h)', 'Noite (18h-22h)'] },
                    { label: 'Como conheceu?', type: 'multiple_choice', required: false, options: ['Instagram', 'Facebook', 'Indicação', 'Google', 'YouTube'] },
                    { label: 'Objetivo principal', type: 'paragraph', required: true, placeholder: 'Descreva seu objetivo...' }
                ],
                theme: 'light',
                primary_color: '#9B59B6',
                text_color: '#333333'
            },
            'event_workshop': {
                name: 'Inscrição Workshop',
                icon: 'fas fa-chalkboard-teacher',
                category: 'Eventos',
                description: 'Formulário para inscrição em workshops e treinamentos',
                form_title: 'Inscrição no Workshop',
                form_description: 'Aprenda algo novo! Garanta sua vaga neste workshop exclusivo.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Área de atuação', type: 'short_text', required: false, placeholder: 'Ex: Marketing, Vendas, TI...' },
                    { label: 'Nível de experiência', type: 'multiple_choice', required: false, options: ['Iniciante', 'Intermediário', 'Avançado'] },
                    { label: 'Expectativas', type: 'paragraph', required: false, placeholder: 'O que você espera aprender?' }
                ],
                theme: 'light',
                primary_color: '#E67E22',
                text_color: '#333333'
            },
            'service_consultation': {
                name: 'Agendamento de Serviço',
                icon: 'fas fa-tools',
                category: 'Serviços',
                description: 'Formulário para agendamento de serviços',
                form_title: 'Agende seu Serviço',
                form_description: 'Preencha seus dados e escolha o melhor horário para atendimento.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'Telefone/WhatsApp', type: 'phone', required: true },
                    { label: 'Tipo de serviço', type: 'multiple_choice', required: true, options: ['Design Gráfico', 'Desenvolvimento Web', 'Marketing Digital', 'Consultoria', 'Manutenção', 'Outro'] },
                    { label: 'Data preferida', type: 'date', required: true },
                    { label: 'Horário preferido', type: 'multiple_choice', required: true, options: ['Manhã (8h-12h)', 'Tarde (12h-18h)', 'Noite (18h-22h)'] },
                    { label: 'Descrição do serviço', type: 'paragraph', required: true, placeholder: 'Descreva o que você precisa...' }
                ],
                theme: 'light',
                primary_color: '#16A085',
                text_color: '#333333'
            },
            'general_survey': {
                name: 'Pesquisa de Satisfação',
                icon: 'fas fa-clipboard-check',
                category: 'Geral',
                description: 'Formulário para pesquisas e enquetes',
                form_title: 'Pesquisa de Satisfação',
                form_description: 'Sua opinião é muito importante! Ajude-nos a melhorar respondendo esta pesquisa.',
                form_fields: [
                    { label: 'Nome (opcional)', type: 'short_text', required: false },
                    { label: 'Como você avalia nosso serviço?', type: 'rating', required: true, max: 5 },
                    { label: 'Recomendaria nosso serviço?', type: 'multiple_choice', required: true, options: ['Definitivamente', 'Provavelmente', 'Talvez', 'Provavelmente não', 'Definitivamente não'] },
                    { label: 'O que mais gostou?', type: 'paragraph', required: false },
                    { label: 'O que podemos melhorar?', type: 'paragraph', required: false },
                    { label: 'Comentários adicionais', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            'general_newsletter': {
                name: 'Newsletter',
                icon: 'fas fa-newspaper',
                category: 'Geral',
                description: 'Formulário para inscrição em newsletter',
                form_title: 'Receba nossas novidades!',
                form_description: 'Cadastre-se e receba conteúdo exclusivo, promoções e novidades em primeira mão.',
                form_fields: [
                    { label: 'Nome', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'Interesses', type: 'checkbox', required: false, options: ['Promoções', 'Novidades', 'Dicas', 'Eventos', 'Conteúdo Educativo'] }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            // ========== CONTRATOS ==========
            'contract_photography': {
                name: 'Contrato de Fotografia',
                icon: 'fas fa-camera',
                category: 'Contratos',
                description: 'Contrato digital para serviços de fotografia',
                form_title: 'Contrato de Prestação de Serviços - Fotografia',
                form_description: 'Preencha os dados abaixo para formalizar o contrato de serviços fotográficos.',
                form_fields: [
                    { label: 'Nome completo do contratante', type: 'short_text', required: true, placeholder: 'Nome completo' },
                    { label: 'CPF do contratante', type: 'short_text', required: true, placeholder: '000.000.000-00' },
                    { label: 'RG do contratante', type: 'short_text', required: true, placeholder: '00.000.000-0' },
                    { label: 'Endereço completo', type: 'paragraph', required: true, placeholder: 'Rua, número, bairro, cidade, CEP' },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'Telefone/WhatsApp', type: 'phone', required: true },
                    { label: 'Data do evento/fotografia', type: 'date', required: true },
                    { label: 'Horário do evento', type: 'time', required: true },
                    { label: 'Local do evento', type: 'paragraph', required: true, placeholder: 'Endereço completo do local' },
                    { label: 'Tipo de evento', type: 'multiple_choice', required: true, options: ['Casamento', 'Formatura', 'Aniversário', 'Corporativo', 'Ensaio', 'Outro'] },
                    { label: 'Quantidade de horas de cobertura', type: 'number', required: true, min: 1, max: 24 },
                    { label: 'Valor acordado', type: 'number', required: true, placeholder: 'R$ 0,00' },
                    { label: 'Forma de pagamento', type: 'multiple_choice', required: true, options: ['? vista (Pix)', 'Parcelado', '50% entrada + 50% antes do evento'] },
                    { label: 'Observações e condições especiais', type: 'paragraph', required: false, placeholder: 'Condições adicionais do contrato...' },
                    { label: 'Aceito os termos e condições do contrato', type: 'checkbox', required: true, options: ['Sim, aceito os termos do contrato'] }
                ],
                theme: 'light',
                primary_color: '#8B4513',
                text_color: '#333333'
            },
            'contract_filming': {
                name: 'Contrato de Filmagem',
                icon: 'fas fa-video',
                category: 'Contratos',
                description: 'Contrato digital para serviços de filmagem e vídeo',
                form_title: 'Contrato de Prestação de Serviços - Filmagem',
                form_description: 'Contrato para serviços de filmagem e produção de vídeo. Preencha todos os dados solicitados.',
                form_fields: [
                    { label: 'Nome completo do contratante', type: 'short_text', required: true },
                    { label: 'CPF/CNPJ', type: 'short_text', required: true, placeholder: 'CPF ou CNPJ' },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'Telefone/WhatsApp', type: 'phone', required: true },
                    { label: 'Endereço completo', type: 'paragraph', required: true },
                    { label: 'Tipo de produção', type: 'multiple_choice', required: true, options: ['Casamento', 'Evento Corporativo', 'Comercial/Publicidade', 'Documentário', 'Outro'] },
                    { label: 'Data da filmagem', type: 'date', required: true },
                    { label: 'Duração do evento (horas)', type: 'number', required: true, min: 1 },
                    { label: 'Local da filmagem', type: 'paragraph', required: true },
                    { label: 'Entregáveis desejados', type: 'checkbox', required: true, options: ['Vídeo completo', 'Vídeo highlight', 'Fotos', 'Making of', 'Drone'] },
                    { label: 'Prazo de entrega', type: 'short_text', required: true, placeholder: 'Ex: 30 dias após o evento' },
                    { label: 'Valor total do contrato', type: 'number', required: true, placeholder: 'R$ 0,00' },
                    { label: 'Forma de pagamento', type: 'multiple_choice', required: true, options: ['Pix à vista', 'Parcelado (3x)', 'Parcelado (6x)', '50% entrada'] },
                    { label: 'Observações', type: 'paragraph', required: false },
                    { label: 'Aceito os termos do contrato', type: 'checkbox', required: true, options: ['Sim, aceito e entendo os termos'] }
                ],
                theme: 'light',
                primary_color: '#2C3E50',
                text_color: '#333333'
            },
            'contract_design': {
                name: 'Contrato de Design',
                icon: 'fas fa-palette',
                category: 'Contratos',
                description: 'Contrato para serviços de design gráfico',
                form_title: 'Contrato de Prestação de Serviços - Design Gráfico',
                form_description: 'Formalize seu projeto de design preenchendo os dados abaixo.',
                form_fields: [
                    { label: 'Nome/Razão Social', type: 'short_text', required: true },
                    { label: 'CPF/CNPJ', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'Telefone/WhatsApp', type: 'phone', required: true },
                    { label: 'Tipo de projeto', type: 'multiple_choice', required: true, options: ['Logo', 'Identidade Visual', 'Mídias Sociais', 'Material Gráfico', 'Site/Landing Page', 'Outro'] },
                    { label: 'Descrição do projeto', type: 'paragraph', required: true, placeholder: 'Descreva detalhadamente o que você precisa...' },
                    { label: 'Prazo desejado', type: 'short_text', required: true, placeholder: 'Ex: 15 dias úteis' },
                    { label: 'Quantidade de revisões incluídas', type: 'number', required: false, min: 0, placeholder: 'Padrão: 3 revisões' },
                    { label: 'Valor do projeto', type: 'number', required: true, placeholder: 'R$ 0,00' },
                    { label: 'Forma de pagamento', type: 'multiple_choice', required: true, options: ['Pix à vista', '50% entrada + 50% na entrega', 'Parcelado'] },
                    { label: 'Observações', type: 'paragraph', required: false },
                    { label: 'Aceito os termos e condições', type: 'checkbox', required: true, options: ['Aceito os termos do contrato'] }
                ],
                theme: 'light',
                primary_color: '#E74C3C',
                text_color: '#333333'
            },
            // ========== EVENTOS ADICIONAIS ==========
            'event_conference': {
                name: 'Inscrição Conferência',
                icon: 'fas fa-microphone',
                category: 'Eventos',
                description: 'Formulário para inscrição em conferências e palestras',
                form_title: 'Inscrição para Conferência',
                form_description: 'Participe da nossa conferência! Garanta sua vaga preenchendo o formulário.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Empresa/Organização', type: 'short_text', required: false },
                    { label: 'Cargo', type: 'short_text', required: false },
                    { label: 'Tipo de ingresso', type: 'multiple_choice', required: true, options: ['Individual', 'Grupo (3+ pessoas)', 'VIP', 'Estudante'] },
                    { label: 'Necessita certificado?', type: 'yes_no', required: false },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#E67E22',
                text_color: '#333333'
            },
            // ========== TEMPLATES PREMIUM ADICIONAIS PARA EVENTOS ==========
            'event_sports': {
                name: 'Evento Esportivo',
                icon: 'fas fa-running',
                category: 'Eventos',
                description: 'Formulário para maratonas, corridas e eventos esportivos',
                form_title: 'Inscrição - Evento Esportivo',
                form_description: 'Participe do nosso evento esportivo! Cadastre-se e corra com a gente.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'CPF', type: 'short_text', required: true, placeholder: '000.000.000-00' },
                    { label: 'Data de nascimento', type: 'date', required: true },
                    { label: 'Tamanho da camiseta', type: 'multiple_choice', required: true, options: ['PP', 'P', 'M', 'G', 'GG', 'XG'] },
                    { label: 'Modalidade', type: 'multiple_choice', required: true, options: ['5K', '10K', '21K', '42K'] },
                    { 
                        label: 'Possui alguma condição médica?', 
                        type: 'yes_no_with_text', 
                        required: true,
                        placeholder: 'Descreva sua condição médica'
                    },
                    { label: 'Declaro estar em condições físicas para participar', type: 'checkbox', required: true, options: ['Sim, declaro estar apto'] }
                ],
                theme: 'light',
                primary_color: '#E74C3C',
                text_color: '#333333'
            },
            // ========== TEMPLATES PREMIUM PARA SERVI?OS ==========
            'service_beauty_salon': {
                name: 'Agendamento Salão de Beleza',
                icon: 'fas fa-cut',
                category: 'Serviços',
                description: 'Formulário para agendamento em salões de beleza e estética',
                form_title: 'Agende seu Horário',
                form_description: 'Cuide da sua beleza! Agende seu atendimento no nosso salão.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Serviço desejado', type: 'checkbox', required: true, options: ['Corte', 'Coloração', 'Escova', 'Manicure', 'Pedicure', 'Design de Sobrancelhas', 'Maquiagem', 'Tratamento Capilar', 'Massagem'] },
                    { label: 'Data preferida', type: 'date', required: true },
                    { label: 'Horário preferido', type: 'multiple_choice', required: true, options: ['Manhã (8h-12h)', 'Tarde (12h-18h)', 'Noite (18h-20h)'] },
                    { label: '? cliente frequente?', type: 'yes_no', required: false },
                    { label: 'Alergias ou restrições', type: 'paragraph', required: false, placeholder: 'Informe se possui alguma alergia...' },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#E91E63',
                text_color: '#333333'
            },
            // ========== TEMPLATES PREMIUM PARA IGREJA ==========
            'church_ministry_application': {
                name: 'Candidatura a Ministério',
                icon: 'fas fa-hands-praying',
                category: 'Igreja',
                description: 'Formulário para pessoas se candidatarem a ministérios da igreja',
                form_title: 'Candidatura a Ministério',
                form_description: 'Servir é uma honra! Preencha o formulário para se candidatar ao ministério.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Ministério de interesse', type: 'multiple_choice', required: true, options: ['Louvor', 'Intercessão', 'Ensino', 'Evangelismo', 'Acolhimento', 'Crianças', 'Jovens', 'Casais', 'Mulheres', 'Homens', 'Diaconia', 'Mediação', 'Outro'] },
                    { label: 'Tempo de conversão', type: 'short_text', required: true, placeholder: 'Ex: 2 anos' },
                    { label: 'Tempo como membro', type: 'short_text', required: true },
                    { 
                        label: 'Já serviu em algum ministério antes?', 
                        type: 'yes_no_with_text', 
                        required: true,
                        placeholder: 'Qual ministério?'
                    },
                    { label: 'O que te motiva a servir neste ministério?', type: 'paragraph', required: true },
                    { label: 'Quais são seus dons e talentos?', type: 'paragraph', required: true },
                    { label: 'Disponibilidade de tempo', type: 'multiple_choice', required: true, options: ['Parcial', 'Integral', 'Aos fins de semana', 'Flexível'] }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            // ========== TEMPLATES PREMIUM PARA LOJA/E-COMMERCE ==========
            'store_product_interest': {
                name: 'Interesse em Produto',
                icon: 'fas fa-shopping-bag',
                category: 'Loja',
                description: 'Formulário para clientes demonstrarem interesse em produtos',
                form_title: 'Tenho Interesse!',
                form_description: 'Este produto te interessou? Preencha seus dados e entraremos em contato com condições especiais!',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Produto de interesse', type: 'short_text', required: true, placeholder: 'Nome do produto' },
                    { label: 'Quantidade desejada', type: 'number', required: false, min: 1 },
                    { label: 'Quando pretende adquirir?', type: 'multiple_choice', required: false, options: ['Imediatamente', 'Esta semana', 'Este mês', 'Próximos 3 meses', 'Apenas pesquisando'] },
                    { label: 'Preço máximo que pode pagar', type: 'number', required: false, placeholder: 'R$ 0,00' },
                    { label: 'Forma de pagamento preferida', type: 'multiple_choice', required: false, options: ['Pix', 'Cartão de Crédito', 'Boleto', 'Parcelado'] },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#FF6B6B',
                text_color: '#333333'
            },
            'store_wholesale': {
                name: 'Atacado/Revenda',
                icon: 'fas fa-warehouse',
                category: 'Loja',
                description: 'Formulário para solicitação de preços de atacado e revenda',
                form_title: 'Solicite Preço de Atacado',
                form_description: 'Trabalha com revenda? Solicite nossos preços especiais para atacado!',
                form_fields: [
                    { label: 'Nome/Razão Social', type: 'short_text', required: true },
                    { label: 'CPF/CNPJ', type: 'short_text', required: true },
                    { label: 'Email corporativo', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Tipo de negócio', type: 'multiple_choice', required: true, options: ['Loja Física', 'E-commerce', 'Marketplace', 'Revendedor', 'Distribuidor', 'Outro'] },
                    { label: 'Nome da empresa/loja', type: 'short_text', required: true },
                    { label: 'Segmento de atuação', type: 'short_text', required: true },
                    { label: 'Quantidade mínima de compra mensal estimada', type: 'short_text', required: false, placeholder: 'Ex: R$ 5.000,00' },
                    { label: 'Produtos de interesse', type: 'paragraph', required: true, placeholder: 'Liste os produtos ou categorias de interesse...' },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#FF6B6B',
                text_color: '#333333'
            },
            // ========== PORTARIA ==========
            'reception_hotel': {
                name: 'Portaria de Hotel',
                icon: 'fas fa-hotel',
                category: 'Portaria',
                description: 'Formulário completo para registro de hóspedes em hotéis',
                form_title: 'Registro de Hóspede',
                form_description: 'Bem-vindo! Por favor, preencha seus dados para completar o check-in.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'CPF', type: 'short_text', required: true, placeholder: '000.000.000-00' },
                    { label: 'RG', type: 'short_text', required: true, placeholder: '00.000.000-0' },
                    { label: 'Data de nascimento', type: 'date', required: true },
                    { label: 'Nacionalidade', type: 'short_text', required: true, placeholder: 'Brasileiro, Americano, etc.' },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'Telefone/WhatsApp', type: 'phone', required: true },
                    { label: 'Endereço completo', type: 'paragraph', required: true },
                    { label: 'Data de entrada', type: 'date', required: true },
                    { label: 'Data de saída', type: 'date', required: true },
                    { label: 'Número de hóspedes', type: 'number', required: true, min: 1 },
                    { label: 'Tipo de quarto', type: 'multiple_choice', required: true, options: ['Simples', 'Duplo', 'Triplo', 'Suíte', 'Presidencial'] },
                    { label: 'Forma de pagamento', type: 'multiple_choice', required: true, options: ['Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Dinheiro'] },
                    { label: 'Veículo', type: 'yes_no_with_text', required: false, placeholder: 'Placa do veículo' },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#3498DB',
                text_color: '#333333'
            },
            'reception_event': {
                name: 'Portaria de Evento',
                icon: 'fas fa-calendar-alt',
                category: 'Portaria',
                description: 'Formulário para controle de entrada em eventos',
                form_title: 'Registro de Participante',
                form_description: 'Preencha seus dados para acessar o evento.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'CPF', type: 'short_text', required: true, placeholder: '000.000.000-00' },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Empresa/Organização', type: 'short_text', required: false },
                    { label: 'Cargo', type: 'short_text', required: false },
                    { label: 'Tipo de ingresso', type: 'multiple_choice', required: true, options: ['VIP', 'Premium', 'Standard', 'Cortesia'] },
                    { label: 'Como conheceu o evento?', type: 'multiple_choice', required: false, options: ['Redes sociais', 'Indicação', 'Site', 'Email marketing', 'Outro'] },
                    { label: 'Acompanhantes', type: 'number', required: false, min: 0, placeholder: 'Quantidade de acompanhantes' },
                    { label: 'Necessita estacionamento?', type: 'yes_no_with_text', required: false, placeholder: 'Placa do veículo' },
                    { label: 'Restrições alimentares', type: 'yes_no_with_text', required: false, placeholder: 'Descreva sua restrição' },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#E67E22',
                text_color: '#333333'
            },
            'reception_condominium': {
                name: 'Portaria de Condomínio',
                icon: 'fas fa-building',
                category: 'Portaria',
                description: 'Formulário para registro de visitantes em condomínios',
                form_title: 'Registro de Visitante',
                form_description: 'Por favor, preencha seus dados para acesso ao condomínio.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'CPF', type: 'short_text', required: true, placeholder: '000.000.000-00' },
                    { label: 'RG', type: 'short_text', required: true },
                    { label: 'Telefone/WhatsApp', type: 'phone', required: true },
                    { label: 'Apartamento/Unidade visitada', type: 'short_text', required: true, placeholder: 'Ex: 101, Bloco A' },
                    { label: 'Nome do morador', type: 'short_text', required: true },
                    { label: 'Tipo de visita', type: 'multiple_choice', required: true, options: ['Pessoal', 'Prestação de serviço', 'Entrega', 'Outro'] },
                    { label: 'Data da visita', type: 'date', required: true },
                    { label: 'Horário previsto de entrada', type: 'time', required: true },
                    { label: 'Horário previsto de saída', type: 'time', required: false },
                    { label: 'Veículo', type: 'yes_no_with_text', required: false, placeholder: 'Placa do veículo' },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#16A085',
                text_color: '#333333'
            },
            'reception_office': {
                name: 'Portaria de Escritório',
                icon: 'fas fa-briefcase',
                category: 'Portaria',
                description: 'Formulário para registro de visitantes em escritórios',
                form_title: 'Registro de Visitante',
                form_description: 'Bem-vindo! Preencha seus dados para acessar o escritório.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'CPF', type: 'short_text', required: false, placeholder: '000.000.000-00' },
                    { label: 'Empresa', type: 'short_text', required: true },
                    { label: 'Cargo', type: 'short_text', required: false },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'Telefone/WhatsApp', type: 'phone', required: true },
                    { label: 'Pessoa/Setor a visitar', type: 'short_text', required: true },
                    { label: 'Motivo da visita', type: 'multiple_choice', required: true, options: ['Reunião', 'Entrevista', 'Prestação de serviço', 'Entrega', 'Outro'] },
                    { label: 'Data da visita', type: 'date', required: true },
                    { label: 'Horário', type: 'time', required: true },
                    { label: 'Possui agendamento?', type: 'yes_no', required: true },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#2C3E50',
                text_color: '#333333'
            },
            // ========== VENDAS ==========
            'sales_lead_capture': {
                name: 'Captura de Leads',
                icon: 'fas fa-bullseye',
                category: 'Vendas',
                description: 'Formulário otimizado para captura de leads e geração de oportunidades',
                form_title: 'Tenho Interesse!',
                form_description: 'Preencha seus dados e receba uma proposta personalizada sem compromisso!',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Empresa', type: 'short_text', required: false },
                    { label: 'Cargo', type: 'short_text', required: false },
                    { label: 'Qual seu principal interesse?', type: 'multiple_choice', required: true, options: ['Produto', 'Serviço', 'Parceria', 'Informações', 'Orçamento'] },
                    { label: 'Orçamento disponível', type: 'multiple_choice', required: false, options: ['Até R$ 1.000', 'R$ 1.000 - R$ 5.000', 'R$ 5.000 - R$ 10.000', 'R$ 10.000 - R$ 50.000', 'Acima de R$ 50.000'] },
                    { label: 'Quando pretende adquirir?', type: 'multiple_choice', required: false, options: ['Imediatamente', 'Esta semana', 'Este mês', 'Próximos 3 meses', 'Apenas pesquisando'] },
                    { label: 'Como conheceu?', type: 'multiple_choice', required: false, options: ['Google', 'Instagram', 'Facebook', 'Indicação', 'YouTube', 'Outro'] },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#E74C3C',
                text_color: '#333333'
            },
            'sales_quote_request': {
                name: 'Solicitação de Orçamento',
                icon: 'fas fa-file-invoice-dollar',
                category: 'Vendas',
                description: 'Formulário profissional para solicitação de orçamentos',
                form_title: 'Solicite seu Orçamento',
                form_description: 'Preencha os dados abaixo e receba um orçamento personalizado em até 24h!',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Empresa', type: 'short_text', required: false },
                    { label: 'CNPJ', type: 'short_text', required: false, placeholder: '00.000.000/0000-00' },
                    { label: 'Produto/Serviço de interesse', type: 'short_text', required: true },
                    { label: 'Quantidade', type: 'number', required: false, min: 1 },
                    { label: 'Prazo necessário', type: 'multiple_choice', required: false, options: ['Urgente', '1 semana', '1 mês', '2-3 meses', 'Sem pressa'] },
                    { label: 'Forma de pagamento preferida', type: 'multiple_choice', required: false, options: ['Pix', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'] },
                    { label: 'Observações', type: 'paragraph', required: false, placeholder: 'Informações adicionais sobre o orçamento...' }
                ],
                theme: 'light',
                primary_color: '#27AE60',
                text_color: '#333333'
            },
            'sales_contact': {
                name: 'Contato Comercial',
                icon: 'fas fa-phone-alt',
                category: 'Vendas',
                description: 'Formulário para contato comercial e vendas',
                form_title: 'Fale com Nossa Equipe',
                form_description: 'Nossa equipe está pronta para ajudar! Preencha seus dados e entraremos em contato.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Empresa', type: 'short_text', required: false },
                    { label: 'Cargo', type: 'short_text', required: false },
                    { label: 'Assunto', type: 'multiple_choice', required: true, options: ['Vendas', 'Suporte', 'Parceria', 'Informações', 'Outro'] },
                    { label: 'Mensagem', type: 'paragraph', required: true, placeholder: 'Como podemos ajudar?' },
                    { label: 'Melhor horário para contato', type: 'multiple_choice', required: false, options: ['Manhã (8h-12h)', 'Tarde (12h-18h)', 'Noite (18h-22h)', 'Qualquer horário'] }
                ],
                theme: 'light',
                primary_color: '#3498DB',
                text_color: '#333333'
            },
            // ========== FESTAS ==========
            'party_birthday': {
                name: 'Aniversário',
                icon: 'fas fa-birthday-cake',
                category: 'Festas',
                description: 'Formulário de Check-in para aniversários',
                form_title: 'Check-in - Aniversário',
                form_description: 'Sua presença é muito especial! Confirme sua participação no aniversário.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Número de convidados', type: 'number', required: true, min: 1, placeholder: 'Incluindo você' },
                    { label: 'Nomes dos acompanhantes', type: 'paragraph', required: false, placeholder: 'Liste os nomes dos acompanhantes' },
                    { label: 'Restrições alimentares', type: 'yes_no_with_text', required: false, placeholder: 'Descreva as restrições' },
                    { label: 'Vai trazer presente?', type: 'yes_no', required: false },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#FF6B9D',
                text_color: '#333333'
            },
            'party_wedding': {
                name: 'Casamento',
                icon: 'fas fa-heart',
                category: 'Festas',
                description: 'Formulário de Check-in para casamentos',
                form_title: 'Check-in - Casamento',
                form_description: 'Sua presença tornará nosso dia ainda mais especial! Por favor, confirme sua participação.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Confirmo minha presença', type: 'yes_no', required: true },
                    { label: 'Número de acompanhantes', type: 'number', required: false, min: 0 },
                    { label: 'Nomes dos acompanhantes', type: 'paragraph', required: false, placeholder: 'Liste os nomes completos' },
                    { label: 'Restrições alimentares', type: 'yes_no_with_text', required: false, placeholder: 'Vegetariano, vegano, alergias, etc.' },
                    { label: 'Vai participar da cerimônia?', type: 'yes_no', required: true },
                    { label: 'Vai participar da recepção?', type: 'yes_no', required: true },
                    { label: 'Necessita transporte?', type: 'yes_no_with_text', required: false, placeholder: 'Local de origem' },
                    { label: 'Mensagem para os noivos', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#E91E63',
                text_color: '#333333'
            },
            'party_baby_shower': {
                name: 'Chá de Bebê',
                icon: 'fas fa-baby',
                category: 'Festas',
                description: 'Formulário de Check-in para chá de bebê',
                form_title: 'Check-in - Chá de Bebê',
                form_description: 'Sua presença é muito importante! Confirme sua participação no chá de bebê.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Confirmo minha presença', type: 'yes_no', required: true },
                    { label: 'Número de acompanhantes', type: 'number', required: false, min: 0 },
                    { label: 'Vai trazer presente?', type: 'yes_no', required: false },
                    { label: 'Tipo de presente preferido', type: 'multiple_choice', required: false, options: ['Roupas', 'Acessórios', 'Fraldas', 'Produtos de higiene', 'Brinquedos', 'Qualquer um'] },
                    { label: 'Restrições alimentares', type: 'yes_no_with_text', required: false, placeholder: 'Descreva as restrições' },
                    { label: 'Mensagem para os pais', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#FFB6C1',
                text_color: '#333333'
            },
            // ========== MAIS TEMPLATES DE IGREJA ==========
            'church_wedding': {
                name: 'Casamento na Igreja',
                icon: 'fas fa-ring',
                category: 'Igreja',
                description: 'Formulário para casamentos realizados na igreja',
                form_title: 'Solicitação de Casamento',
                form_description: 'Celebre seu casamento conosco! Preencha os dados para agendar sua cerimônia.',
                form_fields: [
                    { label: 'Nome do noivo', type: 'short_text', required: true },
                    { label: 'Nome da noiva', type: 'short_text', required: true },
                    { label: 'CPF do noivo', type: 'short_text', required: true },
                    { label: 'CPF da noiva', type: 'short_text', required: true },
                    { label: 'Data do casamento', type: 'date', required: true },
                    { label: 'Horário desejado', type: 'time', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'São membros da igreja?', type: 'yes_no_with_text', required: true, placeholder: 'Há quanto tempo?' },
                    { label: 'Desejam curso de noivos?', type: 'yes_no', required: true },
                    { label: 'Número estimado de convidados', type: 'number', required: false, min: 1 },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#E91E63',
                text_color: '#333333'
            },
            'church_baptism_request': {
                name: 'Solicitação de Batismo',
                icon: 'fas fa-water',
                category: 'Igreja',
                description: 'Formulário para solicitar batismo',
                form_title: 'Solicitação de Batismo',
                form_description: 'O batismo é um passo importante! Preencha o formulário para iniciar o processo.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Data de nascimento', type: 'date', required: true },
                    { label: 'CPF', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Data de conversão', type: 'date', required: false },
                    { label: 'Já fez a Escola de Novos Convertidos?', type: 'yes_no_with_text', required: true, placeholder: 'Quando?' },
                    { label: 'Motivo do batismo', type: 'paragraph', required: true },
                    { label: 'Data preferida', type: 'date', required: false }
                ],
                theme: 'light',
                primary_color: '#4A90E2',
                text_color: '#333333'
            },
            'church_testimony': {
                name: 'Depoimento/Testemunho',
                icon: 'fas fa-heart',
                category: 'Igreja',
                description: 'Formulário para receber testemunhos e depoimentos',
                form_title: 'Compartilhe seu Testemunho',
                form_description: '"E eles o venceram pelo sangue do Cordeiro e pela palavra do seu testemunho". Apocalipse 12:11',
                form_fields: [
                    { label: 'Seu nome', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'WhatsApp', type: 'phone', required: false },
                    { label: 'Seu testemunho', type: 'paragraph', required: true, placeholder: 'Compartilhe o que Deus fez na sua vida...' },
                    { label: 'Autorizo a publicação', type: 'yes_no', required: true },
                    { label: 'Forma de publicação preferida', type: 'multiple_choice', required: false, options: ['Redes sociais', 'Site', 'Culto', 'Qualquer forma'] }
                ],
                theme: 'light',
                primary_color: '#E74C3C',
                text_color: '#333333'
            },
            // ========== MAIS TEMPLATES DE VENDAS ==========
            'sales_partnership': {
                name: 'Proposta de Parceria',
                icon: 'fas fa-handshake',
                category: 'Vendas',
                description: 'Formulário para propostas de parcerias comerciais',
                form_title: 'Proposta de Parceria',
                form_description: 'Vamos crescer juntos! Envie sua proposta de parceria.',
                form_fields: [
                    { label: 'Nome/Razão Social', type: 'short_text', required: true },
                    { label: 'CPF/CNPJ', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Tipo de parceria', type: 'multiple_choice', required: true, options: ['Revenda', 'Distribuição', 'Afiliado', 'Co-marketing', 'Outro'] },
                    { label: 'Descrição da proposta', type: 'paragraph', required: true },
                    { label: 'Expectativa de faturamento mensal', type: 'short_text', required: false },
                    { label: 'Observações', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#16A085',
                text_color: '#333333'
            },
            // ========== MAIS TEMPLATES DE FESTAS ==========
            'party_15_years': {
                name: 'Festa de 15 Anos',
                icon: 'fas fa-crown',
                category: 'Festas',
                description: 'Formulário de Check-in para festa de 15 anos',
                form_title: 'Confirmação - Festa de 15 Anos',
                form_description: 'Sua presença é muito especial! Confirme sua participação.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Confirmo minha presença', type: 'yes_no', required: true },
                    { label: 'Número de acompanhantes', type: 'number', required: false, min: 0 },
                    { label: 'Vai participar da cerimônia?', type: 'yes_no', required: true },
                    { label: 'Vai participar da festa?', type: 'yes_no', required: true },
                    { label: 'Restrições alimentares', type: 'yes_no_with_text', required: false, placeholder: 'Descreva' },
                    { label: 'Mensagem de parabéns', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#FF69B4',
                text_color: '#333333'
            },
            'party_anniversary': {
                name: 'Aniversário de Casamento',
                icon: 'fas fa-heart',
                category: 'Festas',
                description: 'Formulário de Check-in para aniversário de casamento',
                form_title: 'Confirmação - Aniversário de Casamento',
                form_description: 'Celebre conosco mais um ano de união!',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Confirmo minha presença', type: 'yes_no', required: true },
                    { label: 'Número de acompanhantes', type: 'number', required: false, min: 0 },
                    { label: 'Restrições alimentares', type: 'yes_no_with_text', required: false, placeholder: 'Descreva' },
                    { label: 'Mensagem para o casal', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#FF1493',
                text_color: '#333333'
            },
            // ========== TEMPLATES DIVERSOS ==========
            'health_appointment': {
                name: 'Agendamento Médico',
                icon: 'fas fa-stethoscope',
                category: 'Saúde',
                description: 'Formulário para agendamento de consultas médicas',
                form_title: 'Agende sua Consulta',
                form_description: 'Cuide da sua saúde! Agende sua consulta conosco.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'CPF', type: 'short_text', required: true },
                    { label: 'Data de nascimento', type: 'date', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Tipo de consulta', type: 'multiple_choice', required: true, options: ['Primeira consulta', 'Retorno', 'Exame', 'Outro'] },
                    { label: 'Especialidade', type: 'short_text', required: true },
                    { label: 'Data preferida', type: 'date', required: true },
                    { label: 'Horário preferido', type: 'multiple_choice', required: true, options: ['Manhã', 'Tarde', 'Qualquer horário'] },
                    { label: 'Possui plano de saúde?', type: 'yes_no_with_text', required: false, placeholder: 'Qual plano?' },
                    { label: 'Motivo da consulta', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#E74C3C',
                text_color: '#333333'
            },
            'education_enrollment': {
                name: 'Matrícula Escolar',
                icon: 'fas fa-school',
                category: 'Educação',
                description: 'Formulário para matrícula em escolas e cursos',
                form_title: 'Matrícula',
                form_description: 'Garanta sua vaga! Preencha o formulário de matrícula.',
                form_fields: [
                    { label: 'Nome do aluno', type: 'short_text', required: true },
                    { label: 'Data de nascimento', type: 'date', required: true },
                    { label: 'CPF do aluno', type: 'short_text', required: false },
                    { label: 'Nome do responsável', type: 'short_text', required: true },
                    { label: 'CPF do responsável', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Série/Ano desejado', type: 'short_text', required: true },
                    { label: 'Turno', type: 'multiple_choice', required: true, options: ['Manhã', 'Tarde', 'Noite', 'Integral'] },
                    { label: 'Necessita transporte?', type: 'yes_no_with_text', required: false, placeholder: 'Local de origem' },
                    { label: 'Possui necessidades especiais?', type: 'yes_no_with_text', required: false, placeholder: 'Descreva' }
                ],
                theme: 'light',
                primary_color: '#3498DB',
                text_color: '#333333'
            },
            'job_application': {
                name: 'Candidatura a Vaga',
                icon: 'fas fa-briefcase',
                category: 'RH',
                description: 'Formulário para candidatura a vagas de emprego',
                form_title: 'Candidatura',
                form_description: 'Venha fazer parte da nossa equipe! Preencha o formulário de candidatura.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'CPF', type: 'short_text', required: true },
                    { label: 'Data de nascimento', type: 'date', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Cargo de interesse', type: 'short_text', required: true },
                    { label: 'Experiência profissional', type: 'paragraph', required: true },
                    { label: 'Escolaridade', type: 'multiple_choice', required: true, options: ['Ensino Fundamental', 'Ensino Médio', 'Superior Incompleto', 'Superior Completo', 'Pós-graduação'] },
                    { label: 'Disponibilidade', type: 'multiple_choice', required: true, options: ['Integral', 'Meio período', 'Fins de semana', 'Flexível'] },
                    { label: 'Pretensão salarial', type: 'short_text', required: false },
                    { label: 'Possui veículo próprio?', type: 'yes_no', required: false }
                ],
                theme: 'light',
                primary_color: '#2C3E50',
                text_color: '#333333'
            },
            // Continuando com mais templates... (adicionando em lote para chegar a 100+)
            'gym_membership': {
                name: 'Matrícula Academia',
                icon: 'fas fa-dumbbell',
                category: 'Fitness',
                description: 'Formulário para matrícula em academias',
                form_title: 'Matrícula - Academia',
                form_description: 'Transforme seu corpo! Faça sua matrícula agora.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'CPF', type: 'short_text', required: true },
                    { label: 'Data de nascimento', type: 'date', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Plano desejado', type: 'multiple_choice', required: true, options: ['Mensal', 'Trimestral', 'Semestral', 'Anual'] },
                    { label: 'Possui alguma condição médica?', type: 'yes_no_with_text', required: true, placeholder: 'Descreva' },
                    { label: 'Já praticou exercícios antes?', type: 'yes_no', required: false },
                    { label: 'Objetivo principal', type: 'multiple_choice', required: false, options: ['Emagrecer', 'Ganhar massa', 'Condicionamento', 'Saúde', 'Outro'] }
                ],
                theme: 'light',
                primary_color: '#E74C3C',
                text_color: '#333333'
            },
            'beauty_appointment': {
                name: 'Agendamento Beleza',
                icon: 'fas fa-spa',
                category: 'Beleza',
                description: 'Formulário para agendamento em salões e clínicas de beleza',
                form_title: 'Agende seu Horário',
                form_description: 'Cuide da sua beleza! Agende seu atendimento.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Email', type: 'email', required: false },
                    { label: 'Serviço desejado', type: 'checkbox', required: true, options: ['Corte', 'Coloração', 'Escova', 'Manicure', 'Pedicure', 'Design de Sobrancelhas', 'Maquiagem', 'Tratamento Facial', 'Massagem'] },
                    { label: 'Data preferida', type: 'date', required: true },
                    { label: 'Horário preferido', type: 'multiple_choice', required: true, options: ['Manhã (8h-12h)', 'Tarde (12h-18h)', 'Noite (18h-20h)'] },
                    { label: '? cliente frequente?', type: 'yes_no', required: false },
                    { label: 'Alergias', type: 'yes_no_with_text', required: false, placeholder: 'Descreva' }
                ],
                theme: 'light',
                primary_color: '#E91E63',
                text_color: '#333333'
            },
            'pet_grooming': {
                name: 'Banho e Tosa',
                icon: 'fas fa-paw',
                category: 'Pet',
                description: 'Formulário para agendamento de banho e tosa',
                form_title: 'Agende Banho e Tosa',
                form_description: 'Cuide do seu pet! Agende o banho e tosa.',
                form_fields: [
                    { label: 'Nome do tutor', type: 'short_text', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Nome do pet', type: 'short_text', required: true },
                    { label: 'Espécie', type: 'multiple_choice', required: true, options: ['Cachorro', 'Gato', 'Outro'] },
                    { label: 'Raça', type: 'short_text', required: false },
                    { label: 'Porte', type: 'multiple_choice', required: true, options: ['Pequeno', 'Médio', 'Grande'] },
                    { label: 'Data preferida', type: 'date', required: true },
                    { label: 'Horário preferido', type: 'multiple_choice', required: true, options: ['Manhã', 'Tarde'] },
                    { label: 'Serviços adicionais', type: 'checkbox', required: false, options: ['Corte de unhas', 'Limpeza de ouvidos', 'Escovação de dentes'] },
                    { label: 'Observações sobre o pet', type: 'paragraph', required: false }
                ],
                theme: 'light',
                primary_color: '#FF9800',
                text_color: '#333333'
            },
            'volunteer_application': {
                name: 'Inscrição Voluntário',
                icon: 'fas fa-hands-helping',
                category: 'Social',
                description: 'Formulário para inscrição de voluntários',
                form_title: 'Seja um Voluntário',
                form_description: 'Faça a diferença! Junte-se à nossa equipe de voluntários.',
                form_fields: [
                    { label: 'Nome completo', type: 'short_text', required: true },
                    { label: 'Email', type: 'email', required: true },
                    { label: 'WhatsApp', type: 'phone', required: true },
                    { label: 'Idade', type: 'number', required: true, min: 16 },
                    { label: 'Área de interesse', type: 'checkbox', required: true, options: ['Social', 'Educação', 'Saúde', 'Meio Ambiente', 'Cultura', 'Esporte'] },
                    { label: 'Disponibilidade', type: 'checkbox', required: true, options: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] },
                    { label: 'Experiência anterior', type: 'yes_no_with_text', required: false, placeholder: 'Descreva' }
                ],
                theme: 'light',
                primary_color: '#27AE60',
                text_color: '#333333'
            }
        };
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); backdrop-filter: blur(12px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; animation: fadeIn 0.3s ease;';
        modal.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideDown {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
            <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 0; border-radius: 24px; max-width: 1400px; width: 100%; max-height: 95vh; overflow-y: auto; color: #ECECEC; margin: auto; box-shadow: 0 30px 80px rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.05); animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
                <div style="background: linear-gradient(135deg, #FFC70015 0%, transparent 100%); padding: 32px 40px; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <div style="font-size: 2rem; color: #FFC700;">
                                    <i class="fas fa-layer-group"></i>
                                </div>
                                <h3 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #ECECEC 0%, #A1A1A1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px;">Biblioteca de Templates</h3>
                            </div>
                            <p style="margin: 0; color: #A1A1A1; font-size: 15px; font-weight: 500;">Escolha um template premium e personalize conforme sua necessidade</p>
                        </div>
                        <button class="close-module-modal" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #A1A1A1; font-size: 20px; cursor: pointer; padding: 12px 16px; border-radius: 12px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700'; this.style.color='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#A1A1A1';">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div style="padding: 32px 40px; position: sticky; top: 140px; background: linear-gradient(180deg, #1C1C21 0%, transparent 100%); z-index: 9; padding-bottom: 24px;">
                    <input type="text" class="module-search-input" placeholder="Buscar template por nome, descrição ou categoria..." style="width: 100%; padding: 16px 20px; border-radius: 14px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: #ECECEC; font-size: 15px; transition: all 0.3s; font-weight: 500;" onfocus="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)'; this.style.boxShadow='0 0 0 4px rgba(255,199,0,0.1)';" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.05)'; this.style.boxShadow='none';">
                </div>
                
                <div style="padding: 0 40px 40px 40px;">
                
                ${(() => {
                    // Agrupar módulos por categoria
                    const grouped = Object.entries(modules).reduce((acc, [key, module]) => {
                        if (!acc[module.category]) acc[module.category] = [];
                        acc[module.category].push([key, module]);
                        return acc;
                    }, {});
                    // Renderizar categorias
                    return Object.entries(grouped).map(([category, categoryModules]) => `
                    <div class="module-category" data-category="${category}" style="margin-bottom: 40px;">
                        <h4 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 800; color: #ECECEC; display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 2px solid rgba(255,199,0,0.2);">
                            <div style="background: linear-gradient(135deg, #FFC700 0%, #FFA500 100%); padding: 8px 12px; border-radius: 10px; box-shadow: 0 4px 12px rgba(255,199,0,0.3);">
                                <i class="fas fa-folder" style="color: #000;"></i>
                            </div>
                            <span style="letter-spacing: -0.5px;">${category}</span>
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; width: 100%;">
                            ${categoryModules.map(([key, module]) => `
                                <div class="module-card" data-module-key="${key}" data-category="${category}" style="padding: 24px; background: linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%); border-radius: 16px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 2px solid transparent; position: relative; min-height: 220px; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${module.primary_color || '#FFC700'} 0%, ${module.primary_color ? module.primary_color + '80' : '#FFC70080'} 100%);"></div>
                                    <div style="position: absolute; top: 16px; right: 16px; background: ${module.primary_color || '#FFC700'}; color: #000; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; z-index: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                        ${module.form_fields.length} campo${module.form_fields.length !== 1 ? 's' : ''}
                                    </div>
                                    <div style="font-size: 3rem; margin-bottom: 16px; color: ${module.primary_color || '#FFC700'}; margin-top: 12px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
                                        <i class="${module.icon}"></i>
                                    </div>
                                    <div style="font-weight: 700; font-size: 18px; margin-bottom: 10px; color: #ECECEC; line-height: 1.3; letter-spacing: -0.3px;">${module.name}</div>
                                    <div style="font-size: 13px; color: #A1A1A1; margin-top: auto; line-height: 1.5; flex: 1; opacity: 0.9;">${module.description}</div>
                                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${module.primary_color || '#FFC700'}; font-weight: 600;">
                                        <i class="fas fa-arrow-right"></i>
                                        <span>Usar este template</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
                })()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Função de busca dentro do escopo do modal
        const searchInput = modal.querySelector('.module-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const categories = modal.querySelectorAll('.module-category');
                
                categories.forEach(category => {
                    let hasVisible = false;
                    category.querySelectorAll('.module-card').forEach(card => {
                        const name = card.querySelector('div:nth-child(3)').textContent.toLowerCase();
                        const desc = card.querySelector('div:nth-child(4)').textContent.toLowerCase();
                        const categoryName = card.dataset.category.toLowerCase();
                        
                        if (name.includes(term) || desc.includes(term) || categoryName.includes(term) || term === '') {
                            card.style.display = 'block';
                            hasVisible = true;
                        } else {
                            card.style.display = 'none';
                        }
                    });
                    
                    category.style.display = hasVisible ? 'block' : 'none';
                });
            });
        }
        
        // Fechar modal
        modal.querySelector('.close-module-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Aguardar o DOM estar pronto antes de adicionar event listeners
        setTimeout(() => {
            // Selecionar módulo usando event delegation para garantir que funcione
            const modalContent = modal.querySelector('div > div');
            if (!modalContent) {
                console.error('O Conteúdo do modal não encontrado!');
                return;
            }
            
            // Usar event delegation no container principal
            modalContent.addEventListener('click', (e) => {
                const card = e.target.closest('.module-card');
                if (!card) return;
                
                e.stopPropagation();
                e.preventDefault();
                
                const moduleKey = card.getAttribute('data-module-key');
                console.log(`Card clicado: ${moduleKey}`);
                
                if (!moduleKey || !modules[moduleKey]) {
                    console.error('O Módulo não encontrado:', moduleKey);
                    console.error('Módulos disponíveis:', Object.keys(modules));
                    alert('Erro: Módulo não encontrado!');
                    return;
                }
                
                const selectedModule = modules[moduleKey];
                console.log('Módulo selecionado:', selectedModule.name);
                
                // Se for guest_list e não estamos editando uma lista de convidados, redirecionar
                if (moduleKey === 'guest_list' && !window.currentFormIsGuestList) {
                    modal.remove();
                    const confirmRedirect = confirm('Lista de Convidados é um módulo especial. Você será redirecionado para o dashboard para criar uma lista de convidados. Deseja continuar?');
                    if (confirmRedirect) {
                        window.location.href = '/dashboard#guest-list-editor';
                    }
                    return;
                }
                
                // Verificar se já existem campos no formulário
                const currentFields = formFields.length;
                
                // SEMPRE mostrar modal premium de escolha
                const choiceModal = document.createElement('div');
                choiceModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.3s ease;';
                choiceModal.innerHTML = `
                    <style>
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideUp {
                            from { transform: translateY(30px); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                    </style>
                    <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 0; border-radius: 24px; max-width: 560px; width: 100%; border: 1px solid #2C2C2F; box-shadow: 0 30px 80px rgba(0,0,0,0.6); overflow: hidden; animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
                        <div style="background: linear-gradient(135deg, ${selectedModule.primary_color || '#FFC700'}20 0%, ${selectedModule.primary_color || '#FFC700'}10 100%); padding: 32px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size: 4rem; margin-bottom: 20px; color: ${selectedModule.primary_color || '#FFC700'}; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));">
                                <i class="${selectedModule.icon}"></i>
                            </div>
                            <h3 style="margin: 0 0 8px 0; color: #ECECEC; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">${selectedModule.name}</h3>
                            <p style="margin: 0 0 16px 0; color: #A1A1A1; font-size: 14px; line-height: 1.5;">${selectedModule.description}</p>
                            <div style="display: inline-flex; align-items: center; gap: 8px; background: ${selectedModule.primary_color || '#FFC700'}20; padding: 8px 16px; border-radius: 20px; border: 1px solid ${selectedModule.primary_color || '#FFC700'}40;">
                                <i class="fas fa-list" style="color: ${selectedModule.primary_color || '#FFC700'};"></i>
                                <span style="color: #ECECEC; font-weight: 600; font-size: 13px;">${selectedModule.form_fields.length} campo${selectedModule.form_fields.length !== 1 ? 's' : ''} neste template</span>
                            </div>
                            ${currentFields > 0 ? `
                                <div style="margin-top: 16px; padding: 12px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; border: 1px solid rgba(255, 199, 0, 0.2);">
                                    <span style="color: #FFC700; font-weight: 600; font-size: 13px;">
                                        <i class="fas fa-info-circle"></i> Você já tem ${currentFields} campo${currentFields !== 1 ? 's' : ''} no formulário
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div style="padding: 32px; display: flex; flex-direction: column; gap: 16px;">
                            ${currentFields > 0 ? `
                                <button class="choice-btn-add" style="padding: 18px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white; border-radius: 14px; cursor: pointer; font-weight: 700; font-size: 16px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 14px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                    <div style="font-size: 1.5rem;"><i class="fas fa-plus-circle"></i></div>
                                    <div style="text-align: left; flex: 1;">
                                        <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">Adicionar aos existentes</div>
                                        <div style="font-size: 13px; opacity: 0.95; font-weight: 500;">Mantém os ${currentFields} campo${currentFields !== 1 ? 's' : ''} atuais e adiciona os do template</div>
                                    </div>
                                    <i class="fas fa-arrow-right" style="font-size: 1.2rem;"></i>
                                </button>
                            ` : ''}
                            
                            <button class="choice-btn-replace" style="padding: 18px 24px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border: none; color: white; border-radius: 14px; cursor: pointer; font-weight: 700; font-size: 16px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 14px; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);">
                                <div style="font-size: 1.5rem;"><i class="fas fa-sync-alt"></i></div>
                                <div style="text-align: left; flex: 1;">
                                    <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${currentFields > 0 ? 'Substituir todos os campos' : 'Carregar template'}</div>
                                    <div style="font-size: 13px; opacity: 0.95; font-weight: 500;">${currentFields > 0 ? `Remove os ${currentFields} campo${currentFields !== 1 ? 's' : ''} atuais e carrega apenas o template` : 'Carrega este template no formulário'}</div>
                                </div>
                                <i class="fas fa-arrow-right" style="font-size: 1.2rem;"></i>
                            </button>
                            
                            <button class="choice-btn-cancel" style="padding: 14px 24px; background: transparent; border: 1.5px solid #2C2C2F; color: #A1A1A1; border-radius: 14px; cursor: pointer; font-weight: 600; font-size: 15px; transition: all 0.3s; margin-top: 8px;">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(choiceModal);
                
                // Hover effects e event listeners
                const addBtn = choiceModal.querySelector('.choice-btn-add');
                const replaceBtn = choiceModal.querySelector('.choice-btn-replace');
                const cancelBtn = choiceModal.querySelector('.choice-btn-cancel');
                
                if (addBtn) {
                    addBtn.addEventListener('mouseenter', () => {
                        addBtn.style.transform = 'translateY(-3px) scale(1.02)';
                        addBtn.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.5)';
                    });
                    addBtn.addEventListener('mouseleave', () => {
                        addBtn.style.transform = 'translateY(0) scale(1)';
                        addBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                    });
                    addBtn.addEventListener('click', () => {
                        choiceModal.style.animation = 'fadeOut 0.3s ease';
                        setTimeout(() => {
                            choiceModal.remove();
                            try {
                                loadModule(selectedModule, true); // true = adicionar
                                modal.remove();
                            } catch (error) {
                                console.error('O Erro ao carregar módulo:', error);
                                alert('Erro ao carregar módulo: ' + error.message);
                            }
                        }, 200);
                    });
                }
                
                replaceBtn.addEventListener('mouseenter', () => {
                    replaceBtn.style.transform = 'translateY(-3px) scale(1.02)';
                    replaceBtn.style.boxShadow = '0 8px 24px rgba(245, 87, 108, 0.5)';
                });
                replaceBtn.addEventListener('mouseleave', () => {
                    replaceBtn.style.transform = 'translateY(0) scale(1)';
                    replaceBtn.style.boxShadow = '0 4px 12px rgba(245, 87, 108, 0.3)';
                });
                replaceBtn.addEventListener('click', () => {
                    choiceModal.style.animation = 'fadeOut 0.3s ease';
                    setTimeout(() => {
                        choiceModal.remove();
                        try {
                            loadModule(selectedModule, false); // false = substituir
                            modal.remove();
                        } catch (error) {
                            console.error('O Erro ao carregar módulo:', error);
                            alert('Erro ao carregar módulo: ' + error.message);
                        }
                    }, 200);
                });
                
                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.background = '#2C2C2F';
                    cancelBtn.style.color = '#ECECEC';
                    cancelBtn.style.borderColor = '#3C3C3F';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.background = 'transparent';
                    cancelBtn.style.color = '#A1A1A1';
                    cancelBtn.style.borderColor = '#2C2C2F';
                });
                cancelBtn.addEventListener('click', () => {
                    choiceModal.style.animation = 'fadeOut 0.3s ease';
                    setTimeout(() => choiceModal.remove(), 200);
                });
                
                choiceModal.addEventListener('click', (e) => {
                    if (e.target === choiceModal) {
                        choiceModal.style.animation = 'fadeOut 0.3s ease';
                        setTimeout(() => choiceModal.remove(), 200);
                    }
                });
            });
            
            // Hover effects para os cards
            const moduleCards = modal.querySelectorAll('.module-card');
            console.log(`Encontrados ${moduleCards.length} cards de módulos`);
            
            moduleCards.forEach((card) => {
                const moduleKey = card.getAttribute('data-module-key');
                const module = modules[moduleKey];
                const primaryColor = module?.primary_color || '#FFC700';
                
                card.addEventListener('mouseenter', function() {
                    this.style.borderColor = primaryColor;
                    this.style.background = `linear-gradient(135deg, ${primaryColor}15 0%, #2C2C2F 100%)`;
                    this.style.transform = 'translateY(-4px) scale(1.02)';
                    this.style.boxShadow = `0 8px 24px ${primaryColor}40`;
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.borderColor = 'transparent';
                    this.style.background = 'linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%)';
                    this.style.transform = 'translateY(0) scale(1)';
                    this.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                });
                
                // Garantir que o cursor seja pointer
                card.style.cursor = 'pointer';
            });
            
            console.log('o. Event listeners configurados para módulos');
        }, 100);
    }
    
    // Função para carregar um módulo
    function loadModule(module, appendToExisting = false) {
        try {
            console.log('Carregando módulo:', module.name);
            console.log();
            console.log('Dados do módulo:', module);
            
            if (!module) {
                throw new Error('Módulo inválido ou não fornecido');
            }
            
            // Atualizar título e descrição (só se não estiver adicionando)
            if (!appendToExisting) {
                const formTitleEl = document.getElementById('form-title');
                const formDescEl = document.getElementById('form-description');
                const previewTitle = document.getElementById('preview-title');
                const previewDescription = document.getElementById('preview-description');
                
                const formTitle = module.form_title || 'Formulário';
                const formDesc = module.form_description || '';
                
                if (formTitleEl) {
                    formTitleEl.value = formTitle;
                    console.log('o. Título atualizado:', formTitle);
                }
                if (formDescEl) {
                    formDescEl.value = formDesc;
                    console.log('o. Descrição atualizada');
                }
                if (previewTitle) {
                    previewTitle.textContent = formTitle;
                    console.log('o. Preview título atualizado');
                }
                if (previewDescription) {
                    previewDescription.textContent = formDesc;
                    previewDescription.style.display = formDesc ? 'block' : 'none';
                    const removeDescBtn = document.getElementById('remove-description-btn');
                    if (removeDescBtn) {
                        removeDescBtn.style.display = formDesc ? 'block' : 'none';
                    }
                    console.log('o. Preview descrição atualizado');
                }
                
                // Atualizar cores e tema (só se não estiver adicionando)
                const themeEl = document.getElementById('form-theme');
                const primaryColorEl = document.getElementById('primary-color');
                const textColorEl = document.getElementById('text-color');
                
                const theme = module.theme || 'light';
                const primaryColor = module.primary_color || '#4A90E2';
                const textColor = module.text_color || '#333333';
                
                if (themeEl) themeEl.value = theme;
                if (primaryColorEl) primaryColorEl.value = primaryColor;
                if (textColorEl) textColorEl.value = textColor;
                
                console.log('o. Cores atualizadas:', { theme, primaryColor, textColor });
                
                // Aplicar cores
                if (typeof applyCustomColors === 'function') {
                    const secondaryColor = document.getElementById('secondary-color')?.value || null;
                    applyCustomColors({
                        theme: theme,
                        primary_color: primaryColor,
                        secondary_color: secondaryColor,
                        text_color: textColor,
                        background_image_url: '',
                        background_opacity: 1.0
                    });
                    console.log('o. Cores aplicadas ao preview');
                }
            }
            
            // Carregar campos do formulário
            const moduleFields = Array.isArray(module.form_fields) ? module.form_fields : [];
            const newFields = moduleFields.map((field, index) => ({
                ...field,
                id: field.id || `field_${Date.now()}_${index}`,
                label: field.label || 'Campo sem título',
                type: field.type || 'short_text'
            }));
            
            if (appendToExisting) {
                // Adicionar aos campos existentes
                formFields = [...formFields, ...newFields];
                console.log(`${newFields.length} campos adicionados aos ${formFields.length - newFields.length} existentes`);
            } else {
                // Substituir todos os campos
                formFields = newFields;
                console.log(`${formFields.length} campos carregados (substituição)`);
            }
            
            const formFieldsJsonEl = document.getElementById('form-fields-json');
            if (formFieldsJsonEl) {
                formFieldsJsonEl.value = JSON.stringify(formFields);
                console.log('o. form-fields-json atualizado:', formFields.length, 'campos');
                console.log();
            } else {
                console.error('O Elemento form-fields-json não encontrado!');
            }
            
            // Renderizar preview
            console.log('Y"" Renderizando preview das perguntas...');
            if (typeof renderPreviewQuestions === 'function') {
                renderPreviewQuestions();
                console.log('o. Preview renderizado');
            } else {
                console.error('O Função renderPreviewQuestions não encontrada!');
            }
            
            const actionMsg = appendToExisting ? 'adicionados' : 'carregados';
            console.log(`Módulo "${module.name}" carregado com sucesso!`);
            alert(`Módulo "${module.name}" carregado com sucesso!\n\n${newFields.length} campo(s) ${actionMsg}.\n\nTotal de campos no formulário: ${formFields.length}\n\nNão esqueça de clicar em "Salvar" para salvar as alterações.`);
            
        } catch (error) {
            console.error('O Erro ao carregar módulo:', error);
            alert('Erro ao carregar módulo: ' + error.message + '\n\nVerifique o console para mais detalhes.');
            throw error;
        }
    }
    
    function setupEventAddressAutocomplete(modal) {
        var input = modal.querySelector('#modal-event-address');
        var list = modal.querySelector('#event-address-suggestions');
        var latInput = modal.querySelector('#modal-event-address-lat');
        var lonInput = modal.querySelector('#modal-event-address-lon');
        if (!input || !list) return;
        function formatSuggestionLabel(item, userNumber) {
            var addr = item.address || {};
            var road = addr.road || addr.pedestrian || addr.street || addr.footway || '';
            var house = addr.house_number || addr.housenumber || '';
            var suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
            var city = addr.city || addr.town || addr.village || addr.municipality || '';
            var state = addr.state || '';
            var num = house || (userNumber ? String(userNumber) : '');
            if (road && num) {
                var parts = [road + ', ' + num];
                if (suburb || city) parts.push((suburb || city) + (state ? ' - ' + state : ''));
                return parts.join(', ');
            }
            if (road && (suburb || city)) {
                return road + (num ? ', ' + num : '') + ' - ' + (suburb || city) + (state ? ', ' + state : '');
            }
            if (road) return road + (num ? ', ' + num : '');
            if (item.display_name && userNumber) return item.display_name + ', ' + userNumber;
            return item.display_name || '';
        }
        function extractNumberFromQuery(q) {
            var m = q.match(/\d+/g);
            if (!m || !m.length) return null;
            return m[m.length - 1];
        }
        var debounceTimer;
        input.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            var q = (input.value || '').trim();
            if (q.length < 3) { list.style.display = 'none'; list.innerHTML = ''; return; }
            debounceTimer = setTimeout(function() {
                var params = 'q=' + encodeURIComponent(q) + '&format=json&addressdetails=1&limit=10';
                fetch('https://nominatim.openstreetmap.org/search?' + params, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'ConectaKingFormEditor/1.0' }
                }).then(function(r) { return r.json(); }).then(function(data) {
                    list.innerHTML = '';
                    if (!data || !data.length) {
                        list.innerHTML = '<div style="padding:12px;color:#A1A1A1;font-size:13px;">Nenhum endereço encontrado. Digite rua e número (ex.: Av. Nome 3800).</div>';
                        list.style.display = 'block';
                        return;
                    }
                    var userNumber = extractNumberFromQuery(q);
                    var hasNumber = !!userNumber;
                    if (hasNumber) {
                        data.sort(function(a, b) {
                            var an = (a.address && (a.address.house_number || a.address.housenumber)) ? 1 : 0;
                            var bn = (b.address && (b.address.house_number || b.address.housenumber)) ? 1 : 0;
                            return bn - an;
                        });
                    }
                    data.forEach(function(item) {
                        var label = formatSuggestionLabel(item, userNumber);
                        if (!label) label = item.display_name;
                        var d = document.createElement('div');
                        d.className = 'event-address-suggestion-item';
                        d.style.cssText = 'padding:10px 12px;cursor:pointer;color:#ECECEC;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06);';
                        d.textContent = label;
                        d.addEventListener('mouseenter', function() { d.style.background = 'rgba(255,199,0,0.15)'; });
                        d.addEventListener('mouseleave', function() { d.style.background = ''; });
                        d.addEventListener('click', function() {
                            input.value = label;
                            if (latInput) latInput.value = item.lat || '';
                            if (lonInput) lonInput.value = item.lon || '';
                            list.style.display = 'none';
                            list.innerHTML = '';
                        });
                        list.appendChild(d);
                    });
                    list.style.display = 'block';
                }).catch(function() {
                    list.innerHTML = '<div style="padding:12px;color:#ff4444;font-size:13px;">Erro ao buscar. Tente de novo.</div>';
                    list.style.display = 'block';
                });
            }, 400);
        });
        input.addEventListener('blur', function() { setTimeout(function() { list.style.display = 'none'; }, 200); });
    }
    
    // Função para abrir modal de configurações (igual aos outros modais)
    function openSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.innerHTML = `
            <div style="background: var(--card-background-color, #1C1C21); padding: 40px; border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border-color, #2C2C2F); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h3 style="margin: 0; color: var(--text, #ECECEC); font-size: 24px; font-weight: 700;">
                        <i class="fas fa-cog"></i> Configurações do Formulário
                    </h3>
                    <button class="close-settings-modal-btn" style="background: none; border: none; color: var(--text-dark, #A1A1A1); font-size: 24px; cursor: pointer; padding: 5px 10px; border-radius: 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="display: grid; gap: 20px;">
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Título do Módulo</label>
                        <input type="text" id="modal-form-module-title" placeholder="King Forms" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                    </div>
                    
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Formato de Exibição</label>
                        <div style="display: flex; gap: 20px; margin-top: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text, #ECECEC);">
                                <input type="radio" name="modal-display-format" value="button" checked>
                                <span>Botão</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text, #ECECEC);">
                                <input type="radio" name="modal-display-format" value="banner">
                                <span>Banner</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="input-group" id="modal-banner-image-container" style="display: none;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Imagem do Banner</label>
                        <div class="image-upload-area" id="modal-banner-upload-area" style="border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: var(--background-color, #0D0D0F);">
                            <input type="file" id="modal-banner-file-input" accept="image/*" style="display: none;">
                            <img id="modal-banner-preview" style="display: none; max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 15px;">
                            <div id="modal-banner-upload-text">
                                <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 15px;"></i>
                                <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload do Banner</p>
                                <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">JPG, PNG (máx. 5MB)</span>
                            </div>
                            <button type="button" id="modal-remove-banner-btn" style="display: none; margin-top: 15px; padding: 8px 20px; background: #ff4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                                <i class="fas fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>
                    
                    <div class="input-group" id="modal-button-logo-container">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Logo do Botão (Modo Botão)</label>
                        <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); margin-bottom: 12px;">
                            Logo que aparecerá no botão do formulário no seu cartão público quando o modo for "Botão"
                        </div>
                        <div class="image-upload-area" id="modal-button-logo-upload-area" style="border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: var(--background-color, #0D0D0F);">
                            <input type="file" id="modal-button-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                            <img id="modal-button-logo-preview" style="max-width: 150px; max-height: 150px; display: none; border-radius: 8px; margin: 0 auto 15px;">
                            <div id="modal-button-logo-upload-text">
                                <i class="fas fa-image" style="font-size: 2.5rem; color: var(--dourado-principal, #FFC700); margin-bottom: 15px;"></i>
                                <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload do Logo</p>
                                <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG ou JPG (máx. 5MB)</span>
                            </div>
                            <button type="button" id="modal-remove-button-logo-btn" style="display: none; margin-top: 15px; padding: 8px 20px; background: #ff4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                                <i class="fas fa-trash"></i> Remover Logo
                            </button>
                        </div>
                        <div style="margin-top: 16px;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600; font-size: 14px;">Tamanho da Logo</label>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <input type="range" id="modal-button-logo-size" min="20" max="300" value="40" step="2" style="flex: 1; height: 6px; border-radius: 3px; background: var(--border-color, #2C2C2F); outline: none; cursor: pointer;">
                                <input type="number" id="modal-button-logo-size-input" min="20" max="300" value="40" step="2" style="width: 70px; padding: 8px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); text-align: center; font-weight: 600;">
                                <span style="color: var(--text-dark, #A1A1A1); font-size: 14px; min-width: 30px;">px</span>
                            </div>
                            <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 6px;">
                                Ajuste o tamanho da logo que aparecerá no botão do formulário
                            </div>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Título do Formulário</label>
                        <input type="text" id="modal-form-title" placeholder="Ex: Formulário de Contato" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                    </div>
                    
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Logo do Formulário</label>
                        <div class="image-upload-area" id="modal-logo-upload-area" style="border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: var(--background-color, #0D0D0F);">
                            <input type="file" id="modal-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                            <img id="modal-logo-preview" style="max-width: 200px; max-height: 200px; display: none; border-radius: 8px; margin: 0 auto 15px;">
                            <div id="modal-logo-upload-text">
                                <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 15px;"></i>
                                <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload</p>
                                <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG ou JPG (máx. 5MB)</span>
                            </div>
                            <button type="button" id="modal-remove-logo-btn" style="display: none; margin-top: 15px; padding: 8px 20px; background: #ff4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                                <i class="fas fa-trash"></i> Remover Logo
                            </button>
                        </div>
                        <!-- Input hidden para armazenar URL do logo -->
                        <input type="hidden" id="logo-url" value="">
                        <div style="margin-top: 16px;">
                            <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: var(--text, #ECECEC); font-weight: 600;">
                                <input type="checkbox" id="modal-show-logo-corner" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--dourado-principal, #FFC700);">
                                <div>
                                    <div style="font-weight: 600; margin-bottom: 4px;">Exibir logo no cantinho</div>
                                    <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); font-weight: normal;">Logo aparece fixo no canto superior direito do formulário</div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Descrição do Formulário</label>
                        <textarea id="modal-form-description" rows="4" placeholder="Descreva o propósito do formulário..." style="width: 100%; padding: 12px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); resize: vertical;"></textarea>
                    </div>
                    
                    <!-- Informações do Evento -->
                    <div class="input-group" style="border-top: 1px solid var(--border-color, #2C2C2F); padding-top: 20px; margin-top: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                            <i class="fas fa-calendar-alt" style="color: var(--dourado-principal, #FFC700); font-size: 18px;"></i>
                            <div style="font-weight: 700; font-size: 16px; color: var(--text, #ECECEC);">Informações do Evento</div>
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Data do Evento</label>
                            <input type="date" id="modal-event-date" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                            <small style="color: var(--text-dark, #A1A1A1); display: block; margin-top: 5px;">A data do evento será exibida no formulário de inscrição</small>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Endereço do Evento</label>
                            <div id="event-address-autocomplete-wrap" style="position: relative;">
                                <input type="text" id="modal-event-address" placeholder="Digite o endereço e confirme pelas sugestões (como no Google Maps)" autocomplete="off" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); box-sizing: border-box;">
                                <input type="hidden" id="modal-event-address-lat" value="">
                                <input type="hidden" id="modal-event-address-lon" value="">
                                <div id="event-address-suggestions" style="display: none; position: absolute; left: 0; right: 0; top: 100%; margin-top: 4px; max-height: 220px; overflow-y: auto; background: var(--background-color, #1a1a1d); border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 10000;"></div>
                            </div>
                            <small style="color: var(--text-dark, #A1A1A1); display: block; margin-top: 5px;">Digite e escolha o endereço nas sugestões para o mapa marcar o local certo.</small>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Número do WhatsApp para Receber Respostas</label>
                        <input type="text" id="modal-whatsapp-number" placeholder="5511999999999 (com DDD e código do país)" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                        <small style="color: var(--text-dark, #A1A1A1); display: block; margin-top: 5px;">As respostas do formulário serão enviadas para este WhatsApp</small>
                    </div>
                    
                    <div class="input-group" style="border-top: 1px solid var(--border-color, #2C2C2F); padding-top: 20px; margin-top: 20px;">
                        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: var(--text, #ECECEC); font-weight: 600; margin-bottom: 16px;">
                            <input type="checkbox" id="modal-enable-pastor-button" style="width: 20px; height: 20px; cursor: pointer;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 4px;">Habilitar Botão do Pastor</div>
                                <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); font-weight: normal;">Exibe um botão especial abaixo do formulário para enviar mensagem diretamente ao pastor</div>
                            </div>
                        </label>
                    </div>
                    
                    <div id="pastor-button-config" style="display: none;">
                        <div class="input-group" style="margin-top: 16px;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Nome do Botão</label>
                            <input type="text" id="modal-pastor-button-name" placeholder="Ex: Enviar Mensagem para o Pastor" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                            <small style="color: var(--text-dark, #A1A1A1); display: block; margin-top: 5px;">Personalize o nome do botão que aparecerá no formulário</small>
                        </div>
                        
                        <div class="input-group" style="margin-top: 16px;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Número do WhatsApp do Pastor</label>
                            <input type="text" id="modal-pastor-whatsapp" placeholder="5511999999999 (com DDD e código do país)" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                            <small style="color: var(--text-dark, #A1A1A1); display: block; margin-top: 5px;">WhatsApp do pastor que receberá as mensagens</small>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Imagem de Abertura/Evento</label>
                        <div class="image-upload-area" id="modal-header-upload-area" style="border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: var(--background-color, #0D0D0F);">
                            <input type="file" id="modal-header-file-input" accept="image/*" style="display: none;">
                            <img id="modal-header-preview" style="display: none; max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 15px;">
                            <div id="modal-header-upload-text">
                                <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 15px;"></i>
                                <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload da Imagem de Abertura</p>
                                <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1); display: block; line-height: 1.5;">JPG, PNG (máx. 5MB)<br>Tamanho recomendado: <strong style="color: var(--text, #ECECEC);">1920 1080 px</strong> (proporção 16:9)</span>
                            </div>
                            <button type="button" id="modal-remove-header-btn" style="display: none; margin-top: 15px; padding: 8px 20px; background: #ff4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                                <i class="fas fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>
                    
                    <div class="input-group" style="padding: 16px; background: rgba(255,199,0,0.05); border-radius: 8px; border: 1px solid rgba(255,199,0,0.2);">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fas fa-info-circle" style="color: #FFC700;"></i>
                            <span style="color: var(--text, #ECECEC); font-size: 14px;">Imagem de Fundo e Opacidade estão disponíveis em <strong>"Cores e Temas"</strong></span>
                        </div>
                    </div>
                    
                    <div class="input-group" style="border-top: 1px solid var(--border-color, #2C2C2F); padding-top: 20px; margin-top: 20px;">
                        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: var(--text, #ECECEC); font-weight: 600; margin-bottom: 20px;">
                            <input type="checkbox" id="modal-is-listed" checked style="width: 20px; height: 20px; cursor: pointer;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 4px;">Exibir no cartão público</div>
                                <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); font-weight: normal;">Se desmarcado, o formulário não aparecerá no seu cartão público, mas continuará ativo via link compartilhável</div>
                            </div>
                        </label>
                    </div>
                    
                    <!-- Tipo de formulário + WhatsApp -->
                    <div class="input-group" style="border-top: 1px solid var(--border-color, #2C2C2F); padding-top: 20px; margin-top: 20px;">
                        <div style="padding: 20px; background: rgba(74,144,226,0.05); border-radius: 12px; border: 2px solid rgba(74,144,226,0.3);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                                <i class="fas fa-cog" style="color: #4A90E2; font-size: 18px;"></i>
                                <div style="font-weight: 700; font-size: 16px; color: var(--text, #ECECEC);">Tipo de Formulário</div>
                            </div>
                            
                            <!-- Captação de Clientes -->
                            <div style="margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 2px solid transparent; transition: all 0.3s;" id="option-form-lead">
                                <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; color: var(--text, #ECECEC); font-weight: 500;">
                                    <input type="radio" name="modal-form-type" value="lead" id="modal-settings-form-lead" style="width: 20px; height: 20px; cursor: pointer; margin-top: 2px; accent-color: #4A90E2;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <i class="fas fa-user-plus" style="color: #4A90E2; font-size: 16px;"></i>
                                            <div style="font-weight: 600; font-size: 14px;">Captação de Clientes</div>
                                        </div>
                                        <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); line-height: 1.5;">
                                            Salva cadastro e respostas no sistema. Sem QR Code, portaria ou confirmação de chegada.
                                        </div>
                                    </div>
                                </label>
                            </div>
                            
                            <!-- Check-in -->
                            <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 2px solid transparent; transition: all 0.3s;" id="option-form-checkin">
                                <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; color: var(--text, #ECECEC); font-weight: 500;">
                                    <input type="radio" name="modal-form-type" value="checkin" id="modal-settings-form-checkin" style="width: 20px; height: 20px; cursor: pointer; margin-top: 2px; accent-color: var(--dourado-principal, #FFC700);">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <i class="fas fa-qrcode" style="color: var(--dourado-principal, #FFC700); font-size: 16px;"></i>
                                            <div style="font-weight: 600; font-size: 14px;">Check-in</div>
                                        </div>
                                        <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); line-height: 1.5;">
                                            Confirmação de Check-in com QR Code, portaria e controle de quem chegou / não chegou.
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div style="padding: 12px; background: rgba(37,211,102,0.08); border-radius: 8px; border: 1px solid rgba(37,211,102,0.25);">
                                <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; color: var(--text, #ECECEC); font-weight: 500;">
                                    <input type="checkbox" id="modal-settings-enable-whatsapp" style="width: 20px; height: 20px; cursor: pointer; margin-top: 2px; accent-color: #25D366;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <i class="fab fa-whatsapp" style="color: #25D366; font-size: 16px;"></i>
                                            <div style="font-weight: 600; font-size: 14px;">Também enviar via WhatsApp</div>
                                        </div>
                                        <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); line-height: 1.5;">
                                            Além de salvar no sistema, mostra o botão de envio pelo WhatsApp no formulário público.
                                        </div>
                                    </div>
                                </label>
                            </div>
                            
                            <div style="margin-top: 16px; padding: 12px; background: rgba(74,144,226,0.1); border-radius: 8px; border-left: 3px solid #4A90E2;">
                                <div style="font-size: 12px; color: var(--text, #ECECEC); line-height: 1.6;">
                                    <strong>Dica:</strong> Use <strong>Captação de Clientes</strong> para cadastro de visitantes. Use <strong>Check-in</strong> quando precisar de QR e controle de presença na portaria.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 30px;">
                    <button class="cancel-settings-modal-btn" style="padding: 12px 24px; background: transparent; border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cancelar
                    </button>
                    <button class="save-settings-modal-btn" style="padding: 12px 24px; background: var(--dourado-principal, #FFC700); border: none; color: #000; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Salvar Configurações
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // IMPORTANTE: Declarar currentFormData ANTES de ser usado
        const currentFormData = currentItemData?.digital_form_data || {};
        
        // Preencher valores atuais nos campos do modal
        const moduleTitleEl = document.getElementById('form-module-title');
        const formTitleEl = document.getElementById('form-title');
        const formDescEl = document.getElementById('form-description');
        const whatsappEl = document.getElementById('whatsapp-number');
        
        // IMPORTANTE: Garantir que os inputs hidden existam - criar se não existirem
        let logoEl = document.getElementById('logo-url');
        if (!logoEl) {
            logoEl = document.createElement('input');
            logoEl.type = 'hidden';
            logoEl.id = 'logo-url';
            document.body.appendChild(logoEl);
            console.log('o. [MODAL] Input hidden logo-url criado');
        }
        
        let buttonLogoEl = document.getElementById('button-logo-url');
        if (!buttonLogoEl) {
            buttonLogoEl = document.createElement('input');
            buttonLogoEl.type = 'hidden';
            buttonLogoEl.id = 'button-logo-url';
            document.body.appendChild(buttonLogoEl);
            console.log('o. [MODAL] Input hidden button-logo-url criado');
        }
        
        let bannerEl = document.getElementById('banner-image-url');
        if (!bannerEl) {
            bannerEl = document.createElement('input');
            bannerEl.type = 'hidden';
            bannerEl.id = 'banner-image-url';
            document.body.appendChild(bannerEl);
            console.log('o. [MODAL] Input hidden banner-image-url criado');
        }
        
        let headerEl = document.getElementById('header-image-url');
        if (!headerEl) {
            headerEl = document.createElement('input');
            headerEl.type = 'hidden';
            headerEl.id = 'header-image-url';
            document.body.appendChild(headerEl);
            console.log('o. [MODAL] Input hidden header-image-url criado');
        }
        
        let backgroundEl = document.getElementById('background-image-url');
        if (!backgroundEl) {
            backgroundEl = document.createElement('input');
            backgroundEl.type = 'hidden';
            backgroundEl.id = 'background-image-url';
            document.body.appendChild(backgroundEl);
            console.log('o. [MODAL] Input hidden background-image-url criado');
        }
        
        const opacityEl = document.getElementById('background-opacity');
        const themeEl = document.getElementById('form-theme');
        const primaryColorEl = document.getElementById('primary-color');
        const textColorEl = document.getElementById('text-color');
        const displayFormatEl = document.querySelector('input[name="display-format"]:checked');
        
        if (moduleTitleEl) modal.querySelector('#modal-form-module-title').value = moduleTitleEl.value || '';
        if (formTitleEl) modal.querySelector('#modal-form-title').value = formTitleEl.value || '';
        if (formDescEl) modal.querySelector('#modal-form-description').value = formDescEl.value || '';
        if (whatsappEl) modal.querySelector('#modal-whatsapp-number').value = whatsappEl.value || '';
        
        // Carregar valores de event_date e event_address (e lat/lon)
        let eventDateEl = document.getElementById('event-date');
        let eventAddressEl = document.getElementById('event-address');
        let eventAddressLatEl = document.getElementById('event-address-lat');
        let eventAddressLonEl = document.getElementById('event-address-lon');
        
        // Criar inputs hidden se não existirem
        if (!eventDateEl) {
            eventDateEl = document.createElement('input');
            eventDateEl.type = 'hidden';
            eventDateEl.id = 'event-date';
            document.body.appendChild(eventDateEl);
        }
        if (!eventAddressEl) {
            eventAddressEl = document.createElement('input');
            eventAddressEl.type = 'hidden';
            eventAddressEl.id = 'event-address';
            document.body.appendChild(eventAddressEl);
        }
        if (!eventAddressLatEl) {
            eventAddressLatEl = document.createElement('input');
            eventAddressLatEl.type = 'hidden';
            eventAddressLatEl.id = 'event-address-lat';
            document.body.appendChild(eventAddressLatEl);
        }
        if (!eventAddressLonEl) {
            eventAddressLonEl = document.createElement('input');
            eventAddressLonEl.type = 'hidden';
            eventAddressLonEl.id = 'event-address-lon';
            document.body.appendChild(eventAddressLonEl);
        }
        
        // Carregar valores do formulário atual ou dos dados carregados
        const modalEventDate = modal.querySelector('#modal-event-date');
        const modalEventAddress = modal.querySelector('#modal-event-address');
        const modalEventAddressLat = modal.querySelector('#modal-event-address-lat');
        const modalEventAddressLon = modal.querySelector('#modal-event-address-lon');
        if (modalEventDate) {
            const eventDateValue = eventDateEl.value || currentFormData.event_date || '';
            modalEventDate.value = eventDateValue;
            console.log('Y". [MODAL] event_date carregado:', eventDateValue);
        }
        if (modalEventAddress) {
            const eventAddressValue = eventAddressEl.value || currentFormData.event_address || '';
            modalEventAddress.value = eventAddressValue;
            console.log('[MODAL] event_address carregado:', eventAddressValue);
        }
        if (modalEventAddressLat) modalEventAddressLat.value = eventAddressLatEl.value || currentFormData.event_address_lat || '';
        if (modalEventAddressLon) modalEventAddressLon.value = eventAddressLonEl.value || currentFormData.event_address_lon || '';
        
        // Ativar autocomplete de endereço (Nominatim) para confirmar o local correto
        setupEventAddressAutocomplete(modal);
        if (logoEl && logoEl.value) {
            const logoPreview = modal.querySelector('#modal-logo-preview');
            const logoUploadText = modal.querySelector('#modal-logo-upload-text');
            const removeLogoBtn = modal.querySelector('#modal-remove-logo-btn');
            if (logoPreview) {
                logoPreview.src = logoEl.value;
                logoPreview.style.display = 'block';
                logoPreview.style.maxWidth = '200px';
                logoPreview.style.maxHeight = '200px';
                logoPreview.style.borderRadius = '8px';
                logoPreview.style.marginBottom = '15px';
            }
            if (logoUploadText) logoUploadText.style.display = 'none';
            if (removeLogoBtn) removeLogoBtn.style.display = 'block';
            console.log('o. [MODAL] Logo carregado no preview do modal:', logoEl.value);
        } else {
            // Se não tiver logo, garantir que os elementos estão ocultos
            const logoPreview = modal.querySelector('#modal-logo-preview');
            const logoUploadText = modal.querySelector('#modal-logo-upload-text');
            const removeLogoBtn = modal.querySelector('#modal-remove-logo-btn');
            if (logoPreview) logoPreview.style.display = 'none';
            if (logoUploadText) logoUploadText.style.display = 'block';
            if (removeLogoBtn) removeLogoBtn.style.display = 'none';
        }
        if (buttonLogoEl && buttonLogoEl.value) {
            const buttonLogoPreview = modal.querySelector('#modal-button-logo-preview');
            const buttonLogoUploadText = modal.querySelector('#modal-button-logo-upload-text');
            const removeButtonLogoBtn = modal.querySelector('#modal-remove-button-logo-btn');
            buttonLogoPreview.src = buttonLogoEl.value;
            buttonLogoPreview.style.display = 'block';
            buttonLogoUploadText.style.display = 'none';
            removeButtonLogoBtn.style.display = 'block';
        }
        
        // IMPORTANTE: Carregar e configurar controles de tamanho da logo do botão
        let buttonLogoSizeEl = document.getElementById('button-logo-size');
        const modalButtonLogoSize = modal.querySelector('#modal-button-logo-size');
        const modalButtonLogoSizeInput = modal.querySelector('#modal-button-logo-size-input');
        const buttonLogoPreview = modal.querySelector('#modal-button-logo-preview');
        
        // Carregar valor atual do tamanho da logo
        let currentButtonLogoSize = 40; // Valor padrão
        if (buttonLogoSizeEl && buttonLogoSizeEl.value) {
            currentButtonLogoSize = parseInt(buttonLogoSizeEl.value, 10) || 40;
        } else if (currentFormData?.button_logo_size !== undefined) {
            currentButtonLogoSize = parseInt(currentFormData.button_logo_size, 10) || 40;
        }
        
        // Garantir que o valor está dentro dos limites (20 a 300)
        currentButtonLogoSize = Math.max(20, Math.min(300, currentButtonLogoSize));
        
        // Configurar valores iniciais dos controles
        if (modalButtonLogoSize) {
            modalButtonLogoSize.value = currentButtonLogoSize;
        }
        if (modalButtonLogoSizeInput) {
            modalButtonLogoSizeInput.value = currentButtonLogoSize;
        }
        
        // Função para atualizar o preview da logo com o novo tamanho
        const updateButtonLogoPreviewSize = (size) => {
            if (buttonLogoPreview && buttonLogoPreview.src) {
                const previewSize = Math.min(size * 1.5, 450); // Preview até 450px para logo até 300px
                buttonLogoPreview.style.maxWidth = `${previewSize}px`;
                buttonLogoPreview.style.maxHeight = `${previewSize}px`;
                console.log('[MODAL] Tamanho da logo no preview atualizado:', size, 'px (preview:', previewSize, 'px)');
            }
        };
        
        // Sincronizar slider com input numérico e atualizar preview em tempo real
        if (modalButtonLogoSize && modalButtonLogoSizeInput) {
            // Quando o slider muda, atualizar input numérico e preview
            modalButtonLogoSize.addEventListener('input', (e) => {
                const newSize = parseInt(e.target.value, 10);
                modalButtonLogoSizeInput.value = newSize;
                updateButtonLogoPreviewSize(newSize);
                
                // Atualizar o input hidden
                if (!buttonLogoSizeEl) {
                    buttonLogoSizeEl = document.createElement('input');
                    buttonLogoSizeEl.type = 'hidden';
                    buttonLogoSizeEl.id = 'button-logo-size';
                    document.body.appendChild(buttonLogoSizeEl);
                }
                buttonLogoSizeEl.value = newSize;
                console.log('[MODAL] Tamanho da logo atualizado via slider:', newSize);
            });
            
            // Quando o input numérico muda, atualizar slider e preview
            modalButtonLogoSizeInput.addEventListener('input', (e) => {
                let newSize = parseInt(e.target.value, 10);
                // Garantir que está dentro dos limites
                if (isNaN(newSize)) newSize = 40;
                newSize = Math.max(20, Math.min(300, newSize));
                
                modalButtonLogoSize.value = newSize;
                modalButtonLogoSizeInput.value = newSize; // Corrigir valor se estava fora dos limites
                updateButtonLogoPreviewSize(newSize);
                
                // Atualizar o input hidden
                if (!buttonLogoSizeEl) {
                    buttonLogoSizeEl = document.createElement('input');
                    buttonLogoSizeEl.type = 'hidden';
                    buttonLogoSizeEl.id = 'button-logo-size';
                    document.body.appendChild(buttonLogoSizeEl);
                }
                buttonLogoSizeEl.value = newSize;
                console.log('[MODAL] Tamanho da logo atualizado via input:', newSize);
            });
            
            // Atualizar preview inicialmente
            updateButtonLogoPreviewSize(currentButtonLogoSize);
        }
        if (bannerEl && bannerEl.value) {
            const bannerPreview = modal.querySelector('#modal-banner-preview');
            const bannerUploadText = modal.querySelector('#modal-banner-upload-text');
            const removeBannerBtn = modal.querySelector('#modal-remove-banner-btn');
            bannerPreview.src = bannerEl.value;
            bannerPreview.style.display = 'block';
            bannerUploadText.style.display = 'none';
            removeBannerBtn.style.display = 'block';
            modal.querySelector('#modal-banner-image-container').style.display = 'block';
        }
        if (headerEl && headerEl.value) {
            const headerPreview = modal.querySelector('#modal-header-preview');
            const headerUploadText = modal.querySelector('#modal-header-upload-text');
            const removeHeaderBtn = modal.querySelector('#modal-remove-header-btn');
            headerPreview.src = headerEl.value;
            headerPreview.style.display = 'block';
            headerUploadText.style.display = 'none';
            removeHeaderBtn.style.display = 'block';
        }
        // Removido: Imagem de fundo e opacidade agora estão apenas em "Cores e Temas"
        // Não precisa carregar preview aqui pois foi removido do modal de configurações
        // Tema, cor primária e cor de texto agora estão apenas em "Cores e Temas"
        if (displayFormatEl) {
            const modalFormatRadio = modal.querySelector(`input[name="modal-display-format"][value="${displayFormatEl.value}"]`);
            if (modalFormatRadio) modalFormatRadio.checked = true;
        }
        
        // Função para mostrar/ocultar seções baseado no modo
        const toggleModeSections = (mode) => {
            const buttonLogoContainer = modal.querySelector('#modal-button-logo-container');
            const bannerImageContainer = modal.querySelector('#modal-banner-image-container');
            
            if (mode === 'banner') {
                // Modo Banner: ocultar logo do botão, mostrar banner
                if (buttonLogoContainer) buttonLogoContainer.style.display = 'none';
                if (bannerImageContainer) bannerImageContainer.style.display = 'block';
            } else {
                // Modo Botão: mostrar logo do botão, ocultar banner
                if (buttonLogoContainer) buttonLogoContainer.style.display = 'block';
                if (bannerImageContainer) bannerImageContainer.style.display = 'none';
            }
        };
        
        // Aplicar visibilidade inicial
        const currentFormat = displayFormatEl?.value || 'button';
        toggleModeSections(currentFormat);
        
        // Adicionar listeners para mudanças no formato
        modal.querySelectorAll('input[name="modal-display-format"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const selectedMode = e.target.value;
                toggleModeSections(selectedMode);
                
                // Sincronizar com os radios principais (fora do modal) imediatamente
                const mainRadios = document.querySelectorAll('input[name="display-format"]');
                mainRadios.forEach(r => {
                    r.checked = (r.value === selectedMode);
                });
            });
        });
        
        // Configurar botão do pastor
        const enablePastorBtn = modal.querySelector('#modal-enable-pastor-button');
        const pastorWhatsappInput = modal.querySelector('#modal-pastor-whatsapp');
        const pastorButtonNameInput = modal.querySelector('#modal-pastor-button-name');
        const pastorButtonConfig = modal.querySelector('#pastor-button-config');
        
        // Carregar valores atuais (currentFormData já foi declarado acima)
        const enablePastor = currentFormData.enable_pastor_button || false;
        const pastorWhatsapp = currentFormData.pastor_whatsapp_number || '';
        const pastorButtonName = currentFormData.pastor_button_name || 'Enviar Mensagem para o Pastor';
        const showLogoCorner = currentFormData.show_logo_corner || false;
        
        // Configurar logo corner checkbox
        const showLogoCornerCheckbox = modal.querySelector('#modal-show-logo-corner');
        if (showLogoCornerCheckbox) {
            showLogoCornerCheckbox.checked = showLogoCorner;
        }
        
        // Carregar valores nos campos
        if (pastorWhatsappInput) {
            pastorWhatsappInput.value = pastorWhatsapp;
        }
        if (pastorButtonNameInput) {
            pastorButtonNameInput.value = pastorButtonName;
        }
        
        // Mostrar/ocultar campos de configuração baseado no checkbox
        const togglePastorConfig = () => {
            if (pastorButtonConfig) {
                pastorButtonConfig.style.display = enablePastorBtn?.checked ? 'block' : 'none';
            }
        };
        
        // Definir estado inicial
        if (enablePastorBtn) {
            enablePastorBtn.checked = enablePastor;
            togglePastorConfig();
            
            // Adicionar listener para mudanças
            enablePastorBtn.addEventListener('change', togglePastorConfig);
        }
        
        if (enablePastorBtn) {
            enablePastorBtn.checked = enablePastor;
        }
        
        // Configurar toggle de Lista de Convidados
        // Tipo Captação/Check-in fica em Configurações (Tipo de Formulário)
        
        // Configurar checkbox "Exibir no cartão público"
        const isListedCheckbox = modal.querySelector('#modal-is-listed');
        if (isListedCheckbox) {
            let currentIsListed = true;
            if (currentItemData?.is_listed !== undefined) {
                currentIsListed = currentItemData.is_listed;
            }
            isListedCheckbox.checked = currentIsListed;
        }
        
        // Event listeners do modal
        modal.querySelector('.close-settings-modal-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-settings-modal-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Carregar tipo de formulário (Captação / Check-in) + WhatsApp
        const formTypeLeadRadio = modal.querySelector('#modal-settings-form-lead');
        const formTypeCheckinRadio = modal.querySelector('#modal-settings-form-checkin');
        const enableWhatsappCheckbox = modal.querySelector('#modal-settings-enable-whatsapp');
        
        const highlightFormType = (selectedValue) => {
            const optionLead = document.getElementById('option-form-lead');
            const optionCheckin = document.getElementById('option-form-checkin');
            [optionLead, optionCheckin].forEach(opt => {
                if (opt) {
                    opt.style.border = '2px solid transparent';
                    opt.style.background = 'rgba(255,255,255,0.03)';
                }
            });
            if (selectedValue === 'checkin' && optionCheckin) {
                optionCheckin.style.border = '2px solid #FFC700';
                optionCheckin.style.background = 'rgba(255,199,0,0.1)';
            } else if (optionLead) {
                optionLead.style.border = '2px solid #4A90E2';
                optionLead.style.background = 'rgba(74,144,226,0.1)';
            }
        };
        
        const enableWhatsappInput = document.getElementById('enable-whatsapp-value');
        const enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
        const sendModeInputExisting = document.getElementById('send-mode-value');
        
        const enableWhatsappValue = enableWhatsappInput ? enableWhatsappInput.value === 'true' : (window.enableWhatsappValue !== false);
        const isCheckinMode = enableGuestListSubmitInput
            ? (enableGuestListSubmitInput.value === 'true' || enableGuestListSubmitInput.value === true)
            : (window.enableGuestListSubmitValue === true || sendModeInputExisting?.value === 'checkin' || sendModeInputExisting?.value === 'system-only');
        
        let selectedFormType = isCheckinMode ? 'checkin' : 'lead';
        if (sendModeInputExisting?.value === 'checkin' || sendModeInputExisting?.value === 'system-only') selectedFormType = 'checkin';
        if (sendModeInputExisting?.value === 'lead' || sendModeInputExisting?.value === 'both' || sendModeInputExisting?.value === 'whatsapp-only') {
            if (!isCheckinMode) selectedFormType = 'lead';
        }
        
        if (formTypeLeadRadio) formTypeLeadRadio.checked = (selectedFormType === 'lead');
        if (formTypeCheckinRadio) formTypeCheckinRadio.checked = (selectedFormType === 'checkin');
        if (enableWhatsappCheckbox) enableWhatsappCheckbox.checked = enableWhatsappValue;
        highlightFormType(selectedFormType);
        
        console.log('Y"~ [MODAL] Tipo de formulário carregado:', {
            selectedFormType,
            enableWhatsappValue,
            isCheckinMode
        });
        
        [formTypeLeadRadio, formTypeCheckinRadio].filter(Boolean).forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    highlightFormType(e.target.value);
                    console.log('Y"~ [MODAL] Tipo alterado para:', e.target.value);
                }
            });
        });
        
        // Carregar e configurar checkbox de lista de convidados (legado, se existir no modal)
        const guestListCheckbox = modal.querySelector('#modal-enable-guest-list-submit');
        if (guestListCheckbox) {
            guestListCheckbox.checked = isCheckinMode;
            guestListCheckbox.addEventListener('change', function() {
                console.log('Y"< [MODAL] Checkbox de lista de convidados alterado:', this.checked);
                setTimeout(() => {
                    if (typeof checkGuestListAndShowButtons === 'function') {
                        checkGuestListAndShowButtons();
                    }
                }, 100);
            });
        }
        
        // Salvar configurações
        modal.querySelector('.save-settings-modal-btn').addEventListener('click', async () => {
            // Salvar is_listed em variável global para uso no saveForm
            window.currentFormIsListed = isListedCheckbox.checked;
            
            // Tipo: Captação (lead) ou Check-in + checkbox WhatsApp
            const selectedFormType = modal.querySelector('input[name="modal-form-type"]:checked')?.value || 'lead';
            const alsoWhatsapp = !!modal.querySelector('#modal-settings-enable-whatsapp')?.checked;
            console.log('[MODAL] Tipo selecionado para salvar:', selectedFormType, 'whatsapp:', alsoWhatsapp);
            
            let enableWhatsappInput = document.getElementById('enable-whatsapp-value');
            let enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
            
            if (!enableWhatsappInput) {
                enableWhatsappInput = document.createElement('input');
                enableWhatsappInput.type = 'hidden';
                enableWhatsappInput.id = 'enable-whatsapp-value';
                document.body.appendChild(enableWhatsappInput);
            }
            
            if (!enableGuestListSubmitInput) {
                enableGuestListSubmitInput = document.createElement('input');
                enableGuestListSubmitInput.type = 'hidden';
                enableGuestListSubmitInput.id = 'enable-guest-list-submit-value';
                document.body.appendChild(enableGuestListSubmitInput);
            }
            
            const isCheckin = selectedFormType === 'checkin';
            const sendMode = isCheckin ? 'checkin' : 'lead';
            
            enableWhatsappInput.value = alsoWhatsapp ? 'true' : 'false';
            enableGuestListSubmitInput.value = isCheckin ? 'true' : 'false';
            window.enableWhatsappValue = alsoWhatsapp;
            window.enableGuestListSubmitValue = isCheckin;
            window.currentFormIsGuestList = isCheckin;
            
            const isGuestListModeInput = document.getElementById('is-guest-list-mode');
            if (isGuestListModeInput) isGuestListModeInput.value = isCheckin ? 'true' : 'false';
            
            // Salvar send_mode em input hidden
            let sendModeInput = document.getElementById('send-mode-value');
            if (!sendModeInput) {
                sendModeInput = document.createElement('input');
                sendModeInput.type = 'hidden';
                sendModeInput.id = 'send-mode-value';
                document.body.appendChild(sendModeInput);
            }
            sendModeInput.value = sendMode;
            
            console.log('o. [MODAL] Tipo de formulário salvo:', {
                formType: selectedFormType,
                sendMode: sendMode,
                enableWhatsapp: enableWhatsappInput.value,
                enableGuestListSubmit: enableGuestListSubmitInput.value
            });
            
            // Copiar valores do modal para os campos originais
            if (moduleTitleEl) moduleTitleEl.value = modal.querySelector('#modal-form-module-title').value;
            if (formTitleEl) formTitleEl.value = modal.querySelector('#modal-form-title').value;
            if (formDescEl) formDescEl.value = modal.querySelector('#modal-form-description').value;
            if (whatsappEl) whatsappEl.value = modal.querySelector('#modal-whatsapp-number').value;
            
            // Copiar valores de event_date, event_address e coordenadas
            const modalEventDate = modal.querySelector('#modal-event-date');
            const modalEventAddress = modal.querySelector('#modal-event-address');
            const modalEventAddressLat = modal.querySelector('#modal-event-address-lat');
            const modalEventAddressLon = modal.querySelector('#modal-event-address-lon');
            let eventDateEl = document.getElementById('event-date');
            let eventAddressEl = document.getElementById('event-address');
            let eventAddressLatEl = document.getElementById('event-address-lat');
            let eventAddressLonEl = document.getElementById('event-address-lon');
            
            // Criar inputs hidden se não existirem
            if (!eventDateEl) {
                eventDateEl = document.createElement('input');
                eventDateEl.type = 'hidden';
                eventDateEl.id = 'event-date';
                document.body.appendChild(eventDateEl);
            }
            if (!eventAddressEl) {
                eventAddressEl = document.createElement('input');
                eventAddressEl.type = 'hidden';
                eventAddressEl.id = 'event-address';
                document.body.appendChild(eventAddressEl);
            }
            if (!eventAddressLatEl) {
                eventAddressLatEl = document.createElement('input');
                eventAddressLatEl.type = 'hidden';
                eventAddressLatEl.id = 'event-address-lat';
                document.body.appendChild(eventAddressLatEl);
            }
            if (!eventAddressLonEl) {
                eventAddressLonEl = document.createElement('input');
                eventAddressLonEl.type = 'hidden';
                eventAddressLonEl.id = 'event-address-lon';
                document.body.appendChild(eventAddressLonEl);
            }
            
            if (modalEventDate && eventDateEl) {
                eventDateEl.value = modalEventDate.value || '';
                console.log('Y". [MODAL] event_date salvo:', eventDateEl.value);
            }
            if (modalEventAddress && eventAddressEl) {
                eventAddressEl.value = modalEventAddress.value.trim() || '';
                console.log('[MODAL] event_address salvo:', eventAddressEl.value);
            }
            if (modalEventAddressLat && eventAddressLatEl) {
                eventAddressLatEl.value = (modalEventAddressLat.value || '').trim();
            }
            if (modalEventAddressLon && eventAddressLonEl) {
                eventAddressLonEl.value = (modalEventAddressLon.value || '').trim();
            }
            
            // IMPORTANTE: Copiar valores de imagens (logo, banner, header, button_logo) dos inputs hidden
            // O logo-url já foi atualizado durante o upload, então só precisamos garantir que está sincronizado
            const modalLogoUrl = document.getElementById('logo-url');
            if (logoEl && modalLogoUrl) {
                logoEl.value = modalLogoUrl.value;
                console.log('o. [MODAL] Logo copiado para campo principal:', logoEl.value);
                
                // Atualizar preview principal se existir
                const mainLogoPreview = document.getElementById('logo-preview');
                const mainLogoUploadText = document.getElementById('logo-upload-text');
                const mainRemoveLogoBtn = document.getElementById('remove-logo-btn');
                if (logoEl.value) {
                    if (mainLogoPreview) {
                        mainLogoPreview.src = logoEl.value;
                        mainLogoPreview.style.display = 'block';
                    }
                    if (mainLogoUploadText) mainLogoUploadText.style.display = 'none';
                    if (mainRemoveLogoBtn) mainRemoveLogoBtn.style.display = 'block';
                } else {
                    if (mainLogoPreview) mainLogoPreview.style.display = 'none';
                    if (mainLogoUploadText) mainLogoUploadText.style.display = 'block';
                    if (mainRemoveLogoBtn) mainRemoveLogoBtn.style.display = 'none';
                }
            }
            
            // Garantir que button_logo_url está no input global (usado no save)
            const btnLogoUrlInput = document.getElementById('button-logo-url');
            if (buttonLogoEl && btnLogoUrlInput && (buttonLogoEl.value || '').trim()) {
                btnLogoUrlInput.value = (buttonLogoEl.value || '').trim();
                console.log('o. [MODAL] button_logo_url sincronizado:', btnLogoUrlInput.value);
            }
            
            // Copiar banner
            const modalBannerUrlElement = document.getElementById('banner-image-url');
            if (bannerEl && modalBannerUrlElement) {
                bannerEl.value = modalBannerUrlElement.value;
                console.log('o. [MODAL] Banner copiado para campo principal:', bannerEl.value);
            }
            
            // Copiar header
            const modalHeaderUrlElement = document.getElementById('header-image-url');
            if (headerEl && modalHeaderUrlElement) {
                headerEl.value = modalHeaderUrlElement.value;
                console.log('o. [MODAL] Header copiado para campo principal:', headerEl.value);
            }
            
            // IMPORTANTE: Copiar button_logo_size também
            const modalButtonLogoSize = modal.querySelector('#modal-button-logo-size');
            const modalButtonLogoSizeInput = modal.querySelector('#modal-button-logo-size-input');
            let buttonLogoSizeEl = document.getElementById('button-logo-size');
            if (!buttonLogoSizeEl) {
                buttonLogoSizeEl = document.createElement('input');
                buttonLogoSizeEl.type = 'hidden';
                buttonLogoSizeEl.id = 'button-logo-size';
                document.body.appendChild(buttonLogoSizeEl);
            }
            if (modalButtonLogoSizeInput && buttonLogoSizeEl) {
                buttonLogoSizeEl.value = modalButtonLogoSizeInput.value || modalButtonLogoSize?.value || '40';
                console.log('o. [MODAL] button_logo_size copiado:', buttonLogoSizeEl.value);
            }
            
            // Salvar configurações do botão do pastor e logo corner
            const enablePastorBtnEl = document.getElementById('enable-pastor-button');
            const pastorWhatsappEl = document.getElementById('pastor-whatsapp-number');
            const pastorButtonNameEl = document.getElementById('pastor-button-name');
            const showLogoCornerEl = document.getElementById('show-logo-corner');
            
            // Buscar elementos do modal
            const modalEnablePastorBtn = modal.querySelector('#modal-enable-pastor-button');
            const modalPastorWhatsappInput = modal.querySelector('#modal-pastor-whatsapp');
            const modalPastorButtonNameInput = modal.querySelector('#modal-pastor-button-name');
            const modalShowLogoCorner = modal.querySelector('#modal-show-logo-corner');
            
            if (enablePastorBtnEl && modalEnablePastorBtn) {
                enablePastorBtnEl.value = modalEnablePastorBtn.checked ? 'true' : 'false';
            }
            if (pastorWhatsappEl && modalPastorWhatsappInput) {
                pastorWhatsappEl.value = modalPastorWhatsappInput.value.trim() || '';
            }
            if (pastorButtonNameEl && modalPastorButtonNameInput) {
                pastorButtonNameEl.value = modalPastorButtonNameInput.value.trim() || 'Enviar Mensagem para o Pastor';
            }
            if (showLogoCornerEl && modalShowLogoCorner) {
                showLogoCornerEl.value = modalShowLogoCorner.checked ? 'true' : 'false';
            }
            
            // Tipo Captação/Check-in fica em Configurações (Tipo de Formulário)
            
            // Salvar logo se foi atualizado no modal
            // Logo já é salvo diretamente quando é feito upload no modal
            // Não precisa de ação adicional aqui
            
            // Salvar outras imagens se foram atualizadas (Background removido - está apenas em "Cores e Temas")
            // NOTA: Banner e header já foram copiados acima (linhas 6126-6137), não precisamos duplicar aqui
            // Background e opacidade agora estão apenas em "Cores e Temas"
            
            // Buscar elementos do modal para temas (verificar se existem antes de acessar)
            // Tema, cor primária e cor de texto agora estão apenas em "Cores e Temas"
            // Não precisamos mais atualizar esses campos aqui
            // Opacidade não está mais no modal de configurações - está em "Cores e Temas"
            
            const modalFormatEl = modal.querySelector('input[name="modal-display-format"]:checked');
            if (modalFormatEl && displayFormatEl) {
                displayFormatEl.value = modalFormatEl.value;
                const allFormatRadios = document.querySelectorAll('input[name="display-format"]');
                allFormatRadios.forEach(r => {
                    if (r.value === modalFormatEl.value) r.checked = true;
                    else r.checked = false;
                });
                // Mostrar/ocultar container de banner
                const bannerContainer = document.getElementById('banner-image-container');
                if (bannerContainer) {
                    bannerContainer.style.display = modalFormatEl.value === 'banner' ? 'block' : 'none';
                }
            }
            
            // Atualizar preview
            const previewTitle = document.getElementById('preview-title');
            const previewDescription = document.getElementById('preview-description');
            if (previewTitle && formTitleEl) previewTitle.textContent = formTitleEl.value || 'Formulário sem título';
            if (previewDescription && formDescEl) {
                previewDescription.textContent = formDescEl.value || 'Descrição do formulário';
                if (formDescEl.value) {
                    previewDescription.style.display = 'block';
                    const removeDescBtn = document.getElementById('remove-description-btn');
                    if (removeDescBtn) removeDescBtn.style.display = 'block';
                }
            }
            
            // Aplicar cores personalizadas (tema, cores e background agora estão apenas em "Cores e Temas")
            // Usar valores dos campos hidden que são atualizados em "Cores e Temas"
            const currentTheme = themeEl?.value || 'light';
            const currentPrimary = primaryColorEl?.value || '#4A90E2';
            const currentText = textColorEl?.value || '#333333';
            
            const currentSecondary = document.getElementById('secondary-color')?.value || null;
            applyCustomColors({
                theme: currentTheme,
                primary_color: currentPrimary,
                secondary_color: currentSecondary,
                text_color: currentText,
                background_image_url: backgroundEl?.value || '',
                background_opacity: opacityEl ? parseFloat(opacityEl.value) : 1.0
            });
            
            // Persistir configurações imediatamente no backend (logo do botão, Salvar na lista, etc.)
            const itemId = typeof currentItemId !== 'undefined' ? currentItemId : (window.currentItemId || null);
            if (itemId) {
                const btnLogoVal = (document.getElementById('button-logo-url')?.value || '').trim();
                const btnSizeVal = parseInt(document.getElementById('button-logo-size')?.value || modal.querySelector('#modal-button-logo-size-input')?.value || '40', 10);
                const guestListCheckbox = modal.querySelector('#modal-enable-guest-list-submit');
                const enableGL = enableGuestListSubmitInput.value === 'true' || enableGuestListSubmitInput.value === '1' || (guestListCheckbox && guestListCheckbox.checked);
                const enableWa = enableWhatsappInput.value === 'true' || enableWhatsappInput.value === '1';
                const showCorner = (document.getElementById('show-logo-corner')?.value === 'true') || (modal.querySelector('#modal-show-logo-corner')?.checked === true);
                const modalFormatChecked = modal.querySelector('input[name="modal-display-format"]:checked');
                const mainFormatChecked = document.querySelector('input[name="display-format"]:checked');
                const displayFormatValue = (modalFormatChecked?.value || mainFormatChecked?.value || 'button').toString().toLowerCase();
                const displayFormatFinal = displayFormatValue === 'banner' ? 'banner' : 'button';
                const bannerUrlRaw = (document.getElementById('banner-image-url')?.value || '').trim();
                const sendModeVal = document.getElementById('send-mode-value')?.value || (enableGL ? 'checkin' : 'lead');
                const configPayload = {
                    title: modal.querySelector('#modal-form-module-title')?.value ?? undefined,
                    form_title: modal.querySelector('#modal-form-title')?.value ?? undefined,
                    form_description: modal.querySelector('#modal-form-description')?.value ?? undefined,
                    whatsapp_number: (modal.querySelector('#modal-whatsapp-number')?.value || '').trim() || null,
                    display_format: displayFormatFinal,
                    banner_image_url: bannerUrlRaw || null,
                    header_image_url: (document.getElementById('header-image-url')?.value || '').trim() || null,
                    button_logo_url: (btnLogoVal && btnLogoVal !== 'null' && btnLogoVal !== 'undefined') ? btnLogoVal : null,
                    button_logo_size: (!isNaN(btnSizeVal) && btnSizeVal >= 20 && btnSizeVal <= 300) ? btnSizeVal : 40,
                    show_logo_corner: showCorner,
                    enable_whatsapp: enableWa,
                    enable_guest_list_submit: enableGL,
                    send_mode: sendModeVal,
                    event_date: eventDateEl?.value || null,
                    event_address: (eventAddressEl?.value || '').trim() || null,
                    event_address_lat: (document.getElementById('event-address-lat')?.value || '').trim() || null,
                    event_address_lon: (document.getElementById('event-address-lon')?.value || '').trim() || null
                };
                try {
                    const configRes = await fetch(`${API_URL}/api/profile/items/digital_form/${itemId}`, {
                        method: 'PUT',
                        headers: getHeaders(),
                        body: JSON.stringify(configPayload)
                    });
                    if (configRes.ok) {
                        if (typeof currentItemData !== 'undefined' && currentItemData) {
                            if (!currentItemData.digital_form_data) currentItemData.digital_form_data = {};
                            currentItemData.digital_form_data.enable_guest_list_submit = enableGL;
                            currentItemData.digital_form_data.enable_whatsapp = enableWa;
                            currentItemData.digital_form_data.send_mode = sendModeVal;
                        }
                        if (typeof updatePreviewButton === 'function') updatePreviewButton();
                        const sidebarResponsesBtn = document.getElementById('sidebar-responses') || document.getElementById('sidebar-guest-list');
                        const sidebarSpan = sidebarResponsesBtn?.querySelector('span');
                        if (sidebarSpan) {
                            sidebarSpan.textContent = enableGL ? 'Confirmação de Check-in' : 'Captação de Clientes';
                        }
                        if (typeof showSuccessMessage === 'function') {
                            showSuccessMessage('Configurações salvas com sucesso.');
                        } else {
                            alert('Configurações salvas com sucesso.');
                        }
                    } else {
                        const errData = await configRes.json().catch(() => ({}));
                        console.warn('s️ [MODAL] Erro ao persistir configurações:', errData);
                        if (typeof showSuccessMessage === 'function') {
                            showSuccessMessage('Configurações aplicadas localmente. Clique em "Salvar" para garantir.');
                        } else {
                            alert('Configurações aplicadas localmente. Clique em "Salvar" para garantir.');
                        }
                    }
                } catch (err) {
                    console.warn('s️ [MODAL] Erro ao persistir configurações:', err);
                    if (typeof showSuccessMessage === 'function') {
                        showSuccessMessage('Configurações aplicadas localmente. Clique em "Salvar" para garantir.');
                    } else {
                        alert('Configurações aplicadas localmente. Clique em "Salvar" para garantir.');
                    }
                }
            } else {
                if (typeof showSuccessMessage === 'function') {
                    showSuccessMessage('Configurações atualizadas! Clique em "Salvar" para salvar as alterações.');
                } else {
                    alert('Configurações atualizadas! Clique em "Salvar" para salvar as alterações.');
                }
            }
            
            // Atualizar seção de Links da Portaria após salvar
            setTimeout(() => {
                if (typeof window.checkGuestListAndShowButtons === 'function') {
                    window.checkGuestListAndShowButtons();
                }
            }, 300);
            
            // Fechar modal
            modal.remove();
        });
        
        // Uploads de imagens no modal
        setupModalImageUploads(modal);
        
        // Opacidade slider removido (está apenas em "Cores e Temas")
        
        // Mostrar/ocultar banner container
        modal.querySelectorAll('input[name="modal-display-format"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const bannerContainer = modal.querySelector('#modal-banner-image-container');
                if (bannerContainer) {
                    bannerContainer.style.display = radio.value === 'banner' ? 'block' : 'none';
                }
            });
        });
    }
    
    // Função para abrir modal de Lista de Convidados
    async function openGuestListModal() {
        const modal = document.createElement('div');
        modal.className = 'guest-list-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.innerHTML = `
            <div style="background: var(--card-background-color, #1C1C21); padding: 40px; border-radius: 16px; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border-color, #2C2C2F); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h3 style="margin: 0; color: var(--text, #ECECEC); font-size: 24px; font-weight: 700;">
                        <i class="fas fa-users" style="color: var(--dourado-principal, #FFC700);"></i> Lista de Convidados
                    </h3>
                    <button class="close-guest-list-modal-btn" style="background: none; border: none; color: var(--text-dark, #A1A1A1); font-size: 24px; cursor: pointer; padding: 5px 10px; border-radius: 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div id="guest-list-modal-content" style="min-height: 200px;">
                    <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <p>Carregando listas de convidados...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar modal
        modal.querySelector('.close-guest-list-modal-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Carregar listas de convidados
        try {
            const token = localStorage.getItem('conectaKingToken');
            if (!token) {
                contentDiv.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #FF9800;"></i>
                        <h4 style="color: var(--text, #ECECEC); margin-bottom: 12px;">Sessão expirada</h4>
                        <p>Por favor, faça login novamente.</p>
                        <button onclick="window.location.href='/login'; modal.remove();" style="background: linear-gradient(135deg, #FFC700, #FFA500); color: #000; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 16px;">
                            Ir para Login
                        </button>
                    </div>
                `;
                return;
            }
            
            console.log('Carregando listas de convidados...');
            const response = await fetch(`${API_URL}/api/guest-lists`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('O Erro na API:', response.status, errorText);
                throw new Error(`Erro ao carregar listas: ${response.status}`);
            }
            
            const lists = await response.json();
            console.log('o. Listas carregadas:', lists.length, lists);
            const contentDiv = document.getElementById('guest-list-modal-content');
            
            // Calcular estatísticas gerais
            const generalStats = lists.reduce((acc, list) => {
                const total = parseInt(list.registered_count || 0) + parseInt(list.confirmed_count || 0) + parseInt(list.checked_in_count || 0);
                acc.total += total;
                acc.registered += parseInt(list.registered_count || 0);
                acc.confirmed += parseInt(list.confirmed_count || 0);
                acc.checked_in += parseInt(list.checked_in_count || 0);
                return acc;
            }, { total: 0, registered: 0, confirmed: 0, checked_in: 0 });
            
            if (lists.length === 0) {
                contentDiv.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-users" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3; color: var(--dourado-principal, #FFC700);"></i>
                        <h4 style="color: var(--text, #ECECEC); margin-bottom: 12px; font-size: 24px;">Nenhuma lista criada ainda</h4>
                        <p style="margin-bottom: 32px; font-size: 16px; color: var(--text-dark, #A1A1A1);">Crie uma lista de convidados no dashboard para começar a gerenciar convidados, confirmações e presenças.</p>
                        <button onclick="const modalEl = document.querySelector('.guest-list-modal'); if(modalEl) modalEl.remove(); window.location.href='/dashboard#guest-list-editor';" style="background: linear-gradient(135deg, #FFC700, #FFA500); color: #000; border: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                            <i class="fas fa-plus"></i> Ir para Dashboard
                        </button>
                    </div>
                `;
                return;
            }
            
            // Obter domínio base para links
            const shortDomain = window.location.hostname.includes('localhost') 
                ? window.location.origin 
                : 'https://tag.conectaking.com.br';
            
            // Renderizar estatísticas gerais
            let statsHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px;">
                    <div style="background: linear-gradient(135deg, rgba(255,199,0,0.1), rgba(255,199,0,0.05)); border: 1px solid rgba(255,199,0,0.2); border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 800; color: var(--dourado-principal, #FFC700); margin-bottom: 8px;">${lists.length}</div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Listas Criadas</div>
                    </div>
                    <div style="background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 800; color: var(--dourado-principal, #FFC700); margin-bottom: 8px;">${generalStats.total}</div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Total de Convidados</div>
                    </div>
                    <div style="background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 800; color: #4CAF50; margin-bottom: 8px;">${generalStats.confirmed}</div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Confirmados</div>
                    </div>
                    <div style="background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 800; color: #2196F3; margin-bottom: 8px;">${generalStats.checked_in}</div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Conferidos</div>
                    </div>
                </div>
            `;
            
            // Renderizar cada lista
            let listsHTML = lists.map(list => {
                const eventDate = list.event_date ? new Date(list.event_date).toLocaleDateString('pt-BR') : 'Não definido';
                const registered = parseInt(list.registered_count || 0);
                const confirmed = parseInt(list.confirmed_count || 0);
                const checkedIn = parseInt(list.checked_in_count || 0);
                const total = registered + confirmed + checkedIn;
                const missing = Math.max(0, confirmed - checkedIn); // Convidados confirmados que faltam
                
                const confirmationLink = list.confirmation_token 
                    ? `${shortDomain}/guest-list/confirm/${list.confirmation_token}` 
                    : 'Token não gerado';
                const registrationLink = list.registration_token 
                    ? `${shortDomain}/guest-list/register/${list.registration_token}` 
                    : 'Token não gerado';
                const confirmedLink = list.confirmation_token 
                    ? `${shortDomain}/guest-list/view-confirmed/${list.confirmation_token}` 
                    : 'Token não gerado';
                
                return `
                    <div style="background: var(--background-color, #0D0D0F); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                            <div style="flex: 1;">
                                <h4 style="color: var(--text, #ECECEC); margin: 0 0 8px 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-users" style="color: var(--dourado-principal, #FFC700);"></i>
                                    ${list.event_title || list.title || 'Lista de Convidados'}
                                </h4>
                                <p style="color: var(--text-dark, #A1A1A1); margin: 4px 0; font-size: 14px;">
                                    <i class="fas fa-calendar" style="margin-right: 6px;"></i> ${eventDate}
                                </p>
                                ${list.event_location ? `
                                    <p style="color: var(--text-dark, #A1A1A1); margin: 4px 0; font-size: 14px;">
                                        <i class="fas fa-map-marker-alt" style="margin-right: 6px;"></i> ${list.event_location}
                                    </p>
                                ` : ''}
                            </div>
                            <button onclick="const modalEl = document.querySelector('.guest-list-modal'); if(modalEl) modalEl.remove(); window.location.href='/guestListEdit?itemId=${list.id}';" style="background: linear-gradient(135deg, #FFC700, #FFA500); color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                <i class="fas fa-edit"></i> Gerenciar
                            </button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                            <div style="text-align: center; padding: 12px; background: rgba(255,199,0,0.1); border-radius: 8px; border: 1px solid rgba(255,199,0,0.2);">
                                <div style="font-size: 24px; font-weight: 800; color: var(--dourado-principal, #FFC700);">${registered}</div>
                                <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Cadastrados</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: rgba(76,175,80,0.1); border-radius: 8px; border: 1px solid rgba(76,175,80,0.2);">
                                <div style="font-size: 24px; font-weight: 800; color: #4CAF50;">${confirmed}</div>
                                <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Confirmados</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: rgba(33,150,243,0.1); border-radius: 8px; border: 1px solid rgba(33,150,243,0.2);">
                                <div style="font-size: 24px; font-weight: 800; color: #2196F3;">${checkedIn}</div>
                                <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Conferidos</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: rgba(244,67,54,0.1); border-radius: 8px; border: 1px solid rgba(244,67,54,0.2);">
                                <div style="font-size: 24px; font-weight: 800; color: #F44336;">${missing}</div>
                                <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Faltam</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                                <div style="font-size: 24px; font-weight: 800; color: var(--dourado-principal, #FFC700);">${total}</div>
                                <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Total</div>
                            </div>
                        </div>
                        
                        <div style="border-top: 1px solid var(--border-color, #2C2C2F); padding-top: 20px;">
                            <h5 style="color: var(--text, #ECECEC); font-weight: 600; margin-bottom: 16px; font-size: 16px;">
                                <i class="fas fa-link" style="color: var(--dourado-principal, #FFC700); margin-right: 8px;"></i> Links Personalizados
                            </h5>
                            <div style="display: grid; gap: 16px;">
                                <div>
                                    <label style="display: block; color: var(--text, #ECECEC); font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                                        <i class="fas fa-user-plus" style="color: #2196F3; margin-right: 6px;"></i> Link de Inscrição
                                    </label>
                                    <div style="display: flex; gap: 8px;">
                                        <input type="text" value="${registrationLink}" readonly style="flex: 1; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; color: var(--text, #ECECEC); font-size: 13px; font-family: monospace;">
                                        <button onclick="copyLink('${registrationLink}', this)" style="background: #2196F3; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label style="display: block; color: var(--text, #ECECEC); font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                                        <i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 6px;"></i> Link de Confirmação
                                    </label>
                                    <div style="display: flex; gap: 8px;">
                                        <input type="text" value="${confirmationLink}" readonly style="flex: 1; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; color: var(--text, #ECECEC); font-size: 13px; font-family: monospace;">
                                        <button onclick="copyLink('${confirmationLink}', this)" style="background: #4CAF50; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label style="display: block; color: var(--text, #ECECEC); font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                                        <i class="fas fa-eye" style="color: #9C27B0; margin-right: 6px;"></i> Link para Ver Convidados Confirmados
                                    </label>
                                    <div style="display: flex; gap: 8px;">
                                        <input type="text" value="${confirmedLink}" readonly style="flex: 1; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; color: var(--text, #ECECEC); font-size: 13px; font-family: monospace;">
                                        <button onclick="copyLink('${confirmedLink}', this)" style="background: #9C27B0; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            contentDiv.innerHTML = statsHTML + listsHTML;
            
            // Função para copiar link
            window.copyLink = function(link, btn) {
                if (link && !link.includes('não gerado')) {
                    navigator.clipboard.writeText(link).then(() => {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i>';
                        btn.style.background = '#4CAF50';
                        setTimeout(() => {
                            btn.innerHTML = originalHTML;
                            btn.style.background = '';
                        }, 2000);
                    }).catch(() => {
                        alert('Erro ao copiar link');
                    });
                } else {
                    alert('Link não disponível');
                }
            };
            
        } catch (error) {
            console.error('Erro ao carregar listas:', error);
            document.getElementById('guest-list-modal-content').innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #FF9800;"></i>
                    <h4 style="color: var(--text, #ECECEC); margin-bottom: 12px;">Erro ao carregar listas</h4>
                    <p>${error.message}</p>
                </div>
            `;
        }
        
        window.scrollTo(0, 0);
    }
    
    // Função para configurar uploads de imagens no modal de configurações
    function setupModalImageUploads(modal) {
        // Logo
        const logoUploadArea = modal.querySelector('#modal-logo-upload-area');
        const logoFileInput = modal.querySelector('#modal-logo-file-input');
        const logoEl = document.getElementById('logo-url');
        if (logoUploadArea && logoFileInput) {
            logoUploadArea.addEventListener('click', () => {
                console.log('[UPLOAD] Clicou na área de upload do logo');
                logoFileInput.click();
            });
            logoFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    console.log('[UPLOAD] Arquivo selecionado para logo:', file.name, file.size);
                    function applyLogoUrl(imageUrl) {
                        if (!imageUrl) return;
                        if (logoEl) {
                            logoEl.value = imageUrl;
                            console.log('o. [UPLOAD] Input logo-url atualizado:', imageUrl);
                        }
                        const logoPreview = modal.querySelector('#modal-logo-preview');
                        const logoUploadText = modal.querySelector('#modal-logo-upload-text');
                        const removeLogoBtn = modal.querySelector('#modal-remove-logo-btn');
                        if (logoPreview) {
                            logoPreview.src = imageUrl;
                            logoPreview.style.display = 'block';
                            logoPreview.style.maxWidth = '200px';
                            logoPreview.style.maxHeight = '200px';
                            logoPreview.style.borderRadius = '8px';
                            logoPreview.style.marginBottom = '15px';
                        }
                        if (logoUploadText) logoUploadText.style.display = 'none';
                        if (removeLogoBtn) removeLogoBtn.style.display = 'block';
                        const mainLogoPreview = document.getElementById('logo-preview');
                        const mainLogoUploadText = document.getElementById('logo-upload-text');
                        const mainRemoveLogoBtn = document.getElementById('remove-logo-btn');
                        if (mainLogoPreview) {
                            mainLogoPreview.src = imageUrl;
                            mainLogoPreview.style.display = 'block';
                            mainLogoPreview.style.maxWidth = '200px';
                            mainLogoPreview.style.maxHeight = '200px';
                            mainLogoPreview.style.borderRadius = '8px';
                            mainLogoPreview.style.marginBottom = '15px';
                        }
                        if (mainLogoUploadText) mainLogoUploadText.style.display = 'none';
                        if (mainRemoveLogoBtn) mainRemoveLogoBtn.style.display = 'block';
                        showSuccessMessage('Logo atualizado com sucesso!');
                        e.target.value = '';
                    }
                    if (typeof ImageCropModal !== 'undefined' && ImageCropModal.open) {
                        ImageCropModal.open(file, { aspectRatio: 1, apiBase: API_URL }, (url, errMsg) => {
                            if (url) applyLogoUrl(url);
                            else alert(errMsg || 'Erro ao fazer upload da imagem.');
                        });
                    } else {
                        const imageUrl = await handleImageUploadForModal(file, 'logo');
                        if (imageUrl) applyLogoUrl(imageUrl);
                        else alert('Erro ao fazer upload da imagem. Tente novamente.');
                    }
                } else {
                    console.log('s️ [UPLOAD] Nenhum arquivo selecionado');
                }
            });
            
            // Event listener para botão remover logo
            const removeLogoBtn = modal.querySelector('#modal-remove-logo-btn');
            if (removeLogoBtn) {
                removeLogoBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[UPLOAD] Removendo logo');
                    
                    // Limpar valor do input hidden
                    if (logoEl) {
                        logoEl.value = '';
                        console.log('o. [UPLOAD] Input logo-url limpo');
                    }
                    
                    // Esconder preview no modal
                    const logoPreview = modal.querySelector('#modal-logo-preview');
                    const logoUploadText = modal.querySelector('#modal-logo-upload-text');
                    if (logoPreview) {
                        logoPreview.src = '';
                        logoPreview.style.display = 'none';
                    }
                    if (logoUploadText) logoUploadText.style.display = 'block';
                    removeLogoBtn.style.display = 'none';
                    
                    // Esconder preview principal também
                    const mainLogoPreview = document.getElementById('logo-preview');
                    const mainLogoUploadText = document.getElementById('logo-upload-text');
                    const mainRemoveLogoBtn = document.getElementById('remove-logo-btn');
                    if (mainLogoPreview) mainLogoPreview.style.display = 'none';
                    if (mainLogoUploadText) mainLogoUploadText.style.display = 'block';
                    if (mainRemoveLogoBtn) mainRemoveLogoBtn.style.display = 'none';
                    
                    // Limpar input file
                    if (logoFileInput) logoFileInput.value = '';
                    
                    console.log('o. [UPLOAD] Logo removido');
                });
            } else {
                console.warn('s️ [UPLOAD] Botão remover logo não encontrado no modal');
            }
        } else {
            console.error('O [UPLOAD] Elementos de upload de logo não encontrados:', {
                logoUploadArea: !!logoUploadArea,
                logoFileInput: !!logoFileInput,
                logoEl: !!logoEl
            });
        }
        
        // Button Logo
        const buttonLogoUploadArea = modal.querySelector('#modal-button-logo-upload-area');
        const buttonLogoFileInput = modal.querySelector('#modal-button-logo-file-input');
        const buttonLogoEl = document.getElementById('button-logo-url');
        if (buttonLogoUploadArea && buttonLogoFileInput) {
            buttonLogoUploadArea.addEventListener('click', () => buttonLogoFileInput.click());
            buttonLogoFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    function applyButtonLogoUrl(imageUrl) {
                        if (!imageUrl) return;
                        if (buttonLogoEl) {
                            buttonLogoEl.value = imageUrl;
                        } else {
                            const newButtonLogoEl = document.createElement('input');
                            newButtonLogoEl.type = 'hidden';
                            newButtonLogoEl.id = 'button-logo-url';
                            newButtonLogoEl.value = imageUrl;
                            document.body.appendChild(newButtonLogoEl);
                        }
                        const buttonLogoPreview = modal.querySelector('#modal-button-logo-preview');
                        const buttonLogoUploadText = modal.querySelector('#modal-button-logo-upload-text');
                        const removeButtonLogoBtn = modal.querySelector('#modal-remove-button-logo-btn');
                        if (buttonLogoPreview) { buttonLogoPreview.src = imageUrl; buttonLogoPreview.style.display = 'block'; }
                        if (buttonLogoUploadText) buttonLogoUploadText.style.display = 'none';
                        if (removeButtonLogoBtn) removeButtonLogoBtn.style.display = 'block';
                        e.target.value = '';
                    }
                    if (typeof ImageCropModal !== 'undefined' && ImageCropModal.open) {
                        ImageCropModal.open(file, { aspectRatio: 1, apiBase: API_URL }, (url, errMsg) => {
                            if (url) applyButtonLogoUrl(url);
                            else alert(errMsg || 'Erro ao fazer upload da logo do botão.');
                        });
                    } else {
                        const imageUrl = await handleImageUploadForModal(file, 'button_logo');
                        if (imageUrl) applyButtonLogoUrl(imageUrl);
                        else alert('Erro ao fazer upload da logo do botão. Tente novamente.');
                    }
                }
            });
        }
        
        // Botão remover button logo
        const removeButtonLogoBtn = modal.querySelector('#modal-remove-button-logo-btn');
        if (removeButtonLogoBtn) {
            removeButtonLogoBtn.addEventListener('click', () => {
                if (buttonLogoEl) buttonLogoEl.value = '';
                const buttonLogoPreview = modal.querySelector('#modal-button-logo-preview');
                const buttonLogoUploadText = modal.querySelector('#modal-button-logo-upload-text');
                if (buttonLogoPreview) buttonLogoPreview.style.display = 'none';
                if (buttonLogoUploadText) buttonLogoUploadText.style.display = 'block';
                removeButtonLogoBtn.style.display = 'none';
            });
        }
        
        // Banner, Header (Background removido - está apenas em "Cores e Temas")
        ['banner', 'header'].forEach(type => {
            const uploadArea = modal.querySelector(`#modal-${type}-upload-area`);
            const fileInput = modal.querySelector(`#modal-${type}-file-input`);
            const hiddenEl = document.getElementById(type === 'background' ? 'background-image-url' : `${type}-image-url`);
            
            if (uploadArea && fileInput) {
                uploadArea.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    function applyBannerOrHeaderUrl(imageUrl) {
                        if (!imageUrl || !hiddenEl) return;
                        hiddenEl.value = imageUrl;
                        const preview = modal.querySelector(`#modal-${type}-preview`);
                        const uploadText = modal.querySelector(`#modal-${type}-upload-text`);
                        const removeBtn = modal.querySelector(`#modal-remove-${type}-btn`);
                        if (preview) { preview.src = imageUrl; preview.style.display = 'block'; }
                        if (uploadText) uploadText.style.display = 'none';
                        if (removeBtn) removeBtn.style.display = 'block';
                        if (type === 'banner') {
                            const container = modal.querySelector('#modal-banner-image-container');
                            if (container) container.style.display = 'block';
                        }
                        e.target.value = '';
                    }
                    const useCrop = type === 'banner' && typeof ImageCropModal !== 'undefined' && ImageCropModal.open;
                    if (useCrop) {
                        ImageCropModal.open(file, { aspectRatio: 16 / 9, apiBase: API_URL }, (url, errMsg) => {
                            if (url) applyBannerOrHeaderUrl(url);
                            else alert(errMsg || 'Erro ao fazer upload da imagem.');
                        });
                    } else {
                        const imageUrl = await handleImageUploadForModal(file, type);
                        if (imageUrl) applyBannerOrHeaderUrl(imageUrl);
                    }
                });
            }
            
            // Botão remover
            const removeBtn = modal.querySelector(`#modal-remove-${type}-btn`);
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    if (hiddenEl) hiddenEl.value = '';
                    const preview = modal.querySelector(`#modal-${type}-preview`);
                    const uploadText = modal.querySelector(`#modal-${type}-upload-text`);
                    if (preview) preview.style.display = 'none';
                    if (uploadText) uploadText.style.display = 'block';
                    removeBtn.style.display = 'none';
                });
            }
        });
    }
    
    // Função auxiliar para upload de imagem no modal
    async function handleImageUploadForModal(file, imageType) {
        if (!file) {
            console.error('O [UPLOAD] Arquivo não fornecido');
            alert('Nenhum arquivo selecionado.');
            return null;
        }
        
        if (!file.type.match(/^image\/(png|jpeg|jpg|gif|webp)$/)) {
            alert('Apenas imagens são permitidas (PNG, JPG, GIF ou WEBP).');
            return null;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return null;
        }
        
        console.log(`[UPLOAD] Iniciando upload de ${imageType}:`, {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });
        
        // Mostrar loading no elemento de upload correspondente
        const loadingElement = document.querySelector(`#modal-${imageType}-upload-area .upload-loader, #modal-${imageType === 'logo' ? 'logo' : imageType}-upload-area .upload-loader`);
        if (loadingElement) {
            loadingElement.style.display = 'block';
            loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        }
        
        try {
            const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: getHeaders()
            });
            
            if (!authResponse.ok) {
                const errorText = await authResponse.text();
                console.error('O [UPLOAD] Erro na autenticação:', errorText);
                throw new Error('Falha ao obter autorização para upload. Verifique sua conexão e tente novamente.');
            }
            
            const authData = await authResponse.json();
            console.log('o. [UPLOAD] Autenticação OK:', authData);
            
            if (!authData.uploadURL) {
                throw new Error('URL de upload não recebida do servidor.');
            }
            
            const uploadURL = authData.uploadURL;
            const accountHash = authData.accountHash || authData.imageId; // Usar accountHash ou imageId como fallback
            
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('[UPLOAD] Enviando para Cloudflare:', uploadURL);
            const uploadResponse = await fetch(uploadURL, {
                method: 'POST',
                body: formData,
                headers: getAuthHeadersOnly()
            });
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('O [UPLOAD] Erro no upload para Cloudflare:', errorText);
                throw new Error(`Falha no upload da imagem. Status: ${uploadResponse.status}`);
            }
            
            const uploadData = await uploadResponse.json();
            console.log('o. [UPLOAD] Resposta do Cloudflare:', uploadData);
            
            // Cloudflare retorna a imagem em diferentes formatos após upload direto
            // O upload direto retorna { success: true, result: { id: "...", variants: ["url1", "url2"] } }
            let imageUrl = null;
            
            // Tentar diferentes formatos de resposta do Cloudflare
            if (uploadData.success && uploadData.result) {
                // Formato padrão: { success: true, result: { id: "...", variants: ["url1", "url2"] } }
                if (uploadData.result.variants && uploadData.result.variants.length > 0) {
                    imageUrl = uploadData.result.variants[0];
                    console.log('o. [UPLOAD] URL obtida de variants:', imageUrl);
                } else if (uploadData.result.url) {
                    imageUrl = uploadData.result.url;
                    console.log('o. [UPLOAD] URL obtida de result.url:', imageUrl);
                } else if (uploadData.result.id) {
                    // Se tiver apenas o ID, buscar a URL completa do backend
                    console.log('Y"" [UPLOAD] Buscando URL completa usando imageId:', uploadData.result.id);
                    try {
                        const imageIdResponse = await fetch(`${API_URL}/api/upload/get-url/${uploadData.result.id}`, {
                            headers: getHeaders()
                        });
                        if (imageIdResponse.ok) {
                            const imageUrlData = await imageIdResponse.json();
                            imageUrl = imageUrlData.url || imageUrlData.imageUrl;
                            console.log('o. [UPLOAD] URL obtida do endpoint get-url:', imageUrl);
                        }
                    } catch (getUrlError) {
                        console.warn('s️ [UPLOAD] Erro ao buscar URL do endpoint, usando imageId direto:', getUrlError);
                    }
                    
                    // Se ainda não tiver URL, usar o imageId da autenticação
                    if (!imageUrl && authData.imageId) {
                        imageUrl = `https://imagedelivery.net/${authData.imageId}/public`;
                        console.log('s️ [UPLOAD] Usando imageId da autenticação para construir URL:', imageUrl);
                    }
                }
            } else if (uploadData.url) {
                imageUrl = uploadData.url;
                console.log('o. [UPLOAD] URL obtida diretamente:', imageUrl);
            } else if (uploadData.imageUrl) {
                imageUrl = uploadData.imageUrl;
                console.log('o. [UPLOAD] URL obtida de imageUrl:', imageUrl);
            }
            
            if (!imageUrl) {
                console.error('O [UPLOAD] URL da imagem não encontrada na resposta:', uploadData);
                    // ltimo recurso: usar o imageId da autenticação ou do resultado do upload
                    if (uploadData.result?.id || authData.imageId) {
                        const imageIdToUse = uploadData.result?.id || authData.imageId;
                        if (accountHash) {
                            imageUrl = `https://imagedelivery.net/${accountHash}/${imageIdToUse}/public`;
                        } else {
                            // Tentar usar apenas o imageId - Cloudflare pode redirecionar
                            imageUrl = `https://imagedelivery.net/${imageIdToUse}/public`;
                        }
                        console.log('s️ [UPLOAD] Usando imageId como fallback para construir URL:', imageUrl);
                    } else {
                        throw new Error('URL da imagem não foi retornada pelo servidor. Tente novamente.');
                    }
                }
            
            console.log('o. [UPLOAD] Upload concluído com sucesso:', imageUrl);
            
            // Esconder loading
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            return imageUrl;
        } catch (error) {
            console.error('O [UPLOAD] Erro ao fazer upload:', error);
            alert('Erro ao fazer upload da imagem: ' + (error.message || 'Erro desconhecido'));
            
            // Esconder loading em caso de erro
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            return null;
        }
    }
    
    // Função para importar pergunta de templates ou outros formulários
    async function importQuestion() {
        try {
            // Buscar todos os formulários do usuário para importar perguntas
            const response = await fetch(`${API_URL}/api/profile`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Erro ao carregar formulários');
            }
            
            const data = await response.json();
            const forms = data.items.filter(i => i.item_type === 'digital_form' && String(i.id) !== String(currentItemId));
            
            // Templates de perguntas pré-definidas (EXPANDIDO)
            const questionTemplates = [
                // Informações Pessoais
                {
                    label: 'Nome completo',
                    type: 'short_text',
                    required: true,
                    placeholder: 'Digite seu nome completo'
                },
                {
                    label: 'Email',
                    type: 'email',
                    required: true,
                    placeholder: 'seu@email.com'
                },
                {
                    label: 'Telefone/WhatsApp',
                    type: 'phone',
                    required: false,
                    placeholder: '(00) 00000-0000'
                },
                {
                    label: 'Data de nascimento',
                    type: 'date',
                    required: false
                },
                {
                    label: 'CPF',
                    type: 'short_text',
                    required: false,
                    placeholder: '000.000.000-00'
                },
                {
                    label: 'RG',
                    type: 'short_text',
                    required: false,
                    placeholder: '00.000.000-0'
                },
                {
                    label: 'Endereço completo',
                    type: 'paragraph',
                    required: false,
                    placeholder: 'Rua, número, complemento, bairro, cidade, CEP'
                },
                {
                    label: 'Cidade',
                    type: 'short_text',
                    required: false,
                    placeholder: 'Nome da cidade'
                },
                {
                    label: 'Estado',
                    type: 'dropdown',
                    required: false,
                    options: ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
                },
                {
                    label: 'CEP',
                    type: 'short_text',
                    required: false,
                    placeholder: '00000-000'
                },
                // Informações Profissionais
                {
                    label: 'Profissão',
                    type: 'short_text',
                    required: false,
                    placeholder: 'Sua profissão'
                },
                {
                    label: 'Empresa onde trabalha',
                    type: 'short_text',
                    required: false,
                    placeholder: 'Nome da empresa'
                },
                {
                    label: 'Cargo/Função',
                    type: 'short_text',
                    required: false,
                    placeholder: 'Seu cargo'
                },
                {
                    label: 'Área de atuação',
                    type: 'multiple_choice',
                    required: false,
                    options: ['Tecnologia', 'Saúde', 'Educação', 'Comércio', 'Serviços', 'Indústria', 'Outro']
                },
                // Informações Religiosas/Igreja
                {
                    label: '? membro de alguma igreja?',
                    type: 'yes_no',
                    required: false
                },
                {
                    label: 'Nome da igreja',
                    type: 'short_text',
                    required: false,
                    placeholder: 'Nome da sua igreja'
                },
                {
                    label: 'Tempo como cristão',
                    type: 'multiple_choice',
                    required: false,
                    options: ['Menos de 1 ano', '1-3 anos', '3-5 anos', '5-10 anos', 'Mais de 10 anos']
                },
                {
                    label: 'Já foi batizado?',
                    type: 'yes_no',
                    required: false
                },
                {
                    label: 'Data do batismo',
                    type: 'date',
                    required: false
                },
                {
                    label: 'Tem interesse em ser batizado?',
                    type: 'yes_no',
                    required: false
                },
                {
                    label: 'Participa de algum ministério?',
                    type: 'yes_no',
                    required: false
                },
                {
                    label: 'Qual ministério?',
                    type: 'multiple_choice',
                    required: false,
                    options: ['Louvor', 'Intercessão', 'Crianças', 'Jovens', 'Mulheres', 'Homens', 'Células', 'Evangelismo', 'Outro']
                },
                {
                    label: 'Tem interesse em participar de algum ministério?',
                    type: 'checkbox',
                    required: false,
                    options: ['Louvor', 'Intercessão', 'Crianças', 'Jovens', 'Mulheres', 'Homens', 'Células', 'Evangelismo', 'Outro']
                },
                // Informações de Contato/Interesse
                {
                    label: 'Como você conheceu?',
                    type: 'multiple_choice',
                    required: false,
                    options: ['Google', 'Redes sociais', 'Indicação de amigo', 'Panfleto', 'Evento', 'Outro']
                },
                {
                    label: 'Quem indicou?',
                    type: 'short_text',
                    required: false,
                    placeholder: 'Nome da pessoa que indicou'
                },
                {
                    label: 'Tem interesse em receber uma visita?',
                    type: 'yes_no',
                    required: false
                },
                {
                    label: 'Melhor horário para contato',
                    type: 'multiple_choice',
                    required: false,
                    options: ['Manhã (8h-12h)', 'Tarde (12h-18h)', 'Noite (18h-22h)', 'Qualquer horário']
                },
                {
                    label: 'Prefere contato por',
                    type: 'checkbox',
                    required: false,
                    options: ['WhatsApp', 'Telefone', 'Email', 'Presencial']
                },
                // Pedidos de Oração
                {
                    label: 'Tem algum pedido de oração?',
                    type: 'yes_no',
                    required: false
                },
                {
                    label: 'Descreva seu pedido de oração',
                    type: 'paragraph',
                    required: false,
                    placeholder: 'Compartilhe conosco seu pedido de oração...'
                },
                {
                    label: 'Tipo de necessidade',
                    type: 'multiple_choice',
                    required: false,
                    options: ['Saúde', 'Familiar', 'Financeira', 'Emocional', 'Espiritual', 'Profissional', 'Outro']
                },
                // Eventos e Atividades
                {
                    label: 'Tem interesse em participar de eventos?',
                    type: 'yes_no',
                    required: false
                },
                {
                    label: 'Quais eventos tem interesse?',
                    type: 'checkbox',
                    required: false,
                    options: ['Cultos', 'Células', 'Escola Bíblica', 'Eventos de Jovens', 'Eventos de Crianças', 'Retiros', 'Conferências']
                },
                {
                    label: 'Disponibilidade para eventos',
                    type: 'checkbox',
                    required: false,
                    options: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
                },
                // Feedback e Avaliação
                {
                    label: 'Como você avalia nossa igreja?',
                    type: 'multiple_choice',
                    required: false,
                    options: ['Excelente', 'Muito boa', 'Boa', 'Regular', 'Ruim']
                },
                {
                    label: 'Qual seu nível de satisfação?',
                    type: 'linear_scale',
                    required: false,
                    min_label: 'Muito insatisfeito',
                    max_label: 'Muito satisfeito',
                    min_value: 1,
                    max_value: 5
                },
                {
                    label: 'O que mais gostou?',
                    type: 'paragraph',
                    required: false,
                    placeholder: 'Compartilhe o que mais chamou sua atenção...'
                },
                {
                    label: 'Sugestões de melhoria',
                    type: 'paragraph',
                    required: false,
                    placeholder: 'Tem alguma sugestão para melhorarmos?'
                },
                // Termos e Condições
                {
                    label: 'Termos e condições',
                    type: 'checkbox',
                    required: true,
                    options: ['Aceito os termos e condições']
                },
                {
                    label: 'Autorizo o uso dos meus dados',
                    type: 'checkbox',
                    required: true,
                    options: ['Autorizo o uso dos meus dados para contato']
                },
                {
                    label: 'Deseja receber notificações?',
                    type: 'checkbox',
                    required: false,
                    options: ['Email', 'WhatsApp', 'SMS']
                }
            ];
            
            // Criar modal de seleção
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
            modal.innerHTML = `
                <div style="background: #1C1C21; padding: 30px; border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; color: #ECECEC;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 24px; font-weight: 700;">Importar Pergunta</h3>
                        <button class="close-import-modal" style="background: none; border: none; color: #A1A1A1; font-size: 24px; cursor: pointer; padding: 5px 10px;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h4 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Templates de Perguntas</h4>
                        <div id="templates-list" style="display: grid; gap: 12px;">
                            ${questionTemplates.map((template, index) => `
                                <div class="template-item" data-template-index="${index}" style="padding: 16px; background: #2C2C2F; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">${template.label}</div>
                                    <div style="font-size: 12px; color: #A1A1A1;">${getTypeLabel(template.type)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    ${forms.length > 0 ? `
                        <div>
                            <h4 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Perguntas dos Seus Formulários</h4>
                            <div id="forms-list" style="display: grid; gap: 12px; max-height: 300px; overflow-y: auto;">
                                ${forms.map(form => {
                                    const formFields = form.digital_form_data?.form_fields || [];
                                    if (formFields.length === 0) return '';
                                    return `
                                        <div style="margin-bottom: 16px;">
                                            <div style="font-weight: 600; margin-bottom: 8px; color: #FFC700;">${form.title || 'Formulário sem título'}</div>
                                            ${formFields.filter(f => f.type !== 'section' && f.type !== 'image').map((field, idx) => `
                                                <div class="form-question-item" data-form-id="${form.id}" data-question-index="${idx}" style="padding: 12px; background: #2C2C2F; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-bottom: 8px; border: 2px solid transparent;">
                                                    <div style="font-weight: 500; margin-bottom: 4px;">${field.label || 'Pergunta sem título'}</div>
                                                    <div style="font-size: 12px; color: #A1A1A1;">${getTypeLabel(field.type)}</div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Fechar modal
            modal.querySelector('.close-import-modal').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            // Selecionar template
            modal.querySelectorAll('.template-item').forEach(item => {
                item.addEventListener('click', () => {
                    const index = parseInt(item.dataset.templateIndex);
                    const template = questionTemplates[index];
                    addImportedQuestion(template);
                    modal.remove();
                });
                item.addEventListener('mouseenter', () => {
                    item.style.borderColor = '#FFC700';
                    item.style.background = '#3C3C3F';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.borderColor = 'transparent';
                    item.style.background = '#2C2C2F';
                });
            });
            
            // Selecionar pergunta de formulário
            modal.querySelectorAll('.form-question-item').forEach(item => {
                item.addEventListener('click', () => {
                    const formId = item.dataset.formId;
                    const questionIndex = parseInt(item.dataset.questionIndex);
                    const form = forms.find(f => String(f.id) === String(formId));
                    if (form && form.digital_form_data?.form_fields) {
                        const question = form.digital_form_data.form_fields[questionIndex];
                        if (question) {
                            addImportedQuestion(question);
                            modal.remove();
                        }
                    }
                });
                item.addEventListener('mouseenter', () => {
                    item.style.borderColor = '#FFC700';
                    item.style.background = '#3C3C3F';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.borderColor = 'transparent';
                    item.style.background = '#2C2C2F';
                });
            });
            
        } catch (error) {
            console.error('Erro ao importar pergunta:', error);
            alert('Erro ao carregar perguntas para importar: ' + error.message);
        }
    }
    
    // Função auxiliar para obter label do tipo
    function getTypeLabel(type) {
        const labels = {
            'short_text': 'Resposta Curta',
            'paragraph': 'Parágrafo',
            'multiple_choice': 'Múltipla Escolha',
            'checkbox': 'Caixas de Seleção',
            'dropdown': 'Lista Suspensa',
            'linear_scale': 'Escala Linear',
            'date': 'Data',
            'time': 'Hora',
            'email': 'Email',
            'number': 'Número',
            'image': 'Imagem',
            'section': 'Seção'
        };
        return labels[type] || type;
    }
    
    // Função para adicionar pergunta importada
    function addImportedQuestion(questionData) {
        // Criar uma cópia da pergunta (sem referências)
        const newQuestion = JSON.parse(JSON.stringify(questionData));
        // Remover ID se existir (novo campo)
        delete newQuestion.id;
        
        formFields.push(newQuestion);
        const formFieldsJsonEl = document.getElementById('form-fields-json');
        if (formFieldsJsonEl) {
            formFieldsJsonEl.value = JSON.stringify(formFields);
            console.log('o. Pergunta importada adicionada:', newQuestion);
        }
        renderPreviewQuestions();
    }
    
    // Event listener para placeholder de adicionar pergunta
    document.addEventListener('click', (e) => {
        if (e.target.closest('#add-question-placeholder')) {
            addQuestion();
        }
    });
    
    // Remover imagem de cabeçalho
    document.getElementById('remove-header-image-preview')?.addEventListener('click', () => {
        if (confirm('Remover imagem de cabeçalho?')) {
            document.getElementById('header-image-url').value = '';
            document.getElementById('preview-header-image-container').style.display = 'none';
        }
    });
    
    // Configurar listeners da sidebar (será chamado após loadFormData)
    
    // Adicionar pergunta

    function ensureFieldId(field, index) {
        if (!field || typeof field !== 'object') return field;
        if (!field.id || String(field.id).trim() === '') {
            field.id = 'field_' + Date.now() + '_' + (typeof index === 'number' ? index : Math.floor(Math.random() * 10000));
        }
        return field;
    }

    function ensureAllFormFieldIds() {
        if (!Array.isArray(formFields)) return;
        let changed = false;
        formFields.forEach((f, i) => {
            const before = f && f.id;
            ensureFieldId(f, i);
            if (f && f.id !== before) changed = true;
        });
        if (changed) {
            const el = document.getElementById('form-fields-json');
            if (el) el.value = JSON.stringify(formFields);
        }
    }

    function normalizeHideOnAnswer(raw) {
        const src = raw && typeof raw === 'object' ? raw : {};
        const toList = (v) => Array.isArray(v) ? v.map(x => String(x || '').trim()).filter(Boolean) : [];
        return {
            Sim: toList(src.Sim || src.sim || src.yes),
            Não: toList(src.Não || src.Nao || src.nao || src.no)
        };
    }

    function getHideOnAnswerSummary(field) {
        const h = normalizeHideOnAnswer(field && (field.hideOnAnswer || field.hide_on_answer));
        const nSim = h.Sim.length;
        const nNao = h.Não.length;
        if (!nSim && !nNao) return '';
        const parts = [];
        if (nSim) parts.push('No Sim oculta ' + nSim);
        if (nNao) parts.push('No Não oculta ' + nNao);
        return parts.join(' · ');
    }

    function buildHideOnAnswerChecklistHtml(prefix, excludeIndex, selected) {
        ensureAllFormFieldIds();
        const sel = normalizeHideOnAnswer(selected);
        const others = (formFields || []).map((f, i) => ({ f, i })).filter(({ i }) => i !== excludeIndex);
        if (!others.length) {
            return '<p style="margin:0;color:var(--text-dark,#A1A1A1);font-size:13px;">Adicione outras perguntas no formulário para poder ocultá-las aqui.</p>';
        }
        const row = (answerKey, list) => {
            const checkedSet = new Set(list || []);
            return others.map(({ f, i }) => {
                const id = f.id || ('field_' + i);
                const label = String(f.label || 'Pergunta sem título')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
                const checked = checkedSet.has(id) ? ' checked' : '';
                return '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--border-color,#2C2C2F);border-radius:10px;margin-bottom:8px;cursor:pointer;background:var(--background-color,#0D0D0F);color:var(--text,#ECECEC);font-size:13px;line-height:1.35;">' +
                    '<input type="checkbox" class="' + prefix + '-hide-check" data-hide-answer="' + answerKey + '" value="' + id + '"' + checked + ' style="width:18px;height:18px;margin-top:1px;accent-color:var(--dourado-principal,#FFC700);flex-shrink:0;">' +
                    '<span><b>' + label + '</b></span></label>';
            }).join('');
        };
        return '' +
            '<p style="margin:0 0 14px 0;color:var(--text-dark,#A1A1A1);font-size:13px;line-height:1.4;">Marque as perguntas que devem sumir quando a pessoa escolher Sim ou Não. As não marcadas continuam visíveis.</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
            '<div><label style="display:block;margin-bottom:8px;color:var(--text,#ECECEC);font-weight:700;">Se responder <span style="color:var(--dourado-principal,#FFC700);">Sim</span> — ocultar</label>' + row('Sim', sel.Sim) + '</div>' +
            '<div><label style="display:block;margin-bottom:8px;color:var(--text,#ECECEC);font-weight:700;">Se responder <span style="color:var(--dourado-principal,#FFC700);">Não</span> — ocultar</label>' + row('Não', sel.Não) + '</div>' +
            '</div>';
    }

    function readHideOnAnswerFromModal(modal, prefix) {
        const sim = [];
        const nao = [];
        modal.querySelectorAll('.' + prefix + '-hide-check:checked').forEach(cb => {
            const ans = cb.getAttribute('data-hide-answer');
            const id = String(cb.value || '').trim();
            if (!id) return;
            if (ans === 'Não') nao.push(id);
            else sim.push(id);
        });
        const out = { Sim: [...new Set(sim)], Não: [...new Set(nao)] };
        if (!out.Sim.length && !out.Não.length) return null;
        return out;
    }

    function addQuestion() {
        // Verificar se já existe um modal aberto
        const existingModal = document.querySelector('.question-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const fieldTypes = [
            { value: 'short_text', label: 'Resposta Curta', icon: 'fa-font' },
            { value: 'paragraph', label: 'Parágrafo', icon: 'fa-align-left' },
            { value: 'multiple_choice', label: 'Escolha Múltipla', icon: 'fa-circle-dot' },
            { value: 'checkbox', label: 'Caixa de Verificação', icon: 'fa-square-check' },
            { value: 'dropdown', label: 'Lista Suspensa', icon: 'fa-chevron-down' },
            { value: 'file_upload', label: 'Carregar Ficheiro', icon: 'fa-file-upload' },
            { value: 'linear_scale', label: 'Escala Linear', icon: 'fa-sliders' },
            { value: 'date', label: 'Data', icon: 'fa-calendar' },
            { value: 'time', label: 'Hora', icon: 'fa-clock' },
            { value: 'datetime', label: 'Data e Hora', icon: 'fa-calendar-clock' },
            { value: 'yes_no', label: 'Sim/Não', icon: 'fa-circle-check' },
            { value: 'yes_no_with_text', label: 'Sim/Não com Resposta', icon: 'fa-comments' },
            { value: 'email', label: 'Email', icon: 'fa-envelope' },
            { value: 'number', label: 'Número', icon: 'fa-hashtag' },
            { value: 'phone', label: 'Telefone', icon: 'fa-phone' }
        ];
        
        const modal = document.createElement('div');
        modal.className = 'question-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.innerHTML = `
            <div style="background: var(--card-background-color, #1C1C21); padding: 40px; border-radius: 16px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border-color, #2C2C2F); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h3 style="margin: 0; color: var(--text, #ECECEC); font-size: 24px; font-weight: 700;">Adicionar Pergunta</h3>
                    <button class="close-modal-btn" style="background: none; border: none; color: var(--text-dark, #A1A1A1); font-size: 24px; cursor: pointer; padding: 5px 10px; border-radius: 8px; transition: all 0.2s;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="input-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Pergunta/Label</label>
                    <input type="text" id="new-question-label" placeholder="Ex: ? a sua primeira vez?" style="width: 100%; padding: 14px 18px; border-radius: 12px; background: var(--background-color, #0D0D0F); border: 1.5px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); font-size: 16px; box-sizing: border-box;">
                </div>
                
                <div class="input-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 12px; color: var(--text, #ECECEC); font-weight: 600;">Tipo de Campo</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; max-height: 300px; overflow-y: auto; padding: 10px; background: var(--background-color, #0D0D0F); border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
                        ${fieldTypes.map(t => `
                            <label class="field-type-option" data-type="${t.value}" style="display: flex; flex-direction: column; align-items: center; padding: 16px; border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; cursor: pointer; transition: all 0.2s; background: var(--card-background-color, #1C1C21);">
                                <input type="radio" name="question-type" value="${t.value}" style="display: none;">
                                <i class="fas ${t.icon}" style="font-size: 28px; color: var(--dourado-principal, #FFC700); margin-bottom: 8px;"></i>
                                <span style="font-size: 13px; font-weight: 600; color: var(--text, #ECECEC); text-align: center;">${t.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="input-group" style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text, #ECECEC);">
                        <input type="checkbox" id="new-question-required" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--dourado-principal, #FFC700);">
                        <span style="font-weight: 600;">Campo obrigatório</span>
                    </label>
                </div>
                
                <div id="new-question-options-container" style="display: none; margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Opções (uma por linha)</label>
                    <textarea id="new-question-options" rows="6" placeholder="Opção 1&#10;Opção 2&#10;Opção 3" style="width: 100%; padding: 14px 18px; border-radius: 12px; background: var(--background-color, #0D0D0F); border: 1.5px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); font-size: 15px; font-family: inherit; resize: vertical; box-sizing: border-box;"></textarea>
                </div>
                
                <div id="new-question-placeholder-container" style="display: none; margin-bottom: 20px; padding: 16px; border-radius: 12px; background: rgba(255,199,0,0.06); border: 1px solid rgba(255,199,0,0.25);">
                    <p style="margin: 0 0 14px 0; color: var(--text-dark, #A1A1A1); font-size: 13px; line-height: 1.4;">Escolha quando a pergunta complementar deve aparecer. A outra opção fica sem campo extra.</p>
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Mostrar pergunta complementar quando responder</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 14px;">
                        <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border: 2px solid var(--dourado-principal, #FFC700); border-radius: 10px; cursor: pointer; background: rgba(255,199,0,0.1); color: var(--text, #ECECEC); font-weight: 600;">
                            <input type="radio" name="new-follow-up-trigger" value="Sim" checked style="accent-color: var(--dourado-principal, #FFC700);">
                            Sim
                        </label>
                        <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border: 2px solid var(--border-color, #2C2C2F); border-radius: 10px; cursor: pointer; background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC); font-weight: 600;">
                            <input type="radio" name="new-follow-up-trigger" value="Não" style="accent-color: var(--dourado-principal, #FFC700);">
                            Não
                        </label>
                    </div>
                    <label id="new-follow-up-label-title" style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Pergunta que aparece se Sim</label>
                    <input type="text" id="new-question-follow-up-label" placeholder="Ex: Quantas vezes?" style="width: 100%; padding: 14px 18px; border-radius: 12px; background: var(--background-color, #0D0D0F); border: 1.5px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); font-size: 15px; box-sizing: border-box; margin-bottom: 14px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Placeholder do campo de texto</label>
                    <input type="text" id="new-question-placeholder" placeholder="Ex: Digite a quantidade" style="width: 100%; padding: 14px 18px; border-radius: 12px; background: var(--background-color, #0D0D0F); border: 1.5px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); font-size: 15px; box-sizing: border-box;">
                </div>
                
                <div id="new-question-hide-container" style="display: none; margin-bottom: 20px; padding: 16px; border-radius: 12px; background: rgba(255,199,0,0.06); border: 1px solid rgba(255,199,0,0.25);">
                    <label style="display: block; margin-bottom: 10px; color: var(--text, #ECECEC); font-weight: 700;">Ocultar outras perguntas</label>
                    <div id="new-question-hide-lists"></div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 30px;">
                    <button class="cancel-btn" style="padding: 12px 24px; background: transparent; border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cancelar
                    </button>
                    <button class="add-question-confirm-btn" style="padding: 12px 24px; background: var(--dourado-principal, #FFC700); border: none; color: #000; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Adicionar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners do modal
        let selectedType = 'short_text';
        modal.querySelectorAll('.field-type-option').forEach(option => {
            option.addEventListener('click', function() {
                modal.querySelectorAll('.field-type-option').forEach(o => {
                    o.style.borderColor = 'var(--border-color, #2C2C2F)';
                    o.style.background = 'var(--card-background-color, #1C1C21)';
                });
                this.style.borderColor = 'var(--dourado-principal, #FFC700)';
                this.style.background = 'rgba(255, 199, 0, 0.1)';
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    selectedType = radio.value;
                    
                    // Mostrar/ocultar opções e placeholder
                    const optionsContainer = modal.querySelector('#new-question-options-container');
                    const placeholderContainer = modal.querySelector('#new-question-placeholder-container');
                    const needsOptions = ['multiple_choice', 'checkbox', 'dropdown'].includes(selectedType);
                    const needsPlaceholder = selectedType === 'yes_no_with_text';
                    const needsHide = selectedType === 'yes_no' || selectedType === 'yes_no_with_text';
                    if (optionsContainer) {
                        optionsContainer.style.display = needsOptions ? 'block' : 'none';
                    }
                    if (placeholderContainer) {
                        placeholderContainer.style.display = needsPlaceholder ? 'block' : 'none';
                    }
                    const hideContainer = modal.querySelector('#new-question-hide-container');
                    const hideLists = modal.querySelector('#new-question-hide-lists');
                    if (hideContainer) {
                        hideContainer.style.display = needsHide ? 'block' : 'none';
                        if (needsHide && hideLists) {
                            hideLists.innerHTML = buildHideOnAnswerChecklistHtml('new', -1, null);
                        }
                    }
                }
            });
        });
        
        // Selecionar primeiro tipo por padrão
        const firstOption = modal.querySelector('.field-type-option');
        if (firstOption) firstOption.click();

        // Atualizar texto do follow-up conforme Sim/Não
        const updateNewFollowUpTitle = () => {
            const trigger = modal.querySelector('input[name="new-follow-up-trigger"]:checked')?.value || 'Sim';
            const title = modal.querySelector('#new-follow-up-label-title');
            if (title) title.textContent = `Pergunta que aparece se ${trigger}`;
            modal.querySelectorAll('input[name="new-follow-up-trigger"]').forEach(radio => {
                const wrap = radio.closest('label');
                if (!wrap) return;
                if (radio.checked) {
                    wrap.style.borderColor = 'var(--dourado-principal, #FFC700)';
                    wrap.style.background = 'rgba(255,199,0,0.1)';
                } else {
                    wrap.style.borderColor = 'var(--border-color, #2C2C2F)';
                    wrap.style.background = 'var(--card-background-color, #1C1C21)';
                }
            });
        };
        modal.querySelectorAll('input[name="new-follow-up-trigger"]').forEach(r => {
            r.addEventListener('change', updateNewFollowUpTitle);
        });
        
        modal.querySelector('.close-modal-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.querySelector('.add-question-confirm-btn').addEventListener('click', () => {
            const label = modal.querySelector('#new-question-label').value.trim();
            if (!label) {
                alert('Por favor, insira um label para a pergunta.');
                return;
            }
            
            const required = modal.querySelector('#new-question-required').checked;
            const newField = {
                id: 'field_' + Date.now() + '_' + formFields.length,
                label: label,
                type: selectedType,
                required: required
            };
            
            // Adicionar opções se necessário
            if (['multiple_choice', 'checkbox', 'dropdown'].includes(selectedType)) {
                const optionsText = modal.querySelector('#new-question-options').value.trim();
                if (optionsText) {
                    newField.options = optionsText.split('\n').map(o => o.trim()).filter(o => o);
                } else {
                    newField.options = selectedType === 'multiple_choice' ? ['Opção 1'] : [];
                }
            }
            
            // Adicionar follow-up e placeholder para yes_no_with_text
            if (selectedType === 'yes_no_with_text') {
                const followUpInput = modal.querySelector('#new-question-follow-up-label');
                const placeholderInput = modal.querySelector('#new-question-placeholder');
                const triggerInput = modal.querySelector('input[name="new-follow-up-trigger"]:checked');
                newField.followUpTrigger = triggerInput?.value === 'Não' ? 'Não' : 'Sim';
                if (followUpInput) {
                    const followUpLabel = followUpInput.value.trim();
                    if (followUpLabel) {
                        newField.followUpLabel = followUpLabel;
                    }
                }
                if (placeholderInput) {
                    const placeholder = placeholderInput.value.trim();
                    if (placeholder) {
                        newField.placeholder = placeholder;
                    }
                }
            }

            if (selectedType === 'yes_no' || selectedType === 'yes_no_with_text') {
                const hideRules = readHideOnAnswerFromModal(modal, 'new');
                if (hideRules) newField.hideOnAnswer = hideRules;
            }
            
            formFields.push(newField);
            
            // Atualizar campo hidden
            const formFieldsJsonEl = document.getElementById('form-fields-json');
            if (formFieldsJsonEl) {
                formFieldsJsonEl.value = JSON.stringify(formFields);
                console.log('o. form-fields-json atualizado:', formFieldsJsonEl.value);
            } else {
                console.error('O Campo form-fields-json não encontrado!');
            }
            
            renderPreviewQuestions();
            modal.remove();
        });
    }
    
    // Duplicar pergunta
    function duplicateQuestion(index) {
        if (formFields[index]) {
            const duplicated = JSON.parse(JSON.stringify(formFields[index]));
            duplicated.label = duplicated.label + ' (cópia)';
            duplicated.id = 'field_' + Date.now() + '_' + formFields.length;
            formFields.splice(index + 1, 0, duplicated);
            const formFieldsJsonEl = document.getElementById('form-fields-json');
            if (formFieldsJsonEl) {
                formFieldsJsonEl.value = JSON.stringify(formFields);
            }
            renderPreviewQuestions();
        }
    }

    // Mover pergunta para cima/baixo
    function moveQuestion(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= formFields.length || !formFields[index]) return;
        const [item] = formFields.splice(index, 1);
        formFields.splice(newIndex, 0, item);
        const formFieldsJsonEl = document.getElementById('form-fields-json');
        if (formFieldsJsonEl) {
            formFieldsJsonEl.value = JSON.stringify(formFields);
        }
        renderPreviewQuestions();
    }

    // Arrastar para reordenar perguntas (SortableJS)
    function initQuestionsSortable(container) {
        if (!container || typeof Sortable === 'undefined') return;

        if (questionsSortableInstance) {
            try { questionsSortableInstance.destroy(); } catch (e) {}
            questionsSortableInstance = null;
        }

        questionsSortableInstance = Sortable.create(container, {
            animation: 180,
            handle: '.question-drag-handle',
            draggable: '.preview-form-group, .form-question-item-preview',
            filter: '.add-question-placeholder, .question-edit-btn, .question-label-edit',
            preventOnFilter: false,
            ghostClass: 'question-sortable-ghost',
            chosenClass: 'question-sortable-chosen',
            dragClass: 'question-sortable-drag',
            onEnd: function(evt) {
                const from = parseInt(evt.item.dataset.questionIndex);
                if (isNaN(from)) return;

                const questionEls = Array.from(container.children).filter(el =>
                    el.classList.contains('preview-form-group') || el.classList.contains('form-question-item-preview')
                );
                const to = questionEls.indexOf(evt.item);
                if (to < 0 || from === to) return;

                const [item] = formFields.splice(from, 1);
                formFields.splice(to, 0, item);

                const formFieldsJsonEl = document.getElementById('form-fields-json');
                if (formFieldsJsonEl) {
                    formFieldsJsonEl.value = JSON.stringify(formFields);
                }
                renderPreviewQuestions();
            }
        });
    }
    
    // Editar pergunta (modal completo)
    function editQuestionModal(index) {
        const field = formFields[index];
        if (!field) return;
        
        const fieldTypes = [
            { value: 'short_text', label: 'Resposta Curta', icon: 'fa-font' },
            { value: 'paragraph', label: 'Parágrafo', icon: 'fa-align-left' },
            { value: 'multiple_choice', label: 'Escolha Múltipla', icon: 'fa-circle-dot' },
            { value: 'checkbox', label: 'Caixa de Verificação', icon: 'fa-square-check' },
            { value: 'dropdown', label: 'Lista Suspensa', icon: 'fa-chevron-down' },
            { value: 'file_upload', label: 'Carregar Ficheiro', icon: 'fa-file-upload' },
            { value: 'date', label: 'Data', icon: 'fa-calendar' },
            { value: 'time', label: 'Hora', icon: 'fa-clock' },
            { value: 'datetime', label: 'Data e Hora', icon: 'fa-calendar-clock' },
            { value: 'yes_no', label: 'Sim/Não', icon: 'fa-circle-check' },
            { value: 'yes_no_with_text', label: 'Sim/Não com Resposta', icon: 'fa-comments' },
            { value: 'email', label: 'Email', icon: 'fa-envelope' },
            { value: 'number', label: 'Número', icon: 'fa-hashtag' },
            { value: 'phone', label: 'Telefone', icon: 'fa-phone' }
        ];
        
        const modal = document.createElement('div');
        modal.className = 'question-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        const followUpLabelValue = (field.followUpLabel || field.follow_up_label || '').replace(/"/g, '&quot;');
        const placeholderValue = (field.placeholder || '').replace(/"/g, '&quot;');
        const followUpTriggerValue = (field.followUpTrigger || field.follow_up_trigger || 'Sim') === 'Não' ? 'Não' : 'Sim';
        modal.innerHTML = `
            <div style="background: var(--card-background-color, #1C1C21); padding: 40px; border-radius: 16px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border-color, #2C2C2F); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h3 style="margin: 0; color: var(--text, #ECECEC); font-size: 24px; font-weight: 700;">Editar Pergunta</h3>
                    <button class="close-modal-btn" style="background: none; border: none; color: var(--text-dark, #A1A1A1); font-size: 24px; cursor: pointer; padding: 5px 10px; border-radius: 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="input-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Pergunta/Label</label>
                    <input type="text" id="edit-question-label" value="${(field.label || '').replace(/"/g, '&quot;')}" placeholder="Ex: ? a sua primeira vez?" style="width: 100%; padding: 14px 18px; border-radius: 12px; background: var(--background-color, #0D0D0F); border: 1.5px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); font-size: 16px; box-sizing: border-box;">
                </div>
                
                <div class="input-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 12px; color: var(--text, #ECECEC); font-weight: 600;">Tipo de Campo</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; max-height: 300px; overflow-y: auto; padding: 10px; background: var(--background-color, #0D0D0F); border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
                        ${fieldTypes.map(t => `
                            <label class="field-type-option" data-type="${t.value}" style="display: flex; flex-direction: column; align-items: center; padding: 16px; border: 2px solid ${field.type === t.value ? 'var(--dourado-principal, #FFC700)' : 'var(--border-color, #2C2C2F)'}; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: ${field.type === t.value ? 'rgba(255, 199, 0, 0.1)' : 'var(--card-background-color, #1C1C21)'};">
                                <input type="radio" name="edit-question-type" value="${t.value}" ${field.type === t.value ? 'checked' : ''} style="display: none;">
                                <i class="fas ${t.icon}" style="font-size: 28px; color: var(--dourado-principal, #FFC700); margin-bottom: 8px;"></i>
                                <span style="font-size: 13px; font-weight: 600; color: var(--text, #ECECEC); text-align: center;">${t.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="input-group" style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text, #ECECEC);">
                        <input type="checkbox" id="edit-question-required" ${field.required ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--dourado-principal, #FFC700);">
                        <span style="font-weight: 600;">Campo obrigatório</span>
                    </label>
                </div>
                
                <div id="edit-question-options-container" style="display: ${['multiple_choice', 'checkbox', 'dropdown'].includes(field.type) ? 'block' : 'none'}; margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Opções (uma por linha)</label>
                    <textarea id="edit-question-options" rows="6" placeholder="Opção 1&#10;Opção 2&#10;Opção 3" style="width: 100%; padding: 14px 18px; border-radius: 12px; background: var(--background-color, #0D0D0F); border: 1.5px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); font-size: 15px; font-family: inherit; resize: vertical; box-sizing: border-box;">${field.options ? field.options.join('\n') : ''}</textarea>
                </div>
                
                <div id="edit-question-placeholder-container" style="display: ${field.type === 'yes_no_with_text' ? 'block' : 'none'}; margin-bottom: 20px; padding: 16px; border-radius: 12px; background: rgba(255,199,0,0.06); border: 1px solid rgba(255,199,0,0.25);">
                    <p style="margin: 0 0 14px 0; color: var(--text-dark, #A1A1A1); font-size: 13px; line-height: 1.4;">Escolha quando a pergunta complementar deve aparecer. A outra opção fica sem campo extra.</p>
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Mostrar pergunta complementar quando responder</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 14px;">
                        <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border: 2px solid ${followUpTriggerValue === 'Sim' ? 'var(--dourado-principal, #FFC700)' : 'var(--border-color, #2C2C2F)'}; border-radius: 10px; cursor: pointer; background: ${followUpTriggerValue === 'Sim' ? 'rgba(255,199,0,0.1)' : 'var(--card-background-color, #1C1C21)'}; color: var(--text, #ECECEC); font-weight: 600;">
                            <input type="radio" name="edit-follow-up-trigger" value="Sim" ${followUpTriggerValue === 'Sim' ? 'checked' : ''} style="accent-color: var(--dourado-principal, #FFC700);">
                            Sim
                        </label>
                        <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border: 2px solid ${followUpTriggerValue === 'Não' ? 'var(--dourado-principal, #FFC700)' : 'var(--border-color, #2C2C2F)'}; border-radius: 10px; cursor: pointer; background: ${followUpTriggerValue === 'Não' ? 'rgba(255,199,0,0.1)' : 'var(--card-background-color, #1C1C21)'}; color: var(--text, #ECECEC); font-weight: 600;">
                            <input type="radio" name="edit-follow-up-trigger" value="Não" ${followUpTriggerValue === 'Não' ? 'checked' : ''} style="accent-color: var(--dourado-principal, #FFC700);">
                            Não
                        </label>
                    </div>
                    <label id="edit-follow-up-label-title" style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Pergunta que aparece se ${followUpTriggerValue}</label>
                    <input type="text" id="edit-question-follow-up-label" value="${followUpLabelValue}" placeholder="Ex: Quantas vezes? / Por quê?" style="width: 100%; padding: 14px 18px; border-radius: 12px; background: var(--background-color, #0D0D0F); border: 1.5px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); font-size: 15px; box-sizing: border-box; margin-bottom: 14px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text, #ECECEC); font-weight: 600;">Placeholder do campo de texto</label>
                    <input type="text" id="edit-question-placeholder" value="${placeholderValue}" placeholder="Ex: Digite a quantidade" style="width: 100%; padding: 14px 18px; border-radius: 12px; background: var(--background-color, #0D0D0F); border: 1.5px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); font-size: 15px; box-sizing: border-box;">
                </div>

                <div id="edit-question-hide-container" style="display: ${(field.type === 'yes_no' || field.type === 'yes_no_with_text') ? 'block' : 'none'}; margin-bottom: 20px; padding: 16px; border-radius: 12px; background: rgba(255,199,0,0.06); border: 1px solid rgba(255,199,0,0.25);">
                    <label style="display: block; margin-bottom: 10px; color: var(--text, #ECECEC); font-weight: 700;">Ocultar outras perguntas</label>
                    <div id="edit-question-hide-lists">${buildHideOnAnswerChecklistHtml('edit', index, field.hideOnAnswer || field.hide_on_answer || null)}</div>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 30px;">
                    <button class="cancel-btn" style="padding: 12px 24px; background: transparent; border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC); border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cancelar
                    </button>
                    <button class="save-question-btn" style="padding: 12px 24px; background: var(--dourado-principal, #FFC700); border: none; color: #000; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        let selectedType = field.type;

        const updateEditFollowUpTitle = () => {
            const trigger = modal.querySelector('input[name="edit-follow-up-trigger"]:checked')?.value || 'Sim';
            const title = modal.querySelector('#edit-follow-up-label-title');
            if (title) title.textContent = `Pergunta que aparece se ${trigger}`;
            modal.querySelectorAll('input[name="edit-follow-up-trigger"]').forEach(radio => {
                const wrap = radio.closest('label');
                if (!wrap) return;
                if (radio.checked) {
                    wrap.style.borderColor = 'var(--dourado-principal, #FFC700)';
                    wrap.style.background = 'rgba(255,199,0,0.1)';
                } else {
                    wrap.style.borderColor = 'var(--border-color, #2C2C2F)';
                    wrap.style.background = 'var(--card-background-color, #1C1C21)';
                }
            });
        };
        modal.querySelectorAll('input[name="edit-follow-up-trigger"]').forEach(r => {
            r.addEventListener('change', updateEditFollowUpTitle);
        });

        modal.querySelectorAll('.field-type-option').forEach(option => {
            option.addEventListener('click', function() {
                modal.querySelectorAll('.field-type-option').forEach(o => {
                    o.style.borderColor = 'var(--border-color, #2C2C2F)';
                    o.style.background = 'var(--card-background-color, #1C1C21)';
                });
                this.style.borderColor = 'var(--dourado-principal, #FFC700)';
                this.style.background = 'rgba(255, 199, 0, 0.1)';
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    selectedType = radio.value;
                    const optionsContainer = modal.querySelector('#edit-question-options-container');
                    const placeholderContainer = modal.querySelector('#edit-question-placeholder-container');
                    if (optionsContainer) {
                        optionsContainer.style.display = ['multiple_choice', 'checkbox', 'dropdown'].includes(selectedType) ? 'block' : 'none';
                    }
                    if (placeholderContainer) {
                        placeholderContainer.style.display = selectedType === 'yes_no_with_text' ? 'block' : 'none';
                    }
                    const hideContainer = modal.querySelector('#edit-question-hide-container');
                    const hideLists = modal.querySelector('#edit-question-hide-lists');
                    if (hideContainer) {
                        const needsHide = selectedType === 'yes_no' || selectedType === 'yes_no_with_text';
                        hideContainer.style.display = needsHide ? 'block' : 'none';
                        if (needsHide && hideLists) {
                            hideLists.innerHTML = buildHideOnAnswerChecklistHtml('edit', index, formFields[index]?.hideOnAnswer || formFields[index]?.hide_on_answer || null);
                        }
                    }
                }
            });
        });
        
        modal.querySelector('.close-modal-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.querySelector('.save-question-btn').addEventListener('click', () => {
            const label = modal.querySelector('#edit-question-label').value.trim();
            if (!label) {
                alert('Por favor, insira um label para a pergunta.');
                return;
            }
            
            const required = modal.querySelector('#edit-question-required').checked;
            formFields[index].label = label;
            formFields[index].type = selectedType;
            formFields[index].required = required;
            
            // Preservar dependsOn se existir
            if (field.dependsOn || field.depends_on) {
                formFields[index].dependsOn = field.dependsOn || field.depends_on;
            }
            
            // Garantir ID estável
            ensureFieldId(formFields[index], index);
            
            // Salvar follow-up e placeholder para yes_no_with_text
            if (selectedType === 'yes_no_with_text') {
                const followUpInput = modal.querySelector('#edit-question-follow-up-label');
                const placeholderInput = modal.querySelector('#edit-question-placeholder');
                const triggerInput = modal.querySelector('input[name="edit-follow-up-trigger"]:checked');
                formFields[index].followUpTrigger = triggerInput?.value === 'Não' ? 'Não' : 'Sim';
                if (followUpInput) {
                    const followUpLabel = followUpInput.value.trim();
                    if (followUpLabel) {
                        formFields[index].followUpLabel = followUpLabel;
                    } else {
                        delete formFields[index].followUpLabel;
                        delete formFields[index].follow_up_label;
                    }
                }
                if (placeholderInput) {
                    const placeholder = placeholderInput.value.trim();
                    if (placeholder) {
                        formFields[index].placeholder = placeholder;
                    } else {
                        delete formFields[index].placeholder;
                    }
                }
            } else {
                delete formFields[index].followUpLabel;
                delete formFields[index].follow_up_label;
                delete formFields[index].followUpTrigger;
                delete formFields[index].follow_up_trigger;
                // não apagar placeholder se não for yes_no_with_text e usuário usava em outro tipo — limpar só no ramo yes_no_with_text
                if (selectedType !== 'yes_no' && selectedType !== 'yes_no_with_text') {
                    delete formFields[index].placeholder;
                }
            }

            if (selectedType === 'yes_no' || selectedType === 'yes_no_with_text') {
                const hideRules = readHideOnAnswerFromModal(modal, 'edit');
                if (hideRules) formFields[index].hideOnAnswer = hideRules;
                else {
                    delete formFields[index].hideOnAnswer;
                    delete formFields[index].hide_on_answer;
                }
            } else {
                delete formFields[index].hideOnAnswer;
                delete formFields[index].hide_on_answer;
            }
            
            if (['multiple_choice', 'checkbox', 'dropdown'].includes(selectedType)) {
                const optionsText = modal.querySelector('#edit-question-options').value.trim();
                if (optionsText) {
                    formFields[index].options = optionsText.split('\n').map(o => o.trim()).filter(o => o);
                } else {
                    formFields[index].options = selectedType === 'multiple_choice' ? ['Opção 1'] : [];
                }
            } else {
                delete formFields[index].options;
            }
            
            const formFieldsJsonEl = document.getElementById('form-fields-json');
            if (formFieldsJsonEl) {
                formFieldsJsonEl.value = JSON.stringify(formFields);
            }
            
            renderPreviewQuestions();
            modal.remove();
        });
    }
    
    // Excluir pergunta
    function deleteQuestion(index) {
        if (!confirm('Tem certeza que deseja remover esta pergunta?')) return;
        formFields.splice(index, 1);
        const formFieldsJsonEl = document.getElementById('form-fields-json');
        if (formFieldsJsonEl) {
            formFieldsJsonEl.value = JSON.stringify(formFields);
        }
        renderPreviewQuestions();
    }
    
    // Exportar estrutura do formulário
    window.exportFormStructure = function() {
        try {
            const moduleTitleEl = document.getElementById('form-module-title');
            const formTitleEl = document.getElementById('form-title');
            const formDescEl = document.getElementById('form-description');
            const logoEl = document.getElementById('logo-url');
            const bannerEl = document.getElementById('banner-image-url');
            const headerEl = document.getElementById('header-image-url');
            const backgroundEl = document.getElementById('background-image-url');
            const opacityEl = document.getElementById('background-opacity');
            const themeEl = document.getElementById('form-theme');
            const primaryColorEl = document.getElementById('primary-color');
            const textColorEl = document.getElementById('text-color');
            const displayFormatEl = document.querySelector('input[name="display-format"]:checked');
            
            const formFieldsJsonEl = document.getElementById('form-fields-json');
            let formFieldsData = [];
            if (formFieldsJsonEl && formFieldsJsonEl.value) {
                try {
                    formFieldsData = JSON.parse(formFieldsJsonEl.value);
                } catch (e) {
                    formFieldsData = formFields;
                }
            } else {
                formFieldsData = formFields;
            }
            
            const formStructure = {
                title: moduleTitleEl?.value || '',
                form_title: formTitleEl?.value || '',
                form_description: formDescEl?.value || '',
                form_logo_url: logoEl?.value || '',
                banner_image_url: bannerEl?.value || '',
                header_image_url: headerEl?.value || '',
                background_image_url: backgroundEl?.value || '',
                background_opacity: opacityEl ? parseFloat(opacityEl.value) : 1.0,
                theme: themeEl?.value || 'light',
                primary_color: primaryColorEl?.value || '#4A90E2',
                text_color: textColorEl?.value || '#333333',
                display_format: displayFormatEl?.value || 'button',
                form_fields: formFieldsData,
                export_date: new Date().toISOString(),
                version: '1.0'
            };
            
            const dataStr = JSON.stringify(formStructure, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `king-forms-${Date.now()}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            showSuccessMessage('Estrutura do formulário exportada com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar estrutura:', error);
            showErrorMessage('Erro ao exportar estrutura: ' + error.message);
        }
    };
    
    // Importar estrutura do formulário
    window.importFormStructure = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const formStructure = JSON.parse(text);
                
                if (!formStructure.form_fields || !Array.isArray(formStructure.form_fields)) {
                    throw new Error('Estrutura inválida: form_fields não encontrado ou não é um array');
                }
                
                // Confirmar importação
                if (!confirm('Isso irá substituir todo o formulário atual. Deseja continuar?')) {
                    return;
                }
                
                // Aplicar estrutura
                const formFieldsJsonEl = document.getElementById('form-fields-json');
                if (formFieldsJsonEl) {
                    formFieldsJsonEl.value = JSON.stringify(formStructure.form_fields);
                }
                formFields.length = 0;
                formFields.push(...formStructure.form_fields);
                
                // Aplicar outros campos se disponíveis
                if (formStructure.form_title) {
                    const formTitleEl = document.getElementById('form-title');
                    if (formTitleEl) formTitleEl.value = formStructure.form_title;
                    const previewTitle = document.getElementById('preview-title');
                    if (previewTitle) previewTitle.textContent = formStructure.form_title;
                }
                
                if (formStructure.form_description !== undefined) {
                    const formDescEl = document.getElementById('form-description');
                    if (formDescEl) formDescEl.value = formStructure.form_description || '';
                    const previewDesc = document.getElementById('preview-description');
                    if (previewDesc) previewDesc.textContent = formStructure.form_description || 'Descrição do formulário';
                }
                
                if (formStructure.form_logo_url) {
                    const logoEl = document.getElementById('logo-url');
                    if (logoEl) logoEl.value = formStructure.form_logo_url;
                    updateSingleImagePreview('logo', formStructure.form_logo_url);
                }
                
                if (formStructure.theme) {
                    const themeEl = document.getElementById('form-theme');
                    if (themeEl) themeEl.value = formStructure.theme;
                }
                
                if (formStructure.primary_color) {
                    const primaryColorEl = document.getElementById('primary-color');
                    if (primaryColorEl) primaryColorEl.value = formStructure.primary_color;
                }
                
                if (formStructure.text_color) {
                    const textColorEl = document.getElementById('text-color');
                    if (textColorEl) textColorEl.value = formStructure.text_color;
                }
                
                renderPreviewQuestions();
                showSuccessMessage('Estrutura do formulário importada com sucesso!');
            } catch (error) {
                console.error('Erro ao importar estrutura:', error);
                showErrorMessage('Erro ao importar estrutura: ' + error.message);
            }
        };
        input.click();
    };
    
    // Adicionar imagem de cabeçalho
    function addHeaderImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                alert('Apenas imagens PNG ou JPG são permitidas.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 5MB.');
                return;
            }
            
            try {
                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                    method: 'POST',
                    headers: getHeaders()
                });
                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                const { uploadURL } = await authResponse.json();
                
                const formData = new FormData();
                formData.append('file', file);
                const uploadResponse = await fetch(uploadURL, {
                    method: 'POST',
                    body: formData,
                    headers: getAuthHeadersOnly()
                });
                if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');
                const uploadData = await uploadResponse.json();
                const imageUrl = uploadData.result?.variants?.[0] || uploadData.url || uploadData.result?.id;
                
                // Atualizar campo hidden e preview
                const headerImageUrlEl = document.getElementById('header-image-url');
                const headerImageContainer = document.getElementById('preview-header-image-container');
                const headerImage = document.getElementById('preview-header-image');
                
                if (headerImageUrlEl) headerImageUrlEl.value = imageUrl;
                if (headerImage && headerImageContainer) {
                    headerImage.src = imageUrl;
                    headerImageContainer.style.display = 'block';
                }
                
            } catch (error) {
                console.error('Erro ao fazer upload:', error);
                alert('Erro ao fazer upload da imagem: ' + error.message);
            }
        };
        input.click();
    }
    
    // Temas Premium Ultra para King Forms
    const premiumThemes = {
        'dark_gold_premium': {
            name: 'Dark Gold Premium',
            icon: 'fas fa-crown',
            theme: 'dark',
            primary_color: '#FFC700',
            text_color: '#FFFFFF',
            description: 'Elegância dourada sobre fundo escuro - Luxo absoluto'
        },
        'black_red_luxury': {
            name: 'Preto e Vermelho',
            icon: 'fas fa-fire',
            theme: 'dark',
            primary_color: '#DC2626',
            text_color: '#FFFFFF',
            description: 'Preto e vermelho intenso - Poder e elegância'
        },
        'golden_luxury': {
            name: 'Dourado Luxo',
            icon: 'fas fa-coins',
            theme: 'light',
            primary_color: '#D4AF37',
            text_color: '#1a1a1a',
            description: 'Elegância dourada premium e sofisticada'
        },
        'midnight_gold': {
            name: 'Midnight Gold',
            icon: 'fas fa-moon',
            theme: 'dark',
            primary_color: '#FFD700',
            text_color: '#FFFFFF',
            description: 'Dourado intenso em fundo preto profundo'
        },
        'royal_purple_luxury': {
            name: 'Roxo Real Premium',
            icon: 'fas fa-gem',
            theme: 'dark',
            primary_color: '#9D4EDD',
            text_color: '#FFFFFF',
            description: 'Roxo majestoso com toque de elegância'
        },
        'emerald_jewel': {
            name: 'Esmeralda Joia',
            icon: 'fas fa-dragon',
            theme: 'dark',
            primary_color: '#00FF88',
            text_color: '#FFFFFF',
            description: 'Verde esmeralda brilhante e premium'
        },
        'crimson_rose': {
            name: 'Rosa Crimson',
            icon: 'fas fa-heart',
            theme: 'dark',
            primary_color: '#FF1744',
            text_color: '#FFFFFF',
            description: 'Rosa intenso e apaixonante'
        },
        'sunset_premium': {
            name: 'Pôr do Sol Premium',
            icon: 'fas fa-sun',
            theme: 'light',
            primary_color: '#FF6B35',
            text_color: '#1a1a1a',
            description: 'Gradiente de pôr do sol vibrante'
        },
        'ocean_deep': {
            name: 'Oceano Profundo',
            icon: 'fas fa-water',
            theme: 'dark',
            primary_color: '#00D4FF',
            text_color: '#FFFFFF',
            description: 'Azul oceânico vibrante com profundidade'
        },
        'ice_blue': {
            name: 'Azul Gelo',
            icon: 'fas fa-snowflake',
            theme: 'light',
            primary_color: '#00E5FF',
            text_color: '#1a1a1a',
            description: 'Azul gelo refrescante e moderno'
        },
        'lavender_dream': {
            name: 'Sonho Lavanda',
            icon: 'fas fa-star',
            theme: 'dark',
            primary_color: '#B794F6',
            text_color: '#FFFFFF',
            description: 'Lavanda suave e relaxante'
        },
        'forest_dark': {
            name: 'Floresta Escura',
            icon: 'fas fa-tree',
            theme: 'dark',
            primary_color: '#22C55E',
            text_color: '#FFFFFF',
            description: 'Verde floresta natural e orgânico'
        },
        'coral_vibrant': {
            name: 'Coral Vibrante',
            icon: 'fas fa-palette',
            theme: 'dark',
            primary_color: '#FF6B9D',
            text_color: '#FFFFFF',
            description: 'Coral energético e chamativo'
        },
        'steel_blue': {
            name: 'Azul Aço',
            icon: 'fas fa-shield-alt',
            theme: 'light',
            primary_color: '#3B82F6',
            text_color: '#1a1a1a',
            description: 'Azul aço profissional e confiável'
        },
        'amber_fire': {
            name: ',mbar Flamejante',
            icon: 'fas fa-fire-alt',
            theme: 'dark',
            primary_color: '#F59E0B',
            text_color: '#FFFFFF',
            description: ',mbar quente e acolhedor'
        },
        'mint_fresh': {
            name: 'Menta Fresca',
            icon: 'fas fa-leaf',
            theme: 'light',
            primary_color: '#10B981',
            text_color: '#1a1a1a',
            description: 'Verde menta refrescante e moderno'
        },
        'violet_storm': {
            name: 'Tempestade Violeta',
            icon: 'fas fa-bolt',
            theme: 'dark',
            primary_color: '#8B5CF6',
            text_color: '#FFFFFF',
            description: 'Violeta intenso e misterioso'
        },
        'copper_warm': {
            name: 'Cobre Quente',
            icon: 'fas fa-coins',
            theme: 'light',
            primary_color: '#E67E22',
            text_color: '#1a1a1a',
            description: 'Cobre quente e aconchegante'
        },
        'cyan_electric': {
            name: 'Ciano Elétrico',
            icon: 'fas fa-bolt',
            theme: 'dark',
            primary_color: '#06B6D4',
            text_color: '#FFFFFF',
            description: 'Ciano elétrico e futurista'
        },
        'pink_blush': {
            name: 'Rosa Blush',
            icon: 'fas fa-heart',
            theme: 'light',
            primary_color: '#EC4899',
            text_color: '#1a1a1a',
            description: 'Rosa blush delicado e feminino'
        },
        'indigo_night': {
            name: 'Noite Índigo',
            icon: 'fas fa-moon-stars',
            theme: 'dark',
            primary_color: '#6366F1',
            text_color: '#FFFFFF',
            description: 'Índigo noturno profundo e elegante'
        },
        'sapphire_blue': {
            name: 'Azul Safira',
            icon: 'fas fa-gem',
            theme: 'light',
            primary_color: '#2563EB',
            text_color: '#1E3A8A',
            description: 'Azul safira profundo e premium'
        },
        'ruby_red': {
            name: 'Vermelho Rubi',
            icon: 'fas fa-fire',
            theme: 'light',
            primary_color: '#DC2626',
            text_color: '#7F1D1D',
            description: 'Vermelho rubi intenso e impactante'
        },
        'platinum_modern': {
            name: 'Platina Moderna',
            icon: 'fas fa-shield-alt',
            theme: 'light',
            primary_color: '#64748B',
            text_color: '#1E293B',
            description: 'Platina moderna e minimalista'
        },
        'neon_modern': {
            name: 'Neon Moderno',
            icon: 'fas fa-lightbulb',
            theme: 'dark',
            primary_color: '#00F5FF',
            text_color: '#FFFFFF',
            description: 'Neon moderno com efeitos futuristas'
        },
        'vintage_gold': {
            name: 'Dourado Vintage',
            icon: 'fas fa-clock',
            theme: 'light',
            primary_color: '#B8860B',
            text_color: '#1C1917',
            description: 'Dourado vintage elegante e clássico'
        },
        'emerald_light': {
            name: 'Esmeralda Claro',
            icon: 'fas fa-leaf',
            theme: 'light',
            primary_color: '#10B981',
            text_color: '#064E3B',
            description: 'Verde esmeralda claro e natural'
        },
        'royal_blue': {
            name: 'Azul Real',
            icon: 'fas fa-gem',
            theme: 'light',
            primary_color: '#1E40AF',
            text_color: '#1E3A8A',
            description: 'Azul real profundo e majestoso'
        },
        'silver_modern': {
            name: 'Prata Moderna',
            icon: 'fas fa-star',
            theme: 'light',
            primary_color: '#94A3B8',
            text_color: '#1E293B',
            description: 'Prata moderna e elegante'
        },
        'custom': {
            name: 'Personalizado',
            icon: 'fas fa-sliders-h',
            theme: 'light',
            primary_color: '#4A90E2',
            text_color: '#333333',
            description: 'Configure suas próprias cores'
        }
    };
    
    // Adicionar imagem ao formulário
    function addImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                alert('Apenas imagens PNG ou JPG são permitidas.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 5MB.');
                return;
            }
            
            try {
                // Obter URL de upload
                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                    method: 'POST',
                    headers: getHeaders()
                });
                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                const { uploadURL } = await authResponse.json();
                
                // Fazer upload
                const formData = new FormData();
                formData.append('file', file);
                const uploadResponse = await fetch(uploadURL, {
                    method: 'POST',
                    body: formData,
                    headers: getAuthHeadersOnly()
                });
                if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');
                const uploadData = await uploadResponse.json();
                const imageUrl = uploadData.result?.variants?.[0] || uploadData.url || uploadData.result?.id;
                
                // Adicionar campo de imagem ao formulário
                const imageField = {
                    type: 'image',
                    image_url: imageUrl,
                    label: 'Imagem'
                };
                formFields.push(imageField);
                const formFieldsJsonEl = document.getElementById('form-fields-json');
                if (formFieldsJsonEl) {
                    formFieldsJsonEl.value = JSON.stringify(formFields);
                }
                renderPreviewQuestions();
                
            } catch (error) {
                console.error('Erro ao fazer upload:', error);
                alert('Erro ao fazer upload da imagem: ' + error.message);
            }
        };
        input.click();
    }
    
    // Adicionar seção (divisória)
    function addSection() {
        const sectionField = {
            type: 'section',
            label: 'Nova Seção',
            description: 'Descrição da seção (opcional)'
        };
        formFields.push(sectionField);
        const formFieldsJsonEl = document.getElementById('form-fields-json');
        if (formFieldsJsonEl) {
            formFieldsJsonEl.value = JSON.stringify(formFields);
        }
        renderPreviewQuestions();
    }
    
    // Salvar formulário
    const saveBtnEl = document.getElementById('save-form-btn');
    if (saveBtnEl) {
        // Remover listener antigo se existir (clonar elemento)
        const newSaveBtn = saveBtnEl.cloneNode(true);
        saveBtnEl.parentNode.replaceChild(newSaveBtn, saveBtnEl);
        
        newSaveBtn.addEventListener('click', async function saveFormHandler() {
        const btn = document.getElementById('save-form-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        
        try {
            const formFieldsJsonEl = document.getElementById('form-fields-json');
            let parsedFields = [];
            if (formFieldsJsonEl && formFieldsJsonEl.value) {
                try {
                    const parsed = JSON.parse(formFieldsJsonEl.value);
                    parsedFields = Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    console.error('Erro ao parsear form-fields-json:', e);
                    parsedFields = Array.isArray(formFields) ? formFields : [];
                }
            } else {
                parsedFields = Array.isArray(formFields) ? formFields : [];
            }
            
            console.log('[SAVE] Preparando para salvar form_fields:', {
                parsedFieldsLength: parsedFields.length,
                formFieldsLength: formFields.length,
                parsedFields: parsedFields,
                formFieldsJsonValue: formFieldsJsonEl?.value?.substring(0, 200)
            });
            
            const moduleTitleEl = document.getElementById('form-module-title');
            const formTitleEl = document.getElementById('form-title');
            const formDescEl = document.getElementById('form-description');
            const whatsappEl = document.getElementById('whatsapp-number');
            const enablePastorBtnEl = document.getElementById('enable-pastor-button');
            const pastorWhatsappEl = document.getElementById('pastor-whatsapp-number');
            const showLogoCornerEl = document.getElementById('show-logo-corner'); // CORRIGIDO: Definir antes de usar
            const logoEl = document.getElementById('logo-url');
            const buttonLogoEl = document.getElementById('button-logo-url'); // CORRIGIDO: Definir antes de usar
            const buttonLogoSizeEl = document.getElementById('button-logo-size'); // Tamanho da logo do botão
            const bannerEl = document.getElementById('banner-image-url');
            const headerEl = document.getElementById('header-image-url');
            const backgroundEl = document.getElementById('background-image-url');
            const opacityEl = document.getElementById('background-opacity');
            const themeEl = document.getElementById('form-theme');
            const primaryColorEl = document.getElementById('primary-color');
            const textColorEl = document.getElementById('text-color');
            const displayFormatEl = document.querySelector('input[name="display-format"]:checked') || document.querySelector('input[name="display-format"]');
            
            // Buscar elementos do preview para valores alternativos
            const previewTitleEl = document.getElementById('preview-title');
            const previewDescEl = document.getElementById('preview-description');
            
            const finalFormFields = parsedFields.length > 0 ? parsedFields : (formFields.length > 0 ? formFields : []);
            
            // Verificar se está em modo "Lista de Convidados" - ANTES de usar no updateData
            const guestListInput = document.getElementById('is-guest-list-mode');
            // L"GICA CORRIGIDA: Se o input tem valor 'false', NÃO é modo lista (independente de window.currentFormIsGuestList)
            // Se o input tem valor 'true', ? modo lista
            // Se o input não existe, usar window.currentFormIsGuestList como fallback
            let isGuestListMode = false;
            if (guestListInput) {
                // Se o input existe, usar APENAS o valor dele (respeitar explicitamente false)
                isGuestListMode = guestListInput.value === 'true';
            } else {
                // Se o input não existe, usar a variável global como fallback
                isGuestListMode = window.currentFormIsGuestList === true;
            }
            
            console.log('[SAVE] Verificando modo lista de convidados:', {
                window_currentFormIsGuestList: window.currentFormIsGuestList,
                guestListInput_value: guestListInput?.value,
                guestListInput_exists: !!guestListInput,
                isGuestListMode: isGuestListMode,
                itemId: currentItemId
            });
            
            // Obter is_listed do modal ou padrão (true)
            // Verificar também o checkbox do modal diretamente
            const modalIsListedCheckbox = document.getElementById('modal-is-listed');
            let isListed = true; // Default true
            if (window.currentFormIsListed !== undefined) {
                isListed = window.currentFormIsListed;
            } else if (modalIsListedCheckbox) {
                isListed = modalIsListedCheckbox.checked;
            } else if (currentItemData.is_listed !== undefined) {
                isListed = currentItemData.is_listed;
            }
            
            console.log('[SAVE] is_listed determinado:', {
                window_currentFormIsListed: window.currentFormIsListed,
                modalCheckbox_checked: modalIsListedCheckbox?.checked,
                currentItemData_is_listed: currentItemData.is_listed,
                final_isListed: isListed
            });
            
            // Obter valores do botão do pastor e logo
            const enablePastor = enablePastorBtnEl?.value === 'true' || enablePastorBtnEl?.value === true;
            const pastorWhatsapp = pastorWhatsappEl?.value.trim() || null;
            const pastorButtonNameEl = document.getElementById('pastor-button-name');
            const pastorButtonName = pastorButtonNameEl?.value.trim() || 'Enviar Mensagem para o Pastor';
            const showLogoCorner = showLogoCornerEl?.value === 'true' || showLogoCornerEl?.value === true;
            
            // IMPORTANTE: Buscar buttonLogoEl e buttonLogoSizeEl novamente para garantir que estão atualizados
            let buttonLogoElFinal = buttonLogoEl || document.getElementById('button-logo-url');
            let buttonLogoSizeElFinal = buttonLogoSizeEl || document.getElementById('button-logo-size');
            
            // Se ainda não existir, criar
            if (!buttonLogoElFinal) {
                buttonLogoElFinal = document.createElement('input');
                buttonLogoElFinal.type = 'hidden';
                buttonLogoElFinal.id = 'button-logo-url';
                document.body.appendChild(buttonLogoElFinal);
                console.log('s️ [SAVE] button-logo-url criado durante save');
            }
            
            if (!buttonLogoSizeElFinal) {
                buttonLogoSizeElFinal = document.createElement('input');
                buttonLogoSizeElFinal.type = 'hidden';
                buttonLogoSizeElFinal.id = 'button-logo-size';
                buttonLogoSizeElFinal.value = '40'; // Valor padrão
                document.body.appendChild(buttonLogoSizeElFinal);
                console.log('s️ [SAVE] button-logo-size criado durante save');
            }
            
            console.log('[SAVE] Valores de logo antes de salvar:', {
                form_logo_url: logoEl?.value || 'não encontrado',
                button_logo_url: buttonLogoElFinal?.value || 'não encontrado',
                button_logo_size: buttonLogoSizeElFinal?.value || 'não encontrado',
                button_logo_size_type: typeof buttonLogoSizeElFinal?.value
            });
            
            // IMPORTANTE: Garantir que form_title seja capturado corretamente
            const formTitleValue = formTitleEl?.value?.trim() || formTitleEl?.value || previewTitleEl?.textContent?.trim() || previewTitleEl?.textContent || null;
            console.log('[SAVE] form_title capturado:', {
                formTitleEl_value: formTitleEl?.value,
                formTitleEl_exists: !!formTitleEl,
                previewTitleEl_textContent: previewTitleEl?.textContent,
                previewTitleEl_exists: !!previewTitleEl,
                final_form_title: formTitleValue
            });
            
            const updateData = {
                title: moduleTitleEl?.value.trim() || formTitleValue || null,
                form_title: formTitleValue,
                form_logo_url: logoEl?.value.trim() || null,
                button_logo_url: (() => {
                    const value = buttonLogoElFinal?.value?.trim();
                    if (value && value !== '' && value !== 'null' && value !== 'undefined') {
                        console.log('o. [SAVE] button_logo_url incluído no updateData:', value);
                        return value;
                    }
                    console.log('s️ [SAVE] button_logo_url vazio ou inválido, usando null');
                    return null;
                })(),
                button_logo_size: (() => {
                    const sizeValue = buttonLogoSizeElFinal?.value;
                    if (sizeValue) {
                        const parsed = parseInt(sizeValue, 10);
                        if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
                            console.log('o. [SAVE] button_logo_size incluído no updateData:', parsed);
                            return parsed;
                        }
                    }
                    console.log('s️ [SAVE] button_logo_size inválido, usando padrão 40');
                    return 40;
                })(),
                show_logo_corner: showLogoCorner,
                is_listed: isListed,
                form_description: formDescEl?.value.trim() || (previewDescEl?.textContent.trim()) || null,
                whatsapp_number: (() => {
                    // Primeiro tentar do input hidden principal
                    const whatsappInput = document.getElementById('whatsapp-number');
                    if (whatsappInput && whatsappInput.value.trim()) {
                        console.log('[SAVE] whatsapp_number do input hidden:', whatsappInput.value.trim());
                        return whatsappInput.value.trim();
                    }
                    // Depois tentar do modal (caso ainda não tenha sido atualizado no input hidden)
                    const modalWhatsappInput = document.querySelector('#modal-whatsapp-number');
                    if (modalWhatsappInput && modalWhatsappInput.value.trim()) {
                        // Atualizar input hidden para garantir consistência
                        if (whatsappInput) {
                            whatsappInput.value = modalWhatsappInput.value.trim();
                        } else {
                            const newInput = document.createElement('input');
                            newInput.type = 'hidden';
                            newInput.id = 'whatsapp-number';
                            newInput.value = modalWhatsappInput.value.trim();
                            document.body.appendChild(newInput);
                        }
                        console.log('[SAVE] whatsapp_number do modal:', modalWhatsappInput.value.trim());
                        return modalWhatsappInput.value.trim();
                    }
                    // Por último, tentar do whatsappEl (campo antigo)
                    const value = whatsappEl?.value.trim() || null;
                    console.log('[SAVE] whatsapp_number do whatsappEl:', value);
                    return value;
                })(),
                enable_pastor_button: enablePastor,
                pastor_whatsapp_number: enablePastor ? pastorWhatsapp : null,
                pastor_button_name: enablePastor ? pastorButtonName : null,
                display_format: displayFormatEl?.value || 'button',
                banner_image_url: bannerEl?.value.trim() || null,
                header_image_url: headerEl?.value.trim() || null,
                background_image_url: backgroundEl?.value.trim() || null,
                background_color: document.getElementById('background-color-url')?.value.trim() || null,
                card_color: document.getElementById('card-color')?.value.trim() || null,
                decorative_bar_color: (() => {
                    const decorativeBarColorEl = document.getElementById('decorative-bar-color');
                    const value = decorativeBarColorEl?.value?.trim();
                    const finalValue = value || primaryColorEl?.value || null;
                    console.log('[SAVE_FORM] Cor das barrinhas decorativas a ser salva:', {
                        decorativeBarColorEl: decorativeBarColorEl,
                        valueFromHidden: value,
                        primaryColor: primaryColorEl?.value,
                        finalValue: finalValue
                    });
                    return finalValue;
                })(),
                separator_line_color: (() => {
                    // Usar bar-color para salvar como separator_line_color (compatibilidade com backend)
                    const barColorEl = document.getElementById('bar-color');
                    const value = barColorEl?.value?.trim();
                    const finalValue = value || primaryColorEl?.value || '#4A90E2';
                    console.log('[SAVE_FORM] Cor da barra a ser salva (como separator_line_color):', {
                        barColorEl: barColorEl,
                        valueFromHidden: value,
                        primaryColor: primaryColorEl?.value,
                        finalValue: finalValue
                    });
                    return finalValue;
                })(),
                background_opacity: opacityEl ? parseFloat(opacityEl.value) : 1.0,
                theme: themeEl?.value || 'light',
                primary_color: primaryColorEl?.value || '#4A90E2',
                secondary_color: (() => {
                    const secondaryColorEl = document.getElementById('secondary-color');
                    const value = secondaryColorEl?.value?.trim();
                    // Se o valor estiver vazio ou for apenas espaços, usar null
                    return (value && value !== '' && value !== 'null' && value !== 'undefined') ? value : null;
                })(),
                text_color: textColorEl?.value || '#333333',
                form_fields: finalFormFields,
                // Campos de evento (data e endereço)
                event_date: (() => {
                    const eventDateEl = document.getElementById('event-date');
                    if (eventDateEl && eventDateEl.value) {
                        console.log('Y". [SAVE] event_date incluído no updateData:', eventDateEl.value);
                        return eventDateEl.value.trim() || null;
                    }
                    console.log('s️ [SAVE] event_date não encontrado ou vazio');
                    return null;
                })(),
                event_address: (() => {
                    const eventAddressEl = document.getElementById('event-address');
                    if (eventAddressEl && eventAddressEl.value) {
                        console.log('[SAVE] event_address incluído no updateData:', eventAddressEl.value);
                        return eventAddressEl.value.trim() || null;
                    }
                    console.log('s️ [SAVE] event_address não encontrado ou vazio');
                    return null;
                })(),
                event_address_lat: (() => {
                    const el = document.getElementById('event-address-lat');
                    if (el && el.value && !isNaN(parseFloat(el.value))) return parseFloat(el.value);
                    return null;
                })(),
                event_address_lon: (() => {
                    const el = document.getElementById('event-address-lon');
                    if (el && el.value && !isNaN(parseFloat(el.value))) return parseFloat(el.value);
                    return null;
                })(),
                // Opções de envio (sempre salvar, não apenas no modo guest_list)
                enable_whatsapp: (() => {
                    const input = document.getElementById('enable-whatsapp-value');
                    if (input) {
                        const value = input.value === 'true';
                        console.log('[SAVE] enable_whatsapp do input:', value);
                        return value;
                    }
                    // Se não tiver input, verificar se está definido em window
                    if (window.enableWhatsappValue !== undefined) {
                        console.log('[SAVE] enable_whatsapp do window:', window.enableWhatsappValue);
                        return window.enableWhatsappValue !== false;
                    }
                    // Default true se não tiver nada definido
                    console.log('[SAVE] enable_whatsapp usando default: true');
                    return true;
                })(),
                enable_guest_list_submit: (() => {
                    const input = document.getElementById('enable-guest-list-submit-value');
                    if (input) {
                        const value = input.value === 'true';
                        console.log('[SAVE] enable_guest_list_submit do input:', value);
                        return value;
                    }
                    // Se não tiver input, verificar se está definido em window
                    if (window.enableGuestListSubmitValue !== undefined) {
                        console.log('[SAVE] enable_guest_list_submit do window:', window.enableGuestListSubmitValue);
                        return window.enableGuestListSubmitValue === true;
                    }
                    // Default false se não tiver nada definido
                    console.log('[SAVE] enable_guest_list_submit usando default: false');
                    return false;
                })(),
                // send_mode: lead (Captação) ou checkin
                send_mode: (() => {
                    const sendModeInput = document.getElementById('send-mode-value');
                    if (sendModeInput && sendModeInput.value) {
                        const v = sendModeInput.value;
                        if (v === 'system-only') return 'checkin';
                        if (v === 'both' || v === 'whatsapp-only') return 'lead';
                        console.log('[SAVE] send_mode do input:', v);
                        return v;
                    }
                    
                    const enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                    const enableGuestListSubmit = enableGuestListSubmitInput ? enableGuestListSubmitInput.value === 'true' : (window.enableGuestListSubmitValue === true);
                    const determinedSendMode = enableGuestListSubmit ? 'checkin' : 'lead';
                    console.log('[SAVE] send_mode determinado:', { determinedSendMode, enableGuestListSubmit });
                    return determinedSendMode;
                })()
            };
            
            console.log('[SAVE] Verificando modo lista de convidados:', {
                window_currentFormIsGuestList: window.currentFormIsGuestList,
                guestListInput_value: guestListInput?.value,
                guestListInput_exists: !!guestListInput,
                isGuestListMode: isGuestListMode,
                itemId: currentItemId
            });
            
            console.log('[SAVE] Enviando dados completos para o servidor:', {
                form_fields_count: finalFormFields.length,
                form_fields: finalFormFields,
                itemId: currentItemId,
                isGuestListMode: isGuestListMode
            });
            
            let response;
            
            // IMPORTANTE: SEMPRE salvar cores do King Forms em digital_form_items PRIMEIRO
            // Independente de estar em modo guest_list ou não, as cores do King Forms devem ser salvas
            // Separadamente das cores da Portaria (guest_list_items)
            console.log('[SAVE] Salvando cores do King Forms em digital_form_items (independente do modo)...');
            
            // Salvar cores do King Forms via rota específica de digital_form
            // IMPORTANTE: SEMPRE garantir que item_type seja 'digital_form' para salvar cores
            updateData.item_type = 'digital_form';
            
            let digitalFormSaveResponse;
            let digitalFormSaveError = null;
            
            try {
                digitalFormSaveResponse = await fetch(`${API_URL}/api/profile/items/digital_form/${currentItemId}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(updateData)
                });
                
                if (!digitalFormSaveResponse.ok) {
                    const errorData = await digitalFormSaveResponse.json().catch(() => ({}));
                    digitalFormSaveError = errorData;
                    console.error('O [SAVE] Erro ao salvar cores do King Forms:', errorData);
                    // Não lançar erro aqui - continuar com o salvamento de guest_list se necessário
                } else {
                    const digitalFormResult = await digitalFormSaveResponse.json();
                    console.log('o. [SAVE] Cores do King Forms salvas com sucesso em digital_form_items:', {
                        primary_color: updateData.primary_color,
                        background_color: updateData.background_color,
                        separator_line_color: updateData.separator_line_color,
                        decorative_bar_color: updateData.decorative_bar_color,
                        card_color: updateData.card_color
                    });
                }
            } catch (error) {
                digitalFormSaveError = error;
                console.error('O [SAVE] Erro ao tentar salvar cores do King Forms:', error);
                // Continuar mesmo com erro - tentar salvar guest_list se necessário
            }
            
            if (isGuestListMode) {
                // Salvar como Lista de Convidados (dados funcionais, NÃO cores)
                // Garantir que item_type seja 'guest_list'
                const currentItem = await fetch(`${API_URL}/api/profile/items/${currentItemId}`, {
                    headers: getHeaders()
                }).then(r => r.json()).catch(() => ({ data: {} }));
                
                if (currentItem.data?.item_type !== 'guest_list') {
                    console.log('Y"" [SAVE] Atualizando item_type para guest_list');
                    await fetch(`${API_URL}/api/profile/items/${currentItemId}`, {
                        method: 'PUT',
                        headers: getHeaders(),
                        body: JSON.stringify({ item_type: 'guest_list' })
                    }).catch(err => console.warn('s️ Aviso ao atualizar item_type:', err));
                }
                
                // Verificar se já existe uma guest_list_item associada a este profile_item
                let guestListId = null;
                
                try {
                    const guestListCheckResponse = await fetch(`${API_URL}/api/guest-lists/${currentItemId}`, {
                        headers: getHeaders()
                    });
                    
                    if (guestListCheckResponse.ok) {
                        const existingList = await guestListCheckResponse.json();
                        if (existingList && existingList.guest_list_item_id) {
                            guestListId = existingList.guest_list_item_id;
                        }
                    }
                } catch (err) {
                    console.log('Lista de convidados não encontrada, será criada:', err);
                }
                
                // Se não existe, criar guest_list_item associada ao profile_item atual
                // Precisamos fazer isso via backend que cria a associação
                if (!guestListId) {
                    // Tentar criar através de um endpoint especial ou modificar o item_type
                    // Por enquanto, vamos atualizar o profile_item para guest_list e criar a lista
                    // Mas manter a compatibilidade criando a associação diretamente no backend
                    
                    // Fazer POST para criar guest_list_item usando profile_item_id existente
                    // IMPORTANTE: CORES COMPLETAMENTE SEPARADAS!
                    // Ao criar guest_list_items, NÃO usar cores de digital_form_items (King Forms)
                    // Portaria terá suas próprias cores padrão (definidas no backend)
                    // King Forms mantém cores em digital_form_items, Portaria mantém cores em guest_list_items
                    console.log(`YZ [SAVE] CORES SEPARADAS: Criando guest_list_items SEM cores do King Forms`);
                    
                    const createResponse = await fetch(`${API_URL}/api/guest-lists`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({
                            title: updateData.form_title || 'Lista de Convidados',
                            event_title: updateData.form_title || 'Lista de Convidados',
                            event_description: updateData.form_description || '',
                            custom_form_fields: finalFormFields,
                            use_custom_form: finalFormFields.length > 0,
                            // CORES REMOVIDAS - NÃO sincronizar cores de King Forms para Portaria
                            // primary_color, text_color, background_color serão valores padrão da Portaria no backend
                            header_image_url: updateData.header_image_url,
                            background_image_url: updateData.background_image_url,
                            background_opacity: updateData.background_opacity,
                            theme: updateData.theme,
                            use_existing_profile_item: true, // Flag especial
                            profile_item_id: currentItemId // ID do profile_item existente
                            // NÃO incluir cores no payload - Portaria terá suas próprias cores independentes
                        })
                    });
                    
                    if (!createResponse.ok) {
                        const errorData = await createResponse.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Erro ao criar lista de convidados');
                    }
                    
                    const createdData = await createResponse.json();
                    guestListId = createdData.guest_list_item_id || createdData.id || createdData.profile_item_id;
                }
                
                // Atualizar lista de convidados existente
                const secondaryColorValue = document.getElementById('secondary-color')?.value || updateData.secondary_color || null;
                
                // Obter valores de enable_whatsapp e enable_guest_list_submit (respeitar checkbox "Salvar na Lista de Convidados")
                const enableWhatsappInput = document.getElementById('enable-whatsapp-value');
                const enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
                let enableWhatsappValue = enableWhatsappInput ? (enableWhatsappInput.value === 'true') : true;
                const enableGuestListSubmitValue = enableGuestListSubmitInput
                    ? (enableGuestListSubmitInput.value === 'true' || enableGuestListSubmitInput.value === '1')
                    : (window.enableGuestListSubmitValue === true);
                
                // PERMITIR ambas as opções juntas - não forçar mutuamente exclusivo
                // Quando "Enviar para WhatsApp" está ativo, pode também salvar no sistema
                
                // Obter número do WhatsApp de múltiplas fontes
                const whatsappNumber = (() => {
                    const whatsappInput = document.getElementById('whatsapp-number');
                    if (whatsappInput && whatsappInput.value.trim()) {
                        return whatsappInput.value.trim();
                    }
                    const modalWhatsappInput = document.querySelector('#modal-whatsapp-number');
                    if (modalWhatsappInput && modalWhatsappInput.value.trim()) {
                        return modalWhatsappInput.value.trim();
                    }
                    return updateData.whatsapp_number || null;
                })();
                
                // IMPORTANTE: CORES COMPLETAMENTE SEPARADAS!
                // Quando salvar no King Forms (mesmo com enable_guest_list_submit ativo),
                // NÃO enviar cores para guest_list_items - cada sistema mantém suas próprias cores
                // King Forms usa cores de digital_form_items, Portaria usa cores de guest_list_items
                // Apenas sincronizar dados funcionais (form_title, form_fields, logos, enable_whatsapp, enable_guest_list_submit)
                // NÃO sincronizar cores: primary_color, secondary_color, text_color, background_color, card_color, decorative_bar_color, separator_line_color
                console.log(`YZ [SAVE] CORES SEPARADAS: Não enviando cores do King Forms para guest_list_items (Portaria)`);
                console.log(`YZ [SAVE] Cores do King Forms (primary_color: ${updateData.primary_color}, background_color: ${updateData.background_color}) serão salvas APENAS em digital_form_items`);
                
                const guestListUpdateData = {
                    title: updateData.form_title, // Atualizar título do profile_item também
                    event_title: updateData.form_title,
                    event_description: updateData.form_description,
                    custom_form_fields: finalFormFields,
                    use_custom_form: finalFormFields.length > 0,
                    // CORES REMOVIDAS - NÃO sincronizar cores de King Forms para Portaria
                    // primary_color, secondary_color, text_color, background_color, card_color, decorative_bar_color, separator_line_color
                    // são mantidas apenas em digital_form_items (King Forms)
                    // Portaria (guest_list_items) mantém suas próprias cores independentes
                    header_image_url: updateData.header_image_url,
                    background_image_url: updateData.background_image_url,
                    background_opacity: updateData.background_opacity,
                    theme: updateData.theme,
                    // NÃO incluir cores no payload
                    enable_whatsapp: enableWhatsappValue,
                    enable_guest_list_submit: enableGuestListSubmitValue,
                    whatsapp_number: whatsappNumber || null,
                    // IMPORTANTE: Incluir campos de logo no payload (dados funcionais, não cores)
                    form_logo_url: updateData.form_logo_url || null,
                    button_logo_url: updateData.button_logo_url || null,
                    button_logo_size: updateData.button_logo_size || 40,
                    show_logo_corner: updateData.show_logo_corner || false
                    // decorative_bar_color, card_color, separator_line_color REMOVIDOS
                    // Cada sistema (King Forms/digital_form_items e Portaria/guest_list_items) mantém suas próprias cores
                };
                
                console.log('[GUEST_LIST] Salvando APENAS dados funcionais (SEM cores do King Forms):', {
                    enable_whatsapp: enableWhatsappValue,
                    enable_guest_list_submit: enableGuestListSubmitValue,
                    whatsapp_number: whatsappNumber || 'null',
                    form_logo_url: updateData.form_logo_url || 'null',
                    button_logo_url: updateData.button_logo_url || 'null',
                    button_logo_size: updateData.button_logo_size || 40,
                    show_logo_corner: updateData.show_logo_corner || false,
                    message: 'CORES REMOVIDAS - King Forms não sincroniza cores para Portaria'
                });
                
                // Usar currentItemId (profile_item_id) para o PUT
                // IMPORTANTE: Isso salva apenas dados funcionais (form_fields, logos, enable_whatsapp)
                // As cores já foram salvas acima em digital_form_items
                response = await fetch(`${API_URL}/api/guest-lists/${currentItemId}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(guestListUpdateData)
                });
                
                console.log('[SAVE] Dados funcionais salvos em guest_list_items (cores já foram salvas em digital_form_items)');
                
                // Usar a resposta do digital_form como principal (já que contém as cores)
                // response já está definido, mas vamos usar o digitalFormSaveResponse como resposta principal
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.warn('s️ [SAVE] Aviso ao salvar dados funcionais em guest_list_items:', errorData);
                    // Não lançar erro - as cores já foram salvas
                }
            } else {
                // Não está em modo guest_list - cores já foram salvas acima
                // Apenas garantir que item_type seja digital_form
                console.log('[SAVE] Modo King Forms (não guest_list) - cores já foram salvas acima');
                
                // SEMPRE incluir item_type = 'digital_form' no updateData quando não está em modo guest list
                updateData.item_type = 'digital_form';
                
                // Verificar se estava como guest_list antes para log
                const currentItem = await fetch(`${API_URL}/api/profile/items/${currentItemId}`, {
                    headers: getHeaders()
                }).then(r => r.json()).catch(() => ({ data: {} }));
                
                const wasGuestList = currentItem.data?.item_type === 'guest_list';
                if (wasGuestList) {
                    console.log('Y"" [SAVE] Item era guest_list, convertendo para digital_form');
                    // Atualizar item_type se necessário
                    await fetch(`${API_URL}/api/profile/items/${currentItemId}`, {
                        method: 'PUT',
                        headers: getHeaders(),
                        body: JSON.stringify({ item_type: 'digital_form' })
                    }).catch(err => console.warn('s️ Aviso ao atualizar item_type:', err));
                }
                
                // response já foi definido no bloco acima (digitalFormSaveResponse)
                response = digitalFormSaveResponse;
                
                console.log('[SAVE] Salvo como Formulário Digital (cores já foram salvas acima)');
            }
            
            // IMPORTANTE: Verificar se houve erro
            // Priorizar digitalFormSaveResponse (cores do King Forms)
            const finalResponse = response || digitalFormSaveResponse;
            
            // Se houve erro ao salvar cores do King Forms E não há resposta alternativa, lançar erro
            if (digitalFormSaveError && (!digitalFormSaveResponse || !digitalFormSaveResponse.ok) && (!response || !response.ok)) {
                throw new Error(digitalFormSaveError.message || 'Erro ao salvar cores do King Forms no digital_form_items.');
            }
            
            // Se digitalFormSaveResponse foi bem-sucedido, usar ele como resultado principal
            if (digitalFormSaveResponse && digitalFormSaveResponse.ok) {
                try {
                    const result = await digitalFormSaveResponse.json();
                    console.log('o. [SAVE] Formulário King Forms salvo com sucesso no servidor:', result);
                    console.log('o. [SAVE] Verifique no formulário público se as cores aparecem.');
                } catch (e) {
                    console.warn('s️ [SAVE] Aviso ao ler resposta do digital_form:', e);
                }
            }
            
            // Se response (guest_list) foi bem-sucedido também, logar
            if (response && response.ok && response !== digitalFormSaveResponse) {
                try {
                    const guestListResult = await response.json();
                    console.log('o. [SAVE] Dados funcionais da guest_list também foram salvos:', guestListResult);
                } catch (e) {
                    console.warn('s️ [SAVE] Aviso ao ler resposta da guest_list:', e);
                }
            }
            
            // Reaplicar cores após salvar para garantir que fiquem atualizadas
            const secondaryColorValue = document.getElementById('secondary-color')?.value || updateData.secondary_color || null;
            const decorativeBarColorValue = document.getElementById('decorative-bar-color')?.value || updateData.decorative_bar_color || updateData.primary_color || '#4A90E2';
            applyCustomColors({
                theme: updateData.theme || 'light',
                primary_color: updateData.primary_color || '#4A90E2',
                secondary_color: secondaryColorValue,
                text_color: updateData.text_color || '#333333',
                background_image_url: updateData.background_image_url || '',
                background_color: updateData.background_color || '#FFFFFF',
                background_opacity: updateData.background_opacity !== undefined ? updateData.background_opacity : 1.0,
                card_color: updateData.card_color || '#FFFFFF',
                decorative_bar_color: decorativeBarColorValue
            });
            
            // Atualizar botão do preview baseado nas configurações
            updatePreviewButton();
            
            // IMPORTANTE: NÃO recarregar dados automaticamente após salvar para evitar sobrescrever alterações
            // Os dados já estão atualizados no frontend após o salvamento bem-sucedido
            // O recarregamento automático estava causando perda de alterações (especialmente card_color e decorative_bar_color)
            // Se necessário recarregar, fazer manualmente ou apenas atualizar elementos específicos que não foram salvos
                        
            // Atualizar botão do preview baseado nas configurações
                        if (typeof updatePreviewButton === 'function') {
                            updatePreviewButton();
                        }
                        
            // Mostrar mensagem de sucesso apenas uma vez
                        if (typeof showSuccessMessage === 'function') {
                showSuccessMessage('Formulário salvo com sucesso!');
                        } else {
                console.log('o. [SAVE] Formulário salvo com sucesso!');
                        }
            
            // Atualizar previews de imagens se necessário (sem recarregar tudo)
            const formDataCurrent = currentItemData?.digital_form_data || {};
            updateImagePreviews(formDataCurrent);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar';
            
        } catch (error) {
            console.error('Erro ao salvar:', error);
            // Mostrar mensagem de erro premium
            const errorMsg = document.createElement('div');
            errorMsg.className = 'success-message';
            errorMsg.style.background = 'linear-gradient(135deg, #F43F5E, #DC2626)';
            errorMsg.style.boxShadow = '0 8px 24px rgba(244, 63, 94, 0.3)';
            errorMsg.innerHTML = `
                <i class="fas fa-exclamation-circle" style="font-size: 20px;"></i>
                <span>Erro ao salvar: ${error.message}</span>
            `;
            document.body.appendChild(errorMsg);
            setTimeout(() => {
                errorMsg.style.animation = 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                setTimeout(() => errorMsg.remove(), 400);
            }, 4000);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar';
        }
        });
    }
    
    // Adicionar imagem de cabeçalho COM CROP
    function addHeaderImage() {
        // Verificar se já existe um modal de crop aberto
        const existingCropModal = document.querySelector('.header-crop-modal, [style*="z-index: 10000"]');
        if (existingCropModal && existingCropModal.querySelector('#header-crop-image')) {
            return; // Já existe um modal aberto
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/jpg';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                alert('Apenas imagens PNG ou JPG são permitidas.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 5MB.');
                return;
            }
            
            // Criar modal de crop
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
            modal.innerHTML = `
                <div style="background: #1C1C21; padding: 30px; border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #ECECEC; font-size: 24px; font-weight: 700;">Ajustar Imagem de Cabeçalho</h3>
                        <button class="close-crop-modal" style="background: none; border: none; color: #A1A1A1; font-size: 24px; cursor: pointer; padding: 5px 10px;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="flex: 1; overflow: hidden; margin-bottom: 20px;">
                        <img id="header-crop-image" style="max-width: 100%; max-height: 60vh;">
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="cancel-crop-btn" style="padding: 12px 24px; background: transparent; border: 1px solid #2C2C2F; color: #ECECEC; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Cancelar
                        </button>
                        <button class="confirm-crop-btn" style="padding: 12px 24px; background: #FFC700; border: none; color: #000; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Aplicar
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.getElementById('header-crop-image');
                img.src = e.target.result;
                
                // Inicializar Cropper
                const cropper = new Cropper(img, {
                    aspectRatio: NaN, // Sem proporção fixa
                    viewMode: 1,
                    background: false,
                    autoCropArea: 1,
                    responsive: true,
                    guides: true,
                    center: true,
                    highlight: true,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleable: false
                });
                
                // Fechar modal
                modal.querySelector('.close-crop-modal').addEventListener('click', () => {
                    cropper.destroy();
                    modal.remove();
                });
                modal.querySelector('.cancel-crop-btn').addEventListener('click', () => {
                    cropper.destroy();
                    modal.remove();
                });
                
                // Aplicar crop e fazer upload
                modal.querySelector('.confirm-crop-btn').addEventListener('click', async () => {
                    try {
                        // Obter canvas do crop
                        const canvas = cropper.getCroppedCanvas({
                            width: 1200,
                            height: 400,
                            imageSmoothingEnabled: true,
                            imageSmoothingQuality: 'high'
                        });
                        
                        // Converter para blob preservando o tipo original
                        const isPNG = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
                        canvas.toBlob(async (blob) => {
                            try {
                                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                                    method: 'POST',
                                    headers: getHeaders()
                                });
                                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                                const { uploadURL } = await authResponse.json();
                                
                                // Preservar extensão original
                                const originalName = file.name || 'header-image';
                                const fileExtension = isPNG ? 'png' : 'jpg';
                                const fileName = originalName.includes('.') 
                                    ? originalName.substring(0, originalName.lastIndexOf('.')) + '.' + fileExtension
                                    : `${originalName}.${fileExtension}`;
                                
                                const formData = new FormData();
                                formData.append('file', blob, fileName);
                                
                                const uploadResponse = await fetch(uploadURL, {
                                    method: 'POST',
                                    body: formData,
                                    headers: getAuthHeadersOnly()
                                });
                                if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');
                                const uploadData = await uploadResponse.json();
                                const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                                const imageUrl = `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public`;
                                
                                // Atualizar campo hidden e preview
                                const headerImageUrlEl = document.getElementById('header-image-url');
                                const headerImageContainer = document.getElementById('preview-header-image-container');
                                const headerImage = document.getElementById('preview-header-image');
                                
                                if (headerImageUrlEl) headerImageUrlEl.value = imageUrl;
                                if (headerImage && headerImageContainer) {
                                    headerImage.src = imageUrl;
                                    headerImageContainer.style.display = 'block';
                                }
                                
                                cropper.destroy();
                                modal.remove();
                            } catch (error) {
                                console.error('Erro ao fazer upload:', error);
                                alert('Erro ao fazer upload da imagem: ' + error.message);
                            }
                        }, isPNG ? 'image/png' : 'image/jpeg', 0.95);
                    } catch (error) {
                        console.error('Erro ao processar crop:', error);
                        alert('Erro ao processar imagem: ' + error.message);
                    }
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }
    
    // Abrir personalizador de cores com temas premium (VERSfO COMPLETA)
    function openColorCustomizer() {
        const backgroundImageUrlEl = document.getElementById('background-image-url');
        const backgroundOpacityEl = document.getElementById('background-opacity');
        const backgroundColorEl = document.getElementById('background-color-url'); // Campo hidden para cor de fundo
        const themeEl = document.getElementById('form-theme');
        const primaryColorEl = document.getElementById('primary-color');
        const textColorEl = document.getElementById('text-color');
        
        // Detectar tema atual
        const currentTheme = themeEl?.value || 'light';
        const currentPrimary = primaryColorEl?.value || '#4A90E2';
        const currentText = textColorEl?.value || '#333333';
        const currentBackgroundColor = backgroundColorEl?.value || '#FFFFFF';
        const cardColorEl = document.getElementById('card-color');
        const currentCardColor = cardColorEl?.value || formData.card_color || '#FFFFFF';
        const secondaryColorEl = document.getElementById('secondary-color');
        const currentSecondary = secondaryColorEl?.value || formData.secondary_color || '#6BA3F0';
        
        // Obter cor atual das barrinhas decorativas
        let decorativeBarColorEl = document.getElementById('decorative-bar-color');
        const currentDecorativeBarColor = decorativeBarColorEl?.value || formData.decorative_bar_color || currentPrimary;
        
        // Obter cor atual da barra principal
        let barColorEl = document.getElementById('bar-color');
        const currentBarColor = barColorEl?.value || formData.separator_line_color || currentPrimary;
        
        // Identificar tema atual baseado nas cores
        let selectedThemeKey = 'custom';
        for (const [key, theme] of Object.entries(premiumThemes)) {
            if (key !== 'custom' && theme.theme === currentTheme && 
                theme.primary_color.toLowerCase() === currentPrimary.toLowerCase() &&
                theme.text_color.toLowerCase() === currentText.toLowerCase()) {
                selectedThemeKey = key;
                break;
            }
        }
        
        const modal = document.createElement('div');
        modal.className = 'color-customizer-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); backdrop-filter: blur(12px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;';
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 0; border-radius: 24px; max-width: 1200px; width: 100%; max-height: 95vh; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 30px 80px rgba(0,0,0,0.7); animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
                <style>
                    @keyframes slideDown {
                        from { transform: translateY(-30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                </style>
                <div style="background: linear-gradient(135deg, #FFC70015 0%, transparent 100%); padding: 32px 40px; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="margin: 0 0 8px 0; color: #ECECEC; font-size: 28px; font-weight: 800; display: flex; align-items: center; gap: 12px;">
                                <i class="fas fa-palette" style="color: #FFC700;"></i>
                                Temas Premium - King Forms
                            </h3>
                            <p style="margin: 0; color: #A1A1A1; font-size: 15px;">Escolha um tema ou personalize suas cores</p>
                        </div>
                        <button class="close-modal-btn" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #A1A1A1; font-size: 20px; cursor: pointer; padding: 12px 16px; border-radius: 12px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700'; this.style.color='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#A1A1A1';">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div style="padding: 40px; display: grid; grid-template-columns: 1fr 400px; gap: 32px;">
                    <!-- Coluna Esquerda: Seleção de Temas -->
                    <div>
                        <div style="margin-bottom: 24px;">
                            <label style="display: block; margin-bottom: 16px; color: #ECECEC; font-weight: 700; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-paint-brush" style="color: #FFC700;"></i>
                                Temas Premium
                            </label>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px;">
                                ${Object.entries(premiumThemes).map(([key, theme]) => `
                                    <div class="theme-card" data-theme-key="${key}" style="padding: 20px; background: ${selectedThemeKey === key ? 'linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1))' : 'linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%)'}; border: 2px solid ${selectedThemeKey === key ? '#FFC700' : 'rgba(255,255,255,0.1)'}; border-radius: 16px; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${theme.primary_color}, ${theme.primary_color}80);"></div>
                                        <div style="font-size: 2.5rem; margin-bottom: 12px; color: ${theme.primary_color}; text-align: center;">
                                            <i class="${theme.icon}"></i>
                                        </div>
                                        <div style="font-weight: 700; font-size: 14px; color: #ECECEC; margin-bottom: 6px; text-align: center;">${theme.name}</div>
                                        <div style="font-size: 11px; color: #A1A1A1; text-align: center; line-height: 1.4;">${theme.description}</div>
                                        ${selectedThemeKey === key ? '<div class="check-icon" style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; background: #FFC700; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #000; font-size: 12px;"><i class="fas fa-check"></i></div>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Personalização Avançada -->
                        <div style="margin-top: 32px; padding: 24px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                            <label style="display: block; margin-bottom: 16px; color: #ECECEC; font-weight: 700; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-sliders-h" style="color: #FFC700;"></i>
                                Personalização Avançada
                            </label>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Cor Primária</label>
                                <input type="color" id="customizer-primary-color" value="${currentPrimary}" style="width: 100%; height: 50px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1);">
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Cor Secundária</label>
                                <input type="color" id="customizer-secondary-color" value="${currentSecondary}" style="width: 100%; height: 50px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1);">
                                <div style="margin-top: 8px; font-size: 12px; color: #A1A1A1;">
                                    <i class="fas fa-info-circle"></i> Use quando a cor primária for muito escura (ex: preto)
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Cor do Texto</label>
                                <input type="color" id="customizer-text-color" value="${currentText}" style="width: 100%; height: 50px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1);">
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Cor de Fundo</label>
                                <input type="color" id="customizer-background-color" value="${currentBackgroundColor || '#FFFFFF'}" style="width: 100%; height: 50px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1);">
                                <div style="margin-top: 8px; font-size: 12px; color: #A1A1A1;">
                                    <i class="fas fa-info-circle"></i> A cor de fundo será aplicada quando não houver imagem de fundo
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Cor do Card/Container</label>
                                <input type="color" id="customizer-card-color" value="${currentCardColor || '#FFFFFF'}" style="width: 100%; height: 50px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1);">
                                <div style="margin-top: 8px; font-size: 12px; color: #A1A1A1;">
                                    <i class="fas fa-info-circle"></i> Cor do fundo dos cards brancos do formulário (container principal)
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Cor das Barras Decorativas</label>
                                <input type="color" id="customizer-decorative-bar-color" value="${currentDecorativeBarColor}" style="width: 100%; height: 50px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1);">
                                <div style="margin-top: 8px; font-size: 12px; color: #A1A1A1;">
                                    <i class="fas fa-info-circle"></i> Cor das barrinhas decorativas ao lado dos labels dos campos (padrão: cor primária)
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Cor da Barra</label>
                                <input type="color" id="customizer-bar-color" value="${currentBarColor || currentPrimary}" style="width: 100%; height: 50px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1);">
                                <div style="margin-top: 8px; font-size: 12px; color: #A1A1A1;">
                                    <i class="fas fa-info-circle"></i> Cor da barra vertical ao lado do título "Preencha os dados" (padrão: cor primária)
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Imagem de Fundo (opcional)</label>
                                <input type="file" id="customizer-background-image" accept="image/*" style="display: none;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                    <button type="button" id="customizer-upload-background" style="padding: 14px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; color: #ECECEC; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)';">
                                        <i class="fas fa-upload"></i> Upload
                                    </button>
                                    <button type="button" id="customizer-search-background" style="padding: 14px; background: linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1)); border: 2px solid rgba(255,199,0,0.3); border-radius: 12px; color: #FFC700; cursor: pointer; font-weight: 700; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.3)'; this.style.borderColor='#FFC700';" onmouseout="this.style.background='linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1))'; this.style.borderColor='rgba(255,199,0,0.3)';">
                                        <i class="fas fa-search"></i> Buscar Online
                                    </button>
                                </div>
                                <div id="customizer-background-preview" style="margin-top: 12px; display: none;">
                                    <img id="customizer-background-preview-img" style="max-width: 100%; max-height: 150px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.1);">
                                    <button type="button" id="customizer-remove-background" style="margin-top: 12px; padding: 10px 20px; background: #ff4444; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
                                        <i class="fas fa-trash"></i> Remover
                                    </button>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; color: #ECECEC; font-weight: 600;">Opacidade do Fundo</label>
                                <input type="range" id="customizer-background-opacity" min="0" max="1" step="0.1" value="${backgroundOpacityEl?.value || 1}" style="width: 100%;">
                                <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                    <span style="font-size: 0.85rem; color: #A1A1A1;">0%</span>
                                    <span id="customizer-opacity-value" style="font-size: 0.85rem; color: #ECECEC; font-weight: 600;">${Math.round((backgroundOpacityEl?.value || 1) * 100)}%</span>
                                    <span style="font-size: 0.85rem; color: #A1A1A1;">100%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Coluna Direita: Preview -->
                    <div>
                        <div style="position: sticky; top: 20px;">
                            <label style="display: block; margin-bottom: 16px; color: #ECECEC; font-weight: 700; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-eye" style="color: #FFC700;"></i>
                                Pré-visualização
                            </label>
                            <div id="theme-preview-container" style="background: ${currentCardColor || (currentTheme === 'dark' ? '#1C1C21' : 'white')}; border-radius: 20px; padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: none; min-height: 400px; position: relative; overflow: hidden;">
                                <div id="preview-top-bar" style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${currentPrimary}, ${currentPrimary}80);"></div>
                                <h4 style="margin: 0 0 16px 0; color: ${currentText}; font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 12px;">
                                    <div id="preview-main-bar" style="width: 6px; height: 32px; background: ${currentBarColor || currentPrimary}; border-radius: 3px;"></div>
                                    King Forms
                                </h4>
                                <p style="margin: 0 0 24px 0; color: ${currentText === '#ECECEC' || currentText === '#FFFFFF' ? '#A1A1A1' : '#5f6368'}; font-size: 14px; line-height: 1.6;">Este é um exemplo de como seu formulário ficará com o tema selecionado.</p>
                                <div style="margin-bottom: 20px;">
                                    <label class="preview-label" style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; color: ${currentText}; font-weight: 600; font-size: 14px;">
                                        <span style="width: 3px; height: 18px; background: ${currentDecorativeBarColor}; border-radius: 2px; display: inline-block; margin-top: 2px; flex-shrink: 0;"></span>
                                        <span style="flex: 1;">Nome completo *</span>
                                    </label>
                                    <input type="text" placeholder="Digite seu nome" class="preview-input" style="width: 100%; padding: 12px 16px; border: 2px solid ${currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8eaed'}; border-radius: 12px; font-size: 14px; background: ${currentTheme === 'dark' ? '#2C2C2F' : '#f8f9fa'}; color: ${currentText};" readonly>
                                </div>
                                <div style="margin-bottom: 20px;">
                                    <label class="preview-label" style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; color: ${currentText}; font-weight: 600; font-size: 14px;">
                                        <span style="width: 3px; height: 18px; background: ${currentDecorativeBarColor}; border-radius: 2px; display: inline-block; margin-top: 2px; flex-shrink: 0;"></span>
                                        <span style="flex: 1;">Email *</span>
                                    </label>
                                    <input type="email" placeholder="seu@email.com" class="preview-input" style="width: 100%; padding: 12px 16px; border: 2px solid ${currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8eaed'}; border-radius: 12px; font-size: 14px; background: ${currentTheme === 'dark' ? '#2C2C2F' : '#f8f9fa'}; color: ${currentText};" readonly>
                                </div>
                                <button style="width: 100%; padding: 14px; background: linear-gradient(135deg, #25D366, #20BA5A); color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: default; margin-top: 8px;">
                                    <i class="fab fa-whatsapp"></i> Enviar via WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 32px 40px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="cancel-btn" style="padding: 14px 28px; background: transparent; border: 2px solid rgba(255,255,255,0.1); color: #ECECEC; border-radius: 12px; cursor: pointer; font-weight: 700; transition: all 0.3s;" onmouseover="this.style.borderColor='rgba(255,255,255,0.3)'; this.style.background='rgba(255,255,255,0.05)';" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='transparent';">
                        Cancelar
                    </button>
                    <button class="save-colors-btn" style="padding: 14px 28px; background: linear-gradient(135deg, #FFC700, #FFA500); border: none; color: #000; border-radius: 12px; cursor: pointer; font-weight: 700; box-shadow: 0 4px 12px rgba(255,199,0,0.3); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255,199,0,0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(255,199,0,0.3)';">
                        <i class="fas fa-check"></i> Aplicar Tema
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Função para atualizar preview
        const updatePreview = (themeKey) => {
            const theme = premiumThemes[themeKey] || premiumThemes.custom;
            const previewContainer = modal.querySelector('#theme-preview-container');
            const primaryColorInput = modal.querySelector('#customizer-primary-color');
            const textColorInput = modal.querySelector('#customizer-text-color');
            const secondaryColorInput = modal.querySelector('#customizer-secondary-color');
            const backgroundColorInput = modal.querySelector('#customizer-background-color');
            const cardColorInput = modal.querySelector('#customizer-card-color');
            
            if (primaryColorInput) primaryColorInput.value = theme.primary_color;
            if (textColorInput) textColorInput.value = theme.text_color;
            if (secondaryColorInput) secondaryColorInput.value = theme.secondary_color || theme.primary_color;
            
            if (previewContainer) {
                // Atualizar background do container baseado no tema
                const bgColor = theme.theme === 'dark' ? '#1C1C21' : '#FFFFFF';
                previewContainer.style.background = bgColor;
                
                // Atualizar linha do topo (traço) com a cor primária
                const topBar = previewContainer.querySelector('#preview-top-bar');
                if (topBar) {
                    topBar.style.background = `linear-gradient(90deg, ${theme.primary_color}, ${theme.primary_color}80)`;
                }
                
                // Atualizar título
                const h4 = previewContainer.querySelector('h4');
                if (h4) h4.style.color = theme.text_color;
                
                // Atualizar parágrafo
                const p = previewContainer.querySelector('p');
                if (p) {
                    p.style.color = (theme.text_color === '#ECECEC' || theme.text_color === '#FFFFFF') ? '#A1A1A1' : '#5f6368';
                }
                
                // Atualizar labels
                previewContainer.querySelectorAll('.preview-label, label').forEach(l => {
                    l.style.color = theme.text_color;
                });
                
                // Atualizar barra principal (6px) ao lado do título
                const barColorInput = modal.querySelector('#customizer-bar-color');
                const barColor = barColorInput ? barColorInput.value : theme.primary_color;
                const mainBar = previewContainer.querySelector('#preview-main-bar');
                if (mainBar) {
                    mainBar.style.background = barColor;
                }
                
                // Atualizar barras decorativas (apenas as de 3px ao lado dos labels)
                // Marcar que estamos atualizando estilos para evitar loops no MutationObserver
                isUpdatingStyles = true;
                const decorativeBarColorInput = modal.querySelector('#customizer-decorative-bar-color');
                const decorativeBarColor = decorativeBarColorInput ? decorativeBarColorInput.value : theme.primary_color;
                previewContainer.querySelectorAll('span[style*="width: 3px"][style*="height: 18px"]').forEach(bar => {
                    const currentStyle = bar.getAttribute('style') || '';
                    const cleanedStyle = currentStyle.replace(/background:[^;]+;?/gi, '').trim();
                    const newStyle = (cleanedStyle ? cleanedStyle + '; ' : '') + `background: ${decorativeBarColor} !important;`;
                    bar.setAttribute('style', newStyle);
                });
                setTimeout(() => { isUpdatingStyles = false; }, 100);
                
                // Atualizar inputs
                previewContainer.querySelectorAll('.preview-input, input').forEach(i => {
                    if (i.type === 'text' || i.type === 'email') {
                    i.style.background = theme.theme === 'dark' ? '#2C2C2F' : '#f8f9fa';
                    i.style.color = theme.text_color;
                        i.style.borderColor = theme.theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8eaed';
                    }
                });
            }
            
            // Atualizar seleção visual
            modal.querySelectorAll('.theme-card').forEach(card => {
                const key = card.dataset.themeKey;
                if (key === themeKey) {
                    card.style.background = 'linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1))';
                    card.style.borderColor = '#FFC700';
                    if (!card.querySelector('.check-icon')) {
                        const check = document.createElement('div');
                        check.className = 'check-icon';
                        check.style.cssText = 'position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; background: #FFC700; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #000; font-size: 12px;';
                        check.innerHTML = '<i class="fas fa-check"></i>';
                        card.appendChild(check);
                    }
                } else {
                    card.style.background = 'linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%)';
                    card.style.borderColor = 'rgba(255,255,255,0.1)';
                    const check = card.querySelector('.check-icon');
                    if (check) check.remove();
                }
            });
        };
        
        // Event listeners para cards de tema
        modal.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const themeKey = card.dataset.themeKey;
                updatePreview(themeKey);
            });
        });
        
        // Função para verificar se a cor é muito escura (preto)
        function isDarkColor(color) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness < 50; // Se brightness < 50, é muito escuro (próximo do preto)
        }
        
        // Atualizar preview quando cores mudarem
        modal.querySelector('#customizer-primary-color').addEventListener('input', (e) => {
            const previewContainer = modal.querySelector('#theme-preview-container');
            const secondaryColorContainer = modal.querySelector('#customizer-secondary-color-container');
            
            // Mostrar cor secundária se a primária for muito escura
            if (isDarkColor(e.target.value)) {
                if (secondaryColorContainer) secondaryColorContainer.style.display = 'block';
            } else {
                if (secondaryColorContainer) secondaryColorContainer.style.display = 'none';
            }
            
            if (previewContainer) {
                const primaryColor = e.target.value;
                const secondaryColorInput = modal.querySelector('#customizer-secondary-color');
                const secondaryColor = secondaryColorInput ? secondaryColorInput.value : primaryColor;
                const topBar = previewContainer.querySelector('#preview-top-bar');
                if (topBar) {
                    topBar.style.background = `linear-gradient(90deg, ${primaryColor}, ${primaryColor}80)`;
                }
            }
            
            // IMPORTANTE: Atualizar preview principal em tempo real
            const primaryColorEl = document.getElementById('primary-color');
            const secondaryColorEl = document.getElementById('secondary-color');
            const textColorEl = document.getElementById('text-color');
            const themeEl = document.getElementById('form-theme');
            const cardColorEl = document.getElementById('card-color');
            const decorativeBarColorEl = document.getElementById('decorative-bar-color');
            const backgroundColorEl = document.getElementById('background-color');
            
            if (typeof applyCustomColors === 'function') {
                applyCustomColors({
                    primary_color: e.target.value,
                    secondary_color: modal.querySelector('#customizer-secondary-color')?.value || e.target.value,
                    text_color: modal.querySelector('#customizer-text-color')?.value || textColorEl?.value || '#202124',
                    theme: themeEl?.value || 'light',
                    card_color: cardColorEl?.value || '#FFFFFF',
                    decorative_bar_color: decorativeBarColorEl?.value || e.target.value,
                    background_color: backgroundColorEl?.value || (themeEl?.value === 'dark' ? '#0D0D0F' : '#f8f9fa')
                });
            }
        });
        
        // Atualizar preview quando cor secundária mudar
        modal.querySelector('#customizer-secondary-color')?.addEventListener('input', (e) => {
            const previewContainer = modal.querySelector('#theme-preview-container');
            const primaryColor = modal.querySelector('#customizer-primary-color').value;
            if (previewContainer) {
                // Sempre atualizar o preview com a cor primária (a linha do topo usa primária)
                const topBar = previewContainer.querySelector('#preview-top-bar');
                if (topBar) {
                    topBar.style.background = `linear-gradient(90deg, ${primaryColor}, ${primaryColor}80)`;
                }
            }
            
            // IMPORTANTE: Atualizar preview principal em tempo real
            const primaryColorEl = document.getElementById('primary-color');
            const textColorEl = document.getElementById('text-color');
            const themeEl = document.getElementById('form-theme');
            const cardColorEl = document.getElementById('card-color');
            const decorativeBarColorEl = document.getElementById('decorative-bar-color');
            const backgroundColorEl = document.getElementById('background-color');
            
            if (typeof applyCustomColors === 'function') {
                applyCustomColors({
                    primary_color: primaryColor,
                    secondary_color: e.target.value,
                    text_color: modal.querySelector('#customizer-text-color')?.value || textColorEl?.value || '#202124',
                    theme: themeEl?.value || 'light',
                    card_color: cardColorEl?.value || '#FFFFFF',
                    decorative_bar_color: decorativeBarColorEl?.value || primaryColor,
                    background_color: backgroundColorEl?.value || (themeEl?.value === 'dark' ? '#0D0D0F' : '#f8f9fa')
                });
            }
        });
        
        // Cor secundária agora está sempre visível
        const secondaryColorContainer = modal.querySelector('#customizer-secondary-color-container');
        if (secondaryColorContainer) secondaryColorContainer.style.display = 'block';
        
        modal.querySelector('#customizer-text-color').addEventListener('input', (e) => {
            const previewContainer = modal.querySelector('#theme-preview-container');
            if (previewContainer) {
                previewContainer.querySelector('h4').style.color = e.target.value;
                previewContainer.querySelectorAll('label').forEach(l => l.style.color = e.target.value);
                previewContainer.querySelectorAll('input').forEach(i => i.style.color = e.target.value);
                previewContainer.querySelector('p').style.color = e.target.value === '#ECECEC' ? '#A1A1A1' : '#5f6368';
            }
            
            // IMPORTANTE: Atualizar preview principal em tempo real
            const primaryColorEl = document.getElementById('primary-color');
            const secondaryColorEl = document.getElementById('secondary-color');
            const themeEl = document.getElementById('form-theme');
            const cardColorEl = document.getElementById('card-color');
            const decorativeBarColorEl = document.getElementById('decorative-bar-color');
            const backgroundColorEl = document.getElementById('background-color');
            
            if (typeof applyCustomColors === 'function') {
                applyCustomColors({
                    primary_color: modal.querySelector('#customizer-primary-color')?.value || primaryColorEl?.value || '#4A90E2',
                    secondary_color: modal.querySelector('#customizer-secondary-color')?.value || secondaryColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                    text_color: e.target.value,
                    theme: themeEl?.value || 'light',
                    card_color: cardColorEl?.value || '#FFFFFF',
                    decorative_bar_color: decorativeBarColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                    background_color: backgroundColorEl?.value || (themeEl?.value === 'dark' ? '#0D0D0F' : '#f8f9fa')
                });
            }
        });
        
        // Preencher valores atuais
        if (backgroundOpacityEl) {
            modal.querySelector('#customizer-background-opacity').value = backgroundOpacityEl.value;
            modal.querySelector('#customizer-opacity-value').textContent = Math.round(backgroundOpacityEl.value * 100) + '%';
        }
        
        // Se já houver imagem de fundo, mostrar no preview
        if (backgroundImageUrlEl && backgroundImageUrlEl.value) {
            const previewDiv = modal.querySelector('#customizer-background-preview');
            const previewImg = modal.querySelector('#customizer-background-preview-img');
            if (previewDiv && previewImg) {
                previewImg.src = backgroundImageUrlEl.value;
                previewDiv.style.display = 'block';
                previewDiv.dataset.imageUrl = backgroundImageUrlEl.value;
                // Atualizar preview do tema
                updatePreviewBackground(backgroundImageUrlEl.value);
            }
        }
        
        // Upload de imagem de fundo
        modal.querySelector('#customizer-upload-background').addEventListener('click', () => {
            modal.querySelector('#customizer-background-image').click();
        });
        
        // Buscar imagens na internet (Unsplash)
        modal.querySelector('#customizer-search-background')?.addEventListener('click', async () => {
            const searchModal = document.createElement('div');
            searchModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); backdrop-filter: blur(12px); z-index: 11000; display: flex; align-items: center; justify-content: center; padding: 20px;';
            searchModal.innerHTML = `
                <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 32px; border-radius: 20px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 30px 80px rgba(0,0,0,0.8);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; color: #ECECEC; font-size: 24px; font-weight: 700;">Buscar Imagens na Internet</h3>
                        <button class="close-search-modal" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #A1A1A1; font-size: 20px; cursor: pointer; padding: 12px 16px; border-radius: 12px;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="margin-bottom: 20px; display: flex; gap: 12px;">
                        <input type="text" id="unsplash-search" placeholder="Digite palavras-chave (ex: natureza, tecnologia, abstrato...)" style="flex: 1; padding: 14px 18px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: #ECECEC; font-size: 14px;" onkeypress="if(event.key==='Enter') document.getElementById('search-unsplash-btn').click();">
                        <button id="search-unsplash-btn" style="padding: 14px 28px; background: linear-gradient(135deg, #FFC700, #FFA500); border: none; color: #000; border-radius: 12px; font-weight: 700; cursor: pointer;">
                            <i class="fas fa-search"></i> Buscar
                        </button>
                    </div>
                    <div id="unsplash-results" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; min-height: 200px;">
                        <div style="grid-column: 1/-1; text-align: center; color: #A1A1A1; padding: 40px;">
                            <i class="fas fa-image" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                            <div>Digite palavras-chave para buscar imagens</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(searchModal);
            
            // Fechar modal
            searchModal.querySelector('.close-search-modal').addEventListener('click', () => searchModal.remove());
            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) searchModal.remove();
            });
            
            // Buscar imagens
            async function searchUnsplash(query) {
                const resultsDiv = searchModal.querySelector('#unsplash-results');
                resultsDiv.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #FFC700;"></i></div>';
                
                try {
                    // Usar Unsplash Source API (público, sem key)
                    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=YOUR_UNSPLASH_ACCESS_KEY`);
                    
                    // Como não temos key, vamos usar um método alternativo com Unsplash Source
                    // Usando Unsplash Source diretamente com tags populares
                    const categories = {
                        'natureza': ['nature', 'landscape', 'forest'],
                        'tecnologia': ['technology', 'code', 'computer'],
                        'abstrato': ['abstract', 'art', 'pattern'],
                        'negócios': ['business', 'office', 'work'],
                        'pessoas': ['people', 'portrait', 'lifestyle'],
                        'dourado': ['gold', 'luxury', 'elegant']
                    };
                    
                    // Se não tiver key, usar imagens placeholder ou permitir URL direto
                    resultsDiv.innerHTML = `
                        <div style="grid-column: 1/-1; margin-bottom: 16px; padding: 16px; background: rgba(255,199,0,0.1); border-radius: 12px; border: 1px solid rgba(255,199,0,0.3);">
                            <strong style="color: #FFC700;">Y' Dica:</strong> <span style="color: #ECECEC;">Você pode inserir a URL direta de uma imagem ou usar nossos templates:</span>
                        </div>
                        ${['natureza', 'tecnologia', 'abstrato', 'negócios', 'pessoas', 'dourado'].map(cat => `
                            <div class="image-template-card" data-category="${cat}" style="aspect-ratio: 1; border-radius: 12px; overflow: hidden; cursor: pointer; border: 2px solid rgba(255,255,255,0.1); transition: all 0.3s; position: relative;" onmouseover="this.style.borderColor='#FFC700'; this.style.transform='scale(1.05)';" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.transform='scale(1)';">
                                <div style="width: 100%; height: 100%; background: linear-gradient(135deg, ${cat === 'dourado' ? '#D4AF37, #FFD700' : cat === 'natureza' ? '#10B981, #059669' : cat === 'tecnologia' ? '#6366F1, #8B5CF6' : '#EC4899, #F43F5E'}); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px;">
                                    ${cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </div>
                                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 12px; color: white; font-size: 12px; font-weight: 600;">
                                    Clique para usar
                                </div>
                            </div>
                        `).join('')}
                        <div style="grid-column: 1/-1; margin-top: 24px; padding: 20px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 2px dashed rgba(255,255,255,0.1);">
                            <label style="display: block; margin-bottom: 12px; color: #ECECEC; font-weight: 600;">Ou insira uma URL de imagem:</label>
                            <div style="display: flex; gap: 12px;">
                                <input type="url" id="custom-image-url" placeholder="https://exemplo.com/imagem.jpg" style="flex: 1; padding: 12px 16px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: #ECECEC;">
                                <button id="use-custom-url" style="padding: 12px 24px; background: linear-gradient(135deg, #FFC700, #FFA500); border: none; color: #000; border-radius: 8px; font-weight: 700; cursor: pointer;">
                                    Usar
                                </button>
                            </div>
                        </div>
                    `;
                    
                    // Selecionar categoria/template
                    searchModal.querySelectorAll('.image-template-card').forEach(card => {
                        card.addEventListener('click', () => {
                            const category = card.dataset.category;
                            // URLs de exemplo baseadas na categoria
                            const templateUrls = {
                                'natureza': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200',
                                'tecnologia': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
                                'abstrato': 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200',
                                'negócios': 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
                                'pessoas': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200',
                                'dourado': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200'
                            };
                            const imageUrl = templateUrls[category] || templateUrls['dourado'];
                            modal.querySelector('#customizer-background-preview-img').src = imageUrl;
                            modal.querySelector('#customizer-background-preview').style.display = 'block';
                            modal.querySelector('#customizer-background-preview').dataset.imageUrl = imageUrl;
                            searchModal.remove();
                            
                            // Atualizar preview
                            updatePreviewBackground(imageUrl);
                        });
                    });
                    
                    // Usar URL customizada
                    searchModal.querySelector('#use-custom-url')?.addEventListener('click', () => {
                        const url = searchModal.querySelector('#custom-image-url').value.trim();
                        if (url) {
                            modal.querySelector('#customizer-background-preview-img').src = url;
                            modal.querySelector('#customizer-background-preview').style.display = 'block';
                            modal.querySelector('#customizer-background-preview').dataset.imageUrl = url;
                            searchModal.remove();
                            updatePreviewBackground(url);
                        }
                    });
                } catch (error) {
                    console.error('Erro ao buscar imagens:', error);
                    resultsDiv.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #F43F5E; padding: 20px;">Erro ao buscar imagens. Tente usar uma URL direta.</div>`;
                }
            }
            
            searchModal.querySelector('#search-unsplash-btn').addEventListener('click', () => {
                const query = searchModal.querySelector('#unsplash-search').value.trim();
                if (query) {
                    searchUnsplash(query);
                }
            });
        });
        
        modal.querySelector('#customizer-background-image').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                    method: 'POST',
                    headers: getHeaders()
                });
                if (!authResponse.ok) throw new Error('Falha ao obter autorização.');
                const { uploadURL } = await authResponse.json();
                
                const formData = new FormData();
                formData.append('file', file);
                const uploadResponse = await fetch(uploadURL, {
                    method: 'POST',
                    body: formData,
                    headers: getAuthHeadersOnly()
                });
                if (!uploadResponse.ok) throw new Error('Falha no upload.');
                const uploadData = await uploadResponse.json();
                const imageUrl = uploadData.result?.variants?.[0] || uploadData.url || uploadData.result?.id;
                
                modal.querySelector('#customizer-background-preview-img').src = imageUrl;
                modal.querySelector('#customizer-background-preview').style.display = 'block';
                modal.querySelector('#customizer-background-preview').dataset.imageUrl = imageUrl;
                
                // Atualizar preview
                updatePreviewBackground(imageUrl);
            } catch (error) {
                alert('Erro ao fazer upload: ' + error.message);
            }
        });
        
        // Função auxiliar para atualizar preview do background
        function updatePreviewBackground(imageUrl) {
            const previewContainer = modal.querySelector('#theme-preview-container');
            if (previewContainer) {
                if (imageUrl && imageUrl.trim()) {
                    previewContainer.style.backgroundImage = `url(${imageUrl})`;
                    previewContainer.style.backgroundSize = 'cover';
                    previewContainer.style.backgroundPosition = 'center';
                    previewContainer.style.backgroundRepeat = 'no-repeat';
                } else {
                    // Se não houver imagem, mostrar cor de fundo
                    const bgColor = modal.querySelector('#customizer-background-color')?.value;
                    const cardColor = modal.querySelector('#customizer-card-color')?.value;
                    previewContainer.style.backgroundImage = 'none';
                    previewContainer.style.background = cardColor || bgColor || '#FFFFFF';
                }
            }
            
            // IMPORTANTE: Atualizar preview principal também
            const primaryColorEl = document.getElementById('primary-color');
            const secondaryColorEl = document.getElementById('secondary-color');
            const textColorEl = document.getElementById('text-color');
            const themeEl = document.getElementById('form-theme');
            const cardColorEl = document.getElementById('card-color');
            const decorativeBarColorEl = document.getElementById('decorative-bar-color');
            const backgroundColorEl = document.getElementById('background-color');
            const backgroundImageUrlEl = document.getElementById('background-image-url');
            
            if (typeof applyCustomColors === 'function') {
                applyCustomColors({
                    primary_color: modal.querySelector('#customizer-primary-color')?.value || primaryColorEl?.value || '#4A90E2',
                    secondary_color: modal.querySelector('#customizer-secondary-color')?.value || secondaryColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                    text_color: modal.querySelector('#customizer-text-color')?.value || textColorEl?.value || '#202124',
                    theme: themeEl?.value || 'light',
                    card_color: modal.querySelector('#customizer-card-color')?.value || cardColorEl?.value || '#FFFFFF',
                    decorative_bar_color: modal.querySelector('#customizer-decorative-bar-color')?.value || decorativeBarColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                    background_color: modal.querySelector('#customizer-background-color')?.value || backgroundColorEl?.value || (themeEl?.value === 'dark' ? '#0D0D0F' : '#f8f9fa'),
                    background_image_url: imageUrl || backgroundImageUrlEl?.value || null,
                    background_opacity: modal.querySelector('#customizer-background-opacity')?.value || '1'
                });
            }
        }
        
        // Botão remover imagem de fundo
        const removeBackgroundBtn = modal.querySelector('#customizer-remove-background');
        if (removeBackgroundBtn) {
            removeBackgroundBtn.addEventListener('click', () => {
                const previewDiv = modal.querySelector('#customizer-background-preview');
                const previewImg = modal.querySelector('#customizer-background-preview-img');
                
                // Esconder preview
                if (previewDiv) {
                    previewDiv.style.display = 'none';
                    previewDiv.dataset.imageUrl = '';
                }
                if (previewImg) {
                    previewImg.src = '';
                }
                
                // Limpar campo hidden
                if (backgroundImageUrlEl) {
                    backgroundImageUrlEl.value = '';
                }
                
                // Limpar input file
                const backgroundFileInput = modal.querySelector('#customizer-background-image');
                if (backgroundFileInput) {
                    backgroundFileInput.value = '';
                }
                
                // Quando remover imagem, mostrar a cor do card no preview
                const cardColor = modal.querySelector('#customizer-card-color').value;
                const previewContainer = modal.querySelector('#theme-preview-container');
                if (previewContainer) {
                    previewContainer.style.backgroundImage = 'none';
                    previewContainer.style.background = cardColor || '#FFFFFF';
                }
                
                console.log('o. Imagem de fundo removida');
            });
        }
        
        modal.querySelector('#customizer-background-opacity').addEventListener('input', (e) => {
            modal.querySelector('#customizer-opacity-value').textContent = Math.round(e.target.value * 100) + '%';
            
            // IMPORTANTE: Atualizar preview principal em tempo real
            const primaryColorEl = document.getElementById('primary-color');
            const secondaryColorEl = document.getElementById('secondary-color');
            const textColorEl = document.getElementById('text-color');
            const themeEl = document.getElementById('form-theme');
            const cardColorEl = document.getElementById('card-color');
            const decorativeBarColorEl = document.getElementById('decorative-bar-color');
            const backgroundColorEl = document.getElementById('background-color');
            const backgroundImageUrlEl = document.getElementById('background-image-url');
            
            if (typeof applyCustomColors === 'function') {
                applyCustomColors({
                    primary_color: modal.querySelector('#customizer-primary-color')?.value || primaryColorEl?.value || '#4A90E2',
                    secondary_color: modal.querySelector('#customizer-secondary-color')?.value || secondaryColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                    text_color: modal.querySelector('#customizer-text-color')?.value || textColorEl?.value || '#202124',
                    theme: themeEl?.value || 'light',
                    card_color: modal.querySelector('#customizer-card-color')?.value || cardColorEl?.value || '#FFFFFF',
                    decorative_bar_color: modal.querySelector('#customizer-decorative-bar-color')?.value || decorativeBarColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                    background_color: modal.querySelector('#customizer-background-color')?.value || backgroundColorEl?.value || (themeEl?.value === 'dark' ? '#0D0D0F' : '#f8f9fa'),
                    background_image_url: backgroundImageUrlEl?.value || null,
                    background_opacity: e.target.value
                });
            }
        });
        
        // Adicionar listener para background-color se existir
        const backgroundColorInput = modal.querySelector('#customizer-background-color');
        if (backgroundColorInput) {
            backgroundColorInput.addEventListener('input', (e) => {
                const previewContainer = modal.querySelector('#theme-preview-container');
                if (previewContainer && !previewContainer.style.backgroundImage) {
                    previewContainer.style.background = e.target.value;
                }
                
                // IMPORTANTE: Atualizar preview principal em tempo real
                const primaryColorEl = document.getElementById('primary-color');
                const secondaryColorEl = document.getElementById('secondary-color');
                const textColorEl = document.getElementById('text-color');
                const themeEl = document.getElementById('form-theme');
                const cardColorEl = document.getElementById('card-color');
                const decorativeBarColorEl = document.getElementById('decorative-bar-color');
                const backgroundImageUrlEl = document.getElementById('background-image-url');
                const backgroundOpacityEl = document.getElementById('background-opacity');
                
                if (typeof applyCustomColors === 'function') {
                    applyCustomColors({
                        primary_color: modal.querySelector('#customizer-primary-color')?.value || primaryColorEl?.value || '#4A90E2',
                        secondary_color: modal.querySelector('#customizer-secondary-color')?.value || secondaryColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                        text_color: modal.querySelector('#customizer-text-color')?.value || textColorEl?.value || '#202124',
                        theme: themeEl?.value || 'light',
                        card_color: modal.querySelector('#customizer-card-color')?.value || cardColorEl?.value || '#FFFFFF',
                        decorative_bar_color: modal.querySelector('#customizer-decorative-bar-color')?.value || decorativeBarColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                        background_color: e.target.value,
                        background_image_url: backgroundImageUrlEl?.value || null,
                        background_opacity: modal.querySelector('#customizer-background-opacity')?.value || backgroundOpacityEl?.value || '1'
                    });
                }
            });
        }
        
        // Atualizar preview quando cor do card mudar
        const cardColorInput = modal.querySelector('#customizer-card-color');
        if (cardColorInput) {
            cardColorInput.addEventListener('input', (e) => {
                const previewContainer = modal.querySelector('#theme-preview-container');
                if (previewContainer) {
                    previewContainer.style.backgroundImage = 'none';
                    previewContainer.style.background = e.target.value;
                }
                
                // IMPORTANTE: Atualizar preview principal em tempo real
                const primaryColorEl = document.getElementById('primary-color');
                const secondaryColorEl = document.getElementById('secondary-color');
                const textColorEl = document.getElementById('text-color');
                const themeEl = document.getElementById('form-theme');
                const decorativeBarColorEl = document.getElementById('decorative-bar-color');
                const backgroundColorEl = document.getElementById('background-color');
                
                if (typeof applyCustomColors === 'function') {
                    applyCustomColors({
                        primary_color: modal.querySelector('#customizer-primary-color')?.value || primaryColorEl?.value || '#4A90E2',
                        secondary_color: modal.querySelector('#customizer-secondary-color')?.value || secondaryColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                        text_color: modal.querySelector('#customizer-text-color')?.value || textColorEl?.value || '#202124',
                        theme: themeEl?.value || 'light',
                        card_color: e.target.value,
                        decorative_bar_color: decorativeBarColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                        background_color: backgroundColorEl?.value || (themeEl?.value === 'dark' ? '#0D0D0F' : '#f8f9fa')
                    });
                }
            });
        }
        
        // Atualizar preview quando cor das barrinhas decorativas mudar
        const decorativeBarColorInput = modal.querySelector('#customizer-decorative-bar-color');
        if (decorativeBarColorInput) {
            decorativeBarColorInput.addEventListener('input', (e) => {
                // IMPORTANTE: Atualizar campo hidden imediatamente quando cor é alterada
                const decorativeBarColorEl = document.getElementById('decorative-bar-color');
                if (decorativeBarColorEl) {
                    decorativeBarColorEl.value = e.target.value;
                }
                
                const previewContainer = modal.querySelector('#theme-preview-container');
                if (previewContainer) {
                    // Atualizar todas as barrinhas decorativas no preview do modal (apenas as de 3px ao lado dos labels)
                    // Procurar por spans dentro dos labels que têm width: 3px e height: 18px
                    const allLabels = previewContainer.querySelectorAll('.preview-label, label');
                    allLabels.forEach(label => {
                        const bars = label.querySelectorAll('span');
                        bars.forEach(bar => {
                            const style = bar.getAttribute('style') || '';
                            // Verificar se é uma barra decorativa (tem width: 3px e height: 18px)
                            if (style.includes('width: 3px') && style.includes('height: 18px')) {
                                const cleanedStyle = style.replace(/background:[^;]+;?/gi, '').trim();
                                const newStyle = (cleanedStyle ? cleanedStyle + '; ' : '') + `background: ${e.target.value} !important;`;
                                bar.setAttribute('style', newStyle);
                            }
                        });
                    });
                }
                
                // IMPORTANTE: Atualizar também o preview principal (fora do modal)
                // Usar applyCustomColors para atualizar tudo de uma vez
                const primaryColorEl = document.getElementById('primary-color');
                const secondaryColorEl = document.getElementById('secondary-color');
                const textColorEl = document.getElementById('text-color');
                const themeEl = document.getElementById('form-theme');
                const cardColorEl = document.getElementById('card-color');
                const backgroundColorEl = document.getElementById('background-color');
                
                if (typeof applyCustomColors === 'function') {
                    // IMPORTANTE: Incluir separator_line_color quando aplicar cores
                    const barColorEl = document.getElementById('bar-color');
                    applyCustomColors({
                        primary_color: modal.querySelector('#customizer-primary-color')?.value || primaryColorEl?.value || '#4A90E2',
                        secondary_color: modal.querySelector('#customizer-secondary-color')?.value || secondaryColorEl?.value || modal.querySelector('#customizer-primary-color')?.value || '#4A90E2',
                        text_color: modal.querySelector('#customizer-text-color')?.value || textColorEl?.value || '#202124',
                        theme: themeEl?.value || 'light',
                        card_color: cardColorEl?.value || '#FFFFFF',
                        decorative_bar_color: e.target.value,
                        separator_line_color: barColorEl?.value || modal.querySelector('#customizer-bar-color')?.value || primaryColorEl?.value || '#4A90E2',
                        background_color: backgroundColorEl?.value || (themeEl?.value === 'dark' ? '#0D0D0F' : '#f8f9fa')
                    });
                } else {
                    // Fallback: atualizar manualmente se applyCustomColors não estiver disponível
                    isUpdatingStyles = true;
                    const mainPreviewContainer = document.querySelector('.form-preview-container');
                    if (mainPreviewContainer) {
                        const allMainBars = mainPreviewContainer.querySelectorAll('.preview-decorative-bar, span[style*="width: 3px"][style*="height: 18px"]');
                        allMainBars.forEach(bar => {
                            const currentStyle = bar.getAttribute('style') || '';
                            const newStyle = currentStyle.replace(/background:[^;]+;?/gi, '').trim() + ` background: linear-gradient(180deg, ${e.target.value}, ${e.target.value}80);`;
                            bar.setAttribute('style', newStyle);
                        });
                        
                        // Atualizar variável CSS também
                        mainPreviewContainer.style.setProperty('--preview-decorative-bar-color', e.target.value);
                        document.documentElement.style.setProperty('--preview-decorative-bar-color', e.target.value);
                    }
                    setTimeout(() => { isUpdatingStyles = false; }, 100);
                }
            });
        }
        
        // Atualizar preview quando cor da barra mudar
        const barColorInput = modal.querySelector('#customizer-bar-color');
        if (barColorInput) {
            barColorInput.addEventListener('input', (e) => {
                const barColor = e.target.value;
                
                // IMPORTANTE: Atualizar campo hidden imediatamente quando cor é alterada
                const barColorEl = document.getElementById('bar-color');
                if (barColorEl) {
                    barColorEl.value = barColor;
                }
                
                // Atualizar preview do modal
                const previewContainer = modal.querySelector('#theme-preview-container');
                if (previewContainer) {
                    // Atualizar barra principal (6px) no preview do modal
                    const mainBar = previewContainer.querySelector('#preview-main-bar');
                    if (mainBar) {
                        mainBar.style.background = barColor;
                    }
                }
                
                // IMPORTANTE: Atualizar também o preview principal (fora do modal)
                const mainPreviewContainer = document.querySelector('.form-preview-container');
                if (mainPreviewContainer) {
                    // Procurar pela barra principal (6px) no preview principal
                    const mainBars = mainPreviewContainer.querySelectorAll('div[style*="width: 6px"][style*="height: 32px"]');
                    mainBars.forEach(bar => {
                        bar.style.background = barColor;
                    });
                    
                    // IMPORTANTE: Atualizar as barras laterais das opções (radio/checkbox)
                    const allOptionLabels = mainPreviewContainer.querySelectorAll('.preview-option-label, .radio-label, .checkbox-label');
                    console.log(`[BAR_COLOR] Atualizando ${allOptionLabels.length} opções com cor: ${barColor}`);
                    allOptionLabels.forEach((label, index) => {
                        label.style.setProperty('border-left-color', barColor, 'important');
                        label.style.borderLeftColor = barColor;
                    });
                    
                    // Atualizar variável CSS
                    mainPreviewContainer.style.setProperty('--preview-option-bar-color', barColor);
                    document.documentElement.style.setProperty('--preview-option-bar-color', barColor);
                    
                    console.log('o. [BAR_COLOR] Barras laterais das opções atualizadas:', barColor);
                }
            });
        }
        
        modal.querySelector('.close-modal-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.querySelector('.save-colors-btn').addEventListener('click', () => {
            const selectedThemeKey = Array.from(modal.querySelectorAll('.theme-card')).find(card => card.style.borderColor === 'rgb(255, 199, 0)')?.dataset.themeKey || 'custom';
            const theme = premiumThemes[selectedThemeKey] || premiumThemes.custom;
            
            // Obter tema do tema selecionado (sem opção claro/escuro - removido)
            const selectedTheme = theme.theme || 'light';
            
            // Obter cor primária e secundária
            const primaryColor = modal.querySelector('#customizer-primary-color').value;
            const secondaryColorInput = modal.querySelector('#customizer-secondary-color');
            // Cor secundária agora sempre é salva (não depende mais de ser cor escura)
            const secondaryColor = secondaryColorInput ? secondaryColorInput.value : null;
            
            // Obter cor das barrinhas decorativas
            const decorativeBarColorInput = modal.querySelector('#customizer-decorative-bar-color');
            const decorativeBarColor = decorativeBarColorInput ? decorativeBarColorInput.value : primaryColor;
            
            if (themeEl) themeEl.value = selectedTheme;
            if (primaryColorEl) primaryColorEl.value = primaryColor;
            if (textColorEl) textColorEl.value = modal.querySelector('#customizer-text-color').value;
            if (backgroundOpacityEl) backgroundOpacityEl.value = modal.querySelector('#customizer-background-opacity').value;
            
            // Salvar cor secundária sempre (agora tem campo hidden)
            const secondaryColorEl = document.getElementById('secondary-color');
            if (secondaryColorEl && secondaryColor) {
                secondaryColorEl.value = secondaryColor;
                console.log('o. Cor secundária salva:', secondaryColor);
            }
            
            // Salvar cor das barrinhas decorativas
            let decorativeBarColorEl = document.getElementById('decorative-bar-color');
            if (!decorativeBarColorEl) {
                decorativeBarColorEl = document.createElement('input');
                decorativeBarColorEl.type = 'hidden';
                decorativeBarColorEl.id = 'decorative-bar-color';
                document.body.appendChild(decorativeBarColorEl);
            }
            // IMPORTANTE: Usar o valor do input do modal (já obtido acima na linha 10539)
            // Verificar novamente o valor do input antes de salvar (pode ter mudado)
            const currentDecorativeBarColorInput = modal.querySelector('#customizer-decorative-bar-color');
            const finalDecorativeBarColor = currentDecorativeBarColorInput ? currentDecorativeBarColorInput.value.trim() : (decorativeBarColorInput ? decorativeBarColorInput.value.trim() : decorativeBarColor);
            decorativeBarColorEl.value = finalDecorativeBarColor || primaryColor;
            console.log('o. [SAVE_COLORS] Cor das barrinhas decorativas salva no campo hidden:', {
                value: decorativeBarColorEl.value,
                inputValue: currentDecorativeBarColorInput?.value,
                decorativeBarColor: decorativeBarColor,
                primaryColor: primaryColor,
                finalValue: finalDecorativeBarColor || primaryColor
            });
            
            // IMPORTANTE: Garantir que a cor seja aplicada imediatamente no preview
            // Marcar que estamos atualizando estilos para evitar loops no MutationObserver
            isUpdatingStyles = true;
            const mainPreviewContainer = document.querySelector('.form-preview-container');
            if (mainPreviewContainer) {
                const allMainBars = mainPreviewContainer.querySelectorAll('.preview-decorative-bar, span[style*="width: 3px"][style*="height: 18px"]');
                allMainBars.forEach(bar => {
                    const currentStyle = bar.getAttribute('style') || '';
                    const newStyle = currentStyle.replace(/background:[^;]+;?/gi, '').trim() + ` background: linear-gradient(180deg, ${finalDecorativeBarColor}, ${secondaryColor || finalDecorativeBarColor}80);`;
                    bar.setAttribute('style', newStyle);
                });
                
                // Atualizar variável CSS
                mainPreviewContainer.style.setProperty('--preview-decorative-bar-color', finalDecorativeBarColor);
                document.documentElement.style.setProperty('--preview-decorative-bar-color', finalDecorativeBarColor);
                // Removido console.log excessivo
            }
            setTimeout(() => { isUpdatingStyles = false; }, 100);
            
            const bgImageUrl = modal.querySelector('#customizer-background-preview')?.dataset.imageUrl || '';
            // Se não houver imagem no preview mas houver no campo hidden, manter o campo hidden
            // Se não houver imagem no preview E não houver no campo hidden, limpar
            if (backgroundImageUrlEl) {
                if (bgImageUrl) {
                    backgroundImageUrlEl.value = bgImageUrl;
                } else {
                    // Se o preview foi removido, limpar também o campo hidden
                    backgroundImageUrlEl.value = '';
                }
            }
            
            // Salvar cor de fundo
            const bgColor = modal.querySelector('#customizer-background-color').value;
            if (backgroundColorEl) {
                backgroundColorEl.value = bgColor;
            }
            
            // Salvar cor do card
            const cardColor = modal.querySelector('#customizer-card-color').value || '#FFFFFF';
            if (cardColorEl) {
                cardColorEl.value = cardColor;
                console.log('o. Cor do card salva:', cardColor);
            }
            
            // Salvar cor da barra principal
            let barColorEl = document.getElementById('bar-color');
            if (!barColorEl) {
                barColorEl = document.createElement('input');
                barColorEl.type = 'hidden';
                barColorEl.id = 'bar-color';
                document.body.appendChild(barColorEl);
            }
            const barColorInput = modal.querySelector('#customizer-bar-color');
            const barColor = barColorInput ? barColorInput.value.trim() : primaryColor;
            barColorEl.value = barColor;
            console.log('o. [SAVE_COLORS] Cor da barra salva no campo hidden:', barColor);
            
            // Obter cor das barrinhas decorativas antes de aplicar (já foi salva acima - usar finalDecorativeBarColor da linha 10563)
            
            console.log('YZ [SAVE_COLORS] Aplicando cores no preview:', {
                decorativeBarColor: finalDecorativeBarColor,
                primaryColor: primaryColor,
                secondaryColor: secondaryColor,
                cardColor: cardColor
            });
            
            applyCustomColors({
                theme: selectedTheme,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                text_color: modal.querySelector('#customizer-text-color').value,
                background_image_url: bgImageUrl || (backgroundImageUrlEl?.value || ''),
                background_color: bgColor,
                background_opacity: parseFloat(modal.querySelector('#customizer-background-opacity').value),
                card_color: cardColor,
                decorative_bar_color: finalDecorativeBarColor
            });
            
            modal.remove();
        });
    }
    
    // Aplicar cores personalizadas ao preview (estrutura idêntica ao formulário público)
    // Função para atualizar o botão do preview baseado nas configurações
    function updatePreviewButton() {
        const previewSubmitBtn = document.querySelector('.preview-submit-btn');
        if (!previewSubmitBtn) {
            console.warn('s️ [PREVIEW] Botão do preview não encontrado');
            return;
        }
        
        // Obter valores de enable_whatsapp e enable_guest_list_submit
        const enableWhatsappInput = document.getElementById('enable-whatsapp-value');
        const enableGuestListSubmitInput = document.getElementById('enable-guest-list-submit-value');
        
                // PERMITIR ambas as opções juntas - não forçar mutuamente exclusivo
                const enableGuestListSubmit = enableGuestListSubmitInput ? enableGuestListSubmitInput.value === 'true' : (window.enableGuestListSubmitValue === true);
                
                // Permitir WhatsApp e "Salvar na Lista" juntos
                const enableWhatsapp = enableWhatsappInput ? enableWhatsappInput.value === 'true' : (window.enableWhatsappValue !== false);
        
        console.log('Y"" [PREVIEW] Atualizando botão:', {
            enableWhatsapp,
            enableGuestListSubmit,
            enableWhatsappInputValue: enableWhatsappInput?.value,
            enableGuestListSubmitInputValue: enableGuestListSubmitInput?.value,
            rule: 'Permitir ambas as opções juntas - WhatsApp e Sistema'
        });
        
        // Determinar tipo de botão e texto
        let buttonText = 'Enviar';
        let buttonIcon = 'fas fa-paper-plane';
        let buttonStyle = 'linear-gradient(135deg, #FFC700, #FFA500)';
        let buttonColor = '#000';
        let buttonShadow = '0 4px 20px rgba(255, 199, 0, 0.4)';
        let submitType = 'generic';
        
        if (enableGuestListSubmit && enableWhatsapp) {
            buttonText = 'Confirmar Check-in';
            buttonIcon = 'fas fa-qrcode';
            submitType = 'whatsapp-and-system';
        } else if (enableGuestListSubmit) {
            buttonText = 'Confirmar Check-in';
            buttonIcon = 'fas fa-qrcode';
            submitType = 'system-only';
        } else if (enableWhatsapp) {
            buttonText = 'Enviar via WhatsApp';
            buttonIcon = 'fab fa-whatsapp';
            buttonStyle = 'linear-gradient(135deg, #25D366, #20BA5A)';
            buttonColor = '#fff';
            buttonShadow = '0 4px 16px rgba(37, 211, 102, 0.3)';
            submitType = 'whatsapp';
        } else {
            buttonText = 'Enviar cadastro';
            buttonIcon = 'fas fa-user-plus';
            submitType = 'lead';
        }
        
        // Atualizar botão
        previewSubmitBtn.innerHTML = `
            <i class="${buttonIcon}" style="font-size: 20px;"></i>
            <span>${buttonText}</span>
            <i class="fas fa-arrow-right" style="font-size: 14px; margin-left: auto;"></i>
        `;
        previewSubmitBtn.style.background = buttonStyle;
        previewSubmitBtn.style.color = buttonColor;
        previewSubmitBtn.style.boxShadow = buttonShadow;
        previewSubmitBtn.dataset.submitType = submitType;
        
        console.log('o. [PREVIEW] Botão atualizado:', buttonText);
    }
    
    function applyCustomColors(formData) {
        const previewWrapper = document.querySelector('.preview-form-wrapper');
        const previewContainer = document.querySelector('.form-preview-container');
        const previewForm = document.querySelector('.preview-digital-form');
        const previewHeader = document.querySelector('.preview-form-header');
        const previewTitle = document.getElementById('preview-title');
        const previewDescription = document.getElementById('preview-description');
        const previewDescriptionContainer = document.getElementById('preview-description-container');
        
        if (!previewContainer) return;
        
        // Aplicar cor primária, secundária e texto como variáveis CSS
        const primaryColor = formData.primary_color || '#4A90E2';
        const secondaryColor = formData.secondary_color || primaryColor; // Usar secundária ou primária como fallback
        const textColor = formData.text_color || '#202124';
        const backgroundColor = formData.background_color || (formData.theme === 'dark' ? '#0D0D0F' : '#f8f9fa');
        const cardColor = formData.card_color || '#FFFFFF';
        // IMPORTANTE: Cor das barrinhas decorativas (padrão: cor primária)
        const decorativeBarColor = formData.decorative_bar_color || primaryColor;
        
        document.documentElement.style.setProperty('--preview-primary-color', primaryColor);
        document.documentElement.style.setProperty('--preview-secondary-color', secondaryColor);
        document.documentElement.style.setProperty('--preview-text-color', textColor);
        document.documentElement.style.setProperty('--preview-card-color', cardColor);
        document.documentElement.style.setProperty('--preview-decorative-bar-color', decorativeBarColor);
        
        // Atualizar todos os elementos que usam essas variáveis
        if (previewWrapper) {
            previewWrapper.style.setProperty('--preview-primary-color', primaryColor);
            previewWrapper.style.setProperty('--preview-secondary-color', secondaryColor);
            previewWrapper.style.setProperty('--preview-text-color', textColor);
            previewWrapper.style.setProperty('--preview-card-color', cardColor);
        }
        
        // Aplicar tema
        if (formData.theme === 'dark') {
            previewContainer.style.background = backgroundColor || '#0D0D0F';
            if (previewForm) {
                previewForm.style.background = 'linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%)';
                previewForm.style.borderColor = 'rgba(255,255,255,0.12)';
            }
            if (previewDescriptionContainer) {
                previewDescriptionContainer.style.background = 'linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%)';
                previewDescriptionContainer.style.borderColor = 'rgba(255,255,255,0.12)';
            }
            if (previewTitle) previewTitle.style.color = '#ECECEC';
            if (previewDescription) previewDescription.style.color = '#ECECEC';
        } else {
            previewContainer.style.background = backgroundColor || '#f8f9fa';
            // Aplicar cor do card no formulário (não apenas no container de fundo)
            if (previewForm) {
                previewForm.style.background = cardColor || 'white';
                previewForm.style.borderColor = 'rgba(0,0,0,0.06)';
            }
            if (previewDescriptionContainer) {
                previewDescriptionContainer.style.background = cardColor || 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
                previewDescriptionContainer.style.borderColor = 'rgba(0,0,0,0.06)';
            }
            if (previewTitle) previewTitle.style.color = 'white';
            if (previewDescription) previewDescription.style.color = textColor;
        }
        
        // Atualizar header com gradiente usando cor primária e secundária
        if (previewHeader) {
            if (secondaryColor && secondaryColor !== primaryColor) {
                previewHeader.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
            } else {
                previewHeader.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`;
            }
        }
        
        // Aplicar cores em todos os botões e elementos que usam cor primária
        const allButtons = previewContainer.querySelectorAll('button, .btn, .action-btn, .submit-btn');
        allButtons.forEach(btn => {
            if (secondaryColor && secondaryColor !== primaryColor) {
                btn.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
            } else {
                btn.style.background = primaryColor;
            }
        });
        
        // Aplicar imagem de fundo (tem prioridade) ou cor de fundo
        if (formData.background_image_url) {
            const opacity = formData.background_opacity || 1;
            previewContainer.style.backgroundImage = `url(${formData.background_image_url})`;
            previewContainer.style.backgroundSize = 'cover';
            previewContainer.style.backgroundPosition = 'center';
            previewContainer.style.backgroundAttachment = 'fixed';
            previewContainer.style.position = 'relative';
            
            // Overlay para opacidade
            let overlay = previewContainer.querySelector('.background-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'background-overlay';
                overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: -1;';
                previewContainer.appendChild(overlay);
            }
            // Usar cor de fundo personalizada no overlay se disponível, ou branco padrão
            const bgColor = formData.background_color || '#FFFFFF';
            overlay.style.background = bgColor;
            overlay.style.opacity = 1 - opacity;
        } else {
            previewContainer.style.backgroundImage = 'none';
            const overlay = previewContainer.querySelector('.background-overlay');
            if (overlay) overlay.remove();
            
            // Aplicar cor de fundo se não houver imagem
            const bgColor = formData.background_color || (formData.theme === 'dark' ? '#0D0D0F' : '#f8f9fa');
            previewContainer.style.background = bgColor;
            
            // IMPORTANTE: Aplicar cor do card no formulário (previewForm) quando não há imagem de fundo
            if (previewForm && cardColor) {
                previewForm.style.background = cardColor;
                console.log('o. [PREVIEW] Cor do card aplicada no formulário:', cardColor);
            }
        }
        
        // Aplicar cor do card via variável CSS também (para garantir)
        if (cardColor) {
            const previewWrapper = document.querySelector('.preview-form-wrapper');
            if (previewWrapper) {
                previewWrapper.style.setProperty('--preview-card-color', cardColor);
            }
            // Aplicar diretamente no form também
            const allFormElements = previewContainer.querySelectorAll('.preview-digital-form, .preview-form-description-container, #preview-description-container');
            allFormElements.forEach(el => {
                if (el) {
                    el.style.background = cardColor;
                }
            });
        }
        
        // IMPORTANTE: Atualizar todas as barrinhas decorativas no preview (decorativeBarColor já foi declarada acima na linha 10652)
        // Marcar que estamos atualizando estilos para evitar loops no MutationObserver
        isUpdatingStyles = true;
        
        // Tentar múltiplos seletores para garantir que encontramos todas as barras
        const allDecorativeBars = previewContainer.querySelectorAll('.preview-decorative-bar, span.preview-decorative-bar, span[class*="decorative"], span[style*="width: 3px"], span[style*="width: 6px"]');
        // Removido console.log excessivo - apenas logar se houver muitas barras ou em modo debug
        if (allDecorativeBars.length > 0 && window.DEBUG_MODE) {
            console.log(`[PREVIEW] Encontradas ${allDecorativeBars.length} barras decorativas para atualizar com cor: ${decorativeBarColor}`);
        }
        allDecorativeBars.forEach((bar, index) => {
            // Aplicar cor diretamente via style.setProperty para garantir que seja aplicada
            bar.style.setProperty('background', decorativeBarColor, 'important');
            bar.style.backgroundColor = decorativeBarColor;
            // Removido console.log excessivo por barra
        });
        
        // Atualizar também via variável CSS para elementos que usam var()
        if (previewWrapper) {
            previewWrapper.style.setProperty('--preview-decorative-bar-color', decorativeBarColor);
        }
        previewContainer.style.setProperty('--preview-decorative-bar-color', decorativeBarColor);
        document.documentElement.style.setProperty('--preview-decorative-bar-color', decorativeBarColor);
        
        // Removido console.log excessivo
        
        // IMPORTANTE: Atualizar cor das barras laterais das opções (radio/checkbox)
        const optionBarColor = formData.separator_line_color || primaryColor;
        const allOptionLabels = previewContainer.querySelectorAll('.preview-option-label, .radio-label, .checkbox-label');
        // Removido console.log excessivo
        allOptionLabels.forEach((label, index) => {
            label.style.setProperty('border-left-color', optionBarColor, 'important');
            label.style.borderLeftColor = optionBarColor;
            // Removido console.log excessivo por label
        });
        
        // Atualizar também via variável CSS
        if (previewWrapper) {
            previewWrapper.style.setProperty('--preview-option-bar-color', optionBarColor);
        }
        previewContainer.style.setProperty('--preview-option-bar-color', optionBarColor);
        document.documentElement.style.setProperty('--preview-option-bar-color', optionBarColor);
        
        // Removido console.log excessivo
        
        // IMPORTANTE: Atualizar campos hidden que são usados no salvamento
        // Garantir que quando as cores são alteradas visualmente, elas também sejam salvas nos campos hidden
        const decorativeBarColorEl = document.getElementById('decorative-bar-color');
        if (decorativeBarColorEl) {
            decorativeBarColorEl.value = decorativeBarColor || primaryColor;
            console.log('o. [APPLY_COLORS] decorative-bar-color atualizado:', decorativeBarColorEl.value);
        }
        
        const barColorEl = document.getElementById('bar-color');
        if (barColorEl) {
            // IMPORTANTE: separator_line_color deve vir de formData, se não existir usar optionBarColor (que é separator_line_color || primaryColor)
            const separatorLineColorValue = formData.separator_line_color || optionBarColor || primaryColor;
            barColorEl.value = separatorLineColorValue;
            console.log('o. [APPLY_COLORS] bar-color (separator_line_color) atualizado:', barColorEl.value, '(de formData.separator_line_color:', formData.separator_line_color, ')');
        }
        
        const cardColorEl = document.getElementById('card-color');
        if (cardColorEl && cardColor) {
            cardColorEl.value = cardColor;
        }
        
        const backgroundColorEl = document.getElementById('background-color-url');
        if (backgroundColorEl && backgroundColor) {
            backgroundColorEl.value = backgroundColor;
        }
        
        // Restaurar flag após atualização
        setTimeout(() => {
            isUpdatingStyles = false;
        }, 100);
    }
    
    // Função para mostrar mensagem de sucesso premium
    function showSuccessMessage(message) {
        // Remover mensagem anterior se existir
        const existingMsg = document.querySelector('.success-message');
        if (existingMsg) existingMsg.remove();
        
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.innerHTML = `
            <i class="fas fa-check-circle" style="font-size: 20px;"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(successMsg);
        
        // Remover após 3 segundos
        setTimeout(() => {
            successMsg.style.animation = 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse';
            setTimeout(() => successMsg.remove(), 400);
        }, 3000);
    }
    
    // Função para mostrar mensagem de aviso premium
    function showWarningMessage(message) {
        const existingMsg = document.querySelector('.warning-message');
        if (existingMsg) existingMsg.remove();
        
        const warningMsg = document.createElement('div');
        warningMsg.className = 'success-message';
        warningMsg.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
        warningMsg.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.3)';
        warningMsg.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 20px;"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(warningMsg);
        
        setTimeout(() => {
            warningMsg.style.animation = 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse';
            setTimeout(() => warningMsg.remove(), 400);
        }, 4000);
    }
    
    // Função para mostrar mensagem de erro premium
    function showErrorMessage(message) {
        const existingMsg = document.querySelector('.error-message');
        if (existingMsg) existingMsg.remove();
        
        const errorMsg = document.createElement('div');
        errorMsg.className = 'success-message';
        errorMsg.style.background = 'linear-gradient(135deg, #F43F5E, #DC2626)';
        errorMsg.style.boxShadow = '0 8px 24px rgba(244, 63, 94, 0.3)';
        errorMsg.innerHTML = `
            <i class="fas fa-exclamation-circle" style="font-size: 20px;"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(errorMsg);
        
        setTimeout(() => {
            errorMsg.style.animation = 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse';
            setTimeout(() => errorMsg.remove(), 400);
        }, 5000);
    }
    
    // Função para mostrar loading overlay
    function showLoading() {
        const existing = document.querySelector('.loading-overlay');
        if (existing) existing.remove();
        
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(loading);
        return loading;
    }
    
    // Função para esconder loading
    function hideLoading() {
        const loading = document.querySelector('.loading-overlay');
        if (loading) {
            loading.style.animation = 'fadeIn 0.3s ease-out reverse';
            setTimeout(() => loading.remove(), 300);
        }
    }
    
    // Funções já definidas acima - removidas duplicatas
    
    // Configurar listeners da sidebar após DOM estar pronto
    setupSidebarListeners();
    
    // Configurar uploads de imagens
    setupImageUploads();
    
    // Garantir que o container de preview esteja visível
    const previewContainerCheck = document.querySelector('.form-preview-container');
    const previewWrapperCheck = document.querySelector('.preview-form-wrapper');
    if (previewContainerCheck) {
        previewContainerCheck.style.display = 'block';
        previewContainerCheck.style.visibility = 'visible';
        previewContainerCheck.style.opacity = '1';
        console.log('o. Container de preview garantido como visível na inicialização');
    }
    if (previewWrapperCheck) {
        previewWrapperCheck.style.display = 'block';
        previewWrapperCheck.style.visibility = 'visible';
        previewWrapperCheck.style.opacity = '1';
        console.log('o. Wrapper de preview garantido como visível na inicialização');
    }
    
    // Configurar botões de modo de preview (Desktop/Mobile)
    function setupPreviewModeButtons() {
        const desktopBtn = document.getElementById('preview-mode-desktop');
        const mobileBtn = document.getElementById('preview-mode-mobile');
        const previewContainer = document.querySelector('.form-preview-container');
        
        if (desktopBtn && mobileBtn && previewContainer) {
            // Modo Desktop
            desktopBtn.addEventListener('click', () => {
                desktopBtn.classList.add('active');
                mobileBtn.classList.remove('active');
                desktopBtn.style.background = 'linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1))';
                desktopBtn.style.borderColor = '#FFC700';
                desktopBtn.style.color = '#FFC700';
                mobileBtn.style.background = 'rgba(255,255,255,0.05)';
                mobileBtn.style.borderColor = 'rgba(255,255,255,0.1)';
                mobileBtn.style.color = '#A1A1A1';
                
                previewContainer.classList.remove('preview-mobile');
                previewContainer.classList.add('preview-desktop');
            });
            
            // Modo Mobile
            mobileBtn.addEventListener('click', () => {
                mobileBtn.classList.add('active');
                desktopBtn.classList.remove('active');
                mobileBtn.style.background = 'linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1))';
                mobileBtn.style.borderColor = '#FFC700';
                mobileBtn.style.color = '#FFC700';
                desktopBtn.style.background = 'rgba(255,255,255,0.05)';
                desktopBtn.style.borderColor = 'rgba(255,255,255,0.1)';
                desktopBtn.style.color = '#A1A1A1';
                
                previewContainer.classList.remove('preview-desktop');
                previewContainer.classList.add('preview-mobile');
            });
            
            // Inicializar com modo desktop
            if (!previewContainer.classList.contains('preview-mobile')) {
                previewContainer.classList.add('preview-desktop');
            }
        }
    }
    
    // Configurar após DOM estar pronto
    setTimeout(() => {
        setupPreviewModeButtons();
    }, 500);
    
    // Configurar botão para remover descrição
    const removeDescriptionBtn = document.getElementById('remove-description-btn');
    if (removeDescriptionBtn) {
        removeDescriptionBtn.addEventListener('click', async () => {
            const previewDescription = document.getElementById('preview-description');
            const formDescEl = document.getElementById('form-description');
            
            // Limpar descrição
            if (previewDescription) {
                previewDescription.textContent = '';
                previewDescription.style.display = 'none';
            }
            if (formDescEl) {
                formDescEl.value = '';
            }
            removeDescriptionBtn.style.display = 'none';
            
            // Salvar imediatamente para aplicar a remoção
            try {
                const moduleTitleEl = document.getElementById('form-module-title');
                const formTitleEl = document.getElementById('form-title');
                const whatsappEl = document.getElementById('whatsapp-number');
                const logoEl = document.getElementById('logo-url');
                const bannerEl = document.getElementById('banner-image-url');
                const headerEl = document.getElementById('header-image-url');
                const backgroundEl = document.getElementById('background-image-url');
                const opacityEl = document.getElementById('background-opacity');
                const themeEl = document.getElementById('form-theme');
                const primaryColorEl = document.getElementById('primary-color');
                const textColorEl = document.getElementById('text-color');
                const displayFormatEl = document.querySelector('input[name="display-format"]:checked');
                
                const formFieldsJsonEl = document.getElementById('form-fields-json');
                let parsedFields = [];
                if (formFieldsJsonEl && formFieldsJsonEl.value) {
                    try {
                        const parsed = JSON.parse(formFieldsJsonEl.value);
                        parsedFields = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        parsedFields = Array.isArray(formFields) ? formFields : [];
                    }
                } else {
                    parsedFields = Array.isArray(formFields) ? formFields : [];
                }
                
                const previewTitleEl = document.getElementById('preview-title');
                
                const updateData = {
                    title: moduleTitleEl?.value.trim() || null,
                    form_title: formTitleEl?.value.trim() || (previewTitleEl?.textContent.trim()) || null,
                    form_logo_url: logoEl?.value.trim() || null,
                    form_description: '', // FOR?AR VAZIO para remover
                    whatsapp_number: whatsappEl?.value.trim() || null,
                    display_format: displayFormatEl?.value || 'button',
                    banner_image_url: bannerEl?.value.trim() || null,
                    header_image_url: headerEl?.value.trim() || null,
                    background_image_url: backgroundEl?.value.trim() || null,
                    background_color: document.getElementById('background-color-url')?.value.trim() || null,
                    background_opacity: opacityEl ? parseFloat(opacityEl.value) : 1.0,
                    theme: themeEl?.value || 'light',
                    primary_color: primaryColorEl?.value || '#4A90E2',
                    text_color: textColorEl?.value || '#333333',
                    form_fields: parsedFields
                };
                
                const response = await fetch(`${API_URL}/api/profile/items/digital_form/${currentItemId}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(updateData)
                });
                
                if (!response.ok) {
                    throw new Error('Erro ao salvar remoção da descrição');
                }
                
                console.log('o. Descrição removida e salva com sucesso');
            } catch (error) {
                console.error('Erro ao salvar remoção da descrição:', error);
                alert('Erro ao salvar remoção da descrição: ' + error.message);
            }
        });
        
        // Mostrar/esconder botão baseado no conteúdo
        const previewDescription = document.getElementById('preview-description');
        if (previewDescription) {
            const checkDescription = () => {
                const hasContent = previewDescription.textContent.trim() && 
                                  previewDescription.textContent.trim() !== 'Descrição do formulário';
                if (hasContent) {
                    removeDescriptionBtn.style.display = 'block';
                    previewDescription.style.display = 'block';
                } else {
                    removeDescriptionBtn.style.display = 'none';
                    // Se estiver vazio, esconder o campo também
                    if (!previewDescription.textContent.trim() || previewDescription.textContent.trim() === 'Descrição do formulário') {
                        previewDescription.style.display = 'none';
                    }
                }
            };
            
            // Observar mudanças no conteúdo
            previewDescription.addEventListener('input', checkDescription);
            previewDescription.addEventListener('blur', checkDescription);
            checkDescription();
        }
    }
    
    
    // Configurar uploads de imagens na área de configurações
    async function setupImageUploads() {
        // Upload Logo
        const logoFileInput = document.getElementById('logo-file-input');
        const logoUploadArea = document.getElementById('logo-upload-area');
        if (logoFileInput && logoUploadArea) {
            logoUploadArea.addEventListener('click', (e) => {
                // Não acionar se clicar no botão de remover
                if (e.target.closest('#remove-logo-btn')) return;
                logoFileInput.click();
            });
            logoFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                await handleImageUpload(file, 'logo');
            });
        }
        
        // Upload Banner
        const bannerFileInput = document.getElementById('banner-file-input');
        const bannerUploadArea = document.getElementById('banner-upload-area');
        if (bannerFileInput && bannerUploadArea) {
            bannerUploadArea.addEventListener('click', (e) => {
                // Não acionar se clicar no botão de remover
                if (e.target.closest('#remove-banner-btn')) return;
                bannerFileInput.click();
            });
            bannerFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                await handleImageUpload(file, 'banner');
            });
        }
        
        // Upload Header
        const headerFileInput = document.getElementById('header-file-input');
        const headerUploadArea = document.getElementById('header-upload-area');
        if (headerFileInput && headerUploadArea) {
            headerUploadArea.addEventListener('click', (e) => {
                // Não acionar se clicar no botão de remover
                if (e.target.closest('#remove-header-btn')) return;
                headerFileInput.click();
            });
            headerFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                await handleImageUpload(file, 'header');
            });
        }
        
        // Upload Background
        const backgroundFileInput = document.getElementById('background-file-input');
        const backgroundUploadArea = document.getElementById('background-upload-area');
        if (backgroundFileInput && backgroundUploadArea) {
            backgroundUploadArea.addEventListener('click', (e) => {
                // Não acionar se clicar no botão de remover
                if (e.target.closest('#remove-background-btn')) return;
                backgroundFileInput.click();
            });
            backgroundFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                await handleImageUpload(file, 'background');
            });
        }
    }
    
    // Função para fazer upload de imagem
    async function handleImageUpload(file, imageType) {
        if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
            alert('Apenas imagens PNG ou JPG são permitidas.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }
        
        try {
            // Obter URL de upload
            const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: getHeaders()
            });
            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
            const { uploadURL } = await authResponse.json();
            
            // Fazer upload
            const formData = new FormData();
            formData.append('file', file);
            const uploadResponse = await fetch(uploadURL, {
                method: 'POST',
                body: formData,
                headers: getAuthHeadersOnly()
            });
            if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');
            const uploadData = await uploadResponse.json();
            const imageUrl = uploadData.result?.variants?.[0] || uploadData.url || uploadData.result?.id;
            
            // Atualizar campo hidden correspondente
            let hiddenField;
            switch(imageType) {
                case 'logo':
                    hiddenField = document.getElementById('logo-url');
                    break;
                case 'banner':
                    hiddenField = document.getElementById('banner-image-url');
                    break;
                case 'header':
                    hiddenField = document.getElementById('header-image-url');
                    break;
                case 'background':
                    hiddenField = document.getElementById('background-image-url');
                    break;
            }
            
            if (hiddenField) {
                hiddenField.value = imageUrl;
                console.log(`URL de ${imageType} atualizada:`, imageUrl);
            }
            
            // Atualizar preview
            updateSingleImagePreview(imageType, imageUrl);
            
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            alert('Erro ao fazer upload da imagem: ' + error.message);
        }
    }
    
    // Configurar botões de remover imagens
    const removeBackgroundBtn = document.getElementById('remove-background-btn');
    if (removeBackgroundBtn) {
        removeBackgroundBtn.addEventListener('click', async () => {
            const backgroundEl = document.getElementById('background-image-url');
            const backgroundPreview = document.getElementById('background-preview');
            const backgroundUploadText = document.getElementById('background-upload-text');
            const backgroundFileInput = document.getElementById('background-file-input');
            
            // Limpar todos os campos relacionados
            if (backgroundEl) {
                backgroundEl.value = '';
                console.log('o. Campo background-image-url limpo');
            }
            if (backgroundPreview) {
                backgroundPreview.src = '';
                backgroundPreview.style.display = 'none';
            }
            if (backgroundUploadText) {
                backgroundUploadText.style.display = 'block';
            }
            if (backgroundFileInput) {
                backgroundFileInput.value = ''; // Limpar input file para permitir selecionar o mesmo arquivo novamente
            }
            removeBackgroundBtn.style.display = 'none';
            
            // Salvar imediatamente para aplicar a remoção
            try {
                const moduleTitleEl = document.getElementById('form-module-title');
                const formTitleEl = document.getElementById('form-title');
                const formDescEl = document.getElementById('form-description');
                const whatsappEl = document.getElementById('whatsapp-number');
                const logoEl = document.getElementById('logo-url');
                const bannerEl = document.getElementById('banner-image-url');
                const headerEl = document.getElementById('header-image-url');
                const opacityEl = document.getElementById('background-opacity');
                const themeEl = document.getElementById('form-theme');
                const primaryColorEl = document.getElementById('primary-color');
                const textColorEl = document.getElementById('text-color');
                const displayFormatEl = document.querySelector('input[name="display-format"]:checked');
                
                const formFieldsJsonEl = document.getElementById('form-fields-json');
                let parsedFields = [];
                if (formFieldsJsonEl && formFieldsJsonEl.value) {
                    try {
                        const parsed = JSON.parse(formFieldsJsonEl.value);
                        parsedFields = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        parsedFields = Array.isArray(formFields) ? formFields : [];
                    }
                } else {
                    parsedFields = Array.isArray(formFields) ? formFields : [];
                }
                
                const previewTitleEl = document.getElementById('preview-title');
                const previewDescEl = document.getElementById('preview-description');
                
                const updateData = {
                    title: moduleTitleEl?.value.trim() || null,
                    form_title: formTitleEl?.value.trim() || (previewTitleEl?.textContent.trim()) || null,
                    form_logo_url: logoEl?.value.trim() || null,
                    form_description: formDescEl?.value.trim() || (previewDescEl?.textContent.trim()) || null,
                    whatsapp_number: whatsappEl?.value.trim() || null,
                    display_format: displayFormatEl?.value || 'button',
                    banner_image_url: bannerEl?.value.trim() || null,
                    header_image_url: headerEl?.value.trim() || null,
                    background_image_url: '', // FOR?AR VAZIO para remover
                    background_opacity: opacityEl ? parseFloat(opacityEl.value) : 1.0,
                    theme: themeEl?.value || 'light',
                    primary_color: primaryColorEl?.value || '#4A90E2',
                    text_color: textColorEl?.value || '#333333',
                    form_fields: parsedFields
                };
                
                const response = await fetch(`${API_URL}/api/profile/items/digital_form/${currentItemId}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(updateData)
                });
                
                if (!response.ok) {
                    throw new Error('Erro ao salvar remoção da imagem');
                }
                
                // Atualizar preview removendo imagem de fundo
                const previewContainer = document.querySelector('.form-preview-container');
                if (previewContainer) {
                    previewContainer.style.backgroundImage = 'none';
                    const overlay = previewContainer.querySelector('.background-overlay');
                    if (overlay) overlay.remove();
                }
                
                console.log('o. Imagem de fundo removida e salva com sucesso');
                alert('Imagem de fundo removida com sucesso!');
            } catch (error) {
                console.error('Erro ao salvar remoção:', error);
                alert('Erro ao salvar remoção da imagem: ' + error.message);
            }
        });
    }
    
    const removeLogoBtn = document.getElementById('remove-logo-btn');
    if (removeLogoBtn) {
        removeLogoBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Impedir que acione o click do upload-area
            e.preventDefault();
            
            const logoEl = document.getElementById('logo-url');
            const logoPreview = document.getElementById('logo-preview');
            const logoUploadText = document.getElementById('logo-upload-text');
            const logoFileInput = document.getElementById('logo-file-input');
            
            if (logoEl) logoEl.value = '';
            if (logoPreview) {
                logoPreview.src = '';
                logoPreview.style.display = 'none';
            }
            if (logoUploadText) logoUploadText.style.display = 'block';
            if (logoFileInput) logoFileInput.value = ''; // Limpar input file
            removeLogoBtn.style.display = 'none';
            
            console.log('o. Logo removido');
        });
    }
    
    const removeBannerBtn = document.getElementById('remove-banner-btn');
    if (removeBannerBtn) {
        removeBannerBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Impedir que acione o click do upload-area
            e.preventDefault();
            
            const bannerEl = document.getElementById('banner-image-url');
            const bannerPreview = document.getElementById('banner-preview');
            const bannerUploadText = document.getElementById('banner-upload-text');
            const bannerFileInput = document.getElementById('banner-file-input');
            
            if (bannerEl) bannerEl.value = '';
            if (bannerPreview) {
                bannerPreview.src = '';
                bannerPreview.style.display = 'none';
            }
            if (bannerUploadText) bannerUploadText.style.display = 'block';
            if (bannerFileInput) bannerFileInput.value = ''; // Limpar input file
            removeBannerBtn.style.display = 'none';
            
            console.log('o. Banner removido');
        });
    }
    
    const removeHeaderBtn = document.getElementById('remove-header-btn');
    if (removeHeaderBtn) {
        removeHeaderBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Impedir que acione o click do upload-area
            e.preventDefault();
            
            const headerEl = document.getElementById('header-image-url');
            const headerPreview = document.getElementById('header-preview');
            const headerUploadText = document.getElementById('header-upload-text');
            const headerFileInput = document.getElementById('header-file-input');
            const headerImageContainer = document.getElementById('preview-header-image-container');
            
            if (headerEl) headerEl.value = '';
            if (headerPreview) {
                headerPreview.src = '';
                headerPreview.style.display = 'none';
            }
            if (headerUploadText) headerUploadText.style.display = 'block';
            if (headerFileInput) headerFileInput.value = ''; // Limpar input file
            if (headerImageContainer) headerImageContainer.style.display = 'none';
            removeHeaderBtn.style.display = 'none';
            
            console.log('o. Header removido');
        });
    }
    
    // Botão de remover descrição
    const removeDescBtn = document.getElementById('remove-description-btn');
    if (removeDescBtn) {
        removeDescBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const formDescEl = document.getElementById('form-description');
            const previewDescEl = document.getElementById('preview-description');
            const previewDescContainer = document.getElementById('preview-description-container');
            
            if (formDescEl) formDescEl.value = '';
            if (previewDescEl) {
                previewDescEl.textContent = 'Descrição do formulário';
            }
            if (previewDescContainer) {
                previewDescContainer.style.display = 'none';
            }
            removeDescBtn.style.display = 'none';
            
            // Salvar imediatamente
            saveForm();
            
            console.log('o. Descrição removida');
        });
    }
    
    // Configurar sistema de tabs
    const tabButtons = document.querySelectorAll('.form-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Remover active de todos
            tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.form-tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Adicionar active no selecionado
            btn.classList.add('active');
            const targetContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }
        });
    });
    
    // Configurar botões de modo de pré-visualização
    const previewModeDesktop = document.getElementById('preview-mode-desktop');
    const previewModeMobile = document.getElementById('preview-mode-mobile');
    const previewContainer = document.querySelector('.form-edit-preview');
    
    if (previewModeDesktop && previewModeMobile && previewContainer) {
        previewModeDesktop.addEventListener('click', () => {
            previewModeDesktop.classList.add('active');
            previewModeMobile.classList.remove('active');
            previewContainer.classList.remove('preview-mobile');
            previewContainer.classList.add('preview-desktop');
        });
        
        previewModeMobile.addEventListener('click', () => {
            previewModeMobile.classList.add('active');
            previewModeDesktop.classList.remove('active');
            previewContainer.classList.remove('preview-desktop');
            previewContainer.classList.add('preview-mobile');
        });
    }
    
    // Carregar dados do formulário
    // Variável global para termo de busca
    let searchTerm = '';
    
    // Função para destacar termo de busca
    function highlightSearchTerm(text, term) {
        if (!term || !text) return text;
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark style="background: #FFC700; color: #000; padding: 2px 4px; border-radius: 3px; font-weight: 600;">$1</mark>');
    }
    
    // Sistema de Preview em Tempo Real
    function setupRealtimePreview() {
        // Observar mudanças no título
        const previewTitle = document.getElementById('preview-title');
        if (previewTitle) {
            const titleObserver = new MutationObserver(() => {
                syncPreviewStyles();
            });
            titleObserver.observe(previewTitle, { childList: true, characterData: true, subtree: true });
            previewTitle.addEventListener('input', () => syncPreviewStyles());
        }
        
        // Observar mudanças na descrição
        const previewDescription = document.getElementById('preview-description');
        if (previewDescription) {
            const descObserver = new MutationObserver(() => {
                syncPreviewStyles();
            });
            descObserver.observe(previewDescription, { childList: true, characterData: true, subtree: true });
            previewDescription.addEventListener('input', () => syncPreviewStyles());
        }
        
        // Observar mudanças nos campos (através do formFieldsJson)
        const formFieldsJsonEl = document.getElementById('form-fields-json');
        if (formFieldsJsonEl) {
            const jsonObserver = new MutationObserver(() => {
                try {
                    const newFields = JSON.parse(formFieldsJsonEl.value || '[]');
                    if (JSON.stringify(newFields) !== JSON.stringify(formFields)) {
                        formFields = newFields;
                        renderPreviewQuestions(searchTerm ? true : false);
                    }
                } catch (e) {
                    // Ignorar erros de parsing
                }
            });
            jsonObserver.observe(formFieldsJsonEl, { attributes: true, attributeFilter: ['value'] });
        }
    }
    
    // Sincronizar estilos do preview (cores, imagens, etc)
    function syncPreviewStyles() {
        const primaryColorEl = document.getElementById('primary-color');
        const textColorEl = document.getElementById('text-color');
        const themeEl = document.getElementById('form-theme');
        const backgroundEl = document.getElementById('background-image-url');
        const opacityEl = document.getElementById('background-opacity');
        
        if (primaryColorEl || textColorEl || themeEl) {
            const secondaryColorEl = document.getElementById('secondary-color');
            const secondaryColorValue = secondaryColorEl?.value || null;
            applyCustomColors({
                theme: themeEl?.value || 'light',
                primary_color: primaryColorEl?.value || '#4A90E2',
                secondary_color: secondaryColorValue,
                text_color: textColorEl?.value || '#333333',
                background_image_url: backgroundEl?.value || '',
                background_opacity: opacityEl ? parseFloat(opacityEl.value) : 1.0
            });
        }
    }
    
    // Configurar busca de perguntas
    function setupQuestionSearch() {
        const searchInput = document.getElementById('search-questions-input');
        const clearBtn = document.getElementById('clear-search-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value.trim();
                
                // Mostrar/esconder botão limpar
                if (clearBtn) {
                    clearBtn.style.display = searchTerm ? 'block' : 'none';
                }
                
                // Aplicar filtro imediatamente
                renderPreviewQuestions(true);
            });
            
            // Limpar busca
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    searchTerm = '';
                    clearBtn.style.display = 'none';
                    renderPreviewQuestions();
                });
            }
        }
    }
    
    loadFormData();
    
    // Configurar listeners para display-format (radios principais)
    const mainDisplayFormatRadios = document.querySelectorAll('input[name="display-format"]');
    mainDisplayFormatRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedMode = e.target.value;
            const bannerContainer = document.getElementById('banner-image-container');
            
            // Atualizar container de banner
            if (bannerContainer) {
                bannerContainer.style.display = selectedMode === 'banner' ? 'block' : 'none';
            }
            
            // Se o modal de configurações estiver aberto, atualizar também
            const settingsModal = document.querySelector('.settings-modal');
            if (settingsModal) {
                const modalFormatRadios = settingsModal.querySelectorAll('input[name="modal-display-format"]');
                modalFormatRadios.forEach(r => {
                    r.checked = (r.value === selectedMode);
                });
                
                // Atualizar visibilidade das seções no modal
                const buttonLogoContainer = settingsModal.querySelector('#modal-button-logo-container');
                const bannerImageContainer = settingsModal.querySelector('#modal-banner-image-container');
                
                if (selectedMode === 'banner') {
                    if (buttonLogoContainer) buttonLogoContainer.style.display = 'none';
                    if (bannerImageContainer) bannerImageContainer.style.display = 'block';
                } else {
                    if (buttonLogoContainer) buttonLogoContainer.style.display = 'block';
                    if (bannerImageContainer) bannerImageContainer.style.display = 'none';
                }
            }
        });
    });
    
    // Configurar botões de modo preview (Desktop/Mobile)
    function setupPreviewModeButtons() {
        const desktopBtn = document.getElementById('preview-mode-desktop');
        const mobileBtn = document.getElementById('preview-mode-mobile');
        const previewWrapper = document.querySelector('.preview-form-wrapper');
        
        if (desktopBtn && mobileBtn && previewWrapper) {
            desktopBtn.addEventListener('click', () => {
                desktopBtn.classList.add('active');
                desktopBtn.style.background = 'linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1))';
                desktopBtn.style.borderColor = '#FFC700';
                desktopBtn.style.color = '#FFC700';
                
                mobileBtn.classList.remove('active');
                mobileBtn.style.background = 'rgba(255,255,255,0.05)';
                mobileBtn.style.borderColor = 'rgba(255,255,255,0.1)';
                mobileBtn.style.color = '#A1A1A1';
                
                previewWrapper.style.maxWidth = '1000px';
                previewWrapper.style.margin = '0 auto';
            });
            
            mobileBtn.addEventListener('click', () => {
                mobileBtn.classList.add('active');
                mobileBtn.style.background = 'linear-gradient(135deg, rgba(255,199,0,0.2), rgba(255,199,0,0.1))';
                mobileBtn.style.borderColor = '#FFC700';
                mobileBtn.style.color = '#FFC700';
                
                desktopBtn.classList.remove('active');
                desktopBtn.style.background = 'rgba(255,255,255,0.05)';
                desktopBtn.style.borderColor = 'rgba(255,255,255,0.1)';
                desktopBtn.style.color = '#A1A1A1';
                
                previewWrapper.style.maxWidth = '375px';
                previewWrapper.style.margin = '0 auto';
            });
        }
    }
    
    // Configurar atalhos de teclado
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S ou Cmd+S - Salvar formulário
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const saveBtn = document.getElementById('save-form-btn');
                if (saveBtn && !saveBtn.disabled) {
                    saveBtn.click();
                }
            }
            
            // Ctrl+F ou Cmd+F - Focar na busca de perguntas
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
                e.preventDefault();
                const searchInput = document.getElementById('search-questions-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        });
    }
    
    // Adicionar contador de caracteres em campos de texto
    function setupCharacterCounters() {
        // Esta função será chamada quando necessário para atualizar contadores
        // Os contadores já estão implementados no renderQuestionPreview
        // Apenas uma função vazia para evitar erro de "não definido"
    }
    
    // Configurar preview em tempo real e busca após carregar dados
    setTimeout(() => {
        setupRealtimePreview();
        setupQuestionSearch();
        setupCharacterCounters();
        setupKeyboardShortcuts();
        setupPreviewModeButtons();
    }, 1500);
});

// Função global para lidar com clique no botão Lista de Convidados (fallback)
function handleGuestListClick(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('handleGuestListClick chamado!');
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const currentItemId = urlParams.get('itemId');
        
        // Verificar se está em modo lista de convidados
        const isGuestListMode = window.currentFormIsGuestList === true || 
                               document.getElementById('is-guest-list-mode')?.value === 'true';
        
        if (isGuestListMode && currentItemId && typeof openGuestListManagementModalForCurrentForm === 'function') {
            console.log('o. Abrindo modal de gerenciamento');
            openGuestListManagementModalForCurrentForm();
            return;
        }
        
        // Sempre redirecionar para a página de listas
        console.log('Y"" Redirecionando para /guestListEdit...', { currentItemId });
        if (currentItemId) {
            window.location.href = `/guestListEdit?formItemId=${currentItemId}`;
        } else {
            window.location.href = '/guestListEdit';
        }
    } catch (error) {
        console.error('O Erro em handleGuestListClick:', error);
        // Fallback simples
        window.location.href = '/guestListEdit';
    }
}

// ============================================
// TEMAS PREMIUM E TEMPLATES
// ============================================

// Temas Premium Premium - Novos e Melhorados
const PREMIUM_THEMES = [
    {
        id: 'dark-gold-luxury',
        name: 'Dark Gold Premium',
        primary: '#FFC700',
        secondary: '#FFD700',
        description: 'Elegância dourada sobre fundo escuro - Luxo e sofisticação',
        gradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #FFC700 100%)'
    },
    {
        id: 'midnight-gold',
        name: 'Midnight Gold',
        primary: '#FFD700',
        secondary: '#FFA500',
        description: 'Dourado intenso em fundo preto profundo',
        gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #FFD700 70%, #FFA500 100%)'
    },
    {
        id: 'ocean-deep',
        name: 'Oceano Profundo',
        primary: '#00D4FF',
        secondary: '#0099CC',
        description: 'Azul oceânico vibrante com profundidade',
        gradient: 'linear-gradient(135deg, #001a33 0%, #003d66 50%, #00D4FF 100%)'
    },
    {
        id: 'royal-purple-luxury',
        name: 'Roxo Real Premium',
        primary: '#9D4EDD',
        secondary: '#C77DFF',
        description: 'Roxo majestoso com toque de elegância',
        gradient: 'linear-gradient(135deg, #240046 0%, #5a189a 50%, #9D4EDD 100%)'
    },
    {
        id: 'emerald-jewel',
        name: 'Esmeralda Joia',
        primary: '#00FF88',
        secondary: '#00CC6A',
        description: 'Verde esmeralda brilhante e premium',
        gradient: 'linear-gradient(135deg, #001a0d 0%, #004d26 50%, #00FF88 100%)'
    },
    {
        id: 'crimson-rose',
        name: 'Rosa Crimson',
        primary: '#FF1744',
        secondary: '#FF6B9D',
        description: 'Rosa intenso e apaixonante',
        gradient: 'linear-gradient(135deg, #1a0005 0%, #66001a 50%, #FF1744 100%)'
    },
    {
        id: 'sunset-premium',
        name: 'Pôr do Sol Premium',
        primary: '#FF6B35',
        secondary: '#FFB347',
        description: 'Gradiente de pôr do sol vibrante',
        gradient: 'linear-gradient(135deg, #1a0a00 0%, #662200 30%, #FF6B35 70%, #FFB347 100%)'
    },
    {
        id: 'ice-blue',
        name: 'Azul Gelo',
        primary: '#00E5FF',
        secondary: '#B2EBF2',
        description: 'Azul gelo refrescante e moderno',
        gradient: 'linear-gradient(135deg, #001a1a 0%, #004d4d 50%, #00E5FF 100%)'
    },
    {
        id: 'lavender-dream',
        name: 'Sonho Lavanda',
        primary: '#B794F6',
        secondary: '#E9D5FF',
        description: 'Lavanda suave e relaxante',
        gradient: 'linear-gradient(135deg, #1a0d33 0%, #4c1d95 50%, #B794F6 100%)'
    },
    {
        id: 'forest-dark',
        name: 'Floresta Escura',
        primary: '#22C55E',
        secondary: '#4ADE80',
        description: 'Verde floresta natural e orgânico',
        gradient: 'linear-gradient(135deg, #0a1a0d 0%, #14532d 50%, #22C55E 100%)'
    },
    {
        id: 'coral-vibrant',
        name: 'Coral Vibrante',
        primary: '#FF6B9D',
        secondary: '#FFB3D1',
        description: 'Coral energético e chamativo',
        gradient: 'linear-gradient(135deg, #1a0008 0%, #660033 50%, #FF6B9D 100%)'
    },
    {
        id: 'steel-blue',
        name: 'Azul Aço',
        primary: '#3B82F6',
        secondary: '#60A5FA',
        description: 'Azul aço profissional e confiável',
        gradient: 'linear-gradient(135deg, #0a1626 0%, #1e3a5f 50%, #3B82F6 100%)'
    },
    {
        id: 'amber-fire',
        name: ',mbar Flamejante',
        primary: '#F59E0B',
        secondary: '#FCD34D',
        description: ',mbar quente e acolhedor',
        gradient: 'linear-gradient(135deg, #1a0f00 0%, #663d00 50%, #F59E0B 100%)'
    },
    {
        id: 'mint-fresh',
        name: 'Menta Fresca',
        primary: '#10B981',
        secondary: '#34D399',
        description: 'Verde menta refrescante e moderno',
        gradient: 'linear-gradient(135deg, #001a0d 0%, #004d26 50%, #10B981 100%)'
    },
    {
        id: 'violet-storm',
        name: 'Tempestade Violeta',
        primary: '#8B5CF6',
        secondary: '#A78BFA',
        description: 'Violeta intenso e misterioso',
        gradient: 'linear-gradient(135deg, #1a0d33 0%, #5b21b6 50%, #8B5CF6 100%)'
    },
    {
        id: 'copper-warm',
        name: 'Cobre Quente',
        primary: '#E67E22',
        secondary: '#F39C12',
        description: 'Cobre quente e aconchegante',
        gradient: 'linear-gradient(135deg, #1a0f00 0%, #663d00 50%, #E67E22 100%)'
    },
    {
        id: 'cyan-electric',
        name: 'Ciano Elétrico',
        primary: '#06B6D4',
        secondary: '#22D3EE',
        description: 'Ciano elétrico e futurista',
        gradient: 'linear-gradient(135deg, #001a1a 0%, #004d4d 50%, #06B6D4 100%)'
    },
    {
        id: 'pink-blush',
        name: 'Rosa Blush',
        primary: '#EC4899',
        secondary: '#F472B6',
        description: 'Rosa blush delicado e feminino',
        gradient: 'linear-gradient(135deg, #1a000d 0%, #660033 50%, #EC4899 100%)'
    },
    {
        id: 'indigo-night',
        name: 'Noite Índigo',
        primary: '#6366F1',
        secondary: '#818CF8',
        description: 'Índigo noturno profundo e elegante',
        gradient: 'linear-gradient(135deg, #0a0a1a 0%, #312e81 50%, #6366F1 100%)'
    }
];

// Templates Premium - TODOS NOVOS E NICOS
const PREMIUM_TEMPLATES = [
    {
        id: 'quotation-request',
        name: 'Solicitação de Cotação',
        title: 'Solicite sua Cotação Personalizada',
        description: 'Preencha o formulário e receba uma cotação exclusiva em até 24 horas',
        textColor: '#000000', // Preto para fundo claro
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fields: [
            { id: 'empresa', type: 'text', label: 'Nome da Empresa', required: true, placeholder: 'Nome da sua empresa' },
            { id: 'cnpj', type: 'text', label: 'CNPJ', required: true, placeholder: '00.000.000/0000-00' },
            { id: 'responsavel', type: 'text', label: 'Nome do Responsável', required: true, placeholder: 'Seu nome completo' },
            { id: 'email_corporativo', type: 'email', label: 'Email Corporativo', required: true, placeholder: 'contato@empresa.com' },
            { id: 'telefone_comercial', type: 'tel', label: 'Telefone Comercial', required: true, placeholder: '(00) 0000-0000' },
            { id: 'produto_interesse', type: 'dropdown', label: 'Produto de Interesse', required: true, options: ['Produto A', 'Produto B', 'Produto C', 'Produto D'] },
            { id: 'quantidade_estimada', type: 'number', label: 'Quantidade Estimada', required: true, placeholder: 'Quantidade aproximada' },
            { id: 'prazo_necessidade', type: 'date', label: 'Prazo de Necessidade', required: false },
            { id: 'informacoes_adicionais', type: 'textarea', label: 'Informações Adicionais', required: false, placeholder: 'Detalhes sobre sua necessidade...' }
        ],
        primary: '#667eea',
        secondary: '#764ba2'
    },
    {
        id: 'lead-generation',
        name: 'Captação de Leads',
        title: 'Receba Conteúdos Exclusivos',
        description: 'Cadastre-se e receba materiais exclusivos diretamente no seu email',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        fields: [
            { id: 'nome_completo', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Digite seu nome completo' },
            { id: 'email_principal', type: 'email', label: 'Seu Melhor Email', required: true, placeholder: 'exemplo@email.com' },
            { id: 'whatsapp_contato', type: 'tel', label: 'WhatsApp', required: true, placeholder: '(00) 00000-0000' },
            { id: 'area_atuacao', type: 'dropdown', label: 'Área de Atuação', required: true, options: ['Tecnologia', 'Marketing', 'Vendas', 'Gestão', 'Outras'] },
            { id: 'cargo_atual', type: 'text', label: 'Cargo Atual', required: false, placeholder: 'Seu cargo ou função' },
            { id: 'empresa_nome', type: 'text', label: 'Nome da Empresa', required: false, placeholder: 'Nome da empresa onde trabalha' }
        ],
        primary: '#f093fb',
        secondary: '#f5576c'
    },
    {
        id: 'service-booking',
        name: 'Agendamento de Serviços',
        title: 'Agende seu Atendimento',
        description: 'Escolha a melhor data e horário para receber nosso atendimento personalizado',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        fields: [
            { id: 'cliente_nome', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Seu nome completo' },
            { id: 'cliente_email', type: 'email', label: 'Email para Confirmação', required: true, placeholder: 'email@exemplo.com' },
            { id: 'cliente_telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'tipo_servico', type: 'single_choice', label: 'Tipo de Serviço', required: true, options: ['Consulta', 'Suporte', 'Treinamento', 'Outro'] },
            { id: 'data_preferencia', type: 'date', label: 'Data Preferencial', required: true },
            { id: 'horario_preferencia', type: 'dropdown', label: 'Horário Preferencial', required: true, options: ['Manhã (08h-12h)', 'Tarde (13h-17h)', 'Noite (18h-20h)'] },
            { id: 'observacoes_agendamento', type: 'textarea', label: 'Observações', required: false, placeholder: 'Alguma informação importante?' }
        ],
        primary: '#4facfe',
        secondary: '#00f2fe'
    },
    {
        id: 'product-launch',
        name: 'Lançamento de Produto',
        title: 'Seja um dos Primeiros',
        description: 'Garanta acesso antecipado ao nosso novo lançamento com condições especiais',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        fields: [
            { id: 'interessado_nome', type: 'text', label: 'Nome', required: true, placeholder: 'Como devemos te chamar?' },
            { id: 'interessado_email', type: 'email', label: 'Email', required: true, placeholder: 'Seu melhor email' },
            { id: 'interessado_whatsapp', type: 'tel', label: 'WhatsApp', required: true, placeholder: '(00) 00000-0000' },
            { id: 'interesse_nivel', type: 'single_choice', label: 'Nível de Interesse', required: true, options: ['Muito Interessado', 'Interessado', 'Apenas Curioso'] },
            { id: 'quando_compraria', type: 'dropdown', label: 'Quando Pretende Adquirir?', required: true, options: ['Imediatamente', 'Esta Semana', 'Este Mês', 'Ainda não sei'] },
            { id: 'motivacao_compra', type: 'textarea', label: 'O que mais te atraiu?', required: false, placeholder: 'Conte-nos o que despertou seu interesse...' }
        ],
        primary: '#43e97b',
        secondary: '#38f9d7'
    },
    {
        id: 'feedback-collection',
        name: 'Coleta de Feedback',
        title: 'Sua Opinião Constrói o Futuro',
        description: 'Compartilhe sua experiência e nos ajude a melhorar continuamente',
        textColor: '#FFFFFF',
        backgroundColor: '#1C1C21',
        headerGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fields: [
            { id: 'avaliador_nome', type: 'text', label: 'Nome (Opcional)', required: false, placeholder: 'Seu nome, se desejar' },
            { id: 'avaliacao_geral', type: 'single_choice', label: 'Avaliação Geral', required: true, options: ['⭐⭐⭐⭐⭐ Excelente', '⭐⭐⭐⭐ Muito Bom', '⭐⭐⭐ Bom', '⭐⭐ Regular', '⭐ Ruim'] },
            { id: 'pontos_positivos', type: 'textarea', label: 'O que você mais gostou?', required: false, placeholder: 'Compartilhe os pontos positivos...' },
            { id: 'pontos_melhorar', type: 'textarea', label: 'O que pode melhorar?', required: false, placeholder: 'Sugestões de melhorias...' },
            { id: 'recomendaria', type: 'single_choice', label: 'Recomendaria para outros?', required: true, options: ['Definitivamente Sim', 'Provavelmente Sim', 'Talvez', 'Provavelmente Não', 'Definitivamente Não'] },
            { id: 'comentarios_adicionais', type: 'textarea', label: 'Comentários Adicionais', required: false, placeholder: 'Mais alguma coisa que gostaria de compartilhar?' }
        ],
        primary: '#667eea',
        secondary: '#764ba2'
    },
    {
        id: 'event-registration',
        name: 'Inscrição em Evento',
        title: 'Reserve sua Participação',
        description: 'Garanta sua vaga em nosso próximo evento. Vagas limitadas!',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        fields: [
            { id: 'participante_nome', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Nome completo do participante' },
            { id: 'participante_email', type: 'email', label: 'Email', required: true, placeholder: 'email@exemplo.com' },
            { id: 'participante_celular', type: 'tel', label: 'Celular', required: true, placeholder: '(00) 00000-0000' },
            { id: 'documento_identidade', type: 'text', label: 'CPF', required: true, placeholder: '000.000.000-00' },
            { id: 'categoria_ingresso', type: 'single_choice', label: 'Categoria de Ingresso', required: true, options: ['VIP', 'Premium', 'Básico'] },
            { id: 'necessidades_especiais', type: 'textarea', label: 'Necessidades Especiais', required: false, placeholder: 'Alguma necessidade especial para o evento?' }
        ],
        primary: '#fa709a',
        secondary: '#fee140'
    },
    {
        id: 'newsletter-signup',
        name: 'Newsletter Premium',
        title: 'Acesse Conteúdos Exclusivos',
        description: 'Junte-se à nossa comunidade e receba materiais exclusivos toda semana',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        fields: [
            { id: 'assinante_nome', type: 'text', label: 'Primeiro Nome', required: true, placeholder: 'Como prefere ser chamado?' },
            { id: 'assinante_email', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' },
            { id: 'area_interesse', type: 'multiple_choice', label: 'Áreas de Interesse', required: true, options: ['Tecnologia', 'Negócios', 'Marketing', 'Design', 'Desenvolvimento'] },
            { id: 'frequencia_preferida', type: 'dropdown', label: 'Frequência Preferida', required: false, options: ['Diária', 'Semanal', 'Quinzenal', 'Mensal'] }
        ],
        primary: '#30cfd0',
        secondary: '#330867'
    },
    {
        id: 'support-request',
        name: 'Solicitação de Suporte',
        title: 'Como Podemos Ajudar?',
        description: 'Descreva seu problema e nossa equipe entrará em contato o mais breve possível',
        textColor: '#FFFFFF',
        backgroundColor: '#1C1C21',
        headerGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        fields: [
            { id: 'usuario_nome', type: 'text', label: 'Nome', required: true, placeholder: 'Seu nome' },
            { id: 'usuario_email', type: 'email', label: 'Email', required: true, placeholder: 'email@exemplo.com' },
            { id: 'usuario_telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'categoria_problema', type: 'dropdown', label: 'Categoria do Problema', required: true, options: ['Técnico', 'Cobrança', 'Conta', 'Outro'] },
            { id: 'prioridade', type: 'single_choice', label: 'Prioridade', required: true, options: ['Baixa', 'Média', 'Alta', 'Urgente'] },
            { id: 'descricao_problema', type: 'textarea', label: 'Descrição Detalhada', required: true, placeholder: 'Descreva o problema em detalhes...' },
            { id: 'anexos_info', type: 'text', label: 'Informações de Anexos', required: false, placeholder: 'Se houver anexos, descreva aqui' }
        ],
        primary: '#a8edea',
        secondary: '#fed6e3'
    },
    {
        id: 'partnership-application',
        name: 'Formulário de Parceria',
        title: 'Seja Nosso Parceiro',
        description: 'Tem interesse em uma parceria? Preencha o formulário e vamos conversar',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        fields: [
            { id: 'parceiro_empresa', type: 'text', label: 'Nome da Empresa', required: true, placeholder: 'Nome da sua empresa' },
            { id: 'parceiro_cnpj', type: 'text', label: 'CNPJ', required: true, placeholder: '00.000.000/0000-00' },
            { id: 'parceiro_representante', type: 'text', label: 'Representante Legal', required: true, placeholder: 'Nome do representante' },
            { id: 'parceiro_email', type: 'email', label: 'Email Corporativo', required: true, placeholder: 'parceria@empresa.com' },
            { id: 'parceiro_telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 0000-0000' },
            { id: 'tipo_parceria', type: 'dropdown', label: 'Tipo de Parceria', required: true, options: ['Distribuição', 'Revenda', 'Afiliado', 'Estratégica', 'Outro'] },
            { id: 'descricao_proposta', type: 'textarea', label: 'Proposta de Parceria', required: true, placeholder: 'Descreva sua proposta de parceria...' }
        ],
        primary: '#ff9a9e',
        secondary: '#fecfef'
    },
    {
        id: 'demo-request',
        name: 'Solicitação de Demonstração',
        title: 'Veja Nossa Solução em Ação',
        description: 'Agende uma demonstração personalizada e descubra como podemos ajudar',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        fields: [
            { id: 'demo_nome', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Seu nome completo' },
            { id: 'demo_email', type: 'email', label: 'Email Profissional', required: true, placeholder: 'seu@empresa.com' },
            { id: 'demo_empresa', type: 'text', label: 'Nome da Empresa', required: true, placeholder: 'Nome da empresa' },
            { id: 'demo_cargo', type: 'text', label: 'Cargo', required: true, placeholder: 'Seu cargo' },
            { id: 'demo_telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'demo_numero_funcionarios', type: 'dropdown', label: 'Número de Funcionários', required: true, options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
            { id: 'demo_interesse', type: 'textarea', label: 'Área de Maior Interesse', required: false, placeholder: 'O que você gostaria de ver na demonstração?' }
        ],
        primary: '#ffecd2',
        secondary: '#fcb69f'
    },
    {
        id: 'cadastro-visitante-igreja',
        name: 'Cadastro de Visitante - Igreja',
        title: 'Cadastro de Visitante - Igreja Vinho Novo',
        description: 'Template oficial Igreja Evangélica Vinho Novo - Cadastro de visitantes com design inspirado nos materiais da igreja',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #FFC700 0%, #FFA500 100%)',
        fields: [
            { id: 'nome_completo', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Seu nome completo' },
            { id: 'email', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' },
            { id: 'whatsapp', type: 'tel', label: 'WhatsApp', required: true, placeholder: '(00) 00000-0000' },
            { id: 'data_nascimento', type: 'date', label: 'Data de Nascimento', required: false },
            { id: 'endereco', type: 'textarea', label: 'Endereço', required: false, placeholder: 'Rua, número, bairro, cidade' },
            { id: 'bairro', type: 'text', label: 'Bairro', required: false, placeholder: 'Nome do bairro' },
            { id: 'conhece_membro', type: 'single_choice', label: 'Conhece algum membro da igreja?', required: true, options: ['Sim', 'Não'] },
            { id: 'quem_conhece', type: 'text', label: 'Caso sim, quem?', required: false, placeholder: 'Nome da pessoa que conhece', dependsOn: { fieldId: 'conhece_membro', value: 'Sim' } }
        ],
        primary: '#FFC700',
        secondary: '#FFA500'
    },
    {
        id: 'contato-profissional',
        name: 'Contato Profissional',
        title: 'Entre em Contato',
        description: 'Formulário profissional para contato e solicitações',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fields: [
            { id: 'nome', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Seu nome completo' },
            { id: 'email', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' },
            { id: 'telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'assunto', type: 'text', label: 'Assunto', required: true, placeholder: 'Assunto da mensagem' },
            { id: 'mensagem', type: 'textarea', label: 'Mensagem', required: true, placeholder: 'Sua mensagem...' }
        ],
        primary: '#667eea',
        secondary: '#764ba2'
    },
    {
        id: 'pesquisa-satisfacao',
        name: 'Pesquisa de Satisfação',
        title: 'Avalie sua Experiência',
        description: 'Sua opinião é muito importante para nós. Compartilhe sua experiência!',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        fields: [
            { id: 'nota_geral', type: 'single_choice', label: 'Como você avalia nossa empresa?', required: true, options: ['⭐⭐⭐⭐⭐ Excelente', '⭐⭐⭐⭐ Muito Bom', '⭐⭐⭐ Bom', '⭐⭐ Regular', '⭐ Ruim'] },
            { id: 'recomendaria', type: 'single_choice', label: 'Recomendaria nossos serviços?', required: true, options: ['Sim', 'Não', 'Talvez'] },
            { id: 'pontos_positivos', type: 'textarea', label: 'O que você mais gostou?', required: false, placeholder: 'Compartilhe os pontos positivos...' },
            { id: 'sugestoes', type: 'textarea', label: 'Sugestões de melhoria', required: false, placeholder: 'Como podemos melhorar?' }
        ],
        primary: '#f093fb',
        secondary: '#f5576c'
    },
    {
        id: 'orcamento-servico',
        name: 'Solicitação de Orçamento',
        title: 'Solicite seu Orçamento',
        description: 'Preencha os dados e receba um orçamento personalizado',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        fields: [
            { id: 'nome_cliente', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Seu nome completo' },
            { id: 'email_cliente', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' },
            { id: 'telefone_cliente', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'tipo_servico', type: 'dropdown', label: 'Tipo de Serviço', required: true, options: ['Serviço A', 'Serviço B', 'Serviço C', 'Outro'] },
            { id: 'descricao_necessidade', type: 'textarea', label: 'Descreva sua necessidade', required: true, placeholder: 'Detalhe o que você precisa...' },
            { id: 'prazo_desejado', type: 'date', label: 'Prazo Desejado', required: false }
        ],
        primary: '#4facfe',
        secondary: '#00f2fe'
    },
    {
        id: 'inscricao-curso',
        name: 'Inscrição em Curso',
        title: 'Garanta sua Vaga no Curso',
        description: 'Inscreva-se agora e tenha acesso a conteúdo exclusivo',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        fields: [
            { id: 'aluno_nome', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Nome completo do aluno' },
            { id: 'aluno_email', type: 'email', label: 'Email', required: true, placeholder: 'email@exemplo.com' },
            { id: 'aluno_telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'curso_interesse', type: 'dropdown', label: 'Curso de Interesse', required: true, options: ['Curso A', 'Curso B', 'Curso C'] },
            { id: 'experiencia_prev', type: 'textarea', label: 'Experiência Prévia', required: false, placeholder: 'Conte sobre sua experiência na área...' }
        ],
        primary: '#43e97b',
        secondary: '#38f9d7'
    },
    {
        id: 'cadastro-membro',
        name: 'Cadastro de Membro',
        title: 'Torne-se um Membro',
        description: 'Cadastre-se e faça parte da nossa comunidade',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fields: [
            { id: 'membro_nome', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Seu nome completo' },
            { id: 'membro_email', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' },
            { id: 'membro_telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'data_nascimento', type: 'date', label: 'Data de Nascimento', required: true },
            { id: 'endereco_completo', type: 'textarea', label: 'Endereço Completo', required: true, placeholder: 'Rua, número, bairro, cidade, CEP' },
            { id: 'como_conheceu', type: 'dropdown', label: 'Como nos conheceu?', required: false, options: ['Redes Sociais', 'Amigo', 'Google', 'Outro'] }
        ],
        primary: '#667eea',
        secondary: '#764ba2'
    },
    {
        id: 'reserva-mesa',
        name: 'Reserva de Mesa',
        title: 'Reserve sua Mesa',
        description: 'Garanta seu lugar no melhor horário',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        fields: [
            { id: 'cliente_nome', type: 'text', label: 'Nome', required: true, placeholder: 'Seu nome' },
            { id: 'cliente_telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'data_reserva', type: 'date', label: 'Data', required: true },
            { id: 'horario_reserva', type: 'dropdown', label: 'Horário', required: true, options: ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00'] },
            { id: 'numero_pessoas', type: 'number', label: 'Número de Pessoas', required: true, placeholder: 'Quantas pessoas?' },
            { id: 'observacoes', type: 'textarea', label: 'Observações', required: false, placeholder: 'Alguma observação especial?' }
        ],
        primary: '#fa709a',
        secondary: '#fee140'
    },
    {
        id: 'reclamacao-sugestao',
        name: 'Reclamação/Sugestão',
        title: 'Fale Conosco',
        description: 'Sua opinião nos ajuda a melhorar continuamente',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        fields: [
            { id: 'nome_contato', type: 'text', label: 'Nome', required: true, placeholder: 'Seu nome' },
            { id: 'email_contato', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' },
            { id: 'tipo_contato', type: 'single_choice', label: 'Tipo de Contato', required: true, options: ['Reclamação', 'Sugestão', 'Elogio', 'Dúvida'] },
            { id: 'mensagem_contato', type: 'textarea', label: 'Mensagem', required: true, placeholder: 'Sua mensagem...' }
        ],
        primary: '#30cfd0',
        secondary: '#330867'
    },
    {
        id: 'candidatura-vaga',
        name: 'Candidatura para Vaga',
        title: 'Candidate-se a uma Vaga',
        description: 'Preencha o formulário e faça parte do nosso time',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        fields: [
            { id: 'candidato_nome', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Seu nome completo' },
            { id: 'candidato_email', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' },
            { id: 'candidato_telefone', type: 'tel', label: 'Telefone', required: true, placeholder: '(00) 00000-0000' },
            { id: 'cargo_interesse', type: 'dropdown', label: 'Cargo de Interesse', required: true, options: ['Vaga A', 'Vaga B', 'Vaga C'] },
            { id: 'experiencia_profissional', type: 'textarea', label: 'Experiência Profissional', required: false, placeholder: 'Conte sobre sua experiência...' }
        ],
        primary: '#a8edea',
        secondary: '#fed6e3'
    },
    {
        id: 'pre-venda',
        name: 'Pré-Venda',
        title: 'Garanta o Seu Agora',
        description: 'Seja um dos primeiros a adquirir com condições especiais',
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        headerGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        fields: [
            { id: 'cliente_nome', type: 'text', label: 'Nome Completo', required: true, placeholder: 'Seu nome completo' },
            { id: 'cliente_email', type: 'email', label: 'Email', required: true, placeholder: 'seu@email.com' },
            { id: 'cliente_whatsapp', type: 'tel', label: 'WhatsApp', required: true, placeholder: '(00) 00000-0000' },
            { id: 'interesse_produto', type: 'dropdown', label: 'Produto de Interesse', required: true, options: ['Produto A', 'Produto B', 'Produto C'] },
            { id: 'quando_comprar', type: 'single_choice', label: 'Quando pretende comprar?', required: true, options: ['Agora', 'Esta Semana', 'Este Mês', 'Apenas Informação'] }
        ],
        primary: '#ff9a9e',
        secondary: '#fecfef'
    }
];

// Função para abrir seletor de módulos/templates
function openModuleSelector() {
    const modal = document.createElement('div');
    modal.className = 'module-selector-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;';
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); padding: 0; border-radius: 24px; max-width: 1200px; width: 100%; max-height: 90vh; overflow: hidden; color: #ECECEC; box-shadow: 0 30px 80px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1);">
            <div style="background: linear-gradient(135deg, #FFC70015 0%, transparent 100%); padding: 32px 40px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; font-size: 28px; font-weight: 800; color: #FFC700; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-layer-group"></i> Templates e Temas Premium
                        </h3>
                        <p style="margin: 8px 0 0 0; color: #A1A1A1; font-size: 15px;">Escolha um template pronto ou personalize com temas premium</p>
                    </div>
                    <button class="close-module-modal" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #A1A1A1; font-size: 24px; cursor: pointer; padding: 12px 16px; border-radius: 12px; transition: all 0.3s;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div style="padding: 32px 40px; overflow-y: auto; max-height: calc(90vh - 140px);">
                <!-- Abas -->
                <div style="display: flex; gap: 12px; margin-bottom: 32px; border-bottom: 2px solid rgba(255,255,255,0.1);">
                    <button class="module-tab active" data-tab="templates" style="padding: 12px 24px; background: transparent; border: none; border-bottom: 3px solid #FFC700; color: #FFC700; font-weight: 700; font-size: 16px; cursor: pointer;">
                        <i class="fas fa-file-alt"></i> Templates
                    </button>
                    <button class="module-tab" data-tab="themes" style="padding: 12px 24px; background: transparent; border: none; border-bottom: 3px solid transparent; color: #A1A1A1; font-weight: 600; font-size: 16px; cursor: pointer;">
                        <i class="fas fa-palette"></i> Temas Premium
                    </button>
                </div>
                
                <!-- Conteúdo Templates -->
                <div id="module-templates-content" class="module-tab-content" style="display: block;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                        ${PREMIUM_TEMPLATES.map(template => `
                            <div class="template-card" data-template-id="${template.id}" style="background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden;" 
                                 onmouseover="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)'; this.style.transform='translateY(-4px)';" 
                                 onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(255,255,255,0.03)'; this.style.transform='translateY(0)';">
                                <div style="height: 120px; background: ${template.headerGradient || template.gradient || `linear-gradient(135deg, ${template.primary} 0%, ${template.secondary} 100%)`}; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #FFFFFF; text-shadow: 0 2px 10px rgba(0,0,0,0.4);">
                                    ${template.name}
                                </div>
                                <h4 style="margin: 0 0 8px 0; color: #ECECEC; font-size: 18px; font-weight: 700;">${template.title}</h4>
                                <p style="margin: 0 0 16px 0; color: #A1A1A1; font-size: 13px; line-height: 1.5;">${template.description}</p>
                                <div style="display: flex; align-items: center; gap: 8px; color: #FFC700; font-size: 12px; font-weight: 600;">
                                    <i class="fas fa-list"></i> ${template.fields.length} campos
                                </div>
                                <button class="apply-template-btn" data-template-id="${template.id}" style="margin-top: 16px; width: 100%; padding: 12px; background: linear-gradient(135deg, ${template.primary}, ${template.secondary}); border: none; border-radius: 10px; color: white; font-weight: 700; cursor: pointer; transition: all 0.3s;" 
                                        onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.3)';" 
                                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                                    <i class="fas fa-check"></i> Aplicar Template
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Conteúdo Temas -->
                <div id="module-themes-content" class="module-tab-content" style="display: none;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px;">
                        ${PREMIUM_THEMES.map(theme => `
                            <div class="theme-card" data-theme-id="${theme.id}" style="background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); border: 2px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 24px; cursor: pointer; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden;" 
                                 onmouseover="this.style.borderColor='#FFC700'; this.style.background='linear-gradient(135deg, rgba(255,199,0,0.15) 0%, rgba(255,199,0,0.05) 100%)'; this.style.transform='translateY(-6px) scale(1.02)'; this.style.boxShadow='0 12px 40px rgba(255,199,0,0.3)';" 
                                 onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'; this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='none';">
                                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${theme.gradient}; opacity: 0.8;"></div>
                                <div style="height: 120px; background: ${theme.gradient}; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2); position: relative; overflow: hidden;">
                                    <div style="position: absolute; bottom: 12px; left: 12px; right: 12px; display: flex; gap: 8px;">
                                        <div style="width: 32px; height: 32px; background: ${theme.primary}; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.3);"></div>
                                        <div style="width: 32px; height: 32px; background: ${theme.secondary}; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.3);"></div>
                                    </div>
                                </div>
                                <h4 style="margin: 0 0 8px 0; color: #ECECEC; font-size: 18px; font-weight: 800; letter-spacing: -0.3px;">${theme.name}</h4>
                                <p style="margin: 0 0 16px 0; color: #A1A1A1; font-size: 13px; line-height: 1.5; min-height: 38px;">${theme.description}</p>
                                <button class="apply-theme-btn" data-theme-id="${theme.id}" style="width: 100%; padding: 12px; background: linear-gradient(135deg, rgba(255,199,0,0.25) 0%, rgba(255,199,0,0.15) 100%); border: 2px solid #FFC700; border-radius: 12px; color: #FFC700; font-weight: 700; cursor: pointer; font-size: 14px; transition: all 0.3s; position: relative; overflow: hidden;" 
                                        onmouseover="this.style.background='linear-gradient(135deg, #FFC700 0%, #FFA500 100%)'; this.style.color='#000'; this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(255,199,0,0.5)';" 
                                        onmouseout="this.style.background='linear-gradient(135deg, rgba(255,199,0,0.25) 0%, rgba(255,199,0,0.15) 100%)'; this.style.color='#FFC700'; this.style.transform='scale(1)'; this.style.boxShadow='none';">
                                    <i class="fas fa-paint-brush" style="margin-right: 6px;"></i> Aplicar Tema
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal
    modal.querySelector('.close-module-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Tabs
    modal.querySelectorAll('.module-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            modal.querySelectorAll('.module-tab').forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = '#A1A1A1';
                t.style.fontWeight = '600';
            });
            tab.classList.add('active');
            tab.style.borderBottomColor = '#FFC700';
            tab.style.color = '#FFC700';
            tab.style.fontWeight = '700';
            
            modal.querySelectorAll('.module-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`module-${tabName}-content`).style.display = 'block';
        });
    });
    
    // Aplicar template
    modal.querySelectorAll('.apply-template-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const templateId = btn.dataset.templateId;
            const template = PREMIUM_TEMPLATES.find(t => t.id === templateId);
            
            if (!template) return;
            
            // Aplicar template
            applyTemplate(template);
            modal.remove();
        });
    });
    
    // Aplicar tema
    modal.querySelectorAll('.apply-theme-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const themeId = btn.dataset.themeId;
            const theme = PREMIUM_THEMES.find(t => t.id === themeId);
            
            if (!theme) return;
            
            // Aplicar tema
            applyTheme(theme);
            modal.remove();
        });
    });
}

// Aplicar template
async function applyTemplate(template) {
    console.log('YZ [APPLY_TEMPLATE] Aplicando template:', template.name, template.title);
    
    // Atualizar título e descrição
    const previewTitle = document.getElementById('preview-title');
    const previewDescription = document.getElementById('preview-description');
    const formTitleInput = document.getElementById('form-title');
    const formDescInput = document.getElementById('form-description');
    const moduleTitleInput = document.getElementById('form-module-title');
    
    // IMPORTANTE: Atualizar TODOS os campos de título para garantir que seja salvo
    if (formTitleInput) {
        formTitleInput.value = template.title;
        console.log('o. [APPLY_TEMPLATE] form-title atualizado:', template.title);
    }
    if (moduleTitleInput) {
        moduleTitleInput.value = template.title;
        console.log('o. [APPLY_TEMPLATE] form-module-title atualizado:', template.title);
    }
    if (previewTitle) {
        previewTitle.textContent = template.title;
        // Garantir contraste correto
        if (template.backgroundColor === '#FFFFFF' || !template.backgroundColor) {
            previewTitle.style.color = '#000000';
        } else {
            previewTitle.style.color = '#FFFFFF';
        }
    }
    if (previewDescription) {
        previewDescription.textContent = template.description;
        if (template.backgroundColor === '#FFFFFF' || !template.backgroundColor) {
            previewDescription.style.color = '#666666';
        } else {
            previewDescription.style.color = '#A1A1A1';
        }
    }
    if (formDescInput) formDescInput.value = template.description;
    
    // Atualizar campos
    formFields = template.fields.map((field, index) => {
        const fieldObj = {
            id: field.id || `field_${index}`,
            type: field.type || 'text',
            label: field.label,
            placeholder: field.placeholder || '',
            required: field.required || false,
            options: field.options || []
        };
        
        // Adicionar suporte para campos condicionais
        if (field.dependsOn) {
            fieldObj.dependsOn = field.dependsOn;
        }
        
        return fieldObj;
    });
    
    const formFieldsJsonEl = document.getElementById('form-fields-json');
    if (formFieldsJsonEl) {
        formFieldsJsonEl.value = JSON.stringify(formFields);
        console.log('o. [APPLY_TEMPLATE] form_fields atualizados:', formFields.length, 'campos');
        console.log('o. [APPLY_TEMPLATE] Primeiros campos:', formFields.slice(0, 3).map(f => ({ id: f.id, label: f.label, type: f.type })));
    }
    
    // Renderizar preview
    renderPreviewQuestions();
    
    // Aplicar cores do template (sempre usar primary e secondary do template)
    if (template.primary && template.secondary) {
        const primaryColorEl = document.getElementById('primary-color');
        const secondaryColorEl = document.getElementById('secondary-color');
        const backgroundColorEl = document.getElementById('background-color-url');
        const textColorEl = document.getElementById('text-color');
        
        if (primaryColorEl) {
            primaryColorEl.value = template.primary;
            console.log('o. [APPLY_TEMPLATE] primary-color atualizado:', template.primary);
        }
        if (secondaryColorEl) {
            secondaryColorEl.value = template.secondary;
            console.log('o. [APPLY_TEMPLATE] secondary-color atualizado:', template.secondary);
        }
        if (backgroundColorEl && template.backgroundColor) {
            backgroundColorEl.value = template.backgroundColor;
        }
        if (textColorEl && template.textColor) {
            textColorEl.value = template.textColor;
        }
        
        syncPreviewStyles();
    }
    
    // Salvar automaticamente com delay maior para garantir que tudo foi atualizado
    setTimeout(async () => {
        console.log('[APPLY_TEMPLATE] Iniciando salvamento automático...');
        const saveBtn = document.getElementById('save-form-btn');
        if (saveBtn) {
            // Verificar valores antes de salvar
            const formTitleBeforeSave = document.getElementById('form-title')?.value;
            const formFieldsBeforeSave = document.getElementById('form-fields-json')?.value;
            console.log('[APPLY_TEMPLATE] Valores antes de salvar:', {
                form_title: formTitleBeforeSave,
                form_fields_count: formFields.length,
                form_fields_json_length: formFieldsBeforeSave?.length
            });
            
            saveBtn.click();
        } else {
            console.error('O [APPLY_TEMPLATE] Botão de salvar não encontrado!');
        }
    }, 1000); // Aumentado para 1 segundo
    
    // Notificação
    showSuccessMessage(`Template "${template.name}" aplicado com sucesso!`);
}

// Aplicar tema
function applyTheme(theme) {
    const primaryColorEl = document.getElementById('primary-color');
    const secondaryColorEl = document.getElementById('secondary-color');
    
    if (primaryColorEl) primaryColorEl.value = theme.primary;
    if (secondaryColorEl) secondaryColorEl.value = theme.secondary;
    
    syncPreviewStyles();
    
    // Notificação
    showSuccessMessage(`Tema "${theme.name}" aplicado com sucesso!`);
}

// Função auxiliar para mostrar mensagens (se não existir)
function showSuccessMessage(message) {
    // Criar ou usar função existente de notificação
    if (typeof window.showSuccessMessage === 'function') {
        window.showSuccessMessage(message);
    } else {
        alert(message);
    }
}

// Exportar para uso global
window.openModuleSelector = openModuleSelector;
window.applyTemplate = applyTemplate;
window.applyTheme = applyTheme;
