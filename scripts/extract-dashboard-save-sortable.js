/**
 * Extrai sortable + saveAllChanges do dashboard.js
 * Uso: node scripts/extract-dashboard-save-sortable.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const SORT_OUT = path.join(ROOT, 'public', 'js', 'dashboard-sortable.js');
const SAVE_OUT = path.join(ROOT, 'public', 'js', 'dashboard-save.js');

function dedent(arr) {
    return arr.map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n');
}

function findFn(lines, name) {
    return lines.findIndex((l) => new RegExp('(async\\s+)?function\\s+' + name + '\\b').test(l));
}

function wrapModule(title, body, exportsBlock) {
    return `/**
 * ${title} — módulo isolado (Conecta King).
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

${body}

${exportsBlock}
})(typeof window !== 'undefined' ? window : this);
`;
}

function rewriteCommon(body) {
    return body
        .replace(/window\.API_URL/g, '__WINDOW_API_URL__')
        .replace(/\bAPI_URL\b/g, 'env.API_URL')
        .replace(/__WINDOW_API_URL__/g, 'window.API_URL')
        .replace(/\bHEADERS_AUTH\b/g, 'env.HEADERS_AUTH')
        .replace(/\bHEADERS\b/g, 'env.HEADERS')
        .replace(/\bsafeFetch\s*\(/g, 'env.safeFetch(')
        .replace(/\bgetDefaultIcon\s*\(/g, 'env.getDefaultIcon(')
        .replace(/\bupdateItemFromApiResponse\s*\(/g, 'env.updateItemFromApiResponse(')
        .replace(/\bfetchProfileData\s*\(/g, 'env.fetchProfileData(')
        .replace(/\brenderEditor\s*\(/g, 'env.renderEditor(')
        .replace(/\bupdateLivePreviewFromForm\s*\(/g, 'env.updateLivePreviewFromForm(')
        .replace(/\binitSortable\s*\(/g, 'env.initSortable(')
        .replace(/\bsaveItemOrder\s*\(/g, 'env.saveItemOrder(')
        .replace(/\bserializeBannerDestination\s*\(/g, 'env.serializeBannerDestination(')
        .replace(/\bbannerDestDisplayLabel\s*\(/g, 'env.bannerDestDisplayLabel(')
        .replace(/\bmoduleListDisplayTitle\s*\(/g, 'env.moduleListDisplayTitle(');
}

function main() {
    let lines = fs.readFileSync(DASH, 'utf8').split(/\n/);

    const saveStart = findFn(lines, 'saveAllChanges');
    const sortStart = findFn(lines, 'saveItemOrder');
    const openEdit = findFn(lines, 'openEditModal');
    if (saveStart < 0 || sortStart < 0 || openEdit < 0) {
        throw new Error('Marcos não encontrados (já extraído?)');
    }

    console.log('saveAllChanges', saveStart + 1, '-', sortStart);
    console.log('sortable', sortStart + 1, '-', openEdit);

    // --- SORTABLE first (later in file) ---
    let sortBody = rewriteCommon(dedent(lines.slice(sortStart, openEdit)));
    // Don't rewrite initSortable/saveItemOrder to env inside their own definitions
    sortBody = dedent(lines.slice(sortStart, openEdit));
    sortBody = sortBody
        .replace(/window\.API_URL/g, '__WINDOW_API_URL__')
        .replace(/\bAPI_URL\b/g, 'env.API_URL')
        .replace(/__WINDOW_API_URL__/g, 'window.API_URL')
        .replace(/\bHEADERS_AUTH\b/g, 'env.HEADERS_AUTH')
        .replace(/\bHEADERS\b/g, 'env.HEADERS')
        .replace(/\bsaveItemOrder\s*\(/g, 'saveItemOrder('); // keep self

    // Remove prior Core bridges that referenced local initSortable
    // setupMoveButtons may call saveItemOrder / initSortable - keep local names

    const sortExports = `
    var DashboardSortable = {
        saveItemOrder: saveItemOrder,
        initSortable: initSortable,
        setupMoveButtons: setupMoveButtons
    };
    global.DashboardSortable = DashboardSortable;
    global.saveItemOrder = saveItemOrder;
    global.initSortable = initSortable;
    global.setupMoveButtons = setupMoveButtons;
    if (global.DashboardCore) {
        global.DashboardCore.initSortable = initSortable;
        global.DashboardCore.setupMoveButtons = setupMoveButtons;
        global.DashboardCore.saveItemOrder = saveItemOrder;
    }
`;

    fs.writeFileSync(SORT_OUT, wrapModule('Dashboard Sortable', sortBody, sortExports), 'utf8');
    console.log('Wrote', SORT_OUT);

    // --- SAVE ---
    let saveBody = rewriteCommon(dedent(lines.slice(saveStart, sortStart)));
    // Avoid rewriting typeof env.xxx patterns badly - OK

    const saveExports = `
    var DashboardSave = {
        saveAllChanges: saveAllChanges
    };
    global.DashboardSave = DashboardSave;
    global.saveAllChanges = saveAllChanges;
`;

    fs.writeFileSync(SAVE_OUT, wrapModule('Dashboard Save (Publicar alterações)', saveBody, saveExports), 'utf8');
    console.log('Wrote', SAVE_OUT);

    // --- Patch dashboard.js ---
    // Remove both blocks, insert stubs at saveStart
    const before = lines.slice(0, saveStart);
    const after = lines.slice(openEdit);

    // Remove old Core.initSortable assignment lines that were before initSortable def
    let beforeText = before.join('\n');
    beforeText = beforeText.replace(
        /\n\s*if \(window\.DashboardCore\) window\.DashboardCore\.initSortable = function \(\) \{ return initSortable\(\); \};\n\s*if \(window\.DashboardCore\) window\.DashboardCore\.setupMoveButtons = function \(\) \{ return setupMoveButtons\(\); \};\n/g,
        '\n'
    );

    const stubs = `
    // Save + Sortable: js/dashboard-save.js + js/dashboard-sortable.js
    async function saveAllChanges(event) {
        if (window.DashboardSave && typeof window.DashboardSave.saveAllChanges === 'function') {
            return window.DashboardSave.saveAllChanges(event);
        }
        if (typeof window.saveAllChanges === 'function' && window.saveAllChanges !== saveAllChanges) {
            return window.saveAllChanges(event);
        }
    }
    async function saveItemOrder(itemsOrder) {
        if (window.DashboardSortable && typeof window.DashboardSortable.saveItemOrder === 'function') {
            return window.DashboardSortable.saveItemOrder(itemsOrder);
        }
    }
    function initSortable() {
        if (window.DashboardSortable && typeof window.DashboardSortable.initSortable === 'function') {
            return window.DashboardSortable.initSortable();
        }
    }
    function setupMoveButtons() {
        if (window.DashboardSortable && typeof window.DashboardSortable.setupMoveButtons === 'function') {
            return window.DashboardSortable.setupMoveButtons();
        }
    }
    window.saveAllChanges = saveAllChanges;
    window.saveItemOrder = saveItemOrder;
    window.initSortable = initSortable;
    window.setupMoveButtons = setupMoveButtons;
    if (window.DashboardCore) {
        window.DashboardCore.initSortable = initSortable;
        window.DashboardCore.setupMoveButtons = setupMoveButtons;
        window.DashboardCore.saveItemOrder = saveItemOrder;
        window.DashboardCore.saveAllChanges = saveAllChanges;
    }

`;

    let patched = beforeText + '\n' + stubs + '\n' + after.join('\n');

    // Expose updateItemFromApiResponse + fetchProfileData on Core
    if (!patched.includes('DashboardCore.updateItemFromApiResponse')) {
        patched = patched.replace(
            /async function updateItemFromApiResponse\(/,
            `if (window.DashboardCore) window.DashboardCore.updateItemFromApiResponse = function () { return updateItemFromApiResponse.apply(null, arguments); };\n    async function updateItemFromApiResponse(`
        );
        // That assigns before function exists - hoisted OK for function declaration
        // Actually async function is hoisted. But we're assigning a wrapper that calls it - at assignment time during execution, updateItemFromApiResponse is already hoisted. Good.
        // Wait - we're inserting BEFORE the function, and the assignment runs when execution reaches that line, which is before the function body is... function declarations are hoisted to top of scope, so OK.
    }

    if (!patched.includes('DashboardCore.fetchProfileData')) {
        patched = patched.replace(
            /async function fetchProfileData\(/,
            `if (window.DashboardCore) window.DashboardCore.fetchProfileData = function () { return fetchProfileData.apply(null, arguments); };\n    async function fetchProfileData(`
        );
    }

    fs.writeFileSync(DASH, patched, 'utf8');
    console.log('Updated', DASH);

    execSync(`node --check "${SORT_OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${SAVE_OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${DASH}"`, { stdio: 'inherit' });
    console.log('OK syntax');
}

main();
