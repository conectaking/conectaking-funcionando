/**
 * Dashboard Edit Modal — openEditModal isolado (Conecta King).
 * Gerado por scripts/extract-dashboard-edit-upload.js
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
        getAuthHeaders: function () {
            var c = core();
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders();
            return this.HEADERS_AUTH;
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        },
        setAvatarSrc: function (el, src) {
            var c = core();
            if (typeof c.setAvatarSrc === 'function') return c.setAvatarSrc(el, src);
            if (el) el.src = src || '';
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
        bannerUrlModelsHtml: function () {
            var c = core();
            if (typeof c.bannerUrlModelsHtml === 'function') return c.bannerUrlModelsHtml();
            return '';
        },
        bannerDestDisplayLabel: function (raw) {
            var c = core();
            if (typeof c.bannerDestDisplayLabel === 'function') return c.bannerDestDisplayLabel(raw);
            return String(raw || '').trim();
        },
        wifiBannerUploadBlockHtml: function () {
            var c = core();
            if (typeof c.wifiBannerUploadBlockHtml === 'function') return c.wifiBannerUploadBlockHtml.apply(c, arguments);
            return '';
        },
        getDefaultIcon: function (t) {
            var c = core();
            if (typeof c.getDefaultIcon === 'function') return c.getDefaultIcon(t);
            return 'fas fa-link';
        },
        moduleListDisplayTitle: function (item) {
            var c = core();
            if (typeof c.moduleListDisplayTitle === 'function') return c.moduleListDisplayTitle(item);
            return (item && (item.title || item.item_type)) || 'Módulo';
        },
        updateLivePreviewFromForm: function () {
            var k = cartao();
            if (k && typeof k.updateLivePreviewFromForm === 'function') return k.updateLivePreviewFromForm();
        },
        renderEditor: function (data) {
            var e = editor();
            if (e && typeof e.renderEditor === 'function') return e.renderEditor(data);
        },
        handleBackgroundUpload: function (file) {
            var c = core();
            if (typeof c.handleBackgroundUpload === 'function') return c.handleBackgroundUpload(file);
            if (typeof global.handleBackgroundUpload === 'function') return global.handleBackgroundUpload(file);
        },
        handleShareImageUpload: function (file) {
            var c = core();
            if (typeof c.handleShareImageUpload === 'function') return c.handleShareImageUpload(file);
            if (typeof global.handleShareImageUpload === 'function') return global.handleShareImageUpload(file);
        },
        handleVitrineHeroUpload: function (file) {
            var c = core();
            if (typeof c.handleVitrineHeroUpload === 'function') return c.handleVitrineHeroUpload(file);
            if (typeof global.handleVitrineHeroUpload === 'function') return global.handleVitrineHeroUpload(file);
        }
    };

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            return s ? s[prop] : null;
        }
    });


    function callOpenCropper() {
        var fn = global.openCropper || (global.DashboardUpload && global.DashboardUpload.openCropper);
        if (typeof fn === 'function') return fn.apply(null, arguments);
    }
    function callHandleImageUpload() {
        var fn = global.handleImageUpload || (global.DashboardUpload && global.DashboardUpload.handleImageUpload);
        if (typeof fn === 'function') return fn.apply(null, arguments);
    }

async function openEditModal(itemEl) {
    const itemId = itemEl.dataset.id;
    const itemType = itemEl.dataset.itemType;

    // Redirecionar para página de edição dedicada (digital_form abre modal no dashboard)
    if (itemType === 'sales_page' || itemType === 'guest_list' || itemType === 'contract' || itemType === 'king_selection' || itemType === 'convite' || itemType === 'bible') {
        // IMPORTANTE: Verificar se o item é temporário (não salvo ainda)
        // Verificar tanto pelo ID quanto pelo atributo data-is-temporary
        const isTemporary = (itemId && itemId.toString().startsWith('temp_')) ||
            itemEl.dataset.isTemporary === 'true' ||
            itemEl.hasAttribute('data-is-temporary');

        console.log(`Verificando se sales_page é temporário:`, {
            itemId,
            isTemporary,
            hasDataIsTemporary: itemEl.hasAttribute('data-is-temporary'),
            datasetIsTemporary: itemEl.dataset.isTemporary
        });

        if (isTemporary) {
            alert('Este módulo ainda não foi salvo. Por favor, clique em "Publicar alterações" primeiro para salvar o módulo antes de editá-lo.');
            return; // Não redirecionar
        }

        // IMPORTANTE: Verificar se o item existe no servidor antes de redirecionar
        try {
            updateHeaders();
            const checkResponse = await fetch(`${env.API_URL}/api/profile/items/${itemId}`, {
                method: 'GET',
                headers: env.HEADERS
            });

            if (!checkResponse.ok) {
                if (checkResponse.status === 404) {
                    alert('Este módulo não existe mais no servidor. Ele pode ter sido deletado. Removendo do dashboard...');
                    // Remover do DOM
                    itemEl.remove();
                    // Remover do currentProfileData se existir
                    if (window.currentProfileData && window.currentProfileData.items) {
                        window.currentProfileData.items = window.currentProfileData.items.filter(item => String(item.id) !== String(itemId));
                    }
                    return; // Não redirecionar
                }
                throw new Error(`Erro ${checkResponse.status} ao verificar item`);
            }
        } catch (error) {
            console.error('Erro ao verificar se item existe:', error);
            alert('Erro ao verificar se o módulo existe. Tente novamente.');
            return; // Não redirecionar em caso de erro
        }

        if (itemType === 'sales_page') {
            window.location.href = `salesPageEdit.html?itemId=${itemId}`;
        } else if (itemType === 'guest_list') {
            window.location.href = `guestListEdit.html?itemId=${itemId}`;
        } else if (itemType === 'contract' || itemType === 'agenda' || itemType === 'kingbrief' || itemType === 'king_bolao') {
            alert('Este módulo foi descontinuado e já não está disponível.');
            return;
        } else if (itemType === 'king_selection') {
            window.location.href = kingSelectionAdminUrl();
        } else if (itemType === 'convite') {
            window.location.href = `conviteEdit.html?itemId=${itemId}`;
        } else if (itemType === 'bible') {
            try {
                sessionStorage.setItem('bible_item_id', String(itemId));
                sessionStorage.setItem('bible_panel_item_id', String(itemId));
            } catch (e) {}
            window.location.href = 'bibliaking.html';
        }
        return;
    }

    let formHTML = '';

    // Funf§f£o auxiliar para sanitizar URLs de imagem
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
        // Aceitar apenas URLs vf¡lidas: data URIs ou http/https
        if (trimmedUrl.startsWith('data:image/') ||
            trimmedUrl.startsWith('http://') ||
            trimmedUrl.startsWith('https://')) {
            return trimmedUrl;
        }
        return defaultPlaceholder;
    }

    const currentTitle = itemEl.querySelector('.item-title-input')?.value || '';
    // Para banner, pegar destination_url do input hidden que pode ter JSON
    let currentDestUrl = itemEl.querySelector('.item-destination-url-input')?.value || '';
    const currentPixKey = itemEl.querySelector('.item-pix-key-input')?.value || '';
    const currentPdfUrl = itemEl.querySelector('.item-pdf-url-input')?.value || '';
    const currentAspectRatio = itemEl.dataset.aspectRatio || 'tarja';

    // Para banner, verificar se tem dados originais do item (do servidor)
    let itemOriginalData = null;
    if (itemType === 'banner' && itemEl.dataset.originalData) {
        try {
            itemOriginalData = JSON.parse(itemEl.dataset.originalData);
        } catch (e) {
            console.log('Erro ao parsear originalData:', e);
        }
    }

    // Se tem dados originais e destination_url está vazio ou é placeholder, usar dados originais
    if (itemOriginalData && itemType === 'banner') {
        if (!currentDestUrl || currentDestUrl === '#' || currentDestUrl.includes('placeholder')) {
            currentDestUrl = itemOriginalData.destination_url || '';
        }
    }
    // Se destination_url for JSON ou contiver imagem, limpar para não poluir o input
    if (itemType === 'banner') {
        window.currentCarouselItemId = null;
        const rawOpenDest = currentDestUrl;
        if (rawOpenDest.trim().startsWith('[')) {
            currentDestUrl = '';
        } else {
            const openParts = env.parseBannerDestination(rawOpenDest);
            currentDestUrl = rawOpenDest.trim().startsWith('{')
                ? openParts.primary_url
                : (() => {
                    const parts = String(rawOpenDest).split(',').map(p => p.trim()).filter(Boolean);
                    const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                    return (filtered[0] || parts[0] || '').trim();
                })();
        }
    }

    // Verificar se f© carrossel pela classe ou pelo destination_url
    const isCarouselItem = itemEl.classList.contains('banner-carousel') ||
        (itemType === 'banner' && currentDestUrl && (currentDestUrl.startsWith('[') || currentDestUrl === '[]'));
    const rawImageUrl = itemEl.querySelector('.item-image-url-input')?.value || '';
    let currentImageUrl = sanitizeImageUrl(rawImageUrl);

    // Se não tem image_url e tem dados originais, usar dados originais
    if (itemOriginalData && itemType === 'banner' && (!currentImageUrl || currentImageUrl.includes('placeholder'))) {
        currentImageUrl = sanitizeImageUrl(itemOriginalData.image_url || '');
    }

    console.log('Abrindo modal para item:', {
        itemId: itemEl.dataset.id,
        itemType: itemType,
        currentDestUrl: currentDestUrl,
        currentImageUrl: currentImageUrl,
        isCarouselItem: isCarouselItem,
        itemOriginalData: itemOriginalData
    });

    switch (itemType) {
        case 'link':
            // Link personalizado - com upload de logo
            const currentLinkImageUrl = itemEl.querySelector('.item-image-url-input')?.value || '';
            const currentLinkIconClass = itemEl.querySelector('.item-icon-picker i')?.className || 'fas fa-link';
            const logoPreviewStyleModal = (currentLinkImageUrl && currentLinkImageUrl.trim() && !currentLinkImageUrl.includes('placeholder')) ? 'display: block;' : 'display: none;';
            const currentLogoSize = itemEl.dataset.logoSize ? parseInt(itemEl.dataset.logoSize) : (itemEl.querySelector('.item-logo-size-input')?.value || 24);
            const logoPreviewSizeModal = Math.min(currentLogoSize, 100);

            // Buscar logo_fit_mode do item original ou do dataset
            let currentLogoFitMode = 'contain'; // Padrão: completo, sem corte
            if (window.currentProfileData && window.currentProfileData.items) {
                const originalItem = window.currentProfileData.items.find(i => String(i.id) === String(itemId));
                if (originalItem && originalItem.logo_fit_mode) {
                    currentLogoFitMode = originalItem.logo_fit_mode;
                }
            }
            // Tentar pegar do dataset ou input hidden
            const logoFitModeInput = itemEl.querySelector('.item-logo-fit-mode-input');
            if (logoFitModeInput && logoFitModeInput.value) {
                currentLogoFitMode = logoFitModeInput.value;
            }

            formHTML = `
            <div class="input-group">
                <label>Logo (PNG ou JPG)</label>
                <div class="logo-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                    <input type="file" class="item-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                    <img src="${currentLinkImageUrl || ''}" class="item-logo-upload-preview" style="max-width: ${logoPreviewSizeModal}px; max-height: ${logoPreviewSizeModal}px; width: ${logoPreviewSizeModal}px; height: ${logoPreviewSizeModal}px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; ${logoPreviewStyleModal}">
                    <div class="logo-upload-text" style="${!currentLinkImageUrl || currentLinkImageUrl.includes('placeholder') ? '' : 'display: none;'}">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                        <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload</p>
                        <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG ou JPG (máx. 5MB)</span>
                    </div>
                    <button type="button" class="remove-logo-btn" style="display: ${currentLinkImageUrl && !currentLinkImageUrl.includes('placeholder') ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Remover Logo
                    </button>
                    <div class="upload-loader" style="display: none;"></div>
                </div>
                <input type="hidden" class="item-image-url-input" id="edit-link-image-url" value="${currentLinkImageUrl || ''}">
            </div>
            ${currentLinkImageUrl && !currentLinkImageUrl.includes('placeholder') ? `
            <div class="input-group">
                <label>Tamanho da Logo (em pixels)</label>
                <div class="range-slider" style="margin-bottom: 15px;">
                    <div class="range-slider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <label style="margin: 0; color: var(--text, #ECECEC);">Tamanho: <span id="edit-logo-size-value-${itemId}">${currentLogoSize}</span>px</label>
                        <input type="number" class="item-logo-size-input" id="edit-logo-size-input-${itemId}" value="${currentLogoSize}" min="20" max="600" step="1" style="width: 80px; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC); text-align: center;">
                    </div>
                    <input type="range" class="item-logo-size-slider" id="edit-logo-size-slider-${itemId}" value="${currentLogoSize}" min="20" max="600" step="5" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-dark, #A1A1A1);">
                        <span>20px</span>
                        <span>600px</span>
                    </div>
                </div>
            </div>
            <div class="input-group">
                <label>Ajuste da Logo</label>
                <div class="segmented-control" style="display: flex; gap: 8px; background: var(--card-background-color, #1C1C21); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                    <input type="radio" id="edit-logo-fit-contain-${itemId}" name="edit-logo-fit-mode-${itemId}" value="contain" ${(!currentLogoFitMode || currentLogoFitMode === 'contain') ? 'checked' : ''} style="display: none;">
                    <label for="edit-logo-fit-contain-${itemId}" style="flex: 1; padding: 8px 12px; text-align: center; border-radius: 6px; cursor: pointer; background: ${(!currentLogoFitMode || currentLogoFitMode === 'contain') ? 'var(--dourado-principal, #FFC700)' : 'transparent'}; color: ${(!currentLogoFitMode || currentLogoFitMode === 'contain') ? '#000' : 'var(--text, #ECECEC)'}; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;">
                        <i class="fas fa-expand" style="margin-right: 5px;"></i> Automático
                    </label>
                    <input type="radio" id="edit-logo-fit-cover-${itemId}" name="edit-logo-fit-mode-${itemId}" value="cover" ${(currentLogoFitMode === 'cover') ? 'checked' : ''} style="display: none;">
                    <label for="edit-logo-fit-cover-${itemId}" style="flex: 1; padding: 8px 12px; text-align: center; border-radius: 6px; cursor: pointer; background: ${(currentLogoFitMode === 'cover') ? 'var(--dourado-principal, #FFC700)' : 'transparent'}; color: ${(currentLogoFitMode === 'cover') ? '#000' : 'var(--text, #ECECEC)'}; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;">
                        <i class="fas fa-crop" style="margin-right: 5px;"></i> Com Corte
                    </label>
                </div>
                <input type="hidden" class="item-logo-fit-mode-input" id="edit-logo-fit-mode-input-${itemId}" value="${currentLogoFitMode || 'contain'}">
            </div>
            ` : ''}
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Link Personalizado">
            </div>
            <div class="input-group">
                <label>URL de Destino</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://exemplo.com">
            </div>
            <div class="input-group">
                <label>Ícone (opcional - usado se não houver logo)</label>
                <div class="item-icon-picker" style="font-size: 2rem; cursor: pointer; color: var(--dourado-principal, #FFC700); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border-color, #2C2C2F); border-radius: 8px; margin: 10px 0;" title="Clique para alterar ícone">
                    <i class="${currentLinkIconClass}"></i>
                </div>
            </div>
        `;
            break;
        case 'telegram':
        case 'facebook':
        case 'instagram':
        case 'pinterest':
        case 'reddit':
        case 'tiktok':
        case 'twitch':
        case 'twitter':
        case 'spotify':
        case 'linkedin':
        case 'portfolio':
        case 'youtube':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Link">
            </div>
            <div class="input-group">
                <label>URL de Destino</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://exemplo.com">
            </div>
        `;
            break;
        case 'banner':
            // Capturar nome e mensagem atuais do banner
            const listBannerNameInput = itemEl.querySelector('.item-banner-name-input');
            const listWhatsappHidden = itemEl.querySelector('.item-title-input-hidden');
            const currentBannerName = listBannerNameInput?.value || currentTitle || '';
            const currentWhatsappMsg = listWhatsappHidden?.value || '';

            formHTML = `
            <div class="input-group">
                <label>Nome do Banner</label>
                <input type="text" id="edit-banner-name" value="${currentBannerName}" placeholder="Ex: Banner WhatsApp, Banner Instagram">
            </div>
            <div class="input-group">
                <label>Proporção do Banner</label>
                <div class="aspect-ratio-control">
                    <input type="radio" name="aspect-ratio-selector" id="ratio-auto" value="auto" ${currentAspectRatio === 'auto' ? 'checked' : ''}>
                    <label for="ratio-auto">Automática</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-tarja" value="tarja" ${currentAspectRatio === 'tarja' ? 'checked' : ''}>
                    <label for="ratio-tarja">Tarja</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-2-1" value="2:1" ${currentAspectRatio === '2:1' ? 'checked' : ''}>
                    <label for="ratio-2-1">2:1</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-4-3" value="4:3" ${currentAspectRatio === '4:3' ? 'checked' : ''}>
                    <label for="ratio-4-3">4:3</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-1-1" value="1:1" ${currentAspectRatio === '1:1' ? 'checked' : ''}>
                    <label for="ratio-1-1">1:1</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-3-4" value="3:4" ${currentAspectRatio === '3:4' ? 'checked' : ''}>
                    <label for="ratio-3-4">3:4</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-10-16" value="10:16" ${currentAspectRatio === '10:16' ? 'checked' : ''}>
                    <label for="ratio-10-16">10:16</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-16-9" value="16:9" ${currentAspectRatio === '16:9' ? 'checked' : ''}>
                    <label for="ratio-16-9">16:9</label>
                </div>
            </div>
            <div class="input-group">
                <label>Imagem do Banner</label>
                <div class="image-upload-area" data-item-type="banner" data-item-id="${itemId}">
                    <input type="file" class="item-file-input" accept="image/*" data-item-type="banner" data-item-id="${itemId}">
                    <div class="image-upload-text">
                        <p><i class="fas fa-cloud-upload-alt"></i> Trocar Imagem</p>
                        <span>Clique para fazer upload ou arraste uma imagem aqui</span>
                    </div>
                    <img id="edit-banner-preview" class="banner-preview" src="${currentImageUrl || ''}" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${currentImageUrl && !currentImageUrl.includes('placeholder') ? 'block' : 'none'}; border-radius: 8px;">
                    <div class="upload-loader"></div>
                </div>
            </div>
            <div class="input-group">
                <label>URL ao clicar na imagem (opcional)</label>
                <input type="text" id="edit-dest-url" value="${(currentDestUrl && !currentDestUrl.startsWith('[') ? currentDestUrl : '').replace(/"/g, '&quot;')}" placeholder="https://link.do.banner">
            </div>
            <div class="input-group">
                <label>Mensagem WhatsApp (opcional)</label>
                <small style="display:block;color:#a1a1a1;font-size:0.8rem;margin:0 0 8px;">Se a URL acima for WhatsApp (wa.me), esta mensagem vai pré-preenchida no chat.</small>
                <input type="text" id="edit-banner-title" value="${(currentWhatsappMsg || '').replace(/"/g, '&quot;')}" placeholder="Ex: Olá! Gostaria de saber mais sobre seus produtos.">
            </div>
            ${env.bannerUrlModelsHtml()}
            <input type="hidden" id="edit-image-url" value="${currentImageUrl || ''}">
        `;
            break;
        case 'carousel':
            // ===== NOVO CARROSSEL - MODAL LIMPO =====
            let carouselImages = [];

            // Obter imagens do input hidden do item
            const itemCarouselJsonInput = itemEl.querySelector('.carousel-images-json-new');
            if (itemCarouselJsonInput && itemCarouselJsonInput.value && itemCarouselJsonInput.value.trim()) {
                try {
                    const parsed = JSON.parse(itemCarouselJsonInput.value);
                    if (Array.isArray(parsed)) {
                        carouselImages = parsed.filter(img => {
                            const url = typeof img === 'string' ? img : (img.image_url || img);
                            return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                        });
                    }
                } catch (e) {
                    console.warn('Erro ao parsear imagens:', e);
                }
            } else if (currentDestUrl && currentDestUrl.startsWith('[')) {
                try {
                    const parsed = JSON.parse(currentDestUrl);
                    if (Array.isArray(parsed)) {
                        carouselImages = parsed.filter(img => {
                            const url = typeof img === 'string' ? img : (img.image_url || img);
                            return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                        });
                    }
                } catch (e) { }
            }

            const carouselAspectRatio = itemEl.dataset.aspectRatio || 'auto';
            const firstImage = carouselImages.length > 0 ? (typeof carouselImages[0] === 'string' ? carouselImages[0] : carouselImages[0].image_url || carouselImages[0]) : '';

            formHTML = `
            <div class="input-group">
                <label>Proporção de Aspecto</label>
                <div class="aspect-ratio-selector" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;">
                    <input type="radio" name="aspect-ratio-selector" id="ratio-auto-carousel-${itemId}" value="auto" ${carouselAspectRatio === 'auto' ? 'checked' : ''}>
                    <label for="ratio-auto-carousel-${itemId}">Automática</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-tarja-carousel-${itemId}" value="tarja" ${carouselAspectRatio === 'tarja' ? 'checked' : ''}>
                    <label for="ratio-tarja-carousel-${itemId}">Tarja</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-2-1-carousel-${itemId}" value="2:1" ${carouselAspectRatio === '2:1' ? 'checked' : ''}>
                    <label for="ratio-2-1-carousel-${itemId}">2:1</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-4-3-carousel-${itemId}" value="4:3" ${carouselAspectRatio === '4:3' ? 'checked' : ''}>
                    <label for="ratio-4-3-carousel-${itemId}">4:3</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-1-1-carousel-${itemId}" value="1:1" ${carouselAspectRatio === '1:1' ? 'checked' : ''}>
                    <label for="ratio-1-1-carousel-${itemId}">1:1</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-3-4-carousel-${itemId}" value="3:4" ${carouselAspectRatio === '3:4' ? 'checked' : ''}>
                    <label for="ratio-3-4-carousel-${itemId}">3:4</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-10-16-carousel-${itemId}" value="10:16" ${carouselAspectRatio === '10:16' ? 'checked' : ''}>
                    <label for="ratio-10-16-carousel-${itemId}">10:16</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-16-9-carousel-${itemId}" value="16:9" ${carouselAspectRatio === '16:9' ? 'checked' : ''}>
                    <label for="ratio-16-9-carousel-${itemId}">16:9</label>
                </div>
            </div>
            <div class="input-group">
                <label>Imagens do Carrossel</label>
                <div id="carousel-images-list-new-${itemId}" class="carousel-images-list-new" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px; min-height: 50px;">
                    ${carouselImages.length === 0 ? '<p style="color: #999; text-align: center; padding: 20px; font-size: 0.9rem; grid-column: 1/-1;">Nenhuma imagem adicionada ainda.</p>' : ''}
                </div>
                <label class="carousel-upload-label-new" for="carousel-file-new-${itemId}" style="position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21); display: block; margin-top: 10px;">
                    <input type="file" id="carousel-file-new-${itemId}" class="carousel-file-input-new" accept="image/png,image/jpeg,image/jpg" data-item-id="${itemId}" multiple style="position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip: rect(0,0,0,0); pointer-events: none;">
                    <div style="pointer-events: none;">
                        <i class="fas fa-plus-circle" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                        <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para adicionar imagens</p>
                        <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG, JPG ou JPEG (máx. 5MB por imagem)</span>
                    </div>
                    <div class="carousel-upload-loader-new" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2000; width: 40px; height: 40px; border: 5px solid rgba(255,255,255,0.3); border-top-color: var(--dourado-principal, #FFC700); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </label>
                <input type="hidden" class="carousel-images-json-new" data-item-id="${itemId}" value='${JSON.stringify(carouselImages)}'>
                <input type="hidden" id="edit-image-url" value="${firstImage}">
                <small style="color: #999; display: block; margin-top: 10px;"><i class="fas fa-info-circle"></i> As imagens passam automaticamente a cada 3 segundos</small>
            </div>
        `;
            break;
        case 'whatsapp':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Ex: Chamar no WhatsApp">
            </div>
            <div class="input-group">
                <label>Telefone (com código do país)</label>
                <input type="tel" id="edit-dest-url" value="${currentDestUrl}" placeholder="5521999999999">
            </div>
        `;
            break;
        case 'email':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Ex: Enviar Email">
            </div>
            <div class="input-group">
                <label>Endereço de Email</label>
                <input type="email" id="edit-dest-url" value="${currentDestUrl}" placeholder="contato@exemplo.com">
            </div>
        `;
            break;
        case 'pix':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título (ex: PIX Celular)">
            </div>
            <div class="input-group">
                <label>Nome do Recebedor</label>
                <input type="text" id="edit-recipient-name" value="${itemEl.querySelector('.item-recipient-name-input')?.value || ''}" placeholder="Seu nome completo">
            </div>
            <div class="input-group">
                <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
                <div class="pix-key-examples">
                    <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: +5511999999999)</small>
                    <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                    <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                    <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
                </div>
                <input type="text" id="edit-pix-key" value="${currentPixKey}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
            </div>
            <div class="input-group">
                <label>Valor (opcional)</label>
                <input type="number" id="edit-pix-amount" value="${itemEl.querySelector('.item-pix-amount-input')?.value || ''}" placeholder="Valor em reais" step="0.01">
            </div>
            <div class="input-group">
                <label>Descrif§f£o (opcional)</label>
                <input type="text" id="edit-pix-description" value="${itemEl.querySelector('.item-pix-description-input')?.value || ''}" placeholder="Descrif§f£o do pagamento">
            </div>
        `;
            break;
        case 'pix_qrcode':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título (ex: Faça um PIX)">
            </div>
            <div class="input-group">
                <label>Nome do Recebedor</label>
                <input type="text" id="edit-recipient-name" value="${itemEl.querySelector('.item-recipient-name-input')?.value || ''}" placeholder="Seu nome completo">
            </div>
            <div class="input-group">
                <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
                <div class="pix-key-examples">
                    <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: +5511999999999)</small>
                    <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                    <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                    <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
                </div>
                <input type="text" id="edit-pix-key" value="${currentPixKey}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
            </div>
            <div class="input-group">
                <label>Valor (opcional)</label>
                <input type="number" id="edit-pix-amount" value="${itemEl.querySelector('.item-pix-amount-input')?.value || ''}" placeholder="Valor em reais" step="0.01">
            </div>
            <div class="input-group">
                <label>Descrif§f£o (opcional)</label>
                <input type="text" id="edit-pix-description" value="${itemEl.querySelector('.item-pix-description-input')?.value || ''}" placeholder="Descrif§f£o do pagamento">
            </div>
        `;
            break;
        case 'wifi': {
            const escWifiModal = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
            const wFmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
            const wSsid = itemEl.querySelector('.wifi-ssid-input')?.value || '';
            const wPass = itemEl.querySelector('.wifi-password-input')?.value || '';
            const wSec = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
            const wHidden = !!itemEl.querySelector('.wifi-hidden-input')?.checked;
            const wBanner = itemEl.querySelector('.wifi-banner-url-input')?.value || '';
            const wLogo = itemEl.querySelector('.wifi-logo-url-input')?.value || '';
            const wLogoSize = itemEl.querySelector('.wifi-logo-size-input')?.value || '48';
            let wifiCfgEdit = {};
            const profileWifiItem = (window.currentProfileData?.items || []).find(function (it) {
                return String(it.id) === String(itemId);
            });
            if (profileWifiItem?.destination_url && String(profileWifiItem.destination_url).trim().startsWith('{')) {
                try { wifiCfgEdit = JSON.parse(profileWifiItem.destination_url); } catch (e) { wifiCfgEdit = {}; }
            }
            formHTML = `
            <div class="input-group">
                <label>Título no cartão</label>
                <input type="text" id="edit-title" value="${escWifiModal(currentTitle)}" placeholder="Texto do botão (ex: Conectar ao Wi-Fi)">
            </div>
            <div class="input-group">
                <label>Formato</label>
                <div style="display: flex; gap: 15px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="radio" class="wifi-display-format-input" name="wifi-modal-df-${itemId}" value="button" ${wFmt === 'button' ? 'checked' : ''}>
                        <span>Botão</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="radio" class="wifi-display-format-input" name="wifi-modal-df-${itemId}" value="banner" ${wFmt === 'banner' ? 'checked' : ''}>
                        <span>Banner</span>
                    </label>
                </div>
            </div>
            <div class="input-group">
                <label>Nome da rede Wi-Fi (SSID)</label>
                <small style="display:block;color:#a1a1a1;font-size:0.8rem;margin:4px 0 8px;line-height:1.35;">Obrigatório. ? o nome exato que aparece na lista de redes do celular (usado no QR Code).</small>
                <input type="text" id="edit-wifi-ssid" value="${escWifiModal(wSsid)}" placeholder="Ex: MinhaLoja_WiFi ou Visitantes_5G" maxlength="32">
            </div>
            <div class="input-group">
                <label>Segurança</label>
                <select id="edit-wifi-security" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color,#2C2C2F);background:var(--card-background-color,#1C1C21);color:var(--text,#ECECEC);">
                    <option value="WPA" ${wSec === 'WPA' || wSec === 'WPA2' || wSec === 'WPA3' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
                    <option value="WEP" ${wSec === 'WEP' ? 'selected' : ''}>WEP</option>
                    <option value="nopass" ${wSec === 'nopass' || wSec === 'NONE' ? 'selected' : ''}>Rede aberta (sem senha)</option>
                </select>
            </div>
            <div class="input-group">
                <label>Senha (opcional)</label>
                <input type="text" id="edit-wifi-password" value="${escWifiModal(wPass)}" placeholder="Deixe vazio se for rede aberta" autocomplete="off">
            </div>
            <div class="input-group">
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" id="edit-wifi-hidden" ${wHidden ? 'checked' : ''}>
                    Rede oculta (SSID não transmitido)
                </label>
            </div>
            <div class="wifi-modal-logo-section" style="display: ${wFmt === 'banner' ? 'none' : 'block'};">
                <div class="input-group">
                    <label>Tamanho da logo (px)</label>
                    <input type="number" id="edit-wifi-logo-size" value="${escWifiModal(wLogoSize)}" min="20" max="600" step="1" style="width: 120px;">
                </div>
                <input type="hidden" id="edit-wifi-logo-url" value="${escWifiModal(wLogo)}">
                <p style="color:#888;font-size:0.85rem;">Upload de logo/imagem: use a área na lista do módulo ao lado.</p>
            </div>
            <div class="wifi-modal-banner-section" style="display: ${wFmt === 'banner' ? 'block' : 'none'};">
                ${env.wifiBannerUploadBlockHtml(itemId, wBanner)}
            </div>
        `;
            break;
        }
        case 'pdf':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título (ex: Baixar Catálogo)">
            </div>
            <div class="input-group">
                <label>Arquivo PDF</label>
                <div class="image-upload-area pdf-upload-area">
                    <input type="file" class="item-file-input" accept=".pdf">
                    <div class="image-upload-text">
                        <p>${currentPdfUrl && currentPdfUrl !== '#' ? 'Trocar Arquivo' : 'Selecionar Arquivo PDF'}</p>
                        <span>Clique para enviar (max 10MB)</span>
                    </div>
                    <div class="upload-loader"></div>
                </div>
            </div>
            <input type="hidden" id="edit-pdf-url" value="${currentPdfUrl}">
        `;
            break;
        case 'instagram_embed':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Conteúdo">
            </div>
            <div class="input-group">
                <label>URL do Perfil do Instagram</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.instagram.com/p/... ou https://www.instagram.com/seu_usuario/">
            </div>
        `;
            break;
        case 'youtube_embed':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Conteúdo">
            </div>
            <div class="input-group">
                <label>URL do Vídeo do YouTube</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/...">
            </div>
        `;
            break;
        case 'tiktok_embed':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Perfil">
            </div>
            <div class="input-group">
                <label>URL do Perfil do TikTok</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.tiktok.com/@seu_usuario">
            </div>
        `;
            break;
        case 'spotify_embed':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Perfil">
            </div>
            <div class="input-group">
                <label>URL do Perfil do Spotify</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://open.spotify.com/user/seu_usuario ou https://open.spotify.com/artist/seu_artista">
            </div>
        `;
            break;
        case 'linkedin_embed':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Perfil">
            </div>
            <div class="input-group">
                <label>URL do Perfil do LinkedIn</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.linkedin.com/in/seu_perfil">
            </div>
        `;
            break;
        case 'pinterest_embed':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Perfil">
            </div>
            <div class="input-group">
                <label>URL do Perfil do Pinterest</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.pinterest.com/seu_usuario ou https://br.pinterest.com/seu_usuario">
            </div>
        `;
            break;
        case 'banner':
            // Banner simples (SEM carrossel) - uma imagem, nome e mensagem opcional
            formHTML = `
            <div class="input-group">
                <label>Nome do Banner</label>
                <input type="text" id="edit-banner-name" value="${currentBannerName || ''}" placeholder="Ex: Banner WhatsApp, Banner Instagram">
                <small style="color: #999; display: block; margin-top: 5px;">Este nome aparece na lista.</small>
            </div>
            <div class="input-group">
                <label>Proporção do Banner</label>
                <div class="aspect-ratio-control">
                    <input type="radio" name="aspect-ratio-selector" id="ratio-auto" value="auto" ${currentAspectRatio === 'auto' ? 'checked' : ''}>
                    <label for="ratio-auto">Automática</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-tarja" value="tarja" ${currentAspectRatio === 'tarja' ? 'checked' : ''}>
                    <label for="ratio-tarja">Tarja</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-2-1" value="2:1" ${currentAspectRatio === '2:1' ? 'checked' : ''}>
                    <label for="ratio-2-1">2:1</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-4-3" value="4:3" ${currentAspectRatio === '4:3' ? 'checked' : ''}>
                    <label for="ratio-4-3">4:3</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-1-1" value="1:1" ${currentAspectRatio === '1:1' ? 'checked' : ''}>
                    <label for="ratio-1-1">1:1</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-3-4" value="3:4" ${currentAspectRatio === '3:4' ? 'checked' : ''}>
                    <label for="ratio-3-4">3:4</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-10-16" value="10:16" ${currentAspectRatio === '10:16' ? 'checked' : ''}>
                    <label for="ratio-10-16">10:16</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-16-9" value="16:9" ${currentAspectRatio === '16:9' ? 'checked' : ''}>
                    <label for="ratio-16-9">16:9</label>
                </div>
            </div>
            <div class="input-group">
                <label>Imagem do Banner</label>
                <div class="image-upload-area" data-item-type="banner" data-item-id="${itemId}">
                    <input type="file" class="item-file-input" accept="image/*" data-item-type="banner" data-item-id="${itemId}">
                    <div class="image-upload-text">
                        <p><i class="fas fa-cloud-upload-alt"></i> Clique para fazer upload</p>
                        <span>ou arraste uma imagem aqui</span>
                    </div>
                    <img id="edit-banner-preview" class="banner-preview" src="${currentImageUrl || ''}" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${currentImageUrl && !currentImageUrl.includes('placeholder') ? 'block' : 'none'};">
                    <div class="upload-loader"></div>
                </div>
            </div>
            <div class="input-group">
                <label>URL de Destino (opcional)</label>
                <input type="text" id="edit-dest-url" value="${currentDestUrl && !currentDestUrl.startsWith('[') ? currentDestUrl : ''}" placeholder="https://link.do.banner">
                <small style="color: #999; display: block; margin-top: 5px;">Para onde o banner leva quando clicado</small>
            </div>
            <div class="input-group">
                <label>Mensagem WhatsApp (opcional)</label>
                <input type="text" id="edit-banner-title" value="${currentBannerTitle || ''}" placeholder="Ex: Olá! Gostaria de saber mais sobre seus produtos.">
                <small style="color: #999; display: block; margin-top: 5px;">Usada apenas quando a URL acima for WhatsApp.</small>
            </div>
            ${env.bannerUrlModelsHtml()}
            <input type="hidden" id="edit-image-url" value="${currentImageUrl || ''}">
            <input type="hidden" id="edit-dest-url-hidden" value="">
        `;
            break;
        case 'pdf_embed':
            formHTML = `
            <div class="input-group">
                <label>Título</label>
                <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Documento">
            </div>
            <div class="input-group">
                <label>Arquivo PDF</label>
                <div class="image-upload-area pdf-upload-area">
                    <input type="file" class="item-file-input" accept=".pdf">
                    <div class="image-upload-text">
                        <p>${currentPdfUrl && currentPdfUrl !== '#' ? 'Trocar Arquivo' : 'Selecionar Arquivo PDF'}</p>
                        <span>Clique para enviar (max 10MB)</span>
                    </div>
                    <div class="upload-loader"></div>
                </div>
            </div>
            <input type="hidden" id="edit-pdf-url" value="${currentPdfUrl}">
        `;
            break;
        case 'location':
            (function () {
                var locItem = (window.currentProfileData && window.currentProfileData.items) ? window.currentProfileData.items.find(function (i) { return String(i.id) === String(itemId); }) : null;
                var locData = (locItem && locItem.location_data) || {};
                var locAddr = (locData.address_formatted || locData.address || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                var locLat = locData.latitude != null ? String(locData.latitude) : '';
                var locLng = locData.longitude != null ? String(locData.longitude) : '';
                var locTitle = (currentTitle || 'Localização').replace(/"/g, '&quot;');
                formHTML = `
            <div class="input-group location-edit-panel" data-item-id="${itemId}">
                <label>Título do botão</label>
                <input type="text" id="edit-title" class="location-title-input" value="${locTitle}" placeholder="Ex: Onde me encontrar">
            </div>
            <div class="input-group">
                <label>Endereço</label>
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <input type="text" id="location-address-input" class="location-address-input" value="${locAddr}" placeholder="Digite o endereço ou pesquise..." style="flex:1;">
                    <button type="button" class="location-search-btn" style="padding:10px 16px;border-radius:8px;background:var(--dourado-principal,#FFC700);color:#000;border:none;font-weight:600;cursor:pointer;white-space:nowrap;"><i class="fas fa-search"></i> Pesquisar</button>
                </div>
                <p class="location-formatted-display" style="font-size:0.9em;opacity:0.9;margin:0 0 8px 0;min-height:1.4em;"></p>
                <input type="hidden" id="location-lat-input" class="location-lat-input" value="${locLat}">
                <input type="hidden" id="location-lng-input" class="location-lng-input" value="${locLng}">
            </div>
            <div class="input-group">
                <label>Mapa</label>
                <div class="location-map-preview-edit" style="height:220px;border-radius:12px;overflow:hidden;background:rgba(0,0,0,0.3);position:relative;">
                    <div id="location-map-container-${itemId}" class="location-map-container" style="width:100%;height:100%;min-height:220px;"></div>
                </div>
                <p class="location-map-hint" style="font-size:0.75rem;opacity:0.85;margin-top:6px;"><i class="fas fa-hand-paper"></i> Arraste o marcador ou clique no mapa para ajustar o ponto exato.</p>
                <p style="font-size:0.75rem;opacity:0.7;margin-top:4px;">No cartão, o visitante poderá abrir no Google Maps ou no Waze.</p>
            </div>
        `;
            })();
            break;
        case 'digital_form':
            // Buscar dados do formulário se existirem
            let formData = {};
            if (window.currentProfileData && window.currentProfileData.items) {
                const itemData = window.currentProfileData.items.find(i => String(i.id) === String(itemId));
                if (itemData && itemData.digital_form_data) {
                    formData = itemData.digital_form_data;
                } else if (itemData && itemData.form_data) {
                    formData = itemData.form_data;
                }
            }

            const currentFormTitle = formData.form_title || currentTitle || 'Formulário King';
            const currentFormLogo = formData.form_logo_url || '';
            const currentFormDescription = formData.form_description || '';
            const currentFormWhatsapp = formData.whatsapp_number || '';
            const currentDisplayFormat = formData.display_format || 'button';
            const currentBannerImage = formData.banner_image_url || itemEl.querySelector('.item-image-url-input')?.value || '';
            const currentHeaderImage = formData.header_image_url || '';
            const currentBackgroundImage = formData.background_image_url || '';
            const currentBackgroundOpacity = formData.background_opacity !== undefined ? formData.background_opacity : 1.0;
            const currentTheme = formData.theme || 'light';
            const currentPrimaryColor = formData.primary_color || '#4A90E2';
            const currentTextColor = formData.text_color || '#333333';
            const currentFormFields = formData.form_fields || [];

            formHTML = `
            <!-- Sistema de Abas -->
            <div class="form-tabs-container" style="margin-bottom: 20px; border-bottom: 2px solid var(--border-color, #2C2C2F);">
                <div class="form-tabs" style="display: flex; gap: 0;">
                    <button type="button" class="form-tab-btn active" data-tab="config" style="flex: 1; padding: 12px 20px; background: transparent; border: none; border-bottom: 3px solid var(--dourado-principal, #FFC700); color: var(--dourado-principal, #FFC700); cursor: pointer; font-weight: 600; transition: all 0.3s;">
                        <i class="fas fa-cog"></i> Configurações
                    </button>
                    <button type="button" class="form-tab-btn" data-tab="questions" style="flex: 1; padding: 12px 20px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--text-dark, #A1A1A1); cursor: pointer; font-weight: 600; transition: all 0.3s;">
                        <i class="fas fa-question-circle"></i> Perguntas
                    </button>
                    <button type="button" class="form-tab-btn" data-tab="responses" style="flex: 1; padding: 12px 20px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--text-dark, #A1A1A1); cursor: pointer; font-weight: 600; transition: all 0.3s;">
                        <i class="fas fa-chart-bar"></i> Respostas
                    </button>
                </div>
            </div>
            
            <!-- Aba: Configurações -->
            <div class="form-tab-content" data-tab-content="config" style="display: block;">
            <div class="input-group">
                <label>Título do Módulo</label>
                <input type="text" id="edit-digital-form-title" value="${currentTitle || 'Formulário King'}" placeholder="Formulário King">
            </div>
            <div class="input-group">
                <label>Formato de Exibição</label>
                <div style="display: flex; gap: 15px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="radio" name="digital-form-display-format" value="button" ${currentDisplayFormat === 'button' ? 'checked' : ''}>
                        <span>Botão</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="radio" name="digital-form-display-format" value="banner" ${currentDisplayFormat === 'banner' ? 'checked' : ''}>
                        <span>Banner</span>
                    </label>
                </div>
            </div>
            <div id="digital-form-banner-image-container" style="display: ${currentDisplayFormat === 'banner' ? 'block' : 'none'};">
                <div class="input-group">
                    <label>Imagem do Banner</label>
                    <div class="image-upload-area form-banner-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                        <input type="file" class="item-file-input form-banner-file-input" accept="image/*" style="display: none;">
                        <img src="${currentBannerImage || ''}" id="digital-form-banner-preview" class="banner-preview form-banner-preview" style="max-width: 100%; max-height: 200px; margin-bottom: 10px; ${currentBannerImage ? 'display: block;' : 'display: none;'}">
                        <div class="image-upload-text" style="${currentBannerImage ? 'display: none;' : ''}">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                            <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload do Banner</p>
                            <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">JPG, PNG (máx. 5MB)</span>
                        </div>
                        <button type="button" class="remove-banner-btn" style="display: ${currentBannerImage ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Remover Banner
                        </button>
                        <div class="upload-loader"></div>
                    </div>
                </div>
            </div>
            <input type="hidden" id="edit-digital-form-banner-image" class="item-banner-image-url-input" value="${currentBannerImage}">
            <div class="input-group">
                <label>Título do Formulário</label>
                <input type="text" id="edit-form-title" value="${currentFormTitle}" placeholder="Ex: Formulário de Contato">
            </div>
            <div class="input-group">
                <label>Logo do Formulário</label>
                <div class="logo-upload-area form-logo-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                    <input type="file" class="item-logo-file-input form-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                    <img src="${currentFormLogo || ''}" id="digital-form-logo-preview" class="item-logo-upload-preview form-logo-upload-preview" style="max-width: 150px; max-height: 150px; width: 150px; height: 150px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; ${currentFormLogo ? 'display: block;' : 'display: none;'}">
                    <div class="logo-upload-text" style="${currentFormLogo ? 'display: none;' : ''}">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                        <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload</p>
                        <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG ou JPG (máx. 5MB)</span>
                    </div>
                    <button type="button" class="remove-logo-btn" style="display: ${currentFormLogo ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Remover Logo
                    </button>
                    <div class="upload-loader"></div>
                </div>
                <input type="hidden" id="edit-form-logo-url" class="item-form-logo-url-input" value="${currentFormLogo}">
                <div class="input-group">
                    <label>Descrição do Formulário</label>
                    <textarea id="edit-form-description" rows="3" placeholder="Descreva o propósito do formulário...">${currentFormDescription}</textarea>
                </div>
                
                <div class="input-group">
                    <label>Número do WhatsApp para Receber Respostas</label>
                    <input type="text" id="edit-digital-form-whatsapp" value="${currentFormWhatsapp}" placeholder="5511999999999 (com DDD e código do país)">
                    <small style="color: #999; display: block; margin-top: 5px;">As respostas do formulário serão enviadas para este WhatsApp</small>
                </div>
            </div>
            
            <!-- Aba: Perguntas -->
            <div class="form-tab-content" data-tab-content="questions" style="display: none;">
                <div style="margin-bottom: 20px;">
                    <button type="button" class="btn btn-primary add-question-btn" data-item-id="${itemId}" style="width: 100%; padding: 12px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-plus"></i> Adicionar Pergunta
                    </button>
                </div>
                <div id="form-questions-container-${itemId}" class="form-questions-container" data-item-id="${itemId}">
                    <!-- Perguntas serão renderizadas aqui -->
                </div>
                <input type="hidden" id="edit-digital-form-fields" value='${JSON.stringify(currentFormFields)}'>
            </div>
            
            <!-- Aba: Respostas -->
            <div class="form-tab-content" data-tab-content="responses" style="display: none;">
                <div id="form-responses-dashboard-${itemId}" class="form-responses-dashboard" data-item-id="${itemId}">
                    <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                        <p>Carregando respostas...</p>
                    </div>
                </div>
            </div>
            
            <!-- Botão para abrir página de edição completa -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border-color, #2C2C2F);">
                <button type="button" class="btn-edit-form-page" data-item-id="${itemId}" style="width: 100%; padding: 14px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="fas fa-external-link-alt"></i>
                    <span>Abrir Página de Edição Completa</span>
                </button>
                <p style="text-align: center; color: var(--text-dark, #A1A1A1); font-size: 0.85rem; margin-top: 10px;">Para editar perguntas e visualizar respostas, abra a página de edição completa</p>
            </div>
        `;

            // Configurar sistema de abas e listeners
            setTimeout(() => {
                const modalSelector = `#edit-item-modal[data-editing-id="${itemId}"]`;

                // Sistema de abas
                const tabButtons = document.querySelectorAll(`${modalSelector} .form-tab-btn`);
                const tabContents = document.querySelectorAll(`${modalSelector} .form-tab-content`);

                tabButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const targetTab = btn.dataset.tab;

                        // Remover active de todos os botões
                        tabButtons.forEach(b => {
                            b.classList.remove('active');
                            b.style.borderBottomColor = 'transparent';
                            b.style.color = 'var(--text-dark, #A1A1A1)';
                        });

                        // Adicionar active ao botão clicado
                        btn.classList.add('active');
                        btn.style.borderBottomColor = 'var(--dourado-principal, #FFC700)';
                        btn.style.color = 'var(--dourado-principal, #FFC700)';

                        // Esconder todos os conteúdos
                        tabContents.forEach(content => {
                            content.style.display = 'none';
                        });

                        // Mostrar conteúdo da aba selecionada
                        const targetContent = document.querySelector(`${modalSelector} .form-tab-content[data-tab-content="${targetTab}"]`);
                        if (targetContent) {
                            targetContent.style.display = 'block';

                            // Se for a aba de Respostas, carregar dados
                            if (targetTab === 'responses' && typeof window.loadFormResponses === 'function') {
                                setTimeout(() => window.loadFormResponses(itemId), 100);
                            }

                            // Se for a aba de Perguntas, renderizar perguntas
                            if (targetTab === 'questions' && typeof window.renderFormQuestions === 'function') {
                                setTimeout(() => {
                                    const fieldsInput = document.querySelector(`${modalSelector} #edit-digital-form-fields`);
                                    let fields = [];
                                    if (fieldsInput && fieldsInput.value) {
                                        try {
                                            fields = JSON.parse(fieldsInput.value);
                                        } catch (e) {
                                            fields = [];
                                        }
                                    }
                                    window.renderFormQuestions(itemId, fields);
                                }, 100);
                            }
                        }
                    });
                });

                // Listener para formato de exibição
                const formatRadios = document.querySelectorAll(`${modalSelector} input[name="digital-form-display-format"]`);
                const bannerContainer = document.getElementById('digital-form-banner-image-container');
                formatRadios.forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (bannerContainer) {
                            bannerContainer.style.display = radio.value === 'banner' ? 'block' : 'none';
                        }
                    });
                });

                // Configurar upload de logo do formulário digital (usar seletor específico do modal)
                const logoUploadArea = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .form-logo-upload-area`);
                const logoFileInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .form-logo-file-input`);
                if (logoUploadArea && logoFileInput) {
                    // Remover listeners anteriores clonando o elemento
                    const newLogoUploadArea = logoUploadArea.cloneNode(true);
                    logoUploadArea.parentNode.replaceChild(newLogoUploadArea, logoUploadArea);
                    const newLogoFileInput = newLogoUploadArea.querySelector('.form-logo-file-input');

                    newLogoUploadArea.addEventListener('click', (e) => {
                        e.stopPropagation();
                        newLogoFileInput.click();
                    });
                    newLogoFileInput.addEventListener('change', async (e) => {
                        e.stopPropagation();
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

                        const preview = document.getElementById('digital-form-logo-preview');
                        const hiddenInput = document.getElementById('edit-form-logo-url');
                        const uploadText = newLogoUploadArea.querySelector('.logo-upload-text');
                        const removeBtn = newLogoUploadArea.querySelector('.remove-logo-btn');
                        const loader = newLogoUploadArea.querySelector('.upload-loader');

                        // Mostrar loader
                        if (loader) loader.style.display = 'block';
                        if (uploadText) uploadText.style.opacity = '0.5';

                        try {
                            // Obter URL de upload
                            const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, {
                                method: 'POST',
                                headers: env.HEADERS
                            });
                            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                            const { uploadURL } = await authResponse.json();

                            // Fazer upload
                            const formData = new FormData();
                            formData.append('file', file);
                            const uploadResponse = await fetch(uploadURL, {
                                method: 'POST',
                                headers: env.getAuthHeaders(),
                                body: formData
                            });
                            if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');

                            const uploadData = await uploadResponse.json();
                            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

                            // Atualizar interface
                            if (preview) {
                                preview.src = finalUrl;
                                preview.style.display = 'block';
                            }
                            if (hiddenInput) hiddenInput.value = finalUrl;
                            if (uploadText) uploadText.style.display = 'none';
                            if (removeBtn) removeBtn.style.display = 'block';

                            console.log('Logo do formulário digital enviado:', finalUrl);
                        } catch (error) {
                            console.error('O Erro ao fazer upload do logo:', error);
                            alert(`Erro ao fazer upload: ${error.message}`);
                        } finally {
                            if (loader) loader.style.display = 'none';
                            if (uploadText) uploadText.style.opacity = '1';
                        }
                    });

                    // Botão remover logo
                    const removeLogoBtn = newLogoUploadArea.querySelector('.remove-logo-btn');
                    if (removeLogoBtn) {
                        removeLogoBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const preview = document.getElementById('digital-form-logo-preview');
                            const hiddenInput = document.getElementById('edit-form-logo-url');
                            const uploadText = newLogoUploadArea.querySelector('.logo-upload-text');
                            if (preview) preview.style.display = 'none';
                            if (hiddenInput) hiddenInput.value = '';
                            if (uploadText) uploadText.style.display = 'block';
                            removeLogoBtn.style.display = 'none';
                        });
                    }
                }

                // Configurar upload de banner do formulário digital
                const bannerUploadArea = document.querySelector('.form-banner-upload-area');
                const bannerFileInput = document.querySelector('.form-banner-file-input');
                if (bannerUploadArea && bannerFileInput) {
                    bannerUploadArea.addEventListener('click', () => bannerFileInput.click());
                    bannerFileInput.addEventListener('change', async (e) => {
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

                        const preview = document.getElementById('digital-form-banner-preview');
                        const hiddenInput = document.getElementById('edit-digital-form-banner-image');
                        const uploadText = bannerUploadArea.querySelector('.image-upload-text');
                        const removeBtn = bannerUploadArea.querySelector('.remove-banner-btn');
                        const loader = bannerUploadArea.querySelector('.upload-loader');

                        // Mostrar loader
                        if (loader) loader.style.display = 'block';
                        if (uploadText) uploadText.style.opacity = '0.5';

                        try {
                            // Obter URL de upload
                            const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, {
                                method: 'POST',
                                headers: env.HEADERS
                            });
                            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                            const { uploadURL } = await authResponse.json();

                            // Fazer upload
                            const formData = new FormData();
                            formData.append('file', file);
                            const uploadResponse = await fetch(uploadURL, {
                                method: 'POST',
                                headers: env.getAuthHeaders(),
                                body: formData
                            });
                            if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');

                            const uploadData = await uploadResponse.json();
                            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

                            // Atualizar interface
                            if (preview) {
                                preview.src = finalUrl;
                                preview.style.display = 'block';
                            }
                            if (hiddenInput) hiddenInput.value = finalUrl;
                            if (uploadText) uploadText.style.display = 'none';
                            if (removeBtn) removeBtn.style.display = 'block';

                            console.log('Banner do formulário digital enviado:', finalUrl);
                        } catch (error) {
                            console.error('O Erro ao fazer upload do banner:', error);
                            alert(`Erro ao fazer upload: ${error.message}`);
                        } finally {
                            if (loader) loader.style.display = 'none';
                            if (uploadText) uploadText.style.opacity = '1';
                        }
                    });

                    // Botão remover banner
                    const removeBannerBtn = bannerUploadArea.querySelector('.remove-banner-btn');
                    if (removeBannerBtn) {
                        removeBannerBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const preview = document.getElementById('digital-form-banner-preview');
                            const hiddenInput = document.getElementById('edit-digital-form-banner-image');
                            const uploadText = bannerUploadArea.querySelector('.image-upload-text');
                            if (preview) preview.style.display = 'none';
                            if (hiddenInput) hiddenInput.value = '';
                            if (uploadText) uploadText.style.display = 'block';
                            removeBannerBtn.style.display = 'none';
                        });
                    }
                }
            }, 100);
            break;
    }

    const modalTitleMap = {
        'link': 'Editar Link Personalizado',
        'carousel': 'Editar Carrossel',
        'digital_form': 'Editar Formulário King',
        'location': 'Editar Localização',
        'wifi': 'Editar Wi-Fi (QR Code)',
    };
    SELECTORS.editModalTitle.textContent = modalTitleMap[itemType] || (itemType === 'banner' ? 'Editar Banner' : `Editar ${itemType.replace('_', ' ').charAt(0).toUpperCase() + itemType.replace('_', ' ').slice(1)}`);
    SELECTORS.editModalBody.innerHTML = formHTML;

    // GARANTIR que itemType e editingId estão sempre definidos no modal
    SELECTORS.editItemModal.dataset.editingId = itemId;
    SELECTORS.editItemModal.dataset.itemType = itemType;
    SELECTORS.editItemModal.dataset.isNewItem = 'false';

    console.log(`[MODAL] Modal configurado:`, {
        editingId: SELECTORS.editItemModal.dataset.editingId,
        itemType: SELECTORS.editItemModal.dataset.itemType,
        isNewItem: SELECTORS.editItemModal.dataset.isNewItem
    });

    SELECTORS.editItemModal.classList.add('active');


    // Adicionar event listener para upload de imagens do carrossel
    // ===== NOVO CARROSSEL - Configurar após abrir modal =====
    if (itemType === 'carousel') {
        setTimeout(() => {
            // Renderizar imagens existentes
            const jsonInput = SELECTORS.editModalBody.querySelector(`.carousel-images-json-new[data-item-id="${itemId}"]`);
            if (jsonInput && jsonInput.value) {
                try {
                    const images = JSON.parse(jsonInput.value);
                    renderCarouselImagesNew(itemId, images);
                } catch (e) {
                    console.error('Erro ao renderizar imagens:', e);
                }
            }

            // Garantir que o input tenha listener direto também
            const fileInput = SELECTORS.editModalBody.querySelector(`#carousel-file-new-${itemId}`);
            if (fileInput) {
                console.log('[CARROSSEL] Input encontrado no modal:', fileInput.id);
                // Remover listener antigo se existir
                const newInput = fileInput.cloneNode(true);
                fileInput.parentNode.replaceChild(newInput, fileInput);
                console.log('[CARROSSEL] Input clonado e substituído para garantir listener');
            } else {
                console.error('[CARROSSEL] Input não encontrado no modal!');
            }
        }, 150);
    }

    if (itemType === 'location') {
        (function setupLocationModal() {
            var locItem = (window.currentProfileData && window.currentProfileData.items) ? window.currentProfileData.items.find(function (i) { return String(i.id) === String(itemId); }) : null;
            var locData = (locItem && locItem.location_data) || {};
            var latIn = SELECTORS.editModalBody.querySelector('.location-lat-input');
            var lngIn = SELECTORS.editModalBody.querySelector('.location-lng-input');
            var container = SELECTORS.editModalBody.querySelector('#location-map-container-' + itemId);
            var searchBtn = SELECTORS.editModalBody.querySelector('.location-search-btn');
            var addrIn = SELECTORS.editModalBody.querySelector('#location-address-input');
            var formattedP = SELECTORS.editModalBody.querySelector('.location-formatted-display');

            if (formattedP && locData && locData.address_formatted) {
                formattedP.textContent = locData.address_formatted;
            }

            var leafletMap = null;
            var marker = null;
            var defaultCenter = [-23.5505, -46.6333];
            var defaultZoom = 13;

            function updateInputsFromLatLng(lat, lng, skipReverseGeocode) {
                if (latIn) latIn.value = lat;
                if (lngIn) lngIn.value = lng;
                if (skipReverseGeocode) return;
                fetch('https://nominatim.openstreetmap.org/reverse?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng) + '&format=json', { headers: { 'Accept': 'application/json' } })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        var displayName = (data && data.display_name) ? data.display_name : '';
                        if (addrIn) addrIn.value = displayName;
                        if (formattedP) formattedP.textContent = displayName;
                    })
                    .catch(function () { if (formattedP) formattedP.textContent = 'Endereço não encontrado para este ponto.'; });
            }

            function setMarkerPosition(latLng) {
                var lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
                var lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
                if (marker) {
                    marker.setLatLng(latLng);
                } else if (window.L && leafletMap) {
                    marker = window.L.marker(latLng, { draggable: true }).addTo(leafletMap);
                    marker.on('dragend', function () {
                        var pos = marker.getLatLng();
                        updateInputsFromLatLng(pos.lat, pos.lng, false);
                    });
                }
                if (latIn) latIn.value = lat;
                if (lngIn) lngIn.value = lng;
                if (leafletMap) leafletMap.setView([lat, lng], leafletMap.getZoom() < 16 ? 17 : leafletMap.getZoom());
            }

            if (window.L && container) {
                if (window._lastLocationLeafletMap) {
                    try { window._lastLocationLeafletMap.remove(); } catch (e) {}
                    window._lastLocationLeafletMap = null;
                }
                setTimeout(function () {
                    var hasInitial = latIn && lngIn && latIn.value && lngIn.value;
                    var center = hasInitial ? [parseFloat(latIn.value), parseFloat(lngIn.value)] : defaultCenter;
                    var zoom = hasInitial ? 17 : 11;
                    leafletMap = window.L.map(container, { center: center, zoom: zoom });
                    leafletMap.invalidateSize();
                    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                        subdomains: 'abcd',
                        maxZoom: 20
                    }).addTo(leafletMap);

                    if (hasInitial) {
                        var initialLatLng = window.L.latLng(parseFloat(latIn.value), parseFloat(lngIn.value));
                        marker = window.L.marker(initialLatLng, { draggable: true }).addTo(leafletMap);
                        marker.on('dragend', function () {
                            var pos = marker.getLatLng();
                            updateInputsFromLatLng(pos.lat, pos.lng, false);
                        });
                    }

                    leafletMap.on('click', function (e) {
                        setMarkerPosition(e.latlng);
                        updateInputsFromLatLng(e.latlng.lat, e.latlng.lng, false);
                    });

                    container._leafletMap = leafletMap;
                    window._lastLocationLeafletMap = leafletMap;
                }, 200);
            }

            function updateMapFromCoords(lat, lng) {
                var latNum = parseFloat(lat);
                var lngNum = parseFloat(lng);
                if (isNaN(latNum) || isNaN(lngNum)) return;
                if (leafletMap) {
                    var latLng = window.L && window.L.latLng(latNum, lngNum);
                    leafletMap.setView(latLng, 17);
                    setMarkerPosition(latLng);
                }
            }

            if (searchBtn && addrIn) {
                searchBtn.addEventListener('click', function () {
                    var q = (addrIn.value || '').trim();
                    if (!q) return;
                    searchBtn.disabled = true;
                    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pesquisando...';
                    fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=1', { headers: { 'Accept': 'application/json' } })
                        .then(function (r) { return r.json(); })
                        .then(function (arr) {
                            if (arr && arr[0]) {
                                var lat = arr[0].lat;
                                var lon = arr[0].lon;
                                var displayName = arr[0].display_name || '';
                                if (latIn) latIn.value = lat;
                                if (lngIn) lngIn.value = lon;
                                if (addrIn) addrIn.value = displayName;
                                if (formattedP) formattedP.textContent = displayName;
                                updateMapFromCoords(lat, lon);
                            } else {
                                if (formattedP) formattedP.textContent = 'Endereço não encontrado. Tente outro termo.';
                            }
                        })
                        .catch(function () {
                            if (formattedP) formattedP.textContent = 'Erro ao pesquisar. Tente novamente.';
                        })
                        .finally(function () {
                            searchBtn.disabled = false;
                            searchBtn.innerHTML = '<i class="fas fa-search"></i> Pesquisar';
                        });
                });
            }
        })();
    }

    // Adicionar event listeners para slider de tamanho da logo (se for link ou product_catalog)
    if (itemType === 'link') {
        const logoSizeSlider = document.getElementById(`edit-logo-size-slider-${itemId}`);
        const logoSizeInput = document.getElementById(`edit-logo-size-input-${itemId}`);
        const logoSizeValueSpan = document.getElementById(`edit-logo-size-value-${itemId}`);
        const logoPreview = SELECTORS.editModalBody.querySelector('.item-logo-upload-preview');

        if (logoSizeSlider && logoSizeInput && logoSizeValueSpan) {
            // Sincronizar slider com input numérico
            logoSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                logoSizeInput.value = value;
                logoSizeValueSpan.textContent = value;
                if (logoPreview) {
                    const previewSize = Math.min(value, 100);
                    logoPreview.style.width = previewSize + 'px';
                    logoPreview.style.height = previewSize + 'px';
                    logoPreview.style.maxWidth = previewSize + 'px';
                    logoPreview.style.maxHeight = previewSize + 'px';
                }
                // Atualizar dataset do item na lista imediatamente
                const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
                if (itemEl) {
                    itemEl.dataset.logoSize = value;
                    // Também atualizar o input na lista se existir
                    const itemLogoSizeInput = itemEl.querySelector('.item-logo-size-input');
                    if (itemLogoSizeInput) {
                        itemLogoSizeInput.value = value;
                    }
                }
                env.updateLivePreviewFromForm();
            });

            logoSizeInput.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                if (isNaN(value)) value = 24;
                if (value < 20) value = 20;
                if (value > 600) value = 600;
                logoSizeInput.value = value;
                logoSizeSlider.value = value;
                logoSizeValueSpan.textContent = value;
                if (logoPreview) {
                    const previewSize = Math.min(value, 100);
                    logoPreview.style.width = previewSize + 'px';
                    logoPreview.style.height = previewSize + 'px';
                    logoPreview.style.maxWidth = previewSize + 'px';
                    logoPreview.style.maxHeight = previewSize + 'px';
                }
                // Atualizar dataset do item na lista imediatamente
                const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
                if (itemEl) {
                    itemEl.dataset.logoSize = value;
                    // Também atualizar o input na lista se existir
                    const itemLogoSizeInput = itemEl.querySelector('.item-logo-size-input');
                    if (itemLogoSizeInput) {
                        itemLogoSizeInput.value = value;
                    }
                }
                env.updateLivePreviewFromForm();
            });
        }

        // Adicionar event listeners para os radio buttons de ajuste da logo no modal
        const logoFitModeRadiosModal = document.querySelectorAll(`input[name="edit-logo-fit-mode-${itemId}"]`);
        const logoFitModeInputModal = document.getElementById(`edit-logo-fit-mode-input-${itemId}`);
        if (logoFitModeRadiosModal.length > 0 && logoFitModeInputModal) {
            logoFitModeRadiosModal.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        logoFitModeInputModal.value = e.target.value;
                        // Atualizar estilos dos labels
                        logoFitModeRadiosModal.forEach(r => {
                            const label = document.querySelector(`label[for="${r.id}"]`);
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
                        // Atualizar dataset do item na lista
                        const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
                        if (itemEl) {
                            const itemLogoFitModeInput = itemEl.querySelector('.item-logo-fit-mode-input');
                            if (itemLogoFitModeInput) {
                                itemLogoFitModeInput.value = e.target.value;
                            }
                        }
                        // Atualizar preview ao vivo
                        env.updateLivePreviewFromForm();
                    }
                });
            });
        }
    }
}

const QR_ART_THEMES = {
    rei: { name: 'Rei', swatch: 'linear-gradient(135deg,#FFC700,#1a1408)', bg: ['#070709', '#1c1506'], card: '#12100c', accent: '#FFC700', qrDark: '#FFC700', qrLight: '#16130c', text: '#F8E7B0', muted: '#C4B07A' },
    classico: { name: 'Clássico', swatch: 'linear-gradient(135deg,#fff,#C9A227)', bg: ['#f4efe2', '#ddd2b4'], card: '#ffffff', accent: '#C9A227', qrDark: '#111111', qrLight: '#ffffff', text: '#1a1a1a', muted: '#6d6248' },
    noite: { name: 'Noite', swatch: 'linear-gradient(135deg,#0ea5e9,#0b1220)', bg: ['#07111d', '#0e1f33'], card: '#0b1726', accent: '#38bdf8', qrDark: '#e0f2fe', qrLight: '#0b1726', text: '#e0f2fe', muted: '#7dd3fc' },
    ouro: { name: 'Ouro', swatch: 'linear-gradient(135deg,#fde68a,#92400e)', bg: ['#3b2508', '#111111'], card: '#1a1208', accent: '#fbbf24', qrDark: '#111111', qrLight: '#fde68a', text: '#fff7d6', muted: '#fcd34d' },
    vinho: { name: 'Vinho', swatch: 'linear-gradient(135deg,#7f1d1d,#f59e0b)', bg: ['#1c0a0d', '#3b0d16'], card: '#2a1016', accent: '#fbbf24', qrDark: '#fde68a', qrLight: '#2a1016', text: '#fde68a', muted: '#e8b86d' },
    minimal: { name: 'Minimal', swatch: 'linear-gradient(135deg,#111,#888)', bg: ['#f3f4f6', '#e5e7eb'], card: '#ffffff', accent: '#111111', qrDark: '#111111', qrLight: '#ffffff', text: '#111111', muted: '#6b7280' }
};

function openEditModalForNewItem(tempItem) {
    const itemType = tempItem.item_type;
    let formHTML = '';

    // Usar a mesma lf³gica do openEditModal mas para item novo
    switch (itemType) {
        case 'whatsapp':
        case 'telegram':
        case 'email':
        case 'facebook':
        case 'instagram':
        case 'pinterest':
        case 'reddit':
        case 'tiktok':
        case 'twitch':
        case 'twitter':
        case 'youtube':
        case 'linkedin':
        case 'portfolio':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título (ex: Meu WhatsApp)">
                </div>
                <div class="input-group">
                    <label>URL de Destino</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://wa.me/5511999999999">
                </div>
            `;
            break;
        case 'instagram_embed':
        case 'youtube_embed':
        case 'tiktok_embed':
        case 'spotify_embed':
        case 'linkedin_embed':
        case 'pinterest_embed':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Conteúdo">
                </div>
                <div class="input-group">
                    <label>URL do Conteúdo</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="Cole a URL do post ou vídeo">
                </div>
            `;
            break;
        case 'pix':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título (ex: PIX Celular)">
                </div>
                <div class="input-group">
                    <label>Nome do Recebedor</label>
                    <input type="text" id="edit-recipient-name" value="${tempItem.recipient_name || ''}" placeholder="Seu nome completo">
                </div>
                <div class="input-group">
                    <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
                    <div class="pix-key-examples">
                        <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: +5511999999999)</small>
                        <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                        <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                        <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
                    </div>
                    <input type="text" id="edit-pix-key" value="${tempItem.pix_key || ''}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
                </div>
                <div class="input-group">
                    <label>Valor (opcional)</label>
                    <input type="number" id="edit-pix-amount" value="${tempItem.pix_amount || ''}" placeholder="Valor em reais" step="0.01">
                </div>
                <div class="input-group">
                    <label>Descrif§f£o (opcional)</label>
                    <input type="text" id="edit-pix-description" value="${tempItem.pix_description || ''}" placeholder="Descrif§f£o do pagamento">
                </div>
            `;
            break;
        case 'pix_qrcode':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título (ex: Faça um PIX)">
                </div>
                <div class="input-group">
                    <label>Nome do Recebedor</label>
                    <input type="text" id="edit-recipient-name" value="${tempItem.recipient_name || ''}" placeholder="Seu nome completo">
                </div>
                <div class="input-group">
                    <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
                    <div class="pix-key-examples">
                        <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: +5511999999999)</small>
                        <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                        <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                        <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
                    </div>
                    <input type="text" id="edit-pix-key" value="${tempItem.pix_key || ''}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
                </div>
                <div class="input-group">
                    <label>Valor (opcional)</label>
                    <input type="number" id="edit-pix-amount" value="${tempItem.pix_amount || ''}" placeholder="Valor em reais" step="0.01">
                </div>
                <div class="input-group">
                    <label>Descrif§f£o (opcional)</label>
                    <input type="text" id="edit-pix-description" value="${tempItem.pix_description || ''}" placeholder="Descrif§f£o do pagamento">
                </div>
            `;
            break;
        case 'wifi': {
            let wifiCfgNew = {};
            try {
                if (tempItem.destination_url && String(tempItem.destination_url).trim().startsWith('{')) {
                    wifiCfgNew = JSON.parse(tempItem.destination_url);
                }
            } catch (e) {
                wifiCfgNew = {};
            }
            const escN = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
            const wf = (wifiCfgNew.display_format === 'banner') ? 'banner' : 'button';
            const ws = (wifiCfgNew.ssid || '').trim();
            const wp = wifiCfgNew.password != null ? String(wifiCfgNew.password) : '';
            const wsec = (wifiCfgNew.security || 'WPA').toString();
            const wh = !!wifiCfgNew.hidden;
            const wb = (wifiCfgNew.banner_image_url || '').trim();
            const wl = (wifiCfgNew.logo_url || '').trim();
            const wls = String(wifiCfgNew.logo_size || 48);
            formHTML = `
                <div class="input-group">
                    <label>Título no cartão</label>
                    <input type="text" id="edit-title" value="${escN(tempItem.title || 'Wi-Fi')}" placeholder="Texto do botão (ex: Wi-Fi da loja)">
                </div>
                <div class="input-group">
                    <label>Formato</label>
                    <div style="display: flex; gap: 15px; margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" class="wifi-display-format-input" name="wifi-modal-df-new" value="button" ${wf === 'button' ? 'checked' : ''}>
                            <span>Botão</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" class="wifi-display-format-input" name="wifi-modal-df-new" value="banner" ${wf === 'banner' ? 'checked' : ''}>
                            <span>Banner</span>
                        </label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Nome da rede Wi-Fi (SSID)</label>
                    <small style="display:block;color:#a1a1a1;font-size:0.8rem;margin:4px 0 8px;line-height:1.35;">Obrigatório. Nome que aparece na lista de redes do celular.</small>
                    <input type="text" id="edit-wifi-ssid" value="${escN(ws)}" placeholder="Ex: MinhaLoja_WiFi ou Visitantes_5G" maxlength="32">
                </div>
                <div class="input-group">
                    <label>Segurança</label>
                    <select id="edit-wifi-security" style="width:100%;padding:10px;border-radius:8px;">
                        <option value="WPA" ${wsec === 'WPA' || wsec === 'WPA2' || wsec === 'WPA3' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
                        <option value="WEP" ${wsec === 'WEP' ? 'selected' : ''}>WEP</option>
                        <option value="nopass" ${wsec === 'nopass' || wsec === 'NONE' ? 'selected' : ''}>Rede aberta (sem senha)</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Senha (opcional)</label>
                    <input type="text" id="edit-wifi-password" value="${escN(wp)}" placeholder="Deixe vazio se for rede aberta" autocomplete="off">
                </div>
                <div class="input-group">
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" id="edit-wifi-hidden" ${wh ? 'checked' : ''}>
                        Rede oculta (SSID não transmitido)
                    </label>
                </div>
                <div class="wifi-modal-logo-section" style="display: ${wf === 'banner' ? 'none' : 'block'};">
                    <div class="input-group">
                        <label>Tamanho da logo (px)</label>
                        <input type="number" id="edit-wifi-logo-size" value="${escN(wls)}" min="20" max="600" step="1" style="width: 120px;">
                    </div>
                    <input type="hidden" id="edit-wifi-logo-url" value="${escN(wl)}">
                </div>
                <div class="wifi-modal-banner-section" style="display: ${wf === 'banner' ? 'block' : 'none'};">
                    ${env.wifiBannerUploadBlockHtml(tempItem.id, wb)}
                </div>
            `;
            break;
        }
        case 'banner':
            formHTML = `
                <div class="input-group">
                    <label>Proporção do Banner</label>
                    <div class="aspect-ratio-selector">
                        <input type="radio" id="aspect-auto" name="aspect-ratio-selector" value="auto" checked>
                        <label for="aspect-auto">Automática</label>
                        <input type="radio" id="aspect-tarja" name="aspect-ratio-selector" value="tarja">
                        <label for="aspect-tarja">Tarja</label>
                        <input type="radio" id="aspect-2-1" name="aspect-ratio-selector" value="2:1">
                        <label for="aspect-2-1">2:1</label>
                        <input type="radio" id="aspect-4-3" name="aspect-ratio-selector" value="4:3">
                        <label for="aspect-4-3">4:3</label>
                        <input type="radio" id="aspect-1-1" name="aspect-ratio-selector" value="1:1">
                        <label for="aspect-1-1">1:1</label>
                        <input type="radio" id="aspect-3-4" name="aspect-ratio-selector" value="3:4">
                        <label for="aspect-3-4">3:4</label>
                        <input type="radio" id="aspect-10-16" name="aspect-ratio-selector" value="10:16">
                        <label for="aspect-10-16">10:16</label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Imagem do Banner (Clique para enquadrar)</label>
                    <div class="image-upload-area banner-item" data-item-type="banner" data-item-id="${tempItem.id}">
                        <div class="image-preview">
                            <div class="preview-placeholder" style="display: block;">
                                <i class="fas fa-image"></i>
                                <span>Preview</span>
                            </div>
                            <img id="edit-banner-preview" class="banner-preview" src="" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: none; border-radius: 8px;">
                        </div>
                        <div class="upload-info">
                            <span class="upload-text">Alterar Imagem</span>
                            <small>Enquadre na proporção escolhida</small>
                        </div>
                        <input type="file" class="item-file-input" accept="image/*" data-item-type="banner" data-item-id="${tempItem.id}" style="display: none;">
                    </div>
                </div>
                <input type="hidden" id="edit-image-url" value="">
                <div class="input-group">
                    <label>URL de Destino (para onde o banner leva)</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://exemplo.com">
                </div>
            `;
            break;
        case 'pdf':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título (ex: Manual do Produto)">
                </div>
                <div class="input-group">
                    <label>URL do PDF</label>
                    <input type="text" id="edit-pdf-url" value="${tempItem.pdf_url || ''}" placeholder="https://exemplo.com/arquivo.pdf">
                </div>
            `;
            break;
        case 'banner_carousel':
            // Banner Carrossel - criar como banner mas com JSON vazio
            let newCarouselImages = [];
            try {
                if (tempItem.destination_url) {
                    newCarouselImages = JSON.parse(tempItem.destination_url);
                }
            } catch (e) {
                newCarouselImages = [];
            }
            formHTML = `
                <div class="input-group">
                    <label>Proporção do Carrossel</label>
                    <div class="aspect-ratio-control">
                        <input type="radio" name="aspect-ratio-selector" id="ratio-16-9-temp" value="16:9" checked>
                        <label for="ratio-16-9-temp">16:9</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-4-3-temp" value="4:3">
                        <label for="ratio-4-3-temp">4:3</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-1-1-temp" value="1:1">
                        <label for="ratio-1-1-temp">1:1</label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Fotos do Carrossel <small style="color: #999; font-weight: normal;">(Adicione quantas quiser. As imagens passam automaticamente a cada 3 segundos)</small></label>
                    <div id="carousel-images-list-new-${tempItem.id}" class="carousel-images-list-new" style="min-height: 50px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;"></div>
                    <div class="image-upload-area banner-upload-modal" style="margin-top: 10px; position: relative; cursor: pointer;" onclick="document.querySelector('#carousel-input-${tempItem.id}').click();">
                        <input type="file" id="carousel-input-${tempItem.id}" class="item-file-input add-carousel-image-input" data-item-id="${tempItem.id}" accept="image/*" style="position: absolute; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10; top: 0; left: 0;">
                        <div class="image-upload-text">
                            <p><i class="fas fa-plus"></i> Adicionar Foto</p>
                            <span>Clique para adicionar mais fotos ao carrossel</span>
                        </div>
                        <div class="upload-loader"></div>
                    </div>
                </div>
                <input type="hidden" id="edit-dest-url" class="carousel-images-json-new" data-item-id="${tempItem.id}" value='${JSON.stringify(newCarouselImages)}'>
                <input type="hidden" class="carousel-images-json-new" data-item-id="${tempItem.id}" value='${JSON.stringify(newCarouselImages)}'>
            `;
            setTimeout(() => renderCarouselImagesNew(tempItem.id, newCarouselImages), 100);
            break;
        case 'digital_form':
            // Para digital_form, usar o openEditModal normal (já que ele precisa de itemId real)
            // Este case não será usado, mas mantemos para compatibilidade
            formHTML = `
                <div class="input-group">
                    <label>Título do Módulo</label>
                    <input type="text" id="edit-digital-form-title" value="${tempItem.title || 'Formulário King'}" placeholder="Formulário King">
                </div>
                <p style="color: #999; font-size: 0.9rem; margin-top: 10px;">
                    <i class="fas fa-info-circle"></i> Configure os campos do formulário após salvar.
                </p>
            `;
            break;
        case 'guest_list':
            // Para guest_list, criar formulário básico
            formHTML = `
                <div class="input-group">
                    <label>Título da Lista</label>
                    <input type="text" id="edit-guest-list-title" value="${tempItem.title || 'Lista de Convidados'}" placeholder="Lista de Convidados">
                </div>
                <div class="input-group">
                    <label>Nome do Evento</label>
                    <input type="text" id="edit-event-title" value="${tempItem.event_title || 'Evento'}" placeholder="Nome do Evento">
                </div>
                <div class="input-group">
                    <label>Descrição do Evento</label>
                    <textarea id="edit-event-description" rows="3" placeholder="Descrição opcional do evento"></textarea>
                </div>
                <p style="color: #999; font-size: 0.9rem; margin-top: 10px;">
                    <i class="fas fa-info-circle"></i> Configure os detalhes completos após salvar.
                </p>
            `;
            break;
        case 'agenda':
        case 'contract':
        case 'kingbrief':
        case 'king_bolao':
        case 'photographer_site':
            formHTML = `
                <div class="input-group">
                    <p style="color:#f87171;font-size:0.95rem;margin:0;">
                        <i class="fas fa-ban"></i> Este módulo foi descontinuado e já não está disponível no Conecta King.
                    </p>
                </div>
            `;
            break;
        case 'convite':
            formHTML = `
                <div class="input-group">
                    <label>Título do Módulo</label>
                    <input type="text" id="edit-convite-title" value="${tempItem.title || 'Convite'}" placeholder="Convite">
                </div>
                <p style="color: #999; font-size: 0.9rem; margin-top: 10px;">
                    <i class="fas fa-info-circle"></i> Personalize o convite (texto, data, local, fotos) após salvar.
                </p>
            `;
            break;
        case 'instagram_embed':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Conteúdo">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do Instagram</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.instagram.com/p/... ou https://www.instagram.com/seu_usuario/">
                </div>
            `;
            break;
        case 'youtube_embed':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Conteúdo">
                </div>
                <div class="input-group">
                    <label>URL do Vídeo do YouTube</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/...">
                </div>
            `;
            break;
        case 'tiktok_embed':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Perfil">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do TikTok</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.tiktok.com/@seu_usuario">
                </div>
            `;
            break;
        case 'spotify_embed':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Perfil">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do Spotify</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://open.spotify.com/user/seu_usuario ou https://open.spotify.com/artist/seu_artista">
                </div>
            `;
            break;
        case 'linkedin_embed':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Perfil">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do LinkedIn</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.linkedin.com/in/seu_perfil">
                </div>
            `;
            break;
        case 'pinterest_embed':
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Perfil">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do Pinterest</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.pinterest.com/seu_usuario ou https://br.pinterest.com/seu_usuario">
                </div>
            `;
            break;
        default:
            formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título">
                </div>
                <div class="input-group">
                    <label>URL de Destino</label>
                    <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://exemplo.com">
                </div>
            `;
    }

    // Configurar modal
    SELECTORS.editItemModal.dataset.editingId = tempItem.id;
    SELECTORS.editItemModal.dataset.isNewItem = 'true';
    SELECTORS.editItemModal.dataset.itemType = itemType;

    // Atualizar contefºdo do modal
    const modalTitle = SELECTORS.editItemModal.querySelector('.modal-header h4');
    modalTitle.textContent = `Configurar ${getItemTypeName(itemType)}`;

    SELECTORS.editModalBody.innerHTML = formHTML;

    // Mostrar modal
    SELECTORS.editItemModal.classList.add('active');
}


    var DashboardEditModal = {
        openEditModal: openEditModal,
        openEditModalForNewItem: openEditModalForNewItem
    };
    global.DashboardEditModal = DashboardEditModal;
    global.openEditModal = openEditModal;
    global.openEditModalForNewItem = openEditModalForNewItem;
})(typeof window !== 'undefined' ? window : this);
