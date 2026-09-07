/**
 * Extrai Finanças e Branding do monólito dashboard.js para módulos isolados.
 * Uso: node scripts/extract-dashboard-modules.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const FINANCE_OUT = path.join(ROOT, 'public', 'js', 'dashboard-finance.js');
const EMPRESA_OUT = path.join(ROOT, 'public', 'js', 'dashboard-empresa.js');

const MARK_FINANCE_START = '    // ==========================================================\n    // M';
const MARK_FINANCE_ALT = '    window.initFinancePane = async function () {';
const MARK_BRANDING_START = '    // ============================================\n    // PERSONALIZA';
const MARK_BRANDING_ALT = '    // Carregar dados de branding\n    async function loadBrandingData()';
const MARK_AFTER_BRANDING = '    // Tornar funções globais\n    window.clearBranding = clearBranding;';
const MARK_TAIL = "    try {\n        const qsKs = new URLSearchParams(window.location.search || '');";

function findLine(lines, pred, from = 0) {
    for (let i = from; i < lines.length; i++) {
        if (pred(lines[i], i)) return i;
    }
    return -1;
}

function rewriteCoreRefs(code) {
    return code
        .replace(/window\.API_URL/g, '__WINDOW_API_URL__')
        .replace(/\bAPI_URL\b/g, 'env.API_URL')
        .replace(/__WINDOW_API_URL__/g, 'window.API_URL')
        .replace(/\bHEADERS_AUTH\b/g, 'env.HEADERS_AUTH')
        .replace(/\bgetAuthHeaders\s*\(/g, 'env.getAuthHeaders(')
        .replace(/\bgetHeaders\s*\(/g, 'env.getHeaders(');
}

function wrapModule(name, body, extraExports) {
    return `/**
 * ${name} — módulo isolado do dashboard (Conecta King).
 * Depende de window.DashboardCore (definido em dashboard.js).
 * Gerado/atualizado por scripts/extract-dashboard-modules.js
 */
(function (global) {
    'use strict';

    function core() {
        return global.DashboardCore || {};
    }

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders();
            return {};
        },
        getAuthHeaders: function () {
            var c = core();
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders();
            return this.HEADERS_AUTH;
        },
        getHeaders: function () {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders();
            return this.getAuthHeaders();
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        }
    };

${rewriteCoreRefs(body)}
${extraExports || ''}
})(typeof window !== 'undefined' ? window : this);
`;
}

function main() {
    const raw = fs.readFileSync(DASH, 'utf8');
    const lines = raw.split(/\n/);

    let financeStart = findLine(lines, (l) => l.includes('MÓDULO DE FINAN') || l.includes('M"DULO DE FINAN') || l.includes('MODULO DE FINAN'));
    if (financeStart < 0) {
        financeStart = findLine(lines, (l) => l.includes('window.initFinancePane = async function'));
        // include a bit of comment above
        if (financeStart > 3) financeStart -= 3;
    }
    if (financeStart < 0) throw new Error('Não encontrei início do módulo Finanças');

    let brandingStart = findLine(lines, (l, i) => i > financeStart && (l.includes('PERSONALIZA') && l.includes('MARCA') || l.includes('async function loadBrandingData')), financeStart);
    if (brandingStart < 0) {
        brandingStart = findLine(lines, (l, i) => i > financeStart && l.includes('async function loadBrandingData'), financeStart);
    }
    // Prefer comment block a few lines above loadBrandingData
    const lb = findLine(lines, (l, i) => i > financeStart && l.includes('async function loadBrandingData'), financeStart);
    if (lb > 0) {
        let s = lb;
        while (s > financeStart && (lines[s - 1].trim() === '' || lines[s - 1].trim().startsWith('//') || lines[s - 1].includes('===='))) s--;
        brandingStart = s;
    }
    if (brandingStart < 0) throw new Error('Não encontrei início do Branding');

    const clearBrandingExport = findLine(lines, (l, i) => i >= brandingStart && l.includes('window.clearBranding = clearBranding'), brandingStart);
    if (clearBrandingExport < 0) throw new Error('Não encontrei window.clearBranding');

    const tailStart = findLine(lines, (l, i) => i > clearBrandingExport && l.includes("qsKs.get('open') === 'kingSelection'"), clearBrandingExport);
    // Keep from try { qsKs
    let keepFrom = clearBrandingExport + 1;
    while (keepFrom < lines.length && lines[keepFrom].trim() === '') keepFrom++;
    // skip empty after clearBranding; branding listeners end at clearBranding line inclusive

    const financeLines = lines.slice(financeStart, brandingStart);
    const brandingLines = lines.slice(brandingStart, clearBrandingExport + 1);

    console.log('Finance lines:', financeStart + 1, '-', brandingStart, '(' + financeLines.length + ')');
    console.log('Branding lines:', brandingStart + 1, '-', clearBrandingExport + 1, '(' + brandingLines.length + ')');

    // Dedent 4 spaces (was inside DOMContentLoaded)
    function dedent(arr) {
        return arr.map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n');
    }

    const financeBody = dedent(financeLines);
    fs.writeFileSync(FINANCE_OUT, wrapModule('Dashboard Finance', financeBody), 'utf8');
    console.log('Wrote', FINANCE_OUT);

    // Branding → DashboardEmpresa real
    let brandingBody = dedent(brandingLines);
    // Expose load/save on namespace + keep window.clearBranding
    const empresaExtra = `
    var DashboardEmpresa = global.DashboardEmpresa || {};
    DashboardEmpresa.loadBrandingData = typeof loadBrandingData === 'function' ? loadBrandingData : DashboardEmpresa.loadBrandingData;
    DashboardEmpresa.saveBranding = typeof saveBranding === 'function' ? saveBranding : DashboardEmpresa.saveBranding;
    DashboardEmpresa.clearBranding = typeof clearBranding === 'function' ? clearBranding : DashboardEmpresa.clearBranding;
    DashboardEmpresa.init = function () {
        if (this._initialized) return;
        var form = document.getElementById('branding-form');
        // listeners já ligados no corpo acima
        this._bindHashForMobile && this._bindHashForMobile();
        this._initialized = true;
    };
    DashboardEmpresa._bindHashForMobile = function () {
        function checkHash() {
            if (global.location && global.location.hash === '#branding-pane' && typeof loadBrandingData === 'function') {
                loadBrandingData();
            }
        }
        if (global.addEventListener) {
            global.addEventListener('hashchange', checkHash);
            if (global.location && global.location.hash === '#branding-pane') setTimeout(checkHash, 200);
        }
    };
    global.DashboardEmpresa = DashboardEmpresa;
    if (typeof loadBrandingData === 'function') global.loadBrandingData = loadBrandingData;
    if (typeof saveBranding === 'function') global.saveBranding = saveBranding;
`;

    // Branding uses safeFetch — rewrite to env.safeFetch
    brandingBody = brandingBody.replace(/\bsafeFetch\s*\(/g, 'env.safeFetch(');
    fs.writeFileSync(EMPRESA_OUT, wrapModule('Dashboard Empresa / Branding', brandingBody, empresaExtra), 'utf8');
    console.log('Wrote', EMPRESA_OUT);

    // Rebuild dashboard.js: remove finance+branding, inject DashboardCore + hooks
    const before = lines.slice(0, financeStart);
    const after = lines.slice(keepFrom);

    // Inject DashboardCore after HEADERS_AUTH is defined
    let coreInjected = false;
    const beforeText = before.join('\n');
    let patchedBefore = beforeText;
    if (!patchedBefore.includes('window.DashboardCore')) {
        patchedBefore = patchedBefore.replace(
            /let HEADERS_AUTH = getAuthHeaders\(\);/,
            `let HEADERS_AUTH = getAuthHeaders();

    /** Bridge para módulos isolados (finance, empresa, etc.) — não alterar sem necessidade. */
    window.DashboardCore = {
        getApiUrl: function () { return API_URL; },
        getHeadersAuth: function () { return HEADERS_AUTH; },
        getAuthHeaders: getAuthHeaders,
        getHeaders: getHeaders,
        safeFetch: function (url, options) { return safeFetch(url, options); },
        updateHeaders: updateHeaders
    };`
        );
        // safeFetch/updateHeaders may be defined later — fix order
        // Actually safeFetch is defined AFTER HEADERS_AUTH. So DashboardCore.safeFetch will close over TDZ if called early.
        // Use lazy refs instead:
        patchedBefore = beforeText.replace(
            /let HEADERS_AUTH = getAuthHeaders\(\);/,
            `let HEADERS_AUTH = getAuthHeaders();

    window.DashboardCore = {
        getApiUrl: function () { return API_URL; },
        getHeadersAuth: function () { return HEADERS_AUTH; },
        getAuthHeaders: function () { return getAuthHeaders(); },
        getHeaders: function () { return getHeaders(); },
        safeFetch: function (url, options) { return safeFetch(url, options); },
        updateHeaders: function () { return updateHeaders(); }
    };`
        );
        coreInjected = patchedBefore !== beforeText;
    }

    // Expose loadReportsData
    if (!patchedBefore.includes('window.loadReportsData')) {
        patchedBefore = patchedBefore.replace(
            /async function loadReportsData\(\) \{/,
            `async function loadReportsData() {`
        );
        // add export after function ends — find reportsLoaded = true block end is hard; add near first call site instead
        patchedBefore = patchedBefore.replace(
            /async function loadReportsData\(\) \{/,
            `window.loadReportsData = loadReportsData;\n    async function loadReportsData() {`
        );
        // That creates TDZ / use before init for function declaration... 
        // function declarations are hoisted in the callback scope, but assignment window.loadReportsData = loadReportsData before declaration with async function is NOT hoisted the same way.
        // Better: after the function, assign. Use replace on closing of loadReportsData - fragile.
        // Revert and append after loadReportsData function by finding "reportsLoaded = true" section end.
    }

    // Fix the broken approach - remove the bad injection
    patchedBefore = patchedBefore.replace(
        /window\.loadReportsData = loadReportsData;\n    async function loadReportsData\(\) \{/,
        'async function loadReportsData() {'
    );
    if (!patchedBefore.includes('window.loadReportsData = loadReportsData')) {
        patchedBefore = patchedBefore.replace(
            /(\n    async function loadReportsData\(\) \{[\s\S]*?\n    \}\n\n    \/\/ Variáveis globais para gráficos do cliente)/,
            '$1'.replace(
                '// Variáveis globais para gráficos do cliente',
                'window.loadReportsData = loadReportsData;\n\n    // Variáveis globais para gráficos do cliente'
            )
        );
        // The replace above is wrong - let me do it properly
    }

    // Proper export of loadReportsData
    if (!patchedBefore.includes('window.loadReportsData = loadReportsData')) {
        const marker = '    // Variáveis globais para gráficos do cliente';
        if (patchedBefore.includes(marker)) {
            patchedBefore = patchedBefore.replace(
                marker,
                '    window.loadReportsData = loadReportsData;\n\n' + marker
            );
        } else {
            console.warn('WARN: não exportei loadReportsData automaticamente');
        }
    }

    // Remove dead KingBolaoNav
    patchedBefore = patchedBefore.replace(
        /\n\s*if \(typeof window\.DashboardKingBolaoNav !== 'undefined' && window\.DashboardKingBolaoNav\.init\) \{\s*\n\s*window\.DashboardKingBolaoNav\.init\(\);\s*\n\s*\}\s*\n/g,
        '\n'
    );

    // Hooks for pane modules
    if (!patchedBefore.includes('DashboardPersonalizar.init')) {
        patchedBefore = patchedBefore.replace(
            /if \(targetId === 'branding-pane'\) \{\s*\n\s*loadBrandingData\(\);\s*\n\s*\}/,
            `if (targetId === 'branding-pane') {
                            if (window.DashboardEmpresa && typeof window.DashboardEmpresa.loadBrandingData === 'function') {
                                window.DashboardEmpresa.loadBrandingData();
                            } else if (typeof window.loadBrandingData === 'function') {
                                window.loadBrandingData();
                            }
                        }`
        );
    }

    // Stub comment where modules were removed
    const stub = `
    // Finanças e Branding foram extraídos para:
    //   js/dashboard-finance.js  (window.initFinancePane, …)
    //   js/dashboard-empresa.js  (loadBrandingData / saveBranding / clearBranding)
    // Carregados após este arquivo no dashboard.html.

`;

    const out = patchedBefore + '\n' + stub + after.join('\n');
    // Fix branding calls that still reference local loadBrandingData
    let finalOut = out.replace(/\bloadBrandingData\(\)/g, '(window.loadBrandingData ? window.loadBrandingData() : (window.DashboardEmpresa && window.DashboardEmpresa.loadBrandingData && window.DashboardEmpresa.loadBrandingData()))');
    // Don't double-wrap in the stub we just wrote for branding-pane - check
    // Actually the replace is too aggressive for comments. Limit to call sites.

    // Re-read approach: only replace remaining local calls after extraction
    finalOut = patchedBefore + '\n' + stub + after.join('\n');
    // after shouldn't contain loadBrandingData
    // patchedBefore may still call loadBrandingData() in sidebar handler
    finalOut = finalOut.replace(
        /if \(targetId === 'branding-pane'\) \{\s*\n\s*loadBrandingData\(\);\s*\n\s*\}/g,
        `if (targetId === 'branding-pane') {
                            if (window.DashboardEmpresa && window.DashboardEmpresa.loadBrandingData) window.DashboardEmpresa.loadBrandingData();
                            else if (window.loadBrandingData) window.loadBrandingData();
                        }`
    );
    // Other loadBrandingData() in before?
    finalOut = finalOut.replace(
        /(?<![\w.])loadBrandingData\(\)/g,
        '(typeof window.loadBrandingData === "function" ? window.loadBrandingData() : (window.DashboardEmpresa && window.DashboardEmpresa.loadBrandingData && window.DashboardEmpresa.loadBrandingData()))'
    );

    // Init hooks after DOM ready near end - add module inits before closing of DOMContentLoaded
    if (!finalOut.includes('DashboardInfo &&')) {
        finalOut = finalOut.replace(
            /try \{\s*\n\s*const qsKs = new URLSearchParams/,
            `try {
        if (window.DashboardInfo && typeof window.DashboardInfo.init === 'function') window.DashboardInfo.init();
        if (window.DashboardEmpresa && typeof window.DashboardEmpresa.init === 'function') window.DashboardEmpresa.init();
        if (window.DashboardPersonalizar && typeof window.DashboardPersonalizar.init === 'function') window.DashboardPersonalizar.init();
    } catch (eMod) { /* módulos opcionais */ }

    try {
        const qsKs = new URLSearchParams`
        );
    }

    fs.writeFileSync(DASH, finalOut, 'utf8');
    console.log('Updated', DASH, 'bytes', finalOut.length);

    // syntax check
    const { execSync } = require('child_process');
    for (const f of [DASH, FINANCE_OUT, EMPRESA_OUT]) {
        execSync(`node --check "${f}"`, { stdio: 'inherit' });
        console.log('OK syntax', path.relative(ROOT, f));
    }
}

main();
