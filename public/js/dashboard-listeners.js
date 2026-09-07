/**
 * Dashboard Listeners — setupEventListeners isolado (Conecta King).
 * Gerado por scripts/extract-dashboard-listeners.js
 */
(function (global) {
    'use strict';

    function core() { return global.DashboardCore || {}; }
    function cartao() { return global.DashboardCartao || {}; }
    function editor() { return global.DashboardEditor || {}; }
    function upload() { return global.DashboardUpload || {}; }
    function editModal() { return global.DashboardEditModal || {}; }
    function saveMod() { return global.DashboardSave || {}; }
    function sortMod() { return global.DashboardSortable || {}; }
    function qr() { return global.DashboardQR || {}; }
    function assinatura() { return global.DashboardAssinatura || {}; }

    function pick() {
        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'function') return arguments[i];
        }
        return function () {};
    }

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS() {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders() || {};
            return { 'Content-Type': 'application/json' };
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            return {};
        },
        safeFetch: null, // set below
        getAuthHeaders: function () {
            var c = core();
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders();
            return this.HEADERS_AUTH;
        },
        saveAllChanges: function () { return pick(saveMod().saveAllChanges, global.saveAllChanges).apply(null, arguments); },
        openCropper: function () { return pick(upload().openCropper, global.openCropper).apply(null, arguments); },
        closeCropper: function () { return pick(upload().closeCropper, global.closeCropper).apply(null, arguments); },
        openEditModal: function () { return pick(editModal().openEditModal, global.openEditModal).apply(null, arguments); },
        openEditModalForNewItem: function () { return pick(editModal().openEditModalForNewItem, global.openEditModalForNewItem).apply(null, arguments); },
        renderEditor: function () { return pick(editor().renderEditor, global.renderEditor).apply(null, arguments); },
        updateLivePreviewFromForm: function () { return pick(cartao().updateLivePreviewFromForm, global.updateLivePreviewFromForm).apply(null, arguments); },
        generateQRCode: function () { return pick(qr().generateQRCode, global.generateQRCode).apply(null, arguments); },
        getShareQrMeta: function () { return pick(qr().getShareQrMeta, global.getShareQrMeta).apply(null, arguments); },
        composeShareQrArt: function () { return pick(qr().composeShareQrArt, global.composeShareQrArt).apply(null, arguments); },
        deleteItem: function () { return pick(core().deleteItem, global.deleteItem).apply(null, arguments); },
        duplicateItem: function () { return pick(core().duplicateItem, global.duplicateItem).apply(null, arguments); },
        fetchProfileData: function () { return pick(core().fetchProfileData, global.fetchProfileData).apply(null, arguments); },
        initSortable: function () { return pick(sortMod().initSortable, core().initSortable, global.initSortable).apply(null, arguments); },
        setupMoveButtons: function () { return pick(sortMod().setupMoveButtons, core().setupMoveButtons, global.setupMoveButtons).apply(null, arguments); },
        handleImageUpload: function () { return pick(upload().handleImageUpload, global.handleImageUpload).apply(null, arguments); },
        handleDashboardPhotoUpload: function () { return pick(upload().handleDashboardPhotoUpload, global.handleDashboardPhotoUpload).apply(null, arguments); },
        handleDashboardAvatarUpload: function () { return pick(upload().handleDashboardAvatarUpload, global.handleDashboardAvatarUpload).apply(null, arguments); },
        handleBackgroundUpload: function () { return pick(core().handleBackgroundUpload, global.handleBackgroundUpload).apply(null, arguments); },
        handleShareImageUpload: function () { return pick(core().handleShareImageUpload, global.handleShareImageUpload).apply(null, arguments); },
        handleVitrineHeroUpload: function () { return pick(core().handleVitrineHeroUpload, global.handleVitrineHeroUpload).apply(null, arguments); },
        renderCarouselImagesNew: function () { return pick(core().renderCarouselImagesNew, global.renderCarouselImagesNew).apply(null, arguments); },
        removeCarouselImageNew: function () { return pick(core().removeCarouselImageNew, global.removeCarouselImageNew).apply(null, arguments); },
        loadProductsForCatalog: function () { return pick(core().loadProductsForCatalog, global.loadProductsForCatalog).apply(null, arguments); },
        openProductEditModal: function () { return pick(core().openProductEditModal, global.openProductEditModal).apply(null, arguments); },
        getDefaultIcon: function () { return pick(core().getDefaultIcon, global.getDefaultIcon).apply(null, arguments); },
        moduleListDisplayTitle: function () { return pick(core().moduleListDisplayTitle, global.moduleListDisplayTitle).apply(null, arguments); },
        bannerUrlModelsHtml: function () {
            var c = core();
            if (typeof c.bannerUrlModelsHtml === 'function') return c.bannerUrlModelsHtml();
            return '';
        },
        parseBannerDestination: function () {
            var c = core();
            if (typeof c.parseBannerDestination === 'function') return c.parseBannerDestination.apply(c, arguments);
            return { primary_url: String(arguments[0] || '').trim(), instagram_url: '', whatsapp_url: '' };
        },
        serializeBannerDestination: function () {
            var c = core();
            if (typeof c.serializeBannerDestination === 'function') return c.serializeBannerDestination.apply(c, arguments);
            return String(arguments[0] || '').trim();
        },
        wifiBannerUploadBlockHtml: function () {
            var c = core();
            if (typeof c.wifiBannerUploadBlockHtml === 'function') return c.wifiBannerUploadBlockHtml.apply(c, arguments);
            return '';
        },
        setAvatarSrc: function (el, src) {
            var c = core();
            if (typeof c.setAvatarSrc === 'function') return c.setAvatarSrc(el, src);
            if (el) el.src = src || '';
        },
        updateAvatarFormatSelector: function () {
            var c = core();
            if (typeof c.updateAvatarFormatSelector === 'function') return c.updateAvatarFormatSelector.apply(c, arguments);
        },
        applyAvatarFormatToPreview: function () {
            var c = core();
            if (typeof c.applyAvatarFormatToPreview === 'function') return c.applyAvatarFormatToPreview.apply(c, arguments);
        },
        loadSubscriptionInfo: function () { return pick(assinatura().loadSubscriptionInfo, global.loadSubscriptionInfo).apply(null, arguments); },
        main: function () { return pick(core().main, global.__dashboardMain).apply(null, arguments); }
    };

    // Fix safeFetch properly
    env.safeFetch = function (url, options) {
        var c = core();
        if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
        return fetch(url, options);
    };

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            return s ? s[prop] : null;
        }
    });

function setupEventListeners() {
    // Botão de salvar no header (desktop)
    const headerSaveBtn = document.getElementById('header-save-btn');
    if (headerSaveBtn && typeof headerSaveBtn.addEventListener === 'function') {
        headerSaveBtn.addEventListener('click', (e) => {
            env.saveAllChanges(e);
        });
    }

    // Botão de salvar mobile
    const mobileSaveBtn = document.getElementById('mobile-save-all-btn');
    if (mobileSaveBtn && typeof mobileSaveBtn.addEventListener === 'function') {
        mobileSaveBtn.addEventListener('click', (e) => {
            env.saveAllChanges(e);
        });
    }

    // Redirecionar ao clicar no título "Cartão virtual Conecta King" no mobile
    const contentHeader = document.querySelector('.content-header');
    if (contentHeader && typeof contentHeader.addEventListener === 'function') {
        contentHeader.addEventListener('click', (e) => {
            // Verificar se está no mobile
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                // Verificar se não clicou em botões ou outros elementos interativos
                const target = e.target;
                const clickedButton = target.closest('button');
                const clickedLink = target.closest('a');

                // Se clicou diretamente no header ou em área vazia (não em botões/links)
                if (!clickedButton && !clickedLink && (target === contentHeader || target.classList.contains('content-header'))) {
                    window.location.href = 'index.html';
                }
            }
        });
    }
    SELECTORS.addItemBtn.addEventListener('click', async () => {
        SELECTORS.addItemModal.classList.add('active');
        // Sempre recarregar módulos ao abrir (reflete Separação de Pacotes atual)
        window.userAvailableModules = null;
        if (typeof window.filterModulesByPlan === 'function') await window.filterModulesByPlan();
        else if (typeof env.filterModulesByPlan === 'function') await env.filterModulesByPlan();
    });
    SELECTORS.closeAddModalBtn.addEventListener('click', () => SELECTORS.addItemModal.classList.remove('active'));
    SELECTORS.addItemModal.addEventListener('click', e => { if (e.target === SELECTORS.addItemModal) SELECTORS.addItemModal.classList.remove('active'); });
    SELECTORS.buttonAlignOptions.forEach(radio => {
        radio.addEventListener('change', function () { env.updateLivePreviewFromForm(); });
    });
    SELECTORS.addItemModal.addEventListener('click', async e => {
        if (e.target === SELECTORS.addItemModal) {
            SELECTORS.addItemModal.classList.remove('active');
            return;
        }

        const choiceBtn = e.target.closest('.module-choice-card');
        if (choiceBtn) {
            const itemType = choiceBtn.dataset.itemType;

            // Verificar limite de links antes de adicionar (módulo isolado)
            try {
                const checkResponse = await env.safeFetch(`${env.API_URL}/api/link-limits/check/${itemType}`, {
                    headers: env.HEADERS_AUTH
                });

                if (checkResponse.ok) {
                    const checkData = await checkResponse.json();
                    if (checkData.success && checkData.data && !checkData.data.allowed) {
                        // Limite atingido - mostrar mensagem de upgrade
                        const limitInfo = checkData.data;
                        const moduleName = ITEM_TYPE_LABELS_FOR_VCARD[itemType] || itemType;

                        let upgradeMessage = `Você atingiu o limite de ${limitInfo.limit} links do tipo "${moduleName}" no seu plano atual.\n\n`;
                        upgradeMessage += `Links atuais: ${limitInfo.current} de ${limitInfo.limit}\n\n`;

                        // A sugestão de upgrade virá do backend quando tentar criar o item
                        upgradeMessage += 'Faça upgrade do seu plano para adicionar mais links.';

                        if (confirm(upgradeMessage + '\n\nDeseja ver os planos disponíveis?')) {
                            // Abrir aba de assinatura
                            const assinaturaLink = document.querySelector('[data-target="assinatura-pane"]');
                            if (assinaturaLink) {
                                assinaturaLink.click();
                            }
                        }

                        return; // Não adicionar o módulo
                    }
                }
            } catch (limitError) {
                // Se houver erro na verificação, logar mas continuar (comportamento seguro)
                console.warn('Erro ao verificar limite de links (continuando):', limitError.message);
            }

            // Perguntar quantos módulos adicionar (1 a 10)
            const qtyMsg = 'Quantos módulos deseja adicionar? (1 a 10)';
            const qtyStr = window.prompt(qtyMsg, '1');
            if (qtyStr == null || qtyStr.trim() === '') {
                return;
            }
            let qty = parseInt(qtyStr, 10);
            if (isNaN(qty) || qty < 1) qty = 1;
            if (qty > 10) qty = 10;

            // Verificar limite novamente considerando a quantidade
            try {
                const checkResponse = await env.safeFetch(`${env.API_URL}/api/link-limits/check/${itemType}`, {
                    headers: env.HEADERS_AUTH
                });

                if (checkResponse.ok) {
                    const checkData = await checkResponse.json();
                    if (checkData.success && checkData.data && checkData.data.limit !== null) {
                        const limitInfo = checkData.data;
                        const available = limitInfo.limit - limitInfo.current;

                        if (qty > available) {
                            const moduleName = ITEM_TYPE_LABELS_FOR_VCARD[itemType] || itemType;
                            alert(`Você só pode adicionar mais ${available} link(s) do tipo "${moduleName}". Limite do plano: ${limitInfo.limit} links.\n\nAjustando quantidade para ${available}.`);
                            qty = Math.max(1, available);

                            if (qty === 0) {
                                return; // Não pode adicionar nenhum
                            }
                        }
                    }
                }
            } catch (limitError) {
                console.warn('Erro ao verificar limite antes de adicionar:', limitError.message);
            }

            // Fechar modal de adicionar
            SELECTORS.addItemModal.classList.remove('active');

            // IMPORTANTE: alguns módulos são criados DIRETAMENTE no servidor (não espera "Publicar alterações")
            // KingSelection precisa de itemId real para gerenciar galerias no painel dedicado
            if (itemType === 'sales_page' || itemType === 'digital_form' || itemType === 'agenda' || itemType === 'king_selection' || itemType === 'convite' || itemType === 'wifi') {
                console.log(`z. Criando ${qty} ${itemType} DIRETAMENTE no servidor...`);
                try {
                    for (let i = 0; i < qty; i++) {
                        const postBody = {
                            item_type: itemType,
                            is_active: true,
                            display_order: 999
                        };
                        if (itemType === 'wifi') {
                            postBody.title = 'Wi-Fi (QR Code)';
                            postBody.icon_class = 'fas fa-wifi';
                            postBody.destination_url = JSON.stringify({
                                ssid: '',
                                password: '',
                                security: 'WPA',
                                hidden: false,
                                display_format: 'button',
                                banner_image_url: '',
                                logo_url: '',
                                logo_size: 48
                            });
                            postBody.logo_size = 48;
                        }
                        const response = await fetch(`${env.API_URL}/api/profile/items`, {
                            method: 'POST',
                            headers: env.HEADERS,
                            body: JSON.stringify(postBody)
                        });
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ message: `Erro ao criar ${itemType}` }));

                            // Verificar se é erro de limite excedido
                            if (response.status === 403 && errorData.error === 'LIMIT_EXCEEDED') {
                                let moduleName = 'módulo';
                                if (itemType === 'sales_page') moduleName = 'página de vendas';
                                else if (itemType === 'digital_form') moduleName = 'formulário digital';
                                else if (itemType === 'agenda') moduleName = 'agenda inteligente';
                                else if (itemType === 'convite') moduleName = 'convite digital';
                                else if (itemType === 'wifi') moduleName = 'Wi-Fi (QR Code)';

                                let errorMsg = `Limite atingido: ${errorData.message || `Você atingiu o limite de links do tipo ${moduleName}`}\n\n`;
                                errorMsg += `Links atuais: ${errorData.current || 0} de ${errorData.limit || 0}\n\n`;

                                if (errorData.upgrade_suggestion) {
                                    errorMsg += `Y' Sugestão: Faça upgrade para o plano "${errorData.upgrade_suggestion.plan_name}" para ter ${errorData.upgrade_suggestion.new_limit === null ? 'ilimitados' : errorData.upgrade_suggestion.new_limit} links disponíveis.\n\n`;
                                    errorMsg += `Deseja ver os planos disponíveis?`;

                                    if (confirm(errorMsg)) {
                                        const assinaturaLink = document.querySelector('[data-target="assinatura-pane"]');
                                        if (assinaturaLink) {
                                            assinaturaLink.click();
                                        }
                                    }
                                } else {
                                    errorMsg += 'Faça upgrade do seu plano para adicionar mais links.';
                                    alert(errorMsg);
                                }

                                // Parar de criar mais itens
                                break;
                            }

                            throw new Error(errorData.message || `Erro ao criar ${itemType}`);
                        }
                        const newItem = await response.json();
                        console.log(`${itemType} criado (${i + 1}/${qty}):`, newItem);
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    await env.fetchProfileData(true);
                    setTimeout(() => { env.renderEditor(window.currentProfileData); }, 100);
                    return;
                } catch (error) {
                    console.error(`Erro ao criar ${itemType}:`, error);
                    let moduleName = 'módulo';
                    if (itemType === 'sales_page') moduleName = 'página de vendas';
                    else if (itemType === 'digital_form') moduleName = 'formulário digital';
                    else if (itemType === 'agenda') moduleName = 'agenda inteligente';
                    else if (itemType === 'convite') moduleName = 'convite digital';
                    else if (itemType === 'wifi') moduleName = 'Wi-Fi (QR Code)';

                    // Não mostrar erro se já foi tratado acima (limite excedido)
                    if (error.message && !error.message.includes('Limite atingido')) {
                        alert(`Não foi possível criar o ${moduleName}: ${error.message}`);
                    }
                    return;
                }
            }

            // Para outros módulos: criar localmente (qty vezes)
            console.log(`z. Adicionando ${qty} módulo(s) ${itemType} localmente...`);
            if (!window.currentProfileData) {
                window.currentProfileData = { details: {}, items: [] };
            }
            if (!window.currentProfileData.items) {
                window.currentProfileData.items = [];
            }
            let lastTempId = null;
            for (let i = 0; i < qty; i++) {
                const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                lastTempId = tempId;
                const newItem = {
                    id: tempId,
                    item_type: itemType,
                    title: getItemTypeName(itemType),
                    destination_url: itemType === 'wifi'
                        ? JSON.stringify({ ssid: '', password: '', security: 'WPA', hidden: false, display_format: 'button', banner_image_url: '', logo_url: '', logo_size: 48 })
                        : itemType === 'texto_com_botao'
                        ? JSON.stringify({ url: '', button_label: 'Inscrever-se', eyebrow: '', lines: [], template: 'evento' })
                        : itemType === 'whatsapp' ? '' : (itemType === 'email' ? '' : '#'),
                    pix_key: '',
                    recipient_name: '',
                    pix_amount: '',
                    pix_description: '',
                    pdf_url: '',
                    aspect_ratio: itemType === 'banner' ? 'tarja' : 'auto',
                    icon_class: env.getDefaultIcon(itemType),
                    is_active: true,
                    display_order: 999,
                    image_url: null,
                    logo_size: itemType === 'wifi' ? 48 : 24
                };
                window.currentProfileData.items.push(newItem);
            }
            try {
                const container = SELECTORS.itemsContainer || document.getElementById('items-container');
                if (container) {
                    try {
                        env.renderEditor(window.currentProfileData);
                        if (lastTempId) {
                            setTimeout(() => {
                                const newItemEl = document.querySelector(`[data-id="${lastTempId}"]`);
                                if (newItemEl) newItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }, 100);
                        }
                    } catch (renderError) {
                        console.error('Erro ao renderizar:', renderError);
                        alert(`Erro ao adicionar módulo: ${renderError.message}`);
                    }
                } else {
                    alert('Erro: Container de módulos não encontrado. Atualize a página.');
                }
            } catch (error) {
                console.error("Erro ao criar item(s) localmente:", error);
                alert(`Erro ao adicionar módulo: ${error.message}`);
            }
        }
    });
    SELECTORS.backgroundTypeOptions.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const bgType = e.target.value;
            if (bgType === 'image') {
                SELECTORS.backgroundColorContainer.style.display = 'none';
                SELECTORS.backgroundImageContainer.style.display = 'block';
            } else {
                SELECTORS.backgroundColorContainer.style.display = 'block';
                SELECTORS.backgroundImageContainer.style.display = 'none';
            }
            env.updateLivePreviewFromForm();
        });
    });
    // Atualizar preview ao mudar Salvar Contato ou Bíblia (visível/oculto)
    document.addEventListener('change', (e) => {
        if (e.target && (e.target.name === 'vcard-toggle' || e.target.name === 'bible-toggle' || e.target.name === 'bible-verse-position' || e.target.name === 'bible-verse-size')) {
            env.updateLivePreviewFromForm();
        }
    });
    const openPreview = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!SELECTORS.livePreview) return;
        SELECTORS.livePreview.classList.add('visible');
        document.body.classList.add('preview-is-open');
        document.body.style.overflow = 'hidden';

        // Scroll para o topo do preview
        SELECTORS.livePreview.scrollTop = 0;
    };

    const closePreview = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!SELECTORS.livePreview) return;
        SELECTORS.livePreview.classList.remove('visible');
        document.body.classList.remove('preview-is-open');
        document.body.style.overflow = '';
    };

    if (SELECTORS.mobilePreviewBtn) {
        SELECTORS.mobilePreviewBtn.addEventListener('click', openPreview);
        SELECTORS.mobilePreviewBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            openPreview(e);
        }, { passive: false });
        SELECTORS.mobilePreviewBtn.style.touchAction = 'manipulation';
        SELECTORS.mobilePreviewBtn.style.webkitTapHighlightColor = 'transparent';
    }

    if (SELECTORS.previewCloseBtn) {
        SELECTORS.previewCloseBtn.addEventListener('click', closePreview);
        SELECTORS.previewCloseBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            closePreview(e);
        }, { passive: false });
        SELECTORS.previewCloseBtn.style.touchAction = 'manipulation';
    }

    if (SELECTORS.livePreview) {
        // Fechar ao clicar/tocar no overlay do preview
        SELECTORS.livePreview.addEventListener('click', (e) => {
            if (e.target === SELECTORS.livePreview || e.target.classList.contains('live-preview')) {
                closePreview(e);
            }
        });

        SELECTORS.livePreview.addEventListener('touchend', (e) => {
            if (e.target === SELECTORS.livePreview || e.target.classList.contains('live-preview')) {
                e.preventDefault();
                closePreview(e);
            }
        }, { passive: false });

        // Prevenir scroll dentro do preview no mobile
        SELECTORS.livePreview.addEventListener('touchmove', (e) => {
            const previewContent = SELECTORS.livePreview.querySelector('.preview-card');
            if (previewContent && previewContent.contains(e.target)) {
                // Permitir scroll apenas dentro do conteúdo do preview
                return;
            }
            // Prevenir scroll no overlay
            if (e.target === SELECTORS.livePreview) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    if (SELECTORS.backgroundImageOpacityPicker) {
        SELECTORS.backgroundImageOpacityPicker.addEventListener('input', function () { env.updateLivePreviewFromForm(); });
    }
    SELECTORS.itemsContainer.addEventListener('click', e => {
        const editBtn = e.target.closest('.edit-item-btn, .module-action-btn.edit');
        const deleteBtn = e.target.closest('.delete-item-btn, .module-action-btn.delete');
        const duplicateBtn = e.target.closest('.duplicate-item-btn, .module-action-btn.duplicate');
        const iconPicker = e.target.closest('.item-icon-picker');
        const uploadArea = e.target.closest('.image-upload-area');
        const logoUploadArea = e.target.closest('.logo-upload-area');
        const removeLogoBtn = e.target.closest('.remove-logo-btn');

        if (editBtn) {
            const itemEl = editBtn.closest('.item, .module-item');
            const itemType = itemEl?.dataset?.itemType;
            const itemId = itemEl?.dataset?.id || editBtn?.dataset?.itemId;

            console.log('[DASHBOARD] Clique em editar:', {
                itemType,
                itemId,
                itemEl: !!itemEl,
                editBtn: !!editBtn
            });

            env.openEditModal(itemEl);
        }

        if (duplicateBtn) {
            e.preventDefault();
            e.stopPropagation();
            const itemEl = duplicateBtn.closest('.item, .module-item');
            const itemId = itemEl?.dataset?.id || duplicateBtn?.dataset?.itemId;
            if (!itemId || String(itemId).startsWith('temp_')) {
                alert('Publique as alterações primeiro para poder duplicar este módulo.');
                return;
            }
            env.duplicateItem(itemId);
            return;
        }

        if (deleteBtn) {
            const itemEl = deleteBtn.closest('.item, .module-item');
            if (!itemEl) {
                console.error('O Elemento do item não encontrado ao tentar deletar');
                return;
            }
            const itemId = itemEl.dataset?.id;
            if (!itemId) {
                console.error('O ID do item não encontrado no dataset');
                alert('Erro: Não foi possível identificar o módulo para deletar.');
                return;
            }
            if (confirm('Tem certeza que deseja excluir este módulo?')) {
                env.deleteItem(itemId);
            }
        }

        // Toggle de módulo
        const toggleInput = e.target.closest('.module-toggle-input');
        if (toggleInput && toggleInput.dataset) {
            const itemId = toggleInput.dataset.itemId;
            if (itemId) {
                const isActive = toggleInput.checked;
                // Atualizar status ativo do módulo
                updateItemActiveStatus(itemId, isActive);
            }
        }

        if (uploadArea) {
            const itemEl = uploadArea.closest('.item, .module-item');
            const fileInput = uploadArea.querySelector('.item-file-input');
            if (fileInput) {
                fileInput.click();
            }
        }

        if (logoUploadArea && !e.target.closest('.remove-logo-btn')) {
            const fileInput = logoUploadArea.querySelector('.item-logo-file-input');
            if (fileInput) {
                // Prevenir múltiplos cliques simultâneos
                if (fileInput.dataset.uploading === 'true') {
                    console.log('Upload de logo já em andamento, ignorando clique');
                    return;
                }
                fileInput.dataset.uploading = 'true';
                fileInput.click();
                // Resetar flag após um tempo
                setTimeout(() => {
                    fileInput.dataset.uploading = 'false';
                }, 1000);
            }
        }

        if (removeLogoBtn) {
            const logoUploadArea = removeLogoBtn.closest('.logo-upload-area');
            const itemEl = logoUploadArea?.closest('.item');
            const modal = logoUploadArea?.closest('#edit-item-modal, .edit-item-modal');

            if (confirm('Tem certeza que deseja remover a logo? O ícone será usado como fallback.')) {
                const preview = logoUploadArea.querySelector('.item-logo-upload-preview');
                const uploadText = logoUploadArea.querySelector('.logo-upload-text');
                const imageUrlInput = logoUploadArea.closest('.item-inputs-edit, #edit-modal-body')?.querySelector('.item-image-url-input') ||
                    modal?.querySelector('.item-image-url-input');

                if (preview) {
                    preview.src = '';
                    preview.style.display = 'none';
                }
                if (uploadText) uploadText.style.display = '';
                if (removeLogoBtn) removeLogoBtn.style.display = 'none';
                if (imageUrlInput) imageUrlInput.value = '';

                // Atualizar preview do item na lista também
                if (itemEl) {
                    const logoPreview = itemEl.querySelector('.item-logo-preview');
                    const iconPicker = itemEl.querySelector('.item-icon-picker');
                    if (logoPreview) logoPreview.style.display = 'none';
                    if (iconPicker) iconPicker.style.display = 'inline-block';
                }

                env.updateLivePreviewFromForm();
            }
        }

        if (iconPicker) {
            const itemEl = iconPicker.closest('.item');
            activeItemIdForIconPicker = itemEl.dataset.id;
            SELECTORS.iconModal.classList.add('active');
        }
    });
    SELECTORS.itemsContainer.addEventListener('change', async e => {
        const pdfUploadArea = e.target.closest('.pdf-upload-area');
        if (pdfUploadArea) {
            const fileInput = e.target;
            const file = fileInput.files[0];
            if (!file) return;

            const itemEl = fileInput.closest('.item');
            const urlInput = itemEl.querySelector('.item-pdf-url-input');
            const uploadText = pdfUploadArea.querySelector('p');

            itemEl.classList.add('is-uploading');

            try {
                const result = await uploadPDF(file, (status) => {
                    uploadText.textContent = status;
                });

                // Sucesso!
                urlInput.value = result.pdf_url;
                itemEl.querySelector('.item-display-dest').textContent = 'Arquivo carregado';
                env.updateLivePreviewFromForm();

            } catch (error) {
                console.error('Erro no upload do PDF:', error);
                alert(`Erro: ${error.message}`);
            } finally {
                itemEl.classList.remove('is-uploading');
            }
        }
    });

    if (SELECTORS.backgroundUploadArea) {
        SELECTORS.backgroundUploadArea.addEventListener('click', () => {
            SELECTORS.backgroundFileInput.click();
        });
    }

    if (SELECTORS.backgroundFileInput) {
        SELECTORS.backgroundFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                env.openCropper(file, 'background');
            }
        });
    }

    SELECTORS.editModalBody.addEventListener('change', e => {
        if (e.target.name === 'aspect-ratio-selector') {
            const itemId = SELECTORS.editItemModal.dataset.editingId;
            const itemEl = document.querySelector(`.item[data-id='${itemId}']`);
            if (itemEl) {
                itemEl.dataset.aspectRatio = e.target.value;
                console.log(`[ASPECT RATIO] Aspect ratio atualizado para: ${e.target.value}`);
                // Atualizar preview em tempo real
                env.updateLivePreviewFromForm();
            }
        }

        if (e.target.classList.contains('wifi-display-format-input')) {
            const itemId = SELECTORS.editItemModal?.dataset?.editingId;
            const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
            if (!itemEl || itemEl.dataset.itemType !== 'wifi') return;
            const v = e.target.value;
            itemEl.querySelectorAll('.wifi-display-format-input').forEach(r => { r.checked = r.value === v; });
            const logoSec = itemEl.querySelector('.wifi-logo-section');
            const banSec = itemEl.querySelector('.wifi-banner-section');
            if (logoSec) logoSec.style.display = v === 'banner' ? 'none' : 'block';
            if (banSec) banSec.style.display = v === 'banner' ? 'block' : 'none';
            const mLogo = SELECTORS.editItemModal?.querySelector('.wifi-modal-logo-section');
            const mBan = SELECTORS.editItemModal?.querySelector('.wifi-modal-banner-section');
            if (mLogo) mLogo.style.display = v === 'banner' ? 'none' : 'block';
            if (mBan) mBan.style.display = v === 'banner' ? 'block' : 'none';
            const displayDest = itemEl.querySelector('.item-display-dest');
            const ssid = (itemEl.querySelector('.wifi-ssid-input')?.value || '').trim();
            if (displayDest) {
                displayDest.textContent = ssid ? `${v === 'banner' ? 'Banner' : 'Botão'} · Rede: ${ssid}` : 'Informe o nome da rede (SSID)';
            }
            env.updateLivePreviewFromForm();
        }

        if (e.target.id === 'edit-wifi-hidden') {
            const itemId = SELECTORS.editItemModal?.dataset?.editingId;
            const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
            if (itemEl && itemEl.dataset.itemType === 'wifi') {
                const h = itemEl.querySelector('.wifi-hidden-input');
                if (h) h.checked = !!e.target.checked;
            }
        }

        if (e.target.id === 'edit-wifi-security') {
            const itemId = SELECTORS.editItemModal?.dataset?.editingId;
            const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
            if (itemEl && itemEl.dataset.itemType === 'wifi') {
                const s = itemEl.querySelector('.wifi-security-input');
                if (s) s.value = e.target.value;
            }
        }

        // Event listener para upload de imagem de banner no modal
        if (e.target.classList.contains('item-file-input')) {
            const file = e.target.files[0];
            if (!file) return;

            // PRIORIDADE 1: Pegar do próprio input (data attributes)
            let itemId = e.target.dataset.itemId;
            let itemType = e.target.dataset.itemType;

            // PRIORIDADE 2: Pegar do elemento pai (upload area)
            if (!itemId || !itemType) {
                const uploadArea = e.target.closest('.image-upload-area');
                if (uploadArea) {
                    itemId = uploadArea.dataset.itemId || itemId;
                    itemType = uploadArea.dataset.itemType || itemType;
                }
            }

            // PRIORIDADE 3: Pegar do modal
            if (!itemId || !itemType) {
                itemId = SELECTORS.editItemModal?.dataset?.editingId || itemId;
                itemType = SELECTORS.editItemModal?.dataset?.itemType || itemType;
            }

            // PRIORIDADE 4: Pegar do item na lista
            if (!itemId || !itemType) {
                const itemEl = e.target.closest('.item, .module-item');
                if (itemEl) {
                    itemId = itemEl.dataset.id || itemId;
                    itemType = itemEl.dataset.itemType || itemType;
                }
            }

            console.log(`[UPLOAD] Arquivo selecionado:`, {
                itemId,
                itemType,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fonteItemId: e.target.dataset.itemId ? 'input' : (e.target.closest('.image-upload-area')?.dataset.itemId ? 'uploadArea' : (SELECTORS.editItemModal?.dataset.editingId ? 'modal' : 'lista')),
                fonteItemType: e.target.dataset.itemType ? 'input' : (e.target.closest('.image-upload-area')?.dataset.itemType ? 'uploadArea' : (SELECTORS.editItemModal?.dataset.itemType ? 'modal' : 'lista'))
            });

            // Banner normal ou banner Wi-Fi
            if (file && (itemType === 'banner' || itemType === 'wifi-banner')) {
                const cropTrigger = itemType === 'wifi-banner' ? 'wifi-banner' : 'banner';
                const modalItemType = SELECTORS.editItemModal?.dataset?.itemType;
                console.log(`[BANNER] Upload no modal (${cropTrigger}) item ${itemId}:`, file.name);
                let itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);

                if (!itemEl && itemId && cropTrigger === 'wifi-banner') {
                    itemEl = { dataset: { id: itemId, itemType: 'wifi' } };
                    console.log(`[WIFI-BANNER] Item não encontrado na lista, usando referência temporária`);
                } else if (!itemEl && itemId) {
                    itemEl = { dataset: { id: itemId, itemType: 'banner' } };
                    console.log(`[BANNER] Item não encontrado na lista, usando referência temporária`);
                }

                if (itemEl) {
                    if (cropTrigger === 'wifi-banner' && modalItemType === 'wifi' && typeof itemEl.querySelector !== 'function') {
                        itemEl = document.querySelector(`.module-item[data-id='${itemId}']`) || itemEl;
                    }
                    console.log(`[BANNER] Abrindo cropper (${cropTrigger}) ${itemId}`);
                    env.openCropper(file, cropTrigger, itemEl);
                } else {
                    console.error(`[BANNER] Item ${itemId} não encontrado para upload`);
                    alert('Erro: Não foi possível encontrar o módulo. Tente fechar e abrir o modal novamente.');
                }
            } else if (file && !itemType) {
                console.error(`[UPLOAD] itemType não encontrado em nenhuma fonte!`);
                console.error(`[UPLOAD] Debug:`, {
                    inputDataset: e.target.dataset,
                    uploadAreaDataset: e.target.closest('.image-upload-area')?.dataset,
                    modalDataset: SELECTORS.editItemModal?.dataset,
                    modalAtivo: SELECTORS.editItemModal?.classList.contains('active')
                });
                alert('Erro: Não foi possível detectar o tipo do módulo. Tente fechar e abrir o modal novamente.');
            }
        }
    });

    SELECTORS.itemsContainer.addEventListener('input', e => {
        if (e.target.classList.contains('item-image-url-input')) {
            const bannerItem = e.target.closest('.item');
            bannerItem.querySelector('.banner-preview-thumb').src = e.target.value;
        }
    });
    document.querySelector('.editor-area').addEventListener('input', function () { env.updateLivePreviewFromForm(); });

    document.addEventListener('click', async function (e) {
        const actionBtn = e.target.closest('.banner-copy-model-btn, .banner-use-model-btn');
        if (!actionBtn) return;
        const model = String(actionBtn.dataset.model || '').trim();
        if (!model) return;
        e.preventDefault();
        if (actionBtn.classList.contains('banner-copy-model-btn')) {
            try {
                await navigator.clipboard.writeText(model);
                const prev = actionBtn.textContent;
                actionBtn.textContent = 'Copiado!';
                setTimeout(() => { actionBtn.textContent = prev; }, 1200);
            } catch (err) {
                window.prompt('Copie o modelo:', model);
            }
            return;
        }
        const itemId = SELECTORS.editItemModal?.dataset?.editingId
            || actionBtn.closest('.module-item, .item')?.dataset?.id;
        const modal = itemId ? document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`) : SELECTORS.editItemModal;
        const destModal = modal?.querySelector('#edit-dest-url');
        const itemEl = itemId ? document.querySelector(`.module-item[data-id="${itemId}"], .item[data-id="${itemId}"]`) : actionBtn.closest('.module-item, .item');
        const destItem = itemEl?.querySelector('.item-destination-url-input');
        if (destModal) destModal.value = model;
        if (destItem) destItem.value = model;
        const prev = actionBtn.textContent;
        actionBtn.textContent = 'Colado na URL';
        setTimeout(() => { actionBtn.textContent = prev; }, 1200);
            env.updateLivePreviewFromForm();
    });

    // Event listener para atualizar preview e item da lista em tempo real quando campos do modal mudarem
    SELECTORS.editModalBody.addEventListener('input', e => {
        const itemId = SELECTORS.editItemModal?.dataset.editingId;
        if (!itemId || !SELECTORS.editItemModal.classList.contains('active')) return;

        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) return;

        const itemType = itemEl.dataset.itemType;
        const targetId = e.target.id;

        // Atualizar campos do PIX/PIX QR Code em tempo real
        if (itemType === 'pix' || itemType === 'pix_qrcode') {
            if (targetId === 'edit-title') {
                const titleInput = itemEl.querySelector('.item-title-input');
                const displayTitle = itemEl.querySelector('.item-display-title');
                const moduleName = itemEl.querySelector('.module-name');
                if (titleInput) titleInput.value = e.target.value;
                if (displayTitle) displayTitle.textContent = e.target.value || 'PIX QR Code';
                if (moduleName) moduleName.textContent = e.target.value || 'PIX QR Code';
            } else if (targetId === 'edit-recipient-name') {
                const recipientInput = itemEl.querySelector('.item-recipient-name-input');
                if (recipientInput) recipientInput.value = e.target.value;
            } else if (targetId === 'edit-pix-key') {
                const pixKeyInput = itemEl.querySelector('.item-pix-key-input');
                const displayDest = itemEl.querySelector('.item-display-dest');
                if (pixKeyInput) pixKeyInput.value = e.target.value;
                if (displayDest) displayDest.textContent = e.target.value || 'Nenhuma chave configurada';
            } else if (targetId === 'edit-pix-amount') {
                const pixAmountInput = itemEl.querySelector('.item-pix-amount-input');
                if (pixAmountInput) pixAmountInput.value = e.target.value;
            } else if (targetId === 'edit-pix-description') {
                const pixDescriptionInput = itemEl.querySelector('.item-pix-description-input');
                if (pixDescriptionInput) pixDescriptionInput.value = e.target.value;
            }

            // Atualizar preview em tempo real
            env.updateLivePreviewFromForm();
        } else if (itemType === 'wifi') {
            const modal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
            const listTitle = itemEl.querySelector('.item-title-input');
            const listSsid = itemEl.querySelector('.wifi-ssid-input');
            const listPass = itemEl.querySelector('.wifi-password-input');
            const listSec = itemEl.querySelector('.wifi-security-input');
            const listHidden = itemEl.querySelector('.wifi-hidden-input');
            const listBanner = itemEl.querySelector('.wifi-banner-url-input');
            const listLogo = itemEl.querySelector('.wifi-logo-url-input');
            const listLogoSize = itemEl.querySelector('.wifi-logo-size-input');
            if (targetId === 'edit-title' && modal) {
                const v = modal.querySelector('#edit-title')?.value;
                if (listTitle && v !== undefined) listTitle.value = v;
                const displayTitle = itemEl.querySelector('.item-display-title');
                const moduleName = itemEl.querySelector('.module-name');
                if (displayTitle) displayTitle.textContent = v;
                if (moduleName) moduleName.textContent = v;
            }
            if (targetId === 'edit-wifi-ssid' && modal) {
                const v = modal.querySelector('#edit-wifi-ssid')?.value;
                if (listSsid && v !== undefined) listSsid.value = v;
                const displayDest = itemEl.querySelector('.item-display-dest');
                const fmt = modal.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                const ssid = (v || '').trim();
                if (displayDest) {
                    displayDest.textContent = ssid ? `${fmt === 'banner' ? 'Banner' : 'Botão'} · Rede: ${ssid}` : 'Informe o nome da rede (SSID)';
                }
            }
            if (targetId === 'edit-wifi-password' && modal && listPass) {
                listPass.value = modal.querySelector('#edit-wifi-password')?.value || '';
            }
            if (e.target.id === 'edit-wifi-security' && modal && listSec) {
                listSec.value = modal.querySelector('#edit-wifi-security')?.value || 'WPA';
            }
            if (targetId === 'edit-wifi-hidden' && modal && listHidden) {
                listHidden.checked = !!modal.querySelector('#edit-wifi-hidden')?.checked;
            }
            if (targetId === 'edit-wifi-banner-url' && modal && listBanner) {
                listBanner.value = modal.querySelector('#edit-wifi-banner-url')?.value || '';
            }
            if (targetId === 'edit-wifi-logo-url' && modal && listLogo) {
                listLogo.value = modal.querySelector('#edit-wifi-logo-url')?.value || '';
            }
            if (targetId === 'edit-wifi-logo-size' && modal && listLogoSize) {
                listLogoSize.value = modal.querySelector('#edit-wifi-logo-size')?.value || '';
                itemEl.dataset.logoSize = listLogoSize.value;
            }
            env.updateLivePreviewFromForm();
        }
        // Atualizar outros tipos de módulos também
        else if (targetId === 'edit-title') {
            const titleInput = itemEl.querySelector('.item-title-input');
            const displayTitle = itemEl.querySelector('.item-display-title');
            const moduleName = itemEl.querySelector('.module-name');
            if (titleInput) titleInput.value = e.target.value;
            if (displayTitle) displayTitle.textContent = e.target.value;
            if (moduleName) moduleName.textContent = e.target.value;
            env.updateLivePreviewFromForm();
        } else if (targetId === 'edit-dest-url') {
            const destInput = itemEl.querySelector('.item-destination-url-input');
            const displayDest = itemEl.querySelector('.item-display-dest');
            if (destInput) destInput.value = e.target.value;
            if (displayDest) displayDest.textContent = e.target.value || '#';
            env.updateLivePreviewFromForm();
        }
    });
    SELECTORS.sidebarNavLinks.forEach(link => {
        if (link.id !== 'logout-btn' && link.id !== 'adm-link' && link.id !== 'personalizacao-logo-link' && !link.href.includes('conta.html') && !link.href.includes('admin') && !link.href.includes('business')) {
            if (link.id === 'king-forms-sidebar-link') {
                return;
            }
            if (link.id === 'king-selection-sidebar-link') {
                // Garante destino canônico mesmo sem JS (fallback do href no HTML)
                link.href = kingSelectionAdminUrl();
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await window.navigateToKingSelectionAdmin();
                }, false);
                return;
            }
            if (link.id === 'recibos-orcamentos-sidebar-link') {
                return;
            }

            if (link.id === 'bible-sidebar-link') {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const details = (window.currentProfileData && window.currentProfileData.details) || {};
                        const slug = String(details.profile_slug || details.slug || '').trim();
                        let itemId = (window.currentProfileData && window.currentProfileData.items)
                            ? (window.currentProfileData.items.find(function (it) { return it.item_type === 'bible'; }) || {}).id
                            : null;
                        if (!itemId) {
                            try {
                                itemId = sessionStorage.getItem('bible_item_id') || sessionStorage.getItem('bible_panel_item_id');
                            } catch (e0) {}
                        }
                        if (!itemId) {
                            const res = await fetch(`${env.API_URL}/api/profile`, { headers: env.HEADERS });
                            const data = await res.json().catch(function () { return {}; });
                            if (res.ok && data.items && Array.isArray(data.items)) {
                                const bib = data.items.find(function (it) { return it.item_type === 'bible'; });
                                if (bib) itemId = bib.id;
                            }
                        }
                        if (!itemId) {
                            const createRes = await fetch(`${env.API_URL}/api/profile/items`, {
                                method: 'POST',
                                headers: env.HEADERS,
                                body: JSON.stringify({ item_type: 'bible', title: 'Bíblia', is_active: true, display_order: 999 })
                            });
                            const createData = await createRes.json().catch(function () { return {}; });
                            if (!createRes.ok) throw new Error(createData.message || 'Erro ao criar Bíblia');
                            itemId = createData.id;
                        }
                        try {
                            sessionStorage.setItem('bible_item_id', String(itemId));
                            sessionStorage.setItem('bible_panel_item_id', String(itemId));
                        } catch (e) {}
                        if (slug) {
                            window.location.href = `${env.API_URL}/${encodeURIComponent(slug)}/biblia`;
                        } else {
                            window.location.href = 'bibliaking.html';
                        }
                    } catch (err) {
                        alert(err.message || 'Erro ao abrir Bíblia.');
                    }
                }, false);
                return;
            }
            link.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();

                // Navegar para o painel correto
                SELECTORS.sidebarNavLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const targetId = link.dataset.target;

                if (targetId) {
                    // Esconder todos os painéis
                    document.querySelectorAll('.main-content').forEach(pane => {
                        pane.classList.remove('active');
                        pane.style.display = 'none';
                    });

                    // King Forms: ocultar Pré-visualização para o conteúdo ocupar toda a área
                    var livePreview = document.querySelector('.live-preview');
                    if (livePreview) {
                        livePreview.style.display = targetId === 'king-forms-pane' ? 'none' : '';
                    }

                    // Mostrar o painel correto
                    const targetPane = document.getElementById(targetId);
                    if (targetPane) {
                        targetPane.classList.add('active');
                        targetPane.style.display = 'flex';
                        if (targetId === 'king-forms-pane') {
                            var kfIframe = document.getElementById('king-forms-iframe');
                            if (kfIframe && (!kfIframe.src || kfIframe.src === 'about:blank' || kfIframe.src.endsWith('about:blank'))) kfIframe.src = 'kingForms.html';
                        }
                        // contratos/agenda/meu-site descontinuados — ignorar
                    }
                    // Atualizar URL com o hash do painel para que, ao atualizar a página, permaneça na mesma seção
                    const basePath = window.location.pathname || 'dashboard.html';
                    let newHash = targetId;
                    if (targetId === 'finance-pane') {
                        const curHash = (window.location.hash || '').replace(/^#/, '');
                        const m = curHash.match(/^finance-pane-tab-(.+)$/);
                        let tab = m && ['resumo', 'fluxo', 'trabalhos', 'bens', 'cartoes', 'meta', 'terceiros', 'serasa'].includes(m[1]) ? m[1] : localStorage.getItem('finance_active_tab');
                        if (tab && ['resumo', 'fluxo', 'trabalhos', 'bens', 'cartoes', 'meta', 'terceiros', 'serasa'].includes(tab)) {
                            newHash = 'finance-pane-tab-' + tab;
                        }
                    }
                    window.history.replaceState(null, '', basePath + '#' + newHash);
                    try { localStorage.setItem('dashboard_last_pane', newHash); } catch (e) { }
                }

                // Fechar menu mobile após navegação
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar && sidebar.classList.contains('mobile-open')) {
                        setTimeout(() => {
                            sidebar.classList.remove('mobile-open');
                            document.body.classList.remove('mobile-menu-open');
                            document.body.style.overflow = '';
                            const overlay = document.getElementById('sidebar-overlay');
                            if (overlay) overlay.classList.remove('active');
                        }, 200);
                    }
                }
            }, false); // Usar bubble phase para não interferir com outros listeners
        }
    });

    // Sidebar tabs (Perfis/Empresa) - melhorado para mobile
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabType = tab.dataset.tab;

            if (tabType === 'times') {
                // Navegar para o painel empresarial
                window.location.href = 'business/index.html';
            } else {
                // Mostrar perfil pessoal
                showPersonalProfile();
            }

            // Não fechar o menu ao trocar de aba (comportamento esperado)
        });
    });

    // Função para carregar clientes da empresa
    async function loadEmpresaClients() {
        try {
            const response = await fetch(`${env.API_URL}/api/business/team`, {
                method: 'GET',
                headers: env.HEADERS
            });

            if (response.ok) {
                const clients = await response.json();
                console.log('Clientes da empresa:', clients);
                // TODO: Renderizar lista de clientes na interface quando necessário
            } else if (response.status === 403) {
                console.log('Usuário não tem conta empresarial');
                alert('Você precisa de uma conta empresarial para acessar esta funcionalidade.');
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    // Função para mostrar perfil pessoal
    function showPersonalProfile() {
        // Garantir que o handle continue mostrando o @ quando voltar para Perfis
        const sidebarHandle = document.getElementById('sidebar-profile-handle');
        if (sidebarHandle && SELECTORS.profileSlugInput?.value) {
            sidebarHandle.textContent = `@${SELECTORS.profileSlugInput.value}`;
        } else if (sidebarHandle) {
            // Se não tiver slug no input, buscar dos dados do perfil
            const profileData = window.lastProfileData;
            if (profileData?.details?.profile_slug) {
                sidebarHandle.textContent = `@${profileData.details.profile_slug}`;
            }
        }
    }

    // Botões de informações
    // Event listeners para os botões de formato de avatar
    document.querySelectorAll('.avatar-format-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const format = btn.dataset.format;
            if (format) {
                env.updateAvatarFormatSelector(format);
                await saveAvatarFormat(format);
            }
        });
    });

    // Botão de copiar link do Instagram
    document.getElementById('btn-copy-slug')?.addEventListener('click', async () => {
        const slugInput = document.getElementById('profileSlug');
        if (!slugInput || !slugInput.value) {
            alert('Por favor, preencha o @ do perfil primeiro.');
            return;
        }

        // URL curta: cnking.bio/{slug} (formato curto para Instagram)
        const shortUrl = `https://cnking.bio/${slugInput.value}`;

        try {
            await navigator.clipboard.writeText(shortUrl);
            const btn = document.getElementById('btn-copy-slug');
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> <span>Copiado!</span>';
                btn.style.background = 'var(--dourado-principal)';
                btn.style.color = 'var(--preto-fundo)';

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
            }
        } catch (error) {
            console.error('Erro ao copiar:', error);
            // Fallback para navegadores antigos
            const textArea = document.createElement('textarea');
            textArea.value = shortUrl;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Link copiado! Cole no seu perfil do Instagram.');
            } catch (err) {
                alert('Erro ao copiar. O link é: ' + shortUrl);
            }
            document.body.removeChild(textArea);
        }
    });


    // Função para mostrar/esconder seções de configuração
    function showConfigSection(sectionName) {
        const expandedContent = SELECTORS.configExpandedContent;
        if (!expandedContent) return;

        // Mostrar o conteúdo expandido
        expandedContent.style.display = 'block';

        // Esconder todas as seções primeiro
        const allSections = expandedContent.querySelectorAll('[data-section]');
        allSections.forEach(section => {
            section.style.display = 'none';
        });

        // Mostrar a seção solicitada
        const targetSection = expandedContent.querySelector(`[data-section="${sectionName}"]`);
        if (targetSection) {
            targetSection.style.display = 'block';

            // Scroll suave para a seção
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        // Remover destaque de todos os botões
        const allConfigButtons = document.querySelectorAll('.config-option-btn');
        allConfigButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Destacar o botão clicado
        const clickedButton = document.getElementById(`btn-config-${sectionName}`);
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
    }

    // Event listeners para botões de configuração
    SELECTORS.btnConfigCores?.addEventListener('click', (e) => {
        e.preventDefault();
        showConfigSection('cores');
    });

    SELECTORS.btnConfigFundo?.addEventListener('click', (e) => {
        e.preventDefault();
        showConfigSection('fundo');
    });

    SELECTORS.btnConfigLogoSpacing?.addEventListener('click', (e) => {
        e.preventDefault();
        showConfigSection('logo-spacing');
    });

    SELECTORS.btnConfigCabecalho?.addEventListener('click', (e) => {
        e.preventDefault();
        // Por enquanto, mostrar mensagem ou criar seção de cabeçalho
        // Como não há seção de cabeçalho ainda, vamos criar uma básica
        const expandedContent = SELECTORS.configExpandedContent;
        if (expandedContent) {
            expandedContent.style.display = 'block';
            // Verificar se já existe seção de cabeçalho
            let cabecalhoSection = expandedContent.querySelector('[data-section="cabecalho"]');
            if (!cabecalhoSection) {
                // Criar seção básica de cabeçalho
                cabecalhoSection = document.createElement('div');
                cabecalhoSection.setAttribute('data-section', 'cabecalho');
                const currentShareImage = window.currentProfileData?.details?.share_image_url || '';
                cabecalhoSection.innerHTML = `
                    <h4><i class="fas fa-share-alt"></i> Imagem de compartilhamento</h4>
                    <p style="color: var(--text-dark, #999); font-size: 0.9rem; margin-bottom: 15px;">
                        Esta imagem aparecerá quando você compartilhar o link do seu cartão nas redes sociais.
                    </p>
                    <div class="input-group" style="margin-top: 20px;">
                        <label>Proporção da Imagem</label>
                        <div class="aspect-ratio-selector">
                            <input type="radio" id="share-aspect-auto" name="share-aspect-ratio-selector" value="auto" checked>
                            <label for="share-aspect-auto">Automática</label>
                            <input type="radio" id="share-aspect-16-9" name="share-aspect-ratio-selector" value="16:9">
                            <label for="share-aspect-16-9">16:9</label>
                            <input type="radio" id="share-aspect-4-3" name="share-aspect-ratio-selector" value="4:3">
                            <label for="share-aspect-4-3">4:3</label>
                            <input type="radio" id="share-aspect-1-1" name="share-aspect-ratio-selector" value="1:1">
                            <label for="share-aspect-1-1">1:1</label>
                        </div>
                    </div>
                    <div class="input-group" style="margin-top: 20px;">
                        <label>Imagem de Compartilhamento (Clique para enquadrar)</label>
                        <div class="image-upload-area share-image-upload" style="position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                            <div class="image-preview">
                                ${currentShareImage ? `<img src="${currentShareImage}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">` : `
                                <div class="preview-placeholder">
                                    <i class="fas fa-image"></i>
                                    <span>Preview</span>
                                </div>
                                `}
                            </div>
                            <div class="upload-info" style="margin-top: 10px;">
                                <span class="upload-text">${currentShareImage ? 'Alterar Imagem' : 'Adicionar Imagem'}</span>
                                <small>Enquadre na proporção escolhida</small>
                            </div>
                            <input type="file" class="share-image-file-input" accept="image/*" style="display: none;">
                            <div class="upload-loader" style="display: none;"></div>
                        </div>
                    </div>
                    ${currentShareImage ? `
                    <div class="input-group" style="margin-top: 15px;">
                        <button type="button" class="btn btn-danger" id="remove-share-image-btn" style="width: 100%;">
                            <i class="fas fa-trash"></i> Remover Imagem
                        </button>
                    </div>
                    ` : ''}
                `;
                expandedContent.appendChild(cabecalhoSection);

                // Event listeners para upload de imagem de compartilhamento
                const shareImageUpload = cabecalhoSection.querySelector('.share-image-upload');
                const shareImageInput = cabecalhoSection.querySelector('.share-image-file-input');

                if (shareImageUpload && shareImageInput) {
                    shareImageUpload.addEventListener('click', () => {
                        shareImageInput.click();
                    });

                    shareImageInput.addEventListener('change', async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        // Obter proporção selecionada
                        const selectedRatio = cabecalhoSection.querySelector('input[name="share-aspect-ratio-selector"]:checked')?.value || 'auto';

                        // Abrir cropper
                        env.openCropper(file, 'share-image', null, selectedRatio);
                    });
                }

                // Event listener para remover imagem
                const removeShareImageBtn = cabecalhoSection.querySelector('#remove-share-image-btn');
                if (removeShareImageBtn) {
                    removeShareImageBtn.addEventListener('click', async () => {
                        if (confirm('Tem certeza que deseja remover a imagem de compartilhamento?')) {
                            try {
                                const response = await fetch(`${env.API_URL}/api/profile/share-image`, {
                                    method: 'PUT',
                                    headers: env.HEADERS,
                                    body: JSON.stringify({ share_image_url: null })
                                });

                                if (response.ok) {
                                    alert('Imagem removida com sucesso!');
                                    // Recarregar dados
                                    await env.fetchProfileData(true);
                                    // Reabrir seção
                                    SELECTORS.btnConfigCabecalho?.click();
                                } else {
                                    throw new Error('Erro ao remover imagem');
                                }
                            } catch (error) {
                                console.error('Erro ao remover imagem:', error);
                                alert('Erro ao remover imagem. Tente novamente.');
                            }
                        }
                    });
                }
            }
            // Esconder outras seções
            const allSections = expandedContent.querySelectorAll('[data-section]');
            allSections.forEach(section => {
                section.style.display = 'none';
            });
            cabecalhoSection.style.display = 'block';

            // Scroll suave
            setTimeout(() => {
                cabecalhoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

            // Remover destaque de todos os botões
            const allConfigButtons = document.querySelectorAll('.config-option-btn');
            allConfigButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            // Destacar o botão clicado
            SELECTORS.btnConfigCabecalho?.classList.add('active');
        }
    });

    // Temas removidos - usando apenas tema oficial padrão

    // Botão Ver Cartão - abre página pública
    document.getElementById('btn-ver-monocard')?.addEventListener('click', () => {
        const profileSlug = SELECTORS.profileSlugInput?.value || '';
        if (profileSlug) {
            // Construir URL pública correta: tag.conectaking.com.br/{slug}
            const publicUrl = `https://tag.conectaking.com.br/${profileSlug}`;
            window.open(publicUrl, '_blank');
        } else {
            alert('Configure seu @ primeiro para visualizar o cartão público.');
        }
    });

    // Botão desfazer alterações foi removido
    SELECTORS.closeEditModalBtn.addEventListener('click', () => {
        SELECTORS.editItemModal.classList.remove('active');
    });

    SELECTORS.editItemModal.addEventListener('click', e => {
        if (e.target === SELECTORS.editItemModal) {
            SELECTORS.editItemModal.classList.remove('active');
        }

        // NOTA: Handlers para logo-upload-area e remove-logo-btn foram movidos para editModalBody
        // (linha ~8081) para evitar duplicação de eventos, já que editModalBody está dentro de editItemModal.
        // Isso corrige o problema onde o diálogo de seleção de arquivo abria duas vezes.
    });

    SELECTORS.saveEditModalBtn.addEventListener('click', async () => {
        const itemId = SELECTORS.editItemModal.dataset.editingId;
        const isNewItem = SELECTORS.editItemModal.dataset.isNewItem === 'true';
        const itemType = SELECTORS.editItemModal.dataset.itemType;

        if (!itemId) return;

        // NÃO deve mais haver itens novos sendo salvos aqui, mas mantemos para compatibilidade
        if (isNewItem) {
            console.warn('Tentativa de salvar item novo via modal - isso não deveria acontecer');
            SELECTORS.editItemModal.classList.remove('active');
            return;
        }

        // Para item existente, sincronizar dados do modal para o item LOCALMENTE (não salvar no servidor ainda)
        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            SELECTORS.editItemModal.classList.remove('active');
            return;
        }

        // IMPORTANTE: Botão "OK" salva APENAS localmente (frontend)
        // O botão "Publicar alterações" é que salva no servidor
        console.log(`Y' [OK] Salvando alterações do item ${itemId} apenas localmente (não no servidor ainda)...`);

        // Sincronizar dados do modal para o item no DOM
        syncModalDataToItem();

        // Atualizar preview local
        env.updateLivePreviewFromForm();

        // Fechar modal
        SELECTORS.editItemModal.classList.remove('active');

        console.log(`Alterações do item ${itemId} salvas localmente. Clique em "Publicar alterações" para salvar no servidor.`);

        return; // Retornar cedo para não executar o código antigo abaixo

        const itemTypeExisting = itemEl.dataset.itemType;

        const newTitle = document.getElementById('edit-title')?.value;

        if (newTitle !== undefined && itemEl.querySelector('.item-title-input')) {
            itemEl.querySelector('.item-title-input').value = newTitle;
            const disp = itemEl.querySelector('.item-display-title');
            if (disp) disp.textContent = newTitle;
        }

        // Banner: aplicar mudanças locais (nome, link, imagem, mensagem) antes do save-all
        if (itemTypeExisting === 'banner') {
            const nameInputModal = document.getElementById('edit-banner-name');
            const destInputModal = document.getElementById('edit-dest-url');
            const msgInputModal = document.getElementById('edit-banner-title');
            const imageInputModal = document.getElementById('edit-image-url');

            const nameInputList = itemEl.querySelector('.item-banner-name-input');
            const destInputList = itemEl.querySelector('.item-destination-url-input');
            const msgHiddenList = itemEl.querySelector('.item-title-input-hidden');
            const imageInputList = itemEl.querySelector('.item-image-url-input');
            const thumbList = itemEl.querySelector('.banner-preview-thumb');
            const displayDest = itemEl.querySelector('.item-display-dest');

            const newName = nameInputModal?.value?.trim() || '';
            const newDest = destInputModal?.value?.trim() || '';
            const newMsg = msgInputModal?.value?.trim() || '';
            const newImg = imageInputModal?.value?.trim() || '';

            if (nameInputList) nameInputList.value = newName;
            if (destInputList) destInputList.value = newDest;
            if (msgHiddenList) msgHiddenList.value = newMsg;
            if (imageInputList) imageInputList.value = newImg;
            if (thumbList && newImg) {
                thumbList.src = newImg;
                thumbList.style.display = 'block';
            }
            if (displayDest) {
                displayDest.textContent = newDest || 'Sem destino';
            }
        }

        if ([
            'link', 'whatsapp', 'telegram', 'email', 'facebook', 'instagram',
            'pinterest', 'reddit', 'tiktok', 'twitch', 'twitter', 'youtube', 'linkedin', 'portfolio',
            'instagram_embed', 'youtube_embed', 'tiktok_embed', 'spotify_embed', 'linkedin_embed', 'pinterest_embed', 'spotify'
        ].includes(itemTypeExisting)) {
            const newDestUrl = document.getElementById('edit-dest-url')?.value || '';
            const destInput = itemEl.querySelector('.item-destination-url-input');
            const destDisplay = itemEl.querySelector('.item-display-dest');
            if (destInput) destInput.value = newDestUrl;
            if (destDisplay) destDisplay.textContent = newDestUrl || '#';

            // Para carrossel, atualizar array de imagens
            if (itemTypeExisting === 'carousel') {
                const jsonInput = SELECTORS.editModalBody.querySelector('.carousel-images-json-input');
                const imageInput = itemEl.querySelector('.item-image-url-input');
                const jsonInputInModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .carousel-images-json-input`);
                const jsonInputToUse = jsonInputInModal || jsonInput;

                if (jsonInputToUse && jsonInputToUse.value) {
                    try {
                        const images = JSON.parse(jsonInputToUse.value);
                        if (Array.isArray(images) && images.length > 0) {
                            const jsonInputInItem = itemEl.querySelector('.carousel-images-json-input');
                            if (jsonInputInItem) {
                                jsonInputInItem.value = JSON.stringify(images);
                            }

                            // Atualizar image_url (primeira imagem)
                            const firstImg = typeof images[0] === 'string' ? images[0] : (images[0].image_url || images[0]);
                            if (imageInput) {
                                imageInput.value = firstImg;
                            }

                            // Atualizar contador no display
                            const displayDest = itemEl.querySelector('.item-display-dest');
                            if (displayDest) {
                                displayDest.textContent = `${images.length} imagem${images.length !== 1 ? 'ns' : ''}`;
                            }

                            // Renderizar lista atualizada
                            env.renderCarouselImagesNew(itemId, images);
                        }
                    } catch (e) {
                        console.error('Erro ao atualizar carrossel:', e);
                    }
                }
            }

            // Para link personalizado, também atualizar image_url, logo_size e icon_class se houver
            if (itemTypeExisting === 'link') {
                const modalImageUrlInput = document.getElementById('edit-link-image-url') ||
                    SELECTORS.editModalBody.querySelector('.item-image-url-input') ||
                    document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-image-url-input`);
                const itemImageUrlInput = itemEl.querySelector('.item-image-url-input');
                const modalLogoSizeInput = document.getElementById(`edit-logo-size-input-${itemId}`) ||
                    SELECTORS.editModalBody.querySelector('.item-logo-size-input');
                const itemLogoSizeInput = itemEl.querySelector('.item-logo-size-input');

                if (modalImageUrlInput) {
                    const imageUrlValue = modalImageUrlInput.value || '';
                    if (itemImageUrlInput) itemImageUrlInput.value = imageUrlValue;

                    // Atualizar preview do logo no item
                    const logoPreview = itemEl.querySelector('.item-logo-preview');
                    const iconPicker = itemEl.querySelector('.item-icon-picker');
                    if (imageUrlValue && imageUrlValue.trim() && !imageUrlValue.includes('placeholder')) {
                        if (logoPreview) {
                            logoPreview.src = imageUrlValue;
                            logoPreview.style.display = 'block';
                        }
                        if (iconPicker) iconPicker.style.display = 'none';
                    } else {
                        if (logoPreview) logoPreview.style.display = 'none';
                        if (iconPicker) iconPicker.style.display = 'inline-block';
                    }
                }

                // Atualizar tamanho da logo (salvar no dataset, mas NÃO aplicar na lista)
                if (modalLogoSizeInput) {
                    const logoSizeValue = parseInt(modalLogoSizeInput.value) || 24;
                    if (itemLogoSizeInput) {
                        itemLogoSizeInput.value = logoSizeValue;
                    }
                    // NÃO atualizar logo na lista - ela deve permanecer fixa (40px)
                    // O tamanho só aplica no cartão público (profile.ejs)
                    itemEl.dataset.logoSize = logoSizeValue;
                }

                // Atualizar icon_class do modal também se houver
                const modalIconPicker = SELECTORS.editModalBody.querySelector('.item-icon-picker');
                if (modalIconPicker) {
                    const iconElement = modalIconPicker.querySelector('i');
                    const itemIconPicker = itemEl.querySelector('.item-icon-picker');
                    if (itemIconPicker && iconElement) {
                        itemIconPicker.innerHTML = `<i class="${iconElement.className}"></i>`;
                    }
                }
            }

        }
        else if (itemTypeExisting === 'pix' || itemTypeExisting === 'pix_qrcode') {
            const newPixKey = document.getElementById('edit-pix-key').value;
            const newRecipientName = document.getElementById('edit-recipient-name')?.value;
            const newPixAmount = document.getElementById('edit-pix-amount')?.value;
            const newPixDescription = document.getElementById('edit-pix-description')?.value;

            itemEl.querySelector('.item-pix-key-input').value = newPixKey;
            itemEl.querySelector('.item-display-dest').textContent = newPixKey;

            if (newRecipientName) {
                itemEl.querySelector('.item-recipient-name-input').value = newRecipientName;
            }
            if (newPixAmount) {
                itemEl.querySelector('.item-pix-amount-input').value = newPixAmount;
            }
            if (newPixDescription) {
                itemEl.querySelector('.item-pix-description-input').value = newPixDescription;
            }
        } else if (itemTypeExisting === 'carousel') {
            // Salvar carrossel - atualizar JSON de imagens
            const jsonInput = SELECTORS.editModalBody.querySelector('.carousel-images-json-input');
            const imageInput = SELECTORS.editModalBody.querySelector('#edit-image-url');

            if (jsonInput && jsonInput.value) {
                try {
                    const images = JSON.parse(jsonInput.value);
                    const itemJsonInput = itemEl.querySelector('.carousel-images-json-input');
                    const itemImageInput = itemEl.querySelector('.item-image-url-input');
                    const displayDest = itemEl.querySelector('.item-display-dest');

                    if (itemJsonInput) itemJsonInput.value = jsonInput.value;
                    if (itemImageInput && images.length > 0) {
                        const firstImg = typeof images[0] === 'string' ? images[0] : (images[0].image_url || images[0]);
                        itemImageInput.value = firstImg;
                    }
                    if (displayDest) {
                        displayDest.textContent = `${images.length} imagem${images.length !== 1 ? 'ns' : ''}`;
                    }
                } catch (e) {
                    console.error('Erro ao salvar carrossel:', e);
                }
            }
        } else if (itemTypeExisting === 'pdf' || itemTypeExisting === 'pdf_embed') {
            const newPdfUrl = document.getElementById('edit-pdf-url').value;
            itemEl.querySelector('.item-pdf-url-input').value = newPdfUrl;
            itemEl.querySelector('.item-display-dest').textContent = newPdfUrl;
            if (logoSizeInput) logoSizeInput.value = newLogoSize;
            if (displayTitle) displayTitle.textContent = newTitle;

            // Atualizar preview do logo se houver
            if (newImageUrl && newImageUrl.trim() && !newImageUrl.includes('placeholder')) {
                if (logoPreview) {
                    logoPreview.src = newImageUrl;
                    logoPreview.style.display = 'block';
                    const logoSizeFixed = Math.min(newLogoSize, 40);
                    const isPng = newImageUrl.includes('.png');
                    logoPreview.style.width = `${logoSizeFixed}px`;
                    logoPreview.style.height = `${logoSizeFixed}px`;
                    logoPreview.style.objectFit = isPng ? 'contain' : 'cover';
                    logoPreview.style.borderRadius = isPng ? '0' : '50%';
                    if (iconPicker) iconPicker.style.display = 'none';
                }
            } else {
                if (logoPreview) logoPreview.style.display = 'none';
                if (iconPicker) iconPicker.style.display = 'inline-block';
            }
        } else if (itemTypeExisting === 'banner') {
            // Verificar se é carrossel (tem input hidden com JSON)
            const hiddenInput = document.getElementById('edit-dest-url-hidden');
            const destUrlInput = document.getElementById('edit-dest-url');
            const imageUrlInput = document.getElementById('edit-image-url');

            if (hiddenInput && hiddenInput.value && hiddenInput.value.trim() !== '' && hiddenInput.value.startsWith('[')) {
                // ? carrossel - usar o input hidden
                try {
                    const images = JSON.parse(hiddenInput.value);
                    if (Array.isArray(images) && images.length > 0) {
                        const destInputEl = itemEl.querySelector('.item-destination-url-input');
                        const imageInputEl = itemEl.querySelector('.item-image-url-input');

                        if (destInputEl) destInputEl.value = hiddenInput.value;

                        // Extrair image_url do primeiro objeto ou string
                        const firstImg = images[0];
                        const imageUrl = typeof firstImg === 'object' ? (firstImg.image_url || firstImg) : firstImg;

                        if (imageInputEl) imageInputEl.value = imageUrl;

                        const previewThumb = itemEl.querySelector('.banner-preview-thumb');
                        if (previewThumb) {
                            previewThumb.src = imageUrl;
                            previewThumb.style.display = 'block';
                        }

                        const displayDest = itemEl.querySelector('.item-display-dest');
                        if (displayDest) {
                            displayDest.textContent = `Carrossel (${images.length} fotos)`;
                        }

                        itemEl.classList.add('banner-carousel');
                    }
                } catch (e) {
                    console.log('Erro ao processar carrossel:', e);
                }
            } else if (destUrlInput) {
                // Banner normal - usar o input de destino
                const newDestUrl = destUrlInput.value.trim() || '#';
                const destInputEl = itemEl.querySelector('.item-destination-url-input');

                console.log('Modal Banner - Salvando destination_url:', {
                    itemId,
                    newDestUrl,
                    hasDestInputEl: !!destInputEl,
                    destInputElCurrentValue: destInputEl?.value
                });

                if (destInputEl) {
                    destInputEl.value = newDestUrl;
                    console.log('Modal Banner - destination_url atualizado no item:', destInputEl.value);
                }

                // Atualizar imagem se houver
                if (imageUrlInput && imageUrlInput.value) {
                    const imageInputEl = itemEl.querySelector('.item-image-url-input');
                    if (imageInputEl) {
                        imageInputEl.value = imageUrlInput.value;
                    }
                    const previewThumb = itemEl.querySelector('.banner-preview-thumb');
                    if (previewThumb) {
                        previewThumb.src = imageUrlInput.value;
                        previewThumb.style.display = 'block';
                    }
                }

                // Atualizar display
                const displayDest = itemEl.querySelector('.item-display-dest');
                if (displayDest) {
                    displayDest.textContent = newDestUrl && newDestUrl !== '#' ? newDestUrl : 'Sem destino';
                    console.log('Modal Banner - Display atualizado:', displayDest.textContent);
                }

                itemEl.classList.remove('banner-carousel');
            }

            const selectedRatioInput = document.querySelector('input[name="aspect-ratio-selector"]:checked');
            if (selectedRatioInput) {
                const newAspectRatio = selectedRatioInput.value;
                itemEl.dataset.aspectRatio = newAspectRatio;
            }
        }

        // Sincronizar dados do modal para o item antes de salvar
        syncModalDataToItem();

        // Salvar automaticamente quando clicar em "Salvar Alterações" do modal
        try {
            await env.saveAllChanges();
            SELECTORS.editItemModal.classList.remove('active');
            env.updateLivePreviewFromForm();
            console.log('Alterações salvas com sucesso via modal');
        } catch (error) {
            console.error('Erro ao salvar via modal:', error);
            alert(`Erro ao salvar: ${error.message}`);
            // Não fechar o modal se houver erro
        }
    });

    SELECTORS.editModalBody.addEventListener('click', e => {
        const uploadArea = e.target.closest('.image-upload-area');
        const logoUploadArea = e.target.closest('.logo-upload-area');
        const removeLogoBtn = e.target.closest('.remove-logo-btn');

        if (uploadArea) {
            const fileInput = uploadArea.querySelector('.item-file-input');
            if (fileInput) {
                fileInput.click();
            }
        }

        if (logoUploadArea && !removeLogoBtn) {
            const fileInput = logoUploadArea.querySelector('.item-logo-file-input');
            if (fileInput) {
                fileInput.click();
            }
        }

        if (removeLogoBtn) {
            const logoUploadArea = removeLogoBtn.closest('.logo-upload-area');
            const preview = logoUploadArea.querySelector('.item-logo-upload-preview');
            const uploadText = logoUploadArea.querySelector('.logo-upload-text');
            const imageUrlInput = document.getElementById('edit-link-image-url') ||
                document.getElementById('edit-catalog-image-url') ||
                logoUploadArea.closest('.input-group')?.querySelector('.item-image-url-input') ||
                SELECTORS.editModalBody.querySelector('.item-image-url-input');

            if (confirm('Tem certeza que deseja remover a logo? O ícone será usado como fallback.')) {
                if (preview) {
                    preview.src = '';
                    preview.style.display = 'none';
                }
                if (uploadText) uploadText.style.display = '';
                if (removeLogoBtn) removeLogoBtn.style.display = 'none';
                if (imageUrlInput) imageUrlInput.value = '';

                // Esconder campo de tamanho da logo ao remover
                const logoSizeGroup = logoUploadArea.closest('.input-group')?.nextElementSibling;
                if (logoSizeGroup && logoSizeGroup.querySelector('.item-logo-size-input')) {
                    logoSizeGroup.style.display = 'none';
                }
            }
        }
    });

    // Event listener único para upload de logo (evitar duplicação)
    try {
        if (SELECTORS.editModalBody && !SELECTORS.editModalBody.dataset.logoUploadListenerAdded) {
            SELECTORS.editModalBody.dataset.logoUploadListenerAdded = 'true';

            SELECTORS.editModalBody.addEventListener('change', async function (e) {
                if (!e.target.classList.contains('item-logo-file-input')) return;

                const fileInput = e.target;
                const file = fileInput.files[0];
                if (!file) {
                    fileInput.dataset.uploading = 'false';
                    return;
                }

                // Prevenir processamento duplicado
                if (fileInput.dataset.processing === 'true') {
                    console.log('Logo já está sendo processado, ignorando');
                    return;
                }
                fileInput.dataset.processing = 'true';

                // Validar tipo e tamanho
                if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                    alert('Apenas PNG ou JPG são permitidas.');
                    fileInput.value = '';
                    fileInput.dataset.uploading = 'false';
                    fileInput.dataset.processing = 'false';
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    alert('Máximo 5MB.');
                    fileInput.value = '';
                    fileInput.dataset.uploading = 'false';
                    fileInput.dataset.processing = 'false';
                    return;
                }

                const logoUploadArea = fileInput.closest('.logo-upload-area');
                const preview = logoUploadArea?.querySelector('.item-logo-upload-preview');
                const uploadText = logoUploadArea?.querySelector('.logo-upload-text');
                const removeBtn = logoUploadArea?.querySelector('.remove-logo-btn');
                const loader = logoUploadArea?.querySelector('.upload-loader');

                if (!logoUploadArea) return;

                if (loader) loader.style.display = 'block';

                try {
                    // Obter autorização de upload
                    const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, {
                        method: 'POST',
                        headers: env.HEADERS
                    });
                    if (!authResponse.ok) throw new Error('Falha na autorização');
                    const { uploadURL } = await authResponse.json();

                    // Fazer upload
                    const formData = new FormData();
                    formData.append('file', file);
                    const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: env.getAuthHeaders(), body: formData });
                    if (!uploadResponse.ok) throw new Error('Falha no upload');

                    const uploadData = await uploadResponse.json();
                    const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                    const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
                    if (!finalUrl) throw new Error('Resposta do servidor de upload inválida. Tente novamente.');

                    // Atualizar campo hidden de image_url
                    const imageUrlInput = document.getElementById('edit-link-image-url') ||
                        document.getElementById('edit-catalog-image-url') ||
                        logoUploadArea.closest('.input-group')?.querySelector('.item-image-url-input') ||
                        SELECTORS.editModalBody.querySelector('.item-image-url-input');
                    if (imageUrlInput) {
                        imageUrlInput.value = finalUrl;
                    }

                    // Atualizar preview
                    if (preview) {
                        preview.src = finalUrl;
                        preview.style.display = 'block';
                        const logoSize = 100; // Preview máximo
                        preview.style.maxWidth = `${logoSize}px`;
                        preview.style.maxHeight = `${logoSize}px`;
                        preview.style.width = `${logoSize}px`;
                        preview.style.height = `${logoSize}px`;
                    }
                    if (uploadText) uploadText.style.display = 'none';
                    if (removeBtn) removeBtn.style.display = 'block';

                    // Atualizar item na lista (preview do item)
                    const itemId = SELECTORS.editItemModal?.dataset?.editingId;
                    if (itemId) {
                        const itemEl = document.querySelector(`[data-item-id="${itemId}"], [data-id="${itemId}"]`);
                        if (itemEl) {
                            const logoPreviewInList = itemEl.querySelector('.item-logo-preview');
                            const iconPickerInList = itemEl.querySelector('.item-icon-picker');
                            if (logoPreviewInList) {
                                logoPreviewInList.src = finalUrl;
                                logoPreviewInList.style.display = 'block';
                            }
                            if (iconPickerInList) {
                                iconPickerInList.style.display = 'none';
                            }
                            // Atualizar dataset do item
                            itemEl.dataset.imageUrl = finalUrl;
                            // Atualizar input hidden do item na lista se existir
                            const imageUrlInputInList = itemEl.querySelector('.item-image-url-input');
                            if (imageUrlInputInList) {
                                imageUrlInputInList.value = finalUrl;
                            }
                        }
                    }

                    // Atualizar preview ao vivo imediatamente
                    env.updateLivePreviewFromForm();

                    // Mostrar campo de tamanho da logo se ainda não estiver visível
                    const logoSizeGroup = logoUploadArea.closest('.input-group')?.nextElementSibling;
                    if (logoSizeGroup && logoSizeGroup.querySelector('.item-logo-size-input')) {
                        logoSizeGroup.style.display = 'block';
                    } else {
                        // Criar campo de tamanho dinamicamente se não existir
                        const itemId = SELECTORS.editItemModal.dataset.editingId;
                        const itemType = SELECTORS.editItemModal.dataset.itemType;
                        const currentLogoSize = 24;

                        // Não criar slider para catálogo - logo size foi removido
                        if (itemType === 'link') {
                            // Apenas para link personalizado
                            const sliderId = `edit-logo-size-slider-${itemId}`;
                            const inputId = `edit-logo-size-input-${itemId}`;
                            const valueSpanId = `edit-logo-size-value-${itemId}`;

                            const logoSizeHTML = `
                <div class="input-group" style="display: block;">
                    <label>Tamanho da Logo (em pixels)</label>
                    <div class="range-slider" style="margin-bottom: 15px;">
                        <div class="range-slider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <label style="margin: 0; color: var(--text, #ECECEC);">Tamanho: <span id="${valueSpanId}">${currentLogoSize}</span>px</label>
                            <input type="number" class="item-logo-size-input" id="${inputId}" value="${currentLogoSize}" min="20" max="600" step="1" style="width: 80px; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC); text-align: center;">
                        </div>
                        <input type="range" class="item-logo-size-slider" id="${sliderId}" value="${currentLogoSize}" min="20" max="600" step="5" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-dark, #A1A1A1);">
                            <span>20px</span>
                            <span>600px</span>
                        </div>
                    </div>
                </div>
            `;
                            logoUploadArea.closest('.input-group')?.insertAdjacentHTML('afterend', logoSizeHTML);

                            // Adicionar event listener ao slider
                            const slider = document.getElementById(sliderId);
                            const numberInput = document.getElementById(inputId);
                            const valueSpan = document.getElementById(valueSpanId);
                            if (slider && numberInput && valueSpan) {
                                slider.addEventListener('input', () => {
                                    const value = slider.value;
                                    numberInput.value = value;
                                    valueSpan.textContent = value;
                                });
                                numberInput.addEventListener('input', () => {
                                    const value = numberInput.value;
                                    slider.value = value;
                                    valueSpan.textContent = value;
                                    // Atualizar preview ao vivo quando o tamanho mudar
                                    env.updateLivePreviewFromForm();
                                });
                                slider.addEventListener('input', () => {
                                    const value = slider.value;
                                    numberInput.value = value;
                                    valueSpan.textContent = value;
                                    // Atualizar preview ao vivo quando o tamanho mudar
                                    env.updateLivePreviewFromForm();
                                });
                            }
                        }
                    }

                } catch (error) {
                    console.error('Erro no upload da logo:', error);
                    alert('Erro ao fazer upload da logo. Tente novamente.');
                } finally {
                    if (loader) loader.style.display = 'none';
                    fileInput.value = ''; // Resetar input para permitir selecionar o mesmo arquivo novamente
                    fileInput.dataset.uploading = 'false';
                    fileInput.dataset.processing = 'false';
                }
            }); // Fechar addEventListener
        } // Fechar if do logoUploadListenerAdded
    } catch (error) {
        console.error('Erro ao configurar listener de logo:', error);
        // Não impedir o carregamento se houver erro aqui
    }


    // Event listener para remover imagens do carrossel
    SELECTORS.editModalBody.addEventListener('click', e => {
        // Com label, não precisamos mais do fallback de clique
        // Mas vamos manter para debug caso o label não funcione
        // ===== NOVO CARROSSEL - Remover imagem =====
        if (e.target.closest('.remove-carousel-new')) {
            const btn = e.target.closest('.remove-carousel-new');
            const itemId = btn.dataset.itemId;
            const imageIndex = parseInt(btn.dataset.imageIndex);
            env.removeCarouselImageNew(itemId, imageIndex);
        }
    });

    // ===== NOVO CARROSSEL - UPLOAD DE IMAGENS (Event Delegation Global) =====
    document.addEventListener('change', async function carouselUploadHandler(e) {
        if (!e.target.classList.contains('carousel-file-input-new')) return;

        console.log(' [CARROSSEL] Upload iniciado');
        const fileInput = e.target;
        const itemId = fileInput.dataset.itemId || fileInput.getAttribute('data-item-id') || fileInput.id.replace('carousel-file-new-', '');

        if (!itemId) {
            console.error('[CARROSSEL] itemId não encontrado. Input:', fileInput);
            console.error('[CARROSSEL] Dataset:', fileInput.dataset);
            console.error('[CARROSSEL] ID:', fileInput.id);
            return;
        }

        const files = Array.from(fileInput.files || []);
        if (files.length === 0) {
            console.log('[CARROSSEL] Nenhum arquivo selecionado');
            return;
        }

        console.log(`[CARROSSEL] Processando ${files.length} arquivo(s) para itemId: ${itemId}`);

        // Buscar itemEl ANTES de qualquer operação assíncrona - com try/catch para segurança extra
        let itemEl = null;
        try {
            itemEl = document.querySelector(`.item[data-id="${itemId}"], .module-item[data-id="${itemId}"]`);
        } catch (err) {
            console.error('[CARROSSEL] Erro ao buscar itemEl:', err);
            alert('Erro ao localizar o item do carrossel. Recarregue a página e tente novamente.');
            return;
        }

        if (!itemEl) {
            console.error(`[CARROSSEL] Item não encontrado para id: ${itemId}`);
            alert('Erro: Item do carrossel não encontrado. Recarregue a página e tente novamente.');
            return;
        }

        const uploadLabel = fileInput.closest('.carousel-upload-label-new');
        const loader = uploadLabel?.querySelector('.carousel-upload-loader-new');
        if (loader) loader.style.display = 'block';
        if (uploadLabel) uploadLabel.style.opacity = '0.6';

        try {
            console.log('[CARROSSEL] Solicitando autorização...');
            const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: env.HEADERS
            });
            if (!authResponse.ok) throw new Error('Falha na autorização');
            const { uploadURL } = await authResponse.json();
            console.log('[CARROSSEL] Autorização obtida');

            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
            const uploadedImages = [];

            for (const file of files) {
                if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                    alert(`${file.name}: Apenas PNG ou JPG são permitidas.`);
                    continue;
                }
                if (file.size > 5 * 1024 * 1024) {
                    alert(`${file.name}: Máximo 5MB.`);
                    continue;
                }

                console.log(`[CARROSSEL] Enviando ${file.name}...`);
                const formData = new FormData();
                formData.append('file', file);
                // uploadURL pode ser /api/upload/receive-one (R2) e exige Authorization
                const uploadHeaders = env.getAuthHeaders();
                const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: uploadHeaders, body: formData });
                if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    throw new Error(`Falha no upload de ${file.name}: ${uploadResponse.status}`);
                }

                const uploadData = await uploadResponse.json();
                // R2 devolve { success: true, url, imageUrl }; Cloudflare devolve { result: { id } }
                const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && accountHash ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
                if (finalUrl) {
                    uploadedImages.push(finalUrl);
                    console.log(`[CARROSSEL] ${file.name} enviado: ${finalUrl.substring(0, 50)}...`);
                } else {
                    console.warn('[CARROSSEL] Resposta sem URL:', uploadData);
                }
            }

            if (uploadedImages.length > 0) {
                console.log(`[CARROSSEL] ${uploadedImages.length} imagem(ns) enviada(s), atualizando interface...`);

                // Verificar novamente se itemEl ainda existe (pode ter sido removido do DOM)
                const currentItemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                if (!currentItemEl) {
                    console.warn('[CARROSSEL] Item não encontrado após upload. Tentando continuar...');
                }

                // Buscar inputs do modal PRIMEIRO (prioridade)
                const jsonInputModal = SELECTORS.editModalBody?.querySelector(`.carousel-images-json-new[data-item-id="${itemId}"]`);
                const jsonInputItem = currentItemEl ? currentItemEl.querySelector(`.carousel-images-json-new[data-item-id="${itemId}"]`) : null;

                // Usar o input do modal se existir, senão usar o do item
                const jsonInput = jsonInputModal || jsonInputItem;

                let existingImages = [];
                if (jsonInput && jsonInput.value) {
                    try {
                        const parsed = JSON.parse(jsonInput.value);
                        existingImages = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        console.warn('[CARROSSEL] Erro ao parsear imagens existentes:', e);
                    }
                }

                const allImages = [...existingImages, ...uploadedImages];
                const jsonValue = JSON.stringify(allImages);

                // Atualizar AMBOS os inputs (modal e item) para garantir sincronização
                if (jsonInputModal) {
                    jsonInputModal.value = jsonValue;
                    console.log('[CARROSSEL] Input JSON do modal atualizado');
                }
                if (jsonInputItem) {
                    jsonInputItem.value = jsonValue;
                    console.log('[CARROSSEL] Input JSON do item atualizado');
                }

                if (!jsonInputModal && !jsonInputItem) {
                    console.error('[CARROSSEL] Input JSON não encontrado! Procurando...');
                    console.error('Modal body:', SELECTORS.editModalBody);
                    console.error('Item el:', currentItemEl);
                }

                // Atualizar image_url - GARANTIR que currentItemEl existe antes de usar
                const firstImg = allImages[0] || '';
                const imageInputModal = SELECTORS.editModalBody?.querySelector(`#edit-image-url`);
                if (imageInputModal) imageInputModal.value = firstImg;

                if (currentItemEl) {
                    const imageInputItem = currentItemEl.querySelector('.item-image-url-input');
                    if (imageInputItem) imageInputItem.value = firstImg;

                    // Atualizar display
                    const displayDest = currentItemEl.querySelector('.item-display-dest');
                    if (displayDest) displayDest.textContent = `${allImages.length} imagem${allImages.length !== 1 ? 'ns' : ''}`;
                }

                // Renderizar IMEDIATAMENTE
                console.log('YZ [CARROSSEL] Renderizando imagens...');
                env.renderCarouselImagesNew(itemId, allImages);

                // NÃO chamar syncModalDataToItem() aqui porque já atualizamos ambos os inputs manualmente
                // syncModalDataToItem() pode sobrescrever os valores que acabamos de atualizar

                env.updateLivePreviewFromForm();
                console.log('[CARROSSEL] Upload concluído com sucesso!');
            } else {
                console.warn('[CARROSSEL] Nenhuma imagem foi enviada');
            }
        } catch (error) {
            console.error('OO[CARROSSEL] Erro no upload:', error);
            const errorMessage = error && error.message ? error.message : 'Erro desconhecido ao fazer upload';
            alert(`Erro ao fazer upload: ${errorMessage}`);
        } finally {
            if (loader) loader.style.display = 'none';
            if (uploadLabel) uploadLabel.style.opacity = '1';
            fileInput.value = '';
        }
    });

    SELECTORS.deleteModalBtn.addEventListener('click', () => {
        const itemId = SELECTORS.editItemModal.dataset.editingId;
        if (!itemId) return;

        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            console.error(`Item ${itemId} não encontrado para deletar`);
            SELECTORS.editItemModal.classList.remove('active');
            return;
        }

        // Fechar o modal primeiro
        SELECTORS.editItemModal.classList.remove('active');

        // Chamar deleteItem diretamente (já tem confirmação dentro)
        if (confirm('Tem certeza que deseja excluir este módulo?')) {
            env.deleteItem(itemId);
        }
    });
    SELECTORS.itemsContainer.addEventListener('change', async e => {
        // Handler para upload de imagens do novo módulo Carrossel
        if (e.target.classList.contains('carousel-image-file-input')) {
            const fileInput = e.target;
            const itemId = fileInput.dataset.itemId || fileInput.getAttribute('data-item-id');

            if (!itemId) {
                console.error('O itemId não encontrado no input de arquivo do carrossel (itemsContainer)');
                return;
            }

            const files = Array.from(fileInput.files || []);

            if (files.length === 0) {
                console.log('Nenhum arquivo selecionado (itemsContainer)');
                return;
            }

            console.log(`Iniciando upload de ${files.length} imagem(ns) para carrossel (itemsContainer), itemId: ${itemId}`);

            const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
            if (!itemEl) {
                console.error('O Item não encontrado para upload do carrossel (itemsContainer)');
                return;
            }

            const uploadArea = fileInput.closest('.carousel-add-image-area');
            if (!uploadArea) {
                console.error('O Área de upload não encontrada (itemsContainer)');
                return;
            }

            const loader = uploadArea.querySelector('.upload-loader');
            if (loader) {
                loader.style.display = 'block';
                loader.style.position = 'absolute';
                loader.style.top = '50%';
                loader.style.left = '50%';
                loader.style.transform = 'translate(-50%, -50%)';
                loader.style.zIndex = '1000';
            }
            uploadArea.classList.add('is-uploading');

            try {
                const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, {
                    method: 'POST',
                    headers: env.HEADERS
                });
                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                const { uploadURL } = await authResponse.json();

                const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                const uploadedImages = [];

                // Upload de múltiplas imagens
                for (const file of files) {
                    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                        alert(`${file.name}: Apenas imagens PNG ou JPG são permitidas.`);
                        continue;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        alert(`${file.name}: A imagem deve ter no máximo 5MB.`);
                        continue;
                    }

                    const formData = new FormData();
                    const originalName = file.name || 'carousel-image.jpg';
                    const fileExtension = originalName.split('.').pop() || (file.type.includes('png') ? 'png' : 'jpg');
                    const fileName = originalName.includes('.') ? originalName : `carousel-image.${fileExtension}`;
                    formData.append('file', file, fileName);

                    const uploadResponse = await fetch(uploadURL, {
                        method: 'POST',
                        headers: env.getAuthHeaders(),
                        body: formData
                    });
                    if (!uploadResponse.ok) throw new Error(`Falha no upload de ${file.name}`);

                    const uploadData = await uploadResponse.json();
                    const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && accountHash ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
                    if (finalUrl) uploadedImages.push(finalUrl);
                }

                if (uploadedImages.length > 0) {
                    console.log(`${uploadedImages.length} imagem(ns) enviada(s) com sucesso, processando...`);

                    // Obter imagens existentes - procurar tanto no modal quanto no item
                    const jsonInputModal = SELECTORS.editModalBody?.querySelector(`.carousel-images-json-input[data-item-id="${itemId}"]`);
                    const jsonInputItem = itemEl.querySelector(`.carousel-images-json-input[data-item-id="${itemId}"]`);
                    const jsonInput = jsonInputModal || jsonInputItem;

                    console.log('Inputs encontrados:', {
                        jsonInputModal: !!jsonInputModal,
                        jsonInputItem: !!jsonInputItem,
                        jsonInput: !!jsonInput
                    });

                    let existingImages = [];
                    if (jsonInput && jsonInput.value && jsonInput.value.trim()) {
                        try {
                            const parsed = JSON.parse(jsonInput.value);
                            // Remover placeholders se houver imagens reais
                            existingImages = Array.isArray(parsed) ? parsed.filter(img => {
                                const url = typeof img === 'string' ? img : (img.image_url || img);
                                return url &&
                                    !url.includes('placeholder.com') &&
                                    !url.includes('via.placeholder') &&
                                    !url.startsWith('data:image/svg+xml');
                            }) : [];
                            console.log(`Y"< [ITEMS CONTAINER] ${existingImages.length} imagem(ns) existente(s) encontrada(s) (filtrados placeholders)`);
                        } catch (e) {
                            console.warn('Erro ao parsear imagens existentes, iniciando array vazio:', e);
                            existingImages = [];
                        }
                    } else {
                        console.log('Nenhuma imagem existente encontrada, iniciando array vazio');
                    }

                    // Adicionar novas imagens
                    const allImages = [...existingImages, ...uploadedImages];
                    console.log(`Y"S Total de imagens após adicionar: ${allImages.length}`);

                    // Atualizar TODOS os inputs hidden (modal e item)
                    const jsonValue = JSON.stringify(allImages);
                    if (jsonInputModal) {
                        jsonInputModal.value = jsonValue;
                        console.log('Input JSON do modal atualizado');
                    } else {
                        console.warn('Input JSON do modal não encontrado!');
                    }

                    if (jsonInputItem) {
                        jsonInputItem.value = jsonValue;
                        console.log('Input JSON do item atualizado');
                    } else {
                        console.warn('Input JSON do item não encontrado!');
                    }

                    // Atualizar image_url (primeira imagem REAL, não placeholder) - tanto no modal quanto no item
                    const realImages = allImages.filter(img => {
                        const url = typeof img === 'string' ? img : (img.image_url || img);
                        return url &&
                            !url.includes('placeholder.com') &&
                            !url.includes('via.placeholder') &&
                            !url.startsWith('data:image/svg+xml');
                    });

                    const firstImg = realImages.length > 0
                        ? (typeof realImages[0] === 'string' ? realImages[0] : (realImages[0].image_url || realImages[0]))
                        : (allImages.length > 0 ? (typeof allImages[0] === 'string' ? allImages[0] : (allImages[0].image_url || allImages[0])) : '');

                    console.log('[ITEMS CONTAINER] Primeira imagem real selecionada:', firstImg.substring(0, 80) + '...');

                    const imageInputModal = SELECTORS.editModalBody?.querySelector(`#edit-image-url`);
                    const imageInputItem = itemEl.querySelector('.item-image-url-input');
                    if (imageInputModal) {
                        imageInputModal.value = firstImg;
                        console.log('Input image_url do modal atualizado com imagem real');
                    }
                    if (imageInputItem) {
                        imageInputItem.value = firstImg;
                        console.log('Input image_url do item atualizado com imagem real');
                    }

                    // Atualizar display no item da lista
                    const displayDest = itemEl.querySelector('.item-display-dest');
                    if (displayDest) {
                        displayDest.textContent = `${allImages.length} imagem${allImages.length !== 1 ? 'ns' : ''}`;
                        console.log('Display do item atualizado:', displayDest.textContent);
                    }

                    // Renderizar lista atualizada no modal IMEDIATAMENTE
                    console.log('YZ [ITEMS CONTAINER] Renderizando lista de imagens IMEDIATAMENTE...');
                    // Usar requestAnimationFrame para garantir que o DOM está pronto
                    requestAnimationFrame(() => {
                        env.renderCarouselImagesNew(itemId, allImages);
                        setTimeout(() => {
                            env.updateLivePreviewFromForm();
                        }, 100);
                    });

                    console.log(`[ITEMS CONTAINER] ${uploadedImages.length} imagem(ns) adicionada(s) com sucesso! Total: ${allImages.length}`);
                } else {
                    console.warn('Nenhuma imagem foi enviada com sucesso');
                }
            } catch (error) {
                console.error('Erro no upload do carrossel:', error);
                alert(`Erro ao fazer upload: ${error.message}`);
            } finally {
                if (loader) loader.style.display = 'none';
                if (uploadArea) uploadArea.classList.remove('is-uploading');
                // Resetar input para permitir selecionar os mesmos arquivos novamente
                fileInput.value = '';
            }
            return;
        }
    }, true); // Use capture para garantir que o evento seja capturado

    SELECTORS.itemsContainer.addEventListener('change', async e => {
        if (e.target.classList.contains('item-file-input') && e.target.closest('.banner-item, .wifi-banner-upload-area')) {
            const file = e.target.files[0];
            if (file) {
                const itemEl = e.target.closest('.item, .module-item');
                if (!itemEl) return;
                const uploadType = e.target.dataset.itemType || e.target.closest('.image-upload-area')?.dataset?.itemType;
                const modType = itemEl.dataset?.itemType;
                const trigger = (uploadType === 'wifi-banner' || modType === 'wifi') ? 'wifi-banner' : 'banner';
                env.openCropper(file, trigger, itemEl);
                e.target.value = '';
            }
        }
        else if (e.target.closest('.pdf-upload-area')) {
            const fileInput = e.target;
            const file = fileInput.files[0];
            if (!file) return;

            const itemEl = fileInput.closest('.item');
            const urlInput = itemEl.querySelector('.item-pdf-url-input');
            const uploadArea = itemEl.querySelector('.pdf-upload-area');
            const uploadText = uploadArea.querySelector('p');

            itemEl.classList.add('is-uploading');

            try {
                const result = await uploadPDF(file, (status) => {
                    uploadText.textContent = status;
                });

                urlInput.value = result.pdf_url;
                env.updateLivePreviewFromForm();

            } catch (error) {
                console.error('Erro no upload do PDF:', error);
                alert(`Erro: ${error.message}`);
            } finally {
                itemEl.classList.remove('is-uploading');
            }
        }
    });
    SELECTORS.editorNavLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            SELECTORS.editorNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.dataset.editorTarget;
            SELECTORS.editorPanes.forEach(pane => pane.classList.toggle('active', pane.id === targetId));

            // Ao abrir Personalizar: atualizar visibilidade do botão Bíblia (evita sumir após excluir outro módulo)
            if (targetId === 'personalizar-editor') {
                refreshBibleVisibilitySetting();
            }

            // Atualizar hash e localStorage para manter a aba ao atualizar (mobile perde hash no refresh)
            window.history.replaceState(null, '', window.location.pathname + '#' + targetId);
            try { localStorage.setItem('dashboard_last_pane', '#' + targetId); } catch (e) { }

            // Scroll suave para o topo no mobile
            if (window.innerWidth <= 768) {
                const editorArea = document.querySelector('.editor-area');
                if (editorArea) {
                    editorArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // Mapeamento de atalhos de hash para id do painel (ex: #finance -> finance-pane)
    const hashToPaneId = {
        'finance': 'finance-pane',
        'relatorios': 'relatorios-pane',
        'editar': 'editar-pane',
        'compartilhar': 'compartilhar-pane',

        'branding': 'branding-pane',
        'separacao-pacotes': 'separacao-pacotes-pane',
        'assinatura': 'assinatura-pane',
        'personalizar-link': 'personalizar-link-pane',
        'meu-site': 'meu-site-pane'
    };
    // Processar hash da URL ao carregar a página: restaurar painel principal (e aba do editor se for o caso)
    const processHashOnLoad = () => {
        let hash = (window.location.hash || '').trim();
        // Mobile: se hash vazio, restaurar do localStorage (refresh no mobile às vezes perde o hash)
        if (!hash || hash === '#') {
            try {
                const saved = localStorage.getItem('dashboard_last_pane');
                if (saved && saved.charAt(0) === '#') hash = saved;
                else if (saved) hash = '#' + saved;
            } catch (e) { }
            if (hash && hash !== '#') {
                try { window.history.replaceState(null, '', (window.location.pathname || 'dashboard.html') + hash); } catch (e) { }
            }
        }
        if (!hash || hash === '#') return;
        let targetId = hash.substring(1).trim();
        if (!targetId) return;
        const fullHash = targetId; // guardar para finance-pane-tab-X
        // finance-pane-tab-cartoes -> finance-pane (preservar hash para initFinancePane ler a aba)
        if (targetId.startsWith('finance-pane-tab-')) targetId = 'finance-pane';
        if (hashToPaneId[targetId]) targetId = hashToPaneId[targetId];

        // 1) Hash é um painel principal (ex: finance-pane, relatorios-pane, editar-pane)?
        const mainNavLink = document.querySelector(`.sidebar .nav-link[data-target="${targetId}"]`);
        if (mainNavLink) {
            // No mobile: aplicar a troca de painel diretamente (click pode falhar com sidebar oculto)
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                mainNavLink.classList.add('active');
                document.querySelectorAll('.main-content').forEach(pane => {
                    pane.classList.remove('active');
                    pane.style.display = 'none';
                });
                var livePreview = document.querySelector('.live-preview');
                if (livePreview) livePreview.style.display = targetId === 'king-forms-pane' ? 'none' : '';
                const targetPane = document.getElementById(targetId);
                if (targetPane) {
                    targetPane.classList.add('active');
                    targetPane.style.display = 'flex';
                }
                if (targetId === 'finance-pane' && window.initFinancePane) window.initFinancePane();
                else if (targetId === 'relatorios-pane' && typeof window.loadReportsData === 'function') window.loadReportsData();
                else if (targetId === 'compartilhar-pane' && typeof window.generateQRCode === 'function') window.env.generateQRCode();

                else if (targetId === 'king-forms-pane') {
                    var kfIframe = document.getElementById('king-forms-iframe');
                    if (kfIframe && (!kfIframe.src || kfIframe.src === 'about:blank' || kfIframe.src.endsWith('about:blank'))) kfIframe.src = 'kingForms.html';
                }
            } else {
                mainNavLink.click();
            }
            return;
        }

        // 2) Hash é uma aba do editor (ex: info-editor, items-editor, personalizar-editor)?
        const editorNavLink = document.querySelector(`[data-editor-target="${targetId}"]`);
        if (editorNavLink) {
            const editarLink = document.querySelector(`.sidebar .nav-link[data-target="editar-pane"]`);
            if (editarLink) {
                if (window.innerWidth <= 768) {
                    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                    editarLink.classList.add('active');
                    document.querySelectorAll('.main-content').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
                    const ep = document.getElementById('editar-pane');
                    if (ep) { ep.classList.add('active'); ep.style.display = 'flex'; }
                    setTimeout(() => editorNavLink.click(), 50);
                } else {
                    editarLink.click();
                    setTimeout(() => editorNavLink.click(), 50);
                }
            }
        }
    };

    // Processar hash IMEDIATAMENTE para evitar flash do painel errado (especialmente mobile)
    processHashOnLoad(); // execução imediata
    requestAnimationFrame(() => processHashOnLoad()); // após primeiro frame
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    if (isMobile) setTimeout(processHashOnLoad, 150); // backup no mobile
    window.addEventListener('hashchange', processHashOnLoad);
    const iconList = ['fab fa-instagram', 'fab fa-whatsapp', 'fab fa-tiktok', 'fab fa-youtube', 'fab fa-linkedin', 'fas fa-briefcase', 'fab fa-github', 'fas fa-globe', 'fas fa-envelope', 'fas fa-phone', 'fas fa-file-pdf', 'fas fa-map-marker-alt', 'fab fa-telegram', 'fab fa-spotify', 'fab fa-discord', 'fas fa-link', 'fas fa-dollar-sign', 'fab fa-facebook', 'fab fa-twitter', 'fab fa-pinterest', 'fab fa-behance', 'fab fa-dribbble', 'fab fa-spotify'];
    const renderIcons = (filter = '') => {
        SELECTORS.iconGrid.innerHTML = '';
        iconList.filter(icon => icon.includes(filter.toLowerCase())).forEach(iconClass => {
            const iconItem = document.createElement('div');
            iconItem.className = 'icon-grid-item';
            iconItem.dataset.icon = iconClass;
            iconItem.innerHTML = `<i class="${iconClass}"></i>`;
            SELECTORS.iconGrid.appendChild(iconItem);
        });
    };
    SELECTORS.iconSearchInput.addEventListener('input', e => renderIcons(e.target.value));
    SELECTORS.iconGrid.addEventListener('click', e => {
        const iconItem = e.target.closest('.icon-grid-item');
        if (iconItem) {
            const iconClass = iconItem.dataset.icon;
            const linkToUpdate = document.querySelector(`.item[data-id='${activeItemIdForIconPicker}'] .item-icon-picker`);
            if (linkToUpdate) {
                linkToUpdate.className = `${iconClass} item-icon-picker`;
            }
            SELECTORS.iconModal.classList.remove('active');
            env.updateLivePreviewFromForm();
        }
    });
    SELECTORS.closeModalBtn.addEventListener('click', () => SELECTORS.iconModal.classList.remove('active'));
    if (SELECTORS.previewToggleBtn) {
        SELECTORS.previewToggleBtn.addEventListener('click', () => {
            SELECTORS.livePreview.classList.toggle('visible');
        });
    }

    if (SELECTORS.livePreview) {
        SELECTORS.livePreview.addEventListener('click', (e) => {
            if (e.target === SELECTORS.livePreview) {
                SELECTORS.livePreview.classList.remove('visible');
            }
        });
    }

    const copyUrlBtn = document.getElementById('copy-url-btn');
    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', () => {
            // Obter URL do perfil de diferentes formas
            let userUrl = '';

            if (SELECTORS.publicLink && SELECTORS.publicLink.href) {
                userUrl = SELECTORS.publicLink.href;
            } else if (SELECTORS.profileSlugInput && SELECTORS.profileSlugInput.value) {
                const slug = SELECTORS.profileSlugInput.value.trim();
                if (slug) {
                    userUrl = `https://tag.conectaking.com.br/${slug}`;
                }
            } else if (window.lastProfileData && window.lastProfileData.details && window.lastProfileData.details.profile_slug) {
                userUrl = `https://tag.conectaking.com.br/${window.lastProfileData.details.profile_slug}`;
            } else {
                const user = JSON.parse(localStorage.getItem('conectaKingUser') || '{}');
                if (user.id) {
                    userUrl = `https://tag.conectaking.com.br/${user.id}`;
                }
            }

            if (userUrl) {
                navigator.clipboard.writeText(userUrl).then(() => {
                    copyUrlBtn.textContent = 'Copiado!';
                    setTimeout(() => { copyUrlBtn.textContent = 'Copiar'; }, 2000);
                }).catch(err => {
                    console.error('Erro ao copiar URL:', err);
                    // Fallback para navegadores mais antigos
                    const textArea = document.createElement('textarea');
                    textArea.value = userUrl;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    copyUrlBtn.textContent = 'Copiado!';
                    setTimeout(() => { copyUrlBtn.textContent = 'Copiar'; }, 2000);
                });
            } else {
                alert('Não foi possível obter a URL do perfil. Verifique se o perfil está configurado.');
            }
        });
    }

    const downloadQrBtn = document.getElementById('download-qr-btn');
    const downloadQrBtnAlt = document.getElementById('download-qr-btn-alt');
    const downloadFunction = async () => {
        await env.composeShareQrArt();
        const art = document.getElementById('qr-art-canvas');
        if (!art) {
            alert('Não foi possível gerar a arte do QR Code. Abra a aba Compartilhar e tente de novo.');
            return;
        }
        try {
            const meta = env.getShareQrMeta();
            const slug = (meta.slug || 'tag').replace(/[^\w\-]+/g, '');
            const imageUrl = art.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = 'QRCode-' + slug + '.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Erro ao baixar arte do QR:', err);
            alert('Não foi possível baixar a arte (a logomarca pode bloquear o download). Desmarque "Incluir logomarca" e tente de novo.');
        }
    };

    if (downloadQrBtn) downloadQrBtn.addEventListener('click', downloadFunction);
    if (downloadQrBtnAlt) downloadQrBtnAlt.addEventListener('click', downloadFunction);

    // --- Nova Lógica de UI para Adicionar Item ---
    if (SELECTORS.addItemBtn) {
        SELECTORS.addItemBtn.addEventListener('click', () => {
            if (SELECTORS.addItemModal) SELECTORS.addItemModal.classList.add('active');
        });
    }
    if (SELECTORS.closeAddModalBtn) {
        SELECTORS.closeAddModalBtn.addEventListener('click', () => {
            if (SELECTORS.addItemModal) SELECTORS.addItemModal.classList.remove('active');
        });
    }
    if (SELECTORS.buttonFontSizePicker) {
        SELECTORS.buttonFontSizePicker.addEventListener('input', function () { env.updateLivePreviewFromForm(); });
    }
    // Event listeners para alinhamento da logo já foram adicionados acima
    if (SELECTORS.sidebarNavLinks) {
        SELECTORS.sidebarNavLinks.forEach(link => {
            const targetId = link.dataset.target;
            if (targetId) {
                link.addEventListener('click', e => {
                    e.preventDefault();

                    if (targetId === 'relatorios-pane') {
                        if (typeof window.loadReportsData === 'function') window.loadReportsData();
                    }
                    if (targetId === 'compartilhar-pane') {
                        env.generateQRCode();
                    }
                    if (targetId === 'finance-pane') {
                        if (window.initFinancePane) {
                            window.initFinancePane();
                        }
                    }
                    if (targetId === 'contratos-pane') { return; }
                    if (targetId === 'agenda-pane') { return; }
                    if (targetId === 'branding-pane') {
                        if (window.DashboardEmpresa && typeof window.DashboardEmpresa.loadBrandingData === 'function') {
                            window.DashboardEmpresa.loadBrandingData();
                        } else if (typeof window.loadBrandingData === 'function') {
                            window.loadBrandingData();
                        }
                    }
                });
            }
        });
    }
    if (SELECTORS.periodSelector) {
        SELECTORS.periodSelector.addEventListener('change', function () {
            if (typeof window.loadReportsData === 'function') window.loadReportsData();
        });
    }
    if (SELECTORS.cardBackgroundColorPicker) SELECTORS.cardBackgroundColorPicker.addEventListener('input', function () { env.updateLivePreviewFromForm(); });
    if (SELECTORS.cardOpacityPicker) SELECTORS.cardOpacityPicker.addEventListener('input', function () { env.updateLivePreviewFromForm(); });
    // Presets de curvatura da borda
    const radiusPresetRadios = document.querySelectorAll('input[name="radius-preset"]');
    if (radiusPresetRadios && radiusPresetRadios.length) {
        radiusPresetRadios.forEach(r => {
            r.addEventListener('change', () => {
                const val = r.value;
                // Valores padrão
                let tl = 12, tr = 12, br = 12, bl = 12;
                switch (val) {
                    case 'all':
                        // Para "Uniforme", usa o valor atual do primeiro input ou 12 como padrão
                        const currentValue = parseInt(SELECTORS.radiusTL?.value || 12, 10);
                        tl = tr = br = bl = currentValue;
                        break;
                    case 'alt':
                        tl = bl = 20; tr = br = 8; break;
                    case 'square':
                        tl = tr = br = bl = 0; break;
                    case 'soft':
                        tl = tr = br = bl = 8; break;
                    case 'pill':
                        tl = tr = br = bl = 999; break;
                    case 'top':
                        tl = tr = 20; br = bl = 0; break;
                    case 'bottom':
                        tl = tr = 0; br = bl = 20; break;
                    case 'diagonal':
                        tl = br = 20; tr = bl = 0; break;
                    case 'invert':
                        tl = br = 0; tr = bl = 20; break;
                }
                if (SELECTORS.radiusTL) SELECTORS.radiusTL.value = tl;
                if (SELECTORS.radiusTR) SELECTORS.radiusTR.value = tr;
                if (SELECTORS.radiusBR) SELECTORS.radiusBR.value = br;
                if (SELECTORS.radiusBL) SELECTORS.radiusBL.value = bl;
                env.updateLivePreviewFromForm();
            });
        });
    }

    // Função para detectar qual preset estf¡ ativo baseado nos valores atuais
    function detectActivePreset() {
        const tl = parseInt(SELECTORS.radiusTL?.value || 12, 10);
        const tr = parseInt(SELECTORS.radiusTR?.value || 12, 10);
        const br = parseInt(SELECTORS.radiusBR?.value || 12, 10);
        const bl = parseInt(SELECTORS.radiusBL?.value || 12, 10);

        // Verifica se corresponde a algum preset
        if (tl === tr && tr === br && br === bl) {
            if (tl === 0) return 'square';
            if (tl === 8) return 'soft';
            if (tl >= 999) return 'pill';
            return 'all';
        }
        if (tl === bl && tr === br && tl === 20 && tr === 8) return 'alt';
        if (tl === tr && br === bl && tl === 20 && br === 0) return 'top';
        if (tl === tr && br === bl && tl === 0 && br === 20) return 'bottom';
        if (tl === br && tr === bl && tl === 20 && tr === 0) return 'diagonal';
        if (tl === br && tr === bl && tl === 0 && tr === 20) return 'invert';

        return null; // Valores customizados
    }

    // Função para atualizar o preset selecionado
    function updatePresetSelection() {
        const activePreset = detectActivePreset();
        const presetRadios = document.querySelectorAll('input[name="radius-preset"]');

        presetRadios.forEach(radio => {
            radio.checked = radio.value === activePreset;
        });
    }

    // Inputs individuais de raio com sincronizaf§f£o
    if (SELECTORS.radiusTL) {
        SELECTORS.radiusTL.addEventListener('input', () => {
            env.updateLivePreviewFromForm();
            updatePresetSelection();
        });
    }
    if (SELECTORS.radiusTR) {
        SELECTORS.radiusTR.addEventListener('input', () => {
            env.updateLivePreviewFromForm();
            updatePresetSelection();
        });
    }
    if (SELECTORS.radiusBR) {
        SELECTORS.radiusBR.addEventListener('input', () => {
            env.updateLivePreviewFromForm();
            updatePresetSelection();
        });
    }
    if (SELECTORS.radiusBL) {
        SELECTORS.radiusBL.addEventListener('input', () => {
            env.updateLivePreviewFromForm();
            updatePresetSelection();
        });
    }

    // Botf£o "Aplicar como padrão"
    const saveRadiusDefaultBtn = document.getElementById('save-radius-default-btn');
    if (saveRadiusDefaultBtn) {
        saveRadiusDefaultBtn.addEventListener('click', () => {
            const tl = parseInt(SELECTORS.radiusTL?.value || 12, 10);
            const tr = parseInt(SELECTORS.radiusTR?.value || 12, 10);
            const br = parseInt(SELECTORS.radiusBR?.value || 12, 10);
            const bl = parseInt(SELECTORS.radiusBL?.value || 12, 10);

            // Salva os valores no localStorage para usar como padrão
            localStorage.setItem('defaultBorderRadius', JSON.stringify({ tl, tr, br, bl }));

            // Feedback visual
            const originalText = saveRadiusDefaultBtn.textContent;
            saveRadiusDefaultBtn.textContent = 'Salvo!';
            saveRadiusDefaultBtn.style.backgroundColor = 'var(--dourado-principal)';
            saveRadiusDefaultBtn.style.color = '#000';

            setTimeout(() => {
                saveRadiusDefaultBtn.textContent = originalText;
                saveRadiusDefaultBtn.style.backgroundColor = '';
                saveRadiusDefaultBtn.style.color = '';
            }, 2000);
        });
    }
    if (SELECTORS.addItemModal) {
        SELECTORS.addItemModal.addEventListener('click', async e => {
            if (e.target === SELECTORS.addItemModal) {
                SELECTORS.addItemModal.classList.remove('active');
                return;
            }
            const choiceBtn = e.target.closest('.add-choice-btn');
            if (choiceBtn) {
                const itemType = choiceBtn.dataset.itemType;

                // IMPORTANTE: sales_page e digital_form são criados DIRETAMENTE no servidor
                if (itemType === 'sales_page' || itemType === 'digital_form') {
                    console.log(`z. Criando ${itemType} DIRETAMENTE no servidor...`);

                    try {
                        const response = await fetch(`${env.API_URL}/api/profile/items`, {
                            method: 'POST',
                            headers: env.HEADERS,
                            body: JSON.stringify({
                                item_type: itemType,
                                is_active: true,
                                display_order: 999
                            })
                        });

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ message: `Erro ao criar ${itemType}` }));
                            throw new Error(errorData.message || `Erro ao criar ${itemType}`);
                        }

                        const newItem = await response.json();
                        console.log(`${itemType} criado diretamente no servidor:`, newItem);

                        SELECTORS.addItemModal.classList.remove('active');

                        // Pequeno delay para garantir que o backend processou
                        await new Promise(resolve => setTimeout(resolve, 300));

                        // Forçar atualização imediata ignorando cooldown
                        await env.fetchProfileData(true);

                        // Garantir que o editor seja renderizado após atualizar dados
                        setTimeout(() => {
                            env.renderEditor(window.currentProfileData);
                        }, 100);
                    } catch (error) {
                        console.error(`Erro ao criar ${itemType}:`, error);
                        const moduleName = itemType === 'sales_page' ? 'página de vendas' : 'formulário digital';
                        alert(`Não foi possível criar o ${moduleName}: ${error.message}`);
                    }
                    return;
                }

                // Para outros módulos, usar o fluxo padrão
                try {
                    const response = await env.safeFetch(`${env.API_URL}/api/profile/items`, { method: 'POST', body: JSON.stringify({ item_type: itemType }) });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: 'Erro ao criar item' }));
                        throw new Error(errorData.message || 'Erro ao criar item');
                    }

                    const newItem = await response.json();
                    console.log('Item criado com sucesso:', newItem);

                    SELECTORS.addItemModal.classList.remove('active');

                    // Pequeno delay para garantir que o backend processou
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // Forçar atualização imediata ignorando cooldown
                    await env.fetchProfileData(true);

                    // Garantir que o editor seja renderizado após atualizar dados
                    setTimeout(() => {
                        env.renderEditor(window.currentProfileData);
                    }, 100);
                } catch (error) {
                    console.error("Erro ao criar item:", error);
                    alert(`Não foi possível criar o item: ${error.message}`);
                }
            }
        });
    }

    // Função para configurar upload de foto de perfil (acessível globalmente)
    window.setupPhotoUpload = function () {
        // Buscar elementos novamente (podem ter sido criados dinamicamente)
        const uploadArea = document.getElementById('dashboard-photo-upload-area');
        const fileInput = document.getElementById('dashboard-photo-file-input');

        if (!uploadArea || !fileInput) {
            console.warn('Elementos de upload de foto não encontrados ainda:', {
                uploadArea: !!uploadArea,
                fileInput: !!fileInput
            });
            return false;
        }

        // Verificar se já tem listeners (evitar duplicação)
        if (uploadArea.dataset.listenersAdded === 'true') {
            console.log('Listeners já adicionados, pulando...');
            return true;
        }

        // Garantir que o input cubra toda a área e seja clicável
        fileInput.style.position = 'absolute';
        fileInput.style.top = '0';
        fileInput.style.left = '0';
        fileInput.style.width = '100%';
        fileInput.style.height = '100%';
        fileInput.style.opacity = '0';
        fileInput.style.cursor = 'pointer';
        fileInput.style.zIndex = '10';

        // Não adicionar listener na área, deixar o input fazer o trabalho diretamente
        // O input já cobre toda a área, então qualquer clique vai nele

        // Event listener para quando arquivo é selecionado
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            console.log('Arquivo selecionado:', file ? file.name : 'nenhum');
            if (file) {
                env.openCropper(file, 'profile');
                // Resetar input para permitir selecionar o mesmo arquivo novamente
                setTimeout(() => {
                    e.target.value = '';
                }, 100);
            }
        });

        // Marcar que listeners foram adicionados
        uploadArea.dataset.listenersAdded = 'true';

        console.log('Upload de foto configurado com sucesso');
        return true;
    };

    // Tentar configurar imediatamente
    window.setupPhotoUpload();

    // Também configurar após delays (caso os elementos sejam criados dinamicamente)
    setTimeout(() => {
        window.setupPhotoUpload();
    }, 500);

    setTimeout(() => {
        window.setupPhotoUpload();
    }, 1500);
    // crop buttons: DashboardUpload.init()
    if (window.DashboardUpload && window.DashboardUpload.init) window.DashboardUpload.init();
    // crop-and-upload-btn: DashboardUpload.confirmCropAndUpload
    renderIcons();

    // Event listeners para carrossel - usar delegação de eventos
    document.addEventListener('click', async (e) => {
        // Botão de adicionar foto
        if (e.target.closest('.add-carousel-image-btn')) {
            const btn = e.target.closest('.add-carousel-image-btn');
            const itemId = btn.dataset.itemId;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    env.openCropper(file, 'carousel', document.querySelector(`.item[data-id="${itemId}"]`));
                    window.currentCarouselItemId = itemId;
                }
            };
            input.click();
        }
        // Remoção de imagem é tratada no listener específico do modal (SELECTORS.editModalBody)
    });

    // Event listener para input file do carrossel/banner (delegação de eventos)
    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('add-carousel-image-input')) {
            const input = e.target;
            const itemId = input.dataset.itemId;
            const file = input.files[0];
            if (file) {
                console.log('Arquivo selecionado para item:', itemId);
                const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                window.currentCarouselItemId = itemId;
                env.openCropper(file, 'carousel', itemEl);
            }
            // Resetar input para permitir selecionar o mesmo arquivo novamente
            input.value = '';
        }
    });

    // Event listener adicional para cliques no container (fallback)
    document.addEventListener('click', (e) => {
        // Handler para remover imagem do carrossel (fallback global)
        if (e.target.closest('.remove-carousel-image-btn')) {
            const btn = e.target.closest('.remove-carousel-image-btn');
            const itemId = btn.dataset.itemId;
            const imageIndex = parseInt(btn.dataset.imageIndex);
            const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
            const itemType = itemEl?.dataset?.itemType;

            if (itemType === 'carousel') {
                // ===== NOVO CARROSSEL - Remover =====
                env.removeCarouselImageNew(itemId, imageIndex);
            } else if (itemType === 'banner') {
                // Banner não suporta carrossel: remover limpa tudo
                const modalHidden = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url-hidden`);
                const modalImageUrl = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-image-url`);
                const modalPreview = document.getElementById('edit-banner-preview');
                const itemImageInput = document.querySelector(`.item[data-id="${itemId}"] .item-image-url-input`);
                const itemDestInput = document.querySelector(`.item[data-id="${itemId}"] .item-destination-url-input`);
                const displayDest = document.querySelector(`.item[data-id="${itemId}"] .item-display-dest`);

                if (modalHidden) modalHidden.value = '';
                if (modalImageUrl) modalImageUrl.value = '';
                if (itemImageInput) itemImageInput.value = '';
                if (itemDestInput && itemDestInput.value && itemDestInput.value.startsWith('[')) {
                    // se estava JSON, limpar
                    itemDestInput.value = '';
                }
                if (modalPreview) {
                    modalPreview.src = '';
                    modalPreview.style.display = 'none';
                }
                if (displayDest) displayDest.textContent = 'Sem destino';
                // remover visualmente o bloco da imagem atual (se existir no modal)
                const imageContainer = btn.closest('.carousel-image-item');
                if (imageContainer) imageContainer.remove();
                const imageContainerNew = btn.closest('.carousel-image-item-new');
                if (imageContainerNew) imageContainerNew.remove();
                console.log('Banner: imagem removida e campos limpos');
            }
            return;
        }

        const uploadArea = e.target.closest('.carousel-upload-trigger');
        if (uploadArea && !e.target.closest('input')) {
            const itemId = uploadArea.dataset.itemId;
            const input = document.querySelector(`#carousel-input-${itemId}`);
            if (input) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clicou no container, abrindo input para item:', itemId);
                input.click();
            }
        }
    });
}

    var DashboardListeners = {
        setupEventListeners: setupEventListeners
    };
    global.DashboardListeners = DashboardListeners;
    global.setupEventListeners = setupEventListeners;
})(typeof window !== 'undefined' ? window : this);
