/**
 * Dashboard Editor — renderEditor isolado (Conecta King).
 * Lista de módulos, formulário do cartão, ordenação.
 * Depende de window.DashboardCore + window.DashboardCartao.
 * Gerado por scripts/extract-dashboard-editor.js
 */
(function (global) {
    'use strict';

    var __ckDashLog = function () { try { if (localStorage.getItem('ck_debug') === '1') console.log.apply(console, arguments); } catch (e) {} };

    function safeIconClass(s, fb) {
        fb = fb || 'fas fa-link';
        var tokens = String(s || '').split(/\s+/).filter(function (t) {
            return /^(fa[srlb]?|fa-(solid|regular|brands)|fa-[a-z0-9-]+)$/i.test(t);
        });
        return tokens.length ? tokens.join(' ') : fb;
    }

    function core() { return global.DashboardCore || {}; }
    function cartao() { return global.DashboardCartao || {}; }

    var env = {
        get DEFAULT_AVATAR_PLACEHOLDER() {
            var c = core();
            if (typeof c.getDefaultAvatarPlaceholder === 'function') return c.getDefaultAvatarPlaceholder();
            return '';
        },
        setAvatarSrc: function (el, src) {
            var c = core();
            if (typeof c.setAvatarSrc === 'function') return c.setAvatarSrc(el, src);
            if (el) el.src = src || '';
        },
        applyAvatarFormatToPreview: function (el, format) {
            var c = core();
            if (typeof c.applyAvatarFormatToPreview === 'function') return c.applyAvatarFormatToPreview(el, format);
        },
        parseBannerDestination: function (raw) {
            var c = core();
            if (typeof c.parseBannerDestination === 'function') return c.parseBannerDestination(raw);
            return { primary_url: String(raw || '').trim(), instagram_url: '', whatsapp_url: '' };
        },
        serializeBannerDestination: function () {
            var c = core();
            if (typeof c.serializeBannerDestination === 'function') return c.serializeBannerDestination.apply(c, arguments);
            return String(arguments[0] || '').trim();
        },
        bannerDestDisplayLabel: function (raw) {
            var c = core();
            if (typeof c.bannerDestDisplayLabel === 'function') return c.bannerDestDisplayLabel(raw);
            return String(raw || '').trim() || 'Sem link';
        },
        bannerUrlModelsHtml: function () {
            var c = core();
            if (typeof c.bannerUrlModelsHtml === 'function') return c.bannerUrlModelsHtml();
            return '';
        },
        getDefaultIcon: function (itemType) {
            var c = core();
            if (typeof c.getDefaultIcon === 'function') return c.getDefaultIcon(itemType);
            return 'fas fa-link';
        },
        moduleListDisplayTitle: function (item) {
            var c = core();
            if (typeof c.moduleListDisplayTitle === 'function') return c.moduleListDisplayTitle(item);
            return (item && (item.title || item.item_type)) || 'Módulo';
        },
        initSortable: function () {
            var c = core();
            if (typeof c.initSortable === 'function') return c.initSortable();
            if (typeof global.initSortable === 'function') return global.initSortable();
        },
        setupMoveButtons: function () {
            var c = core();
            if (typeof c.setupMoveButtons === 'function') return c.setupMoveButtons();
        },
        updateAvatarFormatSelector: function (format) {
            var c = core();
            if (typeof c.updateAvatarFormatSelector === 'function') return c.updateAvatarFormatSelector(format);
        },
        preserveLocalItemStates: function () {
            var k = cartao();
            if (typeof k.preserveLocalItemStates === 'function') return k.preserveLocalItemStates();
            return {};
        },
        restoreLocalItemStates: function (states) {
            var k = cartao();
            if (typeof k.restoreLocalItemStates === 'function') return k.restoreLocalItemStates(states);
        },
        appendMinimalModuleListItem: function (item) {
            var k = cartao();
            if (typeof k.appendMinimalModuleListItem === 'function') return k.appendMinimalModuleListItem(item);
            return false;
        },
        normalizeProfileItemType: function (item) {
            var k = cartao();
            if (typeof k.normalizeProfileItemType === 'function') return k.normalizeProfileItemType(item);
            return item;
        },
        updateLivePreviewFromForm: function () {
            var k = cartao();
            if (typeof k.updateLivePreviewFromForm === 'function') return k.updateLivePreviewFromForm();
            if (typeof global.updateLivePreviewFromForm === 'function') return global.updateLivePreviewFromForm();
        }
    };

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            return s ? s[prop] : null;
        }
    });

function renderEditor(profileData) {
    try {
        // Fallback: quando renderEditor() é chamado sem parâmetro
        const resolvedProfileData = profileData || window.currentProfileData || window.lastProfileData;
        // Salvar dados do perfil globalmente para uso em outras funções
        window.lastProfileData = resolvedProfileData;

        if (!resolvedProfileData || !resolvedProfileData.details) {
            // Não quebrar o dashboard: isso acontece quando a API falha/retorna vazio/usuário deslogado
            console.warn('renderEditor: profileData ou details está vazio', {
                hasProfileData: !!resolvedProfileData,
                hasDetails: !!resolvedProfileData?.details
            });
            return;
        }

        __ckDashLog('YZ Iniciando renderização do editor com dados:', {
            hasDetails: !!profileData.details,
            hasItems: !!profileData.items,
            itemsCount: profileData.items?.length || 0
        });

        const { details, items } = resolvedProfileData;
        const imageUrl = details.profile_image_url || env.DEFAULT_AVATAR_PLACEHOLDER;

        env.setAvatarSrc(SELECTORS.dashboardPhotoPreview, imageUrl);
        env.setAvatarSrc(SELECTORS.previewAvatar, imageUrl);

        // Atualizar card de perfil na sidebar
        const sidebarAvatar = document.getElementById('sidebar-profile-avatar');
        const sidebarName = document.getElementById('sidebar-profile-name');
        const sidebarHandle = document.getElementById('sidebar-profile-handle');
        if (sidebarAvatar) env.setAvatarSrc(sidebarAvatar, imageUrl);
        if (sidebarName) sidebarName.textContent = details.display_name || 'Seu Nome';
        if (sidebarHandle) sidebarHandle.textContent = `@${details.profile_slug || 'seu-usuario'}`;

        if (SELECTORS.displayNameInput) SELECTORS.displayNameInput.value = details.display_name || '';
        __ckDashLog('[FETCH] Preenchendo campo WhatsApp com:', details.whatsapp);
        if (SELECTORS.whatsappNumberInput) {
            SELECTORS.whatsappNumberInput.value = details.whatsapp || '';
            __ckDashLog('[FETCH] Campo WhatsApp preenchido com:', SELECTORS.whatsappNumberInput.value);
        } else {
            console.warn('[FETCH] Campo WhatsApp não encontrado no DOM');
        }
        if (SELECTORS.bioInput) SELECTORS.bioInput.value = details.bio || '';
        if (SELECTORS.profileSlugInput) SELECTORS.profileSlugInput.value = details.profile_slug || '';

        // Configurar formato do avatar
        const avatarFormat = details.avatar_format || 'circular';
        env.updateAvatarFormatSelector(avatarFormat);
        env.applyAvatarFormatToPreview(SELECTORS.previewAvatar, avatarFormat);
        if (typeof window.applyVitrineDetails === 'function') {
            window.applyVitrineDetails(details);
        }
        if (SELECTORS.fontFamilySelect) SELECTORS.fontFamilySelect.value = details.font_family || 'Inter';
        if (SELECTORS.textColorPicker) SELECTORS.textColorPicker.value = details.text_color || '#ECECEC';
        if (SELECTORS.buttonColorPicker) SELECTORS.buttonColorPicker.value = details.button_color || '#1C1C21';
        if (SELECTORS.backgroundImageOpacityPicker) SELECTORS.backgroundImageOpacityPicker.value = details.background_image_opacity !== undefined ? details.background_image_opacity : 1.0;
        if (SELECTORS.buttonTextColorPicker) SELECTORS.buttonTextColorPicker.value = details.button_text_color || '#FFFFFF';
        if (SELECTORS.backgroundImagePreview) SELECTORS.backgroundImagePreview.src = details.background_image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW08L3RleHQ+Cjwvc3ZnPgo=';

        if (SELECTORS.buttonOpacityPicker) SELECTORS.buttonOpacityPicker.value = details.button_opacity !== undefined ? details.button_opacity : 1;

        const borderRadiusPx = details.button_border_radius || '12px';
        const parts = (borderRadiusPx + '').split(' ');
        const [dtl, dtr, dbr, dbl] = parts.length === 4 ? parts : [borderRadiusPx, borderRadiusPx, borderRadiusPx, borderRadiusPx];
        if (SELECTORS.radiusTL) SELECTORS.radiusTL.value = parseInt(dtl, 10);
        if (SELECTORS.radiusTR) SELECTORS.radiusTR.value = parseInt(dtr, 10);
        if (SELECTORS.radiusBR) SELECTORS.radiusBR.value = parseInt(dbr, 10);
        if (SELECTORS.radiusBL) SELECTORS.radiusBL.value = parseInt(dbl, 10);
        if (SELECTORS.buttonBorderRadiusValue) SELECTORS.buttonBorderRadiusValue.textContent = `${parseInt(dtl, 10)}px ${parseInt(dtr, 10)}px ${parseInt(dbr, 10)}px ${parseInt(dbl, 10)}px`;

        const bgType = details.background_type || 'color';
        const bgTypeInput = document.querySelector(`input[name="bg-type"][value="${bgType}"]`);
        if (bgTypeInput) bgTypeInput.checked = true;

        const showVcard = details.show_vcard_button === false ? 'false' : 'true';
        const vcardToggle = document.querySelector(`input[name="vcard-toggle"][value="${showVcard}"]`);
        if (vcardToggle) vcardToggle.checked = true;

        function updateBibleVisibilitySetting(itemsList) {
            const bibleItem = (itemsList || window.currentProfileData?.items || []).find(function (it) { return it.item_type === 'bible'; });
            const bibleSetting = document.getElementById('bible-visibility-setting');
            const biblePosSetting = document.getElementById('bible-verse-position-setting');
            const bibleSizeSetting = document.getElementById('bible-verse-size-setting');
            if (bibleSetting) {
                if (bibleItem) {
                    bibleSetting.style.display = 'flex';
                    if (biblePosSetting) biblePosSetting.style.display = 'flex';
                    if (bibleSizeSetting) bibleSizeSetting.style.display = 'flex';
                    const bibleVisible = bibleItem.bible_data && bibleItem.bible_data.is_visible !== false;
                    const bibleToggle = document.querySelector(`input[name="bible-toggle"][value="${bibleVisible ? 'true' : 'false'}"]`);
                    if (bibleToggle) bibleToggle.checked = true;
                    const versePos = (bibleItem.bible_data && bibleItem.bible_data.verse_position === 'bottom') ? 'bottom' : 'top';
                    const versePosRadio = document.querySelector(`input[name="bible-verse-position"][value="${versePos}"]`);
                    if (versePosRadio) versePosRadio.checked = true;
                    const rawSize = (bibleItem.bible_data && bibleItem.bible_data.verse_size) || 'normal';
                    const verseSize = ['small', 'xsmall'].includes(rawSize) ? rawSize : 'normal';
                    const verseSizeRadio = document.querySelector(`input[name="bible-verse-size"][value="${verseSize}"]`);
                    if (verseSizeRadio) verseSizeRadio.checked = true;
                } else {
                    bibleSetting.style.display = 'none';
                    if (biblePosSetting) biblePosSetting.style.display = 'none';
                    if (bibleSizeSetting) bibleSizeSetting.style.display = 'none';
                }
            }
        }
        window.refreshBibleVisibilitySetting = function () {
            const items = window.currentProfileData?.items || [];
            updateBibleVisibilitySetting(items);
        };
        updateBibleVisibilitySetting(items);

        if (SELECTORS.backgroundColorPicker) SELECTORS.backgroundColorPicker.value = details.background_color || '#0D0D0F';
        if (SELECTORS.backgroundImageUrlInput) SELECTORS.backgroundImageUrlInput.value = details.background_image_url || '';

        if (SELECTORS.cardBackgroundColorPicker) SELECTORS.cardBackgroundColorPicker.value = details.card_background_color || '#141417';
        if (SELECTORS.cardOpacityPicker) SELECTORS.cardOpacityPicker.value = details.card_opacity !== undefined ? details.card_opacity : 1.0;

        if (bgType === 'image') {
            if (SELECTORS.backgroundColorContainer) SELECTORS.backgroundColorContainer.style.display = 'none';
            if (SELECTORS.backgroundImageContainer) SELECTORS.backgroundImageContainer.style.display = 'block';
        } else {
            if (SELECTORS.backgroundColorContainer) SELECTORS.backgroundColorContainer.style.display = 'block';
            if (SELECTORS.backgroundImageContainer) SELECTORS.backgroundImageContainer.style.display = 'none';
        }

        const alignValue = details.button_content_align || 'center';
        const alignInput = document.querySelector(`input[name="button-align"][value="${alignValue}"]`);
        if (alignInput) {
            alignInput.checked = true;
        }

        const fontSize = details.button_font_size ? parseInt(details.button_font_size, 10) : 16;
        if (SELECTORS.buttonFontSizePicker) SELECTORS.buttonFontSizePicker.value = fontSize;
        if (SELECTORS.buttonFontSizeValue) SELECTORS.buttonFontSizeValue.textContent = `${fontSize}px`;

        // Logo align - usar logo_spacing para armazenar alinhamento (left/center/right)
        // Se logo_spacing for um número, converter para alinhamento baseado no valor
        // Se for string, usar diretamente
        let logoAlign = 'center'; // padrão
        if (details.logo_spacing !== undefined && details.logo_spacing !== null) {
            if (typeof details.logo_spacing === 'string' && ['left', 'center', 'right'].includes(details.logo_spacing)) {
                logoAlign = details.logo_spacing;
            } else if (typeof details.logo_spacing === 'number') {
                // Converter número para alinhamento (compatibilidade com versão antiga)
                if (details.logo_spacing <= 5) logoAlign = 'left';
                else if (details.logo_spacing >= 20) logoAlign = 'right';
                else logoAlign = 'center';
            }
        }
        if (SELECTORS.logoAlignLeft) SELECTORS.logoAlignLeft.checked = (logoAlign === 'left');
        if (SELECTORS.logoAlignCenter) SELECTORS.logoAlignCenter.checked = (logoAlign === 'center');
        if (SELECTORS.logoAlignRight) SELECTORS.logoAlignRight.checked = (logoAlign === 'right');

        // Preservar estado local antes de limpar o container
        const preservedStates = env.preserveLocalItemStates();

        // Verificar duplicações antes de renderizar
        // King Selection e Bíblia não aparecem como módulos (só no menu lateral); não listar na aba Módulos
        const seenIds = new Set();
        const uniqueItems = (items || []).map(function (item) {
            return env.normalizeProfileItemType(Object.assign({}, item));
        }).filter(item => {
            if (item.item_type === 'king_selection') return false;
            if (item.item_type === 'bible') return false;
            if (seenIds.has(item.id)) {
                console.warn(`Item duplicado detectado e removido: ID ${item.id}, Tipo: ${item.item_type}`);
                return false;
            }
            seenIds.add(item.id);
            return true;
        }).sort((a, b) => {
            // Ordenar por display_order (menor primeiro, null/undefined por último)
            const orderA = a.display_order !== undefined && a.display_order !== null ? a.display_order : 9999;
            const orderB = b.display_order !== undefined && b.display_order !== null ? b.display_order : 9999;
            return orderA - orderB;
        });

        // Limpar container ANTES de renderizar novos itens
        // IMPORTANTE: Limpar de forma síncrona para garantir que os itens sejam adicionados corretamente
        // Re-buscar o container para garantir que está acessível (pode ter sido removido/recriado)
        let itemsContainer = SELECTORS.itemsContainer || document.getElementById('items-container');

        if (!itemsContainer) {
            console.error('O Container items-container não encontrado! Tentando criar...');
            // Tentar encontrar o editor pane e criar o container se não existir
            const itemsEditorPane = document.getElementById('items-editor');
            if (itemsEditorPane) {
                const newContainer = document.createElement('div');
                newContainer.id = 'items-container';
                newContainer.className = 'modules-list links-editor-list';
                const modulesActions = itemsEditorPane.querySelector('.modules-actions');
                itemsEditorPane.insertBefore(newContainer, modulesActions ? modulesActions.nextElementSibling : null);
                itemsContainer = newContainer;
                SELECTORS.itemsContainer = newContainer; // Atualizar o seletor
                __ckDashLog('Container criado dinamicamente');
            } else {
                console.error('O items-editor pane também não encontrado!');
                return; // Não pode continuar sem o container
            }
        }

        // Preservar itens temporários que ainda não foram retornados pelo servidor
        // IMPORTANTE: Fazer isso ANTES de limpar o container
        const temporaryItems = [];
        const serverItemIds = new Set(uniqueItems.map(item => String(item.id)));
        const tempElements = itemsContainer.querySelectorAll('[data-is-temporary="true"]');
        tempElements.forEach(tempEl => {
            const tempId = tempEl.dataset.id;
            if (tempId && !serverItemIds.has(String(tempId))) {
                __ckDashLog(`Y"O Preservando item temporário ${tempId} que ainda não foi retornado pelo servidor`);
                // Clonar o elemento para preservá-lo após limpar o container
                temporaryItems.push({
                    element: tempEl.cloneNode(true),
                    id: tempId
                });
            }
        });

        __ckDashLog(`Y Limpando container antes de renderizar ${uniqueItems.length} itens (${temporaryItems.length} temporários serão preservados)`);
        itemsContainer.innerHTML = '';

        // Re-adicionar itens temporários preservados ANTES de renderizar os itens do servidor
        // Isso garante que apareçam primeiro na lista
        temporaryItems.forEach(temp => {
            itemsContainer.appendChild(temp.element);
            __ckDashLog(`Item temporário ${temp.id} re-adicionado ao container`);
        });

        // Verificar se temos itens para renderizar
        if (uniqueItems.length === 0) {
            console.warn('Nenhum item único para renderizar');
            return; // Retornar cedo se não houver itens
        }

        __ckDashLog(`YZ Renderizando ${uniqueItems.length} itens...`);
        uniqueItems.forEach((item, itemIndex) => {
            try {
            // Se houver um item temporário com este ID, removê-lo primeiro
            const tempItem = itemsContainer.querySelector(`[data-id="${item.id}"][data-is-temporary="true"]`);
            if (tempItem) {
                __ckDashLog(` Substituindo item temporário ${item.id} pelo item real do servidor`);
                tempItem.remove();
            }

            const itemEl = document.createElement('div');
            // Definir data-id e data-item-type ANTES de qualquer coisa
            // Se o ID for temporário (string começando com "temp_"), manter como está
            itemEl.dataset.id = item.id;
            itemEl.dataset.itemType = item.item_type;
            // IMPORTANTE: Definir data-display-order baseado no display_order do item ou na posição no array
            // Isso garante que a ordem seja preservada mesmo após recarregar
            const displayOrder = item.display_order !== undefined && item.display_order !== null
                ? item.display_order
                : (itemIndex + 1);
            itemEl.dataset.displayOrder = displayOrder;
            itemEl.setAttribute('data-display-order', displayOrder);
            itemEl.className = 'item';

            // Se for item temporário (não salvo ainda), marcar como temporário
            if (String(item.id).startsWith('temp_')) {
                itemEl.dataset.isTemporary = 'true';
                itemEl.dataset.isUnsaved = 'true'; // Manter ambos para compatibilidade
                __ckDashLog(`Item temporário ${item.id} será renderizado como não salvo`);
            }
            // Armazenar dados originais do item para usar no modal
            // Sanitizar destination_url e armazenar dados originais para o modal
            const sanitizeBannerDestLocal = (raw) => {
                if (!raw || typeof raw !== 'string') return '';
                if (raw.startsWith('[')) return '';
                const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                return (filtered[0] || parts[0] || '').trim();
            };
            itemEl.dataset.originalData = JSON.stringify({
                destination_url: sanitizeBannerDestLocal(item.destination_url || ''),
                image_url: item.image_url || '',
                aspect_ratio: item.aspect_ratio || 'tarja'
            });

            let displayHTML = '';
            let editHTML = '';
            let iconOrThumbHTML = '';

            switch (item.item_type) {
                case 'link':
                    itemEl.classList.add('link-item');
                    // Se tiver image_url (logo), mostrar logo, senão mostrar ícone
                    // NA LISTA DE CONTEDO: sempre usar tamanho fixo (40px), NÃO usar logo_size
                    const logoSizeListFixed = 40; // Tamanho FIXO na lista de conteúdo (não deve mudar)
                    if (item.image_url && item.image_url.trim() && !item.image_url.includes('placeholder')) {
                        // Detectar se é PNG (logo) ou JPEG (foto)
                        const imageUrl = item.image_url.toLowerCase();
                        let borderRadius = '50%'; // Padrão: circular (JPEG)
                        let objectFit = 'cover';
                        let logoClass = 'logo-circular';

                        // Verificar logo_fit_mode do item se disponível
                        const logoFitMode = item.logo_fit_mode || 'contain';

                        if (imageUrl.includes('.png')) {
                            // PNG: sem border-radius (logo)
                            borderRadius = '0';
                            // Usar logo_fit_mode se disponível, senão 'contain' (completo, sem corte)
                            objectFit = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'contain';
                            logoClass = 'logo-png';
                        } else if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
                            // JPEG: círculo (foto)
                            borderRadius = '50%';
                            // Usar logo_fit_mode se disponível, senão 'cover' (preenche espaço)
                            objectFit = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'cover';
                            logoClass = 'logo-circular';
                        } else {
                            // URL sem extensão (Cloudflare R2) - verificar logo_fit_mode
                            // Se não tiver extensão, assumir PNG (logo) por padrão
                            borderRadius = '0';
                            objectFit = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'contain';
                            logoClass = 'logo-png';
                        }

                        iconOrThumbHTML = `<img src="${item.image_url}" class="item-logo-preview ${logoClass}" style="width: ${logoSizeListFixed}px; height: ${logoSizeListFixed}px; object-fit: ${objectFit}; border-radius: ${borderRadius}; flex-shrink: 0;" alt="Logo" onerror="this.style.display='none'; const nextIcon = this.nextElementSibling; if (nextIcon && nextIcon.classList.contains('item-icon-picker')) nextIcon.style.display='inline-block';"><i class="${safeIconClass(item.icon_class, 'fas fa-link')} item-icon-picker" title="Alterar Ícone" style="display: none;"></i>`;
                    } else {
                        iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-link')} item-icon-picker" title="Alterar Ícone"></i>`;
                    }
                    // Usar o título do item, ou 'Link Personalizado' como padrão apenas se não houver título
                    displayHTML = `<div class="item-display-title">${item.title || 'Link Personalizado'}</div><div class="item-display-dest">${item.destination_url || '#'}</div>`;
                    // Adicionar campo de upload de logo no modal de edição
                    const logoPreviewStyle = (item.image_url && item.image_url.trim() && !item.image_url.includes('placeholder')) ? 'display: block;' : 'display: none;';
                    const logoSize = item.logo_size || 24; // Tamanho padrão: 24px
                    const logoPreviewSize = Math.min(logoSize, 100); // Preview máximo 100px
                    editHTML = `
        <label>Logo (PNG ou JPG)</label>
        <div class="logo-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
            <input type="file" class="item-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
            <img src="${item.image_url || ''}" class="item-logo-upload-preview" style="max-width: ${logoPreviewSize}px; max-height: ${logoPreviewSize}px; width: ${logoPreviewSize}px; height: ${logoPreviewSize}px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; ${logoPreviewStyle}">
            <div class="logo-upload-text" style="${!item.image_url || item.image_url.includes('placeholder') ? '' : 'display: none;'}">
                <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload</p>
                <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG ou JPG (máx. 5MB)</span>
            </div>
            <button type="button" class="remove-logo-btn" style="display: ${item.image_url && !item.image_url.includes('placeholder') ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-trash"></i> Remover Logo
            </button>
            <div class="upload-loader" style="display: none;"></div>
        </div>
        <input type="hidden" class="item-image-url-input" value="${item.image_url || ''}">
        ${item.image_url && !item.image_url.includes('placeholder') ? `
        <label>Tamanho da Logo (em pixels)</label>
        <div class="input-group range-slider" style="margin-bottom: 15px;">
            <div class="range-slider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="margin: 0; color: var(--text, #ECECEC);">Tamanho: <span id="logo-size-value-${item.id || 'temp'}">${logoSize}</span>px</label>
                <input type="number" class="item-logo-size-input" value="${logoSize}" min="20" max="600" step="1" style="width: 80px; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC); text-align: center;">
            </div>
            <input type="range" class="item-logo-size-slider" value="${logoSize}" min="20" max="600" step="5" style="width: 100%;" data-item-id="${item.id || 'temp'}">
            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-dark, #A1A1A1);">
                <span>20px</span>
                <span>600px</span>
            </div>
        </div>
        <label>Ajuste da Logo</label>
        <div class="input-group" style="margin-bottom: 15px;">
            <div class="segmented-control" style="display: flex; gap: 8px; background: var(--card-background-color, #1C1C21); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                <input type="radio" id="logo-fit-contain-${item.id || 'temp'}" name="logo-fit-mode-${item.id || 'temp'}" value="contain" ${(!item.logo_fit_mode || item.logo_fit_mode === 'contain') ? 'checked' : ''} style="display: none;">
                <label for="logo-fit-contain-${item.id || 'temp'}" style="flex: 1; padding: 8px 12px; text-align: center; border-radius: 6px; cursor: pointer; background: ${(!item.logo_fit_mode || item.logo_fit_mode === 'contain') ? 'var(--dourado-principal, #FFC700)' : 'transparent'}; color: ${(!item.logo_fit_mode || item.logo_fit_mode === 'contain') ? '#000' : 'var(--text, #ECECEC)'}; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;">
                    <i class="fas fa-expand" style="margin-right: 5px;"></i> Automático
                </label>
                <input type="radio" id="logo-fit-cover-${item.id || 'temp'}" name="logo-fit-mode-${item.id || 'temp'}" value="cover" ${(item.logo_fit_mode === 'cover') ? 'checked' : ''} style="display: none;">
                <label for="logo-fit-cover-${item.id || 'temp'}" style="flex: 1; padding: 8px 12px; text-align: center; border-radius: 6px; cursor: pointer; background: ${(item.logo_fit_mode === 'cover') ? 'var(--dourado-principal, #FFC700)' : 'transparent'}; color: ${(item.logo_fit_mode === 'cover') ? '#000' : 'var(--text, #ECECEC)'}; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;">
                    <i class="fas fa-crop" style="margin-right: 5px;"></i> Com Corte
                </label>
            </div>
            <input type="hidden" class="item-logo-fit-mode-input" value="${item.logo_fit_mode || 'contain'}">
        </div>
        ` : ''}
        <label>Título</label>
        <input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título do Link Personalizado">
        <label>URL de Destino</label>
        <input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://exemplo.com">
        <label style="margin-top: 15px;">Ícone (opcional - usado se não houver logo)</label>
        <div class="item-icon-picker" style="font-size: 2rem; cursor: pointer; color: var(--dourado-principal, #FFC700); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border-color, #2C2C2F); border-radius: 8px; margin: 10px 0;" title="Clique para alterar ícone">
            <i class="${safeIconClass(item.icon_class, 'fas fa-link')}"></i>
        </div>
    `;
                    break;
                case 'banner':
                    // Banner simples - uma imagem e URL de destino opcional
                    const sanitizeBannerDestLocal = (raw) => {
                        if (!raw || typeof raw !== 'string') return '';
                        if (raw.startsWith('[')) return '';
                        const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                        const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                        return (filtered[0] || parts[0] || '').trim();
                    };

                    itemEl.classList.add('banner-item');
                    itemEl.dataset.aspectRatio = item.aspect_ratio || 'tarja';
                    // Função para validar e sanitizar URL da imagem do banner
                    function sanitizeImageUrl(url) {
                        const defaultPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW08L3RleHQ+Cjwvc3ZnPgo=';
                        if (!url || typeof url !== 'string') {
                            return defaultPlaceholder;
                        }
                        const trimmedUrl = url.trim();
                        // Rejeitar URLs de placeholder externos que podem falhar
                        if (trimmedUrl.includes('placeholder.com') || trimmedUrl.includes('via.placeholder')) {
                            return defaultPlaceholder;
                        }
                        // Aceitar apenas URLs válidas: data URIs ou http/https
                        if (trimmedUrl.startsWith('data:image/') ||
                            trimmedUrl.startsWith('http://') ||
                            trimmedUrl.startsWith('https://')) {
                            return trimmedUrl;
                        }
                        return defaultPlaceholder;
                    }
                    // Normalizar banners que ainda têm destino em JSON (legado de carrossel) e limpar URLs de imagem
                    let rawBannerDest = item.destination_url || '';
                    if (rawBannerDest.trim().startsWith('[')) {
                        try {
                            const parsed = JSON.parse(rawBannerDest);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                const firstImg = typeof parsed[0] === 'string' ? parsed[0] : (parsed[0]?.image_url || '');
                                if (firstImg) {
                                    item.image_url = firstImg;
                                }
                            }
                        } catch (e) {
                            console.warn('Banner: destino JSON ignorado', e);
                        }
                        rawBannerDest = '';
                    }
                    const bannerDestParts = env.parseBannerDestination(rawBannerDest);
                    const bannerPrimaryDest = rawBannerDest.trim().startsWith('{')
                        ? bannerDestParts.primary_url
                        : sanitizeBannerDestLocal(rawBannerDest);

                    let bannerImageUrl = sanitizeImageUrl(item.image_url);
                    const bannerName = (item.title && item.title.trim()) || 'Banner';
                    const bannerDisplayDest = env.bannerDestDisplayLabel(rawBannerDest);
                    iconOrThumbHTML = `<img src="${bannerImageUrl}" class="banner-preview-thumb" alt="Preview" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW08L3RleHQ+Cjwvc3ZnPgo='" loading="lazy"/>`;
                    displayHTML = `<div class="item-display-title"><input type="text" class="item-banner-name-input" value="${bannerName}" placeholder="Nome do Banner" style="background: transparent; border: 1px solid transparent; color: inherit; font-size: inherit; font-weight: inherit; padding: 2px 4px; border-radius: 4px; width: 100%; max-width: 220px;" onfocus="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)';" onblur="this.style.borderColor='transparent'; this.style.background='transparent';"></div><div class="item-display-dest">${bannerDisplayDest || 'Sem destino'}</div><input type="hidden" class="item-title-input-hidden" value="${item.whatsapp_message || ''}">`;
                    editHTML = `
        <div class="image-upload-area">
            <input type="file" class="item-file-input" accept="image/*">
            <div class="image-upload-text">
                <p><i class="fas fa-cloud-upload-alt"></i> Clique para fazer upload</p>
                <span>ou arraste uma imagem aqui</span>
            </div>
            <img class="banner-preview" src="${bannerImageUrl}" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${bannerImageUrl && !bannerImageUrl.includes('placeholder') ? 'block' : 'none'};">
            <div class="upload-loader"></div>
        </div>
        <label>URL de Destino ao clicar na imagem (opcional)</label>
        <input type="text" class="item-destination-url-input" value="${bannerPrimaryDest.replace(/"/g, '&quot;')}" placeholder="https://link.do.banner">
        <input type="hidden" class="item-image-url-input" value="${bannerImageUrl}">
        ${env.bannerUrlModelsHtml()}
    `;
                    // Atualizar originalData com destino sanitizado (usar bannerDisplayDest que já está sanitizado)
                    try {
                        const originalData = itemEl.dataset.originalData ? JSON.parse(itemEl.dataset.originalData) : {};
                        originalData.destination_url = env.serializeBannerDestination(bannerPrimaryDest, '', '');
                        originalData.image_url = bannerImageUrl;
                        originalData.aspect_ratio = item.aspect_ratio || 'tarja';
                        originalData.title = bannerName;
                        originalData.whatsapp_message = item.whatsapp_message || '';
                        itemEl.dataset.originalData = JSON.stringify(originalData);
                    } catch (e) {
                        // ignore
                    }
                    break;
                case 'banner_carousel':
                case 'carousel':
                    // ===== NOVO CARROSSEL - IMPLEMENTA—fO LIMPA =====
                    itemEl.classList.add('carousel-item');
                    itemEl.dataset.aspectRatio = item.aspect_ratio || 'auto';

                    // Parsear imagens do destination_url (JSON)
                    let carouselImages = [];
                    let carouselPreviewImage = '';

                    if (item.destination_url) {
                        try {
                            const parsed = JSON.parse(item.destination_url);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                // Filtrar placeholders
                                carouselImages = parsed.filter(img => {
                                    const url = typeof img === 'string' ? img : (img.image_url || img);
                                    return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                                });
                                if (carouselImages.length > 0) {
                                    carouselPreviewImage = typeof carouselImages[0] === 'string' ? carouselImages[0] : (carouselImages[0].image_url || carouselImages[0]);
                                }
                            }
                        } catch (e) {
                            if (item.image_url && !item.image_url.includes('placeholder')) {
                                carouselImages = [item.image_url];
                                carouselPreviewImage = item.image_url;
                            }
                        }
                    } else if (item.image_url && !item.image_url.includes('placeholder')) {
                        carouselImages = [item.image_url];
                        carouselPreviewImage = item.image_url;
                    }

                    iconOrThumbHTML = `<i class="fas fa-images" style="font-size: 1.5rem; color: var(--dourado-principal, #FFC700);"></i>`;
                    const carouselListTitle = item.title || (item.item_type === 'banner_carousel' ? 'Carrossel de Banners' : 'Carrossel');
                    displayHTML = `<div class="item-display-title">${carouselListTitle}</div><div class="item-display-dest">${carouselImages.length} imagem${carouselImages.length !== 1 ? 'ns' : ''}</div>`;

                    // HTML do editor - SIMPLES E LIMPO
                    editHTML = `
        <div class="input-group">
            <label>Título do Carrossel</label>
            <input type="text" class="item-title-input" value="${item.title || 'Carrossel'}" placeholder="Ex: Carrossel">
        </div>
        <div class="input-group">
            <label>Proporção de Aspecto</label>
            <div class="aspect-ratio-selector" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;">
                <input type="radio" name="aspect-ratio-selector" id="ratio-auto-${item.id}" value="auto" ${(item.aspect_ratio || 'auto') === 'auto' ? 'checked' : ''}>
                <label for="ratio-auto-${item.id}">Automática</label>
                <input type="radio" name="aspect-ratio-selector" id="ratio-tarja-${item.id}" value="tarja" ${item.aspect_ratio === 'tarja' ? 'checked' : ''}>
                <label for="ratio-tarja-${item.id}">Tarja</label>
                <input type="radio" name="aspect-ratio-selector" id="ratio-2-1-${item.id}" value="2:1" ${item.aspect_ratio === '2:1' ? 'checked' : ''}>
                <label for="ratio-2-1-${item.id}">2:1</label>
                <input type="radio" name="aspect-ratio-selector" id="ratio-4-3-${item.id}" value="4:3" ${item.aspect_ratio === '4:3' ? 'checked' : ''}>
                <label for="ratio-4-3-${item.id}">4:3</label>
                <input type="radio" name="aspect-ratio-selector" id="ratio-1-1-${item.id}" value="1:1" ${item.aspect_ratio === '1:1' ? 'checked' : ''}>
                <label for="ratio-1-1-${item.id}">1:1</label>
                <input type="radio" name="aspect-ratio-selector" id="ratio-3-4-${item.id}" value="3:4" ${item.aspect_ratio === '3:4' ? 'checked' : ''}>
                <label for="ratio-3-4-${item.id}">3:4</label>
                <input type="radio" name="aspect-ratio-selector" id="ratio-10-16-${item.id}" value="10:16" ${item.aspect_ratio === '10:16' ? 'checked' : ''}>
                <label for="ratio-10-16-${item.id}">10:16</label>
                <input type="radio" name="aspect-ratio-selector" id="ratio-16-9-${item.id}" value="16:9" ${item.aspect_ratio === '16:9' ? 'checked' : ''}>
                <label for="ratio-16-9-${item.id}">16:9</label>
            </div>
        </div>
        <div class="input-group">
            <label>Imagens do Carrossel</label>
            <div id="carousel-images-list-${item.id}" class="carousel-images-list-new" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px; min-height: 50px;">
                ${carouselImages.length === 0 ? '<p style="color: #999; text-align: center; padding: 20px; font-size: 0.9rem; grid-column: 1/-1;">Nenhuma imagem adicionada ainda.</p>' : ''}
            </div>
            <label class="carousel-upload-label-new" for="carousel-file-new-${item.id}" style="position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21); display: block; margin-top: 10px;">
                <input type="file" id="carousel-file-new-${item.id}" class="carousel-file-input-new" accept="image/png,image/jpeg,image/jpg" data-item-id="${item.id}" multiple style="position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip: rect(0,0,0,0); pointer-events: none;">
                <div style="pointer-events: none;">
                    <i class="fas fa-plus-circle" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                    <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para adicionar imagens</p>
                    <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG, JPG ou JPEG (máx. 5MB por imagem)</span>
                </div>
                <div class="carousel-upload-loader-new" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2000; width: 40px; height: 40px; border: 5px solid rgba(255,255,255,0.3); border-top-color: var(--dourado-principal, #FFC700); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </label>
            <input type="hidden" class="carousel-images-json-new" data-item-id="${item.id}" value='${JSON.stringify(carouselImages)}'>
            <input type="hidden" class="item-image-url-input" value="${carouselPreviewImage}">
            <small style="color: #999; display: block; margin-top: 10px;"><i class="fas fa-info-circle"></i> As imagens passam automaticamente a cada 3 segundos</small>
        </div>
    `;
                    break;
                case 'pix':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fa-solid fa-qrcode')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'PIX'}</div><div class="item-display-dest">${item.pix_key || 'Chave PIX'}</div>`;
                    editHTML = `
        <label>Título</label>
        <input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título (ex: PIX Celular)">
        <label>Nome do Recebedor</label>
        <input type="text" class="item-recipient-name-input" value="${item.recipient_name || ''}" placeholder="Seu nome completo">
        <label>Chave PIX (Aleatória, CPF/CNPJ, E-mail ou Telefone)</label>
        <div class="pix-key-examples">
            <small><strong>?ož Celular:</strong> Apenas números (ex: 11999999999)</small>
            <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
            <small><strong> CPF:</strong> Apenas números (ex: 12345678901)</small>
            <small><strong>?~ Chave Aleatória:</strong> Copie e cole (ex: 12345678-1234-...)</small>
        </div>
        <input type="text" class="item-pix-key-input" value="${item.pix_key || ''}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
        <label>Valor (opcional)</label>
        <input type="number" class="item-pix-amount-input" value="${item.pix_amount || ''}" placeholder="Valor em reais" step="0.01">
        <label>Descrição (opcional)</label>
        <input type="text" class="item-pix-description-input" value="${item.pix_description || ''}" placeholder="Descrição do pagamento">
    `;
                    break;
                case 'pix_qrcode':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-qrcode')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'PIX QR Code'}</div><div class="item-display-dest">${item.pix_key || 'Nenhuma chave configurada'}</div>`;
                    editHTML = `
        <label>Título</label>
        <input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título (ex: Faça um PIX)">
        <label>Nome do Recebedor</label>
        <input type="text" class="item-recipient-name-input" value="${item.recipient_name || ''}" placeholder="Seu nome completo">
        <label>Chave PIX (Aleatória, CPF/CNPJ, E-mail ou Telefone)</label>
        <div class="pix-key-examples">
            <small><strong>?ož Celular:</strong> Apenas números (ex: 11999999999)</small>
            <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
            <small><strong> CPF:</strong> Apenas números (ex: 12345678901)</small>
            <small><strong>?~ Chave Aleatória:</strong> Copie e cole (ex: 12345678-1234-...)</small>
        </div>
        <input type="text" class="item-pix-key-input" value="${item.pix_key || ''}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
        <label>Valor (opcional)</label>
        <input type="number" class="item-pix-amount-input" value="${item.pix_amount || ''}" placeholder="Valor em reais" step="0.01">
        <label>Descrição (opcional)</label>
        <input type="text" class="item-pix-description-input" value="${item.pix_description || ''}" placeholder="Descrição do pagamento">
    `;
                    break;
                case 'wifi': {
                    itemEl.classList.add('link-item', 'wifi-dashboard-item');
                    let wifiCfg = {};
                    try {
                        if (item.destination_url && String(item.destination_url).trim().startsWith('{')) {
                            wifiCfg = JSON.parse(item.destination_url);
                        }
                    } catch (e) {
                        wifiCfg = {};
                    }
                    const wifiDisplay = (wifiCfg.display_format === 'banner') ? 'banner' : 'button';
                    const wifiSsid = (wifiCfg.ssid || '').trim();
                    const wifiPass = wifiCfg.password != null ? String(wifiCfg.password) : '';
                    const wifiSecurity = (wifiCfg.security || 'WPA').toString();
                    const wifiHidden = !!wifiCfg.hidden;
                    const wifiBannerUrl = (wifiCfg.banner_image_url || '').trim();
                    const wifiLogoUrl = (wifiCfg.logo_url || '').trim();
                    const wifiLogoSize = Math.min(600, Math.max(20, parseInt(wifiCfg.logo_size || item.logo_size || 48, 10) || 48));
                    if (wifiDisplay === 'banner' && wifiBannerUrl && !wifiBannerUrl.includes('placeholder')) {
                        iconOrThumbHTML = `<img src="${wifiBannerUrl}" class="banner-preview-thumb" alt="Wi-Fi" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><i class="fas fa-wifi" style="display: none;"></i>`;
                    } else if (wifiLogoUrl && !wifiLogoUrl.includes('placeholder')) {
                        iconOrThumbHTML = `<img src="${wifiLogoUrl}" class="item-logo-preview" style="width: 40px; height: 40px; object-fit: contain; border-radius: 8px;" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"><i class="${safeIconClass(item.icon_class, 'fas fa-wifi')} item-icon-picker" title="Alterar Ícone" style="display:none;"></i>`;
                    } else {
                        iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-wifi')} item-icon-picker" title="Alterar Ícone"></i>`;
                    }

                    const rawWifiTitle = (item.title && String(item.title).trim()) ? String(item.title).trim() : '';
                    const moduleTitle = (rawWifiTitle && rawWifiTitle !== 'Item') ? rawWifiTitle : 'Wi-Fi (QR Code)';
                    const destLabel = wifiSsid
                        ? `${wifiDisplay === 'banner' ? 'Banner' : 'Botão'} · Rede: ${wifiSsid}`
                        : 'Informe o nome da rede (SSID)';
                    displayHTML = `<div class="item-display-title">${moduleTitle}</div><div class="item-display-dest">${destLabel}</div>`;

                    editHTML = `
        <label>Título no cartão</label>
        <input type="text" class="item-title-input" value="${moduleTitle.replace(/"/g, '&quot;')}" placeholder="Ex: Wi-Fi da loja (texto do botão no cartão)">
        <div class="input-group">
            <label>Formato</label>
            <div style="display: flex; gap: 15px; margin-top: 10px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="radio" class="wifi-display-format-input" name="wifi-display-format-${item.id || 'temp'}" value="button" ${wifiDisplay === 'button' ? 'checked' : ''}>
                    <span>Botão</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="radio" class="wifi-display-format-input" name="wifi-display-format-${item.id || 'temp'}" value="banner" ${wifiDisplay === 'banner' ? 'checked' : ''}>
                    <span>Banner</span>
                </label>
            </div>
        </div>
        <label>Nome da rede Wi-Fi (SSID)</label>
        <small style="display:block;color:#a1a1a1;font-size:0.8rem;margin:4px 0 8px;line-height:1.35;">? o nome que aparece na lista de redes do celular - obrigatório para gerar o QR Code.</small>
        <input type="text" class="wifi-ssid-input" value="${wifiSsid.replace(/"/g, '&quot;')}" placeholder="Ex: MinhaLoja_WiFi ou Visitantes_5G" maxlength="32">
        <label>Segurança</label>
        <select class="wifi-security-input" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color,#2C2C2F);background:var(--card-background-color,#1C1C21);color:var(--text,#ECECEC);">
            <option value="WPA" ${wifiSecurity === 'WPA' || wifiSecurity === 'WPA2' || wifiSecurity === 'WPA3' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
            <option value="WEP" ${wifiSecurity === 'WEP' ? 'selected' : ''}>WEP</option>
            <option value="nopass" ${wifiSecurity === 'nopass' || wifiSecurity === 'NONE' ? 'selected' : ''}>Rede aberta (sem senha)</option>
        </select>
        <label>Senha (opcional)</label>
        <input type="text" class="wifi-password-input" value="${wifiPass.replace(/"/g, '&quot;')}" placeholder="Deixe vazio se for rede aberta" autocomplete="off">
        <label style="display:flex;align-items:center;gap:10px;margin-top:10px;">
            <input type="checkbox" class="wifi-hidden-input" ${wifiHidden ? 'checked' : ''}>
            Rede oculta (SSID não transmitido)
        </label>

        <div class="wifi-logo-section" style="display: ${wifiDisplay === 'button' ? 'block' : 'none'};">
            <label>Logo / ícone no botão (opcional)</label>
            <div class="logo-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                <input type="file" class="item-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                <img src="${wifiLogoUrl || ''}" class="item-logo-upload-preview wifi-logo-preview" style="max-width: 96px; max-height: 96px; width: 96px; height: 96px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; ${wifiLogoUrl ? 'display:block;' : 'display:none;'}">
                <div class="logo-upload-text" style="${wifiLogoUrl ? 'display: none;' : ''}">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                    <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para enviar logo (PNG/JPG)</p>
                    <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">Se não enviar, usa o ícone escolhido</span>
                </div>
                <button type="button" class="remove-logo-btn" style="display: ${wifiLogoUrl ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Remover Logo
                </button>
                <div class="upload-loader" style="display: none;"></div>
            </div>
            <input type="hidden" class="item-image-url-input wifi-logo-url-input" value="${wifiLogoUrl.replace(/"/g, '&quot;')}">
            <div class="input-group" style="margin-top: 10px;">
                <label>Tamanho da logo (px)</label>
                <input type="number" class="item-logo-size-input wifi-logo-size-input" value="${wifiLogoSize}" min="20" max="600" step="1" style="width: 120px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC);">
            </div>
            <label style="margin-top: 15px;">Ícone (se não houver logo)</label>
            <div class="item-icon-picker" style="font-size: 2rem; cursor: pointer; color: var(--dourado-principal, #FFC700); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border-color, #2C2C2F); border-radius: 8px; margin: 10px 0;" title="Clique para alterar ícone">
                <i class="${safeIconClass(item.icon_class, 'fas fa-wifi')}"></i>
            </div>
        </div>

        <div class="wifi-banner-section" style="display: ${wifiDisplay === 'banner' ? 'block' : 'none'};">
            <label>Imagem do banner</label>
            <div class="image-upload-area wifi-banner-upload-area banner-item" data-item-type="wifi-banner" data-item-id="${item.id || ''}">
                <input type="file" class="item-file-input" accept="image/*" data-item-type="wifi-banner" data-item-id="${item.id || ''}">
                <div class="image-upload-text">
                    <p><i class="fas fa-cloud-upload-alt"></i> Clique para fazer upload</p>
                    <span>ou arraste uma imagem aqui</span>
                </div>
                <img class="banner-preview wifi-banner-preview" src="${wifiBannerUrl || ''}" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${wifiBannerUrl ? 'block' : 'none'};">
                <div class="upload-loader"></div>
            </div>
            <input type="hidden" class="wifi-banner-url-input" value="${wifiBannerUrl.replace(/"/g, '&quot;')}">
        </div>
    `;
                    break;
                }
                case 'texto_com_botao': {
                    itemEl.classList.add('link-item', 'tcb-dashboard-item');
                    let tcb = {};
                    try {
                        if (item.destination_url && String(item.destination_url).trim().startsWith('{')) {
                            tcb = JSON.parse(item.destination_url);
                        }
                    } catch (e) { tcb = {}; }
                    const tcbEsc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                    const lines = Array.isArray(tcb.lines) ? tcb.lines : [];
                    const l1 = lines[0] || {};
                    const l2 = lines[1] || {};
                    const l3 = lines[2] || {};
                    const tpl = tcb.template || 'evento';
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-font')} item-icon-picker" title="Texto com Botão"></i>`;
                    displayHTML = `<div class="item-display-title">${tcbEsc(item.title || 'Texto com Botão')}</div><div class="item-display-dest">${tcbEsc(tcb.button_label || 'Inscrever-se')} · ${tcbEsc(tcb.url || 'sem link')}</div>`;
                    editHTML = `
        <input type="hidden" class="tcb-template-input" value="${tcbEsc(tpl)}">
        <div class="input-group">
            <label>Modelo rápido</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
                <button type="button" class="btn btn-secondary tcb-apply-template" data-template="evento" style="font-size:0.8rem;">Evento</button>
                <button type="button" class="btn btn-secondary tcb-apply-template" data-template="curso" style="font-size:0.8rem;">Curso</button>
                <button type="button" class="btn btn-secondary tcb-apply-template" data-template="cta" style="font-size:0.8rem;">CTA simples</button>
            </div>
        </div>
        <label>Selo / linha de cima (opcional)</label>
        <input type="text" class="tcb-eyebrow-input" value="${tcbEsc(tcb.eyebrow || '')}" placeholder="Ex: YOZ Mentoria Impactus CLUB">
        <label>Título</label>
        <input type="text" class="tcb-title-input item-title-input" value="${tcbEsc(item.title || '')}" placeholder="Ex: Encontro Presencial Agosto 2026">
        <label>Linha 1 (data)</label>
        <div style="display:flex;gap:8px;"><input type="text" class="tcb-icon1-input" value="${tcbEsc(l1.icon || '')}" style="width:56px;"><input type="text" class="tcb-line1-input" value="${tcbEsc(l1.text || '')}" placeholder="21/08/2026 — 22/08/2026" style="flex:1;"></div>
        <label>Linha 2 (horário)</label>
        <div style="display:flex;gap:8px;"><input type="text" class="tcb-icon2-input" value="${tcbEsc(l2.icon || '')}" style="width:56px;"><input type="text" class="tcb-line2-input" value="${tcbEsc(l2.text || '')}" placeholder="09:00 - 18:00" style="flex:1;"></div>
        <label>Linha 3 (local)</label>
        <div style="display:flex;gap:8px;"><input type="text" class="tcb-icon3-input" value="${tcbEsc(l3.icon || '')}" style="width:56px;"><input type="text" class="tcb-line3-input" value="${tcbEsc(l3.text || '')}" placeholder="Cidade / local" style="flex:1;"></div>
        <label>Texto do botão</label>
        <input type="text" class="tcb-button-label-input" value="${tcbEsc(tcb.button_label || 'Inscrever-se')}" placeholder="Inscrever-se">
        <label>Link do botão</label>
        <input type="url" class="tcb-url-input item-destination-url-input" value="${tcbEsc(tcb.url || '')}" placeholder="https://...">
    `;
                    break;
                }
                case 'pdf':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fa-solid fa-file-pdf')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'PDF'}</div><div class="item-display-dest">${item.pdf_url || 'URL do PDF'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título (ex: Baixar Catálogo)"><label>URL do PDF</label><input type="text" class="item-pdf-url-input" value="${item.pdf_url || ''}" placeholder="URL do seu arquivo PDF">`;
                    break;
                case 'whatsapp':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-whatsapp')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'WhatsApp'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Ex: Chamar no WhatsApp"><label>Telefone (com código do país)</label><input type="tel" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="5511999999999 (Brasil) ou 12125551234 (EUA)">`;
                    break;
                case 'telegram':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-telegram')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Telegram'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título do Link"><label>URL ou Nome de Usuário</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://t.me/'}" placeholder="https://t.me/seu_usuario">`;
                    break;
                case 'email':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-envelope')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Email'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Ex: Enviar Email"><label>Endereço de Email</label><input type="email" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="contato@exemplo.com">`;
                    break;
                case 'facebook':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-facebook')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Facebook'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://facebook.com/'}" placeholder="Cole a URL completa do seu perfil">`;
                    break;
                case 'instagram':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-instagram')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Instagram'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://instagram.com/'}" placeholder="Cole a URL completa do seu perfil">`;
                    break;
                case 'pinterest':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-pinterest')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Pinterest'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://pinterest.com/'}" placeholder="Cole a URL completa do seu perfil">`;
                    break;
                case 'reddit':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-reddit')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Reddit'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://reddit.com/u/'}" placeholder="Cole a URL completa do seu perfil">`;
                    break;
                case 'tiktok':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-tiktok')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'TikTok'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://tiktok.com/@'}" placeholder="Cole a URL completa do seu perfil">`;
                    break;
                case 'twitch':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-twitch')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Twitch'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Canal</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://twitch.tv/'}" placeholder="Cole a URL completa do seu canal">`;
                    break;
                case 'twitter':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-twitter')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'X / Twitter'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://x.com/'}" placeholder="Cole a URL completa do seu perfil">`;
                    break;
                case 'youtube':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-youtube')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'YouTube'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Canal</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="Cole a URL completa do seu canal">`;
                    break;
                case 'spotify':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-spotify')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Spotify'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Ex: Ouça meu Podcast"><label>Link do seu Perfil, Música ou Playlist</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="Cole a URL do Spotify aqui">`;
                    break;
                case 'linkedin':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-linkedin')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'LinkedIn'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://linkedin.com/in/'}" placeholder="Cole a URL completa do seu perfil">`;
                    break;
                case 'portfolio':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-briefcase')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Meu Portfólio'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Portfólio</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="Cole a URL do seu site ou portfólio">`;
                    break;
                case 'product_catalog':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-store')} item-icon-picker" title="Catálogo"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Catálogo de Produtos'}</div><div class="item-display-dest">Produtos no cartão</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || 'Catálogo de Produtos'}" placeholder="Título do catálogo">`;
                    break;
                case 'king_selection':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-check-double')} item-icon-picker" title="KingSelection"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'KingSelection'}</div><div class="item-display-dest">Galerias de seleção (estilo Alboom)</div>`;
                    editHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
            <i class="fas fa-check-double" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
            <p>Crie galerias, envie link para o cliente e receba a seleção final com exportação.</p>
            <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-dark, #A1A1A1);">Clique em ?oAbrir Painel— para gerenciar.</p>
            <button type="button" class="btn btn-primary" style="margin-top: 1rem;" onclick="window.openKingSelectionAdmin('${item.id}')">
                <i class="fas fa-external-link-alt"></i> Abrir Painel
            </button>
        </div>
        <input type="hidden" class="item-title-input" value="${item.title || 'KingSelection'}">
    `;
                    break;
                case 'instagram_embed':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-instagram')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Instagram Incorporado'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do Instagram</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.instagram.com/p/...">`;
                    break;
                case 'youtube_embed':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-youtube')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'YouTube Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do vídeo'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Vídeo do YouTube</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.youtube.com/watch?v=...">`;
                    break;
                case 'tiktok_embed':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-tiktok')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'TikTok Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do TikTok</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.tiktok.com/@seu_usuario">`;
                    break;
                case 'spotify_embed':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-spotify')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Spotify Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do Spotify</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://open.spotify.com/user/seu_usuario ou https://open.spotify.com/artist/seu_artista">`;
                    break;
                case 'linkedin_embed':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-linkedin')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'LinkedIn Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do LinkedIn</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.linkedin.com/in/seu_perfil">`;
                    break;
                case 'pinterest_embed':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fab fa-pinterest')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Pinterest Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                    editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do Pinterest</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.pinterest.com/seu_usuario ou https://br.pinterest.com/seu_usuario">`;
                    break;
                case 'pdf_embed':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-file-import')} item-icon-picker" title="Alterar Ícone"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'PDF Embed'}</div><div class="item-display-dest">${item.pdf_url && item.pdf_url !== '#' ? 'Arquivo carregado' : 'Nenhum arquivo'}</div>`;
                    editHTML = `
        <input type="hidden" class="item-title-input" value="${item.title || ''}">
        <div class="image-upload-area pdf-upload-area">
            <input type="file" class="item-file-input" accept=".pdf">
            <div class="image-upload-text">
                <p>${item.pdf_url && item.pdf_url !== '#' ? 'Trocar Arquivo' : 'Selecionar Arquivo PDF'}</p>
                <span>Clique para enviar (max 10MB)</span>
            </div>
            <div class="upload-loader"></div>
        </div>
        <input type="hidden" class="item-pdf-url-input" value="${item.pdf_url || '#'}">
    `;
                    break;
                case 'sales_page':
                    // Página de Vendas - renderizar como módulo simples (edição é na página dedicada)
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-store')} item-icon-picker" title="Página de Vendas"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Página de Vendas'}</div><div class="item-display-dest">Gerencie produtos e vendas</div>`;
                    // HTML de edição simplificado (o botão editar redireciona para página dedicada)
                    editHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
            <i class="fas fa-store" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
            <p>A edição completa da Página de Vendas é feita em uma página dedicada.</p>
            <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-dark, #A1A1A1);">Clique em "Salvar" e depois em "Editar" para acessar a página de edição completa.</p>
        </div>
        <input type="hidden" class="item-title-input" value="${item.title || 'Página de Vendas'}">
    `;
                    break;
                case 'digital_form':
                    // Formulário King - renderizar como módulo
                    itemEl.classList.add('link-item');
                    const digitalFormData = item.digital_form_data || {};
                    const formDisplayFormat = digitalFormData.display_format || 'button';
                    const formImageUrl = formDisplayFormat === 'banner' ? (digitalFormData.banner_image_url || item.image_url) : null;

                    if (formDisplayFormat === 'banner' && formImageUrl) {
                        iconOrThumbHTML = `<img src="${formImageUrl}" class="banner-preview-thumb" alt="Preview" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><i class="fas fa-file-signature" style="display: none;"></i>`;
                    } else {
                        iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-file-signature')} item-icon-picker" title="Formulário King"></i>`;
                    }

                    displayHTML = `<div class="item-display-title">${item.title || 'Formulário King'}</div><div class="item-display-dest">${formDisplayFormat === 'banner' ? 'Formato: Banner' : 'Formato: Botão'}</div>`;

                    // HTML de edição - será carregado dinamicamente
                    editHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
            <i class="fas fa-file-alt" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
            <p>Clique em "Salvar" e depois em "Editar" para configurar o formulário.</p>
        </div>
        <input type="hidden" class="item-title-input" value="${item.title || 'Formulário King'}">
    `;
                    break;
                case 'guest_list':
                    // Lista de Convidados - renderizar como módulo
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-users')} item-icon-picker" title="Lista de Convidados"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Lista de Convidados'}</div><div class="item-display-dest">Gerencie convidados e confirmações</div>`;

                    // HTML de edição - será carregado dinamicamente
                    editHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
            <i class="fas fa-users" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
            <p>Clique em "Salvar" e depois em "Editar" para gerenciar a lista de convidados.</p>
        </div>
        <input type="hidden" class="item-title-input" value="${item.title || 'Lista de Convidados'}">
    `;
                    break;
                case 'agenda':
                case 'contract':
                case 'photographer_site':
                case 'kingbrief':
                case 'king_bolao':
                    // módulos removidos - não renderizar no editor
                    break;
                case 'convite':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-envelope-open-text')} item-icon-picker" title="Convite Digital"></i>`;
                    const conviteData = item.convite_data || {};
                    displayHTML = `<div class="item-display-title">${item.title || conviteData.subtitulo || 'Convite Digital'}</div><div class="item-display-dest">Edite o convite</div>`;
                    editHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
            <i class="fas fa-envelope-open-text" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
            <p>Clique em "Salvar" e depois em "Editar" para personalizar o convite.</p>
            <a href="/conviteEdit?itemId=${item.id}" target="_blank" rel="noopener" style="display:inline-block;margin-top:0.75rem;padding:10px 20px;background:var(--dourado-principal,#FFC700);color:#000;border-radius:8px;font-weight:600;text-decoration:none;">Abrir editor de convite</a>
        </div>
        <input type="hidden" class="item-title-input" value="${item.title || conviteData.subtitulo || 'Convite'}">
    `;
                    break;
                case 'bible':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-bible')} item-icon-picker" title="Bíblia"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || 'Bíblia'}</div><div class="item-display-dest">Versículo do dia</div>`;
                    editHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
            <i class="fas fa-bible" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
            <p>Clique em "Salvar" e depois em "Editar" para configurar tradução e preferências.</p>
            <a href="/bibliaking" target="_blank" rel="noopener" onclick="try { sessionStorage.setItem('bible_item_id', '${item.id}'); sessionStorage.setItem('bible_panel_item_id', '${item.id}'); } catch(e) {}" style="display:inline-block;margin-top:0.75rem;padding:10px 20px;background:var(--dourado-principal,#FFC700);color:#000;border-radius:8px;font-weight:600;text-decoration:none;">Abrir configurações da Bíblia</a>
        </div>
        <input type="hidden" class="item-title-input" value="${item.title || 'Bíblia'}">
    `;
                    break;
                case 'location':
                    itemEl.classList.add('link-item');
                    iconOrThumbHTML = `<i class="${safeIconClass(item.icon_class, 'fas fa-map-marker-alt')} item-icon-picker" title="Localização"></i>`;
                    var locData = item.location_data || {};
                    var locAddr = (locData.address_formatted || locData.address || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                    var locLat = locData.latitude != null ? String(locData.latitude) : '';
                    var locLng = locData.longitude != null ? String(locData.longitude) : '';
                    displayHTML = `<div class="item-display-title">${(item.title || 'Localização').replace(/</g, '&lt;')}</div><div class="item-display-dest">${(locAddr || 'Endereço não definido').slice(0, 40)}</div>`;
                    editHTML = `
        <div class="location-edit-panel" data-item-id="${item.id}" style="padding: 1rem; color: var(--text, #ECECEC);">
            <label style="display:block;margin-bottom:6px;font-weight:600;">Título do botão</label>
            <input type="text" class="item-title-input location-title-input" value="${(item.title || 'Localização').replace(/"/g, '&quot;')}" placeholder="Ex: Onde me encontrar" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:inherit;margin-bottom:1rem;">
            <label style="display:block;margin-bottom:6px;font-weight:600;">Endereço</label>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
                <input type="text" class="location-address-input" value="${locAddr}" placeholder="Digite o endereço ou pesquise..." style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:inherit;">
                <button type="button" class="location-search-btn" style="padding:10px 16px;border-radius:8px;background:var(--dourado-principal,#FFC700);color:#000;border:none;font-weight:600;cursor:pointer;white-space:nowrap;"><i class="fas fa-search"></i> Pesquisar</button>
            </div>
            <p class="location-formatted-display" style="font-size:0.9em;opacity:0.9;margin:0 0 12px 0;min-height:1.4em;">${(locData.address_formatted || '').replace(/</g, '&lt;')}</p>
            <input type="hidden" class="location-lat-input" value="${locLat}">
            <input type="hidden" class="location-lng-input" value="${locLng}">
            <div class="location-map-preview-edit" style="height:180px;border-radius:12px;overflow:hidden;background:rgba(0,0,0,0.3);margin-top:12px;position:relative;">
                <iframe id="location-map-iframe-${item.id}" style="width:100%;height:100%;border:none;" title="Mapa"></iframe>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);color:rgba(255,255,255,0.7);" class="location-map-placeholder"><i class="fas fa-map-marker-alt" style="font-size:2rem;"></i><span style="margin-left:8px;">Defina o endereço e pesquise para ver o mapa</span></div>
            </div>
            <p style="font-size:0.75rem;opacity:0.7;margin-top:8px;">No cartão, o visitante poderá abrir no Google Maps ou no Waze.</p>
        </div>
    `;
                    break;
                default:
                    iconOrThumbHTML = `<i class="fas fa-puzzle-piece item-icon-picker" title="Módulo"></i>`;
                    displayHTML = `<div class="item-display-title">${item.title || item.item_type || 'Módulo'}</div><div class="item-display-dest" style="color:#E74C3C;font-size:0.85rem;">Tipo ainda sem editor completo: ${item.item_type}</div>`;
                    editHTML = `<p style="padding:1rem;color:#E74C3C;">Este tipo (${item.item_type}) aparece no cartão, mas o editor ainda não tem formulário dedicado. Atualize a página (Ctrl+F5) se acabou de adicionar um módulo novo.</p>`;
                    break;
            }

            // Salvar logo_size no dataset para uso posterior
            if (item.item_type === 'link' && item.logo_size) {
                itemEl.dataset.logoSize = item.logo_size;
            }

            // Nova estrutura de módulos
            itemEl.className = 'module-item';
            const isActive = item.is_active !== false; // Padrão: ativo se não especificado

            // Extrair ícone ou imagem do iconOrThumbHTML corretamente
            let moduleIconHTML = '';
            // Criar um div temporário para parsear o HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = iconOrThumbHTML;

            // Procurar por imagem primeiro
            const imgEl = tempDiv.querySelector('img');
            if (imgEl) {
                // Se for imagem, criar uma nova tag img limpa
                const imgSrc = imgEl.getAttribute('src') || '';
                moduleIconHTML = `<img src="${imgSrc}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><i class="${env.getDefaultIcon(item.item_type)}" style="display: none;"></i>`;
            } else {
                // Se for ícone, extrair a classe do ícone
                const iconEl = tempDiv.querySelector('i');
                if (iconEl) {
                    const iconClass = iconEl.getAttribute('class') || env.getDefaultIcon(item.item_type);
                    moduleIconHTML = `<i class="${iconClass}"></i>`;
                } else {
                    // Fallback: usar ícone padrão
                    moduleIconHTML = `<i class="${env.getDefaultIcon(item.item_type)}"></i>`;
                }
            }

            /* Layout: nome em cima | linha com setas + ícone + desativar + (editar + duplicar + deletar OU para digital_form só "Configurar no King Forms") */
            const isKingForms = item.item_type === 'digital_form';
            const actionsHTML = isKingForms
                ? `<label class="module-toggle" title="Mostrar no cartão">
                        <input type="checkbox" class="module-toggle-input" ${isActive ? 'checked' : ''} data-item-id="${item.id}">
                        <span class="module-toggle-slider"></span>
                    </label>
                    <a href="/kingForms?edit=${encodeURIComponent(item.id)}" target="_blank" class="module-action-btn king-forms-config-btn" title="Editar King Forms" data-item-id="${item.id}" aria-label="Editar King Forms"><i class="fas fa-pen"></i></a>`
                : `<label class="module-toggle" title="Desativar">
                        <input type="checkbox" class="module-toggle-input" ${isActive ? 'checked' : ''} data-item-id="${item.id}">
                        <span class="module-toggle-slider"></span>
                    </label>
                    <button class="module-action-btn edit edit-item-btn" title="Editar Módulo" data-item-id="${item.id}">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="module-action-btn duplicate duplicate-item-btn" title="Duplicar Módulo" data-item-id="${item.id}">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="module-action-btn delete delete-item-btn" title="Excluir Módulo" data-item-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>`;
            itemEl.innerHTML = `
            <div class="module-name module-name-row">${env.moduleListDisplayTitle(item)}</div>
            <div class="module-content-wrapper">
                <div class="module-drag-controls">
                    <button class="module-move-btn move-up" title="Mover para cima" data-item-id="${item.id}" data-direction="up">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <div class="module-drag-handle" title="Arrastar para reordenar">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <button class="module-move-btn move-down" title="Mover para baixo" data-item-id="${item.id}" data-direction="down">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="module-icon">${moduleIconHTML}</div>
                <div class="module-actions-inline">
                    ${actionsHTML}
                </div>
            </div>
            <div class="item-content" style="display: none;">
                <div class="item-details-display">${displayHTML}</div>
                <div class="item-inputs-edit">${editHTML}</div>
            </div>
        `;

            // Garantir que data-id e data-item-type estão definidos após innerHTML
            if (!itemEl.dataset.id) itemEl.dataset.id = item.id;
            if (!itemEl.dataset.itemType) itemEl.dataset.itemType = item.item_type;

            // Adicionar event listeners para o slider de tamanho da logo (se for link)
            if (item.item_type === 'link') {
                const logoSizeSlider = itemEl.querySelector('.item-logo-size-slider');
                const logoSizeInput = itemEl.querySelector('.item-logo-size-input');
                const logoSizeValueSpan = itemEl.querySelector('#logo-size-value-' + (item.id || 'temp'));
                const logoPreview = itemEl.querySelector('.item-logo-upload-preview');
                const logoPreviewInList = itemEl.querySelector('.item-logo-preview');

                if (logoSizeSlider && logoSizeInput) {
                    // Sincronizar slider com input numérico
                    logoSizeSlider.addEventListener('input', (e) => {
                        const value = parseInt(e.target.value);
                        if (logoSizeInput) logoSizeInput.value = value;
                        if (logoSizeValueSpan) logoSizeValueSpan.textContent = value;
                        if (logoPreview) {
                            const previewSize = Math.min(value, 100);
                            logoPreview.style.width = previewSize + 'px';
                            logoPreview.style.height = previewSize + 'px';
                            logoPreview.style.maxWidth = previewSize + 'px';
                            logoPreview.style.maxHeight = previewSize + 'px';
                        }
                        // Atualizar preview ao vivo
                        env.updateLivePreviewFromForm();
                    });

                    logoSizeInput.addEventListener('input', (e) => {
                        let value = parseInt(e.target.value);
                        if (isNaN(value)) value = 24;
                        if (value < 20) value = 20;
                        if (value > 600) value = 600;
                        logoSizeInput.value = value;
                        if (logoSizeSlider) logoSizeSlider.value = value;
                        if (logoSizeValueSpan) logoSizeValueSpan.textContent = value;
                        if (logoPreview) {
                            const previewSize = Math.min(value, 100);
                            logoPreview.style.width = previewSize + 'px';
                            logoPreview.style.height = previewSize + 'px';
                            logoPreview.style.maxWidth = previewSize + 'px';
                            logoPreview.style.maxHeight = previewSize + 'px';
                        }
                        // NÃO atualizar logo na lista - ela deve permanecer fixa (40px)
                        // O tamanho só aplica no cartão público (profile.ejs)
                        itemEl.dataset.logoSize = value;
                        // Atualizar preview ao vivo
                        env.updateLivePreviewFromForm();
                    });
                }

                // Adicionar event listeners para os radio buttons de ajuste da logo
                const logoFitModeRadios = itemEl.querySelectorAll('input[name*="logo-fit-mode"]');
                const logoFitModeInput = itemEl.querySelector('.item-logo-fit-mode-input');
                if (logoFitModeRadios.length > 0 && logoFitModeInput) {
                    logoFitModeRadios.forEach(radio => {
                        radio.addEventListener('change', (e) => {
                            if (e.target.checked) {
                                logoFitModeInput.value = e.target.value;
                                // Atualizar estilos dos labels
                                logoFitModeRadios.forEach(r => {
                                    const label = itemEl.querySelector(`label[for="${r.id}"]`);
                                    if (label) {
                                        if (r.checked) {
                                            label.style.background = 'var(--dourado-principal, #FFC700)';
                                            label.style.color = '#000';
                                        } else {
                                            label.style.background = 'transparent';
                                            label.style.color = 'var(--text, #ECECEC)';
                                        }
                                    }
                                });
                                // Atualizar preview ao vivo
                                env.updateLivePreviewFromForm();
                            }
                        });
                    });
                }
            }

            if (item.item_type === 'wifi') {
                const formatRadios = itemEl.querySelectorAll('.wifi-display-format-input');
                const logoSec = itemEl.querySelector('.wifi-logo-section');
                const banSec = itemEl.querySelector('.wifi-banner-section');
                const modIcon = itemEl.querySelector('.module-icon');
                if (modIcon) modIcon.setAttribute('title', 'Clique para ver QR Code, rede e senha');
                const syncWifiPanels = () => {
                    const sel = itemEl.querySelector('.wifi-display-format-input:checked');
                    const mode = sel ? sel.value : 'button';
                    if (logoSec) logoSec.style.display = mode === 'banner' ? 'none' : 'block';
                    if (banSec) banSec.style.display = mode === 'banner' ? 'block' : 'none';
                    env.updateLivePreviewFromForm();
                };
                formatRadios.forEach(r => r.addEventListener('change', syncWifiPanels));

                const ssidInput = itemEl.querySelector('.wifi-ssid-input');
                const displayDest = itemEl.querySelector('.item-display-dest');
                const syncSsidLabel = () => {
                    const ssid = (ssidInput?.value || '').trim();
                    const sel = itemEl.querySelector('.wifi-display-format-input:checked');
                    const mode = sel ? sel.value : 'button';
                    if (displayDest) {
                        displayDest.textContent = ssid
                            ? `${mode === 'banner' ? 'Banner' : 'Botão'} · Rede: ${ssid}`
                            : 'Informe o nome da rede (SSID)';
                    }
                    env.updateLivePreviewFromForm();
                };
                if (ssidInput) ssidInput.addEventListener('input', syncSsidLabel);

                const wifiPassInput = itemEl.querySelector('.wifi-password-input');
                const wifiSecInput = itemEl.querySelector('.wifi-security-input');
                const wifiHiddenInput = itemEl.querySelector('.wifi-hidden-input');
                [wifiPassInput, wifiSecInput].forEach(inp => {
                    if (inp) inp.addEventListener('input', updateLivePreviewFromForm);
                });
                if (wifiHiddenInput) wifiHiddenInput.addEventListener('change', updateLivePreviewFromForm);

                const logoSizeInputW = itemEl.querySelector('.wifi-logo-size-input');
                if (logoSizeInputW) {
                    logoSizeInputW.addEventListener('input', () => {
                        itemEl.dataset.logoSize = logoSizeInputW.value;
                        env.updateLivePreviewFromForm();
                    });
                }
            }

            try {
                // Re-buscar o container a cada iteração para garantir que está acessível
                const currentContainer = SELECTORS.itemsContainer || document.getElementById('items-container');
                if (!currentContainer) {
                    console.error(`O Container não existe ao tentar adicionar item ${item.id}`);
                    return;
                }
                currentContainer.appendChild(itemEl);
                if (itemIndex < 3) { // Log apenas os 3 primeiros para não poluir o console
                    __ckDashLog(`Item ${item.id} (${item.item_type}) adicionado ao container`);
                }
            } catch (appendError) {
                console.error(`Erro ao adicionar item ${item.id} ao container:`, appendError);
                console.error('Stack trace:', appendError.stack);
            }
            } catch (itemRenderError) {
                console.error(`O Falha ao renderizar módulo ${item.id} (${item.item_type}):`, itemRenderError);
                env.appendMinimalModuleListItem(item);
            }
        });

        // Verificar quantos itens foram realmente adicionados
        const finalContainer = SELECTORS.itemsContainer || document.getElementById('items-container');
        const itemsAdded = finalContainer?.querySelectorAll('.item, .module-item').length || 0;
        __ckDashLog(`Renderização concluída: ${itemsAdded} de ${uniqueItems.length} itens adicionados ao container`);
        if (itemsAdded < uniqueItems.length) {
            const containerCheck = SELECTORS.itemsContainer || document.getElementById('items-container');
            const notInDom = uniqueItems.filter(function (it) {
                return containerCheck && !containerCheck.querySelector('[data-id="' + it.id + '"]');
            });
            if (notInDom.length) {
                console.warn(`Discrepância: esperado ${uniqueItems.length} na aba Módulos, ${itemsAdded} no DOM. Em falta:`, notInDom.map(function (m) {
                    return (m.item_type || '?') + '#' + m.id;
                }).join(', '));
                notInDom.forEach(function (it) { env.appendMinimalModuleListItem(it); });
            }
        }

        if (itemsAdded === 0 && uniqueItems.length > 0) {
            console.error('O ERRO CRÍTICO: Itens não foram adicionados ao container!');
            const debugContainer = SELECTORS.itemsContainer || document.getElementById('items-container');
            console.error('Container existe?', !!debugContainer);
            if (debugContainer) {
                console.error('Container ID:', debugContainer.id);
                console.error('Container classes:', debugContainer.className);
                console.error('Container parent:', debugContainer.parentElement?.tagName);
                console.error('Container display:', window.getComputedStyle(debugContainer).display);
                console.error('Container visibility:', window.getComputedStyle(debugContainer).visibility);
            } else {
                console.error('O Container não existe no DOM!');
            }
        }

        // Restaurar estado local dos itens preservados
        env.restoreLocalItemStates(preservedStates);

        env.updateLivePreviewFromForm();
        env.initSortable();
        // env.setupMoveButtons() já é chamado dentro de env.initSortable(), não precisa chamar novamente

        // Configurar upload de foto após renderizar editor (elementos podem ter sido recriados)
        if (typeof window.setupPhotoUpload === 'function') {
            setTimeout(() => {
                // Remover flag para permitir reconfiguração
                const uploadArea = document.getElementById('dashboard-photo-upload-area');
                if (uploadArea) {
                    uploadArea.dataset.listenersAdded = 'false';
                }
                window.setupPhotoUpload();
            }, 100);
        }
    } catch (error) {
        console.error('Erro em renderEditor:', error);
        console.error('profileData recebido:', profileData);
        console.error('Stack trace:', error.stack);

        // Tentar renderizar pelo menos os campos básicos mesmo com erro
        try {
            if (SELECTORS.displayNameInput && profileData?.details?.display_name) {
                SELECTORS.displayNameInput.value = profileData.details.display_name;
            }
            if (SELECTORS.whatsappNumberInput && profileData?.details?.whatsapp) {
                SELECTORS.whatsappNumberInput.value = profileData.details.whatsapp;
            }
            if (SELECTORS.bioInput && profileData?.details?.bio) {
                SELECTORS.bioInput.value = profileData.details.bio;
            }
            if (SELECTORS.profileSlugInput && profileData?.details?.profile_slug) {
                SELECTORS.profileSlugInput.value = profileData.details.profile_slug;
            }
        } catch (fallbackError) {
            console.error('Erro também no fallback de renderização:', fallbackError);
        }

        // Propagar o erro para que fetchProfileData possa tratá-lo
        throw error;
    }
}

    var DashboardEditor = {
        renderEditor: renderEditor
    };
    global.DashboardEditor = DashboardEditor;
    global.renderEditor = renderEditor;
})(typeof window !== 'undefined' ? window : this);
