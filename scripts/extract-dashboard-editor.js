/**
 * Extrai renderEditor → public/js/dashboard-editor.js
 * Uso: node scripts/extract-dashboard-editor.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const OUT = path.join(ROOT, 'public', 'js', 'dashboard-editor.js');
const CARTAO = path.join(ROOT, 'public', 'js', 'dashboard-cartao.js');

function main() {
    const lines = fs.readFileSync(DASH, 'utf8').split(/\n/);
    const start = lines.findIndex((l) => /function\s+renderEditor\b/.test(l));
    const exportLine = lines.findIndex((l, i) => i > start && /^\s*window\.renderEditor = renderEditor;/.test(l));
    if (start < 0) throw new Error('renderEditor não encontrado');
    if (exportLine < 0) throw new Error('window.renderEditor = não encontrado');

    console.log('Extract', start + 1, '-', exportLine, '(' + (exportLine - start) + ' lines)');

    let body = lines
        .slice(start, exportLine)
        .map((l) => (l.startsWith('    ') ? l.slice(4) : l))
        .join('\n');

    // Rewrite external helpers to env.*
    const rewrites = [
        ['setAvatarSrc', 'env.setAvatarSrc'],
        ['applyAvatarFormatToPreview', 'env.applyAvatarFormatToPreview'],
        ['parseBannerDestination', 'env.parseBannerDestination'],
        ['serializeBannerDestination', 'env.serializeBannerDestination'],
        ['bannerDestDisplayLabel', 'env.bannerDestDisplayLabel'],
        ['bannerUrlModelsHtml', 'env.bannerUrlModelsHtml'],
        ['getDefaultIcon', 'env.getDefaultIcon'],
        ['moduleListDisplayTitle', 'env.moduleListDisplayTitle'],
        ['initSortable', 'env.initSortable'],
        ['setupMoveButtons', 'env.setupMoveButtons'],
        ['updateAvatarFormatSelector', 'env.updateAvatarFormatSelector'],
        ['preserveLocalItemStates', 'env.preserveLocalItemStates'],
        ['restoreLocalItemStates', 'env.restoreLocalItemStates'],
        ['appendMinimalModuleListItem', 'env.appendMinimalModuleListItem'],
        ['normalizeProfileItemType', 'env.normalizeProfileItemType'],
        ['updateLivePreviewFromForm', 'env.updateLivePreviewFromForm'],
        ['DEFAULT_AVATAR_PLACEHOLDER', 'env.DEFAULT_AVATAR_PLACEHOLDER']
    ];

    for (const [from, to] of rewrites) {
        if (from === 'DEFAULT_AVATAR_PLACEHOLDER') {
            body = body.replace(/\bDEFAULT_AVATAR_PLACEHOLDER\b/g, to);
        } else {
            body = body.replace(new RegExp('\\b' + from + '\\s*\\(', 'g'), to + '(');
        }
    }

    const wrapped = `/**
 * Dashboard Editor — renderEditor isolado (Conecta King).
 * Lista de módulos, formulário do cartão, ordenação.
 * Depende de window.DashboardCore + window.DashboardCartao.
 * Gerado por scripts/extract-dashboard-editor.js
 */
(function (global) {
    'use strict';

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

${body}

    var DashboardEditor = {
        renderEditor: renderEditor
    };
    global.DashboardEditor = DashboardEditor;
    global.renderEditor = renderEditor;
})(typeof window !== 'undefined' ? window : this);
`;

    fs.writeFileSync(OUT, wrapped, 'utf8');
    console.log('Wrote', OUT);

    const stubs = `
    // Editor de módulos: js/dashboard-editor.js (DashboardEditor.renderEditor)
    function renderEditor(profileData) {
        if (window.DashboardEditor && typeof window.DashboardEditor.renderEditor === 'function') {
            return window.DashboardEditor.renderEditor(profileData);
        }
    }
    window.renderEditor = renderEditor;
    if (window.DashboardCore) window.DashboardCore.renderEditor = renderEditor;

`;

    const before = lines.slice(0, start);
    // keep from window.renderEditor assignment onward, but remove duplicate assignment lines we'll re-add in stubs
    let afterStart = exportLine;
    // skip window.renderEditor = and Core.renderEditor lines
    while (
        afterStart < lines.length &&
        (lines[afterStart].includes('window.renderEditor = renderEditor') ||
            lines[afterStart].includes('DashboardCore.renderEditor = renderEditor') ||
            lines[afterStart].trim() === '')
    ) {
        afterStart++;
    }

    let patched = before.join('\n') + '\n' + stubs + '\n' + lines.slice(afterStart).join('\n');

    // Bridge helpers onto DashboardCore when defined
    const bridges = [
        {
            needle: /function serializeBannerDestination\([\s\S]*?\n    \}\n/,
            inject: `\n    if (window.DashboardCore) window.DashboardCore.serializeBannerDestination = serializeBannerDestination;\n`
        },
        {
            needle: /function bannerUrlModelsHtml\(\) \{[\s\S]*?\n    \}\n/,
            inject: `\n    if (window.DashboardCore) window.DashboardCore.bannerUrlModelsHtml = bannerUrlModelsHtml;\n`
        },
        {
            needle: /function bannerDestDisplayLabel\(raw\) \{[\s\S]*?\n    \}\n/,
            inject: `\n    if (window.DashboardCore) window.DashboardCore.bannerDestDisplayLabel = bannerDestDisplayLabel;\n`
        },
        {
            needle: /function updateAvatarFormatSelector\(format\) \{[\s\S]*?\n    \}\n/,
            inject: `\n    if (window.DashboardCore) window.DashboardCore.updateAvatarFormatSelector = updateAvatarFormatSelector;\n`
        },
        {
            needle: /function getDefaultIcon\(itemType\) \{[\s\S]*?\n    \}\n/,
            inject: `\n    if (window.DashboardCore) window.DashboardCore.getDefaultIcon = getDefaultIcon;\n`
        },
        {
            needle: /function moduleListDisplayTitle\(item\) \{[\s\S]*?\n    \}\n/,
            inject: `\n    if (window.DashboardCore) window.DashboardCore.moduleListDisplayTitle = moduleListDisplayTitle;\n`
        },
        {
            needle: /function initSortable\(\) \{/,
            injectBefore: true,
            inject: `    if (window.DashboardCore) window.DashboardCore.initSortable = function () { return initSortable(); };\n    if (window.DashboardCore) window.DashboardCore.setupMoveButtons = function () { return setupMoveButtons(); };\n\n`
        }
    ];

    for (const b of bridges) {
        if (b.injectBefore) {
            if (!patched.includes('DashboardCore.initSortable')) {
                patched = patched.replace(b.needle, b.inject + '    function initSortable() {');
            }
        } else {
            const key = b.inject.match(/DashboardCore\.(\w+)/)[1];
            if (!patched.includes('DashboardCore.' + key + ' =')) {
                patched = patched.replace(b.needle, (m) => m + b.inject);
            }
        }
    }

    fs.writeFileSync(DASH, patched, 'utf8');
    console.log('Updated', DASH);

    // Fix cartao to prefer DashboardEditor
    if (fs.existsSync(CARTAO)) {
        let cartao = fs.readFileSync(CARTAO, 'utf8');
        const old = `        if (typeof global.renderEditor === 'function') {
            global.renderEditor(profileData);
        } else if (typeof window !== 'undefined' && typeof window.renderEditor === 'function') {
            window.renderEditor(profileData);
        } else {
            console.warn('[DashboardCartao] renderEditor indisponível para re-render completo');
        }`;
        const neu = `        if (global.DashboardEditor && typeof global.DashboardEditor.renderEditor === 'function') {
            global.DashboardEditor.renderEditor(profileData);
        } else if (typeof global.renderEditor === 'function') {
            global.renderEditor(profileData);
        } else {
            console.warn('[DashboardCartao] renderEditor indisponível para re-render completo');
        }`;
        if (cartao.includes(old)) {
            cartao = cartao.replace(old, neu);
            fs.writeFileSync(CARTAO, cartao, 'utf8');
            console.log('Patched cartao → DashboardEditor');
        } else if (!cartao.includes('DashboardEditor.renderEditor')) {
            cartao = cartao.replace(
                /global\.renderEditor\(profileData\);/,
                `if (global.DashboardEditor && global.DashboardEditor.renderEditor) global.DashboardEditor.renderEditor(profileData);\n            else if (typeof global.renderEditor === 'function') global.renderEditor(profileData);`
            );
            fs.writeFileSync(CARTAO, cartao, 'utf8');
            console.log('Patched cartao (fallback)');
        }
    }

    execSync(`node --check "${OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${DASH}"`, { stdio: 'inherit' });
    execSync(`node --check "${CARTAO}"`, { stdio: 'inherit' });
    console.log('OK syntax');
}

main();
