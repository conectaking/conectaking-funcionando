/**
 * Dashboard Save (Publicar alterações) — módulo isolado (Conecta King).
 * Depende de window.DashboardCore (+ Cartao/Editor quando aplicável).
 * Gerado por scripts/extract-dashboard-save-sortable.js
 */
(function (global) {
    'use strict';

    function core() { return global.DashboardCore || {}; }
    function cartao() { return global.DashboardCartao || {}; }
    function editor() { return global.DashboardEditor || {}; }

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
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        },
        getDefaultIcon: function (t) {
            var c = core();
            if (typeof c.getDefaultIcon === 'function') return c.getDefaultIcon(t);
            return 'fas fa-link';
        },
        updateItemFromApiResponse: function () {
            var c = core();
            if (typeof c.updateItemFromApiResponse === 'function') return c.updateItemFromApiResponse.apply(c, arguments);
        },
        fetchProfileData: function () {
            var c = core();
            if (typeof c.fetchProfileData === 'function') return c.fetchProfileData.apply(c, arguments);
            if (typeof global.fetchProfileData === 'function') return global.fetchProfileData.apply(global, arguments);
        },
        renderEditor: function (data) {
            var e = editor();
            if (e && typeof e.renderEditor === 'function') return e.renderEditor(data);
            if (typeof global.renderEditor === 'function') return global.renderEditor(data);
        },
        updateLivePreviewFromForm: function () {
            var k = cartao();
            if (k && typeof k.updateLivePreviewFromForm === 'function') return k.updateLivePreviewFromForm();
            if (typeof global.updateLivePreviewFromForm === 'function') return global.updateLivePreviewFromForm();
        },
        initSortable: function () {
            if (global.DashboardSortable && typeof global.DashboardSortable.initSortable === 'function') {
                return global.DashboardSortable.initSortable();
            }
            var c = core();
            if (typeof c.initSortable === 'function') return c.initSortable();
        },
        saveItemOrder: function (order) {
            if (global.DashboardSortable && typeof global.DashboardSortable.saveItemOrder === 'function') {
                return global.DashboardSortable.saveItemOrder(order);
            }
            var c = core();
            if (typeof c.saveItemOrder === 'function') return c.saveItemOrder(order);
        },
        serializeBannerDestination: function () {
            var c = core();
            if (typeof c.serializeBannerDestination === 'function') return c.serializeBannerDestination.apply(c, arguments);
            return String(arguments[0] || '').trim();
        },
        bannerDestDisplayLabel: function (raw) {
            var c = core();
            if (typeof c.bannerDestDisplayLabel === 'function') return c.bannerDestDisplayLabel(raw);
            return String(raw || '').trim();
        },
        moduleListDisplayTitle: function (item) {
            var c = core();
            if (typeof c.moduleListDisplayTitle === 'function') return c.moduleListDisplayTitle(item);
            return (item && (item.title || item.item_type)) || 'Módulo';
        }
    };

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            return s ? s[prop] : null;
        }
    });

async function saveAllChanges(event) {
    // Sincronizar dados do modal para o item da lista ANTES de capturar os dados
    syncModalDataToItem();

    const wifiMissingSsid = Array.from(document.querySelectorAll('#items-container .item, #items-container .module-item')).some(el => {
        if (el.dataset.itemType !== 'wifi') return false;
        return !(el.querySelector('.wifi-ssid-input')?.value || '').trim();
    });
    if (wifiMissingSsid) {
        alert('Preencha o nome da rede (SSID) em todos os módulos Wi-Fi antes de publicar.');
        return;
    }

    // Encontrar o botão que foi clicado ou usar o header-save-btn
    const clickedBtn = (event && event.target) || (event && event.currentTarget) || document.getElementById('header-save-btn') || document.getElementById('mobile-save-all-btn');
    const originalHTML = clickedBtn ? clickedBtn.innerHTML : '';

    if (clickedBtn) {
        clickedBtn.disabled = true;
        clickedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
    }

    try {
        const saveData = {};

        const displayNameValue = SELECTORS.displayNameInput.value;
        const vcardToggleChecked = document.querySelector('input[name="vcard-toggle"]:checked');
        const showVcardValue = vcardToggleChecked ? vcardToggleChecked.value === 'true' : true;

        // Capturar formato do avatar atual
        const activeAvatarFormatBtn = document.querySelector('.avatar-format-btn.active');
        const currentAvatarFormat = activeAvatarFormatBtn ? activeAvatarFormatBtn.dataset.format :
            (window.currentProfileData?.details?.avatar_format || 'circular');

        // Capturar WhatsApp (apenas números) - usuário deve incluir código do país
        const whatsappValue = (SELECTORS.whatsappNumberInput?.value || '').trim().replace(/\D/g, '');
        console.log('[SAVE-ALL] WhatsApp capturado:', whatsappValue);
        console.log('[SAVE-ALL] Campo WhatsApp existe?', !!SELECTORS.whatsappNumberInput);
        console.log('[SAVE-ALL] Valor original do campo:', SELECTORS.whatsappNumberInput?.value);

        const cardOpacityVal = SELECTORS.cardOpacityPicker ? parseFloat(SELECTORS.cardOpacityPicker.value) : 1;
        const bgImageOpacityVal = SELECTORS.backgroundImageOpacityPicker ? parseFloat(SELECTORS.backgroundImageOpacityPicker.value) : 1;
        saveData.details = {
            displayName: displayNameValue,
            display_name: displayNameValue,
            whatsapp: whatsappValue,
            bio: SELECTORS.bioInput.value,
            profile_slug: SELECTORS.profileSlugInput.value,
            fontFamily: SELECTORS.fontFamilySelect?.value || 'Inter',
            backgroundColor: SELECTORS.backgroundColorPicker?.value || '#0D0D0F',
            textColor: SELECTORS.textColorPicker?.value || '#ECECEC',
            buttonColor: SELECTORS.buttonColorPicker?.value || '#1C1C21',
            buttonTextColor: SELECTORS.buttonTextColorPicker?.value || '#FFFFFF',
            buttonOpacity: SELECTORS.buttonOpacityPicker ? parseFloat(SELECTORS.buttonOpacityPicker.value) : 1,
            buttonBorderRadius: `${SELECTORS.radiusTL?.value || 12}px ${SELECTORS.radiusTR?.value || 12}px ${SELECTORS.radiusBR?.value || 12}px ${SELECTORS.radiusBL?.value || 12}px`,
            buttonContentAlign: (document.querySelector('input[name="button-align"]:checked') || {}).value || 'center',
            backgroundType: (document.querySelector('input[name="bg-type"]:checked') || {}).value || 'color',
            backgroundImageUrl: SELECTORS.backgroundImageUrlInput?.value ?? '',
            cardBackgroundColor: SELECTORS.cardBackgroundColorPicker?.value || '#141417',
            profileImageUrl: (SELECTORS.dashboardPhotoPreview && SELECTORS.dashboardPhotoPreview.src && !SELECTORS.dashboardPhotoPreview.src.startsWith('data:'))
                ? SELECTORS.dashboardPhotoPreview.src
                : (window.currentProfileData?.details?.profile_image_url || window.lastProfileData?.details?.profile_image_url || null),
            profile_image_url: (SELECTORS.dashboardPhotoPreview && SELECTORS.dashboardPhotoPreview.src && !SELECTORS.dashboardPhotoPreview.src.startsWith('data:'))
                ? SELECTORS.dashboardPhotoPreview.src
                : (window.currentProfileData?.details?.profile_image_url || window.lastProfileData?.details?.profile_image_url || null),
            cardOpacity: cardOpacityVal,
            card_opacity: cardOpacityVal,
            buttonFontSize: `${(SELECTORS.buttonFontSizePicker && SELECTORS.buttonFontSizePicker.value) || 16}px`,
            backgroundImageOpacity: bgImageOpacityVal,
            background_image_opacity: bgImageOpacityVal,
            showVcardButton: showVcardValue,
            show_vcard_button: showVcardValue,
            avatar_format: currentAvatarFormat,
            avatarFormat: currentAvatarFormat,
            logo_spacing: SELECTORS.logoAlignLeft?.checked ? 'left' : (SELECTORS.logoAlignRight?.checked ? 'right' : 'center'),
            logoSpacing: SELECTORS.logoAlignLeft?.checked ? 'left' : (SELECTORS.logoAlignRight?.checked ? 'right' : 'center'),
            share_image_url: window.currentProfileData?.details?.share_image_url || null,
            background_type: (document.querySelector('input[name="bg-type"]:checked') || {}).value || 'color',
            background_color: SELECTORS.backgroundColorPicker?.value || '#0D0D0F',
            background_image_url: SELECTORS.backgroundImageUrlInput?.value ?? '',
            card_background_color: SELECTORS.cardBackgroundColorPicker?.value || '#141417'
        };

        if (typeof window.getVitrineDetailsForSave === 'function') {
            Object.assign(saveData.details, window.getVitrineDetailsForSave());
        }

        console.log('YZ [SAVE-ALL] Dados de personalização capturados:', {
            fontFamily: saveData.details.fontFamily,
            backgroundColor: saveData.details.backgroundColor,
            textColor: saveData.details.textColor,
            buttonColor: saveData.details.buttonColor,
            backgroundType: saveData.details.backgroundType,
            backgroundImageUrl: saveData.details.backgroundImageUrl,
            backgroundImageOpacity: saveData.details.backgroundImageOpacity,
            cardBackgroundColor: saveData.details.cardBackgroundColor,
            cardOpacity: saveData.details.cardOpacity,
            share_image_url: saveData.details.share_image_url
        });

        // Capturar todos os itens do container
        const allItemElements = document.querySelectorAll('#items-container .item, #items-container .module-item');
        console.log(`Itens encontrados no DOM: ${allItemElements.length}`);

        if (allItemElements.length === 0) {
            console.warn('Nenhum item encontrado no container #items-container');
            console.log('Verificando se o container existe:', !!document.getElementById('items-container'));
            const container = document.getElementById('items-container');
            if (container) {
                console.log('Y"< Conteúdo do container:', container.innerHTML.substring(0, 200));
            }
        }

        // Separar itens temporários (não salvos) dos itens existentes
        const tempItems = [];
        const existingItems = [];

        Array.from(allItemElements).forEach((itemEl, index) => {
            const itemType = itemEl.dataset.itemType;
            const itemIdRaw = itemEl.dataset.id;

            // Verificar se é um item temporário (não salvo ainda)
            // IMPORTANTE: Mesmo itens 'sales_page' temporários precisam ser criados no servidor
            if (itemIdRaw && (itemIdRaw.toString().startsWith('temp_') || itemEl.dataset.isUnsaved === 'true')) {
                console.log(`Item temporário encontrado: ${itemIdRaw} (${itemType}) - será criado no servidor ao salvar`);
                tempItems.push({ element: itemEl, index });
            } else {
                const itemId = parseInt(itemIdRaw, 10);
                // Validar ID do item existente
                if (!itemIdRaw || isNaN(itemId) || itemId <= 0) {
                    console.error(`O Item inválido encontrado:`, {
                        itemIdRaw,
                        itemId,
                        itemType,
                        element: itemEl
                    });
                    // Pular itens inválidos
                    return;
                }

                // IMPORTANTE: sales_page é DESVINCULADO do save-all
                // Não incluir no save-all - ele salva diretamente quando você salva na página de vendas
                if (itemType === 'sales_page') {
                    console.log(`Sales_page ${itemId} DESVINCULADO do save-all - não será incluído`);
                    return; // Pular este item
                }

                existingItems.push({ element: itemEl, index, itemId });
            }
        });

        // IMPORTANTE: Separar sales_page dos outros itens temporários
        // sales_page NÃO deve ser criado aqui - ele já é criado quando você adiciona
        const tempItemsNonSalesPage = tempItems.filter(tempItem => tempItem.element.dataset.itemType !== 'sales_page');
        const tempItemsSalesPage = tempItems.filter(tempItem => tempItem.element.dataset.itemType === 'sales_page');

        if (tempItemsSalesPage.length > 0) {
            console.log(`${tempItemsSalesPage.length} sales_page(s) temporário(s) encontrado(s) - NÃO serão processados aqui (já foram criados quando adicionados)`);
        }

        // Criar itens temporários no servidor ANTES de salvar (exceto sales_page)
        if (tempItemsNonSalesPage.length > 0) {
            console.log(`Y?. Criando ${tempItemsNonSalesPage.length} item(ns) temporário(s) no servidor...`);
            for (const tempItem of tempItemsNonSalesPage) {
                const itemEl = tempItem.element;
                const itemType = itemEl.dataset.itemType;
                const tempId = itemEl.dataset.id;

                try {
                    // Capturar dados do item temporário
                    let destinationUrl = itemEl.querySelector('.item-destination-url-input')?.value || (itemType === 'whatsapp' ? '' : '#');

                    // Se for WhatsApp, apenas remover caracteres não numéricos (usuário deve incluir código do país)
                    if (itemType === 'whatsapp' && destinationUrl) {
                        destinationUrl = destinationUrl.replace(/\D/g, '');
                    }

                    if (itemType === 'wifi') {
                        const fmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                        const ssid = itemEl.querySelector('.wifi-ssid-input')?.value?.trim() || '';
                        const password = itemEl.querySelector('.wifi-password-input')?.value ?? '';
                        const security = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
                        const hidden = !!itemEl.querySelector('.wifi-hidden-input')?.checked;
                        const banner_image_url = itemEl.querySelector('.wifi-banner-url-input')?.value?.trim() || '';
                        const logo_url = itemEl.querySelector('.wifi-logo-url-input')?.value?.trim() || '';
                        let logo_size = parseInt(itemEl.querySelector('.wifi-logo-size-input')?.value, 10);
                        if (isNaN(logo_size) || logo_size < 20) logo_size = parseInt(itemEl.dataset.logoSize, 10) || 48;
                        logo_size = Math.min(600, Math.max(20, logo_size));
                        destinationUrl = JSON.stringify({
                            ssid, password, security, hidden, display_format: fmt,
                            banner_image_url, logo_url, logo_size
                        });
                    }

                    const tempItemData = {
                        item_type: itemType,
                        title: itemEl.querySelector('.item-title-input')?.value || getItemTypeName(itemType),
                        destination_url: destinationUrl,
                        pix_key: itemEl.querySelector('.item-pix-key-input')?.value || '',
                        recipient_name: itemEl.querySelector('.item-recipient-name-input')?.value || '',
                        pix_amount: itemEl.querySelector('.item-pix-amount-input')?.value || '',
                        pix_description: itemEl.querySelector('.item-pix-description-input')?.value || '',
                        pdf_url: itemEl.querySelector('.item-pdf-url-input')?.value || '',
                        aspect_ratio: itemEl.dataset.aspectRatio || (itemType === 'banner' ? 'tarja' : 'auto'),
                        icon_class: itemEl.querySelector('.item-icon-picker i')?.className || env.getDefaultIcon(itemType),
                        is_active: itemEl.querySelector('.module-toggle-input')?.checked !== false,
                        display_order: tempItem.index + 1
                    };

                    if (itemType === 'wifi') {
                        const fmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                        const bannerUrl = itemEl.querySelector('.wifi-banner-url-input')?.value?.trim() || '';
                        const logoUrl = itemEl.querySelector('.wifi-logo-url-input')?.value?.trim() || '';
                        let logo_size = parseInt(itemEl.querySelector('.wifi-logo-size-input')?.value, 10);
                        if (isNaN(logo_size) || logo_size < 20) logo_size = parseInt(itemEl.dataset.logoSize, 10) || 48;
                        logo_size = Math.min(600, Math.max(20, logo_size));
                        tempItemData.image_url = fmt === 'banner' && bannerUrl ? bannerUrl : (logoUrl || null);
                        tempItemData.logo_size = logo_size;
                    }

                    console.log(`Criando item temporário ${tempId} no servidor...`);
                    const createResponse = await fetch(`${env.API_URL}/api/profile/items`, {
                        method: 'POST',
                        headers: env.HEADERS,
                        body: JSON.stringify(tempItemData)
                    });

                    if (!createResponse.ok) {
                        const errorData = await createResponse.json().catch(() => ({}));
                        throw new Error(errorData.message || `Erro ${createResponse.status} ao criar item`);
                    }

                    const createdItem = await createResponse.json();
                    console.log(`Item temporário ${tempId} criado no servidor com ID ${createdItem.id}`);

                    // Atualizar o ID temporário pelo ID real no DOM
                    const oldId = itemEl.dataset.id;
                    itemEl.dataset.id = String(createdItem.id);
                    itemEl.setAttribute('data-id', String(createdItem.id)); // Garantir que o atributo seja atualizado
                    delete itemEl.dataset.isUnsaved;
                    // Remover atributo data-is-temporary se existir
                    if (itemEl.hasAttribute('data-is-temporary')) {
                        itemEl.removeAttribute('data-is-temporary');
                    }
                    if (itemEl.dataset.isTemporary) {
                        delete itemEl.dataset.isTemporary;
                    }
                    console.log(` ID atualizado de ${oldId} para ${itemEl.dataset.id} no elemento DOM`);

                    // Atualizar também no currentProfileData
                    if (window.currentProfileData && window.currentProfileData.items) {
                        const tempItemIndex = window.currentProfileData.items.findIndex(item => String(item.id) === String(tempId));
                        if (tempItemIndex !== -1) {
                            window.currentProfileData.items[tempItemIndex] = createdItem;
                        }
                    }
                } catch (createError) {
                    console.error(`Erro ao criar item temporário ${tempId}:`, createError);
                    throw new Error(`Erro ao criar módulo "${getItemTypeName(itemType)}": ${createError.message}`);
                }
            }
            console.log(`Todos os ${tempItems.length} item(ns) temporário(s) foram criados no servidor`);
        }

        // Agora processar todos os itens (incluindo os recém-criados) para salvar
        saveData.items = Array.from(allItemElements)
            .map((itemEl, index) => {
                const itemType = itemEl.dataset.itemType;
                const itemIdRaw = itemEl.dataset.id;
                const itemId = parseInt(itemIdRaw, 10);

                // IMPORTANTE: sales_page é COMPLETAMENTE DESVINCULADO do "Publicar alterações"
                // Não incluir no save-all - ele salva diretamente quando você salva na página de vendas
                // O toggle de ativar/desativar funciona independentemente
                if (itemType === 'sales_page') {
                    console.log(`Sales_page ${itemId} DESVINCULADO do save-all - não será incluído`);
                    return null; // Não incluir no save-all
                }

                // Validar ID do item (agora todos devem ter IDs válidos após criar temporários)
                if (!itemIdRaw || isNaN(itemId) || itemId <= 0) {
                    console.error(`O Item inválido encontrado após criar temporários:`, {
                        itemIdRaw,
                        itemId,
                        itemType,
                        element: itemEl
                    });
                    // Pular itens sem ID válido
                    return null;
                }

                // Capturar is_active do toggle (priorizar o estado atual do checkbox)
                const toggleInput = itemEl.querySelector('.module-toggle-input');
                let isActive = true; // padrão: ativo
                if (toggleInput) {
                    isActive = toggleInput.checked;
                } else {
                    // Se não tiver toggle, verificar dataset ou assumir ativo
                    isActive = itemEl.dataset.isActive !== 'false';
                }

                console.log(`Item ${itemId} (${itemType}): is_active = ${isActive}`, {
                    hasToggle: !!toggleInput,
                    toggleChecked: toggleInput?.checked,
                    datasetIsActive: itemEl.dataset.isActive
                });

                // IMPORTANTE: Usar a ordem real no DOM (baseada na posição visual)
                // Não usar apenas 'index' do array, mas sim a posição real do elemento no container
                // Isso garante que a ordem salva seja a mesma que o usuário vê
                const allItemsInOrder = Array.from(SELECTORS.itemsContainer.children);
                const actualIndex = allItemsInOrder.indexOf(itemEl);

                // A ordem deve ser baseada na posição real no DOM (1-indexed)
                // Se o item não estiver no container, usar o index do array como fallback
                const finalDisplayOrder = actualIndex >= 0 ? (actualIndex + 1) : (index + 1);

                // Atualizar data-display-order no DOM para manter sincronizado
                itemEl.dataset.displayOrder = finalDisplayOrder;
                itemEl.setAttribute('data-display-order', finalDisplayOrder);

                console.log(`Y"S Item ${itemId} (${itemType}): display_order = ${finalDisplayOrder} (posição ${actualIndex >= 0 ? actualIndex : 'não encontrado'})`);

                let itemData = {
                    id: itemId,
                    display_order: finalDisplayOrder,
                    item_type: itemType, // Garantir que item_type seja enviado
                    is_active: isActive // Capturar status ativo/inativo do toggle
                };

                switch (itemType) {
                    case 'link':
                        // Link personalizado - pode ter logo (image_url) ou ícone
                        // Capturar título (priorizar modal se estiver aberto para este item, depois lista, depois module-name)
                        const linkTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                        const linkTitleInput = itemEl.querySelector('.item-title-input');
                        const linkModuleName = itemEl.querySelector('.module-name');
                        itemData.title = linkTitleModal || linkTitleInput?.value || linkModuleName?.textContent?.trim() || 'Link Personalizado';

                        // Capturar destination_url (priorizar modal se estiver aberto para este item, depois lista)
                        const linkDestModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`)?.value;
                        const linkDestInput = itemEl.querySelector('.item-destination-url-input');
                        itemData.destination_url = linkDestModal || linkDestInput?.value || '';

                        // Capturar image_url (priorizar modal, depois lista)
                        const linkImageUrlInputModal = document.getElementById('edit-link-image-url') ||
                            document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-image-url-input`);
                        const linkImageUrlInputItem = itemEl.querySelector('.item-image-url-input');
                        const linkImageUrlValue = (linkImageUrlInputModal?.value && linkImageUrlInputModal.value.trim()) ||
                            (linkImageUrlInputItem?.value && linkImageUrlInputItem.value.trim()) || null;
                        itemData.image_url = linkImageUrlValue;

                        // Salvar tamanho da logo (priorizar modal se estiver aberto, depois lista, depois dataset)
                        let logoSizeValue = 24;
                        let linkLogoSizeInputItem = null; // Declarar fora do bloco para usar no console.log

                        // Primeiro tentar pegar do modal se estiver aberto para este item
                        const modalOpenForThisItem = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                        if (modalOpenForThisItem) {
                            const linkLogoSizeInputModal = document.getElementById(`edit-logo-size-input-${itemId}`) ||
                                modalOpenForThisItem.querySelector('.item-logo-size-input');
                            if (linkLogoSizeInputModal && linkLogoSizeInputModal.value !== undefined && linkLogoSizeInputModal.value !== '') {
                                logoSizeValue = parseInt(linkLogoSizeInputModal.value) || 24;
                            }
                        }

                        // Se não encontrou no modal, tentar na lista
                        if (logoSizeValue === 24) {
                            linkLogoSizeInputItem = itemEl.querySelector('.item-logo-size-input');
                            if (linkLogoSizeInputItem && linkLogoSizeInputItem.value !== undefined && linkLogoSizeInputItem.value !== '') {
                                logoSizeValue = parseInt(linkLogoSizeInputItem.value) || 24;
                            }
                        }

                        // Se ainda não encontrou, tentar dataset
                        if (logoSizeValue === 24 && itemEl.dataset.logoSize) {
                            logoSizeValue = parseInt(itemEl.dataset.logoSize) || 24;
                        }

                        // Se ainda não encontrou, tentar do item original (se carregado do servidor)
                        if (logoSizeValue === 24 && window.currentProfileData && window.currentProfileData.items) {
                            const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                            if (originalItem && originalItem.logo_size) {
                                const originalSize = parseInt(originalItem.logo_size, 10);
                                if (!isNaN(originalSize) && originalSize > 0) {
                                    logoSizeValue = originalSize;
                                }
                            }
                        }

                        // Se ainda não encontrou, tentar do preservedStates (se existir)
                        if (logoSizeValue === 24 && window.preservedItemStates && window.preservedItemStates[itemId] && window.preservedItemStates[itemId].logo_size) {
                            const preservedSize = parseInt(window.preservedItemStates[itemId].logo_size, 10);
                            if (!isNaN(preservedSize) && preservedSize > 0) {
                                logoSizeValue = preservedSize;
                            }
                        }

                        // Garantir que sempre tenha um valor válido (não salvar null, sempre salvar o valor)
                        itemData.logo_size = logoSizeValue;

                        // Capturar logo_fit_mode (modo de ajuste da logo)
                        let linkLogoFitMode = 'contain'; // Padrão: completo, sem corte
                        if (modalOpenForThisItem) {
                            const linkLogoFitModeInput = document.getElementById(`edit-logo-fit-mode-input-${itemId}`) ||
                                modalOpenForThisItem.querySelector('.item-logo-fit-mode-input');
                            if (linkLogoFitModeInput && linkLogoFitModeInput.value) {
                                linkLogoFitMode = linkLogoFitModeInput.value;
                            } else {
                                // Tentar pegar do radio button selecionado
                                const linkLogoFitRadio = modalOpenForThisItem.querySelector(`input[name="edit-logo-fit-mode-${itemId}"]:checked`);
                                if (linkLogoFitRadio) {
                                    linkLogoFitMode = linkLogoFitRadio.value;
                                }
                            }
                        }
                        if (linkLogoFitMode === 'contain') {
                            const linkLogoFitModeInputItem = itemEl.querySelector('.item-logo-fit-mode-input');
                            if (linkLogoFitModeInputItem && linkLogoFitModeInputItem.value) {
                                linkLogoFitMode = linkLogoFitModeInputItem.value;
                            } else {
                                // Tentar pegar do radio button selecionado na lista
                                const linkLogoFitRadioItem = itemEl.querySelector('input[name*="logo-fit-mode"]:checked');
                                if (linkLogoFitRadioItem) {
                                    linkLogoFitMode = linkLogoFitRadioItem.value;
                                }
                            }
                        }
                        // Se ainda não encontrou, tentar do item original
                        if (linkLogoFitMode === 'contain' && window.currentProfileData && window.currentProfileData.items) {
                            const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                            if (originalItem && originalItem.logo_fit_mode) {
                                linkLogoFitMode = originalItem.logo_fit_mode;
                            }
                        }
                        itemData.logo_fit_mode = linkLogoFitMode;

                        const originalItem = window.currentProfileData && window.currentProfileData.items ? window.currentProfileData.items.find(i => i.id === itemId) : null;
                        console.log(`Logo size para item ${itemId}: ${logoSizeValue}px, fit_mode: ${linkLogoFitMode} (origem: modal=${!!modalOpenForThisItem}, lista=${!!linkLogoSizeInputItem}, dataset=${!!itemEl.dataset.logoSize}, original=${!!(originalItem && originalItem.logo_size)})`);

                        // Se tiver logo, icon_class pode ser null, senão usar o ícone selecionado
                        const linkIconPicker = itemEl.querySelector('.item-icon-picker');
                        if (linkIconPicker) {
                            const iconElement = linkIconPicker.querySelector('i');
                            itemData.icon_class = iconElement ? iconElement.className.trim() : null;
                        } else {
                            itemData.icon_class = null;
                        }
                        break;
                    case 'whatsapp': case 'telegram': case 'email': case 'facebook': case 'instagram': case 'pinterest': case 'reddit': case 'tiktok': case 'twitch': case 'twitter': case 'youtube': case 'linkedin': case 'portfolio': case 'spotify': case 'instagram_embed': case 'youtube_embed': case 'tiktok_embed': case 'spotify_embed': case 'linkedin_embed': case 'pinterest_embed':
                        // Capturar título (priorizar modal se estiver aberto para este item, depois lista, depois module-name)
                        const socialTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                        const socialTitleInput = itemEl.querySelector('.item-title-input');
                        const socialModuleName = itemEl.querySelector('.module-name');
                        itemData.title = socialTitleModal || socialTitleInput?.value || socialModuleName?.textContent?.trim() || '';

                        // Capturar destination_url (priorizar modal se estiver aberto para este item, depois lista)
                        let socialDestValue = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`)?.value ||
                            itemEl.querySelector('.item-destination-url-input')?.value || '';

                        // Se for WhatsApp, apenas remover caracteres não numéricos (usuário deve incluir código do país)
                        if (itemType === 'whatsapp' && socialDestValue) {
                            socialDestValue = socialDestValue.replace(/\D/g, '');
                        }

                        itemData.destination_url = socialDestValue || '';

                        // Capturar icon_class
                        const socialIconPicker = itemEl.querySelector('.item-icon-picker');
                        if (socialIconPicker) {
                            itemData.icon_class = socialIconPicker.className.replace(' item-icon-picker', '').trim();
                        } else {
                            itemData.icon_class = null;
                        }

                        // Capturar logo_size (mesma lógica do link personalizado)
                        let socialLogoSizeValue = 24;
                        const modalOpenForSocial = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                        if (modalOpenForSocial) {
                            const socialLogoSizeInputModal = document.getElementById(`edit-logo-size-input-${itemId}`) ||
                                modalOpenForSocial.querySelector('.item-logo-size-input');
                            if (socialLogoSizeInputModal && socialLogoSizeInputModal.value !== undefined && socialLogoSizeInputModal.value !== '') {
                                socialLogoSizeValue = parseInt(socialLogoSizeInputModal.value) || 24;
                            }
                        }
                        if (socialLogoSizeValue === 24) {
                            const socialLogoSizeInputItem = itemEl.querySelector('.item-logo-size-input');
                            if (socialLogoSizeInputItem && socialLogoSizeInputItem.value !== undefined && socialLogoSizeInputItem.value !== '') {
                                socialLogoSizeValue = parseInt(socialLogoSizeInputItem.value) || 24;
                            }
                        }
                        if (socialLogoSizeValue === 24 && itemEl.dataset.logoSize) {
                            socialLogoSizeValue = parseInt(itemEl.dataset.logoSize) || 24;
                        }
                        // Se ainda não encontrou, tentar do item original (se carregado do servidor)
                        if (socialLogoSizeValue === 24 && window.currentProfileData && window.currentProfileData.items) {
                            const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                            if (originalItem && originalItem.logo_size) {
                                const originalSize = parseInt(originalItem.logo_size, 10);
                                if (!isNaN(originalSize) && originalSize > 0) {
                                    socialLogoSizeValue = originalSize;
                                }
                            }
                        }
                        itemData.logo_size = socialLogoSizeValue;
                        break;
                    case 'sales_page':
                        // Sales Page - pode ter logo (image_url) ou ícone
                        // Capturar título
                        const salesPageTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                        const salesPageTitleInput = itemEl.querySelector('.item-title-input');
                        const salesPageModuleName = itemEl.querySelector('.module-name');
                        itemData.title = salesPageTitleModal || salesPageTitleInput?.value || salesPageModuleName?.textContent?.trim() || 'Página de Vendas';

                        // Capturar image_url (priorizar modal, depois lista)
                        const salesPageImageUrlInputModal = document.getElementById('edit-sales-page-logo-url') ||
                            document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-image-url-input`);
                        const salesPageImageUrlInputItem = itemEl.querySelector('.item-image-url-input');
                        const salesPageImageUrlValue = (salesPageImageUrlInputModal?.value && salesPageImageUrlInputModal.value.trim()) ||
                            (salesPageImageUrlInputItem?.value && salesPageImageUrlInputItem.value.trim()) || null;
                        itemData.image_url = salesPageImageUrlValue;

                        // Capturar logo_size (mesma lógica do link personalizado)
                        let salesPageLogoSizeValue = 24;
                        const modalOpenForSalesPage = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                        if (modalOpenForSalesPage) {
                            const salesPageLogoSizeInputModal = document.getElementById(`edit-logo-size-input-${itemId}`) ||
                                modalOpenForSalesPage.querySelector('.item-logo-size-input');
                            if (salesPageLogoSizeInputModal && salesPageLogoSizeInputModal.value !== undefined && salesPageLogoSizeInputModal.value !== '') {
                                salesPageLogoSizeValue = parseInt(salesPageLogoSizeInputModal.value) || 24;
                            }
                        }
                        if (salesPageLogoSizeValue === 24) {
                            const salesPageLogoSizeInputItem = itemEl.querySelector('.item-logo-size-input');
                            if (salesPageLogoSizeInputItem && salesPageLogoSizeInputItem.value !== undefined && salesPageLogoSizeInputItem.value !== '') {
                                salesPageLogoSizeValue = parseInt(salesPageLogoSizeInputItem.value) || 24;
                            }
                        }
                        if (salesPageLogoSizeValue === 24 && itemEl.dataset.logoSize) {
                            salesPageLogoSizeValue = parseInt(itemEl.dataset.logoSize) || 24;
                        }
                        // Se ainda não encontrou, tentar do item original (se carregado do servidor)
                        if (salesPageLogoSizeValue === 24 && window.currentProfileData && window.currentProfileData.items) {
                            const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                            if (originalItem && originalItem.logo_size) {
                                const originalSize = parseInt(originalItem.logo_size, 10);
                                if (!isNaN(originalSize) && originalSize > 0) {
                                    salesPageLogoSizeValue = originalSize;
                                }
                            }
                        }
                        itemData.logo_size = salesPageLogoSizeValue;

                        // Capturar logo_fit_mode (modo de ajuste da logo)
                        let salesPageLogoFitMode = 'contain'; // Padrão: completo, sem corte
                        if (modalOpenForSalesPage) {
                            const salesPageLogoFitModeInput = document.getElementById(`edit-logo-fit-mode-input-${itemId}`) ||
                                modalOpenForSalesPage.querySelector('.item-logo-fit-mode-input');
                            if (salesPageLogoFitModeInput && salesPageLogoFitModeInput.value) {
                                salesPageLogoFitMode = salesPageLogoFitModeInput.value;
                            } else {
                                // Tentar pegar do radio button selecionado
                                const salesPageLogoFitRadio = modalOpenForSalesPage.querySelector(`input[name="edit-logo-fit-mode-${itemId}"]:checked`);
                                if (salesPageLogoFitRadio) {
                                    salesPageLogoFitMode = salesPageLogoFitRadio.value;
                                }
                            }
                        }
                        if (salesPageLogoFitMode === 'contain') {
                            const salesPageLogoFitModeInputItem = itemEl.querySelector('.item-logo-fit-mode-input');
                            if (salesPageLogoFitModeInputItem && salesPageLogoFitModeInputItem.value) {
                                salesPageLogoFitMode = salesPageLogoFitModeInputItem.value;
                            } else {
                                // Tentar pegar do radio button selecionado na lista
                                const salesPageLogoFitRadioItem = itemEl.querySelector('input[name*="logo-fit-mode"]:checked');
                                if (salesPageLogoFitRadioItem) {
                                    salesPageLogoFitMode = salesPageLogoFitRadioItem.value;
                                }
                            }
                        }
                        // Se ainda não encontrou, tentar do item original
                        if (salesPageLogoFitMode === 'contain' && window.currentProfileData && window.currentProfileData.items) {
                            const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                            if (originalItem && originalItem.logo_fit_mode) {
                                salesPageLogoFitMode = originalItem.logo_fit_mode;
                            }
                        }
                        itemData.logo_fit_mode = salesPageLogoFitMode;
                        console.log(`Logo size para sales_page ${itemId}: ${salesPageLogoSizeValue}px, fit_mode: ${salesPageLogoFitMode}`);
                        break;
                    case 'banner':
                        itemData.icon_class = null;
                        itemData.pix_key = null;
                        itemData.pdf_url = null;

                        // Capturar campos do banner (fonte de verdade: modal se aberto, senão lista)
                        const destInputItem = itemEl.querySelector('.item-destination-url-input');
                        const nameInputItem = itemEl.querySelector('.item-banner-name-input');
                        const whatsappHiddenItem = itemEl.querySelector('.item-title-input-hidden');
                        const imageInputItem = itemEl.querySelector('.item-image-url-input');

                        const destInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);
                        const nameInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-banner-name`);
                        const whatsappInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-banner-title`);

                        // Tentar encontrar o campo de imagem de várias formas
                        let imageInputModal = document.getElementById('edit-image-url');
                        if (!imageInputModal) {
                            imageInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-image-url`);
                        }
                        if (!imageInputModal) {
                            imageInputModal = SELECTORS.editModalBody?.querySelector('#edit-image-url');
                        }
                        if (!imageInputModal) {
                            imageInputModal = document.querySelector('#edit-item-modal #edit-image-url');
                        }

                        console.log(`[BANNER] Capturando image_url para item ${itemId}:`);
                        console.log(`  - Modal aberto?`, !!document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`));
                        console.log(`  - imageInputModal encontrado?`, !!imageInputModal);
                        console.log(`  - imageInputModal.value:`, imageInputModal?.value);
                        console.log(`  - imageInputItem encontrado?`, !!imageInputItem);
                        console.log(`  - imageInputItem.value:`, imageInputItem?.value);

                        // image_url (priorizar modal se aberto, depois lista, depois dataset)
                        let imageValue = '';

                        // Primeiro tentar pegar do modal se estiver aberto para este item
                        const modalOpenForBanner = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                        if (modalOpenForBanner) {
                            // Se o modal está aberto, tentar pegar do campo do modal
                            if (imageInputModal && imageInputModal.value) {
                                const modalValue = imageInputModal.value.trim();
                                if (modalValue && !modalValue.includes('placeholder') && !modalValue.startsWith('data:image/svg')) {
                                    imageValue = modalValue;
                                    console.log(`[BANNER] Image URL do modal para item ${itemId}:`, imageValue);
                                }
                            }

                            // Se não encontrou no campo do modal, tentar pegar do preview do banner no modal
                            if (!imageValue) {
                                const bannerPreview = document.getElementById('edit-banner-preview');
                                if (bannerPreview && bannerPreview.src && !bannerPreview.src.includes('placeholder') && !bannerPreview.src.startsWith('data:image/svg')) {
                                    imageValue = bannerPreview.src;
                                    console.log(`[BANNER] Image URL do preview do modal para item ${itemId}:`, imageValue);
                                }
                            }
                        }

                        // Se não encontrou no modal, tentar na lista
                        if (!imageValue && imageInputItem && imageInputItem.value) {
                            const itemValue = imageInputItem.value.trim();
                            if (itemValue && !itemValue.includes('placeholder') && !itemValue.startsWith('data:image/svg')) {
                                imageValue = itemValue;
                                console.log(`[BANNER] Image URL da lista para item ${itemId}:`, imageValue);
                            }
                        }

                        // Se ainda não encontrou, tentar do preview na lista
                        if (!imageValue) {
                            const thumbPreview = itemEl.querySelector('.banner-preview-thumb');
                            if (thumbPreview && thumbPreview.src && !thumbPreview.src.includes('placeholder') && !thumbPreview.src.startsWith('data:image/svg')) {
                                imageValue = thumbPreview.src;
                                console.log(`[BANNER] Image URL do preview da lista para item ${itemId}:`, imageValue);
                            }
                        }

                        // Se ainda não encontrou, tentar do originalData como fallback
                        if (!imageValue && itemEl.dataset.originalData) {
                            try {
                                const originalData = JSON.parse(itemEl.dataset.originalData);
                                if (originalData.image_url && !originalData.image_url.includes('placeholder') && !originalData.image_url.startsWith('data:image/svg')) {
                                    imageValue = originalData.image_url.trim();
                                    console.log(`[BANNER] Image URL do originalData para item ${itemId}:`, imageValue);
                                }
                            } catch (e) {
                                console.warn('Erro ao parsear originalData:', e);
                            }
                        }

                        // Garantir que sempre tenha um valor válido (não vazio e não placeholder)
                        if (imageValue && !imageValue.includes('placeholder') && !imageValue.startsWith('data:image/svg')) {
                            itemData.image_url = imageValue;
                        } else {
                            itemData.image_url = null;
                        }

                        console.log(`[BANNER] Image URL FINAL capturado para item ${itemId}:`, itemData.image_url);
                        console.log(`[BANNER] itemData completo para banner:`, {
                            id: itemData.id,
                            item_type: itemData.item_type,
                            image_url: itemData.image_url,
                            title: itemData.title,
                            destination_url: itemData.destination_url
                        });

                        // destination_url (NÃO copiar a URL da imagem; só o que o usuário digitou)
                        // Helper para limpar destinos que contêm URLs de imagem ou listas
                        const sanitizeBannerDest = (raw) => {
                            if (!raw || typeof raw !== 'string') return '';
                            if (raw.startsWith('[')) return '';
                            // separar por vírgula e limpar entradas que sejam de imagem (imagedelivery)
                            const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                            const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                            return (filtered[0] || parts[0] || '').trim();
                        };

                        let destValue = '';
                        if (destInputModal && destInputModal.value) {
                            destValue = destInputModal.value.trim();
                        } else if (destInputItem && destInputItem.value) {
                            destValue = destInputItem.value.trim();
                        }
                        destValue = sanitizeBannerDest(destValue);
                        itemData.destination_url = env.serializeBannerDestination(destValue, '', '') || undefined;

                        // title (nome do banner) - priorizar modal
                        let bannerNameValue = '';
                        if (nameInputModal && nameInputModal.value) {
                            bannerNameValue = nameInputModal.value.trim();
                        } else if (nameInputItem && nameInputItem.value) {
                            bannerNameValue = nameInputItem.value.trim();
                        }
                        if (nameInputItem) nameInputItem.value = bannerNameValue;
                        itemData.title = bannerNameValue ? bannerNameValue.trim() : null;

                        // whatsapp_message
                        let whatsappValue = '';
                        if (whatsappInputModal && whatsappInputModal.value) {
                            whatsappValue = whatsappInputModal.value.trim();
                        } else if (whatsappHiddenItem && whatsappHiddenItem.value) {
                            whatsappValue = whatsappHiddenItem.value.trim();
                        }
                        if (whatsappHiddenItem) whatsappHiddenItem.value = whatsappValue;
                        itemData.whatsapp_message = whatsappValue ? whatsappValue.trim() : null;

                        itemData.aspect_ratio = itemEl.dataset.aspectRatio || 'tarja';
                        break;
                    case 'carousel':
                        // ===== NOVO CARROSSEL - Salvar =====
                        // Capturar título (priorizar modal se aberto, senão lista)
                        const carouselTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                        const carouselTitleInput = itemEl.querySelector('.item-title-input');
                        const carouselModuleName = itemEl.querySelector('.module-name');
                        itemData.title = carouselTitleModal || carouselTitleInput?.value?.trim() || carouselModuleName?.textContent?.trim() || 'Carrossel';
                        itemData.icon_class = null;
                        itemData.pix_key = null;
                        itemData.pdf_url = null;

                        // Capturar JSON de imagens - PRIORIDADE: modal primeiro, depois item
                        // Tentar múltiplos seletores para encontrar o input no modal
                        const carouselJsonInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .carousel-images-json-new[data-item-id="${itemId}"]`) ||
                            document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .carousel-images-json-new`) ||
                            document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url.carousel-images-json-new`) ||
                            document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);
                        const carouselJsonInputItem = itemEl.querySelector('.carousel-images-json-new');
                        const carouselImageInput = itemEl.querySelector('.item-image-url-input');

                        // Usar o valor do modal se existir e tiver conteúdo, senão usar o do item
                        let carouselJsonInput = null;
                        if (carouselJsonInputModal && carouselJsonInputModal.value && carouselJsonInputModal.value.trim()) {
                            carouselJsonInput = carouselJsonInputModal;
                        } else if (carouselJsonInputItem && carouselJsonInputItem.value && carouselJsonInputItem.value.trim()) {
                            carouselJsonInput = carouselJsonInputItem;
                        }

                        console.log(`[CARROSSEL] Salvando item ${itemId}:`, {
                            modalValue: carouselJsonInputModal?.value?.substring(0, 50) || 'vazio',
                            itemValue: carouselJsonInputItem?.value?.substring(0, 50) || 'vazio',
                            usando: carouselJsonInput === carouselJsonInputModal ? 'modal' : (carouselJsonInput === carouselJsonInputItem ? 'item' : 'nenhum')
                        });

                        // ===== NOVO CARROSSEL - Salvar imagens =====
                        if (carouselJsonInput && carouselJsonInput.value && carouselJsonInput.value.trim()) {
                            try {
                                const images = JSON.parse(carouselJsonInput.value);
                                if (Array.isArray(images) && images.length > 0) {
                                    // Filtrar placeholders antes de salvar
                                    const realImages = images.filter(img => {
                                        const url = typeof img === 'string' ? img : (img.image_url || img);
                                        return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                                    });
                                    if (realImages.length > 0) {
                                        itemData.destination_url = JSON.stringify(realImages);
                                        const firstImg = typeof realImages[0] === 'string' ? realImages[0] : (realImages[0].image_url || realImages[0]);
                                        itemData.image_url = firstImg;
                                        console.log(`[CARROSSEL] Salvando ${realImages.length} imagem(ns) para item ${itemId}`);
                                    } else {
                                        itemData.destination_url = JSON.stringify([]);
                                        itemData.image_url = '';
                                        console.log(`[CARROSSEL] Nenhuma imagem válida encontrada para item ${itemId}`);
                                    }
                                } else {
                                    itemData.destination_url = JSON.stringify([]);
                                    itemData.image_url = '';
                                    console.log(`[CARROSSEL] Array vazio ou inválido para item ${itemId}`);
                                }
                            } catch (e) {
                                console.error(`[CARROSSEL] Erro ao parsear imagens do item ${itemId}:`, e);
                                console.error(`   Valor:`, carouselJsonInput.value?.substring(0, 100));
                                itemData.destination_url = JSON.stringify([]);
                                itemData.image_url = '';
                            }
                        } else if (carouselImageInput && carouselImageInput.value && !carouselImageInput.value.includes('placeholder')) {
                            itemData.destination_url = JSON.stringify([carouselImageInput.value]);
                            itemData.image_url = carouselImageInput.value;
                            console.log(`[CARROSSEL] Usando image_url como fallback para item ${itemId}`);
                        } else {
                            itemData.destination_url = JSON.stringify([]);
                            itemData.image_url = '';
                            console.log(`[CARROSSEL] Nenhum dado encontrado para item ${itemId}`);
                        }
                        itemData.aspect_ratio = itemEl.dataset.aspectRatio || 'auto';
                        break;
                    case 'pix': case 'pix_qrcode':
                        itemData.title = itemEl.querySelector('.item-title-input')?.value;
                        itemData.pix_key = itemEl.querySelector('.item-pix-key-input')?.value;
                        itemData.recipient_name = itemEl.querySelector('.item-recipient-name-input')?.value;
                        itemData.pix_amount = itemEl.querySelector('.item-pix-amount-input')?.value;
                        itemData.pix_description = itemEl.querySelector('.item-pix-description-input')?.value;
                        itemData.icon_class = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim();
                        break;
                    case 'wifi': {
                        const titleWifiModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                        itemData.title = (titleWifiModal !== undefined ? titleWifiModal : itemEl.querySelector('.item-title-input')?.value)?.trim() || 'Wi-Fi';
                        const fmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                        const ssid = itemEl.querySelector('.wifi-ssid-input')?.value?.trim() || '';
                        const password = itemEl.querySelector('.wifi-password-input')?.value ?? '';
                        const security = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
                        const hidden = !!itemEl.querySelector('.wifi-hidden-input')?.checked;
                        const bannerUrl = itemEl.querySelector('.wifi-banner-url-input')?.value?.trim() || '';
                        const logoUrl = itemEl.querySelector('.wifi-logo-url-input')?.value?.trim() || '';
                        let logoSizeVal = parseInt(itemEl.querySelector('.wifi-logo-size-input')?.value, 10);
                        if (isNaN(logoSizeVal) || logoSizeVal < 20) {
                            logoSizeVal = parseInt(itemEl.dataset.logoSize, 10);
                        }
                        if (isNaN(logoSizeVal) || logoSizeVal < 20) logoSizeVal = 48;
                        logoSizeVal = Math.min(600, Math.max(20, logoSizeVal));
                        const wifiPayload = {
                            ssid,
                            password,
                            security,
                            hidden,
                            display_format: fmt,
                            banner_image_url: bannerUrl,
                            logo_url: logoUrl,
                            logo_size: logoSizeVal
                        };
                        itemData.destination_url = JSON.stringify(wifiPayload);
                        itemData.pix_key = null;
                        itemData.pdf_url = null;
                        itemData.image_url = fmt === 'banner' && bannerUrl ? bannerUrl : (logoUrl || null);
                        itemData.logo_size = logoSizeVal;
                        const wifiIconEl = itemEl.querySelector('.item-icon-picker i');
                        itemData.icon_class = wifiIconEl ? wifiIconEl.className.trim() : env.getDefaultIcon('wifi');
                        break;
                    }
                    case 'texto_com_botao': {
                        const escTitle = itemEl.querySelector('.tcb-title-input')?.value?.trim()
                            || itemEl.querySelector('.item-title-input')?.value?.trim()
                            || 'Título';
                        const buttonLabel = itemEl.querySelector('.tcb-button-label-input')?.value?.trim() || 'Inscrever-se';
                        const eyebrow = itemEl.querySelector('.tcb-eyebrow-input')?.value?.trim() || '';
                        const url = itemEl.querySelector('.tcb-url-input')?.value?.trim()
                            || itemEl.querySelector('.item-destination-url-input')?.value?.trim()
                            || '';
                        const line1 = itemEl.querySelector('.tcb-line1-input')?.value?.trim() || '';
                        const line2 = itemEl.querySelector('.tcb-line2-input')?.value?.trim() || '';
                        const line3 = itemEl.querySelector('.tcb-line3-input')?.value?.trim() || '';
                        const icon1 = itemEl.querySelector('.tcb-icon1-input')?.value?.trim() || '';
                        const icon2 = itemEl.querySelector('.tcb-icon2-input')?.value?.trim() || '';
                        const icon3 = itemEl.querySelector('.tcb-icon3-input')?.value?.trim() || '';
                        const template = itemEl.querySelector('.tcb-template-input')?.value || 'evento';
                        const lines = [];
                        if (line1) lines.push({ icon: icon1, text: line1 });
                        if (line2) lines.push({ icon: icon2, text: line2 });
                        if (line3) lines.push({ icon: icon3, text: line3 });
                        itemData.title = escTitle;
                        itemData.destination_url = JSON.stringify({
                            url: url,
                            button_label: buttonLabel,
                            eyebrow: eyebrow,
                            lines: lines,
                            template: template
                        });
                        itemData.icon_class = env.getDefaultIcon('texto_com_botao');
                        break;
                    }
                    case 'pdf': case 'pdf_embed':
                        const pdfUrl = itemEl.querySelector('.item-pdf-url-input')?.value;
                        itemData.title = itemEl.querySelector('.item-title-input')?.value;
                        itemData.pdf_url = pdfUrl;
                        itemData.destination_url = pdfUrl;
                        break;
                }
                return itemData;
            })
            .filter(item => item !== null); // Remover itens inválidos

        // Validar que temos dados para salvar (itens OU configurações do perfil)
        // Permitir salvar mesmo sem itens, pois o usuário pode estar salvando apenas configurações do perfil
        if (saveData.items.length === 0) {
            console.warn('Nenhum módulo encontrado na lista. Salvando apenas configurações do perfil.');
            // Não bloquear o salvamento - apenas avisar no console
            // O usuário pode estar salvando apenas configurações do perfil (cores, nome, bio, etc)
        }

        // Garantir que items seja sempre um array (mesmo que vazio)
        if (!saveData.items || !Array.isArray(saveData.items)) {
            saveData.items = [];
        }

        // Incluir itens que estão no perfil (servidor) mas não apareceram no DOM, para não serem deletados no save-all
        const serverItems = (window.currentProfileData && window.currentProfileData.items) || [];
        const excludedFromList = ['sales_page', 'king_selection', 'bible'];
        const savedIds = new Set(saveData.items.map(i => i && i.id).filter(Boolean));
        let addedFromServer = 0;
        window.__mergedServerItemIdsForSave = new Set();
        serverItems.forEach(serverItem => {
            if (excludedFromList.indexOf(serverItem.item_type) !== -1) return;
            if (savedIds.has(serverItem.id)) return;
            saveData.items.push({
                id: serverItem.id,
                item_type: serverItem.item_type,
                title: serverItem.title || '',
                display_order: serverItem.display_order !== undefined ? serverItem.display_order : 999,
                is_active: serverItem.is_active !== false
            });
            savedIds.add(serverItem.id);
            window.__mergedServerItemIdsForSave.add(serverItem.id);
            addedFromServer++;
        });
        if (addedFromServer > 0) {
            console.log(addedFromServer + ' item(ns) do servidor que não estavam no DOM foram incluídos no save para não sumir do cartão público.');
        }

        // IMPORTANTE: Verificar se há sales_page no array antes de enviar
        console.log('=== DADOS ENVIADOS PARA SALVAR ===');
        console.log(`Total de itens: ${saveData.items.length}`);
        console.log('Items completos:', JSON.stringify(saveData.items, null, 2));
        saveData.items.forEach((item, idx) => {
            console.log(`Item ${idx} (${item.item_type}):`, {
                id: item.id,
                title: item.title,
                is_active: item.is_active,
                display_order: item.display_order,
                destination_url: item.destination_url,
                image_url: item.image_url,
                logo_size: item.logo_size
            });
        });

        // IMPORTANTE: Verificar ordem visual atual no DOM antes de enviar
        const currentVisualOrder = Array.from(SELECTORS.itemsContainer.children).map((el, idx) => ({
            index: idx,
            id: el.dataset.id,
            type: el.dataset.itemType,
            displayOrder: el.dataset.displayOrder || (idx + 1)
        }));
        console.log('=== ORDEM VISUAL ATUAL NO DOM ===');
        console.log(JSON.stringify(currentVisualOrder, null, 2));

        // SIMPLIFICADO: Sales_page agora salva diretamente quando você clica em "Salvar" na página de vendas
        // Não precisa mais aplicar alterações pendentes aqui - os dados já estão salvos no servidor
        // O botão "Publicar alterações" apenas atualiza o status se necessário

        console.log('Enviando requisição para:', `${env.API_URL}/api/profile/save-all`);
        console.log('Dados sendo enviados:', {
            itemsCount: saveData.items?.length || 0,
            hasDetails: !!saveData.details,
            items: saveData.items?.map(item => ({
                id: item.id,
                type: item.item_type,
                title: item.title,
                is_active: item.is_active
            }))
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout

        let response;
        try {
            response = await fetch(`${env.API_URL}/api/profile/save-all`, {
                method: 'PUT',
                headers: env.HEADERS,
                body: JSON.stringify(saveData),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('A requisição demorou muito tempo. Verifique sua conexão e tente novamente.');
            }
            throw new Error(`Erro de rede: ${fetchError.message}`);
        }

        console.log('Resposta recebida:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        let result;
        try {
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('Resposta vazia do servidor');
            }
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Erro ao parsear resposta:', parseError);
            console.error('O Response status:', response.status);
            console.error('O Response headers:', Object.fromEntries(response.headers.entries()));
            throw new Error('Erro ao processar resposta do servidor. Tente novamente.');
        }

        if (!response.ok) {
            console.error('Erro ao salvar:', {
                status: response.status,
                statusText: response.statusText,
                result: result
            });
            const errorMessage = result?.message ||
                (response.status === 400 ? 'Dados inválidos. Verifique os campos preenchidos.' :
                    response.status === 401 ? 'Sessão expirada. Faça login novamente.' :
                        response.status === 403 ? 'Você não tem permissão para realizar esta ação.' :
                            response.status === 500 ? 'Erro interno do servidor. Tente novamente mais tarde.' :
                                `Erro ${response.status}: ${response.statusText}`);
            throw new Error(errorMessage);
        }

        console.log('Dados salvos com sucesso:', result);
        console.log('Resposta completa:', JSON.stringify(result, null, 2));

        try {
            if (window.DashboardPersonalizar && typeof window.DashboardPersonalizar.reloadPreview === 'function') {
                window.DashboardPersonalizar.reloadPreview(result.timestamp || Date.now());
            }
        } catch (ePrev) { /* preview opcional */ }

        // Salvar toggle Bíblia (visível/oculto) + posição/tamanho da Palavra do Dia
        // IMPORTANTE: Sempre salvar quando bibleItem existe - não depender de display (usuário pode estar em outra aba)
        const bibleItem = (window.currentProfileData?.items || saveData.items || []).find(function (it) { return it.item_type === 'bible'; });
        const bibleSetting = document.getElementById('bible-visibility-setting');
        if (bibleItem && bibleSetting) {
            const bibleToggleChecked = document.querySelector('input[name="bible-toggle"]:checked');
            const isVisible = bibleToggleChecked ? bibleToggleChecked.value === 'true' : true;
            const posChecked = document.querySelector('input[name="bible-verse-position"]:checked');
            const verse_position = posChecked && posChecked.value === 'bottom' ? 'bottom' : 'top';
            const sizeChecked = document.querySelector('input[name="bible-verse-size"]:checked');
            const sizeVal = sizeChecked ? sizeChecked.value : 'normal';
            const verse_size = ['small', 'xsmall'].includes(sizeVal) ? sizeVal : 'normal';
            try {
                const bibleRes = await fetch(`${env.API_URL}/api/bible/config/${bibleItem.id}`, {
                    method: 'PUT',
                    headers: env.HEADERS,
                    body: JSON.stringify({ is_visible: isVisible, verse_position, verse_size })
                });
                if (bibleRes.ok) {
                    if (window.currentProfileData && window.currentProfileData.items) {
                        const bi = window.currentProfileData.items.find(function (it) { return it.item_type === 'bible'; });
                        if (bi) {
                            if (!bi.bible_data) bi.bible_data = {};
                            bi.bible_data.is_visible = isVisible;
                            bi.bible_data.verse_position = verse_position;
                            bi.bible_data.verse_size = verse_size;
                        }
                    }
                    console.log('Config Bíblia salva:', { isVisible, verse_position, verse_size });
                }
            } catch (bibleErr) {
                console.warn('Erro ao salvar config Bíblia:', bibleErr);
            }
        }

        // Atualizar os itens na lista usando os dados retornados pela API (em tempo real)
        if (result.items && Array.isArray(result.items)) {
            console.log(` Atualizando ${result.items.length} itens na interface usando dados da API...`);
            for (const itemData of result.items) {
                // Pular sales_page - eles são atualizados separadamente
                if (itemData.item_type === 'sales_page') {
                    continue;
                }

                // Usar a função centralizada para atualizar cada item
                await env.updateItemFromApiResponse(itemData.id, itemData, itemData.item_type);
            }
            console.log(`Todos os itens atualizados em tempo real`);
        } else {
            console.warn('Resposta da API não contém items. Usando dados locais como fallback.');
            // Fallback: atualizar usando saveData.items (dados enviados)
            saveData.items.forEach(itemData => {
                const itemEl = document.querySelector(`.item[data-id="${itemData.id}"], .module-item[data-id="${itemData.id}"]`);
                if (!itemEl) {
                    console.warn(`Item ${itemData.id} não encontrado no DOM após salvar`);
                    return;
                }

                // Se for banner, atualizar as imagens (código antigo como fallback)
                if (itemData.item_type === 'banner') {
                    const imageUrlInput = itemEl.querySelector('.item-image-url-input');
                    const destUrlInput = itemEl.querySelector('.item-destination-url-input');
                    const previewThumb = itemEl.querySelector('.banner-preview-thumb');
                    const nameInput = itemEl.querySelector('.item-banner-name-input');
                    const whatsappHidden = itemEl.querySelector('.item-title-input-hidden');
                    const originalDataRaw = itemEl.dataset.originalData ? itemEl.dataset.originalData : null;

                    // Extrair image_url corretamente (pode ser string ou objeto)
                    let imageUrl = itemData.image_url || '';
                    if (imageUrl && typeof imageUrl === 'object') {
                        imageUrl = imageUrl.image_url || imageUrl || '';
                    }
                    if (typeof imageUrl !== 'string') {
                        imageUrl = '';
                    }

                    if (imageUrlInput) {
                        imageUrlInput.value = imageUrl;
                    }

                    // Sanitizar destination_url que vem do servidor (pode vir como JSON ou com URLs de imagem)
                    const sanitizeBannerDestFromServer = (raw) => {
                        if (!raw || typeof raw !== 'string') return '';
                        if (raw.startsWith('[')) return '';
                        const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                        const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                        return (filtered[0] || parts[0] || '').trim();
                    };
                    const sanitizedDest = sanitizeBannerDestFromServer(itemData.destination_url || '');

                    if (destUrlInput) {
                        destUrlInput.value = sanitizedDest;
                    }

                    // Atualizar preview
                    if (previewThumb && imageUrl) {
                        previewThumb.src = imageUrl;
                        previewThumb.style.display = 'block';
                    } else if (previewThumb && !imageUrl) {
                        previewThumb.style.display = 'none';
                    }

                    // Atualizar display do destino (usar valor sanitizado)
                    const displayDest = itemEl.querySelector('.item-display-dest');
                    if (displayDest) {
                        displayDest.textContent = sanitizedDest ? sanitizedDest : 'Sem destino';
                    }

                    // Atualizar nome e mensagem
                    if (nameInput) {
                        nameInput.value = itemData.title || 'Banner';
                    }
                    if (whatsappHidden) {
                        whatsappHidden.value = itemData.whatsapp_message || '';
                    }

                    // Atualizar originalData para refletir o salvo (usar destino já sanitizado)
                    if (originalDataRaw) {
                        try {
                            const original = JSON.parse(originalDataRaw);
                            original.title = itemData.title || '';
                            original.destination_url = sanitizedDest; // Já sanitizado acima
                            original.image_url = imageUrl;
                            original.whatsapp_message = itemData.whatsapp_message || '';
                            itemEl.dataset.originalData = JSON.stringify(original);
                        } catch (e) {
                            console.warn('Banner: não foi possível atualizar originalData', e);
                        }
                    }
                }
            });
        }

        alert('Alterações publicadas com sucesso!');

        // Fechar modal de edição se estiver aberto
        if (SELECTORS.editItemModal) {
            SELECTORS.editItemModal.classList.remove('active');
        }

        // IMPORTANTE: Capturar ordem visual atual ANTES de qualquer processamento
        // Isso permite preservar a ordem que o usuário configurou, independente do caminho de código
        let visualOrderMap = new Map();
        const allCurrentItemsBeforeProcessing = document.querySelectorAll('#items-container .item[data-id], #items-container .module-item[data-id]');
        allCurrentItemsBeforeProcessing.forEach((itemEl, visualIndex) => {
            const itemId = itemEl.dataset.id;
            if (itemId && !itemId.toString().startsWith('temp_')) {
                // Mapear ID do item para sua posição visual atual (1-indexed)
                visualOrderMap.set(String(itemId), visualIndex + 1);
            }
        });
        console.log(`Y"< Ordem visual capturada ANTES de processar: ${visualOrderMap.size} itens`, Array.from(visualOrderMap.entries()));

        // IMPORTANTE: Verificar se há itens sales_page na lista
        // Se houver, buscar dados atualizados APENAS do sales_page e atualizar localmente
        // NÃO recarregar todos os dados para evitar sobrescrever alterações salvas na página de vendas
        const salesPageElements = document.querySelectorAll('#items-container .item[data-item-type="sales_page"], #items-container .module-item[data-item-type="sales_page"]');
        const hasSalesPageItems = salesPageElements.length > 0;

        if (hasSalesPageItems) {
            console.log(`Detectado ${salesPageElements.length} item(ns) sales_page na lista.`);
            console.log('Buscando dados atualizados APENAS do sales_page para preservar alterações salvas.');

            // Buscar dados atualizados de cada sales_page diretamente do servidor
            for (const itemEl of salesPageElements) {
                const itemId = itemEl.dataset.id;
                if (itemId && !itemId.toString().startsWith('temp_')) {
                    try {
                        console.log(`Buscando dados atualizados do sales_page ${itemId}...`);
                        const itemResponse = await fetch(`${env.API_URL}/api/profile/items/${itemId}`, {
                            method: 'GET',
                            headers: env.HEADERS
                        });

                        if (itemResponse.ok) {
                            const itemData = await itemResponse.json();
                            const salesPageData = itemData.data || itemData;

                            // Atualizar dados no window.currentProfileData
                            if (!window.currentProfileData) {
                                window.currentProfileData = { details: {}, items: [] };
                            }
                            if (!window.currentProfileData.items) {
                                window.currentProfileData.items = [];
                            }

                            const updatedSalesPageItem = {
                                id: parseInt(itemId, 10),
                                item_type: 'sales_page',
                                title: salesPageData.title || 'Página de Vendas',
                                image_url: salesPageData.image_url || null,
                                logo_size: salesPageData.logo_size || 24,
                                is_active: salesPageData.is_active !== false,
                                display_order: salesPageData.display_order || 999,
                                destination_url: salesPageData.destination_url || null,
                                icon_class: salesPageData.icon_class || 'fas fa-store'
                            };

                            const itemIndex = window.currentProfileData.items.findIndex(item =>
                                String(item.id) === String(itemId) && item.item_type === 'sales_page'
                            );

                            if (itemIndex !== -1) {
                                // Atualizar item existente com dados do servidor
                                window.currentProfileData.items[itemIndex] = updatedSalesPageItem;
                                console.log(`Dados do sales_page ${itemId} atualizados em currentProfileData:`, {
                                    title: salesPageData.title,
                                    image_url: salesPageData.image_url?.substring(0, 50) || 'null',
                                    logo_size: salesPageData.logo_size || 24
                                });
                            } else {
                                // Adicionar item se não existir
                                window.currentProfileData.items.push(updatedSalesPageItem);
                                console.log(`Dados do sales_page ${itemId} adicionados em currentProfileData:`, {
                                    title: salesPageData.title,
                                    image_url: salesPageData.image_url?.substring(0, 50) || 'null',
                                    logo_size: salesPageData.logo_size || 24
                                });
                            }
                        } else {
                            console.warn(`Não foi possível buscar dados atualizados do sales_page ${itemId}`);
                        }
                    } catch (error) {
                        console.error(`Erro ao buscar dados atualizados do sales_page ${itemId}:`, error);
                    }
                }
            }

            // IMPORTANTE: Aplicar ordem visual preservada aos dados ANTES de renderizar
            // Mas apenas se houver dados e ordem visual capturada
            if (window.currentProfileData && window.currentProfileData.items) {
                if (visualOrderMap.size > 0) {
                    console.log(' Aplicando ordem visual preservada aos dados antes de renderizar...');
                    window.currentProfileData.items.forEach(item => {
                        const itemId = String(item.id);
                        const visualOrder = visualOrderMap.get(itemId);
                        if (visualOrder !== undefined) {
                            const oldOrder = item.display_order;
                            item.display_order = visualOrder;
                            if (oldOrder !== visualOrder) {
                                console.log(` Item ${itemId}: display_order ${oldOrder} -> ${visualOrder}`);
                            }
                        }
                    });

                    // Re-ordenar itens baseado na ordem visual preservada
                    window.currentProfileData.items.sort((a, b) => {
                        const orderA = visualOrderMap.get(String(a.id)) || a.display_order || 9999;
                        const orderB = visualOrderMap.get(String(b.id)) || b.display_order || 9999;
                        return orderA - orderB;
                    });
                    console.log('Ordem visual aplicada aos dados');
                } else {
                    console.log('Ordem visual não capturada, usando ordem do servidor');
                }
            } else {
                console.error('O window.currentProfileData ou items não existe!');
            }

            console.log('NÃO recarregando todos os dados para preservar alterações salvas na página de vendas.');
            console.log('Os dados da página de vendas foram atualizados diretamente do servidor.');
            console.log('O botão "Publicar alterações" apenas publica os outros módulos, não afeta a página de vendas.');

            // Re-renderizar para garantir que os dados atualizados do sales_page sejam exibidos
            if (window.currentProfileData) {
                env.renderEditor(window.currentProfileData);
            }

            // IMPORTANTE: Após renderizar, garantir que a ordem visual seja mantida no DOM
            requestAnimationFrame(() => {
                const container = SELECTORS.itemsContainer || document.getElementById('items-container');
                if (container && visualOrderMap.size > 0) {
                    const itemsInDOM = Array.from(container.children);

                    // Verificar se precisa reordenar
                    let needsReorder = false;
                    itemsInDOM.forEach((item, index) => {
                        const itemId = String(item.dataset.id);
                        const expectedOrder = visualOrderMap.get(itemId);
                        if (expectedOrder !== undefined && expectedOrder !== (index + 1)) {
                            needsReorder = true;
                        }
                    });

                    if (needsReorder) {
                        console.log(' Reordenando elementos no DOM para manter ordem visual (caminho sales_page)...');

                        // Criar array ordenado baseado na ordem visual
                        const sortedItems = itemsInDOM.slice().sort((a, b) => {
                            const idA = String(a.dataset.id);
                            const idB = String(b.dataset.id);
                            const orderA = visualOrderMap.get(idA) || parseInt(a.dataset.displayOrder || '9999', 10);
                            const orderB = visualOrderMap.get(idB) || parseInt(b.dataset.displayOrder || '9999', 10);
                            return orderA - orderB;
                        });

                        // Reordenar no DOM
                        sortedItems.forEach(item => {
                            container.appendChild(item);
                            // Atualizar data-display-order no elemento
                            const itemId = String(item.dataset.id);
                            const visualOrder = visualOrderMap.get(itemId);
                            if (visualOrder !== undefined) {
                                item.dataset.displayOrder = visualOrder;
                                item.setAttribute('data-display-order', visualOrder);
                            }
                        });

                        console.log('Elementos reordenados no DOM (caminho sales_page)');

                        // Re-inicializar Sortable após reordenar
                        if (typeof initSortable === 'function') {
                            setTimeout(() => {
                                env.initSortable();
                                console.log('Sortable reinicializado após reordenar (caminho sales_page)');
                            }, 50);
                        }
                    } else {
                        console.log('Elementos já estão na ordem correta no DOM (caminho sales_page)');
                    }
                }
            });

            // Atualizar preview local
            env.updateLivePreviewFromForm();
            console.log('Alterações publicadas sem recarregar todos os dados (preservando alterações da página de vendas)');
            return; // Retornar cedo para não recarregar todos os dados
        }

        // IMPORTANTE: Se não há sales_page, usar a ordem visual já capturada acima
        // Se visualOrderMap estiver vazio (não foi capturado), capturar agora
        if (visualOrderMap.size === 0) {
            const allCurrentItems = document.querySelectorAll('#items-container .item[data-id], #items-container .module-item[data-id]');
            allCurrentItems.forEach((itemEl, visualIndex) => {
                const itemId = itemEl.dataset.id;
                if (itemId && !itemId.toString().startsWith('temp_')) {
                    // Mapear ID do item para sua posição visual atual (1-indexed)
                    visualOrderMap.set(String(itemId), visualIndex + 1);
                }
            });
        }

        const itemsInDOM = new Set();
        visualOrderMap.forEach((order, itemId) => {
            itemsInDOM.add(itemId);
        });

        console.log(`Y"< Ordem visual capturada: ${visualOrderMap.size} itens`, Array.from(visualOrderMap.entries()));
        console.log(`Y"< Itens no DOM antes de recarregar: ${itemsInDOM.size}`, Array.from(itemsInDOM));

        // Aguardar um pouco antes de recarregar para garantir que o servidor processou tudo
        // Isso evita que elementos sumam e voltem rapidamente
        console.log('⏳ Aguardando processamento do servidor...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Aumentar delay para 1.5s para garantir que DELETE foi processado

        // Preservar valor do WhatsApp antes de recarregar (caso a coluna não exista no banco)
        const preservedWhatsapp = SELECTORS.whatsappNumberInput?.value || '';
        console.log('[SAVE-ALL] Preservando valor do WhatsApp antes de recarregar:', preservedWhatsapp);

        // Preservar fundo do cartão e fundo de tela antes de recarregar (evita "salva mas some")
        const preservedFundo = {
            background_type: (document.querySelector('input[name="bg-type"]:checked') || {}).value || 'color',
            background_color: SELECTORS.backgroundColorPicker?.value || '#0D0D0F',
            background_image_url: SELECTORS.backgroundImageUrlInput?.value ?? '',
            background_image_opacity: SELECTORS.backgroundImageOpacityPicker ? parseFloat(SELECTORS.backgroundImageOpacityPicker.value) : 1,
            card_background_color: SELECTORS.cardBackgroundColorPicker?.value || '#141417',
            card_opacity: SELECTORS.cardOpacityPicker ? parseFloat(SELECTORS.cardOpacityPicker.value) : 1
        };
        console.log('YZ [SAVE-ALL] Preservando fundo antes de recarregar:', preservedFundo);

        // Recarregar dados do servidor para garantir sincronização
        // Isso é necessário para garantir que novos módulos apareçam no cartão público
        console.log(' Recarregando dados do servidor após salvar...');
        try {
            await env.fetchProfileData(true); // Forçar atualização imediata

            // Se o WhatsApp não veio do servidor mas tinha valor antes, restaurar
            if (preservedWhatsapp && (!window.currentProfileData?.details?.whatsapp || window.currentProfileData.details.whatsapp === '')) {
                console.log('[SAVE-ALL] Restaurando valor do WhatsApp preservado:', preservedWhatsapp);
                if (SELECTORS.whatsappNumberInput) {
                    SELECTORS.whatsappNumberInput.value = preservedWhatsapp;
                }
                if (window.currentProfileData && window.currentProfileData.details) {
                    window.currentProfileData.details.whatsapp = preservedWhatsapp;
                }
            }

            // Restaurar fundo do cartão se a API retornou vazio/default (evita "salva mas some")
            const d = window.currentProfileData?.details;
            const cardColorOk = (d?.card_background_color ?? d?.cardBackgroundColor ?? '').toString().length > 0;
            const cardOpacityOk = (d?.card_opacity ?? d?.cardOpacity) != null;
            const needRestoreFundo = !d || !cardColorOk || !cardOpacityOk;
            if (needRestoreFundo && preservedFundo) {
                console.log('YZ [SAVE-ALL] Restaurando fundo preservado (API retornou vazio/default)');
                if (SELECTORS.cardBackgroundColorPicker) SELECTORS.cardBackgroundColorPicker.value = preservedFundo.card_background_color;
                if (SELECTORS.cardOpacityPicker) SELECTORS.cardOpacityPicker.value = String(preservedFundo.card_opacity);
                if (SELECTORS.backgroundColorPicker) SELECTORS.backgroundColorPicker.value = preservedFundo.background_color;
                if (SELECTORS.backgroundImageUrlInput) SELECTORS.backgroundImageUrlInput.value = preservedFundo.background_image_url || '';
                if (SELECTORS.backgroundImageOpacityPicker) SELECTORS.backgroundImageOpacityPicker.value = String(preservedFundo.background_image_opacity);
                if (SELECTORS.backgroundImagePreview && preservedFundo.background_image_url) {
                    SELECTORS.backgroundImagePreview.src = preservedFundo.background_image_url;
                }
                const bgRadio = document.querySelector(`input[name="bg-type"][value="${preservedFundo.background_type}"]`);
                if (bgRadio) bgRadio.checked = true;
                if (preservedFundo.background_type === 'image') {
                    if (SELECTORS.backgroundColorContainer) SELECTORS.backgroundColorContainer.style.display = 'none';
                    if (SELECTORS.backgroundImageContainer) SELECTORS.backgroundImageContainer.style.display = 'block';
                } else {
                    if (SELECTORS.backgroundColorContainer) SELECTORS.backgroundColorContainer.style.display = 'block';
                    if (SELECTORS.backgroundImageContainer) SELECTORS.backgroundImageContainer.style.display = 'none';
                }
                if (d) {
                    d.card_background_color = preservedFundo.card_background_color;
                    d.card_opacity = preservedFundo.card_opacity;
                    d.background_type = preservedFundo.background_type;
                    d.background_color = preservedFundo.background_color;
                    d.background_image_url = preservedFundo.background_image_url;
                    d.background_image_opacity = preservedFundo.background_image_opacity;
                }
                if (typeof updateLivePreviewFromForm === 'function') env.updateLivePreviewFromForm();
            }

            // Após recarregar do servidor: confiar na API (não remover módulos só porque faltavam no DOM)
            if (window.currentProfileData && window.currentProfileData.items) {
                try { delete window.__mergedServerItemIdsForSave; } catch (e) {}

                // Aplicar ordem visual que estava antes de recarregar
                // Isso garante que a ordem configurada pelo usuário seja preservada
                let orderUpdated = false;
                window.currentProfileData.items.forEach(item => {
                    const itemId = String(item.id);
                    const visualOrder = visualOrderMap.get(itemId);
                    if (visualOrder !== undefined) {
                        const oldOrder = item.display_order;
                        item.display_order = visualOrder;
                        if (oldOrder !== visualOrder) {
                            console.log(` Aplicando ordem visual ao item ${itemId}: ${oldOrder} -> ${visualOrder}`);
                            orderUpdated = true;
                        }
                    }
                });

                // Re-ordenar itens baseado na ordem visual preservada ANTES de renderizar
                // Isso garante que renderEditor receba os itens já na ordem correta
                window.currentProfileData.items.sort((a, b) => {
                    const orderA = visualOrderMap.get(String(a.id)) || a.display_order || 9999;
                    const orderB = visualOrderMap.get(String(b.id)) || b.display_order || 9999;
                    return orderA - orderB;
                });

                if (orderUpdated || visualOrderMap.size > 0) {
                    console.log('Ordem visual preservada e aplicada aos dados recarregados');
                    console.log('Y"S Ordem final dos itens:', window.currentProfileData.items.map(item => ({
                        id: item.id,
                        type: item.item_type,
                        display_order: item.display_order,
                        visualOrder: visualOrderMap.get(String(item.id))
                    })));
                }

                // Re-renderizar lista de módulos (Wi-Fi e outros que estavam no servidor mas não no DOM)
                console.log(' Renderizando lista de módulos após publicar...');
                if (window.currentProfileData) {
                    env.renderEditor(window.currentProfileData);
                    reconcileModulesListWithProfileData(window.currentProfileData);
                }

                // Atualizar preview após renderEditor
                // Usar múltiplos requestAnimationFrame para garantir que o DOM foi completamente atualizado
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            console.log(' Forçando atualização do preview após renderEditor...');
                            env.updateLivePreviewFromForm();
                            console.log('Preview atualizado após recarregar dados');
                        }, 500);
                    });
                });

                // IMPORTANTE: Após renderizar, garantir que a ordem visual seja mantida no DOM
                // Reordenar os elementos no DOM baseado na ordem visual preservada
                // Usar requestAnimationFrame para garantir que o DOM foi atualizado
                requestAnimationFrame(() => {
                    const container = SELECTORS.itemsContainer || document.getElementById('items-container');
                    if (container && visualOrderMap.size > 0) {
                        const itemsInDOM = Array.from(container.children);

                        // Verificar se precisa reordenar
                        let needsReorder = false;
                        itemsInDOM.forEach((item, index) => {
                            const itemId = String(item.dataset.id);
                            const expectedOrder = visualOrderMap.get(itemId);
                            if (expectedOrder !== undefined && expectedOrder !== (index + 1)) {
                                needsReorder = true;
                            }
                        });

                        if (needsReorder) {
                            console.log(' Reordenando elementos no DOM para manter ordem visual...');

                            // Criar array ordenado baseado na ordem visual
                            const sortedItems = itemsInDOM.slice().sort((a, b) => {
                                const idA = String(a.dataset.id);
                                const idB = String(b.dataset.id);
                                const orderA = visualOrderMap.get(idA) || parseInt(a.dataset.displayOrder || '9999', 10);
                                const orderB = visualOrderMap.get(idB) || parseInt(b.dataset.displayOrder || '9999', 10);
                                return orderA - orderB;
                            });

                            // Reordenar no DOM
                            sortedItems.forEach(item => {
                                container.appendChild(item);
                                // Atualizar data-display-order no elemento
                                const itemId = String(item.dataset.id);
                                const visualOrder = visualOrderMap.get(itemId);
                                if (visualOrder !== undefined) {
                                    item.dataset.displayOrder = visualOrder;
                                    item.setAttribute('data-display-order', visualOrder);
                                }
                            });

                            console.log('Elementos reordenados no DOM');

                            // Re-inicializar Sortable após reordenar
                            if (typeof initSortable === 'function') {
                                setTimeout(() => {
                                    env.initSortable();
                                    console.log('Sortable reinicializado após reordenar');
                                }, 50);
                            }
                        } else {
                            console.log('Elementos já estão na ordem correta no DOM');
                        }

                        // IMPORTANTE: Atualizar preview ao vivo após reordenar DOM
                        // Isso garante que o preview mostre as alterações imediatamente
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                env.updateLivePreviewFromForm();
                                console.log('Preview atualizado após reordenar DOM');
                            }, 100);
                        });
                    }
                });
            } else {
                // Se não precisou reordenar, atualizar preview imediatamente
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            console.log(' Forçando atualização do preview após recarregar (sem reordenar)...');
                            env.updateLivePreviewFromForm();
                            console.log('Preview atualizado após recarregar (sem reordenar)');
                        }, 500);
                    });
                });
            }

            console.log('Dados recarregados com ordem visual preservada');

        } catch (fetchError) {
            console.error('Erro ao recarregar dados após salvar:', fetchError);
            // Não mostrar erro para o usuário, pois os dados já foram salvos
            // Apenas logar para debug
            // Mesmo com erro, atualizar preview com os dados atuais
            env.updateLivePreviewFromForm();
        }

    } catch (error) {
        console.error("Erro em saveAllChanges:", error);
        console.error("O Stack trace:", error.stack);
        console.error("Error details:", {
            name: error.name,
            message: error.message,
            cause: error.cause
        });

        // Mostrar mensagem de erro mais detalhada
        let errorMessage = error.message || 'Erro desconhecido ao salvar';
        if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('timeout') || error.message.includes('demorou muito')) {
            errorMessage = 'A requisição demorou muito tempo. Tente novamente.';
        } else if (error.message.includes('parsear') || error.message.includes('processar resposta')) {
            errorMessage = 'Erro ao processar resposta do servidor. Tente novamente.';
        }

        alert(`ERRO ao salvar: ${errorMessage}`);
    } finally {
        // Restaurar botão que foi clicado
        const clickedBtn = (event && event.target) || (event && event.currentTarget) || document.getElementById('header-save-btn') || document.getElementById('mobile-save-all-btn');
        if (clickedBtn) {
            clickedBtn.disabled = false;
            clickedBtn.innerHTML = '<i class="fas fa-check"></i> Publicar alterações';
        }
    }
}



    var DashboardSave = {
        saveAllChanges: saveAllChanges
    };
    global.DashboardSave = DashboardSave;
    global.saveAllChanges = saveAllChanges;

})(typeof window !== 'undefined' ? window : this);
