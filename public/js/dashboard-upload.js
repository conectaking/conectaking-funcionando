/**
 * Dashboard Upload / Cropper — módulo isolado (Conecta King).
 * Gerado por scripts/extract-dashboard-edit-upload.js
 */
(function (global) {
    'use strict';

    function core() { return global.DashboardCore || {}; }
    function cartao() { return global.DashboardCartao || {}; }
    function editor() { return global.DashboardEditor || {}; }

    var __rawFetch = global.fetch.bind(global);

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
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders() || {};
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
            return __rawFetch(url, Object.assign({ credentials: 'include' }, options || {}));
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


    var fetch = function (url, options) {
        return env.safeFetch(url, options || {});
    };

    var cropper = null;
    var imageToUpload = { blob: null, trigger: null, element: null, originalFile: null };

async function handleDashboardPhotoUpload(imageFile) {
    if (!SELECTORS.dashboardPhotoUploadArea) return;

    SELECTORS.dashboardPhotoUploadArea.classList.add('is-uploading');
    try {
        const authResponse = await env.safeFetch(`${env.API_URL}/api/upload/auth`, {
            method: 'POST',
            headers: env.HEADERS_AUTH
        });
        if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
        const { uploadURL } = await authResponse.json();

        const formData = new FormData();

        // Preservar PNG para manter transparência
        const isPNG = imageFile.type === 'image/png' || (imageFile.name && imageFile.name.toLowerCase().endsWith('.png'));
        const fileName = isPNG ? 'profile-picture.png' : 'profile-picture.jpg';
        formData.append('file', imageFile, fileName);

        const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: env.getAuthHeaders(), body: formData });
        if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');
        const uploadData = await uploadResponse.json();

        const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
        const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
        if (!finalUrl) throw new Error('Resposta do servidor de upload inválida. Tente novamente.');

        env.setAvatarSrc(SELECTORS.dashboardPhotoPreview, finalUrl);
        env.setAvatarSrc(SELECTORS.previewAvatar, finalUrl);

        // Atualizar profile_image_url imediatamente para salvar depois
        if (window.currentProfileData && window.currentProfileData.details) {
            window.currentProfileData.details.profile_image_url = finalUrl;
        }
        if (window.lastProfileData && window.lastProfileData.details) {
            window.lastProfileData.details.profile_image_url = finalUrl;
        }

        console.log('Foto de perfil atualizada com sucesso:', finalUrl);

    } catch (error) {
        console.error('Erro no upload da foto de perfil:', error);
        alert(`Erro: ${error.message}`);
    } finally {
        SELECTORS.dashboardPhotoUploadArea.classList.remove('is-uploading');
    }
}

async function handleDashboardAvatarUpload(imageFile) {
    if (!SELECTORS.dashboardAvatarUploadArea) return;

    SELECTORS.dashboardAvatarUploadArea.classList.add('is-uploading');
    try {
        const authResponse = await env.safeFetch(`${env.API_URL}/api/upload/auth`, {
            method: 'POST',
            headers: env.HEADERS_AUTH
        });
        if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
        const { uploadURL } = await authResponse.json();

        const formData = new FormData();
        formData.append('file', imageFile, 'avatar.jpg');

        const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: env.getAuthHeaders(), body: formData });
        if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');
        const uploadData = await uploadResponse.json();

        const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
        const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
        if (!finalUrl) throw new Error('Resposta do servidor de upload inválida. Tente novamente.');

        env.setAvatarSrc(SELECTORS.dashboardAvatarPreview, finalUrl);

        alert('Avatar atualizado com sucesso!');

    } catch (error) {
        console.error('Erro no upload do avatar:', error);
        alert(`Erro: ${error.message}`);
    } finally {
        SELECTORS.dashboardAvatarUploadArea.classList.remove('is-uploading');
    }
}

// Função para atualizar o seletor de formato do avatar
async function handleImageUpload(imageFile, itemElement) {
    // Wi-Fi: upload da imagem do banner (não usar rota de banner nem salvar como item "banner")
    const isDomElStart = itemElement && typeof itemElement.querySelector === 'function';
    const isWifiItem = isDomElStart && itemElement.dataset && itemElement.dataset.itemType === 'wifi';
    if (isWifiItem) {
        const urlInput = itemElement.querySelector('.wifi-banner-url-input');
        const imgPreview = itemElement.querySelector('.wifi-banner-preview');
        if (itemElement.classList) itemElement.classList.add('is-uploading');
        try {
            const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, { method: 'POST', headers: env.HEADERS });
            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
            const { uploadURL } = await authResponse.json();
            const formData = new FormData();
            const originalName = imageFile.name || 'wifi-banner.png';
            const isPNG = originalName.toLowerCase().endsWith('.png') || imageFile.type === 'image/png';
            const fileExtension = isPNG ? 'png' : (originalName.split('.').pop() || 'jpg');
            const fileName = originalName.includes('.') ? originalName : `${originalName.split('.')[0] || 'wifi-banner'}.${fileExtension}`;
            formData.append('file', imageFile, fileName);
            const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: env.getAuthHeaders(), body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');
            const uploadData = await uploadResponse.json();
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');
            if (!finalUrl) throw new Error('URL da imagem não retornada.');
            if (urlInput) urlInput.value = finalUrl;
            if (imgPreview) {
                imgPreview.src = finalUrl;
                imgPreview.style.display = 'block';
            }
            const thumbList = itemElement.querySelector('.banner-preview-thumb');
            if (thumbList) {
                thumbList.src = finalUrl;
                thumbList.style.display = 'block';
            }
            const editId = SELECTORS.editItemModal?.dataset?.editingId;
            const itemDomId = itemElement.dataset?.id;
            if (editId && itemDomId && String(itemDomId) === String(editId)) {
                const modalBan = document.getElementById('edit-wifi-banner-url');
                const modalPrev = document.getElementById('edit-wifi-banner-preview');
                if (modalBan) modalBan.value = finalUrl;
                if (modalPrev) {
                    modalPrev.src = finalUrl;
                    modalPrev.style.display = 'block';
                }
                const modalUploadText = SELECTORS.editItemModal?.querySelector('.wifi-banner-upload-area .image-upload-text p');
                if (modalUploadText) modalUploadText.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Trocar Imagem';
            }
            env.updateLivePreviewFromForm();
        } catch (error) {
            console.error('Erro no upload Wi-Fi banner:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            if (itemElement.classList) itemElement.classList.remove('is-uploading');
        }
        return;
    }

    // Verificar se é carrossel ou banner (banner pode virar carrossel)
    const isBanner = itemElement && itemElement.dataset.itemType === 'banner';
    const isCarousel = itemElement && (itemElement.classList.contains('banner-carousel') || window.currentCarouselItemId);
    const itemId = (isCarousel || isBanner) ? (window.currentCarouselItemId || itemElement?.dataset?.id) : null;

    // IMPORTANTE: Se for banner (não carrossel), pular a lógica de carrossel
    // Banners devem ir direto para a lógica de banner normal (mais abaixo)
    if (isCarousel && itemId && !isBanner) {
        // Upload para carrossel (NÃO banner)
        try {
            const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: env.HEADERS
            });
            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');

            const { uploadURL } = await authResponse.json();

            const formData = new FormData();
            // Preservar o nome original do arquivo e extensão para manter PNG
            const originalName = imageFile.name || 'banner-image';
            const fileExtension = originalName.split('.').pop() || (imageFile.type.includes('png') ? 'png' : 'jpg');
            const fileName = originalName.includes('.') ? originalName : `${originalName}.${fileExtension}`;
            formData.append('file', imageFile, fileName);

            const uploadResponse = await fetch(uploadURL, {
                method: 'POST',
                headers: env.getAuthHeaders(),
                body: formData
            });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');

            const uploadData = await uploadResponse.json();
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

            // Adicionar imagem ao carrossel ou banner
            const carouselListEl = document.querySelector('#carousel-images-list-' + itemId);
            const inputGroup = carouselListEl?.closest('.input-group');
            const hiddenInputInGroup = inputGroup?.querySelector('input[type="hidden"]#edit-dest-url-hidden');
            const editModalInputHidden = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url-hidden`);
            const editModalInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);
            const itemDestInput = document.querySelector('.item[data-id="' + itemId + '"] .item-destination-url-input');
            const hiddenInput = hiddenInputInGroup || editModalInputHidden || editModalInput || itemDestInput;

            console.log('Procurando input hidden para itemId:', itemId);
            console.log('Inputs encontrados:', {
                hiddenInputInGroup: !!hiddenInputInGroup,
                editModalInputHidden: !!editModalInputHidden,
                editModalInput: !!editModalInput,
                itemDestInput: !!itemDestInput,
                hiddenInput: !!hiddenInput
            });

            if (hiddenInput) {
                try {
                    let images = [];
                    const currentValue = hiddenInput.value || '[]';
                    if (currentValue.trim() && currentValue !== '#') {
                        try {
                            images = JSON.parse(currentValue);
                        } catch (e) {
                            // Se não é JSON, pode ser uma URL única - converter para array
                            if (currentValue && !currentValue.startsWith('[')) {
                                images = [currentValue];
                            }
                        }
                    }

                    if (!Array.isArray(images)) {
                        images = [];
                    }

                    images.push(finalUrl);
                    hiddenInput.value = JSON.stringify(images);

                    // Atualizar também o input de image_url se existir
                    const imageUrlInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-image-url`);
                    if (imageUrlInput) {
                        imageUrlInput.value = images[0] || '';
                    }

                    // Atualizar também o input hidden do carrossel se existir
                    const destUrlHiddenInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url-hidden`);
                    if (destUrlHiddenInput) {
                        destUrlHiddenInput.value = JSON.stringify(images);
                    }

                    console.log(`Banner agora tem ${images.length} imagem${images.length !== 1 ? 'ns' : ''}`);
                    console.log('Imagens:', images);

                    // Renderizar imagens - tentar no modal primeiro, depois no item
                    setTimeout(() => {
                        renderCarouselImagesNew(itemId, images);
                    }, 100);

                    // Atualizar contador no display
                    const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                    if (itemEl) {
                        const displayDest = itemEl.querySelector('.item-display-dest');
                        if (displayDest) {
                            if (images.length > 1) {
                                displayDest.textContent = `${images.length} fotos (Carrossel)`;
                            } else {
                                displayDest.textContent = '1 foto';
                            }
                        }
                    }

                    // Atualizar preview ao vivo
                    if (typeof updateLivePreviewFromForm === 'function') {
                        env.updateLivePreviewFromForm();
                    }
                } catch (e) {
                    console.error('Erro ao adicionar imagem ao banner:', e);
                    alert('Erro ao processar a imagem. Tente novamente.');
                }
            } else {
                console.error(`Input hidden não encontrado para itemId: ${itemId}`);
                alert('Erro: não foi possível encontrar o campo do banner. Recarregue a página e tente novamente.');
            }
        } catch (error) {
            console.error('Erro no upload da imagem do carrossel:', error);
            alert('Erro ao fazer upload da imagem. Tente novamente.');
        }
        return;
    }

    // Upload para banner normal - não usar carrossel
    const bannerItemId = itemElement?.dataset.id;
    const carouselListEl = document.querySelector(`#carousel-images-list-${bannerItemId}`);
    const hiddenInput = document.querySelector(`#edit-item-modal[data-editing-id="${bannerItemId}"] #edit-dest-url-hidden`);

    // Se for carrossel de verdade, trata acima; para banner, ignorar listas/hidden antigos
    if (!isBanner && (carouselListEl || hiddenInput)) {
        try {
            let images = [];
            if (hiddenInput && hiddenInput.value) {
                try {
                    images = JSON.parse(hiddenInput.value);
                } catch (e) {
                    // Se não é JSON, pode ser uma URL única
                    if (hiddenInput.value && !hiddenInput.value.startsWith('[')) {
                        images = [hiddenInput.value];
                    }
                }
            }

            if (!Array.isArray(images)) {
                images = [];
            }

            // Fazer upload da imagem
            const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: env.HEADERS
            });
            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');

            const { uploadURL } = await authResponse.json();
            const formData = new FormData();
            // Preservar o nome original do arquivo e extensão para manter PNG
            const originalName = imageFile.name || 'banner-image';
            // Detectar tipo pelo nome ou pelo tipo MIME do blob
            const isPNG = originalName.toLowerCase().endsWith('.png') || imageFile.type === 'image/png';
            const fileExtension = isPNG ? 'png' : (originalName.split('.').pop() || 'jpg');
            const fileName = originalName.includes('.') ? originalName : `${originalName.split('.')[0] || 'banner-image'}.${fileExtension}`;
            formData.append('file', imageFile, fileName);

            const uploadResponse = await fetch(uploadURL, {
                method: 'POST',
                headers: env.getAuthHeaders(),
                body: formData
            });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');

            const uploadData = await uploadResponse.json();
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

            // Adicionar ao array
            images.push(finalUrl);

            // Atualizar inputs
            if (hiddenInput) {
                hiddenInput.value = JSON.stringify(images);
            }

            const editImageUrlInput = document.querySelector(`#edit-item-modal[data-editing-id="${bannerItemId}"] #edit-image-url`);
            if (editImageUrlInput) {
                editImageUrlInput.value = images[0] || '';
            }

            // Atualizar preview
            const bannerPreview = document.getElementById('edit-banner-preview');
            if (bannerPreview) {
                bannerPreview.src = finalUrl;
                bannerPreview.style.display = 'block';
            }

            // Banner não usa carrossel; apenas manter preview único

            env.updateLivePreviewFromForm();
            return;
        } catch (error) {
            console.error('Erro no upload do carrossel:', error);
            alert(`Erro: ${error.message}`);
            return;
        }
    }

    // Upload para banner normal (sem carrossel)
    // Garantir que currentCarouselItemId não interfira com banners
    if (isBanner) {
        window.currentCarouselItemId = null;
    }

    // itemElement pode ser um objeto fake (ex.: quando o item não está na lista ainda); só usar DOM se for elemento real
    const isDomElement = itemElement && typeof itemElement.querySelector === 'function';
    const urlInput = isDomElement ? itemElement.querySelector('.item-image-url-input') : null;
    const thumbPreview = isDomElement ? itemElement.querySelector('.banner-preview-thumb') : null;
    if (isDomElement && itemElement.classList) {
        itemElement.classList.add('is-uploading');
    }

    try {
        const authResponse = await fetch(`${env.API_URL}/api/upload/auth`, {
            method: 'POST',
            headers: env.HEADERS
        });
        if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');

        const { uploadURL } = await authResponse.json();

        const formData = new FormData();
        // Preservar o nome original do arquivo e extensão para manter PNG
        const originalName = imageFile.name || 'banner-image';
        // Detectar tipo pelo nome ou pelo tipo MIME do blob
        const isPNG = originalName.toLowerCase().endsWith('.png') || imageFile.type === 'image/png';
        const fileExtension = isPNG ? 'png' : (originalName.split('.').pop() || 'jpg');
        const fileName = originalName.includes('.') ? originalName : `${originalName.split('.')[0] || 'banner-image'}.${fileExtension}`;
        formData.append('file', imageFile, fileName);

        const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            headers: env.getAuthHeaders(),
            body: formData
        });
        if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');

        const uploadData = await uploadResponse.json();
        const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

        // Atualiza a interface
        if (urlInput) {
            urlInput.value = finalUrl;
        }

        // Atualizar thumb na lista (preview em tempo real)
        if (thumbPreview) {
            thumbPreview.src = finalUrl;
            thumbPreview.style.display = 'block';
        }

        // Atualizar preview da lista (caso tenha outro seletor)
        const listItem = document.querySelector(`.item[data-id="${bannerItemId}"]`);
        const listThumb = listItem?.querySelector('.banner-preview-thumb');
        if (listThumb) {
            listThumb.src = finalUrl;
            listThumb.style.display = 'block';
        }

        // Atualizar originalData para refletir a nova imagem
        if (listItem && listItem.dataset.originalData) {
            try {
                const originalData = JSON.parse(listItem.dataset.originalData);
                originalData.image_url = finalUrl;
                listItem.dataset.originalData = JSON.stringify(originalData);
            } catch (e) {
                console.warn('Banner: não foi possível atualizar originalData da imagem', e);
            }
        }

        // Atualizar preview no modal de edição
        const bannerPreview = document.getElementById('edit-banner-preview');
        if (bannerPreview) {
            bannerPreview.src = finalUrl;
            bannerPreview.style.display = 'block';
            const placeholder = bannerPreview.closest('.image-upload-area')?.querySelector('.preview-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            console.log(`[BANNER] Preview atualizado no modal:`, finalUrl);
        } else {
            console.warn(`[BANNER] Preview #edit-banner-preview não encontrado`);
        }

        // Atualizar também o input hidden no modal (tentar múltiplas formas de encontrar)
        if (bannerItemId) {
            // Tentar encontrar o campo de várias formas
            let editImageUrlInput = document.getElementById('edit-image-url');
            if (!editImageUrlInput) {
                editImageUrlInput = document.querySelector(`#edit-item-modal[data-editing-id="${bannerItemId}"] #edit-image-url`);
            }
            if (!editImageUrlInput) {
                editImageUrlInput = SELECTORS.editModalBody?.querySelector('#edit-image-url');
            }
            if (!editImageUrlInput) {
                editImageUrlInput = document.querySelector('#edit-item-modal #edit-image-url');
            }
            // Tentar também pelo modal atual
            if (!editImageUrlInput && SELECTORS.editItemModal) {
                editImageUrlInput = SELECTORS.editItemModal.querySelector('#edit-image-url');
            }

            if (editImageUrlInput) {
                editImageUrlInput.value = finalUrl;
                // Disparar evento change para garantir que outros listeners sejam notificados
                editImageUrlInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`[BANNER] Campo #edit-image-url atualizado no modal para item ${bannerItemId}:`, finalUrl);
                console.log(`[BANNER] Valor do campo após atualização:`, editImageUrlInput.value);
            } else {
                console.error(`[BANNER] Campo #edit-image-url NÃO encontrado no modal para item ${bannerItemId}`);
                console.error(`[BANNER] Tentativas de busca:`, {
                    porId: !!document.getElementById('edit-image-url'),
                    porDataEditingId: !!document.querySelector(`#edit-item-modal[data-editing-id="${bannerItemId}"] #edit-image-url`),
                    porEditModalBody: !!SELECTORS.editModalBody?.querySelector('#edit-image-url'),
                    porEditItemModal: !!document.querySelector('#edit-item-modal #edit-image-url'),
                    porSelectorsEditItemModal: !!SELECTORS.editItemModal?.querySelector('#edit-image-url'),
                    modalAtivo: SELECTORS.editItemModal?.classList.contains('active')
                });
            }

            // Também atualizar o campo na lista para garantir sincronização
            const listItem = document.querySelector(`.item[data-id="${bannerItemId}"], .module-item[data-id="${bannerItemId}"]`);
            const listImageInput = listItem?.querySelector('.item-image-url-input');
            if (listImageInput) {
                listImageInput.value = finalUrl;
                console.log(`[BANNER] Campo .item-image-url-input atualizado na lista para item ${bannerItemId}:`, finalUrl);
            } else {
                console.warn(`[BANNER] Campo .item-image-url-input não encontrado na lista para item ${bannerItemId}`);
            }

            // Atualizar originalData também
            if (listItem && listItem.dataset.originalData) {
                try {
                    const originalData = JSON.parse(listItem.dataset.originalData);
                    originalData.image_url = finalUrl;
                    listItem.dataset.originalData = JSON.stringify(originalData);
                    console.log(`[BANNER] originalData atualizado para item ${bannerItemId}`);
                } catch (e) {
                    console.warn('Erro ao atualizar originalData:', e);
                }
            }
        }

        console.log('[BANNER] Imagem do banner atualizada:', finalUrl);

        // Salvar automaticamente após upload bem-sucedido
        if (bannerItemId) {
            console.log(`Y' [BANNER] Salvando banner ${bannerItemId} automaticamente após upload...`);
            try {
                // Pequeno delay para garantir que todos os campos foram atualizados
                await new Promise(resolve => setTimeout(resolve, 500));
                await saveBannerItem(bannerItemId);
                console.log(`[BANNER] Banner ${bannerItemId} salvo automaticamente após upload`);
            } catch (saveError) {
                console.error(`[BANNER] Erro ao salvar banner automaticamente:`, saveError);
                // Não mostrar alerta aqui para não interromper o fluxo
            }
        }

        env.updateLivePreviewFromForm();
    } catch (error) {
        console.error('Erro no processo de upload:', error);
        alert(`Erro: ${error.message}`);
    } finally {
        if (itemElement && itemElement.classList) {
            itemElement.classList.remove('is-uploading');
        }
    }
}


// Função para duplicar item (exposta globalmente para evitar problemas de escopo)
function openCropper(file, triggerType, itemElement = null, customRatio = null) {
    const cropperModal = document.getElementById('cropper-modal');
    const image = document.getElementById('image-to-crop');
    const reader = new FileReader();

    reader.onload = function (e) {
        image.src = e.target.result;
        cropperModal.classList.add('active');

        if (cropper) {
            cropper.destroy();
        }

        let aspectRatio = NaN;
        if (triggerType === 'profile') {
            aspectRatio = 1 / 1;
        } else if (triggerType === 'background' || triggerType === 'vitrine-hero') {
            aspectRatio = 16 / 9;
        } else if (triggerType === 'share-image') {
            // Usar proporção customizada se fornecida
            if (customRatio) {
                const ratioMap = {
                    'auto': NaN,
                    '16:9': 16 / 9,
                    '4:3': 4 / 3,
                    '1:1': 1 / 1
                };
                aspectRatio = ratioMap[customRatio] || NaN;
            } else {
                // Tentar pegar do seletor se não foi fornecido
                const selectedRatioEl = document.querySelector('input[name="share-aspect-ratio-selector"]:checked');
                if (selectedRatioEl) {
                    const selectedRatio = selectedRatioEl.value;
                    const ratioMap = {
                        'auto': NaN,
                        '16:9': 16 / 9,
                        '4:3': 4 / 3,
                        '1:1': 1 / 1
                    };
                    aspectRatio = ratioMap[selectedRatio] || NaN;
                }
            }
        } else if (triggerType === 'banner' || triggerType === 'carousel' || triggerType === 'wifi-banner') {
            const selectedRatioEl = document.querySelector('input[name="aspect-ratio-selector"]:checked');
            if (selectedRatioEl) {
                const selectedRatio = selectedRatioEl.value;
                const ratioMap = {
                    'auto': NaN,
                    'tarja': 4 / 1,
                    '2:1': 2 / 1,
                    '4:3': 4 / 3,
                    '1:1': 1 / 1,
                    '3:4': 3 / 4,
                    '10:16': 10 / 16,
                    '16:9': 16 / 9
                };
                aspectRatio = ratioMap[selectedRatio] || NaN;
            }
        }

        cropper = new Cropper(image, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            background: false,
            autoCropArea: 0.9,
            responsive: true,
            restore: false,
            checkOrientation: true,
            // Mostra a foto o máximo possível na área; pan/zoom no cropper (sem scroll do modal)
            dragMode: 'move',
            ready() {
                try {
                    const modal = document.getElementById('cropper-modal');
                    const box = modal && modal.querySelector('.cropper-container');
                    if (box && this.cropper) {
                        this.cropper.resize();
                    }
                } catch (_) { /* ignore */ }
            }
        });

        imageToUpload.trigger = triggerType;
        imageToUpload.element = itemElement;
        imageToUpload.originalFile = file;  // Armazenar arquivo original para preservar tipo

        // Dica no modal para arte Vitrine
        const tipEl = document.querySelector('#cropper-modal .cropper-tip');
        if (tipEl) {
            if (triggerType === 'vitrine-hero') {
                tipEl.innerHTML = 'Arte do <strong>Modelo Vitrine</strong>: corte em <strong>16:9</strong> (ex.: 19201080). Arraste e ajuste o enquadramento antes de enviar.';
            } else if (triggerType === 'background') {
                tipEl.innerHTML = 'Sugestão para fundo do cartão: <strong>19201080</strong> (16:9) ou <strong>1600900</strong>. Prepare a foto nesse tamanho ou aproxime ao cortar. No telemóvel o fundo cobre o ecrã todo (centrado); detalhes nas bordas laterais podem sair fora.';
            }
        }
    };

    reader.readAsDataURL(file);
}

function closeCropper() {
    document.getElementById('cropper-modal').classList.remove('active');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// Função para obter ícone padrão baseado no tipo de item

    function confirmCropAndUpload() {
        if (!cropper) return;
        var originalFile = imageToUpload.originalFile;
        var isPNG = originalFile && (originalFile.type === 'image/png' || (originalFile.name && originalFile.name.toLowerCase().endsWith('.png')));
        var mimeType = isPNG ? 'image/png' : 'image/jpeg';
        var quality = isPNG ? 1.0 : 0.9;
        cropper.getCroppedCanvas({
            width: 1920,
            height: imageToUpload.trigger === 'vitrine-hero' ? 1080 : undefined,
            imageSmoothingQuality: 'high'
        }).toBlob(function (blob) {
            if (isPNG) {
                var fileName = originalFile && originalFile.name ? originalFile.name : 'profile-picture.png';
                var pngFile = new File([blob], fileName, { type: 'image/png' });
                dispatchCropped(pngFile);
            } else {
                dispatchCropped(blob);
            }
            closeCropper();
        }, mimeType, quality);
    }

    function dispatchCropped(fileOrBlob) {
        var t = imageToUpload.trigger;
        if (t === 'profile') handleDashboardPhotoUpload(fileOrBlob);
        else if (t === 'banner' || t === 'wifi-banner' || t === 'carousel') handleImageUpload(fileOrBlob, imageToUpload.element);
        else if (t === 'background') env.handleBackgroundUpload(fileOrBlob);
        else if (t === 'share-image') env.handleShareImageUpload(fileOrBlob);
        else if (t === 'vitrine-hero') env.handleVitrineHeroUpload(fileOrBlob);
    }

    function initCropButtons() {
        var cancel = document.getElementById('cancel-crop-btn');
        var ok = document.getElementById('crop-and-upload-btn');
        if (cancel && !cancel.dataset.ckUploadBound) {
            cancel.addEventListener('click', closeCropper);
            cancel.dataset.ckUploadBound = '1';
        }
        if (ok && !ok.dataset.ckUploadBound) {
            ok.addEventListener('click', confirmCropAndUpload);
            ok.dataset.ckUploadBound = '1';
        }
    }

    var DashboardUpload = {
        openCropper: openCropper,
        closeCropper: closeCropper,
        handleImageUpload: handleImageUpload,
        handleDashboardPhotoUpload: handleDashboardPhotoUpload,
        handleDashboardAvatarUpload: handleDashboardAvatarUpload,
        confirmCropAndUpload: confirmCropAndUpload,
        init: initCropButtons,
        getCropper: function () { return cropper; },
        getImageToUpload: function () { return imageToUpload; }
    };
    global.DashboardUpload = DashboardUpload;
    global.openCropper = openCropper;
    global.closeCropper = closeCropper;
    global.handleImageUpload = handleImageUpload;
    global.handleDashboardPhotoUpload = handleDashboardPhotoUpload;
    global.handleDashboardAvatarUpload = handleDashboardAvatarUpload;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCropButtons);
    } else {
        initCropButtons();
    }
})(typeof window !== 'undefined' ? window : this);
