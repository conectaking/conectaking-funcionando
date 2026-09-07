/**
 * Dashboard Cartão / Preview — módulo isolado (Conecta King).
 * Preview ao vivo, vCard, preservação de estado dos módulos.
 * Depende de window.DashboardCore (getSelectors, setAvatarSrc, …).
 * Gerado por scripts/extract-dashboard-cartao.js
 */
(function (global) {
    'use strict';

    function core() {
        return global.DashboardCore || {};
    }

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
        }
    };

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            if (!s) return null;
            return s[prop];
        }
    });

function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(20, 20, 23, ${alpha})`; // Cor padrão escura
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(20, 20, 23, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function sanitizeForVcard(value) {
    if (!value) return '';
    return value
        .replace(/\r\n|\r|\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .trim();
}

function normalizePhoneNumber(value) {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    const digits = trimmed.replace(/[^0-9+]/g, '');
    if (!digits) return '';
    if (digits.startsWith('+')) return digits;
    if (digits.startsWith('00') && digits.length > 2) return `+${digits.slice(2)}`;
    if (digits.length >= 11) return `+${digits}`;
    return digits;
}

function splitFullName(fullName) {
    if (!fullName) {
        return { firstName: '', lastName: '' };
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }
    return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts.slice(-1).join('')
    };
}

const SOCIAL_PROFILE_TYPES = {
    instagram: 'instagram',
    instagram_embed: 'instagram',
    facebook: 'facebook',
    twitter: 'twitter',
    tiktok: 'tiktok',
    tiktok_embed: 'tiktok',
    youtube: 'youtube',
    youtube_embed: 'youtube',
    linkedin: 'linkedin',
    linkedin_embed: 'linkedin',
    pinterest: 'pinterest',
    pinterest_embed: 'pinterest',
    spotify: 'spotify',
    spotify_embed: 'spotify',
    telegram: 'telegram',
    whatsapp: 'whatsapp',
    reddit: 'reddit',
    twitch: 'twitch'
};

const SOCIAL_USERNAME_DOMAINS = {
    instagram: 'https://www.instagram.com/',
    instagram_embed: 'https://www.instagram.com/',
    twitter: 'https://twitter.com/',
    tiktok: 'https://www.tiktok.com/@',
    tiktok_embed: 'https://www.tiktok.com/@',
    youtube: 'https://www.youtube.com/@',
    youtube_embed: 'https://www.youtube.com/@',
    linkedin: 'https://www.linkedin.com/in/',
    linkedin_embed: 'https://www.linkedin.com/in/',
    pinterest: 'https://www.pinterest.com/',
    pinterest_embed: 'https://www.pinterest.com/',
    spotify: 'https://open.spotify.com/',
    spotify_embed: 'https://open.spotify.com/',
    telegram: 'https://t.me/',
    whatsapp: 'https://wa.me/',
    reddit: 'https://www.reddit.com/user/',
    twitch: 'https://www.twitch.tv/'
};

const ITEM_TYPE_LABELS_FOR_VCARD = {
    link: 'Link Personalizado',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    email: 'Email',
    facebook: 'Facebook',
    instagram: 'Instagram',
    pinterest: 'Pinterest',
    reddit: 'Reddit',
    tiktok: 'TikTok',
    twitch: 'Twitch',
    twitter: 'X (Twitter)',
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    portfolio: 'Portfólio',
    spotify: 'Spotify',
    instagram_embed: 'Instagram',
    youtube_embed: 'YouTube',
    tiktok_embed: 'TikTok',
    spotify_embed: 'Spotify',
    linkedin_embed: 'LinkedIn',
    pinterest_embed: 'Pinterest',
    banner: 'Banner',
    texto_com_botao: 'Texto com Botão',
    carousel: 'Carrossel',
    pdf: 'PDF',
    pdf_embed: 'PDF',
    finance: 'Gestão Financeira',
    guest_list: 'Lista de Convidados',
    pix: 'PIX',
    pix_qrcode: 'PIX QR Code',
    wifi: 'Wi-Fi',
    sales_page: 'Página de Vendas',
    product_catalog: 'Catálogo de Produtos',
    banner_carousel: 'Carrossel de Banners',
    digital_form: 'King Forms',
    modo_empresa: 'Modo Empresa',
    branding: 'Personalização da Marca',
    convite: 'Convite Digital',
    bible: 'Bíblia',
    location: 'Localização',
    recibos_orcamentos: 'Recibos e Orçamentos'
};

const URL_TYPE_TAGS = {
    link: 'OTHER',
    whatsapp: 'WHATSAPP',
    telegram: 'TELEGRAM',
    email: 'EMAIL',
    facebook: 'FACEBOOK',
    instagram: 'INSTAGRAM',
    pinterest: 'PINTEREST',
    reddit: 'REDDIT',
    tiktok: 'TIKTOK',
    twitch: 'TWITCH',
    twitter: 'TWITTER',
    youtube: 'YOUTUBE',
    linkedin: 'LINKEDIN',
    portfolio: 'PORTFOLIO',
    spotify: 'SPOTIFY',
    instagram_embed: 'INSTAGRAM',
    youtube_embed: 'YOUTUBE',
    tiktok_embed: 'TIKTOK',
    spotify_embed: 'SPOTIFY',
    linkedin_embed: 'LINKEDIN',
    pinterest_embed: 'PINTEREST',
    banner: 'BANNER',
    pdf: 'PDF',
    pdf_embed: 'PDF'
};

function extractEmailAddress(rawValue) {
    if (!rawValue) return '';
    let value = rawValue.trim();
    if (!value) return '';
    if (value.toLowerCase().startsWith('mailto:')) {
        value = value.slice(7);
    }
    if (!value.includes('@')) return '';
    return value.toLowerCase();
}

// Função para extrair o ID do vf­deo do YouTube de diferentes formatos de URL
function extractYouTubeVideoId(url) {
    if (!url) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
        /youtu\.be\/([^?\n#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

// Função para converter URL do YouTube para formato de embed
function convertYouTubeUrlToEmbed(url) {
    if (!url) return '';

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return url; // Retorna a URL original se nf£o conseguir extrair o ID

    // Remove parâmetros de timestamp e outros da URL
    const cleanVideoId = videoId.split('&')[0].split('?')[0];

    return `https://www.youtube.com/embed/${cleanVideoId}`;
}

function normalizeUrlForVcard(itemType, rawValue) {
    if (!rawValue) return '';
    let value = rawValue.trim();
    if (!value || value === '#') return '';
    if (value.toLowerCase().startsWith('javascript:')) return '';
    if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value)) {
        return value;
    }

    if (itemType === 'email') {
        const email = extractEmailAddress(value);
        return email ? `mailto:${email}` : '';
    }

    if (itemType === 'whatsapp') {
        const digits = value.replace(/\D/g, '');
        if (!digits) return '';
        // Usuário deve incluir código do país - não adicionar automaticamente
        return `https://wa.me/${digits}`;
    }

    if (itemType === 'telegram') {
        if (value.startsWith('@')) {
            value = value.slice(1);
        }
        if (!value) return '';
        return `https://t.me/${value}`;
    }

    if (itemType === 'pix' || itemType === 'pix_qrcode') {
        return '';
    }

    if (value.startsWith('@')) {
        const username = value.slice(1);
        if (!username) return '';
        const domain = SOCIAL_USERNAME_DOMAINS[itemType];
        return domain ? `${domain}${username}` : '';
    }

    if (value.startsWith('www.')) {
        return `https://${value}`;
    }

    if (/^[\d()+\s-]+$/.test(value)) {
        const phone = normalizePhoneNumber(value);
        return phone ? `tel:${phone}` : '';
    }

    if (/^[a-z0-9]+:[/]{2}/i.test(value)) {
        return value;
    }

    if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(value)) {
        return `https://${value}`;
    }

    if (value.includes(' ')) {
        return '';
    }

    return `https://${value}`;
}

function updateVcardPreviewButton(buttonEl) {
    if (!buttonEl) return;

    const rawName = (SELECTORS.displayNameInput.value || '').trim();
    const slugCandidate = (SELECTORS.profileSlugInput.value || '').trim();

    const sanitizedName = sanitizeForVcard(rawName);
    const { firstName, lastName } = splitFullName(rawName);
    const sanitizedFirstName = sanitizeForVcard(firstName);
    const sanitizedLastName = sanitizeForVcard(lastName);

    // Buscar email e telefone dos itens do perfil (primeiros encontrados)
    let rawEmail = '';
    let rawPhone = '';

    const vcardLines = ['BEGIN:VCARD', 'VERSION:3.0'];

    const noteEntries = [];
    const seenEmails = new Set();
    const seenPhones = new Set();
    const seenUrls = new Set();
    const seenSocialProfiles = new Set();
    const seenPixKeys = new Set();
    let urlIndex = 1;

    const addNoteEntry = (text) => {
        if (!text) return;
        noteEntries.push(text);
    };

    const addUrlEntry = (url, label = '', typeTag = '') => {
        if (!url) return;
        const trimmedUrl = url.trim();
        if (!trimmedUrl) return;
        const lowerUrl = trimmedUrl.toLowerCase();
        if (seenUrls.has(lowerUrl)) return;
        const sanitizedUrl = sanitizeForVcard(trimmedUrl);
        vcardLines.push(`item${urlIndex}.URL:${sanitizedUrl}`);
        if (label) {
            vcardLines.push(`item${urlIndex}.X-ABLabel:${sanitizeForVcard(label)}`);
        }
        if (typeTag) {
            vcardLines.push(`URL;TYPE=${typeTag}:${sanitizedUrl}`);
        } else {
            vcardLines.push(`URL:${sanitizedUrl}`);
        }
        seenUrls.add(lowerUrl);
        urlIndex += 1;
    };

    const addSocialProfile = (url, socialType) => {
        if (!url || !socialType) return;
        const trimmedUrl = url.trim();
        if (!trimmedUrl) return;
        const key = `${socialType}|${trimmedUrl.toLowerCase()}`;
        if (seenSocialProfiles.has(key)) return;
        vcardLines.push(`X-SOCIALPROFILE;TYPE=${socialType}:${sanitizeForVcard(trimmedUrl)}`);
        seenSocialProfiles.add(key);
    };

    if (sanitizedName) {
        vcardLines.push(`FN:${sanitizedName}`);
        vcardLines.push(`N:${sanitizedLastName || ''};${sanitizedFirstName || ''};;;`);
    } else {
        vcardLines.push('N:;;;;');
    }

    addNoteEntry('Contato salvo via Conecta King.');

    if (SELECTORS.bioInput && SELECTORS.bioInput.value) {
        addNoteEntry(`Bio: ${SELECTORS.bioInput.value}`);
    }

    const publicLinkUrl = normalizeUrlForVcard('generic', SELECTORS.publicLink?.href || '');
    if (publicLinkUrl) {
        addUrlEntry(publicLinkUrl, 'Cartf£o Digital', 'WORK');
    }

    if (slugCandidate) {
        const slugUrl = normalizeUrlForVcard('generic', `https://tag.conectaking.com.br/${slugCandidate.replace(/^\/+/, '')}`);
        if (slugUrl) {
            addUrlEntry(slugUrl, 'Cartf£o Digital', 'PROFILE');
        }
    }

    const itemElements = document.querySelectorAll('#items-container .item, #items-container .module-item');

    // Primeiro: buscar email e telefone principais
    itemElements.forEach(itemEl => {
        const itemType = itemEl.dataset.itemType;
        if (!itemType) return;
        const destinationInput = itemEl.querySelector('.item-destination-url-input');
        if (destinationInput && destinationInput.value) {
            if (itemType === 'email' && !rawEmail) {
                rawEmail = extractEmailAddress(destinationInput.value) || destinationInput.value;
            } else if (itemType === 'whatsapp' && !rawPhone) {
                rawPhone = destinationInput.value.replace(/\D/g, '');
            } else if (itemType === 'telegram' && !rawPhone) {
                rawPhone = destinationInput.value.replace(/\D/g, '');
            }
        }
    });

    // Adicionar email e telefone principais ao vCard
    if (rawPhone) {
        const sanitizedPrimaryPhone = normalizePhoneNumber(rawPhone);
        if (sanitizedPrimaryPhone) {
            vcardLines.push(`TEL;TYPE=CELL,VOICE:${sanitizedPrimaryPhone}`);
            seenPhones.add(sanitizedPrimaryPhone);
        }
    }
    if (rawEmail) {
        const sanitizedPrimaryEmail = sanitizeForVcard(rawEmail.toLowerCase());
        if (sanitizedPrimaryEmail) {
            vcardLines.push(`EMAIL;TYPE=INTERNET:${sanitizedPrimaryEmail}`);
            seenEmails.add(sanitizedPrimaryEmail);
        }
    }

    // Segundo: processar todos os itens
    itemElements.forEach(itemEl => {
        const itemType = itemEl.dataset.itemType;
        if (!itemType) return;

        const rawTitle = (itemEl.querySelector('.item-title-input')?.value || '').trim();
        const itemLabel = rawTitle || ITEM_TYPE_LABELS_FOR_VCARD[itemType] || 'Link';

        if (itemType === 'pix' || itemType === 'pix_qrcode') {
            const pixKeyRaw = (itemEl.querySelector('.item-pix-key-input')?.value || '').trim();
            const pixRecipientRaw = (itemEl.querySelector('.item-recipient-name-input')?.value || '').trim();
            const pixAmountRaw = (itemEl.querySelector('.item-pix-amount-input')?.value || '').trim();
            const pixDescriptionRaw = (itemEl.querySelector('.item-pix-description-input')?.value || '').trim();

            const pixDetails = [itemLabel];
            if (pixRecipientRaw) pixDetails.push(`Recebedor: ${pixRecipientRaw}`);
            if (pixKeyRaw) {
                pixDetails.push(`Chave: ${pixKeyRaw}`);
                const sanitizedPixKey = sanitizeForVcard(pixKeyRaw);
                if (sanitizedPixKey && !seenPixKeys.has(sanitizedPixKey)) {
                    vcardLines.push(`X-PIX-KEY:${sanitizedPixKey}`);
                    seenPixKeys.add(sanitizedPixKey);
                }
            }
            if (pixAmountRaw) pixDetails.push(`Valor: ${pixAmountRaw}`);
            if (pixDescriptionRaw) pixDetails.push(pixDescriptionRaw);
            addNoteEntry(pixDetails.join(' - '));
            return;
        }

        let rawUrl = '';
        const destinationInput = itemEl.querySelector('.item-destination-url-input');
        if (destinationInput && destinationInput.value) {
            rawUrl = destinationInput.value;
        } else if (itemType === 'pdf' || itemType === 'pdf_embed') {
            rawUrl = itemEl.querySelector('.item-pdf-url-input')?.value || '';
        }

        if (itemType === 'email') {
            const emailFromItem = extractEmailAddress(rawUrl);
            if (emailFromItem) {
                const sanitizedItemEmail = sanitizeForVcard(emailFromItem);
                if (!seenEmails.has(sanitizedItemEmail)) {
                    vcardLines.push(`EMAIL;TYPE=INTERNET:${sanitizedItemEmail}`);
                    seenEmails.add(sanitizedItemEmail);
                }
            }
        }

        if (itemType === 'whatsapp') {
            const whatsappPhone = normalizePhoneNumber(rawUrl);
            if (whatsappPhone && !seenPhones.has(whatsappPhone)) {
                vcardLines.push(`TEL;TYPE=CELL:${whatsappPhone}`);
                seenPhones.add(whatsappPhone);
            }
        }

        const normalizedUrl = normalizeUrlForVcard(itemType, rawUrl);
        const socialType = SOCIAL_PROFILE_TYPES[itemType] || null;

        if (normalizedUrl) {
            if (/^mailto:/i.test(normalizedUrl)) {
                const emailAddress = extractEmailAddress(normalizedUrl);
                if (emailAddress) {
                    const sanitizedMailUrl = sanitizeForVcard(emailAddress);
                    if (!seenEmails.has(sanitizedMailUrl)) {
                        vcardLines.push(`EMAIL;TYPE=INTERNET:${sanitizedMailUrl}`);
                        seenEmails.add(sanitizedMailUrl);
                    }
                }
            } else if (/^tel:/i.test(normalizedUrl)) {
                const telValue = normalizedUrl.replace(/^tel:/i, '');
                if (telValue && !seenPhones.has(telValue)) {
                    vcardLines.push(`TEL;TYPE=CELL:${telValue}`);
                    seenPhones.add(telValue);
                }
            } else {
                const typeTag = URL_TYPE_TAGS[itemType] || 'OTHER';
                addUrlEntry(normalizedUrl, itemLabel, typeTag);
            }
            addSocialProfile(normalizedUrl, socialType);
        } else if (destinationInput && destinationInput.value.trim()) {
            addNoteEntry(`${itemLabel}: ${destinationInput.value.trim()}`);
        }

        const summaryParts = [itemLabel];
        if (normalizedUrl) {
            summaryParts.push(normalizedUrl);
        } else if (destinationInput && destinationInput.value.trim()) {
            summaryParts.push(destinationInput.value.trim());
        }
        if (itemType === 'pix' || itemType === 'pix_qrcode') {
            const pixKeyRaw = (itemEl.querySelector('.item-pix-key-input')?.value || '').trim();
            if (pixKeyRaw) summaryParts.push(`Chave: ${pixKeyRaw}`);
        }
        addNoteEntry(summaryParts.join(' - '));
    });

    if (noteEntries.length > 0) {
        const noteText = sanitizeForVcard(noteEntries.join('\n'));
        vcardLines.push(`NOTE:${noteText}`);
    }

    vcardLines.push('END:VCARD');

    const vcardContent = vcardLines.join('\r\n');

    buttonEl.href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcardContent)}`;

    const fallbackName = rawName || slugCandidate || 'contato';
    const normalizedBase = typeof fallbackName.normalize === 'function'
        ? fallbackName.normalize('NFD')
        : fallbackName;

    const fileName = normalizedBase
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '') || 'contato';

    buttonEl.setAttribute('download', `${fileName}.vcf`);

    if (!sanitizedName) {
        buttonEl.setAttribute('aria-disabled', 'true');
        buttonEl.classList.add('is-disabled');
    } else {
        buttonEl.removeAttribute('aria-disabled');
        buttonEl.classList.remove('is-disabled');
    }
}


// Relatórios: js/dashboard-relatorios.js (window.loadReportsData / DashboardRelatorios)

function updateLivePreviewFromForm() {
    if (!window.currentProfileData || !window.currentProfileData.details) return;
    const { details } = window.currentProfileData;

    SELECTORS.previewName.textContent = SELECTORS.displayNameInput.value || 'Seu Nome';
    SELECTORS.previewBio.textContent = SELECTORS.bioInput.value || 'Sua biografia...';
    SELECTORS.previewScreen.style.fontFamily = `'${SELECTORS.fontFamilySelect.value}', sans-serif`;
    SELECTORS.previewName.style.color = SELECTORS.textColorPicker.value;
    SELECTORS.previewBio.style.color = SELECTORS.textColorPicker.value;
    const avatarUrl = details.profile_image_url || env.DEFAULT_AVATAR_PLACEHOLDER;
    env.setAvatarSrc(SELECTORS.dashboardPhotoPreview, avatarUrl);
    SELECTORS.previewAvatar.style.borderColor = SELECTORS.backgroundColorPicker.value;
    env.setAvatarSrc(SELECTORS.previewAvatar, avatarUrl);

    // Aplicar formato do avatar no preview
    const avatarFormat = details.avatar_format || 'circular';
    env.applyAvatarFormatToPreview(SELECTORS.previewAvatar, avatarFormat);

    const vcardToggleChecked = document.querySelector('input[name="vcard-toggle"]:checked');
    const showVcard = vcardToggleChecked ? vcardToggleChecked.value === 'true' : true;
    let vcardBtn = document.getElementById('preview-save-contact-btn');
    if (!vcardBtn) {
        vcardBtn = document.createElement('a');
        vcardBtn.id = 'preview-save-contact-btn';
        vcardBtn.className = 'preview-link-button';
        vcardBtn.innerHTML = `<i class="fas fa-address-card"></i><span>Salvar Contato</span>`;

        const spacer = document.createElement('div');
        spacer.id = 'preview-vcard-spacer';
        spacer.style.height = '16px'; // O mesmo valor do 'gap' dos outros links

        const parentNode = SELECTORS.previewBio.parentNode;
        if (parentNode) {
            parentNode.insertBefore(vcardBtn, SELECTORS.previewItemsContainer);
            parentNode.insertBefore(spacer, SELECTORS.previewItemsContainer);
        }
    }

    // Sempre mostrar o botão; quando oculto, exibir como desativado (não sumir)
    const spacer = document.getElementById('preview-vcard-spacer');
    vcardBtn.style.display = 'flex';
    if (spacer) spacer.style.display = 'block';
    vcardBtn.innerHTML = `<i class="fas fa-address-card"></i><span>Salvar Contato${!showVcard ? ' (Desativado)' : ''}</span>`;
    if (showVcard) {
        vcardBtn.removeAttribute('disabled');
        vcardBtn.style.opacity = '';
        vcardBtn.style.cursor = '';
        vcardBtn.style.pointerEvents = '';
        vcardBtn.classList.remove('preview-link-disabled');
    } else {
        vcardBtn.classList.add('preview-link-disabled');
        vcardBtn.style.opacity = '0.65';
        vcardBtn.style.cursor = 'default';
        vcardBtn.style.pointerEvents = 'none';
        vcardBtn.removeAttribute('href'); vcardBtn.removeAttribute('role');
    }
    if (showVcard) updateVcardPreviewButton(vcardBtn);


    const allPreviewButtons = document.querySelectorAll('.preview-link-button');

    const buttonStyles = {
        backgroundColor: hexToRgba(SELECTORS.buttonColorPicker.value, SELECTORS.buttonOpacityPicker.value),
        color: SELECTORS.buttonTextColorPicker.value,
        borderRadius: `${SELECTORS.radiusTL?.value || 12}px ${SELECTORS.radiusTR?.value || 12}px ${SELECTORS.radiusBR?.value || 12}px ${SELECTORS.radiusBL?.value || 12}px`,
        fontSize: `${SELECTORS.buttonFontSizePicker.value}px`,
        justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[document.querySelector('input[name="button-align"]:checked').value]
    };

    allPreviewButtons.forEach(btn => {
        Object.assign(btn.style, buttonStyles);
    });

    const bgType = document.querySelector('input[name="bg-type"]:checked').value;
    if (bgType === 'image') {
        const imageUrl = SELECTORS.backgroundImageUrlInput.value;
        SELECTORS.previewScreen.style.backgroundImage = `url('${imageUrl}')`;
        SELECTORS.previewScreen.style.backgroundSize = 'cover';
        SELECTORS.previewScreen.style.backgroundPosition = 'center';
        SELECTORS.previewScreen.style.backgroundColor = '#000';
    } else {
        SELECTORS.previewScreen.style.backgroundImage = 'none';
        SELECTORS.previewScreen.style.backgroundColor = SELECTORS.backgroundColorPicker.value;
    }

    let bgLayer = document.getElementById('preview-background-layer');
    if (!bgLayer) {
        bgLayer = document.createElement('div');
        bgLayer.id = 'preview-background-layer';
        bgLayer.style.position = 'absolute';
        bgLayer.style.top = 0;
        bgLayer.style.left = 0;
        bgLayer.style.width = '100%';
        bgLayer.style.height = '100%';
        bgLayer.style.zIndex = '-1';
        bgLayer.style.borderRadius = 'inherit';
        bgLayer.style.backgroundSize = 'cover';
        bgLayer.style.backgroundPosition = 'center';
        bgLayer.style.transition = 'opacity 0.3s ease';
        SELECTORS.previewScreen.style.position = 'relative';
        SELECTORS.previewScreen.prepend(bgLayer);
    }

    if (bgType === 'image') {
        const imageUrl = SELECTORS.backgroundImageUrlInput.value;
        const imageOpacity = SELECTORS.backgroundImageOpacityPicker.value;

        SELECTORS.previewScreen.style.backgroundColor = SELECTORS.backgroundColorPicker.value;

        bgLayer.style.backgroundImage = `url('${imageUrl}')`;
        bgLayer.style.opacity = imageOpacity;
        SELECTORS.backgroundImageOpacityValue.textContent = `${Math.round(imageOpacity * 100)}%`;

    } else {
        bgLayer.style.backgroundImage = 'none';
        bgLayer.style.opacity = '1';
        SELECTORS.previewScreen.style.backgroundColor = SELECTORS.backgroundColorPicker.value;
    }

    const cardColor = SELECTORS.cardBackgroundColorPicker.value;
    const cardOpacity = SELECTORS.cardOpacityPicker.value;
    SELECTORS.previewCard.style.backgroundColor = hexToRgba(cardColor, cardOpacity);
    SELECTORS.cardOpacityValue.textContent = `${Math.round(cardOpacity * 100)}%`;

    const buttonOpacity = SELECTORS.buttonOpacityPicker.value;
    const tl = parseInt(SELECTORS.radiusTL?.value || 12, 10);
    const tr = parseInt(SELECTORS.radiusTR?.value || 12, 10);
    const br = parseInt(SELECTORS.radiusBR?.value || 12, 10);
    const bl = parseInt(SELECTORS.radiusBL?.value || 12, 10);
    SELECTORS.buttonBorderRadiusValue.textContent = `${tl}px ${tr}px ${br}px ${bl}px`;
    const borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
    const selectedAlign = document.querySelector('input[name="button-align"]:checked').value;
    const fontSize = `${SELECTORS.buttonFontSizePicker.value}px`;
    const justifyContentMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const buttonJustifyContent = justifyContentMap[selectedAlign];

    const itemsContainer = SELECTORS.previewItemsContainer;
    SELECTORS.previewItemsContainer.innerHTML = '';

    // Bíblia: não está no items-container (é especial), adicionar ao preview sempre (ativo ou desativado)
    const bibleItem = (window.currentProfileData?.items || []).find(function (it) { return it.item_type === 'bible'; });
    if (bibleItem) {
        const bibleToggleChecked = document.querySelector('input[name="bible-toggle"]:checked');
        const showBible = bibleToggleChecked ? bibleToggleChecked.value === 'true' : true;
        const bibleDisabled = !showBible;
        const bibleEl = document.createElement(bibleDisabled ? 'div' : 'a');
        bibleEl.className = 'preview-link-button' + (bibleDisabled ? ' preview-link-disabled' : '');
        if (!bibleDisabled) bibleEl.href = '#';
        bibleEl.innerHTML = `<i class="fas fa-bible"></i> <span>Bíblia${bibleDisabled ? ' (Desativado)' : ''}</span>`;
        bibleEl.style.backgroundColor = hexToRgba(SELECTORS.buttonColorPicker.value, bibleDisabled ? Math.max(0.3, buttonOpacity * 0.5) : buttonOpacity);
        bibleEl.style.color = SELECTORS.buttonTextColorPicker.value;
        bibleEl.style.borderRadius = borderRadius;
        bibleEl.style.justifyContent = buttonJustifyContent;
        bibleEl.style.fontSize = fontSize;
        if (bibleDisabled) { bibleEl.style.opacity = '0.65'; bibleEl.style.cursor = 'default'; bibleEl.style.pointerEvents = 'none'; }
        itemsContainer.appendChild(bibleEl);
    }

    // IMPORTANTE: Forçar leitura dos elementos atualizados do DOM
    // Usar querySelectorAll novamente para garantir que pegamos os elementos mais recentes
    const allItems = document.querySelectorAll('#items-container .item, #items-container .module-item');
    console.log(` Atualizando preview com ${allItems.length} itens do DOM`);

    allItems.forEach(itemEl => {
        const itemType = itemEl.dataset.itemType;

        // Verificar se o módulo está ativo (toggle) - funciona tanto para .module-item quanto .item
        const toggleInput = itemEl.querySelector('.module-toggle-input');
        let isActive = true; // padrão: ativo
        if (toggleInput) {
            isActive = toggleInput.checked;
        } else {
            // Se não tiver toggle, verificar dataset ou assumir ativo
            isActive = itemEl.dataset.isActive !== 'false';
        }

        // Bíblia: verificar se está visível (Oculto = desativado, mas ainda mostramos o botão)
        let isBibleVisible = true;
        if (itemType === 'bible') {
            const bibleToggleChecked = document.querySelector('input[name="bible-toggle"]:checked');
            isBibleVisible = bibleToggleChecked ? bibleToggleChecked.value === 'true' : true;
        }

        const isDisabled = !isActive || (itemType === 'bible' && !isBibleVisible);

        // Para módulos, pegar o título do .module-name, senão pegar do input
        const title = itemEl.querySelector('.module-name')?.textContent?.trim() || itemEl.querySelector('.item-title-input')?.value || '';
        let previewEl;

        if (itemType === 'wifi') {
            const wifiFmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
            const wifiSsid = (itemEl.querySelector('.wifi-ssid-input')?.value || '').trim();
            const wifiPassword = itemEl.querySelector('.wifi-password-input')?.value ?? '';
            const wifiSecurity = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
            const wifiHidden = !!itemEl.querySelector('.wifi-hidden-input')?.checked;
            const wifiBannerUrl = (itemEl.querySelector('.wifi-banner-url-input')?.value || '').trim();
            const wifiLogoUrl = (itemEl.querySelector('.wifi-logo-url-input')?.value || '').trim();
            const wifiLogoSize = Math.min(600, Math.max(20, parseInt(itemEl.querySelector('.wifi-logo-size-input')?.value || itemEl.dataset.logoSize || '48', 10) || 48));
            const wifiSafeTitle = (title || 'Wi-Fi').trim();
            const wifiCfgEnc = encodeURIComponent(JSON.stringify({
                ssid: wifiSsid,
                password: wifiPassword,
                security: wifiSecurity,
                hidden: wifiHidden,
                display_format: wifiFmt
            }));

            if (wifiFmt === 'banner' && wifiBannerUrl && !wifiBannerUrl.includes('placeholder')) {
                previewEl = document.createElement('div');
                previewEl.className = 'preview-wifi-banner-root';
                const wifiBanBtn = document.createElement('button');
                wifiBanBtn.type = 'button';
                wifiBanBtn.className = 'wifi-banner-btn';
                wifiBanBtn.setAttribute('data-wifi-config', wifiCfgEnc);
                wifiBanBtn.setAttribute('aria-label', wifiSsid ? `Wi-Fi: rede ${wifiSsid}` : 'Abrir QR Wi-Fi');
                wifiBanBtn.innerHTML = `<img src="${wifiBannerUrl}" alt="${wifiSsid ? 'Rede: ' + wifiSsid : wifiSafeTitle}" style="width:100%;height:auto;display:block;border-radius:12px;" loading="lazy">`;
                previewEl.appendChild(wifiBanBtn);
            } else {
                previewEl = document.createElement('button');
                previewEl.type = 'button';
                previewEl.className = 'preview-link-button wifi-profile-button' + (isDisabled ? ' preview-link-disabled' : '');
                previewEl.setAttribute('data-wifi-config', wifiCfgEnc);
                let wifiIconClass = 'fas fa-wifi';
                const wifiIconEl = itemEl.querySelector('.wifi-logo-section .item-icon-picker i, .item-icon-picker i');
                if (wifiIconEl) wifiIconClass = wifiIconEl.className.trim();
                const wifiLabels = wifiSsid
                    ? `<span class="wifi-btn-ssid">${wifiSsid}</span>${wifiSafeTitle && wifiSafeTitle !== wifiSsid ? `<span class="wifi-btn-card-title">${wifiSafeTitle}</span>` : ''}`
                    : `<span class="wifi-btn-fallback">${wifiSafeTitle}${isDisabled ? ' (Desativado)' : ''}</span>`;
                if (wifiLogoUrl && !wifiLogoUrl.includes('placeholder')) {
                    previewEl.innerHTML = `<img src="${wifiLogoUrl}" alt="" class="wifi-logo-img" style="width:${wifiLogoSize}px;height:${wifiLogoSize}px;object-fit:contain;border-radius:8px;flex-shrink:0;margin-right:8px;"><i class="${wifiIconClass}" style="display:none;"></i><span class="wifi-button-labels">${wifiLabels}</span>`;
                } else {
                    previewEl.innerHTML = `<i class="${wifiIconClass}"></i><span class="wifi-button-labels">${wifiLabels}</span>`;
                }
            }

            previewEl.style.backgroundColor = hexToRgba(SELECTORS.buttonColorPicker.value, isDisabled ? Math.max(0.3, buttonOpacity * 0.5) : buttonOpacity);
            previewEl.style.color = SELECTORS.buttonTextColorPicker.value;
            previewEl.style.borderRadius = borderRadius;
            previewEl.style.justifyContent = buttonJustifyContent;
            previewEl.style.fontSize = fontSize;
            if (isDisabled) {
                previewEl.style.opacity = '0.65';
                previewEl.style.cursor = 'default';
                previewEl.style.pointerEvents = 'none';
            } else {
                previewEl.style.cursor = 'pointer';
                previewEl.style.pointerEvents = 'auto';
            }
        } else if (['link', 'pix', 'pix_qrcode', 'pdf', 'whatsapp', 'telegram', 'email', 'facebook', 'instagram', 'pinterest', 'linkedin', 'portfolio', 'reddit', 'tiktok', 'twitch', 'twitter', 'youtube', 'spotify', 'convite', 'bible', 'digital_form', 'sales_page', 'location'].includes(itemType)) {
            previewEl = document.createElement(isDisabled ? 'div' : 'a');
            previewEl.className = 'preview-link-button' + (isDisabled ? ' preview-link-disabled' : '');

            previewEl.style.backgroundColor = hexToRgba(SELECTORS.buttonColorPicker.value, isDisabled ? Math.max(0.3, buttonOpacity * 0.5) : buttonOpacity);
            previewEl.style.color = SELECTORS.buttonTextColorPicker.value;
            if (isDisabled) {
                previewEl.style.opacity = '0.65';
                previewEl.style.cursor = 'default';
                previewEl.style.pointerEvents = 'none';
            }
            previewEl.style.borderRadius = borderRadius;
            previewEl.style.justifyContent = buttonJustifyContent;
            previewEl.style.fontSize = fontSize;

            // Para link personalizado, verificar se tem logo (image_url)
            // Tentar múltiplas fontes para garantir que pegamos o valor correto
            const imageUrlInput = itemEl.querySelector('.item-image-url-input');
            let imageUrl = imageUrlInput?.value || '';

            // Se não encontrou no input, tentar no dataset ou no elemento de preview
            if (!imageUrl || imageUrl.includes('placeholder')) {
                imageUrl = itemEl.dataset.imageUrl || '';
            }
            if (!imageUrl || imageUrl.includes('placeholder')) {
                const logoPreview = itemEl.querySelector('.item-logo-preview');
                if (logoPreview && logoPreview.src) {
                    imageUrl = logoPreview.src;
                }
            }

            const hasLogo = imageUrl && imageUrl.trim() && !imageUrl.includes('placeholder');
            // No preview ao vivo, usar o tamanho configurado (ou 24px padrão)
            // Mas limitar para não ficar muito grande no preview
            const logoSizeInput = itemEl.querySelector('.item-logo-size-input');
            const logoSizeConfig = logoSizeInput ? parseInt(logoSizeInput.value) || 24 : (itemEl.dataset.logoSize ? parseInt(itemEl.dataset.logoSize) : 24);
            const logoSizePreview = Math.min(logoSizeConfig, 48); // Limitar preview a 48px máximo

            // Detectar tipo de imagem para aplicar estilo correto (inicializar sempre)
            // Padrão: circular (JPEG/foto) se não conseguir detectar
            let borderRadiusPreview = '50%';
            let objectFitPreview = 'contain'; // Padrão: completo, sem corte
            if (hasLogo) {
                const imageUrlLower = imageUrl.toLowerCase();

                // Verificar logo_fit_mode do item se disponível
                const logoFitModeInput = itemEl.querySelector('.item-logo-fit-mode-input');
                const logoFitMode = logoFitModeInput?.value || itemEl.dataset.logoFitMode || 'contain';

                if (imageUrlLower.includes('.png')) {
                    // PNG: sem border-radius (logo)
                    borderRadiusPreview = '0';
                    // Usar logo_fit_mode se disponível, senão 'contain' (completo, sem corte)
                    objectFitPreview = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'contain';
                } else if (imageUrlLower.includes('.jpg') || imageUrlLower.includes('.jpeg')) {
                    // JPEG: círculo (foto)
                    borderRadiusPreview = '50%';
                    // Usar logo_fit_mode se disponível, senão 'cover' (preenche espaço)
                    objectFitPreview = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'cover';
                } else {
                    // URL sem extensão (Cloudflare R2) - verificar logo_fit_mode
                    // Se não tiver extensão, assumir PNG (logo) por padrão
                    borderRadiusPreview = '0';
                    objectFitPreview = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'contain';
                }
            }

            let iconClass = null;
            const iconPicker = itemEl.querySelector('.item-icon-picker');
            if (iconPicker) {
                const iconElement = iconPicker.querySelector('i');
                iconClass = iconElement ? iconElement.className.trim() : null;
            }

            const defaultIconsMap = { link: 'fas fa-link', convite: 'fas fa-envelope-open-text', bible: 'fas fa-bible', pix: 'fa-solid fa-qrcode', pix_qrcode: 'fas fa-qrcode', wifi: 'fas fa-wifi', digital_form: 'fas fa-file-signature', sales_page: 'fas fa-store' };
            const defaultTitlesMap = { link: 'Link Personalizado', convite: 'Convite Digital', bible: 'Bíblia', pix: 'PIX', pix_qrcode: 'PIX QR Code', wifi: 'Wi-Fi', digital_form: 'Formulário King', sales_page: 'Página de Vendas' };
            const displayTitle = (title || defaultTitlesMap[itemType] || 'Novo Item') + (isDisabled ? ' (Desativado)' : '');
            if (hasLogo && itemType === 'link') {
                const defaultIconFallback = 'fas fa-link';
                previewEl.innerHTML = `<img src="${imageUrl}" alt="${displayTitle}" style="width: ${logoSizePreview}px; height: ${logoSizePreview}px; object-fit: ${objectFitPreview}; border-radius: ${borderRadiusPreview}; margin-right: 8px; flex-shrink: 0;" onerror="this.style.display='none'; const nextIcon = this.nextElementSibling; if (nextIcon && nextIcon.tagName === 'I') nextIcon.style.display='inline-block';"><i class="${iconClass || defaultIconFallback}" style="display: none;"></i> <span>${displayTitle}</span>`;
            } else {
                const defaultIcon = defaultIconsMap[itemType] || 'fas fa-link';
                previewEl.innerHTML = `<i class="${iconClass || defaultIcon}"></i> <span>${displayTitle}</span>`;
            }

        } else if (itemType === 'banner') {
            const bannerDestParsed = env.parseBannerDestination(itemEl.querySelector('.item-destination-url-input')?.value || '');
            const bannerPrimary = bannerDestParsed.primary_url || '#';
            previewEl = document.createElement('div');
            previewEl.className = 'preview-banner-wrap';
            // Função para sanitizar URL de imagem do banner
            function sanitizeBannerImageUrl(url) {
                const defaultBannerPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDYwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjMwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPkJhbm5lcjwvdGV4dD4KPC9zdmc+Cg==';
                if (!url || typeof url !== 'string') {
                    return defaultBannerPlaceholder;
                }
                const trimmedUrl = url.trim();
                // Rejeitar URLs de placeholder externos que podem falhar
                if (trimmedUrl.includes('placeholder.com') || trimmedUrl.includes('via.placeholder')) {
                    return defaultBannerPlaceholder;
                }
                // Aceitar apenas URLs vf¡lidas: data URIs ou http/https
                if (trimmedUrl.startsWith('data:image/') ||
                    trimmedUrl.startsWith('http://') ||
                    trimmedUrl.startsWith('https://')) {
                    return trimmedUrl;
                }
                return defaultBannerPlaceholder;
            }
            const imageUrlInput = itemEl.querySelector('.item-image-url-input');
            let imageUrl = imageUrlInput ? imageUrlInput.value : '';
            imageUrl = sanitizeBannerImageUrl(imageUrl);
            if (bannerPrimary && bannerPrimary !== '#') {
                const banLink = document.createElement('a');
                banLink.className = 'preview-banner-item';
                banLink.href = bannerPrimary;
                banLink.target = '_blank';
                banLink.rel = 'noopener noreferrer';
                banLink.innerHTML = `<img src="${imageUrl}" alt="Banner Preview" style="width:100%;height:auto;display:block;border-radius:12px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDYwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjMwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPkJhbm5lcjwvdGV4dD4KPC9zdmc+Cg=='" loading="lazy">`;
                previewEl.appendChild(banLink);
            } else {
                const banImg = document.createElement('img');
                banImg.src = imageUrl;
                banImg.alt = 'Banner Preview';
                banImg.style.cssText = 'width:100%;height:auto;display:block;border-radius:12px;';
                previewEl.appendChild(banImg);
            }
        } else if (itemType === 'carousel' || itemType === 'banner_carousel') {
            // ===== CARROSSEL / BANNER_CAROUSEL - Preview =====
            previewEl = document.createElement('div');
            previewEl.className = 'preview-carousel-item';
            previewEl.style.cssText = 'width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2); position: relative;';

            const jsonInput = itemEl.querySelector('.carousel-images-json-new');
            let carouselImages = [];
            if (jsonInput && jsonInput.value) {
                try {
                    carouselImages = JSON.parse(jsonInput.value);
                } catch (e) {
                    carouselImages = [];
                }
            }

            // Filtrar placeholders
            const realImages = carouselImages.filter(img => {
                const url = typeof img === 'string' ? img : (img.image_url || img);
                return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
            });

            const firstImage = realImages.length > 0 ? realImages[0] : '';
            // ===== EXATAMENTE IGUAL AO BANNER: apenas width: 100%; height: auto; sem object-fit =====
            previewEl.innerHTML = `
            <img src="${firstImage}" alt="Carrossel Preview" style="width: 100%; height: auto; display: block;" loading="lazy" onerror="this.style.display='none'">
            ${realImages.length > 1 ? `<div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.85rem;"><i class="fas fa-images"></i> ${realImages.length} imagens</div>` : ''}
        `;
        } else if (itemType === 'youtube_embed') {
            // Renderizar iframe do YouTube com URL convertida
            const destInput = itemEl.querySelector('.item-destination-url-input');
            const youtubeUrl = destInput ? destInput.value : '';
            const embedUrl = convertYouTubeUrlToEmbed(youtubeUrl);

            if (embedUrl && embedUrl !== youtubeUrl) {
                // URL vf¡lida convertida para embed
                previewEl = document.createElement('div');
                previewEl.className = 'preview-embed-container';
                previewEl.innerHTML = `
                <iframe 
                    src="${embedUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="width: 100%; aspect-ratio: 16/9; border-radius: 12px;"
                ></iframe>
            `;
            } else {
                // Placeholder se nf£o houver URL vf¡lida
                previewEl = document.createElement('div');
                previewEl.className = 'preview-embed-placeholder';
                const iconClass = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim();
                previewEl.innerHTML = `<i class="${iconClass}"></i><span>${title || 'YouTube Incorporado'}</span>`;
            }
        } else if (itemType === 'instagram_embed' || itemType === 'tiktok_embed' || itemType === 'spotify_embed' || itemType === 'linkedin_embed' || itemType === 'pinterest_embed' || itemType === 'pdf_embed') {
            previewEl = document.createElement('div');
            previewEl.className = 'preview-embed-placeholder';
            const iconClass = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim();
            previewEl.innerHTML = `<i class="${iconClass}"></i><span>${title || 'Conteúdo Incorporado'}</span>`;
        }

        if (previewEl) itemsContainer.appendChild(previewEl);
    });

    if (SELECTORS.buttonOpacityValue) {
        SELECTORS.buttonOpacityValue.textContent = `${Math.round(buttonOpacity * 100)}%`;
    }
    SELECTORS.buttonFontSizeValue.textContent = fontSize;
}

// Função para preservar o estado local dos itens antes de recarregar
function preserveLocalItemStates() {
    const preservedStates = {};
    const itemElements = document.querySelectorAll('#items-container .item, #items-container .module-item');

    itemElements.forEach(itemEl => {
        const itemId = itemEl.dataset.id;
        const itemType = itemEl.dataset.itemType;

        preservedStates[itemId] = {
            itemType: itemType,
            aspectRatio: itemEl.dataset.aspectRatio || null
        };

        // Preservar campos específicos por tipo de item
        switch (itemType) {
            case 'banner':
                const bannerImageInput = itemEl.querySelector('.item-image-url-input');
                const bannerDestInput = itemEl.querySelector('.item-destination-url-input');
                const bannerPreview = itemEl.querySelector('.banner-preview-thumb');
                if (bannerImageInput) preservedStates[itemId].image_url = bannerImageInput.value;
                if (bannerDestInput) preservedStates[itemId].destination_url = bannerDestInput.value;
                if (bannerPreview) preservedStates[itemId].preview_src = bannerPreview.src;
                // Verificar se f© carrossel
                if (itemEl.classList.contains('banner-carousel')) {
                    preservedStates[itemId].isCarousel = true;
                }
                break;
            case 'link':
                // Link personalizado - preservar title, destination_url, image_url e icon_class
                const linkTitleInput = itemEl.querySelector('.item-title-input');
                const linkDestInput = itemEl.querySelector('.item-destination-url-input');
                const linkImageUrlInput = itemEl.querySelector('.item-image-url-input');
                const linkIconPicker = itemEl.querySelector('.item-icon-picker');
                if (linkTitleInput) preservedStates[itemId].title = linkTitleInput.value;
                if (linkDestInput) preservedStates[itemId].destination_url = linkDestInput.value;
                if (linkImageUrlInput) preservedStates[itemId].image_url = linkImageUrlInput.value || null;
                if (linkIconPicker) {
                    const iconElement = linkIconPicker.querySelector('i');
                    preservedStates[itemId].icon_class = iconElement ? iconElement.className.trim() : null;
                }
                // Preservar tamanho da logo
                const linkLogoSizeInput = itemEl.querySelector('.item-logo-size-input');
                if (linkLogoSizeInput) {
                    preservedStates[itemId].logo_size = parseInt(linkLogoSizeInput.value) || 24;
                } else if (itemEl.dataset.logoSize) {
                    preservedStates[itemId].logo_size = parseInt(itemEl.dataset.logoSize);
                }
                break;
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
            case 'spotify':
            case 'instagram_embed':
            case 'youtube_embed':
            case 'tiktok_embed':
            case 'spotify_embed':
            case 'linkedin_embed':
            case 'pinterest_embed':
                const titleInput = itemEl.querySelector('.item-title-input');
                const destInput = itemEl.querySelector('.item-destination-url-input');
                const iconPicker = itemEl.querySelector('.item-icon-picker');
                if (titleInput) preservedStates[itemId].title = titleInput.value;
                if (destInput) preservedStates[itemId].destination_url = destInput.value;
                if (iconPicker) preservedStates[itemId].icon_class = iconPicker.className.replace(' item-icon-picker', '').trim();
                break;
            case 'pix':
            case 'pix_qrcode':
                preservedStates[itemId].title = itemEl.querySelector('.item-title-input')?.value || '';
                preservedStates[itemId].pix_key = itemEl.querySelector('.item-pix-key-input')?.value || '';
                preservedStates[itemId].recipient_name = itemEl.querySelector('.item-recipient-name-input')?.value || '';
                preservedStates[itemId].pix_amount = itemEl.querySelector('.item-pix-amount-input')?.value || '';
                preservedStates[itemId].pix_description = itemEl.querySelector('.item-pix-description-input')?.value || '';
                preservedStates[itemId].icon_class = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim() || '';
                break;
            case 'pdf':
                preservedStates[itemId].title = itemEl.querySelector('.item-title-input')?.value || '';
                preservedStates[itemId].pdf_url = itemEl.querySelector('.item-pdf-url-input')?.value || '';
                break;
            case 'wifi':
                preservedStates[itemId].title = itemEl.querySelector('.item-title-input')?.value || '';
                preservedStates[itemId].wifi_display_format = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                preservedStates[itemId].wifi_ssid = itemEl.querySelector('.wifi-ssid-input')?.value || '';
                preservedStates[itemId].wifi_password = itemEl.querySelector('.wifi-password-input')?.value || '';
                preservedStates[itemId].wifi_security = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
                preservedStates[itemId].wifi_hidden = !!(itemEl.querySelector('.wifi-hidden-input')?.checked);
                preservedStates[itemId].wifi_banner_url = itemEl.querySelector('.wifi-banner-url-input')?.value || '';
                preservedStates[itemId].wifi_logo_url = itemEl.querySelector('.wifi-logo-url-input')?.value || '';
                preservedStates[itemId].wifi_logo_size = itemEl.querySelector('.wifi-logo-size-input')?.value || '';
                preservedStates[itemId].icon_class = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim() || '';
                break;
        }
    });

    return preservedStates;
}

// Função para restaurar o estado local dos itens apf³s recarregar
function restoreLocalItemStates(preservedStates) {
    if (!preservedStates || Object.keys(preservedStates).length === 0) return;

    Object.keys(preservedStates).forEach(itemId => {
        const itemEl = document.querySelector(`.item[data-id='${itemId}']`);
        if (!itemEl) return;

        const state = preservedStates[itemId];
        if (!state) return;

        // Restaurar aspect ratio se existir
        if (state.aspectRatio) {
            itemEl.dataset.aspectRatio = state.aspectRatio;
        }

        // Restaurar campos específicos por tipo
        switch (state.itemType) {
            case 'banner':
                const bannerImageInput = itemEl.querySelector('.item-image-url-input');
                const bannerDestInput = itemEl.querySelector('.item-destination-url-input');
                const bannerPreview = itemEl.querySelector('.banner-preview-thumb');
                if (bannerImageInput && state.image_url) {
                    bannerImageInput.value = state.image_url;
                }
                if (bannerDestInput && state.destination_url !== undefined) {
                    bannerDestInput.value = state.destination_url;
                }
                if (bannerPreview && state.preview_src) {
                    bannerPreview.src = state.preview_src;
                }
                break;
            case 'carousel':
                // ===== NOVO CARROSSEL - Restaurar =====
                const carouselJsonInputRestore = itemEl.querySelector('.carousel-images-json-new');
                const carouselImageInputRestore = itemEl.querySelector('.item-image-url-input');
                if (state.destination_url && carouselJsonInputRestore) {
                    carouselJsonInputRestore.value = state.destination_url;
                    try {
                        const images = JSON.parse(state.destination_url);
                        const itemId = itemEl.dataset.id;
                        if (itemId && images.length > 0) {
                            renderCarouselImagesNew(itemId, images);
                            if (carouselImageInputRestore) {
                                const firstImg = typeof images[0] === 'string' ? images[0] : (images[0].image_url || images[0]);
                                carouselImageInputRestore.value = firstImg;
                            }
                        }
                    } catch (e) {
                        console.error('Erro ao restaurar:', e);
                    }
                }
                break;
            case 'link':
                // Link personalizado - restaurar title, destination_url, image_url e icon_class
                const linkTitleInput = itemEl.querySelector('.item-title-input');
                const linkDestInput = itemEl.querySelector('.item-destination-url-input');
                const linkImageUrlInput = itemEl.querySelector('.item-image-url-input');
                const linkIconPicker = itemEl.querySelector('.item-icon-picker');
                if (linkTitleInput && state.title !== undefined) linkTitleInput.value = state.title;
                if (linkDestInput && state.destination_url !== undefined) linkDestInput.value = state.destination_url;
                if (linkImageUrlInput && state.image_url !== undefined) linkImageUrlInput.value = state.image_url || '';
                if (linkIconPicker && state.icon_class) {
                    const iconElement = linkIconPicker.querySelector('i');
                    if (iconElement) {
                        iconElement.className = state.icon_class;
                    } else {
                        linkIconPicker.innerHTML = `<i class="${state.icon_class}"></i>`;
                    }
                }
                // Atualizar preview do logo se houver image_url
                if (state.image_url && state.image_url.trim() && !state.image_url.includes('placeholder')) {
                    const logoPreview = itemEl.querySelector('.item-logo-preview');
                    if (logoPreview) {
                        logoPreview.src = state.image_url;
                        logoPreview.style.display = 'block';
                    }
                    if (linkIconPicker) linkIconPicker.style.display = 'none';
                } else {
                    const logoPreview = itemEl.querySelector('.item-logo-preview');
                    if (logoPreview) logoPreview.style.display = 'none';
                    if (linkIconPicker) linkIconPicker.style.display = 'inline-block';
                }
                break;
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
            case 'spotify':
            case 'instagram_embed':
            case 'youtube_embed':
            case 'tiktok_embed':
            case 'spotify_embed':
            case 'linkedin_embed':
            case 'pinterest_embed':
                const titleInput = itemEl.querySelector('.item-title-input');
                const destInput = itemEl.querySelector('.item-destination-url-input');
                const iconPicker = itemEl.querySelector('.item-icon-picker');
                if (titleInput && state.title !== undefined) titleInput.value = state.title;
                if (destInput && state.destination_url !== undefined) destInput.value = state.destination_url;
                if (iconPicker && state.icon_class) iconPicker.className = `${state.icon_class} item-icon-picker`;
                break;
            case 'pix':
            case 'pix_qrcode':
                if (itemEl.querySelector('.item-title-input') && state.title !== undefined)
                    itemEl.querySelector('.item-title-input').value = state.title;
                if (itemEl.querySelector('.item-pix-key-input') && state.pix_key !== undefined)
                    itemEl.querySelector('.item-pix-key-input').value = state.pix_key;
                if (itemEl.querySelector('.item-recipient-name-input') && state.recipient_name !== undefined)
                    itemEl.querySelector('.item-recipient-name-input').value = state.recipient_name;
                if (itemEl.querySelector('.item-pix-amount-input') && state.pix_amount !== undefined)
                    itemEl.querySelector('.item-pix-amount-input').value = state.pix_amount;
                if (itemEl.querySelector('.item-pix-description-input') && state.pix_description !== undefined)
                    itemEl.querySelector('.item-pix-description-input').value = state.pix_description;
                if (itemEl.querySelector('.item-icon-picker') && state.icon_class)
                    itemEl.querySelector('.item-icon-picker').className = `${state.icon_class} item-icon-picker`;
                break;
            case 'pdf':
                if (itemEl.querySelector('.item-title-input') && state.title !== undefined)
                    itemEl.querySelector('.item-title-input').value = state.title;
                if (itemEl.querySelector('.item-pdf-url-input') && state.pdf_url !== undefined)
                    itemEl.querySelector('.item-pdf-url-input').value = state.pdf_url;
                break;
            case 'wifi':
                if (itemEl.querySelector('.item-title-input') && state.title !== undefined)
                    itemEl.querySelector('.item-title-input').value = state.title;
                if (state.wifi_display_format) {
                    const df = itemEl.querySelectorAll('.wifi-display-format-input');
                    df.forEach(r => { r.checked = r.value === state.wifi_display_format; });
                    const logoSec = itemEl.querySelector('.wifi-logo-section');
                    const banSec = itemEl.querySelector('.wifi-banner-section');
                    const isBan = state.wifi_display_format === 'banner';
                    if (logoSec) logoSec.style.display = isBan ? 'none' : 'block';
                    if (banSec) banSec.style.display = isBan ? 'block' : 'none';
                }
                if (itemEl.querySelector('.wifi-ssid-input') && state.wifi_ssid !== undefined)
                    itemEl.querySelector('.wifi-ssid-input').value = state.wifi_ssid;
                if (itemEl.querySelector('.wifi-password-input') && state.wifi_password !== undefined)
                    itemEl.querySelector('.wifi-password-input').value = state.wifi_password;
                if (itemEl.querySelector('.wifi-security-input') && state.wifi_security !== undefined)
                    itemEl.querySelector('.wifi-security-input').value = state.wifi_security;
                if (itemEl.querySelector('.wifi-hidden-input') && state.wifi_hidden !== undefined)
                    itemEl.querySelector('.wifi-hidden-input').checked = !!state.wifi_hidden;
                if (itemEl.querySelector('.wifi-banner-url-input') && state.wifi_banner_url !== undefined)
                    itemEl.querySelector('.wifi-banner-url-input').value = state.wifi_banner_url;
                if (itemEl.querySelector('.wifi-logo-url-input') && state.wifi_logo_url !== undefined)
                    itemEl.querySelector('.wifi-logo-url-input').value = state.wifi_logo_url;
                if (itemEl.querySelector('.wifi-logo-size-input') && state.wifi_logo_size !== undefined)
                    itemEl.querySelector('.wifi-logo-size-input').value = state.wifi_logo_size;
                if (itemEl.querySelector('.item-icon-picker') && state.icon_class) {
                    const ic = itemEl.querySelector('.item-icon-picker');
                    ic.className = `${state.icon_class} item-icon-picker`;
                }
                break;
        }
    });
}

function getModuleListItemsFromProfile(profileData) {
    return (profileData?.items || []).filter(function (it) {
        return it.item_type !== 'king_selection' && it.item_type !== 'bible';
    });
}

function normalizeProfileItemType(item) {
    if (!item) return item;
    let t = String(item.item_type || 'link').trim().toLowerCase();
    if (t === 'wi-fi' || t === 'wi_fi' || t === 'wifi_qrcode') t = 'wifi';
    item.item_type = t;
    return item;
}

function appendMinimalModuleListItem(item) {
    const REMOVED_UI_MODULES = { agenda: 1, contract: 1, photographer_site: 1, kingbrief: 1, king_bolao: 1 };
    if (item && REMOVED_UI_MODULES[item.item_type]) return false;
    const container = SELECTORS.itemsContainer || document.getElementById('items-container');
    if (!container || !item || item.id == null) return false;
    const idStr = String(item.id);
    if (container.querySelector('[data-id="' + idStr + '"]')) return false;
    const itemEl = document.createElement('div');
    itemEl.className = 'module-item module-item-fallback';
    itemEl.dataset.id = idStr;
    itemEl.dataset.itemType = item.item_type || 'link';
    const isActive = item.is_active !== false;
    const title = moduleListDisplayTitle(item);
    itemEl.innerHTML = `
            <div class="module-name module-name-row">${title}</div>
            <div class="module-content-wrapper">
                <div class="module-drag-controls">
                    <button class="module-move-btn move-up" title="Mover para cima" data-item-id="${idStr}" data-direction="up"><i class="fas fa-chevron-up"></i></button>
                    <div class="module-drag-handle" title="Arrastar"><i class="fas fa-grip-vertical"></i></div>
                    <button class="module-move-btn move-down" title="Mover para baixo" data-item-id="${idStr}" data-direction="down"><i class="fas fa-chevron-down"></i></button>
                </div>
                <div class="module-icon"><i class="${getDefaultIcon(item.item_type)}"></i></div>
                <div class="module-actions-inline">
                    <label class="module-toggle" title="Desativar">
                        <input type="checkbox" class="module-toggle-input" ${isActive ? 'checked' : ''} data-item-id="${idStr}">
                        <span class="module-toggle-slider"></span>
                    </label>
                    <button class="module-action-btn edit edit-item-btn" title="Editar Módulo" data-item-id="${idStr}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="module-action-btn duplicate duplicate-item-btn" title="Duplicar" data-item-id="${idStr}"><i class="fas fa-copy"></i></button>
                    <button class="module-action-btn delete delete-item-btn" title="Excluir" data-item-id="${idStr}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="item-content" style="display: none;"><p style="padding:0.75rem;color:#f39c12;font-size:0.85rem;">Carregado em modo simplificado. Use o lápis para editar.</p></div>`;
    container.appendChild(itemEl);
    console.log(`Módulo ${idStr} (${item.item_type}) adicionado em modo simplificado`);
    return true;
}

function reconcileModulesListWithProfileData(profileData) {
    const container = SELECTORS.itemsContainer || document.getElementById('items-container');
    if (!container || !profileData?.items) return false;
    const expected = getModuleListItemsFromProfile(profileData).map(function (it) {
        return normalizeProfileItemType(Object.assign({}, it));
    });
    const missing = expected.filter(function (it) {
        return !container.querySelector('[data-id="' + it.id + '"]');
    });
    if (!missing.length) return false;
    console.warn('Módulos em falta na lista:', missing.map(function (m) {
        return (m.item_type || '?') + '#' + m.id;
    }).join(', '));
    missing.forEach(function (it) { appendMinimalModuleListItem(it); });
    const stillMissing = expected.filter(function (it) {
        return !container.querySelector('[data-id="' + it.id + '"]');
    });
    if (stillMissing.length) {
        console.warn('Re-render completo - ainda faltam:', stillMissing.map(function (m) {
            return (m.item_type || '?') + '#' + m.id;
        }).join(', '));
        if (global.DashboardEditor && typeof global.DashboardEditor.renderEditor === 'function') {
            global.DashboardEditor.renderEditor(profileData);
        } else if (typeof global.renderEditor === 'function') {
            global.renderEditor(profileData);
        } else {
            console.warn('[DashboardCartao] renderEditor indisponível para re-render completo');
        }
    }
    if (typeof updateLivePreviewFromForm === 'function') updateLivePreviewFromForm();
    return true;
}


    var DashboardCartao = {
        updateLivePreviewFromForm: updateLivePreviewFromForm,
        updateVcardPreviewButton: updateVcardPreviewButton,
        preserveLocalItemStates: preserveLocalItemStates,
        restoreLocalItemStates: restoreLocalItemStates,
        appendMinimalModuleListItem: appendMinimalModuleListItem,
        reconcileModulesListWithProfileData: reconcileModulesListWithProfileData,
        normalizeProfileItemType: normalizeProfileItemType,
        getModuleListItemsFromProfile: getModuleListItemsFromProfile,
        hexToRgba: hexToRgba,
        convertYouTubeUrlToEmbed: convertYouTubeUrlToEmbed
    };

    global.DashboardCartao = DashboardCartao;
    global.updateLivePreviewFromForm = updateLivePreviewFromForm;
    global.reconcileModulesListWithProfileData = reconcileModulesListWithProfileData;
})(typeof window !== 'undefined' ? window : this);
