/**
 * Extrai setupEventListeners → public/js/dashboard-listeners.js
 * Uso: node scripts/extract-dashboard-listeners.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const OUT = path.join(ROOT, 'public', 'js', 'dashboard-listeners.js');

function dedent(arr) {
    return arr.map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n');
}
function findFn(lines, name) {
    return lines.findIndex((l) => new RegExp('(async\\s+)?function\\s+' + name + '\\b').test(l));
}

function main() {
    const lines = fs.readFileSync(DASH, 'utf8').split(/\n/);
    const start = findFn(lines, 'setupEventListeners');
    const carousel = findFn(lines, 'renderCarouselImagesNew');
    if (start < 0 || carousel < 0) throw new Error('markers missing');

    // end = line before renderCarouselImagesNew comment block
    let end = carousel;
    while (end > start && (lines[end - 1].trim() === '' || lines[end - 1].trim().startsWith('//') || lines[end - 1].includes('===='))) {
        end--;
    }
    // include closing brace of setupEventListeners — find last } before carousel section
    // Actually setup ends with `    }` then blank then comments then renderCarouselImagesNew
    // findFn(renderCarousel) is the function line; the `    }` of setup is just before comments
    const setupClose = lines.lastIndexOf('    }', carousel);
    // lastIndexOf from 0 - need last `    }` before carousel that closes setup
    let closeIdx = -1;
    for (let i = carousel - 1; i > start; i--) {
        if (lines[i] === '    }') {
            closeIdx = i;
            break;
        }
    }
    if (closeIdx < 0) throw new Error('setup close brace not found');
    end = closeIdx + 1; // exclusive end for slice

    console.log('Extract', start + 1, '-', end, '(' + (end - start) + ')');

    let body = dedent(lines.slice(start, end));

    const callRewrites = [
        'saveAllChanges',
        'openCropper',
        'closeCropper',
        'openEditModal',
        'openEditModalForNewItem',
        'renderEditor',
        'updateLivePreviewFromForm',
        'generateQRCode',
        'getShareQrMeta',
        'composeShareQrArt',
        'deleteItem',
        'duplicateItem',
        'fetchProfileData',
        'initSortable',
        'setupMoveButtons',
        'handleImageUpload',
        'handleDashboardPhotoUpload',
        'handleDashboardAvatarUpload',
        'handleBackgroundUpload',
        'handleShareImageUpload',
        'handleVitrineHeroUpload',
        'renderCarouselImagesNew',
        'removeCarouselImageNew',
        'loadProductsForCatalog',
        'openProductEditModal',
        'safeFetch',
        'getAuthHeaders',
        'getDefaultIcon',
        'moduleListDisplayTitle',
        'bannerUrlModelsHtml',
        'parseBannerDestination',
        'serializeBannerDestination',
        'wifiBannerUploadBlockHtml',
        'setAvatarSrc',
        'updateAvatarFormatSelector',
        'applyAvatarFormatToPreview',
        'loadSubscriptionInfo',
        'main'
    ];

    body = body
        .replace(/window\.API_URL/g, '__WAPI__')
        .replace(/\bAPI_URL\b/g, 'env.API_URL')
        .replace(/__WAPI__/g, 'window.API_URL')
        .replace(/\bHEADERS_AUTH\b/g, 'env.HEADERS_AUTH')
        .replace(/\bHEADERS\b/g, 'env.HEADERS');

    for (const name of callRewrites) {
        body = body.replace(new RegExp('\\b' + name + '\\s*\\(', 'g'), 'env.' + name + '(');
    }

    // Don't rewrite nested local function definitions that got env. prefix wrongly
    // e.g. "async function env.loadEmpresaClients" — fix
    body = body.replace(/function env\./g, 'function ');
    body = body.replace(/async function env\./g, 'async function ');

    // window.setupPhotoUpload assignments stay; env.setupPhotoUpload( calls for invoking
    // local nested functions like loadEmpresaClients should NOT be env. - they are local
    // Only rewrite known globals. Nested locals that share names? Unlikely.

    // Fix: env.main( might be wrong if main is called - OK via Core/window

    const file = `/**
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
        safeFetch: function () {
            var c = core();
            return pick(c.safeFetch, global.safeFetch ? function(u,o){return fetch(u,o);} : null).apply(null, [{0: arguments[0], 1: arguments[1]}].length ? arguments : arguments);
        },
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
        bannerUrlModelsHtml: function () { return pick(core().bannerUrlModelsHtml).apply(null, arguments); },
        parseBannerDestination: function () { return pick(core().parseBannerDestination).apply(null, arguments); },
        serializeBannerDestination: function () { return pick(core().serializeBannerDestination).apply(null, arguments); },
        wifiBannerUploadBlockHtml: function () { return pick(core().wifiBannerUploadBlockHtml).apply(null, arguments); },
        setAvatarSrc: function () { return pick(core().setAvatarSrc).apply(null, arguments); },
        updateAvatarFormatSelector: function () { return pick(core().updateAvatarFormatSelector).apply(null, arguments); },
        applyAvatarFormatToPreview: function () { return pick(core().applyAvatarFormatToPreview).apply(null, arguments); },
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

${body}

    var DashboardListeners = {
        setupEventListeners: setupEventListeners
    };
    global.DashboardListeners = DashboardListeners;
    global.setupEventListeners = setupEventListeners;
})(typeof window !== 'undefined' ? window : this);
`;

    // Clean broken pick().apply for safeFetch - already fixed by override
    // Fix empty pick() for optional banner helpers that return ''
    file; // silence

    // Improve pick for missing optional return values
    let finalFile = file.replace(
        'bannerUrlModelsHtml: function () { return pick(core().bannerUrlModelsHtml).apply(null, arguments); },',
        `bannerUrlModelsHtml: function () {
            var c = core();
            if (typeof c.bannerUrlModelsHtml === 'function') return c.bannerUrlModelsHtml();
            return '';
        },`
    );
    finalFile = finalFile.replace(
        'parseBannerDestination: function () { return pick(core().parseBannerDestination).apply(null, arguments); },',
        `parseBannerDestination: function () {
            var c = core();
            if (typeof c.parseBannerDestination === 'function') return c.parseBannerDestination.apply(c, arguments);
            return { primary_url: String(arguments[0] || '').trim(), instagram_url: '', whatsapp_url: '' };
        },`
    );
    finalFile = finalFile.replace(
        'serializeBannerDestination: function () { return pick(core().serializeBannerDestination).apply(null, arguments); },',
        `serializeBannerDestination: function () {
            var c = core();
            if (typeof c.serializeBannerDestination === 'function') return c.serializeBannerDestination.apply(c, arguments);
            return String(arguments[0] || '').trim();
        },`
    );
    finalFile = finalFile.replace(
        'wifiBannerUploadBlockHtml: function () { return pick(core().wifiBannerUploadBlockHtml).apply(null, arguments); },',
        `wifiBannerUploadBlockHtml: function () {
            var c = core();
            if (typeof c.wifiBannerUploadBlockHtml === 'function') return c.wifiBannerUploadBlockHtml.apply(c, arguments);
            return '';
        },`
    );
    finalFile = finalFile.replace(
        'setAvatarSrc: function () { return pick(core().setAvatarSrc).apply(null, arguments); },',
        `setAvatarSrc: function (el, src) {
            var c = core();
            if (typeof c.setAvatarSrc === 'function') return c.setAvatarSrc(el, src);
            if (el) el.src = src || '';
        },`
    );
    finalFile = finalFile.replace(
        'updateAvatarFormatSelector: function () { return pick(core().updateAvatarFormatSelector).apply(null, arguments); },',
        `updateAvatarFormatSelector: function () {
            var c = core();
            if (typeof c.updateAvatarFormatSelector === 'function') return c.updateAvatarFormatSelector.apply(c, arguments);
        },`
    );
    finalFile = finalFile.replace(
        'applyAvatarFormatToPreview: function () { return pick(core().applyAvatarFormatToPreview).apply(null, arguments); },',
        `applyAvatarFormatToPreview: function () {
            var c = core();
            if (typeof c.applyAvatarFormatToPreview === 'function') return c.applyAvatarFormatToPreview.apply(c, arguments);
        },`
    );

    // Remove broken safeFetch initial definition with pick nonsense - keep override only
    finalFile = finalFile.replace(
        /safeFetch: function \(\) \{\s*var c = core\(\);\s*return pick\(c\.safeFetch[\s\S]*?\},/,
        'safeFetch: null, // set below'
    );

    fs.writeFileSync(OUT, finalFile, 'utf8');
    console.log('Wrote', OUT);

    const stub = `
    // Listeners: js/dashboard-listeners.js
    function setupEventListeners() {
        if (window.DashboardListeners && typeof window.DashboardListeners.setupEventListeners === 'function') {
            return window.DashboardListeners.setupEventListeners();
        }
    }
    window.setupEventListeners = setupEventListeners;

`;

    const before = lines.slice(0, start);
    const after = lines.slice(end);
    let patched = before.join('\n') + '\n' + stub + after.join('\n');

    // Bridge deleteItem, duplicateItem, carousel, products, main onto Core
    const bridges = [
        ['duplicateItem', /async function duplicateItem\(/],
        ['deleteItem', /async function deleteItem\(/],
        ['renderCarouselImagesNew', /function renderCarouselImagesNew\(/],
        ['removeCarouselImageNew', /function removeCarouselImageNew\(/],
        ['loadProductsForCatalog', /async function loadProductsForCatalog\(/],
        ['openProductEditModal', /async function openProductEditModal\(/]
    ];
    for (const [name, re] of bridges) {
        if (!patched.includes('DashboardCore.' + name)) {
            patched = patched.replace(
                re,
                `if (window.DashboardCore) window.DashboardCore.${name} = function () { return ${name}.apply(null, arguments); };\n    ` +
                    (String(re).includes('async') ? 'async function ' : 'function ') +
                    name +
                    '('
            );
            // The replace above might break "async function" - fix carefully
        }
    }

    // Fix botched bridges - do cleaner
    patched = before.join('\n') + '\n' + stub + after.join('\n');

    function addBridge(src, fnName, isAsync) {
        if (src.includes('DashboardCore.' + fnName + ' =')) return src;
        const sig = (isAsync ? 'async function ' : 'function ') + fnName + '(';
        const idx = src.indexOf(sig);
        if (idx < 0) {
            console.warn('bridge skip', fnName);
            return src;
        }
        // find line start
        const lineStart = src.lastIndexOf('\n', idx) + 1;
        const inject =
            '    if (window.DashboardCore) window.DashboardCore.' +
            fnName +
            ' = function () { return ' +
            fnName +
            '.apply(null, arguments); };\n';
        return src.slice(0, lineStart) + inject + src.slice(lineStart);
    }

    patched = addBridge(patched, 'duplicateItem', true);
    patched = addBridge(patched, 'deleteItem', true);
    patched = addBridge(patched, 'renderCarouselImagesNew', false);
    patched = addBridge(patched, 'removeCarouselImageNew', false);
    patched = addBridge(patched, 'loadProductsForCatalog', true);
    patched = addBridge(patched, 'openProductEditModal', true);

    // main bridge
    if (!patched.includes('DashboardCore.main') && !patched.includes('__dashboardMain')) {
        patched = patched.replace(
            /async function main\(\) \{/,
            `async function main() {
        window.__dashboardMain = main;
        if (window.DashboardCore) window.DashboardCore.main = main;`
        );
        // That puts assignment inside main on every call - better once after def
        patched = patched.replace(
            /async function main\(\) \{\n        window\.__dashboardMain = main;\n        if \(window\.DashboardCore\) window\.DashboardCore\.main = main;/,
            'async function main() {'
        );
        patched = patched.replace(
            /(\n    async function main\(\) \{)/,
            `\n    window.__dashboardMain = null;\n$1`
        );
        // assign after function via: find `    main();` near end of main's caller
        patched = patched.replace(
            /\n    main\(\);\n/,
            `\n    window.__dashboardMain = main;\n    if (window.DashboardCore) window.DashboardCore.main = main;\n    main();\n`
        );
    }

    fs.writeFileSync(DASH, patched, 'utf8');
    console.log('Updated', DASH);

    execSync(`node --check "${OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${DASH}"`, { stdio: 'inherit' });
    console.log('OK syntax');
}

main();
