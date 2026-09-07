/**
 * Extrai edit-modal + upload/cropper do dashboard.js
 * Uso: node scripts/extract-dashboard-edit-upload.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const EDIT_OUT = path.join(ROOT, 'public', 'js', 'dashboard-edit-modal.js');
const UP_OUT = path.join(ROOT, 'public', 'js', 'dashboard-upload.js');

function dedent(arr) {
    return arr.map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n');
}

function findFn(lines, name) {
    return lines.findIndex((l) => new RegExp('(async\\s+)?function\\s+' + name + '\\b').test(l));
}

function coreEnvPreamble() {
    return `    function core() { return global.DashboardCore || {}; }
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
`;
}

function rewrite(body) {
    return body
        .replace(/window\.API_URL/g, '__WAPI__')
        .replace(/\bAPI_URL\b/g, 'env.API_URL')
        .replace(/__WAPI__/g, 'window.API_URL')
        .replace(/\bHEADERS_AUTH\b/g, 'env.HEADERS_AUTH')
        .replace(/\bHEADERS\b/g, 'env.HEADERS')
        .replace(/\bgetAuthHeaders\s*\(/g, 'env.getAuthHeaders(')
        .replace(/\bsafeFetch\s*\(/g, 'env.safeFetch(')
        .replace(/\bsetAvatarSrc\s*\(/g, 'env.setAvatarSrc(')
        .replace(/\bparseBannerDestination\s*\(/g, 'env.parseBannerDestination(')
        .replace(/\bserializeBannerDestination\s*\(/g, 'env.serializeBannerDestination(')
        .replace(/\bbannerUrlModelsHtml\s*\(/g, 'env.bannerUrlModelsHtml(')
        .replace(/\bbannerDestDisplayLabel\s*\(/g, 'env.bannerDestDisplayLabel(')
        .replace(/\bwifiBannerUploadBlockHtml\s*\(/g, 'env.wifiBannerUploadBlockHtml(')
        .replace(/\bgetDefaultIcon\s*\(/g, 'env.getDefaultIcon(')
        .replace(/\bmoduleListDisplayTitle\s*\(/g, 'env.moduleListDisplayTitle(')
        .replace(/\bupdateLivePreviewFromForm\s*\(/g, 'env.updateLivePreviewFromForm(')
        .replace(/\brenderEditor\s*\(/g, 'env.renderEditor(')
        .replace(/\bhandleBackgroundUpload\s*\(/g, 'env.handleBackgroundUpload(')
        .replace(/\bhandleShareImageUpload\s*\(/g, 'env.handleShareImageUpload(')
        .replace(/\bhandleVitrineHeroUpload\s*\(/g, 'env.handleVitrineHeroUpload(');
}

function main() {
    let lines = fs.readFileSync(DASH, 'utf8').split(/\n/);

    const photoStart = findFn(lines, 'handleDashboardPhotoUpload');
    const avatarStart = findFn(lines, 'handleDashboardAvatarUpload');
    const formatStart = findFn(lines, 'updateAvatarFormatSelector');
    const imgStart = findFn(lines, 'handleImageUpload');
    const dupStart = findFn(lines, 'duplicateItem');
    const editStart = findFn(lines, 'openEditModal');
    const qrStart = findFn(lines, 'getShareQrMeta');
    const cropStart = findFn(lines, 'openCropper');
    const iconStart = findFn(lines, 'getDefaultIcon');
    const newItemStart = findFn(lines, 'openEditModalForNewItem');
    const setupStart = findFn(lines, 'setupEventListeners');

    if ([photoStart, imgStart, editStart, cropStart, newItemStart].some((x) => x < 0)) {
        throw new Error('Marcos em falta');
    }

    console.log({
        photo: [photoStart + 1, formatStart],
        image: [imgStart + 1, dupStart],
        edit: [editStart + 1, qrStart],
        crop: [cropStart + 1, iconStart],
        newItem: [newItemStart + 1, setupStart]
    });

    // --- UPLOAD body: photo+avatar + handleImageUpload + cropper ---
    const uploadParts = [
        ...lines.slice(photoStart, formatStart),
        ...lines.slice(imgStart, dupStart),
        ...lines.slice(cropStart, iconStart)
    ];
    let uploadBody = rewrite(dedent(uploadParts));
    // Remove window.openCropper mid-body; re-export later
    uploadBody = uploadBody.replace(/\nwindow\.openCropper = openCropper;?\n?/g, '\n');

    // Don't rewrite self-calls of handlers to env
    uploadBody = uploadBody
        .replace(/env\.handleDashboardPhotoUpload\(/g, 'handleDashboardPhotoUpload(')
        .replace(/env\.handleDashboardAvatarUpload\(/g, 'handleDashboardAvatarUpload(')
        .replace(/env\.handleImageUpload\(/g, 'handleImageUpload(')
        .replace(/env\.openCropper\(/g, 'openCropper(')
        .replace(/env\.closeCropper\(/g, 'closeCropper(');

    const uploadFile = `/**
 * Dashboard Upload / Cropper — módulo isolado (Conecta King).
 * Gerado por scripts/extract-dashboard-edit-upload.js
 */
(function (global) {
    'use strict';

${coreEnvPreamble()}

    var cropper = null;
    var imageToUpload = { blob: null, trigger: null, element: null, originalFile: null };

${uploadBody}

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
`;

    fs.writeFileSync(UP_OUT, uploadFile, 'utf8');
    console.log('Wrote', UP_OUT);

    // --- EDIT MODAL: openEditModal + openEditModalForNewItem ---
    const editParts = [
        ...lines.slice(editStart, qrStart),
        ...lines.slice(newItemStart, setupStart)
    ];
    let editBody = rewrite(dedent(editParts));
    editBody = editBody
        .replace(/env\.openEditModal\(/g, 'openEditModal(')
        .replace(/env\.openEditModalForNewItem\(/g, 'openEditModalForNewItem(')
        .replace(/env\.openCropper\(/g, '(global.openCropper || (global.DashboardUpload && global.DashboardUpload.openCropper))(')
        .replace(/env\.handleImageUpload\(/g, '(global.handleImageUpload || (global.DashboardUpload && global.DashboardUpload.handleImageUpload))(');

    // Fix broken double-call patterns if any — openCropper rewrite might be ugly
    // Prefer simple global.openCropper after modules load
    editBody = editBody
        .replace(/\(global\.openCropper \|\| \(global\.DashboardUpload && global\.DashboardUpload\.openCropper\)\)\(/g, 'callOpenCropper(')
        .replace(/\(global\.handleImageUpload \|\| \(global\.DashboardUpload && global\.DashboardUpload\.handleImageUpload\)\)\(/g, 'callHandleImageUpload(');

    const editFile = `/**
 * Dashboard Edit Modal — openEditModal isolado (Conecta King).
 * Gerado por scripts/extract-dashboard-edit-upload.js
 */
(function (global) {
    'use strict';

${coreEnvPreamble()}

    function callOpenCropper() {
        var fn = global.openCropper || (global.DashboardUpload && global.DashboardUpload.openCropper);
        if (typeof fn === 'function') return fn.apply(null, arguments);
    }
    function callHandleImageUpload() {
        var fn = global.handleImageUpload || (global.DashboardUpload && global.DashboardUpload.handleImageUpload);
        if (typeof fn === 'function') return fn.apply(null, arguments);
    }

${editBody}

    var DashboardEditModal = {
        openEditModal: openEditModal,
        openEditModalForNewItem: openEditModalForNewItem
    };
    global.DashboardEditModal = DashboardEditModal;
    global.openEditModal = openEditModal;
    global.openEditModalForNewItem = openEditModalForNewItem;
})(typeof window !== 'undefined' ? window : this);
`;

    fs.writeFileSync(EDIT_OUT, editFile, 'utf8');
    console.log('Wrote', EDIT_OUT);

    // --- Rebuild dashboard.js ---
    // Remove blocks from bottom to top to keep indices valid... rebuild by filtering ranges
    const removeRanges = [
        [photoStart, formatStart],
        [imgStart, dupStart],
        [editStart, qrStart],
        [cropStart, iconStart],
        [newItemStart, setupStart]
    ].sort((a, b) => a[0] - b[0]);

    const keep = [];
    let cursor = 0;
    for (const [a, b] of removeRanges) {
        keep.push(...lines.slice(cursor, a));
        cursor = b;
    }
    keep.push(...lines.slice(cursor));

    let patched = keep.join('\n');

    // Remove local cropper/imageToUpload state (moved to upload module)
    patched = patched.replace(
        /\n    let cropper = null;\n    let imageToUpload = \{\n        blob: null,\n        trigger: null,\n        element: null,\n        originalFile: null  \/\/ Armazenar arquivo original para preservar tipo\n    \};\n/,
        `\n    // cropper / imageToUpload → js/dashboard-upload.js (DashboardUpload)\n`
    );

    // Insert stubs near where photo upload was (after renderEditor stubs / before duplicateItem area)
    // Find a good anchor: after applyAvatarFormat / before duplicateItem
    const stubUpload = `
    // Upload/Cropper: js/dashboard-upload.js
    async function handleDashboardPhotoUpload(imageFile) {
        if (window.DashboardUpload && window.DashboardUpload.handleDashboardPhotoUpload) {
            return window.DashboardUpload.handleDashboardPhotoUpload(imageFile);
        }
    }
    async function handleDashboardAvatarUpload(imageFile) {
        if (window.DashboardUpload && window.DashboardUpload.handleDashboardAvatarUpload) {
            return window.DashboardUpload.handleDashboardAvatarUpload(imageFile);
        }
    }
    async function handleImageUpload(imageFile, itemElement) {
        if (window.DashboardUpload && window.DashboardUpload.handleImageUpload) {
            return window.DashboardUpload.handleImageUpload(imageFile, itemElement);
        }
    }
    function openCropper(file, triggerType, itemElement, customRatio) {
        if (window.DashboardUpload && window.DashboardUpload.openCropper) {
            return window.DashboardUpload.openCropper(file, triggerType, itemElement, customRatio);
        }
    }
    function closeCropper() {
        if (window.DashboardUpload && window.DashboardUpload.closeCropper) {
            return window.DashboardUpload.closeCropper();
        }
    }
    window.openCropper = openCropper;
    window.closeCropper = closeCropper;

`;

    const stubEdit = `
    // Edit modal: js/dashboard-edit-modal.js
    async function openEditModal(itemEl) {
        if (window.DashboardEditModal && window.DashboardEditModal.openEditModal) {
            return window.DashboardEditModal.openEditModal(itemEl);
        }
    }
    function openEditModalForNewItem(tempItem) {
        if (window.DashboardEditModal && window.DashboardEditModal.openEditModalForNewItem) {
            return window.DashboardEditModal.openEditModalForNewItem(tempItem);
        }
    }
    window.openEditModal = openEditModal;
    window.openEditModalForNewItem = openEditModalForNewItem;

`;

    // Insert stubs before duplicateItem
    if (patched.includes('async function duplicateItem')) {
        patched = patched.replace(
            /async function duplicateItem/,
            stubUpload + stubEdit + '    async function duplicateItem'
        );
    } else {
        throw new Error('duplicateItem anchor missing');
    }

    // Bridge wifiBannerUploadBlockHtml + background/share/vitrine uploads
    if (!patched.includes('DashboardCore.wifiBannerUploadBlockHtml')) {
        patched = patched.replace(
            /function wifiBannerUploadBlockHtml\(/,
            `if (window.DashboardCore) window.DashboardCore.wifiBannerUploadBlockHtml = function () { return wifiBannerUploadBlockHtml.apply(null, arguments); };\n    function wifiBannerUploadBlockHtml(`
        );
    }
    for (const fn of ['handleBackgroundUpload', 'handleShareImageUpload', 'handleVitrineHeroUpload']) {
        const key = 'DashboardCore.' + fn;
        if (!patched.includes(key)) {
            const re = new RegExp('async function ' + fn + '\\(');
            if (re.test(patched)) {
                patched = patched.replace(
                    re,
                    `if (window.DashboardCore) window.DashboardCore.${fn} = function () { return ${fn}.apply(null, arguments); };\n    async function ${fn}(`
                );
            }
        }
    }

    // Neutralize duplicate crop listeners in setupEventListeners
    patched = patched.replace(
        /document\.getElementById\('cancel-crop-btn'\)\.addEventListener\('click', closeCropper\);/,
        `// crop buttons: DashboardUpload.init()\n        if (window.DashboardUpload && window.DashboardUpload.init) window.DashboardUpload.init();`
    );

    // Remove the big crop-and-upload listener block — replace with comment
    const cropBtnStart = patched.indexOf("document.getElementById('crop-and-upload-btn').addEventListener");
    if (cropBtnStart >= 0) {
        // find matching closing }); for this listener — heuristic: next "renderIcons();"
        const renderIconsAt = patched.indexOf('renderIcons();', cropBtnStart);
        if (renderIconsAt > cropBtnStart) {
            patched =
                patched.slice(0, cropBtnStart) +
                '// crop-and-upload-btn: DashboardUpload.confirmCropAndUpload\n        ' +
                patched.slice(renderIconsAt);
        }
    }

    fs.writeFileSync(DASH, patched, 'utf8');
    console.log('Updated', DASH);

    execSync(`node --check "${UP_OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${EDIT_OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${DASH}"`, { stdio: 'inherit' });
    console.log('OK syntax');
}

main();
